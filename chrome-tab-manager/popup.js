// Current sort state
let currentSortOrder = null; // 'asc', 'desc', or null
let isExpanded = false; // Is the window expanded

document.addEventListener("DOMContentLoaded", () => {
    // Load window state (expanded or regular)
    chrome.storage.local.get(["isExpanded", "sortOrder"], (data) => {
        // Restore window state
        if (data.isExpanded) {
            isExpanded = data.isExpanded;
            if (isExpanded) {
                document.body.classList.add('expanded');
            }
        }
        
        // Restore sort state
        if (data.sortOrder) {
            currentSortOrder = data.sortOrder;
            updateSortButtons();
        }
    });

    // Load and display tabs
    updateTabList();
    
    // Handle click events
    document.getElementById("tab-list").addEventListener("click", (e) => {
        // Check if button was clicked
        if (e.target.classList.contains("close-btn") || e.target.parentElement.classList.contains("close-btn")) {
            e.stopPropagation();
            const closeButton = e.target.classList.contains("close-btn") ? e.target : e.target.parentElement;
            const tabId = parseInt(closeButton.getAttribute("data-id"));
            chrome.tabs.remove(tabId, () => {
                updateTabList();
            });
            return;
        }
        
        if (e.target.classList.contains("sleep-btn") || e.target.parentElement.classList.contains("sleep-btn")) {
            e.stopPropagation();
            const sleepButton = e.target.classList.contains("sleep-btn") ? e.target : e.target.parentElement;
            const tabId = parseInt(sleepButton.getAttribute("data-id"));
            
            // Put tab to sleep with error handling
            chrome.tabs.discard(tabId)
                .then(() => {
                    console.log(`Tab ${tabId} successfully discarded`);
                    // Update tab status in UI
                    chrome.runtime.sendMessage({ action: "updateTabs" }, () => {
                        updateTabList();
                    });
                })
                .catch((error) => {
                    console.error(`Error discarding tab ${tabId}:`, error);
                    // In case of error, still try to update the list
                    updateTabList();
                });
            return;
        }
        
        // If tab area was clicked (not a button)
        const tabItem = e.target.closest('.tab-item');
        if (tabItem) {
            const tabId = parseInt(tabItem.getAttribute("data-id"));
            chrome.tabs.update(tabId, { active: true }, () => {
                window.close();
            });
        }
    });
    
    // Sort buttons
    document.getElementById("sort-asc").addEventListener("click", () => {
        currentSortOrder = 'asc';
        chrome.storage.local.set({ sortOrder: currentSortOrder });
        updateSortButtons();
        
        // Reset text color for non-active button
        document.getElementById('sort-desc').style.color = "";
        
        updateTabList();
    });
    
    document.getElementById("sort-desc").addEventListener("click", () => {
        currentSortOrder = 'desc';
        chrome.storage.local.set({ sortOrder: currentSortOrder });
        updateSortButtons();
        
        // Reset text color for non-active button
        document.getElementById('sort-asc').style.color = "";
        
        updateTabList();
    });
    
    // Window expand button
    document.getElementById("expand-toggle").addEventListener("click", () => {
        isExpanded = !isExpanded;
        document.body.classList.toggle('expanded', isExpanded);
        chrome.storage.local.set({ isExpanded: isExpanded });
    });
    
    // Request info update when popup opens
    chrome.runtime.sendMessage({ action: "updateTabs" });
});

/**
 * Update sort button states
 */
function updateSortButtons() {
    // Remove 'active' class from all buttons
    document.querySelectorAll('.sort-button').forEach(btn => {
        btn.classList.remove('active');
        // Reset inline styles
        btn.style.color = "";
        btn.querySelectorAll('span').forEach(span => {
            span.style.color = "";
        });
    });
    
    // Add 'active' class to the active button and force white text
    if (currentSortOrder === 'asc') {
        const ascButton = document.getElementById('sort-asc');
        ascButton.classList.add('active');
        ascButton.style.color = "#ffffff";
        ascButton.querySelectorAll('span').forEach(span => {
            span.style.color = "#ffffff";
        });
    } else if (currentSortOrder === 'desc') {
        const descButton = document.getElementById('sort-desc');
        descButton.classList.add('active');
        descButton.style.color = "#ffffff";
        descButton.querySelectorAll('span').forEach(span => {
            span.style.color = "#ffffff";
        });
    }
}

/**
 * Truncate title to max length
 */
function truncateTitle(title, maxLength = 40) {
    if (!title) return "Tab without title";
    if (title.length <= maxLength) return title;
    return title.substring(0, maxLength) + '...';
}

/**
 * Update tab list
 */
function updateTabList() {
    chrome.storage.local.get(["tabs", "count", "totalMemory", "sleepingCount", "activeCount"], (data) => {
        if (data.tabs) {
            document.getElementById("tab-count").textContent = data.count || 0;
            const tabList = document.getElementById("tab-list");
            tabList.innerHTML = "";
            
            // Display total memory usage
            const totalMemory = data.totalMemory || data.tabs.reduce((total, tab) => total + tab.memoryUsage, 0);
            document.getElementById("total-memory-usage").textContent = totalMemory.toFixed(0) + " MB";
            
            // Display tab counts
            const sleepingTabs = data.sleepingCount !== undefined ? data.sleepingCount : 
                               data.tabs.filter(tab => tab.discarded).length;
            const activeTabs = data.activeCount !== undefined ? data.activeCount : 
                             data.tabs.length - sleepingTabs;
            
            // Update tab counts in UI
            document.getElementById("active-tabs-count").textContent = activeTabs;
            document.getElementById("sleeping-tabs-count").textContent = sleepingTabs;
            
            if (data.tabs.length === 0) {
                tabList.innerHTML = `<div class="tab-item">No open tabs</div>`;
                return;
            }
            
            // Sort tabs if sort option is selected
            let sortedTabs = [...data.tabs];
            if (currentSortOrder === 'asc') {
                sortedTabs.sort((a, b) => a.memoryUsage - b.memoryUsage);
            } else if (currentSortOrder === 'desc') {
                sortedTabs.sort((a, b) => b.memoryUsage - a.memoryUsage);
            }
            
            // Get current tab
            chrome.tabs.query({ active: true, currentWindow: true }, (activeTabs) => {
                const activeTabId = activeTabs.length > 0 ? activeTabs[0].id : null;
                
                // Display tabs
                sortedTabs.forEach(tab => {
                    let tabElement = document.createElement("div");
                    tabElement.className = "tab-item";
                    if (tab.id === activeTabId) {
                        tabElement.classList.add("active-tab");
                    }
                    
                    // Add marker for tabs in sleep mode
                    if (tab.discarded) {
                        tabElement.classList.add("discarded-tab");
                    }
                    
                    tabElement.setAttribute("data-id", tab.id);
                    
                    // Create tab icon (if exists)
                    const iconHtml = tab.favIconUrl ? 
                        `<div class="tab-icon" style="background-image: url('${tab.favIconUrl}')"></div>` :
                        `<div class="tab-icon"></div>`;
                    
                    // Truncate the title if needed
                    const displayTitle = truncateTitle(tab.title, isExpanded ? 60 : 30);
                    
                    // Change sleep button display if tab is already in sleep mode
                    const sleepBtnTitle = tab.discarded ? "Wake up tab" : "Put tab to sleep";
                    const sleepBtnIcon = tab.discarded ? "⏰" : "🛏️";
                    
                    tabElement.innerHTML = `
                        <div class="tab-content">
                            ${iconHtml}
                            <div class="tab-title" title="${tab.title}">
                                ${tab.discarded ? '💤 ' : ''}${displayTitle}
                            </div>
                        </div>
                        <div class="controls">
                            <span class="memory-usage">${tab.memoryUsage}MB</span>
                            <button class="sleep-btn" data-id="${tab.id}" title="${sleepBtnTitle}">${sleepBtnIcon}</button>
                            <button class="close-btn" data-id="${tab.id}" title="Close tab">×</button>
                        </div>
                    `;
                    tabList.appendChild(tabElement);
                });
            });
        } else {
            document.getElementById("tab-list").innerHTML = `<div class="tab-item">No information available</div>`;
        }
    });
}