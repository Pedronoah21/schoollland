import { test } from "node:test";
import assert from "node:assert/strict";
import { cpfValido, formatarCpf, formatarTelefone, telefoneValido } from "./documentos-br";
import { dataLocal, horaParaMinutos, idade, minutosLocais } from "./tempo";

test("CPF válido e inválido", () => {
  assert.equal(cpfValido("529.982.247-25"), true);
  assert.equal(cpfValido("52998224725"), true);
  assert.equal(cpfValido("529.982.247-24"), false);
  assert.equal(cpfValido("111.111.111-11"), false);
  assert.equal(cpfValido("123"), false);
  assert.equal(formatarCpf("52998224725"), "529.982.247-25");
});

test("telefone com DDD", () => {
  assert.equal(telefoneValido("(92) 98123-4567"), true);
  assert.equal(telefoneValido("98123-4567"), false);
  assert.equal(formatarTelefone("92981234567"), "(92) 98123-4567");
});

test("horário no fuso da escola, não do servidor", () => {
  // 10:30 UTC = 06:30 em Manaus (UTC-4)
  const d = new Date(Date.UTC(2026, 9, 14, 10, 30));
  assert.equal(minutosLocais(d, "America/Manaus"), 6 * 60 + 30);
  // 02:00 UTC do dia 15 ainda é dia 14 em Manaus
  assert.equal(dataLocal(new Date(Date.UTC(2026, 9, 15, 2, 0)), "America/Manaus"), "2026-10-14");
  assert.equal(dataLocal(new Date(Date.UTC(2026, 9, 15, 2, 0)), "America/Sao_Paulo"), "2026-10-14");
});

test("horaParaMinutos", () => {
  assert.equal(horaParaMinutos("07:15"), 435);
  assert.throws(() => horaParaMinutos("7h"));
});

test("idade", () => {
  const ref = new Date(Date.UTC(2026, 9, 14));
  assert.equal(idade(new Date(Date.UTC(2015, 9, 14)), ref), 11);
  assert.equal(idade(new Date(Date.UTC(2015, 9, 15)), ref), 10);
});
