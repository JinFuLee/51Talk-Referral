"""
51Talk 转介绍运营分析面板 - Streamlit 主应用
"""
import streamlit as st
import sys
from pathlib import Path
from datetime import datetime, timedelta
import json
import re

# 项目根目录
BASE_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BASE_DIR))

from src.data_processor import XlsxReader, DataProcessor
from src.analysis_engine import AnalysisEngine
from src.md_report_generator import MarkdownReportGenerator
from src.multi_source_loader import MultiSourceLoader
from src.config import get_targets, MONTHLY_TARGETS
from src.i18n import t

# 数据源注册表
DATA_SOURCES = [
    {"id": "口径对比", "dir": "转介绍不同口径对比", "name_zh": "转介绍不同口径对比", "name_th": "เปรียบเทียบช่องทางแนะนำ", "integrated": True},
    {"id": "leads明细", "dir": "转介绍leads明细表", "name_zh": "CM/EA转介绍leads明细表", "name_th": "รายละเอียด Leads แนะนำ CM/EA", "integrated": False},
    {"id": "订单明细", "dir": "实时订单明细数据", "name_zh": "实时订单明细数据", "name_th": "ข้อมูลรายละเอียดคำสั่งซื้อแบบเรียลไทม์", "integrated": False},
    {"id": "课前课后", "dir": "首次体验课课前课后跟进", "name_zh": "首次体验课课前课后跟进", "name_th": "ติดตามก่อน/หลังคลาสทดลอง", "integrated": False},
    {"id": "围场跟进", "dir": "不同围场月度付费用户跟进", "name_zh": "不同围场月度付费用户跟进", "name_th": "ติดตามผู้ชำระรายเดือนตามช่วง", "integrated": False},
    {"id": "打卡率", "dir": "当月转介绍打卡率", "name_zh": "当月转介绍打卡率", "name_th": "อัตราเช็คอินแนะนำเดือนนี้", "integrated": False},
    {"id": "leads达成", "dir": "转介绍leads达成", "name_zh": "转介绍leads达成", "name_th": "ผลสำเร็จ Leads แนะนำ", "integrated": False},
    {"id": "当月效率", "dir": "CC:CM:EA:宽口径转介绍类型-当月效率", "name_zh": "CC/CM/EA当月效率", "name_th": "ประสิทธิภาพ CC/CM/EA เดือนนี้", "integrated": False},
    {"id": "围场汇总", "dir": "本月围场数据汇总", "name_zh": "本月围场数据汇总", "name_th": "สรุปข้อมูลช่วงเดือนนี้", "integrated": False},
    {"id": "月度环比", "dir": "转介绍渠道月度环比", "name_zh": "转介绍渠道月度环比", "name_th": "เปรียบเทียบช่องทางรายเดือน", "integrated": False},
    {"id": "月度同期", "dir": "截面跟进效率月度同期", "name_zh": "截面跟进效率月度同期", "name_th": "ประสิทธิภาพติดตามรายเดือน YoY", "integrated": False},
]

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
                config = json.load(f)
                # 兼容旧配置：file_path -> input_dir
                if "file_path" in config and "input_dir" not in config:
                    config["input_dir"] = config.pop("file_path")
                return config
        except Exception:
            return {}
    return {}


def save_panel_config(config: dict):
    """保存面板配置"""
    with open(PANEL_CONFIG_FILE, 'w', encoding='utf-8') as f:
        json.dump(config, f, indent=2, ensure_ascii=False)


def extract_file_date(file_path: Path) -> datetime:
    """从文件名提取日期，如果没有则使用文件修改时间"""
    # 从文件名提取日期 _YYYYMMDD_
    match = re.search(r'_(\d{8})_', file_path.name)
    if match:
        return datetime.strptime(match.group(1), "%Y%m%d")
    # fallback: 文件修改时间
    return datetime.fromtimestamp(file_path.stat().st_mtime)


def is_t1(file_date: datetime, report_date: datetime) -> bool:
    """判断文件日期是否为 T-1"""
    t1_date = report_date - timedelta(days=1)
    return file_date.date() == t1_date.date()


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

        # 文件夹路径输入
        input_dir = st.text_input(
            t('ui', 'sidebar_input_dir', lang),
            value=saved_config.get("input_dir", str(BASE_DIR / "input")),
            help=t('ui', 'help_input_dir', lang),
        )

        # 文件上传（备用）
        uploaded_file = st.file_uploader(
            t('ui', 'sidebar_upload', lang),
            type=["xlsx"],
            help=t('ui', 'help_upload', lang),
        )

        st.divider()

        # 报告日期（需要先获取，用于数据源状态判断）
        st.header(f"📅 {t('ui', 'sidebar_report_config', lang)}")
        report_date = st.date_input(
            t('ui', 'sidebar_report_date', lang),
            value=datetime.now(),
            help=t('ui', 'help_report_date', lang),
        )

        st.divider()

        # 数据源状态区域
        input_dir_path = Path(input_dir) if input_dir else BASE_DIR / "input"

        # 统计已提供的数据源数量
        provided_count = 0
        for source in DATA_SOURCES:
            dir_path = input_dir_path / source["dir"]
            xlsx_files = list(dir_path.glob("*.xlsx")) if dir_path.exists() else []
            if xlsx_files:
                provided_count += 1

        # 数据源状态标题
        st.caption(f"── {t('ui', 'datasource_header', lang)} ({provided_count}/{len(DATA_SOURCES)}) ──")

        # 显示每个数据源的状态
        for source in DATA_SOURCES:
            dir_path = input_dir_path / source["dir"]
            name = source["name_zh"] if lang == "zh" else source["name_th"]

            # 已接入标记
            name_display = f"{name}*" if source["integrated"] else name

            # 查找文件
            xlsx_files = list(dir_path.glob("*.xlsx")) if dir_path.exists() else []

            if xlsx_files:
                file = xlsx_files[0]  # 取第一个
                file_date = extract_file_date(file)
                date_str = file_date.strftime("%Y-%m-%d")

                # 判断是否 T-1
                if is_t1(file_date, datetime.combine(report_date, datetime.min.time())):
                    st.markdown(f"✅ {name_display} :green-background[T-1 {date_str}]")
                else:
                    st.markdown(f"✅ {name_display} :red-background[{date_str}]")
            else:
                # 无文件
                no_data_text = t('ui', 'datasource_not_provided', lang)
                st.markdown(f"⬜ {name_display} :gray-background[{no_data_text}]")

        st.divider()

        # 月度目标配置
        st.header(f"📊 {t('ui', 'sidebar_targets', lang)}")

        # 选择月份
        month_options = list(MONTHLY_TARGETS.keys())
        current_month = datetime.now().strftime("%Y%m")
        default_month = current_month if current_month in month_options else month_options[-1]

        selected_month = st.selectbox(
            t('ui', 'sidebar_month', lang),
            options=month_options,
            index=month_options.index(default_month) if default_month in month_options else 0,
        )

        # 获取该月份的默认目标
        month_targets = MONTHLY_TARGETS[selected_month]

        # 目标输入
        reg_target = st.number_input(t('ui', 'sidebar_reg_target', lang), value=month_targets.get("注册目标", 869), step=10)
        paid_target = st.number_input(t('ui', 'sidebar_paid_target', lang), value=month_targets.get("付费目标", 200), step=10)
        amount_target = st.number_input(t('ui', 'sidebar_amount_target', lang), value=month_targets.get("金额目标", 169800), step=1000)
        unit_price_target = st.number_input(t('ui', 'sidebar_unit_price', lang), value=month_targets.get("客单价", 850), step=10)
        conv_rate_target = st.number_input(t('ui', 'sidebar_conv_rate', lang), value=month_targets.get("目标转化率", 0.23), step=0.01, format="%.2f")
        booking_rate_target = st.number_input(t('ui', 'sidebar_booking_rate', lang), value=month_targets.get("约课率目标", 0.77), step=0.01, format="%.2f")
        attendance_rate_target = st.number_input(t('ui', 'sidebar_attendance_rate', lang), value=month_targets.get("出席率目标", 0.66), step=0.01, format="%.2f")

        st.divider()

        # 输出路径
        st.header(f"📂 {t('ui', 'sidebar_output', lang)}")
        output_path = st.text_input(
            t('ui', 'sidebar_output_path', lang),
            value=saved_config.get("output_path", str(OUTPUT_DIR)),
            help=t('ui', 'help_output_path', lang),
        )

        st.divider()

        # 保存配置按钮
        if st.button(t('ui', 'btn_save_config', lang), use_container_width=True):
            config_to_save = {
                "input_dir": input_dir,
                "output_path": output_path,
            }
            save_panel_config(config_to_save)
            st.success(t('ui', 'msg_config_saved', lang))

        # 生成报告按钮
        generate_button = st.button(t('ui', 'btn_generate', lang), type="primary", use_container_width=True)

    # 转换 report_date 为 datetime（用于数据源状态判断）
    report_date_dt = datetime.combine(report_date, datetime.min.time())

    # 主区域
    if generate_button:
        # 确定使用的文件路径
        if uploaded_file:
            # 保存上传的文件到临时位置
            temp_file = BASE_DIR / "temp_upload.xlsx"
            with open(temp_file, 'wb') as f:
                f.write(uploaded_file.read())
            data_file_path = str(temp_file)
        else:
            # 从文件夹中自动找核心数据文件
            core_dir = Path(input_dir) / "转介绍不同口径对比"
            xlsx_files = list(core_dir.glob("*.xlsx")) if core_dir.exists() else []

            if not xlsx_files:
                st.error(t('ui', 'datasource_core_file_missing', lang))
                return

            data_file_path = str(xlsx_files[0])

        # 检查文件是否存在
        if not Path(data_file_path).exists():
            st.error(f"{t('ui', 'msg_file_not_found', lang)}: {data_file_path}")
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
        with st.spinner(t('ui', 'msg_generating', lang)):
            try:
                # 1. 读取Excel
                reader = XlsxReader(data_file_path)
                processor = DataProcessor(reader)
                processor.process()

                # 2. 加载多数据源
                multi_loader = MultiSourceLoader(input_dir)
                multi_source_data = multi_loader.load_all()

                # 3. 分析数据
                engine = AnalysisEngine(processor)

                # 获取完整目标配置（包含时间进度）
                full_targets = get_targets(report_date_dt)
                # 更新用户自定义的目标值
                full_targets.update(targets)

                analysis_result = engine.analyze(full_targets, report_date_dt, multi_source_data)

                # 4. 生成报告（传递语言参数）
                generator = MarkdownReportGenerator(analysis_result, Path(output_path), lang=lang)
                report_paths = generator.generate_both()

                st.success(t('ui', 'msg_success', lang))

                # 显示生成的文件路径
                st.info(f"{t('ui', 'info_ops_path', lang)}: {report_paths['ops']}")
                st.info(f"{t('ui', 'info_exec_path', lang)}: {report_paths['exec']}")

                # 保存分析结果到session_state
                st.session_state['analysis_result'] = analysis_result
                st.session_state['report_paths'] = report_paths

            except Exception as e:
                st.error(f"{t('ui', 'msg_error', lang)}: {str(e)}")
                import traceback
                st.code(traceback.format_exc())
                return

    # Tab 切换显示
    if 'analysis_result' in st.session_state:
        analysis_result = st.session_state['analysis_result']
        report_paths = st.session_state['report_paths']

        tabs = st.tabs([
            t('ui', 'tab_overview', lang),
            t('ui', 'tab_ops', lang),
            t('ui', 'tab_exec', lang),
            t('ui', 'tab_history', lang)
        ])

        # Tab 1: 数据概览
        with tabs[0]:
            st.header(t('ui', 'header_data_overview', lang))

            summary = analysis_result.get("summary", {})
            meta = analysis_result.get("meta", {})

            # 显示已加载的数据源数量
            multi_sources_count = len(analysis_result.get("multi_source_data", {}))
            if multi_sources_count > 0:
                st.info(f"{t('ui', 'multi_source_loaded', lang)}: **{multi_sources_count}** / {len(DATA_SOURCES)}")

            # 关键指标卡片
            col1, col2, col3, col4 = st.columns(4)

            with col1:
                paid_data = summary.get("付费", {})
                st.metric(
                    t('ui', 'metric_paid_progress', lang),
                    f"{paid_data.get('actual', 0):.0f} / {paid_data.get('target', 0):.0f}",
                    f"{paid_data.get('efficiency_progress', 0)*100:.1f}%",
                    delta_color="normal" if paid_data.get('gap', 0) > 0 else "inverse",
                )

            with col2:
                amount_data = summary.get("金额", {})
                st.metric(
                    t('ui', 'metric_amount_progress', lang),
                    f"{amount_data.get('actual', 0):,.0f}",
                    f"{amount_data.get('efficiency_progress', 0)*100:.1f}%",
                    delta_color="normal" if amount_data.get('gap', 0) > 0 else "inverse",
                )

            with col3:
                conv_data = summary.get("转化率", {})
                st.metric(
                    t('ui', 'metric_conv_rate', lang),
                    f"{conv_data.get('actual', 0)*100:.1f}%",
                    f"{t('ui', 'col_target', lang)} {conv_data.get('target', 0)*100:.0f}%",
                )

            with col4:
                time_progress = analysis_result.get("time_progress", 0.0)
                st.metric(
                    t('ui', 'metric_time_progress', lang),
                    f"{time_progress*100:.1f}%",
                    f"{meta.get('current_day', 0)}/{meta.get('days_in_month', 28)} {t('ui', 'ops_header_time_progress', lang) if lang=='zh' else 'วัน'}",
                )

            st.divider()

            # 整体进度表
            st.subheader(t('ui', 'header_progress', lang))
            progress_data = []
            for name, data in summary.items():
                progress_data.append({
                    t('ui', 'col_indicator', lang): name,
                    t('ui', 'col_actual', lang): data.get("actual", 0),
                    t('ui', 'col_target', lang): data.get("target", 0),
                    t('ui', 'col_progress', lang): f"{data.get('efficiency_progress', 0)*100:.2f}%",
                    t('ui', 'col_gap', lang): f"{data.get('gap', 0)*100:.2f}%",
                    t('ui', 'col_status', lang): data.get("status", ""),
                })

            st.dataframe(progress_data, use_container_width=True)

            st.divider()

            # 风险预警
            st.subheader(t('ui', 'header_risk', lang))
            alerts = analysis_result.get("risk_alerts", [])
            if alerts:
                for alert in alerts:
                    st.warning(f"**{alert.get('风险项')}** ({alert.get('级别')}): {alert.get('量化影响')}")
            else:
                st.success(t('ui', 'no_risk', lang))

            st.divider()

            # 渠道对比
            st.subheader(t('ui', 'header_channel', lang))
            channel_comparison = analysis_result.get("channel_comparison", {})
            channel_data = []
            for channel_name, data in channel_comparison.items():
                channel_data.append({
                    t('ui', 'col_channel', lang): channel_name,
                    t('ui', 'col_reg', lang): data.get("注册", 0),
                    t('ui', 'col_paid', lang): data.get("付费", 0),
                    t('ui', 'col_amount', lang): f"{data.get('金额', 0):,}",
                    t('ui', 'col_efficiency', lang): f"{data.get('效能指数', 0.0):.2f}×",
                    t('ui', 'col_gap_progress', lang): f"{data.get('目标缺口', 0.0)*100:.1f}%",
                })

            st.dataframe(channel_data, use_container_width=True)

        # Tab 2: 运营版预览
        with tabs[1]:
            st.header(t('ui', 'header_ops_preview', lang))

            if report_paths['ops'].exists():
                with open(report_paths['ops'], 'r', encoding='utf-8') as f:
                    ops_content = f.read()

                st.markdown(ops_content)

                # 下载按钮
                st.download_button(
                    label=t('ui', 'btn_download_ops', lang),
                    data=ops_content,
                    file_name=report_paths['ops'].name,
                    mime="text/markdown",
                )
            else:
                st.warning(t('ui', 'warn_ops_not_found', lang))

        # Tab 3: 管理层版预览
        with tabs[2]:
            st.header(t('ui', 'header_exec_preview', lang))

            if report_paths['exec'].exists():
                with open(report_paths['exec'], 'r', encoding='utf-8') as f:
                    exec_content = f.read()

                st.markdown(exec_content)

                # 下载按钮
                st.download_button(
                    label=t('ui', 'btn_download_exec', lang),
                    data=exec_content,
                    file_name=report_paths['exec'].name,
                    mime="text/markdown",
                )
            else:
                st.warning(t('ui', 'warn_exec_not_found', lang))

        # Tab 4: 历史报告
        with tabs[3]:
            st.header(t('ui', 'header_history', lang))

            output_dir_path = Path(output_path)
            if output_dir_path.exists():
                # 列出所有.md文件
                md_files = sorted(output_dir_path.glob("*.md"), key=lambda x: x.stat().st_mtime, reverse=True)

                if md_files:
                    st.write(t('ui', 'msg_history_count', lang).format(len(md_files)))

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
                                label=t('ui', 'download', lang),
                                data=content,
                                file_name=md_file.name,
                                mime="text/markdown",
                                key=md_file.name,
                            )
                else:
                    st.info(t('ui', 'msg_no_history', lang))
            else:
                st.warning(f"{t('ui', 'warn_output_dir_not_exist', lang)}: {output_path}")


if __name__ == "__main__":
    main()
