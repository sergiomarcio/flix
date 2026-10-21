import { MovieOscarBadgeService, OscarBadgeComponent } from '../movies/oscar-badge/oscar-badge.component';
import { CommonModule, Location } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription, finalize, forkJoin, from, map, mergeMap } from 'rxjs';
import { SupabaseService, WatchStatus, SeriesStatus } from '../../services/supabase.service';
import { PersonDetails, TmdbService } from '../../services/tmdb.service';

interface CreditEntry {
  id: number;
  title: string;
  poster_path: string | null;
  date: string;
  role: string;
  type: 'movie' | 'tv';
  vote_average: number;
}

interface CreditGroup {
  key: string;
  label: string;
  credits: CreditEntry[];
}

interface PersonState {
  oscarFilter?: 'all' | 'oscar';
  activeGroup: string;
  sortBy: 'name' | 'year';
  sortDir: 'asc' | 'desc';
  scrollY: number;
}

@Component({
  selector: 'app-person',
  standalone: true,
  imports: [CommonModule, OscarBadgeComponent],
  templateUrl: './person.component.html',
  styleUrl: './person.component.scss'
})
export class PersonComponent implements OnInit, OnDestroy {
  person: PersonDetails | null = null;
  groups: CreditGroup[] = [];
  activeGroup = 'actor';
  oscarFilter: 'all' | 'oscar' = 'all';
  loadingOscars = false;
  private oscarResults = new Map<number, boolean>();
  private oscarSubscription?: Subscription;
  loading = false;
  sortBy: 'name' | 'year' = 'year';
  sortDir: 'asc' | 'desc' = 'desc';

  private personId = 0;
  private movieStatusMap = new Map<number, WatchStatus>();
  private seriesStatusMap = new Map<number, SeriesStatus>();
  private savingState = true;

  constructor(
    private tmdb: TmdbService,
    private oscarBadges: MovieOscarBadgeService,
    private supabase: SupabaseService,
    private router: Router,
    private route: ActivatedRoute,
    private location: Location
  ) { }

  private get stateKey(): string { return `person_state_${this.personId}`; }

  ngOnInit(): void {
    this.personId = Number(this.route.snapshot.paramMap.get('id'));

    const saved = sessionStorage.getItem(this.stateKey);
    if (saved) {
      const state: PersonState = JSON.parse(saved);
      this.activeGroup = state.activeGroup;
      this.oscarFilter = state.oscarFilter === 'oscar' ? 'oscar' : 'all';
      this.sortBy = state.sortBy;
      this.sortDir = state.sortDir;
    }

    if (this.personId) this.load(this.personId);

    this.supabase.getUserMovies().then(movies => {
      this.movieStatusMap = new Map(movies.map(m => [m.movie_id, m.status]));
    });
    this.supabase.getUserSeries().then(series => {
      this.seriesStatusMap = new Map(series.map(s => [s.series_id, s.status]));
    });
  }

  ngOnDestroy(): void {
    this.oscarSubscription?.unsubscribe();
    if (this.savingState) {
      sessionStorage.setItem(this.stateKey, JSON.stringify({
        activeGroup: this.activeGroup,
        oscarFilter: this.oscarFilter,
        sortBy: this.sortBy,
        sortDir: this.sortDir,
        scrollY: window.scrollY
      } as PersonState));
    }
  }

  load(id: number): void {
    this.loading = true;
    this.person = null;
    this.groups = [];

    forkJoin({
      person: this.tmdb.getPersonDetails(id),
      movieCredits: this.tmdb.getPersonMovieCredits(id),
      tvCredits: this.tmdb.getPersonTVCredits(id)
    }).subscribe({
      next: ({ person, movieCredits, tvCredits }) => {
        this.person = person;

        // Cast group
        const actorCredits: CreditEntry[] = [];
        const seenCast = new Set<string>();

        for (const m of movieCredits.cast) {
          if (!m.release_date) continue;
          const k = `movie-${m.id}`;
          if (seenCast.has(k)) continue;
          seenCast.add(k);
          actorCredits.push({
            id: m.id, title: m.title, poster_path: m.poster_path,
            date: m.release_date, role: m.character,
            type: 'movie', vote_average: m.vote_average
          });
        }

        for (const t of tvCredits.cast) {
          if (!t.first_air_date) continue;
          const k = `tv-${t.id}`;
          if (seenCast.has(k)) continue;
          seenCast.add(k);
          actorCredits.push({
            id: t.id, title: t.name, poster_path: t.poster_path,
            date: t.first_air_date, role: t.character,
            type: 'tv', vote_average: t.vote_average
          });
        }

        // Crew groups — keyed by job
        const crewMap = new Map<string, CreditEntry[]>();

        const addCrew = (id: number, title: string, poster_path: string | null,
          date: string, job: string, type: 'movie' | 'tv', vote_average: number) => {
          if (!date || !job) return;
          if (!crewMap.has(job)) crewMap.set(job, []);
          crewMap.get(job)!.push({ id, title, poster_path, date, role: job, type, vote_average });
        };

        for (const c of movieCredits.crew) {
          addCrew(c.id, c.title, c.poster_path, c.release_date, c.job, 'movie', c.vote_average);
        }
        for (const c of (tvCredits.crew || [])) {
          addCrew(c.id, c.name, c.poster_path, c.first_air_date, c.job, 'tv', c.vote_average);
        }

        // Deduplicate within each crew group
        for (const [job, entries] of crewMap) {
          const seen = new Set<string>();
          crewMap.set(job, entries.filter(e => {
            const k = `${e.type}-${e.id}`;
            if (seen.has(k)) return false;
            seen.add(k);
            return true;
          }));
        }

        // Build final groups array
        this.groups = [];
        if (actorCredits.length > 0) {
          this.groups.push({ key: 'actor', label: 'Atuação', credits: actorCredits });
        }

        const crewGroups = Array.from(crewMap.entries())
          .map(([key, credits]) => ({ key, label: key, credits }))
          .sort((a, b) => b.credits.length - a.credits.length);

        this.groups.push(...crewGroups);

        // If saved group no longer exists, default to first
        if (!this.groups.find(g => g.key === this.activeGroup)) {
          this.activeGroup = this.groups[0]?.key ?? 'actor';
        }

        this.loading = false;
        this.loadOscarFilter();

        // Restore scroll
        const saved = sessionStorage.getItem(this.stateKey);
        if (saved) {
          const { scrollY } = JSON.parse(saved) as PersonState;
          if (scrollY > 0) {
            requestAnimationFrame(() => {
              requestAnimationFrame(() => window.scrollTo({ top: scrollY }));
            });
          }
        }
      },
      error: () => { this.loading = false; }
    });
  }

  setOscarFilter(filter: 'all' | 'oscar'): void {
    this.oscarFilter = filter;
    this.loadOscarFilter();
  }

  setGroup(key: string): void {
    this.activeGroup = key;
    this.loadOscarFilter();
  }

  private loadOscarFilter(): void {
    this.oscarSubscription?.unsubscribe();
    this.loadingOscars = false;
    if (this.oscarFilter !== 'oscar') return;
    const group = this.groups.find(g => g.key === this.activeGroup);
    const ids = [...new Set((group?.credits ?? [])
      .filter(c => c.type === 'movie' && !this.oscarResults.has(c.id)).map(c => c.id))];
    if (!ids.length) return;
    this.loadingOscars = true;
    this.oscarSubscription = from(ids).pipe(
      mergeMap(id => this.oscarBadges.hasWon(id).pipe(map(won => ({ id, won }))), 4),
      finalize(() => this.loadingOscars = false)
    ).subscribe(({ id, won }) => this.oscarResults.set(id, won));
  }

  setSort(field: 'name' | 'year'): void {
    if (this.sortBy === field) {
      this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortBy = field;
      this.sortDir = field === 'year' ? 'desc' : 'asc';
    }
  }

  get activeCredits(): CreditEntry[] {
    const group = this.groups.find(g => g.key === this.activeGroup);
    const base = (group?.credits ?? []).filter(c => this.oscarFilter === 'all' ||
      (c.type === 'movie' && this.oscarResults.get(c.id) === true));
    return [...base].sort((a, b) => {
      if (this.sortBy === 'name') {
        const cmp = a.title.localeCompare(b.title);
        return this.sortDir === 'asc' ? cmp : -cmp;
      }
      const yearA = (a.date || '').substring(0, 4);
      const yearB = (b.date || '').substring(0, 4);
      const yearCmp = yearA.localeCompare(yearB);
      if (yearCmp !== 0) return this.sortDir === 'asc' ? yearCmp : -yearCmp;
      return a.title.localeCompare(b.title);
    });
  }

  getStatus(credit: CreditEntry): string | null {
    if (credit.type === 'movie') return this.movieStatusMap.get(credit.id) ?? null;
    return this.seriesStatusMap.get(credit.id) ?? null;
  }

  statusLabel(status: string | null): string {
    if (status === 'watched') return '✅ Assistido';
    if (status === 'watching') return '▶ Assistindo';
    if (status === 'want_to_watch') return '⭐ Quero Ver';
    return '';
  }

  getProfileUrl(path: string | null): string {
    return this.tmdb.getImageUrl(path || '', 'w342');
  }

  getPosterUrl(path: string | null): string {
    if (!path) return 'assets/no-poster.svg';
    return this.tmdb.getImageUrl(path, 'w185');
  }

  getYear(date: string): string {
    return date ? date.substring(0, 4) : '—';
  }

  goBack(): void {
    this.savingState = false;
    sessionStorage.removeItem(this.stateKey);
    this.location.back();
  }

  navigate(credit: CreditEntry): void {
    this.savingState = false;
    sessionStorage.setItem(this.stateKey, JSON.stringify({
      activeGroup: this.activeGroup,
        oscarFilter: this.oscarFilter,
      sortBy: this.sortBy,
      sortDir: this.sortDir,
      scrollY: window.scrollY
    } as PersonState));

    if (credit.type === 'movie') {
      this.router.navigate(['/movie', credit.id]);
    } else {
      this.router.navigate(['/series', credit.id]);
    }
  }
}
