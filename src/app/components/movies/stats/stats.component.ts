import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { SupabaseService, UserMovie } from '../../../services/supabase.service';
import { TmdbService } from '../../../services/tmdb.service';

interface WatchedMovie extends UserMovie {
  runtime: number;
}

@Component({
  selector: 'app-movie-stats',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './stats.component.html',
  styleUrl: './stats.component.scss'
})
export class MovieStatsComponent implements OnInit {
  loading = true;
  likeFilter: 'liked' | 'neutral' | 'disliked' | 'unevaluated' | null = null;
  totalMinutes = 0;
  likedMinutes = 0;
  neutralMinutes = 0;
  dislikedMinutes = 0;
  likedCount = 0;
  neutralCount = 0;
  dislikedCount = 0;
  unevaluatedCount = 0;
  unevaluatedMinutes = 0;
  watchedCount = 0;
  wantToWatchCount = 0;
  notWatchedCount = 0;
  watchedMovies: WatchedMovie[] = [];
  moviesWithoutRuntime: UserMovie[] = [];

  constructor(
    private supabaseService: SupabaseService,
    private tmdbService: TmdbService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.loadStats();
  }

  async loadStats(): Promise<void> {
    this.loading = true;
    try {
      const stats = await this.supabaseService.getStats();
      this.watchedCount = stats.watched;
      this.wantToWatchCount = stats.want_to_watch;
      this.notWatchedCount = stats.not_watched;
      this.totalMinutes = stats.total_minutes;
      this.likedMinutes = stats.liked_minutes;
      this.neutralMinutes = stats.neutral_minutes;
      this.dislikedMinutes = stats.disliked_minutes;
      this.likedCount = stats.liked_count;
      this.neutralCount = stats.neutral_count;
      this.dislikedCount = stats.disliked_count;
      this.unevaluatedCount = stats.unevaluated_count;
      this.unevaluatedMinutes = stats.unevaluated_minutes;

      const watched = await this.supabaseService.getMoviesByStatus('watched');
      this.watchedMovies = watched.filter((m: UserMovie) => m.runtime && m.runtime > 0) as WatchedMovie[];
      this.moviesWithoutRuntime = watched.filter((m: UserMovie) => !m.runtime || m.runtime === 0);
    } catch (err) {
      console.error('Erro ao carregar estatísticas:', err);
    } finally {
      this.loading = false;
    }
  }

  get filteredWatchedMovies(): WatchedMovie[] {
    if (!this.likeFilter) return this.watchedMovies;
    if (this.likeFilter === 'liked') return this.watchedMovies.filter(m => m.liked === 'liked');
    if (this.likeFilter === 'neutral') return this.watchedMovies.filter(m => m.liked === 'neutral');
    if (this.likeFilter === 'disliked') return this.watchedMovies.filter(m => m.liked === 'disliked');
    if (this.likeFilter === 'unevaluated') return this.watchedMovies.filter(m => m.liked == null);
    return this.watchedMovies;
  }

  setLikeFilter(filter: 'liked' | 'neutral' | 'disliked' | 'unevaluated'): void {
    this.likeFilter = this.likeFilter === filter ? null : filter;
  }

  get totalHours(): number {
    return Math.floor(this.totalMinutes / 60);
  }

  get remainingMinutes(): number {
    return this.totalMinutes % 60;
  }

  get totalDays(): number {
    return Math.floor(this.totalMinutes / 1440);
  }

  get averageRuntime(): number {
    if (!this.watchedMovies.length) return 0;
    return Math.round(this.totalMinutes / this.watchedMovies.length);
  }

  formatRuntime(minutes: number): string {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return h > 0 ? `${h}h ${m}min` : `${m}min`;
  }

  getPosterUrl(path: string): string {
    return this.tmdbService.getImageUrl(path, 'w185');
  }

  getYear(date: string): string {
    return date ? date.substring(0, 4) : '';
  }

  goToMovie(id: number): void {
    this.router.navigate(['/movie', id]);
  }

  getProgressPercent(): number {
    const total = this.watchedCount + this.wantToWatchCount + this.notWatchedCount;
    if (!total) return 0;
    return Math.round((this.watchedCount / total) * 100);
  }
}
