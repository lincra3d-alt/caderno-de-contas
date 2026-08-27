import React, { useState } from "react";
import { X, Trash2, CheckCircle2, Circle, Share2, Check, Pencil, Save } from "lucide-react";
import { db } from "../firebase";
import { doc, setDoc } from "firebase/firestore";
import { formatBRL, formatDateFull } from "../lib/theme";
import CategoryIcon from "../lib/categoryIcons";

export default function TransactionModal({ entry, allEntries, debts, categories, onClose, onTogglePaid, onDelete, onUpdate }) {
  const [shareState, setShareState] = useState("idle"); // idle | busy | copied | error
  const [editing, setEditing] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [form, setForm] = useState(null);

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

  function startEdit() {
    setForm({
      desc: entry.desc,
      amount: String(entry.amount).replace(".", ","),
      category: entry.category,
      date: entry.date,
      type: entry.type,
    });
    setEditing(true);
  }

  async function saveEdit(ev) {
    ev.preventDefault();
    const value = parseFloat(String(form.amount).replace(",", "."));
    if (!form.desc.trim() || !value || value <= 0) return;
    setSavingEdit(true);
    await onUpdate(entry.id, {
      desc: form.desc.trim(),
      amount: value,
      category: form.category,
      date: form.date,
      type: form.type,
    });
    setSavingEdit(false);
    setEditing(false);
  }

  async function handleShare() {
    if (!group) return;
    setShareState("busy");
    const baseDesc = entry.desc.replace(/\s*\(\d+\/\d+\)$/, "");
    try {
      await setDoc(doc(db, "shares", entry.installmentGroupId), {
        desc: baseDesc,
        installmentTotal: entry.installmentTotal,
        parcelaAmount: entry.amount,
        parcelas: group.map((g) => ({ index: g.installmentIndex, date: g.date, status: g.status || "pago" })),
        sharedByName: entry.authorName || null,
        updatedAt: Date.now(),
      });
      const url = `${window.location.origin}/share/${entry.installmentGroupId}`;
      await navigator.clipboard.writeText(url);
      setShareState("copied");
      setTimeout(() => setShareState("idle"), 2500);
    } catch (err) {
      console.error(err);
      setShareState("error");
    }
  }

  const secondaryBtn = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: "10px 14px",
    border: "1px solid var(--line)",
    background: "#fff",
    color: "var(--ink)",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
  };

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
          maxHeight: "90vh",
          overflowY: "auto",
          padding: 24,
          position: "relative",
        }}
      >
        <button onClick={onClose} style={{ position: "absolute", top: 14, right: 14, border: "none", background: "none", cursor: "pointer", color: "var(--ink-soft)" }}>
          <X size={18} />
        </button>

        {editing ? (
          <form onSubmit={saveEdit}>
            <div style={{ fontSize: 11, letterSpacing: "0.08em", color: "var(--ink-soft)", marginBottom: 14 }}>
              EDITANDO LANÇAMENTO
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 11, color: "var(--ink-soft)", marginBottom: 4 }}>Descrição</div>
                <input
                  className="cdc-field"
                  type="text"
                  value={form.desc}
                  autoFocus
                  onChange={(e) => setForm({ ...form, desc: e.target.value })}
                />
              </div>

              <div style={{ display: "flex", gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, color: "var(--ink-soft)", marginBottom: 4 }}>Valor</div>
                  <input
                    className="cdc-field mono"
                    type="text"
                    inputMode="decimal"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, color: "var(--ink-soft)", marginBottom: 4 }}>Data</div>
                  <input
                    className="cdc-field mono"
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <div style={{ fontSize: 11, color: "var(--ink-soft)", marginBottom: 4 }}>Categoria</div>
                <select
                  className="cdc-field"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                >
                  {(categories || []).map((c) => (<option key={c} value={c}>{c}</option>))}
                  {!(categories || []).includes(form.category) && <option value={form.category}>{form.category}</option>}
                </select>
              </div>

              <div>
                <div style={{ fontSize: 11, color: "var(--ink-soft)", marginBottom: 4 }}>Tipo</div>
                <div style={{ display: "flex", border: "1px solid var(--line)", width: "fit-content" }}>
                  <button type="button" onClick={() => setForm({ ...form, type: "despesa" })} className="cdc-toggle"
                    style={{ padding: "8px 16px", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, background: form.type === "despesa" ? "var(--expense)" : "#fff", color: form.type === "despesa" ? "#fff" : "var(--ink-soft)" }}>
                    Saída
                  </button>
                  <button type="button" onClick={() => setForm({ ...form, type: "receita" })} className="cdc-toggle"
                    style={{ padding: "8px 16px", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, background: form.type === "receita" ? "var(--income)" : "#fff", color: form.type === "receita" ? "#fff" : "var(--ink-soft)" }}>
                    Entrada
                  </button>
                </div>
              </div>
            </div>

            {group && (
              <div style={{ fontSize: 11, color: "var(--ink-soft)", marginBottom: 14, lineHeight: 1.5 }}>
                Atenção: isso altera somente esta parcela. As outras parcelas continuam como estão.
              </div>
            )}

            <div style={{ display: "flex", gap: 8 }}>
              <button type="submit" disabled={savingEdit} className="cdc-btn"
                style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "10px 14px", border: "none", background: "var(--ink)", color: "var(--paper)", fontSize: 13, fontWeight: 600, cursor: savingEdit ? "default" : "pointer", opacity: savingEdit ? 0.6 : 1 }}>
                <Save size={15} /> {savingEdit ? "Salvando..." : "Salvar alterações"}
              </button>
              <button type="button" onClick={() => setEditing(false)} className="cdc-btn" style={{ ...secondaryBtn, flex: "0 0 auto" }}>
                Cancelar
              </button>
            </div>
          </form>
        ) : (
          <>
            <div style={{ fontSize: 11, letterSpacing: "0.08em", color: "var(--ink-soft)", marginBottom: 8 }}>
              {entry.type === "receita" ? "ENTRADA" : "SAÍDA"} · {formatDateFull(entry.date)}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 6 }}>
              <CategoryIcon category={entry.category} size={38} iconSize={19} />
              <div style={{ minWidth: 0 }}>
                <h2 style={{ fontSize: 19, fontWeight: 700, margin: 0, color: "var(--ink)" }}>{entry.desc}</h2>
                <div style={{ fontSize: 13, color: "var(--ink-soft)" }}>
                  {entry.category}{entry.authorName ? ` · lançado por ${entry.authorName}` : ""}
                </div>
              </div>
            </div>

            <div
              className="mono"
              style={{
                fontSize: 26,
                fontWeight: 700,
                color: entry.type === "receita" ? "var(--income)" : "var(--expense)",
                margin: "14px 0 18px",
              }}
            >
              {entry.type === "receita" ? "+" : "−"}{formatBRL(entry.amount)}
            </div>

            {group && (
              <div style={{ border: "1px solid var(--line)", padding: 14, marginBottom: 16, background: "rgba(255,255,255,0.5)" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8, gap: 8, flexWrap: "wrap" }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-soft)" }}>
                    PARCELA {entry.installmentIndex} DE {entry.installmentTotal}
                  </div>
                  <button
                    onClick={handleShare}
                    disabled={shareState === "busy"}
                    className="cdc-btn"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 5,
                      border: "1px solid var(--line)",
                      background: shareState === "copied" ? "var(--income)" : "#fff",
                      color: shareState === "copied" ? "#fff" : "var(--ink)",
                      padding: "5px 10px",
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: shareState === "busy" ? "default" : "pointer",
                    }}
                  >
                    {shareState === "copied" ? <Check size={12} /> : <Share2 size={12} />}
                    {shareState === "copied" ? "Link copiado!" : "Compartilhar"}
                  </button>
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
                {shareState === "error" && (
                  <div style={{ marginTop: 8, fontSize: 11, color: "var(--expense)" }}>Não foi possível gerar o link. Tente novamente.</div>
                )}
                {shareState === "copied" && (
                  <div style={{ marginTop: 8, fontSize: 11, color: "var(--ink-soft)" }}>
                    Envie esse link para quem você quer que acompanhe. Não precisa de login, e atualiza sozinho conforme as parcelas forem pagas.
                  </div>
                )}
              </div>
            )}

            {debt && (
              <div style={{ border: "1px solid var(--line)", padding: 14, marginBottom: 16, background: "rgba(255,255,255,0.5)" }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-soft)", marginBottom: 8 }}>
                  PAGAMENTO DA DESPESA: {debt.desc.toUpperCase()}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                  <span>Valor total da despesa</span>
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

            <button onClick={startEdit} className="cdc-btn" style={{ ...secondaryBtn, width: "100%", marginBottom: 10 }}>
              <Pencil size={15} /> Editar lançamento
            </button>

            <button
              onClick={() => onDelete(entry.id)}
              className="cdc-btn"
              style={{ ...secondaryBtn, width: "100%", background: "none", color: "var(--expense)" }}
            >
              <Trash2 size={15} /> Excluir lançamento
            </button>
          </>
        )}
      </div>
    </div>
  );
}
