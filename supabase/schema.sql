create table if not exists public.kv_store_1d20ed4b (
  key text primary key,
  value jsonb not null
);

alter table public.kv_store_1d20ed4b enable row level security;

drop policy if exists "deny_all_kv_store" on public.kv_store_1d20ed4b;
create policy "deny_all_kv_store"
on public.kv_store_1d20ed4b
as permissive
for all
to public
using (false)
with check (false);
