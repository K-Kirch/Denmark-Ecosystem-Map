/**
 * Add Company Modal Component
 * Handles the form for adding new startups and investors
 */

// Industry options for the dropdown
const INDUSTRIES = [
    'Tech', 'SaaS', 'FinTech', 'HealthTech', 'CleanTech', 'EdTech',
    'FoodTech', 'PropTech', 'BioTech', 'AI/ML', 'E-commerce', 'Gaming',
    'Hardware', 'IoT', 'Robotics', 'Cybersecurity', 'Other'
];

// Modal state
let modalEl = null;
let onSuccessCallback = null;

/**
 * Create and inject the modal HTML
 */
function createModalHTML() {
    const modalHTML = `
        <div class="modal-overlay" id="add-company-modal">
            <div class="modal">
                <div class="modal-header">
                    <h2>Add Company</h2>
                    <button class="modal-close" id="modal-close">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M18 6L6 18M6 6l12 12"/>
                        </svg>
                    </button>
                </div>
                <form class="modal-form" id="add-company-form">
                    <div class="form-row">
                        <div class="form-group">
                            <label for="company-name">Company Name *</label>
                            <input type="text" id="company-name" name="name" required placeholder="e.g., TechStartup">
                        </div>
                        <div class="form-group">
                            <label for="company-type">Type *</label>
                            <select id="company-type" name="type" required>
                                <option value="">Select type...</option>
                                <option value="startup">Startup</option>
                                <option value="investor">Investor</option>
                                <option value="supporter">Supporter</option>
                            </select>
                        </div>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="company-website">Website</label>
                            <input type="url" id="company-website" name="website" placeholder="https://example.com">
                        </div>
                        <div class="form-group">
                            <label for="company-location">Street Address *</label>
                            <input type="text" id="company-location" name="location" required placeholder="e.g., Vestergade 10, 1456 Copenhagen">
                            <div id="location-preview" class="location-preview" style="display: none;">
                                <span class="preview-icon"></span>
                                <span class="preview-text"></span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="company-industry">Industry</label>
                            <select id="company-industry" name="industry">
                                <option value="">Select industry...</option>
                                ${INDUSTRIES.map(i => `<option value="${i}">${i}</option>`).join('')}
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="company-founded">Founded</label>
                            <input type="number" id="company-founded" name="founded" min="1900" max="${new Date().getFullYear()}" placeholder="e.g., 2020">
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label for="company-description">Description</label>
                        <textarea id="company-description" name="description" rows="3" placeholder="Brief description of the company..."></textarea>
                    </div>
                    
                    <div class="form-actions">
                        <button type="button" class="btn-secondary" id="modal-cancel">Cancel</button>
                        <button type="submit" class="btn-primary" id="modal-submit">
                            <span class="btn-text">Add Company</span>
                            <span class="btn-loading" style="display: none;">
                                <svg class="spinner" viewBox="0 0 24 24">
                                    <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" fill="none" stroke-dasharray="30 70"/>
                                </svg>
                            </span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;

    // Insert modal into body
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    modalEl = document.getElementById('add-company-modal');

    // Add toast container if not exists
    if (!document.getElementById('toast-container')) {
        document.body.insertAdjacentHTML('beforeend', '<div id="toast-container" class="toast-container"></div>');
    }
}

/**
 * Initialize the modal and event listeners
 */
export function initAddCompanyModal(onSuccess) {
    onSuccessCallback = onSuccess;
    createModalHTML();

    const closeBtn = document.getElementById('modal-close');
    const cancelBtn = document.getElementById('modal-cancel');
    const form = document.getElementById('add-company-form');

    // Close handlers
    closeBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);
    modalEl.addEventListener('click', (e) => {
        if (e.target === modalEl) closeModal();
    });

    // Escape key to close
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modalEl.classList.contains('open')) {
            closeModal();
        }
    });

    // Form submission
    form.addEventListener('submit', handleSubmit);

    // Location verification on blur
    const locationInput = document.getElementById('company-location');
    locationInput.addEventListener('blur', verifyLocation);
}

/**
 * Open the modal
 */
export function openModal() {
    if (modalEl) {
        modalEl.classList.add('open');
        document.body.style.overflow = 'hidden';
        document.getElementById('company-name').focus();
    }
}

/**
 * Close the modal
 */
export function closeModal() {
    if (modalEl) {
        modalEl.classList.remove('open');
        document.body.style.overflow = '';
        document.getElementById('add-company-form').reset();

        // Reset geocoding state
        const preview = document.getElementById('location-preview');
        if (preview) preview.style.display = 'none';
        lastGeocodedLocation = null;
        lastGeocodedCoords = null;
        geocodingVerified = false;
    }
}

// Track geocoding state
let lastGeocodedLocation = null;
let lastGeocodedCoords = null;
let geocodingVerified = false;

/**
 * Geocode a location string using OpenStreetMap Nominatim
 * Returns { coords, displayName } or null if failed
 */
async function geocodeLocation(location) {
    try {
        const query = encodeURIComponent(`${location}, Denmark`);
        const response = await fetch(
            `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1&addressdetails=1`,
            {
                headers: {
                    'User-Agent': 'DenmarkEcosystemMap/1.0'
                }
            }
        );

        const data = await response.json();

        if (data && data.length > 0) {
            return {
                coords: [parseFloat(data[0].lat), parseFloat(data[0].lon)],
                displayName: data[0].display_name
            };
        }
    } catch (error) {
        console.error('Geocoding error:', error);
    }

    return null;
}

/**
 * Verify and preview the location
 */
async function verifyLocation() {
    const locationInput = document.getElementById('company-location');
    const preview = document.getElementById('location-preview');
    const previewIcon = preview.querySelector('.preview-icon');
    const previewText = preview.querySelector('.preview-text');

    const location = locationInput.value.trim();
    if (!location) {
        preview.style.display = 'none';
        return;
    }

    // Show loading
    preview.style.display = 'flex';
    preview.className = 'location-preview loading';
    previewIcon.textContent = '⏳';
    previewText.textContent = 'Verifying address...';

    const result = await geocodeLocation(location);

    if (result) {
        lastGeocodedLocation = location;
        lastGeocodedCoords = result.coords;
        geocodingVerified = true;

        // Truncate display name for UI
        const shortName = result.displayName.split(',').slice(0, 3).join(', ');

        preview.className = 'location-preview success';
        previewIcon.textContent = '✓';
        previewText.textContent = `Found: ${shortName}`;
    } else {
        lastGeocodedCoords = null;
        geocodingVerified = false;

        preview.className = 'location-preview warning';
        previewIcon.textContent = '⚠';
        previewText.textContent = 'Address not found. Please check or be more specific.';
    }
}

/**
 * Handle form submission
 */
async function handleSubmit(e) {
    e.preventDefault();

    const submitBtn = document.getElementById('modal-submit');
    const btnText = submitBtn.querySelector('.btn-text');
    const btnLoading = submitBtn.querySelector('.btn-loading');

    // Show loading state
    btnText.style.display = 'none';
    btnLoading.style.display = 'inline-flex';
    submitBtn.disabled = true;

    try {
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());

        // Get coordinates - use cached if already verified, otherwise geocode
        let coordinates;
        if (geocodingVerified && lastGeocodedLocation === data.location && lastGeocodedCoords) {
            coordinates = lastGeocodedCoords;
        } else {
            const result = await geocodeLocation(data.location);
            if (result) {
                coordinates = result.coords;
            } else {
                // Fallback with warning
                coordinates = [55.6761, 12.5683];
                showToast('Address could not be verified. Using Copenhagen center.', 'warning');
            }
        }

        // Build company object
        const company = {
            id: data.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
            name: data.name.trim(),
            type: data.type,
            logo: '',
            website: data.website || '',
            industry: data.industry || '',
            description: data.description || '',
            employees: 0,
            founded: data.founded ? parseInt(data.founded) : null,
            location: data.location,
            funding: '',
            valuation: '',
            coordinates: coordinates,
            isHiring: false,
            lastUpdated: new Date().toISOString()
        };

        // Save via API
        const response = await fetch('/api/companies', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(company)
        });

        if (!response.ok) {
            throw new Error('Failed to save company');
        }

        // Success!
        showToast('Company added successfully!', 'success');
        closeModal();

        // Trigger callback to refresh map
        if (onSuccessCallback) {
            onSuccessCallback(company);
        }

    } catch (error) {
        console.error('Error adding company:', error);
        showToast('Failed to add company. Please try again.', 'error');
    } finally {
        // Reset button state
        btnText.style.display = 'inline';
        btnLoading.style.display = 'none';
        submitBtn.disabled = false;
    }
}

/**
 * Show a toast notification
 */
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <span>${message}</span>
        <button class="toast-close">&times;</button>
    `;

    container.appendChild(toast);

    // Animate in
    requestAnimationFrame(() => {
        toast.classList.add('show');
    });

    // Close button
    toast.querySelector('.toast-close').addEventListener('click', () => {
        removeToast(toast);
    });

    // Auto-remove after 4 seconds
    setTimeout(() => {
        removeToast(toast);
    }, 4000);
}

function removeToast(toast) {
    toast.classList.remove('show');
    setTimeout(() => {
        toast.remove();
    }, 300);
}
