/* Estrutura do app (inicio.jpg): topo com marca, mes e olho; barra de abas
   embaixo. Cinco abas, decididas com o usuario: Inicio, Lancamentos, Cartoes,
   Dividas e Mais (Desejos, Mercado, Farmacia e Configuracoes). */
import { useState } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BarChart3, Check, ChevronDown, CreditCard, DollarSign, Eye, EyeOff, FileText, Home, MoreHorizontal, Plus, X } from "lucide-react-native";
import { monthLabel } from "../core/format";
import { Touchable } from "./Touchable";
import { useTheme } from "./theme";
import { STROKE } from "./icons";

export const SECTIONS = [
  { id: "inicio", label: "Início", icon: Home, tabs: ["overview"] },
  { id: "lancamentos", label: "Lançamentos", icon: FileText, tabs: ["gastos", "ganhos"] },
  { id: "cartoes", label: "Cartões", icon: CreditCard, tabs: ["cartoes", "fechamento"] },
  { id: "dividas", label: "Dívidas", icon: BarChart3, tabs: ["serasa"] },
  { id: "mais", label: "Mais", icon: MoreHorizontal, tabs: ["desejos", "mercado", "farmacia", "config"] },
];
export const sectionOfTab = (t) => SECTIONS.find((s) => s.tabs.includes(t)) || SECTIONS[0];

/* Altura da barra sem o inset do sistema; FAB, barra de soma e aviso ficam acima. */
export const TAB_BAR_HEIGHT = 66;

export const initialsOf = (email) => (String(email || "").split("@")[0].replace(/[^a-zA-Z]/g, "").slice(0, 2) || "MF").toUpperCase();

export function BrandMark({ size = 38 }) {
  return (
    <View className="items-center justify-center bg-forest-2" style={{ height: size, width: size, borderRadius: size * 0.3 }}>
      <DollarSign size={size * 0.55} color="#ffffff" strokeWidth={2.4} />
    </View>
  );
}

function MonthPicker({ months, month, nextMonthKey, onChange, onAddNext, creating, disabled }) {
  const [open, setOpen] = useState(false);
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <>
      <Touchable
        onPress={() => setOpen(true)}
        disabled={disabled}
        accessibilityLabel={`Mês: ${monthLabel(month)}`}
        className="flex-row items-center gap-1 h-11 px-3 rounded-[13px] bg-surface border border-line disabled:opacity-60"
      >
        <Text className="font-brand-medium text-[13px] text-ink" numberOfLines={1}>
          {monthLabel(month).replace(" de ", " ")}
        </Text>
        <ChevronDown size={16} color={colors.ink} strokeWidth={STROKE} />
      </Touchable>
      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable className="flex-1 justify-end" style={{ backgroundColor: colors.scrim }} onPress={() => setOpen(false)}>
          <Pressable className="bg-surface rounded-t-[23px]" style={{ maxHeight: "70%", paddingBottom: insets.bottom + 10 }} onPress={(e) => e.stopPropagation()}>
            <View className="self-center h-1 w-10 rounded-full bg-line mt-2" />
            <View className="flex-row items-center justify-between px-5 pt-3 pb-1">
              <Text className="font-display text-[20px] text-heading">Escolha o mês</Text>
              <Touchable variant="icon" onPress={() => setOpen(false)} accessibilityLabel="Fechar" className="h-11 w-11 -mr-2 items-center justify-center">
                <X size={19} color={colors.muted} strokeWidth={STROKE} />
              </Touchable>
            </View>
            <ScrollView style={{ flexShrink: 1 }}>
              {[...months].reverse().map((m) => {
                const on = m === month;
                return (
                  <Touchable
                    key={m}
                    variant="row"
                    onPress={() => {
                      setOpen(false);
                      onChange(m);
                    }}
                    className={"flex-row items-center justify-between px-5 h-[52px] " + (on ? "bg-tint-green" : "")}
                  >
                    <Text className={"text-[15px] " + (on ? "font-brand-semibold text-positive" : "font-brand text-ink")}>{monthLabel(m)}</Text>
                    {on ? <Check size={18} color={colors.positive} strokeWidth={2.4} /> : null}
                  </Touchable>
                );
              })}
            </ScrollView>
            <Touchable
              onPress={() => {
                setOpen(false);
                onAddNext();
              }}
              disabled={creating}
              className="flex-row items-center gap-2 mx-5 mt-2 h-12 px-4 rounded-[12px] border border-dashed border-champagne bg-tint-gold disabled:opacity-60"
            >
              {creating ? <ActivityIndicator size="small" color={colors.gold} /> : <Plus size={17} color={colors.gold} strokeWidth={2} />}
              <Text className="font-brand-semibold text-[14px] text-gold">Adicionar {monthLabel(nextMonthKey)}</Text>
            </Touchable>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const SAVE_TEXT = { saving: "Salvando…", saved: "Salvo", error: "Falha ao salvar — sem conexão?" };

export function AppHeader({ months, month, nextMonthKey, onChangeMonth, onAddNextMonth, creatingMonth, monthDisabled, hideValues, onToggleHide, email, onOpenSettings, saveStatus }) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const compact = width < 380; // abaixo disso a marca fica so com o simbolo
  return (
    <View className="px-4 pt-2 pb-2">
      <View className="flex-row items-center gap-2">
        <View className="flex-row items-center gap-2">
          <BrandMark size={36} />
          {!compact ? (
            <Text className="font-brand-bold text-[15px] text-heading" numberOfLines={1}>
              Meu financeiro
            </Text>
          ) : null}
        </View>
        <View className="flex-1 items-center">
          <MonthPicker
            months={months}
            month={month}
            nextMonthKey={nextMonthKey}
            onChange={onChangeMonth}
            onAddNext={onAddNextMonth}
            creating={creatingMonth}
            disabled={monthDisabled}
          />
        </View>
        <Touchable
          variant="icon"
          onPress={onToggleHide}
          accessibilityLabel={hideValues ? "Mostrar valores" : "Ocultar valores"}
          accessibilityState={{ selected: hideValues }}
          className="h-[42px] w-[42px] rounded-[13px] bg-surface border border-line items-center justify-center"
        >
          {hideValues ? <EyeOff size={20} color={colors.ink} strokeWidth={STROKE} /> : <Eye size={20} color={colors.ink} strokeWidth={STROKE} />}
        </Touchable>
        <Touchable
          variant="icon"
          onPress={onOpenSettings}
          accessibilityLabel="Configurações"
          className="h-[42px] w-[42px] rounded-full items-center justify-center bg-forest"
        >
          <Text className="font-brand-bold text-[14px] text-white">{initialsOf(email)}</Text>
        </Touchable>
      </View>
      {hideValues || saveStatus !== "idle" ? (
        <View className="flex-row items-center justify-end gap-2 mt-1.5 h-5">
          {hideValues ? (
            <View className="rounded-full bg-tint-gold px-2.5 py-0.5">
              <Text className="font-brand-medium text-[11px] text-gold">Valores ocultos</Text>
            </View>
          ) : null}
          {saveStatus !== "idle" ? (
            <Text className={"font-brand text-[11px] " + (saveStatus === "error" ? "text-coral" : saveStatus === "saved" ? "text-positive" : "text-muted")}>
              {SAVE_TEXT[saveStatus]}
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

export function TabBar({ section, onSelect }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View
      className="flex-row bg-surface border-t border-line px-2 pt-1.5"
      style={{ paddingBottom: Math.max(insets.bottom, 6), height: TAB_BAR_HEIGHT + Math.max(insets.bottom, 6) }}
    >
      {SECTIONS.map((s) => {
        const on = s.id === section;
        const Icon = s.icon;
        return (
          <Touchable
            key={s.id}
            onPress={() => onSelect(s)}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            className={"flex-1 items-center justify-center gap-1 rounded-[14px] mx-0.5 " + (on ? "bg-tint-green" : "")}
          >
            <Icon size={22} color={on ? colors.positive : colors.muted} strokeWidth={on ? 2.2 : STROKE} />
            <Text className={"text-[11px] " + (on ? "font-brand-semibold text-positive" : "font-brand text-muted")} numberOfLines={1}>
              {s.label}
            </Text>
          </Touchable>
        );
      })}
    </View>
  );
}
