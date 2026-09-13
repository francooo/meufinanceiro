/* Calculadora de seleção. Portada de meu-caixa.jsx, incluindo as duas decisões
   que a web documenta:

   1. A seleção NUNCA entra nos objetos de dado. Toda escrita aqui substitui a
      coleção inteira, então uma flag `selected` no item faria um PUT do mês
      por toque de caixinha.
   2. A soma sai das coleções completas, nunca das listas já filtradas — senão
      o total mudaria a cada letra digitada numa busca. */

export const SELECTION_SOURCES = {
  expense: { direction: -1, one: "gasto", many: "gastos" },
  income: { direction: 1, one: "ganho", many: "ganhos" },
  wish: { direction: -1, one: "desejo", many: "desejos" },
  mercado: { direction: -1, one: "item de mercado", many: "itens de mercado" },
  farmacia: { direction: -1, one: "item de farmácia", many: "itens de farmácia" },
  serasa: { direction: -1, one: "dívida", many: "dívidas" },
};

export const selKey = (kind, id) => `${kind}:${id}`;

export function toggleKey(set, kind, id) {
  const next = new Set(set); // clonar e obrigatorio: mutar nao re-renderiza
  const k = selKey(kind, id);
  if (next.has(k)) next.delete(k);
  else next.add(k);
  return next;
}

/* `buckets` e [[kind, lista], ...]. A contagem usa itens realmente ENCONTRADOS,
   nao selectedKeys.size — assim uma chave orfa (item excluido) some sozinha da
   conta, e nenhum efeito precisa vigiar as colecoes para limpa-la. */
export function selectionStats(selectedKeys, buckets) {
  let count = 0;
  let inflow = 0;
  let outflow = 0;
  const byKind = [];

  if (selectedKeys.size > 0) {
    for (const [kind, list] of buckets) {
      let n = 0;
      for (const it of list || []) {
        if (!selectedKeys.has(selKey(kind, it.id))) continue;
        n += 1;
        const v = Number(it.value) || 0;
        if (SELECTION_SOURCES[kind].direction > 0) inflow += v;
        else outflow += v;
      }
      if (n > 0) byKind.push({ kind, n });
      count += n;
    }
  }

  return { count, inflow, outflow, net: inflow - outflow, mixed: inflow > 0 && outflow > 0, byKind };
}

/* Com uma origem so, a quebra ja e a contagem ("2 gastos"); com varias, o total
   vem na frente para sobreviver ao corte de texto numa tela estreita. */
export function selectionLabel(stats) {
  const parts = stats.byKind.map(
    ({ kind, n }) => `${n} ${n === 1 ? SELECTION_SOURCES[kind].one : SELECTION_SOURCES[kind].many}`
  );
  const breakdown = parts.join(" · ");
  if (parts.length <= 1) return breakdown;
  return `${stats.count} itens · ${breakdown}`;
}

/* Trocar de mes invalida so as chaves do mes: wishlist, listas de compra,
   serasa e cartoes sao colecoes globais. */
export function pruneMonthKeys(selectedKeys) {
  if (selectedKeys.size === 0) return selectedKeys;
  const next = new Set(
    [...selectedKeys].filter((k) => !k.startsWith("expense:") && !k.startsWith("income:"))
  );
  return next.size === selectedKeys.size ? selectedKeys : next;
}
