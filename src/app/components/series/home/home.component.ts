import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged, of, switchMap, takeUntil } from 'rxjs';
import { SeriesStatus, SupabaseService } from '../../../services/supabase.service';
import { TVResponse, TVShow, TmdbService } from '../../../services/tmdb.service';

interface HomeState {
  searchQuery: string;
  shows: TVShow[];
  isSearching: boolean;
  currentPage: number;
  totalPages: number;
  trendingShows: TVShow[];
  heroIndex: number;
  scrollY: number;
}

const STATE_KEY = 'series_home_state';

@Component({
  selector: 'app-series-home',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class SeriesHomeComponent implements OnInit, OnDestroy {
  searchQuery = '';
  shows: TVShow[] = [];
  trendingShows: TVShow[] = [];
  heroShow: TVShow | null = null;
  heroFading = false;
  heroIndex = 0;
  loading = false;
  isSearching = false;
  currentPage = 1;
  totalPages = 1;

  private searchSubject = new Subject<string>();
  private destroy$ = new Subject<void>();
  private heroInterval: ReturnType<typeof setInterval> | null = null;

  statusMap = new Map<number, SeriesStatus>();

  constructor(private tmdb: TmdbService, private router: Router, private supabase: SupabaseService) { }

  ngOnInit(): void {
    this.supabase.getUserSeries().then(list => {
      this.statusMap = new Map(list.map(s => [s.series_id, s.status]));
    });

    const saved = sessionStorage.getItem(STATE_KEY);
    if (saved) {
      const state: HomeState = JSON.parse(saved);
      this.searchQuery = state.searchQuery;
      this.shows = state.shows;
      this.isSearching = state.isSearching;
      this.currentPage = state.currentPage;
      this.totalPages = state.totalPages;
      this.trendingShows = state.trendingShows;
      this.heroIndex = state.heroIndex;
      this.heroShow = this.trendingShows[this.heroIndex] ?? null;
      this.startHeroRotation();
      setTimeout(() => window.scrollTo({ top: state.scrollY, behavior: 'instant' }), 0);
    } else {
      this.loadTrending();
    }

    this.searchSubject.pipe(
      debounceTime(400),
      distinctUntilChanged(),
      switchMap(query => {
        if (!query.trim()) {
          this.isSearching = false;
          return of(null);
        }
        this.loading = true;
        this.isSearching = true;
        return this.tmdb.searchShows(query, 1);
      }),
      takeUntil(this.destroy$)
    ).subscribe({
      next: (response) => {
        this.loading = false;
        if (response) {
          this.shows = response.results;
          this.currentPage = response.page;
          this.totalPages = response.total_pages;
        } else {
          this.shows = [];
        }
      },
      error: () => { this.loading = false; }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.heroInterval) clearInterval(this.heroInterval);
  }

  loadTrending(): void {
    this.loading = true;
    this.tmdb.getTrendingShows().pipe(takeUntil(this.destroy$)).subscribe({
      next: (response: TVResponse) => {
        this.trendingShows = response.results;
        this.heroIndex = Math.floor(Math.random() * response.results.length);
        this.heroShow = response.results[this.heroIndex] || null;
        this.loading = false;
        this.startHeroRotation();
      },
      error: () => { this.loading = false; }
    });
  }

  startHeroRotation(): void {
    if (this.heroInterval) clearInterval(this.heroInterval);
    this.heroInterval = setInterval(() => {
      this.heroFading = true;
      setTimeout(() => {
        this.heroIndex = (this.heroIndex + 1) % this.trendingShows.length;
        this.heroShow = this.trendingShows[this.heroIndex];
        this.heroFading = false;
      }, 500);
    }, 5000);
  }

  setHero(index: number): void {
    if (index === this.heroIndex) return;
    this.heroFading = true;
    setTimeout(() => {
      this.heroIndex = index;
      this.heroShow = this.trendingShows[index];
      this.heroFading = false;
      this.startHeroRotation();
    }, 500);
  }

  onSearchChange(): void {
    this.searchSubject.next(this.searchQuery);
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.isSearching = false;
    this.shows = [];
  }

  goToShow(show: TVShow): void {
    const state: HomeState = {
      searchQuery: this.searchQuery,
      shows: this.shows,
      isSearching: this.isSearching,
      currentPage: this.currentPage,
      totalPages: this.totalPages,
      trendingShows: this.trendingShows,
      heroIndex: this.heroIndex,
      scrollY: window.scrollY
    };
    sessionStorage.setItem(STATE_KEY, JSON.stringify(state));
    this.router.navigate(['/series', show.id]);
  }

  getBackdropUrl(show: TVShow): string {
    return this.tmdb.getBackdropUrl(show.backdrop_path);
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
    if (status === 'watched')      return '✅ Concluída';
    if (status === 'watching')     return '▶ Assistindo';
    if (status === 'want_to_watch') return '⭐ Quero Ver';
    return '';
  }
}
