/*
# Create chat_messages table for Live Chat feature

1. New Tables
- `chat_messages`
  - `id` (uuid, primary key)
  - `user_identifier` (text, not null) — passport/passport-like key used to scope a user's conversation
  - `country` (text) — country context for the message (from Column B)
  - `sender` (text, not null) — 'user' or 'admin'
  - `message` (text, not null) — message body
  - `is_read` (boolean, default false) — whether the recipient has seen it
  - `created_at` (timestamptz, default now())

2. Security
- Enable RLS on `chat_messages`.
- Allow anon + authenticated full CRUD so the no-auth dashboard client can read/write its own conversation.
- Data is intentionally shared between the browser client and the admin dashboard.
*/

CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_identifier text NOT NULL,
  country text,
  sender text NOT NULL DEFAULT 'user',
  message text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_chat_messages" ON chat_messages;
CREATE POLICY "anon_select_chat_messages"
ON chat_messages FOR SELECT
TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_chat_messages" ON chat_messages;
CREATE POLICY "anon_insert_chat_messages"
ON chat_messages FOR INSERT
TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_chat_messages" ON chat_messages;
CREATE POLICY "anon_update_chat_messages"
ON chat_messages FOR UPDATE
TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_chat_messages" ON chat_messages;
CREATE POLICY "anon_delete_chat_messages"
ON chat_messages FOR DELETE
TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_chat_messages_user_identifier ON chat_messages(user_identifier);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at);
