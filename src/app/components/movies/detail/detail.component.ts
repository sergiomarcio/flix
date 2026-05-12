import { CommonModule, Location } from '@angular/common';
import { Component, ElementRef, HostListener, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { SafeUrlPipe } from '../../../pipes/safe-url.pipe';
import { environment } from '../../../../environments/environment';
import { MovieComment, SupabaseService, WatchStatus } from '../../../services/supabase.service';
import { Movie, MovieCastMember, MovieCrewMember, MovieDetail, MovieImage, MovieVideo, TmdbService, WatchProvider } from '../../../services/tmdb.service';
import { MovieCardComponent } from '../card/card.component';

@Component({
  selector: 'app-movie-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, MovieCardComponent, SafeUrlPipe],
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
  streamingProviders: WatchProvider[] = [];

  comments: MovieComment[] = [];
  newComment = '';
  savingComment = false;
  editingId: string | null = null;
  editingText = '';
  showEmojiPicker = false;
  showEditEmojiPicker = false;
  showGifPicker = false;
  showEditGifPicker = false;
  gifQuery = '';
  gifResults: { thumb: string; full: string }[] = [];
  selectedGif: string | null = null;
  editSelectedGif: string | null = null;
  private gifTimer: ReturnType<typeof setTimeout> | null = null;
@ViewChild('newCommentRef') newCommentRef!: ElementRef<HTMLTextAreaElement>;
  @ViewChild('editCommentRef') editCommentRef!: ElementRef<HTMLTextAreaElement>;

  readonly emojis = [
    '😀', '😂', '😍', '🥰', '😎', '🤩', '😢', '😭', '😡', '🤯',
    '👍', '👎', '❤️', '🔥', '⭐', '💯', '🎬', '🎭', '🎥', '🍿',
    '😱', '🤔', '🙄', '😴', '🤣', '😏', '🥹', '😤', '🤦', '🙌',
    '👏', '💪', '🤝', '✌️', '🫶', '💀', '👻', '🎉', '🏆', '💎',
  ];
  rentProviders: WatchProvider[] = [];
  buyProviders: WatchProvider[] = [];
  providersLink = '';

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
      images: this.tmdbService.getMovieImages(id),
      providers: this.tmdbService.getMovieWatchProviders(id)
    }).subscribe({
      next: ({ detail, videos, similar, credits, images, providers }) => {
        this.movie = detail;
        this.similarMovies = similar.results.slice(0, 6);
        this.trailer = videos.results.find(v => v.type === 'Trailer' && v.site === 'YouTube') || null;

        this.director = credits.crew.find(c => c.job === 'Director') || null;
        this.writers = credits.crew.filter(c => c.job === 'Screenplay' || c.job === 'Writer' || c.job === 'Story').slice(0, 3);
        this.cast = credits.cast.slice(0, 15);
        this.photos = images.backdrops.slice(0, 12);

        const br = providers.results['BR'];
        this.streamingProviders = br?.flatrate ?? [];
        this.rentProviders = br?.rent ?? [];
        this.buyProviders = br?.buy ?? [];
        this.providersLink = br?.link ?? '';

        this.loading = false;
        this.loadStatus(id);
        this.loadComments(id);
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
    if (!path) return 'assets/no-poster.svg';
    return this.tmdbService.getImageUrl(path, 'w185');
  }

  getPhotoUrl(path: string): string {
    return this.tmdbService.getImageUrl(path, 'w780');
  }

  getProviderLogoUrl(path: string): string {
    return this.tmdbService.getImageUrl(path, 'w185');
  }

  getYear(): string {
    if (!this.movie?.release_date) return '';
    return this.movie.release_date.substring(0, 4);
  }

  getReleaseDate(): string {
    if (!this.movie?.release_date) return '';
    const [y, m, d] = this.movie.release_date.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
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

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.emoji-panel') && !target.closest('.emoji-trigger')) {
      this.showEmojiPicker = false;
      this.showEditEmojiPicker = false;
    }
    if (!target.closest('.gif-panel') && !target.closest('.gif-trigger')) {
      this.showGifPicker = false;
      this.showEditGifPicker = false;
    }
  }

  onGifQueryChange(query: string): void {
    if (this.gifTimer) clearTimeout(this.gifTimer);
    this.gifTimer = setTimeout(() => this.searchGifs(query), 450);
  }

  async searchGifs(query: string): Promise<void> {
    if (!query.trim()) { this.gifResults = []; return; }
    const key = environment.giphyApiKey;
    const url = `https://api.giphy.com/v1/gifs/search?api_key=${key}&q=${encodeURIComponent(query)}&limit=12&rating=g`;
    try {
      const res = await fetch(url);
      const json = await res.json();
      this.gifResults = (json.data ?? []).map((g: any) => ({
        thumb: g.images?.fixed_height_small?.url ?? g.images?.original?.url,
        full: g.images?.fixed_height?.url ?? g.images?.original?.url
      }));
    } catch { this.gifResults = []; }
  }

  selectGif(gif: { thumb: string; full: string }, mode: 'new' | 'edit'): void {
    if (mode === 'new') {
      this.selectedGif = gif.full;
      this.showGifPicker = false;
    } else {
      this.editSelectedGif = gif.full;
      this.showEditGifPicker = false;
    }
  }

  removeGif(mode: 'new' | 'edit'): void {
    if (mode === 'new') this.selectedGif = null;
    else this.editSelectedGif = null;
  }

  insertEmoji(emoji: string, target: 'new' | 'edit'): void {
    const ref = target === 'new' ? this.newCommentRef : this.editCommentRef;
    const el = ref?.nativeElement;
    if (!el) return;
    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? el.value.length;
    const before = el.value.substring(0, start);
    const after = el.value.substring(end);
    const newVal = before + emoji + after;
    if (target === 'new') {
      this.newComment = newVal;
    } else {
      this.editingText = newVal;
    }
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + emoji.length, start + emoji.length);
    });
  }

  async loadComments(id: number): Promise<void> {
    try {
      this.comments = await this.supabaseService.getMovieComments(id);
    } catch { }
  }

  async submitComment(): Promise<void> {
    if (!this.newComment.trim() && !this.selectedGif) return;
    if (!this.movie) return;
    this.savingComment = true;
    try {
      const added = await this.supabaseService.addMovieComment(this.movie.id, this.newComment.trim(), this.selectedGif);
      this.comments = [added, ...this.comments];
      this.newComment = '';
      this.selectedGif = null;
    } catch { }
    this.savingComment = false;
  }

  startEdit(c: MovieComment): void {
    this.editingId = c.id;
    this.editingText = c.comment;
    this.editSelectedGif = c.gif_url ?? null;
  }

  cancelEdit(): void {
    this.editingId = null;
    this.editingText = '';
    this.editSelectedGif = null;
    this.showEditGifPicker = false;
    this.showEditEmojiPicker = false;
  }

  async saveEdit(c: MovieComment): Promise<void> {
    if (!this.editingText.trim() && !this.editSelectedGif) return;
    this.savingComment = true;
    try {
      await this.supabaseService.updateMovieComment(c.id, this.editingText.trim(), this.editSelectedGif);
      c.comment = this.editingText.trim();
      c.gif_url = this.editSelectedGif;
      c.updated_at = new Date().toISOString();
      this.cancelEdit();
    } catch { }
    this.savingComment = false;
  }

  async deleteComment(id: string): Promise<void> {
    try {
      await this.supabaseService.deleteMovieComment(id);
      this.comments = this.comments.filter(c => c.id !== id);
    } catch { }
  }

  isOwnComment(c: MovieComment): boolean {
    return c.user_id === this.supabaseService.currentUser?.id;
  }

  formatCommentDate(dateStr: string): string {
    const d = new Date(dateStr);
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  getEmailUser(email: string): string {
    return email.split('@')[0];
  }

  goBack(): void {
    this.location.back();
  }

  goToPerson(id: number): void {
    this.router.navigate(['/person', id]);
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
