import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  Plus, Pencil, Trash2, X, Check,
  ArrowUpRight, ArrowDownRight, PiggyBank, Tag,
  Home, GraduationCap, HeartPulse, Lightbulb, Smartphone,
  Landmark, Car, CreditCard, Repeat, Gamepad2,
  DollarSign, LogOut, Search, ChevronUp, ChevronDown,
  HandCoins, FileText, AlertTriangle, Shirt, Calculator,
  Eye, EyeOff, ChevronLeft, ChevronRight, Menu, Settings, BarChart3, CheckSquare, CheckCircle2,
} from "lucide-react";

/* ---------- dados de referência ---------- */
const CATS = [
  { name: "Moradia", color: "#2E7D6B", icon: Home },
  { name: "Educação", color: "#3B6EA5", icon: GraduationCap },
  { name: "Saúde", color: "#C65D7B", icon: HeartPulse },
  { name: "Casa / Utilidades", color: "#E8873C", icon: Lightbulb },
  { name: "Telefonia", color: "#1098AD", icon: Smartphone },
  { name: "Impostos", color: "#7A5AF8", icon: Landmark },
  { name: "Transporte", color: "#2F9E44", icon: Car },
  { name: "Cartões / Financeiro", color: "#D6493B", icon: CreditCard },
  { name: "Assinaturas / Serviços", color: "#B5892E", icon: Repeat },
  { name: "Lazer / Hobbies", color: "#E64980", icon: Gamepad2 },
];
const FALLBACK = { color: "#64748B", icon: Tag };
const catMeta = (n) => CATS.find((c) => c.name === n) || { name: n, ...FALLBACK };

const CARTOES_CATEGORY = "Cartões / Financeiro";
const PAYMENT_METHODS = ["Pix", "Cartão Nubank Fran", "Cartão Nubank Andrews", "Cartão Sams", "Cartão Renner"];
const PAYMENT_METHOD_FALLBACK = "Sem forma de pagamento";

/* ---------- calculadora de seleção ---------- */
/* `kind` reusa o mesmo vocabulário de modal.mode. direction: +1 entra, -1 sai. */
const SELECTION_SOURCES = {
  expense: { direction: -1, one: "gasto", many: "gastos" },
  income: { direction: 1, one: "ganho", many: "ganhos" },
  wish: { direction: -1, one: "desejo", many: "desejos" },
  mercado: { direction: -1, one: "item de mercado", many: "itens de mercado" },
  farmacia: { direction: -1, one: "item de farmácia", many: "itens de farmácia" },
  serasa: { direction: -1, one: "dívida", many: "dívidas" },
};
const selKey = (kind, id) => `${kind}:${id}`;

/* ícones de marca (fonte: simple-icons.org, cores oficiais das marcas) */
function PixIcon({ size = 16, className }) {
  return (
    <svg role="img" viewBox="0 0 24 24" width={size} height={size} fill="currentColor" className={className} xmlns="http://www.w3.org/2000/svg">
      <path d="M5.283 18.36a3.505 3.505 0 0 0 2.493-1.032l3.6-3.6a.684.684 0 0 1 .946 0l3.613 3.613a3.504 3.504 0 0 0 2.493 1.032h.71l-4.56 4.56a3.647 3.647 0 0 1-5.156 0L4.85 18.36ZM18.428 5.627a3.505 3.505 0 0 0-2.493 1.032l-3.613 3.614a.67.67 0 0 1-.946 0l-3.6-3.6A3.505 3.505 0 0 0 5.283 5.64h-.434l4.573-4.572a3.646 3.646 0 0 1 5.156 0l4.559 4.559ZM1.068 9.422 3.79 6.699h1.492a2.483 2.483 0 0 1 1.744.722l3.6 3.6a1.73 1.73 0 0 0 2.443 0l3.614-3.613a2.482 2.482 0 0 1 1.744-.723h1.767l2.737 2.737a3.646 3.646 0 0 1 0 5.156l-2.736 2.736h-1.768a2.482 2.482 0 0 1-1.744-.722l-3.613-3.613a1.77 1.77 0 0 0-2.444 0l-3.6 3.6a2.483 2.483 0 0 1-1.744.722H3.791l-2.723-2.723a3.646 3.646 0 0 1 0-5.156" />
    </svg>
  );
}
function NubankIcon({ size = 16, className }) {
  return (
    <svg role="img" viewBox="0 0 24 24" width={size} height={size} fill="currentColor" className={className} xmlns="http://www.w3.org/2000/svg">
      <path d="M7.2795 5.4336c-1.1815 0-2.1846.4628-2.9432 1.252h-.002c-.0541-.0022-.1074-.002-.162-.002-1.5436 0-2.9925.8835-3.699 2.2559-.3088.5996-.4234 1.2442-.459 1.9003-.0321.589 0 1.1863 0 1.7696v5.6523H3.184s.0022-2.784 0-5.1777c-.0014-1.6112-.0118-3.0471 0-3.3418.056-1.3937.4372-2.3053 1.1484-3.0508 2.3585.0018 3.8852 1.6091 3.9705 4.168.0196.5874.0254 3.7304.0254 3.7304v3.672h3.1678v-4.965c0-1.5007.0127-2.8006-.0918-3.6952-.292-2.5-1.821-4.168-4.1248-4.168zm8.3903.3008l-3.166.0039v4.9648c0 1.5009-.0127 2.8007.0919 3.6953.2921 2.5001 1.821 4.168 4.1248 4.168 1.1815 0 2.1846-.4628 2.9432-1.252.0003-.0003.0016.0004.002 0 .0542.0023.1093.002.164.002 1.5435 0 2.9905-.8835 3.6971-2.2558.3088-.5997.4233-1.2442.459-1.9004.032-.5889 0-1.1862 0-1.7695V5.7383H20.816s-.0022 2.784 0 5.1777c.0015 1.6113.0119 3.047 0 3.3418-.056 1.3935-.4372 2.3053-1.1483 3.0508-2.3586-.0018-3.8853-1.6091-3.9706-4.168-.0196-.5874-.0273-2.0437-.0273-3.7324Z" />
    </svg>
  );
}
function SamsClubIcon({ size = 16, className }) {
  return (
    <svg role="img" viewBox="0 0 24 24" width={size} height={size} fill="currentColor" className={className} xmlns="http://www.w3.org/2000/svg">
      <path d="m14.275 1.71 9.403 9.504a1.119 1.119 0 0 1 .001 1.569l-9.401 9.507-1.624-1.64a1.136 1.136 0 0 1 0-1.596L19.631 12l-6.917-6.99a1.225 1.225 0 0 1 0-1.72l1.56-1.579zm-3.026 1.572L9.695 1.71.34 11.17a1.186 1.186 0 0 0 0 1.663l9.356 9.457 1.553-1.57a1.237 1.237 0 0 0 0-1.737L4.341 12l6.909-6.985a1.235 1.235 0 0 0-.001-1.734z" />
    </svg>
  );
}

const PAYMENT_METHOD_META = {
  "Pix": { icon: PixIcon, color: "#77B6A8" },
  "Cartão Nubank Fran": { icon: NubankIcon, color: "#820AD1" },
  "Cartão Nubank Andrews": { icon: NubankIcon, color: "#820AD1" },
  "Cartão Sams": { icon: SamsClubIcon, color: "#0067A0" },
  "Cartão Renner": { icon: Shirt, color: "#E4002B" },
};
const PAYMENT_METHOD_FALLBACK_META = { icon: CreditCard, color: "#64748B" };
const paymentMethodMeta = (name) => PAYMENT_METHOD_META[name] || PAYMENT_METHOD_FALLBACK_META;

/* lista completa: as formas fixas primeiro, as criadas pelo usuário depois */
const allPaymentMethods = (extra = []) => [
  ...PAYMENT_METHODS,
  ...extra.filter((p) => !PAYMENT_METHODS.includes(p)),
];

const SERASA_CATS = [
  { name: "Cartão de crédito", color: "#D6493B", icon: CreditCard },
  { name: "Empréstimo", color: "#7A5AF8", icon: HandCoins },
  { name: "Financiamento", color: "#1098AD", icon: FileText },
  { name: "Conta atrasada", color: "#E8873C", icon: AlertTriangle },
  { name: "Outros", color: "#64748B", icon: Tag },
];
const serasaCatMeta = (n) => SERASA_CATS.find((c) => c.name === n) || { name: n, ...FALLBACK };

/* ---------- navegação (menu lateral) ---------- */
// As abas antigas agrupadas nas seções do mock. `tab` continua sendo a fonte da
// verdade em todo o App; a seção é derivada dela.
const SECTIONS = [
  { id: "inicio", label: "Início", icon: Home, tabs: [["overview", "Visão geral"]] },
  { id: "lancamentos", label: "Lançamentos", icon: FileText, tabs: [["gastos", "Gastos"], ["ganhos", "Ganhos"]] },
  { id: "cartoes", label: "Cartões", icon: CreditCard, tabs: [["cartoes", "Cartões"], ["fechamento", "Fechamento"]] },
  { id: "dividas", label: "Dívidas", icon: BarChart3, tabs: [["serasa", "Serasa"]] },
  { id: "listas", label: "Listas", icon: CheckSquare, tabs: [["desejos", "Desejos"], ["mercado", "Mercado"], ["farmacia", "Farmácia"]] },
];
const SETTINGS_SECTION = { id: "config", label: "Configurações", icon: Settings, tabs: [["config", "Configurações"]] };
const sectionOfTab = (t) =>
  [...SECTIONS, SETTINGS_SECTION].find((s) => s.tabs.some(([id]) => id === t)) || SECTIONS[0];

const uid = () =>
  (typeof crypto !== "undefined" && crypto.randomUUID)
    ? crypto.randomUUID()
    : "id-" + Math.random().toString(36).slice(2) + Date.now();

/* ---------- helpers ---------- */
const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
// Modo "ocultar valores" (olho da barra superior). Variável de módulo e não
// contexto: o App a atualiza no início de cada render, e todas as telas leem
// valores só pelo fmt e re-renderizam a partir do App — então vale para a web toda.
let HIDE_VALUES = false;
const fmt = (n) => (HIDE_VALUES ? "R$ ••••" : brl.format(Number(n) || 0));

const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const addDaysISO = (iso, n) => {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d + n);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
};

const SHORT_MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
// "05 out" — rótulo da linha do tempo de Próximos 7 dias.
const formatDayMonth = (iso) => {
  const [, m, d] = iso.split("-");
  return `${d} ${SHORT_MONTHS[Number(m) - 1]}`;
};

const formatDateBR = (iso) => {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
};

const formatRelativeTime = (iso) => {
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

const monthKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

const monthLabel = (key) => {
  const [y, m] = key.split("-").map(Number);
  const s = new Date(y, m - 1, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  return s.charAt(0).toUpperCase() + s.slice(1);
};

const addMonths = (key, n) => {
  const [y, m] = key.split("-").map(Number);
  return monthKey(new Date(y, m - 1 + n, 1));
};

// Quanto a linha tirou do cartão no mês dela. Numa compra parcelada o limite cai
// o valor CHEIO de uma vez, na hora da compra — 280 de uma 280 em 3x, não os
// 93,33 da parcela. Então a parcela 1 cobra o total e as seguintes cobram só a
// parcela, que é o que você deve naquele mês.
// purchaseTotal é nulo em tudo gravado antes dessa coluna existir; o fallback
// parcela × total mantém esses lançamentos com um número razoável.
// Espelho de mobile/src/core/cards.js — mudou aqui, muda lá.
const cardChargeOf = (e) => {
  const value = Number(e.value) || 0;
  const total = Number(e.installmentTotal) || 0;
  if (total < 2) return value;
  if ((e.installmentNumber ?? 1) !== 1) return value;
  const declared = Number(e.purchaseTotal) || 0;
  return declared > 0 ? declared : value * total;
};

const store = {
  async loadMonths() {
    try {
      const res = await fetch("/api/months");
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data.months) ? data.months : [];
    } catch {
      return [];
    }
  },
  async load(month) {
    try {
      const res = await fetch(`/api/data?month=${encodeURIComponent(month)}`);
      if (!res.ok) return null;
      const data = await res.json();
      return data && Array.isArray(data.expenses) ? data : null;
    } catch {
      return null;
    }
  },
  async save(month, data) {
    try {
      await fetch("/api/data", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month, ...data }),
      });
    } catch {
      /* silencioso: segue em memória, sem persistir no banco */
    }
  },
  async createMonth(month) {
    const res = await fetch("/api/months", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ month }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Falha ao criar o mês.");
    }
    return res.json();
  },
  async loadPaymentMethods() {
    try {
      const res = await fetch("/api/payment-methods");
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data.methods) ? data.methods : [];
    } catch {
      return [];
    }
  },
  // categorias de TODOS os meses: sem isto uma categoria personalizada some do
  // seletor no primeiro mês que não tiver gasto nela
  async loadCategories() {
    try {
      const res = await fetch("/api/categories");
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data.categories) ? data.categories : [];
    } catch {
      return [];
    }
  },
  async loadWishlist() {
    try {
      const res = await fetch("/api/wishlist");
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data.items) ? data.items : [];
    } catch {
      return [];
    }
  },
  async saveWishlist(items) {
    try {
      await fetch("/api/wishlist", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
    } catch {
      /* silencioso: segue em memória, sem persistir no banco */
    }
  },
  async loadShoppingList(listType) {
    try {
      const res = await fetch(`/api/shopping?list=${listType}`);
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data.items) ? data.items : [];
    } catch {
      return [];
    }
  },
  async saveShoppingList(listType, items) {
    try {
      await fetch(`/api/shopping?list=${listType}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
    } catch {
      /* silencioso: segue em memória, sem persistir no banco */
    }
  },
  async loadSerasa() {
    try {
      const res = await fetch("/api/serasa");
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data.items) ? data.items : [];
    } catch {
      return [];
    }
  },
  async saveSerasa(items) {
    try {
      await fetch("/api/serasa", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
    } catch {
      /* silencioso: segue em memória, sem persistir no banco */
    }
  },
  async loadCards() {
    try {
      const res = await fetch("/api/cards");
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data.items) ? data.items : [];
    } catch {
      return [];
    }
  },
  async saveCards(items) {
    try {
      await fetch("/api/cards", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
    } catch {
      /* silencioso: segue em memória, sem persistir no banco */
    }
  },
  /* Fechamento de cartão é preso ao mês (como /api/data), então o mês vai na query. */
  async loadCardClosings(month) {
    try {
      const res = await fetch(`/api/card-closings?month=${encodeURIComponent(month)}`);
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data.items) ? data.items : [];
    } catch {
      return [];
    }
  },
  async saveCardClosings(month, items) {
    try {
      await fetch(`/api/card-closings?month=${encodeURIComponent(month)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
    } catch {
      /* silencioso: segue em memória, sem persistir no banco */
    }
  },
};

/* ---------- app ---------- */
export default function App() {
  const [authed, setAuthed] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [months, setMonths] = useState([]);
  const [month, setMonth] = useState(() => monthKey(new Date()));
  const [switchingMonth, setSwitchingMonth] = useState(false);
  const [creatingMonth, setCreatingMonth] = useState(false);
  const [expenses, setExpenses] = useState([]);
  const [incomes, setIncomes] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [shoppingLists, setShoppingLists] = useState({ mercado: [], farmacia: [] });
  const [serasa, setSerasa] = useState([]);
  const [cards, setCards] = useState([]);
  // Fechamento de cartão é preso ao mês (como expenses), não global.
  const [cardClosings, setCardClosings] = useState([]);
  const [savedPaymentMethods, setSavedPaymentMethods] = useState([]);
  const [savedCategories, setSavedCategories] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [tab, setTab] = useState("overview");
  const [modal, setModal] = useState(null); // {mode:'expense'|'income'|'wish'|'mercado'|'farmacia', item|null}
  const [confirmState, setConfirmState] = useState(null); // {kind, payload}
  const [saved, setSaved] = useState(false);
  const savedTimer = useRef(null);

  // Estrutura da web (menu lateral + barra superior).
  const [email, setEmail] = useState("");
  const [menuOpen, setMenuOpen] = useState(false); // gaveta do menu abaixo de lg
  // Última sub-aba visitada em cada seção: voltar para "Listas" reabre Mercado,
  // se foi lá que a pessoa estava.
  const lastTabBySection = useRef({});
  const [hideValues, setHideValues] = useState(() => {
    try {
      return localStorage.getItem("mf:hideValues") === "1";
    } catch {
      return false;
    }
  });
  // Carteira mostrada no card "Sobra do mês" (e no subtítulo da home).
  const [wallet, setWallet] = useState(() => {
    try {
      return localStorage.getItem("mf:wallet") === "va" ? "va" : "cltPj";
    } catch {
      return "cltPj";
    }
  });
  // Lido pelo fmt durante este render (ver HIDE_VALUES).
  HIDE_VALUES = hideValues;

  // Seleção da calculadora: estado de UI puro, compartilhado entre abas.
  // Nunca vai para os objetos de dados — os autosaves abaixo reenviariam a
  // coleção inteira ao banco a cada clique no checkbox.
  const [selecting, setSelecting] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState(() => new Set());

  const toggleSelected = (kind, id) =>
    setSelectedKeys((prev) => {
      const next = new Set(prev); // clonar é obrigatório: devolver `prev` mutado não re-renderiza
      const k = selKey(kind, id);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });

  const clearSelection = () => setSelectedKeys((prev) => (prev.size === 0 ? prev : new Set()));

  const exitSelection = () => {
    setSelecting(false);
    clearSelection();
  };

  const handleLogin = () => {
    setAuthed(true);
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      /* segue mesmo se a chamada falhar */
    }
    setAuthed(false);
    setLoaded(false);
    setEmail("");
    exitSelection();
  };

  useEffect(() => {
    try {
      localStorage.setItem("mf:hideValues", hideValues ? "1" : "0");
    } catch {
      /* sem storage: o modo vale só nesta sessão */
    }
  }, [hideValues]);

  useEffect(() => {
    try {
      localStorage.setItem("mf:wallet", wallet);
    } catch {
      /* idem */
    }
  }, [wallet]);

  // Email da sessão para o avatar e Configurações. Roda também depois do login
  // (authed vira true sem recarregar a página).
  useEffect(() => {
    if (!authed || email) return;
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d?.email && setEmail(d.email))
      .catch(() => {});
  }, [authed, email]);

  useEffect(() => {
    lastTabBySection.current[sectionOfTab(tab).id] = tab;
  }, [tab]);

  const goSection = (s) => {
    setTab(lastTabBySection.current[s.id] || s.tabs[0][0]);
    setMenuOpen(false);
  };

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/auth/me");
        setAuthed(res.ok);
      } catch {
        setAuthed(false);
      } finally {
        setAuthChecked(true);
      }
    })();
  }, []);

  useEffect(() => {
    if (!authed) return;
    (async () => {
      const availableMonths = await store.loadMonths();
      const initialMonth = availableMonths.length > 0 ? availableMonths[availableMonths.length - 1] : monthKey(new Date());
      setMonths(availableMonths.length > 0 ? availableMonths : [initialMonth]);
      setMonth(initialMonth);

      const data = await store.load(initialMonth);
      if (data && Array.isArray(data.expenses)) {
        setExpenses(data.expenses);
        setIncomes(Array.isArray(data.incomes) ? data.incomes : []);
        setWishlist(await store.loadWishlist());
        const [mercado, farmacia] = await Promise.all([
          store.loadShoppingList("mercado"),
          store.loadShoppingList("farmacia"),
        ]);
        setShoppingLists({ mercado, farmacia });
        setSerasa(await store.loadSerasa());
        setCards(await store.loadCards());
        setCardClosings(await store.loadCardClosings(initialMonth));
        setSavedPaymentMethods(await store.loadPaymentMethods());
        setSavedCategories(await store.loadCategories());
        setLoaded(true);
      } else {
        setLoadError(true);
      }
    })();
  }, [authed]);

  useEffect(() => {
    if (!authed || !loaded) return;
    store.save(month, { expenses, incomes });
    setSaved(true);
    clearTimeout(savedTimer.current);
    savedTimer.current = setTimeout(() => setSaved(false), 1400);
  }, [expenses, incomes, loaded, authed, month]);

  useEffect(() => {
    if (!authed || !loaded) return;
    store.saveWishlist(wishlist);
    setSaved(true);
    clearTimeout(savedTimer.current);
    savedTimer.current = setTimeout(() => setSaved(false), 1400);
  }, [wishlist, loaded, authed]);

  useEffect(() => {
    if (!authed || !loaded) return;
    store.saveShoppingList("mercado", shoppingLists.mercado);
    store.saveShoppingList("farmacia", shoppingLists.farmacia);
    setSaved(true);
    clearTimeout(savedTimer.current);
    savedTimer.current = setTimeout(() => setSaved(false), 1400);
  }, [shoppingLists, loaded, authed]);

  useEffect(() => {
    if (!authed || !loaded) return;
    store.saveSerasa(serasa);
    setSaved(true);
    clearTimeout(savedTimer.current);
    savedTimer.current = setTimeout(() => setSaved(false), 1400);
  }, [serasa, loaded, authed]);

  useEffect(() => {
    if (!authed || !loaded) return;
    store.saveCards(cards);
    setSaved(true);
    clearTimeout(savedTimer.current);
    savedTimer.current = setTimeout(() => setSaved(false), 1400);
  }, [cards, loaded, authed]);

  // Fechamento é do mês: depende de `month` igual ao save de expenses/incomes.
  // Ao trocar o mês, handleMonthChange seta mês + fechamentos juntos, então este
  // efeito re-grava o que acabou de carregar (idempotente) — mesmo padrão.
  useEffect(() => {
    if (!authed || !loaded) return;
    store.saveCardClosings(month, cardClosings);
    setSaved(true);
    clearTimeout(savedTimer.current);
    savedTimer.current = setTimeout(() => setSaved(false), 1400);
  }, [cardClosings, loaded, authed, month]);

  // wishlist/mercado/farmácia/serasa são globais; só expenses e incomes trocam com o mês,
  // então o reset da seleção é cirúrgico: apenas as chaves do mês saem.
  useEffect(() => {
    setSelectedKeys((prev) => {
      if (prev.size === 0) return prev;
      const next = new Set([...prev].filter((k) => !k.startsWith("expense:") && !k.startsWith("income:")));
      return next.size === prev.size ? prev : next;
    });
  }, [month]);

  const nextMonthKey = useMemo(
    () => addMonths(months.length > 0 ? months[months.length - 1] : month, 1),
    [months, month]
  );

  const handleMonthChange = async (newMonth) => {
    if (newMonth === month || switchingMonth) return;
    setSwitchingMonth(true);
    const [data, closings] = await Promise.all([
      store.load(newMonth),
      store.loadCardClosings(newMonth),
    ]);
    if (data && Array.isArray(data.expenses)) {
      setMonth(newMonth);
      setExpenses(data.expenses);
      setIncomes(Array.isArray(data.incomes) ? data.incomes : []);
      setCardClosings(Array.isArray(closings) ? closings : []);
    }
    setSwitchingMonth(false);
  };

  const handleAddNextMonth = async () => {
    if (creatingMonth) return;
    setCreatingMonth(true);
    try {
      const data = await store.createMonth(nextMonthKey);
      setMonths((prev) => [...prev, nextMonthKey]);
      setMonth(nextMonthKey);
      setExpenses(data.expenses);
      setIncomes(data.incomes);
      // Mês novo começa sem fechamentos — createMonth não os carrega adiante.
      setCardClosings([]);
    } catch (err) {
      console.error(err);
    } finally {
      setCreatingMonth(false);
    }
  };

  const totalGastos = useMemo(() => expenses.reduce((s, e) => s + (Number(e.value) || 0), 0), [expenses]);
  const totalGanhos = useMemo(() => incomes.reduce((s, i) => s + (Number(i.value) || 0), 0), [incomes]);

  // Soma sobre as coleções completas, nunca sobre as listas já filtradas de cada aba:
  // filtro é lente (ver comentário em Gastos), então buscar não pode mexer no total.
  // A contagem usa itens realmente encontrados, então chave órfã de item excluído
  // some sozinha da conta — por isso não existe efeito de "limpeza" das coleções.
  const selectionStats = useMemo(() => {
    let count = 0;
    let inflow = 0;
    let outflow = 0;
    const byKind = [];
    if (selectedKeys.size > 0) {
      const buckets = [
        ["expense", expenses],
        ["income", incomes],
        ["wish", wishlist],
        ["mercado", shoppingLists.mercado],
        ["farmacia", shoppingLists.farmacia],
        ["serasa", serasa],
      ];
      for (const [kind, list] of buckets) {
        let n = 0;
        for (const it of list || []) {
          if (!selectedKeys.has(selKey(kind, it.id))) continue;
          n += 1;
          const v = Number(it.value) || 0;
          if (SELECTION_SOURCES[kind].direction > 0) inflow += v;
          else outflow += v;
        }
        if (n > 0) byKind.push({ kind, n });
        count += n;
      }
    }
    return { count, inflow, outflow, net: inflow - outflow, mixed: inflow > 0 && outflow > 0, byKind };
  }, [selectedKeys, expenses, incomes, wishlist, shoppingLists, serasa]);

  // Com uma origem só a quebra já é a contagem ("2 gastos"); com várias, o total
  // vem na frente para sobreviver ao `truncate` da barra em telas estreitas.
  const selectionLabel = useMemo(() => {
    const parts = selectionStats.byKind.map(
      ({ kind, n }) => `${n} ${n === 1 ? SELECTION_SOURCES[kind].one : SELECTION_SOURCES[kind].many}`
    );
    const breakdown = parts.join(" · ");
    if (parts.length <= 1) return breakdown;
    return `${selectionStats.count} itens · ${breakdown}`;
  }, [selectionStats]);

  const vaRecebido = useMemo(
    () => incomes.filter((i) => i.voucherIncome).reduce((s, i) => s + (Number(i.value) || 0), 0),
    [incomes]
  );
  const vaUsado = useMemo(
    () => expenses.filter((e) => e.paidWithVoucher).reduce((s, e) => s + (Number(e.value) || 0), 0),
    [expenses]
  );
  const vaRestante = vaRecebido - vaUsado;

  const cltPjRecebido = useMemo(
    () => incomes.filter((i) => i.cltPjIncome).reduce((s, i) => s + (Number(i.value) || 0), 0),
    [incomes]
  );
  const cltPjGasto = useMemo(
    () => expenses.filter((e) => e.paidWithCltPj).reduce((s, e) => s + (Number(e.value) || 0), 0),
    [expenses]
  );
  const cltPjSobra = cltPjRecebido - cltPjGasto;

  const byCat = useMemo(() => {
    const m = new Map();
    for (const e of expenses) {
      const v = Number(e.value) || 0;
      m.set(e.category, (m.get(e.category) || 0) + v);
    }
    return [...m.entries()]
      .map(([name, value]) => ({ name, value, ...catMeta(name) }))
      .filter((c) => c.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [expenses]);

  const gastosGrouped = useMemo(() => {
    const m = new Map();
    for (const e of expenses) {
      if (!m.has(e.category)) m.set(e.category, []);
      m.get(e.category).push(e);
    }
    return [...m.entries()]
      .map(([name, items]) => ({
        name,
        ...catMeta(name),
        items: [...items].sort((a, b) => {
          if (a.order != null && b.order != null) return a.order - b.order;
          if (a.order != null) return -1;
          if (b.order != null) return 1;
          return (b.value || 0) - (a.value || 0);
        }),
        subtotal: items.reduce((s, i) => s + (Number(i.value) || 0), 0),
      }))
      .sort((a, b) => b.subtotal - a.subtotal);
  }, [expenses]);

  // as já gravadas no banco (de qualquer mês) somadas às do mês carregado, para que
  // uma categoria criada uma vez continue aparecendo na lista depois
  const extraExpenseCategories = useMemo(() => {
    const known = new Set(CATS.map((c) => c.name));
    const all = [...savedCategories, ...expenses.map((e) => e.category)];
    return [...new Set(all.filter((c) => c && !known.has(c)))].sort();
  }, [savedCategories, expenses]);

  // formas de pagamento personalizadas: as já gravadas no banco (de qualquer mês) somadas às
  // do mês carregado, para que um cartão criado uma vez continue aparecendo na lista depois
  const extraPaymentMethods = useMemo(() => {
    const known = new Set(PAYMENT_METHODS);
    const all = [...savedPaymentMethods, ...expenses.map((e) => e.paymentMethod)];
    return [...new Set(all.filter((p) => p && !known.has(p)))].sort();
  }, [savedPaymentMethods, expenses]);

  const extraSerasaCategories = useMemo(() => {
    const known = new Set(SERASA_CATS.map((c) => c.name));
    return [...new Set(serasa.map((s) => s.category).filter((c) => c && !known.has(c)))].sort();
  }, [serasa]);

  const wishGrouped = useMemo(() => {
    const sortFn = (a, b) => {
      if (a.order != null && b.order != null) return a.order - b.order;
      if (a.order != null) return -1;
      if (b.order != null) return 1;
      return a.title.localeCompare(b.title);
    };
    return {
      pending: wishlist.filter((w) => !w.doneAt).sort(sortFn),
      done: wishlist.filter((w) => w.doneAt).sort(sortFn),
    };
  }, [wishlist]);

  const serasaGrouped = useMemo(() => {
    const m = new Map();
    for (const s of serasa) {
      if (!m.has(s.category)) m.set(s.category, []);
      m.get(s.category).push(s);
    }
    return [...m.entries()]
      .map(([name, items]) => ({
        name,
        ...serasaCatMeta(name),
        items: [...items].sort((a, b) => {
          if (a.order != null && b.order != null) return a.order - b.order;
          if (a.order != null) return -1;
          if (b.order != null) return 1;
          return (b.value || 0) - (a.value || 0);
        }),
        subtotal: items.reduce((s2, i) => s2 + (Number(i.value) || 0), 0),
      }))
      .sort((a, b) => b.subtotal - a.subtotal);
  }, [serasa]);
  const totalSerasa = useMemo(() => serasa.reduce((s, i) => s + (Number(i.value) || 0), 0), [serasa]);

  // Uso do cartão: gastos do mês carregado com aquela forma de pagamento — de QUALQUER
  // categoria (paymentMethod é independente de category) e pagos ou não (paidAt é ignorado
  // de propósito: o gasto já saiu do saldo do cartão mesmo depois de quitado).
  // Só o mês em memória entra: `expenses` nunca contém outros meses.
  const spentByPaymentMethod = useMemo(() => {
    const m = new Map();
    for (const e of expenses) {
      if (!e.paymentMethod) continue;
      m.set(e.paymentMethod, (m.get(e.paymentMethod) || 0) + cardChargeOf(e));
    }
    return m;
  }, [expenses]);

  // Quanto do total acima veio de compra parcelada cobrada cheia, para a tela
  // explicar por que o desconto é maior que a soma das parcelas.
  const upfrontByPaymentMethod = useMemo(() => {
    const m = new Map();
    for (const e of expenses) {
      if (!e.paymentMethod) continue;
      const extra = cardChargeOf(e) - (Number(e.value) || 0);
      if (extra <= 0) continue;
      const cur = m.get(e.paymentMethod) || { extra: 0, count: 0 };
      m.set(e.paymentMethod, { extra: cur.extra + extra, count: cur.count + 1 });
    }
    return m;
  }, [expenses]);

  const cardsWithUsage = useMemo(
    () =>
      cards
        .filter((c) => c.paymentMethod && c.referenceDate) // blinda formatDateBR(null), que quebraria a aba
        .map((c) => {
          const spent = spentByPaymentMethod.get(c.paymentMethod) || 0;
          const up = upfrontByPaymentMethod.get(c.paymentMethod) || { extra: 0, count: 0 };
          const refMonth = c.referenceDate.slice(0, 7);
          // saldo anotado depois do mês visto já embute esses gastos: não descontar de novo
          const scope = month < refMonth ? "before" : month === refMonth ? "same" : "after";
          const balance = Number(c.balance) || 0;
          return {
            ...c,
            spent,
            scope,
            upfrontExtra: up.extra,
            upfrontCount: up.count,
            remaining: scope === "before" ? balance : balance - spent,
          };
        })
        .sort((a, b) => a.paymentMethod.localeCompare(b.paymentMethod)),
    [cards, spentByPaymentMethod, upfrontByPaymentMethod, month]
  );

  const unregisteredMethodSpend = useMemo(() => {
    const registered = new Set(cards.map((c) => c.paymentMethod));
    return [...spentByPaymentMethod.entries()]
      .filter(([name]) => !registered.has(name))
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [cards, spentByPaymentMethod]);

  const canAddCard = useMemo(() => {
    const taken = new Set(cards.map((c) => c.paymentMethod));
    return allPaymentMethods(extraPaymentMethods).some((p) => !taken.has(p));
  }, [cards, extraPaymentMethods]);

  /* CRUD */
  const saveEntry = (mode, data, id) => {
    if (mode === "expense") {
      setExpenses((prev) =>
        id
          ? prev.map((e) => (e.id === id ? { ...e, ...data } : e))
          : [...prev, { id: uid(), createdAt: new Date().toISOString(), ...data }]
      );
    } else if (mode === "serasa") {
      setSerasa((prev) =>
        id ? prev.map((s) => (s.id === id ? { ...s, ...data } : s)) : [...prev, { id: uid(), ...data }]
      );
    } else {
      setIncomes((prev) =>
        id
          ? prev.map((i) => (i.id === id ? { ...i, ...data } : i))
          : [...prev, { id: uid(), createdAt: new Date().toISOString(), ...data }]
      );
    }
    setModal(null);
  };
  const removeEntry = (mode, id) => {
    if (mode === "expense") setExpenses((p) => p.filter((e) => e.id !== id));
    else if (mode === "income") setIncomes((p) => p.filter((i) => i.id !== id));
    else if (mode === "wish") setWishlist((p) => p.filter((w) => w.id !== id));
    else if (mode === "serasa") setSerasa((p) => p.filter((s) => s.id !== id));
    else if (mode === "card") setCards((p) => p.filter((c) => c.id !== id));
    else if (mode === "closing") setCardClosings((p) => p.filter((c) => c.id !== id));
    else setShoppingLists((prev) => ({ ...prev, [mode]: prev[mode].filter((it) => it.id !== id) }));
    setConfirmState(null);
  };
  const saveCard = (data, id) => {
    setCards((prev) =>
      id ? prev.map((c) => (c.id === id ? { ...c, ...data } : c)) : [...prev, { id: uid(), ...data }]
    );
    setModal(null);
  };
  const saveClosing = (data, id) => {
    setCardClosings((prev) =>
      id
        ? prev.map((c) => (c.id === id ? { ...c, ...data } : c))
        : [...prev, { id: uid(), createdAt: new Date().toISOString(), ...data }]
    );
    setModal(null);
  };
  const togglePaid = (id) => {
    setExpenses((prev) =>
      prev.map((e) => (e.id === id ? { ...e, paidAt: e.paidAt ? null : todayISO() } : e))
    );
  };
  const moveExpenseToMonth = async (item, targetMonth) => {
    const res = await fetch(`/api/expenses/${encodeURIComponent(item.id)}/month`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ month: targetMonth }),
    });
    if (!res.ok) {
      throw new Error("Não foi possível mover o gasto para o mês selecionado.");
    }
    setExpenses((prev) => prev.filter((e) => e.id !== item.id));
    setModal(null);
  };
  const moveExpense = (category, id, direction) => {
    const group = gastosGrouped.find((g) => g.name === category);
    if (!group) return;
    const items = group.items;
    const idx = items.findIndex((e) => e.id === id);
    const targetIdx = idx + (direction === "up" ? -1 : 1);
    if (idx === -1 || targetIdx < 0 || targetIdx >= items.length) return;
    const reordered = [...items];
    [reordered[idx], reordered[targetIdx]] = [reordered[targetIdx], reordered[idx]];
    const orderById = new Map(reordered.map((e, i) => [e.id, i]));
    setExpenses((prev) =>
      prev.map((e) => (orderById.has(e.id) ? { ...e, order: orderById.get(e.id) } : e))
    );
  };
  const moveExpensePaymentMethod = (category, paymentMethod, id, direction) => {
    const group = gastosGrouped.find((g) => g.name === category);
    if (!group) return;
    const items = group.items
      .filter((e) => (e.paymentMethod || PAYMENT_METHOD_FALLBACK) === paymentMethod)
      .sort((a, b) => {
        if (a.order != null && b.order != null) return a.order - b.order;
        if (a.order != null) return -1;
        if (b.order != null) return 1;
        return (b.value || 0) - (a.value || 0);
      });
    const idx = items.findIndex((e) => e.id === id);
    const targetIdx = idx + (direction === "up" ? -1 : 1);
    if (idx === -1 || targetIdx < 0 || targetIdx >= items.length) return;
    const reordered = [...items];
    [reordered[idx], reordered[targetIdx]] = [reordered[targetIdx], reordered[idx]];
    const orderById = new Map(reordered.map((e, i) => [e.id, i]));
    setExpenses((prev) =>
      prev.map((e) => (orderById.has(e.id) ? { ...e, order: orderById.get(e.id) } : e))
    );
  };
  const toggleSerasaPaid = (id) => {
    setSerasa((prev) =>
      prev.map((s) => (s.id === id ? { ...s, paidAt: s.paidAt ? null : todayISO() } : s))
    );
  };
  const moveSerasaItem = (category, id, direction) => {
    const group = serasaGrouped.find((g) => g.name === category);
    if (!group) return;
    const items = group.items;
    const idx = items.findIndex((s) => s.id === id);
    const targetIdx = idx + (direction === "up" ? -1 : 1);
    if (idx === -1 || targetIdx < 0 || targetIdx >= items.length) return;
    const reordered = [...items];
    [reordered[idx], reordered[targetIdx]] = [reordered[targetIdx], reordered[idx]];
    const orderById = new Map(reordered.map((s, i) => [s.id, i]));
    setSerasa((prev) =>
      prev.map((s) => (orderById.has(s.id) ? { ...s, order: orderById.get(s.id) } : s))
    );
  };
  const saveWish = (data, id) => {
    setWishlist((prev) =>
      id ? prev.map((w) => (w.id === id ? { ...w, ...data } : w)) : [...prev, { id: uid(), doneAt: null, ...data }]
    );
    setModal(null);
  };
  const toggleWishDone = (id) => {
    setWishlist((prev) =>
      prev.map((w) => (w.id === id ? { ...w, doneAt: w.doneAt ? null : todayISO() } : w))
    );
  };
  const moveWish = (id, direction) => {
    const group = wishGrouped.pending.some((w) => w.id === id) ? wishGrouped.pending : wishGrouped.done;
    const idx = group.findIndex((w) => w.id === id);
    const targetIdx = idx + (direction === "up" ? -1 : 1);
    if (idx === -1 || targetIdx < 0 || targetIdx >= group.length) return;
    const reordered = [...group];
    [reordered[idx], reordered[targetIdx]] = [reordered[targetIdx], reordered[idx]];
    const orderById = new Map(reordered.map((w, i) => [w.id, i]));
    setWishlist((prev) =>
      prev.map((w) => (orderById.has(w.id) ? { ...w, order: orderById.get(w.id) } : w))
    );
  };
  const saveShoppingItem = (listType, data, id) => {
    setShoppingLists((prev) => ({
      ...prev,
      [listType]: id
        ? prev[listType].map((it) => (it.id === id ? { ...it, ...data } : it))
        : [...prev[listType], { id: uid(), doneAt: null, ...data }],
    }));
    setModal(null);
  };
  const toggleShoppingItemDone = (listType, id) => {
    setShoppingLists((prev) => ({
      ...prev,
      [listType]: prev[listType].map((it) => (it.id === id ? { ...it, doneAt: it.doneAt ? null : todayISO() } : it)),
    }));
  };
  const clearDoneShoppingItems = (listType) => {
    setShoppingLists((prev) => ({
      ...prev,
      [listType]: prev[listType].filter((it) => !it.doneAt),
    }));
  };
  if (!authChecked) {
    // Mesmo fundo do login: sem isto a página piscava de cinza-claro para verde.
    return (
      <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <LoginBackdrop />
        <div className="relative z-10 flex items-center gap-3 font-brand" style={{ color: "rgba(209,250,229,0.8)" }}>
          <div className="h-5 w-5 rounded-full border-2 border-white/25 border-t-white animate-spin" />
          <span className="text-sm">Verificando sessão…</span>
        </div>
      </div>
    );
  }

  if (!authed) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  if (loadError) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "#F1F4F2" }}>
        <p className="text-sm text-slate-500 text-center max-w-xs">
          Não foi possível carregar seus dados. Verifique sua conexão e recarregue a página.
        </p>
      </div>
    );
  }

  if (!loaded) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#F1F4F2" }}>
        <div className="flex items-center gap-3 text-slate-500">
          <div className="h-5 w-5 rounded-full border-2 border-slate-300 border-t-slate-600 animate-spin" />
          <span className="text-sm">Carregando seu caixa…</span>
        </div>
      </div>
    );
  }

  const section = sectionOfTab(tab);
  const wallets = {
    cltPj: { recebido: cltPjRecebido, gasto: cltPjGasto },
    va: { recebido: vaRecebido, gasto: vaUsado },
  };
  const homeSobra = wallets[wallet].recebido - wallets[wallet].gasto;

  return (
    <div className="min-h-screen tabular-nums font-brand" style={{ background: "#F6F5F1" }}>
      <Sidebar active={section.id} onSelect={goSection} open={menuOpen} onClose={() => setMenuOpen(false)} />

      <div className="lg:pl-[260px]">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-10 pt-5 sm:pt-7 pb-28">
          <TopBar
            onOpenMenu={() => setMenuOpen(true)}
            months={months}
            month={month}
            nextMonthKey={nextMonthKey}
            onChangeMonth={handleMonthChange}
            onAddNextMonth={handleAddNextMonth}
            monthDisabled={switchingMonth || creatingMonth}
            saved={saved}
            hideValues={hideValues}
            onToggleHide={() => setHideValues((v) => !v)}
            email={email}
            onLogout={handleLogout}
          />

          <div className="mt-7 sm:mt-9 mb-6">
            <h1 className="font-display font-semibold text-[34px] sm:text-[46px] leading-[1.05]" style={{ color: "#10251d" }}>
              {tab === "overview" ? "Visão geral" : section.label}
            </h1>
            {tab === "overview" && (
              <p className="mt-1.5 font-display text-[18px] sm:text-[23px]" style={{ color: "#4a6b5d" }}>
                {homeSobra >= 0 ? "Seu mês em equilíbrio" : "Atenção aos gastos deste mês"}
              </p>
            )}
          </div>

          {/* sub-abas da seção (ex.: Lançamentos → Gastos | Ganhos) */}
          {section.tabs.length > 1 && (
            <div className="mb-5 inline-flex flex-wrap gap-1 rounded-full bg-white border border-slate-200 p-1 shadow-sm">
              {section.tabs.map(([id, label]) => (
                <button
                  key={id}
                  onClick={() => setTab(id)}
                  className={
                    "px-4 py-1.5 rounded-full text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-slate-300 " +
                    (tab === id ? "text-white" : "text-slate-500 hover:text-slate-800")
                  }
                  style={tab === id ? { background: "#16382c" } : undefined}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

        {tab === "overview" && (
          <Overview
            byCat={byCat}
            totalGastos={totalGastos}
            expenses={expenses}
            incomes={incomes}
            onEditItem={(mode, item) => setModal({ mode, item })}
            onDeleteItem={(mode, item) => setConfirmState({ kind: "delete", mode, payload: item })}
            wallet={wallet}
            onWalletChange={setWallet}
            wallets={wallets}
            onGo={setTab}
          />
        )}

        {/* as outras abas ficam numa coluna de leitura, sem esticar na tela larga */}
        <div className="max-w-3xl">

        {tab === "gastos" && (
          <Gastos
            grouped={gastosGrouped}
            total={totalGastos}
            extraPaymentMethods={extraPaymentMethods}
            onAdd={() => setModal({ mode: "expense", item: null })}
            onEdit={(item) => setModal({ mode: "expense", item })}
            onDelete={(item) => setConfirmState({ kind: "delete", mode: "expense", payload: item })}
            onTogglePaid={(item) => togglePaid(item.id)}
            onMove={moveExpense}
            onMovePaymentMethod={moveExpensePaymentMethod}
            selecting={selecting}
            isSelected={(id) => selectedKeys.has(selKey("expense", id))}
            onToggleSelect={(id) => toggleSelected("expense", id)}
          />
        )}

        {tab === "ganhos" && (
          <Ganhos
            incomes={incomes}
            total={totalGanhos}
            onAdd={() => setModal({ mode: "income", item: null })}
            onEdit={(item) => setModal({ mode: "income", item })}
            onDelete={(item) => setConfirmState({ kind: "delete", mode: "income", payload: item })}
            selecting={selecting}
            isSelected={(id) => selectedKeys.has(selKey("income", id))}
            onToggleSelect={(id) => toggleSelected("income", id)}
          />
        )}

        {tab === "desejos" && (
          <Desejos
            pending={wishGrouped.pending}
            done={wishGrouped.done}
            onAdd={() => setModal({ mode: "wish", item: null })}
            onEdit={(item) => setModal({ mode: "wish", item })}
            onDelete={(item) => setConfirmState({ kind: "delete", mode: "wish", payload: item })}
            onToggleDone={(item) => toggleWishDone(item.id)}
            onMove={moveWish}
            selecting={selecting}
            isSelected={(id) => selectedKeys.has(selKey("wish", id))}
            onToggleSelect={(id) => toggleSelected("wish", id)}
          />
        )}

        {tab === "mercado" && (
          <ShoppingListTab
            items={shoppingLists.mercado}
            onAdd={() => setModal({ mode: "mercado", item: null })}
            onEdit={(item) => setModal({ mode: "mercado", item })}
            onDelete={(item) => setConfirmState({ kind: "delete", mode: "mercado", payload: item })}
            onToggleDone={(item) => toggleShoppingItemDone("mercado", item.id)}
            onClearDone={() => clearDoneShoppingItems("mercado")}
            selecting={selecting}
            isSelected={(id) => selectedKeys.has(selKey("mercado", id))}
            onToggleSelect={(id) => toggleSelected("mercado", id)}
          />
        )}

        {tab === "farmacia" && (
          <ShoppingListTab
            items={shoppingLists.farmacia}
            onAdd={() => setModal({ mode: "farmacia", item: null })}
            onEdit={(item) => setModal({ mode: "farmacia", item })}
            onDelete={(item) => setConfirmState({ kind: "delete", mode: "farmacia", payload: item })}
            onToggleDone={(item) => toggleShoppingItemDone("farmacia", item.id)}
            selecting={selecting}
            isSelected={(id) => selectedKeys.has(selKey("farmacia", id))}
            onToggleSelect={(id) => toggleSelected("farmacia", id)}
          />
        )}

        {tab === "serasa" && (
          <Serasa
            grouped={serasaGrouped}
            total={totalSerasa}
            onAdd={() => setModal({ mode: "serasa", item: null })}
            onEdit={(item) => setModal({ mode: "serasa", item })}
            onDelete={(item) => setConfirmState({ kind: "delete", mode: "serasa", payload: item })}
            onTogglePaid={(item) => toggleSerasaPaid(item.id)}
            onMove={moveSerasaItem}
            selecting={selecting}
            isSelected={(id) => selectedKeys.has(selKey("serasa", id))}
            onToggleSelect={(id) => toggleSelected("serasa", id)}
          />
        )}

        {/* sem props de seleção: saldo de cartão não é item de fluxo de caixa, então
            nada entra em SELECTION_SOURCES — uma chave `card:` quebraria selectionStats */}
        {tab === "cartoes" && (
          <Cartoes
            cards={cardsWithUsage}
            unregistered={unregisteredMethodSpend}
            month={month}
            canAdd={canAddCard}
            onAdd={(presetMethod) =>
              setModal({
                mode: "card",
                item: null,
                presetMethod: typeof presetMethod === "string" ? presetMethod : undefined,
              })
            }
            onEdit={(item) => setModal({ mode: "card", item })}
            onDelete={(item) => setConfirmState({ kind: "delete", mode: "card", payload: item })}
          />
        )}

        {/* Sem props de seleção: fechamento não é item de fluxo de caixa, igual a Cartões. */}
        {tab === "fechamento" && (
          <Fechamento
            items={cardClosings}
            month={month}
            onAdd={() => setModal({ mode: "closing", item: null })}
            onEdit={(item) => setModal({ mode: "closing", item })}
            onDelete={(item) => setConfirmState({ kind: "delete", mode: "closing", payload: item })}
          />
        )}

        {tab === "config" && (
          <SettingsSection email={email} onPair={() => setModal({ mode: "pair" })} onLogout={handleLogout} />
        )}
        </div>
        </div>
      </div>

      {/* calculadora de seleção — z-40 fica sob o Overlay dos modais (z-50) */}
      {!selecting && tab !== "config" && (
        <div className="fixed bottom-0 inset-x-0 lg:left-[260px] z-40 pointer-events-none">
          {/* pb maior no mobile: 20px deixavam o botao atras da barra do navegador */}
          <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-10 pb-8 sm:pb-5 flex justify-end">
            <button
              type="button"
              onClick={() => setSelecting(true)}
              title="Somar itens"
              aria-label="Somar itens"
              className="pointer-events-auto touch-manipulation h-16 w-16 sm:h-14 sm:w-14 rounded-2xl text-white shadow-lg flex items-center justify-center hover:opacity-90 active:scale-95 transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-400"
              style={{ background: "#16382c" }}
            >
              <Calculator className="h-7 w-7 sm:h-[22px] sm:w-[22px]" />
            </button>
          </div>
        </div>
      )}

      {selecting && (
        <div className="fixed bottom-0 inset-x-0 lg:left-[260px] z-40 bg-white border-t border-slate-200 shadow-[0_-4px_16px_rgba(15,23,42,0.08)]">
          <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-10 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] text-slate-500 truncate">
                {selectionStats.count === 0 ? "Marque itens para somar" : selectionLabel}
              </p>
              <p
                className={
                  "text-lg font-bold tabular-nums leading-tight " +
                  (selectionStats.mixed
                    ? selectionStats.net >= 0
                      ? "text-emerald-600"
                      : "text-rose-600"
                    : selectionStats.inflow > 0
                    ? "text-emerald-600"
                    : "text-slate-800")
                }
              >
                <span className="text-[11px] font-medium text-slate-500 mr-1.5">
                  {selectionStats.mixed ? "Saldo" : "Total"}
                </span>
                {selectionStats.mixed
                  ? `${selectionStats.net >= 0 ? "+ " : "− "}${fmt(Math.abs(selectionStats.net))}`
                  : fmt(selectionStats.inflow > 0 ? selectionStats.inflow : selectionStats.outflow)}
              </p>
              {selectionStats.mixed && (
                <p className="text-[11px] text-slate-500 tabular-nums flex items-center gap-2.5 leading-tight">
                  <span className="flex items-center gap-0.5">
                    <ArrowUpRight size={11} className="text-emerald-600" />
                    entra {fmt(selectionStats.inflow)}
                  </span>
                  <span className="flex items-center gap-0.5">
                    <ArrowDownRight size={11} className="text-rose-500" />
                    sai {fmt(selectionStats.outflow)}
                  </span>
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={clearSelection}
              disabled={selectionStats.count === 0}
              className="shrink-0 text-xs font-medium text-slate-500 px-2.5 py-2 rounded-lg hover:text-slate-800 hover:bg-slate-100 transition-colors disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-300"
            >
              Limpar
            </button>
            <button
              type="button"
              onClick={exitSelection}
              title="Fechar calculadora"
              aria-label="Fechar calculadora"
              className="shrink-0 h-9 w-9 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center hover:text-slate-800 hover:bg-slate-200 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-300"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {modal && modal.mode === "wish" && (
        <WishModal
          item={modal.item}
          onClose={() => setModal(null)}
          onSave={saveWish}
        />
      )}

      {modal && (modal.mode === "mercado" || modal.mode === "farmacia") && (
        <ShoppingItemModal
          item={modal.item}
          onClose={() => setModal(null)}
          onSave={(data, id) => saveShoppingItem(modal.mode, data, id)}
        />
      )}

      {modal && modal.mode === "pair" && <PairModal onClose={() => setModal(null)} />}

      {modal && modal.mode === "card" && (
        <CardModal
          item={modal.item}
          presetMethod={modal.presetMethod}
          cards={cards}
          extraPaymentMethods={extraPaymentMethods}
          onClose={() => setModal(null)}
          onSave={saveCard}
        />
      )}

      {modal && modal.mode === "closing" && (
        <CardClosingModal item={modal.item} onClose={() => setModal(null)} onSave={saveClosing} />
      )}

      {modal && (modal.mode === "expense" || modal.mode === "income" || modal.mode === "serasa") && (
        <EntryModal
          mode={modal.mode}
          item={modal.item}
          extraCategories={modal.mode === "serasa" ? extraSerasaCategories : extraExpenseCategories}
          extraPaymentMethods={extraPaymentMethods}
          onClose={() => setModal(null)}
          onSave={saveEntry}
          months={months}
          currentMonth={month}
          onMoveMonth={moveExpenseToMonth}
        />
      )}

      {confirmState && (
        <ConfirmModal
          state={confirmState}
          onCancel={() => setConfirmState(null)}
          onConfirm={() => removeEntry(confirmState.mode, confirmState.payload.id)}
        />
      )}
    </div>
  );
}

/* ---------- login ---------- */
// Fundo da tela de entrada (mock login-premium-variante-1): verde-escuro com dois
// brilhos nos cantos e um gráfico de linha decorativo. "slice" e não "none" no SVG
// para os pontos continuarem redondos em qualquer proporção de tela.
const CHART_DOTS = [
  [121, 339],
  [273, 299],
  [806, 211],
  [924, 106],
];

function LoginBackdrop() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0"
      style={{
        background:
          "radial-gradient(ellipse at 8% 0%, rgba(52,140,98,0.45) 0%, transparent 40%)," +
          "radial-gradient(ellipse at 96% 88%, rgba(52,140,98,0.38) 0%, transparent 32%)," +
          "linear-gradient(160deg, #0d3326 0%, #0b2d22 45%, #07211a 100%)",
      }}
    >
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 1000 560" preserveAspectRatio="xMidYMid slice">
        {CHART_DOTS.map(([x, y]) => (
          <line key={`v${x}`} x1={x} y1={y} x2={x} y2={560} stroke="rgba(74,160,115,0.12)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
        ))}
        <path
          d="M0,422 C60,390 90,345 121,339 S170,352 200,352 S250,320 273,299 C330,250 420,280 520,300 S640,300 690,292 C740,280 770,225 806,211 S850,200 870,190 S900,130 924,106 S980,60 1000,55"
          fill="none"
          stroke="rgba(74,160,115,0.35)"
          strokeWidth="1.5"
          vectorEffect="non-scaling-stroke"
        />
        {CHART_DOTS.map(([x, y]) => (
          <circle key={`d${x}`} cx={x} cy={y} r="5" fill="rgba(74,160,115,0.55)" />
        ))}
      </svg>
    </div>
  );
}

function LoginScreen({ onLogin }) {
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  const buttonRef = useRef(null);
  // Sempre visível (o buttonRef fica "hidden" até o botão carregar): é dele que
  // sai a largura para o botão do Google ocupar o cartão, como no mock.
  const slotRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    const handleCredentialResponse = async (response) => {
      setError("");
      try {
        const res = await fetch("/api/auth/google", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ credential: response.credential }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Falha ao entrar com o Google.");
        }
        onLogin();
      } catch (err) {
        setError(err.message || "Falha ao entrar com o Google.");
      }
    };

    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

    const init = () => {
      if (cancelled) return;
      if (!clientId) {
        setError("Login com Google não configurado (defina VITE_GOOGLE_CLIENT_ID).");
        return;
      }
      if (!window.google?.accounts?.id) {
        setTimeout(init, 200);
        return;
      }
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: handleCredentialResponse,
      });
      if (buttonRef.current) {
        // O Google limita a largura a 400px; abaixo disso, acompanha o cartão.
        const width = Math.min(400, Math.max(200, slotRef.current?.offsetWidth || 320));
        window.google.accounts.id.renderButton(buttonRef.current, {
          type: "standard",
          theme: "outline",
          size: "large",
          width,
          text: "continue_with",
          shape: "rectangular",
          logo_alignment: "center",
          locale: "pt-BR",
        });
      }
      setReady(true);
    };

    init();
    return () => {
      cancelled = true;
      if (buttonRef.current) buttonRef.current.innerHTML = "";
    };
  }, [onLogin]);

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden px-4 py-10">
      <LoginBackdrop />

      <main
        className="relative z-10 w-full max-w-[520px] rounded-[28px] px-6 py-10 sm:px-12 sm:py-12 text-center font-brand"
        style={{
          background: "#FAF9F7",
          boxShadow: "0 40px 90px -30px rgba(0,0,0,0.65), 0 10px 30px -10px rgba(0,0,0,0.35)",
        }}
      >
        <div
          className="relative mx-auto h-[72px] w-[72px] rounded-[20px] flex items-center justify-center text-white overflow-hidden"
          style={{
            background: "linear-gradient(145deg, #0f2e25 0%, #16382c 45%, #2a6b4f 100%)",
            boxShadow: "0 12px 24px -10px rgba(15,46,37,0.6)",
          }}
        >
          {/* realce de luz no ícone, como no mock */}
          <span
            aria-hidden="true"
            className="absolute inset-0"
            style={{ background: "radial-gradient(circle at 25% 85%, rgba(110,200,150,0.35), transparent 55%)" }}
          />
          <DollarSign size={34} strokeWidth={2.25} className="relative" />
        </div>

        <p className="mt-5 text-[24px] sm:text-[26px] font-bold tracking-tight" style={{ color: "#0f2a22" }}>
          Meu financeiro
        </p>

        <h1
          className="mt-6 mx-auto max-w-[420px] font-display font-semibold text-[28px] sm:text-[40px] leading-[1.12] text-balance"
          style={{ color: "#10251d" }}
        >
          Tenha mais controle sobre o seu dinheiro.
        </h1>
        <p className="mt-3 text-[15px] sm:text-[17px] text-slate-500">Organize seus ganhos e gastos com clareza.</p>

        <div className="mt-9 flex justify-center">
          <div ref={slotRef} className="w-full max-w-[400px] min-h-[44px] flex items-center justify-center">
            {!ready && !error && (
              <div className="h-4 w-4 rounded-full border-2 border-slate-300 border-t-slate-600 animate-spin" />
            )}
            <div ref={buttonRef} className={ready ? "flex justify-center" : "hidden"} />
          </div>
        </div>
        {error && <p className="text-xs text-rose-600 mt-3">{error}</p>}

        <p className="mt-7 text-[13px] text-slate-400">Acesso restrito à conta autorizada.</p>
      </main>
    </div>
  );
}

/* ---------- subcomponentes ---------- */
const NEW_CATEGORY = "__new_category__";
const NEW_PAYMENT_METHOD = "__new_payment_method__";

function Card({ children, className = "" }) {
  return (
    <div className={"bg-white rounded-2xl border border-slate-200 shadow-sm " + className}>{children}</div>
  );
}

/* ---------- estrutura da web: menu lateral e barra superior ---------- */
function SidebarNav({ active, onSelect }) {
  const item = (s) => {
    const Icon = s.icon;
    const on = active === s.id;
    return (
      <button
        key={s.id}
        onClick={() => onSelect(s)}
        aria-current={on ? "page" : undefined}
        className={
          "w-full flex items-center gap-4 px-4 py-3.5 rounded-xl text-[15px] transition-colors focus:outline-none focus:ring-2 focus:ring-white/30 " +
          (on ? "text-white" : "text-emerald-50/75 hover:text-white hover:bg-white/5")
        }
        style={on ? { background: "rgba(255,255,255,0.09)" } : undefined}
      >
        <Icon size={22} strokeWidth={on ? 2.25 : 1.75} />
        <span className={on ? "font-semibold" : ""}>{s.label}</span>
      </button>
    );
  };
  return (
    <div className="flex h-full flex-col px-4 py-7">
      <div className="flex items-center gap-3 px-2 mb-10">
        <span
          className="h-11 w-11 rounded-xl flex items-center justify-center text-white shrink-0"
          style={{ background: "linear-gradient(145deg,#1d5a43 0%,#16382c 60%,#0f2e25 100%)", boxShadow: "0 6px 16px -6px rgba(0,0,0,0.5)" }}
        >
          <DollarSign size={22} strokeWidth={2.25} />
        </span>
        <span className="text-[19px] font-bold text-white tracking-tight">Meu financeiro</span>
      </div>
      <nav className="space-y-1.5">{SECTIONS.map(item)}</nav>
      <div className="mt-auto pt-6 border-t border-white/10">{item(SETTINGS_SECTION)}</div>
    </div>
  );
}

const SIDEBAR_BG = "linear-gradient(180deg,#0f3a2c 0%,#0d3326 50%,#0a2a20 100%)";

// Fixo a partir de lg; abaixo disso, o mesmo menu abre como gaveta.
function Sidebar({ active, onSelect, open, onClose }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <>
      <aside className="hidden lg:block fixed inset-y-0 left-0 w-[260px] z-30" style={{ background: SIDEBAR_BG }}>
        <SidebarNav active={active} onSelect={onSelect} />
      </aside>
      {open && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-slate-900/50" onClick={onClose} />
          <aside className="absolute inset-y-0 left-0 w-[260px] shadow-2xl" style={{ background: SIDEBAR_BG }}>
            <button
              onClick={onClose}
              aria-label="Fechar menu"
              className="absolute right-3 top-3 h-9 w-9 rounded-lg text-emerald-50/80 hover:bg-white/10 flex items-center justify-center"
            >
              <X size={18} />
            </button>
            <SidebarNav active={active} onSelect={onSelect} />
          </aside>
        </div>
      )}
    </>
  );
}

// ‹ Outubro de 2026 › — as setas andam pelos meses que existem; o nome abre a
// lista completa com "+ Adicionar" o próximo mês (substitui o antigo <select>).
function MonthNavigator({ months, month, nextMonthKey, onChange, onAddNext, disabled }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const idx = months.indexOf(month);
  const prev = idx > 0 ? months[idx - 1] : null;
  const next = idx >= 0 && idx < months.length - 1 ? months[idx + 1] : null;

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const arrow =
    "h-11 w-9 sm:w-11 flex items-center justify-center text-slate-600 rounded-2xl hover:bg-slate-50 disabled:opacity-30 disabled:hover:bg-transparent focus:outline-none focus:ring-2 focus:ring-slate-300";
  return (
    <div ref={ref} className="relative flex items-center bg-white rounded-2xl border border-slate-200/80 shadow-sm">
      <button className={arrow} onClick={() => onChange(prev)} disabled={!prev || disabled} aria-label="Mês anterior">
        <ChevronLeft size={20} />
      </button>
      <button
        onClick={() => setOpen((o) => !o)}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="h-11 px-1 sm:px-3 min-w-[118px] sm:min-w-[170px] text-[14px] sm:text-[15px] font-medium text-slate-800 hover:bg-slate-50 rounded-xl disabled:opacity-60 disabled:cursor-wait focus:outline-none focus:ring-2 focus:ring-slate-300"
      >
        {monthLabel(month)}
      </button>
      <button className={arrow} onClick={() => onChange(next)} disabled={!next || disabled} aria-label="Próximo mês">
        <ChevronRight size={20} />
      </button>
      {open && (
        <div
          className="absolute left-0 top-full mt-2 z-40 w-64 bg-white rounded-2xl border border-slate-200 shadow-lg py-2 max-h-80 overflow-y-auto"
          role="listbox"
        >
          {months.map((m) => (
            <button
              key={m}
              role="option"
              aria-selected={m === month}
              onClick={() => {
                setOpen(false);
                onChange(m);
              }}
              className={
                "w-full flex items-center justify-between px-4 py-2.5 text-sm hover:bg-slate-50 " +
                (m === month ? "font-semibold text-slate-800" : "text-slate-600")
              }
            >
              {monthLabel(m)}
              {m === month && <Check size={15} className="text-emerald-700" />}
            </button>
          ))}
          <div className="my-1 border-t border-slate-100" />
          <button
            onClick={() => {
              setOpen(false);
              onAddNext();
            }}
            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-emerald-800 hover:bg-emerald-50"
          >
            <Plus size={15} /> Adicionar {monthLabel(nextMonthKey)}
          </button>
        </div>
      )}
    </div>
  );
}

const initialsOf = (email) => (email.split("@")[0].replace(/[^a-zA-Z]/g, "").slice(0, 2) || "MF").toUpperCase();

function TopBar({ onOpenMenu, months, month, nextMonthKey, onChangeMonth, onAddNextMonth, monthDisabled, saved, hideValues, onToggleHide, email, onLogout }) {
  const square = "h-11 w-11 shrink-0 rounded-xl flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-slate-300";
  return (
    <div className="flex items-center gap-2 sm:gap-3">
      <button onClick={onOpenMenu} aria-label="Abrir menu" className={square + " lg:hidden bg-white border border-slate-200/80 shadow-sm text-slate-600"}>
        <Menu size={20} />
      </button>
      <MonthNavigator
        months={months}
        month={month}
        nextMonthKey={nextMonthKey}
        onChange={onChangeMonth}
        onAddNext={onAddNextMonth}
        disabled={monthDisabled}
      />
      <div className="ml-auto flex items-center gap-2 sm:gap-4">
        <span
          className={"hidden sm:flex items-center gap-1.5 text-[15px] text-slate-600 transition-opacity duration-300 " + (saved ? "opacity-100" : "opacity-0")}
          aria-live="polite"
        >
          <CheckCircle2 size={20} className="text-emerald-600" /> Salvo
        </span>
        <div className="hidden sm:block h-8 w-px bg-slate-200" />
        <button
          onClick={onToggleHide}
          title={hideValues ? "Mostrar valores" : "Ocultar valores"}
          aria-label={hideValues ? "Mostrar valores" : "Ocultar valores"}
          aria-pressed={hideValues}
          className={square + " bg-white border border-slate-200/80 shadow-sm text-slate-700 hover:border-slate-300"}
        >
          {hideValues ? <EyeOff size={20} /> : <Eye size={20} />}
        </button>
        <span
          title={email}
          className="hidden sm:flex h-12 w-12 shrink-0 rounded-full items-center justify-center text-white text-[15px] font-bold"
          style={{ background: "#0f2e25" }}
        >
          {initialsOf(email)}
        </span>
        <button onClick={onLogout} title="Sair" aria-label="Sair" className={square + " text-slate-700 hover:bg-white"}>
          <LogOut size={21} />
        </button>
      </div>
    </div>
  );
}

function HomeCard({ children, className = "" }) {
  return (
    <section
      className={"rounded-[22px] bg-white border border-slate-200/70 p-5 sm:p-6 " + className}
      style={{ boxShadow: "0 1px 2px rgba(16,37,29,0.04), 0 10px 28px -16px rgba(16,37,29,0.18)" }}
    >
      {children}
    </section>
  );
}

function HomeCardHeader({ title, action, onAction, chevronOnly }) {
  return (
    <div className="flex items-center justify-between gap-3 mb-5">
      <h2 className="font-display font-semibold text-[21px] sm:text-[22px] leading-tight" style={{ color: "#10251d" }}>
        {title}
      </h2>
      {onAction && (
        <button
          onClick={onAction}
          aria-label={chevronOnly ? `Ver ${title.toLowerCase()}` : undefined}
          className="shrink-0 whitespace-nowrap flex items-center gap-1 text-[14px] sm:text-[15px] font-medium rounded-lg px-1.5 py-1 hover:bg-amber-50 focus:outline-none focus:ring-2 focus:ring-amber-200"
          style={{ color: chevronOnly ? "#10251d" : "#a9822f" }}
        >
          {action}
          <ChevronRight size={chevronOnly ? 22 : 17} />
        </button>
      )}
    </div>
  );
}

/* ---------- home ("Visão geral") ---------- */
const INCOME_GREEN = "#1F6B4C";
const EXPENSE_RED = "#BF5B3D";
const DONUT_COLORS = ["#1F5C45", "#8A8F4E", "#D4A84B", "#C9785A"];

function SobraCard({ wallet, onWalletChange, wallets }) {
  const { recebido, gasto } = wallets[wallet];
  const sobra = recebido - gasto;
  const pct = recebido > 0 ? Math.round((gasto / recebido) * 100) : gasto > 0 ? 100 : 0;
  const bar = Math.min(100, pct);
  const empty = recebido === 0 && gasto === 0;
  const message = empty
    ? "Nenhum lançamento nesta carteira neste mês."
    : pct <= 80
    ? `Você destinou ${pct}% da sua renda e manteve uma ótima sobra este mês.`
    : pct <= 100
    ? `Você já destinou ${pct}% da sua renda — atenção ao restante do mês.`
    : "Seus gastos passaram do que entrou neste mês.";
  const barColor = pct <= 80 ? "linear-gradient(90deg,#5fb98a,#7fd3a3)" : pct <= 100 ? "#D4A84B" : "#C9785A";

  const toggle = (id, label) => (
    <button
      onClick={() => onWalletChange(id)}
      aria-pressed={wallet === id}
      className={
        "px-3.5 sm:px-4 py-2 rounded-lg text-[13px] sm:text-[14px] transition-colors focus:outline-none focus:ring-2 focus:ring-amber-200/60 " +
        (wallet === id ? "font-medium" : "text-emerald-50/85 hover:text-white")
      }
      style={wallet === id ? { color: "#f3dfae", boxShadow: "inset 0 0 0 1.5px #d4a84b" } : undefined}
    >
      {label}
    </button>
  );

  const stat = (up, label, value) => (
    <div className="flex items-center gap-3 sm:gap-4 min-w-0">
      <span
        className="h-11 w-11 sm:h-12 sm:w-12 shrink-0 rounded-full flex items-center justify-center text-white"
        style={{ background: up ? "#2c7a57" : "#c0603f" }}
      >
        {up ? <ArrowUpRight size={20} className="-rotate-45" /> : <ArrowDownRight size={20} className="rotate-45" />}
      </span>
      <div className="min-w-0">
        <p className="text-[13px] sm:text-[14px] text-emerald-50/80">{label}</p>
        <p className="font-display font-semibold text-[19px] sm:text-[22px] leading-tight truncate">{fmt(value)}</p>
      </div>
    </div>
  );

  return (
    <section
      className="relative overflow-hidden rounded-[22px] p-6 sm:p-8 text-white"
      style={{
        background:
          "radial-gradient(ellipse at 85% 10%, rgba(64,150,108,0.28) 0%, transparent 45%)," +
          "linear-gradient(135deg,#0d3a2b 0%,#0b3125 55%,#082a20 100%)",
        boxShadow: "0 18px 40px -22px rgba(8,42,32,0.75)",
      }}
    >
      {/* linha de gráfico decorativa, como no mock */}
      <svg aria-hidden="true" className="pointer-events-none absolute right-0 top-10 h-48 w-2/3 opacity-60" viewBox="0 0 400 180" preserveAspectRatio="none">
        <path
          d="M0,170 C60,150 90,120 140,110 S230,70 260,62 S330,20 400,0"
          fill="none"
          stroke="rgba(110,200,150,0.35)"
          strokeWidth="1.5"
          vectorEffect="non-scaling-stroke"
        />
        {[
          [140, 110],
          [260, 62],
          [345, 22],
        ].map(([x, y]) => (
          <g key={x}>
            <line x1={x} y1={y} x2={x} y2={180} stroke="rgba(110,200,150,0.12)" vectorEffect="non-scaling-stroke" />
            <circle cx={x} cy={y} r="3.5" fill="rgba(110,200,150,0.55)" />
          </g>
        ))}
      </svg>

      <div className="relative">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display font-semibold text-[21px] sm:text-[22px]">Sobra do mês</h2>
          <div className="flex items-center gap-1 rounded-xl border border-white/15 p-1">
            {toggle("cltPj", "CLT/PJ")}
            {toggle("va", "Vale alimentação")}
          </div>
        </div>

        <p
          className="mt-5 font-display font-semibold text-[38px] sm:text-[50px] leading-none"
          style={sobra < 0 ? { color: "#f2b8a2" } : undefined}
        >
          {fmt(sobra)}
        </p>
        <p className="mt-2 text-[16px] sm:text-[19px] text-emerald-50/80">
          {sobra < 0 ? "Acima do que foi recebido" : "Disponível para seus planos"}
        </p>

        <div className="mt-7 sm:mt-8 flex flex-col sm:flex-row sm:items-center gap-5 sm:gap-10">
          {stat(true, "Recebido", recebido)}
          <div className="hidden sm:block h-12 w-px bg-white/15" />
          {stat(false, "Gastos", gasto)}
        </div>

        <div className="mt-7 sm:mt-8 flex items-center gap-4">
          <div
            className="h-3 flex-1 rounded-full overflow-hidden"
            style={{ background: "rgba(255,255,255,0.1)" }}
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Parte da renda já gasta"
          >
            <div className="h-full rounded-full" style={{ width: `${bar}%`, background: barColor }} />
          </div>
          <span className="text-[16px] sm:text-[18px] text-emerald-50/85 tabular-nums">{pct}%</span>
        </div>
        <p className="mt-4 text-[14px] sm:text-[15px] text-emerald-50/80">{message}</p>
      </div>
    </section>
  );
}

// Ganhos a receber e contas a pagar dos próximos 7 dias (do mês carregado). Gastos
// vencidos e não pagos entram no topo: é o alerta que o antigo aviso vermelho dava.
function UpcomingCard({ expenses, incomes, onGo }) {
  const items = useMemo(() => {
    const today = todayISO();
    const limit = addDaysISO(today, 7);
    const byDate = (a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0);
    const inc = incomes
      .filter((i) => i.receiptDate && i.receiptDate >= today && i.receiptDate <= limit)
      .map((i) => ({
        kind: "income",
        id: i.id,
        date: i.receiptDate,
        title: i.source,
        subtitle: ["Recebimento", i.cltPjIncome ? "CLT/PJ" : i.voucherIncome ? "Vale alimentação" : null].filter(Boolean).join(" · "),
        value: i.value,
      }));
    const exp = expenses
      .filter((e) => !e.paidAt && e.dueDate && e.dueDate <= limit)
      .map((e) => ({
        kind: "expense",
        id: e.id,
        date: e.dueDate,
        overdue: e.dueDate < today,
        title: e.description,
        subtitle: e.category,
        category: e.category,
        value: e.value,
      }));
    const overdue = exp.filter((x) => x.overdue).sort(byDate);
    const upcoming = [...inc, ...exp.filter((x) => !x.overdue)].sort(byDate);
    return [...overdue, ...upcoming].slice(0, 5);
  }, [expenses, incomes]);

  return (
    <HomeCard>
      <HomeCardHeader title="Próximos 7 dias" onAction={() => onGo("gastos")} chevronOnly />
      {items.length === 0 ? (
        <p className="text-sm text-slate-400 py-6 text-center">Nada previsto para os próximos 7 dias.</p>
      ) : (
        <ol className="relative">
          {/* fio da linha do tempo, passando pelos pontos */}
          <span aria-hidden="true" className="hidden sm:block absolute left-[71px] top-6 bottom-6 w-px bg-slate-200" />
          {items.map((it) => {
            const income = it.kind === "income";
            const Icon = income ? HandCoins : catMeta(it.category).icon;
            const dot = income ? INCOME_GREEN : it.overdue ? "#C9785A" : "#C89B3C";
            return (
              <li key={`${it.kind}-${it.id}`} className="relative flex items-center gap-3 py-3">
                <span
                  className={"w-[52px] shrink-0 text-[13px] sm:text-[14px] " + (it.overdue ? "font-medium" : "text-slate-500")}
                  style={it.overdue ? { color: EXPENSE_RED } : undefined}
                >
                  {formatDayMonth(it.date)}
                </span>
                <span className="hidden sm:block relative z-10 h-3.5 w-3.5 shrink-0 rounded-full ring-4 ring-white" style={{ background: dot }} />
                <span
                  className="h-10 w-10 sm:h-11 sm:w-11 shrink-0 rounded-full flex items-center justify-center"
                  style={income ? { background: "#e6f2ea", color: INCOME_GREEN } : { background: "#fbece6", color: EXPENSE_RED }}
                >
                  <Icon size={20} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-display text-[16px] sm:text-[17px] leading-tight line-clamp-2 break-words" style={{ color: "#10251d" }}>
                    {it.title}
                  </p>
                  <p className="text-[13px] text-slate-500 truncate">
                    {it.overdue ? <span style={{ color: EXPENSE_RED }}>Vencido · </span> : null}
                    {it.subtitle}
                  </p>
                </div>
                <span className="shrink-0 text-[15px] sm:text-[16px] xl:text-[17px] font-medium tabular-nums" style={{ color: income ? INCOME_GREEN : EXPENSE_RED }}>
                  {income ? "+ " : "− "}
                  {fmt(it.value)}
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </HomeCard>
  );
}

// Rosca em SVG próprio: as 3 maiores categorias + "Outros" (só quando há mais de
// 4). Paleta fixa por posição, a do mock — cor de série, não da categoria.
function SpendingCard({ byCat, totalGastos, onGo }) {
  const slices = useMemo(() => {
    const base =
      byCat.length <= 4
        ? byCat.map((c) => ({ name: c.name, value: c.value }))
        : [
            ...byCat.slice(0, 3).map((c) => ({ name: c.name, value: c.value })),
            { name: "Outros", value: byCat.slice(3).reduce((s, c) => s + c.value, 0) },
          ];
    // % inteiros que somam exatamente 100: o resto do arredondamento vai na última.
    let acc = 0;
    return base.map((s, i) => {
      const pct = i === base.length - 1 ? 100 - acc : Math.round((s.value / (totalGastos || 1)) * 100);
      acc += pct;
      return { ...s, pct, color: DONUT_COLORS[i] };
    });
  }, [byCat, totalGastos]);

  const R = 80;
  const C = 2 * Math.PI * R;
  let offset = 0;

  return (
    <HomeCard>
      <HomeCardHeader title="Para onde vai o dinheiro" action="Ver todas" onAction={() => onGo("gastos")} />
      {slices.length === 0 ? (
        <p className="text-sm text-slate-400 py-10 text-center">Sem gastos ainda neste mês.</p>
      ) : (
        <div className="flex flex-col sm:flex-row items-center gap-8 sm:gap-10">
          <div className="relative h-56 w-56 sm:h-64 sm:w-64 shrink-0">
            <svg viewBox="0 0 200 200" className="h-full w-full" role="img" aria-label="Distribuição dos gastos por categoria">
              {slices.map((s) => {
                const len = (s.value / (totalGastos || 1)) * C;
                const gap = slices.length > 1 ? 1.6 : 0; // fio branco entre as fatias
                const el = (
                  <circle
                    key={s.name}
                    cx="100"
                    cy="100"
                    r={R}
                    fill="none"
                    stroke={s.color}
                    strokeWidth="34"
                    strokeDasharray={`${Math.max(0, len - gap)} ${C}`}
                    strokeDashoffset={-offset}
                    transform="rotate(-90 100 100)"
                  />
                );
                offset += len;
                return el;
              })}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="font-display font-semibold text-[18px] sm:text-[20px] leading-tight" style={{ color: "#10251d" }}>
                {fmt(totalGastos)}
              </span>
              <span className="text-[14px] text-slate-500">em gastos</span>
            </div>
          </div>
          <ul className="w-full space-y-4">
            {slices.map((s) => (
              <li key={s.name} className="flex items-center gap-3 text-[15px] sm:text-[16px]">
                <span className="h-4 w-4 shrink-0 rounded-full" style={{ background: s.color }} />
                <span className="flex-1 min-w-0 truncate text-slate-700">{s.name}</span>
                <span className="tabular-nums text-slate-700">{s.pct}%</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </HomeCard>
  );
}

function RecentCard({ expenses, incomes, onEditItem, onDeleteItem, onGo }) {
  const items = useMemo(
    () =>
      [
        ...expenses.map((e) => ({ kind: "expense", label: e.description, meta: e.category, item: e })),
        ...incomes.map((i) => ({
          kind: "income",
          label: i.source,
          meta: i.cltPjIncome ? "CLT/PJ" : i.voucherIncome ? "Vale alimentação" : "Ganho",
          item: i,
        })),
      ]
        .filter((it) => it.item.createdAt)
        .sort((a, b) => (a.item.createdAt < b.item.createdAt ? 1 : -1))
        .slice(0, 5),
    [expenses, incomes]
  );

  return (
    <HomeCard>
      <HomeCardHeader title="Adicionados recentemente" action="Ver lançamentos" onAction={() => onGo("gastos")} />
      {items.length === 0 ? (
        <p className="text-sm text-slate-400 py-10 text-center">Nenhum item adicionado ainda neste mês.</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {items.map((it) => {
            const income = it.kind === "income";
            const meta = income ? null : catMeta(it.item.category);
            const Icon = income ? Landmark : meta.icon;
            const color = income ? INCOME_GREEN : meta.color;
            const edit = () => onEditItem(it.kind, it.item);
            return (
              <li key={`${it.kind}-${it.item.id}`} className="group">
                {/* clicar na linha edita, como antes; excluir aparece ao passar o mouse */}
                <div
                  role="button"
                  tabIndex={0}
                  onClick={edit}
                  onKeyDown={(e) => {
                    if (e.target !== e.currentTarget) return;
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      edit();
                    }
                  }}
                  className="flex items-center gap-3 py-3 -mx-2 px-2 rounded-xl cursor-pointer hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-200"
                >
                  <span
                    className="h-10 w-10 sm:h-11 sm:w-11 shrink-0 rounded-full flex items-center justify-center"
                    style={{ background: color + "1F", color }}
                  >
                    <Icon size={20} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-display text-[16px] sm:text-[17px] leading-tight line-clamp-2 break-words" style={{ color: "#10251d" }}>
                      {it.label}
                    </p>
                    <p className="text-[13px] text-slate-500 truncate">
                      {formatRelativeTime(it.item.createdAt)} · {it.meta}
                    </p>
                  </div>
                  <span className="shrink-0 text-[15px] sm:text-[16px] xl:text-[17px] font-medium tabular-nums" style={{ color: income ? INCOME_GREEN : EXPENSE_RED }}>
                    {income ? "+ " : "− "}
                    {fmt(it.item.value)}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteItem(it.kind, it.item);
                    }}
                    title="Excluir"
                    aria-label={`Excluir ${it.label}`}
                    className="h-8 w-8 shrink-0 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity focus:outline-none focus:ring-2 focus:ring-rose-300"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </HomeCard>
  );
}

function Overview({ byCat, totalGastos, expenses, incomes, onEditItem, onDeleteItem, wallet, onWalletChange, wallets, onGo }) {
  return (
    <div className="grid grid-cols-1 gap-5 lg:gap-6 xl:grid-cols-[minmax(0,1.32fr)_minmax(0,1fr)] [&>*]:min-w-0">
      <SobraCard wallet={wallet} onWalletChange={onWalletChange} wallets={wallets} />
      <UpcomingCard expenses={expenses} incomes={incomes} onGo={onGo} />
      <SpendingCard byCat={byCat} totalGastos={totalGastos} onGo={onGo} />
      <RecentCard expenses={expenses} incomes={incomes} onEditItem={onEditItem} onDeleteItem={onDeleteItem} onGo={onGo} />
    </div>
  );
}

function SettingsSection({ email, onPair, onLogout }) {
  return (
    <div className="space-y-5">
      <HomeCard>
        <h2 className="font-display font-semibold text-[22px] mb-4" style={{ color: "#10251d" }}>
          Conta
        </h2>
        <div className="flex items-center gap-4">
          <span className="h-12 w-12 shrink-0 rounded-full flex items-center justify-center text-white font-bold" style={{ background: "#0f2e25" }}>
            {initialsOf(email)}
          </span>
          <div className="min-w-0">
            <p className="text-sm text-slate-500">Conectado como</p>
            <p className="text-[15px] font-medium text-slate-800 truncate">{email || "—"}</p>
          </div>
        </div>
      </HomeCard>
      <HomeCard>
        <h2 className="font-display font-semibold text-[22px] mb-1" style={{ color: "#10251d" }}>
          Celular
        </h2>
        <p className="text-sm text-slate-500 mb-4">Gere um código para entrar no app do celular sem precisar do login do Google.</p>
        <button
          onClick={onPair}
          className="inline-flex items-center gap-2 text-white text-sm font-medium px-4 py-2.5 rounded-xl shadow-sm hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-400"
          style={{ background: "#16382c" }}
        >
          <Smartphone size={16} /> Parear celular
        </button>
      </HomeCard>
      <HomeCard>
        <button
          onClick={onLogout}
          className="inline-flex items-center gap-2 text-sm font-medium text-rose-700 px-4 py-2.5 rounded-xl border border-rose-200 hover:bg-rose-50 focus:outline-none focus:ring-2 focus:ring-rose-200"
        >
          <LogOut size={16} /> Sair da conta
        </button>
      </HomeCard>
    </div>
  );
}

function sortByValueSort(items, valueSort) {
  if (valueSort === "desc") return [...items].sort((a, b) => (Number(b.value) || 0) - (Number(a.value) || 0));
  if (valueSort === "asc") return [...items].sort((a, b) => (Number(a.value) || 0) - (Number(b.value) || 0));
  return items;
}

function groupByPaymentMethod(items, valueSort = "none") {
  const m = new Map();
  for (const e of items) {
    const key = e.paymentMethod || PAYMENT_METHOD_FALLBACK;
    if (!m.has(key)) m.set(key, []);
    m.get(key).push(e);
  }
  return [...m.entries()]
    .map(([name, groupItems]) => ({
      name,
      items:
        valueSort !== "none"
          ? sortByValueSort(groupItems, valueSort)
          : [...groupItems].sort((a, b) => {
              if (a.order != null && b.order != null) return a.order - b.order;
              if (a.order != null) return -1;
              if (b.order != null) return 1;
              return (b.value || 0) - (a.value || 0);
            }),
      subtotal: groupItems.reduce((s, i) => s + (Number(i.value) || 0), 0),
    }))
    .sort((a, b) => b.subtotal - a.subtotal);
}

function Gastos({ grouped, total, onAdd, onEdit, onDelete, onTogglePaid, onMove, onMovePaymentMethod, extraPaymentMethods = [], selecting, isSelected, onToggleSelect }) {
  const [search, setSearch] = useState("");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState("");
  const [dueDateFrom, setDueDateFrom] = useState("");
  const [dueDateTo, setDueDateTo] = useState("");
  const [valueSort, setValueSort] = useState("none");
  const [hidePaid, setHidePaid] = useState(false);
  const paymentMethodOptions = useMemo(
    () => allPaymentMethods(extraPaymentMethods),
    [extraPaymentMethods]
  );
  const query = search.trim().toLowerCase();
  const isSearching = query !== "";
  const otherFiltersActive =
    isSearching || paymentMethodFilter !== "" || dueDateFrom !== "" || dueDateTo !== "" || valueSort !== "none";
  const filtersActive = otherFiltersActive || hidePaid;

  const clearFilters = () => {
    setSearch("");
    setPaymentMethodFilter("");
    setDueDateFrom("");
    setDueDateTo("");
    setValueSort("none");
    setHidePaid(false);
  };

  const applyCommonFilters = (list) => {
    if (!(query || paymentMethodFilter || dueDateFrom || dueDateTo)) return list;
    return list
      .map((g) => {
        let items = g.items;
        if (query) items = items.filter((e) => e.description.toLowerCase().includes(query));
        if (paymentMethodFilter) {
          items = items.filter((e) => (e.paymentMethod || PAYMENT_METHOD_FALLBACK) === paymentMethodFilter);
        }
        if (dueDateFrom) items = items.filter((e) => e.dueDate && e.dueDate >= dueDateFrom);
        if (dueDateTo) items = items.filter((e) => e.dueDate && e.dueDate <= dueDateTo);
        return { ...g, items, subtotal: items.reduce((s, i) => s + (Number(i.value) || 0), 0) };
      })
      .filter((g) => g.items.length > 0);
  };

  const filteredGrouped = useMemo(() => {
    let result = applyCommonFilters(grouped);
    if (hidePaid) {
      result = result
        .map((g) => {
          const items = g.items.filter((e) => !e.paidAt);
          return { ...g, items, subtotal: items.reduce((s, i) => s + (Number(i.value) || 0), 0) };
        })
        .filter((g) => g.items.length > 0);
    }
    if (valueSort !== "none") {
      result = result.map((g) => ({ ...g, items: sortByValueSort(g.items, valueSort) }));
    }
    return result;
  }, [grouped, query, paymentMethodFilter, dueDateFrom, dueDateTo, valueSort, hidePaid]);

  // Total exibido nunca reflete o "ocultar pagos": esse recurso é só uma lente visual
  // sobre o que ainda falta pagar, não deve mudar o total de gastos do mês.
  const totalGroupedForDisplay = useMemo(
    () => applyCommonFilters(grouped),
    [grouped, query, paymentMethodFilter, dueDateFrom, dueDateTo]
  );

  const visibleTotal = useMemo(
    () => totalGroupedForDisplay.reduce((s, g) => s + g.subtotal, 0),
    [totalGroupedForDisplay]
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-slate-500">{otherFiltersActive ? "Total encontrado" : "Total de gastos"}</p>
          <p className="text-xl font-bold text-slate-800 tabular-nums">{fmt(otherFiltersActive ? visibleTotal : total)}</p>
        </div>
        <button
          onClick={onAdd}
          className="flex items-center gap-1.5 text-white text-sm font-medium px-4 py-2.5 rounded-xl shadow-sm hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-400"
          style={{ background: "#16382c" }}
        >
          <Plus size={16} /> Novo gasto
        </button>
      </div>

      <div className="relative">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar gasto por título…"
          className="w-full pl-10 pr-9 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-400"
        />
        {isSearching && (
          <button
            onClick={() => setSearch("")}
            title="Limpar busca"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 h-6 w-6 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-slate-300"
          >
            <X size={14} />
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setHidePaid((v) => !v)}
          className={
            "flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-slate-300 " +
            (hidePaid ? "text-white border-transparent" : "text-slate-700 bg-white border-slate-200 hover:bg-slate-50")
          }
          style={hidePaid ? { background: "#16382c" } : undefined}
        >
          <Check size={13} />
          {hidePaid ? "Mostrar pagos" : "Ocultar pagos"}
        </button>

        <select
          value={paymentMethodFilter}
          onChange={(e) => setPaymentMethodFilter(e.target.value)}
          className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-400"
        >
          <option value="">Todas as formas de pagamento</option>
          {paymentMethodOptions.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
          <option value={PAYMENT_METHOD_FALLBACK}>{PAYMENT_METHOD_FALLBACK}</option>
        </select>

        <div className="flex items-center gap-1.5">
          <span className="text-xs text-slate-500">Vencimento</span>
          <input
            type="date"
            value={dueDateFrom}
            onChange={(e) => setDueDateFrom(e.target.value)}
            className="px-2.5 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-400"
          />
          <span className="text-xs text-slate-400">até</span>
          <input
            type="date"
            value={dueDateTo}
            onChange={(e) => setDueDateTo(e.target.value)}
            className="px-2.5 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-400"
          />
        </div>

        <select
          value={valueSort}
          onChange={(e) => setValueSort(e.target.value)}
          className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-400"
        >
          <option value="none">Ordem padrão</option>
          <option value="desc">Maior valor primeiro</option>
          <option value="asc">Menor valor primeiro</option>
        </select>

        {filtersActive && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-800 px-2 py-1 rounded-lg hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-300"
          >
            <X size={12} /> Limpar filtros
          </button>
        )}
      </div>

      {filteredGrouped.length === 0 && (
        <Empty text={filtersActive ? "Nenhum gasto encontrado." : "Nenhum gasto cadastrado."} />
      )}

      {filteredGrouped.map((g) => {
        const Icon = g.icon;
        return (
          <Card key={g.name} className="overflow-hidden">
            <div className="flex items-center gap-2.5 px-4 py-3 border-b border-slate-100">
              <span className="h-7 w-7 rounded-lg flex items-center justify-center" style={{ background: g.color + "1F", color: g.color }}>
                <Icon size={15} />
              </span>
              <span className="text-sm font-semibold text-slate-700 flex-1">{g.name}</span>
              <span className="text-sm font-semibold text-slate-800 tabular-nums">{fmt(g.subtotal)}</span>
            </div>
            <div className="divide-y divide-slate-100">
              {g.name === CARTOES_CATEGORY ? (
                groupByPaymentMethod(g.items, valueSort).map((pm) => {
                  const pmMeta = paymentMethodMeta(pm.name);
                  const PmIcon = pmMeta.icon;
                  return (
                  <div key={pm.name}>
                    <div className="flex items-center gap-2 px-4 py-2 bg-slate-50">
                      <span className="h-5 w-5 rounded flex items-center justify-center shrink-0" style={{ background: pmMeta.color + "1F", color: pmMeta.color }}>
                        <PmIcon size={12} />
                      </span>
                      <span className="text-xs font-medium text-slate-500 flex-1">{pm.name}</span>
                      <span className="text-xs font-semibold text-slate-600 tabular-nums">{fmt(pm.subtotal)}</span>
                    </div>
                    <div className="divide-y divide-slate-100">
                      {pm.items.map((e, idx) => (
                        <Row
                          key={e.id}
                          title={e.description}
                          note={e.note}
                          value={e.value}
                          muted={!e.value}
                          recurrent={e.recurrent}
                          paidAt={e.paidAt}
                          dueDate={e.dueDate}
                          installmentTotal={e.installmentTotal}
                          installmentNumber={e.installmentNumber}
                          paidWithVoucher={e.paidWithVoucher}
                          paidWithCltPj={e.paidWithCltPj}
                          position={idx + 1}
                          selected={isSelected(e.id)}
                          onToggleSelect={selecting ? () => onToggleSelect(e.id) : undefined}
                          onMoveUp={!filtersActive && idx > 0 ? () => onMovePaymentMethod(g.name, pm.name, e.id, "up") : undefined}
                          onMoveDown={!filtersActive && idx < pm.items.length - 1 ? () => onMovePaymentMethod(g.name, pm.name, e.id, "down") : undefined}
                          onEdit={() => onEdit(e)}
                          onDelete={() => onDelete(e)}
                          onTogglePaid={() => onTogglePaid(e)}
                        />
                      ))}
                    </div>
                  </div>
                  );
                })
              ) : (
                g.items.map((e, idx) => (
                  <Row
                    key={e.id}
                    title={e.description}
                    note={e.note}
                    value={e.value}
                    muted={!e.value}
                    recurrent={e.recurrent}
                    paidAt={e.paidAt}
                    dueDate={e.dueDate}
                    installmentTotal={e.installmentTotal}
                    installmentNumber={e.installmentNumber}
                    paidWithVoucher={e.paidWithVoucher}
                    paidWithCltPj={e.paidWithCltPj}
                    position={idx + 1}
                    selected={isSelected(e.id)}
                    onToggleSelect={selecting ? () => onToggleSelect(e.id) : undefined}
                    onMoveUp={!filtersActive && idx > 0 ? () => onMove(e.category, e.id, "up") : undefined}
                    onMoveDown={!filtersActive && idx < g.items.length - 1 ? () => onMove(e.category, e.id, "down") : undefined}
                    onEdit={() => onEdit(e)}
                    onDelete={() => onDelete(e)}
                    onTogglePaid={() => onTogglePaid(e)}
                  />
                ))
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
}

function Serasa({ grouped, total, onAdd, onEdit, onDelete, onTogglePaid, onMove, selecting, isSelected, onToggleSelect }) {
  const [search, setSearch] = useState("");
  const query = search.trim().toLowerCase();
  const isSearching = query !== "";

  const filteredGrouped = useMemo(() => {
    if (!query) return grouped;
    return grouped
      .map((g) => {
        const items = g.items.filter((s) => s.description.toLowerCase().includes(query));
        return { ...g, items, subtotal: items.reduce((s, i) => s + (Number(i.value) || 0), 0) };
      })
      .filter((g) => g.items.length > 0);
  }, [grouped, query]);

  const visibleTotal = useMemo(
    () => filteredGrouped.reduce((s, g) => s + g.subtotal, 0),
    [filteredGrouped]
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-slate-500">{isSearching ? "Total encontrado" : "Total de dívidas"}</p>
          <p className="text-xl font-bold text-slate-800 tabular-nums">{fmt(isSearching ? visibleTotal : total)}</p>
        </div>
        <button
          onClick={onAdd}
          className="flex items-center gap-1.5 text-white text-sm font-medium px-4 py-2.5 rounded-xl shadow-sm hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-400"
          style={{ background: "#16382c" }}
        >
          <Plus size={16} /> Nova dívida
        </button>
      </div>

      <div className="relative">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar dívida por descrição…"
          className="w-full pl-10 pr-9 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-400"
        />
        {isSearching && (
          <button
            onClick={() => setSearch("")}
            title="Limpar busca"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 h-6 w-6 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-slate-300"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {filteredGrouped.length === 0 && (
        <Empty text={isSearching ? "Nenhuma dívida encontrada." : "Nenhuma dívida cadastrada."} />
      )}

      {filteredGrouped.map((g) => {
        const Icon = g.icon;
        return (
          <Card key={g.name} className="overflow-hidden">
            <div className="flex items-center gap-2.5 px-4 py-3 border-b border-slate-100">
              <span className="h-7 w-7 rounded-lg flex items-center justify-center" style={{ background: g.color + "1F", color: g.color }}>
                <Icon size={15} />
              </span>
              <span className="text-sm font-semibold text-slate-700 flex-1">{g.name}</span>
              <span className="text-sm font-semibold text-slate-800 tabular-nums">{fmt(g.subtotal)}</span>
            </div>
            <div className="divide-y divide-slate-100">
              {g.items.map((s, idx) => (
                <Row
                  key={s.id}
                  title={s.description}
                  note={s.note}
                  value={s.value}
                  muted={!s.value}
                  recurrent={s.recurrent}
                  paidAt={s.paidAt}
                  dueDate={s.dueDate}
                  installmentTotal={s.installmentTotal}
                  installmentNumber={s.installmentNumber}
                  position={idx + 1}
                  selected={isSelected(s.id)}
                  onToggleSelect={selecting ? () => onToggleSelect(s.id) : undefined}
                  onMoveUp={!isSearching && idx > 0 ? () => onMove(s.category, s.id, "up") : undefined}
                  onMoveDown={!isSearching && idx < g.items.length - 1 ? () => onMove(s.category, s.id, "down") : undefined}
                  onEdit={() => onEdit(s)}
                  onDelete={() => onDelete(s)}
                  onTogglePaid={() => onTogglePaid(s)}
                />
              ))}
            </div>
          </Card>
        );
      })}
    </div>
  );
}

function Cartoes({ cards, unregistered, month, canAdd, onAdd, onEdit, onDelete }) {
  const totalRestante = cards.reduce((s, c) => s + c.remaining, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-slate-500">Sobra somada em {monthLabel(month)}</p>
          <p className={"text-xl font-bold tabular-nums " + (totalRestante >= 0 ? "text-slate-800" : "text-rose-600")}>
            {fmt(totalRestante)}
          </p>
        </div>
        <button
          onClick={() => onAdd()}
          disabled={!canAdd}
          title={canAdd ? undefined : "Todas as formas de pagamento já têm saldo cadastrado."}
          className="flex items-center gap-1.5 text-white text-sm font-medium px-4 py-2.5 rounded-xl shadow-sm hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-400 disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: "#16382c" }}
        >
          <Plus size={16} /> Novo cartão
        </button>
      </div>

      {cards.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-2xl px-4 py-3 flex items-start gap-2">
          <AlertTriangle size={14} className="shrink-0 mt-0.5" />
          <span>
            Cada cartão mostra o saldo que você registrou menos os gastos lançados em{" "}
            <strong>{monthLabel(month)}</strong>, contando compras parceladas pelo valor total. Gastos de
            outros meses não entram nesta conta.
          </span>
        </div>
      )}

      {cards.length === 0 && (
        <Empty text="Nenhum cartão cadastrado. Registre o saldo disponível de um cartão para acompanhar quanto sobra." />
      )}

      {cards.map((c) => {
        // paymentMethodMeta não devolve `name` (diferente de catMeta): o nome vem do próprio cartão
        const meta = paymentMethodMeta(c.paymentMethod);
        const Icon = meta.icon;
        const skipped = c.scope === "before";
        return (
          <Card key={c.id} className="overflow-hidden">
            <div className="flex items-center gap-2.5 px-4 py-3 border-b border-slate-100">
              <span
                className="h-7 w-7 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: meta.color + "1F", color: meta.color }}
              >
                <Icon size={15} />
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-700 truncate">{c.paymentMethod}</p>
                {c.note ? <p className="text-xs text-slate-400 truncate mt-0.5">{c.note}</p> : null}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => onEdit(c)}
                  title="Editar"
                  className="h-8 w-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-slate-300"
                >
                  <Pencil size={15} />
                </button>
                <button
                  onClick={() => onDelete(c)}
                  title="Excluir"
                  className="h-8 w-8 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-rose-300"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>

            <div className="px-4 py-3 space-y-1.5">
              <div className="flex items-center justify-between gap-3 text-xs">
                <span className="text-slate-500">Saldo registrado em {formatDateBR(c.referenceDate)}</span>
                <span className="text-slate-700 tabular-nums shrink-0">{fmt(c.balance)}</span>
              </div>
              {!skipped && (
                <div className="flex items-center justify-between gap-3 text-xs">
                  <span className="text-slate-500">Gastos de {monthLabel(month)}</span>
                  <span className="text-rose-600 tabular-nums shrink-0">- {fmt(c.spent)}</span>
                </div>
              )}
              {!skipped && c.upfrontExtra > 0 && (
                <p className="text-[11px] text-slate-400">
                  Inclui o valor total de {c.upfrontCount}{" "}
                  {c.upfrontCount === 1 ? "compra parcelada" : "compras parceladas"} — o limite do cartão cai
                  de uma vez, não parcela a parcela.
                </p>
              )}
            </div>

            {skipped ? (
              <p className="px-4 py-3 border-t border-slate-100 bg-slate-50 text-xs text-slate-500">
                Saldo registrado em {formatDateBR(c.referenceDate)}, depois de {monthLabel(month)} — os gastos deste
                mês já estavam descontados quando você anotou o saldo.
              </p>
            ) : (
              <div className="px-4 py-3 border-t border-slate-100 bg-slate-50">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-xs font-medium text-slate-600">Sobra em {monthLabel(month)}</span>
                  <span
                    className={"text-lg font-bold tabular-nums " + (c.remaining >= 0 ? "text-slate-800" : "text-rose-600")}
                  >
                    {fmt(c.remaining)}
                  </span>
                </div>
                {c.scope === "same" && (
                  <p className="text-[11px] text-amber-600 mt-1">
                    Pode incluir gastos anteriores a {formatDateBR(c.referenceDate)}, já descontados do saldo.
                  </p>
                )}
                {/* O saldo é um retrato de uma data: em meses posteriores ele não conhece
                    os gastos do meio do caminho, e só quem tem o número novo é o app do
                    cartão. Avisar e oferecer a edição. */}
                {c.scope === "after" && (
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-[11px] text-amber-600 flex-1">
                      Saldo anotado em {formatDateBR(c.referenceDate)}, antes de {monthLabel(month)}. Os gastos
                      dos meses entre uma coisa e outra não estão descontados deste número.
                    </p>
                    <button
                      onClick={() => onEdit(c)}
                      className="shrink-0 text-[11px] font-medium text-amber-800 bg-amber-100 hover:bg-amber-200 px-2.5 py-1.5 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-amber-300"
                    >
                      Atualizar saldo
                    </button>
                  </div>
                )}
              </div>
            )}
          </Card>
        );
      })}

      {unregistered.length > 0 && (
        <Card className="overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100">
            <p className="text-sm font-semibold text-slate-700">Sem saldo cadastrado</p>
            <p className="text-xs text-slate-400 mt-0.5">
              Estas formas de pagamento tiveram gastos em {monthLabel(month)} e não entram na conta acima.
            </p>
          </div>
          <div className="divide-y divide-slate-100">
            {unregistered.map((u) => {
              const meta = paymentMethodMeta(u.name);
              const Icon = meta.icon;
              return (
                <div key={u.name} className="flex items-center gap-2.5 px-4 py-2.5">
                  <span
                    className="h-7 w-7 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: meta.color + "1F", color: meta.color }}
                  >
                    <Icon size={15} />
                  </span>
                  <span className="text-sm text-slate-700 flex-1 min-w-0 truncate">{u.name}</span>
                  <span className="text-sm text-slate-500 tabular-nums shrink-0">{fmt(u.value)}</span>
                  <button
                    onClick={() => onAdd(u.name)}
                    className="shrink-0 text-xs font-medium text-slate-500 px-2.5 py-1.5 rounded-lg hover:text-slate-800 hover:bg-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-300"
                  >
                    Cadastrar saldo
                  </button>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}

/* Fechamento de cartão do mês: lista de {nome do cartão, valor a pagar}, presa
   ao mês acessado. Independente da aba Cartões (que trata saldo/limite). */
function Fechamento({ items, month, onAdd, onEdit, onDelete }) {
  const total = items.reduce((s, it) => s + (Number(it.value) || 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-slate-500">Total a pagar em {monthLabel(month)}</p>
          <p className="text-xl font-bold text-slate-800 tabular-nums">{fmt(total)}</p>
        </div>
        <button
          onClick={() => onAdd()}
          className="flex items-center gap-1.5 text-white text-sm font-medium px-4 py-2.5 rounded-xl shadow-sm hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-400"
          style={{ background: "#16382c" }}
        >
          <Plus size={16} /> Novo fechamento
        </button>
      </div>

      {items.length === 0 ? (
        <Empty text="Nenhum fechamento de cartão neste mês. Registre o nome do cartão e o valor a pagar." />
      ) : (
        <Card className="overflow-hidden divide-y divide-slate-100">
          {items.map((it) => (
            <div key={it.id} className="flex items-center gap-2.5 px-4 py-3">
              <span
                className="h-7 w-7 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: "#D6493B1F", color: "#D6493B" }}
              >
                <CreditCard size={15} />
              </span>
              <span className="text-sm text-slate-800 flex-1 min-w-0 truncate">{it.cardName}</span>
              <span className="text-sm font-semibold text-slate-800 tabular-nums shrink-0">{fmt(it.value)}</span>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => onEdit(it)}
                  title="Editar"
                  className="h-8 w-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-slate-300"
                >
                  <Pencil size={15} />
                </button>
                <button
                  onClick={() => onDelete(it)}
                  title="Excluir"
                  className="h-8 w-8 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-rose-300"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}

function CardClosingModal({ item, onClose, onSave }) {
  const [cardName, setCardName] = useState(item?.cardName || "");
  const [value, setValue] = useState(item ? String(item.value ?? "") : "");
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const canSave = cardName.trim() !== "" && !isNaN(parseFloat(value)) && parseFloat(value) >= 0;

  const submit = () => {
    if (!canSave) return;
    onSave({ cardName: cardName.trim(), value: parseFloat(value) }, item?.id);
  };

  return (
    <Overlay onClose={onClose}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-bold text-slate-800">{item ? "Editar fechamento" : "Novo fechamento"}</h3>
        <button onClick={onClose} className="h-8 w-8 rounded-lg text-slate-400 hover:bg-slate-100 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-slate-300">
          <X size={18} />
        </button>
      </div>

      <div className="space-y-3.5">
        <Field label="Cartão">
          <input
            ref={inputRef}
            value={cardName}
            onChange={(e) => setCardName(e.target.value)}
            placeholder="Ex.: Nubank"
            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-400"
          />
        </Field>

        <Field label="Valor a pagar (R$)">
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="0,00"
            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 tabular-nums focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-400"
          />
        </Field>
      </div>

      <div className="flex gap-2 mt-5">
        <button
          onClick={onClose}
          className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-300"
        >
          Cancelar
        </button>
        <button
          onClick={submit}
          disabled={!canSave}
          className="flex-1 py-2.5 rounded-xl text-white text-sm font-semibold shadow-sm transition-opacity focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-400 disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: "#16382c" }}
        >
          Salvar
        </button>
      </div>
    </Overlay>
  );
}

function Ganhos({ incomes, total, onAdd, onEdit, onDelete, selecting, isSelected, onToggleSelect }) {
  const [search, setSearch] = useState("");
  const query = search.trim().toLowerCase();
  const isSearching = query !== "";

  const filteredIncomes = useMemo(
    () => (isSearching ? incomes.filter((i) => i.source.toLowerCase().includes(query)) : incomes),
    [incomes, isSearching, query]
  );

  const visibleTotal = useMemo(
    () => filteredIncomes.reduce((s, i) => s + (Number(i.value) || 0), 0),
    [filteredIncomes]
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-slate-500">{isSearching ? "Total encontrado" : "Total de ganhos"}</p>
          <p className="text-xl font-bold text-emerald-600 tabular-nums">{fmt(isSearching ? visibleTotal : total)}</p>
        </div>
        <button
          onClick={onAdd}
          className="flex items-center gap-1.5 bg-emerald-600 text-white text-sm font-medium px-4 py-2.5 rounded-xl shadow-sm hover:bg-emerald-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-400"
        >
          <Plus size={16} /> Novo ganho
        </button>
      </div>

      <div className="relative">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar ganho por título…"
          className="w-full pl-10 pr-9 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400"
        />
        {isSearching && (
          <button
            onClick={() => setSearch("")}
            title="Limpar busca"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 h-6 w-6 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-slate-300"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {filteredIncomes.length === 0 ? (
        <Empty text={isSearching ? "Nenhum ganho encontrado." : "Nenhuma fonte de renda cadastrada."} />
      ) : (
        <Card className="divide-y divide-slate-100">
          {filteredIncomes.map((i) => (
            <Row
              key={i.id}
              title={i.source}
              note={i.note}
              value={i.value}
              accent="#059669"
              recurrent={i.recurrent}
              paidWithVoucher={i.voucherIncome}
              paidWithCltPj={i.cltPjIncome}
              selected={isSelected(i.id)}
              onToggleSelect={selecting ? () => onToggleSelect(i.id) : undefined}
              onEdit={() => onEdit(i)}
              onDelete={() => onDelete(i)}
            />
          ))}
        </Card>
      )}
    </div>
  );
}

function Desejos({ pending, done, onAdd, onEdit, onDelete, onToggleDone, onMove, selecting, isSelected, onToggleSelect }) {
  const totalPending = pending.reduce((s, w) => s + (Number(w.value) || 0), 0);
  const ordered = [...pending, ...done];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-slate-500">Total desejado</p>
          <p className="text-xl font-bold text-slate-800 tabular-nums">{fmt(totalPending)}</p>
        </div>
        <button
          onClick={onAdd}
          className="flex items-center gap-1.5 text-white text-sm font-medium px-4 py-2.5 rounded-xl shadow-sm hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-400"
          style={{ background: "#16382c" }}
        >
          <Plus size={16} /> Novo desejo
        </button>
      </div>

      {ordered.length === 0 ? (
        <Empty text="Nenhum desejo cadastrado." />
      ) : (
        <Card className="divide-y divide-slate-100">
          {ordered.map((w, idx) => {
            const inPending = idx < pending.length;
            const group = inPending ? pending : done;
            const groupIdx = inPending ? idx : idx - pending.length;
            return (
              <WishRow
                key={w.id}
                item={w}
                position={groupIdx + 1}
                selected={isSelected(w.id)}
                onToggleSelect={selecting ? () => onToggleSelect(w.id) : undefined}
                onMoveUp={groupIdx > 0 ? () => onMove(w.id, "up") : undefined}
                onMoveDown={groupIdx < group.length - 1 ? () => onMove(w.id, "down") : undefined}
                onEdit={() => onEdit(w)}
                onDelete={() => onDelete(w)}
                onToggleDone={() => onToggleDone(w)}
              />
            );
          })}
        </Card>
      )}
    </div>
  );
}

function WishRow({ item, onEdit, onDelete, onToggleDone, position, onMoveUp, onMoveDown, selected, onToggleSelect }) {
  const isDone = !!item.doneAt;
  return (
    <div className="group flex items-start sm:items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors">
      {onToggleSelect ? (
        <SelectCheckbox selected={selected} onToggle={onToggleSelect} label={item.title} />
      ) : position != null ? (
        <div className="flex flex-col items-center shrink-0">
          {onMoveUp ? (
            <button
              onClick={onMoveUp}
              className="h-4 w-4 flex items-center justify-center rounded text-slate-300 hover:text-slate-600 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-300"
              title="Mover para cima"
            >
              <ChevronUp size={12} />
            </button>
          ) : (
            <span className="h-4 w-4" />
          )}
          <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 rounded px-1 tabular-nums leading-tight">
            {position}
          </span>
          {onMoveDown ? (
            <button
              onClick={onMoveDown}
              className="h-4 w-4 flex items-center justify-center rounded text-slate-300 hover:text-slate-600 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-300"
              title="Mover para baixo"
            >
              <ChevronDown size={12} />
            </button>
          ) : (
            <span className="h-4 w-4" />
          )}
        </div>
      ) : null}
      <div className="flex-1 min-w-0 flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3">
        <div className="min-w-0 sm:flex-1">
          <p className={"text-sm line-clamp-2 break-words sm:line-clamp-none sm:truncate " + (isDone ? "text-slate-400 line-through" : "text-slate-800")}>{item.title}</p>
          {item.note ? <p className="text-xs text-slate-400 truncate mt-0.5">{item.note}</p> : null}
          {isDone && <p className="text-xs text-emerald-600 truncate mt-0.5">Realizado em {formatDateBR(item.doneAt)}</p>}
        </div>
        <div className="flex items-center justify-between flex-wrap gap-2 sm:flex-nowrap sm:shrink-0 sm:gap-3">
          {item.value > 0 && (
            <span className={"text-sm font-semibold tabular-nums shrink-0 " + (isDone ? "text-slate-400" : "text-slate-800")}>
              {fmt(item.value)}
            </span>
          )}
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={onToggleDone}
              className={
                "h-8 w-8 rounded-lg flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-300 " +
                (isDone ? "bg-emerald-100 text-emerald-600 hover:bg-emerald-200" : "text-slate-400 hover:text-emerald-600 hover:bg-emerald-50")
              }
              title={isDone ? "Realizado — clique para desfazer" : "Confirmar realizado"}
            >
              <Check size={15} />
            </button>
            <button
              onClick={onEdit}
              className="h-8 w-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-slate-300"
              title="Editar"
            >
              <Pencil size={15} />
            </button>
            <button
              onClick={onDelete}
              className="h-8 w-8 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-rose-300"
              title="Excluir"
            >
              <Trash2 size={15} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SelectCheckbox({ selected, onToggle, label }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      role="checkbox"
      aria-checked={!!selected}
      aria-label={`Selecionar ${label}`}
      title={selected ? "Remover da seleção" : "Adicionar à seleção"}
      className="h-8 w-8 shrink-0 rounded-lg flex items-center justify-center hover:bg-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-300"
    >
      <span
        className={
          "h-5 w-5 rounded-md border flex items-center justify-center transition-colors " +
          (selected ? "border-transparent text-white" : "bg-white border-slate-300 text-transparent")
        }
        style={selected ? { background: "#16382c" } : undefined}
      >
        <Check size={13} strokeWidth={3} />
      </span>
    </button>
  );
}

function Row({ title, note, value, onEdit, onDelete, accent, muted, recurrent, paidAt, dueDate, onTogglePaid, installmentTotal, installmentNumber, position, onMoveUp, onMoveDown, paidWithVoucher, paidWithCltPj, selected, onToggleSelect }) {
  const isPaid = !!paidAt;
  return (
    <div className="group flex items-start sm:items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors">
      {onToggleSelect ? (
        <SelectCheckbox selected={selected} onToggle={onToggleSelect} label={title} />
      ) : position != null ? (
        <div className="flex flex-col items-center shrink-0">
          {onMoveUp ? (
            <button
              onClick={onMoveUp}
              className="h-4 w-4 flex items-center justify-center rounded text-slate-300 hover:text-slate-600 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-300"
              title="Mover para cima"
            >
              <ChevronUp size={12} />
            </button>
          ) : (
            <span className="h-4 w-4" />
          )}
          <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 rounded px-1 tabular-nums leading-tight">
            {position}
          </span>
          {onMoveDown ? (
            <button
              onClick={onMoveDown}
              className="h-4 w-4 flex items-center justify-center rounded text-slate-300 hover:text-slate-600 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-300"
              title="Mover para baixo"
            >
              <ChevronDown size={12} />
            </button>
          ) : (
            <span className="h-4 w-4" />
          )}
        </div>
      ) : null}
      <div className="flex-1 min-w-0 flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3">
        <div className="min-w-0 sm:flex-1">
          <p className={"text-sm flex flex-wrap items-start sm:items-center gap-x-1.5 gap-y-1 " + (muted ? "text-slate-400" : "text-slate-800")}>
            <span className="basis-full sm:basis-auto line-clamp-2 break-words sm:line-clamp-none sm:truncate">{title}</span>
            {recurrent && <Repeat size={12} className="text-slate-400 shrink-0" aria-label="Recorrente" />}
            {installmentTotal && (
              <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 rounded px-1.5 py-0.5 shrink-0 tabular-nums">
                {installmentNumber}/{installmentTotal}
              </span>
            )}
            {paidWithVoucher && (
              <span className="text-[10px] font-semibold text-amber-700 bg-amber-100 rounded px-1.5 py-0.5 shrink-0" title="Vale alimentação">
                VA
              </span>
            )}
            {paidWithCltPj && (
              <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-100 rounded px-1.5 py-0.5 shrink-0" title="CLT/PJ">
                CLT/PJ
              </span>
            )}
          </p>
          {note ? <p className="text-xs text-slate-400 truncate mt-0.5">{note}</p> : null}
          {isPaid && <p className="text-xs text-emerald-600 truncate mt-0.5">Pago em {formatDateBR(paidAt)}</p>}
        </div>
        <div className="flex items-center justify-between flex-wrap gap-2 sm:flex-nowrap sm:shrink-0 sm:gap-3">
          <span
            className="text-sm font-semibold tabular-nums shrink-0"
            style={{ color: muted ? "#94a3b8" : accent || "#1e293b" }}
          >
            {fmt(value)}
          </span>
          <div className="flex items-center gap-1 shrink-0">
            {dueDate && (
              <span
                className="text-[10px] font-semibold text-slate-500 bg-slate-100 rounded px-1.5 py-0.5 tabular-nums"
                title="Vencimento"
              >
                {formatDateBR(dueDate)}
              </span>
            )}
            {onTogglePaid && (
              <button
                onClick={onTogglePaid}
                className={
                  "h-8 w-8 rounded-lg flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-300 " +
                  (isPaid ? "bg-emerald-100 text-emerald-600 hover:bg-emerald-200" : "text-slate-400 hover:text-emerald-600 hover:bg-emerald-50")
                }
                title={isPaid ? "Pagamento confirmado — clique para desfazer" : "Confirmar pagamento"}
              >
                <Check size={15} />
              </button>
            )}
            <button
              onClick={onEdit}
              className="h-8 w-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-slate-300"
              title="Editar"
            >
              <Pencil size={15} />
            </button>
            <button
              onClick={onDelete}
              className="h-8 w-8 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-rose-300"
              title="Excluir"
            >
              <Trash2 size={15} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Empty({ text }) {
  return <p className="text-sm text-slate-400 py-6 text-center">{text}</p>;
}

/* ---------- modais ---------- */
function WishModal({ item, onClose, onSave }) {
  const [title, setTitle] = useState(item?.title || "");
  const [value, setValue] = useState(item ? String(item.value ?? "") : "");
  const [note, setNote] = useState(item?.note || "");
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const canSave = title.trim() !== "" && (value === "" || (!isNaN(parseFloat(value)) && parseFloat(value) >= 0));

  const submit = () => {
    if (!canSave) return;
    onSave({ title: title.trim(), value: value === "" ? 0 : parseFloat(value), note: note.trim() }, item?.id);
  };

  return (
    <Overlay onClose={onClose}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-bold text-slate-800">{item ? "Editar desejo" : "Novo desejo"}</h3>
        <button onClick={onClose} className="h-8 w-8 rounded-lg text-slate-400 hover:bg-slate-100 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-slate-300">
          <X size={18} />
        </button>
      </div>

      <div className="space-y-3.5">
        <Field label="O que você deseja?">
          <input
            ref={inputRef}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex.: Fone de ouvido novo"
            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-400"
          />
        </Field>

        <Field label="Valor estimado (opcional)">
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="0,00"
            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 tabular-nums focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-400"
          />
        </Field>

        <Field label="Observação (opcional)">
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ex.: cor preta, comprar na loja X"
            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-400"
          />
        </Field>
      </div>

      <div className="flex gap-2 mt-5">
        <button
          onClick={onClose}
          className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-300"
        >
          Cancelar
        </button>
        <button
          onClick={submit}
          disabled={!canSave}
          className="flex-1 py-2.5 rounded-xl text-white text-sm font-semibold shadow-sm transition-opacity focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-400 disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: "#16382c" }}
        >
          Salvar
        </button>
      </div>
    </Overlay>
  );
}

function ShoppingListTab({ items, onAdd, onEdit, onDelete, onToggleDone, onClearDone, selecting, isSelected, onToggleSelect }) {
  const pending = items.filter((it) => !it.doneAt);
  const done = items.filter((it) => it.doneAt);
  const totalPending = pending.reduce((s, it) => s + (Number(it.value) || 0), 0);
  const ordered = [...pending, ...done];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-slate-500">Total estimado</p>
          <p className="text-xl font-bold text-slate-800 tabular-nums">{fmt(totalPending)}</p>
        </div>
        <div className="flex items-center gap-2">
          {onClearDone && (
            <button
              onClick={onClearDone}
              disabled={done.length === 0}
              className="flex items-center gap-1.5 text-sm font-medium px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-300 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Trash2 size={16} /> Limpar
            </button>
          )}
          <button
            onClick={onAdd}
            className="flex items-center gap-1.5 text-white text-sm font-medium px-4 py-2.5 rounded-xl shadow-sm hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-400"
            style={{ background: "#16382c" }}
          >
            <Plus size={16} /> Novo item
          </button>
        </div>
      </div>

      {ordered.length === 0 ? (
        <Empty text="Nenhum item cadastrado." />
      ) : (
        <Card className="divide-y divide-slate-100">
          {ordered.map((it) => (
            <ShoppingItemRow
              key={it.id}
              item={it}
              selected={isSelected(it.id)}
              onToggleSelect={selecting ? () => onToggleSelect(it.id) : undefined}
              onEdit={() => onEdit(it)}
              onDelete={() => onDelete(it)}
              onToggleDone={() => onToggleDone(it)}
            />
          ))}
        </Card>
      )}
    </div>
  );
}

function ShoppingItemRow({ item, onEdit, onDelete, onToggleDone, selected, onToggleSelect }) {
  const isDone = !!item.doneAt;
  return (
    <div className="group flex items-start sm:items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors">
      {onToggleSelect && <SelectCheckbox selected={selected} onToggle={onToggleSelect} label={item.title} />}
      <div className="flex-1 min-w-0 flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3">
        <div className="min-w-0 sm:flex-1">
          <p className={"text-sm line-clamp-2 break-words sm:line-clamp-none sm:truncate " + (isDone ? "text-slate-400 line-through" : "text-slate-800")}>{item.title}</p>
          {item.note ? <p className="text-xs text-slate-400 truncate mt-0.5">{item.note}</p> : null}
          {isDone && <p className="text-xs text-emerald-600 truncate mt-0.5">Comprado em {formatDateBR(item.doneAt)}</p>}
        </div>
        <div className="flex items-center justify-between flex-wrap gap-2 sm:flex-nowrap sm:shrink-0 sm:gap-3">
          {item.value > 0 && (
            <span className={"text-sm font-semibold tabular-nums shrink-0 " + (isDone ? "text-slate-400" : "text-slate-800")}>
              {fmt(item.value)}
            </span>
          )}
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={onToggleDone}
              className={
                "h-8 w-8 rounded-lg flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-300 " +
                (isDone ? "bg-emerald-100 text-emerald-600 hover:bg-emerald-200" : "text-slate-400 hover:text-emerald-600 hover:bg-emerald-50")
              }
              title={isDone ? "Comprado — clique para desfazer" : "Confirmar compra"}
            >
              <Check size={15} />
            </button>
            <button
              onClick={onEdit}
              className="h-8 w-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-slate-300"
              title="Editar"
            >
              <Pencil size={15} />
            </button>
            <button
              onClick={onDelete}
              className="h-8 w-8 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-rose-300"
              title="Excluir"
            >
              <Trash2 size={15} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ShoppingItemModal({ item, onClose, onSave }) {
  const [title, setTitle] = useState(item?.title || "");
  const [value, setValue] = useState(item ? String(item.value ?? "") : "");
  const [note, setNote] = useState(item?.note || "");
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const canSave = title.trim() !== "" && (value === "" || (!isNaN(parseFloat(value)) && parseFloat(value) >= 0));

  const submit = () => {
    if (!canSave) return;
    onSave({ title: title.trim(), value: value === "" ? 0 : parseFloat(value), note: note.trim() }, item?.id);
  };

  return (
    <Overlay onClose={onClose}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-bold text-slate-800">{item ? "Editar item" : "Novo item"}</h3>
        <button onClick={onClose} className="h-8 w-8 rounded-lg text-slate-400 hover:bg-slate-100 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-slate-300">
          <X size={18} />
        </button>
      </div>

      <div className="space-y-3.5">
        <Field label="O que você precisa comprar?">
          <input
            ref={inputRef}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex.: Arroz"
            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-400"
          />
        </Field>

        <Field label="Valor estimado (opcional)">
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="0,00"
            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 tabular-nums focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-400"
          />
        </Field>

        <Field label="Observação (opcional)">
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ex.: marca preferida, quantidade"
            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-400"
          />
        </Field>
      </div>

      <div className="flex gap-2 mt-5">
        <button
          onClick={onClose}
          className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-300"
        >
          Cancelar
        </button>
        <button
          onClick={submit}
          disabled={!canSave}
          className="flex-1 py-2.5 rounded-xl text-white text-sm font-semibold shadow-sm transition-opacity focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-400 disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: "#16382c" }}
        >
          Salvar
        </button>
      </div>
    </Overlay>
  );
}

function PairModal({ onClose }) {
  const [state, setState] = useState({ status: "loading" });
  const [now, setNow] = useState(() => Date.now());

  const generate = useCallback(async () => {
    setState({ status: "loading" });
    try {
      const res = await fetch("/api/auth/pair", { method: "POST" });
      if (!res.ok) throw new Error();
      const { code, expiresAt } = await res.json();
      setState({ status: "ready", code, expiresAt });
    } catch {
      setState({ status: "error" });
    }
  }, []);

  useEffect(() => {
    generate();
  }, [generate]);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      window.removeEventListener("keydown", onKey);
      clearInterval(t);
    };
  }, [onClose]);

  /* A contagem aqui e so aviso: quem decide a validade e o expires_at do banco,
     comparado com now() do Postgres na hora do resgate. */
  const left = state.status === "ready" ? Math.max(0, Math.ceil((state.expiresAt - now) / 1000)) : 0;

  return (
    <Overlay onClose={onClose}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-bold text-slate-800">Parear celular</h3>
        <button
          onClick={onClose}
          className="h-8 w-8 rounded-lg text-slate-400 hover:bg-slate-100 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-slate-300"
        >
          <X size={18} />
        </button>
      </div>
      <p className="text-sm text-slate-500 mb-4">
        Digite este código no aplicativo do celular. Ele vale uma única vez.
      </p>

      {state.status === "loading" && <p className="text-sm text-slate-400 py-8 text-center">Gerando…</p>}
      {state.status === "error" && (
        <p className="text-sm text-rose-500 py-8 text-center">Falha ao gerar o código.</p>
      )}
      {state.status === "ready" && (
        <>
          <div className="rounded-2xl bg-slate-50 border border-slate-200 py-6 text-center mb-3">
            <span className="text-3xl font-bold tracking-[0.2em] text-slate-800 tabular-nums select-all">
              {state.code}
            </span>
          </div>
          <p className={"text-xs text-center mb-4 " + (left > 0 ? "text-slate-400" : "text-rose-500")}>
            {left > 0
              ? `Expira em ${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}`
              : "Código expirado."}
          </p>
        </>
      )}

      <button
        onClick={generate}
        disabled={state.status === "loading"}
        className="w-full py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-slate-300"
      >
        Gerar novo código
      </button>
    </Overlay>
  );
}

function CardModal({ item, presetMethod, cards = [], extraPaymentMethods = [], onClose, onSave }) {
  const methodOptions = useMemo(() => {
    const taken = new Set(cards.filter((c) => c.id !== item?.id).map((c) => c.paymentMethod));
    const list = allPaymentMethods(extraPaymentMethods).filter((p) => !taken.has(p));
    // forma de pagamento que sumiu da lista (último gasto apagado) segue editável no cartão que já a usa
    return item?.paymentMethod && !list.includes(item.paymentMethod) ? [item.paymentMethod, ...list] : list;
  }, [cards, item, extraPaymentMethods]);

  const [paymentMethod, setPaymentMethod] = useState(
    () =>
      item?.paymentMethod ||
      (presetMethod && methodOptions.includes(presetMethod) ? presetMethod : methodOptions[0] || "")
  );
  const [balance, setBalance] = useState(item ? String(item.balance ?? "") : "");
  const [referenceDate, setReferenceDate] = useState(item?.referenceDate || todayISO());
  const [note, setNote] = useState(item?.note || "");
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const canSave =
    paymentMethod !== "" &&
    referenceDate !== "" &&
    balance !== "" &&
    !isNaN(parseFloat(balance)) &&
    parseFloat(balance) >= 0;

  const submit = () => {
    if (!canSave) return;
    onSave({ paymentMethod, balance: parseFloat(balance), referenceDate, note: note.trim() }, item?.id);
  };

  return (
    <Overlay onClose={onClose}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-bold text-slate-800">{item ? "Editar cartão" : "Novo cartão"}</h3>
        <button
          onClick={onClose}
          className="h-8 w-8 rounded-lg text-slate-400 hover:bg-slate-100 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-slate-300"
        >
          <X size={18} />
        </button>
      </div>

      <div className="space-y-3.5">
        <Field label="Forma de pagamento">
          {methodOptions.length === 0 ? (
            <span className="block text-sm text-slate-400">Todas as formas de pagamento já têm saldo cadastrado.</span>
          ) : (
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-400"
            >
              {methodOptions.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          )}
        </Field>

        <Field label="Saldo disponível (R$)">
          <input
            ref={inputRef}
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={balance}
            onChange={(e) => setBalance(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="0,00"
            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 tabular-nums focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-400"
          />
        </Field>

        <Field label="Data do saldo">
          <input
            type="date"
            value={referenceDate}
            onChange={(e) => setReferenceDate(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-400"
          />
          <span className="block text-[11px] text-slate-400 mt-1">
            Quando você consultou esse saldo no app do cartão.
          </span>
        </Field>

        <Field label="Observação (opcional)">
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ex.: fecha dia 10"
            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-400"
          />
        </Field>
      </div>

      <div className="flex gap-2 mt-5">
        <button
          onClick={onClose}
          className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-300"
        >
          Cancelar
        </button>
        <button
          onClick={submit}
          disabled={!canSave}
          className="flex-1 py-2.5 rounded-xl text-white text-sm font-semibold shadow-sm transition-opacity focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-400 disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: "#16382c" }}
        >
          Salvar
        </button>
      </div>
    </Overlay>
  );
}

function EntryModal({ mode, item, onClose, onSave, extraCategories = [], extraPaymentMethods = [], months = [], currentMonth, onMoveMonth }) {
  const isExpense = mode === "expense";
  const isSerasa = mode === "serasa";
  const hasCategory = isExpense || isSerasa;
  const baseCategoryList = isSerasa ? SERASA_CATS : CATS;
  const categoryList = useMemo(
    () => [
      ...baseCategoryList,
      ...extraCategories
        .filter((name) => !baseCategoryList.some((c) => c.name === name))
        .map((name) => ({ name, ...FALLBACK })),
    ],
    [baseCategoryList, extraCategories]
  );
  const paymentMethodList = useMemo(
    () => allPaymentMethods(extraPaymentMethods),
    [extraPaymentMethods]
  );
  const [desc, setDesc] = useState(item ? (mode === "income" ? item.source : item.description) : "");
  const [category, setCategory] = useState(item?.category || categoryList[0].name);
  const [categoryMode, setCategoryMode] = useState(() =>
    categoryList.some((c) => c.name === (item?.category || categoryList[0].name)) ? "select" : "custom"
  );
  const [value, setValue] = useState(item ? String(item.value) : "");
  const [note, setNote] = useState(item?.note || "");
  const [dueDate, setDueDate] = useState(item?.dueDate || "");
  const [receiptDate, setReceiptDate] = useState(item?.receiptDate || "");
  const [recurrent, setRecurrent] = useState(item?.recurrent || false);
  const [repeatMode, setRepeatMode] = useState(() => {
    if (item?.installmentTotal) return "installments";
    if (item?.recurrent) return "recurrent";
    return "none";
  });
  const [installmentTotal, setInstallmentTotal] = useState(item?.installmentTotal || 2);
  const [purchaseTotal, setPurchaseTotal] = useState(item?.purchaseTotal ? String(item.purchaseTotal) : "");
  const [paidWithVoucher, setPaidWithVoucher] = useState(item?.paidWithVoucher || false);
  const [paidWithCltPj, setPaidWithCltPj] = useState(item?.paidWithCltPj || false);
  const [voucherIncome, setVoucherIncome] = useState(item?.voucherIncome || false);
  const [cltPjIncome, setCltPjIncome] = useState(item?.cltPjIncome || false);
  const [paymentMethod, setPaymentMethod] = useState(item?.paymentMethod || "");
  const [paymentMethodMode, setPaymentMethodMode] = useState(() =>
    !item?.paymentMethod || paymentMethodList.includes(item.paymentMethod) ? "select" : "custom"
  );
  const [moveTarget, setMoveTarget] = useState("");
  const [moving, setMoving] = useState(false);
  const [moveError, setMoveError] = useState("");
  const inputRef = useRef(null);

  const otherMonths = useMemo(
    () => months.filter((m) => m !== currentMonth).sort(),
    [months, currentMonth]
  );

  const handleMove = async () => {
    if (!moveTarget || moving) return;
    setMoving(true);
    setMoveError("");
    try {
      await onMoveMonth(item, moveTarget);
    } catch (err) {
      setMoveError(err.message || "Falha ao mover o gasto.");
      setMoving(false);
    }
  };

  useEffect(() => {
    inputRef.current?.focus();
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // O limite do cartão cai o valor cheio da compra de uma vez, não a parcela, então o
  // total é o que a aba Cartões desconta. Em branco vale: cai em parcela × parcelas.
  const showPurchaseTotal = hasCategory && isExpense && repeatMode === "installments";
  const suggestedTotal =
    !isNaN(parseFloat(value)) && Number.isInteger(installmentTotal) && installmentTotal >= 2
      ? parseFloat(value) * installmentTotal
      : NaN;
  const totalFilled = purchaseTotal.trim() !== "";
  const typedTotal = parseFloat(purchaseTotal);
  const totalOk = !showPurchaseTotal || !totalFilled || (!isNaN(typedTotal) && typedTotal > 0);

  const canSave =
    desc.trim() !== "" &&
    value !== "" &&
    !isNaN(parseFloat(value)) &&
    parseFloat(value) >= 0 &&
    (!hasCategory || category.trim() !== "") &&
    totalOk &&
    (!hasCategory || repeatMode !== "installments" || (Number.isInteger(installmentTotal) && installmentTotal >= 2));

  const submit = () => {
    if (!canSave) return;
    const data = hasCategory
      ? {
          description: desc.trim(),
          category: category.trim(),
          value: parseFloat(value),
          note: note.trim(),
          dueDate: dueDate || null,
          recurrent: repeatMode === "recurrent",
          installmentTotal: repeatMode === "installments" ? installmentTotal : null,
          installmentNumber: repeatMode === "installments" ? item?.installmentNumber || 1 : null,
          purchaseTotal: showPurchaseTotal && totalFilled ? typedTotal : null,
          ...(isExpense ? { paidWithVoucher, paidWithCltPj, paymentMethod: paymentMethod.trim() || null } : {}),
        }
      : { source: desc.trim(), value: parseFloat(value), note: note.trim(), receiptDate: receiptDate || null, recurrent, voucherIncome, cltPjIncome };
    onSave(mode, data, item?.id);
  };

  const title = isSerasa ? (item ? "Editar dívida" : "Nova dívida") : `${item ? "Editar" : "Novo"} ${isExpense ? "gasto" : "ganho"}`;

  return (
    <Overlay onClose={onClose}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-bold text-slate-800">{title}</h3>
        <button onClick={onClose} className="h-8 w-8 rounded-lg text-slate-400 hover:bg-slate-100 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-slate-300">
          <X size={18} />
        </button>
      </div>

      <div className="space-y-3.5">
        <Field label={mode === "income" ? "Fonte de renda" : "Descrição"}>
          <input
            ref={inputRef}
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            placeholder={mode === "income" ? "Ex.: NeoGrid" : isSerasa ? "Ex.: Cartão Nubank" : "Ex.: Luz"}
            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-400"
          />
        </Field>

        {hasCategory && (
          <Field label="Categoria">
            {categoryMode === "select" ? (
              <select
                value={category}
                onChange={(e) => {
                  if (e.target.value === NEW_CATEGORY) {
                    setCategoryMode("custom");
                    setCategory("");
                  } else {
                    setCategory(e.target.value);
                  }
                }}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-400"
              >
                {categoryList.map((c) => (
                  <option key={c.name} value={c.name}>
                    {c.name}
                  </option>
                ))}
                <option value={NEW_CATEGORY}>+ Criar nova categoria</option>
              </select>
            ) : (
              <div className="flex gap-2">
                <input
                  autoFocus
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="Nome da nova categoria"
                  className="flex-1 min-w-0 px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-400"
                />
                <button
                  type="button"
                  onClick={() => {
                    setCategoryMode("select");
                    setCategory(categoryList.some((c) => c.name === category) ? category : categoryList[0].name);
                  }}
                  title="Cancelar"
                  className="h-[42px] w-[42px] shrink-0 rounded-xl border border-slate-200 text-slate-400 hover:text-slate-700 hover:bg-slate-50 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-slate-300"
                >
                  <X size={16} />
                </button>
              </div>
            )}
          </Field>
        )}

        {isExpense && (
          <Field label="Forma de pagamento (opcional)">
            {paymentMethodMode === "select" ? (
              <select
                value={paymentMethod}
                onChange={(e) => {
                  if (e.target.value === NEW_PAYMENT_METHOD) {
                    setPaymentMethodMode("custom");
                    setPaymentMethod("");
                  } else {
                    setPaymentMethod(e.target.value);
                  }
                }}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-400"
              >
                <option value="">Nenhuma</option>
                {paymentMethodList.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
                <option value={NEW_PAYMENT_METHOD}>+ Adicionar forma de pagamento</option>
              </select>
            ) : (
              <div className="flex gap-2">
                <input
                  autoFocus
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  placeholder="Nome da forma de pagamento"
                  className="flex-1 min-w-0 px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-400"
                />
                <button
                  type="button"
                  onClick={() => {
                    setPaymentMethodMode("select");
                    setPaymentMethod(paymentMethodList.includes(paymentMethod) ? paymentMethod : "");
                  }}
                  title="Cancelar"
                  className="h-[42px] w-[42px] shrink-0 rounded-xl border border-slate-200 text-slate-400 hover:text-slate-700 hover:bg-slate-50 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-slate-300"
                >
                  <X size={16} />
                </button>
              </div>
            )}
          </Field>
        )}

        <Field label="Valor (R$)">
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="0,00"
            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 tabular-nums focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-400"
          />
        </Field>

        {mode === "income" ? (
          <Field label="Data prevista de recebimento (opcional)">
            <input
              type="date"
              value={receiptDate}
              onChange={(e) => setReceiptDate(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-400"
            />
          </Field>
        ) : (
          <Field label="Data de vencimento (opcional)">
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-400"
            />
          </Field>
        )}

        <Field label="Observação (opcional)">
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ex.: parcela 2/3"
            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-400"
          />
        </Field>

        {hasCategory ? (
          <div className="block">
            <span className="text-xs font-medium text-slate-500 mb-1 block">Repetição</span>
            <div className="flex flex-col gap-2">
              {[
                ["none", "Não se repete"],
                ["recurrent", "Recorrente (repete todo mês)"],
                ["installments", "Parcelado"],
              ].map(([value, label]) => (
                <label key={value} className="flex items-center gap-2 text-sm text-slate-600 select-none cursor-pointer">
                  <input
                    type="radio"
                    name="repeatMode"
                    checked={repeatMode === value}
                    onChange={() => setRepeatMode(value)}
                    className="h-4 w-4 text-slate-700 focus:ring-slate-400"
                  />
                  {label}
                </label>
              ))}
              {repeatMode === "installments" && (
                <div className="flex items-center gap-2 pl-6">
                  <span className="text-xs text-slate-500">Em quantas vezes?</span>
                  <input
                    type="number"
                    min="2"
                    step="1"
                    value={installmentTotal}
                    onChange={(e) => setInstallmentTotal(parseInt(e.target.value, 10) || 2)}
                    className="w-16 px-2 py-1.5 rounded-lg border border-slate-200 text-sm text-slate-800 tabular-nums focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-400"
                  />
                  {item?.installmentNumber && (
                    <span className="text-xs text-slate-400">(esta é a parcela {item.installmentNumber})</span>
                  )}
                </div>
              )}
              {showPurchaseTotal && (
                <div className="pl-6">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">Valor total da compra (R$)</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={purchaseTotal}
                      onChange={(e) => setPurchaseTotal(e.target.value)}
                      placeholder={isNaN(suggestedTotal) ? "0,00" : suggestedTotal.toFixed(2)}
                      className={
                        "w-28 px-2 py-1.5 rounded-lg border text-sm text-slate-800 tabular-nums focus:outline-none focus:ring-2 focus:ring-slate-400 " +
                        (totalOk ? "border-slate-200 focus:border-slate-400" : "border-rose-400")
                      }
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    {totalOk
                      ? "O limite do cartão cai o valor total de uma vez, não a parcela. Em branco, usamos a parcela vezes o número de parcelas."
                      : "Informe um valor maior que zero ou deixe em branco."}
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-2 text-sm text-slate-600 select-none cursor-pointer">
              <input
                type="checkbox"
                checked={recurrent}
                onChange={(e) => setRecurrent(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-slate-700 focus:ring-slate-400"
              />
              Recorrente (repete todo mês)
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-600 select-none cursor-pointer">
              <input
                type="checkbox"
                checked={voucherIncome}
                onChange={(e) => setVoucherIncome(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-slate-700 focus:ring-slate-400"
              />
              Este valor é do vale alimentação
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-600 select-none cursor-pointer">
              <input
                type="checkbox"
                checked={cltPjIncome}
                onChange={(e) => setCltPjIncome(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-slate-700 focus:ring-slate-400"
              />
              Este valor é CLT/PJ
            </label>
          </div>
        )}

        {isExpense && (
          <div className="flex flex-col gap-2 pt-1">
            <label className="flex items-center gap-2 text-sm text-slate-600 select-none cursor-pointer">
              <input
                type="checkbox"
                checked={paidWithVoucher}
                onChange={(e) => setPaidWithVoucher(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-slate-700 focus:ring-slate-400"
              />
              Pago com vale alimentação
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-600 select-none cursor-pointer">
              <input
                type="checkbox"
                checked={paidWithCltPj}
                onChange={(e) => setPaidWithCltPj(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-slate-700 focus:ring-slate-400"
              />
              Pago com valor CLT/PJ
            </label>
          </div>
        )}

        {isExpense && item && otherMonths.length > 0 && (
          <div className="rounded-xl border border-slate-200 p-3.5">
            <span className="text-xs font-medium text-slate-500 mb-2 block">Mover para outro mês</span>
            <div className="flex gap-2">
              <select
                value={moveTarget}
                onChange={(e) => {
                  setMoveTarget(e.target.value);
                  setMoveError("");
                }}
                className="flex-1 min-w-0 px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-400"
              >
                <option value="">Selecione o mês</option>
                {otherMonths.map((m) => (
                  <option key={m} value={m}>
                    {monthLabel(m)}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleMove}
                disabled={!moveTarget || moving}
                className="shrink-0 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-300 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {moving ? "Movendo…" : "Mover"}
              </button>
            </div>
            {moveError && <p className="text-xs text-rose-600 mt-2">{moveError}</p>}
          </div>
        )}
      </div>

      <div className="flex gap-2 mt-5">
        <button
          onClick={onClose}
          className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-300"
        >
          Cancelar
        </button>
        <button
          onClick={submit}
          disabled={!canSave}
          className="flex-1 py-2.5 rounded-xl text-white text-sm font-semibold shadow-sm transition-opacity focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-400 disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: mode === "income" ? "#059669" : "#16382c" }}
        >
          Salvar
        </button>
      </div>
    </Overlay>
  );
}

function ConfirmModal({ state, onCancel, onConfirm }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onCancel();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);
  return (
    <Overlay onClose={onCancel}>
      <h3 className='text-base font-bold text-slate-800 mb-1'>Excluir lançamento?</h3>
      <p className='text-sm text-slate-500 mb-5'>
        “{state.payload.description || state.payload.source || state.payload.title || state.payload.cardName || state.payload.paymentMethod}” será removido. Não dá pra desfazer.
      </p>
      <div className='flex gap-2'>
        <button
          onClick={onCancel}
          className='flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-300'
        >
          Cancelar
        </button>
        <button
          onClick={onConfirm}
          className='flex-1 py-2.5 rounded-xl bg-rose-600 text-white text-sm font-semibold shadow-sm hover:bg-rose-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-rose-400'
        >
          Excluir
        </button>
      </div>
    </Overlay>
  );
}

function Overlay({ children, onClose }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-slate-900/40"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-sm p-5 shadow-xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-slate-500 mb-1 block">{label}</span>
      {children}
    </label>
  );
}
