import type { RawHotel } from './mappers';
import rawHotels from './mock/hotels.json';

// The ONLY module that imports the raw seed. Phase-2 swaps this for an HTTP client.
export function getRawHotels(): RawHotel[] {
  return rawHotels as unknown as RawHotel[];
}
