import { Injectable } from '@angular/core';
import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { BehaviorSubject } from 'rxjs';
import { environment } from '../../environments/environment';

export type WatchStatus = 'watched' | 'not_watched' | 'want_to_watch';
export type SeriesStatus = 'watching' | 'watched' | 'want_to_watch' | 'not_watched';

export interface UserSeries {
  id?: number;
  user_id?: string;
  series_id: number;
  series_name: string;
  poster_path: string;
  first_air_date: string;
  vote_average: number;
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
  liked?: boolean | null;
  created_at?: string;
  updated_at?: string;
}

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
  private _client: SupabaseClient | null = null;
  private _currentUser = new BehaviorSubject<User | null>(null);

  readonly currentUser$ = this._currentUser.asObservable();

  constructor() {
    this.client?.auth.getSession().then(({ data }) => {
      this._currentUser.next(data.session?.user ?? null);
    });

    this.client?.auth.onAuthStateChange((_event, session) => {
      this._currentUser.next(session?.user ?? null);
    });
  }

  private get client(): SupabaseClient | null {
    if (this._client) return this._client;

    const url = environment.supabaseUrl;
    const key = environment.supabaseAnonKey;

    if (!url || url === 'YOUR_SUPABASE_URL' || !key || key === 'YOUR_SUPABASE_ANON_KEY') {
      return null;
    }

    try {
      this._client = createClient(url, key, {
        auth: {
          lock: <R>(_name: string, _acquireTimeout: number, fn: () => Promise<R>) => fn()
        }
      });
    } catch {
      return null;
    }
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
    const { error } = await this.client.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: 'https://zingy-praline-4bf85e.netlify.app/' }
    });
    if (error) throw error;
  }

  async signIn(email: string, password: string): Promise<void> {
    if (!this.client) throw new Error('Supabase não configurado.');
    const { error } = await this.client.auth.signInWithPassword({ email, password });
    if (error) throw error;
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

  async setMovieLike(movieId: number, liked: boolean | null): Promise<void> {
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
    disliked_minutes: number;
    unevaluated_minutes: number;
    liked_count: number;
    disliked_count: number;
    unevaluated_count: number;
  }> {
    const empty = { watched: 0, not_watched: 0, want_to_watch: 0, total_minutes: 0, liked_minutes: 0, disliked_minutes: 0, unevaluated_minutes: 0, liked_count: 0, disliked_count: 0, unevaluated_count: 0 };
    if (!this.client || !this.userId) return empty;

    const { data, error } = await this.client
      .from('user_movies')
      .select('status, runtime, liked')
      .eq('user_id', this.userId);

    if (error) throw error;

    const stats = { ...empty };
    (data || []).forEach((item: { status: WatchStatus; runtime: number | null; liked: boolean | null }) => {
      stats[item.status]++;
      if (item.status === 'watched' && item.runtime) {
        stats.total_minutes += item.runtime;
        if (item.liked === true)  { stats.liked_minutes       += item.runtime; stats.liked_count++; }
        else if (item.liked === false) { stats.disliked_minutes += item.runtime; stats.disliked_count++; }
        else                          { stats.unevaluated_minutes += item.runtime; stats.unevaluated_count++; }
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
    const { error } = await this.client
      .from('user_series')
      .upsert({ ...series, user_id: this.userId, updated_at: new Date().toISOString() },
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
    let query = this.client
      .from('user_episodes')
      .select('*')
      .eq('user_id', this.userId);
    if (seriesId !== undefined) query = query.eq('series_id', seriesId);
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
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

  async getSeriesStats(): Promise<{
    total_minutes: number;
    total_episodes: number;
    watching: number;
    watched: number;
    want_to_watch: number;
  }> {
    const empty = { total_minutes: 0, total_episodes: 0, watching: 0, watched: 0, want_to_watch: 0 };
    if (!this.client || !this.userId) return empty;

    const [episodesRes, seriesRes] = await Promise.all([
      this.client.from('user_episodes').select('runtime').eq('user_id', this.userId),
      this.client.from('user_series').select('status').eq('user_id', this.userId)
    ]);

    const stats = { ...empty };
    (episodesRes.data || []).forEach((e: { runtime: number | null }) => {
      stats.total_episodes++;
      if (e.runtime) stats.total_minutes += e.runtime;
    });
    (seriesRes.data || []).forEach((s: { status: SeriesStatus }) => {
      if (s.status === 'watching')      stats.watching++;
      if (s.status === 'watched')       stats.watched++;
      if (s.status === 'want_to_watch') stats.want_to_watch++;
    });
    return stats;
  }
}
