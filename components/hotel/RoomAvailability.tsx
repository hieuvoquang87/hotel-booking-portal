'use client';

import { useEffect, useRef } from 'react';
import { useAvailability } from '@/hooks/useAvailability';
import { nightsInRange } from '@/lib/availability';
import { useAppDates } from '@/stores/AppProvider';
import { track } from '@/utils/analyticUtil';
import { EmptyState } from '@/components/EmptyState';
import { InlineError } from '@/components/InlineError';
import { DateField } from '@/components/hotel/DateField';
import { RoomCard } from '@/components/hotel/RoomCard';
import { RoomSkeleton } from '@/components/hotel/RoomSkeleton';

const DEMO_CHECK_IN = '2026-07-10';
const DEMO_CHECK_OUT = '2026-07-12';

export function RoomAvailability({ hotelId }: { hotelId: string }) {
  const { checkIn, checkOut, setCheckIn, setCheckOut } = useAppDates();

  // Seed demo defaults once on mount when no dates are set (so the success state shows).
  const seeded = useRef(false);
  useEffect(() => {
    if (seeded.current) return;
    seeded.current = true;
    if (checkIn === null && checkOut === null) {
      setCheckIn(DEMO_CHECK_IN);
      setCheckOut(DEMO_CHECK_OUT);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    track({ name: 'hotel_viewed', hotelId });
  }, [hotelId]);

  const invalid = !!(checkIn && checkOut && checkOut <= checkIn);
  const query = useAvailability(hotelId, checkIn, checkOut);

  useEffect(() => {
    if (checkIn && checkOut && checkOut > checkIn) {
      track({
        name: 'availability_checked',
        hotelId,
        nights: nightsInRange(checkIn, checkOut).length,
      });
    }
  }, [hotelId, checkIn, checkOut]);

  useEffect(() => {
    if (query.isSuccess && Array.isArray(query.data) && query.data.length === 0) {
      track({ name: 'no_rooms', hotelId });
    }
  }, [hotelId, query.isSuccess, query.data]);

  const status = query.isLoading
    ? 'Checking availability…'
    : query.data
      ? `${query.data.length} ${(query.data as unknown[]).length === 1 ? 'room' : 'rooms'} available`
      : '';

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold text-foreground">Room availability</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1">
        <DateField id="check-in" label="Check-in" value={checkIn} onChange={setCheckIn} />
        <DateField
          id="check-out"
          label="Check-out"
          value={checkOut}
          min={checkIn ?? undefined}
          onChange={setCheckOut}
        />
      </div>

      <p aria-live="polite" className="sr-only">
        {status}
      </p>

      {invalid ? (
        <InlineError message="Check-out must be after check-in" />
      ) : !checkIn || !checkOut ? (
        <p className="text-sm text-muted-foreground">Pick check-in and check-out to see rooms.</p>
      ) : query.isLoading ? (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">Checking availability…</p>
          <RoomSkeleton />
          <RoomSkeleton />
        </div>
      ) : query.isError ? (
        <InlineError message="Couldn't load availability" onRetry={() => query.refetch()} />
      ) : query.data && (query.data as unknown[]).length > 0 ? (
        <div className="space-y-3">
          {(query.data as import('@/types/domain').AvailableRoom[]).map((room) => (
            <RoomCard key={room.roomId} room={room} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon="pin"
          title="No rooms available for these dates"
          subtext="Try different dates."
        />
      )}
    </section>
  );
}
