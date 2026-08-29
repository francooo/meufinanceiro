import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  Wallet, Plus, Pencil, Trash2, X, Check,
  ArrowUpRight, ArrowDownRight, PiggyBank, Tag,
  Home, GraduationCap, HeartPulse, Lightbulb, Smartphone,
  Landmark, Car, CreditCard, Repeat, Gamepad2,
  DollarSign, LogOut, Search, ChevronUp, ChevronDown,
  HandCoins, FileText, AlertTriangle, Shirt,
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

const SERASA_CATS = [
  { name: "Cartão de crédito", color: "#D6493B", icon: CreditCard },
  { name: "Empréstimo", color: "#7A5AF8", icon: HandCoins },
  { name: "Financiamento", color: "#1098AD", icon: FileText },
  { name: "Conta atrasada", color: "#E8873C", icon: AlertTriangle },
  { name: "Outros", color: "#64748B", icon: Tag },
];
const serasaCatMeta = (n) => SERASA_CATS.find((c) => c.name === n) || { name: n, ...FALLBACK };

const uid = () =>
  (typeof crypto !== "undefined" && crypto.randomUUID)
    ? crypto.randomUUID()
    : "id-" + Math.random().toString(36).slice(2) + Date.now();

/* ---------- helpers ---------- */
const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const fmt = (n) => brl.format(Number(n) || 0);

const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const formatDateBR = (iso) => {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
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
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [tab, setTab] = useState("overview");
  const [modal, setModal] = useState(null); // {mode:'expense'|'income'|'wish'|'mercado'|'farmacia', item|null}
  const [confirmState, setConfirmState] = useState(null); // {kind, payload}
  const [saved, setSaved] = useState(false);
  const savedTimer = useRef(null);

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

  const nextMonthKey = useMemo(
    () => addMonths(months.length > 0 ? months[months.length - 1] : month, 1),
    [months, month]
  );

  const handleMonthChange = async (newMonth) => {
    if (newMonth === month || switchingMonth) return;
    setSwitchingMonth(true);
    const data = await store.load(newMonth);
    if (data && Array.isArray(data.expenses)) {
      setMonth(newMonth);
      setExpenses(data.expenses);
      setIncomes(Array.isArray(data.incomes) ? data.incomes : []);
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
    } catch (err) {
      console.error(err);
    } finally {
      setCreatingMonth(false);
    }
  };

  const totalGastos = useMemo(() => expenses.reduce((s, e) => s + (Number(e.value) || 0), 0), [expenses]);
  const totalGanhos = useMemo(() => incomes.reduce((s, i) => s + (Number(i.value) || 0), 0), [incomes]);

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

  const nextIncomes = useMemo(() => {
    const today = todayISO();
    const upcoming = incomes
      .filter((i) => i.receiptDate && i.receiptDate >= today)
      .sort((a, b) => (a.receiptDate < b.receiptDate ? -1 : 1));
    if (upcoming.length === 0) return [];
    const nextDate = upcoming[0].receiptDate;
    return upcoming.filter((i) => i.receiptDate === nextDate);
  }, [incomes]);

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

  const extraExpenseCategories = useMemo(() => {
    const known = new Set(CATS.map((c) => c.name));
    return [...new Set(expenses.map((e) => e.category).filter((c) => c && !known.has(c)))].sort();
  }, [expenses]);

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

  /* CRUD */
  const saveEntry = (mode, data, id) => {
    if (mode === "expense") {
      setExpenses((prev) =>
        id ? prev.map((e) => (e.id === id ? { ...e, ...data } : e)) : [...prev, { id: uid(), ...data }]
      );
    } else if (mode === "serasa") {
      setSerasa((prev) =>
        id ? prev.map((s) => (s.id === id ? { ...s, ...data } : s)) : [...prev, { id: uid(), ...data }]
      );
    } else {
      setIncomes((prev) =>
        id ? prev.map((i) => (i.id === id ? { ...i, ...data } : i)) : [...prev, { id: uid(), ...data }]
      );
    }
    setModal(null);
  };
  const removeEntry = (mode, id) => {
    if (mode === "expense") setExpenses((p) => p.filter((e) => e.id !== id));
    else if (mode === "income") setIncomes((p) => p.filter((i) => i.id !== id));
    else if (mode === "wish") setWishlist((p) => p.filter((w) => w.id !== id));
    else if (mode === "serasa") setSerasa((p) => p.filter((s) => s.id !== id));
    else setShoppingLists((prev) => ({ ...prev, [mode]: prev[mode].filter((it) => it.id !== id) }));
    setConfirmState(null);
  };
  const togglePaid = (id) => {
    setExpenses((prev) =>
      prev.map((e) => (e.id === id ? { ...e, paidAt: e.paidAt ? null : todayISO() } : e))
    );
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
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#F1F4F2" }}>
        <div className="flex items-center gap-3 text-slate-500">
          <div className="h-5 w-5 rounded-full border-2 border-slate-300 border-t-slate-600 animate-spin" />
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

  return (
    <div className="min-h-screen tabular-nums" style={{ background: "#F1F4F2" }}>
      <div className="max-w-2xl mx-auto px-4 pt-6 pb-28">
        {/* topo */}
        <header className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl flex items-center justify-center text-white shadow-sm" style={{ background: "#16382c" }}>
              <Wallet size={20} />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-800 leading-tight">Meu financeiro</h1>
              <MonthDropdown
                months={months}
                month={month}
                nextMonthKey={nextMonthKey}
                onChange={handleMonthChange}
                onAddNext={handleAddNextMonth}
                disabled={switchingMonth || creatingMonth}
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={"text-xs text-emerald-600 flex items-center gap-1 transition-opacity duration-300 " + (saved ? "opacity-100" : "opacity-0")}
            >
              <Check size={13} /> Salvo
            </span>
            <button
              onClick={handleLogout}
              title="Sair"
              className="h-9 w-9 rounded-xl bg-white border border-slate-200 text-slate-500 flex items-center justify-center hover:text-slate-800 hover:border-slate-300 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-300"
            >
              <LogOut size={16} />
            </button>
          </div>
        </header>

        {nextIncomes.length > 0 && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm rounded-2xl px-4 py-3 mb-5">
            <div className="flex items-center gap-2 font-medium">
              <ArrowUpRight size={16} className="shrink-0" />
              <span>
                Você vai receber no dia <strong>{formatDateBR(nextIncomes[0].receiptDate)}</strong>
              </span>
            </div>
            <ul className="mt-2 pl-6 space-y-1 list-disc marker:text-emerald-400">
              {nextIncomes.map((inc) => (
                <li key={inc.id}>
                  <strong className="tabular-nums">{fmt(inc.value)}</strong> de <strong>{inc.source}</strong>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* hero: carteiras */}
        <section
          className="rounded-3xl p-6 text-white shadow-lg mb-5"
          style={{ background: "linear-gradient(135deg,#0f2e25 0%,#16382c 55%,#1e4a38 100%)" }}
        >
          <div>
            <p className="text-xs uppercase tracking-wider text-emerald-200/80 mb-3">Vale Alimentação</p>
            <div className="flex items-center justify-between gap-3">
              <HeroStat icon={<ArrowUpRight size={15} />} label="Recebido" value={fmt(vaRecebido)} tone="up" />
              <div className="h-8 w-px bg-white/15" />
              <HeroStat icon={<ArrowDownRight size={15} />} label="Usado" value={fmt(vaUsado)} tone="down" />
              <div className="h-8 w-px bg-white/15" />
              <HeroStat icon={<PiggyBank size={15} />} label="Restante" value={fmt(vaRestante)} tone={vaRestante >= 0 ? "up" : "down"} />
            </div>
          </div>

          <div className="h-px bg-white/10 my-5" />

          <div>
            <p className="text-xs uppercase tracking-wider text-emerald-200/80 mb-3">CLT/PJ</p>
            <div className="flex items-center justify-between gap-3">
              <HeroStat icon={<ArrowUpRight size={15} />} label="Recebido" value={fmt(cltPjRecebido)} tone="up" />
              <div className="h-8 w-px bg-white/15" />
              <HeroStat icon={<ArrowDownRight size={15} />} label="Gasto" value={fmt(cltPjGasto)} tone="down" />
              <div className="h-8 w-px bg-white/15" />
              <HeroStat icon={<PiggyBank size={15} />} label="Sobra" value={fmt(cltPjSobra)} tone={cltPjSobra >= 0 ? "up" : "down"} />
            </div>
          </div>
        </section>

        {/* tabs */}
        <div className="flex gap-1 overflow-x-auto bg-white rounded-full p-1 border border-slate-200 mb-5 shadow-sm">
          {[
            ["overview", "Visão geral"],
            ["gastos", "Gastos"],
            ["ganhos", "Ganhos"],
            ["desejos", "Desejos"],
            ["mercado", "Mercado"],
            ["farmacia", "Farmácia"],
            ["serasa", "Serasa"],
          ].map(([id, label]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={
                "shrink-0 px-4 text-sm font-medium py-2 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-slate-300 " +
                (tab === id ? "text-white" : "text-slate-500 hover:text-slate-800")
              }
              style={tab === id ? { background: "#16382c" } : undefined}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === "overview" && (
          <Overview byCat={byCat} totalGastos={totalGastos} expenses={expenses} />
        )}

        {tab === "gastos" && (
          <Gastos
            grouped={gastosGrouped}
            total={totalGastos}
            onAdd={() => setModal({ mode: "expense", item: null })}
            onEdit={(item) => setModal({ mode: "expense", item })}
            onDelete={(item) => setConfirmState({ kind: "delete", mode: "expense", payload: item })}
            onTogglePaid={(item) => togglePaid(item.id)}
            onMove={moveExpense}
            onMovePaymentMethod={moveExpensePaymentMethod}
          />
        )}

        {tab === "ganhos" && (
          <Ganhos
            incomes={incomes}
            total={totalGanhos}
            onAdd={() => setModal({ mode: "income", item: null })}
            onEdit={(item) => setModal({ mode: "income", item })}
            onDelete={(item) => setConfirmState({ kind: "delete", mode: "income", payload: item })}
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
          />
        )}

        {tab === "farmacia" && (
          <ShoppingListTab
            items={shoppingLists.farmacia}
            onAdd={() => setModal({ mode: "farmacia", item: null })}
            onEdit={(item) => setModal({ mode: "farmacia", item })}
            onDelete={(item) => setConfirmState({ kind: "delete", mode: "farmacia", payload: item })}
            onToggleDone={(item) => toggleShoppingItemDone("farmacia", item.id)}
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
          />
        )}
      </div>

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

      {modal && (modal.mode === "expense" || modal.mode === "income" || modal.mode === "serasa") && (
        <EntryModal
          mode={modal.mode}
          item={modal.item}
          extraCategories={modal.mode === "serasa" ? extraSerasaCategories : extraExpenseCategories}
          onClose={() => setModal(null)}
          onSave={saveEntry}
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
function LoginScreen({ onLogin }) {
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  const buttonRef = useRef(null);

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
        window.google.accounts.id.renderButton(buttonRef.current, {
          type: "standard",
          theme: "outline",
          size: "large",
          width: 296,
          text: "continue_with",
          shape: "rectangular",
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
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "#F1F4F2" }}>
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center text-center mb-8">
          <div
            className="h-16 w-16 rounded-3xl flex items-center justify-center text-white shadow-lg mb-4"
            style={{ background: "linear-gradient(135deg,#0f2e25 0%,#16382c 55%,#1e4a38 100%)" }}
          >
            <DollarSign size={30} />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Meu financeiro</h1>
          <p className="text-sm text-slate-500 mt-1">Organize seus ganhos e gastos em um só lugar</p>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
          <div className="min-h-[44px] flex items-center justify-center">
            {!ready && !error && <div className="h-4 w-4 rounded-full border-2 border-slate-300 border-t-slate-600 animate-spin" />}
            <div ref={buttonRef} className={ready ? "flex justify-center" : "hidden"} />
          </div>
          {error && <p className="text-xs text-rose-500 text-center mt-3">{error}</p>}
          <p className="text-[11px] text-slate-400 text-center mt-4 leading-relaxed">
            Acesso restrito à conta autorizada.
          </p>
        </div>
      </div>
    </div>
  );
}

/* ---------- subcomponentes ---------- */
const ADD_NEXT_MONTH = "__add_next__";
const NEW_CATEGORY = "__new_category__";
const NEW_PAYMENT_METHOD = "__new_payment_method__";

function MonthDropdown({ months, month, nextMonthKey, onChange, onAddNext, disabled }) {
  return (
    <select
      value={month}
      disabled={disabled}
      onChange={(e) => {
        if (e.target.value === ADD_NEXT_MONTH) onAddNext();
        else onChange(e.target.value);
      }}
      className="text-xs text-slate-500 leading-tight bg-transparent border-none -ml-1 pl-1 pr-1 py-0 rounded cursor-pointer focus:outline-none focus:ring-2 focus:ring-slate-300 disabled:opacity-60 disabled:cursor-wait"
    >
      {months.map((m) => (
        <option key={m} value={m}>
          {monthLabel(m)}
        </option>
      ))}
      <option value={ADD_NEXT_MONTH}>+ Adicionar {monthLabel(nextMonthKey)}</option>
    </select>
  );
}

function HeroStat({ icon, label, value, subValue, tone }) {
  return (
    <div className="flex-1 min-w-0">
      <div className={"flex items-center gap-1 text-[11px] " + (tone === "up" ? "text-emerald-300" : "text-rose-300")}>
        {icon}
        <span className="text-emerald-100/70 uppercase tracking-wide">{label}</span>
      </div>
      <div className="text-sm font-semibold text-white truncate mt-0.5 tabular-nums">{value}</div>
      {subValue && <div className="text-[11px] text-emerald-100/60 truncate tabular-nums">{subValue}</div>}
    </div>
  );
}

function Card({ children, className = "" }) {
  return (
    <div className={"bg-white rounded-2xl border border-slate-200 shadow-sm " + className}>{children}</div>
  );
}

function Overview({ byCat, totalGastos, expenses }) {
  const [search, setSearch] = useState("");
  const query = search.trim().toLowerCase();
  const isSearching = query !== "";

  const sortedGastos = useMemo(
    () => [...expenses].filter((e) => e.value > 0).sort((a, b) => b.value - a.value),
    [expenses]
  );

  const listedGastos = useMemo(
    () => (isSearching ? sortedGastos.filter((e) => e.description.toLowerCase().includes(query)) : sortedGastos.slice(0, 5)),
    [sortedGastos, isSearching, query]
  );

  const foundTotal = useMemo(
    () => listedGastos.reduce((s, e) => s + (Number(e.value) || 0), 0),
    [listedGastos]
  );

  return (
    <div className="space-y-5">
      <Card className="p-5">
        <h2 className="text-sm font-semibold text-slate-800 mb-4">Para onde vai o dinheiro</h2>
        {byCat.length === 0 ? (
          <Empty text="Sem gastos ainda. Adicione o primeiro na aba Gastos." />
        ) : (
          <div className="space-y-3.5">
            {byCat.map((c) => {
              const pct = totalGastos > 0 ? Math.round((c.value / totalGastos) * 100) : 0;
              const Icon = c.icon;
              return (
                <div key={c.name}>
                  <div className="flex items-center gap-2.5 mb-1.5">
                    <span
                      className="h-7 w-7 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: c.color + "1F", color: c.color }}
                    >
                      <Icon size={15} />
                    </span>
                    <span className="text-sm text-slate-700 flex-1 truncate">{c.name}</span>
                    <span className="text-sm font-semibold text-slate-800 tabular-nums">{fmt(c.value)}</span>
                    <span className="text-xs text-slate-400 w-9 text-right tabular-nums">{pct}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 overflow-hidden ml-9">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: c.color }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Card className="p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-800">{isSearching ? "Resultado da busca" : "Maiores gastos"}</h2>
          {isSearching && <span className="text-sm font-semibold text-slate-800 tabular-nums">{fmt(foundTotal)}</span>}
        </div>

        <div className="relative mb-3.5">
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

        {listedGastos.length === 0 ? (
          <Empty text={isSearching ? "Nenhum gasto encontrado." : "Nada por aqui."} />
        ) : (
          <div className="divide-y divide-slate-100">
            {listedGastos.map((e, i) => {
              const c = catMeta(e.category);
              return (
                <div key={e.id} className="flex items-center gap-3 py-2.5">
                  <span className="text-xs font-semibold text-slate-300 w-4 tabular-nums">{i + 1}</span>
                  <span className="h-2 w-2 rounded-full shrink-0" style={{ background: c.color }} />
                  <span className="text-sm text-slate-700 flex-1 truncate">{e.description}</span>
                  <span className="text-sm font-semibold text-slate-800 tabular-nums">{fmt(e.value)}</span>
                </div>
              );
            })}
          </div>
        )}
      </Card>
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

function Gastos({ grouped, total, onAdd, onEdit, onDelete, onTogglePaid, onMove, onMovePaymentMethod }) {
  const [search, setSearch] = useState("");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState("");
  const [dueDateFrom, setDueDateFrom] = useState("");
  const [dueDateTo, setDueDateTo] = useState("");
  const [valueSort, setValueSort] = useState("none");
  const query = search.trim().toLowerCase();
  const isSearching = query !== "";
  const filtersActive =
    isSearching || paymentMethodFilter !== "" || dueDateFrom !== "" || dueDateTo !== "" || valueSort !== "none";

  const clearFilters = () => {
    setSearch("");
    setPaymentMethodFilter("");
    setDueDateFrom("");
    setDueDateTo("");
    setValueSort("none");
  };

  const filteredGrouped = useMemo(() => {
    let result = grouped;
    if (query || paymentMethodFilter || dueDateFrom || dueDateTo) {
      result = grouped
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
    }
    if (valueSort !== "none") {
      result = result.map((g) => ({ ...g, items: sortByValueSort(g.items, valueSort) }));
    }
    return result;
  }, [grouped, query, paymentMethodFilter, dueDateFrom, dueDateTo, valueSort]);

  const visibleTotal = useMemo(
    () => filteredGrouped.reduce((s, g) => s + g.subtotal, 0),
    [filteredGrouped]
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-slate-500">{filtersActive ? "Total encontrado" : "Total de gastos"}</p>
          <p className="text-xl font-bold text-slate-800 tabular-nums">{fmt(filtersActive ? visibleTotal : total)}</p>
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
        <select
          value={paymentMethodFilter}
          onChange={(e) => setPaymentMethodFilter(e.target.value)}
          className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-400"
        >
          <option value="">Todas as formas de pagamento</option>
          {PAYMENT_METHODS.map((p) => (
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

function Serasa({ grouped, total, onAdd, onEdit, onDelete, onTogglePaid, onMove }) {
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

function Ganhos({ incomes, total, onAdd, onEdit, onDelete }) {
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
              onEdit={() => onEdit(i)}
              onDelete={() => onDelete(i)}
            />
          ))}
        </Card>
      )}
    </div>
  );
}

function Desejos({ pending, done, onAdd, onEdit, onDelete, onToggleDone, onMove }) {
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

function WishRow({ item, onEdit, onDelete, onToggleDone, position, onMoveUp, onMoveDown }) {
  const isDone = !!item.doneAt;
  return (
    <div className="group flex items-start sm:items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors">
      {position != null && (
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
      )}
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

function Row({ title, note, value, onEdit, onDelete, accent, muted, recurrent, paidAt, dueDate, onTogglePaid, installmentTotal, installmentNumber, position, onMoveUp, onMoveDown, paidWithVoucher, paidWithCltPj }) {
  const isPaid = !!paidAt;
  return (
    <div className="group flex items-start sm:items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors">
      {position != null && (
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
      )}
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

function ShoppingListTab({ items, onAdd, onEdit, onDelete, onToggleDone, onClearDone }) {
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

function ShoppingItemRow({ item, onEdit, onDelete, onToggleDone }) {
  const isDone = !!item.doneAt;
  return (
    <div className="group flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3 px-4 py-3 hover:bg-slate-50 transition-colors">
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

function EntryModal({ mode, item, onClose, onSave, extraCategories = [] }) {
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
  const [paidWithVoucher, setPaidWithVoucher] = useState(item?.paidWithVoucher || false);
  const [paidWithCltPj, setPaidWithCltPj] = useState(item?.paidWithCltPj || false);
  const [voucherIncome, setVoucherIncome] = useState(item?.voucherIncome || false);
  const [cltPjIncome, setCltPjIncome] = useState(item?.cltPjIncome || false);
  const [paymentMethod, setPaymentMethod] = useState(item?.paymentMethod || "");
  const [paymentMethodMode, setPaymentMethodMode] = useState(() =>
    !item?.paymentMethod || PAYMENT_METHODS.includes(item.paymentMethod) ? "select" : "custom"
  );
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const canSave =
    desc.trim() !== "" &&
    value !== "" &&
    !isNaN(parseFloat(value)) &&
    parseFloat(value) >= 0 &&
    (!hasCategory || category.trim() !== "") &&
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
                {PAYMENT_METHODS.map((p) => (
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
                    setPaymentMethod(PAYMENT_METHODS.includes(paymentMethod) ? paymentMethod : "");
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
        “{state.payload.description || state.payload.source || state.payload.title}” será removido. Não dá pra desfazer.
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
