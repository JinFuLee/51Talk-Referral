"""
AnalysisService — 分析引擎单例服务
封装 AnalysisEngineV2 + MultiSourceLoader 的调用，
为 API 端点提供统一缓存接口（5 分钟 TTL 内存缓存，按 period 分槽）
"""
from __future__ import annotations

import logging
import threading
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Any, Optional

logger = logging.getLogger(__name__)

CACHE_TTL_SECONDS = 300  # 5 分钟

# 已知各数据源中含日期的字段名（用于按 period 过滤）
_DATE_FIELDS = ("date", "deal_time_day", "注册日期(day)")


class AnalysisService:
    """
    单例服务，由 main.py 在 startup 时初始化后注入各路由模块。

    职责：
      - run(): 读取 35 源数据 → 按 period 过滤 → 调用 AnalysisEngineV2 → 缓存结果
      - get_cached_result(period): 返回对应 period 的缓存（无则 None）
      - get_raw_data(period): 返回按 period 过滤后的原始数据（供 enclosure-compare/combined 使用）
      - invalidate_cache(): 手动清除全部缓存
    """

    @staticmethod
    def _scrub_nans(obj: Any) -> Any:
        """递归清理 dict/list 中的 NaN/Inf，防止破坏 JSON 序列化和后续类型转换"""
        if isinstance(obj, dict):
            return {k: AnalysisService._scrub_nans(v) for k, v in obj.items()}
        elif isinstance(obj, list):
            return [AnalysisService._scrub_nans(item) for item in obj]
        elif isinstance(obj, float):
            import math
            if math.isnan(obj) or math.isinf(obj):
                return None
        return obj

    def __init__(self, project_root: Path) -> None:
        self.project_root = Path(project_root)
        self.backend_dir = Path(__file__).resolve().parent.parent

        # 多期缓存，key = period 字符串（如 "this_month"）
        self._cached_results: dict[str, dict[str, Any]] = {}
        self._last_run_ats: dict[str, datetime] = {}

        # 按 period 过滤后的原始数据（供 enclosure-compare/combined 端点直接读取）
        self._filtered_raw: dict[str, dict[str, Any]] = {}

        # 全量原始数据（35 源，不区分 period，只加载一次）
        self._raw_data: Optional[dict[str, Any]] = None

        # 并发保护：每个 period 单独一把锁
        self._period_locks: dict[str, threading.Lock] = {}
        self._locks_mutex = threading.Lock()  # 保护 _period_locks 字典本身
        self._raw_data_lock = threading.Lock()  # 保护 _raw_data 首次加载的并发竞争

    # ── Public API ────────────────────────────────────────────────────────────

    @staticmethod
    def _cache_key(period: str, custom_start: Optional[str] = None, custom_end: Optional[str] = None) -> str:
        """
        生成缓存键，避免不同自定义日期范围的 period='custom' 互相覆盖。
        - 对于 period='custom' + 有效日期参数：返回 "custom_{start}_{end}"
        - 其他情况：直接返回 period 字符串
        """
        if period == "custom" and custom_start and custom_end:
            return f"custom_{custom_start}_{custom_end}"
        return period

    def get_cached_result(self, period: str = "this_month", custom_start: Optional[str] = None, custom_end: Optional[str] = None) -> Optional[dict[str, Any]]:
        """返回指定 period 的最近一次 run() 分析结果，尚未运行则返回 None"""
        key = self._cache_key(period, custom_start, custom_end)
        return self._cached_results.get(key)

    def get_raw_data(self, period: str = "this_month") -> dict[str, Any]:
        """返回按 period 过滤后的原始数据；若无则返回全量原始数据（兜底）"""
        if period in self._filtered_raw:
            return self._filtered_raw[period]
        return self._raw_data or {}

    def invalidate_cache(self) -> None:
        """手动清除全部缓存槽，下次 run() 会重新计算"""
        self._cached_results.clear()
        self._last_run_ats.clear()
        self._filtered_raw.clear()
        self._raw_data = None
        with self._locks_mutex:
            self._period_locks.clear()

    def _is_cache_valid(self, key: str) -> bool:
        """检查指定缓存 key 的缓存是否在 TTL 内（key 由 _cache_key() 生成）"""
        if key not in self._cached_results or key not in self._last_run_ats:
            return False
        elapsed = (datetime.now() - self._last_run_ats[key]).total_seconds()
        return elapsed < CACHE_TTL_SECONDS

    def _get_period_lock(self, key: str) -> threading.Lock:
        """获取（或创建）指定缓存 key 的线程锁，防止并发重复分析"""
        with self._locks_mutex:
            if key not in self._period_locks:
                self._period_locks[key] = threading.Lock()
            return self._period_locks[key]

    def run(
        self,
        input_dir: Optional[str] = None,
        report_date: Optional[str] = None,
        lang: str = "zh",
        targets: Optional[dict[str, Any]] = None,
        force: bool = False,
        period: str = "this_month",
        custom_start: Optional[str] = None,
        custom_end: Optional[str] = None,
    ) -> dict[str, Any]:
        """
        执行完整 35 源分析流程并缓存结果（按 period 分槽）。
        若对应 period 的缓存在 TTL 内且 force=False，直接返回缓存。

        Args:
            input_dir:    数据源目录（默认 project_root/input）
            report_date:  报告日期 YYYY-MM-DD（默认今天）
            lang:         语言 zh/th（引擎层暂未使用，保留参数）
            targets:      月度目标覆盖（None 则从 config 读取）
            force:        True 时忽略 TTL 强制重算
            period:       时间维度字符串（默认 "this_month"）
            custom_start: 自定义起始日期 YYYY-MM-DD（period="custom" 时使用）
            custom_end:   自定义结束日期 YYYY-MM-DD（period="custom" 时使用）

        Returns:
            包含分析摘要信息的 dict（完整结果见 get_cached_result(period)）
        """
        # 生成唯一缓存 key（custom period 包含日期范围，避免不同范围互相覆盖）
        cache_key = self._cache_key(period, custom_start, custom_end)

        lock = self._get_period_lock(cache_key)
        with lock:
            # TTL 缓存命中
            if not force and self._is_cache_valid(cache_key):
                logger.info(f"缓存命中（TTL 内，period={period}, key={cache_key}），跳过重算")
                return self._build_run_summary(cache_key)

            from core.analysis_engine_v2 import AnalysisEngineV2
            from core.multi_source_loader import MultiSourceLoader
            from core.config import get_targets as cfg_get_targets
            from core.time_period import TimePeriod, resolve_period

            # 解析 period → 日期范围
            try:
                tp_enum = TimePeriod(period)
            except ValueError:
                tp_enum = TimePeriod.THIS_MONTH
                logger.warning(f"未知 period='{period}'，回退到 this_month")

            period_range = resolve_period(
                tp_enum,
                custom_start=custom_start,
                custom_end=custom_end,
            )
            logger.info(
                f"period={period}, 日期范围: {period_range.start_date} ~ {period_range.end_date}"
            )

            # 解析报告日期参数（优先用 period_range.end_date 使时间进度匹配）
            effective_input_dir = Path(input_dir) if input_dir else self.project_root / "input"
            if report_date:
                effective_date = datetime.strptime(report_date, "%Y-%m-%d")
            else:
                # 用 period 结束日期作为报告基准日
                effective_date = datetime(
                    period_range.end_date.year,
                    period_range.end_date.month,
                    period_range.end_date.day,
                )

            # 月度目标（基于 effective_date 所在月份）
            if targets is None:
                targets = cfg_get_targets(effective_date)
            else:
                base = cfg_get_targets(effective_date)
                base.update(targets)
                targets = base

            # 加载 35 源全量数据（多个 period 共享同一份，避免重复 IO）
            # force=True 时强制重新加载，否则仅在首次加载（None）时读取
            with self._raw_data_lock:
                if self._raw_data is None or force:
                    load_reason = "首次加载" if self._raw_data is None else "强制重新加载（force=True）"
                    logger.info(f"开始加载 35 源数据（{load_reason}），input_dir={effective_input_dir}")
                    loader = MultiSourceLoader(input_dir=str(effective_input_dir))
                    raw_all = loader.load_all()
                    self._raw_data = self._scrub_nans(raw_all)
                else:
                    logger.info("复用已加载的 35 源原始数据")

            # 按 period 过滤明细数据
            filtered_data = self._filter_data_by_period(self._raw_data, period_range)
            # 用 cache_key 作为 filtered_raw 的槽，避免 custom period 互相覆盖
            self._filtered_raw[cache_key] = filtered_data
            # 同时用 period 原始字符串做别名（供 get_raw_data(period) 兼容调用）
            if cache_key != period:
                self._filtered_raw[period] = filtered_data

            # 获取快照存储单例（引擎需要用它查 YoY/WoW/峰谷）
            from core.snapshot_store import SnapshotStore
            store: Optional[SnapshotStore] = None
            try:
                store = SnapshotStore.get_instance()
            except Exception as e:
                logger.warning(f"SnapshotStore 初始化失败（非阻塞）: {e}")

            # 执行 V2 引擎分析
            engine = AnalysisEngineV2(filtered_data, targets, effective_date, snapshot_store=store)
            result = engine.analyze()

            # 写入对应 cache_key 的缓存槽
            self._cached_results[cache_key] = result
            self._last_run_ats[cache_key] = datetime.now()
            logger.info(f"AnalysisEngineV2 分析完成（period={period}, key={cache_key}），结果已缓存")

            # 生成快照（优雅降级，仅对 this_month 存快照避免污染历史记录）
            if store is not None and period == "this_month":
                try:
                    store.save_snapshot(result, effective_date)
                    # 额外将 leads 也存入 daily_kpi，供 peak/valley 查询
                    try:
                        summary = result.get("summary", {})
                        leads_data = summary.get("leads", {})
                        leads_actual = leads_data.get("actual", 0) if isinstance(leads_data, dict) else 0
                        data_date = (effective_date - timedelta(days=1)).strftime("%Y-%m-%d")
                        time_progress = result.get("time_progress", 0.0)
                        cursor = store.conn.cursor()
                        cursor.execute(
                            "INSERT OR REPLACE INTO daily_kpi (snapshot_date, metric, value, time_progress) VALUES (?, ?, ?, ?)",
                            (data_date, "leads", leads_actual, time_progress),
                        )
                        store.conn.commit()
                        logger.info(f"leads 快照已写入 daily_kpi（date={data_date}, value={leads_actual}）")
                    except Exception as e:
                        logger.warning(f"leads 快照写入失败（非阻塞）: {e}")
                except Exception as e:
                    logger.warning(f"快照保存失败（非阻塞）: {e}")

            return self._build_run_summary(cache_key)

    # ── Private ───────────────────────────────────────────────────────────────

    def _filter_data_by_period(
        self, data: dict[str, Any], pr: "PeriodRange"
    ) -> dict[str, Any]:
        """
        对原始数据中包含日期字段的 list[dict] 按 period 日期范围过滤，返回新结构。
        过滤失败（字段不存在/格式不对）时保持原样，不抛出异常。

        已知需要过滤的路径：
          - data["order"]["order_detail"]["records"]        → "date" 或 "deal_time_day"
          - data["leads"] 下 A3 明细                        → "注册日期(day)" 或 "date"
          - data["ops"]["daily_outreach"]                   → "date"
          - data["order"]["order_daily_trend"]              → "date"
          其他来源中只要含 "date" 字段的 list，均尝试过滤。

        性能说明：
          _walk_and_filter 只过滤 list 容器（不修改 list 内记录的字段值），因此只需
          创建新的 dict/list 容器，无需深拷贝内部记录对象。内存从 O(全量数据) 降至
          O(容器层数)。_reaggregate_summaries 对 filtered 的写入均为新 dict 赋值
          （非修改已有记录字段），同样不会回写到 _raw_data。
        """
        start = pr.start_date
        end = pr.end_date

        def _try_filter_list(lst: list[Any]) -> list[Any]:
            """对 list[dict] 中含日期字段的项按日期范围过滤，失败则原样返回。
            只过滤，不修改记录本身，items 以引用形式保留。"""
            if not isinstance(lst, list) or not lst:
                return lst
            result = []
            for item in lst:
                if not isinstance(item, dict):
                    result.append(item)
                    continue
                # 尝试各个已知日期字段
                matched = False
                for field in _DATE_FIELDS:
                    raw_val = item.get(field)
                    if raw_val is None:
                        continue
                    try:
                        # 支持 date / datetime / str 格式
                        if isinstance(raw_val, date):
                            item_date = raw_val if isinstance(raw_val, date) else raw_val.date()
                        else:
                            raw_str = str(raw_val).strip()[:10]
                            item_date = date.fromisoformat(raw_str)
                        if start <= item_date <= end:
                            result.append(item)
                        matched = True
                        break
                    except (ValueError, TypeError, AttributeError):
                        continue
                if not matched:
                    # 没有可识别的日期字段，保留该条记录
                    result.append(item)
            return result

        def _walk_and_filter(obj: Any) -> Any:
            """递归遍历 dict/list，对 list[dict] 尝试日期过滤。
            dict 层始终创建新容器（保护 _raw_data 不被 _reaggregate_summaries 修改），
            list 层重建容器（items 为原始引用，不复制记录本身）。"""
            if isinstance(obj, list):
                return _try_filter_list(obj)
            if isinstance(obj, dict):
                return {k: _walk_and_filter(v) for k, v in obj.items()}
            return obj

        # 全部 period 统一走 _walk_and_filter，避免 _raw_data 跨月复用时 this_month
        # 跳过过滤导致返回上月旧数据的 bug
        # 其他 period 执行递归过滤
        try:
            filtered = _walk_and_filter(data)
        except Exception as e:
            logger.warning(f"_filter_data_by_period 过滤异常（非阻塞，使用全量数据）: {e}")
            # 降级：仅浅拷贝顶层容器，避免 _reaggregate_summaries 回写 _raw_data
            filtered = {k: _walk_and_filter(v) if isinstance(v, (dict, list)) else v
                        for k, v in data.items()}

        # 过滤完明细记录后，重新聚合预聚合 summary 字段
        self._reaggregate_summaries(filtered, pr)

        return filtered

    def _reaggregate_summaries(
        self, filtered: dict[str, Any], pr: "PeriodRange"
    ) -> None:
        """
        在明细记录按 period 过滤后，重新计算预聚合的 summary 字段。
        直接修改 filtered（in-place），不返回值。

        重聚合目标：
          1. order_detail["referral_cc_new"]  — CC+新单+转介绍 收入（_analyze_summary 主路径）
          2. order_detail["summary"]           — 全量订单汇总
          3. leads["leads_achievement"]["by_channel"]["总计"]  — 注册/预约/出席/付费（_analyze_summary 主路径）
          4. leads["leads_achievement"]["total"]               — 同上备用字段
        """
        # ── 1. 从过滤后的 E3 明细重新聚合订单 summary ─────────────────────
        try:
            order_detail = filtered.get("order", {}).get("order_detail", {})
            order_records: list = order_detail.get("records", [])
            if isinstance(order_records, list):
                # 1a. referral_cc_new — CC前端+新单+转介绍
                ref_cc_new = [
                    r for r in order_records
                    if (r.get("channel") or "").strip() == "转介绍"
                    and "CC" in str(r.get("team") or "").upper()
                    and (r.get("order_tag") or "").strip() == "新单"
                ]
                order_detail["referral_cc_new"] = {
                    "count": len(ref_cc_new),
                    "revenue_cny": round(sum(r.get("amount_cny") or 0.0 for r in ref_cc_new), 2),
                    "revenue_usd": round(sum(r.get("amount_usd") or 0.0 for r in ref_cc_new), 2),
                    "revenue_thb": round(sum(r.get("amount_thb") or 0.0 for r in ref_cc_new), 2),
                }

                # 1b. summary — 全量订单
                new_orders = sum(1 for r in order_records if (r.get("order_tag") or "").strip() == "新单")
                renewal_orders = sum(1 for r in order_records if (r.get("order_tag") or "").strip() == "续单")
                order_detail["summary"] = {
                    "total_orders": len(order_records),
                    "total_revenue_cny": round(sum(r.get("amount_cny") or 0.0 for r in order_records), 2),
                    "total_revenue_usd": round(sum(r.get("amount_usd") or 0.0 for r in order_records), 2),
                    "new_orders": new_orders,
                    "renewal_orders": renewal_orders,
                }
        except Exception as e:
            logger.warning(f"_reaggregate_summaries: 订单重聚合失败（非阻塞）: {e}")

        # ── 2. 从过滤后的 A3 明细重新聚合 leads_achievement["by_channel"]["总计"] ──
        try:
            leads_data = filtered.get("leads", {})
            a3 = leads_data.get("leads_detail", {})
            a3_records: list = a3.get("records", [])

            if isinstance(a3_records, list):
                bool_true_vals = {"1", "1.0", True}

                def _is_true(v) -> bool:
                    return v in bool_true_vals or str(v).strip() in {"1", "1.0", "True", "true"}

                reg_count = len(a3_records)  # 每条 A3 记录 = 1 个注册 leads
                reserve_count = sum(1 for r in a3_records if _is_true(r.get("当月是否预约")))
                attend_count = sum(1 for r in a3_records if _is_true(r.get("当月是否出席")))
                # 付费：首次1v1大单付费日期在 period 范围内
                paid_count = 0
                for r in a3_records:
                    paid_date_raw = r.get("首次1v1大单付费日期(day)")
                    if paid_date_raw and isinstance(paid_date_raw, str) and len(paid_date_raw) >= 7:
                        try:
                            from datetime import date as _date
                            paid_date = _date.fromisoformat(paid_date_raw[:10])
                            if pr.start_date <= paid_date <= pr.end_date:
                                paid_count += 1
                        except (ValueError, TypeError):
                            pass

                new_total = {
                    "注册": reg_count,
                    "预约": reserve_count,
                    "出席": attend_count,
                    "付费": paid_count,
                    "注册付费率": round(paid_count / reg_count, 4) if reg_count > 0 else None,
                }

                # 更新 by_channel["总计"] 和 total（_analyze_summary 的两个读取路径）
                leads_achievement = leads_data.get("leads_achievement", {})
                if isinstance(leads_achievement, dict):
                    by_channel = leads_achievement.get("by_channel", {})
                    if not isinstance(by_channel, dict):
                        by_channel = {}
                    by_channel["总计"] = new_total
                    leads_achievement["by_channel"] = by_channel
                    leads_achievement["total"] = new_total
        except Exception as e:
            logger.warning(f"_reaggregate_summaries: leads 重聚合失败（非阻塞）: {e}")

    def _build_run_summary(self, period: str = "this_month") -> dict[str, Any]:
        """从指定 period 的缓存结果中提取运行摘要（用于 POST /run 响应）"""
        result = self._cached_results.get(period)
        if not result:
            return {}
        meta = result.get("meta", {})
        summary_block = result.get("summary", {})

        key_metrics: dict[str, Any] = {}
        for k, v in summary_block.items():
            if isinstance(v, dict):
                key_metrics[k] = {
                    "actual":   v.get("actual"),
                    "target":   v.get("target"),
                    "gap":      v.get("gap"),
                    "status":   v.get("status"),
                }

        last_run_at = self._last_run_ats.get(period)
        return {
            "run_at":         last_run_at.isoformat() if last_run_at else None,
            "data_date":      str(meta.get("data_date", "")),
            "current_month":  meta.get("current_month"),
            "time_progress":  result.get("time_progress"),
            "key_metrics":    key_metrics,
            "engine":         "AnalysisEngineV2",
            "period":         period,
        }
