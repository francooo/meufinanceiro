import { Modal, Pressable, Text, View } from "react-native";

export default function ConfirmModal({ visible, item, onCancel, onConfirm }) {
  /* Mesma ordem de fallback do ConfirmModal da web, que le
     description || source || title || paymentMethod. */
  const nome = item?.description || item?.source || item?.title || item?.paymentMethod || "";

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onCancel}>
      <Pressable
        className="flex-1 items-center justify-center px-6"
        style={{ backgroundColor: "rgba(15,23,42,0.4)" }}
        onPress={onCancel}
      >
        <Pressable className="bg-white rounded-2xl w-full p-5" onPress={(e) => e.stopPropagation()}>
          <Text className="text-base font-bold text-slate-800 mb-1">Excluir lançamento?</Text>
          <Text className="text-sm text-slate-500 mb-5">
            “{nome}” será removido. Não dá pra desfazer.
          </Text>
          <View className="flex-row gap-2">
            <Pressable
              onPress={onCancel}
              className="flex-1 py-3 rounded-xl border border-slate-200 items-center"
            >
              <Text className="text-sm font-medium text-slate-600">Cancelar</Text>
            </Pressable>
            <Pressable onPress={onConfirm} className="flex-1 py-3 rounded-xl items-center bg-rose-600">
              <Text className="text-sm font-semibold text-white">Excluir</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
