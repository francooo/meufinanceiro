import { Modal, ScrollView, Text, View } from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Touchable } from "./Touchable";
import { X } from "lucide-react-native";
import { useTheme } from "./theme";
import { STROKE } from "./icons";

/* O esqueleto de toda folha de formulario (modal-*.jpg do kit): alca, titulo
   serifado com subtitulo, X, area rolavel com os campos e rodape com o botao
   principal largo + "Cancelar" em link. Gasto, ganho, divida, cartao, desejo e
   lista de compra so trocam o que vai dentro. Um lugar so para que o proximo
   ajuste de teclado ou de inset chegue a todas de uma vez — foi a copia em tres
   arquivos que deixou o bug do teclado espalhado. */
export function Sheet({ visible, title, subtitle, onClose, onSave, canSave, saveLabel = "Salvar", children }) {
  /* Modal do RN e uma janela nativa: fica FORA do SafeAreaView de App.jsx, entao
     o inset da barra de gestos precisa ser aplicado aqui dentro na mao. */
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

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
      <KeyboardAvoidingView style={{ flex: 1, justifyContent: "flex-end", backgroundColor: colors.scrim }} behavior="padding">
        <View className="bg-surface rounded-t-[23px]" style={{ maxHeight: "94%" }}>
          <View className="self-center h-1 w-10 rounded-full bg-line mt-2.5" />
          <View className="flex-row items-start justify-between gap-3 px-5 pt-3 pb-3">
            <View className="flex-1 min-w-0">
              <Text className="font-display text-[25px] leading-[30px] text-heading">{title}</Text>
              {subtitle ? <Text className="font-display-regular text-[14px] text-muted mt-0.5">{subtitle}</Text> : null}
            </View>
            <Touchable
              variant="icon"
              onPress={onClose}
              accessibilityLabel="Fechar"
              className="h-10 w-10 -mr-1 rounded-full border border-line items-center justify-center"
            >
              <X size={18} color={colors.ink} strokeWidth={STROKE} />
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
            contentContainerStyle={{ paddingBottom: 20, paddingTop: 4, gap: 16 }}
            keyboardShouldPersistTaps="handled"
          >
            {children}
          </ScrollView>

          {onSave ? (
            <View className="px-5 pt-3 border-t border-line gap-1" style={{ paddingBottom: 8 + insets.bottom }}>
              <Touchable
                onDark
                onPress={onSave}
                disabled={!canSave}
                className="h-[52px] rounded-[13px] items-center justify-center bg-forest-2 disabled:opacity-40"
              >
                <Text className="font-brand-semibold text-[15px] text-white">{saveLabel}</Text>
              </Touchable>
              <Touchable variant="row" onPress={onClose} className="h-11 items-center justify-center rounded-[12px]">
                <Text className="font-brand-medium text-[14px] text-muted">Cancelar</Text>
              </Touchable>
            </View>
          ) : (
            <View style={{ height: insets.bottom + 12 }} />
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
