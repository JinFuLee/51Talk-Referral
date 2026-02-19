"""
51Talk 转介绍周报自动生成 - 数据处理模块
使用zipfile+xml读取Excel以绕过openpyxl兼容性问题
"""
import zipfile
import xml.etree.ElementTree as ET
import re
from pathlib import Path
from typing import Dict, List, Any, Optional, Tuple


class XlsxReader:
    """兼容性Excel读取器，使用zipfile+xml直接解析xlsx"""
    
    def __init__(self, file_path: str):
        self.file_path = Path(file_path)
        self.shared_strings: List[str] = []
        self.sheets_data: Dict[str, List[Dict]] = {}
        self._load()
    
    def _load(self):
        """加载Excel文件"""
        with zipfile.ZipFile(self.file_path, 'r') as z:
            self._load_shared_strings(z)
            self._load_all_sheets(z)
    
    def _load_shared_strings(self, z: zipfile.ZipFile):
        """加载共享字符串表"""
        if 'xl/sharedStrings.xml' not in z.namelist():
            return
        
        with z.open('xl/sharedStrings.xml') as f:
            tree = ET.parse(f)
            root = tree.getroot()
            ns = {'main': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
            
            for si in root.findall('.//main:si', ns):
                text = ''
                for t in si.findall('.//main:t', ns):
                    if t.text:
                        text += t.text
                self.shared_strings.append(text)
    
    def _load_all_sheets(self, z: zipfile.ZipFile):
        """加载所有工作表"""
        # 获取sheet名称映射
        sheets_info = {}
        if 'xl/workbook.xml' in z.namelist():
            with z.open('xl/workbook.xml') as f:
                tree = ET.parse(f)
                root = tree.getroot()
                ns = {'main': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
                for i, sheet in enumerate(root.findall('.//main:sheet', ns)):
                    sheets_info[sheet.get('name')] = f'xl/worksheets/sheet{i+1}.xml'
        
        # 加载每个sheet的数据
        for sheet_name, sheet_path in sheets_info.items():
            if sheet_path in z.namelist():
                self.sheets_data[sheet_name] = self._load_sheet(z, sheet_path)
    
    def _load_sheet(self, z: zipfile.ZipFile, sheet_path: str) -> List[Dict]:
        """加载单个工作表数据"""
        rows_data = []
        with z.open(sheet_path) as f:
            tree = ET.parse(f)
            root = tree.getroot()
            ns = {'main': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
            
            for row in root.findall('.//main:sheetData/main:row', ns):
                row_dict = {}
                row_num = int(row.get('r'))
                
                for cell in row.findall('main:c', ns):
                    cell_ref = cell.get('r')
                    cell_type = cell.get('t')
                    value_elem = cell.find('main:v', ns)
                    value = value_elem.text if value_elem is not None else None
                    
                    # 处理共享字符串类型
                    if cell_type == 's' and value:
                        idx = int(value)
                        if idx < len(self.shared_strings):
                            value = self.shared_strings[idx]
                    
                    # 提取列名
                    col = self._extract_column(cell_ref)
                    row_dict[col] = value
                
                row_dict['_row'] = row_num
                rows_data.append(row_dict)
        
        return rows_data
    
    @staticmethod
    def _extract_column(cell_ref: str) -> str:
        """从单元格引用中提取列名 (如 'AB123' -> 'AB')"""
        return re.sub(r'\d+', '', cell_ref)
    
    def get_sheet_names(self) -> List[str]:
        """获取所有工作表名称"""
        return list(self.sheets_data.keys())
    
    def get_sheet_data(self, sheet_name: str) -> List[Dict]:
        """获取指定工作表的数据"""
        return self.sheets_data.get(sheet_name, [])
    
    def get_first_sheet_data(self) -> Tuple[str, List[Dict]]:
        """获取第一个工作表的数据"""
        if self.sheets_data:
            name = list(self.sheets_data.keys())[0]
            return name, self.sheets_data[name]
        return "", []


class DataProcessor:
    """转介绍业务数据处理器"""
    
    # 数据起始行号（1-indexed）
    DATA_START_ROW = 6
    
    def __init__(self, xlsx_reader: XlsxReader):
        self.reader = xlsx_reader
        self.monthly_summaries: Dict[str, Dict] = {}  # 按月份存储汇总数据
        self.all_rows: List[Dict] = []   # 所有原始数据行
        self.process()  # 自动处理数据
    
    def process(self) -> Dict[str, Any]:
        """处理数据，返回结构化结果"""
        # 获取第一个sheet的数据（假设是主数据表）
        _, rows = self.reader.get_first_sheet_data()
        
        if not rows:
            raise ValueError("未找到数据")
        
        # 过滤掉表头行（前5行）
        data_rows = [r for r in rows if r.get('_row', 0) >= self.DATA_START_ROW]
        
        for row in data_rows:
            month = row.get('A', '')
            cc_group = row.get('B', '')
            
            # 存储所有行数据
            self.all_rows.append(row)
            
            # 只处理"小计"行作为月度汇总
            if cc_group == '小计':
                self.monthly_summaries[month] = self._extract_row_data(row)
        
        return {
            "monthly_summaries": self.monthly_summaries,
            "all_rows": self.all_rows,
            "months": sorted(self.monthly_summaries.keys())
        }
    
    def _extract_row_data(self, row: Dict) -> Dict[str, Any]:
        """提取一行的完整数据"""
        def safe_float(val):
            if val is None or val == '-' or val == '':
                return None
            try:
                return float(val)
            except (ValueError, TypeError):
                return None
        
        def safe_int(val):
            if val is None or val == '-' or val == '':
                return None
            try:
                return int(float(val))
            except (ValueError, TypeError):
                return None
        
        return {
            "月份": row.get('A'),
            "CC组": row.get('B'),
            # 总计口径
            "总计_注册": safe_int(row.get('C')),
            "总计_预约": safe_int(row.get('D')),
            "总计_出席": safe_int(row.get('E')),
            "总计_付费": safe_int(row.get('F')),
            "总计_美金金额": safe_int(row.get('G')),
            "总计_注册付费率": safe_float(row.get('H')),
            "总计_预约率": safe_float(row.get('I')),
            "总计_预约出席率": safe_float(row.get('J')),
            "总计_出席付费率": safe_float(row.get('K')),
            # CC窄口径
            "CC窄口径_注册": safe_int(row.get('L')),
            "CC窄口径_预约": safe_int(row.get('M')),
            "CC窄口径_出席": safe_int(row.get('N')),
            "CC窄口径_付费": safe_int(row.get('O')),
            "CC窄口径_美金金额": safe_int(row.get('P')),
            "CC窄口径_注册付费率": safe_float(row.get('Q')),
            "CC窄口径_预约率": safe_float(row.get('R')),
            "CC窄口径_预约出席率": safe_float(row.get('S')),
            "CC窄口径_出席付费率": safe_float(row.get('T')),
            # SS窄口径
            "SS窄口径_注册": safe_int(row.get('U')),
            "SS窄口径_预约": safe_int(row.get('V')),
            "SS窄口径_出席": safe_int(row.get('W')),
            "SS窄口径_付费": safe_int(row.get('X')),
            "SS窄口径_美金金额": safe_int(row.get('Y')),
            "SS窄口径_注册付费率": safe_float(row.get('Z')),
            "SS窄口径_预约率": safe_float(row.get('AA')),
            "SS窄口径_预约出席率": safe_float(row.get('AB')),
            "SS窄口径_出席付费率": safe_float(row.get('AC')),
            # 其它口径
            "其它_注册": safe_int(row.get('AD')),
            "其它_预约": safe_int(row.get('AE')),
            "其它_出席": safe_int(row.get('AF')),
            "其它_付费": safe_int(row.get('AG')),
            "其它_美金金额": safe_int(row.get('AH')),
            "其它_注册付费率": safe_float(row.get('AI')),
            "其它_预约率": safe_float(row.get('AJ')),
            "其它_预约出席率": safe_float(row.get('AK')),
            "其它_出席付费率": safe_float(row.get('AL')),
        }
    
    def get_monthly_summaries(self) -> Dict[str, Dict]:
        """获取月度汇总数据"""
        return self.monthly_summaries
    
    def get_sorted_months(self) -> List[str]:
        """获取排序后的月份列表"""
        return sorted(self.monthly_summaries.keys())
    
    def calculate_growth(self, current_month: str, previous_month: str) -> Dict[str, Optional[float]]:
        """计算两个月份之间的环比增长率"""
        if current_month not in self.monthly_summaries or previous_month not in self.monthly_summaries:
            return {}
        
        current = self.monthly_summaries[current_month]
        previous = self.monthly_summaries[previous_month]
        growth = {}
        
        for key in current:
            if key in ["月份", "CC组"]:
                continue
            
            curr_val = current.get(key)
            prev_val = previous.get(key)
            
            if curr_val is not None and prev_val is not None and prev_val != 0:
                growth[key] = (curr_val - prev_val) / prev_val
            else:
                growth[key] = None
        
        return growth


def load_and_process(file_path: str) -> Dict[str, Any]:
    """加载并处理Excel文件的便捷函数"""
    reader = XlsxReader(file_path)
    processor = DataProcessor(reader)
    return processor.process()


if __name__ == "__main__":
    # 测试代码
    import sys
    if len(sys.argv) > 1:
        file_path = sys.argv[1]
    else:
        file_path = "/Users/felixmacbookairm4/Desktop/Antigravity/Project/51talk/51talk转介绍业务数据/转介绍不同口径对比_20260119_1755.xlsx"
    
    result = load_and_process(file_path)
    print("=== 月度汇总数据 ===")
    for month in result["months"]:
        summary = result["monthly_summaries"][month]
        print(f"\n{month}:")
        print(f"  总计: 注册={summary['总计_注册']}, 付费={summary['总计_付费']}, 金额={summary['总计_美金金额']}")
