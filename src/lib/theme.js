export const theme = {
  "--paper": "#E4EAF0",
  "--paper-dark": "#D3DCE6",
  "--ink": "#1B2A3D",
  "--ink-soft": "#4C5C6E",
  "--line": "#AEBBC8",
  "--expense": "#B4432A",
  "--income": "#2F6E4F",
  "--gold": "#B08A34",
};

export const cardShadow = "0 1px 3px rgba(27,42,61,0.07)";

export const globalStyle = `
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
  .cdc-badge { display: inline-flex; align-items: center; gap: 3px; font-size: 10px; font-weight: 600; padding: 2px 6px; border: 1px solid var(--line); color: var(--ink-soft); white-space: nowrap; }
  .cdc-card { border: 1px solid var(--line); background: #fff; box-shadow: 0 1px 3px rgba(27,42,61,0.07); }
  .cdc-stat-card { flex: 1 1 200px; border: 1px solid var(--line); border-left-width: 3px; padding: 16px 18px; background: #fff; box-shadow: 0 1px 3px rgba(27,42,61,0.07); }
  .cdc-accent { padding-left: 12px; border-left: 3px solid var(--gold); }
  .cdc-list-row { display: flex; align-items: center; gap: 12px; padding: 12px 0; border-bottom: 1px dotted var(--line); }
  .cdc-list-row:last-child { border-bottom: none; }
  .cdc-field { width: 100%; padding: 9px 11px; border: 1px solid var(--line); background: var(--paper); color: var(--ink); font-size: 13px; font-family: inherit; box-sizing: border-box; }
  @media (max-width: 640px) { .cdc-del { opacity: 1; } }
`;

export const MONTH_NAMES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

export function formatBRL(value) {
  return (value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function formatDateShort(iso) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y.slice(2)}`;
}

export function formatDateFull(iso) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export function addMonths(iso, n) {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1 + n, d);
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function monthKey(iso) {
  return iso.slice(0, 7);
}

export function monthLabel(key) {
  const [y, m] = key.split("-");
  return `${MONTH_NAMES[parseInt(m, 10) - 1]}/${y.slice(2)}`;
}
