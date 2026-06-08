import type { Room } from '../types/domain';

export function nightsInRange(checkIn: string, checkOut: string): string[] {
  const nights: string[] = [];
  const cursor = new Date(`${checkIn}T00:00:00Z`);
  const end = new Date(`${checkOut}T00:00:00Z`);
  while (cursor < end) {
    nights.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return nights;
}

export function isRoomAvailable(room: Room, nights: string[]): boolean {
  return nights.length > 0 && nights.every((night) => room.availableDates.includes(night));
}
