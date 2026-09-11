/* extensao explicita: mantem os modulos de core/ carregaveis por Node puro,
   o que permite testa-los sem o runtime do React Native. */
import { catMeta } from "./catalog.js";

const sum = (items) => items.reduce((s, i) => s + (Number(i.value) || 0), 0);

/* Mesma derivacao do byCat da web (meu-caixa.jsx:541): categorias com valor,
   maiores primeiro, zeradas fora. */
export function buildByCat(expenses) {
  const m = new Map();
  for (const e of expenses) m.set(e.category, (m.get(e.category) || 0) + (Number(e.value) || 0));
  return [...m.entries()]
    .filter(([, value]) => value > 0)
    .map(([name, value]) => ({ name, value, ...catMeta(name) }))
    .sort((a, b) => b.value - a.value);
}

/* Espelha recentItems do Overview (meu-caixa.jsx:1256): gastos e ganhos que
   tenham createdAt, mais novos primeiro. */
export function buildRecentItems(expenses, incomes, limit = 8) {
  return [
    ...expenses.map((e) => ({ kind: "expense", label: e.description, item: e })),
    ...incomes.map((i) => ({ kind: "income", label: i.source, item: i })),
  ]
    .filter((it) => it.item.createdAt)
    .sort((a, b) => (a.item.createdAt < b.item.createdAt ? 1 : -1))
    .slice(0, limit);
}

export const totalOf = sum;
