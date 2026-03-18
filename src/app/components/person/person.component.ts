import { CommonModule, Location } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { PersonDetails, TmdbService } from '../../services/tmdb.service';

interface CombinedCredit {
  id: number;
  title: string;
  poster_path: string | null;
  date: string;
  character: string;
  vote_average: number;
  type: 'movie' | 'tv';
}

@Component({
  selector: 'app-person',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './person.component.html',
  styleUrl: './person.component.scss'
})
export class PersonComponent implements OnInit {
  person: PersonDetails | null = null;
  credits: CombinedCredit[] = [];
  loading = false;
  sortBy: 'name' | 'year' = 'year';
  sortDir: 'asc' | 'desc' = 'desc';
  typeFilter: 'all' | 'movie' | 'tv' = 'all';

  constructor(
    private tmdb: TmdbService,
    private router: Router,
    private route: ActivatedRoute,
    private location: Location
  ) { }

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (id) this.load(id);
  }

  load(id: number): void {
    this.loading = true;
    this.person = null;
    this.credits = [];
    this.typeFilter = 'all';
    this.sortBy = 'year';
    this.sortDir = 'desc';

    forkJoin({
      person: this.tmdb.getPersonDetails(id),
      movieCredits: this.tmdb.getPersonMovieCredits(id),
      tvCredits: this.tmdb.getPersonTVCredits(id)
    }).subscribe({
      next: ({ person, movieCredits, tvCredits }) => {
        this.person = person;

        const movies: CombinedCredit[] = movieCredits.cast
          .filter(m => m.release_date)
          .map(m => ({
            id: m.id,
            title: m.title,
            poster_path: m.poster_path,
            date: m.release_date,
            character: m.character,
            vote_average: m.vote_average,
            type: 'movie' as const
          }));

        const series: CombinedCredit[] = tvCredits.cast
          .filter(t => t.first_air_date)
          .map(t => ({
            id: t.id,
            title: t.name,
            poster_path: t.poster_path,
            date: t.first_air_date,
            character: t.character,
            vote_average: t.vote_average,
            type: 'tv' as const
          }));

        const uniqueSeries = series.filter((t, i, arr) => arr.findIndex(x => x.id === t.id) === i);

        this.credits = [...movies, ...uniqueSeries];
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  setSort(field: 'name' | 'year'): void {
    if (this.sortBy === field) {
      this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortBy = field;
      this.sortDir = field === 'year' ? 'desc' : 'asc';
    }
  }

  get filteredCredits(): CombinedCredit[] {
    const base = this.typeFilter === 'all'
      ? this.credits
      : this.credits.filter(c => c.type === this.typeFilter);

    return [...base].sort((a, b) => {
      const val = this.sortBy === 'name'
        ? a.title.localeCompare(b.title)
        : (a.date || '').localeCompare(b.date || '');
      return this.sortDir === 'asc' ? val : -val;
    });
  }

  get movieCount(): number { return this.credits.filter(c => c.type === 'movie').length; }
  get tvCount(): number { return this.credits.filter(c => c.type === 'tv').length; }

  getProfileUrl(path: string | null): string {
    return this.tmdb.getImageUrl(path || '', 'w342');
  }

  getPosterUrl(path: string | null): string {
    if (!path) return 'assets/no-poster.jpg';
    return this.tmdb.getImageUrl(path, 'w185');
  }

  getYear(date: string): string {
    return date ? date.substring(0, 4) : '—';
  }

  goBack(): void {
    this.location.back();
  }

  navigate(credit: CombinedCredit): void {
    if (credit.type === 'movie') {
      this.router.navigate(['/movie', credit.id]);
    } else {
      this.router.navigate(['/series', credit.id]);
    }
  }
}
