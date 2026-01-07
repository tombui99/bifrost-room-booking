import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Auth } from '@angular/fire/auth';
import { Firestore, doc, getDoc } from '@angular/fire/firestore';

export const adminGuard: CanActivateFn = async () => {
  const auth = inject(Auth);
  const firestore = inject(Firestore);
  const router = inject(Router);

  const user = auth.currentUser;

  if (!user || !user.email) {
    router.navigate(['/login']);
    return false;
  }

  // Email is the document ID
  const adminRef = doc(firestore, 'admins', user.email);
  const adminSnap = await getDoc(adminRef);

  if (!adminSnap.exists()) {
    router.navigate(['/unauthorized']);
    return false;
  }

  return true;
};
