import { ExternalLink, TrendingDown, TrendingUp } from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from "recharts";

// Source: https://es.tradingeconomics.com/mexico/inflation-cpi
// INPC YoY % — últimos 13 meses (May 2025 → Abr 2026)
const HISTORICAL = [
  { period: "May 2025", value: 3.93 },
  { period: "Jun 2025", value: 4.42 },
  { period: "Jul 2025", value: 4.32 },
  { period: "Ago 2025", value: 3.51 },
  { period: "Sep 2025", value: 3.57 },
  { period: "Oct 2025", value: 3.76 },
  { period: "Nov 2025", value: 3.57 },
  { period: "Dic 2025", value: 3.80 },
  { period: "Ene 2026", value: 3.69 },
  { period: "Feb 2026", value: 3.79 },
  { period: "Mar 2026", value: 4.02 },
  { period: "Abr 2026", value: 4.59 },
  { period: "May 2026", value: 4.45 },
];

const LATEST = HISTORICAL[HISTORICAL.length - 1];
const PREV = HISTORICAL[HISTORICAL.length - 2];
const CORE = 4.26; // Subyacente abril 2026
const FOOD = 6.36; // Alimentos abril 2026
const FORECAST_QUARTER = 5.10;
const FORECAST_2027 = 3.70;
const BANXICO_TARGET = 3.0;

export function InflationCard() {
  const delta = LATEST.value - PREV.value;
  const up = delta > 0;

  return (
    <div className="mb-8 bg-card border border-border rounded-2xl p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-1">
        <h2 className="font-display text-lg font-semibold">
          Mexico Inflation (CPI)
        </h2>
        <a
          href="https://es.tradingeconomics.com/mexico/inflation-cpi"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
        >
          Trading Economics / INEGI <ExternalLink className="h-3 w-3" />
        </a>
      </div>
      <p className="text-xs text-muted-foreground mb-5">
        Macro context to interpret cost variations across the complex. Dashed line:
        Banxico target (3%).
      </p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <MetricBox
          label="YoY rate"
          value={`${LATEST.value.toFixed(2)}%`}
          sub={
            <span
              className={up ? "text-negative" : "text-positive"}
            >
              {up ? <TrendingUp className="h-3 w-3 inline" /> : <TrendingDown className="h-3 w-3 inline" />}{" "}
              {delta > 0 ? "+" : ""}{delta.toFixed(2)} pp vs prev. month
            </span>
          }
          highlight
        />
        <MetricBox label="Core" value={`${CORE.toFixed(2)}%`} sub="Excludes energy and food" />
        <MetricBox label="Food" value={`${FOOD.toFixed(2)}%`} sub="Food inflation" />
        <MetricBox
          label="Forecast"
          value={`${FORECAST_QUARTER.toFixed(2)}%`}
          sub={`End of quarter · 2027: ${FORECAST_2027.toFixed(2)}%`}
        />
      </div>

      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={HISTORICAL} margin={{ top: 10, right: 16, bottom: 0, left: 0 }}>
            <CartesianGrid stroke="var(--color-border)" vertical={false} />
            <XAxis dataKey="period" stroke="var(--color-muted-foreground)" fontSize={11} />
            <YAxis
              stroke="var(--color-muted-foreground)"
              fontSize={11}
              domain={[2, 6]}
              tickFormatter={(v) => `${v}%`}
            />
            <Tooltip
              contentStyle={{
                background: "var(--color-popover)",
                border: "1px solid var(--color-border)",
                borderRadius: 12,
                fontSize: 12,
              }}
              formatter={(v) => `${Number(v).toFixed(2)}%`}
            />
            <ReferenceLine
              y={BANXICO_TARGET}
              stroke="var(--brand-young-blue)"
              strokeDasharray="4 4"
              label={{ value: "Banxico target 3%", position: "insideBottomRight", fill: "var(--color-muted-foreground)", fontSize: 10 }}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke="var(--brand-deep-marine)"
              strokeWidth={2.5}
              dot={{ r: 3, fill: "var(--brand-deep-marine)" }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function MetricBox({
  label,
  value,
  sub,
  highlight,
}: {
  label: string;
  value: string;
  sub?: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <div
      className="rounded-xl border border-border p-4"
      style={highlight ? { background: "var(--brand-deep-marine)", color: "#FFFFFF", borderColor: "var(--brand-deep-marine)" } : undefined}
    >
      <div className={"text-xs " + (highlight ? "opacity-80" : "text-muted-foreground")}>{label}</div>
      <div className="font-display text-2xl font-semibold tabular-nums mt-1">{value}</div>
      {sub && (
        <div className={"text-xs mt-1 " + (highlight ? "opacity-80" : "text-muted-foreground")}>{sub}</div>
      )}
    </div>
  );
}
