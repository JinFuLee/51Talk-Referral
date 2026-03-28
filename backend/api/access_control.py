"""
权限管理 API 端点
用户角色配置、页面访问控制、JWT 解码、审计日志
"""

from __future__ import annotations

import base64
import json
import logging
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

logger = logging.getLogger(__name__)

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
CONFIG_DIR = PROJECT_ROOT / "config"
CONFIG_DIR.mkdir(parents=True, exist_ok=True)

OUTPUT_DIR = PROJECT_ROOT / "output"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

ACCESS_CONTROL_FILE = CONFIG_DIR / "access-control.json"
AUDIT_LOG_FILE = OUTPUT_DIR / "access-audit.jsonl"

router = APIRouter()

# ── 默认配置（首次启动自动写入）────────────────────────────────────────────────

_DEFAULT_CONFIG: dict[str, Any] = {
    "version": 1,
    "roles": {
        "admin": {
            "name": {"zh": "管理员", "th": "ผู้ดูแลระบบ"},
            "color": "#ef4444",
            "pages": ["*"],
            "canManage": True,
        },
        "ops_manager": {
            "name": {"zh": "运营管理", "th": "ผู้จัดการปฏิบัติการ"},
            "color": "#3b82f6",
            "pages": ["/*"],
            "canManage": False,
        },
        "sales_lead": {
            "name": {"zh": "销售主管", "th": "หัวหน้าฝ่ายขาย"},
            "color": "#22c55e",
            "pages": [
                "/cc-performance",
                "/checkin",
                "/daily-monitor",
                "/present/*",
                "/team",
                "/reports/*",
                "/funnel",
                "/enclosure",
                "/members",
            ],
            "canManage": False,
        },
        "viewer": {
            "name": {"zh": "查看者", "th": "ผู้ชม"},
            "color": "#a855f7",
            "pages": ["/", "/daily-monitor", "/reports/ops"],
            "canManage": False,
        },
    },
    "users": [],
    "publicPages": ["/", "/cc-performance", "/daily-monitor", "/checkin"],
    "pageRegistry": [],
    "settings": {
        "defaultDenyAll": True,
        "allowLocalDev": True,
        "auditLogEnabled": True,
    },
}


# ── Helpers ───────────────────────────────────────────────────────────────────


def _read_config() -> dict[str, Any]:
    """读取权限配置，文件不存在时写入默认配置。"""
    if not ACCESS_CONTROL_FILE.exists():
        _write_config(_DEFAULT_CONFIG)
        return _DEFAULT_CONFIG.copy()
    try:
        return json.loads(ACCESS_CONTROL_FILE.read_text(encoding="utf-8"))
    except Exception as exc:
        logger.warning(f"access-control.json 解析失败，返回默认配置: {exc}")
        return _DEFAULT_CONFIG.copy()


def _write_config(data: dict[str, Any]) -> None:
    ACCESS_CONTROL_FILE.write_text(
        json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8"
    )


def _decode_jwt_email(token: str) -> str | None:
    """从 Cloudflare Access JWT 的 payload 中提取 email（不验签，仅解码）。"""
    try:
        parts = token.split(".")
        if len(parts) != 3:
            return None
        # base64url → 标准 base64（补 padding）
        payload_b64 = parts[1] + "=" * (-len(parts[1]) % 4)
        payload = json.loads(base64.urlsafe_b64decode(payload_b64).decode("utf-8"))
        return payload.get("email") or payload.get("sub")
    except Exception:
        return None


def _page_matches(page_path: str, pattern: str) -> bool:
    """判断页面路径是否匹配权限模式（支持 * 通配符和 /* 后缀）。"""
    if pattern == "*":
        return True
    if pattern.endswith("/*"):
        prefix = pattern[:-2]
        return page_path == prefix or page_path.startswith(prefix + "/")
    return page_path == pattern


def _get_user_visible_pages(
    role_pages: list[str], page_registry: list[dict]
) -> list[dict]:
    """根据角色页面列表，从注册表过滤出可见页面。"""
    visible: list[dict] = []
    for page in page_registry:
        path = page.get("path", "")
        for pattern in role_pages:
            if _page_matches(path, pattern):
                visible.append(page)
                break
    return visible


def _is_admin(request: Request, config: dict[str, Any]) -> bool:
    """检查请求方是否为 admin（canManage=true）。"""
    # 本地开发放行
    if config.get("settings", {}).get("allowLocalDev", False):
        host = request.headers.get("host", "")
        if host.startswith("localhost") or host.startswith("127.0.0.1"):
            return True

    token = request.headers.get("Cf-Access-Jwt-Assertion", "")
    if not token:
        return False

    email = _decode_jwt_email(token)
    if not email:
        return False

    users = config.get("users", [])
    roles = config.get("roles", {})
    for user in users:
        if user.get("email", "").lower() == email.lower():
            role_key = user.get("role", "")
            role_def = roles.get(role_key, {})
            return bool(role_def.get("canManage", False))
    return False


def _append_audit_log(entry: dict[str, Any]) -> None:
    """追加写入审计日志（JSONL 格式）。"""
    try:
        with AUDIT_LOG_FILE.open("a", encoding="utf-8") as f:
            f.write(json.dumps(entry, ensure_ascii=False) + "\n")
    except Exception as exc:
        logger.warning(f"审计日志写入失败: {exc}")


# ── Request Models ─────────────────────────────────────────────────────────────


class AuditLogEntry(BaseModel):
    path: str
    email: str = ""
    ip: str = ""
    granted: bool = True


# ── Endpoints ─────────────────────────────────────────────────────────────────


@router.get("/access-control")
def get_access_control(request: Request) -> dict[str, Any]:
    """返回完整权限配置（仅 admin 可调用）。"""
    config = _read_config()
    if not _is_admin(request, config):
        raise HTTPException(status_code=403, detail="需要管理员权限")
    return config


@router.put("/access-control")
def update_access_control(
    request: Request, body: dict[str, Any]
) -> dict[str, Any]:
    """更新权限配置（仅 admin 可调用）。"""
    config = _read_config()
    if not _is_admin(request, config):
        raise HTTPException(status_code=403, detail="需要管理员权限")

    # 保留 version 并递增
    current_version = config.get("version", 1)
    body["version"] = current_version + 1

    _write_config(body)
    logger.info(f"权限配置已更新，version → {body['version']}")
    return {"ok": True, "version": body["version"]}


@router.get("/access-control/me")
def get_my_access(request: Request) -> dict[str, Any]:
    """
    根据 Cf-Access-Jwt-Assertion header 返回当前用户权限与可见页面列表。
    本地开发（localhost）无 header 时返回 admin 权限。
    """
    config = _read_config()
    roles = config.get("roles", {})
    public_pages = config.get("publicPages", [])
    page_registry = config.get("pageRegistry", [])
    settings = config.get("settings", {})
    allow_local = settings.get("allowLocalDev", False)

    token = request.headers.get("Cf-Access-Jwt-Assertion", "")
    host = request.headers.get("host", "")
    is_local = host.startswith("localhost") or host.startswith("127.0.0.1")

    # 本地开发且允许本地放行 → 返回 admin 权限
    if is_local and allow_local and not token:
        admin_role = roles.get("admin", {})
        return {
            "email": "local@dev",
            "name": "LocalDev",
            "role": "admin",
            "roleDef": admin_role,
            "visiblePages": page_registry,  # admin 看全部
            "publicPages": public_pages,
            "isAdmin": True,
            "source": "local_dev",
        }

    # 无 JWT → 未认证，只能访问公开页面
    if not token:
        public_page_defs = [p for p in page_registry if p["path"] in public_pages]
        return {
            "email": None,
            "name": None,
            "role": None,
            "roleDef": None,
            "visiblePages": public_page_defs,
            "publicPages": public_pages,
            "isAdmin": False,
            "source": "unauthenticated",
        }

    email = _decode_jwt_email(token)
    if not email:
        raise HTTPException(status_code=401, detail="JWT 解码失败，无法提取邮箱")

    users = config.get("users", [])
    matched_user = next(
        (u for u in users if u.get("email", "").lower() == email.lower()), None
    )

    if not matched_user:
        # 用户不在名单 → 只能访问公开页面
        public_page_defs = [p for p in page_registry if p["path"] in public_pages]
        return {
            "email": email,
            "name": None,
            "role": None,
            "roleDef": None,
            "visiblePages": public_page_defs,
            "publicPages": public_pages,
            "isAdmin": False,
            "source": "not_in_roster",
        }

    role_key = matched_user.get("role", "")
    role_def = roles.get(role_key, {})
    role_pages = role_def.get("pages", [])
    visible = _get_user_visible_pages(role_pages, page_registry)

    return {
        "email": email,
        "name": matched_user.get("name"),
        "role": role_key,
        "roleDef": role_def,
        "visiblePages": visible,
        "publicPages": public_pages,
        "isAdmin": bool(role_def.get("canManage", False)),
        "source": "cf_jwt",
    }


@router.get("/access-control/audit-log")
def get_audit_log(request: Request, limit: int = 200) -> dict[str, Any]:
    """返回最近访问审计日志（仅 admin 可调用）。"""
    config = _read_config()
    if not _is_admin(request, config):
        raise HTTPException(status_code=403, detail="需要管理员权限")

    if not AUDIT_LOG_FILE.exists():
        return {"entries": [], "total": 0}

    try:
        lines = AUDIT_LOG_FILE.read_text(encoding="utf-8").strip().splitlines()
        entries: list[dict] = []
        for line in lines:
            try:
                entries.append(json.loads(line))
            except Exception:
                continue
        # 返回最新 limit 条（倒序）
        entries = entries[-limit:][::-1]
        return {"entries": entries, "total": len(lines)}
    except Exception as exc:
        logger.warning(f"审计日志读取失败: {exc}")
        return {"entries": [], "total": 0}


@router.post("/access-control/audit-log")
def post_audit_log(request: Request, body: AuditLogEntry) -> dict[str, Any]:
    """记录一次页面访问（内部调用，由前端 middleware 触发）。"""
    config = _read_config()
    if not config.get("settings", {}).get("auditLogEnabled", True):
        return {"ok": True, "skipped": True}

    # 尝试从 JWT 补全邮箱（如果 body 未提供）
    email = body.email
    if not email:
        token = request.headers.get("Cf-Access-Jwt-Assertion", "")
        if token:
            email = _decode_jwt_email(token) or ""

    # 尝试获取真实 IP
    client_host = request.client.host if request.client else ""
    ip = body.ip or request.headers.get("CF-Connecting-IP") or client_host

    entry: dict[str, Any] = {
        "ts": datetime.now(UTC).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "email": email,
        "path": body.path,
        "ip": ip,
        "granted": body.granted,
    }
    _append_audit_log(entry)
    return {"ok": True}
