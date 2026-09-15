import { useState } from "react";
import { KeyboardAvoidingView, Modal, Platform, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Touchable } from "../ui/Touchable";
import { X } from "lucide-react-native";
import { parseAmount } from "../core/amount";
import { AmountField, Field, TextField } from "../ui/fields";

/* Item de desejo e de lista de compra têm a mesma forma: título, valor
   opcional e observação. Só os rótulos mudam. */
export default function ChecklistModal({ visible, item, titleLabel, placeholder, novo, editar, onClose, onSave }) {
  const [title, setTitle] = useState(item?.title || "");
  const [value, setValue] = useState(item ? String(item.value ?? "") : "");
  const [note, setNote] = useState(item?.note || "");
  /* Modal do RN e uma janela nativa: fica FORA do SafeAreaView de App.jsx, entao
     o inset da barra de gestos precisa ser aplicado aqui dentro na mao. */
  const insets = useSafeAreaInsets();

  const amount = parseAmount(value);
  /* Valor é opcional aqui: vazio vale 0, mas lixo digitado não passa. */
  const amountOk = value.trim() === "" || (!Number.isNaN(amount) && amount >= 0);
  const canSave = title.trim() !== "" && amountOk;

  const submit = () => {
    if (!canSave) return;
    onSave(
      { title: title.trim(), value: value.trim() === "" ? 0 : amount, note: note.trim() },
      item?.id
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        className="flex-1 justify-end"
        style={{ backgroundColor: "rgba(15,23,42,0.4)" }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View className="bg-white rounded-t-2xl" style={{ maxHeight: "92%" }}>
          <View className="flex-row items-center justify-between px-5 pt-5 pb-3">
            <Text className="text-base font-bold text-slate-800">{item ? editar : novo}</Text>
            <Touchable
              variant="icon"
              onPress={onClose}
              className="h-11 w-11 -mr-2 rounded-full items-center justify-center"
            >
              <X size={18} color="#94a3b8" />
            </Touchable>
          </View>

          {/* flexShrink: 1 — ver EntryModal.jsx. Sem isto o ScrollView e medido
              com a altura inteira do conteudo, o maxHeight corta a folha e o
              rodape com o Salvar fica fora do corte; e tambem o que impede os
              campos de subirem quando o teclado reduz a altura disponivel. */}
          <ScrollView
            className="px-5"
            style={{ flexShrink: 1 }}
            contentContainerStyle={{ paddingBottom: 20, gap: 14 }}
            keyboardShouldPersistTaps="handled"
          >
            <Field label={titleLabel}>
              <TextField value={title} onChangeText={setTitle} placeholder={placeholder} autoFocus={!item} />
            </Field>

            <Field label="Valor estimado (opcional)" hint={amountOk ? undefined : "Valor inválido."}>
              <AmountField value={value} onChangeText={setValue} />
            </Field>

            <Field label="Observação (opcional)">
              <TextField value={note} onChangeText={setNote} placeholder="Ex.: cor preta" />
            </Field>
          </ScrollView>

          <View
            className="flex-row gap-2 px-5 pt-3 border-t border-slate-100"
            style={{ paddingBottom: 12 + insets.bottom }}
          >
            <Touchable onPress={onClose} className="flex-1 py-3.5 rounded-xl border border-slate-200 items-center">
              <Text className="text-sm font-medium text-slate-600">Cancelar</Text>
            </Touchable>
            <Touchable
              onDark
              onPress={submit}
              disabled={!canSave}
              className="flex-1 py-3.5 rounded-xl items-center disabled:opacity-40"
              style={{ backgroundColor: "#16382c" }}
            >
              <Text className="text-sm font-semibold text-white">Salvar</Text>
            </Touchable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
