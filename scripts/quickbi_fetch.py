"""Quick BI 自动取数脚本 — Playwright 全自动化

流程：
  1. 打开 Quick BI 仪表板（token3rd 免登 URL）
  2. 逐个表格：hover → 点击 ⋮ → 自助取数 → 创建取数任务 → 等待完成 → 下载
  3. 将下载的 Excel 移动到 input/ 并重命名

用法：
  uv run python scripts/quickbi_fetch.py                   # 交互模式（能看到浏览器）
  uv run python scripts/quickbi_fetch.py --headless        # 无头模式
  uv run python scripts/quickbi_fetch.py --url '新URL'     # 更新 URL 并执行
  uv run python scripts/quickbi_fetch.py --download-only   # 仅下载最新已完成任务
  uv run python scripts/quickbi_fetch.py --debug           # 调试：只打开页面不操作

配置文件：config/quickbi_source.json
"""

from __future__ import annotations

import argparse
import json
import logging
import shutil
import sys
import time
from datetime import datetime
from pathlib import Path

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("quickbi")

PROJECT_ROOT = Path(__file__).resolve().parent.parent
CONFIG_PATH = PROJECT_ROOT / "config" / "quickbi_source.json"
INPUT_DIR = PROJECT_ROOT / "input"
DOWNLOAD_TMP = PROJECT_ROOT / ".quickbi_downloads"


# ── 配置 ─────────────────────────────────────────────────────────────────────

def load_config() -> dict:
    if not CONFIG_PATH.exists():
        log.error("配置文件不存在: %s", CONFIG_PATH)
        sys.exit(1)
    with open(CONFIG_PATH) as f:
        return json.load(f)


def save_config(cfg: dict) -> None:
    with open(CONFIG_PATH, "w") as f:
        json.dump(cfg, f, ensure_ascii=False, indent=2)


# ── 告警 ─────────────────────────────────────────────────────────────────────

NOTIFY_CONFIG = PROJECT_ROOT / "config" / "quickbi_notify.json"


def _alert_failed_sources(failed_files: list[str]) -> None:
    """部分数据源下载失败时发送钉钉告警（2026-03-31 新增永久防线）。"""
    import base64
    import hashlib
    import hmac
    import urllib.parse
    import urllib.request

    if not NOTIFY_CONFIG.exists():
        log.warning("  告警配置不存在: %s，跳过告警", NOTIFY_CONFIG)
        return

    try:
        with open(NOTIFY_CONFIG) as f:
            notify_cfg = json.load(f)
        webhook = notify_cfg["dingtalk_webhook"]
        secret = notify_cfg["dingtalk_secret"]
    except (KeyError, json.JSONDecodeError) as e:
        log.warning("  告警配置读取失败: %s", e)
        return

    # 签名
    timestamp = str(int(time.time() * 1000))
    string_to_sign = f"{timestamp}\n{secret}"
    hmac_code = hmac.new(
        secret.encode("utf-8"),
        string_to_sign.encode("utf-8"),
        digestmod=hashlib.sha256,
    ).digest()
    sign = urllib.parse.quote_plus(base64.b64encode(hmac_code).decode("utf-8"))
    signed_url = f"{webhook}&timestamp={timestamp}&sign={sign}"

    # 消息内容
    failed_list = "\n".join(f"- {f}" for f in failed_files)
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M")
    text = (
        f"### ⚠️ Quick BI 部分数据源下载失败\n\n"
        f"**时间**: {now_str}\n\n"
        f"**成功**: {len(TABLE_DEFS) - len(failed_files)}/{len(TABLE_DEFS)}\n\n"
        f"**失败源**:\n{failed_list}\n\n"
        f"**已自动重试 2 轮仍失败**\n\n"
        f"**操作**: 检查 Quick BI 仪表板对应 Tab 是否正常"
    )

    payload = json.dumps(
        {"msgtype": "markdown", "markdown": {"title": "Quick BI 部分取数失败", "text": text}},
        ensure_ascii=False,
    ).encode("utf-8")

    try:
        req = urllib.request.Request(
            signed_url, data=payload,
            headers={"Content-Type": "application/json"}, method="POST",
        )
        with urllib.request.urlopen(req, timeout=10) as resp:
            result = json.loads(resp.read().decode("utf-8"))
            if result.get("errcode") == 0:
                log.info("  📢 钉钉告警已发送（%d 个失败源）", len(failed_files))
            else:
                log.warning("  钉钉告警失败: %s", result)
    except Exception as e:
        log.warning("  钉钉告警发送异常: %s", e)


# ── 数据新鲜度检测 ────────────────────────────────────────────────────────────


def _detect_stale_sources() -> list[int]:
    """检测 DATA_SOURCE_DIR 中日期落后于今天的数据源。

    返回 TABLE_DEFS 中需要补抓的索引列表。
    """
    import os
    import re

    data_source_dir = os.environ.get("DATA_SOURCE_DIR", "")
    if not data_source_dir:
        data_source_dir = str(Path.home() / "Desktop" / "转介绍中台监测指标")
    ds_path = Path(data_source_dir)
    if not ds_path.exists():
        log.warning("  DATA_SOURCE_DIR 不存在: %s", ds_path)
        return list(range(len(TABLE_DEFS)))

    today_str = datetime.now().strftime("%Y%m%d")

    # 每个 TABLE_DEF 对应的 glob 匹配关键词
    source_patterns = [
        ("*结果数据*.xlsx", None),                         # D1
        ("*围场过程数据*byCC*.xlsx", "副本"),               # D2 (排除副本)
        ("*围场过程数据*bySS*.xlsx", None),                 # D2-SS
        ("*围场过程数据*byLP*.xlsx", None),                 # D2-LP
        ("*围场过程数据*byCC副本*.xlsx", None),              # D2b
        ("*明细*.xlsx", "围场"),                            # D3 (排除围场)
        ("*已付费学员转介绍围场明细*.xlsx", None),            # D4
        ("*高潜学员*.xlsx", None),                          # D5
    ]

    stale_indices = []
    for i, (pattern, exclude_keyword) in enumerate(source_patterns):
        files = sorted(
            [f for f in ds_path.glob(pattern)
             if not f.name.startswith(".")
             and (exclude_keyword is None or exclude_keyword not in f.name)],
            key=lambda p: p.name,
            reverse=True,
        )
        if not files:
            log.info("  [%d] %s: 无文件 → 需补抓", i, TABLE_DEFS[i][2])
            stale_indices.append(i)
            continue

        latest = files[0]
        m = re.search(r"(\d{8})", latest.name)
        if m and m.group(1) == today_str:
            log.info("  [%d] %s: ✓ 今日数据", i, TABLE_DEFS[i][2])
        else:
            date_str = m.group(1) if m else "未知"
            log.info(
                "  [%d] %s: 日期 %s → 需补抓",
                i, TABLE_DEFS[i][2], date_str,
            )
            stale_indices.append(i)

    return stale_indices


# ── 核心逻辑 ─────────────────────────────────────────────────────────────────

# 表格标题 → 在仪表板中的 caption 文本（用于定位）
# 有些表格需要先切 Tab（CC/SS/LP/区域汇关键指标）
TABLE_DEFS = [
    # (caption_search, tab_to_click, output_filename)
    # output_filename 必须匹配 DataManager._DATA_SOURCE_META 的 glob pattern
    # pattern 参考: backend/core/data_manager.py L33-116
    ("结果数据", None, "转介绍中台检测_结果数据.xlsx"),
    ("围场过程数据", None, "转介绍中台检测_围场过程数据_byCC.xlsx"),
    ("围场过程数据", "SS", "转介绍中台检测_围场过程数据_bySS.xlsx"),
    ("围场过程数据", "LP", "转介绍中台检测_围场过程数据_byLP.xlsx"),
    ("围场过程数据", "区域汇关键指标", "区域汇_围场过程数据_byCC副本.xlsx"),
    ("明细", None, "转介绍中台检测_明细.xlsx"),
    ("围场明细", None, "已付费学员转介绍围场明细.xlsx"),
    ("高潜学员", None, "转介绍中台监测_高潜学员.xlsx"),
]


def run_fetch(
    url: str,
    headless: bool = False,
    download_only: bool = False,
) -> tuple[list[tuple[str, Path]], list[str]]:
    """执行完整取数流程。返回 (成功列表, 失败文件名列表)。"""
    from playwright.sync_api import sync_playwright

    DOWNLOAD_TMP.mkdir(exist_ok=True)
    results: list[tuple[str, Path]] = []

    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=headless,
            slow_mo=200 if not headless else 50,
        )
        context = browser.new_context(
            viewport={"width": 1440, "height": 4000},
            accept_downloads=True,
            locale="zh-CN",
        )
        page = context.new_page()

        # ── 加载仪表板 ────────────────────────────────────────────────
        log.info("打开仪表板...")
        page.goto(url, wait_until="domcontentloaded", timeout=30000)
        page.wait_for_timeout(6000)
        log.info("✓ 仪表板加载完成")

        # ── 逐个表格处理 ──────────────────────────────────────────────
        for i, (caption_text, tab_name, out_file) in enumerate(TABLE_DEFS):
            label = tab_name or caption_text
            log.info(
                "━━━ [%d/%d] %s ━━━",
                i + 1, len(TABLE_DEFS), label,
            )

            # 每个表格前确保回到仪表板
            if i > 0:
                _ensure_dashboard(page, url)

            try:
                dl_path = _fetch_one_table(
                    page, url, caption_text, tab_name,
                    out_file, download_only,
                )
                if dl_path:
                    results.append((label, dl_path))
                    log.info("  ✓ 下载成功: %s", dl_path.name)
                else:
                    log.warning("  ✗ 下载失败")
            except Exception as e:
                log.error("  ✗ 异常: %s", e)
                page.screenshot(
                    path=str(PROJECT_ROOT / f"quickbi_err_{i}.png")
                )

        # ── 失败源自动重试（最多 2 轮，每轮刷新页面）──────────────
        succeeded_files = {Path(p).name for _, p in results}
        failed_defs = [
            (i, d) for i, d in enumerate(TABLE_DEFS)
            if d[2] not in succeeded_files
        ]

        if failed_defs and not download_only:
            for retry_round in range(1, 3):  # 最多重试 2 轮
                if not failed_defs:
                    break
                log.warning(
                    "━━━ 重试第 %d 轮: %d 个失败源 ━━━",
                    retry_round, len(failed_defs),
                )
                # 刷新页面以获得干净状态
                page.goto(url, wait_until="domcontentloaded", timeout=30000)
                page.wait_for_timeout(8000)  # 更长等待确保完全加载

                still_failed = []
                for orig_idx, (cap, tab, out_f) in failed_defs:
                    label = tab or cap
                    log.info("  重试 [%s] (原 #%d)", label, orig_idx + 1)
                    _ensure_dashboard(page, url)
                    try:
                        dl_path = _fetch_one_table(
                            page, url, cap, tab, out_f, download_only,
                        )
                        if dl_path:
                            results.append((label, dl_path))
                            log.info("  ✓ 重试成功: %s", dl_path.name)
                        else:
                            still_failed.append((orig_idx, (cap, tab, out_f)))
                            log.warning("  ✗ 重试仍失败: %s", label)
                    except Exception as e:
                        still_failed.append((orig_idx, (cap, tab, out_f)))
                        log.error("  ✗ 重试异常: %s", e)
                failed_defs = still_failed

        browser.close()

    log.info("━━━ 完成: %d/%d 成功 ━━━", len(results), len(TABLE_DEFS))

    # 返回失败源列表供告警使用
    final_failed = [d[2] for _, d in failed_defs] if failed_defs else []
    if final_failed:
        log.error("━━━ 最终失败源: %s ━━━", ", ".join(final_failed))

    return results, final_failed


def _fetch_one_table(
    page,
    dashboard_url: str,
    caption_text: str,
    tab_name: str | None,
    out_file: str,
    download_only: bool,
) -> Path | None:
    """处理单个表格的完整取数流程。"""

    # ── 0. 确保在仪表板页面 ──
    if "token3rd/dashboard" not in page.url:
        page.goto(
            dashboard_url,
            wait_until="domcontentloaded",
            timeout=30000,
        )
        page.wait_for_timeout(5000)

    # ── 1. 如果需要切 Tab（SS/LP/区域） ──
    if tab_name and tab_name != "CC":
        log.info("  切换 Tab: %s", tab_name)
        page.evaluate("""() => {
            const tabs = document.querySelectorAll(
                '[class*="tab"], [role="tab"]'
            );
            for (const t of tabs) {
                t.scrollIntoView({block: 'center'});
                break;
            }
        }""")
        page.wait_for_timeout(500)
        tab_btn = page.get_by_text(tab_name, exact=True).first
        tab_btn.click(timeout=5000)
        # 区域汇关键指标 tab 渲染较慢，需要更长等待（2026-03-31 修复 D2b 日期滞后）
        wait_ms = 5000 if "区域" in (tab_name or "") else 3000
        page.wait_for_timeout(wait_ms)

    # ── 2. 定位表格 widget 并滚动到可见 ──
    log.info("  定位表格: %s", caption_text[:40])

    # 先滚动到页面底部再回来，确保所有 widget 加载
    page.evaluate("() => window.scrollTo(0, document.body.scrollHeight)")
    page.wait_for_timeout(1500)
    page.evaluate("() => window.scrollTo(0, 0)")
    page.wait_for_timeout(500)

    scrolled = page.evaluate(
        """(term) => {
        const caps = document.querySelectorAll(
            'div.caption, [class*="caption-wrapper"]'
        );
        for (const c of caps) {
            const t = c.textContent?.trim() || '';
            if (!(t.includes(term) || term.includes(t))) continue;
            // 只选可见的（x > 0，排除 Tab 切换后隐藏的 widget）
            const r = c.getBoundingClientRect();
            if (r.x < -100) continue;
            c.scrollIntoView({block: 'center'});
            return true;
        }
        return false;
    }""",
        caption_text,
    )
    if not scrolled:
        log.warning("  标题未找到: %s", caption_text)
        return None
    page.wait_for_timeout(1000)

    # ── 3. Hover widget → force click ⋮ ──
    log.info("  hover + 点击菜单 ⋮...")
    trigger_pos = page.evaluate(
        """(term) => {
        const caps = document.querySelectorAll(
            'div.caption, [class*="caption-wrapper"]'
        );
        for (const c of caps) {
            const t = c.textContent?.trim() || '';
            if (!(t.includes(term) || term.includes(t))) continue;
            const cr = c.getBoundingClientRect();
            if (cr.x < -100) continue; // 跳过隐藏的
            let w = c.parentElement;
            for (let i = 0; i < 15 && w; i++) {
                const tr = w.querySelector('i.ant-dropdown-trigger');
                if (tr) {
                    const r = tr.getBoundingClientRect();
                    if (r.x > 0) {
                        return {x: r.x+r.width/2, y: r.y+r.height/2};
                    }
                }
                w = w.parentElement;
            }
        }
        return null;
    }""",
        caption_text,
    )
    if not trigger_pos:
        log.warning("  菜单触发器未找到")
        return None

    # hover 激活 card-menu-hide → 点击
    page.mouse.move(trigger_pos["x"], trigger_pos["y"] - 30)
    page.wait_for_timeout(400)
    page.mouse.move(trigger_pos["x"], trigger_pos["y"])
    page.wait_for_timeout(400)
    page.mouse.click(trigger_pos["x"], trigger_pos["y"])
    page.wait_for_timeout(1500)

    # ── 4. 点击「自助取数」 ──
    log.info("  点击「自助取数」...")
    # antd dropdown portal: 试多个选择器
    for selector in [
        'span.control-menu-item:has-text("自助取数")',
        '.ant-dropdown-menu-item:has-text("自助取数")',
        'li:has-text("自助取数")',
    ]:
        loc = page.locator(selector).first
        try:
            if loc.is_visible(timeout=2000):
                loc.click()
                break
        except Exception:
            continue
    else:
        # 最后 fallback: JS 点击
        page.evaluate("""() => {
            const all = document.querySelectorAll('*');
            for (const el of all) {
                if (el.textContent?.trim() === '自助取数'
                    && el.offsetHeight > 0
                    && el.children.length <= 2) {
                    el.click();
                    return true;
                }
            }
            return false;
        }""")
    log.info("  等待自助取数页面...")
    page.wait_for_timeout(5000)
    log.info("  自助取数页面已加载")

    if download_only:
        return _download_latest(page, out_file)

    # ── 5. 创建取数任务 ──
    log.info("  点击「创建取数任务」...")
    create_btn = page.locator('text="创建取数任务"').first
    create_btn.click()
    page.wait_for_timeout(3000)

    # 可能弹出确认
    confirm = page.locator('button:has-text("确定"), button:has-text("确认")').first
    if confirm.is_visible():
        confirm.click()
        page.wait_for_timeout(2000)

    # ── 6. 等待任务完成 ──
    log.info("  等待任务完成...")
    for attempt in range(30):
        page.wait_for_timeout(2000)
        # 检查第一个任务是否有绿色 ✅ 图标
        status = page.evaluate("""() => {
            const items = document.querySelectorAll('[class*="task-item"], [class*="offline-task"]');
            if (items.length === 0) return 'no-items';
            const first = items[0];
            if (first.querySelector('.anticon-check-circle, [class*="success"], [style*="green"]')) return 'done';
            if (first.querySelector('.anticon-loading, [class*="loading"]')) return 'loading';
            // 检查 SVG fill
            const svgs = first.querySelectorAll('svg');
            for (const s of svgs) {
                if (s.getAttribute('fill') === '#52c41a' || s.querySelector('[fill="#52c41a"]')) return 'done';
            }
            return 'unknown';
        }""")
        if status == "done":
            log.info("  ✓ 任务完成（第 %d 次检查）", attempt + 1)
            # 等待文件生成完毕
            page.wait_for_timeout(3000)
            break
        if attempt % 5 == 0 and attempt > 0:
            log.info("  ... 等待中（状态: %s）", status)
    else:
        log.warning("  超时，尝试下载最新任务...")

    # ── 7. 下载 ──
    return _download_latest(page, out_file)


def _download_latest(page, out_file: str) -> Path | None:
    """下载任务列表中最新的文件。"""
    log.info("  下载文件...")

    # Quick BI 下载图标: i.offline-task-icon.common-download-outlined
    # 任务面板中第 1 个（nth=1，nth=0 是底部其他区域的按钮）
    # 等待任务面板渲染
    page.wait_for_timeout(2000)

    # 用 Playwright locator 直接定位（比 JS 坐标更稳定）
    dl_icons = page.locator("i.offline-task-icon")
    count = dl_icons.count()
    log.info("  找到 %d 个下载图标", count)

    if count < 1:
        log.warning("  未找到下载图标")
        page.screenshot(
            path=str(PROJECT_ROOT / f"quickbi_dl_debug_{out_file}.png")
        )
        _go_back_to_dashboard(page)
        return None

    # 点击第一个可见的下载图标（跳过 index=0 如果不可见）
    target_icon = None
    for idx in range(min(count, 5)):
        icon = dl_icons.nth(idx)
        if icon.is_visible():
            box = icon.bounding_box()
            if box and box["y"] > 100 and box["y"] < 3900:
                target_icon = icon
                log.info(
                    "  使用下载图标 #%d (y=%.0f)",
                    idx,
                    box["y"],
                )
                break

    if not target_icon:
        log.warning("  无可见下载图标")
        page.screenshot(
            path=str(PROJECT_ROOT / f"quickbi_dl_debug_{out_file}.png")
        )
        _go_back_to_dashboard(page)
        return None

    # 重试下载（大文件任务生成需要时间）
    for attempt in range(3):
        try:
            with page.expect_download(timeout=60000) as dl_info:
                target_icon.click(force=True)
            download = dl_info.value
            save_path = DOWNLOAD_TMP / out_file
            download.save_as(str(save_path))
            log.info(
                "  ✓ 已保存: %s (%s)",
                save_path.name, _fmt_size(save_path),
            )
            _go_back_to_dashboard(page)
            return save_path
        except Exception:
            if attempt < 2:
                wait = (attempt + 1) * 15
                log.info(
                    "  文件生成中，等待 %ds 后重试 (%d/3)...",
                    wait, attempt + 2,
                )
                page.wait_for_timeout(wait * 1000)
            else:
                log.warning("  3 次下载均超时")
                page.screenshot(
                    path=str(
                        PROJECT_ROOT / f"quickbi_dl_timeout_{out_file}.png"
                    )
                )
                _go_back_to_dashboard(page)
                return None


def _ensure_dashboard(page, url: str) -> None:
    """确保回到仪表板页面并滚动到顶部。"""
    # 如果还在自助取数页面，先退出
    exit_btn = page.locator('text="退出取数"').first
    try:
        if exit_btn.is_visible(timeout=2000):
            exit_btn.click()
            page.wait_for_timeout(3000)
            return
    except Exception:
        pass
    # 直接重新加载仪表板（最可靠）
    page.goto(url, wait_until="domcontentloaded", timeout=30000)
    page.wait_for_timeout(5000)


def _go_back_to_dashboard(page) -> None:
    """返回仪表板。"""
    # 查找"退出取数"按钮
    exit_btn = page.locator('text="退出取数"').first
    if exit_btn.is_visible():
        exit_btn.click()
        page.wait_for_timeout(3000)
        return

    try:
        page.go_back(wait_until="domcontentloaded", timeout=10000)
        page.wait_for_timeout(3000)
    except Exception:
        pass


def _fmt_size(p: Path) -> str:
    s = p.stat().st_size
    if s < 1024:
        return f"{s}B"
    elif s < 1024 * 1024:
        return f"{s / 1024:.1f}KB"
    return f"{s / 1024 / 1024:.1f}MB"


# ── 后处理 ───────────────────────────────────────────────────────────────────

def _sync_to_data_source_dir(moved: list[Path]) -> None:
    """将 input/ 中的新文件同步到 DATA_SOURCE_DIR（后端数据读取目录）。

    文件命名遵循 DATA_SOURCE_DIR 的约定：
      转介绍中台监测指标_{原文件名去扩展名}_{YYYYMMDD}_{HH_MM_00}.xlsx
    这样 DataManager 的 glob pattern 能正确匹配并按文件名倒序选最新。
    """
    import os

    data_source_dir = os.environ.get("DATA_SOURCE_DIR", "")
    if not data_source_dir:
        data_source_dir = str(
            Path.home() / "Desktop" / "转介绍中台监测指标"
        )
    ds_path = Path(data_source_dir)
    if not ds_path.exists():
        log.warning("  DATA_SOURCE_DIR 不存在: %s，跳过同步", ds_path)
        return

    ts = datetime.now().strftime("%Y%m%d_%H_%M_00")
    synced = 0
    for src in moved:
        stem = src.stem  # e.g. 转介绍中台检测_结果数据
        dest_name = f"转介绍中台监测指标_{stem}_{ts}.xlsx"
        dest = ds_path / dest_name
        shutil.copy2(str(src), str(dest))
        synced += 1

    if synced:
        log.info("  📤 同步 %d 个文件到 DATA_SOURCE_DIR", synced)

    # 清理旧文件：每个 pattern 保留最新 2 个，超 7 天的删除
    _cleanup_old_data_source_files(ds_path)


def _cleanup_old_data_source_files(
    ds_path: Path, keep: int = 2, max_age_days: int = 7
) -> None:
    """清理 DATA_SOURCE_DIR 中的旧数据文件。

    每个数据源 pattern 保留最新 keep 个文件，
    并删除超过 max_age_days 天的旧文件。
    """
    import time

    now = time.time()
    cutoff = now - max_age_days * 86400

    # 8 个数据源 pattern 关键词（与 DataManager._DATA_SOURCE_META 对应）
    patterns = [
        "*结果数据*.xlsx",
        "*围场过程数据*byCC副本*.xlsx",
        "*围场过程数据*byCC*.xlsx",
        "*围场过程数据*bySS*.xlsx",
        "*围场过程数据*byLP*.xlsx",
        "*明细*.xlsx",
        "*已付费学员转介绍围场明细*.xlsx",
        "*高潜学员*.xlsx",
    ]

    total_deleted = 0
    for pattern in patterns:
        matched = sorted(
            ds_path.glob(pattern), key=lambda p: p.stat().st_mtime, reverse=True
        )
        for i, f in enumerate(matched):
            if i < keep:
                continue  # 保留最新 keep 个
            if f.stat().st_mtime < cutoff:
                log.info("  🗑️  清理旧文件: %s", f.name)
                f.unlink()
                total_deleted += 1

    if total_deleted:
        log.info("  清理完成: 删除 %d 个旧数据文件", total_deleted)


def post_process(results: list[tuple[str, Path]]) -> list[Path]:
    """移动下载文件到 input/，备份旧文件，同步到 DATA_SOURCE_DIR。"""
    INPUT_DIR.mkdir(exist_ok=True)
    today = datetime.now().strftime("%Y%m%d")
    moved: list[Path] = []

    for label, src in results:
        dest = INPUT_DIR / src.name
        if dest.exists():
            backup = INPUT_DIR / f".backup_{today}_{src.name}"
            shutil.move(str(dest), str(backup))

        shutil.move(str(src), str(dest))
        moved.append(dest)
        log.info("  📁 %s → input/%s", label, src.name)

    # 同步到 DATA_SOURCE_DIR（后端读取目录）
    _sync_to_data_source_dir(moved)

    # 清理临时目录
    if DOWNLOAD_TMP.exists():
        for f in DOWNLOAD_TMP.iterdir():
            if f.is_file():
                f.unlink()

    return moved


# ── 入口 ─────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Quick BI 自动取数")
    parser.add_argument("--url", help="更新仪表板 URL")
    parser.add_argument("--headless", action="store_true", help="无头模式")
    parser.add_argument("--download-only", action="store_true", help="仅下载最新任务")
    parser.add_argument("--debug", action="store_true", help="调试模式")
    parser.add_argument(
        "--catchup", action="store_true",
        help="补抓模式：检查 DATA_SOURCE_DIR 中日期落后的数据源，仅重新获取落后源",
    )
    args = parser.parse_args()

    cfg = load_config()

    if args.url:
        cfg["dashboard_url"] = args.url
        save_config(cfg)
        log.info("✓ URL 已更新")

    url = cfg["dashboard_url"]

    if args.debug:
        from playwright.sync_api import sync_playwright

        with sync_playwright() as p:
            b = p.chromium.launch(headless=False)
            pg = b.new_page(viewport={"width": 1440, "height": 900})
            pg.goto(url, wait_until="domcontentloaded", timeout=30000)
            log.info("调试模式 — Ctrl+C 退出")
            try:
                while True:
                    time.sleep(1)
            except KeyboardInterrupt:
                pass
            b.close()
        return

    # ── 补抓模式：只获取日期落后的数据源 ──
    if args.catchup:
        stale_indices = _detect_stale_sources()
        if not stale_indices:
            log.info("━━━ 所有数据源均为最新，无需补抓 ━━━")
            return
        log.info("━━━ 补抓模式: %d 个落后源 ━━━", len(stale_indices))
        # 只获取落后的源
        original_table_defs = TABLE_DEFS.copy()
        stale_defs = [TABLE_DEFS[i] for i in stale_indices]
        # 临时替换 TABLE_DEFS 仅获取落后源
        TABLE_DEFS.clear()
        TABLE_DEFS.extend(stale_defs)
        results, failed_sources = run_fetch(url, headless=True, download_only=False)
        TABLE_DEFS.clear()
        TABLE_DEFS.extend(original_table_defs)
    else:
        log.info("━━━ Quick BI 自动取数 ━━━")
        log.info("URL: %s...%s", url[:50], url[-20:])
        log.info("表格: %d 个", len(TABLE_DEFS))
        log.info("模式: %s", "无头" if args.headless else "交互")
        results, failed_sources = run_fetch(url, args.headless, args.download_only)

    if results:
        moved = post_process(results)
        log.info("━━━ %d 个文件已移至 input/ ━━━", len(moved))
    else:
        log.warning("━━━ 无文件下载 ━━━")
        log.info("排查建议:")
        log.info("  1. uv run python scripts/quickbi_fetch.py --debug")
        log.info("  2. 检查 accessTicket 是否过期")
        log.info("  3. 查看 quickbi_err_*.png 截图")

    # ── 失败源钉钉告警（2026-03-31 新增，永久防线）──────────────────
    if failed_sources:
        _alert_failed_sources(failed_sources)


if __name__ == "__main__":
    main()
