import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SupabaseService } from '../../services/supabase.service';

type Mode = 'login' | 'register';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent {
  mode: Mode = 'login';

  email = '';
  password = '';
  confirmPassword = '';

  loading = false;
  errorMessage = '';
  successMessage = '';

  constructor(private supabase: SupabaseService, private router: Router) { }

  setMode(mode: Mode): void {
    this.mode = mode;
    this.errorMessage = '';
    this.successMessage = '';
    this.password = '';
    this.confirmPassword = '';
  }

  async submit(): Promise<void> {
    this.errorMessage = '';
    this.successMessage = '';

    if (!this.email || !this.password) {
      this.errorMessage = 'Preencha todos os campos.';
      return;
    }

    if (this.mode === 'register') {
      if (this.password !== this.confirmPassword) {
        this.errorMessage = 'As senhas não coincidem.';
        return;
      }
      if (this.password.length < 6) {
        this.errorMessage = 'A senha deve ter pelo menos 6 caracteres.';
        return;
      }
    }

    this.loading = true;
    try {
      if (this.mode === 'login') {
        await this.supabase.signIn(this.email, this.password);
        this.router.navigate(['/']);
      } else {
        await this.supabase.signUp(this.email, this.password);
        this.router.navigate(['/']);
      }
    } catch (err: unknown) {
      this.errorMessage = this.parseError(err);
    } finally {
      this.loading = false;
    }
  }

  private parseError(err: unknown): string {
    if (err && typeof err === 'object' && 'message' in err) {
      const msg = (err as { message: string }).message;
      if (msg.includes('Invalid login credentials')) return 'E-mail ou senha inválidos.';
      if (msg.includes('Email not confirmed')) return 'E-mail não confirmado. Verifique sua caixa de entrada.';
      if (msg.includes('User already registered')) return 'Este e-mail já está cadastrado.';
      if (msg.includes('Password should be')) return 'A senha deve ter pelo menos 6 caracteres.';
      return msg;
    }
    return 'Ocorreu um erro. Tente novamente.';
  }
}
