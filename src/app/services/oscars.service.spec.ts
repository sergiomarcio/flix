import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { OscarCeremony, OscarsService, selectMovieOscars } from './oscars.service';

describe('OscarsService', () => {
  let service: OscarsService;
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(OscarsService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('does not load ceremonies for a film without wins', () => {
    service.getMovieOscars('tt0000000').subscribe(result => expect(result.awards).toEqual([]));
    http.expectOne('assets/oscars/index.json').flush({ throughYear: 2026, winners: {} });
  });

  it('loads only the winning ceremony and reuses cached data', () => {
    const result = jasmine.createSpy('result');
    service.getMovieOscars('tt123').subscribe(result);
    http.expectOne('assets/oscars/index.json').flush({ throughYear: 2026, winners: { tt123: [96] } });
    http.expectOne('assets/oscars/96.json').flush({ ceremony: 96, year: 2024, categories: [] });
    service.getMovieOscars('tt123').subscribe(result);
    expect(result).toHaveBeenCalledTimes(2);
    http.expectNone('assets/oscars/index.json');
    http.expectNone('assets/oscars/96.json');
  });

  it('allows retry after a failed index request', () => {
    service.getMovieOscars('tt123').subscribe({ error: () => {} });
    http.expectOne('assets/oscars/index.json').flush('Unavailable', { status: 503, statusText: 'Unavailable' });
    service.getMovieOscars('tt123').subscribe(result => expect(result.throughYear).toBe(2026));
    http.expectOne('assets/oscars/index.json').flush({ throughYear: 2026, winners: {} });
  });
});

describe('Oscar historical data', () => {
  async function ceremony(id: number): Promise<OscarCeremony> {
    const response = await fetch(`/assets/oscars/${id}.json`);
    expect(response.ok).toBeTrue();
    return response.json();
  }

  it('matches Titanic by IMDb ID and preserves all 11 victories', async () => {
    const data = await ceremony(70);
    const awards = selectMovieOscars([data], 'tt0120338');
    expect(awards.length).toBe(11);
    const picture = awards.find(a => a.canonicalCategory === 'BEST PICTURE')!;
    expect(picture.year).toBe(1998);
    expect(picture.nominees.length).toBe(5);
    expect(picture.nominees.filter(n => !n.winner).length).toBe(4);
  });

  it('keeps distinct acting nominations from the same film', async () => {
    const data = await ceremony(96);
    expect(selectMovieOscars([data], 'tt15398776').length).toBe(7);
    expect(selectMovieOscars([data], 'tt0381061')).toEqual([]);
    const acting = (await ceremony(98)).categories.find(c => c.category === 'ACTRESS IN A SUPPORTING ROLE')!;
    expect(acting.nominees.filter(n => n.films.includes('Sentimental Value')).length).toBe(2);
  });

  it('retains separate color and black-and-white categories and tied winners', async () => {
    const data = await ceremony(41);
    const actress = data.categories.find(c => c.category === 'ACTRESS')!;
    expect(actress.nominees.filter(n => n.winner).length).toBe(2);
    const older = await ceremony(12);
    expect(older.categories.some(c => c.category === 'CINEMATOGRAPHY (Color)')).toBeTrue();
    expect(older.categories.some(c => c.category === 'CINEMATOGRAPHY (Black-and-White)')).toBeTrue();
    for (const category of older.categories.filter(c => c.category.startsWith('CINEMATOGRAPHY ('))) {
      const id = category.nominees.find(n => n.winner)!.imdbIds[0];
      const award = selectMovieOscars([older], id).find(a => a.id === category.id)!;
      expect(award.label).toContain(category.category.includes('(Color)') ? '(Cor)' : '(Preto e Branco)');
    }
  });

  it('includes the 2026 winners and complete competing categories', async () => {
    const data = await ceremony(98);
    const picture = data.categories.find(c => c.canonicalCategory === 'BEST PICTURE')!;
    expect(data.year).toBe(2026);
    expect(picture.nominees.length).toBe(10);
    expect(picture.nominees.find(n => n.winner)!.films).toContain('One Battle after Another');
  });
});
