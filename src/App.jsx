import React, { useState, useEffect, useMemo } from "react";
import { Plus, Trash2, ArrowUpRight, ArrowDownRight, LogOut, Users, Copy, Check } from "lucide-react";
import { db, watchAuthState, signInWithGoogle, signOutUser } from "./firebase";
import { useHousehold } from "./hooks/useHousehold";
import { useMemberProfiles } from "./hooks/useMemberProfiles";
import DebtsSection from "./components/DebtsSection";
import CompareView from "./components/CompareView";
import TransactionModal from "./components/TransactionModal";
import PendingSummary from "./components/PendingSummary";
import BalanceChart from "./components/BalanceChart";
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  updateDoc,
  onSnapshot,
  query,
  orderBy,
} from "firebase/firestore";

function formatBRL(value) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDateShort(iso) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y.slice(2)}`;
}

function addMonths(iso, n) {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1 + n, d);
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

const MONTH_NAMES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

function monthKey(iso) {
  return iso.slice(0, 7);
}

function monthLabel(key) {
  const [y, m] = key.split("-");
  return `${MONTH_NAMES[parseInt(m, 10) - 1]}/${y.slice(2)}`;
}

const theme = {
  "--paper": "#E4EAF0",
  "--paper-dark": "#D3DCE6",
  "--ink": "#1B2A3D",
  "--ink-soft": "#4C5C6E",
  "--line": "#AEBBC8",
  "--expense": "#B4432A",
  "--income": "#2F6E4F",
  "--gold": "#B08A34",
};

const cardShadow = "0 1px 3px rgba(27,42,61,0.07)";

const globalStyle = `
  @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600;700&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap');
  .mono { font-family: 'IBM Plex Mono', ui-monospace, monospace; }
  .cdc-perf {
    height: 14px;
    background-image: radial-gradient(circle at 10px 7px, var(--paper) 5px, transparent 5.5px);
    background-size: 20px 14px;
    background-repeat: repeat-x;
    background-color: var(--ink);
  }
  .cdc-row { transition: background 0.12s ease; cursor: pointer; }
  .cdc-row:hover { background: var(--paper-dark); }
  .cdc-btn { transition: transform 0.12s ease, box-shadow 0.12s ease; }
  .cdc-btn:active { transform: scale(0.97); }
  .cdc-toggle { transition: background 0.15s ease, color 0.15s ease; }
  .cdc-del { opacity: 0; transition: opacity 0.15s ease; }
  .cdc-row:hover .cdc-del { opacity: 1; }
  .cdc-tab { transition: background 0.15s ease, color 0.15s ease; }
  .cdc-status-dot { display: inline-block; width: 6px; height: 6px; border-radius: 50%; margin-right: 5px; }
  @media (max-width: 640px) { .cdc-del { opacity: 1; } }
`;

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

function InviteBar({ user, householdId, members, joinHousehold }) {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [joinMsg, setJoinMsg] = useState(null);
  const [joining, setJoining] = useState(false);

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

  return (
    <div style={{ borderBottom: "1px solid var(--line)", background: "rgba(255,255,255,0.5)" }}>
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "12px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <button
          onClick={() => setOpen((o) => !o)}
          style={{ display: "flex", alignItems: "center", gap: 6, border: "none", background: "none", cursor: "pointer", color: "var(--ink-soft)", fontSize: 13, fontWeight: 600, padding: 0 }}
        >
          <Users size={15} />
          {members.length > 1 ? `${members.length} pessoas neste caderno` : "Convidar pessoas"}
        </button>
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
              Compartilhe este código para alguém entrar no seu caderno:
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

function Ledger({ user, householdId, members, joinHousehold, categories, addCategory }) {
  const [entries, setEntries] = useState([]);
  const [debts, setDebts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saveError, setSaveError] = useState(false);
  const [viewMode, setViewMode] = useState("todos");
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [balanceScope, setBalanceScope] = useState("mes"); // mes | total

  const [desc, setDesc] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState("despesa");
  const [category, setCategory] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [parcelado, setParcelado] = useState(false);
  const [numParcelas, setNumParcelas] = useState(2);
  const [jaPago, setJaPago] = useState(true);
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");

  const profiles = useMemberProfiles(members);

  useEffect(() => {
    if (categories.length && !category) setCategory(categories[0]);
  }, [categories, category]);

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

  async function handleAddCategory() {
    if (!newCategoryName.trim()) return;
    await addCategory(newCategoryName);
    setCategory(newCategoryName.trim());
    setNewCategoryName("");
    setShowNewCategory(false);
  }

  async function handleAdd(e) {
    e.preventDefault();
    const value = parseFloat(amount.replace(",", "."));
    if (!desc.trim() || !value || value <= 0 || !householdId) return;

    const status = type === "despesa" ? (jaPago ? "pago" : "pendente") : "pago";

    const base = {
      type,
      category,
      status,
      addedBy: user.uid,
      authorName: user.displayName,
      authorPhoto: user.photoURL,
    };

    try {
      if (parcelado && numParcelas > 1) {
        const groupId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        for (let i = 0; i < numParcelas; i++) {
          await addDoc(collection(db, "households", householdId, "lancamentos"), {
            ...base,
            desc: `${desc.trim()} (${i + 1}/${numParcelas})`,
            amount: value,
            date: addMonths(date, i),
            installmentGroupId: groupId,
            installmentIndex: i + 1,
            installmentTotal: numParcelas,
          });
        }
      } else {
        await addDoc(collection(db, "households", householdId, "lancamentos"), {
          ...base,
          desc: desc.trim(),
          amount: value,
          date,
        });
      }
      setDesc("");
      setAmount("");
      setParcelado(false);
      setNumParcelas(2);
      setJaPago(true);
    } catch (err) {
      console.error(err);
      setSaveError(true);
    }
  }

  async function handleDelete(id) {
    if (!householdId) return;
    try {
      await deleteDoc(doc(db, "households", householdId, "lancamentos", id));
      setSelectedEntry(null);
    } catch (err) {
      console.error(err);
      setSaveError(true);
    }
  }

  async function handleTogglePaid(id, newStatus) {
    if (!householdId) return;
    try {
      await updateDoc(doc(db, "households", householdId, "lancamentos", id), { status: newStatus });
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
                CADERNO Nº 01
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

      <InviteBar user={user} householdId={householdId} members={members} joinHousehold={joinHousehold} />

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
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", margin: "8px 0 32px" }}>
              <div
                style={{
                  border: "3px solid var(--gold)",
                  borderRadius: "50%",
                  width: 172,
                  height: 172,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  transform: "rotate(-4deg)",
                  color: "var(--gold)",
                  position: "relative",
                  boxShadow: "0 4px 14px rgba(176,138,52,0.18)",
                  background: "rgba(255,255,255,0.3)",
                }}
              >
                <div style={{ position: "absolute", inset: 6, border: "1px solid var(--gold)", borderRadius: "50%", opacity: 0.55 }} />
                <div className="mono" style={{ fontSize: 10, letterSpacing: "0.16em", marginBottom: 4 }}>
                  {balanceScope === "mes" ? `SALDO · ${monthLabel(selectedMonth).toUpperCase()}` : "SALDO TOTAL"}
                </div>
                <div
                  className="mono"
                  style={{
                    fontSize: displayedBalance < 0 ? 19 : 21,
                    fontWeight: 700,
                    color: displayedBalance >= 0 ? "var(--income)" : "var(--expense)",
                    textAlign: "center",
                    lineHeight: 1.1,
                  }}
                >
                  {loading ? "..." : formatBRL(displayedBalance)}
                </div>
              </div>
              <select
                value={balanceScope}
                onChange={(e) => setBalanceScope(e.target.value)}
                className="mono"
                style={{ marginTop: 12, fontSize: 11, padding: "5px 8px", border: "1px solid var(--line)", background: "#fff", color: "var(--ink-soft)" }}
              >
                <option value="mes">Valor do mês selecionado</option>
                <option value="total">Valor de todo o período</option>
              </select>
            </div>

            <div style={{ display: "flex", gap: 14, marginBottom: 24, flexWrap: "wrap" }}>
              <div style={{ flex: "1 1 200px", border: "1px solid var(--line)", padding: "16px 18px", background: "#fff", boxShadow: cardShadow }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--income)", marginBottom: 6 }}>
                  <ArrowUpRight size={16} />
                  <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.06em" }}>ENTRADAS</span>
                </div>
                <div className="mono" style={{ fontSize: 21, fontWeight: 600 }}>{formatBRL(totalIncome)}</div>
              </div>
              <div style={{ flex: "1 1 200px", border: "1px solid var(--line)", padding: "16px 18px", background: "#fff", boxShadow: cardShadow }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--expense)", marginBottom: 6 }}>
                  <ArrowDownRight size={16} />
                  <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.06em" }}>SAÍDAS</span>
                </div>
                <div className="mono" style={{ fontSize: 21, fontWeight: 600 }}>{formatBRL(totalExpense)}</div>
              </div>
            </div>

            <PendingSummary entries={entries} debts={debts} />

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
                  placeholder={parcelado ? "Valor de cada parcela" : "0,00"}
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
                ) : (
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
                <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--ink-soft)", cursor: "pointer", flexWrap: "wrap" }}>
                  <input type="checkbox" checked={parcelado} onChange={(e) => setParcelado(e.target.checked)} />
                  Parcelar essa compra
                  {parcelado && (
                    <>
                      em
                      <input
                        type="number"
                        min={2}
                        max={48}
                        value={numParcelas}
                        onChange={(e) => setNumParcelas(Math.max(2, parseInt(e.target.value) || 2))}
                        className="mono"
                        style={{ width: 50, padding: "4px 6px", border: "1px solid var(--line)", background: "var(--paper)", fontSize: 12 }}
                      />
                      vezes de {amount ? formatBRL(parseFloat(amount.replace(",", ".")) || 0) : "R$0,00"} (total {amount ? formatBRL((parseFloat(amount.replace(",", ".")) || 0) * numParcelas) : "R$0,00"})
                    </>
                  )}
                </label>

                {type === "despesa" && (
                  <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--ink-soft)", cursor: "pointer" }}>
                    <input type="checkbox" checked={jaPago} onChange={(e) => setJaPago(e.target.checked)} />
                    Já paguei essa conta
                  </label>
                )}
              </div>
            </form>

            <DebtsSection householdId={householdId} user={user} categories={categories} debts={debts} entries={entries} />

            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.08em", color: "var(--ink-soft)" }}>
                  EXTRATO {viewMode === "meu" ? "— SÓ O SEU" : ""}
                </div>
                {monthEntries.length > 0 && (
                  <div className="mono" style={{ fontSize: 11, color: "var(--ink-soft)" }}>
                    saídas do mês: <span style={{ fontWeight: 700, color: "var(--expense)" }}>
                      {formatBRL(monthEntries.filter((e) => e.type === "despesa").reduce((s, e) => s + e.amount, 0))}
                    </span>
                  </div>
                )}
              </div>

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

              {loading ? (
                <div style={{ padding: "36px 16px", textAlign: "center", color: "var(--ink-soft)", fontSize: 14 }}>
                  Carregando...
                </div>
              ) : monthEntries.length === 0 ? (
                <div style={{ padding: "36px 16px", textAlign: "center", color: "var(--ink-soft)", border: "1px dashed var(--line)", fontSize: 14 }}>
                  Nenhum lançamento em {monthLabel(selectedMonth)}.
                </div>
              ) : (
                <div style={{ border: "1px solid var(--line)", background: "#fff", boxShadow: cardShadow }}>
                  <div className="mono" style={{ display: "grid", gridTemplateColumns: "70px 1fr 110px 100px 28px", gap: 8, fontSize: 11, color: "var(--ink-soft)", padding: "10px 12px", borderBottom: "2px solid var(--ink)", letterSpacing: "0.04em" }}>
                    <div>DATA</div>
                    <div>DESCRIÇÃO</div>
                    <div>CATEGORIA</div>
                    <div style={{ textAlign: "right" }}>VALOR</div>
                    <div></div>
                  </div>
                  {monthEntries.map((e) => {
                    const pending = e.type === "despesa" && (e.status || "pago") === "pendente";
                    return (
                      <div
                        key={e.id}
                        className="cdc-row"
                        onClick={() => setSelectedEntry(e)}
                        style={{ display: "grid", gridTemplateColumns: "70px 1fr 110px 100px 28px", gap: 8, alignItems: "center", padding: "12px", borderBottom: "1px dotted var(--line)", fontSize: 13 }}
                      >
                        <div className="mono" style={{ fontSize: 12, color: "var(--ink-soft)" }}>{formatDateShort(e.date)}</div>
                        <div style={{ overflow: "hidden" }}>
                          <div style={{ display: "flex", alignItems: "center", textOverflow: "ellipsis", whiteSpace: "nowrap", overflow: "hidden" }}>
                            {pending && <span className="cdc-status-dot" style={{ background: "var(--expense)" }} title="Pendente" />}
                            {e.desc}
                          </div>
                          {members.length > 1 && (
                            <div style={{ fontSize: 10, color: "var(--ink-soft)" }}>{e.authorName}</div>
                          )}
                        </div>
                        <div style={{ fontSize: 11, color: "var(--ink-soft)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {e.category}
                        </div>
                        <div
                          className="mono"
                          style={{
                            textAlign: "right",
                            fontWeight: 600,
                            color: e.type === "receita" ? "var(--income)" : "var(--expense)",
                          }}
                        >
                          {e.type === "receita" ? "+" : "−"}{formatBRL(e.amount).replace("R$", "").trim()}
                        </div>
                        <button
                          onClick={(ev) => { ev.stopPropagation(); handleDelete(e.id); }}
                          className="cdc-del"
                          aria-label="Excluir lançamento"
                          style={{ border: "none", background: "none", cursor: "pointer", color: "var(--ink-soft)", display: "flex", justifyContent: "center" }}
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
          onClose={() => setSelectedEntry(null)}
          onTogglePaid={handleTogglePaid}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(undefined);
  const { householdId, members, categories, loading: hLoading, joinHousehold, addCategory } = useHousehold(user || null);

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
      members={members}
      joinHousehold={joinHousehold}
      categories={categories}
      addCategory={addCategory}
    />
  );
}
