import "dotenv/config";
import { app } from "./app.js";
import { migrate } from "./db.js";

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
