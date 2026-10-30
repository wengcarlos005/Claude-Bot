# Pokémon Idle (nome provisório)

Jogo de navegador **idle de captura e coleção**. Projeto de fã, não oficial e sem fins comerciais.

Sua equipe explora áreas sozinha, batalha, captura conforme as **regras que você define**, evolui, enfrenta ginásios e
ligas de **Kanto, Johto, Hoenn e Sinnoh**, e continua progredindo **offline**. A Pokédex inclui as 1025 espécies até a
Gen 9.

## Como rodar

```bash
npm install
```

```bash
npm run dev
```

Abra o endereço que o Vite mostrar (normalmente http://localhost:5173).

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Typecheck + build de produção em `dist/` |
| `npm test` | Testes (Vitest) |
| `npm run typecheck` | Só o TypeScript |
| `npm run build:data` | Regenera `src/data/generated/` a partir dos CSVs da PokéAPI |
| `npm run build:tokens` | Gera `src/ui/styles/tokens.css` a partir de `design/tokens.json` (tokens do Design System) |
| `npm run e2e` | Teste de ponta a ponta no navegador (Playwright) |
| `npm run sim -- 72 1` | Simulador de balanceamento: um bot joga 72 h (semente 1) e mostra o ritmo |
| `npm run sprites:download` | Baixa os sprites para `public/assets/sprites` (opcional; ver abaixo) |

## Deploy
O projeto é um site estático (Vite). O `vercel.json` já está configurado: com o repositório conectado à Vercel, cada
push gera um preview e o branch principal publica em produção. Qualquer hospedagem estática funciona: basta servir
`dist/`.

## Sprites
Por padrão o jogo carrega os sprites do repositório público da PokéAPI:
- estáticos de frente, costas e shiny para as 1025 espécies;
- animados da Gen 5 até o #649.

Nenhuma imagem é versionada aqui. Para servir localmente:

```bash
npm run sprites:download
```

```bash
echo "VITE_SPRITE_BASE=/assets/sprites" > .env.local
```

## Documentação
| Documento | Conteúdo |
|---|---|
| [PROJECT_STATUS.md](PROJECT_STATUS.md) | Concluído, em andamento, pendências, bugs conhecidos, próxima tarefa |
| [docs/GDD.md](docs/GDD.md) | Regras do jogo como implementadas (exploração, batalha, captura, evolução, regiões, economia, ferramentas) |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Camadas, core determinístico, dados, persistência, backend futuro, modelo de banco, testes, escalabilidade |
| [docs/ECONOMY.md](docs/ECONOMY.md) | Balanceamento e economia com os resultados do simulador |
| [docs/ROADMAP.md](docs/ROADMAP.md) | Passo a passo das etapas com status, MVP e riscos |
| [Design System](https://claude.ai/artifact/GDMyLsBF3LxAsWg9epbDKs) | Tokens, tipografia e componentes da interface (fonte dos tokens: `design/tokens.json`) |

## Aviso legal
Pokémon e todos os nomes e imagens relacionados são marcas e propriedade da Nintendo, Game Freak, Creatures Inc. e
The Pokémon Company. Este projeto não é afiliado a eles nem endossado por eles. Os dados de espécies e encontros vêm da
[PokéAPI](https://pokeapi.co/). O código e as regras de jogo são implementação própria.
