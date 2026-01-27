import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Auth, user } from '@angular/fire/auth';
import { toSignal } from '@angular/core/rxjs-interop';
import { ApiService } from '../../api/api.service';
import { Booking, Room } from '../../api/models';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AdminService } from '../../auth/admin.service';
import { BookingModalComponent } from '../../shared/components/booking-modal/booking-modal';

@Component({
  selector: 'app-weekly-bookings',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, RouterLinkActive, BookingModalComponent],
  templateUrl: './weekly-bookings.html',
})
export class WeeklyBookings implements OnInit {
  api = inject(ApiService);
  auth = inject(Auth);
  adminService = inject(AdminService);
  router = inject(Router);

  currentUser = toSignal(user(this.auth));
  isAdmin = toSignal(this.adminService.isAdmin$, { initialValue: false });

  // VIEW STATE
  selectedDate = signal<string>(new Date().toISOString().split('T')[0]); // The starting date of the view
  isLoading = signal(false);
  rooms = signal<Room[]>([]);
  weeklyBookings = signal<Booking[]>([]);
  timeSlots = Array.from({ length: 15 }, (_, i) => i + 7);

  // MODAL STATE
  showModal = signal(false);

  // Data to pass to the modal
  selectedBooking = signal<Booking | null>(null);
  newBookingData = signal<{ date: string; time?: string; roomId?: string } | null>(null);

  // COMPUTED
  weekDays = computed(() => {
    const current = new Date(this.selectedDate());
    const day = current.getDay();
    const diff = current.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(current.setDate(diff));
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return d;
    });
  });

  selectedLocation = signal<string>('');

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

  constructor() {
    this.adminService.checkAdmin();
  }

  async ngOnInit() {
    const roomsData = await this.api.getRooms();
    this.rooms.set(roomsData);
    await this.loadWeeklyBookings();
  }

  async loadWeeklyBookings() {
    this.isLoading.set(true);
    const requests = this.weekDays().map((day) =>
      this.api.getBookings(day.toISOString().split('T')[0]),
    );
    const results = await Promise.all(requests);
    this.weeklyBookings.set(results.flat());
    this.isLoading.set(false);
  }

  changeWeek(offset: number) {
    const d = new Date(this.selectedDate());
    d.setDate(d.getDate() + offset * 7);
    this.selectedDate.set(d.toISOString().split('T')[0]);
    this.loadWeeklyBookings();
  }

  // --- OVERLAP & POSITION LOGIC ---
  getPositionedBookings(day: Date) {
    const dateStr = day.toISOString().split('T')[0];

    // 1. Get the IDs of the currently filtered rooms
    const activeRoomIds = this.filteredRooms().map((room) => room.id);

    // 2. Filter by date AND by room membership
    const dayBookings = this.weeklyBookings()
      .filter((b) => b.date === dateStr && activeRoomIds.includes(b.roomId))
      .sort((a, b) => a.startTime - b.startTime);

    const positioned: any[] = [];
    const columns: number[][] = [];

    dayBookings.forEach((booking) => {
      let colIndex = 0;
      while (
        columns[colIndex] &&
        columns[colIndex].some((endTime) => endTime > booking.startTime)
      ) {
        colIndex++;
      }
      if (!columns[colIndex]) columns[colIndex] = [];
      columns[colIndex].push(booking.startTime + booking.duration);
      positioned.push({ ...booking, colIndex });
    });

    const maxCols = Math.max(...positioned.map((p) => p.colIndex + 1), 1);

    return positioned.map((p) => ({
      ...p,
      width: 100 / maxCols,
      left: p.colIndex * (100 / maxCols),
    }));
  }

  getBookingStyle(b: any) {
    const dayStartMinutes = 7 * 60;
    const totalMinutes = (21 - 7) * 60;
    return {
      top: `${((b.startTime - dayStartMinutes) / totalMinutes) * 100}%`,
      height: `${(b.duration / totalMinutes) * 100}%`,
      left: `${b.left}%`,
      width: `${b.width - 1}%`,
    };
  }

  getRoomName(id: string) {
    return this.rooms().find((r) => r.id === id)?.name || 'Room';
  }

  // --- MODAL LOGIC (Ported & Adapted) ---

  // 1. OPEN MODAL (New Booking)
  openModal(date: Date, timeStr: string) {
    this.selectedBooking.set(null);

    // Default to the first filtered room if available
    let defaultRoomId = undefined;
    const availableRooms = this.filteredRooms();
    if (availableRooms.length > 0) {
      defaultRoomId = availableRooms[0].name;
    }

    this.newBookingData.set({
      date: date.toISOString().split('T')[0],
      time: timeStr,
      roomId: defaultRoomId,
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
    this.loadWeeklyBookings();
  }

  // --- HELPERS ---
  closeModal() {
    this.showModal.set(false);
  }

  minutesToTime(totalMinutes: number): string {
    const h = Math.floor(totalMinutes / 60)
      .toString()
      .padStart(2, '0');
    const m = (totalMinutes % 60).toString().padStart(2, '0');
    return `${h}:${m}`;
  }

  navigateToDailyBooking(date: Date) {
    console.log(date.toISOString().split('T')[0]);
    this.router.navigate(['/bookings/daily'], {
      queryParams: {
        date: date.toISOString().split('T')[0],
      },
    });
  }
}
