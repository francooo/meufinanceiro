import Constants from "expo-constants";

/* Dois níveis: o app.json versionado é o padrão (produção), e a variável de
   ambiente existe só para apontar noutro lugar sem editar arquivo. */
const fromEnv = process.env.EXPO_PUBLIC_API_URL;
const fromApp = Constants.expoConfig?.extra?.apiUrl;

export const API_URL = String(fromEnv || fromApp || "").replace(/\/+$/, "");

/* Falhar aqui e não no primeiro fetch: sem isto, uma configuração ausente
   apareceria como "Network request failed", indistinguível de estar sem sinal. */
if (!API_URL) {
  throw new Error("API_URL ausente: defina extra.apiUrl em app.json.");
}
