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
    
    // Get all issues in the sprint - just requesting summary field
    const issuesResponse = await requestJira(
      `/rest/agile/1.0/sprint/${sprintId}/issue?maxResults=100&fields=summary`
    );
    const issuesData = await issuesResponse.json();
    console.log('Found', issuesData.issues.length, 'issues');
    
    // Get the baseUrl from context for creating issue URLs
    const baseUrl = req.context.localBaseUrl;
    
    // Format the data for CSV export - simplified to just key, title, and URL
    const issues = issuesData.issues.map(issue => {
      const key = issue.key;
      return {
        key: key,
        title: issue.fields.summary,
        url: `${baseUrl}/browse/${key}`
      };
    });
    
    return {
      sprint: {
        id: sprintId,
        name: sprintData.name
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