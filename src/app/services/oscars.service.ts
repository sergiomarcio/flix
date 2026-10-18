import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, forkJoin, map, of, shareReplay, switchMap } from 'rxjs';

export interface OscarNominee {
  films: string[];
  imdbIds: string[];
  name: string;
  detail: string;
  winner: boolean;
}

export interface OscarCategory {
  id: string;
  category: string;
  canonicalCategory: string;
  nominees: OscarNominee[];
}

export interface OscarCeremony {
  ceremony: number;
  year: number;
  categories: OscarCategory[];
}

interface OscarIndex {
  throughYear: number;
  winners: Record<string, number[]>;
}

export interface MovieOscar extends OscarCategory {
  ceremony: number;
  year: number;
  label: string;
}

export interface MovieOscars {
  throughYear: number;
  awards: MovieOscar[];
}

// The precise historical category remains visible in the tooltip and source.
const CATEGORY_LABELS: Record<string, string> = {
  'BEST PICTURE': 'Melhor Filme',
  'ACTOR IN A LEADING ROLE': 'Melhor Ator',
  'ACTRESS IN A LEADING ROLE': 'Melhor Atriz',
  'ACTOR IN A SUPPORTING ROLE': 'Melhor Ator Coadjuvante',
  'ACTRESS IN A SUPPORTING ROLE': 'Melhor Atriz Coadjuvante',
  'DIRECTING': 'Melhor Direção',
  'CINEMATOGRAPHY': 'Melhor Fotografia',
  'ART DIRECTION': 'Melhor Direção de Arte',
  'PRODUCTION DESIGN': 'Melhor Design de Produção',
  'COSTUME DESIGN': 'Melhor Figurino',
  'FILM EDITING': 'Melhor Montagem',
  'MAKEUP': 'Melhor Maquiagem',
  'MAKEUP AND HAIRSTYLING': 'Melhor Maquiagem e Penteados',
  'VISUAL EFFECTS': 'Melhores Efeitos Visuais',
  'SOUND': 'Melhor Som',
  'SOUND MIXING': 'Melhor Mixagem de Som',
  'SOUND EDITING': 'Melhor Edição de Som',
  'SOUND EFFECTS EDITING': 'Melhor Edição de Efeitos Sonoros',
  'SOUND EFFECTS': 'Melhores Efeitos Sonoros',
  'ANIMATED FEATURE FILM': 'Melhor Longa de Animação',
  'INTERNATIONAL FEATURE FILM': 'Melhor Filme Internacional',
  'FOREIGN LANGUAGE FILM': 'Melhor Filme em Língua Estrangeira',
  'DOCUMENTARY (Feature)': 'Melhor Documentário',
  'DOCUMENTARY FEATURE FILM': 'Melhor Documentário',
  'DOCUMENTARY (Short Subject)': 'Melhor Curta Documentário',
  'DOCUMENTARY SHORT FILM': 'Melhor Curta Documentário',
  'SHORT FILM (Animated)': 'Melhor Curta de Animação',
  'ANIMATED SHORT FILM': 'Melhor Curta de Animação',
  'SHORT FILM (Live Action)': 'Melhor Curta em Live Action',
  'LIVE ACTION SHORT FILM': 'Melhor Curta em Live Action',
  'MUSIC (Original Score)': 'Melhor Trilha Sonora Original',
  'MUSIC (Original Dramatic Score)': 'Melhor Trilha Sonora Dramática',
  'MUSIC (Original Musical or Comedy Score)': 'Melhor Trilha Sonora de Musical ou Comédia',
  'MUSIC (Original Song)': 'Melhor Canção Original',
  'WRITING (Adapted Screenplay)': 'Melhor Roteiro Adaptado',
  'WRITING (Original Screenplay)': 'Melhor Roteiro Original',
  'WRITING (Original Story)': 'Melhor História Original',
  'CASTING': 'Melhor Direção de Elenco',
  'HONORARY AWARD': 'Oscar Honorário',
  'SPECIAL AWARD': 'Prêmio Especial',
  'SPECIAL ACHIEVEMENT AWARD': 'Prêmio de Realização Especial'
};

export function selectMovieOscars(data: OscarCeremony[], imdbId: string): MovieOscar[] {
  return data.flatMap(ceremony => ceremony.categories
    .filter(category => category.nominees.some(n => n.winner && n.imdbIds.includes(imdbId)))
    .map(category => ({ ...category, ceremony: ceremony.ceremony, year: ceremony.year,
      label: categoryLabel(category)
    })))
    .sort((a, b) => b.year - a.year || a.label.localeCompare(b.label, 'pt-BR'));
}

function categoryLabel(category: OscarCategory): string {
  const baseCategory = category.canonicalCategory.replace(/ \((Black-and-White|Color)\)$/, '');
  const label = CATEGORY_LABELS[category.category] || CATEGORY_LABELS[category.canonicalCategory] || CATEGORY_LABELS[baseCategory] || category.category;
  if (label !== category.category && category.category.includes('(Black-and-White)')) return `${label} (Preto e Branco)`;
  if (label !== category.category && category.category.includes('(Color)')) return `${label} (Cor)`;
  return label;
}

@Injectable({ providedIn: 'root' })
export class OscarsService {
  private index$?: Observable<OscarIndex>;
  private ceremonies = new Map<number, Observable<OscarCeremony>>();

  constructor(private http: HttpClient) {}

  getMovieOscars(imdbId: string): Observable<MovieOscars> {
    this.index$ ??= this.http.get<OscarIndex>('assets/oscars/index.json').pipe(shareReplay(1));
    return this.index$.pipe(switchMap(index => {
      const ids = index.winners[imdbId] || [];
      if (!ids.length) return of({ throughYear: index.throughYear, awards: [] });
      return forkJoin(ids.map(id => this.getCeremony(id))).pipe(map(data => ({
        throughYear: index.throughYear, awards: selectMovieOscars(data, imdbId)
      })));
    }));
  }

  private getCeremony(id: number): Observable<OscarCeremony> {
    if (!this.ceremonies.has(id)) {
      this.ceremonies.set(id, this.http.get<OscarCeremony>(`assets/oscars/${id}.json`).pipe(shareReplay(1)));
    }
    return this.ceremonies.get(id)!;
  }
}
