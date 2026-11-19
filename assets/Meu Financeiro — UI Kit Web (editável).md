# Meu Financeiro — UI Kit Web (editável)

Pacote de reconstrução editável dos 26 mockups selecionados.

## Conteúdo
- `screens/`: 26 páginas HTML independentes, estruturadas em elementos DOM editáveis.
- `assets/styles/ui-kit.css`: tokens visuais, componentes e regras responsivas compartilhadas.
- `assets/app.js`: conteúdo estático e renderização dos layouts de demonstração.
- `assets/icons/*.svg`: ícones vetoriais independentes, originais e reutilizáveis.
- `assets/screens.json`: manifesto com os nomes, tipos e referências de cada tela.
- `references/*.jpg`: referências visuais compactadas para comparação com os mockups aprovados.
- `index.html`: índice navegável para abrir cada tela.

## Abrir
Extraia o ZIP e abra `index.html` no navegador. Não há dependências remotas necessárias.

## Editabilidade e escopo
As páginas e componentes são HTML/CSS; os ícones são SVG separados. Os JPGs em `references/` servem só como referência e não são o fundo das páginas reconstruídas. Este pacote é um kit estático de apresentação e não implementa autenticação, persistência, cálculos financeiros nem conexão com o sistema em produção. A tipografia usa pilha local (Georgia para títulos e sans-serif do sistema para interface) para funcionar offline; pode ser trocada por Inter/Geist no projeto final.

Os ícones SVG foram redesenhados como uma família consistente de traço (não extraídos automaticamente dos pixels dos mockups). Para uso de produção, revise nomes, acessibilidade, textos/dados e integre os componentes à aplicação real.
