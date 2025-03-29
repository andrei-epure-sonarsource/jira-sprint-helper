import Resolver from '@forge/resolver';
import { requestJira } from '@forge/api';

const resolver = new Resolver();

resolver.define('getSprintData', async (req) => {
  console.log('Request context:', JSON.stringify(req.context, null, 2));
  
  try {
    // Get the sprint ID and project info from the context
    const sprintId = req.context.extension.sprint.id;
    const projectId = req.context.extension.project.id;
    const projectKey = req.context.extension.project.key;
    
    console.log(`Processing sprint ID: ${sprintId} for project: ${projectKey} (${projectId})`);
    
    if (!sprintId) {
      return { error: 'Sprint ID not found in context' };
    }
    
    // Get sprint details using project context
    const sprintResponse = await requestJira(`/rest/agile/1.0/sprint/${sprintId}`);
    const sprintData = await sprintResponse.json();
    console.log('Sprint data retrieved');
    
    // Use JQL to get issues from the specific project and sprint
    const jql = `project = ${projectKey} AND sprint = ${sprintId}`;
    const issuesResponse = await requestJira(`/rest/api/3/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        jql: jql,
        fields: ['summary'],
        maxResults: 100
      })
    });
    
    const issuesData = await issuesResponse.json();
    const issuesCount = issuesData.issues ? issuesData.issues.length : 0;
    console.log(`Found ${issuesCount} issues using JQL: ${jql}`);
    
    // Get the baseUrl for creating issue URLs
    const baseUrl = req.context.localBaseUrl || req.context.extension.baseUrl;
    
    // Format the data for CSV export
    const issues = issuesData.issues ? issuesData.issues.map(issue => {
      const key = issue.key;
      return {
        key: key,
        title: issue.fields.summary,
        url: `${baseUrl}/browse/${key}`
      };
    }) : [];
    
    return {
      sprint: {
        id: sprintId,
        name: sprintData.name
      },
      project: {
        id: projectId,
        key: projectKey
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