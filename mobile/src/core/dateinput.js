/* O app inteiro guarda data como string "YYYY-MM-DD" — e assim que a API grava e
   assim que os filtros comparam. Aqui so traduzimos para o que a pessoa digita.

   React Native nao tem <input type="date">, e trazer um date picker nativo seria
   mais uma dependencia para quebrar em upgrade de SDK. Um campo mascarado
   resolve, desde que a conversao seja rigorosa nas duas pontas. */

/* Aceita so digitos e vai inserindo as barras: "1109" -> "11/09". */
export function maskDateInput(raw) {
  const d = String(raw ?? "").replace(/\D/g, "").slice(0, 8);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`;
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
}

/* "11/09/2026" -> "2026-09-11", ou null se incompleto/inexistente.
   Valida o dia contra o mes de verdade: 31/02 nao passa, e o Date do JS
   silenciosamente viraria 03/03 se a gente confiasse nele. */
export function brToIso(br) {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(br ?? "").trim());
  if (!m) return null;
  const [, dd, mm, yyyy] = m;
  const day = Number(dd);
  const month = Number(mm);
  const year = Number(yyyy);
  if (month < 1 || month > 12) return null;
  if (year < 1900 || year > 2999) return null;
  const daysInMonth = new Date(year, month, 0).getDate();
  if (day < 1 || day > daysInMonth) return null;
  return `${yyyy}-${mm}-${dd}`;
}

/* "2026-09-11" -> "11/09/2026". Tolera nulo, ao contrario do formatDateBR da
   web, que quebraria a tela inteira ao receber null. */
export function isoToBr(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso ?? "").trim());
  if (!m) return "";
  const [, y, mo, d] = m;
  return `${d}/${mo}/${y}`;
}

/* Campo vazio e valido: vencimento e opcional. Preenchido pela metade nao e. */
export const isDateInputValid = (br) => {
  const t = String(br ?? "").trim();
  return t === "" || brToIso(t) !== null;
};
