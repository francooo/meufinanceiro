import { useMemo, useState } from "react";
import { Text, TextInput, View } from "react-native";
import { Touchable } from "../ui/Touchable";
import { Plus, Search, X } from "lucide-react-native";
import { fmt } from "../core/format";
import { serasaCatMeta } from "../core/catalog";
import { buildGroupedBy } from "../core/gastos";
import { iconFor } from "../ui/icons";
import { Card } from "../ui/Card";
import { Empty } from "../ui/Empty";
import { Row } from "../ui/Row";

const NUM = { fontVariant: ["tabular-nums"] };

/* Mesma estrutura de Gastos — agrupado por categoria, com busca — mas com a
   tabela de metadados do Serasa e sem sub-agrupamento por forma de pagamento,
   que e exclusivo de "Cartoes / Financeiro". */
export default function SerasaTab({ serasa, selecting, isSelected, onToggleSelect, onAdd, onEdit, onDelete, onTogglePaid }) {
  const [search, setSearch] = useState("");
  const query = search.trim().toLowerCase();

  const grouped = useMemo(() => buildGroupedBy(serasa, serasaCatMeta), [serasa]);

  const filtered = useMemo(() => {
    if (!query) return grouped;
    return grouped
      .map((g) => {
        const items = g.items.filter((s) => (s.description || "").toLowerCase().includes(query));
        return { ...g, items, subtotal: items.reduce((s, i) => s + (Number(i.value) || 0), 0) };
      })
      .filter((g) => g.items.length > 0);
  }, [grouped, query]);

  const visibleTotal = useMemo(() => filtered.reduce((s, g) => s + g.subtotal, 0), [filtered]);
  const total = useMemo(() => grouped.reduce((s, g) => s + g.subtotal, 0), [grouped]);

  return (
    <View className="gap-4 pb-8">
      <View className="flex-row items-center justify-between">
        <View>
          <Text className="text-xs text-slate-500">
            {query ? "Total encontrado" : "Total de dívidas"}
          </Text>
          <Text className="text-xl font-bold text-slate-800" style={NUM}>
            {fmt(query ? visibleTotal : total)}
          </Text>
        </View>
        <Touchable
          onDark
          onPress={onAdd}
          className="flex-row items-center gap-1.5 px-4 py-2.5 rounded-xl"
          style={{ backgroundColor: "#16382c" }}
        >
          <Plus size={16} color="#ffffff" />
          <Text className="text-white text-sm font-medium">Nova dívida</Text>
        </Touchable>
      </View>

      <View className="relative justify-center">
        {/* pointerEvents: sem isto o icone engole o toque na esquerda do campo */}
        <View pointerEvents="none" className="absolute left-3.5 z-10">
          <Search size={15} color="#94a3b8" />
        </View>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Buscar dívida por descrição…"
          placeholderTextColor="#94a3b8"
          className="rounded-xl border border-slate-200 bg-white pl-10 pr-12 py-3 text-sm text-slate-800"
        />
        {search ? (
          <Touchable
            onPress={() => setSearch("")}
            variant="icon"
            className="absolute right-1 h-11 w-11 items-center justify-center"
          >
            <X size={14} color="#94a3b8" />
          </Touchable>
        ) : null}
      </View>

      {filtered.length === 0 ? (
        <Empty text={query ? "Nenhuma dívida encontrada." : "Nenhuma dívida cadastrada."} />
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
            {g.items.map((s, idx) => (
              <View key={s.id} className={idx > 0 ? "border-t border-slate-100" : ""}>
                <Row
                  item={s}
                  selected={isSelected ? isSelected(s.id) : false}
                  onToggleSelect={selecting ? () => onToggleSelect(s.id) : undefined}
                  onEdit={() => onEdit(s)}
                  onDelete={() => onDelete(s)}
                  onTogglePaid={() => onTogglePaid(s)}
                />
              </View>
            ))}
          </Card>
        );
      })}
    </View>
  );
}
