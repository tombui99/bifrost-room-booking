import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Auth, user } from '@angular/fire/auth';
import { toSignal } from '@angular/core/rxjs-interop';
import { ApiService } from '../../api/api.service';
import { Booking, Room } from '../../api/models';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AdminService } from '../../auth/admin.service';

@Component({
  selector: 'app-weekly-bookings',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, RouterLinkActive],
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
  isSaving = signal(false);
  rooms = signal<Room[]>([]);
  weeklyBookings = signal<Booking[]>([]);
  timeSlots = Array.from({ length: 15 }, (_, i) => i + 7);

  // MODAL STATE
  showModal = signal(false);
  bookingDate = signal<string>(''); // The specific date for the booking being created/edited
  selectedRoomId = signal('');
  currentImageIndex = signal<number>(0);

  // 'id' tracks whether we are creating (undefined) or updating (string)
  modalData = signal<{
    id?: string;
    groupId?: string;
    startTime: string;
    endTime: string;
    title: string;
    guestCount: number;
    creatorEmail: string;
    phone: string;
    meetingLink: string;
    platform: 'generic' | 'google' | 'teams' | 'zoom';
    recurrenceType: 'none' | 'daily' | 'workdays' | 'weekly' | 'monthly';
    recurrenceEndDate: string;
  }>({
    startTime: '',
    endTime: '',
    title: '',
    guestCount: 1,
    creatorEmail: '',
    phone: '',
    meetingLink: '',
    platform: 'generic',
    recurrenceType: 'none',
    recurrenceEndDate: '',
  });

  isEditing = computed(() => !!this.modalData().id);

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

  get selectedRoom() {
    return this.rooms().find((r) => r.name === this.selectedRoomId()) || null;
  }

  constructor() {
    this.adminService.checkAdmin();
  }

  async ngOnInit() {
    const roomsData = await this.api.getRooms();
    this.rooms.set(roomsData);
    if (roomsData.length > 0) {
      this.selectedRoomId.set(roomsData[0].name);
    }
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

  // Set the platform helper (for template usage if needed, though ngModel handles it)
  setPlatform(p: 'generic' | 'google' | 'teams' | 'zoom') {
    this.modalData.update((d) => ({ ...d, platform: p }));
  }

  getRoomName(id: string) {
    return this.rooms().find((r) => r.id === id)?.name || 'Room';
  }

  // --- MODAL LOGIC (Ported & Adapted) ---

  // 1. OPEN MODAL (New Booking)
  openModal(date: Date, timeStr: string) {
    this.bookingDate.set(date.toISOString().split('T')[0]);
    this.currentImageIndex.set(0);

    // Default to the first filtered room if available
    const availableRooms = this.filteredRooms();
    if (availableRooms.length > 0) {
      this.selectedRoomId.set(availableRooms[0].name);
    }

    let start = 9;
    if (timeStr) start = parseInt(timeStr.split(':')[0]);

    this.modalData.set({
      id: undefined,
      title: '',
      startTime: (start < 10 ? '0' : '') + start + ':00',
      endTime: (start + 1 < 10 ? '0' : '') + (start + 1) + ':00',
      guestCount: 1,
      creatorEmail: '',
      phone: '',
      meetingLink: '',
      platform: 'generic',
      recurrenceType: 'none',
      recurrenceEndDate: '',
    });
    this.showModal.set(true);
  }

  // 2. EDIT BOOKING
  editBooking(b: Booking) {
    if (b.createdBy !== this.currentUser()?.uid && !this.isAdmin()) {
      alert(
        `📅 Booking Details\n\n` +
          `📝 Title: ${b.title}\n` +
          `⏰ Time: ${this.minutesToTime(b.startTime)} – ${this.minutesToTime(b.startTime + b.duration)}`,
      );
      return;
    }

    // Set the specific date of this booking
    this.bookingDate.set(b.date);

    this.selectedRoomId.set(this.rooms().find((r) => r.id === b.roomId)?.name || '');
    this.currentImageIndex.set(0);

    this.modalData.set({
      id: b.id,
      groupId: (b as any).groupId,
      title: b.title,
      guestCount: b.guestCount,
      startTime: this.minutesToTime(b.startTime),
      endTime: this.minutesToTime(b.startTime + b.duration),
      creatorEmail: b.creatorEmail,
      phone: b.phone,
      meetingLink: (b as any).meetingLink || '',
      platform: (b as any).platform || 'generic',
      recurrenceType: (b as any).recurrenceType || 'none',
      recurrenceEndDate: '',
    });
    this.showModal.set(true);
  }

  async deleteSeries() {
    const groupId = this.modalData().groupId;
    if (!groupId) return;
    if (!confirm('Bạn có chắc chắn muốn xóa TẤT CẢ các lịch lặp lại trong chuỗi này?')) return;

    try {
      this.isSaving.set(true);
      await this.api.deleteBookingSeries(groupId);
      this.isSaving.set(false);
      this.closeModal();
      this.loadWeeklyBookings();
    } catch (e: any) {
      this.isSaving.set(false);
      alert('Lỗi khi xóa chuỗi lặp lại');
    }
  }

  // 3. SAVE (Create OR Update)
  async confirmBooking(mode: 'single' | 'series' = 'single') {
    const data = this.modalData();
    const room = this.rooms().find((r) => r.name === this.selectedRoomId());
    if (!room) return alert('Vui lòng nhập thông tin phòng');
    if (!data.title) return alert('Vui lòng nhập chủ đề');

    const [startH, startM] = data.startTime.split(':').map(Number);
    const [endH, endM] = data.endTime.split(':').map(Number);
    const startTotalMinutes = startH * 60 + startM;
    const endTotalMinutes = endH * 60 + endM;

    if (startTotalMinutes >= endTotalMinutes) return alert('Giờ kết thúc không hợp lệ');

    // Payload uses this.bookingDate() instead of this.selectedDate()
    const payload: any = {
      roomId: room.id,
      title: data.title,
      date: this.bookingDate(),
      startTime: startTotalMinutes,
      duration: endTotalMinutes - startTotalMinutes,
      guestCount: data.guestCount,
      phone: data.phone,
      meetingLink: data.meetingLink,
      platform: data.platform,
    };

    if (data.id) {
      // UPDATE
      payload.updateSeries = mode === 'series';
    } else {
      // CREATE
      if (data.recurrenceType !== 'none') {
        if (!data.recurrenceEndDate) return alert('Vui lòng chọn ngày kết thúc');
        payload.recurrence = {
          type: data.recurrenceType,
          endDate: data.recurrenceEndDate,
        };
      }
    }

    try {
      this.isSaving.set(true);
      if (data.id) {
        await this.api.updateBooking(data.id, payload);
      } else {
        await this.api.createBooking(payload);
      }
      this.isSaving.set(false);
      this.closeModal();
      this.loadWeeklyBookings();
    } catch (e: any) {
      console.error(e);
      this.isSaving.set(false);
      alert(`Lỗi khi lưu: ${e.error?.message || e.message}`);
    }
  }

  async deleteCurrentBooking() {
    const id = this.modalData().id;
    if (!id) return;
    if (!confirm('Bạn chắc chắn muốn xóa lịch này?')) return;
    try {
      await this.api.deleteBooking(id);
      this.closeModal();
      this.loadWeeklyBookings();
    } catch (e) {
      console.error(e);
      alert('Không thể xóa booking');
    }
  }

  // --- HELPERS ---
  closeModal() {
    this.showModal.set(false);
  }

  // Image Carousel
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

  minutesToTime(totalMinutes: number): string {
    const h = Math.floor(totalMinutes / 60)
      .toString()
      .padStart(2, '0');
    const m = (totalMinutes % 60).toString().padStart(2, '0');
    return `${h}:${m}`;
  }

  isTimeInvalid(time: string | undefined): boolean {
    if (!time) return true;
    return time < '07:00' || time > '21:00';
  }

  isTimeRangeInvalid(): boolean {
    const data = this.modalData();
    return (
      !data.title ||
      this.isTimeInvalid(data.startTime) ||
      this.isTimeInvalid(data.endTime) ||
      data.startTime >= data.endTime
    );
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
