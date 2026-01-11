/**
 * Map initialization and configuration
 */
import L from 'leaflet';

// Denmark bounds
const DENMARK_CENTER = [56.0, 10.5];
const DENMARK_ZOOM = 7;
const MIN_ZOOM = 6;
const MAX_ZOOM = 18;

// Dark-themed tile layer from CartoDB
const DARK_TILES = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
const TILE_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';

let map = null;

/**
 * Initialize the Leaflet map
 */
export function initMap(containerId) {
    // Create map instance
    map = L.map(containerId, {
        center: DENMARK_CENTER,
        zoom: DENMARK_ZOOM,
        minZoom: MIN_ZOOM,
        maxZoom: MAX_ZOOM,
        zoomControl: true,
        attributionControl: true
    });

    // Add dark tile layer
    L.tileLayer(DARK_TILES, {
        attribution: TILE_ATTRIBUTION,
        subdomains: 'abcd',
        maxZoom: MAX_ZOOM
    }).addTo(map);

    // Position zoom control
    map.zoomControl.setPosition('bottomright');

    return map;
}

/**
 * Fly to a specific location
 */
export function flyTo(lat, lng, zoom = 12) {
    if (map) {
        map.flyTo([lat, lng], zoom, {
            duration: 1.5
        });
    }
}

/**
 * Reset map to Denmark view
 */
export function resetView() {
    if (map) {
        map.flyTo(DENMARK_CENTER, DENMARK_ZOOM, {
            duration: 1
        });
    }
}
