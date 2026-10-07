import { Directory, File, Paths } from "expo-file-system";

/* Cache local "stale-while-revalidate": o ultimo dado que veio do servidor fica
   em JSON no aparelho, para o app abrir na hora e ser lido sem internet.

   E so leitura de ultimo estado conhecido, nunca fila de escrita: o servidor
   substitui colecoes inteiras, entao reenviar algo daqui depois poderia apagar
   o que foi editado na web nesse meio tempo. Quem le o cache NAO pode deixar
   esses dados entrarem no autosave antes da versao da rede chegar.

   expo-file-system ja vinha compilado no APK (dependencia do proprio expo), por
   isso isto chega por OTA, sem build novo. Tudo em try/catch: cache ausente ou
   corrompido equivale a "sem cache", nunca a erro na tela. */

const dir = () => new Directory(Paths.document, "cache");
const fileFor = (key) => new File(dir(), `${key.replace(/[^a-zA-Z0-9-]/g, "_")}.json`);

export async function readCache(key) {
  try {
    const f = fileFor(key);
    if (!f.exists) return null;
    return JSON.parse(await f.text());
  } catch {
    return null;
  }
}

export function writeCache(key, data) {
  try {
    const d = dir();
    if (!d.exists) d.create({ intermediates: true, idempotent: true });
    const f = fileFor(key);
    if (!f.exists) f.create();
    f.write(JSON.stringify(data));
  } catch {
    /* cache e melhor esforco: falhar aqui so significa abrir mais devagar */
  }
}

/* Sair da conta apaga tudo: os dados financeiros nao podem ficar no aparelho
   depois do logout, nem aparecer para o proximo pareamento. */
export function clearCache() {
  try {
    const d = dir();
    if (d.exists) d.delete();
  } catch {
    /* nada a fazer */
  }
}

export const monthKeyFor = (month) => `month-${month}`;
