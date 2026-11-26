/* Assistente financeira: a parte PURA (sem banco, sem rede).
 *
 * Aqui ficam o prompt, as ferramentas que a IA pode chamar e — o mais
 * importante — a checagem dos campos obrigatórios. Essa checagem é feita em
 * código, não pela IA: um modelo de linguagem pode achar que "gasto no
 * mercado" está completo sem valor. Separado de assistant.js para ser testado
 * sem Postgres nem Groq (server/test/assistant.test.mjs).
 *
 * A IA só PROPÕE. Nenhuma função deste arquivo, nem das rotas, grava no banco:
 * o app mostra um cartão de confirmação e grava pelas rotas normais.
 */

export const MONTH_RE = /^\d{4}-\d{2}$/;
export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/* Nomes das categorias padrão. Espelho de src/web/lib/catalog.jsx (CATS),
   que não pode ser importado aqui por trazer componentes React. */
export const DEFAULT_CATS = [
  "Moradia", "Educação", "Saúde", "Casa / Utilidades", "Telefonia", "Impostos",
  "Transporte", "Cartões / Financeiro", "Assinaturas / Serviços", "Lazer / Hobbies",
];

/** Padrão + as categorias personalizadas que a pessoa já usou, sem repetir. */
export const mergeCategories = (custom = []) => [...new Set([...DEFAULT_CATS, ...custom.filter(Boolean)])];

/* ---------- ferramentas (formato OpenAI, aceito pela Groq) ---------- */

export function buildTools(categories) {
  return [
    {
      type: "function",
      function: {
        name: "propose_expense",
        description: "Propõe lançar um GASTO. Preencha só o que o usuário disse; deixe ausente o que não foi dito.",
        parameters: {
          type: "object",
          properties: {
            description: { type: "string", description: "O que foi gasto, curto. Ex.: 'Mercado', 'Uber'." },
            value: { type: "number", description: "Valor em reais. NUNCA invente." },
            category: { type: "string", enum: categories },
            paymentMethod: { type: "string", description: "Forma de pagamento; use um nome da lista conhecida quando houver correspondência." },
            paidWithCltPj: { type: "boolean", description: "true se o usuário pediu para descontar do CLT / CLT-PJ / salário." },
            paidWithVoucher: { type: "boolean", description: "true se foi pago com vale (VR/VA)." },
            dueDate: { type: "string", description: "Vencimento AAAA-MM-DD, só se dito." },
            repeat: { type: "string", enum: ["none", "recurrent", "installments"] },
            installmentTotal: { type: "integer", description: "Número de parcelas (>= 2) se parcelado." },
            note: { type: "string" },
            month: { type: "string", description: "AAAA-MM. Só se o usuário citar um mês." },
          },
        },
      },
    },
    {
      type: "function",
      function: {
        name: "propose_income",
        description: "Propõe lançar um GANHO / receita.",
        parameters: {
          type: "object",
          properties: {
            source: { type: "string", description: "Fonte da renda. Ex.: 'Salário', 'Freela'." },
            value: { type: "number", description: "Valor em reais. NUNCA invente." },
            receiptDate: { type: "string", description: "AAAA-MM-DD, só se dito." },
            recurrent: { type: "boolean" },
            cltPjIncome: { type: "boolean", description: "true se é renda CLT / CLT-PJ." },
            voucherIncome: { type: "boolean", description: "true se é vale (VR/VA)." },
            note: { type: "string" },
            month: { type: "string", description: "AAAA-MM. Só se o usuário citar um mês." },
          },
        },
      },
    },
    {
      type: "function",
      function: {
        name: "propose_list_item",
        description: "Propõe adicionar um item à lista de Mercado, Farmácia ou Desejos.",
        parameters: {
          type: "object",
          properties: {
            list: { type: "string", enum: ["mercado", "farmacia", "wishlist"] },
            title: { type: "string" },
            value: { type: "number", description: "Preço estimado, opcional." },
            note: { type: "string" },
          },
          required: ["list"],
        },
      },
    },
  ];
}

export const ACTION_BY_TOOL = {
  propose_expense: "create_expense",
  propose_income: "create_income",
  propose_list_item: "create_list_item",
};

/* ---------- saneamento e validação ---------- */

const str = (v, max) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : undefined);
const numOrUndef = (v) => {
  const n = typeof v === "string" ? Number(v.replace(",", ".")) : v;
  return typeof n === "number" && Number.isFinite(n) ? Math.round(n * 100) / 100 : undefined;
};
const date = (v) => (typeof v === "string" && DATE_RE.test(v) ? v : undefined);

/* Só passa adiante o que a ferramenta declara, com tipo certo. O que a IA
   inventar fora do esquema morre aqui, antes de chegar ao app. */
export function sanitize(action, a = {}) {
  if (action === "create_expense") {
    const repeat = ["none", "recurrent", "installments"].includes(a.repeat) ? a.repeat : "none";
    const installments = Number.isInteger(a.installmentTotal) ? a.installmentTotal : undefined;
    return {
      description: str(a.description, 120),
      value: numOrUndef(a.value),
      category: str(a.category, 60),
      paymentMethod: str(a.paymentMethod, 60),
      paidWithCltPj: a.paidWithCltPj === true,
      paidWithVoucher: a.paidWithVoucher === true,
      dueDate: date(a.dueDate),
      repeat,
      installmentTotal: repeat === "installments" ? installments : undefined,
      note: str(a.note, 300),
      month: str(a.month, 7),
    };
  }
  if (action === "create_income") {
    return {
      source: str(a.source, 120),
      value: numOrUndef(a.value),
      receiptDate: date(a.receiptDate),
      recurrent: a.recurrent === true,
      cltPjIncome: a.cltPjIncome === true,
      voucherIncome: a.voucherIncome === true,
      note: str(a.note, 300),
      month: str(a.month, 7),
    };
  }
  if (action === "create_list_item") {
    return {
      list: ["mercado", "farmacia", "wishlist"].includes(a.list) ? a.list : undefined,
      title: str(a.title, 120),
      value: numOrUndef(a.value),
      note: str(a.note, 300),
    };
  }
  return {};
}

const hasValue = (v) => typeof v === "number" && v >= 0;

/** Mesmas regras do formulário da web (canSave no modal de item). */
export function missingFields(action, d) {
  const miss = [];
  if (action === "create_expense") {
    if (!d.description) miss.push("descrição");
    if (!hasValue(d.value)) miss.push("valor");
    if (!d.category) miss.push("categoria");
    if (d.repeat === "installments" && !(d.installmentTotal >= 2)) miss.push("número de parcelas");
  } else if (action === "create_income") {
    if (!d.source) miss.push("fonte da renda");
    if (!hasValue(d.value)) miss.push("valor");
  } else if (action === "create_list_item") {
    if (!d.list) miss.push("lista (mercado, farmácia ou desejos)");
    if (!d.title) miss.push("nome do item");
  }
  return miss;
}

const joinPt = (xs) => (xs.length <= 1 ? xs.join("") : `${xs.slice(0, -1).join(", ")} e ${xs.at(-1)}`);

/**
 * Resposta da IA → corpo devolvido ao app: `{ reply, proposal? }`.
 * `months` são os meses que a pessoa tem; lançar em mês inexistente vira aviso.
 */
export function buildResponse(message, months) {
  const call = message?.tool_calls?.[0];
  const text = typeof message?.content === "string" ? message.content.trim() : "";
  const action = ACTION_BY_TOOL[call?.function?.name];

  if (!action) return { reply: text || "Não entendi. Pode reformular?" };

  let args;
  try {
    args = JSON.parse(call.function.arguments || "{}");
  } catch {
    // Argumento malformado vira pergunta ao usuário, não silêncio.
    return { reply: "Não consegui montar o lançamento. Pode repetir com o valor e o que foi?" };
  }

  const data = sanitize(action, args);
  if (data.month !== undefined && !(MONTH_RE.test(data.month) && months.includes(data.month))) {
    return { reply: `O mês ${data.month} ainda não existe no app. Crie o mês antes, ou peça para lançar em outro mês.` };
  }
  if (data.month === undefined) delete data.month;

  const missing = missingFields(action, data);
  const reply = missing.length
    ? `Para lançar, preciso de: ${joinPt(missing)}. Pode me dizer?`
    : text || "Confira os dados e toque em Confirmar.";
  return { reply, proposal: { action, data, missing } };
}

/* ---------- contexto do mês ---------- */

const sum = (xs) => xs.reduce((s, x) => s + (Number(x.value) || 0), 0);
const brl = (n) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/* Os totais vão PRONTOS no prompt: modelo de linguagem erra soma. A conta
   do CLT-PJ é a mesma do card da Visão geral (recebido − gasto marcado). */
export function monthSummary(month, { expenses = [], incomes = [] }) {
  const cltIn = sum(incomes.filter((i) => i.cltPjIncome));
  const cltOut = sum(expenses.filter((e) => e.paidWithCltPj));
  const totalIn = sum(incomes);
  const totalOut = sum(expenses);
  return [
    `Dados do mês ${month}:`,
    `- Ganhos ${brl(totalIn)}; gastos ${brl(totalOut)}; saldo ${brl(totalIn - totalOut)}.`,
    `- Carteira CLT-PJ: recebido ${brl(cltIn)}, gasto ${brl(cltOut)}, sobra ${brl(cltIn - cltOut)}.`,
    `- Gastos pagos ${brl(sum(expenses.filter((e) => e.paidAt)))}; a pagar ${brl(sum(expenses.filter((e) => !e.paidAt)))}.`,
    "Gastos:",
    ...expenses.slice(0, 80).map((e) =>
      [`  • ${e.description}`, e.category, brl(Number(e.value)), e.paidAt && "pago", e.paidWithCltPj && "CLT-PJ",
        e.paymentMethod, e.dueDate && `vence ${e.dueDate}`].filter(Boolean).join(" | ")
    ),
    "Ganhos:",
    ...incomes.slice(0, 40).map((i) =>
      [`  • ${i.source}`, brl(Number(i.value)), i.cltPjIncome && "CLT-PJ", i.voucherIncome && "vale"].filter(Boolean).join(" | ")
    ),
  ].join("\n");
}

export function systemPrompt({ month, today, months, categories, paymentMethods, summary }) {
  return [
    "Você é a assistente financeira pessoal do app Meu Financeiro. Responda em português do Brasil, curto e direto.",
    `O mês corrente é ${today}. O usuário está vendo o mês ${month}. Meses existentes: ${months.join(", ") || "nenhum"}.`,
    "Quando o usuário pedir para lançar, criar ou registrar algo, chame UMA ferramenta: propose_expense, propose_income ou propose_list_item.",
    "Regras:",
    "- Preencha só o que o usuário disse ou o que está claro na conversa. NUNCA invente valor.",
    "- Categoria: escolha da lista quando for óbvio (mercado → Casa / Utilidades, uber → Transporte, remédio → Saúde). Se não for óbvio, deixe vazia.",
    "- 'Descontar do CLT', 'do CLT-PJ', 'do salário' ⇒ paidWithCltPj = true. 'Vale', 'VR', 'VA' ⇒ vale.",
    "- 'No mês atual' ⇒ month = mês corrente. Sem menção a mês ⇒ não preencha month.",
    "- Se o usuário completar um pedido anterior, chame a ferramenta de novo com TODOS os campos reunidos.",
    "- Você não grava nada: o app mostra um cartão para o usuário confirmar.",
    "- Perguntas sobre números: use só os dados abaixo, que já estão calculados.",
    `Categorias: ${categories.join(", ")}.`,
    `Formas de pagamento conhecidas: ${paymentMethods.join(", ")}.`,
    "",
    summary,
  ].join("\n");
}

/* Só papéis e conteúdo de texto; tamanho limitado (custo e prompt injection
   por volume). As últimas `max` mensagens bastam para o contexto. */
export function cleanHistory(messages, max = 12, maxChars = 2000) {
  if (!Array.isArray(messages)) return [];
  return messages
    .filter((m) => (m?.role === "user" || m?.role === "assistant") && typeof m.content === "string" && m.content.trim())
    .slice(-max)
    .map((m) => ({ role: m.role, content: m.content.slice(0, maxChars) }));
}
