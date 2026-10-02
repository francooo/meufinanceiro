import { useState } from "react";
import { Sheet } from "../ui/Sheet";
import { parseAmount } from "../core/amount";
import { AmountField, Field, TextField } from "../ui/fields";

/* Fechamento de cartao: nome livre do cartao + valor a pagar no mes. Preso ao
   mes acessado — quem salva (HomeScreen) carimba o mes, nao este modal. */
export default function CardClosingModal({ visible, item, onClose, onSave }) {
  const [cardName, setCardName] = useState(item?.cardName || "");
  const [value, setValue] = useState(item ? String(item.value ?? "") : "");

  const amount = parseAmount(value);
  const amountOk = !Number.isNaN(amount) && amount >= 0;
  const canSave = cardName.trim() !== "" && amountOk;

  const submit = () => {
    if (!canSave) return;
    onSave({ cardName: cardName.trim(), value: amount }, item?.id);
  };

  return (
    <Sheet
      visible={visible}
      title={item ? "Editar fechamento" : "Novo fechamento"}
      onClose={onClose}
      onSave={submit}
      canSave={canSave}
    >
      <Field label="Cartão">
        <TextField
          value={cardName}
          onChangeText={setCardName}
          placeholder="Ex.: Nubank"
          autoFocus={!item}
        />
      </Field>

      <Field label="Valor a pagar (R$)" hint={amountOk ? undefined : "Valor inválido."}>
        <AmountField value={value} onChangeText={setValue} />
      </Field>
    </Sheet>
  );
}
