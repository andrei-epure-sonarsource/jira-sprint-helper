// Get a reference to the Forge Bridge API, which enables communication between the
// frontend (running in the user's browser within Jira) and the backend (Forge functions
// running in Atlassian's secure environment), as well as interaction with Jira APIs.
const bridge = window.forge.bridge;

document.addEventListener('DOMContentLoaded', async () => {
    const statusDiv = document.getElementById('status');
    const downloadButton = document.getElementById('downloadButton');
    const errorDiv = document.getElementById('error');
    
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
        
        // Store the CSV data for later download
        window.csvExportData = csvData;
        
        // Show the download button
        downloadButton.style.display = 'block';
        statusDiv.textContent = 'Export ready!';
        
        // Set up download button click handler
        downloadButton.addEventListener('click', () => {
            downloadCSV(window.csvExportData, `sprint_${sprintId}_export.csv`);
        });
        
        // Automatically trigger download
        downloadCSV(csvData, `sprint_${sprintId}_export.csv`);
        
    } catch (error) {
        console.error('Error in sprint export:', error);
        errorDiv.textContent = `An error occurred: ${error.message || 'Unknown error'}`;
        statusDiv.textContent = 'Export failed';
    }
});

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