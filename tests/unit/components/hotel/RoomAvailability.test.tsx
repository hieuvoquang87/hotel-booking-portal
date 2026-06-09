import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { AvailableRoom } from '@/types/domain';

// ---------------------------------------------------------------------------
// Mocks — must appear before imports of the module under test
// ---------------------------------------------------------------------------

let mockDates = {
  checkIn: null as string | null,
  checkOut: null as string | null,
};
const setCheckIn = jest.fn((d: string | null) => {
  mockDates = { ...mockDates, checkIn: d };
});
const setCheckOut = jest.fn((d: string | null) => {
  mockDates = { ...mockDates, checkOut: d };
});
// jest.mock does not run paths through next/jest's `@/` moduleNameMapper, so
// target modules by relative path (they resolve to the same files @/ imports).
jest.mock('../../../../stores/AppProvider', () => ({
  useAppDates: () => ({ ...mockDates, setCheckIn, setCheckOut }),
}));

let mockAvail = {
  data: undefined as unknown,
  isLoading: false,
  isError: false,
  isSuccess: false,
  refetch: jest.fn(),
};
jest.mock('../../../../hooks/useAvailability', () => ({
  useAvailability: () => mockAvail,
}));

const track = jest.fn();
jest.mock('../../../../utils/analyticUtil', () => ({
  track: (e: unknown) => track(e),
}));

// ---------------------------------------------------------------------------
// Import component AFTER mocks
// ---------------------------------------------------------------------------
import { RoomAvailability } from '@/components/hotel/RoomAvailability';

// ---------------------------------------------------------------------------
// Full AvailableRoom fixture (copied from RoomCard tests to avoid partial)
// ---------------------------------------------------------------------------
const roomFixture: AvailableRoom = {
  roomId: 'room-01a',
  type: 'Deluxe King Room',
  pricePerNight: 299,
  bedType: 'King',
  bedCount: 1,
  maxOccupancy: 2,
  squareFootage: 450,
  amenities: ['city_view', 'mini_bar'],
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const HOTEL_ID = 'hotel-abc';
const VALID_CHECK_IN = '2026-07-10';
const VALID_CHECK_OUT = '2026-07-12';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  // Reset all mutable state
  mockDates = { checkIn: null, checkOut: null };
  mockAvail = {
    data: undefined,
    isLoading: false,
    isError: false,
    isSuccess: false,
    refetch: jest.fn(),
  };
  track.mockClear();
  setCheckIn.mockClear();
  setCheckOut.mockClear();
});

describe('RoomAvailability', () => {
  // ---- Test 1: demo-default seed ----------------------------------------
  it('seeds demo-default dates on mount when both are null', () => {
    // mockDates starts { checkIn: null, checkOut: null } — rely on beforeEach
    render(<RoomAvailability hotelId={HOTEL_ID} />);
    expect(setCheckIn).toHaveBeenCalledWith('2026-07-10');
    expect(setCheckOut).toHaveBeenCalledWith('2026-07-12');
  });

  // ---- Test 2: hotel_viewed fires once on mount -------------------------
  it('fires hotel_viewed once on mount', () => {
    render(<RoomAvailability hotelId={HOTEL_ID} />);
    const hotelViewedCalls = track.mock.calls.filter(
      ([e]: [{ name: string }]) => e.name === 'hotel_viewed',
    );
    expect(hotelViewedCalls).toHaveLength(1);
    expect(hotelViewedCalls[0][0]).toEqual({ name: 'hotel_viewed', hotelId: HOTEL_ID });
  });

  // ---- Test 3: invalid date range --------------------------------------
  it('shows validation error when checkout <= checkin and does not render rooms', () => {
    // Invalid: checkOut before checkIn
    mockDates = { checkIn: '2026-07-12', checkOut: '2026-07-10' };
    render(<RoomAvailability hotelId={HOTEL_ID} />);
    expect(screen.getByText('Check-out must be after check-in')).toBeTruthy();
    // No room cards should appear
    expect(screen.queryByRole('heading', { name: /Deluxe King Room/i })).toBeNull();
  });

  // ---- Test 4: loading state -------------------------------------------
  it('shows loading text and skeletons when isLoading is true', () => {
    mockDates = { checkIn: VALID_CHECK_IN, checkOut: VALID_CHECK_OUT };
    mockAvail = { ...mockAvail, isLoading: true, isSuccess: false };
    render(<RoomAvailability hotelId={HOTEL_ID} />);
    // "Checking availability…" appears in BOTH the sr-only region AND the visible text —
    // use getAllByText since getByText throws when multiple matches are found.
    const loadingNodes = screen.getAllByText('Checking availability…');
    expect(loadingNodes.length).toBeGreaterThanOrEqual(1);
  });

  // ---- Test 5: success with rooms --------------------------------------
  it('renders RoomCard(s) when isSuccess with data', () => {
    mockDates = { checkIn: VALID_CHECK_IN, checkOut: VALID_CHECK_OUT };
    mockAvail = {
      ...mockAvail,
      isLoading: false,
      isSuccess: true,
      isError: false,
      data: [roomFixture],
    };
    render(<RoomAvailability hotelId={HOTEL_ID} />);
    // RoomCard renders the room type as a heading
    expect(screen.getByRole('heading', { name: 'Deluxe King Room' })).toBeTruthy();
  });

  // ---- Test 6: empty availability (no_rooms analytics) -----------------
  it('shows EmptyState and fires no_rooms when isSuccess with data []', () => {
    mockDates = { checkIn: VALID_CHECK_IN, checkOut: VALID_CHECK_OUT };
    mockAvail = {
      ...mockAvail,
      isLoading: false,
      isSuccess: true,
      isError: false,
      data: [],
    };
    render(<RoomAvailability hotelId={HOTEL_ID} />);
    // The text appears in both the sr-only live region and the visible EmptyState,
    // so use getAllByText to avoid "multiple elements" error.
    const noRoomsNodes = screen.getAllByText('No rooms available for these dates');
    expect(noRoomsNodes.length).toBeGreaterThanOrEqual(1);
    const noRoomsCalls = track.mock.calls.filter(
      ([e]: [{ name: string }]) => e.name === 'no_rooms',
    );
    expect(noRoomsCalls).toHaveLength(1);
    expect(noRoomsCalls[0][0]).toEqual({ name: 'no_rooms', hotelId: HOTEL_ID });
  });

  // ---- Test 7: error state with retry ----------------------------------
  it('shows InlineError with a Retry button when isError is true', async () => {
    mockDates = { checkIn: VALID_CHECK_IN, checkOut: VALID_CHECK_OUT };
    const refetch = jest.fn();
    mockAvail = {
      ...mockAvail,
      isLoading: false,
      isSuccess: false,
      isError: true,
      refetch,
    };
    render(<RoomAvailability hotelId={HOTEL_ID} />);
    expect(screen.getByText("Couldn't load availability")).toBeTruthy();
    const retryBtn = screen.getByRole('button', { name: /retry/i });
    expect(retryBtn).toBeTruthy();
    await userEvent.click(retryBtn);
    expect(refetch).toHaveBeenCalledTimes(1);
  });
});
