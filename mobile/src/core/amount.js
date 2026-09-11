/* O teclado decimal pt-BR entrega "1.234,56". parseFloat devolve 1.234 — sem
   erro, sem NaN, sem nada que uma validacao "!isNaN" consiga detectar. O gasto
   entraria no banco mil vezes menor e so apareceria quando o total nao fechasse.
   Na web isso nao acontece porque <input type="number"> normaliza antes. */
export function parseAmount(raw) {
  const s = String(raw ?? "").trim().replace(/\s/g, "");
  if (!s) return NaN;
  const normalized = s.includes(",")
    ? s.replace(/\./g, "").replace(",", ".") // "1.234,56" -> "1234.56"
    : s;                                      // "1234.56" ja esta pronto
  const n = Number(normalized);
  return Number.isFinite(n) ? n : NaN;
}
