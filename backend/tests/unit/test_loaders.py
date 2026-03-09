"""
Unit tests for core.loaders.base.BaseLoader
~17 test cases — alias normalization + team normalization + numeric cleaning
"""
import numpy as np
import pandas as pd
import pytest
from backend.core.loaders.base import BaseLoader

# ── Fixtures ──────────────────────────────────────────────────────────────────


@pytest.fixture
def loader(tmp_path):
    """最小 BaseLoader 实例（不需要真实 Excel 文件）。"""
    return BaseLoader(input_dir=tmp_path)


# ── _normalize_alias ──────────────────────────────────────────────────────────


class TestNormalizeAlias:
    def test_ea_maps_to_ss(self, loader):
        assert loader._normalize_alias("EA") == "SS"

    def test_ea_lowercase_maps_to_ss(self, loader):
        assert loader._normalize_alias("ea") == "SS"

    def test_cm_maps_to_lp(self, loader):
        assert loader._normalize_alias("CM") == "LP"

    def test_cm_lowercase_maps_to_lp(self, loader):
        assert loader._normalize_alias("cm") == "LP"

    def test_ea_inside_team_name_replaced(self, loader):
        """TH-EA01Team → TH-SS01Team"""
        result = loader._normalize_alias("TH-EA01Team")
        assert "SS" in result
        assert "EA" not in result

    def test_cm_inside_team_name_replaced(self, loader):
        """TH-CM01Team → TH-LP01Team"""
        result = loader._normalize_alias("TH-CM01Team")
        assert "LP" in result
        assert "CM" not in result

    def test_unrelated_string_unchanged(self, loader):
        assert loader._normalize_alias("THCC-A") == "THCC-A"

    def test_non_string_input_converted_to_str(self, loader):
        result = loader._normalize_alias(42)
        assert isinstance(result, str)

    def test_empty_string_returns_empty(self, loader):
        assert loader._normalize_alias("") == ""


# ── _normalize_team ───────────────────────────────────────────────────────────


class TestNormalizeTeam:
    def test_dash_returns_default_team(self, loader):
        assert loader._normalize_team("-") == "THCC"

    def test_em_dash_returns_default_team(self, loader):
        assert loader._normalize_team("—") == "THCC"

    def test_nan_string_returns_default_team(self, loader):
        assert loader._normalize_team("nan") == "THCC"

    def test_nan_uppercase_returns_default_team(self, loader):
        assert loader._normalize_team("NaN") == "THCC"

    def test_empty_string_returns_default_team(self, loader):
        assert loader._normalize_team("") == "THCC"

    def test_none_returns_default_team(self, loader):
        assert loader._normalize_team(None) == "THCC"

    def test_valid_team_name_unchanged(self, loader):
        assert loader._normalize_team("THCC-A") == "THCC-A"

    def test_strips_whitespace(self, loader):
        assert loader._normalize_team("  THCC-A  ") == "THCC-A"


# ── _clean_numeric ────────────────────────────────────────────────────────────


class TestCleanNumeric:
    def test_none_returns_none(self, loader):
        assert loader._clean_numeric(None) is None

    def test_nan_float_returns_none(self, loader):
        assert loader._clean_numeric(float("nan")) is None

    def test_dash_string_returns_none(self, loader):
        assert loader._clean_numeric("-") is None

    def test_nan_string_returns_none(self, loader):
        assert loader._clean_numeric("nan") is None

    def test_empty_string_returns_none(self, loader):
        assert loader._clean_numeric("") is None

    def test_integer_returns_float(self, loader):
        result = loader._clean_numeric(42)
        assert result == pytest.approx(42.0)
        assert isinstance(result, float)

    def test_float_passthrough(self, loader):
        assert loader._clean_numeric(3.14) == pytest.approx(3.14)

    def test_string_with_comma_cleaned(self, loader):
        assert loader._clean_numeric("1,234") == pytest.approx(1234.0)

    def test_string_with_percent_cleaned(self, loader):
        assert loader._clean_numeric("75%") == pytest.approx(75.0)

    def test_zero_returns_zero(self, loader):
        assert loader._clean_numeric(0) == pytest.approx(0.0)

    def test_negative_number(self, loader):
        assert loader._clean_numeric(-10.5) == pytest.approx(-10.5)


# ── _clean_numeric_vec ────────────────────────────────────────────────────────


class TestCleanNumericVec:
    def test_normal_series_passthrough(self, loader):
        s = pd.Series([1.0, 2.0, 3.0])
        result = loader._clean_numeric_vec(s)
        assert list(result) == pytest.approx([1.0, 2.0, 3.0])

    def test_none_values_become_nan(self, loader):
        s = pd.Series([1.0, None, 3.0])
        result = loader._clean_numeric_vec(s)
        assert pd.isna(result.iloc[1])

    def test_nan_string_becomes_nan(self, loader):
        s = pd.Series(["1.0", "nan", "3.0"])
        result = loader._clean_numeric_vec(s)
        assert pd.isna(result.iloc[1])

    def test_dash_becomes_nan(self, loader):
        s = pd.Series(["10", "-", "20"])
        result = loader._clean_numeric_vec(s)
        assert pd.isna(result.iloc[1])

    def test_comma_numbers_cleaned(self, loader):
        s = pd.Series(["1,000", "2,500"])
        result = loader._clean_numeric_vec(s)
        assert result.iloc[0] == pytest.approx(1000.0)
        assert result.iloc[1] == pytest.approx(2500.0)

    def test_empty_series_returns_empty(self, loader):
        s = pd.Series([], dtype=object)
        result = loader._clean_numeric_vec(s)
        assert len(result) == 0

    def test_all_invalid_returns_all_nan(self, loader):
        s = pd.Series(["-", "nan", "", None, "—"])
        result = loader._clean_numeric_vec(s)
        assert result.isna().all()

    def test_numpy_nan_becomes_nan(self, loader):
        s = pd.Series([1.0, np.nan, 3.0])
        result = loader._clean_numeric_vec(s)
        assert pd.isna(result.iloc[1])


# ── 空 DataFrame 安全性 ───────────────────────────────────────────────────────


class TestEmptyDataFrameSafety:
    def test_clean_numeric_vec_on_empty_df_column(self, loader):
        df = pd.DataFrame({"val": pd.Series([], dtype=object)})
        result = loader._clean_numeric_vec(df["val"])
        assert len(result) == 0

    def test_ffill_merged_on_empty_df(self, loader):
        df = pd.DataFrame()
        result = loader._ffill_merged(df, columns=["missing_col"])
        assert isinstance(result, pd.DataFrame)

    def test_ffill_merged_missing_column_no_error(self, loader):
        df = pd.DataFrame({"a": [1, 2, 3]})
        result = loader._ffill_merged(df, columns=["nonexistent"])
        assert list(result["a"]) == [1, 2, 3]
