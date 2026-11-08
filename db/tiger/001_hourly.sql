-- Apply through scripts/tiger_import.py. __SCHEMA__ is a validated identifier.
-- TimescaleDB >=2.13. No joins or timezone expressions inside the continuous aggregate.
CREATE SCHEMA IF NOT EXISTS __SCHEMA__;
CREATE TABLE IF NOT EXISTS __SCHEMA__.dataset_state (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  schema_version integer NOT NULL,
  source_version text NOT NULL,
  manifest_sha256 text NOT NULL,
  machine_hour_sha256 text NOT NULL,
  expected_rows bigint NOT NULL,
  imported_rows bigint NOT NULL DEFAULT 0,
  verified boolean NOT NULL DEFAULT false,
  verified_at timestamptz,
  source_checks jsonb NOT NULL DEFAULT '{}'
);
CREATE TABLE IF NOT EXISTS __SCHEMA__.machine_hour (
  machine_id text NOT NULL,
  hour_start_utc timestamptz NOT NULL,
  hour_start_local timestamp NOT NULL,
  local_hour smallint NOT NULL CHECK (local_hour BETWEEN 0 AND 23),
  utc_offset text NOT NULL,
  gaming_date date NOT NULL,
  location_id text,
  active boolean NOT NULL,
  available_seconds bigint NOT NULL CHECK (available_seconds BETWEEN 0 AND 3600),
  occupied_seconds bigint NOT NULL CHECK (occupied_seconds BETWEEN 0 AND available_seconds),
  paid_spins bigint NOT NULL,
  payout_positive_spins bigint NOT NULL,
  coin_in_cents bigint NOT NULL,
  payout_cents bigint NOT NULL,
  carded_coin_in_cents bigint NOT NULL,
  carded_payout_cents bigint NOT NULL,
  carded_spins bigint NOT NULL,
  placement_id text,
  config_id text,
  configured_rtp numeric(10,8),
  zone_id text,
  bank_id text,
  is_weekend boolean NOT NULL,
  PRIMARY KEY (machine_id, hour_start_utc),
  CHECK (NOT active OR (placement_id IS NOT NULL AND config_id IS NOT NULL AND zone_id IS NOT NULL AND bank_id IS NOT NULL)),
  CHECK (configured_rtp IS NULL OR configured_rtp BETWEEN 0 AND 1)
);
SELECT create_hypertable('__SCHEMA__.machine_hour', by_range('hour_start_utc', INTERVAL '7 days'), if_not_exists => true);
CREATE INDEX IF NOT EXISTS hour_zone_time ON __SCHEMA__.machine_hour (zone_id, hour_start_utc DESC);
CREATE INDEX IF NOT EXISTS hour_bank_time ON __SCHEMA__.machine_hour (bank_id, hour_start_utc DESC);

-- Bank/hour compaction supports repeated zone/bank heatmaps. Individual machine
-- profiles deliberately use the indexed raw hypertable, not a redundant CAGG.
CREATE MATERIALIZED VIEW IF NOT EXISTS __SCHEMA__.bank_hourly
WITH (timescaledb.continuous, timescaledb.materialized_only = true) AS
SELECT time_bucket(INTERVAL '1 hour', hour_start_utc) AS bucket_utc,
       gaming_date, zone_id, bank_id, local_hour, is_weekend,
       count(*) AS records,
       sum(available_seconds) AS available_seconds,
       sum(occupied_seconds) AS occupied_seconds,
       sum(coin_in_cents) AS coin_in_cents,
       sum(payout_cents) AS payout_cents,
       sum(coin_in_cents * (1 - configured_rtp)) AS theo_cents
FROM __SCHEMA__.machine_hour
WHERE active
GROUP BY time_bucket(INTERVAL '1 hour', hour_start_utc), gaming_date,
         zone_id, bank_id, local_hour, is_weekend
WITH NO DATA;
CREATE INDEX IF NOT EXISTS bank_hourly_scope ON __SCHEMA__.bank_hourly (zone_id, bank_id, bucket_utc DESC);
-- Immutable historical data: the importer performs an explicit, verified refresh.
-- No recurring refresh job, retention policy, compression or data deletion.
