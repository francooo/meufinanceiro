import "dotenv/config";
import express from "express";
import cors from "cors";
import { migrate, getData, getMonths, replaceExpenses, replaceIncomes, createMonth, currentMonth } from "./db.js";

const app = express();
app.use(cors());
app.use(express.json());

const MONTH_RE = /^\d{4}-\d{2}$/;

app.get("/api/months", async (_req, res) => {
  try {
    const months = await getMonths();
    res.json({ months });
  } catch (err) {
    console.error("GET /api/months failed:", err);
    res.status(500).json({ error: "Falha ao carregar os meses disponíveis." });
  }
});

app.post("/api/months", async (req, res) => {
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

app.get("/api/data", async (req, res) => {
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

app.put("/api/data", async (req, res) => {
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

const port = process.env.PORT || 8787;

migrate()
  .then(() => {
    app.listen(port, () => {
      console.log(`API do Meu Caixa rodando em http://localhost:${port}`);
    });
  })
  .catch((err) => {
    console.error("Falha ao migrar/conectar ao banco Neon:", err);
    process.exit(1);
  });
