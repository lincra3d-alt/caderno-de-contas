import React, { useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

function formatBRL(value) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function monthLabel(key) {
  const [y, m] = key.split("-");
  const names = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  return `${names[parseInt(m, 10) - 1]}/${y.slice(2)}`;
}

export default function BalanceChart({ entries }) {
  const data = useMemo(() => {
    if (entries.length === 0) return [];
    const byMonth = {};
    entries.forEach((e) => {
      const key = e.date.slice(0, 7);
      if (!byMonth[key]) byMonth[key] = 0;
      byMonth[key] += e.type === "receita" ? e.amount : -e.amount;
    });
    const sortedKeys = Object.keys(byMonth).sort();
    let running = 0;
    return sortedKeys.map((key) => {
      running += byMonth[key];
      return { month: monthLabel(key), saldo: Math.round(running * 100) / 100 };
    });
  }, [entries]);

  if (data.length < 2) return null;

  return (
    <div style={{ border: "1px solid var(--line)", padding: "16px 16px 8px", marginBottom: 24, background: "rgba(255,255,255,0.35)" }}>
      <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.08em", color: "var(--ink-soft)", marginBottom: 10 }}>
        EVOLUÇÃO DO SALDO
      </div>
      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="var(--line)" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#4C5C6E" }} axisLine={{ stroke: "#AEBBC8" }} tickLine={false} />
          <YAxis
            tick={{ fontSize: 10, fill: "#4C5C6E" }}
            axisLine={false}
            tickLine={false}
            width={54}
            tickFormatter={(v) => formatBRL(v).replace("R$", "").trim()}
          />
          <Tooltip
            formatter={(value) => formatBRL(value)}
            contentStyle={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, border: "1px solid #AEBBC8", background: "#E4EAF0" }}
          />
          <Line type="monotone" dataKey="saldo" stroke="#B08A34" strokeWidth={2} dot={{ r: 3, fill: "#1B2A3D" }} activeDot={{ r: 5 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
