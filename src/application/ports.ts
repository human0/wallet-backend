import type { Wallet } from '../domain/wallet.js';

export interface WalletReader {
  findById(walletId: string): Wallet | undefined;
}

export interface WalletRepository extends WalletReader {
  save(wallet: Wallet): void;
}

export type WithdrawalEvent = {
  id: string;
  walletId: string;
  amountMinor: number;
  currency: 'ZAR';
  occurredAt: Date;
};

export interface WithdrawalEventRepository {
  append(event: WithdrawalEvent): void;
}

export interface TransactionRunner {
  run<T>(operation: () => T): T;
}

export type EventIdGenerator = () => string;
export type Clock = () => Date;
