import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { SeriesStatus, SupabaseService } from '../../../services/supabase.service';
import { TVResponse, TVShow, TmdbService } from '../../../services/tmdb.service';

interface PageConfig {
  title: string;
  icon: string;
  loader: (page: number) => any;
}

interface ListState {
  type: string;
  shows: TVShow[];
  currentPage: number;
  totalPages: number;
  scrollY: number;
}

const STATE_KEY = 'series_list_state';

@Component({
  selector: 'app-series-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './list.component.html',
  styleUrl: './list.component.scss'
})
export class SeriesListComponent implements OnInit, OnDestroy {
  shows: TVShow[] = [];
  pageTitle = '';
  pageIcon = '';
  loading = false;
  currentPage = 1;
  totalPages = 1;

  statusMap = new Map<number, SeriesStatus>();
  private destroy$ = new Subject<void>();

  private configs: Record<string, PageConfig> = {
    popular: {
      title: 'Séries Populares',
      icon: '🔥',
      loader: (p) => this.tmdb.getPopularShows(p)
    },
    'top-rated': {
      title: 'Séries Mais Votadas',
      icon: '🏆',
      loader: (p) => this.tmdb.getTopRatedShows(p)
    }
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private tmdb: TmdbService,
    private supabase: SupabaseService
  ) {}

  ngOnInit(): void {
    this.supabase.getUserSeries().then(list => {
      this.statusMap = new Map(list.map(s => [s.series_id, s.status]));
    });

    this.route.data.pipe(takeUntil(this.destroy$)).subscribe(data => {
      const type = data['type'] as string;
      const config = this.configs[type];
      if (!config) return;

      this.pageTitle = config.title;
      this.pageIcon = config.icon;

      const saved = sessionStorage.getItem(STATE_KEY);
      if (saved) {
        const state: ListState = JSON.parse(saved);
        if (state.type === type) {
          this.shows = state.shows;
          this.currentPage = state.currentPage;
          this.totalPages = state.totalPages;
          setTimeout(() => window.scrollTo({ top: state.scrollY, behavior: 'instant' }), 0);
          return;
        }
      }

      this.shows = [];
      this.loadShows(config, 1);
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadShows(config: PageConfig, page: number): void {
    this.loading = true;
    config.loader(page).pipe(takeUntil(this.destroy$)).subscribe({
      next: (response: TVResponse) => {
        this.shows = page === 1 ? response.results : [...this.shows, ...response.results];
        this.currentPage = response.page;
        this.totalPages = response.total_pages;
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  loadMore(): void {
    const type = this.route.snapshot.data['type'] as string;
    const config = this.configs[type];
    if (config && this.currentPage < this.totalPages) {
      this.loadShows(config, this.currentPage + 1);
    }
  }

  goToShow(show: TVShow): void {
    const type = this.route.snapshot.data['type'] as string;
    const state: ListState = {
      type,
      shows: this.shows,
      currentPage: this.currentPage,
      totalPages: this.totalPages,
      scrollY: window.scrollY
    };
    sessionStorage.setItem(STATE_KEY, JSON.stringify(state));
    this.router.navigate(['/series', show.id]);
  }

  getImageUrl(path: string): string {
    return this.tmdb.getImageUrl(path, 'w342');
  }

  getYear(date: string): string {
    return date ? date.substring(0, 4) : '';
  }

  getStatus(show: TVShow): SeriesStatus | null {
    return this.statusMap.get(show.id) ?? null;
  }

  statusLabel(status: SeriesStatus): string {
    if (status === 'watched')       return '✅ Concluída';
    if (status === 'watching')      return '▶ Assistindo';
    if (status === 'want_to_watch') return '⭐ Quero Ver';
    return '';
  }
}
