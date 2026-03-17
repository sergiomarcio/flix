import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { Movie, MovieResponse, TmdbService } from '../../../services/tmdb.service';
import { MovieCardComponent } from '../card/card.component';

interface PageConfig {
  title: string;
  icon: string;
  loader: (page: number) => any;
}

@Component({
  selector: 'app-movie-list',
  standalone: true,
  imports: [CommonModule, MovieCardComponent],
  templateUrl: './list.component.html',
  styleUrl: './list.component.scss'
})
export class MovieListComponent implements OnInit, OnDestroy {
  movies: Movie[] = [];
  pageTitle = '';
  pageIcon = '';
  loading = false;
  currentPage = 1;
  totalPages = 1;

  private destroy$ = new Subject<void>();

  private configs: Record<string, PageConfig> = {
    popular: {
      title: 'Filmes Populares',
      icon: '🔥',
      loader: (p) => this.tmdbService.getPopularMovies(p)
    },
    'top-rated': {
      title: 'Filmes Mais Votados',
      icon: '🏆',
      loader: (p) => this.tmdbService.getTopRatedMovies(p)
    },
    'now-playing': {
      title: 'Filmes Em Cartaz',
      icon: '🎭',
      loader: (p) => this.tmdbService.getNowPlayingMovies(p)
    }
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private tmdbService: TmdbService
  ) { }

  ngOnInit(): void {
    this.route.data.pipe(takeUntil(this.destroy$)).subscribe(data => {
      const type = data['type'] as string;
      const config = this.configs[type];
      if (config) {
        this.pageTitle = config.title;
        this.pageIcon = config.icon;
        this.loadMovies(config, 1);
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadMovies(config: PageConfig, page: number): void {
    this.loading = true;
    config.loader(page).pipe(takeUntil(this.destroy$)).subscribe({
      next: (response: MovieResponse) => {
        this.movies = page === 1 ? response.results : [...this.movies, ...response.results];
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
      this.loadMovies(config, this.currentPage + 1);
    }
  }

  goToMovie(movie: Movie): void {
    this.router.navigate(['/movie', movie.id]);
  }
}
