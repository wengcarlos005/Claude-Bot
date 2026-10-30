# PROJECT_STATUS

_Última atualização: 30/10/2026. Passo a passo das etapas em [docs/ROADMAP.md](docs/ROADMAP.md)._

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

### Nível de Treinador
- As áreas liberam por **Nível de Treinador** (Kanto 1–30, Johto 30–42, Hoenn 42–62, Sinnoh 62–85), não mais por
  vitórias. Insígnias e itens-chave continuam como requisitos extras. Concluir a área virou objetivo opcional.
- XP de treinador por vitória, captura, espécie nova, treinador, insígnia e Campeão; save v3 com migração v2→v3.

### Visual de GBA, mapa em trilha e Hub sem sobreposição (30/10)
- **Pele de GBA:** painéis, menus, botões e placas com molduras de pixel (9 fatias, 2×) no lugar do "vidro"; fonte pixel
  nos rótulos; tema Dia e Noite.
- **Ícones do PokéSprite em tudo:** menu lateral (Town Map, Poké Ball, PC, Mochila…), carteira (moeda, PP Up,
  Poké Ball), itens da Mochila/Loja/Oficina e fragmentos; ícones de Pokémon (caixa do PC) no mapa e nas abas de região.
- **Hub:** a cidade ocupa a área de cima inteira (enquadrada e sem faixas vazias) e os painéis ficam numa linha
  embaixo, sem cobrir nada; placas mostram só o título (descrição ao passar o mouse).
- **Mapa em trilha:** todas as localidades numa trilha contínua em zigue-zague, na ordem da aventura, desenhada com
  tiles reais do FireRed (grama, grama alta, areia, água, flores e árvores). Paradas com o Pokémon da área (o primeiro
  ainda não capturado), líderes de ginásio com a insígnia, cadeado nas bloqueadas e o seu treinador onde você está.
  Abas "Mapa" e "Lista e filtros" no topo. O mundo costurado de Kanto/Hoenn saiu (tinha muito espaço vazio).

### Oficina, fragmentos e novo Hub (30/10)
- **Fragmentos** (vermelho, azul, verde, amarelo) caem de selvagens, treinadores, desafios, insígnias, Campeão, shinies e
  lendários; regiões avançadas rendem mais (×1,5 por região).
- **Oficina:** melhorias de treinador (Tênis de Corrida, Moeda da Sorte etc.) e itens de evolução, seguráveis e
  vitaminas são fabricados com fragmentos + taxa em ₽. A Loja vende só bolas, remédios e buffs. O bot também fabrica.
- **Simulação (seed 1):** Brock 0,84 h, Campeão de Kanto 9,6 h, Johto 18,9 h, Hoenn 26,0 h.
- **Hub novo:** Celadon City (mapa real do FireRed) em tela cheia, arrastável, com placas nos prédios (ícone, título e
  descrição), tom de manhã/tarde/noite, equipe passeando pela praça e painéis flutuantes (hunt ativa, equipe e
  próximo desafio com o sprite do líder).

### Direção de arte "jogo" (30/10, a partir das imagens de referência)
- **Tema Noite azul-marinho**, barra superior com avatar do treinador (sprites de treinador, escolhidos em Ajustes),
  nível e XP, carteira (₽, PP, Pokédex) e menu lateral com ícones (sprites de itens + ícones pixel próprios).
- **Hub = cidade em pixel art** gerada em código: Ginásio (leva ao próximo desafio), Centro Pokémon, Loja,
  Laboratório (Pesquisa), Áreas de Caça (Mapa); Mercado Global, Guilda e Arena PvP aparecem como "Em breve". A equipe
  passeia pela praça e a estátua da fonte é o Pokémon líder. Painéis: hunt ativa, equipe atual e próximo desafio.
- **Mapa ilustrado:** ilha gerada a partir das áreas da região (montanhas perto de cavernas, árvores perto de
  florestas, lagos, telhados nas cidades), trilha pontilhada com pinos (aqui, liberado, bloqueado, concluído), andares
  agrupados numa localidade, painel com Pokémon comuns e raros, time e "Iniciar hunt", barra de progresso com
  insígnias e modo lista com filtros.
- **Hunt em tela cheia vista de cima:** clareira no meio do bioma, trilha, lago e vegetação densa; nome, nível e PS em
  todos os selvagens; mira no alvo; nome do golpe e projétil na cor do tipo; painéis flutuantes recolhíveis (área,
  métricas, itens rápidos, Pokémon na área, capturas, registro, equipe, controles da hunt).

### Hub, batalha na rota e mapa (30/10)
- **Hub** no estilo painel de controle: colunas fixas com cartão do treinador, Pokémon em campo (tipos, nota de IV, PS, XP) e
  equipe (clique para pôr em campo); automações rápidas (regras de captura, poções com limite, Revive, recuo,
  transferência, evolução, reposição de bolas) e registro; barra de ferramentas com ícones de itens dos jogos.
- **Sessão de hunt:** cronômetro, XP de Treinador/h, XP de Pokémon/h, lucro líquido/h (descontando bolas, poções e
  Revives gastos), abates/h e capturas/h; lista de capturas recentes com nota de IV.
- **Cena da rota:** o core sorteia o próximo encontro no início da caminhada (`exploration.next`), então o Pokémon
  realmente anda até o selvagem que vai enfrentar. Os demais selvagens da área passeiam pelo cenário. Dano flutuante,
  crítico/super efetivo, desmaio (o corpo fica no chão alguns segundos), arremesso da Poké Ball em arco, captura,
  recompensas, Centro Pokémon, dia/noite e 10 biomas desenhados em pixel art (SVG gerado, sem imagens externas).
- **Mapa:** capítulos por ginásio (o atual e o próximo abertos), linhas enxutas com sprites e chances, cadeado compacto
  com o que falta (Nv, insígnia, item) no lugar do texto "Requer…".
- **Áreas:** Kanto 135, Johto 155, Hoenn 103, Sinnoh 153 (andares e zonas reais dos jogos, Ilhas Sevii, Kanto de HG/SS).

### Design System e interface
- **Design System "hardware do Pokédex"** ([artifact](https://claude.ai/artifact/GDMyLsBF3LxAsWg9epbDKs)): chassi
  vermelho, telas LCD, azul de lente para interação, dourado para recompensas; temas Noite (padrão) e Dia; tipografia
  Pixelify Sans / M PLUS Rounded 1c / VT323; 19 componentes `pk-*` com guias de uso.
- No código: `design/tokens.json` → `npm run build:tokens` → `src/ui/styles/tokens.css`; componentes em
  `src/ui/styles/components.css`; layout do jogo em `src/ui/styles/app.css`.
- Interface inteira refeita no Design System, **sem emoji**, com barra superior (Nível de Treinador, ₽, PP, insígnias,
  Pokédex), navegação lateral e barra inferior no celular.
- **Mapa novo:** cada rota mostra os sprites dos Pokémon com a chance de encontro (silhueta se ainda não visto, marca se
  capturado), o time do líder nos ginásios e Ligas, Nível de Treinador exigido, projeção do Hunt Analyzer e filtros
  por nome, tipo, "fraco contra", não capturados, só liberadas e lendários.
- Telas: Explorar, Mapa, Equipe, PC, Pokédex, Mochila, Loja, Pesquisa, Auto Manager, Análises e Config.

### Documentação
- GDD v0.2, Arquitetura v0.2 (inclui modelo de banco e plano do backend), ECONOMY (método, resultados e 19 rodadas de
  calibração) e Roadmap (passo a passo com status, MVP e riscos).

### Testes executados
| O que | Resultado |
|---|---|
| `npm test` | 36 testes: encontro planejado, Nível de Treinador, fórmulas com valores de referência, integridade dos dados, comandos, determinismo, evoluções, Centro Pokémon, regras de captura, conquistas, persistência e migrações, regressões da revisão |
| `npm run e2e` (Playwright) | ✓ Inicial → batalhas → as 11 telas → Hunt Analyzer → salvar/recarregar → 2 h offline com relatório → celular sem rolagem horizontal, 0 erros no console |
| `npm run build` | OK. JS inicial ~60 kB gzip; dados ~150 kB gzip em chunks |
| Playwright (manual) | Escolher inicial → batalhas/capturas com sprites animados → todas as telas → Hunt Analyzer → layout de celular → salvar/recarregar → **2 h offline com relatório**. 0 erros no console |
| Simulador (Nível de Treinador) | Kanto 7,5–9,4 h, Johto 13–14 h, Hoenn 19,8–23,5 h, 8 insígnias de Sinnoh 28,3 h |
| Capturas de tela (Playwright) | Desktop e celular, temas Noite e Dia; filtro do Mapa destacando as rotas |

## 🔶 Em andamento
- **Mercado de jogadores (etapa 1.16):** a Oficina já fabrica; falta a compra e venda entre jogadores (precisa do
  backend).
- **Polimento das telas secundárias (etapa 1.17).**
- **Balanceamento com Nível de Treinador:** Hoenn ficou mais rápido (20–24 h; antes 29–41 h). Confirmar no playtest se
  as faixas de Hoenn/Sinnoh devem subir (ver `docs/ECONOMY.md` §8).

## ⏳ Pendente (próximas etapas — ver docs/ROADMAP.md)
1. Playtest da primeira hora e da troca Kanto → Johto.
2. Áudio, auditoria de acessibilidade/Lighthouse, ícones dedicados por geração.
3. Backend autoritativo (Fastify + Postgres rodando o mesmo core), contas e cloud save.
4. Ranking por temporada, mercado com escrow, guildas, PvP, raids.
5. Status de batalha e habilidades, variantes regionais, breeding, eventos sazonais.
6. Rodar o E2E (`npm run e2e`) também no CI (exige instalar o Chromium no runner).

## 🐞 Bugs conhecidos / limitações
- O E2E está no repositório (`npm run e2e`), mas ainda não roda no CI.
- Com farm de Afinidade por muitas horas, o PC acumula milhares de Pokémon de nota A/S (protegidos por padrão). Hoje o
  custo de cada captura cresce com o tamanho do PC. Avaliar um índice por espécie ou a proteção padrão só para S.
- O balanceamento de Johto, Hoenn e Sinnoh foi validado só com o bot (que não adapta a equipe por tipo). Precisa de
  playtest.
- Ícones pequenos usam o sprite de frente reduzido (sem ícones dedicados para todas as gerações).
- O progresso offline usa o horário do momento do retorno para regras de dia/noite.

## ▶️ Próxima tarefa sugerida
Polimento das telas secundárias (1.17) e playtest. Mercado de jogadores junto com o backend. Depois, decidir entre Postgres+Fastify e Firebase para o backend
(recomendação em docs/ARCHITECTURE.md §8) e iniciar a Fase 2.
