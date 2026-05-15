import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { SupabaseService, UserMovie } from '../../../services/supabase.service';
import { TmdbService } from '../../../services/tmdb.service';

type DateBucket = 'available' | 'this_week' | 'this_month' | 'future' | 'older' | 'no_date';

interface ScheduleGroup {
  bucket: DateBucket;
  label: string;
  emoji: string;
  items: UserMovie[];
}

@Component({
  selector: 'app-movie-schedule',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './schedule.component.html',
  styleUrl: './schedule.component.scss'
})
export class MovieScheduleComponent implements OnInit {
  loading = true;
  groups: ScheduleGroup[] = [];
  totalItems = 0;
  today!: Date;

  constructor(
    private supabase: SupabaseService,
    private tmdb: TmdbService,
    public router: Router
  ) { }

  ngOnInit(): void {
    this.today = new Date();
    this.today.setHours(0, 0, 0, 0);
    this.loadSchedule();
  }

  async loadSchedule(): Promise<void> {
    this.loading = true;
    try {
      const allMovies = await this.supabase.getUserMovies();
      const pending = allMovies.filter(m => m.status === 'want_to_watch');
      this.totalItems = pending.length;
      this.buildGroups(pending);
    } catch (err) {
      console.error('Erro ao carregar agenda de filmes:', err);
    } finally {
      this.loading = false;
    }
  }

  private parseDate(dateStr: string): Date | null {
    if (!dateStr) return null;
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    date.setHours(0, 0, 0, 0);
    return date;
  }

  private getBucket(movie: UserMovie): DateBucket {
    const date = this.parseDate(movie.release_date);
    if (!date) return 'no_date';
    const diffDays = Math.floor((date.getTime() - this.today.getTime()) / 86400000);
    if (diffDays > 30) return 'future';
    if (diffDays > 7) return 'this_month';
    if (diffDays > 0) return 'this_week';
    // Já lançado — verifica se é do mês corrente ou do mês anterior
    const prevMonth = new Date(this.today.getFullYear(), this.today.getMonth() - 1, 1);
    const movieMonth = new Date(date.getFullYear(), date.getMonth(), 1);
    const currentMonth = new Date(this.today.getFullYear(), this.today.getMonth(), 1);
    if (movieMonth >= prevMonth && movieMonth <= currentMonth) return 'available';
    return 'older';
  }

  private buildGroups(movies: UserMovie[]): void {
    const bucketDefs: { bucket: DateBucket; label: string; emoji: string }[] = [
      { bucket: 'available', label: 'Disponível', emoji: '🎬' },
      { bucket: 'this_week', label: 'Esta Semana', emoji: '🗓️' },
      { bucket: 'this_month', label: 'Este Mês', emoji: '📆' },
      { bucket: 'future', label: 'Em Breve', emoji: '⏳' },
      { bucket: 'older', label: 'Lançamentos Anteriores', emoji: '🎞️' },
      { bucket: 'no_date', label: 'Sem Data', emoji: '❓' },
    ];

    const grouped = new Map<DateBucket, UserMovie[]>();
    for (const movie of movies) {
      const bucket = this.getBucket(movie);
      if (!grouped.has(bucket)) grouped.set(bucket, []);
      grouped.get(bucket)!.push(movie);
    }

    for (const [bucket, items] of grouped) {
      if (bucket === 'available' || bucket === 'older') {
        items.sort((a, b) => (b.release_date || '').localeCompare(a.release_date || ''));
      } else {
        items.sort((a, b) => (a.release_date || '').localeCompare(b.release_date || ''));
      }
    }

    this.groups = bucketDefs
      .filter(def => (grouped.get(def.bucket)?.length ?? 0) > 0)
      .map(def => ({ ...def, items: grouped.get(def.bucket)! }));
  }

  getPosterUrl(path: string): string {
    return this.tmdb.getImageUrl(path, 'w185');
  }

  formatDate(dateStr: string): string {
    const date = this.parseDate(dateStr);
    if (!date) return '';
    return date.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  }

  getDaysLabel(dateStr: string): string {
    const date = this.parseDate(dateStr);
    if (!date) return '';
    const diffDays = Math.floor((date.getTime() - this.today.getTime()) / 86400000);
    if (diffDays === 0) return 'Hoje!';
    if (diffDays === 1) return 'Amanhã';
    if (diffDays < 0) {
      const abs = Math.abs(diffDays);
      return abs === 1 ? 'Ontem' : `Há ${abs} dias`;
    }
    return `Em ${diffDays} dias`;
  }

  isAvailable(dateStr: string): boolean {
    const date = this.parseDate(dateStr);
    if (!date) return false;
    return date.getTime() <= this.today.getTime();
  }

  getYear(date: string): string {
    return date ? date.substring(0, 4) : '';
  }

  goToMovie(id: number): void {
    this.router.navigate(['/movie', id]);
  }
}
