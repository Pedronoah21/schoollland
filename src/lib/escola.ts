import { cache } from "react";
import { db } from "./db";

export const FUSO_PADRAO = "America/Manaus";

export const obterEscola = cache(async () => {
  const e = await db.escola.findUnique({ where: { id: 1 } });
  return e ?? { id: 1, nome: "Escola", fuso: FUSO_PADRAO, anoLetivo: new Date().getFullYear(), criadoEm: new Date() };
});
