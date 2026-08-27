import React, { useState, useMemo } from "react";
import { AlertCircle } from "lucide-react";

function formatBRL(value) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function PendingSummary({ entries, debts }) {
  const [untilDate, setUntilDate] = useState("");

  const pendingEntries = useMemo(
    () => entries.filter((e) => e.type === "despesa" && (e.status || "pago") === "pendente"),
    [entries]
  );

  const totalPendenteGeral = useMemo(
    () => pendingEntries.reduce((s, e) => s + e.amount, 0),
    [pendingEntries]
  );

  const totalAteAData = useMemo(() => {
    if (!untilDate) return null;
    return pendingEntries.filter((e) => e.date <= untilDate).reduce((s, e) => s + e.amount, 0);
  }, [pendingEntries, untilDate]);

  const totalDividasRestante = useMemo(() => {
    return debts.reduce((sum, debt) => {
      const paid = entries.filter((e) => e.debtId === debt.id).reduce((s, e) => s + e.amount, 0);
      return sum + Math.max(debt.totalAmount - paid, 0);
    }, 0);
  }, [debts, entries]);

  if (totalPendenteGeral === 0 && totalDividasRestante === 0) return null;

  return (
    <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
      {totalDividasRestante > 0 && (
        <div style={{ flex: "1 1 200px", border: "1px solid var(--gold)", padding: "14px 16px", background: "rgba(176,138,52,0.08)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--gold)", marginBottom: 6 }}>
            <AlertCircle size={15} />
            <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.06em" }}>DÍVIDAS EM ABERTO</span>
          </div>
          <div className="mono" style={{ fontSize: 19, fontWeight: 700 }}>{formatBRL(totalDividasRestante)}</div>
        </div>
      )}

      {totalPendenteGeral > 0 && (
        <div style={{ flex: "1 1 260px", border: "1px solid var(--expense)", padding: "14px 16px", background: "rgba(180,67,42,0.06)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8, flexWrap: "wrap", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--expense)" }}>
              <AlertCircle size={15} />
              <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.06em" }}>CONTAS PENDENTES</span>
            </div>
            <input
              type="date"
              value={untilDate}
              onChange={(e) => setUntilDate(e.target.value)}
              className="mono"
              style={{ fontSize: 11, padding: "3px 6px", border: "1px solid var(--line)", background: "var(--paper)" }}
            />
          </div>
          <div className="mono" style={{ fontSize: 19, fontWeight: 700 }}>
            {formatBRL(untilDate ? totalAteAData : totalPendenteGeral)}
          </div>
          <div style={{ fontSize: 11, color: "var(--ink-soft)", marginTop: 2 }}>
            {untilDate ? `a pagar até ${untilDate.split("-").reverse().join("/")}` : "a pagar no total"}
          </div>
        </div>
      )}
    </div>
  );
}
