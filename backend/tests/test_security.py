"""
安全功能测试：Rate Limiting + Security Headers + CSP
"""

from __future__ import annotations

import importlib
import os
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

# ── Fixtures ──────────────────────────────────────────────────────────────────


@pytest.fixture
def app_client():
    """创建测试用 TestClient，隔离 AnalysisService 副作用"""
    mock_svc = MagicMock()
    mock_svc.get_cached_result.return_value = None
    mock_svc.run.return_value = None

    with patch(
        "backend.services.analysis_service.AnalysisService", return_value=mock_svc
    ):
        from backend.main import app

        client = TestClient(app, raise_server_exceptions=False)
        yield client


# ── Security Headers 测试 ──────────────────────────────────────────────────────


class TestSecurityHeaders:
    """验证 SecurityHeadersMiddleware 注入的全部安全头"""

    def test_x_content_type_options(self, app_client: TestClient):
        resp = app_client.get("/api/health")
        assert resp.headers.get("X-Content-Type-Options") == "nosniff"

    def test_x_frame_options(self, app_client: TestClient):
        resp = app_client.get("/api/health")
        assert resp.headers.get("X-Frame-Options") == "DENY"

    def test_x_xss_protection(self, app_client: TestClient):
        resp = app_client.get("/api/health")
        assert resp.headers.get("X-XSS-Protection") == "1; mode=block"

    def test_content_security_policy_present(self, app_client: TestClient):
        resp = app_client.get("/api/health")
        csp = resp.headers.get("Content-Security-Policy", "")
        assert "default-src 'self'" in csp

    def test_csp_script_src(self, app_client: TestClient):
        resp = app_client.get("/api/health")
        csp = resp.headers.get("Content-Security-Policy", "")
        assert "script-src 'self'" in csp

    def test_csp_style_src(self, app_client: TestClient):
        resp = app_client.get("/api/health")
        csp = resp.headers.get("Content-Security-Policy", "")
        assert "style-src 'self' 'unsafe-inline'" in csp

    def test_referrer_policy(self, app_client: TestClient):
        resp = app_client.get("/api/health")
        assert resp.headers.get("Referrer-Policy") == "strict-origin-when-cross-origin"

    def test_permissions_policy(self, app_client: TestClient):
        resp = app_client.get("/api/health")
        pp = resp.headers.get("Permissions-Policy", "")
        assert "camera=()" in pp
        assert "microphone=()" in pp
        assert "geolocation=()" in pp

    def test_security_headers_on_non_health_endpoint(self, app_client: TestClient):
        """非 health 端点也应注入安全头"""
        resp = app_client.get("/api/datasources")
        assert resp.headers.get("X-Content-Type-Options") == "nosniff"
        assert resp.headers.get("Referrer-Policy") == "strict-origin-when-cross-origin"


# ── Health 端点豁免测试 ────────────────────────────────────────────────────────


class TestHealthEndpoint:
    """验证 /api/health 端点基本行为"""

    def test_health_returns_200(self, app_client: TestClient):
        resp = app_client.get("/api/health")
        assert resp.status_code == 200

    def test_health_response_body(self, app_client: TestClient):
        resp = app_client.get("/api/health")
        data = resp.json()
        assert data["status"] == "ok"
        assert "version" in data

    def test_health_accessible_multiple_times(self, app_client: TestClient):
        """连续访问 health 端点应全部成功（豁免 rate limit）"""
        for i in range(10):
            resp = app_client.get("/api/health")
            assert resp.status_code == 200, (
                f"第 {i + 1} 次访问 /api/health 应返回 200，实际 {resp.status_code}"
            )


# ── Rate Limit 配置测试 ────────────────────────────────────────────────────────


class TestRateLimitConfig:
    """验证速率限制相关配置逻辑（通过模块级 _rate_limit_str 验证环境变量读取）"""

    def test_rate_limit_default_env(self):
        """未设置 RATE_LIMIT 时 _rate_limit_str 默认为 60/minute"""
        os.environ.pop("RATE_LIMIT", None)
        import backend.main as main_module

        importlib.reload(main_module)
        # slowapi Limiter 使用 _default_limits 存储（私有属性），
        # 此处验证模块级暴露的配置变量以保持稳定接口
        assert main_module._rate_limit_str == "60/minute"

    def test_rate_limit_custom_env(self):
        """设置 RATE_LIMIT=120/minute 后 _rate_limit_str 应反映自定义值"""
        with patch.dict(os.environ, {"RATE_LIMIT": "120/minute"}):
            import backend.main as main_module

            importlib.reload(main_module)
            assert main_module._rate_limit_str == "120/minute"

    def test_rate_limit_limiter_uses_env_string(self):
        """slowapi Limiter 的 _default_limits 应包含环境变量指定的限制字符串"""
        os.environ.pop("RATE_LIMIT", None)
        import backend.main as main_module

        importlib.reload(main_module)
        # slowapi LimitGroup 将原始字符串存储在 __limit_provider 私有属性中
        raw_limits = [
            lim._LimitGroup__limit_provider
            for lim in main_module.limiter._default_limits
        ]
        assert any("60" in str(raw) for raw in raw_limits), (
            f"期望 _default_limits 包含 '60/minute'，实际: {raw_limits}"
        )
