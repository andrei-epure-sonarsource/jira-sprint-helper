// Get a reference to the Forge Bridge API, which enables communication between the
// frontend (running in the user's browser within Jira) and the backend (Forge functions
// running in Atlassian's secure environment), as well as interaction with Jira APIs.
const bridge = window.forge.bridge;

document.addEventListener('DOMContentLoaded', () => {
  const exportButton = document.getElementById('exportButton');
  const loadingDiv = document.getElementById('loading');
  const errorDiv = document.getElementById('error');

  // Function to extract the Scrum Board ID from the URL when viewing a Scrum Board's backlog.
  async function getCurrentScrumBoardIdFromContext(projectId) {
    try {
      const currentUrl = window.location.pathname;
      const urlParts = currentUrl.split('/');

      // Check if we are on a path that looks like a Scrum board's backlog.
      // The pattern is typically '/jira/software/c/projects/{projectId}/boards/{boardId}/backlog'.
      const isScrumBoardBacklog =
        urlParts.includes('jira') &&
        urlParts.includes('software') &&
        urlParts.includes('c') &&
        urlParts.includes('projects') &&
        urlParts.includes('boards') &&
        urlParts.includes('backlog') &&
        urlParts.indexOf('projects') + 1 < urlParts.length &&
        urlParts.indexOf('boards') + 1 < urlParts.length &&
        urlParts[urlParts.indexOf('projects') + 1] === projectId; // Ensure the project ID matches.

      if (isScrumBoardBacklog) {
        // Extract the board ID, which is the element after 'boards' in the URL.
        const boardIdIndex = urlParts.indexOf('boards') + 1;
        if (boardIdIndex < urlParts.length) {
          const boardIdFromUrl = urlParts[boardIdIndex];
          return parseInt(boardIdFromUrl, 10); // Parse it as an integer ID.
        }
      }
      else {
        console.error('Expected format for Scrum Board backlog URL not found.');
        console.error('URL:', currentUrl);
        console.error('Expected Project ID:', projectId);
      }

      // If the URL doesn't match the Scrum board backlog pattern, return null.
      return null;
    } catch (error) {
      console.error('Error processing URL:', error);
      return null;
    }
  }

  // Asynchronous function to fetch the first future or active sprint ID for a given Scrum Board ID.
  async function getFirstFutureOrActiveSprintId(boardId) {
    try {
      // Use the Forge Bridge's requestJira API to call the Jira Agile API endpoint
      // to get sprints for the specific 'boardId'. We request both active and future sprints.
      const sprintsResponse = await bridge.requestJira(`/rest/agile/1.0/board/${boardId}/sprint?state=active,future`);
      const sprintsData = await sprintsResponse.json();

      if (sprintsData.values && sprintsData.values.length > 0) {
        const futureSprints = sprintsData.values.filter(sprint => sprint.state === 'future');
        if (futureSprints.length > 0) {
          return futureSprints[0].id;
        } else {
          const activeSprints = sprintsData.values.filter(sprint => sprint.state === 'active');
          if (activeSprints.length > 0) {
            return activeSprints[0].id;
          }
        }
      }
      return null;
    } catch (error) {
      console.error('Error fetching sprint ID for board:', error);
      return null;
    }
  }

  // This event listener ensures that the JavaScript code inside the function will only run
  // after the entire HTML document has been fully loaded and parsed by the browser. This prevents
  // errors that might occur if the script tries to access HTML elements that haven't been created yet.
  exportButton.addEventListener('click', async () => {
    exportButton.disabled = true;
    loadingDiv.style.display = 'block';
    errorDiv.textContent = '';

    try {
      // Use the Forge Bridge to get the context, which includes the current project ID.
      const context = await bridge.getContext();
      const projectId = context.platformContext.container.project.id;
      // Call our function to get the Scrum Board ID from the URL.
      const currentScrumBoardId = await getCurrentScrumBoardIdFromContext(projectId);

      if (!currentScrumBoardId) {
        errorDiv.textContent = 'This button only works when viewing the backlog of a Scrum Board.';
        return;
      }

      const targetSprintId = await getFirstFutureOrActiveSprintId(currentScrumBoardId);
      if (!targetSprintId) {
        errorDiv.textContent = 'No future or active sprint found on the current Scrum Board.';
        return;
      }

      // Use the Forge Bridge to call the backend function 'export-sprint-data', passing the target sprint ID.
      const csvData = await bridge.invoke('export-sprint-data', { sprintId: targetSprintId });

      if (csvData) {
        downloadCSV(csvData, `sprint_${targetSprintId}_estimation_data.csv`);
      } else {
        errorDiv.textContent = 'Failed to retrieve sprint data.';
      }
    } catch (error) {
      console.error('Error exporting sprint data:', error);
      errorDiv.textContent = 'An unexpected error occurred.';
    } finally {
      exportButton.disabled = false;
      loadingDiv.style.display = 'none';
    }
  });

  // Function to programmatically trigger the download of a CSV file.
  function downloadCSV(data, filename) {
    const csvFile = new Blob([data], { type: 'text/csv;charset=utf-8;' });
    const downloadLink = document.createElement('a');
    downloadLink.href = URL.createObjectURL(csvFile);
    downloadLink.download = filename;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
  }
});