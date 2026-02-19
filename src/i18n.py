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

    # M4 Phase 2 新章节
    "section_cohort": {"zh": "围场生命周期分析", "th": "วิเคราะห์วงจรชีวิตตามช่วง"},
    "section_checkin": {"zh": "转介绍参与行为分析", "th": "วิเคราะห์พฤติกรรมการมีส่วนร่วม"},
    "section_leads": {"zh": "全团队 Leads 漏斗对标", "th": "เปรียบเทียบ Leads Funnel ทุกทีม"},
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
    "action_first_time": {"zh": "首次生成报告，行动追踪将从下次开始", "th": "รายงานครั้งแรก การติดตามแผนจะเริ่มครั้งถัดไป"},
    "action_completed": {"zh": "已完成", "th": "เสร็จแล้ว"},
    "action_pending": {"zh": "待执行", "th": "รอดำเนินการ"},
    "action_completion_rate": {"zh": "行动执行率", "th": "อัตราดำเนินการ"},

    # M7 快速入门引导
    "welcome_title": {"zh": "快速入门", "th": "เริ่มต้นอย่างรวดเร็ว"},
    "welcome_subtitle": {"zh": "欢迎使用 51Talk 转介绍运营分析面板！按以下步骤开始：", "th": "ยินดีต้อนรับสู่ 51Talk แดชบอร์ดวิเคราะห์การแนะนำ! เริ่มต้นด้วยขั้นตอนต่อไปนี้:"},
    "guide_step1": {"zh": "1️⃣ 配置数据源路径", "th": "1️⃣ ตั้งค่าพาธแหล่งข้อมูล"},
    "guide_step1_desc": {"zh": "在左侧栏「数据文件夹路径」中输入包含所有数据源的文件夹路径（如 input/）", "th": "ใส่พาธโฟลเดอร์ที่มีแหล่งข้อมูลทั้งหมดในช่อง「พาธโฟลเดอร์ข้อมูล」ทางซ้าย (เช่น input/)"},
    "guide_step2": {"zh": "2️⃣ 确认数据源文件", "th": "2️⃣ ยืนยันไฟล์แหล่งข้อมูล"},
    "guide_step2_desc": {"zh": "查看左侧栏「数据源状态」区域，确保至少有核心数据源（转介绍不同口径对比）显示为 ✅", "th": "ตรวจสอบพื้นที่「สถานะแหล่งข้อมูล」ทางซ้าย ตรวจสอบว่ามีแหล่งข้อมูลหลัก (เปรียบเทียบช่องทางแนะนำ) แสดง ✅"},
    "guide_step3": {"zh": "3️⃣ 生成报告", "th": "3️⃣ สร้างรายงาน"},
    "guide_step3_desc": {"zh": "点击左侧栏底部的「🚀 生成报告」按钮，等待数据处理完成后，即可在各个 Tab 中查看报告内容", "th": "คลิกปุ่ม「🚀 สร้างรายงาน」ด้านล่างทางซ้าย รอการประมวลผลข้อมูล จากนั้นดูรายงานใน Tab ต่างๆ"},

    # M7 通知配置 UI
    "notify_title": {"zh": "通知设置", "th": "การตั้งค่าการแจ้งเตือน"},
    "notify_settings": {"zh": "配置邮件 / LINE 通知", "th": "ตั้งค่าการแจ้งเตือนทาง Email / LINE"},
    "notify_email_section": {"zh": "📧 邮件通知", "th": "📧 การแจ้งเตือนทาง Email"},
    "notify_email_enabled": {"zh": "启用邮件通知", "th": "เปิดการแจ้งเตือนทาง Email"},
    "notify_email_smtp_host": {"zh": "SMTP 服务器", "th": "เซิร์ฟเวอร์ SMTP"},
    "notify_email_smtp_port": {"zh": "SMTP 端口", "th": "พอร์ต SMTP"},
    "notify_email_from": {"zh": "发件人地址", "th": "ที่อยู่ผู้ส่ง"},
    "notify_email_to": {"zh": "收件人地址", "th": "ที่อยู่ผู้รับ"},
    "notify_email_cred_file": {"zh": "凭证文件路径", "th": "พาธไฟล์ข้อมูลรับรอง"},
    "help_email_to": {"zh": "多个收件人用逗号分隔", "th": "ใช้เครื่องหมายจุลภาคคั่นผู้รับหลายคน"},
    "notify_line_section": {"zh": "💬 LINE 通知", "th": "💬 การแจ้งเตือนทาง LINE"},
    "notify_line_enabled": {"zh": "启用 LINE 通知", "th": "เปิดการแจ้งเตือนทาง LINE"},
    "notify_line_token": {"zh": "LINE Notify Token", "th": "LINE Notify Token"},
    "notify_line_cred_file": {"zh": "凭证文件路径", "th": "พาธไฟล์ข้อมูลรับรอง"},
    "btn_test_notify": {"zh": "💾 保存并发送测试通知", "th": "💾 บันทึกและส่งการแจ้งเตือนทดสอบ"},
    "msg_test_notify_success": {"zh": "✅ 通知配置已保存，测试通知已发送（如启用）", "th": "✅ บันทึกการตั้งค่าแล้ว ส่งการแจ้งเตือนทดสอบแล้ว (หากเปิดใช้งาน)"},
    "msg_test_notify_failed": {"zh": "⚠️ 测试通知发送失败", "th": "⚠️ การส่งการแจ้งเตือนทดสอบล้มเหลว"},

    # M7 调度日志查看器
    "schedule_log_title": {"zh": "调度历史", "th": "ประวัติการจัดตาราง"},
    "schedule_log_filter": {"zh": "状态筛选", "th": "กรองสถานะ"},
    "schedule_log_all": {"zh": "全部", "th": "ทั้งหมด"},
    "schedule_log_success": {"zh": "成功", "th": "สำเร็จ"},
    "schedule_log_failed": {"zh": "失败", "th": "ล้มเหลว"},
    "schedule_log_col_time": {"zh": "执行时间", "th": "เวลาดำเนินการ"},
    "schedule_log_col_status": {"zh": "状态", "th": "สถานะ"},
    "schedule_log_col_duration": {"zh": "耗时", "th": "ระยะเวลา"},
    "schedule_log_col_report": {"zh": "报告文件", "th": "ไฟล์รายงาน"},
    "schedule_log_col_error": {"zh": "错误信息", "th": "ข้อความผิดพลาด"},
    "schedule_log_showing": {"zh": "显示", "th": "แสดง"},
    "schedule_log_empty": {"zh": "暂无调度记录", "th": "ยังไม่มีบันทึกการจัดตาราง"},
    "schedule_log_not_found": {"zh": "未找到调度日志文件", "th": "ไม่พบไฟล์บันทึกการจัดตาราง"},
    "schedule_log_error": {"zh": "读取日志失败", "th": "อ่านบันทึกล้มเหลว"},
    "schedule_next_run": {"zh": "下次执行时间", "th": "เวลาดำเนินการครั้งถัดไป"},
    "header_report_download": {"zh": "历史报告下载", "th": "ดาวน์โหลดรายงานย้อนหลัง"},

    # 对比月份选择器
    "compare_label": {"zh": "对比月份", "th": "เดือนเปรียบเทียบ"},
    "compare_none": {"zh": "不对比", "th": "ไม่เปรียบเทียบ"},
    "compare_last_month": {"zh": "对比上月", "th": "เทียบเดือนก่อน"},
    "compare_yoy": {"zh": "对比去年同期", "th": "เทียบปีก่อน"},
    "compare_custom": {"zh": "自定义月份", "th": "เลือกเดือนเอง"},
    "compare_custom_date": {"zh": "选择对比月份", "th": "เลือกเดือนเปรียบเทียบ"},
    "compare_no_data": {"zh": "对比数据不可用", "th": "ข้อมูลเปรียบเทียบไม่พร้อม"},

    # 角色权限
    "role_label": {"zh": "角色", "th": "บทบาท"},
    "role_ops": {"zh": "运营", "th": "ฝ่ายปฏิบัติการ"},
    "role_exec": {"zh": "管理层", "th": "ผู้บริหาร"},
    "role_finance": {"zh": "财务", "th": "ฝ่ายการเงิน"},
    "role_access_denied": {"zh": "当前角色无权访问此内容", "th": "บทบาทปัจจุบันไม่มีสิทธิ์เข้าถึง"},

    # M7+ 异常检测
    "anomaly_alert": {"zh": "异常预警", "th": "แจ้งเตือนความผิดปกติ"},
    "anomaly_none": {"zh": "所有指标正常", "th": "ตัวชี้วัดทั้งหมดปกติ"},
    "anomaly_metric": {"zh": "异常指标", "th": "ตัวชี้วัดผิดปกติ"},
    "anomaly_threshold": {"zh": "阈值", "th": "ค่าเกณฑ์"},
    "anomaly_current": {"zh": "当前值", "th": "ค่าปัจจุบัน"},
    "anomaly_team_avg": {"zh": "团队均值", "th": "ค่าเฉลี่ยทีม"},
    "anomaly_suggestion": {"zh": "建议动作", "th": "ข้อแนะนำ"},
    "anomaly_severity_high": {"zh": "严重", "th": "ร้ายแรง"},
    "anomaly_severity_mid": {"zh": "中等", "th": "ปานกลาง"},
    "anomaly_details": {"zh": "详细信息", "th": "รายละเอียด"},

    # M7+ 通知测试反馈
    "notify_success": {"zh": "测试通知已发送", "th": "ส่งการแจ้งเตือนทดสอบแล้ว"},
    "notify_fail_smtp": {"zh": "SMTP 连接失败", "th": "เชื่อมต่อ SMTP ล้มเหลว"},
    "notify_fail_auth": {"zh": "认证失败", "th": "การยืนยันตัวตนล้มเหลว"},
    "notify_fail_token": {"zh": "Token 无效", "th": "Token ไม่ถูกต้อง"},
    "notify_fail_network": {"zh": "网络超时", "th": "เครือข่ายหมดเวลา"},
    "notify_error_detail": {"zh": "错误详情", "th": "รายละเอียดข้อผิดพลาด"},
    "notify_check_server": {"zh": "请检查服务器地址", "th": "กรุณาตรวจสอบที่อยู่เซิร์ฟเวอร์"},
    "notify_check_credentials": {"zh": "请检查用户名和密码", "th": "กรุณาตรวจสอบชื่อผู้ใช้และรหัสผ่าน"},
    "notify_check_token": {"zh": "请检查 LINE Token", "th": "กรุณาตรวจสอบ LINE Token"},
    "notify_check_network": {"zh": "请检查网络连接", "th": "กรุณาตรวจสอบการเชื่อมต่อเครือข่าย"},

    # M7+ 角色权限配置
    "role_config": {"zh": "权限配置", "th": "ตั้งค่าสิทธิ์"},
    "role_tabs": {"zh": "可见 Tab", "th": "Tab ที่มองเห็น"},
    "role_permission_hint": {"zh": "自定义当前角色可见的报告模块", "th": "กำหนดโมดูลรายงานที่บทบาทปัจจุบันเห็น"},

    # M7+ 数据质量指示器
    "data_quality_unavailable": {"zh": "数据源暂未接入，此部分数据为占位", "th": "แหล่งข้อมูลยังไม่เชื่อมต่อ ข้อมูลส่วนนี้เป็นตัวยึด"},
    "data_quality_estimated": {"zh": "需接入 CRM 数据，当前为预估值", "th": "ต้องการข้อมูล CRM ค่าปัจจุบันเป็นค่าประมาณ"},
    "data_quality_indicator": {"zh": "数据质量", "th": "คุณภาพข้อมูล"},

    # M7 Task #3 TOC 导航
    "toc_title": {"zh": "目录", "th": "สารบัญ"},
    "toc_ops": {"zh": "运营版目录", "th": "สารบัญฉบับปฏิบัติการ"},
    "toc_exec": {"zh": "管理层版目录", "th": "สารบัญฉบับผู้บริหาร"},

    # M7 Task #3 行动追踪增强
    "action_status_completed": {"zh": "已完成", "th": "เสร็จแล้ว"},
    "action_status_pending": {"zh": "待执行", "th": "รอดำเนินการ"},
    "action_status_overdue": {"zh": "逾期", "th": "เกินกำหนด"},
    "action_category_followup": {"zh": "跟进", "th": "ติดตาม"},
    "action_category_outreach": {"zh": "触达", "th": "เข้าถึง"},
    "action_category_training": {"zh": "培训", "th": "ฝึกอบรม"},
    "action_category_other": {"zh": "其他", "th": "อื่นๆ"},
    "action_execution_rate": {"zh": "执行率", "th": "อัตราดำเนินการ"},
    "action_previous_review": {"zh": "上期行动回顾", "th": "ทบทวนแผนงวดก่อน"},
    "action_inherited": {"zh": "本期继承", "th": "รับช่วงต่อ"},
    "action_overdue_warning": {"zh": "逾期", "th": "เกินกำหนด"},

    # M7 Task #3 异常检测章节
    "anomaly_section_title": {"zh": "异常检测", "th": "ตรวจจับความผิดปกติ"},
    "anomaly_level_critical": {"zh": "严重", "th": "ร้ายแรง"},
    "anomaly_level_warning": {"zh": "警告", "th": "เตือน"},
    "anomaly_level_info": {"zh": "提示", "th": "แจ้ง"},
    "anomaly_indicator": {"zh": "指标", "th": "ตัวชี้วัด"},
    "anomaly_level": {"zh": "级别", "th": "ระดับ"},
    "anomaly_current_value": {"zh": "当前值", "th": "ค่าปัจจุบัน"},
    "anomaly_threshold_value": {"zh": "阈值", "th": "ค่าเกณฑ์"},
    "anomaly_recommendation": {"zh": "建议", "th": "คำแนะนำ"},
    "anomaly_impact": {"zh": "影响评估", "th": "ประเมินผลกระทบ"},
    "anomaly_none_detected": {"zh": "未检测到异常", "th": "ไม่พบความผิดปกติ"},
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
