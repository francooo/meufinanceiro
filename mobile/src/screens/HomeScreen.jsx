import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, AppState, BackHandler, RefreshControl, Text, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { StatusBar } from "expo-status-bar";
import { CalendarCheck, CreditCard, Heart, Pill, ReceiptText, ShoppingCart, Wallet, WifiOff } from "lucide-react-native";
import { addMonths, monthKey, monthLabel, setHideValues, todayISO } from "../core/format";
import { totalOf } from "../core/group";
import { CATS, PAYMENT_METHODS, SERASA_CATS } from "../core/catalog";
import { buildCardsWithUsage, canAddCard, spentByPaymentMethod, unregisteredMethodSpend, upfrontByPaymentMethod } from "../core/cards";
import { applyOrder, orderFromSequence, reorderWithin } from "../core/reorder";
import { pruneMonthKeys, selectionStats, toggleKey } from "../core/selection";
import { uid } from "../core/uid";
import { store } from "../api/store";
import { monthKeyFor, readCache, writeCache } from "../api/cache";
import { useDebouncedSave } from "../hooks/useDebouncedSave";
import { useSaveStatus } from "../hooks/useSaveStatus";
import { SelectionBar, SelectionFab } from "../ui/SelectionBar";
import { AppHeader, TabBar, sectionOfTab } from "../ui/shell";
import { Panel, Segmented, Skeleton, Toast } from "../ui/kit";
import { useTheme } from "../ui/theme";
import OverviewTab from "./OverviewTab";
import GastosTab from "./GastosTab";
import GanhosTab from "./GanhosTab";
import SerasaTab from "./SerasaTab";
import CartoesTab from "./CartoesTab";
import FechamentoTab from "./FechamentoTab";
import ChecklistTab from "./ChecklistTab";
import SettingsTab from "./SettingsTab";
import CardModal, { BalanceModal } from "../modals/CardModal";
import CardClosingModal from "../modals/CardClosingModal";
import ChecklistModal from "../modals/ChecklistModal";
import EntryModal from "../modals/EntryModal";
import ConfirmModal from "../modals/ConfirmModal";

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
    !selecting && tab !== "overview" && tab !== "cartoes" && tab !== "fechamento" && tab !== "config";
  /* A barra de abas e irma do scroll (nao fica por cima), entao o espaco extra
     e so o do FAB ou da barra de soma, que flutuam acima dela. */
  const bottomGap = selecting ? barHeight + 10 : fabVisible ? 56 + 14 : 0;

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



  /* ---------- estrutura (kit mobile): 5 abas embaixo + sub-abas ---------- */
  const section = sectionOfTab(tab).id;
  /* Ultima sub-aba visitada em cada secao: voltar para "Mais" reabre Mercado,
     se foi la que a pessoa estava. */
  const lastTabBySection = useRef({});
  useEffect(() => {
    lastTabBySection.current[sectionOfTab(tab).id] = tab;
  }, [tab]);
  const goSection = (s) => setTab(lastTabBySection.current[s.id] || s.tabs[0]);

  /* Voltar do Android: fora do Inicio, volta para ele em vez de fechar o app.
     As folhas (Modal) tratam o proprio voltar com onRequestClose. */
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (selecting) {
        setSelecting(false);
        setSelectedKeys(new Set());
        return true;
      }
      if (tab !== "overview") {
        setTab("overview");
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [tab, selecting]);

  /* Preferencias do aparelho (ui/theme.js): olho e carteira da Sobra. O fmt le
     a flag durante este render (ver setHideValues em core/format.js). */
  const { prefs, setPref, colors, dark } = useTheme();
  setHideValues(prefs.hideValues);
  const wallets = {
    cltPj: { recebido: cltRecebido, gasto: cltGasto },
    va: { recebido: vaRecebido, gasto: vaUsado },
  };

  /* Aviso "Gasto marcado como pago · Desfazer" + destaque da linha por ~5s. */
  const [toast, setToast] = useState(null); // {message, undo}
  const [highlightId, setHighlightId] = useState(null);
  const toastTimer = useRef(null);
  const dismissToast = useCallback(() => {
    clearTimeout(toastTimer.current);
    setToast(null);
    setHighlightId(null);
  }, []);
  useEffect(() => () => clearTimeout(toastTimer.current), []);
  useEffect(() => dismissToast(), [tab, month, dismissToast]);

  const markPaid = (mode, item) => {
    togglePaid(mode, item.id);
    if (item.paidAt) return dismissToast(); // desmarcar nao precisa de aviso
    clearTimeout(toastTimer.current);
    setHighlightId(item.id);
    setToast({
      message: mode === "serasa" ? "Dívida marcada como paga" : "Gasto marcado como pago",
      undo: () => setterFor(mode)((prev) => prev.map((e) => (e.id === item.id ? { ...e, paidAt: null } : e))),
    });
    toastTimer.current = setTimeout(() => {
      setToast(null);
      setHighlightId(null);
    }, 5000);
  };

  const closingSuggestions = useMemo(
    () => [...new Set([...cards.map((c) => c.paymentMethod), ...cardClosings.map((c) => c.cardName)].filter(Boolean))],
    [cards, cardClosings]
  );

  const signOutNow = () => {
    flushSave();
    flushSerasa();
    flushCards();
    flushClosings();
    flushWishlist();
    flushShopping();
    onSignOut();
  };

  const kindOf = (t) => (t === "desejos" ? "wish" : t);
  const subTabs =
    section === "lancamentos" ? (
      <Segmented value={tab} onChange={setTab} options={[{ value: "gastos", label: "Gastos", icon: ReceiptText }, { value: "ganhos", label: "Ganhos", icon: Wallet }]} />
    ) : section === "cartoes" ? (
      <Segmented value={tab} onChange={setTab} options={[{ value: "cartoes", label: "Saldos", icon: CreditCard }, { value: "fechamento", label: "Fechamentos", icon: CalendarCheck }]} />
    ) : section === "mais" && tab !== "config" ? (
      <Segmented
        value={tab}
        onChange={setTab}
        options={[
          { value: "desejos", label: "Desejos", icon: Heart },
          { value: "mercado", label: "Mercado", icon: ShoppingCart },
          { value: "farmacia", label: "Farmácia", icon: Pill },
        ]}
      />
    ) : null;

  const content = loading ? (
    <LoadingSkeleton />
  ) : tab === "overview" ? (
    <OverviewTab
      expenses={expenses}
      incomes={incomes}
      wallet={prefs.wallet}
      onWalletChange={(w) => setPref("wallet", w)}
      wallets={wallets}
      onEditItem={guard((kind, item) => setModal({ mode: kind, item }))}
      onGo={setTab}
    />
  ) : tab === "gastos" ? (
    <GastosTab
      {...selProps("expense")}
      expenses={expenses}
      total={totalOf(expenses)}
      onAdd={guard(() => setModal({ mode: "expense", item: null }))}
      onEdit={guard((e) => setModal({ mode: "expense", item: e }))}
      onDelete={guard((e) => setConfirming({ mode: "expense", item: e }))}
      onTogglePaid={guard((e) => markPaid("expense", e))}
      onMove={editable ? moveExpense : undefined}
      onReorder={editable ? reorderExpenses : undefined}
      onDragChange={setDragging}
      extraPaymentMethods={extraPaymentMethods}
      highlightId={highlightId}
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
      onTogglePaid={guard((x) => markPaid("serasa", x))}
      onReorder={editable ? reorderSerasa : undefined}
      onDragChange={setDragging}
      highlightId={highlightId}
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
      onUpdateBalance={guard((c) => setCardModal({ item: c, balance: true }))}
      onDelete={guard((c) => setConfirming({ mode: "card", item: c }))}
    />
  ) : tab === "fechamento" ? (
    <FechamentoTab
      items={cardClosings}
      month={month}
      onAdd={guard(() => setClosingModal({ item: null }))}
      onEdit={guard((it) => setClosingModal({ item: it }))}
      onDelete={guard((it) => setConfirming({ mode: "closing", item: it }))}
      onReorder={editable ? reorderClosings : undefined}
      onDragChange={setDragging}
    />
  ) : tab === "config" ? (
    <SettingsTab email={email} onSignOut={signOutNow} onBeforeReload={flushAll} />
  ) : (
    <ChecklistTab
      key={tab}
      kind={kindOf(tab)}
      {...selProps(kindOf(tab))}
      items={listItems(kindOf(tab))}
      onAdd={guard(() => setListModal({ kind: kindOf(tab), item: null }))}
      onEdit={guard((i) => setListModal({ kind: kindOf(tab), item: i }))}
      onDelete={guard((i) => setConfirming({ mode: kindOf(tab), item: i }))}
      onToggleDone={guard((i) => toggleListDone(kindOf(tab), i.id))}
      /* Só Mercado tem "Limpar", como na web — Farmácia não recebe o handler. */
      onClearDone={tab === "mercado" ? guard(() => clearListDone("mercado")) : undefined}
      onReorder={editable ? (ids) => reorderList(kindOf(tab), ids) : undefined}
      onDragChange={setDragging}
    />
  );

  const overlayBottom = 10;

  return (
    <View className="flex-1 bg-canvas">
      <AppHeader
        months={months}
        month={month}
        nextMonthKey={nextMonthKey}
        onChangeMonth={switchMonth}
        onAddNextMonth={guard(confirmCreateMonth)}
        creatingMonth={creatingMonth}
        monthDisabled={loading && months.length === 0}
        hideValues={prefs.hideValues}
        onToggleHide={() => setPref("hideValues", (v) => !v)}
        email={email}
        onOpenSettings={() => setTab("config")}
        saveStatus={saveStatus}
      />

      <View className="flex-1">
        {/* KeyboardAwareScrollView, nao ScrollView: rola sozinho ate o campo
            focado (busca). No Android edge-to-edge o adjustResize da janela nao
            encolhe nada, entao sem isto um campo no meio da tela fica embaixo do
            teclado. style em vez de className: componente de fora do RN, o
            NativeWind nao o registra. */}
        <KeyboardAwareScrollView
          style={{ flex: 1 }}
          scrollEnabled={!dragging}
          bottomOffset={16}
          /* Sem isto, com o teclado da busca aberto o PRIMEIRO toque em qualquer
             botao e consumido dispensando o teclado — o classico "tem que tocar
             duas vezes". */
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 6, paddingBottom: 24 + bottomGap }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.positive} colors={[colors.forest2]} progressBackgroundColor={colors.surface} />}
        >
          {error ? <Text className="font-brand text-[14px] text-coral text-center py-8">{error}</Text> : null}

          {offline && !loading && !error ? (
            <View className="flex-row items-center gap-2.5 rounded-[14px] border border-champagne/50 bg-tint-gold px-4 py-3 mb-3">
              <WifiOff size={17} color={colors.gold} />
              <Text className="font-brand text-[12px] text-gold flex-1 leading-[17px]">
                Sem conexão — mostrando os dados salvos no aparelho. Puxe a tela para baixo para atualizar.
              </Text>
            </View>
          ) : null}

          {subTabs}
          {content}
        </KeyboardAwareScrollView>

        {/* Cartoes fica de fora: saldo de cartao nao e item de fluxo de caixa, e
            SELECTION_SOURCES nao o registra — uma chave "card:" quebraria a soma. */}
        {fabVisible ? <SelectionFab onPress={() => setSelecting(true)} bottom={overlayBottom + 4} /> : null}

        {selecting ? (
          <SelectionBar
            onLayout={(e) => setBarHeight(e.nativeEvent.layout.height)}
            bottom={overlayBottom}
            stats={stats}
            onClear={() => setSelectedKeys(new Set())}
            onClose={() => {
              setSelecting(false);
              setSelectedKeys(new Set());
            }}
          />
        ) : null}

        {toast ? (
          <Toast
            message={toast.message}
            actionLabel="Desfazer"
            onAction={() => {
              toast.undo();
              dismissToast();
            }}
            onClose={dismissToast}
            bottom={overlayBottom + (selecting ? barHeight + 8 : fabVisible ? 70 : 0)}
          />
        ) : null}
      </View>

      <TabBar section={section} onSelect={goSection} />

      {listModal ? (
        <ChecklistModal visible key={listModal.kind + (listModal.item?.id || "novo")} kind={listModal.kind} item={listModal.item} onClose={() => setListModal(null)} onSave={saveListItem} />
      ) : null}

      {cardModal && cardModal.balance ? (
        <BalanceModal visible key={"saldo" + cardModal.item.id} card={cardModal.item} onClose={() => setCardModal(null)} onSave={saveCard} />
      ) : cardModal ? (
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
        <CardClosingModal visible key={closingModal.item?.id || "novo"} item={closingModal.item} suggestions={closingSuggestions} onClose={() => setClosingModal(null)} onSave={saveClosing} />
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

      <ConfirmModal visible={!!confirming} item={confirming?.item} onCancel={() => setConfirming(null)} onConfirm={removeEntry} />

      <StatusBar style={dark ? "light" : "dark"} />
    </View>
  );
}

/* Carregamento em esqueleto (home-carregamento.jpg): so na primeira abertura
   sem cache; com cache o app abre direto nos dados guardados. */
function LoadingSkeleton() {
  return (
    <View className="gap-3.5" accessibilityLabel="Carregando seus dados">
      <Skeleton width={180} height={30} />
      <Skeleton width={230} height={16} />
      <View className="rounded-[20px] p-[18px] gap-3 bg-forest">
        <Skeleton width={120} height={16} color="rgba(255,255,255,0.14)" />
        <Skeleton width={200} height={34} color="rgba(255,255,255,0.14)" />
        <Skeleton height={10} color="rgba(255,255,255,0.14)" />
      </View>
      {[0, 1].map((i) => (
        <Panel key={i} className="gap-3">
          <Skeleton width={150} height={18} />
          <Skeleton height={12} />
          <Skeleton width="80%" height={12} />
          <Skeleton width="60%" height={12} />
        </Panel>
      ))}
      <Text className="font-brand text-[13px] text-muted text-center">Carregando seus dados…</Text>
    </View>
  );
}
