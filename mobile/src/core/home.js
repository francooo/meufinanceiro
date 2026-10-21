/* Derivacoes da tela Inicio e de Dividas, portadas da web (meu-caixa.jsx:
   UpcomingCard, SpendingCard; src/web/screens/Dividas.jsx). Funcoes puras: o
   `today` entra por parametro para os testes nao dependerem do relogio. */
import { addDaysISO, todayISO } from "./format.js";

const byDate = (a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0);

/* Ganhos a receber e contas a pagar dos proximos 7 dias. Gasto vencido e nao
   pago entra no topo: e o alerta que os avisos antigos davam. */
export function buildUpcoming(expenses, incomes, today = todayISO(), limit = 5) {
  const until = addDaysISO(today, 7);
  const inc = incomes
    .filter((i) => i.receiptDate && i.receiptDate >= today && i.receiptDate <= until)
    .map((i) => ({
      kind: "income",
      id: i.id,
      date: i.receiptDate,
      title: i.source,
      subtitle: ["Recebimento", i.cltPjIncome ? "CLT/PJ" : i.voucherIncome ? "Vale alimentação" : null].filter(Boolean).join(" · "),
      value: i.value,
      item: i,
    }));
  const exp = expenses
    .filter((e) => !e.paidAt && e.dueDate && e.dueDate <= until)
    .map((e) => ({
      kind: "expense",
      id: e.id,
      date: e.dueDate,
      overdue: e.dueDate < today,
      title: e.description,
      subtitle: e.category,
      category: e.category,
      value: e.value,
      item: e,
    }));
  const overdue = exp.filter((x) => x.overdue).sort(byDate);
  const upcoming = [...inc, ...exp.filter((x) => !x.overdue)].sort(byDate);
  return [...overdue, ...upcoming].slice(0, limit);
}

/* Rosca: as 3 maiores categorias + "Outros" (so com mais de 4). Porcentagens
   inteiras que somam exatamente 100: o resto do arredondamento vai na ultima. */
export const DONUT_COLORS = ["#1F5C45", "#8A8F4E", "#D4A84B", "#C9785A"];
export function buildDonut(byCat, total) {
  const base =
    byCat.length <= 4
      ? byCat.map((c) => ({ name: c.name, value: c.value }))
      : [
          ...byCat.slice(0, 3).map((c) => ({ name: c.name, value: c.value })),
          { name: "Outros", value: byCat.slice(3).reduce((s, c) => s + c.value, 0) },
        ];
  let acc = 0;
  return base.map((s, i) => {
    const pct = i === base.length - 1 ? 100 - acc : Math.round((s.value / (total || 1)) * 100);
    acc += pct;
    return { ...s, pct, color: DONUT_COLORS[i] };
  });
}

/* Ranking de credores: soma por descricao (o credor), maiores primeiro. */
export function topCreditors(debts, limit = 5) {
  const m = new Map();
  for (const s of debts) m.set(s.description, (m.get(s.description) || 0) + (Number(s.value) || 0));
  return [...m.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);
}

/* Parte da renda ja gasta na carteira da Sobra e a frase do card. */
export function sobraSummary(recebido, gasto) {
  const pct = recebido > 0 ? Math.round((gasto / recebido) * 100) : gasto > 0 ? 100 : 0;
  const empty = recebido === 0 && gasto === 0;
  const message = empty
    ? "Nenhum lançamento nesta carteira neste mês."
    : pct <= 80
    ? `Você destinou ${pct}% da sua renda e manteve uma ótima sobra este mês.`
    : pct <= 100
    ? `Você já destinou ${pct}% da sua renda — atenção ao restante do mês.`
    : "Seus gastos passaram do que entrou neste mês.";
  return { sobra: recebido - gasto, pct, bar: Math.min(100, pct), message, tone: pct <= 80 ? "ok" : pct <= 100 ? "warn" : "over" };
}
