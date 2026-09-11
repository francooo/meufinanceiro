/* CommonJS de proposito: mobile/package.json nao declara "type", e e ele - nao
   o da raiz, que e "type": "module" - que o Node consulta para este diretorio. */
const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const projectRoot = __dirname;
const repoRoot = path.resolve(projectRoot, "..");
const rootModules = path.join(repoRoot, "node_modules") + path.sep;

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(projectRoot);

config.resolver.nodeModulesPaths = [path.resolve(projectRoot, "node_modules")];

/* A raiz do repositorio tem react@18.3.1, react-dom e lucide-react instalados
   para a aplicacao web (Vite); este app roda em React 19. O resolver do Metro
   sobe os diretorios como o Node, entao sem barreira ele poderia alcancar o
   React 18 da web - e isso aparece como "Invalid hook call", sem nenhuma pista
   da origem.

   Barramos so o que resolve para o node_modules DA RAIZ. Nao usamos
   disableHierarchicalLookup: ele quebraria a resolucao aninhada aqui dentro,
   de que o proprio Expo depende (expo/node_modules/expo-asset, por exemplo).
   E preferimos lancar em vez de blockList para a mensagem nomear o modulo. */
const baseResolve = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  const resolved = (baseResolve || context.resolveRequest)(context, moduleName, platform);
  if (resolved && resolved.filePath && resolved.filePath.startsWith(rootModules)) {
    throw new Error(
      `"${moduleName}" resolveu para o node_modules da raiz (aplicacao web, React 18), ` +
        `nao para mobile/node_modules. Instale-o em mobile/: npm --prefix mobile i ${moduleName}`
    );
  }
  return resolved;
};

module.exports = withNativeWind(config, { input: "./global.css" });
