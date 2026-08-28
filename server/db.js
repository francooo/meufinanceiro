import pg from "pg";
import { randomUUID } from "node:crypto";
import { SEED_EXPENSES, SEED_INCOMES } from "./seed.js";

const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

export function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function addOneMonthToDate(iso) {
  if (!iso) return null;
  const [y, m, d] = iso.split("-").map(Number);
  const daysInNextMonth = new Date(y, m + 1, 0).getDate();
  const day = Math.min(d, daysInNextMonth);
  const next = new Date(y, m, day);
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}-${String(next.getDate()).padStart(2, "0")}`;
}

export async function migrate() {
  const month = currentMonth();

  await pool.query(`
    CREATE TABLE IF NOT EXISTS months (
      month TEXT PRIMARY KEY
    );
  `);
  await pool.query(`
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
      installment_number INTEGER DEFAULT NULL
    );
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS incomes (
      id TEXT PRIMARY KEY,
      source TEXT NOT NULL,
      value NUMERIC NOT NULL DEFAULT 0,
      note TEXT DEFAULT '',
      month TEXT NOT NULL DEFAULT '${month}',
      recurrent BOOLEAN NOT NULL DEFAULT false,
      receipt_date TEXT DEFAULT NULL
    );
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS wishlist_items (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      value NUMERIC NOT NULL DEFAULT 0,
      note TEXT DEFAULT '',
      done_at TEXT DEFAULT NULL,
      order_index INTEGER DEFAULT NULL
    );
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS shopping_items (
      id TEXT PRIMARY KEY,
      list_type TEXT NOT NULL,
      title TEXT NOT NULL,
      value NUMERIC NOT NULL DEFAULT 0,
      note TEXT DEFAULT '',
      done_at TEXT DEFAULT NULL
    );
  `);
  await pool.query(`
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

  // bancos criados antes das colunas month/recurrent existirem
  await pool.query(`ALTER TABLE expenses ADD COLUMN IF NOT EXISTS month TEXT NOT NULL DEFAULT '${month}'`);
  await pool.query(`ALTER TABLE expenses ADD COLUMN IF NOT EXISTS recurrent BOOLEAN NOT NULL DEFAULT false`);
  await pool.query(`ALTER TABLE expenses ADD COLUMN IF NOT EXISTS paid_at TEXT DEFAULT NULL`);
  await pool.query(`ALTER TABLE expenses ADD COLUMN IF NOT EXISTS installment_total INTEGER DEFAULT NULL`);
  await pool.query(`ALTER TABLE expenses ADD COLUMN IF NOT EXISTS installment_number INTEGER DEFAULT NULL`);
  await pool.query(`ALTER TABLE expenses ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT NULL`);
  await pool.query(`ALTER TABLE expenses ADD COLUMN IF NOT EXISTS due_date TEXT DEFAULT NULL`);
  await pool.query(`ALTER TABLE incomes ADD COLUMN IF NOT EXISTS month TEXT NOT NULL DEFAULT '${month}'`);
  await pool.query(`ALTER TABLE incomes ADD COLUMN IF NOT EXISTS recurrent BOOLEAN NOT NULL DEFAULT false`);
  await pool.query(`ALTER TABLE incomes ADD COLUMN IF NOT EXISTS receipt_date TEXT DEFAULT NULL`);
  await pool.query(`ALTER TABLE wishlist_items ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT NULL`);

  await pool.query("INSERT INTO months (month) VALUES ($1) ON CONFLICT DO NOTHING", [month]);
  await pool.query(`
    INSERT INTO months (month)
    SELECT DISTINCT month FROM expenses
    UNION
    SELECT DISTINCT month FROM incomes
    ON CONFLICT DO NOTHING
  `);

  const { rows: expenseCount } = await pool.query("SELECT COUNT(*)::int AS n FROM expenses");
  const { rows: incomeCount } = await pool.query("SELECT COUNT(*)::int AS n FROM incomes");

  if (expenseCount[0].n === 0 && incomeCount[0].n === 0) {
    await replaceExpenses(month, SEED_EXPENSES);
    await replaceIncomes(month, SEED_INCOMES);
  }
}

export async function getMonths() {
  const { rows } = await pool.query("SELECT month FROM months ORDER BY month");
  return rows.map((r) => r.month);
}

export async function getData(month) {
  const { rows: expenses } = await pool.query(
    `SELECT id, description, category, value, note, recurrent, paid_at AS "paidAt", due_date AS "dueDate",
            installment_total AS "installmentTotal", installment_number AS "installmentNumber",
            order_index AS "order"
     FROM expenses WHERE month = $1 ORDER BY category, order_index NULLS LAST, description`,
    [month]
  );
  const { rows: incomes } = await pool.query(
    'SELECT id, source, value, note, recurrent, receipt_date AS "receiptDate" FROM incomes WHERE month = $1 ORDER BY source',
    [month]
  );
  return {
    expenses: expenses.map((e) => ({ ...e, value: Number(e.value) })),
    incomes: incomes.map((i) => ({ ...i, value: Number(i.value) })),
  };
}

export async function replaceExpenses(month, expenses) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("INSERT INTO months (month) VALUES ($1) ON CONFLICT DO NOTHING", [month]);
    await client.query("DELETE FROM expenses WHERE month = $1", [month]);
    for (const e of expenses) {
      await client.query(
        `INSERT INTO expenses (id, description, category, value, note, month, recurrent, paid_at, due_date, installment_total, installment_number, order_index)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [
          e.id,
          e.description,
          e.category,
          Number(e.value) || 0,
          e.note || "",
          month,
          !!e.recurrent,
          e.paidAt || null,
          e.dueDate || null,
          e.installmentTotal ?? null,
          e.installmentNumber ?? null,
          e.order ?? null,
        ]
      );
    }
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function replaceIncomes(month, incomes) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("INSERT INTO months (month) VALUES ($1) ON CONFLICT DO NOTHING", [month]);
    await client.query("DELETE FROM incomes WHERE month = $1", [month]);
    for (const i of incomes) {
      await client.query(
        "INSERT INTO incomes (id, source, value, note, month, recurrent, receipt_date) VALUES ($1, $2, $3, $4, $5, $6, $7)",
        [i.id, i.source, Number(i.value) || 0, i.note || "", month, !!i.recurrent, i.receiptDate || null]
      );
    }
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function createMonth(newMonth) {
  const { rows: exists } = await pool.query("SELECT 1 FROM months WHERE month = $1", [newMonth]);
  if (exists.length > 0) {
    throw new Error(`O mês ${newMonth} já existe.`);
  }

  const { rows: sourceRows } = await pool.query(
    "SELECT month FROM months WHERE month < $1 ORDER BY month DESC LIMIT 1",
    [newMonth]
  );
  const sourceMonth = sourceRows[0]?.month;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("INSERT INTO months (month) VALUES ($1)", [newMonth]);

    if (sourceMonth) {
      const { rows: carryForwardExpenses } = await client.query(
        `SELECT description, category, value, note, recurrent, due_date AS "dueDate",
                installment_total AS "installmentTotal", installment_number AS "installmentNumber",
                order_index AS "order"
         FROM expenses
         WHERE month = $1
           AND (recurrent = true OR (installment_total IS NOT NULL AND installment_number < installment_total))`,
        [sourceMonth]
      );
      for (const e of carryForwardExpenses) {
        const isInstallment = e.installmentTotal != null;
        await client.query(
          `INSERT INTO expenses (id, description, category, value, note, month, recurrent, due_date, installment_total, installment_number, order_index)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
          [
            randomUUID(),
            e.description,
            e.category,
            e.value,
            e.note,
            newMonth,
            e.recurrent,
            addOneMonthToDate(e.dueDate),
            isInstallment ? e.installmentTotal : null,
            isInstallment ? e.installmentNumber + 1 : null,
            e.order ?? null,
          ]
        );
      }

      const { rows: recurIncomes } = await client.query(
        'SELECT source, value, note, receipt_date AS "receiptDate" FROM incomes WHERE month = $1 AND recurrent = true',
        [sourceMonth]
      );
      for (const i of recurIncomes) {
        await client.query(
          "INSERT INTO incomes (id, source, value, note, month, recurrent, receipt_date) VALUES ($1, $2, $3, $4, $5, true, $6)",
          [randomUUID(), i.source, i.value, i.note, newMonth, addOneMonthToDate(i.receiptDate)]
        );
      }
    }

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }

  return getData(newMonth);
}

export async function getWishlist() {
  const { rows } = await pool.query(
    `SELECT id, title, value, note, done_at AS "doneAt", order_index AS "order"
     FROM wishlist_items
     ORDER BY (done_at IS NULL) DESC, order_index NULLS LAST, title`
  );
  return rows.map((r) => ({ ...r, value: Number(r.value) }));
}

export async function replaceWishlist(items) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("DELETE FROM wishlist_items");
    for (const it of items) {
      await client.query(
        "INSERT INTO wishlist_items (id, title, value, note, done_at, order_index) VALUES ($1, $2, $3, $4, $5, $6)",
        [it.id, it.title, Number(it.value) || 0, it.note || "", it.doneAt || null, it.order ?? null]
      );
    }
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function getShoppingList(listType) {
  const { rows } = await pool.query(
    `SELECT id, title, value, note, done_at AS "doneAt"
     FROM shopping_items
     WHERE list_type = $1
     ORDER BY (done_at IS NULL) DESC, title`,
    [listType]
  );
  return rows.map((r) => ({ ...r, value: Number(r.value) }));
}

export async function replaceShoppingList(listType, items) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("DELETE FROM shopping_items WHERE list_type = $1", [listType]);
    for (const it of items) {
      await client.query(
        "INSERT INTO shopping_items (id, list_type, title, value, note, done_at) VALUES ($1, $2, $3, $4, $5, $6)",
        [it.id, listType, it.title, Number(it.value) || 0, it.note || "", it.doneAt || null]
      );
    }
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function getSerasaItems() {
  const { rows } = await pool.query(
    `SELECT id, description, category, value, note, recurrent, paid_at AS "paidAt", due_date AS "dueDate",
            installment_total AS "installmentTotal", installment_number AS "installmentNumber",
            order_index AS "order"
     FROM serasa_items ORDER BY category, order_index NULLS LAST, description`
  );
  return rows.map((r) => ({ ...r, value: Number(r.value) }));
}

export async function replaceSerasaItems(items) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("DELETE FROM serasa_items");
    for (const it of items) {
      await client.query(
        `INSERT INTO serasa_items (id, description, category, value, note, recurrent, paid_at, due_date, installment_total, installment_number, order_index)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          it.id,
          it.description,
          it.category,
          Number(it.value) || 0,
          it.note || "",
          !!it.recurrent,
          it.paidAt || null,
          it.dueDate || null,
          it.installmentTotal ?? null,
          it.installmentNumber ?? null,
          it.order ?? null,
        ]
      );
    }
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
