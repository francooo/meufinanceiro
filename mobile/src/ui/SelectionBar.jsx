import { Text, View } from "react-native";
import { Touchable } from "./Touchable";
import { ArrowDownRight, ArrowUpRight, Calculator, Check, X } from "lucide-react-native";
import { fmt } from "../core/format";
import { selectionLabel } from "../core/selection";
import { NUM, useTheme } from "./theme";
import { STROKE } from "./icons";

/* Caixinha de seleção nas linhas. Prop opcional: quem não passa onToggle não
   renderiza nada, então as abas fora do modo seleção ficam intactas. */
export function SelectCheckbox({ selected, onToggle, label = "Selecionar" }) {
  const { colors } = useTheme();
  return (
    <Touchable
      variant="icon"
      onPress={onToggle}
      hitSlop={{ left: 10, top: 6, bottom: 6 }}
      accessibilityRole="checkbox"
      accessibilityLabel={label}
      accessibilityState={{ checked: !!selected }}
      className="h-9 w-7 shrink-0 items-center justify-center"
    >
      <View
        className="h-[22px] w-[22px] rounded-[6px] border items-center justify-center"
        style={selected ? { backgroundColor: colors.forest2, borderColor: colors.forest2 } : { backgroundColor: colors.surface, borderColor: colors.line }}
      >
        {selected ? <Check size={14} color="#ffffff" strokeWidth={3} /> : null}
      </View>
    </Touchable>
  );
}

/* Botao flutuante da calculadora, logo acima da barra de abas. */
export function SelectionFab({ onPress, bottom }) {
  return (
    <View className="absolute right-4" style={{ bottom }}>
      <Touchable
        onDark
        onPress={onPress}
        accessibilityLabel="Somar itens"
        className="h-[56px] w-[56px] rounded-[18px] items-center justify-center bg-forest-2"
        style={{ elevation: 6, shadowColor: "#0a3827", shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 6 } }}
      >
        <Calculator size={25} color="#ffffff" strokeWidth={STROKE} />
      </Touchable>
    </View>
  );
}

/* Pilula "Somar itens" + dica no topo da lista enquanto o modo esta ligado. */
export function SelectionHint({ text = "Selecione os lançamentos que deseja somar" }) {
  const { colors } = useTheme();
  return (
    <View className="flex-row items-center gap-3 mb-3">
      <View className="flex-row items-center gap-1.5 rounded-full bg-forest-2 px-3 py-1.5">
        <Calculator size={14} color="#ffffff" strokeWidth={STROKE} />
        <Text className="font-brand-semibold text-[12px] text-white">Somar itens</Text>
      </View>
      <Text className="font-brand text-[12px] text-muted flex-1" numberOfLines={2}>
        {text}
      </Text>
    </View>
  );
}

/* Barra "N itens selecionados · Total somado" (somar-itens.jpg). */
export function SelectionBar({ stats, onClear, onClose, onLayout, bottom }) {
  const { count, inflow, outflow, net, mixed } = stats;
  const { colors } = useTheme();

  /* O caso comum — só saídas — fica idêntico a uma soma simples, sem sinal nem
     ruído. Só quando entra e sai se misturam o número vira saldo. */
  const cor = mixed ? (net >= 0 ? "text-positive" : "text-coral") : inflow > 0 ? "text-positive" : "text-heading";

  return (
    <View onLayout={onLayout} className="absolute left-3 right-3" style={{ bottom }}>
      <View
        className="rounded-[16px] bg-surface border border-line px-4 py-3"
        style={{ elevation: 12, shadowColor: "#10251b", shadowOpacity: 0.14, shadowRadius: 14, shadowOffset: { width: 0, height: 6 } }}
      >
        <View className="flex-row items-center gap-3">
          <View className="flex-1 min-w-0">
            <Text className="font-brand text-[12px] text-muted" numberOfLines={1}>
              {count === 0 ? "Marque itens para somar" : count === 1 ? "1 item selecionado" : `${count} itens selecionados`}
            </Text>
            <Text className="font-brand text-[11px] text-muted" numberOfLines={1}>
              {count === 0 ? " " : (mixed ? "Saldo somado · " : "Total somado · ") + selectionLabel(stats)}
            </Text>
            <Text className={"font-display text-[20px] leading-[25px] " + cor} style={NUM}>
              {mixed ? `${net >= 0 ? "+ " : "− "}${fmt(Math.abs(net))}` : fmt(inflow > 0 ? inflow : outflow)}
            </Text>
            {mixed ? (
              <View className="flex-row items-center gap-3">
                <View className="flex-row items-center gap-0.5">
                  <ArrowUpRight size={12} color={colors.positive} />
                  <Text className="font-brand text-[11px] text-muted" style={NUM}>
                    entra {fmt(inflow)}
                  </Text>
                </View>
                <View className="flex-row items-center gap-0.5">
                  <ArrowDownRight size={12} color={colors.coral} />
                  <Text className="font-brand text-[11px] text-muted" style={NUM}>
                    sai {fmt(outflow)}
                  </Text>
                </View>
              </View>
            ) : null}
          </View>

          <Touchable
            onPress={onClear}
            disabled={count === 0}
            hitSlop={{ top: 6, bottom: 6 }}
            className="shrink-0 h-10 px-4 rounded-[11px] border border-champagne bg-tint-gold items-center justify-center disabled:opacity-40"
          >
            <Text className="font-brand-semibold text-[13px] text-gold">Limpar</Text>
          </Touchable>
          <Touchable
            variant="icon"
            onPress={onClose}
            hitSlop={{ top: 6, bottom: 6, right: 6 }}
            accessibilityLabel="Fechar calculadora"
            className="shrink-0 h-10 w-10 rounded-[11px] border border-line items-center justify-center"
          >
            <X size={17} color={colors.muted} strokeWidth={STROKE} />
          </Touchable>
        </View>
      </View>
    </View>
  );
}
