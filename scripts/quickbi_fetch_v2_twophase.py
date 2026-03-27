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


# ── 核心逻辑 ─────────────────────────────────────────────────────────────────

# 表格标题 → 在仪表板中的 caption 文本（用于定位）
# 有些表格需要先切 Tab（CC/SS/LP/区域汇关键指标）
TABLE_DEFS = [
    # (caption_search, tab_to_click, output_filename)
    # caption_search: 用 includes 匹配，切 Tab 后标题会变
    ("结果数据", None, "D1_结果数据.xlsx"),
    ("围场过程数据", None, "D4_围场过程数据_byCC.xlsx"),
    ("围场过程数据", "SS", "D4_围场过程数据_bySS.xlsx"),
    ("围场过程数据", "LP", "D4_围场过程数据_byLP.xlsx"),
    ("围场过程数据", "区域汇关键指标", "D1_区域汇关键指标.xlsx"),
    ("明细", None, "D3_明细.xlsx"),
    ("围场明细", None, "D2_围场明细.xlsx"),
    ("高潜学员", None, "D5_高潜学员.xlsx"),
]


def run_fetch(
    url: str,
    headless: bool = False,
    download_only: bool = False,
) -> list[tuple[str, Path]]:
    """两阶段取数：先创建全部任务，再一口气下载。

    阶段 1: 逐表进入自助取数 → 创建取数任务（~2 分钟）
    阶段 2: 逐表进入自助取数 → 下载最新任务（~1 分钟）

    大文件（D2 围场明细 28MB）在阶段 1 创建后，
    阶段 2 开始时已并行生成完毕，无需重试。
    """
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

        # ── 阶段 1: 创建全部任务 ─────────────────────────────────────
        if not download_only:
            log.info("━━━ 阶段 1/2: 创建取数任务 ━━━")
            created = 0
            for i, (cap, tab, _out) in enumerate(TABLE_DEFS):
                label = tab or cap
                log.info(
                    "  [%d/%d] %s",
                    i + 1, len(TABLE_DEFS), label,
                )
                if i > 0:
                    _ensure_dashboard(page, url)
                try:
                    ok = _create_task(page, url, cap, tab)
                    if ok:
                        created += 1
                        log.info("    ✓ 任务已创建")
                    else:
                        log.warning("    ✗ 创建失败")
                except Exception as e:
                    log.error("    ✗ 异常: %s", e)
                    page.screenshot(
                        path=str(PROJECT_ROOT / f"quickbi_err_{i}.png")
                    )
            log.info(
                "  ✓ 阶段 1 完成: %d/%d 任务已创建",
                created, len(TABLE_DEFS),
            )

            # 等待大文件生成（D2 围场明细 28MB 需要 ~30s）
            log.info("  等待文件生成（30s）...")
            page.wait_for_timeout(30000)

        # ── 阶段 2: 下载全部文件 ─────────────────────────────────────
        log.info("━━━ 阶段 2/2: 下载文件 ━━━")
        for i, (cap, tab, out) in enumerate(TABLE_DEFS):
            label = tab or cap
            log.info(
                "  [%d/%d] %s",
                i + 1, len(TABLE_DEFS), label,
            )
            _ensure_dashboard(page, url)
            try:
                dl_path = _download_table(page, url, cap, tab, out)
                if dl_path:
                    results.append((label, dl_path))
                    log.info("    ✓ %s", dl_path.name)
                else:
                    log.warning("    ✗ 下载失败")
            except Exception as e:
                log.error("    ✗ 异常: %s", e)
                page.screenshot(
                    path=str(PROJECT_ROOT / f"quickbi_dl_err_{i}.png")
                )

        browser.close()

    log.info("━━━ 完成: %d/%d 成功 ━━━", len(results), len(TABLE_DEFS))
    return results


def _navigate_to_selfservice(
    page, url: str, caption_text: str, tab_name: str | None,
) -> bool:
    """从仪表板导航到指定表格的自助取数页面。

    返回 True 表示成功进入自助取数页面。
    """
    # ── 切 Tab ──
    if tab_name and tab_name != "CC":
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
        page.get_by_text(tab_name, exact=True).first.click(timeout=5000)
        page.wait_for_timeout(2000)

    # ── 滚动 + 定位 caption ──
    page.evaluate(
        "() => window.scrollTo(0, document.body.scrollHeight)"
    )
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
        log.warning("    标题未找到: %s", caption_text)
        return False
    page.wait_for_timeout(1000)

    # ── Hover + 点击 ⋮ ──
    trigger_pos = page.evaluate(
        """(term) => {
        const caps = document.querySelectorAll(
            'div.caption, [class*="caption-wrapper"]'
        );
        for (const c of caps) {
            const t = c.textContent?.trim() || '';
            if (!(t.includes(term) || term.includes(t))) continue;
            const cr = c.getBoundingClientRect();
            if (cr.x < -100) continue;
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
        log.warning("    菜单触发器未找到")
        return False

    page.mouse.move(trigger_pos["x"], trigger_pos["y"] - 30)
    page.wait_for_timeout(400)
    page.mouse.move(trigger_pos["x"], trigger_pos["y"])
    page.wait_for_timeout(400)
    page.mouse.click(trigger_pos["x"], trigger_pos["y"])
    page.wait_for_timeout(1500)

    # ── 点击「自助取数」 ──
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
    page.wait_for_timeout(5000)
    return True


def _create_task(
    page, url: str, caption_text: str, tab_name: str | None,
) -> bool:
    """阶段 1: 进入自助取数 → 创建取数任务。"""
    if not _navigate_to_selfservice(page, url, caption_text, tab_name):
        return False

    create_btn = page.locator('text="创建取数任务"').first
    create_btn.click(timeout=10000)
    page.wait_for_timeout(2000)

    # 确认弹窗
    confirm = page.locator(
        'button:has-text("确定"), button:has-text("确认")'
    ).first
    try:
        if confirm.is_visible(timeout=2000):
            confirm.click()
            page.wait_for_timeout(1000)
    except Exception:
        pass

    return True


def _download_table(
    page, url: str,
    caption_text: str, tab_name: str | None, out_file: str,
) -> Path | None:
    """阶段 2: 进入自助取数 → 下载最新任务文件。"""
    if not _navigate_to_selfservice(page, url, caption_text, tab_name):
        return None

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

    # 按任务名匹配正确的下载图标（任务列表是全局共享的）
    # 任务名格式: "转介绍中台监测指标_转介绍中台检测-{表格名}"
    target_icon = None
    match_idx = page.evaluate(
        """(searchTerm) => {
        const items = document.querySelectorAll(
            '[class*="offline-task-item"],'
            + '[class*="task-item"],'
            + '[class*="TaskItem"]'
        );
        // 也试直接找包含任务文本的容器
        if (items.length === 0) {
            // fallback: 找所有包含下载图标的容器
            const icons = document.querySelectorAll('i.offline-task-icon');
            for (let i = 0; i < icons.length; i++) {
                const parent = icons[i].closest('div, li, span');
                if (!parent) continue;
                const text = parent.textContent || '';
                if (text.includes(searchTerm)) return i;
            }
            return 0; // 默认第一个
        }
        for (let i = 0; i < items.length; i++) {
            const text = items[i].textContent || '';
            if (text.includes(searchTerm)) return i;
        }
        return 0;
    }""",
        out_file.replace(".xlsx", "").replace("_", ""),
    )

    # 用 caption_text 做二次匹配
    if match_idx == 0:
        match_idx = page.evaluate(
            """(cap) => {
            const icons = document.querySelectorAll('i.offline-task-icon');
            for (let i = 0; i < icons.length; i++) {
                const p = icons[i].parentElement?.parentElement;
                if (!p) continue;
                const t = p.textContent || '';
                if (t.includes(cap)) return i;
            }
            return 0;
        }""",
            out_file.replace("D1_", "").replace(
                "D2_", ""
            ).replace("D3_", "").replace(
                "D4_", ""
            ).replace("D5_", "").replace(
                ".xlsx", ""
            ).replace("_", "-"),
        )

    for idx in range(max(0, match_idx), min(count, match_idx + 3)):
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

def post_process(results: list[tuple[str, Path]]) -> list[Path]:
    """移动下载文件到 input/，备份旧文件。"""
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

    log.info("━━━ Quick BI 自动取数 ━━━")
    log.info("URL: %s...%s", url[:50], url[-20:])
    log.info("表格: %d 个", len(TABLE_DEFS))
    log.info("模式: %s", "无头" if args.headless else "交互")

    results = run_fetch(url, args.headless, args.download_only)

    if results:
        moved = post_process(results)
        log.info("━━━ %d 个文件已移至 input/ ━━━", len(moved))
    else:
        log.warning("━━━ 无文件下载 ━━━")
        log.info("排查建议:")
        log.info("  1. uv run python scripts/quickbi_fetch.py --debug")
        log.info("  2. 检查 accessTicket 是否过期")
        log.info("  3. 查看 quickbi_err_*.png 截图")


if __name__ == "__main__":
    main()
