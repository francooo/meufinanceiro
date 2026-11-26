// Criação de UM item (POST /api/expenses, /incomes, /wishlist, /shopping).
// Mesmo Postgres local dos testes de isolamento — nunca aponte para o Neon:
//   docker run -d --name mf-test-pg -e POSTGRES_PASSWORD=teste -e POSTGRES_DB=mf -p 127.0.0.1:55432:5432 postgres:16-alpine
//   npm run test:server
import { test, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";

const URL_ = process.env.TEST_DATABASE_URL || "postgresql://postgres:teste@127.0.0.1:55432/mf";
if (!/@(localhost|127\.0\.0\.1)[:/]/.test(URL_)) {
  throw new Error("Os testes apagam o banco: TEST_DATABASE_URL precisa ser um Postgres local.");
}
process.env.DOTENV_CONFIG_PATH = new URL("./.env.nao-existe", import.meta.url).pathname;
process.env.DATABASE_URL = URL_;
process.env.SESSION_SECRET = "segredo-de-teste";
process.env.GOOGLE_CLIENT_IDS = "teste.apps.googleusercontent.com";
delete process.env.ALLOWED_EMAIL;
delete process.env.ALLOWED_EMAILS;
delete process.env.LEGACY_OWNER_EMAIL;

const db = await import("../db.js");
const { signSession } = await import("../auth.js");
const { app } = await import("../app.js");

const A = "ana@exemplo.com";
const B = "bruno@exemplo.com";
const MONTH = "2025-03";

let server;
let base;
let tokenA;
let tokenB;

before(async () => {
  server = app.listen(0);
  await new Promise((r) => server.once("listening", r));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => {
  server?.close();
  await db.pool.end();
});

beforeEach(async () => {
  await db.pool.query("DROP SCHEMA public CASCADE; CREATE SCHEMA public;");
  await db.migrate();
  await db.ensureUser(A, "Ana");
  await db.ensureUser(B, "Bruno");
  await db.replaceMonthData(A, MONTH, [], []);
  await db.replaceMonthData(B, MONTH, [], []);
  tokenA = signSession(A).token;
  tokenB = signSession(B).token;
});

const post = (path, body, token = tokenA) =>
  fetch(base + path, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  });

const expense = (extra = {}) => ({
  id: "g-1", month: MONTH, description: "Mercado", category: "Casa / Utilidades", value: 80, paidWithCltPj: true, ...extra,
});

test("gasto: cria com 201 e aparece no mês, com os campos gravados", async () => {
  const r = await post("/api/expenses", expense({ installmentTotal: 3, installmentNumber: 1, dueDate: "2025-03-10" }));
  assert.equal(r.status, 201);
  assert.deepEqual(await r.json(), { ok: true, id: "g-1", created: true });
  const { expenses } = await db.getData(A, MONTH);
  assert.equal(expenses.length, 1);
  assert.equal(expenses[0].paidWithCltPj, true);
  assert.equal(expenses[0].value, 80);
  assert.equal(expenses[0].installmentTotal, 3);
  assert.equal(expenses[0].dueDate, "2025-03-10");
});

test("reenviar o mesmo id não duplica (200, created=false)", async () => {
  assert.equal((await post("/api/expenses", expense())).status, 201);
  const again = await post("/api/expenses", expense({ value: 999 }));
  assert.equal(again.status, 200);
  assert.equal((await again.json()).created, false);
  const { expenses } = await db.getData(A, MONTH);
  assert.equal(expenses.length, 1);
  assert.equal(expenses[0].value, 80, "o reenvio não sobrescreve");
});

test("isolamento: o mesmo id em outra conta é outra linha; ninguém vê o da outra", async () => {
  await post("/api/expenses", expense());
  const r = await post("/api/expenses", expense({ description: "Do Bruno" }), tokenB);
  assert.equal(r.status, 201);
  assert.equal((await db.getData(A, MONTH)).expenses[0].description, "Mercado");
  assert.equal((await db.getData(B, MONTH)).expenses[0].description, "Do Bruno");
});

test("mês inexistente: 404, nada gravado (não pula a propagação do createMonth)", async () => {
  const r = await post("/api/expenses", expense({ month: "2030-01" }));
  assert.equal(r.status, 404);
  assert.equal((await db.getMonths(A)).includes("2030-01"), false);
});

test("validação: obrigatórios dos formulários", async () => {
  for (const [body, msg] of [
    [expense({ id: "" }), /Id inválido/],
    [expense({ id: "x".repeat(65) }), /Id inválido/],
    [expense({ month: "março" }), /Mês inválido/],
    [expense({ description: "  " }), /Descrição/],
    [expense({ value: -1 }), /Valor/],
    [expense({ value: "80" }), /Valor/],
    [expense({ category: "" }), /Categoria/],
    [expense({ installmentTotal: 1 }), /Parcelas/],
  ]) {
    const r = await post("/api/expenses", body);
    assert.equal(r.status, 400, JSON.stringify(body));
    assert.match((await r.json()).error, msg);
  }
  assert.equal((await db.getData(A, MONTH)).expenses.length, 0);
});

test("ganho: cria e marca CLT-PJ", async () => {
  const r = await post("/api/incomes", { id: "r-1", month: MONTH, source: "Salário", value: 5000, cltPjIncome: true });
  assert.equal(r.status, 201);
  const { incomes } = await db.getData(A, MONTH);
  assert.equal(incomes[0].cltPjIncome, true);
  assert.equal((await post("/api/incomes", { id: "r-2", month: MONTH, value: 1 })).status, 400);
});

test("desejo e listas de compras", async () => {
  assert.equal((await post("/api/wishlist", { id: "w-1", title: "Bicicleta", value: 900 })).status, 201);
  assert.equal((await db.getWishlist(A))[0].title, "Bicicleta");

  assert.equal((await post("/api/shopping?list=mercado", { id: "s-1", title: "Leite" })).status, 201);
  assert.equal((await post("/api/shopping?list=farmacia", { id: "s-2", title: "Dipirona" })).status, 201);
  assert.equal((await db.getShoppingList(A, "mercado"))[0].title, "Leite");
  assert.equal((await db.getShoppingList(A, "farmacia"))[0].title, "Dipirona");

  assert.equal((await post("/api/shopping?list=padaria", { id: "s-3", title: "Pão" })).status, 400);
  assert.equal((await post("/api/shopping", { id: "s-4", title: "Pão" })).status, 400);
  assert.equal((await post("/api/wishlist", { id: "w-2", title: "" })).status, 400);
});

test("sem sessão: 401 em todas", async () => {
  for (const p of ["/api/expenses", "/api/incomes", "/api/wishlist", "/api/shopping?list=mercado"]) {
    assert.equal((await post(p, expense(), null)).status, 401, p);
  }
});
