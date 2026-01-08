/**
 * Custom marker handling for company logos
 */
import L from 'leaflet';

let markers = [];
let markerLayer = null;

/**
 * Create a custom HTML marker with company logo
 */
function createMarkerIcon(company) {
    // Create container for custom marker (Pampam style: Rounded Square)
    const container = document.createElement('div');
    container.className = 'custom-marker';

    const logoImg = document.createElement('img');
    logoImg.className = `marker-logo ${company.type}`;
    logoImg.src = company.logo;
    logoImg.onerror = () => {
        // Fallback if image fails
        logoImg.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(company.name)}&background=random&color=fff&size=64`;
    };

    container.appendChild(logoImg);

    // Add "Verified" dot if validated
    if (company.verified) {
        const verifiedDot = document.createElement('div');
        verifiedDot.className = 'marker-verified-dot';
        container.appendChild(verifiedDot);
    }

    return L.divIcon({
        html: container,
        className: 'custom-div-icon',
        iconSize: [40, 40], // Slightly larger square
        iconAnchor: [20, 20] // Center
    });
}

/**
 * Add markers for all companies
 */
export function addMarkers(map, companies, onMarkerClick) {
    // Clear existing markers
    clearMarkers();

    // Create a layer group for markers
    markerLayer = L.layerGroup().addTo(map);

    companies.forEach(company => {
        // Skip companies without valid coordinates to prevent crash
        if (!company.coordinates || company.coordinates.length !== 2) {
            console.warn(`Skipping company without coordinates: ${company.name}`);
            return;
        }

        const icon = createMarkerIcon(company);

        const marker = L.marker(company.coordinates, { icon })
            .addTo(markerLayer);

        // Add click handler
        marker.on('click', () => {
            onMarkerClick(company);
        });

        markers.push({ marker, company });
    });

    return markers;
}

/**
 * Clear all markers from the map
 */
export function clearMarkers() {
    if (markerLayer) {
        markerLayer.clearLayers();
    }
    markers = [];
}

/**
 * Filter markers by type
 */
export function filterMarkers(map, companies, type, onMarkerClick) {
    const filtered = type === 'all'
        ? companies
        : companies.filter(c => c.type === type);

    return addMarkers(map, filtered, onMarkerClick);
}

/**
 * Get marker by company ID
 */
export function getMarkerByCompanyId(id) {
    const found = markers.find(m => m.company.id === id);
    return found ? found.marker : null;
}
