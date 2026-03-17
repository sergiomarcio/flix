import { Location } from '@angular/common';
import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { SafeUrlPipe } from '../../../pipes/safe-url.pipe';
import { SupabaseService, WatchStatus } from '../../../services/supabase.service';
import { Movie, MovieCastMember, MovieCrewMember, MovieDetail, MovieImage, MovieVideo, TmdbService } from '../../../services/tmdb.service';
import { MovieCardComponent } from '../card/card.component';

@Component({
  selector: 'app-movie-detail',
  standalone: true,
  imports: [CommonModule, MovieCardComponent, SafeUrlPipe],
  templateUrl: './detail.component.html',
  styleUrl: './detail.component.scss'
})
export class MovieDetailComponent implements OnInit {
  movie: MovieDetail | null = null;
  similarMovies: Movie[] = [];
  trailer: MovieVideo | null = null;
  status: WatchStatus | null = null;
  liked: 'liked' | 'neutral' | 'disliked' | null = null;
  loading = true;
  saving = false;
  showTrailer = false;

  director: MovieCrewMember | null = null;
  writers: MovieCrewMember[] = [];
  cast: MovieCastMember[] = [];
  photos: MovieImage[] = [];
  showAllCast = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private location: Location,
    private tmdbService: TmdbService,
    private supabaseService: SupabaseService
  ) { }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      const id = +params['id'];
      this.loadMovie(id);
    });
  }

  loadMovie(id: number): void {
    this.loading = true;
    this.showTrailer = false;
    this.showAllCast = false;

    forkJoin({
      detail: this.tmdbService.getMovieDetail(id),
      videos: this.tmdbService.getMovieVideos(id),
      similar: this.tmdbService.getSimilarMovies(id),
      credits: this.tmdbService.getMovieCredits(id),
      images: this.tmdbService.getMovieImages(id)
    }).subscribe({
      next: ({ detail, videos, similar, credits, images }) => {
        this.movie = detail;
        this.similarMovies = similar.results.slice(0, 6);
        this.trailer = videos.results.find(v => v.type === 'Trailer' && v.site === 'YouTube') || null;

        this.director = credits.crew.find(c => c.job === 'Director') || null;
        this.writers = credits.crew.filter(c => c.job === 'Screenplay' || c.job === 'Writer' || c.job === 'Story').slice(0, 3);
        this.cast = credits.cast.slice(0, 15);
        this.photos = images.backdrops.slice(0, 12);

        this.loading = false;
        this.loadStatus(id);
        window.scrollTo(0, 0);
      },
      error: () => { this.loading = false; }
    });
  }

  async loadStatus(id: number): Promise<void> {
    try {
      const movies = await this.supabaseService.getUserMovies();
      const found = movies.find(m => m.movie_id === id);
      this.status = found?.status ?? null;
      this.liked = found?.liked ?? null;
    } catch { }
  }

  async setStatus(newStatus: WatchStatus): Promise<void> {
    if (!this.movie) return;
    this.saving = true;
    try {
      await this.supabaseService.setMovieStatus({
        movie_id: this.movie.id,
        movie_title: this.movie.title,
        poster_path: this.movie.poster_path,
        release_date: this.movie.release_date,
        vote_average: this.movie.vote_average,
        runtime: this.movie.runtime || undefined,
        status: newStatus
      });
      this.status = newStatus;
      if (newStatus === 'want_to_watch') {
        await this.supabaseService.setMovieLike(this.movie.id, null);
        this.liked = null;
      }
    } catch (err) {
      console.error('Erro ao salvar:', err);
    } finally {
      this.saving = false;
    }
  }

  async setLike(value: 'liked' | 'neutral' | 'disliked'): Promise<void> {
    if (!this.movie) return;
    this.saving = true;
    try {
      const newLiked = this.liked === value ? null : value;
      await this.supabaseService.setMovieLike(this.movie.id, newLiked);
      this.liked = newLiked;
    } catch (err) {
      console.error('Erro ao salvar avaliação:', err);
    } finally {
      this.saving = false;
    }
  }

  async removeStatus(): Promise<void> {
    if (!this.movie) return;
    this.saving = true;
    try {
      await this.supabaseService.removeMovieStatus(this.movie.id);
      this.status = null;
      this.liked = null;
    } catch { }
    this.saving = false;
  }

  getBackdropUrl(): string {
    if (!this.movie) return '';
    return this.tmdbService.getBackdropUrl(this.movie.backdrop_path);
  }

  getPosterUrl(): string {
    if (!this.movie) return '';
    return this.tmdbService.getImageUrl(this.movie.poster_path, 'w500');
  }

  getProfileUrl(path: string | null): string {
    if (!path) return 'assets/no-poster.jpg';
    return this.tmdbService.getImageUrl(path, 'w185');
  }

  getPhotoUrl(path: string): string {
    return this.tmdbService.getImageUrl(path, 'w780');
  }

  getYear(): string {
    if (!this.movie?.release_date) return '';
    return this.movie.release_date.substring(0, 4);
  }

  getRuntime(): string {
    if (!this.movie?.runtime) return '';
    const h = Math.floor(this.movie.runtime / 60);
    const m = this.movie.runtime % 60;
    return h > 0 ? `${h}h ${m}min` : `${m}min`;
  }

  getRating(): string {
    return this.movie?.vote_average.toFixed(1) || '0.0';
  }

  goToMovie(movie: Movie): void {
    this.router.navigate(['/movie', movie.id]);
  }

  getCompanies(): string {
    if (!this.movie?.production_companies) return '';
    return this.movie.production_companies.slice(0, 3).map(c => c.name).join(', ');
  }

  goBack(): void {
    this.location.back();
  }

  openTrailer(): void {
    this.showTrailer = true;
  }

  closeTrailer(): void {
    this.showTrailer = false;
  }

  get visibleCast(): MovieCastMember[] {
    return this.showAllCast ? this.cast : this.cast.slice(0, 6);
  }
}
