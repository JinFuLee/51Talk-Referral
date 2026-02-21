"""统一数据加载基础类"""
from pathlib import Path
from typing import Optional
import logging
import math

logger = logging.getLogger(__name__)


class BaseLoader:
    """所有分类 Loader 的基类"""

    # 别名映射（EA→SS, CM→LP）
    ALIAS_MAP = {"EA": "SS", "ea": "SS", "CM": "LP", "cm": "LP"}

    def __init__(self, input_dir: Path):
        self.input_dir = Path(input_dir)

    def _find_latest_file(self, subdir: str) -> Optional[Path]:
        """在子目录中找到最新的 xlsx 文件（按文件名中的时间戳排序）"""
        target_dir = self.input_dir / subdir
        if not target_dir.exists():
            logger.warning(f"目录不存在: {target_dir}")
            return None
        xlsx_files = sorted(
            [f for f in target_dir.glob("*.xlsx") if not f.name.startswith(".")],
            key=lambda p: p.name,
            reverse=True,
        )
        return xlsx_files[0] if xlsx_files else None

    def _read_xlsx_pandas(self, path: Path, sheet_name=0, header=0, skiprows=None):
        """使用 pandas 读取 Excel，统一异常处理，优先 openpyxl，fallback calamine"""
        import pandas as pd
        import warnings

        try:
            with warnings.catch_warnings():
                warnings.filterwarnings("ignore", category=UserWarning, module="openpyxl")
                df = pd.read_excel(
                    path,
                    sheet_name=sheet_name,
                    header=header,
                    skiprows=skiprows,
                    engine="openpyxl",
                )
            return df
        except Exception as e:
            logger.warning(f"openpyxl 读取失败，尝试 calamine: {e}")
            try:
                df = pd.read_excel(
                    path,
                    sheet_name=sheet_name,
                    header=header,
                    skiprows=skiprows,
                    engine="calamine",
                )
                return df
            except Exception as e2:
                logger.error(f"所有引擎读取失败 {path}: {e2}")
                import pandas as pd
                return pd.DataFrame()

    def _normalize_alias(self, text: str) -> str:
        """规范化别名：EA→SS, CM→LP"""
        if not isinstance(text, str):
            return str(text)
        for alias, standard in self.ALIAS_MAP.items():
            text = text.replace(alias, standard)
        return text

    @staticmethod
    def _normalize_team(name: str) -> str:
        """规范化团队名：'-'/'—'/'nan'/空 → 'THCC'"""
        if not name or str(name).strip() in ("-", "—", "nan", "NaN", ""):
            return "THCC"
        return str(name).strip()

    def _clean_numeric(self, val) -> Optional[float]:
        """清洗数值：处理 '-', 'NaN', None, 空字符串"""
        if val is None:
            return None
        if isinstance(val, (int, float)):
            if isinstance(val, float) and math.isnan(val):
                return None
            return float(val)
        s = str(val).strip()
        if s in ("-", "NaN", "nan", "", "—", "N/A", "#N/A"):
            return None
        try:
            return float(s.replace(",", "").replace("%", ""))
        except ValueError:
            return None

    def _clean_date(self, val) -> Optional[str]:
        """清洗日期：YYYYMMDD 文本 → ISO 格式，过滤无效日期占位符"""
        if val is None:
            return None
        s = str(val).strip().split(".")[0]  # 去掉 pandas 可能带的小数点
        if len(s) == 8 and s.isdigit():
            if int(s) < 20000101:  # 19700101 等无效占位
                return None
            return f"{s[:4]}-{s[4:6]}-{s[6:8]}"
        return s if len(s) >= 8 else None

    def _ffill_merged(self, df, columns: list):
        """对合并单元格产生的 NaN 做前向填充"""
        for col in columns:
            if col in df.columns:
                df[col] = df[col].ffill()
        return df

    def _df_row_to_dict(self, row) -> dict:
        """将 DataFrame 行转换为 dict，处理 NaN"""
        result = {}
        for col, val in row.items():
            import pandas as pd
            if pd.isna(val) if not isinstance(val, (list, dict)) else False:
                result[col] = None
            else:
                result[col] = val
        return result
