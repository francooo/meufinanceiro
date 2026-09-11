import { View } from "react-native";

export function Card({ children, className = "" }) {
  return (
    <View className={"bg-white rounded-2xl border border-slate-200 " + className}>{children}</View>
  );
}
