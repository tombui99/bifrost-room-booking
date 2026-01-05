import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../api/api.service';
import { Room } from '../../api/models';

@Component({
  selector: 'app-room-manager',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <main class="relative bg-slate-50">
      <header
        class="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 shrink-0 z-20 shadow-sm"
      >
        <div
          class="md:hidden text-slate-500 text-xl cursor-pointer hover:text-emerald-600 transition"
        >
          <i class="fas fa-bars"></i>
        </div>
        <h2 class="text-xl font-bold text-slate-800 hidden md:block">Quản lý phòng</h2>
        <div class="flex gap-4">
          <button
            class="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm transition-all hover:shadow-md flex items-center gap-2 active:scale-95"
          >
            <i class="fas fa-plus"></i> <span class="hidden sm:inline">Tạo Mới</span>
          </button>
        </div>
      </header>
      <div class="flex h-screen bg-slate-50 font-sans text-slate-800 overflow-hidden">
        <div class="w-80 bg-white border-r border-slate-200 flex flex-col shrink-0">
          <div class="p-6 border-b border-slate-100">
            <h2 class="text-xl font-bold text-slate-800 mb-1">Room Manager</h2>
            <p class="text-xs text-slate-400">Manage facilities & settings</p>
          </div>

          <div class="p-4">
            <button
              (click)="selectNewRoom()"
              class="w-full py-3 rounded-xl border-2 border-dashed border-slate-300 text-slate-500 font-bold hover:border-emerald-500 hover:text-emerald-600 hover:bg-emerald-50 transition flex items-center justify-center gap-2"
            >
              <i class="fas fa-plus"></i> Add New Room
            </button>
          </div>

          <div class="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
            @for (room of rooms(); track room.id) {
            <div
              (click)="selectRoom(room)"
              class="p-4 rounded-xl border cursor-pointer transition-all hover:shadow-md relative group"
              [class]="
                selectedRoom()?.id === room.id
                  ? 'bg-emerald-50 border-emerald-500 ring-1 ring-emerald-500'
                  : 'bg-white border-slate-200 hover:border-emerald-300'
              "
            >
              <div class="flex items-start gap-3">
                <div
                  class="w-10 h-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-400 shadow-sm shrink-0"
                >
                  <i [class]="room.icon"></i>
                </div>
                <div class="overflow-hidden">
                  <h3 class="font-bold text-sm text-slate-800 truncate">{{ room.name }}</h3>
                  <p class="text-xs text-slate-500 truncate">{{ room.location }}</p>
                </div>
              </div>

              <div class="absolute top-4 right-4 w-2 h-2 rounded-full bg-emerald-500"></div>
            </div>
            }
          </div>
        </div>

        <div class="flex-1 flex flex-col h-full overflow-hidden relative">
          @if (selectedRoom(); as room) {
          <div
            class="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0"
          >
            <div>
              <h1 class="text-lg font-bold text-slate-800">
                {{ room.id ? 'Edit Room Details' : 'Create New Room' }}
              </h1>
              <p class="text-xs text-slate-400">ID: {{ room.id || 'New' }}</p>
            </div>

            <div class="flex gap-3">
              @if (room.id) {
              <button
                (click)="deleteRoom()"
                class="px-4 py-2 text-red-500 font-bold hover:bg-red-50 rounded-lg transition text-sm"
              >
                <i class="far fa-trash-alt mr-2"></i> Delete
              </button>
              }
              <button
                (click)="saveRoom()"
                class="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-6 rounded-lg shadow-lg shadow-emerald-200 transition active:scale-95 text-sm flex items-center gap-2"
              >
                <i class="fas fa-save"></i> Save Changes
              </button>
            </div>
          </div>

          <div class="flex-1 overflow-y-auto p-8 custom-scrollbar bg-slate-50/50 ">
            <div class="max-w-4xl mx-auto space-y-8">
              <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <h3 class="font-bold text-slate-800 mb-6 flex items-center gap-2">
                  <span
                    class="w-6 h-6 rounded bg-emerald-100 text-emerald-600 flex items-center justify-center text-xs"
                    ><i class="fas fa-info"></i
                  ></span>
                  General Information
                </h3>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label class="block text-xs font-bold text-slate-500 uppercase mb-2"
                      >Room Name <span class="text-red-500">*</span></label
                    >
                    <input
                      [(ngModel)]="room.name"
                      type="text"
                      class="w-full border border-slate-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-slate-700"
                      placeholder="e.g. Meeting Room A"
                    />
                  </div>
                  <div>
                    <label class="block text-xs font-bold text-slate-500 uppercase mb-2"
                      >Location <span class="text-red-500">*</span></label
                    >
                    <input
                      [(ngModel)]="room.location"
                      type="text"
                      class="w-full border border-slate-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="e.g. Floor 3, East Wing"
                    />
                  </div>
                  <div class="col-span-2">
                    <label class="block text-xs font-bold text-slate-500 uppercase mb-2"
                      >Description</label
                    >
                    <textarea
                      [(ngModel)]="room.description"
                      rows="3"
                      class="w-full border border-slate-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                      placeholder="Describe the room features..."
                    ></textarea>
                  </div>
                </div>
              </div>

              <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <h3 class="font-bold text-slate-800 mb-6 flex items-center gap-2">
                  <span
                    class="w-6 h-6 rounded bg-blue-100 text-blue-600 flex items-center justify-center text-xs"
                    ><i class="fas fa-sliders-h"></i
                  ></span>
                  Capacity & Visuals
                </h3>

                <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label class="block text-xs font-bold text-slate-500 uppercase mb-2"
                      >Max Logic Capacity</label
                    >
                    <input
                      [(ngModel)]="room.maxCapacity"
                      type="number"
                      class="w-full border border-slate-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-emerald-500 font-mono font-bold"
                    />
                    <p class="text-[10px] text-slate-400 mt-1">Used for validation.</p>
                  </div>
                  <div>
                    <label class="block text-xs font-bold text-slate-500 uppercase mb-2"
                      >Display Capacity</label
                    >
                    <input
                      [(ngModel)]="room.capacity"
                      type="text"
                      class="w-full border border-slate-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="e.g. 8-10 people"
                    />
                  </div>
                  <div>
                    <label class="block text-xs font-bold text-slate-500 uppercase mb-2"
                      >Icon (FontAwesome)</label
                    >
                    <div class="flex gap-2">
                      <div
                        class="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-xl text-slate-600"
                      >
                        <i [class]="room.icon"></i>
                      </div>
                      <input
                        [(ngModel)]="room.icon"
                        type="text"
                        class="flex-1 border border-slate-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                        placeholder="fas fa-tv"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <h3 class="font-bold text-slate-800 mb-6 flex items-center gap-2">
                  <span
                    class="w-6 h-6 rounded bg-purple-100 text-purple-600 flex items-center justify-center text-xs"
                    ><i class="fas fa-wifi"></i
                  ></span>
                  Amenities
                </h3>

                <div class="mb-4 flex flex-wrap gap-2">
                  @for (item of room.amenities; track item) {
                  <span
                    class="bg-slate-100 text-slate-700 px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2 border border-slate-200"
                  >
                    {{ item }}
                    <button (click)="removeAmenity(item)" class="text-slate-400 hover:text-red-500">
                      <i class="fas fa-times"></i>
                    </button>
                  </span>
                  }
                </div>

                <div class="flex gap-2">
                  <input
                    #newAmenity
                    type="text"
                    (keyup.enter)="addAmenity(newAmenity.value); newAmenity.value = ''"
                    class="flex-1 border border-slate-300 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="Type amenity and press Enter (e.g. 'Projector')"
                  />
                  <button
                    (click)="addAmenity(newAmenity.value); newAmenity.value = ''"
                    class="bg-slate-800 text-white px-6 rounded-xl font-bold hover:bg-slate-700"
                  >
                    Add
                  </button>
                </div>
              </div>

              <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 mb-36">
                <h3 class="font-bold text-slate-800 mb-6 flex items-center gap-2">
                  <span
                    class="w-6 h-6 rounded bg-orange-100 text-orange-600 flex items-center justify-center text-xs"
                    ><i class="fas fa-images"></i
                  ></span>
                  Gallery Images (URLs)
                </h3>

                <div class="space-y-3">
                  @for (img of room.images; track $index) {
                  <div class="flex gap-3 items-center">
                    <img
                      [src]="img"
                      class="w-16 h-10 object-cover rounded bg-slate-100 border border-slate-200"
                    />
                    <input
                      [(ngModel)]="room.images[$index]"
                      class="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-500"
                    />
                    <button
                      (click)="removeImage($index)"
                      class="text-slate-400 hover:text-red-500 p-2"
                    >
                      <i class="fas fa-trash"></i>
                    </button>
                  </div>
                  }
                </div>
                <button
                  (click)="addImage()"
                  class="mt-4 text-sm font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-2"
                >
                  <i class="fas fa-plus-circle"></i> Add Image URL
                </button>
              </div>
            </div>
          </div>
          } @else {
          <div class="flex-1 flex flex-col items-center justify-center text-slate-300">
            <i class="fas fa-door-open text-6xl mb-4"></i>
            <p class="text-lg font-medium text-slate-400">Select a room to edit details</p>
            <button
              (click)="selectNewRoom()"
              class="mt-4 text-emerald-600 font-bold hover:underline"
            >
              Or create a new one
            </button>
          </div>
          }
        </div>
      </div>
    </main>
  `,
  styles: [
    `
      .custom-scrollbar::-webkit-scrollbar {
        width: 6px;
      }
      .custom-scrollbar::-webkit-scrollbar-thumb {
        background-color: #cbd5e1;
        border-radius: 20px;
      }
      .custom-scrollbar::-webkit-scrollbar-track {
        background: transparent;
      }
    `,
  ],
})
export class Rooms implements OnInit {
  private api = inject(ApiService);

  // State
  rooms = signal<Room[]>([]);
  selectedRoom = signal<Room | null>(null);

  ngOnInit() {
    this.loadRooms();
  }

  // --- API OPERATIONS ---

  async loadRooms() {
    try {
      const data = await this.api.getRooms();
      this.rooms.set(data);
    } catch (e) {
      console.error('Error loading rooms', e);
    }
  }

  async saveRoom() {
    const room = this.selectedRoom();
    if (!room || !room.name) return alert('Room name is required');

    try {
      if (room.id) {
        // UPDATE existing room
        await this.api.updateRoom(room.id, room);
        alert('Room updated successfully');
      } else {
        // CREATE new room
        await this.api.createRoom(room);
        alert('Room created successfully');
      }
      this.loadRooms(); // Refresh list
    } catch (e) {
      console.error(e);
      alert('Failed to save room');
    }
  }

  async deleteRoom() {
    const room = this.selectedRoom();
    if (!room || !room.id) return;

    if (!confirm(`Are you sure you want to delete "${room.name}"? This action cannot be undone.`))
      return;

    try {
      // DELETE room
      await this.api.deleteRoom(room.id);
      this.selectedRoom.set(null); // Clear selection
      this.loadRooms(); // Refresh list
    } catch (e) {
      console.error(e);
      alert('Failed to delete room');
    }
  }

  // --- UI LOGIC ---

  selectRoom(room: Room) {
    // Create a copy to avoid mutating the list directly before saving
    this.selectedRoom.set(JSON.parse(JSON.stringify(room)));
  }

  selectNewRoom() {
    // Initialize blank template matching schema
    // this.selectedRoom.set({
    //   name: '',
    //   location: '',
    //   capacity: '',
    //   maxCapacity: 10,
    //   description: '',
    //   amenities: [],
    //   images: [],
    // });
  }

  // Amenities Helper
  addAmenity(text: string) {
    if (!text.trim()) return;
    this.selectedRoom.update((r) => {
      if (r) r.amenities.push(text.trim());
      return r;
    });
  }

  removeAmenity(text: string) {
    this.selectedRoom.update((r) => {
      if (r) r.amenities = r.amenities.filter((a) => a !== text);
      return r;
    });
  }

  // Images Helper
  addImage() {
    this.selectedRoom.update((r) => {
      if (r) r.images.push('');
      return r;
    });
  }

  removeImage(index: number) {
    this.selectedRoom.update((r) => {
      if (r) r.images.splice(index, 1);
      return r;
    });
  }
}
