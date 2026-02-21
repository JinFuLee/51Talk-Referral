"use client";

import { useState, useCallback, useEffect } from "react";
import { useExchangeRate, useTargetsV2, useTargetRecommendation } from "@/lib/hooks";
import { configAPI } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import type {
  MonthlyTargetV2,
  HardTarget,
  ChannelTarget,
  ChannelDecomposition,
  EnclosureTarget,
  SOPTargets,
  TargetScenario,
} from "@/lib/types";

// ── 月份选项 ──────────────────────────────────────────────────────────────────

const MONTHS = ["202601", "202602", "202603", "202604", "202605", "202606"];

// ── 默认空 V2 结构 ────────────────────────────────────────────────────────────

function defaultV2(month: string): MonthlyTargetV2 {
  const emptyChannel = (): ChannelTarget => ({
    user_count: 0,
    asp: 0,
    conversion_rate: 0,
    reserve_rate: 0,
    attend_rate: 0,
  });
  const emptyEnclosure = (): EnclosureTarget => ({
    reach_rate: 0,
    participation_rate: 0,
    conversion_rate: 0,
    checkin_rate: 0,
  });
  return {
    version: 2,
    month,
    hard: {
      total_revenue: 0,
      referral_pct: 0,
      referral_revenue: 0,
      display_currency: "THB",
      lock_field: "pct",
    },
    channels: {
      cc_narrow: emptyChannel(),
      ss_narrow: emptyChannel(),
      lp_narrow: emptyChannel(),
      wide: emptyChannel(),
    },
    enclosures: {
      d0_30: emptyEnclosure(),
      d31_60: emptyEnclosure(),
      d61_90: emptyEnclosure(),
      d91_180: emptyEnclosure(),
      d181_plus: emptyEnclosure(),
    },
    sop: {
      checkin_rate: 0,
      reach_rate: 0,
      participation_rate: 0,
      reserve_rate: 0,
      attend_rate: 0,
      outreach_calls_per_day: 0,
    },
  };
}

// ── 数值输入组件 ──────────────────────────────────────────────────────────────

interface NumInputProps {
  value: number;
  onChange: (v: number) => void;
  suffix?: string;
  step?: number;
  min?: number;
  className?: string;
}

function NumInput({
  value,
  onChange,
  suffix,
  step = 1,
  min = 0,
  className = "",
}: NumInputProps) {
  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <input
        type="number"
        value={value || ""}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        step={step}
        min={min}
        className="w-24 px-2 py-1 border border-slate-200 rounded text-sm text-right focus:outline-none focus:ring-2 focus:ring-brand-500"
      />
      {suffix && <span className="text-xs text-slate-400">{suffix}</span>}
    </div>
  );
}

// ── 百分比输入（显示 % 但存储 0~1） ──────────────────────────────────────────

function PctInput({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <NumInput
      value={Math.round(value * 10000) / 100}
      onChange={(v) => onChange(v / 100)}
      suffix="%"
      step={0.1}
    />
  );
}

// ── 折叠按钮（用于 Card actions） ─────────────────────────────────────────────

function CollapseToggle({
  open,
  onToggle,
}: {
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 transition-colors"
    >
      <span>{open ? "▼ 收起" : "▶ 展开"}</span>
    </button>
  );
}

// ── 页面主体 ──────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [selectedMonth, setSelectedMonth] = useState("202602");
  const { data: rate, mutate: mutateRate } = useExchangeRate();
  const { data: serverV2, mutate: mutateV2 } = useTargetsV2(selectedMonth);
  const { data: recommendation } = useTargetRecommendation(selectedMonth);
  const [v2, setV2] = useState<MonthlyTargetV2>(defaultV2(selectedMonth));
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // 汇率
  const [rateInput, setRateInput] = useState("");
  const [rateSaving, setRateSaving] = useState(false);
  const [rateMsg, setRateMsg] = useState<string | null>(null);

  // 折叠状态
  const [showEnclosures, setShowEnclosures] = useState(false);
  const [showSOP, setShowSOP] = useState(false);

  const exchangeRate = rate?.rate ?? 35;

  // 服务端数据加载后同步到本地
  useEffect(() => {
    if (serverV2) {
      setV2(serverV2);
    } else {
      setV2(defaultV2(selectedMonth));
    }
  }, [serverV2, selectedMonth]);

  // ── 双向计算 ────────────────────────────────────────────────────────────────

  const updateHard = useCallback((patch: Partial<HardTarget>) => {
    setV2((prev) => {
      const h = { ...prev.hard, ...patch };
      if ("referral_pct" in patch && h.lock_field === "pct") {
        h.referral_revenue = Math.round(h.total_revenue * h.referral_pct);
      }
      if ("referral_revenue" in patch && h.lock_field === "amount") {
        h.referral_pct =
          h.total_revenue > 0 ? h.referral_revenue / h.total_revenue : 0;
      }
      if ("total_revenue" in patch) {
        if (h.lock_field === "pct") {
          h.referral_revenue = Math.round(h.total_revenue * h.referral_pct);
        } else {
          h.referral_pct =
            h.total_revenue > 0 ? h.referral_revenue / h.total_revenue : 0;
        }
      }
      return { ...prev, hard: h };
    });
  }, []);

  const updateChannel = useCallback(
    (key: keyof ChannelDecomposition, patch: Partial<ChannelTarget>) => {
      setV2((prev) => ({
        ...prev,
        channels: {
          ...prev.channels,
          [key]: { ...prev.channels[key], ...patch },
        },
      }));
    },
    []
  );

  const updateEnclosure = useCallback(
    (key: string, patch: Partial<EnclosureTarget>) => {
      setV2((prev) => ({
        ...prev,
        enclosures: {
          ...prev.enclosures,
          [key]: {
            ...prev.enclosures[key],
            ...patch,
          },
        },
      }));
    },
    []
  );

  const updateSOP = useCallback((patch: Partial<SOPTargets>) => {
    setV2((prev) => ({ ...prev, sop: { ...prev.sop, ...patch } }));
  }, []);

  // ── 渠道合计计算 ────────────────────────────────────────────────────────────

  const ch = v2.channels;
  const channelKeys: (keyof ChannelDecomposition)[] = [
    "cc_narrow",
    "ss_narrow",
    "lp_narrow",
    "wide",
  ];
  const channelLabels: Record<string, string> = {
    cc_narrow: "CC窄口",
    ss_narrow: "SS窄口",
    lp_narrow: "LP窄口",
    wide: "宽口",
  };

  const totalReg = channelKeys.reduce((s, k) => s + ch[k].user_count, 0);
  const totalPaid = channelKeys.reduce(
    (s, k) => s + Math.round(ch[k].user_count * ch[k].conversion_rate),
    0
  );
  const totalChannelRevenue = channelKeys.reduce((s, k) => {
    const c = ch[k];
    return s + Math.round(c.user_count * c.conversion_rate) * c.asp;
  }, 0);
  const revenueGap =
    v2.hard.referral_revenue > 0
      ? totalChannelRevenue - v2.hard.referral_revenue
      : 0;

  // ── 保存 ────────────────────────────────────────────────────────────────────

  async function handleSave() {
    setSaving(true);
    setMsg(null);
    try {
      // Optimistic UI: 提前更新界面状态，不等待后端返回
      mutateV2(v2, false); 
      await configAPI.putTargetsV2(selectedMonth, v2);
      await mutateV2(); // 后端确认后再获取真实数据刷新
      setMsg("保存成功");
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveRate() {
    const val = parseFloat(rateInput);
    if (isNaN(val) || val <= 0) {
      setRateMsg("请输入有效汇率");
      return;
    }
    setRateSaving(true);
    setRateMsg(null);
    try {
      await configAPI.putExchangeRate(val);
      await mutateRate();
      setRateMsg("保存成功");
      setRateInput("");
    } catch (e: unknown) {
      setRateMsg(e instanceof Error ? e.message : "保存失败");
    } finally {
      setRateSaving(false);
    }
  }

  // ── 智能推荐：应用场景 ───────────────────────────────────────────────────────

  function applyScenario(scenario: TargetScenario) {
    setV2((prev) => {
      const prefill = scenario.v2_prefill;
      const channelKeys = ["cc_narrow", "ss_narrow", "lp_narrow", "wide"] as const;
      const newChannels = { ...prev.channels };
      for (const k of channelKeys) {
        if (prefill.channels[k]) {
          newChannels[k] = { ...prev.channels[k], ...prefill.channels[k] };
        }
      }
      return {
        ...prev,
        hard: {
          ...prev.hard,
          referral_revenue: prefill.hard.referral_revenue,
          lock_field: prefill.hard.lock_field as "pct" | "amount",
          referral_pct:
            prev.hard.total_revenue > 0
              ? prefill.hard.referral_revenue / prev.hard.total_revenue
              : prev.hard.referral_pct,
        },
        channels: newChannels,
        sop: { ...prev.sop, ...prefill.sop },
      };
    });
    setMsg(`已应用"${scenario.label}"方案`);
  }

  // ── 围场键名映射 ────────────────────────────────────────────────────────────

  const enclosureKeys = [
    "d0_30",
    "d31_60",
    "d61_90",
    "d91_180",
    "d181_plus",
  ] as const;
  type EnclosureKey = (typeof enclosureKeys)[number];

  const enclosureLabels: Record<EnclosureKey, string> = {
    d0_30: "0-30天",
    d31_60: "31-60天",
    d61_90: "61-90天",
    d91_180: "91-180天",
    d181_plus: "181+天",
  };

  const enclosureMetrics: {
    key: keyof EnclosureTarget;
    label: string;
  }[] = [
    { key: "reach_rate", label: "触达率" },
    { key: "participation_rate", label: "参与率" },
    { key: "conversion_rate", label: "转化率" },
    { key: "checkin_rate", label: "打卡率" },
  ];

  return (
    <div className="space-y-6 max-w-4xl">
      {/* 顶部：标题 + 月份选择 + 保存按钮 */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">系统设置</h1>
        <div className="flex items-center gap-3">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            {MONTHS.map((m) => (
              <option key={m} value={m}>
                {m.slice(0, 4)}年{m.slice(4)}月
              </option>
            ))}
          </select>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50 transition-colors"
          >
            {saving ? <Spinner size="sm" /> : "保存目标"}
          </button>
        </div>
      </div>

      {msg && (
        <p
          className={`text-sm ${msg.includes("成功") ? "text-green-600" : "text-red-500"}`}
        >
          {msg}
        </p>
      )}

      {/* Card 1: 汇率 */}
      <Card title="汇率配置">
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <span>当前汇率：</span>
            <span className="font-semibold text-slate-800">
              {rate ? `${rate.rate} ${rate.unit}` : "加载中…"}
            </span>
          </div>
          <div className="flex gap-2">
            <input
              value={rateInput}
              onChange={(e) => setRateInput(e.target.value)}
              placeholder="新汇率 (THB/USD)"
              type="number"
              step="0.01"
              className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <button
              onClick={handleSaveRate}
              disabled={rateSaving || !rateInput}
              className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50 transition-colors"
            >
              {rateSaving ? <Spinner size="sm" /> : "保存"}
            </button>
          </div>
          {rateMsg && (
            <p
              className={`text-xs ${rateMsg.includes("成功") ? "text-green-600" : "text-red-500"}`}
            >
              {rateMsg}
            </p>
          )}
        </div>
      </Card>

      {/* 智能推荐 */}
      {recommendation && (
        <Card title="智能推荐">
          <div className="space-y-4">
            {/* 增长率参考 */}
            <div className="text-xs text-slate-500">
              历史增长率：注册 {(recommendation.growth_rates.reg * 100).toFixed(1)}% ·{" "}
              付费 {(recommendation.growth_rates.paid * 100).toFixed(1)}% ·{" "}
              收入 {(recommendation.growth_rates.revenue * 100).toFixed(1)}%
            </div>

            {/* 三档场景 */}
            <div className="grid grid-cols-3 gap-3">
              {(["conservative", "base", "aggressive"] as const).map((key) => {
                const s = recommendation.scenarios[key];
                const colors: Record<typeof key, string> = {
                  conservative: "border-blue-200 bg-blue-50",
                  base: "border-green-200 bg-green-50",
                  aggressive: "border-orange-200 bg-orange-50",
                };
                return (
                  <div key={key} className={`rounded-lg border p-3 ${colors[key]}`}>
                    <div className="font-medium text-sm text-slate-800">{s.label}</div>
                    <div className="text-xs text-slate-500 mb-2">×{s.multiplier}</div>
                    <div className="space-y-1 text-xs text-slate-600">
                      <div>注册: {s.summary.注册目标}</div>
                      <div>付费: {s.summary.付费目标}</div>
                      <div>收入: ${s.summary.金额目标.toLocaleString()}</div>
                    </div>
                    <button
                      onClick={() => applyScenario(s)}
                      className="mt-2 w-full px-2 py-1 text-xs font-medium rounded bg-white border border-slate-200 hover:bg-slate-50 transition-colors"
                    >
                      应用此方案
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>
      )}

      {/* Card 2: 硬性目标 */}
      <Card title="硬性目标 (L1)">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-slate-500 mb-1 block">
              HQ总业绩目标
            </label>
            <NumInput
              value={v2.hard.total_revenue}
              onChange={(v) => updateHard({ total_revenue: v })}
              suffix="USD"
            />
            {v2.hard.total_revenue > 0 && (
              <span className="text-xs text-slate-400 mt-1 block">
                ≈ {(v2.hard.total_revenue * exchangeRate).toLocaleString()} THB
              </span>
            )}
            {recommendation?.feasibility.score !== null && recommendation?.feasibility.score !== undefined && (
              <div
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium mt-1 ${
                  recommendation.feasibility.confidence === "high"
                    ? "bg-green-100 text-green-700"
                    : recommendation.feasibility.confidence === "medium"
                    ? "bg-yellow-100 text-yellow-700"
                    : "bg-red-100 text-red-700"
                }`}
              >
                <span>{recommendation.feasibility.label}</span>
                <span className="text-slate-500">({recommendation.feasibility.probability})</span>
              </div>
            )}
            {recommendation?.feasibility.detail &&
              Object.keys(recommendation.feasibility.detail).length > 0 && (
                <div className="mt-2 space-y-1">
                  {Object.entries(recommendation.feasibility.detail).map(([metric, d]) => (
                    <div key={metric} className="flex items-center gap-2 text-xs text-slate-500">
                      <span>{metric}:</span>
                      <span>
                        {d.actual.toLocaleString()} / {d.target.toLocaleString()}
                      </span>
                      <span className={d.pace_ratio >= 1 ? "text-green-600" : "text-yellow-600"}>
                        (节奏 {(d.pace_ratio * 100).toFixed(0)}%)
                      </span>
                    </div>
                  ))}
                </div>
              )}
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">
              显示币种
            </label>
            <select
              value={v2.hard.display_currency}
              onChange={(e) =>
                updateHard({
                  display_currency: e.target.value as "THB" | "USD",
                })
              }
              className="px-2 py-1 border border-slate-200 rounded text-sm"
            >
              <option value="THB">THB</option>
              <option value="USD">USD</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">
              转介绍占比
            </label>
            <div className="flex items-center gap-2">
              <input
                type="radio"
                checked={v2.hard.lock_field === "pct"}
                onChange={() => updateHard({ lock_field: "pct" })}
              />
              <PctInput
                value={v2.hard.referral_pct}
                onChange={(v) => updateHard({ referral_pct: v })}
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">
              转介绍收入
            </label>
            <div className="flex items-center gap-2">
              <input
                type="radio"
                checked={v2.hard.lock_field === "amount"}
                onChange={() => updateHard({ lock_field: "amount" })}
              />
              <NumInput
                value={v2.hard.referral_revenue}
                onChange={(v) => updateHard({ referral_revenue: v })}
                suffix="USD"
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Card 3: 渠道拆解 */}
      <Card title="渠道拆解 (L2)">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left py-2 font-medium text-slate-500 w-20">
                  渠道
                </th>
                <th className="text-right py-2 font-medium text-slate-500">
                  注册目标
                </th>
                <th className="text-right py-2 font-medium text-slate-500">
                  客单价
                </th>
                <th className="text-right py-2 font-medium text-slate-500">
                  转化率
                </th>
                <th className="text-right py-2 font-medium text-slate-500">
                  付费目标
                </th>
                <th className="text-right py-2 font-medium text-slate-500">
                  收入目标
                </th>
              </tr>
            </thead>
            <tbody>
              {channelKeys.map((k) => {
                const c = ch[k];
                const paid = Math.round(c.user_count * c.conversion_rate);
                const rev = paid * c.asp;
                return (
                  <tr key={k} className="border-b border-slate-50">
                    <td className="py-2 font-medium text-slate-700">
                      {channelLabels[k]}
                    </td>
                    <td className="py-2 text-right">
                      <NumInput
                        value={c.user_count}
                        onChange={(v) => updateChannel(k, { user_count: v })}
                      />
                    </td>
                    <td className="py-2 text-right">
                      <NumInput
                        value={c.asp}
                        onChange={(v) => updateChannel(k, { asp: v })}
                        suffix="USD"
                        step={10}
                      />
                    </td>
                    <td className="py-2 text-right">
                      <PctInput
                        value={c.conversion_rate}
                        onChange={(v) =>
                          updateChannel(k, { conversion_rate: v })
                        }
                      />
                    </td>
                    <td className="py-2 text-right text-slate-600">{paid}</td>
                    <td className="py-2 text-right text-slate-600">
                      ${rev.toLocaleString()}
                    </td>
                  </tr>
                );
              })}
              {/* 合计行 */}
              <tr className="border-t-2 border-slate-200 font-semibold">
                <td className="py-2 text-slate-800">合计</td>
                <td className="py-2 text-right text-slate-800">{totalReg}</td>
                <td className="py-2 text-right text-slate-400">—</td>
                <td className="py-2 text-right text-slate-400">
                  {totalReg > 0
                    ? `${((totalPaid / totalReg) * 100).toFixed(1)}%`
                    : "—"}
                </td>
                <td className="py-2 text-right text-slate-800">{totalPaid}</td>
                <td
                  className={`py-2 text-right ${
                    revenueGap !== 0 && v2.hard.referral_revenue > 0
                      ? "text-yellow-600"
                      : "text-slate-800"
                  }`}
                >
                  ${totalChannelRevenue.toLocaleString()}
                  {revenueGap !== 0 && v2.hard.referral_revenue > 0 && (
                    <span className="text-xs ml-1">
                      ({revenueGap > 0 ? "+" : ""}
                      {revenueGap.toLocaleString()})
                    </span>
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      {/* Card 4: 围场目标（默认折叠） */}
      <Card
        title="围场目标"
        actions={
          <CollapseToggle
            open={showEnclosures}
            onToggle={() => setShowEnclosures((v) => !v)}
          />
        }
      >
        {showEnclosures ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left py-2 font-medium text-slate-500">
                    指标
                  </th>
                  {enclosureKeys.map((k) => (
                    <th
                      key={k}
                      className="text-right py-2 font-medium text-slate-500"
                    >
                      {enclosureLabels[k]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {enclosureMetrics.map(({ key: metric, label }) => (
                  <tr key={metric} className="border-b border-slate-50">
                    <td className="py-2 text-slate-700">{label}</td>
                    {enclosureKeys.map((k) => (
                      <td key={k} className="py-2 text-right">
                        <PctInput
                          value={v2.enclosures[k][metric]}
                          onChange={(v) => updateEnclosure(k, { [metric]: v })}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-slate-400">点击右上角展开配置</p>
        )}
      </Card>

      {/* Card 5: SOP 过程指标（默认折叠） */}
      <Card
        title="SOP 过程指标"
        actions={
          <CollapseToggle
            open={showSOP}
            onToggle={() => setShowSOP((v) => !v)}
          />
        }
      >
        {showSOP ? (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-slate-500 mb-1 block">
                24H打卡率
              </label>
              <PctInput
                value={v2.sop.checkin_rate}
                onChange={(v) => updateSOP({ checkin_rate: v })}
              />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">
                触达率
              </label>
              <PctInput
                value={v2.sop.reach_rate}
                onChange={(v) => updateSOP({ reach_rate: v })}
              />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">
                参与率
              </label>
              <PctInput
                value={v2.sop.participation_rate}
                onChange={(v) => updateSOP({ participation_rate: v })}
              />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">
                约课率
              </label>
              <PctInput
                value={v2.sop.reserve_rate}
                onChange={(v) => updateSOP({ reserve_rate: v })}
              />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">
                出席率
              </label>
              <PctInput
                value={v2.sop.attend_rate}
                onChange={(v) => updateSOP({ attend_rate: v })}
              />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">
                日外呼目标
              </label>
              <NumInput
                value={v2.sop.outreach_calls_per_day}
                onChange={(v) => updateSOP({ outreach_calls_per_day: v })}
                suffix="次/天"
              />
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-400">点击右上角展开配置</p>
        )}
      </Card>
    </div>
  );
}
