/* Portado verbatim de meu-caixa.jsx (linhas 97-136): sao funcoes puras, sem DOM.
   Intl funciona no Hermes (delega para android.icu / Foundation) e nada aqui usa
   notation/compactDisplay/signDisplay, que sao as lacunas documentadas. */
const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
export const fmt = (n) => brl.format(Number(n) || 0);

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
