import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SupabaseService } from '../services/supabase.service';

const ADMIN_EMAIL = 'sergiomarcio@gmail.com';

export const adminGuard: CanActivateFn = async () => {
  const supabase = inject(SupabaseService);
  const router = inject(Router);

  const authenticated = await supabase.isAuthenticated();
  if (!authenticated) {
    router.navigate(['/login']);
    return false;
  }

  if (supabase.currentUser?.email !== ADMIN_EMAIL) {
    router.navigate(['/movies']);
    return false;
  }

  return true;
};
