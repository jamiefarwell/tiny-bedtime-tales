// npm run test:db — runs supabase/migrations against in-memory Postgres (PGlite) with a
// stub of Supabase's auth schema, then exercises the token wallet functions.
import { PGlite } from '@electric-sql/pglite';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const dir = process.argv[2] || fileURLToPath(new URL('../migrations', import.meta.url));
const db = new PGlite();

await db.exec(`
  create role anon; create role authenticated;
  create schema auth;
  create table auth.users (id uuid primary key default gen_random_uuid(), email text);
  create function auth.uid() returns uuid language sql as $$ select null::uuid $$;
  create function auth.role() returns text language sql as $$ select 'service_role'::text $$;
`);
for (const f of readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()) {
  try {
    await db.exec(readFileSync(join(dir, f), 'utf8').replace(/create extension if not exists pgcrypto;/i, ''));
    console.log('applied', f);
  } catch (e) {
    console.error('FAILED', f, e.message);
    process.exit(1);
  }
}

const one = async (sql, params) => (await db.query(sql, params)).rows[0];
const wallet = (u) => one('select plan_tokens, extra_tokens from wallets where user_id = $1', [u]);
const spend = (u, story, redo = null) => one('select * from spend_story_token($1, $2, $3)', [u, story, redo]);

const { id: u } = await one(`insert into auth.users (email) values ('parent@example.test') returning id`);

// 1. Welcome token.
assert.deepEqual(await wallet(u), { plan_tokens: 0, extra_tokens: 1 });

// 2. Spend it, then run out.
assert.equal((await spend(u, 's1')).bucket, 'extra');
assert.deepEqual(await wallet(u), { plan_tokens: 0, extra_tokens: 0 });
await assert.rejects(spend(u, 's2'), /no_tokens/);

// 3. Refund once only.
await db.query('select refund_story_token($1, $2)', [u, 's1']);
await db.query('select refund_story_token($1, $2)', [u, 's1']);
assert.deepEqual(await wallet(u), { plan_tokens: 0, extra_tokens: 1 });

// 4. Packs are granted exactly once per checkout session.
await db.query('select grant_pack_tokens($1, 3, $2)', [u, 'cs_test_1']);
await db.query('select grant_pack_tokens($1, 3, $2)', [u, 'cs_test_1']);
assert.deepEqual(await wallet(u), { plan_tokens: 0, extra_tokens: 4 });

// 5. Subscription starts: first refill immediately, then monthly.
await db.query(`update wallets set plan_code='family', plan_status='active', tokens_per_month=4, rollover_cap=8, next_refill_at=now() where user_id=$1`, [u]);
await db.query('select refill_wallet($1)', [u]);
await db.query('select refill_wallet($1)', [u]); // nothing more due
assert.deepEqual(await wallet(u), { plan_tokens: 4, extra_tokens: 4 });

// 6. Plan tokens are spent before bought ones.
assert.equal((await spend(u, 's3')).bucket, 'plan');
assert.deepEqual(await wallet(u), { plan_tokens: 3, extra_tokens: 4 });

// 7. Free redo: once, within 24h, for a story that was paid for.
assert.equal((await spend(u, 's4', 's3')).bucket, 'free');
assert.deepEqual(await wallet(u), { plan_tokens: 3, extra_tokens: 4 });
assert.equal((await spend(u, 's5', 's3')).bucket, 'plan'); // second redo of s3 is charged
assert.deepEqual(await wallet(u), { plan_tokens: 2, extra_tokens: 4 });

// 8. Missed months catch up, but rollover is capped.
await db.query(`update wallets set next_refill_at = now() - interval '75 days' where user_id=$1`, [u]);
await db.query('select refill_wallet($1)', [u]);
assert.deepEqual(await wallet(u), { plan_tokens: 8, extra_tokens: 4 });
const next = await one('select next_refill_at > now() as future from wallets where user_id=$1', [u]);
assert.equal(next.future, true);

// 9. Paused when payment fails: no refills while past_due.
await db.query(`update wallets set plan_status='past_due', plan_tokens=0, next_refill_at=now() - interval '1 day' where user_id=$1`, [u]);
await db.query('select refill_wallet($1)', [u]);
assert.deepEqual(await wallet(u), { plan_tokens: 0, extra_tokens: 4 });

// 10. Ledger adds up to the wallet.
const sum = await one('select coalesce(sum(delta),0)::int as total from token_ledger where user_id=$1', [u]);
const w = await wallet(u);
// past_due test zeroed plan tokens by hand (8 → 0), so account for that adjustment.
assert.equal(sum.total - 8, w.plan_tokens + w.extra_tokens);

console.log('all wallet checks passed');
