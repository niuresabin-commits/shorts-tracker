-- Run this once in Supabase: SQL Editor -> New query -> paste -> Run.
-- One table holds all of your tracker data. Row-level security makes every row
-- readable and writable only by the signed-in user who owns it.

create table if not exists public.docs (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id      text not null,
  data    jsonb not null,
  u       bigint not null default 0,
  primary key (user_id, id)
);

alter table public.docs enable row level security;

drop policy if exists "own rows" on public.docs;
create policy "own rows" on public.docs
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
