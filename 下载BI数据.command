#!/bin/bash
# ==============================================================================
# 51Talk BI 数据自动下载器
# ==============================================================================
cd "$(dirname "$0")" || { echo "切换目录失败，请把此脚本放到项目根目录"; exit 1; }

# ── ANSI 颜色系统 ──────────────────────────────────────────────────────────
C_BLUE='\033[1;36m'
C_GREEN='\033[1;32m'
C_RED='\033[1;31m'
C_YELLOW='\033[1;33m'
C_RESET='\033[0m'

ok()   { printf "${C_GREEN}[ OK ]${C_RESET} %s\n" "$*"; }
fail() { printf "${C_RED}[ FAIL ]${C_RESET} %s\n" "$*"; }
info() { printf "${C_BLUE}[ INFO ]${C_RESET} %s\n" "$*"; }
warn() { printf "${C_YELLOW}[ WARN ]${C_RESET} %s\n" "$*"; }

# ── 标题 ───────────────────────────────────────────────────────────────────
clear
echo -e "${C_BLUE}======================================================================${C_RESET}"
echo -e "${C_BLUE}                   51Talk BI 数据自动下载器                          ${C_RESET}"
echo -e "${C_BLUE}                   (Playwright 无头浏览器驱动)                       ${C_RESET}"
echo -e "${C_BLUE}======================================================================${C_RESET}"
echo ""

# ── 环境检查 ──────────────────────────────────────────────────────────────

info "检查运行环境..."

# 检查 python3
if ! command -v python3 &>/dev/null; then
    fail "Python 3 未安装，请通过 Homebrew 安装：brew install python3"
    exit 1
fi
ok "Python 3 已就绪 ($(python3 -c 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}")'))"

# 确定使用哪个 python 和 pip
if [ -d "venv" ] && [ -f "venv/bin/python" ]; then
    PYTHON="venv/bin/python"
    PIP="venv/bin/pip"
    ok "虚拟环境 venv 已就绪，将优先使用 venv"
else
    PYTHON="python3"
    PIP="pip3"
    warn "未检测到 venv，将使用系统 python3（建议先创建 venv）"
fi

# 检查 playwright 是否安装
if ! $PYTHON -c "import playwright" &>/dev/null 2>&1; then
    warn "未检测到 playwright，正在自动安装..."
    $PIP install -q "playwright>=1.40.0"
    if [ $? -ne 0 ]; then
        fail "playwright 安装失败，请手动运行：$PIP install playwright>=1.40.0"
        exit 1
    fi
    ok "playwright 安装完成"
    info "正在安装 Chromium 浏览器内核..."
    $PYTHON -m playwright install chromium
    if [ $? -ne 0 ]; then
        fail "Chromium 安装失败，请手动运行：$PYTHON -m playwright install chromium"
        exit 1
    fi
    ok "Chromium 已就绪"
else
    ok "playwright 已安装"
fi

# 检查 bi_downloader.py 脚本是否存在
if [ ! -f "scripts/bi_downloader.py" ]; then
    fail "未找到 scripts/bi_downloader.py，请确认脚本文件已创建"
    exit 1
fi

# 检查 session 是否存在（用于下载前提示）
SESSION_DIR=".playwright-session/Default"
session_exists() {
    [ -d "$SESSION_DIR" ] && [ "$(ls -A "$SESSION_DIR" 2>/dev/null)" ]
}

echo ""
echo -e "${C_BLUE}----------------------------------------------------------------------${C_RESET}"

# ── 交互菜单 ──────────────────────────────────────────────────────────────

show_menu() {
    echo ""
    echo -e "${C_BLUE}  请选择操作：${C_RESET}"
    echo ""
    echo -e "  ${C_GREEN}[1]${C_RESET} 首次设置（登录并保存 session）"
    echo -e "  ${C_GREEN}[2]${C_RESET} 一键下载全部（34 张表）"
    echo -e "  ${C_GREEN}[3]${C_RESET} 只下载指定看板"
    echo -e "  ${C_GREEN}[4]${C_RESET} 查看任务列表"
    echo -e "  ${C_RED}[0]${C_RESET} 退出"
    echo ""
}

while true; do
    show_menu
    printf "  请输入选项编号："
    read -r CHOICE

    case "$CHOICE" in
        1)
            echo ""
            info "启动首次设置流程，浏览器将自动打开，请在页面中完成登录..."
            $PYTHON scripts/bi_downloader.py --setup
            if [ $? -eq 0 ]; then
                ok "设置完成，session 已保存"
            else
                fail "设置过程中出现错误，请重试"
            fi
            ;;

        2)
            echo ""
            if ! session_exists; then
                warn "未检测到已保存的登录 session（$SESSION_DIR）"
                warn "请先选择 [1] 首次设置完成登录，再进行下载"
                continue
            fi
            info "开始下载全部 34 张表，请稍候..."
            $PYTHON scripts/bi_downloader.py --download
            if [ $? -eq 0 ]; then
                ok "全部数据下载完成，文件已保存到 input/ 目录"
            else
                fail "下载过程中出现错误，请查看上方日志"
            fi
            ;;

        3)
            echo ""
            if ! session_exists; then
                warn "未检测到已保存的登录 session（$SESSION_DIR）"
                warn "请先选择 [1] 首次设置完成登录，再进行下载"
                continue
            fi
            info "正在获取可用看板列表..."
            $PYTHON scripts/bi_downloader.py --list
            echo ""
            printf "  请输入看板名称（精确匹配，例如：CC日报看板）：\n  > "
            read -r PAGE_NAME
            if [ -z "$PAGE_NAME" ]; then
                warn "看板名称不能为空，已取消"
                continue
            fi
            info "正在下载看板：$PAGE_NAME ..."
            $PYTHON scripts/bi_downloader.py --download --page "$PAGE_NAME"
            if [ $? -eq 0 ]; then
                ok "看板「$PAGE_NAME」下载完成"
            else
                fail "下载失败，请确认看板名称是否正确"
            fi
            ;;

        4)
            echo ""
            info "获取任务列表..."
            $PYTHON scripts/bi_downloader.py --list
            ;;

        0)
            echo ""
            ok "已退出，期待下次使用。"
            exit 0
            ;;

        *)
            warn "无效选项「$CHOICE」，请输入 0-4 之间的数字"
            ;;
    esac

    echo ""
    echo -e "${C_BLUE}----------------------------------------------------------------------${C_RESET}"
done
