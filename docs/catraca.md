# Integração com a catraca

O Pátio não depende de uma marca de catraca. A catraca (ou um pequeno programa instalado no
computador da portaria, ligado a ela) conversa com o sistema por dois endereços HTTPS.

## 1. Cadastrar a catraca

Em **Configurações → Catracas**, dê um nome (por exemplo, "Portão principal") e clique em
**Cadastrar catraca**. O sistema mostra um token uma única vez. Guarde-o no programa da catraca.
Se o token vazar, desative a catraca e cadastre outra.

Todas as chamadas levam o cabeçalho:

```
Authorization: Bearer ptc_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

## 2. A cada leitura de cartão

```
POST /api/catraca/passagem
Content-Type: application/json

{ "cartao": "0012345678" }
```

Também aceita `{ "codigo": "2027-0042" }` (código de matrícula, útil para QR code ou teclado).

Resposta:

```json
{
  "liberar": true,
  "tipo": "ENTRADA",
  "mensagem": "Entrada liberada com atraso.",
  "aluno": { "nome": "Ana Clara Souza", "turma": "5º ano A", "iniciais": "AS", "alergias": null }
}
```

A catraca libera o giro **somente** quando `liberar` for `true`. Quando for `false`, mostre a
`mensagem` no visor (exemplos: matrícula inativa, saída só com pessoa autorizada).

| Situação | HTTP | `liberar` | `tipo` |
| --- | --- | --- | --- |
| Entrada | 200 | true | ENTRADA |
| Saída | 200 | true | SAIDA |
| Matrícula inativa ou não concluída | 200 | false | BLOQUEIO |
| Aluno do infantil ou fundamental I saindo sem autorização | 200 | false | BLOQUEIO |
| Cartão não cadastrado | 404 | false | BLOQUEIO |
| Token inválido ou catraca desativada | 401 | — | — |

O sistema decide sozinho se é entrada ou saída pelo último registro do dia. Entradas depois do
horário da turma mais a tolerância ficam marcadas como atraso. Cada passagem liberada gera um aviso
para os responsáveis.

## 3. Funcionando sem internet

Baixe a lista de quem pode passar algumas vezes por dia:

```
GET /api/catraca/autorizados
```

```json
{
  "geradoEm": "2026-10-14T10:00:00.000Z",
  "alunos": [
    { "cartao": "0012345678", "codigo": "2027-0042", "primeiroNome": "Ana", "saidaSoAcompanhado": true, "entrada": "07:00", "toleranciaMin": 15 }
  ]
}
```

Sem conexão, a catraca decide pela lista (libera entrada de quem está nela e segura a saída de quem
tem `saidaSoAcompanhado: true`, chamando a portaria). Ao voltar a conexão, envie cada passagem
guardada com o horário real:

```json
{ "cartao": "0012345678", "ocorridaEm": "2026-10-14T10:58:12.000Z" }
```

Passagens com mais de 24 horas são recusadas.

## Teste rápido

```bash
curl -X POST https://SEU-ENDERECO/api/catraca/passagem \
  -H "Authorization: Bearer SEU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"codigo":"2026-0001"}'
```
