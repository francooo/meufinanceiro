// Testes da logica pura de src/core (sem React Native): node --test test/
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseAmount } from "../src/core/amount.js";
import { amountToInput, fmt, formatDayMonth, monthName, setHideValues } from "../src/core/format.js";
import { buildDonut, buildUpcoming, sobraSummary, topCreditors } from "../src/core/home.js";

const nb = (s) => s.replace(/ /g, " ");

test("parseAmount le pt-BR, milhar sem virgula e decimal com ponto", () => {
  assert.equal(parseAmount("1.234,56"), 1234.56);
  assert.equal(parseAmount("7.000"), 7000);
  assert.equal(parseAmount("1.234.567"), 1234567);
  assert.equal(parseAmount("12.5"), 12.5);
  assert.equal(parseAmount("1234.56"), 1234.56);
  assert.equal(parseAmount("0,5"), 0.5);
  assert.ok(Number.isNaN(parseAmount("")));
  assert.ok(Number.isNaN(parseAmount("abc")));
});

test("amountToInput reabre o valor salvo sem ambiguidade", () => {
  assert.equal(amountToInput(1234.5), "1234,50");
  assert.equal(parseAmount(amountToInput(7.125)), 7.13);
  assert.equal(amountToInput(null), "");
  // ida e volta: o que o campo mostra volta ao mesmo numero
  for (const v of [0, 1.5, 7000, 1234.56]) assert.equal(parseAmount(amountToInput(v)), v);
});

test("fmt oculta valores com a flag e volta ao normal", () => {
  assert.equal(nb(fmt(1234.5)), "R$ 1.234,50");
  setHideValues(true);
  assert.equal(fmt(1234.5), "R$ ••••");
  setHideValues(false);
  assert.equal(nb(fmt(0)), "R$ 0,00");
});

test("datas curtas e nome do mes", () => {
  assert.equal(formatDayMonth("2026-10-05"), "05 out");
  assert.equal(formatDayMonth(null), "");
  assert.equal(monthName("2026-11-20"), "novembro");
  assert.equal(monthName("2026-03"), "março");
});

test("proximos 7 dias: vencidos no topo, pagos e distantes fora", () => {
  const today = "2026-10-20";
  const expenses = [
    { id: "a", description: "Luz", category: "Casa", value: 100, dueDate: "2026-10-18" },
    { id: "b", description: "Pago", category: "Casa", value: 50, dueDate: "2026-10-21", paidAt: "2026-10-19" },
    { id: "c", description: "Aluguel", category: "Moradia", value: 1800, dueDate: "2026-10-25" },
    { id: "d", description: "Longe", category: "Moradia", value: 10, dueDate: "2026-11-30" },
  ];
  const incomes = [
    { id: "i", source: "Salário", value: 9000, receiptDate: "2026-10-22", cltPjIncome: true },
    { id: "j", source: "Passado", value: 1, receiptDate: "2026-10-01" },
  ];
  const list = buildUpcoming(expenses, incomes, today);
  assert.deepEqual(list.map((x) => x.id), ["a", "i", "c"]);
  assert.equal(list[0].overdue, true);
  assert.equal(list[1].subtitle, "Recebimento · CLT/PJ");
});

test("rosca: 3 maiores + Outros, porcentagens somando 100", () => {
  const byCat = [
    { name: "A", value: 500 },
    { name: "B", value: 300 },
    { name: "C", value: 100 },
    { name: "D", value: 66 },
    { name: "E", value: 34 },
  ];
  const s = buildDonut(byCat, 1000);
  assert.deepEqual(s.map((x) => x.name), ["A", "B", "C", "Outros"]);
  assert.equal(s.reduce((a, x) => a + x.pct, 0), 100);
  assert.equal(s[3].value, 100);
  assert.deepEqual(buildDonut([], 0), []);
});

test("maiores credores somam por descricao", () => {
  const r = topCreditors([
    { description: "Banco", value: 100 },
    { description: "Loja", value: 300 },
    { description: "Banco", value: 250 },
  ]);
  assert.deepEqual(r, [
    { name: "Banco", value: 350 },
    { name: "Loja", value: 300 },
  ]);
});

test("sobra: porcentagem, barra limitada e frase", () => {
  assert.equal(sobraSummary(1000, 720).pct, 72);
  assert.equal(sobraSummary(1000, 720).tone, "ok");
  assert.equal(sobraSummary(1000, 1500).bar, 100);
  assert.equal(sobraSummary(1000, 1500).tone, "over");
  assert.equal(sobraSummary(0, 0).message, "Nenhum lançamento nesta carteira neste mês.");
  assert.equal(sobraSummary(0, 50).pct, 100);
});
