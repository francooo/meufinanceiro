import { allPaymentMethods } from "./catalog.js";

/* Quanto a linha tirou do cartao no mes dela. Numa compra parcelada o limite
   cai o valor CHEIO de uma vez, na hora da compra — 280 de uma 280 em 3x, nao
   os 93,33 da parcela. Entao a parcela 1 cobra o total e as seguintes cobram so
   a parcela, que e o que voce deve naquele mes.

   purchaseTotal e nulo em tudo que foi gravado antes desta coluna existir; o
   fallback parcela x total mantem esses lancamentos com um numero razoavel, so
   sujeito ao arredondamento da divisao (93,33 x 3 = 279,99, nao 280). */
export function cardChargeOf(e) {
  const value = Number(e.value) || 0;
  const total = Number(e.installmentTotal) || 0;
  if (total < 2) return value; // gasto comum ou recorrente
  if ((e.installmentNumber ?? 1) !== 1) return value; // parcelas 2..N
  const declared = Number(e.purchaseTotal) || 0;
  return declared > 0 ? declared : value * total;
}

/* Uso do cartao: gastos do mes carregado com aquela forma de pagamento — de
   QUALQUER categoria (paymentMethod e independente de category na web) e pagos
   ou nao (paidAt e ignorado de proposito: o gasto ja saiu do saldo do cartao
   mesmo depois de quitado). So o mes em memoria entra, e cada linha entra pelo
   que cobrou do cartao (cardChargeOf), nao pelo valor da parcela. */
export function spentByPaymentMethod(expenses) {
  const m = new Map();
  for (const e of expenses) {
    if (!e.paymentMethod) continue;
    m.set(e.paymentMethod, (m.get(e.paymentMethod) || 0) + cardChargeOf(e));
  }
  return m;
}

/* O quanto do total acima veio de compras parceladas cobradas cheias, para a
   tela explicar por que o desconto e maior que a soma das parcelas. Separado de
   spentByPaymentMethod para nao mudar a forma do Map que unregisteredMethodSpend
   consome. */
export function upfrontByPaymentMethod(expenses) {
  const m = new Map();
  for (const e of expenses) {
    if (!e.paymentMethod) continue;
    const extra = cardChargeOf(e) - (Number(e.value) || 0);
    if (extra <= 0) continue;
    const cur = m.get(e.paymentMethod) || { extra: 0, count: 0 };
    m.set(e.paymentMethod, { extra: cur.extra + extra, count: cur.count + 1 });
  }
  return m;
}

/* A regra dos tres escopos. O saldo foi anotado numa data; se o mes que voce
   esta vendo e ANTERIOR a ela, aqueles gastos ja estavam descontados quando
   voce anotou — descontar de novo imprimiria um numero sabidamente errado. */
export function buildCardsWithUsage(cards, spent, month, upfront = new Map()) {
  return cards
    .filter((c) => c.paymentMethod && c.referenceDate) // blinda data nula, que quebraria a aba
    .map((c) => {
      const used = spent.get(c.paymentMethod) || 0;
      const up = upfront.get(c.paymentMethod) || { extra: 0, count: 0 };
      const refMonth = c.referenceDate.slice(0, 7);
      const scope = month < refMonth ? "before" : month === refMonth ? "same" : "after";
      const balance = Number(c.balance) || 0;
      return {
        ...c,
        spent: used,
        scope,
        upfrontExtra: up.extra,
        upfrontCount: up.count,
        remaining: scope === "before" ? balance : balance - used,
      };
    })
    .sort((a, b) => a.paymentMethod.localeCompare(b.paymentMethod));
}

/* Formas de pagamento com gasto no mes e sem cartao cadastrado. Existe para o
   silencio virar algo visivel e acionavel — e o que salva o dia quando uma
   forma de pagamento e renomeada e o cartao antigo fica orfao. */
export function unregisteredMethodSpend(cards, spent) {
  const registered = new Set(cards.map((c) => c.paymentMethod));
  return [...spent.entries()]
    .filter(([name]) => !registered.has(name))
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

/* Uma forma de pagamento = um cartao: duas linhas do mesmo metodo descontariam
   o mesmo gasto duas vezes. */
export const canAddCard = (cards, extraPaymentMethods = []) => {
  const taken = new Set(cards.map((c) => c.paymentMethod));
  return allPaymentMethods(extraPaymentMethods).some((p) => !taken.has(p));
};

export const availableMethods = (cards, extraPaymentMethods = [], currentId) => {
  const taken = new Set(cards.filter((c) => c.id !== currentId).map((c) => c.paymentMethod));
  return allPaymentMethods(extraPaymentMethods).filter((p) => !taken.has(p));
};
