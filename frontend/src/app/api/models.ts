// --- MODELS ---
export interface Room {
  id: string;
  name: string;
  location: string;
  capacity: string;
  maxCapacity: number;
  icon: string;
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
}
