/* Mais › Desejos / Mercado / Farmacia (listas-desejos.jpg, listas-mercado.jpg,
   listas-farmacia.jpg). Um componente so: o que muda sao os rotulos. */
import { memo, useMemo, useState } from "react";
import { Text, View } from "react-native";
import { Check, ChevronDown, ChevronRight, GripVertical, Heart, Info, MoreHorizontal as MoreIcon, Pencil, Pill, Plus, ShoppingBasket, ShoppingCart, Sparkles, Trash2 } from "lucide-react-native";
import { Touchable } from "../ui/Touchable";
import { fmt, formatDateBR, monthName } from "../core/format";
import { splitChecklist } from "../core/checklist";
import { ActionSheet, BigAmount, Button, Chip, EmptyState, IconBubble, IconButton, PageHeader, Panel, SectionTitle } from "../ui/kit";
import { SelectCheckbox, SelectionHint } from "../ui/SelectionBar";
import { DraggableList } from "../ui/DraggableList";
import { STROKE } from "../ui/icons";
import { NUM, useTheme } from "../ui/theme";

const KINDS = {
  wish: {
    title: "Desejos",
    subtitle: "Priorize seus próximos objetivos",
    total: "Total desejado",
    count: (n) => `${n} ${n === 1 ? "objetivo" : "objetivos"}`,
    add: "Novo desejo",
    section: "Prioridades",
    done: "Realizados",
    doneLabel: "Realizado",
    empty: "Nenhum desejo cadastrado.",
    icon: Heart,
    rowIcon: Sparkles,
  },
  mercado: {
    title: "Mercado",
    subtitle: "Sua lista de compras do mês",
    total: "Total estimado",
    count: (n) => `${n} ${n === 1 ? "item" : "itens"} na lista`,
    add: "Novo item",
    section: "Itens da lista",
    done: "Comprados",
    doneLabel: "Comprado",
    empty: "Nenhum item cadastrado.",
    icon: ShoppingCart,
    rowIcon: ShoppingBasket,
  },
  farmacia: {
    title: "Farmácia",
    subtitle: "Remédios e itens de cuidado",
    total: "Total estimado",
    count: (n) => `${n} ${n === 1 ? "item" : "itens"} na lista`,
    add: "Novo item",
    section: "Itens da lista",
    done: "Comprados",
    doneLabel: "Comprado",
    empty: "Nenhum item cadastrado.",
    icon: Pill,
    rowIcon: Pill,
  },
};

/* Selo do desejo: data desejada vira "Para novembro"; sem ela, a observacao ou "Sem data". */
const wishTag = (w) => {
  if (w.targetDate) {
    const sameYear = w.targetDate.slice(0, 4) === String(new Date().getFullYear());
    return `Para ${monthName(w.targetDate)}${sameYear ? "" : ` de ${w.targetDate.slice(0, 4)}`}`;
  }
  return w.note || "Sem data";
};

const ListRow = memo(function ListRow({ item, kind, rank, onToggleDone, onMore, selected, onToggleSelect }) {
  const { colors } = useTheme();
  const cfg = KINDS[kind];
  const done = !!item.doneAt;
  const isWish = kind === "wish";
  return (
    <View className={"flex-row items-center px-3.5 py-3 bg-surface " + (isWish ? "gap-2" : "gap-3")}>
      {onToggleSelect ? (
        <SelectCheckbox selected={selected} onToggle={onToggleSelect} />
      ) : isWish ? (
        !done ? <GripVertical size={18} color={colors.muted} strokeWidth={STROKE} /> : null
      ) : (
        /* Mercado/Farmacia: a caixinha e o "comprado". */
        <SelectCheckbox selected={done} onToggle={onToggleDone} label={done ? "Desmarcar comprado" : "Marcar como comprado"} />
      )}
      {isWish && !done && rank ? (
        <View className="h-7 w-7 rounded-full bg-tint-gold items-center justify-center">
          <Text className="font-display text-[14px] text-gold">{rank}</Text>
        </View>
      ) : null}
      <IconBubble icon={cfg.rowIcon} tone={done ? "neutral" : "green"} size={isWish ? "sm" : "md"} />
      <View className="flex-1 min-w-0 gap-1">
        <Text className={"font-display text-[15px] " + (done ? "text-muted line-through" : "text-heading")} numberOfLines={2}>
          {item.title}
          {!isWish && item.quantity ? <Text className="font-brand text-[13px] text-muted"> · {item.quantity}</Text> : null}
        </Text>
        {isWish && !done ? (
          <Chip tone={item.targetDate ? "green" : "neutral"}>{wishTag(item)}</Chip>
        ) : done ? (
          <Text className="font-brand text-[12px] text-muted">
            {cfg.doneLabel} em {formatDateBR(item.doneAt)}
          </Text>
        ) : item.note ? (
          <Text className="font-brand text-[12px] text-muted" numberOfLines={1}>
            {item.note}
          </Text>
        ) : null}
      </View>
      {item.value > 0 ? (
        <Text className={"font-display text-[15px] " + (done ? "text-muted line-through" : isWish ? "text-coral" : "text-heading")} style={NUM}>
          {fmt(item.value)}
        </Text>
      ) : null}
      {onMore ? <IconButton icon={MoreIcon} label="Mais ações" onPress={onMore} size={34} /> : null}
    </View>
  );
});

export default function ChecklistTab({ kind, items, selecting, isSelected, onToggleSelect, onAdd, onEdit, onDelete, onToggleDone, onClearDone, onReorder, onDragChange }) {
  const { colors } = useTheme();
  const cfg = KINDS[kind];
  const [showDone, setShowDone] = useState(kind !== "wish");
  const [menu, setMenu] = useState(null);
  const { ordered, pending, done, totalPending } = useMemo(() => splitChecklist(items), [items]);
  /* So os pendentes arrastam: os feitos ficam embaixo, estaticos. Desligado em
     modo selecao, como nas outras abas. */
  const canDrag = !!onReorder && !selecting && pending.length > 1;

  const renderRow = (it, idx, rank) => (
    <View key={it.id} className={idx > 0 ? "border-t border-line" : ""}>
      <ListRow
        item={it}
        kind={kind}
        rank={rank}
        onToggleDone={() => onToggleDone(it)}
        onMore={selecting ? undefined : () => setMenu(it)}
        selected={isSelected ? isSelected(it.id) : false}
        onToggleSelect={selecting ? () => onToggleSelect(it.id) : undefined}
      />
    </View>
  );

  return (
    <View className="gap-3.5">
      <PageHeader
        title={cfg.title}
        subtitle={cfg.subtitle}
        action={onClearDone ? <Button label="Limpar" icon={Trash2} variant="gold" size="sm" onPress={onClearDone} disabled={done.length === 0} /> : null}
      />

      {selecting ? (
        <SelectionHint text="Selecione os itens que deseja somar" />
      ) : (
        <Panel className="flex-row items-center gap-4">
          <IconBubble icon={cfg.icon} tone="coral" size="lg" />
          <View className="flex-1 min-w-0">
            <View className="flex-row items-center gap-1.5">
              <Text className="font-display-regular text-[15px] text-ink">{cfg.total}</Text>
              <Info size={15} color={colors.gold} />
            </View>
            {/* Só os pendentes: o total é o que ainda vai custar dinheiro. */}
            <BigAmount tone="coral">{fmt(totalPending)}</BigAmount>
            <Text className="font-display-regular text-[14px] text-muted">{cfg.count(pending.length)}</Text>
          </View>
        </Panel>
      )}

      <Button label={cfg.add} icon={Plus} size="lg" onPress={onAdd} />

      <Panel padded={false} className="overflow-hidden">
        {ordered.length === 0 ? (
          <EmptyState icon={cfg.icon} title={cfg.empty} text="Toque em adicionar para começar a lista." action={<Button label="Adicionar primeiro item" icon={Plus} variant="gold" onPress={onAdd} />} />
        ) : (
          <>
            <View className="px-4 pt-4">
              <SectionTitle>{cfg.section}</SectionTitle>
            </View>
            {pending.length > 0 ? (
              <View className="border-t border-line">
                {canDrag ? (
                  <DraggableList items={pending} onReorder={onReorder} onDragChange={onDragChange} renderItem={(it, idx) => renderRow(it, idx, idx + 1)} />
                ) : (
                  pending.map((it, idx) => renderRow(it, idx, idx + 1))
                )}
              </View>
            ) : null}
            {done.length > 0 ? (
              <View className="border-t border-line">
                <Touchable variant="row" onPress={() => setShowDone((v) => !v)} accessibilityState={{ expanded: showDone }} className="flex-row items-center gap-2 px-4 h-12">
                  {showDone ? <ChevronDown size={17} color={colors.ink} strokeWidth={STROKE} /> : <ChevronRight size={17} color={colors.ink} strokeWidth={STROKE} />}
                  <Text className="font-brand-medium text-[14px] text-ink">
                    {cfg.done} ({done.length})
                  </Text>
                </Touchable>
                {showDone ? done.map((it, idx) => renderRow(it, idx)) : null}
              </View>
            ) : null}
          </>
        )}
      </Panel>

      <ActionSheet
        visible={!!menu}
        title={menu?.title}
        onClose={() => setMenu(null)}
        actions={
          menu
            ? [
                { label: menu.doneAt ? `Desfazer ${cfg.doneLabel.toLowerCase()}` : `Marcar como ${cfg.doneLabel.toLowerCase()}`, icon: Check, onPress: () => onToggleDone(menu) },
                { label: "Editar", icon: Pencil, onPress: () => onEdit(menu) },
                { label: "Excluir", icon: Trash2, danger: true, onPress: () => onDelete(menu) },
              ]
            : []
        }
      />
    </View>
  );
}
