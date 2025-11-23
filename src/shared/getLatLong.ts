export const getLatLngFromPostalCode = async (postalCode: string, country: string) => {
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(postalCode + ' ' + country)}`;
    const response = await fetch(url, {
      headers: { "User-Agent": "your-app-name-here" },
    });
    const locations = await response.json();

    if (!locations || locations.length === 0) {
      throw new Error('No locations found for the given postal code.');
    }

    return {
      latitude: parseFloat(locations[0].lat),
      longitude: parseFloat(locations[0].lon)
    };

  } catch (error: any) {
    console.error('Error fetching from OpenStreetMap API:', error.message);
    throw error;
  }
};
