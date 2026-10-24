# Pátio Escolar

Sistema de gestão escolar feito sob medida, a partir do Sponte como referência de funcionalidades.
Esta é a **Fase 1**: a base da escola funcionando com dados reais.

| Pronto nesta versão | Próximas fases |
| --- | --- |
| Primeiro acesso, login e perfis (administrador, direção, secretaria, coordenação, financeiro, professor, portaria) | Fase 2: diário, chamada, notas, boletim, horários |
| Turmas com vagas, turno e horário de entrada | Fase 3: mensalidades, PIX e boleto, cobrança, notas fiscais |
| Alunos, responsáveis, pessoas autorizadas a buscar, alergias | Fase 4: app das famílias, comunicados, captação, indicadores |
| Matrícula e rematrícula por etapas, com aprovação de desconto pela direção | |
| Portaria ao vivo, liberação manual com motivo, saída acompanhada | |
| API para catraca (online e sem internet) — veja [docs/catraca.md](docs/catraca.md) | |
| Auditoria de tudo que mexe em aluno, matrícula, acesso e equipe | |

O modelo navegável do sistema completo está em [`modelo/index.html`](modelo/index.html): baixe e abra no navegador, ou publique pelo GitHub Pages (Settings → Pages → branch `main`, pasta `/`) e acesse `/modelo/`. Ele serve de referência visual para as próximas fases.

---

## Onde o sistema roda

O sistema está publicado no **Render** (serviço `patio-escolar` e banco `patio-escolar-db`).
A cada envio para a branch `main`, o Render monta e publica a nova versão sozinho.

Configuração do serviço no Render:

| Campo | Valor |
| --- | --- |
| Build Command | `npm install && npx prisma generate && npx next build` |
| Start Command | `npx prisma db push --skip-generate && npx next start` |
| `DATABASE_URL` | *Internal Database URL* do banco `patio-escolar-db` |
| `SESSION_SECRET` | chave aleatória com pelo menos 32 caracteres (trocar desconecta todo mundo) |
| `NODE_VERSION` | `22` |

O comando de início atualiza as tabelas do banco antes de abrir o sistema.

### 4. Primeiro acesso

Abra o endereço. A tela de **primeiro acesso** pede o nome da escola, o ano letivo, o fuso horário
e cria a sua conta de administrador. Ela só aparece uma vez. Depois:

1. **Turmas**: confira as turmas criadas e ajuste vagas e horário de entrada.
2. **Configurações → Equipe**: crie o acesso de cada pessoa com o perfil certo.
3. **Matrículas → Nova matrícula**: cadastre os alunos. Ao concluir a matrícula, o aluno recebe o
   código e passa na catraca.
4. **Configurações → Catracas**: cadastre a catraca e entregue o token a quem for instalar.

### Antes de usar com dados reais

- O banco gratuito do Render expira em 30 dias e o serviço gratuito "dorme" quando fica parado.
  Antes de usar com dados reais, passe os dois para planos pagos, com backup do banco ligado.
- O Render não tem servidores no Brasil; os dados ficam nos EUA (Virgínia). Avalie com a escola
  se isso atende à política de privacidade (LGPD) ou se o banco deve ir para um provedor com região
  em São Paulo.
- Restrinja quem tem perfil de administrador.
- Para trazer os dados do Sponte, peça à escola a exportação em planilha; a importação automática
  pode ser feita como próximo passo.

---

## Para quem for desenvolver

Tecnologias: Next.js 16 (App Router, Server Actions), TypeScript, Prisma, PostgreSQL.

```bash
cp .env.example .env          # preencha DATABASE_URL e SESSION_SECRET
docker compose up -d          # banco local (ou use um banco do Neon)
npm install
npm run db:push               # cria as tabelas
npm run dev                   # http://localhost:3000
npm test                      # regras de portaria, matrícula, CPF e fuso horário
```

Organização:

- `prisma/schema.prisma`: modelo de dados.
- `src/lib/regras/`: regras de negócio puras e testadas (portaria e matrícula).
- `src/lib/permissoes.ts`: quem pode fazer o quê, num lugar só.
- `src/lib/portaria-servico.ts`: registro de passagens usado pela tela e pela API da catraca.
- `src/app/(app)/`: telas logadas. `src/app/api/catraca/`: API das catracas.

Decisões importantes:

- Horários sempre no fuso da escola (`Escola.fuso`), nunca no do servidor.
- Cada passagem, inclusive bloqueio, fica registrada com origem (catraca ou manual) e usuário.
- Saúde e alergias só aparecem para perfis autorizados; a API da catraca recebe só o mínimo.
- Senhas com bcrypt; sessão em cookie assinado (12 horas); 5 tentativas erradas em 15 minutos
  bloqueiam o login daquele e-mail temporariamente.
- Avisos aos responsáveis entram na tabela `Notificacao` com status `PENDENTE`; o envio por app e
  WhatsApp entra na Fase 4.
