import { useMemo, useState } from 'preact/hooks';
import type { ScreenProps } from '../App';
import { CroppedSprite, Modal, Sprite, TypeBadge, Window, useApp } from '../components';
import { conditionText } from '../text';
import { STAT_KEYS } from '../../data/types';
import { speciesOf } from '../../core/pokemon';

const DEXES = [
  { id: 'kanto', name: 'Kanto', range: [1, 151] },
  { id: 'johto', name: 'Johto', range: [152, 251] },
  { id: 'hoenn', name: 'Hoenn', range: [252, 386] },
  { id: 'sinnoh', name: 'Sinnoh', range: [387, 493] },
  { id: 'national', name: 'Nacional', range: [1, 1025] },
] as const;

export function PokedexScreen(_: ScreenProps) {
  const app = useApp();
  const s = app.state;
  const [dex, setDex] = useState<(typeof DEXES)[number]['id']>('kanto');
  const [open, setOpen] = useState<string | null>(null);
  const d = DEXES.find((x) => x.id === dex)!;
  const list = app.data.speciesList.filter((sp) => sp.id >= d.range[0] && sp.id <= d.range[1]);
  const caught = list.filter((sp) => (s.pokedex[sp.key]?.caught ?? 0) > 0).length;
  const seen = list.filter((sp) => (s.pokedex[sp.key]?.seen ?? 0) > 0).length;
  const shiny = list.filter((sp) => s.pokedex[sp.key]?.shinyCaught).length;
  return (
    <Window
      title={<>Pokédex <span class="muted small">capturados {caught}/{list.length} · vistos {seen} · shiny {shiny}</span></>}
      actions={
        <div class="pk-tabs" role="tablist">
          {DEXES.map((x) => (
            <button key={x.id} class="pk-tab" role="tab" aria-selected={x.id === dex} onClick={() => setDex(x.id)}>{x.name}</button>
          ))}
        </div>
      }
    >
      <div class="pk-tiles">
        {list.map((sp) => {
          const e = s.pokedex[sp.key];
          const state = e?.caught ? 'caught' : e?.seen ? 'seen' : 'unseen';
          return (
            <button key={sp.key} class={`pk-tile dex-${state} ${state === 'unseen' ? 'is-unseen' : ''}`} onClick={() => e?.seen && setOpen(sp.key)} title={e?.seen ? sp.name : 'Ainda não visto'}>
              <span class="pk-tile__no">#{String(sp.id).padStart(4, '0')}</span>
              <span class={`pk-tile__mark ${e?.shinyCaught ? 'is-shiny' : 'is-caught'}`}>{e?.shinyCaught ? '✦' : e?.caught ? '◓' : ''}</span>
              <CroppedSprite id={sp.id} box={72} class={state === 'unseen' ? 'is-silhouette' : state === 'seen' ? 'is-grey' : ''} />
              <span class="pk-tile__name">{e?.seen ? sp.name : '???'}</span>
            </button>
          );
        })}
      </div>
      {open && <DexDetail speciesKey={open} onClose={() => setOpen(null)} />}
    </Window>
  );
}

function DexDetail({ speciesKey, onClose }: { speciesKey: string; onClose: () => void }) {
  const app = useApp();
  const s = app.state;
  const sp = speciesOf(app.data, speciesKey);
  const e = s.pokedex[speciesKey];
  const where = useMemo(
    () =>
      [...app.data.areas.values()].filter(
        (a) => a.slots.some((x) => x.species === speciesKey) || a.legendaries?.some((l) => l.species === speciesKey),
      ),
    [speciesKey],
  );
  const prev = sp.evolvesFrom ? speciesOf(app.data, sp.evolvesFrom) : null;
  const STAT: Record<string, string> = { hp: 'PS', atk: 'Ataque', def: 'Defesa', spa: 'At. Esp.', spd: 'Def. Esp.', spe: 'Velocidade' };
  return (
    <Modal title={<>#{sp.id} {sp.name}</>} onClose={onClose}>
      <div class="row">
        <Sprite id={sp.id} animated size={110} />
        {e?.shinyCaught && <Sprite id={sp.id} shiny animated size={110} />}
        <div class="stack" style={{ gap: '4px' }}>
          <div class="row">{sp.types.map((t) => <TypeBadge key={t} type={t} />)}</div>
          <span class="small">Vistos: {e?.seen ?? 0} · Capturados: {e?.caught ?? 0}</span>
          <span class="small">Taxa de captura: {sp.captureRate} · XP base: {sp.baseExp}</span>
          <span class="small muted">Geração {sp.generation}{sp.tags.length ? ` · ${sp.tags.join(', ')}` : ''}</span>
        </div>
      </div>
      <table class="table stats-table" style={{ marginTop: '10px' }}>
        <tbody>
          {STAT_KEYS.map((k) => (
            <tr key={k}>
              <td>{STAT[k]}</td>
              <td class="num" style={{ width: '40px' }}>{sp.baseStats[k]}</td>
              <td><div class="statbar" style={{ width: `${Math.min(100, (sp.baseStats[k] / 180) * 100)}%` }} /></td>
            </tr>
          ))}
        </tbody>
      </table>
      <h3 style={{ marginTop: '10px' }}>Evolução</h3>
      {prev && <p class="small">Evolui de <b>{(s.pokedex[prev.key]?.seen ? prev.name : '???')}</b>.</p>}
      {sp.evolutions.map((ev) => (
        <p key={ev.into} class="small">
          → <b>{s.pokedex[ev.into]?.seen ? speciesOf(app.data, ev.into).name : '???'}</b>:{' '}
          {ev.special === 'shed' ? 'surge junto na evolução' : ev.conditions.map((c) => conditionText(app.data, c)).join(' + ')}
        </p>
      ))}
      {!prev && !sp.evolutions.length && <p class="small muted">Sem linha evolutiva.</p>}
      <h3 style={{ marginTop: '10px' }}>Onde encontrar</h3>
      {where.length ? (
        <p class="small">{where.map((a) => `${a.name} (${app.data.regionById.get(a.regionId)?.name})`).join(' · ')}</p>
      ) : (
        <p class="small muted">Não aparece na natureza: obtenha por evolução ou recompensa da Pesquisa.</p>
      )}
    </Modal>
  );
}
