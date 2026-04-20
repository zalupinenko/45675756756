-- Crossflag Crypto Exchange Database Schema
-- D1 SQLite Migration - Initial Setup

-- Table 1: User Balances
CREATE TABLE IF NOT EXISTS user_balances (
  user_id TEXT PRIMARY KEY UNIQUE NOT NULL,
  usdt_trc20_balance INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_user_balances_user_id ON user_balances(user_id);

-- Table 2: Wallet Deposits
CREATE TABLE IF NOT EXISTS wallet_deposits (
  user_id TEXT NOT NULL,
  address TEXT NOT NULL,
  network TEXT NOT NULL,
  asset TEXT NOT NULL,
  amount_dec6 INTEGER NOT NULL,
  tx_hash TEXT UNIQUE NOT NULL,
  ts INTEGER NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_wallet_deposits_tx_hash ON wallet_deposits(tx_hash);
CREATE INDEX IF NOT EXISTS idx_wallet_deposits_user_id ON wallet_deposits(user_id);

-- Table 3: Deposits (with status tracking)
CREATE TABLE IF NOT EXISTS deposits (
  user_id TEXT NOT NULL,
  network TEXT NOT NULL,
  token TEXT NOT NULL,
  to_address TEXT NOT NULL,
  txid TEXT UNIQUE NOT NULL,
  amount_dec6 INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING',
  seen_at INTEGER NOT NULL,
  confirmed_at INTEGER,
  credited_at INTEGER
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_deposits_txid ON deposits(txid);
CREATE INDEX IF NOT EXISTS idx_deposits_user_id ON deposits(user_id);
CREATE INDEX IF NOT EXISTS idx_deposits_status ON deposits(status);

-- Table 4: User Deposit Addresses
CREATE TABLE IF NOT EXISTS user_deposit_addresses (
  user_id TEXT NOT NULL,
  network TEXT NOT NULL,
  asset TEXT NOT NULL,
  address TEXT NOT NULL,
  UNIQUE(user_id, network, asset)
);

CREATE INDEX IF NOT EXISTS idx_user_deposit_addresses_network_asset ON user_deposit_addresses(network, asset);
CREATE INDEX IF NOT EXISTS idx_user_deposit_addresses_user_id ON user_deposit_addresses(user_id);
