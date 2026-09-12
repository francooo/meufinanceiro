import { useState } from "react";
import { FlatList, Modal, Pressable, Text, TextInput, View } from "react-native";
import { Check, ChevronDown, X } from "lucide-react-native";
import { maskDateInput } from "../core/dateinput";

const INPUT =
  "rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-800";

export function Field({ label, hint, children }) {
  return (
    <View>
      <Text className="text-xs font-medium text-slate-500 mb-1">{label}</Text>
      {children}
      {hint ? <Text className="text-[11px] text-slate-400 mt-1">{hint}</Text> : null}
    </View>
  );
}

export function TextField({ value, onChangeText, placeholder, autoFocus }) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor="#94a3b8"
      autoFocus={autoFocus}
      className={INPUT}
    />
  );
}

/* Teclado decimal entrega virgula em pt-BR. O texto cru fica no estado e so
   vira numero no submit, via parseAmount — converter a cada tecla impediria de
   digitar "1," porque o valor intermediario nao e numero valido. */
export function AmountField({ value, onChangeText }) {
  return (
    <TextInput
      value={value}
      onChangeText={(t) => onChangeText(t.replace(/[^0-9.,]/g, ""))}
      placeholder="0,00"
      placeholderTextColor="#94a3b8"
      keyboardType="decimal-pad"
      className={INPUT}
      style={{ fontVariant: ["tabular-nums"] }}
    />
  );
}

export function DateField({ value, onChangeText, invalid }) {
  return (
    <TextInput
      value={value}
      onChangeText={(t) => onChangeText(maskDateInput(t))}
      placeholder="DD/MM/AAAA"
      placeholderTextColor="#94a3b8"
      keyboardType="number-pad"
      className={INPUT}
      style={{ borderColor: invalid ? "#e11d48" : "#e2e8f0", fontVariant: ["tabular-nums"] }}
    />
  );
}

/* Substitui o <select>. Deliberadamente sem @react-native-picker/picker: manter
   a lista de dependencias enxuta vale mais que as ~40 linhas daqui, e toda
   dependencia nativa e mais uma coisa para quebrar num upgrade de SDK. */
export function SelectField({ value, options, onSelect, placeholder = "Selecione", title }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        className={INPUT + " flex-row items-center justify-between"}
      >
        <Text className={"text-sm " + (value ? "text-slate-800" : "text-slate-400")} numberOfLines={1}>
          {value || placeholder}
        </Text>
        <ChevronDown size={16} color="#94a3b8" />
      </Pressable>

      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <Pressable
          className="flex-1 justify-end"
          style={{ backgroundColor: "rgba(15,23,42,0.4)" }}
          onPress={() => setOpen(false)}
        >
          <Pressable
            className="bg-white rounded-t-2xl"
            style={{ maxHeight: "70%" }}
            onPress={(e) => e.stopPropagation()}
          >
            <View className="flex-row items-center justify-between px-5 py-4 border-b border-slate-100">
              <Text className="text-base font-bold text-slate-800">{title || placeholder}</Text>
              <Pressable onPress={() => setOpen(false)} className="h-8 w-8 items-center justify-center">
                <X size={18} color="#94a3b8" />
              </Pressable>
            </View>
            <FlatList
              data={options}
              keyExtractor={(item) => String(item)}
              ItemSeparatorComponent={() => <View className="h-px bg-slate-100" />}
              renderItem={({ item }) => {
                const active = item === value;
                return (
                  <Pressable
                    onPress={() => {
                      onSelect(item);
                      setOpen(false);
                    }}
                    className="flex-row items-center justify-between px-5 py-3.5"
                  >
                    <Text className={"text-sm " + (active ? "font-semibold text-slate-800" : "text-slate-600")}>
                      {item}
                    </Text>
                    {active ? <Check size={16} color="#16382c" /> : null}
                  </Pressable>
                );
              }}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

export function SwitchRow({ label, value, onToggle }) {
  return (
    <Pressable onPress={onToggle} className="flex-row items-center gap-3 py-1">
      <View
        className="h-5 w-5 rounded-md border items-center justify-center"
        style={
          value
            ? { backgroundColor: "#16382c", borderColor: "transparent" }
            : { backgroundColor: "#ffffff", borderColor: "#cbd5e1" }
        }
      >
        <Check size={13} color={value ? "#ffffff" : "transparent"} strokeWidth={3} />
      </View>
      <Text className="text-sm text-slate-700 flex-1">{label}</Text>
    </Pressable>
  );
}
