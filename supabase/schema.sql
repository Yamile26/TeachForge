create extension if not exists pgcrypto;

create table if not exists cases (
    id uuid primary key default gen_random_uuid(),
    created_at timestamptz default now(),
    author_alias text not null,
    years_experience int,
    subject text not null,
    level text not null,
    topic text not null,
    raw_story text not null,
    structured jsonb not null,
    tags text[] default '{}',
    validated_by_author boolean default false,
    is_seed boolean default false,
    consent_at timestamptz
);

create table if not exists attempts (
    id uuid primary key default gen_random_uuid(),
    created_at timestamptz default now(),
    case_id uuid references cases(id) on delete cascade,
    learner_alias text not null,
    transcript jsonb not null,
    hidden_states jsonb,
    tokens_in int,
    tokens_out int,
    cost_usd numeric
);

create table if not exists evaluations (
    id uuid primary key default gen_random_uuid(),
    created_at timestamptz default now(),
    attempt_id uuid references attempts(id) on delete cascade,
    scores jsonb not null,
    summary text,
    next_focus text,
    human_reviewed boolean default false
);

create index if not exists cases_created_at_idx on cases (created_at desc);
create index if not exists cases_is_seed_idx on cases (is_seed);
create index if not exists attempts_alias_idx on attempts (learner_alias);

-- Perfiles de docentes (registro en 4 pasos). El id es el del usuario de Supabase Auth.
create table if not exists profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    created_at timestamptz default now(),
    updated_at timestamptz default now(),
    email text not null,
    institution_email text,
    institutional_email boolean default false,
    email_verified boolean default false,
    first_name text,
    last_name text,
    phone text,
    years_experience int,
    role text check (role in ('veterano', 'novato')),
    status text,
    levels text[] default '{}',
    areas text[] default '{}',
    training_institution text,
    school_name text,
    school_code text,
    school_type text,
    region text,
    ugel text,
    zone text check (zone in ('urbana', 'rural')),
    public_alias text,
    consents_cases boolean default false,
    wants_news boolean default false,
    terms_accepted_at timestamptz
);

alter table profiles enable row level security;
-- Cada docente lee y edita solo su perfil; el registro escribe con la clave de servicio.
drop policy if exists "perfil propio: leer" on profiles;
create policy "perfil propio: leer" on profiles for select using (auth.uid() = id);
drop policy if exists "perfil propio: editar" on profiles;
create policy "perfil propio: editar" on profiles for update using (auth.uid() = id);
