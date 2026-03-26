"""
通知推送管理 API
支持 Lark / 钉钉双平台，通道管理 + 模板配置 + 推送执行 + 产出档案
"""

from __future__ import annotations

import asyncio
import json
import subprocess
import uuid
from datetime import datetime
from pathlib import Path
from typing import Any

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import FileResponse
from pydantic import BaseModel, field_validator

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
KEY_DIR = PROJECT_ROOT / "key"
OUTPUT_DIR = PROJECT_ROOT / "output"
CONFIG_DIR = PROJECT_ROOT / "config"
OUTPUT_DIR.mkdir(exist_ok=True)
CONFIG_DIR.mkdir(exist_ok=True)

LARK_CRED_PATH = KEY_DIR / "lark-channels.json"
DINGTALK_CRED_PATH = KEY_DIR / "dingtalk-channels.json"
NOTIFICATION_LOG_PATH = OUTPUT_DIR / "notification-log.jsonl"
ENCLOSURE_ROLE_OVERRIDE_PATH = CONFIG_DIR / "enclosure_role_override.json"
MAIN_CONFIG_PATH = PROJECT_ROOT / "projects" / "referral" / "config.json"
SCHEDULE_CONFIG_PATH = CONFIG_DIR / "notification-schedule.json"

router = APIRouter()

# ── 后台任务状态存储（内存，进程重启后清空）────────────────────────────────────
_job_status: dict[str, dict[str, Any]] = {}


# ── 工具函数 ──────────────────────────────────────────────────────────────────

def _read_json(path: Path, default: Any = None) -> Any:
    if path.exists():
        try:
            return json.loads(path.read_text(encoding="utf-8"))
        except Exception:
            return default
    return default


def _write_json(path: Path, data: Any) -> None:
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


def _mask_secret(value: str | None) -> str:
    """隐藏凭证，仅显示前 4 位 + ****"""
    if not value:
        return ""
    return value[:4] + "****" if len(value) > 4 else "****"


def _get_role_enclosures() -> dict[str, list[str]]:
    """从 Settings 配置读取角色-围场映射（宽口）

    读取路径：config/enclosure_role_override.json
    fallback：config.json enclosure_role_assignment
    """
    override = _read_json(ENCLOSURE_ROLE_OVERRIDE_PATH)
    if override and isinstance(override, dict):
        wide = override.get("wide", {})
        if wide:
            # 转为 {role: [enclosure, ...]} 格式
            role_map: dict[str, list[str]] = {}
            for enc, roles in wide.items():
                for role in roles:
                    role_map.setdefault(role, []).append(enc)
            if role_map:
                return role_map

    # fallback：config.json
    main_cfg = _read_json(MAIN_CONFIG_PATH, {})
    assignment = main_cfg.get("enclosure_role_assignment", {})
    if assignment:
        return {k: v if isinstance(v, list) else [v] for k, v in assignment.items()}

    # 硬编码兜底
    return {
        "CC": ["M0", "M1", "M2"],
        "LP": ["M3", "M4", "M5"],
        "SS": ["M3"],
        "运营": ["M6", "M7", "M8", "M9", "M10", "M11", "M12", "M12+", "M6+"],
    }


def _platform_cred_path(platform: str) -> Path:
    if platform == "lark":
        return LARK_CRED_PATH
    elif platform == "dingtalk":
        return DINGTALK_CRED_PATH
    raise HTTPException(
        status_code=400,
        detail=f"不支持的平台: {platform}，有效值: lark / dingtalk",
    )


# ── Pydantic 模型 ─────────────────────────────────────────────────────────────

class ChannelIn(BaseModel):
    id: str
    name: str
    group_name: str
    webhook: str
    secret: str | None = None
    enabled: bool = True
    is_test: bool = False
    description: str = ""


class ChannelUpdate(BaseModel):
    name: str | None = None
    group_name: str | None = None
    webhook: str | None = None
    secret: str | None = None
    enabled: bool | None = None
    is_test: bool | None = None
    description: str | None = None


class PushRequest(BaseModel):
    platform: str  # lark / dingtalk
    template: str  # cc_followup / lp_followup / ss_followup / ops_followup
    channels: list[str]
    overview_only_channels: list[str] = []
    force: bool = False
    dry_run: bool = False


class PushPreviewRequest(BaseModel):
    template: str
    platform: str = "lark"


class TextUpdateRequest(BaseModel):
    content: str


# ── 通道管理 ──────────────────────────────────────────────────────────────────

@router.get("/notifications/channels/{platform}")
def get_channels(platform: str) -> dict:
    """获取通道列表，隐藏敏感凭证"""
    cred_path = _platform_cred_path(platform)
    data = _read_json(cred_path, {"channels": {}, "defaults": {}})
    channels = data.get("channels", {})

    result = []
    for ch_id, ch in channels.items():
        result.append({
            "id": ch_id,
            "name": ch.get("name", ch_id),
            "group_name": ch.get("group_name", ""),
            "webhook_preview": _mask_secret(ch.get("webhook", "")),
            "secret_preview": _mask_secret(ch.get("secret", "")),
            "enabled": ch.get("enabled", True),
            "is_test": ch.get("is_test", False),
            "description": ch.get("description", ""),
        })

    return {"platform": platform, "channels": result, "total": len(result)}


@router.post("/notifications/channels/{platform}", status_code=201)
def create_channel(platform: str, body: ChannelIn) -> dict:
    """新建通道"""
    cred_path = _platform_cred_path(platform)
    data = _read_json(cred_path, {"channels": {}, "defaults": {}})
    channels = data.setdefault("channels", {})

    if body.id in channels:
        raise HTTPException(status_code=409, detail=f"通道 ID '{body.id}' 已存在")

    channels[body.id] = {
        "name": body.name,
        "group_name": body.group_name,
        "webhook": body.webhook,
        "secret": body.secret or "",
        "enabled": body.enabled,
        "is_test": body.is_test,
        "description": body.description,
    }
    _write_json(cred_path, data)
    return {"ok": True, "id": body.id}


@router.put("/notifications/channels/{platform}/{channel_id}")
def update_channel(platform: str, channel_id: str, body: ChannelUpdate) -> dict:
    """编辑通道"""
    cred_path = _platform_cred_path(platform)
    data = _read_json(cred_path, {"channels": {}, "defaults": {}})
    channels = data.get("channels", {})

    if channel_id not in channels:
        raise HTTPException(status_code=404, detail=f"通道 '{channel_id}' 不存在")

    ch = channels[channel_id]
    update = body.model_dump(exclude_none=True)
    ch.update(update)
    _write_json(cred_path, data)
    return {"ok": True, "id": channel_id}


@router.delete("/notifications/channels/{platform}/{channel_id}")
def delete_channel(platform: str, channel_id: str) -> dict:
    """删除通道"""
    cred_path = _platform_cred_path(platform)
    data = _read_json(cred_path, {"channels": {}, "defaults": {}})
    channels = data.get("channels", {})

    if channel_id not in channels:
        raise HTTPException(status_code=404, detail=f"通道 '{channel_id}' 不存在")

    del channels[channel_id]
    _write_json(cred_path, data)
    return {"ok": True, "deleted": channel_id}


@router.post("/notifications/channels/{platform}/{channel_id}/test")
def test_channel(platform: str, channel_id: str) -> dict:
    """连通性测试"""
    cred_path = _platform_cred_path(platform)
    data = _read_json(cred_path, {"channels": {}, "defaults": {}})
    channels = data.get("channels", {})

    if channel_id not in channels:
        raise HTTPException(status_code=404, detail=f"通道 '{channel_id}' 不存在")

    if platform == "lark":
        cmd = [
            "uv", "run", "python", "scripts/lark_bot.py",
            "--test", "--channel", channel_id,
        ]
    else:
        cmd = [
            "uv", "run", "python", "scripts/dingtalk_daily.py",
            "--engine", "--test", "--channel", channel_id,
        ]

    try:
        result = subprocess.run(
            cmd,
            cwd=str(PROJECT_ROOT),
            capture_output=True,
            text=True,
            timeout=30,
        )
        ok = result.returncode == 0
        return {
            "ok": ok,
            "channel_id": channel_id,
            "platform": platform,
            "stdout": result.stdout[-1000:] if result.stdout else "",
            "stderr": result.stderr[-500:] if result.stderr else "",
        }
    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=504, detail="连通测试超时（30s）") from None
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"执行失败: {e}") from e


# ── 模板 ──────────────────────────────────────────────────────────────────────

@router.get("/notifications/templates")
def get_templates() -> dict:
    """返回可用模板列表，围场从 Settings 动态读取"""
    role_enc = _get_role_enclosures()

    def _enc_label(enc_list: list[str]) -> str:
        return "/".join(enc_list) if enc_list else "待配置"

    def _msg_count(role: str) -> str:
        """估算消息数量（1 总览 + N 小组）"""
        enc = role_enc.get(role, [])
        if role == "CC":
            return "1总览+7小组"
        if role == "LP":
            n = max(1, len(enc))
            return f"1总览+{n}小组"
        return "待配置"

    templates = [
        {
            "id": "cc_followup",
            "role": "CC",
            "enclosures": role_enc.get("CC", ["M0", "M1", "M2"]),
            "enclosures_label": _enc_label(role_enc.get("CC", ["M0", "M1", "M2"])),
            "messages": _msg_count("CC"),
            "enabled": True,
            "description": "CC 前端销售未打卡跟进",
        },
        {
            "id": "lp_followup",
            "role": "LP",
            "enclosures": role_enc.get("LP", ["M3", "M4", "M5"]),
            "enclosures_label": _enc_label(role_enc.get("LP", ["M3", "M4", "M5"])),
            "messages": _msg_count("LP"),
            "enabled": True,
            "description": "LP 后端服务未打卡跟进",
        },
        {
            "id": "ss_followup",
            "role": "SS",
            "enclosures": role_enc.get("SS", ["M3"]),
            "enclosures_label": _enc_label(role_enc.get("SS", ["M3"])),
            "messages": "待配置",
            "enabled": False,
            "description": "SS 后端销售未打卡跟进",
        },
        {
            "id": "ops_followup",
            "role": "运营",
            "enclosures": role_enc.get("运营", ["M6+"]),
            "enclosures_label": _enc_label(role_enc.get("运营", ["M6+"])),
            "messages": "待配置",
            "enabled": False,
            "description": "运营团队未打卡跟进",
        },
    ]

    return {"templates": templates, "total": len(templates)}


# ── 推送 ──────────────────────────────────────────────────────────────────────

def _run_push_job(job_id: str, body: PushRequest) -> None:
    """后台推送任务（在线程池中执行）"""
    _job_status[job_id]["status"] = "running"
    total = len(body.channels)
    sent = 0

    # 模板 → role 映射
    template_role_map = {
        "cc_followup": "CC",
        "lp_followup": "LP",
        "ss_followup": "SS",
        "ops_followup": "运营",
    }
    role = template_role_map.get(body.template, "CC")

    for ch in body.channels:
        _job_status[job_id]["progress"] = {
            "sent": sent,
            "total": total,
            "current": ch,
        }

        if body.platform == "lark":
            cmd = [
                "uv", "run", "python", "scripts/lark_bot.py",
                "followup",
                "--role", role,
                "--channel", ch,
            ]
            if body.dry_run:
                cmd.append("--dry-run")
            else:
                cmd.append("--confirm")
            if body.force:
                cmd.append("--force")
        else:
            cmd = [
                "uv", "run", "python", "scripts/dingtalk_daily.py",
                "--engine",
                "--channel", ch,
            ]
            if body.dry_run:
                cmd.append("--dry-run")
            else:
                cmd.append("--confirm")
            if body.force:
                cmd.append("--force")

        try:
            result = subprocess.run(
                cmd,
                cwd=str(PROJECT_ROOT),
                capture_output=True,
                text=True,
                timeout=120,
            )
            ok = result.returncode == 0
            _job_status[job_id].setdefault("results", []).append({
                "channel": ch,
                "ok": ok,
                "stdout_tail": result.stdout[-300:] if result.stdout else "",
            })
            if ok:
                sent += 1
        except subprocess.TimeoutExpired:
            _job_status[job_id].setdefault("results", []).append({
                "channel": ch,
                "ok": False,
                "error": "超时（120s）",
            })
        except Exception as e:
            _job_status[job_id].setdefault("results", []).append({
                "channel": ch,
                "ok": False,
                "error": str(e),
            })

    _job_status[job_id].update({
        "status": "done",
        "progress": {"sent": sent, "total": total, "current": None},
        "finished_at": datetime.now().isoformat(),
    })


@router.post("/notifications/push")
async def push_notifications(body: PushRequest) -> dict:
    """后台执行推送，立即返回 job_id"""
    job_id = str(uuid.uuid4())[:8]
    _job_status[job_id] = {
        "job_id": job_id,
        "status": "queued",
        "platform": body.platform,
        "template": body.template,
        "channels": body.channels,
        "created_at": datetime.now().isoformat(),
        "progress": {"sent": 0, "total": len(body.channels), "current": None},
        "results": [],
    }

    loop = asyncio.get_event_loop()
    loop.run_in_executor(None, _run_push_job, job_id, body)

    return {"job_id": job_id, "status": "queued", "total_channels": len(body.channels)}


@router.post("/notifications/push/preview")
def push_preview(body: PushPreviewRequest) -> dict:
    """Dry-run 预览：生成图片，返回统计信息"""
    template_role_map = {
        "cc_followup": "CC",
        "lp_followup": "LP",
        "ss_followup": "SS",
        "ops_followup": "运营",
    }
    role = template_role_map.get(body.template, "CC")

    cmd = [
        "uv", "run", "python", "scripts/lark_bot.py",
        "followup",
        "--role", role,
        "--dry-run",
    ]

    try:
        result = subprocess.run(
            cmd,
            cwd=str(PROJECT_ROOT),
            capture_output=True,
            text=True,
            timeout=60,
        )

        # 扫描今日生成的图片
        today = datetime.now().strftime("%Y%m%d")
        images = sorted(OUTPUT_DIR.glob(f"lark-*-{role}-{today}*.png"))
        overview_images = [f.name for f in images if "overview" in f.name.lower()]
        sample_images = [f.name for f in images if "followup" in f.name.lower()][:3]

        return {
            "ok": result.returncode == 0,
            "role": role,
            "template": body.template,
            "images_count": len(images),
            "overview_image": overview_images[0] if overview_images else None,
            "sample_images": sample_images,
            "stdout_tail": result.stdout[-500:] if result.stdout else "",
        }
    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=504, detail="预览生成超时（60s）") from None
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"预览失败: {e}") from e


@router.get("/notifications/push/status/{job_id}")
def get_push_status(job_id: str) -> dict:
    """查询推送任务进度"""
    if job_id not in _job_status:
        raise HTTPException(status_code=404, detail=f"任务 '{job_id}' 不存在")
    return _job_status[job_id]


@router.get("/notifications/today")
def get_today_status() -> dict:
    """读取今日推送日志"""
    today = datetime.now().strftime("%Y-%m-%d")

    if not NOTIFICATION_LOG_PATH.exists():
        return {"date": today, "channels": {}}

    channels: dict[str, dict] = {}
    try:
        with open(NOTIFICATION_LOG_PATH, encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    entry = json.loads(line)
                    ts = entry.get("ts", "")
                    if not ts.startswith(today):
                        continue
                    ch_id = entry.get("channel", "unknown")
                    results = entry.get("results", [])
                    sent_count = sum(1 for r in results if r.get("status") == "sent")
                    total_count = len(results)
                    channels[ch_id] = {
                        "pushed": sent_count > 0,
                        "time": ts[11:16] if len(ts) >= 16 else ts,
                        "result": (
                            f"{sent_count}/{total_count}" if total_count else "0/0"
                        ),
                        "platform": entry.get("platform", ""),
                    }
                except (json.JSONDecodeError, KeyError):
                    continue
    except OSError:
        pass

    return {"date": today, "channels": channels, "total": len(channels)}


# ── 产出档案 ──────────────────────────────────────────────────────────────────

@router.get("/notifications/outputs")
def list_outputs(
    date: str | None = Query(None, description="日期 YYYY-MM-DD"),
    role: str | None = Query(None, description="角色 CC/LP/SS"),
) -> dict:
    """扫描 output/ 目录返回图片文件列表"""
    if not OUTPUT_DIR.exists():
        return {"files": [], "total": 0}

    # 构建 glob pattern
    date_tag = date.replace("-", "") if date else "*"
    role_tag = role if role else "*"
    pattern = f"lark-*-{role_tag}-{date_tag}*.png"

    files = sorted(OUTPUT_DIR.glob(pattern))
    result = []
    for f in files:
        result.append({
            "filename": f.name,
            "size_kb": round(f.stat().st_size / 1024, 1),
            "modified": datetime.fromtimestamp(f.stat().st_mtime).strftime(
                "%Y-%m-%d %H:%M"
            ),
        })

    return {"files": result, "total": len(result)}


@router.get("/notifications/outputs/image/{filename}")
def get_output_image(filename: str) -> FileResponse:
    """返回图片文件"""
    # 安全检查：只允许 .png 文件，防止路径穿越
    if ".." in filename or "/" in filename or not filename.endswith(".png"):
        raise HTTPException(status_code=400, detail="无效文件名")

    path = OUTPUT_DIR / filename
    if not path.exists():
        raise HTTPException(status_code=404, detail=f"文件不存在: {filename}")

    return FileResponse(str(path), media_type="image/png")


@router.get("/notifications/outputs/{date}/{role}/text")
def get_output_text(date: str, role: str) -> dict:
    """返回该日该角色的推送文本内容"""
    date_tag = date.replace("-", "")
    # 查找匹配的文本文件（.txt 或 .md）
    for ext in ["txt", "md"]:
        pattern = f"lark-*-{role}-{date_tag}*.{ext}"
        files = sorted(OUTPUT_DIR.glob(pattern))
        if files:
            try:
                content = files[0].read_text(encoding="utf-8")
                return {
                    "date": date,
                    "role": role,
                    "filename": files[0].name,
                    "content": content,
                }
            except OSError:
                pass

    # 尝试从 notification-log.jsonl 查找对应记录的文本摘要
    if NOTIFICATION_LOG_PATH.exists():
        try:
            with open(NOTIFICATION_LOG_PATH, encoding="utf-8") as f:
                for line in reversed(f.readlines()):
                    line = line.strip()
                    if not line:
                        continue
                    try:
                        entry = json.loads(line)
                        ts = entry.get("ts", "")
                        if ts[:10] == date and entry.get("role", "") == role:
                            return {
                                "date": date,
                                "role": role,
                                "filename": None,
                                "content": entry.get("summary_text", ""),
                            }
                    except (json.JSONDecodeError, KeyError):
                        continue
        except OSError:
            pass

    return {"date": date, "role": role, "filename": None, "content": ""}


@router.put("/notifications/outputs/{date}/{role}/text")
def update_output_text(date: str, role: str, body: TextUpdateRequest) -> dict:
    """编辑推送文本内容（写入对应 .txt 文件）"""
    date_tag = date.replace("-", "")
    filename = f"lark-summary-{role}-{date_tag}.txt"
    path = OUTPUT_DIR / filename

    try:
        path.write_text(body.content, encoding="utf-8")
        return {"ok": True, "filename": filename, "date": date, "role": role}
    except OSError as e:
        raise HTTPException(status_code=500, detail=f"写入失败: {e}") from e


# ── 定时排程 ──────────────────────────────────────────────────────────────────

class ScheduleIn(BaseModel):
    name: str
    platform: str  # lark / dingtalk
    template: str  # cc_followup / lp_followup / ss_followup / ops_followup
    channels: list[str]
    cron_hour: int
    cron_minute: int
    force: bool = False
    dry_run: bool = False
    enabled: bool = True
    description: str = ""

    @field_validator("platform")
    @classmethod
    def _validate_platform(cls, v: str) -> str:
        if v not in ("lark", "dingtalk"):
            raise ValueError("platform 必须是 lark 或 dingtalk")
        return v

    @field_validator("cron_hour")
    @classmethod
    def _validate_hour(cls, v: int) -> int:
        if not 0 <= v <= 23:
            raise ValueError("cron_hour 必须在 0-23 之间")
        return v

    @field_validator("cron_minute")
    @classmethod
    def _validate_minute(cls, v: int) -> int:
        if not 0 <= v <= 59:
            raise ValueError("cron_minute 必须在 0-59 之间")
        return v


class ScheduleUpdate(BaseModel):
    name: str | None = None
    platform: str | None = None
    template: str | None = None
    channels: list[str] | None = None
    cron_hour: int | None = None
    cron_minute: int | None = None
    force: bool | None = None
    dry_run: bool | None = None
    enabled: bool | None = None
    description: str | None = None


def _read_schedules() -> list[dict]:
    data = _read_json(SCHEDULE_CONFIG_PATH, [])
    return data if isinstance(data, list) else []


def _write_schedules(schedules: list[dict]) -> None:
    _write_json(SCHEDULE_CONFIG_PATH, schedules)


def _sync_scheduler(app_state: Any | None = None) -> None:
    """将 config 中 enabled=True 的排程同步到 APScheduler。
    app_state 为 FastAPI app.state，含 scheduler 实例。
    """
    if app_state is None:
        return
    scheduler = getattr(app_state, "scheduler", None)
    if scheduler is None:
        return

    schedules = _read_schedules()
    # 移除所有 notification_schedule_* 的旧 job
    for job in scheduler.get_jobs():
        if job.id.startswith("notification_schedule_"):
            scheduler.remove_job(job.id)

    # 重新注册 enabled job
    for sch in schedules:
        if not sch.get("enabled", True):
            continue
        job_id = f"notification_schedule_{sch['id']}"
        scheduler.add_job(
            _execute_schedule_job,
            trigger="cron",
            hour=sch.get("cron_hour", 9),
            minute=sch.get("cron_minute", 0),
            id=job_id,
            replace_existing=True,
            kwargs={"schedule_id": sch["id"]},
        )


def _execute_schedule_job(schedule_id: str) -> None:
    """APScheduler 回调：执行指定排程的推送"""
    schedules = _read_schedules()
    sch = next((s for s in schedules if s["id"] == schedule_id), None)
    if sch is None or not sch.get("enabled", True):
        return

    push_body = PushRequest(
        platform=sch["platform"],
        template=sch["template"],
        channels=sch.get("channels", []),
        force=sch.get("force", False),
        dry_run=sch.get("dry_run", False),
    )
    job_id = f"sched_{schedule_id}_{datetime.now().strftime('%H%M%S')}"
    _job_status[job_id] = {
        "job_id": job_id,
        "status": "queued",
        "platform": push_body.platform,
        "template": push_body.template,
        "channels": push_body.channels,
        "created_at": datetime.now().isoformat(),
        "schedule_id": schedule_id,
        "progress": {"sent": 0, "total": len(push_body.channels), "current": None},
        "results": [],
    }
    _run_push_job(job_id, push_body)


# ── 排程 CRUD ─────────────────────────────────────────────────────────────────

from fastapi import Request as _Request  # noqa: E402


@router.get("/notifications/schedule")
def list_schedules() -> dict:
    """排程列表"""
    schedules = _read_schedules()
    return {"schedules": schedules, "total": len(schedules)}


@router.post("/notifications/schedule", status_code=201)
def create_schedule(body: ScheduleIn, request: _Request) -> dict:
    """新建排程"""
    schedules = _read_schedules()
    new_id = str(uuid.uuid4())[:8]
    entry: dict = {
        "id": new_id,
        "name": body.name,
        "platform": body.platform,
        "template": body.template,
        "channels": body.channels,
        "cron_hour": body.cron_hour,
        "cron_minute": body.cron_minute,
        "force": body.force,
        "dry_run": body.dry_run,
        "enabled": body.enabled,
        "description": body.description,
        "created_at": datetime.now().isoformat(),
    }
    schedules.append(entry)
    _write_schedules(schedules)
    _sync_scheduler(getattr(request.app, "state", None))
    return {"ok": True, "id": new_id}


@router.put("/notifications/schedule/{schedule_id}")
def update_schedule(
    schedule_id: str, body: ScheduleUpdate, request: _Request
) -> dict:
    """编辑排程"""
    schedules = _read_schedules()
    idx = next(
        (i for i, s in enumerate(schedules) if s["id"] == schedule_id), None
    )
    if idx is None:
        raise HTTPException(status_code=404, detail=f"排程 '{schedule_id}' 不存在")

    update = body.model_dump(exclude_none=True)
    schedules[idx].update(update)
    schedules[idx]["updated_at"] = datetime.now().isoformat()
    _write_schedules(schedules)
    _sync_scheduler(getattr(request.app, "state", None))
    return {"ok": True, "id": schedule_id}


@router.delete("/notifications/schedule/{schedule_id}")
def delete_schedule(schedule_id: str, request: _Request) -> dict:
    """删除排程"""
    schedules = _read_schedules()
    before_len = len(schedules)
    schedules = [s for s in schedules if s["id"] != schedule_id]
    if len(schedules) == before_len:
        raise HTTPException(status_code=404, detail=f"排程 '{schedule_id}' 不存在")
    _write_schedules(schedules)
    _sync_scheduler(getattr(request.app, "state", None))
    return {"ok": True, "deleted": schedule_id}


@router.post("/notifications/schedule/{schedule_id}/toggle")
def toggle_schedule(schedule_id: str, request: _Request) -> dict:
    """启停排程"""
    schedules = _read_schedules()
    idx = next(
        (i for i, s in enumerate(schedules) if s["id"] == schedule_id), None
    )
    if idx is None:
        raise HTTPException(status_code=404, detail=f"排程 '{schedule_id}' 不存在")

    schedules[idx]["enabled"] = not schedules[idx].get("enabled", True)
    schedules[idx]["updated_at"] = datetime.now().isoformat()
    _write_schedules(schedules)
    _sync_scheduler(getattr(request.app, "state", None))
    return {"ok": True, "id": schedule_id, "enabled": schedules[idx]["enabled"]}
