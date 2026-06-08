import type { Hotel } from '../types/domain';

export function filterByStars(hotels: Hotel[], minStars: number): Hotel[] {
  return hotels.filter((hotel) => hotel.starRating >= minStars);
}

export function filterByPrice(hotels: Hotel[], min: number, max: number): Hotel[] {
  return hotels.filter((hotel) =>
    hotel.rooms.some((room) => room.pricePerNight >= min && room.pricePerNight <= max),
  );
}
