"""
51Talk 转介绍周报自动生成 - 报告生成模块
使用xlsxwriter生成带公式和样式的Excel报告
"""
import xlsxwriter
import math
from pathlib import Path
from typing import Dict, List, Any, Optional
from datetime import datetime

from data_processor import DataProcessor, XlsxReader


class ReportGenerator:
    """Excel报告生成器"""
    
    # Sheet1 表头配置 (中泰双语)
    SHEET1_HEADERS_ROW1 = [
        "Referral YOY\n本月同比\nเทียบรายเดือน",
        "Total 总计\nรวม", "", "Total 总计\nรวม", "Total 总计\nรวม", "Total 总计\nรวม", "Total 总计\nรวม", "Total 总计\nรวม", "Total 总计\nรวม", "Total 总计\nรวม",
        "CC Narrow\nCC窄口径\nCC (แคบ)", "", "CC Narrow\nCC窄口径\nCC (แคบ)", "CC Narrow\nCC窄口径\nCC (แคบ)", "CC Narrow\nCC窄口径\nCC (แคบ)", "CC Narrow\nCC窄口径\nCC (แคบ)", "CC Narrow\nCC窄口径\nCC (แคบ)", "CC Narrow\nCC窄口径\nCC (แคบ)", "CC Narrow\nCC窄口径\nCC (แคบ)",
        "SS Narrow\nSS窄口径\nSS (แคบ)", "", "SS Narrow\nSS窄口径\nSS (แคบ)", "SS Narrow\nSS窄口径\nSS (แคบ)", "SS Narrow\nSS窄口径\nSS (แคบ)", "SS Narrow\nSS窄口径\nSS (แคบ)", "SS Narrow\nSS窄口径\nSS (แคบ)", "SS Narrow\nSS窄口径\nSS (แคบ)", "SS Narrow\nSS窄口径\nSS (แคบ)",
        "Broad(FB)\n宽口径\nกว้าง (FB)", "", "Others 其它\nอื่นๆ", "Others 其它\nอื่นๆ", "Others 其它\nอื่นๆ", "Others 其它\nอื่นๆ", "Others 其它\nอื่นๆ", "Others 其它\nอื่นๆ", "Others 其它\nอื่นๆ"
    ]
    
    # 双语二级表头
    COL_HEADERS = [
        "Register\n注册\nลงทะเบียน", "Book\n预约\nการจอง", "Attend\n出席\nเข้าเรียน", "Pay\n付费\nชำระเงิน", "Amount($)\n金额\nยอดขาย", 
        "Reg-Pay%\n注册付费率\n% ลงทะเบียน-ชำระ", "Book%\n预约率\n% การจอง", "Book-Attend%\n预约出席率\n% จอง-เข้าเรียน", "Attend-Pay%\n出席付费率\n% เข้าเรียน-ชำระ"
    ]
    
    # 动态生成 Row 2 (Header Row)
    SHEET1_HEADERS_ROW2 = [""] + COL_HEADERS * 4
    
    # Target Section Headers (New) - Used for the explicit header row above Target/Actual
    TARGET_SECTION_HEADERS = [
        "Register\n注册\nลงทะเบียน", "Book\n预约\nการจอง", "Attend\n出席\nเข้าเรียน", 
        "Pay\n付费\nชำระเงิน", "Amount($)\n金额\nยอดขาย", "Reg-Pay%\n注册付费率\n% แปลง"
    ]

    # Sheet2 表头 (简单双语)
    SHEET2_HEADERS_ROW1 = [
        "Type 类型\nประเภท", "Type 类型\nประเภท",
        "Total 总计\nรวม", "Total 总计\nรวม", "Total 总计\nรวม", "Total 总计\nรวม", "Total 总计\nรวม", "Total 总计\nรวม", "Total 总计\nรวม", "Total 总计\nรวม", "Total 总计\nรวม",
        "CC Narrow\nCC窄口径", "CC Narrow\nCC窄口径", "CC Narrow\nCC窄口径", "CC Narrow\nCC窄口径", "CC Narrow\nCC窄口径", "CC Narrow\nCC窄口径", "CC Narrow\nCC窄口径", "CC Narrow\nCC窄口径", "CC Narrow\nCC窄口径",
        "SS Narrow\nSS窄口径", "SS Narrow\nSS窄口径", "SS Narrow\nSS窄口径", "SS Narrow\nSS窄口径", "SS Narrow\nSS窄口径", "SS Narrow\nSS窄口径", "SS Narrow\nSS窄口径", "SS Narrow\nSS窄口径", "SS Narrow\nSS窄口径",
        "Others 其它", "Others 其它", "Others 其它", "Others 其它", "Others 其它", "Others 其它", "Others 其它", "Others 其它", "Others 其它"
    ]
    
    SHEET2_HEADERS_ROW2 = [
        "Month\n月份", "Group\n组别"
    ] + COL_HEADERS * 4
    
    def __init__(self, output_path: str, targets: Optional[Dict] = None):
        self.output_path = Path(output_path)
        self.targets = targets or {}
        self.workbook = None
        self.formats = {}
    
    def generate(self, processor: DataProcessor):
        """生成完整报告"""
        self.workbook = xlsxwriter.Workbook(str(self.output_path))
        self._create_formats()
        
        try:
            self._create_sheet1_analysis(processor)
            self._create_sheet2_raw_data(processor)
            self._create_sheet3_definitions() # New Sheet
            
        finally:
            self.workbook.close()
        
        return self.output_path
    
    def _create_formats(self):
        """创建Excel样式格式 - 浅色调高级主题 (Light Premium)"""
        
        # 基础颜色定义
        COLOR_HEADER_BG = '#F3F4F6' # Light Grey/Slate
        COLOR_HEADER_TEXT = '#1F2937' # Dark Grey
        COLOR_SUB_HEADER_BG = '#E5E7EB' # Slightly darker grey
        COLOR_BORDER = '#D1D5DB' # Light border
        
        # 表头样式 (Light Theme)
        self.formats['header'] = self.workbook.add_format({
            'bold': True,
            'bg_color': COLOR_HEADER_BG,
            'font_color': COLOR_HEADER_TEXT,
            'align': 'center',
            'valign': 'vcenter',
            'border': 1,
            'border_color': COLOR_BORDER,
            'text_wrap': True
        })
        
        # 副表头样式
        self.formats['sub_header'] = self.workbook.add_format({
            'bold': True,
            'bg_color': COLOR_SUB_HEADER_BG,
            'font_color': COLOR_HEADER_TEXT,
            'align': 'center',
            'valign': 'vcenter',
            'border': 1,
            'border_color': COLOR_BORDER,
            'text_wrap': True,
            'font_size': 9
        })
        
        # 数字格式
        self.formats['number'] = self.workbook.add_format({
            'num_format': '#,##0',
            'align': 'right',
            'border': 1,
            'border_color': COLOR_BORDER
        })
        
        # 百分比格式
        self.formats['percent'] = self.workbook.add_format({
            'num_format': '0.00%',
            'align': 'right',
            'border': 1,
            'border_color': COLOR_BORDER
        })
        
        # 货币格式
        self.formats['currency'] = self.workbook.add_format({
            'num_format': '$#,##0',
            'align': 'right',
            'border': 1,
            'border_color': COLOR_BORDER
        })
        
        # 普通单元格
        self.formats['normal'] = self.workbook.add_format({
            'align': 'center',
            'border': 1,
            'border_color': COLOR_BORDER
        })
        
        # 增长率/Gap 颜色保持原样 (Red/Green 很有用)，但背景色调淡一点以适应浅色主题
        self.formats['growth_positive'] = self.workbook.add_format({
            'num_format': '0.00%', 'align': 'right', 'border': 1, 'border_color': COLOR_BORDER,
            'font_color': '#166534', 'bg_color': '#DCFCE7' # green-100/700
        })
        self.formats['growth_negative'] = self.workbook.add_format({
            'num_format': '0.00%', 'align': 'right', 'border': 1, 'border_color': COLOR_BORDER,
            'font_color': '#991B1B', 'bg_color': '#FEE2E2' # red-100/700
        })

        self.formats['gap_positive'] = self.formats['growth_positive']
        self.formats['gap_negative'] = self.formats['growth_negative']
        
        self.formats['gap_num_positive'] = self.workbook.add_format({
            'num_format': '#,##0.0', 'align': 'right', 'border': 1, 'border_color': COLOR_BORDER,
            'font_color': '#166534', 'bg_color': '#DCFCE7'
        })
        self.formats['gap_num_negative'] = self.workbook.add_format({
            'num_format': '#,##0.0', 'align': 'right', 'border': 1, 'border_color': COLOR_BORDER,
            'font_color': '#991B1B', 'bg_color': '#FEE2E2'
        })
        
        # 标签样式
        self.formats['label'] = self.workbook.add_format({
            'bold': True,
            'align': 'left',
            'border': 1,
            'border_color': COLOR_BORDER,
            'bg_color': '#F9FAFB', # Very light grey
            'text_wrap': True
        })
        
        # 总结样式
        self.formats['summary'] = self.workbook.add_format({
            'align': 'left', 'valign': 'top', 'border': 1, 'border_color': COLOR_BORDER,
            'text_wrap': True, 'bg_color': '#FEF3C7' # Light Yellow
        })

        # --- 驾驶舱专属样式 ---
        self.formats['cockpit_title'] = self.workbook.add_format({
            'bold': True, 'font_size': 14, 'bg_color': '#1F4E78', 'font_color': 'white',
            'align': 'left', 'valign': 'vcenter', 'border': 1
        })
        self.formats['cockpit_metric_label'] = self.workbook.add_format({
            'bold': True, 'font_size': 11, 'bg_color': '#DDEBF7',
            'align': 'center', 'valign': 'vcenter', 'border': 1
        })
        self.formats['cockpit_metric_value'] = self.workbook.add_format({
            'bold': True, 'font_size': 14,
            'align': 'center', 'valign': 'vcenter', 'border': 1
        })
        self.formats['cockpit_metric_value_red'] = self.workbook.add_format({
            'bold': True, 'font_size': 14, 'font_color': '#C00000', 'bg_color': '#FFE6E6',
            'align': 'center', 'valign': 'vcenter', 'border': 1
        })
        self.formats['cockpit_metric_value_green'] = self.workbook.add_format({
            'bold': True, 'font_size': 14, 'font_color': '#006100', 'bg_color': '#C6EFCE',
            'align': 'center', 'valign': 'vcenter', 'border': 1
        })


    def _create_sheet1_analysis(self, processor: DataProcessor):
        """创建Sheet1 - 战略驾驶舱 + 数据引擎"""
        sheet = self.workbook.add_worksheet("Dashboard")
        
        # 设置列宽
        sheet.set_column('A:A', 20)
        sheet.set_column('B:AK', 12)
        
        # 1. 提取核心数据
        months = processor.get_sorted_months()
        latest_month = months[-1] if months else None
        latest_data = processor.get_monthly_summaries().get(latest_month, {}) if latest_month else {}
        targets = self.targets
        
        # 2. 绘制战略驾驶舱 (Top Zone)
        self._create_strategic_cockpit(sheet, latest_data, targets, processor)
        
        # 3. 绘制数据引擎室 (Bottom Zone)
        # 假设驾驶舱占用前 15 行，我们从第 18 行开始 (0-indexed 17)
        DATA_START_ROW = 18 # Shift down slightly for extra cockpit rows
        self._create_data_table(sheet, DATA_START_ROW, processor)

    def _create_strategic_cockpit(self, sheet, data, targets, processor):
        """绘制顶部战略仪表盘"""
        # 提取指标
        reg_act = data.get("总计_注册", 0) or 0
        pay_act = data.get("总计_付费", 0) or 0
        rev_act = data.get("总计_美金金额", 0) or 0
        
        reg_kpi = targets.get("注册目标", 779)
        pay_kpi = targets.get("付费目标", 179)
        rate_kpi = targets.get("目标转化率", 0.23)
        time_progress = targets.get("时间进度", 0.0) # e.g. 0.89

        # --- A. 每日生死线 (Daily Velocity) ---
        # 逻辑：还需要完成多少 / 剩余天数 (假设30天为基准，简单反推)
        # Effective days elapsed ~= 30 * time_progress
        # Effective days remaining ~= 30 * (1 - time_progress)
        days_in_month = 30 # 简化
        days_remaining = max(1, days_in_month * (1 - time_progress))
        
        pay_remaining = max(0, pay_kpi - pay_act)
        req_daily_pay = pay_remaining / days_remaining
        
        # 实际日均 (Past Velocity)
        days_elapsed = max(1, days_in_month * time_progress)
        act_daily_pay = pay_act / days_elapsed
        
        status_color = self.formats['cockpit_metric_value_green'] if act_daily_pay >= req_daily_pay else self.formats['cockpit_metric_value_red']
        status_text = "⚠️ 滞后 (BEHIND)" if act_daily_pay < req_daily_pay else "✅ 领先 (AHEAD)"
        
        # 绘制 Zone A
        sheet.merge_range('A1:H1', "🏎️ 每日生死线 (DAILY VELOCITY) - Time Pacing: {:.1%}".format(time_progress), self.formats['cockpit_title'])
        
        labels = ["Target Pay/Day\n目标日均", "Actual Pay/Day\n实际日均", "Gap/Day\n每日缺口", "Status\n状态"]
        values = [req_daily_pay, act_daily_pay, act_daily_pay - req_daily_pay, status_text]
        formats = [self.formats['number'], self.formats['number'], self.formats['number'], status_color]
        
        for i, (lbl, val, fmt) in enumerate(zip(labels, values, formats)):
            sheet.merge_range(1, i*2, 1, i*2+1, lbl, self.formats['cockpit_metric_label'])
            # 如果是数字，应用小数格式
            final_fmt = fmt
            if isinstance(val, float) or isinstance(val, int):
                # 如果是gap且为负，显示红色
                if i == 2: 
                     final_fmt = self.formats['cockpit_metric_value_red'] if val < 0 else self.formats['cockpit_metric_value_green']
                else: 
                     if fmt == self.formats['number']: # hack override to bold large
                        final_fmt = self.formats['cockpit_metric_value']
            
            sheet.merge_range(2, i*2, 2, i*2+1, val, final_fmt)


        # --- B. 损失计算器 (Loss Calculator) ---
        # 逻辑：因为转化率未达标，损失了多少潜在单量？
        # Lost Deals = Reg Actual * (Target Rate - Actual Rate)
        # Lost Revenue = Lost Deals * Average Price (Assume Revenue/Pay Actual)
        if reg_act > 0 and pay_act > 0:
            act_rate = pay_act / reg_act
            avg_price = rev_act / pay_act
        else:
            act_rate = 0
            avg_price = 0
            
        rate_diff = rate_kpi - act_rate
        lost_deals = max(0, int(reg_act * rate_diff)) # Only count positive loss
        lost_revenue = lost_deals * avg_price
        
        sheet.merge_range('A5:H5', "💔 转化黑洞 (CONVERSION LOSS) - Cost of Inefficiency", self.formats['cockpit_title'])
        
        labels_b = ["Target Rate\n目标转化", "Actual Rate\n实际转化", "Lost Deals\n丢单量", "Wasted Revenue\n直接损失"]
        values_b = [rate_kpi, act_rate, lost_deals, lost_revenue]
        

            
        # Re-layout B: Title Row 4. Headers Row 5. Values Row 6.
        sheet.merge_range('A4:H4', "💔 转化黑洞 (CONVERSION LOSS) - Cost of Inefficiency", self.formats['cockpit_title'])
         
        for i, (lbl, val) in enumerate(zip(labels_b, values_b)):
             sheet.merge_range(5, i*2, 5, i*2+1, lbl, self.formats['cockpit_metric_label'])
             
             fmt = self.formats['cockpit_metric_value']
             if i < 2: 
                 fmt = self.workbook.add_format({'bold': True, 'font_size': 14, 'num_format': '0.0%', 'align': 'center', 'border': 1})
             elif i == 3:
                 fmt = self.formats['cockpit_metric_value_red']
                 
             sheet.merge_range(6, i*2, 6, i*2+1, val, fmt)

    def _create_data_table(self, sheet, start_row, processor: DataProcessor):
        """创建主要数据表格 (The Engine Room)"""
        
        # 写入表头 (Row 1 & 2 relative to start_row)
        for col, header in enumerate(self.SHEET1_HEADERS_ROW1):
            sheet.write(start_row, col, header, self.formats['header'])
        
        for col, header in enumerate(self.SHEET1_HEADERS_ROW2):
            sheet.write(start_row + 1, col, header, self.formats['sub_header'])
            
        # 获取月度汇总数据
        months = processor.get_sorted_months()
        summaries = processor.get_monthly_summaries()
        
        # 定义列顺序
        columns = [
            ("总计_注册", "number"), ("总计_预约", "number"), ("总计_出席", "number"),
            ("总计_付费", "number"), ("总计_美金金额", "number"),
            ("总计_注册付费率", "percent"), ("总计_预约率", "percent"),
            ("总计_预约出席率", "percent"), ("总计_出席付费率", "percent"),
            
            ("CC窄口径_注册", "number"), ("CC窄口径_预约", "number"), ("CC窄口径_出席", "number"),
            ("CC窄口径_付费", "number"), ("CC窄口径_美金金额", "number"),
            ("CC窄口径_注册付费率", "percent"), ("CC窄口径_预约率", "percent"),
            ("CC窄口径_预约出席率", "percent"), ("CC窄口径_出席付费率", "percent"),
            
            ("SS窄口径_注册", "number"), ("SS窄口径_预约", "number"), ("SS窄口径_出席", "number"),
            ("SS窄口径_付费", "number"), ("SS窄口径_美金金额", "number"),
            ("SS窄口径_注册付费率", "percent"), ("SS窄口径_预约率", "percent"),
            ("SS窄口径_预约出席率", "percent"), ("SS窄口径_出席付费率", "percent"),
            
            ("其它_注册", "number"), ("其它_预约", "number"), ("其它_出席", "number"),
            ("其它_付费", "number"), ("其它_美金金额", "number"),
            ("其它_注册付费率", "percent"), ("其它_预约率", "percent"),
            ("其它_预约出席率", "percent"), ("其它_出席付费率", "percent"),
        ]
        
        first_data_row = start_row + 2
        last_data_row = first_data_row + len(months) - 1
        
        # 写入各月数据
        for row_idx, month in enumerate(months):
            py_row = first_data_row + row_idx
            summary = summaries[month]
            
            sheet.write(py_row, 0, month, self.formats['normal'])
            
            for col_idx, (key, fmt_type) in enumerate(columns):
                value = summary.get(key)
                if value is not None:
                    sheet.write(py_row, col_idx + 1, value, self.formats[fmt_type])
                else:
                     sheet.write(py_row, col_idx + 1, "-", self.formats['normal'])
        
        # --- Add Conditional Formatting (Heatmaps) ---
        # 1. Rate Columns Heatmap (Red-Yellow-Green)
        rate_col_indices = [5,6,7,8, 14,15,16,17, 23,24,25,26, 32,33,34,35]
        start_rng = first_data_row + 1
        end_rng = last_data_row + 1
        
        for col_idx in rate_col_indices:
            col_letter = xlsxwriter.utility.xl_col_to_name(col_idx + 1)
            rng = f"{col_letter}{start_rng}:{col_letter}{end_rng}"
            sheet.conditional_format(rng, {
                'type': '3_color_scale',
                'min_color': '#f8696b', 'mid_color': '#ffeb84', 'max_color': '#63be7b'
            })

        # 2. Peak Highlighting (Bold + Highlight)
        # Highlight the Max Value in each column
        peak_highlight_fmt = self.workbook.add_format({'bold': True, 'font_color': '#C00000', 'bg_color': '#FFEB9C'}) # Red text on yellow
        
        for col_idx in range(len(columns)):
             col_letter = xlsxwriter.utility.xl_col_to_name(col_idx + 1)
             rng = f"{col_letter}{start_rng}:{col_letter}{end_rng}"
             
             # Highlight Top 1 (Max Value)
             sheet.conditional_format(rng, {
                 'type': 'top',
                 'criteria': 'top',
                 'value': 1,
                 'format': peak_highlight_fmt
             })

        current_row = last_data_row + 1
        
        # --- Growth Row ---
        if len(months) >= 2:
            growth_row = current_row
            sheet.write(growth_row, 0, "Growth(MoM)\n环比增长", self.formats['label'])
            
            r_curr = last_data_row + 1 # 1-based current row
            r_prev = r_curr - 1
            
            for col_idx, (key, fmt_type) in enumerate(columns):
                 col_letter = xlsxwriter.utility.xl_col_to_name(col_idx + 1)
                 # Ensure value is valid number for calculation
                 formula = f"=IF(OR({col_letter}{r_prev}=0, NOT(ISNUMBER({col_letter}{r_prev}))), 0, ({col_letter}{r_curr}-{col_letter}{r_prev})/{col_letter}{r_prev})"
                 
                 last_val = summaries[months[-1]].get(key) or 0
                 prev_val = summaries[months[-2]].get(key) or 0
                 res = 0
                 if prev_val: res = (last_val - prev_val) / prev_val
                 
                 fmt = self.formats['growth_positive'] if res >= 0 else self.formats['growth_negative']
                 sheet.write_formula(growth_row, col_idx + 1, formula, fmt, res)
                 
            current_row += 1

        # --- Vs Peak Row (Dynamic Formula) ---
        peak_row = current_row
        sheet.write(peak_row, 0, "Vs Peak (6yr)\n峰值对比\nเทียบสูงสุด", self.formats['label'])
        
        # Apply Conditional Formatting to Peak Row (Green>=0, Red<0)
        # Row index in Excel is peak_row + 1
        peak_row_idx_xl = peak_row + 1
        peak_rng_str = f"B{peak_row_idx_xl}:AK{peak_row_idx_xl}"
        
        sheet.conditional_format(peak_rng_str, {
            'type': 'cell', 'criteria': '>=', 'value': 0, 'format': self.formats['growth_positive']
        })
        sheet.conditional_format(peak_rng_str, {
            'type': 'cell', 'criteria': '<', 'value': 0, 'format': self.formats['growth_negative']
        })

        for col_idx in range(len(columns)):
             col_letter = xlsxwriter.utility.xl_col_to_name(col_idx + 1)
             rng = f"{col_letter}{start_rng}:{col_letter}{end_rng}"
             cur_cell = f"{col_letter}{end_rng}"
             
             # Formula: If Current or Max is invalid, show "-"
             # (Current - Max) / Max
             formula = f"=IF(OR(MAX({rng})=0, NOT(ISNUMBER({cur_cell}))), \"-\", ({cur_cell}-MAX({rng}))/MAX({rng}))"
             
             sheet.write_formula(peak_row, col_idx + 1, formula, self.formats['percent'])

        current_row += 1

        # Add Targets Section
        if self.targets:
             self._add_targets_section(sheet, current_row + 1, processor)


    # ... Keep _add_targets_section, _add_pacing_section, etc. as is ...
    # Wait, need to ensure they are included in the replacement block or kept.
    # The replacement is "EndLine: 664", which means I am replacing ALMOST EVERYTHING in the class.
    # I need to include the rest of the methods or use multiple chunks.
    # Since I am changing the main structure significantly, it is safer to replace the whole file or class.
    # But I only have 1 chunk allowed for `replace_file_content` per call? No, existing code says:
    # "Use this tool ONLY when you are making a SINGLE CONTIGUOUS block of edits"
    # I should use `multi_replace_file_content`? No, the instruction says "redesign entire generation logic".
    # I will replace the `ReportGenerator` class methods.
    
    # Actually, I should just verify if I deleted the helper methods in my replacement string.
    # I did not include them in the `ReplacementContent` above, so if I execute this, I will lose them!
    # I must include `_add_targets_section` and others in the replacement content OR stop before them.
    
    # Let's break this down.
    # 1. `generate`, `_create_formats`, `_create_sheet1_analysis`, `_create_strategic_cockpit`, `_create_data_table` 
    #    replace the old `generate`, `_create_formats`, `_create_sheet1_analysis`.
    # 2. I need to KEEP `_add_targets_section` and subsequent methods.
    
    # The old code starts `def _create_sheet1_analysis` at line 194.
    # Ends at line 287 (before `_add_targets_section`).
    
    # So I will replace from Line 54 (generate) to Line 287.
    # And I will inject the new methods there.
    
    # Wait, `_create_sheet2_raw_data` is defined at Line 592. 
    # My replacement includes `_create_sheet1_analysis` which calls `_create_data_table`.
    # I need to define `_create_data_table` as well.
    
    # Strategy: Replace lines 54 to 287 with the new logic. 
    # Be careful to match indentation.

    
    def _add_targets_section(self, sheet, start_row: int, processor: DataProcessor):
        """添加目标和进度部分"""
        targets = self.targets
        
        months = processor.get_sorted_months()
        latest_month = months[-1] if months else None
        latest_data = processor.get_monthly_summaries().get(latest_month, {}) if latest_month else {}
        
        reg_target = targets.get("注册目标", 0)
        pay_target = targets.get("付费目标", 0)
        amount_target = targets.get("金额目标", 0)
        rate_target = targets.get("目标转化率", 0)
        time_progress = targets.get("时间进度", 0)
        
        book_rate_target = targets.get("约课率目标", 0.77)
        attend_rate_target = targets.get("出席率目标", 0.66)
        
        """添加目标和进度部分 - Refactoring: Time Progress Above Keys"""
        targets = self.targets
        
        months = processor.get_sorted_months()
        latest_month = months[-1] if months else None
        latest_data = processor.get_monthly_summaries().get(latest_month, {}) if latest_month else {}
        
        reg_target = targets.get("注册目标", 0)
        pay_target = targets.get("付费目标", 0)
        amount_target = targets.get("金额目标", 0)
        rate_target = targets.get("目标转化率", 0)
        time_progress = targets.get("时间进度", 0)
        
        book_rate_target = targets.get("约课率目标", 0.77)
        attend_rate_target = targets.get("出席率目标", 0.66)
        
        book_target = int(reg_target * book_rate_target)
        attend_target = int(book_target * attend_rate_target)
        
        target_values = [reg_target, book_target, attend_target, pay_target, amount_target, rate_target]
        
        # Row: 时间进度 (Time Progress moved to Top)
        sheet.write(start_row, 0, f"Time Progress\n时间进度: {time_progress:.1%}", self.formats['label']) 
        
        # Row: Headers
        header_row = start_row + 1
        sheet.write(header_row, 0, f"KPIs for {latest_month or 'Month'}", self.formats['label'])
        for i, header in enumerate(self.TARGET_SECTION_HEADERS):
             sheet.write(header_row, i + 1, header, self.formats['sub_header'])
        
        # Row: 月目标
        target_row = header_row + 1
        sheet.write(target_row, 0, "Jan Target\n1月目标\nเป้าหมาย ม.ค.", self.formats['label'])
        sheet.write(target_row, 1, reg_target, self.formats['number'])
        sheet.write(target_row, 2, book_target, self.formats['number'])
        sheet.write(target_row, 3, attend_target, self.formats['number'])
        sheet.write(target_row, 4, pay_target, self.formats['number'])
        sheet.write(target_row, 5, amount_target, self.formats['number'])
        sheet.write(target_row, 6, rate_target, self.formats['percent'])
        
        # Row: 月完成
        complete_row = target_row + 1
        complete_values = [
            latest_data.get("总计_注册", 0) or 0,
            latest_data.get("总计_预约", 0) or 0,
            latest_data.get("总计_出席", 0) or 0,
            latest_data.get("总计_付费", 0) or 0,
            latest_data.get("总计_美金金额", 0) or 0,
            latest_data.get("总计_注册付费率", 0) or 0,
        ]
        
        sheet.write(complete_row, 0, "Jan Actual\n1月完成\nทำได้จริง", self.formats['label'])
        for i, val in enumerate(complete_values):
            fmt = self.formats['percent'] if i == 5 else self.formats['number']
            sheet.write(complete_row, i + 1, val, fmt)
        
        # Row: 效率进度
        progress_row = complete_row + 1
        target_excel_row = target_row + 1
        complete_excel_row = complete_row + 1
        
        sheet.write(progress_row, 0, "Efficiency\n效率进度\nความคืบหน้า", self.formats['label'])
        for col in range(1, 7):
            if col == 6: 
                sheet.write(progress_row, col, "", self.formats['normal'])
                continue
            
            col_letter = xlsxwriter.utility.xl_col_to_name(col)
            formula = f"=IF({col_letter}{target_excel_row}=0,0,{col_letter}{complete_excel_row}/{col_letter}{target_excel_row})"
            
            curr = complete_values[col-1]
            tgt = target_values[col-1]
            computed = 0.0
            if tgt != 0: computed = float(curr) / float(tgt)
            
            sheet.write_formula(progress_row, col, formula, self.formats['percent'], computed)
            
        # Row: 差距GAP
        gap_row = progress_row + 1
        progress_excel_row = progress_row + 1
        
        sheet.write(gap_row, 0, "GAP\n差距\nGAP", self.formats['label'])
        for col in range(1, 7):
            # Skip Rate for Gap too
            if col == 6:
                sheet.write(gap_row, col, "", self.formats['normal']) # Empty
                continue

            col_letter = xlsxwriter.utility.xl_col_to_name(col)
            # Use data from efficiency row for calculation
            formula = f"={col_letter}{progress_excel_row}-{time_progress}"
            
            curr = complete_values[col-1]
            tgt = target_values[col-1]
            progress_val = 0.0
            if tgt != 0: progress_val = float(curr) / float(tgt)
            computed_gap = progress_val - time_progress
            
            fmt = self.formats['gap_positive'] if computed_gap >= 0 else self.formats['gap_negative']
            sheet.write_formula(gap_row, col, formula, fmt, computed_gap)

        # 添加 Pacing & Forecast Section (新增)
        pacing_row = gap_row + 2
        self._add_pacing_section(sheet, pacing_row, complete_values, target_values, time_progress)
        
        # 添加 Funnel Diagnosis Section
        funnel_row = pacing_row + 5 
        self._add_funnel_diagnosis_section(sheet, funnel_row, complete_values, target_values)
        
        # 添加 Channel Contribution Section
        contrib_row = funnel_row + 5
        self._add_channel_contribution_section(sheet, contrib_row, processor)
    
        # 添加中泰双语总结
        summary_row = contrib_row + 6
        self._add_summary_section(sheet, summary_row, complete_values, target_values, time_progress)

    def _create_sheet3_definitions(self):
        """创建Sheet3 - 概念与公式定义 (Definitions)"""
        sheet = self.workbook.add_worksheet("Definitions")
        sheet.set_column('A:A', 25)
        sheet.set_column('B:B', 50)
        sheet.set_column('C:C', 40)
        
        headers = ["Metric 指标", "Definition 定义", "Formula 公式"]
        for i, h in enumerate(headers):
            sheet.write(0, i, h, self.formats['header'])
            
        definitions = [
            ("Time Progress\n时间进度", "当前已过时间占全月的比例 (Based on days)", "Current Day / Total Days"),
            ("Efficiency\n效率进度", "实际完成进度与目标之比", "Actual / Target"),
            ("GAP\n差距", "效率进度与时间进度的差值 (正值代表领先，负值代表落后)", "Efficiency - Time Progress"),
            ("CC Narrow\nCC窄口径", "Excluded Leads from specific sources", "Specific SQL Filter"),
            ("SS Narrow\nSS窄口径", "Excluded Leads from specific sources", "Specific SQL Filter"),
            ("Daily Velocity\n每日生死线", "为达成目标，剩余天数每日需完成单量", "(Target - Actual) / Remaining Days"),
            ("Conversion Loss\n转化黑洞", "因转化率低于目标而损失的潜在单量", "Reg * (Target Rate - Actual Rate)")
        ]
        
        for i, (metric, defi, form) in enumerate(definitions):
            row = i + 1
            sheet.write(row, 0, metric, self.formats['label'])
            sheet.write(row, 1, defi, self.formats['normal'])
            sheet.write(row, 2, form, self.formats['normal'])


    # ... keep the rest of the methods ...
    def _add_pacing_section(self, sheet, start_row, complete_values, target_values, time_progress):
        """添加速度与预测部分"""
        reg_act, book_act, attend_act, pay_act, rev_act, rate_act = complete_values
        reg_kpi, book_kpi, attend_kpi, pay_kpi, rev_kpi, rate_kpi = target_values
        
        remaining_progress = 1.0 - time_progress
        if remaining_progress <= 0: remaining_progress = 0.001 
        
        headers = ["Target 指标\nเป้าหมาย", "Remaining 剩余\nคงเหลือ", "Avg/Day 每日均值\nเฉลี่ยต่อวัน", "Req/Day 需日均\nต้องทำต่อวัน", "Gap/Day 速度差\nส่วนต่าง", "Forecast 预计月底\nคาดการณ์"]
        for col, header in enumerate(headers):
            sheet.write(start_row, col, header, self.formats['sub_header'])
            
        metrics = [
            ("Register 注册", reg_act, reg_kpi),
            ("Payment 付费", pay_act, pay_kpi),
            ("Revenue 金额", rev_act, rev_kpi)
        ]
        
        for i, (name, actual, target) in enumerate(metrics):
            row = start_row + 1 + i
            remaining = max(0, target - actual)
            
            cur_velocity = actual / time_progress if time_progress > 0 else 0
            
            projected_total = cur_velocity 
            daily_avg = projected_total / 30.0
            req_daily_avg = target / 30.0
            daily_gap = daily_avg - req_daily_avg
            
            forecast = actual + (cur_velocity * remaining_progress)
            
            sheet.write(row, 0, name, self.formats['label'])
            sheet.write(row, 1, remaining, self.formats['number'])
            sheet.write(row, 2, daily_avg, self.formats['gap_num_positive'] if daily_avg>0 else self.formats['number'])
            sheet.write(row, 3, req_daily_avg, self.formats['number'])
            
            fmt = self.formats['gap_num_positive'] if daily_gap >= 0 else self.formats['gap_num_negative']
            sheet.write(row, 4, daily_gap, fmt)
            sheet.write(row, 5, forecast, self.formats['number'])

    def _add_funnel_diagnosis_section(self, sheet, start_row, complete_values, target_values):
        """添加漏斗诊断部分"""
        headers = ["Stage 阶段\nระยะ", "Actual 实际转化\nจริง", "Target 目标模型\nเป้าหมาย", "Diff 差异\nส่วนต่าง", "Lost Orders 损失单量\nสูญเสีย"]
        for col, header in enumerate(headers):
            sheet.write(start_row, col, header, self.formats['sub_header'])
            
        reg_act, book_act, attend_act, pay_act, _, _ = complete_values
        reg_kpi, book_kpi, attend_kpi, pay_kpi, _, _ = target_values
        
        stages = [
            ("Reg->Book 约课率", reg_act, book_act, reg_kpi, book_kpi),
            ("Book->Attend 出席率", book_act, attend_act, book_kpi, attend_kpi),
            ("Attend->Pay 转化率", attend_act, pay_act, attend_kpi, pay_kpi),
            ("Reg->Pay 全链路", reg_act, pay_act, reg_kpi, pay_kpi)
        ]
        
        for i, (name, base_act, conv_act, base_kpi, conv_kpi) in enumerate(stages):
            row = start_row + 1 + i
            act_rate = conv_act / base_act if base_act > 0 else 0
            tgt_rate = conv_kpi / base_kpi if base_kpi > 0 else 0
            diff = act_rate - tgt_rate
            impact = base_act * diff
            
            sheet.write(row, 0, name, self.formats['label'])
            sheet.write(row, 1, act_rate, self.formats['percent'])
            sheet.write(row, 2, tgt_rate, self.formats['percent'])
            
            fmt_diff = self.formats['gap_positive'] if diff >= 0 else self.formats['gap_negative']
            sheet.write(row, 3, diff, fmt_diff)
            
            fmt_impact = self.formats['gap_num_positive'] if impact >= 0 else self.formats['gap_num_negative']
            sheet.write(row, 4, impact, fmt_impact)

    def _add_channel_contribution_section(self, sheet, start_row, processor: DataProcessor):
        """添加渠道贡献部分"""
        months = processor.get_sorted_months()
        latest_month = months[-1] if months else None
        if not latest_month: return
        
        data = processor.get_monthly_summaries()[latest_month]
        
        headers = ["Channel 渠道\nช่องทาง", "Reg 注册占比\n% ลงทะเบียน", "Pay 付费占比\n% ชำระเงิน", "Efficiency 效能指数\nดัชนี"]
        for col, header in enumerate(headers):
            sheet.write(start_row, col, header, self.formats['sub_header'])
            
        total_reg = data.get("总计_注册", 0) or 1
        total_pay = data.get("总计_付费", 0) or 1
        
        channels = [
            ("CC Narrow", "CC窄口径"),
            ("SS Narrow", "SS窄口径"),
            ("Others", "其它")
        ]
        
        for i, (name, key_prefix) in enumerate(channels):
            row = start_row + 1 + i
            c_reg = data.get(f"{key_prefix}_注册", 0)
            c_pay = data.get(f"{key_prefix}_付费", 0)
            
            reg_share = c_reg / total_reg
            pay_share = c_pay / total_pay
            eff_index = pay_share / reg_share if reg_share > 0 else 0
            
            sheet.write(row, 0, name, self.formats['label'])
            sheet.write(row, 1, reg_share, self.formats['percent'])
            sheet.write(row, 2, pay_share, self.formats['percent'])
            
            fmt = self.formats['growth_positive'] if eff_index >= 1.0 else self.formats['growth_negative']
            sheet.write(row, 3, eff_index, fmt)

    def _add_summary_section(self, sheet, start_row, complete_values, target_values, time_progress):
        """添加中泰双语总结 - Humanized Version"""
        reg_act, book_act, attend_act, pay_act, rev_act, rate_act = complete_values
        reg_kpi, _, _, pay_kpi, _, _ = target_values
        
        reg_pct = (reg_act / reg_kpi * 100) if reg_kpi else 0
        pay_pct = (pay_act / pay_kpi * 100) if pay_kpi else 0
        time_pct = time_progress * 100
        
        # Humanize: Use more natural phasing, first person perspective where appropriate
        # "We represent..." -> "Our performance shows..."
        
        reg_status = "ahead" if reg_pct >= time_pct else "behind"
        pay_status = "ahead" if pay_pct >= time_pct else "behind"
        
        cn_summary = (
            f"【1月运营简报】\n"
            f"本月截止目前，注册量达成 {int(reg_act)}，目标完成度 {reg_pct:.1f}%；付费量达成 {int(pay_act)}，目标完成度 {pay_pct:.1f}%。\n"
            f"从时间进度（{time_pct:.1f}%）来看，我们在注册环节暂时{reg_status}（{abs(reg_pct-time_pct):.1f}%），在付费环节{pay_status}（{abs(pay_pct-time_pct):.1f}%）。\n"
            f"建议：接下来的重点是弥补{reg_status if reg_status=='behind' else pay_status}的差距，确保持续的转化效率。"
        )
        
        th_summary = (
            f"【สรุปผลการดำเนินงานเดือนมกราคม】\n"
            f"ภาพรวมปัจจุบัน: ลงทะเบียน {int(reg_act)} ราย ({reg_pct:.1f}%) และชำระเงิน {int(pay_act)} ราย ({pay_pct:.1f}%)\n"
            f"เมื่อเทียบกับเวลา ({time_pct:.1f}%): เรากำลัง{'(นำหน้า)' if reg_pct>=time_pct else '(ตามหลัง)'}เป้าหมายในส่วนของการลงทะเบียน "
            f"และ{'(นำหน้า)' if pay_pct>=time_pct else '(ตามหลัง)'}เป้าหมายการชำระเงิน\n"
            f"ข้อเสนอแนะ: เราควรโฟกัสที่การปิดช่องว่างในส่วนที่ยังตามหลังอยู่"
        )
        
        sheet.merge_range(start_row, 0, start_row, 8, cn_summary, self.formats['summary'])
        sheet.set_row(start_row, 60)
        
        sheet.merge_range(start_row + 1, 0, start_row + 1, 8, th_summary, self.formats['summary'])
        sheet.set_row(start_row + 1, 60)
            
    def _create_sheet2_raw_data(self, processor: DataProcessor):
        """创建Sheet2 - 原始数据表"""
        sheet = self.workbook.add_worksheet("转介绍不同口径对比")
        
        # 设置列宽
        sheet.set_column('A:A', 12)
        sheet.set_column('B:B', 15)
        sheet.set_column('C:AL', 10)
        
        # 写入表头 Row 1
        for col, header in enumerate(self.SHEET2_HEADERS_ROW1):
            sheet.write(0, col, header, self.formats['header'])
        
        # 写入表头 Row 2
        for col, header in enumerate(self.SHEET2_HEADERS_ROW2):
            sheet.write(1, col, header, self.formats['sub_header'])
        
        # 获取所有行数据
        all_rows = processor.all_rows
        
        # 列映射
        col_keys = [
            'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K',
            'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T',
            'U', 'V', 'W', 'X', 'Y', 'Z', 'AA', 'AB', 'AC',
            'AD', 'AE', 'AF', 'AG', 'AH', 'AI', 'AJ', 'AK', 'AL'
        ]
        
        # 百分比列索引 (0-indexed)
        percent_cols = {7, 8, 9, 10, 16, 17, 18, 19, 25, 26, 27, 28, 34, 35, 36, 37}
        
        # 写入数据行
        for row_idx, row_data in enumerate(all_rows):
            excel_row = 2 + row_idx
            
            for col_idx, key in enumerate(col_keys):
                value = row_data.get(key)
                
                if value is None or value == '':
                    continue
                
                if value == '-':
                    sheet.write(excel_row, col_idx, '-', self.formats['normal'])
                elif col_idx in percent_cols:
                    try:
                        sheet.write(excel_row, col_idx, float(value), self.formats['percent'])
                    except (ValueError, TypeError):
                        sheet.write(excel_row, col_idx, value, self.formats['normal'])
                elif col_idx >= 2:  # 数值列
                    try:
                        val = float(value)
                        if val == int(val):
                            sheet.write(excel_row, col_idx, int(val), self.formats['number'])
                        else:
                            sheet.write(excel_row, col_idx, val, self.formats['number'])
                    except (ValueError, TypeError):
                        sheet.write(excel_row, col_idx, value, self.formats['normal'])
                else:
                    sheet.write(excel_row, col_idx, value, self.formats['normal'])


def generate_report(
    input_path: str,
    output_path: str,
    targets: Optional[Dict] = None
) -> Path:
    """便捷函数：从输入文件生成报告"""
    reader = XlsxReader(input_path)
    processor = DataProcessor(reader)
    processor.process()
    
    generator = ReportGenerator(output_path, targets)
    return generator.generate(processor)
