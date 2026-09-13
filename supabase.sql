-- =====================================================================
--  MAISON VERMEIL — Base de données Supabase (comptes + commandes)
--  À coller en entier dans Supabase : SQL Editor → New query → Run
-- =====================================================================

-- ===== PROFILS CLIENTS =====
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  pseudo text not null check (pseudo ~ '^[A-Za-z0-9_.-]{3,20}$'),
  email text not null,
  phone text not null check (char_length(phone) between 10 and 20),
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);
-- Pseudo unique, sans tenir compte des majuscules
create unique index profiles_pseudo_key on public.profiles (lower(pseudo));

-- ===== COMMANDES =====
create table public.orders (
  id bigint generated always as identity primary key,
  order_number text not null unique,
  user_id uuid references auth.users (id) on delete set null, -- null = commande sans compte
  customer_name text not null check (char_length(customer_name) between 1 and 100),
  email text not null check (char_length(email) <= 150),
  phone text not null check (char_length(phone) <= 20),
  pickup_date date not null,
  pickup_slot text not null check (char_length(pickup_slot) <= 30),
  notes text check (char_length(notes) <= 1000),
  items jsonb not null check (jsonb_typeof(items) = 'array' and jsonb_array_length(items) between 1 and 50),
  total numeric(10, 2) not null check (total >= 0),
  created_at timestamptz not null default now()
);
create index orders_pickup_date_idx on public.orders (pickup_date);
create index orders_user_id_idx on public.orders (user_id);

-- ===== FONCTIONS =====
-- Vrai si l'utilisateur connecté est admin
create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;

-- Crée le profil automatiquement à l'inscription (pseudo + téléphone envoyés par le site)
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, pseudo, email, phone)
  values (new.id, new.raw_user_meta_data ->> 'pseudo', new.email, new.raw_user_meta_data ->> 'phone');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Connexion par pseudo : renvoie l'e-mail UNIQUEMENT si le mot de passe est bon
-- (personne ne peut récupérer l'e-mail d'un client à partir de son pseudo)
create or replace function public.email_for_login(p_identifier text, p_password text)
returns text
language plpgsql stable security definer set search_path = public, extensions
as $$
declare
  found_email text;
begin
  select u.email into found_email
  from public.profiles p
  join auth.users u on u.id = p.id
  where lower(p.pseudo) = lower(trim(p_identifier))
    and u.encrypted_password = extensions.crypt(p_password, u.encrypted_password);
  return found_email;
end;
$$;

-- Vérifie qu'un pseudo est libre avant l'inscription
create or replace function public.pseudo_available(p_pseudo text)
returns boolean
language sql stable security definer set search_path = public
as $$
  select not exists (select 1 from public.profiles where lower(pseudo) = lower(trim(p_pseudo)));
$$;

grant execute on function public.email_for_login(text, text) to anon, authenticated;
grant execute on function public.pseudo_available(text) to anon, authenticated;

-- ===== SÉCURITÉ (Row Level Security) =====
alter table public.profiles enable row level security;
alter table public.orders enable row level security;

grant usage on schema public to anon, authenticated;
grant select on public.profiles to authenticated;
grant select on public.orders to authenticated;
grant insert on public.orders to anon, authenticated;

-- Un client voit son profil ; l'admin voit tous les profils
create policy "profils_lecture" on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_admin());

-- Tout le monde peut commander (avec ou sans compte),
-- mais on ne peut pas rattacher une commande au compte de quelqu'un d'autre
create policy "commandes_creation" on public.orders
  for insert to anon, authenticated
  with check (user_id is null or user_id = auth.uid());

-- Un client voit ses commandes ; l'admin voit toutes les commandes
create policy "commandes_lecture" on public.orders
  for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- =====================================================================
--  COMPTE ADMIN : crée d'abord ton compte sur le site, puis exécute
--  cette ligne en remplaçant TON_PSEUDO :
--
--  update public.profiles set is_admin = true where lower(pseudo) = lower('TON_PSEUDO');
-- =====================================================================
