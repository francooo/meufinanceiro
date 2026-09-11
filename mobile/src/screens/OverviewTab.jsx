import { useMemo } from "react";
import { Text, View } from "react-native";
import { ArrowDownRight, ArrowUpRight, History } from "lucide-react-native";
import { fmt, formatRelativeTime } from "../core/format";
import { buildByCat, buildRecentItems, totalOf } from "../core/group";
import { iconFor } from "../ui/icons";
import { Card } from "../ui/Card";
import { Empty } from "../ui/Empty";

/* NativeWind v4 nao implementa space-y nem divide-y: viram gap no container e
   borda explicita por linha. */
export default function OverviewTab({ expenses, incomes }) {
  const totalGastos = useMemo(() => totalOf(expenses), [expenses]);
  const byCat = useMemo(() => buildByCat(expenses), [expenses]);
  const recent = useMemo(() => buildRecentItems(expenses, incomes), [expenses, incomes]);

  return (
    <View className="gap-4 pb-8">
      <Card className="p-4">
        <View className="flex-row items-center gap-2 mb-3">
          <History size={15} color="#94a3b8" />
          <Text className="text-sm font-semibold text-slate-800">Adicionados recentemente</Text>
        </View>
        {recent.length === 0 ? (
          <Empty text="Nenhum item adicionado ainda neste mês." />
        ) : (
          <View>
            {recent.map((it, idx) => {
              const entrada = it.kind === "income";
              return (
                <View
                  key={`${it.kind}-${it.item.id}`}
                  className={"flex-row items-center gap-3 py-2.5 " + (idx > 0 ? "border-t border-slate-100" : "")}
                >
                  <View
                    className="h-7 w-7 rounded-lg items-center justify-center"
                    style={{ backgroundColor: (entrada ? "#2F9E44" : "#D6493B") + "1F" }}
                  >
                    {entrada ? (
                      <ArrowUpRight size={15} color="#2F9E44" />
                    ) : (
                      <ArrowDownRight size={15} color="#D6493B" />
                    )}
                  </View>
                  <View className="flex-1 min-w-0">
                    <Text className="text-sm text-slate-700" numberOfLines={1}>
                      {it.label}
                    </Text>
                    <Text className="text-xs text-slate-400">{formatRelativeTime(it.item.createdAt)}</Text>
                  </View>
                  <Text
                    className="text-sm font-semibold text-slate-800"
                    style={{ fontVariant: ["tabular-nums"] }}
                  >
                    {fmt(it.item.value)}
                  </Text>
                </View>
              );
            })}
          </View>
        )}
      </Card>

      <Card className="p-4">
        <Text className="text-sm font-semibold text-slate-800 mb-3">Para onde vai o dinheiro</Text>
        {byCat.length === 0 ? (
          <Empty text="Sem gastos ainda neste mês." />
        ) : (
          <View className="gap-3">
            {byCat.map((c) => {
              const pct = totalGastos > 0 ? Math.round((c.value / totalGastos) * 100) : 0;
              const Icon = iconFor(c.icon);
              return (
                <View key={c.name}>
                  <View className="flex-row items-center gap-2.5 mb-1.5">
                    <View
                      className="h-7 w-7 rounded-lg items-center justify-center"
                      style={{ backgroundColor: c.color + "1F" }}
                    >
                      <Icon size={15} color={c.color} />
                    </View>
                    <Text className="text-sm text-slate-700 flex-1" numberOfLines={1}>
                      {c.name}
                    </Text>
                    <Text
                      className="text-sm font-semibold text-slate-800"
                      style={{ fontVariant: ["tabular-nums"] }}
                    >
                      {fmt(c.value)}
                    </Text>
                    <Text className="text-xs text-slate-400 w-9 text-right">{pct}%</Text>
                  </View>
                  <View className="h-2 rounded-full bg-slate-100 overflow-hidden ml-9">
                    <View className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: c.color }} />
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </Card>
    </View>
  );
}
