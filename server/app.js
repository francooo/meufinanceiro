import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { getData, getMonths, replaceExpenses, replaceIncomes, createMonth, currentMonth, getWishlist, replaceWishlist } from "./db.js";
import { verifyGoogleCredential, issueSessionCookie, clearSessionCookie, getSessionEmail, requireAuth } from "./auth.js";

const MONTH_RE = /^\d{4}-\d{2}$/;

export const app = express();
app.use(cors());
app.use(express.json());
app.use(cookieParser());

app.post("/api/auth/google", async (req, res) => {
  const { credential } = req.body || {};
  if (typeof credential !== "string" || !credential) {
    return res.status(400).json({ error: "Credencial ausente." });
  }
  try {
    const email = await verifyGoogleCredential(credential);
    issueSessionCookie(res, email);
    res.json({ ok: true, email });
  } catch (err) {
    res.status(401).json({ error: err.message || "Falha na autenticação." });
  }
});

app.get("/api/auth/me", (req, res) => {
  const email = getSessionEmail(req);
  if (!email) return res.status(401).json({ error: "Não autenticado." });
  res.json({ email });
});

app.post("/api/auth/logout", (_req, res) => {
  clearSessionCookie(res);
  res.json({ ok: true });
});

app.get("/api/months", requireAuth, async (_req, res) => {
  try {
    const months = await getMonths();
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
    const data = await createMonth(month);
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
    const data = await getData(month);
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
  if (!Array.isArray(expenses) || !Array.isArray(incomes)) {
    return res.status(400).json({ error: "Payload inválido: expenses/incomes devem ser arrays." });
  }
  try {
    await replaceExpenses(month, expenses);
    await replaceIncomes(month, incomes);
    res.json({ ok: true });
  } catch (err) {
    console.error("PUT /api/data failed:", err);
    res.status(500).json({ error: "Falha ao salvar dados no banco." });
  }
});

app.get("/api/wishlist", requireAuth, async (_req, res) => {
  try {
    const items = await getWishlist();
    res.json({ items });
  } catch (err) {
    console.error("GET /api/wishlist failed:", err);
    res.status(500).json({ error: "Falha ao carregar a lista de desejos." });
  }
});

app.put("/api/wishlist", requireAuth, async (req, res) => {
  const { items } = req.body || {};
  if (!Array.isArray(items)) {
    return res.status(400).json({ error: "Payload inválido: items deve ser um array." });
  }
  try {
    await replaceWishlist(items);
    res.json({ ok: true });
  } catch (err) {
    console.error("PUT /api/wishlist failed:", err);
    res.status(500).json({ error: "Falha ao salvar a lista de desejos." });
  }
});
