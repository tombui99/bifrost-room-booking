import { Component, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Auth, user } from '@angular/fire/auth';
import { toSignal } from '@angular/core/rxjs-interop';
import { Booking, Room } from '../../api/models';
import { ApiService } from '../../api/api.service';
import { ActivatedRoute, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AdminService } from '../../auth/admin.service';
import { BookingModalComponent } from '../../shared/components/booking-modal/booking-modal';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, RouterLinkActive, BookingModalComponent],
  templateUrl: 'daily-bookings.html',
})
export class DailyBookings {
  auth = inject(Auth);
  api = inject(ApiService);
  adminService = inject(AdminService);
  currentUser = toSignal(user(this.auth));
  router = inject(Router);
  route = inject(ActivatedRoute);

  // UI STATE
  selectedDate = signal<string>(new Date().toISOString().split('T')[0]);
  isLoading = signal(false);

  private queryParams = toSignal(this.route.queryParams);
  selectedLocation = computed(() => this.queryParams()?.['location'] ?? '');

  uniqueLocations = computed(() => {
    const locations = this.rooms()
      .map((r) => r.location)
      .filter((l): l is string => !!l);
    return [...new Set(locations)].sort();
  });

  filteredRooms = computed(() => {
    const loc = this.selectedLocation();
    const rooms = this.rooms();
    if (!loc) return rooms;
    return rooms.filter((r) => r.location === loc);
  });

  // MODAL STATE
  showModal = signal(false);

  // Data to pass to the modal
  selectedBooking = signal<Booking | null>(null);
  newBookingData = signal<{ date: string; time?: string; roomId?: string } | null>(null);

  isAdmin = toSignal(this.adminService.isAdmin$, { initialValue: false });

  // DATA
  rooms = signal<Room[]>([]);
  bookings = signal<Booking[]>([]);
  timeSlots = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21];

  constructor() {
    const dateFromQuery =
      this.route.snapshot.queryParamMap.get('date') ?? new Date().toISOString().split('T')[0];

    this.selectedDate.set(dateFromQuery);

    this.loadRooms();
    this.adminService.checkAdmin();
  }

  updateLocation(location: string) {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { location: location || null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  // --- API CALLS ---
  async loadRooms() {
    this.isLoading.set(true);
    try {
      this.rooms.set(await this.api.getRooms());
      await this.loadBookings();
    } catch (e) {
      console.error(e);
    } finally {
      this.isLoading.set(false);
    }
  }

  async loadBookings() {
    try {
      const data = await this.api.getBookings(this.selectedDate());
      this.bookings.set(data);
    } catch (e) {
      console.error(e);
    }
  }

  // --- BOOKING LOGIC ---

  // 1. OPEN MODAL (New Booking)
  openModal(roomName?: string, time?: string) {
    this.selectedBooking.set(null);
    this.newBookingData.set({
      date: this.selectedDate(),
      time: time,
      roomId: roomName,
    });
    this.showModal.set(true);
  }

  // 2. EDIT BOOKING
  editBooking(b: Booking) {
    this.newBookingData.set(null);
    this.selectedBooking.set(b);
    this.showModal.set(true);
  }

  onBookingSaved() {
    this.loadBookings();
  }

  // --- HELPERS ---
  getBookingsForRoom(rid: string) {
    return this.bookings().filter((b) => b.roomId === rid && b.date === this.selectedDate());
  }
  getBookingStyle(b: Booking) {
    const dayStartTime = this.timeSlots[0];
    const dayStartMinutes = dayStartTime * 60;
    const totalDayMinutes = this.timeSlots.length * 60;

    // 1. Calculate the raw percentage values
    let left = ((b.startTime - dayStartMinutes) / totalDayMinutes) * 100;
    let width = (b.duration / totalDayMinutes) * 100;
    // 2. Define the gap size (0.4% is usually enough for a 2-4px gap)
    const gap = 0.4;

    // 3. Subtract gap from width and add a small offset to 'left'
    // to keep the booking centered.
    return {
      left: left + gap / 2,
      width: width - gap,
    };
  }

  // ... (Rest of existing helpers: isToday, selectDateAndOpen, etc.)
  isToday(dateStr: string) {
    return dateStr === new Date().toISOString().split('T')[0];
  }
  selectDateAndOpen(date: string, roomName: string) {
    this.selectedDate.set(date);
    this.openModal(roomName, '09:00');
  }
  onDateChange(d: string) {
    this.selectedDate.set(d);
    this.loadBookings();
  }
  closeModal() {
    this.showModal.set(false);
  }

  formatTime(totalMinutes: number): string {
    const h = Math.floor(totalMinutes / 60)
      .toString()
      .padStart(2, '0');
    const m = (totalMinutes % 60).toString().padStart(2, '0');
    return `${h}:${m}`;
  }

  changeDate(offset: number) {
    const currentDate = new Date(this.selectedDate());
    currentDate.setDate(currentDate.getDate() + offset);

    // Convert back to YYYY-MM-DD string
    const newDateStr = currentDate.toISOString().split('T')[0];

    this.selectedDate.set(newDateStr);
    this.loadBookings();
  }
}
