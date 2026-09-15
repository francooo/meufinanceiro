import { todayISO } from "./format.js";

/* Datas aqui sao sempre ISO "YYYY-MM-DD", entao comparacao de STRING ja e
   comparacao cronologica — nada de new Date(), que traria fuso para um dado que
   nao tem hora. Mesma tecnica do resto do app (ver core/gastos.js). */
const byDateAsc = (key) => (a, b) => (a[key] < b[key] ? -1 : a[key] > b[key] ? 1 : 0);

/* Portado de meu-caixa.jsx:531-539. Devolve TODOS os ganhos da primeira data
   futura, nao so um: receber duas coisas no mesmo dia e comum e o aviso ficaria
   mentindo se mostrasse apenas o primeiro. */
export function nextIncomes(incomes) {
  const today = todayISO();
  const upcoming = incomes
    .filter((i) => i.receiptDate && i.receiptDate >= today)
    .sort(byDateAsc("receiptDate"));
  if (upcoming.length === 0) return null;
  const date = upcoming[0].receiptDate;
  return { date, items: upcoming.filter((i) => i.receiptDate === date) };
}

/* Espelha nextIncomes, com duas diferencas deliberadas:

   - filtra por `paidAt`: gasto ja quitado nao e cobranca a vencer, e anuncia-lo
     faria o aviso pedir um pagamento que ja foi feito;
   - NAO recorta por hoje. Um gasto vencido e o que mais precisa de aviso, entao
     ele continua aparecendo, marcado com `overdue`. */
export function nextExpenses(expenses) {
  const pending = expenses.filter((e) => !e.paidAt && e.dueDate).sort(byDateAsc("dueDate"));
  if (pending.length === 0) return null;
  const date = pending[0].dueDate;
  return {
    date,
    items: pending.filter((e) => e.dueDate === date),
    overdue: date < todayISO(),
  };
}
