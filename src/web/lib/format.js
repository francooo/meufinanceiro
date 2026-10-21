/* Formatação e datas compartilhadas pela web (antes presas em meu-caixa.jsx). */

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

// Modo "ocultar valores" (olho da barra superior). Variável de módulo e não
// contexto: o App a atualiza no início de cada render (setHideValues), e todas as
// telas leem valores só pelo fmt e re-renderizam a partir do App.
let HIDE_VALUES = false;
export const setHideValues = (v) => {
  HIDE_VALUES = !!v;
};
export const fmt = (n) => (HIDE_VALUES ? "R$ ••••" : brl.format(Number(n) || 0));

/* O teclado decimal pt-BR entrega "1.234,56"; parseFloat leria 1.234. Porte de
   mobile/src/core/amount.js. */
export function parseAmount(raw) {
  const s = String(raw ?? "").trim().replace(/\s/g, "").replace(/^R\$/, "");
  if (!s) return NaN;
  // Sem vírgula, "7.000" / "1.234.567" são milhares (o campo é texto, ninguém
  // normaliza antes); "12.5" segue decimal.
  const normalized = s.includes(",")
    ? s.replace(/\./g, "").replace(",", ".")
    : /^\d{1,3}(\.\d{3})+$/.test(s)
    ? s.replace(/\./g, "")
    : s;
  const n = Number(normalized);
  return Number.isFinite(n) ? n : NaN;
}

// 1234.5 -> "1234,50" para reabrir um valor salvo num campo de texto.
export const amountToInput = (n) =>
  n == null || n === "" || Number.isNaN(Number(n)) ? "" : Number(n).toFixed(2).replace(".", ",");

export const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export const addDaysISO = (iso, n) => {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d + n);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
};

export const SHORT_MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const LONG_MONTHS = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

// "05 out"
export const formatDayMonth = (iso) => {
  const [, m, d] = iso.split("-");
  return `${d} ${SHORT_MONTHS[Number(m) - 1]}`;
};

export const formatDateBR = (iso) => {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
};

export const formatRelativeTime = (iso) => {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const diffMin = Math.floor((Date.now() - date.getTime()) / 60000);
  if (diffMin < 1) return "agora mesmo";
  if (diffMin < 60) return `há ${diffMin} min`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `há ${diffHour}h`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay === 1) return "ontem";
  if (diffDay < 7) return `há ${diffDay} dias`;
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
};

export const monthKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

export const monthLabel = (key) => {
  const [y, m] = key.split("-").map(Number);
  const s = new Date(y, m - 1, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  return s.charAt(0).toUpperCase() + s.slice(1);
};

// "2026-10" (ou "2026-10-08") -> "outubro"
export const monthName = (key) => LONG_MONTHS[Number(key.split("-")[1]) - 1] || "";

export const addMonths = (key, n) => {
  const [y, m] = key.split("-").map(Number);
  return monthKey(new Date(y, m - 1 + n, 1));
};

export const uid = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : "id-" + Math.random().toString(36).slice(2) + Date.now();

export const sumValues = (items) => items.reduce((s, i) => s + (Number(i.value) || 0), 0);
