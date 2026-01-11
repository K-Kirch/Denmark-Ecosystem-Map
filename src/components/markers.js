/**
 * Custom marker handling for company logos with clustering
 */
import L from 'leaflet';
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';

let markers = [];
let markerClusterGroup = null;

/**
 * Create a custom HTML marker with company logo
 */
/**
 * Helper to extract domain from URL
 */
function getDomain(url) {
    try {
        if (!url) return null;
        // Handle cases without protocol
        let href = url;
        if (!href.startsWith('http')) href = 'http://' + href;
        const hostname = new URL(href).hostname;
        return hostname.replace('www.', '');
    } catch (e) {
        return null;
    }
}

function createMarkerIcon(company) {
    // Create container for custom marker (Pampam style: Rounded Square)
    const container = document.createElement('div');
    container.className = 'custom-marker';

    const logoImg = document.createElement('img');
    logoImg.className = `marker-logo ${company.type}`;
    logoImg.loading = 'lazy';

    // Logo Loading Strategy:
    // 1. company.logo (manual override)
    // 2. Clearbit Logo API
    // 3. Google Favicon API
    // 4. UI Avatars (Initials)

    const domain = getDomain(company.website);

    // Define fallbacks
    const fallbackToInitials = () => {
        logoImg.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(company.name)}&background=random&color=fff&size=64`;
        logoImg.onerror = null; // Stop chain
    };

    const fallbackToGoogle = () => {
        if (domain) {
            logoImg.src = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
            logoImg.onerror = fallbackToInitials;
        } else {
            fallbackToInitials();
        }
    };

    const loadPrimaryLogo = () => {
        if (company.logo) {
            logoImg.src = company.logo;
            logoImg.onerror = () => {
                if (domain) {
                    logoImg.src = `https://logo.clearbit.com/${domain}`;
                    logoImg.onerror = fallbackToGoogle;
                } else {
                    fallbackToInitials();
                }
            };
        } else if (domain) {
            logoImg.src = `https://logo.clearbit.com/${domain}`;
            logoImg.onerror = fallbackToGoogle;
        } else {
            fallbackToInitials();
        }
    };

    // Start loading
    loadPrimaryLogo();

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
        iconSize: [40, 40],
        iconAnchor: [20, 20]
    });
}

/**
 * Create custom cluster icon with count
 */
function createClusterIcon(cluster) {
    const count = cluster.getChildCount();

    // Determine size class based on count
    let sizeClass = 'cluster-small';
    let size = 40;

    if (count >= 100) {
        sizeClass = 'cluster-large';
        size = 56;
    } else if (count >= 10) {
        sizeClass = 'cluster-medium';
        size = 48;
    }

    return L.divIcon({
        html: `<div class="cluster-icon ${sizeClass}"><span>${count}</span></div>`,
        className: 'custom-cluster-icon',
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2]
    });
}

/**
 * Add markers for all companies with clustering
 */
export function addMarkers(map, companies, onMarkerClick) {
    // Clear existing markers
    clearMarkers();

    // Create marker cluster group with custom options
    markerClusterGroup = L.markerClusterGroup({
        maxClusterRadius: 60,           // Cluster markers within 60px
        spiderfyOnMaxZoom: true,        // Spread markers at max zoom
        showCoverageOnHover: false,     // Cleaner UI
        zoomToBoundsOnClick: true,      // Zoom into cluster on click
        chunkedLoading: true,           // Load in chunks for performance
        chunkInterval: 100,             // Process every 100ms
        chunkDelay: 25,                 // Delay between chunks
        animate: true,                  // Smooth animations
        animateAddingMarkers: false,    // Disable for performance with many markers
        disableClusteringAtZoom: 16,    // Show individual markers at street level
        iconCreateFunction: createClusterIcon
    });

    // Create all markers
    companies.forEach(company => {
        // Skip companies without valid coordinates
        if (!company.coordinates || company.coordinates.length !== 2) {
            return;
        }

        const icon = createMarkerIcon(company);
        const marker = L.marker(company.coordinates, { icon });

        // Add click handler
        marker.on('click', () => {
            onMarkerClick(company);
        });

        // Add to cluster group (not directly to map)
        markerClusterGroup.addLayer(marker);
        markers.push({ marker, company });
    });

    // Add cluster group to map
    map.addLayer(markerClusterGroup);

    console.log(`✓ Added ${markers.length} markers with clustering`);
    return markers;
}

/**
 * Clear all markers from the map
 */
export function clearMarkers() {
    if (markerClusterGroup) {
        markerClusterGroup.clearLayers();
    }
    markers = [];
}

/**
 * Get marker by company ID
 */
export function getMarkerByCompanyId(id) {
    const found = markers.find(m => m.company.id === id);
    return found ? found.marker : null;
}
