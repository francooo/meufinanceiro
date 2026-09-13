import { Pressable, Text, View } from "react-native";
import { AlertTriangle, CreditCard, Pencil, Plus, Trash2 } from "lucide-react-native";
import { fmt, formatDateBR, monthLabel } from "../core/format";
import { Card } from "../ui/Card";
import { Empty } from "../ui/Empty";

const NUM = { fontVariant: ["tabular-nums"] };
const BRAND = "#16382c";

export default function CartoesTab({ cards, unregistered, month, canAdd, onAdd, onEdit, onDelete }) {
  const totalRestante = cards.reduce((s, c) => s + c.remaining, 0);

  return (
    <View className="gap-4 pb-8">
      <View className="flex-row items-center justify-between">
        <View className="flex-1 min-w-0 pr-3">
          <Text className="text-xs text-slate-500">Sobra somada em {monthLabel(month)}</Text>
          <Text
            className={"text-xl font-bold " + (totalRestante >= 0 ? "text-slate-800" : "text-rose-600")}
            style={NUM}
          >
            {fmt(totalRestante)}
          </Text>
        </View>
        <Pressable
          onPress={() => onAdd()}
          disabled={!canAdd}
          className="flex-row items-center gap-1.5 px-4 py-2.5 rounded-xl shrink-0"
          style={{ backgroundColor: BRAND, opacity: canAdd ? 1 : 0.4 }}
        >
          <Plus size={16} color="#ffffff" />
          <Text className="text-white text-sm font-medium">Novo cartão</Text>
        </Pressable>
      </View>

      {cards.length > 0 ? (
        <View className="flex-row items-start gap-2 rounded-2xl px-4 py-3 bg-amber-50 border border-amber-200">
          <AlertTriangle size={14} color="#b45309" />
          <Text className="text-xs text-amber-800 flex-1">
            Cada cartão mostra o saldo que você registrou menos os gastos lançados em{" "}
            <Text className="font-bold">{monthLabel(month)}</Text>. Gastos de outros meses não entram
            nesta conta.
          </Text>
        </View>
      ) : null}

      {cards.length === 0 ? (
        <Empty text="Nenhum cartão cadastrado. Registre o saldo disponível de um cartão para acompanhar quanto sobra." />
      ) : null}

      {cards.map((c) => {
        const skipped = c.scope === "before";
        return (
          <Card key={c.id} className="overflow-hidden">
            <View className="flex-row items-center gap-2.5 px-4 py-3 border-b border-slate-100">
              <View
                className="h-7 w-7 rounded-lg items-center justify-center"
                style={{ backgroundColor: "#64748B1F" }}
              >
                <CreditCard size={15} color="#64748B" />
              </View>
              <View className="flex-1 min-w-0">
                <Text className="text-sm font-semibold text-slate-700" numberOfLines={1}>
                  {c.paymentMethod}
                </Text>
                {c.note ? (
                  <Text className="text-xs text-slate-400 mt-0.5" numberOfLines={1}>
                    {c.note}
                  </Text>
                ) : null}
              </View>
              <Pressable onPress={() => onEdit(c)} className="h-9 w-9 rounded-lg items-center justify-center">
                <Pencil size={16} color="#94a3b8" />
              </Pressable>
              <Pressable onPress={() => onDelete(c)} className="h-9 w-9 rounded-lg items-center justify-center">
                <Trash2 size={16} color="#94a3b8" />
              </Pressable>
            </View>

            <View className="px-4 py-3 gap-1.5">
              <View className="flex-row items-center justify-between gap-3">
                <Text className="text-xs text-slate-500 flex-1">
                  Saldo registrado em {formatDateBR(c.referenceDate)}
                </Text>
                <Text className="text-xs text-slate-700" style={NUM}>
                  {fmt(c.balance)}
                </Text>
              </View>
              {!skipped ? (
                <View className="flex-row items-center justify-between gap-3">
                  <Text className="text-xs text-slate-500 flex-1">Gastos de {monthLabel(month)}</Text>
                  <Text className="text-xs text-rose-600" style={NUM}>
                    − {fmt(c.spent)}
                  </Text>
                </View>
              ) : null}
            </View>

            {skipped ? (
              <Text className="px-4 py-3 border-t border-slate-100 bg-slate-50 text-xs text-slate-500">
                Saldo registrado em {formatDateBR(c.referenceDate)}, depois de {monthLabel(month)} — os
                gastos deste mês já estavam descontados quando você anotou o saldo.
              </Text>
            ) : (
              <View className="px-4 py-3 border-t border-slate-100 bg-slate-50">
                <View className="flex-row items-end justify-between gap-3">
                  <Text className="text-xs font-medium text-slate-600 flex-1">
                    Sobra em {monthLabel(month)}
                  </Text>
                  <Text
                    className={"text-lg font-bold " + (c.remaining >= 0 ? "text-slate-800" : "text-rose-600")}
                    style={NUM}
                  >
                    {fmt(c.remaining)}
                  </Text>
                </View>
                {c.scope === "same" ? (
                  <Text className="text-[11px] text-amber-600 mt-1">
                    Parte dos gastos de {monthLabel(month)} pode ser anterior a{" "}
                    {formatDateBR(c.referenceDate)} e já estar descontada do saldo.
                  </Text>
                ) : null}
              </View>
            )}
          </Card>
        );
      })}

      {unregistered.length > 0 ? (
        <Card className="overflow-hidden">
          <View className="px-4 py-3 border-b border-slate-100">
            <Text className="text-sm font-semibold text-slate-700">Sem saldo cadastrado</Text>
            <Text className="text-xs text-slate-400 mt-0.5">
              Estas formas de pagamento tiveram gastos em {monthLabel(month)} e não entram na conta
              acima.
            </Text>
          </View>
          {unregistered.map((u, idx) => (
            <View
              key={u.name}
              className={"flex-row items-center gap-2.5 px-4 py-2.5 " + (idx > 0 ? "border-t border-slate-100" : "")}
            >
              <View
                className="h-7 w-7 rounded-lg items-center justify-center"
                style={{ backgroundColor: "#64748B1F" }}
              >
                <CreditCard size={15} color="#64748B" />
              </View>
              <Text className="text-sm text-slate-700 flex-1" numberOfLines={1}>
                {u.name}
              </Text>
              <Text className="text-sm text-slate-500" style={NUM}>
                {fmt(u.value)}
              </Text>
              <Pressable onPress={() => onAdd(u.name)} className="px-2.5 py-1.5 rounded-lg">
                <Text className="text-xs font-medium text-slate-500">Cadastrar</Text>
              </Pressable>
            </View>
          ))}
        </Card>
      ) : null}
    </View>
  );
}
