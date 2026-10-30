import { useState } from 'preact/hooks';
import type { ScreenProps } from '../App';
import { Window, useApp } from '../components';
import { trainerSprite } from '../../app/assets';
import { AVATARS, DEFAULT_AVATAR } from '../../data/content/avatars';

export function SettingsScreen(_: ScreenProps) {
  const app = useApp();
  const s = app.state;
  const [exported, setExported] = useState('');
  const [importText, setImportText] = useState('');
  const [confirmReset, setConfirmReset] = useState(false);
  const setTheme = (t: string) => {
    document.documentElement.dataset.theme = t;
    try {
      localStorage.setItem('pkidle:theme', t);
    } catch {
      /* sem armazenamento */
    }
  };
  return (
    <div class="cols">
      <div class="stack">
        <Window title="Treinador">
          <div class="row">
            <label>Nome: <input value={s.player.name} maxLength={16} onChange={(e) => app.dispatch({ type: 'SetPlayerName', name: (e.target as HTMLInputElement).value })} /></label>
          </div>
          <div class="avatars" role="radiogroup" aria-label="Avatar do treinador">
            {AVATARS.map((a) => (
              <button key={a.id} role="radio" aria-checked={(s.player.avatar ?? DEFAULT_AVATAR) === a.id} class="avatar-opt" onClick={() => app.dispatch({ type: 'SetAvatar', avatar: a.id })} title={a.name}>
                <img src={trainerSprite(a.id)} width={64} height={64} alt={a.name} />
              </button>
            ))}
          </div>
          <div class="row" style={{ marginTop: '8px' }}>
            Tema:
            <button class="pk-btn pk-btn--sm" onClick={() => setTheme('noite')}>Noite</button>
            <button class="pk-btn pk-btn--sm" onClick={() => setTheme('dia')}>Dia</button>
          </div>
        </Window>
        <Window title="Save">
          <p class="small muted">O jogo salva automaticamente a cada 30 s, ao sair da aba e após eventos importantes, mantendo 2 backups.</p>
          <div class="row">
            <button class="pk-btn pk-btn--sm" onClick={() => app.save().then(() => app.toast('Jogo salvo.', 'good'))}>Salvar agora</button>
            <button class="pk-btn pk-btn--sm" onClick={async () => setExported(await app.exportString())}>Exportar save</button>
          </div>
          {exported && (
            <>
              <textarea readOnly value={exported} onFocus={(e) => (e.currentTarget as HTMLTextAreaElement).select()} />
              <button class="pk-btn pk-btn--sm" onClick={() => navigator.clipboard?.writeText(exported).then(() => app.toast('Copiado!', 'good'))}>Copiar</button>
            </>
          )}
          <h3 style={{ marginTop: '12px' }}>Importar</h3>
          <textarea placeholder="Cole aqui um save exportado" value={importText} onInput={(e) => setImportText((e.target as HTMLTextAreaElement).value)} />
          <button
            class="pk-btn pk-btn--sm"
            disabled={!importText.trim()}
            onClick={() => app.importString(importText).then(() => setImportText('')).catch((e) => app.toast(`Falha ao importar: ${e.message}`, 'bad'))}
          >
            Importar (substitui o progresso atual)
          </button>
          <h3 style={{ marginTop: '12px' }} class="bad">Zona de perigo</h3>
          {!confirmReset ? (
            <button class="pk-btn pk-btn--sm pk-btn--danger" onClick={() => setConfirmReset(true)}>Apagar todo o progresso…</button>
          ) : (
            <div class="row">
              <span class="bad small">Tem certeza? Exporte antes se quiser guardar uma cópia.</span>
              <button class="pk-btn pk-btn--sm pk-btn--danger" onClick={() => app.resetGame().then(() => setConfirmReset(false))}>Sim, apagar</button>
              <button class="pk-btn pk-btn--sm" onClick={() => setConfirmReset(false)}>Cancelar</button>
            </div>
          )}
        </Window>
      </div>
      <Window title="Créditos e aviso legal">
        <div class="legal stack" style={{ gap: '8px' }}>
          <p>
            <b>Pokémon Idle</b> é um projeto de fã, não oficial e sem fins comerciais. Pokémon e todos os nomes, imagens e marcas relacionados são
            propriedade da Nintendo, Game Freak, Creatures Inc. e The Pokémon Company. Este projeto não é afiliado nem endossado por eles.
          </p>
          <p>
            Dados de espécies, golpes, evoluções e encontros: <a href="https://pokeapi.co/" target="_blank" rel="noreferrer">PokéAPI</a> (dados
            factuais). Sprites carregados do repositório público de sprites da PokéAPI; seus direitos pertencem aos titulares originais.
          </p>
          <p>Código, sistemas e regras de jogo: implementação própria deste projeto.</p>
        </div>
      </Window>
    </div>
  );
}
