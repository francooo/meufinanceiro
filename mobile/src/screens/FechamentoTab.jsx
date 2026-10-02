import { useMemo } from "react";
import { Text, View } from "react-native";
import { CreditCard, Pencil, Plus, Trash2 } from "lucide-react-native";
import { Touchable } from "../ui/Touchable";
import { fmt } from "../core/format";
import { totalOf } from "../core/group";
import { Card } from "../ui/Card";
import { Empty } from "../ui/Empty";
import { DraggableList } from "../ui/DraggableList";

const NUM = { fontVariant: ["tabular-nums"] };
const BRAND = "#16382c";

/* Fechamento de cartao do mes: lista de {nome, valor} presa ao mes acessado.
   A ordem e o campo `order` (reordenavel por arraste), com fallback alfabetico
   — igual ao que o backend ja devolve em getCardClosings. */
export default function FechamentoTab({ items, onAdd, onEdit, onDelete, onReorder, onDragChange }) {
  const total = useMemo(() => totalOf(items), [items]);
  /* Ordena localmente para o arraste refletir na hora: ao soltar, so o campo
     `order` muda, entao e a ordenacao que reposiciona a linha. */
  const sorted = useMemo(
    () =>
      [...items].sort((a, b) => {
        if (a.order != null && b.order != null) return a.order - b.order;
        if (a.order != null) return -1;
        if (b.order != null) return 1;
        return (a.cardName || "").localeCompare(b.cardName || "");
      }),
    [items]
  );
  const canDrag = !!onReorder && sorted.length > 1;

  const rowFor = (it, idx) => (
    <View
      key={it.id}
      className={"flex-row items-center gap-3 px-4 py-3 bg-white " + (idx > 0 ? "border-t border-slate-100" : "")}
    >
      <View
        className="h-7 w-7 rounded-lg items-center justify-center"
        style={{ backgroundColor: "#D6493B1F" }}
      >
        <CreditCard size={15} color="#D6493B" />
      </View>
      <Text className="text-sm text-slate-800 flex-1" numberOfLines={1}>
        {it.cardName}
      </Text>
      <Text className="text-sm font-semibold text-slate-800" style={NUM}>
        {fmt(it.value)}
      </Text>
      <View className="flex-row items-center gap-1 shrink-0">
        <Touchable
          variant="icon"
          onPress={() => onEdit(it)}
          hitSlop={{ top: 8, bottom: 8 }}
          className="h-9 w-9 rounded-lg items-center justify-center"
        >
          <Pencil size={16} color="#94a3b8" />
        </Touchable>
        <Touchable
          variant="icon"
          onPress={() => onDelete(it)}
          hitSlop={{ top: 8, bottom: 8, right: 8 }}
          className="h-9 w-9 rounded-lg items-center justify-center"
        >
          <Trash2 size={16} color="#94a3b8" />
        </Touchable>
      </View>
    </View>
  );

  return (
    <View className="gap-4 pb-8">
      <View className="flex-row items-center justify-between">
        <View>
          <Text className="text-xs text-slate-500">Total do mês</Text>
          <Text className="text-xl font-bold text-slate-800" style={NUM}>
            {fmt(total)}
          </Text>
        </View>
        <Touchable
          onDark
          onPress={onAdd}
          className="flex-row items-center gap-1.5 px-4 py-2.5 rounded-xl"
          style={{ backgroundColor: BRAND }}
        >
          <Plus size={16} color="#ffffff" />
          <Text className="text-white text-sm font-medium">Novo fechamento</Text>
        </Touchable>
      </View>

      {sorted.length === 0 ? (
        <Empty text="Nenhum fechamento de cartão neste mês." />
      ) : (
        <Card className="overflow-hidden">
          {canDrag
            ? <DraggableList
                items={sorted}
                onReorder={onReorder}
                onDragChange={onDragChange}
                renderItem={(it, idx) => rowFor(it, idx)}
              />
            : sorted.map((it, idx) => rowFor(it, idx))}
        </Card>
      )}
    </View>
  );
}
