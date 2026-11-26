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
        name: READ_TOOL,
        description:
          "Lê os gastos e ganhos de OUTRO mês (diferente do que já está nos dados). Use quando a pergunta for sobre um mês específico, como 'mês passado' ou 'setembro'.",
        parameters: {
          type: "object",
          properties: { month: { type: "string", description: "AAAA-MM" } },
          required: ["month"],
        },
      },
    },
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

/** Ferramenta de LEITURA: o servidor responde com os dados e a IA continua. */
export const READ_TOOL = "consultar_mes";

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

const MONTH_NAMES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
/** "2026-10" → "outubro de 2026" (a pessoa fala assim; a IA precisa casar os dois). */
export const monthName = (key) => {
  const [y, m] = String(key).split("-").map(Number);
  return MONTH_NAMES[m - 1] ? `${MONTH_NAMES[m - 1]} de ${y}` : String(key);
};

/* created_at é TIMESTAMPTZ: o pg devolve Date. Linhas antigas têm NULL. */
const timeOf = (v) => {
  if (!v) return null;
  const t = (v instanceof Date ? v : new Date(v)).getTime();
  return Number.isFinite(t) ? t : null;
};
/* A Vercel roda em UTC; a pessoa vive no fuso de Brasília. */
const dayOf = (t) => new Date(t).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });

/** Mais recente primeiro; sem data de inclusão vai para o fim, na ordem da tela. */
const byNewest = (xs) =>
  xs
    .map((x, i) => ({ x, i, t: timeOf(x.createdAt) }))
    .sort((a, b) => (b.t ?? -Infinity) - (a.t ?? -Infinity) || a.i - b.i)
    .map(({ x, t }) => ({ ...x, _t: t }));

function lastLine(label, items, describe) {
  if (items.length === 0) return `- Nenhum ${label} lançado neste mês.`;
  const newest = items.find((x) => x._t != null);
  if (!newest) return `- Último ${label} incluído: desconhecido (os lançamentos deste mês não têm data de inclusão).`;
  return `- Último ${label} incluído: ${describe(newest)}, em ${dayOf(newest._t)}.`;
}

/* Os totais vão PRONTOS no prompt: modelo de linguagem erra soma. A conta
   do CLT-PJ é a mesma do card da Visão geral (recebido − gasto marcado).
   A lista vem na ordem de inclusão, com a data, e o último item é dito com
   todas as letras: sem isso a IA não tem como responder "qual foi o último".

   Formato ENXUTO de propósito: o plano gratuito da Groq dá 8 mil tokens por
   minuto, e uma pergunta sobre outro mês manda dois resumos. Por isso só os
   itens mais recentes, valor sem "R$" repetido e data curta (dd/mm). */
export const SUMMARY_LIMITS = { expenses: 40, incomes: 15 };

const num2 = (n) => Number(n || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const shortDay = (t) => dayOf(t).slice(0, 5);
const shortIso = (iso) => (typeof iso === "string" && DATE_RE.test(iso) ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}` : null);

export function monthSummary(month, { expenses = [], incomes = [] }) {
  const cltIn = sum(incomes.filter((i) => i.cltPjIncome));
  const cltOut = sum(expenses.filter((e) => e.paidWithCltPj));
  const totalIn = sum(incomes);
  const totalOut = sum(expenses);
  const exp = byNewest(expenses);
  const inc = byNewest(incomes);
  const { expenses: maxE, incomes: maxI } = SUMMARY_LIMITS;

  return [
    `Dados de ${monthName(month)} (${month}): ${expenses.length} gasto(s) e ${incomes.length} ganho(s). Valores em R$.`,
    `- Ganhos ${num2(totalIn)}; gastos ${num2(totalOut)}; saldo ${num2(totalIn - totalOut)}.`,
    `- CLT-PJ: recebido ${num2(cltIn)}, gasto ${num2(cltOut)}, sobra ${num2(cltIn - cltOut)}.`,
    `- Pagos ${num2(sum(expenses.filter((e) => e.paidAt)))}; a pagar ${num2(sum(expenses.filter((e) => !e.paidAt)))}.`,
    lastLine("gasto", exp, (e) => `${e.description} (${e.category || "sem categoria"}, R$ ${num2(e.value)})`),
    lastLine("ganho", inc, (i) => `${i.source} (R$ ${num2(i.value)})`),
    `Gastos, mais recente primeiro${expenses.length > maxE ? ` (${maxE} mais recentes)` : ""}; campos: descrição; categoria; valor; situação; incluído em:`,
    ...exp.slice(0, maxE).map((e) =>
      [e.description, e.category, num2(e.value), e.paidAt ? "pago" : shortIso(e.dueDate) ? `vence ${shortIso(e.dueDate)}` : "a pagar",
        e.paidWithCltPj && "CLT-PJ", e.paymentMethod, e._t != null ? shortDay(e._t) : "sem data"].filter(Boolean).join("; ")
    ),
    `Ganhos, mais recente primeiro${incomes.length > maxI ? ` (${maxI} mais recentes)` : ""}:`,
    ...inc.slice(0, maxI).map((i) =>
      [i.source, num2(i.value), i.cltPjIncome && "CLT-PJ", i.voucherIncome && "vale", i._t != null ? shortDay(i._t) : "sem data"].filter(Boolean).join("; ")
    ),
  ].join("\n");
}

export function systemPrompt({ month, today, months, categories, paymentMethods, summary }) {
  return [
    "Você é a assistente financeira pessoal do app Meu Financeiro. Responda em português do Brasil, curto e direto.",
    `O mês corrente é ${monthName(today)} (${today}); "mês passado" é o anterior a ele. O usuário está vendo ${monthName(month)} (${month}).`,
    `Meses existentes (AAAA-MM): ${months.join(", ") || "nenhum"}.`,
    "Quando o usuário pedir para lançar, criar ou registrar algo, chame UMA ferramenta: propose_expense, propose_income ou propose_list_item.",
    `Para perguntas sobre um mês diferente do que está nos dados abaixo, chame ${READ_TOOL} com esse mês antes de responder.`,
    "Regras:",
    "- Preencha só o que o usuário disse ou o que está claro na conversa. NUNCA invente valor.",
    "- Categoria: escolha da lista quando for óbvio (mercado → Casa / Utilidades, uber → Transporte, remédio → Saúde). Se não for óbvio, deixe vazia.",
    "- 'Descontar do CLT', 'do CLT-PJ', 'do salário' ⇒ paidWithCltPj = true. 'Vale', 'VR', 'VA' ⇒ vale.",
    "- 'No mês atual' ⇒ month = mês corrente. Sem menção a mês ⇒ não preencha month.",
    "- Se o usuário completar um pedido anterior, chame a ferramenta de novo com TODOS os campos reunidos.",
    "- Você não grava nada: o app mostra um cartão para o usuário confirmar.",
    "- Perguntas sobre os lançamentos: responda só com os dados recebidos, que já estão calculados e ordenados. Se os dados mostram lançamentos, nunca diga que não há registro.",
    `Categorias: ${categories.join(", ")}.`,
    `Formas de pagamento conhecidas: ${paymentMethods.join(", ")}.`,
    "",
    summary,
  ].join("\n");
}

/* ---------- mês citado na pergunta ---------- */

const MONTH_WORDS = { janeiro: 1, fevereiro: 2, marco: 3, abril: 4, maio: 5, junho: 6, julho: 7, agosto: 8, setembro: 9, outubro: 10, novembro: 11, dezembro: 12 };
const shiftMonth = (key, n) => {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
};

/**
 * Mês que a pessoa citou no texto ("outubro de 2026", "out/2026", "mês
 * passado", "este mês"), em AAAA-MM; null se não citou. Sem ano, vale o
 * mais recente que não seja futuro em relação a `today`.
 *
 * Serve para mandar os dados CERTOS já na primeira chamada: consultar outro
 * mês pela ferramenta custa uma segunda chamada, e o plano gratuito da Groq
 * tem só 8 mil tokens por minuto.
 */
export function monthMentioned(text, today) {
  // sem acentos: "mês" → "mes", "março" → "marco"
  const t = String(text || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  if (/\bmes (passado|anterior)\b/.test(t)) return shiftMonth(today, -1);
  if (/\b(este|esse|neste|nesse) mes\b|\bmes (atual|corrente)\b/.test(t)) return today;

  const names = Object.keys(MONTH_WORDS).join("|");
  const abbr = "jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez";
  const m =
    new RegExp(String.raw`\b(${names})\b(?:\s*(?:de|/|-)?\s*(\d{4}))?`).exec(t) ||
    new RegExp(String.raw`\b(${abbr})\s*[/-]\s*(\d{4})\b`).exec(t);
  if (!m) return null;
  const word = m[1];
  const monthNum = MONTH_WORDS[word] || abbr.split("|").indexOf(word) + 1;
  if (!monthNum) return null;
  if (m[2]) return `${m[2]}-${String(monthNum).padStart(2, "0")}`;
  const [ty, tm] = today.split("-").map(Number);
  const year = monthNum > tm ? ty - 1 : ty;
  return `${year}-${String(monthNum).padStart(2, "0")}`;
}

/* ---------- limite de uso da Groq ---------- */

/**
 * Lê um 429 da Groq: qual limite estourou e quando libera. Usa a mensagem do
 * corpo ("... on tokens per minute (TPM): Limit 8000, Used 6130, Requested
 * 3069 ...") e os cabeçalhos x-ratelimit-*. Não guarda a mensagem crua: ela
 * traz o id da organização na Groq.
 *
 * @param {(name: string) => string|null} header
 * @param {string} bodyText
 */
export function rateLimitInfo(header, bodyText = "") {
  let message = "";
  try {
    message = String(JSON.parse(bodyText)?.error?.message || "");
  } catch {
    message = String(bodyText || ""); // corpo não-JSON: ainda dá para procurar as siglas
  }
  const kind = /\(TPD\)|tokens per day/i.test(message) ? "tpd"
    : /\(RPD\)|requests per day/i.test(message) ? "rpd"
    : /\(TPM\)|tokens per minute/i.test(message) ? "tpm"
    : /\(RPM\)|requests per minute/i.test(message) ? "rpm"
    : "unknown";
  const pick = (re) => {
    const m = re.exec(message);
    return m ? Number(m[1]) : null;
  };
  const retry = Number(header("retry-after"));
  return {
    kind,
    daily: kind === "tpd" || kind === "rpd",
    retryAfterSeconds: Number.isFinite(retry) && retry > 0 ? retry : null,
    limit: pick(/Limit (\d+)/i),
    used: pick(/Used (\d+)/i),
    requested: pick(/Requested (\d+)/i),
    remainingTokensMinute: header("x-ratelimit-remaining-tokens"),
  };
}

/** Mensagem para a pessoa, conforme o limite que estourou. */
export function rateLimitMessage(info) {
  if (info?.daily) return "A IA atingiu o limite diário de uso. Tente de novo amanhã.";
  const wait = info?.retryAfterSeconds ? Math.ceil(info.retryAfterSeconds) : null;
  return wait && wait <= 90
    ? `A IA está no limite de uso por minuto. Aguarde uns ${wait} segundos e tente de novo.`
    : "A IA está no limite de uso por minuto. Aguarde um minuto e tente de novo.";
}

/* ---------- laço da conversa ---------- */

const MAX_READS = 2;

/**
 * Conversa com a IA, atendendo às leituras de outros meses (consultar_mes)
 * até chegar a uma resposta final. Puro: o modelo e o banco entram por função.
 *
 * @param {object}   o
 * @param {Array}    o.messages   system + histórico
 * @param {string[]} o.months     meses que a pessoa tem
 * @param {(messages) => Promise<object>} o.callModel  devolve a `message` da IA
 * @param {(month) => Promise<object>}    o.loadMonth  devolve { expenses, incomes }
 * @returns {Promise<{ response: object, reads: string[] }>}
 */
export async function runChat({ messages, months, callModel, loadMonth }) {
  const convo = [...messages];
  const reads = [];
  let message = await callModel(convo);

  while (message?.tool_calls?.[0]?.function?.name === READ_TOOL && reads.length < MAX_READS) {
    const call = message.tool_calls[0];
    let month;
    try {
      month = JSON.parse(call.function.arguments || "{}").month;
    } catch {
      month = undefined; // vira resposta "mês inválido" abaixo, não silêncio
    }
    const content =
      typeof month !== "string" || !MONTH_RE.test(month)
        ? "Mês inválido. Use AAAA-MM."
        : !months.includes(month)
          ? `${monthName(month)} (${month}) não existe no app: não há lançamentos nesse mês.`
          : monthSummary(month, await loadMonth(month));
    if (typeof month === "string") reads.push(month);
    convo.push({ role: "assistant", content: message.content || "", tool_calls: [call] });
    convo.push({ role: "tool", tool_call_id: call.id, content });
    message = await callModel(convo);
  }

  /* Pediu uma terceira leitura: responde com o que tem em vez de entrar em laço. */
  if (message?.tool_calls?.[0]?.function?.name === READ_TOOL) {
    return { response: { reply: "Não consegui juntar os dados para responder. Pode perguntar sobre um mês de cada vez?" }, reads };
  }
  return { response: buildResponse(message, months), reads };
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
