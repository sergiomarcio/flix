import { Routes } from '@angular/router';
import { AboutComponent } from './components/about/about.component';
import { AdminComponent } from './components/admin/admin.component';
import { LoginComponent } from './components/login/login.component';
import { ManualComponent } from './components/manual/manual.component';
import { MovieDetailComponent } from './components/movies/detail/detail.component';
import { MovieHomeComponent } from './components/movies/home/home.component';
import { MovieListComponent } from './components/movies/list/list.component';
import { MyMoviesListComponent } from './components/movies/my-movies-list/my-movies-list.component';
import { MovieScheduleComponent } from './components/movies/schedule/schedule.component';
import { MovieStatsComponent } from './components/movies/stats/stats.component';
import { PeopleComponent } from './components/people/people.component';
import { PersonComponent } from './components/person/person.component';
import { SearchComponent } from './components/search/search.component';
import { SeriesDetailComponent } from './components/series/detail/detail.component';
import { SeriesHomeComponent } from './components/series/home/home.component';
import { SeriesListComponent } from './components/series/list/list.component';
import { MySeriesListComponent } from './components/series/my-series-list/my-series-list.component';
import { SeasonDetailComponent } from './components/series/season-detail/season-detail.component';
import { SeriesScheduleComponent } from './components/series/schedule/schedule.component';
import { SeriesStatsComponent } from './components/series/stats/stats.component';
import { adminGuard } from './guards/admin.guard';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },

  // Filmes
  { path: 'movies', component: MovieHomeComponent, canActivate: [authGuard] },
  { path: 'movie/:id', component: MovieDetailComponent, canActivate: [authGuard] },
  { path: 'my-movies-list', component: MyMoviesListComponent, canActivate: [authGuard] },
  { path: 'movie-schedule', component: MovieScheduleComponent, canActivate: [authGuard] },
  { path: 'movie-stats', component: MovieStatsComponent, canActivate: [authGuard] },
  { path: 'movies-popular', component: MovieListComponent, data: { type: 'popular' }, canActivate: [authGuard] },
  { path: 'movies-top-rated', component: MovieListComponent, data: { type: 'top-rated' }, canActivate: [authGuard] },
  { path: 'movies-now-playing', component: MovieListComponent, data: { type: 'now-playing' }, canActivate: [authGuard] },

  // Séries
  { path: 'series', component: SeriesHomeComponent, canActivate: [authGuard] },
  { path: 'series/:id', component: SeriesDetailComponent, canActivate: [authGuard] },
  { path: 'my-series-list', component: MySeriesListComponent, canActivate: [authGuard] },
  { path: 'series-schedule', component: SeriesScheduleComponent, canActivate: [authGuard] },
  { path: 'series-stats', component: SeriesStatsComponent, canActivate: [authGuard] },
  { path: 'series-popular', component: SeriesListComponent, data: { type: 'popular' }, canActivate: [authGuard] },
  { path: 'series-top-rated', component: SeriesListComponent, data: { type: 'top-rated' }, canActivate: [authGuard] },
  { path: 'series/:id/season/:season', component: SeasonDetailComponent, canActivate: [authGuard] },

  { path: 'people', component: PeopleComponent, canActivate: [authGuard] },
  { path: 'person/:id', component: PersonComponent, canActivate: [authGuard] },
  { path: 'admin', component: AdminComponent, canActivate: [adminGuard] },
  { path: 'about', component: AboutComponent },
  { path: 'manual', component: ManualComponent },
  { path: 'buscar', component: SearchComponent, canActivate: [authGuard] },
  { path: '**', redirectTo: 'movies' }
];
