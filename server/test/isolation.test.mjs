// Isolamento entre usuarios, migracao do banco antigo, exclusao de conta e as
// protecoes das rotas. Roda contra um Postgres LOCAL (apaga o esquema a cada
// cenario) — nunca aponte para o Neon:
//   docker run -d --name mf-test-pg -e POSTGRES_PASSWORD=teste -e POSTGRES_DB=mf -p 127.0.0.1:55432:5432 postgres:16-alpine
//   npm run test:server
import { test, before, after } from "node:test";
import assert from "node:assert/strict";

const URL_ = process.env.TEST_DATABASE_URL || "postgresql://postgres:teste@127.0.0.1:55432/mf";
if (!/@(localhost|127\.0\.0\.1)[:/]/.test(URL_)) {
  throw new Error("Os testes apagam o banco: TEST_DATABASE_URL precisa ser um Postgres local.");
}
/* O app.js carrega o .env do projeto (dotenv/config). Nos testes ele nao pode
   ler o .env real: traria o ALLOWED_EMAIL e os segredos de producao. */
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
// meses fixos no passado: a conta nova ja ganha o mes corrente no login
const MONTH = "2025-03";
const NEXT = "2025-04";

async function resetSchema() {
  await db.pool.query("DROP SCHEMA public CASCADE; CREATE SCHEMA public;");
}

const exp = (id, extra = {}) => ({ id, description: `Gasto ${id}`, category: "Moradia", value: 100, ...extra });
const inc = (id) => ({ id, source: `Ganho ${id}`, value: 1000, cltPjIncome: true });

let server;
let base;
before(async () => {
  server = app.listen(0);
  await new Promise((r) => server.once("listening", r));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => {
  server?.close();
  await db.pool.end();
});

const call = (path, { token, method = "GET", body, headers = {} } = {}) =>
  fetch(base + path, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body),
  });

test("banco antigo (sem dono): tudo vai para o dono antigo, e rodar de novo nao muda nada", async () => {
  await resetSchema();
  // formato de antes desta mudanca: chaves simples, sem user_email
  await db.pool.query(`
    CREATE TABLE months (month TEXT PRIMARY KEY);
    CREATE TABLE expenses (id TEXT PRIMARY KEY, description TEXT NOT NULL, category TEXT, value NUMERIC NOT NULL DEFAULT 0, note TEXT DEFAULT '', month TEXT NOT NULL);
    CREATE TABLE wishlist_items (id TEXT PRIMARY KEY, title TEXT NOT NULL, value NUMERIC NOT NULL DEFAULT 0, note TEXT DEFAULT '', done_at TEXT);
    CREATE TABLE cards (id TEXT PRIMARY KEY, payment_method TEXT NOT NULL, balance NUMERIC NOT NULL DEFAULT 0, reference_date TEXT NOT NULL, note TEXT DEFAULT '');
    INSERT INTO months VALUES ('2026-09'), ('2026-10');
    INSERT INTO expenses (id, description, category, value, month) VALUES ('e1', 'Aluguel', 'Moradia', 1850, '2026-10'), ('e2', 'Luz', 'Casa', 180, '2026-09');
    INSERT INTO wishlist_items (id, title, value) VALUES ('w1', 'Viagem', 3500);
    INSERT INTO cards (id, payment_method, balance, reference_date) VALUES ('c1', 'Nubank', 6500, '2026-10-01');
  `);

  delete process.env.LEGACY_OWNER_EMAIL;
  await assert.rejects(db.migrate(), /LEGACY_OWNER_EMAIL/, "sem dono definido a migracao precisa falhar");

  process.env.LEGACY_OWNER_EMAIL = "Dono@Exemplo.com";
  await db.migrate();
  await db.migrate(); // idempotente
  delete process.env.LEGACY_OWNER_EMAIL;

  const owner = "dono@exemplo.com";
  assert.deepEqual(await db.getMonths(owner), ["2026-09", "2026-10"]);
  assert.equal((await db.getData(owner, "2026-10")).expenses[0].description, "Aluguel");
  assert.equal((await db.getWishlist(owner))[0].title, "Viagem");
  assert.equal((await db.getCards(owner))[0].balance, 6500);
  assert.ok(await db.userExists(owner));
  // ninguem mais enxerga os dados antigos
  assert.deepEqual(await db.getMonths(A), []);
  assert.deepEqual((await db.getData(A, "2026-10")).expenses, []);
  // chave composta: o mesmo id pode existir em outra conta
  const { rows } = await db.pool.query(
    `SELECT a.attname FROM pg_index i JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
     WHERE i.indrelid = 'expenses'::regclass AND i.indisprimary ORDER BY a.attname`
  );
  assert.deepEqual(rows.map((r) => r.attname), ["id", "user_email"]);
});

test("isolamento: B nao ve, nao apaga e nao move nada de A", async () => {
  await resetSchema();
  await db.migrate();
  await db.ensureUser(A, "Ana");
  await db.ensureUser(B, "Bruno");

  await db.replaceMonthData(A, MONTH, [exp("x1"), exp("x2", { paymentMethod: "Pix", category: "Viagem" })], [inc("i1")]);
  await db.replaceWishlist(A, [{ id: "w1", title: "Bicicleta", targetDate: "2026-12-15" }]);
  await db.replaceShoppingList(A, "mercado", [{ id: "m1", title: "Arroz", quantity: "5 kg" }]);
  await db.replaceSerasaItems(A, [{ id: "s1", description: "Banco X", category: "Empréstimo", value: 2000 }]);
  await db.replaceCards(A, [{ id: "c1", paymentMethod: "Nubank", balance: 900, referenceDate: "2026-10-01", lastDigits: "4821" }]);
  await db.replaceCardClosings(A, MONTH, [{ id: "k1", cardName: "Nubank", value: 300 }]);

  // B nao ve nada de A
  assert.deepEqual((await db.getData(B, MONTH)).expenses, []);
  assert.deepEqual((await db.getData(B, MONTH)).incomes, []);
  assert.deepEqual(await db.getWishlist(B), []);
  assert.deepEqual(await db.getShoppingList(B, "mercado"), []);
  assert.deepEqual(await db.getSerasaItems(B), []);
  assert.deepEqual(await db.getCards(B), []);
  assert.deepEqual(await db.getCardClosings(B, MONTH), []);
  assert.deepEqual(await db.getCategories(B), []);
  assert.deepEqual(await db.getPaymentMethods(B), []);

  // B salvando as proprias listas (inclusive vazias) nao apaga as de A
  await db.replaceMonthData(B, MONTH, [exp("x1", { description: "Do Bruno" })], []);
  await db.replaceWishlist(B, []);
  await db.replaceShoppingList(B, "mercado", []);
  await db.replaceSerasaItems(B, []);
  await db.replaceCards(B, []);
  await db.replaceCardClosings(B, MONTH, []);

  const a = await db.getData(A, MONTH);
  assert.equal(a.expenses.length, 2);
  assert.equal(a.incomes.length, 1);
  assert.equal((await db.getWishlist(A)).length, 1);
  assert.equal((await db.getShoppingList(A, "mercado"))[0].quantity, "5 kg");
  assert.equal((await db.getSerasaItems(A)).length, 1);
  assert.equal((await db.getCards(A))[0].lastDigits, "4821");
  assert.equal((await db.getCardClosings(A, MONTH)).length, 1);

  // mesmo id ("x1") nas duas contas convive
  assert.equal((await db.getData(A, MONTH)).expenses.find((e) => e.id === "x1").description, "Gasto x1");
  assert.equal((await db.getData(B, MONTH)).expenses[0].description, "Do Bruno");

  // B nao move gasto de A (nem o x2, que so A tem)
  await assert.rejects(db.moveExpenseToMonth(B, "x2", NEXT), db.NotFoundError);
  assert.ok((await db.getData(A, MONTH)).expenses.some((e) => e.id === "x2"));

  // createMonth so olha os meses da propria conta
  await db.replaceMonthData(A, MONTH, [exp("r1", { recurrent: true })], []);
  const nextB = await db.createMonth(B, NEXT);
  assert.equal(nextB.expenses.length, 0, "o recorrente de A nao pode aparecer no mes novo de B");
  const nextA = await db.createMonth(A, NEXT);
  assert.equal(nextA.expenses.length, 1, "o recorrente de A vai para o mes seguinte de A");
  assert.deepEqual(await db.getMonths(B), [MONTH, NEXT, db.currentMonth()].sort());

  // regex corrigidas: data desejada e final do cartao agora sao gravados
  assert.equal((await db.getWishlist(A))[0].targetDate, "2026-12-15");
  assert.equal(db.optionalDate("2026-11-10"), "2026-11-10");
  assert.equal(db.optionalDate("10/11/2026"), null);
  assert.equal(db.lastDigitsOf("4821"), "4821");
  assert.equal(db.lastDigitsOf("48 21"), "4821");
  assert.equal(db.lastDigitsOf("482"), null);
});

test("exclusao de conta: apaga so a pessoa e derruba o token dela", async () => {
  await resetSchema();
  await db.migrate();
  await db.ensureUser(A);
  await db.ensureUser(B);
  await db.replaceMonthData(A, MONTH, [exp("x1")], []);
  await db.replaceMonthData(B, MONTH, [exp("y1")], []);
  const tokenB = signSession(B).token;

  // confirmacao errada nao apaga
  let r = await call("/api/account", { token: tokenB, method: "DELETE", body: { confirm: A } });
  assert.equal(r.status, 400);
  r = await call("/api/account", { token: tokenB, method: "DELETE", body: { confirm: "BRUNO@exemplo.com " } });
  assert.equal(r.status, 200);

  assert.equal(await db.userExists(B), false);
  assert.deepEqual((await db.getData(B, MONTH)).expenses, []);
  assert.equal((await db.getData(A, MONTH)).expenses.length, 1, "A segue intacta");
  // o token de B (ex.: celular pareado) para de valer
  r = await call(`/api/data?month=${MONTH}`, { token: tokenB });
  assert.equal(r.status, 401);
});

test("rotas: o token decide a conta; nada vem do corpo ou da query", async () => {
  await resetSchema();
  await db.migrate();
  await db.ensureUser(A);
  await db.ensureUser(B);
  const tA = signSession(A).token;
  const tB = signSession(B).token;

  let r = await call("/api/data", { token: tA, method: "PUT", body: { month: MONTH, expenses: [exp("x1")], incomes: [], user_email: B } });
  assert.equal(r.status, 200);
  r = await call(`/api/data?month=${MONTH}&user=${encodeURIComponent(A)}`, { token: tB });
  assert.deepEqual((await r.json()).expenses, []);
  r = await call(`/api/data?month=${MONTH}`, { token: tA });
  assert.equal((await r.json()).expenses.length, 1);

  // mover gasto de outra conta: 404
  r = await call("/api/expenses/x1/month", { token: tB, method: "PUT", body: { month: NEXT } });
  assert.equal(r.status, 404);

  // sem token: 401
  r = await call(`/api/data?month=${MONTH}`);
  assert.equal(r.status, 401);
  r = await call("/api/auth/me");
  assert.equal(r.status, 401);

  // validacao de tamanho e de id
  r = await call("/api/wishlist", { token: tA, method: "PUT", body: { items: [{ id: "x".repeat(65), title: "t" }] } });
  assert.equal(r.status, 400);
  r = await call("/api/wishlist", { token: tA, method: "PUT", body: { items: Array.from({ length: 3001 }, (_, i) => ({ id: `w${i}`, title: "t" })) } });
  assert.equal(r.status, 400);
  r = await call("/api/wishlist", { token: tA, method: "PUT", body: JSON.stringify({ items: [], pad: "x".repeat(1_100_000) }) });
  assert.equal(r.status, 413);

  // cabecalhos de seguranca
  assert.equal(r.headers.get("x-content-type-options"), "nosniff");
  assert.equal(r.headers.get("x-frame-options"), "DENY");
});

test("limite de tentativas no resgate do pareamento", async () => {
  await resetSchema();
  await db.migrate();
  const ip = { "x-real-ip": "203.0.113.7" };
  const statuses = [];
  for (let i = 0; i < 12; i++) {
    const r = await call("/api/auth/pair/redeem", { method: "POST", body: { code: "AAAA-AAAA" }, headers: ip });
    statuses.push(r.status);
  }
  assert.deepEqual(statuses.slice(0, 10), Array(10).fill(400));
  assert.deepEqual(statuses.slice(10), [429, 429]);
  // outro IP segue livre
  const other = await call("/api/auth/pair/redeem", { method: "POST", body: { code: "AAAA-AAAA" }, headers: { "x-real-ip": "198.51.100.9" } });
  assert.equal(other.status, 400);
});

test("pareamento: o celular recebe a sessao da mesma conta que gerou o codigo", async () => {
  await resetSchema();
  await db.migrate();
  await db.ensureUser(A);
  await db.replaceMonthData(A, MONTH, [exp("x1")], []);
  let r = await call("/api/auth/pair", { token: signSession(A).token, method: "POST" });
  const { code } = await r.json();
  r = await call("/api/auth/pair/redeem", { method: "POST", body: { code }, headers: { "x-real-ip": "192.0.2.1" } });
  const { token, email } = await r.json();
  assert.equal(email, A);
  r = await call(`/api/data?month=${MONTH}`, { token });
  assert.equal((await r.json()).expenses.length, 1);
});

test("conta nova comeca vazia, com o mes corrente", async () => {
  await resetSchema();
  await db.migrate();
  const first = await db.ensureUser(A, "Ana");
  const again = await db.ensureUser(A, "Ana");
  assert.equal(first.isNew, true);
  assert.equal(again.isNew, false);
  assert.deepEqual(await db.getMonths(A), [db.currentMonth()]);
});

test("CORS: so o proprio site recebe os cabecalhos", async () => {
  const ok = await call("/api/auth/me", { headers: { Origin: "http://localhost:5173" } });
  assert.equal(ok.headers.get("access-control-allow-origin"), "http://localhost:5173");
  const evil = await call("/api/auth/me", { headers: { Origin: "https://site-malicioso.example" } });
  assert.equal(evil.headers.get("access-control-allow-origin"), null);
});
