import { useState } from 'preact/hooks';
import type { ScreenProps } from '../App';
import { Window, fmt, pct, useApp } from '../components';
import { requirementText } from '../text';
import { areaUnlocked, isFarmArea, regionUnlocked, winsToClear } from '../../core/world';
import { estimateHunt, type HuntEstimate } from '../../core/analyzer';

const KIND_ICON: Record<string, string> = {
  route: '🌿', cave: '⛰️', forest: '🌲', water: '🌊', building: '🏚️', city: '🏙️', gym: '🏟️', league: '🏆', special: '⭐',
};

export function MapScreen({ go }: ScreenProps) {
  const app = useApp();
  const s = app.state;
  const currentRegion = app.data.areas.get(s.world.activeAreaId)!.regionId;
  const [regionId, setRegion] = useState(currentRegion);
  const [estimates, setEstimates] = useState<Record<string, HuntEstimate>>({});
  const region = app.data.regionById.get(regionId)!;
  const unlockedRegion = regionUnlocked(s, region);

  const analyze = (areaId: string) => {
    const e = estimateHunt(app.data, s, areaId, 20);
    setEstimates({ ...estimates, [areaId]: e });
  };

  return (
    <Window
      title="Mapa"
      actions={
        <div class="tabs">
          {app.data.regions.map((r) => (
            <button key={r.id} class={`tab ${r.id === regionId ? 'active' : ''}`} onClick={() => setRegion(r.id)}>
              {regionUnlocked(s, r) ? '' : '🔒 '}{r.name}
            </button>
          ))}
        </div>
      }
    >
      {!unlockedRegion && (
        <p class="bad">Região bloqueada: {region.unlock.map((r) => requirementText(app.data, r)).join(', ')}.</p>
      )}
      <p class="muted small">
        "Analisar" projeta o desempenho da sua equipe atual na área (simulação de 20 min com o motor do jogo). É uma estimativa, não garantia.
      </p>
      <div class="table-wrap">
        <table class="table">
          <thead>
            <tr><th>Área</th><th>Nível</th><th>Status</th><th>Projeção</th><th /></tr>
          </thead>
          <tbody>
            {region.areas.map((def) => {
              const a = app.data.areas.get(def.id)!;
              const open = areaUnlocked(s, app.data, a);
              const p = s.world.areas[a.id];
              const current = s.world.activeAreaId === a.id;
              const won = a.gym && s.player.badges.includes(a.gym.badgeId);
              const est = estimates[a.id];
              let status: string;
              if (won) status = `✅ ${a.gym!.badgeName}`;
              else if (a.league && s.player.champions.includes(a.regionId)) status = '🏆 Campeão (revanche disponível)';
              else if (!open) status = `🔒 Requer: ${a.unlock.map((r) => requirementText(app.data, r)).join(', ')}`;
              else if (p?.cleared) status = '✅ Concluída';
              else if (isFarmArea(a)) status = `${Math.min(p?.wins ?? 0, winsToClear(a))}/${winsToClear(a)} vitórias`;
              else status = 'Desafio disponível';
              return (
                <tr key={a.id} class={`${open || won ? '' : 'locked'} ${current ? 'current' : ''}`}>
                  <td>{KIND_ICON[a.kind]} {a.name}{a.legendaries?.length ? ' ⚡' : ''}</td>
                  <td class="num">{a.levelRange[0]}–{a.levelRange[1]}</td>
                  <td class="small">{status}</td>
                  <td class="small num">
                    {est
                      ? `${fmt(est.xpPerHour)} XP/h · ₽${fmt(est.moneyPerHour)}/h · vitória ${pct(est.winRate)} · ${est.capturesPerHour.toFixed(1)} capt./h`
                      : open && isFarmArea(a) ? <button class="btn btn-sm" onClick={() => analyze(a.id)}>Analisar</button> : ''}
                  </td>
                  <td class="right">
                    {open && !current && (
                      <button
                        class={`btn btn-sm ${a.gym || a.league ? 'btn-gold' : 'btn-primary'}`}
                        onClick={() => app.dispatch({ type: 'SelectArea', areaId: a.id }).ok && go('explore')}
                      >
                        {a.gym || a.league ? 'Desafiar' : 'Ir'}
                      </button>
                    )}
                    {current && <span class="great small">Aqui</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Window>
  );
}
