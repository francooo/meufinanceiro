/* Mais › Configuracoes. Nao tem mock: segue as pecas do kit. */
import { useState } from "react";
import { Text, View } from "react-native";
import { LogOut, Monitor, Moon, ShieldAlert, Sun } from "lucide-react-native";
import { Button, PageHeader, Panel, SectionTitle } from "../ui/kit";
import { Field, SegmentedField, TextField } from "../ui/fields";
import { Sheet } from "../ui/Sheet";
import { store } from "../api/store";
import { VersionFooter } from "../ui/VersionFooter";
import { initialsOf } from "../ui/shell";
import { useTheme } from "../ui/theme";

const THEMES = [
  { value: "light", label: "Claro", icon: Sun },
  { value: "dark", label: "Escuro", icon: Moon },
  { value: "system", label: "Sistema", icon: Monitor },
];

/* Digitar o proprio e-mail e a confirmacao (o servidor confere de novo). Depois
   da exclusao, onAccountDeleted limpa token e cache e volta ao pareamento. */
function DeleteAccountSheet({ email, onClose, onDeleted }) {
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const matches = typed.trim().toLowerCase() === String(email || "").toLowerCase();
  const submit = async () => {
    if (!matches || busy) return;
    setBusy(true);
    setError("");
    try {
      await store.deleteAccount(typed.trim());
      onDeleted();
    } catch (err) {
      setError(err?.message === "unauthorized" ? "Sua sessão expirou." : err?.message || "Não foi possível excluir a conta.");
      setBusy(false);
    }
  };
  return (
    <Sheet
      visible
      title="Excluir minha conta"
      subtitle="Apaga para sempre todas as suas finanças deste app."
      onClose={busy ? () => {} : onClose}
      onSave={submit}
      canSave={matches && !busy}
      saveLabel={busy ? "Excluindo…" : "Excluir para sempre"}
    >
      <Text className="font-brand text-[14px] text-muted leading-5">
        Meses, gastos, ganhos, cartões, dívidas e listas desta conta serão apagados, na web e no celular. Não dá para desfazer.
      </Text>
      <Field label="Digite seu e-mail para confirmar" error={error || undefined}>
        <TextField value={typed} onChangeText={setTyped} placeholder={email} autoFocus keyboardType="email-address" />
      </Field>
    </Sheet>
  );
}

export default function SettingsTab({ email, onSignOut, onAccountDeleted, onBeforeReload }) {
  const { prefs, setPref } = useTheme();
  const [deleting, setDeleting] = useState(false);
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
        <Button label="Sair da conta" icon={LogOut} variant="secondary" onPress={onSignOut} />
      </Panel>
      <Panel>
        <SectionTitle>Excluir minha conta</SectionTitle>
        <Text className="font-brand text-[13px] text-muted mb-3 leading-5">
          Apaga todas as suas finanças deste app. Cada conta só vê os próprios dados, e os seus deixam de existir.
        </Text>
        <Button label="Excluir minha conta" icon={ShieldAlert} variant="danger" onPress={() => setDeleting(true)} />
      </Panel>
      {deleting ? <DeleteAccountSheet email={email} onClose={() => setDeleting(false)} onDeleted={onAccountDeleted} /> : null}
    </View>
  );
}
