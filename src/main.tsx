import { render } from 'preact';
import { GameApp } from './app/GameApp';
import { App } from './ui/App';
import './ui/styles/tokens.css';
import './ui/styles/components.css';
import './ui/styles/app.css';
import './ui/styles/hub.css';
import './ui/styles/field.css';
import './ui/styles/town.css';

const root = document.getElementById('root')!;
render(<div class="loading">Carregando Pokémon Idle…</div>, root);

try {
  const theme = localStorage.getItem('pkidle:theme');
  const legacy: Record<string, string> = { dark: 'noite', light: 'dia' };
  if (theme) document.documentElement.dataset.theme = legacy[theme] ?? theme;
} catch {
  /* armazenamento indisponível */
}

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch((e) => console.warn('Service worker não registrado', e));
}

GameApp.boot()
  .then((app) => {
    render(<App app={app} />, root);
    app.start();
    // Acesso para depuração pelo console do navegador (ex.: pokemonIdle.state).
    (window as unknown as { pokemonIdle: GameApp }).pokemonIdle = app;
  })
  .catch((e) => {
    console.error(e);
    render(<div class="loading">Erro ao carregar o jogo: {String(e?.message ?? e)}</div>, root);
  });
