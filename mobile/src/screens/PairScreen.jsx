import { useState } from "react";
import { ActivityIndicator, ScrollView, Text, TextInput, View } from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { Touchable } from "../ui/Touchable";
import { LinearGradient } from "expo-linear-gradient";
import { BrandMark } from "../ui/shell";
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

  /* KeyboardAvoidingView da react-native-keyboard-controller, com "padding"
     nas duas plataformas. Antes o Android ficava sem behavior apostando no
     adjustResize da janela, que no edge-to-edge obrigatorio nao encolhe nada
     — num aparelho baixo o botao Conectar sumia atras do teclado. style em
     vez de className: componente de fora do RN, o NativeWind nao o registra.

     Visual do login da web (fundo verde-escuro, cartao claro); o kit mobile
     nao tem essa tela, e o cartao fica claro tambem no modo escuro. */
  return (
    <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
      <LinearGradient colors={["#0b3125", "#0a2a20", "#082219"]} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center", padding: 22 }} keyboardShouldPersistTaps="handled">
          <View className="flex-row items-center gap-3 self-center mb-7">
            <BrandMark size={44} />
            <Text className="font-brand-bold text-[20px] text-white">Meu financeiro</Text>
          </View>

          <View className="rounded-[23px] bg-white p-6 gap-3.5" style={{ elevation: 10, shadowColor: "#031b15", shadowOpacity: 0.35, shadowRadius: 24, shadowOffset: { width: 0, height: 14 } }}>
            <Text className="font-display text-[28px] leading-[32px] text-[#10261e]">Conectar celular</Text>
            <Text className="font-brand text-[14px] leading-5 text-[#5f6b65]">
              Abra o site no computador, vá em Configurações › Parear celular e digite aqui o código.
            </Text>
            <TextInput
              value={display(code)}
              onChangeText={(t) => {
                setCode(normalize(t));
                if (error) setError("");
              }}
              placeholder="XXXX-XXXX"
              placeholderTextColor="#9aa59f"
              autoCapitalize="characters"
              autoCorrect={false}
              autoComplete="off"
              editable={!busy}
              onSubmitEditing={submit}
              returnKeyType="go"
              className="rounded-[14px] border bg-[#f7f8f6] px-4 py-5 mt-1 text-center font-display text-[26px] text-[#10261e]"
              style={{ letterSpacing: 6, borderColor: error ? "#bf705a" : "#c8a96a" }}
            />

            {error ? <Text className="font-brand text-[13px] text-[#bf705a] text-center">{error}</Text> : null}

            <Touchable onPress={submit} disabled={!ready} onDark className="h-[52px] rounded-[13px] items-center justify-center bg-[#16382c] disabled:opacity-40">
              {busy ? <ActivityIndicator color="#ffffff" /> : <Text className="font-brand-semibold text-[15px] text-white">Conectar</Text>}
            </Touchable>

            <Text className="font-brand text-[12px] text-[#758079] text-center">O código vale uma única vez e expira em 5 minutos.</Text>
          </View>
        </ScrollView>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}
