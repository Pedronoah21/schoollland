import { test } from "node:test";
import assert from "node:assert/strict";
import { avancarEtapa, codigoMatricula, documentosFaltando, vagasLivres, type EstadoMatricula } from "./matricula";

const completa = { docCertidao: true, docResponsavel: true, docResidencia: true, docHistorico: true, docVacina: true };
const base: EstadoMatricula = { ...completa, etapa: "DOCUMENTOS", descontoPct: 0, descontoAprovado: false, nivel: "FUND1" };

test("não sai de documentos com documento faltando", () => {
  const r = avancarEtapa({ ...base, docResidencia: false });
  assert.ok(!r.ok && r.erro.includes("Comprovante de residência"));
});

test("infantil não precisa de histórico", () => {
  assert.deepEqual(documentosFaltando({ ...completa, docHistorico: false }, "INFANTIL"), []);
  assert.equal(documentosFaltando({ ...completa, docHistorico: false }, "FUND1").length, 1);
});

test("desconto até 15% vai direto para assinatura", () => {
  const r = avancarEtapa({ ...base, descontoPct: 15 });
  assert.deepEqual(r, { ok: true, proxima: "ASSINATURA" });
});

test("desconto acima de 15% passa pela direção", () => {
  assert.deepEqual(avancarEtapa({ ...base, descontoPct: 20 }), { ok: true, proxima: "APROVACAO_DESCONTO" });
  assert.equal(avancarEtapa({ ...base, etapa: "APROVACAO_DESCONTO", descontoPct: 20 }).ok, false);
  assert.deepEqual(avancarEtapa({ ...base, etapa: "APROVACAO_DESCONTO", descontoPct: 20, descontoAprovado: true }), { ok: true, proxima: "ASSINATURA" });
});

test("desconto já aprovado pula a etapa de aprovação", () => {
  assert.deepEqual(avancarEtapa({ ...base, descontoPct: 30, descontoAprovado: true }), { ok: true, proxima: "ASSINATURA" });
});

test("assinatura, pagamento e conclusão em sequência", () => {
  assert.deepEqual(avancarEtapa({ ...base, etapa: "ASSINATURA" }), { ok: true, proxima: "PAGAMENTO" });
  assert.deepEqual(avancarEtapa({ ...base, etapa: "PAGAMENTO" }), { ok: true, proxima: "CONCLUIDA" });
  assert.equal(avancarEtapa({ ...base, etapa: "CONCLUIDA" }).ok, false);
  assert.equal(avancarEtapa({ ...base, etapa: "CANCELADA" }).ok, false);
});

test("vagas livres nunca ficam negativas", () => {
  assert.equal(vagasLivres(25, 20, 3), 2);
  assert.equal(vagasLivres(25, 24, 3), 0);
});

test("código de matrícula", () => {
  assert.equal(codigoMatricula(2027, 42), "2027-0042");
});
