// Get a reference to the Forge Bridge API, which allows communication between the frontend (Custom UI)
// and the backend (Forge functions) and Jira APIs.
const bridge = window.forge.bridge;

// Add an event listener that executes when the entire HTML document has been fully loaded and parsed.
document.addEventListener('DOMContentLoaded', () => {
  // Get references to the HTML elements we will interact with using their IDs.
  const exportButton = document.getElementById('exportButton');
  const loadingDiv = document.getElementById('loading');
  const errorDiv = document.getElementById('error');

  // Add a click event listener to the "Export to CSV" button.
  exportButton.addEventListener('click', async () => {
    // Disable the button to prevent multiple clicks while the export is in progress.
    exportButton.disabled = true;
    // Display the loading indicator to show the user that something is happening.
    loadingDiv.style.display = 'block';
    // Clear any previous error messages.
    errorDiv.textContent = '';

    try {
      // Use the Forge Bridge to retrieve the context in which the app is running.
      // This context contains information about the Jira environment, including the current project.
      const context = await bridge.getContext();
      // Extract the ID of the current Jira project from the context.
      const projectId = context.platformContext.container.project.id;
      // Call the asynchronous function to get the ID of the first future or active sprint in the project.
      const targetSprintId = await getFirstFutureOrActiveSprintId(projectId);

      // Check if a sprint ID was successfully retrieved.
      if (!targetSprintId) {
        // If no future or active sprint was found, display an error message to the user.
        errorDiv.textContent = 'No future or active sprint found for this project.';
        return; // Exit the click event handler.
      }

      // Call the backend Forge function named 'exportSprintData' using the Forge Bridge.
      // Pass the retrieved 'targetSprintId' as data in the payload.
      const csvData = await bridge.call('exportSprintData', { sprintId: targetSprintId });

      // Check if the backend function successfully returned CSV data.
      if (csvData) {
        // If CSV data was received, call the 'downloadCSV' function to trigger the download.
        // The filename will include the sprint ID.
        downloadCSV(csvData, `sprint_${targetSprintId}_estimation_data.csv`);
      } else {
        // If the backend function failed to return data, display an error message.
        errorDiv.textContent = 'Failed to retrieve sprint data.';
      }
    } catch (error) {
      // If any error occurred during the process (e.g., network issues, errors in the backend function),
      // log the error to the console for debugging and display a generic error message to the user.
      console.error('Error exporting sprint data:', error);
      errorDiv.textContent = 'An unexpected error occurred. Check consolea for details.';
    } finally {
      // This block always executes, regardless of whether the 'try' block succeeded or failed.
      // Re-enable the export button.
      exportButton.disabled = false;
      // Hide the loading indicator.
      loadingDiv.style.display = 'none';
    }
  });

  // Asynchronous function to fetch the first future or active sprint ID for a given project.
  async function getFirstFutureOrActiveSprintId(projectId) {
    try {
      // Use the Jira Agile API to get the boards associated with the given project ID.
      const response = await bridge.requestJira(`/rest/agile/1.0/board?projectIdOrKey=${projectId}`);
      const boardsData = await response.json();

      // Check if any boards were found for the project.
      if (boardsData.values && boardsData.values.length > 0) {
        // For simplicity, we assume the first board returned is the relevant one.
        const boardId = boardsData.values[0].id;
        // Use the Jira Agile API to get the active and future sprints for the retrieved board.
        const sprintsResponse = await bridge.requestJira(`/rest/agile/1.0/board/${boardId}/sprint?state=active,future`);
        const sprintsData = await sprintsResponse.json();

        // Check if any sprints (active or future) were found for the board.
        if (sprintsData.values && sprintsData.values.length > 0) {
          // Filter the sprints to find those with the state 'future'.
          const futureSprints = sprintsData.values.filter(sprint => sprint.state === 'future');
          // If there are one or more future sprints, return the ID of the first one.
          // Consider providing a way for the user to select if multiple future sprints exist.
          if (futureSprints.length > 0) {
            return futureSprints[0].id;
          } else {
            // If no future sprints were found, filter for active sprints.
            const activeSprints = sprintsData.values.filter(sprint => sprint.state === 'active');
            // If there are one or more active sprints, return the ID of the first one as a fallback.
            // You might want to adjust or remove this fallback behavior based on your specific needs.
            if (activeSprints.length > 0) {
              return activeSprints[0].id;
            }
          }
        }
      }
      // If no boards or sprints were found, return null.
      return null;
    } catch (error) {
      // Log any errors that occur during the API calls for debugging.
      console.error('Error fetching sprint ID:', error);
      return null;
    }
  }

  // Function to programmatically trigger the download of a CSV file in the user's browser.
  function downloadCSV(data, filename) {
    // Create a new Blob object containing the CSV data with the correct MIME type.
    const csvFile = new Blob([data], { type: 'text/csv;charset=utf-8;' });
    // Create a temporary 'a' (anchor) element.
    const downloadLink = document.createElement('a');
    // Set the 'href' attribute of the anchor element to a URL representing the Blob object.
    downloadLink.href = URL.createObjectURL(csvFile);
    // Set the 'download' attribute to specify the filename for the downloaded file.
    downloadLink.download = filename;
    // Append the temporary anchor element to the document body.
    document.body.appendChild(downloadLink);
    // Programmatically click the anchor element to trigger the download.
    downloadLink.click();
    // Remove the temporary anchor element from the document body.
    document.body.removeChild(downloadLink);
  }
});