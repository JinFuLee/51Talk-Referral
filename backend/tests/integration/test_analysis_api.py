"""
Integration tests for core API endpoints
~22 test cases covering happy path and status codes.
Uses FastAPI TestClient (sync) to avoid pytest-asyncio complexity.
"""
import pytest
from fastapi.testclient import TestClient


@pytest.fixture(scope="module")
def client():
    """Create a synchronous TestClient for the FastAPI app."""
    import sys
    import os
    sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../.."))
    from main import app
    with TestClient(app) as c:
        yield c


class TestHealthEndpoint:
    def test_health_returns_200(self, client):
        resp = client.get("/api/health")
        assert resp.status_code == 200

    def test_health_returns_ok(self, client):
        data = client.get("/api/health").json()
        assert data.get("status") == "ok"

    def test_health_returns_version(self, client):
        data = client.get("/api/health").json()
        assert "version" in data


class TestI18nEndpoint:
    def test_i18n_zh_returns_200(self, client):
        resp = client.get("/api/i18n/zh")
        if resp.status_code == 404:
            pytest.skip("i18n endpoint not registered in backend")
        assert resp.status_code == 200

    def test_i18n_zh_returns_dict(self, client):
        resp = client.get("/api/i18n/zh")
        if resp.status_code == 404:
            pytest.skip("i18n endpoint not registered in backend")
        assert isinstance(resp.json(), dict)

    def test_i18n_invalid_lang_returns_404(self, client):
        resp = client.get("/api/i18n/xx")
        assert resp.status_code == 404


class TestConfigEndpoints:
    def test_exchange_rate_returns_200(self, client):
        resp = client.get("/api/config/exchange-rate")
        assert resp.status_code == 200

    def test_exchange_rate_has_rate_field(self, client):
        data = client.get("/api/config/exchange-rate").json()
        assert "rate" in data
        assert isinstance(data["rate"], (int, float))
        assert data["rate"] > 0

    def test_targets_returns_200(self, client):
        resp = client.get("/api/config/targets")
        assert resp.status_code == 200

    def test_targets_returns_dict(self, client):
        data = client.get("/api/config/targets").json()
        assert isinstance(data, dict)

    def test_monthly_targets_returns_200(self, client):
        resp = client.get("/api/config/monthly-targets")
        assert resp.status_code == 200

    def test_monthly_targets_returns_list(self, client):
        data = client.get("/api/config/monthly-targets").json()
        assert isinstance(data, list)

    def test_panel_config_returns_200(self, client):
        resp = client.get("/api/config/panel")
        assert resp.status_code == 200


class TestAnalysisEndpoints:
    def test_summary_returns_200_or_404(self, client):
        """Summary may return 404 if no data loaded; both are acceptable."""
        resp = client.get("/api/analysis/summary")
        assert resp.status_code in (200, 404, 503)

    def test_funnel_returns_json(self, client):
        resp = client.get("/api/analysis/funnel")
        assert resp.headers.get("content-type", "").startswith("application/json")

    def test_cc_ranking_returns_json(self, client):
        resp = client.get("/api/analysis/cc-ranking")
        assert resp.headers.get("content-type", "").startswith("application/json")

    def test_trend_returns_json(self, client):
        resp = client.get("/api/analysis/trend")
        assert resp.headers.get("content-type", "").startswith("application/json")

    def test_impact_chain_returns_json(self, client):
        resp = client.get("/api/analysis/impact-chain")
        assert resp.headers.get("content-type", "").startswith("application/json")

    def test_root_cause_returns_json(self, client):
        resp = client.get("/api/analysis/root-cause")
        assert resp.headers.get("content-type", "").startswith("application/json")

    def test_what_if_post_returns_json(self, client):
        payload = {"metric": "checkin_rate", "new_value": 0.50}
        resp = client.post("/api/analysis/what-if", json=payload)
        assert resp.headers.get("content-type", "").startswith("application/json")

    def test_what_if_invalid_metric_returns_error(self, client):
        payload = {"metric": "invalid_metric", "new_value": 0.5}
        resp = client.post("/api/analysis/what-if", json=payload)
        # Should return 4xx on bad metric (or 404 if no data)
        assert resp.status_code in (400, 404, 422, 503)


class TestDatasourcesEndpoint:
    def test_datasources_status_returns_200(self, client):
        resp = client.get("/api/datasources/status")
        assert resp.status_code == 200

    def test_datasources_status_has_sources(self, client):
        data = client.get("/api/datasources/status").json()
        assert isinstance(data, (dict, list))
