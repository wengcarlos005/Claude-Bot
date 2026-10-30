// Persistência: envelopes de save comprimidos (gzip + base64) com checksum, backups rotativos e migrações.
// A interface SaveRepository permite trocar IndexedDB por um backend (Firebase/servidor) sem mudar o jogo.
import { createStore, del, get, set } from 'idb-keyval';
import type { GameState } from '../core/state/types';
import { SAVE_VERSION } from '../core/state/types';
import { migrate } from './migrations';

export interface SaveEnvelope {
  saveVersion: number;
  savedAt: number;
  revision: number;
  checksum: string;
  payload: string;
}

export interface SaveRepository {
  load(slot: string): Promise<SaveEnvelope | null>;
  save(slot: string, env: SaveEnvelope): Promise<void>;
  remove(slot: string): Promise<void>;
}

export class IndexedDbRepository implements SaveRepository {
  private store = createStore('pokemon-idle', 'saves');
  load(slot: string) {
    return get<SaveEnvelope>(slot, this.store).then((v) => v ?? null);
  }
  save(slot: string, env: SaveEnvelope) {
    return set(slot, env, this.store);
  }
  remove(slot: string) {
    return del(slot, this.store);
  }
}

export class LocalStorageRepository implements SaveRepository {
  async load(slot: string) {
    const raw = localStorage.getItem(`pkidle:${slot}`);
    return raw ? (JSON.parse(raw) as SaveEnvelope) : null;
  }
  async save(slot: string, env: SaveEnvelope) {
    localStorage.setItem(`pkidle:${slot}`, JSON.stringify(env));
  }
  async remove(slot: string) {
    localStorage.removeItem(`pkidle:${slot}`);
  }
}

export class MemoryRepository implements SaveRepository {
  data = new Map<string, SaveEnvelope>();
  async load(slot: string) {
    return this.data.get(slot) ?? null;
  }
  async save(slot: string, env: SaveEnvelope) {
    this.data.set(slot, env);
  }
  async remove(slot: string) {
    this.data.delete(slot);
  }
}

/** FNV-1a de 32 bits (detecta corrupção, não é segurança). */
export function checksum(s: string): string {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

async function gzip(text: string): Promise<string> {
  const stream = new Blob([text]).stream().pipeThrough(new CompressionStream('gzip'));
  const buf = new Uint8Array(await new Response(stream).arrayBuffer());
  let bin = '';
  for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
  return btoa(bin);
}

async function gunzip(b64: string): Promise<string> {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
  return new Response(stream).text();
}

export async function encodeState(state: GameState, now: number): Promise<SaveEnvelope> {
  const json = JSON.stringify(state);
  return { saveVersion: SAVE_VERSION, savedAt: now, revision: state.meta.revision, checksum: checksum(json), payload: await gzip(json) };
}

export async function decodeEnvelope(env: SaveEnvelope): Promise<GameState> {
  const json = await gunzip(env.payload);
  if (checksum(json) !== env.checksum) throw new Error('Save corrompido (checksum inválido).');
  const raw = JSON.parse(json);
  return migrate(raw);
}

const SLOTS = ['main', 'backup-1', 'backup-2'];

/** Salva no slot principal; a cada chamada com `rotate`, o principal anterior vira backup. */
export async function saveGame(repo: SaveRepository, state: GameState, now: number, rotate = false): Promise<void> {
  state.meta.lastSavedAt = now;
  const env = await encodeState(state, now);
  if (rotate) {
    const b1 = await repo.load('backup-1');
    if (b1) await repo.save('backup-2', b1);
    const main = await repo.load('main');
    if (main) await repo.save('backup-1', main);
  }
  await repo.save('main', env);
}

/** Carrega o save principal; se estiver corrompido, tenta os backups em ordem. */
export async function loadGame(repo: SaveRepository): Promise<{ state: GameState; slot: string } | null> {
  for (const slot of SLOTS) {
    const env = await repo.load(slot);
    if (!env) continue;
    try {
      return { state: await decodeEnvelope(env), slot };
    } catch (e) {
      console.warn(`Falha ao carregar ${slot}:`, e);
    }
  }
  return null;
}

/** Copia os slots existentes para `quarantine-<ts>-<slot>` e os remove. Retorna true se havia algum save. */
export async function quarantineSaves(repo: SaveRepository, now: number): Promise<boolean> {
  let found = false;
  for (const slot of SLOTS) {
    const env = await repo.load(slot);
    if (!env) continue;
    found = true;
    await repo.save(`quarantine-${now}-${slot}`, env);
    await repo.remove(slot);
  }
  return found;
}

export async function exportSave(state: GameState, now: number): Promise<string> {
  return btoa(JSON.stringify(await encodeState(state, now)));
}

export async function importSave(text: string): Promise<GameState> {
  const env = JSON.parse(atob(text.trim())) as SaveEnvelope;
  return decodeEnvelope(env);
}

export async function wipeSaves(repo: SaveRepository): Promise<void> {
  for (const s of SLOTS) await repo.remove(s);
}
