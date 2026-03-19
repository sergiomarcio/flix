import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { SupabaseService, UserSeries, WatchedEpisode } from '../../../services/supabase.service';
import { TmdbService } from '../../../services/tmdb.service';

interface SeriesProgress {
  series: UserSeries;
  watchedEpisodes: number;
  totalMinutes: number;
}

interface StatsState {
  statusFilter: 'watching' | 'watched' | 'want_to_watch' | null;
  sortBy: 'name' | 'year';
  sortDir: 'asc' | 'desc';
  scrollY: number;
}

const STATE_KEY = 'series_stats_state';

@Component({
  selector: 'app-series-stats',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './stats.component.html',
  styleUrl: './stats.component.scss'
})
export class SeriesStatsComponent implements OnInit, OnDestroy {
  loading = true;
  totalMinutes = 0;
  totalEpisodes = 0;
  watchingCount = 0;
  watchedCount = 0;
  wantToWatchCount = 0;
  seriesProgress: SeriesProgress[] = [];
  displayedSeries: SeriesProgress[] = [];
  sortBy: 'name' | 'year' = 'name';
  sortDir: 'asc' | 'desc' = 'asc';
  statusFilter: 'watching' | 'watched' | 'want_to_watch' | null = null;
  watchingMinutes = 0;
  watchedMinutes = 0;
  private savingState = true;

  constructor(
    private supabase: SupabaseService,
    private tmdb: TmdbService,
    private router: Router
  ) { }

  ngOnInit(): void {
    const saved = sessionStorage.getItem(STATE_KEY);
    if (saved) {
      const state: StatsState = JSON.parse(saved);
      this.statusFilter = state.statusFilter;
      this.sortBy = state.sortBy;
      this.sortDir = state.sortDir;
    }
    this.loadStats();
  }

  ngOnDestroy(): void {
    if (this.savingState) {
      sessionStorage.setItem(STATE_KEY, JSON.stringify({
        statusFilter: this.statusFilter,
        sortBy: this.sortBy,
        sortDir: this.sortDir,
        scrollY: window.scrollY
      } as StatsState));
    }
  }

  async loadStats(): Promise<void> {
    this.loading = true;
    try {
      const [stats, allSeries, allEpisodes] = await Promise.all([
        this.supabase.getSeriesStats(),
        this.supabase.getUserSeries(),
        this.supabase.getWatchedEpisodes()
      ]);

      this.totalMinutes = stats.total_minutes;
      this.totalEpisodes = stats.total_episodes;
      this.watchingCount = stats.watching;
      this.watchedCount = stats.watched;
      this.wantToWatchCount = stats.want_to_watch;

      // Group episodes by series
      const epMap = new Map<number, WatchedEpisode[]>();
      allEpisodes.forEach(ep => {
        if (!epMap.has(ep.series_id)) epMap.set(ep.series_id, []);
        epMap.get(ep.series_id)!.push(ep);
      });

      this.seriesProgress = allSeries.map(s => {
        const eps = epMap.get(s.series_id) || [];
        return {
          series: s,
          watchedEpisodes: eps.length,
          totalMinutes: eps.reduce((acc, e) => acc + (e.runtime || 0), 0)
        };
      });

      this.watchingMinutes = this.seriesProgress
        .filter(sp => sp.series.status === 'watching')
        .reduce((acc, sp) => acc + sp.totalMinutes, 0);
      this.watchedMinutes = this.seriesProgress
        .filter(sp => sp.series.status === 'watched')
        .reduce((acc, sp) => acc + sp.totalMinutes, 0);

      this.applySort();

      const saved = sessionStorage.getItem(STATE_KEY);
      if (saved) {
        const { scrollY } = JSON.parse(saved) as StatsState;
        if (scrollY > 0) {
          requestAnimationFrame(() => requestAnimationFrame(() => window.scrollTo({ top: scrollY })));
        }
      }

    } catch (err) {
      console.error('Erro ao carregar estatísticas:', err);
    } finally {
      this.loading = false;
    }
  }

  get totalSeriesCount(): number { return this.watchingCount + this.watchedCount; }

  setStatusFilter(filter: 'watching' | 'watched' | 'want_to_watch'): void {
    this.statusFilter = this.statusFilter === filter ? null : filter;
    this.applySort();
  }

  clearStatusFilter(): void {
    this.statusFilter = null;
    this.applySort();
  }

  private applySort(): void {
    const list = this.statusFilter
      ? this.seriesProgress.filter(sp => sp.series.status === this.statusFilter)
      : this.seriesProgress;
    this.displayedSeries = [...list].sort((a, b) => {
      if (this.sortBy === 'name') {
        const cmp = (a.series.series_name || '').localeCompare(b.series.series_name || '');
        return this.sortDir === 'asc' ? cmp : -cmp;
      }
      const yearCmp = (a.series.first_air_date || '').substring(0, 4).localeCompare((b.series.first_air_date || '').substring(0, 4));
      if (yearCmp !== 0) return this.sortDir === 'asc' ? yearCmp : -yearCmp;
      return (a.series.series_name || '').localeCompare(b.series.series_name || '');
    });
  }

  setSort(field: 'name' | 'year'): void {
    if (this.sortBy === field) {
      this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortBy = field;
      this.sortDir = 'asc';
    }
    this.applySort();
  }
  get totalHours(): number { return Math.floor(this.totalMinutes / 60); }
  get remainingMinutes(): number { return this.totalMinutes % 60; }
  get totalDays(): number { return Math.floor(this.totalMinutes / 1440); }
  get averageRuntime(): number {
    if (!this.totalEpisodes) return 0;
    return Math.round(this.totalMinutes / this.totalEpisodes);
  }

  formatRuntime(min: number): string {
    const h = Math.floor(min / 60);
    const m = min % 60;
    return h > 0 ? `${h}h ${m}min` : `${m}min`;
  }

  getPosterUrl(path: string): string {
    return this.tmdb.getImageUrl(path, 'w185');
  }

  goToSeries(id: number): void {
    this.savingState = false;
    sessionStorage.setItem(STATE_KEY, JSON.stringify({
      statusFilter: this.statusFilter,
      sortBy: this.sortBy,
      sortDir: this.sortDir,
      scrollY: window.scrollY
    } as StatsState));
    this.router.navigate(['/series', id]);
  }
}
