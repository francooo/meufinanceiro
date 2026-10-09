import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  AppState,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { Touchable } from "../ui/Touchable";
import { LinearGradient } from "expo-linear-gradient";
import { AlertTriangle, ArrowDownRight, ArrowUpRight, LogOut, PiggyBank, Plus, WifiOff } from "lucide-react-native";
import { addMonths, fmt, formatDateBR, monthKey, monthLabel } from "../core/format";
import { nextExpenses, nextIncomes } from "../core/upcoming";
import { totalOf } from "../core/group";
import { CATS, PAYMENT_METHODS, SERASA_CATS } from "../core/catalog";
import { buildCardsWithUsage, canAddCard, spentByPaymentMethod, unregisteredMethodSpend, upfrontByPaymentMethod } from "../core/cards";
import { applyOrder, orderFromSequence, reorderWithin } from "../core/reorder";
import { pruneMonthKeys, selectionStats, toggleKey } from "../core/selection";
import { SelectionBar, SelectionFab } from "../ui/SelectionBar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { store } from "../api/store";
import { monthKeyFor, readCache, writeCache } from "../api/cache";
import OverviewTab from "./OverviewTab";
import GastosTab from "./GastosTab";
import GanhosTab from "./GanhosTab";
import SerasaTab from "./SerasaTab";
import CartoesTab from "./CartoesTab";
import FechamentoTab from "./FechamentoTab";
import CardModal from "../modals/CardModal";
import CardClosingModal from "../modals/CardClosingModal";
import ChecklistTab from "./ChecklistTab";
import ChecklistModal from "../modals/ChecklistModal";
import EntryModal from "../modals/EntryModal";
import ConfirmModal from "../modals/ConfirmModal";
import { useDebouncedSave } from "../hooks/useDebouncedSave";
import { VersionFooter } from "../ui/VersionFooter";
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
  const [savedCategories, setSavedCategories] = useState([]);
  const [serasa, setSerasa] = useState([]);
  const [cards, setCards] = useState([]);
  const [cardModal, setCardModal] = useState(null);   // {item, presetMethod} | null
  /* Fechamento de cartao e preso ao mes (como expenses), nao global. */
  const [cardClosings, setCardClosings] = useState([]);
  const [closingModal, setClosingModal] = useState(null);   // {item} | null
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
  /* Enquanto uma linha esta sendo arrastada, o scroll da tela e desligado:
     senao o gesto de arraste e o de rolagem brigariam pelo mesmo movimento. */
  const [dragging, setDragging] = useState(false);
  /* Cache local: o que esta na tela pode ter vindo do aparelho (ultimo estado
     conhecido) ou da rede. `syncedMonth` diz qual mes ja veio da rede e
     `globalsSynced` o mesmo para serasa/cartoes/desejos/compras. Enquanto nao
     sincronizado, o dado e SO exibicao: os autosaves ficam desligados, senao
     mandariam o snapshot antigo e apagariam o que foi editado na web. */
  const [syncedMonth, setSyncedMonth] = useState(null);
  const [globalsSynced, setGlobalsSynced] = useState(false);
  /* Ultima tentativa de rede falhou: mostra a faixa "sem conexao". Separado do
     "nao sincronizado" para a faixa nao piscar no segundo entre o cache e a rede. */
  const [offline, setOffline] = useState(false);
  const [creatingMonth, setCreatingMonth] = useState(false);
  const insets = useSafeAreaInsets();

  /* O mes corrente vive tambem num ref porque o listener de AppState e o
     carregamento assincrono precisam saber qual mes esta na tela sem virarem
     dependencia do efeito — e para descartar resposta de um mes ja trocado. */
  const { status: saveStatus, track } = useSaveStatus();

  const monthRef = useRef(month);
  monthRef.current = month;

  /* Refs espelham os flags para listeners e callbacks assincronos, que nao
     podem depender do estado sem reassinar. */
  const syncedMonthRef = useRef(null);
  const globalsSyncedRef = useRef(false);

  /* Rede -> estado do mes. Lanca em falha (sem rede): quem chama decide. Os
     fechamentos nao tem mais `.catch` isolado: com [] por falha, o autosave
     apagaria os fechamentos do servidor. Agora ou o mes inteiro sincroniza, ou
     nada sincroniza e fica so exibicao. */
  const loadMonth = useCallback(async (key) => {
    const [data, closings] = await Promise.all([store.load(key), store.loadCardClosings(key)]);
    /* Descarta a resposta se o mes ja mudou — mesma guarda de antes. */
    if (monthRef.current !== key || !data) return;
    const exp = data.expenses;
    const inc = Array.isArray(data.incomes) ? data.incomes : [];
    const clo = Array.isArray(closings) ? closings : [];
    setExpenses(exp);
    setIncomes(inc);
    setCardClosings(clo);
    writeCache(monthKeyFor(key), { expenses: exp, incomes: inc, cardClosings: clo });
    syncedMonthRef.current = key;
    setSyncedMonth(key);
    setOffline(false);
  }, []);

  /* Mostra o mes guardado no aparelho, se houver e se a rede ainda nao trouxe
     a versao fresca. Devolve se havia cache. */
  const hydrateMonth = useCallback(async (key) => {
    const cm = await readCache(monthKeyFor(key));
    if (!cm || monthRef.current !== key || syncedMonthRef.current === key) return !!cm;
    setExpenses(Array.isArray(cm.expenses) ? cm.expenses : []);
    setIncomes(Array.isArray(cm.incomes) ? cm.incomes : []);
    setCardClosings(Array.isArray(cm.cardClosings) ? cm.cardClosings : []);
    return true;
  }, []);

  /* Colecoes globais, tudo-ou-nada. Antes cada uma tinha `.catch(() => [])`:
     uma falha isolada virava [] e o autosave apagava a colecao no servidor. */
  const loadGlobals = useCallback(async () => {
    const [methods, cats, ser, crd, w, mer, far] = await Promise.all([
      store.loadPaymentMethods(),
      store.loadCategories(),
      store.loadSerasa(),
      store.loadCards(),
      store.loadWishlist(),
      store.loadShoppingList("mercado"),
      store.loadShoppingList("farmacia"),
    ]);
    setSavedMethods(methods);
    setSavedCategories(cats);
    setSerasa(ser);
    setCards(crd);
    setWishlist(w);
    setShopping({ mercado: mer, farmacia: far });
    globalsSyncedRef.current = true;
    setGlobalsSynced(true);
    setOffline(false);
  }, []);

  useEffect(() => {
    (async () => {
      /* 1) Cache: se o aparelho ja tem dados, a tela aparece na hora. */
      const [cMonths, cMethods, cCats, cSer, cCards, cWish, cMer, cFar] = await Promise.all([
        readCache("months"),
        readCache("paymentMethods"),
        readCache("categories"),
        readCache("serasa"),
        readCache("cards"),
        readCache("wishlist"),
        readCache("shopping-mercado"),
        readCache("shopping-farmacia"),
      ]);
      const cachedInitial = Array.isArray(cMonths) && cMonths.length > 0 ? cMonths[cMonths.length - 1] : null;
      if (cachedInitial) {
        setMonths(cMonths);
        setMonth(cachedInitial);
        monthRef.current = cachedInitial;
        await hydrateMonth(cachedInitial);
        if (!globalsSyncedRef.current) {
          if (Array.isArray(cMethods)) setSavedMethods(cMethods);
          if (Array.isArray(cCats)) setSavedCategories(cCats);
          if (Array.isArray(cSer)) setSerasa(cSer);
          if (Array.isArray(cCards)) setCards(cCards);
          if (Array.isArray(cWish)) setWishlist(cWish);
          setShopping({ mercado: Array.isArray(cMer) ? cMer : [], farmacia: Array.isArray(cFar) ? cFar : [] });
        }
        setLoading(false);
      }

      /* 2) Rede, tudo em paralelo (antes era uma fila de awaits). */
      try {
        const list = await store.loadMonths();
        const initial = list.length > 0 ? list[list.length - 1] : monthKey(new Date());
        setMonths(list.length > 0 ? list : [initial]);
        /* So pula para o mes mais recente se a pessoa ainda nao navegou para
           outro enquanto a rede respondia. */
        if (!cachedInitial || monthRef.current === cachedInitial) {
          if (initial !== monthRef.current) {
            setMonth(initial);
            monthRef.current = initial;
            await hydrateMonth(initial);
          }
        }
        await Promise.all([loadMonth(monthRef.current), loadGlobals()]);
      } catch (err) {
        /* 401 ja foi tratado globalmente pelo client (volta ao pareamento) */
        if (err.message !== "unauthorized") {
          if (cachedInitial) setOffline(true);
          else setError("Nao foi possivel carregar seus dados.");
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [loadMonth, loadGlobals, hydrateMonth]);

  /* Recarrega ao voltar do segundo plano. Toda escrita neste backend substitui a
     colecao inteira, entao a web pode ter sobrescrito o mes enquanto o app
     estava fechado — partir de dado fresco estreita bastante essa janela. Se as
     colecoes globais ainda nao sincronizaram (abriu offline), tenta de novo. */
  useEffect(() => {
    const sub = AppState.addEventListener("change", (s) => {
      if (s !== "active") return;
      Promise.all([
        loadMonth(monthRef.current),
        globalsSyncedRef.current ? null : loadGlobals(),
      ]).catch((err) => {
        if (err?.message !== "unauthorized") setOffline(true);
      });
    });
    return () => sub.remove();
  }, [loadMonth, loadGlobals]);

  /* Trocar de mes invalida so as chaves do mes; as colecoes globais seguem. */
  useEffect(() => {
    setSelectedKeys(pruneMonthKeys);
  }, [month]);

  /* Reforco defensivo: trocar de aba ou de mes nunca pode deixar o scroll preso
     por um arraste que foi interrompido antes de terminar. O cleanup do
     DraggableList ja cobre a desmontagem; isto garante o caso geral. */
  useEffect(() => {
    setDragging(false);
  }, [tab, month]);

  const switchMonth = async (key) => {
    if (key === month) return;
    /* Grava o pendente ANTES de trocar: o snapshot do debounce carrega o mes
       antigo, mas esperar o timer perderia a ultima edicao. Vale tambem para os
       fechamentos, que sao presos ao mes. */
    flushSave();
    flushClosings();
    setMonth(key);
    monthRef.current = key;
    /* Mes ja visitado aparece do cache na hora; sem cache, esvazia (senao a
       tela mostraria o mes anterior com o rotulo do novo) e mostra o spinner. */
    const hadCache = await hydrateMonth(key);
    if (!hadCache && monthRef.current === key) {
      setExpenses([]);
      setIncomes([]);
      setCardClosings([]);
      setLoading(true);
    }
    try {
      await loadMonth(key);
    } catch (err) {
      if (err?.message !== "unauthorized") setOffline(true);
    } finally {
      setLoading(false);
    }
  };

  /* Mesmo calculo da web (meu-caixa.jsx nextMonthKey): o mes seguinte ao ultimo
     que existe, nao ao que esta na tela. */
  const nextMonthKey = useMemo(
    () => addMonths(months.length > 0 ? months[months.length - 1] : month, 1),
    [months, month]
  );

  /* Espelha handleAddNextMonth da web. O servidor copia do mes anterior os
     recorrentes e as parcelas em andamento; o mes chega pronto na resposta,
     entao ja nasce sincronizado (veio da rede) e entra no cache. */
  const createNextMonth = async () => {
    if (creatingMonth) return;
    const target = nextMonthKey;
    setCreatingMonth(true);
    /* O pendente do mes atual grava antes de a tela trocar de mes. */
    flushSave();
    flushClosings();
    try {
      const data = await store.createMonth(target);
      const exp = Array.isArray(data?.expenses) ? data.expenses : [];
      const inc = Array.isArray(data?.incomes) ? data.incomes : [];
      const nextMonths = months.includes(target) ? months : [...months, target];
      setMonths(nextMonths);
      writeCache("months", nextMonths);
      monthRef.current = target;
      syncedMonthRef.current = target;
      setMonth(target);
      setExpenses(exp);
      setIncomes(inc);
      /* Mes novo comeca sem fechamentos — createMonth nao os leva adiante. */
      setCardClosings([]);
      setSyncedMonth(target);
      writeCache(monthKeyFor(target), { expenses: exp, incomes: inc, cardClosings: [] });
    } catch (err) {
      if (err?.message !== "unauthorized") {
        Alert.alert("Não foi possível criar o mês", err?.message || "Tente novamente.");
      }
    } finally {
      setCreatingMonth(false);
    }
  };

  /* Confirmacao: no app nao ha como apagar um mes criado. */
  const confirmCreateMonth = () =>
    Alert.alert(
      `Criar ${monthLabel(nextMonthKey)}?`,
      "Os gastos recorrentes e as parcelas em andamento do mês anterior serão copiados para ele.",
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Criar", onPress: createNextMonth },
      ]
    );

  /* Recarrega tudo, nao so o mes: desejos, listas, serasa e cartoes sao
     colecoes globais e ficariam paradas num puxao de atualizar. E tambem o
     jeito de sair do modo offline depois que a conexao volta. */
  const refresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([loadGlobals(), loadMonth(monthRef.current)]);
    } catch (err) {
      if (err?.message !== "unauthorized") setOffline(true);
    } finally {
      setRefreshing(false);
    }
  };

  /* Memoizado porque entra no array de dependencias do debounce: um objeto novo
     a cada render reagendaria a gravacao para sempre. */
  const payload = useMemo(() => ({ month, expenses, incomes }), [month, expenses, incomes]);
  /* So grava o que veio da rede: dado de cache nunca chega ao servidor. Ao
     trocar de mes, `syncedMonth` ainda aponta o anterior, entao o novo mes fica
     desligado ate a rede responder — e o pendente do anterior ja foi flushado. */
  const monthSynced = !loading && !error && syncedMonth === month;
  const globalsReady = !loading && !error && globalsSynced;
  const flushSave = useDebouncedSave(
    payload,
    (snap) => track(store.save(snap.month, { expenses: snap.expenses, incomes: snap.incomes })),
    { enabled: monthSynced }
  );

  /* Serasa e colecao GLOBAL (sem mes) e tem endpoint proprio, entao seu
     autosave e separado do payload mensal. */
  const flushSerasa = useDebouncedSave(
    serasa,
    (snap) => track(store.saveSerasa(snap)),
    { enabled: globalsReady }
  );

  const setterFor = (mode) =>
    ({
      expense: setExpenses,
      income: setIncomes,
      serasa: setSerasa,
      card: setCards,
      closing: setCardClosings,
      wish: setWishlist,
    })[mode] || ((fn) => setShopping((prev) => ({ ...prev, [mode]: fn(prev[mode]) })));

  /* Cartoes tambem e colecao GLOBAL, com endpoint proprio. */
  const flushCards = useDebouncedSave(
    cards,
    (snap) => track(store.saveCards(snap)),
    { enabled: globalsReady }
  );

  /* Fechamentos sao do mes: o payload carrega o mes junto para o endpoint saber
     onde gravar, igual ao payload mensal de gastos/ganhos. */
  const closingsPayload = useMemo(
    () => ({ month, cardClosings }),
    [month, cardClosings]
  );
  const flushClosings = useDebouncedSave(
    closingsPayload,
    (snap) => track(store.saveCardClosings(snap.month, snap.cardClosings)),
    { enabled: monthSynced }
  );

  const flushWishlist = useDebouncedSave(
    wishlist,
    (snap) => track(store.saveWishlist(snap)),
    { enabled: globalsReady }
  );
  /* Uma lista muda, as duas sao gravadas — igual a web, que tem um efeito so
     para shoppingLists. Sao dois PUTs, mas o debounce ja os agrupa. */
  const flushShopping = useDebouncedSave(
    shopping,
    (snap) =>
      Promise.all([
        track(store.saveShoppingList("mercado", snap.mercado)),
        track(store.saveShoppingList("farmacia", snap.farmacia)),
      ]),
    { enabled: globalsReady }
  );

  /* O cache acompanha o estado ja sincronizado, para refletir as edicoes feitas
     online na proxima abertura. Gravado so depois da rede: nunca um cache
     reescrevendo outro. */
  useEffect(() => {
    if (!monthSynced) return;
    writeCache(monthKeyFor(month), { expenses, incomes, cardClosings });
  }, [monthSynced, month, expenses, incomes, cardClosings]);

  useEffect(() => {
    if (!globalsReady) return;
    writeCache("serasa", serasa);
    writeCache("cards", cards);
    writeCache("wishlist", wishlist);
    writeCache("shopping-mercado", shopping.mercado);
    writeCache("shopping-farmacia", shopping.farmacia);
  }, [globalsReady, serasa, cards, wishlist, shopping]);

  /* Editar so com tudo sincronizado. Offline (ou no segundo entre o cache e a
     rede), o toque avisa em vez de abrir o modal: a edicao nao teria como ser
     gravada e seria apagada quando a rede trouxesse a versao do servidor. */
  const editable = monthSynced && globalsReady;

  /* Antes de reiniciar o app para aplicar uma atualizacao: grava e ESPERA tudo
     o que estiver pendente (o reload descarta a memoria). */
  const flushAll = () =>
    Promise.allSettled([
      flushSave(),
      flushClosings(),
      flushSerasa(),
      flushCards(),
      flushWishlist(),
      flushShopping(),
    ]);
  const guard = (fn) => (...args) => {
    if (!editable) {
      Alert.alert(
        offline ? "Sem conexão" : "Atualizando",
        offline
          ? "Você está vendo os dados salvos no aparelho. Conecte-se à internet e puxe a tela para baixo para editar."
          : "Seus dados estão sendo atualizados. Tente de novo em instantes."
      );
      return undefined;
    }
    return fn(...args);
  };

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

  const saveClosing = (data, id) => {
    setCardClosings((prev) =>
      id
        ? prev.map((c) => (c.id === id ? { ...c, ...data } : c))
        : [...prev, { id: uid(), createdAt: new Date().toISOString(), ...data }]
    );
    setClosingModal(null);
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
  /* Arraste devolve a sequencia completa de ids do grupo; vira o mesmo mapa
     denso que as setas (orderFromSequence) e aplica so nesses ids. */
  const reorderExpenses = (orderedIds) =>
    setExpenses((prev) => applyOrder(prev, orderFromSequence(orderedIds)));

  const reorderClosings = (orderedIds) =>
    setCardClosings((prev) => applyOrder(prev, orderFromSequence(orderedIds)));

  /* Mesma ideia para as demais listas: a aba manda a sequencia nova do grupo/
     secao visivel e aqui vira `order` denso. Serasa reordena dentro da categoria;
     ganhos e a lista plana inteira; wish/mercado/farmacia reordenam os pendentes. */
  const reorderSerasa = (orderedIds) =>
    setSerasa((prev) => applyOrder(prev, orderFromSequence(orderedIds)));

  const reorderIncomes = (orderedIds) =>
    setIncomes((prev) => applyOrder(prev, orderFromSequence(orderedIds)));

  const reorderList = (kind, orderedIds) =>
    listSetter(kind)((prev) => applyOrder(prev, orderFromSequence(orderedIds)));

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

  /* As ja gravadas no banco (de QUALQUER mes) somadas as do mes carregado, para
     que uma categoria criada uma vez continue na lista depois — e para que uma
     criada agora apareca antes mesmo do proximo boot. Mesmo tratamento que
     extraMethods logo abaixo. */
  const extraCategories = useMemo(() => {
    const known = new Set(CATS.map((c) => c.name));
    const all = [...savedCategories, ...expenses.map((e) => e.category)];
    return [...new Set(all.filter((c) => c && !known.has(c)))].sort();
  }, [savedCategories, expenses]);

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

  /* Fechamento fica de fora do FAB de selecao: nao e item de fluxo de caixa e
     nao entra em SELECTION_SOURCES, igual a Cartoes. */
  const fabVisible =
    !selecting && tab !== "overview" && tab !== "cartoes" && tab !== "fechamento";
  const bottomGap = selecting ? barHeight : fabVisible ? 64 + 24 + insets.bottom : 0;

  const selProps = (kind) => ({
    selecting,
    isSelected: (id) => selectedKeys.has(`${kind}:${id}`),
    onToggleSelect: (id) => setSelectedKeys((prev) => toggleKey(prev, kind, id)),
  });

  const spent = useMemo(() => spentByPaymentMethod(expenses), [expenses]);
  const upfront = useMemo(() => upfrontByPaymentMethod(expenses), [expenses]);
  const cardsWithUsage = useMemo(
    () => buildCardsWithUsage(cards, spent, month, upfront),
    [cards, spent, month, upfront]
  );
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
      {/* KeyboardAwareScrollView, nao ScrollView: rola sozinho ate o campo
          focado (busca, "De/Ate" dos filtros de Gastos). No Android edge-to-
          edge o adjustResize da janela nao encolhe nada, entao sem isto um
          campo no meio da tela fica embaixo do teclado. style em vez de
          className: componente de fora do RN, o NativeWind nao o registra. */}
      <KeyboardAwareScrollView
        style={{ flex: 1 }}
        scrollEnabled={!dragging}
        bottomOffset={16}
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
            flushClosings();
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

      {/* Sempre visivel (antes so com 2+ meses): e onde mora o "+ Proximo mes". */}
      {months.length > 0 && (
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
            <Touchable
              onPress={guard(confirmCreateMonth)}
              disabled={creatingMonth}
              hitSlop={{ top: 6, bottom: 6 }}
              className="flex-row items-center gap-1.5 px-4 py-2 rounded-full border border-dashed border-slate-300 bg-white disabled:opacity-60"
            >
              {creatingMonth ? (
                <ActivityIndicator size="small" color="#16382c" />
              ) : (
                <Plus size={14} color="#16382c" />
              )}
              <Text className="text-sm font-medium text-slate-600">{monthLabel(nextMonthKey)}</Text>
            </Touchable>
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
            ["fechamento", "Fechamento de cartão"],
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

      {offline && !loading && !error ? (
        <View className="flex-row items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 mb-4">
          <WifiOff size={16} color="#b45309" />
          <Text className="text-xs text-amber-800 flex-1">
            Sem conexão — mostrando os dados salvos no aparelho. Puxe a tela para baixo para atualizar.
          </Text>
        </View>
      ) : null}

      {loading ? (
        <View className="items-center py-10 gap-3">
          <ActivityIndicator color="#16382c" />
          <Text className="text-sm text-slate-500">Carregando...</Text>
        </View>
      ) : tab === "overview" ? (
        <OverviewTab
          expenses={expenses}
          incomes={incomes}
          onEditItem={guard((kind, item) => setModal({ mode: kind, item }))}
        />
      ) : tab === "gastos" ? (
        <GastosTab
          {...selProps("expense")}
          expenses={expenses}
          total={totalOf(expenses)}
          onAdd={guard(() => setModal({ mode: "expense", item: null }))}
          onEdit={guard((e) => setModal({ mode: "expense", item: e }))}
          onDelete={guard((e) => setConfirming({ mode: "expense", item: e }))}
          onTogglePaid={guard((e) => togglePaid("expense", e.id))}
          onMove={editable ? moveExpense : undefined}
          onReorder={editable ? reorderExpenses : undefined}
          onDragChange={setDragging}
          extraPaymentMethods={extraPaymentMethods}
        />
      ) : tab === "ganhos" ? (
        <GanhosTab
          {...selProps("income")}
          incomes={incomes}
          onAdd={guard(() => setModal({ mode: "income", item: null }))}
          onEdit={guard((i) => setModal({ mode: "income", item: i }))}
          onDelete={guard((i) => setConfirming({ mode: "income", item: i }))}
          onReorder={editable ? reorderIncomes : undefined}
          onDragChange={setDragging}
        />
      ) : tab === "serasa" ? (
        <SerasaTab
          {...selProps("serasa")}
          serasa={serasa}
          onAdd={guard(() => setModal({ mode: "serasa", item: null }))}
          onEdit={guard((x) => setModal({ mode: "serasa", item: x }))}
          onDelete={guard((x) => setConfirming({ mode: "serasa", item: x }))}
          onTogglePaid={guard((x) => togglePaid("serasa", x.id))}
          onReorder={editable ? reorderSerasa : undefined}
          onDragChange={setDragging}
        />
      ) : tab === "cartoes" ? (
        <CartoesTab
          cards={cardsWithUsage}
          unregistered={unregistered}
          month={month}
          canAdd={canAddCard(cards, extraPaymentMethods)}
          /* onAdd() sem argumento: a forma nua passaria o evento como presetMethod */
          onAdd={guard((preset) => setCardModal({ item: null, presetMethod: typeof preset === "string" ? preset : undefined }))}
          onEdit={guard((c) => setCardModal({ item: c }))}
          onDelete={guard((c) => setConfirming({ mode: "card", item: c }))}
        />
      ) : tab === "fechamento" ? (
        <FechamentoTab
          items={cardClosings}
          onAdd={guard(() => setClosingModal({ item: null }))}
          onEdit={guard((it) => setClosingModal({ item: it }))}
          onDelete={guard((it) => setConfirming({ mode: "closing", item: it }))}
          onReorder={editable ? reorderClosings : undefined}
          onDragChange={setDragging}
        />
      ) : (
        <ChecklistTab
          {...selProps(tab === "desejos" ? "wish" : tab)}
          items={listItems(tab === "desejos" ? "wish" : tab)}
          totalLabel={tab === "desejos" ? "Total desejado" : "Total estimado"}
          addLabel={tab === "desejos" ? "Novo desejo" : "Novo item"}
          emptyText={tab === "desejos" ? "Nenhum desejo cadastrado." : "Nenhum item cadastrado."}
          doneLabel={tab === "desejos" ? "Realizado" : "Comprado"}
          onAdd={guard(() => setListModal({ kind: tab === "desejos" ? "wish" : tab, item: null }))}
          onEdit={guard((i) => setListModal({ kind: tab === "desejos" ? "wish" : tab, item: i }))}
          onDelete={guard((i) => setConfirming({ mode: tab === "desejos" ? "wish" : tab, item: i }))}
          onToggleDone={guard((i) => toggleListDone(tab === "desejos" ? "wish" : tab, i.id))}
          /* Só Mercado tem "Limpar", como na web — Farmácia não recebe o handler. */
          onClearDone={tab === "mercado" ? guard(() => clearListDone("mercado")) : undefined}
          onReorder={editable ? (ids) => reorderList(tab === "desejos" ? "wish" : tab, ids) : undefined}
          onDragChange={setDragging}
        />
      )}

      <VersionFooter onBeforeReload={flushAll} />

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

      {closingModal ? (
        <CardClosingModal
          visible
          key={closingModal.item?.id || "novo"}
          item={closingModal.item}
          onClose={() => setClosingModal(null)}
          onSave={saveClosing}
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
      </KeyboardAwareScrollView>

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
