import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  AppState,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { ArrowDownRight, ArrowUpRight, LogOut, PiggyBank } from "lucide-react-native";
import { fmt, monthKey, monthLabel } from "../core/format";
import { totalOf } from "../core/group";
import { CATS, PAYMENT_METHODS, SERASA_CATS } from "../core/catalog";
import { store } from "../api/store";
import OverviewTab from "./OverviewTab";
import GastosTab from "./GastosTab";
import GanhosTab from "./GanhosTab";
import SerasaTab from "./SerasaTab";
import EntryModal from "../modals/EntryModal";
import ConfirmModal from "../modals/ConfirmModal";
import { useDebouncedSave } from "../hooks/useDebouncedSave";
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

  /* O mes corrente vive tambem num ref porque o listener de AppState e o
     carregamento assincrono precisam saber qual mes esta na tela sem virarem
     dependencia do efeito — e para descartar resposta de um mes ja trocado. */
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

  const refresh = async () => {
    setRefreshing(true);
    try {
      await loadMonth(monthRef.current);
    } catch {
      /* silencioso: o pull-to-refresh volta ao normal sozinho */
    } finally {
      setRefreshing(false);
    }
  };

  /* Memoizado porque entra no array de dependencias do debounce: um objeto novo
     a cada render reagendaria a gravacao para sempre. */
  const payload = useMemo(() => ({ month, expenses, incomes }), [month, expenses, incomes]);
  const flushSave = useDebouncedSave(
    payload,
    (snap) => store.save(snap.month, { expenses: snap.expenses, incomes: snap.incomes }).catch(() => {}),
    { enabled: !loading && !error }
  );

  /* Serasa e colecao GLOBAL (sem mes) e tem endpoint proprio, entao seu
     autosave e separado do payload mensal. */
  const flushSerasa = useDebouncedSave(
    serasa,
    (snap) => store.saveSerasa(snap).catch(() => {}),
    { enabled: !loading && !error }
  );

  const setterFor = (mode) =>
    ({ expense: setExpenses, income: setIncomes, serasa: setSerasa })[mode];

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

  const vaRecebido = useMemo(() => totalOf(incomes.filter((i) => i.voucherIncome)), [incomes]);
  const vaUsado = useMemo(() => totalOf(expenses.filter((e) => e.paidWithVoucher)), [expenses]);
  const cltRecebido = useMemo(() => totalOf(incomes.filter((i) => i.cltPjIncome)), [incomes]);
  const cltGasto = useMemo(() => totalOf(expenses.filter((e) => e.paidWithCltPj)), [expenses]);
  const vaRestante = vaRecebido - vaUsado;
  const cltSobra = cltRecebido - cltGasto;

  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{ padding: 16 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor="#16382c" />
      }
    >
      <View className="flex-row items-center justify-between mb-4">
        <View className="flex-1 min-w-0">
          <Text className="text-lg font-bold text-slate-800">Meu financeiro</Text>
          <Text className="text-xs text-slate-500" numberOfLines={1}>
            {email}
          </Text>
        </View>
        <Pressable
          onPress={() => {
            flushSave();
            flushSerasa();
            onSignOut();
          }}
          className="h-9 w-9 rounded-xl bg-white border border-slate-200 items-center justify-center"
        >
          <LogOut size={16} color="#64748b" />
        </Pressable>
      </View>

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
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
          <View className="flex-row gap-2">
            {months.map((m) => {
              const active = m === month;
              return (
                <Pressable
                  key={m}
                  onPress={() => switchMonth(m)}
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
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      )}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
        <View className="flex-row gap-1 bg-white rounded-full p-1 border border-slate-200">
          {[
            ["overview", "Visão geral"],
            ["gastos", "Gastos"],
            ["ganhos", "Ganhos"],
            ["serasa", "Serasa"],
          ].map(([id, label]) => {
            const active = tab === id;
            return (
              <Pressable
                key={id}
                onPress={() => setTab(id)}
                className="px-4 py-2 rounded-full"
                style={active ? { backgroundColor: "#16382c" } : undefined}
              >
                <Text className={"text-sm font-medium " + (active ? "text-white" : "text-slate-500")}>
                  {label}
                </Text>
              </Pressable>
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
          expenses={expenses}
          total={totalOf(expenses)}
          onAdd={() => setModal({ mode: "expense", item: null })}
          onEdit={(e) => setModal({ mode: "expense", item: e })}
          onDelete={(e) => setConfirming({ mode: "expense", item: e })}
          onTogglePaid={(e) => togglePaid("expense", e.id)}
        />
      ) : tab === "ganhos" ? (
        <GanhosTab
          incomes={incomes}
          onAdd={() => setModal({ mode: "income", item: null })}
          onEdit={(i) => setModal({ mode: "income", item: i })}
          onDelete={(i) => setConfirming({ mode: "income", item: i })}
        />
      ) : (
        <SerasaTab
          serasa={serasa}
          onAdd={() => setModal({ mode: "serasa", item: null })}
          onEdit={(x) => setModal({ mode: "serasa", item: x })}
          onDelete={(x) => setConfirming({ mode: "serasa", item: x })}
          onTogglePaid={(x) => togglePaid("serasa", x.id)}
        />
      )}

      {modal ? (
        <EntryModal
          visible
          /* key remonta o modal por item: sem isso os useState iniciais
             ficariam presos no primeiro gasto aberto. */
          key={(modal.mode || "") + (modal.item?.id || "novo")}
          mode={modal.mode}
          item={modal.item}
          extraCategories={modal.mode === "serasa" ? extraSerasaCategories : extraCategories}
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
  );
}
