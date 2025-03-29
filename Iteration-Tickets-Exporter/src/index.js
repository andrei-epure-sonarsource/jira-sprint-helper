import Resolver from '@forge/resolver';
import { requestJira } from '@forge/api';

const resolver = new Resolver();

resolver.define('getSprintData', async (req) => {
  console.log('Request context:', req.context);
  
  try {
    // Get the sprint ID from the context
    const sprintId = req.context.extension.sprint.id;
    console.log('Processing sprint ID:', sprintId);
    
    if (!sprintId) {
      return { 
        error: 'Sprint ID not found in context'
      };
    }
    
    // Get sprint details
    const sprintResponse = await requestJira(`/rest/agile/1.0/sprint/${sprintId}`);
    const sprintData = await sprintResponse.json();
    console.log('Sprint data:', sprintData);
    
    // Get all issues in the sprint
    const issuesResponse = await requestJira(
      `/rest/agile/1.0/sprint/${sprintId}/issue?maxResults=100&fields=summary,status,assignee,issuetype,priority,customfield_10016`
    );
    const issuesData = await issuesResponse.json();
    console.log('Found', issuesData.issues.length, 'issues');
    
    // Format the data for CSV export
    const issues = issuesData.issues.map(issue => ({
      key: issue.key,
      summary: issue.fields.summary,
      status: issue.fields.status?.name || 'No Status',
      assignee: issue.fields.assignee?.displayName || 'Unassigned',
      type: issue.fields.issuetype?.name || 'Unknown',
      priority: issue.fields.priority?.name || 'None',
      storyPoints: issue.fields.customfield_10016 || 0 // Assuming this is the story points field
    }));
    
    return {
      sprint: {
        id: sprintId,
        name: sprintData.name,
        state: sprintData.state,
        startDate: sprintData.startDate,
        endDate: sprintData.endDate,
        goal: sprintData.goal
      },
      issues: issues
    };
    
  } catch (error) {
    console.error('Error fetching sprint data:', error);
    return {
      error: error.message || 'Unknown error fetching sprint data'
    };
  }
});

export const handler = resolver.getDefinitions();