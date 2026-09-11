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
import { store } from "../api/store";
import OverviewTab from "./OverviewTab";

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
          onPress={onSignOut}
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

      <View className="mb-4">
        <Text className="text-xs text-slate-500">Total de gastos</Text>
        <Text className="text-xl font-bold text-slate-800" style={NUM}>
          {fmt(totalOf(expenses))}
        </Text>
      </View>

      {error ? <Text className="text-sm text-rose-600 text-center py-8">{error}</Text> : null}

      {loading ? (
        <View className="items-center py-10 gap-3">
          <ActivityIndicator color="#16382c" />
          <Text className="text-sm text-slate-500">Carregando...</Text>
        </View>
      ) : (
        <OverviewTab expenses={expenses} incomes={incomes} />
      )}
    </ScrollView>
  );
}
