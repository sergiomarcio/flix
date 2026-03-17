import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Location } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom, forkJoin } from 'rxjs';
import { SafeUrlPipe } from '../../../pipes/safe-url.pipe';
import { SeriesStatus, SupabaseService, WatchedEpisode } from '../../../services/supabase.service';
import { MovieCastMember, MovieImage, MovieVideo, TVSeason, TVShowDetail, TmdbService, WatchProvider } from '../../../services/tmdb.service';
import { PersonModalComponent } from '../../person-modal/person-modal.component';

@Component({
  selector: 'app-series-detail',
  standalone: true,
  imports: [CommonModule, SafeUrlPipe, PersonModalComponent],
  templateUrl: './detail.component.html',
  styleUrl: './detail.component.scss'
})
export class SeriesDetailComponent implements OnInit {
  show: TVShowDetail | null = null;
  trailer: MovieVideo | null = null;
  status: SeriesStatus | null = null;
  loading = true;
  saving = false;
  showTrailer = false;
  seasonWatchedMap: Map<number, Set<number>> = new Map();
  markingSet = new Set<number>();
  streamingProviders: WatchProvider[] = [];
  rentProviders: WatchProvider[] = [];
  buyProviders: WatchProvider[] = [];
  providersLink = '';
  photos: MovieImage[] = [];
  cast: MovieCastMember[] = [];
  showAllCast = false;
  selectedPersonId: number | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private location: Location,
    private tmdb: TmdbService,
    private supabase: SupabaseService
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.loadShow(+params['id']);
    });
  }

  loadShow(id: number): void {
    this.loading = true;
    forkJoin({
      detail: this.tmdb.getShowDetail(id),
      videos: this.tmdb.getShowVideos(id),
      providers: this.tmdb.getShowWatchProviders(id),
      images: this.tmdb.getShowImages(id),
      credits: this.tmdb.getShowCredits(id)
    }).subscribe({
      next: ({ detail, videos, providers, images, credits }) => {
        this.show = detail;
        this.trailer = videos.results.find(v => v.type === 'Trailer' && v.site === 'YouTube') || null;

        const br = providers.results['BR'];
        this.streamingProviders = br?.flatrate ?? [];
        this.rentProviders = br?.rent ?? [];
        this.buyProviders = br?.buy ?? [];
        this.providersLink = br?.link ?? '';
        this.photos = images.backdrops.slice(0, 12);
        this.cast = credits.cast.slice(0, 15);

        this.loading = false;
        this.loadStatus(id);
        this.loadSeasonWatched(id);
        window.scrollTo(0, 0);
      },
      error: () => { this.loading = false; }
    });
  }

  async loadStatus(id: number): Promise<void> {
    try {
      this.status = await this.supabase.getSeriesStatus(id);
    } catch {}
  }

  async loadSeasonWatched(seriesId: number): Promise<void> {
    try {
      const episodes = await this.supabase.getWatchedEpisodes(seriesId);
      const map = new Map<number, Set<number>>();
      for (const ep of episodes) {
        if (!map.has(ep.season_number)) map.set(ep.season_number, new Set());
        map.get(ep.season_number)!.add(ep.episode_number);
      }
      this.seasonWatchedMap = map;
    } catch {}
  }

  getSeasonWatchedCount(seasonNumber: number): number {
    return this.seasonWatchedMap.get(seasonNumber)?.size ?? 0;
  }

  isSeasonFullyWatched(season: TVSeason): boolean {
    return this.getSeasonWatchedCount(season.season_number) >= season.episode_count;
  }

  async markSeasonAllWatched(season: TVSeason, event: MouseEvent): Promise<void> {
    event.stopPropagation();
    if (!this.show || this.markingSet.has(season.season_number)) return;
    this.markingSet = new Set(this.markingSet);
    this.markingSet.add(season.season_number);
    try {
      const detail = await firstValueFrom(this.tmdb.getSeasonDetail(this.show.id, season.season_number));
      if (!detail) return;
      const watched = this.seasonWatchedMap.get(season.season_number) ?? new Set<number>();
      const unwatched = detail.episodes.filter(ep => !watched.has(ep.episode_number));
      await Promise.all(unwatched.map(ep =>
        this.supabase.setEpisodeWatched({
          series_id: this.show!.id,
          season_number: season.season_number,
          episode_number: ep.episode_number,
          episode_name: ep.name,
          runtime: ep.runtime ?? undefined
        } as WatchedEpisode)
      ));
      const newSet = new Set<number>(detail.episodes.map(e => e.episode_number));
      this.seasonWatchedMap = new Map(this.seasonWatchedMap).set(season.season_number, newSet);
      if (!this.status) {
        await this.supabase.setSeriesStatus({
          series_id: this.show!.id,
          series_name: this.show!.name,
          poster_path: this.show!.poster_path,
          first_air_date: this.show!.first_air_date,
          vote_average: this.show!.vote_average,
          number_of_seasons: this.show!.number_of_seasons,
          status: 'watching'
        });
        this.status = 'watching';
      }
    } catch (err) {
      console.error('Erro ao marcar temporada:', err);
    } finally {
      this.markingSet.delete(season.season_number);
      this.markingSet = new Set(this.markingSet);
    }
  }

  async unmarkSeasonAllWatched(season: TVSeason, event: MouseEvent): Promise<void> {
    event.stopPropagation();
    if (!this.show || this.markingSet.has(season.season_number)) return;
    this.markingSet = new Set(this.markingSet);
    this.markingSet.add(season.season_number);
    try {
      await this.supabase.removeSeasonWatched(this.show.id, season.season_number);
      this.seasonWatchedMap = new Map(this.seasonWatchedMap).set(season.season_number, new Set());
    } catch (err) {
      console.error('Erro ao desmarcar temporada:', err);
    } finally {
      this.markingSet.delete(season.season_number);
      this.markingSet = new Set(this.markingSet);
    }
  }

  async setStatus(newStatus: SeriesStatus): Promise<void> {
    if (!this.show) return;
    this.saving = true;
    try {
      await this.supabase.setSeriesStatus({
        series_id: this.show.id,
        series_name: this.show.name,
        poster_path: this.show.poster_path,
        first_air_date: this.show.first_air_date,
        vote_average: this.show.vote_average,
        number_of_seasons: this.show.number_of_seasons,
        status: newStatus
      });
      this.status = newStatus;
    } catch (err) {
      console.error('Erro ao salvar:', err);
    } finally {
      this.saving = false;
    }
  }

  async removeStatus(): Promise<void> {
    if (!this.show) return;
    this.saving = true;
    try {
      await Promise.all([
        this.supabase.removeSeriesStatus(this.show.id),
        this.supabase.removeAllSeriesEpisodes(this.show.id),
      ]);
      this.status = null;
      this.seasonWatchedMap = new Map();
    } catch {}
    this.saving = false;
  }

  goToSeason(season: TVSeason): void {
    this.router.navigate(['/series', this.show!.id, 'season', season.season_number]);
  }

  getBackdropUrl(): string {
    return this.tmdb.getBackdropUrl(this.show?.backdrop_path || '');
  }

  getPosterUrl(): string {
    return this.tmdb.getImageUrl(this.show?.poster_path || '', 'w500');
  }

  getSeasonPoster(path: string): string {
    return this.tmdb.getImageUrl(path, 'w185');
  }

  getYear(): string {
    return this.show?.first_air_date?.substring(0, 4) || '';
  }

  getRating(): string {
    return this.show?.vote_average.toFixed(1) || '0.0';
  }

  getRuntime(): string {
    const rt = this.show?.episode_run_time?.[0];
    if (!rt) return '';
    const h = Math.floor(rt / 60);
    const m = rt % 60;
    return h > 0 ? `${h}h ${m}min` : `${m}min`;
  }

  getStatusLabel(s: SeriesStatus): string {
    const labels: Record<SeriesStatus, string> = {
      watching: '▶ Assistindo',
      watched: '✅ Concluída',
      want_to_watch: '⭐ Quero Ver',
    };
    return labels[s];
  }

  getProfileUrl(path: string | null): string {
    if (!path) return 'assets/no-poster.jpg';
    return this.tmdb.getImageUrl(path, 'w185');
  }

  get visibleCast(): MovieCastMember[] {
    return this.showAllCast ? this.cast : this.cast.slice(0, 6);
  }

  getProviderLogoUrl(path: string): string {
    return this.tmdb.getImageUrl(path, 'w185');
  }

  getPhotoUrl(path: string): string {
    return this.tmdb.getImageUrl(path, 'w780');
  }

  get visibleSeasons(): TVSeason[] {
    return (this.show?.seasons || []).filter(s => s.season_number > 0);
  }

  goBack(): void { this.location.back(); }
  openTrailer(): void { this.showTrailer = true; }
  closeTrailer(): void { this.showTrailer = false; }
}
