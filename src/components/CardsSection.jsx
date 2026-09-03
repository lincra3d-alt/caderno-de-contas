import React, { useState, useMemo } from "react";
import { Plus, ChevronDown, ChevronUp, Trash2, CreditCard, CheckCircle2, Pencil } from "lucide-react";
import { db } from "../firebase";
import { collection, addDoc, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { formatBRL, formatDateShort, monthLabel } from "../lib/theme";
import CategoryIcon from "../lib/categoryIcons";

// A coleção no banco continua se chamando "dividas" para aproveitar as regras
// que já estão publicadas e não perder nada que já foi cadastrado.
// Documentos com tipo "cartao" são cartões de crédito. Os antigos, sem tipo,
// são as contas a quitar do modelo anterior.

// Em qual fatura a compra cai.
// O mês é decidido na hora de lançar e fica gravado em `faturaMes`, porque
// só ali dá para saber se foi uma compra nova (que o fechamento empurra para
// o mês seguinte) ou uma parcela, cuja data já é o mês dela.
// Lançamentos antigos, sem `faturaMes`, entram na fatura do próprio mês.
export function faturaDoLancamento(entry) {
  return entry.faturaMes || entry.date.slice(0, 7);
}

export default function CardsSection({ householdId, user, cards, entries, selectedMonth, onSelectEntry }) {
  const [showForm, setShowForm] = useState(false);
  const [nome, setNome] = useState("");
  const [limite, setLimite] = useState("");
  const [fechamento, setFechamento] = useState("");
  const [vencimento, setVencimento] = useState("");
  const [openId, setOpenId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [editForm, setEditForm] = useState(null);

  function abrirEdicao(card) {
    setEditForm({
      nome: card.nome,
      limite: card.limite ? String(card.limite).replace(".", ",") : "",
      fechamento: String(card.diaFechamento || ""),
      vencimento: String(card.diaVencimento || ""),
    });
    setEditandoId(card.id);
  }

  async function salvarEdicao(e, card) {
    e.preventDefault();
    if (!editForm.nome.trim()) return;
    const valor = parseFloat(String(editForm.limite).replace(",", "."));
    setBusy(true);
    await updateDoc(doc(db, "households", householdId, "dividas", card.id), {
      nome: editForm.nome.trim(),
      limite: valor > 0 ? valor : 0,
      diaFechamento: Math.min(28, Math.max(1, parseInt(editForm.fechamento, 10) || 1)),
      diaVencimento: Math.min(28, Math.max(1, parseInt(editForm.vencimento, 10) || 10)),
    });
    setBusy(false);
    setEditandoId(null);
  }

  const cartoes = useMemo(() => cards.filter((c) => c.tipo === "cartao"), [cards]);
  const legado = useMemo(() => cards.filter((c) => c.tipo !== "cartao"), [cards]);

  async function handleCreate(e) {
    e.preventDefault();
    const valor = parseFloat(String(limite).replace(",", "."));
    if (!nome.trim()) return;
    setBusy(true);
    await addDoc(collection(db, "households", householdId, "dividas"), {
      tipo: "cartao",
      nome: nome.trim(),
      limite: valor > 0 ? valor : 0,
      diaFechamento: Math.min(28, Math.max(1, parseInt(fechamento, 10) || 1)),
      diaVencimento: Math.min(28, Math.max(1, parseInt(vencimento, 10) || 10)),
      createdAt: Date.now(),
      addedBy: user.uid,
      authorName: user.displayName,
    });
    setNome("");
    setLimite("");
    setFechamento("");
    setVencimento("");
    setShowForm(false);
    setBusy(false);
  }

  async function handleDeleteCard(card) {
    const ok = window.confirm(
      `Excluir o cartão "${card.nome}"?\n\nOs lançamentos que você fez nele continuam no extrato, só deixam de ficar ligados a este cartão.`
    );
    if (!ok) return;
    await deleteDoc(doc(db, "households", householdId, "dividas", card.id));
    setOpenId(null);
  }

  async function handleDeleteLegado(item) {
    const ok = window.confirm(`Excluir "${item.desc}" da lista de contas a quitar?`);
    if (!ok) return;
    await deleteDoc(doc(db, "households", householdId, "dividas", item.id));
  }

  async function handlePagarFatura(card, compras) {
    const abertas = compras.filter((c) => (c.status || "pago") === "pendente");
    if (abertas.length === 0) return;
    const ok = window.confirm(
      `Marcar como paga a fatura de ${monthLabel(selectedMonth)} do ${card.nome}?\n\n${abertas.length} ${abertas.length === 1 ? "lançamento" : "lançamentos"} vão ficar quitados.`
    );
    if (!ok) return;
    setBusy(true);
    await Promise.all(
      abertas.map((c) => updateDoc(doc(db, "households", householdId, "lancamentos", c.id), { status: "pago" }))
    );
    setBusy(false);
  }

  return (
    <div style={{ marginBottom: 34 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.08em", color: "var(--ink-soft)" }}>
          MEUS CARTÕES
        </div>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="cdc-btn"
          style={{ display: "flex", alignItems: "center", gap: 4, border: "none", background: "none", color: "var(--ink)", cursor: "pointer", fontSize: 12, fontWeight: 600 }}
        >
          <Plus size={14} /> Novo cartão
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} style={{ border: "1px dashed var(--line)", padding: 14, marginBottom: 14, background: "rgba(255,255,255,0.5)" }}>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
            <input
              type="text"
              placeholder="Nome do cartão (ex: Nubank)"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              style={{ flex: "2 1 180px", padding: "8px 10px", border: "1px solid var(--line)", background: "var(--paper)", fontSize: 13 }}
            />
            <input
              type="text"
              inputMode="decimal"
              placeholder="Limite total"
              value={limite}
              onChange={(e) => setLimite(e.target.value)}
              className="mono"
              style={{ flex: "1 1 110px", padding: "8px 10px", border: "1px solid var(--line)", background: "var(--paper)", fontSize: 13 }}
            />
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--ink-soft)" }}>
              Fecha dia
              <input
                type="number"
                min={1}
                max={28}
                placeholder="20"
                value={fechamento}
                onChange={(e) => setFechamento(e.target.value)}
                className="mono"
                style={{ width: 56, padding: "7px 8px", border: "1px solid var(--line)", background: "var(--paper)", fontSize: 13 }}
              />
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--ink-soft)" }}>
              Vence dia
              <input
                type="number"
                min={1}
                max={28}
                placeholder="27"
                value={vencimento}
                onChange={(e) => setVencimento(e.target.value)}
                className="mono"
                style={{ width: 56, padding: "7px 8px", border: "1px solid var(--line)", background: "var(--paper)", fontSize: 13 }}
              />
            </label>
            <button type="submit" disabled={busy} className="cdc-btn" style={{ marginLeft: "auto", border: "none", background: "var(--ink)", color: "var(--paper)", padding: "8px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              Criar cartão
            </button>
          </div>
          <div style={{ fontSize: 11, color: "var(--ink-soft)", marginTop: 10, lineHeight: 1.5 }}>
            O dia de fechamento é o que faz a conta bater: compra feita depois dele já cai na fatura do mês seguinte.
          </div>
        </form>
      )}

      {cartoes.length === 0 && legado.length === 0 ? (
        <div style={{ padding: "20px 16px", textAlign: "center", color: "var(--ink-soft)", border: "1px dashed var(--line)", fontSize: 13 }}>
          Nenhum cartão cadastrado. Cadastre um para lançar compras parceladas e acompanhar a fatura de cada mês.
        </div>
      ) : null}

      {cartoes.map((card) => {
        const compras = entries.filter(
          (e) => e.cardId === card.id && faturaDoLancamento(e) === selectedMonth
        );
        const totalFatura = compras.reduce((s, e) => s + e.amount, 0);
        const emAberto = entries
          .filter((e) => e.cardId === card.id && (e.status || "pago") === "pendente")
          .reduce((s, e) => s + e.amount, 0);
        const disponivel = card.limite > 0 ? Math.max(card.limite - emAberto, 0) : null;
        const usoPct = card.limite > 0 ? Math.min((emAberto / card.limite) * 100, 100) : 0;
        const isOpen = openId === card.id;
        const faturaPaga = compras.length > 0 && compras.every((c) => (c.status || "pago") === "pago");

        return (
          <div key={card.id} className="cdc-card" style={{ padding: "14px 16px", marginBottom: 10 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, cursor: "pointer" }} onClick={() => setOpenId(isOpen ? null : card.id)}>
              <div style={{ display: "flex", alignItems: "center", gap: 11, minWidth: 0 }}>
                <span style={{ width: 36, height: 36, borderRadius: 8, background: "rgba(60,110,159,0.14)", color: "#3C6E9F", display: "inline-flex", alignItems: "center", justifyContent: "center", flex: "0 0 auto" }}>
                  <CreditCard size={18} />
                </span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{card.nome}</div>
                  <div style={{ fontSize: 11, color: "var(--ink-soft)" }}>
                    fecha dia {card.diaFechamento} · vence dia {card.diaVencimento}
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flex: "0 0 auto" }}>
                <div style={{ textAlign: "right" }}>
                  <div className="mono" style={{ fontSize: 14, fontWeight: 700, fontVariantNumeric: "tabular-nums", color: faturaPaga ? "var(--income)" : "var(--expense)" }}>
                    {formatBRL(totalFatura)}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--ink-soft)" }}>
                    fatura de {monthLabel(selectedMonth)}
                  </div>
                </div>
                {isOpen ? <ChevronUp size={16} color="var(--ink-soft)" /> : <ChevronDown size={16} color="var(--ink-soft)" />}
              </div>
            </div>

            {card.limite > 0 && (
              <>
                <div style={{ height: 6, background: "var(--line)", marginTop: 12, borderRadius: 3, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${usoPct}%`, background: usoPct > 85 ? "var(--expense)" : "var(--gold)" }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--ink-soft)", marginTop: 5 }}>
                  <span>Limite disponível <strong className="mono" style={{ color: "var(--ink)" }}>{formatBRL(disponivel)}</strong></span>
                  <span className="mono">de {formatBRL(card.limite)}</span>
                </div>
              </>
            )}

            {isOpen && (
              <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px dotted var(--line)" }}>
                <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", color: "var(--ink-soft)", marginBottom: 8 }}>
                  COMPRAS NA FATURA DE {monthLabel(selectedMonth).toUpperCase()}
                </div>

                {compras.length === 0 ? (
                  <div style={{ fontSize: 12, color: "var(--ink-soft)", padding: "10px 0" }}>
                    Nenhuma compra nesta fatura.
                  </div>
                ) : (
                  compras
                    .slice()
                    .sort((a, b) => a.date.localeCompare(b.date))
                    .map((c) => (
                      <div
                        key={c.id}
                        className="cdc-row"
                        onClick={() => onSelectEntry && onSelectEntry(c)}
                        title="Abrir para editar, mudar de fatura ou excluir"
                        style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 6px", fontSize: 12 }}
                      >
                        <CategoryIcon category={c.category} size={26} iconSize={13} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.desc}</div>
                          <div style={{ fontSize: 10, color: "var(--ink-soft)" }}>{formatDateShort(c.date)}</div>
                        </div>
                        <div className="mono" style={{ fontWeight: 600, fontVariantNumeric: "tabular-nums", color: (c.status || "pago") === "pendente" ? "var(--expense)" : "var(--ink-soft)", whiteSpace: "nowrap" }}>
                          {formatBRL(c.amount)}
                        </div>
                        <Pencil size={12} color="var(--ink-soft)" style={{ flex: "0 0 auto" }} />
                      </div>
                    ))
                )}

                <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                  {compras.some((c) => (c.status || "pago") === "pendente") && (
                    <button
                      onClick={() => handlePagarFatura(card, compras)}
                      disabled={busy}
                      className="cdc-btn"
                      style={{ display: "flex", alignItems: "center", gap: 6, border: "none", background: "var(--income)", color: "#fff", padding: "8px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
                    >
                      <CheckCircle2 size={14} /> Marcar fatura como paga
                    </button>
                  )}
                  <button
                    onClick={() => abrirEdicao(card)}
                    className="cdc-btn"
                    style={{ display: "flex", alignItems: "center", gap: 6, border: "1px solid var(--line)", background: "#fff", color: "var(--ink)", padding: "8px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
                  >
                    <Pencil size={14} /> Editar cartão
                  </button>
                  <button
                    onClick={() => handleDeleteCard(card)}
                    className="cdc-btn"
                    style={{ display: "flex", alignItems: "center", gap: 6, border: "1px solid var(--line)", background: "#fff", color: "var(--expense)", padding: "8px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
                  >
                    <Trash2 size={14} /> Excluir cartão
                  </button>
                </div>

                {editandoId === card.id && editForm && (
                  <form onSubmit={(e) => salvarEdicao(e, card)} style={{ marginTop: 12, paddingTop: 12, borderTop: "1px dotted var(--line)" }}>
                    <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", color: "var(--ink-soft)", marginBottom: 10 }}>
                      EDITANDO O CARTÃO
                    </div>
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
                      <input
                        type="text"
                        value={editForm.nome}
                        onChange={(ev) => setEditForm({ ...editForm, nome: ev.target.value })}
                        placeholder="Nome do cartão"
                        style={{ flex: "2 1 170px", padding: "8px 10px", border: "1px solid var(--line)", background: "var(--paper)", fontSize: 13 }}
                      />
                      <input
                        type="text"
                        inputMode="decimal"
                        value={editForm.limite}
                        onChange={(ev) => setEditForm({ ...editForm, limite: ev.target.value })}
                        placeholder="Limite total"
                        className="mono"
                        style={{ flex: "1 1 110px", padding: "8px 10px", border: "1px solid var(--line)", background: "var(--paper)", fontSize: 13 }}
                      />
                    </div>
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                      <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--ink-soft)" }}>
                        Fecha dia
                        <input
                          type="number"
                          min={1}
                          max={28}
                          value={editForm.fechamento}
                          onChange={(ev) => setEditForm({ ...editForm, fechamento: ev.target.value })}
                          className="mono"
                          style={{ width: 56, padding: "7px 8px", border: "1px solid var(--line)", background: "var(--paper)", fontSize: 13 }}
                        />
                      </label>
                      <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--ink-soft)" }}>
                        Vence dia
                        <input
                          type="number"
                          min={1}
                          max={28}
                          value={editForm.vencimento}
                          onChange={(ev) => setEditForm({ ...editForm, vencimento: ev.target.value })}
                          className="mono"
                          style={{ width: 56, padding: "7px 8px", border: "1px solid var(--line)", background: "var(--paper)", fontSize: 13 }}
                        />
                      </label>
                      <button type="submit" disabled={busy} className="cdc-btn" style={{ marginLeft: "auto", border: "none", background: "var(--ink)", color: "var(--paper)", padding: "8px 16px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                        Salvar
                      </button>
                      <button type="button" onClick={() => setEditandoId(null)} style={{ border: "none", background: "none", color: "var(--ink-soft)", fontSize: 12, cursor: "pointer" }}>
                        Cancelar
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </div>
        );
      })}

      {legado.length > 0 && (
        <div style={{ marginTop: 18 }}>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", color: "var(--ink-soft)", marginBottom: 8 }}>
            CONTAS A QUITAR (CADASTRADAS ANTES)
          </div>
          {legado.map((item) => {
            const pago = entries.filter((e) => e.debtId === item.id).reduce((s, e) => s + e.amount, 0);
            const falta = Math.max((item.totalAmount || 0) - pago, 0);
            return (
              <div key={item.id} className="cdc-card" style={{ padding: "11px 14px", marginBottom: 8, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 11, minWidth: 0 }}>
                  <CategoryIcon category={item.category} size={30} iconSize={15} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.desc}</div>
                    <div className="mono" style={{ fontSize: 11, color: "var(--ink-soft)" }}>
                      falta {formatBRL(falta)} de {formatBRL(item.totalAmount || 0)}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteLegado(item)}
                  aria-label="Excluir"
                  className="cdc-btn"
                  style={{ flex: "0 0 auto", border: "none", background: "none", cursor: "pointer", color: "var(--ink-soft)", display: "flex" }}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
