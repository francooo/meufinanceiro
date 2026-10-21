/* Lancamentos › Ganhos (ganhos.jpg). */
import { useMemo, useState } from "react";
import { Text, View } from "react-native";
import { Briefcase, Filter, HandCoins, Pencil, Plus, Trash2, UtensilsCrossed, Wallet } from "lucide-react-native";
import { fmt, formatDayMonth } from "../core/format";
import { totalOf } from "../core/group";
import { ActionSheet, BigAmount, Button, EmptyState, FilterChip, IconBubble, OptionSheet, PageHeader, Panel, SearchField, SectionTitle } from "../ui/kit";
import { Row } from "../ui/Row";
import { SelectionHint } from "../ui/SelectionBar";
import { DraggableList } from "../ui/DraggableList";
import { NUM, useTheme } from "../ui/theme";

/* Ganho pode ser reordenado por arraste: ordenar localmente por `order` (nulos
   por ultimo) e depois por nome, para o arraste refletir na hora — o servidor
   ja devolve nessa ordem, mas em memoria so o `order` muda. */
const byOrderThenSource = (a, b) => {
  if (a.order != null && b.order != null) return a.order - b.order;
  if (a.order != null) return -1;
  if (b.order != null) return 1;
  return (a.source || "").localeCompare(b.source || "");
};

const originOf = (i) => (i.cltPjIncome ? "cltPj" : i.voucherIncome ? "va" : "other");
const ORIGIN_ICON = { cltPj: Briefcase, va: UtensilsCrossed, other: HandCoins };
const ORIGINS = [
  { value: "all", label: "Origem: Todas" },
  { value: "cltPj", label: "Origem: CLT/PJ" },
  { value: "va", label: "Origem: Vale-alimentação" },
  { value: "other", label: "Origem: Outros" },
];

function MiniStat({ icon, label, value }) {
  return (
    <View className="flex-row items-center gap-2.5 flex-1 min-w-0">
      <IconBubble icon={icon} size="sm" />
      <View className="min-w-0 flex-1">
        <Text className="font-brand text-[11px] text-muted">{label}</Text>
        <Text className="font-display text-[16px] text-heading" style={NUM} numberOfLines={1} adjustsFontSizeToFit>
          {fmt(value)}
        </Text>
      </View>
    </View>
  );
}

export default function GanhosTab({ incomes, selecting, isSelected, onToggleSelect, onAdd, onEdit, onDelete, onReorder, onDragChange }) {
  const { colors } = useTheme();
  const [search, setSearch] = useState("");
  const [origin, setOrigin] = useState("all");
  const [picker, setPicker] = useState(false);
  const [menu, setMenu] = useState(null);
  const query = search.trim().toLowerCase();
  const filtering = query !== "" || origin !== "all";

  const sorted = useMemo(() => [...incomes].sort(byOrderThenSource), [incomes]);
  const filtered = useMemo(
    () =>
      sorted.filter(
        (i) => (!query || (i.source || "").toLowerCase().includes(query) || (i.note || "").toLowerCase().includes(query)) && (origin === "all" || originOf(i) === origin)
      ),
    [sorted, query, origin]
  );
  const total = useMemo(() => totalOf(incomes), [incomes]);
  const cltPj = useMemo(() => totalOf(incomes.filter((i) => i.cltPjIncome)), [incomes]);
  const va = useMemo(() => totalOf(incomes.filter((i) => i.voucherIncome)), [incomes]);
  /* Arraste desligado durante busca, filtro e selecao (mesma regra das outras abas). */
  const canDrag = !!onReorder && !filtering && !selecting && incomes.length > 1;

  const rowFor = (i, idx) => {
    const o = originOf(i);
    return (
      <View key={i.id} className={idx > 0 ? "border-t border-line" : ""}>
        <Row
          item={i}
          title={i.source}
          icon={ORIGIN_ICON[o]}
          tone="green"
          lines={[
            [i.cltPjIncome && "CLT/PJ", i.voucherIncome && "VA", o === "other" && "Outros", i.receiptDate && formatDayMonth(i.receiptDate)].filter(Boolean).join(" · "),
            i.note,
          ]}
          accent={colors.positive}
          prefix="+ "
          selected={isSelected ? isSelected(i.id) : false}
          onToggleSelect={selecting ? () => onToggleSelect(i.id) : undefined}
          onMore={selecting ? undefined : () => setMenu(i)}
        />
      </View>
    );
  };

  return (
    <View className="gap-3.5">
      <PageHeader title="Ganhos" subtitle="Acompanhe suas entradas do mês" action={<Button label="Novo ganho" icon={Plus} onPress={onAdd} />} />

      {selecting ? (
        <SelectionHint />
      ) : (
        <Panel>
          <Text className="font-display-regular text-[15px] text-ink">{filtering ? "Total encontrado" : "Total de ganhos"}</Text>
          <BigAmount tone="green">{fmt(filtering ? totalOf(filtered) : total)}</BigAmount>
          <View className="flex-row gap-3 mt-3 pt-3 border-t border-line">
            <MiniStat icon={Briefcase} label="CLT/PJ" value={cltPj} />
            <MiniStat icon={UtensilsCrossed} label="Vale-alimentação" value={va} />
          </View>
        </Panel>
      )}

      {incomes.length > 0 ? (
        <View className="flex-row items-center gap-2">
          <View className="flex-1 min-w-0">
            <SearchField value={search} onChangeText={setSearch} placeholder="Buscar ganho..." />
          </View>
          <FilterChip icon={Filter} label={origin === "all" ? "Origem" : ORIGINS.find((x) => x.value === origin).label.replace("Origem: ", "")} active={origin !== "all"} onPress={() => setPicker(true)} />
        </View>
      ) : null}

      {incomes.length === 0 ? (
        <Panel>
          <EmptyState icon={Wallet} title="Nenhum ganho neste mês" text="Registre suas entradas para acompanhar a sobra do mês." action={<Button label="Novo ganho" icon={Plus} onPress={onAdd} />} />
        </Panel>
      ) : (
        <Panel padded={false} className="overflow-hidden">
          <View className="px-4 pt-4">
            <SectionTitle>Lançamentos do mês</SectionTitle>
          </View>
          {filtered.length === 0 ? (
            <Text className="font-brand text-[14px] text-muted text-center pb-6">Nenhum ganho encontrado.</Text>
          ) : (
            <View className="border-t border-line">
              {canDrag ? (
                <DraggableList items={filtered} onReorder={onReorder} onDragChange={onDragChange} renderItem={(i, idx) => rowFor(i, idx)} />
              ) : (
                filtered.map((i, idx) => rowFor(i, idx))
              )}
            </View>
          )}
        </Panel>
      )}

      <ActionSheet
        visible={!!menu}
        title={menu?.source}
        onClose={() => setMenu(null)}
        actions={
          menu
            ? [
                { label: "Editar", icon: Pencil, onPress: () => onEdit(menu) },
                { label: "Excluir", icon: Trash2, danger: true, onPress: () => onDelete(menu) },
              ]
            : []
        }
      />
      <OptionSheet visible={picker} title="Origem do dinheiro" options={ORIGINS} value={origin} onSelect={setOrigin} onClose={() => setPicker(false)} />
    </View>
  );
}
