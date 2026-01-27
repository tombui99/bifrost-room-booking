import { Component, signal, computed, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../../api/api.service';
import { Booking } from '../../api/models';

@Component({
  selector: 'app-control-deck',
  standalone: true,
  imports: [CommonModule, DatePipe],
  template: `
    <div
      class="w-screen h-screen bg-slate-900 text-white overflow-hidden font-sans flex select-none"
    >
      <div class="w-1/2 h-full p-10 flex flex-col relative z-10 border-r border-white/5">
        <div
          class="absolute inset-0 bg-gradient-to-br from-orange-900/20 via-slate-900 to-slate-900 -z-10"
        ></div>

        <div class="mb-12">
          <div class="text-7xl font-light tracking-tight mb-2">
            {{ currentTime() | date: 'h:mm a' }}
          </div>
          <div class="text-xl font-medium text-slate-300 flex items-center gap-3">
            <span
              class="bg-white/10 px-3 py-1 rounded text-sm uppercase tracking-widest text-orange-400 font-bold"
            >
              {{ roomInfo()?.name || 'ROOM' }}
            </span>
            <span class="opacity-50 text-sm">IP: 10.0.0.5</span>
          </div>
        </div>

        <div class="grid grid-cols-3 gap-6 mt-auto mb-8">
          <button
            (click)="startAdHocMeeting()"
            class="aspect-square rounded-3xl bg-gradient-to-br from-orange-600 to-orange-700 hover:from-orange-500 hover:to-orange-600 active:scale-95 transition-all flex flex-col items-center justify-center gap-3 shadow-lg shadow-orange-900/50"
          >
            <div class="text-3xl"><i class="fas fa-video"></i></div>
            <span class="font-medium text-sm">New Meeting</span>
          </button>

          <button
            class="aspect-square rounded-3xl bg-white/5 hover:bg-white/10 active:scale-95 transition-all flex flex-col items-center justify-center gap-3 border border-white/5"
          >
            <div class="text-3xl opacity-80"><i class="fas fa-phone-alt"></i></div>
            <span class="font-medium text-sm">Call</span>
          </button>

          <button
            class="aspect-square rounded-3xl bg-white/5 hover:bg-white/10 active:scale-95 transition-all flex flex-col items-center justify-center gap-3 border border-white/5"
          >
            <div class="text-3xl opacity-80"><i class="fas fa-arrow-up-from-bracket"></i></div>
            <span class="font-medium text-sm">Share</span>
          </button>

          <button
            class="aspect-square rounded-3xl bg-white/5 hover:bg-white/10 active:scale-95 transition-all flex flex-col items-center justify-center gap-3 border border-white/5"
          >
            <div
              class="text-2xl opacity-80 font-bold border-2 border-white/60 rounded-lg w-10 h-8 flex items-center justify-center text-xs"
            >
              ID
            </div>
            <span class="font-medium text-sm">Join via ID</span>
          </button>

          <button
            class="aspect-square rounded-3xl bg-white/5 hover:bg-white/10 active:scale-95 transition-all flex flex-col items-center justify-center gap-3 border border-white/5"
          >
            <div class="text-3xl opacity-80"><i class="fas fa-user-plus"></i></div>
            <span class="font-medium text-sm">Invite</span>
          </button>

          <button
            class="aspect-square rounded-3xl bg-white/5 hover:bg-white/10 active:scale-95 transition-all flex flex-col items-center justify-center gap-3 border border-white/5"
          >
            <div class="text-3xl opacity-80"><i class="fas fa-ellipsis"></i></div>
            <span class="font-medium text-sm">More</span>
          </button>
        </div>

        <div class="flex items-center gap-3 opacity-40 ml-2">
          <i class="fas fa-microphone text-lg"></i>
          <span class="text-sm font-medium">Say "Ok Google, join my meeting"</span>
        </div>
      </div>

      <div class="w-1/2 h-full bg-slate-950/80 p-8 flex flex-col relative">
        <div class="absolute inset-0 bg-blue-500/5 pointer-events-none"></div>

        <div class="flex items-center justify-between mb-8 z-10">
          <h2 class="text-2xl font-bold tracking-tight">Today's Schedule</h2>
          <div class="text-sm text-slate-400">{{ currentTime() | date: 'EEEE, MMMM d' }}</div>
        </div>

        <div class="flex-1 overflow-y-auto space-y-4 z-10 pr-2 custom-scrollbar">
          @for (meeting of upcomingEvents(); track meeting.id) {
            <div
              class="relative rounded-2xl p-6 transition-all border group overflow-hidden"
              [ngClass]="{
                'bg-slate-800/50 border-white/5': !isCurrent(meeting),
                'bg-indigo-900/40 border-indigo-500/50 shadow-2xl shadow-indigo-900/20':
                  isCurrent(meeting),
              }"
            >
              <div
                class="absolute left-0 top-0 bottom-0 w-1.5"
                [ngClass]="{
                  'bg-slate-600': !isCurrent(meeting),
                  'bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.5)]': isCurrent(meeting),
                }"
              ></div>

              <div class="ml-4 flex justify-between items-start">
                <div>
                  <h3 class="text-xl font-bold mb-1 text-white">{{ meeting.title }}</h3>
                  <div class="text-slate-400 text-sm mb-4 font-medium flex items-center gap-2">
                    <span
                      >{{ formatTime(meeting.startTime) }} -
                      {{ formatTime(meeting.startTime + meeting.duration) }}</span
                    >
                    <span class="w-1 h-1 rounded-full bg-slate-500"></span>
                    <span>{{ meeting.creatorEmail }}</span>
                  </div>
                </div>

                <div class="text-2xl">
                  @if (meeting.platform === 'google') {
                    <i class="fab fa-google text-white"></i>
                  }
                  @if (meeting.platform === 'teams') {
                    <i class="fab fa-microsoft text-blue-400"></i>
                  }
                  @if (meeting.platform === 'zoom') {
                    <i class="fas fa-video text-blue-500"></i>
                  }
                </div>
              </div>

              @if (meeting.meetingLink) {
                <div class="ml-4 mt-2">
                  <button
                    (click)="joinMeeting(meeting)"
                    class="w-full py-4 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-3"
                    [ngClass]="{
                      'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-900/40 transform hover:-translate-y-0.5':
                        isCurrent(meeting),
                      'bg-slate-700 hover:bg-slate-600 text-slate-200': !isCurrent(meeting),
                    }"
                  >
                    @if (isCurrent(meeting)) {
                      <span class="animate-pulse w-2 h-2 rounded-full bg-white"></span>
                    }
                    Join
                    {{
                      meeting.platform === 'teams'
                        ? 'Teams'
                        : meeting.platform === 'google'
                          ? 'Meet'
                          : 'Meeting'
                    }}
                  </button>
                </div>
              }
            </div>
          } @empty {
            <div
              class="h-64 flex flex-col items-center justify-center text-slate-600 border-2 border-dashed border-slate-800 rounded-3xl mt-10"
            >
              <i class="fas fa-mug-hot text-4xl mb-4 opacity-50"></i>
              <p class="font-medium">Room available for the rest of the day</p>
            </div>
          }
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      /* Scrollbar styling for the right panel */
      .custom-scrollbar::-webkit-scrollbar {
        width: 6px;
      }
      .custom-scrollbar::-webkit-scrollbar-track {
        background: transparent;
      }
      .custom-scrollbar::-webkit-scrollbar-thumb {
        background: #334155;
        border-radius: 10px;
      }
      .custom-scrollbar::-webkit-scrollbar-thumb:hover {
        background: #475569;
      }
    `,
  ],
})
export class ControlDeck implements OnInit, OnDestroy {
  api = inject(ApiService);
  route = inject(ActivatedRoute);

  roomId = signal<string>('');
  roomInfo = signal<any>(null);
  currentTime = signal<Date>(new Date());
  events = signal<Booking[]>([]);

  private clockInterval: any;
  private refreshInterval: any;

  // --- Computed ---
  currentMinutes = computed(() => {
    const now = this.currentTime();
    return now.getHours() * 60 + now.getMinutes();
  });

  upcomingEvents = computed(() => {
    const nowMins = this.currentMinutes();
    // 1. Filter: Meetings that end in the future
    // 2. Sort: Earliest first
    return this.events()
      .filter((e) => e.startTime + e.duration > nowMins)
      .sort((a, b) => a.startTime - b.startTime);
  });

  ngOnInit() {
    this.route.paramMap.subscribe((params) => {
      const id = params.get('id');
      if (id) {
        this.roomId.set(id);
        this.initializeData(id);
      }
    });

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
    this.refreshInterval = setInterval(() => this.loadBookings(id), 30000);
  }

  async loadRoomInfo(id: string) {
    try {
      this.roomInfo.set(await this.api.getRoomById(id));
    } catch (e) {
      console.error(e);
    }
  }

  async loadBookings(roomId: string) {
    const now = new Date();
    // Local date string for API query
    const offset = now.getTimezoneOffset() * 60000;
    const localISOTime = new Date(now.getTime() - offset).toISOString().slice(0, 10);

    try {
      const allBookings = await this.api.getBookings(localISOTime);
      this.events.set(allBookings.filter((b) => b.roomId === roomId));
    } catch (e) {
      console.error(e);
    }
  }

  refresh() {
    if (this.roomId()) this.loadBookings(this.roomId());
  }

  // --- Helpers ---

  // Check if a meeting is happening right now
  isCurrent(meeting: Booking): boolean {
    const now = this.currentMinutes();
    return meeting.startTime <= now && meeting.startTime + meeting.duration > now;
  }

  formatTime(totalMinutes: number): string {
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  }

  // --- Actions ---

  joinMeeting(meeting: any) {
    if (meeting.meetingLink) {
      // In a real Kiosk environment, this might trigger a specific app.
      // For web, we open a new tab.
      window.open(meeting.meetingLink, '_blank');
    }
  }

  startAdHocMeeting() {
    // Create a 30 min "Instant Meeting" to block the room
    if (!confirm('Start an instant 30-minute meeting?')) return;

    const duration = 30;
    const now = new Date();
    const startMins = now.getHours() * 60 + now.getMinutes();
    const offset = now.getTimezoneOffset() * 60000;
    const dateStr = new Date(now.getTime() - offset).toISOString().slice(0, 10);

    this.api
      .createBooking({
        roomId: this.roomId(),
        title: 'Instant Meeting',
        date: dateStr,
        startTime: startMins,
        duration: duration,
        guestCount: 1,
        type: 'busy',
        platform: 'generic',
      })
      .then(() => {
        this.refresh();
      })
      .catch((e) => alert('Failed to start meeting: ' + e));
  }
}
