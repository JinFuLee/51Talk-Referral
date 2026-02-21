#!/usr/bin/env python3
"""
BI 数据自动下载器
使用 Playwright 从阿里云 Quick BI / 51talk BI 自动导出 Excel 文件

用法：
  python scripts/bi_downloader.py --setup          # 首次：打开浏览器登录，保存 session
  python scripts/bi_downloader.py --download        # 自动下载全部
  python scripts/bi_downloader.py --download --page "海外订单"  # 只下载指定看板
  python scripts/bi_downloader.py --list            # 列出所有下载任务

依赖安装：
  pip install playwright>=1.40.0
  playwright install chromium
"""

from __future__ import annotations

import argparse
import json
import shutil
import sys
import time
from datetime import datetime
from pathlib import Path

# playwright 是 runtime 依赖，延迟 import 方便 --list 不装也能用
PROJECT_ROOT = Path(__file__).resolve().parent.parent
CONFIG_PATH = Path(__file__).resolve().parent / "download_config.json"
INPUT_DIR = PROJECT_ROOT / "input"


def load_config() -> dict:
    with open(CONFIG_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def cmd_list(config: dict) -> None:
    """列出所有配置的下载任务"""
    total = 0
    for page in config["pages"]:
        url_status = "OK" if page["page_url"] != "__FILL_IN__" else "需填URL"
        print(f"\n[{page['source']}] {page['name']}  ({url_status})")
        if page["page_url"] != "__FILL_IN__":
            truncated = page["page_url"][:80]
            suffix = "..." if len(page["page_url"]) > 80 else ""
            print(f"   URL: {truncated}{suffix}")
        for t in page["tables"]:
            folder_path = INPUT_DIR / t["folder"]
            exists_tag = "[exists]" if folder_path.exists() else "[missing]"
            print(f"   {exists_tag} {t['folder']}")
            print(f"           表名: {t['table_title']}")
            total += 1
    print(f"\n共 {total} 个下载任务，分布在 {len(config['pages'])} 个看板页面")


def cmd_setup(config: dict) -> None:
    """打开浏览器让用户登录，保存 session state"""
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        print("错误: 未安装 playwright。请执行:")
        print("  pip install playwright>=1.40.0")
        print("  playwright install chromium")
        sys.exit(1)

    settings = config["settings"]
    state_dir = PROJECT_ROOT / settings["browser_data_dir"]
    state_dir.mkdir(parents=True, exist_ok=True)

    print("=" * 60)
    print("BI 登录设置")
    print("=" * 60)
    print()
    print("浏览器即将打开。请手动完成以下操作：")
    print("  1. 登录阿里云 BI (bi.aliyuncs.com)")
    print("  2. 登录 51talk BI (bi.51talk.com) — 需先连 VPN")
    print("  3. 确认两个平台都能正常访问报表")
    print("  4. 回到终端按 Enter 保存 session")
    print()

    with sync_playwright() as p:
        # 使用持久化上下文 — 自动保存 cookies/storage
        context = p.chromium.launch_persistent_context(
            user_data_dir=str(state_dir),
            headless=False,
            viewport={"width": 1440, "height": 900},
            locale="zh-CN",
            accept_downloads=True,
        )

        # 打开两个 tab 方便用户登录
        page1 = context.new_page()
        page1.goto("https://bi.aliyuncs.com")

        page2 = context.new_page()
        page2.goto("http://bi.51talk.com")

        input("\n登录完成后，按 Enter 保存 session 并关闭浏览器...")

        # 保存 storage state 作为备份（cookie + localStorage）
        context.storage_state(path=str(state_dir / "state.json"))
        context.close()

    print(f"\nSession 已保存到 {state_dir}/")
    print("下次运行 --download 将自动复用此 session")


def _hover_and_find_more_btn(page, title_locator, table_title: str):
    """
    hover 标题触发 '...' 按钮显示，然后返回按钮 locator。
    返回 None 表示找不到。
    """
    try:
        title_locator.hover()
        page.wait_for_timeout(1500)
    except Exception:
        pass

    selectors = [
        "[class*='more']",
        "[class*='ellipsis']",
        ".anticon-ellipsis",
        "[aria-label*='更多']",
        "[title*='更多']",
        "button:has-text('⋮')",
        "button:has-text('...')",
    ]
    # 用标题前缀做 near 匹配
    prefix = table_title[:10].replace("'", "\\'")
    selectors.append(f"button:near(:text('{prefix}'))")

    for selector in selectors:
        try:
            candidate = page.locator(selector).first
            if candidate.is_visible(timeout=2000):
                return candidate
        except Exception:
            continue
    return None


def _find_and_click_export(
    page, table_title: str, tab: str | None, timeout_ms: int
) -> None:
    """
    在 Quick BI 页面上找到指定表格的 '...' 菜单，点击导出。

    Quick BI 的表格结构：
    - 每个图表/表格有一个标题区域，通常在 .bi-chart-title 或类似元素内
    - 标题附近有 '...' (更多) 按钮
    - 点击后弹出菜单：小Q解读 / 自助取数 / 导出 / 刷新数据 / 全屏
    - 点击导出后弹出 dialog：文件格式(EXCEL) / 交叉表数据类型 / 确定
    """

    # Step 1: 切换 tab（如果配置了）
    if tab:
        try:
            tab_el = page.locator(f"text={tab}").first
            if tab_el.is_visible(timeout=5000):
                tab_el.click()
                page.wait_for_timeout(2000)
        except Exception:
            print(f"    [warn] 未找到 tab '{tab}'，继续尝试")

    # Step 2: 滚动到标题可见
    title_locator = page.locator(f"text='{table_title}'").first
    matched_by = "exact"
    try:
        title_locator.scroll_into_view_if_needed(timeout=timeout_ms)
        page.wait_for_timeout(1000)
    except Exception:
        # 模糊匹配：取最后一个 _ 分隔符后的关键词
        keyword = table_title.split("_")[-1] if "_" in table_title else table_title
        print(f"    [warn] 精确标题未找到，模糊匹配关键词: '{keyword}'")
        title_locator = page.locator(f"text=/{keyword}/i").first
        matched_by = "fuzzy"
        try:
            title_locator.scroll_into_view_if_needed(timeout=timeout_ms)
            page.wait_for_timeout(1000)
        except Exception as e:
            raise RuntimeError(
                f"找不到表格标题 '{table_title}'（精确+模糊均失败）: {e}"
            )

    # Step 3: 在父容器中找 '...' 按钮
    # Quick BI 常见容器 class 包含 chart / widget / bi-
    more_btn = None
    try:
        chart_container = title_locator.locator(
            "xpath=ancestor::*[contains(@class,'chart') "
            "or contains(@class,'widget') "
            "or contains(@class,'bi-')]"
        ).first

        container_selectors = [
            "button:has-text('⋮')",
            "[class*='more']",
            "[class*='ellipsis']",
            ".anticon-ellipsis",
            "[aria-label*='更多']",
            "[title*='更多']",
            "svg[class*='icon']",
        ]
        for selector in container_selectors:
            try:
                candidate = chart_container.locator(selector).first
                if candidate.is_visible(timeout=2000):
                    more_btn = candidate
                    break
            except Exception:
                continue
    except Exception:
        pass

    # Step 4: 如果容器策略失败，hover 触发
    if not more_btn:
        more_btn = _hover_and_find_more_btn(page, title_locator, table_title)

    if not more_btn:
        raise RuntimeError(
            f"找不到表格 '{table_title}' 的更多菜单按钮（已尝试容器查找和 hover 触发）"
        )

    # Step 5: 点击 '...' 按钮，打开菜单
    more_btn.click()
    page.wait_for_timeout(1000)

    # Step 6: 点击菜单中的 '导出'
    export_item = page.locator("text='导出'").first
    export_item.click(timeout=5000)
    page.wait_for_timeout(1500)

    # Step 7: 导出 dialog 确认
    # Quick BI 默认已选 EXCEL + 带格式 + 本地下载，直接点确定
    confirm_btn = (
        page.locator("text='确 定'")
        .or_(page.locator("text='确定'"))
        .first
    )
    confirm_btn.click(timeout=5000)


def _find_and_click_export_51talk(
    page, table_title: str, timeout_ms: int
) -> None:
    """
    51talk BI 的导出流程。
    内部 BI 系统 UI 与 Quick BI 类似，复用相同策略；
    如实际 UI 有差异，可在此处单独调整。
    """
    _find_and_click_export(page, table_title, tab=None, timeout_ms=timeout_ms)


def cmd_download(config: dict, page_filter: str | None = None) -> None:
    """自动下载所有配置的表格"""
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        print("错误: 未安装 playwright。请执行:")
        print("  pip install playwright>=1.40.0")
        print("  playwright install chromium")
        sys.exit(1)

    settings = config["settings"]
    state_dir = PROJECT_ROOT / settings["browser_data_dir"]

    # 检查 session 是否存在
    has_persistent = (state_dir / "Default").exists()
    has_state_json = (state_dir / "state.json").exists()
    if not has_persistent and not has_state_json:
        print("错误: 未找到保存的 session，请先运行:")
        print("  python scripts/bi_downloader.py --setup")
        sys.exit(1)

    # 筛选看板
    pages_to_download = config["pages"]
    if page_filter:
        pages_to_download = [
            p for p in pages_to_download if page_filter in p["name"]
        ]
        if not pages_to_download:
            print(f"错误: 未找到匹配 '{page_filter}' 的看板")
            print("可用看板：")
            for p in config["pages"]:
                print(f"  - {p['name']}")
            sys.exit(1)

    # 过滤掉未填 URL 的看板
    skipped = [p for p in pages_to_download if p["page_url"] == "__FILL_IN__"]
    if skipped:
        names = ", ".join(s["name"] for s in skipped)
        print(f"[skip] 跳过 {len(skipped)} 个未配置 URL 的看板: {names}")
        pages_to_download = [
            p for p in pages_to_download if p["page_url"] != "__FILL_IN__"
        ]

    total_tables = sum(len(p["tables"]) for p in pages_to_download)
    if total_tables == 0:
        print("没有可下载的任务。请先在 download_config.json 中填入 page_url")
        sys.exit(1)

    print(f"\n开始下载 {total_tables} 个表格（{len(pages_to_download)} 个看板）")
    print(f"下载目录: {INPUT_DIR}")
    print()

    downloaded = 0
    failed: list[str] = []
    download_tmp = PROJECT_ROOT / "_downloads_tmp"
    download_tmp.mkdir(exist_ok=True)

    with sync_playwright() as p:
        context = p.chromium.launch_persistent_context(
            user_data_dir=str(state_dir),
            headless=settings.get("headless", False),
            viewport={"width": 1440, "height": 900},
            locale="zh-CN",
            accept_downloads=True,
            downloads_path=str(download_tmp),
        )

        for page_cfg in pages_to_download:
            print(f"\n[看板] {page_cfg['name']}")
            url_preview = page_cfg["page_url"][:80]
            suffix = "..." if len(page_cfg["page_url"]) > 80 else ""
            print(f"  URL: {url_preview}{suffix}")

            page = context.new_page()
            try:
                page.goto(
                    page_cfg["page_url"],
                    wait_until="networkidle",
                    timeout=60000,
                )
                page.wait_for_timeout(3000)  # 等待图表渲染完成
            except Exception as e:
                print(f"  [error] 页面加载失败: {e}")
                failed.extend(t["folder"] for t in page_cfg["tables"])
                page.close()
                continue

            for table_cfg in page_cfg["tables"]:
                folder_name = table_cfg["folder"]
                table_title = table_cfg["table_title"]
                tab = table_cfg.get("tab")

                print(f"\n  [download] {folder_name}")
                print(f"    表名: {table_title}")
                if tab:
                    print(f"    Tab:  {tab}")

                target_dir = INPUT_DIR / folder_name
                target_dir.mkdir(parents=True, exist_ok=True)

                try:
                    timeout_total = settings["timeout_ms"] + 30000
                    with page.expect_download(timeout=timeout_total) as dl_info:
                        if page_cfg["source"] == "51talk_bi":
                            _find_and_click_export_51talk(
                                page, table_title, settings["timeout_ms"]
                            )
                        else:
                            _find_and_click_export(
                                page, table_title, tab, settings["timeout_ms"]
                            )

                    download = dl_info.value
                    dl_path = download.path()
                    if dl_path:
                        dest = target_dir / download.suggested_filename
                        shutil.move(str(dl_path), str(dest))
                        print(f"    [ok] 已保存: {dest.name}")
                        downloaded += 1
                    else:
                        print("    [error] 下载路径为空（文件未生成）")
                        failed.append(folder_name)

                except Exception as e:
                    print(f"    [error] {e}")
                    failed.append(folder_name)

                # 下载间隔，避免触发频率限制
                delay = settings.get("delay_between_downloads_ms", 3000)
                page.wait_for_timeout(delay)

            page.close()

        context.close()

    # 清理临时下载目录
    if download_tmp.exists():
        shutil.rmtree(download_tmp, ignore_errors=True)

    # 汇总报告
    print("\n" + "=" * 60)
    print(f"下载完成: {downloaded}/{total_tables} 成功")
    if failed:
        print(f"失败 ({len(failed)}):")
        for f in failed:
            print(f"  - {f}")
    else:
        print("全部成功")
    print("=" * 60)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="BI 数据自动下载器",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
  python scripts/bi_downloader.py --setup
  python scripts/bi_downloader.py --download
  python scripts/bi_downloader.py --download --page "海外订单"
  python scripts/bi_downloader.py --list
        """,
    )
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument(
        "--setup", action="store_true", help="打开浏览器登录，保存 session"
    )
    group.add_argument(
        "--download", action="store_true", help="自动下载全部（或 --page 指定看板）"
    )
    group.add_argument(
        "--list", action="store_true", help="列出所有下载任务"
    )
    parser.add_argument(
        "--page",
        type=str,
        default=None,
        help="仅下载名称包含此字符串的看板（配合 --download 使用）",
    )
    args = parser.parse_args()

    # --page 只能和 --download 配合使用
    if args.page and not args.download:
        parser.error("--page 只能与 --download 配合使用")

    config = load_config()

    if args.list:
        cmd_list(config)
    elif args.setup:
        cmd_setup(config)
    elif args.download:
        cmd_download(config, page_filter=args.page)


if __name__ == "__main__":
    main()
