import { Component, signal, computed, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../../api/api.service';
import { Booking } from '../../api/models';

type RoomState = 'free' | 'busy';

@Component({
  selector: 'app-tablet',
  standalone: true,
  imports: [CommonModule, DatePipe],
  template: `
    <div
      class="bg-gray-900 h-screen w-screen flex items-center justify-center overflow-hidden font-sans"
    >
      <div
        class="relative w-[1280px] h-[800px] bg-white rounded-3xl shadow-2xl overflow-hidden flex border-[12px] border-gray-800"
      >
        <div
          class="w-[55%] h-full flex flex-col justify-between p-12 text-white relative transition-colors duration-500 ease-in-out"
          [class.bg-emerald-500]="currentState() === 'free'"
          [class.bg-rose-600]="currentState() === 'busy'"
        >
          <div class="flex justify-between items-start z-10">
            <div>
              <div
                class="bg-black/10 backdrop-blur px-3 py-1 rounded-lg text-xs font-bold inline-block mb-2"
              >
                <img src="/assets/bifrost-logo.png" alt="Bifrost Logo" class="h-12 object-cover" />
              </div>
              <h1 class="text-4xl font-bold leading-tight">
                {{ roomInfo() ? roomInfo()?.name : 'Loading Room...' }}
              </h1>
              <p class="opacity-80 mt-2 text-sm">
                <i class="fas fa-users mr-2"></i>Sức chứa: {{ roomInfo()?.maxCapacity || '...' }}
              </p>
            </div>
          </div>

          <div class="flex flex-col justify-center items-start h-full space-y-4 z-10">
            <h2 class="text-8xl font-extrabold tracking-tight">
              @switch (currentState()) { @case ('free') { TRỐNG } @case ('busy') { BẬN } }
            </h2>
            <p class="text-2xl opacity-90 font-light border-l-4 border-white/40 pl-4">
              @switch (currentState()) { @case ('free') { Phòng đang trống. Có thể đặt ngay. } @case
              ('busy') { Đang họp. Vui lòng không làm phiền. } }
            </p>

            @if (currentMeeting(); as meeting) {
            <div class="mt-4 bg-black/10 rounded-lg p-4 w-full border border-white/10">
              <p class="font-bold text-lg text-white">{{ meeting.title }}</p>
              <p class="text-sm opacity-80 text-white">
                {{ formatTime(meeting.startTime) }} -
                {{ formatTime(meeting.startTime + meeting.duration) }}
              </p>
              <p class="text-xs opacity-60 mt-1">Host: {{ meeting.creatorEmail }}</p>
            </div>
            }
          </div>

          <div class="mt-auto pt-8 z-10">
            <button
              (click)="handleMainAction()"
              class="w-full bg-white transition-all font-bold h-24 rounded-2xl shadow-xl text-3xl flex items-center justify-center gap-4 active:scale-95 text-slate-800"
            >
              @if (currentState() === 'free') {
              <i class="fas fa-plus-circle text-emerald-600"></i> <span>Đặt Phòng Ngay</span>
              } @else {
              <i class="fas fa-stop-circle text-rose-600"></i> <span>Kết Thúc Sớm</span>
              }
            </button>
          </div>

          <div
            class="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none"
          ></div>
        </div>

        <div
          class="w-[45%] h-full bg-slate-50 flex flex-col border-l border-gray-200 text-slate-800"
        >
          <div
            class="p-8 border-b border-gray-200 bg-white flex justify-between items-center shadow-sm z-10"
          >
            <div>
              <h3 class="text-5xl font-light tracking-tighter">
                {{ currentTime() | date : 'HH:mm' }}
              </h3>
              <p class="text-slate-500 font-medium">{{ currentTime() | date : 'EEEE, d MMMM' }}</p>
            </div>
          </div>

          <div class="flex-1 overflow-y-auto p-8 relative space-y-6">
            @for (event of sortedEvents(); track event.id) {
            <div class="flex gap-4 transition-all duration-300">
              <div
                class="flex-1 p-5 rounded-xl border-l-4 transform transition-all bg-white border shadow-sm"
                [class.border-emerald-500]="event.type === 'mine'"
                [class.border-rose-500]="event.type === 'busy'"
              >
                <div class="flex justify-between">
                  <h4 class="font-bold text-lg text-slate-800">{{ event.title }}</h4>
                </div>
                <p class="text-sm text-slate-500 mt-1">
                  <i class="far fa-clock mr-1"></i>
                  {{ formatTime(event.startTime) }} –
                  {{ formatTime(event.startTime + event.duration) }}
                </p>
              </div>
            </div>
            } @empty {
            <div class="text-center text-slate-400 mt-20 flex flex-col items-center">
              <i class="fas fa-coffee text-4xl mb-4 text-slate-300"></i>
              <p>Không có lịch họp nào sắp tới hôm nay.</p>
            </div>
            }
          </div>
        </div>

        @if (showBookingModal()) {
        <div
          class="absolute inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center animate-fade-in"
        >
          <div
            class="bg-white/95 backdrop-blur-xl w-[500px] rounded-3xl p-8 shadow-2xl text-slate-800 text-center"
          >
            <h3 class="text-2xl font-bold mb-2">Đặt phòng nhanh</h3>
            <p class="text-slate-500 mb-8">Chọn thời lượng cho cuộc họp này</p>

            <div class="grid grid-cols-2 gap-4 mb-6">
              <button
                (click)="bookAdHoc(15)"
                class="bg-slate-50 hover:bg-emerald-50 border-2 border-slate-200 hover:border-emerald-500 p-6 rounded-2xl transition-all group"
              >
                <span class="block text-3xl font-bold text-slate-700 group-hover:text-emerald-700"
                  >15</span
                >
                <span
                  class="text-xs text-slate-400 group-hover:text-emerald-600 font-bold uppercase"
                  >Phút</span
                >
              </button>

              <button
                (click)="bookAdHoc(30)"
                class="bg-slate-50 hover:bg-emerald-50 border-2 border-slate-200 hover:border-emerald-500 p-6 rounded-2xl transition-all group"
              >
                <span class="block text-3xl font-bold text-slate-700 group-hover:text-emerald-700"
                  >30</span
                >
                <span
                  class="text-xs text-slate-400 group-hover:text-emerald-600 font-bold uppercase"
                  >Phút</span
                >
              </button>

              <button
                (click)="bookAdHoc(60)"
                class="bg-slate-50 hover:bg-emerald-50 border-2 border-slate-200 hover:border-emerald-500 p-6 rounded-2xl transition-all group"
              >
                <span class="block text-3xl font-bold text-slate-700 group-hover:text-emerald-700"
                  >1</span
                >
                <span
                  class="text-xs text-slate-400 group-hover:text-emerald-600 font-bold uppercase"
                  >Giờ</span
                >
              </button>

              <button
                (click)="bookAdHoc(120)"
                class="bg-slate-50 hover:bg-emerald-50 border-2 border-slate-200 hover:border-emerald-500 p-6 rounded-2xl transition-all group"
              >
                <span class="block text-3xl font-bold text-slate-700 group-hover:text-emerald-700"
                  >2</span
                >
                <span
                  class="text-xs text-slate-400 group-hover:text-emerald-600 font-bold uppercase"
                  >Giờ</span
                >
              </button>
            </div>

            <button
              (click)="closeModal()"
              class="text-slate-400 hover:text-slate-600 font-bold py-3"
            >
              Hủy bỏ
            </button>
          </div>
        </div>
        }
      </div>
    </div>
  `,
})
export class TabletView implements OnInit, OnDestroy {
  api = inject(ApiService);
  route = inject(ActivatedRoute);

  // --- STATE ---
  roomId = signal<string>('');
  roomInfo = signal<any | null>(null);

  currentTime = signal<Date>(new Date());
  events = signal<Booking[]>([]);
  showBookingModal = signal(false);

  // --- COMPUTED STATE (UPDATED FOR MINUTES) ---

  // Helper to get current time in minutes (0 - 1439)
  currentMinutes = computed(() => {
    const now = this.currentTime();
    return now.getHours() * 60 + now.getMinutes();
  });

  // Find the meeting happening right now
  currentMeeting = computed(() => {
    const nowMins = this.currentMinutes();
    return this.events().find((e) => {
      const start = e.startTime;
      const end = e.startTime + e.duration;
      return start <= nowMins && end > nowMins;
    });
  });

  // Determine Room State
  currentState = computed<RoomState>(() => {
    const meeting = this.currentMeeting();
    if (!meeting) return 'free';
    return 'busy';
  });

  // Filter and sort future events
  sortedEvents = computed(() => {
    const nowMins = this.currentMinutes();
    return (
      this.events()
        // Filter out events that have already ended
        .filter((e) => e.startTime + e.duration > nowMins)
        .sort((a, b) => a.startTime - b.startTime)
    );
  });

  private clockInterval: any;
  private refreshInterval: any;

  ngOnInit() {
    this.route.paramMap.subscribe((params) => {
      const id = params.get('id');
      if (id) {
        this.roomId.set(id);
        this.initializeData(id);
      } else {
        alert('Lỗi: URL không có ID phòng!');
      }
    });

    // Start Clock
    this.clockInterval = setInterval(() => {
      this.currentTime.set(new Date());
    }, 1000);
  }

  ngOnDestroy() {
    clearInterval(this.clockInterval);
    clearInterval(this.refreshInterval);
  }

  async initializeData(id: string) {
    await this.loadRoomInfo(id);
    await this.loadBookings(id);

    // Refresh bookings every 30 seconds
    this.refreshInterval = setInterval(() => {
      this.loadBookings(id);
    }, 30000);
  }

  async loadRoomInfo(id: string) {
    try {
      const info = await this.api.getRoomById(id);
      this.roomInfo.set(info);
    } catch (e) {
      console.error('Không tìm thấy phòng:', e);
      this.roomInfo.set(null);
    }
  }

  async loadBookings(roomId: string) {
    // Backend expects 'YYYY-MM-DD'
    // Ensure we handle timezone offset correctly or use local date string
    const now = new Date();
    // Simple trick to get local YYYY-MM-DD
    const offset = now.getTimezoneOffset() * 60000;
    const localISOTime = new Date(now.getTime() - offset).toISOString().slice(0, 10);

    try {
      const allBookings = await this.api.getBookings(localISOTime);
      // Backend returns all bookings for that date, we must filter by room here
      // (Or better, update backend to accept ?roomId=... but for now we filter client side)
      const roomBookings = allBookings.filter((b) => b.roomId === roomId);
      this.events.set(roomBookings);
    } catch (e) {
      console.error('Lỗi load bookings:', e);
    }
  }

  // --- USER ACTIONS ---

  handleMainAction() {
    const state = this.currentState();
    if (state === 'free') {
      this.showBookingModal.set(true);
    } else if (state === 'busy') {
      this.endMeeting();
    }
  }

  closeModal() {
    this.showBookingModal.set(false);
  }

  // 1. BOOK NOW
  async bookAdHoc(durationMinutes: number) {
    const now = new Date();
    // Calculate current minutes (e.g., 10:30 AM = 630)
    const startMinutes = now.getHours() * 60 + now.getMinutes();

    // Client-side conflict check
    const endMinutes = startMinutes + durationMinutes;
    const conflict = this.events().find((e) => {
      const eEnd = e.startTime + e.duration;
      // Overlap logic: (StartA < EndB) and (EndA > StartB)
      return e.startTime < endMinutes && eEnd > startMinutes;
    });

    if (conflict) {
      alert('Phòng đã có lịch đặt trong khoảng thời gian này!');
      this.loadBookings(this.roomId());
      return;
    }

    // Get Local Date YYYY-MM-DD
    const offset = now.getTimezoneOffset() * 60000;
    const dateStr = new Date(now.getTime() - offset).toISOString().slice(0, 10);

    try {
      await this.api.createBooking({
        roomId: this.roomId(),
        title: 'Walk-in Booking',
        date: dateStr,
        startTime: startMinutes,
        duration: durationMinutes, // Sends 15, 30, 60, or 120 directly
        guestCount: 1,
        type: 'busy',
      });
      this.closeModal();
      this.loadBookings(this.roomId());
    } catch (e: any) {
      alert(e.error?.message || 'Đặt phòng thất bại. Vui lòng thử lại.');
    }
  }

  // 2. END MEETING
  async endMeeting() {
    const meeting = this.currentMeeting();
    if (!meeting) return;
    if (!confirm('Kết thúc cuộc họp sớm?')) return;

    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    // Calculate new duration based on how much time has passed since start
    let newDuration = currentMinutes - meeting.startTime;

    // Safety check: Ensure duration is at least 1 minute (avoids negative or 0 duration)
    if (newDuration < 1) newDuration = 1;

    try {
      // FIX: The backend requires roomId, date, and startTime to check for conflicts
      // even when we are just reducing the duration.
      const payload = {
        roomId: meeting.roomId, // REQUIRED by backend
        date: meeting.date, // REQUIRED by backend
        startTime: meeting.startTime, // REQUIRED by backend
        duration: newDuration, // The value we are actually changing
        title: meeting.title, // Optional: keep original title
        guestCount: meeting.guestCount, // Optional: keep original count
      };

      await this.api.updateBooking(meeting.id, payload);

      // Reload to reflect changes immediately
      this.loadBookings(this.roomId());
    } catch (e) {
      console.error('Failed to end meeting:', e);
      alert('Không thể kết thúc cuộc họp. Vui lòng thử lại.');
    }
  }

  // --- HELPER: FORMAT MINUTES TO HH:MM ---
  formatTime(totalMinutes: number): string {
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    // Pad with leading zeros
    const hStr = h.toString().padStart(2, '0');
    const mStr = m.toString().padStart(2, '0');
    return `${hStr}:${mStr}`;
  }
}
