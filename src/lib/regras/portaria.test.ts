import { test } from "node:test";
import assert from "node:assert/strict";
import { decidirPassagem, estaDentro, type FatosPassagem } from "./portaria";

const base: FatosPassagem = {
  status: "ATIVO",
  nivel: "FUND2",
  entradaMin: 7 * 60,
  toleranciaMin: 15,
  dentro: false,
  saidaAutorizadaHoje: false,
  agoraMin: 6 * 60 + 55,
};

test("entrada no horário é liberada sem atraso", () => {
  const d = decidirPassagem(base);
  assert.equal(d.liberar, true);
  assert.equal(d.tipo, "ENTRADA");
  assert.ok(d.tipo === "ENTRADA" && !d.atraso);
});

test("entrada no limite da tolerância ainda não é atraso", () => {
  const d = decidirPassagem({ ...base, agoraMin: 7 * 60 + 15 });
  assert.ok(d.tipo === "ENTRADA" && !d.atraso);
});

test("entrada depois da tolerância é atraso, mas é liberada", () => {
  const d = decidirPassagem({ ...base, agoraMin: 7 * 60 + 16 });
  assert.ok(d.liberar && d.tipo === "ENTRADA" && d.atraso);
});

test("matrícula inativa bloqueia", () => {
  const d = decidirPassagem({ ...base, status: "INATIVO" });
  assert.ok(!d.liberar && d.tipo === "BLOQUEIO" && d.codigo === "MATRICULA_INATIVA");
});

test("matrícula pendente bloqueia", () => {
  const d = decidirPassagem({ ...base, status: "PENDENTE" });
  assert.ok(!d.liberar && d.tipo === "BLOQUEIO" && d.codigo === "MATRICULA_PENDENTE");
});

test("aluno do fundamental II sai sozinho", () => {
  const d = decidirPassagem({ ...base, dentro: true });
  assert.ok(d.liberar && d.tipo === "SAIDA");
});

test("aluno do infantil não sai sem acompanhante", () => {
  const d = decidirPassagem({ ...base, nivel: "INFANTIL", dentro: true });
  assert.ok(!d.liberar && d.tipo === "BLOQUEIO" && d.codigo === "PRECISA_ACOMPANHANTE");
});

test("aluno do fundamental I sai com pessoa autorizada", () => {
  const d = decidirPassagem({ ...base, nivel: "FUND1", dentro: true }, { acompanhante: "Patrícia Souza" });
  assert.ok(d.liberar && d.tipo === "SAIDA" && d.acompanhante === "Patrícia Souza");
});

test("acompanhante só com espaços não conta", () => {
  const d = decidirPassagem({ ...base, nivel: "FUND1", dentro: true }, { acompanhante: "   " });
  assert.equal(d.liberar, false);
});

test("autorização do dia no app libera saída sem acompanhante", () => {
  const d = decidirPassagem({ ...base, nivel: "FUND1", dentro: true, saidaAutorizadaHoje: true });
  assert.ok(d.liberar && d.tipo === "SAIDA");
});

test("liberação manual exige motivo", () => {
  const d = decidirPassagem(base, { manual: { motivo: "esqueceu" } });
  assert.ok(!d.liberar && d.tipo === "ERRO");
  const ok = decidirPassagem(base, { manual: { motivo: "Esqueceu o cartão, conferido pela foto" } });
  assert.ok(ok.liberar);
});

test("liberação manual não passa por cima de matrícula inativa", () => {
  const d = decidirPassagem({ ...base, status: "INATIVO" }, { manual: { motivo: "Pai pediu para entrar rapidamente" } });
  assert.equal(d.liberar, false);
});

test("estaDentro considera só o último registro liberado", () => {
  const t = (h: number) => new Date(Date.UTC(2026, 9, 14, h));
  assert.equal(estaDentro([]), false);
  assert.equal(estaDentro([{ tipo: "ENTRADA", ocorridaEm: t(11) }]), true);
  assert.equal(estaDentro([{ tipo: "ENTRADA", ocorridaEm: t(11) }, { tipo: "SAIDA", ocorridaEm: t(15) }]), false);
  assert.equal(estaDentro([{ tipo: "ENTRADA", ocorridaEm: t(11) }, { tipo: "BLOQUEIO", ocorridaEm: t(15) }]), true);
  assert.equal(estaDentro([{ tipo: "SAIDA", ocorridaEm: t(15) }, { tipo: "ENTRADA", ocorridaEm: t(11) }]), false);
});
