import { useMemo, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { Sheet } from "../ui/Sheet";
import { Touchable } from "../ui/Touchable";
import { parseAmount } from "../core/amount";
import { brToIso, isDateInputValid, isoToBr } from "../core/dateinput";
import { CATS, SERASA_CATS, allPaymentMethods } from "../core/catalog";
import { monthLabel } from "../core/format";
import { AmountField, DateField, Field, NumberField, SegmentedField, SelectField, SwitchRow, TextField } from "../ui/fields";
import { REPEAT_MODES, isRepeatValid, parseInstallments, repeatFields, repeatModeOf } from "../core/repeat";

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
    temParcelas: true,
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
    temParcelas: true,
  },
};

export default function EntryModal({
  visible,
  mode = "expense",
  item,
  extraCategories = [],
  extraPaymentMethods = [],
  months = [],
  currentMonth,
  onMoveMonth,
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
  const [repeatMode, setRepeatMode] = useState(() => repeatModeOf(item));
  const [installments, setInstallments] = useState(
    item?.installmentTotal ? String(item.installmentTotal) : ""
  );
  const [moving, setMoving] = useState(false);
  const [moveError, setMoveError] = useState("");

  /* So faz sentido mover um gasto que ja existe, e so para um mes que nao e o
     atual. Serasa e ganho nao tem mes. */
  const otherMonths = useMemo(
    () => (mode === "expense" && item ? months.filter((m) => m !== currentMonth) : []),
    [mode, item, months, currentMonth]
  );

  const move = async (target) => {
    setMoving(true);
    setMoveError("");
    try {
      await onMoveMonth(item, target);
    } catch (err) {
      setMoveError(err?.message || "Não foi possível mover o gasto.");
      setMoving(false);
    }
  };

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
  const parcelas = parseInstallments(installments);
  const repeatOk = !cfg.temParcelas || isRepeatValid(repeatMode, parcelas);
  const canSave =
    desc.trim() !== "" && !Number.isNaN(amount) && amount >= 0 && dateOk && repeatOk;

  const submit = () => {
    if (!canSave) return;
    const iso = brToIso(date);
    /* parseAmount, nunca parseFloat: o teclado pt-BR entrega "1.234,56" e
       parseFloat leria 1.234 — sem erro e sem NaN para canSave detectar. */
    const base = { value: amount, note: note.trim() };

    const data = isIncome
      ? { ...base, recurrent, source: desc.trim(), receiptDate: iso, voucherIncome: voucher, cltPjIncome: cltPj }
      : {
          ...base,
          description: desc.trim(),
          category,
          dueDate: iso,
          ...repeatFields(repeatMode, parcelas, item),
          ...(cfg.temCarteiras ? { paidWithVoucher: voucher, paidWithCltPj: cltPj } : {}),
          ...(cfg.temFormaPagamento
            ? { paymentMethod: paymentMethod === NENHUMA ? null : paymentMethod || null }
            : {}),
        };

    onSave(data, item?.id);
  };

  return (
    <Sheet
      visible={visible}
      title={editing ? cfg.editar : cfg.novo}
      onClose={onClose}
      onSave={submit}
      canSave={canSave}
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
        {!cfg.temParcelas ? (
          <SwitchRow label="Recorrente" value={recurrent} onToggle={() => setRecurrent((v) => !v)} />
        ) : null}
      </View>

      {cfg.temParcelas ? (
        <Field
          label="Repetição"
          hint={repeatOk ? undefined : "Informe em quantas parcelas (mínimo 2)."}
        >
          <SegmentedField value={repeatMode} options={REPEAT_MODES} onSelect={setRepeatMode} />
        </Field>
      ) : null}

      {cfg.temParcelas && repeatMode === "installments" ? (
        <Field label="Número de parcelas">
          <NumberField
            value={installments}
            onChangeText={setInstallments}
            placeholder="Ex.: 6"
            invalid={!repeatOk}
          />
        </Field>
      ) : null}

      {otherMonths.length > 0 && onMoveMonth ? (
        <View className="rounded-2xl border border-slate-200 p-3 gap-2 mt-1">
          <Text className="text-xs font-medium text-slate-500">Mover para outro mês</Text>
          <Text className="text-[11px] text-slate-400">
            O gasto sai de {monthLabel(currentMonth)} e passa a contar no mês escolhido.
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {otherMonths.map((m) => (
              <Touchable
                key={m}
                onPress={() => move(m)}
                disabled={moving}
                hitSlop={{ top: 6, bottom: 6 }}
                className="px-3 py-2.5 rounded-xl border border-slate-200 disabled:opacity-40"
              >
                <Text className="text-xs font-medium text-slate-700">{monthLabel(m)}</Text>
              </Touchable>
            ))}
          </View>
          {moving ? <ActivityIndicator color="#16382c" /> : null}
          {moveError ? <Text className="text-[11px] text-rose-600">{moveError}</Text> : null}
        </View>
      ) : null}
    </Sheet>
  );
}
