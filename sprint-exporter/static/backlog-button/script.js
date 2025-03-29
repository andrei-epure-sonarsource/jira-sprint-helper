// Get a reference to the Forge Bridge API, which enables communication between the
// frontend (running in the user's browser within Jira) and the backend (Forge functions
// running in Atlassian's secure environment), as well as interaction with Jira APIs.
const bridge = window.forge.bridge;

// This event listener ensures that the JavaScript code inside the function will only run
// after the entire HTML document has been fully loaded and parsed by the browser. This prevents
// errors that might occur if the script tries to access HTML elements that haven't been created yet.
document.addEventListener('DOMContentLoaded', () => {
  // Get references to the specific HTML elements in our 'index.html' file using their unique IDs.
  const exportButton = document.getElementById('exportButton');
  const loadingDiv = document.getElementById('loading');
  const errorDiv = document.getElementById('error');

  // Add a 'click' event listener to the 'exportButton'. When the user clicks this button,
  // the asynchronous function provided as the second argument will be executed. The 'async' keyword
  // allows us to use 'await' inside the function to handle promises in a more readable way.
  exportButton.addEventListener('click', async () => {
    // Disable the button immediately after it's clicked to prevent the user from clicking it multiple
    // times before the export process is complete.
    exportButton.disabled = true;
    // Make the 'loadingDiv' visible to indicate to the user that the export process has started
    // and is currently running.
    loadingDiv.style.display = 'block';
    // Clear any existing text content in the 'errorDiv', ensuring that any previous error messages
    // are no longer displayed.
    errorDiv.textContent = '';

    try {
      // Use the Forge Bridge to retrieve contextual information about where the app is being used.
      // This includes details about the Jira instance, the currently viewed project, and the user.
      const context = await bridge.getContext();
      // From the retrieved context, extract the ID of the currently viewed Jira project.
      const projectId = context.platformContext.container.project.id;

      // Call the asynchronous function 'getCurrentScrumBoardId' to fetch the ID of the first
      // Scrum board associated with the current project. We 'await' the result, meaning the
      // script will pause here until the promise returned by 'getCurrentScrumBoardId' resolves.
      const scrumBoardId = await getCurrentScrumBoardId(projectId);

      // Check if a Scrum board ID was successfully retrieved.
      if (!scrumBoardId) {
        errorDiv.textContent = 'Could not identify a Scrum Board for this project.';
        return;
      }

      // Call the asynchronous function 'getFirstFutureOrActiveSprintId' to fetch the ID of the
      // first future or active sprint on the identified Scrum board. We pass the 'scrumBoardId'
      // to this function and 'await' its result.
      const targetSprintId = await getFirstFutureOrActiveSprintId(scrumBoardId);

      // Check if a target sprint ID was successfully retrieved.
      if (!targetSprintId) {
        errorDiv.textContent = 'No future or active sprint found on the current Scrum Board.';
        return;
      }

      // Use the Forge Bridge to call the backend Forge function named 'exportSprintData'.
      // We pass an object as the payload, containing the 'sprintId' of the target sprint.
      // The backend function will process this ID to fetch the relevant issue data. We 'await'
      // the result, which should be the CSV data as a string.
      const csvData = await bridge.call('exportSprintData', { sprintId: targetSprintId });

      // Check if the backend function successfully returned CSV data.
      if (csvData) {
        downloadCSV(csvData, `sprint_${targetSprintId}_estimation_data.csv`);
      } else {
        errorDiv.textContent = 'Failed to retrieve sprint data.';
      }
    } catch (error) {
      // This 'catch' block will handle any exceptions that might occur within the 'try' block,
      // such as network errors during API calls or errors in the backend function.
      // Log the error to the browser's console for debugging purposes.
      console.error('Error exporting sprint data:', error);
      // Display a generic error message to the user in the 'errorDiv'.
      errorDiv.textContent = 'An unexpected error occurred. Read console logs for details.';
    } finally {
      // The 'finally' block will always execute, regardless of whether an error occurred or not.
      // It's used here to reset the UI state: re-enable the export button and hide the loading indicator.
      exportButton.disabled = false;
      loadingDiv.style.display = 'none';
    }
  });

  // Asynchronous function to fetch the ID of the first Scrum Board associated with a given project ID.
  async function getCurrentScrumBoardId(projectId) {
    try {
      // Use the Forge Bridge to make a request to the Jira Agile API endpoint for retrieving boards
      // associated with the provided 'projectId'.
      const response = await bridge.requestJira(`/rest/agile/1.0/board?projectIdOrKey=${projectId}`);
      // Parse the JSON response from the API into a JavaScript object.
      const boardsData = await response.json();

      // Check if the 'values' property exists in the response data and if it contains any board objects.
      if (boardsData.values && boardsData.values.length > 0) {
        // Filter the array of boards to find only those where the 'type' property is equal to 'scrum'.
        const scrumBoards = boardsData.values.filter(board => board.type === 'scrum');
        // Check if any Scrum boards were found after filtering.
        if (scrumBoards.length > 0) {
          // For simplicity, we assume the first Scrum board in the filtered array is the one we want.
          // Return its 'id'. In a more complex scenario, you might need to provide a way for the
          // user to select a specific Scrum board if multiple exist.
          return scrumBoards[0].id;
        }
      }
      // If no Scrum boards were found for the project, return null.
      return null;
    } catch (error) {
      // Log any errors that occur during the API call for debugging.
      console.error('Error fetching Scrum Board ID:', error);
      return null;
    }
  }

  // Asynchronous function to fetch the ID of the first future or active sprint on a given Scrum Board ID.
  async function getFirstFutureOrActiveSprintId(boardId) {
    try {
      // Use the Jira Agile API to get the active and future sprints for the given 'boardId'.
      const sprintsResponse = await bridge.requestJira(`/rest/agile/1.0/board/${boardId}/sprint?state=active,future`);
      // Parse the JSON response into a JavaScript object.
      const sprintsData = await sprintsResponse.json();

      // Check if the 'values' property exists and contains any sprint objects.
      if (sprintsData.values && sprintsData.values.length > 0) {
        // Filter the sprints to find those with the state 'future'.
        const futureSprints = sprintsData.values.filter(sprint => sprint.state === 'future');
        // If there are one or more future sprints, return the ID of the first one.
        // If multiple future sprints exist, you might want to provide a selection mechanism.
        if (futureSprints.length > 0) {
          return futureSprints[0].id;
        } else {
          // If no future sprints were found, filter for sprints with the state 'active'.
          const activeSprints = sprintsData.values.filter(sprint => sprint.state === 'active');
          // If there are one or more active sprints, return the ID of the first one as a fallback.
          // You might want to adjust or remove this fallback based on your specific requirements.
          if (activeSprints.length > 0) {
            return activeSprints[0].id;
          }
        }
      }
      // If no active or future sprints were found on the board, return null.
      return null;
    } catch (error) {
      // Log any errors that occur during the API call.
      console.error('Error fetching sprint ID for board:', error);
      return null;
    }
  }

  // Function to programmatically trigger the download of a CSV file in the user's browser.
  function downloadCSV(data, filename) {
    // Create a new Blob object containing the CSV data and specifying its MIME type
    // as 'text/csv' with UTF-8 encoding.
    const csvFile = new Blob([data], { type: 'text/csv;charset=utf-8;' });
    // Create a temporary 'a' (anchor) element in the document.
    const downloadLink = document.createElement('a');
    // Set the 'href' attribute of the anchor element to a URL that represents the Blob object.
    // 'URL.createObjectURL' creates a temporary URL that points to the data in the Blob.
    downloadLink.href = URL.createObjectURL(csvFile);
    // Set the 'download' attribute of the anchor element to the desired filename for the downloaded file.
    downloadLink.download = filename;
    // Append the temporary anchor element to the end of the document body.
    document.body.appendChild(downloadLink);
    // Programmatically simulate a click on the anchor element to trigger the download.
    downloadLink.click();
    // Remove the temporary anchor element from the document body, as it's no longer needed.
    document.body.removeChild(downloadLink);
  }
});