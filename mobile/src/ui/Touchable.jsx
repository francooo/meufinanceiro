import { Pressable } from "react-native";

/* Feedback de toque num lugar so. Sem isto, um <Pressable> nao muda NADA
   visualmente ao ser tocado: a pessoa toca, nao ve nada, e um quadro depois o
   estado muda — o cerebro le esse intervalo como lentidao.

   Android ganha ripple nativo (dispara no toque, sem passar pelo JS).
   iOS nao tem ripple, entao a opacidade vem da variante `active:` do
   NativeWind, que o css-interop implementa anexando onPressIn/onPressOut ao
   proprio Pressable e encadeando os handlers que voce passar.

   NUNCA use style={({ pressed }) => ...} neste projeto. O NativeWind registra
   `cssInterop(Pressable, { className: "style" })`, entao a prop `style` e
   SUBSTITUIDA pelo objeto que ele calcula — espalhar uma funcao da {} e o
   callback some sem erro nenhum.

   E NUNCA use style={{ opacity }} para estado desabilitado: estilo inline tem
   especificidade maior que qualquer classe, entao o `opacity: 1` do estado
   habilitado apagaria o `active:`. Use a classe `disabled:opacity-40`, que le
   a prop `disabled` diretamente. */

const RIPPLE_DARK = "rgba(15, 23, 42, 0.12)"; // sobre fundo claro
const RIPPLE_LIGHT = "rgba(255, 255, 255, 0.22)"; // sobre fundo escuro

export function Touchable({
  className = "",
  variant = "bounded",
  onDark = false,
  children,
  ...rest
}) {
  const color = onDark ? RIPPLE_LIGHT : RIPPLE_DARK;
  const android_ripple =
    variant === "icon"
      ? { color, borderless: true, radius: 22 }
      : { color, borderless: false };

  /* Literais inteiros: o extrator do Tailwind le o texto do arquivo e nao
     resolveria uma classe montada por concatenacao. */
  const feedback =
    variant === "icon"
      ? "active:opacity-50 "
      : variant === "row"
      ? "active:opacity-60 "
      : "active:opacity-70 overflow-hidden ";

  /* className fica como string e so e resolvida no Pressable interno. Registrar
     este wrapper no cssInterop seria errado: resolveria as classes cedo demais
     e os handlers do `active:` iriam parar num componente nao-pressionavel. */
  return (
    <Pressable {...rest} android_ripple={android_ripple} className={feedback + className}>
      {children}
    </Pressable>
  );
}
