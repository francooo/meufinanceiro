import { useMemo, useState } from "react";
import { Text, TextInput, View } from "react-native";
import { Touchable } from "../ui/Touchable";
import { Check, Plus, Search, X } from "lucide-react-native";
import { fmt } from "../core/format";
import { CARTOES_CATEGORY, PAYMENT_METHOD_FALLBACK, allPaymentMethods } from "../core/catalog";
import { DateField, SelectField } from "../ui/fields";
import { isDateInputValid, brToIso } from "../core/dateinput";
import { applyGastosFilters, buildGastosGrouped, groupByPaymentMethod } from "../core/gastos";
import { iconFor } from "../ui/icons";
import { Card } from "../ui/Card";
import { Empty } from "../ui/Empty";
import { Row } from "../ui/Row";

const NUM = { fontVariant: ["tabular-nums"] };
const BRAND = "#16382c";

export default function GastosTab({
  expenses,
  total,
  extraPaymentMethods = [],
  selecting,
  isSelected,
  onToggleSelect,
  onAdd,
  onEdit,
  onDelete,
  onTogglePaid,
  onMove,
}) {
  const [search, setSearch] = useState("");
  const [hidePaid, setHidePaid] = useState(false);
  const [valueSort, setValueSort] = useState("none");
  const [category, setCategory] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [dueFrom, setDueFrom] = useState("");
  const [dueTo, setDueTo] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const TODAS = "Todas as formas";
  const TODAS_CATS = "Todas as categorias";
  const methodOptions = useMemo(
    () => [TODAS, ...allPaymentMethods(extraPaymentMethods), PAYMENT_METHOD_FALLBACK],
    [extraPaymentMethods]
  );
  const datesOk = isDateInputValid(dueFrom) && isDateInputValid(dueTo);

  const grouped = useMemo(() => buildGastosGrouped(expenses), [expenses]);

  /* Opcoes vindas de `grouped`, nao de CATS: assim a lista traz as categorias
     personalizadas do usuario e nao oferece categoria sem gasto no mes. */
  const categoryOptions = useMemo(
    () => [TODAS_CATS, ...grouped.map((g) => g.name)],
    [grouped]
  );
  const { grouped: filtered, visibleTotal, otherFiltersActive } = useMemo(
    () =>
      applyGastosFilters(grouped, {
        search,
        hidePaid,
        valueSort,
        category: category === TODAS_CATS ? "" : category,
        paymentMethod: paymentMethod === TODAS ? "" : paymentMethod,
        /* Só filtra com data completa: parcial viraria null e filtraria tudo. */
        dueFrom: brToIso(dueFrom) || "",
        dueTo: brToIso(dueTo) || "",
      }),
    [grouped, search, hidePaid, valueSort, category, paymentMethod, dueFrom, dueTo]
  );

  const filtersActive = otherFiltersActive || hidePaid;
  /* Setas escondidas com filtro ativo: reordenar uma lista filtrada gravaria
     `order` com base numa ordem que nao e a real (a web faz igual). */
  /* Em modo selecao as setas somem, como na web: caixinha + setas + tres
     acoes competiriam demais por ~360dp. */
  const canReorder = !filtersActive && !selecting && !!onMove;
  /* Acende o chip "Mais filtros" quando algo do painel recolhido esta ativo —
     senao o filtro ficaria escondido e sem pista de que esta ligado. */
  const panelActive = !!(category || paymentMethod || dueFrom || dueTo);
  const sortLabel = { none: "Ordem padrão", desc: "Maior valor", asc: "Menor valor" }[valueSort];
  const cycleSort = () =>
    setValueSort((v) => (v === "none" ? "desc" : v === "desc" ? "asc" : "none"));

  return (
    <View className="gap-4 pb-8">
      <View className="flex-row items-center justify-between">
        <View>
          <Text className="text-xs text-slate-500">
            {otherFiltersActive ? "Total encontrado" : "Total de gastos"}
          </Text>
          <Text className="text-xl font-bold text-slate-800" style={NUM}>
            {fmt(otherFiltersActive ? visibleTotal : total)}
          </Text>
        </View>
        <Touchable
          onDark
          onPress={onAdd}
          className="flex-row items-center gap-1.5 px-4 py-2.5 rounded-xl"
          style={{ backgroundColor: BRAND }}
        >
          <Plus size={16} color="#ffffff" />
          <Text className="text-white text-sm font-medium">Novo gasto</Text>
        </Touchable>
      </View>

      <View className="relative justify-center">
        {/* pointerEvents: sem isto o icone engole o toque na esquerda do campo */}
        <View pointerEvents="none" className="absolute left-3.5 z-10">
          <Search size={15} color="#94a3b8" />
        </View>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Buscar gasto por título…"
          placeholderTextColor="#94a3b8"
          className="rounded-xl border border-slate-200 bg-white pl-10 pr-12 py-3 text-sm text-slate-800"
        />
        {search ? (
          <Touchable onPress={() => setSearch("")} variant="icon"
            className="absolute right-1 h-11 w-11 items-center justify-center">
            <X size={14} color="#94a3b8" />
          </Touchable>
        ) : null}
      </View>

      <View className="flex-row flex-wrap items-center gap-2">
        <Touchable
          onPress={() => setHidePaid((v) => !v)}
          className={
            "flex-row items-center gap-1.5 px-3 py-2 rounded-xl border " +
            (hidePaid ? "border-transparent" : "bg-white border-slate-200")
          }
          style={hidePaid ? { backgroundColor: BRAND } : undefined}
        >
          <Check size={13} color={hidePaid ? "#ffffff" : "#334155"} />
          <Text className={"text-xs font-medium " + (hidePaid ? "text-white" : "text-slate-700")}>
            {hidePaid ? "Mostrar pagos" : "Ocultar pagos"}
          </Text>
        </Touchable>

        <Touchable
          onPress={cycleSort}
          className={
            "px-3 py-2 rounded-xl border " +
            (valueSort !== "none" ? "border-transparent" : "bg-white border-slate-200")
          }
          style={valueSort !== "none" ? { backgroundColor: BRAND } : undefined}
        >
          <Text className={"text-xs font-medium " + (valueSort !== "none" ? "text-white" : "text-slate-700")}>
            {sortLabel}
          </Text>
        </Touchable>

        <Touchable
          onPress={() => setShowFilters((v) => !v)}
          className={
            "px-3 py-2 rounded-xl border " +
            (panelActive ? "border-transparent" : "bg-white border-slate-200")
          }
          style={panelActive ? { backgroundColor: BRAND } : undefined}
        >
          <Text className={"text-xs font-medium " + (panelActive ? "text-white" : "text-slate-700")}>
            {showFilters ? "Menos filtros" : "Mais filtros"}
          </Text>
        </Touchable>

        {filtersActive ? (
          <Touchable
            onPress={() => {
              setSearch("");
              setHidePaid(false);
              setValueSort("none");
              setCategory("");
              setPaymentMethod("");
              setDueFrom("");
              setDueTo("");
            }}
            className="flex-row items-center gap-1 px-2 py-1"
          >
            <X size={12} color="#64748b" />
            <Text className="text-xs font-medium text-slate-500">Limpar filtros</Text>
          </Touchable>
        ) : null}
      </View>

      {showFilters ? (
        <View className="gap-3 rounded-2xl border border-slate-200 bg-white p-3">
          <View>
            <Text className="text-xs font-medium text-slate-500 mb-1">Categoria</Text>
            <SelectField
              value={category || TODAS_CATS}
              options={categoryOptions}
              onSelect={(v) => setCategory(v === TODAS_CATS ? "" : v)}
              title="Categoria"
            />
          </View>
          <View>
            <Text className="text-xs font-medium text-slate-500 mb-1">Forma de pagamento</Text>
            <SelectField
              value={paymentMethod || TODAS}
              options={methodOptions}
              onSelect={(v) => setPaymentMethod(v === TODAS ? "" : v)}
              title="Forma de pagamento"
            />
          </View>
          <View className="flex-row gap-2">
            <View className="flex-1">
              <Text className="text-xs font-medium text-slate-500 mb-1">Vencimento de</Text>
              <DateField value={dueFrom} onChangeText={setDueFrom} invalid={!isDateInputValid(dueFrom)} />
            </View>
            <View className="flex-1">
              <Text className="text-xs font-medium text-slate-500 mb-1">até</Text>
              <DateField value={dueTo} onChangeText={setDueTo} invalid={!isDateInputValid(dueTo)} />
            </View>
          </View>
          {!datesOk ? <Text className="text-[11px] text-rose-600">Data inválida.</Text> : null}
        </View>
      ) : null}

      {filtered.length === 0 ? (
        <Empty text={filtersActive ? "Nenhum gasto encontrado." : "Nenhum gasto cadastrado."} />
      ) : null}

      {filtered.map((g) => {
        const Icon = iconFor(g.icon);
        return (
          <Card key={g.name} className="overflow-hidden">
            <View className="flex-row items-center gap-2.5 px-4 py-3 border-b border-slate-100">
              <View
                className="h-7 w-7 rounded-lg items-center justify-center"
                style={{ backgroundColor: g.color + "1F" }}
              >
                <Icon size={15} color={g.color} />
              </View>
              <Text className="text-sm font-semibold text-slate-700 flex-1" numberOfLines={1}>
                {g.name}
              </Text>
              <Text className="text-sm font-semibold text-slate-800" style={NUM}>
                {fmt(g.subtotal)}
              </Text>
            </View>

            {/* Só "Cartões / Financeiro" sub-agrupa por forma de pagamento, igual à web */}
            {g.name === CARTOES_CATEGORY
              ? groupByPaymentMethod(g.items, valueSort).map((pm) => (
                  <View key={pm.name}>
                    <View className="flex-row items-center gap-2 px-4 py-2 bg-slate-50">
                      <Text className="text-xs font-medium text-slate-500 flex-1" numberOfLines={1}>
                        {pm.name}
                      </Text>
                      <Text className="text-xs font-semibold text-slate-600" style={NUM}>
                        {fmt(pm.subtotal)}
                      </Text>
                    </View>
                    {pm.items.map((e, idx) => (
                      <View key={e.id} className={idx > 0 ? "border-t border-slate-100" : ""}>
                        <Row
                          item={e}
                          selected={isSelected ? isSelected(e.id) : false}
                          onToggleSelect={selecting ? () => onToggleSelect(e.id) : undefined}
                          onEdit={() => onEdit(e)}
                          onDelete={() => onDelete(e)}
                          onTogglePaid={() => onTogglePaid(e)}
                          onMoveUp={canReorder && idx > 0 ? () => onMove(pm.items, e.id, "up") : undefined}
                          onMoveDown={
                            canReorder && idx < pm.items.length - 1
                              ? () => onMove(pm.items, e.id, "down")
                              : undefined
                          }
                        />
                      </View>
                    ))}
                  </View>
                ))
              : g.items.map((e, idx) => (
                  <View key={e.id} className={idx > 0 ? "border-t border-slate-100" : ""}>
                    <Row
                      item={e}
                      selected={isSelected ? isSelected(e.id) : false}
                      onToggleSelect={selecting ? () => onToggleSelect(e.id) : undefined}
                      onEdit={() => onEdit(e)}
                      onDelete={() => onDelete(e)}
                      onTogglePaid={() => onTogglePaid(e)}
                      onMoveUp={canReorder && idx > 0 ? () => onMove(g.items, e.id, "up") : undefined}
                      onMoveDown={
                        canReorder && idx < g.items.length - 1
                          ? () => onMove(g.items, e.id, "down")
                          : undefined
                      }
                    />
                  </View>
                ))}
          </Card>
        );
      })}
    </View>
  );
}
