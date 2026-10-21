/* Modais do UI kit (novo-gasto, editar-gasto, novo-ganho, novo-cartao,
   atualizar-saldo, novo-fechamento, nova-divida, novo-desejo, novo-item-*).
   Todos preservam os campos e regras da versão anterior. */
import { useCallback, useEffect, useMemo, useState } from "react";
import { Briefcase, CircleDot, CreditCard, Info, Landmark, Package, Repeat, ShoppingCart, BarChart3, UtensilsCrossed, X } from "lucide-react";
import { Button, IconBubble } from "../ui/core.jsx";
import { CategoryChips, DateInput, Field, Modal, ModalFooter, MoneyInput, MoreOptions, OptionCards, PaymentSelect, Segmented, TextArea, TextInput } from "../ui/form.jsx";
import { allPaymentMethods, CATS, FALLBACK, paymentMethodMeta, SERASA_CATS } from "../lib/catalog.jsx";
import { amountToInput, fmt, formatDateBR, monthLabel, parseAmount, todayISO } from "../lib/format.js";

const REPEAT_OPTIONS = [
  { value: "none", label: "Não se repete", icon: CircleDot },
  { value: "recurrent", label: "Recorrente", icon: Repeat },
  { value: "installments", label: "Parcelado", icon: BarChart3 },
];

const validAmount = (raw, { optional } = {}) => {
  if (optional && String(raw).trim() === "") return true;
  const n = parseAmount(raw);
  return !Number.isNaN(n) && n >= 0;
};

// Repetição + parcelas (gasto e dívida). Mesmas regras do modal antigo.
function RepeatFields({ repeatMode, setRepeatMode, installmentTotal, setInstallmentTotal, installmentNumber, purchase }) {
  return (
    <Field label="Recorrência">
      <Segmented options={REPEAT_OPTIONS} value={repeatMode} onChange={setRepeatMode} />
      {repeatMode === "installments" && (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Field label="Em quantas vezes?" hint={installmentNumber ? `Esta é a parcela ${installmentNumber}.` : undefined}>
            <TextInput
              inputMode="numeric"
              value={installmentTotal}
              onChange={(e) => setInstallmentTotal(e.target.value.replace(/\D/g, ""))}
              placeholder="Ex.: 6"
            />
          </Field>
          {purchase && (
            <Field
              label="Valor total da compra"
              optional
              error={purchase.ok ? undefined : "Informe um valor maior que zero ou deixe em branco."}
              hint="O limite do cartão cai o valor total de uma vez. Em branco, usamos a parcela × o número de parcelas."
            >
              <MoneyInput value={purchase.value} onChange={purchase.onChange} placeholder={purchase.placeholder} invalid={!purchase.ok} />
            </Field>
          )}
        </div>
      )}
    </Field>
  );
}

/* ---------- gasto ---------- */
export function ExpenseModal({ item, onClose, onSave, extraCategories = [], extraPaymentMethods = [], months = [], currentMonth, onMoveMonth }) {
  const categoryList = useMemo(
    () => [...CATS, ...extraCategories.filter((n) => !CATS.some((c) => c.name === n)).map((name) => ({ name, ...FALLBACK }))],
    [extraCategories]
  );
  const paymentMethodList = useMemo(() => allPaymentMethods(extraPaymentMethods), [extraPaymentMethods]);

  const [value, setValue] = useState(item ? amountToInput(item.value) : "");
  const [desc, setDesc] = useState(item?.description || "");
  const [category, setCategory] = useState(item?.category || categoryList[0].name);
  const [paymentMethod, setPaymentMethod] = useState(item?.paymentMethod || "");
  const [dueDate, setDueDate] = useState(item?.dueDate || "");
  const [note, setNote] = useState(item?.note || "");
  const [repeatMode, setRepeatMode] = useState(item?.installmentTotal ? "installments" : item?.recurrent ? "recurrent" : "none");
  const [installmentTotal, setInstallmentTotal] = useState(String(item?.installmentTotal || 2));
  const [purchaseTotal, setPurchaseTotal] = useState(item?.purchaseTotal ? amountToInput(item.purchaseTotal) : "");
  const [origins, setOrigins] = useState(() => [item?.paidWithCltPj && "cltPj", item?.paidWithVoucher && "va"].filter(Boolean));
  const [moveTarget, setMoveTarget] = useState("");
  const [moving, setMoving] = useState(false);
  const [moveError, setMoveError] = useState("");

  const amount = parseAmount(value);
  const parcelas = parseInt(installmentTotal, 10);
  const showPurchase = repeatMode === "installments";
  const suggested = !Number.isNaN(amount) && parcelas >= 2 ? amount * parcelas : NaN;
  const totalFilled = purchaseTotal.trim() !== "";
  const typedTotal = parseAmount(purchaseTotal);
  const totalOk = !showPurchase || !totalFilled || (!Number.isNaN(typedTotal) && typedTotal > 0);
  const otherMonths = useMemo(() => months.filter((m) => m !== currentMonth).sort(), [months, currentMonth]);

  const canSave =
    desc.trim() !== "" && validAmount(value) && category.trim() !== "" && totalOk && (repeatMode !== "installments" || parcelas >= 2);

  const submit = () => {
    if (!canSave) return;
    onSave(
      "expense",
      {
        description: desc.trim(),
        category: category.trim(),
        value: amount,
        note: note.trim(),
        dueDate: dueDate || null,
        recurrent: repeatMode === "recurrent",
        installmentTotal: repeatMode === "installments" ? parcelas : null,
        installmentNumber: repeatMode === "installments" ? item?.installmentNumber || 1 : null,
        purchaseTotal: showPurchase && totalFilled ? typedTotal : null,
        paidWithVoucher: origins.includes("va"),
        paidWithCltPj: origins.includes("cltPj"),
        paymentMethod: paymentMethod.trim() || null,
      },
      item?.id
    );
  };

  const move = async () => {
    if (!moveTarget || moving) return;
    setMoving(true);
    setMoveError("");
    try {
      await onMoveMonth(item, moveTarget);
    } catch (err) {
      setMoveError(err.message || "Falha ao mover o gasto.");
      setMoving(false);
    }
  };

  return (
    <Modal
      title={item ? "Editar gasto" : "Novo gasto"}
      subtitle={item ? "Atualize as informações da despesa e mantenha suas finanças em dia." : "Registre uma nova despesa e mantenha suas finanças em dia."}
      onClose={onClose}
      size="lg"
      footer={<ModalFooter onCancel={onClose} onSubmit={submit} disabled={!canSave} submitLabel={item ? "Salvar alterações" : "Salvar gasto"} />}
    >
      <Field label="Valor" hint="Digite o valor do gasto">
        <MoneyInput big autoFocus value={value} onChange={setValue} invalid={value !== "" && !validAmount(value)} />
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Descrição">
          <TextInput value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Ex.: Luz" />
        </Field>
        <Field label="Categoria">
          <CategoryChips options={categoryList} value={category} onChange={setCategory} />
        </Field>
        <Field label="Forma de pagamento" optional>
          <PaymentSelect options={paymentMethodList} value={paymentMethod} onChange={setPaymentMethod} metaOf={paymentMethodMeta} />
        </Field>
        <Field label="Vencimento" optional>
          <DateInput value={dueDate} onChange={setDueDate} />
        </Field>
      </div>
      <Field label="Observação" optional>
        <TextArea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Adicione uma observação" />
      </Field>
      <RepeatFields
        repeatMode={repeatMode}
        setRepeatMode={setRepeatMode}
        installmentTotal={installmentTotal}
        setInstallmentTotal={setInstallmentTotal}
        installmentNumber={item?.installmentNumber}
        purchase={{
          value: purchaseTotal,
          onChange: setPurchaseTotal,
          ok: totalOk,
          placeholder: Number.isNaN(suggested) ? "0,00" : amountToInput(suggested),
        }}
      />
      <Field label="Origem do dinheiro" hint="Pode marcar as duas, uma ou nenhuma.">
        <OptionCards
          multiple
          value={origins}
          onChange={setOrigins}
          options={[
            { value: "cltPj", label: "Pago com valor CLT/PJ", description: "Salário, renda ou recebimentos", icon: Briefcase },
            { value: "va", label: "Pago com vale-alimentação", description: "VR / VA", icon: CreditCard },
          ]}
        />
      </Field>
      {item && otherMonths.length > 0 && (
        <MoreOptions label="Mover para outro mês">
          <p className="text-[13px] text-muted">O gasto sai de {monthLabel(currentMonth)} e passa a contar no mês escolhido.</p>
          <div className="flex gap-2">
            <select
              value={moveTarget}
              onChange={(e) => {
                setMoveTarget(e.target.value);
                setMoveError("");
              }}
              className="flex-1 h-11 rounded-xl border border-line bg-surface px-3 text-[15px] text-ink focus:outline-none focus:border-champagne"
            >
              <option value="">Selecione o mês</option>
              {otherMonths.map((m) => (
                <option key={m} value={m}>
                  {monthLabel(m)}
                </option>
              ))}
            </select>
            <Button variant="secondary" onClick={move} disabled={!moveTarget || moving}>
              {moving ? "Movendo…" : "Mover"}
            </Button>
          </div>
          {moveError && <p className="text-[13px] text-coral">{moveError}</p>}
        </MoreOptions>
      )}
    </Modal>
  );
}

/* ---------- ganho ---------- */
export function IncomeModal({ item, onClose, onSave }) {
  const [value, setValue] = useState(item ? amountToInput(item.value) : "");
  const [desc, setDesc] = useState(item?.source || "");
  const [origins, setOrigins] = useState(() => [item?.cltPjIncome && "cltPj", item?.voucherIncome && "va"].filter(Boolean));
  const [receiptDate, setReceiptDate] = useState(item?.receiptDate || "");
  const [recurrent, setRecurrent] = useState(!!item?.recurrent);
  const [note, setNote] = useState(item?.note || "");

  const canSave = desc.trim() !== "" && validAmount(value);
  const submit = () => {
    if (!canSave) return;
    onSave(
      "income",
      {
        source: desc.trim(),
        value: parseAmount(value),
        note: note.trim(),
        receiptDate: receiptDate || null,
        recurrent,
        voucherIncome: origins.includes("va"),
        cltPjIncome: origins.includes("cltPj"),
      },
      item?.id
    );
  };

  return (
    <Modal
      title={item ? "Editar ganho" : "Novo ganho"}
      subtitle={item ? "Atualize esta entrada do seu mês." : "Registre uma nova entrada no seu mês."}
      onClose={onClose}
      footer={<ModalFooter onCancel={onClose} onSubmit={submit} disabled={!canSave} submitLabel={item ? "Salvar alterações" : "Salvar ganho"} />}
    >
      <Field label="Valor" hint="Digite o valor recebido">
        <MoneyInput big autoFocus value={value} onChange={setValue} invalid={value !== "" && !validAmount(value)} />
      </Field>
      <Field label="Descrição">
        <TextInput value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Ex.: Salário" />
      </Field>
      <Field label="Origem do dinheiro" hint="Selecione a origem desta entrada">
        <OptionCards
          multiple
          value={origins}
          onChange={setOrigins}
          options={[
            { value: "cltPj", label: "CLT/PJ", description: "Salário, renda ou recebimentos", icon: Briefcase },
            { value: "va", label: "Vale-alimentação", description: "Crédito de VA", icon: UtensilsCrossed },
          ]}
        />
      </Field>
      <MoreOptions defaultOpen={!!(item?.receiptDate || item?.note || item?.recurrent)}>
        <Field label="Data de recebimento" optional hint="Aparece em “Próximos 7 dias” na Visão geral.">
          <DateInput value={receiptDate} onChange={setReceiptDate} />
        </Field>
        <Segmented
          options={[
            { value: "no", label: "Não se repete", icon: CircleDot },
            { value: "yes", label: "Recorrente (todo mês)", icon: Repeat },
          ]}
          value={recurrent ? "yes" : "no"}
          onChange={(v) => setRecurrent(v === "yes")}
        />
        <Field label="Observação" optional>
          <TextArea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ex.: pagamento mensal" />
        </Field>
      </MoreOptions>
    </Modal>
  );
}

/* ---------- dívida (Serasa) ---------- */
export function DebtModal({ item, onClose, onSave, extraCategories = [] }) {
  const typeList = useMemo(
    () => [...SERASA_CATS, ...extraCategories.filter((n) => !SERASA_CATS.some((c) => c.name === n)).map((name) => ({ name, ...FALLBACK }))],
    [extraCategories]
  );
  const [category, setCategory] = useState(item?.category || typeList[0].name);
  const [customType, setCustomType] = useState(() => !!item?.category && !typeList.some((c) => c.name === item.category));
  const [desc, setDesc] = useState(item?.description || "");
  const [value, setValue] = useState(item ? amountToInput(item.value) : "");
  const [dueDate, setDueDate] = useState(item?.dueDate || "");
  const [note, setNote] = useState(item?.note || "");
  const [repeatMode, setRepeatMode] = useState(item?.installmentTotal ? "installments" : item?.recurrent ? "recurrent" : "none");
  const [installmentTotal, setInstallmentTotal] = useState(String(item?.installmentTotal || 2));
  const parcelas = parseInt(installmentTotal, 10);

  const canSave = desc.trim() !== "" && validAmount(value) && category.trim() !== "" && (repeatMode !== "installments" || parcelas >= 2);
  const submit = () => {
    if (!canSave) return;
    onSave(
      "serasa",
      {
        description: desc.trim(),
        category: category.trim(),
        value: parseAmount(value),
        note: note.trim(),
        dueDate: dueDate || null,
        recurrent: repeatMode === "recurrent",
        installmentTotal: repeatMode === "installments" ? parcelas : null,
        installmentNumber: repeatMode === "installments" ? item?.installmentNumber || 1 : null,
        purchaseTotal: null,
      },
      item?.id
    );
  };

  return (
    <Modal
      title={item ? "Editar dívida" : "Nova dívida"}
      subtitle="Registre um compromisso financeiro."
      onClose={onClose}
      footer={<ModalFooter onCancel={onClose} onSubmit={submit} disabled={!canSave} submitLabel={item ? "Salvar alterações" : "Salvar dívida"} />}
    >
      <Field label="Tipo de dívida">
        {customType ? (
          <div className="flex gap-2">
            <TextInput autoFocus value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Nome do novo tipo" />
            <button
              type="button"
              aria-label="Cancelar novo tipo"
              onClick={() => {
                setCustomType(false);
                setCategory(typeList[0].name);
              }}
              className="h-11 w-11 shrink-0 rounded-xl border border-line text-muted hover:text-ink flex items-center justify-center"
            >
              <X size={17} />
            </button>
          </div>
        ) : (
          <>
            <OptionCards columns={3} value={category} onChange={setCategory} options={typeList.map((c) => ({ value: c.name, label: c.name, icon: c.icon }))} />
            <button
              type="button"
              onClick={() => {
                setCustomType(true);
                setCategory("");
              }}
              className="mt-2 text-[14px] text-gold hover:underline"
            >
              + Outro tipo
            </button>
          </>
        )}
      </Field>
      <Field label="Credor">
        <TextInput icon={Landmark} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Ex.: Banco ou instituição" />
      </Field>
      <Field label="Valor da dívida">
        <MoneyInput big value={value} onChange={setValue} invalid={value !== "" && !validAmount(value)} />
      </Field>
      <MoreOptions defaultOpen={!!(item?.dueDate || item?.note || item?.recurrent || item?.installmentTotal)}>
        <Field label="Vencimento" optional>
          <DateInput value={dueDate} onChange={setDueDate} />
        </Field>
        <RepeatFields
          repeatMode={repeatMode}
          setRepeatMode={setRepeatMode}
          installmentTotal={installmentTotal}
          setInstallmentTotal={setInstallmentTotal}
          installmentNumber={item?.installmentNumber}
        />
        <Field label="Observação" optional>
          <TextArea value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
      </MoreOptions>
    </Modal>
  );
}

/* ---------- cartão (saldo) ---------- */
export function CardModal({ item, presetMethod, cards = [], extraPaymentMethods = [], onClose, onSave }) {
  const taken = useMemo(() => new Set(cards.filter((c) => c.id !== item?.id).map((c) => c.paymentMethod)), [cards, item]);
  const methodOptions = useMemo(() => {
    const list = allPaymentMethods(extraPaymentMethods).filter((p) => !taken.has(p));
    // forma que sumiu da lista (último gasto apagado) segue editável no cartão que já a usa
    return item?.paymentMethod && !list.includes(item.paymentMethod) ? [item.paymentMethod, ...list] : list;
  }, [taken, item, extraPaymentMethods]);

  const [paymentMethod, setPaymentMethod] = useState(
    () => item?.paymentMethod || (presetMethod && methodOptions.includes(presetMethod) ? presetMethod : methodOptions[0] || "")
  );
  const [lastDigits, setLastDigits] = useState(item?.lastDigits || "");
  const [balance, setBalance] = useState(item ? amountToInput(item.balance) : "");
  const [referenceDate, setReferenceDate] = useState(item?.referenceDate || todayISO());
  const [note, setNote] = useState(item?.note || "");

  const method = paymentMethod.trim();
  const duplicated = method !== "" && taken.has(method);
  const digitsOk = lastDigits === "" || /^\d{4}$/.test(lastDigits);
  const canSave = method !== "" && !duplicated && referenceDate !== "" && balance !== "" && validAmount(balance) && digitsOk;

  const submit = () => {
    if (!canSave) return;
    onSave({ paymentMethod: method, lastDigits: lastDigits || null, balance: parseAmount(balance), referenceDate, note: note.trim() }, item?.id);
  };

  return (
    <Modal
      title={item ? "Editar cartão" : "Novo cartão"}
      subtitle="Cadastre um cartão para acompanhar saldo e gastos."
      onClose={onClose}
      size="sm"
      footer={<ModalFooter onCancel={onClose} onSubmit={submit} disabled={!canSave} submitLabel={item ? "Salvar alterações" : "Salvar cartão"} />}
    >
      <Field label="Cartão (forma de pagamento)" error={duplicated ? "Essa forma de pagamento já tem saldo cadastrado." : undefined}>
        <PaymentSelect options={methodOptions} value={paymentMethod} onChange={setPaymentMethod} metaOf={paymentMethodMeta} noneLabel="Selecionar cartão" />
      </Field>
      <Field label="Final do cartão" optional error={digitsOk ? undefined : "Use os 4 últimos dígitos."}>
        <TextInput
          inputMode="numeric"
          maxLength={4}
          value={lastDigits}
          onChange={(e) => setLastDigits(e.target.value.replace(/\D/g, "").slice(0, 4))}
          placeholder="Ex.: 4821"
        />
      </Field>
      <Field label="Saldo registrado">
        <MoneyInput value={balance} onChange={setBalance} invalid={balance !== "" && !validAmount(balance)} />
      </Field>
      <Field label="Data do saldo" hint="Quando você consultou esse saldo no app do cartão.">
        <DateInput value={referenceDate} onChange={setReferenceDate} />
      </Field>
      <Field label="Observação" optional>
        <TextInput value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ex.: fecha dia 10" />
      </Field>
    </Modal>
  );
}

export function BalanceModal({ card, onClose, onSave }) {
  const [balance, setBalance] = useState("");
  const [referenceDate, setReferenceDate] = useState(todayISO());
  const canSave = balance !== "" && validAmount(balance) && referenceDate !== "";
  const submit = () => canSave && onSave({ balance: parseAmount(balance), referenceDate }, card.id);

  return (
    <Modal
      title="Atualizar saldo do cartão"
      subtitle="Informe o novo saldo registrado para este cartão."
      onClose={onClose}
      size="sm"
      footer={<ModalFooter onCancel={onClose} onSubmit={submit} disabled={!canSave} submitLabel="Atualizar saldo" />}
    >
      <div className="flex items-center gap-4 rounded-2xl border border-line bg-surface-2 p-4">
        <IconBubble icon={CreditCard} />
        <div className="min-w-0">
          <p className="font-display text-[17px] text-ink truncate">{card.paymentMethod}</p>
          <p className="text-[13px] text-muted">
            Saldo registrado: {fmt(card.balance)} · {formatDateBR(card.referenceDate)}
          </p>
        </div>
      </div>
      <Field label="Novo saldo registrado">
        <MoneyInput autoFocus value={balance} onChange={setBalance} invalid={balance !== "" && !validAmount(balance)} />
      </Field>
      <Field label="Data do saldo">
        <DateInput value={referenceDate} onChange={setReferenceDate} />
      </Field>
      <p className="flex items-center gap-2 text-[13px] text-muted">
        <Info size={16} className="shrink-0" /> A sobra será recalculada com base nos gastos do mês.
      </p>
    </Modal>
  );
}

/* ---------- fechamento ---------- */
export function ClosingModal({ item, suggestions = [], onClose, onSave }) {
  const [cardName, setCardName] = useState(item?.cardName || "");
  const [value, setValue] = useState(item ? amountToInput(item.value) : "");
  const canSave = cardName.trim() !== "" && value !== "" && validAmount(value);
  const submit = () => canSave && onSave({ cardName: cardName.trim(), value: parseAmount(value) }, item?.id);

  return (
    <Modal
      title={item ? "Editar fechamento" : "Novo fechamento"}
      subtitle="Valor total a pagar deste cartão no mês."
      onClose={onClose}
      size="sm"
      footer={<ModalFooter onCancel={onClose} onSubmit={submit} disabled={!canSave} submitLabel={item ? "Salvar alterações" : "Salvar fechamento"} />}
    >
      <Field label="Cartão">
        <TextInput icon={CreditCard} autoFocus list="mf-closing-cards" value={cardName} onChange={(e) => setCardName(e.target.value)} placeholder="Ex.: Nubank" />
        <datalist id="mf-closing-cards">
          {suggestions.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
      </Field>
      <Field label="Valor a pagar">
        <MoneyInput big value={value} onChange={setValue} invalid={value !== "" && !validAmount(value)} />
      </Field>
    </Modal>
  );
}

/* ---------- desejo ---------- */
export function WishModal({ item, onClose, onSave }) {
  const [title, setTitle] = useState(item?.title || "");
  const [value, setValue] = useState(item?.value ? amountToInput(item.value) : "");
  const [targetDate, setTargetDate] = useState(item?.targetDate || "");
  const [note, setNote] = useState(item?.note || "");
  const canSave = title.trim() !== "" && validAmount(value, { optional: true });
  const submit = () =>
    canSave &&
    onSave({ title: title.trim(), value: value.trim() === "" ? 0 : parseAmount(value), targetDate: targetDate || null, note: note.trim() }, item?.id);

  return (
    <Modal
      title={item ? "Editar desejo" : "Novo desejo"}
      subtitle="Adicione um objetivo à sua lista de prioridades."
      onClose={onClose}
      size="sm"
      footer={<ModalFooter onCancel={onClose} onSubmit={submit} disabled={!canSave} submitLabel={item ? "Salvar alterações" : "Salvar desejo"} />}
    >
      <Field label="Nome do desejo">
        <TextInput autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex.: Viagem" />
      </Field>
      <Field label="Valor desejado" optional>
        <MoneyInput value={value} onChange={setValue} invalid={!validAmount(value, { optional: true })} />
      </Field>
      <Field label="Data desejada" optional>
        <DateInput value={targetDate} onChange={setTargetDate} />
      </Field>
      <Field label="Observação" optional>
        <TextArea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ex.: Para um mês específico" />
      </Field>
    </Modal>
  );
}

/* ---------- item de Mercado / Farmácia ---------- */
export function ShoppingItemModal({ kind, item, onClose, onSave }) {
  const [title, setTitle] = useState(item?.title || "");
  const [quantity, setQuantity] = useState(item?.quantity || "");
  const [value, setValue] = useState(item?.value ? amountToInput(item.value) : "");
  const [note, setNote] = useState(item?.note || "");
  const canSave = title.trim() !== "" && validAmount(value, { optional: true });
  const submit = () =>
    canSave &&
    onSave(
      { title: title.trim(), quantity: quantity.trim() || null, value: value.trim() === "" ? 0 : parseAmount(value), note: note.trim() },
      item?.id
    );

  return (
    <Modal
      title={item ? "Editar item" : "Novo item"}
      subtitle={kind === "farmacia" ? "Item da sua lista de farmácia." : "Item da sua lista de compras."}
      onClose={onClose}
      size="sm"
      footer={<ModalFooter onCancel={onClose} onSubmit={submit} disabled={!canSave} submitLabel={item ? "Salvar alterações" : "Adicionar item"} />}
    >
      <Field label="Nome do item">
        <TextInput icon={ShoppingCart} autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder={kind === "farmacia" ? "Ex.: Dipirona" : "Ex.: Arroz"} />
      </Field>
      <Field label="Quantidade" optional>
        <TextInput icon={Package} value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder={kind === "farmacia" ? "Ex.: 1 caixa" : "Ex.: 1 kg"} />
      </Field>
      <Field label="Preço estimado" optional>
        <MoneyInput value={value} onChange={setValue} invalid={!validAmount(value, { optional: true })} />
      </Field>
      <Field label="Observação" optional>
        <TextInput value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ex.: marca preferida" />
      </Field>
    </Modal>
  );
}

/* ---------- parear celular (só restilizado) ---------- */
export function PairModal({ onClose }) {
  const [state, setState] = useState({ status: "loading" });
  const [now, setNow] = useState(() => Date.now());

  const generate = useCallback(async () => {
    setState({ status: "loading" });
    try {
      const res = await fetch("/api/auth/pair", { method: "POST" });
      if (!res.ok) throw new Error();
      const { code, expiresAt } = await res.json();
      setState({ status: "ready", code, expiresAt });
    } catch {
      setState({ status: "error" });
    }
  }, []);

  useEffect(() => {
    generate();
  }, [generate]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  /* A contagem aqui é só aviso: quem decide a validade é o expires_at do banco. */
  const left = state.status === "ready" ? Math.max(0, Math.ceil((state.expiresAt - now) / 1000)) : 0;

  return (
    <Modal
      title="Parear celular"
      subtitle="Digite este código no aplicativo do celular. Ele vale uma única vez."
      onClose={onClose}
      size="sm"
      footer={
        <Button variant="secondary" onClick={generate} disabled={state.status === "loading"} className="w-full">
          Gerar novo código
        </Button>
      }
    >
      {state.status === "loading" && <p className="py-8 text-center text-[15px] text-muted">Gerando…</p>}
      {state.status === "error" && <p className="py-8 text-center text-[15px] text-coral">Falha ao gerar o código.</p>}
      {state.status === "ready" && (
        <>
          <div className="rounded-2xl bg-surface-2 border border-line py-7 text-center">
            <span className="font-display text-[34px] tracking-[0.2em] text-heading tabular-nums select-all">{state.code}</span>
          </div>
          <p className={"text-center text-[13px] " + (left > 0 ? "text-muted" : "text-coral")}>
            {left > 0 ? `Expira em ${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}` : "Código expirado."}
          </p>
        </>
      )}
    </Modal>
  );
}
