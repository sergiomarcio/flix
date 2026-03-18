import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { MovieDetailComponent } from './components/movies/detail/detail.component';
import { MovieHomeComponent } from './components/movies/home/home.component';
import { MovieListComponent } from './components/movies/list/list.component';
import { MyListComponent } from './components/movies/my-list/my-list.component';
import { MovieStatsComponent } from './components/movies/stats/stats.component';
import { AdminComponent } from './components/admin/admin.component';
import { PersonComponent } from './components/person/person.component';
import { SeriesDetailComponent } from './components/series/detail/detail.component';
import { SeriesHomeComponent } from './components/series/home/home.component';
import { SeriesListComponent } from './components/series/list/list.component';
import { MySeriesListComponent } from './components/series/my-list/my-list.component';
import { SeasonDetailComponent } from './components/series/season-detail/season-detail.component';
import { SeriesStatsComponent } from './components/series/stats/stats.component';
import { SobreComponent } from './components/sobre/sobre.component';
import { adminGuard } from './guards/admin.guard';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },

  // Filmes
  { path: '', component: MovieHomeComponent, canActivate: [authGuard] },
  { path: 'movie/:id', component: MovieDetailComponent, canActivate: [authGuard] },
  { path: 'my-list', component: MyListComponent, canActivate: [authGuard] },
  { path: 'movie-stats', component: MovieStatsComponent, canActivate: [authGuard] },
  { path: 'popular', component: MovieListComponent, data: { type: 'popular' }, canActivate: [authGuard] },
  { path: 'top-rated', component: MovieListComponent, data: { type: 'top-rated' }, canActivate: [authGuard] },
  { path: 'now-playing', component: MovieListComponent, data: { type: 'now-playing' }, canActivate: [authGuard] },

  // Séries
  { path: 'my-series-list', component: MySeriesListComponent, canActivate: [authGuard] },
  { path: 'series', component: SeriesHomeComponent, canActivate: [authGuard] },
  { path: 'series-popular', component: SeriesListComponent, data: { type: 'popular' }, canActivate: [authGuard] },
  { path: 'series-top-rated', component: SeriesListComponent, data: { type: 'top-rated' }, canActivate: [authGuard] },
  { path: 'series-stats', component: SeriesStatsComponent, canActivate: [authGuard] },
  { path: 'series/:id', component: SeriesDetailComponent, canActivate: [authGuard] },
  { path: 'series/:id/season/:season', component: SeasonDetailComponent, canActivate: [authGuard] },

  { path: 'person/:id', component: PersonComponent, canActivate: [authGuard] },
  { path: 'admin', component: AdminComponent, canActivate: [adminGuard] },
  { path: 'sobre', component: SobreComponent },
  { path: '**', redirectTo: '' }
];
