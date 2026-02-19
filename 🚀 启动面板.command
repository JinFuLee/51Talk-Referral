#!/bin/bash
# ============================================
#   51Talk 转介绍数据引擎 - 启动面板
#   双击即可运行
# ============================================

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR"

# 颜色
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

# 确保虚拟环境
if [ ! -d "$DIR/venv" ]; then
    echo "📦 首次运行，创建环境..."
    python3 -m venv "$DIR/venv"
fi
source "$DIR/venv/bin/activate"
pip install -q openpyxl watchdog python-dotenv 2>/dev/null
export PYTHONPATH="$DIR/src:$PYTHONPATH"

clear
echo ""
echo -e "${BOLD}╔══════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}║     51Talk 转介绍数据引擎  🚀               ║${NC}"
echo -e "${BOLD}╚══════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  ${GREEN}[1]${NC}  📊 生成规划表（处理最新BI数据）"
echo -e "  ${GREEN}[2]${NC}  👀 监控模式（BI下载后自动生成规划表）"
echo -e "  ${GREEN}[3]${NC}  📈 生成运营分析报告（处理最新源文件）"
echo -e "  ${GREEN}[4]${NC}  🔄 监控模式（运营分析报告）"
echo ""
echo -e "  ${YELLOW}[5]${NC}  📂 打开输出目录"
echo -e "  ${YELLOW}[6]${NC}  📂 打开日志"
echo -e "  ${RED}[0]${NC}  退出"
echo ""
echo -e "${CYAN}────────────────────────────────────────────────${NC}"
echo -e "  输入目录: ~/Downloads"
echo -e "  规划表:   ~/Downloads/01_工作数据/业绩报表/"
echo -e "  分析报告: $(pwd)/output/"
echo -e "${CYAN}────────────────────────────────────────────────${NC}"
echo ""

read -p "请选择 [0-6]: " CHOICE

case $CHOICE in
    1)
        echo ""
        echo -e "${GREEN}📊 正在生成规划表...${NC}"
        echo ""
        python3 src/agents/planning_main.py --latest
        RET=$?
        if [ $RET -eq 0 ]; then
            echo ""
            echo -e "${GREEN}✅ 规划表已更新!${NC}"
            open "$HOME/Downloads/01_工作数据/业绩报表"
        else
            echo ""
            echo -e "${RED}❌ 生成失败，请检查上方错误${NC}"
        fi
        ;;
    2)
        echo ""
        echo -e "${GREEN}👀 启动规划表监控...${NC}"
        echo -e "${YELLOW}   从BI面板下载数据后将自动处理${NC}"
        echo ""
        python3 src/agents/planning_main.py --watch --polling
        ;;
    3)
        echo ""
        echo -e "${GREEN}📈 正在生成运营分析报告...${NC}"
        echo ""
        python3 src/main.py --latest
        RET=$?
        if [ $RET -eq 0 ]; then
            echo ""
            echo -e "${GREEN}✅ 报告已生成!${NC}"
            open output
        else
            echo ""
            echo -e "${RED}❌ 生成失败${NC}"
        fi
        ;;
    4)
        echo ""
        echo -e "${GREEN}🔄 启动运营分析监控...${NC}"
        echo ""
        python3 src/main.py --watch
        ;;
    5)
        open "$HOME/Downloads/01_工作数据/业绩报表"
        open output
        exit 0
        ;;
    6)
        open logs
        exit 0
        ;;
    0|"")
        echo "👋 再见"
        exit 0
        ;;
    *)
        echo -e "${RED}无效选择${NC}"
        ;;
esac

echo ""
read -p "按回车键退出..."
