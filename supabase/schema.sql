-- TeachForge · esquema de la base de datos (Postgres/Supabase)
-- Aplicar en el SQL Editor de Supabase.
-- pgvector queda para la fase de búsqueda semántica (S12): descomentar entonces.

create extension if not exists pgcrypto;
-- create extension if not exists vector;

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
    -- , embedding vector(1536)   -- fase RAG (S12)
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

-- La app usa la service key desde el servidor (no hay login en el MVP),
-- así que RLS no se habilita todavía. Al añadir auth: habilitar RLS y
-- filtrar todas las lecturas por el usuario de la sesión.
