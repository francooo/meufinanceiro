import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  Wallet, Plus, Pencil, Trash2, X, RotateCcw, Check,
  ArrowUpRight, ArrowDownRight, PiggyBank, Tag,
  Home, GraduationCap, HeartPulse, Lightbulb, Smartphone,
  Landmark, Car, CreditCard, Repeat, Gamepad2,
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

const uid = () =>
  (typeof crypto !== "undefined" && crypto.randomUUID)
    ? crypto.randomUUID()
    : "id-" + Math.random().toString(36).slice(2) + Date.now();

const SEED = {
  expenses: [
    ["Apartamento", "Moradia", 1100, ""],
    ["Condomínio Mont Blanc", "Moradia", 700, ""],
    ["Condomínio Ipiranga", "Moradia", 290, ""],
    ["Escola Valentina", "Educação", 2080, ""],
    ["Ballet Valentina", "Educação", 210, ""],
    ["Farmácia", "Saúde", 74, "Parcela 2/3 · Total R$ 220"],
    ["Remédios Panvel", "Saúde", 120, "Parcela 2/2 (última) · Cartão Nubank Fran"],
    ["Remédio Valentina", "Saúde", 150, ""],
    ["Academia Andrews", "Saúde", 200, ""],
    ["Luz", "Casa / Utilidades", 350, ""],
    ["Gás", "Casa / Utilidades", 120, ""],
    ["Internet casa", "Casa / Utilidades", 110, ""],
    ["Meu Claro", "Telefonia", 64, ""],
    ["Meu imposto", "Impostos", 400, ""],
    ["Seguro carro", "Transporte", 330, ""],
    ["Cartão Zaffari", "Cartões / Financeiro", 1500, ""],
    ["Parcela meu Nubank", "Cartões / Financeiro", 580, ""],
    ["Empréstimo", "Cartões / Financeiro", 1590, ""],
    ["Assinatura Inter", "Cartões / Financeiro", 80, ""],
    ["Assinaturas da TV", "Assinaturas / Serviços", 115, "Mercado Livre, Globo Play"],
    ["Claude Code", "Assinaturas / Serviços", 110, ""],
    ["Hostinger", "Assinaturas / Serviços", 50, ""],
    ["Pokémon", "Lazer / Hobbies", 125, "Parcela 2/2 (última) · Cartão Nubank Fran"],
    ["Meu cartão Nubank", "Cartões / Financeiro", 0, "Sem valor informado"],
    ["Cartão Nubank Fran", "Cartões / Financeiro", 0, "Sem valor informado"],
    ["Cartão Sams Fran", "Cartões / Financeiro", 0, "Sem valor informado"],
  ].map(([description, category, value, note]) => ({ id: uid(), description, category, value, note })),
  incomes: [
    ["Fluid", 9000, "Freelance"],
    ["Atos", 4400, ""],
    ["NeoGrid", 4400, ""],
    ["NeoGrid", 700, ""],
    ["Atos", 550, ""],
    ["Garagem", 210, ""],
  ].map(([source, value, note]) => ({ id: uid(), source, value, note })),
};

/* ---------- helpers ---------- */
const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const fmt = (n) => brl.format(Number(n) || 0);
const KEY = "orcamento-v1";

const store = {
  async load() {
    try {
      if (!window.storage) return null;
      const r = await window.storage.get(KEY);
      return r && r.value ? JSON.parse(r.value) : null;
    } catch {
      return null;
    }
  },
  async save(data) {
    try {
      if (!window.storage) return;
      await window.storage.set(KEY, JSON.stringify(data));
    } catch {
      /* silencioso: segue em memória */
    }
  },
};

/* ---------- app ---------- */
export default function App() {
  const [expenses, setExpenses] = useState([]);
  const [incomes, setIncomes] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState("overview");
  const [modal, setModal] = useState(null); // {mode:'expense'|'income', item|null}
  const [confirmState, setConfirmState] = useState(null); // {kind, payload}
  const [saved, setSaved] = useState(false);
  const savedTimer = useRef(null);

  useEffect(() => {
    (async () => {
      const data = await store.load();
      if (data && Array.isArray(data.expenses)) {
        setExpenses(data.expenses);
        setIncomes(Array.isArray(data.incomes) ? data.incomes : []);
      } else {
        setExpenses(SEED.expenses);
        setIncomes(SEED.incomes);
        store.save(SEED);
      }
      setLoaded(true);
    })();
  }, []);

  useEffect(() => {
    if (!loaded) return;
    store.save({ expenses, incomes });
    setSaved(true);
    clearTimeout(savedTimer.current);
    savedTimer.current = setTimeout(() => setSaved(false), 1400);
  }, [expenses, incomes, loaded]);

  const totalGastos = useMemo(() => expenses.reduce((s, e) => s + (Number(e.value) || 0), 0), [expenses]);
  const totalGanhos = useMemo(() => incomes.reduce((s, i) => s + (Number(i.value) || 0), 0), [incomes]);
  const saldo = totalGanhos - totalGastos;

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
        items: [...items].sort((a, b) => (b.value || 0) - (a.value || 0)),
        subtotal: items.reduce((s, i) => s + (Number(i.value) || 0), 0),
      }))
      .sort((a, b) => b.subtotal - a.subtotal);
  }, [expenses]);

  const topGastos = useMemo(
    () => [...expenses].filter((e) => e.value > 0).sort((a, b) => b.value - a.value).slice(0, 5),
    [expenses]
  );

  const pctGasto = totalGanhos > 0 ? Math.min(100, (totalGastos / totalGanhos) * 100) : (totalGastos > 0 ? 100 : 0);
  const taxaSobra = totalGanhos > 0 ? Math.round((saldo / totalGanhos) * 100) : 0;

  const mesLabel = useMemo(() => {
    const s = new Date().toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
    return s.charAt(0).toUpperCase() + s.slice(1);
  }, []);

  /* CRUD */
  const saveEntry = (mode, data, id) => {
    if (mode === "expense") {
      setExpenses((prev) =>
        id ? prev.map((e) => (e.id === id ? { ...e, ...data } : e)) : [...prev, { id: uid(), ...data }]
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
    else setIncomes((p) => p.filter((i) => i.id !== id));
    setConfirmState(null);
  };
  const resetAll = () => {
    const fresh = {
      expenses: SEED.expenses.map((e) => ({ ...e, id: uid() })),
      incomes: SEED.incomes.map((i) => ({ ...i, id: uid() })),
    };
    setExpenses(fresh.expenses);
    setIncomes(fresh.incomes);
    setConfirmState(null);
  };

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
              <h1 className="text-lg font-bold text-slate-800 leading-tight">Meu Caixa</h1>
              <p className="text-xs text-slate-500 leading-tight">{mesLabel}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={"text-xs text-emerald-600 flex items-center gap-1 transition-opacity duration-300 " + (saved ? "opacity-100" : "opacity-0")}
            >
              <Check size={13} /> Salvo
            </span>
            <button
              onClick={() => setConfirmState({ kind: "reset" })}
              title="Restaurar dados iniciais"
              className="h-9 w-9 rounded-xl bg-white border border-slate-200 text-slate-500 flex items-center justify-center hover:text-slate-800 hover:border-slate-300 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-300"
            >
              <RotateCcw size={16} />
            </button>
          </div>
        </header>

        {/* hero saldo */}
        <section
          className="rounded-3xl p-6 text-white shadow-lg mb-5"
          style={{ background: "linear-gradient(135deg,#0f2e25 0%,#16382c 55%,#1e4a38 100%)" }}
        >
          <p className="text-xs uppercase tracking-wider text-emerald-200/80 mb-1">Saldo do mês</p>
          <div className={"text-4xl font-bold tabular-nums " + (saldo >= 0 ? "text-white" : "text-rose-300")}>
            {fmt(saldo)}
          </div>
          <p className="text-xs text-emerald-100/70 mt-1">
            {saldo >= 0
              ? `Você guarda ${taxaSobra}% do que ganha`
              : "Atenção: gastos acima da renda"}
          </p>

          {/* barra proporção */}
          <div className="mt-5 h-2.5 w-full rounded-full overflow-hidden" style={{ background: "rgba(16,159,110,0.28)" }}>
            <div className="h-full rounded-full" style={{ width: `${pctGasto}%`, background: "#f0665a" }} />
          </div>
          <div className="flex items-center justify-between mt-4 gap-3">
            <HeroStat icon={<ArrowUpRight size={15} />} label="Ganhos" value={fmt(totalGanhos)} tone="up" />
            <div className="h-8 w-px bg-white/15" />
            <HeroStat icon={<ArrowDownRight size={15} />} label="Gastos" value={fmt(totalGastos)} tone="down" />
            <div className="h-8 w-px bg-white/15" />
            <HeroStat icon={<PiggyBank size={15} />} label="Sobra" value={`${taxaSobra}%`} tone="up" />
          </div>
        </section>

        {/* tabs */}
        <div className="flex bg-white rounded-full p-1 border border-slate-200 mb-5 shadow-sm">
          {[
            ["overview", "Visão geral"],
            ["gastos", "Gastos"],
            ["ganhos", "Ganhos"],
          ].map(([id, label]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={
                "flex-1 text-sm font-medium py-2 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-slate-300 " +
                (tab === id ? "text-white" : "text-slate-500 hover:text-slate-800")
              }
              style={tab === id ? { background: "#16382c" } : undefined}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === "overview" && (
          <Overview byCat={byCat} totalGastos={totalGastos} topGastos={topGastos} />
        )}

        {tab === "gastos" && (
          <Gastos
            grouped={gastosGrouped}
            total={totalGastos}
            onAdd={() => setModal({ mode: "expense", item: null })}
            onEdit={(item) => setModal({ mode: "expense", item })}
            onDelete={(item) => setConfirmState({ kind: "delete", mode: "expense", payload: item })}
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
      </div>

      {modal && (
        <EntryModal
          mode={modal.mode}
          item={modal.item}
          onClose={() => setModal(null)}
          onSave={saveEntry}
        />
      )}

      {confirmState && (
        <ConfirmModal
          state={confirmState}
          onCancel={() => setConfirmState(null)}
          onConfirm={() => {
            if (confirmState.kind === "reset") resetAll();
            else removeEntry(confirmState.mode, confirmState.payload.id);
          }}
        />
      )}
    </div>
  );
}

/* ---------- subcomponentes ---------- */
function HeroStat({ icon, label, value, tone }) {
  return (
    <div className="flex-1 min-w-0">
      <div className={"flex items-center gap-1 text-[11px] " + (tone === "up" ? "text-emerald-300" : "text-rose-300")}>
        {icon}
        <span className="text-emerald-100/70 uppercase tracking-wide">{label}</span>
      </div>
      <div className="text-sm font-semibold text-white truncate mt-0.5 tabular-nums">{value}</div>
    </div>
  );
}

function Card({ children, className = "" }) {
  return (
    <div className={"bg-white rounded-2xl border border-slate-200 shadow-sm " + className}>{children}</div>
  );
}

function Overview({ byCat, totalGastos, topGastos }) {
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
        <h2 className="text-sm font-semibold text-slate-800 mb-3">Maiores gastos</h2>
        {topGastos.length === 0 ? (
          <Empty text="Nada por aqui." />
        ) : (
          <div className="divide-y divide-slate-100">
            {topGastos.map((e, i) => {
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

function Gastos({ grouped, total, onAdd, onEdit, onDelete }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-slate-500">Total de gastos</p>
          <p className="text-xl font-bold text-slate-800 tabular-nums">{fmt(total)}</p>
        </div>
        <button
          onClick={onAdd}
          className="flex items-center gap-1.5 text-white text-sm font-medium px-4 py-2.5 rounded-xl shadow-sm hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-400"
          style={{ background: "#16382c" }}
        >
          <Plus size={16} /> Novo gasto
        </button>
      </div>

      {grouped.length === 0 && <Empty text="Nenhum gasto cadastrado." />}

      {grouped.map((g) => {
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
              {g.items.map((e) => (
                <Row
                  key={e.id}
                  title={e.description}
                  note={e.note}
                  value={e.value}
                  muted={!e.value}
                  onEdit={() => onEdit(e)}
                  onDelete={() => onDelete(e)}
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
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-slate-500">Total de ganhos</p>
          <p className="text-xl font-bold text-emerald-600 tabular-nums">{fmt(total)}</p>
        </div>
        <button
          onClick={onAdd}
          className="flex items-center gap-1.5 bg-emerald-600 text-white text-sm font-medium px-4 py-2.5 rounded-xl shadow-sm hover:bg-emerald-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-400"
        >
          <Plus size={16} /> Novo ganho
        </button>
      </div>

      {incomes.length === 0 ? (
        <Empty text="Nenhuma fonte de renda cadastrada." />
      ) : (
        <Card className="divide-y divide-slate-100">
          {incomes.map((i) => (
            <Row
              key={i.id}
              title={i.source}
              note={i.note}
              value={i.value}
              accent="#059669"
              onEdit={() => onEdit(i)}
              onDelete={() => onDelete(i)}
            />
          ))}
        </Card>
      )}
    </div>
  );
}

function Row({ title, note, value, onEdit, onDelete, accent, muted }) {
  return (
    <div className="group flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors">
      <div className="flex-1 min-w-0">
        <p className={"text-sm truncate " + (muted ? "text-slate-400" : "text-slate-800")}>{title}</p>
        {note ? <p className="text-xs text-slate-400 truncate mt-0.5">{note}</p> : null}
      </div>
      <span
        className="text-sm font-semibold tabular-nums shrink-0"
        style={{ color: muted ? "#94a3b8" : accent || "#1e293b" }}
      >
        {fmt(value)}
      </span>
      <div className="flex items-center gap-1 shrink-0">
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
  );
}

function Empty({ text }) {
  return <p className="text-sm text-slate-400 py-6 text-center">{text}</p>;
}

/* ---------- modais ---------- */
function EntryModal({ mode, item, onClose, onSave }) {
  const isExpense = mode === "expense";
  const [desc, setDesc] = useState(item ? (isExpense ? item.description : item.source) : "");
  const [category, setCategory] = useState(item?.category || CATS[0].name);
  const [value, setValue] = useState(item ? String(item.value) : "");
  const [note, setNote] = useState(item?.note || "");
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const canSave = desc.trim() !== "" && value !== "" && !isNaN(parseFloat(value)) && parseFloat(value) >= 0;

  const submit = () => {
    if (!canSave) return;
    const data = isExpense
      ? { description: desc.trim(), category, value: parseFloat(value), note: note.trim() }
      : { source: desc.trim(), value: parseFloat(value), note: note.trim() };
    onSave(mode, data, item?.id);
  };

  const title = `${item ? "Editar" : "Novo"} ${isExpense ? "gasto" : "ganho"}`;

  return (
    <Overlay onClose={onClose}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-bold text-slate-800">{title}</h3>
        <button onClick={onClose} className="h-8 w-8 rounded-lg text-slate-400 hover:bg-slate-100 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-slate-300">
          <X size={18} />
        </button>
      </div>

      <div className="space-y-3.5">
        <Field label={isExpense ? "Descrição" : "Fonte de renda"}>
          <input
            ref={inputRef}
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            placeholder={isExpense ? "Ex.: Luz" : "Ex.: NeoGrid"}
            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-400"
          />
        </Field>

        {isExpense && (
          <Field label="Categoria">
            <input
              list="cats-list"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-400"
            />
            <datalist id="cats-list">
              {CATS.map((c) => (
                <option key={c.name} value={c.name} />
              ))}
            </datalist>
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

        <Field label="Observação (opcional)">
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ex.: parcela 2/3"
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
          style={{ background: isExpense ? "#16382c" : "#059669" }}
        >
          Salvar
        </button>
      </div>
    </Overlay>
  );
}

function ConfirmModal({ state, onCancel, onConfirm }) {
  const isReset = state.kind === "reset";
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onCancel();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);
  return (
    <Overlay onClose={onCancel}>
      <h3 className="text-base font-bold text-slate-800 mb-1">
        {isReset ? "Restaurar dados iniciais?" : "Excluir lançamento?"}
      </h3>
      <p className="text-sm text-slate-500 mb-5">
        {isReset
          ? "Todos os lançamentos voltam para os valores originais da planilha. Não dá pra desfazer."
          : `“${state.payload.description || state.payload.source}” será removido. Não dá pra desfazer.`}
      </p>
      <div className="flex gap-2">
        <button
          onClick={onCancel}
          className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-300"
        >
          Cancelar
        </button>
        <button
          onClick={onConfirm}
          className="flex-1 py-2.5 rounded-xl bg-rose-600 text-white text-sm font-semibold shadow-sm hover:bg-rose-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-rose-400"
        >
          {isReset ? "Restaurar" : "Excluir"}
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
        className="bg-white rounded-2xl w-full max-w-sm p-5 shadow-xl"
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
