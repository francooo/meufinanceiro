import { useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import * as Updates from "expo-updates";
import Constants from "expo-constants";
import { RefreshCw } from "lucide-react-native";
import { Touchable } from "./Touchable";

/* Mostra qual versao esta rodando — APK embutido ou qual update OTA — para dar
   para conferir no proprio celular se uma atualizacao chegou, sem depender das
   metricas do EAS. O botao aplica na hora o update mais novo, em vez de exigir
   fechar e abrir o app duas vezes (o padrao do expo-updates baixa numa abertura
   e so aplica na seguinte). */

const shortDate = (d) =>
  d instanceof Date && !Number.isNaN(d.getTime())
    ? `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`
    : "";

const MESSAGES = {
  checking: "Procurando atualização…",
  downloading: "Baixando atualização…",
  latest: "Você já está na versão mais recente.",
  error: "Não foi possível buscar agora. Sem conexão?",
};

export function VersionFooter({ onBeforeReload }) {
  const [status, setStatus] = useState("idle"); // idle | checking | downloading | latest | error
  const busy = status === "checking" || status === "downloading";

  const version = Constants.expoConfig?.version || Updates.runtimeVersion || "?";
  const embedded = Updates.isEmbeddedLaunch || !Updates.updateId;
  const date = shortDate(Updates.createdAt);
  const source = embedded
    ? "versão do APK"
    : `update ${Updates.updateId.slice(0, 8)}${date ? ` · ${date}` : ""}`;

  const check = async () => {
    if (busy) return;
    setStatus("checking");
    try {
      const res = await Updates.checkForUpdateAsync();
      if (!res.isAvailable) {
        setStatus("latest");
        return;
      }
      setStatus("downloading");
      await Updates.fetchUpdateAsync();
      /* Grava o que estiver pendente ANTES de reiniciar: o reload descarta a
         memoria, e o autosave tem 1s de debounce. */
      await onBeforeReload?.();
      await Updates.reloadAsync();
    } catch {
      setStatus("error");
    }
  };

  return (
    <View className="items-center gap-2 pt-6 pb-2">
      <Text className="text-[11px] text-slate-400" style={{ fontVariant: ["tabular-nums"] }}>
        v{version} · {source}
      </Text>
      {/* Em desenvolvimento o expo-updates fica desligado: sem botao. */}
      {Updates.isEnabled ? (
        <Touchable
          onPress={check}
          disabled={busy}
          hitSlop={{ top: 6, bottom: 6 }}
          className="flex-row items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white disabled:opacity-60"
        >
          {busy ? <ActivityIndicator size="small" color="#64748b" /> : <RefreshCw size={13} color="#64748b" />}
          <Text className="text-xs font-medium text-slate-600">Buscar atualização</Text>
        </Touchable>
      ) : null}
      {MESSAGES[status] ? <Text className="text-[11px] text-slate-500">{MESSAGES[status]}</Text> : null}
    </View>
  );
}
