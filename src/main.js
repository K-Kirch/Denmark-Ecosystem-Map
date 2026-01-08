/**
 * Denmark Ecosystem Map - Main Application
 */
import './style.css';
import 'leaflet/dist/leaflet.css';

import { initMap, flyTo } from './components/map.js';
import { addMarkers } from './components/markers.js';
import { openPanel, initPanel } from './components/detailPanel.js';
import { loadCompanies, getCompaniesByType, searchCompanies, getCounts } from './data/companyLoader.js';
import { initAddCompanyModal, openModal } from './components/addCompanyModal.js';

// DOM Elements
const filterButtons = document.querySelectorAll('.filter-btn');
const searchInput = document.getElementById('search-input');
const startupCountEl = document.getElementById('startup-count');
const investorCountEl = document.getElementById('investor-count');
const addCompanyBtn = document.getElementById('add-company-btn');

// State
let map = null;
let currentFilter = 'all';
let allCompanies = [];
let currentCompanies = [];

/**
 * Initialize the application
 */
async function init() {
    // Show loading state
    console.log('🇩🇰 Loading Denmark Ecosystem Map...');

    // Initialize map first
    map = initMap('map');

    // Initialize detail panel
    initPanel();

    // Initialize add company modal
    initAddCompanyModal(handleCompanyAdded);

    // Load company data
    try {
        allCompanies = await loadCompanies();
        currentCompanies = [...allCompanies];

        // Add markers
        addMarkers(map, currentCompanies, handleMarkerClick);

        // Update stats
        updateStats();

        console.log(`✓ Loaded ${allCompanies.length} companies`);
    } catch (error) {
        console.error('Failed to load companies:', error);
    }

    // Set up event listeners
    setupEventListeners();

    console.log('🇩🇰 Denmark Ecosystem Map initialized');
}

/**
 * Handle new company added - refresh map
 */
function handleCompanyAdded(newCompany) {
    allCompanies.push(newCompany);
    currentCompanies = [...allCompanies];

    // Refresh markers
    addMarkers(map, currentCompanies, handleMarkerClick);

    // Update stats
    updateStats();

    // Fly to new company
    if (newCompany.coordinates) {
        flyTo(newCompany.coordinates[0], newCompany.coordinates[1], 13);
    }
}

/**
 * Handle marker click - open detail panel and fly to location
 */
function handleMarkerClick(company) {
    openPanel(company);

    if (company.coordinates && company.coordinates[0] && company.coordinates[1]) {
        flyTo(company.coordinates[0], company.coordinates[1], 13);
    }
}

/**
 * Set up all event listeners
 */
function setupEventListeners() {
    // Filter buttons
    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const filter = btn.dataset.filter;
            setActiveFilter(filter);
            applyFilters();
        });
    });

    // Search input
    let searchTimeout;
    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            applyFilters();
        }, 300);
    });

    // Add company button
    if (addCompanyBtn) {
        addCompanyBtn.addEventListener('click', openModal);
    }
}

/**
 * Set active filter button
 */
function setActiveFilter(filter) {
    currentFilter = filter;
    filterButtons.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.filter === filter);
    });
}

/**
 * Apply current filters and search
 */
function applyFilters() {
    const searchQuery = searchInput.value.trim();

    // Start with filtered by type
    let filtered = getCompaniesByType(allCompanies, currentFilter);

    // Apply search if query exists
    if (searchQuery) {
        filtered = searchCompanies(filtered, searchQuery);
    }

    currentCompanies = filtered;

    // Update markers
    addMarkers(map, currentCompanies, handleMarkerClick);

    // Update stats based on all companies (not filtered)
    updateStats();
}

/**
 * Update the stats bar with current counts
 */
function updateStats() {
    const counts = getCounts(allCompanies);
    const startupEl = document.getElementById('startup-count');
    const investorEl = document.getElementById('investor-count');

    if (startupEl && investorEl) {
        // Animate count updates
        animateCounter(startupEl, counts.startups);
        animateCounter(investorEl, counts.investors);
    }
}

/**
 * Animate a number counter
 */
function animateCounter(element, target) {
    const current = parseInt(element.textContent) || 0;
    const increment = target > current ? 1 : -1;
    const duration = 500;
    const steps = Math.abs(target - current);

    if (steps === 0) return;

    const stepDuration = Math.max(duration / steps, 10);
    let value = current;

    const timer = setInterval(() => {
        value += increment;
        element.textContent = value;

        if (value === target) {
            clearInterval(timer);
        }
    }, stepDuration);
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', init);
