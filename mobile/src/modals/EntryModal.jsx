/* Gasto, ganho e divida (modal-editar-gasto.jpg, modal-novo-ganho.jpg,
   modal-nova-divida.jpg). Um modal para os tres modos, como na web: eles
   compartilham descricao, valor, observacao e uma data — o que muda e o nome
   dos campos e quais extras aparecem. */
import { useMemo, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { BarChart3, Briefcase, CircleDot, CreditCard, Landmark, Plus, Repeat, UtensilsCrossed } from "lucide-react-native";
import { Sheet } from "../ui/Sheet";
import { Touchable } from "../ui/Touchable";
import { parseAmount } from "../core/amount";
import { brToIso, isDateInputValid, isoToBr } from "../core/dateinput";
import { CATS, FALLBACK, SERASA_CATS, allCategories, allPaymentMethods } from "../core/catalog";
import { amountToInput, monthLabel } from "../core/format";
import { AmountField, CategoryChips, DateField, Field, MoreOptions, NumberField, OptionCards, SegmentedField, SelectOrCreate, TextField } from "../ui/fields";
import { iconFor } from "../ui/icons";
import { isRepeatValid, parseInstallments, repeatFields, repeatModeOf } from "../core/repeat";
import { useTheme } from "../ui/theme";

/* Rotulos do kit; os valores sao os de core/repeat (REPEAT_MODES). */
const REPEAT_OPTIONS = [
  { value: "none", label: "Não se repete", icon: CircleDot },
  { value: "recurrent", label: "Recorrente", icon: Repeat },
  { value: "installments", label: "Parcelado", icon: BarChart3 },
];

/* Fora do componente para o estado inicial e o useMemo usarem a MESMA lista:
   duas montagens divergentes abririam a edicao no modo errado. Serasa tem
   catalogo proprio e nao passa por allCategories, que so conhece CATS. */
const categoryNames = (cats, extra) => {
  if (cats === CATS) return allCategories(extra);
  const base = (cats || []).map((c) => c.name);
  return [...base, ...extra.filter((c) => !base.includes(c))];
};
const categoryObjects = (cats, extra) => {
  const base = cats || [];
  return [...base, ...extra.filter((c) => !base.some((b) => b.name === c)).map((name) => ({ name, ...FALLBACK }))];
};

const MODES = {
  expense: {
    novo: "Novo gasto",
    editar: "Editar gasto",
    sub: "Registre uma despesa e mantenha suas finanças em dia.",
    salvar: "Salvar gasto",
    titulo: "Descrição",
    placeholder: "Ex.: Luz",
    valorHint: "Digite o valor do gasto",
    dataLabel: "Vencimento",
    cats: CATS,
  },
  income: {
    novo: "Novo ganho",
    editar: "Editar ganho",
    sub: "Registre uma nova entrada no seu mês.",
    salvar: "Salvar ganho",
    titulo: "Descrição",
    placeholder: "Ex.: Salário",
    valorHint: "Digite o valor recebido",
    dataLabel: "Data de recebimento",
  },
  serasa: {
    novo: "Nova dívida",
    editar: "Editar dívida",
    sub: "Registre um compromisso financeiro.",
    salvar: "Salvar dívida",
    titulo: "Credor",
    placeholder: "Ex.: Banco ou instituição",
    dataLabel: "Vencimento",
    cats: SERASA_CATS,
  },
};

export default function EntryModal({ visible, mode = "expense", item, extraCategories = [], extraPaymentMethods = [], months = [], currentMonth, onMoveMonth, onClose, onSave }) {
  const { colors } = useTheme();
  const cfg = MODES[mode];
  const editing = !!item;
  const isIncome = mode === "income";
  const isExpense = mode === "expense";
  const isDebt = mode === "serasa";

  const [desc, setDesc] = useState(isIncome ? item?.source || "" : item?.description || "");
  const [category, setCategory] = useState(item?.category || cfg.cats?.[0]?.name || "");
  /* Reabre a edicao no modo certo: uma categoria que nao esta mais na lista so
     pode ser editada como texto. */
  const [categoryCustom, setCategoryCustom] = useState(() => !!cfg.cats && !categoryNames(cfg.cats, extraCategories).includes(item?.category || cfg.cats?.[0]?.name || ""));
  const [value, setValue] = useState(item ? amountToInput(item.value) : "");
  const [note, setNote] = useState(item?.note || "");
  const [date, setDate] = useState(isoToBr(isIncome ? item?.receiptDate : item?.dueDate));
  const [paymentMethod, setPaymentMethod] = useState(item?.paymentMethod || "");
  /* Reabre em modo texto uma forma que nao esta na lista, como a web. */
  const [methodCustom, setMethodCustom] = useState(() => !!item?.paymentMethod && !allPaymentMethods(extraPaymentMethods).includes(item.paymentMethod));
  const [origins, setOrigins] = useState(() =>
    [isIncome ? item?.cltPjIncome && "cltPj" : item?.paidWithCltPj && "cltPj", isIncome ? item?.voucherIncome && "va" : item?.paidWithVoucher && "va"].filter(Boolean)
  );
  const [recurrent, setRecurrent] = useState(!!item?.recurrent);
  const [repeatMode, setRepeatMode] = useState(() => repeatModeOf(item));
  const [installments, setInstallments] = useState(item?.installmentTotal ? String(item.installmentTotal) : "");
  const [purchaseTotal, setPurchaseTotal] = useState(item?.purchaseTotal ? amountToInput(item.purchaseTotal) : "");
  const [moving, setMoving] = useState(false);
  const [moveError, setMoveError] = useState("");

  /* So faz sentido mover um gasto que ja existe, e so para um mes que nao e o
     atual. Serasa e ganho nao tem mes. */
  const otherMonths = useMemo(() => (isExpense && item ? months.filter((m) => m !== currentMonth) : []), [isExpense, item, months, currentMonth]);

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

  const knownCategories = useMemo(() => (cfg.cats ? categoryNames(cfg.cats, extraCategories) : []), [cfg.cats, extraCategories]);
  const categoryList = useMemo(() => (cfg.cats ? categoryObjects(cfg.cats, extraCategories) : []), [cfg.cats, extraCategories]);
  const knownMethods = useMemo(() => allPaymentMethods(extraPaymentMethods), [extraPaymentMethods]);

  /* Normaliza como a categoria: "inter" digitado vira o "Inter" ja existente,
     senao surgiriam duas formas que nunca se juntam nos totais dos cartoes. */
  const typedMethod = paymentMethod.trim();
  const resolvedMethod = typedMethod === "" ? null : knownMethods.find((m) => m.toLowerCase() === typedMethod.toLowerCase()) || typedMethod;

  const amount = parseAmount(value);
  const dateOk = isDateInputValid(date);
  const parcelas = parseInstallments(installments);
  const hasRepeat = isExpense || isDebt;
  const repeatOk = !hasRepeat || isRepeatValid(repeatMode, parcelas);

  /* O limite do cartao cai o valor cheio da compra de uma vez, nao a parcela,
     entao o total e o que a aba Cartoes desconta. Deixar em branco vale: o
     calculo cai em parcela x parcelas, que so erra o arredondamento. */
  const showPurchaseTotal = isExpense && repeatMode === "installments";
  const suggestedTotal = !Number.isNaN(amount) && Number.isInteger(parcelas) && parcelas >= 2 ? amount * parcelas : NaN;
  const typedTotal = parseAmount(purchaseTotal);
  const totalFilled = purchaseTotal.trim() !== "";
  const totalOk = !showPurchaseTotal || !totalFilled || (!Number.isNaN(typedTotal) && typedTotal > 0);

  /* Categoria e texto livre: sem a normalizacao "Mercado" e "mercado" viram duas
     categorias que nunca mais se juntam. Se o nome digitado ja existe ignorando
     caixa e espacos, o gasto vai para a grafia que ja esta no banco. */
  const typedCategory = category.trim();
  const resolvedCategory = knownCategories.find((c) => c.toLowerCase() === typedCategory.toLowerCase()) || typedCategory;
  const categoryOk = !cfg.cats || typedCategory !== "";

  const canSave = desc.trim() !== "" && !Number.isNaN(amount) && amount >= 0 && dateOk && repeatOk && totalOk && categoryOk;

  const submit = () => {
    if (!canSave) return;
    const iso = brToIso(date);
    /* parseAmount, nunca parseFloat: o teclado pt-BR entrega "1.234,56" e
       parseFloat leria 1.234 — sem erro e sem NaN para canSave detectar. */
    const base = { value: amount, note: note.trim() };
    const cltPj = origins.includes("cltPj");
    const voucher = origins.includes("va");

    const data = isIncome
      ? { ...base, recurrent, source: desc.trim(), receiptDate: iso, voucherIncome: voucher, cltPjIncome: cltPj }
      : {
          ...base,
          description: desc.trim(),
          category: resolvedCategory,
          dueDate: iso,
          ...repeatFields(repeatMode, parcelas, item, totalFilled ? typedTotal : null),
          ...(isExpense ? { paidWithVoucher: voucher, paidWithCltPj: cltPj, paymentMethod: resolvedMethod } : {}),
        };

    onSave(data, item?.id);
  };

  const repeatField = hasRepeat ? (
    <Field label="Recorrência" error={repeatOk ? undefined : "Informe em quantas parcelas (mínimo 2)."}>
      <SegmentedField value={repeatMode} options={REPEAT_OPTIONS} onSelect={setRepeatMode} />
      {repeatMode === "installments" ? (
        <View className="gap-4 mt-3">
          <Field label="Em quantas vezes?" hint={item?.installmentNumber ? `Esta é a parcela ${item.installmentNumber}.` : undefined}>
            <NumberField value={installments} onChangeText={setInstallments} placeholder="Ex.: 6" invalid={!repeatOk} />
          </Field>
          {showPurchaseTotal ? (
            <Field
              label="Valor total da compra"
              optional
              error={totalOk ? undefined : "Informe um valor maior que zero ou deixe em branco."}
              hint="O limite do cartão cai o valor total de uma vez, não a parcela. Em branco, usamos a parcela vezes o número de parcelas."
            >
              <AmountField value={purchaseTotal} onChangeText={setPurchaseTotal} placeholder={Number.isNaN(suggestedTotal) ? "0,00" : amountToInput(suggestedTotal)} invalid={!totalOk} />
            </Field>
          ) : null}
        </View>
      ) : null}
    </Field>
  ) : null;

  const dateField = (
    <Field label={cfg.dataLabel} optional error={dateOk ? undefined : "Data inválida."} hint={isIncome ? "Aparece em “Próximos 7 dias” no Início." : undefined}>
      <DateField value={date} onChangeText={setDate} invalid={!dateOk} />
    </Field>
  );
  const noteField = (
    <Field label="Observação" optional>
      <TextField value={note} onChangeText={setNote} placeholder="Adicione uma observação" multiline />
    </Field>
  );

  return (
    <Sheet visible={visible} title={editing ? cfg.editar : cfg.novo} subtitle={cfg.sub} onClose={onClose} onSave={submit} canSave={canSave} saveLabel={editing ? "Salvar alterações" : cfg.salvar}>
      {isDebt ? (
        <Field label="Tipo de dívida" error={categoryOk ? undefined : "Dê um nome ao tipo."}>
          {categoryCustom ? (
            <SelectOrCreate value={category} options={knownCategories} onChange={setCategory} custom setCustom={setCategoryCustom} placeholder="Nome do novo tipo" resetTo={cfg.cats[0].name} />
          ) : (
            <View>
              <OptionCards
                stack
                tone="coral"
                value={category}
                onChange={setCategory}
                options={categoryList.map((c) => ({ value: c.name, label: c.name, icon: iconFor(c.icon) }))}
              />
              <Touchable
                variant="icon"
                onPress={() => {
                  setCategoryCustom(true);
                  setCategory("");
                }}
                className="flex-row items-center gap-1 self-start mt-2 py-1"
              >
                <Plus size={15} color={colors.gold} strokeWidth={2} />
                <Text className="font-brand-medium text-[13px] text-gold">Outro tipo</Text>
              </Touchable>
            </View>
          )}
        </Field>
      ) : null}

      {!isDebt ? (
        <Field label="Valor" hint={cfg.valorHint}>
          <AmountField big value={value} onChangeText={setValue} autoFocus={!editing} />
        </Field>
      ) : null}

      <Field label={cfg.titulo}>
        <TextField value={desc} onChangeText={setDesc} placeholder={cfg.placeholder} icon={isDebt ? Landmark : undefined} />
      </Field>

      {isDebt ? (
        <Field label="Valor da dívida">
          <AmountField big value={value} onChangeText={setValue} />
        </Field>
      ) : null}

      {isExpense ? (
        <>
          <Field label="Categoria" error={categoryOk ? undefined : "Dê um nome à categoria."}>
            <CategoryChips options={categoryList} value={category} onChange={setCategory} custom={categoryCustom} setCustom={setCategoryCustom} />
          </Field>
          <Field label="Forma de pagamento" optional>
            <SelectOrCreate
              value={paymentMethod}
              options={knownMethods}
              onChange={setPaymentMethod}
              custom={methodCustom}
              setCustom={setMethodCustom}
              title="Forma de pagamento"
              createLabel="Adicionar forma"
              placeholder="Nome da forma de pagamento"
              icon={CreditCard}
              noneLabel="Nenhuma"
            />
          </Field>
          {dateField}
          {noteField}
          {repeatField}
        </>
      ) : null}

      {!isDebt ? (
        <Field label="Origem do dinheiro" hint={isExpense ? "Pode marcar as duas, uma ou nenhuma." : "Selecione a origem desta entrada"}>
          <OptionCards
            multiple
            columns={1}
            value={origins}
            onChange={setOrigins}
            options={[
              { value: "cltPj", label: isExpense ? "Pago com valor CLT/PJ" : "CLT/PJ", description: "Salário, renda ou recebimentos", icon: Briefcase },
              { value: "va", label: isExpense ? "Pago com vale-alimentação" : "Vale-alimentação", description: isExpense ? "VR / VA" : "Crédito de VA", icon: UtensilsCrossed },
            ]}
          />
        </Field>
      ) : null}

      {isIncome ? (
        <MoreOptions defaultOpen={!!(item?.receiptDate || item?.note || item?.recurrent)}>
          {dateField}
          <SegmentedField
            value={recurrent ? "yes" : "no"}
            onSelect={(v) => setRecurrent(v === "yes")}
            options={[
              { value: "no", label: "Não se repete", icon: CircleDot },
              { value: "yes", label: "Todo mês", icon: Repeat },
            ]}
          />
          {noteField}
        </MoreOptions>
      ) : null}

      {isDebt ? (
        <MoreOptions defaultOpen={!!(item?.dueDate || item?.note || item?.recurrent || item?.installmentTotal)}>
          {dateField}
          {repeatField}
          {noteField}
        </MoreOptions>
      ) : null}

      {otherMonths.length > 0 && onMoveMonth ? (
        <MoreOptions label="Mover para outro mês">
          <Text className="font-brand text-[12px] text-muted leading-[17px]">O gasto sai de {monthLabel(currentMonth)} e passa a contar no mês escolhido.</Text>
          <View className="flex-row flex-wrap gap-2">
            {otherMonths.map((m) => (
              <Touchable key={m} onPress={() => move(m)} disabled={moving} hitSlop={{ top: 6, bottom: 6 }} className="px-3 h-10 justify-center rounded-[11px] border border-line bg-surface disabled:opacity-40">
                <Text className="font-brand-medium text-[13px] text-ink">{monthLabel(m)}</Text>
              </Touchable>
            ))}
          </View>
          {moving ? <ActivityIndicator color={colors.positive} /> : null}
          {moveError ? <Text className="font-brand text-[12px] text-coral">{moveError}</Text> : null}
        </MoreOptions>
      ) : null}
    </Sheet>
  );
}
