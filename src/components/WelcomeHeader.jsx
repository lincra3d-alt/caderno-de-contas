import React, { useMemo } from "react";
import { Sun, Sunset, Moon, CalendarClock, AlertTriangle, CheckCircle2, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { formatBRL, monthKey } from "../lib/theme";

function todayISO() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function daysBetween(fromISO, toISO) {
  const [y1, m1, d1] = fromISO.split("-").map(Number);
  const [y2, m2, d2] = toISO.split("-").map(Number);
  const a = new Date(y1, m1 - 1, d1);
  const b = new Date(y2, m2 - 1, d2);
  return Math.round((b - a) / 86400000);
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return ["Bom dia", Sun];
  if (h < 18) return ["Boa tarde", Sunset];
  return ["Boa noite", Moon];
}

export default function WelcomeHeader({ user, entries, currentMonth }) {
  const [saudacao, GreetIcon] = greeting();
  const firstName = (user.displayName || "").trim().split(" ")[0] || "por aqui";
  const today = todayISO();

  const { receitaMes, despesaMes } = useMemo(() => {
    const month = currentMonth || today.slice(0, 7);
    let receita = 0;
    let despesa = 0;
    entries.forEach((e) => {
      if (monthKey(e.date) !== month) return;
      if (e.type === "receita") receita += e.amount;
      else despesa += e.amount;
    });
    return { receitaMes: receita, despesaMes: despesa };
  }, [entries, currentMonth, today]);

  const { vencemHoje, atrasadas, proximas } = useMemo(() => {
    const pendentes = entries.filter((e) => e.type === "despesa" && (e.status || "pago") === "pendente");
    const hoje = [];
    const atras = [];
    const prox = [];
    pendentes.forEach((e) => {
      const diff = daysBetween(today, e.date);
      if (diff === 0) hoje.push(e);
      else if (diff < 0) atras.push(e);
      else if (diff <= 7) prox.push({ ...e, dias: diff });
    });
    prox.sort((a, b) => a.dias - b.dias);
    return { vencemHoje: hoje, atrasadas: atras, proximas: prox };
  }, [entries, today]);

  const totalHoje = vencemHoje.reduce((s, e) => s + e.amount, 0);
  const totalAtrasado = atrasadas.reduce((s, e) => s + e.amount, 0);
  const semPendencia = vencemHoje.length === 0 && atrasadas.length === 0 && proximas.length === 0;

  return (
    <div className="cdc-card" style={{ padding: "20px 22px", marginBottom: 18 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 20, flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 240px", minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13, color: "var(--ink-soft)" }}>
            {saudacao},
            <GreetIcon size={15} color="var(--gold)" />
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, color: "var(--ink)", marginTop: 2, letterSpacing: "-0.01em" }}>
            {firstName}!
          </div>
        </div>

        <div style={{ display: "flex", gap: 26, flexWrap: "wrap" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--ink-soft)", letterSpacing: "0.04em" }}>
              <ArrowUpRight size={13} color="var(--income)" /> receita do mês
            </div>
            <div className="mono" style={{ fontSize: 17, fontWeight: 700, color: "var(--income)", marginTop: 2 }}>
              {formatBRL(receitaMes)}
            </div>
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--ink-soft)", letterSpacing: "0.04em" }}>
              <ArrowDownRight size={13} color="var(--expense)" /> despesa do mês
            </div>
            <div className="mono" style={{ fontSize: 17, fontWeight: 700, color: "var(--expense)", marginTop: 2 }}>
              {formatBRL(despesaMes)}
            </div>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px dotted var(--line)", display: "flex", flexDirection: "column", gap: 8 }}>
        {semPendencia && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--income)" }}>
            <CheckCircle2 size={15} />
            Nenhuma conta pendente por aqui. Tudo em dia!
          </div>
        )}

        {atrasadas.length > 0 && (
          <div style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 13, color: "var(--expense)" }}>
            <AlertTriangle size={15} style={{ marginTop: 1, flex: "0 0 auto" }} />
            <span>
              <strong>{atrasadas.length}</strong> {atrasadas.length === 1 ? "conta venceu" : "contas venceram"} e continua
              {atrasadas.length === 1 ? "" : "m"} em aberto, somando{" "}
              <strong className="mono">{formatBRL(totalAtrasado)}</strong>.
            </span>
          </div>
        )}

        {vencemHoje.length > 0 && (
          <div style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 13, color: "var(--ink)" }}>
            <CalendarClock size={15} color="var(--gold)" style={{ marginTop: 1, flex: "0 0 auto" }} />
            <span>
              Hoje vence {vencemHoje.length === 1 ? <strong>{vencemHoje[0].desc}</strong> : <><strong>{vencemHoje.length}</strong> contas</>}
              {" "}no total de <strong className="mono">{formatBRL(totalHoje)}</strong>.
            </span>
          </div>
        )}

        {proximas.length > 0 && (
          <div style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 13, color: "var(--ink-soft)" }}>
            <CalendarClock size={15} style={{ marginTop: 1, flex: "0 0 auto" }} />
            <span>
              Você tem <strong>{proximas.length}</strong> {proximas.length === 1 ? "conta que vence" : "contas que vencem"} nos próximos 7 dias.
              {" "}A mais próxima é <strong>{proximas[0].desc}</strong>{" "}
              {proximas[0].dias === 1 ? "amanhã" : `daqui a ${proximas[0].dias} dias`}.
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
