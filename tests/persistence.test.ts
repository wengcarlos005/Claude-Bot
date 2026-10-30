import { describe, expect, it } from 'vitest';
import { newCore } from './helpers';
import { MemoryRepository, decodeEnvelope, encodeState, exportSave, importSave, loadGame, saveGame } from '../src/app/persistence';
import { migrate } from '../src/app/migrations';
import { simulate } from '../src/core/simulate';

describe('persistência', () => {
  it('round-trip: salvar e carregar preserva o estado', async () => {
    const { core, state, data } = await newCore(9);
    core.dispatch({ type: 'ChooseStarter', species: 'bulbasaur' });
    simulate(data, state, 5 * 60_000, { now: () => 0 });
    const repo = new MemoryRepository();
    await saveGame(repo, state, 123);
    const loaded = await loadGame(repo);
    expect(loaded?.slot).toBe('main');
    expect(loaded?.state).toEqual(state);
  });

  it('checksum inválido cai para o backup', async () => {
    const { core, state } = await newCore(9);
    core.dispatch({ type: 'ChooseStarter', species: 'bulbasaur' });
    const repo = new MemoryRepository();
    await saveGame(repo, state, 1);
    state.player.money = 999_999;
    await saveGame(repo, state, 2, true);
    const main = repo.data.get('main')!;
    repo.data.set('main', { ...main, checksum: 'deadbeef' });
    const loaded = await loadGame(repo);
    expect(loaded?.slot).toBe('backup-1');
    expect(loaded?.state.player.money).toBe(3000);
  });

  it('exportar/importar', async () => {
    const { core, state } = await newCore(4);
    core.dispatch({ type: 'ChooseStarter', species: 'charmander' });
    const text = await exportSave(state, 5);
    expect((await importSave(text)).party).toEqual(state.party);
    await expect(importSave('lixo')).rejects.toThrow();
  });

  it('rejeita saves sem versão, de versão futura ou com equipe inválida', async () => {
    const { state } = await newCore();
    expect(() => migrate({})).toThrow();
    expect(() => migrate({ ...state, meta: { ...state.meta, saveVersion: 999 } })).toThrow();
    expect(() => migrate({ ...state, party: ['p404'] })).toThrow();
    const env = await encodeState(state, 1);
    expect((await decodeEnvelope(env)).meta.saveVersion).toBe(state.meta.saveVersion);
  });
});

describe('migrações', () => {
  it('v1 → v2 adiciona conquistas sem perder dados', async () => {
    const { core, state } = await newCore(2);
    core.dispatch({ type: 'ChooseStarter', species: 'squirtle' });
    const v1: Record<string, any> = structuredClone(state);
    delete v1.achievements;
    v1.meta.saveVersion = 1;
    const migrated = migrate(v1);
    expect(migrated.meta.saveVersion).toBe(2);
    expect(migrated.achievements).toEqual([]);
    expect(migrated.party).toEqual(state.party);
  });
});
