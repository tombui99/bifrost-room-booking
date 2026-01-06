import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Auth, user } from '@angular/fire/auth';
import { firstValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private http = inject(HttpClient);
  private auth = inject(Auth);

  // Ensure this matches your backend port (usually 3000)
  // private apiUrl = 'http://localhost:3000/api';
  private apiUrl = 'https://bifrost-room-booking-backend.fly.dev/api';

  // Observable of the current user state
  user$ = user(this.auth);

  // --- HELPER: Get Token Headers ---
  // Attaches the Firebase ID token to requests so the backend can verify identity
  private async getHeaders() {
    const currentUser = this.auth.currentUser;
    const token = currentUser ? await currentUser.getIdToken() : '';
    return {
      headers: new HttpHeaders().set('Authorization', `Bearer ${token}`),
    };
  }

  // ==========================================
  // 1. ROOM MANAGEMENT (CRUD)
  // ==========================================

  // READ: Get all rooms (Public or Protected depending on your logic)
  async getRooms() {
    return firstValueFrom(this.http.get<any[]>(`${this.apiUrl}/rooms`));
  }

  // CREATE: Add a new room (Admin only usually)
  async createRoom(roomData: any) {
    const options = await this.getHeaders();
    return firstValueFrom(this.http.post(`${this.apiUrl}/rooms`, roomData, options));
  }

  // UPDATE: Edit existing room details
  async updateRoom(id: string, roomData: any) {
    const options = await this.getHeaders();
    return firstValueFrom(this.http.put(`${this.apiUrl}/rooms/${id}`, roomData, options));
  }

  // DELETE: Remove a room
  async deleteRoom(id: string) {
    const options = await this.getHeaders();
    return firstValueFrom(this.http.delete(`${this.apiUrl}/rooms/${id}`, options));
  }

  // ==========================================
  // 2. BOOKING MANAGEMENT
  // ==========================================

  // READ: Get bookings filtered by date
  async getBookings(date: string) {
    return firstValueFrom(this.http.get<any[]>(`${this.apiUrl}/bookings?date=${date}`));
  }

  // CREATE: Make a new reservation
  async createBooking(bookingData: any) {
    const options = await this.getHeaders();
    return firstValueFrom(this.http.post(`${this.apiUrl}/bookings`, bookingData, options));
  }

  // UPDATE: Edit an existing reservation (NEW FEATURE)
  // Used for changing time, guests, or title
  async updateBooking(id: string, bookingData: any) {
    const options = await this.getHeaders();
    return firstValueFrom(this.http.put(`${this.apiUrl}/bookings/${id}`, bookingData, options));
  }

  // DELETE: Cancel a reservation
  async deleteBooking(id: string) {
    const options = await this.getHeaders();
    return firstValueFrom(this.http.delete(`${this.apiUrl}/bookings/${id}`, options));
  }

  // ==========================================
  // 3. DASHBOARD STATS
  // ==========================================

  // READ: Get dashboard statistics
  async getDashboardStats() {
    return firstValueFrom(this.http.get<any[]>(`${this.apiUrl}/dashboard/stats`));
  }
}
