# Pokémon Idle — Roadmap

Atualizado em 30/10/2026. Cada etapa só é marcada como concluída com testes passando e o comportamento verificado no
navegador. O detalhe do dia a dia (bugs, pendências, próxima tarefa) fica em [PROJECT_STATUS.md](../PROJECT_STATUS.md).

Legenda: ✅ concluída · 🔶 em andamento · ⏳ próxima · ○ futura

## Fase 1 — Jogo jogável (single-player)

| # | Etapa | Status | O que entrega | Como foi verificado |
|---|---|---|---|---|
| 1.1 | Fundação | ✅ | Vite + TypeScript + Preact; pipeline de dados da PokéAPI (1025 espécies, golpes, tipos, evoluções, encontros de 4 regiões) | `npm run build:data`; testes de integridade |
| 1.2 | Núcleo do motor | ✅ | RNG determinístico, estado, fórmulas de atributos/XP/dano/tipos/captura | Testes com valores de referência |
| 1.3 | Hunts e batalha | ✅ | Exploração automática, batalha por turnos, regras de captura, Pokédex | Testes + simulação |
| 1.4 | Persistência e offline | ✅ | Save com checksum, backups, quarentena, migrações (v3), progresso offline com o motor real | Testes + E2E (2 h offline) |
| 1.5 | Itens e economia | ✅ | Loja por insígnias, poções/Revive automáticos, comprador automático, melhorias, Academia | Testes + simulação |
| 1.6 | Evoluções | ✅ | Todas as condições (nível, pedra, Cabo de Ligação, amizade, horário, gênero, golpe…) | Teste por condição |
| 1.7 | Conteúdo | ✅ | Kanto (45 áreas), Johto (50), Hoenn (51), Sinnoh (53), 32 ginásios, 4 Ligas, lendários | Teste: Pokédex de Kanto 100% obtível |
| 1.8 | Profundidade | ✅ | Afinidade, Maestria, Pesquisa, conquistas, PC, presets, Hunt Analyzer, Auto Manager | Telas com dados reais |
| 1.9 | Balanceamento | ✅ | Simulador com bot; 18 rodadas de calibração (ver ECONOMY.md) | `npm run sim` em várias sementes |
| 1.10 | **Nível de Treinador** | ✅ | As áreas liberam por Nível de Treinador (Kanto 1–30, Johto 30–42, Hoenn 42–62, Sinnoh 62–85); insígnias e itens-chave continuam valendo | Testes + simulação |
| 1.11 | **Design System** | ✅ | Identidade "hardware do Pokédex": tokens Noite/Dia, tipografia, 19 componentes com guias ([artifact](https://claude.ai/artifact/GDMyLsBF3LxAsWg9epbDKs)) | Contraste AA checado nos dois temas |
| 1.12 | **Interface nova** | ✅ | Jogo inteiro no Design System, sem emoji; Mapa com sprites e chance de cada Pokémon por rota e filtros (nome, tipo, fraco contra, não capturados, liberadas, lendários) | E2E + capturas de tela desktop/celular, Noite e Dia |
| 1.13 | Polimento visual | ⏳ | Ícones pixel próprios para a navegação; telas restantes refinadas (Loja, Mochila, Pesquisa, Auto Manager, Análises, detalhe do Pokémon); animações de captura e evolução | Revisão visual com você |
| 1.14 | Playtest | ⏳ | Você joga a primeira hora e uma troca de região; ajustamos ritmo e clareza | Notas do playtest → calibração |
| 1.15 | Áudio e acessibilidade | ○ | Música/efeitos opcionais; auditoria Lighthouse ≥ 90 | Lighthouse |

## Fase 2 — Conta e servidor
| # | Etapa | Status | O que entrega |
|---|---|---|---|
| 2.1 | Decisão de backend | ⏳ | Postgres + Fastify (recomendado) ou Firebase — ver ARCHITECTURE.md §8 |
| 2.2 | Servidor autoritativo | ○ | O mesmo motor rodando no servidor; comandos validados; tempo do servidor |
| 2.3 | Contas e save na nuvem | ○ | Login; o mesmo save em vários aparelhos |

## Fase 3 — Competição e social
| # | Etapa | Status | O que entrega |
|---|---|---|---|
| 3.1 | Ranking por temporada | ○ | Pontuação calculada no servidor |
| 3.2 | Mercado entre jogadores | ○ | Escrow, taxas, histórico de preços |
| 3.3 | Guildas, chat, raids, PvP | ○ | Com moderação e denúncia |

## Fase 4 — Fim de jogo e conteúdo
| # | Etapa | Status | O que entrega |
|---|---|---|---|
| 4.1 | Batalha avançada | ○ | Status (veneno, sono…), habilidades, clima |
| 4.2 | Breeding | ○ | Herança de IVs e natureza |
| 4.3 | Novas regiões e eventos | ○ | Unova em diante; eventos sazonais |

## MVP do plano mestre × estado atual
| Item | Situação |
|---|---|
| Salvamento de conta | 🔶 Local, robusto (backups, export); na nuvem na Fase 2 |
| Pokédex e catálogo | ✅ 1025 espécies |
| Região com várias rotas | ✅ 4 regiões |
| Hunts automáticas | ✅ Online e offline |
| Combate, captura, inventário | ✅ |
| IVs, natureza, shiny | ✅ Com nota de qualidade |
| Níveis e evoluções | ✅ |
| Equipes e presets | ✅ |
| Hunt Analyzer e Auto Manager | ✅ |
| Economia com NPC | ✅ |
| Interface responsiva | ✅ Design System aplicado |
| Testes e logs | ✅ 35 testes, E2E, CI |

## Riscos
| Risco | Mitigação |
|---|---|
| Marcas e sprites da The Pokémon Company | Não monetizar; aviso de fã; nenhum sprite no repositório; assets trocáveis |
| Trapaça com lógica no cliente | Motor pronto para rodar no servidor antes de qualquer recurso competitivo |
| Ritmo errado | Simulador + playtest; constantes centralizadas |
| Save perdido | Checksum, backups, quarentena, export |
