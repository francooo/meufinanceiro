/* Dividas — Serasa (dividas-serasa.jpg). */
import { useMemo, useState } from "react";
import { Text, View } from "react-native";
import { Check, ChevronDown, ChevronRight, CreditCard, Info, Pencil, Plus, Trash2 } from "lucide-react-native";
import { Touchable } from "../ui/Touchable";
import { fmt } from "../core/format";
import { serasaCatMeta } from "../core/catalog";
import { buildGroupedBy } from "../core/gastos";
import { topCreditors } from "../core/home";
import { iconFor, STROKE } from "../ui/icons";
import { ActionSheet, BigAmount, Button, EmptyState, IconBubble, Meter, PageHeader, Panel, SearchField, SectionTitle } from "../ui/kit";
import { Row, dueLine } from "../ui/Row";
import { SelectionHint } from "../ui/SelectionBar";
import { DraggableList } from "../ui/DraggableList";
import { NUM, useTheme } from "../ui/theme";

/* Mesma estrutura de Gastos — agrupado por categoria, com busca — mas com a
   tabela de metadados do Serasa e sem sub-agrupamento por forma de pagamento. */
export default function SerasaTab({ serasa, selecting, isSelected, onToggleSelect, onAdd, onEdit, onDelete, onTogglePaid, onReorder, onDragChange, highlightId }) {
  const { colors } = useTheme();
  const [search, setSearch] = useState("");
  const [collapsed, setCollapsed] = useState(() => new Set());
  const [menu, setMenu] = useState(null);
  const query = search.trim().toLowerCase();
  /* Arraste desligado durante busca e selecao: reordenar uma lista filtrada
     gravaria `order` numa ordem que nao e a real (mesma regra de Gastos). */
  const canDrag = !!onReorder && !query && !selecting;

  const grouped = useMemo(() => buildGroupedBy(serasa, serasaCatMeta), [serasa]);
  const filtered = useMemo(() => {
    if (!query) return grouped;
    return grouped
      .map((g) => {
        const items = g.name.toLowerCase().includes(query) ? g.items : g.items.filter((s) => (s.description || "").toLowerCase().includes(query));
        return { ...g, items, subtotal: items.reduce((s, i) => s + (Number(i.value) || 0), 0) };
      })
      .filter((g) => g.items.length > 0);
  }, [grouped, query]);
  const total = useMemo(() => grouped.reduce((s, g) => s + g.subtotal, 0), [grouped]);
  const visibleTotal = useMemo(() => filtered.reduce((s, g) => s + g.subtotal, 0), [filtered]);
  const creditors = useMemo(() => topCreditors(serasa), [serasa]);

  const toggle = (name) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });

  const rowFor = (s, idx, g) => (
    <View key={s.id} className={"bg-surface " + (idx > 0 ? "border-t border-line" : "")}>
      <Row
        item={s}
        title={s.description}
        icon={iconFor(g.icon)}
        color={g.color}
        lines={[dueLine(s), s.note]}
        showStatus
        highlight={highlightId === s.id}
        selected={isSelected ? isSelected(s.id) : false}
        onToggleSelect={selecting ? () => onToggleSelect(s.id) : undefined}
        onTogglePaid={() => onTogglePaid(s)}
        onMore={selecting ? undefined : () => setMenu(s)}
      />
    </View>
  );

  return (
    <View className="gap-3.5">
      <PageHeader title="Dívidas" subtitle="Visualize e organize seus compromissos" />

      {selecting ? (
        <SelectionHint text="Selecione as dívidas que deseja somar" />
      ) : (
        <Panel className="flex-row items-center gap-4">
          <IconBubble icon={CreditCard} tone="coral" size="lg" />
          <View className="flex-1 min-w-0">
            <View className="flex-row items-center gap-1.5">
              <Text className="font-display-regular text-[15px] text-ink">{query ? "Total encontrado" : "Total de dívidas"}</Text>
              <Info size={15} color={colors.gold} />
            </View>
            <BigAmount tone="coral">{fmt(query ? visibleTotal : total)}</BigAmount>
            <Text className="font-display-regular text-[14px] text-muted">
              {serasa.length} {serasa.length === 1 ? "registro" : "registros"}
            </Text>
          </View>
        </Panel>
      )}

      <Button label="Nova dívida" icon={Plus} size="lg" onPress={onAdd} />

      {serasa.length === 0 ? (
        <Panel>
          <EmptyState icon={CreditCard} title="Nenhuma dívida cadastrada" text="Registre seus compromissos para acompanhar o que falta quitar." />
        </Panel>
      ) : (
        <>
          <SearchField value={search} onChangeText={setSearch} placeholder="Buscar dívida..." />
          <Panel padded={false} className="overflow-hidden">
            <View className="px-4 pt-4">
              <SectionTitle>Dívidas por tipo</SectionTitle>
            </View>
            {filtered.length === 0 ? <Text className="font-brand text-[14px] text-muted text-center pb-6">Nenhuma dívida encontrada.</Text> : null}
            {filtered.map((g) => {
              const isCollapsed = collapsed.has(g.name);
              return (
                <View key={g.name} className="border-t border-line">
                  <Touchable variant="row" onPress={() => toggle(g.name)} accessibilityState={{ expanded: !isCollapsed }} className="flex-row items-center gap-3 px-3.5 py-3">
                    <IconBubble icon={iconFor(g.icon)} color={g.color} />
                    <Text className="font-display text-[17px] text-heading flex-1" numberOfLines={1}>
                      {g.name}
                    </Text>
                    <Text className="font-display text-[16px] text-coral" style={NUM}>
                      {fmt(g.subtotal)}
                    </Text>
                    {isCollapsed ? <ChevronRight size={18} color={colors.muted} strokeWidth={STROKE} /> : <ChevronDown size={18} color={colors.muted} strokeWidth={STROKE} />}
                  </Touchable>
                  {isCollapsed ? null : canDrag && g.items.length > 1 ? (
                    <DraggableList items={g.items} onReorder={onReorder} onDragChange={onDragChange} renderItem={(s, idx) => rowFor(s, idx, g)} />
                  ) : (
                    g.items.map((s, idx) => rowFor(s, idx, g))
                  )}
                </View>
              );
            })}
          </Panel>

          <Panel>
            <SectionTitle>Maiores credores</SectionTitle>
            {creditors.map((c, i) => (
              <View key={c.name} className={"flex-row items-center gap-3 py-3 " + (i > 0 ? "border-t border-line" : "")}>
                <View className="h-9 w-9 rounded-full bg-tint-gold items-center justify-center">
                  <Text className="font-display text-[15px] text-gold">{i + 1}</Text>
                </View>
                <View className="flex-1 min-w-0 gap-1.5">
                  <View className="flex-row items-baseline justify-between gap-2">
                    <Text className="font-brand text-[14px] text-ink flex-1" numberOfLines={1}>
                      {c.name}
                    </Text>
                    <Text className="font-display text-[15px] text-coral" style={NUM}>
                      {fmt(c.value)}
                    </Text>
                  </View>
                  <Meter value={c.value} max={creditors[0]?.value || 0} color={colors.coral} />
                </View>
              </View>
            ))}
          </Panel>
        </>
      )}

      <ActionSheet
        visible={!!menu}
        title={menu?.description}
        onClose={() => setMenu(null)}
        actions={
          menu
            ? [
                { label: menu.paidAt ? "Desmarcar quitação" : "Marcar como paga", icon: Check, onPress: () => onTogglePaid(menu) },
                { label: "Editar", icon: Pencil, onPress: () => onEdit(menu) },
                { label: "Excluir", icon: Trash2, danger: true, onPress: () => onDelete(menu) },
              ]
            : []
        }
      />
    </View>
  );
}
