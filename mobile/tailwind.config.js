/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.jsx", "./src/**/*.{js,jsx}"],
  /* Obrigatório: o preset troca os defaults web (rem, sombra em string) pelos
     equivalentes que o React Native entende. Sem ele metade das classes vira no-op. */
  presets: [require("nativewind/preset")],
  theme: { extend: {} },
  plugins: [],
};
