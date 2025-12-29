let isMenuOpen = false;
let menuData = null;
let activeDropdowns = [];

// GetParentResourceName is a built-in FiveM function available in NUI context
if (typeof GetParentResourceName === 'undefined') {
    window.GetParentResourceName = function() {
        return window.location.hostname;
    };
}

// Notification System
function showNotification(message, type = 'info', title = '') {
    // Create notification container if it doesn't exist
    let container = document.getElementById('notification-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'notification-container';
        container.className = 'notification-container';
        document.body.appendChild(container);
    }

    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    
    const icon = getNotificationIcon(type);
    const displayTitle = title || getNotificationTitle(type);
    
    notification.innerHTML = `
        <div class="notification-icon">${icon}</div>
        <div class="notification-content">
            <div class="notification-title">${displayTitle}</div>
            <div class="notification-message">${message}</div>
        </div>
        <button class="notification-close" onclick="this.parentElement.remove()">×</button>
    `;
    
    container.appendChild(notification);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.classList.add('hiding');
            setTimeout(() => notification.remove(), 300);
        }
    }, 5000);
}

function getNotificationIcon(type) {
    const icons = {
        error: '<svg width="24" height="24" viewBox="-2 -2 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 8V12M12 16H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
        success: '<svg width="24" height="24" viewBox="-2 -2 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
        warning: '<svg width="24" height="24" viewBox="-2 -2 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 9V13M12 17H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
        info: '<svg width="24" height="24" viewBox="-2 -2 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 16V12M12 8H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
    };
    return icons[type] || icons.info;
}

function getNotificationTitle(type) {
    const titles = {
        error: 'Error',
        success: 'Success',
        warning: 'Warning',
        info: 'Info'
    };
    return titles[type] || 'Info';
}

// Listen for messages from Lua
window.addEventListener('message', function(event) {
    const data = event.data;
    
    switch(data.action) {
        case 'openMenu':
            openMenu(data.data);
            break;
        case 'closeMenu':
            closeMenu();
            break;
    }
});

// Open menu function
function openMenu(data) {
    if (isMenuOpen) return;
    
    menuData = data;
    
    // Set logo image from config
    if (data && data.logoImage) {
        const logoIcon = document.querySelector('.logo-icon');
        if (logoIcon) {
            logoIcon.style.backgroundImage = `url('${data.logoImage}')`;
        }
    }
    
    // Show/hide staff section
    const staffSection = document.getElementById('staff-section');
    if (staffSection) {
        if (data && data.isStaff) {
            staffSection.classList.remove('hidden');
        } else {
            staffSection.classList.add('hidden');
        }
    }
    
    const container = document.getElementById('gang-menu-container');
    if (container) {
        container.classList.remove('hidden');
        
        setTimeout(() => {
            container.style.display = 'flex';
        }, 10);
    }
    
    isMenuOpen = true;
}

// Close menu function
function closeMenu() {
    if (!isMenuOpen) return;
    
    const container = document.getElementById('gang-menu-container');
    if (container) {
        container.classList.add('hidden');
        
        setTimeout(() => {
            container.style.display = 'none';
            closeAllModals();
            closeAllDropdowns();
        }, 300);
    }
    
    isMenuOpen = false;
    menuData = null;
}

// Custom Dropdown System
const dropdownInstances = {};

function createSearchableDropdown(dropdownId, options, selectedValue, placeholder) {
    const dropdown = document.getElementById(dropdownId);
    if (!dropdown) return null;
    
    const existing = dropdownInstances[dropdownId];
    if (existing && existing.clickHandler) {
        const selected = dropdown.querySelector('.dropdown-selected');
        if (selected) {
            selected.removeEventListener('click', existing.clickHandler);
        }
    }
    
    const selected = dropdown.querySelector('.dropdown-selected');
    const optionsContainer = dropdown.querySelector('.dropdown-options');
    const hiddenInput = dropdown.querySelector('input[type="hidden"]');
    const searchInput = dropdown.querySelector('.dropdown-search-input');
    
    if (!selected || !optionsContainer || !hiddenInput || !searchInput) return null;
    
    const originalOptions = options;
    let filteredOptions = options;
    
    optionsContainer.innerHTML = '';
    searchInput.value = '';
    
    if (!selectedValue) {
        searchInput.placeholder = placeholder || 'Type to search...';
        hiddenInput.value = '';
    } else {
        const selectedOption = originalOptions.find(opt => opt.value === selectedValue);
        if (selectedOption) {
            searchInput.value = selectedOption.text;
            hiddenInput.value = selectedValue;
        }
    }
    
    function renderOptions(optionsToRender) {
        optionsContainer.innerHTML = '';
        
        if (optionsToRender.length === 0) {
            const noResults = document.createElement('div');
            noResults.className = 'dropdown-option no-results';
            noResults.textContent = 'No players found';
            optionsContainer.appendChild(noResults);
            return;
        }
        
        optionsToRender.forEach(option => {
            const optionEl = document.createElement('div');
            optionEl.className = 'dropdown-option';
            if (option.value === selectedValue) {
                optionEl.classList.add('selected');
            }
            optionEl.textContent = option.text;
            optionEl.dataset.value = option.value;
            
            optionEl.addEventListener('click', function(e) {
                e.stopPropagation();
                searchInput.value = option.text;
                hiddenInput.value = option.value;
                
                optionsContainer.querySelectorAll('.dropdown-option').forEach(opt => {
                    opt.classList.remove('selected');
                });
                optionEl.classList.add('selected');
                
                closeDropdown(dropdownId);
            });
            
            optionsContainer.appendChild(optionEl);
        });
    }
    
    renderOptions(filteredOptions);
    
    searchInput.addEventListener('input', function(e) {
        e.stopPropagation();
        const searchText = this.value.toLowerCase().trim();
        
        if (searchText === '') {
            filteredOptions = originalOptions;
        } else {
            filteredOptions = originalOptions.filter(option => {
                return option.searchText && option.searchText.includes(searchText);
            });
        }
        
        renderOptions(filteredOptions);
        
        if (!selected.classList.contains('active')) {
            toggleDropdown(dropdownId);
        }
    });
    
    const clickHandler = function(e) {
        if (e.target === searchInput) {
            e.stopPropagation();
            if (!selected.classList.contains('active')) {
                toggleDropdown(dropdownId);
            }
            searchInput.focus();
            return;
        }
        e.stopPropagation();
        toggleDropdown(dropdownId);
    };
    
    selected.addEventListener('click', clickHandler);
    
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.attributeName === 'class' && selected.classList.contains('active')) {
                setTimeout(() => {
                    searchInput.focus();
                    if (searchInput.value === '') {
                        searchInput.select();
                    }
                }, 10);
            }
        });
    });
    observer.observe(selected, { attributes: true });
    
    dropdownInstances[dropdownId] = {
        clickHandler: clickHandler,
        originalOptions: originalOptions,
        getValue: () => hiddenInput.value,
        setValue: (value) => {
            const option = originalOptions.find(opt => opt.value === value);
            if (option) {
                searchInput.value = option.text;
                hiddenInput.value = value;
                renderOptions(originalOptions);
                optionsContainer.querySelectorAll('.dropdown-option').forEach(opt => {
                    opt.classList.remove('selected');
                    if (opt.dataset.value === value) {
                        opt.classList.add('selected');
                    }
                });
            }
        }
    };
    
    return dropdownInstances[dropdownId];
}

function toggleDropdown(dropdownId) {
    activeDropdowns.forEach(id => {
        if (id !== dropdownId) {
            closeDropdown(id);
        }
    });

    const dropdown = document.getElementById(dropdownId);
    if (!dropdown) return;

    const selected = dropdown.querySelector('.dropdown-selected');
    const options = dropdown.querySelector('.dropdown-options');
    
    if (!selected || !options) return;

    const isActive = selected.classList.contains('active');
    
    if (isActive) {
        closeDropdown(dropdownId);
    } else {
        selected.classList.add('active');
        options.classList.remove('hidden');
        activeDropdowns.push(dropdownId);
    }
}

function closeDropdown(dropdownId) {
    const dropdown = document.getElementById(dropdownId);
    if (!dropdown) return;

    const selected = dropdown.querySelector('.dropdown-selected');
    const options = dropdown.querySelector('.dropdown-options');
    
    if (selected) {
        selected.classList.remove('active');
    }
    if (options) {
        options.classList.add('hidden');
    }
    
    activeDropdowns = activeDropdowns.filter(id => id !== dropdownId);
}

function closeAllDropdowns() {
    activeDropdowns.forEach(id => closeDropdown(id));
}

// Modal management
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        closeAllDropdowns();
        modal.classList.remove('hidden');
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('hidden');
    }
    closeAllDropdowns();
}

function closeAllModals() {
    closeModal('create-gang-modal');
    closeModal('delete-confirm-modal');
}

// Show gang cards view
function showGangCards() {
    const menuButtons = document.getElementById('menu-buttons');
    const cardsContainer = document.getElementById('gang-cards-container');
    
    if (menuButtons) menuButtons.classList.add('hidden');
    if (cardsContainer) {
        cardsContainer.classList.remove('hidden');
        loadGangCards();
    }
}

// Hide gang cards view
function hideGangCards() {
    const menuButtons = document.getElementById('menu-buttons');
    const cardsContainer = document.getElementById('gang-cards-container');
    
    if (menuButtons) menuButtons.classList.remove('hidden');
    if (cardsContainer) cardsContainer.classList.add('hidden');
    
    // Reset all cards to front
    document.querySelectorAll('.gang-card').forEach(card => {
        card.classList.remove('flipped');
    });
}

// Load and render gang cards
function loadGangCards() {
    const cardsGrid = document.getElementById('gang-cards-grid');
    if (!cardsGrid) return;
    
    cardsGrid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: var(--text-secondary); padding: 40px;">Loading gangs...</div>';
    
    fetch(`https://${GetParentResourceName()}/getAllGangs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
    })
    .then(response => response.json())
    .then(gangs => {
        cardsGrid.innerHTML = '';
        
        if (!gangs || gangs.length === 0) {
            cardsGrid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: var(--text-secondary); padding: 40px;">No gangs found</div>';
            return;
        }
        
        gangs.forEach(gang => {
            const card = createGangCard(gang);
            cardsGrid.appendChild(card);
        });
    })
    .catch(error => {
        console.error('Error loading gangs:', error);
        showNotification('Failed to load gangs', 'error');
        cardsGrid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: #ef4444; padding: 40px;">Error loading gangs</div>';
    });
}

// Create a gang card element
function createGangCard(gang) {
    const card = document.createElement('div');
    card.className = 'gang-card';
    card.dataset.gangId = gang.id;
    
    card.innerHTML = `
        <div class="gang-card-inner">
            <div class="gang-card-front">
                <svg class="gang-card-icon" width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M17 21V19C17 17.9391 16.5786 16.9217 15.8284 16.1716C15.0783 15.4214 14.0609 15 13 15H5C3.93913 15 2.92172 15.4214 2.17157 16.1716C1.42143 16.9217 1 17.9391 1 19V21M23 21V19C22.9993 18.1137 22.7044 17.2528 22.1614 16.5523C21.6184 15.8519 20.8581 15.3516 20 15.13M16 3.13C16.8604 3.35031 17.623 3.85071 18.1676 4.55232C18.7122 5.25392 19.0078 6.11683 19.0078 7.005C19.0078 7.89318 18.7122 8.75608 18.1676 9.45769C17.623 10.1593 16.8604 10.6597 16 10.88M13 7C13 9.20914 11.2091 11 9 11C6.79086 11 5 9.20914 5 7C5 4.79086 6.79086 3 9 3C11.2091 3 13 4.79086 13 7Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                <div class="gang-card-name">${escapeHtml(gang.name)}</div>
                <div class="gang-card-label">Gang Leader</div>
                <div class="gang-card-owner">${escapeHtml(gang.ownerName)}</div>
            </div>
            <div class="gang-card-back">
                <div class="gang-card-back-content">
                    <svg class="gang-card-back-icon" width="56" height="56" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M3 6H5H21M8 6V4C8 3.46957 8.21071 2.96086 8.58579 2.58579C8.96086 2.21071 9.46957 2 10 2H14C14.5304 2 15.0391 2.21071 15.4142 2.58579C15.7893 2.96086 16 3.46957 16 4V6M19 6V20C19 20.5304 18.7893 21.0391 18.4142 21.4142C18.0391 21.7893 17.5304 22 17 22H7C6.46957 22 5.96086 21.7893 5.58579 21.4142C5.21071 21.0391 5 20.5304 5 20V6H19Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    <div class="gang-card-back-message">Delete this gang?</div>
                    <div class="gang-card-back-hint">Click the button below to confirm</div>
                    <button class="gang-card-delete-btn" data-gang-id="${gang.id}">Delete Gang</button>
                </div>
            </div>
        </div>
    `;
    
    // Handle card click to flip
    card.addEventListener('click', function(e) {
        // Don't flip if clicking the delete button
        if (e.target.closest('.gang-card-delete-btn')) {
            return;
        }
        this.classList.toggle('flipped');
    });
    
    // Handle delete button click
    const deleteBtn = card.querySelector('.gang-card-delete-btn');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            const gangId = parseInt(this.dataset.gangId);
            if (gangId) {
                openDeleteConfirmModal(gangId, gang.name);
            }
        });
    }
    
    return card;
}

// Open delete confirmation modal
let pendingDeleteGangId = null;

function openDeleteConfirmModal(gangId, gangName) {
    pendingDeleteGangId = gangId;
    openModal('delete-confirm-modal');
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Validate HEX color code
function validateHexColor(hex) {
    if (!hex || hex === '') {
        return { valid: true, normalized: '#ffffff' }; // Default to white
    }
    
    // Remove # if present
    let cleanHex = hex.replace(/^#/, '').toUpperCase();
    
    // Check if it's a valid 6-character HEX code
    if (/^[0-9A-F]{6}$/.test(cleanHex)) {
        return { valid: true, normalized: '#' + cleanHex };
    }
    
    return { valid: false, normalized: null };
}

// Normalize HEX color (add # if missing, uppercase)
function normalizeHexColor(hex) {
    if (!hex || hex === '') {
        return '#ffffff';
    }
    
    // Remove # if present
    let cleanHex = hex.replace(/^#/, '').toUpperCase();
    
    // If it's 6 characters, add #
    if (cleanHex.length === 6) {
        return '#' + cleanHex;
    }
    
    // If it already has # and is 7 characters, return as is
    if (hex.length === 7 && hex.startsWith('#')) {
        return hex.toUpperCase();
    }
    
    return '#ffffff'; // Default fallback
}

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', function() {
    // Close button
    const closeBtn = document.getElementById('close-btn');
    if (closeBtn) {
        closeBtn.addEventListener('click', function() {
            closeMenu();
            fetch(`https://${GetParentResourceName()}/closeMenu`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({})
            });
        });
    }
    
    // Create Gang button
    const createGangBtn = document.getElementById('create-gang-btn');
    if (createGangBtn) {
        createGangBtn.addEventListener('click', function() {
            openModal('create-gang-modal');
            
            // Reset color field to default
            const colorInput = document.getElementById('gang-color');
            const colorPreview = document.getElementById('color-preview');
            const colorPickerPanel = document.getElementById('color-picker-panel');
            if (colorInput) colorInput.value = '#ffffff';
            if (colorPreview) colorPreview.style.backgroundColor = '#ffffff';
            if (colorPickerPanel) colorPickerPanel.classList.add('hidden');
            
            // Load players for dropdown
            fetch(`https://${GetParentResourceName()}/getAllPlayers`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({})
            })
            .then(response => response.json())
            .then(players => {
                if (players && players.length > 0) {
                    const playerOptions = players.map(player => ({
                        value: player.citizenid,
                        text: `${player.name}${player.online ? ' (Online)' : ' (Offline)'}`,
                        searchText: `${player.name} ${player.citizenid}`.toLowerCase()
                    }));
                    createSearchableDropdown('gang-owner-dropdown', playerOptions, '', 'Type to search...');
                }
            })
            .catch(error => {
                console.error('Error loading players:', error);
                showNotification('Failed to load players', 'error');
            });
        });
    }
    
    // Custom Color Picker Functionality
    const colorInput = document.getElementById('gang-color');
    const colorPreview = document.getElementById('color-preview');
    const colorPickerPanel = document.getElementById('color-picker-panel');
    const colorSpectrum = document.getElementById('color-spectrum');
    const colorHue = document.getElementById('color-hue');
    const colorCursor = document.getElementById('color-cursor');
    const hueSlider = document.getElementById('hue-slider');
    const colorPreviewLarge = document.getElementById('color-preview-large');
    
    let currentHue = 0;
    let currentSaturation = 1;
    let currentBrightness = 1;
    let isDraggingSpectrum = false;
    let isDraggingHue = false;
    let spectrumUpdateFrame = null;
    let lastHue = -1; // Track last hue to detect changes
    
    // Initialize color picker canvases
    function initColorPicker() {
        if (!colorSpectrum || !colorHue) return;
        
        const spectrumCtx = colorSpectrum.getContext('2d');
        const hueCtx = colorHue.getContext('2d');
        
        // Draw hue slider
        const hueGradient = hueCtx.createLinearGradient(0, 0, 0, 200);
        for (let i = 0; i <= 360; i += 30) {
            hueGradient.addColorStop(i / 360, `hsl(${i}, 100%, 50%)`);
        }
        hueCtx.fillStyle = hueGradient;
        hueCtx.fillRect(0, 0, 20, 200);
        
        // Draw initial spectrum
        updateColorSpectrum();
    }
    
    // Helper function to convert HSL to RGB
    function hslToRgb(h, s, l) {
        h /= 360;
        let r, g, b;
        
        if (s === 0) {
            r = g = b = l; // achromatic
        } else {
            const hue2rgb = (p, q, t) => {
                if (t < 0) t += 1;
                if (t > 1) t -= 1;
                if (t < 1/6) return p + (q - p) * 6 * t;
                if (t < 1/2) return q;
                if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
                return p;
            };
            
            const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            const p = 2 * l - q;
            r = hue2rgb(p, q, h + 1/3);
            g = hue2rgb(p, q, h);
            b = hue2rgb(p, q, h - 1/3);
        }
        
        return [
            Math.round(r * 255),
            Math.round(g * 255),
            Math.round(b * 255)
        ];
    }
    
    // Update color spectrum based on current hue (correctly aligned with HSL)
    function updateColorSpectrum(force = false) {
        if (!colorSpectrum) return;
        
        // Only update if hue actually changed (avoid unnecessary redraws)
        if (!force && Math.abs(currentHue - lastHue) < 0.1) {
            return;
        }
        
        lastHue = currentHue;
        
        // Cancel pending update if one exists
        if (spectrumUpdateFrame) {
            cancelAnimationFrame(spectrumUpdateFrame);
            spectrumUpdateFrame = null;
        }
        
        // Use requestAnimationFrame for smooth, throttled updates (60fps max)
        spectrumUpdateFrame = requestAnimationFrame(() => {
            const ctx = colorSpectrum.getContext('2d');
            const width = colorSpectrum.width;
            const height = colorSpectrum.height;
            
            // Use ImageData for accurate color representation
            const imageData = ctx.createImageData(width, height);
            const data = imageData.data;
            
            // Draw spectrum with standard layout:
            // Top left: s=0, l=1 (white) - 0 saturation, 100% lightness
            // Top right: s=1, l=1 (bright full color) - full saturation, 100% lightness
            // Bottom right: s=1, l=0 (dark full color) - full saturation, 0% lightness
            // Bottom left: s=0, l=0 (black) - 0 saturation, 0% lightness
            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    const s = x / width; // Saturation: 0 (left) to 1 (right)
                    const l = 1 - (y / height); // Lightness: 1 (top) to 0 (bottom)
                    
                    // Convert HSL to RGB
                    const [r, g, b] = hslToRgb(currentHue, s, l);
                    
                    const index = (y * width + x) * 4;
                    data[index] = r;
                    data[index + 1] = g;
                    data[index + 2] = b;
                    data[index + 3] = 255;
                }
            }
            
            ctx.putImageData(imageData, 0, 0);
            
            // Update cursor position
            updateCursorPosition();
            
            spectrumUpdateFrame = null;
        });
    }
    
    // Update cursor position on spectrum
    function updateCursorPosition() {
        if (!colorCursor) return;
        
        const x = currentSaturation * colorSpectrum.width;
        const y = (1 - currentBrightness) * colorSpectrum.height; // currentBrightness is actually lightness (0-1)
        colorCursor.style.left = x + 'px';
        colorCursor.style.top = y + 'px';
    }
    
    // Update hue slider position
    function updateHueSliderPosition() {
        if (!hueSlider) return;
        
        const y = (currentHue / 360) * colorHue.height;
        hueSlider.style.top = y + 'px';
    }
    
    // Convert HSL to HEX (using same conversion as spectrum)
    function hslToHex(h, s, l) {
        const [r, g, b] = hslToRgb(h, s, l);
        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`.toUpperCase();
    }
    
    // Convert HEX to HSL
    function hexToHsl(hex) {
        const r = parseInt(hex.slice(1, 3), 16) / 255;
        const g = parseInt(hex.slice(3, 5), 16) / 255;
        const b = parseInt(hex.slice(5, 7), 16) / 255;
        
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        let h, s, l = (max + min) / 2;
        
        if (max === min) {
            h = s = 0;
        } else {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
                case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
                case g: h = ((b - r) / d + 2) / 6; break;
                case b: h = ((r - g) / d + 4) / 6; break;
            }
        }
        
        return [h * 360, s, l];
    }
    
    // Update color from current HSL values
    function updateColorFromHSL() {
        const hex = hslToHex(currentHue, currentSaturation, currentBrightness);
        const normalized = hex.toUpperCase();
        
        if (colorInput) colorInput.value = normalized;
        if (colorPreview) colorPreview.style.backgroundColor = normalized;
        if (colorPreviewLarge) colorPreviewLarge.style.backgroundColor = normalized;
    }
    
    // Update HSL from HEX
    function updateHSLFromHex(hex) {
        const validation = validateHexColor(hex);
        if (!validation.valid) return;
        
        const [h, s, l] = hexToHsl(validation.normalized);
        currentHue = h;
        currentSaturation = s;
        currentBrightness = l;
        
        updateColorSpectrum();
        updateHueSliderPosition();
        updateColorFromHSL();
    }
    
    if (colorPreview && colorPickerPanel) {
        // Toggle color picker panel
        colorPreview.addEventListener('click', function(e) {
            e.stopPropagation();
            if (colorPickerPanel.classList.contains('hidden')) {
                colorPickerPanel.classList.remove('hidden');
                initColorPicker();
                updateHSLFromHex(colorInput ? colorInput.value : '#ffffff');
            } else {
                colorPickerPanel.classList.add('hidden');
            }
        });
        
        // Close color picker when clicking outside
        document.addEventListener('click', function(e) {
            if (colorPickerPanel && !colorPickerPanel.contains(e.target) && e.target !== colorPreview) {
                colorPickerPanel.classList.add('hidden');
            }
        });
    }
    
    // Spectrum interaction
    if (colorSpectrum) {
        colorSpectrum.addEventListener('mousedown', function(e) {
            isDraggingSpectrum = true;
            const rect = colorSpectrum.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            currentSaturation = Math.max(0, Math.min(1, x / colorSpectrum.width));
            currentBrightness = Math.max(0, Math.min(1, 1 - (y / colorSpectrum.height)));
            
            updateCursorPosition();
            updateColorFromHSL();
        });
        
        document.addEventListener('mousemove', function(e) {
            if (isDraggingSpectrum && colorSpectrum) {
                const rect = colorSpectrum.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                
                currentSaturation = Math.max(0, Math.min(1, x / colorSpectrum.width));
                currentBrightness = Math.max(0, Math.min(1, 1 - (y / colorSpectrum.height)));
                
                updateCursorPosition();
                updateColorFromHSL();
            }
        });
        
        document.addEventListener('mouseup', function() {
            isDraggingSpectrum = false;
        });
    }
    
    // Hue slider interaction (optimized for immediate feedback)
    if (colorHue) {
        colorHue.addEventListener('mousedown', function(e) {
            isDraggingHue = true;
            const rect = colorHue.getBoundingClientRect();
            const y = e.clientY - rect.top;
            
            currentHue = Math.max(0, Math.min(360, (y / colorHue.height) * 360));
            
            updateHueSliderPosition();
            updateColorFromHSL(); // Update color immediately for responsive feel
            updateColorSpectrum(); // Update spectrum immediately
        });
        
        document.addEventListener('mousemove', function(e) {
            if (isDraggingHue && colorHue) {
                const rect = colorHue.getBoundingClientRect();
                const y = e.clientY - rect.top;
                
                currentHue = Math.max(0, Math.min(360, (y / colorHue.height) * 360));
                
                updateHueSliderPosition();
                updateColorFromHSL(); // Update color immediately for responsive feel
                updateColorSpectrum(); // Update spectrum - requestAnimationFrame will throttle to 60fps
            }
        });
        
        document.addEventListener('mouseup', function() {
            isDraggingHue = false;
            // Final spectrum update to ensure it's accurate
            updateColorSpectrum(true);
        });
    }
    
    // Sync text input to color picker
    if (colorInput && colorPreview) {
        colorInput.addEventListener('input', function() {
            let value = this.value;
            
            // Limit to 7 characters
            if (value.length > 7) {
                value = value.substring(0, 7);
                this.value = value;
            }
            
            // Auto-add # if 6 characters without #
            if (value.length === 6 && !value.startsWith('#')) {
                value = '#' + value;
                this.value = value;
            }
            
            // Update color picker and preview if valid
            const validation = validateHexColor(value);
            if (validation.valid && validation.normalized) {
                updateHSLFromHex(validation.normalized);
            }
        });
        
        // Validate on blur
        colorInput.addEventListener('blur', function() {
            const validation = validateHexColor(this.value);
            if (!validation.valid) {
                showNotification('Invalid HEX color code. Using default white.', 'warning');
                const defaultColor = '#ffffff';
                this.value = defaultColor;
                updateHSLFromHex(defaultColor);
            } else {
                const normalized = validation.normalized;
                this.value = normalized;
                updateHSLFromHex(normalized);
            }
        });
        
        // Initial update
        updateHSLFromHex(colorInput.value || '#ffffff');
    }
    
    // Create Gang modal handlers
    const createGangModal = document.getElementById('create-gang-modal');
    const createGangClose = document.getElementById('create-gang-close');
    const createGangCancel = document.getElementById('create-gang-cancel');
    const createGangConfirm = document.getElementById('create-gang-confirm');
    
    if (createGangClose) {
        createGangClose.addEventListener('click', () => closeModal('create-gang-modal'));
    }
    if (createGangCancel) {
        createGangCancel.addEventListener('click', () => closeModal('create-gang-modal'));
    }
    if (createGangConfirm) {
        createGangConfirm.addEventListener('click', function() {
            const gangName = document.getElementById('gang-name').value.trim();
            const ownerCitizenid = document.getElementById('gang-owner-id').value;
            const gangColorInput = document.getElementById('gang-color');
            let gangColor = gangColorInput ? gangColorInput.value.trim() : '#ffffff';
            
            if (!gangName) {
                showNotification('Please enter a gang name', 'error');
                return;
            }
            
            if (!ownerCitizenid) {
                showNotification('Please select a gang owner', 'error');
                return;
            }
            
            // Validate and normalize color
            const colorValidation = validateHexColor(gangColor);
            if (!colorValidation.valid) {
                showNotification('Invalid HEX color code. Using default white.', 'warning');
                gangColor = '#ffffff';
            } else {
                gangColor = colorValidation.normalized;
            }
            
            // Add loading state
            this.classList.add('loading');
            this.disabled = true;
            
            fetch(`https://${GetParentResourceName()}/createGang`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    gangName: gangName,
                    ownerCitizenid: ownerCitizenid,
                    gangColor: gangColor
                })
            })
            .then(response => response.json())
            .then(result => {
                if (result.success) {
                    showNotification(result.message || 'Gang created successfully', 'success');
                    document.getElementById('gang-name').value = '';
                    document.getElementById('gang-owner-search').value = '';
                    document.getElementById('gang-owner-id').value = '';
                    const defaultColor = '#ffffff';
                    if (gangColorInput) gangColorInput.value = defaultColor;
                    const colorPreview = document.getElementById('color-preview');
                    const colorPickerPanel = document.getElementById('color-picker-panel');
                    if (colorPreview) colorPreview.style.backgroundColor = defaultColor;
                    if (colorPickerPanel) colorPickerPanel.classList.add('hidden');
                    closeModal('create-gang-modal');
                } else {
                    showNotification(result.message || 'Failed to create gang', 'error');
                }
            })
            .catch(error => {
                console.error('Error creating gang:', error);
                showNotification('Failed to create gang', 'error');
            })
            .finally(() => {
                this.classList.remove('loading');
                this.disabled = false;
            });
        });
    }
    
    // Close modals when clicking outside
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                closeModal(this.id);
            }
        });
    });
    
    // Close dropdowns when clicking outside
    document.addEventListener('click', function(e) {
        if (e.target.closest('.custom-dropdown')) {
            return;
        }
        closeAllDropdowns();
    });
    
    // Delete Gang button
    const deleteGangBtn = document.getElementById('delete-gang-btn');
    if (deleteGangBtn) {
        deleteGangBtn.addEventListener('click', function() {
            showGangCards();
        });
    }
    
    // Back to menu button
    const backToMenuBtn = document.getElementById('back-to-menu-btn');
    if (backToMenuBtn) {
        backToMenuBtn.addEventListener('click', function() {
            hideGangCards();
        });
    }
    
    // Delete confirmation modal handlers
    const deleteConfirmModal = document.getElementById('delete-confirm-modal');
    const deleteConfirmClose = document.getElementById('delete-confirm-close');
    const deleteConfirmCancel = document.getElementById('delete-confirm-cancel');
    const deleteConfirmDelete = document.getElementById('delete-confirm-delete');
    
    if (deleteConfirmClose) {
        deleteConfirmClose.addEventListener('click', () => {
            closeModal('delete-confirm-modal');
            pendingDeleteGangId = null;
        });
    }
    if (deleteConfirmCancel) {
        deleteConfirmCancel.addEventListener('click', () => {
            closeModal('delete-confirm-modal');
            pendingDeleteGangId = null;
        });
    }
    if (deleteConfirmDelete) {
        deleteConfirmDelete.addEventListener('click', function() {
            if (!pendingDeleteGangId) {
                showNotification('No gang selected for deletion', 'error');
                return;
            }
            
            // Add loading state
            this.classList.add('loading');
            this.disabled = true;
            
            fetch(`https://${GetParentResourceName()}/deleteGang`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    gangId: pendingDeleteGangId
                })
            })
            .then(response => response.json())
            .then(result => {
                if (result.success) {
                    showNotification(result.message || 'Gang deleted successfully', 'success');
                    closeModal('delete-confirm-modal');
                    pendingDeleteGangId = null;
                    
                    // Reload cards and flip back any flipped cards
                    document.querySelectorAll('.gang-card').forEach(card => {
                        card.classList.remove('flipped');
                    });
                    loadGangCards();
                } else {
                    showNotification(result.message || 'Failed to delete gang', 'error');
                }
            })
            .catch(error => {
                console.error('Error deleting gang:', error);
                showNotification('Failed to delete gang', 'error');
            })
            .finally(() => {
                this.classList.remove('loading');
                this.disabled = false;
            });
        });
    }
    
    // ESC key handler
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape' && isMenuOpen) {
            const colorPickerPanel = document.getElementById('color-picker-panel');
            if (colorPickerPanel && !colorPickerPanel.classList.contains('hidden')) {
                colorPickerPanel.classList.add('hidden');
            } else if (activeDropdowns.length > 0) {
                closeAllDropdowns();
            } else if (!document.getElementById('delete-confirm-modal').classList.contains('hidden')) {
                closeModal('delete-confirm-modal');
                pendingDeleteGangId = null;
            } else if (!document.getElementById('create-gang-modal').classList.contains('hidden')) {
                closeModal('create-gang-modal');
            } else if (!document.getElementById('gang-cards-container').classList.contains('hidden')) {
                hideGangCards();
            } else {
                closeMenu();
                fetch(`https://${GetParentResourceName()}/closeMenu`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({})
                });
            }
        }
    });
});

