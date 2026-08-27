import React from "react";
import { X, Trash2, CheckCircle2, Circle } from "lucide-react";

function formatBRL(value) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDateFull(iso) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export default function TransactionModal({ entry, allEntries, debts, onClose, onTogglePaid, onDelete }) {
  if (!entry) return null;

  const isPaid = (entry.status || "pago") === "pago";

  const group = entry.installmentGroupId
    ? allEntries.filter((e) => e.installmentGroupId === entry.installmentGroupId).sort((a, b) => a.installmentIndex - b.installmentIndex)
    : null;

  const totalCompra = group ? entry.amount * entry.installmentTotal : null;
  const parcelasPagas = group ? group.filter((g) => (g.status || "pago") === "pago").length : null;
  const faltaCompra = group ? totalCompra - parcelasPagas * entry.amount : null;

  const debt = entry.debtId ? debts.find((d) => d.id === entry.debtId) : null;
  const debtPaid = debt
    ? allEntries.filter((e) => e.debtId === debt.id).reduce((s, e) => s + e.amount, 0)
    : null;
  const debtRemaining = debt ? Math.max(debt.totalAmount - debtPaid, 0) : null;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(27,42,61,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--paper)",
          border: "1px solid var(--line)",
          boxShadow: "0 12px 32px rgba(27,42,61,0.25)",
          maxWidth: 420,
          width: "100%",
          padding: 24,
          position: "relative",
        }}
      >
        <button onClick={onClose} style={{ position: "absolute", top: 14, right: 14, border: "none", background: "none", cursor: "pointer", color: "var(--ink-soft)" }}>
          <X size={18} />
        </button>

        <div style={{ fontSize: 11, letterSpacing: "0.08em", color: "var(--ink-soft)", marginBottom: 4 }}>
          {entry.type === "receita" ? "ENTRADA" : "SAÍDA"} · {formatDateFull(entry.date)}
        </div>
        <h2 style={{ fontSize: 19, fontWeight: 700, margin: "0 0 4px", color: "var(--ink)" }}>{entry.desc}</h2>
        <div style={{ fontSize: 13, color: "var(--ink-soft)", marginBottom: 16 }}>{entry.category}{entry.authorName ? ` · lançado por ${entry.authorName}` : ""}</div>

        <div
          className="mono"
          style={{
            fontSize: 26,
            fontWeight: 700,
            color: entry.type === "receita" ? "var(--income)" : "var(--expense)",
            marginBottom: 18,
          }}
        >
          {entry.type === "receita" ? "+" : "−"}{formatBRL(entry.amount)}
        </div>

        {group && (
          <div style={{ border: "1px solid var(--line)", padding: 14, marginBottom: 16, background: "rgba(255,255,255,0.5)" }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-soft)", marginBottom: 8 }}>
              PARCELA {entry.installmentIndex} DE {entry.installmentTotal}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
              <span>Valor total da compra</span>
              <span className="mono" style={{ fontWeight: 600 }}>{formatBRL(totalCompra)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
              <span>Já pago ({parcelasPagas}x)</span>
              <span className="mono" style={{ fontWeight: 600, color: "var(--income)" }}>{formatBRL(parcelasPagas * entry.amount)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
              <span>Falta quitar</span>
              <span className="mono" style={{ fontWeight: 600, color: faltaCompra > 0 ? "var(--expense)" : "var(--income)" }}>{formatBRL(faltaCompra)}</span>
            </div>
          </div>
        )}

        {debt && (
          <div style={{ border: "1px solid var(--line)", padding: 14, marginBottom: 16, background: "rgba(255,255,255,0.5)" }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-soft)", marginBottom: 8 }}>
              PAGAMENTO DA DÍVIDA: {debt.desc.toUpperCase()}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
              <span>Valor total da dívida</span>
              <span className="mono" style={{ fontWeight: 600 }}>{formatBRL(debt.totalAmount)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
              <span>Falta quitar</span>
              <span className="mono" style={{ fontWeight: 600, color: debtRemaining > 0 ? "var(--expense)" : "var(--income)" }}>{formatBRL(debtRemaining)}</span>
            </div>
          </div>
        )}

        {entry.type === "despesa" && (
          <button
            onClick={() => onTogglePaid(entry.id, isPaid ? "pendente" : "pago")}
            className="cdc-btn"
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              padding: "10px 14px",
              border: `1px solid ${isPaid ? "var(--line)" : "var(--income)"}`,
              background: isPaid ? "#fff" : "var(--income)",
              color: isPaid ? "var(--ink-soft)" : "#fff",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              marginBottom: 10,
            }}
          >
            {isPaid ? <Circle size={15} /> : <CheckCircle2 size={15} />}
            {isPaid ? "Marcar como pendente" : "Marcar como paga"}
          </button>
        )}

        <button
          onClick={() => onDelete(entry.id)}
          className="cdc-btn"
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            padding: "10px 14px",
            border: "1px solid var(--line)",
            background: "none",
            color: "var(--expense)",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          <Trash2 size={15} /> Excluir lançamento
        </button>
      </div>
    </div>
  );
}
