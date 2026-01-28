import { Component, signal, computed, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../../api/api.service';
import { Booking } from '../../api/models';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-control-deck',
  standalone: true,
  imports: [CommonModule, DatePipe, FormsModule],
  template: `
    <div
      class="w-screen h-screen bg-slate-900 text-white overflow-hidden font-sans flex select-none"
    >
      <!-- Left Panel: Controls -->
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
          </div>
        </div>

        <div class="grid grid-cols-3 gap-6 mt-auto mb-8">
          <!-- New Meeting -->
          <button
            (click)="startAdHocMeeting()"
            class="aspect-square rounded-3xl bg-linear-to-br from-orange-600 to-orange-700 hover:from-orange-500 hover:to-orange-600 active:scale-95 transition-all flex flex-col items-center justify-center gap-3 shadow-lg shadow-orange-900/50"
          >
            <div class="text-3xl"><i class="fas fa-video"></i></div>
            <span class="font-medium text-sm">New Meeting</span>
          </button>

          <!-- Share -->
          <button
            (click)="activeModal.set('share')"
            class="aspect-square rounded-3xl bg-white/5 hover:bg-white/10 active:scale-95 transition-all flex flex-col items-center justify-center gap-3 border border-white/5"
          >
            <div class="text-3xl opacity-80"><i class="fas fa-arrow-up-from-bracket"></i></div>
            <span class="font-medium text-sm">Share</span>
          </button>

          <!-- Join via ID -->
          <button
            (click)="activeModal.set('join-id')"
            class="aspect-square rounded-3xl bg-white/5 hover:bg-white/10 active:scale-95 transition-all flex flex-col items-center justify-center gap-3 border border-white/5"
          >
            <div
              class="text-2xl opacity-80 font-bold border-2 border-white/60 rounded-lg w-10 h-8 flex items-center justify-center text-xs"
            >
              ID
            </div>
            <span class="font-medium text-sm">Join via ID</span>
          </button>

          <!-- Invite -->
          <button
            (click)="activeModal.set('invite')"
            class="aspect-square rounded-3xl bg-white/5 hover:bg-white/10 active:scale-95 transition-all flex flex-col items-center justify-center gap-3 border border-white/5"
          >
            <div class="text-3xl opacity-80"><i class="fas fa-user-plus"></i></div>
            <span class="font-medium text-sm">Invite</span>
          </button>

          <!-- More -->
          <button
            (click)="activeModal.set('more')"
            class="aspect-square rounded-3xl bg-white/5 hover:bg-white/10 active:scale-95 transition-all flex flex-col items-center justify-center gap-3 border border-white/5"
          >
            <div class="text-3xl opacity-80"><i class="fas fa-ellipsis"></i></div>
            <span class="font-medium text-sm">More</span>
          </button>
        </div>
      </div>

      <!-- Right Panel: Schedule -->
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
                    <span>{{ meeting.creatorEmail || 'Guest' }}</span>
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

      <!-- MODALS -->
      @if (activeModal()) {
        <div
          class="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-sm"
          (click)="activeModal.set('')"
        >
          <div
            class="bg-slate-800 border border-white/10 rounded-3xl p-8 max-w-md w-full shadow-2xl"
            (click)="$event.stopPropagation()"
          >
            <!-- Share Modal -->
            @if (activeModal() === 'share') {
              <div class="text-center">
                <div class="text-5xl text-orange-400 mb-6">
                  <i class="fas fa-arrow-up-from-bracket"></i>
                </div>
                <h3 class="text-2xl font-bold mb-4">Wireless Sharing</h3>
                <p class="text-slate-300 mb-6">
                  To share your screen, visit:
                  <br />
                  <span class="text-orange-400 font-mono text-xl">share.bifrost.com</span>
                </p>
                <div class="bg-white p-4 rounded-2xl inline-block mb-6">
                  <div
                    class="w-32 h-32 bg-slate-200 flex items-center justify-center text-slate-400 text-xs"
                  >
                    QR CODE HERE
                  </div>
                </div>
                <button
                  (click)="activeModal.set('')"
                  class="w-full py-4 bg-slate-700 rounded-xl font-bold"
                >
                  Close
                </button>
              </div>
            }

            <!-- Join via ID Modal -->
            @if (activeModal() === 'join-id') {
              <div>
                <h3 class="text-2xl font-bold mb-6">Join with Meeting Link</h3>
                <input
                  type="text"
                  [(ngModel)]="meetingInput"
                  placeholder="https://zoom.us/j/..."
                  class="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 mb-6 text-white"
                />
                <div class="flex gap-4">
                  <button
                    (click)="activeModal.set('')"
                    class="flex-1 py-4 bg-slate-700 rounded-xl font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    (click)="joinViaInput()"
                    class="flex-1 py-4 bg-orange-600 rounded-xl font-bold"
                  >
                    Join
                  </button>
                </div>
              </div>
            }

            <!-- Invite Modal -->
            @if (activeModal() === 'invite') {
              <div>
                <h3 class="text-2xl font-bold mb-6">Invite Guests</h3>
                <p class="text-sm text-slate-400 mb-4">Add people to the current meeting</p>
                <input
                  type="email"
                  [(ngModel)]="inviteInput"
                  placeholder="email@example.com"
                  class="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 mb-6 text-white"
                />
                <div class="flex gap-4">
                  <button
                    (click)="activeModal.set('')"
                    class="flex-1 py-4 bg-slate-700 rounded-xl font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    (click)="sendInvite()"
                    [disabled]="!inviteInput"
                    class="flex-1 py-4 bg-indigo-600 rounded-xl font-bold disabled:opacity-50"
                  >
                    Invite
                  </button>
                </div>
              </div>
            }

            <!-- More Modal -->
            @if (activeModal() === 'more') {
              <div class="space-y-4">
                <h3 class="text-2xl font-bold mb-6">Room Settings</h3>

                <button
                  (click)="extendMeeting(15)"
                  [disabled]="!currentBooking()"
                  class="w-full py-4 bg-slate-700 hover:bg-slate-600 rounded-xl font-bold flex items-center justify-between px-6 disabled:opacity-30"
                >
                  <span>Extend Meeting (15m)</span>
                  <i class="fas fa-clock"></i>
                </button>

                <button
                  (click)="endMeetingEarly()"
                  [disabled]="!currentBooking()"
                  class="w-full py-4 bg-red-900/40 hover:bg-red-900/60 text-red-400 rounded-xl font-bold flex items-center justify-between px-6 disabled:opacity-30"
                >
                  <span>End Meeting Early</span>
                  <i class="fas fa-sign-out-alt"></i>
                </button>

                <hr class="border-white/5 my-2" />

                <button
                  (click)="refreshSchedule()"
                  class="w-full py-4 bg-slate-700 hover:bg-slate-600 rounded-xl font-bold flex items-center justify-between px-6"
                >
                  <span>Refresh Schedule</span>
                  <i class="fas fa-sync-alt"></i>
                </button>

                <button
                  (click)="activeModal.set('')"
                  class="w-full py-4 border border-white/10 rounded-xl font-bold mt-4"
                >
                  Close
                </button>
              </div>
            }
          </div>
        </div>
      }
    </div>
  `,
  styles: [
    `
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

  // Modal states
  activeModal = signal<string>('');
  meetingInput = '';
  inviteInput = '';

  private clockInterval: any;
  private refreshInterval: any;

  // --- Computed ---
  currentMinutes = computed(() => {
    const now = this.currentTime();
    return now.getHours() * 60 + now.getMinutes();
  });

  upcomingEvents = computed(() => {
    const nowMins = this.currentMinutes();
    return this.events()
      .filter((e) => e.startTime + e.duration > nowMins)
      .sort((a, b) => a.startTime - b.startTime);
  });

  currentBooking = computed(() => {
    const now = this.currentMinutes();
    return this.events().find((e) => e.startTime <= now && e.startTime + e.duration > now);
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
    this.refreshInterval = setInterval(() => this.loadBookings(id), 60000);
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
    const offset = now.getTimezoneOffset() * 60000;
    const localISOTime = new Date(now.getTime() - offset).toISOString().slice(0, 10);

    try {
      const allBookings = await this.api.getBookings(localISOTime);
      this.events.set(allBookings.filter((b) => b.roomId === roomId));
    } catch (e) {
      console.error(e);
    }
  }

  // --- Helpers ---
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
      window.open(meeting.meetingLink, '_blank');
    }
  }

  joinViaInput() {
    if (this.meetingInput) {
      window.open(this.meetingInput, '_blank');
      this.activeModal.set('');
      this.meetingInput = '';
    }
  }

  async sendInvite() {
    if (!this.inviteInput) return;
    const current = this.currentBooking();
    if (!current) return;

    try {
      // In a real app, this would be an API call to add a guest
      // For now, we simulate a success message
      alert(`Invite sent to ${this.inviteInput}`);
      this.inviteInput = '';
      this.activeModal.set('');
    } catch (e) {
      alert('Failed to send invite');
    }
  }

  async startAdHocMeeting() {
    if (!confirm('Start an instant 30-minute meeting?')) return;

    const duration = 30;
    const now = new Date();
    const startMins = now.getHours() * 60 + now.getMinutes();
    const offset = now.getTimezoneOffset() * 60000;
    const dateStr = new Date(now.getTime() - offset).toISOString().slice(0, 10);

    try {
      await this.api.createBooking({
        roomId: this.roomId(),
        title: 'Instant Meeting',
        date: dateStr,
        startTime: startMins,
        duration: duration,
        guestCount: 1,
        type: 'busy',
        platform: 'generic',
      });
      await this.loadBookings(this.roomId());
    } catch (e) {
      alert('Failed to start meeting: ' + e);
    }
  }

  async endMeetingEarly() {
    const current = this.currentBooking();
    if (!current || !confirm('End current meeting early?')) return;

    try {
      await this.api.deleteBooking(current.id);
      await this.loadBookings(this.roomId());
      this.activeModal.set('');
    } catch (e) {
      alert('Failed to end meeting early');
    }
  }

  async extendMeeting(mins: number) {
    const current = this.currentBooking();
    if (!current) return;

    try {
      await this.api.updateBooking(current.id, {
        ...current,
        duration: current.duration + mins,
      });
      await this.loadBookings(this.roomId());
      this.activeModal.set('');
    } catch (e) {
      alert('Failed to extend meeting: Might be a conflict');
    }
  }

  refreshSchedule() {
    this.loadBookings(this.roomId());
    this.activeModal.set('');
  }
}
