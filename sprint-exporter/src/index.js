// Import the Forge API modules that we need.
// 'requestJira' is for making authenticated HTTP requests to Jira REST APIs.
import { requestJira } from '@forge/api';

// Define the Forge function that will be called from the frontend (script.js)
// when the user clicks the "Export to CSV" button.
export const exportSprintData = async (req) => {
  console.log('Backend function called with payload:', req.payload);

  try {
    // The sprint ID will come directly from the context when using sprintAction with function
    const sprintId = req.context.extension.sprint.id;

    console.log('Received sprintId from context:', sprintId);

    if (!sprintId) {
      console.error('Sprint ID not found in context');
      return { 
        statusCode: 400,
        body: JSON.stringify({ error: 'No sprint ID found' }) 
      };
    }

    console.log('Fetching issues for sprint', sprintId);

    // Use the Forge Bridge's 'requestJira' API to call the Jira Agile API endpoint
    // to get all issues that are part of the specified sprint.
    const issueKeysResponse = await requestJira(`/rest/agile/1.0/sprint/${sprintId}/issue`);
    const issueKeysData = await issueKeysResponse.json();
    // Extract an array of issue keys from the response data.
    const issueKeys = issueKeysData.issues.map(issue => issue.key);

    // If the sprint has no issues, return an empty CSV header row.
    if (issueKeys.length === 0) {
      return {
        body: 'Ticket ID,Parent Ticket ID,Ticket URL,Ticket Title\n',
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="sprint_${sprintId}_export.csv"`
        }
      };
    }

    // Construct a JQL (Jira Query Language) query to find all the issues in the sprint
    // AND their sub-tasks. We use 'key IN (...)' to find the issues directly in the sprint
    // and 'parent IN (...)' to find any sub-tasks of those issues.
    const jql = `key IN (${issueKeys.join(',')}) OR parent IN (${issueKeys.join(',')})`;

    // Use the Forge Bridge's 'requestJira' API again, this time calling the Jira REST API
    // search endpoint to retrieve detailed information about the issues found by the JQL query.
    const searchResponse = await requestJira(`/rest/api/3/search`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      // The 'body' of the POST request contains the JQL query, the fields we want to retrieve
      // ('summary' and 'parent'), and an 'expand' option to include subtasks in the response.
      body: JSON.stringify({
        jql,
        fields: ['summary', 'parent'],
        expand: ['subtasks'],
        maxResults: 100, // Limit the number of results to avoid overwhelming the API. Adjust if needed.
      }),
    });

    const searchData = await searchResponse.json();
    // Initialize an array to store the rows of our CSV data, starting with the header row.
    let csvRows = ['Ticket ID,Parent Ticket ID,Ticket URL,Ticket Title'];

    // Iterate over each issue returned in the search results.
    searchData.issues.forEach(issue => {
      // Construct the URL to view the issue in Jira.
      const issueUrl = `${issue.self.substring(0, issue.self.indexOf('/rest'))}/browse/${issue.key}`;
      // Add a new row to the 'csvRows' array for the current issue.
      // If it's a top-level issue (not a sub-task), the 'Parent Ticket ID' column will be empty.
      csvRows.push(`${issue.key},,${issueUrl},"${issue.fields.summary.replace(/"/g, '""')}"`);

      // Check if the current issue has any sub-tasks (the 'expand' option in the search request includes these).
      if (issue.fields.subtasks && issue.fields.subtasks.length > 0) {
        // Iterate over each sub-task of the current issue.
        issue.fields.subtasks.forEach(subtask => {
          // Construct the URL to view the sub-task in Jira.
          const subtaskUrl = `${subtask.self.substring(0, subtask.self.indexOf('/rest'))}/browse/${subtask.key}`;
          // Add a new row to the 'csvRows' array for the current sub-task.
          // The 'Parent Ticket ID' column will contain the key of the parent issue.
          csvRows.push(`${subtask.key},${issue.key},${subtaskUrl},"${subtask.fields.summary.replace(/"/g, '""')}"`);
        });
      }
    });

    // Add logging before returning
    console.log('Successfully generated CSV with rows:', csvRows.length);

    // Return the CSV data with proper headers to trigger a download
    return {
      body: csvRows.join('\n'),
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="sprint_${sprintId}_export.csv"`
      }
    };

  } catch (error) {
    // Log any errors that occur during the API calls or data processing in the backend.
    console.error('Error in exportSprintData:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || 'Unknown error' })
    };
  }
};