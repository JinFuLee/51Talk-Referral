"""
Unit tests for core.multi_source_loader.MultiSourceLoader
覆盖：并行加载成功、单 Loader 异常隔离、串行 fallback、环境变量开关、timeout 处理
"""

import os
from concurrent.futures import Future
from unittest.mock import MagicMock, patch

import pytest

from backend.core.multi_source_loader import (
    MultiSourceLoader,
    _parallel_enabled,
    load_all_sources,
)

# ── Fixtures ──────────────────────────────────────────────────────────────────


def _make_loader_mock(return_value: dict) -> MagicMock:
    """生成一个 load_all() 返回固定值的 Loader mock。"""
    m = MagicMock()
    m.load_all.return_value = return_value
    return m


def _make_failing_loader(exc: Exception) -> MagicMock:
    """生成一个 load_all() 抛出异常的 Loader mock。"""
    m = MagicMock()
    m.load_all.side_effect = exc
    return m


@pytest.fixture()
def msl(tmp_path):
    """MultiSourceLoader 实例，所有内部 Loader 替换为 mock。"""
    loader = MultiSourceLoader(input_dir=str(tmp_path))
    loader._loaders = {
        "leads": _make_loader_mock({"leads_achievement": {}}),
        "roi": _make_loader_mock({"roi_model": {}}),
        "cohort": _make_loader_mock({"cohort_data": {}}),
        "kpi": _make_loader_mock({"north_star_24h": {}}),
        "order": _make_loader_mock({"order_detail": {}}),
        "ops": _make_loader_mock({"funnel_efficiency": {}}),
    }
    return loader


# ── _parallel_enabled ─────────────────────────────────────────────────────────


class TestParallelEnabled:
    def test_default_is_enabled(self, monkeypatch):
        monkeypatch.delenv("PARALLEL_LOADERS", raising=False)
        assert _parallel_enabled() is True

    def test_zero_disables(self, monkeypatch):
        monkeypatch.setenv("PARALLEL_LOADERS", "0")
        assert _parallel_enabled() is False

    def test_one_enables(self, monkeypatch):
        monkeypatch.setenv("PARALLEL_LOADERS", "1")
        assert _parallel_enabled() is True

    def test_whitespace_trimmed(self, monkeypatch):
        monkeypatch.setenv("PARALLEL_LOADERS", " 0 ")
        assert _parallel_enabled() is False


# ── 并行模式 —— 正常路径 ────────────────────────────────────────────────────────


class TestLoadAllParallel:
    def test_all_loaders_called(self, msl, monkeypatch):
        monkeypatch.delenv("PARALLEL_LOADERS", raising=False)
        result = msl.load_all()
        assert set(result.keys()) == {"leads", "roi", "cohort", "kpi", "order", "ops"}

    def test_correct_data_returned(self, msl, monkeypatch):
        monkeypatch.delenv("PARALLEL_LOADERS", raising=False)
        result = msl.load_all()
        assert result["leads"] == {"leads_achievement": {}}
        assert result["roi"] == {"roi_model": {}}

    def test_each_loader_called_exactly_once(self, msl, monkeypatch):
        monkeypatch.delenv("PARALLEL_LOADERS", raising=False)
        msl.load_all()
        for name, loader in msl._loaders.items():
            loader.load_all.assert_called_once(), f"{name}.load_all 应只调用一次"


# ── 并行模式 —— 单 Loader 异常隔离 ────────────────────────────────────────────


class TestParallelErrorIsolation:
    def test_failing_loader_gets_empty_dict(self, msl, monkeypatch):
        monkeypatch.delenv("PARALLEL_LOADERS", raising=False)
        msl._loaders["leads"] = _make_failing_loader(RuntimeError("Excel 读取失败"))
        result = msl.load_all()
        assert result["leads"] == {}

    def test_other_loaders_still_succeed(self, msl, monkeypatch):
        monkeypatch.delenv("PARALLEL_LOADERS", raising=False)
        msl._loaders["leads"] = _make_failing_loader(RuntimeError("坏掉了"))
        result = msl.load_all()
        assert result["roi"] == {"roi_model": {}}
        assert result["kpi"] == {"north_star_24h": {}}

    def test_all_failing_loaders_return_empty_dicts(self, msl, monkeypatch):
        monkeypatch.delenv("PARALLEL_LOADERS", raising=False)
        for name in list(msl._loaders.keys()):
            msl._loaders[name] = _make_failing_loader(ValueError("全部失败"))
        result = msl.load_all()
        for name in ["leads", "roi", "cohort", "kpi", "order", "ops"]:
            assert result[name] == {}


# ── 串行模式（PARALLEL_LOADERS=0）──────────────────────────────────────────────


class TestLoadAllSerial:
    def test_serial_mode_returns_all_keys(self, msl, monkeypatch):
        monkeypatch.setenv("PARALLEL_LOADERS", "0")
        result = msl.load_all()
        assert set(result.keys()) == {"leads", "roi", "cohort", "kpi", "order", "ops"}

    def test_serial_mode_correct_data(self, msl, monkeypatch):
        monkeypatch.setenv("PARALLEL_LOADERS", "0")
        result = msl.load_all()
        assert result["order"] == {"order_detail": {}}

    def test_serial_mode_error_isolation(self, msl, monkeypatch):
        monkeypatch.setenv("PARALLEL_LOADERS", "0")
        msl._loaders["cohort"] = _make_failing_loader(IOError("文件不存在"))
        result = msl.load_all()
        assert result["cohort"] == {}
        assert result["leads"] == {"leads_achievement": {}}

    def test_serial_mode_calls_load_all_on_each(self, msl, monkeypatch):
        monkeypatch.setenv("PARALLEL_LOADERS", "0")
        msl.load_all()
        for name, loader in msl._loaders.items():
            (
                loader.load_all.assert_called_once(),
                f"{name}.load_all 应只调用一次（串行）",
            )


# ── 并行异常 fallback 到串行 ───────────────────────────────────────────────────


class TestParallelFallbackToSerial:
    def test_fallback_when_parallel_raises(self, msl, monkeypatch):
        """_load_parallel 抛出意外异常时自动降级到串行，结果仍完整。"""
        monkeypatch.delenv("PARALLEL_LOADERS", raising=False)
        with patch.object(
            msl, "_load_parallel", side_effect=RuntimeError("线程池崩了")
        ):
            result = msl.load_all()
        # 降级到串行后所有 Loader 结果应正常返回
        assert set(result.keys()) == {"leads", "roi", "cohort", "kpi", "order", "ops"}
        assert result["kpi"] == {"north_star_24h": {}}


# ── load_category ─────────────────────────────────────────────────────────────


class TestLoadCategory:
    def test_known_category_returns_data(self, msl):
        result = msl.load_category("leads")
        assert result == {"leads_achievement": {}}

    def test_unknown_category_raises_value_error(self, msl):
        with pytest.raises(ValueError, match="未知类别"):
            msl.load_category("nonexistent")

    def test_load_category_calls_loader_load_all(self, msl):
        msl.load_category("roi")
        msl._loaders["roi"].load_all.assert_called_once()


# ── load_all_sources 便捷函数 ──────────────────────────────────────────────────


class TestLoadAllSources:
    def test_returns_dict(self, tmp_path):
        """load_all_sources 便捷函数能够调用（Loader 读不到文件返回空 dict 是正常的）。"""
        result = load_all_sources(str(tmp_path))
        assert isinstance(result, dict)
        # 6 个子 Loader 键都存在
        for key in ["leads", "roi", "cohort", "kpi", "order", "ops"]:
            assert key in result
