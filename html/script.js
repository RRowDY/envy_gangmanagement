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
        case 'receiveInvite':
            handleReceiveInvite(data.data);
            break;
        case 'showNotification':
            if (data.data && data.data.message) {
                showNotification(data.data.message, data.data.type || 'info');
            }
            break;
    }
});

// Open menu function
function openMenu(data) {
    if (isMenuOpen) return;
    
    // Reset menu to initial state when opening
    resetMenuState();
    
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
    
    // Show/hide gang options section (show for all gang members)
    const gangLeaderSection = document.getElementById('gang-leader-section');
    if (gangLeaderSection) {
        if (data && data.inGang) {
            gangLeaderSection.classList.remove('hidden');
            
            const permissions = data.permissions || {};
            const isLeader = data.isGangLeader || false;
            
            // Show/hide Invite Player button based on permission
            const invitePlayerBtn = document.getElementById('invite-player-btn');
            if (invitePlayerBtn) {
                if (isLeader || permissions.invite_player) {
                    invitePlayerBtn.classList.remove('hidden');
                    invitePlayerBtn.disabled = false;
                    invitePlayerBtn.removeAttribute('title');
                } else {
                    invitePlayerBtn.classList.add('hidden');
                }
            }
            
            // Show/hide Edit Ranks button based on permission
            const editRanksBtn = document.getElementById('edit-ranks-btn');
            if (editRanksBtn) {
                if (isLeader || permissions.edit_ranks) {
                    editRanksBtn.classList.remove('hidden');
                    editRanksBtn.disabled = false;
                    editRanksBtn.removeAttribute('title');
                } else {
                    editRanksBtn.classList.add('hidden');
                }
            }
            
            // Hide section if no buttons are visible
            const hasVisibleButtons = 
                (invitePlayerBtn && !invitePlayerBtn.classList.contains('hidden')) ||
                (editRanksBtn && !editRanksBtn.classList.contains('hidden'));
            
            if (!hasVisibleButtons) {
                gangLeaderSection.classList.add('hidden');
            }
        } else {
            gangLeaderSection.classList.add('hidden');
        }
    }
    
    
    // Show/hide gang member section (show for all gang members, including leaders)
    const gangMemberSection = document.getElementById('gang-member-section');
    const gangMemberSectionDivider = document.getElementById('gang-member-section-divider');
    if (gangMemberSection && gangMemberSectionDivider) {
        if (data && data.inGang) {
            gangMemberSection.classList.remove('hidden');
            gangMemberSectionDivider.classList.remove('hidden');
        } else {
            gangMemberSection.classList.add('hidden');
            gangMemberSectionDivider.classList.add('hidden');
        }
    }
    
    // Show/hide empty state
    const emptyState = document.getElementById('empty-state');
    if (emptyState) {
        const hasContent = (data && data.isStaff) || (data && data.isGangLeader) || (data && data.inGang);
        if (hasContent) {
            emptyState.classList.add('hidden');
        } else {
            emptyState.classList.remove('hidden');
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

// Reset menu to initial state
function resetMenuState() {
    // Show main menu buttons
    const menuButtons = document.getElementById('menu-buttons');
    if (menuButtons) menuButtons.classList.remove('hidden');
    
    // Hide all sub-views
    const rosterContainer = document.getElementById('roster-container');
    if (rosterContainer) rosterContainer.classList.add('hidden');
    
    const ranksContainer = document.getElementById('ranks-container');
    if (ranksContainer) ranksContainer.classList.add('hidden');
    
    const gangCardsContainer = document.getElementById('gang-cards-container');
    if (gangCardsContainer) gangCardsContainer.classList.add('hidden');
    
    const editGangCardsContainer = document.getElementById('edit-gang-cards-container');
    if (editGangCardsContainer) editGangCardsContainer.classList.add('hidden');
    
    // Clear all search inputs
    const deleteGangSearch = document.getElementById('delete-gang-search');
    if (deleteGangSearch) deleteGangSearch.value = '';
    
    const editGangSearch = document.getElementById('edit-gang-search');
    if (editGangSearch) editGangSearch.value = '';
    
    // Reset all cards to front (not flipped)
    document.querySelectorAll('.gang-card').forEach(card => {
        card.classList.remove('flipped');
    });
    
    // Close all modals
    closeAllModals();
    
    // Close all dropdowns
    closeAllDropdowns();
}

// Close menu function
function closeMenu() {
    if (!isMenuOpen) return;
    
    const container = document.getElementById('gang-menu-container');
    if (container) {
        container.classList.add('hidden');
        
        setTimeout(() => {
            container.style.display = 'none';
            // Reset menu to initial state when closing
            resetMenuState();
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
    closeModal('edit-gang-modal');
    closeModal('edit-permissions-modal');
    closeModal('edit-player-modal');
    closeModal('edit-rank-permissions-warning-modal');
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
    const deleteGangSearch = document.getElementById('delete-gang-search');
    
    if (menuButtons) menuButtons.classList.remove('hidden');
    if (cardsContainer) cardsContainer.classList.add('hidden');
    if (deleteGangSearch) deleteGangSearch.value = '';
    
    // Reset all cards to front
    document.querySelectorAll('#gang-cards-grid .gang-card').forEach(card => {
        card.classList.remove('flipped');
    });
}

// Load and render gang cards
let allDeleteGangs = [];
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
        allDeleteGangs = gangs || [];
        renderGangCards(allDeleteGangs);
    })
    .catch(error => {
        console.error('Error loading gangs:', error);
        showNotification('Failed to load gangs', 'error');
        cardsGrid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: #ef4444; padding: 40px;">Error loading gangs</div>';
    });
}

// Render delete gang cards with filtering
function renderGangCards(gangs) {
    const cardsGrid = document.getElementById('gang-cards-grid');
    if (!cardsGrid) return;
    
    cardsGrid.innerHTML = '';
    
    if (!gangs || gangs.length === 0) {
        cardsGrid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: var(--text-secondary); padding: 40px;">No gangs found</div>';
        return;
    }
    
    gangs.forEach(gang => {
        const card = createGangCard(gang);
        cardsGrid.appendChild(card);
    });
}

// Create a gang card element
function createGangCard(gang) {
    const card = document.createElement('div');
    card.className = 'gang-card';
    card.dataset.gangId = gang.id;
    
    // Get color with # for display
    const displayColor = '#' + (gang.color || 'ffffff');
    
    // Create gradient background (from normal background to gang color)
    const gradientStyle = `linear-gradient(135deg, rgba(30, 41, 59, 0.8) 0%, ${displayColor}40 100%)`;
    
    card.innerHTML = `
        <div class="gang-card-inner">
            <div class="gang-card-front" style="background: ${gradientStyle};">
                <svg class="gang-card-icon" width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
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

// Show edit gang cards view
function showEditGangCards() {
    const menuButtons = document.getElementById('menu-buttons');
    const editCardsContainer = document.getElementById('edit-gang-cards-container');
    
    if (menuButtons) menuButtons.classList.add('hidden');
    if (editCardsContainer) {
        editCardsContainer.classList.remove('hidden');
        loadEditGangCards();
    }
}

// Hide edit gang cards view
function hideEditGangCards() {
    const menuButtons = document.getElementById('menu-buttons');
    const editCardsContainer = document.getElementById('edit-gang-cards-container');
    const editGangSearch = document.getElementById('edit-gang-search');
    
    if (menuButtons) menuButtons.classList.remove('hidden');
    if (editCardsContainer) editCardsContainer.classList.add('hidden');
    if (editGangSearch) editGangSearch.value = '';
    
    // Reset all cards to front
    document.querySelectorAll('#edit-gang-cards-grid .gang-card').forEach(card => {
        card.classList.remove('flipped');
    });
}

// Load and render edit gang cards
let allEditGangs = [];
function loadEditGangCards() {
    const cardsGrid = document.getElementById('edit-gang-cards-grid');
    if (!cardsGrid) return;
    
    cardsGrid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: var(--text-secondary); padding: 40px;">Loading gangs...</div>';
    
    fetch(`https://${GetParentResourceName()}/getAllGangs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
    })
    .then(response => response.json())
    .then(gangs => {
        allEditGangs = gangs || [];
        renderEditGangCards(allEditGangs);
    })
    .catch(error => {
        console.error('Error loading gangs:', error);
        showNotification('Failed to load gangs', 'error');
        cardsGrid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: #ef4444; padding: 40px;">Error loading gangs</div>';
    });
}

// Render edit gang cards with filtering
function renderEditGangCards(gangs) {
    const cardsGrid = document.getElementById('edit-gang-cards-grid');
    if (!cardsGrid) return;
    
    cardsGrid.innerHTML = '';
    
    if (!gangs || gangs.length === 0) {
        cardsGrid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: var(--text-secondary); padding: 40px;">No gangs found</div>';
        return;
    }
    
    gangs.forEach(gang => {
        const card = createEditGangCard(gang);
        cardsGrid.appendChild(card);
    });
}

// Create an edit gang card element
function createEditGangCard(gang) {
    const card = document.createElement('div');
    card.className = 'gang-card';
    card.dataset.gangId = gang.id;
    
    // Get color with # for display
    const displayColor = '#' + (gang.color || 'ffffff');
    
    // Create gradient background (from normal background to gang color)
    // Using rgba values for the background color to blend properly
    const gradientStyle = `linear-gradient(135deg, rgba(30, 41, 59, 0.8) 0%, ${displayColor}40 100%)`;
    
    card.innerHTML = `
        <div class="gang-card-inner">
            <div class="gang-card-front edit-gang-card" style="background: ${gradientStyle};">
                <svg class="gang-card-icon" width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M17 21V19C17 17.9391 16.5786 16.9217 15.8284 16.1716C15.0783 15.4214 14.0609 15 13 15H5C3.93913 15 2.92172 15.4214 2.17157 16.1716C1.42143 16.9217 1 17.9391 1 19V21M23 21V19C22.9993 18.1137 22.7044 17.2528 22.1614 16.5523C21.6184 15.8519 20.8581 15.3516 20 15.13M16 3.13C16.8604 3.35031 17.623 3.85071 18.1676 4.55232C18.7122 5.25392 19.0078 6.11683 19.0078 7.005C19.0078 7.89318 18.7122 8.75608 18.1676 9.45769C17.623 10.1593 16.8604 10.6597 16 10.88M13 7C13 9.20914 11.2091 11 9 11C6.79086 11 5 9.20914 5 7C5 4.79086 6.79086 3 9 3C11.2091 3 13 4.79086 13 7Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                <div class="gang-card-name">${escapeHtml(gang.name)}</div>
                <div class="gang-card-label">Gang Leader</div>
                <div class="gang-card-owner">${escapeHtml(gang.ownerName)}</div>
                <div class="gang-card-label" style="margin-top: 8px;">Color</div>
                <div class="gang-card-owner" style="font-family: monospace; letter-spacing: 1px;">${displayColor.toUpperCase()}</div>
            </div>
            <div class="gang-card-back edit-gang-card-back">
                <div class="gang-card-back-content">
                    <svg class="gang-card-back-icon" width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M11 4H4C3.46957 4 2.96086 4.21071 2.58579 4.58579C2.21071 4.96086 2 5.46957 2 6V20C2 20.5304 2.21071 21.0391 2.58579 21.4142C2.96086 21.7893 3.46957 22 4 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V13" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M18.5 2.5C18.8978 2.10218 19.4374 1.87868 20 1.87868C20.5626 1.87868 21.1022 2.10218 21.5 2.5C21.8978 2.89782 22.1213 3.43739 22.1213 4C22.1213 4.56261 21.8978 5.10218 21.5 5.5L12 15L8 16L9 12L18.5 2.5Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    <div class="gang-card-back-message">Edit this gang?</div>
                    <div class="gang-card-back-hint">Click the button below to edit</div>
                    <button class="gang-card-delete-btn" data-gang-id="${gang.id}">Edit Gang</button>
                </div>
            </div>
        </div>
    `;
    
    // Handle card click to flip
    card.addEventListener('click', function(e) {
        // Don't flip if clicking the edit button
        if (e.target.closest('button')) {
            return;
        }
        this.classList.toggle('flipped');
    });
    
    // Handle edit button click
    const editBtn = card.querySelector('button');
    if (editBtn) {
        editBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            const gangId = parseInt(this.dataset.gangId);
            if (gangId) {
                openEditGangModal(gangId);
            }
        });
    }
    
    return card;
}

// Open edit gang modal
let currentEditGangId = null;
function openEditGangModal(gangId) {
    const gang = allEditGangs.find(g => g.id === gangId);
    if (!gang) {
        showNotification('Gang not found', 'error');
        return;
    }
    
    currentEditGangId = gangId;
    
    // Set form values
    const nameInput = document.getElementById('edit-gang-name');
    const colorInput = document.getElementById('edit-gang-color');
    const colorPreview = document.getElementById('edit-color-preview');
    
    if (nameInput) nameInput.value = gang.name;
    if (colorInput) {
        const displayColor = '#' + (gang.color || 'ffffff');
        colorInput.value = displayColor.toUpperCase();
    }
    if (colorPreview) {
        const displayColor = '#' + (gang.color || 'ffffff');
        colorPreview.style.backgroundColor = displayColor;
    }
    
    // Load players for dropdown and set current owner
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
            
            // Find current owner in list
            const currentOwner = playerOptions.find(p => p.value === gang.owner);
            const defaultValue = currentOwner ? currentOwner.value : '';
            const defaultText = currentOwner ? currentOwner.text : '';
            
            createSearchableDropdown('edit-gang-owner-dropdown', playerOptions, defaultValue, 'Type to search...');
            if (defaultText) {
                const searchInput = document.getElementById('edit-gang-owner-search');
                if (searchInput) searchInput.value = defaultText;
            }
        }
    })
    .catch(error => {
        console.error('Error loading players:', error);
        showNotification('Failed to load players', 'error');
    });
    
    openModal('edit-gang-modal');
    
    // Initialize color picker after modal is open (functions will be available)
    setTimeout(() => {
        const editColorInputEl = document.getElementById('edit-gang-color');
        if (editColorInputEl && window.updateEditHSLFromHex) {
            window.updateEditHSLFromHex(editColorInputEl.value || '#ffffff');
        }
    }, 100);
}

// Initialize edit color picker (separate instance from create)
function initEditColorPicker() {
    // This will be set up in DOMContentLoaded with separate element IDs
    // The color picker functionality is already defined, we just need to use different IDs
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
    
    // Edit Gang button
    const editGangBtn = document.getElementById('edit-gang-btn');
    if (editGangBtn) {
        editGangBtn.addEventListener('click', function() {
            showEditGangCards();
        });
    }
    
    // Edit Gang back button
    const editGangBackBtn = document.getElementById('edit-gang-back-btn');
    if (editGangBackBtn) {
        editGangBackBtn.addEventListener('click', function() {
            hideEditGangCards();
        });
    }
    
    // Edit Gang search functionality
    const editGangSearch = document.getElementById('edit-gang-search');
    if (editGangSearch) {
        editGangSearch.addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase().trim();
            if (searchTerm === '') {
                renderEditGangCards(allEditGangs);
            } else {
                const filtered = allEditGangs.filter(gang => {
                    return gang.name.toLowerCase().includes(searchTerm) ||
                           gang.ownerName.toLowerCase().includes(searchTerm) ||
                           ('#' + gang.color).toLowerCase().includes(searchTerm);
                });
                renderEditGangCards(filtered);
            }
        });
    }
    
    // Delete Gang search functionality
    const deleteGangSearch = document.getElementById('delete-gang-search');
    if (deleteGangSearch) {
        deleteGangSearch.addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase().trim();
            if (searchTerm === '') {
                renderGangCards(allDeleteGangs);
            } else {
                const filtered = allDeleteGangs.filter(gang => {
                    return gang.name.toLowerCase().includes(searchTerm) ||
                           gang.ownerName.toLowerCase().includes(searchTerm) ||
                           ('#' + gang.color).toLowerCase().includes(searchTerm);
                });
                renderGangCards(filtered);
            }
        });
    }
    
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
                    
                    // Clear search and reload cards
                    const deleteGangSearch = document.getElementById('delete-gang-search');
                    if (deleteGangSearch) deleteGangSearch.value = '';
                    
                    // Reload cards and flip back any flipped cards
                    document.querySelectorAll('#gang-cards-grid .gang-card').forEach(card => {
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
    
    // Edit Gang modal handlers
    const editGangModal = document.getElementById('edit-gang-modal');
    const editGangClose = document.getElementById('edit-gang-close');
    const editGangCancel = document.getElementById('edit-gang-cancel');
    const editGangConfirm = document.getElementById('edit-gang-confirm');
    
    if (editGangClose) {
        editGangClose.addEventListener('click', () => {
            closeModal('edit-gang-modal');
            currentEditGangId = null;
        });
    }
    if (editGangCancel) {
        editGangCancel.addEventListener('click', () => {
            closeModal('edit-gang-modal');
            currentEditGangId = null;
        });
    }
    if (editGangConfirm) {
        editGangConfirm.addEventListener('click', function() {
            if (!currentEditGangId) {
                showNotification('No gang selected for editing', 'error');
                return;
            }
            
            const gangName = document.getElementById('edit-gang-name').value.trim();
            const ownerCitizenid = document.getElementById('edit-gang-owner-id').value;
            const editGangColorInput = document.getElementById('edit-gang-color');
            let gangColor = editGangColorInput ? editGangColorInput.value.trim() : '#ffffff';
            
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
            
            fetch(`https://${GetParentResourceName()}/updateGang`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    gangId: currentEditGangId,
                    gangName: gangName,
                    ownerCitizenid: ownerCitizenid,
                    gangColor: gangColor
                })
            })
            .then(response => response.json())
            .then(result => {
                if (result.success) {
                    showNotification(result.message || 'Gang updated successfully', 'success');
                    closeModal('edit-gang-modal');
                    currentEditGangId = null;
                    
                    // Reload edit gang cards to show updated data
                    loadEditGangCards();
                } else {
                    showNotification(result.message || 'Failed to update gang', 'error');
                }
            })
            .catch(error => {
                console.error('Error updating gang:', error);
                showNotification('Failed to update gang', 'error');
            })
            .finally(() => {
                this.classList.remove('loading');
                this.disabled = false;
            });
        });
    }
    
    // Edit Gang Color Picker (separate instance)
    const editColorInput = document.getElementById('edit-gang-color');
    const editColorPreview = document.getElementById('edit-color-preview');
    const editColorPickerPanel = document.getElementById('edit-color-picker-panel');
    const editColorSpectrum = document.getElementById('edit-color-spectrum');
    const editColorHue = document.getElementById('edit-color-hue');
    const editColorCursor = document.getElementById('edit-color-cursor');
    const editHueSlider = document.getElementById('edit-hue-slider');
    const editColorPreviewLarge = document.getElementById('edit-color-preview-large');
    
    // Initialize edit color picker variables (separate from create)
    let editCurrentHue = 0;
    let editCurrentSaturation = 1;
    let editCurrentBrightness = 1;
    let editIsDraggingSpectrum = false;
    let editIsDraggingHue = false;
    let editSpectrumUpdateFrame = null;
    let editLastHue = -1;
    
    // Initialize edit color picker canvases
    function initEditColorPickerCanvases() {
        if (!editColorSpectrum || !editColorHue) return;
        
        const hueCtx = editColorHue.getContext('2d');
        const hueGradient = hueCtx.createLinearGradient(0, 0, 0, 200);
        for (let i = 0; i <= 360; i += 30) {
            hueGradient.addColorStop(i / 360, `hsl(${i}, 100%, 50%)`);
        }
        hueCtx.fillStyle = hueGradient;
        hueCtx.fillRect(0, 0, 20, 200);
    }
    
    // Update edit color spectrum
    function updateEditColorSpectrum(force = false) {
        if (!editColorSpectrum) return;
        
        if (!force && Math.abs(editCurrentHue - editLastHue) < 0.1) {
            return;
        }
        
        editLastHue = editCurrentHue;
        
        if (editSpectrumUpdateFrame) {
            cancelAnimationFrame(editSpectrumUpdateFrame);
            editSpectrumUpdateFrame = null;
        }
        
        editSpectrumUpdateFrame = requestAnimationFrame(() => {
            const ctx = editColorSpectrum.getContext('2d');
            const width = editColorSpectrum.width;
            const height = editColorSpectrum.height;
            const imageData = ctx.createImageData(width, height);
            const data = imageData.data;
            
            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    const s = x / width;
                    const l = 1 - (y / height);
                    const [r, g, b] = hslToRgb(editCurrentHue, s, l);
                    
                    const index = (y * width + x) * 4;
                    data[index] = r;
                    data[index + 1] = g;
                    data[index + 2] = b;
                    data[index + 3] = 255;
                }
            }
            
            ctx.putImageData(imageData, 0, 0);
            
            const x = editCurrentSaturation * editColorSpectrum.width;
            const y = (1 - editCurrentBrightness) * editColorSpectrum.height;
            if (editColorCursor) {
                editColorCursor.style.left = x + 'px';
                editColorCursor.style.top = y + 'px';
            }
            
            editSpectrumUpdateFrame = null;
        });
    }
    
    // Update edit color from HSL
    function updateEditColorFromHSL() {
        const hex = hslToHex(editCurrentHue, editCurrentSaturation, editCurrentBrightness);
        const normalized = hex.toUpperCase();
        
        if (editColorInput) editColorInput.value = normalized;
        if (editColorPreview) editColorPreview.style.backgroundColor = normalized;
        if (editColorPreviewLarge) editColorPreviewLarge.style.backgroundColor = normalized;
    }
    
    // Update edit HSL from HEX (make it accessible globally)
    function updateEditHSLFromHex(hex) {
        const validation = validateHexColor(hex);
        if (!validation.valid) return;
        
        const [h, s, l] = hexToHsl(validation.normalized);
        editCurrentHue = h;
        editCurrentSaturation = s;
        editCurrentBrightness = l;
        
        updateEditColorSpectrum();
        if (editHueSlider) {
            const y = (editCurrentHue / 360) * editColorHue.height;
            editHueSlider.style.top = y + 'px';
        }
        updateEditColorFromHSL();
    }
    
    // Make it accessible globally for openEditGangModal
    window.updateEditHSLFromHex = updateEditHSLFromHex;
    
    // Setup edit color picker interactions
    if (editColorPreview && editColorPickerPanel) {
        editColorPreview.addEventListener('click', function(e) {
            e.stopPropagation();
            if (editColorPickerPanel.classList.contains('hidden')) {
                editColorPickerPanel.classList.remove('hidden');
                initEditColorPickerCanvases();
                if (editColorInput) {
                    updateEditHSLFromHex(editColorInput.value || '#ffffff');
                }
            } else {
                editColorPickerPanel.classList.add('hidden');
            }
        });
        
        document.addEventListener('click', function(e) {
            if (editColorPickerPanel && !editColorPickerPanel.contains(e.target) && e.target !== editColorPreview) {
                editColorPickerPanel.classList.add('hidden');
            }
        });
    }
    
    // Edit spectrum interaction
    if (editColorSpectrum) {
        editColorSpectrum.addEventListener('mousedown', function(e) {
            editIsDraggingSpectrum = true;
            const rect = editColorSpectrum.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            editCurrentSaturation = Math.max(0, Math.min(1, x / editColorSpectrum.width));
            editCurrentBrightness = Math.max(0, Math.min(1, 1 - (y / editColorSpectrum.height)));
            
            updateEditColorFromHSL();
        });
        
        document.addEventListener('mousemove', function(e) {
            if (editIsDraggingSpectrum && editColorSpectrum) {
                const rect = editColorSpectrum.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                
                editCurrentSaturation = Math.max(0, Math.min(1, x / editColorSpectrum.width));
                editCurrentBrightness = Math.max(0, Math.min(1, 1 - (y / editColorSpectrum.height)));
                
                updateEditColorFromHSL();
            }
        });
        
        document.addEventListener('mouseup', function() {
            editIsDraggingSpectrum = false;
        });
    }
    
    // Edit hue slider interaction
    if (editColorHue) {
        editColorHue.addEventListener('mousedown', function(e) {
            editIsDraggingHue = true;
            const rect = editColorHue.getBoundingClientRect();
            const y = e.clientY - rect.top;
            
            editCurrentHue = Math.max(0, Math.min(360, (y / editColorHue.height) * 360));
            
            if (editHueSlider) {
                editHueSlider.style.top = (editCurrentHue / 360) * editColorHue.height + 'px';
            }
            updateEditColorFromHSL();
            updateEditColorSpectrum();
        });
        
        document.addEventListener('mousemove', function(e) {
            if (editIsDraggingHue && editColorHue) {
                const rect = editColorHue.getBoundingClientRect();
                const y = e.clientY - rect.top;
                
                editCurrentHue = Math.max(0, Math.min(360, (y / editColorHue.height) * 360));
                
                if (editHueSlider) {
                    editHueSlider.style.top = (editCurrentHue / 360) * editColorHue.height + 'px';
                }
                updateEditColorFromHSL();
                updateEditColorSpectrum();
            }
        });
        
        document.addEventListener('mouseup', function() {
            editIsDraggingHue = false;
            updateEditColorSpectrum(true);
        });
    }
    
    // Sync edit text input to color picker
    if (editColorInput && editColorPreview) {
        editColorInput.addEventListener('input', function() {
            let value = this.value;
            
            if (value.length > 7) {
                value = value.substring(0, 7);
                this.value = value;
            }
            
            if (value.length === 6 && !value.startsWith('#')) {
                value = '#' + value;
                this.value = value;
            }
            
            const validation = validateHexColor(value);
            if (validation.valid && validation.normalized) {
                updateEditHSLFromHex(validation.normalized);
            }
        });
        
        editColorInput.addEventListener('blur', function() {
            const validation = validateHexColor(this.value);
            if (!validation.valid) {
                showNotification('Invalid HEX color code. Using default white.', 'warning');
                const defaultColor = '#ffffff';
                this.value = defaultColor;
                updateEditHSLFromHex(defaultColor);
            } else {
                const normalized = validation.normalized;
                this.value = normalized;
                updateEditHSLFromHex(normalized);
            }
        });
    }
    
    // ESC key handler
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape' && isMenuOpen) {
            const colorPickerPanel = document.getElementById('color-picker-panel');
            const editColorPickerPanel = document.getElementById('edit-color-picker-panel');
            if (colorPickerPanel && !colorPickerPanel.classList.contains('hidden')) {
                colorPickerPanel.classList.add('hidden');
            } else if (editColorPickerPanel && !editColorPickerPanel.classList.contains('hidden')) {
                editColorPickerPanel.classList.add('hidden');
            } else if (activeDropdowns.length > 0) {
                closeAllDropdowns();
            } else if (!document.getElementById('delete-confirm-modal').classList.contains('hidden')) {
                closeModal('delete-confirm-modal');
                pendingDeleteGangId = null;
            } else if (!document.getElementById('edit-gang-modal').classList.contains('hidden')) {
                closeModal('edit-gang-modal');
                currentEditGangId = null;
            } else if (!document.getElementById('create-gang-modal').classList.contains('hidden')) {
                closeModal('create-gang-modal');
            } else if (!document.getElementById('invite-player-modal').classList.contains('hidden')) {
                closeModal('invite-player-modal');
            } else if (!document.getElementById('leave-gang-modal').classList.contains('hidden')) {
                closeModal('leave-gang-modal');
            } else if (!document.getElementById('kick-player-modal').classList.contains('hidden')) {
                closeModal('kick-player-modal');
            } else if (!document.getElementById('delete-rank-modal').classList.contains('hidden')) {
                closeModal('delete-rank-modal');
                pendingDeleteRankName = null;
            } else if (!document.getElementById('roster-container').classList.contains('hidden')) {
                hideRoster();
            } else if (!document.getElementById('ranks-container').classList.contains('hidden')) {
                hideRanksEditor();
            } else if (!document.getElementById('invite-received-notification').classList.contains('hidden')) {
                hideInviteNotification();
            } else if (!document.getElementById('edit-gang-cards-container').classList.contains('hidden')) {
                hideEditGangCards();
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
    
    // Invite Player button
    const invitePlayerBtn = document.getElementById('invite-player-btn');
    if (invitePlayerBtn) {
        invitePlayerBtn.addEventListener('click', function() {
            openInvitePlayerModal();
        });
    }
    
    // Invite Player modal handlers
    const invitePlayerModal = document.getElementById('invite-player-modal');
    const invitePlayerClose = document.getElementById('invite-player-close');
    const invitePlayerCancel = document.getElementById('invite-player-cancel');
    const invitePlayerConfirm = document.getElementById('invite-player-confirm');
    
    if (invitePlayerClose) {
        invitePlayerClose.addEventListener('click', () => closeModal('invite-player-modal'));
    }
    if (invitePlayerCancel) {
        invitePlayerCancel.addEventListener('click', () => closeModal('invite-player-modal'));
    }
    if (invitePlayerConfirm) {
        invitePlayerConfirm.addEventListener('click', function() {
            const targetCitizenid = document.getElementById('invite-player-id').value;
            
            if (!targetCitizenid) {
                showNotification('Please select a player to invite', 'error');
                return;
            }
            
            // Add loading state
            this.classList.add('loading');
            this.disabled = true;
            
            fetch(`https://${GetParentResourceName()}/invitePlayer`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ targetCitizenid: targetCitizenid })
            })
            .then(response => response.json())
            .then(result => {
                if (result.success) {
                    showNotification(result.message || 'Invite sent successfully', 'success');
                    closeModal('invite-player-modal');
                    // Reset dropdown
                    const dropdown = document.getElementById('invite-player-dropdown');
                    if (dropdown) {
                        const searchInput = document.getElementById('invite-player-search');
                        const hiddenInput = document.getElementById('invite-player-id');
                        if (searchInput) searchInput.value = '';
                        if (hiddenInput) hiddenInput.value = '';
                    }
                } else {
                    showNotification(result.message || 'Failed to send invite', 'error');
                }
            })
            .catch(error => {
                console.error('Error inviting player:', error);
                showNotification('Failed to send invite', 'error');
            })
            .finally(() => {
                this.classList.remove('loading');
                this.disabled = false;
            });
        });
    }
    
    // Invite Received notification handlers
    let currentInviteId = null;
    let inviteCountdownInterval = null;
    let inviteCountdownSeconds = 30;
    
    // Function to hide invite notification with slide-out animation
    function hideInviteNotification() {
        const notification = document.getElementById('invite-received-notification');
        if (notification) {
            // Remove show class to trigger slide-out animation
            notification.classList.remove('show');
            // Wait for animation to complete before hiding
            setTimeout(() => {
                notification.classList.add('hidden');
            }, 400); // Match CSS transition duration
        }
        if (inviteCountdownInterval) {
            clearInterval(inviteCountdownInterval);
            inviteCountdownInterval = null;
        }
        inviteCountdownSeconds = 30;
        currentInviteId = null;
        
        // Notify client that notification is closed
        fetch(`https://${GetParentResourceName()}/inviteNotificationClosed`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({})
        }).catch(err => console.error('Error notifying client:', err));
    }
    
    // Function to accept invite
    function acceptInvite() {
        if (!currentInviteId) return;
        
        const inviteId = currentInviteId;
        hideInviteNotification();
        
        fetch(`https://${GetParentResourceName()}/acceptInvite`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ inviteId: inviteId })
        })
        .then(response => response.json())
        .then(result => {
            if (result.success) {
                showNotification(result.message || 'You joined the gang!', 'success');
            } else {
                showNotification(result.message || 'Failed to accept invite', 'error');
            }
        })
        .catch(error => {
            console.error('Error accepting invite:', error);
            showNotification('Failed to accept invite', 'error');
        });
    }
    
    // Function to deny invite
    function denyInvite() {
        if (!currentInviteId) return;
        
        const inviteId = currentInviteId;
        hideInviteNotification();
        
        fetch(`https://${GetParentResourceName()}/denyInvite`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ inviteId: inviteId })
        })
        .then(response => response.json())
        .then(result => {
            if (result.success) {
                showNotification(result.message || 'Invite declined', 'info');
            } else {
                showNotification(result.message || 'Failed to decline invite', 'error');
            }
        })
        .catch(error => {
            console.error('Error denying invite:', error);
            showNotification('Failed to deny invite', 'error');
        });
    }
    
    // Handle key presses from client.lua (FiveM NUI keyboard handling)
    window.addEventListener('message', function(event) {
        if (event.data.action === 'inviteKeyPress') {
            const notification = document.getElementById('invite-received-notification');
            if (!notification || notification.classList.contains('hidden')) return;
            
            if (event.data.key === 'accept') {
                console.log('[envy_gangscript] G key pressed - accepting invite');
                acceptInvite();
            } else if (event.data.key === 'deny') {
                console.log('[envy_gangscript] J key pressed - denying invite');
                denyInvite();
            }
        }
    });
    
    // Function to open invite player modal
    window.openInvitePlayerModal = function() {
        const modal = document.getElementById('invite-player-modal');
        if (!modal) return;
        
        // Reset dropdown
        const searchInput = document.getElementById('invite-player-search');
        const hiddenInput = document.getElementById('invite-player-id');
        const optionsContainer = document.getElementById('invite-player-options');
        if (searchInput) searchInput.value = '';
        if (hiddenInput) hiddenInput.value = '';
        if (optionsContainer) optionsContainer.innerHTML = '';
        
        // Load online players
        fetch(`https://${GetParentResourceName()}/getOnlinePlayersForInvite`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({})
        })
        .then(response => response.json())
        .then(players => {
            console.log('[envy_gangscript] Received players for invite:', players);
            if (!players || players.length === 0) {
                showNotification('No players available to invite', 'warning');
                return;
            }
            
            // Format players for dropdown (needs value, text, and searchText)
            const playerOptions = players.map(player => ({
                value: player.citizenid,
                text: player.name,
                searchText: (player.name || '').toLowerCase() + ' ' + (player.citizenid || '').toLowerCase(),
                citizenid: player.citizenid,
                name: player.name
            }));
            
            console.log('[envy_gangscript] Formatted player options:', playerOptions);
            
            // Create dropdown options
            const dropdown = createSearchableDropdown('invite-player-dropdown', playerOptions, '', 'Select a player...');
            if (dropdown) {
                dropdown.onSelect = function(option) {
                    document.getElementById('invite-player-id').value = option.citizenid || option.value;
                };
            } else {
                console.error('[envy_gangscript] Failed to create dropdown');
            }
            
            openModal('invite-player-modal');
        })
        .catch(error => {
            console.error('Error loading players:', error);
            showNotification('Failed to load players', 'error');
        });
    };
    
    // Function to handle receiving an invite
    window.handleReceiveInvite = function(inviteData) {
        console.log('[envy_gangscript] handleReceiveInvite called with:', inviteData);
        if (!inviteData || !inviteData.inviteId) {
            console.log('[envy_gangscript] Invalid invite data');
            return;
        }
        
        // Clear any existing invite
        if (inviteCountdownInterval) {
            clearInterval(inviteCountdownInterval);
        }
        
        currentInviteId = inviteData.inviteId;
        inviteCountdownSeconds = 30;
        
        // Update notification content
        const messageEl = document.getElementById('invite-message-text');
        const countdownEl = document.getElementById('invite-countdown');
        
        console.log('[envy_gangscript] Updating notification elements:', {
            messageEl: !!messageEl,
            countdownEl: !!countdownEl
        });
        
        const gangName = inviteData.gangName || 'Unknown';
        if (messageEl) {
            messageEl.innerHTML = `You were invited to join <strong>${gangName}</strong>`;
        }
        if (countdownEl) countdownEl.textContent = inviteCountdownSeconds;
        
        // Show notification (slide in from right)
        const notification = document.getElementById('invite-received-notification');
        console.log('[envy_gangscript] Notification element:', notification);
        if (notification) {
            console.log('[envy_gangscript] Showing notification with slide-in animation');
            // Remove any inline styles that might interfere
            notification.style.right = '';
            // Remove show class if it exists (to reset state)
            notification.classList.remove('show');
            // Remove hidden class to make element visible
            notification.classList.remove('hidden');
            
            // Force a reflow to ensure the browser processes the initial state (right: -200px from CSS)
            void notification.offsetHeight;
            
            // Add show class in next frame to trigger slide-in animation
            setTimeout(() => {
                notification.classList.add('show');
                console.log('[envy_gangscript] Added show class, notification should slide in');
            }, 10);
        } else {
            console.error('[envy_gangscript] Notification element not found!');
        }
        
        // Start countdown timer
        inviteCountdownInterval = setInterval(function() {
            inviteCountdownSeconds--;
            if (countdownEl) {
                countdownEl.textContent = inviteCountdownSeconds;
            }
            
            if (inviteCountdownSeconds <= 0) {
                // Auto-decline after 30 seconds
                clearInterval(inviteCountdownInterval);
                inviteCountdownInterval = null;
                denyInvite();
            }
        }, 1000);
    };
    
    // View Roster button
    const viewRosterBtn = document.getElementById('view-roster-btn');
    if (viewRosterBtn) {
        viewRosterBtn.addEventListener('click', function() {
            showRoster();
        });
    }
    
    // Edit Ranks button
    const editRanksBtn = document.getElementById('edit-ranks-btn');
    if (editRanksBtn) {
        editRanksBtn.addEventListener('click', function() {
            showRanksEditor();
        });
    }
    
    // Leave Gang button
    const leaveGangBtn = document.getElementById('leave-gang-btn');
    if (leaveGangBtn) {
        leaveGangBtn.addEventListener('click', function() {
            openLeaveGangModal();
        });
    }
    
    // Leave Gang modal handlers
    const leaveGangModal = document.getElementById('leave-gang-modal');
    const leaveGangClose = document.getElementById('leave-gang-close');
    const leaveGangCancel = document.getElementById('leave-gang-cancel');
    const leaveGangConfirm = document.getElementById('leave-gang-confirm');
    
    if (leaveGangClose) {
        leaveGangClose.addEventListener('click', () => closeModal('leave-gang-modal'));
    }
    if (leaveGangCancel) {
        leaveGangCancel.addEventListener('click', () => closeModal('leave-gang-modal'));
    }
    
    // Roster back button
    const rosterBackBtn = document.getElementById('roster-back-btn');
    if (rosterBackBtn) {
        rosterBackBtn.addEventListener('click', function() {
            hideRoster();
        });
    }
    
    // Ranks back button
    const ranksBackBtn = document.getElementById('ranks-back-btn');
    if (ranksBackBtn) {
        ranksBackBtn.addEventListener('click', function() {
            hideRanksEditor();
        });
    }
    
    // Add Rank button
    const addRankBtn = document.getElementById('add-rank-btn');
    if (addRankBtn) {
        addRankBtn.addEventListener('click', function() {
            openModal('add-rank-modal');
        });
    }
    
    // Add Rank modal handlers
    const addRankClose = document.getElementById('add-rank-close');
    const addRankCancel = document.getElementById('add-rank-cancel');
    
    // Edit Permissions Modal handlers
    const editPermissionsClose = document.getElementById('edit-permissions-close');
    const editPermissionsCancel = document.getElementById('edit-permissions-cancel');
    const editPermissionsSave = document.getElementById('edit-permissions-save');
    
    if (editPermissionsClose) {
        editPermissionsClose.addEventListener('click', closeEditPermissionsModal);
    }
    
    if (editPermissionsCancel) {
        editPermissionsCancel.addEventListener('click', closeEditPermissionsModal);
    }
    
    if (editPermissionsSave) {
        editPermissionsSave.addEventListener('click', savePermissions);
    }
    
    // Edit Rank Permissions checkbox handler
    const editRanksCheckbox = document.getElementById('permission-edit-ranks');
    const editRankPermissionsCheckbox = document.getElementById('permission-edit-rank-permissions');
    const editRankPermissionsWrapper = document.getElementById('permission-edit-rank-permissions-wrapper');
    
    if (editRanksCheckbox && editRankPermissionsWrapper) {
        // Use event delegation to handle changes even when modal is reopened
        document.addEventListener('change', function(e) {
            if (e.target && e.target.id === 'permission-edit-ranks') {
                if (e.target.checked) {
                    if (editRankPermissionsWrapper) {
                        editRankPermissionsWrapper.classList.remove('hidden');
                    }
                } else {
                    if (editRankPermissionsWrapper) {
                        editRankPermissionsWrapper.classList.add('hidden');
                    }
                    if (editRankPermissionsCheckbox) {
                        editRankPermissionsCheckbox.checked = false;
                    }
                }
            }
        });
    }
    
    // Edit Rank Permissions warning modal handlers
    let pendingEditRankPermissionsCheck = false;
    const editRankPermissionsWarningClose = document.getElementById('edit-rank-permissions-warning-close');
    const editRankPermissionsWarningCancel = document.getElementById('edit-rank-permissions-warning-cancel');
    const editRankPermissionsWarningConfirm = document.getElementById('edit-rank-permissions-warning-confirm');
    
    if (editRankPermissionsWarningClose) {
        editRankPermissionsWarningClose.addEventListener('click', () => {
            closeModal('edit-rank-permissions-warning-modal');
            if (editRankPermissionsCheckbox && pendingEditRankPermissionsCheck) {
                editRankPermissionsCheckbox.checked = false;
            }
            pendingEditRankPermissionsCheck = false;
        });
    }
    
    if (editRankPermissionsWarningCancel) {
        editRankPermissionsWarningCancel.addEventListener('click', () => {
            closeModal('edit-rank-permissions-warning-modal');
            if (editRankPermissionsCheckbox && pendingEditRankPermissionsCheck) {
                editRankPermissionsCheckbox.checked = false;
            }
            pendingEditRankPermissionsCheck = false;
        });
    }
    
    if (editRankPermissionsCheckbox) {
        editRankPermissionsCheckbox.addEventListener('change', function() {
            if (this.checked && !pendingEditRankPermissionsCheck) {
                // Uncheck temporarily and show warning modal
                this.checked = false;
                pendingEditRankPermissionsCheck = true;
                openModal('edit-rank-permissions-warning-modal');
            } else if (!this.checked && !pendingEditRankPermissionsCheck) {
                // User manually unchecked
                pendingEditRankPermissionsCheck = false;
            }
        });
    }
    
    if (editRankPermissionsWarningConfirm) {
        editRankPermissionsWarningConfirm.addEventListener('click', () => {
            closeModal('edit-rank-permissions-warning-modal');
            // Check the checkbox after confirmation
            if (editRankPermissionsCheckbox && pendingEditRankPermissionsCheck) {
                editRankPermissionsCheckbox.checked = true;
            }
            pendingEditRankPermissionsCheck = false;
        });
    }
    const addRankConfirm = document.getElementById('add-rank-confirm');
    
    if (addRankClose) {
        addRankClose.addEventListener('click', () => closeModal('add-rank-modal'));
    }
    if (addRankCancel) {
        addRankCancel.addEventListener('click', () => closeModal('add-rank-modal'));
    }
    if (addRankConfirm) {
        addRankConfirm.addEventListener('click', function() {
            const rankName = document.getElementById('new-rank-name').value.trim();
            
            if (!rankName) {
                showNotification('Please enter a rank name', 'error');
                return;
            }
            
            this.classList.add('loading');
            this.disabled = true;
            
            fetch(`https://${GetParentResourceName()}/addRank`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ rankName: rankName })
            })
            .then(response => response.json())
            .then(result => {
                if (result.success) {
                    showNotification(result.message || 'Rank added successfully', 'success');
                    closeModal('add-rank-modal');
                    document.getElementById('new-rank-name').value = '';
                    loadRanks();
                } else {
                    showNotification(result.message || 'Failed to add rank', 'error');
                }
            })
            .catch(error => {
                console.error('Error adding rank:', error);
                showNotification('Failed to add rank', 'error');
            })
            .finally(() => {
                this.classList.remove('loading');
                this.disabled = false;
            });
        });
    }
    
    // Delete Rank modal handlers
    const deleteRankClose = document.getElementById('delete-rank-close');
    const deleteRankCancel = document.getElementById('delete-rank-cancel');
    
    if (deleteRankClose) {
        deleteRankClose.addEventListener('click', () => {
            closeModal('delete-rank-modal');
            pendingDeleteRankName = null;
        });
    }
    if (deleteRankCancel) {
        deleteRankCancel.addEventListener('click', () => {
            closeModal('delete-rank-modal');
            pendingDeleteRankName = null;
        });
    }
    
    const deleteRankConfirm = document.getElementById('delete-rank-confirm');
    if (deleteRankConfirm) {
        deleteRankConfirm.addEventListener('click', () => {
            confirmDeleteRank();
        });
    }
    
    // Edit Player modal handlers
    const editPlayerClose = document.getElementById('edit-player-close');
    const editPlayerCancel = document.getElementById('edit-player-cancel');
    const editPlayerSave = document.getElementById('edit-player-save');
    
    if (editPlayerClose) {
        editPlayerClose.addEventListener('click', () => {
            closeModal('edit-player-modal');
            pendingEditCitizenid = null;
            pendingEditRankName = null;
        });
    }
    if (editPlayerCancel) {
        editPlayerCancel.addEventListener('click', () => {
            closeModal('edit-player-modal');
            pendingEditCitizenid = null;
            pendingEditRankName = null;
        });
    }
    if (editPlayerSave) {
        editPlayerSave.addEventListener('click', () => {
            savePlayerEdit();
        });
    }
    
    // Kick Player modal handlers
    const kickPlayerClose = document.getElementById('kick-player-close');
    const kickPlayerCancel = document.getElementById('kick-player-cancel');
    
    if (kickPlayerClose) {
        kickPlayerClose.addEventListener('click', () => {
            closeModal('kick-player-modal');
            pendingKickCitizenid = null;
        });
    }
    if (kickPlayerCancel) {
        kickPlayerCancel.addEventListener('click', () => {
            closeModal('kick-player-modal');
            pendingKickCitizenid = null;
        });
    }
    
    // Initialize hold buttons
    initHoldButtons();
});

// Hold button functionality
let holdButtonIntervals = {};

function initHoldButtons() {
    document.querySelectorAll('.hold-button').forEach(button => {
        const holdTime = parseInt(button.getAttribute('data-hold-time')) || 3000;
        let holdInterval = null;
        let holdStartTime = null;
        
        button.addEventListener('mousedown', function(e) {
            if (this.disabled) return;
            
            const buttonId = this.id;
            holdStartTime = Date.now();
            const progressBar = this.querySelector('.hold-button-progress');
            const textSpan = this.querySelector('.hold-button-text');
            
            if (progressBar) {
                progressBar.style.width = '0%';
            }
            
            holdInterval = setInterval(() => {
                const elapsed = Date.now() - holdStartTime;
                const progress = Math.min((elapsed / holdTime) * 100, 100);
                
                if (progressBar) {
                    progressBar.style.width = progress + '%';
                }
                
                if (progress >= 100) {
                    clearInterval(holdInterval);
                    holdButtonIntervals[buttonId] = null;
                    
                    // Trigger the action
                    if (buttonId === 'leave-gang-confirm') {
                        confirmLeaveGang();
                    } else if (buttonId === 'kick-player-confirm') {
                        confirmKickPlayer();
                    }
                }
            }, 10);
            
            holdButtonIntervals[buttonId] = holdInterval;
        });
        
        button.addEventListener('mouseup', function() {
            const buttonId = this.id;
            if (holdButtonIntervals[buttonId]) {
                clearInterval(holdButtonIntervals[buttonId]);
                holdButtonIntervals[buttonId] = null;
                
                const progressBar = this.querySelector('.hold-button-progress');
                if (progressBar) {
                    progressBar.style.width = '0%';
                }
            }
        });
        
        button.addEventListener('mouseleave', function() {
            const buttonId = this.id;
            if (holdButtonIntervals[buttonId]) {
                clearInterval(holdButtonIntervals[buttonId]);
                holdButtonIntervals[buttonId] = null;
                
                const progressBar = this.querySelector('.hold-button-progress');
                if (progressBar) {
                    progressBar.style.width = '0%';
                }
            }
        });
    });
}

// Roster functions
function showRoster() {
    const menuButtons = document.getElementById('menu-buttons');
    const rosterContainer = document.getElementById('roster-container');
    
    if (menuButtons) menuButtons.classList.add('hidden');
    if (rosterContainer) {
        rosterContainer.classList.remove('hidden');
        loadRoster();
    }
}

function hideRoster() {
    const menuButtons = document.getElementById('menu-buttons');
    const rosterContainer = document.getElementById('roster-container');
    
    if (menuButtons) menuButtons.classList.remove('hidden');
    if (rosterContainer) rosterContainer.classList.add('hidden');
}

function loadRoster() {
    fetch(`https://${GetParentResourceName()}/getGangRoster`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
    })
    .then(response => response.json())
    .then(result => {
        if (result.success && result.roster) {
            renderRoster(result.roster);
        } else {
            showNotification(result.message || 'Failed to load roster', 'error');
        }
    })
    .catch(error => {
        console.error('Error loading roster:', error);
        showNotification('Failed to load roster', 'error');
    });
}

function renderRoster(roster) {
    const tbody = document.getElementById('roster-table-body');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    roster.forEach(member => {
        const row = document.createElement('tr');
        row.className = member.isLeader ? 'roster-row leader' : 'roster-row';
        
        const nameCell = document.createElement('td');
        const nameSpan = document.createElement('span');
        nameSpan.textContent = member.charname;
        nameCell.appendChild(nameSpan);
        if (member.isOnline) {
            const onlineBadge = document.createElement('span');
            onlineBadge.className = 'online-badge';
            onlineBadge.title = 'Online';
            nameCell.appendChild(onlineBadge);
        } else {
            const offlineBadge = document.createElement('span');
            offlineBadge.className = 'offline-badge';
            offlineBadge.title = 'Offline';
            nameCell.appendChild(offlineBadge);
        }
        
        const rankCell = document.createElement('td');
        rankCell.textContent = member.rank;
        
        const actionsCell = document.createElement('td');
        actionsCell.className = 'roster-actions';
        
        // Get player permissions and level
        const playerLevel = menuData && menuData.playerLevel ? menuData.playerLevel : 0;
        const hasEditPermission = menuData && menuData.permissions && menuData.permissions.edit_player;
        const hasKickPermission = menuData && menuData.permissions && menuData.permissions.kick_player;
        
        // Check if can edit (has permission and target level is lower)
        const canEdit = !member.isLeader && hasEditPermission && playerLevel > (member.level || 0);
        
        // Check if can kick (has permission and target level is lower)
        const canKick = !member.isLeader && hasKickPermission && playerLevel > (member.level || 0);
        
        // Edit button
        const editBtn = document.createElement('button');
        editBtn.className = 'roster-edit-btn';
        editBtn.textContent = 'Edit';
        editBtn.disabled = !canEdit;
        if (member.isLeader) {
            editBtn.title = 'Cannot edit gang leader';
        } else if (!hasEditPermission) {
            editBtn.title = 'You do not have permission to edit players';
        } else if (playerLevel <= (member.level || 0)) {
            editBtn.title = 'You cannot edit players of the same or higher level';
        }
        editBtn.addEventListener('click', () => openEditPlayerModal(member.citizenid, member.charname, member.rankName, member.isLeader));
        actionsCell.appendChild(editBtn);
        
        // Kick button
        const kickBtn = document.createElement('button');
        kickBtn.className = 'roster-kick-btn';
        kickBtn.textContent = 'Kick';
        kickBtn.disabled = !canKick;
        if (member.isLeader) {
            kickBtn.title = 'Cannot kick gang leader';
        } else if (!hasKickPermission) {
            kickBtn.title = 'You do not have permission to kick players';
        } else if (playerLevel <= (member.level || 0)) {
            kickBtn.title = 'You cannot kick players of the same or higher level';
        }
        kickBtn.addEventListener('click', () => openKickPlayerModal(member.citizenid, member.charname, member.isLeader));
        actionsCell.appendChild(kickBtn);
        
        row.appendChild(nameCell);
        row.appendChild(rankCell);
        row.appendChild(actionsCell);
        
        tbody.appendChild(row);
    });
}

// Leave Gang functions
function openLeaveGangModal() {
    // Check if player is leader to show appropriate warning
    // Use menuData if available, otherwise show default message
    const warningText = document.getElementById('leave-gang-warning');
    const hintText = document.getElementById('leave-gang-hint');
    
    if (menuData && menuData.isGangLeader) {
        if (warningText) warningText.textContent = 'Are you sure you want to leave this gang?';
        if (hintText) hintText.textContent = 'Leadership will be assigned to the next highest ranking member. This action cannot be undone.';
    } else {
        if (warningText) warningText.textContent = 'Are you sure you want to leave this gang?';
        if (hintText) hintText.textContent = 'This action cannot be undone.';
    }
    
    openModal('leave-gang-modal');
}

function confirmLeaveGang() {
    const confirmBtn = document.getElementById('leave-gang-confirm');
    if (confirmBtn) {
        confirmBtn.disabled = true;
        confirmBtn.classList.add('loading');
    }
    
    fetch(`https://${GetParentResourceName()}/leaveGang`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
    })
    .then(response => response.json())
    .then(result => {
        if (result.success) {
            showNotification(result.message || 'You have left the gang', 'success');
            closeModal('leave-gang-modal');
            closeMenu();
            fetch(`https://${GetParentResourceName()}/closeMenu`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({})
            });
        } else {
            showNotification(result.message || 'Failed to leave gang', 'error');
        }
    })
    .catch(error => {
        console.error('Error leaving gang:', error);
        showNotification('Failed to leave gang', 'error');
    })
    .finally(() => {
        if (confirmBtn) {
            confirmBtn.disabled = false;
            confirmBtn.classList.remove('loading');
            const progressBar = confirmBtn.querySelector('.hold-button-progress');
            if (progressBar) progressBar.style.width = '0%';
        }
    });
}

// Kick Player functions
let pendingKickCitizenid = null;

let pendingEditCitizenid = null;
let pendingEditRankName = null;

function openEditPlayerModal(citizenid, charname, currentRankName, isLeader) {
    if (isLeader) {
        showNotification('You cannot edit the gang leader', 'error');
        return;
    }
    
    pendingEditCitizenid = citizenid;
    pendingEditRankName = currentRankName;
    
    const nameSpan = document.getElementById('edit-player-name');
    if (nameSpan) nameSpan.textContent = charname;
    
    // Load ranks for dropdown
    fetch(`https://${GetParentResourceName()}/getGangRanks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
    })
    .then(response => response.json())
    .then(result => {
        if (result.success && result.ranks) {
            const playerLevel = menuData && menuData.playerLevel ? menuData.playerLevel : 0;
            
            // Filter out ranks at the same level or higher than the player's level
            const rankOptions = result.ranks
                .filter(rank => playerLevel > (rank.level || 0))
                .map(rank => ({
                    value: rank.name,
                    text: `${rank.name.charAt(0).toUpperCase() + rank.name.slice(1)} (Level ${rank.level})`,
                    searchText: `${rank.name} level ${rank.level}`
                }));
            
            if (rankOptions.length === 0) {
                showNotification('No ranks available to assign (all ranks are at your level or higher)', 'error');
                return;
            }
            
            createSearchableDropdown('edit-player-rank-dropdown', rankOptions, currentRankName, 'Select rank...');
            openModal('edit-player-modal');
        } else {
            showNotification(result.message || 'Failed to load ranks', 'error');
        }
    })
    .catch(error => {
        console.error('Error loading ranks:', error);
        showNotification('Failed to load ranks', 'error');
    });
}

function openKickPlayerModal(citizenid, charname, isLeader) {
    if (isLeader) {
        showNotification('You cannot kick the gang leader', 'error');
        return;
    }
    
    pendingKickCitizenid = citizenid;
    const nameSpan = document.getElementById('kick-player-name');
    if (nameSpan) nameSpan.textContent = charname;
    
    openModal('kick-player-modal');
}

function savePlayerEdit() {
    if (!pendingEditCitizenid) return;
    
    const rankDropdown = document.getElementById('edit-player-rank-dropdown');
    if (!rankDropdown) return;
    
    const hiddenInput = rankDropdown.querySelector('input[type="hidden"]');
    if (!hiddenInput || !hiddenInput.value) {
        showNotification('Please select a rank', 'error');
        return;
    }
    
    const newRank = hiddenInput.value;
    
    if (newRank === pendingEditRankName) {
        closeModal('edit-player-modal');
        pendingEditCitizenid = null;
        pendingEditRankName = null;
        return;
    }
    
    const saveBtn = document.getElementById('edit-player-save');
    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.classList.add('loading');
    }
    
    fetch(`https://${GetParentResourceName()}/editPlayerRank`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            citizenid: pendingEditCitizenid,
            rankName: newRank
        })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(result => {
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.classList.remove('loading');
        }
        
        if (result.success) {
            showNotification(result.message || 'Player rank updated successfully', 'success');
            closeModal('edit-player-modal');
            pendingEditCitizenid = null;
            pendingEditRankName = null;
            loadRoster(); // Reload roster to show updated rank
        } else {
            showNotification(result.message || 'Failed to update player rank', 'error');
        }
    })
    .catch(error => {
        console.error('Error updating player rank:', error);
        showNotification('Failed to update player rank', 'error');
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.classList.remove('loading');
        }
    });
}

function confirmKickPlayer() {
    if (!pendingKickCitizenid) return;
    
    const confirmBtn = document.getElementById('kick-player-confirm');
    if (confirmBtn) {
        confirmBtn.disabled = true;
        confirmBtn.classList.add('loading');
    }
    
    fetch(`https://${GetParentResourceName()}/kickPlayer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetCitizenid: pendingKickCitizenid })
    })
    .then(response => response.json())
    .then(result => {
        if (result.success) {
            showNotification(result.message || 'Player has been kicked from the gang', 'success');
            closeModal('kick-player-modal');
            pendingKickCitizenid = null;
            // Refresh roster
            loadRoster();
        } else {
            showNotification(result.message || 'Failed to kick player', 'error');
        }
    })
    .catch(error => {
        console.error('Error kicking player:', error);
        showNotification('Failed to kick player', 'error');
    })
    .finally(() => {
        if (confirmBtn) {
            confirmBtn.disabled = false;
            confirmBtn.classList.remove('loading');
            const progressBar = confirmBtn.querySelector('.hold-button-progress');
            if (progressBar) progressBar.style.width = '0%';
        }
    });
}

// Ranks Editor functions
function showRanksEditor() {
    const menuButtons = document.getElementById('menu-buttons');
    const ranksContainer = document.getElementById('ranks-container');
    
    if (menuButtons) menuButtons.classList.add('hidden');
    if (ranksContainer) {
        ranksContainer.classList.remove('hidden');
        loadRanks();
    }
}

function hideRanksEditor() {
    const menuButtons = document.getElementById('menu-buttons');
    const ranksContainer = document.getElementById('ranks-container');
    
    if (menuButtons) menuButtons.classList.remove('hidden');
    if (ranksContainer) ranksContainer.classList.add('hidden');
}

function loadRanks() {
    fetch(`https://${GetParentResourceName()}/getGangRanks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
    })
    .then(response => response.json())
    .then(result => {
        if (result.success && result.ranks) {
            renderRanks(result.ranks);
        } else {
            showNotification(result.message || 'Failed to load ranks', 'error');
        }
    })
    .catch(error => {
        console.error('Error loading ranks:', error);
        showNotification('Failed to load ranks', 'error');
    });
}

// Store drag and drop handlers for cleanup
let rankDragDropHandlers = {
    dragstart: null,
    dragend: null,
    dragover: null,
    dragleave: null,
    drop: null
};

function renderRanks(ranks) {
    const ranksList = document.getElementById('ranks-list');
    if (!ranksList) return;
    
    // Clear existing content
    ranksList.innerHTML = '';
    
    ranks.forEach((rank, index) => {
        const rankItem = document.createElement('div');
        rankItem.className = 'rank-item';
        rankItem.dataset.rankName = rank.name;
        rankItem.dataset.level = rank.level;
        
        const isDefault = rank.name === 'boss' || rank.name === 'member';
        const displayName = rank.name.charAt(0).toUpperCase() + rank.name.slice(1);
        
        // Check if player can delete this rank (level-based restriction)
        const playerLevel = menuData && menuData.playerLevel ? menuData.playerLevel : 0;
        const rankLevel = rank.level || 0;
        const canDelete = !isDefault && playerLevel > rankLevel;
        
        // Check if player can edit permissions for this rank
        const hasEditRankPermissions = menuData && menuData.permissions && menuData.permissions.edit_rank_permissions;
        const canEditPermissions = !isDefault && hasEditRankPermissions && playerLevel > rankLevel;
        
        // Check if player can reorder this rank (edit_ranks permission and level check)
        const hasEditRanks = menuData && menuData.permissions && menuData.permissions.edit_ranks;
        const canReorder = !isDefault && hasEditRanks && playerLevel > rankLevel;
        
        rankItem.innerHTML = `
            <div class="rank-item-handle ${isDefault ? 'immutable' : ''}">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M9 5H15M9 12H15M9 19H15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            </div>
            <div class="rank-item-content">
                <div class="rank-item-name">${escapeHtml(displayName)}</div>
                <div class="rank-item-level">Level ${rank.level}</div>
            </div>
            <div class="rank-item-permissions">
                ${rank.name === 'boss' ? '<div class="permissions-placeholder">All Permissions</div>' : rank.name === 'member' ? '<div class="permissions-placeholder">No Permissions</div>' : `
                    <button class="edit-permissions-btn ${!canEditPermissions ? 'disabled' : ''}" data-rank-name="${rank.name}" ${!canEditPermissions ? 'disabled' : ''} title="${!canEditPermissions ? (!hasEditRankPermissions ? 'You do not have permission to edit rank permissions' : 'You cannot edit permissions for ranks of the same or higher level') : ''}">Edit Permissions</button>
                `}
            </div>
            ${!isDefault ? `<button class="rank-item-delete ${!canDelete ? 'disabled' : ''}" data-rank-name="${rank.name}" draggable="false" ${!canDelete ? 'disabled title="You cannot delete ranks of the same or higher level"' : ''}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M3 6H5H21M8 6V4C8 3.46957 8.21071 2.96086 8.58579 2.58579C8.96086 2.21071 9.46957 2 10 2H14C14.5304 2 15.0391 2.21071 15.4142 2.58579C15.7893 2.96086 16 3.46957 16 4V6M19 6V20C19 20.5304 18.7893 21.0391 18.4142 21.4142C18.0391 21.7893 17.5304 22 17 22H7C6.46957 22 5.96086 21.7893 5.58579 21.4142C5.21071 21.0391 5 20.5304 5 20V6H19Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            </button>` : '<div class="rank-item-delete-spacer"></div>'}
        `;
        
        // Add delete handler for non-default ranks
        if (!isDefault) {
            const deleteBtn = rankItem.querySelector('.rank-item-delete');
            if (deleteBtn) {
                // Prevent delete button from starting drag
                deleteBtn.setAttribute('draggable', 'false');
                deleteBtn.style.pointerEvents = 'auto';
                
                deleteBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    deleteRank(rank.name);
                });
            }
            
            // Add "Edit Permissions" button handler
            const editPermissionsBtn = rankItem.querySelector('.edit-permissions-btn');
            if (editPermissionsBtn) {
                editPermissionsBtn.addEventListener('click', function(e) {
                    e.stopPropagation();
                    e.preventDefault();
                    if (!this.disabled && !this.classList.contains('disabled')) {
                        const rankName = this.dataset.rankName;
                        openEditPermissionsModal(rankName, rank);
                    }
                });
            }
            
            // Only allow dragging if player has permission and rank is below their level
            if (canReorder) {
                rankItem.addEventListener('mousedown', function(e) {
                // Don't start drag if clicking on delete button, edit permissions button, or permission checkboxes
                if (e.target.closest('.rank-item-delete') || e.target.closest('.edit-permissions-btn') || e.target.closest('.permission-input') || e.target.closest('.permission-checkbox')) {
                    return;
                }
                
                window.rankDragState = {
                    isDragging: true,
                    draggedElement: this,
                    ghostElement: null,
                    offsetX: e.clientX - this.getBoundingClientRect().left,
                    offsetY: e.clientY - this.getBoundingClientRect().top
                };
                
                this.classList.add('dragging');
                
                // Create ghost element
                const ghost = this.cloneNode(true);
                ghost.classList.add('rank-item-ghost');
                ghost.classList.remove('dragging');
                
                // Remove delete button from ghost if it exists
                const deleteBtn = ghost.querySelector('.rank-item-delete');
                if (deleteBtn) {
                    // Replace delete button with a spacer to maintain layout
                    const spacer = document.createElement('div');
                    spacer.className = 'rank-item-delete-spacer';
                    spacer.style.width = '36px';
                    spacer.style.height = '36px';
                    spacer.style.flexShrink = '0';
                    deleteBtn.replaceWith(spacer);
                }
                
                ghost.style.position = 'fixed';
                ghost.style.pointerEvents = 'none';
                ghost.style.zIndex = '10000';
                ghost.style.width = this.offsetWidth + 'px';
                ghost.style.opacity = '0.7';
                document.body.appendChild(ghost);
                window.rankDragState.ghostElement = ghost;
                
                // Position ghost at cursor
                ghost.style.left = (e.clientX - window.rankDragState.offsetX) + 'px';
                ghost.style.top = (e.clientY - window.rankDragState.offsetY) + 'px';
                
                // Prevent text selection during drag
                e.preventDefault();
                
                console.log('Mouse drag started on', this.dataset.rankName);
                });
            } else {
                // If cannot reorder, prevent any drag interaction
                rankItem.classList.add('no-drag');
                rankItem.style.cursor = 'not-allowed';
                rankItem.style.opacity = '0.6';
                rankItem.addEventListener('mousedown', function(e) {
                    e.stopPropagation();
                    e.preventDefault();
                });
            }
        } else {
            // Default ranks (boss/member) are not draggable
            rankItem.setAttribute('draggable', 'false');
        }
        
        ranksList.appendChild(rankItem);
    });
    
    // Initialize mouse-based drag and drop (NUI doesn't support HTML5 drag and drop)
    initRankMouseDragDrop();
}

// Mouse-based drag and drop for NUI (HTML5 drag and drop not supported)
function initRankMouseDragDrop() {
    const ranksList = document.getElementById('ranks-list');
    if (!ranksList) return;
    
    // Initialize drag state
    if (!window.rankDragState) {
        window.rankDragState = {
            isDragging: false,
            draggedElement: null
        };
    }
    
    // Global mousemove handler - only add once
    if (!window.rankDragMouseMoveHandler) {
        window.rankDragMouseMoveHandler = function(e) {
            if (!window.rankDragState || !window.rankDragState.isDragging || !window.rankDragState.draggedElement) return;
            
            const ranksList = document.getElementById('ranks-list');
            if (!ranksList) return;
            
            // Update ghost position
            if (window.rankDragState.ghostElement) {
                window.rankDragState.ghostElement.style.left = (e.clientX - window.rankDragState.offsetX) + 'px';
                window.rankDragState.ghostElement.style.top = (e.clientY - window.rankDragState.offsetY) + 'px';
            }
            
            // Find which rank item we're hovering over - improved detection
            const allItems = ranksList.querySelectorAll('.rank-item');
            let hoveredItem = null;
            let hoverPosition = null; // 'above' or 'below'
            
            // Check all items to find the closest one based on Y position
            for (const item of allItems) {
                if (item === window.rankDragState.draggedElement) continue;
                
                const rect = item.getBoundingClientRect();
                const midpoint = rect.top + rect.height / 2;
                
                // Check if cursor is within horizontal bounds
                if (e.clientX >= rect.left && e.clientX <= rect.right) {
                    // Check if cursor is above or below the midpoint
                    if (e.clientY < midpoint && e.clientY >= rect.top - 20) {
                        // Cursor is in the top half
                        hoveredItem = item;
                        hoverPosition = 'above';
                        break;
                    } else if (e.clientY >= midpoint && e.clientY <= rect.bottom + 20) {
                        // Cursor is in the bottom half
                        hoveredItem = item;
                        hoverPosition = 'below';
                        break;
                    }
                }
            }
            
            // Clear all indicators
            allItems.forEach(item => {
                item.classList.remove('drag-over-top', 'drag-over-bottom');
            });
            
            if (hoveredItem && hoveredItem !== window.rankDragState.draggedElement) {
                const isDefault = hoveredItem.dataset.rankName === 'boss' || hoveredItem.dataset.rankName === 'member';
                const playerLevel = menuData && menuData.playerLevel ? menuData.playerLevel : 0;
                const targetLevel = parseInt(hoveredItem.dataset.level) || 0;
                
                // Only allow dropping on ranks below player's level (and not default ranks)
                if (!isDefault && playerLevel > targetLevel) {
                    if (hoverPosition === 'above') {
                        hoveredItem.classList.add('drag-over-top');
                    } else {
                        hoveredItem.classList.add('drag-over-bottom');
                    }
                }
            }
        };
        
        document.addEventListener('mousemove', window.rankDragMouseMoveHandler);
    }
    
    // Global mouseup handler - only add once
    if (!window.rankDragMouseUpHandler) {
        window.rankDragMouseUpHandler = function(e) {
            if (!window.rankDragState || !window.rankDragState.isDragging || !window.rankDragState.draggedElement) return;
            
            const ranksList = document.getElementById('ranks-list');
            if (!ranksList) return;
            
            const draggedElement = window.rankDragState.draggedElement;
            draggedElement.classList.remove('dragging');
            
            // Remove ghost element
            if (window.rankDragState.ghostElement) {
                window.rankDragState.ghostElement.remove();
                window.rankDragState.ghostElement = null;
            }
            
            // Find which rank item we're dropping on - improved detection
            const allItems = ranksList.querySelectorAll('.rank-item');
            let dropTarget = null;
            let dropPosition = null; // 'above' or 'below'
            
            // Check all items to find the closest one based on Y position
            for (const item of allItems) {
                if (item === draggedElement) continue;
                
                const rect = item.getBoundingClientRect();
                const midpoint = rect.top + rect.height / 2;
                
                // Check if cursor is within horizontal bounds
                if (e.clientX >= rect.left && e.clientX <= rect.right) {
                    // Check if cursor is above or below the midpoint
                    if (e.clientY < midpoint && e.clientY >= rect.top - 20) {
                        // Cursor is in the top half
                        dropTarget = item;
                        dropPosition = 'above';
                        break;
                    } else if (e.clientY >= midpoint && e.clientY <= rect.bottom + 20) {
                        // Cursor is in the bottom half
                        dropTarget = item;
                        dropPosition = 'below';
                        break;
                    }
                }
            }
            
            // Clear all indicators
            allItems.forEach(item => {
                item.classList.remove('drag-over-top', 'drag-over-bottom');
            });
            
            if (dropTarget && dropTarget !== draggedElement) {
                const isDefault = dropTarget.dataset.rankName === 'boss' || dropTarget.dataset.rankName === 'member';
                const playerLevel = menuData && menuData.playerLevel ? menuData.playerLevel : 0;
                const targetLevel = parseInt(dropTarget.dataset.level) || 0;
                
                // Only allow dropping on ranks below player's level (and not default ranks)
                if (!isDefault && playerLevel > targetLevel) {
                    if (dropPosition === 'above') {
                        ranksList.insertBefore(draggedElement, dropTarget);
                    } else {
                        const memberItem = ranksList.querySelector('[data-rank-name="member"]');
                        if (memberItem && dropTarget.nextSibling === memberItem) {
                            ranksList.insertBefore(draggedElement, memberItem);
                        } else {
                            ranksList.insertBefore(draggedElement, dropTarget.nextSibling);
                        }
                    }
                    
                    // Save the new order
                    saveRankOrder();
                }
            }
            
            window.rankDragState.isDragging = false;
            window.rankDragState.draggedElement = null;
            window.rankDragState.offsetX = null;
            window.rankDragState.offsetY = null;
        };
        
        document.addEventListener('mouseup', window.rankDragMouseUpHandler);
    }
}

function initRankDragDrop() {
    const ranksList = document.getElementById('ranks-list');
    if (!ranksList) {
        console.log('initRankDragDrop: ranks-list not found');
        return;
    }
    
    console.log('initRankDragDrop: initializing drag and drop');
    
    // Remove old event listeners from container if they exist
    if (rankDragDropHandlers.dragover) {
        ranksList.removeEventListener('dragover', rankDragDropHandlers.dragover);
        ranksList.removeEventListener('dragleave', rankDragDropHandlers.dragleave);
        ranksList.removeEventListener('drop', rankDragDropHandlers.drop);
    }
    
    // Create container event handlers for dragover/drop - following W3Schools pattern
    rankDragDropHandlers.dragover = function(e) {
        // Always prevent default to allow drop - this is required per W3Schools
        e.preventDefault();
        e.stopPropagation();
        
        // Set dropEffect to show it's allowed
        e.dataTransfer.dropEffect = 'move';
        
        if (!window.draggedRankElement) {
            console.log('dragover: no dragged element');
            return false;
        }
        
        const item = e.target.closest('.rank-item');
        if (!item || item === window.draggedRankElement) {
            // Clear indicators if not over a valid item
            ranksList.querySelectorAll('.rank-item').forEach(i => {
                i.classList.remove('drag-over-top', 'drag-over-bottom');
            });
            return false;
        }
        
        const bossItem = ranksList.querySelector('[data-rank-name="boss"]');
        const memberItem = ranksList.querySelector('[data-rank-name="member"]');
        
        // Don't allow dropping on boss or member
        if (item === bossItem || item === memberItem) {
            e.dataTransfer.dropEffect = 'none';
            ranksList.querySelectorAll('.rank-item').forEach(i => {
                i.classList.remove('drag-over-top', 'drag-over-bottom');
            });
            return false;
        }
        
        // Determine if we should drop above or below
        const rect = item.getBoundingClientRect();
        const y = e.clientY;
        const midpoint = rect.top + rect.height / 2;
        
        // Clear all indicators first
        ranksList.querySelectorAll('.rank-item').forEach(i => {
            i.classList.remove('drag-over-top', 'drag-over-bottom');
        });
        
        // Show visual feedback
        if (y < midpoint) {
            // Drop above
            item.classList.add('drag-over-top');
        } else {
            // Drop below
            item.classList.add('drag-over-bottom');
        }
        
        return false;
    };
    
    rankDragDropHandlers.dragleave = function(e) {
        // Only clear if we're leaving the ranks list entirely
        if (!ranksList.contains(e.relatedTarget)) {
            ranksList.querySelectorAll('.rank-item').forEach(item => {
                item.classList.remove('drag-over-top', 'drag-over-bottom');
            });
        }
    };
    
    rankDragDropHandlers.drop = function(e) {
        // Prevent default behavior - required per W3Schools
        e.preventDefault();
        e.stopPropagation();
        
        console.log('drop event fired', e.target);
        
        if (!window.draggedRankElement) {
            console.log('drop: no dragged element');
            return false;
        }
        
        // Get the data - using "text" as per W3Schools example
        const data = e.dataTransfer.getData('text');
        console.log('drop: data retrieved', data);
        if (!data) return false;
        
        const item = e.target.closest('.rank-item');
        console.log('drop: target item', item);
        if (!item || item === window.draggedRankElement) return false;
        
        const bossItem = ranksList.querySelector('[data-rank-name="boss"]');
        const memberItem = ranksList.querySelector('[data-rank-name="member"]');
        
        // Don't allow dropping on boss or member
        if (item === bossItem || item === memberItem) {
            return false;
        }
        
        // Determine drop position
        const rect = item.getBoundingClientRect();
        const y = e.clientY;
        const midpoint = rect.top + rect.height / 2;
        
        // Clear indicators
        ranksList.querySelectorAll('.rank-item').forEach(i => {
            i.classList.remove('drag-over-top', 'drag-over-bottom');
        });
        
        // Move the element
        if (y < midpoint) {
            // Insert before this item
            ranksList.insertBefore(window.draggedRankElement, item);
        } else {
            // Insert after this item (but before member if this is the last custom rank)
            if (memberItem && item.nextSibling === memberItem) {
                ranksList.insertBefore(window.draggedRankElement, memberItem);
            } else {
                ranksList.insertBefore(window.draggedRankElement, item.nextSibling);
            }
        }
        
        // Save the new order
        saveRankOrder();
        
        return false;
    };
    
    // Add event listeners to container for dragover/drop
    ranksList.addEventListener('dragover', rankDragDropHandlers.dragover, false);
    ranksList.addEventListener('dragleave', rankDragDropHandlers.dragleave, false);
    ranksList.addEventListener('drop', rankDragDropHandlers.drop, false);
    
    console.log('initRankDragDrop: event listeners attached to ranks-list');
    
    // Also attach to each rank item as a fallback to ensure dragover fires
    ranksList.querySelectorAll('.rank-item').forEach(item => {
        item.addEventListener('dragover', rankDragDropHandlers.dragover, false);
        item.addEventListener('drop', rankDragDropHandlers.drop, false);
    });
    
    console.log('initRankDragDrop: event listeners also attached to individual items');
}

function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.rank-item:not(.dragging)')];
    
    return draggableElements.reduce((closest, child) => {
        // Skip boss and member for positioning
        if (child.dataset.rankName === 'boss' || child.dataset.rankName === 'member') {
            return closest;
        }
        
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        
        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

function saveRankOrder() {
    const ranksList = document.getElementById('ranks-list');
    if (!ranksList) return;
    
    const rankItems = ranksList.querySelectorAll('.rank-item');
    const orderedRankNames = [];
    
    rankItems.forEach(item => {
        orderedRankNames.push(item.dataset.rankName);
    });
    
    fetch(`https://${GetParentResourceName()}/reorderRanks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderedRankNames: orderedRankNames })
    })
    .then(response => response.json())
    .then(result => {
        if (result.success) {
            renderRanks(result.ranks);
            showNotification(result.message || 'Ranks reordered successfully', 'success');
        } else {
            showNotification(result.message || 'Failed to reorder ranks', 'error');
            loadRanks(); // Reload to reset order
        }
    })
    .catch(error => {
        console.error('Error reordering ranks:', error);
        showNotification('Failed to reorder ranks', 'error');
        loadRanks(); // Reload to reset order
    });
}

let currentEditingRank = null;
let originalPermissions = null;

function openEditPermissionsModal(rankName, rankData) {
    currentEditingRank = rankName;
    originalPermissions = rankData.permissions ? { ...rankData.permissions } : {};
    
    const modal = document.getElementById('edit-permissions-modal');
    const rankNameSpan = document.getElementById('edit-permissions-rank-name');
    const inviteCheckbox = document.getElementById('permission-invite-player');
    const kickCheckbox = document.getElementById('permission-kick-player');
    const editRanksCheckbox = document.getElementById('permission-edit-ranks');
    const editRankPermissionsCheckbox = document.getElementById('permission-edit-rank-permissions');
    const editRankPermissionsWrapper = document.getElementById('permission-edit-rank-permissions-wrapper');
    const editPlayerCheckbox = document.getElementById('permission-edit-player');
    
    if (!modal || !rankNameSpan || !inviteCheckbox || !kickCheckbox || !editRanksCheckbox || !editPlayerCheckbox) return;
    
    // Capitalize first letter of rank name
    const displayName = rankName.charAt(0).toUpperCase() + rankName.slice(1);
    rankNameSpan.textContent = displayName;
    
    // Set checkbox states
    inviteCheckbox.checked = originalPermissions.invite_player || false;
    kickCheckbox.checked = originalPermissions.kick_player || false;
    editRanksCheckbox.checked = originalPermissions.edit_ranks || false;
    editPlayerCheckbox.checked = originalPermissions.edit_player || false;
    
    // Show/hide sub-checkbox based on Edit Ranks
    if (editRankPermissionsWrapper && editRankPermissionsCheckbox) {
        if (editRanksCheckbox.checked) {
            editRankPermissionsWrapper.classList.remove('hidden');
            editRankPermissionsCheckbox.checked = originalPermissions.edit_rank_permissions || false;
        } else {
            editRankPermissionsWrapper.classList.add('hidden');
            editRankPermissionsCheckbox.checked = false;
        }
    }
    
    // Show modal
    modal.classList.remove('hidden');
}

function closeEditPermissionsModal() {
    closeModal('edit-permissions-modal');
    currentEditingRank = null;
    originalPermissions = null;
}

function savePermissions() {
    if (!currentEditingRank) return;
    
    const inviteCheckbox = document.getElementById('permission-invite-player');
    const kickCheckbox = document.getElementById('permission-kick-player');
    const editRanksCheckbox = document.getElementById('permission-edit-ranks');
    const editRankPermissionsCheckbox = document.getElementById('permission-edit-rank-permissions');
    const editPlayerCheckbox = document.getElementById('permission-edit-player');
    
    if (!inviteCheckbox || !kickCheckbox || !editRanksCheckbox || !editPlayerCheckbox) return;
    
    const permissions = {
        invite_player: inviteCheckbox.checked,
        kick_player: kickCheckbox.checked,
        edit_ranks: editRanksCheckbox.checked,
        edit_rank_permissions: editRankPermissionsCheckbox ? editRankPermissionsCheckbox.checked : false,
        edit_player: editPlayerCheckbox.checked
    };
    
    // Check if any permissions changed
    const hasChanges = 
        permissions.invite_player !== (originalPermissions.invite_player || false) ||
        permissions.kick_player !== (originalPermissions.kick_player || false) ||
        permissions.edit_ranks !== (originalPermissions.edit_ranks || false) ||
        permissions.edit_rank_permissions !== (originalPermissions.edit_rank_permissions || false) ||
        permissions.edit_player !== (originalPermissions.edit_player || false);
    
    if (!hasChanges) {
        closeEditPermissionsModal();
        return;
    }
    
    // Disable save button while saving
    const saveBtn = document.getElementById('edit-permissions-save');
    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.classList.add('loading');
    }
    
    // Send all permissions in a single request
    fetch(`https://${GetParentResourceName()}/updateRankPermissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            rankName: currentEditingRank,
            permissions: permissions
        })
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(err => {
                throw new Error(err.message || `HTTP error! status: ${response.status}`);
            }).catch(() => {
                throw new Error(`HTTP error! status: ${response.status}`);
            });
        }
        return response.json();
    })
    .then(result => {
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.classList.remove('loading');
        }
        
        if (result.success) {
            showNotification('Permissions updated successfully', 'success');
            closeEditPermissionsModal();
            loadRanks(); // Reload to refresh the UI
        } else {
            showNotification(result.message || 'Failed to save permissions', 'error');
        }
    })
    .catch(error => {
        console.error('Error saving permissions:', error);
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.classList.remove('loading');
        }
        showNotification('Failed to save permissions: ' + (error.message || 'Unknown error'), 'error');
    });
}

function updateSinglePermission(rankName, permission, enabled) {
    console.log('Updating permission:', rankName, permission, enabled);
    return fetch(`https://${GetParentResourceName()}/updateRankPermission`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            rankName: rankName,
            permission: permission,
            enabled: enabled
        })
    })
    .then(response => {
        console.log('Response status:', response.status, response.statusText);
        if (!response.ok) {
            return response.json().then(err => {
                console.error('Response error:', err);
                throw new Error(err.message || `HTTP error! status: ${response.status}`);
            }).catch(() => {
                throw new Error(`HTTP error! status: ${response.status}`);
            });
        }
        return response.json();
    })
    .then(result => {
        console.log('Permission update result:', result);
        if (!result || !result.success) {
            throw new Error(result?.message || 'Failed to update permission');
        }
        return result;
    })
    .catch(error => {
        console.error('Error in updateSinglePermission:', error);
        throw error;
    });
}

function updateRankPermission(rankName, permission, enabled) {
    fetch(`https://${GetParentResourceName()}/updateRankPermission`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            rankName: rankName,
            permission: permission,
            enabled: enabled
        })
    })
    .then(response => response.json())
    .then(result => {
        if (result.success) {
            // Reload ranks to get updated permissions
            loadRanks();
        } else {
            showNotification(result.message || 'Failed to update permission', 'error');
            // Reload to revert checkbox state
            loadRanks();
        }
    })
    .catch(error => {
        console.error('Error updating permission:', error);
        showNotification('Failed to update permission', 'error');
        // Reload to revert checkbox state
        loadRanks();
    });
}

let pendingDeleteRankName = null;

function deleteRank(rankName) {
    pendingDeleteRankName = rankName;
    const displayName = rankName.charAt(0).toUpperCase() + rankName.slice(1);
    const nameSpan = document.getElementById('delete-rank-name');
    if (nameSpan) nameSpan.textContent = displayName;
    openModal('delete-rank-modal');
}

function confirmDeleteRank() {
    if (!pendingDeleteRankName) return;
    
    const confirmBtn = document.getElementById('delete-rank-confirm');
    if (confirmBtn) {
        confirmBtn.disabled = true;
        confirmBtn.classList.add('loading');
    }
    
    fetch(`https://${GetParentResourceName()}/deleteRank`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rankName: pendingDeleteRankName })
    })
    .then(response => response.json())
    .then(result => {
        if (result.success) {
            showNotification(result.message || 'Rank deleted successfully', 'success');
            closeModal('delete-rank-modal');
            pendingDeleteRankName = null;
            renderRanks(result.ranks);
        } else {
            showNotification(result.message || 'Failed to delete rank', 'error');
        }
    })
    .catch(error => {
        console.error('Error deleting rank:', error);
        showNotification('Failed to delete rank', 'error');
    })
    .finally(() => {
        if (confirmBtn) {
            confirmBtn.disabled = false;
            confirmBtn.classList.remove('loading');
            const progressBar = confirmBtn.querySelector('.hold-button-progress');
            if (progressBar) progressBar.style.width = '0%';
        }
    });
}

