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
      recurrent BOOLEAN NOT NULL DEFAULT false
    );
  `);

  // bancos criados antes das colunas month/recurrent existirem
  await pool.query(`ALTER TABLE expenses ADD COLUMN IF NOT EXISTS month TEXT NOT NULL DEFAULT '${month}'`);
  await pool.query(`ALTER TABLE expenses ADD COLUMN IF NOT EXISTS recurrent BOOLEAN NOT NULL DEFAULT false`);
  await pool.query(`ALTER TABLE expenses ADD COLUMN IF NOT EXISTS paid_at TEXT DEFAULT NULL`);
  await pool.query(`ALTER TABLE expenses ADD COLUMN IF NOT EXISTS installment_total INTEGER DEFAULT NULL`);
  await pool.query(`ALTER TABLE expenses ADD COLUMN IF NOT EXISTS installment_number INTEGER DEFAULT NULL`);
  await pool.query(`ALTER TABLE incomes ADD COLUMN IF NOT EXISTS month TEXT NOT NULL DEFAULT '${month}'`);
  await pool.query(`ALTER TABLE incomes ADD COLUMN IF NOT EXISTS recurrent BOOLEAN NOT NULL DEFAULT false`);

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
    `SELECT id, description, category, value, note, recurrent, paid_at AS "paidAt",
            installment_total AS "installmentTotal", installment_number AS "installmentNumber"
     FROM expenses WHERE month = $1 ORDER BY description`,
    [month]
  );
  const { rows: incomes } = await pool.query(
    "SELECT id, source, value, note, recurrent FROM incomes WHERE month = $1 ORDER BY source",
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
        `INSERT INTO expenses (id, description, category, value, note, month, recurrent, paid_at, installment_total, installment_number)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          e.id,
          e.description,
          e.category,
          Number(e.value) || 0,
          e.note || "",
          month,
          !!e.recurrent,
          e.paidAt || null,
          e.installmentTotal ?? null,
          e.installmentNumber ?? null,
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
        "INSERT INTO incomes (id, source, value, note, month, recurrent) VALUES ($1, $2, $3, $4, $5, $6)",
        [i.id, i.source, Number(i.value) || 0, i.note || "", month, !!i.recurrent]
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
        `SELECT description, category, value, note, recurrent,
                installment_total AS "installmentTotal", installment_number AS "installmentNumber"
         FROM expenses
         WHERE month = $1
           AND (recurrent = true OR (installment_total IS NOT NULL AND installment_number < installment_total))`,
        [sourceMonth]
      );
      for (const e of carryForwardExpenses) {
        const isInstallment = e.installmentTotal != null;
        await client.query(
          `INSERT INTO expenses (id, description, category, value, note, month, recurrent, installment_total, installment_number)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            randomUUID(),
            e.description,
            e.category,
            e.value,
            e.note,
            newMonth,
            e.recurrent,
            isInstallment ? e.installmentTotal : null,
            isInstallment ? e.installmentNumber + 1 : null,
          ]
        );
      }

      const { rows: recurIncomes } = await client.query(
        "SELECT source, value, note FROM incomes WHERE month = $1 AND recurrent = true",
        [sourceMonth]
      );
      for (const i of recurIncomes) {
        await client.query(
          "INSERT INTO incomes (id, source, value, note, month, recurrent) VALUES ($1, $2, $3, $4, $5, true)",
          [randomUUID(), i.source, i.value, i.note, newMonth]
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
