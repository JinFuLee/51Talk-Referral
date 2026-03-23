#!/usr/bin/env python3
"""钉钉多通道通知引擎

支持多群、多角色、多层级的推送路由。
框架配置：key/dingtalk-channels.json
内容配置：projects/referral/notification-config.json

用法：
  from scripts.dingtalk_engine import NotificationEngine
  engine = NotificationEngine()
  engine.run()                          # 推送所有 enabled 通道
  engine.run(channel_id="cc_all")       # 推送指定通道
  engine.run(dry_run=True)              # 只生成图片不发送
  engine.run(test=True)                 # 连通性测试
"""
from __future__ import annotations

import base64
import hashlib
import hmac
import io
import json
import time
import urllib.parse
import urllib.request
from datetime import datetime
from pathlib import Path
from typing import Any

import matplotlib

matplotlib.use("Agg")
import matplotlib.patches as mpatches  # noqa: E402
import matplotlib.pyplot as plt  # noqa: E402

# ── SEE Design System — Warm Neutral 色板（与 dingtalk_daily.py 同源）──────────
_C_BG = "#FAFAF9"
_C_SURFACE = "#F5F5F4"
_C_ELEVATED = "#E7E5E4"
_C_BORDER = "#E7E5E4"
_C_BORDER_H = "#D6D3D1"
_C_MUTED = "#78716C"
_C_TEXT2 = "#57534E"
_C_TEXT = "#1C1917"
_C_N800 = "#292524"
_C_BRAND_P2 = "#3730A3"
_C_ACCENT = "#F59E0B"
_C_SUCCESS = "#059669"
_C_WARNING = "#D97706"
_C_DANGER = "#DC2626"
_C_GREEN_BG = "#ECFDF5"
_C_YELLOW_BG = "#FFFBEB"
_C_RED_BG = "#FEF2F2"

_THAI_FONTS = [
    "Tahoma", "Angsana New", "Browallia New", "Cordia New",
    "TH Sarabun New", "Leelawadee", "Arial Unicode MS", "DejaVu Sans",
    "sans-serif",
]

PROJECT_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_CHANNELS_PATH = PROJECT_ROOT / "key" / "dingtalk-channels.json"
DEFAULT_CONFIG_PATH = (
    PROJECT_ROOT / "projects" / "referral" / "notification-config.json"
)
OUTPUT_DIR = PROJECT_ROOT / "output"
LOG_PATH = OUTPUT_DIR / "notification-log.jsonl"


class NotificationEngine:
    """通用通知引擎：读配置 → 按通道生成 → 发送 → 日志

    配置分层：
      channels_path（key/dingtalk-channels.json）
        — 机密层：webhook/secret/通道元数据
      config_path（projects/referral/notification-config.json）
        — 内容层：模块定义/路由规则
    """

    def __init__(
        self,
        channels_path: Path = DEFAULT_CHANNELS_PATH,
        config_path: Path = DEFAULT_CONFIG_PATH,
    ) -> None:
        self.channels_data = self._load_json(channels_path)
        self.config = self._load_json(config_path)
        self.channels: dict[str, dict] = self.channels_data.get("channels", {})
        self.defaults: dict[str, Any] = self.channels_data.get("defaults", {})
        self.api_base: str = self.defaults.get("api_base", "http://localhost:8100")
        self.routing: dict[str, list[str]] = self.config.get("routing", {})

    # ── 公共接口 ──────────────────────────────────────────────────────────────

    def _today_tag(self) -> str:
        return datetime.now().strftime("%Y%m%d")

    def _is_already_sent(self, channel_id: str) -> bool:
        """幂等检查：同日同通道是否已推送成功（防重复推送）"""
        today = self._today_tag()
        if not LOG_PATH.exists():
            return False
        with open(LOG_PATH) as f:
            for line in f:
                try:
                    entry = json.loads(line.strip())
                    if (
                        entry.get("channel") == channel_id
                        and entry.get("ts", "")[:10].replace("-", "") == today
                        and any(
                            r.get("status") == "sent"
                            for r in entry.get("results", [])
                        )
                    ):
                        return True
                except json.JSONDecodeError:
                    continue
        return False

    def run(
        self,
        channel_id: str | None = None,
        dry_run: bool = False,
        test: bool = False,
        force: bool = False,
        sandbox: bool = False,
    ) -> None:
        """执行推送

        Args:
            channel_id: 指定通道 ID；None 表示所有 enabled 通道
            dry_run:    只生成图片，不上传不发送
            test:       发送连通性测试消息
            force:      忽略幂等检查，强制重发
            sandbox:    沙箱模式，所有推送重定向到测试群
        """
        # 从配置注入阈值到 dingtalk_daily 模块（确保图片生成用配置值）
        th = self.defaults.get("thresholds", {})
        import sys
        _sd = str(Path(__file__).resolve().parent)
        if _sd not in sys.path:
            sys.path.insert(0, _sd)
        import dingtalk_daily as _dm
        _dm.GOOD_RATE = th.get("good", 0.6)
        _dm.WARN_RATE = th.get("warning", 0.4)

        targets = self._resolve_targets(channel_id)

        # sandbox 模式：保留内容路由，替换发送目标为测试群
        if sandbox:
            sandbox_id = self.defaults.get("sandbox_channel", "test")
            sandbox_ch = self.channels.get(sandbox_id)
            if not sandbox_ch:
                print(f"[错误] sandbox 通道 {sandbox_id!r} 不存在")
                return
            print(
                f"🔒 沙箱模式：所有推送重定向到"
                f" [{sandbox_ch.get('group_name', sandbox_id)}]"
            )
            targets = [
                (
                    ch_id,
                    {
                        **ch,
                        "webhook": sandbox_ch["webhook"],
                        "secret": sandbox_ch["secret"],
                    },
                )
                for ch_id, ch in targets
            ]

        # 幂等过滤：同日已成功推送的通道跳过
        if not force and not test and not dry_run:
            filtered = []
            for ch_id, ch in targets:
                if self._is_already_sent(ch_id):
                    print(f"[跳过] {ch_id} 今日已推送，用 --force 强制重发")
                else:
                    filtered.append((ch_id, ch))
            targets = filtered

        if not targets:
            print("没有可用的通道（检查 channels.json 和 enabled 状态）")
            return

        for ch_idx, (ch_id, ch) in enumerate(targets):
            if ch_idx > 0 and not test:
                time.sleep(5)  # 通道间间隔，避免跨群频率限制
            print(f"\n{'='*40}")
            print(
                f"通道: {ch_id} ({ch.get('group_name', '?')}) | "
                f"角色: {ch.get('role')} | "
                f"受众: {ch.get('audience')}"
            )
            print(f"{'='*40}")

            if test:
                self._send_test(ch)
                continue

            modules = self._get_modules(ch)
            print(f"内容模块: {', '.join(modules)}")

            results: list[dict] = []
            for mod_id in modules:
                result = self._process_module(mod_id, ch, dry_run)
                results.append(result)

            if not dry_run:
                self._log(ch_id, ch, modules, results)

        print(f"\n完成：{len(targets)} 个通道")

    # ── 内部：通道解析 ────────────────────────────────────────────────────────

    def _resolve_targets(self, channel_id: str | None) -> list[tuple[str, dict]]:
        """解析目标通道列表"""
        if channel_id:
            ch = self.channels.get(channel_id)
            if not ch:
                available = list(self.channels.keys())
                print(f"通道 {channel_id!r} 不存在，可用通道: {available}")
                return []
            return [(channel_id, ch)]
        # 全部 enabled 通道
        return [
            (cid, ch)
            for cid, ch in self.channels.items()
            if ch.get("enabled", False)
        ]

    def _get_modules(self, channel: dict) -> list[str]:
        """根据 audience 路由到内容模块列表"""
        audience = channel.get("audience", "all")
        return self.routing.get(audience, self.routing.get("all", []))

    # ── 内部：模块处理 ────────────────────────────────────────────────────────

    def _process_module(self, module_id: str, channel: dict, dry_run: bool) -> dict:
        """处理单个内容模块：获取数据 → 生成图片/文本 → 发送"""
        result: dict[str, Any] = {
            "module": module_id,
            "status": "pending",
            "images_count": 0,
        }

        try:
            role = channel.get("role", "CC")

            # action_items 是文本消息，走独立分支
            if module_id == "action_items":
                md_text = self._generate_action_items_text(role)
                if dry_run:
                    print(f"  [{module_id}] (文本消息 dry-run):\n{md_text[:200]}...")
                    result["status"] = "dry_run"
                else:
                    title = "📋 คำแนะนำการดำเนินงาน"
                    r = self._send_dingtalk(title, md_text, channel)
                    if r.get("errcode") == 0:
                        print(f"  ✅ {title}")
                        result["status"] = "sent"
                    else:
                        print(f"  ❌ {title}: {r}")
                        result["status"] = "error"
                return result

            data = self._fetch_data(role)
            if not data:
                result["status"] = "no_data"
                print(f"  [{module_id}] 无数据")
                return result

            images = self._generate_images(module_id, data, role)
            result["images_count"] = len(images)

            if not images:
                # efficiency_metrics 与 process_metrics 合并为一张图，此处跳过
                if module_id == "efficiency_metrics":
                    result["status"] = "merged"
                    print(
                        f"  [{module_id}] 已合并至 process_metrics 图片"
                    )
                else:
                    result["status"] = "no_images"
                    print(
                        f"  [{module_id}] 该模块暂无图片生成器（待后续迭代实现）"
                    )
                return result

            if dry_run:
                for title, img_bytes, path in images:
                    kb = len(img_bytes) / 1024
                    print(f"  [{module_id}] {title} → {path} ({kb:.0f} KB)")
                result["status"] = "dry_run"
                return result

            # 发送（含重试）
            success = 0
            for img_idx, (title, img_bytes, path) in enumerate(images):
                if img_idx > 0:
                    time.sleep(5)  # 钉钉 20条/分钟，5s间隔=12条/分钟（安全）
                sent = self._upload_and_send(
                    img_bytes, title, channel, path.name
                )
                if sent:
                    success += 1

            result["status"] = "sent" if success == len(images) else "partial"
            result["sent"] = success

        except Exception as e:
            result["status"] = "error"
            result["error"] = str(e)
            print(f"  [{module_id}] 错误: {e}")

        return result

    # ── 内部：数据获取 ────────────────────────────────────────────────────────

    def _fetch_data(self, role: str) -> dict | None:
        """从后端 API 获取打卡排行数据（含重试）"""
        role_config = self.defaults.get("role_config")
        url = f"{self.api_base}/api/checkin/ranking"
        if role_config:
            encoded = urllib.parse.quote(json.dumps(role_config, ensure_ascii=False))
            url += f"?role_config={encoded}"

        last_exc: Exception | None = None
        for attempt in range(3):
            if attempt > 0:
                time.sleep(attempt * 1)
            try:
                req = urllib.request.Request(
                    url, headers={"Accept": "application/json"}
                )
                with urllib.request.urlopen(req, timeout=15) as resp:
                    return json.loads(resp.read().decode("utf-8"))
            except Exception as e:
                last_exc = e
                print(f"  _fetch_data 第 {attempt + 1} 次失败: {e}")

        raise RuntimeError("_fetch_data 重试 3 次仍失败") from last_exc

    def _fetch_url(self, url: str) -> dict | None:
        """通用 HTTP GET，含 3 次重试，失败返回 None（不抛出异常）"""
        last_exc: Exception | None = None
        for attempt in range(3):
            if attempt > 0:
                time.sleep(attempt * 1)
            try:
                req = urllib.request.Request(
                    url, headers={"Accept": "application/json"}
                )
                with urllib.request.urlopen(req, timeout=15) as resp:
                    return json.loads(resp.read().decode("utf-8"))
            except Exception as e:
                last_exc = e
                print(f"  _fetch_url({url}) 第 {attempt + 1} 次失败: {e}")
        print(f"  _fetch_url 重试耗尽: {last_exc}")
        return None

    def _fetch_overview(self) -> dict | None:
        """获取 /api/overview 数据（含 metrics/time_progress/kpi_pace）"""
        return self._fetch_url(f"{self.api_base}/api/overview")

    def _fetch_followup(self, role: str) -> dict | None:
        """获取 /api/checkin/followup?role={role} 未打卡高潜学员数据"""
        return self._fetch_url(
            f"{self.api_base}/api/checkin/followup?role={urllib.parse.quote(role)}"
        )

    # ── 内部：图片生成 ────────────────────────────────────────────────────────

    def _generate_images(
        self,
        module_id: str,
        data: dict,
        role: str,
    ) -> list[tuple[str, bytes, Path]]:
        """生成图片，返回 [(title, image_bytes, save_path)]

        延迟 import dingtalk_daily 的图片函数，避免循环依赖。
        未实现的模块返回空列表，不报错（待后续迭代）。
        """
        # 延迟导入，避免循环依赖（engine 先加载，daily 后加载时不触发重入）
        import sys  # noqa: PLC0415

        _scripts_dir = str(Path(__file__).resolve().parent)
        if _scripts_dir not in sys.path:
            sys.path.insert(0, _scripts_dir)
        import dingtalk_daily as _daily_mod  # noqa: PLC0415
        generate_report_image = _daily_mod.generate_report_image
        generate_team_image = _daily_mod.generate_team_image

        OUTPUT_DIR.mkdir(exist_ok=True)
        date_tag = datetime.now().strftime("%Y%m%d")
        today_str = datetime.now().strftime("%d/%m")
        images: list[tuple[str, bytes, Path]] = []

        role_data = data.get("by_role", {}).get(role, {})

        if module_id == "team_ranking":
            img = generate_report_image(data)
            path = OUTPUT_DIR / f"checkin-overview-{role}-{date_tag}.png"
            path.write_bytes(img)
            images.append((f"{role} Check-in Overview {today_str}", img, path))

        elif module_id == "individual_ranking":
            persons: list[dict] = role_data.get("by_person", [])
            groups: list[dict] = role_data.get("by_group", [])

            # 按 group 分桶
            group_members: dict[str, list[dict]] = {}
            for p in persons:
                g = p.get("group", "") or "Unknown"
                group_members.setdefault(g, []).append(p)

            # 按 by_group 顺序排列，补充不在列表中的团队
            group_order = [g.get("group", "") for g in groups]
            ordered = [t for t in group_order if t in group_members]
            ordered += [t for t in group_members if t not in ordered]

            for team_name in ordered:
                members = group_members[team_name]
                if not members:
                    continue
                t_total = sum(m.get("students", 0) for m in members)
                t_checked = sum(m.get("checked_in", 0) for m in members)
                short = team_name.replace("TH-", "").replace("Team", "")

                img = generate_team_image(team_name, members, t_total, t_checked)
                path = OUTPUT_DIR / f"checkin-{short}-{date_tag}.png"
                path.write_bytes(img)
                images.append((f"{short} Check-in {today_str}", img, path))

        elif module_id == "result_metrics":
            overview = self._fetch_overview()
            img_bytes = self._gen_result_metrics_image(overview, role, today_str)
            path = OUTPUT_DIR / f"result-metrics-{role}-{date_tag}.png"
            path.write_bytes(img_bytes)
            images.append((f"ผลลัพธ์ {role} {today_str}", img_bytes, path))

        elif module_id == "achievement_metrics":
            overview = self._fetch_overview()
            img_bytes = self._gen_achievement_metrics_image(overview, role, today_str)
            path = OUTPUT_DIR / f"achievement-metrics-{role}-{date_tag}.png"
            path.write_bytes(img_bytes)
            images.append((f"การบรรลุเป้า {role} {today_str}", img_bytes, path))

        elif module_id in ("process_metrics", "efficiency_metrics"):
            # 合并过程+效率为一张图
            # process_metrics 生成图，efficiency_metrics 跳过避免重复
            if module_id == "process_metrics":
                overview = self._fetch_overview()
                img_bytes = self._gen_process_efficiency_image(
                    overview, role, today_str
                )
                path = OUTPUT_DIR / f"process-efficiency-{role}-{date_tag}.png"
                path.write_bytes(img_bytes)
                title_th = f"กระบวนการ+ประสิทธิภาพ {role} {today_str}"
                images.append((title_th, img_bytes, path))

        elif module_id == "service_metrics":
            overview = self._fetch_overview()
            img_bytes = self._gen_service_metrics_image(overview, role, today_str)
            if img_bytes is not None:
                path = OUTPUT_DIR / f"service-metrics-{role}-{date_tag}.png"
                path.write_bytes(img_bytes)
                images.append((f"บริการ {role} {today_str}", img_bytes, path))
            else:
                print("  [service_metrics] ข้ามเนื่องจากไม่มีข้อมูล")

        # action_items 由 _process_module 直接处理文本，不走图片流程
        else:
            pass

        return images

    # ── 内部：TL+ 专属图片生成器 ───────────────────────────────────────────────

    def _fig_to_bytes(self, fig: plt.Figure) -> bytes:
        """Figure → PNG bytes，自动关闭 fig"""
        buf = io.BytesIO()
        fig.savefig(buf, format="png", dpi=150, bbox_inches="tight")
        plt.close(fig)
        buf.seek(0)
        return buf.read()

    def _status_color(self, rate: float) -> str:
        """达成率 → 状态颜色"""
        if rate >= 1.0:
            return _C_SUCCESS
        if rate >= 0.8:
            return _C_WARNING
        return _C_DANGER

    def _status_bg(self, rate: float) -> str:
        if rate >= 1.0:
            return _C_GREEN_BG
        if rate >= 0.8:
            return _C_YELLOW_BG
        return _C_RED_BG

    def _draw_header(self, fig: plt.Figure, title: str, subtitle: str) -> None:
        """在 Figure 顶部绘制统一标题栏"""
        fig.text(
            0.05, 0.97, title,
            fontsize=14, fontweight="bold", color=_C_TEXT,
            fontfamily=_THAI_FONTS, va="top",
        )
        fig.text(
            0.05, 0.93, subtitle,
            fontsize=9, color=_C_TEXT2,
            fontfamily=_THAI_FONTS, va="top",
        )
        fig.add_artist(
            mpatches.FancyBboxPatch(
                (0.0, 0.905), 1.0, 0.002,
                transform=fig.transFigure,
                boxstyle="square,pad=0",
                facecolor=_C_BORDER, linewidth=0,
            )
        )

    def _gen_result_metrics_image(
        self, overview: dict | None, role: str, today_str: str
    ) -> bytes:
        """结果指标卡片图：品牌竖条 + 圆角卡片 + 大数字 + 进度条（SEE Design System）"""
        metrics: dict = {}
        kpi_pace: dict = {}
        if overview:
            metrics = overview.get("metrics", {})
            kpi_pace = overview.get("kpi_pace", {})

        # 按 role 决定展示项（全泰文 label）
        if role == "CC":
            items = [
                {
                    "label_th": "รายได้ (USD)",
                    "label_zh": "付费金额 (USD)",
                    "actual": metrics.get("总带新付费金额USD", 0),
                    "target": kpi_pace.get("revenue", {}).get("target", 0),
                    "fmt": lambda v: f"${v:,.0f}",
                },
                {
                    "label_th": "จำนวนชำระ",
                    "label_zh": "付费单量",
                    "actual": kpi_pace.get("paid", {}).get("actual", 0),
                    "target": kpi_pace.get("paid", {}).get("target", 0),
                    "fmt": lambda v: f"{v:,.0f}",
                },
            ]
        elif role == "SS":
            items = [
                {
                    "label_th": "Leads แคบ",
                    "label_zh": "窄口 Leads",
                    "actual": metrics.get("转介绍注册数", 0),
                    "target": kpi_pace.get("register", {}).get("target", 0),
                    "fmt": lambda v: f"{v:,.0f}",
                },
            ]
        else:  # LP
            items = [
                {
                    "label_th": "Leads รวม",
                    "label_zh": "窄+宽 Leads",
                    "actual": metrics.get("转介绍注册数", 0),
                    "target": kpi_pace.get("register", {}).get("target", 0),
                    "fmt": lambda v: f"{v:,.0f}",
                },
            ]

        plt.rcParams["font.family"] = _THAI_FONTS
        n = len(items)
        # 高度 = 标题区(1.5) + 图例(0.5) + 每卡片(2.2) + 底部(0.5)
        fig_h = 1.5 + 0.5 + n * 2.2 + 0.5
        fig, ax = plt.subplots(figsize=(7, fig_h), dpi=150)
        fig.patch.set_facecolor(_C_BG)
        ax.set_xlim(0, 9)
        ax.set_ylim(0, fig_h)
        ax.set_aspect("equal")
        ax.axis("off")

        y = fig_h

        # ── 品牌竖条 + 标题 ──
        y -= 0.3
        ax.add_patch(plt.Rectangle(
            (0.2, y - 0.35), 0.08, 0.35,
            facecolor=_C_ACCENT, edgecolor="none",
        ))
        ax.text(
            0.45, y, f"ผลลัพธ์ · {role}",
            fontsize=13, fontweight="bold", color=_C_TEXT, va="top",
        )
        ax.text(
            0.45, y - 0.30, f"结果指标 · {role}",
            fontsize=8, color=_C_MUTED, va="top",
        )
        y -= 0.55
        ax.text(
            0.45, y, f"{today_str}  |  T-1",
            fontsize=9, color=_C_TEXT2, va="top",
        )
        y -= 0.55

        # ── 图例（状态圆点，阈值从配置读取） ──
        th = self.defaults.get("thresholds", {})
        g_pct = int(th.get("good", 0.6) * 100)
        w_pct = int(th.get("warning", 0.4) * 100)
        legend_items = [
            (_C_SUCCESS, f">={g_pct}% ผ่าน/达标"),
            (_C_WARNING, f"{w_pct}-{g_pct}% ใกล้เคียง/接近"),
            (_C_DANGER, f"<{w_pct}% ต่ำกว่า/未达"),
        ]
        lx = 0.4
        for lc, ltxt in legend_items:
            ax.add_patch(plt.Circle(
                (lx + 0.1, y + 0.08), 0.07,
                facecolor=lc, edgecolor="none",
            ))
            ax.text(
                lx + 0.25, y + 0.08, ltxt,
                fontsize=7.5, color=_C_TEXT2, va="center",
            )
            lx += 2.8
        y -= 0.35

        # ── KPI 卡片（SEE 4px 网格：充足留白）──
        card_w = 8.6
        card_h = 1.9  # 从 1.35 加大到 1.9（+40% 呼吸空间）
        card_x = 0.2

        for item in items:
            actual = item["actual"] or 0
            target = item["target"] or 0
            rate = (actual / target) if target > 0 else 0
            col = self._status_color(rate)
            val_str = item["fmt"](actual)
            tgt_str = item["fmt"](target)

            # 卡片背景（白底圆角边框）
            ax.add_patch(mpatches.FancyBboxPatch(
                (card_x, y - card_h), card_w, card_h,
                boxstyle="round,pad=0.12",
                facecolor="white", edgecolor=_C_BORDER, linewidth=1,
            ))

            # 左侧状态色条（细+柔，用浅色版本降低视觉权重）
            _light_colors = {
                _C_SUCCESS: "#BBF7D0",
                _C_WARNING: "#FDE68A",
                _C_DANGER: "#FECACA",
            }
            bar_col = _light_colors.get(col, col)
            ax.add_patch(mpatches.FancyBboxPatch(
                (card_x + 0.08, y - card_h + 0.25), 0.03, card_h - 0.5,
                boxstyle="round,pad=0.02",
                facecolor=bar_col, edgecolor="none",
            ))

            # 左区：指标名（上）→ 大数字（中）→ 目标（下）
            lx = card_x + 0.7

            # 指标名（泰文主，中文辅）
            ax.text(
                lx, y - 0.28, item["label_th"],
                fontsize=9, color=_C_MUTED, va="center",
            )
            ax.text(
                lx, y - 0.48, item["label_zh"],
                fontsize=7, color=_C_MUTED, va="center",
            )
            # 大数字
            ax.text(
                lx, y - 0.85, val_str,
                fontsize=24, fontweight="bold", color=_C_TEXT, va="center",
            )
            # 目标
            ax.text(
                lx, y - 1.22,
                f"เป้า/目标 {tgt_str}",
                fontsize=9, color=_C_MUTED, va="center",
            )

            # 右区：达成率百分比
            rx = card_x + card_w - 0.6
            ax.text(
                rx, y - 0.65,
                f"{rate * 100:.0f}%",
                fontsize=28, fontweight="bold", color=col,
                va="center", ha="right",
            )
            ax.text(
                rx, y - 1.10,
                "อัตราบรรลุ/达成率",
                fontsize=7.5, color=_C_MUTED,
                va="center", ha="right",
            )

            # 进度条（底部，充足间距）
            bar_x = lx
            bar_y = y - 1.55
            bar_w = card_w - 2.2
            ax.add_patch(mpatches.FancyBboxPatch(
                (bar_x, bar_y), bar_w, 0.12,
                boxstyle="round,pad=0.03",
                facecolor=_C_ELEVATED, edgecolor="none",
            ))
            fill_w = min(rate, 1.0) * bar_w
            if fill_w > 0.05:
                ax.add_patch(mpatches.FancyBboxPatch(
                    (bar_x, bar_y), fill_w, 0.12,
                    boxstyle="round,pad=0.03",
                    facecolor=col, edgecolor="none",
                ))
            ax.text(
                bar_x + bar_w + 0.15, bar_y + 0.06,
                f"{rate * 100:.1f}%",
                fontsize=7.5, color=col, va="center",
            )

            y -= card_h + 0.25

        # ── 底部分隔线 + 品牌文字 ──
        y -= 0.1
        ax.plot([1.0, 8.0], [y + 0.1, y + 0.1], color=_C_BORDER_H, linewidth=0.5)
        ax.text(
            4.5, y - 0.05, "ref-ops-engine  |  T-1 Data",
            fontsize=7.5, color=_C_MUTED, va="center", ha="center",
        )

        plt.tight_layout(pad=0.3)
        return self._fig_to_bytes(fig)

    def _gen_achievement_metrics_image(
        self, overview: dict | None, role: str, today_str: str
    ) -> bytes:
        """达成指标表格图：深色表头 + 斑马纹 + 状态圆点 + 迷你进度条"""
        kpi_pace: dict = {}
        if overview:
            kpi_pace = overview.get("kpi_pace", {})

        # 按 role 决定行（全泰文 label）
        if role == "CC":
            rows = [
                ("อัตราบรรลุ Leads", "Leads 达成率", "register"),
                ("อัตราบรรลุนัดหมาย", "预约达成率", "appointment"),
                ("อัตราบรรลุเข้าเรียน", "出席达成率", "showup"),
                ("อัตราบรรลุชำระ", "付费达成率", "paid"),
                ("อัตราบรรลุรายได้", "业绩达成率", "revenue"),
                ("อัตราบรรลุ AOV", "客单价达成率", "aov"),
                ("อัตราเช็คอิน", "打卡率", "checkin"),
            ]
        elif role == "SS":
            rows = [
                ("อัตราบรรลุ Leads", "Leads 达成率", "register"),
                ("อัตราเช็คอิน", "打卡率", "checkin"),
            ]
        else:  # LP
            rows = [
                ("อัตราบรรลุ Leads", "Leads 达成率", "register"),
                ("อัตราเช็คอิน", "打卡率", "checkin"),
            ]

        table_data = []
        for label_th, label_zh, key in rows:
            pace = kpi_pace.get(key, {})
            actual = pace.get("actual", 0) or 0
            target = pace.get("target", 0) or 0
            # 跳过目标和实际都为 0 的行（无数据）
            if target == 0 and actual == 0:
                continue
            rate = (actual / target) if target > 0 else 0
            gap = actual - target
            table_data.append((label_th, label_zh, target, actual, rate, gap))

        plt.rcParams["font.family"] = _THAI_FONTS
        n = len(table_data)
        row_unit = 0.55  # 每行高度（双语行需要更多空间）
        header_h = 0.60  # 双行表头需要更高行高
        title_h = 1.1
        footer_h = 0.5
        fig_h = max(title_h + header_h + n * row_unit + footer_h, 3.0)

        fig, ax = plt.subplots(figsize=(7, fig_h), dpi=150)
        fig.patch.set_facecolor(_C_BG)
        ax.set_xlim(0, 9)
        ax.set_ylim(0, fig_h)
        ax.set_aspect("equal")
        ax.axis("off")

        y = fig_h

        # ── 品牌竖条 + 标题 ──
        y -= 0.3
        ax.add_patch(plt.Rectangle(
            (0.2, y - 0.35), 0.08, 0.35,
            facecolor=_C_BRAND_P2, edgecolor="none",
        ))
        ax.text(
            0.45, y, f"การบรรลุเป้า · {role}",
            fontsize=13, fontweight="bold", color=_C_TEXT, va="top",
        )
        ax.text(
            0.45, y - 0.30, f"达成指标 · {role}",
            fontsize=8, color=_C_MUTED, va="top",
        )
        y -= 0.55
        ax.text(
            0.45, y, f"{today_str}  |  T-1",
            fontsize=9, color=_C_TEXT2, va="top",
        )
        y -= 0.45

        # ── 表头（深色背景，双行：泰文主行 + 中文副行）──
        table_x = 0.2
        table_w = 8.6
        col_headers_th = ["ตัวชี้วัด", "เป้า", "จริง", "อัตราบรรลุ", "ผลต่าง", ""]
        col_headers_zh = ["指标", "目标", "实际", "达成率", "差额", ""]
        col_xs = [0.35, 2.9, 4.2, 5.5, 7.0, 8.5]
        col_aligns = ["left", "right", "right", "right", "right", "left"]

        ax.add_patch(plt.Rectangle(
            (table_x, y - header_h), table_w, header_h,
            facecolor=_C_N800, edgecolor="none",
        ))
        for th_lbl, zh_lbl, x, align in zip(
            col_headers_th, col_headers_zh, col_xs, col_aligns, strict=False
        ):
            ax.text(
                x, y - header_h * 0.33, th_lbl,
                fontsize=8.5, color="white", va="center",
                ha=align, fontweight="bold",
            )
            ax.text(
                x, y - header_h * 0.70, zh_lbl,
                fontsize=6.5, color="#A8A29E", va="center",
                ha=align,
            )
        y -= header_h

        # ── 数据行（斑马纹 + 状态圆点 + 迷你进度条） ──
        for idx, (label_th, label_zh, target, actual, rate, gap) in enumerate(
            table_data
        ):
            row_bg = _C_SURFACE if idx % 2 == 0 else "white"
            ax.add_patch(plt.Rectangle(
                (table_x, y - row_unit), table_w, row_unit,
                facecolor=row_bg, edgecolor="none",
            ))

            col = self._status_color(rate)
            cy = y - row_unit * 0.5  # 行中心 y

            # 指标名（泰文主，中文辅小字）
            ax.text(
                col_xs[0], cy + 0.07, label_th,
                fontsize=8.5, color=_C_TEXT, va="center", ha="left",
            )
            ax.text(
                col_xs[0], cy - 0.12, label_zh,
                fontsize=6.5, color=_C_MUTED, va="center", ha="left",
            )
            # 目标
            ax.text(
                col_xs[1], cy, f"{target:,.0f}",
                fontsize=8.5, color=_C_TEXT2, va="center", ha="right",
            )
            # 实际
            ax.text(
                col_xs[2], cy, f"{actual:,.0f}",
                fontsize=8.5, color=_C_TEXT, va="center", ha="right",
            )
            # 达成率（带状态颜色）
            ax.text(
                col_xs[3], cy, f"{rate * 100:.1f}%",
                fontsize=8.5, color=col, va="center", ha="right",
                fontweight="bold",
            )
            # 差额
            gap_col = _C_SUCCESS if gap >= 0 else _C_DANGER
            ax.text(
                col_xs[4], cy, f"{gap:+,.0f}",
                fontsize=8.5, color=gap_col, va="center", ha="right",
            )

            # 状态圆点
            ax.add_patch(plt.Circle(
                (col_xs[5] - 0.15, cy), 0.1,
                facecolor=col, edgecolor="none", zorder=5,
            ))

            y -= row_unit

        # ── 底部分隔线 + 品牌文字 ──
        y -= 0.15
        ax.plot([1.0, 8.0], [y + 0.05, y + 0.05], color=_C_BORDER_H, linewidth=0.5)
        ax.text(
            4.5, y - 0.12, "ref-ops-engine  |  T-1 Data",
            fontsize=7.5, color=_C_MUTED, va="center", ha="center",
        )

        plt.tight_layout(pad=0.3)
        return self._fig_to_bytes(fig)

    def _gen_process_efficiency_image(
        self, overview: dict | None, role: str, today_str: str
    ) -> bytes:
        """过程 + 效率指标两段式表格（深色表头 + 斑马纹 + 段落分隔线）"""
        metrics: dict = {}
        if overview:
            metrics = overview.get("metrics", {})

        # 按 role 决定过程/效率指标（全泰文 label → 数据字段 key）
        # items 格式：(泰文指标名, 中文指标名, 数据key)，渲染为双行
        if role == "CC":
            process_items = [
                ("ลงทะเบียน", "注册", "转介绍注册数"),
                ("นัดหมาย", "预约", "预约数"),
                ("เข้าเรียน", "出席", "出席数"),
                ("ชำระ", "付费", "转介绍付费数"),
                ("เช็คอิน", "打卡", "打卡数"),
                ("ติดต่อ ≥120s", "触达", "触达数"),
                ("แนะนำ", "带新", "带新数"),
                ("สัดส่วน", "带货", "带货数"),
            ]
            efficiency_items = [
                ("อัตราติดต่อ", "触达率", "触达率"),
                ("สัดส่วนแนะนำ", "带货比", "带货比"),
                ("ค่าสัมประสิทธิ์แนะนำ", "带新系数", "带新系数"),
                ("อัตราลงทะเบียน→ชำระ", "注册转化率", "注册转化率"),
                ("อัตรานัดหมาย→ชำระ", "预约出席率", "预约出席率"),
                ("อัตราเข้าเรียน→ชำระ", "出席付费率", "出席付费率"),
            ]
        elif role == "SS":
            process_items = [
                ("ลงทะเบียน", "注册", "转介绍注册数"),
                ("ติดต่อ", "触达", "触达数"),
                ("แนะนำ", "带新", "带新数"),
            ]
            efficiency_items = [
                ("อัตราติดต่อ", "触达率", "触达率"),
                ("ค่าสัมประสิทธิ์แนะนำ", "带新系数", "带新系数"),
            ]
        else:  # LP
            process_items = [
                ("ลงทะเบียน", "注册", "转介绍注册数"),
                ("ติดต่อ", "触达", "触达数"),
                ("แนะนำ", "带新", "带新数"),
                ("เช็คอิน", "打卡", "打卡数"),
            ]
            efficiency_items = [
                ("อัตราติดต่อ", "触达率", "触达率"),
                ("ค่าสัมประสิทธิ์แนะนำ", "带新系数", "带新系数"),
            ]

        def _fmt_val(v: object) -> str:
            if v is None:
                return "--"
            if isinstance(v, float):
                return f"{v:.2%}" if v < 10 else f"{v:,.1f}"
            return f"{int(v):,}"

        plt.rcParams["font.family"] = _THAI_FONTS
        n_process = len(process_items)
        n_efficiency = len(efficiency_items)
        n_total = n_process + n_efficiency

        row_unit = 0.52  # 双行指标名需要更多行高（从 0.40 增加）
        header_h = 0.46
        section_gap = 0.5  # 过程/效率分隔区高度
        title_h = 1.1
        footer_h = 0.5
        fig_h = max(
            title_h + header_h + n_total * row_unit + section_gap + footer_h,
            3.5,
        )

        fig, ax = plt.subplots(figsize=(7, fig_h), dpi=150)
        fig.patch.set_facecolor(_C_BG)
        ax.set_xlim(0, 9)
        ax.set_ylim(0, fig_h)
        ax.set_aspect("equal")
        ax.axis("off")

        y = fig_h

        # ── 品牌竖条 + 标题 ──
        y -= 0.3
        ax.add_patch(plt.Rectangle(
            (0.2, y - 0.35), 0.08, 0.35,
            facecolor=_C_ACCENT, edgecolor="none",
        ))
        ax.text(
            0.45, y, f"กระบวนการ & ประสิทธิภาพ · {role}",
            fontsize=13, fontweight="bold", color=_C_TEXT, va="top",
        )
        ax.text(
            0.45, y - 0.30, f"过程指标 & 效率指标 · {role}",
            fontsize=8, color=_C_MUTED, va="top",
        )
        y -= 0.55
        ax.text(
            0.45, y, f"{today_str}  |  T-1",
            fontsize=9, color=_C_TEXT2, va="top",
        )
        y -= 0.45

        table_x = 0.2
        table_w = 8.6
        col_xs = [0.35, 5.5, 8.4]
        col_aligns = ["left", "left", "right"]

        def _draw_section(
            section_label: str,
            items: list[tuple[str, str]],
            start_y: float,
            accent: str,
        ) -> float:
            """绘制一段表格（标题竖条 + 深色表头 + 数据行），返回结束 y"""
            sy = start_y

            # 段标题（竖条 + 文字）
            ax.add_patch(plt.Rectangle(
                (0.2, sy - 0.28), 0.06, 0.25,
                facecolor=accent, edgecolor="none",
            ))
            ax.text(
                0.38, sy, section_label,
                fontsize=10, fontweight="bold", color=_C_TEXT, va="top",
            )
            sy -= 0.38

            # 深色表头
            col_labels_th = ["ตัวชี้วัด", "", "ค่า"]
            ax.add_patch(plt.Rectangle(
                (table_x, sy - header_h), table_w, header_h,
                facecolor=_C_N800, edgecolor="none",
            ))
            for lbl, cx, ca in zip(col_labels_th, col_xs, col_aligns, strict=False):
                ax.text(
                    cx, sy - header_h * 0.5, lbl,
                    fontsize=8.5, color="white", va="center",
                    ha=ca, fontweight="bold",
                )
            sy -= header_h

            # 数据行（三元素元组：泰文名, 中文名, 数据key；双行显示）
            for idx, item in enumerate(items):
                label_th, label_zh, data_key = item
                val = metrics.get(data_key)
                row_bg = _C_SURFACE if idx % 2 == 0 else "white"
                ax.add_patch(plt.Rectangle(
                    (table_x, sy - row_unit), table_w, row_unit,
                    facecolor=row_bg, edgecolor="none",
                ))
                cy = sy - row_unit * 0.5
                # 泰文主行（偏上）
                ax.text(
                    col_xs[0], cy + 0.08, label_th,
                    fontsize=8.5, color=_C_TEXT, va="center", ha="left",
                )
                # 中文副行（偏下，浅色）
                ax.text(
                    col_xs[0], cy - 0.10, label_zh,
                    fontsize=6.5, color=_C_MUTED, va="center", ha="left",
                )
                ax.text(
                    col_xs[2], cy, _fmt_val(val),
                    fontsize=9, color=_C_TEXT, va="center", ha="right",
                    fontweight="bold",
                )
                sy -= row_unit

            return sy

        y = _draw_section("กระบวนการ  过程指标", process_items, y, _C_ACCENT)
        y -= section_gap * 0.3

        # 段落分隔线
        ax.plot([0.8, 8.2], [y + section_gap * 0.35, y + section_gap * 0.35],
                color=_C_BORDER_H, linewidth=0.8, linestyle="--")
        y -= section_gap * 0.3

        y = _draw_section("ประสิทธิภาพ  效率指标", efficiency_items, y, _C_BRAND_P2)

        # ── 底部分隔线 + 品牌文字 ──
        y -= 0.15
        ax.plot([1.0, 8.0], [y + 0.05, y + 0.05], color=_C_BORDER_H, linewidth=0.5)
        ax.text(
            4.5, y - 0.12, "ref-ops-engine  |  T-1 Data",
            fontsize=7.5, color=_C_MUTED, va="center", ha="center",
        )

        plt.tight_layout(pad=0.3)
        return self._fig_to_bytes(fig)

    def _gen_service_metrics_image(
        self, overview: dict | None, role: str, today_str: str
    ) -> bytes | None:
        """服务指标图：付费前/后外呼双列表格。无数据时返回 None（不发送）。"""
        metrics: dict = {}
        if overview:
            metrics = overview.get("metrics", {})

        # 尝试读取外呼字段（后端可能尚未提供）
        pre_call = metrics.get("付费前外呼数")
        post_call = metrics.get("付费后外呼数")
        has_data = pre_call is not None or post_call is not None

        # 无数据 → 跳过，不生成空态图
        if not has_data:
            return None

        plt.rcParams["font.family"] = _THAI_FONTS
        fig_h = 4.2
        fig, ax = plt.subplots(figsize=(7, fig_h), dpi=150)
        fig.patch.set_facecolor(_C_BG)
        ax.set_xlim(0, 9)
        ax.set_ylim(0, fig_h)
        ax.set_aspect("equal")
        ax.axis("off")

        y = fig_h

        # ── 品牌竖条 + 标题 ──
        y -= 0.3
        ax.add_patch(plt.Rectangle(
            (0.2, y - 0.35), 0.08, 0.35,
            facecolor=_C_BRAND_P2, edgecolor="none",
        ))
        ax.text(
            0.45, y, f"บริการ · {role}",
            fontsize=14, fontweight="bold", color=_C_TEXT, va="top",
        )
        y -= 0.45
        ax.text(
            0.45, y, f"{today_str}  |  T-1",
            fontsize=9, color=_C_TEXT2, va="top",
        )
        y -= 0.55

        if not has_data:
            # 空态：品牌色虚线框 + 居中泰文提示
            box_h = 1.4
            ax.add_patch(mpatches.FancyBboxPatch(
                (0.5, y - box_h), 8.0, box_h,
                boxstyle="round,pad=0.15",
                facecolor=_C_SURFACE,
                edgecolor=_C_BRAND_P2, linewidth=1.5,
                linestyle="--",
            ))
            # 绘制矩形图标（代替 emoji）
            icon_x, icon_y = 3.8, y - box_h * 0.38
            ax.add_patch(plt.Rectangle(
                (icon_x - 0.25, icon_y - 0.18), 0.5, 0.36,
                facecolor=_C_ELEVATED, edgecolor=_C_BORDER, linewidth=0.8,
            ))
            ax.plot([icon_x - 0.25, icon_x + 0.25], [icon_y, icon_y],
                    color=_C_MUTED, linewidth=0.8)

            ax.text(
                4.5, y - box_h * 0.42,
                "ยังไม่มีข้อมูลการโทร",
                fontsize=12, color=_C_MUTED, ha="center", va="center",
                fontweight="bold",
            )
            ax.text(
                4.5, y - box_h * 0.72,
                "ระบบจะแสดงข้อมูลโดยอัตโนมัติเมื่อเชื่อมต่อ API",
                fontsize=8.5, color=_C_MUTED, ha="center", va="center",
            )

            # 底部
            ax.plot([1.0, 8.0], [0.4, 0.4], color=_C_BORDER_H, linewidth=0.5)
            ax.text(4.5, 0.22, "ref-ops-engine  |  T-1 Data",
                    fontsize=7.5, color=_C_MUTED, va="center", ha="center")
            plt.tight_layout(pad=0.3)
            return self._fig_to_bytes(fig)

        # 有数据时渲染双列表格
        rows_def = [
            ("จำนวนโทร", "付费前外呼数", "付费后外呼数"),
            ("ติดต่อได้", "付费前接通数", "付费后接通数"),
            ("มีประสิทธิผล", "付费前有效接通数", "付费后有效接通数"),
        ]
        col_labels_th = ["ตัวชี้วัด", "โทรก่อนชำระ", "โทรหลังชำระ"]
        col_xs = [0.35, 4.5, 7.2]
        col_aligns = ["left", "right", "right"]

        table_x = 0.2
        table_w = 8.6
        header_h = 0.46

        # 深色表头
        ax.add_patch(plt.Rectangle(
            (table_x, y - header_h), table_w, header_h,
            facecolor=_C_N800, edgecolor="none",
        ))
        for label, x, align in zip(col_labels_th, col_xs, col_aligns, strict=False):
            ax.text(
                x, y - header_h * 0.5, label,
                fontsize=8.5, color="white", va="center",
                ha=align, fontweight="bold",
            )
        y -= header_h

        # 数据行（斑马纹）
        row_unit = 0.46
        for idx, (label_th, pre_key, post_key) in enumerate(rows_def):
            row_bg = _C_SURFACE if idx % 2 == 0 else "white"
            ax.add_patch(plt.Rectangle(
                (table_x, y - row_unit), table_w, row_unit,
                facecolor=row_bg, edgecolor="none",
            ))
            pre_v = metrics.get(pre_key)
            post_v = metrics.get(post_key)
            cy = y - row_unit * 0.5
            pre_str = f"{int(pre_v):,}" if pre_v is not None else "--"
            post_str = f"{int(post_v):,}" if post_v is not None else "--"
            for v, x, align in zip(
                [label_th, pre_str, post_str], col_xs, col_aligns, strict=False
            ):
                ax.text(x, cy, v, fontsize=9, color=_C_TEXT, va="center", ha=align)
            y -= row_unit

        # ── 底部分隔线 + 品牌文字 ──
        y -= 0.15
        ax.plot([1.0, 8.0], [y + 0.05, y + 0.05], color=_C_BORDER_H, linewidth=0.5)
        ax.text(
            4.5, y - 0.15, "ref-ops-engine  |  T-1 Data",
            fontsize=7.5, color=_C_MUTED, va="center", ha="center",
        )

        plt.tight_layout(pad=0.3)
        return self._fig_to_bytes(fig)

    def _generate_action_items_text(self, role: str) -> str:
        """生成操作指令 Markdown 文本：未打卡高潜学员 top 5（泰中双语）"""
        followup = self._fetch_followup(role)
        today = datetime.now().strftime("%d/%m/%Y")

        lines = [
            f"### นักเรียนที่ต้องติดตาม Top 5 · {role}",
            f"### 需跟进高潜学员 Top 5 · {role}",
        ]
        lines.append(f"**{today}  |  T-1**\n")

        if not followup:
            lines.append("⚠ ยังไม่มีข้อมูล")
            lines.append("⚠ 后端暂未提供跟进数据")
            lines.append("\n> กรุณาติดตามนักเรียนสำคัญ")
            lines.append("> 请相关人员跟进重点学员")
            return "\n".join(lines)

        raw: object = followup.get("students", followup)
        students: list[dict] = raw if isinstance(raw, list) else []
        if not students:
            lines.append("✅ ไม่มีนักเรียนที่ต้องติดตาม")
            lines.append("✅ 暂无需跟进学员")
            return "\n".join(lines)

        top5 = students[:5]
        lines.append("**นักเรียนที่มีศักยภาพสูงยังไม่ได้เช็คอิน Top 5：**")
        lines.append("**高潜未打卡学员 Top 5：**\n")
        for i, s in enumerate(top5, 1):
            sid = s.get("student_id", s.get("id", "--"))
            enclosure = s.get("enclosure", s.get("days", "--"))
            score = s.get("quality_score", s.get("score", "--"))
            owner = s.get("owner", s.get("assigned_to", "--"))
            if isinstance(score, float):
                score = f"{score:.1f}"
            line_th = (
                f"{i}. นักเรียน `{sid}` | วงล้อม {enclosure} วัน"
                f" | คะแนน {score} | ผู้รับผิดชอบ: {owner}"
            )
            line_zh = (
                f"   学员 `{sid}` | 围场 {enclosure}天"
                f" | 评分 {score} | 负责人: {owner}"
            )
            lines.append(line_th)
            lines.append(line_zh)

        lines.append(f"\n> กรุณาติดตาม {len(top5)} นักเรียนข้างต้นโดยเร็ว")
        lines.append(f"> 请相关人员尽快跟进以上 {len(top5)} 位学员")
        return "\n".join(lines)

    # ── 内部：图片上传（双图床 fallback）────────────────────────────────────

    @staticmethod
    def _upload_image(
        img_bytes: bytes, filename: str = "report.png"
    ) -> str | None:
        """上传图片，双图床 fallback 链：freeimage.host → sm.ms(新域名)"""
        providers = [
            ("freeimage.host", NotificationEngine._upload_freeimage),
            ("sm.ms(s.ee)", NotificationEngine._upload_smms),
        ]
        for name, fn in providers:
            try:
                url = fn(img_bytes, filename)
                if url:
                    return url
            except Exception as e:
                print(f"    [{name}] 失败: {e}")
        return None

    @staticmethod
    def _upload_freeimage(
        img_bytes: bytes, filename: str
    ) -> str | None:
        """freeimage.host — 免费，无需注册"""
        import base64 as b64

        encoded = b64.b64encode(img_bytes).decode("utf-8")
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

    @staticmethod
    def _upload_smms(
        img_bytes: bytes, filename: str
    ) -> str | None:
        """sm.ms (迁移至 s.ee) — 备用"""
        boundary = f"----Py{int(time.time())}"
        body = (
            f"--{boundary}\r\n"
            f'Content-Disposition: form-data; '
            f'name="smfile"; filename="{filename}"\r\n'
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

    # ── 内部：上传+发送 ───────────────────────────────────────────────────────

    def _upload_and_send(
        self,
        img_bytes: bytes,
        title: str,
        channel: dict,
        filename: str = "report.png",
    ) -> bool:
        """上传图床 → 发钉钉 Markdown；失败时做文本回退"""
        img_url = self._upload_image(img_bytes, filename)
        if img_url:
            md = f"## {title}\n\n![report]({img_url})"
            result = self._send_dingtalk(title, md, channel)
            if result.get("errcode") == 0:
                print(f"  ✅ {title}")
                return True
            print(f"  ❌ {title}: {result}")
        else:
            print(f"  ⚠️ {title} 所有图床失败")

        # 总览图文本回退
        if "overview" in filename.lower() or "Overview" in title:
            try:
                import sys  # noqa: PLC0415

                d = str(Path(__file__).resolve().parent)
                if d not in sys.path:
                    sys.path.insert(0, d)
                import dingtalk_daily as _m  # noqa: PLC0415

                role = channel.get("role", "CC")
                data = self._fetch_data(role)
                if data:
                    md_fb = _m.build_text_markdown(data)
                    self._send_dingtalk(title, md_fb, channel)
                    print(f"  ↩ {title} 文本回退")
            except Exception as e:
                print(f"  ❌ 回退失败: {e}")

        return False

    # ── 内部：钉钉签名发送 ────────────────────────────────────────────────────

    def _send_dingtalk(
        self, title: str, markdown_text: str, channel: dict
    ) -> dict:
        """钉钉加签模式发送 Markdown 消息（含"系统繁忙"自动重试）"""
        webhook: str = channel["webhook"]
        secret: str = channel["secret"]

        for attempt in range(3):  # 最多 3 次（首次 + 2 次重试）
            # 每次重试都重新生成签名（timestamp 需刷新）
            timestamp = str(int(time.time() * 1000))
            sign_str = f"{timestamp}\n{secret}"
            hmac_code = hmac.new(
                secret.encode("utf-8"),
                sign_str.encode("utf-8"),
                digestmod=hashlib.sha256,
            ).digest()
            sign = urllib.parse.quote_plus(
                base64.b64encode(hmac_code).decode("utf-8")
            )
            url = f"{webhook}&timestamp={timestamp}&sign={sign}"

            payload = json.dumps(
                {
                    "msgtype": "markdown",
                    "markdown": {"title": title, "text": markdown_text},
                },
                ensure_ascii=False,
            ).encode("utf-8")

            req = urllib.request.Request(
                url,
                data=payload,
                headers={"Content-Type": "application/json"},
                method="POST",
            )
            with urllib.request.urlopen(req, timeout=10) as resp:
                result = json.loads(resp.read().decode("utf-8"))

            errcode = result.get("errcode", 0)
            if errcode == 0:
                return result
            if errcode == -1 and attempt < 2:
                # "系统繁忙"：等 5s 后重试
                wait = 5 * (attempt + 1)
                print(f"    [重试 {attempt+1}/2] 系统繁忙，等 {wait}s...")
                time.sleep(wait)
                continue
            return result  # 非繁忙错误或重试耗尽

        return {"errcode": -1, "errmsg": "重试耗尽"}

    # ── 内部：连通测试 ────────────────────────────────────────────────────────

    def _send_test(self, channel: dict) -> None:
        """向指定通道发送连通性测试消息（泰中双语）"""
        md = (
            f"## ทดสอบระบบ / 系统连通测试\n\n"
            f"ระบบรายงานทำงานปกติ\n"
            f"报告系统运行正常\n\n"
            f"- ช่องทาง (通道): {channel.get('group_name', '?')}\n"
            f"- บทบาท (角色): {channel.get('role', '?')}\n"
            f"- กลุ่มเป้าหมาย (受众): {channel.get('audience', '?')}\n\n"
            f"> {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"
        )
        result = self._send_dingtalk("ทดสอบ / 连通测试", md, channel)
        print(f"  测试结果: {json.dumps(result, ensure_ascii=False)}")

    # ── 内部：推送日志 ────────────────────────────────────────────────────────

    def _log(
        self,
        channel_id: str,
        channel: dict,
        modules: list[str],
        results: list[dict],
    ) -> None:
        """追加一条推送记录到 output/notification-log.jsonl"""
        LOG_PATH.parent.mkdir(exist_ok=True)
        entry = json.dumps(
            {
                "ts": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
                "channel": channel_id,
                "role": channel.get("role"),
                "audience": channel.get("audience"),
                "modules": modules,
                "results": results,
            },
            ensure_ascii=False,
        )
        with open(LOG_PATH, "a") as f:
            f.write(entry + "\n")

    # ── 静态工具 ──────────────────────────────────────────────────────────────

    @staticmethod
    def _load_json(path: Path) -> dict:
        """加载 JSON 配置文件"""
        with open(path) as f:
            return json.load(f)
