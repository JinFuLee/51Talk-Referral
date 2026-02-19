"""
51Talk 转介绍运营分析面板 - Streamlit 主应用
"""
import streamlit as st
import sys
from pathlib import Path
from datetime import datetime, timedelta
from dateutil.relativedelta import relativedelta
import json
import re
import altair as alt

# 项目根目录
BASE_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BASE_DIR))

from src.data_processor import XlsxReader, DataProcessor, validate_data_format
from src.analysis_engine import AnalysisEngine
from src.md_report_generator import MarkdownReportGenerator
from src.multi_source_loader import MultiSourceLoader
from src.config import get_targets, MONTHLY_TARGETS, format_currency
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


# format_amount 已废弃，使用 config.format_currency() 替代
# 保留别名以兼容旧代码
format_amount = format_currency


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


def render_markdown_with_charts(content: str):
    """渲染 Markdown 内容，将 Mermaid 代码块转为原生 Streamlit 图表"""
    import pandas as pd

    # 按 mermaid 代码块分割
    parts = re.split(r'```mermaid\n(.*?)```', content, flags=re.DOTALL)

    for i, part in enumerate(parts):
        if i % 2 == 0:
            # 普通 markdown 文本
            text = part.strip()
            if text:
                st.markdown(text)
        else:
            # Mermaid 代码块内容
            mermaid_code = part.strip()
            _render_mermaid_as_native(mermaid_code)


def _render_mermaid_as_native(code: str):
    """将单个 Mermaid 图表转为原生 Streamlit 图表"""
    # 移除 init 配置行
    code = re.sub(r'%%\{.*?\}%%\n?', '', code).strip()

    if code.startswith('xychart-beta'):
        _render_xychart(code)
    elif code.startswith('pie'):
        _render_pie(code)
    elif code.startswith('flowchart'):
        _render_flowchart(code)
    else:
        st.code(code, language="mermaid")


def _render_xychart(code: str):
    """xychart-beta → altair 柱状+折线组合图"""
    import pandas as pd

    title_match = re.search(r'title\s+"([^"]+)"', code)
    title = title_match.group(1) if title_match else ""

    x_match = re.search(r'x-axis\s+\[([^\]]+)\]', code)
    if not x_match:
        st.code(code, language="mermaid")
        return
    categories = [c.strip().strip('"') for c in x_match.group(1).split(',')]

    y_match = re.search(r'y-axis\s+"([^"]+)"', code)
    y_label = y_match.group(1) if y_match else ""

    bar_matches = re.findall(r'bar\s+\[([^\]]+)\]', code)
    line_matches = re.findall(r'line\s+\[([^\]]+)\]', code)

    layers = []
    LINE_COLORS = ['#5B8FF9', '#FF6B6B', '#5AD8A6', '#F6BD16', '#E86452']

    # 渲染所有 bar 数据
    for idx, bar_str in enumerate(bar_matches):
        bar_values = [float(v.strip()) for v in bar_str.split(',')]
        bar_df = pd.DataFrame({'category': categories, 'value': bar_values})
        bar_chart = alt.Chart(bar_df).mark_bar(
            color='#5B8FF9', cornerRadiusTopLeft=3, cornerRadiusTopRight=3, opacity=0.85
        ).encode(
            x=alt.X('category:N', sort=categories, title=None, axis=alt.Axis(labelAngle=0)),
            y=alt.Y('value:Q', title=y_label),
            tooltip=['category:N', alt.Tooltip('value:Q', format='.1f')]
        )
        layers.append(bar_chart)

    # 渲染所有 line 数据
    for idx, line_str in enumerate(line_matches):
        line_values = [float(v.strip()) for v in line_str.split(',')]
        color = LINE_COLORS[idx % len(LINE_COLORS)]
        line_df = pd.DataFrame({'category': categories, 'value': line_values})

        # 判断是否为基准线（全同值）
        if len(set(line_values)) == 1:
            rule = alt.Chart(pd.DataFrame({'value': [line_values[0]]})).mark_rule(
                color=color, strokeWidth=2, strokeDash=[6, 4]
            ).encode(y='value:Q')
            layers.append(rule)
        else:
            line_chart = alt.Chart(line_df).mark_line(
                color=color, strokeWidth=2, point=alt.OverlayMarkDef(size=40, filled=True, color=color)
            ).encode(
                x=alt.X('category:N', sort=categories, title=None),
                y=alt.Y('value:Q', title=y_label),
                tooltip=['category:N', alt.Tooltip('value:Q', format='.1f')]
            )
            layers.append(line_chart)

    if layers:
        chart = alt.layer(*layers).properties(
            title=title, height=300
        ).configure_title(fontSize=14, anchor='start')
        st.altair_chart(chart, use_container_width=True)
    else:
        st.code(code, language="mermaid")


def _render_pie(code: str):
    """pie → altair 饼图"""
    import pandas as pd

    title_match = re.search(r'pie\s+title\s+(.+)', code)
    title = title_match.group(1).strip() if title_match else ""

    entries = re.findall(r'"([^"]+)"\s*:\s*([\d.]+)', code)
    if not entries:
        st.code(code, language="mermaid")
        return

    labels = [e[0] for e in entries]
    values = [float(e[1]) for e in entries]
    df = pd.DataFrame({'label': labels, 'value': values})

    chart = alt.Chart(df).mark_arc(innerRadius=40, outerRadius=120).encode(
        theta=alt.Theta('value:Q'),
        color=alt.Color('label:N',
            scale=alt.Scale(range=['#5B8FF9', '#5AD8A6', '#F6BD16', '#E86452', '#6DC8EC']),
            legend=alt.Legend(title=None)),
        tooltip=['label:N', alt.Tooltip('value:Q', format=',.0f')]
    ).properties(title=title, height=300
    ).configure_title(fontSize=14, anchor='start')

    st.altair_chart(chart, use_container_width=True)


def _render_flowchart(code: str):
    """flowchart (漏斗对比) → altair 分组柱状图"""
    import pandas as pd

    # 解析 subgraph 结构
    subgraph_pattern = r'subgraph\s+(.+?)\n(.*?)end'
    subgraphs = re.findall(subgraph_pattern, code, re.DOTALL)

    if not subgraphs:
        st.code(code, language="mermaid")
        return

    rows = []
    for channel_name, body in subgraphs:
        channel_name = channel_name.strip()
        # 解析节点: A1["注册 137"] 或 B1["预约 99"]
        nodes = re.findall(r'\w+\["([^"]+?)"\]', body)
        for node_text in nodes:
            # "注册 137" → stage="注册", value=137
            parts = node_text.rsplit(' ', 1)
            if len(parts) == 2:
                stage = parts[0]
                try:
                    value = float(parts[1])
                    rows.append({'channel': channel_name, 'stage': stage, 'value': value})
                except ValueError:
                    pass

    if not rows:
        st.code(code, language="mermaid")
        return

    df = pd.DataFrame(rows)
    # 保持漏斗顺序
    stage_order = list(dict.fromkeys(r['stage'] for r in rows))

    chart = alt.Chart(df).mark_bar(
        cornerRadiusTopLeft=3, cornerRadiusTopRight=3
    ).encode(
        x=alt.X('stage:N', sort=stage_order, title=None, axis=alt.Axis(labelAngle=0)),
        y=alt.Y('value:Q', title=None),
        color=alt.Color('channel:N',
            scale=alt.Scale(range=['#5B8FF9', '#5AD8A6', '#F6BD16']),
            legend=alt.Legend(title=None, orient='top')),
        xOffset='channel:N',
        tooltip=['channel:N', 'stage:N', alt.Tooltip('value:Q', format=',.0f')]
    ).properties(height=320
    ).configure_title(fontSize=14, anchor='start')

    st.altair_chart(chart, use_container_width=True)


def main():
    """主应用"""
    # 从配置文件加载语言偏好
    saved_config = load_panel_config()
    saved_lang = saved_config.get("lang", "zh")

    # 初始化 session_state
    if "lang" not in st.session_state:
        st.session_state["lang"] = saved_lang

    # 语言切换（放在最上方）
    lang_options = {"🇨🇳 中文": "zh", "🇹🇭 ภาษาไทย": "th"}
    # 根据 session_state 中的 lang 设置默认选项
    default_index = 0 if st.session_state["lang"] == "zh" else 1
    selected_lang_label = st.radio(
        "",
        options=list(lang_options.keys()),
        index=default_index,
        horizontal=True,
        key="lang_switcher"
    )
    lang = lang_options[selected_lang_label]

    # 如果语言发生变化，保存到配置文件
    if lang != st.session_state["lang"]:
        st.session_state["lang"] = lang
        config_to_save = load_panel_config()
        config_to_save["lang"] = lang
        save_panel_config(config_to_save)

    # 角色选择器（语言切换后）
    saved_role = saved_config.get("role", "ops")
    if "role" not in st.session_state:
        st.session_state["role"] = saved_role

    role_options = {
        f"👥 {t('ui', 'role_ops', lang)}": "ops",
        f"👔 {t('ui', 'role_exec', lang)}": "exec",
        f"💰 {t('ui', 'role_finance', lang)}": "finance"
    }
    role_index = list(role_options.values()).index(st.session_state["role"])
    selected_role_label = st.radio(
        "",
        options=list(role_options.keys()),
        index=role_index,
        horizontal=True,
        key="role_switcher"
    )
    role = role_options[selected_role_label]

    # 如果角色发生变化，保存到 session_state 和配置文件
    if role != st.session_state["role"]:
        st.session_state["role"] = role
        config_to_save = load_panel_config()
        config_to_save["role"] = role
        save_panel_config(config_to_save)

    # 角色权限配置
    st.markdown(f"**{t('ui', 'role_config', lang)}**")

    # 加载已保存的权限配置
    role_permissions_config = saved_config.get("role_permissions", {})

    # 默认权限预设
    default_permissions = {
        "ops": ["overview", "ops", "exec", "history"],
        "exec": ["overview", "exec", "history"],
        "finance": ["overview", "history"]
    }

    # 获取当前角色的默认权限
    current_default = default_permissions.get(role, ["overview", "history"])

    # 如果没有保存过配置，使用默认值
    saved_role_perms = role_permissions_config.get(role, current_default)

    # 全部可选 Tab
    all_tabs = {
        "overview": f"📊 {t('ui', 'tab_overview', lang)}",
        "ops": f"📝 {t('ui', 'tab_ops', lang)}",
        "exec": f"📈 {t('ui', 'tab_exec', lang)}",
        "history": f"📁 {t('ui', 'tab_history', lang)}"
    }

    # multiselect 选择器
    selected_tabs = st.multiselect(
        t('ui', 'role_tabs', lang),
        options=list(all_tabs.keys()),
        default=saved_role_perms,
        format_func=lambda x: all_tabs[x],
        help=t('ui', 'role_permission_hint', lang)
    )

    # 保存到配置文件（实时保存）
    if selected_tabs != saved_role_perms:
        config_to_save = load_panel_config()
        if "role_permissions" not in config_to_save:
            config_to_save["role_permissions"] = {}
        config_to_save["role_permissions"][role] = selected_tabs
        save_panel_config(config_to_save)

    st.title(f"{t('ui', 'app_icon', lang)} 51Talk {t('ui', 'app_title', lang)}")

    # 快速入门引导（首次使用检测）
    is_first_time = not PANEL_CONFIG_FILE.exists()
    if is_first_time:
        with st.expander(f"🚀 {t('ui', 'welcome_title', lang)}", expanded=True):
            st.markdown(f"**{t('ui', 'welcome_subtitle', lang)}**")
            st.markdown(f"**{t('ui', 'guide_step1', lang)}**")
            st.info(t('ui', 'guide_step1_desc', lang))
            st.markdown(f"**{t('ui', 'guide_step2', lang)}**")
            st.info(t('ui', 'guide_step2_desc', lang))
            st.markdown(f"**{t('ui', 'guide_step3', lang)}**")
            st.info(t('ui', 'guide_step3_desc', lang))

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

        # 汇率配置
        st.header(f"💱 {t('ui', 'sidebar_exchange_rate', lang)}")
        usd_thb_rate = st.number_input(
            "USD → THB",
            min_value=1.0,
            max_value=100.0,
            value=32.0,
            step=0.5,
            key="usd_thb_rate"
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

        # 功能依赖映射（数据源 ID -> 功能名称）
        feature_dependencies = {
            "打卡率": "参与行为分析" if lang == "zh" else "วิเคราะห์พฤติกรรม",
            "围场汇总": "围场生命周期" if lang == "zh" else "วงจรชีวิตช่วง",
            "leads达成": "Leads 漏斗对标" if lang == "zh" else "Leads Funnel",
        }

        # 显示每个数据源的状态
        for source in DATA_SOURCES:
            dir_path = input_dir_path / source["dir"]
            name = source["name_zh"] if lang == "zh" else source["name_th"]

            # 已接入标记
            name_display = f"{name}*" if source["integrated"] else name

            # 功能依赖提示
            feature_hint = ""
            if source["id"] in feature_dependencies:
                feature_hint = f" → {feature_dependencies[source['id']]}"

            # 查找文件
            xlsx_files = list(dir_path.glob("*.xlsx")) if dir_path.exists() else []

            if xlsx_files:
                file = xlsx_files[0]  # 取第一个
                file_date = extract_file_date(file)
                date_str = file_date.strftime("%Y-%m-%d")

                # 判断是否 T-1
                if is_t1(file_date, datetime.combine(report_date, datetime.min.time())):
                    st.markdown(f"✅ {name_display}{feature_hint} :green-background[T-1 {date_str}]")
                else:
                    st.markdown(f"✅ {name_display}{feature_hint} :red-background[{date_str}]")
            else:
                # 无文件
                no_data_text = t('ui', 'datasource_not_provided', lang)
                st.markdown(f"⬜ {name_display}{feature_hint} :gray-background[{no_data_text}]")

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

        # 对比月份选择
        compare_options = [
            t('ui', 'compare_none', lang),
            t('ui', 'compare_last_month', lang),
            t('ui', 'compare_yoy', lang),
            t('ui', 'compare_custom', lang)
        ]
        compare_choice = st.selectbox(t('ui', 'compare_label', lang), compare_options, key="compare_month_selector")

        # 自定义对比月份日期选择器
        custom_compare_date = None
        if compare_choice == t('ui', 'compare_custom', lang):
            custom_compare_date = st.date_input(
                t('ui', 'compare_custom_date', lang),
                value=datetime.now() - relativedelta(months=1),
                key="custom_compare_date_picker"
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

        # 通知配置
        st.header(f"🔔 {t('ui', 'notify_title', lang)}")
        with st.expander(t('ui', 'notify_settings', lang), expanded=False):
            # 邮件通知配置
            st.subheader(t('ui', 'notify_email_section', lang))
            email_enabled = st.checkbox(
                t('ui', 'notify_email_enabled', lang),
                value=False,
                key="email_enabled"
            )
            if email_enabled:
                email_smtp_host = st.text_input(t('ui', 'notify_email_smtp_host', lang), value="smtp.gmail.com")
                email_smtp_port = st.number_input(t('ui', 'notify_email_smtp_port', lang), value=587, step=1)
                email_from = st.text_input(t('ui', 'notify_email_from', lang), value="")
                email_to = st.text_input(t('ui', 'notify_email_to', lang), value="", help=t('ui', 'help_email_to', lang))
                email_cred_file = st.text_input(t('ui', 'notify_email_cred_file', lang), value="key/email.json")

            st.divider()

            # LINE 通知配置
            st.subheader(t('ui', 'notify_line_section', lang))
            line_enabled = st.checkbox(
                t('ui', 'notify_line_enabled', lang),
                value=False,
                key="line_enabled"
            )
            if line_enabled:
                line_token = st.text_input(t('ui', 'notify_line_token', lang), value="", type="password")
                line_cred_file = st.text_input(t('ui', 'notify_line_cred_file', lang), value="key/notify.json")

            st.divider()

            # 测试通知按钮
            if st.button(t('ui', 'btn_test_notify', lang), use_container_width=True):
                notify_config_to_save = {
                    "email": {
                        "enabled": email_enabled if email_enabled else False,
                        "smtp_host": email_smtp_host if email_enabled else "smtp.gmail.com",
                        "smtp_port": email_smtp_port if email_enabled else 587,
                        "from": email_from if email_enabled else "",
                        "to": email_to.split(',') if email_enabled and email_to else [],
                        "credentials_file": email_cred_file if email_enabled else "key/email.json",
                    },
                    "line": {
                        "enabled": line_enabled if line_enabled else False,
                        "token": line_token if line_enabled and line_token else "",
                        "credentials_file": line_cred_file if line_enabled else "key/notify.json",
                    }
                }
                # 保存通知配置
                notify_config_path = CONFIG_DIR / "notify.json"
                with open(notify_config_path, 'w', encoding='utf-8') as f:
                    json.dump(notify_config_to_save, f, indent=2, ensure_ascii=False)

                # 发送测试通知
                try:
                    from src.notifier import Notifier
                    notifier = Notifier(str(notify_config_path))
                    notifier.send("test_report.md", [])

                    # 成功: 显示收件人 + 发送时间
                    recipients = []
                    if email_enabled and email_to:
                        recipients.extend([f"📧 {r.strip()}" for r in email_to.split(',')])
                    if line_enabled:
                        recipients.append("💬 LINE")

                    st.success(f"{t('ui', 'notify_success', lang)}: {', '.join(recipients)} ({datetime.now().strftime('%H:%M:%S')})")

                except Exception as e:
                    error_msg = str(e).lower()

                    # 失败: 用 st.expander 细分类型
                    with st.expander(t('ui', 'notify_error_detail', lang), expanded=True):
                        if "connection" in error_msg or "smtp" in error_msg:
                            st.error(f"**{t('ui', 'notify_fail_smtp', lang)}**")
                            st.info(t('ui', 'notify_check_server', lang))
                        elif "auth" in error_msg or "password" in error_msg or "credential" in error_msg:
                            st.error(f"**{t('ui', 'notify_fail_auth', lang)}**")
                            st.info(t('ui', 'notify_check_credentials', lang))
                        elif "token" in error_msg or "invalid" in error_msg:
                            st.error(f"**{t('ui', 'notify_fail_token', lang)}**")
                            st.info(t('ui', 'notify_check_token', lang))
                        elif "timeout" in error_msg or "network" in error_msg:
                            st.error(f"**{t('ui', 'notify_fail_network', lang)}**")
                            st.info(t('ui', 'notify_check_network', lang))
                        else:
                            st.error(f"{t('ui', 'msg_test_notify_failed', lang)}: {str(e)}")

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

                # 2. 校验数据格式
                is_valid, validation_errors = validate_data_format(reader, lang)
                if not is_valid:
                    st.error(f"**{t('validation', 'error_title', lang)}**")
                    for error in validation_errors:
                        st.error(f"• {error}")
                    return

                # 3. 处理数据
                processor = DataProcessor(reader)
                processor.process()

                # 4. 加载多数据源
                multi_loader = MultiSourceLoader(input_dir)
                multi_source_data = multi_loader.load_all()

                # 5. 分析数据
                engine = AnalysisEngine(processor)

                # 获取完整目标配置（包含时间进度）
                full_targets = get_targets(report_date_dt)
                # 更新用户自定义的目标值
                full_targets.update(targets)

                analysis_result = engine.analyze(full_targets, report_date_dt, multi_source_data)

                # 6. 生成报告（传递语言参数）
                generator = MarkdownReportGenerator(analysis_result, Path(output_path), lang=lang)
                report_paths = generator.generate_both()

                st.success(t('ui', 'msg_success', lang))

                # 显示生成的文件路径
                st.info(f"{t('ui', 'info_ops_path', lang)}: {report_paths['ops']}")
                st.info(f"{t('ui', 'info_exec_path', lang)}: {report_paths['exec']}")

                # 保存分析结果到session_state
                st.session_state['analysis_result'] = analysis_result
                st.session_state['report_paths'] = report_paths
                st.session_state['processor'] = processor

                # 自动保存快照到历史数据库
                try:
                    from src.snapshot_store import SnapshotStore
                    store = SnapshotStore()
                    store.save_snapshot(analysis_result, report_date_dt)
                    st.toast(t('ui', 'snapshot_saved', lang))
                except Exception as e:
                    import logging
                    logging.getLogger(__name__).warning(f"快照保存失败: {e}")

            except Exception as e:
                st.error(f"{t('ui', 'msg_error', lang)}: {str(e)}")
                import traceback
                st.code(traceback.format_exc())
                return

    # Tab 切换显示
    if 'analysis_result' in st.session_state:
        analysis_result = st.session_state['analysis_result']
        report_paths = st.session_state['report_paths']

        # 根据角色权限配置过滤 Tab
        saved_config = load_panel_config()
        role_permissions = saved_config.get("role_permissions", {})

        # 如果有保存的权限配置，使用它；否则使用默认
        if role in role_permissions:
            allowed_tabs = role_permissions[role]
        else:
            # 默认权限
            default_permissions = {
                "ops": ["overview", "ops", "exec", "history"],
                "exec": ["overview", "exec", "history"],
                "finance": ["overview", "history"]
            }
            allowed_tabs = default_permissions.get(role, ["overview", "history"])

        # 构建 tab_config（只包含允许的 Tab）
        all_tabs_map = {
            "overview": t('ui', 'tab_overview', lang),
            "ops": t('ui', 'tab_ops', lang),
            "exec": t('ui', 'tab_exec', lang),
            "history": t('ui', 'tab_history', lang)
        }

        tab_config = [(tab_id, all_tabs_map[tab_id]) for tab_id in allowed_tabs if tab_id in all_tabs_map]

        tab_labels = [label for _, label in tab_config]
        tabs = st.tabs(tab_labels)

        # 构建 Tab 索引映射
        tab_index_map = {tab_id: idx for idx, (tab_id, _) in enumerate(tab_config)}

        # Tab: 数据概览
        if "overview" in tab_index_map:
            with tabs[tab_index_map["overview"]]:
                st.header(t('ui', 'header_data_overview', lang))

                summary = analysis_result.get("summary", {})
                meta = analysis_result.get("meta", {})

            # 计算对比月份
            compare_month_key = None
            compare_summary = None
            if 'processor' in st.session_state and compare_choice != t('ui', 'compare_none', lang):
                processor = st.session_state['processor']
                monthly_summaries = processor.get_monthly_summaries()

                # 当前月份 key
                current_month_key = selected_month
                current_date = datetime.strptime(current_month_key, "%Y%m")

                if compare_choice == t('ui', 'compare_last_month', lang):
                    # 上月
                    compare_date = current_date - relativedelta(months=1)
                    compare_month_key = compare_date.strftime("%Y%m")
                elif compare_choice == t('ui', 'compare_yoy', lang):
                    # 去年同期
                    compare_date = current_date - relativedelta(years=1)
                    compare_month_key = compare_date.strftime("%Y%m")
                elif compare_choice == t('ui', 'compare_custom', lang) and custom_compare_date:
                    # 自定义月份
                    compare_month_key = custom_compare_date.strftime("%Y%m")

                # 获取对比月数据
                if compare_month_key and compare_month_key in monthly_summaries:
                    compare_summary = monthly_summaries[compare_month_key]
                elif compare_month_key:
                    # 对比月数据不存在
                    st.info(f"{t('ui', 'compare_no_data', lang)} ({compare_month_key})")

            # 显示已加载的数据源数量
            multi_sources_count = len(analysis_result.get("multi_source_data", {}))
            if multi_sources_count > 0:
                st.info(f"{t('ui', 'multi_source_loaded', lang)}: **{multi_sources_count}** / {len(DATA_SOURCES)}")

            # 数据质量指示器
            st.caption(f"📊 {t('ui', 'data_quality_indicator', lang)}")

            # 检测打卡率数据是否为空/全零
            checkin_data = analysis_result.get("checkin_analysis", {})
            checkin_summary = checkin_data.get("summary", {})
            is_checkin_empty = (
                not checkin_data
                or checkin_summary.get("触达率", 0) == 0
                and checkin_summary.get("参与率", 0) == 0
                and checkin_summary.get("打卡率", 0) == 0
            )

            # 检测 LTV 是否可用
            ltv_data = analysis_result.get("ltv", {})
            is_ltv_unavailable = not ltv_data.get("available", False)

            # 显示质量提示
            quality_indicators = []
            if is_checkin_empty:
                quality_indicators.append(f"🔸 打卡率: {t('ui', 'data_quality_unavailable', lang)}")
            if is_ltv_unavailable:
                quality_indicators.append(f"🔸 LTV: {t('ui', 'data_quality_estimated', lang)}")

            if quality_indicators:
                for indicator in quality_indicators:
                    st.info(indicator)
            else:
                st.success(f"✅ 全部数据源已接入")

            # 关键指标卡片 — 2×2 布局避免截断
            paid_data = summary.get("付费", {})
            amount_data = summary.get("金额", {})
            conv_data = summary.get("转化率", {})
            time_progress = analysis_result.get("time_progress", 0.0)

            # 计算对比差值
            paid_delta = None
            amount_delta = None
            conv_delta = None
            if compare_summary:
                paid_delta = paid_data.get('actual', 0) - compare_summary.get("付费", 0)
                amount_delta = amount_data.get('actual', 0) - compare_summary.get("金额", 0)
                conv_delta = (conv_data.get('actual', 0) - compare_summary.get("转化率", 0)) * 100

            row1_col1, row1_col2 = st.columns(2)
            with row1_col1:
                st.metric(
                    t('ui', 'metric_paid_progress', lang),
                    f"{paid_data.get('actual', 0):.0f} / {paid_data.get('target', 0):.0f}",
                    delta=f"{paid_delta:+.0f}" if paid_delta is not None else f"{paid_data.get('efficiency_progress', 0)*100:.1f}%",
                    delta_color="normal" if (paid_delta or 0) >= 0 else "inverse" if paid_delta is not None else ("normal" if paid_data.get('gap', 0) > 0 else "inverse"),
                )
                paid_pct = min(paid_data.get('efficiency_progress', 0), 1.0)
                st.progress(max(paid_pct, 0.0))

            with row1_col2:
                amt_actual = amount_data.get('actual', 0)
                amt_target = amount_data.get('target', 0)
                st.metric(
                    t('ui', 'metric_amount_progress', lang),
                    format_amount(amt_actual, usd_thb_rate),
                    delta=format_amount(amount_delta, usd_thb_rate) if amount_delta is not None else f"{'目标' if lang=='zh' else 'เป้า'} {format_amount(amt_target, usd_thb_rate)}",
                    delta_color="normal" if (amount_delta or 0) >= 0 else "inverse" if amount_delta is not None else ("normal" if amount_data.get('gap', 0) > 0 else "inverse"),
                )
                amt_pct = min(amount_data.get('efficiency_progress', 0), 1.0)
                st.progress(max(amt_pct, 0.0))

            row2_col1, row2_col2 = st.columns(2)
            with row2_col1:
                st.metric(
                    t('ui', 'metric_conv_rate', lang),
                    f"{conv_data.get('actual', 0)*100:.1f}% / {conv_data.get('target', 0)*100:.0f}%",
                    delta=f"{conv_delta:+.1f}%" if conv_delta is not None else f"{conv_data.get('gap', 0)*100:.1f}%",
                    delta_color="normal" if (conv_delta or 0) >= 0 else "inverse" if conv_delta is not None else ("normal" if conv_data.get('gap', 0) > 0 else "inverse"),
                )
                conv_pct = min(conv_data.get('actual', 0) / max(conv_data.get('target', 1), 0.001), 1.0)
                st.progress(max(conv_pct, 0.0))

            with row2_col2:
                st.metric(
                    t('ui', 'metric_time_progress', lang),
                    f"{time_progress*100:.1f}%",
                    f"{meta.get('current_day', 0)}/{meta.get('days_in_month', 28)} {t('ui', 'label_days', lang)}",
                )
                time_pct = min(time_progress, 1.0)
                st.progress(max(time_pct, 0.0))

            st.divider()

            # 异常预警（在数据概览之后，整体进度表之前）
            if role in ["ops", "exec"]:
                st.subheader(f"⚠️ {t('ui', 'anomaly_alert', lang)}")
                anomalies = analysis_result.get("anomalies", [])

                if not anomalies:
                    st.success(f"✅ {t('ui', 'anomaly_none', lang)}")
                else:
                    # 按严重级别分组
                    high_severity = [a for a in anomalies if a.get("severity") == "高"]
                    mid_severity = [a for a in anomalies if a.get("severity") == "中"]

                    # 显示高严重度异常（st.error）
                    if high_severity:
                        for anomaly in high_severity:
                            anomaly_type = anomaly.get("type", "")
                            metric = anomaly.get("metric", "")
                            value = anomaly.get("value", 0)
                            suggestion = anomaly.get("建议", "")

                            st.error(f"**{anomaly_type}** - {metric}: {value:.1f}")

                            # 详细信息折叠
                            with st.expander(t('ui', 'anomaly_details', lang)):
                                if "person" in anomaly:
                                    st.write(f"**{t('ui', 'anomaly_metric', lang)}**: {anomaly.get('person')} - {metric}")
                                    st.write(f"**{t('ui', 'anomaly_current', lang)}**: {value:.1f}")
                                    st.write(f"**{t('ui', 'anomaly_team_avg', lang)}**: {anomaly.get('threshold', 0):.1f}")
                                elif "channel" in anomaly:
                                    st.write(f"**{t('ui', 'col_channel', lang)}**: {anomaly.get('channel')}")
                                    st.write(f"**{t('ui', 'anomaly_metric', lang)}**: {metric}")
                                    st.write(f"**{t('ui', 'anomaly_current', lang)}**: {value:.1f}")
                                    if "mom_change" in anomaly:
                                        st.write(f"**环比变化**: {anomaly.get('mom_change', 0)*100:.1f}%")

                                st.write(f"**{t('ui', 'anomaly_suggestion', lang)}**: {suggestion}")

                    # 显示中等严重度异常（st.warning）
                    if mid_severity:
                        for anomaly in mid_severity:
                            anomaly_type = anomaly.get("type", "")
                            metric = anomaly.get("metric", "")
                            value = anomaly.get("value", 0)
                            suggestion = anomaly.get("建议", "")

                            st.warning(f"**{anomaly_type}** - {metric}: {value:.1f}")

                            # 详细信息折叠
                            with st.expander(t('ui', 'anomaly_details', lang)):
                                if "person" in anomaly:
                                    st.write(f"**{t('ui', 'anomaly_metric', lang)}**: {anomaly.get('person')} - {metric}")
                                    st.write(f"**{t('ui', 'anomaly_current', lang)}**: {value:.1f}")
                                    st.write(f"**{t('ui', 'anomaly_team_avg', lang)}**: {anomaly.get('threshold', 0):.1f}")
                                elif "channel" in anomaly:
                                    st.write(f"**{t('ui', 'col_channel', lang)}**: {anomaly.get('channel')}")
                                    st.write(f"**{t('ui', 'anomaly_metric', lang)}**: {metric}")
                                    st.write(f"**{t('ui', 'anomaly_current', lang)}**: {value:.1f}")
                                    if "mom_change" in anomaly:
                                        st.write(f"**环比变化**: {anomaly.get('mom_change', 0)*100:.1f}%")

                                st.write(f"**{t('ui', 'anomaly_suggestion', lang)}**: {suggestion}")

                st.divider()

            # 整体进度表
            st.subheader(t('ui', 'header_progress', lang))
            progress_data = []
            for name, data in summary.items():
                # 财务角色仅显示金额、付费、转化率相关指标
                if role == "finance" and name not in ["金额", "付费", "转化率"]:
                    continue

                actual = data.get("actual", 0)
                target = data.get("target", 0)
                # 转化率是 0~1 比率，需要转为百分比显示
                if name == "转化率":
                    actual_display = f"{actual*100:.1f}%"
                    target_display = f"{target*100:.1f}%"
                elif name == "金额":
                    actual_display = format_amount(actual, usd_thb_rate)
                    target_display = format_amount(target, usd_thb_rate)
                else:
                    actual_display = f"{actual:,.0f}"
                    target_display = f"{target:,.0f}"
                progress_data.append({
                    t('ui', 'col_indicator', lang): name,
                    t('ui', 'col_actual', lang): actual_display,
                    t('ui', 'col_target', lang): target_display,
                    t('ui', 'col_progress', lang): f"{data.get('efficiency_progress', 0)*100:.1f}%",
                    t('ui', 'col_gap', lang): f"{data.get('gap', 0)*100:.1f}%",
                    t('ui', 'col_status', lang): data.get("status", ""),
                })

            st.dataframe(progress_data, use_container_width=True)

            st.divider()

            # 风险预警（财务角色不显示）
            if role in ["ops", "exec"]:
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
                # 财务角色仅显示金额、付费列
                if role == "finance":
                    channel_data.append({
                        t('ui', 'col_channel', lang): channel_name,
                        t('ui', 'col_paid', lang): data.get("付费", 0),
                        t('ui', 'col_amount', lang): format_amount(data.get('金额', 0), usd_thb_rate),
                    })
                else:
                    channel_data.append({
                        t('ui', 'col_channel', lang): channel_name,
                        t('ui', 'col_reg', lang): data.get("注册", 0),
                        t('ui', 'col_paid', lang): data.get("付费", 0),
                        t('ui', 'col_amount', lang): format_amount(data.get('金额', 0), usd_thb_rate),
                        t('ui', 'col_efficiency', lang): f"{data.get('效能指数', 0.0):.2f}×",
                        t('ui', 'col_gap_progress', lang): f"{data.get('目标缺口', 0.0)*100:.1f}%",
                    })

            st.dataframe(channel_data, use_container_width=True)

        # Tab: 运营版预览
        if "ops" in tab_index_map:
            with tabs[tab_index_map["ops"]]:
                st.header(t('ui', 'header_ops_preview', lang))

                if report_paths['ops'].exists():
                    with open(report_paths['ops'], 'r', encoding='utf-8') as f:
                        ops_content = f.read()

                    render_markdown_with_charts(ops_content)

                    # 下载按钮
                    st.download_button(
                        label=t('ui', 'btn_download_ops', lang),
                        data=ops_content,
                        file_name=report_paths['ops'].name,
                        mime="text/markdown",
                    )
                else:
                    st.warning(t('ui', 'warn_ops_not_found', lang))

        # Tab: 管理层版预览
        if "exec" in tab_index_map:
            with tabs[tab_index_map["exec"]]:
                st.header(t('ui', 'header_exec_preview', lang))

                if report_paths['exec'].exists():
                    with open(report_paths['exec'], 'r', encoding='utf-8') as f:
                        exec_content = f.read()

                    render_markdown_with_charts(exec_content)

                    # 下载按钮
                    st.download_button(
                        label=t('ui', 'btn_download_exec', lang),
                        data=exec_content,
                        file_name=report_paths['exec'].name,
                        mime="text/markdown",
                    )
                else:
                    st.warning(t('ui', 'warn_exec_not_found', lang))

        # Tab: 历史报告
        if "history" in tab_index_map:
            with tabs[tab_index_map["history"]]:
                st.header(t('ui', 'header_history', lang))

                # 调度历史查看器
                with st.expander(f"📅 {t('ui', 'schedule_log_title', lang)}", expanded=False):
                    schedule_log_path = BASE_DIR / "logs" / "schedule.log"
                    if schedule_log_path.exists():
                        # 读取日志文件（JSON Lines 格式）
                        log_entries = []
                        try:
                            with open(schedule_log_path, 'r', encoding='utf-8') as f:
                                for line in f:
                                    try:
                                        log_entries.append(json.loads(line.strip()))
                                    except json.JSONDecodeError:
                                        pass
                        except Exception as e:
                            st.error(f"{t('ui', 'schedule_log_error', lang)}: {str(e)}")

                        if log_entries:
                            # 状态筛选
                            status_filter = st.radio(
                                t('ui', 'schedule_log_filter', lang),
                                options=[
                                    t('ui', 'schedule_log_all', lang),
                                    t('ui', 'schedule_log_success', lang),
                                    t('ui', 'schedule_log_failed', lang)
                                ],
                                horizontal=True
                            )

                            # 根据筛选显示
                            filtered = log_entries
                            if status_filter == t('ui', 'schedule_log_success', lang):
                                filtered = [e for e in log_entries if e.get("status") == "success"]
                            elif status_filter == t('ui', 'schedule_log_failed', lang):
                                filtered = [e for e in log_entries if e.get("status") == "failed"]

                            # 反序显示（最新的在前）
                            filtered.reverse()

                            # 构建表格数据
                            table_data = []
                            for entry in filtered[:50]:  # 最多显示50条
                                status_display = "✅" if entry.get("status") == "success" else "❌"
                                table_data.append({
                                    t('ui', 'schedule_log_col_time', lang): entry.get("timestamp", ""),
                                    t('ui', 'schedule_log_col_status', lang): status_display,
                                    t('ui', 'schedule_log_col_duration', lang): f"{entry.get('duration_ms', 0)}ms",
                                    t('ui', 'schedule_log_col_report', lang): entry.get("report_path", "-"),
                                    t('ui', 'schedule_log_col_error', lang): entry.get("error_msg", "-") if entry.get("status") == "failed" else "-"
                                })

                            st.dataframe(table_data, use_container_width=True)
                            st.caption(f"{t('ui', 'schedule_log_showing', lang)}: {len(filtered)} / {len(log_entries)}")
                        else:
                            st.info(t('ui', 'schedule_log_empty', lang))
                    else:
                        st.info(t('ui', 'schedule_log_not_found', lang))

                    # 下次执行时间（如果有配置）
                    schedule_config_path = BASE_DIR / "config" / "schedule.json"
                    if schedule_config_path.exists():
                        try:
                            with open(schedule_config_path, 'r', encoding='utf-8') as f:
                                sched_cfg = json.load(f)
                            if sched_cfg.get("enabled"):
                                next_run = sched_cfg.get("cron", "09:00")
                                st.info(f"{t('ui', 'schedule_next_run', lang)}: {next_run}")
                        except Exception:
                            pass

                st.divider()

                # 快照数据管理
                st.subheader(t('ui', 'snapshot_management', lang))
                try:
                    from src.snapshot_store import SnapshotStore
                    store = SnapshotStore()
                    stats = store.get_stats()

                    # 统计信息
                    col1, col2, col3 = st.columns(3)
                    with col1:
                        st.metric(t('ui', 'snapshot_total', lang), stats.get("total_snapshots", 0))
                    with col2:
                        st.metric(t('ui', 'snapshot_earliest', lang), stats.get("earliest_date", "-"))
                    with col3:
                        st.metric(t('ui', 'snapshot_latest', lang), stats.get("latest_date", "-"))

                    # 各表记录数
                    with st.expander(t('ui', 'snapshot_stats', lang)):
                        for table, count in stats.get("table_counts", {}).items():
                            st.text(f"{table}: {count} records")
                        st.text(f"DB size: {stats.get('db_size_kb', 0):.1f} KB")

                    # 导入历史数据按钮
                    if st.button(t('ui', 'btn_import_history', lang)):
                        with st.spinner(t('ui', 'importing_history', lang) if 'importing_history' in {} else "导入中..."):
                            try:
                                from src.history_importer import HistoryImporter
                                importer = HistoryImporter(input_dir)
                                result = importer.import_all()
                                st.success(f"导入完成: {result.get('imported', 0)} 条, 跳过: {result.get('skipped', 0)}, 失败: {result.get('failed', 0)}")
                                st.rerun()
                            except Exception as e:
                                st.error(f"导入失败: {e}")

                    # 清理旧数据
                    with st.expander(t('ui', 'btn_cleanup', lang)):
                        days = st.number_input(t('ui', 'cleanup_days', lang), min_value=30, max_value=3650, value=365)
                        if st.button(t('ui', 'btn_cleanup', lang), key="cleanup_btn"):
                            store.cleanup(days)
                            st.success(f"已清理 {days} 天前的数据")
                            st.rerun()

                except ImportError:
                    st.info("快照存储模块未就绪")
                except Exception as e:
                    st.warning(f"快照管理加载失败: {e}")

                st.divider()

                # 历史报告下载
                st.subheader(t('ui', 'header_report_download', lang))
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
