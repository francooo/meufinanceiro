import { Modal, ScrollView, Text, View } from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Touchable } from "./Touchable";
import { X } from "lucide-react-native";

/* O esqueleto de toda folha de formulario: fundo escurecido, cabecalho com X,
   area rolavel com os campos e rodape Cancelar/Salvar. Gasto, ganho, divida,
   cartao, desejo e lista de compra so trocam o que vai dentro. Um lugar so
   para que o proximo ajuste de teclado ou de inset chegue a todas de uma vez —
   foi a copia em tres arquivos que deixou o bug do teclado espalhado. */
export function Sheet({ visible, title, onClose, onSave, canSave, children }) {
  /* Modal do RN e uma janela nativa: fica FORA do SafeAreaView de App.jsx, entao
     o inset da barra de gestos precisa ser aplicado aqui dentro na mao. */
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      {/* KeyboardAvoidingView da react-native-keyboard-controller, nao do RN.
          O do RN escuta so a janela principal do app e nao enxerga o teclado
          aberto sobre a janela propria do Modal — no Android edge-to-edge o
          adjustResize dessa janela tambem nao faz nada. A lib observa os
          dialogs do Modal e "padding" vale para as duas plataformas.

          style, nao className: o NativeWind so registra cssInterop nos
          componentes do proprio RN; num componente de fora a className e
          ignorada sem erro nenhum. */}
      <KeyboardAvoidingView
        style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(15,23,42,0.4)" }}
        behavior="padding"
      >
        <View className="bg-white rounded-t-2xl" style={{ maxHeight: "92%" }}>
          <View className="flex-row items-center justify-between px-5 pt-5 pb-3">
            <Text className="text-base font-bold text-slate-800">{title}</Text>
            <Touchable
              variant="icon"
              onPress={onClose}
              className="h-11 w-11 -mr-2 rounded-full items-center justify-center"
            >
              <X size={18} color="#94a3b8" />
            </Touchable>
          </View>

          {/* keyboardShouldPersistTaps: sem isto, o primeiro toque so fecha o
              teclado e o botao Salvar exige dois toques.

              flexShrink: 1 e obrigatorio, nao cosmetico. No RN o padrao e
              flexShrink: 0 (na web e 1): o Yoga mede este ScrollView com a
              altura INTEIRA do conteudo, o maxHeight da folha corta o
              container, e o que sobra — o rodape com o Salvar — fica fora do
              corte, meio visivel e sem receber toque. E tambem o que deixa os
              campos subirem quando o teclado reduz a altura disponivel. */}
          <ScrollView
            className="px-5"
            style={{ flexShrink: 1 }}
            contentContainerStyle={{ paddingBottom: 20, gap: 14 }}
            keyboardShouldPersistTaps="handled"
          >
            {children}
          </ScrollView>

          <View
            className="flex-row gap-2 px-5 pt-3 border-t border-slate-100"
            style={{ paddingBottom: 12 + insets.bottom }}
          >
            <Touchable
              onPress={onClose}
              className="flex-1 py-3.5 rounded-xl border border-slate-200 items-center"
            >
              <Text className="text-sm font-medium text-slate-600">Cancelar</Text>
            </Touchable>
            <Touchable
              onDark
              onPress={onSave}
              disabled={!canSave}
              className="flex-1 py-3.5 rounded-xl items-center disabled:opacity-40"
              style={{ backgroundColor: "#16382c" }}
            >
              <Text className="text-sm font-semibold text-white">Salvar</Text>
            </Touchable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
