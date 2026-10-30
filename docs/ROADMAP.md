# Pokémon Idle — Roadmap por Etapas

Cada etapa termina com algo **jogável ou verificável**, testes passando e uma revisão antes de seguir para a próxima.
Os critérios de aceite estão listados em cada etapa.

| Etapa | Nome | Entrega | Critério de aceite |
|---|---|---|---|
| **0** | Fundação | Projeto Vite + TS + Preact, lint, Vitest, estrutura de pastas, pipeline de dados (Kanto/Gen 1), `AssetRegistry` com fallback | `npm run dev` abre o app; `npm run build:data` gera 151 espécies validadas; testes de integridade passam |
| **1** | Núcleo do motor | RNG semeado, EventBus, GameLoop de passo fixo, `GameState` inicial, fórmulas (atributos, XP, dano, tipos, captura) | Fórmulas cobertas por testes; tela de debug mostra o inicial com atributos corretos |
| **2** | Primeiro jogável | Exploração (Rotas 1, 22, 2, Floresta de Viridian), batalha automática contra selvagens, captura com Poké Ball, Pokédex básica, tela Explorar | Escolher inicial → farmar → capturar → ver na Pokédex, só na sessão ativa |
| **3** | Persistência e offline | `SaveRepository` (IndexedDB), autosave, backups, export/import, migrações, simulação offline + Relatório de Retorno | Fechar e reabrir mantém tudo; 8 h fora geram progresso plausível; teste de 24 h < 200 ms |
| **4** | Itens e economia | Inventário, loja, Poções + cura automática, Centro Pokémon, tipos de bola, regras de captura, drops | Ciclo ganhar ₽ → comprar bolas → capturar fechado; regras de captura configuráveis |
| **5** | Evolução | Avaliador de condições (nível, pedra, Cabo de Ligação, amizade, horário, local, atributo, aleatório) + UI de uso de item | Todas as evoluções da Gen 1 funcionam; testes por tipo de condição |
| **6** | Kanto completa | Todas as áreas, treinadores, 8 ginásios, insígnias e teto de nível, Elite Four, lendários, Zona Safari | É possível zerar Kanto; o simulador bate as metas de ritmo do GDD ±30% |
| **7** | Profundidade de farm | Melhorias (₽/PP), Afinidade, transferências, PC com caixas/filtros, ₽/h e XP/h por rota, boosts, shinies | Decisões de otimização visíveis; PC fluido com 2.000 Pokémon |
| **8** | Novas regiões | Johto → Hoenn → Sinnoh (dados por geração sob demanda), desbloqueio por Campeão, pesquisa da Pokédex Nacional | Transição de região sem recarregar; dados de outras gerações não pesam no bundle inicial |
| **9** | Nuvem e ranking | Firebase Auth (anônimo → Google), cloud save local-first, resolução de conflito, leaderboards com Cloud Function | Mesmo save em 2 dispositivos; ranking por temporada |
| **10** | Polimento | PWA instalável, áudio, conquistas, acessibilidade, tutorial, balanceamento final | Lighthouse ≥ 90; tutorial guia a primeira meia hora |

Itens do GDD §12 (status de batalha, criação/ovos, Torre de Batalha, eventos, prestígio) entram depois da Etapa 10,
priorizados de acordo com o que o jogo pedir.
