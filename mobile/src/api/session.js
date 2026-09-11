import * as SecureStore from "expo-secure-store";

const KEY = "meucaixa.session";

export const loadToken = () => SecureStore.getItemAsync(KEY);
export const saveToken = (token) => SecureStore.setItemAsync(KEY, token);
export const clearToken = () => SecureStore.deleteItemAsync(KEY);
