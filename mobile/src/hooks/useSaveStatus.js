import { useCallback, useRef, useState } from "react";

/* Sem isto, uma falha de gravacao e invisivel: as cinco chamadas de save fazem
   .catch(() => {}) e a edicao some sem sinal nenhum. Com o debounce de 1s o
   problema e pior que na web, porque a gravacao nem acontece no momento em que
   a pessoa mexeu — ela ja saiu da tela quando o PUT falha.

   Contador, nao booleano: sao cinco colecoes gravando em paralelo, e um
   booleano voltaria para "salvo" assim que a primeira terminasse.

   E `failed` por LOTE, nao so o contador: com uma falha e quatro sucessos, a
   ultima a terminar zeraria o contador e sobrescreveria o erro com "Salvo" —
   a edicao perdida sumiria da tela justamente pelo caminho feliz das outras. */
export function useSaveStatus({ okDuration = 1400 } = {}) {
  const [status, setStatus] = useState("idle"); // idle | saving | saved | error
  const pending = useRef(0);
  const failed = useRef(false);
  const timer = useRef(null);

  const track = useCallback(
    (promise) => {
      /* Lote novo comeca limpo: o erro anterior so e superado quando um lote
         inteiro passa sem falhar. */
      if (pending.current === 0) failed.current = false;
      pending.current += 1;
      clearTimeout(timer.current);
      setStatus("saving");

      const settle = () => {
        pending.current = Math.max(0, pending.current - 1);
        if (pending.current > 0) return;
        if (failed.current) {
          /* "Erro" fica ate a proxima gravacao dar certo — um aviso de falha
             que desaparece sozinho nao serve para nada. */
          setStatus("error");
          return;
        }
        setStatus("saved");
        timer.current = setTimeout(() => setStatus("idle"), okDuration);
      };

      return promise.then(settle, () => {
        failed.current = true;
        settle();
      });
    },
    [okDuration]
  );

  return { status, track };
}
