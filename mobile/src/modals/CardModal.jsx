import { useMemo, useState } from "react";
import { Text } from "react-native";
import { Sheet } from "../ui/Sheet";
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
    <Sheet
      visible={visible}
      title={item ? "Editar cartão" : "Novo cartão"}
      onClose={onClose}
      onSave={submit}
      canSave={canSave}
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
    </Sheet>
  );
}
