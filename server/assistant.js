/* Assistente financeira: rotas /api/assistant/* (usadas pelo app do celular).
 *
 *   POST /api/assistant/chat        { messages, month, today } → { reply, proposal? }
 *   POST /api/assistant/transcribe  multipart "audio" (m4a)    → { text }
 *
 * A chave da Groq (GROQ_API_KEY) vive só aqui, nas variáveis da Vercel. Ela
 * nunca vai para o app: tudo que o Expo embute no APK é legível.
 *
 * Nada aqui grava no banco. A IA propõe; o app mostra um cartão de confirmação
 * e grava pelas rotas normais. Detalhes da lógica em assistant-core.js.
 *
 * Variáveis:
 *   GROQ_API_KEY      obrigatória
 *   GROQ_CHAT_MODEL   opcional (modelo com tool calling; padrão abaixo)
 *   GROQ_STT_MODEL    opcional (padrão whisper-large-v3-turbo)
 */
import multer from "multer";
import { getData, getMonths, getCategories, getPaymentMethods, hitRateLimit } from "./db.js";
import {
  MONTH_RE, buildTools, cleanHistory, mergeCategories, monthMentioned, monthSummary, rateLimitInfo,
  rateLimitMessage, runChat, systemPrompt,
} from "./assistant-core.js";

const GROQ_URL = "https://api.groq.com/openai/v1";
/* llama-3.3-70b-versatile foi desligado para contas free/dev em 16/08/2026.
   gpt-oss-120b é modelo de produção da Groq com tool calling. */
const CHAT_MODEL = process.env.GROQ_CHAT_MODEL || "openai/gpt-oss-120b";
const STT_MODEL = process.env.GROQ_STT_MODEL || "whisper-large-v3-turbo";

/* Plano gratuito da Groq: 8 mil tokens por minuto POR MODELO. Quando o
   principal estoura, a mesma pergunta vai para o reserva, que tem cota própria. */
const FALLBACK_MODEL = process.env.GROQ_FALLBACK_MODEL ?? "openai/gpt-oss-20b";
const CHAT_MODELS = [...new Set([CHAT_MODEL, FALLBACK_MODEL].filter(Boolean))];
/* gpt-oss aceita low/medium/high. Low gasta poucos tokens de raciocínio — que
   também consomem a cota por minuto — e basta para ler dados já calculados. */
const REASONING = /gpt-oss/.test(CHAT_MODELS.join(" "));

class UpstreamError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

class RateLimitError extends UpstreamError {
  constructor(info) {
    super(rateLimitMessage(info), 429);
    this.info = info;
  }
}

async function groq(path, init) {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new UpstreamError("Assistente indisponível: o servidor está sem GROQ_API_KEY.", 503);

  let res;
  try {
    res = await fetch(`${GROQ_URL}${path}`, {
      ...init,
      headers: { Authorization: `Bearer ${key}`, ...(init.headers || {}) },
      signal: AbortSignal.timeout(25000),
    });
  } catch (err) {
    console.error(`Groq ${path} sem resposta:`, err?.name || err);
    throw new UpstreamError("Não foi possível falar com a IA agora. Tente de novo.", 502);
  }
  if (res.status === 429) {
    const info = rateLimitInfo((name) => res.headers.get(name), await res.text().catch(() => ""));
    /* Sem isso não dá para saber QUAL limite estourou (por minuto ou diário). */
    console.warn("groq 429", JSON.stringify({ path, ...info }));
    throw new RateLimitError(info);
  }
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    console.error(`Groq ${path} HTTP ${res.status}:`, detail.slice(0, 500));
    throw new UpstreamError("A IA respondeu com erro. Tente de novo.", 502);
  }
  return res.json();
}

/* Cada conta tem a própria cota: o app é aberto a qualquer conta Google, e
   a conta da Groq é uma só. Falha do banco no limitador não trava ninguém. */
async function overQuota(name, email, limit, windowSeconds) {
  try {
    return !(await hitRateLimit(`${name}:${email}`, limit, windowSeconds));
  } catch (err) {
    console.error(`rate limit ${name} failed:`, err);
    return false;
  }
}

const upload = multer({
  storage: multer.memoryStorage(),
  /* A Vercel corta corpos acima de ~4,5 MB antes de chegar aqui; o app grava
     em 64 kbps, o que dá vários minutos de fala dentro desse limite. */
  limits: { fileSize: 4 * 1024 * 1024, files: 1 },
});

/* O Whisper deduz o formato pela EXTENSÃO do nome. O celular manda m4a; o
   navegador grava webm (Chrome/Firefox), mp4 (Safari) ou ogg. */
const AUDIO_EXT = { "audio/webm": "webm", "audio/ogg": "ogg", "audio/mp4": "mp4", "audio/m4a": "m4a",
  "audio/x-m4a": "m4a", "audio/mpeg": "mp3", "audio/wav": "wav", "audio/x-wav": "wav" };
export function audioFile(file) {
  const type = String(file?.mimetype || "").split(";")[0].trim().toLowerCase();
  const fromName = /\.(webm|ogg|mp4|m4a|mp3|wav|flac)$/i.exec(file?.originalname || "")?.[1]?.toLowerCase();
  const ext = AUDIO_EXT[type] || fromName || "m4a";
  return { name: `audio.${ext}`, type: type || "audio/m4a" };
}

const send = (res, err, route) => {
  if (err instanceof UpstreamError) return res.status(err.status).json({ error: err.message });
  console.error(`${route} failed:`, err);
  return res.status(500).json({ error: "Falha ao processar o pedido da assistente." });
};

export function registerAssistantRoutes(app, { requireAuth }) {
  app.post("/api/assistant/chat", requireAuth, async (req, res) => {
    const { messages, month, today } = req.body || {};
    const history = cleanHistory(messages);
    if (history.length === 0) return res.status(400).json({ error: "Envie ao menos uma mensagem." });
    if (typeof month !== "string" || !MONTH_RE.test(month)) {
      return res.status(400).json({ error: "Mês inválido. Use o formato AAAA-MM." });
    }
    const todayMonth = typeof today === "string" && MONTH_RE.test(today) ? today : month;

    if (await overQuota("assistant-chat", req.userEmail, 20, 60)) {
      return res.status(429).json({ error: "Muitas mensagens seguidas. Aguarde um minuto." });
    }

    try {
      const months = await getMonths(req.userEmail);
      /* Pergunta que cita um mês ("outubro de 2026", "mês passado") já recebe
         os dados DESSE mês na primeira chamada: consultar pela ferramenta custaria
         uma segunda chamada e estouraria a cota por minuto da Groq. */
      const lastUser = [...history].reverse().find((m) => m.role === "user")?.content;
      const cited = monthMentioned(lastUser, todayMonth);
      const dataMonth = cited && months.includes(cited) ? cited : month;

      const [data, custom, methods] = await Promise.all([
        getData(req.userEmail, dataMonth),
        getCategories(req.userEmail),
        getPaymentMethods(req.userEmail),
      ]);
      const categories = mergeCategories(custom);
      const paymentMethods = [...new Set(["Pix", ...methods])];
      const tools = buildTools(categories);
      const system = systemPrompt({
        month, today: todayMonth, months, categories, paymentMethods,
        summary: monthSummary(dataMonth, data),
      });

      /* O modelo reserva entra quando o principal bate no limite, e fica para o
         resto da pergunta (a leitura de outro mês não volta ao que estourou). */
      let modelIndex = 0;
      let calls = 0;
      const callModel = async (messages) => {
        for (;;) {
          const model = CHAT_MODELS[modelIndex];
          try {
            calls++;
            const completion = await groq("/chat/completions", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                model,
                temperature: 0.2,
                max_completion_tokens: 700,
                ...(REASONING ? { reasoning_effort: "low", include_reasoning: false } : null),
                tools,
                tool_choice: "auto",
                parallel_tool_calls: false,
                messages,
              }),
            });
            return completion?.choices?.[0]?.message;
          } catch (err) {
            const canFallBack = err instanceof RateLimitError && modelIndex < CHAT_MODELS.length - 1;
            if (!canFallBack) throw err;
            modelIndex++;
          }
        }
      };

      const { response, reads } = await runChat({
        months,
        messages: [{ role: "system", content: system }, ...history],
        callModel,
        loadMonth: (m) => getData(req.userEmail, m),
      });

      /* Só contagens, nunca conteúdo nem e-mail: é o que responde "a IA recebeu
         os dados?" e "por que estourou o limite?" quando algo parecer errado. */
      console.info("assistant chat", JSON.stringify({
        month, dataMonth, expenses: data.expenses.length, incomes: data.incomes.length, reads,
        model: CHAT_MODELS[modelIndex], calls, promptChars: system.length,
        action: response.proposal?.action || null,
      }));
      res.json(response);
    } catch (err) {
      send(res, err, "POST /api/assistant/chat");
    }
  });

  app.post("/api/assistant/transcribe", requireAuth, async (req, res) => {
    if (await overQuota("assistant-stt", req.userEmail, 10, 60)) {
      return res.status(429).json({ error: "Muitos áudios seguidos. Aguarde um minuto." });
    }

    upload.single("audio")(req, res, async (uploadErr) => {
      if (uploadErr) {
        const tooBig = uploadErr.code === "LIMIT_FILE_SIZE";
        return res.status(tooBig ? 413 : 400).json({
          error: tooBig ? "Áudio longo demais. Grave uma mensagem mais curta." : "Falha ao receber o áudio.",
        });
      }
      if (!req.file?.buffer?.length) return res.status(400).json({ error: "Nenhum áudio recebido." });

      try {
        const { name, type } = audioFile(req.file);
        const form = new FormData();
        form.append("file", new Blob([req.file.buffer], { type }), name);
        form.append("model", STT_MODEL);
        form.append("language", "pt");
        form.append("response_format", "json");

        const out = await groq("/audio/transcriptions", { method: "POST", body: form });
        const text = String(out?.text || "").trim();
        if (!text) return res.status(422).json({ error: "Não consegui entender o áudio. Tente falar de novo." });
        res.json({ text: text.slice(0, 2000) });
      } catch (err) {
        send(res, err, "POST /api/assistant/transcribe");
      }
    });
  });
}
