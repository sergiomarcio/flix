import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { SeriesStatus, SupabaseService, UserSeries } from '../../../services/supabase.service';
import { TmdbService, TVShowDetail } from '../../../services/tmdb.service';

interface ScheduleItem {
  userSeries: UserSeries;
  detail: TVShowDetail;
  airDate: Date | null;
}

type DateBucket = 'today' | 'this_week' | 'next_week' | 'future' | 'no_date' | 'want_to_watch_no_date';

interface ScheduleGroup {
  bucket: DateBucket;
  label: string;
  emoji: string;
  items: ScheduleItem[];
}

@Component({
  selector: 'app-series-schedule',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './schedule.component.html',
  styleUrl: './schedule.component.scss'
})
export class SeriesScheduleComponent implements OnInit {
  loading = true;
  groups: ScheduleGroup[] = [];
  totalItems = 0;
  today!: Date;

  constructor(
    private supabase: SupabaseService,
    private tmdb: TmdbService,
    public router: Router
  ) {}

  ngOnInit(): void {
    this.today = new Date();
    this.today.setHours(0, 0, 0, 0);
    this.loadSchedule();
  }

  async loadSchedule(): Promise<void> {
    this.loading = true;
    try {
      const allSeries = await this.supabase.getUserSeries();
      const relevant = allSeries.filter(s => s.status === 'watching' || s.status === 'want_to_watch');

      const items = await Promise.all(
        relevant.map(async (s): Promise<ScheduleItem | null> => {
          try {
            const detail = await firstValueFrom(this.tmdb.getShowDetail(s.series_id));
            const nextEp = detail.next_episode_to_air;
            const airDate = nextEp?.air_date ? this.parseDate(nextEp.air_date) : null;
            return { userSeries: s, detail, airDate };
          } catch {
            return null;
          }
        })
      );

      const validItems = items.filter((i): i is ScheduleItem => i !== null);
      this.totalItems = validItems.length;
      this.buildGroups(validItems);
    } catch (err) {
      console.error('Erro ao carregar agenda:', err);
    } finally {
      this.loading = false;
    }
  }

  private parseDate(dateStr: string): Date {
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    date.setHours(0, 0, 0, 0);
    return date;
  }

  private getBucket(item: ScheduleItem): DateBucket {
    if (!item.airDate) {
      return item.userSeries.status === 'want_to_watch' ? 'want_to_watch_no_date' : 'no_date';
    }
    const diffDays = Math.floor((item.airDate.getTime() - this.today.getTime()) / 86400000);
    if (diffDays === 0) return 'today';
    if (diffDays >= 1 && diffDays <= 7) return 'this_week';
    if (diffDays >= 8 && diffDays <= 14) return 'next_week';
    if (diffDays > 14) return 'future';
    // data passada — TMDB ainda não atualizou
    return item.userSeries.status === 'want_to_watch' ? 'want_to_watch_no_date' : 'no_date';
  }

  private buildGroups(items: ScheduleItem[]): void {
    const bucketDefs: { bucket: DateBucket; label: string; emoji: string }[] = [
      { bucket: 'today',                 label: 'Hoje',             emoji: '📅' },
      { bucket: 'this_week',             label: 'Esta Semana',      emoji: '🗓️' },
      { bucket: 'next_week',             label: 'Próxima Semana',   emoji: '📆' },
      { bucket: 'future',                label: 'Em Breve',         emoji: '⏳' },
      { bucket: 'no_date',               label: 'Aguardando Data',  emoji: '🔔' },
      { bucket: 'want_to_watch_no_date', label: 'Quero Ver',        emoji: '⭐' },
    ];

    const grouped = new Map<DateBucket, ScheduleItem[]>();
    for (const item of items) {
      const bucket = this.getBucket(item);
      if (!grouped.has(bucket)) grouped.set(bucket, []);
      grouped.get(bucket)!.push(item);
    }

    for (const [, groupItems] of grouped) {
      groupItems.sort((a, b) => {
        if (a.airDate && b.airDate) return a.airDate.getTime() - b.airDate.getTime();
        if (a.airDate) return -1;
        if (b.airDate) return 1;
        return a.userSeries.series_name.localeCompare(b.userSeries.series_name);
      });
    }

    this.groups = bucketDefs
      .filter(def => (grouped.get(def.bucket)?.length ?? 0) > 0)
      .map(def => ({ ...def, items: grouped.get(def.bucket)! }));
  }

  getPosterUrl(path: string): string {
    return this.tmdb.getImageUrl(path, 'w185');
  }

  getStillUrl(path: string | null): string {
    if (!path) return '';
    return this.tmdb.getImageUrl(path, 'w342');
  }

  formatDate(date: Date | null): string {
    if (!date) return '';
    return date.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
  }

  getDaysLabel(date: Date | null): string {
    if (!date) return '';
    const diffDays = Math.floor((date.getTime() - this.today.getTime()) / 86400000);
    if (diffDays === 0) return 'Hoje!';
    if (diffDays === 1) return 'Amanhã';
    if (diffDays < 0) return 'Recente';
    return `Em ${diffDays} dias`;
  }

  formatEpCode(season: number, episode: number): string {
    return `S${String(season).padStart(2, '0')}E${String(episode).padStart(2, '0')}`;
  }

  getStatusLabel(status: SeriesStatus): string {
    switch (status) {
      case 'watching':      return '▶ Assistindo';
      case 'watched':       return '✅ Concluída';
      case 'want_to_watch': return '⭐ Quero Ver';
      default:              return '';
    }
  }

  getShowStatusLabel(status: string): string {
    const map: Record<string, string> = {
      'Returning Series': 'Em andamento',
      'Ended':            'Finalizada',
      'Canceled':         'Cancelada',
      'In Production':    'Em produção',
      'Planned':          'Planejada',
    };
    return map[status] ?? status;
  }

  goToSeries(id: number): void {
    this.router.navigate(['/series', id]);
  }
}
