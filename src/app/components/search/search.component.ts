import { OscarBadgeComponent } from '../movies/oscar-badge/oscar-badge.component';
import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged, of, switchMap, takeUntil } from 'rxjs';
import { MultiSearchResult, TmdbService } from '../../services/tmdb.service';

type MediaFilter = 'all' | 'movie' | 'tv';

interface SearchState {
  query: string;
  filter: MediaFilter;
  results: MultiSearchResult[];
  currentPage: number;
  totalPages: number;
  scrollY: number;
}

const STATE_KEY = 'multi_search_state';

@Component({
  selector: 'app-search',
  standalone: true,
  imports: [CommonModule, FormsModule, OscarBadgeComponent],
  templateUrl: './search.component.html',
  styleUrl: './search.component.scss'
})
export class SearchComponent implements OnInit, OnDestroy {
  query = '';
  filter: MediaFilter = 'all';
  results: MultiSearchResult[] = [];
  loading = false;
  loadingMore = false;
  currentPage = 1;
  totalPages = 1;

  private searchSubject = new Subject<string>();
  private destroy$ = new Subject<void>();

  constructor(private tmdb: TmdbService, private router: Router) {}

  ngOnInit(): void {
    const saved = sessionStorage.getItem(STATE_KEY);
    if (saved) {
      const state: SearchState = JSON.parse(saved);
      this.query = state.query;
      this.filter = state.filter;
      this.results = state.results;
      this.currentPage = state.currentPage;
      this.totalPages = state.totalPages;
      setTimeout(() => window.scrollTo({ top: state.scrollY, behavior: 'instant' }), 0);
    }

    this.searchSubject.pipe(
      debounceTime(400),
      distinctUntilChanged(),
      switchMap(q => {
        if (!q.trim()) {
          this.results = [];
          this.currentPage = 1;
          this.totalPages = 1;
          return of(null);
        }
        this.loading = true;
        this.currentPage = 1;
        return this.tmdb.searchMulti(q, 1);
      }),
      takeUntil(this.destroy$)
    ).subscribe({
      next: res => {
        this.loading = false;
        if (res) {
          this.results = res.results.filter(r => r.media_type !== 'person');
          this.currentPage = res.page;
          this.totalPages = res.total_pages;
        }
      },
      error: () => { this.loading = false; }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onQueryChange(): void {
    this.searchSubject.next(this.query);
  }

  clearSearch(): void {
    this.query = '';
    this.results = [];
    this.currentPage = 1;
    this.totalPages = 1;
    sessionStorage.removeItem(STATE_KEY);
  }

  setFilter(f: MediaFilter): void {
    this.filter = f;
  }

  get filtered(): MultiSearchResult[] {
    if (this.filter === 'all') return this.results;
    return this.results.filter(r => r.media_type === this.filter);
  }

  loadMore(): void {
    if (this.loadingMore || this.currentPage >= this.totalPages || !this.query.trim()) return;
    this.loadingMore = true;
    this.tmdb.searchMulti(this.query, this.currentPage + 1)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: res => {
          const novos = res.results.filter(r => r.media_type !== 'person');
          this.results = [...this.results, ...novos];
          this.currentPage = res.page;
          this.totalPages = res.total_pages;
          this.loadingMore = false;
        },
        error: () => { this.loadingMore = false; }
      });
  }

  goTo(item: MultiSearchResult): void {
    sessionStorage.setItem(STATE_KEY, JSON.stringify({
      query: this.query,
      filter: this.filter,
      results: this.results,
      currentPage: this.currentPage,
      totalPages: this.totalPages,
      scrollY: window.scrollY
    } as SearchState));
    if (item.media_type === 'movie') this.router.navigate(['/movie', item.id]);
    else this.router.navigate(['/series', item.id]);
  }

  getTitle(item: MultiSearchResult): string {
    return item.title || item.name || '';
  }

  getYear(item: MultiSearchResult): string {
    const date = item.release_date || item.first_air_date || '';
    return date.substring(0, 4);
  }

  getPosterUrl(path: string | null): string {
    return this.tmdb.getImageUrl(path || '', 'w342');
  }

  countByFilter(f: MediaFilter): number {
    if (f === 'all') return this.results.length;
    return this.results.filter(r => r.media_type === f).length;
  }
}
