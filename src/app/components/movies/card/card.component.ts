import { CommonModule } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { SupabaseService, WatchStatus } from '../../../services/supabase.service';
import { Movie, TmdbService } from '../../../services/tmdb.service';

@Component({
  selector: 'app-movie-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './card.component.html',
  styleUrl: './card.component.scss'
})
export class MovieCardComponent implements OnInit {
  @Input() movie!: Movie;

  status: WatchStatus | null = null;
  showStatusMenu = false;
  saving = false;

  constructor(
    private supabaseService: SupabaseService,
    private tmdbService: TmdbService
  ) { }

  ngOnInit(): void {
    this.loadStatus();
  }

  async loadStatus(): Promise<void> {
    try {
      this.status = await this.supabaseService.getMovieStatus(this.movie.id);
    } catch { }
  }

  getImageUrl(): string {
    return this.tmdbService.getImageUrl(this.movie.poster_path, 'w342');
  }

  getRating(): string {
    return this.movie.vote_average.toFixed(1);
  }

  getYear(): string {
    if (!this.movie.release_date) return '';
    return this.movie.release_date.substring(0, 4);
  }

  toggleStatusMenu(event: Event): void {
    event.stopPropagation();
    this.showStatusMenu = !this.showStatusMenu;
  }

  async setStatus(event: Event, newStatus: WatchStatus): Promise<void> {
    event.stopPropagation();
    this.saving = true;
    this.showStatusMenu = false;
    try {
      let runtime: number | undefined;
      try {
        const detail = await firstValueFrom(this.tmdbService.getMovieDetail(this.movie.id));
        runtime = detail.runtime || undefined;
      } catch { }

      await this.supabaseService.setMovieStatus({
        movie_id: this.movie.id,
        movie_title: this.movie.title,
        poster_path: this.movie.poster_path,
        release_date: this.movie.release_date,
        vote_average: this.movie.vote_average,
        runtime,
        status: newStatus
      });
      this.status = newStatus;
    } catch (err) {
      console.error('Erro ao salvar status:', err);
    } finally {
      this.saving = false;
    }
  }

  async removeStatus(event: Event): Promise<void> {
    event.stopPropagation();
    this.saving = true;
    this.showStatusMenu = false;
    try {
      await this.supabaseService.removeMovieStatus(this.movie.id);
      this.status = null;
    } catch { }
    this.saving = false;
  }

  getStatusLabel(): string {
    switch (this.status) {
      case 'watched': return '✅ Vi';
      case 'want_to_watch': return '⭐ Quero Ver';
      default: return '';
    }
  }

  getStatusClass(): string {
    return this.status || 'none';
  }
}

