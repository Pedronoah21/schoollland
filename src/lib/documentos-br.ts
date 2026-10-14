// Validação e formatação de CPF e telefone brasileiros.

export const soDigitos = (v: string) => v.replace(/\D/g, "");

export function cpfValido(valor: string): boolean {
  const cpf = soDigitos(valor);
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  const digito = (base: string, pesoInicial: number) => {
    let soma = 0;
    for (let i = 0; i < base.length; i++) soma += Number(base[i]) * (pesoInicial - i);
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };
  const d1 = digito(cpf.slice(0, 9), 10);
  const d2 = digito(cpf.slice(0, 10), 11);
  return d1 === Number(cpf[9]) && d2 === Number(cpf[10]);
}

export function formatarCpf(valor: string): string {
  const c = soDigitos(valor);
  if (c.length !== 11) return valor;
  return `${c.slice(0, 3)}.${c.slice(3, 6)}.${c.slice(6, 9)}-${c.slice(9)}`;
}

/** Celular ou fixo com DDD: 10 ou 11 dígitos */
export function telefoneValido(valor: string): boolean {
  const t = soDigitos(valor);
  return t.length === 10 || t.length === 11;
}

export function formatarTelefone(valor: string): string {
  const t = soDigitos(valor);
  if (t.length === 11) return `(${t.slice(0, 2)}) ${t.slice(2, 7)}-${t.slice(7)}`;
  if (t.length === 10) return `(${t.slice(0, 2)}) ${t.slice(2, 6)}-${t.slice(6)}`;
  return valor;
}
