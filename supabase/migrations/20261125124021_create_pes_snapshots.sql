create table public.pes_snapshots (
  report_date date not null,
  report_time time(0) without time zone not null,
  saved_at timestamp with time zone not null default now(),
  snapshot jsonb not null,
  primary key (report_date, report_time),
  constraint pes_snapshot_matches_report check (
    jsonb_typeof(snapshot) = 'object'
    and snapshot ? 'date'
    and snapshot ? 'time'
    and (snapshot->>'date')::date is not distinct from report_date
    and (snapshot->>'time')::time is not distinct from report_time
  )
);

alter table public.pes_snapshots enable row level security;
revoke all on public.pes_snapshots from public, anon, authenticated, service_role;
grant select, insert, update on public.pes_snapshots to service_role;

create function public.save_pes_snapshot(input_snapshot jsonb)
returns jsonb
language sql
volatile
security invoker
set search_path = ''
as $$
  with saved as (
    insert into public.pes_snapshots (report_date, report_time, snapshot)
    values ((input_snapshot->>'date')::date, (input_snapshot->>'time')::time, input_snapshot)
    on conflict (report_date, report_time) do update set
      saved_at = excluded.saved_at,
      snapshot = excluded.snapshot
    returning snapshot
  )
  select snapshot from saved;
$$;

revoke all on function public.save_pes_snapshot(jsonb) from public, anon, authenticated, service_role;
grant execute on function public.save_pes_snapshot(jsonb) to service_role;
