document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM content loaded');
  
  const statusDiv = document.getElementById('status');
  const errorDiv = document.getElementById('error');
  const loaderContainer = document.getElementById('loader-container');
  const downloadButton = document.getElementById('downloadButton');
  
  if (statusDiv) statusDiv.textContent = 'Initializing...';
  
  // The bridge should be available as a global variable from the script tag
  const bridgeScriptLoaded = typeof window.bridgeImport !== 'undefined';
  console.log('Bridge script loaded:', bridgeScriptLoaded);
  
  // Try to get the bridge from the global variable or from window.forge
  const bridge = window.bridgeImport || (window.forge && window.forge.bridge);
  
  if (!bridge) {
    console.error('Bridge not available');
    if (errorDiv) errorDiv.textContent = 'Could not connect to Forge - try refreshing the page.';
    if (statusDiv) statusDiv.textContent = 'Connection error';
    return;
  }
  
  console.log('Bridge found, getting context...');
  
  // Use the bridge to get context
  bridge.getContext()
    .then(context => {
      console.log('Context:', context);
      
      // Extract sprint ID from context
      const sprintId = context?.extension?.sprint?.id;
      console.log('Sprint ID:', sprintId);
      
      if (!sprintId) {
        throw new Error('Could not determine sprint ID');
      }
      
      if (statusDiv) statusDiv.textContent = `Processing Sprint #${sprintId}...`;
      
      // Call the backend function
      return bridge.invoke('export-sprint-data', { sprintId });
    })
    .then(result => {
      console.log('Function call succeeded');
      
      if (loaderContainer) loaderContainer.style.display = 'none';
      if (statusDiv) statusDiv.textContent = 'Export complete!';
      
      if (downloadButton) {
        downloadButton.style.display = 'block';
        downloadButton.onclick = () => downloadCSV(result, 'sprint_export.csv');
      }
    })
    .catch(error => {
      console.error('Error:', error);
      if (statusDiv) statusDiv.textContent = 'Error occurred';
      if (errorDiv) errorDiv.textContent = error.message || 'Unknown error';
      if (loaderContainer) loaderContainer.style.display = 'none';
    });
});

// Function to programmatically trigger the download of a CSV file
function downloadCSV(data, filename) {
  const blob = new Blob([data], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Add script to load the bridge from CDN if it's missing
if (!window.forge) {
  console.log('Adding bridge script from CDN');
  try {
    // Store the imported bridge in a global variable
    window.bridgeImport = require('@forge/bridge');
    console.log('Bridge imported via require');
  } catch (e) {
    console.error('Failed to import bridge:', e);
  }
}