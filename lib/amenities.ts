// Map raw seed amenity tokens to human-readable card pills.
// Curated dictionary mirrors the design mockup; unmapped tokens (incl. room
// amenities) fall back to a generic snake_case → "Sentence case" transform.

const AMENITY_LABEL: Record<string, string> = {
  'free Wi-Fi': 'Wi-Fi',
  // Defensive aliases for alternate Wi-Fi spellings.
  free_wifi: 'Wi-Fi',
  wifi: 'Wi-Fi',
  fitness_center: 'Fitness center',
  valet_parking: 'Valet parking',
  free_parking: 'Free parking',
  pet_friendly: 'Pet friendly',
  free_breakfast: 'Free breakfast',
  laundry_service: 'Laundry',
  bicycle_rentals: 'Bikes',
  beach_access: 'Beach access',
  rooftop_bar: 'Rooftop bar',
  rooftop_terrace: 'Rooftop terrace',
  rooftop_wine_bar: 'Rooftop wine bar',
  hot_tub: 'Hot tub',
  meeting_rooms: 'Meeting rooms',
  marina_access: 'Marina',
  afternoon_tea_lounge: 'Afternoon tea',
  michelin_restaurant: 'Michelin dining',
  fine_dining_terrace: 'Fine dining',
  harbour_restaurant: 'Harbour dining',
  courtyard_cafe: 'Courtyard café',
  courtyard_lounge: 'Courtyard lounge',
  social_lounge: 'Social lounge',
  gaming_lounge: 'Gaming lounge',
  vending_galore: 'Vending',
  on_site_pub: 'On-site pub',
  public_hot_spring_bath: 'Hot spring bath',
  traditional_breakfast: 'Breakfast',
  luggage_storage: 'Luggage storage',
  sky_bar: 'Sky bar',
};

export function humanizeAmenity(raw: string): string {
  const mapped = AMENITY_LABEL[raw];
  if (mapped) return mapped;
  const words = raw.replace(/[_-]+/g, ' ').trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}
