import "./global.css";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { LogOut } from "lucide-react-native";
import { fetchMe, setToken, setUnauthorizedHandler } from "./src/api/client";
import { clearToken, loadToken, saveToken } from "./src/api/session";
import PairScreen from "./src/screens/PairScreen";

export default function App() {
  const [status, setStatus] = useState("checking"); // checking | pairing | ready
  const [email, setEmail] = useState("");

  /* Volta ao pareamento por qualquer 401: token expirado e ALLOWED_EMAIL
     trocado chegam iguais e significam a mesma coisa. */
  const signOut = useCallback(async () => {
    await clearToken();
    setToken(null);
    setEmail("");
    setStatus("pairing");
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(signOut);
  }, [signOut]);

  const activate = useCallback(async (token) => {
    await saveToken(token);
    setToken(token);
    const me = await fetchMe();
    setEmail(me.email);
    setStatus("ready");
  }, []);

  useEffect(() => {
    (async () => {
      const stored = await loadToken();
      if (!stored) return setStatus("pairing");
      setToken(stored);
      try {
        const me = await fetchMe();
        setEmail(me.email);
        setStatus("ready");
      } catch {
        /* o handler de 401 já limpou o SecureStore; qualquer outra falha
           (sem rede, por exemplo) também cai no pareamento em vez de travar */
        setStatus("pairing");
      }
    })();
  }, []);

  return (
    <SafeAreaProvider>
      <SafeAreaView className="flex-1" style={{ backgroundColor: "#F1F4F2" }}>
        {status === "checking" && (
          <View className="flex-1 items-center justify-center gap-3">
            <ActivityIndicator color="#16382c" />
            <Text className="text-sm text-slate-500">Verificando sessão…</Text>
          </View>
        )}

        {status === "pairing" && <PairScreen onPaired={activate} />}

        {status === "ready" && (
          <View className="flex-1 px-4 pt-4 gap-4">
            <View className="flex-row items-center justify-between">
              <View className="flex-1 min-w-0">
                <Text className="text-lg font-bold text-slate-800">Meu financeiro</Text>
                <Text className="text-xs text-slate-500" numberOfLines={1}>
                  {email}
                </Text>
              </View>
              {/* Logout aqui é só local: /api/auth/logout limpa cookie, que o
                  celular nunca teve. Chamá-lo daria a falsa impressão de que o
                  servidor revogou alguma coisa. */}
              <Pressable
                onPress={signOut}
                className="h-9 w-9 rounded-xl bg-white border border-slate-200 items-center justify-center"
              >
                <LogOut size={16} color="#64748b" />
              </Pressable>
            </View>

            <View className="flex-1 items-center justify-center gap-2">
              <Text className="text-base font-semibold text-slate-700">Celular pareado</Text>
              <Text className="text-sm text-slate-500 text-center px-6">
                Fase 2 concluída. As telas de Visão geral e Gastos vêm a seguir.
              </Text>
            </View>
          </View>
        )}
        <StatusBar style="dark" />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
