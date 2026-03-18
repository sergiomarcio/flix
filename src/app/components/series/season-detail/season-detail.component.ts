import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { SupabaseService, WatchedEpisode } from '../../../services/supabase.service';
import { TVEpisode, TVSeasonDetail, TVShowDetail, TmdbService } from '../../../services/tmdb.service';
import { EpisodeModalComponent } from '../episode-modal/episode-modal.component';

@Component({
  selector: 'app-season-detail',
  standalone: true,
  imports: [CommonModule, EpisodeModalComponent],
  templateUrl: './season-detail.component.html',
  styleUrl: './season-detail.component.scss'
})
export class SeasonDetailComponent implements OnInit {
  season: TVSeasonDetail | null = null;
  showDetail: TVShowDetail | null = null;
  seriesId = 0;
  seriesName = '';
  seasonNumber = 0;
  loading = true;
  saving = false;
  watchedSet = new Set<number>();
  selectedEpisode: TVEpisode | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private tmdb: TmdbService,
    private supabase: SupabaseService
  ) { }

  ngOnInit(): void {
    this.route.params.subscribe(async params => {
      this.seriesId = +params['id'];
      this.seasonNumber = +params['season'];
      this.loadSeason();
    });
  }

  loadSeason(): void {
    this.loading = true;
    this.tmdb.getSeasonDetail(this.seriesId, this.seasonNumber).subscribe({
      next: (season) => {
        this.season = season;
        this.loading = false;
        this.loadWatched();
        window.scrollTo(0, 0);
      },
      error: () => { this.loading = false; }
    });
    this.tmdb.getShowDetail(this.seriesId).subscribe({
      next: (show) => { this.showDetail = show; },
      error: () => { }
    });
  }

  private async ensureSeriesInList(): Promise<void> {
    const existing = await this.supabase.getSeriesStatus(this.seriesId);
    if (existing || !this.showDetail) return;
    await this.supabase.setSeriesStatus({
      series_id: this.showDetail.id,
      series_name: this.showDetail.name,
      poster_path: this.showDetail.poster_path,
      first_air_date: this.showDetail.first_air_date,
      vote_average: this.showDetail.vote_average,
      number_of_seasons: this.showDetail.number_of_seasons,
      status: 'watching'
    });
  }

  async loadWatched(): Promise<void> {
    try {
      const episodes = await this.supabase.getWatchedEpisodes(this.seriesId);
      this.watchedSet = new Set(
        episodes
          .filter(e => e.season_number === this.seasonNumber)
          .map(e => e.episode_number)
      );
    } catch { }
  }

  isWatched(ep: TVEpisode): boolean {
    return this.watchedSet.has(ep.episode_number);
  }

  async toggleEpisode(ep: TVEpisode): Promise<void> {
    this.saving = true;
    try {
      if (this.isWatched(ep)) {
        await this.supabase.removeEpisodeWatched(this.seriesId, this.seasonNumber, ep.episode_number);
        this.watchedSet.delete(ep.episode_number);
      } else {
        const episode: WatchedEpisode = {
          series_id: this.seriesId,
          season_number: this.seasonNumber,
          episode_number: ep.episode_number,
          episode_name: ep.name,
          runtime: ep.runtime ?? undefined
        };
        await Promise.all([
          this.supabase.setEpisodeWatched(episode),
          this.ensureSeriesInList(),
        ]);
        this.watchedSet.add(ep.episode_number);
      }
      this.watchedSet = new Set(this.watchedSet); // trigger change detection
    } catch (err) {
      console.error('Erro ao salvar episódio:', err);
    } finally {
      this.saving = false;
    }
  }

  async markAllWatched(): Promise<void> {
    if (!this.season) return;
    this.saving = true;
    try {
      const unwatched = this.season.episodes.filter(ep => !this.isWatched(ep));
      await Promise.all([
        ...unwatched.map(ep =>
          this.supabase.setEpisodeWatched({
            series_id: this.seriesId,
            season_number: this.seasonNumber,
            episode_number: ep.episode_number,
            episode_name: ep.name,
            runtime: ep.runtime ?? undefined
          })
        ),
        this.ensureSeriesInList(),
      ]);
      this.watchedSet = new Set(this.season.episodes.map(e => e.episode_number));
    } catch (err) {
      console.error(err);
    } finally {
      this.saving = false;
    }
  }

  get watchedCount(): number { return this.watchedSet.size; }
  get totalCount(): number { return this.season?.episodes?.length || 0; }
  get progressPercent(): number {
    if (!this.totalCount) return 0;
    return Math.round((this.watchedCount / this.totalCount) * 100);
  }

  getStillUrl(path: string): string {
    if (!path) return '';
    return this.tmdb.getImageUrl(path, 'w342');
  }

  formatRuntime(min: number | null): string {
    if (!min) return '';
    const h = Math.floor(min / 60);
    const m = min % 60;
    return h > 0 ? `${h}h ${m}min` : `${m}min`;
  }

  getAirYear(date: string): string {
    return date ? date.substring(0, 4) : '';
  }

  goBack(): void {
    this.router.navigate(['/series', this.seriesId]);
  }
}
