import { getHotelById, getHotelsByLocation, getLocations } from './hotelService';

describe('getLocations', () => {
  it('returns the 10 distinct seed locations, deterministically ordered', () => {
    const a = getLocations();
    const b = getLocations();
    expect(a).toHaveLength(10);
    expect(a).toEqual(b); // deterministic order
    expect(a).toContainEqual({
      city: 'New York',
      country: 'USA',
      state: 'NY',
      citySlug: 'new-york',
      countrySlug: 'usa',
    });
  });
});

describe('getHotelsByLocation', () => {
  it('returns all 20 USA hotels for the country slug', () => {
    expect(getHotelsByLocation({ country: 'usa' })).toHaveLength(20);
  });
  it('narrows to the 4 New York hotels for the city slug', () => {
    const hotels = getHotelsByLocation({ city: 'new-york' });
    expect(hotels).toHaveLength(4);
    expect(hotels.every((h) => h.address.city === 'New York')).toBe(true);
  });
  it('returns all 40 hotels when no filter is given', () => {
    expect(getHotelsByLocation({})).toHaveLength(40);
  });
  it('returns [] for an unknown slug', () => {
    expect(getHotelsByLocation({ city: 'atlantis' })).toEqual([]);
  });
});

describe('getHotelById', () => {
  it('returns a mapped domain hotel for a known id', () => {
    const hotel = getHotelById('hotel-01');
    expect(hotel?.id).toBe('hotel-01');
    expect(hotel?.starRating).toBeGreaterThan(0);
    expect(hotel?.photoUrl).toBeTruthy();
  });
  it('returns null for an unknown id', () => {
    expect(getHotelById('hotel-999')).toBeNull();
  });
});
