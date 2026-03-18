import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { SupabaseService, UserMovie, WatchStatus } from '../../services/supabase.service';

interface UserRow { uid: string; email: string; }

interface MovieStats {
  watched: number; want_to_watch: number; total_minutes: number;
  liked_count: number; neutral_count: number; disliked_count: number; unevaluated_count: number;
  liked_minutes: number; neutral_minutes: number; disliked_minutes: number; unevaluated_minutes: number;
}

interface SeriesStats {
  total_minutes: number; total_episodes: number;
  watching: number; watched: number; want_to_watch: number;
}

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.scss'
})
export class AdminComponent implements OnInit {
  users: UserRow[] = [];
  selectedUser: UserRow | null = null;
  movies: UserMovie[] = [];
  movieStats: MovieStats | null = null;
  seriesStats: SeriesStats | null = null;
  loadingUsers = true;
  loadingMovies = false;
  loadingStats = false;
  statusFilter: WatchStatus | 'all' = 'all';
  activeTab: 'movies' | 'stats' = 'movies';

  constructor(private supabase: SupabaseService) { }

  ngOnInit(): void {
    this.supabase.getUsers().then(users => {
      this.users = users;
      this.loadingUsers = false;
    }).catch(() => { this.loadingUsers = false; });
  }

  selectUser(user: UserRow): void {
    this.selectedUser = user;
    this.statusFilter = 'all';
    this.activeTab = 'movies';
    this.loadingMovies = true;
    this.loadingStats = true;
    this.movies = [];
    this.movieStats = null;
    this.seriesStats = null;

    this.supabase.getUserMoviesAdmin(user.uid).then(movies => {
      this.movies = movies;
      this.loadingMovies = false;
    }).catch(() => { this.loadingMovies = false; });

    Promise.all([
      this.supabase.getMovieStatsAdmin(user.uid),
      this.supabase.getSeriesStatsAdmin(user.uid)
    ]).then(([ms, ss]) => {
      this.movieStats = ms;
      this.seriesStats = ss;
      this.loadingStats = false;
    }).catch(() => { this.loadingStats = false; });
  }

  get filteredMovies(): UserMovie[] {
    if (this.statusFilter === 'all') return this.movies;
    return this.movies.filter(m => m.status === this.statusFilter);
  }

  get watchedCount(): number { return this.movies.filter(m => m.status === 'watched').length; }
  get wantCount(): number { return this.movies.filter(m => m.status === 'want_to_watch').length; }

  formatTime(minutes: number): string {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h >= 24) {
      const d = Math.floor(h / 24);
      const rh = h % 24;
      return `${d}d ${rh}h`;
    }
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  }

  getPosterUrl(path: string): string {
    if (!path) return 'assets/no-poster.jpg';
    return `https://image.tmdb.org/t/p/w92${path}`;
  }

  getYear(date: string): string {
    return date ? date.substring(0, 4) : '—';
  }

  likedLabel(liked: string | null | undefined): string {
    if (liked === 'liked') return '👍';
    if (liked === 'disliked') return '👎';
    if (liked === 'neutral') return '😐';
    return '—';
  }

  likedPercent(count: number): number {
    if (!this.movieStats?.watched) return 0;
    return Math.round((count / this.movieStats.watched) * 100);
  }
}
