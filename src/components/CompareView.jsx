import React, { useMemo } from "react";

function formatBRL(value) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function CompareView({ entries, members, profiles }) {
  const perMember = useMemo(() => {
    const map = {};
    members.forEach((uid) => {
      map[uid] = { income: 0, expense: 0, byCategory: {} };
    });
    entries.forEach((e) => {
      const uid = e.addedBy;
      if (!map[uid]) map[uid] = { income: 0, expense: 0, byCategory: {} };
      if (e.type === "receita") {
        map[uid].income += e.amount;
      } else {
        map[uid].expense += e.amount;
        map[uid].byCategory[e.category] = (map[uid].byCategory[e.category] || 0) + e.amount;
      }
    });
    return map;
  }, [entries, members]);

  const highestSpender = useMemo(() => {
    let max = -1;
    let uid = null;
    members.forEach((m) => {
      const exp = perMember[m]?.expense || 0;
      if (exp > max) {
        max = exp;
        uid = m;
      }
    });
    return max > 0 ? uid : null;
  }, [perMember, members]);

  return (
    <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
      {members.map((uid) => {
        const data = perMember[uid] || { income: 0, expense: 0, byCategory: {} };
        const profile = profiles[uid] || {};
        const sortedCategories = Object.entries(data.byCategory).sort((a, b) => b[1] - a[1]);
        const isTopSpender = uid === highestSpender && members.length > 1;

        return (
          <div key={uid} style={{ flex: "1 1 260px", border: "1px solid var(--line)", padding: 16, background: "rgba(255,255,255,0.4)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              {profile.photoURL && (
                <img src={profile.photoURL} alt="" style={{ width: 28, height: 28, borderRadius: "50%" }} />
              )}
              <div style={{ fontWeight: 600, fontSize: 14 }}>{profile.name || "Alguém"}</div>
              {isTopSpender && (
                <span style={{ fontSize: 10, fontWeight: 700, color: "var(--expense)", border: "1px solid var(--expense)", borderRadius: 3, padding: "1px 6px" }}>
                  GASTA MAIS
                </span>
              )}
            </div>

            <div style={{ display: "flex", gap: 16, marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 11, color: "var(--income)", fontWeight: 600 }}>ENTRADAS</div>
                <div className="mono" style={{ fontSize: 15, fontWeight: 600 }}>{formatBRL(data.income)}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: "var(--expense)", fontWeight: 600 }}>SAÍDAS</div>
                <div className="mono" style={{ fontSize: 15, fontWeight: 600 }}>{formatBRL(data.expense)}</div>
              </div>
            </div>

            {sortedCategories.length > 0 && (
              <div>
                <div style={{ fontSize: 11, color: "var(--ink-soft)", fontWeight: 600, marginBottom: 6 }}>POR CATEGORIA</div>
                {sortedCategories.map(([cat, amount]) => {
                  const pct = data.expense > 0 ? (amount / data.expense) * 100 : 0;
                  return (
                    <div key={cat} style={{ marginBottom: 6 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 2 }}>
                        <span>{cat}</span>
                        <span className="mono">{formatBRL(amount)}</span>
                      </div>
                      <div style={{ height: 4, background: "var(--line)", borderRadius: 2, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${pct}%`, background: "var(--expense)" }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
