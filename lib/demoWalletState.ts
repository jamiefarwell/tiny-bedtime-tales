// Shape and starting state of the demo wallet. Kept separate from
// demoWallet.ts so the store can import it without a circular dependency.
import { WELCOME_TOKENS } from './plans';

export interface DemoWallet {
  planTokens: number;
  extraTokens: number;
  plan: null | {
    cycle: 'monthly' | 'yearly';
    status: 'active' | 'canceled';
    startedAt: number;
    nextRefillAt: number;
    renewsAt: number;
    cancelAtPeriodEnd: boolean;
  };
  ledger: { at: number; delta: number; bucket: 'plan' | 'extra'; kind: string; ref: string }[];
}

export const DEMO_WALLET_DEFAULT: DemoWallet = {
  planTokens: 0,
  extraTokens: WELCOME_TOKENS,
  plan: null,
  ledger: [{ at: 0, delta: WELCOME_TOKENS, bucket: 'extra', kind: 'welcome', ref: 'welcome' }],
};
