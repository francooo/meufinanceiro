import "./global.css";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { Text, View } from "react-native";
import { Wallet } from "lucide-react-native";

export default function App() {
  return (
    <SafeAreaProvider>
      <SafeAreaView className="flex-1" style={{ backgroundColor: "#F1F4F2" }}>
        <View className="flex-1 items-center justify-center gap-4 px-6">
          <View
            className="h-16 w-16 rounded-2xl items-center justify-center"
            style={{ backgroundColor: "#16382c" }}
          >
            <Wallet size={30} color="#ffffff" />
          </View>
          <Text className="text-xl font-bold text-slate-800">Meu financeiro</Text>
          <Text className="text-sm text-slate-500 text-center">
            NativeWind ativo. Fase 1 concluída.
          </Text>
        </View>
        <StatusBar style="dark" />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
