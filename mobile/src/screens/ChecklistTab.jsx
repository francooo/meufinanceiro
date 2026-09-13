import { useMemo } from "react";
import { Text, View } from "react-native";
import { Touchable } from "../ui/Touchable";
import { Check, Pencil, Plus, Trash2 } from "lucide-react-native";
import { fmt, formatDateBR } from "../core/format";
import { splitChecklist } from "../core/checklist";
import { Card } from "../ui/Card";
import { SelectCheckbox } from "../ui/SelectionBar";
import { Empty } from "../ui/Empty";

const NUM = { fontVariant: ["tabular-nums"] };
const BRAND = "#16382c";

function ChecklistRow({ item, doneLabel, onEdit, onDelete, onToggleDone, selected, onToggleSelect }) {
  const done = !!item.doneAt;
  return (
    <View className="flex-row items-start gap-3 px-4 py-3">
      {onToggleSelect ? <SelectCheckbox selected={selected} onToggle={onToggleSelect} /> : null}
      <View className="flex-1 min-w-0">
        <Text
          className={"text-sm " + (done ? "text-slate-400 line-through" : "text-slate-800")}
          numberOfLines={2}
        >
          {item.title}
        </Text>
        {item.note ? (
          <Text className="text-xs text-slate-400 mt-0.5" numberOfLines={1}>
            {item.note}
          </Text>
        ) : null}
        {done ? (
          <Text className="text-xs text-emerald-600 mt-0.5">
            {doneLabel} em {formatDateBR(item.doneAt)}
          </Text>
        ) : null}
        {item.value > 0 ? (
          <Text
            className={"text-sm font-semibold mt-1.5 " + (done ? "text-slate-400" : "text-slate-800")}
            style={NUM}
          >
            {fmt(item.value)}
          </Text>
        ) : null}
      </View>

      <View className="flex-row items-center gap-1 shrink-0">
        <Touchable
          onPress={onToggleDone}
          className="h-9 w-9 rounded-lg items-center justify-center"
          style={{ backgroundColor: done ? "#d1fae5" : "transparent" }}
        >
          <Check size={16} color={done ? "#059669" : "#94a3b8"} />
        </Touchable>
        <Touchable variant="icon" onPress={onEdit} hitSlop={{ top: 8, bottom: 8 }} className="h-9 w-9 rounded-lg items-center justify-center">
          <Pencil size={16} color="#94a3b8" />
        </Touchable>
        <Touchable variant="icon" onPress={onDelete} hitSlop={{ top: 8, bottom: 8, right: 8 }} className="h-9 w-9 rounded-lg items-center justify-center">
          <Trash2 size={16} color="#94a3b8" />
        </Touchable>
      </View>
    </View>
  );
}

/* Um componente para Desejos, Mercado e Farmácia — a web também reusa o mesmo
   para as duas listas de compra. O que muda são os rótulos. */
export default function ChecklistTab({
  items,
  selecting,
  isSelected,
  onToggleSelect,
  totalLabel,
  addLabel,
  emptyText,
  doneLabel,
  onAdd,
  onEdit,
  onDelete,
  onToggleDone,
  onClearDone,
}) {
  const { ordered, done, totalPending } = useMemo(() => splitChecklist(items), [items]);

  return (
    <View className="gap-4 pb-8">
      <View className="flex-row items-center justify-between gap-2">
        <View className="flex-1 min-w-0">
          <Text className="text-xs text-slate-500">{totalLabel}</Text>
          {/* Só os pendentes: o total é o que ainda vai custar dinheiro. */}
          <Text className="text-xl font-bold text-slate-800" style={NUM}>
            {fmt(totalPending)}
          </Text>
        </View>
        {onClearDone ? (
          <Touchable
            onPress={onClearDone}
            disabled={done.length === 0}
            className="flex-row items-center gap-1.5 px-3 py-2.5 rounded-xl border border-slate-200 shrink-0 disabled:opacity-40"
          >
            <Trash2 size={15} color="#64748b" />
            <Text className="text-sm font-medium text-slate-600">Limpar</Text>
          </Touchable>
        ) : null}
        <Touchable
          onDark
          onPress={onAdd}
          className="flex-row items-center gap-1.5 px-4 py-2.5 rounded-xl shrink-0"
          style={{ backgroundColor: BRAND }}
        >
          <Plus size={16} color="#ffffff" />
          <Text className="text-white text-sm font-medium">{addLabel}</Text>
        </Touchable>
      </View>

      {ordered.length === 0 ? (
        <Empty text={emptyText} />
      ) : (
        <Card className="overflow-hidden">
          {ordered.map((it, idx) => (
            <View key={it.id} className={idx > 0 ? "border-t border-slate-100" : ""}>
              <ChecklistRow
                item={it}
                doneLabel={doneLabel}
                onEdit={() => onEdit(it)}
                onDelete={() => onDelete(it)}
                onToggleDone={() => onToggleDone(it)}
                selected={isSelected ? isSelected(it.id) : false}
                onToggleSelect={selecting ? () => onToggleSelect(it.id) : undefined}
              />
            </View>
          ))}
        </Card>
      )}
    </View>
  );
}
