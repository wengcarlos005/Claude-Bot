# Pokémon Idle (nome provisório)

Jogo de navegador **idle de captura e coleção**, projeto de fã sem fins comerciais.

> Status: **Proposta de design e arquitetura**. Ainda não há código; o desenvolvimento segue o [Roadmap](docs/ROADMAP.md).

## Documentos

| Documento | Conteúdo |
|---|---|
| [GDD](docs/GDD.md) | Loops de jogo, sistemas (exploração, batalha, captura, Pokédex, níveis, evolução, regiões, itens, economia), fórmulas, ritmo, UI |
| [Arquitetura](docs/ARCHITECTURE.md) | Stack, camadas, estrutura de pastas, modelos de dados, motor de ticks, offline, saves, assets, Firebase, testes |
| [Roadmap](docs/ROADMAP.md) | Etapas 0–10 com critérios de aceite |

## Sprites

Os sprites **não são gerados pelo projeto**. Coloque os arquivos seguindo a convenção:

```
public/assets/sprites/pokemon/front/{id}.png
public/assets/sprites/pokemon/front-shiny/{id}.png
public/assets/sprites/pokemon/back/{id}.png
public/assets/sprites/pokemon/back-shiny/{id}.png
public/assets/sprites/pokemon/icons/{id}.png
public/assets/sprites/items/{itemId}.png
```

Os arquivos ausentes recebem um fallback automático (ver Arquitetura §11).

## Aviso legal

Pokémon e todos os nomes e imagens relacionados são marcas e propriedade da Nintendo, Game Freak, Creatures Inc. e
The Pokémon Company. Este é um projeto de fã, não oficial e não comercial.
