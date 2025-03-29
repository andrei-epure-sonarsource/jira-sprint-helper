import Resolver from '@forge/resolver';
import { requestJira } from '@forge/api';

const resolver = new Resolver();

resolver.define('getSprintData', async (req) => {
  console.log('Request payload:', req.payload);
  console.log('Request context:', req.context);
  
  try {
    // Get sprint ID from payload (if provided) or context
    const sprintId = req.payload?.sprintId || req.context?.extension?.sprint?.id;
    
    console.log(`Processing sprint ID: ${sprintId}`);
    
    if (!sprintId) {
      return { error: 'Sprint ID not found' };
    }
    
    // Get sprint details
    const sprintResponse = await requestJira(`/rest/agile/1.0/sprint/${sprintId}`);
    const sprintData = await sprintResponse.json();
    console.log('Sprint data retrieved:', sprintData.name);
    
    // Get issues in sprint without project filter
    const issuesResponse = await requestJira(`/rest/agile/1.0/sprint/${sprintId}/issue?maxResults=100&fields=summary`);
    const issuesData = await issuesResponse.json();
    const issuesCount = issuesData.issues ? issuesData.issues.length : 0;
    console.log(`Found ${issuesCount} issues in sprint`);
    
    // Get the baseUrl for creating issue URLs
    const baseUrl = req.context.localBaseUrl || req.context.extension.baseUrl;
    
    // Format the data for CSV export
    const issues = issuesData.issues ? issuesData.issues.map(issue => {
      const key = issue.key;
      return {
        key: key,
        title: issue.fields.summary,
        url: baseUrl ? `${baseUrl}/browse/${key}` : key // Fallback if no baseUrl
      };
    }) : [];
    
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