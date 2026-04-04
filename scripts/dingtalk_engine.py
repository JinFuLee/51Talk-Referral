#!/usr/bin/env python3
"""钉钉多通道通知引擎

支持多群、多角色、多层级的推送路由。
框架配置：key/dingtalk-channels.json
内容配置：projects/referral/notification-config.json

用法：
  from scripts.dingtalk_engine import NotificationEngine
  engine = NotificationEngine()
  engine.run()                          # 推送所有 enabled 通道
  engine.run(channel_id="cc_all")       # 推送指定通道
  engine.run(dry_run=True)              # 只生成图片不发送
  engine.run(test=True)                 # 连通性测试
"""
from __future__ import annotations

import base64
import hashlib
import hmac
import io
import json
import time
import urllib.parse
import urllib.request
from datetime import datetime
from pathlib import Path
from typing import Any

import matplotlib

matplotlib.use("Agg")
import matplotlib.patches as mpatches  # noqa: E402
import matplotlib.pyplot as plt  # noqa: E402

# ── SEE Design System — Warm Neutral 色板（与 dingtalk_daily.py 同源）──────────
_C_BG = "#FAFAF9"
_C_SURFACE = "#F5F5F4"
_C_ELEVATED = "#E7E5E4"
_C_BORDER = "#E7E5E4"
_C_BORDER_H = "#D6D3D1"
_C_MUTED = "#78716C"
_C_TEXT2 = "#57534E"
_C_TEXT = "#1C1917"
_C_N800 = "#292524"
_C_BRAND_P2 = "#3730A3"
_C_ACCENT = "#F59E0B"
_C_SUCCESS = "#059669"
_C_WARNING = "#D97706"
_C_DANGER = "#DC2626"
_C_GREEN_BG = "#ECFDF5"
_C_YELLOW_BG = "#FFFBEB"
_C_RED_BG = "#FEF2F2"

_THAI_FONTS = [
    "Tahoma", "Angsana New", "Browallia New", "Cordia New",
    "TH Sarabun New", "Leelawadee", "Arial Unicode MS", "DejaVu Sans",
    "sans-serif",
]

PROJECT_ROOT = Path(__file__).resolve().parent.parent
PROJECT_CONFIG_PATH = PROJECT_ROOT / "projects" / "referral" / "config.json"
DEFAULT_CHANNELS_PATH = PROJECT_ROOT / "key" / "dingtalk-channels.json"
DEFAULT_CONFIG_PATH = (
    PROJECT_ROOT / "projects" / "referral" / "notification-config.json"
)
OUTPUT_DIR = PROJECT_ROOT / "output"
LOG_PATH = OUTPUT_DIR / "notification-log.jsonl"


class NotificationEngine:
    """通用通知引擎：读配置 → 按通道生成 → 发送 → 日志

    配置分层：
      channels_path（key/dingtalk-channels.json）
        — 机密层：webhook/secret/通道元数据
      config_path（projects/referral/notification-config.json）
        — 内容层：模块定义/路由规则
    """

    def __init__(
        self,
        channels_path: Path = DEFAULT_CHANNELS_PATH,
        config_path: Path = DEFAULT_CONFIG_PATH,
    ) -> None:
        self.channels_data = self._load_json(channels_path)
        self.config = self._load_json(config_path)
        self.channels: dict[str, dict] = self.channels_data.get("channels", {})
        self.defaults: dict[str, Any] = self.channels_data.get("defaults", {})
        self.api_base: str = self.defaults.get("api_base", "http://localhost:8100")
        self.routing: dict[str, list[str]] = self.config.get("routing", {})

    # ── 公共接口 ──────────────────────────────────────────────────────────────

    def _today_tag(self) -> str:
        return datetime.now().strftime("%Y%m%d")

    def _is_already_sent(self, channel_id: str) -> bool:
        """幂等检查：同日同通道是否已推送成功（防重复推送）"""
        today = self._today_tag()
        if not LOG_PATH.exists():
            return False
        with open(LOG_PATH) as f:
            for line in f:
                try:
                    entry = json.loads(line.strip())
                    if (
                        entry.get("channel") == channel_id
                        and entry.get("ts", "")[:10].replace("-", "") == today
                        and any(
                            r.get("status") == "sent"
                            for r in entry.get("results", [])
                        )
                    ):
                        return True
                except json.JSONDecodeError:
                    continue
        return False

    def run(
        self,
        channel_id: str | None = None,
        dry_run: bool = False,
        test: bool = False,
        force: bool = False,
        sandbox: bool = False,
    ) -> None:
        """执行推送

        Args:
            channel_id: 指定通道 ID；None 表示所有 enabled 通道
            dry_run:    只生成图片，不上传不发送
            test:       发送连通性测试消息
            force:      忽略幂等检查，强制重发
            sandbox:    沙箱模式，所有推送重定向到测试群
        """
        # 从配置注入阈值到 dingtalk_daily 模块（确保图片生成用配置值）
        th = self.defaults.get("thresholds", {})
        import sys
        _sd = str(Path(__file__).resolve().parent)
        if _sd not in sys.path:
            sys.path.insert(0, _sd)
        import dingtalk_daily as _dm
        _dm.GOOD_RATE = th.get("good", 0.6)
        _dm.WARN_RATE = th.get("warning", 0.4)

        targets = self._resolve_targets(channel_id)

        # sandbox 模式：保留内容路由，替换发送目标为测试群
        if sandbox:
            sandbox_id = self.defaults.get("sandbox_channel", "test")
            sandbox_ch = self.channels.get(sandbox_id)
            if not sandbox_ch:
                print(f"[错误] sandbox 通道 {sandbox_id!r} 不存在")
                return
            print(
                f"🔒 沙箱模式：所有推送重定向到"
                f" [{sandbox_ch.get('group_name', sandbox_id)}]"
            )
            targets = [
                (
                    ch_id,
                    {
                        **ch,
                        "webhook": sandbox_ch["webhook"],
                        "secret": sandbox_ch["secret"],
                    },
                )
                for ch_id, ch in targets
            ]

        # 幂等过滤：同日已成功推送的通道跳过
        if not force and not test and not dry_run:
            filtered = []
            for ch_id, ch in targets:
                if self._is_already_sent(ch_id):
                    print(f"[跳过] {ch_id} 今日已推送，用 --force 强制重发")
                else:
                    filtered.append((ch_id, ch))
            targets = filtered

        if not targets:
            print("没有可用的通道（检查 channels.json 和 enabled 状态）")
            return

        # ── Stage 1: Pre-generate 数据验收 ────────────────────────────────
        if not test:
            _pr = str(Path(__file__).resolve().parent.parent)
            if _pr not in sys.path:
                sys.path.insert(0, _pr)
            from backend.core.notification_validator import NotificationValidator
            _validator = NotificationValidator()
            overview = self._fetch_overview()
            if overview:
                _vr = _validator.validate_pre_send("overview", overview)
                if not _vr.passed:
                    print("\n[BLOCKED] 数据验收未通过（非泰国/数据过旧/指标异常）:")
                    for v in _vr.violations:
                        print(f"  ✗ {v}")
                    _validator.log_failure(_vr, "dingtalk_engine.run")
                    if not dry_run:
                        print("推送已阻止。请检查数据源后重试。")
                        return
                    print("[DRY-RUN] 继续执行（仅生成不发送）")
                else:
                    print("✓ 数据验收通过")

        for ch_idx, (ch_id, ch) in enumerate(targets):
            if ch_idx > 0 and not test:
                time.sleep(5)  # 通道间间隔，避免跨群频率限制
            print(f"\n{'='*40}")
            print(
                f"通道: {ch_id} ({ch.get('group_name', '?')}) | "
                f"角色: {ch.get('role')} | "
                f"受众: {ch.get('audience')}"
            )
            print(f"{'='*40}")

            if test:
                self._send_test(ch)
                continue

            modules = self._get_modules(ch)
            print(f"内容模块: {', '.join(modules)}")

            results: list[dict] = []
            for mod_id in modules:
                result = self._process_module(mod_id, ch, dry_run)
                results.append(result)

            if not dry_run:
                self._log(ch_id, ch, modules, results)

        print(f"\n完成：{len(targets)} 个通道")

    # ── 内部：通道解析 ────────────────────────────────────────────────────────

    def _resolve_targets(self, channel_id: str | None) -> list[tuple[str, dict]]:
        """解析目标通道列表"""
        if channel_id:
            ch = self.channels.get(channel_id)
            if not ch:
                available = list(self.channels.keys())
                print(f"通道 {channel_id!r} 不存在，可用通道: {available}")
                return []
            return [(channel_id, ch)]
        # 全部 enabled 通道
        return [
            (cid, ch)
            for cid, ch in self.channels.items()
            if ch.get("enabled", False)
        ]

    def _get_modules(self, channel: dict) -> list[str]:
        """根据 audience 路由到内容模块列表"""
        audience = channel.get("audience", "all")
        return self.routing.get(audience, self.routing.get("all", []))

    # ── 内部：模块处理 ────────────────────────────────────────────────────────

    # ── 硬防线：角色隔离 ──────────────────────────────────────────────────
    # CC/SS/LP 三群互不串发（硬性规则，不可违反）。
    # - cc_enc_warning 是唯一 CC 结构专属模块（数据结构绑定 CC）
    # - 其余模块（result_metrics 等）按 role 参数生成对应角色数据，
    #   数据层隔离靠 data["by_role"][role] 选取，不会串角色
    # - 测试群（test）不受角色隔离限制，可接收所有内容
    _CC_STRUCT_ONLY_MODULES = frozenset({"cc_enc_warning"})

    def _process_module(self, module_id: str, channel: dict, dry_run: bool) -> dict:
        """处理单个内容模块：获取数据 → 生成图片/文本 → 发送"""
        result: dict[str, Any] = {
            "module": module_id,
            "status": "pending",
            "images_count": 0,
        }

        try:
            role = channel.get("role", "CC")

            # ── 硬防线：CC 结构专属模块，非 CC 角色直接跳过 ──
            if role != "CC" and module_id in self._CC_STRUCT_ONLY_MODULES:
                result["status"] = "skipped_role_isolation"
                return result

            # role=ALL（ops 通道）：循环 CC/SS/LP 各走一遍，每角色独立生成
            if role == "ALL":
                combined: list[dict] = []
                for sub_role in ["CC", "SS", "LP"]:
                    sub_ch = {**channel, "role": sub_role}
                    sub_result = self._process_module(
                        module_id, sub_ch, dry_run
                    )
                    combined.append(sub_result)
                sent = any(
                    r.get("status") == "sent" for r in combined
                )
                result["status"] = (
                    "sent" if sent
                    else combined[0].get("status", "pending")
                )
                result["images_count"] = sum(
                    r.get("images_count", 0) for r in combined
                )
                result["sub_results"] = combined
                return result

            # tl_overview：业绩排名总览（THB，含 BM + 打卡率 + 参与率）
            if module_id == "tl_overview":
                perf = self._fetch_cc_performance()
                if not perf or not perf.get("teams"):
                    result["status"] = "no_data"
                    print("  [tl_overview] 无 cc-performance 数据")
                    return result
                today_str = datetime.now().strftime("%d/%m")
                img = self._gen_tl_overview_image(perf, today_str)
                date_tag = datetime.now().strftime("%Y%m%d")
                path = OUTPUT_DIR / f"tl-overview-{date_tag}.png"
                path.write_bytes(img)
                result["images_count"] = 1
                if dry_run:
                    kb = len(img) / 1024
                    print(f"  [tl_overview] CC Revenue Ranking → {path} ({kb:.0f} KB)")
                    result["status"] = "dry_run"
                else:
                    title = f"📊 CC Revenue Ranking {today_str}"
                    sent = self._upload_and_send(img, title, channel, path.name)
                    result["status"] = "sent" if sent else "error"
                return result

            # team_checkin_combined：打卡图 + 未打卡 ID 合并为一条消息/组
            if module_id == "team_checkin_combined":
                return self._process_team_checkin_combined(role, channel, dry_run)

            # followup_per_cc：分组推送（8 条消息：1 总览 + 7 小组，每 CC 图片+ID）
            if module_id == "followup_per_cc":
                return self._process_followup_per_cc(role, channel, dry_run)

            # team_comprehensive：每组多维达成卡（1 图/组，合并打卡+业绩）
            if module_id == "team_comprehensive":
                return self._process_team_comprehensive(role, channel, dry_run)

            # unchecked_ids：按组拆发未打卡学员 ID（每组一条文本，围场分段）
            if module_id == "unchecked_ids":
                return self._process_unchecked_ids_per_team(role, channel, dry_run)

            # action_items 是文本消息，走独立分支
            if module_id == "action_items":
                md_text = self._generate_action_items_text(role)
                if dry_run:
                    print(f"  [{module_id}] (文本消息 dry-run):\n{md_text[:200]}...")
                    result["status"] = "dry_run"
                else:
                    title = "📋 คำแนะนำการดำเนินงาน"
                    r = self._send_dingtalk(title, md_text, channel)
                    if r.get("errcode") == 0:
                        print(f"  ✅ {title}")
                        result["status"] = "sent"
                    else:
                        print(f"  ❌ {title}: {r}")
                        result["status"] = "error"
                return result

            # student_improvement：学员打卡进步 Top5 + 沉睡高潜统计（文本消息）
            if module_id == "student_improvement":
                md_text = self._generate_student_improvement_text()
                if dry_run:
                    preview = md_text[:300]
                    print(
                        f"  [student_improvement] (文本消息 dry-run):\n{preview}..."
                    )
                    result["status"] = "dry_run"
                else:
                    title = "📈 นักเรียนพัฒนาการ Top5"
                    r = self._send_dingtalk(title, md_text, channel)
                    if r.get("errcode") == 0:
                        print(f"  ✅ {title}")
                        result["status"] = "sent"
                    else:
                        print(f"  ❌ {title}: {r}")
                        result["status"] = "error"
                return result

            # cc_enc_warning：图片 + 文本（学员 ID 方便复制）
            if module_id == "cc_enc_warning":
                if role != "CC":
                    result["status"] = "skipped"
                    return result
                return self._process_warning_with_ids(
                    role, channel, dry_run, result,
                )

            data = self._fetch_data(role)
            if not data:
                result["status"] = "no_data"
                print(f"  [{module_id}] 无数据")
                return result

            images = self._generate_images(module_id, data, role)
            result["images_count"] = len(images)

            if not images:
                # efficiency_metrics 与 process_metrics 合并为一张图，此处跳过
                if module_id == "efficiency_metrics":
                    result["status"] = "merged"
                    print(
                        f"  [{module_id}] 已合并至 process_metrics 图片"
                    )
                else:
                    result["status"] = "no_images"
                    print(
                        f"  [{module_id}] 该模块暂无图片生成器（待后续迭代实现）"
                    )
                return result

            if dry_run:
                for title, img_bytes, path in images:
                    kb = len(img_bytes) / 1024
                    print(f"  [{module_id}] {title} → {path} ({kb:.0f} KB)")
                result["status"] = "dry_run"
                return result

            # 发送（含重试）
            success = 0
            for img_idx, (title, img_bytes, path) in enumerate(images):
                if img_idx > 0:
                    time.sleep(5)  # 钉钉 20条/分钟，5s间隔=12条/分钟（安全）
                sent = self._upload_and_send(
                    img_bytes, title, channel, path.name
                )
                if sent:
                    success += 1

            result["status"] = "sent" if success == len(images) else "partial"
            result["sent"] = success

        except Exception as e:
            result["status"] = "error"
            result["error"] = str(e)
            print(f"  [{module_id}] 错误: {e}")

        return result

    # ── 内部：数据获取 ────────────────────────────────────────────────────────

    def _build_narrow_role_config(self) -> dict | None:
        """从 config.json 读取 enclosure_role_narrow 构建窄口径 role_config。
        通知机器人只发送窄口径数据（CC/SS/LP，无运营）。"""
        try:
            with open(PROJECT_CONFIG_PATH) as f:
                cfg = json.load(f)
            narrow = cfg.get("enclosure_role_narrow")
            if narrow:
                return narrow
        except (FileNotFoundError, json.JSONDecodeError):
            pass
        return None

    def _fetch_data(self, role: str) -> dict | None:
        """从后端 API 获取打卡排行数据（含重试）
        默认使用窄口径（enclosure_role_narrow），channels.json 的 role_config 覆盖。
        """
        role_config = (
            self.defaults.get("role_config")
            or self._build_narrow_role_config()
        )
        url = f"{self.api_base}/api/checkin/ranking"
        if role_config:
            encoded = urllib.parse.quote(json.dumps(role_config, ensure_ascii=False))
            url += f"?role_config={encoded}"

        last_exc: Exception | None = None
        for attempt in range(3):
            if attempt > 0:
                time.sleep(attempt * 1)
            try:
                req = urllib.request.Request(
                    url, headers={"Accept": "application/json"}
                )
                with urllib.request.urlopen(req, timeout=15) as resp:
                    return json.loads(resp.read().decode("utf-8"))
            except Exception as e:
                last_exc = e
                print(f"  _fetch_data 第 {attempt + 1} 次失败: {e}")

        raise RuntimeError("_fetch_data 重试 3 次仍失败") from last_exc

    def _fetch_url(self, url: str) -> dict | None:
        """通用 HTTP GET，含 3 次重试，失败返回 None（不抛出异常）"""
        last_exc: Exception | None = None
        for attempt in range(3):
            if attempt > 0:
                time.sleep(attempt * 1)
            try:
                req = urllib.request.Request(
                    url, headers={"Accept": "application/json"}
                )
                with urllib.request.urlopen(req, timeout=15) as resp:
                    return json.loads(resp.read().decode("utf-8"))
            except Exception as e:
                last_exc = e
                print(f"  _fetch_url({url}) 第 {attempt + 1} 次失败: {e}")
        print(f"  _fetch_url 重试耗尽: {last_exc}")
        return None

    def _fetch_overview(self) -> dict | None:
        """获取 /api/overview 数据（含 metrics/time_progress/kpi_pace）"""
        return self._fetch_url(f"{self.api_base}/api/overview")

    def _fetch_followup(self, role: str) -> dict | None:
        """获取 /api/checkin/followup?role={role} 未打卡高潜学员数据"""
        return self._fetch_url(
            f"{self.api_base}/api/checkin/followup?role={urllib.parse.quote(role)}"
        )

    def _fetch_student_analysis(self, limit: int = 5) -> dict | None:
        """获取 /api/checkin/student-analysis?limit=N 学员打卡分析数据"""
        return self._fetch_url(
            f"{self.api_base}/api/checkin/student-analysis?limit={limit}"
        )

    # ── 内部：图片生成 ────────────────────────────────────────────────────────

    def _generate_images(
        self,
        module_id: str,
        data: dict,
        role: str,
    ) -> list[tuple[str, bytes, Path]]:
        """生成图片，返回 [(title, image_bytes, save_path)]

        延迟 import dingtalk_daily 的图片函数，避免循环依赖。
        未实现的模块返回空列表，不报错（待后续迭代）。
        """
        # 延迟导入，避免循环依赖（engine 先加载，daily 后加载时不触发重入）
        import sys  # noqa: PLC0415

        _scripts_dir = str(Path(__file__).resolve().parent)
        if _scripts_dir not in sys.path:
            sys.path.insert(0, _scripts_dir)
        import dingtalk_daily as _daily_mod  # noqa: PLC0415
        generate_report_image = _daily_mod.generate_report_image
        generate_team_image = _daily_mod.generate_team_image

        OUTPUT_DIR.mkdir(exist_ok=True)
        date_tag = datetime.now().strftime("%Y%m%d")
        today_str = datetime.now().strftime("%d/%m")
        images: list[tuple[str, bytes, Path]] = []

        role_data = data.get("by_role", {}).get(role, {})

        if module_id == "team_ranking":
            img = generate_report_image(data, role)
            path = OUTPUT_DIR / f"checkin-overview-{role}-{date_tag}.png"
            path.write_bytes(img)
            images.append((f"{role} Check-in Overview {today_str}", img, path))

        elif module_id == "individual_ranking":
            persons: list[dict] = role_data.get("by_person", [])
            groups: list[dict] = role_data.get("by_group", [])

            # 按 group 分桶
            group_members: dict[str, list[dict]] = {}
            for p in persons:
                g = p.get("group", "") or "Unknown"
                group_members.setdefault(g, []).append(p)

            # 按 by_group 顺序排列，补充不在列表中的团队
            group_order = [g.get("group", "") for g in groups]
            ordered = [t for t in group_order if t in group_members]
            ordered += [t for t in group_members if t not in ordered]

            for team_name in ordered:
                members = group_members[team_name]
                if not members:
                    continue
                t_total = sum(m.get("students", 0) for m in members)
                t_checked = sum(m.get("checked_in", 0) for m in members)
                short = team_name.replace("TH-", "").replace("Team", "")

                img = generate_team_image(team_name, members, t_total, t_checked)
                path = OUTPUT_DIR / f"checkin-{short}-{date_tag}.png"
                path.write_bytes(img)
                images.append((f"{short} Check-in {today_str}", img, path))

        elif module_id == "result_metrics":
            overview = self._fetch_overview()
            img_bytes = self._gen_result_metrics_image(overview, role, today_str)
            path = OUTPUT_DIR / f"result-metrics-{role}-{date_tag}.png"
            path.write_bytes(img_bytes)
            images.append((f"ผลลัพธ์ {role} {today_str}", img_bytes, path))

        elif module_id == "achievement_metrics":
            overview = self._fetch_overview()
            img_bytes = self._gen_achievement_metrics_image(overview, role, today_str)
            path = OUTPUT_DIR / f"achievement-metrics-{role}-{date_tag}.png"
            path.write_bytes(img_bytes)
            images.append((f"การบรรลุเป้า {role} {today_str}", img_bytes, path))

        elif module_id in ("process_metrics", "efficiency_metrics"):
            # 合并过程+效率为一张图
            # process_metrics 生成图，efficiency_metrics 跳过避免重复
            if module_id == "process_metrics":
                overview = self._fetch_overview()
                img_bytes = self._gen_process_efficiency_image(
                    overview, role, today_str
                )
                path = OUTPUT_DIR / f"process-efficiency-{role}-{date_tag}.png"
                path.write_bytes(img_bytes)
                title_th = f"กระบวนการ+ประสิทธิภาพ {role} {today_str}"
                images.append((title_th, img_bytes, path))

        elif module_id == "service_metrics":
            overview = self._fetch_overview()
            img_bytes = self._gen_service_metrics_image(overview, role, today_str)
            if img_bytes is not None:
                path = OUTPUT_DIR / f"service-metrics-{role}-{date_tag}.png"
                path.write_bytes(img_bytes)
                images.append((f"บริการ {role} {today_str}", img_bytes, path))
            else:
                print("  [service_metrics] ข้ามเนื่องจากไม่มีข้อมูล")

        elif module_id == "honor_ranking":
            persons = role_data.get("by_person", [])
            img_bytes = self._gen_honor_image(persons, role, today_str)
            if img_bytes is not None:
                path = OUTPUT_DIR / f"honor-ranking-{role}-{date_tag}.png"
                path.write_bytes(img_bytes)
                images.append(
                    (f"🏆 เกียรติยศเช็คอิน {role} {today_str}", img_bytes, path)
                )

        # cc_enc_warning 由 _process_module 直接处理（图片+文本双发）
        # action_items 由 _process_module 直接处理文本，不走图片流程
        else:
            pass

        return images

    # ── 内部：followup_per_cc 分组推送 ───────────────────────────────────────

    def _process_followup_per_cc(
        self, role: str, channel: dict, dry_run: bool,
    ) -> dict:
        """followup_per_cc 模块：分组推送未打卡名单
        发 (1 + N_teams) 条钉钉消息：
          1. 总览消息（总览图 + 各团队汇总行）
          2-N. 每团队消息（每 CC 一段：图片 + 学员 ID）
        复用 lark_bot 的图片生成函数和缓存逻辑，避免重复生成/上传。
        """
        import sys as _sys  # noqa: PLC0415

        _scripts_dir = str(Path(__file__).resolve().parent)
        if _scripts_dir not in _sys.path:
            _sys.path.insert(0, _scripts_dir)
        import lark_bot as _lb  # noqa: PLC0415

        today = datetime.now()
        date_short = today.strftime("%Y%m%d")
        date_display = f"{today.strftime('%Y年%m月%d日')} T-1"

        result: dict[str, Any] = {"module": "followup_per_cc", "status": "pending"}

        # 1. 获取数据
        followup = self._fetch_followup(role)
        students: list[dict] = followup.get("students", []) if followup else []
        if not students:
            result["status"] = "no_data"
            print("  [followup_per_cc] 无未打卡学员数据")
            return result

        print(f"  [followup_per_cc] 共 {len(students)} 名未打卡学员")

        # ── Stage 2: Pre-send 学员团队验收 ────────────────────────────
        _pr2 = str(Path(__file__).resolve().parent.parent)
        if _pr2 not in _sys.path:
            _sys.path.insert(0, _pr2)
        from backend.core.notification_validator import NotificationValidator
        _v2 = NotificationValidator()
        _vr2 = _v2.validate_pre_send("followup", {"students": students})
        if not _vr2.passed:
            print("  [BLOCKED] followup 数据验收未通过:")
            for v in _vr2.violations:
                print(f"    ✗ {v}")
            _v2.log_failure(_vr2, "dingtalk_engine._process_followup_per_cc")
            if not dry_run:
                result["status"] = "blocked_validation"
                return result
            print("  [DRY-RUN] 继续执行")
        else:
            print("  ✓ followup 数据验收通过")

        # 2. 按团队 → 按 CC 分组
        teams = _lb.group_students_by_team(students)

        # 3. 构建 team_summary（用于总览图）
        team_summary: list[dict] = []
        for team_name, members in teams.items():
            ccs = _lb.group_students_by_cc(members)
            team_summary.append({
                "team": team_name,
                "count": len(members),
                "cc_count": len(ccs),
                "avg": round(len(members) / max(len(ccs), 1), 1),
            })

        # 4. 生成/读取总览图（缓存）
        overview_filename = f"lark-overview-{date_short}.png"
        overview_path = _lb.OUTPUT_DIR / overview_filename
        if overview_path.exists():
            overview_bytes = overview_path.read_bytes()
            print(f"  [followup_per_cc] 总览图缓存: {overview_filename}")
        else:
            overview_bytes = _lb.generate_overview_image(team_summary, date_display)
            overview_path.write_bytes(overview_bytes)
            print(f"  [followup_per_cc] 总览图新生成: {overview_filename}")

        # 5. 生成/读取 per-CC 图片（缓存）
        team_cc_results: list[dict] = []
        for ts_row in team_summary:
            team_name = ts_row["team"]
            members = teams[team_name]
            ccs = _lb.group_students_by_cc(members)
            cc_list: list[dict] = []
            for cc_name, cc_students in ccs.items():
                team_safe = team_name.replace("/", "-").replace(" ", "_")
                cc_safe = cc_name.replace("/", "-").replace(" ", "_")
                cc_filename = (
                    f"lark-followup-{team_safe}-{cc_safe}-{date_short}.png"
                )
                cc_path = _lb.OUTPUT_DIR / cc_filename
                if cc_path.exists():
                    cc_bytes = cc_path.read_bytes()
                else:
                    cc_bytes = _lb.generate_cc_image(
                        cc_name, team_name, cc_students, date_display
                    )
                    cc_path.write_bytes(cc_bytes)
                student_ids = [
                    str(s.get("student_id", "")) for s in cc_students
                ]
                cc_list.append({
                    "cc": cc_name,
                    "count": len(cc_students),
                    "img_url": None,
                    "student_ids": student_ids,
                    "filename": cc_filename,
                    "img_bytes": cc_bytes,
                })
            team_cc_results.append({
                "team": team_name,
                "count": len(members),
                "cc_count": len(ccs),
                "ccs": cc_list,
            })

        total_msgs = 1 + len(team_cc_results)

        # 6. dry_run：只输出摘要
        if dry_run:
            print(
                f"  [followup_per_cc] dry-run：共 {total_msgs} 条消息，"
                f"图片已保存到 output/"
            )
            result["status"] = "dry_run"
            result["messages_count"] = total_msgs
            return result

        # 7. 上传图片（复用 lark_bot URL 缓存，钉钉和 Lark 共享）
        url_cache = _lb.load_url_cache(date_short)
        overview_url = _lb.cached_upload(overview_bytes, overview_filename, url_cache)
        for tr in team_cc_results:
            for cc_entry in tr["ccs"]:
                cc_entry["img_url"] = _lb.cached_upload(
                    cc_entry["img_bytes"], cc_entry["filename"], url_cache
                )
        _lb.save_url_cache(date_short, url_cache)

        # 8. 发送消息
        sent = 0
        total_count = sum(tr["count"] for tr in team_cc_results)

        # 消息 1：总览
        today_str = today.strftime("%d/%m")
        overview_title = (
            f"ภาพรวม CC ยังไม่เช็คอิน — {today_str}\n"
            f"CC 未打卡总览"
        )
        overview_lines = [
            f"## ภาพรวม CC ยังไม่เช็คอิน — {today_str}",
            "CC 未打卡总览",
            "",
            f"**รวมยังไม่เช็คอิน {total_count} คน"
            f" ({len(team_cc_results)} ทีม)**",
            f"共未打卡 {total_count} 人（{len(team_cc_results)} 个小组）",
            "",
        ]
        for tr in team_cc_results:
            overview_lines.append(
                f"📊 **{tr['team']}**  "
                f"ยังไม่เช็คอิน {tr['count']} คน  |  CC {tr['cc_count']}"
            )
            overview_lines.append(
                f"&nbsp;&nbsp;&nbsp;&nbsp;未打卡 {tr['count']} 人"
                f"  |  CC数 {tr['cc_count']}"
            )
        if overview_url:
            overview_lines.extend([
                "",
                f"![ภาพรวม]({overview_url})",
            ])
        overview_md = "\n".join(overview_lines)
        r = self._send_dingtalk(overview_title, overview_md, channel)
        if r.get("errcode") == 0:
            sent += 1
            print(f"  ✅ 消息 1/{total_msgs} 总览")
        else:
            print(f"  ❌ 消息 1/{total_msgs} 总览: {r}")

        # 消息 2-N：每团队
        for idx, tr in enumerate(team_cc_results, start=2):
            time.sleep(5)  # 钉钉 20条/分钟，≥5s 间隔
            team_lines = [
                f"## {tr['team']} ยังไม่เช็คอิน — {today_str}",
                "未打卡跟进",
                "",
                f"**ยังไม่เช็คอิน {tr['count']} คน  |  CC {tr['cc_count']}**",
                f"未打卡 {tr['count']} 人  |  CC数 {tr['cc_count']}",
                "",
            ]
            for cc_entry in tr["ccs"]:
                team_lines.append(
                    f"👤 **{cc_entry['cc']}**"
                )
                team_lines.append(
                    f"ยังไม่เช็คอิน {cc_entry['count']} คน"
                    f" / 未打卡 {cc_entry['count']} 人"
                )
                if cc_entry["img_url"]:
                    team_lines.append(
                        f"![{cc_entry['cc']}]({cc_entry['img_url']})"
                    )
                ids = cc_entry.get("student_ids", [])
                if ids:
                    team_lines.append(f"📋 ID: {', '.join(ids)}")
                team_lines.append("")
            team_title = (
                f"{tr['team']} ยังไม่เช็คอิน — {today_str}\n"
                f"未打卡跟进"
            )
            team_md = "\n".join(team_lines)
            r = self._send_dingtalk(team_title, team_md, channel)
            if r.get("errcode") == 0:
                sent += 1
                print(f"  ✅ 消息 {idx}/{total_msgs} {tr['team']}")
            else:
                print(f"  ❌ 消息 {idx}/{total_msgs} {tr['team']}: {r}")

        result["status"] = "sent" if sent == total_msgs else "partial"
        result["sent"] = sent
        result["messages_count"] = total_msgs
        return result

    # ── 内部：TL+ 专属图片生成器 ───────────────────────────────────────────────

    def _fig_to_bytes(self, fig: plt.Figure) -> bytes:
        """Figure → PNG bytes，自动关闭 fig"""
        buf = io.BytesIO()
        fig.savefig(buf, format="png", dpi=150, bbox_inches="tight")
        plt.close(fig)
        buf.seek(0)
        return buf.read()

    def _status_color(self, rate: float) -> str:
        """达成率 → 状态颜色（阈值从 defaults.thresholds 读取）"""
        th = self.defaults.get("thresholds", {})
        good = th.get("achievement_good", 1.0)
        warn = th.get("achievement_warning", 0.8)
        if rate >= good:
            return _C_SUCCESS
        if rate >= warn:
            return _C_WARNING
        return _C_DANGER

    def _status_bg(self, rate: float) -> str:
        """达成率 → 背景颜色（阈值从 defaults.thresholds 读取）"""
        th = self.defaults.get("thresholds", {})
        good = th.get("achievement_good", 1.0)
        warn = th.get("achievement_warning", 0.8)
        if rate >= good:
            return _C_GREEN_BG
        if rate >= warn:
            return _C_YELLOW_BG
        return _C_RED_BG

    def _draw_header(self, fig: plt.Figure, title: str, subtitle: str) -> None:
        """在 Figure 顶部绘制统一标题栏"""
        fig.text(
            0.05, 0.97, title,
            fontsize=14, fontweight="bold", color=_C_TEXT,
            fontfamily=_THAI_FONTS, va="top",
        )
        fig.text(
            0.05, 0.93, subtitle,
            fontsize=9, color=_C_TEXT2,
            fontfamily=_THAI_FONTS, va="top",
        )
        fig.add_artist(
            mpatches.FancyBboxPatch(
                (0.0, 0.905), 1.0, 0.002,
                transform=fig.transFigure,
                boxstyle="square,pad=0",
                facecolor=_C_BORDER, linewidth=0,
            )
        )

    def _gen_result_metrics_image(
        self, overview: dict | None, role: str, today_str: str
    ) -> bytes:
        """结果指标卡片图：品牌竖条 + 圆角卡片 + 大数字 + 进度条（SEE Design System）"""
        metrics: dict = {}
        kpi_pace: dict = {}
        if overview:
            metrics = overview.get("metrics", {})
            kpi_pace = overview.get("kpi_pace", {})

        # 按 role 决定展示项（全泰文 label）
        if role == "CC":
            items = [
                {
                    "label_th": "รายได้ (USD)",
                    "label_zh": "付费金额 (USD)",
                    "actual": metrics.get("总带新付费金额USD", 0),
                    "target": kpi_pace.get("revenue", {}).get("target", 0),
                    "fmt": lambda v: f"${v:,.0f}",
                },
                {
                    "label_th": "จำนวนชำระ",
                    "label_zh": "付费单量",
                    "actual": kpi_pace.get("paid", {}).get("actual", 0),
                    "target": kpi_pace.get("paid", {}).get("target", 0),
                    "fmt": lambda v: f"{v:,.0f}",
                },
            ]
        elif role == "SS":
            items = [
                {
                    "label_th": "Leads แคบ",
                    "label_zh": "窄口 Leads",
                    "actual": metrics.get("转介绍注册数", 0),
                    "target": kpi_pace.get("register", {}).get("target", 0),
                    "fmt": lambda v: f"{v:,.0f}",
                },
            ]
        else:  # LP
            items = [
                {
                    "label_th": "Leads รวม",
                    "label_zh": "窄+宽 Leads",
                    "actual": metrics.get("转介绍注册数", 0),
                    "target": kpi_pace.get("register", {}).get("target", 0),
                    "fmt": lambda v: f"{v:,.0f}",
                },
            ]

        plt.rcParams["font.family"] = _THAI_FONTS
        n = len(items)
        # 高度 = 标题区(1.5) + 图例(0.5) + 每卡片(2.2) + 底部(0.5)
        fig_h = 1.5 + 0.5 + n * 2.2 + 0.5
        fig, ax = plt.subplots(figsize=(7, fig_h), dpi=150)
        fig.patch.set_facecolor(_C_BG)
        ax.set_xlim(0, 9)
        ax.set_ylim(0, fig_h)
        ax.set_aspect("equal")
        ax.axis("off")

        y = fig_h

        # ── 品牌竖条 + 标题 ──
        y -= 0.3
        ax.add_patch(plt.Rectangle(
            (0.2, y - 0.35), 0.08, 0.35,
            facecolor=_C_ACCENT, edgecolor="none",
        ))
        ax.text(
            0.45, y, f"ผลลัพธ์ · {role}",
            fontsize=13, fontweight="bold", color=_C_TEXT, va="top",
        )
        ax.text(
            0.45, y - 0.30, f"结果指标 · {role}",
            fontsize=8, color=_C_MUTED, va="top",
        )
        y -= 0.55
        ax.text(
            0.45, y, f"{today_str}  |  T-1",
            fontsize=9, color=_C_TEXT2, va="top",
        )
        y -= 0.55

        # ── 图例（状态圆点，阈值从配置读取） ──
        th = self.defaults.get("thresholds", {})
        g_pct = int(th.get("good", 0.6) * 100)
        w_pct = int(th.get("warning", 0.4) * 100)
        legend_items = [
            (_C_SUCCESS, f">={g_pct}% ผ่าน/达标"),
            (_C_WARNING, f"{w_pct}-{g_pct}% ใกล้เคียง/接近"),
            (_C_DANGER, f"<{w_pct}% ต่ำกว่า/未达"),
        ]
        lx = 0.4
        for lc, ltxt in legend_items:
            ax.add_patch(plt.Circle(
                (lx + 0.1, y + 0.08), 0.07,
                facecolor=lc, edgecolor="none",
            ))
            ax.text(
                lx + 0.25, y + 0.08, ltxt,
                fontsize=7.5, color=_C_TEXT2, va="center",
            )
            lx += 2.8
        y -= 0.35

        # ── KPI 卡片（SEE 4px 网格：充足留白）──
        card_w = 8.6
        card_h = 1.9  # 从 1.35 加大到 1.9（+40% 呼吸空间）
        card_x = 0.2

        for item in items:
            actual = item["actual"] or 0
            target = item["target"] or 0
            rate = (actual / target) if target > 0 else 0
            col = self._status_color(rate)
            val_str = item["fmt"](actual)
            tgt_str = item["fmt"](target)

            # 卡片背景（白底圆角边框）
            ax.add_patch(mpatches.FancyBboxPatch(
                (card_x, y - card_h), card_w, card_h,
                boxstyle="round,pad=0.12",
                facecolor="white", edgecolor=_C_BORDER, linewidth=1,
            ))

            # 左侧状态色条（细+柔，用浅色版本降低视觉权重）
            _light_colors = {
                _C_SUCCESS: "#BBF7D0",
                _C_WARNING: "#FDE68A",
                _C_DANGER: "#FECACA",
            }
            bar_col = _light_colors.get(col, col)
            ax.add_patch(mpatches.FancyBboxPatch(
                (card_x + 0.08, y - card_h + 0.25), 0.03, card_h - 0.5,
                boxstyle="round,pad=0.02",
                facecolor=bar_col, edgecolor="none",
            ))

            # 左区：指标名（上）→ 大数字（中）→ 目标（下）
            lx = card_x + 0.7

            # 指标名（泰文主，中文辅）
            ax.text(
                lx, y - 0.28, item["label_th"],
                fontsize=9, color=_C_MUTED, va="center",
            )
            ax.text(
                lx, y - 0.48, item["label_zh"],
                fontsize=7, color=_C_MUTED, va="center",
            )
            # 大数字
            ax.text(
                lx, y - 0.85, val_str,
                fontsize=24, fontweight="bold", color=_C_TEXT, va="center",
            )
            # 目标
            ax.text(
                lx, y - 1.22,
                f"เป้า/目标 {tgt_str}",
                fontsize=9, color=_C_MUTED, va="center",
            )

            # 右区：达成率百分比
            rx = card_x + card_w - 0.6
            ax.text(
                rx, y - 0.65,
                f"{rate * 100:.0f}%",
                fontsize=28, fontweight="bold", color=col,
                va="center", ha="right",
            )
            ax.text(
                rx, y - 1.10,
                "อัตราบรรลุ/达成率",
                fontsize=7.5, color=_C_MUTED,
                va="center", ha="right",
            )

            # 进度条（底部，充足间距）
            bar_x = lx
            bar_y = y - 1.55
            bar_w = card_w - 2.2
            ax.add_patch(mpatches.FancyBboxPatch(
                (bar_x, bar_y), bar_w, 0.12,
                boxstyle="round,pad=0.03",
                facecolor=_C_ELEVATED, edgecolor="none",
            ))
            fill_w = min(rate, 1.0) * bar_w
            if fill_w > 0.05:
                ax.add_patch(mpatches.FancyBboxPatch(
                    (bar_x, bar_y), fill_w, 0.12,
                    boxstyle="round,pad=0.03",
                    facecolor=col, edgecolor="none",
                ))
            ax.text(
                bar_x + bar_w + 0.15, bar_y + 0.06,
                f"{rate * 100:.1f}%",
                fontsize=7.5, color=col, va="center",
            )

            y -= card_h + 0.25

        # ── 底部分隔线 + 品牌文字 ──
        y -= 0.1
        ax.plot([1.0, 8.0], [y + 0.1, y + 0.1], color=_C_BORDER_H, linewidth=0.5)
        ax.text(
            4.5, y - 0.05, "ref-ops-engine  |  T-1 Data",
            fontsize=7.5, color=_C_MUTED, va="center", ha="center",
        )

        plt.tight_layout(pad=0.3)
        return self._fig_to_bytes(fig)

    def _gen_achievement_metrics_image(
        self, overview: dict | None, role: str, today_str: str
    ) -> bytes:
        """达成指标表格图：深色表头 + 斑马纹 + 状态圆点 + 迷你进度条"""
        kpi_pace: dict = {}
        if overview:
            kpi_pace = overview.get("kpi_pace", {})

        # 按 role 决定行（全泰文 label）
        if role == "CC":
            rows = [
                ("อัตราบรรลุ Leads", "Leads 达成率", "register"),
                ("อัตราบรรลุนัดหมาย", "预约达成率", "appointment"),
                ("อัตราบรรลุเข้าเรียน", "出席达成率", "showup"),
                ("อัตราบรรลุชำระ", "付费达成率", "paid"),
                ("อัตราบรรลุรายได้", "业绩达成率", "revenue"),
                ("อัตราบรรลุ AOV", "客单价达成率", "aov"),
                ("อัตราเช็คอิน", "打卡率", "checkin"),
            ]
        elif role == "SS":
            rows = [
                ("อัตราบรรลุ Leads", "Leads 达成率", "register"),
                ("อัตราเช็คอิน", "打卡率", "checkin"),
            ]
        else:  # LP
            rows = [
                ("อัตราบรรลุ Leads", "Leads 达成率", "register"),
                ("อัตราเช็คอิน", "打卡率", "checkin"),
            ]

        table_data = []
        for label_th, label_zh, key in rows:
            pace = kpi_pace.get(key, {})
            actual = pace.get("actual", 0) or 0
            target = pace.get("target", 0) or 0
            # 跳过目标和实际都为 0 的行（无数据）
            if target == 0 and actual == 0:
                continue
            rate = (actual / target) if target > 0 else 0
            gap = actual - target
            table_data.append((label_th, label_zh, target, actual, rate, gap))

        plt.rcParams["font.family"] = _THAI_FONTS
        n = len(table_data)
        row_unit = 0.55  # 每行高度（双语行需要更多空间）
        header_h = 0.60  # 双行表头需要更高行高
        title_h = 1.1
        footer_h = 0.5
        fig_h = max(title_h + header_h + n * row_unit + footer_h, 3.0)

        fig, ax = plt.subplots(figsize=(7, fig_h), dpi=150)
        fig.patch.set_facecolor(_C_BG)
        ax.set_xlim(0, 9)
        ax.set_ylim(0, fig_h)
        ax.set_aspect("equal")
        ax.axis("off")

        y = fig_h

        # ── 品牌竖条 + 标题 ──
        y -= 0.3
        ax.add_patch(plt.Rectangle(
            (0.2, y - 0.35), 0.08, 0.35,
            facecolor=_C_BRAND_P2, edgecolor="none",
        ))
        ax.text(
            0.45, y, f"การบรรลุเป้า · {role}",
            fontsize=13, fontweight="bold", color=_C_TEXT, va="top",
        )
        ax.text(
            0.45, y - 0.30, f"达成指标 · {role}",
            fontsize=8, color=_C_MUTED, va="top",
        )
        y -= 0.55
        ax.text(
            0.45, y, f"{today_str}  |  T-1",
            fontsize=9, color=_C_TEXT2, va="top",
        )
        y -= 0.45

        # ── 表头（深色背景，双行：泰文主行 + 中文副行）──
        table_x = 0.2
        table_w = 8.6
        col_headers_th = ["ตัวชี้วัด", "เป้า", "จริง", "อัตราบรรลุ", "ผลต่าง", ""]
        col_headers_zh = ["指标", "目标", "实际", "达成率", "差额", ""]
        col_xs = [0.35, 2.9, 4.2, 5.5, 7.0, 8.5]
        col_aligns = ["left", "right", "right", "right", "right", "left"]

        ax.add_patch(plt.Rectangle(
            (table_x, y - header_h), table_w, header_h,
            facecolor=_C_N800, edgecolor="none",
        ))
        for th_lbl, zh_lbl, x, align in zip(
            col_headers_th, col_headers_zh, col_xs, col_aligns, strict=False
        ):
            ax.text(
                x, y - header_h * 0.33, th_lbl,
                fontsize=8.5, color="white", va="center",
                ha=align, fontweight="bold",
            )
            ax.text(
                x, y - header_h * 0.70, zh_lbl,
                fontsize=6.5, color="#A8A29E", va="center",
                ha=align,
            )
        y -= header_h

        # ── 数据行（斑马纹 + 状态圆点 + 迷你进度条） ──
        for idx, (label_th, label_zh, target, actual, rate, gap) in enumerate(
            table_data
        ):
            row_bg = _C_SURFACE if idx % 2 == 0 else "white"
            ax.add_patch(plt.Rectangle(
                (table_x, y - row_unit), table_w, row_unit,
                facecolor=row_bg, edgecolor="none",
            ))

            col = self._status_color(rate)
            cy = y - row_unit * 0.5  # 行中心 y

            # 指标名（泰文主，中文辅小字）
            ax.text(
                col_xs[0], cy + 0.07, label_th,
                fontsize=8.5, color=_C_TEXT, va="center", ha="left",
            )
            ax.text(
                col_xs[0], cy - 0.12, label_zh,
                fontsize=6.5, color=_C_MUTED, va="center", ha="left",
            )
            # 目标
            ax.text(
                col_xs[1], cy, f"{target:,.0f}",
                fontsize=8.5, color=_C_TEXT2, va="center", ha="right",
            )
            # 实际
            ax.text(
                col_xs[2], cy, f"{actual:,.0f}",
                fontsize=8.5, color=_C_TEXT, va="center", ha="right",
            )
            # 达成率（带状态颜色）
            ax.text(
                col_xs[3], cy, f"{rate * 100:.1f}%",
                fontsize=8.5, color=col, va="center", ha="right",
                fontweight="bold",
            )
            # 差额
            gap_col = _C_SUCCESS if gap >= 0 else _C_DANGER
            ax.text(
                col_xs[4], cy, f"{gap:+,.0f}",
                fontsize=8.5, color=gap_col, va="center", ha="right",
            )

            # 状态圆点
            ax.add_patch(plt.Circle(
                (col_xs[5] - 0.15, cy), 0.1,
                facecolor=col, edgecolor="none", zorder=5,
            ))

            y -= row_unit

        # ── 底部分隔线 + 品牌文字 ──
        y -= 0.15
        ax.plot([1.0, 8.0], [y + 0.05, y + 0.05], color=_C_BORDER_H, linewidth=0.5)
        ax.text(
            4.5, y - 0.12, "ref-ops-engine  |  T-1 Data",
            fontsize=7.5, color=_C_MUTED, va="center", ha="center",
        )

        plt.tight_layout(pad=0.3)
        return self._fig_to_bytes(fig)

    def _gen_process_efficiency_image(
        self, overview: dict | None, role: str, today_str: str
    ) -> bytes:
        """过程 + 效率指标两段式表格（深色表头 + 斑马纹 + 段落分隔线）"""
        metrics: dict = {}
        if overview:
            metrics = overview.get("metrics", {})

        # 按 role 决定过程/效率指标（全泰文 label → 数据字段 key）
        # items 格式：(泰文指标名, 中文指标名, 数据key)，渲染为双行
        if role == "CC":
            process_items = [
                ("ลงทะเบียน", "注册", "转介绍注册数"),
                ("นัดหมาย", "预约", "预约数"),
                ("เข้าเรียน", "出席", "出席数"),
                ("ชำระ", "付费", "转介绍付费数"),
                ("เช็คอิน", "打卡", "打卡数"),
                ("ติดต่อ ≥120s", "触达", "触达数"),
                ("แนะนำ", "带新", "带新数"),
                ("สัดส่วน", "带货", "带货数"),
            ]
            efficiency_items = [
                ("อัตราติดต่อ", "触达率", "触达率"),
                ("สัดส่วนแนะนำ", "带货比", "带货比"),
                ("ค่าสัมประสิทธิ์แนะนำ", "带新系数", "带新系数"),
                ("อัตราลงทะเบียน→ชำระ", "注册转化率", "注册转化率"),
                ("อัตรานัดหมาย→ชำระ", "预约出席率", "预约出席率"),
                ("อัตราเข้าเรียน→ชำระ", "出席付费率", "出席付费率"),
            ]
        elif role == "SS":
            process_items = [
                ("ลงทะเบียน", "注册", "转介绍注册数"),
                ("ติดต่อ", "触达", "触达数"),
                ("แนะนำ", "带新", "带新数"),
            ]
            efficiency_items = [
                ("อัตราติดต่อ", "触达率", "触达率"),
                ("ค่าสัมประสิทธิ์แนะนำ", "带新系数", "带新系数"),
            ]
        else:  # LP
            process_items = [
                ("ลงทะเบียน", "注册", "转介绍注册数"),
                ("ติดต่อ", "触达", "触达数"),
                ("แนะนำ", "带新", "带新数"),
                ("เช็คอิน", "打卡", "打卡数"),
            ]
            efficiency_items = [
                ("อัตราติดต่อ", "触达率", "触达率"),
                ("ค่าสัมประสิทธิ์แนะนำ", "带新系数", "带新系数"),
            ]

        def _fmt_val(v: object) -> str:
            if v is None:
                return "--"
            if isinstance(v, float):
                return f"{v:.2%}" if v < 10 else f"{v:,.1f}"
            return f"{int(v):,}"

        plt.rcParams["font.family"] = _THAI_FONTS
        n_process = len(process_items)
        n_efficiency = len(efficiency_items)
        n_total = n_process + n_efficiency

        row_unit = 0.52  # 双行指标名需要更多行高（从 0.40 增加）
        header_h = 0.46
        section_gap = 0.5  # 过程/效率分隔区高度
        title_h = 1.1
        footer_h = 0.5
        fig_h = max(
            title_h + header_h + n_total * row_unit + section_gap + footer_h,
            3.5,
        )

        fig, ax = plt.subplots(figsize=(7, fig_h), dpi=150)
        fig.patch.set_facecolor(_C_BG)
        ax.set_xlim(0, 9)
        ax.set_ylim(0, fig_h)
        ax.set_aspect("equal")
        ax.axis("off")

        y = fig_h

        # ── 品牌竖条 + 标题 ──
        y -= 0.3
        ax.add_patch(plt.Rectangle(
            (0.2, y - 0.35), 0.08, 0.35,
            facecolor=_C_ACCENT, edgecolor="none",
        ))
        ax.text(
            0.45, y, f"กระบวนการ & ประสิทธิภาพ · {role}",
            fontsize=13, fontweight="bold", color=_C_TEXT, va="top",
        )
        ax.text(
            0.45, y - 0.30, f"过程指标 & 效率指标 · {role}",
            fontsize=8, color=_C_MUTED, va="top",
        )
        y -= 0.55
        ax.text(
            0.45, y, f"{today_str}  |  T-1",
            fontsize=9, color=_C_TEXT2, va="top",
        )
        y -= 0.45

        table_x = 0.2
        table_w = 8.6
        col_xs = [0.35, 5.5, 8.4]
        col_aligns = ["left", "left", "right"]

        def _draw_section(
            section_label: str,
            items: list[tuple[str, str]],
            start_y: float,
            accent: str,
        ) -> float:
            """绘制一段表格（标题竖条 + 深色表头 + 数据行），返回结束 y"""
            sy = start_y

            # 段标题（竖条 + 文字）
            ax.add_patch(plt.Rectangle(
                (0.2, sy - 0.28), 0.06, 0.25,
                facecolor=accent, edgecolor="none",
            ))
            ax.text(
                0.38, sy, section_label,
                fontsize=10, fontweight="bold", color=_C_TEXT, va="top",
            )
            sy -= 0.38

            # 深色表头
            col_labels_th = ["ตัวชี้วัด", "", "ค่า"]
            ax.add_patch(plt.Rectangle(
                (table_x, sy - header_h), table_w, header_h,
                facecolor=_C_N800, edgecolor="none",
            ))
            for lbl, cx, ca in zip(col_labels_th, col_xs, col_aligns, strict=False):
                ax.text(
                    cx, sy - header_h * 0.5, lbl,
                    fontsize=8.5, color="white", va="center",
                    ha=ca, fontweight="bold",
                )
            sy -= header_h

            # 数据行（三元素元组：泰文名, 中文名, 数据key；双行显示）
            for idx, item in enumerate(items):
                label_th, label_zh, data_key = item
                val = metrics.get(data_key)
                row_bg = _C_SURFACE if idx % 2 == 0 else "white"
                ax.add_patch(plt.Rectangle(
                    (table_x, sy - row_unit), table_w, row_unit,
                    facecolor=row_bg, edgecolor="none",
                ))
                cy = sy - row_unit * 0.5
                # 泰文主行（偏上）
                ax.text(
                    col_xs[0], cy + 0.08, label_th,
                    fontsize=8.5, color=_C_TEXT, va="center", ha="left",
                )
                # 中文副行（偏下，浅色）
                ax.text(
                    col_xs[0], cy - 0.10, label_zh,
                    fontsize=6.5, color=_C_MUTED, va="center", ha="left",
                )
                ax.text(
                    col_xs[2], cy, _fmt_val(val),
                    fontsize=9, color=_C_TEXT, va="center", ha="right",
                    fontweight="bold",
                )
                sy -= row_unit

            return sy

        y = _draw_section("กระบวนการ  过程指标", process_items, y, _C_ACCENT)
        y -= section_gap * 0.3

        # 段落分隔线
        ax.plot([0.8, 8.2], [y + section_gap * 0.35, y + section_gap * 0.35],
                color=_C_BORDER_H, linewidth=0.8, linestyle="--")
        y -= section_gap * 0.3

        y = _draw_section("ประสิทธิภาพ  效率指标", efficiency_items, y, _C_BRAND_P2)

        # ── 底部分隔线 + 品牌文字 ──
        y -= 0.15
        ax.plot([1.0, 8.0], [y + 0.05, y + 0.05], color=_C_BORDER_H, linewidth=0.5)
        ax.text(
            4.5, y - 0.12, "ref-ops-engine  |  T-1 Data",
            fontsize=7.5, color=_C_MUTED, va="center", ha="center",
        )

        plt.tight_layout(pad=0.3)
        return self._fig_to_bytes(fig)

    def _gen_service_metrics_image(
        self, overview: dict | None, role: str, today_str: str
    ) -> bytes | None:
        """服务指标图：付费前/后外呼双列表格。无数据时返回 None（不发送）。"""
        metrics: dict = {}
        if overview:
            metrics = overview.get("metrics", {})

        # 尝试读取外呼字段（后端可能尚未提供）
        pre_call = metrics.get("付费前外呼数")
        post_call = metrics.get("付费后外呼数")
        has_data = pre_call is not None or post_call is not None

        # 无数据 → 跳过，不生成空态图
        if not has_data:
            return None

        plt.rcParams["font.family"] = _THAI_FONTS
        fig_h = 4.2
        fig, ax = plt.subplots(figsize=(7, fig_h), dpi=150)
        fig.patch.set_facecolor(_C_BG)
        ax.set_xlim(0, 9)
        ax.set_ylim(0, fig_h)
        ax.set_aspect("equal")
        ax.axis("off")

        y = fig_h

        # ── 品牌竖条 + 标题 ──
        y -= 0.3
        ax.add_patch(plt.Rectangle(
            (0.2, y - 0.35), 0.08, 0.35,
            facecolor=_C_BRAND_P2, edgecolor="none",
        ))
        ax.text(
            0.45, y, f"บริการ · {role}",
            fontsize=14, fontweight="bold", color=_C_TEXT, va="top",
        )
        y -= 0.45
        ax.text(
            0.45, y, f"{today_str}  |  T-1",
            fontsize=9, color=_C_TEXT2, va="top",
        )
        y -= 0.55

        if not has_data:
            # 空态：品牌色虚线框 + 居中泰文提示
            box_h = 1.4
            ax.add_patch(mpatches.FancyBboxPatch(
                (0.5, y - box_h), 8.0, box_h,
                boxstyle="round,pad=0.15",
                facecolor=_C_SURFACE,
                edgecolor=_C_BRAND_P2, linewidth=1.5,
                linestyle="--",
            ))
            # 绘制矩形图标（代替 emoji）
            icon_x, icon_y = 3.8, y - box_h * 0.38
            ax.add_patch(plt.Rectangle(
                (icon_x - 0.25, icon_y - 0.18), 0.5, 0.36,
                facecolor=_C_ELEVATED, edgecolor=_C_BORDER, linewidth=0.8,
            ))
            ax.plot([icon_x - 0.25, icon_x + 0.25], [icon_y, icon_y],
                    color=_C_MUTED, linewidth=0.8)

            ax.text(
                4.5, y - box_h * 0.42,
                "ยังไม่มีข้อมูลการโทร",
                fontsize=12, color=_C_MUTED, ha="center", va="center",
                fontweight="bold",
            )
            ax.text(
                4.5, y - box_h * 0.72,
                "ระบบจะแสดงข้อมูลโดยอัตโนมัติเมื่อเชื่อมต่อ API",
                fontsize=8.5, color=_C_MUTED, ha="center", va="center",
            )

            # 底部
            ax.plot([1.0, 8.0], [0.4, 0.4], color=_C_BORDER_H, linewidth=0.5)
            ax.text(4.5, 0.22, "ref-ops-engine  |  T-1 Data",
                    fontsize=7.5, color=_C_MUTED, va="center", ha="center")
            plt.tight_layout(pad=0.3)
            return self._fig_to_bytes(fig)

        # 有数据时渲染双列表格
        rows_def = [
            ("จำนวนโทร", "付费前外呼数", "付费后外呼数"),
            ("ติดต่อได้", "付费前接通数", "付费后接通数"),
            ("มีประสิทธิผล", "付费前有效接通数", "付费后有效接通数"),
        ]
        col_labels_th = ["ตัวชี้วัด", "โทรก่อนชำระ", "โทรหลังชำระ"]
        col_xs = [0.35, 4.5, 7.2]
        col_aligns = ["left", "right", "right"]

        table_x = 0.2
        table_w = 8.6
        header_h = 0.46

        # 深色表头
        ax.add_patch(plt.Rectangle(
            (table_x, y - header_h), table_w, header_h,
            facecolor=_C_N800, edgecolor="none",
        ))
        for label, x, align in zip(col_labels_th, col_xs, col_aligns, strict=False):
            ax.text(
                x, y - header_h * 0.5, label,
                fontsize=8.5, color="white", va="center",
                ha=align, fontweight="bold",
            )
        y -= header_h

        # 数据行（斑马纹）
        row_unit = 0.46
        for idx, (label_th, pre_key, post_key) in enumerate(rows_def):
            row_bg = _C_SURFACE if idx % 2 == 0 else "white"
            ax.add_patch(plt.Rectangle(
                (table_x, y - row_unit), table_w, row_unit,
                facecolor=row_bg, edgecolor="none",
            ))
            pre_v = metrics.get(pre_key)
            post_v = metrics.get(post_key)
            cy = y - row_unit * 0.5
            pre_str = f"{int(pre_v):,}" if pre_v is not None else "--"
            post_str = f"{int(post_v):,}" if post_v is not None else "--"
            for v, x, align in zip(
                [label_th, pre_str, post_str], col_xs, col_aligns, strict=False
            ):
                ax.text(x, cy, v, fontsize=9, color=_C_TEXT, va="center", ha=align)
            y -= row_unit

        # ── 底部分隔线 + 品牌文字 ──
        y -= 0.15
        ax.plot([1.0, 8.0], [y + 0.05, y + 0.05], color=_C_BORDER_H, linewidth=0.5)
        ax.text(
            4.5, y - 0.15, "ref-ops-engine  |  T-1 Data",
            fontsize=7.5, color=_C_MUTED, va="center", ha="center",
        )

        plt.tight_layout(pad=0.3)
        return self._fig_to_bytes(fig)

    def _process_followup_per_cc(
        self, role: str, channel: dict, dry_run: bool
    ) -> dict:
        """分组推送：钉钉消息（1总览+N小组），同步Lark最新格式（围场分段+角色动态）"""
        import sys as _sys  # noqa: PLC0415
        from collections import defaultdict as _dd  # noqa: PLC0415

        _sd = str(Path(__file__).resolve().parent)
        if _sd not in _sys.path:
            _sys.path.insert(0, _sd)
        import lark_bot as _lb  # noqa: PLC0415

        result: dict[str, Any] = {
            "module": "followup_per_cc",
            "status": "pending",
            "images_count": 0,
        }

        # 1. 围场配置（从 Settings 读取，同 lark_bot）
        enc_order = _lb._get_role_enclosures(role)
        team_exclude: set[str] = {"TH-LP01Region"} if role == "LP" else set()
        print(f"  [followup_per_cc] role={role}, 围场={', '.join(enc_order)}")

        # 2. 获取数据
        followup = self._fetch_followup(role)
        all_students: list[dict] = (
            followup.get("students", []) if followup else []
        )
        # 过滤：只保留角色对应围场的学员
        valid_encs = set(enc_order)
        students = [s for s in all_students if s.get("enclosure") in valid_encs]
        if not students:
            print("  [followup_per_cc] 无未打卡数据")
            result["status"] = "no_data"
            return result

        print(f"  [followup_per_cc] {len(students)} 名未打卡学员（{role} 围场）")

        # 3. 按团队分组 + 排除团队
        teams_raw = _lb.group_students_by_team(students)
        teams = {k: v for k, v in teams_raw.items() if k not in team_exclude}
        today = datetime.now()
        date_short = today.strftime("%Y%m%d")
        date_display = f"{today.strftime('%Y年%m月%d日')} T-1"

        # 4. 构建 team_summary + per-CC 学员 by_enclosure
        team_cc_data: list[dict] = []
        team_summary: list[dict] = []
        for team_name, members in teams.items():
            ccs = _lb.group_students_by_cc(members)
            cc_list = []
            for cc_name, cc_students_flat in ccs.items():
                # 按围场分组未打卡学员
                s_by_enc: dict[str, list[dict]] = _dd(list)
                for s in cc_students_flat:
                    s_by_enc[s.get("enclosure", "?")].append(s)
                cc_list.append({
                    "cc": cc_name,
                    "count": len(cc_students_flat),
                    "students_by_enc": dict(s_by_enc),
                    "student_ids": [
                        str(s.get("student_id", "")) for s in cc_students_flat
                    ],
                })
            team_summary.append({
                "team": team_name,
                "count": len(members),
                "cc_count": len(ccs),
            })
            team_cc_data.append({
                "team": team_name,
                "count": len(members),
                "cc_count": len(ccs),
                "ccs": cc_list,
            })

        # 5. 生成图片（复用 lark_bot 缓存）
        ov_fn = f"lark-overview-{role}-{date_short}.png"
        ov_path = _lb.OUTPUT_DIR / ov_fn
        if ov_path.exists():
            ov_bytes = ov_path.read_bytes()
        else:
            ov_bytes = _lb.generate_overview_image(
                team_summary, {}, date_display, role=role
            )
            ov_path.write_bytes(ov_bytes)

        cc_images: dict[str, dict] = {}  # key: "team/cc"
        for td in team_cc_data:
            for cc_entry in td["ccs"]:
                cc_name = cc_entry["cc"]
                t_safe = td["team"].replace("/", "-").replace(" ", "_")
                c_safe = cc_name.replace("/", "-").replace(" ", "_")
                fn = f"lark-followup-{t_safe}-{c_safe}-{date_short}.png"
                fp = _lb.OUTPUT_DIR / fn
                if fp.exists():
                    img_bytes = fp.read_bytes()
                else:
                    img_bytes = _lb.generate_cc_image(
                        cc_name, td["team"],
                        cc_entry["students_by_enc"], {},
                        date_display, enclosure_order=enc_order,
                    )
                    fp.write_bytes(img_bytes)
                cc_images[f"{td['team']}/{cc_name}"] = {
                    "bytes": img_bytes,
                    "filename": fn,
                }

        img_count = 1 + len(cc_images)
        result["images_count"] = img_count
        print(f"  [followup_per_cc] {img_count} 张图片就绪")

        if dry_run:
            result["status"] = "dry_run"
            return result

        # 6. 上传（复用 lark_bot URL 缓存）
        url_cache = _lb.load_url_cache(date_short)
        ov_url = _lb.cached_upload(ov_bytes, ov_fn, url_cache)

        for _key, ci in cc_images.items():
            ci["url"] = _lb.cached_upload(ci["bytes"], ci["filename"], url_cache)

        _lb.save_url_cache(date_short, url_cache)

        # 7. 发钉钉消息
        msg_total = 1 + len(team_cc_data)

        # 消息 1：总览
        ov_md = (
            f"## ภาพรวม {role} ยังไม่เช็คอิน\n"
            f"## {role} 未打卡总览\n\n"
            f"**{date_display}**\n\n"
        )
        if ov_url:
            ov_md += f"![总览]({ov_url})\n\n"
        ov_md += "---\n\n"
        for ts in team_summary:
            ov_md += (
                f"📊 **{ts['team']}**："
                f"ยังไม่เช็คอิน **{ts['count']}** คน"
                f" | {role} {ts['cc_count']}\n\n"
                f"   未打卡 **{ts['count']}** 人"
                f" | {role}数 {ts['cc_count']}\n\n"
            )

        ov_title = f"ภาพรวม {role} ยังไม่เช็คอิน — {date_display}"
        r = self._send_dingtalk(ov_title, ov_md, channel)
        ok = r.get("errcode") == 0
        print(f"  {'✅' if ok else '❌'} 消息 1/{msg_total}（总览）")
        time.sleep(5)

        # 消息 2-N：每团队（新格式：👤 CC名 ▸ 打卡率 + 📷 链接 + Mx分段+IDs）
        for idx, td in enumerate(team_cc_data, start=2):
            team_md = (
                f"## {td['team']} ยังไม่เช็คอิน\n"
                f"## {td['team']} 未打卡跟进\n\n"
                f"**{date_display}**\n\n"
                f"ยังไม่เช็คอิน **{td['count']}** คน"
                f" | {role} {td['cc_count']}\n"
                f"未打卡 **{td['count']}** 人"
                f" | {role}数 {td['cc_count']}\n\n"
                f"---\n\n"
            )
            for cc_entry in td["ccs"]:
                cc_name = cc_entry["cc"]
                ci = cc_images.get(f"{td['team']}/{cc_name}", {})
                cc_url = ci.get("url")

                # 👤 CC名 ▸ 打卡率（暂无 per-CC 详情接口，仅展示未打卡数）
                team_md += f"👤 **{cc_name}**  ▸ **未打卡 {cc_entry['count']} 人**\n"
                if cc_url:
                    team_md += f"📷 [ดูรายชื่อ {cc_name}]({cc_url})\n\n"
                else:
                    team_md += "\n"

                # 按围场分段显示 IDs
                s_by_enc = cc_entry.get("students_by_enc", {})
                for enc in enc_order:
                    enc_students = s_by_enc.get(enc, [])
                    n = len(enc_students)
                    if n == 0:
                        continue
                    ids = [str(s.get("student_id", "")) for s in enc_students]
                    # 每行最多 8 个 ID
                    chunks = [", ".join(ids[i:i + 8]) for i in range(0, len(ids), 8)]
                    team_md += f"**{enc}** · {n} คน\n"
                    team_md += "\n".join(chunks) + "\n\n"

            t_title = f"{td['team']} ยังไม่เช็คอิน — {date_display}"
            r = self._send_dingtalk(t_title, team_md, channel)
            ok = r.get("errcode") == 0
            print(f"  {'✅' if ok else '❌'} 消息 {idx}/{msg_total}（{td['team']}）")
            time.sleep(8)  # 钉钉限频较严，8s 间隔

        result["status"] = "sent"
        return result

    def _generate_action_items_text(self, role: str) -> str:
        """生成操作指令 Markdown 文本：未打卡高潜学员 top 5（泰中双语）"""
        followup = self._fetch_followup(role)
        today = datetime.now().strftime("%d/%m/%Y")

        lines = [
            f"### นักเรียนที่ต้องติดตาม Top 5 · {role}",
            f"### 需跟进高潜学员 Top 5 · {role}",
        ]
        lines.append(f"**{today}  |  T-1**\n")

        if not followup:
            lines.append("⚠ ยังไม่มีข้อมูล")
            lines.append("⚠ 后端暂未提供跟进数据")
            lines.append("\n> กรุณาติดตามนักเรียนสำคัญ")
            lines.append("> 请相关人员跟进重点学员")
            return "\n".join(lines)

        raw: object = followup.get("students", followup)
        students: list[dict] = raw if isinstance(raw, list) else []
        if not students:
            lines.append("✅ ไม่มีนักเรียนที่ต้องติดตาม")
            lines.append("✅ 暂无需跟进学员")
            return "\n".join(lines)

        top5 = students[:5]
        lines.append("**นักเรียนที่มีศักยภาพสูงยังไม่ได้เช็คอิน Top 5：**")
        lines.append("**高潜未打卡学员 Top 5：**\n")
        for i, s in enumerate(top5, 1):
            sid = s.get("student_id", s.get("id", "--"))
            enclosure = s.get("enclosure", s.get("days", "--"))
            score = s.get("quality_score", s.get("score", "--"))
            owner = s.get("owner", s.get("assigned_to", "--"))
            if isinstance(score, float):
                score = f"{score:.1f}"
            line_th = (
                f"{i}. รหัส {sid} | วงจร {enclosure}"
                f" | คะแนน {score} | ผู้รับผิดชอบ: {owner}"
            )
            line_zh = (
                f"   学员 {sid} | 围场 {enclosure}"
                f" | 评分 {score} | 负责人: {owner}"
            )
            lines.append(line_th)
            lines.append(line_zh)

        lines.append(f"\n> กรุณาติดตาม {len(top5)} นักเรียนข้างต้นโดยเร็ว")
        lines.append(f"> 请相关人员尽快跟进以上 {len(top5)} 位学员")
        return "\n".join(lines)

    def _generate_student_improvement_text(self) -> str:
        """生成学员打卡进步 Top5 + 沉睡高潜统计 Markdown 文本（泰中双语）

        数据来源：GET /api/checkin/student-analysis?limit=5
        字段：improvement_ranking（进步排行）、tags_summary.沉睡高潜（沉睡高潜计数）
        """
        today = datetime.now().strftime("%d/%m/%Y")
        analysis = self._fetch_student_analysis(limit=5)

        lines = [
            "### 📈 นักเรียนพัฒนาการ Top 5 เดือนนี้",
            "### 学员打卡进步 Top5（本月）",
            f"**{today}  |  T-1**\n",
        ]

        if not analysis:
            lines.append("⚠ ยังไม่มีข้อมูลการวิเคราะห์นักเรียน")
            lines.append("⚠ 后端暂未提供学员分析数据")
            return "\n".join(lines)

        # ── 进步 Top5 ──
        improvement_ranking: list[dict] = analysis.get("improvement_ranking", [])
        top5 = improvement_ranking[:5]

        if top5:
            lines.append("**นักเรียนที่มีพัฒนาการโดดเด่น Top 5：**")
            lines.append("**打卡进步最快 Top 5：**\n")
            lines.append("| # | ID | วงจร | เช็คอินเดือนนี้ | พัฒนาการ | แท็ก |")
            lines.append("| # | ID | 围场 | 本月打卡 | 进步幅度 | 标签 |")
            lines.append("|---|----|----|---:|---:|---|")
            for i, s in enumerate(top5, 1):
                sid = s.get("student_id", s.get("id", "--"))
                enclosure = s.get("enclosure", s.get("enclosure_days", "--"))
                checkins = s.get("days_this_month", "--")
                improvement = s.get("improvement", s.get("delta", "--"))
                tags_raw = s.get("tags", [])
                if isinstance(tags_raw, list):
                    tag_str = "/".join(tags_raw[:2]) if tags_raw else "—"
                else:
                    tag_str = str(tags_raw) or "—"
                # 进步值格式化：正数加 +
                if isinstance(improvement, (int, float)):
                    imp_str = f"+{improvement}" if improvement > 0 else str(improvement)
                else:
                    imp_str = str(improvement)
                row = (
                    f"| {i} | {sid} | {enclosure}"
                    f" | {checkins} | {imp_str} | {tag_str} |"
                )
                lines.append(row)
            lines.append("")
        else:
            lines.append("✅ ยังไม่มีข้อมูลการพัฒนา")
            lines.append("✅ 暂无进步排行数据")
            lines.append("")

        # ── 沉睡高潜统计 ──
        tags_summary: dict = analysis.get("tags_summary", {})
        # 兼容中文 key 和英文 key
        sleeping_high_potential = (
            tags_summary.get("沉睡高潜")
            or tags_summary.get("sleeping_high_potential")
            or 0
        )

        lines.append("---")
        lines.append(
            f"**นักเรียนศักยภาพสูงที่หลับอยู่ (มีคาบเรียนแต่ไม่เช็คอิน)："
            f" {sleeping_high_potential} คน**"
        )
        lines.append(
            f"**沉睡高潜（有课耗无打卡）：{sleeping_high_potential} 人**"
        )
        lines.append("")
        lines.append("> ข้อมูล T-1 · ref-ops-engine · student-analysis")
        lines.append("> 数据来源 T-1 · 学员打卡分析")

        return "\n".join(lines)

    # ── team_comprehensive：每组多维达成卡 ─────────────────────────────────

    def _process_team_comprehensive(
        self, role: str, channel: dict, dry_run: bool,
    ) -> dict:
        """team_comprehensive 模块处理：获取双数据源 → 每组生成一张多维达成卡"""
        result: dict[str, Any] = {
            "module": "team_comprehensive",
            "status": "pending",
            "images_count": 0,
        }

        # 1. 获取双数据源
        checkin_data = self._fetch_data(role)
        perf_data = self._fetch_cc_performance()

        if not checkin_data or not perf_data:
            result["status"] = "no_data"
            print("  [team_comprehensive] 数据不足（需要 checkin + cc-performance）")
            return result

        role_checkin = checkin_data.get("by_role", {}).get(role, {})
        groups = role_checkin.get("by_group", [])
        persons = role_checkin.get("by_person", [])
        perf_teams = perf_data.get("teams", [])

        # 按 team name 建索引
        perf_map: dict[str, dict] = {t["team"]: t for t in perf_teams}
        person_by_group: dict[str, list[dict]] = {}
        for p in persons:
            g = p.get("group", "")
            person_by_group.setdefault(g, []).append(p)

        # 按 by_group 排序
        group_order = [g.get("group", "") for g in groups]
        date_tag = datetime.now().strftime("%Y%m%d")
        today_str = datetime.now().strftime("%d/%m")

        images: list[tuple[str, bytes, Path]] = []
        for team_name in group_order:
            perf_team = perf_map.get(team_name)
            if not perf_team:
                print(f"  [team_comprehensive] {team_name} 无 cc-performance 数据，跳过")
                continue
            ck_members = person_by_group.get(team_name, [])
            img = self._gen_team_comprehensive_image(
                team_name, perf_team, ck_members, today_str
            )
            short = team_name.replace("TH-", "").replace("Team", "")
            path = OUTPUT_DIR / f"team-card-{short}-{date_tag}.png"
            path.write_bytes(img)
            images.append((f"📊 {short} {today_str}", img, path))

        result["images_count"] = len(images)

        if not images:
            result["status"] = "no_images"
            return result

        if dry_run:
            for title, img_bytes, path in images:
                kb = len(img_bytes) / 1024
                print(f"  [team_comprehensive] {title} → {path} ({kb:.0f} KB)")
            result["status"] = "dry_run"
            return result

        # 发送
        success = 0
        for img_idx, (title, img_bytes, path) in enumerate(images):
            if img_idx > 0:
                time.sleep(5)
            sent = self._upload_and_send(img_bytes, title, channel, path.name)
            if sent:
                success += 1
        result["status"] = "sent" if success == len(images) else "partial"
        result["sent"] = success
        return result

    def _fetch_cc_performance(self) -> dict | None:
        """获取 /api/cc-performance 全量数据"""
        return self._fetch_url(f"{self.api_base}/api/cc-performance")

    def _gen_tl_overview_image(
        self, perf_data: dict, today_str: str,
    ) -> bytes:
        """TL 总览图：7 组按业绩(THB)排名 + BM 今日/月 + 打卡率 + 参与率

        金色主调，排名模式，只有业绩追 BM。
        """
        from matplotlib.patches import FancyBboxPatch, Rectangle

        teams = perf_data.get("teams", [])
        xrate = perf_data.get("exchange_rate", 34.0)
        time_pct = perf_data.get("time_progress_pct", 0)

        # 构建行数据，按业绩 THB 降序
        rows: list[dict] = []
        for t in teams:
            rev = t.get("revenue", {})
            actual_thb = (rev.get("actual", 0) or 0) * xrate
            bm_today_thb = (rev.get("bm_expected", 0) or 0) * xrate
            target_thb = (rev.get("target", 0) or 0) * xrate
            rows.append({
                "team": t["team"].replace("TH-", "").replace("Team", ""),
                "rev_thb": actual_thb,
                "bm_today": bm_today_thb,
                "bm_month": target_thb,
                "checkin": t.get("checkin_rate", 0) or 0,
                "participation": t.get("participation_rate", 0) or 0,
            })
        rows.sort(key=lambda r: -r["rev_thb"])

        n = len(rows)
        row_h = 0.55
        fig_h = 1.8 + 0.5 + n * row_h + 0.6
        fig, ax = plt.subplots(figsize=(10, max(fig_h, 5)), dpi=150)
        ax.set_xlim(0, 10)
        ax.set_ylim(0, fig_h)
        ax.axis("off")
        fig.patch.set_facecolor(_C_BG)
        ax.set_facecolor(_C_BG)

        # ── 品牌条（金色） ──
        _GOLD = "#D4A017"
        _GOLD_BG = "#FDF6E3"
        _GOLD_DARK = "#B8860B"
        ax.add_patch(Rectangle((0, fig_h - 0.15), 10, 0.15,
                               color=_GOLD_DARK, zorder=5))

        # ── 标题 ──
        y = fig_h - 0.6
        ax.text(0.4, y, "CC Revenue Ranking", fontsize=18,
                fontweight="bold", color=_C_TEXT, va="center",
                fontfamily=_THAI_FONTS)
        ax.text(7.0, y, f"{today_str} T-1 | Progress {time_pct:.0%}",
                fontsize=10, color=_C_MUTED, va="center", ha="left")

        # ── 表头 ──
        y_table = y - 0.65
        cx = [0.4, 1.2, 3.2, 5.0, 6.8, 8.2, 9.4]
        headers = ["#", "Team", "รายได้(฿)", "BM วันนี้(฿)", "BM เดือน(฿)",
                   "เช็คอิน", "มีส่วนร่วม"]
        h_align = ["center", "left", "right", "right", "right", "center", "center"]

        ax.add_patch(Rectangle((0.2, y_table - 0.2), 9.6, 0.42,
                               color=_C_N800, zorder=3))
        for i, h in enumerate(headers):
            ax.text(cx[i], y_table, h, fontsize=7.5, fontweight="bold",
                    color="white", va="center", ha=h_align[i],
                    fontfamily=_THAI_FONTS, zorder=4)

        # ── 数据行 ──
        for idx, row in enumerate(rows):
            y_r = y_table - 0.42 - idx * row_h

            # 斑马纹
            if idx % 2 == 0:
                ax.add_patch(Rectangle((0.2, y_r - row_h / 2 + 0.08),
                                       9.6, row_h, color=_GOLD_BG,
                                       zorder=1))

            # 排名（前 3 金色圆）
            rank_color = _GOLD if idx < 3 else _C_MUTED
            ax.text(cx[0], y_r, f"{idx + 1}", fontsize=10,
                    fontweight="bold" if idx < 3 else "normal",
                    color=rank_color, ha="center", va="center")

            # 组名
            ax.text(cx[1], y_r, row["team"], fontsize=10,
                    fontweight="bold", color=_C_TEXT, ha="left",
                    va="center", fontfamily=_THAI_FONTS)

            # 业绩 THB（金色大字）
            rev_str = f"฿{row['rev_thb']:,.0f}"
            ax.text(cx[2], y_r, rev_str, fontsize=10.5,
                    fontweight="bold",
                    color=_GOLD_DARK if row["rev_thb"] > 0 else _C_MUTED,
                    ha="right", va="center")

            # BM 今日 + 颜色（超 = 绿，落后 = 红）
            bm_color = _C_SUCCESS if row["rev_thb"] >= row["bm_today"] else _C_DANGER
            bm_str = f"฿{row['bm_today']:,.0f}"
            ax.text(cx[3], y_r, bm_str, fontsize=9,
                    color=bm_color, ha="right", va="center")

            # BM 月
            ax.text(cx[4], y_r, f"฿{row['bm_month']:,.0f}", fontsize=9,
                    color=_C_TEXT2, ha="right", va="center")

            # 打卡率
            ck_color = self._status_color(row["checkin"])
            ax.text(cx[5], y_r, f"{row['checkin']:.0%}", fontsize=10,
                    fontweight="bold", color=ck_color,
                    ha="center", va="center")

            # 参与率
            ax.text(cx[6], y_r, f"{row['participation']:.0%}", fontsize=10,
                    color=_C_TEXT2, ha="center", va="center")

        # ── 底部 ──
        y_foot = y_table - 0.42 - n * row_h - 0.2
        ax.plot([0.5, 9.5], [y_foot + 0.1, y_foot + 0.1],
                color=_C_BORDER_H, linewidth=0.5)
        ax.text(5.0, y_foot - 0.1,
                "ref-ops-engine  |  Revenue in THB  |  T-1 Data",
                fontsize=7.5, color=_C_MUTED, va="center", ha="center")

        plt.tight_layout(pad=0.3)
        return self._fig_to_bytes(fig)

    def _gen_team_comprehensive_image(
        self,
        team_name: str,
        perf_team: dict,
        checkin_members: list[dict],
        today_str: str,
    ) -> bytes:
        """多维达成卡：团队汇总条 + 每人指标表格

        Args:
            team_name: 团队原始名（如 TH-CC01Team）
            perf_team: cc-performance teams[] 中的该 team 数据
            checkin_members: checkin ranking by_person 中属于该 team 的成员
            today_str: 日期显示（如 04/04）
        """
        short = team_name.replace("TH-", "").replace("Team", "")
        records = perf_team.get("records", [])

        # 按 cc_name join checkin 数据
        checkin_map: dict[str, dict] = {
            m["name"]: m for m in checkin_members
        }
        # 合并：以 perf records 为主，补 checkin 数据
        rows: list[dict] = []
        for rec in records:
            cc = rec.get("cc_name", "")
            ck = checkin_map.get(cc, {})
            leads_actual = 0
            leads_obj = rec.get("leads", {})
            if isinstance(leads_obj, dict):
                leads_actual = leads_obj.get("actual", 0) or 0
            elif isinstance(leads_obj, (int, float)):
                leads_actual = leads_obj
            paid_actual = 0
            paid_obj = rec.get("paid", {})
            if isinstance(paid_obj, dict):
                paid_actual = paid_obj.get("actual", 0) or 0
            elif isinstance(paid_obj, (int, float)):
                paid_actual = paid_obj
            rev_actual = 0
            rev_obj = rec.get("revenue", {})
            if isinstance(rev_obj, dict):
                rev_actual = rev_obj.get("actual", 0) or 0
            elif isinstance(rev_obj, (int, float)):
                rev_actual = rev_obj
            rows.append({
                "name": cc.replace("THCC-", "").replace("thcc-", ""),
                "students": ck.get("students", rec.get("students_count", 0)),
                "checkin_rate": ck.get("rate", rec.get("checkin_rate", 0)) or 0,
                "leads": int(leads_actual),
                "paid": int(paid_actual),
                "revenue": rev_actual,
            })

        # 按业绩降序排序
        rows.sort(key=lambda r: (-r["revenue"], -r["leads"], -r["checkin_rate"]))

        # 团队汇总
        team_rev = 0
        t_rev = perf_team.get("revenue", {})
        if isinstance(t_rev, dict):
            team_rev = t_rev.get("actual", 0) or 0
        team_paid = 0
        t_paid = perf_team.get("paid", {})
        if isinstance(t_paid, dict):
            team_paid = t_paid.get("actual", 0) or 0
        team_leads = sum(r["leads"] for r in rows)
        team_students = perf_team.get("students_count", sum(r["students"] for r in rows))
        team_checkin_rate = perf_team.get("checkin_rate", 0) or 0
        team_reach_rate = perf_team.get("cc_reach_rate", 0) or 0

        # ── matplotlib 绘图 ──
        n_rows = len(rows)
        fig_h = 2.0 + 1.2 + n_rows * 0.42 + 0.3
        fig, ax = plt.subplots(figsize=(9, max(fig_h, 4)), dpi=150)
        ax.set_xlim(0, 10)
        ax.set_ylim(0, fig_h)
        ax.axis("off")
        fig.patch.set_facecolor(_C_BG)
        ax.set_facecolor(_C_BG)

        # ── 品牌条 ──
        from matplotlib.patches import FancyBboxPatch, Rectangle
        ax.add_patch(Rectangle((0, fig_h - 0.15), 10, 0.15,
                               color=_C_BRAND_P2, zorder=5))

        # ── 标题 ──
        y = fig_h - 0.55
        ax.text(0.4, y, f"{short}", fontsize=18, fontweight="bold",
                color=_C_TEXT, va="center", fontfamily=_THAI_FONTS)
        ax.text(5.5, y, f"{today_str} T-1", fontsize=11,
                color=_C_MUTED, va="center", ha="left")

        # ── 团队汇总条（圆角卡片）──
        y_summary = y - 0.85
        ax.add_patch(FancyBboxPatch(
            (0.3, y_summary - 0.3), 9.4, 0.7,
            boxstyle="round,pad=0.08", facecolor=_C_SURFACE,
            edgecolor=_C_BORDER, linewidth=0.8, zorder=2,
        ))
        # 汇总指标
        cols_x = [1.0, 3.0, 5.0, 7.2, 9.0]
        labels = ["รายได้/业绩", "ชำระ/付费", "Leads", "เช็คอิน/打卡", "ติดต่อ/触达"]
        values = [
            f"${team_rev:,.0f}",
            f"{int(team_paid)}",
            f"{team_leads}",
            f"{team_checkin_rate:.0%}",
            f"{team_reach_rate:.0%}",
        ]
        for i, (lbl, val) in enumerate(zip(labels, values)):
            ax.text(cols_x[i], y_summary + 0.22, val, fontsize=13,
                    fontweight="bold", color=_C_TEXT, ha="center",
                    va="center", fontfamily=_THAI_FONTS)
            ax.text(cols_x[i], y_summary - 0.12, lbl, fontsize=7,
                    color=_C_MUTED, ha="center", va="center",
                    fontfamily=_THAI_FONTS)

        # ── 表格 ──
        y_table_top = y_summary - 0.7
        # 列位置
        cx = [0.5, 1.6, 4.0, 5.3, 6.5, 7.7, 9.2]
        headers = ["#", "CC", "นร./学员", "เช็คอิน/%", "Leads", "ชำระ/付费", "รายได้(USD)"]
        header_aligns = ["center", "left", "center", "center", "center", "center", "right"]

        # 表头
        y_h = y_table_top
        ax.add_patch(Rectangle((0.3, y_h - 0.18), 9.4, 0.36,
                               color=_C_N800, zorder=3))
        for i, h in enumerate(headers):
            ax.text(cx[i], y_h, h, fontsize=7.5, fontweight="bold",
                    color="white", va="center", ha=header_aligns[i],
                    fontfamily=_THAI_FONTS, zorder=4)

        # 数据行
        row_h = 0.42
        for idx, row in enumerate(rows):
            y_r = y_h - 0.36 - idx * row_h
            # 斑马纹
            if idx % 2 == 0:
                ax.add_patch(Rectangle((0.3, y_r - row_h / 2 + 0.04),
                                       9.4, row_h, color=_C_SURFACE,
                                       zorder=1))
            # 打卡率颜色
            ck_color = self._status_color(row["checkin_rate"])
            # 数据
            ax.text(cx[0], y_r, f"{idx + 1}", fontsize=8,
                    color=_C_MUTED, ha="center", va="center")
            ax.text(cx[1], y_r, row["name"], fontsize=8.5,
                    color=_C_TEXT, ha="left", va="center",
                    fontfamily=_THAI_FONTS)
            ax.text(cx[2], y_r, f"{row['students']}", fontsize=8.5,
                    color=_C_TEXT, ha="center", va="center")
            ax.text(cx[3], y_r, f"{row['checkin_rate']:.0%}", fontsize=8.5,
                    color=ck_color, fontweight="bold", ha="center",
                    va="center")
            ax.text(cx[4], y_r, f"{row['leads']}", fontsize=8.5,
                    color=_C_TEXT, ha="center", va="center")
            ax.text(cx[5], y_r, f"{row['paid']}", fontsize=8.5,
                    color=_C_TEXT, ha="center", va="center")
            rev_str = f"${row['revenue']:,.0f}" if row["revenue"] else "—"
            ax.text(cx[6], y_r, rev_str, fontsize=8.5,
                    color=_C_SUCCESS if row["revenue"] > 0 else _C_MUTED,
                    fontweight="bold" if row["revenue"] > 0 else "normal",
                    ha="right", va="center")

        plt.tight_layout(pad=0.3)
        return self._fig_to_bytes(fig)

    def _process_team_checkin_combined(
        self, role: str, channel: dict, dry_run: bool,
    ) -> dict:
        """每组一条消息：打卡排名图（嵌入 Markdown）+ 未打卡学员 ID"""
        import sys as _sys  # noqa: PLC0415
        from collections import defaultdict as _dd  # noqa: PLC0415

        _sd = str(Path(__file__).resolve().parent)
        if _sd not in _sys.path:
            _sys.path.insert(0, _sd)
        import dingtalk_daily as _daily  # noqa: PLC0415
        import lark_bot as _lb  # noqa: PLC0415

        result: dict[str, Any] = {
            "module": "team_checkin_combined",
            "status": "pending",
        }

        # 1. 获取打卡数据
        checkin_data = self._fetch_data(role)
        if not checkin_data:
            result["status"] = "no_data"
            print("  [team_checkin_combined] 无打卡数据")
            return result

        role_checkin = checkin_data.get("by_role", {}).get(role, {})
        groups = role_checkin.get("by_group", [])
        persons = role_checkin.get("by_person", [])

        # 2. 获取未打卡学员数据
        enc_order = _lb._get_role_enclosures(role)
        followup = self._fetch_followup(role)
        all_students: list[dict] = (
            followup.get("students", []) if followup else []
        )
        valid_encs = set(enc_order)
        unchecked_students = [
            s for s in all_students if s.get("enclosure") in valid_encs
        ]

        # 按 team → CC → 围场分组
        unchecked_by_team: dict[str, list[dict]] = {}
        for s in unchecked_students:
            team = s.get("team", "Unknown")
            unchecked_by_team.setdefault(team, []).append(s)

        # 按人建索引
        person_by_group: dict[str, list[dict]] = {}
        for p in persons:
            g = p.get("group", "")
            person_by_group.setdefault(g, []).append(p)

        # 按人打卡索引
        ck_person_map: dict[str, dict] = {
            p["name"]: p for p in persons
        }

        today = datetime.now()
        today_str = today.strftime("%d/%m")
        date_tag = today.strftime("%Y%m%d")
        date_display = f"{today_str} T-1"
        group_order = [g.get("group", "") for g in groups]

        if dry_run:
            for team_name in group_order:
                short = team_name.replace("TH-", "").replace("Team", "")
                uc = unchecked_by_team.get(team_name, [])
                print(f"  [team_checkin_combined] {short}: 未打卡 {len(uc)}")
            result["status"] = "dry_run"
            return result

        # 3. 每组生成图 + 文本 → 合并为一条 Markdown
        msg_idx = 0
        msg_total = len(group_order)
        for team_name in group_order:
            short = team_name.replace("TH-", "").replace("Team", "")
            members = person_by_group.get(team_name, [])
            uc_list = unchecked_by_team.get(team_name, [])

            # 团队汇总
            g_info = next(
                (g for g in groups if g.get("group") == team_name), {}
            )
            t_total = g_info.get("students", 0)
            t_checked = g_info.get("checked_in", 0)
            t_rate = g_info.get("rate", 0) or 0

            # 生成打卡图
            img = _daily.generate_team_image(
                team_name, members, t_total, t_checked
            )
            path = OUTPUT_DIR / f"checkin-{short}-{date_tag}.png"
            path.write_bytes(img)

            # 上传图片
            img_url = self._upload_image(img, path.name)

            # 构建 Markdown（图片 + 未打卡 ID）
            md = f"## {short} เช็คอิน · {date_display}\n\n"
            if img_url:
                md += f"![{short}]({img_url})\n\n"

            if uc_list:
                md += (
                    f"---\n\n"
                    f"**ยังไม่เช็คอิน / 未打卡**"
                    f" · เช็คอิน {t_checked}/{t_total} ({t_rate:.0%})\n\n"
                )

                # 按 CC 分组
                ccs = _lb.group_students_by_cc(uc_list)
                for cc_name, cc_students in ccs.items():
                    cc_short = (
                        cc_name.replace("THCC-", "")
                        .replace("thcc-", "")
                        .replace("THSS-", "")
                        .replace("tgss-", "")
                        .replace("THLP-", "")
                    )
                    ck_p = ck_person_map.get(cc_name, {})
                    p_checked = ck_p.get("checked_in", 0)
                    p_total = ck_p.get("students", 0)
                    p_rate = ck_p.get("rate", 0) or 0

                    md += (
                        f"👤 **{cc_short}**"
                        f" (เช็คอิน {p_checked}/{p_total} · {p_rate:.0%})\n\n"
                    )
                    # 按围场分段
                    s_by_enc: dict[str, list[str]] = _dd(list)
                    for s in cc_students:
                        enc = s.get("enclosure", "?")
                        s_by_enc[enc].append(str(s.get("student_id", "")))

                    for enc in enc_order:
                        ids = s_by_enc.get(enc, [])
                        if not ids:
                            continue
                        chunks = [
                            ", ".join(ids[i:i + 8])
                            for i in range(0, len(ids), 8)
                        ]
                        md += f"**{enc}** · {len(ids)} คน\n\n"
                        md += "\n\n".join(chunks) + "\n\n"
            else:
                md += "\n\n✅ ไม่มีนักเรียนที่ต้องติดตาม\n\n"

            # 发送
            title = f"📋 {short} Check-in {date_display}"
            r = self._send_dingtalk(title, md, channel)
            ok = r.get("errcode") == 0
            msg_idx += 1
            print(
                f"  {'✅' if ok else '❌'}"
                f" [team_checkin_combined] {msg_idx}/{msg_total} {short}"
            )
            if msg_idx < msg_total:
                time.sleep(5)

        result["status"] = "sent"
        return result

    def _process_unchecked_ids_per_team(
        self, role: str, channel: dict, dry_run: bool,
    ) -> dict:
        """unchecked_ids：每组一条文本，按围场分段列出 CC→学员 ID"""
        import sys as _sys  # noqa: PLC0415
        from collections import defaultdict as _dd  # noqa: PLC0415

        _sd = str(Path(__file__).resolve().parent)
        if _sd not in _sys.path:
            _sys.path.insert(0, _sd)
        import lark_bot as _lb  # noqa: PLC0415

        result: dict[str, Any] = {
            "module": "unchecked_ids",
            "status": "pending",
        }

        # 围场配置
        enc_order = _lb._get_role_enclosures(role)

        # 获取数据
        followup = self._fetch_followup(role)
        all_students: list[dict] = (
            followup.get("students", []) if followup else []
        )
        # 过滤到角色对应围场
        valid_encs = set(enc_order)
        students = [s for s in all_students if s.get("enclosure") in valid_encs]
        if not students:
            print("  [unchecked_ids] 无未打卡学员")
            result["status"] = "no_data"
            return result

        today = datetime.now()
        date_display = f"{today.strftime('%d/%m')} T-1"

        # 按 team → CC → 围场分组
        teams_raw = _lb.group_students_by_team(students)
        team_exclude: set[str] = {"TH-LP01Region"} if role == "LP" else set()
        teams = {k: v for k, v in teams_raw.items() if k not in team_exclude}

        # 获取 checkin ranking 数据（总学员/已打卡/打卡率）
        checkin_data = self._fetch_data(role)
        role_checkin = (
            checkin_data.get("by_role", {}).get(role, {}) if checkin_data else {}
        )
        # 按组建索引：team_name → {students, checked_in, rate}
        ck_group_map: dict[str, dict] = {
            g["group"]: g for g in role_checkin.get("by_group", [])
        }
        # 按人建索引：cc_name → {students, checked_in, rate}
        ck_person_map: dict[str, dict] = {
            p["name"]: p for p in role_checkin.get("by_person", [])
        }

        if dry_run:
            for team_name, members in teams.items():
                short = team_name.replace("TH-", "").replace("Team", "")
                ccs = _lb.group_students_by_cc(members)
                ck_g = ck_group_map.get(team_name, {})
                print(
                    f"  [unchecked_ids] {short}: {len(ccs)} CC, "
                    f"学员 {ck_g.get('students', '?')}, "
                    f"已打卡 {ck_g.get('checked_in', '?')}, "
                    f"未打卡 {len(members)}"
                )
            result["status"] = "dry_run"
            return result

        # 发送：每组一条文本
        msg_idx = 0
        msg_total = len(teams)
        for team_name, members in teams.items():
            short = team_name.replace("TH-", "").replace("Team", "")
            ccs = _lb.group_students_by_cc(members)

            # 组级打卡数据
            ck_g = ck_group_map.get(team_name, {})
            g_total = ck_g.get("students", 0)
            g_checked = ck_g.get("checked_in", 0)
            g_rate = ck_g.get("rate", 0) or 0

            md = (
                f"### ⚠️ {short} ยังไม่เช็คอิน · {date_display}\n"
                f"### {short} 未打卡跟进\n\n"
                f"เช็คอิน **{g_checked}/{g_total}** ({g_rate:.0%})"
                f" | {role} {len(ccs)}\n\n"
                f"---\n\n"
            )

            for cc_name, cc_students in ccs.items():
                cc_short = (
                    cc_name.replace("THCC-", "")
                    .replace("thcc-", "")
                    .replace("THSS-", "")
                    .replace("tgss-", "")
                    .replace("THLP-", "")
                )
                # 个人打卡数据
                ck_p = ck_person_map.get(cc_name, {})
                p_total = ck_p.get("students", 0)
                p_checked = ck_p.get("checked_in", 0)
                p_rate = ck_p.get("rate", 0) or 0
                unchecked = len(cc_students)

                # 按围场分组
                s_by_enc: dict[str, list[str]] = _dd(list)
                for s in cc_students:
                    enc = s.get("enclosure", "?")
                    s_by_enc[enc].append(str(s.get("student_id", "")))

                md += (
                    f"👤 **{cc_short}**"
                    f" (เช็คอิน {p_checked}/{p_total} · {p_rate:.0%})\n\n"
                )
                for enc in enc_order:
                    ids = s_by_enc.get(enc, [])
                    if not ids:
                        continue
                    chunks = [", ".join(ids[i:i + 8]) for i in range(0, len(ids), 8)]
                    md += f"**{enc}** · {len(ids)} คน\n\n"
                    md += "\n\n".join(chunks) + "\n\n"

            title = f"⚠️ {short} ยังไม่เช็คอิน {date_display}"
            r = self._send_dingtalk(title, md, channel)
            ok = r.get("errcode") == 0
            msg_idx += 1
            print(f"  {'✅' if ok else '❌'} [unchecked_ids] {msg_idx}/{msg_total} {short}")
            if msg_idx < msg_total:
                time.sleep(5)

        result["status"] = "sent"
        return result

    def _generate_unchecked_ids_text(self, role: str) -> str:
        """生成按组→CC分组的未打卡学员 ID 列表（Markdown 文本）"""
        followup = self._fetch_followup(role)
        today = datetime.now().strftime("%d/%m")

        lines = [
            f"### ⚠️ ยังไม่ได้เช็คอิน · {role} · {today}",
            f"### 未打卡学员跟进 · {role} · {today}",
            "",
        ]

        if not followup:
            lines.append("✅ ไม่มีข้อมูล / 无数据")
            return "\n".join(lines)

        students: list[dict] = followup.get("students", [])
        if not students:
            lines.append("✅ ไม่มีนักเรียนที่ต้องติดตาม / 暂无需跟进学员")
            return "\n".join(lines)

        # 按 team → cc 分组
        from collections import defaultdict
        by_team: dict[str, dict[str, list[str]]] = defaultdict(
            lambda: defaultdict(list)
        )
        for s in students:
            team = s.get("team", s.get("group", "Unknown"))
            cc = s.get("cc_name", s.get("owner", "Unknown"))
            sid = str(s.get("student_id", s.get("id", "?")))
            by_team[team][cc].append(sid)

        # 按 team 排序输出
        for team in sorted(by_team.keys()):
            short = team.replace("TH-", "").replace("Team", "")
            lines.append(f"**{short}**")
            for cc in sorted(by_team[team].keys()):
                ids = by_team[team][cc]
                cc_short = cc.replace("THCC-", "").replace("thcc-", "")
                lines.append(f"👤 {cc_short} ({len(ids)} คน)")
                # 每行 8 个 ID，方便复制
                for i in range(0, len(ids), 8):
                    chunk = ", ".join(ids[i:i + 8])
                    lines.append(f"> {chunk}")
            lines.append("")

        lines.append(f"> รวม {len(students)} คน / 共 {len(students)} 人")
        return "\n".join(lines)

    # ── 内部：图片上传（双图床 fallback）────────────────────────────────────

    @staticmethod
    def _upload_image(
        img_bytes: bytes, filename: str = "report.png"
    ) -> str | None:
        """上传图片，双图床 fallback 链：freeimage.host → sm.ms(新域名)"""
        providers = [
            ("freeimage.host", NotificationEngine._upload_freeimage),
            ("sm.ms(s.ee)", NotificationEngine._upload_smms),
        ]
        for name, fn in providers:
            try:
                url = fn(img_bytes, filename)
                if url:
                    return url
            except Exception as e:
                print(f"    [{name}] 失败: {e}")
        return None

    @staticmethod
    def _upload_freeimage(
        img_bytes: bytes, filename: str
    ) -> str | None:
        """freeimage.host — 免费，无需注册"""
        import base64 as b64

        encoded = b64.b64encode(img_bytes).decode("utf-8")
        data = urllib.parse.urlencode({
            "key": "6d207e02198a847aa98d0a2a901485a5",
            "source": encoded,
            "format": "json",
        }).encode("utf-8")

        req = urllib.request.Request(
            "https://freeimage.host/api/1/upload",
            data=data,
            headers={"User-Agent": "ref-ops-engine/1.0"},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=20) as resp:
            result = json.loads(resp.read().decode("utf-8"))
            if result.get("status_code") == 200:
                return result["image"]["url"]
        return None

    @staticmethod
    def _upload_smms(
        img_bytes: bytes, filename: str
    ) -> str | None:
        """sm.ms (迁移至 s.ee) — 备用"""
        boundary = f"----Py{int(time.time())}"
        body = (
            f"--{boundary}\r\n"
            f'Content-Disposition: form-data; '
            f'name="smfile"; filename="{filename}"\r\n'
            f"Content-Type: image/png\r\n\r\n"
        ).encode() + img_bytes + f"\r\n--{boundary}--\r\n".encode()

        req = urllib.request.Request(
            "https://s.ee/api/v1/file/upload",
            data=body,
            headers={
                "Content-Type": f"multipart/form-data; boundary={boundary}",
                "User-Agent": "ref-ops-engine/1.0",
            },
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=20) as resp:
            result = json.loads(resp.read().decode("utf-8"))
            if result.get("success"):
                return result["data"]["url"]
            if "images" in str(result.get("message", "")):
                return result.get("images")
        return None

    # ── 内部：上传+发送 ───────────────────────────────────────────────────────

    def _upload_and_send(
        self,
        img_bytes: bytes,
        title: str,
        channel: dict,
        filename: str = "report.png",
    ) -> bool:
        """上传图床 → 发钉钉 Markdown；失败时做文本回退"""
        img_url = self._upload_image(img_bytes, filename)
        if img_url:
            md = f"## {title}\n\n![report]({img_url})"
            result = self._send_dingtalk(title, md, channel)
            if result.get("errcode") == 0:
                print(f"  ✅ {title}")
                return True
            print(f"  ❌ {title}: {result}")
        else:
            print(f"  ⚠️ {title} 所有图床失败")

        # 总览图文本回退
        if "overview" in filename.lower() or "Overview" in title:
            try:
                import sys  # noqa: PLC0415

                d = str(Path(__file__).resolve().parent)
                if d not in sys.path:
                    sys.path.insert(0, d)
                import dingtalk_daily as _m  # noqa: PLC0415

                role = channel.get("role", "CC")
                data = self._fetch_data(role)
                if data:
                    md_fb = _m.build_text_markdown(data)
                    self._send_dingtalk(title, md_fb, channel)
                    print(f"  ↩ {title} 文本回退")
            except Exception as e:
                print(f"  ❌ 回退失败: {e}")

        return False

    # ── 内部：钉钉签名发送 ────────────────────────────────────────────────────

    def _send_dingtalk(
        self, title: str, markdown_text: str, channel: dict
    ) -> dict:
        """钉钉加签模式发送 Markdown 消息（含"系统繁忙"自动重试）"""
        webhook: str = channel["webhook"]
        secret: str = channel["secret"]

        for attempt in range(3):  # 最多 3 次（首次 + 2 次重试）
            # 每次重试都重新生成签名（timestamp 需刷新）
            timestamp = str(int(time.time() * 1000))
            sign_str = f"{timestamp}\n{secret}"
            hmac_code = hmac.new(
                secret.encode("utf-8"),
                sign_str.encode("utf-8"),
                digestmod=hashlib.sha256,
            ).digest()
            sign = urllib.parse.quote_plus(
                base64.b64encode(hmac_code).decode("utf-8")
            )
            url = f"{webhook}&timestamp={timestamp}&sign={sign}"

            payload = json.dumps(
                {
                    "msgtype": "markdown",
                    "markdown": {"title": title, "text": markdown_text},
                },
                ensure_ascii=False,
            ).encode("utf-8")

            req = urllib.request.Request(
                url,
                data=payload,
                headers={"Content-Type": "application/json"},
                method="POST",
            )
            with urllib.request.urlopen(req, timeout=10) as resp:
                result = json.loads(resp.read().decode("utf-8"))

            errcode = result.get("errcode", 0)
            if errcode == 0:
                return result
            if errcode == -1 and attempt < 2:
                # "系统繁忙"：等 5s 后重试
                wait = 5 * (attempt + 1)
                print(f"    [重试 {attempt+1}/2] 系统繁忙，等 {wait}s...")
                time.sleep(wait)
                continue
            return result  # 非繁忙错误或重试耗尽

        return {"errcode": -1, "errmsg": "重试耗尽"}

    # ── CC 围场警示（图片+文本双发）──────────────────────────────────────────

    def _process_warning_with_ids(
        self, role: str, channel: dict, dry_run: bool, result: dict,
    ) -> dict:
        """cc_enc_warning: 发图片（总览）+ markdown 文本（含学员 ID 方便复制）。"""
        data = self._fetch_data(role)
        if not data:
            result["status"] = "no_data"
            return result

        role_data = data.get("by_role", {}).get(role, {})
        today_str = datetime.now().strftime("%d/%m")
        date_tag = datetime.now().strftime("%Y%m%d")

        # 生成图片
        img_bytes = self._gen_warning_image(role_data, role, today_str)

        # 同时构建文本版（含学员 ID）
        import lark_bot as _lb  # noqa: PLC0415

        cfg = self._get_honor_thresholds()
        enc_warn_map = cfg["cc_warning_by_enclosure"]
        enc_order = _lb._get_role_enclosures(role) or ["M0", "M1", "M2"]

        groups = role_data.get("by_group", [])
        team_names = [
            g.get("group", "") for g in groups if g.get("group")
        ]

        # 获取未打卡学员列表
        followup_by_cc: dict[str, dict[str, list[str]]] = {}
        try:
            url = f"{self.api_base}/api/checkin/followup?role={role}"
            req = urllib.request.Request(
                url, headers={"Accept": "application/json"},
            )
            with urllib.request.urlopen(req, timeout=15) as resp:
                fdata = json.loads(resp.read().decode("utf-8"))
            for s in fdata.get("students", []):
                cc = s.get("cc_name", "?")
                enc = s.get("enclosure", "?")
                sid = str(s.get("student_id", ""))
                followup_by_cc.setdefault(cc, {}).setdefault(
                    enc, []
                ).append(sid)
        except Exception:
            pass

        # 构建与图片同逻辑的 at-risk 列表（含 ID）
        at_risk_ccs: list[dict] = []
        for team_name in team_names:
            try:
                url = (
                    f"{self.api_base}/api/checkin/team-detail"
                    f"?team={urllib.parse.quote(team_name)}"
                )
                req = urllib.request.Request(
                    url, headers={"Accept": "application/json"},
                )
                with urllib.request.urlopen(req, timeout=10) as resp:
                    detail = json.loads(resp.read().decode("utf-8"))
                members = detail.get("members", [])
            except Exception:
                continue

            for member in members:
                cc_name = member.get("name", "?")
                enc_warnings: list[dict] = []
                for enc in enc_order:
                    threshold = enc_warn_map.get(enc)
                    if threshold is None:
                        continue
                    enc_info = None
                    for e in member.get("by_enclosure", []):
                        if e.get("enclosure") == enc:
                            enc_info = e
                            break
                    if (
                        not enc_info
                        or enc_info.get("students", 0) == 0
                    ):
                        continue
                    total_enc = enc_info["students"]
                    enc_rate = enc_info.get("rate", 0.0) or 0.0
                    if enc_rate >= threshold:
                        continue
                    checked = enc_info.get("checked_in", 0)
                    unchecked = total_enc - checked
                    allowed = int(total_enc * (1 - threshold))
                    risk_count = max(0, unchecked - allowed)
                    if risk_count > 0:
                        # 取风险学员 ID
                        cc_ids = followup_by_cc.get(cc_name, {})
                        enc_ids = cc_ids.get(enc, [])[:risk_count]
                        enc_warnings.append({
                            "enc": enc,
                            "rate": enc_rate,
                            "threshold": threshold,
                            "risk_count": risk_count,
                            "risk_ids": enc_ids,
                        })

                if enc_warnings:
                    total_risk = sum(
                        ew["risk_count"] for ew in enc_warnings
                    )
                    at_risk_ccs.append({
                        "cc": cc_name,
                        "enc_warnings": enc_warnings,
                        "total_risk": total_risk,
                    })

        if not at_risk_ccs:
            result["status"] = "no_data"
            print("  [cc_enc_warning] 无 CC 触发围场警示")
            return result

        at_risk_ccs.sort(key=lambda x: -x["total_risk"])
        _LIMIT = 10
        display_ccs = at_risk_ccs[:_LIMIT]
        truncated = len(at_risk_ccs) > _LIMIT

        if dry_run:
            if img_bytes:
                kb = len(img_bytes) / 1024
                print(f"  [cc_enc_warning] 图片 ({kb:.0f} KB)")
            print(f"  [cc_enc_warning] {len(at_risk_ccs)} CC 触发")
            result["status"] = "dry_run"
            return result

        # 发图片
        if img_bytes:
            path = OUTPUT_DIR / f"cc-enc-warning-{date_tag}.png"
            path.write_bytes(img_bytes)
            self._upload_and_send(
                img_bytes,
                f"⚠️ แจ้งเตือน CC {today_str}",
                channel, path.name,
            )
            time.sleep(5)

        # 发文本（含学员 ID，方便复制）
        md_lines = [
            "## ⚠️ CC 围场警示 — 学员 ID",
            "",
        ]
        for cc_warn in display_ccs:
            md_lines.append(f"### ⚠️ {cc_warn['cc']}")
            for ew in cc_warn["enc_warnings"]:
                thresh = f"{ew['threshold']:.0%}"
                md_lines.append(
                    f"**{ew['enc']}** · {ew['rate']:.1%}"
                    f" (เกณฑ์ {thresh})"
                    f" · เสี่ยง **{ew['risk_count']}** คน"
                )
                if ew.get("risk_ids"):
                    for i in range(0, len(ew["risk_ids"]), 5):
                        chunk = "  ".join(ew["risk_ids"][i : i + 5])
                        md_lines.append(f"> {chunk}")
                md_lines.append("")

        if truncated:
            remaining = len(at_risk_ccs) - _LIMIT
            md_lines.append(f"_... อีก {remaining} CC_")

        md_text = "\n".join(md_lines)
        r = self._send_dingtalk(
            "⚠️ CC 围场警示 — 学员 ID", md_text, channel,
        )
        if r.get("errcode") == 0:
            print("  ✅ ⚠️ CC 围场警示（图片+文本）")
            result["status"] = "sent"
        else:
            result["status"] = "partial"

        return result

    # ── 荣耀 + 警示图片生成器 ─────────────────────────────────────────────────

    def _get_honor_thresholds(self) -> dict:
        """从 config/checkin_thresholds.json 读取荣耀+警示阈值。"""
        cfg_path = PROJECT_ROOT / "config" / "checkin_thresholds.json"
        try:
            cfg = json.loads(cfg_path.read_text("utf-8"))
        except Exception:
            cfg = {}
        honor = cfg.get(
            "honor",
            {"hall_of_fame": 1.0, "excellent": 0.95, "pass": 0.85},
        )
        enc_warn = cfg.get(
            "cc_warning_by_enclosure",
            {
                "M0": 0.90, "M1": 0.85, "M2": 0.80,
                "M3": 0.75, "M4": 0.70, "M5": 0.65,
                "M6": 0.60, "M7": 0.60, "M8": 0.60, "M9": 0.60,
                "M10": 0.60, "M11": 0.60, "M12": 0.60, "M12+": 0.60,
            },
        )
        return {"honor": honor, "cc_warning_by_enclosure": enc_warn}

    def _checkin_rate_color(self, rate: float) -> str:
        """打卡率 → 文字颜色（≥85%绿 / ≥70%黄 / <70%红）"""
        cfg_path = PROJECT_ROOT / "config" / "checkin_thresholds.json"
        try:
            cfg = json.loads(cfg_path.read_text("utf-8"))
            good = cfg.get("good", 0.85)
            warn = cfg.get("warning", 0.7)
        except Exception:
            good, warn = 0.85, 0.7
        if rate >= good:
            return _C_SUCCESS
        if rate >= warn:
            return _C_WARNING
        return _C_DANGER

    def _gen_honor_image(
        self,
        persons: list[dict],
        role: str,
        today_str: str,
    ) -> bytes | None:
        """生成荣耀排行图（🏆100% / 🌟≥95% / ✅≥85% 三档）。
        无人达标返回 None。
        """
        cfg = self._get_honor_thresholds()
        hof_t = cfg["honor"]["hall_of_fame"]
        exc_t = cfg["honor"]["excellent"]
        pass_t = cfg["honor"]["pass"]

        tiers: dict[str, list[dict]] = {
            "hall_of_fame": [],
            "excellent": [],
            "pass": [],
        }
        for p in persons:
            rate = p.get("rate", 0.0)
            if rate >= hof_t:
                tiers["hall_of_fame"].append(p)
            elif rate >= exc_t:
                tiers["excellent"].append(p)
            elif rate >= pass_t:
                tiers["pass"].append(p)

        total_honorees = sum(len(v) for v in tiers.values())
        if total_honorees == 0:
            print("  [honor_ranking] 无人达标")
            return None

        _MEDAL = ["🥇", "🥈", "🥉"]
        _TIER_CFG = {
            "hall_of_fame": (
                "#F59E0B", "🏆",
                "หอเกียรติยศ", "荣耀殿堂 · 100%",
            ),
            "excellent": (
                "#7C3AED", "🌟",
                "ยอดเยี่ยม", "卓越 · ≥95%",
            ),
            "pass": (
                "#059669", "✅",
                "ผ่านเกณฑ์", "达标 · ≥85%",
            ),
        }

        row_h = 0.38
        sec_h = 0.45
        header_h = 0.30
        sections = sum(1 for v in tiers.values() if v)
        fig_h = (
            1.2
            + sections * (sec_h + header_h + 0.15)
            + total_honorees * row_h
            + 0.5
        )

        plt.rcParams["font.family"] = _THAI_FONTS
        fig, ax = plt.subplots(figsize=(7, fig_h), dpi=150)
        fig.patch.set_facecolor(_C_BG)
        ax.set_xlim(0, 9)
        ax.set_ylim(0, fig_h)
        ax.set_aspect("equal")
        ax.axis("off")

        y = fig_h

        # ── 标题 ──
        y -= 0.3
        ax.add_patch(plt.Rectangle(
            (0.2, y - 0.50), 0.08, 0.50,
            facecolor=_C_ACCENT, edgecolor="none",
        ))
        ax.text(
            0.45, y, "เกียรติยศเช็คอิน",
            fontsize=13, fontweight="bold",
            color=_C_TEXT, va="top",
        )
        y -= 0.30
        ax.text(
            0.45, y,
            f"打卡荣耀榜 · {role} · {today_str}",
            fontsize=8, color=_C_MUTED, va="top",
        )
        y -= 0.50

        # ── 各档分区 ──
        for tier_key in ("hall_of_fame", "excellent", "pass"):
            honorees = tiers[tier_key]
            if not honorees:
                continue

            color, emoji, t_th, t_zh = _TIER_CFG[tier_key]

            # 档位标题条
            ax.add_patch(plt.Rectangle(
                (0.2, y - sec_h), 8.6, sec_h,
                facecolor=color, edgecolor="none", alpha=0.15,
            ))
            ax.add_patch(plt.Rectangle(
                (0.2, y - sec_h), 0.06, sec_h,
                facecolor=color, edgecolor="none",
            ))
            ax.text(
                0.45, y - sec_h / 2,
                f"{emoji} {t_th}  {t_zh}",
                fontsize=10, fontweight="bold",
                color=color, va="center",
            )
            y -= sec_h

            # 表头
            ax.add_patch(plt.Rectangle(
                (0.2, y - header_h), 8.6, header_h,
                facecolor=_C_N800, edgecolor="none",
            ))
            for cx, lbl in [
                (0.4, "#"),
                (1.2, "ชื่อ / 姓名"),
                (5.5, "อัตรา / 率"),
                (7.0, "นร. / 学员"),
            ]:
                ax.text(
                    cx, y - header_h / 2, lbl,
                    fontsize=7.5, fontweight="bold",
                    color="white", va="center",
                )
            y -= header_h

            # 数据行
            for i, p in enumerate(honorees):
                bg = _C_SURFACE if i % 2 == 0 else _C_BG
                ax.add_patch(plt.Rectangle(
                    (0.2, y - row_h), 8.6, row_h,
                    facecolor=bg, edgecolor="none",
                ))
                ax.plot(
                    [0.2, 8.8], [y - row_h, y - row_h],
                    color=_C_BORDER, linewidth=0.3,
                )
                m = _MEDAL[i] if i < len(_MEDAL) else emoji
                rank = p.get("rank", i + 1)
                name = p.get("name", "?")
                rate = p.get("rate", 0.0)
                students = p.get("students", 0)
                r_str = "100%" if rate >= 1.0 else f"{rate:.1%}"

                ax.text(
                    0.4, y - row_h / 2, f"{m} #{rank}",
                    fontsize=8, color=_C_TEXT, va="center",
                )
                ax.text(
                    1.2, y - row_h / 2, name,
                    fontsize=8.5, fontweight="bold",
                    color=_C_TEXT, va="center",
                )
                ax.text(
                    5.5, y - row_h / 2, r_str,
                    fontsize=8.5, fontweight="bold",
                    color=self._checkin_rate_color(rate),
                    va="center",
                )
                ax.text(
                    7.0, y - row_h / 2, str(students),
                    fontsize=8.5, color=_C_TEXT2, va="center",
                )
                y -= row_h

            y -= 0.15

        return self._fig_to_bytes(fig)

    def _gen_warning_image(
        self,
        role_data: dict,
        role: str,
        today_str: str,
    ) -> bytes | None:
        """生成 CC 围场警示图（仅 CC 角色）。
        无人触发返回 None。
        """
        import lark_bot as _lb  # noqa: PLC0415

        cfg = self._get_honor_thresholds()
        enc_warn_map = cfg["cc_warning_by_enclosure"]
        # 动态读取角色负责的围场（从 Settings 配置）
        enc_order = _lb._get_role_enclosures(role) or ["M0", "M1", "M2"]

        groups = role_data.get("by_group", [])
        team_names = [
            g.get("group", "") for g in groups if g.get("group")
        ]

        at_risk_ccs: list[dict] = []
        for team_name in team_names:
            try:
                url = (
                    f"{self.api_base}/api/checkin/team-detail"
                    f"?team={urllib.parse.quote(team_name)}"
                )
                req = urllib.request.Request(
                    url, headers={"Accept": "application/json"},
                )
                with urllib.request.urlopen(req, timeout=10) as resp:
                    detail = json.loads(resp.read().decode("utf-8"))
                members = detail.get("members", [])
            except Exception:
                continue

            for member in members:
                cc_name = member.get("name", "?")
                enc_warnings: list[dict] = []
                for enc in enc_order:
                    threshold = enc_warn_map.get(enc)
                    if threshold is None:
                        continue
                    enc_info = None
                    for e in member.get("by_enclosure", []):
                        if e.get("enclosure") == enc:
                            enc_info = e
                            break
                    if (
                        not enc_info
                        or enc_info.get("students", 0) == 0
                    ):
                        continue
                    total_enc = enc_info["students"]
                    enc_rate = enc_info.get("rate", 0.0) or 0.0
                    if enc_rate >= threshold:
                        continue
                    checked = enc_info.get("checked_in", 0)
                    unchecked = total_enc - checked
                    allowed = int(total_enc * (1 - threshold))
                    risk_count = max(0, unchecked - allowed)
                    if risk_count > 0:
                        enc_warnings.append({
                            "enc": enc,
                            "rate": enc_rate,
                            "threshold": threshold,
                            "risk_count": risk_count,
                            "total": total_enc,
                        })

                if enc_warnings:
                    total_risk = sum(
                        ew["risk_count"] for ew in enc_warnings
                    )
                    at_risk_ccs.append({
                        "cc": cc_name,
                        "team": team_name,
                        "enc_warnings": enc_warnings,
                        "total_risk": total_risk,
                    })

        if not at_risk_ccs:
            print("  [cc_enc_warning] 无 CC 触发围场警示")
            return None

        at_risk_ccs.sort(key=lambda x: -x["total_risk"])
        _LIMIT = 10
        display_ccs = at_risk_ccs[:_LIMIT]
        truncated = len(at_risk_ccs) > _LIMIT
        total_n = len(at_risk_ccs)

        row_h = 0.30
        cc_rows = sum(
            len(c["enc_warnings"]) for c in display_ccs
        )
        fig_h = (
            1.5
            + len(display_ccs) * 0.40
            + cc_rows * (row_h + 0.05)
            + (0.4 if truncated else 0)
            + 0.5
        )

        plt.rcParams["font.family"] = _THAI_FONTS
        fig, ax = plt.subplots(figsize=(7, fig_h), dpi=150)
        fig.patch.set_facecolor(_C_BG)
        ax.set_xlim(0, 9)
        ax.set_ylim(0, fig_h)
        ax.set_aspect("equal")
        ax.axis("off")

        y = fig_h

        # 标题
        y -= 0.3
        ax.add_patch(plt.Rectangle(
            (0.2, y - 0.50), 0.08, 0.50,
            facecolor=_C_DANGER, edgecolor="none",
        ))
        ax.text(
            0.45, y, "⚠️ แจ้งเตือน CC",
            fontsize=13, fontweight="bold",
            color=_C_DANGER, va="top",
        )
        y -= 0.30
        ax.text(
            0.45, y, f"CC 围场警示 · {today_str}",
            fontsize=8, color=_C_MUTED, va="top",
        )
        y -= 0.35

        thresh_desc = "  ·  ".join(
            f"{e} < {int(enc_warn_map[e] * 100)}%"
            for e in enc_order
            if e in enc_warn_map
        )
        ax.text(
            0.45, y, thresh_desc,
            fontsize=8, color=_C_TEXT2, va="top",
        )
        y -= 0.25
        if truncated:
            ax.text(
                0.45, y,
                f"⚠️ {total_n} CC 触发"
                f" — 显示 top {_LIMIT}",
                fontsize=8, fontweight="bold",
                color=_C_DANGER, va="top",
            )
            y -= 0.25

        # CC 明细
        for cc_warn in display_ccs:
            ax.text(
                0.35, y - 0.15,
                f"⚠️ {cc_warn['cc']}",
                fontsize=9, fontweight="bold",
                color=_C_TEXT, va="top",
            )
            y -= 0.40
            for ew in cc_warn["enc_warnings"]:
                ax.add_patch(plt.Rectangle(
                    (0.3, y - row_h), 8.4, row_h,
                    facecolor=_C_SURFACE, edgecolor="none",
                ))
                ax.text(
                    0.5, y - row_h / 2,
                    f"{ew['enc']}",
                    fontsize=8.5, fontweight="bold",
                    color=_C_TEXT, va="center",
                )
                ax.text(
                    2.0, y - row_h / 2,
                    (
                        f"{ew['rate']:.1%}"
                        f"  (เกณฑ์ {ew['threshold']:.0%})"
                    ),
                    fontsize=8,
                    color=self._checkin_rate_color(ew["rate"]),
                    va="center",
                )
                ax.text(
                    6.5, y - row_h / 2,
                    f"เสี่ยง {ew['risk_count']} คน",
                    fontsize=8, fontweight="bold",
                    color=_C_DANGER, va="center",
                )
                y -= row_h + 0.05

            ax.plot(
                [0.3, 8.7], [y, y],
                color=_C_BORDER, linewidth=0.5,
            )
            y -= 0.05

        if truncated:
            remaining = total_n - _LIMIT
            ax.text(
                0.45, y - 0.1,
                f"... อีก {remaining} CC"
                f" / 另有 {remaining} 人未列出",
                fontsize=8, color=_C_MUTED, va="top",
                style="italic",
            )

        return self._fig_to_bytes(fig)

    # ── 内部：连通测试 ────────────────────────────────────────────────────────

    def _send_test(self, channel: dict) -> None:
        """向指定通道发送连通性测试消息（泰中双语）"""
        md = (
            f"## ทดสอบระบบ / 系统连通测试\n\n"
            f"ระบบรายงานทำงานปกติ\n"
            f"报告系统运行正常\n\n"
            f"- ช่องทาง (通道): {channel.get('group_name', '?')}\n"
            f"- บทบาท (角色): {channel.get('role', '?')}\n"
            f"- กลุ่มเป้าหมาย (受众): {channel.get('audience', '?')}\n\n"
            f"> {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"
        )
        result = self._send_dingtalk("ทดสอบ / 连通测试", md, channel)
        print(f"  测试结果: {json.dumps(result, ensure_ascii=False)}")

    # ── 内部：推送日志 ────────────────────────────────────────────────────────

    def _log(
        self,
        channel_id: str,
        channel: dict,
        modules: list[str],
        results: list[dict],
    ) -> None:
        """追加一条推送记录到 output/notification-log.jsonl"""
        LOG_PATH.parent.mkdir(exist_ok=True)
        entry = json.dumps(
            {
                "ts": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
                "channel": channel_id,
                "role": channel.get("role"),
                "audience": channel.get("audience"),
                "modules": modules,
                "results": results,
            },
            ensure_ascii=False,
        )
        with open(LOG_PATH, "a") as f:
            f.write(entry + "\n")

    # ── 静态工具 ──────────────────────────────────────────────────────────────

    @staticmethod
    def _load_json(path: Path) -> dict:
        """加载 JSON 配置文件"""
        with open(path) as f:
            return json.load(f)


# ── CLI（standalone followup 推送）────────────────────────────────────────────


def _cli_followup(channel_id: str, dry_run: bool, confirm: bool) -> None:
    """独立 CLI 入口：不依赖通道 modules 配置，直接触发 followup_per_cc 模块

    用法：
      uv run python scripts/dingtalk_engine.py followup --channel test [--dry-run]
      uv run python scripts/dingtalk_engine.py followup --channel cc_all --confirm
    """
    engine = NotificationEngine()
    ch = engine.channels.get(channel_id)
    if not ch:
        available = list(engine.channels.keys())
        print(f"[错误] 通道 '{channel_id}' 不存在，可用通道: {available}")
        return

    # 安全防线：非 test 通道 + 非 dry-run 必须 --confirm
    if channel_id != "test" and not confirm and not dry_run:
        print(
            f"[拦截] 通道 '{channel_id}' 非测试群，需要 --confirm 才能发送。\n"
            f"       示例：uv run python scripts/dingtalk_engine.py followup"
            f" --channel {channel_id} --confirm"
        )
        return

    group_name = ch.get("group_name", channel_id)
    print(f"📋 钉钉 followup_per_cc — {group_name}")
    print(f"   通道: {channel_id} | dry_run: {dry_run}")
    print()

    result: dict[str, Any] = {"module": "followup_per_cc", "status": "pending"}
    result = engine._process_followup_per_cc(ch, dry_run, result)
    print(f"\n结果: {result['status']}")
    if "sent" in result:
        print(f"已发送: {result['sent']}/{result.get('messages_count', '?')} 条消息")


def main() -> None:
    """dingtalk_engine.py CLI 入口"""
    import argparse  # noqa: PLC0415

    parser = argparse.ArgumentParser(
        description="钉钉通知引擎 CLI（独立模块调用）"
    )
    sub = parser.add_subparsers(dest="command")

    p_fu = sub.add_parser("followup", help="发送 CC 未打卡跟进分组消息")
    p_fu.add_argument(
        "--channel",
        default="test",
        help="钉钉通道 ID（default: test）",
    )
    p_fu.add_argument(
        "--dry-run",
        action="store_true",
        help="只生成图片不发送",
    )
    p_fu.add_argument(
        "--confirm",
        action="store_true",
        help="确认发送到正式群（非 test 通道必须加此标志）",
    )

    args = parser.parse_args()
    if args.command == "followup":
        _cli_followup(args.channel, args.dry_run, args.confirm)
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
