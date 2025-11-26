// Popup script for the No-Code Error Overlay extension

function checkStatus() {
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    const currentTab = tabs[0];
    const url = currentTab.url;

    // Check if we're on a supported no-code platform
    const supportedDomains = [
      'bubble.io',
      'adalo.com',
      'glideapps.com',
      'airtable.com',
      'notion.so'
    ];

    const isSupported = supportedDomains.some(domain => url.includes(domain));

    const statusDiv = document.getElementById('status');
    if (isSupported) {
      statusDiv.className = 'status active';
      statusDiv.textContent = 'Extension is active on this page. Click to scan for errors.';
      statusDiv.style.cursor = 'pointer';
      statusDiv.onclick = function() {
        // Send message to content script to check for errors
        chrome.tabs.sendMessage(currentTab.id, {action: 'checkErrors'}, function(response) {
          if (response && response.success) {
            statusDiv.textContent = 'Scanning for errors...';
            setTimeout(() => {
              statusDiv.textContent = 'Scan complete. Check the page for overlays.';
            }, 1000);
          }
        });
      };
    } else {
      statusDiv.className = 'status inactive';
      statusDiv.textContent = 'Extension is inactive. Navigate to a supported no-code app to activate.';
      statusDiv.onclick = null;
      statusDiv.style.cursor = 'default';
    }
  });
}

// Initialize status on popup open
document.addEventListener('DOMContentLoaded', function() {
  checkStatus();
});