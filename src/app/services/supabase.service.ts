import { Injectable } from '@angular/core';
import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { BehaviorSubject } from 'rxjs';
import { environment } from '../../environments/environment';

export type WatchStatus = 'watched' | 'want_to_watch';
export type SeriesStatus = 'watching' | 'watched' | 'want_to_watch';

export interface UserSeries {
  id?: number;
  user_id?: string;
  series_id: number;
  series_name: string;
  poster_path: string;
  first_air_date: string;
  vote_average: number;
  number_of_seasons?: number;
  status: SeriesStatus;
  created_at?: string;
  updated_at?: string;
}

export interface WatchedEpisode {
  id?: number;
  user_id?: string;
  series_id: number;
  season_number: number;
  episode_number: number;
  episode_name?: string;
  runtime?: number;
  watched_at?: string;
}

export interface UserMovie {
  id?: number;
  user_id?: string;
  movie_id: number;
  movie_title: string;
  poster_path: string;
  release_date: string;
  vote_average: number;
  runtime?: number;
  status: WatchStatus;
  liked?: 'liked' | 'neutral' | 'disliked' | null;
  created_at?: string;
  updated_at?: string;
}

export interface EpisodeComment {
  id: string;
  series_id: number;
  season_number: number;
  episode_number: number;
  user_id: string;
  user_email: string;
  comment: string;
  gif_url?: string | null;
  created_at: string;
  updated_at: string;
}

export interface MovieComment {
  id: string;
  movie_id: number;
  user_id: string;
  user_email: string;
  comment: string;
  gif_url?: string | null;
  created_at: string;
  updated_at: string;
}

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
  private _client: SupabaseClient | null = null;
  private _currentUser = new BehaviorSubject<User | null>(null);

  readonly currentUser$ = this._currentUser.asObservable();

  constructor() {
    const url = environment.supabaseUrl;
    const key = environment.supabaseAnonKey;

    if (url && key) {
      this._client = createClient(url, key, {
        auth: {
          lock: <R>(_name: string, _acquireTimeout: number, fn: () => Promise<R>): Promise<R> => fn(),
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: true,
          storage: window.localStorage,
          storageKey: 'sb-auth-token'
        }
      });

      this._client.auth.getSession().then(({ data }) => {
        this._currentUser.next(data.session?.user ?? null);
      });

      this._client.auth.onAuthStateChange((_event, session) => {
        this._currentUser.next(session?.user ?? null);
      });
    }
  }

  private get client(): SupabaseClient | null {
    return this._client;
  }

  get isConfigured(): boolean {
    return this.client !== null;
  }

  get currentUser(): User | null {
    return this._currentUser.value;
  }

  async signUp(email: string, password: string): Promise<void> {
    if (!this.client) throw new Error('Supabase não configurado.');

    const { data, error } = await this.client.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: 'https://flixlog.netlify.app/' }
    });
    if (error) throw error;

    if (data.user) {
      await this.client.functions.invoke('notify-new-user', {
        body: { user: data.user, event: 'USER_CREATED' },
      });
    }
  }

  async signIn(email: string, password: string): Promise<void> {
    if (!this.client) throw new Error('Supabase não configurado.');

    const { data, error } = await this.client.auth.signInWithPassword({ email, password });
    if (error) throw error;

    if (data.user && data.session) {
      await this.client.functions.invoke('notify-new-user', {
        body: { user: data.user, event: 'SIGNED_IN' },
        headers: {
          Authorization: `Bearer ${data.session.access_token}`,
        },
      });
    }
  }

  async signOut(): Promise<void> {
    if (!this.client) return;
    const { error } = await this.client.auth.signOut();
    if (error) throw error;
  }

  async isAuthenticated(): Promise<boolean> {
    if (!this.client) return false;
    const { data } = await this.client.auth.getSession();
    return !!data.session;
  }

  private get userId(): string | null {
    return this._currentUser.value?.id ?? null;
  }

  async getUserMovies(): Promise<UserMovie[]> {
    if (!this.client || !this.userId) return [];
    const { data, error } = await this.client
      .from('user_movies')
      .select('*')
      .eq('user_id', this.userId)
      .order('updated_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async getMovieStatus(movieId: number): Promise<WatchStatus | null> {
    if (!this.client || !this.userId) return null;
    const { data, error } = await this.client
      .from('user_movies')
      .select('status')
      .eq('user_id', this.userId)
      .eq('movie_id', movieId)
      .maybeSingle();

    if (error) return null;
    return data?.status || null;
  }

  async setMovieStatus(movie: UserMovie): Promise<void> {
    if (!this.client) throw new Error('Supabase não configurado.');
    if (!this.userId) throw new Error('Usuário não autenticado.');
    const { error } = await this.client
      .from('user_movies')
      .upsert({
        ...movie,
        user_id: this.userId,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id,movie_id' });

    if (error) throw error;
  }

  async setMovieLike(movieId: number, liked: 'liked' | 'neutral' | 'disliked' | null): Promise<void> {
    if (!this.client || !this.userId) throw new Error('Usuário não autenticado.');
    const { error } = await this.client
      .from('user_movies')
      .update({ liked, updated_at: new Date().toISOString() })
      .eq('user_id', this.userId)
      .eq('movie_id', movieId);

    if (error) throw error;
  }

  async removeMovieStatus(movieId: number): Promise<void> {
    if (!this.client || !this.userId) return;
    const { error } = await this.client
      .from('user_movies')
      .delete()
      .eq('user_id', this.userId)
      .eq('movie_id', movieId);

    if (error) throw error;
  }

  async getMoviesByStatus(status: WatchStatus): Promise<UserMovie[]> {
    if (!this.client || !this.userId) return [];
    const { data, error } = await this.client
      .from('user_movies')
      .select('*')
      .eq('user_id', this.userId)
      .eq('status', status)
      .order('updated_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async getStats(): Promise<{
    watched: number;
    not_watched: number;
    want_to_watch: number;
    total_minutes: number;
    liked_minutes: number;
    neutral_minutes: number;
    disliked_minutes: number;
    unevaluated_minutes: number;
    liked_count: number;
    neutral_count: number;
    disliked_count: number;
    unevaluated_count: number;
  }> {
    const empty = { watched: 0, not_watched: 0, want_to_watch: 0, total_minutes: 0, liked_minutes: 0, neutral_minutes: 0, disliked_minutes: 0, unevaluated_minutes: 0, liked_count: 0, neutral_count: 0, disliked_count: 0, unevaluated_count: 0 };
    if (!this.client || !this.userId) return empty;

    const { data, error } = await this.client
      .from('user_movies')
      .select('status, runtime, liked')
      .eq('user_id', this.userId);

    if (error) throw error;

    const stats = { ...empty };
    (data || []).forEach((item: { status: WatchStatus; runtime: number | null; liked: 'liked' | 'neutral' | 'disliked' | null }) => {
      stats[item.status]++;
      if (item.status === 'watched' && item.runtime) {
        stats.total_minutes += item.runtime;
        if (item.liked === 'liked') { stats.liked_minutes += item.runtime; stats.liked_count++; }
        else if (item.liked === 'neutral') { stats.neutral_minutes += item.runtime; stats.neutral_count++; }
        else if (item.liked === 'disliked') { stats.disliked_minutes += item.runtime; stats.disliked_count++; }
        else { stats.unevaluated_minutes += item.runtime; stats.unevaluated_count++; }
      }
    });
    return stats;
  }

  // ── Series ────────────────────────────────────────────────

  async getUserSeries(): Promise<UserSeries[]> {
    if (!this.client || !this.userId) return [];
    const { data, error } = await this.client
      .from('user_series')
      .select('*')
      .eq('user_id', this.userId)
      .order('updated_at', { ascending: false });
    if (error) throw error;
    return data || [];
  }

  async getSeriesStatus(seriesId: number): Promise<SeriesStatus | null> {
    if (!this.client || !this.userId) return null;
    const { data } = await this.client
      .from('user_series')
      .select('status')
      .eq('user_id', this.userId)
      .eq('series_id', seriesId)
      .maybeSingle();
    return data?.status ?? null;
  }

  async setSeriesStatus(series: UserSeries): Promise<void> {
    if (!this.client || !this.userId) throw new Error('Usuário não autenticado.');
    const { number_of_seasons: _omit, ...rest } = series;
    const { error } = await this.client
      .from('user_series')
      .upsert({ ...rest, user_id: this.userId, updated_at: new Date().toISOString() },
        { onConflict: 'user_id,series_id' });
    if (error) throw error;
  }

  async removeSeriesStatus(seriesId: number): Promise<void> {
    if (!this.client || !this.userId) return;
    const { error } = await this.client
      .from('user_series')
      .delete()
      .eq('user_id', this.userId)
      .eq('series_id', seriesId);
    if (error) throw error;
  }

  // ── Episodes ──────────────────────────────────────────────

  async getWatchedEpisodes(seriesId?: number): Promise<WatchedEpisode[]> {
    if (!this.client || !this.userId) return [];
    const pageSize = 1000;
    const all: WatchedEpisode[] = [];
    let from = 0;
    while (true) {
      let query = this.client
        .from('user_episodes')
        .select('*')
        .eq('user_id', this.userId)
        .range(from, from + pageSize - 1);
      if (seriesId !== undefined) query = query.eq('series_id', seriesId);
      const { data, error } = await query;
      if (error) throw error;
      if (!data || data.length === 0) break;
      all.push(...data);
      if (data.length < pageSize) break;
      from += pageSize;
    }
    return all;
  }

  async setEpisodeWatched(episode: WatchedEpisode): Promise<void> {
    if (!this.client || !this.userId) throw new Error('Usuário não autenticado.');
    const { error } = await this.client
      .from('user_episodes')
      .upsert({ ...episode, user_id: this.userId, watched_at: new Date().toISOString() },
        { onConflict: 'user_id,series_id,season_number,episode_number' });
    if (error) throw error;
  }

  async removeEpisodeWatched(seriesId: number, seasonNumber: number, episodeNumber: number): Promise<void> {
    if (!this.client || !this.userId) return;
    const { error } = await this.client
      .from('user_episodes')
      .delete()
      .eq('user_id', this.userId)
      .eq('series_id', seriesId)
      .eq('season_number', seasonNumber)
      .eq('episode_number', episodeNumber);
    if (error) throw error;
  }

  async removeAllSeriesEpisodes(seriesId: number): Promise<void> {
    if (!this.client || !this.userId) return;
    const { error } = await this.client
      .from('user_episodes')
      .delete()
      .eq('user_id', this.userId)
      .eq('series_id', seriesId);
    if (error) throw error;
  }

  async removeSeasonWatched(seriesId: number, seasonNumber: number): Promise<void> {
    if (!this.client || !this.userId) return;
    const { error } = await this.client
      .from('user_episodes')
      .delete()
      .eq('user_id', this.userId)
      .eq('series_id', seriesId)
      .eq('season_number', seasonNumber);
    if (error) throw error;
  }

  // ── Admin ─────────────────────────────────────────────────

  async getUsers(): Promise<{ uid: string; email: string }[]> {
    if (!this.client) return [];
    const { data, error } = await this.client.rpc('get_all_users');
    if (error) throw error;
    return data || [];
  }

  async getUserMoviesAdmin(userId: string): Promise<UserMovie[]> {
    if (!this.client) return [];
    const { data, error } = await this.client
      .from('user_movies')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });
    if (error) throw error;
    return data || [];
  }

  async getMovieStatsAdmin(userId: string): Promise<{
    watched: number; want_to_watch: number; total_minutes: number;
    liked_count: number; neutral_count: number; disliked_count: number; unevaluated_count: number;
    liked_minutes: number; neutral_minutes: number; disliked_minutes: number; unevaluated_minutes: number;
  }> {
    const empty = { watched: 0, want_to_watch: 0, total_minutes: 0, liked_count: 0, neutral_count: 0, disliked_count: 0, unevaluated_count: 0, liked_minutes: 0, neutral_minutes: 0, disliked_minutes: 0, unevaluated_minutes: 0 };
    if (!this.client) return empty;
    const { data, error } = await this.client
      .from('user_movies').select('status, runtime, liked').eq('user_id', userId);
    if (error) return empty;
    const s = { ...empty };
    (data || []).forEach((item: { status: WatchStatus; runtime: number | null; liked: string | null }) => {
      if (item.status === 'watched') {
        s.watched++;
        if (item.runtime) {
          s.total_minutes += item.runtime;
          if (item.liked === 'liked') { s.liked_count++; s.liked_minutes += item.runtime; }
          else if (item.liked === 'neutral') { s.neutral_count++; s.neutral_minutes += item.runtime; }
          else if (item.liked === 'disliked') { s.disliked_count++; s.disliked_minutes += item.runtime; }
          else { s.unevaluated_count++; s.unevaluated_minutes += item.runtime; }
        }
      } else if (item.status === 'want_to_watch') s.want_to_watch++;
    });
    return s;
  }

  async getSeriesStatsAdmin(userId: string): Promise<{
    total_minutes: number; total_episodes: number; watching: number; watched: number; want_to_watch: number;
  }> {
    const empty = { total_minutes: 0, total_episodes: 0, watching: 0, watched: 0, want_to_watch: 0 };
    if (!this.client) return empty;
    const pageSize = 1000;
    const allEpisodes: { runtime: number | null }[] = [];
    let from = 0;
    while (true) {
      const { data, error } = await this.client
        .from('user_episodes').select('runtime').eq('user_id', userId)
        .range(from, from + pageSize - 1);
      if (error || !data || data.length === 0) break;
      allEpisodes.push(...data);
      if (data.length < pageSize) break;
      from += pageSize;
    }
    const { data: seriesData } = await this.client
      .from('user_series').select('status').eq('user_id', userId);
    const s = { ...empty };
    allEpisodes.forEach(e => { s.total_episodes++; if (e.runtime) s.total_minutes += e.runtime; });
    (seriesData || []).forEach((x: { status: SeriesStatus }) => {
      if (x.status === 'watching') s.watching++;
      else if (x.status === 'watched') s.watched++;
      else if (x.status === 'want_to_watch') s.want_to_watch++;
    });
    return s;
  }

  async deleteUser(userId: string): Promise<void> {
    if (!this.client) throw new Error('No client');
    const { error } = await this.client.rpc('delete_user_completely', { user_id_to_delete: userId });
    if (error) throw error;
  }

  async getSeriesStats(): Promise<{
    total_minutes: number;
    total_episodes: number;
    watching: number;
    watched: number;
    want_to_watch: number;
  }> {
    const empty = { total_minutes: 0, total_episodes: 0, watching: 0, watched: 0, want_to_watch: 0 };
    if (!this.client || !this.userId) return empty;

    const pageSize = 1000;
    const allEpisodes: { runtime: number | null }[] = [];
    let from = 0;
    while (true) {
      const { data, error } = await this.client
        .from('user_episodes')
        .select('runtime')
        .eq('user_id', this.userId)
        .range(from, from + pageSize - 1);
      if (error) break;
      if (!data || data.length === 0) break;
      allEpisodes.push(...data);
      if (data.length < pageSize) break;
      from += pageSize;
    }

    const { data: seriesData } = await this.client
      .from('user_series').select('status').eq('user_id', this.userId);

    const stats = { ...empty };
    allEpisodes.forEach((e) => {
      stats.total_episodes++;
      if (e.runtime) stats.total_minutes += e.runtime;
    });
    (seriesData || []).forEach((s: { status: SeriesStatus }) => {
      if (s.status === 'watching') stats.watching++;
      if (s.status === 'watched') stats.watched++;
      if (s.status === 'want_to_watch') stats.want_to_watch++;
    });
    return stats;
  }

  async getMovieComments(movieId: number): Promise<MovieComment[]> {
    if (!this.client) return [];
    const { data, error } = await this.client
      .from('movie_comments')
      .select('*')
      .eq('movie_id', movieId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
  }

  async addMovieComment(movieId: number, comment: string, gifUrl?: string | null): Promise<MovieComment> {
    if (!this.client || !this.userId) throw new Error('Usuário não autenticado.');
    const { data, error } = await this.client
      .from('movie_comments')
      .insert({ movie_id: movieId, user_id: this.userId, user_email: this.currentUser?.email ?? '', comment, gif_url: gifUrl ?? null })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async updateMovieComment(id: string, comment: string, gifUrl?: string | null): Promise<void> {
    if (!this.client) return;
    const { error } = await this.client
      .from('movie_comments')
      .update({ comment, gif_url: gifUrl ?? null, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
  }

  async getEpisodeComments(seriesId: number, seasonNumber: number, episodeNumber: number): Promise<EpisodeComment[]> {
    if (!this.client) return [];
    const { data, error } = await this.client
      .from('episode_comments')
      .select('*')
      .eq('series_id', seriesId)
      .eq('season_number', seasonNumber)
      .eq('episode_number', episodeNumber)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
  }

  async addEpisodeComment(seriesId: number, seasonNumber: number, episodeNumber: number, comment: string, gifUrl?: string | null): Promise<EpisodeComment> {
    if (!this.client || !this.userId) throw new Error('Usuário não autenticado.');
    const { data, error } = await this.client
      .from('episode_comments')
      .insert({ series_id: seriesId, season_number: seasonNumber, episode_number: episodeNumber, user_id: this.userId, user_email: this.currentUser?.email ?? '', comment, gif_url: gifUrl ?? null })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async updateEpisodeComment(id: string, comment: string, gifUrl?: string | null): Promise<void> {
    if (!this.client) return;
    const { error } = await this.client
      .from('episode_comments')
      .update({ comment, gif_url: gifUrl ?? null, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
  }

  async deleteEpisodeComment(id: string): Promise<void> {
    if (!this.client) return;
    const { error } = await this.client
      .from('episode_comments')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }

  async deleteMovieComment(id: string): Promise<void> {
    if (!this.client) return;
    const { error } = await this.client
      .from('movie_comments')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }
}
