import { useCallback, useEffect, useRef } from "react";
import { AppState } from "react-native";

/* A web nao tem debounce: cada mudanca de estado dispara um PUT da colecao
   inteira, e no servidor isso e DELETE + re-INSERT do mes numa transacao. No
   celular, em rede movel, isso seria uma transacao por tecla digitada.

   O custo de adicionar o debounce e que passa a existir uma escrita pendente —
   por isso `flush` e devolvido, e quem chama PRECISA chama-lo antes de qualquer
   coisa que invalide o pendente (trocar de mes, sair). Sem isso a ultima edicao
   se perde, um bug que a versao sem debounce nao tem. */
export function useDebouncedSave(value, save, { enabled, delay = 1000 } = {}) {
  const saveRef = useRef(save);
  const pendingRef = useRef(null);
  const timerRef = useRef(null);
  saveRef.current = save;

  const flush = useCallback(() => {
    if (!pendingRef.current) return;
    const run = pendingRef.current;
    pendingRef.current = null;
    clearTimeout(timerRef.current);
    run();
  }, []);

  useEffect(() => {
    if (!enabled) return undefined;
    /* O valor e congelado no agendamento, nao lido no disparo: senao um flush
       depois da troca de mes gravaria os dados do mes novo sob a chave antiga. */
    const snapshot = value;
    pendingRef.current = () => saveRef.current(snapshot);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(flush, delay);
    return () => clearTimeout(timerRef.current);
  }, [value, enabled, delay, flush]);

  useEffect(() => {
    /* Ir para segundo plano com escrita pendente perderia a edicao para sempre:
       o PUT e substituicao total, nao existe fila offline que recupere depois. */
    const sub = AppState.addEventListener("change", (s) => {
      if (s !== "active") flush();
    });
    return () => sub.remove();
  }, [flush]);

  return flush;
}
