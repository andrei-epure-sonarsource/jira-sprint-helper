document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM content loaded');
  
  const statusDiv = document.getElementById('status');
  const errorDiv = document.getElementById('error');
  const loaderContainer = document.getElementById('loader-container');
  const downloadButton = document.getElementById('downloadButton');
  
  if (statusDiv) statusDiv.textContent = 'Initializing...';
  
  // Log all available globals for debugging
  console.log('Window object keys:', Object.keys(window));
  
  // In Forge apps, the bridge might be directly in window.bridge
  const bridge = window.bridge;
  
  if (!bridge) {
    console.error('Bridge not available - check window properties above');
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
        downloadButton.onclick = () => downloadCSV(result, `sprint_${sprintId}_export.csv`);
      }
    })
    .catch(error => {
      console.error('Error:', error);
      if (statusDiv) statusDiv.textContent = 'Error occurred';
      if (errorDiv) errorDiv.textContent = error.message || 'Unknown error';
      if (loaderContainer) loaderContainer.style.display = 'none';
    });
});

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