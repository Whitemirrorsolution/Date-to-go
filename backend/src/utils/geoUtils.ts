/**
 * Geographic and travel distance utility for calculating centroid distances and travel estimates.
 */

export interface LatLng {
  lat: number;
  lng: number;
}

// Approximate centroids for major Indian urban postal circles (fallback when exact coordinates are absent)
const PINCODE_PREFIX_CENTROIDS: Record<string, LatLng> = {
  // Delhi NCR
  '11': { lat: 28.6139, lng: 77.209 },
  '12': { lat: 28.4595, lng: 77.0266 }, // Gurgaon / Faridabad / Haryana
  '20': { lat: 28.5355, lng: 77.391 }, // Noida / Ghaziabad
  // Mumbai MMR
  '40': { lat: 19.076, lng: 72.8777 },
  '41': { lat: 18.5204, lng: 73.8567 }, // Pune
  // Bengaluru
  '56': { lat: 12.9716, lng: 77.5946 },
  // Hyderabad
  '50': { lat: 17.385, lng: 78.4867 },
  // Chennai
  '60': { lat: 13.0827, lng: 80.2707 },
  // Kolkata
  '70': { lat: 22.5726, lng: 88.3639 },
  // Ahmedabad
  '38': { lat: 23.0225, lng: 72.5714 },
  // Jaipur
  '30': { lat: 26.9124, lng: 75.7873 },
  // Chandigarh / Punjab
  '16': { lat: 30.7333, lng: 76.7794 },
  // Indore / MP
  '45': { lat: 22.7196, lng: 75.8577 },
};

export function getCentroidFromPincode(pincode?: string): LatLng | null {
  if (!pincode || typeof pincode !== 'string') return null;
  const clean = pincode.trim().replace(/\D/g, '');
  if (clean.length < 2) return null;
  const prefix2 = clean.slice(0, 2);
  return PINCODE_PREFIX_CENTROIDS[prefix2] || null;
}

/**
 * Calculates Haversine distance in kilometers between two coordinates.
 */
export function haversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

/**
 * Estimate travel time in minutes based on distance and average driving speed in km/h.
 */
export function estimateTravelTimeMinutes(
  distanceKm: number,
  speedKmph = 25,
  overheadMinutes = 15
): { travelMinutes: number; distanceKm: number; isEstimated: boolean } {
  if (distanceKm <= 0) {
    return { travelMinutes: 0, distanceKm: 0, isEstimated: true };
  }
  const driveMinutes = (distanceKm / Math.max(speedKmph, 10)) * 60;
  const totalMinutes = Math.ceil(driveMinutes + overheadMinutes);
  return {
    travelMinutes: totalMinutes,
    distanceKm,
    isEstimated: true,
  };
}
