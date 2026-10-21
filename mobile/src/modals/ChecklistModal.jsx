/* Desejo (modal-novo-desejo.jpg) e item de Mercado/Farmacia
   (modal-novo-item-mercado.jpg, modal-novo-item-farmacia.jpg). Mesma forma:
   titulo, valor opcional e observacao; o desejo ganha a data desejada e o
   item de lista, a quantidade. */
import { useState } from "react";
import { Package, Pill, ShoppingCart, Sparkles } from "lucide-react-native";
import { Sheet } from "../ui/Sheet";
import { parseAmount } from "../core/amount";
import { brToIso, isDateInputValid, isoToBr } from "../core/dateinput";
import { amountToInput } from "../core/format";
import { AmountField, DateField, Field, TextField } from "../ui/fields";

const LABELS = {
  wish: { novo: "Novo desejo", editar: "Editar desejo", sub: "Adicione um objetivo à sua lista de prioridades.", nome: "Nome do desejo", ph: "Ex.: Viagem", valor: "Valor desejado", salvar: "Salvar desejo", icon: Sparkles },
  mercado: { novo: "Novo item", editar: "Editar item", sub: "Item da sua lista de compras.", nome: "Nome do item", ph: "Ex.: Arroz", qtd: "Ex.: 1 kg", valor: "Preço estimado", salvar: "Adicionar item", icon: ShoppingCart },
  farmacia: { novo: "Novo item", editar: "Editar item", sub: "Item da sua lista de farmácia.", nome: "Nome do item", ph: "Ex.: Dipirona", qtd: "Ex.: 1 caixa", valor: "Preço estimado", salvar: "Adicionar item", icon: Pill },
};

export default function ChecklistModal({ visible, kind = "wish", item, onClose, onSave }) {
  const l = LABELS[kind];
  const isWish = kind === "wish";
  const [title, setTitle] = useState(item?.title || "");
  const [quantity, setQuantity] = useState(item?.quantity || "");
  const [targetDate, setTargetDate] = useState(isoToBr(item?.targetDate));
  const [value, setValue] = useState(item?.value ? amountToInput(item.value) : "");
  const [note, setNote] = useState(item?.note || "");

  const amount = parseAmount(value);
  /* Valor é opcional aqui: vazio vale 0, mas lixo digitado não passa. */
  const amountOk = value.trim() === "" || (!Number.isNaN(amount) && amount >= 0);
  const dateOk = isDateInputValid(targetDate);
  const canSave = title.trim() !== "" && amountOk && dateOk;

  const submit = () => {
    if (!canSave) return;
    const base = { title: title.trim(), value: value.trim() === "" ? 0 : amount, note: note.trim() };
    onSave(isWish ? { ...base, targetDate: brToIso(targetDate) } : { ...base, quantity: quantity.trim() || null }, item?.id);
  };

  return (
    <Sheet visible={visible} title={item ? l.editar : l.novo} subtitle={l.sub} onClose={onClose} onSave={submit} canSave={canSave} saveLabel={item ? "Salvar alterações" : l.salvar}>
      <Field label={l.nome}>
        <TextField value={title} onChangeText={setTitle} placeholder={l.ph} autoFocus={!item} icon={l.icon} />
      </Field>
      {!isWish ? (
        <Field label="Quantidade" optional>
          <TextField value={quantity} onChangeText={setQuantity} placeholder={l.qtd} icon={Package} />
        </Field>
      ) : null}
      <Field label={l.valor} optional error={amountOk ? undefined : "Valor inválido."}>
        <AmountField value={value} onChangeText={setValue} invalid={!amountOk} />
      </Field>
      {isWish ? (
        <Field label="Data desejada" optional error={dateOk ? undefined : "Data inválida."}>
          <DateField value={targetDate} onChangeText={setTargetDate} invalid={!dateOk} />
        </Field>
      ) : null}
      <Field label="Observação" optional>
        <TextField value={note} onChangeText={setNote} placeholder={isWish ? "Ex.: Para um mês específico" : "Ex.: marca preferida"} />
      </Field>
    </Sheet>
  );
}
