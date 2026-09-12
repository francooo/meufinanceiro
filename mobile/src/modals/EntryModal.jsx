import { useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { X } from "lucide-react-native";
import { parseAmount } from "../core/amount";
import { brToIso, isDateInputValid, isoToBr } from "../core/dateinput";
import { CATS, allPaymentMethods } from "../core/catalog";
import { AmountField, DateField, Field, SelectField, SwitchRow, TextField } from "../ui/fields";

const NENHUMA = "Nenhuma";

export default function EntryModal({ visible, item, extraCategories = [], extraPaymentMethods = [], onClose, onSave }) {
  const editing = !!item;

  const [desc, setDesc] = useState(item?.description || "");
  const [category, setCategory] = useState(item?.category || CATS[0].name);
  const [value, setValue] = useState(item ? String(item.value ?? "") : "");
  const [note, setNote] = useState(item?.note || "");
  const [dueDate, setDueDate] = useState(isoToBr(item?.dueDate));
  const [paymentMethod, setPaymentMethod] = useState(item?.paymentMethod || "");
  const [paidWithVoucher, setPaidWithVoucher] = useState(!!item?.paidWithVoucher);
  const [paidWithCltPj, setPaidWithCltPj] = useState(!!item?.paidWithCltPj);
  const [recurrent, setRecurrent] = useState(!!item?.recurrent);

  const categories = useMemo(() => {
    const base = CATS.map((c) => c.name);
    return [...base, ...extraCategories.filter((c) => !base.includes(c))];
  }, [extraCategories]);

  const methods = useMemo(
    () => [NENHUMA, ...allPaymentMethods(extraPaymentMethods)],
    [extraPaymentMethods]
  );

  const amount = parseAmount(value);
  const dateOk = isDateInputValid(dueDate);
  const canSave = desc.trim() !== "" && !Number.isNaN(amount) && amount >= 0 && dateOk;

  const submit = () => {
    if (!canSave) return;
    onSave(
      {
        description: desc.trim(),
        category,
        /* parseAmount, nunca parseFloat: o teclado pt-BR entrega "1.234,56" e
           parseFloat leria 1.234 — sem erro e sem NaN para canSave detectar. */
        value: amount,
        note: note.trim(),
        dueDate: brToIso(dueDate),
        recurrent,
        paidWithVoucher,
        paidWithCltPj,
        paymentMethod: paymentMethod === NENHUMA ? null : paymentMethod || null,
        installmentTotal: item?.installmentTotal ?? null,
        installmentNumber: item?.installmentNumber ?? null,
      },
      item?.id
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        className="flex-1 justify-end"
        style={{ backgroundColor: "rgba(15,23,42,0.4)" }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View className="bg-white rounded-t-2xl" style={{ maxHeight: "92%" }}>
          <View className="flex-row items-center justify-between px-5 pt-5 pb-3">
            <Text className="text-base font-bold text-slate-800">
              {editing ? "Editar gasto" : "Novo gasto"}
            </Text>
            <Pressable onPress={onClose} className="h-8 w-8 items-center justify-center">
              <X size={18} color="#94a3b8" />
            </Pressable>
          </View>

          {/* keyboardShouldPersistTaps: sem isto, o primeiro toque so fecha o
              teclado e o botao Salvar exige dois toques. */}
          <ScrollView
            className="px-5"
            contentContainerStyle={{ paddingBottom: 20, gap: 14 }}
            keyboardShouldPersistTaps="handled"
          >
            <Field label="Descrição">
              <TextField value={desc} onChangeText={setDesc} placeholder="Ex.: Aluguel" autoFocus={!editing} />
            </Field>

            <Field label="Categoria">
              <SelectField value={category} options={categories} onSelect={setCategory} title="Categoria" />
            </Field>

            <Field label="Valor (R$)">
              <AmountField value={value} onChangeText={setValue} />
            </Field>

            <Field label="Vencimento (opcional)" hint={dateOk ? undefined : "Data inválida."}>
              <DateField value={dueDate} onChangeText={setDueDate} invalid={!dateOk} />
            </Field>

            <Field label="Forma de pagamento (opcional)">
              <SelectField
                value={paymentMethod || NENHUMA}
                options={methods}
                onSelect={setPaymentMethod}
                title="Forma de pagamento"
              />
            </Field>

            <Field label="Observação (opcional)">
              <TextField value={note} onChangeText={setNote} placeholder="Ex.: parcela final" />
            </Field>

            <View className="gap-1 pt-1">
              <SwitchRow label="Pago com vale alimentação" value={paidWithVoucher} onToggle={() => setPaidWithVoucher((v) => !v)} />
              <SwitchRow label="Pago com CLT/PJ" value={paidWithCltPj} onToggle={() => setPaidWithCltPj((v) => !v)} />
              <SwitchRow label="Recorrente" value={recurrent} onToggle={() => setRecurrent((v) => !v)} />
            </View>
          </ScrollView>

          <View className="flex-row gap-2 px-5 pt-3 pb-6 border-t border-slate-100">
            <Pressable
              onPress={onClose}
              className="flex-1 py-3.5 rounded-xl border border-slate-200 items-center"
            >
              <Text className="text-sm font-medium text-slate-600">Cancelar</Text>
            </Pressable>
            <Pressable
              onPress={submit}
              disabled={!canSave}
              className="flex-1 py-3.5 rounded-xl items-center"
              style={{ backgroundColor: "#16382c", opacity: canSave ? 1 : 0.4 }}
            >
              <Text className="text-sm font-semibold text-white">Salvar</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
