import { Modal, Pressable, Text, View } from "react-native";
import { Trash2 } from "lucide-react-native";
import { Touchable } from "../ui/Touchable";
import { IconBubble } from "../ui/kit";
import { useTheme } from "../ui/theme";

export default function ConfirmModal({ visible, item, onCancel, onConfirm }) {
  const { colors } = useTheme();
  /* Mesma ordem de fallback do ConfirmModal da web, que le
     description || source || title || paymentMethod. */
  const nome = item?.description || item?.source || item?.title || item?.cardName || item?.paymentMethod || "";

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onCancel}>
      {/* Fundo e folha ficam Pressable cru: ripple de tela inteira num backdrop
          pareceria defeito, e a folha so engole o toque. */}
      <Pressable className="flex-1 items-center justify-center px-6" style={{ backgroundColor: colors.scrim }} onPress={onCancel}>
        <Pressable className="bg-surface rounded-[20px] w-full p-5" onPress={(e) => e.stopPropagation()}>
          <IconBubble icon={Trash2} tone="coral" />
          <Text className="font-display text-[21px] text-heading mt-3 mb-1">Excluir lançamento?</Text>
          <Text className="font-brand text-[14px] text-muted mb-5 leading-5">“{nome}” será removido. Não dá pra desfazer.</Text>
          <View className="flex-row gap-2">
            <Touchable onPress={onCancel} className="flex-1 h-12 rounded-[12px] border border-line items-center justify-center">
              <Text className="font-brand-medium text-[14px] text-ink">Cancelar</Text>
            </Touchable>
            <Touchable onDark onPress={onConfirm} className="flex-1 h-12 rounded-[12px] items-center justify-center bg-coral">
              <Text className="font-brand-semibold text-[14px] text-white">Excluir</Text>
            </Touchable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
