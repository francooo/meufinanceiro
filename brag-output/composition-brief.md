# Hyperframes Composition Brief: Meu financeiro

## Objective
Vídeo vertical para o Instagram Reels apresentando o Meu financeiro (web + celular),
narrado em pt-BR, mostrando funcionalidades e benefícios com as telas reais do app.

## Output
- Composition directory: `brag-output/composition/`
- Rendered video: `brag-output/brag.mp4`
- Format: vertical — 1080x1920, 30fps
- Duration: 62s (pedido do usuário: mínimo 50s; substitui a janela 15–25s da skill)

## Source Material
- Project root: `E:\meuagentefinanceiro2208\meufinanceiro`
- Primary files read: `mobile/src/screens/*`, `mobile/src/ui/*`, `mobile/global.css`,
  `meu-caixa.jsx`, `src/web/screens/*`, `src/index.css`
- Product name: Meu financeiro
- Strongest claim (do próprio app): "Sobra do mês — Disponível para seus planos"
- Key UI to show: capturas reais (dados fictícios) em `assets/screens/`:
  - celular: `m-inicio`, `m-gastos`, `m-toast`, `m-saldos`, `m-dividas`,
    `m-mercado`, `m-somar`, `m-hide`, `m-inicio-dark`
  - web: `w-inicio`, `w-inicio-dark`
- Copy verbatim do app: "Sobra do mês", "Disponível para seus planos",
  "Próximos 7 dias", "Gasto marcado como pago · Desfazer", "Pendente",
  "Sobra = saldo registrado − gastos do mês", "Maiores credores",
  "Desejos · Mercado · Farmácia", "Somar itens", "Valores ocultos", "Meu financeiro"

## Creative Direction
- Tone preset: polished
- Creative direction: filme de produto calmo e premium, verde-floresta e dourado
- Interpretation: holds longos (legível no celular), crossfades e slides suaves,
  texto curto na tela complementando (não repetindo) a narração
- Hook: "Quanto sobra do seu dinheiro este mês?" + card verde contando até R$ 5.987,60
- Outro: "Meu financeiro · Seu dinheiro, organizado." + selos Web / Celular
- Avoid: linguagem genérica de SaaS, efeitos abstratos, redesenhar o app

## Visual Identity
- Background: #0f2e25 → #0a3b2d, brilho radial #1a5b45
- Text: #ffffff / rgba(236,253,245,.82)
- Accent: champagne #c8a96a, gold claro #f3dfae, mint #7ed6a7
- Display font: Source Serif 4 600 (local) · Body font: Inter 400–700 (local)
- Reels safe area: texto importante entre y≈220 e y≈1580; nada essencial no
  canto inferior direito.

## Storyboard (ver brag-plan.md)
1. Hook — 0.0–4.6
2. Reveal — 4.6–10.2
3. Visão geral — 10.2–18.5
4. Gastos — 18.5–26.0
5. Cartões — 26.0–31.7
6. Dívidas e listas — 31.7–39.3
7. Web e celular — 39.3–49.5
8. Extras — 49.5–56.5
9. Outro — 56.5–62.0

## Audio
- Narração: `assets/vo/vo1..vo9.wav` (Kokoro pf_dora, pt-BR), uma por cena,
  início ~0.3s após o começo da cena, volume 0.9.
- Música: `assets/music/happy-beats-business-moves-vol-12-by-ende-dot-app.mp3`
  (110 BPM), 0.13 sob a voz, sobe para 0.3 no outro, fade-out 2s.
- Cue guidance: preset vol-12; entrada da marca na batida 4.91s; demais tempos
  seguem a narração (prioridade: leitura e sincronia com a voz).
- Audio-reactive: indisponível (o helper de extração do `media-use` não está
  instalado); não bloqueia o render.
- SFX (≤ 0.5): `drop_001` nas trocas de seção, `mouseclick1` no toque do selo
  "Pendente", `card-slide-1` na entrada dos celulares lado a lado,
  `impactBell_heavy_000` no logo final.
