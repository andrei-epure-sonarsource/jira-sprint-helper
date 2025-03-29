// Get a reference to the Forge Bridge API, which enables communication between the
// frontend (running in the user's browser within Jira) and the backend (Forge functions
// running in Atlassian's secure environment), as well as interaction with Jira APIs.

// Wait for Forge API to be available
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM content loaded');
  // Important: The bridge might not be immediately available when DOMContentLoaded fires
  const getBridge = () => {
    console.log('Trying to get bridge, window.forge =', window.forge ? 'exists' : 'missing');
    if (window.forge) {
      console.log('Forge found! Initializing app...');
      initApp(window.forge.bridge);
    } else {
      // Retry after a short delay
      console.log('Forge not found, will retry in 100ms');
      setTimeout(getBridge, 100);
    }
  };
  
  getBridge();
});

// Main application logic moved to a separate function
function initApp(bridge) {
    console.log('initApp called with bridge:', bridge);
    
    const statusDiv = document.getElementById('status');
    const downloadButton = document.getElementById('downloadButton');
    const errorDiv = document.getElementById('error');
    const loaderContainer = document.getElementById('loader-container');
    
    console.log('DOM elements found:', {
      statusDiv: !!statusDiv,
      downloadButton: !!downloadButton,
      errorDiv: !!errorDiv,
      loaderContainer: !!loaderContainer
    });
    
    // Set initial text in case the async function doesn't run
    if (statusDiv) statusDiv.textContent = 'Initializing...';
    
    (async function() {
        try {
            console.log('Starting async function...');
            
            // Get the context from the bridge
            console.log('Getting context...');
            const context = await bridge.getContext();
            console.log('Context received:', context);
            
            // With jira:sprintAction module, the sprint ID is provided in the context
            console.log('Context extension:', context?.extension);
            const sprintId = context?.extension?.sprint?.id;
            console.log('Sprint ID:', sprintId);
            
            if (!sprintId) {
                console.error('No sprint ID found in context');
                if (errorDiv) errorDiv.textContent = 'No sprint ID found in context.';
                if (statusDiv) statusDiv.textContent = 'Error: Could not identify sprint';
                if (loaderContainer) loaderContainer.style.display = 'none';
                return;
            }
            
            if (statusDiv) statusDiv.textContent = `Exporting data for Sprint #${sprintId}...`;
            
            // Invoke the backend function
            console.log('Invoking export-sprint-data with sprintId:', sprintId);
            const csvData = await bridge.invoke('export-sprint-data', { sprintId });
            console.log('Received CSV data:', csvData ? 'yes' : 'no', 'length:', csvData?.length);
            
            if (!csvData) {
                console.error('No CSV data returned from backend');
                if (errorDiv) errorDiv.textContent = 'Failed to retrieve sprint data.';
                if (statusDiv) statusDiv.textContent = 'Export failed';
                return;
            }
            
            // Show the download button
            console.log('Export successful, showing download button');
            if (downloadButton) downloadButton.style.display = 'block';
            if (statusDiv) statusDiv.textContent = 'Export ready!';
            
            // Set up download button click handler
            if (downloadButton) {
                downloadButton.addEventListener('click', () => {
                    console.log('Download button clicked');
                    downloadCSV(csvData, `sprint_${sprintId}_export.csv`);
                });
            }
            
        } catch (error) {
            console.error('Error in sprint export:', error);
            console.error('Error details:', {
                message: error.message,
                stack: error.stack
            });
            if (errorDiv) errorDiv.textContent = `An error occurred: ${error.message || 'Unknown error'}`;
            if (statusDiv) statusDiv.textContent = 'Export failed';
            if (loaderContainer) loaderContainer.style.display = 'none';
        }
    })();
}

// Function to programmatically trigger the download of a CSV file
function downloadCSV(data, filename) {
    console.log('downloadCSV called with filename:', filename, 'data length:', data.length);
    const csvFile = new Blob([data], { type: 'text/csv;charset=utf-8;' });
    const downloadLink = document.createElement('a');
    downloadLink.href = URL.createObjectURL(csvFile);
    downloadLink.download = filename;
    document.body.appendChild(downloadLink);
    console.log('Triggering download');
    downloadLink.click();
    document.body.removeChild(downloadLink);
}