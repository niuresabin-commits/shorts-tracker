-- ============================================================================================
-- INBOX for the "Clip" agent.  Run this ONCE in Supabase: SQL Editor -> New query -> paste -> Run.
--
-- BEFORE you run it:
--   1. Make the agent's own login: Authentication -> Users -> Add user -> Create new user
--      (any email, e.g. clip-agent@example.com, a strong password, tick "Auto Confirm User").
--   2. Change the TWO emails just below (keep the single quotes).
--
-- What it does:
--   * creates a NEW table  public.inbox  (nothing else is created or changed, your data is not touched)
--   * the agent login can only ADD new rows to the inbox for you. It cannot read, change or delete anything.
--   * you (the tracker login) can read your inbox and change only the "status" of an item
--   * (extra safety) the agent login is also locked out of public.docs completely
-- It is safe to run again.  Your tracker keeps working exactly as before whether or not you run it.
-- ============================================================================================

create table if not exists public.inbox (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null references auth.users (id) on delete cascade,
  kind       text        not null check (kind in ('clip', 'views')),
  key        text        not null check (char_length(key) between 1 and 300),   -- dedupe key, unique per user + kind
  payload    jsonb       not null check (jsonb_typeof(payload) = 'object' and octet_length(payload::text) <= 8000),
  created_at timestamptz not null default now(),
  status     text        not null default 'new' check (status in ('new', 'accepted', 'dismissed')),
  unique (user_id, kind, key)
);

create index if not exists inbox_owner_status_idx on public.inbox (user_id, status, created_at);

alter table public.inbox enable row level security;

-- Start from nothing, then give back only what is needed.
revoke all on public.inbox from anon, authenticated;
grant select on public.inbox to authenticated;
grant insert on public.inbox to authenticated;
grant update (status) on public.inbox to authenticated;     -- only the status column can ever be changed

-- You: read your own inbox, change the status of your own items (never delete, never edit the content).
drop policy if exists "owner reads inbox" on public.inbox;
create policy "owner reads inbox" on public.inbox
  for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "owner sets inbox status" on public.inbox;
create policy "owner sets inbox status" on public.inbox
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- The agent: INSERT only, only for you, only as a "new" item.  (No read, no update, no delete.)
do $$
declare
  owner_email text := 'YOUR-TRACKER-EMAIL';      -- <-- the email you sign in to the tracker with
  agent_email text := 'CLIP-AGENT-EMAIL';        -- <-- the email of the agent login you made in step 1
  me uuid;
  ag uuid;
begin
  select id into me from auth.users where email = owner_email;
  select id into ag from auth.users where email = agent_email;
  if me is null then raise exception 'Could not find the tracker email "%". Check the spelling.', owner_email; end if;
  if ag is null then raise exception 'Could not find the agent email "%". Make the agent login first (step 1) and check the spelling.', agent_email; end if;
  if me = ag then raise exception 'The agent must be a different login from your own.'; end if;

  drop policy if exists "agent adds to inbox" on public.inbox;
  execute format(
    'create policy "agent adds to inbox" on public.inbox for insert to authenticated '
    || 'with check (auth.uid() = %L::uuid and user_id = %L::uuid and status = ''new'')', ag, me);

  -- so the agent does not even have to send user_id: new rows default to you
  execute format('alter table public.inbox alter column user_id set default %L::uuid', me);

  -- extra safety: this one login can never read or write public.docs (your tracker data), not even its own rows.
  -- Everyone else is unaffected.  (Undo any time:  drop policy "agent never touches docs" on public.docs;)
  if to_regclass('public.docs') is not null then
    execute 'drop policy if exists "agent never touches docs" on public.docs';
    execute format(
      'create policy "agent never touches docs" on public.docs as restrictive for all to authenticated '
      || 'using (auth.uid() <> %L::uuid) with check (auth.uid() <> %L::uuid)', ag, ag);
  end if;
end $$;
