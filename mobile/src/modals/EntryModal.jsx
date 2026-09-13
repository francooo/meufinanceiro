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
import { CATS, SERASA_CATS, allPaymentMethods } from "../core/catalog";
import { AmountField, DateField, Field, SelectField, SwitchRow, TextField } from "../ui/fields";

const NENHUMA = "Nenhuma";

/* Um modal para os tres modos, como na web: gasto, ganho e divida do Serasa
   compartilham descricao, valor, observacao e uma data — o que muda e o nome
   dos campos e quais extras aparecem. */
const MODES = {
  expense: {
    novo: "Novo gasto",
    editar: "Editar gasto",
    titulo: "Descrição",
    placeholder: "Ex.: Aluguel",
    dataLabel: "Vencimento (opcional)",
    cats: CATS,
    temCategoria: true,
    temFormaPagamento: true,
    temCarteiras: true,
  },
  income: {
    novo: "Novo ganho",
    editar: "Editar ganho",
    titulo: "Fonte",
    placeholder: "Ex.: Salário",
    dataLabel: "Recebimento (opcional)",
    temCategoria: false,
    temFormaPagamento: false,
    temCarteiras: true,
  },
  serasa: {
    novo: "Nova dívida",
    editar: "Editar dívida",
    titulo: "Descrição",
    placeholder: "Ex.: Cartão antigo",
    dataLabel: "Vencimento (opcional)",
    cats: SERASA_CATS,
    temCategoria: true,
    temFormaPagamento: false,
    temCarteiras: false,
  },
};

export default function EntryModal({
  visible,
  mode = "expense",
  item,
  extraCategories = [],
  extraPaymentMethods = [],
  onClose,
  onSave,
}) {
  const cfg = MODES[mode];
  const editing = !!item;
  const isIncome = mode === "income";

  const [desc, setDesc] = useState(isIncome ? item?.source || "" : item?.description || "");
  const [category, setCategory] = useState(item?.category || cfg.cats?.[0]?.name || "");
  const [value, setValue] = useState(item ? String(item.value ?? "") : "");
  const [note, setNote] = useState(item?.note || "");
  const [date, setDate] = useState(isoToBr(isIncome ? item?.receiptDate : item?.dueDate));
  const [paymentMethod, setPaymentMethod] = useState(item?.paymentMethod || "");
  const [voucher, setVoucher] = useState(!!(isIncome ? item?.voucherIncome : item?.paidWithVoucher));
  const [cltPj, setCltPj] = useState(!!(isIncome ? item?.cltPjIncome : item?.paidWithCltPj));
  const [recurrent, setRecurrent] = useState(!!item?.recurrent);

  const categories = useMemo(() => {
    const base = (cfg.cats || []).map((c) => c.name);
    return [...base, ...extraCategories.filter((c) => !base.includes(c))];
  }, [cfg.cats, extraCategories]);

  const methods = useMemo(
    () => [NENHUMA, ...allPaymentMethods(extraPaymentMethods)],
    [extraPaymentMethods]
  );

  const amount = parseAmount(value);
  const dateOk = isDateInputValid(date);
  const canSave = desc.trim() !== "" && !Number.isNaN(amount) && amount >= 0 && dateOk;

  const submit = () => {
    if (!canSave) return;
    const iso = brToIso(date);
    /* parseAmount, nunca parseFloat: o teclado pt-BR entrega "1.234,56" e
       parseFloat leria 1.234 — sem erro e sem NaN para canSave detectar. */
    const base = { value: amount, note: note.trim(), recurrent };

    const data = isIncome
      ? { ...base, source: desc.trim(), receiptDate: iso, voucherIncome: voucher, cltPjIncome: cltPj }
      : {
          ...base,
          description: desc.trim(),
          category,
          dueDate: iso,
          installmentTotal: item?.installmentTotal ?? null,
          installmentNumber: item?.installmentNumber ?? null,
          ...(cfg.temCarteiras ? { paidWithVoucher: voucher, paidWithCltPj: cltPj } : {}),
          ...(cfg.temFormaPagamento
            ? { paymentMethod: paymentMethod === NENHUMA ? null : paymentMethod || null }
            : {}),
        };

    onSave(data, item?.id);
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
              {editing ? cfg.editar : cfg.novo}
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
            <Field label={cfg.titulo}>
              <TextField
                value={desc}
                onChangeText={setDesc}
                placeholder={cfg.placeholder}
                autoFocus={!editing}
              />
            </Field>

            {cfg.temCategoria ? (
              <Field label="Categoria">
                <SelectField value={category} options={categories} onSelect={setCategory} title="Categoria" />
              </Field>
            ) : null}

            <Field label="Valor (R$)">
              <AmountField value={value} onChangeText={setValue} />
            </Field>

            <Field label={cfg.dataLabel} hint={dateOk ? undefined : "Data inválida."}>
              <DateField value={date} onChangeText={setDate} invalid={!dateOk} />
            </Field>

            {cfg.temFormaPagamento ? (
              <Field label="Forma de pagamento (opcional)">
                <SelectField
                  value={paymentMethod || NENHUMA}
                  options={methods}
                  onSelect={setPaymentMethod}
                  title="Forma de pagamento"
                />
              </Field>
            ) : null}

            <Field label="Observação (opcional)">
              <TextField value={note} onChangeText={setNote} placeholder="Ex.: parcela final" />
            </Field>

            <View className="gap-1 pt-1">
              {cfg.temCarteiras ? (
                <>
                  <SwitchRow
                    label={isIncome ? "Vale alimentação" : "Pago com vale alimentação"}
                    value={voucher}
                    onToggle={() => setVoucher((v) => !v)}
                  />
                  <SwitchRow
                    label={isIncome ? "CLT/PJ" : "Pago com CLT/PJ"}
                    value={cltPj}
                    onToggle={() => setCltPj((v) => !v)}
                  />
                </>
              ) : null}
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
