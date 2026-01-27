import {
  Component,
  EventEmitter,
  Input,
  Output,
  computed,
  inject,
  signal,
  effect,
} from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Booking, Room } from '../../../api/models';
import { ApiService } from '../../../api/api.service';
import { User } from '@angular/fire/auth';

@Component({
  selector: 'app-booking-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe],
  templateUrl: './booking-modal.html',
})
export class BookingModalComponent {
  api = inject(ApiService);

  @Input() rooms: Room[] = [];
  @Input() currentUser: User | null | undefined = null;
  @Input() isAdmin = false;

  // If provided, we are in EDIT mode
  @Input() set booking(b: Booking | null) {
    if (b) {
      this.initEdit(b);
    }
  }

  // If provided (and no booking), we are in CREATE mode with these defaults
  @Input() set prefillData(data: { date: string; time?: string; roomId?: string } | null) {
    if (data && !this.modalData().id) {
      this.initCreate(data);
    }
  }

  @Output() close = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  // UI STATE
  isSaving = signal(false);
  currentImageIndex = signal<number>(0);

  // Internal state for the form
  selectedRoomId = signal('');

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
    date: string; // Add date to modal data
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
    date: new Date().toISOString().split('T')[0],
  });

  isEditing = computed(() => !!this.modalData().id);
  selectedRoom = computed(() => this.rooms.find((r) => r.name === this.selectedRoomId()) || null);
  timeSlots = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21];

  constructor() {
    // Sync selectedRoomId to modalData if needed, or vice-versa?
    // Actually selectedRoomId is easier to bind to the select box.
  }

  private initCreate(data: { date: string; time?: string; roomId?: string }) {
    if (data.roomId) {
      this.selectedRoomId.set(data.roomId);
      this.currentImageIndex.set(0);
    }

    let start = 9;
    if (data.time) start = parseInt(data.time.split(':')[0]);

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
      date: data.date,
    });
  }

  private initEdit(b: Booking) {
    const roomName = this.rooms.find((r) => r.id === b.roomId)?.name || '';
    this.selectedRoomId.set(roomName);
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
      date: b.date,
    });
  }

  // --- ACTIONS ---

  closeModal() {
    this.close.emit();
  }

  async confirmBooking(mode: 'single' | 'series' = 'single') {
    const data = this.modalData();
    const room = this.rooms.find((r) => r.name === this.selectedRoomId());
    if (!room) return alert('Vui lòng nhập thông tin phòng');
    if (!data.title) return alert('Vui lòng nhập chủ đề');

    const [startH, startM] = data.startTime.split(':').map(Number);
    const [endH, endM] = data.endTime.split(':').map(Number);
    const startTotalMinutes = startH * 60 + startM;
    const endTotalMinutes = endH * 60 + endM;

    if (startTotalMinutes >= endTotalMinutes) return alert('Giờ kết thúc không hợp lệ');

    // Basic Payload
    const payload: any = {
      roomId: room.id,
      title: data.title,
      date: data.date,
      startTime: startTotalMinutes,
      duration: endTotalMinutes - startTotalMinutes,
      guestCount: data.guestCount,
      phone: data.phone,
      meetingLink: data.meetingLink,
      platform: data.platform,
    };

    if (data.id) {
      // UPDATE MODE
      payload.updateSeries = mode === 'series';
    } else {
      // CREATE MODE
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
      this.saved.emit();
      this.closeModal();
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
      this.saved.emit();
      this.closeModal();
    } catch (e) {
      console.error(e);
      alert('Không thể xóa booking');
    }
  }

  async deleteSeries() {
    const groupId = this.modalData().groupId;
    if (!groupId) return;

    if (!confirm('Bạn có chắc chắn muốn xóa TẤT CẢ các lịch lặp lại trong chuỗi này?')) return;

    try {
      this.isSaving.set(true);
      await this.api.deleteBookingSeries(groupId);
      this.isSaving.set(false);
      this.saved.emit();
      this.closeModal();
    } catch (e: any) {
      this.isSaving.set(false);
      alert('Lỗi khi xóa chuỗi lặp lại');
    }
  }

  // --- HELPERS ---

  setPlatform(p: 'generic' | 'google' | 'teams' | 'zoom') {
    this.modalData.update((d) => ({ ...d, platform: p }));
  }

  nextImage(e: Event) {
    e.stopPropagation();
    const imgs = this.selectedRoom()?.images || [];
    if (imgs.length) this.currentImageIndex.update((i) => (i + 1) % imgs.length);
  }

  prevImage(e: Event) {
    e.stopPropagation();
    const imgs = this.selectedRoom()?.images || [];
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
}
