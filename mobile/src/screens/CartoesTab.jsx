/* Cartoes › Saldos (cartoes-saldos.jpg). */
import { useState } from "react";
import { Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { CreditCard, Info, MoreHorizontal, Pencil, Plus, RefreshCw, Trash2, Wallet } from "lucide-react-native";
import { fmt, formatDateBR, formatDayMonth, monthLabel } from "../core/format";
import { ActionSheet, BigAmount, Button, EmptyState, IconBubble, IconButton, PageHeader, Panel, SectionTitle } from "../ui/kit";
import { NUM, useTheme } from "../ui/theme";

const CARD_STYLES = [
  ["#0c654a", "#082f26"],
  ["#303d3a", "#141b19"],
];

/* Cartao "fisico" do kit: nome, final e o chip dourado. */
function BankCard({ name, lastDigits, styleIndex }) {
  return (
    <LinearGradient colors={CARD_STYLES[styleIndex % CARD_STYLES.length]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 17, padding: 18, minHeight: 128, overflow: "hidden" }}>
      <View pointerEvents="none" style={{ position: "absolute", right: -40, top: 18, width: 170, height: 170, borderRadius: 85, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" }} />
      <LinearGradient colors={["#d9ca9a", "#a89b72"]} style={{ position: "absolute", right: 18, top: 18, width: 34, height: 26, borderRadius: 6 }} />
      <Text className="font-display text-[20px] text-white pr-14" numberOfLines={1}>
        {name}
      </Text>
      <Text className="font-display mt-5 text-white" style={{ fontSize: lastDigits ? 18 : 14, letterSpacing: lastDigits ? 2.5 : 0, opacity: lastDigits ? 1 : 0.5, ...NUM }}>
        {lastDigits ? `•••• ${lastDigits}` : "Final não informado"}
      </Text>
      <View className="absolute right-5 bottom-4">
        <CreditCard size={18} color="rgba(255,255,255,0.8)" />
      </View>
    </LinearGradient>
  );
}

function CardStat({ label, value, sub, tone }) {
  const color = tone === "coral" ? "text-coral" : tone === "green" ? "text-positive" : "text-heading";
  return (
    <View className="flex-1 min-w-0">
      <Text className="font-brand text-[11px] text-muted" numberOfLines={1}>
        {label}
      </Text>
      <Text className={"font-display text-[16px] mt-0.5 " + color} style={NUM} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      {sub ? <Text className="font-brand text-[10px] text-muted mt-0.5">{sub}</Text> : null}
    </View>
  );
}

export default function CartoesTab({ cards, unregistered, month, canAdd, onAdd, onEdit, onUpdateBalance, onDelete }) {
  const { colors } = useTheme();
  const [menu, setMenu] = useState(null);
  const totalRestante = cards.reduce((s, c) => s + c.remaining, 0);

  return (
    <View className="gap-3.5">
      <PageHeader title="Cartões" subtitle="Acompanhe saldos e gastos por cartão" action={<Button label="Novo cartão" icon={Plus} onPress={() => onAdd()} disabled={!canAdd} />} />

      {cards.length > 0 ? (
        <Panel>
          <View className="flex-row items-center gap-1.5">
            <Text className="font-display-regular text-[15px] text-ink">Sobra somada em {monthLabel(month)}</Text>
            <Info size={15} color={colors.muted} />
          </View>
          <BigAmount tone={totalRestante < 0 ? "coral" : "ink"}>{fmt(totalRestante)}</BigAmount>
          <Text className="font-brand text-[12px] text-muted leading-[17px] mt-1">Sobra = saldo registrado − gastos do mês. Compras parceladas contam pelo valor total.</Text>
        </Panel>
      ) : (
        <Panel>
          <EmptyState
            icon={Wallet}
            title="Nenhum cartão cadastrado"
            text="Registre o saldo disponível de um cartão para acompanhar quanto sobra no mês."
            action={<Button label="Novo cartão" icon={Plus} onPress={() => onAdd()} disabled={!canAdd} />}
          />
        </Panel>
      )}

      {cards.map((c, idx) => {
        const skipped = c.scope === "before";
        return (
          <Panel key={c.id} className="gap-4">
            <BankCard name={c.paymentMethod} lastDigits={c.lastDigits} styleIndex={idx} />
            <View className="flex-row gap-3">
              <CardStat label="Saldo registrado" value={fmt(c.balance)} sub={`Registrado em ${formatDayMonth(c.referenceDate)}`} />
              <View className="w-px bg-line" />
              <CardStat label="Gastos do mês" value={skipped ? "—" : fmt(c.spent)} />
              <View className="w-px bg-line" />
              <CardStat label="Sobra" value={(c.remaining < 0 ? "− " : "") + fmt(Math.abs(c.remaining))} tone={c.remaining < 0 ? "coral" : "green"} />
            </View>

            {/* avisos de escopo do saldo (os mesmos da versao anterior) */}
            <View className="gap-1.5">
              {c.note ? <Text className="font-brand text-[12px] text-muted">{c.note}</Text> : null}
              {!skipped && c.upfrontExtra > 0 ? (
                <Text className="font-brand text-[12px] text-muted leading-[17px]">
                  Inclui o valor total de {c.upfrontCount} {c.upfrontCount === 1 ? "compra parcelada" : "compras parceladas"} — o limite do cartão cai de uma vez, não parcela a parcela.
                </Text>
              ) : null}
              {skipped ? (
                <Text className="font-brand text-[12px] text-gold leading-[17px]">
                  Saldo registrado em {formatDateBR(c.referenceDate)}, depois de {monthLabel(month)} — os gastos deste mês já estavam descontados quando você anotou o saldo.
                </Text>
              ) : null}
              {c.scope === "same" ? (
                <Text className="font-brand text-[12px] text-gold leading-[17px]">
                  Parte dos gastos de {monthLabel(month)} pode ser anterior a {formatDateBR(c.referenceDate)} e já estar descontada do saldo.
                </Text>
              ) : null}
              {/* O saldo e um retrato de uma data: em meses posteriores ele nao
                  conhece os gastos do meio do caminho. */}
              {c.scope === "after" ? (
                <Text className="font-brand text-[12px] text-gold leading-[17px]">
                  Saldo anotado em {formatDateBR(c.referenceDate)}, antes de {monthLabel(month)}. Os gastos dos meses entre uma coisa e outra não estão descontados deste número.
                </Text>
              ) : null}
            </View>

            <View className="flex-row items-center gap-2">
              <View className="flex-1">
                <Button label="Atualizar saldo" icon={RefreshCw} variant="secondary" size="lg" onPress={() => onUpdateBalance(c)} />
              </View>
              <IconButton icon={MoreHorizontal} label={`Ações de ${c.paymentMethod}`} onPress={() => setMenu(c)} size={44} boxed />
            </View>
          </Panel>
        );
      })}

      {unregistered.length > 0 ? (
        <Panel>
          <SectionTitle>Sem saldo cadastrado</SectionTitle>
          <Text className="font-brand text-[12px] text-muted -mt-1.5 mb-2 leading-[17px]">
            Estas formas de pagamento tiveram gastos em {monthLabel(month)} e não entram na conta acima.
          </Text>
          {unregistered.map((u, idx) => (
            <View key={u.name} className={"flex-row items-center gap-3 py-2.5 " + (idx > 0 ? "border-t border-line" : "")}>
              <IconBubble icon={CreditCard} tone="neutral" size="sm" />
              <Text className="font-brand text-[14px] text-ink flex-1" numberOfLines={1}>
                {u.name}
              </Text>
              <Text className="font-display text-[14px] text-muted" style={NUM}>
                {fmt(u.value)}
              </Text>
              <Button label="Cadastrar" variant="secondary" size="sm" onPress={() => onAdd(u.name)} />
            </View>
          ))}
        </Panel>
      ) : null}

      <ActionSheet
        visible={!!menu}
        title={menu?.paymentMethod}
        onClose={() => setMenu(null)}
        actions={
          menu
            ? [
                { label: "Atualizar saldo", icon: RefreshCw, onPress: () => onUpdateBalance(menu) },
                { label: "Editar cartão", icon: Pencil, onPress: () => onEdit(menu) },
                { label: "Excluir", icon: Trash2, danger: true, onPress: () => onDelete(menu) },
              ]
            : []
        }
      />
    </View>
  );
}
