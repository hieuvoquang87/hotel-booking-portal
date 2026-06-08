import { slugify } from '../lib/slug';
import type { Hotel, Location, Room } from '../types/domain';

const PLACEHOLDER_PHOTO = '/images/hotel-placeholder.svg';

export interface RawRoom {
  room_id: string;
  type: string;
  bed_type: string;
  bed_count: number;
  max_occupancy: number;
  square_footage: number;
  price_per_night: number;
  room_amenities: string[];
  available_dates: string[];
}

export interface RawHotel {
  id: string;
  name: string;
  description: string;
  star_rating: number;
  overall_rating: number;
  review_count: number;
  address: { street: string; city: string; state: string; zip_code: string; country: string };
  amenities: string[];
  policies: { check_in_time: string; check_out_time: string; cancellation: string };
  rooms: RawRoom[];
}

export function mapRoom(raw: RawRoom): Room {
  return {
    roomId: raw.room_id,
    type: raw.type,
    bedType: raw.bed_type,
    bedCount: raw.bed_count,
    maxOccupancy: raw.max_occupancy,
    squareFootage: raw.square_footage,
    pricePerNight: raw.price_per_night,
    amenities: raw.room_amenities,
    availableDates: raw.available_dates,
  };
}

export function mapHotel(raw: RawHotel): Hotel {
  const rooms = raw.rooms.map(mapRoom);
  return {
    id: raw.id,
    name: raw.name,
    description: raw.description,
    starRating: raw.star_rating,
    overallRating: raw.overall_rating,
    reviewCount: raw.review_count,
    address: {
      street: raw.address.street,
      city: raw.address.city,
      state: raw.address.state,
      zipCode: raw.address.zip_code,
      country: raw.address.country,
    },
    amenities: raw.amenities,
    policies: {
      checkInTime: raw.policies.check_in_time,
      checkOutTime: raw.policies.check_out_time,
      cancellation: raw.policies.cancellation,
    },
    priceFrom: Math.min(...rooms.map((room) => room.pricePerNight)),
    photoUrl: PLACEHOLDER_PHOTO,
    rooms,
  };
}

export function mapLocation(hotel: Hotel): Location {
  return {
    city: hotel.address.city,
    country: hotel.address.country,
    state: hotel.address.state,
    citySlug: slugify(hotel.address.city),
    countrySlug: slugify(hotel.address.country),
  };
}
