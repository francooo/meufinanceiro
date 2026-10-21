/* Mais › Configuracoes. Nao tem mock: segue as pecas do kit. */
import { Text, View } from "react-native";
import { LogOut, Monitor, Moon, Sun } from "lucide-react-native";
import { Button, PageHeader, Panel, SectionTitle } from "../ui/kit";
import { SegmentedField } from "../ui/fields";
import { VersionFooter } from "../ui/VersionFooter";
import { initialsOf } from "../ui/shell";
import { useTheme } from "../ui/theme";

const THEMES = [
  { value: "light", label: "Claro", icon: Sun },
  { value: "dark", label: "Escuro", icon: Moon },
  { value: "system", label: "Sistema", icon: Monitor },
];

export default function SettingsTab({ email, onSignOut, onBeforeReload }) {
  const { prefs, setPref } = useTheme();
  return (
    <View className="gap-3.5">
      <PageHeader title="Configurações" subtitle="Sua conta e o aplicativo" />
      <Panel>
        <SectionTitle>Conta</SectionTitle>
        <View className="flex-row items-center gap-3.5">
          <View className="h-12 w-12 rounded-full items-center justify-center bg-forest">
            <Text className="font-brand-bold text-[15px] text-white">{initialsOf(email)}</Text>
          </View>
          <View className="flex-1 min-w-0">
            <Text className="font-brand text-[12px] text-muted">Conectado como</Text>
            <Text className="font-brand-medium text-[15px] text-ink" numberOfLines={1}>
              {email || "—"}
            </Text>
          </View>
        </View>
      </Panel>
      <Panel>
        <SectionTitle>Aparência</SectionTitle>
        <SegmentedField value={prefs.theme} options={THEMES} onSelect={(v) => setPref("theme", v)} />
        <Text className="font-brand text-[12px] text-muted mt-2">"Sistema" acompanha o modo claro/escuro do celular.</Text>
      </Panel>
      <Panel>
        <SectionTitle>Aplicativo</SectionTitle>
        <VersionFooter onBeforeReload={onBeforeReload} />
      </Panel>
      <Panel>
        <Button label="Sair da conta" icon={LogOut} variant="danger" onPress={onSignOut} />
      </Panel>
    </View>
  );
}
