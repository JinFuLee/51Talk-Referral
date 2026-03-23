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

    def _process_module(self, module_id: str, channel: dict, dry_run: bool) -> dict:
        """处理单个内容模块：获取数据 → 生成图片/文本 → 发送"""
        result: dict[str, Any] = {
            "module": module_id,
            "status": "pending",
            "images_count": 0,
        }

        try:
            role = channel.get("role", "CC")

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

    def _fetch_data(self, role: str) -> dict | None:
        """从后端 API 获取打卡排行数据（含重试）"""
        role_config = self.defaults.get("role_config")
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
            img = generate_report_image(data)
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
            path = OUTPUT_DIR / f"service-metrics-{role}-{date_tag}.png"
            path.write_bytes(img_bytes)
            images.append((f"บริการ {role} {today_str}", img_bytes, path))

        # action_items 由 _process_module 直接处理文本，不走图片流程
        else:
            pass

        return images

    # ── 内部：TL+ 专属图片生成器 ───────────────────────────────────────────────

    def _fig_to_bytes(self, fig: plt.Figure) -> bytes:
        """Figure → PNG bytes，自动关闭 fig"""
        buf = io.BytesIO()
        fig.savefig(buf, format="png", dpi=150, bbox_inches="tight")
        plt.close(fig)
        buf.seek(0)
        return buf.read()

    def _status_color(self, rate: float) -> str:
        """达成率 → 状态颜色"""
        if rate >= 1.0:
            return _C_SUCCESS
        if rate >= 0.8:
            return _C_WARNING
        return _C_DANGER

    def _status_bg(self, rate: float) -> str:
        if rate >= 1.0:
            return _C_GREEN_BG
        if rate >= 0.8:
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
        """结果指标卡片图：大数字 + 进度条"""
        metrics: dict = {}
        kpi_pace: dict = {}
        if overview:
            metrics = overview.get("metrics", {})
            kpi_pace = overview.get("kpi_pace", {})

        # 按 role 决定展示项
        if role == "CC":
            items = [
                {
                    "label": "付费金额 (USD)",
                    "label_th": "รายได้ (USD)",
                    "actual": metrics.get("总带新付费金额USD", 0),
                    "target": kpi_pace.get("revenue", {}).get("target", 0),
                    "fmt": lambda v: f"${v:,.0f}",
                },
                {
                    "label": "付费单量",
                    "label_th": "จำนวนชำระ",
                    "actual": kpi_pace.get("paid", {}).get("actual", 0),
                    "target": kpi_pace.get("paid", {}).get("target", 0),
                    "fmt": lambda v: f"{v:,.0f}",
                },
            ]
        elif role == "SS":
            narrow_leads = metrics.get("转介绍注册数", 0)
            items = [
                {
                    "label": "窄口 Leads",
                    "label_th": "Leads แคบ",
                    "actual": narrow_leads,
                    "target": kpi_pace.get("register", {}).get("target", 0),
                    "fmt": lambda v: f"{v:,.0f}",
                },
            ]
        else:  # LP
            total_leads = metrics.get("转介绍注册数", 0)
            items = [
                {
                    "label": "窄+宽 Leads",
                    "label_th": "Leads รวม",
                    "actual": total_leads,
                    "target": kpi_pace.get("register", {}).get("target", 0),
                    "fmt": lambda v: f"{v:,.0f}",
                },
            ]

        n = len(items)
        fig_h = 0.8 + n * 1.2
        fig, axes = plt.subplots(n, 1, figsize=(7, fig_h))
        if n == 1:
            axes = [axes]
        fig.patch.set_facecolor(_C_BG)
        self._draw_header(fig, f"ผลลัพธ์ · {role}", f"{today_str}  |  T-1")

        for _i, (ax, item) in enumerate(zip(axes, items, strict=False)):
            ax.set_facecolor(_C_SURFACE)
            ax.set_xlim(0, 1)
            ax.set_ylim(0, 1)
            ax.axis("off")

            actual = item["actual"] or 0
            target = item["target"] or 0
            rate = (actual / target) if target > 0 else 0
            col = self._status_color(rate)
            bg = self._status_bg(rate)

            # 背景卡片
            ax.add_patch(mpatches.FancyBboxPatch(
                (0.02, 0.05), 0.96, 0.88,
                boxstyle="round,pad=0.01",
                facecolor=bg, edgecolor=_C_BORDER, linewidth=0.5,
            ))

            # 大数字
            val_str = item["fmt"](actual)
            ax.text(
                0.08, 0.7, val_str,
                fontsize=20, fontweight="bold", color=_C_TEXT, va="center",
            )
            ax.text(
                0.08, 0.4, item["label_th"],
                fontsize=9, color=_C_TEXT2, va="center",
                fontfamily=_THAI_FONTS,
            )
            # 目标 + 达成率
            ax.text(
                0.08, 0.18,
                f"เป้า {item['fmt'](target)}  |  ทำได้ {rate*100:.1f}%",
                fontsize=8, color=_C_MUTED, va="center",
                fontfamily=_THAI_FONTS,
            )
            # 进度条背景
            ax.add_patch(mpatches.FancyBboxPatch(
                (0.55, 0.42), 0.4, 0.1,
                boxstyle="square,pad=0",
                facecolor=_C_ELEVATED, linewidth=0,
            ))
            # 进度条填充
            bar_w = min(rate, 1.0) * 0.4
            if bar_w > 0:
                ax.add_patch(mpatches.FancyBboxPatch(
                    (0.55, 0.42), bar_w, 0.1,
                    boxstyle="square,pad=0",
                    facecolor=col, linewidth=0,
                ))
            ax.text(
                0.75, 0.65, f"{rate*100:.0f}%",
                fontsize=11, fontweight="bold", color=col, ha="center", va="center",
            )

        fig.tight_layout(rect=[0, 0, 1, 0.88])
        return self._fig_to_bytes(fig)

    def _gen_achievement_metrics_image(
        self, overview: dict | None, role: str, today_str: str
    ) -> bytes:
        """达成指标表格图：各 KPI 目标 | 实际 | 达成率 | 状态"""
        kpi_pace: dict = {}
        if overview:
            kpi_pace = overview.get("kpi_pace", {})

        # 按 role 决定行
        if role == "CC":
            rows = [
                ("Leads 注册数", "register"),
                ("预约数", "appointment"),
                ("出席数", "showup"),
                ("付费单量", "paid"),
                ("付费金额 USD", "revenue"),
            ]
        elif role == "SS":
            rows = [("Leads 注册数", "register")]
        else:  # LP
            rows = [
                ("Leads 注册数", "register"),
            ]

        table_data = []
        for label, key in rows:
            pace = kpi_pace.get(key, {})
            actual = pace.get("actual", 0) or 0
            target = pace.get("target", 0) or 0
            rate = (actual / target) if target > 0 else 0
            gap = actual - target
            table_data.append((label, target, actual, rate, gap))

        n = len(table_data)
        fig_h = 1.0 + n * 0.55
        fig, ax = plt.subplots(figsize=(7, max(fig_h, 2.5)))
        fig.patch.set_facecolor(_C_BG)
        ax.set_facecolor(_C_BG)
        ax.axis("off")
        self._draw_header(fig, f"การบรรลุเป้า · {role}", f"{today_str}  |  T-1")

        col_labels = ["指标", "目标", "实际", "达成率", "差额"]
        col_xs = [0.02, 0.35, 0.50, 0.65, 0.82]
        col_aligns = ["left", "right", "right", "right", "right"]

        ax.set_xlim(0, 1)
        ax.set_ylim(0, 1)

        # 表头
        header_y = 0.94
        ax.add_patch(mpatches.FancyBboxPatch(
            (0.0, header_y - 0.04), 1.0, 0.07,
            boxstyle="square,pad=0",
            facecolor=_C_N800, linewidth=0,
            transform=ax.transAxes,
        ))
        for label, x, align in zip(col_labels, col_xs, col_aligns, strict=False):
            ax.text(
                x, header_y, label,
                fontsize=8, color="white", va="center",
                ha=align, transform=ax.transAxes,
                fontweight="bold",
            )

        row_h = 0.85 / max(n, 1)
        for idx, (label, target, actual, rate, gap) in enumerate(table_data):
            y = 0.88 - idx * row_h
            bg = _C_SURFACE if idx % 2 == 0 else "white"
            ax.add_patch(mpatches.FancyBboxPatch(
                (0.0, y - row_h * 0.45), 1.0, row_h * 0.9,
                boxstyle="square,pad=0",
                facecolor=bg, linewidth=0,
                transform=ax.transAxes,
            ))
            col = self._status_color(rate)
            vals = [
                label,
                f"{target:,.0f}",
                f"{actual:,.0f}",
                f"{rate*100:.1f}%",
                f"{gap:+,.0f}",
            ]
            colors = [_C_TEXT, _C_TEXT2, _C_TEXT, col, col if gap < 0 else _C_SUCCESS]
            for v, x, align, fc in zip(vals, col_xs, col_aligns, colors, strict=False):
                ax.text(
                    x, y, v,
                    fontsize=8.5, color=fc, va="center",
                    ha=align, transform=ax.transAxes,
                )
            # 状态圆点
            dot_col = self._status_color(rate)
            ax.add_patch(plt.Circle(
                (0.97, y), 0.012,
                facecolor=dot_col, edgecolor="none",
                transform=ax.transAxes, zorder=5,
            ))

        fig.tight_layout()
        return self._fig_to_bytes(fig)

    def _gen_process_efficiency_image(
        self, overview: dict | None, role: str, today_str: str
    ) -> bytes:
        """过程指标 + 效率指标合并图（横向两列表格）"""
        metrics: dict = {}
        if overview:
            metrics = overview.get("metrics", {})

        # 按 role 决定过程/效率指标
        if role == "CC":
            process_items = [
                ("转介绍注册数", "转介绍注册数"),
                ("预约数", "预约数"),
                ("出席数", "出席数"),
                ("付费数", "转介绍付费数"),
                ("打卡数 (打卡学员)", "打卡数"),
                ("触达数 (≥120s)", "触达数"),
                ("带新数", "带新数"),
                ("带货数", "带货数"),
            ]
            efficiency_items = [
                ("触达率", "触达率"),
                ("带货比", "带货比"),
                ("带新系数", "带新系数"),
                ("注册→付费率", "注册转化率"),
                ("预约→付费率", "预约出席率"),
                ("出席→付费率", "出席付费率"),
            ]
        elif role == "SS":
            process_items = [
                ("转介绍注册数", "转介绍注册数"),
                ("触达数", "触达数"),
                ("带新数", "带新数"),
            ]
            efficiency_items = [
                ("触达率", "触达率"),
                ("带新系数", "带新系数"),
            ]
        else:  # LP
            process_items = [
                ("转介绍注册数", "转介绍注册数"),
                ("触达数", "触达数"),
                ("带新数", "带新数"),
                ("打卡数", "打卡数"),
            ]
            efficiency_items = [
                ("触达率", "触达率"),
                ("带新系数", "带新系数"),
            ]

        def _fmt_val(v: object) -> str:
            if v is None:
                return "--"
            if isinstance(v, float):
                return f"{v:.2%}" if v < 10 else f"{v:,.1f}"
            return f"{int(v):,}"

        all_items = [("过程指标", k, metrics.get(k)) for _, k in process_items]
        all_items += [("效率指标", k, metrics.get(k)) for _, k in efficiency_items]

        n = len(all_items)
        fig_h = 1.2 + n * 0.4
        fig, ax = plt.subplots(figsize=(7, max(fig_h, 3.0)))
        fig.patch.set_facecolor(_C_BG)
        ax.set_facecolor(_C_BG)
        ax.axis("off")
        self._draw_header(
            fig, f"กระบวนการ & ประสิทธิภาพ · {role}", f"{today_str}  |  T-1"
        )

        ax.set_xlim(0, 1)
        ax.set_ylim(0, 1)

        col_labels = ["类别", "指标", "数值"]
        col_xs = [0.02, 0.22, 0.78]
        col_aligns = ["left", "left", "right"]

        header_y = 0.94
        ax.add_patch(mpatches.FancyBboxPatch(
            (0.0, header_y - 0.04), 1.0, 0.07,
            boxstyle="square,pad=0",
            facecolor=_C_N800, linewidth=0,
            transform=ax.transAxes,
        ))
        for label, x, align in zip(col_labels, col_xs, col_aligns, strict=False):
            ax.text(
                x, header_y, label,
                fontsize=8, color="white", va="center",
                ha=align, transform=ax.transAxes,
                fontweight="bold",
            )

        row_h = 0.82 / max(n, 1)
        prev_cat = ""
        for idx, (cat, key, val) in enumerate(all_items):
            y = 0.88 - idx * row_h
            bg = _C_SURFACE if idx % 2 == 0 else "white"
            ax.add_patch(mpatches.FancyBboxPatch(
                (0.0, y - row_h * 0.45), 1.0, row_h * 0.9,
                boxstyle="square,pad=0",
                facecolor=bg, linewidth=0,
                transform=ax.transAxes,
            ))
            cat_label = cat if cat != prev_cat else ""
            prev_cat = cat
            vals = [cat_label, key, _fmt_val(val)]
            colors_row = [_C_BRAND_P2, _C_TEXT, _C_TEXT]
            for v, x, align, fc in zip(  # noqa: B905
                vals, col_xs, col_aligns, colors_row, strict=False
            ):
                ax.text(
                    x, y, v,
                    fontsize=8.5, color=fc, va="center",
                    ha=align, transform=ax.transAxes,
                )

        fig.tight_layout()
        return self._fig_to_bytes(fig)

    def _gen_service_metrics_image(
        self, overview: dict | None, role: str, today_str: str
    ) -> bytes:
        """服务指标图：付费前/后外呼表格（无数据时显示空态提示）"""
        metrics: dict = {}
        if overview:
            metrics = overview.get("metrics", {})

        # 尝试读取外呼字段（后端可能尚未提供）
        pre_call = metrics.get("付费前外呼数")
        post_call = metrics.get("付费后外呼数")
        has_data = pre_call is not None or post_call is not None

        fig, ax = plt.subplots(figsize=(7, 3.5))
        fig.patch.set_facecolor(_C_BG)
        ax.set_facecolor(_C_BG)
        ax.axis("off")
        self._draw_header(fig, f"บริการ · {role}", f"{today_str}  |  T-1")
        ax.set_xlim(0, 1)
        ax.set_ylim(0, 1)

        if not has_data:
            # 空态提示
            ax.add_patch(mpatches.FancyBboxPatch(
                (0.1, 0.25), 0.8, 0.4,
                boxstyle="round,pad=0.02",
                facecolor=_C_SURFACE, edgecolor=_C_BORDER, linewidth=0.8,
            ))
            ax.text(
                0.5, 0.52, "⚠ ยังไม่มีข้อมูลการโทร",
                fontsize=12, color=_C_MUTED, ha="center", va="center",
                fontfamily=_THAI_FONTS,
            )
            ax.text(
                0.5, 0.37, "后端暂未提供外呼数据 API，待对接后自动展示",
                fontsize=8, color=_C_MUTED, ha="center", va="center",
            )
            fig.tight_layout()
            return self._fig_to_bytes(fig)

        # 有数据时渲染表格
        rows_def = [
            ("外呼数", "付费前外呼数", "付费后外呼数"),
            ("接通数", "付费前接通数", "付费后接通数"),
            ("有效接通数", "付费前有效接通数", "付费后有效接通数"),
        ]
        col_labels = ["指标", "付费前", "付费后"]
        col_xs = [0.05, 0.55, 0.8]
        col_aligns = ["left", "right", "right"]

        header_y = 0.72
        ax.add_patch(mpatches.FancyBboxPatch(
            (0.0, header_y - 0.04), 1.0, 0.07,
            boxstyle="square,pad=0",
            facecolor=_C_N800, linewidth=0,
            transform=ax.transAxes,
        ))
        for label, x, align in zip(col_labels, col_xs, col_aligns, strict=False):
            ax.text(
                x, header_y, label,
                fontsize=8, color="white", va="center",
                ha=align, transform=ax.transAxes, fontweight="bold",
            )

        for idx, (label, pre_key, post_key) in enumerate(rows_def):
            y = 0.60 - idx * 0.16
            bg = _C_SURFACE if idx % 2 == 0 else "white"
            ax.add_patch(mpatches.FancyBboxPatch(
                (0.0, y - 0.07), 1.0, 0.13,
                boxstyle="square,pad=0",
                facecolor=bg, linewidth=0,
                transform=ax.transAxes,
            ))
            pre_v = metrics.get(pre_key)
            post_v = metrics.get(post_key)
            vals = [
                label,
                f"{int(pre_v):,}" if pre_v is not None else "--",
                f"{int(post_v):,}" if post_v is not None else "--",
            ]
            for v, x, align in zip(vals, col_xs, col_aligns, strict=False):
                ax.text(
                    x, y, v,
                    fontsize=9, color=_C_TEXT, va="center",
                    ha=align, transform=ax.transAxes,
                )

        fig.tight_layout()
        return self._fig_to_bytes(fig)

    def _generate_action_items_text(self, role: str) -> str:
        """生成操作指令 Markdown 文本：未打卡高潜学员 top 5"""
        followup = self._fetch_followup(role)
        today = datetime.now().strftime("%d/%m/%Y")

        lines = [f"## 📋 คำแนะนำการดำเนินงาน · {role}"]
        lines.append(f"**{today}  |  T-1**\n")

        if not followup:
            lines.append("⚠ ยังไม่มีข้อมูล (后端暂未提供跟进数据)")
            lines.append("\n> 请相关人员跟进重点学员")
            return "\n".join(lines)

        raw: object = followup.get("students", followup)
        students: list[dict] = raw if isinstance(raw, list) else []
        if not students:
            lines.append("✅ ไม่มีนักเรียนที่ต้องติดตาม (暂无需跟进学员)")
            return "\n".join(lines)

        top5 = students[:5]
        lines.append("**高潜未打卡学员 Top 5：**\n")
        for i, s in enumerate(top5, 1):
            sid = s.get("student_id", s.get("id", "--"))
            enclosure = s.get("enclosure", s.get("days", "--"))
            score = s.get("quality_score", s.get("score", "--"))
            owner = s.get("owner", s.get("assigned_to", "--"))
            if isinstance(score, float):
                score = f"{score:.1f}"
            line = (
                f"{i}. 学员 `{sid}` | 围场 {enclosure}天"
                f" | 评分 {score} | 负责人: {owner}"
            )
            lines.append(line)

        lines.append(f"\n> 请相关人员尽快跟进以上 {len(top5)} 位学员")
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

    # ── 内部：连通测试 ────────────────────────────────────────────────────────

    def _send_test(self, channel: dict) -> None:
        """向指定通道发送连通性测试消息"""
        md = (
            f"## ทดสอบระบบ\n\n"
            f"ระบบรายงานทำงานปกติ\n\n"
            f"- 通道: {channel.get('group_name', '?')}\n"
            f"- 角色: {channel.get('role', '?')}\n"
            f"- 受众: {channel.get('audience', '?')}\n\n"
            f"> {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"
        )
        result = self._send_dingtalk("ทดสอบ", md, channel)
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
