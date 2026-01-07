import { Component, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Auth, user } from '@angular/fire/auth';
import { toSignal } from '@angular/core/rxjs-interop';
import { Booking, Room } from '../../api/models';
import { ApiService } from '../../api/api.service';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: 'bookings.html',
})
export class Bookings {
  auth = inject(Auth);
  api = inject(ApiService);
  currentUser = toSignal(user(this.auth));
  router = inject(Router);

  // UI STATE
  selectedDate = signal<string>(new Date().toISOString().split('T')[0]);
  isEditing = computed(() => !!this.modalData().id);
  isSaving = signal(false);
  isLoading = signal(false);

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
    startTime: '',
    endTime: '',
    title: '',
    guestCount: 1,
  });

  currentImageIndex = signal<number>(0);
  selectedRoomId = signal('');

  // DATA
  rooms = signal<Room[]>([]);
  bookings = signal<Booking[]>([]);
  timeSlots = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18];

  get selectedRoom() {
    return this.rooms().find((r) => r.name === this.selectedRoomId()) || null;
  }

  constructor() {
    this.loadRooms();
  }

  // --- API CALLS ---
  async loadRooms() {
    this.isLoading.set(true);
    try {
      this.rooms.set(await this.api.getRooms());
      if (this.rooms().length > 0) this.selectedRoomId.set(this.rooms()[0].name);
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
    this.selectedRoomId.set(this.rooms().find((r) => r.id === b.roomId)?.name || '');
    this.currentImageIndex.set(0);

    // Pre-fill data
    this.modalData.set({
      id: b.id,
      title: b.title,
      guestCount: b.guestCount,
      startTime: this.minutesToTime(b.startTime),
      endTime: this.minutesToTime(b.startTime + b.duration),
    });
    this.showModal.set(true);
  }

  // 3. SAVE (Create OR Update)
  async confirmBooking() {
    const data = this.modalData();
    const room = this.rooms().find((r) => r.name === this.selectedRoomId());
    if (!room || !data.title) return alert('Vui lòng nhập đủ thông tin');

    const [startH, startM] = data.startTime.split(':').map(Number);
    const [endH, endM] = data.endTime.split(':').map(Number);

    const startTotalMinutes = startH * 60 + startM;
    const endTotalMinutes = endH * 60 + endM;

    if (startTotalMinutes >= endTotalMinutes) {
      return alert('Giờ kết thúc không hợp lệ');
    }

    const payload = {
      roomId: room.id,
      title: data.title,
      date: this.selectedDate(),
      startTime: startTotalMinutes,
      duration: endTotalMinutes - startTotalMinutes,
      guestCount: data.guestCount,
    };

    try {
      this.isSaving.set(true);
      if (data.id) {
        // UPDATE
        await this.api.updateBooking(data.id, payload);
      } else {
        // CREATE
        await this.api.createBooking(payload);
      }
      this.isSaving.set(false);
      this.closeModal();
      this.loadBookings();
    } catch (e: any) {
      console.error(e);
      this.isSaving.set(false);
      alert(`Lỗi khi lưu: ${e.error.message ?? 'Xem console'}`);
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
    return this.bookings().filter((b) => b.roomId === rid && b.date === this.selectedDate());
  }
  getBookingStyle(b: Booking) {
    const dayStartTime = this.timeSlots[0]; // e.g. 8
    const dayStartMinutes = dayStartTime * 60;

    const totalDayMinutes = this.timeSlots.length * 60;

    const left = ((b.startTime - dayStartMinutes) / totalDayMinutes) * 100;

    const width = (b.duration / totalDayMinutes) * 100;

    return { left, width };
  }
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
  formatTime(totalMinutes: number): string {
    const h = Math.floor(totalMinutes / 60)
      .toString()
      .padStart(2, '0');
    const m = (totalMinutes % 60).toString().padStart(2, '0');
    return `${h}:${m}`;
  }
  minutesToTime(totalMinutes: number): string {
    const h = Math.floor(totalMinutes / 60)
      .toString()
      .padStart(2, '0');
    const m = (totalMinutes % 60).toString().padStart(2, '0');
    return `${h}:${m}`;
  }
}
