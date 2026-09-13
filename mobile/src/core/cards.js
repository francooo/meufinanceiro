import { allPaymentMethods } from "./catalog.js";

/* Uso do cartao: gastos do mes carregado com aquela forma de pagamento — de
   QUALQUER categoria (paymentMethod e independente de category na web) e pagos
   ou nao (paidAt e ignorado de proposito: o gasto ja saiu do saldo do cartao
   mesmo depois de quitado). So o mes em memoria entra. */
export function spentByPaymentMethod(expenses) {
  const m = new Map();
  for (const e of expenses) {
    if (!e.paymentMethod) continue;
    m.set(e.paymentMethod, (m.get(e.paymentMethod) || 0) + (Number(e.value) || 0));
  }
  return m;
}

/* A regra dos tres escopos. O saldo foi anotado numa data; se o mes que voce
   esta vendo e ANTERIOR a ela, aqueles gastos ja estavam descontados quando
   voce anotou — descontar de novo imprimiria um numero sabidamente errado. */
export function buildCardsWithUsage(cards, spent, month) {
  return cards
    .filter((c) => c.paymentMethod && c.referenceDate) // blinda data nula, que quebraria a aba
    .map((c) => {
      const used = spent.get(c.paymentMethod) || 0;
      const refMonth = c.referenceDate.slice(0, 7);
      const scope = month < refMonth ? "before" : month === refMonth ? "same" : "after";
      const balance = Number(c.balance) || 0;
      return { ...c, spent: used, scope, remaining: scope === "before" ? balance : balance - used };
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
