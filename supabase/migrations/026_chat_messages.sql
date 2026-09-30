-- 026_chat_messages.sql
-- Chatbot « Une question ? » (accompagnement DiagAssist, espace pro, guide).
-- Chaque échange est journalisé : sert à limiter l'usage par utilisateur
-- (quota quotidien vérifié par /api/chat) et permet à l'admin de relire les
-- conversations pour améliorer les réponses.

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null check (char_length(content) <= 8000),
  page text,
  created_at timestamptz not null default now()
);

create index if not exists chat_messages_user_created_idx
  on public.chat_messages (user_id, created_at desc);

alter table public.chat_messages enable row level security;

drop policy if exists chat_messages_own_select on public.chat_messages;
create policy chat_messages_own_select on public.chat_messages
  for select to authenticated using (user_id = auth.uid());

drop policy if exists chat_messages_own_insert on public.chat_messages;
create policy chat_messages_own_insert on public.chat_messages
  for insert to authenticated with check (user_id = auth.uid() and public.has_assistant_access());

drop policy if exists chat_messages_admin_all on public.chat_messages;
create policy chat_messages_admin_all on public.chat_messages
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
