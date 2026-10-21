/** @type {import('tailwindcss').Config} */
const token = (name) => `rgb(var(--${name}) / <alpha-value>)`;

module.exports = {
  content: ["./App.jsx", "./src/**/*.{js,jsx}"],
  /* Obrigatório: o preset troca os defaults web (rem, sombra em string) pelos
     equivalentes que o React Native entende. Sem ele metade das classes vira no-op. */
  presets: [require("nativewind/preset")],
  // Tema pela classe: ui/theme.js decide (claro, escuro ou o do sistema).
  darkMode: "class",
  theme: {
    extend: {
      /* Cores do kit, lidas das variáveis de global.css. */
      colors: {
        canvas: token("canvas"),
        surface: token("surface"),
        "surface-2": token("surface-2"),
        line: token("line"),
        ink: token("ink"),
        heading: token("heading"),
        muted: token("muted"),
        forest: token("forest"),
        "forest-2": token("forest-2"),
        mint: token("mint"),
        champagne: token("champagne"),
        coral: token("coral"),
        positive: token("positive"),
        gold: token("gold"),
        "tint-green": token("tint-green"),
        "tint-coral": token("tint-coral"),
        "tint-gold": token("tint-gold"),
      },
      /* No RN cada peso é um arquivo de fonte (fontWeight não escolhe o arquivo
         carregado pelo expo-font), então o peso vira família. */
      fontFamily: {
        display: ["SourceSerif4_600SemiBold"],
        "display-regular": ["SourceSerif4_400Regular"],
        brand: ["Inter_400Regular"],
        "brand-medium": ["Inter_500Medium"],
        "brand-semibold": ["Inter_600SemiBold"],
        "brand-bold": ["Inter_700Bold"],
      },
    },
  },
  plugins: [],
};
