'use client';

import { useState } from 'react';
import type { ChildProfile, Pronouns } from '@/lib/types';
import { uid } from '@/lib/store';
import { AGE_OPTIONS, AVOIDS, LAUGHS, LOVES, PERSONALITY } from '@/app/(app)/create/options';
import { HAIR_COLOURS, HAIR_STYLES, SKIN_TONES, type HeroLook } from '@/lib/heroLook';
import { HeroPreview } from './HeroPreview';
import styles from './ChildForm.module.css';

const KINDS = ['pet', 'friend', 'sibling', 'toy', 'grown-up'];

export function blankChild(): ChildProfile {
  return { id: uid(), name: '', ageBand: '4–5', pronouns: 'they', loves: [], companions: [], avoid: [], createdAt: Date.now() };
}

export function ChildForm({
  initial,
  onSave,
  saveLabel = 'Save',
  compact = false,
}: {
  initial: ChildProfile;
  onSave: (child: ChildProfile) => void;
  saveLabel?: string;
  compact?: boolean;
}) {
  const [c, setC] = useState(initial);
  const [extraLove, setExtraLove] = useState('');
  const [companion, setCompanion] = useState({ name: '', kind: 'pet', note: '' });
  const set = (patch: Partial<ChildProfile>) => setC((x) => ({ ...x, ...patch }));
  const toggle = (key: 'loves' | 'avoid' | 'personality' | 'laughs', v: string, max = 8) => {
    const cur = c[key] ?? [];
    set({ [key]: cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v].slice(-max) } as Partial<ChildProfile>);
  };

  const loves = Array.from(new Set([...LOVES, ...c.loves]));

  return (
    <form
      className={styles.form}
      onSubmit={(e) => {
        e.preventDefault();
        if (c.name.trim()) onSave({ ...c, name: c.name.trim() });
      }}
    >
      <label className={styles.field}>
        <span>Their first name or nickname</span>
        <input
          className={styles.input}
          value={c.name}
          maxLength={24}
          autoComplete="off"
          placeholder="e.g. Isla"
          onChange={(e) => set({ name: e.target.value })}
          required
        />
      </label>

      <fieldset className={styles.field}>
        <legend>Story level</legend>
        <div className={styles.pills}>
          {AGE_OPTIONS.map((a) => (
            <button type="button" key={a.value} aria-pressed={c.ageBand === a.value} onClick={() => set({ ageBand: a.value })}>
              {a.label}
            </button>
          ))}
        </div>
        <small>Pick what suits them. It doesn’t have to match their age.</small>
      </fieldset>

      <fieldset className={styles.field}>
        <legend>In stories, call them</legend>
        <div className={styles.pills}>
          {(
            [
              ['she', 'she / her'],
              ['he', 'he / him'],
              ['they', 'they / them'],
            ] as [Pronouns, string][]
          ).map(([v, label]) => (
            <button type="button" key={v} aria-pressed={c.pronouns === v} onClick={() => set({ pronouns: v })}>
              {label}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className={styles.field}>
        <legend>What are they into right now?</legend>
        <div className={styles.pills}>
          {loves.map((l) => (
            <button type="button" key={l} aria-pressed={c.loves.includes(l)} onClick={() => toggle('loves', l)}>
              {l}
            </button>
          ))}
        </div>
        <div className={styles.addRow}>
          <input
            className={styles.input}
            value={extraLove}
            maxLength={30}
            placeholder="Add your own…"
            onChange={(e) => setExtraLove(e.target.value)}
          />
          <button
            type="button"
            className={styles.add}
            onClick={() => {
              const v = extraLove.trim();
              if (v && !c.loves.includes(v)) set({ loves: [...c.loves, v].slice(0, 8) });
              setExtraLove('');
            }}
          >
            Add
          </button>
        </div>
      </fieldset>

      {!compact && (
        <>
          <ProfileExtras child={c} toggle={toggle} set={set} />

          <fieldset className={styles.field}>
            <legend>Who can join the adventure?</legend>
            <small>Pets, friends, siblings or a favourite toy. First names only.</small>
            {c.companions.length > 0 && (
              <div className={styles.pills}>
                {c.companions.map((x, i) => (
                  <button
                    type="button"
                    key={x.name + i}
                    aria-pressed
                    aria-label={`Remove ${x.name}`}
                    onClick={() => set({ companions: c.companions.filter((_, j) => j !== i) })}
                  >
                    {x.name} · {x.kind}
                    {x.note ? ` · ${x.note}` : ''} ×
                  </button>
                ))}
              </div>
            )}
            <div className={styles.addRow}>
              <input
                className={styles.input}
                value={companion.name}
                maxLength={20}
                placeholder="e.g. Biscuit"
                onChange={(e) => setCompanion({ ...companion, name: e.target.value })}
              />
              <select className={styles.input} value={companion.kind} onChange={(e) => setCompanion({ ...companion, kind: e.target.value })}>
                {KINDS.map((k) => (
                  <option key={k}>{k}</option>
                ))}
              </select>
            </div>
            <div className={styles.addRow}>
              <input
                className={styles.input}
                value={companion.note}
                maxLength={60}
                placeholder="Something fun about them (optional), e.g. hides socks"
                onChange={(e) => setCompanion({ ...companion, note: e.target.value })}
              />
              <button
                type="button"
                className={styles.add}
                onClick={() => {
                  const name = companion.name.trim().split(/\s+/)[0];
                  if (name) set({ companions: [...c.companions, { name, kind: companion.kind, note: companion.note.trim() }].slice(0, 4) });
                  setCompanion({ name: '', kind: companion.kind, note: '' });
                }}
              >
                Add
              </button>
            </div>
          </fieldset>

          <LookPicker child={c} set={set} />

          <fieldset className={styles.field}>
            <legend>Keep out of their stories</legend>
            <div className={styles.pills}>
              {Array.from(new Set([...AVOIDS, ...c.avoid])).map((a) => (
                <button type="button" key={a} aria-pressed={c.avoid.includes(a)} onClick={() => toggle('avoid', a)}>
                  {a}
                </button>
              ))}
            </div>
          </fieldset>
        </>
      )}

      <p className={styles.privacy}>
        A first name is all a story needs. Please don’t add surnames, schools or addresses.
      </p>

      <button className="btn btn-primary btn-block" disabled={!c.name.trim()}>
        {saveLabel}
      </button>
    </form>
  );
}

/** Personality, humour, comfort toy and current challenge. Shared with the create flow's quick questions. */
export function ProfileExtras({
  child,
  toggle,
  set,
  only,
}: {
  child: ChildProfile;
  toggle: (key: 'personality' | 'laughs', v: string, max?: number) => void;
  set: (patch: Partial<ChildProfile>) => void;
  only?: 'personality' | 'laughs' | 'comfort' | 'learning';
}) {
  const show = (k: typeof only) => !only || only === k;
  return (
    <>
      {show('personality') && (
        <fieldset className={styles.field}>
          <legend>Which words sound like {child.name || 'them'}?</legend>
          <small>Pick up to three. The hero will sound and act like them.</small>
          <div className={styles.pills}>
            {PERSONALITY.map((p) => (
              <button type="button" key={p} aria-pressed={(child.personality ?? []).includes(p)} onClick={() => toggle('personality', p, 3)}>
                {p}
              </button>
            ))}
          </div>
        </fieldset>
      )}
      {show('laughs') && (
        <fieldset className={styles.field}>
          <legend>What makes {child.name || 'them'} laugh?</legend>
          <div className={styles.pills}>
            {LAUGHS.map((p) => (
              <button type="button" key={p} aria-pressed={(child.laughs ?? []).includes(p)} onClick={() => toggle('laughs', p, 3)}>
                {p}
              </button>
            ))}
          </div>
        </fieldset>
      )}
      {show('comfort') && (
        <label className={styles.field}>
          <span>Favourite bedtime toy (optional)</span>
          <input
            className={styles.input}
            value={child.comfort ?? ''}
            maxLength={50}
            placeholder="e.g. Bun, a floppy grey rabbit"
            onChange={(e) => set({ comfort: e.target.value })}
          />
        </label>
      )}
      {show('learning') && (
        <label className={styles.field}>
          <span>Anything they’re working on at the moment? (optional)</span>
          <input
            className={styles.input}
            value={child.learning ?? ''}
            maxLength={70}
            placeholder="e.g. riding without stabilisers, sharing, swimming"
            onChange={(e) => set({ learning: e.target.value })}
          />
          <small>Sometimes woven in gently. Never as a lesson.</small>
        </label>
      )}
    </>
  );
}

export const DEFAULT_LOOK: HeroLook = { skin: 's3', hair: 'brown', style: 'short', glasses: false, freckles: false };

/** Optional: how they look in illustrated stories. Swatches, never photos. */
export function LookPicker({ child, set, legend = 'How they look in pictures (optional)' }: { child: ChildProfile; set: (patch: Partial<ChildProfile>) => void; legend?: string }) {
  const look = child.look;
  const patch = (p: Partial<HeroLook>) => set({ look: { ...(look ?? DEFAULT_LOOK), ...p } });
  return (
    <fieldset className={styles.field}>
      <legend>{legend}</legend>
      <small>So {child.name || 'they'} can star in the pictures of their own stories, looking the same every night. No photos, ever.</small>
      {!look ? (
        <button type="button" className={styles.add} onClick={() => set({ look: DEFAULT_LOOK })}>
          Choose their look
        </button>
      ) : (
        <div className={styles.look}>
          <span className={styles.lookLabel}>Skin</span>
          <div className={styles.swatches}>
            {SKIN_TONES.map((s) => (
              <button
                type="button"
                key={s.id}
                aria-label={s.label}
                aria-pressed={look.skin === s.id}
                style={{ background: s.swatch }}
                onClick={() => patch({ skin: s.id })}
              />
            ))}
          </div>
          <span className={styles.lookLabel}>Hair colour</span>
          <div className={styles.swatches}>
            {HAIR_COLOURS.map((h) => (
              <button
                type="button"
                key={h.id}
                aria-label={h.label}
                aria-pressed={look.hair === h.id}
                style={{ background: h.swatch }}
                onClick={() => patch({ hair: h.id })}
              />
            ))}
          </div>
          <span className={styles.lookLabel}>Hair style</span>
          <div className={styles.pills}>
            {HAIR_STYLES.map((h) => (
              <button type="button" key={h.id} aria-pressed={look.style === h.id} onClick={() => patch({ style: h.id })}>
                {h.label}
              </button>
            ))}
          </div>
          <div className={styles.pills}>
            <button type="button" aria-pressed={look.glasses} onClick={() => patch({ glasses: !look.glasses })}>
              Glasses
            </button>
            <button type="button" aria-pressed={look.freckles} onClick={() => patch({ freckles: !look.freckles })}>
              Freckles
            </button>
          </div>
          <HeroPreview child={child} />
          <button type="button" className={styles.clear} onClick={() => set({ look: undefined })}>
            Clear look
          </button>
        </div>
      )}
    </fieldset>
  );
}
