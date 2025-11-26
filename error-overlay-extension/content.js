// Error patterns and fixes for common no-code platforms
const errorFixes = {
  // Bubble.io errors
  'Workflow error': {
    title: 'Workflow Execution Error',
    explanation: 'This error occurs when a workflow step fails to execute properly.',
    fixes: [
      {
        type: 'workflow',
        title: 'Check Workflow Conditions',
        description: 'Ensure all conditions in your workflow are properly configured.',
        steps: [
          'Go to the Workflow tab',
          'Review each step\'s conditions',
          'Test conditions with sample data'
        ]
      },
      {
        type: 'code',
        title: 'Add Error Handling',
        description: 'Implement error handling in your workflow.',
        code: `// Add this to your workflow step
try {
  // Your workflow logic here
  console.log('Workflow executed successfully');
} catch (error) {
  console.error('Workflow error:', error);
  // Handle the error appropriately
}`
      }
    ]
  },

  'API error': {
    title: 'API Connection Error',
    explanation: 'Unable to connect to external API or service.',
    fixes: [
      {
        type: 'workflow',
        title: 'Verify API Settings',
        description: 'Check your API configuration and authentication.',
        steps: [
          'Go to API Connector',
          'Verify API endpoint URL',
          'Check authentication headers',
          'Test API call manually'
        ]
      },
      {
        type: 'code',
        title: 'Add API Error Handling',
        description: 'Handle API failures gracefully.',
        code: `// Add error handling for API calls
fetch('your-api-endpoint')
  .then(response => {
    if (!response.ok) {
      throw new Error('API request failed');
    }
    return response.json();
  })
  .then(data => {
    // Process successful response
    console.log('API data:', data);
  })
  .catch(error => {
    console.error('API Error:', error);
    // Show user-friendly error message
    alert('Unable to load data. Please try again later.');
  });`
      }
    ]
  },

  // Adalo errors
  'Component error': {
    title: 'Component Rendering Error',
    explanation: 'A component failed to render properly.',
    fixes: [
      {
        type: 'workflow',
        title: 'Check Component Properties',
        description: 'Verify all required properties are set.',
        steps: [
          'Select the problematic component',
          'Check Properties panel',
          'Ensure data sources are connected',
          'Test with different data'
        ]
      }
    ]
  },

  // General errors
  'Database error': {
    title: 'Database Connection Error',
    explanation: 'Unable to connect to or query the database.',
    fixes: [
      {
        type: 'workflow',
        title: 'Check Database Connection',
        description: 'Verify your database settings and permissions.',
        steps: [
          'Go to Database settings',
          'Test connection',
          'Check user permissions',
          'Verify table/column names'
        ]
      }
    ]
  }
};

// Function to detect errors on the page
function detectErrors() {
  // Look for common error patterns in the DOM
  const errorSelectors = [
    '.error', '.alert-error', '.notification-error',
    '[class*="error"]', '[id*="error"]',
    '.bubble-error', '.adalo-error'
  ];

  let foundErrors = [];

  errorSelectors.forEach(selector => {
    const elements = document.querySelectorAll(selector);
    elements.forEach(element => {
      const text = element.textContent.toLowerCase();
      // Check if it contains error keywords
      if (text.includes('error') || text.includes('failed') || text.includes('exception')) {
        foundErrors.push({
          element: element,
          text: element.textContent.trim(),
          selector: selector
        });
      }
    });
  });

  // Also check for error messages in console-like elements
  const consoleSelectors = ['.console', '.log', '.terminal', '[class*="console"]'];
  consoleSelectors.forEach(selector => {
    const elements = document.querySelectorAll(selector);
    elements.forEach(element => {
      const text = element.textContent;
      if (text.includes('Error') || text.includes('Exception') || text.includes('Failed')) {
        foundErrors.push({
          element: element,
          text: text.trim(),
          selector: selector
        });
      }
    });
  });

  return foundErrors;
}

// Function to find matching fix for an error
function findMatchingFix(errorText) {
  const lowerText = errorText.toLowerCase();

  for (const [key, fix] of Object.entries(errorFixes)) {
    if (lowerText.includes(key.toLowerCase())) {
      return fix;
    }
  }

  // Return general debugging tips if no specific match
  return {
    title: 'General Error',
    explanation: 'An error occurred. Here are some general debugging steps.',
    fixes: [
      {
        type: 'workflow',
        title: 'General Debugging Steps',
        description: 'Follow these steps to debug the issue.',
        steps: [
          'Check browser console for detailed error messages',
          'Verify all data connections',
          'Test with different inputs',
          'Check user permissions',
          'Clear browser cache and try again'
        ]
      }
    ]
  };
}

// Function to create and show overlay
function showErrorOverlay(error, fix) {
  // Remove existing overlay if any
  const existingOverlay = document.getElementById('error-overlay');
  if (existingOverlay) {
    existingOverlay.remove();
  }

  // Create overlay HTML
  const overlay = document.createElement('div');
  overlay.id = 'error-overlay';

  overlay.innerHTML = `
    <div class="overlay-content">
      <div class="overlay-header">
        <h3>🚨 Error Detected</h3>
        <button class="close-btn" onclick="this.closest('#error-overlay').remove()">&times;</button>
      </div>

      <div class="error-text">${error.text}</div>

      <div class="fix-section">
        <h4>${fix.title}</h4>
        <p>${fix.explanation}</p>

        ${fix.fixes.map(fixItem => `
          <div class="fix-section">
            <h4>${fixItem.title}</h4>
            <p>${fixItem.description}</p>

            ${fixItem.type === 'workflow' ? `
              <ol>
                ${fixItem.steps.map(step => `<li>${step}</li>`).join('')}
              </ol>
            ` : ''}

            ${fixItem.code ? `
              <pre class="code-snippet">${fixItem.code}</pre>
              <button class="copy-btn" onclick="navigator.clipboard.writeText(\`${fixItem.code.replace(/`/g, '\\`')}\`)">Copy Code</button>
            ` : ''}
          </div>
        `).join('')}
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  // Add click outside to close
  overlay.addEventListener('click', function(e) {
    if (e.target === overlay) {
      overlay.remove();
    }
  });
}

// Main function to check for errors and show overlay
function checkForErrors() {
  const errors = detectErrors();

  if (errors.length > 0) {
    // Show overlay for the first error found
    const error = errors[0];
    const fix = findMatchingFix(error.text);
    showErrorOverlay(error, fix);
  }
}

// Run error detection on page load and periodically
checkForErrors();

// Also check when DOM changes (for dynamic content)
const observer = new MutationObserver(function(mutations) {
  mutations.forEach(function(mutation) {
    if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
      // Small delay to let content settle
      setTimeout(checkForErrors, 1000);
    }
  });
});

observer.observe(document.body, {
  childList: true,
  subtree: true
});

// Listen for messages from popup or background script
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === 'checkErrors') {
    checkForErrors();
    sendResponse({success: true});
  }
});