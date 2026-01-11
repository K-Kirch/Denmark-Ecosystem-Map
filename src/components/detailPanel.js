/**
 * Detail panel for displaying company information
 */

const panel = document.getElementById('detail-panel');
const panelContent = document.getElementById('panel-content');
const panelClose = document.getElementById('panel-close');
const panelOverlay = document.getElementById('panel-overlay');

/**
 * Helper to extract domain from URL
 */
function getDomain(url) {
  try {
    if (!url) return null;
    let href = url;
    if (!href.startsWith('http')) href = 'http://' + href;
    const hostname = new URL(href).hostname;
    return hostname.replace('www.', '');
  } catch (e) {
    return null;
  }
}

/**
 * Open the detail panel with company data
 */
export function openPanel(company) {
  // Generate panel HTML
  panelContent.innerHTML = generatePanelHTML(company);

  // Helper for initials avatar
  const getInitialsAvatar = () =>
    `data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><rect fill=%22%2312121a%22 width=%22100%22 height=%22100%22/><text x=%2250%22 y=%2260%22 font-size=%2250%22 text-anchor=%22middle%22 fill=%22%238B5CF6%22>${company.name.charAt(0)}</text></svg>`;

  // Handle Logo Loading Strategy (Clearbit -> Google -> Initials)
  const img = panelContent.querySelector('.panel-logo');
  if (img) {
    const domain = getDomain(company.website);

    const loadGoogle = () => {
      if (domain) {
        img.src = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
        img.onerror = () => { img.src = getInitialsAvatar(); };
      } else {
        img.src = getInitialsAvatar();
      }
    };

    const loadClearbit = () => {
      if (domain) {
        img.src = `https://logo.clearbit.com/${domain}`;
        img.onerror = loadGoogle;
      } else {
        img.src = getInitialsAvatar();
      }
    };

    // If manual logo fails or isn't present, start chain
    img.onerror = () => {
      if (company.logo) {
        // If manual logo failed, try auto discovery
        loadClearbit();
      } else {
        // Should have started with Clearbit, so go to Google
        loadGoogle();
      }
    };

    // Initial load
    if (!company.logo) {
      if (domain) {
        img.src = `https://logo.clearbit.com/${domain}`;
        img.onerror = loadGoogle;
      } else {
        img.src = getInitialsAvatar();
      }
    }
  }

  // Setup Report Issue button and form listeners
  setupReportListeners(company);

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
 * Setup event listeners for the Report Issue button and form
 */
function setupReportListeners(company) {
  const reportBtn = panelContent.querySelector('.panel-report-btn');
  const reportFormContainer = document.getElementById('report-form-container');
  const cancelBtn = document.getElementById('cancel-report');
  const submitBtn = document.getElementById('submit-report');
  const reasonTextarea = document.getElementById('report-reason');

  if (!reportBtn || !reportFormContainer) return;

  // Show report form when button is clicked
  reportBtn.addEventListener('click', () => {
    reportFormContainer.style.display = 'block';
    reportBtn.style.display = 'none';
    reasonTextarea.focus();
  });

  // Cancel report
  cancelBtn.addEventListener('click', () => {
    reportFormContainer.style.display = 'none';
    reportBtn.style.display = 'flex';
    reasonTextarea.value = '';
  });

  // Submit report
  submitBtn.addEventListener('click', async () => {
    const reason = reasonTextarea.value.trim();

    if (!reason) {
      showToast('Please provide a reason for the report', 'error');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting...';

    try {
      const response = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId: company.id,
          companyName: company.name,
          reason
        })
      });

      if (!response.ok) {
        throw new Error('Failed to submit report');
      }

      showToast('Report submitted successfully. Thank you!', 'success');
      reportFormContainer.style.display = 'none';
      reportBtn.style.display = 'flex';
      reasonTextarea.value = '';

    } catch (error) {
      console.error('Error submitting report:', error);
      showToast('Failed to submit report. Please try again.', 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Submit Report';
    }
  });
}

/**
 * Show a toast notification
 */
function showToast(message, type = 'success') {
  // Check if toast container exists, create if not
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span>${message}</span>
    <button class="toast-close">&times;</button>
  `;

  container.appendChild(toast);

  // Trigger animation
  setTimeout(() => toast.classList.add('show'), 10);

  // Close button
  toast.querySelector('.toast-close').addEventListener('click', () => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  });

  // Auto-remove after 5 seconds
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 5000);
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
        src="${company.logo || ''}" 
        alt="${company.name}" 
        class="panel-logo ${company.type}"
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

    <button class="panel-report-btn fade-in" data-company-id="${company.id}" data-company-name="${company.name}">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
        <line x1="12" y1="9" x2="12" y2="13"/>
        <line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>
      Report Issue
    </button>

    <div class="report-form-container" id="report-form-container" style="display: none;">
      <div class="report-form">
        <h4 class="report-form-title">Report an issue with this company</h4>
        <textarea 
          id="report-reason" 
          class="report-textarea" 
          placeholder="Describe the issue (e.g., company is out of business, website is down, incorrect information...)"
          rows="3"
        ></textarea>
        <div class="report-form-actions">
          <button class="btn-cancel-report" id="cancel-report">Cancel</button>
          <button class="btn-submit-report" id="submit-report">Submit Report</button>
        </div>
      </div>
    </div>
  `;
}
