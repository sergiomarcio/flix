import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { TVResponse, TVShow, TmdbService } from '../../../services/tmdb.service';

interface PageConfig {
  title: string;
  icon: string;
  loader: (page: number) => any;
}

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
    private tmdb: TmdbService
  ) {}

  ngOnInit(): void {
    this.route.data.pipe(takeUntil(this.destroy$)).subscribe(data => {
      const type = data['type'] as string;
      const config = this.configs[type];
      if (config) {
        this.shows = [];
        this.pageTitle = config.title;
        this.pageIcon = config.icon;
        this.loadShows(config, 1);
      }
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
    this.router.navigate(['/series', show.id]);
  }

  getImageUrl(path: string): string {
    return this.tmdb.getImageUrl(path, 'w342');
  }

  getYear(date: string): string {
    return date ? date.substring(0, 4) : '';
  }
}
