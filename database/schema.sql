-- Konta adminów (NAJPIERW!)
CREATE TABLE admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Filmy przesłane przez użytkowników
CREATE TABLE submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tiktok_url TEXT NOT NULL,
  submitter_nickname TEXT NOT NULL,
  short_code TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'approved' | 'rejected'
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES admins(id)
);

-- Partnerstwa
CREATE TABLE partnerships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_name TEXT NOT NULL,
  contact TEXT NOT NULL,
  status TEXT DEFAULT 'pending', -- 'pending' | 'active' | 'done'
  promo_link TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  next_video_id UUID REFERENCES submissions(id)
);

-- Indeksy dla szybszych zapytań
CREATE INDEX idx_submissions_status ON submissions(status);
CREATE INDEX idx_submissions_short_code ON submissions(short_code);
CREATE INDEX idx_submissions_submitted_at ON submissions(submitted_at DESC);
CREATE INDEX idx_admins_username ON admins(username);
