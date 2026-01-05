import { Component, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Auth, GoogleAuthProvider, signInWithPopup, signOut, user } from '@angular/fire/auth';
import { toSignal } from '@angular/core/rxjs-interop';
import { Booking, Room } from '../../api/models';
import { ApiService } from '../../api/api.service';
import { Router } from '@angular/router';
import { Sidebar } from '../../components/sidebar/sidebar';

export type CalendarView = 'day' | 'week';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule, Sidebar],
  templateUrl: 'bookings.html',
})
export class Bookings {
  auth = inject(Auth);
  api = inject(ApiService);
  currentUser = toSignal(user(this.auth));
  router = inject(Router);

  // VIEW STATE
  calendarView = signal<CalendarView>('day');
  selectedDate = signal<string>(new Date().toISOString().split('T')[0]);

  // MODAL STATE
  showModal = signal(false);
  // 'id' tracks whether we are creating (undefined) or updating (string)
  modalData = signal<{
    id?: string;
    startTime: string;
    endTime: string;
    title: string;
    guestCount: number;
  }>({
    startTime: '09:00',
    endTime: '10:00',
    title: '',
    guestCount: 1,
  });

  currentImageIndex = signal<number>(0);
  selectedRoomId = signal('');

  // DATA
  rooms: Room[] = [];
  bookings = signal<Booking[]>([]);
  timeSlots = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17];

  get selectedRoom() {
    return this.rooms.find((r) => r.name === this.selectedRoomId()) || null;
  }
  isEditing = computed(() => !!this.modalData().id);

  // --- WEEK VIEW LOGIC ---
  weekDays = computed(() => {
    if (this.calendarView() !== 'week') return [];
    const curr = new Date(this.selectedDate() || new Date());
    const first = curr.getDate() - curr.getDay() + 1;
    const days = [];
    for (let i = 0; i < 5; i++) {
      const next = new Date(curr);
      next.setDate(first + i);
      const dayName = ['Chủ Nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'][
        next.getDay()
      ];
      days.push({ date: next.toISOString().split('T')[0], dayName });
    }
    return days;
  });

  constructor() {
    this.loadRooms();
  }

  // --- API CALLS ---
  async loadRooms() {
    try {
      this.rooms = await this.api.getRooms();
      if (this.rooms.length > 0) this.selectedRoomId.set(this.rooms[0].name);
      this.loadBookings();
    } catch (e) {
      console.error(e);
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

  // --- ROOM CRUD (Placeholder for Future Admin UI) ---
  async createRoom(room: Partial<Room>) {
    try {
      await this.api.createRoom(room);
      this.loadRooms();
    } catch (e) {
      console.error(e);
    }
  }
  async deleteRoom(id: string) {
    if (!confirm('Xóa phòng này?')) return;
    try {
      await this.api.deleteRoom(id);
      this.loadRooms();
    } catch (e) {
      console.error(e);
    }
  }

  // --- BOOKING LOGIC ---

  // 1. OPEN MODAL (New Booking)
  openModal(roomName?: string, time?: string) {
    if (roomName) {
      this.selectedRoomId.set(roomName);
      this.currentImageIndex.set(0);
    }
    let start = 9;
    if (time) start = parseInt(time.split(':')[0]);

    // Reset form, id undefined means "Create Mode"
    this.modalData.set({
      id: undefined,
      title: '',
      startTime: (start < 10 ? '0' : '') + start + ':00',
      endTime: (start + 1 < 10 ? '0' : '') + (start + 1) + ':00',
      guestCount: 1,
    });
    this.showModal.set(true);
  }

  // 2. EDIT BOOKING (Existing Booking)
  editBooking(b: Booking) {
    if (b.createdBy !== this.currentUser()?.uid) {
      return alert('Bạn chỉ có thể chỉnh sửa booking của mình.');
    }
    this.selectedRoomId.set(this.rooms.find((r) => r.id === b.roomId)?.name || '');
    this.currentImageIndex.set(0);

    // Pre-fill data
    this.modalData.set({
      id: b.id,
      title: b.title,
      startTime: (b.startHour < 10 ? '0' : '') + b.startHour + ':00',
      endTime: (b.startHour + b.duration < 10 ? '0' : '') + (b.startHour + b.duration) + ':00',
      guestCount: b.guestCount || 1,
    });
    this.showModal.set(true);
  }

  // 3. SAVE (Create OR Update)
  async confirmBooking() {
    const data = this.modalData();
    const room = this.rooms.find((r) => r.name === this.selectedRoomId());
    if (!room || !data.title) return alert('Vui lòng nhập đủ thông tin');

    const startH = parseInt(data.startTime.split(':')[0]);
    const endH = parseInt(data.endTime.split(':')[0]);
    if (startH >= endH) return alert('Giờ kết thúc không hợp lệ');

    const payload = {
      roomId: room.id,
      title: data.title,
      date: this.selectedDate(),
      startHour: startH,
      duration: endH - startH,
      guestCount: data.guestCount,
    };

    try {
      if (data.id) {
        // UPDATE
        await this.api.updateBooking(data.id, payload);
      } else {
        // CREATE
        await this.api.createBooking(payload);
      }
      this.closeModal();
      this.loadBookings();
    } catch (e) {
      console.error(e);
      alert('Lỗi khi lưu (Xem console)');
    }
  }

  // 4. DELETE (From Modal)
  async deleteCurrentBooking() {
    const id = this.modalData().id;
    if (!id) return;
    if (!confirm('Bạn chắc chắn muốn xóa lịch này?')) return;
    try {
      await this.api.deleteBooking(id);
      this.closeModal();
      this.loadBookings();
    } catch (e) {
      console.error(e);
      alert('Không thể xóa booking');
    }
  }

  // --- HELPERS ---
  getBookingsForRoom(rid: string) {
    if (this.calendarView() === 'day') {
      return this.bookings().filter((b) => b.roomId === rid && b.date === this.selectedDate());
    } else {
      const days = this.weekDays().map((d) => d.date);
      return this.bookings().filter((b) => b.roomId === rid && days.includes(b.date));
    }
  }

  getBookingStyle(b: Booking) {
    if (this.calendarView() === 'day') {
      return { left: (b.startHour - 8) * 10, width: b.duration * 10 };
    } else {
      const days = this.weekDays().map((d) => d.date);
      const dayIndex = days.indexOf(b.date);
      return { left: dayIndex * 20, width: 20 };
    }
  }

  isToday(dateStr: string) {
    return dateStr === new Date().toISOString().split('T')[0];
  }
  selectDateAndOpen(date: string, roomName: string) {
    this.selectedDate.set(date);
    this.openModal(roomName, '09:00');
  }
  loginWithGoogle() {
    signInWithPopup(this.auth, new GoogleAuthProvider());
  }
  setCalendarView(v: CalendarView) {
    this.calendarView.set(v);
  }
  onDateChange(d: string) {
    this.selectedDate.set(d);
    this.loadBookings();
  }
  closeModal() {
    this.showModal.set(false);
  }
  nextImage(e: Event) {
    e.stopPropagation();
    const imgs = this.selectedRoom?.images || [];
    if (imgs.length) this.currentImageIndex.update((i) => (i + 1) % imgs.length);
  }
  prevImage(e: Event) {
    e.stopPropagation();
    const imgs = this.selectedRoom?.images || [];
    if (imgs.length) this.currentImageIndex.update((i) => (i - 1 + imgs.length) % imgs.length);
  }
  updateGuestCount(d: number) {
    const n = this.modalData().guestCount + d;
    if (n >= 1) this.modalData.update((v) => ({ ...v, guestCount: n }));
  }
}
