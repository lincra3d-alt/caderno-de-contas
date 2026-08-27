import React, { useEffect, useState } from "react";
import { CheckCircle2, Circle, PartyPopper } from "lucide-react";
import { db } from "../firebase";
import { doc, onSnapshot } from "firebase/firestore";
import { theme, cardShadow, globalStyle, formatBRL, formatDateShort } from "../lib/theme";

export default function ShareView({ id }) {
  const [data, setData] = useState(undefined); // undefined = loading, null = not found

  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, "shares", id),
      (snap) => setData(snap.exists() ? snap.data() : null),
      () => setData(null)
    );
    return () => unsub();
  }, [id]);

  if (data === undefined) {
    return <div style={{ ...theme, minHeight: "100vh", background: "var(--paper)" }} />;
  }

  if (data === null) {
    return (
      <div style={{ ...theme, minHeight: "100vh", background: "var(--paper)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'IBM Plex Sans', sans-serif", padding: 24 }}>
        <style>{globalStyle}</style>
        <div style={{ textAlign: "center", color: "var(--ink-soft)", fontSize: 14 }}>
          Link não encontrado ou expirado.
        </div>
      </div>
    );
  }

  const parcelas = data.parcelas || [];
  const total = data.installmentTotal || parcelas.length;
  const paidCount = parcelas.filter((p) => (p.status || "pago") === "pago").length;
  const totalAmount = data.parcelaAmount * total;
  const paidAmount = data.parcelaAmount * paidCount;
  const remaining = Math.max(totalAmount - paidAmount, 0);
  const done = paidCount >= total;

  return (
    <div style={{ ...theme, minHeight: "100vh", background: "var(--paper)", color: "var(--ink)", fontFamily: "'IBM Plex Sans', ui-sans-serif, system-ui, sans-serif" }}>
      <style>{globalStyle}</style>

      <div style={{ background: "var(--ink)", color: "var(--paper)" }}>
        <div style={{ maxWidth: 480, margin: "0 auto", padding: "28px 24px 20px" }}>
          <div className="mono" style={{ fontSize: 11, letterSpacing: "0.18em", opacity: 0.65, marginBottom: 6 }}>
            ACOMPANHAMENTO DE COMPRA PARCELADA
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, letterSpacing: "-0.01em" }}>{data.desc}</h1>
          {data.sharedByName && (
            <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>compartilhado por {data.sharedByName}</div>
          )}
        </div>
      </div>
      <div className="cdc-perf" />

      <div style={{ maxWidth: 480, margin: "0 auto", padding: "28px 24px 60px" }}>
        <div
          style={{
            border: `1px solid ${done ? "var(--income)" : "var(--gold)"}`,
            background: done ? "rgba(47,110,79,0.08)" : "rgba(176,138,52,0.08)",
            padding: 18,
            marginBottom: 22,
            textAlign: "center",
          }}
        >
          {done ? (
            <>
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 6, color: "var(--income)" }}>
                <PartyPopper size={22} />
              </div>
              <div style={{ fontWeight: 700, color: "var(--income)" }}>
                Quitado! Todas as {total} parcelas foram pagas.
              </div>
            </>
          ) : (
            <>
              <div className="mono" style={{ fontSize: 22, fontWeight: 700, color: "var(--expense)" }}>{formatBRL(remaining)}</div>
              <div style={{ fontSize: 12, color: "var(--ink-soft)", marginTop: 4 }}>
                ainda falta pagar · {paidCount} de {total} parcelas quitadas
              </div>
            </>
          )}
          <div style={{ height: 6, background: "var(--line)", marginTop: 12, borderRadius: 3, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${total ? (paidCount / total) * 100 : 0}%`, background: done ? "var(--income)" : "var(--gold)" }} />
          </div>
        </div>

        <div className="cdc-card">
          {parcelas.map((p) => {
            const isPaid = (p.status || "pago") === "pago";
            return (
              <div key={p.index} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", borderBottom: "1px dotted var(--line)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {isPaid ? <CheckCircle2 size={16} color="var(--income)" /> : <Circle size={16} color="var(--ink-soft)" />}
                  <span style={{ fontSize: 13 }}>Parcela {p.index}/{total}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span className="mono" style={{ fontSize: 12, color: "var(--ink-soft)" }}>{formatDateShort(p.date)}</span>
                  <span className="mono" style={{ fontSize: 13, fontWeight: 600, color: isPaid ? "var(--income)" : "var(--expense)" }}>{formatBRL(data.parcelaAmount)}</span>
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ marginTop: 20, textAlign: "center", fontSize: 11, color: "var(--ink-soft)" }}>
          Página somente leitura · Caderno de Contas
        </div>
      </div>
    </div>
  );
}
