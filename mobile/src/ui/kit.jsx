/* Pecas do kit mobile (references/*.jpg). Cores por token (className) e, onde o
   componente nao e do RN (icone, SVG), pelo hex de useTheme().colors. */
import { useEffect } from "react";
import { Modal, Pressable, ScrollView, Switch, Text, TextInput, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Check, ChevronDown, ChevronRight, Search, X } from "lucide-react-native";
import { Touchable } from "./Touchable";
import { NUM, useTheme } from "./theme";
import { STROKE } from "./icons";

/* ---------- textos ---------- */
export function PageHeader({ title, subtitle, action }) {
  return (
    <View className="flex-row items-end justify-between gap-3 mb-4">
      <View className="flex-1 min-w-0">
        <Text className="font-display text-[30px] leading-[34px] text-heading" numberOfLines={2}>
          {title}
        </Text>
        {subtitle ? (
          <Text className="font-display-regular text-[16px] leading-[22px] text-muted mt-0.5">{subtitle}</Text>
        ) : null}
      </View>
      {action || null}
    </View>
  );
}

export function SectionTitle({ children, action }) {
  return (
    <View className="flex-row items-center justify-between gap-3 mb-3">
      <Text className="font-display text-[19px] text-heading flex-1" numberOfLines={1}>
        {children}
      </Text>
      {action || null}
    </View>
  );
}

/* "Ver todas ›": link dourado no topo dos cards da home. */
export function LinkAction({ label, onPress }) {
  const { colors } = useTheme();
  return (
    <Touchable variant="icon" onPress={onPress} hitSlop={8} className="flex-row items-center gap-0.5">
      <Text className="font-brand-medium text-[13px] text-gold">{label}</Text>
      <ChevronRight size={15} color={colors.gold} strokeWidth={STROKE} />
    </Touchable>
  );
}

export function BigAmount({ children, tone = "ink", size = 32 }) {
  const color = tone === "coral" ? "text-coral" : tone === "green" ? "text-positive" : "text-heading";
  return (
    <Text className={"font-display " + color} style={{ fontSize: size, lineHeight: size * 1.18, ...NUM }} numberOfLines={1} adjustsFontSizeToFit>
      {children}
    </Text>
  );
}

/* ---------- superficies ---------- */
export function Panel({ children, className = "", padded = true }) {
  return (
    <View
      className={"bg-surface rounded-[16px] border border-line " + (padded ? "p-4 " : "") + className}
      style={{ shadowColor: "#11251a", shadowOpacity: 0.04, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 1 }}
    >
      {children}
    </View>
  );
}

/* ---------- botoes ---------- */
const BUTTON = {
  primary: { box: "bg-forest-2", text: "text-white", icon: "#ffffff", dark: true },
  secondary: { box: "bg-surface border border-line", text: "text-ink", icon: null },
  gold: { box: "bg-tint-gold border border-champagne/50", text: "text-gold", icon: "gold" },
  danger: { box: "bg-tint-coral border border-coral/30", text: "text-coral", icon: "coral" },
  ghost: { box: "", text: "text-muted", icon: "muted" },
};

export function Button({ label, icon: Icon, onPress, variant = "primary", size = "md", full, disabled, className = "" }) {
  const { colors } = useTheme();
  const v = BUTTON[variant];
  const iconColor = v.icon === null ? colors.ink : v.icon in colors ? colors[v.icon] : v.icon;
  return (
    <Touchable
      onDark={v.dark}
      onPress={onPress}
      disabled={disabled}
      className={
        "flex-row items-center justify-center gap-2 rounded-[12px] disabled:opacity-40 " +
        (size === "lg" ? "h-[52px] px-5 " : size === "sm" ? "h-9 px-3 " : "h-11 px-4 ") +
        (full ? "self-stretch " : "") +
        v.box +
        " " +
        className
      }
    >
      {Icon ? <Icon size={size === "sm" ? 15 : 18} color={iconColor} strokeWidth={STROKE + 0.3} /> : null}
      <Text className={"font-brand-semibold " + (size === "lg" ? "text-[15px] " : "text-[13px] ") + v.text}>{label}</Text>
    </Touchable>
  );
}

export function IconButton({ icon: Icon, onPress, label, tone = "muted", active, size = 36, boxed, disabled }) {
  const { colors } = useTheme();
  const color = active ? (tone === "green" ? colors.positive : colors.ink) : tone === "coral" ? colors.coral : tone === "ink" ? colors.ink : colors.muted;
  return (
    <Touchable
      variant="icon"
      onPress={onPress}
      disabled={disabled}
      accessibilityLabel={label}
      hitSlop={6}
      className={"items-center justify-center rounded-[11px] disabled:opacity-30 " + (boxed ? "bg-surface border border-line" : "")}
      style={{ height: size, width: size }}
    >
      <Icon size={Math.round(size * 0.52)} color={color} strokeWidth={STROKE} />
    </Touchable>
  );
}

/* ---------- bolhas, selos ---------- */
const TONE_BG = { green: "tintGreen", coral: "tintCoral", gold: "tintGold", neutral: "surface2" };
const TONE_FG = { green: "positive", coral: "coral", gold: "gold", neutral: "muted" };

export function IconBubble({ icon: Icon, tone = "green", color, size = "md" }) {
  const { colors } = useTheme();
  const px = size === "sm" ? 32 : size === "lg" ? 56 : 42;
  /* Cor de categoria (hex do catalogo) vira fundo translucido + traco na cor. */
  const bg = color ? color + "1F" : colors[TONE_BG[tone]];
  const fg = color || colors[TONE_FG[tone]];
  return (
    <View className="items-center justify-center rounded-full shrink-0" style={{ width: px, height: px, backgroundColor: bg }}>
      {Icon ? <Icon size={Math.round(px * 0.48)} color={fg} strokeWidth={STROKE} /> : null}
    </View>
  );
}

export function Chip({ children, tone = "green" }) {
  const box = { green: "bg-tint-green", coral: "bg-tint-coral", gold: "bg-tint-gold", neutral: "bg-surface-2" }[tone];
  const text = { green: "text-positive", coral: "text-coral", gold: "text-gold", neutral: "text-muted" }[tone];
  return (
    <View className={"self-start rounded-full px-2.5 py-1 " + box}>
      <Text className={"font-brand-medium text-[11px] " + text} style={NUM} numberOfLines={1}>
        {children}
      </Text>
    </View>
  );
}

export function StatusPill({ paid }) {
  const { colors } = useTheme();
  return paid ? (
    <View className="flex-row items-center gap-1 rounded-full px-2.5 py-1 bg-tint-green">
      <View className="h-4 w-4 rounded-full items-center justify-center" style={{ backgroundColor: colors.positive }}>
        <Check size={10} color="#ffffff" strokeWidth={3} />
      </View>
      <Text className="font-brand-medium text-[11px] text-positive">Pago</Text>
    </View>
  ) : (
    <View className="rounded-full px-2.5 py-1 bg-tint-coral">
      <Text className="font-brand-medium text-[11px] text-coral">Pendente</Text>
    </View>
  );
}

/* Faixa fina de progresso (fatia da categoria, credor). */
export function Meter({ value, max, color, height = 6 }) {
  const { colors } = useTheme();
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return (
    <View className="rounded-full overflow-hidden bg-surface-2" style={{ height }}>
      <View className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color || colors.coral }} />
    </View>
  );
}

/* ---------- controles ---------- */
/* Sub-abas: Gastos | Ganhos, Saldos | Fechamentos, Desejos | Mercado | Farmacia. */
export function Segmented({ options, value, onChange }) {
  const { colors } = useTheme();
  return (
    <View className="flex-row rounded-[14px] bg-surface border border-line p-1 mb-4">
      {options.map((o) => {
        const on = o.value === value;
        const Icon = o.icon;
        return (
          <Touchable
            key={o.value}
            onPress={() => onChange(o.value)}
            className={"flex-1 flex-row items-center justify-center gap-1.5 h-11 rounded-[11px] " + (on ? "bg-tint-green" : "")}
            accessibilityState={{ selected: on }}
          >
            {Icon ? <Icon size={17} color={on ? colors.positive : colors.muted} strokeWidth={STROKE} /> : null}
            <Text className={"text-[14px] " + (on ? "font-brand-semibold text-positive" : "font-brand text-muted")} numberOfLines={1}>
              {o.label}
            </Text>
          </Touchable>
        );
      })}
    </View>
  );
}

export function SearchField({ value, onChangeText, placeholder }) {
  const { colors } = useTheme();
  return (
    <View className="justify-center">
      {/* pointerEvents: sem isto o icone engole o toque na esquerda do campo */}
      <View pointerEvents="none" className="absolute left-4 z-10">
        <Search size={18} color={colors.muted} strokeWidth={STROKE} />
      </View>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        className="h-12 rounded-[13px] border border-line bg-surface pl-11 pr-12 font-brand text-[14px] text-ink"
      />
      {value ? (
        <Touchable onPress={() => onChangeText("")} variant="icon" className="absolute right-1 h-11 w-11 items-center justify-center">
          <X size={16} color={colors.muted} strokeWidth={STROKE} />
        </Touchable>
      ) : null}
    </View>
  );
}

/* Chip de filtro: "Forma ▾", "Vencimento ▾", "Ordenar ▾". */
export function FilterChip({ icon: Icon, label, active, onPress, chevron = true }) {
  const { colors } = useTheme();
  const c = active ? colors.positive : colors.ink;
  return (
    <Touchable
      onPress={onPress}
      className={"flex-row items-center gap-1.5 h-10 px-3 rounded-[11px] border " + (active ? "bg-tint-green border-positive/40" : "bg-surface border-line")}
    >
      {Icon ? <Icon size={16} color={c} strokeWidth={STROKE} /> : null}
      <Text className={"text-[13px] " + (active ? "font-brand-semibold text-positive" : "font-brand text-ink")} numberOfLines={1}>
        {label}
      </Text>
      {chevron ? <ChevronDown size={14} color={c} strokeWidth={STROKE} /> : null}
    </Touchable>
  );
}

/* Chave "Ocultar pagos". */
export function ToggleChip({ label, value, onChange }) {
  const { colors } = useTheme();
  return (
    <Touchable onPress={() => onChange(!value)} className="flex-row items-center gap-2 h-10 pl-2 pr-3 rounded-[11px] border border-line bg-surface">
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: colors.line, true: colors.forest2 }}
        thumbColor="#ffffff"
        style={{ transform: [{ scale: 0.8 }] }}
      />
      <Text className="font-brand text-[13px] text-ink">{label}</Text>
    </Touchable>
  );
}

/* ---------- estados ---------- */
export function EmptyState({ icon, title, text, action }) {
  return (
    <View className="items-center px-4 py-10">
      <IconBubble icon={icon} size="lg" />
      <Text className="font-display text-[19px] text-heading mt-4 text-center">{title}</Text>
      {text ? <Text className="font-brand text-[13px] text-muted mt-1.5 text-center leading-5">{text}</Text> : null}
      {action ? <View className="mt-5 self-stretch items-center">{action}</View> : null}
    </View>
  );
}

/* Esqueleto com brilho (home-carregamento.jpg). Opacidade em loop na UI thread. */
export function Skeleton({ width = "100%", height = 14, radius = 8, color, style }) {
  const o = useSharedValue(0.55);
  useEffect(() => {
    o.value = withRepeat(withTiming(1, { duration: 700 }), -1, true);
  }, [o]);
  const anim = useAnimatedStyle(() => ({ opacity: o.value }));
  const { colors } = useTheme();
  return <Animated.View style={[{ width, height, borderRadius: radius, backgroundColor: color || colors.line }, anim, style]} />;
}

/* Aviso "Gasto marcado como pago · Desfazer" (feedback-gasto-pago.jpg). */
export function Toast({ message, actionLabel, onAction, onClose, bottom }) {
  const { colors } = useTheme();
  return (
    <View className="absolute left-4 right-4 z-50" style={{ bottom }} pointerEvents="box-none">
      <View
        className="flex-row items-center gap-3 rounded-[14px] px-4 py-3"
        style={{ backgroundColor: "#123e2e", elevation: 10, shadowColor: "#0c211a", shadowOpacity: 0.3, shadowRadius: 12, shadowOffset: { width: 0, height: 6 } }}
      >
        <View className="h-7 w-7 rounded-full items-center justify-center" style={{ backgroundColor: "rgba(255,255,255,0.14)" }}>
          <Check size={15} color={colors.mint} strokeWidth={3} />
        </View>
        <Text className="font-brand-medium text-[13px] text-white flex-1" numberOfLines={2}>
          {message}
        </Text>
        {actionLabel ? (
          <Touchable variant="icon" onPress={onAction} hitSlop={8} className="px-1">
            <Text className="font-brand-semibold text-[13px]" style={{ color: colors.mint }}>
              {actionLabel}
            </Text>
          </Touchable>
        ) : null}
        <Touchable variant="icon" onPress={onClose} hitSlop={8} accessibilityLabel="Fechar aviso" className="h-7 w-7 items-center justify-center">
          <X size={16} color="rgba(255,255,255,0.75)" />
        </Touchable>
      </View>
    </View>
  );
}

/* O "•••" das linhas: folha de baixo com as acoes. No celular uma folha e mais
   facil de acertar do que um menu suspenso pequeno. */
export function ActionSheet({ visible, title, actions = [], onClose }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const list = actions.filter(Boolean);
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable className="flex-1 justify-end" style={{ backgroundColor: colors.scrim }} onPress={onClose}>
        <Pressable className="bg-surface rounded-t-[23px] pt-2" style={{ paddingBottom: insets.bottom + 10 }} onPress={(e) => e.stopPropagation()}>
          <View className="self-center h-1 w-10 rounded-full bg-line mb-3" />
          {title ? (
            <Text className="font-display text-[18px] text-heading px-5 pb-2" numberOfLines={1}>
              {title}
            </Text>
          ) : null}
          {list.map((a) => {
            const Icon = a.icon;
            const c = a.danger ? colors.coral : colors.ink;
            return (
              <Touchable
                key={a.label}
                variant="row"
                disabled={a.disabled}
                onPress={() => {
                  onClose();
                  a.onPress();
                }}
                className="flex-row items-center gap-3.5 px-5 h-14 disabled:opacity-35"
              >
                {Icon ? <Icon size={20} color={c} strokeWidth={STROKE} /> : null}
                <Text className={"font-brand-medium text-[15px] " + (a.danger ? "text-coral" : "text-ink")}>{a.label}</Text>
              </Touchable>
            );
          })}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/* Folha de escolha unica (filtros: Forma, Categoria, Ordenar, Origem). `children`
   entra abaixo da lista (o De/Ate do filtro de vencimento). */
export function OptionSheet({ visible, title, options = [], value, onSelect, onClose, children }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable className="flex-1 justify-end" style={{ backgroundColor: colors.scrim }} onPress={onClose}>
        <Pressable className="bg-surface rounded-t-[23px]" style={{ maxHeight: "75%", paddingBottom: insets.bottom + 12 }} onPress={(e) => e.stopPropagation()}>
          <View className="self-center h-1 w-10 rounded-full bg-line mt-2" />
          <View className="flex-row items-center justify-between px-5 pt-3 pb-1">
            <Text className="font-display text-[20px] text-heading">{title}</Text>
            <Touchable variant="icon" onPress={onClose} accessibilityLabel="Fechar" className="h-11 w-11 -mr-2 items-center justify-center">
              <X size={19} color={colors.muted} strokeWidth={STROKE} />
            </Touchable>
          </View>
          <ScrollView style={{ flexShrink: 1 }} keyboardShouldPersistTaps="handled">
            {options.map((o) => {
              const on = o.value === value;
              return (
                <Touchable
                  key={String(o.value)}
                  variant="row"
                  onPress={() => {
                    onSelect(o.value);
                    onClose();
                  }}
                  className={"flex-row items-center justify-between px-5 h-[52px] " + (on ? "bg-tint-green" : "")}
                >
                  <Text className={"text-[15px] flex-1 " + (on ? "font-brand-semibold text-positive" : "font-brand text-ink")} numberOfLines={1}>
                    {o.label}
                  </Text>
                  {on ? <Check size={18} color={colors.positive} strokeWidth={2.4} /> : null}
                </Touchable>
              );
            })}
            {children ? <View className="px-5 pt-2 gap-3">{children}</View> : null}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/* Nota informativa (dourada) de rodape de card. */
export function InfoNote({ icon: Icon, children, tone = "gold" }) {
  const { colors } = useTheme();
  return (
    <View className="flex-row items-start gap-2.5">
      {Icon ? <Icon size={17} color={tone === "gold" ? colors.gold : colors.muted} strokeWidth={STROKE} style={{ marginTop: 1 }} /> : null}
      <Text className={"font-brand text-[12px] leading-[18px] flex-1 " + (tone === "gold" ? "text-gold" : "text-muted")}>{children}</Text>
    </View>
  );
}
