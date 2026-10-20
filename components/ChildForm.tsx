'use client';

import { useState } from 'react';
import type { ChildProfile, Pronouns } from '@/lib/types';
import { uid } from '@/lib/store';
import { AGE_OPTIONS, AVOIDS, LOVES } from '@/app/(app)/create/options';
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
  const [companion, setCompanion] = useState({ name: '', kind: 'pet' });
  const set = (patch: Partial<ChildProfile>) => setC((x) => ({ ...x, ...patch }));
  const toggle = (key: 'loves' | 'avoid', v: string) =>
    set({ [key]: c[key].includes(v) ? c[key].filter((x) => x !== v) : [...c[key], v].slice(0, 8) } as Partial<ChildProfile>);

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
                    {x.name} · {x.kind} ×
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
              <button
                type="button"
                className={styles.add}
                onClick={() => {
                  const name = companion.name.trim().split(/\s+/)[0];
                  if (name) set({ companions: [...c.companions, { name, kind: companion.kind }].slice(0, 4) });
                  setCompanion({ name: '', kind: companion.kind });
                }}
              >
                Add
              </button>
            </div>
          </fieldset>

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
