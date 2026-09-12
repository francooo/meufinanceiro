import { catMeta, PAYMENT_METHOD_FALLBACK } from "./catalog.js";

const sum = (items) => items.reduce((s, i) => s + (Number(i.value) || 0), 0);

/* Portado de meu-caixa.jsx:1511 — ordenacao por valor, nao mutante. */
export function sortByValueSort(items, valueSort) {
  if (valueSort === "desc") return [...items].sort((a, b) => (Number(b.value) || 0) - (Number(a.value) || 0));
  if (valueSort === "asc") return [...items].sort((a, b) => (Number(a.value) || 0) - (Number(b.value) || 0));
  return items;
}

/* A ordem padrao da web: `order` manual primeiro (nulos por ultimo), depois
   maior valor. Repetida em varios pontos do arquivo original. */
const byOrderThenValue = (a, b) => {
  if (a.order != null && b.order != null) return a.order - b.order;
  if (a.order != null) return -1;
  if (b.order != null) return 1;
  return (b.value || 0) - (a.value || 0);
};

/* Portado de meu-caixa.jsx:1517. So a categoria "Cartoes / Financeiro" usa isto
   na web, para sub-agrupar por cartao dentro do grupo. */
export function groupByPaymentMethod(items, valueSort = "none") {
  const m = new Map();
  for (const e of items) {
    const key = e.paymentMethod || PAYMENT_METHOD_FALLBACK;
    if (!m.has(key)) m.set(key, []);
    m.get(key).push(e);
  }
  return [...m.entries()]
    .map(([name, groupItems]) => ({
      name,
      items: valueSort !== "none" ? sortByValueSort(groupItems, valueSort) : [...groupItems].sort(byOrderThenValue),
      subtotal: sum(groupItems),
    }))
    .sort((a, b) => b.subtotal - a.subtotal);
}

/* Espelha o memo gastosGrouped da web (meu-caixa.jsx:553). */
export function buildGastosGrouped(expenses) {
  const m = new Map();
  for (const e of expenses) {
    if (!m.has(e.category)) m.set(e.category, []);
    m.get(e.category).push(e);
  }
  return [...m.entries()]
    .map(([name, items]) => ({
      name,
      ...catMeta(name),
      items: [...items].sort(byOrderThenValue),
      subtotal: sum(items),
    }))
    .sort((a, b) => b.subtotal - a.subtotal);
}

/* Os filtros da aba Gastos da web, na mesma ordem: busca, forma de pagamento,
   intervalo de vencimento, depois ocultar pagos e ordenacao por valor.

   IMPORTANTE — o total exibido NAO reflete `hidePaid`. Isso e deliberado na web
   (comentario em meu-caixa.jsx:1294): ocultar pagos e uma lente visual sobre o
   que falta pagar, nao pode mudar o total de gastos do mes. Por isso ha dois
   resultados: `grouped` (o que aparece) e `totalGrouped` (o que soma). */
export function applyGastosFilters(grouped, f) {
  const query = (f.search || "").trim().toLowerCase();

  const common = (list) => {
    if (!(query || f.paymentMethod || f.dueFrom || f.dueTo)) return list;
    return list
      .map((g) => {
        let items = g.items;
        if (query) items = items.filter((e) => e.description.toLowerCase().includes(query));
        if (f.paymentMethod) {
          items = items.filter((e) => (e.paymentMethod || PAYMENT_METHOD_FALLBACK) === f.paymentMethod);
        }
        if (f.dueFrom) items = items.filter((e) => e.dueDate && e.dueDate >= f.dueFrom);
        if (f.dueTo) items = items.filter((e) => e.dueDate && e.dueDate <= f.dueTo);
        return { ...g, items, subtotal: sum(items) };
      })
      .filter((g) => g.items.length > 0);
  };

  const totalGrouped = common(grouped);

  let result = totalGrouped;
  if (f.hidePaid) {
    result = result
      .map((g) => {
        const items = g.items.filter((e) => !e.paidAt);
        return { ...g, items, subtotal: sum(items) };
      })
      .filter((g) => g.items.length > 0);
  }
  if (f.valueSort && f.valueSort !== "none") {
    result = result.map((g) => ({ ...g, items: sortByValueSort(g.items, f.valueSort) }));
  }

  return {
    grouped: result,
    visibleTotal: totalGrouped.reduce((s, g) => s + g.subtotal, 0),
    otherFiltersActive: !!(query || f.paymentMethod || f.dueFrom || f.dueTo || (f.valueSort && f.valueSort !== "none")),
  };
}
