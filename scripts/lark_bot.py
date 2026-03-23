#!/usr/bin/env python3
"""Lark Bot — CC 未打卡名单推送（图片 + 文本摘要）

用法：
  uv run python scripts/lark_bot.py followup              # 发送未打卡跟进名单（CC）
  uv run python scripts/lark_bot.py followup --channel cc_all  # 指定通道
  uv run python scripts/lark_bot.py followup --dry-run     # 只生成图片不发送
  uv run python scripts/lark_bot.py --test                 # Lark webhook 连通性测试

图片通过外部图床（freeimage.host → sm.ms fallback）上传，Lark 群发文本摘要 + 可点击图片链接。
后续配置 app_id/app_secret 后可切换为 Lark 原生图片发送。
"""

from __future__ import annotations

import argparse
import base64
import hashlib
import hmac
import io
import json
import sys
import time
import urllib.parse
import urllib.request
from collections import defaultdict
from datetime import datetime, timedelta
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.patches as mpatches  # noqa: E402
import matplotlib.pyplot as plt  # noqa: E402

# ── 路径 ─────────────────────────────────────────────────────────────────────

PROJECT_ROOT = Path(__file__).resolve().parent.parent
CRED_PATH = PROJECT_ROOT / "key" / "lark-channels.json"
OUTPUT_DIR = PROJECT_ROOT / "output"
OUTPUT_DIR.mkdir(exist_ok=True)

# ── 色板（SEE Design System — Warm Neutral）─────────────────────────────────

C_BG = "#FAFAF9"
C_SURFACE = "#F5F5F4"
C_ELEVATED = "#E7E5E4"
C_BORDER = "#E7E5E4"
C_MUTED = "#78716C"
C_TEXT2 = "#57534E"
C_TEXT = "#1C1917"
C_HEADER = "#1C1917"
C_N800 = "#292524"
C_SUCCESS = "#059669"
C_WARNING = "#D97706"
C_DANGER = "#DC2626"
C_GREEN_BG = "#ECFDF5"
C_YELLOW_BG = "#FFFBEB"
C_RED_BG = "#FEF2F2"
C_BRAND_P1 = "#92400E"

# 字体 fallback（中泰英全覆盖）
CJK_FONTS = ["Arial Unicode MS", "Heiti TC", "Songti SC", "Tahoma", "DejaVu Sans"]

# ── 泰中双语文案（泰文主行 + 中文副行，单一信源）────────────────────────────────
TH = {
    "followup_title":  {"th": "รายชื่อยังไม่เช็คอิน", "zh": "未打卡跟进"},
    "not_checked":     {"th": "ยังไม่เช็คอิน",        "zh": "未打卡"},
    "persons":         {"th": "คน",                    "zh": "人"},
    "responsible":     {"th": "ผู้รับผิดชอบ",          "zh": "负责人"},
    "col_rank":        {"th": "#",                     "zh": "#"},
    "col_score":       {"th": "★",                     "zh": "★"},
    "col_student_id":  {"th": "รหัส",                  "zh": "学员ID"},
    "col_enclosure":   {"th": "คอก",                   "zh": "围场"},
    "col_owner":       {"th": "ผู้รับผิดชอบ",          "zh": "负责人"},
    "col_last_call":   {"th": "โทรล่าสุด",             "zh": "末次拨打"},
    "col_lesson":      {"th": "คลาส",                  "zh": "课耗"},
    "unassigned":      {"th": "ไม่ระบุ",               "zh": "未分配"},
    "unknown":         {"th": "ไม่ทราบ",               "zh": "未知"},
    "data_label":      {"th": "ข้อมูล T-1",            "zh": "T-1 数据"},
    "view_list":       {"th": "ดูรายชื่อ",              "zh": "查看名单"},
    "total_summary":   {"th": "รวมยังไม่เช็คอิน",      "zh": "共未打卡"},
    "teams":           {"th": "ทีม",                    "zh": "个小组"},
}


def _th(key: str) -> str:
    return TH[key]["th"]


def _zh(key: str) -> str:
    return TH[key]["zh"]


def _bi(key: str) -> str:
    """双语括号格式：'泰文(中文)'"""
    v = TH[key]
    if v["th"] == v["zh"]:
        return v["th"]
    return f"{v['th']}({v['zh']})"


# ── 凭证 ─────────────────────────────────────────────────────────────────────

def load_config() -> dict:
    if not CRED_PATH.exists():
        print(f"[错误] 凭证文件不存在: {CRED_PATH}")
        sys.exit(1)
    return json.loads(CRED_PATH.read_text("utf-8"))


def get_channel(config: dict, name: str) -> dict:
    ch = config.get("channels", {}).get(name)
    if not ch:
        print(f"[错误] 通道 '{name}' 不存在，可用: {list(config.get('channels', {}).keys())}")
        sys.exit(1)
    return ch


# ── API 数据获取 ──────────────────────────────────────────────────────────────

def fetch_followup(api_base: str, role: str = "CC") -> list[dict]:
    """调用后端 /api/checkin/followup 获取未打卡学员列表"""
    url = f"{api_base}/api/checkin/followup?role={role}"
    req = urllib.request.Request(url, headers={"Accept": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            return data.get("students", [])
    except Exception as e:
        print(f"[错误] 获取未打卡数据失败: {e}")
        return []


def group_students_by_team(students: list[dict]) -> dict[str, list[dict]]:
    """按团队分组，团队名为空的归入"未分配"组"""
    groups: dict[str, list[dict]] = defaultdict(list)
    for s in students:
        team = (s.get("team") or "").strip()
        if not team:
            team = _bi("unassigned")
        groups[team].append(s)
    # 按团队名排序
    return dict(sorted(groups.items()))


# ── 图片生成 ──────────────────────────────────────────────────────────────────

def _score_color(score: float) -> str:
    if score >= 7:
        return C_SUCCESS
    if score >= 4:
        return C_WARNING
    return C_DANGER


def generate_followup_image(
    team_name: str,
    students: list[dict],
    date_str: str,
) -> bytes:
    """生成单个小组的未打卡学员列表图片（matplotlib 绘制）"""
    short_name = team_name.replace("TH-", "").replace("Team", "")

    plt.rcParams["font.family"] = CJK_FONTS
    plt.rcParams["font.size"] = 10

    # 列定义: x位置, 宽度, 标题（双语）, 对齐
    cols = [
        (0.2,  0.5,  _bi("col_rank"),       "center"),
        (0.7,  0.5,  _bi("col_score"),      "center"),
        (1.2,  1.5,  _bi("col_student_id"), "left"),
        (2.8,  0.7,  _bi("col_enclosure"),  "center"),
        (3.6,  2.0,  _bi("col_owner"),      "left"),
        (5.7,  1.6,  _bi("col_last_call"),  "center"),
        (7.4,  0.8,  _bi("col_lesson"),     "center"),
    ]
    table_width = 8.4

    n = len(students)
    row_h = 0.35
    header_h = 2.1  # 标题区（双行）+ 汇总条 + 表头
    table_h = n * row_h
    total_h = header_h + table_h + 0.4  # 底部留白
    total_h = max(total_h, 3.5)

    fig, ax = plt.subplots(figsize=(table_width + 0.4, total_h), dpi=150)
    fig.patch.set_facecolor(C_BG)
    ax.set_xlim(0, table_width + 0.4)
    ax.set_ylim(0, total_h)
    ax.set_aspect("equal")
    ax.axis("off")

    y = total_h

    # ── 标题区（泰文主行 + 中文副行）──
    y -= 0.25
    # 左侧竖条
    ax.add_patch(plt.Rectangle(
        (0.15, y - 0.45), 0.07, 0.45,
        facecolor=C_DANGER, edgecolor="none",
    ))
    ax.text(
        0.35, y, f"{short_name}  {_th('followup_title')}",
        fontsize=15, fontweight="bold", color=C_HEADER, va="top",
    )
    y -= 0.25
    ax.text(
        0.35, y, f"{short_name}  {_zh('followup_title')}",
        fontsize=8, color=C_MUTED, va="top",
    )
    y -= 0.2
    ax.text(
        0.35, y, f"{date_str}  |  {_th('data_label')}",
        fontsize=8, color=C_MUTED, va="top",
    )

    # ── 汇总条 ──
    y -= 0.5
    # 统计负责人分布
    owner_counts: dict[str, int] = defaultdict(int)
    for s in students:
        name = s.get("cc_name") or "未知"
        owner_counts[name] += 1
    owner_sorted = sorted(owner_counts.items(), key=lambda x: -x[1])

    ax.add_patch(mpatches.FancyBboxPatch(
        (0.15, y - 0.45), table_width, 0.45,
        boxstyle="round,pad=0.06",
        facecolor=C_RED_BG, edgecolor=C_BORDER, linewidth=0.8,
    ))
    ax.text(
        0.35, y - 0.12,
        f"{_th('not_checked')} {n} {_th('persons')}",
        fontsize=13, fontweight="bold", color=C_DANGER, va="center",
    )
    # 负责人分布（右侧）
    owner_text = "  ".join(f"{name}({cnt})" for name, cnt in owner_sorted[:5])
    if len(owner_sorted) > 5:
        owner_text += f"  +{len(owner_sorted) - 5}{_th('persons')}"
    ax.text(
        table_width, y - 0.12,
        owner_text,
        fontsize=8, color=C_TEXT2, va="center", ha="right",
    )

    # ── 表头 ──
    y -= 0.65
    ax.add_patch(plt.Rectangle(
        (0.15, y - row_h), table_width, row_h,
        facecolor=C_N800, edgecolor="none",
    ))
    for cx, _cw, title, align in cols:
        ha = "center" if align == "center" else "left"
        ax.text(
            cx + 0.05, y - row_h / 2,
            title,
            fontsize=9, fontweight="bold", color="white",
            va="center", ha=ha,
        )
    y -= row_h

    # ── 数据行 ──
    for i, s in enumerate(students):
        bg = C_SURFACE if i % 2 == 0 else C_BG
        ax.add_patch(plt.Rectangle(
            (0.15, y - row_h), table_width, row_h,
            facecolor=bg, edgecolor="none",
        ))
        # 底部细线
        ax.plot(
            [0.15, 0.15 + table_width], [y - row_h, y - row_h],
            color=C_BORDER, linewidth=0.3,
        )

        ym = y - row_h / 2
        score = s.get("quality_score", 0) or 0
        sid = s.get("student_id", "")
        enc = s.get("enclosure", "")
        owner = s.get("cc_name", "")
        last_call = s.get("cc_last_call_date") or "—"
        lesson = s.get("lesson_consumption_3m")
        lesson_str = str(int(lesson)) if lesson is not None else "—"

        row_data = [
            (cols[0][0], str(i + 1),     "center", C_MUTED, "normal"),
            (cols[1][0], str(int(score)), "center", _score_color(score), "bold"),
            (cols[2][0], str(sid),        "left",   C_TEXT,  "normal"),
            (cols[3][0], enc,             "center", C_TEXT2, "normal"),
            (cols[4][0], owner,           "left",   C_TEXT,  "normal"),
            (cols[5][0], last_call[:10] if len(last_call) > 10 else last_call,
             "center", C_MUTED, "normal"),
            (cols[6][0], lesson_str,      "center", C_TEXT2, "normal"),
        ]

        for cx, val, align, color, weight in row_data:
            ha = "center" if align == "center" else "left"
            ax.text(
                cx + 0.05, ym, val,
                fontsize=8.5, color=color, fontweight=weight,
                va="center", ha=ha,
            )
        y -= row_h

    # ── 保存 ──
    buf = io.BytesIO()
    fig.savefig(buf, format="png", dpi=150, bbox_inches="tight", pad_inches=0.1)
    plt.close(fig)
    buf.seek(0)
    return buf.read()


# ── 图片上传（双图床 fallback） ───────────────────────────────────────────────

def _upload_freeimage(img_bytes: bytes, filename: str) -> str | None:
    encoded = base64.b64encode(img_bytes).decode("utf-8")
    data = urllib.parse.urlencode({
        "key": "6d207e02198a847aa98d0a2a901485a5",
        "source": encoded,
        "format": "json",
    }).encode("utf-8")
    req = urllib.request.Request(
        "https://freeimage.host/api/1/upload",
        data=data,
        headers={"User-Agent": "ref-ops-engine/1.0"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=20) as resp:
        result = json.loads(resp.read().decode("utf-8"))
        if result.get("status_code") == 200:
            return result["image"]["url"]
    return None


def _upload_smms(img_bytes: bytes, filename: str) -> str | None:
    boundary = f"----Py{int(time.time())}"
    body = (
        f"--{boundary}\r\n"
        f'Content-Disposition: form-data; name="smfile"; filename="{filename}"\r\n'
        f"Content-Type: image/png\r\n\r\n"
    ).encode() + img_bytes + f"\r\n--{boundary}--\r\n".encode()
    req = urllib.request.Request(
        "https://s.ee/api/v1/file/upload",
        data=body,
        headers={
            "Content-Type": f"multipart/form-data; boundary={boundary}",
            "User-Agent": "ref-ops-engine/1.0",
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=20) as resp:
        result = json.loads(resp.read().decode("utf-8"))
        if result.get("success"):
            return result["data"]["url"]
        if "images" in str(result.get("message", "")):
            return result.get("images")
    return None


def upload_image(img_bytes: bytes, filename: str = "report.png") -> str | None:
    """双图床 fallback：freeimage.host → sm.ms(s.ee)"""
    providers = [
        ("freeimage.host", _upload_freeimage),
        ("sm.ms(s.ee)", _upload_smms),
    ]
    for name, fn in providers:
        try:
            url = fn(img_bytes, filename)
            if url:
                print(f"  ✓ [{name}] 上传成功")
                return url
        except Exception as e:
            print(f"  ✗ [{name}] 失败: {e}")
    return None


# ── Lark Webhook 签名 + 发送 ──────────────────────────────────────────────────

def _lark_sign(secret: str) -> tuple[str, str]:
    """生成 Lark webhook 签名：返回 (timestamp, sign)"""
    timestamp = str(int(time.time()))
    string_to_sign = f"{timestamp}\n{secret}"
    hmac_val = hmac.new(
        string_to_sign.encode("utf-8"), b"", hashlib.sha256
    ).digest()
    sign = base64.b64encode(hmac_val).decode("utf-8")
    return timestamp, sign


def _send_lark(webhook: str, payload: dict, secret: str | None = None) -> bool:
    """发送 Lark webhook 消息（自动附加签名）"""
    if secret:
        ts, sign = _lark_sign(secret)
        payload["timestamp"] = ts
        payload["sign"] = sign

    data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    req = urllib.request.Request(
        webhook,
        data=data,
        headers={"Content-Type": "application/json; charset=utf-8"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            result = json.loads(resp.read().decode("utf-8"))
            ok = result.get("StatusCode") == 0 or result.get("code") == 0
            if not ok:
                print(f"  ✗ Lark 发送失败: {result}")
            return ok
    except Exception as e:
        print(f"  ✗ Lark 发送异常: {e}")
        return False


def send_lark_text(
    webhook: str, title: str, content_blocks: list[list[dict]],
    secret: str | None = None,
) -> bool:
    """发送 Lark post（富文本）消息"""
    payload = {
        "msg_type": "post",
        "content": {
            "post": {
                "zh_cn": {
                    "title": title,
                    "content": content_blocks,
                }
            }
        },
    }
    return _send_lark(webhook, payload, secret)


def send_lark_test(webhook: str, secret: str | None = None) -> bool:
    """连通性测试"""
    payload = {
        "msg_type": "text",
        "content": {"text": f"🔔 Lark Bot 连通测试 — {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"},
    }
    ok = _send_lark(webhook, payload, secret)
    print(f"{'✓' if ok else '✗'} 连通测试 {'成功' if ok else '失败'}")
    return ok


# ── 主流程：未打卡跟进 ────────────────────────────────────────────────────────

def cmd_followup(args: argparse.Namespace) -> None:
    config = load_config()
    channel = get_channel(config, args.channel)
    api_base = config.get("defaults", {}).get("api_base", "http://localhost:8100")
    webhook = channel["webhook"]
    secret = channel.get("secret") or None

    # ── 安全防线：非 test 通道必须 --confirm ──
    if args.channel != "test" and not args.confirm:
        print(f"[拦截] 通道 '{args.channel}' 非测试群，需要 --confirm 标志才能发送。")
        print(f"       安全模式：先用 --channel test 验证，确认后加 --confirm 发正式群。")
        print(f"       示例：uv run python scripts/lark_bot.py followup --channel {args.channel} --confirm")
        return

    today = datetime.now()
    # T-1 数据
    data_date = (today - timedelta(days=1)).strftime("%Y-%m-%d")
    date_display = f"{today.strftime('%Y年%m月%d日')} T-1"

    print(f"📋 Lark Bot — CC 未打卡跟进 ({date_display})")
    print(f"   通道: {channel.get('name', args.channel)}")
    print()

    # 获取数据
    print("1. 获取未打卡数据...")
    students = fetch_followup(api_base, role="CC")
    if not students:
        print("   ⚠ 无未打卡学员数据（可能后端未启动或无数据）")
        return

    print(f"   ✓ 共 {len(students)} 名未打卡学员")

    # 按团队分组
    teams = group_students_by_team(students)
    print(f"   ✓ {len(teams)} 个小组: {', '.join(teams.keys())}")
    print()

    # 生成图片 + 上传
    print("2. 生成图片并上传...")
    team_results: list[dict] = []

    for team_name, members in teams.items():
        safe_name = team_name.replace("/", "-").replace(" ", "_")
        filename = f"lark-followup-{safe_name}-{today.strftime('%Y%m%d')}.png"

        # 生成图片
        img_bytes = generate_followup_image(team_name, members, date_display)
        local_path = OUTPUT_DIR / filename
        local_path.write_bytes(img_bytes)
        print(f"   [{team_name}] 图片已保存: output/{filename} ({len(img_bytes)//1024}KB)")

        # 上传
        img_url = None
        if not args.dry_run:
            img_url = upload_image(img_bytes, filename)
            if not img_url:
                print(f"   ⚠ [{team_name}] 图片上传失败，将只发文本")

        # 负责人统计
        owner_counts: dict[str, int] = defaultdict(int)
        for s in members:
            owner_counts[s.get("cc_name") or "未知"] += 1
        owner_sorted = sorted(owner_counts.items(), key=lambda x: -x[1])

        team_results.append({
            "team": team_name,
            "count": len(members),
            "img_url": img_url,
            "owners": owner_sorted,
        })

    print()

    if args.dry_run:
        print("3. [dry-run] 跳过发送，图片已保存到 output/")
        return

    # 发送到 Lark
    print("3. 发送到 Lark...")

    # 构建富文本消息（泰文主、中文辅）
    content_blocks: list[list[dict]] = []

    # 总摘要行
    total_count = sum(r["count"] for r in team_results)
    content_blocks.append([
        {"tag": "text", "text": (
            f"{_th('total_summary')} {total_count} {_th('persons')}  "
            f"({len(team_results)} {_th('teams')})\n"
        )},
    ])

    # 每个团队一段
    for r in team_results:
        short = r["team"].replace("TH-", "").replace("Team", "")
        owner_text = " | ".join(f"{name}({cnt})" for name, cnt in r["owners"][:4])
        if len(r["owners"]) > 4:
            owner_text += f" +{len(r['owners']) - 4}{_th('persons')}"

        block: list[dict] = [
            {"tag": "text", "text": (
                f"\n📊 {r['team']}：{_th('not_checked')} "
                f"{r['count']} {_th('persons')}\n"
            )},
            {"tag": "text", "text": f"{_th('responsible')}: {owner_text}\n"},
        ]
        if r["img_url"]:
            block.append({"tag": "a", "text": f"📷 {_th('view_list')} {short}", "href": r["img_url"]})
            block.append({"tag": "text", "text": "\n"})
        content_blocks.append(block)

    title = f"CC {_th('followup_title')} — {date_display}"
    ok = send_lark_text(webhook, title, content_blocks, secret=secret)
    if ok:
        print(f"   ✓ 发送成功")
    else:
        print(f"   ✗ 发送失败")


# ── CLI ───────────────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(description="Lark Bot — CC 运营推送")
    sub = parser.add_subparsers(dest="command")

    # followup 子命令
    p_followup = sub.add_parser("followup", help="发送未打卡跟进名单")
    p_followup.add_argument("--channel", default="test", help="Lark 通道名 (default: test，安全模式)")
    p_followup.add_argument("--confirm", action="store_true", help="确认发送到正式群（非 test 通道必须加此标志）")
    p_followup.add_argument("--dry-run", action="store_true", help="只生成图片不发送")

    # test 连通性
    parser.add_argument("--test", action="store_true", help="Lark webhook 连通性测试")
    parser.add_argument("--test-channel", default="cc_all", help="测试通道名")

    args = parser.parse_args()

    if args.test:
        config = load_config()
        ch = get_channel(config, args.test_channel)
        send_lark_test(ch["webhook"], secret=ch.get("secret") or None)
        return

    if args.command == "followup":
        cmd_followup(args)
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
