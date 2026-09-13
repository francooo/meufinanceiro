import { useMemo, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { Plus, Search, X } from "lucide-react-native";
import { fmt } from "../core/format";
import { totalOf } from "../core/group";
import { Card } from "../ui/Card";
import { Empty } from "../ui/Empty";
import { Row } from "../ui/Row";

const NUM = { fontVariant: ["tabular-nums"] };

/* Ganhos e a aba mais simples da web: lista plana, sem agrupamento nem
   reordenacao. O Row e o mesmo de Gastos — ganho nao tem "pago", entao
   onTogglePaid fica de fora e o botao simplesmente nao aparece. */
export default function GanhosTab({ incomes, onAdd, onEdit, onDelete }) {
  const [search, setSearch] = useState("");
  const query = search.trim().toLowerCase();

  const filtered = useMemo(
    () => (query ? incomes.filter((i) => (i.source || "").toLowerCase().includes(query)) : incomes),
    [incomes, query]
  );
  const visibleTotal = useMemo(() => totalOf(filtered), [filtered]);

  return (
    <View className="gap-4 pb-8">
      <View className="flex-row items-center justify-between">
        <View>
          <Text className="text-xs text-slate-500">
            {query ? "Total encontrado" : "Total de ganhos"}
          </Text>
          <Text className="text-xl font-bold text-emerald-600" style={NUM}>
            {fmt(visibleTotal)}
          </Text>
        </View>
        <Pressable
          onPress={onAdd}
          className="flex-row items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600"
        >
          <Plus size={16} color="#ffffff" />
          <Text className="text-white text-sm font-medium">Novo ganho</Text>
        </Pressable>
      </View>

      <View className="relative justify-center">
        <View className="absolute left-3.5 z-10">
          <Search size={15} color="#94a3b8" />
        </View>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Buscar ganho por título…"
          placeholderTextColor="#94a3b8"
          className="rounded-xl border border-slate-200 bg-white pl-10 pr-9 py-3 text-sm text-slate-800"
        />
        {search ? (
          <Pressable
            onPress={() => setSearch("")}
            className="absolute right-2.5 h-6 w-6 items-center justify-center"
          >
            <X size={14} color="#94a3b8" />
          </Pressable>
        ) : null}
      </View>

      {filtered.length === 0 ? (
        <Empty text={query ? "Nenhum ganho encontrado." : "Nenhuma fonte de renda cadastrada."} />
      ) : (
        <Card className="overflow-hidden">
          {filtered.map((i, idx) => (
            <View key={i.id} className={idx > 0 ? "border-t border-slate-100" : ""}>
              <Row
                /* O Row le `description`; ganho guarda o nome em `source`. */
                item={{ ...i, description: i.source, paidWithVoucher: i.voucherIncome, paidWithCltPj: i.cltPjIncome }}
                accent="#059669"
                onEdit={() => onEdit(i)}
                onDelete={() => onDelete(i)}
              />
            </View>
          ))}
        </Card>
      )}
    </View>
  );
}
