"""统一数据加载基础类"""

import hashlib
import logging
import math
from pathlib import Path
from typing import TYPE_CHECKING, Any, Optional

import numpy as np
import pandas as pd

pd.set_option("future.no_silent_downcasting", True)

if TYPE_CHECKING:
    from backend.core.project_config import ProjectConfig

logger = logging.getLogger(__name__)


class BaseLoader:
    """所有分类 Loader 的基类"""

    # 别名映射（EA→SS, CM→LP）— 类常量保留用于向后兼容
    ALIAS_MAP = {"EA": "SS", "ea": "SS", "CM": "LP", "cm": "LP"}

    def __init__(
        self, input_dir: Path, project_config: Optional["ProjectConfig"] = None
    ) -> None:
        self.input_dir = Path(input_dir)
        self._project_config = project_config
        self.last_loaded_file: Path | None = None
        # 有 config 时使用 config 的别名映射和默认团队名，否则保留硬编码值
        if project_config is not None:
            self.alias_map: dict = dict(project_config.role_aliases)
            self.default_team: str = project_config.default_team_name
        else:
            self.alias_map = dict(self.ALIAS_MAP)
            self.default_team = "THCC"

    def _get_cache_path(self, file_path: Path, sheet_name=None, header=0) -> Path:
        """生成 Parquet 缓存文件路径。

        sheet_name + header 共同决定缓存键，
        避免 header=None 与 header=0 互串。
        """
        cache_dir = self.input_dir / ".cache"
        cache_dir.mkdir(exist_ok=True)
        sn = sheet_name if sheet_name is not None else "default"
        key = f"{file_path}:{sn}:h{header}"
        hash_key = hashlib.md5(key.encode()).hexdigest()[:12]
        return cache_dir / f"{hash_key}.parquet"

    def _is_cache_fresh(self, file_path: Path, cache_path: Path) -> bool:
        """检查缓存是否比源文件新"""
        if not cache_path.exists():
            return False
        return cache_path.stat().st_mtime > file_path.stat().st_mtime

    def _find_latest_file(self, subdir: str) -> Path | None:
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

    def _read_xlsx_pandas(
        self, path: Path, sheet_name=0, header=0, skiprows=None
    ) -> Any:
        """使用 pandas 读取 Excel，统一异常处理，优先 openpyxl，fallback calamine。
        内置 Parquet 缓存层：缓存比源文件新时直接返回，否则读 Excel 后写缓存。
        """
        import warnings

        import pandas as pd

        cache_path = self._get_cache_path(path, sheet_name, header=header)

        if self._is_cache_fresh(path, cache_path):
            try:
                df = pd.read_parquet(cache_path)
                logger.info(f"Cache hit: {cache_path.name} <- {path.name}")
                return df
            except Exception as cache_err:
                logger.warning(f"缓存读取失败，降级重读 Excel: {cache_err}")

        logger.info(f"Cache miss, reading Excel: {path.name} (sheet={sheet_name})")
        try:
            with warnings.catch_warnings():
                warnings.filterwarnings(
                    "ignore", category=UserWarning, module="openpyxl"
                )
                df = pd.read_excel(
                    path,
                    sheet_name=sheet_name,
                    header=header,
                    skiprows=skiprows,
                    engine="openpyxl",
                )
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
            except Exception as e2:
                logger.error(f"所有引擎读取失败 {path}: {e2}")
                return pd.DataFrame()

        # 写缓存（DataFrame 为空时跳过，避免无意义缓存）
        if not df.empty:
            try:
                # PyArrow 不能处理 mixed types (例如既有 string 又有 float 的列)
                # 在缓存前，将所有 object 类型的列强制转为字符串
                cache_df = df.copy()
                object_cols = cache_df.select_dtypes(include=["object"]).columns
                cache_df[object_cols] = cache_df[object_cols].astype(str)
                cache_df.to_parquet(cache_path, index=False)
            except Exception as write_err:
                logger.warning(f"缓存写入失败（非阻塞）: {write_err}")

        return df

    def _normalize_alias(self, text: str) -> str:
        """规范化别名：EA→SS, CM→LP（有 config 时使用 config 的别名映射）"""
        if not isinstance(text, str):
            return str(text)
        for alias, standard in self.alias_map.items():
            text = text.replace(alias, standard)
        return text

    def _normalize_team(self, name: str) -> str:
        """规范化团队名。

        '-'/'—'/'nan'/空 → default_team（有 config 时从 config 读取）
        """
        if not name or str(name).strip() in ("-", "—", "nan", "NaN", ""):
            return self.default_team
        return str(name).strip()

    def _clean_numeric(self, val) -> float | None:
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

    def _clean_date(self, val) -> str | None:
        """清洗日期：YYYYMMDD 文本 → ISO 格式，过滤无效日期占位符"""
        if val is None:
            return None
        s = str(val).strip().split(".")[0]  # 去掉 pandas 可能带的小数点
        if len(s) == 8 and s.isdigit():
            if int(s) < 20000101:  # 19700101 等无效占位
                return None
            return f"{s[:4]}-{s[4:6]}-{s[6:8]}"
        return s if len(s) >= 8 else None

    def _clean_numeric_vec(self, s: "pd.Series") -> "pd.Series":
        """向量化数值清洗（替代逐行 apply(_clean_numeric)）。
        处理 '-', 'NaN', None, 空字符串, '—', 'N/A', '#N/A', 千分位逗号, 百分号。
        """
        import pandas as pd

        s = s.replace(
            ["-", "nan", "NaN", "", None, "—", "N/A", "#N/A"], np.nan
        ).infer_objects(copy=False)
        s = s.astype(str).str.replace(",", "", regex=False).str.rstrip("%")
        # "nan" 字符串由 astype(str) 还原，需再次置 NaN
        s = s.replace("nan", np.nan).infer_objects(copy=False)
        return pd.to_numeric(s, errors="coerce")

    def _clean_date_vec(self, s: "pd.Series") -> "pd.Series":
        """向量化日期清洗（替代逐行 apply(_clean_date)）。

        处理 YYYYMMDD 纯数字字符串、标准 ISO/Excel 日期，
        过滤 < 2000-01-01 的无效占位符。
        """
        import pandas as pd

        s = s.replace(
            ["-", "nan", "NaN", "", None, "—", "N/A", "#N/A"], np.nan
        ).infer_objects(copy=False)
        # 去掉 pandas 可能带的小数点（如 "20210301.0"）
        s = s.astype(str).str.split(".").str[0]
        s = s.replace("nan", np.nan).infer_objects(copy=False)
        s = pd.to_datetime(s, format="mixed", errors="coerce")
        # 过滤 < 2000-01-01 的无效占位符（如 19700101）
        s = s.where(s >= pd.Timestamp("2000-01-01"))
        return s

    def _ffill_merged(self, df, columns: list) -> Any:
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
