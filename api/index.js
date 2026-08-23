import { app } from "../server/app.js";
import { migrate } from "../server/db.js";

let migration;

function ensureMigrated() {
  if (!migration) {
    migration = migrate().catch((err) => {
      migration = null;
      throw err;
    });
  }
  return migration;
}

export default async function handler(req, res) {
  try {
    await ensureMigrated();
  } catch (err) {
    console.error("Falha ao migrar/conectar ao banco Neon:", err);
    res.status(500).json({ error: "Falha ao inicializar o banco." });
    return;
  }
  app(req, res);
}
