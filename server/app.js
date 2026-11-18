import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import {
  getData, getMonths, replaceMonthData, moveExpenseToMonth, getPaymentMethods, getCategories, createMonth,
  currentMonth, getWishlist, replaceWishlist, getShoppingList, replaceShoppingList, getSerasaItems,
  replaceSerasaItems, getCards, replaceCards, getCardClosings, replaceCardClosings, createPairingCode,
  consumePairingCode, ensureUser, deleteUserData, hitRateLimit, normalizeEmail, NotFoundError,
  MAX_ITEMS, MAX_ID_LENGTH,
} from "./db.js";
import {
  verifyGoogleCredential, signSession, setSessionCookie, clearSessionCookie, getSessionEmail, requireAuth,
  isAllowedEmail, generatePairingCode, formatPairingCode, normalizePairingCode, isPairingCodeShaped,
  hashPairingCode, PAIR_TTL_MINUTES,
} from "./auth.js";

const MONTH_RE = /^\d{4}-\d{2}$/;

/* CORS so para o proprio site (APP_ORIGIN, separado por virgula) e localhost no
   dev. O app do celular nao manda Origin e usa Bearer, entao passa direto. */
const ORIGINS = String(process.env.APP_ORIGIN || "")
  .split(",")
  .map((o) => o.trim().replace(/\/$/, ""))
  .filter(Boolean);
const corsOrigin = (origin, cb) => {
  if (!origin || ORIGINS.includes(origin) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return cb(null, true);
  cb(null, false);
};

export const app = express();
app.disable("x-powered-by");
app.set("trust proxy", true);
app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("X-Frame-Options", "DENY");
  next();
});
app.use(cors({ origin: corsOrigin }));
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());

/* Corpo acima de 1 MB ou JSON invalido: resposta curta, sem stack. */
app.use((err, _req, res, next) => {
  if (err?.type === "entity.too.large") return res.status(413).json({ error: "Conteúdo grande demais." });
  if (err?.type === "entity.parse.failed") return res.status(400).json({ error: "JSON inválido." });
  next(err);
});

/* Limite de tentativas por IP nas rotas publicas de entrada. Falha do banco
   aqui nao trava ninguem do lado de fora: deixa passar e registra. */
// Na Vercel, x-real-ip e o IP do cliente posto pela propria plataforma.
const clientIp = (req) =>
  String(req.headers["x-real-ip"] || req.headers["x-forwarded-for"] || req.ip || "").split(",")[0].trim() || "desconhecido";
const rateLimit = (name, limit, windowSeconds) => async (req, res, next) => {
  try {
    if (!(await hitRateLimit(`${name}:${clientIp(req)}`, limit, windowSeconds))) {
      return res.status(429).json({ error: "Muitas tentativas. Aguarde um minuto e tente de novo." });
    }
  } catch (err) {
    console.error(`rate limit ${name} failed:`, err);
  }
  next();
};

/* Listas enviadas nos PUT: tamanho maximo e id valido em cada item. */
function badItems(list) {
  if (!Array.isArray(list)) return "deve ser um array";
  if (list.length > MAX_ITEMS) return `no máximo ${MAX_ITEMS} itens`;
  for (const it of list) {
    if (!it || typeof it !== "object" || typeof it.id !== "string" || !it.id || it.id.length > MAX_ID_LENGTH) {
      return "cada item precisa de um id válido";
    }
  }
  return null;
}

app.post("/api/auth/google", rateLimit("login", 20, 60), async (req, res) => {
  const { credential, client } = req.body || {};
  if (typeof credential !== "string" || !credential) {
    return res.status(400).json({ error: "Credencial ausente." });
  }
  let identity;
  try {
    identity = await verifyGoogleCredential(credential);
  } catch (err) {
    return res.status(401).json({ error: err.message || "Falha na autenticação." });
  }
  try {
    const { isNew } = await ensureUser(identity.email, identity.name);
    const { token, expiresAt } = signSession(identity.email);

    // O cookie continua sendo emitido sempre — é o que o front web usa.
    setSessionCookie(res, token);

    // O token no CORPO só vai para cliente não-browser. Devolvê-lo a uma
    // página anularia o httpOnly: um XSS poderia exfiltrar a sessão.
    const isMobile = client === "mobile";
    res.json({ ok: true, email: identity.email, isNew, ...(isMobile ? { token, expiresAt } : null) });
  } catch (err) {
    console.error("POST /api/auth/google failed:", err);
    res.status(500).json({ error: "Falha ao entrar. Tente de novo." });
  }
});

app.get("/api/auth/me", async (req, res) => {
  try {
    const email = await getSessionEmail(req);
    if (!email) return res.status(401).json({ error: "Não autenticado." });
    res.json({ email });
  } catch (err) {
    console.error("GET /api/auth/me failed:", err);
    res.status(500).json({ error: "Falha ao validar a sessão." });
  }
});

app.post("/api/auth/logout", (_req, res) => {
  clearSessionCookie(res);
  res.json({ ok: true });
});

/* "Excluir minha conta": o e-mail digitado no corpo precisa bater com o da
   sessão — confirmação explícita de que é isso mesmo, nunca o alvo da exclusão. */
app.delete("/api/account", requireAuth, async (req, res) => {
  if (normalizeEmail(req.body?.confirm) !== req.userEmail) {
    return res.status(400).json({ error: "Digite o e-mail da conta para confirmar." });
  }
  try {
    await deleteUserData(req.userEmail);
    clearSessionCookie(res);
    res.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/account failed:", err);
    res.status(500).json({ error: "Falha ao excluir a conta." });
  }
});

app.get("/api/card-closings", requireAuth, async (req, res) => {
  const month = typeof req.query.month === "string" && MONTH_RE.test(req.query.month)
    ? req.query.month
    : currentMonth();
  try {
    const items = await getCardClosings(req.userEmail, month);
    res.json({ month, items });
  } catch (err) {
    console.error("GET /api/card-closings failed:", err);
    res.status(500).json({ error: "Falha ao carregar os fechamentos de cartão." });
  }
});

app.put("/api/card-closings", requireAuth, async (req, res) => {
  const month = req.query.month;
  const { items } = req.body || {};
  if (typeof month !== "string" || !MONTH_RE.test(month)) {
    return res.status(400).json({ error: "Mês inválido. Use o formato AAAA-MM." });
  }
  const bad = badItems(items);
  if (bad) return res.status(400).json({ error: `Payload inválido: items ${bad}.` });
  try {
    await replaceCardClosings(req.userEmail, month, items);
    res.json({ ok: true });
  } catch (err) {
    console.error("PUT /api/card-closings failed:", err);
    res.status(500).json({ error: "Falha ao salvar os fechamentos de cartão." });
  }
});

// Pareia um celular sem OAuth: a web — já autenticada — emite um código de uso
// único que o celular troca por um token Bearer da mesma conta.
app.post("/api/auth/pair", requireAuth, async (req, res) => {
  try {
    const code = generatePairingCode();
    const { expiresAt } = await createPairingCode(req.userEmail, hashPairingCode(code), PAIR_TTL_MINUTES);
    // O código em claro só existe aqui e na tela: o banco guarda o HMAC.
    res.json({ code: formatPairingCode(code), expiresAt });
  } catch (err) {
    console.error("POST /api/auth/pair failed:", err);
    res.status(500).json({ error: "Falha ao gerar o código de pareamento." });
  }
});

app.post("/api/auth/pair/redeem", rateLimit("redeem", 10, 60), async (req, res) => {
  const code = normalizePairingCode(req.body?.code);
  // Uma resposta só para formato inválido, código errado, expirado e já usado:
  // distinguir qualquer um deles entrega um oráculo a quem varre o endpoint.
  const deny = () => res.status(400).json({ error: "Código inválido ou expirado." });
  if (!isPairingCodeShaped(code)) return deny();
  try {
    const email = await consumePairingCode(hashPairingCode(code));
    // Reconferido aqui e não só na emissão: código gerado antes de a lista de
    // contas fechar não pode virar sessão de 30 dias.
    if (!email || !isAllowedEmail(email)) return deny();
    // Sem setSessionCookie: esta resposta vai para um cliente nativo, nunca para
    // uma página — dois mecanismos de sessão sobrepostos só criariam confusão.
    const { token, expiresAt } = signSession(email);
    res.json({ token, expiresAt, email: normalizeEmail(email) });
  } catch (err) {
    console.error("POST /api/auth/pair/redeem failed:", err);
    res.status(500).json({ error: "Falha ao parear o dispositivo." });
  }
});

app.get("/api/months", requireAuth, async (req, res) => {
  try {
    const months = await getMonths(req.userEmail);
    res.json({ months });
  } catch (err) {
    console.error("GET /api/months failed:", err);
    res.status(500).json({ error: "Falha ao carregar os meses disponíveis." });
  }
});

app.post("/api/months", requireAuth, async (req, res) => {
  const { month } = req.body || {};
  if (typeof month !== "string" || !MONTH_RE.test(month)) {
    return res.status(400).json({ error: "Mês inválido. Use o formato AAAA-MM." });
  }
  try {
    const data = await createMonth(req.userEmail, month);
    res.json({ month, ...data });
  } catch (err) {
    console.error("POST /api/months failed:", err);
    res.status(400).json({ error: err.message || "Falha ao criar o mês." });
  }
});

app.get("/api/data", requireAuth, async (req, res) => {
  const month = typeof req.query.month === "string" && MONTH_RE.test(req.query.month)
    ? req.query.month
    : currentMonth();
  try {
    const data = await getData(req.userEmail, month);
    res.json({ month, ...data });
  } catch (err) {
    console.error("GET /api/data failed:", err);
    res.status(500).json({ error: "Falha ao carregar dados do banco." });
  }
});

app.put("/api/data", requireAuth, async (req, res) => {
  const { month, expenses, incomes } = req.body || {};
  if (typeof month !== "string" || !MONTH_RE.test(month)) {
    return res.status(400).json({ error: "Mês inválido. Use o formato AAAA-MM." });
  }
  const bad = badItems(expenses) || badItems(incomes);
  if (bad) return res.status(400).json({ error: `Payload inválido: expenses/incomes ${bad}.` });
  try {
    await replaceMonthData(req.userEmail, month, expenses, incomes);
    res.json({ ok: true });
  } catch (err) {
    console.error("PUT /api/data failed:", err);
    res.status(500).json({ error: "Falha ao salvar dados no banco." });
  }
});

app.get("/api/payment-methods", requireAuth, async (req, res) => {
  try {
    const methods = await getPaymentMethods(req.userEmail);
    res.json({ methods });
  } catch (err) {
    console.error("GET /api/payment-methods failed:", err);
    res.status(500).json({ error: "Falha ao carregar as formas de pagamento." });
  }
});

app.get("/api/categories", requireAuth, async (req, res) => {
  try {
    const categories = await getCategories(req.userEmail);
    res.json({ categories });
  } catch (err) {
    console.error("GET /api/categories failed:", err);
    res.status(500).json({ error: "Falha ao carregar as categorias." });
  }
});

app.put("/api/expenses/:id/month", requireAuth, async (req, res) => {
  const { id } = req.params;
  const { month } = req.body || {};
  if (typeof month !== "string" || !MONTH_RE.test(month)) {
    return res.status(400).json({ error: "Mês inválido. Use o formato AAAA-MM." });
  }
  try {
    await moveExpenseToMonth(req.userEmail, id, month);
    res.json({ ok: true });
  } catch (err) {
    if (err instanceof NotFoundError) return res.status(404).json({ error: "Gasto não encontrado." });
    console.error("PUT /api/expenses/:id/month failed:", err);
    res.status(500).json({ error: "Falha ao mover o gasto para o mês selecionado." });
  }
});

app.get("/api/wishlist", requireAuth, async (req, res) => {
  try {
    const items = await getWishlist(req.userEmail);
    res.json({ items });
  } catch (err) {
    console.error("GET /api/wishlist failed:", err);
    res.status(500).json({ error: "Falha ao carregar a lista de desejos." });
  }
});

app.put("/api/wishlist", requireAuth, async (req, res) => {
  const { items } = req.body || {};
  const bad = badItems(items);
  if (bad) return res.status(400).json({ error: `Payload inválido: items ${bad}.` });
  try {
    await replaceWishlist(req.userEmail, items);
    res.json({ ok: true });
  } catch (err) {
    console.error("PUT /api/wishlist failed:", err);
    res.status(500).json({ error: "Falha ao salvar a lista de desejos." });
  }
});

const SHOPPING_LIST_TYPES = new Set(["mercado", "farmacia"]);

app.get("/api/shopping", requireAuth, async (req, res) => {
  const listType = req.query.list;
  if (!SHOPPING_LIST_TYPES.has(listType)) {
    return res.status(400).json({ error: "Lista inválida." });
  }
  try {
    const items = await getShoppingList(req.userEmail, listType);
    res.json({ items });
  } catch (err) {
    console.error("GET /api/shopping failed:", err);
    res.status(500).json({ error: "Falha ao carregar a lista." });
  }
});

app.put("/api/shopping", requireAuth, async (req, res) => {
  const listType = req.query.list;
  const { items } = req.body || {};
  if (!SHOPPING_LIST_TYPES.has(listType)) {
    return res.status(400).json({ error: "Lista inválida." });
  }
  const bad = badItems(items);
  if (bad) return res.status(400).json({ error: `Payload inválido: items ${bad}.` });
  try {
    await replaceShoppingList(req.userEmail, listType, items);
    res.json({ ok: true });
  } catch (err) {
    console.error("PUT /api/shopping failed:", err);
    res.status(500).json({ error: "Falha ao salvar a lista." });
  }
});

app.get("/api/serasa", requireAuth, async (req, res) => {
  try {
    const items = await getSerasaItems(req.userEmail);
    res.json({ items });
  } catch (err) {
    console.error("GET /api/serasa failed:", err);
    res.status(500).json({ error: "Falha ao carregar as dívidas do Serasa." });
  }
});

app.put("/api/serasa", requireAuth, async (req, res) => {
  const { items } = req.body || {};
  const bad = badItems(items);
  if (bad) return res.status(400).json({ error: `Payload inválido: items ${bad}.` });
  try {
    await replaceSerasaItems(req.userEmail, items);
    res.json({ ok: true });
  } catch (err) {
    console.error("PUT /api/serasa failed:", err);
    res.status(500).json({ error: "Falha ao salvar as dívidas do Serasa." });
  }
});

app.get("/api/cards", requireAuth, async (req, res) => {
  try {
    const items = await getCards(req.userEmail);
    res.json({ items });
  } catch (err) {
    console.error("GET /api/cards failed:", err);
    res.status(500).json({ error: "Falha ao carregar os saldos dos cartões." });
  }
});

app.put("/api/cards", requireAuth, async (req, res) => {
  const { items } = req.body || {};
  const bad = badItems(items);
  if (bad) return res.status(400).json({ error: `Payload inválido: items ${bad}.` });
  try {
    await replaceCards(req.userEmail, items);
    res.json({ ok: true });
  } catch (err) {
    console.error("PUT /api/cards failed:", err);
    res.status(500).json({ error: "Falha ao salvar os saldos dos cartões." });
  }
});
