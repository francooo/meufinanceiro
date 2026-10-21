import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  Plus, Trash2, X, Check,
  ArrowUpRight, ArrowDownRight, Landmark, HandCoins, Smartphone,
  DollarSign, LogOut, Calculator, Home, FileText, CreditCard,
  Eye, EyeOff, ChevronLeft, ChevronRight, Menu, Settings, BarChart3, CheckSquare, CheckCircle2,
  Moon, Sun, User,
} from "lucide-react";
import {
  CATS, catMeta, PAYMENT_METHODS, PAYMENT_METHOD_FALLBACK, allPaymentMethods,
  SERASA_CATS, serasaCatMeta, cardChargeOf,
} from "./src/web/lib/catalog.jsx";
import {
  setHideValues as applyHideValues, fmt, todayISO, addDaysISO, formatDayMonth,
  formatRelativeTime, monthKey, monthLabel, addMonths, uid,
} from "./src/web/lib/format.js";
import { Button, Panel, PageHeader, Skeleton, Toast } from "./src/web/ui/core.jsx";
import { ConfirmDialog } from "./src/web/ui/form.jsx";
import Gastos from "./src/web/screens/Gastos.jsx";
import Ganhos from "./src/web/screens/Ganhos.jsx";
import Dividas from "./src/web/screens/Dividas.jsx";
import { CartoesSaldos, CartoesFechamentos } from "./src/web/screens/Cartoes.jsx";
import { Desejos, ListaCompras } from "./src/web/screens/Listas.jsx";
import {
  ExpenseModal, IncomeModal, DebtModal, CardModal, BalanceModal, ClosingModal,
  WishModal, ShoppingItemModal, PairModal,
} from "./src/web/modals/index.jsx";

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

/* ---------- navegação (menu lateral) ---------- */
// As abas agrupadas nas seções do kit. `tab` continua sendo a fonte da verdade em
// todo o App; a seção é derivada dela. Seções com mais de uma aba mostram os
// sub-itens no menu quando estão ativas.
const SECTIONS = [
  { id: "inicio", label: "Início", icon: Home, tabs: [["overview", "Visão geral"]] },
  { id: "lancamentos", label: "Lançamentos", icon: FileText, tabs: [["gastos", "Gastos"], ["ganhos", "Ganhos"]] },
  { id: "cartoes", label: "Cartões", icon: CreditCard, tabs: [["cartoes", "Saldos"], ["fechamento", "Fechamentos"]] },
  { id: "dividas", label: "Dívidas", icon: BarChart3, tabs: [["serasa", "Dívidas"]] },
  { id: "listas", label: "Listas", icon: CheckSquare, tabs: [["desejos", "Desejos"], ["mercado", "Mercado"], ["farmacia", "Farmácia"]] },
];
const SETTINGS_SECTION = { id: "config", label: "Configurações", icon: Settings, tabs: [["config", "Configurações"]] };
const sectionOfTab = (t) =>
  [...SECTIONS, SETTINGS_SECTION].find((s) => s.tabs.some(([id]) => id === t)) || SECTIONS[0];

// Tema inicial: o que a pessoa escolheu da última vez ou, sem escolha, o do sistema.
const initialTheme = () => {
  try {
    const saved = localStorage.getItem("mf:theme");
    if (saved === "dark" || saved === "light") return saved;
  } catch {
    /* sem storage */
  }
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
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
  // Lido pelo fmt durante este render (ver setHideValues em src/web/lib/format.js).
  applyHideValues(hideValues);

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
  // Arrastar na lista de desejos: a tela devolve a ordem nova dos ids do grupo.
  const reorderWish = (ids) => {
    const orderById = new Map(ids.map((id, i) => [id, i]));
    setWishlist((prev) => prev.map((w) => (orderById.has(w.id) ? { ...w, order: orderById.get(w.id) } : w)));
  };

  /* Aviso "Gasto marcado como pago · Desfazer" + destaque da linha por ~5s. */
  const [toast, setToast] = useState(null); // {message, onUndo}
  const [highlightId, setHighlightId] = useState(null);
  const toastTimer = useRef(null);
  const dismissToast = useCallback(() => {
    clearTimeout(toastTimer.current);
    setToast(null);
    setHighlightId(null);
  }, []);
  const showToast = (message, id, onUndo) => {
    clearTimeout(toastTimer.current);
    setToast({ message, onUndo });
    setHighlightId(id);
    toastTimer.current = setTimeout(() => {
      setToast(null);
      setHighlightId(null);
    }, 5000);
  };
  useEffect(() => () => clearTimeout(toastTimer.current), []);

  const markExpensePaid = (item) => {
    togglePaid(item.id);
    if (item.paidAt) return dismissToast(); // desmarcar não precisa de aviso
    showToast("Gasto marcado como pago", item.id, () =>
      setExpenses((prev) => prev.map((e) => (e.id === item.id ? { ...e, paidAt: null } : e)))
    );
  };
  const markDebtPaid = (item) => {
    toggleSerasaPaid(item.id);
    if (item.paidAt) return dismissToast();
    showToast("Dívida marcada como paga", item.id, () =>
      setSerasa((prev) => prev.map((s) => (s.id === item.id ? { ...s, paidAt: null } : s)))
    );
  };

  // Modo escuro: classe `dark` no <html> (os tokens de src/index.css trocam sob ela).
  const [theme, setTheme] = useState(initialTheme);
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);
  const toggleTheme = () =>
    setTheme((t) => {
      const next = t === "dark" ? "light" : "dark";
      try {
        localStorage.setItem("mf:theme", next);
      } catch {
        /* sem storage: vale só nesta sessão */
      }
      return next;
    });

  const closingSuggestions = useMemo(
    () => [...new Set([...cards.map((c) => c.paymentMethod), ...allPaymentMethods(extraPaymentMethods).filter((p) => p !== "Pix")])],
    [cards, extraPaymentMethods]
  );

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
      <div className="min-h-screen flex items-center justify-center px-4 bg-canvas font-brand">
        <p className="text-sm text-muted text-center max-w-xs">
          Não foi possível carregar seus dados. Verifique sua conexão e recarregue a página.
        </p>
      </div>
    );
  }

  if (!loaded) return <LoadingScreen />;

  const section = sectionOfTab(tab);
  const wallets = {
    cltPj: { recebido: cltPjRecebido, gasto: cltPjGasto },
    va: { recebido: vaRecebido, gasto: vaUsado },
  };
  const homeSobra = wallets[wallet].recebido - wallets[wallet].gasto;
  const closeModal = () => setModal(null);
  const selectionProps = (kind) => ({
    selecting,
    isSelected: (id) => selectedKeys.has(selKey(kind, id)),
    onToggleSelect: (id) => toggleSelected(kind, id),
  });
  const askDelete = (mode) => (item) => setConfirmState({ kind: "delete", mode, payload: item });

  return (
    <div className="min-h-screen tabular-nums font-brand bg-canvas text-ink">
      <Sidebar
        tab={tab}
        onSelectSection={goSection}
        onSelectTab={(t) => {
          setTab(t);
          setMenuOpen(false);
        }}
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
      />

      <div className="lg:pl-[260px]">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-10 pt-5 sm:pt-7 pb-32">
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
            theme={theme}
            onToggleTheme={toggleTheme}
            email={email}
            onLogout={handleLogout}
          />

          <main className="mt-7 sm:mt-9">
            {tab === "overview" && (
              <>
                <PageHeader title="Visão geral" subtitle={homeSobra >= 0 ? "Seu mês em equilíbrio" : "Atenção aos gastos deste mês"} />
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
              </>
            )}

            {tab === "gastos" && (
              <Gastos
                grouped={gastosGrouped}
                total={totalGastos}
                extraPaymentMethods={extraPaymentMethods}
                onAdd={() => setModal({ mode: "expense", item: null })}
                onEdit={(item) => setModal({ mode: "expense", item })}
                onDelete={askDelete("expense")}
                onTogglePaid={markExpensePaid}
                onMove={moveExpense}
                onMovePaymentMethod={moveExpensePaymentMethod}
                highlightId={highlightId}
                {...selectionProps("expense")}
              />
            )}

            {tab === "ganhos" && (
              <Ganhos
                incomes={incomes}
                total={totalGanhos}
                month={month}
                onAdd={() => setModal({ mode: "income", item: null })}
                onEdit={(item) => setModal({ mode: "income", item })}
                onDelete={askDelete("income")}
                {...selectionProps("income")}
              />
            )}

            {/* sem props de seleção: saldo de cartão não é item de fluxo de caixa, então
                nada entra em SELECTION_SOURCES — uma chave `card:` quebraria selectionStats */}
            {tab === "cartoes" && (
              <CartoesSaldos
                cards={cardsWithUsage}
                unregistered={unregisteredMethodSpend}
                month={month}
                canAdd={canAddCard}
                onAdd={(presetMethod) =>
                  setModal({ mode: "card", item: null, presetMethod: typeof presetMethod === "string" ? presetMethod : undefined })
                }
                onEdit={(item) => setModal({ mode: "card", item })}
                onUpdateBalance={(item) => setModal({ mode: "balance", item })}
                onDelete={askDelete("card")}
              />
            )}

            {/* Sem props de seleção: fechamento não é item de fluxo de caixa, igual a Cartões. */}
            {tab === "fechamento" && (
              <CartoesFechamentos
                items={cardClosings}
                month={month}
                onAdd={() => setModal({ mode: "closing", item: null })}
                onEdit={(item) => setModal({ mode: "closing", item })}
                onDelete={askDelete("closing")}
              />
            )}

            {tab === "serasa" && (
              <Dividas
                grouped={serasaGrouped}
                total={totalSerasa}
                items={serasa}
                onAdd={() => setModal({ mode: "serasa", item: null })}
                onEdit={(item) => setModal({ mode: "serasa", item })}
                onDelete={askDelete("serasa")}
                onTogglePaid={markDebtPaid}
                onMove={moveSerasaItem}
                highlightId={highlightId}
                {...selectionProps("serasa")}
              />
            )}

            {tab === "desejos" && (
              <Desejos
                pending={wishGrouped.pending}
                done={wishGrouped.done}
                onAdd={() => setModal({ mode: "wish", item: null })}
                onEdit={(item) => setModal({ mode: "wish", item })}
                onDelete={askDelete("wish")}
                onToggleDone={(item) => toggleWishDone(item.id)}
                onMove={moveWish}
                onReorder={reorderWish}
                {...selectionProps("wish")}
              />
            )}

            {(tab === "mercado" || tab === "farmacia") && (
              <ListaCompras
                key={tab}
                kind={tab}
                items={shoppingLists[tab]}
                onAdd={() => setModal({ mode: tab, item: null })}
                onEdit={(item) => setModal({ mode: tab, item })}
                onDelete={askDelete(tab)}
                onToggleDone={(item) => toggleShoppingItemDone(tab, item.id)}
                onClearDone={tab === "mercado" ? () => clearDoneShoppingItems("mercado") : undefined}
                {...selectionProps(tab)}
              />
            )}

            {tab === "config" && (
              <>
                <PageHeader title="Configurações" subtitle="Sua conta e o app do celular" />
                <SettingsSection email={email} onPair={() => setModal({ mode: "pair" })} onLogout={handleLogout} />
              </>
            )}
          </main>
        </div>
      </div>

      {/* calculadora de seleção — z-40 fica sob os modais (z-50) */}
      {!selecting && tab !== "config" && (
        <div className="fixed bottom-0 inset-x-0 lg:left-[260px] z-40 pointer-events-none">
          {/* pb maior no mobile: 20px deixavam o botao atras da barra do navegador */}
          <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-10 pb-8 sm:pb-6 flex justify-end">
            <button
              type="button"
              onClick={() => setSelecting(true)}
              title="Somar itens"
              aria-label="Somar itens"
              className="pointer-events-auto touch-manipulation h-16 w-16 rounded-2xl bg-forest-2 text-white shadow-[0_14px_30px_-10px_rgba(11,48,37,0.6)] flex items-center justify-center hover:opacity-90 active:scale-95 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-champagne"
            >
              <Calculator className="h-7 w-7" />
            </button>
          </div>
        </div>
      )}

      {selecting && (
        <SelectionBar stats={selectionStats} label={selectionLabel} onClear={clearSelection} onClose={exitSelection} />
      )}

      {toast && !modal && (
        <Toast
          message={toast.message}
          actionLabel="Desfazer"
          onAction={() => {
            toast.onUndo();
            dismissToast();
          }}
          onClose={dismissToast}
        />
      )}

      {modal?.mode === "expense" && (
        <ExpenseModal
          item={modal.item}
          extraCategories={extraExpenseCategories}
          extraPaymentMethods={extraPaymentMethods}
          onClose={closeModal}
          onSave={saveEntry}
          months={months}
          currentMonth={month}
          onMoveMonth={moveExpenseToMonth}
        />
      )}
      {modal?.mode === "income" && <IncomeModal item={modal.item} onClose={closeModal} onSave={saveEntry} />}
      {modal?.mode === "serasa" && (
        <DebtModal item={modal.item} extraCategories={extraSerasaCategories} onClose={closeModal} onSave={saveEntry} />
      )}
      {modal?.mode === "card" && (
        <CardModal
          item={modal.item}
          presetMethod={modal.presetMethod}
          cards={cards}
          extraPaymentMethods={extraPaymentMethods}
          onClose={closeModal}
          onSave={saveCard}
        />
      )}
      {modal?.mode === "balance" && <BalanceModal card={modal.item} onClose={closeModal} onSave={saveCard} />}
      {modal?.mode === "closing" && (
        <ClosingModal item={modal.item} suggestions={closingSuggestions} onClose={closeModal} onSave={saveClosing} />
      )}
      {modal?.mode === "wish" && <WishModal item={modal.item} onClose={closeModal} onSave={saveWish} />}
      {(modal?.mode === "mercado" || modal?.mode === "farmacia") && (
        <ShoppingItemModal
          kind={modal.mode}
          item={modal.item}
          onClose={closeModal}
          onSave={(data, id) => saveShoppingItem(modal.mode, data, id)}
        />
      )}
      {modal?.mode === "pair" && <PairModal onClose={closeModal} />}

      {confirmState && (
        <ConfirmDialog
          title="Excluir lançamento?"
          message={`“${
            confirmState.payload.description ||
            confirmState.payload.source ||
            confirmState.payload.title ||
            confirmState.payload.cardName ||
            confirmState.payload.paymentMethod
          }” será removido. Não dá pra desfazer.`}
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

/* ---------- estrutura da web: menu lateral e barra superior ---------- */
// A seção ativa abre os sub-itens (Lançamentos → Gastos/Ganhos…), como no kit.
function SidebarNav({ tab, onSelectSection, onSelectTab }) {
  const active = sectionOfTab(tab).id;
  const item = (s) => {
    const Icon = s.icon;
    const on = active === s.id;
    const nested = on && s.tabs.length > 1;
    return (
      <div key={s.id}>
        <button
          onClick={() => onSelectSection(s)}
          aria-current={on && !nested ? "page" : undefined}
          aria-expanded={s.tabs.length > 1 ? on : undefined}
          className={
            "w-full flex items-center gap-4 px-4 py-3.5 rounded-xl text-[15px] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30 " +
            (on ? "text-white bg-white/[0.09]" : "text-emerald-50/75 hover:text-white hover:bg-white/5")
          }
        >
          <Icon size={22} strokeWidth={on ? 2.25 : 1.75} />
          <span className={"flex-1 text-left " + (on ? "font-semibold" : "")}>{s.label}</span>
        </button>
        {nested && (
          <div className="mt-1 mb-2 space-y-0.5">
            {s.tabs.map(([id, label]) => {
              const cur = tab === id;
              return (
                <button
                  key={id}
                  onClick={() => onSelectTab(id)}
                  aria-current={cur ? "page" : undefined}
                  className={
                    "w-[calc(100%-1.75rem)] ml-7 flex items-center gap-3 pl-4 pr-4 py-2.5 rounded-xl text-[15px] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30 " +
                    (cur ? "text-white bg-white/[0.08]" : "text-emerald-50/70 hover:text-white hover:bg-white/5")
                  }
                >
                  <span className={"h-3 w-3 rounded-full " + (cur ? "bg-mint/90" : "border border-emerald-50/50")} />
                  {label}
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  };
  return (
    <div className="flex h-full flex-col px-4 py-7 overflow-y-auto">
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
function Sidebar({ open, onClose, ...nav }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <>
      <aside className="hidden lg:block fixed inset-y-0 left-0 w-[260px] z-30" style={{ background: SIDEBAR_BG }}>
        <SidebarNav {...nav} />
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
            <SidebarNav {...nav} />
          </aside>
        </div>
      )}
    </>
  );
}

// ‹ Outubro de 2026 › — as setas andam pelos meses que existem; o nome abre a
// lista completa com "+ Adicionar" o próximo mês.
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
    "h-11 w-9 sm:w-11 flex items-center justify-center text-muted rounded-2xl hover:bg-surface-2 hover:text-ink disabled:opacity-30 disabled:hover:bg-transparent focus:outline-none focus-visible:ring-2 focus-visible:ring-champagne/50";
  return (
    <div ref={ref} className="relative flex items-center bg-surface rounded-2xl border border-line shadow-card">
      <button className={arrow} onClick={() => onChange(prev)} disabled={!prev || disabled} aria-label="Mês anterior">
        <ChevronLeft size={20} />
      </button>
      <button
        onClick={() => setOpen((o) => !o)}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="h-11 px-1 sm:px-3 min-w-[118px] sm:min-w-[170px] whitespace-nowrap text-[14px] sm:text-[15px] font-medium text-ink hover:bg-surface-2 rounded-xl disabled:opacity-60 disabled:cursor-wait focus:outline-none focus-visible:ring-2 focus-visible:ring-champagne/50"
      >
        {monthLabel(month)}
      </button>
      <button className={arrow} onClick={() => onChange(next)} disabled={!next || disabled} aria-label="Próximo mês">
        <ChevronRight size={20} />
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-2 z-40 w-64 bg-surface rounded-2xl border border-line shadow-lg py-2 max-h-80 overflow-y-auto" role="listbox">
          {months.map((m) => (
            <button
              key={m}
              role="option"
              aria-selected={m === month}
              onClick={() => {
                setOpen(false);
                onChange(m);
              }}
              className={"w-full flex items-center justify-between px-4 py-2.5 text-sm hover:bg-surface-2 " + (m === month ? "font-semibold text-ink" : "text-muted")}
            >
              {monthLabel(m)}
              {m === month && <Check size={15} className="text-positive" />}
            </button>
          ))}
          <div className="my-1 border-t border-line" />
          <button
            onClick={() => {
              setOpen(false);
              onAddNext();
            }}
            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-positive hover:bg-tint-green"
          >
            <Plus size={15} /> Adicionar {monthLabel(nextMonthKey)}
          </button>
        </div>
      )}
    </div>
  );
}

const initialsOf = (email) => (email.split("@")[0].replace(/[^a-zA-Z]/g, "").slice(0, 2) || "MF").toUpperCase();

function TopBar({ onOpenMenu, months, month, nextMonthKey, onChangeMonth, onAddNextMonth, monthDisabled, saved, hideValues, onToggleHide, theme, onToggleTheme, email, onLogout }) {
  const square =
    "h-11 w-11 shrink-0 rounded-xl flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-champagne/50";
  const boxed = square + " bg-surface border border-line shadow-card text-ink hover:border-muted/40";
  const dark = theme === "dark";
  return (
    <div className="flex items-center gap-2 sm:gap-3">
      <button onClick={onOpenMenu} aria-label="Abrir menu" className={boxed + " lg:hidden"}>
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
      <div className="ml-auto flex items-center gap-2 sm:gap-3">
        <span
          className={"hidden md:flex items-center gap-1.5 text-[15px] text-muted transition-opacity duration-300 " + (saved ? "opacity-100" : "opacity-0")}
          aria-live="polite"
        >
          <CheckCircle2 size={20} className="text-positive" /> Salvo
        </span>
        <div className="hidden md:block h-8 w-px bg-line" />
        <button
          onClick={onToggleTheme}
          title={dark ? "Modo claro" : "Modo escuro"}
          aria-label={dark ? "Ativar modo claro" : "Ativar modo escuro"}
          aria-pressed={dark}
          className={boxed}
        >
          {dark ? <Sun size={20} /> : <Moon size={20} />}
        </button>
        <button
          onClick={onToggleHide}
          title={hideValues ? "Mostrar valores" : "Ocultar valores"}
          aria-label={hideValues ? "Mostrar valores" : "Ocultar valores"}
          aria-pressed={hideValues}
          className={boxed}
        >
          {hideValues ? <EyeOff size={20} /> : <Eye size={20} />}
        </button>
        <span
          title={email}
          className="hidden sm:flex h-12 w-12 shrink-0 rounded-full items-center justify-center text-white text-[15px] font-bold bg-forest dark:bg-forest-2"
        >
          {initialsOf(email)}
        </span>
        {/* no celular a barra não comporta: "Sair" fica em Configurações */}
        <button onClick={onLogout} title="Sair" aria-label="Sair" className={square + " hidden sm:flex text-ink hover:bg-surface"}>
          <LogOut size={21} />
        </button>
      </div>
    </div>
  );
}

// Barra de baixo do modo "Somar itens" (somar-itens.jpg).
function SelectionBar({ stats, label, onClear, onClose }) {
  const tone = stats.mixed ? (stats.net >= 0 ? "text-positive" : "text-coral") : stats.inflow > 0 ? "text-positive" : "text-heading";
  return (
    <div className="fixed bottom-0 inset-x-0 lg:left-[260px] z-40 px-3 sm:px-6 lg:px-10 pb-[max(0.75rem,env(safe-area-inset-bottom))] pointer-events-none">
      <div className="max-w-[1280px] mx-auto">
        <div className="pointer-events-auto ml-auto max-w-[760px] flex items-center gap-3 sm:gap-5 rounded-2xl bg-surface border border-line shadow-[0_-4px_28px_rgba(15,23,42,0.14)] px-4 sm:px-6 py-3.5">
          <span className="hidden sm:flex h-11 w-11 shrink-0 rounded-full bg-tint-green text-positive items-center justify-center">
            <Calculator size={20} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] sm:text-[14px] text-muted truncate">
              {stats.count === 0 ? "Marque itens para somar" : stats.count === 1 ? "1 item selecionado" : `${stats.count} itens selecionados`}
              {stats.count > 0 && label && <span className="hidden md:inline"> · {label}</span>}
            </p>
            {stats.mixed && (
              <p className="text-[12px] text-muted tabular-nums flex items-center gap-2.5 leading-tight">
                <span className="flex items-center gap-0.5">
                  <ArrowUpRight size={12} className="text-positive" />
                  entra {fmt(stats.inflow)}
                </span>
                <span className="flex items-center gap-0.5">
                  <ArrowDownRight size={12} className="text-coral" />
                  sai {fmt(stats.outflow)}
                </span>
              </p>
            )}
          </div>
          <div className="text-right shrink-0">
            <p className="text-[12px] sm:text-[13px] text-muted">{stats.mixed ? "Saldo somado" : "Total somado"}</p>
            <p className={"font-display text-[20px] sm:text-[24px] leading-tight tabular-nums " + tone}>
              {stats.mixed
                ? `${stats.net >= 0 ? "+ " : "− "}${fmt(Math.abs(stats.net))}`
                : fmt(stats.inflow > 0 ? stats.inflow : stats.outflow)}
            </p>
          </div>
          <Button variant="secondary" size="sm" onClick={onClear} disabled={stats.count === 0} className="shrink-0">
            Limpar
          </Button>
          <button
            type="button"
            onClick={onClose}
            title="Fechar calculadora"
            aria-label="Fechar calculadora"
            className="shrink-0 h-9 w-9 rounded-xl border border-line text-muted flex items-center justify-center hover:text-ink hover:bg-surface-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-champagne/50"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

// Carregamento em esqueleto (home-carregamento.jpg): a estrutura já aparece.
function LoadingScreen() {
  return (
    <div className="min-h-screen font-brand bg-canvas" aria-busy="true" aria-label="Carregando seu caixa">
      <aside className="hidden lg:block fixed inset-y-0 left-0 w-[260px]" style={{ background: SIDEBAR_BG }}>
        <div className="px-6 py-7 space-y-5">
          <div className="flex items-center gap-3 mb-10">
            <span className="h-11 w-11 rounded-xl bg-white/10" />
            <span className="h-4 w-32 rounded bg-white/10" />
          </div>
          {[0, 1, 2, 3, 4].map((i) => (
            <span key={i} className="block h-4 rounded bg-white/[0.08]" style={{ width: `${70 - i * 6}%` }} />
          ))}
        </div>
      </aside>
      <div className="lg:pl-[260px]">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-10 pt-5 sm:pt-7">
          <div className="flex items-center gap-3">
            <Skeleton className="h-11 w-[230px] rounded-2xl" />
            <Skeleton className="ml-auto h-11 w-11 rounded-xl" />
            <Skeleton className="h-11 w-11 rounded-xl" />
            <Skeleton className="hidden sm:block h-12 w-12 rounded-full" />
          </div>
          <Skeleton className="mt-9 h-10 w-56" />
          <Skeleton className="mt-3 h-5 w-72 max-w-full" />
          <div className="mt-7 grid grid-cols-1 gap-5 lg:gap-6 xl:grid-cols-[minmax(0,1.32fr)_minmax(0,1fr)]">
            {[0, 1, 2, 3].map((i) => (
              <Panel key={i} className="space-y-4">
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-10 w-2/3" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-1/2" />
              </Panel>
            ))}
          </div>
          <p className="sr-only">Carregando seu caixa…</p>
        </div>
      </div>
    </div>
  );
}

function SettingsSection({ email, onPair, onLogout }) {
  return (
    <div className="grid gap-4 max-w-3xl">
      <Panel>
        <h2 className="font-display font-semibold text-[22px] mb-4 text-heading">Conta</h2>
        <div className="flex items-center gap-4">
          <span className="h-12 w-12 shrink-0 rounded-full flex items-center justify-center text-white font-bold bg-forest dark:bg-forest-2">
            {email ? initialsOf(email) : <User size={20} />}
          </span>
          <div className="min-w-0">
            <p className="text-sm text-muted">Conectado como</p>
            <p className="text-[15px] font-medium text-ink truncate">{email || "—"}</p>
          </div>
        </div>
      </Panel>
      <Panel>
        <h2 className="font-display font-semibold text-[22px] mb-1 text-heading">Celular</h2>
        <p className="text-sm text-muted mb-4">Gere um código para entrar no app do celular sem precisar do login do Google.</p>
        <Button icon={Smartphone} onClick={onPair}>
          Parear celular
        </Button>
      </Panel>
      <Panel>
        <Button variant="danger" icon={LogOut} onClick={onLogout}>
          Sair da conta
        </Button>
      </Panel>
    </div>
  );
}


function HomeCard({ children, className = "" }) {
  return (
    <section
      className={"rounded-[22px] bg-surface border border-line shadow-card p-5 sm:p-6 " + className}
    >
      {children}
    </section>
  );
}

function HomeCardHeader({ title, action, onAction, chevronOnly }) {
  return (
    <div className="flex items-center justify-between gap-3 mb-5">
      <h2 className="font-display font-semibold text-[21px] sm:text-[22px] leading-tight text-heading">
        {title}
      </h2>
      {onAction && (
        <button
          onClick={onAction}
          aria-label={chevronOnly ? `Ver ${title.toLowerCase()}` : undefined}
          className={"shrink-0 whitespace-nowrap flex items-center gap-1 text-[14px] sm:text-[15px] font-medium rounded-lg px-1.5 py-1 hover:bg-tint-gold focus:outline-none focus:ring-2 focus:ring-champagne/40 " + (chevronOnly ? "text-heading" : "text-gold")}
        >
          {action}
          <ChevronRight size={chevronOnly ? 22 : 17} />
        </button>
      )}
    </div>
  );
}

/* ---------- home ("Visão geral") ---------- */
const INCOME_GREEN = "rgb(var(--positive))";
const EXPENSE_RED = "rgb(var(--coral))";
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
        <p className="text-sm text-muted py-6 text-center">Nada previsto para os próximos 7 dias.</p>
      ) : (
        <ol className="relative">
          {/* fio da linha do tempo, passando pelos pontos */}
          <span aria-hidden="true" className="hidden sm:block absolute left-[71px] top-6 bottom-6 w-px bg-line" />
          {items.map((it) => {
            const income = it.kind === "income";
            const Icon = income ? HandCoins : catMeta(it.category).icon;
            const dot = income ? INCOME_GREEN : it.overdue ? "#C9785A" : "#C89B3C";
            return (
              <li key={`${it.kind}-${it.id}`} className="relative flex items-center gap-3 py-3">
                <span
                  className={"w-[52px] shrink-0 text-[13px] sm:text-[14px] " + (it.overdue ? "font-medium" : "text-muted")}
                  style={it.overdue ? { color: EXPENSE_RED } : undefined}
                >
                  {formatDayMonth(it.date)}
                </span>
                <span className="hidden sm:block relative z-10 h-3.5 w-3.5 shrink-0 rounded-full ring-4 ring-surface" style={{ background: dot }} />
                <span
                  className="h-10 w-10 sm:h-11 sm:w-11 shrink-0 rounded-full flex items-center justify-center"
                  style={income ? { background: "rgb(var(--tint-green))", color: INCOME_GREEN } : { background: "rgb(var(--tint-coral))", color: EXPENSE_RED }}
                >
                  <Icon size={20} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-display text-[16px] sm:text-[17px] leading-tight line-clamp-2 break-words text-heading">
                    {it.title}
                  </p>
                  <p className="text-[13px] text-muted truncate">
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
        <p className="text-sm text-muted py-10 text-center">Sem gastos ainda neste mês.</p>
      ) : (
        <div className="flex flex-col sm:flex-row items-center gap-6 sm:gap-8">
          {/* Rosca menor em larguras intermediárias: no grid de 2 colunas o card
              pode ter só ~500px úteis (tela menor ou zoom do navegador). */}
          <div className="relative h-52 w-52 sm:h-48 sm:w-48 2xl:h-60 2xl:w-60 shrink-0">
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
              <span className="font-display font-semibold text-[16px] sm:text-[15px] 2xl:text-[19px] leading-tight text-heading">
                {fmt(totalGastos)}
              </span>
              <span className="text-[13px] text-muted">em gastos</span>
            </div>
          </div>
          {/* min-w-0 + flex-1: sem isso a lista não encolhia abaixo da linha mais
              larga ("Cartões / Financeiro 35%") e as % vazavam para fora do card.
              Agora o nome trunca e a % (shrink-0) nunca é cortada. */}
          <ul className="w-full sm:w-auto sm:flex-1 min-w-0 space-y-4">
            {slices.map((s) => (
              <li key={s.name} className="flex items-center gap-3 text-[15px] sm:text-[16px]">
                <span className="h-4 w-4 shrink-0 rounded-full" style={{ background: s.color }} />
                <span className="flex-1 min-w-0 truncate text-ink" title={s.name}>
                  {s.name}
                </span>
                <span className="shrink-0 tabular-nums text-ink">{s.pct}%</span>
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
        <p className="text-sm text-muted py-10 text-center">Nenhum item adicionado ainda neste mês.</p>
      ) : (
        <ul className="divide-y divide-line">
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
                  className="flex items-center gap-3 py-3 -mx-2 px-2 rounded-xl cursor-pointer hover:bg-surface-2 focus:outline-none focus:ring-2 focus:ring-line"
                >
                  <span
                    className="h-10 w-10 sm:h-11 sm:w-11 shrink-0 rounded-full flex items-center justify-center"
                    style={{ background: income ? "rgb(var(--tint-green))" : color + "1F", color }}
                  >
                    <Icon size={20} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-display text-[16px] sm:text-[17px] leading-tight line-clamp-2 break-words text-heading">
                      {it.label}
                    </p>
                    <p className="text-[13px] text-muted truncate">
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
                    className="h-8 w-8 shrink-0 rounded-lg text-muted hover:text-coral hover:bg-tint-coral flex items-center justify-center opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity focus:outline-none focus:ring-2 focus:ring-rose-300"
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
