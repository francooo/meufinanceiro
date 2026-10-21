import { memo } from "react";
import { Text, View } from "react-native";
import { MoreHorizontal, Repeat } from "lucide-react-native";
import { fmt, formatDayMonth } from "../core/format";
import { Touchable } from "./Touchable";
import { IconBubble, IconButton, StatusPill } from "./kit";
import { SelectCheckbox } from "./SelectionBar";
import { NUM, useTheme } from "./theme";

/* Linha de lancamento do kit (gastos.jpg): bolha, titulo serifado, "Categoria ·
   Origem", "Vence 03 out", valor, selo Pago/Pendente e "•••".

   O "•••" so AVISA a tela (onMore): a folha de acoes e UMA por tela. Uma folha
   por linha montaria um Modal por gasto — setembro (89 gastos) foi exatamente
   o caso que travava o app quando cada linha carregava nos nativos proprios.
   Tocar no selo marca/desmarca pago na hora. */
export const Row = memo(function Row({
  item,
  title,
  icon,
  color,
  tone = "coral",
  lines = [],
  accent,
  showStatus,
  onTogglePaid,
  onMore,
  selected,
  onToggleSelect,
  highlight,
  prefix = "",
}) {
  const { colors } = useTheme();
  const paid = !!item.paidAt;
  const amountColor = accent || (showStatus && !paid ? colors.coral : colors.heading);

  return (
    <View className={"flex-row items-center gap-3 px-3.5 py-3 " + (highlight ? "bg-tint-green" : "")}>
      {onToggleSelect ? <SelectCheckbox selected={selected} onToggle={onToggleSelect} /> : null}
      <IconBubble icon={icon} color={color} tone={tone} />
      <View className="flex-1 min-w-0">
        <View className="flex-row items-center gap-1.5">
          <Text
            className={"font-display text-[15px] leading-[20px] " + (paid && highlight ? "text-muted" : "text-heading")}
            numberOfLines={2}
            style={{ flexShrink: 1 }}
          >
            {title}
          </Text>
          {item.recurrent ? <Repeat size={12} color={colors.muted} /> : null}
        </View>
        {lines.filter(Boolean).map((l, i) => (
          <Text key={i} className="font-brand text-[12px] text-muted mt-0.5" numberOfLines={1} style={NUM}>
            {l}
          </Text>
        ))}
      </View>
      <View className="items-end gap-1.5 shrink-0">
        <Text
          className="font-display text-[15px]"
          style={{ color: amountColor, textDecorationLine: paid && highlight ? "line-through" : "none", ...NUM }}
        >
          {prefix}
          {fmt(item.value)}
        </Text>
        {showStatus ? (
          onTogglePaid ? (
            <Touchable variant="icon" onPress={onTogglePaid} hitSlop={6} accessibilityLabel={paid ? "Desmarcar pago" : "Marcar como pago"}>
              <StatusPill paid={paid} />
            </Touchable>
          ) : (
            <StatusPill paid={paid} />
          )
        ) : null}
      </View>
      {onMore ? <IconButton icon={MoreHorizontal} onPress={onMore} label="Mais ações" size={34} /> : null}
    </View>
  );
});

/* "Vence 03 out" / "Pago em 02 out" + "3/10". */
export const dueLine = (it) =>
  [
    it.paidAt ? `Pago em ${formatDayMonth(it.paidAt)}` : it.dueDate ? `Vence ${formatDayMonth(it.dueDate)}` : null,
    it.installmentTotal ? `${it.installmentNumber}/${it.installmentTotal}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

/* "Moradia · CLT/PJ" — de onde saiu o dinheiro do gasto. */
export const originOf = (it) => [it.paidWithCltPj && "CLT/PJ", it.paidWithVoucher && "VA"].filter(Boolean).join(" + ");
