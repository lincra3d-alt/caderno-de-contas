import React, { useState, useMemo } from "react";
import { AlertCircle } from "lucide-react";
import { formatBRL, monthLabel } from "../lib/theme";

// Último dia do mês, para fechar a conta do período sem cortar nada.
function fimDoMes(monthKey) {
  const [y, m] = monthKey.split("-").map(Number);
  const last = new Date(y, m, 0).getDate();
  return `${monthKey}-${String(last).padStart(2, "0")}`;
}

export default function PendingSummary({ entries, debts, selectedMonth }) {
  const [untilDate, setUntilDate] = useState("");

  const pendingEntries = useMemo(
    () => entries.filter((e) => e.type === "despesa" && (e.status || "pago") === "pendente"),
    [entries]
  );

  // Por padrão só conta até o fim do mês escolhido. Somar tudo que está lançado
  // para frente daria um número enorme e sem sentido quando existem despesas
  // fixas, que se repetem sem fim.
  const limite = untilDate || fimDoMes(selectedMonth || new Date().toISOString().slice(0, 7));

  const totalNoPeriodo = useMemo(
    () => pendingEntries.filter((e) => e.date <= limite).reduce((s, e) => s + e.amount, 0),
    [pendingEntries, limite]
  );

  const totalFuturo = useMemo(
    () => pendingEntries.filter((e) => e.date > limite).reduce((s, e) => s + e.amount, 0),
    [pendingEntries, limite]
  );

  // Cartões de crédito não entram aqui: eles têm a própria seção de fatura.
  const totalDividasRestante = useMemo(() => {
    return debts
      .filter((d) => d.tipo !== "cartao" && d.totalAmount > 0)
      .reduce((sum, debt) => {
        const paid = entries.filter((e) => e.debtId === debt.id).reduce((s, e) => s + e.amount, 0);
        return sum + Math.max(debt.totalAmount - paid, 0);
      }, 0);
  }, [debts, entries]);

  if (pendingEntries.length === 0 && totalDividasRestante === 0) return null;

  return (
    <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
      {totalDividasRestante > 0 && (
        <div style={{ flex: "1 1 200px", border: "1px solid var(--gold)", padding: "14px 16px", background: "rgba(176,138,52,0.08)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--gold)", marginBottom: 6 }}>
            <AlertCircle size={15} />
            <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.06em" }}>DESPESAS EM ABERTO</span>
          </div>
          <div className="mono" style={{ fontSize: 19, fontWeight: 700 }}>{formatBRL(totalDividasRestante)}</div>
        </div>
      )}

      {pendingEntries.length > 0 && (
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
            {formatBRL(totalNoPeriodo)}
          </div>
          <div style={{ fontSize: 11, color: "var(--ink-soft)", marginTop: 2 }}>
            {untilDate
              ? `a pagar até ${untilDate.split("-").reverse().join("/")}`
              : `a pagar até o fim de ${monthLabel(selectedMonth || new Date().toISOString().slice(0, 7))}`}
          </div>
          {totalFuturo > 0 && (
            <div style={{ fontSize: 11, color: "var(--ink-soft)", marginTop: 6, paddingTop: 6, borderTop: "1px dotted var(--line)" }}>
              Depois dessa data já tem mais <strong className="mono">{formatBRL(totalFuturo)}</strong> lançado.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
