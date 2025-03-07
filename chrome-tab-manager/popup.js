// מצב המיון הנוכחי
let currentSortOrder = null; // 'asc', 'desc', or null
let isExpanded = false; // האם החלון מורחב

document.addEventListener("DOMContentLoaded", () => {
    // טעינת מצב החלון (מורחב או רגיל)
    chrome.storage.local.get(["isExpanded", "sortOrder"], (data) => {
        // שחזור מצב החלון
        if (data.isExpanded) {
            isExpanded = data.isExpanded;
            if (isExpanded) {
                document.body.classList.add('expanded');
            }
        }
        
        // שחזור מצב המיון
        if (data.sortOrder) {
            currentSortOrder = data.sortOrder;
            updateSortButtons();
        }
    });

    // טעינת והצגת הטאבים
    updateTabList();
    
    // טיפול באירועי לחיצה
    document.getElementById("tab-list").addEventListener("click", (e) => {
        // בדיקה אם לחצו על כפתור
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
            chrome.tabs.discard(tabId, () => {
                updateTabList();
            });
            return;
        }
        
        // אם לחצו על איזור הטאב (לא על כפתור)
        const tabItem = e.target.closest('.tab-item');
        if (tabItem) {
            const tabId = parseInt(tabItem.getAttribute("data-id"));
            chrome.tabs.update(tabId, { active: true }, () => {
                window.close();
            });
        }
    });
    
    // כפתורי מיון
    document.getElementById("sort-asc").addEventListener("click", () => {
        currentSortOrder = 'asc';
        chrome.storage.local.set({ sortOrder: currentSortOrder });
        updateSortButtons();
        updateTabList();
    });
    
    document.getElementById("sort-desc").addEventListener("click", () => {
        currentSortOrder = 'desc';
        chrome.storage.local.set({ sortOrder: currentSortOrder });
        updateSortButtons();
        updateTabList();
    });
    
    // כפתור הרחבת חלון
    document.getElementById("expand-toggle").addEventListener("click", () => {
        isExpanded = !isExpanded;
        document.body.classList.toggle('expanded', isExpanded);
        chrome.storage.local.set({ isExpanded: isExpanded });
    });
    
    // בקשה לעדכון מידע כשהחלונית נפתחת
    chrome.runtime.sendMessage({ action: "updateTabs" });
});

/**
 * עדכון מצב כפתורי המיון
 */
function updateSortButtons() {
    // מחיקת המחלקה 'active' מכל הכפתורים
    document.querySelectorAll('.sort-button').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // הוספת המחלקה 'active' לכפתור הפעיל
    if (currentSortOrder === 'asc') {
        document.getElementById('sort-asc').classList.add('active');
    } else if (currentSortOrder === 'desc') {
        document.getElementById('sort-desc').classList.add('active');
    }
}

/**
 * קיצור כותרת לאורך מקסימלי
 */
function truncateTitle(title, maxLength = 40) {
    if (!title) return "טאב ללא כותרת";
    if (title.length <= maxLength) return title;
    return title.substring(0, maxLength) + '...';
}

/**
 * עדכון רשימת הטאבים
 */
function updateTabList() {
    chrome.storage.local.get(["tabs", "count"], (data) => {
        if (data.tabs) {
            document.getElementById("tab-count").textContent = data.count || 0;
            const tabList = document.getElementById("tab-list");
            tabList.innerHTML = "";
            
            if (data.tabs.length === 0) {
                tabList.innerHTML = `<div class="tab-item">אין טאבים פתוחים</div>`;
                return;
            }
            
            // מיון הטאבים אם נבחר מיון
            let sortedTabs = [...data.tabs];
            if (currentSortOrder === 'asc') {
                sortedTabs.sort((a, b) => a.memoryUsage - b.memoryUsage);
            } else if (currentSortOrder === 'desc') {
                sortedTabs.sort((a, b) => b.memoryUsage - a.memoryUsage);
            }
            
            // קבלת הטאב הנוכחי
            chrome.tabs.query({ active: true, currentWindow: true }, (activeTabs) => {
                const activeTabId = activeTabs.length > 0 ? activeTabs[0].id : null;
                
                // הצגת הטאבים
                sortedTabs.forEach(tab => {
                    let tabElement = document.createElement("div");
                    tabElement.className = "tab-item";
                    if (tab.id === activeTabId) {
                        tabElement.classList.add("active-tab");
                    }
                    tabElement.setAttribute("data-id", tab.id);
                    
                    // יצירת אייקון הטאב (אם יש)
                    const iconHtml = tab.favIconUrl ? 
                        `<div class="tab-icon" style="background-image: url('${tab.favIconUrl}')"></div>` :
                        `<div class="tab-icon"></div>`;
                    
                    // קיצור הכותרת אם צריך
                    const displayTitle = truncateTitle(tab.title, isExpanded ? 60 : 30);
                    
                    tabElement.innerHTML = `
                        <div class="tab-content">
                            ${iconHtml}
                            <div class="tab-title" title="${tab.title}">${displayTitle}</div>
                        </div>
                        <div class="controls">
                            <span class="memory-usage">${tab.memoryUsage}MB</span>
                            <button class="sleep-btn" data-id="${tab.id}" title="העבר למצב שינה">🛏️</button>
                            <button class="close-btn" data-id="${tab.id}" title="סגור טאב">×</button>
                        </div>
                    `;
                    tabList.appendChild(tabElement);
                });
            });
        } else {
            document.getElementById("tab-list").innerHTML = `<div class="tab-item">אין מידע זמין</div>`;
        }
    });
}