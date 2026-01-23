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
    <div class="relative w-screen h-screen overflow-hidden font-sans text-white select-none">
      <div class="absolute inset-0 z-0">
        <img
          src="https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=2301&auto=format&fit=crop"
          alt="Office Background"
          class="w-full h-full object-cover"
        />
      </div>

      @if (currentState() === 'free') {
        <div class="absolute inset-0 z-10 bg-emerald-600/90 backdrop-blur-sm flex animate-fade-in">
          <div class="w-2/3 h-full p-16 flex flex-col justify-between">
            <div>
              <div class="flex items-center gap-4 mb-6">
                <div class="font-bold text-2xl tracking-widest opacity-80">BIFROST</div>
              </div>

              <h1 class="text-7xl font-bold mb-4">{{ roomInfo()?.name || 'Loading...' }}</h1>

              <div class="flex items-center gap-3 text-emerald-100 text-xl font-medium">
                <span
                  class="bg-emerald-500/50 px-3 py-1 rounded-full text-sm font-bold tracking-wide uppercase"
                  >Available</span
                >
                <i class="fas fa-users text-sm"></i>
                <span>{{ roomInfo()?.maxCapacity || 0 }} seats</span>
              </div>

              <p class="mt-8 text-3xl font-light opacity-90">
                Available for
                <span class="font-bold">{{
                  minutesUntilNext() > 0 ? minutesUntilNext() + ' mins' : 'the rest of the day'
                }}</span>
              </p>
            </div>

            <div class="space-y-4">
              <p class="text-sm font-bold uppercase opacity-70 tracking-wider">Book now for</p>
              <div class="flex gap-4">
                <button
                  (click)="bookAdHoc(15)"
                  class="bg-white text-emerald-800 hover:bg-emerald-50 active:scale-95 transition-all h-20 w-32 rounded-xl font-bold text-xl shadow-lg flex flex-col items-center justify-center"
                >
                  <span>15</span>
                  <span class="text-xs font-normal opacity-60">min</span>
                </button>
                <button
                  (click)="bookAdHoc(30)"
                  class="bg-white text-emerald-800 hover:bg-emerald-50 active:scale-95 transition-all h-20 w-32 rounded-xl font-bold text-xl shadow-lg flex flex-col items-center justify-center"
                >
                  <span>30</span>
                  <span class="text-xs font-normal opacity-60">min</span>
                </button>
                <button
                  (click)="bookAdHoc(60)"
                  class="bg-white text-emerald-800 hover:bg-emerald-50 active:scale-95 transition-all h-20 w-32 rounded-xl font-bold text-xl shadow-lg flex flex-col items-center justify-center"
                >
                  <span>60</span>
                  <span class="text-xs font-normal opacity-60">min</span>
                </button>
                <button
                  (click)="showBookingModal.set(true)"
                  class="bg-emerald-800/40 hover:bg-emerald-800/60 text-white border-2 border-white/20 active:scale-95 transition-all h-20 w-32 rounded-xl font-bold text-lg flex items-center justify-center"
                >
                  More
                </button>
              </div>
            </div>

            <div
              class="text-sm font-medium mt-auto pt-8 bg-white/90 backdrop-blur rounded-xl shadow-lg p-4 w-fit"
            >
              <img
                src="/assets/booking-qr.png"
                alt="Scan to book"
                class="w-28 h-28 object-contain"
              />
              <span class="text-xs text-slate-500 font-medium text-center">
                Scan để đặt phòng
              </span>
            </div>
          </div>

          <div
            class="w-1/3 h-full border-l border-white/10 relative bg-gradient-to-l from-black/10 to-transparent p-12 overflow-hidden"
          >
            <div class="absolute top-12 right-12 text-right">
              <div class="text-sm opacity-70">Now</div>
              <div class="text-4xl font-light">{{ currentTime() | date: 'HH:mm' }}</div>
            </div>

            <div class="mt-32 space-y-12 relative border-l-2 border-white/20 pl-8 ml-4">
              @for (event of sortedEvents().slice(0, 3); track event.id) {
                <div class="relative">
                  <div
                    class="absolute -left-[39px] top-1 w-5 h-5 rounded-full bg-white border-4 border-emerald-600"
                  ></div>
                  <div class="opacity-80 text-sm mb-1">{{ formatTime(event.startTime) }}</div>
                  <div class="font-bold text-xl leading-tight">{{ event.title }}</div>
                  <div class="text-sm opacity-60 mt-1">
                    {{ formatDuration(event.duration) }} • {{ event.creatorEmail }}
                  </div>
                </div>
              } @empty {
                <div class="text-white/40 italic mt-20">No upcoming meetings today</div>
              }
            </div>
          </div>
        </div>
      }

      @if (currentState() === 'busy') {
        <div
          class="absolute inset-0 z-10 bg-slate-900/85 backdrop-blur-md flex flex-col animate-fade-in"
        >
          <div class="flex justify-between items-start p-12">
            <div>
              <div class="flex items-center gap-4 mb-6">
                <div class="font-bold text-2xl tracking-widest opacity-80">BIFROST</div>
              </div>
              <div class="text-7xl font-light tracking-tighter">
                {{ currentTime() | date: 'HH:mm' }}
              </div>
              <div class="text-slate-400 text-xl font-medium mt-1">
                {{ currentTime() | date: 'EEEE, MMMM d' }}
              </div>
            </div>
            <div class="text-right">
              <h1 class="text-5xl font-bold">{{ roomInfo()?.name }}</h1>
              <div class="mt-2 text-slate-400 flex justify-end items-center gap-2">
                <div class="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></div>
                Occupied
              </div>
            </div>
          </div>

          <div class="flex-1 px-12 pb-8 overflow-y-auto w-full max-w-5xl mx-auto space-y-2">
            @if (currentMeeting(); as meeting) {
              <div class="border-l-4 border-rose-500 bg-white/5 p-6 rounded-r-lg mb-8">
                <div
                  class="flex justify-between items-center text-rose-400 font-bold mb-2 uppercase text-xs tracking-wider"
                >
                  <span>Current Meeting</span>
                  <span>Ends {{ formatTime(meeting.startTime + meeting.duration) }}</span>
                </div>
                <div class="text-3xl font-bold text-white">{{ meeting.title }}</div>
                <div class="text-slate-400 mt-1">Host: {{ meeting.creatorEmail }}</div>

                <div class="w-full bg-white/10 h-1 mt-6 rounded-full overflow-hidden">
                  <div
                    class="bg-rose-500 h-full transition-all duration-1000"
                    [style.width.%]="meetingProgress()"
                  ></div>
                </div>
              </div>
            }

            @for (event of sortedEvents(); track event.id) {
              <div
                class="flex items-center gap-8 py-4 border-b border-white/10 text-slate-300 opacity-60 hover:opacity-100 transition-opacity"
              >
                <div class="w-32 font-mono text-xl text-right">
                  {{ formatTime(event.startTime) }}
                  <span class="text-sm opacity-50 block">{{
                    formatTime(event.startTime + event.duration)
                  }}</span>
                </div>
                <div class="h-12 w-0.5 bg-white/20"></div>
                <div>
                  <div class="text-xl font-bold text-white">{{ event.title }}</div>
                  <div class="text-sm">{{ event.creatorEmail }}</div>
                </div>
              </div>
            }
          </div>

          <div
            class="text-sm font-medium mt-auto pt-8 bg-white/90 backdrop-blur rounded-xl shadow-lg p-4 w-fit mb-6 ml-4"
          >
            <img src="/assets/booking-qr.png" alt="Scan to book" class="w-28 h-28 object-contain" />
            <span class="text-xs text-slate-500 font-medium text-center"> Scan để đặt phòng </span>
          </div>

          <div
            class="h-32 bg-rose-600 w-full flex items-center justify-between px-12 shadow-2xl z-20"
          >
            <div>
              <h2 class="text-4xl font-bold">Busy</h2>
              <p class="text-rose-200 opacity-90 text-lg">Do not disturb</p>
            </div>

            <button
              (click)="endMeeting()"
              class="border-2 border-white/30 hover:bg-white hover:text-rose-600 text-white font-bold py-4 px-8 rounded-xl transition-all text-xl uppercase tracking-wide"
            >
              End Meeting
            </button>
          </div>
        </div>
      }

      @if (showBookingModal()) {
        <div
          class="absolute inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center animate-fade-in"
        >
          <div class="bg-white text-slate-800 w-[500px] rounded-3xl p-8 shadow-2xl text-center">
            <h3 class="text-2xl font-bold mb-6">Custom Duration</h3>
            <div class="grid grid-cols-2 gap-4 mb-6">
              <button
                (click)="bookAdHoc(90)"
                class="p-6 bg-slate-100 rounded-xl font-bold hover:bg-emerald-100 hover:text-emerald-700 transition"
              >
                1.5 Hours
              </button>
              <button
                (click)="bookAdHoc(120)"
                class="p-6 bg-slate-100 rounded-xl font-bold hover:bg-emerald-100 hover:text-emerald-700 transition"
              >
                2 Hours
              </button>
              <button
                (click)="bookAdHoc(180)"
                class="p-6 bg-slate-100 rounded-xl font-bold hover:bg-emerald-100 hover:text-emerald-700 transition"
              >
                3 Hours
              </button>
              <button
                (click)="bookAdHoc(240)"
                class="p-6 bg-slate-100 rounded-xl font-bold hover:bg-emerald-100 hover:text-emerald-700 transition"
              >
                4 Hours
              </button>
            </div>
            <button
              (click)="closeModal()"
              class="text-slate-400 font-bold py-3 hover:text-slate-600"
            >
              Cancel
            </button>
          </div>
        </div>
      }
    </div>
  `,
  styles: [
    `
      @keyframes fade-in {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }
      .animate-fade-in {
        animation: fade-in 0.3s ease-out forwards;
      }
    `,
  ],
})
export class TabletView implements OnInit, OnDestroy {
  api = inject(ApiService);
  route = inject(ActivatedRoute);

  roomId = signal<string>('');
  roomInfo = signal<any | null>(null);
  currentTime = signal<Date>(new Date());
  events = signal<Booking[]>([]);
  showBookingModal = signal(false);

  // --- COMPUTED STATE ---
  currentMinutes = computed(() => {
    const now = this.currentTime();
    return now.getHours() * 60 + now.getMinutes();
  });

  currentMeeting = computed(() => {
    const nowMins = this.currentMinutes();
    return this.events().find((e) => {
      const start = e.startTime;
      const end = e.startTime + e.duration;
      return start <= nowMins && end > nowMins;
    });
  });

  currentState = computed<RoomState>(() => {
    return this.currentMeeting() ? 'busy' : 'free';
  });

  // Calculate percentage of meeting completed for the progress bar
  meetingProgress = computed(() => {
    const meeting = this.currentMeeting();
    if (!meeting) return 0;
    const nowMins = this.currentMinutes();
    const totalDuration = meeting.duration;
    const elapsed = nowMins - meeting.startTime;
    return Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));
  });

  // Helper for "Available for X mins"
  minutesUntilNext = computed(() => {
    const nowMins = this.currentMinutes();
    const sorted = this.sortedEvents();

    // If no future meetings, return logical infinity (e.g. end of day)
    if (sorted.length === 0) return 0; // 0 implies "rest of day" in template logic

    const nextStart = sorted[0].startTime;
    return Math.max(0, nextStart - nowMins);
  });

  sortedEvents = computed(() => {
    const nowMins = this.currentMinutes();
    return this.events()
      .filter((e) => e.startTime + e.duration > nowMins) // Only future or current meetings
      .filter((e) => e.id !== this.currentMeeting()?.id) // Exclude current meeting from "upcoming" list
      .sort((a, b) => a.startTime - b.startTime);
  });

  private clockInterval: any;
  private refreshInterval: any;

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
    const offset = now.getTimezoneOffset() * 60000;
    const localISOTime = new Date(now.getTime() - offset).toISOString().slice(0, 10);
    try {
      const allBookings = await this.api.getBookings(localISOTime);
      this.events.set(allBookings.filter((b) => b.roomId === roomId));
    } catch (e) {
      console.error(e);
    }
  }

  closeModal() {
    this.showBookingModal.set(false);
  }

  async bookAdHoc(durationMinutes: number) {
    const now = new Date();
    const startMinutes = now.getHours() * 60 + now.getMinutes();

    // Conflict Check
    const endMinutes = startMinutes + durationMinutes;
    const conflict = this.events().find((e) => {
      const eEnd = e.startTime + e.duration;
      return e.startTime < endMinutes && eEnd > startMinutes;
    });

    if (conflict) {
      alert('Room is booked during this time.');
      return;
    }

    const offset = now.getTimezoneOffset() * 60000;
    const dateStr = new Date(now.getTime() - offset).toISOString().slice(0, 10);

    try {
      await this.api.createBooking({
        roomId: this.roomId(),
        title: 'Walk-in Booking',
        date: dateStr,
        startTime: startMinutes,
        duration: durationMinutes,
        guestCount: 1,
        type: 'busy',
      });
      this.closeModal();
      this.loadBookings(this.roomId());
    } catch (e: any) {
      alert('Booking failed.');
    }
  }

  async endMeeting() {
    const meeting = this.currentMeeting();
    if (!meeting || !confirm('End current meeting early?')) return;

    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const minutesPassed = currentMinutes - meeting.startTime;

    try {
      if (minutesPassed < 1) {
        await this.api.deleteBooking(meeting.id);
      } else {
        await this.api.updateBooking(meeting.id, {
          ...meeting,
          duration: minutesPassed,
        });
      }
      this.loadBookings(this.roomId());
    } catch (e) {
      alert('Could not end meeting.');
    }
  }

  formatTime(totalMinutes: number): string {
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  }

  formatDuration(mins: number): string {
    if (mins >= 60) {
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      return m > 0 ? `${h}h ${m}m` : `${h}h`;
    }
    return `${mins}m`;
  }
}
