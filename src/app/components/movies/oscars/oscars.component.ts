import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges, OnDestroy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Subject, catchError, from, map, mergeMap, of, switchMap, takeUntil, tap } from 'rxjs';
import { MovieOscar, OscarNominee, OscarsService } from '../../../services/oscars.service';
import { MovieTitles, TmdbService } from '../../../services/tmdb.service';

@Component({
  selector: 'app-movie-oscars',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './oscars.component.html',
  styleUrl: './oscars.component.scss'
})
export class MovieOscarsComponent implements OnChanges, OnDestroy {
  @Input() imdbId: string | null | undefined;
  awards: MovieOscar[] = [];
  throughYear = 0;
  loading = false;
  failed = false;
  expandedId: string | null = null;
  private titles = new Map<string, MovieTitles>();
  private requests$ = new Subject<string>();
  private destroy$ = new Subject<void>();

  constructor(private oscars: OscarsService, private tmdb: TmdbService) {
    this.requests$.pipe(
      tap(() => {
        this.loading = true;
        this.failed = false;
        this.awards = [];
        this.throughYear = 0;
        this.expandedId = null;
        this.titles.clear();
      }),
      switchMap(id => id ? this.oscars.getMovieOscars(id).pipe(catchError(() => {
        this.failed = true;
        return of(null);
      })) : of(null)),
      takeUntil(this.destroy$)
    ).subscribe(result => {
      this.awards = result?.awards || [];
      this.throughYear = result?.throughYear || 0;
      this.loading = false;
    });
  }

  ngOnChanges(): void { this.load(); }

  load(): void { this.requests$.next(this.imdbId || ''); }

  toggle(id: string): void {
    this.expandedId = this.expandedId === id ? null : id;
    if (!this.expandedId) return;
    const award = this.awards.find(item => item.id === id);
    const ids = [...new Set(award?.nominees.flatMap(n => n.imdbIds) || [])]
      .filter(imdbId => /^tt\d+$/.test(imdbId) && !this.titles.has(imdbId));
    from(ids).pipe(
      mergeMap(imdbId => this.tmdb.getMovieTitlesByImdbId(imdbId).pipe(
        map(movie => ({ imdbId, movie })),
        catchError(() => of({ imdbId, movie: null }))
      ), 4),
      takeUntil(this.requests$),
      takeUntil(this.destroy$)
    ).subscribe(({ imdbId, movie }) => {
      if (movie) this.titles.set(imdbId, movie);
    });
  }

  getFilms(nominee: OscarNominee): { label: string; movieId: number | null }[] {
    return nominee.films.map((film, index) => {
      // Older awards may list multiple films with incomplete identifiers.
      // Only associate titles when both arrays have corresponding entries.
      const id = nominee.imdbIds.length === nominee.films.length ? nominee.imdbIds[index] : null;
      const movie = id ? this.titles.get(id) : null;
      return {
        label: movie?.title && movie.original_title ? `${movie.title} (${movie.original_title})` : film,
        movieId: movie?.id || null
      };
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
