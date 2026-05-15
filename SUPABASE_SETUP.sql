-- =============================================================
-- MIGRAÇÃO: Associar filmes ao usuário autenticado
-- Execute este SQL no Supabase > SQL Editor
-- =============================================================

create table public.episode_comments (
  id uuid not null default gen_random_uuid (),
  series_id integer not null,
  season_number integer not null,
  episode_number integer not null,
  user_id uuid not null,
  user_email text not null,
  comment text not null,
  gif_url text null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint episode_comments_pkey primary key (id),
  constraint episode_comments_user_id_fkey foreign KEY (user_id) references auth.users (id)
) TABLESPACE pg_default;

---------------------------------------------------------------------------------------------------------------------------------------------------------------- 
----------------------------------------------------------------------------------------------------------------------------------------------------------------
----------------------------------------------------------------------------------------------------------------------------------------------------------------

create table public.movie_comments (
  id uuid not null default gen_random_uuid (),
  movie_id integer not null,
  user_id uuid not null,
  user_email text not null,
  comment text not null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  gif_url text null,
  constraint movie_comments_pkey primary key (id),
  constraint movie_comments_user_id_fkey foreign KEY (user_id) references auth.users (id)
) TABLESPACE pg_default;

---------------------------------------------------------------------------------------------------------------------------------------------------------------- 
----------------------------------------------------------------------------------------------------------------------------------------------------------------
----------------------------------------------------------------------------------------------------------------------------------------------------------------

create table public.user_episodes (
  id bigserial not null,
  user_id uuid not null,
  series_id integer not null,
  season_number integer not null,
  episode_number integer not null,
  episode_name text null,
  runtime integer null,
  watched_at timestamp with time zone null default now(),
  times_watched smallint null,
  constraint user_episodes_pkey primary key (id),
  constraint user_episodes_unique unique (user_id, series_id, season_number, episode_number),
  constraint user_episodes_user_id_fkey foreign KEY (user_id) references auth.users (id) on delete CASCADE
) TABLESPACE pg_default;

---------------------------------------------------------------------------------------------------------------------------------------------------------------- 
----------------------------------------------------------------------------------------------------------------------------------------------------------------
----------------------------------------------------------------------------------------------------------------------------------------------------------------

create table public.user_movies (
  id bigserial not null,
  movie_id integer not null,
  movie_title text not null,
  poster_path text null,
  release_date text null,
  vote_average numeric(4, 2) null default 0,
  status text not null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  runtime integer null,
  user_id uuid null,
  liked text null,
  constraint user_movies_pkey primary key (id),
  constraint user_movies_user_id_movie_id_key unique (user_id, movie_id),
  constraint user_movies_user_id_fkey foreign KEY (user_id) references auth.users (id) on delete CASCADE,
  constraint user_movies_status_check check (
    (
      status = any (
        array[
          'watched'::text,
          'not_watched'::text,
          'want_to_watch'::text
        ]
      )
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_user_movies_movie_id on public.user_movies using btree (movie_id) TABLESPACE pg_default;
create index IF not exists idx_user_movies_status on public.user_movies using btree (status) TABLESPACE pg_default;

---------------------------------------------------------------------------------------------------------------------------------------------------------------- 
----------------------------------------------------------------------------------------------------------------------------------------------------------------
----------------------------------------------------------------------------------------------------------------------------------------------------------------

create table public.user_series (
  id bigserial not null,
  user_id uuid not null,
  series_id integer not null,
  series_name text not null,
  poster_path text null,
  first_air_date text null,
  vote_average numeric null,
  status text not null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint user_series_pkey primary key (id),
  constraint user_series_user_id_series_id_key unique (user_id, series_id),
  constraint user_series_user_id_fkey foreign KEY (user_id) references auth.users (id) on delete CASCADE,
  constraint user_series_status_check check (
    (
      status = any (
        array[
          'watching'::text,
          'watched'::text,
          'want_to_watch'::text,
          'not_watched'::text
        ]
      )
    )
  )
) TABLESPACE pg_default;

---------------------------------------------------------------------------------------------------------------------------------------------------------------- 
----------------------------------------------------------------------------------------------------------------------------------------------------------------
----------------------------------------------------------------------------------------------------------------------------------------------------------------

ALTER TABLE episode_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usuário lê seus Comentários de Episódios"       ON "public"."episode_comments"   FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Usuário insere seus Comentários de Episódios"   ON "public"."episode_comments"   FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Usuário atualiza seus Comentários de Episódios" ON "public"."episode_comments"   FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Usuário exclui seus Comentários de Episódios"   ON "public"."episode_comments"   FOR DELETE USING (auth.uid() = user_id);

ALTER TABLE movie_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usuário lê seus Comentários de Filmes"          ON "public"."movie_comments"     FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Usuário insere seus Comentários de Filmes"      ON "public"."movie_comments"     FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Usuário atualiza seus Comentários de Filmes"    ON "public"."movie_comments"     FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Usuário exclui seus Comentários de Filmes"      ON "public"."movie_comments"     FOR DELETE USING (auth.uid() = user_id);

ALTER TABLE user_episodes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usuário lê seus episódios"                      ON "public"."user_episodes"      FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Usuário insere seus episódios"                  ON "public"."user_episodes"      FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Usuário atualiza seus episódios"                ON "public"."user_episodes"      FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Usuário exclui seus episódios"                  ON "public"."user_episodes"      FOR DELETE USING (auth.uid() = user_id);

ALTER TABLE user_movies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usuário lê seus filmes"                         ON "public"."user_movies"        FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Usuário insere seus filmes"                     ON "public"."user_movies"        FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Usuário atualiza seus filmes"                   ON "public"."user_movies"        FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Usuário exclui seus filmes"                     ON "public"."user_movies"        FOR DELETE USING (auth.uid() = user_id);

ALTER TABLE user_series ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usuário lê suas séries"                         ON "public"."user_series"        FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Usuário insere suas séries"                     ON "public"."user_series"        FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Usuário atualiza suas séries"                   ON "public"."user_series"        FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Usuário exclui suas séries"                     ON "public"."user_series"        FOR DELETE USING (auth.uid() = user_id);
