import "./global.css";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { fetchMe, setToken, setUnauthorizedHandler } from "./src/api/client";
import { clearToken, loadToken, saveToken } from "./src/api/session";
import { clearCache, readCache, writeCache } from "./src/api/cache";
import PairScreen from "./src/screens/PairScreen";
import HomeScreen from "./src/screens/HomeScreen";

export default function App() {
  const [status, setStatus] = useState("checking"); // checking | pairing | ready
  const [email, setEmail] = useState("");

  /* Volta ao pareamento por qualquer 401: token expirado e ALLOWED_EMAIL
     trocado chegam iguais e significam a mesma coisa. */
  const signOut = useCallback(async () => {
    await clearToken();
    clearCache();
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
    writeCache("me", { email: me.email });
    setEmail(me.email);
    setStatus("ready");
  }, []);

  useEffect(() => {
    (async () => {
      const stored = await loadToken();
      if (!stored) return setStatus("pairing");
      setToken(stored);

      /* Com sessao ja vista antes, abre na hora e valida em segundo plano: a
         tela nao espera a rede. Se a validacao der 401, o handler global
         (signOut) volta ao pareamento; falha de rede so mantem o app aberto
         com os dados em cache. */
      const cached = await readCache("me");
      if (cached?.email) {
        setEmail(cached.email);
        setStatus("ready");
        fetchMe()
          .then((me) => {
            writeCache("me", { email: me.email });
            setEmail(me.email);
          })
          .catch(() => {});
        return;
      }

      try {
        const me = await fetchMe();
        writeCache("me", { email: me.email });
        setEmail(me.email);
        setStatus("ready");
      } catch {
        /* Sem cache nao ha o que mostrar offline: o handler de 401 ja limpou o
           SecureStore; qualquer outra falha cai no pareamento em vez de travar. */
        setStatus("pairing");
      }
    })();
  }, []);

  /* KeyboardProvider e o que faz o teclado ser visto DENTRO das folhas. O Modal
     do RN abre uma janela nativa propria e, com o edge-to-edge obrigatorio do
     Android 15+, o adjustResize dessa janela nao redimensiona nada; o
     KeyboardAvoidingView do RN so escuta a janela principal e fica cego la
     dentro. A lib observa tambem os dialogs do Modal. E dependencia nativa:
     chega por build, nao por update. */
  return (
    /* GestureHandlerRootView tem de envolver tudo que usa gesto (o arraste de
       reordenar). Por fora do SafeAreaProvider, ocupando a tela toda. */
    <GestureHandlerRootView style={{ flex: 1 }}>
    <SafeAreaProvider>
      <KeyboardProvider>
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
      </KeyboardProvider>
    </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
