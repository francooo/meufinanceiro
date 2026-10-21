/* Fechamento de cartao (modal-novo-fechamento.jpg): cartao + valor a pagar no
   mes. Preso ao mes acessado — quem salva (HomeScreen) carimba o mes, nao este
   modal. O cartao e texto livre, com atalho para os cartoes ja conhecidos. */
import { useState } from "react";
import { Text, View } from "react-native";
import { CreditCard } from "lucide-react-native";
import { Sheet } from "../ui/Sheet";
import { Touchable } from "../ui/Touchable";
import { parseAmount } from "../core/amount";
import { amountToInput } from "../core/format";
import { AmountField, Field, TextField } from "../ui/fields";

export default function CardClosingModal({ visible, item, suggestions = [], onClose, onSave }) {
  const [cardName, setCardName] = useState(item?.cardName || "");
  const [value, setValue] = useState(item ? amountToInput(item.value) : "");

  const amount = parseAmount(value);
  const amountOk = value.trim() !== "" && !Number.isNaN(amount) && amount >= 0;
  const canSave = cardName.trim() !== "" && amountOk;

  const submit = () => {
    if (!canSave) return;
    onSave({ cardName: cardName.trim(), value: amount }, item?.id);
  };

  const quick = suggestions.filter((s) => s !== cardName).slice(0, 6);

  return (
    <Sheet
      visible={visible}
      title={item ? "Editar fechamento" : "Novo fechamento"}
      subtitle="Valor total a pagar deste cartão no mês."
      onClose={onClose}
      onSave={submit}
      canSave={canSave}
      saveLabel={item ? "Salvar alterações" : "Salvar fechamento"}
    >
      <Field label="Cartão">
        <TextField value={cardName} onChangeText={setCardName} placeholder="Ex.: Nubank" autoFocus={!item} icon={CreditCard} />
        {quick.length > 0 ? (
          <View className="flex-row flex-wrap gap-2 mt-2">
            {quick.map((s) => (
              <Touchable key={s} onPress={() => setCardName(s)} className="px-3 h-9 justify-center rounded-full border border-line bg-surface">
                <Text className="font-brand text-[12px] text-ink">{s}</Text>
              </Touchable>
            ))}
          </View>
        ) : null}
      </Field>

      <Field label="Valor a pagar" error={value.trim() === "" || amountOk ? undefined : "Valor inválido."}>
        <AmountField big value={value} onChangeText={setValue} />
      </Field>
    </Sheet>
  );
}
