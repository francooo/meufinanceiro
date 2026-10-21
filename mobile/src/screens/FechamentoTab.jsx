/* Cartoes › Fechamentos (cartoes-fechamentos.jpg). */
import { useMemo, useState } from "react";
import { Text, View } from "react-native";
import { CreditCard, Info, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react-native";
import { fmt, monthLabel, monthName } from "../core/format";
import { totalOf } from "../core/group";
import { ActionSheet, BigAmount, Button, EmptyState, IconBubble, IconButton, InfoNote, PageHeader, Panel, SectionTitle } from "../ui/kit";
import { DraggableList } from "../ui/DraggableList";
import { NUM } from "../ui/theme";

/* Fechamento de cartao do mes: lista de {nome, valor} presa ao mes acessado.
   A ordem e o campo `order` (reordenavel por arraste), com fallback alfabetico
   — igual ao que o backend ja devolve em getCardClosings. */
export default function FechamentoTab({ items, month, onAdd, onEdit, onDelete, onReorder, onDragChange }) {
  const [menu, setMenu] = useState(null);
  const total = useMemo(() => totalOf(items), [items]);
  /* Ordena localmente para o arraste refletir na hora: ao soltar, so o campo
     `order` muda, entao e a ordenacao que reposiciona a linha. */
  const sorted = useMemo(
    () =>
      [...items].sort((a, b) => {
        if (a.order != null && b.order != null) return a.order - b.order;
        if (a.order != null) return -1;
        if (b.order != null) return 1;
        return (a.cardName || "").localeCompare(b.cardName || "");
      }),
    [items]
  );
  const canDrag = !!onReorder && sorted.length > 1;

  const rowFor = (it, idx) => (
    <View key={it.id} className={"flex-row items-center gap-3 px-3.5 py-3 bg-surface " + (idx > 0 ? "border-t border-line" : "")}>
      <IconBubble icon={CreditCard} />
      <View className="flex-1 min-w-0">
        <Text className="font-display text-[15px] text-heading" numberOfLines={1}>
          {it.cardName}
        </Text>
        <Text className="font-brand text-[12px] text-muted">Fechamento de {monthName(month)}</Text>
      </View>
      <Text className="font-display text-[16px] text-heading" style={NUM}>
        {fmt(it.value)}
      </Text>
      <IconButton icon={MoreHorizontal} label="Mais ações" onPress={() => setMenu(it)} size={34} />
    </View>
  );

  return (
    <View className="gap-3.5">
      <PageHeader title="Fechamentos de cartão" subtitle="Planeje os valores a pagar em cada cartão" />

      <Panel className="flex-row items-center gap-4">
        <IconBubble icon={CreditCard} size="lg" />
        <View className="flex-1 min-w-0">
          <Text className="font-brand text-[14px] text-positive">Total a pagar em {monthLabel(month)}</Text>
          <BigAmount>{fmt(total)}</BigAmount>
        </View>
      </Panel>

      <Button label="Novo fechamento" icon={Plus} size="lg" onPress={onAdd} />

      <Panel padded={false} className="overflow-hidden">
        <View className="px-4 pt-4">
          <SectionTitle>Fechamentos do mês</SectionTitle>
        </View>
        {sorted.length === 0 ? (
          <EmptyState icon={CreditCard} title="Nenhum fechamento neste mês" text="Registre o valor total a pagar de cada cartão." />
        ) : (
          <View className="border-t border-line">
            {canDrag ? (
              <DraggableList items={sorted} onReorder={onReorder} onDragChange={onDragChange} renderItem={(it, idx) => rowFor(it, idx)} />
            ) : (
              sorted.map((it, idx) => rowFor(it, idx))
            )}
          </View>
        )}
        <View className="px-4 py-3.5 border-t border-line">
          <InfoNote icon={Info}>Registre aqui o valor total a pagar de cada cartão neste mês.</InfoNote>
        </View>
      </Panel>

      <ActionSheet
        visible={!!menu}
        title={menu?.cardName}
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
    </View>
  );
}
