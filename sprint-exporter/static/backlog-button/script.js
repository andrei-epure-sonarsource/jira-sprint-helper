// Get a reference to the Forge Bridge API, which enables communication between the
// frontend (running in the user's browser within Jira) and the backend (Forge functions
// running in Atlassian's secure environment), as well as interaction with Jira APIs.

// Wait for Forge API to be available
document.addEventListener('DOMContentLoaded', () => {
  // Important: The bridge might not be immediately available when DOMContentLoaded fires
  const getBridge = () => {
    if (window.forge) {
      initApp(window.forge.bridge);
    } else {
      // Retry after a short delay
      setTimeout(getBridge, 100);
    }
  };
  
  getBridge();
});

// Main application logic moved to a separate function
function initApp(bridge) {
    const statusDiv = document.getElementById('status');
    const downloadButton = document.getElementById('downloadButton');
    const errorDiv = document.getElementById('error');
    
    (async function() {
        try {
            // Get the context from the bridge
            const context = await bridge.getContext();
            
            // With jira:sprintAction module, the sprint ID is provided in the context
            const sprintId = context.extension.sprint.id;
            
            if (!sprintId) {
                errorDiv.textContent = 'No sprint ID found in context.';
                statusDiv.textContent = 'Error: Could not identify sprint';
                return;
            }
            
            statusDiv.textContent = `Exporting data for Sprint #${sprintId}...`;
            
            // Invoke the backend function
            const csvData = await bridge.invoke('export-sprint-data', { sprintId });
            
            if (!csvData) {
                errorDiv.textContent = 'Failed to retrieve sprint data.';
                statusDiv.textContent = 'Export failed';
                return;
            }
            
            // Show the download button
            downloadButton.style.display = 'block';
            statusDiv.textContent = 'Export ready!';
            
            // Set up download button click handler
            downloadButton.addEventListener('click', () => {
                downloadCSV(csvData, `sprint_${sprintId}_export.csv`);
            });
            
            // Automatically trigger download
            downloadCSV(csvData, `sprint_${sprintId}_export.csv`);
            
        } catch (error) {
            console.error('Error in sprint export:', error);
            errorDiv.textContent = `An error occurred: ${error.message || 'Unknown error'}`;
            statusDiv.textContent = 'Export failed';
        }
    })();
}

// Function to programmatically trigger the download of a CSV file
function downloadCSV(data, filename) {
    const csvFile = new Blob([data], { type: 'text/csv;charset=utf-8;' });
    const downloadLink = document.createElement('a');
    downloadLink.href = URL.createObjectURL(csvFile);
    downloadLink.download = filename;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
}