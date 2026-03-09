import { create } from 'zustand';

export type CalendarViewMode = 'grid' | 'floorplan';

interface BookingStore {
  /** Currently selected date in the calendar */
  selectedDate: Date;
  /** Number of days visible in the calendar view */
  viewDays: 30 | 60 | 90;
  /** Currently selected booking ID (for the side panel) */
  selectedBooking: number | null;
  /** Whether the sidebar is open (mobile) */
  sidebarOpen: boolean;
  /** View mode: grid (шахматка) or floorplan (план этажей) */
  viewMode: CalendarViewMode;
  /** Focus date for floor plan view (single day) */
  focusDate: Date;
  /** Optional end date for floor plan period view */
  focusDateEnd: Date | null;

  setSelectedDate: (date: Date) => void;
  setViewDays: (days: 30 | 60 | 90) => void;
  selectBooking: (id: number | null) => void;
  toggleSidebar: () => void;
  setViewMode: (mode: CalendarViewMode) => void;
  setFocusDate: (date: Date) => void;
  setFocusDateEnd: (date: Date | null) => void;
  setFocusPeriod: (from: Date, to: Date | null) => void;
}

export const useBookingStore = create<BookingStore>((set) => ({
  selectedDate: new Date(),
  viewDays: 30,
  selectedBooking: null,
  sidebarOpen: false,
  viewMode: 'grid',
  focusDate: new Date(),
  focusDateEnd: null,

  setSelectedDate: (date) => set({ selectedDate: date }),
  setViewDays: (days) => set({ viewDays: days }),
  selectBooking: (id) => set({ selectedBooking: id }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setViewMode: (mode) => set({ viewMode: mode }),
  setFocusDate: (date) => set({ focusDate: date, focusDateEnd: null }),
  setFocusDateEnd: (date) => set({ focusDateEnd: date }),
  setFocusPeriod: (from, to) => set({ focusDate: from, focusDateEnd: to }),
}));
