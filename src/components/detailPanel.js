/**
 * Detail panel for displaying company information
 */

const panel = document.getElementById('detail-panel');
const panelContent = document.getElementById('panel-content');
const panelClose = document.getElementById('panel-close');
const panelOverlay = document.getElementById('panel-overlay');

/**
 * Open the detail panel with company data
 */
export function openPanel(company) {
  // Generate panel HTML
  panelContent.innerHTML = generatePanelHTML(company);

  // Open panel with animation
  panel.classList.add('open');
  panelOverlay.classList.add('visible');

  // Prevent body scroll
  document.body.style.overflow = 'hidden';
}

/**
 * Close the detail panel
 */
export function closePanel() {
  panel.classList.remove('open');
  panelOverlay.classList.remove('visible');
  document.body.style.overflow = '';
}

/**
 * Initialize panel event listeners
 */
export function initPanel() {
  panelClose.addEventListener('click', closePanel);
  panelOverlay.addEventListener('click', closePanel);

  // Close on Escape key (only if panel is open)
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && panel.classList.contains('open')) {
      closePanel();
    }
  });
}

/**
 * Generate the HTML content for the panel
 */
function generatePanelHTML(company) {
  const type = company.type;
  const isInvestor = type === 'investor';
  const isSupporter = type === 'supporter';
  const isStartup = type === 'startup';

  let typeLabel = 'Startup';
  if (isInvestor) typeLabel = company.category || 'Investor';
  if (isSupporter) typeLabel = company.category || 'Supporter';

  let typeIcon = '';
  if (isStartup) {
    typeIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>';
  } else if (isInvestor) {
    typeIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>';
  } else {
    // Supporter icon (Building/Handshake)
    typeIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M3 21h18M5 21V7l8-4 8 4v14M9 10a2 2 0 11-4 0v7h4v-7z"/></svg>';
  }

  // Handle missing data gracefully
  const founded = company.founded || '-';
  const employees = company.employees ? company.employees.toLocaleString() : '-';
  const industry = company.industry || company.focus?.join(', ') || '-';
  const location = company.location || '-';
  const description = company.description || 'No description available.';
  const website = company.website || company.portfolioUrl || '#';

  // Stats section
  let statsHtml = '';
  if (isStartup) {
    statsHtml = `
      <div class="panel-stats fade-in">
        <div class="panel-stat">
          <span class="panel-stat-value">${founded}</span>
          <span class="panel-stat-label">Founded</span>
        </div>
        <div class="panel-stat">
          <span class="panel-stat-value">${employees}</span>
          <span class="panel-stat-label">Employees</span>
        </div>
        <div class="panel-stat">
          <span class="panel-stat-value">${industry.split(',')[0].trim()}</span>
          <span class="panel-stat-label">Industry</span>
        </div>
      </div>
    `;
  } else {
    // Investor or Supporter
    statsHtml = `
      <div class="panel-stats fade-in">
        <div class="panel-stat">
          <span class="panel-stat-value">${founded}</span>
          <span class="panel-stat-label">Founded</span>
        </div>
        <div class="panel-stat">
          <span class="panel-stat-value">${location.split(',')[0]}</span>
          <span class="panel-stat-label">Location</span>
        </div>
        <div class="panel-stat">
          <span class="panel-stat-value">${company.category || (isInvestor ? 'VC' : 'Supporter')}</span>
          <span class="panel-stat-label">Type</span>
        </div>
      </div>
    `;
  }

  // Focus areas for investors
  let focusHtml = '';
  if (isInvestor && company.focus && company.focus.length > 0) {
    focusHtml = `
      <div class="panel-section fade-in">
        <h3 class="panel-section-title">Investment Focus</h3>
        <div class="panel-tags">
          ${company.focus.map(f => `<span class="panel-tag">${f}</span>`).join('')}
        </div>
      </div>
    `;
  }

  // Hiring badge for startups
  const hiringHtml = company.isHiring ? `
    <div class="hiring-badge fade-in">
      Currently Hiring
    </div>
  ` : '';

  // Funding/valuation for startups
  let fundingHtml = '';
  if (!isInvestor && (company.funding || company.valuation)) {
    fundingHtml = `
      <div class="panel-section fade-in">
        <h3 class="panel-section-title">Funding</h3>
        <div class="panel-funding">
          ${company.funding ? `<span>Raised: <strong>${company.funding}</strong></span>` : ''}
          ${company.valuation && company.valuation !== '-' ? `<span>Valuation: <strong>${company.valuation}</strong></span>` : ''}
        </div>
      </div>
    `;
  }

  // Investors list for startups
  let investorsHtml = '';
  if (!isInvestor && company.investors && company.investors.length > 0) {
    investorsHtml = `
      <div class="panel-section fade-in">
        <h3 class="panel-section-title">Investors</h3>
        <div class="panel-tags">
          ${company.investors.map(i => `<span class="panel-tag investor-tag">${i}</span>`).join('')}
        </div>
      </div>
    `;
  }

  // Portfolio link for investors
  let portfolioHtml = '';
  if (isInvestor && company.portfolioUrl) {
    portfolioHtml = `
      <a href="${company.portfolioUrl}" target="_blank" rel="noopener noreferrer" class="panel-cta-secondary fade-in">
        View Portfolio
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
          <line x1="9" y1="9" x2="15" y2="15"/>
          <line x1="15" y1="9" x2="15" y2="15"/>
          <line x1="9" y1="15" x2="15" y2="15"/>
        </svg>
      </a>
    `;
  }

  const verifiedBadge = company.verified ? `
    <span class="panel-verified" title="Verified by CVR">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
        <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
      </svg>
      Verified
    </span>
  ` : '';

  return `
    <div class="panel-header fade-in">
      <img 
        src="${company.logo}" 
        alt="${company.name}" 
        class="panel-logo ${company.type}"
        onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><rect fill=%22%2312121a%22 width=%22100%22 height=%22100%22/><text x=%2250%22 y=%2260%22 font-size=%2250%22 text-anchor=%22middle%22 fill=%22%238B5CF6%22>${company.name.charAt(0)}</text></svg>'"
      />
      <h2 class="panel-name">
        ${company.name}
      </h2>
      <div class="panel-badges">
        <span class="panel-type ${company.type}">
            ${typeIcon}
            ${typeLabel}
        </span>
        ${verifiedBadge}
      </div>
    </div>

    ${statsHtml}

    ${hiringHtml}

    ${focusHtml}

    <div class="panel-section fade-in">
      <h3 class="panel-section-title">About</h3>
      <p class="panel-description">${description}</p>
    </div>

    ${fundingHtml}

    ${investorsHtml}

    ${portfolioHtml}

    <a href="${website}" target="_blank" rel="noopener noreferrer" class="panel-cta fade-in">
      Visit Website
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/>
        <polyline points="15 3 21 3 21 9"/>
        <line x1="10" y1="14" x2="21" y2="3"/>
      </svg>
    </a>
  `;
}
