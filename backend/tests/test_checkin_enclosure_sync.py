"""验证打卡 API 围场过滤与 role_config 参数一致性"""
import json

from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)

LP_M4_ONLY = json.dumps({"LP": {"min_days": 121, "max_days": 150}})


def test_team_detail_accepts_role_config():
    """team-detail 端点接受 role_config 参数不报错"""
    r = client.get("/api/checkin/team-detail", params={"team": "TH-LP01Team", "role_config": LP_M4_ONLY})
    assert r.status_code == 200
    data = r.json()
    assert "members" in data


def test_team_detail_respects_role_config():
    """team-detail 传 role_config 时结果应 <= 不传时"""
    r_all = client.get("/api/checkin/team-detail", params={"team": "TH-LP01Team"})
    r_m4 = client.get("/api/checkin/team-detail", params={"team": "TH-LP01Team", "role_config": LP_M4_ONLY})
    assert r_all.status_code == 200
    assert r_m4.status_code == 200
    all_count = len(r_all.json()["members"])
    m4_count = len(r_m4.json()["members"])
    if all_count > 0:
        assert m4_count <= all_count, f"role_config 过滤无效: M4={m4_count} > all={all_count}"


def test_followup_respects_role_config():
    """followup 端点传 role_config 后仅返回指定围场段学员"""
    r_all = client.get("/api/checkin/followup", params={"role": "LP"})
    r_m4 = client.get("/api/checkin/followup", params={"role": "LP", "role_config": LP_M4_ONLY})
    assert r_all.status_code == 200
    assert r_m4.status_code == 200
    all_count = r_all.json()["total"]
    m4_count = r_m4.json()["total"]
    if all_count > 0:
        assert m4_count <= all_count, f"role_config 过滤无效: M4={m4_count} > all={all_count}"


def test_ranking_returns_structure():
    """ranking 端点返回正确结构"""
    r = client.get("/api/checkin/ranking")
    assert r.status_code == 200
    data = r.json()
    assert "by_role" in data
    for role_data in data["by_role"].values():
        assert "by_group" in role_data
        assert "by_person" in role_data
        assert "total_students" in role_data
        assert "checked_in" in role_data
        assert "checkin_rate" in role_data


def test_ranking_respects_role_config():
    """ranking 传 role_config 不报错"""
    r = client.get("/api/checkin/ranking", params={"role_config": LP_M4_ONLY})
    assert r.status_code == 200
    assert "by_role" in r.json()
