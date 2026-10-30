// Animação de evolução no estilo dos jogos: o Pokémon pisca em silhueta branca alternando com a forma nova, cada vez
// mais rápido, um clarão e a revelação. Toque/clique (ou Esc) para pular. Uma evolução por vez.
import { useEffect, useState } from 'preact/hooks';
import { Sprite, useApp } from '../components';
import { speciesOf } from '../../core/pokemon';

const REVEAL_MS = 3400;
const CLOSE_MS = 7000;

export function EvolutionScene() {
  const app = useApp();
  const evo = app.evolutions.value[0];
  const [start, setStart] = useState(0);
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!evo) return;
    setStart(performance.now());
    let raf = 0;
    const loop = () => {
      setTick((t) => t + 1);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    const key = (e: KeyboardEvent) => e.key === 'Escape' && close();
    window.addEventListener('keydown', key);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', key);
    };
  }, [evo?.id]);
  if (!evo) return null;
  const close = () => (app.evolutions.value = app.evolutions.value.slice(1));
  const t = start ? performance.now() - start : 0;
  if (t > CLOSE_MS) {
    queueMicrotask(close);
    return null;
  }
  const from = speciesOf(app.data, evo.from);
  const to = speciesOf(app.data, evo.to);
  const revealed = t >= REVEAL_MS;
  // Piscadas aceleram: o período cai de 600 ms para 90 ms até a revelação.
  const k = Math.min(1, t / REVEAL_MS);
  const period = 600 - 510 * k * k;
  const showNew = !revealed && Math.floor(t / period) % 2 === 1;
  const flash = t > REVEAL_MS - 250 && t < REVEAL_MS + 350;
  return (
    <div class="evo" role="dialog" aria-modal="true" aria-label={`${from.name} evoluiu para ${to.name}`} onClick={close}>
      <div class={`evo__stage ${flash ? 'is-flash' : ''}`}>
        <div class="evo__rays" aria-hidden="true" />
        {revealed ? (
          <Sprite id={to.id} shiny={evo.shiny} animated size={192} class="evo__mon is-revealed" />
        ) : (
          <Sprite key={showNew ? 'n' : 'o'} id={showNew ? to.id : from.id} shiny={evo.shiny} animated size={192} class="evo__mon is-silhouette" />
        )}
      </div>
      <div class="evo__box">
        {revealed ? <p>Parabéns! <b>{from.name}</b> evoluiu para <b>{to.name}</b>!</p> : <p>O quê? <b>{from.name}</b> está evoluindo!</p>}
        <span class="evo__hint">toque para continuar</span>
      </div>
    </div>
  );
}
