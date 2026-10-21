import { useState } from "react";
import { FlatList, Modal, Platform, Pressable, Text, TextInput, View } from "react-native";
import DateTimePicker, { DateTimePickerAndroid } from "@react-native-community/datetimepicker";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CalendarDays, Check, ChevronDown, ChevronUp, CreditCard, Plus, X } from "lucide-react-native";
import { Touchable } from "./Touchable";
import { NUM, useTheme } from "./theme";
import { STROKE } from "./icons";
import { iconFor } from "./icons";
import { brToIso, isoToBr } from "../core/dateinput";

const INPUT = "h-[46px] rounded-[12px] border bg-surface px-3.5 font-brand text-[14px] text-ink";

export function Field({ label, optional, hint, error, children }) {
  return (
    <View>
      {label ? (
        <Text className="font-brand-semibold text-[13px] text-ink mb-1.5">
          {label}
          {optional ? <Text className="font-brand text-[12px] text-muted"> (opcional)</Text> : null}
        </Text>
      ) : null}
      {children}
      {error ? (
        <Text className="font-brand text-[12px] text-coral mt-1.5">{error}</Text>
      ) : hint ? (
        <Text className="font-brand text-[12px] text-muted mt-1.5 leading-[17px]">{hint}</Text>
      ) : null}
    </View>
  );
}

/* Campo com icone em bolha a esquerda (modal-novo-item-mercado.jpg). */
export function TextField({ value, onChangeText, placeholder, autoFocus, icon: Icon, multiline, invalid, maxLength, keyboardType }) {
  const { colors } = useTheme();
  const input = (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={colors.muted}
      autoFocus={autoFocus}
      multiline={multiline}
      maxLength={maxLength}
      keyboardType={keyboardType}
      textAlignVertical={multiline ? "top" : "center"}
      className={
        (multiline ? "min-h-[84px] rounded-[12px] border bg-surface px-3.5 py-3 font-brand text-[14px] text-ink " : INPUT + " ") +
        (Icon ? "pl-12 " : "") +
        (invalid ? "border-coral" : "border-line")
      }
    />
  );
  if (!Icon) return input;
  return (
    <View className="justify-center">
      <View pointerEvents="none" className="absolute left-2 z-10 h-8 w-8 rounded-full items-center justify-center bg-tint-green">
        <Icon size={16} color={colors.positive} strokeWidth={STROKE} />
      </View>
      {input}
    </View>
  );
}

/* Teclado decimal entrega virgula em pt-BR. O texto cru fica no estado e so
   vira numero no submit, via parseAmount — converter a cada tecla impediria de
   digitar "1," porque o valor intermediario nao e numero valido.
   `big`: o campo grande serifado do topo dos modais de lancamento. */
export function AmountField({ value, onChangeText, placeholder = "0,00", invalid, big, autoFocus }) {
  const { colors } = useTheme();
  return (
    <View className="justify-center">
      <Text
        pointerEvents="none"
        className={"absolute z-10 " + (big ? "left-4 font-display text-[19px] text-ink" : "left-3.5 font-brand text-[14px] text-muted")}
      >
        R$
      </Text>
      <TextInput
        value={value}
        onChangeText={(t) => onChangeText(t.replace(/[^0-9.,]/g, ""))}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        keyboardType="decimal-pad"
        autoFocus={autoFocus}
        className={
          "rounded-[12px] border bg-surface text-ink " +
          (big ? "h-[60px] pl-14 pr-12 font-display text-[29px] " : "h-[46px] pl-11 pr-3.5 font-brand text-[14px] ") +
          (invalid ? "border-coral" : big ? "border-champagne" : "border-line")
        }
        style={NUM}
      />
      {big && value ? (
        <Touchable variant="icon" onPress={() => onChangeText("")} accessibilityLabel="Limpar valor" className="absolute right-2 h-10 w-10 items-center justify-center">
          <View className="h-5 w-5 rounded-full items-center justify-center bg-muted/40">
            <X size={12} color="#ffffff" strokeWidth={3} />
          </View>
        </Touchable>
      ) : null}
    </View>
  );
}

const isoToDate = (iso) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
};
const dateToIso = (dt) =>
  `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;

/* Data pelo seletor nativo. O valor continua "DD/MM/AAAA" (as telas e os
   validadores de core/dateinput ja falam esse formato); o seletor so preenche.
   `clearable`: datas opcionais ganham o X para voltar a "sem data". */
export function DateField({ value, onChangeText, invalid, placeholder = "dd/mm/aaaa", clearable = true }) {
  const { colors, dark } = useTheme();
  const [iosOpen, setIosOpen] = useState(false);
  const iso = brToIso(value);
  const current = iso ? isoToDate(iso) : new Date();
  const pick = (dt) => dt && onChangeText(isoToBr(dateToIso(dt)));

  const open = () => {
    if (Platform.OS !== "ios") {
      DateTimePickerAndroid.open({
        value: current,
        mode: "date",
        onChange: (e, dt) => e.type === "set" && pick(dt),
      });
    } else setIosOpen(true);
  };

  return (
    <>
      <Touchable onPress={open} className={INPUT + " flex-row items-center gap-2.5 " + (invalid ? "border-coral" : "border-line")}>
        <CalendarDays size={18} color={colors.muted} strokeWidth={STROKE} />
        <Text className={"font-brand text-[14px] flex-1 " + (value ? "text-ink" : "text-muted")} style={NUM}>
          {value || placeholder}
        </Text>
        {clearable && value ? (
          <Touchable variant="icon" onPress={() => onChangeText("")} hitSlop={8} accessibilityLabel="Limpar data" className="h-7 w-7 items-center justify-center">
            <X size={15} color={colors.muted} strokeWidth={STROKE} />
          </Touchable>
        ) : null}
      </Touchable>
      {Platform.OS === "ios" ? (
        <Modal visible={iosOpen} transparent animationType="fade" onRequestClose={() => setIosOpen(false)}>
          <Pressable className="flex-1 justify-end" style={{ backgroundColor: colors.scrim }} onPress={() => setIosOpen(false)}>
            <View className="bg-surface rounded-t-[23px] pb-8 pt-3">
              <DateTimePicker value={current} mode="date" display="inline" themeVariant={dark ? "dark" : "light"} onChange={(_e, dt) => pick(dt)} />
              <Touchable onPress={() => setIosOpen(false)} className="mx-5 h-12 rounded-[12px] bg-forest-2 items-center justify-center">
                <Text className="font-brand-semibold text-white">OK</Text>
              </Touchable>
            </View>
          </Pressable>
        </Modal>
      ) : null}
    </>
  );
}

/* Substitui o <select>. Lista numa folha de baixo, com icone opcional por item. */
export function SelectField({ value, options, onSelect, placeholder = "Selecione", title, icon: Icon, iconOf }) {
  const [open, setOpen] = useState(false);
  const { colors } = useTheme();
  /* Modal do RN e uma janela nativa: fica FORA do SafeAreaView de App.jsx, entao
     o inset da barra de gestos precisa ser aplicado aqui dentro na mao. */
  const insets = useSafeAreaInsets();

  return (
    <>
      <Touchable onPress={() => setOpen(true)} className={INPUT + " border-line flex-row items-center gap-2.5"}>
        {Icon ? <Icon size={18} color={colors.muted} strokeWidth={STROKE} /> : null}
        <Text className={"font-brand text-[14px] flex-1 " + (value ? "text-ink" : "text-muted")} numberOfLines={1}>
          {value || placeholder}
        </Text>
        <ChevronDown size={17} color={colors.muted} strokeWidth={STROKE} />
      </Touchable>

      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        {/* Fundo e folha ficam Pressable cru: ripple de tela inteira num
            backdrop pareceria defeito, e a folha so engole o toque. */}
        <Pressable className="flex-1 justify-end" style={{ backgroundColor: colors.scrim }} onPress={() => setOpen(false)}>
          <Pressable className="bg-surface rounded-t-[23px]" style={{ maxHeight: "70%" }} onPress={(e) => e.stopPropagation()}>
            <View className="self-center h-1 w-10 rounded-full bg-line mt-2" />
            <View className="flex-row items-center justify-between px-5 pt-3 pb-2">
              <Text className="font-display text-[19px] text-heading">{title || placeholder}</Text>
              <Touchable variant="icon" onPress={() => setOpen(false)} className="h-11 w-11 -mr-2 rounded-full items-center justify-center">
                <X size={19} color={colors.muted} strokeWidth={STROKE} />
              </Touchable>
            </View>
            {/* flexShrink: 1 e o que faz a lista ROLAR. No RN o padrao e
                flexShrink: 0: sem isto o Yoga mede a FlatList com a altura de
                todas as opcoes, o maxHeight de 70% corta a folha, e as ultimas
                opcoes ficam clipadas — e a lista nem rola para alcanca-las. */}
            <FlatList
              keyboardShouldPersistTaps="handled"
              style={{ flexShrink: 1 }}
              contentContainerStyle={{ paddingBottom: insets.bottom + 8 }}
              data={options}
              keyExtractor={(item) => String(item)}
              ItemSeparatorComponent={() => <View className="h-px bg-line mx-5" />}
              renderItem={({ item }) => {
                const active = item === value;
                const RowIcon = iconOf ? iconOf(item) : null;
                return (
                  <Touchable
                    variant="row"
                    onPress={() => {
                      onSelect(item);
                      setOpen(false);
                    }}
                    className="flex-row items-center gap-3 px-5 h-[52px]"
                  >
                    {RowIcon ? <RowIcon size={18} color={colors.muted} strokeWidth={STROKE} /> : null}
                    <Text className={"text-[14px] flex-1 " + (active ? "font-brand-semibold text-ink" : "font-brand text-ink")} numberOfLines={1}>
                      {item}
                    </Text>
                    {active ? <Check size={17} color={colors.positive} strokeWidth={2.4} /> : null}
                  </Touchable>
                );
              }}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

/* Lista + "+ Adicionar ..." que troca o seletor por texto livre (categoria e
   forma de pagamento sao texto no lancamento, sem cadastro proprio). */
export function SelectOrCreate({ value, options, onChange, custom, setCustom, title, createLabel, placeholder, icon, noneLabel, resetTo = "" }) {
  const { colors } = useTheme();
  if (custom) {
    return (
      <View className="flex-row gap-2">
        <View className="flex-1 min-w-0">
          <TextField value={value} onChangeText={onChange} placeholder={placeholder} autoFocus />
        </View>
        <Touchable
          variant="icon"
          onPress={() => {
            setCustom(false);
            /* Volta para um valor da lista: texto pela metade no seletor
               mostraria algo que nao existe nele. */
            onChange(options.includes(value) ? value : resetTo);
          }}
          accessibilityLabel="Cancelar"
          className="h-[46px] w-[46px] shrink-0 rounded-[12px] border border-line items-center justify-center"
        >
          <X size={17} color={colors.muted} strokeWidth={STROKE} />
        </Touchable>
      </View>
    );
  }
  const list = noneLabel ? [noneLabel, ...options] : options;
  return (
    <View>
      <SelectField value={value || noneLabel} options={list} onSelect={(v) => onChange(v === noneLabel ? "" : v)} title={title} icon={icon} />
      <Touchable
        variant="icon"
        onPress={() => {
          setCustom(true);
          onChange("");
        }}
        className="flex-row items-center gap-1 self-start mt-2 py-1"
      >
        <Plus size={15} color={colors.gold} strokeWidth={2} />
        <Text className="font-brand-medium text-[13px] text-gold">{createLabel}</Text>
      </Touchable>
    </View>
  );
}

/* Categoria em chips + "+ Criar categoria" (modal-editar-gasto.jpg). */
export function CategoryChips({ options, value, onChange, custom, setCustom }) {
  const { colors } = useTheme();
  if (custom) {
    return (
      <SelectOrCreate value={value} options={options.map((o) => o.name)} onChange={onChange} custom setCustom={setCustom} placeholder="Nome da nova categoria" resetTo={options[0]?.name || ""} />
    );
  }
  return (
    <View>
      <View className="flex-row flex-wrap gap-2">
        {options.map((o) => {
          const on = o.name === value;
          const Icon = iconFor(o.icon);
          return (
            <Touchable
              key={o.name}
              onPress={() => onChange(o.name)}
              accessibilityState={{ selected: on }}
              className={"flex-row items-center gap-1.5 h-10 px-3 rounded-[11px] border " + (on ? "bg-tint-gold border-champagne" : "bg-surface border-line")}
            >
              <Icon size={16} color={on ? colors.gold : o.color} strokeWidth={STROKE} />
              <Text className={"text-[13px] " + (on ? "font-brand-semibold text-gold" : "font-brand text-ink")}>{o.name}</Text>
            </Touchable>
          );
        })}
      </View>
      <Touchable
        variant="icon"
        onPress={() => {
          setCustom(true);
          onChange("");
        }}
        className="flex-row items-center gap-1 self-start mt-2 py-1"
      >
        <Plus size={15} color={colors.gold} strokeWidth={2} />
        <Text className="font-brand-medium text-[13px] text-gold">Criar categoria</Text>
      </Touchable>
    </View>
  );
}

/* Cartoes de opcao: origem do dinheiro (varios), tipo de divida (um). `stack`
   empilha icone e nome, como o "Tipo de divida" do kit. Em 2 colunas: com 3,
   "Financiamento" quebrava no meio da palavra num celular de 412dp. */
export function OptionCards({ options, value, onChange, multiple, columns = 2, stack, tone = "gold" }) {
  const { colors } = useTheme();
  const isOn = (v) => (multiple ? (value || []).includes(v) : value === v);
  const toggle = (v) => {
    if (!multiple) return onChange(v);
    const cur = value || [];
    onChange(cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v]);
  };
  const stacked = !!stack;
  const onBox = tone === "coral" ? "bg-tint-coral border-coral" : "bg-tint-gold border-champagne";
  const onText = tone === "coral" ? "text-coral" : "text-ink";
  const onColor = tone === "coral" ? colors.coral : colors.gold;
  return (
    <View className="flex-row flex-wrap gap-2.5">
      {options.map((o) => {
        const on = isOn(o.value);
        const Icon = o.icon;
        return (
          <Touchable
            key={o.value}
            onPress={() => toggle(o.value)}
            accessibilityRole={multiple ? "checkbox" : "radio"}
            accessibilityState={{ checked: on }}
            className={"rounded-[14px] border p-3 " + (stacked ? "gap-2.5 " : "flex-row items-center gap-3 pr-9 ") + (on ? onBox : "bg-surface border-line")}
            style={{ width: columns === 1 ? "100%" : "48.5%" }}
          >
            {Icon ? (
              <View className="h-10 w-10 rounded-full items-center justify-center" style={{ backgroundColor: on ? colors.surface : colors.tintGreen }}>
                <Icon size={19} color={on ? onColor : colors.positive} strokeWidth={STROKE} />
              </View>
            ) : null}
            <View className={stacked ? "" : "flex-1 min-w-0"}>
              <Text className={"font-display text-[15px] leading-[19px] " + (on ? onText : "text-ink")}>{o.label}</Text>
              {o.description ? <Text className="font-brand text-[11px] text-muted mt-0.5 leading-[15px]">{o.description}</Text> : null}
            </View>
            <View
              className={"absolute right-2.5 top-2.5 h-[18px] w-[18px] items-center justify-center border " + (multiple ? "rounded-[5px] " : "rounded-full ")}
              style={{ borderColor: on ? onColor : colors.line, backgroundColor: on ? onColor : colors.surface }}
            >
              {on ? <Check size={11} color="#ffffff" strokeWidth={3} /> : null}
            </View>
          </Touchable>
        );
      })}
    </View>
  );
}

/* Escolha unica em linha (Recorrencia: nao se repete / recorrente / parcelado). */
export function SegmentedField({ value, options, onSelect }) {
  const { colors } = useTheme();
  return (
    <View className="flex-row gap-2">
      {options.map((o) => {
        const active = o.value === value;
        const Icon = o.icon;
        return (
          <Touchable
            key={o.value}
            onPress={() => onSelect(o.value)}
            hitSlop={{ top: 6, bottom: 6 }}
            accessibilityState={{ selected: active }}
            className={"flex-1 h-12 flex-row items-center justify-center gap-1.5 rounded-[12px] border px-1 " + (active ? "bg-tint-gold border-champagne" : "bg-surface border-line")}
          >
            {Icon ? <Icon size={16} color={active ? colors.gold : colors.ink} strokeWidth={STROKE} /> : null}
            <Text className={"text-[12px] " + (active ? "font-brand-semibold text-gold" : "font-brand text-ink")} numberOfLines={1}>
              {o.label}
            </Text>
          </Touchable>
        );
      })}
    </View>
  );
}

export function SwitchRow({ label, value, onToggle }) {
  const { colors } = useTheme();
  return (
    <Touchable variant="row" onPress={onToggle} className="flex-row items-center gap-3 py-2 rounded-lg">
      <View
        className="h-5 w-5 rounded-[5px] border items-center justify-center"
        style={value ? { backgroundColor: colors.forest2, borderColor: colors.forest2 } : { backgroundColor: colors.surface, borderColor: colors.line }}
      >
        {value ? <Check size={13} color="#ffffff" strokeWidth={3} /> : null}
      </View>
      <Text className="font-brand text-[14px] text-ink flex-1">{label}</Text>
    </Touchable>
  );
}

export function NumberField({ value, onChangeText, placeholder, invalid }) {
  const { colors } = useTheme();
  return (
    <TextInput
      value={value}
      onChangeText={(t) => onChangeText(t.replace(/\D/g, ""))}
      placeholder={placeholder}
      placeholderTextColor={colors.muted}
      keyboardType="number-pad"
      className={INPUT + " " + (invalid ? "border-coral" : "border-line")}
      style={NUM}
    />
  );
}

/* Campos secundarios recolhidos ("Mais opcoes"). */
export function MoreOptions({ label = "Mais opções", defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen);
  const { colors } = useTheme();
  return (
    <View className="rounded-[14px] border border-line">
      <Touchable variant="row" onPress={() => setOpen((o) => !o)} accessibilityState={{ expanded: open }} className="flex-row items-center justify-between px-4 h-12">
        <Text className="font-brand-semibold text-[14px] text-ink">{label}</Text>
        {open ? <ChevronUp size={18} color={colors.muted} strokeWidth={STROKE} /> : <ChevronDown size={18} color={colors.muted} strokeWidth={STROKE} />}
      </Touchable>
      {open ? <View className="px-4 pb-4 pt-1 gap-4">{children}</View> : null}
    </View>
  );
}

export { CreditCard as PaymentIcon };
