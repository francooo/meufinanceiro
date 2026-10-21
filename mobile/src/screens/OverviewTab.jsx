/* Inicio — Visao geral (inicio.jpg). */
import { useMemo } from "react";
import { Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Circle, Path } from "react-native-svg";
import { ArrowDown, ArrowUp, HandCoins, Landmark, PieChart, History } from "lucide-react-native";
import { Touchable } from "../ui/Touchable";
import { fmt, formatDayMonth, formatRelativeTime } from "../core/format";
import { buildByCat, buildRecentItems, totalOf } from "../core/group";
import { buildDonut, buildUpcoming, sobraSummary } from "../core/home";
import { catMeta } from "../core/catalog";
import { iconFor } from "../ui/icons";
import { EmptyState, IconBubble, LinkAction, PageHeader, Panel, SectionTitle } from "../ui/kit";
import { NUM, useTheme } from "../ui/theme";

const BAR = { ok: ["#69cb98", "#b4ebc5"], warn: ["#D4A84B", "#e6c47a"], over: ["#C9785A", "#d99a80"] };

function SobraCard({ wallet, onWalletChange, wallets }) {
  const { recebido, gasto } = wallets[wallet];
  const s = sobraSummary(recebido, gasto);
  const toggle = (id, label) => {
    const on = wallet === id;
    return (
      <Touchable
        onPress={() => onWalletChange(id)}
        onDark
        accessibilityState={{ selected: on }}
        className="px-3 h-8 rounded-[9px] items-center justify-center"
        style={on ? { borderWidth: 1.5, borderColor: "#d4a84b" } : undefined}
      >
        <Text className={"text-[12px] " + (on ? "font-brand-semibold" : "font-brand")} style={{ color: on ? "#f3dfae" : "rgba(236,253,245,0.85)" }}>
          {label}
        </Text>
      </Touchable>
    );
  };
  const stat = (up, label, value) => (
    <View className="flex-row items-center gap-2.5 flex-1 min-w-0">
      <View className="h-10 w-10 rounded-full items-center justify-center" style={{ backgroundColor: up ? "#2c7a57" : "#c0603f" }}>
        {up ? <ArrowUp size={19} color="#ffffff" strokeWidth={2.2} /> : <ArrowDown size={19} color="#ffffff" strokeWidth={2.2} />}
      </View>
      <View className="min-w-0 flex-1">
        <Text className="font-brand text-[12px]" style={{ color: "rgba(236,253,245,0.78)" }}>
          {label}
        </Text>
        <Text className="font-display text-[17px] text-white" style={NUM} numberOfLines={1} adjustsFontSizeToFit>
          {fmt(value)}
        </Text>
      </View>
    </View>
  );

  return (
    <LinearGradient colors={["#0f2e25", "#0d3a2b", "#0a3b2d"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 20, padding: 18, overflow: "hidden" }}>
      {/* linha de grafico decorativa, como no kit */}
      <Svg pointerEvents="none" width="70%" height={120} viewBox="0 0 300 120" preserveAspectRatio="none" style={{ position: "absolute", right: 0, top: 46, opacity: 0.6 }}>
        <Path d="M0,110 C50,98 80,80 120,74 S190,48 215,42 S265,14 300,0" stroke="rgba(110,200,150,0.4)" strokeWidth={1.5} fill="none" />
        {[
          [120, 74],
          [215, 42],
          [270, 12],
        ].map(([x, y]) => (
          <Circle key={x} cx={x} cy={y} r={3.5} fill="rgba(110,200,150,0.6)" />
        ))}
      </Svg>
      <View className="flex-row items-center justify-between gap-2">
        <Text className="font-display text-[19px] text-white">Sobra do mês</Text>
        <View className="flex-row items-center rounded-[11px] p-0.5" style={{ borderWidth: 1, borderColor: "rgba(255,255,255,0.15)" }}>
          {toggle("cltPj", "CLT/PJ")}
          {toggle("va", "Vale alimentação")}
        </View>
      </View>
      <Text className="font-display text-[36px] leading-[44px] mt-3" style={{ color: s.sobra < 0 ? "#f2b8a2" : "#ffffff", ...NUM }} numberOfLines={1} adjustsFontSizeToFit>
        {fmt(s.sobra)}
      </Text>
      <Text className="font-brand text-[14px]" style={{ color: "rgba(236,253,245,0.8)" }}>
        {s.sobra < 0 ? "Acima do que foi recebido" : "Disponível para seus planos"}
      </Text>
      <View className="flex-row items-center gap-3 mt-5">
        {stat(true, "Recebido", recebido)}
        <View className="h-10 w-px" style={{ backgroundColor: "rgba(255,255,255,0.15)" }} />
        {stat(false, "Gastos", gasto)}
      </View>
      <View className="flex-row items-center gap-3 mt-5">
        <View
          className="h-2.5 flex-1 rounded-full overflow-hidden"
          style={{ backgroundColor: "rgba(255,255,255,0.12)" }}
          accessibilityRole="progressbar"
          accessibilityValue={{ min: 0, max: 100, now: s.pct }}
        >
          <LinearGradient colors={BAR[s.tone]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ height: "100%", width: `${s.bar}%`, borderRadius: 99 }} />
        </View>
        <Text className="font-brand-medium text-[14px]" style={{ color: "rgba(236,253,245,0.85)", ...NUM }}>
          {s.pct}%
        </Text>
      </View>
      <Text className="font-brand text-[12px] mt-3 leading-[17px]" style={{ color: "rgba(236,253,245,0.8)" }}>
        {s.message}
      </Text>
    </LinearGradient>
  );
}

function UpcomingCard({ expenses, incomes, onGo, onEditItem }) {
  const { colors } = useTheme();
  const items = useMemo(() => buildUpcoming(expenses, incomes), [expenses, incomes]);
  return (
    <Panel>
      <SectionTitle action={<LinkAction label="Ver todas" onPress={() => onGo("gastos")} />}>Próximos 7 dias</SectionTitle>
      {items.length === 0 ? (
        <Text className="font-brand text-[13px] text-muted text-center py-5">Nada previsto para os próximos 7 dias.</Text>
      ) : (
        items.map((it, idx) => {
          const income = it.kind === "income";
          const Icon = income ? HandCoins : iconFor(catMeta(it.category).icon);
          const dot = income ? colors.positive : it.overdue ? colors.coral : colors.gold;
          return (
            <Touchable key={`${it.kind}-${it.id}`} variant="row" onPress={() => onEditItem(it.kind, it.item)} className="flex-row items-center gap-3 py-2.5">
              <Text className={"w-12 text-[12px] " + (it.overdue ? "font-brand-semibold text-coral" : "font-brand text-muted")} style={NUM}>
                {formatDayMonth(it.date)}
              </Text>
              <View className="items-center w-3 self-stretch justify-center">
                {idx > 0 ? <View className="absolute top-0 h-1/2 w-px bg-line" /> : null}
                {idx < items.length - 1 ? <View className="absolute bottom-0 h-1/2 w-px bg-line" /> : null}
                <View className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: dot }} />
              </View>
              <IconBubble icon={Icon} tone={income ? "green" : "coral"} size="sm" />
              <View className="flex-1 min-w-0">
                <Text className="font-display text-[15px] leading-[19px] text-heading" numberOfLines={2}>
                  {it.title}
                </Text>
                <Text className="font-brand text-[12px] text-muted" numberOfLines={1}>
                  {it.overdue ? <Text className="text-coral">Vencido · </Text> : null}
                  {it.subtitle}
                </Text>
              </View>
              <Text className="font-brand-semibold text-[13px]" style={{ color: income ? colors.positive : colors.coral, ...NUM }}>
                {income ? "+ " : "− "}
                {fmt(it.value)}
              </Text>
            </Touchable>
          );
        })
      )}
    </Panel>
  );
}

function Donut({ slices, total, size = 132 }) {
  const { colors } = useTheme();
  const R = 50;
  const C = 2 * Math.PI * R;
  let offset = 0;
  return (
    <View style={{ width: size, height: size }} accessibilityLabel="Distribuição dos gastos por categoria">
      <Svg width={size} height={size} viewBox="0 0 120 120">
        {slices.map((s) => {
          const len = (s.value / (total || 1)) * C;
          const gap = slices.length > 1 ? 1.2 : 0; // fio entre as fatias
          const el = (
            <Circle
              key={s.name}
              cx="60"
              cy="60"
              r={R}
              fill="none"
              stroke={s.color}
              strokeWidth={20}
              strokeDasharray={`${Math.max(0, len - gap)} ${C}`}
              strokeDashoffset={-offset}
              rotation={-90}
              origin="60, 60"
            />
          );
          offset += len;
          return el;
        })}
      </Svg>
      <View className="absolute inset-0 items-center justify-center px-6">
        <Text className="font-display text-[13px] text-heading text-center" style={NUM} numberOfLines={1} adjustsFontSizeToFit>
          {fmt(total)}
        </Text>
        <Text className="font-brand text-[11px]" style={{ color: colors.muted }}>
          em gastos
        </Text>
      </View>
    </View>
  );
}

function SpendingCard({ expenses, onGo }) {
  const total = useMemo(() => totalOf(expenses), [expenses]);
  const slices = useMemo(() => buildDonut(buildByCat(expenses), total), [expenses, total]);
  return (
    <Panel>
      <SectionTitle action={<LinkAction label="Ver todas" onPress={() => onGo("gastos")} />}>Para onde vai o dinheiro</SectionTitle>
      {slices.length === 0 ? (
        <EmptyState icon={PieChart} title="Sem gastos ainda" text="Os gastos do mês aparecem aqui por categoria." />
      ) : (
        <View className="flex-row items-center gap-4">
          <Donut slices={slices} total={total} />
          <View className="flex-1 min-w-0 gap-3">
            {slices.map((s) => (
              <View key={s.name} className="flex-row items-center gap-2">
                <View className="h-3 w-3 rounded-full" style={{ backgroundColor: s.color }} />
                <Text className="font-brand text-[13px] text-ink flex-1" numberOfLines={1}>
                  {s.name}
                </Text>
                <Text className="font-brand-medium text-[13px] text-ink" style={NUM}>
                  {s.pct}%
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </Panel>
  );
}

function RecentCard({ expenses, incomes, onEditItem, onGo }) {
  const { colors } = useTheme();
  const items = useMemo(() => buildRecentItems(expenses, incomes, 5), [expenses, incomes]);
  return (
    <Panel>
      <SectionTitle action={<LinkAction label="Ver lançamentos" onPress={() => onGo("gastos")} />}>Adicionados recentemente</SectionTitle>
      {items.length === 0 ? (
        <EmptyState icon={History} title="Nada adicionado ainda" text="Os últimos gastos e ganhos do mês aparecem aqui." />
      ) : (
        items.map((it, idx) => {
          const income = it.kind === "income";
          const meta = income ? null : catMeta(it.item.category);
          const Icon = income ? Landmark : iconFor(meta.icon);
          const sub = income ? (it.item.cltPjIncome ? "CLT/PJ" : it.item.voucherIncome ? "Vale alimentação" : "Ganho") : it.item.category;
          return (
            /* Toca para editar, como a web. `it.kind` ja e "expense"/"income",
               que e o `mode` esperado pelo EntryModal. */
            <Touchable
              key={`${it.kind}-${it.item.id}`}
              variant="row"
              onPress={() => onEditItem(it.kind, it.item)}
              className={"flex-row items-center gap-3 py-2.5 " + (idx > 0 ? "border-t border-line" : "")}
            >
              <IconBubble icon={Icon} tone="green" color={income ? undefined : meta.color} />
              <View className="flex-1 min-w-0">
                <Text className="font-display text-[15px] text-heading" numberOfLines={1}>
                  {it.label}
                </Text>
                <Text className="font-brand text-[12px] text-muted" numberOfLines={1}>
                  {formatRelativeTime(it.item.createdAt)} · {sub}
                </Text>
              </View>
              <Text className="font-brand-semibold text-[13px]" style={{ color: income ? colors.positive : colors.coral, ...NUM }}>
                {income ? "+ " : "− "}
                {fmt(it.item.value)}
              </Text>
            </Touchable>
          );
        })
      )}
    </Panel>
  );
}

export default function OverviewTab({ expenses, incomes, wallet, onWalletChange, wallets, onEditItem, onGo }) {
  const sobra = wallets[wallet].recebido - wallets[wallet].gasto;
  return (
    <View className="gap-3.5">
      <PageHeader title="Visão geral" subtitle={sobra >= 0 ? "Seu mês em equilíbrio" : "Atenção aos gastos deste mês"} />
      <SobraCard wallet={wallet} onWalletChange={onWalletChange} wallets={wallets} />
      <UpcomingCard expenses={expenses} incomes={incomes} onGo={onGo} onEditItem={onEditItem} />
      <SpendingCard expenses={expenses} onGo={onGo} />
      <RecentCard expenses={expenses} incomes={incomes} onEditItem={onEditItem} onGo={onGo} />
    </View>
  );
}

