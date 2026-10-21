/* Lancamentos › Gastos (gastos.jpg, gastos-estado-vazio.jpg, feedback-gasto-pago.jpg). */
import { useMemo, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { ArrowDown, ArrowUp, ArrowUpDown, CalendarDays, Check, ChevronDown, ChevronRight, CreditCard, Pencil, Plus, ReceiptText, Tag, Trash2, X } from "lucide-react-native";
import { Touchable } from "../ui/Touchable";
import { fmt } from "../core/format";
import { CARTOES_CATEGORY, PAYMENT_METHOD_FALLBACK, allPaymentMethods } from "../core/catalog";
import { DateField } from "../ui/fields";
import { brToIso, isDateInputValid } from "../core/dateinput";
import { applyGastosFilters, buildGastosGrouped, groupByPaymentMethod } from "../core/gastos";
import { iconFor, STROKE } from "../ui/icons";
import { ActionSheet, BigAmount, Button, EmptyState, FilterChip, IconBubble, Meter, OptionSheet, PageHeader, Panel, SearchField, ToggleChip } from "../ui/kit";
import { Row, dueLine, originOf } from "../ui/Row";
import { SelectionHint } from "../ui/SelectionBar";
import { DraggableList } from "../ui/DraggableList";
import { NUM, useTheme } from "../ui/theme";

const SORTS = [
  { value: "none", label: "Ordem padrão" },
  { value: "desc", label: "Maior valor" },
  { value: "asc", label: "Menor valor" },
];

/* Mini-barras do resumo: as maiores categorias, em proporcao. */
function MiniBars({ groups }) {
  const { colors } = useTheme();
  const top = groups.slice(0, 6);
  const max = Math.max(1, ...top.map((g) => g.subtotal));
  const tones = [colors.positive, colors.champagne, colors.forest2, colors.mint, colors.tintGreen, colors.line];
  return (
    <View className="flex-row items-end gap-1.5 h-14" accessibilityElementsHidden>
      {[...top].reverse().map((g, i) => (
        <View key={g.name} className="w-2.5 rounded-full" style={{ height: Math.max(8, (g.subtotal / max) * 56), backgroundColor: tones[top.length - 1 - i] }} />
      ))}
    </View>
  );
}

export default function GastosTab({
  expenses,
  total,
  extraPaymentMethods = [],
  selecting,
  isSelected,
  onToggleSelect,
  onAdd,
  onEdit,
  onDelete,
  onTogglePaid,
  onMove,
  onReorder,
  onDragChange,
  highlightId,
}) {
  const { colors } = useTheme();
  const [search, setSearch] = useState("");
  const [hidePaid, setHidePaid] = useState(false);
  const [valueSort, setValueSort] = useState("none");
  const [category, setCategory] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [dueFrom, setDueFrom] = useState("");
  const [dueTo, setDueTo] = useState("");
  const [picker, setPicker] = useState(null); // "forma" | "categoria" | "vencimento" | "ordenar"
  const [menu, setMenu] = useState(null); // { item, list, idx }
  const [collapsed, setCollapsed] = useState(() => new Set());

  const grouped = useMemo(() => buildGastosGrouped(expenses), [expenses]);
  const pendentes = useMemo(() => expenses.filter((e) => !e.paidAt).length, [expenses]);
  const datesOk = isDateInputValid(dueFrom) && isDateInputValid(dueTo);

  const { grouped: filtered, visibleTotal, otherFiltersActive } = useMemo(
    () =>
      applyGastosFilters(grouped, {
        search,
        hidePaid,
        valueSort,
        category,
        paymentMethod,
        /* Só filtra com data completa: parcial viraria null e filtraria tudo. */
        dueFrom: brToIso(dueFrom) || "",
        dueTo: brToIso(dueTo) || "",
      }),
    [grouped, search, hidePaid, valueSort, category, paymentMethod, dueFrom, dueTo]
  );

  const filtersActive = otherFiltersActive || hidePaid;
  /* Reordenar so sem filtro e fora da selecao: mover numa lista filtrada
     gravaria `order` numa ordem que nao e a real (a web faz igual). */
  const canReorder = !filtersActive && !selecting && !!onMove;
  const canDrag = canReorder && !!onReorder;

  const clearFilters = () => {
    setSearch("");
    setHidePaid(false);
    setValueSort("none");
    setCategory("");
    setPaymentMethod("");
    setDueFrom("");
    setDueTo("");
  };

  /* `listItems` e o grupo visivel (categoria ou, em Cartoes, a forma de
     pagamento) — a ordem dele e o que vira `order`, para setas e arraste. */
  const renderList = (listItems, meta) => {
    const rowFor = (e, idx) => (
      <View key={e.id} className={idx > 0 ? "border-t border-line" : ""}>
        <Row
          item={e}
          title={e.description}
          icon={iconFor(meta.icon)}
          color={meta.color}
          lines={[[e.category, originOf(e)].filter(Boolean).join(" · "), dueLine(e)]}
          showStatus
          highlight={highlightId === e.id}
          selected={isSelected ? isSelected(e.id) : false}
          onToggleSelect={selecting ? () => onToggleSelect(e.id) : undefined}
          onTogglePaid={() => onTogglePaid(e)}
          onMore={selecting ? undefined : () => setMenu({ item: e, list: listItems, idx })}
        />
      </View>
    );
    if (!canDrag) return listItems.map((e, idx) => rowFor(e, idx));
    return <DraggableList items={listItems} onReorder={onReorder} onDragChange={onDragChange} renderItem={(e, idx) => rowFor(e, idx)} />;
  };

  const toggleGroup = (name) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });

  const methodOptions = useMemo(
    () => [{ value: "", label: "Todas as formas" }, ...[...allPaymentMethods(extraPaymentMethods), PAYMENT_METHOD_FALLBACK].map((p) => ({ value: p, label: p }))],
    [extraPaymentMethods]
  );
  /* Opcoes vindas de `grouped`, nao de CATS: traz as categorias personalizadas
     e nao oferece categoria sem gasto no mes. */
  const categoryOptions = useMemo(() => [{ value: "", label: "Todas as categorias" }, ...grouped.map((g) => ({ value: g.name, label: g.name }))], [grouped]);

  const m = menu;
  const menuActions = m
    ? [
        { label: m.item.paidAt ? "Desmarcar pago" : "Marcar como pago", icon: Check, onPress: () => onTogglePaid(m.item) },
        { label: "Editar", icon: Pencil, onPress: () => onEdit(m.item) },
        canReorder && { label: "Mover para cima", icon: ArrowUp, disabled: m.idx === 0, onPress: () => onMove(m.list, m.item.id, "up") },
        canReorder && { label: "Mover para baixo", icon: ArrowDown, disabled: m.idx === m.list.length - 1, onPress: () => onMove(m.list, m.item.id, "down") },
        { label: "Excluir", icon: Trash2, danger: true, onPress: () => onDelete(m.item) },
      ]
    : [];

  return (
    <View className="gap-3.5">
      <PageHeader title="Gastos" subtitle="Acompanhe e organize suas despesas do mês" />

      {selecting ? (
        <SelectionHint />
      ) : (
        <Panel className="flex-row items-center gap-4">
          <View className="flex-1 min-w-0">
            <Text className="font-display-regular text-[15px] text-ink">{otherFiltersActive ? "Total encontrado" : "Total de gastos"}</Text>
            <BigAmount>{fmt(otherFiltersActive ? visibleTotal : total)}</BigAmount>
            <Text className="font-display-regular text-[14px] text-muted" style={NUM}>
              {expenses.length} {expenses.length === 1 ? "lançamento" : "lançamentos"} · {pendentes} {pendentes === 1 ? "pendente" : "pendentes"}
            </Text>
          </View>
          {grouped.length > 0 ? <MiniBars groups={grouped} /> : null}
        </Panel>
      )}

      <Button label="Novo gasto" icon={Plus} size="lg" onPress={onAdd} />

      {expenses.length > 0 ? (
        <>
          <SearchField value={search} onChangeText={setSearch} placeholder="Buscar gasto..." />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 8 }}>
            <ToggleChip label="Ocultar pagos" value={hidePaid} onChange={setHidePaid} />
            <FilterChip icon={CreditCard} label={paymentMethod || "Forma"} active={!!paymentMethod} onPress={() => setPicker("forma")} />
            <FilterChip icon={CalendarDays} label="Vencimento" active={!!(dueFrom || dueTo)} onPress={() => setPicker("vencimento")} />
            <FilterChip icon={Tag} label={category || "Categoria"} active={!!category} onPress={() => setPicker("categoria")} />
            <FilterChip icon={ArrowUpDown} label={valueSort === "none" ? "Ordenar" : SORTS.find((s) => s.value === valueSort).label} active={valueSort !== "none"} onPress={() => setPicker("ordenar")} />
          </ScrollView>
          {filtersActive ? (
            <Touchable variant="icon" onPress={clearFilters} className="flex-row items-center gap-1 self-start py-1">
              <X size={14} color={colors.muted} strokeWidth={STROKE} />
              <Text className="font-brand-medium text-[13px] text-muted">Limpar filtros</Text>
            </Touchable>
          ) : null}
        </>
      ) : null}

      {expenses.length === 0 ? (
        <Panel>
          <EmptyState
            icon={ReceiptText}
            title="Nenhum gasto neste mês"
            text="Adicione seu primeiro lançamento para acompanhar suas despesas."
            action={<Button label="Novo gasto" icon={Plus} onPress={onAdd} />}
          />
        </Panel>
      ) : filtered.length === 0 ? (
        <Panel>
          <Text className="font-brand text-[14px] text-muted text-center py-6">Nenhum gasto encontrado.</Text>
        </Panel>
      ) : null}

      {filtered.map((g) => {
        const isCollapsed = collapsed.has(g.name);
        return (
          <Panel key={g.name} padded={false} className="overflow-hidden">
            <Touchable variant="row" onPress={() => toggleGroup(g.name)} accessibilityState={{ expanded: !isCollapsed }} className="flex-row items-center gap-3 px-3.5 pt-3.5 pb-3">
              <IconBubble icon={iconFor(g.icon)} color={g.color} />
              <View className="flex-1 min-w-0">
                <Text className="font-display text-[17px] text-heading" numberOfLines={1}>
                  {g.name}
                </Text>
                <View className="mt-1.5 w-24">
                  <Meter value={g.subtotal} max={total} color={g.color} height={5} />
                </View>
              </View>
              <Text className="font-display text-[16px] text-heading" style={NUM}>
                {fmt(g.subtotal)}
              </Text>
              {isCollapsed ? <ChevronRight size={18} color={colors.muted} strokeWidth={STROKE} /> : <ChevronDown size={18} color={colors.muted} strokeWidth={STROKE} />}
            </Touchable>

            {isCollapsed ? null : g.name === CARTOES_CATEGORY ? (
              /* Só "Cartões / Financeiro" sub-agrupa por forma de pagamento, igual à web */
              groupByPaymentMethod(g.items, valueSort).map((pm) => (
                <View key={pm.name}>
                  <View className="flex-row items-center gap-2 mx-3 px-3 py-2 rounded-[10px] bg-surface-2">
                    <CreditCard size={14} color={colors.muted} strokeWidth={STROKE} />
                    <Text className="font-brand-medium text-[12px] text-ink flex-1" numberOfLines={1}>
                      {pm.name} <Text className="text-muted">· subtotal {fmt(pm.subtotal)}</Text>
                    </Text>
                  </View>
                  {renderList(pm.items, g)}
                </View>
              ))
            ) : (
              <View className="border-t border-line">{renderList(g.items, g)}</View>
            )}
          </Panel>
        );
      })}

      <ActionSheet visible={!!menu} title={menu?.item.description} actions={menuActions} onClose={() => setMenu(null)} />

      <OptionSheet visible={picker === "forma"} title="Forma de pagamento" options={methodOptions} value={paymentMethod} onSelect={setPaymentMethod} onClose={() => setPicker(null)} />
      <OptionSheet visible={picker === "categoria"} title="Categoria" options={categoryOptions} value={category} onSelect={setCategory} onClose={() => setPicker(null)} />
      <OptionSheet visible={picker === "ordenar"} title="Ordenar" options={SORTS} value={valueSort} onSelect={setValueSort} onClose={() => setPicker(null)} />
      <OptionSheet visible={picker === "vencimento"} title="Vencimento" onClose={() => setPicker(null)}>
        <View className="flex-row gap-2">
          <View className="flex-1">
            <Text className="font-brand-semibold text-[13px] text-ink mb-1.5">De</Text>
            <DateField value={dueFrom} onChangeText={setDueFrom} invalid={!isDateInputValid(dueFrom)} />
          </View>
          <View className="flex-1">
            <Text className="font-brand-semibold text-[13px] text-ink mb-1.5">Até</Text>
            <DateField value={dueTo} onChangeText={setDueTo} invalid={!isDateInputValid(dueTo)} />
          </View>
        </View>
        {!datesOk ? <Text className="font-brand text-[12px] text-coral">Data inválida.</Text> : null}
        <Button label="Aplicar" onPress={() => setPicker(null)} />
      </OptionSheet>
    </View>
  );
}
