import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View } from "react-native";
import Animated, { useSharedValue, useAnimatedStyle, runOnJS } from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";

/* Reordenacao por arraste DENTRO de um grupo (mesma semantica das setas: nunca
   atravessa categoria/forma de pagamento). Ao soltar, devolve a sequencia nova
   de ids e quem chama reescreve `order` via orderFromSequence/applyOrder.

   UM gesto por grupo, nao um por linha. A versao anterior criava, por linha, um
   GestureDetector + Animated.View + useAnimatedStyle: setembro (89 gastos)
   montava 89 desses nos nativos de uma vez a cada vez que "Ocultar pagos" era
   desligado, e o app travava. Agora, em repouso, o grupo e um View comum com
   linhas comuns e nenhum estilo animado; so a linha arrastada anima, num
   overlay que existe apenas durante o arraste. As outras linhas "abrem espaco"
   por re-render — barato, um grupo tem poucos itens. */
const LONG_PRESS_MS = 180;

/* Quantas posicoes o dedo cruzou, somando meia-altura de cada vizinho. Roda na
   UI thread (worklet), com o array de alturas vindo do SharedValue. O resultado
   e o indice onde o item entra depois de sair da posicao original. */
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

/* A unica parte animada: montada so enquanto ha arraste. Fundo e sombra
   proprios porque nem toda linha tem fundo (as de Gastos sao transparentes) e
   a copia flutua por cima das outras. */
function DragOverlay({ top, dragY, children }) {
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: dragY.value }] }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: "absolute",
          left: 0,
          right: 0,
          top,
          zIndex: 20,
          elevation: 8,
          backgroundColor: "#ffffff",
          shadowColor: "#0f172a",
          shadowOpacity: 0.15,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 4 },
        },
        style,
      ]}
    >
      {children}
    </Animated.View>
  );
}

export function DraggableList({ items, renderItem, onReorder, onDragChange, keyExtractor = (it) => it.id }) {
  const activeIndex = useSharedValue(-1);
  const hovered = useSharedValue(-1);
  const dragY = useSharedValue(0);
  const heights = useSharedValue([]);

  /* Alturas de repouso por id, num ref JS (sem tocar a UI thread a cada
     onLayout). Durante o arraste o layout e o da pre-visualizacao, entao nao
     sobrescreve. */
  const heightsById = useRef({});
  const dragRef = useRef(null); // { from } enquanto arrasta
  const idsRef = useRef([]);
  idsRef.current = items.map(keyExtractor);
  /* Handlers do pai mudam de identidade a cada render; o gesto fica estavel
     lendo-os por ref. */
  const onReorderRef = useRef(onReorder);
  onReorderRef.current = onReorder;
  const onDragChangeRef = useRef(onDragChange);
  onDragChangeRef.current = onDragChange;

  const [drag, setDrag] = useState(null); // { from, to, top } | null

  const measure = useCallback((id, h) => {
    if (!dragRef.current) heightsById.current[id] = h;
  }, []);

  /* Chamado (via runOnJS) quando o long-press ativa: acha a linha tocada pela
     altura acumulada e abre a pre-visualizacao. */
  const onPick = useCallback(
    (y) => {
      const hs = idsRef.current.map((id) => heightsById.current[id] || 0);
      let acc = 0;
      let idx = -1;
      for (let i = 0; i < hs.length; i++) {
        if (y < acc + hs[i]) {
          idx = i;
          break;
        }
        acc += hs[i];
      }
      if (idx === -1) return; // fora das linhas (espaco vazio do grupo)
      dragRef.current = { from: idx };
      heights.value = hs;
      hovered.value = idx;
      activeIndex.value = idx;
      setDrag({ from: idx, to: idx, top: acc });
      onDragChangeRef.current?.(true);
    },
    [activeIndex, heights, hovered]
  );

  const setTo = useCallback((to) => {
    setDrag((d) => (d ? { ...d, to } : d));
  }, []);

  /* As chamadas runOnJS chegam em ordem, entao onPick sempre roda antes deste:
     o JS e a fonte da verdade de "de onde" o item saiu. Idempotente. */
  const onDrop = useCallback(
    (to) => {
      const d = dragRef.current;
      dragRef.current = null;
      activeIndex.value = -1;
      hovered.value = -1;
      setDrag(null);
      if (!d) return;
      onDragChangeRef.current?.(false);
      if (to < 0 || to === d.from) return;
      const ids = [...idsRef.current];
      const [moved] = ids.splice(d.from, 1);
      ids.splice(to, 0, moved);
      onReorderRef.current?.(ids);
    },
    [activeIndex, hovered]
  );

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .activateAfterLongPress(LONG_PRESS_MS)
        .onStart((e) => {
          dragY.value = 0;
          runOnJS(onPick)(e.y);
        })
        .onUpdate((e) => {
          dragY.value = e.translationY;
          const a = activeIndex.value;
          if (a < 0) return;
          const to = hoveredIndex(a, e.translationY, heights.value);
          /* So cruza para o JS quando a posicao alvo muda — poucas vezes por
             arraste, nao uma por frame. */
          if (to !== hovered.value) {
            hovered.value = to;
            runOnJS(setTo)(to);
          }
        })
        /* success=false: gesto interrompido (dedo saiu, outro gesto tomou) —
           fecha sem reordenar. */
        .onEnd((_e, success) => {
          runOnJS(onDrop)(success ? hovered.value : -1);
        }),
    [activeIndex, dragY, heights, hovered, onPick, onDrop, setTo]
  );

  /* Rede de seguranca: se a lista desmontar com um arraste em curso (tocar
     "Ocultar pagos", trocar de aba/mes), o scroll do pai nao pode ficar preso. */
  useEffect(
    () => () => {
      if (dragRef.current) onDragChangeRef.current?.(false);
    },
    []
  );

  /* Um item so nao tem o que reordenar: sem gesto nenhum. */
  if (items.length <= 1) return items.map((item, index) => renderItem(item, index));

  /* Ordem exibida: em repouso, a de `items`; arrastando, sem o item arrastado e
     com um espaco vazio da altura dele na posicao alvo. */
  const rows = [];
  if (drag) {
    const rest = items.filter((_, i) => i !== drag.from);
    const gapHeight = heightsById.current[keyExtractor(items[drag.from])] || 0;
    rest.forEach((item, i) => {
      if (i === drag.to) rows.push({ gap: true, height: gapHeight });
      rows.push({ item });
    });
    if (drag.to >= rest.length) rows.push({ gap: true, height: gapHeight });
  } else {
    items.forEach((item) => rows.push({ item }));
  }

  return (
    <GestureDetector gesture={pan}>
      {/* collapsable={false}: o Android nao pode "achatar" este View, e nele que
          o gesto do grupo fica preso. */}
      <View collapsable={false}>
        {rows.map((r, i) => {
          if (r.gap) return <View key="__drag_gap__" style={{ height: r.height }} />;
          const id = keyExtractor(r.item);
          return (
            <View key={id} onLayout={(e) => measure(id, e.nativeEvent.layout.height)}>
              {renderItem(r.item, i)}
            </View>
          );
        })}
        {drag ? (
          <DragOverlay top={drag.top} dragY={dragY}>
            {renderItem(items[drag.from], 0)}
          </DragOverlay>
        ) : null}
      </View>
    </GestureDetector>
  );
}
