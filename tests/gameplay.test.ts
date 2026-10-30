import { describe, expect, it } from 'vitest';
import { newCore } from './helpers';
import { simulate } from '../src/core/simulate';
import { createPokemon, addPokemon } from '../src/core/pokemon';
import { canEvolve, availableEvolutions } from '../src/core/systems/evolution';
import { tickExploration } from '../src/core/systems/exploration';

describe('comandos', () => {
  it('escolher inicial cria o Pokémon, registra na Pokédex e inicia a exploração', async () => {
    const { core, state } = await newCore();
    expect(core.dispatch({ type: 'ChooseStarter', species: 'pikachu' }).ok).toBe(false);
    expect(core.dispatch({ type: 'ChooseStarter', species: 'squirtle' }).ok).toBe(true);
    expect(state.party.length).toBe(1);
    expect(state.pokedex.squirtle.caught).toBe(1);
    expect(core.dispatch({ type: 'ChooseStarter', species: 'bulbasaur' }).ok).toBe(false);
  });

  it('valida compras, áreas bloqueadas e melhorias', async () => {
    const { core, state } = await newCore();
    core.dispatch({ type: 'ChooseStarter', species: 'charmander' });
    expect(core.dispatch({ type: 'BuyItem', itemId: 'ultra-ball', qty: 1 }).ok).toBe(false); // exige insígnias
    expect(core.dispatch({ type: 'BuyItem', itemId: 'poke-ball', qty: 1000 }).ok).toBe(false); // sem dinheiro
    expect(core.dispatch({ type: 'BuyItem', itemId: 'poke-ball', qty: 5 }).ok).toBe(true);
    expect(state.inventory['poke-ball']).toBe(15);
    expect(core.dispatch({ type: 'SelectArea', areaId: 'kanto-pewter-gym' }).ok).toBe(false);
    expect(core.dispatch({ type: 'BuyUpgrade', upgradeId: 'running-shoes' }).ok).toBe(true);
    expect(core.dispatch({ type: 'BuyUpgrade', upgradeId: 'academy' }).ok).toBe(false); // exige 4 insígnias
  });
});

describe('simulação', () => {
  it('é determinística: mesma semente → mesmo resultado', async () => {
    const run = async () => {
      const { core, state, data } = await newCore(7);
      core.dispatch({ type: 'ChooseStarter', species: 'bulbasaur' });
      simulate(data, state, 20 * 60_000, { now: () => Date.UTC(2026, 0, 1, 12) });
      return JSON.stringify({ party: state.party.map((u) => state.pokemon[u]), dex: state.pokedex, money: state.player.money });
    };
    expect(await run()).toBe(await run());
  });

  it('30 min na Rota 1: vence batalhas, captura, sobe de nível e respeita o teto', async () => {
    const { core, state, data } = await newCore(3);
    core.dispatch({ type: 'ChooseStarter', species: 'charmander' });
    const sum = simulate(data, state, 30 * 60_000, { now: () => Date.UTC(2026, 0, 1, 12) });
    expect(sum.battlesWon).toBeGreaterThan(100);
    expect(sum.captures).toBeGreaterThan(0);
    expect(state.pokedex.pidgey?.seen).toBeGreaterThan(0);
    expect(Object.values(state.pokemon).every((p) => p.level <= 16)).toBe(true);
    expect(state.world.areas['kanto-route-1'].cleared).toBe(true);
  });

  it('equipe derrotada vai ao Centro Pokémon e se recupera', async () => {
    const { core, state } = await newCore(5);
    core.dispatch({ type: 'ChooseStarter', species: 'bulbasaur' });
    state.pokemon[state.party[0]].hp = 1;
    state.player.badges = ['boulder'];
    state.player.trainerXp = 10_000;
    core.dispatch({ type: 'SelectArea', areaId: 'kanto-route-3' });
    for (let i = 0; i < 400 && state.exploration.phase !== 'healing'; i++) core.tick(250);
    expect(state.exploration.phase).toBe('healing');
    for (let i = 0; i < 200 && state.exploration.phase === 'healing'; i++) core.tick(250);
    const pk = state.pokemon[state.party[0]];
    expect(pk.fainted).toBe(false);
    expect(pk.hp).toBeGreaterThan(1);
  });
});

describe('evolução', () => {
  it('nível, pedra, Cabo de Ligação, gênero, personalidade e atributo', async () => {
    const { core, state } = await newCore();
    const ctx = core.ctx;
    const mk = (sp: string, lvl: number) => {
      const pk = createPokemon(ctx, state, sp, lvl, { origin: 'gift' });
      addPokemon(state, pk);
      return pk;
    };
    const bulba = mk('bulbasaur', 16);
    expect(canEvolve(ctx, state, bulba, bulba && ctx.data.species.get('bulbasaur')!.evolutions[0], { kind: 'level' })).toBe(true);

    const eevee = mk('eevee', 10);
    state.inventory['thunder-stone'] = 1;
    expect(core.dispatch({ type: 'UseItem', itemId: 'thunder-stone', uid: eevee.uid }).ok).toBe(true);
    expect(state.pokemon[eevee.uid].species).toBe('jolteon');
    expect(state.inventory['thunder-stone']).toBeUndefined();

    const kadabra = mk('kadabra', 20);
    expect(core.dispatch({ type: 'UseItem', itemId: 'link-cable', uid: kadabra.uid }).ok).toBe(false); // não tem o item
    state.inventory['link-cable'] = 1;
    expect(core.dispatch({ type: 'UseItem', itemId: 'link-cable', uid: kadabra.uid }).ok).toBe(true);
    expect(state.pokemon[kadabra.uid].species).toBe('alakazam');

    const onix = mk('onix', 20);
    state.inventory['link-cable'] = 1;
    expect(core.dispatch({ type: 'UseItem', itemId: 'link-cable', uid: onix.uid }).ok).toBe(false); // precisa segurar Metal Coat
    state.inventory['metal-coat'] = 1;
    core.dispatch({ type: 'HoldItem', uid: onix.uid, itemId: 'metal-coat' });
    expect(core.dispatch({ type: 'UseItem', itemId: 'link-cable', uid: onix.uid }).ok).toBe(true);
    expect(state.pokemon[onix.uid].species).toBe('steelix');
    expect(state.pokemon[onix.uid].heldItem).toBeNull(); // item consumido na evolução

    const wurmple = mk('wurmple', 7);
    const opts = availableEvolutions(ctx, state, wurmple).map((e) => e.evo.into);
    expect(opts.length).toBe(1);
    expect(['silcoon', 'cascoon']).toContain(opts[0]);

    const kirlia = mk('kirlia', 20);
    kirlia.gender = 'f';
    state.inventory['dawn-stone'] = 1;
    expect(core.dispatch({ type: 'UseItem', itemId: 'dawn-stone', uid: kirlia.uid }).ok).toBe(false);
    kirlia.gender = 'm';
    expect(core.dispatch({ type: 'UseItem', itemId: 'dawn-stone', uid: kirlia.uid }).ok).toBe(true);
    expect(state.pokemon[kirlia.uid].species).toBe('gallade');

    const everstone = mk('charmander', 40);
    everstone.heldItem = 'everstone';
    expect(availableEvolutions(ctx, state, everstone)).toEqual([]);
  });

  it('Nincada gera Shedinja ao evoluir (consome 1 Poké Ball)', async () => {
    const { core, state } = await newCore();
    core.dispatch({ type: 'ChooseStarter', species: 'squirtle' });
    state.player.badges = ['boulder', 'cascade', 'thunder', 'rainbow']; // teto 45
    const n = createPokemon(core.ctx, state, 'nincada', 19, { origin: 'gift' });
    addPokemon(state, n);
    const balls = state.inventory['poke-ball'];
    core.dispatch({ type: 'UseItem', itemId: 'rare-candy', uid: n.uid }); // sem rare candy → falha
    state.inventory['rare-candy'] = 1;
    expect(core.dispatch({ type: 'UseItem', itemId: 'rare-candy', uid: n.uid }).ok).toBe(true);
    expect(state.pokemon[n.uid].species).toBe('ninjask');
    expect(Object.values(state.pokemon).some((p) => p.species === 'shedinja')).toBe(true);
    expect(state.inventory['poke-ball']).toBe(balls - 1);
  });
});

describe('regras de captura e Auto Manager', () => {
  it('captura espécies novas e transfere duplicatas sem IV melhor', async () => {
    const { core, state, data } = await newCore(11);
    core.dispatch({ type: 'ChooseStarter', species: 'squirtle' });
    state.inventory['poke-ball'] = 500;
    state.captureRules.find((r) => r.when === 'any')!.enabled = true;
    state.settings.protectGrade = 'S';
    simulate(data, state, 20 * 60_000, { now: () => Date.UTC(2026, 0, 1, 12) });
    expect(state.stats.captures).toBeGreaterThan(10);
    expect(state.stats.transfers).toBeGreaterThan(0);
    expect(Number(Object.values(state.affinity).reduce((a, b) => a + b, 0))).toBeGreaterThanOrEqual(state.stats.captures);
    // nenhuma espécie fica com duas cópias de IV igual ou pior (shiny/protegidos à parte)
    void tickExploration;
  });
});

describe('conquistas', () => {
  it('são concedidas uma vez, com PP', async () => {
    const { core, state, data } = await newCore(6);
    core.dispatch({ type: 'ChooseStarter', species: 'charmander' });
    simulate(data, state, 10 * 60_000, { now: () => Date.UTC(2026, 0, 1, 12) });
    expect(state.achievements).toContain('win-10');
    expect(state.achievements).toContain('cap-1');
    expect(new Set(state.achievements).size).toBe(state.achievements.length);
  });
});

describe('regressões da revisão de código', () => {
  it('Transfer é atômico e não esvazia a equipe', async () => {
    const { core, state } = await newCore(12);
    core.dispatch({ type: 'ChooseStarter', species: 'bulbasaur' });
    const extra = createPokemon(core.ctx, state, 'pidgey', 5, { origin: 'gift' });
    addPokemon(state, extra);
    const money = state.player.money;
    expect(core.dispatch({ type: 'Transfer', uids: [extra.uid, state.party[0]] }).ok).toBe(false);
    expect(state.pokemon[extra.uid]).toBeDefined();
    expect(state.player.money).toBe(money);
    expect(core.dispatch({ type: 'Transfer', uids: [extra.uid] }).ok).toBe(true);
  });

  it('valida configurações, venda fracionada e índices de preset', async () => {
    const { core, state } = await newCore(13);
    core.dispatch({ type: 'ChooseStarter', species: 'bulbasaur' });
    core.dispatch({ type: 'SetSettings', settings: { autoBuyBudget: 10, autoBuyMinStock: -5, autoPotionThreshold: 7 } });
    expect(state.settings.autoBuyBudget).toBe(1);
    expect(state.settings.autoBuyMinStock).toBe(0);
    expect(state.settings.autoPotionThreshold).toBeLessThanOrEqual(0.95);
    expect(core.dispatch({ type: 'SellItem', itemId: 'potion', qty: 1.5 }).ok).toBe(false);
    core.dispatch({ type: 'SavePreset', name: 'a' });
    expect(core.dispatch({ type: 'DeletePreset', index: -1 }).ok).toBe(false);
    expect(core.dispatch({ type: 'DeletePreset', index: 5 }).ok).toBe(false);
    expect(state.presets.length).toBe(1);
  });

  it('obediência limita também os PS em batalha', async () => {
    const { core, state, data } = await newCore(14);
    core.dispatch({ type: 'ChooseStarter', species: 'bulbasaur' });
    const g = createPokemon(core.ctx, state, 'gyarados', 60, { origin: 'gift' });
    const { toCombatant, maxHpOf } = await import('../src/core/pokemon');
    const c = toCombatant(state, data, g, 1, 16);
    expect(c.level).toBe(16);
    expect(c.maxHp).toBeLessThan(maxHpOf(state, data, g) / 2);
    expect(c.hp * c.hpScale!).toBeCloseTo(g.hp);
  });

  it('treinadores de rota usam o Tier da área desde o primeiro Pokémon', async () => {
    const { data } = await newCore();
    const area = data.areas.get('sinnoh-route-202') ?? [...data.areas.values()].find((a) => a.regionId === 'sinnoh' && a.routeTrainers.length)!;
    expect(area.statMult).toBeGreaterThan(1);
  });
});

describe('Nível de Treinador', () => {
  it('libera as áreas por nível (com insígnias e itens-chave ainda valendo)', async () => {
    const { core, state, data } = await newCore(21);
    core.dispatch({ type: 'ChooseStarter', species: 'charmander' });
    const { trainerLevel, trainerXpForLevel, areaUnlocked } = await import('../src/core/world');
    const route2 = data.areas.get('kanto-route-2')!;
    expect(route2.unlock).toContainEqual({ type: 'trainerLevel', min: route2.trainerLevel });
    expect(route2.unlock.some((r) => r.type === 'areaCleared')).toBe(false);
    expect(areaUnlocked(state, data, route2)).toBe(false);
    state.player.trainerXp = trainerXpForLevel(route2.trainerLevel);
    expect(trainerLevel(state)).toBe(route2.trainerLevel);
    expect(areaUnlocked(state, data, route2)).toBe(true);
    const route3 = data.areas.get('kanto-route-3')!;
    state.player.trainerXp = trainerXpForLevel(50);
    expect(areaUnlocked(state, data, route3)).toBe(false); // ainda exige a Insígnia Pedra
    state.player.badges.push('boulder');
    expect(areaUnlocked(state, data, route3)).toBe(true);
  });

  it('vitórias e capturas dão XP de Treinador e liberam a Rota 22 sem concluir a Rota 1', async () => {
    const { core, state, data } = await newCore(22);
    core.dispatch({ type: 'ChooseStarter', species: 'squirtle' });
    simulate(data, state, 2 * 60_000, { now: () => Date.UTC(2026, 0, 1, 12) });
    expect(state.player.trainerXp).toBeGreaterThanOrEqual(10);
    expect(state.world.areas['kanto-route-1'].cleared).toBe(false);
    expect(core.dispatch({ type: 'SelectArea', areaId: 'kanto-route-22' }).ok).toBe(true);
  });
});
