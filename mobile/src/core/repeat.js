/* Um gasto se repete de tres formas mutuamente exclusivas, e o servidor so
   propaga para o mes seguinte quando `recurrent = true` OU
   `installment_total IS NOT NULL AND installment_number < installment_total`
   (server/db.js:303). Errar isto nao da erro: o gasto simplesmente nao aparece
   no mes que vem, e so se descobre la. */

export const REPEAT_MODES = [
  { value: "none", label: "Única" },
  { value: "recurrent", label: "Recorrente" },
  { value: "installments", label: "Parcelada" },
];

/* Deduz o modo a partir do que ja esta gravado, para reabrir a edicao no
   estado certo. installmentTotal tem precedencia: um gasto parcelado nunca e
   recorrente ao mesmo tempo. */
export function repeatModeOf(item) {
  if (item?.installmentTotal) return "installments";
  if (item?.recurrent) return "recurrent";
  return "none";
}

/* Parcelamento exige um total inteiro de pelo menos 2 — "parcelado em 1x" e
   so um gasto comum, e o servidor nunca propagaria (1 < 1 e falso). */
export const isRepeatValid = (mode, total) =>
  mode !== "installments" || (Number.isInteger(total) && total >= 2);

/* Os tres campos saem juntos e coerentes: ligar um desliga os outros. Manter
   installmentTotal preenchido num gasto marcado como recorrente faria o
   servidor propagar pelos dois caminhos. */
export function repeatFields(mode, total, item) {
  if (mode === "installments") {
    return {
      recurrent: false,
      installmentTotal: total,
      /* Ao editar, preserva em qual parcela o gasto esta; ao criar, comeca na 1. */
      installmentNumber: item?.installmentNumber || 1,
    };
  }
  return {
    recurrent: mode === "recurrent",
    installmentTotal: null,
    installmentNumber: null,
  };
}

/* "3" -> 3; vazio ou lixo -> NaN, para a validacao recusar. */
export const parseInstallments = (raw) => {
  const t = String(raw ?? "").replace(/\D/g, "");
  return t === "" ? NaN : Number(t);
};
