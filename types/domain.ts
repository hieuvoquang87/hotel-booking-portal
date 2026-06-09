export type Location = {
  city: string;
  country: string;
  state: string;
  citySlug: string;
  countrySlug: string;
};

export type Room = {
  roomId: string;
  type: string;
  bedType: string;
  bedCount: number;
  maxOccupancy: number;
  squareFootage: number;
  pricePerNight: number;
  amenities: string[];
  availableDates: string[];
};

export type Hotel = {
  id: string;
  name: string;
  description: string;
  starRating: number;
  overallRating: number;
  reviewCount: number;
  address: { street: string; city: string; state: string; zipCode: string; country: string };
  amenities: string[];
  policies: { checkInTime: string; checkOutTime: string; cancellation: string };
  priceFrom: number;
  photoUrl: string;
  rooms: Room[];
};

export type AvailableRoom = {
  roomId: string;
  type: string;
  pricePerNight: number;
  bedType: string;
  bedCount: number;
  maxOccupancy: number;
  squareFootage: number;
  amenities: string[];
};

export class InvalidDateRangeError extends Error {
  constructor(message = 'check-out must be after check-in') {
    super(message);
    this.name = 'InvalidDateRangeError';
  }
}

export class HotelNotFoundError extends Error {
  constructor(id: string) {
    super(`hotel not found: ${id}`);
    this.name = 'HotelNotFoundError';
  }
}
