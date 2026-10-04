import { memo, useCallback, useEffect, useMemo, useRef } from "react";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";

/* Reordenacao por arraste DENTRO de um grupo (mesma semantica das setas: nunca
   atravessa categoria/forma de pagamento). Ao soltar, devolve a sequencia nova
   de ids e quem chama reescreve `order` via orderFromSequence/applyOrder.

   As linhas ficam no fluxo normal (nao absolutas), para a altura do Card seguir
   somando: a linha arrastada sobe de zIndex e segue o dedo; as do caminho
   abrem espaco deslizando pela altura dela. Alturas sao medidas por onLayout
   porque variam (nota, chips, "pago em"). */
const LONG_PRESS_MS = 180;

/* Quantas posicoes o dedo cruzou, somando meia-altura de cada vizinho. Roda na
   UI thread (worklet), com o array de alturas vindo do SharedValue. */
function hoveredIndex(active, ty, hts) {
  "worklet";
  let to = active;
  if (ty > 0) {
    let acc = 0;
    let i = active;
    while (i < hts.length - 1) {
      const next = hts[i + 1] || 0;
      if (ty > acc + next / 2) {
        acc += next;
        i += 1;
        to = i;
      } else break;
    }
  } else if (ty < 0) {
    const t = -ty;
    let acc = 0;
    let i = active;
    while (i > 0) {
      const prev = hts[i - 1] || 0;
      if (t > acc + prev / 2) {
        acc += prev;
        i -= 1;
        to = i;
      } else break;
    }
  }
  return to;
}

/* memo + gesto memoizado: alternar filtros re-renderiza a aba, mas a linha nao
   reconstroi o Gesture/estilo a cada vez. */
const DraggableRow = memo(function DraggableRow({
  index,
  item,
  renderItem,
  heights,
  activeIndex,
  dragY,
  onPick,
  onDrop,
  onMeasure,
}) {
  const pan = useMemo(
    () =>
      Gesture.Pan()
        .activateAfterLongPress(LONG_PRESS_MS)
        .onStart(() => {
          activeIndex.value = index;
          dragY.value = 0;
          runOnJS(onPick)();
        })
        .onUpdate((e) => {
          dragY.value = e.translationY;
        })
        .onEnd(() => {
          const to = hoveredIndex(index, dragY.value, heights.value);
          activeIndex.value = -1;
          dragY.value = 0;
          runOnJS(onDrop)(index, to);
        })
        /* Cancelamento (dedo saiu, gesto interrompido): sem isto a linha ficaria
           presa levantada e o scroll do pai travado. */
        .onFinalize(() => {
          if (activeIndex.value === index) {
            activeIndex.value = -1;
            dragY.value = 0;
            runOnJS(onDrop)(-1, -1);
          }
        }),
    [index, heights, activeIndex, dragY, onPick, onDrop]
  );

  const style = useAnimatedStyle(() => {
    if (activeIndex.value === -1) {
      return { transform: [{ translateY: 0 }], zIndex: 0, elevation: 0 };
    }
    if (activeIndex.value === index) {
      return { transform: [{ translateY: dragY.value }], zIndex: 20, elevation: 8 };
    }
    const to = hoveredIndex(activeIndex.value, dragY.value, heights.value);
    const h = heights.value[activeIndex.value] || 0;
    let shift = 0;
    if (activeIndex.value < index && index <= to) shift = -h; // arrastada desceu por mim
    else if (activeIndex.value > index && index >= to) shift = h; // arrastada subiu por mim
    return { transform: [{ translateY: withTiming(shift, { duration: 120 }) }], zIndex: 0, elevation: 0 };
  });

  return (
    <GestureDetector gesture={pan}>
      <Animated.View
        style={style}
        onLayout={(e) => onMeasure(index, e.nativeEvent.layout.height)}
      >
        {renderItem(item, index)}
      </Animated.View>
    </GestureDetector>
  );
});

export function DraggableList({ items, renderItem, onReorder, onDragChange, keyExtractor = (it) => it.id }) {
  const activeIndex = useSharedValue(-1);
  const dragY = useSharedValue(0);
  /* `heights` so e lido durante o arraste, entao as medidas ficam num ref JS e
     o SharedValue so e preenchido no inicio do gesto. Antes, cada onLayout
     reatribuia o array inteiro (O(N^2) + N updates do Reanimated no mount), o
     que travava/estourava a memoria em meses cheios. */
  const heights = useSharedValue([]);
  const heightsRef = useRef([]);
  /* Guarda a ordem corrente de ids para montar a sequencia nova sem depender de
     `items` dentro do callback (que seria uma versao antiga em closure). */
  const idsRef = useRef([]);
  idsRef.current = items.map(keyExtractor);

  const onMeasure = useCallback((i, h) => {
    heightsRef.current[i] = h;
  }, []);

  const onPick = useCallback(() => {
    /* Copia as alturas ja medidas para a UI thread uma unica vez, no inicio. */
    heights.value = heightsRef.current.slice();
    onDragChange?.(true);
  }, [heights, onDragChange]);

  const onDrop = useCallback(
    (from, to) => {
      onDragChange?.(false);
      if (from === -1 || to === from) return;
      const ids = [...idsRef.current];
      const [moved] = ids.splice(from, 1);
      ids.splice(to, 0, moved);
      onReorder(ids);
    },
    [onDragChange, onReorder]
  );

  /* Rede de seguranca: se a lista desmontar com um arraste em curso (tocar
     "Ocultar pagos", trocar de aba/mes), o onEnd/onFinalize pode nao disparar e
     o scroll do pai ficaria preso. O cleanup garante reabilitar. */
  useEffect(() => () => onDragChange?.(false), [onDragChange]);

  /* Um item so nao tem o que reordenar: renderiza sem gesto nenhum. */
  if (items.length <= 1) return items.map((item, index) => renderItem(item, index));

  return items.map((item, index) => (
    <DraggableRow
      key={keyExtractor(item)}
      index={index}
      item={item}
      renderItem={renderItem}
      heights={heights}
      activeIndex={activeIndex}
      dragY={dragY}
      onPick={onPick}
      onDrop={onDrop}
      onMeasure={onMeasure}
    />
  ));
}
