import { useState, type FormEvent } from "react";
import type { StrategyInput, Timeframe, Direction } from "../types/strategy";
import { MultiSelect } from "./MultiSelect";

const ALL_TIMEFRAMES: Timeframe[] = [
  "M1",
  "M5",
  "M15",
  "M30",
  "H1",
  "H4",
  "D1",
];

const defaultForm: StrategyInput = {
  name: "",
  active: false,
  direction: "both",
  pairs: [],
  timeframes: ["H1"],
  patterns: { pinBar: false, engulfing: false, insideBar: false, doji: false },
  risk: {
    slType: "atr",
    slValue: 2,
    tpType: "atr",
    tpValue: 3,
    trailingStop: false,
    trailDistance: 0,
  },
  maxOpenTrades: 3,
  drawdownLimit: 10,
  positionSizing: { riskPerTrade: 2 },
  newsFilter: { enabled: false, minImpact: "medium", windowBefore: 2, windowAfter: 0 },
};

interface Props {
  initialData?: StrategyInput;
  onSave: (data: StrategyInput) => Promise<void>;
  isSaving: boolean;
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="card space-y-4">
      <h3 className="font-semibold text-surface-600 border-b border-surface-200 pb-2">
        {title}
      </h3>
      {children}
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-3 min-w-0">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`relative w-10 h-5 rounded-full transition-colors shrink-0 ${checked ? "bg-brand-500" : "bg-surface-300"}`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${checked ? "translate-x-5" : ""}`}
        />
      </button>
      <span className="text-sm text-surface-500">{label}</span>
    </div>
  );
}

export function StrategyForm({ initialData, onSave, isSaving }: Props) {
  const [f, setF] = useState<StrategyInput>(initialData ?? defaultForm);

  const update = <K extends keyof StrategyInput>(
    key: K,
    val: StrategyInput[K],
  ) => setF((prev) => ({ ...prev, [key]: val }));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    onSave(f);
  };

  return (
    <form onSubmit={submit} className="space-y-6">
      <Section title="Basic Info">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="name">
              Strategy Name
            </label>
            <input
              id="name"
              className="input"
              required
              value={f.name}
              onChange={(e) => update("name", e.target.value)}
              placeholder="e.g. Pin Bar Hunter"
            />
          </div>
          <div>
            <label className="label" htmlFor="direction">
              Direction
            </label>
            <select
              id="direction"
              className="input"
              value={f.direction}
              onChange={(e) => update("direction", e.target.value as Direction)}
            >
              <option value="long">Long only</option>
              <option value="short">Short only</option>
              <option value="both">Both</option>
            </select>
          </div>
        </div>
      </Section>

      <Section title="Market Selection">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Forex Pairs</label>
            <MultiSelect
              selected={f.pairs}
              onChange={(pairs) => update("pairs", pairs)}
            />
          </div>
          <div>
            <label className="label">Timeframes</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-1">
              {ALL_TIMEFRAMES.map((tf) => (
                <label
                  key={tf}
                  className={`flex items-center justify-center px-2 py-1.5 rounded text-xs font-medium cursor-pointer border transition-colors ${
                    f.timeframes.includes(tf)
                      ? "bg-brand-500/10 border-brand-500 text-brand-400"
                      : "bg-surface-200 border-surface-200 text-surface-400 hover:border-surface-300"
                  }`}
                >
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={f.timeframes.includes(tf)}
                    onChange={(e) => {
                      if (e.target.checked)
                        update("timeframes", [...f.timeframes, tf]);
                      else
                        update(
                          "timeframes",
                          f.timeframes.filter((t) => t !== tf),
                        );
                    }}
                  />
                  {tf}
                </label>
              ))}
            </div>
          </div>
        </div>
      </Section>

      <Section title="Price Action Patterns">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {(["pinBar", "engulfing", "insideBar", "doji"] as const).map((p) => (
            <label
              key={p}
              className={`flex items-center justify-between px-4 py-3 rounded-lg border transition-colors cursor-pointer ${
                f.patterns[p]
                  ? "bg-brand-500/10 border-brand-500 text-brand-400"
                  : "bg-surface-200 border-surface-200 text-surface-400 hover:border-surface-300"
              }`}
            >
              <span className="text-sm font-medium capitalize">
                {p.replace(/([A-Z])/g, " $1").trim()}
              </span>
              <input
                type="checkbox"
                className="sr-only"
                checked={f.patterns[p]}
                onChange={(e) =>
                  setF((prev) => ({
                    ...prev,
                    patterns: { ...prev.patterns, [p]: e.target.checked },
                  }))
                }
              />
              <div
                className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                  f.patterns[p]
                    ? "bg-brand-500 border-brand-500"
                    : "border-surface-300"
                }`}
              >
                {f.patterns[p] && (
                  <svg
                    className="w-3 h-3 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={3}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                )}
              </div>
            </label>
          ))}
        </div>
      </Section>

      <Section title="Risk Management">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="slType">
              Stop Loss Type
            </label>
            <select
              id="slType"
              className="input"
              value={f.risk.slType}
              onChange={(e) =>
                setF((prev) => ({
                  ...prev,
                  risk: {
                    ...prev.risk,
                    slType: e.target.value as "atr" | "fixed" | "percentage",
                  },
                }))
              }
            >
              <option value="atr">ATR-based</option>
              <option value="fixed">Fixed pips</option>
              <option value="percentage">Account %</option>
            </select>
          </div>
          <div>
            <label className="label" htmlFor="slValue">
              Stop Loss Value
            </label>
            <input
              id="slValue"
              type="number"
              className="input"
              required
              min={0}
              step="any"
              value={f.risk.slValue}
              onChange={(e) =>
                setF((prev) => ({
                  ...prev,
                  risk: { ...prev.risk, slValue: parseFloat(e.target.value) },
                }))
              }
            />
          </div>
          <div>
            <label className="label" htmlFor="tpType">
              Take Profit Type
            </label>
            <select
              id="tpType"
              className="input"
              value={f.risk.tpType}
              onChange={(e) =>
                setF((prev) => ({
                  ...prev,
                  risk: {
                    ...prev.risk,
                    tpType: e.target.value as "atr" | "fixed" | "percentage",
                  },
                }))
              }
            >
              <option value="atr">ATR-based</option>
              <option value="fixed">Fixed pips</option>
              <option value="percentage">Account %</option>
            </select>
          </div>
          <div>
            <label className="label" htmlFor="tpValue">
              Take Profit Value
            </label>
            <input
              id="tpValue"
              type="number"
              className="input"
              required
              min={0}
              step="any"
              value={f.risk.tpValue}
              onChange={(e) =>
                setF((prev) => ({
                  ...prev,
                  risk: { ...prev.risk, tpValue: parseFloat(e.target.value) },
                }))
              }
            />
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-4">
          <Toggle
            label="Trailing Stop Loss"
            checked={f.risk.trailingStop}
            onChange={(v) =>
              setF((prev) => ({
                ...prev,
                risk: { ...prev.risk, trailingStop: v },
              }))
            }
          />
          {f.risk.trailingStop && (
            <div className="w-full sm:w-40">
              <label className="label" htmlFor="trailDist">
                Trail Distance
              </label>
              <input
                id="trailDist"
                type="number"
                className="input"
                min={0}
                step="any"
                value={f.risk.trailDistance}
                onChange={(e) =>
                  setF((prev) => ({
                    ...prev,
                    risk: {
                      ...prev.risk,
                      trailDistance: parseFloat(e.target.value),
                    },
                  }))
                }
              />
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="maxTrades">
              Max Open Trades
            </label>
            <input
              id="maxTrades"
              type="number"
              className="input"
              required
              min={1}
              value={f.maxOpenTrades}
              onChange={(e) =>
                update("maxOpenTrades", parseInt(e.target.value))
              }
            />
          </div>
          <div>
            <label className="label" htmlFor="drawdown">
              Max Drawdown (%)
            </label>
            <input
              id="drawdown"
              type="number"
              className="input"
              required
              min={0}
              max={100}
              step={0.1}
              value={f.drawdownLimit}
              onChange={(e) =>
                update("drawdownLimit", parseFloat(e.target.value))
              }
            />
          </div>
        </div>
      </Section>

      <Section title="Position Sizing">
        <div className="max-w-xs">
          <label className="label" htmlFor="riskPerTrade">
            Risk Per Trade (%)
          </label>
          <input
            id="riskPerTrade"
            type="number"
            className="input"
            required
            min={0.1}
            max={100}
            step={0.1}
            value={f.positionSizing.riskPerTrade}
            onChange={(e) =>
              setF((prev) => ({
                ...prev,
                positionSizing: { riskPerTrade: parseFloat(e.target.value) },
              }))
            }
          />
        </div>
      </Section>

      <Section title="News Filter">
        <Toggle
          label="Pause trading around high-impact news events"
          checked={f.newsFilter.enabled}
          onChange={(v) =>
            setF((prev) => ({
              ...prev,
              newsFilter: { ...prev.newsFilter, enabled: v },
            }))
          }
        />
        {f.newsFilter.enabled && (
          <div className="space-y-4 max-w-xs">
            <div>
              <label className="label" htmlFor="minImpact">
                Minimum Impact Level
              </label>
              <select
                id="minImpact"
                className="input"
                value={f.newsFilter.minImpact}
                onChange={(e) =>
                  setF((prev) => ({
                    ...prev,
                    newsFilter: {
                      ...prev.newsFilter,
                      minImpact: e.target.value as "low" | "medium" | "high",
                    },
                  }))
                }
              >
                <option value="low">Low + Medium + High</option>
                <option value="medium">Medium + High</option>
                <option value="high">High only</option>
              </select>
            </div>
            <div>
              <label className="label" htmlFor="windowBefore">
                Pause Before (hours)
              </label>
              <input
                id="windowBefore"
                type="number"
                className="input"
                min={0}
                max={24}
                step={0.5}
                value={f.newsFilter.windowBefore}
                onChange={(e) =>
                  setF((prev) => ({
                    ...prev,
                    newsFilter: {
                      ...prev.newsFilter,
                      windowBefore: parseFloat(e.target.value),
                    },
                  }))
                }
              />
            </div>
            <div>
              <label className="label" htmlFor="windowAfter">
                Resume After (hours)
              </label>
              <input
                id="windowAfter"
                type="number"
                className="input"
                min={0}
                max={24}
                step={0.5}
                value={f.newsFilter.windowAfter}
                onChange={(e) =>
                  setF((prev) => ({
                    ...prev,
                    newsFilter: {
                      ...prev.newsFilter,
                      windowAfter: parseFloat(e.target.value),
                    },
                  }))
                }
              />
            </div>
          </div>
        )}
      </Section>

      <div className="flex justify-end gap-3">
        <button type="submit" disabled={isSaving} className="btn-primary">
          {isSaving ? "Saving..." : "Save Strategy"}
        </button>
      </div>
    </form>
  );
}
