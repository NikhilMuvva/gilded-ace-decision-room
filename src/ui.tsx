import React from "react";
import { ResponsiveContainer } from "recharts";
import { MetricHelp } from "./Help";
import { helpTermForLabel } from "./helpContent";
export type Data = any;
export const money = (v: number | null, compact = true, digits = 0) =>
  v == null || !Number.isFinite(v)
    ? "—"
    : new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        notation: compact ? "compact" : "standard",
        maximumFractionDigits: compact ? 1 : digits,
        minimumFractionDigits: compact ? 0 : digits,
      }).format(v);
export const number = (v: number | null, digits = 0) =>
  v == null || !Number.isFinite(v)
    ? "—"
    : new Intl.NumberFormat("en-US", { maximumFractionDigits: digits }).format(
        v,
      );
export const pct = (v: number | null, digits = 1) =>
  v == null || !Number.isFinite(v) ? "—" : `${(v * 100).toFixed(digits)}%`;
export const month = (s: string) =>
  new Date(s + "-15T12:00:00").toLocaleDateString("en-US", { month: "short" });
export const dateLabel = (s: string) =>
  new Date(s + "T12:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
export const COLORS = [
  "#1c6c50",
  "#a8781d",
  "#456e99",
  "#a34c49",
  "#78639e",
  "#297d86",
  "#707d34",
];
export const chartProps = {
  fontSize: 12,
  fill: "#56625b",
  axisLine: false,
  tickLine: false,
};
export const toolProps = {
  contentStyle: {
    border: "1px solid #ccd5cd",
    borderRadius: 5,
    fontSize: 13,
    boxShadow: "0 4px 16px #172c2314",
  },
};
export function download(name: string, value: unknown) {
  const url = URL.createObjectURL(
      new Blob([JSON.stringify(value, null, 2)], { type: "application/json" }),
    ),
    a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}
export function Kpi({
  label,
  value,
  note,
  accent = false,
  term,
}: {
  label: string;
  value: string;
  note: string;
  accent?: boolean;
  term?: string;
}) {
  const help = term || helpTermForLabel(label);
  return (
    <div className={"kpi " + (accent ? "accent" : "")}>
      <span className="kpi-label">
        {label}
        {help && <MetricHelp term={help} label={label} />}
      </span>
      <strong>{value}</strong>
      <small>{note}</small>
    </div>
  );
}
export function Panel({
  title,
  eyebrow,
  tools,
  children,
  className = "",
}: {
  title: string;
  eyebrow?: string;
  tools?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={"panel " + className}>
      <div className="panel-head">
        <div>
          <h2>{title}</h2>
          {eyebrow && <p className="panel-subtitle">{eyebrow}</p>}
        </div>
        {tools}
      </div>
      {children}
    </section>
  );
}
export function Chart({
  children,
  height = 280,
}: {
  children: React.ReactElement;
  height?: number;
}) {
  return (
    <div className="chart" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        {children}
      </ResponsiveContainer>
    </div>
  );
}
export function Note({ children }: { children: React.ReactNode }) {
  return <p className="note">{children}</p>;
}
export function Insight({
  children,
  details,
}: {
  children: React.ReactNode;
  details?: React.ReactNode;
}) {
  return (
    <div className="chart-insight">
      <span>{children}</span>
      {details && (
        <details>
          <summary>How calculated</summary>
          <div>{details}</div>
        </details>
      )}
    </div>
  );
}
