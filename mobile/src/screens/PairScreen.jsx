import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Wallet } from "lucide-react-native";
import { redeemPairingCode } from "../api/client";

/* Espelha normalizePairingCode do servidor: o gerador nunca emite I, L, O ou U,
   então mapeá-los só perdoa quem digitou o que leu na tela. */
const normalize = (raw) =>
  String(raw || "")
    .toUpperCase()
    .replace(/[^0-9A-Z]/g, "")
    .replace(/[IL]/g, "1")
    .replace(/O/g, "0")
    .slice(0, 8);

const display = (code) => (code.length > 4 ? `${code.slice(0, 4)}-${code.slice(4)}` : code);

export default function PairScreen({ onPaired }) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const ready = code.length === 8 && !busy;

  const submit = async () => {
    if (!ready) return;
    setBusy(true);
    setError("");
    try {
      const { token } = await redeemPairingCode(code);
      await onPaired(token);
    } catch (err) {
      /* O servidor devolve uma mensagem só para toda falha de resgate, de
         propósito — repeti-la aqui já é tudo que dá para dizer. */
      setError(err.message === "unauthorized" ? "Código inválido ou expirado." : err.message);
      setCode("");
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView
      className="flex-1"
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={{ backgroundColor: "#F1F4F2" }}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: "center", padding: 24 }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="items-center gap-2">
          <LinearGradient
            colors={["#0f2e25", "#16382c", "#1e4a38"]}
            className="h-16 w-16 rounded-2xl items-center justify-center"
            style={{ borderRadius: 16 }}
          >
            <Wallet size={30} color="#ffffff" />
          </LinearGradient>
          <Text className="text-xl font-bold text-slate-800 mt-3">Meu financeiro</Text>
          <Text className="text-sm text-slate-500 text-center px-4">
            Abra o site no computador, toque no ícone de celular e digite aqui o código.
          </Text>
        </View>

        <View className="mt-8 gap-3">
          <TextInput
            value={display(code)}
            onChangeText={(t) => {
              setCode(normalize(t));
              if (error) setError("");
            }}
            placeholder="XXXX-XXXX"
            placeholderTextColor="#94a3b8"
            autoCapitalize="characters"
            autoCorrect={false}
            autoComplete="off"
            editable={!busy}
            onSubmitEditing={submit}
            returnKeyType="go"
            className="rounded-2xl border bg-white px-4 py-5 text-center text-2xl font-bold text-slate-800"
            style={{ letterSpacing: 6, borderColor: error ? "#e11d48" : "#e2e8f0" }}
          />

          {error ? <Text className="text-sm text-rose-600 text-center">{error}</Text> : null}

          <Pressable
            onPress={submit}
            disabled={!ready}
            className="rounded-2xl py-4 items-center justify-center"
            style={{ backgroundColor: "#16382c", opacity: ready ? 1 : 0.4 }}
          >
            {busy ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text className="text-white text-base font-semibold">Conectar</Text>
            )}
          </Pressable>

          <Text className="text-xs text-slate-400 text-center mt-1">
            O código vale uma única vez e expira em 5 minutos.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
