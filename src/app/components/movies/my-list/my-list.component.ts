import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { SupabaseService, UserMovie, WatchStatus } from '../../../services/supabase.service';
import { TmdbService } from '../../../services/tmdb.service';

@Component({
  selector: 'app-my-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './my-list.component.html',
  styleUrl: './my-list.component.scss'
})
export class MyListComponent implements OnInit {
  allMovies: UserMovie[] = [];
  filteredMovies: UserMovie[] = [];
  activeFilter: WatchStatus | 'all' = 'all';
  sortBy: 'name' | 'year' = 'name';
  sortDir: 'asc' | 'desc' = 'asc';
  loading = true;
  stats = { watched: 0, want_to_watch: 0 };

  constructor(
    private supabaseService: SupabaseService,
    private tmdbService: TmdbService,
    public router: Router
  ) { }

  ngOnInit(): void {
    this.loadMovies();
  }

  async loadMovies(): Promise<void> {
    this.loading = true;
    try {
      this.allMovies = await this.supabaseService.getUserMovies();
      this.stats = await this.supabaseService.getStats();
      this.applyFilter(this.activeFilter);
    } catch (err) {
      console.error('Erro ao carregar filmes:', err);
    } finally {
      this.loading = false;
    }
  }

  applyFilter(filter: WatchStatus | 'all'): void {
    this.activeFilter = filter;
    const base = filter === 'all' ? [...this.allMovies] : this.allMovies.filter(m => m.status === filter);
    this.filteredMovies = this.sortList(base);
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

  private sortList(list: UserMovie[]): UserMovie[] {
    return [...list].sort((a, b) => {
      const cmp = this.sortBy === 'name'
        ? a.movie_title.localeCompare(b.movie_title)
        : (a.release_date || '').localeCompare(b.release_date || '');
      return this.sortDir === 'asc' ? cmp : -cmp;
    });
  }

  getPosterUrl(path: string): string {
    return this.tmdbService.getImageUrl(path, 'w185');
  }

  getStatusLabel(status: WatchStatus): string {
    switch (status) {
      case 'watched': return '✅ Vi';
      case 'want_to_watch': return '⭐ Quero Ver';
      default: return '';
    }
  }

  getYear(date: string): string {
    return date ? date.substring(0, 4) : '';
  }

  goToMovie(movieId: number): void {
    this.router.navigate(['/movie', movieId]);
  }

  async removeMovie(event: Event, movieId: number): Promise<void> {
    event.stopPropagation();
    try {
      await this.supabaseService.removeMovieStatus(movieId);
      this.allMovies = this.allMovies.filter(m => m.movie_id !== movieId);
      this.stats = await this.supabaseService.getStats();
      this.applyFilter(this.activeFilter);
    } catch { }
  }
}
