// התקנת התוסף
chrome.runtime.onInstalled.addListener(() => {
    console.log("Tab Manager Extension Installed");
    updateTabsInfo();
});

// עדכון בעת שינויים בטאבים
chrome.tabs.onUpdated.addListener(updateTabsInfo);
chrome.tabs.onRemoved.addListener(updateTabsInfo);
chrome.tabs.onCreated.addListener(updateTabsInfo);
chrome.tabs.onActivated.addListener(updateTabsInfo);

/**
 * אוסף מידע על הטאבים הפתוחים ומאחסן אותו
 */
async function updateTabsInfo() {
    try {
        // קבלת כל הטאבים הפתוחים
        let tabs = await chrome.tabs.query({});
        let tabInfo = [];

        for (let tab of tabs) {
            // נתוני זיכרון מדומים (במציאות אין גישה ישירה לנתוני זיכרון של טאבים)
            let memoryUsage = getEstimatedMemoryUsage(tab);
            
            tabInfo.push({
                id: tab.id,
                title: tab.title || "טאב ללא כותרת",
                url: tab.url,
                favIconUrl: tab.favIconUrl || null,
                memoryUsage: memoryUsage,
                active: tab.active,
                index: tab.index
            });
        }

        // שמירת הנתונים באחסון
        chrome.storage.local.set({ 
            tabs: tabInfo, 
            count: tabs.length,
            lastUpdated: new Date().toISOString()
        });
    } catch (error) {
        console.error("שגיאה בעדכון מידע הטאבים:", error);
    }
}

/**
 * הערכת צריכת זיכרון לפי סוג האתר (מדומה)
 * במציאות אין גישה ישירה לנתוני זיכרון אמיתיים של טאבים
 */
function getEstimatedMemoryUsage(tab) {
    // ברירת מחדל: זיכרון נמוך-בינוני
    let baseMemory = Math.floor(Math.random() * 20 + 25); // 25-45MB
    
    if (!tab.url) return baseMemory;
    
    const url = tab.url.toLowerCase();
    
    // אתרי מדיה (וידאו, מוזיקה) צורכים יותר זיכרון
    if (url.includes("youtube") || 
        url.includes("netflix") || 
        url.includes("spotify") || 
        url.includes("video") || 
        url.includes("music") || 
        url.includes("play")) {
        return Math.floor(Math.random() * 40 + 70); // 70-110MB
    }
    
    // אתרי מדיה חברתית צורכים זיכרון בינוני-גבוה
    if (url.includes("facebook") || 
        url.includes("twitter") || 
        url.includes("instagram") || 
        url.includes("reddit") || 
        url.includes("linkedin") || 
        url.includes("tiktok")) {
        return Math.floor(Math.random() * 30 + 45); // 45-75MB
    }
    
    // אתרי חדשות או אתרים עם הרבה פרסומות
    if (url.includes("news") || 
        url.includes("cnn") || 
        url.includes("bbc") || 
        url.includes("ynet") || 
        url.includes("walla")) {
        return Math.floor(Math.random() * 25 + 40); // 40-65MB
    }
    
    // אתרי קניות ומסחר אלקטרוני
    if (url.includes("amazon") || 
        url.includes("ebay") || 
        url.includes("aliexpress") || 
        url.includes("shop")) {
        return Math.floor(Math.random() * 20 + 35); // 35-55MB
    }
    
    return baseMemory;
}

// טיפול בהודעות מה-popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    try {
        if (message.action === "updateTabs") {
            updateTabsInfo().then(() => {
                sendResponse({ status: "success" });
            });
            return true; // להשאיר את הערוץ פתוח לתשובה מאוחרת
        }
    } catch (error) {
        console.error("שגיאה בטיפול בהודעה:", error);
        sendResponse({ status: "error", message: error.message });
    }
    return true;
});