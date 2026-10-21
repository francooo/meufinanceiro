import { createContext, createElement, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useColorScheme } from "react-native";
import { colorScheme as nwColorScheme } from "nativewind";
import * as SecureStore from "expo-secure-store";

/* Espelho em hex dos tokens de global.css, para o que nao aceita className: cor
   de icone do lucide, LinearGradient, SVG, StatusBar, RefreshControl, sombra.
   Mudou la, muda aqui. */
export const PALETTES = {
  light: {
    canvas: "#f3f5f2",
    surface: "#ffffff",
    surface2: "#f7f8f6",
    line: "#e7ebe7",
    ink: "#18251f",
    heading: "#10261e",
    muted: "#758079",
    forest: "#0f2e25",
    forest2: "#16382c",
    mint: "#7ed6a7",
    champagne: "#c8a96a",
    coral: "#bf705a",
    positive: "#187454",
    gold: "#98732c",
    tintGreen: "#eaf4ee",
    tintCoral: "#f9ece7",
    tintGold: "#f8f2e4",
    scrim: "rgba(12,24,20,0.55)",
  },
  dark: {
    canvas: "#0b1411",
    surface: "#111e19",
    surface2: "#172720",
    line: "#25362e",
    ink: "#e6eee9",
    heading: "#eaf1ec",
    muted: "#9aaba2",
    forest: "#0a211a",
    forest2: "#1f5c45",
    mint: "#7ed6a7",
    champagne: "#c8a96a",
    coral: "#e08a72",
    positive: "#5fc79a",
    gold: "#d4a84b",
    tintGreen: "#16332a",
    tintCoral: "#3a2520",
    tintGold: "#3a3220",
    scrim: "rgba(0,0,0,0.6)",
  },
};

/* Preferencias do aparelho numa chave propria do SecureStore: o signOut limpa
   so o token e o cache, entao tema e olho sobrevivem a um novo pareamento. */
const PREFS_KEY = "meucaixa.prefs";
const DEFAULT_PREFS = { theme: "system", hideValues: false, wallet: "cltPj" };

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const system = useColorScheme(); // "light" | "dark" | null
  const [prefs, setPrefs] = useState(DEFAULT_PREFS);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    SecureStore.getItemAsync(PREFS_KEY)
      .then((raw) => raw && setPrefs({ ...DEFAULT_PREFS, ...JSON.parse(raw) }))
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  const scheme = prefs.theme === "system" ? (system === "dark" ? "dark" : "light") : prefs.theme;

  /* colorScheme.set liga/desliga a classe `dark` que troca as variaveis CSS. */
  useEffect(() => {
    nwColorScheme.set(scheme);
  }, [scheme]);

  const setPref = useCallback((key, value) => {
    setPrefs((prev) => {
      const next = { ...prev, [key]: typeof value === "function" ? value(prev[key]) : value };
      SecureStore.setItemAsync(PREFS_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ scheme, dark: scheme === "dark", colors: PALETTES[scheme], prefs, setPref, ready }),
    [scheme, prefs, setPref, ready]
  );
  return createElement(ThemeContext.Provider, { value }, children);
}

export const useTheme = () => useContext(ThemeContext);

/* Algarismos de largura fixa nos valores (as colunas de R$ alinham). */
export const NUM = { fontVariant: ["tabular-nums"] };
