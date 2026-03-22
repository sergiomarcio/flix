import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { SeriesStatus, SupabaseService, UserSeries } from '../../../services/supabase.service';
import { TmdbService } from '../../../services/tmdb.service';

@Component({
  selector: 'app-my-series-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './my-series-list.component.html',
  styleUrl: './my-series-list.component.scss'
})
export class MySeriesListComponent implements OnInit {
  allSeries: UserSeries[] = [];
  filteredSeries: UserSeries[] = [];
  activeFilter: SeriesStatus | 'all' = 'all';
  sortBy: 'name' | 'year' = 'name';
  sortDir: 'asc' | 'desc' = 'asc';
  loading = true;
  stats = { watching: 0, watched: 0, want_to_watch: 0 };

  constructor(
    private supabaseService: SupabaseService,
    private tmdbService: TmdbService,
    public router: Router
  ) { }

  ngOnInit(): void {
    this.loadSeries();
  }

  async loadSeries(): Promise<void> {
    this.loading = true;
    try {
      this.allSeries = await this.supabaseService.getUserSeries();
      this.computeStats();
      this.applyFilter(this.activeFilter);
      this.enrichSeasonsCount();
    } catch (err) {
      console.error('Erro ao carregar séries:', err);
    } finally {
      this.loading = false;
    }
  }

  private async enrichSeasonsCount(): Promise<void> {
    const missing = this.allSeries;
    await Promise.all(missing.map(async s => {
      try {
        const detail = await firstValueFrom(this.tmdbService.getShowDetail(s.series_id));
        s.number_of_seasons = detail.number_of_seasons;
      } catch { }
    }));
    this.allSeries = [...this.allSeries];
    this.applyFilter(this.activeFilter);
  }

  private computeStats(): void {
    this.stats = { watching: 0, watched: 0, want_to_watch: 0 };
    this.allSeries.forEach(s => this.stats[s.status]++);
  }

  applyFilter(filter: SeriesStatus | 'all'): void {
    this.activeFilter = filter;
    const base = filter === 'all' ? [...this.allSeries] : this.allSeries.filter(s => s.status === filter);
    this.filteredSeries = this.sortList(base);
  }

  setSort(sort: 'name' | 'year'): void {
    if (this.sortBy === sort) {
      this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortBy = sort;
      this.sortDir = 'asc';
    }
    this.applyFilter(this.activeFilter);
  }

  private sortList(list: UserSeries[]): UserSeries[] {
    return [...list].sort((a, b) => {
      if (this.sortBy === 'name') {
        const cmp = a.series_name.localeCompare(b.series_name);
        return this.sortDir === 'asc' ? cmp : -cmp;
      }
      const yearA = (a.first_air_date || '').substring(0, 4);
      const yearB = (b.first_air_date || '').substring(0, 4);
      const yearCmp = yearA.localeCompare(yearB);
      if (yearCmp !== 0) return this.sortDir === 'asc' ? yearCmp : -yearCmp;
      return a.series_name.localeCompare(b.series_name);
    });
  }

  getPosterUrl(path: string): string {
    return this.tmdbService.getImageUrl(path, 'w185');
  }

  getStatusLabel(status: SeriesStatus): string {
    switch (status) {
      case 'watching': return '▶ Assistindo';
      case 'watched': return '✅ Concluída';
      case 'want_to_watch': return '⭐ Quero Ver';
      default: return '';
    }
  }

  getYear(date: string): string {
    return date ? date.substring(0, 4) : '';
  }

  goToSeries(seriesId: number): void {
    this.router.navigate(['/series', seriesId]);
  }

  async removeSeries(event: Event, seriesId: number): Promise<void> {
    event.stopPropagation();
    try {
      await Promise.all([
        this.supabaseService.removeSeriesStatus(seriesId),
        this.supabaseService.removeAllSeriesEpisodes(seriesId),
      ]);
      this.allSeries = this.allSeries.filter(s => s.series_id !== seriesId);
      this.computeStats();
      this.applyFilter(this.activeFilter);
    } catch { }
  }
}
