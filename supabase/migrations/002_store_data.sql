-- Store data table for cloud sync
CREATE TABLE IF NOT EXISTS store_data (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE store_data ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own store_data" ON store_data FOR ALL USING (true);
