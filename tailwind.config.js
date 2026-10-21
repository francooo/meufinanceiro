/** @type {import('tailwindcss').Config} */
const token = (name) => `rgb(var(--${name}) / <alpha-value>)`;

export default {
  content: ["./index.html", "./*.jsx", "./src/**/*.{js,jsx}"],
  // Modo escuro pela classe `dark` no <html> (botão da barra superior).
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        display: ['"Source Serif 4"', "Georgia", "serif"],
        brand: ["Inter", "system-ui", "sans-serif"],
      },
      /* Cores do UI kit, lidas das variáveis de src/index.css. */
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
      boxShadow: {
        card: "var(--shadow-card)",
      },
    },
  },
  plugins: [],
};
