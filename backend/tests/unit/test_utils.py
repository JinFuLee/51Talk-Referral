"""
Unit tests for core.analyzers.utils
~15 test cases
"""
import math

import pytest

from backend.core.analyzers.utils import (
    _clean_for_json,
    _norm_cc,
    _safe_div,
    _safe_pct,
)


# ── _safe_div ──────────────────────────────────────────────────────────────────


class TestSafeDiv:
    def test_normal_division(self):
        result = _safe_div(10, 4)
        assert result == pytest.approx(2.5)

    def test_denominator_zero(self):
        assert _safe_div(10, 0) is None

    def test_denominator_none(self):
        assert _safe_div(10, None) is None

    def test_numerator_none(self):
        assert _safe_div(None, 10) is None

    def test_negative_values(self):
        result = _safe_div(-10, 4)
        assert result == pytest.approx(-2.5)

    def test_both_negative(self):
        result = _safe_div(-10, -4)
        assert result == pytest.approx(2.5)

    def test_float_inputs(self):
        result = _safe_div(1.5, 3.0)
        assert result == pytest.approx(0.5)


# ── _safe_pct ─────────────────────────────────────────────────────────────────


class TestSafePct:
    def test_normal_percentage(self):
        result = _safe_pct(80, 350)
        assert result is not None
        assert 0.0 <= result <= 1.0

    def test_zero_numerator(self):
        result = _safe_pct(0, 100)
        assert result == 0.0

    def test_zero_denominator(self):
        assert _safe_pct(10, 0) is None

    def test_none_denominator(self):
        assert _safe_pct(10, None) is None

    def test_rounded_to_4_decimal(self):
        result = _safe_pct(1, 3)
        assert result is not None
        assert len(str(result).split(".")[-1]) <= 4


# ── _norm_cc ──────────────────────────────────────────────────────────────────


class TestNormCC:
    def test_empty_string(self):
        assert _norm_cc("") == ""

    def test_strip_spaces(self):
        assert _norm_cc("  Alice  ") == "alice"

    def test_lowercase(self):
        assert _norm_cc("ALICE") == "alice"

    def test_numeric_name(self):
        result = _norm_cc("CC001")
        assert result == "cc001"


# ── _clean_for_json ───────────────────────────────────────────────────────────


class TestCleanForJson:
    def test_nan_becomes_none(self):
        assert _clean_for_json(float("nan")) is None

    def test_inf_becomes_none(self):
        assert _clean_for_json(float("inf")) is None

    def test_nested_dict(self):
        result = _clean_for_json({"a": float("nan"), "b": 1})
        assert result["a"] is None
        assert result["b"] == 1

    def test_list_with_nan(self):
        result = _clean_for_json([float("nan"), 2, None])
        assert result[0] is None
        assert result[1] == 2
        assert result[2] is None

    def test_normal_int(self):
        assert _clean_for_json(42) == 42

    def test_normal_string(self):
        assert _clean_for_json("hello") == "hello"

    def test_none_passthrough(self):
        assert _clean_for_json(None) is None
