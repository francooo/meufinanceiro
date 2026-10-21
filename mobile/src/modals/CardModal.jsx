/* Cartao (modal-novo-cartao.jpg) e Atualizar saldo (modal-atualizar-saldo.jpg). */
import { useMemo, useState } from "react";
import { Text, View } from "react-native";
import { CreditCard, Hash, Info } from "lucide-react-native";
import { Sheet } from "../ui/Sheet";
import { parseAmount } from "../core/amount";
import { brToIso, isDateInputValid, isoToBr } from "../core/dateinput";
import { availableMethods } from "../core/cards";
import { amountToInput, fmt, formatDateBR, todayISO } from "../core/format";
import { AmountField, DateField, Field, SelectField, TextField } from "../ui/fields";
import { IconBubble } from "../ui/kit";
import { useTheme } from "../ui/theme";

export default function CardModal({ visible, item, cards = [], presetMethod, extraPaymentMethods = [], onClose, onSave }) {
  const methods = useMemo(() => {
    const list = availableMethods(cards, extraPaymentMethods, item?.id);
    /* Forma de pagamento que sumiu da lista (ultimo gasto apagado) segue
       editavel no cartao que ja a usa — senao editar resetaria o seletor. */
    return item?.paymentMethod && !list.includes(item.paymentMethod) ? [item.paymentMethod, ...list] : list;
  }, [cards, extraPaymentMethods, item]);

  const [paymentMethod, setPaymentMethod] = useState(() => item?.paymentMethod || (presetMethod && methods.includes(presetMethod) ? presetMethod : methods[0] || ""));
  const [lastDigits, setLastDigits] = useState(item?.lastDigits || "");
  const [balance, setBalance] = useState(item ? amountToInput(item.balance) : "");
  const [date, setDate] = useState(isoToBr(item?.referenceDate) || isoToBr(todayISO()));
  const [note, setNote] = useState(item?.note || "");

  const amount = parseAmount(balance);
  const dateOk = isDateInputValid(date) && brToIso(date) !== null;
  /* Final e opcional, mas preenchido tem de ser 4 digitos (o cartao mostra "•••• 4821"). */
  const digitsOk = lastDigits === "" || /^\d{4}$/.test(lastDigits);
  const canSave = paymentMethod !== "" && !Number.isNaN(amount) && amount >= 0 && dateOk && digitsOk;

  const submit = () => {
    if (!canSave) return;
    onSave({ paymentMethod, lastDigits: lastDigits || null, balance: amount, referenceDate: brToIso(date), note: note.trim() }, item?.id);
  };

  return (
    <Sheet
      visible={visible}
      title={item ? "Editar cartão" : "Novo cartão"}
      subtitle="Cadastre um cartão para acompanhar saldo e gastos."
      onClose={onClose}
      onSave={submit}
      canSave={canSave}
      saveLabel={item ? "Salvar alterações" : "Salvar cartão"}
    >
      <Field label="Cartão (forma de pagamento)">
        {methods.length === 0 ? (
          <Text className="font-brand text-[14px] text-muted">Todas as formas de pagamento já têm saldo cadastrado.</Text>
        ) : (
          <SelectField value={paymentMethod} options={methods} onSelect={setPaymentMethod} title="Forma de pagamento" icon={CreditCard} />
        )}
      </Field>
      <Field label="Final do cartão" optional error={digitsOk ? undefined : "Use os 4 últimos dígitos."}>
        <TextField value={lastDigits} onChangeText={(t) => setLastDigits(t.replace(/\D/g, "").slice(0, 4))} placeholder="Ex.: 4821" keyboardType="number-pad" maxLength={4} icon={Hash} invalid={!digitsOk} />
      </Field>
      <Field label="Saldo registrado">
        <AmountField value={balance} onChangeText={setBalance} />
      </Field>
      <Field label="Data do saldo" error={dateOk ? undefined : "Data inválida."} hint="Quando você consultou esse saldo no app do cartão.">
        <DateField value={date} onChangeText={setDate} invalid={!dateOk} clearable={false} />
      </Field>
      <Field label="Observação" optional>
        <TextField value={note} onChangeText={setNote} placeholder="Ex.: fecha dia 10" />
      </Field>
    </Sheet>
  );
}

/* So saldo + data: o atalho do botao "Atualizar saldo". Grava pelo mesmo
   saveCard, que mescla com o cartao existente. */
export function BalanceModal({ visible, card, onClose, onSave }) {
  const { colors } = useTheme();
  const [balance, setBalance] = useState("");
  const [date, setDate] = useState(isoToBr(todayISO()));
  const amount = parseAmount(balance);
  const dateOk = isDateInputValid(date) && brToIso(date) !== null;
  const canSave = balance.trim() !== "" && !Number.isNaN(amount) && amount >= 0 && dateOk;

  return (
    <Sheet
      visible={visible}
      title="Atualizar saldo"
      subtitle="Informe o novo saldo registrado para este cartão."
      onClose={onClose}
      onSave={() => canSave && onSave({ balance: amount, referenceDate: brToIso(date) }, card.id)}
      canSave={canSave}
      saveLabel="Atualizar saldo"
    >
      <View className="flex-row items-center gap-3 rounded-[14px] border border-line bg-surface-2 p-3.5">
        <IconBubble icon={CreditCard} />
        <View className="flex-1 min-w-0">
          <Text className="font-display text-[16px] text-heading" numberOfLines={1}>
            {card.paymentMethod}
          </Text>
          <Text className="font-brand text-[12px] text-muted">
            Saldo registrado: {fmt(card.balance)} · {formatDateBR(card.referenceDate)}
          </Text>
        </View>
      </View>
      <Field label="Novo saldo registrado">
        <AmountField big value={balance} onChangeText={setBalance} autoFocus />
      </Field>
      <Field label="Data do saldo" error={dateOk ? undefined : "Data inválida."}>
        <DateField value={date} onChangeText={setDate} invalid={!dateOk} clearable={false} />
      </Field>
      <View className="flex-row items-center gap-2">
        <Info size={16} color={colors.muted} />
        <Text className="font-brand text-[12px] text-muted flex-1">A sobra será recalculada com base nos gastos do mês.</Text>
      </View>
    </Sheet>
  );
}
