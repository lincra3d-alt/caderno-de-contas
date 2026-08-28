import React, { useState } from "react";
import { X, Trash2, CheckCircle2, Circle, Share2, Check, Pencil, Save, Repeat, CircleSlash } from "lucide-react";
import { db } from "../firebase";
import { doc, setDoc } from "firebase/firestore";
import { formatBRL, formatDateFull } from "../lib/theme";
import CategoryIcon from "../lib/categoryIcons";

const SCOPES = [
  ["este", "Só este mês"],
  ["futuros", "Este e os próximos"],
  ["todos", "Todos os meses"],
];

function ScopePicker({ value, onChange, label }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 11, color: "var(--ink-soft)", marginBottom: 5 }}>{label}</div>
      <div style={{ display: "flex", border: "1px solid var(--line)", width: "fit-content", maxWidth: "100%", flexWrap: "wrap" }}>
        {SCOPES.map(([key, text]) => (
          <button
            key={key}
            type="button"
            onClick={() => onChange(key)}
            className="cdc-toggle"
            style={{
              padding: "7px 11px",
              border: "none",
              cursor: "pointer",
              fontSize: 11,
              fontWeight: 600,
              background: value === key ? "var(--ink)" : "#fff",
              color: value === key ? "var(--paper)" : "var(--ink-soft)",
            }}
          >
            {text}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function TransactionModal({ entry, allEntries, debts, categories, onClose, onTogglePaid, onDelete, onUpdate, onEndRecurring, onExtendRecurring, onConvertToFixed }) {
  const [shareState, setShareState] = useState("idle"); // idle | busy | copied | error
  const [editing, setEditing] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [form, setForm] = useState(null);
  const [editScope, setEditScope] = useState("este");
  const [deleteScope, setDeleteScope] = useState("este");
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [working, setWorking] = useState(false);

  if (!entry) return null;

  const isPaid = (entry.status || "pago") === "pago";

  const group = entry.installmentGroupId
    ? allEntries.filter((e) => e.installmentGroupId === entry.installmentGroupId).sort((a, b) => a.installmentIndex - b.installmentIndex)
    : null;

  const totalCompra = group ? entry.amount * entry.installmentTotal : null;
  const parcelasPagas = group ? group.filter((g) => (g.status || "pago") === "pago").length : null;
  const faltaCompra = group ? totalCompra - parcelasPagas * entry.amount : null;

  const fixa = entry.recurringGroupId
    ? allEntries.filter((e) => e.recurringGroupId === entry.recurringGroupId).sort((a, b) => a.date.localeCompare(b.date))
    : null;
  const fixaPagas = fixa ? fixa.filter((e) => (e.status || "pago") === "pago").length : 0;
  const fixaUltima = fixa && fixa.length ? fixa[fixa.length - 1].date : null;
  const mesesRestantes = fixa ? fixa.filter((e) => e.date > entry.date).length : 0;

  const debt = entry.debtId ? debts.find((d) => d.id === entry.debtId) : null;
  const debtPaid = debt
    ? allEntries.filter((e) => e.debtId === debt.id).reduce((s, e) => s + e.amount, 0)
    : null;
  const debtRemaining = debt ? Math.max(debt.totalAmount - debtPaid, 0) : null;

  const emGrupo = Boolean(group || fixa);
  const tamanhoGrupo = group ? group.length : fixa ? fixa.length : 1;
  const quantosNoEscopo = (escopo) => {
    if (!emGrupo) return 1;
    const lista = group || fixa;
    if (escopo === "todos") return lista.length;
    if (escopo === "futuros") return lista.filter((e) => e.date >= entry.date).length;
    return 1;
  };

  function startEdit() {
    setForm({
      // Na parcelada a numeração fica fora do campo, senão o usuário teria
      // que reescrever o "(2/6)" na mão.
      desc: group ? entry.desc.replace(/\s*\(\d+\/\d+\)$/, "") : entry.desc,
      amount: String(entry.amount).replace(".", ","),
      category: entry.category,
      date: entry.date,
      type: entry.type,
    });
    setEditScope("este");
    setEditing(true);
  }

  async function saveEdit(ev) {
    ev.preventDefault();
    const value = parseFloat(String(form.amount).replace(",", "."));
    if (!form.desc.trim() || !value || value <= 0) return;
    setSavingEdit(true);
    await onUpdate(
      entry.id,
      {
        desc: form.desc.trim(),
        amount: value,
        category: form.category,
        date: form.date,
        type: form.type,
      },
      emGrupo ? editScope : "este"
    );
    setSavingEdit(false);
    setEditing(false);
  }

  async function confirmDelete() {
    setWorking(true);
    await onDelete(entry.id, emGrupo ? deleteScope : "este");
    setWorking(false);
  }

  async function convertToFixed() {
    const ok = window.confirm(
      group
        ? `Transformar "${entry.desc.replace(/\s*\(\d+\/\d+\)$/, "")}" em despesa fixa?\n\nAs parcelas a partir de agora saem, e no lugar entra uma despesa que se repete todo mês pelo mesmo valor.`
        : `Transformar "${entry.desc}" em despesa fixa, repetindo todo mês pelo mesmo valor?`
    );
    if (!ok) return;
    setWorking(true);
    await onConvertToFixed(entry);
    setWorking(false);
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

            {emGrupo && (
              <>
                <ScopePicker
                  value={editScope}
                  onChange={setEditScope}
                  label={group ? "Aplicar a alteração em:" : "Aplicar em:"}
                />
                <div style={{ fontSize: 11, color: "var(--ink-soft)", marginBottom: 14, lineHeight: 1.5 }}>
                  Vai alterar <strong>{quantosNoEscopo(editScope)}</strong> de {tamanhoGrupo}{" "}
                  {group ? "parcelas" : "meses"}.
                  {editScope !== "este" && " A data continua a do mês de cada lançamento."}
                </div>
              </>
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

            {fixa && (
              <div style={{ border: "1px solid var(--line)", padding: 14, marginBottom: 16, background: "rgba(255,255,255,0.5)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, color: "var(--ink-soft)", marginBottom: 8 }}>
                  <Repeat size={13} /> DESPESA FIXA, TODO MÊS
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                  <span>Valor por mês</span>
                  <span className="mono" style={{ fontWeight: 600 }}>{formatBRL(entry.amount)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                  <span>Meses já pagos</span>
                  <span className="mono" style={{ fontWeight: 600, color: "var(--income)" }}>{fixaPagas}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                  <span>Lançada até</span>
                  <span className="mono" style={{ fontWeight: 600 }}>{fixaUltima ? formatDateFull(fixaUltima) : "?"}</span>
                </div>

                {mesesRestantes <= 2 && (
                  <div style={{ marginTop: 10, fontSize: 11, color: "var(--gold)", lineHeight: 1.5 }}>
                    Está chegando ao fim dos meses lançados. Estenda para continuar aparecendo.
                  </div>
                )}

                <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                  <button
                    onClick={() => onExtendRecurring(entry)}
                    className="cdc-btn"
                    style={{ display: "flex", alignItems: "center", gap: 6, border: "1px solid var(--line)", background: "#fff", color: "var(--ink)", padding: "7px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
                  >
                    <Repeat size={13} /> Estender 12 meses
                  </button>
                  <button
                    onClick={() => onEndRecurring(entry)}
                    className="cdc-btn"
                    style={{ display: "flex", alignItems: "center", gap: 6, border: "1px solid var(--line)", background: "#fff", color: "var(--expense)", padding: "7px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
                  >
                    <CircleSlash size={13} /> Encerrar daqui em diante
                  </button>
                </div>
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

            {entry.type === "despesa" && !fixa && (
              <button
                onClick={convertToFixed}
                disabled={working}
                className="cdc-btn"
                style={{ ...secondaryBtn, width: "100%", marginBottom: 10 }}
              >
                <Repeat size={15} /> Transformar em despesa fixa
              </button>
            )}

            {!confirmingDelete ? (
              <button
                onClick={() => { setDeleteScope("este"); setConfirmingDelete(true); }}
                className="cdc-btn"
                style={{ ...secondaryBtn, width: "100%", background: "none", color: "var(--expense)" }}
              >
                <Trash2 size={15} /> Excluir lançamento
              </button>
            ) : (
              <div style={{ border: "1px solid var(--expense)", padding: 14, background: "rgba(180,67,42,0.06)" }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--expense)", marginBottom: 10 }}>
                  Excluir o quê?
                </div>

                {emGrupo && (
                  <ScopePicker value={deleteScope} onChange={setDeleteScope} label="Alcance da exclusão:" />
                )}

                <div style={{ fontSize: 11, color: "var(--ink-soft)", marginBottom: 12, lineHeight: 1.5 }}>
                  {emGrupo
                    ? `Vai apagar ${quantosNoEscopo(deleteScope)} de ${tamanhoGrupo} ${group ? "parcelas" : "meses"}. Não dá para desfazer.`
                    : "Esse lançamento vai sair do extrato. Não dá para desfazer."}
                </div>

                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={confirmDelete}
                    disabled={working}
                    className="cdc-btn"
                    style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "10px 14px", border: "none", background: "var(--expense)", color: "#fff", fontSize: 13, fontWeight: 600, cursor: working ? "default" : "pointer", opacity: working ? 0.6 : 1 }}
                  >
                    <Trash2 size={15} /> {working ? "Excluindo..." : "Confirmar exclusão"}
                  </button>
                  <button
                    onClick={() => setConfirmingDelete(false)}
                    className="cdc-btn"
                    style={{ ...secondaryBtn, flex: "0 0 auto" }}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
