/* Reordenacao manual: troca o item com o vizinho e reescreve `order` como o
   indice de TODOS os itens do grupo. Reescrever o grupo inteiro — em vez de so
   os dois que trocaram — e o que garante indices densos, sem os quais itens que
   ainda tem `order: null` ficariam presos no fim para sempre.

   Portado de moveExpense/moveSerasaItem da web (meu-caixa.jsx), que repetem
   este mesmo algoritmo tres vezes; aqui e uma funcao so. */
export function reorderWithin(items, id, direction) {
  const idx = items.findIndex((e) => e.id === id);
  const target = idx + (direction === "up" ? -1 : 1);
  /* Fora do intervalo significa que o item ja esta na ponta: devolver null
     deixa quem chamou pular o setState em vez de gravar o que ja estava la. */
  if (idx === -1 || target < 0 || target >= items.length) return null;

  const swapped = [...items];
  [swapped[idx], swapped[target]] = [swapped[target], swapped[idx]];
  return new Map(swapped.map((e, i) => [e.id, i]));
}

/* Aplica o mapa devolvido acima sobre a colecao inteira: so os itens do grupo
   reordenado recebem `order` novo, o resto passa intacto. */
export const applyOrder = (all, orderById) =>
  all.map((e) => (orderById.has(e.id) ? { ...e, order: orderById.get(e.id) } : e));
