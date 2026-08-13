-- chat_sessions and chat_messages already created by Prisma migration.
-- RLS policies already applied in 002_rls_policies.sql.
-- This migration only adds lookup indexes that were missing.

create index if not exists chat_sessions_user_id_idx
  on public.chat_sessions(user_id);

create index if not exists chat_messages_session_id_idx
  on public.chat_messages(session_id, created_at);
