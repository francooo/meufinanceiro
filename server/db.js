import pg from "pg";
import { randomUUID } from "node:crypto";

const { Pool } = pg;

const DATABASE_URL = process.env.DATABASE_URL || "";

export const pool = new Pool({
  connectionString: DATABASE_URL,
  /* Neon exige TLS; o Postgres local dos testes (Docker) nao fala TLS. */
  ssl: /@(localhost|127\.0\.0\.1)[:/]/.test(DATABASE_URL) ? false : { rejectUnauthorized: false },
});

export function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/* E-mail e a identidade do dono de cada linha: sempre minusculo e sem espacos,
   senao "Fulano@gmail.com" e "fulano@gmail.com" virariam duas contas. */
export const normalizeEmail = (email) => String(email ?? "").trim().toLowerCase();

function addOneMonthToDate(iso) {
  if (!iso) return null;
  const [y, m, d] = iso.split("-").map(Number);
  const daysInNextMonth = new Date(y, m + 1, 0).getDate();
  const day = Math.min(d, daysInNextMonth);
  const next = new Date(y, m, day);
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}-${String(next.getDate()).padStart(2, "0")}`;
}

/* ---------- limites de tamanho (o app e publico) ---------- */
export const MAX_ITEMS = 3000;
export const MAX_ID_LENGTH = 64;
const cut = (v, max) => String(v ?? "").slice(0, max);
const T = { short: 60, title: 200, note: 500 };

/* Tabelas com dono e a coluna que, junto com o dono, forma a chave. */
const OWNED_TABLES = [
  ["months", "month"],
  ["expenses", "id"],
  ["incomes", "id"],
  ["wishlist_items", "id"],
  ["shopping_items", "id"],
  ["serasa_items", "id"],
  ["cards", "id"],
  ["card_closings", "id"],
];

/* Dono dos dados que ja existiam quando o app era de uma pessoa so. */
function legacyOwner() {
  const first = String(process.env.ALLOWED_EMAIL || process.env.ALLOWED_EMAILS || "").split(",")[0];
  return normalizeEmail(process.env.LEGACY_OWNER_EMAIL || first);
}

/* Chave arbitraria para o advisory lock da migracao. */
const MIGRATION_LOCK = 724_310_552;

export async function migrate() {
  const month = currentMonth();
  const client = await pool.connect();
  try {
    /* Tudo numa transacao com trava: dois cold starts ao mesmo tempo nao podem
       fazer o backfill e a troca de chave em paralelo. DDL no Postgres e
       transacional, e a trava de transacao funciona tambem atras do pooler do
       Neon (modo transacao), ao contrario da trava de sessao. */
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock($1)", [MIGRATION_LOCK]);

    await client.query(`CREATE TABLE IF NOT EXISTS months (month TEXT PRIMARY KEY)`);
    await client.query(`
      CREATE TABLE IF NOT EXISTS expenses (
        id TEXT PRIMARY KEY,
        description TEXT NOT NULL,
        category TEXT,
        value NUMERIC NOT NULL DEFAULT 0,
        note TEXT DEFAULT '',
        month TEXT NOT NULL DEFAULT '${month}',
        recurrent BOOLEAN NOT NULL DEFAULT false,
        paid_at TEXT DEFAULT NULL,
        due_date TEXT DEFAULT NULL,
        installment_total INTEGER DEFAULT NULL,
        installment_number INTEGER DEFAULT NULL,
        purchase_total NUMERIC DEFAULT NULL,
        paid_with_voucher BOOLEAN NOT NULL DEFAULT false,
        paid_with_clt_pj BOOLEAN NOT NULL DEFAULT false,
        payment_method TEXT DEFAULT NULL,
        created_at TIMESTAMPTZ DEFAULT NULL
      );
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS incomes (
        id TEXT PRIMARY KEY,
        source TEXT NOT NULL,
        value NUMERIC NOT NULL DEFAULT 0,
        note TEXT DEFAULT '',
        month TEXT NOT NULL DEFAULT '${month}',
        recurrent BOOLEAN NOT NULL DEFAULT false,
        voucher_income BOOLEAN NOT NULL DEFAULT false,
        clt_pj_income BOOLEAN NOT NULL DEFAULT false,
        receipt_date TEXT DEFAULT NULL,
        created_at TIMESTAMPTZ DEFAULT NULL
      );
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS wishlist_items (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        value NUMERIC NOT NULL DEFAULT 0,
        note TEXT DEFAULT '',
        done_at TEXT DEFAULT NULL,
        order_index INTEGER DEFAULT NULL
      );
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS shopping_items (
        id TEXT PRIMARY KEY,
        list_type TEXT NOT NULL,
        title TEXT NOT NULL,
        value NUMERIC NOT NULL DEFAULT 0,
        note TEXT DEFAULT '',
        done_at TEXT DEFAULT NULL
      );
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS serasa_items (
        id TEXT PRIMARY KEY,
        description TEXT NOT NULL,
        category TEXT,
        value NUMERIC NOT NULL DEFAULT 0,
        note TEXT DEFAULT '',
        recurrent BOOLEAN NOT NULL DEFAULT false,
        paid_at TEXT DEFAULT NULL,
        due_date TEXT DEFAULT NULL,
        installment_total INTEGER DEFAULT NULL,
        installment_number INTEGER DEFAULT NULL,
        order_index INTEGER DEFAULT NULL
      );
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS cards (
        id TEXT PRIMARY KEY,
        payment_method TEXT NOT NULL,
        balance NUMERIC NOT NULL DEFAULT 0,
        reference_date TEXT NOT NULL,
        note TEXT DEFAULT ''
      );
    `);
    /* Fechamento de cartao do mes: nome livre + valor a pagar, preso ao mes (como
       expenses, nao global como cards). order_index para a reordenacao manual. */
    await client.query(`
      CREATE TABLE IF NOT EXISTS card_closings (
        id TEXT PRIMARY KEY,
        card_name TEXT NOT NULL,
        value NUMERIC NOT NULL DEFAULT 0,
        month TEXT NOT NULL DEFAULT '${month}',
        order_index INTEGER DEFAULT NULL,
        created_at TIMESTAMPTZ DEFAULT NULL
      );
    `);
    // Pareamento de celular. Guarda o HMAC do código, nunca o código: com 40 bits
    // de entropia um hash sem chave cai em segundos numa GPU, então só a chave
    // torna um vazamento do banco inútil. A validade é comparada com now() do
    // Postgres, nunca com Date.now() da lambda — zero desvio de relógio.
    await client.query(`
      CREATE TABLE IF NOT EXISTS pairing_codes (
        code_hash  TEXT PRIMARY KEY,
        email      TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        expires_at TIMESTAMPTZ NOT NULL
      );
    `);
    /* Contas. Existir aqui e o que mantem uma sessao valida: excluir a conta
       apaga a linha e derruba na hora os tokens ja emitidos (web e celular). */
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        email         TEXT PRIMARY KEY,
        name          TEXT DEFAULT NULL,
        created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
        last_login_at TIMESTAMPTZ DEFAULT NULL
      );
    `);
    /* Janela fixa por chave (ex.: "redeem:<ip>"). No banco e nao em memoria: na
       Vercel cada requisicao pode cair numa instancia diferente. */
    await client.query(`
      CREATE TABLE IF NOT EXISTS rate_limits (
        key          TEXT NOT NULL,
        window_start TIMESTAMPTZ NOT NULL,
        count        INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY (key, window_start)
      );
    `);

    // bancos criados antes das colunas month/recurrent existirem
    const alters = [
      `ALTER TABLE expenses ADD COLUMN IF NOT EXISTS month TEXT NOT NULL DEFAULT '${month}'`,
      `ALTER TABLE expenses ADD COLUMN IF NOT EXISTS recurrent BOOLEAN NOT NULL DEFAULT false`,
      `ALTER TABLE expenses ADD COLUMN IF NOT EXISTS paid_at TEXT DEFAULT NULL`,
      `ALTER TABLE expenses ADD COLUMN IF NOT EXISTS installment_total INTEGER DEFAULT NULL`,
      `ALTER TABLE expenses ADD COLUMN IF NOT EXISTS installment_number INTEGER DEFAULT NULL`,
      /* Valor cheio da compra parcelada. Nulo nos gastos ja gravados e em tudo que
         nao e parcelado — quem le trata a ausencia com parcela x total. */
      `ALTER TABLE expenses ADD COLUMN IF NOT EXISTS purchase_total NUMERIC DEFAULT NULL`,
      `ALTER TABLE expenses ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT NULL`,
      `ALTER TABLE expenses ADD COLUMN IF NOT EXISTS due_date TEXT DEFAULT NULL`,
      `ALTER TABLE expenses ADD COLUMN IF NOT EXISTS paid_with_voucher BOOLEAN NOT NULL DEFAULT false`,
      `ALTER TABLE expenses ADD COLUMN IF NOT EXISTS paid_with_clt_pj BOOLEAN NOT NULL DEFAULT false`,
      `ALTER TABLE expenses ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT NULL`,
      `ALTER TABLE expenses ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NULL`,
      `ALTER TABLE incomes ADD COLUMN IF NOT EXISTS month TEXT NOT NULL DEFAULT '${month}'`,
      `ALTER TABLE incomes ADD COLUMN IF NOT EXISTS recurrent BOOLEAN NOT NULL DEFAULT false`,
      `ALTER TABLE incomes ADD COLUMN IF NOT EXISTS receipt_date TEXT DEFAULT NULL`,
      `ALTER TABLE incomes ADD COLUMN IF NOT EXISTS voucher_income BOOLEAN NOT NULL DEFAULT false`,
      `ALTER TABLE incomes ADD COLUMN IF NOT EXISTS clt_pj_income BOOLEAN NOT NULL DEFAULT false`,
      `ALTER TABLE incomes ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NULL`,
      `ALTER TABLE incomes ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT NULL`,
      `ALTER TABLE wishlist_items ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT NULL`,
      `ALTER TABLE shopping_items ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT NULL`,
      // Campos opcionais do UI kit: quantidade do item ("5 kg"), data desejada do
      // desejo e o final do cartão ("4821"). Nulos em tudo que já existe.
      `ALTER TABLE shopping_items ADD COLUMN IF NOT EXISTS quantity TEXT DEFAULT NULL`,
      `ALTER TABLE wishlist_items ADD COLUMN IF NOT EXISTS target_date TEXT DEFAULT NULL`,
      `ALTER TABLE cards ADD COLUMN IF NOT EXISTS last_digits TEXT DEFAULT NULL`,
    ];
    for (const sql of alters) await client.query(sql);

    await migrateOwnership(client);

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

/* De app de uma pessoa so para varios usuarios: toda linha ganha dono, as
   linhas que ja existiam vao para o dono antigo, e a chave primaria passa a
   incluir o dono — um id repetido entre duas contas nao colide nem sobrescreve.
   Idempotente: roda a cada cold start e nao faz nada da segunda vez em diante. */
async function migrateOwnership(client) {
  for (const [table] of OWNED_TABLES) {
    await client.query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS user_email TEXT`);
  }

  let orphans = 0;
  for (const [table] of OWNED_TABLES) {
    const { rows } = await client.query(`SELECT COUNT(*)::int AS n FROM ${table} WHERE user_email IS NULL`);
    orphans += rows[0].n;
  }
  if (orphans > 0) {
    const owner = legacyOwner();
    /* Sem dono definido, falha alto: deixar linhas sem dono seria deixa-las
       sem protecao nenhuma, ou fazer sumir os dados de quem ja usava o app. */
    if (!owner) {
      throw new Error(
        "Há dados sem dono no banco. Defina LEGACY_OWNER_EMAIL (ou ALLOWED_EMAIL) com o e-mail de quem já usava o app."
      );
    }
    for (const [table] of OWNED_TABLES) {
      await client.query(`UPDATE ${table} SET user_email = $1 WHERE user_email IS NULL`, [owner]);
    }
    await client.query("INSERT INTO users (email) VALUES ($1) ON CONFLICT DO NOTHING", [owner]);
  }

  for (const [table, key] of OWNED_TABLES) {
    await client.query(`ALTER TABLE ${table} ALTER COLUMN user_email SET NOT NULL`);
    const { rows: pkCols } = await client.query(
      `SELECT a.attname
         FROM pg_index i
         JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
        WHERE i.indrelid = $1::regclass AND i.indisprimary`,
      [table]
    );
    if (!pkCols.some((c) => c.attname === "user_email")) {
      const { rows: con } = await client.query(
        "SELECT conname FROM pg_constraint WHERE conrelid = $1::regclass AND contype = 'p'",
        [table]
      );
      const drop = con[0] ? `DROP CONSTRAINT ${con[0].conname}, ` : "";
      await client.query(`ALTER TABLE ${table} ${drop}ADD PRIMARY KEY (user_email, ${key})`);
    }
  }

  await client.query("CREATE INDEX IF NOT EXISTS expenses_user_month_idx ON expenses (user_email, month)");
  await client.query("CREATE INDEX IF NOT EXISTS incomes_user_month_idx ON incomes (user_email, month)");
  await client.query("CREATE INDEX IF NOT EXISTS card_closings_user_month_idx ON card_closings (user_email, month)");
  await client.query("CREATE INDEX IF NOT EXISTS shopping_items_user_list_idx ON shopping_items (user_email, list_type)");
}

/* ---------- contas ---------- */

/* Login: cria a conta na primeira vez e garante o mes corrente para quem ainda
   nao tem nenhum (conta nova abre direto no mes atual, vazio). */
export async function ensureUser(email, name) {
  const u = normalizeEmail(email);
  const { rows } = await pool.query(
    `INSERT INTO users (email, name, last_login_at) VALUES ($1, $2, now())
     ON CONFLICT (email) DO UPDATE SET last_login_at = now(), name = COALESCE(EXCLUDED.name, users.name)
     RETURNING (xmax = 0) AS inserted`,
    [u, name ? cut(name, T.title) : null]
  );
  await pool.query(
    `INSERT INTO months (user_email, month)
     SELECT $1, $2 WHERE NOT EXISTS (SELECT 1 FROM months WHERE user_email = $1)`,
    [u, currentMonth()]
  );
  return { isNew: !!rows[0]?.inserted };
}

export async function userExists(email) {
  const { rows } = await pool.query("SELECT 1 FROM users WHERE email = $1", [normalizeEmail(email)]);
  return rows.length > 0;
}

/* "Excluir minha conta": some tudo da pessoa, numa transacao so. */
export async function deleteUserData(email) {
  const u = normalizeEmail(email);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const [table] of OWNED_TABLES) {
      await client.query(`DELETE FROM ${table} WHERE user_email = $1`, [u]);
    }
    await client.query("DELETE FROM pairing_codes WHERE lower(email) = $1", [u]);
    await client.query("DELETE FROM users WHERE email = $1", [u]);
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

/* ---------- limite de tentativas ---------- */

/* Conta uma tentativa na janela atual e devolve se ainda esta dentro do limite. */
export async function hitRateLimit(key, limit, windowSeconds) {
  const { rows } = await pool.query(
    `INSERT INTO rate_limits (key, window_start, count)
     VALUES ($1, to_timestamp(floor(extract(epoch FROM now()) / $2) * $2), 1)
     ON CONFLICT (key, window_start) DO UPDATE SET count = rate_limits.count + 1
     RETURNING count, window_start`,
    [key, windowSeconds]
  );
  // limpeza das janelas antigas desta chave: a tabela nao cresce sem fim
  await pool.query("DELETE FROM rate_limits WHERE key = $1 AND window_start < $2", [key, rows[0].window_start]);
  return rows[0].count <= limit;
}

/* ---------- meses, gastos e ganhos ---------- */

export async function getMonths(email) {
  const { rows } = await pool.query("SELECT month FROM months WHERE user_email = $1 ORDER BY month", [normalizeEmail(email)]);
  return rows.map((r) => r.month);
}

export async function getData(email, month) {
  const u = normalizeEmail(email);
  const { rows: expenses } = await pool.query(
    `SELECT id, description, category, value, note, recurrent, paid_at AS "paidAt", due_date AS "dueDate",
            installment_total AS "installmentTotal", installment_number AS "installmentNumber",
            purchase_total AS "purchaseTotal",
            order_index AS "order", paid_with_voucher AS "paidWithVoucher", paid_with_clt_pj AS "paidWithCltPj",
            payment_method AS "paymentMethod", created_at AS "createdAt"
     FROM expenses WHERE user_email = $1 AND month = $2 ORDER BY category, order_index NULLS LAST, description`,
    [u, month]
  );
  const { rows: incomes } = await pool.query(
    `SELECT id, source, value, note, recurrent, receipt_date AS "receiptDate",
            voucher_income AS "voucherIncome", clt_pj_income AS "cltPjIncome",
            order_index AS "order", created_at AS "createdAt"
     FROM incomes WHERE user_email = $1 AND month = $2 ORDER BY order_index NULLS LAST, source`,
    [u, month]
  );
  return {
    /* NUMERIC volta string do pg. purchaseTotal continua nulo quando nulo: 0
       ali faria cardChargeOf cair no fallback sem necessidade. */
    expenses: expenses.map((e) => ({
      ...e,
      value: Number(e.value),
      purchaseTotal: e.purchaseTotal == null ? null : Number(e.purchaseTotal),
    })),
    incomes: incomes.map((i) => ({ ...i, value: Number(i.value) })),
  };
}

async function insertExpense(client, u, month, e) {
  await client.query(
    `INSERT INTO expenses (user_email, id, description, category, value, note, month, recurrent, paid_at, due_date, installment_total, installment_number, purchase_total, order_index, paid_with_voucher, paid_with_clt_pj, payment_method, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)`,
    [
      u,
      e.id,
      cut(e.description, T.title),
      e.category == null ? null : cut(e.category, T.short),
      Number(e.value) || 0,
      cut(e.note, T.note),
      month,
      !!e.recurrent,
      e.paidAt || null,
      e.dueDate || null,
      e.installmentTotal ?? null,
      e.installmentNumber ?? null,
      e.purchaseTotal ?? null,
      e.order ?? null,
      !!e.paidWithVoucher,
      !!e.paidWithCltPj,
      e.paymentMethod ? cut(e.paymentMethod, T.short) : null,
      e.createdAt || new Date().toISOString(),
    ]
  );
}

async function insertIncome(client, u, month, i) {
  await client.query(
    `INSERT INTO incomes (user_email, id, source, value, note, month, recurrent, receipt_date, voucher_income, clt_pj_income, order_index, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
    [u, i.id, cut(i.source, T.title), Number(i.value) || 0, cut(i.note, T.note), month, !!i.recurrent, i.receiptDate || null, !!i.voucherIncome, !!i.cltPjIncome, i.order ?? null, i.createdAt || new Date().toISOString()]
  );
}

/* Gastos e ganhos do mes numa transacao so: antes eram duas, e uma falha na
   segunda deixava o mes meio gravado. */
export async function replaceMonthData(email, month, expenses, incomes) {
  const u = normalizeEmail(email);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("INSERT INTO months (user_email, month) VALUES ($1, $2) ON CONFLICT DO NOTHING", [u, month]);
    await client.query("DELETE FROM expenses WHERE user_email = $1 AND month = $2", [u, month]);
    await client.query("DELETE FROM incomes WHERE user_email = $1 AND month = $2", [u, month]);
    for (const e of expenses) await insertExpense(client, u, month, e);
    for (const i of incomes) await insertIncome(client, u, month, i);
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

/* Categoria nao e entidade: existe so como texto na coluna de cada gasto. Sem
   esta varredura de TODOS os meses (da pessoa), uma categoria personalizada
   desaparece do seletor assim que o mes carregado nao tem nenhum gasto nela.
   Gemeo de getPaymentMethods, que resolve o mesmo problema uma coluna ao lado. */
export async function getCategories(email) {
  const { rows } = await pool.query(
    `SELECT DISTINCT category FROM expenses
     WHERE user_email = $1 AND category IS NOT NULL AND category <> ''
     ORDER BY category`,
    [normalizeEmail(email)]
  );
  return rows.map((r) => r.category);
}

export async function getPaymentMethods(email) {
  const { rows } = await pool.query(
    `SELECT DISTINCT payment_method FROM expenses
     WHERE user_email = $1 AND payment_method IS NOT NULL AND payment_method <> ''
     ORDER BY payment_method`,
    [normalizeEmail(email)]
  );
  return rows.map((r) => r.payment_method);
}

export class NotFoundError extends Error {}

export async function moveExpenseToMonth(email, id, targetMonth) {
  const u = normalizeEmail(email);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("INSERT INTO months (user_email, month) VALUES ($1, $2) ON CONFLICT DO NOTHING", [u, targetMonth]);
    // So o gasto da propria pessoa: o id de outra conta simplesmente nao existe aqui.
    const { rows } = await client.query(
      "UPDATE expenses SET month = $1, order_index = NULL WHERE user_email = $2 AND id = $3 RETURNING id",
      [targetMonth, u, id]
    );
    if (rows.length === 0) {
      throw new NotFoundError("Gasto não encontrado.");
    }
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function createMonth(email, newMonth) {
  const u = normalizeEmail(email);
  const { rows: exists } = await pool.query("SELECT 1 FROM months WHERE user_email = $1 AND month = $2", [u, newMonth]);
  if (exists.length > 0) {
    throw new Error(`O mês ${newMonth} já existe.`);
  }

  const { rows: sourceRows } = await pool.query(
    "SELECT month FROM months WHERE user_email = $1 AND month < $2 ORDER BY month DESC LIMIT 1",
    [u, newMonth]
  );
  const sourceMonth = sourceRows[0]?.month;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("INSERT INTO months (user_email, month) VALUES ($1, $2)", [u, newMonth]);

    if (sourceMonth) {
      const { rows: carryForwardExpenses } = await client.query(
        `SELECT description, category, value, note, recurrent, due_date AS "dueDate",
                installment_total AS "installmentTotal", installment_number AS "installmentNumber",
                purchase_total AS "purchaseTotal",
                order_index AS "order", paid_with_voucher AS "paidWithVoucher", paid_with_clt_pj AS "paidWithCltPj",
                payment_method AS "paymentMethod"
         FROM expenses
         WHERE user_email = $1 AND month = $2
           AND (recurrent = true OR (installment_total IS NOT NULL AND installment_number < installment_total))`,
        [u, sourceMonth]
      );
      for (const e of carryForwardExpenses) {
        const isInstallment = e.installmentTotal != null;
        await insertExpense(client, u, newMonth, {
          id: randomUUID(),
          description: e.description,
          category: e.category,
          value: e.value,
          note: e.note,
          recurrent: e.recurrent,
          dueDate: addOneMonthToDate(e.dueDate),
          installmentTotal: isInstallment ? e.installmentTotal : null,
          installmentNumber: isInstallment ? e.installmentNumber + 1 : null,
          /* Viaja junto com as parcelas seguintes: elas nao cobram o total do
             cartao, mas a edicao precisa reabrir com o valor certo. */
          purchaseTotal: isInstallment ? e.purchaseTotal ?? null : null,
          order: e.order ?? null,
          paidWithVoucher: e.paidWithVoucher,
          paidWithCltPj: e.paidWithCltPj,
          paymentMethod: e.paymentMethod,
        });
      }

      const { rows: recurIncomes } = await client.query(
        `SELECT source, value, note, receipt_date AS "receiptDate", voucher_income AS "voucherIncome", clt_pj_income AS "cltPjIncome"
         FROM incomes WHERE user_email = $1 AND month = $2 AND recurrent = true`,
        [u, sourceMonth]
      );
      for (const i of recurIncomes) {
        await insertIncome(client, u, newMonth, {
          id: randomUUID(),
          source: i.source,
          value: i.value,
          note: i.note,
          recurrent: true,
          receiptDate: addOneMonthToDate(i.receiptDate),
          voucherIncome: i.voucherIncome,
          cltPjIncome: i.cltPjIncome,
        });
      }
    }

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }

  return getData(u, newMonth);
}

// Texto opcional: vazio vira nulo (o banco não guarda "" como "sem valor").
export const optionalText = (v) => {
  const t = typeof v === "string" ? v.trim() : "";
  return t ? t.slice(0, 60) : null;
};
// Data opcional AAAA-MM-DD; qualquer outra coisa vira nulo.
export const optionalDate = (v) => (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);
// Final do cartão: exatamente 4 dígitos, ou nulo.
export const lastDigitsOf = (v) => {
  const d = String(v ?? "").replace(/\D/g, "");
  return d.length === 4 ? d : null;
};

/* ---------- colecoes sem mes ---------- */

export async function getWishlist(email) {
  const { rows } = await pool.query(
    `SELECT id, title, value, note, done_at AS "doneAt", order_index AS "order", target_date AS "targetDate"
     FROM wishlist_items
     WHERE user_email = $1
     ORDER BY (done_at IS NULL) DESC, order_index NULLS LAST, title`,
    [normalizeEmail(email)]
  );
  return rows.map((r) => ({ ...r, value: Number(r.value) }));
}

/* Substitui a colecao inteira DA PESSOA. Antes o DELETE nao tinha WHERE: com
   mais de uma conta, salvar a lista de um apagaria a de todos. */
async function replaceOwned(email, deleteSql, deleteParams, insertRows) {
  const u = normalizeEmail(email);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(deleteSql, [u, ...deleteParams]);
    await insertRows(client, u);
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export function replaceWishlist(email, items) {
  return replaceOwned(email, "DELETE FROM wishlist_items WHERE user_email = $1", [], async (client, u) => {
    for (const it of items) {
      await client.query(
        "INSERT INTO wishlist_items (user_email, id, title, value, note, done_at, order_index, target_date) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
        [u, it.id, cut(it.title, T.title), Number(it.value) || 0, cut(it.note, T.note), it.doneAt || null, it.order ?? null, optionalDate(it.targetDate)]
      );
    }
  });
}

export async function getShoppingList(email, listType) {
  const { rows } = await pool.query(
    `SELECT id, title, value, note, done_at AS "doneAt", order_index AS "order", quantity
     FROM shopping_items
     WHERE user_email = $1 AND list_type = $2
     ORDER BY (done_at IS NULL) DESC, order_index NULLS LAST, title`,
    [normalizeEmail(email), listType]
  );
  return rows.map((r) => ({ ...r, value: Number(r.value) }));
}

export function replaceShoppingList(email, listType, items) {
  return replaceOwned(email, "DELETE FROM shopping_items WHERE user_email = $1 AND list_type = $2", [listType], async (client, u) => {
    for (const it of items) {
      await client.query(
        "INSERT INTO shopping_items (user_email, id, list_type, title, value, note, done_at, order_index, quantity) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)",
        [u, it.id, listType, cut(it.title, T.title), Number(it.value) || 0, cut(it.note, T.note), it.doneAt || null, it.order ?? null, optionalText(it.quantity)]
      );
    }
  });
}

export async function getSerasaItems(email) {
  const { rows } = await pool.query(
    `SELECT id, description, category, value, note, recurrent, paid_at AS "paidAt", due_date AS "dueDate",
            installment_total AS "installmentTotal", installment_number AS "installmentNumber",
            order_index AS "order"
     FROM serasa_items WHERE user_email = $1 ORDER BY category, order_index NULLS LAST, description`,
    [normalizeEmail(email)]
  );
  return rows.map((r) => ({ ...r, value: Number(r.value) }));
}

export function replaceSerasaItems(email, items) {
  return replaceOwned(email, "DELETE FROM serasa_items WHERE user_email = $1", [], async (client, u) => {
    for (const it of items) {
      await client.query(
        `INSERT INTO serasa_items (user_email, id, description, category, value, note, recurrent, paid_at, due_date, installment_total, installment_number, order_index)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [
          u,
          it.id,
          cut(it.description, T.title),
          it.category == null ? null : cut(it.category, T.short),
          Number(it.value) || 0,
          cut(it.note, T.note),
          !!it.recurrent,
          it.paidAt || null,
          it.dueDate || null,
          it.installmentTotal ?? null,
          it.installmentNumber ?? null,
          it.order ?? null,
        ]
      );
    }
  });
}

export async function getCards(email) {
  const { rows } = await pool.query(
    `SELECT id, payment_method AS "paymentMethod", balance, reference_date AS "referenceDate", note,
            last_digits AS "lastDigits"
     FROM cards WHERE user_email = $1 ORDER BY payment_method`,
    [normalizeEmail(email)]
  );
  return rows.map((r) => ({ ...r, balance: Number(r.balance) }));
}

export function replaceCards(email, items) {
  return replaceOwned(email, "DELETE FROM cards WHERE user_email = $1", [], async (client, u) => {
    // uma forma de pagamento = um saldo: duas linhas descontariam o mesmo gasto duas vezes
    const seen = new Set();
    for (const it of items) {
      const method = cut(it.paymentMethod, T.short).trim();
      if (!method || !it.referenceDate || seen.has(method)) continue;
      seen.add(method);
      await client.query(
        `INSERT INTO cards (user_email, id, payment_method, balance, reference_date, note, last_digits)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [u, it.id, method, Number(it.balance) || 0, it.referenceDate, cut(it.note, T.note), lastDigitsOf(it.lastDigits)]
      );
    }
  });
}

export async function getCardClosings(email, month) {
  const { rows } = await pool.query(
    `SELECT id, card_name AS "cardName", value, order_index AS "order", created_at AS "createdAt"
     FROM card_closings WHERE user_email = $1 AND month = $2 ORDER BY order_index NULLS LAST, card_name`,
    [normalizeEmail(email), month]
  );
  return rows.map((r) => ({ ...r, value: Number(r.value) }));
}

export function replaceCardClosings(email, month, items) {
  return replaceOwned(email, "DELETE FROM card_closings WHERE user_email = $1 AND month = $2", [month], async (client, u) => {
    await client.query("INSERT INTO months (user_email, month) VALUES ($1, $2) ON CONFLICT DO NOTHING", [u, month]);
    for (const it of items) {
      const name = cut(it.cardName, T.short).trim();
      if (!name) continue;
      await client.query(
        `INSERT INTO card_closings (user_email, id, card_name, value, month, order_index, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [u, it.id, name, Number(it.value) || 0, month, it.order ?? null, it.createdAt || new Date().toISOString()]
      );
    }
  });
}

/* ---------- pareamento de celular ---------- */

export async function createPairingCode(email, codeHash, ttlMinutes) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    /* Um código vivo por pessoa + varredura dos expirados: a tabela nunca
       acumula backlog, então nenhum cron precisa existir. */
    await client.query(
      "DELETE FROM pairing_codes WHERE email = $1 OR expires_at <= now()",
      [normalizeEmail(email)]
    );
    const { rows } = await client.query(
      `INSERT INTO pairing_codes (code_hash, email, expires_at)
       VALUES ($1, $2, now() + ($3::int * interval '1 minute'))
       RETURNING expires_at`,
      [codeHash, normalizeEmail(email), ttlMinutes]
    );
    await client.query("COMMIT");
    return { expiresAt: rows[0].expires_at.getTime() };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

/* DELETE ... RETURNING é a troca atômica. Um SELECT seguido de UPDATE teria
   corrida entre lambdas: duas instâncias leriam a mesma linha viva e emitiriam
   dois tokens. Aqui só uma recebe linha de volta — uso único sai de graça, e a
   limpeza da linha consumida vem junto. */
export async function consumePairingCode(codeHash) {
  const { rows } = await pool.query(
    "DELETE FROM pairing_codes WHERE code_hash = $1 AND expires_at > now() RETURNING email",
    [codeHash]
  );
  return rows[0]?.email || null;
}

/* ---------- criação de UM item (app do celular e assistente) ----------
   O id vem do cliente e o INSERT é ON CONFLICT DO NOTHING: reenviar o mesmo
   pedido depois de "a resposta se perdeu" devolve created=false em vez de
   duplicar a linha. Gasto e ganho exigem que o mês já exista — criá-lo aqui
   pularia a propagação de recorrentes e parcelas que createMonth faz. */
async function monthExists(u, month) {
  const { rowCount } = await pool.query("SELECT 1 FROM months WHERE user_email = $1 AND month = $2", [u, month]);
  return rowCount > 0;
}

export async function createExpenseItem(email, month, e) {
  const u = normalizeEmail(email);
  if (!(await monthExists(u, month))) throw new NotFoundError("Mês não encontrado.");
  const { rowCount } = await pool.query(
    `INSERT INTO expenses (user_email, id, description, category, value, note, month, recurrent, due_date, installment_total, installment_number, purchase_total, paid_with_voucher, paid_with_clt_pj, payment_method, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
     ON CONFLICT (user_email, id) DO NOTHING`,
    [
      u, e.id, cut(e.description, T.title), e.category == null ? null : cut(e.category, T.short),
      Number(e.value) || 0, cut(e.note, T.note), month, !!e.recurrent, optionalDate(e.dueDate),
      Number.isInteger(e.installmentTotal) ? e.installmentTotal : null,
      Number.isInteger(e.installmentNumber) ? e.installmentNumber : null,
      Number.isFinite(e.purchaseTotal) ? e.purchaseTotal : null,
      !!e.paidWithVoucher, !!e.paidWithCltPj, e.paymentMethod ? cut(e.paymentMethod, T.short) : null,
      new Date().toISOString(),
    ]
  );
  return rowCount > 0;
}

export async function createIncomeItem(email, month, i) {
  const u = normalizeEmail(email);
  if (!(await monthExists(u, month))) throw new NotFoundError("Mês não encontrado.");
  const { rowCount } = await pool.query(
    `INSERT INTO incomes (user_email, id, source, value, note, month, recurrent, receipt_date, voucher_income, clt_pj_income, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     ON CONFLICT (user_email, id) DO NOTHING`,
    [u, i.id, cut(i.source, T.title), Number(i.value) || 0, cut(i.note, T.note), month, !!i.recurrent,
      optionalDate(i.receiptDate), !!i.voucherIncome, !!i.cltPjIncome, new Date().toISOString()]
  );
  return rowCount > 0;
}

export async function createWishItem(email, it) {
  const { rowCount } = await pool.query(
    `INSERT INTO wishlist_items (user_email, id, title, value, note, target_date)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (user_email, id) DO NOTHING`,
    [normalizeEmail(email), it.id, cut(it.title, T.title), Number(it.value) || 0, cut(it.note, T.note), optionalDate(it.targetDate)]
  );
  return rowCount > 0;
}

export async function createShoppingItem(email, listType, it) {
  const { rowCount } = await pool.query(
    `INSERT INTO shopping_items (user_email, id, list_type, title, value, note, quantity)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (user_email, id) DO NOTHING`,
    [normalizeEmail(email), it.id, listType, cut(it.title, T.title), Number(it.value) || 0, cut(it.note, T.note), optionalText(it.quantity)]
  );
  return rowCount > 0;
}
