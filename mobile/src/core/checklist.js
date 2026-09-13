/* Desejos, Mercado e Farmácia são a mesma forma: itens com título, valor e um
   `doneAt` que diz se já saiu da lista. Pendentes primeiro, feitos depois, e o
   total conta só os pendentes — é o que ainda vai custar dinheiro. */

const byOrderThenTitle = (a, b) => {
  if (a.order != null && b.order != null) return a.order - b.order;
  if (a.order != null) return -1;
  if (b.order != null) return 1;
  return (a.title || "").localeCompare(b.title || "");
};

export function splitChecklist(items) {
  const pending = items.filter((i) => !i.doneAt).sort(byOrderThenTitle);
  const done = items.filter((i) => i.doneAt).sort(byOrderThenTitle);
  return {
    pending,
    done,
    ordered: [...pending, ...done],
    totalPending: pending.reduce((s, i) => s + (Number(i.value) || 0), 0),
  };
}
