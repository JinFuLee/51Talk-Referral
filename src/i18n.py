"""中泰双语翻译系统"""
from typing import Dict

# 支持的语言
LANGUAGES = {"zh": "中文", "th": "ภาษาไทย"}
DEFAULT_LANG = "zh"

# 翻译字典
TRANSLATIONS: Dict[str, Dict[str, Dict[str, str]]] = {}

# === UI 翻译（Streamlit 界面） ===
TRANSLATIONS["ui"] = {
    # App
    "app_title": {"zh": "转介绍运营分析", "th": "วิเคราะห์ระบบแนะนำ"},
    "app_icon": {"zh": "📊", "th": "📊"},

    # Sidebar
    "sidebar_data_input": {"zh": "数据输入", "th": "ข้อมูลนำเข้า"},
    "sidebar_input_dir": {"zh": "数据文件夹路径", "th": "พาธโฟลเดอร์ข้อมูล"},
    "sidebar_upload": {"zh": "或上传文件", "th": "หรืออัปโหลดไฟล์"},
    "help_input_dir": {"zh": "输入包含所有数据文件的文件夹路径", "th": "ระบุพาธโฟลเดอร์ที่มีไฟล์ข้อมูลทั้งหมด"},
    "datasource_header": {"zh": "数据源状态", "th": "สถานะแหล่งข้อมูล"},
    "datasource_core_file_missing": {"zh": "未找到核心数据文件（转介绍不同口径对比）", "th": "ไม่พบไฟล์ข้อมูลหลัก"},
    "sidebar_report_config": {"zh": "报告配置", "th": "ตั้งค่ารายงาน"},
    "sidebar_report_date": {"zh": "报告日期", "th": "วันที่รายงาน"},
    "sidebar_targets": {"zh": "月度目标配置", "th": "ตั้งเป้าหมายรายเดือน"},
    "sidebar_month": {"zh": "选择月份", "th": "เลือกเดือน"},
    "sidebar_reg_target": {"zh": "注册目标", "th": "เป้าลงทะเบียน"},
    "sidebar_paid_target": {"zh": "付费目标", "th": "เป้าชำระเงิน"},
    "sidebar_amount_target": {"zh": "金额目标 ($)", "th": "เป้ายอดเงิน ($)"},
    "sidebar_unit_price": {"zh": "客单价 ($)", "th": "ราคาต่อหน่วย ($)"},
    "sidebar_conv_rate": {"zh": "转化率目标", "th": "เป้าอัตราแปลง"},
    "sidebar_booking_rate": {"zh": "约课率目标", "th": "เป้าอัตราจอง"},
    "sidebar_attendance_rate": {"zh": "出席率目标", "th": "เป้าอัตราเข้าเรียน"},
    "sidebar_output": {"zh": "输出配置", "th": "ตั้งค่าเอาต์พุต"},
    "sidebar_output_path": {"zh": "输出路径", "th": "พาธเอาต์พุต"},
    "btn_save_config": {"zh": "💾 保存配置", "th": "💾 บันทึกการตั้งค่า"},
    "btn_generate": {"zh": "🚀 生成报告", "th": "🚀 สร้างรายงาน"},
    "btn_download_ops": {"zh": "📥 下载运营版报告", "th": "📥 ดาวน์โหลดรายงานปฏิบัติการ"},
    "btn_download_exec": {"zh": "📥 下载管理层版报告", "th": "📥 ดาวน์โหลดรายงานผู้บริหาร"},

    # Tabs
    "tab_overview": {"zh": "📊 数据概览", "th": "📊 ภาพรวมข้อมูล"},
    "tab_ops": {"zh": "📝 运营版预览", "th": "📝 ตัวอย่างฝ่ายปฏิบัติการ"},
    "tab_exec": {"zh": "📈 管理层版预览", "th": "📈 ตัวอย่างผู้บริหาร"},
    "tab_history": {"zh": "📁 历史报告", "th": "📁 รายงานย้อนหลัง"},

    # Data overview
    "metric_paid_progress": {"zh": "付费进度", "th": "ความคืบหน้าชำระเงิน"},
    "metric_amount_progress": {"zh": "金额进度 ($)", "th": "ความคืบหน้ายอดเงิน ($)"},
    "metric_conv_rate": {"zh": "转化率", "th": "อัตราแปลง"},
    "metric_time_progress": {"zh": "时间进度", "th": "ความคืบหน้าเวลา"},
    "header_progress": {"zh": "整体进度看板", "th": "แดชบอร์ดความคืบหน้า"},
    "header_risk": {"zh": "风险预警", "th": "แจ้งเตือนความเสี่ยง"},
    "header_channel": {"zh": "渠道效能对比", "th": "เปรียบเทียบประสิทธิภาพช่องทาง"},
    "no_risk": {"zh": "当前无高风险预警项", "th": "ไม่มีรายการเตือนความเสี่ยงสูง"},

    # Messages
    "msg_generating": {"zh": "正在处理数据...", "th": "กำลังประมวลผลข้อมูล..."},
    "msg_success": {"zh": "✅ 报告生成成功！", "th": "✅ สร้างรายงานสำเร็จ!"},
    "msg_no_file": {"zh": "请输入文件路径或上传文件！", "th": "กรุณาระบุพาธไฟล์หรืออัปโหลดไฟล์!"},
    "msg_file_not_found": {"zh": "文件不存在", "th": "ไม่พบไฟล์"},
    "msg_error": {"zh": "处理出错", "th": "เกิดข้อผิดพลาด"},
    "msg_config_saved": {"zh": "配置已保存！", "th": "บันทึกการตั้งค่าแล้ว!"},
    "msg_no_history": {"zh": "暂无历史报告", "th": "ยังไม่มีรายงานย้อนหลัง"},
    "msg_history_count": {"zh": "共找到 {} 个历史报告：", "th": "พบรายงานย้อนหลัง {} รายการ:"},

    # Language switcher
    "lang_label": {"zh": "语言 / ภาษา", "th": "ภาษา / 语言"},

    # Table columns
    "col_indicator": {"zh": "指标", "th": "ตัวชี้วัด"},
    "col_actual": {"zh": "已完成", "th": "สำเร็จแล้ว"},
    "col_target": {"zh": "月目标", "th": "เป้าเดือน"},
    "col_progress": {"zh": "效率进度", "th": "ความคืบหน้า"},
    "col_gap": {"zh": "目标缺口", "th": "ส่วนต่างเป้า"},
    "col_status": {"zh": "状态", "th": "สถานะ"},
    "col_channel": {"zh": "口径", "th": "ช่องทาง"},
    "col_reg": {"zh": "注册", "th": "ลงทะเบียน"},
    "col_paid": {"zh": "付费", "th": "ชำระเงิน"},
    "col_amount": {"zh": "金额 ($)", "th": "ยอดเงิน ($)"},
    "col_efficiency": {"zh": "效能指数", "th": "ดัชนีประสิทธิภาพ"},
    "col_gap_progress": {"zh": "进度缺口", "th": "ส่วนต่างความคืบหน้า"},
    "download": {"zh": "下载", "th": "ดาวน์โหลด"},
    "header_ops_preview": {"zh": "运营版报告预览", "th": "ตัวอย่างรายงานปฏิบัติการ"},
    "header_exec_preview": {"zh": "管理层版报告预览", "th": "ตัวอย่างรายงานผู้บริหาร"},
    "header_history": {"zh": "历史报告", "th": "รายงานย้อนหลัง"},
    "header_data_overview": {"zh": "数据概览", "th": "ภาพรวมข้อมูล"},
    "warn_ops_not_found": {"zh": "运营版报告文件未找到", "th": "ไม่พบไฟล์รายงานปฏิบัติการ"},
    "warn_exec_not_found": {"zh": "管理层版报告文件未找到", "th": "ไม่พบไฟล์รายงานผู้บริหาร"},
    "warn_output_dir_not_exist": {"zh": "输出目录不存在", "th": "ไม่มีพาธเอาต์พุต"},
    "info_ops_path": {"zh": "运营版报告", "th": "รายงานปฏิบัติการ"},
    "info_exec_path": {"zh": "管理层版报告", "th": "รายงานผู้บริหาร"},
    "help_file_path": {"zh": "输入 Excel 文件的完整路径", "th": "ระบุพาธไฟล์ Excel แบบเต็ม"},
    "help_upload": {"zh": "如果没有路径，可以直接上传文件", "th": "หากไม่มีพาธสามารถอัปโหลดไฟล์ได้"},
    "help_report_date": {"zh": "报告生成日期（数据日期为 T-1）", "th": "วันที่สร้างรายงาน (ข้อมูล ณ T-1)"},
    "help_output_path": {"zh": "Markdown 报告输出目录", "th": "พาธเอาต์พุตรายงาน Markdown"},

    # Data source status
    "datasource_status": {"zh": "数据源状态", "th": "สถานะแหล่งข้อมูล"},
    "datasource_t1": {"zh": "T-1 数据", "th": "ข้อมูล T-1"},
    "datasource_not_provided": {"zh": "未提供", "th": "ไม่มี"},
    "datasource_provided": {"zh": "已有", "th": "มีแล้ว"},
    "datasource_outdated": {"zh": "非T-1", "th": "ไม่ใช่ T-1"},
    "datasource_count": {"zh": "{}/{} 已提供", "th": "{}/{} มีแล้ว"},
}

# === 报告翻译（Markdown 报告内容） ===
TRANSLATIONS["report"] = {
    # 运营版报告头
    "ops_header_title": {"zh": "泰国转介绍业绩追踪 — 运营版", "th": "รายงานติดตามประสิทธิภาพการแนะนำ ประเทศไทย — ฝ่ายปฏิบัติการ"},
    "ops_header_report_date": {"zh": "报告日期", "th": "วันที่รายงาน"},
    "ops_header_data_range": {"zh": "数据区间", "th": "ช่วงข้อมูล"},
    "ops_header_time_progress": {"zh": "时间进度", "th": "ความคืบหน้าเวลา"},
    "ops_header_audience": {"zh": "受众", "th": "กลุ่มเป้าหมาย"},
    "ops_header_report_type": {"zh": "报告类型", "th": "ประเภทรายงาน"},
    "ops_header_audience_value": {"zh": "CC Team Leaders + 运营分析团队", "th": "หัวหน้าทีม CC + ทีมวิเคราะห์ปฏิบัติการ"},
    "ops_header_type_value": {"zh": "战术执行层（详细诊断+执行清单）", "th": "ระดับปฏิบัติการ (วินิจฉัยละเอียด + รายการปฏิบัติ)"},

    # 核心结论
    "ops_core_conclusion_title": {"zh": "核心结论", "th": "สรุปสำคัญ"},
    "ops_core_conclusion_problem": {"zh": "问题聚焦", "th": "ประเด็นปัญหา"},
    "ops_core_conclusion_root": {"zh": "根源", "th": "สาเหตุหลัก"},
    "ops_core_conclusion_action": {"zh": "P0 行动", "th": "แผนปฏิบัติ P0"},
    "ops_core_severe_lag": {"zh": "严重滞后，目标缺口", "th": "ล่าช้าร้ายแรง ส่วนต่างเป้า"},
    "ops_core_attendance_rate": {"zh": "出席付费率", "th": "อัตราชำระหลังเข้าคลาส"},
    "ops_core_root_1": {"zh": "低质量开源污染漏斗", "th": "แหล่งที่มาคุณภาพต่ำทำลายช่องทาง"},
    "ops_core_root_2": {"zh": "已出席未付费用户跟进不足", "th": "ติดตามผู้เข้าคลาสแต่ยังไม่ชำระไม่เพียงพอ"},
    "ops_core_root_3": {"zh": "转化率下滑", "th": "อัตราแปลงลดลง"},
    "ops_core_action_plan": {"zh": "分层触达已出席未付费用户 + 优化开源质量，预计可回补", "th": "ติดตามผู้เข้าคลาสแบบแบ่งชั้น + ปรับปรุงคุณภาพแหล่งข้อมูล คาดกู้คืน"},
    "ops_core_action_units": {"zh": "单，缩小付费缺口至", "th": "หน่วย ลดส่วนต่างชำระเหลือ"},

    # 整体进度看板
    "ops_summary_title": {"zh": "一、整体进度看板", "th": "1. แดชบอร์ดความคืบหน้ารวม"},
    "ops_summary_formula": {"zh": "计算公式", "th": "สูตรคำนวณ"},
    "ops_summary_formula_text": {"zh": "目标缺口 = 效率进度 - 时间进度", "th": "ส่วนต่างเป้า = ความคืบหน้า - ความคืบหน้าเวลา"},
    "ops_summary_status_good": {"zh": "持平", "th": "ทันเป้า"},
    "ops_summary_status_lag": {"zh": "落后", "th": "ล่าช้า"},
    "ops_summary_status_severe": {"zh": "严重", "th": "วิกฤต"},
    "ops_summary_coverage": {"zh": "基数说明", "th": "หมายเหตุฐานข้อมูล"},
    "ops_summary_coverage_text": {"zh": "已完成数据基于当月注册用户的全流程跟踪，数据覆盖率 100%。", "th": "ข้อมูลสำเร็จติดตามผู้ลงทะเบียนเดือนนี้ทั้งหมด ครอบคลุม 100%"},

    # 图表说明通用
    "chart_explain": {"zh": "图表说明", "th": "คำอธิบายกราฟ"},
    "chart_blue_bar": {"zh": "蓝柱", "th": "แท่งน้ำเงิน"},
    "chart_red_line": {"zh": "红线", "th": "เส้นแดง"},
    "chart_green_line": {"zh": "绿线", "th": "เส้นเขียว"},
    "chart_baseline": {"zh": "基准", "th": "ฐาน"},
    "chart_above_baseline": {"zh": "超前", "th": "เหนือฐาน"},
    "chart_below_baseline": {"zh": "落后", "th": "ต่ำกว่าฐาน"},

    # 管理层版报告头
    "exec_header_title": {"zh": "泰国转介绍业绩追踪 — 管理层版", "th": "รายงานติดตามประสิทธิภาพการแนะนำ ประเทศไทย — ฝ่ายบริหาร"},
    "exec_header_audience_value": {"zh": "业务管理层 + 决策层", "th": "ฝ่ายบริหารธุรกิจ + ผู้บริหาร"},
    "exec_header_type_value": {"zh": "战略决策层（趋势洞察+资源配置建议）", "th": "ระดับกลยุทธ์ (ข้อมูลเชิงลึก + คำแนะนำการจัดสรรทรัพยากร)"},

    # 核心摘要
    "exec_summary_title": {"zh": "核心摘要（60 秒速读）", "th": "สรุปสำคัญ (อ่าน 60 วินาที)"},
    "exec_summary_target": {"zh": "目标达成", "th": "บรรลุเป้าหมาย"},
    "exec_summary_main_risk": {"zh": "主要风险", "th": "ความเสี่ยงหลัก"},
    "exec_summary_root": {"zh": "根源", "th": "สาเหตุหลัก"},
    "exec_summary_response": {"zh": "应对", "th": "การตอบสนอง"},
    "exec_summary_resource": {"zh": "资源建议", "th": "คำแนะนำทรัพยากร"},
    "exec_summary_plain": {"zh": "说白了", "th": "กล่าวคือ"},
    "exec_summary_units": {"zh": "单", "th": "หน่วย"},
    "exec_summary_lag_progress": {"zh": "落后时间进度", "th": "ล่าช้ากว่าเวลา"},
    "exec_summary_percentage_point": {"zh": "个百分点", "th": "จุดเปอร์เซ็นต์"},
    "exec_summary_risk_text": {"zh": "出席付费率下滑，若不干预将导致月末仅完成目标的 40-45%。", "th": "อัตราชำระหลังเข้าคลาสลดลง หากไม่แทรกแซงจะทำเป้าได้แค่ 40-45% ท้ายเดือน"},
    "exec_summary_root_text": {"zh": "低质量开源污染漏斗 + 跟进不足。", "th": "แหล่งคุณภาพต่ำทำลายช่องทาง + ติดตามไม่พอ"},
    "exec_summary_response_text": {"zh": "优化开源质量 + 分层触达，预计可回补 10-15 单。", "th": "ปรับปรุงคุณภาพแหล่ง + ติดตามแบบแบ่งชั้น คาดกู้ 10-15 หน่วย"},
    "exec_summary_resource_text": {"zh": "加大窄口投入（ROI 高），优化宽口质量门槛。", "th": "เพิ่มลงทุนช่องแคบ (ROI สูง) ปรับเกณฑ์คุณภาพช่องกว้าง"},
    "exec_summary_plain_time": {"zh": "时间过了", "th": "เวลาผ่านไป"},
    "exec_summary_plain_paid": {"zh": "付费才完成", "th": "ชำระทำได้แค่"},
    "exec_summary_plain_action": {"zh": "需要紧急干预。", "th": "ต้องแทรกแซงด่วน"},
}


def t(section: str, key: str, lang: str = "zh") -> str:
    """获取翻译文本

    Args:
        section: 翻译分类（ui/report）
        key: 翻译键
        lang: 语言代码（zh/th）

    Returns:
        翻译后的文本，找不到则返回 key
    """
    section_dict = TRANSLATIONS.get(section, {})
    entry = section_dict.get(key, {})
    return entry.get(lang, entry.get("zh", key))
