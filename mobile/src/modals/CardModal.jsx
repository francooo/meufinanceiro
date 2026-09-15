import { useMemo, useState } from "react";
import { KeyboardAvoidingView, Modal, Platform, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Touchable } from "../ui/Touchable";
import { X } from "lucide-react-native";
import { parseAmount } from "../core/amount";
import { brToIso, isDateInputValid, isoToBr } from "../core/dateinput";
import { availableMethods } from "../core/cards";
import { todayISO } from "../core/format";
import { AmountField, DateField, Field, SelectField, TextField } from "../ui/fields";

export default function CardModal({
  visible,
  item,
  cards = [],
  presetMethod,
  extraPaymentMethods = [],
  onClose,
  onSave,
}) {
  const methods = useMemo(() => {
    const list = availableMethods(cards, extraPaymentMethods, item?.id);
    /* Forma de pagamento que sumiu da lista (ultimo gasto apagado) segue
       editavel no cartao que ja a usa — senao editar resetaria o seletor. */
    return item?.paymentMethod && !list.includes(item.paymentMethod)
      ? [item.paymentMethod, ...list]
      : list;
  }, [cards, extraPaymentMethods, item]);

  const [paymentMethod, setPaymentMethod] = useState(
    () =>
      item?.paymentMethod ||
      (presetMethod && methods.includes(presetMethod) ? presetMethod : methods[0] || "")
  );
  const [balance, setBalance] = useState(item ? String(item.balance ?? "") : "");
  const [date, setDate] = useState(isoToBr(item?.referenceDate) || isoToBr(todayISO()));
  const [note, setNote] = useState(item?.note || "");
  /* Modal do RN e uma janela nativa: fica FORA do SafeAreaView de App.jsx, entao
     o inset da barra de gestos precisa ser aplicado aqui dentro na mao. */
  const insets = useSafeAreaInsets();

  const amount = parseAmount(balance);
  const dateOk = isDateInputValid(date) && brToIso(date) !== null;
  const canSave = paymentMethod !== "" && !Number.isNaN(amount) && amount >= 0 && dateOk;

  const submit = () => {
    if (!canSave) return;
    onSave(
      { paymentMethod, balance: amount, referenceDate: brToIso(date), note: note.trim() },
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
            <Text className="text-base font-bold text-slate-800">
              {item ? "Editar cartão" : "Novo cartão"}
            </Text>
            <Touchable
              variant="icon"
              onPress={onClose}
              className="h-11 w-11 -mr-2 rounded-full items-center justify-center"
            >
              <X size={18} color="#94a3b8" />
            </Touchable>
          </View>

          {/* flexShrink: 1 — ver EntryModal.jsx. Sem isto o rodape com o Salvar
              cai fora do corte do maxHeight e nao recebe toque. */}
          <ScrollView
            className="px-5"
            style={{ flexShrink: 1 }}
            contentContainerStyle={{ paddingBottom: 20, gap: 14 }}
            keyboardShouldPersistTaps="handled"
          >
            <Field label="Forma de pagamento">
              {methods.length === 0 ? (
                <Text className="text-sm text-slate-400">
                  Todas as formas de pagamento já têm saldo cadastrado.
                </Text>
              ) : (
                <SelectField
                  value={paymentMethod}
                  options={methods}
                  onSelect={setPaymentMethod}
                  title="Forma de pagamento"
                />
              )}
            </Field>

            <Field label="Saldo disponível (R$)">
              <AmountField value={balance} onChangeText={setBalance} />
            </Field>

            <Field
              label="Data do saldo"
              hint={dateOk ? "Quando você consultou esse saldo no app do cartão." : "Data inválida."}
            >
              <DateField value={date} onChangeText={setDate} invalid={!dateOk} />
            </Field>

            <Field label="Observação (opcional)">
              <TextField value={note} onChangeText={setNote} placeholder="Ex.: fecha dia 10" />
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
