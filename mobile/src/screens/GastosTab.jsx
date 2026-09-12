import { useMemo, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { Check, Plus, Search, X } from "lucide-react-native";
import { fmt } from "../core/format";
import { CARTOES_CATEGORY } from "../core/catalog";
import { applyGastosFilters, buildGastosGrouped, groupByPaymentMethod } from "../core/gastos";
import { iconFor } from "../ui/icons";
import { Card } from "../ui/Card";
import { Empty } from "../ui/Empty";
import { Row } from "../ui/Row";

const NUM = { fontVariant: ["tabular-nums"] };
const BRAND = "#16382c";

export default function GastosTab({ expenses, total, onAdd, onEdit, onDelete, onTogglePaid }) {
  const [search, setSearch] = useState("");
  const [hidePaid, setHidePaid] = useState(false);
  const [valueSort, setValueSort] = useState("none");

  const grouped = useMemo(() => buildGastosGrouped(expenses), [expenses]);
  const { grouped: filtered, visibleTotal, otherFiltersActive } = useMemo(
    () => applyGastosFilters(grouped, { search, hidePaid, valueSort }),
    [grouped, search, hidePaid, valueSort]
  );

  const filtersActive = otherFiltersActive || hidePaid;
  const sortLabel = { none: "Ordem padrão", desc: "Maior valor", asc: "Menor valor" }[valueSort];
  const cycleSort = () =>
    setValueSort((v) => (v === "none" ? "desc" : v === "desc" ? "asc" : "none"));

  return (
    <View className="gap-4 pb-8">
      <View className="flex-row items-center justify-between">
        <View>
          <Text className="text-xs text-slate-500">
            {otherFiltersActive ? "Total encontrado" : "Total de gastos"}
          </Text>
          <Text className="text-xl font-bold text-slate-800" style={NUM}>
            {fmt(otherFiltersActive ? visibleTotal : total)}
          </Text>
        </View>
        <Pressable
          onPress={onAdd}
          className="flex-row items-center gap-1.5 px-4 py-2.5 rounded-xl"
          style={{ backgroundColor: BRAND }}
        >
          <Plus size={16} color="#ffffff" />
          <Text className="text-white text-sm font-medium">Novo gasto</Text>
        </Pressable>
      </View>

      <View className="relative justify-center">
        <View className="absolute left-3.5 z-10">
          <Search size={15} color="#94a3b8" />
        </View>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Buscar gasto por título…"
          placeholderTextColor="#94a3b8"
          className="rounded-xl border border-slate-200 bg-white pl-10 pr-9 py-3 text-sm text-slate-800"
        />
        {search ? (
          <Pressable onPress={() => setSearch("")} className="absolute right-2.5 h-6 w-6 items-center justify-center">
            <X size={14} color="#94a3b8" />
          </Pressable>
        ) : null}
      </View>

      <View className="flex-row flex-wrap items-center gap-2">
        <Pressable
          onPress={() => setHidePaid((v) => !v)}
          className={
            "flex-row items-center gap-1.5 px-3 py-2 rounded-xl border " +
            (hidePaid ? "border-transparent" : "bg-white border-slate-200")
          }
          style={hidePaid ? { backgroundColor: BRAND } : undefined}
        >
          <Check size={13} color={hidePaid ? "#ffffff" : "#334155"} />
          <Text className={"text-xs font-medium " + (hidePaid ? "text-white" : "text-slate-700")}>
            {hidePaid ? "Mostrar pagos" : "Ocultar pagos"}
          </Text>
        </Pressable>

        <Pressable
          onPress={cycleSort}
          className={
            "px-3 py-2 rounded-xl border " +
            (valueSort !== "none" ? "border-transparent" : "bg-white border-slate-200")
          }
          style={valueSort !== "none" ? { backgroundColor: BRAND } : undefined}
        >
          <Text className={"text-xs font-medium " + (valueSort !== "none" ? "text-white" : "text-slate-700")}>
            {sortLabel}
          </Text>
        </Pressable>

        {filtersActive ? (
          <Pressable
            onPress={() => {
              setSearch("");
              setHidePaid(false);
              setValueSort("none");
            }}
            className="flex-row items-center gap-1 px-2 py-1"
          >
            <X size={12} color="#64748b" />
            <Text className="text-xs font-medium text-slate-500">Limpar filtros</Text>
          </Pressable>
        ) : null}
      </View>

      {filtered.length === 0 ? (
        <Empty text={filtersActive ? "Nenhum gasto encontrado." : "Nenhum gasto cadastrado."} />
      ) : null}

      {filtered.map((g) => {
        const Icon = iconFor(g.icon);
        return (
          <Card key={g.name} className="overflow-hidden">
            <View className="flex-row items-center gap-2.5 px-4 py-3 border-b border-slate-100">
              <View
                className="h-7 w-7 rounded-lg items-center justify-center"
                style={{ backgroundColor: g.color + "1F" }}
              >
                <Icon size={15} color={g.color} />
              </View>
              <Text className="text-sm font-semibold text-slate-700 flex-1" numberOfLines={1}>
                {g.name}
              </Text>
              <Text className="text-sm font-semibold text-slate-800" style={NUM}>
                {fmt(g.subtotal)}
              </Text>
            </View>

            {/* Só "Cartões / Financeiro" sub-agrupa por forma de pagamento, igual à web */}
            {g.name === CARTOES_CATEGORY
              ? groupByPaymentMethod(g.items, valueSort).map((pm) => (
                  <View key={pm.name}>
                    <View className="flex-row items-center gap-2 px-4 py-2 bg-slate-50">
                      <Text className="text-xs font-medium text-slate-500 flex-1" numberOfLines={1}>
                        {pm.name}
                      </Text>
                      <Text className="text-xs font-semibold text-slate-600" style={NUM}>
                        {fmt(pm.subtotal)}
                      </Text>
                    </View>
                    {pm.items.map((e, idx) => (
                      <View key={e.id} className={idx > 0 ? "border-t border-slate-100" : ""}>
                        <Row
                          item={e}
                          onEdit={() => onEdit(e)}
                          onDelete={() => onDelete(e)}
                          onTogglePaid={() => onTogglePaid(e)}
                        />
                      </View>
                    ))}
                  </View>
                ))
              : g.items.map((e, idx) => (
                  <View key={e.id} className={idx > 0 ? "border-t border-slate-100" : ""}>
                    <Row
                      item={e}
                      onEdit={() => onEdit(e)}
                      onDelete={() => onDelete(e)}
                      onTogglePaid={() => onTogglePaid(e)}
                    />
                  </View>
                ))}
          </Card>
        );
      })}
    </View>
  );
}
