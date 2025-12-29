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
            
            if (!gangName) {
                showNotification('Please enter a gang name', 'error');
                return;
            }
            
            if (!ownerCitizenid) {
                showNotification('Please select a gang owner', 'error');
                return;
            }
            
            // Add loading state
            this.classList.add('loading');
            this.disabled = true;
            
            fetch(`https://${GetParentResourceName()}/createGang`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    gangName: gangName,
                    ownerCitizenid: ownerCitizenid
                })
            })
            .then(response => response.json())
            .then(result => {
                if (result.success) {
                    showNotification(result.message || 'Gang created successfully', 'success');
                    document.getElementById('gang-name').value = '';
                    document.getElementById('gang-owner-search').value = '';
                    document.getElementById('gang-owner-id').value = '';
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
            if (activeDropdowns.length > 0) {
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

