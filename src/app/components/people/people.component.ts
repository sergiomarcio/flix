import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged, of, switchMap, takeUntil } from 'rxjs';
import { PersonSearchResult, TmdbService } from '../../services/tmdb.service';

interface DeptFilter {
  key: string;
  label: string;
  icon: string;
}

@Component({
  selector: 'app-people',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './people.component.html',
  styleUrl: './people.component.scss'
})
export class PeopleComponent implements OnInit, OnDestroy {
  searchQuery = '';
  results: PersonSearchResult[] = [];
  loading = false;
  loadingMore = false;
  currentPage = 1;
  totalPages = 1;
  deptFilter = 'all';

  readonly filters: DeptFilter[] = [
    { key: 'all', label: 'Todos', icon: '👥' },
    { key: 'Acting', label: 'Ator/Atriz', icon: '🎭' },
    { key: 'Directing', label: 'Diretor', icon: '🎬' },
    { key: 'Writing', label: 'Roteirista', icon: '✍️' },
    { key: 'Production', label: 'Produtor', icon: '🎞️' },
  ];

  private searchSubject = new Subject<string>();
  private destroy$ = new Subject<void>();
  private readonly stateKey = 'people_search_state';

  constructor(private tmdb: TmdbService, private router: Router) { }

  ngOnInit(): void {
    const saved = sessionStorage.getItem(this.stateKey);
    if (saved) {
      const state = JSON.parse(saved);
      this.searchQuery = state.searchQuery ?? '';
      this.deptFilter = state.deptFilter ?? 'all';
      this.results = state.results ?? [];
      this.currentPage = state.currentPage ?? 1;
      this.totalPages = state.totalPages ?? 1;
    }

    this.searchSubject.pipe(
      debounceTime(400),
      distinctUntilChanged(),
      switchMap(query => {
        if (!query.trim()) {
          this.results = [];
          this.loading = false;
          return of(null);
        }
        this.loading = true;
        this.currentPage = 1;
        return this.tmdb.searchPerson(query, 1);
      }),
      takeUntil(this.destroy$)
    ).subscribe({
      next: res => {
        this.loading = false;
        if (res) {
          this.results = res.results;
          this.totalPages = res.total_pages;
        } else {
          this.results = [];
        }
      },
      error: () => { this.loading = false; }
    });
  }

  ngOnDestroy(): void {
    sessionStorage.setItem(this.stateKey, JSON.stringify({
      searchQuery: this.searchQuery,
      deptFilter: this.deptFilter,
      results: this.results,
      currentPage: this.currentPage,
      totalPages: this.totalPages,
    }));
    this.destroy$.next();
    this.destroy$.complete();
  }

  onSearchChange(): void {
    this.searchSubject.next(this.searchQuery);
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.results = [];
    sessionStorage.removeItem(this.stateKey);
  }

  get filtered(): PersonSearchResult[] {
    if (this.deptFilter === 'all') return this.results;
    return this.results.filter(p => p.known_for_department === this.deptFilter);
  }

  deptLabel(dept: string): string {
    const map: Record<string, string> = {
      Acting: 'Ator/Atriz', Directing: 'Diretor', Writing: 'Roteirista',
      Production: 'Produtor', Sound: 'Trilha Sonora', Art: 'Arte',
      Camera: 'Câmera', Crew: 'Equipe', Editing: 'Edição',
      'Visual Effects': 'VFX', Lighting: 'Iluminação', 'Costume & Make-Up': 'Figurino'
    };
    return map[dept] ?? dept;
  }

  countByDept(key: string): number {
    if (key === 'all') return this.results.length;
    return this.results.filter(p => p.known_for_department === key).length;
  }

  loadMore(): void {
    if (this.loadingMore || this.currentPage >= this.totalPages) return;
    this.loadingMore = true;
    this.tmdb.searchPerson(this.searchQuery, this.currentPage + 1)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: res => {
          this.results = [...this.results, ...res.results];
          this.currentPage = res.total_pages > 0 ? this.currentPage + 1 : this.currentPage;
          this.totalPages = res.total_pages;
          this.loadingMore = false;
        },
        error: () => { this.loadingMore = false; }
      });
  }

  goToPerson(id: number): void {
    sessionStorage.setItem(this.stateKey, JSON.stringify({
      searchQuery: this.searchQuery,
      deptFilter: this.deptFilter,
      results: this.results,
      currentPage: this.currentPage,
      totalPages: this.totalPages,
    }));
    this.router.navigate(['/person', id]);
  }

  knownForLabel(person: PersonSearchResult): string {
    if (!person.known_for?.length) return '';
    return person.known_for.slice(0, 2).map(k => k.title || k.name || '').filter(Boolean).join(', ');
  }

  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.src = 'assets/no-person.jpg';
    img.classList.add('no-photo');
  }

  getImageUrl(path: string | null): string {
    if (!path) return 'assets/no-person.jpg';
    return this.tmdb.getImageUrl(path, 'w185');
  }
}
