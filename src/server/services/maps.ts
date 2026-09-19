/**
 * Map provider abstraction.
 *
 * The core app must work without any map API key, so the default provider is
 * OpenStreetMap (embed + directions links, no key required). Set
 * MAP_PROVIDER=none to disable map rendering entirely - every feature degrades
 * to a plain address.
 */

export type LatLng = { lat: number; lng: number };

export interface MapProvider {
  readonly name: string;
  /** URL for an embeddable map, or null when maps are disabled. */
  embedUrl(point: LatLng, zoom?: number): string | null;
  directionsUrl(point: LatLng): string;
  searchUrl(query: string): string;
  readonly enabled: boolean;
}

class OpenStreetMapProvider implements MapProvider {
  readonly name = 'openstreetmap';
  readonly enabled = true;

  embedUrl(point: LatLng, zoom = 15): string | null {
    // Zoom drives the bounding box: higher zoom = smaller area around the marker.
    const delta = Math.max(0.001, 0.35 / Math.pow(2, Math.max(1, zoom) - 10));
    const bbox = [
      point.lng - delta,
      point.lat - delta,
      point.lng + delta,
      point.lat + delta,
    ].join('%2C');
    return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${point.lat}%2C${point.lng}`;
  }

  directionsUrl(point: LatLng): string {
    return `https://www.openstreetmap.org/directions?to=${point.lat}%2C${point.lng}`;
  }

  searchUrl(query: string): string {
    return `https://www.openstreetmap.org/search?query=${encodeURIComponent(query)}`;
  }
}

class NoMapProvider implements MapProvider {
  readonly name = 'none';
  readonly enabled = false;
  embedUrl(): string | null {
    return null;
  }
  directionsUrl(point: LatLng): string {
    return `https://www.openstreetmap.org/?mlat=${point.lat}&mlon=${point.lng}`;
  }
  searchUrl(query: string): string {
    return `https://www.openstreetmap.org/search?query=${encodeURIComponent(query)}`;
  }
}

export function mapProvider(): MapProvider {
  return process.env.MAP_PROVIDER === 'none' ? new NoMapProvider() : new OpenStreetMapProvider();
}

/** Haversine distance in kilometres, used for "near me" sorting. */
export function distanceKm(a: LatLng, b: LatLng): number {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Round coordinates before storing so an exact home address is never implied. */
export function approximate(point: LatLng, precision = 2): LatLng {
  const factor = 10 ** precision;
  return {
    lat: Math.round(point.lat * factor) / factor,
    lng: Math.round(point.lng * factor) / factor,
  };
}
