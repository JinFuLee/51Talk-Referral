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
    "help_input_dir": {
        "zh": "输入包含所有数据文件的文件夹路径",
        "th": "ระบุพาธโฟลเดอร์ที่มีไฟล์ข้อมูลทั้งหมด",
    },
    "datasource_header": {"zh": "数据源状态", "th": "สถานะแหล่งข้อมูล"},
    "datasource_core_file_missing": {
        "zh": "未找到核心数据文件（转介绍不同口径对比）",
        "th": "ไม่พบไฟล์ข้อมูลหลัก",
    },
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
    "sidebar_exchange_rate": {"zh": "汇率设置", "th": "การตั้งค่าอัตราแลกเปลี่ยน"},
    "label_target": {"zh": "目标", "th": "เป้า"},
    "label_days": {"zh": "天", "th": "วัน"},
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
    "msg_no_file": {
        "zh": "请输入文件路径或上传文件！",
        "th": "กรุณาระบุพาธไฟล์หรืออัปโหลดไฟล์!",
    },
    "msg_file_not_found": {"zh": "文件不存在", "th": "ไม่พบไฟล์"},
    "msg_error": {"zh": "处理出错", "th": "เกิดข้อผิดพลาด"},
    "msg_config_saved": {"zh": "配置已保存！", "th": "บันทึกการตั้งค่าแล้ว!"},
    "msg_no_history": {"zh": "暂无历史报告", "th": "ยังไม่มีรายงานย้อนหลัง"},
    "msg_history_count": {
        "zh": "共找到 {} 个历史报告：",
        "th": "พบรายงานย้อนหลัง {} รายการ:",
    },
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
    "warn_exec_not_found": {
        "zh": "管理层版报告文件未找到",
        "th": "ไม่พบไฟล์รายงานผู้บริหาร",
    },
    "warn_output_dir_not_exist": {"zh": "输出目录不存在", "th": "ไม่มีพาธเอาต์พุต"},
    "info_ops_path": {"zh": "运营版报告", "th": "รายงานปฏิบัติการ"},
    "info_exec_path": {"zh": "管理层版报告", "th": "รายงานผู้บริหาร"},
    "help_file_path": {
        "zh": "输入 Excel 文件的完整路径",
        "th": "ระบุพาธไฟล์ Excel แบบเต็ม",
    },
    "help_upload": {
        "zh": "如果没有路径，可以直接上传文件",
        "th": "หากไม่มีพาธสามารถอัปโหลดไฟล์ได้",
    },
    "help_report_date": {
        "zh": "报告生成日期（数据日期为 T-1）",
        "th": "วันที่สร้างรายงาน (ข้อมูล ณ T-1)",
    },
    "help_output_path": {
        "zh": "Markdown 报告输出目录",
        "th": "พาธเอาต์พุตรายงาน Markdown",
    },
    # Data source status
    "datasource_status": {"zh": "数据源状态", "th": "สถานะแหล่งข้อมูล"},
    "datasource_t1": {"zh": "T-1 数据", "th": "ข้อมูล T-1"},
    "datasource_not_provided": {"zh": "未提供", "th": "ไม่มี"},
    "datasource_provided": {"zh": "已有", "th": "มีแล้ว"},
    "datasource_outdated": {"zh": "非T-1", "th": "ไม่ใช่ T-1"},
    "datasource_count": {"zh": "{}/{} 已提供", "th": "{}/{} มีแล้ว"},
    # M4 Phase 2 新章节
    "section_cohort": {"zh": "围场生命周期分析", "th": "วิเคราะห์วงจรชีวิตตามช่วง"},
    "section_checkin": {"zh": "转介绍参与行为分析", "th": "วิเคราะห์พฤติกรรมการมีส่วนร่วม"},
    "section_leads": {
        "zh": "全团队 Leads 漏斗对标",
        "th": "เปรียบเทียบ Leads Funnel ทุกทีม",
    },
    "section_followup": {"zh": "跟进效率分析", "th": "วิเคราะห์ประสิทธิภาพการติดตาม"},
    "section_orders": {"zh": "订单明细分析", "th": "วิเคราะห์รายละเอียดคำสั่งซื้อ"},
    "section_trend": {"zh": "月度趋势分析", "th": "วิเคราะห์แนวโน้มรายเดือน"},
    "multi_source_loaded": {"zh": "已加载数据源", "th": "โหลดแหล่งข้อมูลแล้ว"},
    # M5 CC 个人排名和已出席未付费
    "section_cc_ranking": {"zh": "CC 个人排名", "th": "อันดับ CC"},
    "section_attended_not_paid": {"zh": "已出席未付费", "th": "เข้าคลาสแล้วไม่ชำระ"},
    # M6 AI 增强分析
    "section_ai_diagnosis": {"zh": "AI 根因诊断", "th": "วิเคราะห์สาเหตุโดย AI"},
    "section_ai_insights": {"zh": "AI 洞察", "th": "ข้อมูลเชิงลึกจาก AI"},
    # M6 行动追踪
    "action_tracking_title": {"zh": "历史行动追踪", "th": "ติดตามแผนที่ผ่านมา"},
    "action_first_time": {
        "zh": "首次生成报告，行动追踪将从下次开始",
        "th": "รายงานครั้งแรก การติดตามแผนจะเริ่มครั้งถัดไป",
    },
    "action_completed": {"zh": "已完成", "th": "เสร็จแล้ว"},
    "action_pending": {"zh": "待执行", "th": "รอดำเนินการ"},
    "action_completion_rate": {"zh": "行动执行率", "th": "อัตราดำเนินการ"},
    # Snapshot data management
    "snapshot_saved": {"zh": "快照已保存", "th": "บันทึกสแนปช็อตแล้ว"},
    "snapshot_save_failed": {"zh": "快照保存失败", "th": "บันทึกสแนปช็อตล้มเหลว"},
    "snapshot_management": {"zh": "快照数据管理", "th": "จัดการข้อมูลสแนปช็อต"},
    "snapshot_stats": {"zh": "快照统计详情", "th": "รายละเอียดสถิติสแนปช็อต"},
    "snapshot_total": {"zh": "总快照数", "th": "จำนวนสแนปช็อตทั้งหมด"},
    "snapshot_earliest": {"zh": "最早日期", "th": "วันที่เก่าที่สุด"},
    "snapshot_latest": {"zh": "最新日期", "th": "วันที่ล่าสุด"},
    "btn_import_history": {"zh": "📥 导入历史数据", "th": "📥 นำเข้าข้อมูลย้อนหลัง"},
    "btn_cleanup": {"zh": "🗑️ 清理旧数据", "th": "🗑️ ล้างข้อมูลเก่า"},
    "cleanup_days": {"zh": "保留天数", "th": "จำนวนวันที่เก็บ"},
}

# === 数据校验翻译 ===
TRANSLATIONS["validation"] = {
    "no_data": {"zh": "文件中无任何数据", "th": "ไม่มีข้อมูลในไฟล์"},
    "no_data_rows": {"zh": "文件中无有效数据行", "th": "ไม่มีแถวข้อมูลที่ใช้ได้"},
    "missing_columns": {"zh": "缺少必需列: {}", "th": "ขาดคอลัมน์ที่จำเป็น: {}"},
    "success": {"zh": "数据格式校验通过", "th": "ผ่านการตรวจสอบรูปแบบข้อมูล"},
    "failed": {"zh": "数据格式校验失败", "th": "ตรวจสอบรูปแบบข้อมูลไม่ผ่าน"},
    "error_title": {"zh": "数据校验错误", "th": "ข้อผิดพลาดการตรวจสอบ"},
}

# === 报告翻译（Markdown 报告内容） ===
TRANSLATIONS["report"] = {
    "ops_header_title": {
        "zh": "泰国转介绍业绩追踪 — 运营版",
        "th": "รายงานติดตามประสิทธิภาพการแนะนำ ประเทศไทย — ฝ่ายปฏิบัติการ",
    },
    "ops_header_report_date": {"zh": "报告日期", "th": "วันที่รายงาน"},
    "ops_header_data_range": {"zh": "数据区间", "th": "ช่วงข้อมูล"},
    "ops_header_time_progress": {"zh": "时间进度", "th": "ความคืบหน้าเวลา"},
    "ops_header_audience": {"zh": "受众", "th": "กลุ่มเป้าหมาย"},
    "ops_header_report_type": {"zh": "报告类型", "th": "ประเภทรายงาน"},
    "ops_header_audience_value": {
        "zh": "CC Team Leaders + 运营分析团队",
        "th": "หัวหน้าทีม CC + ทีมวิเคราะห์ปฏิบัติการ",
    },
    "ops_header_type_value": {
        "zh": "战术执行层（详细诊断+执行清单）",
        "th": "ระดับปฏิบัติการ (วินิจฉัยละเอียด + รายการปฏิบัติ)",
    },
    "exec_header_title": {
        "zh": "泰国转介绍业绩追踪 — 管理层版",
        "th": "รายงานติดตามประสิทธิภาพการแนะนำ ประเทศไทย — ฝ่ายบริหาร",
    },
    "exec_header_audience_value": {
        "zh": "业务管理层 + 决策层",
        "th": "ฝ่ายบริหารธุรกิจ + ผู้บริหาร",
    },
    "exec_header_type_value": {
        "zh": "战略决策层（趋势洞察+资源配置建议）",
        "th": "ระดับกลยุทธ์ (ข้อมูลเชิงลึก + คำแนะนำการจัดสรรทรัพยากร)",
    },
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
