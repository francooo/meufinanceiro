import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowDownRight, ArrowUpRight, Calculator, Check, X } from "lucide-react-native";
import { fmt } from "../core/format";
import { selectionLabel } from "../core/selection";

const NUM = { fontVariant: ["tabular-nums"] };
const BRAND = "#16382c";

/* Caixinha de seleção nas linhas. Prop opcional: quem não passa onToggle não
   renderiza nada, então as abas fora do modo seleção ficam intactas. */
export function SelectCheckbox({ selected, onToggle }) {
  return (
    <Pressable onPress={onToggle} className="h-9 w-9 shrink-0 items-center justify-center rounded-lg">
      <View
        className="h-5 w-5 rounded-md border items-center justify-center"
        style={
          selected
            ? { backgroundColor: BRAND, borderColor: "transparent" }
            : { backgroundColor: "#ffffff", borderColor: "#cbd5e1" }
        }
      >
        <Check size={13} color={selected ? "#ffffff" : "transparent"} strokeWidth={3} />
      </View>
    </Pressable>
  );
}

export function SelectionFab({ onPress }) {
  const insets = useSafeAreaInsets();
  return (
    /* Em celular com navegacao por gestos, bottom fixo deixaria o botao sob a
       barra do sistema. O inset e 0 onde nao existe. */
    <View className="absolute right-5" style={{ bottom: 24 + insets.bottom }}>
      <Pressable
        onPress={onPress}
        className="h-16 w-16 rounded-2xl items-center justify-center"
        style={{ backgroundColor: BRAND, elevation: 6, shadowColor: "#000", shadowOpacity: 0.25, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } }}
      >
        <Calculator size={26} color="#ffffff" />
      </Pressable>
    </View>
  );
}

export function SelectionBar({ stats, onClear, onClose }) {
  const { count, inflow, outflow, net, mixed } = stats;
  const insets = useSafeAreaInsets();

  /* O caso comum — só saídas — fica idêntico a uma soma simples, sem sinal nem
     ruído. Só quando entra e sai se misturam o número vira saldo. */
  const cor = mixed
    ? net >= 0
      ? "text-emerald-600"
      : "text-rose-600"
    : inflow > 0
    ? "text-emerald-600"
    : "text-slate-800";

  return (
    <View
      className="absolute left-0 right-0 bottom-0 bg-white border-t border-slate-200 px-4 pt-3"
      style={{
        paddingBottom: 12 + insets.bottom,
        elevation: 12,
        shadowColor: "#000",
        shadowOpacity: 0.1,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: -4 },
      }}
    >
      <View className="flex-row items-center gap-3">
        <View className="flex-1 min-w-0">
          <Text className="text-[11px] text-slate-500" numberOfLines={1}>
            {count === 0 ? "Marque itens para somar" : selectionLabel(stats)}
          </Text>
          <View className="flex-row items-baseline gap-1.5">
            <Text className="text-[11px] font-medium text-slate-500">{mixed ? "Saldo" : "Total"}</Text>
            <Text className={"text-lg font-bold " + cor} style={NUM}>
              {mixed
                ? `${net >= 0 ? "+ " : "− "}${fmt(Math.abs(net))}`
                : fmt(inflow > 0 ? inflow : outflow)}
            </Text>
          </View>
          {mixed ? (
            <View className="flex-row items-center gap-3">
              <View className="flex-row items-center gap-0.5">
                <ArrowUpRight size={11} color="#059669" />
                <Text className="text-[11px] text-slate-500" style={NUM}>
                  entra {fmt(inflow)}
                </Text>
              </View>
              <View className="flex-row items-center gap-0.5">
                <ArrowDownRight size={11} color="#f43f5e" />
                <Text className="text-[11px] text-slate-500" style={NUM}>
                  sai {fmt(outflow)}
                </Text>
              </View>
            </View>
          ) : null}
        </View>

        <Pressable
          onPress={onClear}
          disabled={count === 0}
          className="shrink-0 px-2.5 py-2 rounded-lg"
          style={{ opacity: count === 0 ? 0.4 : 1 }}
        >
          <Text className="text-xs font-medium text-slate-500">Limpar</Text>
        </Pressable>
        <Pressable
          onPress={onClose}
          className="shrink-0 h-9 w-9 rounded-xl bg-slate-100 items-center justify-center"
        >
          <X size={16} color="#64748b" />
        </Pressable>
      </View>
    </View>
  );
}
