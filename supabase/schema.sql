-- AI Company OS - Support backend
create extension if not exists pgcrypto;

create table if not exists public.companies (
  id text primary key,
  name text not null,
  status text not null default 'ACTIVE',
  created_at timestamptz not null default now()
);

create table if not exists public.company_users (
  id uuid primary key references auth.users(id) on delete cascade,
  company_id text not null references public.companies(id) on delete restrict,
  full_name text not null,
  role text not null default 'CLIENT_ADMIN',
  created_at timestamptz not null default now()
);

create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  ticket_number bigint generated always as identity unique,
  company_id text not null references public.companies(id) on delete restrict,
  requester_id uuid not null references auth.users(id) on delete restrict,
  subject text not null,
  description text not null,
  category text not null default 'Técnico',
  priority text not null default 'Normal' check (priority in ('Normal','Alta','Crítica')),
  status text not null default 'NOVO' check (status in ('NOVO','EM ATENDIMENTO','AGUARDANDO CLIENTE','AGUARDANDO AI','RESOLVIDO','FECHADO')),
  sla_hours integer not null default 24,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table if not exists public.support_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete restrict,
  message text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.support_attachments (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets(id) on delete cascade,
  uploaded_by uuid not null references auth.users(id) on delete restrict,
  file_name text not null,
  storage_path text not null,
  mime_type text,
  size_bytes bigint,
  created_at timestamptz not null default now()
);

alter table public.companies enable row level security;
alter table public.company_users enable row level security;
alter table public.support_tickets enable row level security;
alter table public.support_messages enable row level security;
alter table public.support_attachments enable row level security;

create or replace function public.is_company_member(target_company text)
returns boolean language sql stable security definer set search_path = public
as $$ select exists(select 1 from public.company_users where id = auth.uid() and company_id = target_company); $$;

create policy "company members read own company" on public.companies
for select using (public.is_company_member(id));

create policy "users read own membership" on public.company_users
for select using (id = auth.uid());

create policy "company members read tickets" on public.support_tickets
for select using (public.is_company_member(company_id));

create policy "company members create tickets" on public.support_tickets
for insert with check (requester_id = auth.uid() and public.is_company_member(company_id));

create policy "company members update own tickets" on public.support_tickets
for update using (public.is_company_member(company_id));

create policy "ticket participants read messages" on public.support_messages
for select using (exists(select 1 from public.support_tickets t where t.id=ticket_id and public.is_company_member(t.company_id)));

create policy "ticket participants create messages" on public.support_messages
for insert with check (author_id=auth.uid() and exists(select 1 from public.support_tickets t where t.id=ticket_id and public.is_company_member(t.company_id)));

create policy "ticket participants read attachments" on public.support_attachments
for select using (exists(select 1 from public.support_tickets t where t.id=ticket_id and public.is_company_member(t.company_id)));

create policy "ticket participants create attachments" on public.support_attachments
for insert with check (uploaded_by=auth.uid() and exists(select 1 from public.support_tickets t where t.id=ticket_id and public.is_company_member(t.company_id)));

insert into storage.buckets (id, name, public) values ('support-attachments','support-attachments',false)
on conflict (id) do nothing;

create policy "support files read" on storage.objects for select
using (bucket_id='support-attachments' and auth.uid() is not null);

create policy "support files upload" on storage.objects for insert
with check (bucket_id='support-attachments' and auth.uid() is not null);
