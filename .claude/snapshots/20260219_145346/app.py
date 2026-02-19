"""
51Talk 转介绍运营分析面板 - Streamlit 主应用
"""
import streamlit as st
import sys
from pathlib import Path
from datetime import datetime, timedelta
import json

# 项目根目录
BASE_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BASE_DIR))

from src.data_processor import XlsxReader, DataProcessor
from src.analysis_engine import AnalysisEngine
from src.md_report_generator import MarkdownReportGenerator
from src.config import get_targets, MONTHLY_TARGETS
from src.i18n import t

# 页面配置
st.set_page_config(
    page_title="51Talk 转介绍运营分析面板",
    page_icon="📊",
    layout="wide",
)

# 配置文件路径
CONFIG_DIR = BASE_DIR / "config"
CONFIG_DIR.mkdir(parents=True, exist_ok=True)
PANEL_CONFIG_FILE = CONFIG_DIR / "panel_config.json"

# 输出目录
OUTPUT_DIR = BASE_DIR / "output"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


def load_panel_config() -> dict:
    """加载面板配置"""
    if PANEL_CONFIG_FILE.exists():
        try:
            with open(PANEL_CONFIG_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception:
            return {}
    return {}


def save_panel_config(config: dict):
    """保存面板配置"""
    with open(PANEL_CONFIG_FILE, 'w', encoding='utf-8') as f:
        json.dump(config, f, indent=2, ensure_ascii=False)


def main():
    """主应用"""
    # 初始化 session_state
    if "lang" not in st.session_state:
        st.session_state["lang"] = "zh"

    # 语言切换（放在最上方）
    lang_options = {"🇨🇳 中文": "zh", "🇹🇭 ภาษาไทย": "th"}
    selected_lang_label = st.radio(
        "",
        options=list(lang_options.keys()),
        horizontal=True,
        key="lang_switcher"
    )
    lang = lang_options[selected_lang_label]
    st.session_state["lang"] = lang

    st.title(f"{t('ui', 'app_icon', lang)} 51Talk {t('ui', 'app_title', lang)}")

    # 加载上次配置
    saved_config = load_panel_config()

    # 侧边栏 - 数据输入和配置
    with st.sidebar:
        st.header(f"📁 {t('ui', 'sidebar_data_input', lang)}")

        # 文件路径输入
        file_path = st.text_input(
            t('ui', 'sidebar_file_path', lang),
            value=saved_config.get("file_path", ""),
            help=t('ui', 'help_file_path', lang),
        )

        # 文件上传（备用）
        uploaded_file = st.file_uploader(
            t('ui', 'sidebar_upload', lang),
            type=["xlsx"],
            help=t('ui', 'help_upload', lang),
        )

        st.divider()

        # 报告日期
        st.header(f"📅 {t('ui', 'sidebar_report_config', lang)}")
        report_date = st.date_input(
            t('ui', 'sidebar_report_date', lang),
            value=datetime.now(),
            help=t('ui', 'help_report_date', lang),
        )

        st.divider()

        # 月度目标配置
        st.header(f"📊 {t('ui', 'sidebar_targets', lang)}")

        # 选择月份
        month_options = list(MONTHLY_TARGETS.keys())
        current_month = datetime.now().strftime("%Y%m")
        default_month = current_month if current_month in month_options else month_options[-1]

        selected_month = st.selectbox(
            "选择月份",
            options=month_options,
            index=month_options.index(default_month) if default_month in month_options else 0,
        )

        # 获取该月份的默认目标
        month_targets = MONTHLY_TARGETS[selected_month]

        # 目标输入
        reg_target = st.number_input("注册目标", value=month_targets.get("注册目标", 869), step=10)
        paid_target = st.number_input("付费目标", value=month_targets.get("付费目标", 200), step=10)
        amount_target = st.number_input("金额目标 ($)", value=month_targets.get("金额目标", 169800), step=1000)
        unit_price_target = st.number_input("客单价 ($)", value=month_targets.get("客单价", 850), step=10)
        conv_rate_target = st.number_input("转化率目标", value=month_targets.get("目标转化率", 0.23), step=0.01, format="%.2f")
        booking_rate_target = st.number_input("约课率目标", value=month_targets.get("约课率目标", 0.77), step=0.01, format="%.2f")
        attendance_rate_target = st.number_input("出席率目标", value=month_targets.get("出席率目标", 0.66), step=0.01, format="%.2f")

        st.divider()

        # 输出路径
        st.header("📂 输出配置")
        output_path = st.text_input(
            "输出路径",
            value=saved_config.get("output_path", str(OUTPUT_DIR)),
            help="Markdown 报告输出目录",
        )

        st.divider()

        # 保存配置按钮
        if st.button("💾 保存配置", use_container_width=True):
            config_to_save = {
                "file_path": file_path,
                "output_path": output_path,
            }
            save_panel_config(config_to_save)
            st.success("配置已保存！")

        # 生成报告按钮
        generate_button = st.button("🚀 生成报告", type="primary", use_container_width=True)

    # 主区域
    if generate_button:
        # 验证输入
        if not file_path and not uploaded_file:
            st.error("请输入文件路径或上传文件！")
            return

        # 确定使用的文件路径
        if uploaded_file:
            # 保存上传的文件到临时位置
            temp_file = BASE_DIR / "temp_upload.xlsx"
            with open(temp_file, 'wb') as f:
                f.write(uploaded_file.read())
            data_file_path = str(temp_file)
        else:
            data_file_path = file_path

        # 检查文件是否存在
        if not Path(data_file_path).exists():
            st.error(f"文件不存在: {data_file_path}")
            return

        # 构建目标配置
        targets = {
            "注册目标": reg_target,
            "付费目标": paid_target,
            "金额目标": amount_target,
            "客单价": unit_price_target,
            "目标转化率": conv_rate_target,
            "约课率目标": booking_rate_target,
            "出席率目标": attendance_rate_target,
        }

        # 处理数据
        with st.spinner("正在处理数据..."):
            try:
                # 1. 读取Excel
                reader = XlsxReader(data_file_path)
                processor = DataProcessor(reader)
                processor.process()

                # 2. 分析数据
                engine = AnalysisEngine(processor)
                report_date_dt = datetime.combine(report_date, datetime.min.time())

                # 获取完整目标配置（包含时间进度）
                full_targets = get_targets(report_date_dt)
                # 更新用户自定义的目标值
                full_targets.update(targets)

                analysis_result = engine.analyze(full_targets, report_date_dt)

                # 3. 生成报告
                generator = MarkdownReportGenerator(analysis_result, Path(output_path))
                report_paths = generator.generate_both()

                st.success("✅ 报告生成成功！")

                # 显示生成的文件路径
                st.info(f"运营版报告: {report_paths['ops']}")
                st.info(f"管理层版报告: {report_paths['exec']}")

                # 保存分析结果到session_state
                st.session_state['analysis_result'] = analysis_result
                st.session_state['report_paths'] = report_paths

            except Exception as e:
                st.error(f"处理出错: {str(e)}")
                import traceback
                st.code(traceback.format_exc())
                return

    # Tab 切换显示
    if 'analysis_result' in st.session_state:
        analysis_result = st.session_state['analysis_result']
        report_paths = st.session_state['report_paths']

        tabs = st.tabs(["📊 数据概览", "📝 运营版预览", "📈 管理层版预览", "📁 历史报告"])

        # Tab 1: 数据概览
        with tabs[0]:
            st.header("数据概览")

            summary = analysis_result.get("summary", {})
            meta = analysis_result.get("meta", {})

            # 关键指标卡片
            col1, col2, col3, col4 = st.columns(4)

            with col1:
                paid_data = summary.get("付费", {})
                st.metric(
                    "付费进度",
                    f"{paid_data.get('actual', 0):.0f} / {paid_data.get('target', 0):.0f}",
                    f"{paid_data.get('efficiency_progress', 0)*100:.1f}%",
                    delta_color="normal" if paid_data.get('gap', 0) > 0 else "inverse",
                )

            with col2:
                amount_data = summary.get("金额", {})
                st.metric(
                    "金额进度 ($)",
                    f"{amount_data.get('actual', 0):,.0f}",
                    f"{amount_data.get('efficiency_progress', 0)*100:.1f}%",
                    delta_color="normal" if amount_data.get('gap', 0) > 0 else "inverse",
                )

            with col3:
                conv_data = summary.get("转化率", {})
                st.metric(
                    "转化率",
                    f"{conv_data.get('actual', 0)*100:.1f}%",
                    f"目标 {conv_data.get('target', 0)*100:.0f}%",
                )

            with col4:
                time_progress = analysis_result.get("time_progress", 0.0)
                st.metric(
                    "时间进度",
                    f"{time_progress*100:.1f}%",
                    f"{meta.get('current_day', 0)}/{meta.get('days_in_month', 28)} 天",
                )

            st.divider()

            # 整体进度表
            st.subheader("整体进度看板")
            progress_data = []
            for name, data in summary.items():
                progress_data.append({
                    "指标": name,
                    "已完成": data.get("actual", 0),
                    "月目标": data.get("target", 0),
                    "效率进度": f"{data.get('efficiency_progress', 0)*100:.2f}%",
                    "目标缺口": f"{data.get('gap', 0)*100:.2f}%",
                    "状态": data.get("status", ""),
                })

            st.dataframe(progress_data, use_container_width=True)

            st.divider()

            # 风险预警
            st.subheader("风险预警")
            alerts = analysis_result.get("risk_alerts", [])
            if alerts:
                for alert in alerts:
                    st.warning(f"**{alert.get('风险项')}** ({alert.get('级别')}): {alert.get('量化影响')}")
            else:
                st.success("当前无高风险预警项")

            st.divider()

            # 渠道对比
            st.subheader("渠道效能对比")
            channel_comparison = analysis_result.get("channel_comparison", {})
            channel_data = []
            for channel_name, data in channel_comparison.items():
                channel_data.append({
                    "口径": channel_name,
                    "注册": data.get("注册", 0),
                    "付费": data.get("付费", 0),
                    "金额 ($)": f"{data.get('金额', 0):,}",
                    "效能指数": f"{data.get('效能指数', 0.0):.2f}×",
                    "进度缺口": f"{data.get('目标缺口', 0.0)*100:.1f}%",
                })

            st.dataframe(channel_data, use_container_width=True)

        # Tab 2: 运营版预览
        with tabs[1]:
            st.header("运营版报告预览")

            if report_paths['ops'].exists():
                with open(report_paths['ops'], 'r', encoding='utf-8') as f:
                    ops_content = f.read()

                st.markdown(ops_content)

                # 下载按钮
                st.download_button(
                    label="📥 下载运营版报告",
                    data=ops_content,
                    file_name=report_paths['ops'].name,
                    mime="text/markdown",
                )
            else:
                st.warning("运营版报告文件未找到")

        # Tab 3: 管理层版预览
        with tabs[2]:
            st.header("管理层版报告预览")

            if report_paths['exec'].exists():
                with open(report_paths['exec'], 'r', encoding='utf-8') as f:
                    exec_content = f.read()

                st.markdown(exec_content)

                # 下载按钮
                st.download_button(
                    label="📥 下载管理层版报告",
                    data=exec_content,
                    file_name=report_paths['exec'].name,
                    mime="text/markdown",
                )
            else:
                st.warning("管理层版报告文件未找到")

        # Tab 4: 历史报告
        with tabs[3]:
            st.header("历史报告")

            output_dir_path = Path(output_path)
            if output_dir_path.exists():
                # 列出所有.md文件
                md_files = sorted(output_dir_path.glob("*.md"), key=lambda x: x.stat().st_mtime, reverse=True)

                if md_files:
                    st.write(f"共找到 {len(md_files)} 个历史报告：")

                    for md_file in md_files:
                        col1, col2, col3 = st.columns([3, 1, 1])
                        with col1:
                            st.text(md_file.name)
                        with col2:
                            mod_time = datetime.fromtimestamp(md_file.stat().st_mtime)
                            st.text(mod_time.strftime("%Y-%m-%d %H:%M"))
                        with col3:
                            with open(md_file, 'r', encoding='utf-8') as f:
                                content = f.read()
                            st.download_button(
                                label="下载",
                                data=content,
                                file_name=md_file.name,
                                mime="text/markdown",
                                key=md_file.name,
                            )
                else:
                    st.info("暂无历史报告")
            else:
                st.warning(f"输出目录不存在: {output_path}")


if __name__ == "__main__":
    main()
