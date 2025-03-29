// Get a reference to the Forge Bridge API, which enables communication between the
// frontend (running in the user's browser within Jira) and the backend (Forge functions
// running in Atlassian's secure environment), as well as interaction with Jira APIs.

// Wait for Forge API to be available
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM content loaded');
  
  const statusDiv = document.getElementById('status');
  const errorDiv = document.getElementById('error');
  const loaderContainer = document.getElementById('loader-container');
  const downloadButton = document.getElementById('downloadButton');
  
  // Verify what's available in the global scope
  console.log('Window object keys:', Object.keys(window));
  
  if (statusDiv) statusDiv.textContent = 'Checking for Forge API...';
  
  // Check if we're running inside Forge properly
  if (!window.forge) {
    console.error('Not running in Forge environment - window.forge is missing');
    if (errorDiv) errorDiv.textContent = 'This app must run inside Atlassian Forge.';
    if (statusDiv) statusDiv.textContent = 'Environment error';
    return;
  }
  
  // Log what's available in the forge object
  console.log('Forge object properties:', Object.keys(window.forge));
  
  // Get the bridge
  const bridge = window.forge.bridge;
  if (!bridge) {
    console.error('Forge bridge is not available');
    if (errorDiv) errorDiv.textContent = 'Forge bridge is not available.';
    if (statusDiv) statusDiv.textContent = 'Bridge error';
    return;
  }
  
  console.log('Bridge found, initializing...');
  
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