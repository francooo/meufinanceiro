import { useState } from "react";
import { Sheet } from "../ui/Sheet";
import { parseAmount } from "../core/amount";
import { AmountField, Field, TextField } from "../ui/fields";

/* Item de desejo e de lista de compra têm a mesma forma: título, valor
   opcional e observação. Só os rótulos mudam. */
export default function ChecklistModal({ visible, item, titleLabel, placeholder, novo, editar, onClose, onSave }) {
  const [title, setTitle] = useState(item?.title || "");
  const [value, setValue] = useState(item ? String(item.value ?? "") : "");
  const [note, setNote] = useState(item?.note || "");

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
    <Sheet visible={visible} title={item ? editar : novo} onClose={onClose} onSave={submit} canSave={canSave}>
      <Field label={titleLabel}>
        <TextField value={title} onChangeText={setTitle} placeholder={placeholder} autoFocus={!item} />
      </Field>

      <Field label="Valor estimado (opcional)" hint={amountOk ? undefined : "Valor inválido."}>
        <AmountField value={value} onChangeText={setValue} />
      </Field>

      <Field label="Observação (opcional)">
        <TextField value={note} onChangeText={setNote} placeholder="Ex.: cor preta" />
      </Field>
    </Sheet>
  );
}
