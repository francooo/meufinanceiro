/* Portado verbatim de meu-caixa.jsx (linhas 97-136): sao funcoes puras, sem DOM.
   Intl funciona no Hermes (delega para android.icu / Foundation) e nada aqui usa
   notation/compactDisplay/signDisplay, que sao as lacunas documentadas. */
const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

/* Modo "ocultar valores" (olho do topo). Variavel de modulo e nao contexto, como
   na web: a HomeScreen a atualiza no inicio de cada render e toda tela le valor
   so pelo fmt, re-renderizando a partir dela. Porcentagens continuam visiveis. */
let HIDE_VALUES = false;
export const setHideValues = (v) => {
  HIDE_VALUES = !!v;
};
export const fmt = (n) => (HIDE_VALUES ? "R$ ••••" : brl.format(Number(n) || 0));

/* 1234.5 -> "1234,50": reabre um valor salvo num campo de texto. Com ponto
   ("1234.50") o parseAmount leria "1.234" como milhar. */
export const amountToInput = (n) =>
  n == null || n === "" || Number.isNaN(Number(n)) ? "" : Number(n).toFixed(2).replace(".", ",");

export const SHORT_MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const LONG_MONTHS = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

/* "2026-10-05" -> "05 out" (linha do tempo de Proximos 7 dias, "Vence 03 out"). */
export const formatDayMonth = (iso) => {
  const [, m, d] = String(iso || "").split("-");
  return m && d ? `${d} ${SHORT_MONTHS[Number(m) - 1]}` : "";
};

/* "2026-10" ou "2026-10-05" -> "outubro" (selo "Para novembro" dos desejos). */
export const monthName = (key) => LONG_MONTHS[Number(String(key || "").split("-")[1]) - 1] || "";

export const addDaysISO = (iso, n) => {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d + n);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
};

export const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
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

export const addMonths = (key, n) => {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return monthKey(d);
};
