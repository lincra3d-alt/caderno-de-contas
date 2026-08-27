import React, { useState, useMemo } from "react";
import { Plus, ChevronDown, ChevronUp } from "lucide-react";
import { db } from "../firebase";
import { collection, addDoc } from "firebase/firestore";
import { formatBRL } from "../lib/theme";
import CategoryIcon from "../lib/categoryIcons";

// A coleção no banco continua se chamando "dividas" para não perder o que
// já foi cadastrado. Só os textos da tela falam em despesas.
export default function DebtsSection({ householdId, user, categories, debts, entries }) {
  const [showForm, setShowForm] = useState(false);
  const [desc, setDesc] = useState("");
  const [total, setTotal] = useState("");
  const [category, setCategory] = useState(categories[0] || "Outros");
  const [openDebtId, setOpenDebtId] = useState(null);
  const [payAmount, setPayAmount] = useState("");
  const [payDate, setPayDate] = useState(() => new Date().toISOString().slice(0, 10));

  const paidByDebt = useMemo(() => {
    const map = {};
    entries.forEach((e) => {
      if (e.debtId) {
        map[e.debtId] = (map[e.debtId] || 0) + e.amount;
      }
    });
    return map;
  }, [entries]);

  async function handleCreateDebt(e) {
    e.preventDefault();
    const value = parseFloat(total.replace(",", "."));
    if (!desc.trim() || !value || value <= 0) return;
    await addDoc(collection(db, "households", householdId, "dividas"), {
      desc: desc.trim(),
      totalAmount: value,
      category,
      createdAt: Date.now(),
      addedBy: user.uid,
      authorName: user.displayName,
    });
    setDesc("");
    setTotal("");
    setShowForm(false);
  }

  async function handlePay(debt) {
    const value = parseFloat(payAmount.replace(",", "."));
    if (!value || value <= 0) return;
    await addDoc(collection(db, "households", householdId, "lancamentos"), {
      desc: `Pagamento: ${debt.desc}`,
      amount: value,
      type: "despesa",
      category: debt.category,
      date: payDate,
      addedBy: user.uid,
      authorName: user.displayName,
      authorPhoto: user.photoURL,
      debtId: debt.id,
    });
    setPayAmount("");
    setOpenDebtId(null);
  }

  return (
    <div style={{ marginBottom: 34 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.08em", color: "var(--ink-soft)" }}>
          DESPESAS E CONTAS A PAGAR
        </div>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="cdc-btn"
          style={{ display: "flex", alignItems: "center", gap: 4, border: "none", background: "none", color: "var(--ink)", cursor: "pointer", fontSize: 12, fontWeight: 600 }}
        >
          <Plus size={14} /> Nova despesa
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreateDebt} style={{ border: "1px dashed var(--line)", padding: 14, marginBottom: 14, background: "rgba(255,255,255,0.4)", display: "flex", gap: 10, flexWrap: "wrap" }}>
          <input
            type="text"
            placeholder="Descrição (ex: Cartão de crédito)"
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            style={{ flex: "2 1 180px", padding: "8px 10px", border: "1px solid var(--line)", background: "var(--paper)", fontSize: 13 }}
          />
          <input
            type="text"
            inputMode="decimal"
            placeholder="Valor total"
            value={total}
            onChange={(e) => setTotal(e.target.value)}
            className="mono"
            style={{ flex: "1 1 100px", padding: "8px 10px", border: "1px solid var(--line)", background: "var(--paper)", fontSize: 13 }}
          />
          <select value={category} onChange={(e) => setCategory(e.target.value)} style={{ padding: "8px 10px", border: "1px solid var(--line)", background: "var(--paper)", fontSize: 13 }}>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <button type="submit" className="cdc-btn" style={{ border: "none", background: "var(--ink)", color: "var(--paper)", padding: "8px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            Criar
          </button>
        </form>
      )}

      {debts.length === 0 ? (
        <div style={{ padding: "20px 16px", textAlign: "center", color: "var(--ink-soft)", border: "1px dashed var(--line)", fontSize: 13 }}>
          Nenhuma despesa cadastrada.
        </div>
      ) : (
        debts.map((debt) => {
          const paid = paidByDebt[debt.id] || 0;
          const remaining = Math.max(debt.totalAmount - paid, 0);
          const pct = Math.min((paid / debt.totalAmount) * 100, 100);
          const isOpen = openDebtId === debt.id;
          const isDone = remaining <= 0;
          return (
            <div key={debt.id} className="cdc-card" style={{ padding: "12px 14px", marginBottom: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, cursor: "pointer" }} onClick={() => setOpenDebtId(isOpen ? null : debt.id)}>
                <div style={{ display: "flex", alignItems: "center", gap: 11, minWidth: 0 }}>
                  <CategoryIcon category={debt.category} size={34} iconSize={17} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{debt.desc}</div>
                    <div style={{ fontSize: 11, color: "var(--ink-soft)" }}>{debt.category}</div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flex: "0 0 auto" }}>
                  <div style={{ textAlign: "right" }}>
                    <div className="mono" style={{ fontSize: 13, fontWeight: 600, color: isDone ? "var(--income)" : "var(--expense)" }}>
                      {isDone ? "Quitado" : `Falta ${formatBRL(remaining)}`}
                    </div>
                    <div className="mono" style={{ fontSize: 11, color: "var(--ink-soft)" }}>
                      {formatBRL(paid)} de {formatBRL(debt.totalAmount)}
                    </div>
                  </div>
                  {isOpen ? <ChevronUp size={16} color="var(--ink-soft)" /> : <ChevronDown size={16} color="var(--ink-soft)" />}
                </div>
              </div>

              <div style={{ height: 6, background: "var(--line)", marginTop: 10, borderRadius: 3, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${pct}%`, background: isDone ? "var(--income)" : "var(--gold)" }} />
              </div>

              {isOpen && !isDone && (
                <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="Valor do pagamento"
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                    className="mono"
                    style={{ flex: "1 1 120px", padding: "7px 10px", border: "1px solid var(--line)", background: "var(--paper)", fontSize: 12 }}
                  />
                  <input
                    type="date"
                    value={payDate}
                    onChange={(e) => setPayDate(e.target.value)}
                    className="mono"
                    style={{ flex: "1 1 120px", padding: "7px 10px", border: "1px solid var(--line)", background: "var(--paper)", fontSize: 12 }}
                  />
                  <button
                    onClick={() => handlePay(debt)}
                    className="cdc-btn"
                    style={{ border: "none", background: "var(--income)", color: "#fff", padding: "7px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
                  >
                    Registrar pagamento
                  </button>
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
