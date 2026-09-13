import { Pressable, Text, View } from "react-native";
import { Check, ChevronDown, ChevronUp, Pencil, Repeat, Trash2 } from "lucide-react-native";
import { fmt, formatDateBR } from "../core/format";
import { SelectCheckbox } from "./SelectionBar";

const NUM = { fontVariant: ["tabular-nums"] };

function Chip({ children, bg, color }) {
  return (
    <View className="rounded px-1.5 py-0.5" style={{ backgroundColor: bg }}>
      <Text className="text-[10px] font-semibold" style={{ color, ...NUM }}>
        {children}
      </Text>
    </View>
  );
}

/* Equivalente do Row da web (meu-caixa.jsx:2281). Sem hover, focus-ring nem
   transition — nada disso existe em RN; o feedback de toque vem do Pressable. */
export function Row({ item, onEdit, onDelete, onTogglePaid, onMoveUp, onMoveDown, accent, selected, onToggleSelect }) {
  const isPaid = !!item.paidAt;
  const muted = !item.value;

  return (
    <View className="flex-row items-start gap-3 px-4 py-3">
      {onToggleSelect ? <SelectCheckbox selected={selected} onToggle={onToggleSelect} /> : null}
      {/* Coluna de reordenar: so aparece quando os handlers vem. A web esconde
          as setas enquanto ha filtro ativo — mover numa lista filtrada
          reescreveria `order` com base numa ordem que nao e a real. */}
      {onMoveUp || onMoveDown ? (
        <View className="items-center shrink-0 pt-0.5">
          <Pressable
            onPress={onMoveUp}
            disabled={!onMoveUp}
            className="h-7 w-7 items-center justify-center rounded"
            style={{ opacity: onMoveUp ? 1 : 0.25 }}
          >
            <ChevronUp size={14} color="#94a3b8" />
          </Pressable>
          <Pressable
            onPress={onMoveDown}
            disabled={!onMoveDown}
            className="h-7 w-7 items-center justify-center rounded"
            style={{ opacity: onMoveDown ? 1 : 0.25 }}
          >
            <ChevronDown size={14} color="#94a3b8" />
          </Pressable>
        </View>
      ) : null}
      <View className="flex-1 min-w-0">
        <View className="flex-row flex-wrap items-center gap-x-1.5 gap-y-1">
          <Text
            className={"text-sm " + (muted ? "text-slate-400" : "text-slate-800")}
            numberOfLines={2}
            style={{ flexShrink: 1 }}
          >
            {item.description}
          </Text>
          {item.recurrent ? <Repeat size={12} color="#94a3b8" /> : null}
          {item.installmentTotal ? (
            <Chip bg="#f1f5f9" color="#64748b">
              {item.installmentNumber}/{item.installmentTotal}
            </Chip>
          ) : null}
          {item.paidWithVoucher ? (
            <Chip bg="#fef3c7" color="#b45309">
              VA
            </Chip>
          ) : null}
          {item.paidWithCltPj ? (
            <Chip bg="#e0e7ff" color="#4338ca">
              CLT/PJ
            </Chip>
          ) : null}
        </View>

        {item.note ? (
          <Text className="text-xs text-slate-400 mt-0.5" numberOfLines={1}>
            {item.note}
          </Text>
        ) : null}
        {isPaid ? (
          <Text className="text-xs text-emerald-600 mt-0.5">Pago em {formatDateBR(item.paidAt)}</Text>
        ) : null}

        <View className="flex-row items-center gap-2 mt-1.5">
          <Text
            className="text-sm font-semibold"
            style={{ color: muted ? "#94a3b8" : accent || "#1e293b", ...NUM }}
          >
            {fmt(item.value)}
          </Text>
          {item.dueDate ? (
            <Chip bg="#f1f5f9" color="#64748b">
              {formatDateBR(item.dueDate)}
            </Chip>
          ) : null}
        </View>
      </View>

      <View className="flex-row items-center gap-1 shrink-0">
        {onTogglePaid ? (
          <Pressable
            onPress={onTogglePaid}
            className="h-9 w-9 rounded-lg items-center justify-center"
            style={{ backgroundColor: isPaid ? "#d1fae5" : "transparent" }}
          >
            <Check size={16} color={isPaid ? "#059669" : "#94a3b8"} />
          </Pressable>
        ) : null}
        <Pressable onPress={onEdit} className="h-9 w-9 rounded-lg items-center justify-center">
          <Pencil size={16} color="#94a3b8" />
        </Pressable>
        <Pressable onPress={onDelete} className="h-9 w-9 rounded-lg items-center justify-center">
          <Trash2 size={16} color="#94a3b8" />
        </Pressable>
      </View>
    </View>
  );
}
