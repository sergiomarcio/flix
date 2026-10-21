import { lastValueFrom, of, throwError } from 'rxjs';
import { MovieOscarBadgeService } from './oscar-badge.component';
import { TmdbService, MovieDetail } from '../../../services/tmdb.service';
import { OscarsService } from '../../../services/oscars.service';

describe('MovieOscarBadgeService', () => {
  let tmdb: jasmine.SpyObj<TmdbService>;
  let oscars: jasmine.SpyObj<OscarsService>;
  let service: MovieOscarBadgeService;
  beforeEach(() => {
    tmdb = jasmine.createSpyObj('TmdbService', ['getMovieDetail']);
    oscars = jasmine.createSpyObj('OscarsService', ['hasMovieWon']);
    service = new MovieOscarBadgeService(tmdb, oscars);
  });
  it('matches by IMDb ID and shares the result for repeated cards', async () => {
    tmdb.getMovieDetail.and.returnValue(of({ imdb_id: 'tt123' } as MovieDetail));
    oscars.hasMovieWon.and.returnValue(of(true));
    expect(await lastValueFrom(service.hasWon(42))).toBeTrue();
    expect(await lastValueFrom(service.hasWon(42))).toBeTrue();
    expect(tmdb.getMovieDetail).toHaveBeenCalledTimes(1);
    expect(oscars.hasMovieWon).toHaveBeenCalledOnceWith('tt123');
  });
  it('hides the badge when IMDb identification is missing', async () => {
    tmdb.getMovieDetail.and.returnValue(of({ imdb_id: null } as MovieDetail));
    expect(await lastValueFrom(service.hasWon(42))).toBeFalse();
    expect(oscars.hasMovieWon).not.toHaveBeenCalled();
  });
  it('allows another lookup after a failed request', async () => {
    tmdb.getMovieDetail.and.returnValue(throwError(() => new Error('offline')));
    expect(await lastValueFrom(service.hasWon(42))).toBeFalse();
    tmdb.getMovieDetail.and.returnValue(of({ imdb_id: 'tt123' } as MovieDetail));
    oscars.hasMovieWon.and.returnValue(of(true));
    expect(await lastValueFrom(service.hasWon(42))).toBeTrue();
  });
});

