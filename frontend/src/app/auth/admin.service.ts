import { Injectable, inject } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import { Firestore, doc, getDoc } from '@angular/fire/firestore';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AdminService {
  private auth = inject(Auth);
  private firestore = inject(Firestore);

  private _isAdmin$ = new BehaviorSubject<boolean>(false);
  isAdmin$ = this._isAdmin$.asObservable();

  async checkAdmin() {
    const user = this.auth.currentUser;
    if (!user?.email) {
      this._isAdmin$.next(false);
      return;
    }

    const snap = await getDoc(doc(this.firestore, 'admins', user.email));
    this._isAdmin$.next(snap.exists());
  }
}
