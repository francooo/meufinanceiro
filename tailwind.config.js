/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./*.jsx", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      /* So a tela de login usa estas duas; o resto do app segue na fonte padrao. */
      fontFamily: {
        display: ['"Source Serif 4"', "Georgia", "serif"],
        brand: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
