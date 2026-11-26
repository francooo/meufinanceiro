/* Proposta da assistente → o MESMO objeto que os formulários entregam ao salvar
   (src/web/modals/index.jsx). Assim o Confirmar passa por saveEntry / saveWish /
   saveShoppingItem como se a pessoa tivesse preenchido o modal, e o autosave
   grava do jeito de sempre.

   Por que não chamar uma rota de criação direto: a web mantém o mês em memória
   e regrava a coleção inteira (PUT /api/data). Um item criado por fora do
   estado seria apagado pelo próximo autosave. */

export const ACTION_LABELS = {
  create_expense: { title: "Novo gasto", done: "Gasto lançado" },
  create_income: { title: "Novo ganho", done: "Ganho lançado" },
  create_list_item: { title: "Novo item", done: "Item adicionado" },
};

export const LIST_LABELS = { mercado: "Mercado", farmacia: "Farmácia", wishlist: "Desejos" };

const text = (v) => (typeof v === "string" ? v.trim() : "");
const num = (v) => (typeof v === "number" && Number.isFinite(v) ? v : 0);

/** Só vira cartão se a ação é conhecida e nada obrigatório falta. */
export const isActionable = (p) => Boolean(p && ACTION_LABELS[p.action] && (p.missing || []).length === 0);

/**
 * @returns {{ kind: "expense"|"income"|"wish"|"mercado"|"farmacia", data: object, month: string|null }}
 *   `month` só vale para gasto/ganho: null = mês que está na tela.
 */
export function toEntry({ action, data = {} }) {
  if (action === "create_expense") {
    const installments = data.repeat === "installments" ? data.installmentTotal : null;
    return {
      kind: "expense",
      month: data.month || null,
      data: {
        description: text(data.description),
        category: text(data.category),
        value: num(data.value),
        note: text(data.note),
        dueDate: data.dueDate || null,
        recurrent: data.repeat === "recurrent",
        installmentTotal: installments || null,
        installmentNumber: installments ? 1 : null,
        purchaseTotal: null,
        paidWithVoucher: !!data.paidWithVoucher,
        paidWithCltPj: !!data.paidWithCltPj,
        paymentMethod: text(data.paymentMethod) || null,
      },
    };
  }
  if (action === "create_income") {
    return {
      kind: "income",
      month: data.month || null,
      data: {
        source: text(data.source),
        value: num(data.value),
        note: text(data.note),
        receiptDate: data.receiptDate || null,
        recurrent: !!data.recurrent,
        voucherIncome: !!data.voucherIncome,
        cltPjIncome: !!data.cltPjIncome,
      },
    };
  }
  if (action === "create_list_item") {
    const base = { title: text(data.title), value: num(data.value), note: text(data.note) };
    if (data.list === "wishlist") return { kind: "wish", month: null, data: { ...base, targetDate: null } };
    return { kind: data.list === "farmacia" ? "farmacia" : "mercado", month: null, data: { ...base, quantity: null } };
  }
  throw new Error(`Ação desconhecida da assistente: ${action}`);
}
