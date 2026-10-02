import type { Coordinates } from "@/api/types";

/**
 * Anchor points along the Brazilian southeast/south freight corridors. Vehicles
 * are seeded near these and drift along their heading during the live
 * simulation, so the fleet map stays plausible without real telematics.
 */
export const FREIGHT_HUBS: { name: string; lat: number; lng: number }[] = [
  { name: "São Paulo, SP", lat: -23.5505, lng: -46.6333 },
  { name: "Campinas, SP", lat: -22.9099, lng: -47.0626 },
  { name: "Ribeirão Preto, SP", lat: -21.1704, lng: -47.8103 },
  { name: "Rio de Janeiro, RJ", lat: -22.9068, lng: -43.1729 },
  { name: "Belo Horizonte, MG", lat: -19.9167, lng: -43.9345 },
  { name: "Uberlândia, MG", lat: -18.9186, lng: -48.2772 },
  { name: "Curitiba, PR", lat: -25.4284, lng: -49.2733 },
  { name: "Londrina, PR", lat: -23.3045, lng: -51.1696 },
  { name: "Porto Alegre, RS", lat: -30.0346, lng: -51.2177 },
  { name: "Goiânia, GO", lat: -16.6869, lng: -49.2648 },
];

const EARTH_RADIUS_KM = 6371;

export function jitterAround(
  center: { lat: number; lng: number },
  radiusKm: number,
  rand: () => number,
): Coordinates {
  const distance = Math.sqrt(rand()) * radiusKm;
  const bearing = rand() * 2 * Math.PI;
  return offset({ lat: center.lat, lng: center.lng }, distance, bearing);
}

/** Move a point `distanceKm` along `bearingRad` (clockwise from north). */
export function offset(
  point: Coordinates,
  distanceKm: number,
  bearingRad: number,
): Coordinates {
  const angular = distanceKm / EARTH_RADIUS_KM;
  const lat1 = toRad(point.lat);
  const lng1 = toRad(point.lng);

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(angular) +
      Math.cos(lat1) * Math.sin(angular) * Math.cos(bearingRad),
  );
  const lng2 =
    lng1 +
    Math.atan2(
      Math.sin(bearingRad) * Math.sin(angular) * Math.cos(lat1),
      Math.cos(angular) - Math.sin(lat1) * Math.sin(lat2),
    );

  return { lat: toDeg(lat2), lng: toDeg(lng2) };
}

function toRad(deg: number) {
  return (deg * Math.PI) / 180;
}
function toDeg(rad: number) {
  return (rad * 180) / Math.PI;
}
