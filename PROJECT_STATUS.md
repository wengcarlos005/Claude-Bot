# PROJECT_STATUS

_Última atualização: 30/10/2026 (sessão noturna de desenvolvimento)._

## ✅ Concluído (com testes ou verificação)

### Fundação
- Projeto Vite + TypeScript strict + Preact. Build estático, `vercel.json` e CI no GitHub Actions (typecheck, testes,
  build e simulação de 12 h).
- **Pipeline de dados** da PokéAPI (`npm run build:data`):
  - 1025 espécies com evoluções normalizadas e learnsets;
  - 692 golpes e a tabela de tipos;
  - encontros de Kanto (FR/LG), Johto (HG/SS), Hoenn (R/S/E) e Sinnoh (D/P/Pt).

### Core determinístico (`src/core`)
- Exploração com métodos de encontro (a pé, Surf, varas, Headbutt, Rock Smash), horário do dia e Repel.
- Batalha automática: IA de golpe, prioridade e Velocidade, críticos, STAB, 18 tipos, itens segurados, Leftovers.
- Regras de captura configuráveis: enfraquecer sem nocautear, arremessar com ≤ 50% dos PS, até 3+ tentativas, 8 bolas
  com bônus situacionais.
- XP com escala da Gen 5, Exp. Share, teto de nível por insígnias e **obediência** (acima do teto, luta no teto).
- Evoluções:
  - nível, pedra e Cabo de Ligação (com e sem item segurado);
  - amizade, dia/noite, golpe ou tipo de golpe conhecido, Atk vs Def, gênero, personalidade;
  - Pokémon ou tipo na equipe, Shedinja, Everstone.
- Pokédex (visto/capturado/shiny), Afinidade, Maestria, transferências e marcos da Pesquisa (incluindo os presentes Mew,
  Celebi, Jirachi e Manaphy).
- Itens, loja por insígnias, poções/Revive automáticos, comprador automático, vitaminas, Rare Candy, boosts.
- 14 melhorias (₽ e PP), incluindo a Academia (sumidouro de fim de jogo).
- **Conteúdo:**
  - Kanto: 45 áreas, 8 ginásios, Elite Four + Campeão, 4 lendários e Pokédex 100% obtível (testado);
  - Johto: 50 áreas; Hoenn: 51; Sinnoh: 53. Todas com ginásios e Ligas canônicos e lendários.

### Simulação e análise
- **Simulação acelerada** com o mesmo motor: progresso offline (limite e eficiência), Hunt Analyzer e simulador de
  balanceamento com bot.

### Persistência
- IndexedDB/localStorage, gzip + checksum, 2 backups rotativos, migrações e exportar/importar.

### Adições da madrugada
- **Conquistas** (25, com recompensa em PP), com save na v2 e migração automática v1→v2 testada.
- **Dicas contextuais** de onboarding na tela Explorar.
- **PWA instalável** (manifest + service worker com cache do app).
- **Revisão de código independente** do core: 11 achados corrigidos, com testes de regressão. Entre eles: obediência
  também nos PS, Tier no primeiro Pokémon dos treinadores, pausas longas viram progresso offline, saves ilegíveis vão
  para quarentena, transferência atômica e validação de configurações.

### Interface (Preact, responsiva)
- Telas: Explorar, Mapa, Equipe, PC, Pokédex, Mochila, Loja, Pesquisa, Auto Manager, Análises e Config.
- Modais de inicial, retorno offline e detalhe do Pokémon.
- Tema claro/escuro e layout de celular com abas inferiores.

### Documentação
- GDD v0.2, Arquitetura v0.2 (inclui modelo de banco e plano do backend), ECONOMY (método, resultados e 15 rodadas de
  calibração) e Roadmap (MVP, critérios e riscos).

### Testes executados
| O que | Resultado |
|---|---|
| `npm test` | 33 testes: fórmulas com valores de referência, integridade dos dados, comandos, determinismo, evoluções, Centro Pokémon, regras de captura, conquistas, persistência e migrações, regressões da revisão |
| `npm run e2e` (Playwright) | ✓ Inicial → batalhas → as 11 telas → Hunt Analyzer → salvar/recarregar → 2 h offline com relatório → celular sem rolagem horizontal, 0 erros no console |
| `npm run build` | OK. JS inicial ~60 kB gzip; dados ~150 kB gzip em chunks |
| Playwright (manual) | Escolher inicial → batalhas/capturas com sprites animados → todas as telas → Hunt Analyzer → layout de celular → salvar/recarregar → **2 h offline com relatório**. 0 erros no console |
| Simulador | Kanto: Campeão em 8,3–11,7 h (3–4 sementes). Com 120 h: Johto 15,5–16,5 h, Hoenn 29–41 h, 8 insígnias de Sinnoh 40–52 h |

## 🔶 Em andamento
- **Balanceamento pós-Kanto:** Johto ~16 h, Hoenn 29–41 h, 8 insígnias de Sinnoh 40–52 h; a Liga de Sinnoh é a parede
  de fim de jogo (ver `docs/ECONOMY.md` §8). Precisa de playtest humano para confirmar.

## ⏳ Pendente (próximas etapas — ver docs/ROADMAP.md)
1. Polimento: áudio, auditoria de acessibilidade/Lighthouse, ícones dedicados por geração.
2. Backend autoritativo (Fastify + Postgres rodando o mesmo core), contas e cloud save.
3. Ranking por temporada, mercado com escrow, guildas, PvP, raids.
4. Status de batalha e habilidades, variantes regionais, breeding, eventos sazonais.
5. Rodar o E2E (`npm run e2e`) também no CI (exige instalar o Chromium no runner).

## 🐞 Bugs conhecidos / limitações
- O E2E está no repositório (`npm run e2e`), mas ainda não roda no CI.
- Com farm de Afinidade por muitas horas, o PC acumula milhares de Pokémon de nota A/S (protegidos por padrão). Hoje o
  custo de cada captura cresce com o tamanho do PC. Avaliar um índice por espécie ou a proteção padrão só para S.
- O balanceamento de Johto, Hoenn e Sinnoh foi validado só com o bot (que não adapta a equipe por tipo). Precisa de
  playtest.
- Ícones pequenos usam o sprite de frente reduzido (sem ícones dedicados para todas as gerações).
- O progresso offline usa o horário do momento do retorno para regras de dia/noite.

## ▶️ Próxima tarefa sugerida
Playtest do início (primeira hora) e de uma transição de região (Kanto → Johto). Depois, decidir entre Postgres+Fastify
e Firebase para o backend (recomendação em docs/ARCHITECTURE.md §8) e iniciar a etapa 10.
