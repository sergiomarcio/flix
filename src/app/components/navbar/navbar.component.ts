import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { Subscription } from 'rxjs';
import { SupabaseService } from '../../services/supabase.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss'
})
export class NavbarComponent implements OnInit, OnDestroy {
  menuOpen = false;
  userEmail: string | null = null;

  private sub?: Subscription;

  constructor(private supabase: SupabaseService, private router: Router) { }

  ngOnInit(): void {
    this.sub = this.supabase.currentUser$.subscribe(user => {
      this.userEmail = user?.email ?? null;
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  get isAdmin(): boolean {
    return this.userEmail === 'sergiomarcio@gmail.com';
  }

  get emailUser(): string {
    return this.userEmail ? this.userEmail.split('@')[0] : 'FLIX';
  }

  get emailDomain(): string {
    if (!this.userEmail || !this.userEmail.includes('@')) return '';
    return '@' + this.userEmail.split('@')[1];
  }

  toggleMenu(): void {
    this.menuOpen = !this.menuOpen;
  }

  async logout(): Promise<void> {
    await this.supabase.signOut();
    this.menuOpen = false;
    this.router.navigate(['/login']);
  }
}
