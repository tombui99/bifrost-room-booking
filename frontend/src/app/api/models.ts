// --- MODELS ---
export interface Room {
  id?: string;
  name: string;
  location: string;
  maxCapacity: number;
  description: string;
  amenities: string[];
  images: string[];
}

export interface Booking {
  id: string;
  roomId: string;
  title: string;
  date: string; // YYYY-MM-DD
  startTime: number;
  duration: number;
  type: 'busy' | 'mine' | 'pending';
  guestCount: number;
  createdBy: string;
  creatorEmail: string;
  phone: string;
  platform: string;
  meetingLink: string;
}
