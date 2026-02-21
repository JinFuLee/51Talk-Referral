from fastapi import APIRouter, Request
from pathlib import Path
import json

router = APIRouter(prefix="/api/system", tags=["system"])

LOG_FILE = Path("output/error-log.jsonl")

@router.post("/error-log")
async def receive_error_log(request: Request):
    body = await request.json()
    entries = body.get("entries", [])
    LOG_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(LOG_FILE, "a", encoding="utf-8") as f:
        for entry in entries:
            f.write(json.dumps(entry, ensure_ascii=False) + "\n")
    return {"received": len(entries)}

@router.get("/error-log")
async def get_error_log(limit: int = 50):
    if not LOG_FILE.exists():
        return {"entries": [], "total": 0}
    lines = LOG_FILE.read_text(encoding="utf-8").strip().split("\n")
    entries = [json.loads(l) for l in lines[-limit:] if l.strip()]
    return {"entries": entries, "total": len(lines)}

@router.delete("/error-log")
async def clear_error_log():
    if LOG_FILE.exists():
        LOG_FILE.unlink()
    return {"cleared": True}
