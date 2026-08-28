import React, { useMemo, useState } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";
import { formatBRL, monthLabel } from "../lib/theme";

const COLORS = {
  ink: "#1B2A3D",
  inkSoft: "#4C5C6E",
  line: "#AEBBC8",
  paper: "#E4EAF0",
  gold: "#B08A34",
  income: "#2F6E4F",
  expense: "#B4432A",
};

const tooltipStyle = {
  fontFamily: "'IBM Plex Mono', monospace",
  fontSize: 12,
  border: `1px solid ${COLORS.line}`,
  background: COLORS.paper,
};

function shortAxis(v) {
  const abs = Math.abs(v);
  if (abs >= 1000) return `${(v / 1000).toFixed(abs >= 10000 ? 0 : 1).replace(".", ",")}k`;
  return String(v);
}

export default function BalanceChart({ entries }) {
  const [mode, setMode] = useState("mes"); // mes | acumulado

  const byMonth = useMemo(() => {
    const map = {};
    entries.forEach((e) => {
      const key = e.date.slice(0, 7);
      if (!map[key]) map[key] = { receitas: 0, despesas: 0 };
      if (e.type === "receita") map[key].receitas += e.amount;
      else map[key].despesas += e.amount;
    });
    return map;
  }, [entries]);

  const monthly = useMemo(() => {
    return Object.keys(byMonth)
      .sort()
      .map((key) => {
        const { receitas, despesas } = byMonth[key];
        return {
          key,
          month: monthLabel(key),
          receitas: Math.round(receitas * 100) / 100,
          despesas: Math.round(despesas * 100) / 100,
          saldo: Math.round((receitas - despesas) * 100) / 100,
        };
      });
  }, [byMonth]);

  const acumulado = useMemo(() => {
    let running = 0;
    return monthly.map((m) => {
      running += m.saldo;
      return { month: m.month, saldo: Math.round(running * 100) / 100 };
    });
  }, [monthly]);

  if (monthly.length < 2) return null;

  return (
    <div className="cdc-card" style={{ padding: "16px 16px 8px", marginBottom: 24 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.08em", color: "var(--ink-soft)" }}>
          {mode === "mes" ? "ENTRADAS E SAÍDAS POR MÊS" : "EVOLUÇÃO DO SALDO ACUMULADO"}
        </div>
        <div style={{ display: "flex", border: "1px solid var(--line)" }}>
          {[
            ["mes", "Por mês"],
            ["acumulado", "Acumulado"],
          ].map(([key, label]) => (
            <button
              key={key}
              onClick={() => setMode(key)}
              className="cdc-tab"
              style={{
                padding: "6px 12px",
                border: "none",
                cursor: "pointer",
                fontSize: 11,
                fontWeight: 600,
                background: mode === key ? "var(--ink)" : "#fff",
                color: mode === key ? "var(--paper)" : "var(--ink-soft)",
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={200}>
        {mode === "mes" ? (
          <BarChart data={monthly} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid stroke={COLORS.line} strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: COLORS.inkSoft }} axisLine={{ stroke: COLORS.line }} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: COLORS.inkSoft }} axisLine={false} tickLine={false} width={44} tickFormatter={shortAxis} />
            <Tooltip
              formatter={(value, name) => [formatBRL(value), name === "receitas" ? "Entradas" : "Saídas"]}
              labelFormatter={(l) => `Mês de ${l}`}
              contentStyle={tooltipStyle}
              cursor={{ fill: "rgba(27,42,61,0.05)" }}
            />
            <Legend
              wrapperStyle={{ fontSize: 11, paddingTop: 4 }}
              formatter={(v) => (v === "receitas" ? "Entradas" : "Saídas")}
            />
            <Bar dataKey="receitas" fill={COLORS.income} radius={[2, 2, 0, 0]} maxBarSize={26} />
            <Bar dataKey="despesas" fill={COLORS.expense} radius={[2, 2, 0, 0]} maxBarSize={26} />
          </BarChart>
        ) : (
          <LineChart data={acumulado} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid stroke={COLORS.line} strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: COLORS.inkSoft }} axisLine={{ stroke: COLORS.line }} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: COLORS.inkSoft }} axisLine={false} tickLine={false} width={44} tickFormatter={shortAxis} />
            <Tooltip
              formatter={(value) => [formatBRL(value), "Saldo acumulado"]}
              labelFormatter={(l) => `Até ${l}`}
              contentStyle={tooltipStyle}
            />
            <Line type="monotone" dataKey="saldo" stroke={COLORS.gold} strokeWidth={2} dot={{ r: 3, fill: COLORS.ink }} activeDot={{ r: 5 }} />
          </LineChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
