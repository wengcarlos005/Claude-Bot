import { useMemo, useState } from 'preact/hooks';
import type { ScreenProps } from '../App';
import { Empty, Grade, Sprite, Window, fmt, useApp } from '../components';
import { PokemonDetail } from './PokemonDetail';
import { displayName, pcCount, speciesOf } from '../../core/pokemon';
import { ivGrade, ivTotal } from '../../core/formulas/stats';
import { transferValue } from '../../core/systems/collection';

type Sort = 'recent' | 'level' | 'dex' | 'iv';

export function PcScreen(_: ScreenProps) {
  const app = useApp();
  const s = app.state;
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<Sort>('recent');
  const [onlyShiny, setOnlyShiny] = useState(false);
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const count = Object.keys(s.pokemon).length;
  const list = useMemo(() => {
    let l = Object.values(s.pokemon).filter((p) => !s.party.includes(p.uid));
    if (q) l = l.filter((p) => displayName(app.data, p).toLowerCase().includes(q.toLowerCase()));
    if (onlyShiny) l = l.filter((p) => p.shiny);
    const key: Record<Sort, (p: (typeof l)[0]) => number> = {
      recent: (p) => -p.caughtAt,
      level: (p) => -p.level,
      dex: (p) => speciesOf(app.data, p.species).id,
      iv: (p) => -ivTotal(p.ivs),
    };
    return l.sort((a, b) => key[sort](a) - key[sort](b));
  }, [count, q, sort, onlyShiny, s.party.join(), app.frame.value >> 4]);
  const value = selected.reduce(
    (a, u) => {
      const pk = s.pokemon[u];
      if (!pk) return a;
      const v = transferValue(app.core.ctx, pk);
      return { money: a.money + v.money, research: a.research + v.research };
    },
    { money: 0, research: 0 },
  );
  const toggle = (uid: string) => setSelected(selected.includes(uid) ? selected.filter((x) => x !== uid) : [...selected, uid]);

  return (
    <Window
      title={<>PC <span class="muted small">({pcCount(s)}/{s.pcCapacity})</span></>}
      actions={
        <>
          <input placeholder="Buscar…" value={q} onInput={(e) => setQ((e.target as HTMLInputElement).value)} />
          <select value={sort} onChange={(e) => setSort((e.target as HTMLSelectElement).value as Sort)}>
            <option value="recent">Recentes</option>
            <option value="level">Nível</option>
            <option value="dex">Nº Pokédex</option>
            <option value="iv">IVs</option>
          </select>
          <label class="row small"><input type="checkbox" checked={onlyShiny} onChange={() => setOnlyShiny(!onlyShiny)} /> Shiny</label>
          <button class={`btn btn-sm ${selecting ? 'btn-gold' : ''}`} onClick={() => { setSelecting(!selecting); setSelected([]); }}>
            {selecting ? 'Cancelar seleção' : 'Selecionar vários'}
          </button>
        </>
      }
    >
      {selecting && (
        <div class="row spread" style={{ marginBottom: '10px' }}>
          <span class="small">{selected.length} selecionado(s) · Transferir rende ₽{fmt(value.money)} e {value.research} PP. Pokémon protegidos 🔒 são ignorados.</span>
          <button
            class="btn btn-sm btn-danger"
            disabled={!selected.length}
            onClick={() => {
              const uids = selected.filter((u) => !s.pokemon[u]?.locked);
              if (uids.length && confirm(`Transferir ${uids.length} Pokémon ao Professor? Esta ação não pode ser desfeita.`)) {
                app.dispatch({ type: 'Transfer', uids });
                setSelected([]);
              }
            }}
          >
            Transferir selecionados
          </button>
        </div>
      )}
      {list.length === 0 ? (
        <Empty>Nenhum Pokémon no PC. Capturas além da equipe de 6 vêm para cá.</Empty>
      ) : (
        <div class="grid-mons">
          {list.slice(0, 600).map((p) => {
            const sp = speciesOf(app.data, p.species);
            return (
              <div key={p.uid} class={`mon-cell ${selected.includes(p.uid) ? 'selected' : ''}`} onClick={() => (selecting ? toggle(p.uid) : setOpen(p.uid))}>
                <div class="badges">
                  <span>{p.shiny ? '✨' : ''}{p.locked ? '🔒' : ''}</span>
                  <Grade grade={ivGrade(p.ivs)} />
                </div>
                <Sprite id={sp.id} shiny={p.shiny} size={64} />
                <span>{displayName(app.data, p)}</span>
                <span class="muted">Nv{p.level}</span>
              </div>
            );
          })}
        </div>
      )}
      {list.length > 600 && <p class="muted small">Mostrando 600 de {list.length}. Use a busca para filtrar.</p>}
      {open && <PokemonDetail uid={open} onClose={() => setOpen(null)} />}
    </Window>
  );
}
