# FLIX — Documentação da Aplicação

> Plataforma pessoal para catalogar e gerenciar filmes e séries.

---

## Sumário

1. [Visão Geral](#visão-geral)
2. [Stack Tecnológica](#stack-tecnológica)
3. [Arquitetura](#arquitetura)
4. [Estrutura de Pastas](#estrutura-de-pastas)
5. [Funcionalidades](#funcionalidades)
6. [Banco de Dados](#banco-de-dados)
7. [Rotas da Aplicação](#rotas-da-aplicação)
8. [Serviços](#serviços)
9. [Integrações Externas](#integrações-externas)
10. [Configuração e Ambiente](#configuração-e-ambiente)
11. [Deploy](#deploy)
12. [Histórico de Versões](#histórico-de-versões)

---

## Visão Geral

O **FLIX** é uma aplicação web para gerenciamento pessoal de catálogo de filmes e séries. Permite ao usuário buscar títulos via API do TMDB, organizá-los em listas personalizadas, acompanhar episódios assistidos, avaliar conteúdos e visualizar estatísticas detalhadas do tempo de tela.

- **URL de produção**: https://flixlog.netlify.app
- **Versão atual**: 1.0.0
- **Idioma da interface**: Português (Brasil)

---

## Stack Tecnológica

| Camada | Tecnologia | Versão |
|---|---|---|
| Framework | Angular (Standalone Components) | 18.2.14 |
| Linguagem | TypeScript | 5.4.2 |
| Reatividade | RxJS | 7.8.0 |
| Estilo | SCSS | — |
| Backend / Auth / DB | Supabase (PostgreSQL + RLS) | 2.100.0 |
| API de filmes | TMDB (The Movie Database) | — |
| API de GIFs | Giphy | — |
| Build | Angular CLI / Webpack | 18.2.21 |
| Testes | Jasmine + Karma | 5.1.0 |
| Deploy | Netlify | — |
| PWA | Web App Manifest | — |

---

## Arquitetura

```
┌─────────────────────────────────────────────────────────┐
│                      Browser (Angular SPA)               │
│                                                          │
│   Components ──► Services ──► Guards ──► Pipes          │
│        │              │                                  │
│        │         ┌────┴────────────┐                    │
│        │         │  SupabaseService │  (auth + dados)   │
│        │         │  TmdbService     │  (catálogo)       │
│        │         └────────────────┘                     │
└────────┼────────────────┼────────────────────────────────┘
         │                │
    ┌────▼────┐     ┌──────▼──────┐
    │  TMDB   │     │  Supabase   │
    │   API   │     │ (Postgres)  │
    └─────────┘     └─────────────┘
```

**Decisões arquiteturais relevantes:**

- **Standalone Components**: todos os componentes usam a API standalone do Angular (sem NgModules).
- **BehaviorSubject para estado de autenticação**: `SupabaseService` expõe o usuário logado via observable.
- **sessionStorage para estado de UI**: estado de paginação, filtros e abas ativas é preservado por sessão para navegação fluida.
- **RLS (Row-Level Security)**: segurança a nível de banco de dados — cada usuário acessa apenas seus próprios dados.
- **Lazy loading de imagens**: usa tamanhos adaptativos do TMDB (`w185`, `w342`, `w500`, `w780`).

---

## Estrutura de Pastas

```
src/
├── app/
│   ├── components/
│   │   ├── admin/               # Painel administrativo
│   │   ├── login/               # Autenticação (login / cadastro)
│   │   ├── navbar/              # Barra de navegação
│   │   ├── splash/              # Tela de carregamento inicial
│   │   ├── about/               # Página "Sobre"
│   │   ├── manual/              # Manual do usuário
│   │   ├── search/              # Busca unificada (filmes, séries, pessoas)
│   │   ├── people/              # Resultados de busca de pessoas
│   │   ├── person/              # Perfil individual de pessoa (ator/diretor)
│   │   ├── movies/
│   │   │   ├── home/            # Página inicial de filmes (hero + destaques)
│   │   │   ├── list/            # Listagens (populares, mais votados, em cartaz)
│   │   │   ├── detail/          # Detalhes do filme (trailer, elenco, provedores)
│   │   │   ├── oscars/          # Oscars ganhos e indicados por categoria e edição
│   │   │   ├── my-movies-list/  # Catálogo pessoal do usuário
│   │   │   ├── card/            # Componente de card reutilizável
│   │   │   ├── stats/           # Estatísticas de visualização
│   │   │   └── schedule/        # Agenda de lançamentos de filmes
│   │   └── series/
│   │       ├── home/            # Página inicial de séries
│   │       ├── list/            # Listagens de séries
│   │       ├── detail/          # Detalhes da série
│   │       ├── season-detail/   # Temporada com controle de episódios
│   │       ├── episode-modal/   # Modal de episódio com comentários e GIFs
│   │       ├── my-series-list/  # Catálogo pessoal de séries
│   │       ├── stats/           # Estatísticas de séries
│   │       └── schedule/        # Agenda de próximos episódios
│   ├── services/
│   │   ├── supabase.service.ts  # Auth, CRUD de dados do usuário
│   │   ├── oscars.service.ts    # Consulta à base histórica local de Oscars
│   │   └── tmdb.service.ts      # Integração com a API TMDB
│   ├── guards/
│   │   ├── auth.guard.ts        # Requer usuário autenticado
│   │   └── admin.guard.ts       # Requer usuário administrador
│   ├── pipes/
│   │   └── safe-url.pipe.ts     # Sanitização de URLs para iframes
│   ├── app.routes.ts            # Definição de rotas
│   ├── app.component.ts         # Componente raiz
│   ├── app.config.ts            # Configuração global da aplicação
│   └── version.ts               # Versão e changelog
├── environments/
│   ├── environment.ts           # Variáveis de desenvolvimento
│   └── environment.prod.ts      # Variáveis de produção
├── styles/                      # Estilos globais
├── assets/                      # Ativos estáticos
└── index.html                   # HTML raiz
```

---

## Funcionalidades

### Autenticação

- Cadastro e login com e-mail e senha via Supabase Auth.
- Sessão persistida via localStorage com refresh automático de token.
- Rota `/login` acessível sem autenticação; demais rotas protegidas por `authGuard`.
- Painel administrativo restrito ao e-mail do administrador (`adminGuard`).

### Filmes

| Funcionalidade | Descrição |
|---|---|
| Browse | Tendências, Populares, Mais Votados, Em Cartaz |
| Busca | Busca em tempo real com debounce de 400ms |
| Catálogo | Adicionar filmes com status: Assistido / Não Assistido / Quero Assistir |
| Avaliação | Gostei / Neutro / Não Gostei para filmes assistidos |
| Detalhes | Trailer, elenco, equipe, produtoras, provedores de streaming, reviews |
| Oscars | Categorias ganhas e indicados da mesma edição, com título brasileiro e original |
| Comentários | Comentários de texto com suporte a GIFs (via Giphy) |
| Estatísticas | Tempo total assistido, distribuição por avaliação, progresso |
| Agenda | Calendário agrupando filmes não assistidos por data de lançamento |

#### Oscars nos detalhes do filme

- A seção **OSCARS** fica abaixo de **Produção** na página `/movie/:id` e mostra a quantidade de categorias ganhas encontradas na base. O título segue o estilo de Produção: dourado, letras maiúsculas, tamanho de 0,9rem, espaçamento de 2px entre letras e margem inferior de 0,5rem, sem ícone antes do texto.
- Clique em uma categoria para expandir os indicados daquela edição; clique novamente para recolher. Cada categoria mostra o ano da cerimônia e o número da edição.
- A lista inclui filmes e pessoas indicadas, destaca os vencedores e identifica o filme aberto com uma borda dourada. Empates e indicações diferentes do mesmo filme são preservados.
- Clique no título de um filme listado para abrir seus detalhes no Flix (`/movie/:id`). O link fica disponível assim que a consulta por IMDb ID retornar o identificador TMDB; indicações com vários filmes oferecem um link para cada título identificado. Quando não houver correspondência segura ou a consulta falhar, o título permanece como texto.
- Os títulos são exibidos como **Título no Brasil (Título original)** quando disponíveis no TMDB. A consulta é feita em `pt-BR`, por IMDb ID, apenas ao expandir a categoria, com cache e até quatro requisições simultâneas.
- Se o TMDB não retornar os títulos, a consulta falhar ou não houver correspondência segura entre filme e identificador, mantém-se o nome histórico da base. A falha na consulta aos títulos não impede a leitura dos indicados.
- Há links para a edição no site da Academia e para a fonte dos dados. Prêmios especiais e honorários explicitamente associados ao filme também podem aparecer; nesses casos, pode não haver outros indicados registrados.
- A base incluída cobre as cerimônias até **2026 (98ª edição)**. A associação é feita por IMDb ID, sem comparação aproximada de títulos. A ausência de uma vitória na base não comprova que o filme nunca ganhou um Oscar.
- Filmes sem IMDb ID mostram premiações indisponíveis. Erros ao carregar a base exibem **Tentar novamente**, enquanto filmes sem vitórias encontradas recebem uma mensagem específica.

### Séries

| Funcionalidade | Descrição |
|---|---|
| Browse | Populares, Mais Votadas |
| Catálogo | Status: Assistindo / Assistida / Quero Assistir |
| Episódios | Marcar episódios individualmente como assistidos; contador de replays |
| Temporadas | Visualização detalhada por temporada com progresso de episódios |
| Comentários | Comentários por episódio com suporte a GIFs |
| Estatísticas | Total de episódios, tempo total, progresso por status |
| Agenda | Próximos episódios a serem lançados |

### Pessoas

- Busca de atores, diretores e roteiristas.
- Perfil detalhado com biografia e local de nascimento.
- Filmografia completa (filmes e séries) com personagem/cargo.

### Painel Admin

- Visível apenas para o administrador.
- Lista todos os usuários cadastrados.
- Permite visualizar o catálogo e as estatísticas de cada usuário.
- Permite excluir usuários (com exclusão em cascata dos dados relacionados).

---

## Banco de Dados

O banco de dados é gerenciado pelo **Supabase** (PostgreSQL). O script de criação completo está em [SUPABASE_SETUP.sql](SUPABASE_SETUP.sql).

### Tabelas

#### `user_movies`

Armazena os filmes catalogados por cada usuário.

| Coluna | Tipo | Descrição |
|---|---|---|
| id | uuid | Chave primária |
| user_id | uuid | Referência ao usuário (auth.uid) |
| movie_id | integer | ID do filme no TMDB |
| title | text | Título do filme |
| poster_path | text | Caminho do pôster no TMDB |
| status | text | `watched` / `not_watched` / `want_to_watch` |
| rating | text | `liked` / `neutral` / `disliked` / null |
| runtime | integer | Duração em minutos |
| added_at | timestamp | Data de adição |
| watched_at | timestamp | Data em que foi marcado como assistido |

#### `user_series`

Armazena as séries catalogadas por cada usuário.

| Coluna | Tipo | Descrição |
|---|---|---|
| id | uuid | Chave primária |
| user_id | uuid | Referência ao usuário |
| series_id | integer | ID da série no TMDB |
| title | text | Título da série |
| poster_path | text | Caminho do pôster |
| status | text | `watching` / `watched` / `want_to_watch` |
| added_at | timestamp | Data de adição |

#### `user_episodes`

Rastreia episódios assistidos por usuário.

| Coluna | Tipo | Descrição |
|---|---|---|
| id | uuid | Chave primária |
| user_id | uuid | Referência ao usuário |
| series_id | integer | ID da série |
| season_number | integer | Número da temporada |
| episode_number | integer | Número do episódio |
| watch_count | integer | Quantas vezes foi assistido |
| runtime | integer | Duração em minutos |
| watched_at | timestamp | Data do último acesso |

#### `movie_comments`

Comentários de usuários em filmes.

| Coluna | Tipo | Descrição |
|---|---|---|
| id | uuid | Chave primária |
| user_id | uuid | Referência ao usuário |
| movie_id | integer | ID do filme |
| comment | text | Texto do comentário |
| gif_url | text | URL do GIF (opcional) |
| created_at | timestamp | Data de criação |

#### `episode_comments`

Comentários de usuários em episódios.

| Coluna | Tipo | Descrição |
|---|---|---|
| id | uuid | Chave primária |
| user_id | uuid | Referência ao usuário |
| series_id | integer | ID da série |
| season_number | integer | Número da temporada |
| episode_number | integer | Número do episódio |
| comment | text | Texto do comentário |
| gif_url | text | URL do GIF (opcional) |
| created_at | timestamp | Data de criação |

### Segurança (RLS)

Todas as tabelas têm **Row-Level Security** habilitada. As políticas garantem que:

- Cada usuário lê e escreve apenas seus próprios registros (via `auth.uid()`).
- Edição e exclusão de comentários é restrita ao autor.
- Exclusão de usuários no painel admin dispara exclusão em cascata de todos os dados relacionados.

---

## Rotas da Aplicação

### Rotas Públicas

| Rota | Componente | Descrição |
|---|---|---|
| `/login` | LoginComponent | Autenticação |
| `/about` | AboutComponent | Sobre a aplicação |
| `/manual` | ManualComponent | Manual do usuário |
| `**` | — | Redireciona para `/movies` |

### Rotas Protegidas (`authGuard`)

| Rota | Componente | Descrição |
|---|---|---|
| `/movies` | MoviesHomeComponent | Página inicial de filmes |
| `/movies-popular` | MoviesListComponent | Filmes populares |
| `/movies-top-rated` | MoviesListComponent | Filmes mais votados |
| `/movies-now-playing` | MoviesListComponent | Filmes em cartaz |
| `/movie/:id` | MovieDetailComponent | Detalhes de um filme |
| `/my-movies-list` | MyMoviesListComponent | Catálogo pessoal de filmes |
| `/movie-stats` | MovieStatsComponent | Estatísticas de filmes |
| `/movie-schedule` | MovieScheduleComponent | Agenda de filmes |
| `/series` | SeriesHomeComponent | Página inicial de séries |
| `/series-popular` | SeriesListComponent | Séries populares |
| `/series-top-rated` | SeriesListComponent | Séries mais votadas |
| `/series/:id` | SeriesDetailComponent | Detalhes de uma série |
| `/series/:id/season/:n` | SeasonDetailComponent | Detalhes de temporada |
| `/my-series-list` | MySeriesListComponent | Catálogo pessoal de séries |
| `/series-stats` | SeriesStatsComponent | Estatísticas de séries |
| `/series-schedule` | SeriesScheduleComponent | Agenda de séries |
| `/buscar` | SearchComponent | Busca unificada |
| `/people` | PeopleComponent | Resultados de pessoas |
| `/person/:id` | PersonComponent | Perfil de pessoa |

### Rotas Administrativas (`adminGuard`)

| Rota | Componente | Descrição |
|---|---|---|
| `/admin` | AdminComponent | Painel de administração |

---

## Serviços

### `SupabaseService`

Centraliza toda a comunicação com o Supabase.

**Autenticação:**
- `signIn(email, password)` — login
- `signUp(email, password)` — cadastro
- `signOut()` — logout
- `currentUser$` — observable com o usuário autenticado

**Filmes:**
- `getUserMovies()` — lista filmes do usuário
- `addMovie(movie)` — adiciona filme ao catálogo
- `updateMovieStatus(id, status)` — atualiza status
- `updateMovieRating(id, rating)` — salva avaliação
- `removeMovie(id)` — remove do catálogo

**Séries e Episódios:**
- `getUserSeries()` — lista séries do usuário
- `addSeries(series)` — adiciona série
- `updateSeriesStatus(id, status)` — atualiza status
- `getWatchedEpisodes(seriesId)` — episódios assistidos
- `markEpisodeWatched(episode)` — marca episódio
- `unmarkEpisodeWatched(id)` — desmarca episódio

**Comentários:**
- `getMovieComments(movieId)` — busca comentários
- `addMovieComment(comment)` — adiciona comentário
- `deleteMovieComment(id)` — remove comentário
- `getEpisodeComments(...)` — busca comentários de episódio
- `addEpisodeComment(comment)` — adiciona comentário de episódio

### `TmdbService`

Encapsula todas as chamadas à API do TMDB.

**Filmes:**
- `getTrendingMovies()`, `getPopularMovies()`, `getTopRatedMovies()`, `getNowPlayingMovies()`
- `getMovieDetails(id)` — detalhes completos
- `getMovieCredits(id)` — elenco e equipe
- `getMovieTitlesByImdbId(imdbId)` — consulta `/find/{imdbId}` com `external_source=imdb_id` e idioma `pt-BR`, retornando título brasileiro e original, com cache por identificador
- `getMovieVideos(id)` — trailers
- `getMovieWatchProviders(id)` — onde assistir
- `getMovieReviews(id)` — reviews

**Séries:**
- `getPopularSeries()`, `getTopRatedSeries()`
- `getSeriesDetails(id)`, `getSeriesCredits(id)`
- `getSeasonDetails(seriesId, seasonNumber)`
- `getEpisodeDetails(seriesId, season, episode)`

**Busca:**
- `searchMulti(query)` — busca unificada
- `searchPerson(query)` — busca de pessoas
- `getPersonDetails(id)` — perfil de pessoa
- `getPersonMovieCredits(id)`, `getPersonTvCredits(id)`

---

### `OscarsService`

- `getMovieOscars(imdbId)` — consulta o índice local de vencedores e carrega apenas as cerimônias relacionadas ao filme, com cache.
- `selectMovieOscars(ceremonies, imdbId)` — seleciona as categorias ganhas pelo filme, preservando seus indicados e as categorias históricas separadas, incluindo Cor e Preto e Branco.
- O componente standalone `MovieOscarsComponent` controla a expansão das categorias, o carregamento dos títulos e os estados de erro. A troca de filme cancela as assinaturas anteriores para evitar resultados da página anterior.

## Integrações Externas

### TMDB (The Movie Database)

- Base URL: `https://api.themoviedb.org/3`
- Imagens: `https://image.tmdb.org/t/p/{tamanho}/{path}`
- Tamanhos de imagem disponíveis: `w185`, `w342`, `w500`, `w780`, `original`
- Idioma das respostas: `pt-BR`
- Autenticação: API Key via query param `api_key`

### Giphy

- Usado exclusivamente para busca de GIFs na funcionalidade de comentários.
- Autenticação: API Key configurada no ambiente.

### Oscar Data

- Fonte: [Oscar Data, de David V. Lu!!](https://github.com/DLu/oscar_data), com vencedores, indicados e identificadores IMDb derivados do banco da Academia.
- Os dados são distribuídos como JSONs locais em `src/assets/oscars/`: `index.json` e um arquivo por cerimônia. A revisão da fonte e o último ano estão registrados no índice.
- Licença BSD-2-Clause preservada em `src/assets/oscars/LICENSE.txt`. Detalhes da geração estão em `src/assets/oscars/README.md`.
- Não requer nova chave de API nem alterações no Supabase. A localização dos nomes utiliza a integração TMDB já existente.
- A atualização da base é manual: execute `npm run data:oscars` para reproduzir a revisão fixada no script, ou `npm run data:oscars -- <commit-do-repositorio-DLu/oscar_data>` para gerar uma revisão nova após conferir seus resultados.
- O gerador `scripts/update-oscars.mjs` requer Node.js com `fetch` nativo e acesso à internet. Os JSONs gerados devem ser incluídos no deploy.

### Supabase Edge Functions

- Notificação automática ao administrador quando um novo usuário se cadastra.

---

## Configuração e Ambiente

As variáveis de ambiente ficam em `src/environments/environment.ts` (dev) e `environment.prod.ts` (produção).

```typescript
export const environment = {
  production: false,
  tmdbApiKey: 'SUA_CHAVE_TMDB',
  tmdbBaseUrl: 'https://api.themoviedb.org/3',
  supabaseUrl: 'SUA_URL_SUPABASE',
  supabaseKey: 'SUA_CHAVE_ANONIMA_SUPABASE',
  giphyApiKey: 'SUA_CHAVE_GIPHY',
};
```

**Comandos disponíveis:**

```bash
npm start          # Inicia o servidor de desenvolvimento (porta 4200)
npm run build      # Build de produção
npm test           # Executa testes unitários com Karma/Jasmine
npm run data:oscars # Gera a base local de Oscars a partir da revisão fixada
```

Para configurar o banco de dados, execute o script [SUPABASE_SETUP.sql](SUPABASE_SETUP.sql) no SQL Editor do Supabase. Consulte [CONFIGURACAO.md](CONFIGURACAO.md) para o passo a passo completo.

---

## Deploy

A aplicação é hospedada no **Netlify**.

- O arquivo `public/_redirects` garante que todas as rotas redirecionem para `index.html` (necessário para SPA com roteamento client-side).
- O build de produção é gerado em `dist/flix/browser`.
- O `angular.json` está configurado para otimizações de produção (minificação, tree-shaking, budget de bundle).

---

## Histórico de Versões

### Atualizações de 18/10/2026

- Inclusão da seção Oscars nos detalhes de filmes, abaixo de Produção, com categorias ganhas e expansão dos indicados da mesma edição.
- Inclusão da base histórica local até a 98ª edição (2026), com correspondência por IMDb ID, cache, mensagens de indisponibilidade e nova tentativa em caso de erro.
- Exibição de nomes no formato **Título no Brasil (Título original)** na lista de indicados, consultados no TMDB ao expandir a categoria; o nome histórico é mantido quando a consulta não está disponível.
- Títulos dos filmes na lista de indicados agora abrem seus detalhes no Flix, usando links acessíveis por teclado e o identificador TMDB retornado pela consulta existente. Sem identificação disponível, o nome permanece como texto.
- Validação da implementação: build de produção concluído e 11 testes aprovados, cobrindo dados históricos, empates, categorias históricas, expansão, troca de filme, erros e localização dos nomes.
- Documentação e manual da aplicação atualizados. A orientação de atualizar ambos a cada alteração foi registrada em `AGENTS.md`.

| Versão | Data | Destaques |
|---|---|---|
| 1.0.0 | 2026-03-17 | Lançamento inicial — catálogo de filmes e séries, autenticação, estatísticas, rastreamento de episódios, PWA |
