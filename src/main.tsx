import { render } from 'preact';
import { GameApp } from './app/GameApp';
import { App } from './ui/App';
import './ui/styles.css';

const root = document.getElementById('root')!;
render(<div class="loading">Carregando Pokémon Idle…</div>, root);

try {
  const theme = localStorage.getItem('pkidle:theme');
  if (theme) document.documentElement.dataset.theme = theme;
} catch {
  /* armazenamento indisponível */
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
