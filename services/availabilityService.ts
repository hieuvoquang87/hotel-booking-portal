import { isRoomAvailable, nightsInRange } from '../lib/availability';
import { HotelNotFoundError, InvalidDateRangeError, type AvailableRoom } from '../types/domain';
import { getHotelById } from './hotelService';

const DEFAULT_LATENCY_MS = Number(process.env.AVAILABILITY_LATENCY_MS ?? 1000);

function simulateLatency(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function checkAvailability(
  id: string,
  checkIn: string,
  checkOut: string,
  opts: { delayMs?: number } = {},
): Promise<AvailableRoom[]> {
  if (!(checkOut > checkIn)) {
    throw new InvalidDateRangeError();
  }

  const hotel = getHotelById(id);
  if (!hotel) {
    throw new HotelNotFoundError(id);
  }

  await simulateLatency(opts.delayMs ?? DEFAULT_LATENCY_MS);

  const nights = nightsInRange(checkIn, checkOut);
  return hotel.rooms
    .filter((room) => isRoomAvailable(room, nights))
    .map((room) => ({
      roomId: room.roomId,
      type: room.type,
      pricePerNight: room.pricePerNight,
      bedType: room.bedType,
      maxOccupancy: room.maxOccupancy,
    }));
}
