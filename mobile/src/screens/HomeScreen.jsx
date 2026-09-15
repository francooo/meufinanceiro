import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  AppState,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { Touchable } from "../ui/Touchable";
import { LinearGradient } from "expo-linear-gradient";
import { AlertTriangle, ArrowDownRight, ArrowUpRight, LogOut, PiggyBank } from "lucide-react-native";
import { fmt, formatDateBR, monthKey, monthLabel } from "../core/format";
import { nextExpenses, nextIncomes } from "../core/upcoming";
import { totalOf } from "../core/group";
import { CATS, PAYMENT_METHODS, SERASA_CATS } from "../core/catalog";
import { buildCardsWithUsage, canAddCard, spentByPaymentMethod, unregisteredMethodSpend } from "../core/cards";
import { applyOrder, reorderWithin } from "../core/reorder";
import { pruneMonthKeys, selectionStats, toggleKey } from "../core/selection";
import { SelectionBar, SelectionFab } from "../ui/SelectionBar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { store } from "../api/store";
import OverviewTab from "./OverviewTab";
import GastosTab from "./GastosTab";
import GanhosTab from "./GanhosTab";
import SerasaTab from "./SerasaTab";
import CartoesTab from "./CartoesTab";
import CardModal from "../modals/CardModal";
import ChecklistTab from "./ChecklistTab";
import ChecklistModal from "../modals/ChecklistModal";
import EntryModal from "../modals/EntryModal";
import ConfirmModal from "../modals/ConfirmModal";
import { useDebouncedSave } from "../hooks/useDebouncedSave";
import { useSaveStatus } from "../hooks/useSaveStatus";
import { uid } from "../core/uid";
import { todayISO } from "../core/format";

const NUM = { fontVariant: ["tabular-nums"] };

function HeroStat({ icon, label, value }) {
  return (
    <View className="flex-1 min-w-0">
      <View className="flex-row items-center gap-1">
        {icon}
        <Text className="text-[11px] uppercase" style={{ color: "rgba(209,250,229,0.7)" }}>
          {label}
        </Text>
      </View>
      <Text className="text-sm font-semibold text-white mt-0.5" numberOfLines={1} style={NUM}>
        {value}
      </Text>
    </View>
  );
}

/* Classes completas em literais, nunca montadas por interpolacao: o Tailwind
   varre o codigo-fonte, entao "bg-" + cor nao geraria estilo nenhum. */
const TONES = {
  income: { box: "bg-emerald-50 border-emerald-200", text: "text-emerald-800", icon: "#047857" },
  due: { box: "bg-amber-50 border-amber-200", text: "text-amber-800", icon: "#b45309" },
  overdue: { box: "bg-rose-50 border-rose-200", text: "text-rose-700", icon: "#be123c" },
};

function Notice({ tone, icon, headline, date, items, label }) {
  const t = TONES[tone];
  return (
    <View className={"rounded-2xl border px-4 py-3 mb-3 " + t.box}>
      <View className="flex-row items-center gap-2">
        {icon}
        <Text className={"text-sm flex-1 " + t.text}>
          {headline} <Text className="font-bold">{formatDateBR(date)}</Text>
        </Text>
      </View>
      <View className="mt-1.5 pl-6 gap-0.5">
        {items.map((it) => (
          <Text key={it.id} className={"text-sm " + t.text} style={NUM} numberOfLines={2}>
            <Text className="font-semibold">{fmt(it.value)}</Text> de {label(it)}
          </Text>
        ))}
      </View>
    </View>
  );
}

export default function HomeScreen({ email, onSignOut }) {
  const [months, setMonths] = useState([]);
  const [month, setMonth] = useState(() => monthKey(new Date()));
  const [expenses, setExpenses] = useState([]);
  const [incomes, setIncomes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  /* Mesma abordagem da web: um useState de aba, sem router. */
  const [tab, setTab] = useState("overview");
  const [modal, setModal] = useState(null);        // {mode, item} | null
  const [confirming, setConfirming] = useState(null);
  const [savedMethods, setSavedMethods] = useState([]);
  const [serasa, setSerasa] = useState([]);
  const [cards, setCards] = useState([]);
  const [cardModal, setCardModal] = useState(null);   // {item, presetMethod} | null
  const [wishlist, setWishlist] = useState([]);
  const [shopping, setShopping] = useState({ mercado: [], farmacia: [] });
  const [listModal, setListModal] = useState(null);   // {kind, item} | null
  /* Selecao e estado de UI puro: nunca entra nos objetos de dado, senao cada
     toque de caixinha faria um PUT da colecao inteira. */
  const [selecting, setSelecting] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState(() => new Set());
  /* A barra de selecao cresce uma linha quando entra e sai se misturam, entao
     ela e MEDIDA em vez de estimada; o FAB tem tamanho fixo. Sem isto, os
     botoes da ultima linha ficam por baixo e nao dao para tocar. */
  const [barHeight, setBarHeight] = useState(0);
  const insets = useSafeAreaInsets();

  /* O mes corrente vive tambem num ref porque o listener de AppState e o
     carregamento assincrono precisam saber qual mes esta na tela sem virarem
     dependencia do efeito — e para descartar resposta de um mes ja trocado. */
  const { status: saveStatus, track } = useSaveStatus();

  const monthRef = useRef(month);
  monthRef.current = month;

  const loadMonth = useCallback(async (key) => {
    const data = await store.load(key);
    if (data && monthRef.current === key) {
      setExpenses(data.expenses);
      setIncomes(Array.isArray(data.incomes) ? data.incomes : []);
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const list = await store.loadMonths();
        const initial = list.length > 0 ? list[list.length - 1] : monthKey(new Date());
        setMonths(list.length > 0 ? list : [initial]);
        setMonth(initial);
        monthRef.current = initial;
        await loadMonth(initial);
        setSavedMethods(await store.loadPaymentMethods().catch(() => []));
        setSerasa(await store.loadSerasa().catch(() => []));
        setCards(await store.loadCards().catch(() => []));
        setWishlist(await store.loadWishlist().catch(() => []));
        const [mer, far] = await Promise.all([
          store.loadShoppingList("mercado").catch(() => []),
          store.loadShoppingList("farmacia").catch(() => []),
        ]);
        setShopping({ mercado: mer, farmacia: far });
      } catch (err) {
        /* 401 ja foi tratado globalmente pelo client (volta ao pareamento) */
        if (err.message !== "unauthorized") setError("Nao foi possivel carregar seus dados.");
      } finally {
        setLoading(false);
      }
    })();
  }, [loadMonth]);

  /* Recarrega ao voltar do segundo plano. Toda escrita neste backend substitui a
     colecao inteira, entao a web pode ter sobrescrito o mes enquanto o app
     estava fechado — partir de dado fresco estreita bastante essa janela. */
  useEffect(() => {
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active") loadMonth(monthRef.current).catch(() => {});
    });
    return () => sub.remove();
  }, [loadMonth]);

  /* Trocar de mes invalida so as chaves do mes; as colecoes globais seguem. */
  useEffect(() => {
    setSelectedKeys(pruneMonthKeys);
  }, [month]);

  const switchMonth = async (key) => {
    if (key === month) return;
    /* Grava o pendente ANTES de trocar: o snapshot do debounce carrega o mes
       antigo, mas esperar o timer perderia a ultima edicao. */
    flushSave();
    setMonth(key);
    monthRef.current = key;
    setLoading(true);
    try {
      await loadMonth(key);
    } finally {
      setLoading(false);
    }
  };

  /* Recarrega tudo, nao so o mes: desejos, listas, serasa e cartoes sao
     colecoes globais e ficariam paradas num puxao de atualizar. */
  const refresh = async () => {
    setRefreshing(true);
    try {
      const [w, mer, far, ser, crd] = await Promise.all([
        store.loadWishlist(),
        store.loadShoppingList("mercado"),
        store.loadShoppingList("farmacia"),
        store.loadSerasa(),
        store.loadCards(),
      ]);
      await loadMonth(monthRef.current);
      setWishlist(w);
      setShopping({ mercado: mer, farmacia: far });
      setSerasa(ser);
      setCards(crd);
    } catch {
      /* silencioso: o indicador de gravacao ja cobre o que importa, e o
         puxao volta ao normal sozinho */
    } finally {
      setRefreshing(false);
    }
  };

  /* Memoizado porque entra no array de dependencias do debounce: um objeto novo
     a cada render reagendaria a gravacao para sempre. */
  const payload = useMemo(() => ({ month, expenses, incomes }), [month, expenses, incomes]);
  const flushSave = useDebouncedSave(
    payload,
    (snap) => track(store.save(snap.month, { expenses: snap.expenses, incomes: snap.incomes })),
    { enabled: !loading && !error }
  );

  /* Serasa e colecao GLOBAL (sem mes) e tem endpoint proprio, entao seu
     autosave e separado do payload mensal. */
  const flushSerasa = useDebouncedSave(
    serasa,
    (snap) => track(store.saveSerasa(snap)),
    { enabled: !loading && !error }
  );

  const setterFor = (mode) =>
    ({
      expense: setExpenses,
      income: setIncomes,
      serasa: setSerasa,
      card: setCards,
      wish: setWishlist,
    })[mode] || ((fn) => setShopping((prev) => ({ ...prev, [mode]: fn(prev[mode]) })));

  /* Cartoes tambem e colecao GLOBAL, com endpoint proprio. */
  const flushCards = useDebouncedSave(
    cards,
    (snap) => track(store.saveCards(snap)),
    { enabled: !loading && !error }
  );

  const flushWishlist = useDebouncedSave(
    wishlist,
    (snap) => track(store.saveWishlist(snap)),
    { enabled: !loading && !error }
  );
  /* Uma lista muda, as duas sao gravadas — igual a web, que tem um efeito so
     para shoppingLists. Sao dois PUTs, mas o debounce ja os agrupa. */
  const flushShopping = useDebouncedSave(
    shopping,
    (snap) => {
      track(store.saveShoppingList("mercado", snap.mercado));
      track(store.saveShoppingList("farmacia", snap.farmacia));
    },
    { enabled: !loading && !error }
  );

  /* kind: "wish" | "mercado" | "farmacia" */
  const listSetter = (kind) =>
    kind === "wish"
      ? setWishlist
      : (fn) => setShopping((prev) => ({ ...prev, [kind]: fn(prev[kind]) }));

  const listItems = (kind) => (kind === "wish" ? wishlist : shopping[kind]);

  const saveListItem = (data, id) => {
    listSetter(listModal.kind)((prev) =>
      id ? prev.map((i) => (i.id === id ? { ...i, ...data } : i)) : [...prev, { id: uid(), ...data, doneAt: null }]
    );
    setListModal(null);
  };

  const toggleListDone = (kind, id) =>
    listSetter(kind)((prev) =>
      prev.map((i) => (i.id === id ? { ...i, doneAt: i.doneAt ? null : todayISO() } : i))
    );

  const clearListDone = (kind) => listSetter(kind)((prev) => prev.filter((i) => !i.doneAt));

  const saveCard = (data, id) => {
    setCards((prev) =>
      id ? prev.map((c) => (c.id === id ? { ...c, ...data } : c)) : [...prev, { id: uid(), ...data }]
    );
    setCardModal(null);
  };

  const saveEntry = (data, id) => {
    const set = setterFor(modal.mode);
    set((prev) =>
      id
        ? prev.map((e) => (e.id === id ? { ...e, ...data } : e))
        : [...prev, { id: uid(), createdAt: new Date().toISOString(), ...data }]
    );
    setModal(null);
  };

  const removeEntry = () => {
    setterFor(confirming.mode)((prev) => prev.filter((e) => e.id !== confirming.item.id));
    setConfirming(null);
  };

  /* Recebe a lista JA agrupada e ordenada pela aba, nao a colecao inteira: e o
     grupo visivel que define a nova ordem. */
  const moveExpense = (groupItems, id, direction) => {
    const orderById = reorderWithin(groupItems, id, direction);
    if (!orderById) return;  // ja estava na ponta
    setExpenses((prev) => applyOrder(prev, orderById));
  };

  /* A ordem aqui importa e o web nao precisa dela: la nao ha debounce, entao a
     gravacao do mes ja aconteceu. Aqui, um PUT pendente carrega o array do mes
     ANTIGO com o gasto ainda dentro — se disparasse depois do move, o servidor
     apagaria o mes e reinseriria o gasto, desfazendo tudo. Por isso: grava o
     pendente, move, e so entao tira do estado local. */
  const moveToMonth = async (item, targetMonth) => {
    flushSave();
    await store.moveExpenseToMonth(item.id, targetMonth);
    setExpenses((prev) => prev.filter((e) => e.id !== item.id));
    setModal(null);
  };

  const togglePaid = (mode, id) =>
    setterFor(mode)((prev) =>
      prev.map((e) => (e.id === id ? { ...e, paidAt: e.paidAt ? null : todayISO() } : e))
    );

  const extraCategories = useMemo(() => {
    const known = new Set(CATS.map((c) => c.name));
    return [...new Set(expenses.map((e) => e.category).filter((c) => c && !known.has(c)))].sort();
  }, [expenses]);

  const extraSerasaCategories = useMemo(() => {
    const known = new Set(SERASA_CATS.map((c) => c.name));
    return [...new Set(serasa.map((s) => s.category).filter((c) => c && !known.has(c)))].sort();
  }, [serasa]);

  const extraPaymentMethods = useMemo(() => {
    const known = new Set(PAYMENT_METHODS);
    const all = [...savedMethods, ...expenses.map((e) => e.paymentMethod)];
    return [...new Set(all.filter((p) => p && !known.has(p)))].sort();
  }, [savedMethods, expenses]);

  const stats = useMemo(
    () =>
      selectionStats(selectedKeys, [
        ["expense", expenses],
        ["income", incomes],
        ["wish", wishlist],
        ["mercado", shopping.mercado],
        ["farmacia", shopping.farmacia],
        ["serasa", serasa],
      ]),
    [selectedKeys, expenses, incomes, wishlist, shopping, serasa]
  );

  const fabVisible = !selecting && tab !== "overview" && tab !== "cartoes";
  const bottomGap = selecting ? barHeight : fabVisible ? 64 + 24 + insets.bottom : 0;

  const selProps = (kind) => ({
    selecting,
    isSelected: (id) => selectedKeys.has(`${kind}:${id}`),
    onToggleSelect: (id) => setSelectedKeys((prev) => toggleKey(prev, kind, id)),
  });

  const spent = useMemo(() => spentByPaymentMethod(expenses), [expenses]);
  const cardsWithUsage = useMemo(() => buildCardsWithUsage(cards, spent, month), [cards, spent, month]);
  const unregistered = useMemo(() => unregisteredMethodSpend(cards, spent), [cards, spent]);

  const vaRecebido = useMemo(() => totalOf(incomes.filter((i) => i.voucherIncome)), [incomes]);
  const vaUsado = useMemo(() => totalOf(expenses.filter((e) => e.paidWithVoucher)), [expenses]);
  const cltRecebido = useMemo(() => totalOf(incomes.filter((i) => i.cltPjIncome)), [incomes]);
  const cltGasto = useMemo(() => totalOf(expenses.filter((e) => e.paidWithCltPj)), [expenses]);
  const vaRestante = vaRecebido - vaUsado;
  const cltSobra = cltRecebido - cltGasto;

  /* Olham so o mes em tela — `incomes`/`expenses` sao do mes selecionado, como
     na web. No fim do mes o aviso pode ficar vazio, e tudo bem: trocar de mes
     ja mostra o proximo. */
  const proximoGanho = useMemo(() => nextIncomes(incomes), [incomes]);
  const proximoGasto = useMemo(() => nextExpenses(expenses), [expenses]);

  return (
    <View className="flex-1">
      <ScrollView
        className="flex-1"
      /* Sem isto, com o teclado da busca aberto o PRIMEIRO toque em qualquer
         botao e consumido dispensando o teclado — o classico "tem que tocar
         duas vezes". Vale para os tres ScrollViews: o RN resolve a dispensa no
         scroll responder mais proximo. */
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      contentContainerStyle={{ padding: 16, paddingBottom: 16 + bottomGap }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor="#16382c" />
      }
    >
      <View className="flex-row items-center justify-between mb-4">
        <View className="flex-1 min-w-0">
          <Text className="text-lg font-bold text-slate-800">Meu financeiro</Text>
          {saveStatus === "idle" ? (
            <Text className="text-xs text-slate-500" numberOfLines={1}>
              {email}
            </Text>
          ) : (
            <Text
              className={
                "text-xs " +
                (saveStatus === "error"
                  ? "text-rose-600 font-medium"
                  : saveStatus === "saved"
                  ? "text-emerald-600"
                  : "text-slate-400")
              }
              numberOfLines={1}
            >
              {saveStatus === "saving"
                ? "Salvando…"
                : saveStatus === "saved"
                ? "Salvo"
                : "Falha ao salvar — sem conexão?"}
            </Text>
          )}
        </View>
        <Touchable
          hitSlop={{ top: 8, bottom: 8, right: 8 }}
          onPress={() => {
            flushSave();
            flushSerasa();
            flushCards();
            flushWishlist();
            flushShopping();
            onSignOut();
          }}
          className="h-9 w-9 rounded-xl bg-white border border-slate-200 items-center justify-center"
        >
          <LogOut size={16} color="#64748b" />
        </Touchable>
      </View>

      {proximoGanho ? (
        <Notice
          tone="income"
          icon={<ArrowUpRight size={16} color={TONES.income.icon} />}
          headline="Você vai receber no dia"
          date={proximoGanho.date}
          items={proximoGanho.items}
          label={(i) => i.source}
        />
      ) : null}

      {proximoGasto ? (
        <Notice
          tone={proximoGasto.overdue ? "overdue" : "due"}
          icon={
            proximoGasto.overdue ? (
              <AlertTriangle size={16} color={TONES.overdue.icon} />
            ) : (
              <ArrowDownRight size={16} color={TONES.due.icon} />
            )
          }
          headline={proximoGasto.overdue ? "Gasto vencido em" : "Você precisa pagar no dia"}
          date={proximoGasto.date}
          items={proximoGasto.items}
          label={(e) => e.description}
        />
      ) : null}

      <LinearGradient
        colors={["#0f2e25", "#16382c", "#1e4a38"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ borderRadius: 24, padding: 20, marginBottom: 16 }}
      >
        <Text className="text-xs uppercase mb-3" style={{ color: "rgba(209,250,229,0.8)" }}>
          Vale Alimentacao
        </Text>
        <View className="flex-row items-center justify-between gap-3">
          <HeroStat
            icon={<ArrowUpRight size={15} color="#6ee7b7" />}
            label="Recebido"
            value={fmt(vaRecebido)}
          />
          <View className="h-8 w-px" style={{ backgroundColor: "rgba(255,255,255,0.15)" }} />
          <HeroStat
            icon={<ArrowDownRight size={15} color="#fda4af" />}
            label="Usado"
            value={fmt(vaUsado)}
          />
          <View className="h-8 w-px" style={{ backgroundColor: "rgba(255,255,255,0.15)" }} />
          <HeroStat
            icon={<PiggyBank size={15} color="#6ee7b7" />}
            label="Restante"
            value={fmt(vaRestante)}
          />
        </View>

        <View className="h-px my-5" style={{ backgroundColor: "rgba(255,255,255,0.1)" }} />

        <Text className="text-xs uppercase mb-3" style={{ color: "rgba(209,250,229,0.8)" }}>
          CLT/PJ
        </Text>
        <View className="flex-row items-center justify-between gap-3">
          <HeroStat
            icon={<ArrowUpRight size={15} color="#6ee7b7" />}
            label="Recebido"
            value={fmt(cltRecebido)}
          />
          <View className="h-8 w-px" style={{ backgroundColor: "rgba(255,255,255,0.15)" }} />
          <HeroStat
            icon={<ArrowDownRight size={15} color="#fda4af" />}
            label="Gasto"
            value={fmt(cltGasto)}
          />
          <View className="h-8 w-px" style={{ backgroundColor: "rgba(255,255,255,0.15)" }} />
          <HeroStat
            icon={<PiggyBank size={15} color="#6ee7b7" />}
            label="Sobra"
            value={fmt(cltSobra)}
          />
        </View>
      </LinearGradient>

      {months.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          className="mb-4"
        >
          <View className="flex-row gap-2">
            {months.map((m) => {
              const active = m === month;
              return (
                <Touchable
                  key={m}
                  onDark={active}
                  onPress={() => switchMonth(m)}
                  hitSlop={{ top: 6, bottom: 6 }}
                  className={
                    "px-4 py-2 rounded-full border " +
                    (active ? "border-transparent" : "bg-white border-slate-200")
                  }
                  style={active ? { backgroundColor: "#16382c" } : undefined}
                >
                  <Text
                    className={"text-sm font-medium " + (active ? "text-white" : "text-slate-500")}
                  >
                    {monthLabel(m)}
                  </Text>
                </Touchable>
              );
            })}
          </View>
        </ScrollView>
      )}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        className="mb-4"
      >
        <View className="flex-row gap-1 bg-white rounded-full p-1 border border-slate-200">
          {[
            ["overview", "Visão geral"],
            ["gastos", "Gastos"],
            ["ganhos", "Ganhos"],
            ["serasa", "Serasa"],
            ["cartoes", "Cartões"],
            ["desejos", "Desejos"],
            ["mercado", "Mercado"],
            ["farmacia", "Farmácia"],
          ].map(([id, label]) => {
            const active = tab === id;
            return (
              <Touchable
                key={id}
                onDark={active}
                onPress={() => setTab(id)}
                hitSlop={{ top: 6, bottom: 6 }}
                className="px-4 py-2 rounded-full"
                style={active ? { backgroundColor: "#16382c" } : undefined}
              >
                <Text className={"text-sm font-medium " + (active ? "text-white" : "text-slate-500")}>
                  {label}
                </Text>
              </Touchable>
            );
          })}
        </View>
      </ScrollView>

      {error ? <Text className="text-sm text-rose-600 text-center py-8">{error}</Text> : null}

      {loading ? (
        <View className="items-center py-10 gap-3">
          <ActivityIndicator color="#16382c" />
          <Text className="text-sm text-slate-500">Carregando...</Text>
        </View>
      ) : tab === "overview" ? (
        <OverviewTab expenses={expenses} incomes={incomes} />
      ) : tab === "gastos" ? (
        <GastosTab
          {...selProps("expense")}
          expenses={expenses}
          total={totalOf(expenses)}
          onAdd={() => setModal({ mode: "expense", item: null })}
          onEdit={(e) => setModal({ mode: "expense", item: e })}
          onDelete={(e) => setConfirming({ mode: "expense", item: e })}
          onTogglePaid={(e) => togglePaid("expense", e.id)}
          onMove={moveExpense}
          extraPaymentMethods={extraPaymentMethods}
        />
      ) : tab === "ganhos" ? (
        <GanhosTab
          {...selProps("income")}
          incomes={incomes}
          onAdd={() => setModal({ mode: "income", item: null })}
          onEdit={(i) => setModal({ mode: "income", item: i })}
          onDelete={(i) => setConfirming({ mode: "income", item: i })}
        />
      ) : tab === "serasa" ? (
        <SerasaTab
          {...selProps("serasa")}
          serasa={serasa}
          onAdd={() => setModal({ mode: "serasa", item: null })}
          onEdit={(x) => setModal({ mode: "serasa", item: x })}
          onDelete={(x) => setConfirming({ mode: "serasa", item: x })}
          onTogglePaid={(x) => togglePaid("serasa", x.id)}
        />
      ) : tab === "cartoes" ? (
        <CartoesTab
          cards={cardsWithUsage}
          unregistered={unregistered}
          month={month}
          canAdd={canAddCard(cards, extraPaymentMethods)}
          /* onAdd() sem argumento: a forma nua passaria o evento como presetMethod */
          onAdd={(preset) => setCardModal({ item: null, presetMethod: typeof preset === "string" ? preset : undefined })}
          onEdit={(c) => setCardModal({ item: c })}
          onDelete={(c) => setConfirming({ mode: "card", item: c })}
        />
      ) : (
        <ChecklistTab
          {...selProps(tab === "desejos" ? "wish" : tab)}
          items={listItems(tab === "desejos" ? "wish" : tab)}
          totalLabel={tab === "desejos" ? "Total desejado" : "Total estimado"}
          addLabel={tab === "desejos" ? "Novo desejo" : "Novo item"}
          emptyText={tab === "desejos" ? "Nenhum desejo cadastrado." : "Nenhum item cadastrado."}
          doneLabel={tab === "desejos" ? "Realizado" : "Comprado"}
          onAdd={() => setListModal({ kind: tab === "desejos" ? "wish" : tab, item: null })}
          onEdit={(i) => setListModal({ kind: tab === "desejos" ? "wish" : tab, item: i })}
          onDelete={(i) => setConfirming({ mode: tab === "desejos" ? "wish" : tab, item: i })}
          onToggleDone={(i) => toggleListDone(tab === "desejos" ? "wish" : tab, i.id)}
          /* Só Mercado tem "Limpar", como na web — Farmácia não recebe o handler. */
          onClearDone={tab === "mercado" ? () => clearListDone("mercado") : undefined}
        />
      )}

      {listModal ? (
        <ChecklistModal
          visible
          key={listModal.kind + (listModal.item?.id || "novo")}
          item={listModal.item}
          titleLabel={listModal.kind === "wish" ? "O que você deseja?" : "O que você precisa comprar?"}
          placeholder={listModal.kind === "wish" ? "Ex.: Notebook novo" : "Ex.: Arroz 5kg"}
          novo={listModal.kind === "wish" ? "Novo desejo" : "Novo item"}
          editar={listModal.kind === "wish" ? "Editar desejo" : "Editar item"}
          onClose={() => setListModal(null)}
          onSave={saveListItem}
        />
      ) : null}

      {cardModal ? (
        <CardModal
          visible
          key={cardModal.item?.id || cardModal.presetMethod || "novo"}
          item={cardModal.item}
          presetMethod={cardModal.presetMethod}
          cards={cards}
          extraPaymentMethods={extraPaymentMethods}
          onClose={() => setCardModal(null)}
          onSave={saveCard}
        />
      ) : null}

      {modal ? (
        <EntryModal
          visible
          /* key remonta o modal por item: sem isso os useState iniciais
             ficariam presos no primeiro gasto aberto. */
          key={(modal.mode || "") + (modal.item?.id || "novo")}
          mode={modal.mode}
          item={modal.item}
          extraCategories={modal.mode === "serasa" ? extraSerasaCategories : extraCategories}
          months={months}
          currentMonth={month}
          onMoveMonth={moveToMonth}
          extraPaymentMethods={extraPaymentMethods}
          onClose={() => setModal(null)}
          onSave={saveEntry}
        />
      ) : null}

      <ConfirmModal
        visible={!!confirming}
        item={confirming?.item}
        onCancel={() => setConfirming(null)}
        onConfirm={removeEntry}
      />
      </ScrollView>

      {/* Cartoes fica de fora: saldo de cartao nao e item de fluxo de caixa, e
          SELECTION_SOURCES nao o registra — uma chave "card:" quebraria a soma. */}
      {fabVisible ? <SelectionFab onPress={() => setSelecting(true)} /> : null}

      {selecting ? (
        <SelectionBar
          onLayout={(e) => setBarHeight(e.nativeEvent.layout.height)}
          stats={stats}
          onClear={() => setSelectedKeys(new Set())}
          onClose={() => {
            setSelecting(false);
            setSelectedKeys(new Set());
          }}
        />
      ) : null}
    </View>
  );
}
