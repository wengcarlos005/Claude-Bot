# Pokémon Idle — Roadmap, MVP e Riscos

As fases do plano mestre foram combinadas com as etapas técnicas. Cada etapa só é marcada como concluída com testes
passando e o comportamento verificado. Status detalhado em [PROJECT_STATUS.md](../PROJECT_STATUS.md).

## 1. Etapas

| # | Etapa | Status | Critério de aceite |
|---|---|---|---|
| 0 | Fundação: Vite/TS/Preact, pipeline de dados, assets com fallback | ✅ | `npm run build:data` gera 1025 espécies validadas; `npm run dev` abre o jogo |
| 1 | Núcleo: RNG, estado, fórmulas (XP, atributos, dano, tipos, captura) | ✅ | Testes com valores oficiais/de referência |
| 2 | Hunts, batalha automática, captura, Pokédex | ✅ | Escolher inicial → farmar → capturar → registrar na Pokédex |
| 3 | Persistência e progresso offline | ✅ | Save/backup/migração/export testados; offline com o motor real e relatório |
| 4 | Itens, loja, economia, Auto Manager (captura, cura, transferência, compra) | ✅ | Ciclo ₽ → bolas → capturas fechado; regras configuráveis |
| 5 | Evoluções (todas as condições) | ✅ | Testes por tipo de condição |
| 6 | Kanto completa (45 áreas, 8 ginásios, Liga, lendários) | ✅ | Bot vira Campeão em 8,5–12 h simuladas em várias sementes |
| 7 | Profundidade: Afinidade, Maestria, Pesquisa, Academia, PC, presets, Hunt Analyzer | ✅ | Telas funcionais com dados reais |
| 8 | Johto, Hoenn, Sinnoh | ✅ conteúdo / 🔶 balanceamento | Regiões jogáveis; ritmo em calibração ([ECONOMY.md](./ECONOMY.md)) |
| 9 | Polimento: PWA, áudio, tutorial, conquistas, acessibilidade | ⏳ | Lighthouse ≥ 90; tutorial dos primeiros 30 min |
| 10 | Backend autoritativo: Fastify + Postgres rodando o core, contas, cloud save | ⏳ | Mesmo save em 2 dispositivos; servidor recusa comando inválido |
| 11 | Ranking por temporada (servidor) | ⏳ | Pontuação calculada no servidor; sem envio do cliente |
| 12 | Economia entre jogadores: mercado com escrow, taxas e histórico | ⏳ | Nenhuma duplicação em testes de concorrência |
| 13 | Social: guildas, chat, raids, PvP 1x1/3x3/6x6 | ⏳ | Moderação e denúncia antes de abrir |
| 14 | Endgame: eventos sazonais, temporadas, breeding, status de batalha e habilidades | ⏳ | — |

## 2. MVP (definição do plano mestre × estado atual)

| Item do MVP | Situação |
|---|---|
| Autenticação e salvamento de conta | 🔶 Salvamento local robusto (backups e export). A conta na nuvem depende da etapa 10 |
| Pokédex e catálogo de espécies | ✅ 1025 espécies; Pokédex regionais e Nacional |
| Uma região com várias rotas | ✅ Kanto completa, mais Johto, Hoenn e Sinnoh |
| Hunts automáticas | ✅ Online e offline |
| Encontros e combate | ✅ |
| Captura e inventário | ✅ |
| IVs, natureza, shiny | ✅ Mais a nota de qualidade S–D |
| Níveis e evoluções | ✅ |
| Equipes e presets | ✅ |
| Hunt Analyzer inicial | ✅ Por área e comparativo |
| Auto Manager básico | ✅ Captura, cura, revive, recuo, transferência, comprador |
| Economia básica com NPC | ✅ Loja, melhorias, transferências |
| Interface responsiva | ✅ Desktop e celular |
| Testes automatizados e logs | ✅ 27 testes + CI + log de eventos no jogo |

"Sem dados falsos e sem botões decorativos": todas as telas operam sobre o estado real; não há botões de placeholder.

## 3. Riscos

| Risco | Tipo | Impacto | Mitigação |
|---|---|---|---|
| Uso de marcas e sprites da The Pokémon Company | PI | **Alto** (takedown) | Não monetizar; aviso de fã; nada de sprite no repositório; pacote de assets e nomes desacoplados, trocáveis por criaturas originais antes de qualquer publicação ampla |
| Lógica no cliente permite trapaça | Técnico | Médio agora, alto com ranking/mercado | Core determinístico e isomórfico, pronto para o servidor autoritativo (etapa 10) antes de qualquer recurso competitivo |
| Progresso rápido ou lento demais | Balanceamento | Alto (retenção) | Simulador com bot e várias sementes; constantes centralizadas (XP_RATE, WINS_TO_CLEAR_MULT, Tier por região); CI roda a simulação |
| Inflação de ₽ no fim do jogo | Economia | Médio | Revanche da Liga reduzida, selvagens pagam pouco, Academia como sumidouro infinito; monitorar no simulador |
| Save corrompido ou perdido | Técnico | Alto | Checksum, 2 backups, export; migrações versionadas e testadas |
| Mudanças nos dados da PokéAPI | Técnico | Baixo | JSON gerado versionado; pipeline com cache e validação |
| Performance com PCs enormes | Técnico | Médio | Renderização limitada a 600 células com filtros; serializer compacto se necessário |
| Disponibilidade do CDN de sprites | Técnico | Baixo | Fallback estático; opção de sprites locais (`sprites:download`) |
| Uma espécie dominar | Balanceamento | Médio | Maestria limitada (+10%), Tier e tipos variados nos ginásios; o Hunt Analyzer expõe alternativas |
