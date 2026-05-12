-- =============================================================
-- MIGRAÇÃO: Associar filmes ao usuário autenticado
-- Execute este SQL no Supabase > SQL Editor
-- =============================================================

-- 1. Adicionar coluna user_id (referência ao usuário autenticado)
ALTER TABLE user_movies
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- 2. Remover a constraint única antiga (apenas movie_id)
ALTER TABLE user_movies
  DROP CONSTRAINT IF EXISTS user_movies_movie_id_key;

-- 3. Criar constraint única composta (user_id + movie_id)
--    Cada usuário pode ter o mesmo filme apenas uma vez
ALTER TABLE user_movies
  ADD CONSTRAINT user_movies_user_id_movie_id_key UNIQUE (user_id, movie_id);

-- 4. Adicionar coluna liked (true = gostei, false = não gostei, null = sem avaliação)
ALTER TABLE user_movies
  ADD COLUMN IF NOT EXISTS liked BOOLEAN DEFAULT NULL;

-- 5. Habilitar Row Level Security (RLS)
ALTER TABLE user_movies ENABLE ROW LEVEL SECURITY;

-- 6. Políticas RLS: cada usuário só vê e altera seus próprios registros

-- Leitura
CREATE POLICY "Usuário lê seus filmes"
  ON user_movies FOR SELECT
  USING (auth.uid() = user_id);

-- Inserção
CREATE POLICY "Usuário insere seus filmes"
  ON user_movies FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Atualização
CREATE POLICY "Usuário atualiza seus filmes"
  ON user_movies FOR UPDATE
  USING (auth.uid() = user_id);

-- Exclusão
CREATE POLICY "Usuário exclui seus filmes"
  ON user_movies FOR DELETE
  USING (auth.uid() = user_id);

-- =============================================================
-- Se a tabela ainda não existe, use este CREATE completo:
-- =============================================================
/*
CREATE TABLE IF NOT EXISTS user_movies (
  id            BIGSERIAL PRIMARY KEY,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  movie_id      INTEGER NOT NULL,
  movie_title   TEXT NOT NULL,
  poster_path   TEXT,
  release_date  TEXT,
  vote_average  NUMERIC,
  runtime       INTEGER,
  status        TEXT NOT NULL CHECK (status IN ('watched', 'not_watched', 'want_to_watch')),
  liked         BOOLEAN DEFAULT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT user_movies_user_id_movie_id_key UNIQUE (user_id, movie_id)
);

ALTER TABLE user_movies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuário lê seus filmes"     ON user_movies FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Usuário insere seus filmes" ON user_movies FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Usuário atualiza seus filmes" ON user_movies FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Usuário exclui seus filmes" ON user_movies FOR DELETE USING (auth.uid() = user_id);
*/

-- =============================================================
-- MÓDULO DE SÉRIES
-- Execute este bloco no Supabase > SQL Editor
-- =============================================================

-- Tabela: séries na lista do usuário
CREATE TABLE IF NOT EXISTS user_series (
  id            BIGSERIAL PRIMARY KEY,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  series_id     INTEGER NOT NULL,
  series_name   TEXT NOT NULL,
  poster_path   TEXT,
  first_air_date TEXT,
  vote_average  NUMERIC,
  status        TEXT NOT NULL CHECK (status IN ('watching', 'watched', 'want_to_watch', 'not_watched')),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT user_series_user_id_series_id_key UNIQUE (user_id, series_id)
);

ALTER TABLE user_series ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usuário lê suas séries"     ON user_series FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Usuário insere suas séries" ON user_series FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Usuário atualiza suas séries" ON user_series FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Usuário exclui suas séries"  ON user_series FOR DELETE USING (auth.uid() = user_id);

-- Tabela: episódios vistos
CREATE TABLE IF NOT EXISTS user_episodes (
  id             BIGSERIAL PRIMARY KEY,
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  series_id      INTEGER NOT NULL,
  season_number  INTEGER NOT NULL,
  episode_number INTEGER NOT NULL,
  episode_name   TEXT,
  runtime        INTEGER,
  watched_at     TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT user_episodes_unique UNIQUE (user_id, series_id, season_number, episode_number)
);

ALTER TABLE user_episodes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usuário lê seus episódios"     ON user_episodes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Usuário insere seus episódios" ON user_episodes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Usuário atualiza seus episódios" ON user_episodes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Usuário exclui seus episódios"  ON user_episodes FOR DELETE USING (auth.uid() = user_id);

-- =============================================================
-- MIGRAÇÃO: Adicionar campo times_watched em user_episodes
-- Execute este SQL no Supabase > SQL Editor
-- =============================================================
ALTER TABLE user_episodes
  ADD COLUMN IF NOT EXISTS times_watched INTEGER NOT NULL DEFAULT 1;
