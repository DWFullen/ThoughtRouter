CREATE TABLE IF NOT EXISTS captures (
  id varchar(64) PRIMARY KEY,
  user_id varchar(64) NOT NULL,
  channel varchar(32) NOT NULL,
  raw_text text NOT NULL,
  captured_at timestamptz NOT NULL,
  processing_status varchar(16) NOT NULL,
  source_message_id varchar(128),
  idempotency_key varchar(512) NOT NULL,
  error_state text
);

CREATE UNIQUE INDEX IF NOT EXISTS captures_user_id_idempotency_key_idx ON captures(user_id, idempotency_key);

CREATE TABLE IF NOT EXISTS candidates (
  id varchar(64) PRIMARY KEY,
  captured_message_id varchar(64) NOT NULL,
  payload jsonb NOT NULL
);

CREATE TABLE IF NOT EXISTS work_items (
  id varchar(64) PRIMARY KEY,
  captured_message_id varchar(64) NOT NULL,
  candidate_item_id varchar(64) NOT NULL,
  payload jsonb NOT NULL
);

CREATE TABLE IF NOT EXISTS sync_records (
  local_work_item_id varchar(64) PRIMARY KEY,
  payload jsonb NOT NULL
);
