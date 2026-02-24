import { create } from 'zustand';

interface BookingStore {
  /** Currently selected date in the calendar */
  selectedDate: Date;
  /** Number of days visible in the calendar view */
  viewDays: 30 | 60 | 90;
  /** Currently selected booking ID (for the side panel) */
  selectedBooking: number | null;
  /** Whether the sidebar is open (mobile) */
  sidebarOpen: boolean;

  setSelectedDate: (date: Date) => void;
  setViewDays: (days: 30 | 60 | 90) => void;
  selectBooking: (id: number | null) => void;
  toggleSidebar: () => void;
}

export const useBookingStore = create<BookingStore>((set) => ({
  selectedDate: new Date(),
  viewDays: 30,
  selectedBooking: null,
  sidebarOpen: false,

  setSelectedDate: (date) => set({ selectedDate: date }),
  setViewDays: (days) => set({ viewDays: days }),
  selectBooking: (id) => set({ selectedBooking: id }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
}));
