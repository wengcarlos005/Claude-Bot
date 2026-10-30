# Pokémon Idle — Balanceamento e Economia

> Como as regras foram **analisadas e calculadas**. Os números do jogo saem de um simulador que joga com o **motor real**
> (`npm run sim -- <horas> <seed>`), não de estimativas. Este documento traz o método, as metas, os resultados e o
> histórico de calibração.

## 1. Método

- **Simulador** (`scripts/sim/index.ts`): roda o `GameCore` em passos de 500 ms, com relógio fixo ao meio-dia. Um bot
  (`src/core/bot.ts`) toma decisões a cada 5 min de jogo, como um jogador casual atento:
  - monta a equipe com os 6 Pokémon mais fortes (nível + atributos);
  - usa e compra pedras de evolução compatíveis;
  - compra bolas (a melhor disponível) e poções, e estoca 40 poções + 5 Revives antes da Liga;
  - compra a melhoria mais barata que caiba em 40% do dinheiro (ou 100% dos PP);
  - navega: desafia ginásio/Liga quando os 3 melhores atingem o nível do líder (limitado ao teto); senão vai para a
    primeira área não concluída compatível com o nível da equipe;
  - depois do primeiro título de Campeão, liga o farm de Afinidade (regra "qualquer Pokémon" + transferência
    automática).
- **Sementes:** cada calibração roda pelo menos 3 sementes. Resultados com variância alta indicam paredes de dificuldade.
- **Tempo simulado** = tempo de jogo efetivo. Para converter em tempo de calendário:
  `tempo efetivo/dia ≈ horas ativas + min(horas offline, limite) × eficiência`. Exemplo: 2 h ativas + 8 h offline a 50%
  dá **6 h efetivas por dia**.
- O CI roda uma simulação curta (12 h) a cada push para pegar regressões grosseiras.

## 2. Metas e resultados (Kanto)

| Marco | Meta (efetivo) | Medido (3–4 sementes) | Calendário (~6 h/dia) |
|---|---|---|---|
| 10 espécies | < 30 min | 0,34–0,67 h | 1º dia |
| Insígnia 1 | 1–2 h | 1,7–1,8 h | 1º dia |
| Insígnia 4 | 4–6 h | 4,2–4,6 h | 1º dia |
| Insígnia 8 | 6–8 h | 6,3–7,0 h | 2º dia |
| Campeão de Kanto | 8–14 h | 8,3–11,7 h | 2º dia |
| Perdas na 1ª hora | ≤ 3 | 2 | — |

A Liga é o maior desafio de Kanto (5 treinadores sem regeneração). A variância vem da preparação: com poucas poções a
Liga vira uma parede. Isso é intencional, porque premia preparar Poções/Revives no Auto Manager.

## 3. Pós-Kanto
Johto, Hoenn e Sinnoh chegam com a equipe no nível 70+. Por isso a dificuldade usa três alavancas por região
(`RegionDef`):
- transformação de nível `offset + base·scale`;
- **Tier**, que cresce da primeira à última área (`statMult → statMultEnd`);
- ritmo (`xpMult`, `winsMult`).

| Região | Níveis | Tier | XP | Vitórias/área |
|---|---|---|---|---|
| Johto | 60–100 | ×1 | ×0,6 | ×1,5 |
| Hoenn | 85–100 | ×1,2 → ×1,45 | ×0,5 | ×2 |
| Sinnoh | 90–100 | ×1,5 → ×2,0 | ×0,4 | ×2,5 |

O poder horizontal disponível para enfrentar o Tier é aditivo sobre os atributos:
- Afinidade: até +30%;
- Maestria: até +10%;
- marcos da Pesquisa: até +17%;
- Academia: até +50%;
- EVs e IVs: ~+15–25% sobre um Pokémon sem treino;
- itens segurados: +10–20% de dano.

O máximo teórico é ≈ ×2,1 de atributos (sem itens), o que coloca o fim de Sinnoh (×2,0) como meta de longo prazo.

Resultados da última rodada estão na §8.

## 4. Fórmulas e constantes (onde mudar)

| Constante | Valor | Arquivo |
|---|---|---|
| Caminhada base | 3,5 s | `src/core/bonuses.ts` (`BASE.walkMs`) |
| Ação de batalha | 0,8 s | `BASE.actionMs` |
| Regeneração ao caminhar | 3%/s | `BASE.regenPerSec` |
| Exp. Share base | 25% | `BASE.expShare` |
| Shiny base | 1/8192 | `BASE.shinyChance` |
| Ritmo de XP | 0,25 | `src/core/formulas/experience.ts` (`XP_RATE`) |
| Vitórias por área | ×4 | `src/core/world.ts` (`WINS_TO_CLEAR_MULT`) |
| ₽ por selvagem | 2 + 1,2·Nv | `src/core/systems/exploration.ts` |
| Drop | 4% | `DROP_CHANCE` |
| Revanche da Liga | 25% do prêmio, 10% do dinheiro dos treinadores, 0 PP | `finishSequence` / `winBattle` |
| Tetos de nível | por região | `src/data/content/regions/*.ts` |

## 5. Economia

### 5.1 Fontes e sumidouros

| Moeda | Fontes | Sumidouros |
|---|---|---|
| ₽ | Selvagens (pouco), treinadores (classe × nível), ginásios/Liga (grande, uma vez), transferências, venda de itens | Bolas, poções, Revives, vitaminas, pedras/itens de evolução, melhorias (incl. **Academia**, infinita), caixas do PC |
| PP | Espécie nova (+2), treinador de rota (+1, uma vez), área concluída (+5), ginásio (10–60), Liga (150–200), transferência (1–25), marcos | Melhorias de laboratório (XP, Exp. Share, velocidade, offline, shiny, persistência, comprador) |

### 5.2 Renda típica por hora (Kanto, sem bônus)
Com ~600–900 batalhas/h:
- início (Nv 5): ~5–7 mil ₽/h, ≈ 30 Poké Balls/h;
- meio (Nv 30): ~25–35 mil ₽/h, ≈ 25 Ultra Balls/h;
- fim (Nv 50+): ~40–60 mil ₽/h, mais treinadores e ginásios.

A Moeda da Sorte (+100%) e os marcos (+30%) dobram esses valores no meio do jogo.

### 5.3 Custos de melhorias (`custo(n) = base · crescimento^n`)
| Melhoria | Custo total até o máximo | Observação |
|---|---|---|
| Tênis de Corrida (10) | ~1,0 M ₽ | O maior impacto em XP/h no início |
| Moeda da Sorte (10) | ~1,1 M ₽ | |
| Técnica de Arremesso (10) | ~1,3 M ₽ | |
| Academia (50) | ~545 M ₽ (nível 30 ≈ 20 M) | Sumidouro de fim de jogo; +1% de atributos por nível |
| Exp. Share (7) | ~1,1 mil PP | |
| Diário + Equipe Autônoma | ~7,5 mil PP | O offline chega a 24 h / 100% no fim do jogo |

### 5.4 Captura (esperado)
Por arremesso com o selvagem a ~45% dos PS (fator ≈ 0,7), em nível igual:

| Espécie (taxa) | Poké | Great | Ultra |
|---|---|---|---|
| Pidgey/Rattata (255) | 70% | 100% | 100% |
| Pikachu (190) | 52% | 78% | 100% |
| Inicial / Eevee (45) | 12% | 19% | 25% |
| Lendário (3), a 1 PS | 1,2% | 1,8% | 2,4% |

- Com 3 tentativas, um inicial usando Ultra Ball sai em ~58% dos encontros.
- Com Técnica de Arremesso 10 + Oval Charm + marcos (≈ ×1,9) e Persistência 3 (6 tentativas), um lendário com Ultra Ball
  é capturado em ~24% das aparições.
- Com aparição de 1/400 e ~700 encontros/h, isso dá **≈ 2–3 h por lendário** no fim do jogo (≈ 8 h sem melhorias). A
  Master Ball é instantânea.

### 5.5 Shiny
| Configuração | Chance | Tempo médio (~700 encontros/h) |
|---|---|---|
| Base | 1/8192 | ~12 h |
| Olhar Treinado 6 | 1/3277 | ~4,7 h |
| + Shiny Charm | 1/1638 | ~2,3 h |

## 6. Histórico de calibração
Cada linha é uma rodada do simulador → problema → mudança.

| # | Problema medido | Mudança |
|---|---|---|
| 1 | Bot travado em Koga: teto com 4 insígnias (38) < ás do líder (43) | Tetos recalibrados por ginásio: [16, 23, 27, 32, 45, 46, 50, 53, 65] |
| 2 | Inflação: ₽18 M em 72 h | Selvagem paga `2 + 1,2·Nv` (antes `5 + 4·Nv`) |
| 3 | 20 shinies em 72 h | Shiny base 1/4096 → 1/8192 |
| 4 | Só 7 PP em 72 h | +1 PP por treinador (1ª vez) e +5 por área concluída |
| 5 | Exploit: a Liga dava o prêmio completo a cada revanche | Revanche: 25% do prêmio; depois 10% do dinheiro dos treinadores e 0 PP |
| 6 | Campeão em 5 h (rápido demais) | XP com a escala da Gen 5 (punir sobrenível); ritmo 0,5 → 0,35 → 0,25; vitórias por área ×3 → ×4; caminhada 2,5 → 3,5 s; ação 0,65 → 0,8 s |
| 7 | **Bug:** S.S. Anne só tem pesca e a Vara Velha é a recompensa dela → impossível concluir | Áreas sem encontros a pé exigem só os treinadores |
| 8 | Treinadores da S.S. Anne gerados com níveis de Surf (40) | `trainerLevel` explícito e pool de menor nível para áreas aquáticas |
| 9 | Bot (não o jogo) só navegava fora de batalha | Bot corrigido |
| 10 | Liga com variância extrema (8 h → nunca) | Bot estoca 40 poções e 5 Revives antes da Liga (comportamento de jogador atento) |
| 11 | ₽10 M parados no fim do jogo | **Academia Pokémon** (sumidouro infinito com poder horizontal) |
| 12 | Johto inteiro em 3,7 h; captura Nv 86 com teto 72 | Johto: offset 59, escala 0,85, tetos 72→100, XP ×0,6, vitórias ×1,5; **obediência** (luta no máximo no nível do teto) |
| 13 | Hoenn/Sinnoh em ~5 h cada | Níveis 85–100 / 90–100; Tier crescente por área; XP e vitórias por região |
| 14 | Parede na Liga de Hoenn (8 insígnias em 24 h, Liga em 317 h) | Tier final de Hoenn 1,7 → 1,45; Sinnoh 1,7–2,4 → 1,5–2,0; bot faz farm de Afinidade no pós-jogo |
| 15 | 10 derrotas na 1ª hora (inicial Nv 5 com 20 PS) | Inicial Nv 6 e 10 Poções iniciais → 2 derrotas |
| 16 | Revisão de código: obediência não limitava PS; treinadores ignoravam o Tier no 1º Pokémon | Corrigido (ver PROJECT_STATUS) |
| 17 | 40 mil PP em 120 h com farm de Afinidade (+1 PP por duplicata) | Duplicatas comuns rendem só ₽; PP só para raros, lendários e shinies → ~500 PP em 120 h |
| 18 | Metade dos shinies perdidos (34/71) após 3–6 arremessos | Shiny: até 30 tentativas → 35/37 e 33/40 |
| 19 | Pedido de design: liberar rotas por Nível de Treinador em vez de vitórias | Faixas por região (Kanto 1–30, Johto 30–42, Hoenn 42–62, Sinnoh 62–85); XP de treinador por vitória, captura, espécie nova, insígnia e Campeão. Resultado: Kanto 7,5–9,4 h, Johto 13–14 h, Hoenn 19,8–23,5 h, 8 insígnias de Sinnoh 28,3 h (ver §8) |
| 20 | Mapa expandido para 100+ áreas por região (andares e zonas viram áreas próprias) | Pós-jogo fica no topo da faixa de Nível de Treinador da região. Resultado (seed 1): Brock 0,67 h, Campeão de Kanto 9,0 h, Campeão de Johto 19,4 h (antes 13–14 h; mais perto da calibração original de ~16 h) |
| 21 | Pedido de design: melhorias de treinador e itens que não são poções/bolas passam a ser fabricados (Oficina) ou comprados de jogadores | Fragmentos (vermelho, azul, verde, amarelo) caem de selvagens, treinadores, desafios, insígnias, Campeão, shinies e lendários (×1,5 por região). A loja do jogo vende só bolas, remédios e buffs. Melhorias custam fragmentos + a mesma taxa em ₽. Resultado (seed 1): Brock 0,84 h, Campeão de Kanto 9,6 h, Johto 18,9 h, Hoenn 26,0 h |

## 7. Pontos em aberto
- Validar Johto, Hoenn e Sinnoh com jogadores reais: o bot não troca a equipe por tipo contra cada ginásio, e um jogador
  real deve ser mais rápido.
- A curva de PP no fim do jogo depende do farm de Afinidade (transferências). Avaliar um teto diário ou retornos
  decrescentes se a renda de PP ficar alta demais.
- Considerar metas de calendário mais longas por região quando o ranking existir (temporadas).

## 8. Última rodada — Nível de Treinador (2 sementes)

| Marco | Seed 1 | Seed 2 |
|---|---|---|
| 1ª insígnia (Brock) | 0,84 h | — |
| Campeão de Kanto | 9,35 h | 7,51 h |
| Campeão de Johto | 14,09 h | 13,02 h |
| Campeão de Hoenn | 23,52 h | 19,77 h |
| 8ª insígnia de Sinnoh | 28,26 h | — |

**Leitura.** Liberar por Nível de Treinador deixa o meio do jogo mais rápido que a versão por vitórias (Hoenn caiu de
29–41 h para 20–24 h), porque o jogador não precisa mais "limpar" cada rota. Kanto ficou praticamente igual. A parede
continua sendo os tetos de nível e o Tier das Ligas, não as rotas. Próxima calibração, depois do playtest: se Hoenn e
Sinnoh parecerem rápidos, subir as faixas (ex.: Hoenn 45–66, Sinnoh 66–90) ou o expoente da curva de XP de treinador.

## 9. Rodada anterior — liberação por vitórias (120 h, 2 sementes)

| Marco | Seed 1 | Seed 2 |
|---|---|---|
| Campeão de Kanto | 9,3 h | 8,5 h |
| Campeão de Johto | 16,5 h | 15,5 h |
| Campeão de Hoenn | 29,1 h | 40,6 h |
| 1ª insígnia de Sinnoh | 31,9 h | 43,4 h |
| 8ª insígnia de Sinnoh | 40,3 h | 52,0 h |
| Campeão de Sinnoh | não em 120 h | não em 120 h |
| Espécies na Pokédex (120 h) | 330 | 323 |
| Shinies capturados / encontrados | 35 / 37 | 33 / 40 |
| PP ao fim | ~450 | ~530 |

**Leitura.** A Liga de Sinnoh (Tier ×1,94) é hoje a parede de fim de jogo. O bot gasta todo o ₽ em bolas e na Academia e
não troca a equipe por tipo, então um jogador real deve passar antes. Em calendário (~6 h efetivas/dia): Kanto em ~1,5
dia, Johto no 3º dia, Hoenn em 5–7 dias, Sinnoh em 1–2+ semanas, e a coleção completa leva semanas. Próxima calibração
sugerida, depois de playtest: avaliar o Tier final de Sinnoh (1,9 → 1,75) caso jogadores reais também travem.
