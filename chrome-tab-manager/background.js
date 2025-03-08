// Extension installation
chrome.runtime.onInstalled.addListener(() => {
    console.log("Tab Manager Extension Installed");
    updateTabsInfo();
});

// Update on tab changes
chrome.tabs.onUpdated.addListener(updateTabsInfo);
chrome.tabs.onRemoved.addListener(updateTabsInfo);
chrome.tabs.onCreated.addListener(updateTabsInfo);
chrome.tabs.onActivated.addListener(updateTabsInfo);
chrome.tabs.onReplaced.addListener(updateTabsInfo);

/**
 * Collects information about open tabs and stores it
 */
async function updateTabsInfo() {
    try {
        // Get all open tabs
        let tabs = await chrome.tabs.query({});
        let tabInfo = [];

        for (let tab of tabs) {
            // Simulated memory data (in reality, there's no direct access to tab memory data)
            let memoryUsage = tab.discarded ? 
                Math.floor(Math.random() * 5 + 1) : // 1-6MB when tab is in sleep mode
                getEstimatedMemoryUsage(tab);
            
            tabInfo.push({
                id: tab.id,
                title: tab.title || "Tab without title",
                url: tab.url,
                favIconUrl: tab.favIconUrl || null,
                memoryUsage: memoryUsage,
                active: tab.active,
                index: tab.index,
                discarded: tab.discarded || false // Indicator if the tab is in sleep mode
            });
        }

        // Calculate tab stats
        const totalMemoryUsage = tabInfo.reduce((total, tab) => total + tab.memoryUsage, 0);
        const sleepingTabs = tabInfo.filter(tab => tab.discarded).length;
        const activeTabs = tabInfo.length - sleepingTabs;
        
        // Save data to storage
        chrome.storage.local.set({ 
            tabs: tabInfo, 
            count: tabs.length,
            totalMemory: totalMemoryUsage,
            sleepingCount: sleepingTabs,
            activeCount: activeTabs,
            lastUpdated: new Date().toISOString()
        });
    } catch (error) {
        console.error("Error updating tab information:", error);
    }
}

/**
 * Estimate memory usage by website type (simulated)
 * In reality, there's no direct access to actual tab memory data
 */
function getEstimatedMemoryUsage(tab) {
    // Default: low-medium memory
    let baseMemory = Math.floor(Math.random() * 20 + 25); // 25-45MB
    
    if (!tab.url) return baseMemory;
    
    const url = tab.url.toLowerCase();
    
    // Media sites (video, music) consume more memory
    if (url.includes("youtube") || 
        url.includes("netflix") || 
        url.includes("spotify") || 
        url.includes("video") || 
        url.includes("music") || 
        url.includes("play")) {
        return Math.floor(Math.random() * 40 + 70); // 70-110MB
    }
    
    // Social media sites consume medium-high memory
    if (url.includes("facebook") || 
        url.includes("twitter") || 
        url.includes("instagram") || 
        url.includes("reddit") || 
        url.includes("linkedin") || 
        url.includes("tiktok")) {
        return Math.floor(Math.random() * 30 + 45); // 45-75MB
    }
    
    // News sites or sites with many ads
    if (url.includes("news") || 
        url.includes("cnn") || 
        url.includes("bbc") || 
        url.includes("ynet") || 
        url.includes("walla")) {
        return Math.floor(Math.random() * 25 + 40); // 40-65MB
    }
    
    // Shopping and e-commerce sites
    if (url.includes("amazon") || 
        url.includes("ebay") || 
        url.includes("aliexpress") || 
        url.includes("shop")) {
        return Math.floor(Math.random() * 20 + 35); // 35-55MB
    }
    
    return baseMemory;
}

// Handle messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    try {
        if (message.action === "updateTabs") {
            updateTabsInfo().then(() => {
                sendResponse({ status: "success" });
            }).catch(error => {
                console.error("Error updating tab information:", error);
                sendResponse({ status: "error", message: error.message });
            });
            return true; // Keep channel open for later response
        }
    } catch (error) {
        console.error("Error handling message:", error);
        sendResponse({ status: "error", message: error.message });
    }
    return true;
});