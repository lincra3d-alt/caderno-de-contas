import React, { useState, useEffect, useMemo } from "react";
import { Plus, Trash2, ArrowUpRight, ArrowDownRight, LogOut, Users, Copy, Check, BookOpen, Pencil, Eye, EyeOff, Repeat, Search, X } from "lucide-react";
import { db, watchAuthState, signInWithGoogle, signOutUser } from "./firebase";
import { useHousehold } from "./hooks/useHousehold";
import { useMemberProfiles } from "./hooks/useMemberProfiles";
import CardsSection from "./components/CardsSection";
import CompareView from "./components/CompareView";
import TransactionModal from "./components/TransactionModal";
import PendingSummary from "./components/PendingSummary";
import BalanceChart from "./components/BalanceChart";
import ShareView from "./components/ShareView";
import WelcomeHeader from "./components/WelcomeHeader";
import CategoryIcon from "./lib/categoryIcons";
import { theme, cardShadow, globalStyle, formatBRL, formatDateShort, monthKey, monthLabel, addMonths } from "./lib/theme";
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  updateDoc,
  getDoc,
  setDoc,
  onSnapshot,
  query,
  orderBy,
} from "firebase/firestore";

// Quantos meses de uma despesa fixa são lançados de uma vez.
const RECURRING_MONTHS = 12;

function LoginScreen() {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  async function handleLogin() {
    setBusy(true);
    setErr(null);
    try {
      await signInWithGoogle();
    } catch (e) {
      console.error(e);
      setErr("Não foi possível entrar. Tente novamente.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ ...theme, minHeight: "100vh", background: "var(--paper)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'IBM Plex Sans', sans-serif" }}>
      <style>{globalStyle}</style>
      <div style={{ textAlign: "center", maxWidth: 340, padding: 24 }}>
        <div className="mono" style={{ fontSize: 12, letterSpacing: "0.18em", color: "var(--ink-soft)", marginBottom: 6 }}>
          CADERNO Nº 01
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: "var(--ink)", margin: "0 0 28px" }}>
          Caderno de Contas
        </h1>
        <button
          onClick={handleLogin}
          disabled={busy}
          className="cdc-btn"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
            padding: "13px 24px",
            border: "1px solid var(--line)",
            background: "#fff",
            color: "var(--ink)",
            fontSize: 14,
            fontWeight: 600,
            cursor: busy ? "default" : "pointer",
            opacity: busy ? 0.6 : 1,
            boxShadow: cardShadow,
          }}
        >
          <svg width="18" height="18" viewBox="0 0 48 48">
            <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.9 32.4 29.4 35.5 24 35.5c-6.4 0-11.7-5.2-11.7-11.7S17.6 12.1 24 12.1c3 0 5.7 1.1 7.8 3l5.7-5.7C34 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20c11 0 19.6-7.9 19.6-20 0-1.2-.1-2.3-.3-3.5z" />
            <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.6 18.9 12.1 24 12.1c3 0 5.7 1.1 7.8 3l5.7-5.7C34 6.1 29.3 4 24 4 16.2 4 9.5 8.4 6.3 14.7z" />
            <path fill="#4CAF50" d="M24 44c5.2 0 10-2 13.5-5.2l-6.2-5.3c-2 1.5-4.6 2.5-7.3 2.5-5.4 0-9.9-3.1-11.4-7.6l-6.5 5C9.4 39.6 16.1 44 24 44z" />
            <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-0.8 2.2-2.2 4.1-4 5.5l6.2 5.3C40.9 36 44 30.5 44 24c0-1.2-.1-2.3-.4-3.5z" />
          </svg>
          Entrar com Google
        </button>
        {err && <div style={{ marginTop: 12, fontSize: 12, color: "var(--expense)" }}>{err}</div>}
      </div>
    </div>
  );
}

function CadernosBar({ user, householdId, households, switchHousehold, createHousehold, renameHousehold, members, joinHousehold }) {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [joinMsg, setJoinMsg] = useState(null);
  const [joining, setJoining] = useState(false);
  const [creating, setCreating] = useState(false);

  const active = households.find((h) => h.id === householdId);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(householdId);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  }

  async function handleJoin(e) {
    e.preventDefault();
    setJoining(true);
    setJoinMsg(null);
    const result = await joinHousehold(code);
    setJoining(false);
    if (result.ok) {
      setJoinMsg({ ok: true, text: "Você entrou no caderno!" });
      setCode("");
    } else {
      setJoinMsg({ ok: false, text: result.message });
    }
  }

  async function handleCreate() {
    const name = window.prompt("Nome do novo caderno (ex: Pessoal, Casa, Viagem):", "Meu caderno pessoal");
    if (name === null) return;
    setCreating(true);
    await createHousehold(name);
    setCreating(false);
  }

  function handleRename() {
    if (!active) return;
    const name = window.prompt("Novo nome do caderno:", active.name);
    if (name === null || !name.trim()) return;
    renameHousehold(active.id, name);
  }

  return (
    <div style={{ borderBottom: "1px solid var(--line)", background: "rgba(255,255,255,0.5)" }}>
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "10px 24px 0" }}>
        <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 10, alignItems: "center" }}>
          {households.map((h) => (
            <button
              key={h.id}
              onClick={() => switchHousehold(h.id)}
              className="cdc-tab"
              style={{
                flex: "0 0 auto",
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "7px 14px",
                border: "1px solid var(--line)",
                cursor: "pointer",
                fontSize: 12,
                fontWeight: 600,
                background: h.id === householdId ? "var(--ink)" : "#fff",
                color: h.id === householdId ? "var(--paper)" : "var(--ink-soft)",
                whiteSpace: "nowrap",
              }}
            >
              <BookOpen size={13} />
              {h.name}
              {h.members.length > 1 && (
                <span className="mono" style={{ fontSize: 10, opacity: 0.75 }}>· {h.members.length}</span>
              )}
            </button>
          ))}
          <button
            onClick={handleCreate}
            disabled={creating}
            className="cdc-btn"
            style={{ flex: "0 0 auto", display: "flex", alignItems: "center", gap: 4, border: "1px dashed var(--line)", background: "none", cursor: creating ? "default" : "pointer", color: "var(--ink-soft)", fontSize: 12, fontWeight: 600, padding: "7px 12px" }}
          >
            <Plus size={13} /> Novo caderno
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 800, margin: "0 auto", padding: "0 24px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <button
            onClick={() => setOpen((o) => !o)}
            style={{ display: "flex", alignItems: "center", gap: 6, border: "none", background: "none", cursor: "pointer", color: "var(--ink-soft)", fontSize: 13, fontWeight: 600, padding: 0 }}
          >
            <Users size={15} />
            {members.length > 1 ? `${members.length} pessoas neste caderno` : "Convidar pessoas"}
          </button>
          <button
            onClick={handleRename}
            style={{ display: "flex", alignItems: "center", gap: 4, border: "none", background: "none", cursor: "pointer", color: "var(--ink-soft)", fontSize: 12 }}
          >
            <Pencil size={12} /> Renomear este caderno
          </button>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {user.photoURL && (
            <img src={user.photoURL} alt="" style={{ width: 26, height: 26, borderRadius: "50%" }} />
          )}
          <span style={{ fontSize: 13, color: "var(--ink-soft)" }}>{user.displayName}</span>
          <button
            onClick={signOutUser}
            style={{ display: "flex", alignItems: "center", gap: 4, border: "none", background: "none", cursor: "pointer", color: "var(--ink-soft)", fontSize: 12 }}
          >
            <LogOut size={13} /> Sair
          </button>
        </div>
      </div>

      {open && (
        <div style={{ maxWidth: 800, margin: "0 auto", padding: "0 24px 16px", display: "flex", flexWrap: "wrap", gap: 24 }}>
          <div style={{ flex: "1 1 260px" }}>
            <div style={{ fontSize: 12, color: "var(--ink-soft)", marginBottom: 6 }}>
              Compartilhe este código para alguém entrar neste caderno:
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <div className="mono" style={{ flex: 1, padding: "8px 10px", background: "var(--paper)", border: "1px solid var(--line)", fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {householdId}
              </div>
              <button onClick={handleCopy} className="cdc-btn" style={{ display: "flex", alignItems: "center", gap: 4, border: "1px solid var(--line)", background: "#fff", padding: "8px 10px", cursor: "pointer", fontSize: 12 }}>
                {copied ? <Check size={13} /> : <Copy size={13} />}
                {copied ? "Copiado" : "Copiar"}
              </button>
            </div>
          </div>

          <form onSubmit={handleJoin} style={{ flex: "1 1 260px" }}>
            <div style={{ fontSize: 12, color: "var(--ink-soft)", marginBottom: 6 }}>
              Tem um código de convite? Entre em outro caderno:
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Cole o código aqui"
                className="mono"
                style={{ flex: 1, padding: "8px 10px", border: "1px solid var(--line)", background: "var(--paper)", fontSize: 12 }}
              />
              <button type="submit" disabled={joining} className="cdc-btn" style={{ border: "none", background: "var(--ink)", color: "var(--paper)", padding: "8px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                Entrar
              </button>
            </div>
            {joinMsg && (
              <div style={{ marginTop: 6, fontSize: 12, color: joinMsg.ok ? "var(--income)" : "var(--expense)" }}>
                {joinMsg.text}
              </div>
            )}
          </form>
        </div>
      )}
    </div>
  );
}

function CategoryBreakdown({ entries }) {
  const byCategory = useMemo(() => {
    const map = {};
    entries.filter((e) => e.type === "despesa").forEach((e) => {
      map[e.category] = (map[e.category] || 0) + e.amount;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [entries]);

  const total = byCategory.reduce((s, [, v]) => s + v, 0);
  if (byCategory.length === 0) return null;

  return (
    <div className="cdc-card" style={{ padding: "16px 18px", marginBottom: 24 }}>
      <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.08em", color: "var(--ink-soft)", marginBottom: 12 }}>
        POR CATEGORIA NO MÊS
      </div>
      {byCategory.map(([cat, amount]) => {
        const pct = total > 0 ? (amount / total) * 100 : 0;
        return (
          <div key={cat} style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 10 }}>
            <CategoryIcon category={cat} size={30} iconSize={15} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 12, marginBottom: 4 }}>
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{cat}</span>
                <span className="mono" style={{ fontWeight: 700, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{formatBRL(amount)}</span>
              </div>
              <div style={{ height: 5, background: "var(--line)", borderRadius: 3, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${pct}%`, background: "var(--gold)" }} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Ledger({ user, householdId, households, switchHousehold, createHousehold, renameHousehold, members, joinHousehold, categories, addCategory }) {
  const [entries, setEntries] = useState([]);
  const [debts, setDebts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saveError, setSaveError] = useState(false);
  const [viewMode, setViewMode] = useState("todos");
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [balanceScope, setBalanceScope] = useState("mes"); // mes | total
  const [hideBalance, setHideBalance] = useState(false);
  const [busca, setBusca] = useState("");

  const [desc, setDesc] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState("despesa");
  const [category, setCategory] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [repeticao, setRepeticao] = useState("unica"); // unica | parcelada | fixa
  const [numParcelas, setNumParcelas] = useState(2);
  const [jaPago, setJaPago] = useState(true);
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [alsoAddTo, setAlsoAddTo] = useState(() => new Set());
  const [cardId, setCardId] = useState("");

  const profiles = useMemberProfiles(members);
  const cartoes = useMemo(() => debts.filter((d) => d.tipo === "cartao"), [debts]);
  const activeHousehold = households.find((h) => h.id === householdId);
  const otherHouseholds = households.filter((h) => h.id !== householdId);

  useEffect(() => {
    if (categories.length && !category) setCategory(categories[0]);
  }, [categories, category]);

  useEffect(() => {
    setAlsoAddTo(new Set());
    setCardId("");
    setBusca("");
  }, [householdId]);

  // Se o cartão escolhido for excluído, limpa a seleção do formulário.
  useEffect(() => {
    if (cardId && !cartoes.some((c) => c.id === cardId)) setCardId("");
  }, [cartoes, cardId]);

  useEffect(() => {
    if (!householdId) return;
    const q = query(collection(db, "households", householdId, "lancamentos"), orderBy("date", "desc"));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setEntries(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      (err) => {
        console.error(err);
        setSaveError(true);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, [householdId]);

  useEffect(() => {
    if (!householdId) return;
    const q = query(collection(db, "households", householdId, "dividas"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setDebts(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsubscribe();
  }, [householdId]);

  // Mantém o modal sincronizado se o lançamento selecionado mudar (ex: status)
  useEffect(() => {
    if (!selectedEntry) return;
    const fresh = entries.find((e) => e.id === selectedEntry.id);
    if (fresh) setSelectedEntry(fresh);
    else setSelectedEntry(null);
  }, [entries]); // eslint-disable-line react-hooks/exhaustive-deps

  const visibleEntries = useMemo(() => {
    if (viewMode === "meu") return entries.filter((e) => e.addedBy === user.uid);
    return entries;
  }, [entries, viewMode, user.uid]);

  const balance = useMemo(
    () => visibleEntries.reduce((sum, e) => sum + (e.type === "receita" ? e.amount : -e.amount), 0),
    [visibleEntries]
  );
  const balanceOfSelectedMonth = useMemo(() => {
    const monthKeyNow = new Date().toISOString().slice(0, 7);
    const target = selectedMonth || monthKeyNow;
    return visibleEntries
      .filter((e) => monthKey(e.date) === target)
      .reduce((sum, e) => sum + (e.type === "receita" ? e.amount : -e.amount), 0);
  }, [visibleEntries, selectedMonth]);
  const displayedBalance = balanceScope === "mes" ? balanceOfSelectedMonth : balance;
  const totalIncome = useMemo(
    () => visibleEntries.filter((e) => e.type === "receita").reduce((s, e) => s + e.amount, 0),
    [visibleEntries]
  );
  const totalExpense = useMemo(
    () => visibleEntries.filter((e) => e.type === "despesa").reduce((s, e) => s + e.amount, 0),
    [visibleEntries]
  );

  const availableMonths = useMemo(() => {
    const set = new Set(visibleEntries.map((e) => monthKey(e.date)));
    const currentMonth = new Date().toISOString().slice(0, 7);
    set.add(currentMonth);
    return Array.from(set).sort();
  }, [visibleEntries]);

  useEffect(() => {
    if (availableMonths.length && !availableMonths.includes(selectedMonth)) {
      setSelectedMonth(availableMonths[0]);
    }
  }, [availableMonths, selectedMonth]);

  const monthEntries = useMemo(
    () => visibleEntries.filter((e) => monthKey(e.date) === selectedMonth),
    [visibleEntries, selectedMonth]
  );

  // Com busca ativa procuramos em todos os meses, senão o filtro esconderia
  // justamente o que a pessoa está tentando achar.
  const termoBusca = busca.trim().toLowerCase();
  const listaExtrato = useMemo(() => {
    if (!termoBusca) return monthEntries;
    return visibleEntries
      .filter((e) => {
        const alvo = `${e.desc} ${e.category} ${e.authorName || ""}`.toLowerCase();
        return alvo.includes(termoBusca);
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [termoBusca, monthEntries, visibleEntries]);

  const totalBusca = useMemo(
    () => listaExtrato.reduce((s, e) => s + (e.type === "receita" ? e.amount : -e.amount), 0),
    [listaExtrato]
  );

  async function handleAddCategory() {
    if (!newCategoryName.trim()) return;
    await addCategory(newCategoryName);
    setCategory(newCategoryName.trim());
    setNewCategoryName("");
    setShowNewCategory(false);
  }

  function toggleAlsoAddTo(id) {
    setAlsoAddTo((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleAdd(e) {
    e.preventDefault();
    const value = parseFloat(amount.replace(",", "."));
    if (!desc.trim() || !value || value <= 0 || !householdId) return;

    const status = type === "despesa" ? (jaPago ? "pago" : "pendente") : "pago";
    const targets = [householdId, ...Array.from(alsoAddTo)];

    const base = {
      type,
      category,
      status,
      addedBy: user.uid,
      authorName: user.displayName,
      authorPhoto: user.photoURL,
      ...(cardId && type === "despesa" ? { cardId } : {}),
    };

    const parcelasCount = Math.max(2, Math.min(48, parseInt(numParcelas, 10) || 2));

    try {
      if (repeticao === "parcelada" && parcelasCount > 1) {
        await Promise.all(
          targets.map(async (hid) => {
            const groupId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${hid.slice(0, 4)}`;
            await Promise.all(
              Array.from({ length: parcelasCount }, (_, i) =>
                addDoc(collection(db, "households", hid, "lancamentos"), {
                  ...base,
                  desc: `${desc.trim()} (${i + 1}/${parcelasCount})`,
                  amount: value,
                  date: addMonths(date, i),
                  installmentGroupId: groupId,
                  installmentIndex: i + 1,
                  installmentTotal: parcelasCount,
                })
              )
            );
          })
        );
      } else if (repeticao === "fixa") {
        // Despesa fixa não tem total fechado: lançamos os próximos meses e,
        // quando estiver acabando, o app avisa para estender.
        await Promise.all(
          targets.map(async (hid) => {
            const groupId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${hid.slice(0, 4)}`;
            await Promise.all(
              Array.from({ length: RECURRING_MONTHS }, (_, i) =>
                addDoc(collection(db, "households", hid, "lancamentos"), {
                  ...base,
                  status: i === 0 ? status : "pendente",
                  desc: desc.trim(),
                  amount: value,
                  date: addMonths(date, i),
                  recurringGroupId: groupId,
                  recorrente: true,
                })
              )
            );
          })
        );
      } else {
        await Promise.all(
          targets.map((hid) =>
            addDoc(collection(db, "households", hid, "lancamentos"), {
              ...base,
              desc: desc.trim(),
              amount: value,
              date,
            })
          )
        );
      }
      setDesc("");
      setAmount("");
      setRepeticao("unica");
      setNumParcelas(2);
      setJaPago(true);
      setAlsoAddTo(new Set());
    } catch (err) {
      console.error(err);
      setSaveError(true);
    }
  }

  async function handleDelete(id, escopo = "este") {
    if (!householdId) return;
    const alvo = entries.find((e) => e.id === id);
    try {
      const alvos = alvo ? alvosDoEscopo(alvo, escopo) : [{ id }];
      await Promise.all(
        alvos.map((e) => deleteDoc(doc(db, "households", householdId, "lancamentos", e.id)))
      );
      setSelectedEntry(null);
    } catch (err) {
      console.error(err);
      setSaveError(true);
    }
  }

  // Encerra uma despesa fixa: apaga deste mês em diante e mantém o histórico.
  async function handleEndRecurring(entry) {
    if (!householdId || !entry.recurringGroupId) return;
    const futuras = entries.filter(
      (e) => e.recurringGroupId === entry.recurringGroupId && e.date >= entry.date
    );
    const ok = window.confirm(
      `Encerrar "${entry.desc}" a partir de ${formatDateShort(entry.date)}?\n\n${futuras.length} ${futuras.length === 1 ? "lançamento vai ser apagado" : "lançamentos vão ser apagados"}. O que já passou continua no histórico.`
    );
    if (!ok) return;
    try {
      await Promise.all(
        futuras.map((e) => deleteDoc(doc(db, "households", householdId, "lancamentos", e.id)))
      );
      setSelectedEntry(null);
    } catch (err) {
      console.error(err);
      setSaveError(true);
    }
  }

  // Lança mais meses de uma despesa fixa que está chegando ao fim.
  async function handleExtendRecurring(entry) {
    if (!householdId || !entry.recurringGroupId) return;
    const grupo = entries.filter((e) => e.recurringGroupId === entry.recurringGroupId);
    if (grupo.length === 0) return;
    const ultima = grupo.reduce((max, e) => (e.date > max.date ? e : max), grupo[0]);
    try {
      await Promise.all(
        Array.from({ length: RECURRING_MONTHS }, (_, i) =>
          addDoc(collection(db, "households", householdId, "lancamentos"), {
            type: ultima.type,
            category: ultima.category,
            status: "pendente",
            addedBy: user.uid,
            authorName: user.displayName,
            authorPhoto: user.photoURL,
            ...(ultima.cardId ? { cardId: ultima.cardId } : {}),
            desc: ultima.desc,
            amount: ultima.amount,
            date: addMonths(ultima.date, i + 1),
            recurringGroupId: ultima.recurringGroupId,
            recorrente: true,
          })
        )
      );
    } catch (err) {
      console.error(err);
      setSaveError(true);
    }
  }

  // Todos os lançamentos irmãos de um lançamento (parcelas ou meses da fixa).
  function grupoDe(entry) {
    if (entry.installmentGroupId) {
      return entries
        .filter((e) => e.installmentGroupId === entry.installmentGroupId)
        .sort((a, b) => (a.installmentIndex || 0) - (b.installmentIndex || 0));
    }
    if (entry.recurringGroupId) {
      return entries
        .filter((e) => e.recurringGroupId === entry.recurringGroupId)
        .sort((a, b) => a.date.localeCompare(b.date));
    }
    return [entry];
  }

  function alvosDoEscopo(entry, escopo) {
    if (escopo === "este" || (!entry.installmentGroupId && !entry.recurringGroupId)) return [entry];
    const g = grupoDe(entry);
    if (escopo === "todos") return g;
    return g.filter((e) => e.date >= entry.date);
  }

  // Converte um lançamento (avulso ou parcelado) em despesa fixa.
  async function handleConvertToFixed(entry) {
    if (!householdId) return;
    const base = entry.desc.replace(/\s*\(\d+\/\d+\)$/, "");
    try {
      // Sai o que existia deste mês em diante, entra a fixa no lugar.
      const aRemover = entry.installmentGroupId
        ? grupoDe(entry).filter((e) => e.date >= entry.date)
        : [entry];
      await Promise.all(
        aRemover.map((e) => deleteDoc(doc(db, "households", householdId, "lancamentos", e.id)))
      );

      const groupId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-fix`;
      await Promise.all(
        Array.from({ length: RECURRING_MONTHS }, (_, i) =>
          addDoc(collection(db, "households", householdId, "lancamentos"), {
            type: entry.type,
            category: entry.category,
            status: i === 0 ? entry.status || "pago" : "pendente",
            addedBy: user.uid,
            authorName: user.displayName,
            authorPhoto: user.photoURL,
            ...(entry.cardId ? { cardId: entry.cardId } : {}),
            desc: base,
            amount: entry.amount,
            date: addMonths(entry.date, i),
            recurringGroupId: groupId,
            recorrente: true,
          })
        )
      );
      setSelectedEntry(null);
    } catch (err) {
      console.error(err);
      setSaveError(true);
    }
  }

  async function handleUpdate(id, changes, escopo = "este") {
    if (!householdId) return;
    const alvo = entries.find((e) => e.id === id);
    if (!alvo) return;

    try {
      if (escopo !== "este" && (alvo.installmentGroupId || alvo.recurringGroupId)) {
        const alvos = alvosDoEscopo(alvo, escopo);
        const total = alvo.installmentTotal;
        await Promise.all(
          alvos.map((e) => {
            const proprios = { ...changes };
            // A data de cada irmão continua no mês dele: só o dia acompanha.
            if (e.id !== id && changes.date) {
              const dia = changes.date.slice(8);
              proprios.date = `${e.date.slice(0, 7)}-${dia}`;
            }
            // Na parcelada, a numeração é recolocada no fim da descrição.
            if (e.installmentGroupId && changes.desc) {
              proprios.desc = `${changes.desc} (${e.installmentIndex}/${total})`;
            }
            return updateDoc(doc(db, "households", householdId, "lancamentos", e.id), proprios);
          })
        );
        setSelectedEntry(null);
        return;
      }

      if (alvo.installmentGroupId && changes.desc) {
        changes = { ...changes, desc: `${changes.desc} (${alvo.installmentIndex}/${alvo.installmentTotal})` };
      }
      await updateDoc(doc(db, "households", householdId, "lancamentos", id), changes);

      // Se a parcela editada tiver um link compartilhado, mantém o link em dia.
      const target = entries.find((e) => e.id === id);
      if (target?.installmentGroupId) {
        const shareRef = doc(db, "shares", target.installmentGroupId);
        const shareSnap = await getDoc(shareRef);
        if (shareSnap.exists()) {
          const groupEntries = entries
            .map((e) => (e.id === id ? { ...e, ...changes } : e))
            .filter((e) => e.installmentGroupId === target.installmentGroupId)
            .sort((a, b) => a.installmentIndex - b.installmentIndex);
          await setDoc(
            shareRef,
            {
              parcelas: groupEntries.map((g) => ({ index: g.installmentIndex, date: g.date, status: g.status || "pago" })),
              updatedAt: Date.now(),
            },
            { merge: true }
          );
        }
      }
    } catch (err) {
      console.error(err);
      setSaveError(true);
    }
  }

  async function handleTogglePaid(id, newStatus) {
    if (!householdId) return;
    try {
      await updateDoc(doc(db, "households", householdId, "lancamentos", id), { status: newStatus });

      const target = entries.find((e) => e.id === id);
      if (target?.installmentGroupId) {
        const shareRef = doc(db, "shares", target.installmentGroupId);
        const shareSnap = await getDoc(shareRef);
        if (shareSnap.exists()) {
          const groupEntries = entries
            .map((e) => (e.id === id ? { ...e, status: newStatus } : e))
            .filter((e) => e.installmentGroupId === target.installmentGroupId)
            .sort((a, b) => a.installmentIndex - b.installmentIndex);
          await setDoc(
            shareRef,
            {
              parcelas: groupEntries.map((g) => ({ index: g.installmentIndex, date: g.date, status: g.status || "pago" })),
              updatedAt: Date.now(),
            },
            { merge: true }
          );
        }
      }
    } catch (err) {
      console.error(err);
      setSaveError(true);
    }
  }

  return (
    <div style={{ ...theme, fontFamily: "'IBM Plex Sans', ui-sans-serif, system-ui, sans-serif", background: "var(--paper)", color: "var(--ink)", minHeight: "100vh" }}>
      <style>{globalStyle}</style>

      <div style={{ background: "var(--ink)", color: "var(--paper)" }}>
        <div style={{ maxWidth: 800, margin: "0 auto", padding: "32px 24px 22px" }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
            <div>
              <div className="mono" style={{ fontSize: 12, letterSpacing: "0.18em", opacity: 0.65, marginBottom: 5 }}>
                {(activeHousehold?.name || "CADERNO").toUpperCase()}
              </div>
              <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0, letterSpacing: "-0.01em" }}>Caderno de Contas</h1>
            </div>
            <div className="mono" style={{ fontSize: 11, opacity: 0.6, textAlign: "right" }}>
              {new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
            </div>
          </div>
        </div>
      </div>
      <div className="cdc-perf" />

      <CadernosBar
        user={user}
        householdId={householdId}
        households={households}
        switchHousehold={switchHousehold}
        createHousehold={createHousehold}
        renameHousehold={renameHousehold}
        members={members}
        joinHousehold={joinHousehold}
      />

      <div style={{ maxWidth: 800, margin: "0 auto", padding: "28px 24px 64px" }}>

        {members.length > 1 && (
          <div style={{ display: "flex", border: "1px solid var(--line)", marginBottom: 24, width: "fit-content", boxShadow: cardShadow }}>
            {[
              ["todos", "Todos juntos"],
              ["meu", "Só o meu"],
              ["comparar", "Comparar"],
            ].map(([key, label]) => (
              <button
                key={key}
                onClick={() => setViewMode(key)}
                className="cdc-tab"
                style={{
                  padding: "9px 18px",
                  border: "none",
                  cursor: "pointer",
                  fontSize: 12,
                  fontWeight: 600,
                  background: viewMode === key ? "var(--ink)" : "#fff",
                  color: viewMode === key ? "var(--paper)" : "var(--ink-soft)",
                }}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {viewMode === "comparar" ? (
          <CompareView entries={entries} members={members} profiles={profiles} />
        ) : (
          <>
            <WelcomeHeader user={user} entries={visibleEntries} currentMonth={selectedMonth} />

            <div style={{ display: "flex", gap: 14, marginBottom: 22, flexWrap: "wrap" }}>
              <div className="cdc-card" style={{ flex: "1 1 300px", padding: "18px 20px" }}>
                <div className="cdc-accent" style={{ borderLeftColor: displayedBalance >= 0 ? "var(--income)" : "var(--expense)" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                    <span style={{ fontSize: 12, color: "var(--ink-soft)", fontWeight: 600 }}>
                      {balanceScope === "mes" ? `Saldo de ${monthLabel(selectedMonth)}` : "Saldo geral"}
                    </span>
                    <button
                      onClick={() => setHideBalance((v) => !v)}
                      aria-label={hideBalance ? "Mostrar saldo" : "Esconder saldo"}
                      style={{ border: "none", background: "none", cursor: "pointer", color: "var(--ink-soft)", display: "flex", padding: 0 }}
                    >
                      {hideBalance ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                  <div
                    className="mono"
                    style={{
                      fontSize: 27,
                      fontWeight: 700,
                      lineHeight: 1.2,
                      marginTop: 4,
                      color: displayedBalance >= 0 ? "var(--income)" : "var(--expense)",
                    }}
                  >
                    {loading ? "..." : hideBalance ? "R$ ••••••" : formatBRL(displayedBalance)}
                  </div>
                </div>
                <select
                  value={balanceScope}
                  onChange={(e) => setBalanceScope(e.target.value)}
                  style={{ marginTop: 14, fontSize: 11, padding: "6px 8px", border: "1px solid var(--line)", background: "var(--paper)", color: "var(--ink-soft)", width: "100%" }}
                >
                  <option value="mes">Valor do mês selecionado</option>
                  <option value="total">Valor de todo o período</option>
                </select>
              </div>

              <div style={{ flex: "1 1 300px", display: "flex", flexDirection: "column", gap: 14 }}>
                <div className="cdc-card" style={{ flex: 1, padding: "14px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(47,110,79,0.13)", color: "var(--income)", display: "inline-flex", alignItems: "center", justifyContent: "center", flex: "0 0 auto" }}>
                      <ArrowUpRight size={17} />
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-soft)", letterSpacing: "0.04em" }}>ENTRADAS</span>
                  </div>
                  <div className="mono" style={{ fontSize: 18, fontWeight: 700, color: "var(--income)" }}>{formatBRL(totalIncome)}</div>
                </div>
                <div className="cdc-card" style={{ flex: 1, padding: "14px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(180,67,42,0.13)", color: "var(--expense)", display: "inline-flex", alignItems: "center", justifyContent: "center", flex: "0 0 auto" }}>
                      <ArrowDownRight size={17} />
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-soft)", letterSpacing: "0.04em" }}>SAÍDAS</span>
                  </div>
                  <div className="mono" style={{ fontSize: 18, fontWeight: 700, color: "var(--expense)" }}>{formatBRL(totalExpense)}</div>
                </div>
              </div>
            </div>

            <PendingSummary entries={entries} debts={debts} selectedMonth={selectedMonth} />

            <CategoryBreakdown entries={monthEntries} />

            <BalanceChart entries={entries} />

            <form onSubmit={handleAdd} style={{ border: "1px solid var(--line)", padding: 20, marginBottom: 30, background: "#fff", boxShadow: cardShadow }}>
              <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.08em", color: "var(--ink-soft)", marginBottom: 14 }}>
                NOVO LANÇAMENTO
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
                <input
                  type="text"
                  placeholder="Descrição"
                  value={desc}
                  onChange={(ev) => setDesc(ev.target.value)}
                  style={{ flex: "2 1 180px", padding: "10px 12px", border: "1px solid var(--line)", background: "var(--paper)", color: "var(--ink)", fontFamily: "inherit", fontSize: 14 }}
                />
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder={repeticao === "parcelada" ? "Valor de cada parcela" : repeticao === "fixa" ? "Valor por mês" : "0,00"}
                  value={amount}
                  onChange={(ev) => setAmount(ev.target.value)}
                  className="mono"
                  style={{ flex: "1 1 100px", padding: "10px 12px", border: "1px solid var(--line)", background: "var(--paper)", color: "var(--ink)", fontSize: 14 }}
                />
                <input
                  type="date"
                  value={date}
                  onChange={(ev) => setDate(ev.target.value)}
                  className="mono"
                  style={{ flex: "1 1 140px", padding: "10px 12px", border: "1px solid var(--line)", background: "var(--paper)", color: "var(--ink)", fontSize: 13 }}
                />
              </div>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 12 }}>
                <div style={{ display: "flex", border: "1px solid var(--line)" }}>
                  <button type="button" onClick={() => setType("despesa")} className="cdc-toggle"
                    style={{ padding: "9px 16px", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, background: type === "despesa" ? "var(--expense)" : "transparent", color: type === "despesa" ? "#fff" : "var(--ink-soft)" }}>
                    Saída
                  </button>
                  <button type="button" onClick={() => setType("receita")} className="cdc-toggle"
                    style={{ padding: "9px 16px", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, background: type === "receita" ? "var(--income)" : "transparent", color: type === "receita" ? "#fff" : "var(--ink-soft)" }}>
                    Entrada
                  </button>
                </div>

                {!showNewCategory ? (
                  <select
                    value={category}
                    onChange={(ev) => {
                      if (ev.target.value === "__new__") {
                        setShowNewCategory(true);
                      } else {
                        setCategory(ev.target.value);
                      }
                    }}
                    style={{ padding: "10px 12px", border: "1px solid var(--line)", background: "var(--paper)", color: "var(--ink)", fontSize: 13 }}
                  >
                    {categories.map((c) => (<option key={c} value={c}>{c}</option>))}
                    <option value="__new__">+ Nova categoria...</option>
                  </select>
                ) : null}

                {type === "despesa" && cartoes.length > 0 && (
                  <select
                    value={cardId}
                    onChange={(ev) => setCardId(ev.target.value)}
                    style={{ padding: "10px 12px", border: "1px solid var(--line)", background: cardId ? "#fff" : "var(--paper)", color: "var(--ink)", fontSize: 13 }}
                  >
                    <option value="">Dinheiro ou débito</option>
                    {cartoes.map((c) => (<option key={c.id} value={c.id}>Cartão {c.nome}</option>))}
                  </select>
                )}

                {showNewCategory && (
                  <div style={{ display: "flex", gap: 6 }}>
                    <input
                      type="text"
                      autoFocus
                      placeholder="Nome da categoria"
                      value={newCategoryName}
                      onChange={(ev) => setNewCategoryName(ev.target.value)}
                      style={{ padding: "10px 12px", border: "1px solid var(--line)", background: "var(--paper)", fontSize: 13, width: 140 }}
                    />
                    <button type="button" onClick={handleAddCategory} className="cdc-btn" style={{ border: "none", background: "var(--ink)", color: "var(--paper)", padding: "9px 10px", fontSize: 12, cursor: "pointer" }}>
                      OK
                    </button>
                    <button type="button" onClick={() => { setShowNewCategory(false); setNewCategoryName(""); }} style={{ border: "none", background: "none", color: "var(--ink-soft)", fontSize: 12, cursor: "pointer" }}>
                      Cancelar
                    </button>
                  </div>
                )}

                <button type="submit" className="cdc-btn"
                  style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6, padding: "10px 18px", border: "none", background: "var(--ink)", color: "var(--paper)", fontSize: 13, fontWeight: 600, cursor: "pointer", boxShadow: cardShadow }}>
                  <Plus size={15} /> Lançar
                </button>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", color: "var(--ink-soft)" }}>
                    SE REPETE?
                  </span>
                  <div style={{ display: "flex", border: "1px solid var(--line)" }}>
                    {[
                      ["unica", "Não, é só uma vez"],
                      ["parcelada", "Parcelada"],
                      ["fixa", "Fixa, todo mês"],
                    ].map(([key, label]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setRepeticao(key)}
                        className="cdc-toggle"
                        style={{
                          padding: "7px 12px",
                          border: "none",
                          cursor: "pointer",
                          fontSize: 12,
                          fontWeight: 600,
                          background: repeticao === key ? "var(--ink)" : "#fff",
                          color: repeticao === key ? "var(--paper)" : "var(--ink-soft)",
                        }}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {repeticao === "parcelada" && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--ink-soft)", flexWrap: "wrap" }}>
                    <span>Em</span>
                    <input
                      type="number"
                      min={2}
                      max={48}
                      value={numParcelas}
                      onChange={(e) => {
                        const raw = e.target.value;
                        if (raw === "") {
                          setNumParcelas("");
                          return;
                        }
                        const n = parseInt(raw, 10);
                        if (!Number.isNaN(n)) setNumParcelas(n);
                      }}
                      onBlur={() => {
                        setNumParcelas((prev) => {
                          const n = parseInt(prev, 10);
                          return Math.max(2, Math.min(48, Number.isNaN(n) ? 2 : n));
                        });
                      }}
                      className="mono"
                      style={{ width: 50, padding: "4px 6px", border: "1px solid var(--line)", background: "var(--paper)", fontSize: 12 }}
                    />
                    <span>
                      vezes de {amount ? formatBRL(parseFloat(amount.replace(",", ".")) || 0) : "R$0,00"} (total {amount ? formatBRL((parseFloat(amount.replace(",", ".")) || 0) * (numParcelas || 0)) : "R$0,00"})
                    </span>
                  </div>
                )}

                {repeticao === "fixa" && (
                  <div style={{ fontSize: 12, color: "var(--ink-soft)", lineHeight: 1.5 }}>
                    Vai entrar sozinha todo mês, a partir da data escolhida, sem valor total fechado.
                    Quando parar de pagar, é só abrir o lançamento e encerrar.
                  </div>
                )}

                {type === "despesa" && (
                  <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--ink-soft)", cursor: "pointer" }}>
                    <input type="checkbox" checked={jaPago} onChange={(e) => setJaPago(e.target.checked)} />
                    Já paguei essa conta
                  </label>
                )}

                {otherHouseholds.length > 0 && (
                  <div style={{ marginTop: 6, paddingTop: 10, borderTop: "1px dotted var(--line)" }}>
                    <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", color: "var(--ink-soft)", marginBottom: 8 }}>
                      TAMBÉM ADICIONAR EM
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {otherHouseholds.map((h) => (
                        <label
                          key={h.id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            fontSize: 12,
                            color: "var(--ink-soft)",
                            cursor: "pointer",
                            border: "1px solid var(--line)",
                            padding: "6px 10px",
                            background: alsoAddTo.has(h.id) ? "var(--paper-dark)" : "#fff",
                          }}
                        >
                          <input type="checkbox" checked={alsoAddTo.has(h.id)} onChange={() => toggleAlsoAddTo(h.id)} />
                          <BookOpen size={12} />
                          {h.name}
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </form>

            <CardsSection
              householdId={householdId}
              user={user}
              cards={debts}
              entries={entries}
              selectedMonth={selectedMonth}
            />

            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.08em", color: "var(--ink-soft)" }}>
                  EXTRATO {viewMode === "meu" ? "· SÓ O SEU" : ""}
                </div>
                {!termoBusca && monthEntries.length > 0 && (
                  <div className="mono" style={{ fontSize: 11, color: "var(--ink-soft)" }}>
                    saídas do mês: <span style={{ fontWeight: 700, color: "var(--expense)" }}>
                      {formatBRL(monthEntries.filter((e) => e.type === "despesa").reduce((s, e) => s + e.amount, 0))}
                    </span>
                  </div>
                )}
              </div>

              <div style={{ position: "relative", marginBottom: 12 }}>
                <Search
                  size={15}
                  style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "var(--ink-soft)", pointerEvents: "none" }}
                />
                <input
                  type="text"
                  value={busca}
                  onChange={(ev) => setBusca(ev.target.value)}
                  placeholder="Procurar por descrição, categoria ou pessoa"
                  style={{ width: "100%", padding: "10px 34px", border: "1px solid var(--line)", background: "#fff", color: "var(--ink)", fontFamily: "inherit", fontSize: 13, boxSizing: "border-box" }}
                />
                {busca && (
                  <button
                    onClick={() => setBusca("")}
                    aria-label="Limpar busca"
                    style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", border: "none", background: "none", cursor: "pointer", color: "var(--ink-soft)", display: "flex", padding: 4 }}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {!termoBusca && (
                <div style={{ display: "flex", gap: 6, overflowX: "auto", marginBottom: 12, paddingBottom: 2 }}>
                  {availableMonths.map((m) => (
                    <button
                      key={m}
                      onClick={() => setSelectedMonth(m)}
                      className="cdc-tab mono"
                      style={{
                        flex: "0 0 auto",
                        padding: "7px 14px",
                        border: "1px solid var(--line)",
                        cursor: "pointer",
                        fontSize: 12,
                        fontWeight: 600,
                        background: selectedMonth === m ? "var(--ink)" : "#fff",
                        color: selectedMonth === m ? "var(--paper)" : "var(--ink-soft)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {monthLabel(m)}
                    </button>
                  ))}
                </div>
              )}

              {termoBusca && (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap", marginBottom: 10, fontSize: 12, color: "var(--ink-soft)" }}>
                  <span>
                    {listaExtrato.length === 0
                      ? "Nada encontrado"
                      : `${listaExtrato.length} ${listaExtrato.length === 1 ? "lançamento encontrado" : "lançamentos encontrados"} em todos os meses`}
                  </span>
                  {listaExtrato.length > 0 && (
                    <span className="mono">
                      resultado: <strong style={{ color: totalBusca >= 0 ? "var(--income)" : "var(--expense)" }}>{formatBRL(totalBusca)}</strong>
                    </span>
                  )}
                </div>
              )}

              {loading ? (
                <div style={{ padding: "36px 16px", textAlign: "center", color: "var(--ink-soft)", fontSize: 14 }}>
                  Carregando...
                </div>
              ) : listaExtrato.length === 0 ? (
                <div style={{ padding: "36px 16px", textAlign: "center", color: "var(--ink-soft)", border: "1px dashed var(--line)", fontSize: 14 }}>
                  {termoBusca
                    ? `Nenhum lançamento com "${busca.trim()}".`
                    : `Nenhum lançamento em ${monthLabel(selectedMonth)}.`}
                </div>
              ) : (
                <div className="cdc-card">
                  {listaExtrato.map((e) => {
                    const pending = e.type === "despesa" && (e.status || "pago") === "pendente";
                    return (
                      <div
                        key={e.id}
                        className="cdc-row"
                        onClick={() => setSelectedEntry(e)}
                        style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderBottom: "1px dotted var(--line)", fontSize: 13 }}
                      >
                        <CategoryIcon category={e.category} size={34} iconSize={17} />

                        <div style={{ flex: "1 1 auto", minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap", overflow: "hidden" }}>
                            {pending && <span className="cdc-status-dot" style={{ background: "var(--expense)", flex: "0 0 auto" }} title="Pendente" />}
                            <span style={{ overflow: "hidden", textOverflow: "ellipsis", fontWeight: 500 }}>{e.desc}</span>
                            {e.installmentGroupId && (
                              <span className="cdc-badge" style={{ flex: "0 0 auto" }}>{e.installmentIndex}/{e.installmentTotal}</span>
                            )}
                            {e.recorrente && (
                              <span className="cdc-badge" style={{ flex: "0 0 auto" }} title="Despesa fixa, repete todo mês">
                                <Repeat size={9} /> fixa
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: 11, color: "var(--ink-soft)", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {formatDateShort(e.date)} · {e.category}
                            {e.cardId && cartoes.find((c) => c.id === e.cardId)
                              ? ` · ${cartoes.find((c) => c.id === e.cardId).nome}`
                              : ""}
                            {members.length > 1 && e.authorName ? ` · ${e.authorName}` : ""}
                          </div>
                        </div>

                        <div
                          className="mono"
                          style={{
                            flex: "0 0 auto",
                            textAlign: "right",
                            fontWeight: 700,
                            fontVariantNumeric: "tabular-nums",
                            whiteSpace: "nowrap",
                            color: e.type === "receita" ? "var(--income)" : "var(--expense)",
                          }}
                        >
                          {e.type === "receita" ? "+" : "−"} {formatBRL(e.amount)}
                        </div>

                        <button
                          onClick={(ev) => { ev.stopPropagation(); handleDelete(e.id); }}
                          className="cdc-del"
                          aria-label="Excluir lançamento"
                          style={{ flex: "0 0 auto", border: "none", background: "none", cursor: "pointer", color: "var(--ink-soft)", display: "flex", justifyContent: "center", width: 20 }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}

        {saveError && (
          <div style={{ marginTop: 16, fontSize: 12, color: "var(--expense)" }}>
            Não foi possível conectar ao banco de dados.
          </div>
        )}
      </div>

      {selectedEntry && (
        <TransactionModal
          entry={selectedEntry}
          allEntries={entries}
          debts={debts}
          categories={categories}
          onClose={() => setSelectedEntry(null)}
          onTogglePaid={handleTogglePaid}
          onDelete={handleDelete}
          onUpdate={handleUpdate}
          onEndRecurring={handleEndRecurring}
          onExtendRecurring={handleExtendRecurring}
          onConvertToFixed={handleConvertToFixed}
        />
      )}
    </div>
  );
}

export default function App() {
  const path = typeof window !== "undefined" ? window.location.pathname : "";
  const shareMatch = path.match(/^\/share\/([^/]+)\/?$/);
  if (shareMatch) {
    return <ShareView id={shareMatch[1]} />;
  }

  return <AuthenticatedApp />;
}

function AuthenticatedApp() {
  const [user, setUser] = useState(undefined);
  const {
    householdId,
    households,
    members,
    categories,
    loading: hLoading,
    switchHousehold,
    createHousehold,
    renameHousehold,
    joinHousehold,
    addCategory,
  } = useHousehold(user || null);

  useEffect(() => {
    const unsubscribe = watchAuthState((u) => setUser(u));
    return () => unsubscribe();
  }, []);

  if (user === undefined) {
    return <div style={{ ...theme, minHeight: "100vh", background: "var(--paper)" }} />;
  }

  if (!user) {
    return <LoginScreen />;
  }

  if (hLoading || !householdId) {
    return <div style={{ ...theme, minHeight: "100vh", background: "var(--paper)" }} />;
  }

  return (
    <Ledger
      user={user}
      householdId={householdId}
      households={households}
      switchHousehold={switchHousehold}
      createHousehold={createHousehold}
      renameHousehold={renameHousehold}
      members={members}
      joinHousehold={joinHousehold}
      categories={categories}
      addCategory={addCategory}
    />
  );
}
