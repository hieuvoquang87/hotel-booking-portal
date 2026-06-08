import { buildSlugLookup } from '../lib/slug';
import type { Hotel, Location } from '../types/domain';
import { mapHotel, mapLocation } from './mappers';
import { getRawHotels } from './seed';

// Map the whole seed to domain types once, at module load.
const hotels: Hotel[] = getRawHotels().map(mapHotel);

export function getLocations(): Location[] {
  const seen = new Map<string, Location>();
  for (const hotel of hotels) {
    const location = mapLocation(hotel);
    const key = `${location.countrySlug}/${location.citySlug}`;
    if (!seen.has(key)) {
      seen.set(key, location);
    }
  }
  return [...seen.values()].sort(
    (a, b) => a.country.localeCompare(b.country) || a.city.localeCompare(b.city),
  );
}

export function getHotelsByLocation(query: { country?: string; city?: string }): Hotel[] {
  let result = hotels;

  if (query.country) {
    const lookup = buildSlugLookup(hotels.map((h) => h.address.country));
    const country = lookup.get(query.country);
    result = country ? result.filter((h) => h.address.country === country) : [];
  }

  if (query.city) {
    const lookup = buildSlugLookup(hotels.map((h) => h.address.city));
    const city = lookup.get(query.city);
    result = city ? result.filter((h) => h.address.city === city) : [];
  }

  return result;
}

export function getHotelById(id: string): Hotel | null {
  return hotels.find((hotel) => hotel.id === id) ?? null;
}
