import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { APP_VERSION, CHANGELOG, VersionEntry } from '../../version';

@Component({
  selector: 'app-sobre',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './sobre.component.html',
  styleUrl: './sobre.component.scss'
})
export class SobreComponent {
  appVersion = APP_VERSION;
  changelog: VersionEntry[] = CHANGELOG;

  techs = [
    { name: 'Angular 17', desc: 'Framework front-end', icon: '🅰️', color: '#dd0031' },
    { name: 'TypeScript', desc: 'Linguagem principal', icon: '🔷', color: '#3178c6' },
    { name: 'Supabase', desc: 'Autenticação & banco de dados', icon: '⚡', color: '#3ecf8e' },
    { name: 'TMDB API', desc: 'Dados de filmes e séries', icon: '🎬', color: '#01b4e4' },
    { name: 'SCSS', desc: 'Estilização avançada', icon: '🎨', color: '#cc6699' },
    { name: 'RxJS', desc: 'Programação reativa', icon: '🔄', color: '#b7178c' },
    { name: 'Netlify', desc: 'Hospedagem e deploy', icon: '🌐', color: '#00c7b7' },
  ];
}
