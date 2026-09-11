import "./global.css";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { fetchMe, setToken, setUnauthorizedHandler } from "./src/api/client";
import { clearToken, loadToken, saveToken } from "./src/api/session";
import PairScreen from "./src/screens/PairScreen";
import HomeScreen from "./src/screens/HomeScreen";

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

        {status === "ready" && <HomeScreen email={email} onSignOut={signOut} />}

        <StatusBar style="dark" />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
