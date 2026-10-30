import { describe, expect, it } from 'vitest';
import { data } from './helpers';

describe('integridade dos dados', () => {
  it('carrega 1025 espécies e as 4 regiões', async () => {
    const d = await data();
    expect(d.speciesList.length).toBe(1025);
    expect(d.regions.map((r) => r.id)).toEqual(['kanto', 'johto', 'hoenn', 'sinnoh']);
  });

  it('todas as referências de espécies/itens/golpes existem', async () => {
    const d = await data();
    for (const sp of d.speciesList) {
      for (const [, m] of sp.learnset) expect(d.moves.has(m), `${sp.key}: golpe ${m}`).toBe(true);
      for (const e of sp.evolutions) {
        expect(d.species.has(e.into), `${sp.key} → ${e.into}`).toBe(true);
        for (const c of e.conditions) if (c.type === 'item' || c.type === 'heldItem') expect(d.items.has(c.itemId), c.itemId).toBe(true);
      }
    }
    for (const a of d.areas.values()) {
      for (const s of a.slots) expect(d.species.has(s.species), `${a.id}: ${s.species}`).toBe(true);
      for (const t of [...a.routeTrainers, ...(a.gym ? [...a.gym.trainers, a.gym.leader] : []), ...(a.league?.members ?? [])])
        for (const m of t.team) expect(d.species.has(m.species), `${t.id}: ${m.species}`).toBe(true);
      for (const id of Object.keys(a.clearReward?.items ?? {})) expect(d.items.has(id), id).toBe(true);
      for (const id of Object.keys(a.gym?.reward.items ?? {})) expect(d.items.has(id), id).toBe(true);
    }
    for (const m of d.milestones) for (const r of m.rewards) if (r.kind === 'pokemon') expect(d.species.has(r.species)).toBe(true);
  });

  it('ids de treinadores e insígnias são únicos', async () => {
    const d = await data();
    const trainers = new Set<string>();
    const badges = new Set<string>();
    for (const a of d.areas.values()) {
      for (const t of [...a.routeTrainers, ...(a.gym ? [...a.gym.trainers, a.gym.leader] : []), ...(a.league?.members ?? [])]) {
        expect(trainers.has(t.id), t.id).toBe(false);
        trainers.add(t.id);
      }
      if (a.gym) {
        expect(badges.has(a.gym.badgeId)).toBe(false);
        badges.add(a.gym.badgeId);
      }
    }
    expect(badges.size).toBe(32);
  });

  it('toda a Pokédex de Kanto (1–151) é obtível: natureza, evolução ou recompensa', async () => {
    const d = await data();
    const obtainable = new Set<string>(d.regions[0].starters);
    for (const a of d.areas.values()) {
      for (const s of a.slots) obtainable.add(s.species);
      for (const l of a.legendaries ?? []) obtainable.add(l.species);
    }
    for (const m of d.milestones) for (const r of m.rewards) if (r.kind === 'pokemon') obtainable.add(r.species);
    let grew = true;
    while (grew) {
      grew = false;
      for (const sp of d.speciesList) {
        if (!obtainable.has(sp.key)) continue;
        for (const e of sp.evolutions) if (!obtainable.has(e.into)) obtainable.add(e.into), (grew = true);
      }
    }
    const missing = d.speciesList.filter((s) => s.id <= 151 && !obtainable.has(s.key)).map((s) => s.key);
    expect(missing).toEqual([]);
  });

  it('níveis das áreas ficam entre 1 e 100', async () => {
    const d = await data();
    for (const a of d.areas.values()) {
      expect(a.levelRange[0]).toBeGreaterThanOrEqual(1);
      expect(a.levelRange[1]).toBeLessThanOrEqual(100);
    }
  });
});
