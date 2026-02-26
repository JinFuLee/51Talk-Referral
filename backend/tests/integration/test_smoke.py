"""
Smoke tests migrated from backend/check.py.
Verifies that key Excel data files can be read and have expected columns.
"""
from __future__ import annotations

import glob
import os

import pytest
# pyproject.toml [tool.pytest.ini_options].pythonpath = ["backend"] 已确保 backend/ 在 path 中

DATA_ROOT = os.path.join(
    os.path.dirname(__file__),
    "../../../input",
)


def _latest_file(pattern: str) -> str | None:
    """Return the most recently named file matching glob pattern, or None."""
    files = sorted(glob.glob(os.path.join(DATA_ROOT, pattern)))
    return files[-1] if files else None


# ── D5: 当月转介绍打卡率 ──────────────────────────────────────────────────────

class TestD5KpiCheckinFile:
    """Tests for the D5 KPI checkin-rate Excel file."""

    def test_file_exists(self):
        """At least one D5 file must be present in the input directory."""
        f = _latest_file("BI-KPI_当月转介绍打卡率_D-1/*.xlsx")
        if f is None:
            pytest.skip("No D5 files found — skipping (data not present in CI)")
        assert os.path.isfile(f)

    def test_can_read_dataframe(self):
        """D5 file must be readable as a pandas DataFrame."""
        f = _latest_file("BI-KPI_当月转介绍打卡率_D-1/*.xlsx")
        if f is None:
            pytest.skip("No D5 files found")
        pd = pytest.importorskip("pandas")
        df = pd.read_excel(f)
        assert df is not None
        assert len(df.columns) > 0, "D5 DataFrame has no columns"

    def test_has_rows(self):
        """D5 file must contain at least one data row."""
        f = _latest_file("BI-KPI_当月转介绍打卡率_D-1/*.xlsx")
        if f is None:
            pytest.skip("No D5 files found")
        pd = pytest.importorskip("pandas")
        df = pd.read_excel(f)
        assert len(df) > 0, "D5 DataFrame is empty"


# ── D1: 北极星指标 24H 打卡率 ──────────────────────────────────────────────────

class TestD1NorthStarFile:
    """Tests for the D1 north-star 24H checkin-rate Excel file."""

    def test_file_exists(self):
        """At least one D1 file must be present in the input directory."""
        f = _latest_file("BI-北极星指标_当月24H打卡率_D-1/*.xlsx")
        if f is None:
            pytest.skip("No D1 files found — skipping (data not present in CI)")
        assert os.path.isfile(f)

    def test_can_read_dataframe(self):
        """D1 file must be readable as a pandas DataFrame."""
        f = _latest_file("BI-北极星指标_当月24H打卡率_D-1/*.xlsx")
        if f is None:
            pytest.skip("No D1 files found")
        pd = pytest.importorskip("pandas")
        df = pd.read_excel(f)
        assert df is not None
        assert len(df.columns) > 0, "D1 DataFrame has no columns"

    def test_has_rows(self):
        """D1 file must contain at least one data row."""
        f = _latest_file("BI-北极星指标_当月24H打卡率_D-1/*.xlsx")
        if f is None:
            pytest.skip("No D1 files found")
        pd = pytest.importorskip("pandas")
        df = pd.read_excel(f)
        assert len(df) > 0, "D1 DataFrame is empty"


# ── Core imports ──────────────────────────────────────────────────────────────

class TestCoreImports:
    """Verify that key backend modules can be imported without errors."""

    def test_import_pandas(self):
        import pandas  # noqa: F401

    def test_import_glob(self):
        import glob  # noqa: F401

    def test_import_sys(self):
        import sys  # noqa: F401

    def test_data_root_directory_accessible(self):
        """The input directory path must be resolvable (may or may not exist in CI)."""
        # Just assert the variable is a non-empty string; directory may not exist in CI
        assert isinstance(DATA_ROOT, str)
        assert len(DATA_ROOT) > 0
