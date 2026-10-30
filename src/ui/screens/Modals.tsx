import { Bar, Modal, Sprite, TypeBadge, duration, fmt, useApp } from '../components';
import { speciesOf } from '../../core/pokemon';

export function StarterPicker() {
  const app = useApp();
  const starters = app.data.regions[0].starters ?? [];
  return (
    <Modal title="Bem-vindo ao mundo Pokémon!">
      <p>Escolha seu primeiro parceiro. Ele vai explorar com você, batalhar e ajudar a capturar novos Pokémon — mesmo enquanto você está fora.</p>
      <div class="starters">
        {starters.map((k) => {
          const sp = speciesOf(app.data, k);
          return (
            <button key={k} class="btn starter" onClick={() => app.dispatch({ type: 'ChooseStarter', species: k })}>
              <Sprite id={sp.id} animated size={96} />
              <b>{sp.name}</b>
              <span class="row">{sp.types.map((t) => <TypeBadge key={t} type={t} />)}</span>
            </button>
          );
        })}
      </div>
    </Modal>
  );
}

export function OfflineProgress({ value }: { value: number }) {
  return (
    <Modal title="Calculando o que aconteceu enquanto você estava fora…">
      <Bar value={value} max={1} kind="progress" />
      <p class="small muted">Sua equipe continuou explorando. Simulando com o motor do jogo…</p>
    </Modal>
  );
}

export function OfflineModal() {
  const app = useApp();
  const r = app.offlineReport.value!;
  const sm = r.summary;
  const close = () => (app.offlineReport.value = null);
  const name = (k: string) => app.data.species.get(k)?.name ?? k;
  return (
    <Modal title="Bem-vindo de volta!" onClose={close}>
      <p>
        Você ficou fora por <b>{duration(r.awayMs)}</b>. Com eficiência offline de {Math.round(r.efficiency * 100)}%, sua equipe explorou por{' '}
        <b>{duration(r.simulatedMs)}</b>{r.capped && <span class="bad"> (limite offline atingido — aumente na Pesquisa)</span>}.
      </p>
      <div class="metrics">
        <div class="metric"><div class="label">Batalhas</div><div class="value">{fmt(sm.battlesWon)}</div></div>
        <div class="metric"><div class="label">Capturas</div><div class="value">{fmt(sm.captures)}</div></div>
        <div class="metric"><div class="label">₽</div><div class="value">{fmt(sm.money)}</div></div>
        <div class="metric"><div class="label">XP</div><div class="value">{fmt(sm.xp)}</div></div>
        <div class="metric"><div class="label">Níveis</div><div class="value">{fmt(sm.levelUps)}</div></div>
        <div class="metric"><div class="label">Derrotas</div><div class="value">{fmt(sm.battlesLost)}</div></div>
      </div>
      {sm.newSpecies.length > 0 && (
        <>
          <h3 style={{ marginTop: '10px' }}>Novos na Pokédex</h3>
          <div class="row">
            {sm.newSpecies.map((k) => (
              <span key={k} class="row small"><Sprite id={speciesOf(app.data, k).id} size={40} />{name(k)}</span>
            ))}
          </div>
        </>
      )}
      {sm.shinies.length > 0 && <p class="great">✨ Shinies encontrados: {sm.shinies.map(name).join(', ')}</p>}
      {sm.evolutions.length > 0 && <p>Evoluções: {sm.evolutions.map((e) => `${name(e.from)} → ${name(e.to)}`).join(', ')}</p>}
      {sm.badges.length > 0 && <p class="great">🏅 {sm.badges.join(', ')}</p>}
      {Object.keys(sm.itemsFound).length > 0 && (
        <p class="small">Itens: {Object.entries(sm.itemsFound).map(([id, q]) => `${q}× ${app.data.items.get(id)?.name}`).join(', ')}</p>
      )}
      <p class="small muted">Bolas usadas: {sm.ballsUsed}</p>
      <button class="btn btn-primary" onClick={close}>Continuar</button>
    </Modal>
  );
}
