import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, Injectable, Input, OnChanges, OnDestroy } from '@angular/core';
import { Observable, Subscription, catchError, of, shareReplay, switchMap } from 'rxjs';
import { OscarsService } from '../../../services/oscars.service';
import { TmdbService } from '../../../services/tmdb.service';

@Injectable({ providedIn: 'root' })
export class MovieOscarBadgeService {
  private movies = new Map<number, Observable<boolean>>();
  constructor(private tmdb: TmdbService, private oscars: OscarsService) {}
  hasWon(id: number): Observable<boolean> {
    if (!this.movies.has(id)) {
      this.movies.set(id, this.tmdb.getMovieDetail(id).pipe(
        switchMap(movie => movie.imdb_id ? this.oscars.hasMovieWon(movie.imdb_id) : of(false)),
        catchError(() => { this.movies.delete(id); return of(false); }),
        shareReplay({ bufferSize: 1, refCount: true })
      ));
    }
    return this.movies.get(id)!;
  }
}

@Component({
  selector: 'app-oscar-badge', standalone: true, imports: [CommonModule],
  template: '<span *ngIf="won" class="oscar-badge" title="Filme vencedor de Oscar na base histórica. Veja as categorias nos detalhes." aria-label="Filme vencedor de Oscar"><span aria-hidden="true">🏆</span> Oscar</span>',
  styles: [':host { display: inline-block; min-height: 1px; min-width: 1px; } .oscar-badge { display: inline-flex; align-items: center; gap: 3px; padding: 3px 6px; border-radius: 4px; background: #211b08; color: #f5d76e; font-size: .7rem; font-weight: 700; white-space: nowrap; }']
})
export class OscarBadgeComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() movieId!: number;
  won = false;
  private visible = false;
  private observer?: IntersectionObserver;
  private subscription?: Subscription;
  constructor(private element: ElementRef<HTMLElement>, private badges: MovieOscarBadgeService) {}
  ngAfterViewInit(): void {
    if (typeof IntersectionObserver === 'undefined') { this.visible = true; this.load(); return; }
    this.observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) {
        this.visible = true; this.observer?.disconnect(); this.load();
      }
    });
    this.observer.observe(this.element.nativeElement);
  }
  ngOnChanges(): void {
    this.subscription?.unsubscribe(); this.won = false;
    if (this.visible) this.load();
  }
  private load(): void {
    this.subscription?.unsubscribe();
    this.subscription = this.badges.hasWon(this.movieId).subscribe(won => this.won = won);
  }
  ngOnDestroy(): void { this.observer?.disconnect(); this.subscription?.unsubscribe(); }
}
