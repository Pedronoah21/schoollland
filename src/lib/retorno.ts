import { redirect } from "next/navigation";

/** Volta para a página com uma mensagem de sucesso ou erro na URL */
export function voltar(caminho: string, msg: { ok?: string; erro?: string }): never {
  const q = new URLSearchParams();
  if (msg.ok) q.set("ok", msg.ok);
  if (msg.erro) q.set("erro", msg.erro);
  const sep = caminho.includes("?") ? "&" : "?";
  redirect(`${caminho}${sep}${q.toString()}`);
}

/** Lê um campo de texto do formulário, já sem espaços nas pontas */
export function campo(fd: FormData, nome: string): string {
  const v = fd.get(nome);
  return typeof v === "string" ? v.trim() : "";
}

export const marcado = (fd: FormData, nome: string) => fd.get(nome) === "on";

/** Parâmetros de busca vêm como string | string[] | undefined */
export function param(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v) ?? "";
}
