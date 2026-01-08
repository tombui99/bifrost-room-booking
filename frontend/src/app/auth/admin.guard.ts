import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Auth, onAuthStateChanged, User } from '@angular/fire/auth';
import { Firestore, doc, getDoc } from '@angular/fire/firestore';

function waitForAuth(auth: Auth): Promise<User | null> {
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      resolve(user);
    });
  });
}

export const adminGuard: CanActivateFn = async () => {
  const auth = inject(Auth);
  const firestore = inject(Firestore);
  const router = inject(Router);

  // ✅ Wait for Firebase Auth to initialize
  const user = await waitForAuth(auth);

  if (!user || !user.email) {
    return router.createUrlTree(['/login']);
  }

  // Email is the document ID
  const adminRef = doc(firestore, 'admins', user.email);
  const adminSnap = await getDoc(adminRef);

  if (!adminSnap.exists()) return router.createUrlTree(['/unauthorized']);

  return true;
};
