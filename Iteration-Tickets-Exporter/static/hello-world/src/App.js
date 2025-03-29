import React, { useEffect, useState } from 'react';
import { view, requestJira } from '@forge/bridge';
import './App.css';

function App() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sprintData, setSprintData] = useState(null);
  
  useEffect(() => {
    const fetchDataDirectly = async () => {
      try {
        // Get context first 
        const context = await view.getContext();
        console.log('Context received:', context);
        
        // Extract sprint ID directly from context
        const sprintId = context?.extension?.sprint?.id;
        if (!sprintId) {
          throw new Error('Could not determine sprint ID');
        }
        
        console.log('Using sprint ID:', sprintId);
        
        // Make direct API calls from frontend using Forge bridge
        const sprintResponse = await requestJira(`/rest/agile/1.0/sprint/${sprintId}`);
        const sprint = await sprintResponse.json();
        console.log('Sprint data:', sprint);
        
        // Get issues with issuetype and parent fields
        const issuesResponse = await requestJira(
          `/rest/agile/1.0/sprint/${sprintId}/issue?maxResults=100&fields=summary,issuetype,parent`
        );
        const issuesData = await issuesResponse.json();
        console.log('Issue data:', issuesData);
        
        // Get Jira instance URL from context
        let baseUrl;

        // Try several methods to get the correct base URL
        if (context.extension?.baseUrl) {
          // This is most reliable for most Forge apps
          baseUrl = context.extension.baseUrl;
        } else if (context.siteUrl) {
          // Fallback to siteUrl if available
          baseUrl = context.siteUrl;
        } else if (context.cloudId) {
          // Try to use displayName if available with cloudId
          const instanceName = context.displayName || context.cloudId;
          baseUrl = `https://${instanceName}.atlassian.net`;
        } else {
          // Last resort fallback
          baseUrl = 'https://atlassian.net';
        }

        // Remove trailing slash if present
        baseUrl = baseUrl.replace(/\/$/, '');

        console.log('Using base URL:', baseUrl);
        
        // Format the data for CSV with parent info
        const issues = issuesData.issues ? issuesData.issues.map(issue => {
          const key = issue.key;
          const isSubtask = issue.fields.issuetype?.subtask || false;
          const parentKey = isSubtask ? issue.fields.parent?.key || null : null;
          
          return {
            key: key,
            title: issue.fields.summary,
            parentKey: parentKey,
            isSubtask: isSubtask,
            url: `${baseUrl}/browse/${key}`
          };
        }) : [];
        
        // Set state with all the data we need
        setSprintData({
          sprint: {
            id: sprintId,
            name: sprint.name
          },
          issues: issues
        });
        
      } catch (error) {
        console.error('Error:', error);
        setError(error.message || 'An unknown error occurred');
      } finally {
        setLoading(false);
      }
    };
    
    fetchDataDirectly();
  }, []);
  
  const handleExport = () => {
    if (!sprintData || !sprintData.issues) return;
    
    // Generate CSV with parent info column
    const headers = ['Key', 'Title', 'Parent ID', 'URL'];
    const rows = sprintData.issues.map(issue => [
      issue.key,
      issue.title,
      issue.parentKey || '', // Empty string for non-subtasks
      issue.url
    ].map(value => `"${String(value).replace(/"/g, '""')}"`).join(','));
    
    const csvContent = [headers.join(','), ...rows].join('\n');
    
    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `sprint-${sprintData.sprint.id}-export.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  return (
    <div className="container">
      <h2>Sprint Tickets Exporter</h2>
      
      {loading && (
        <div className="loading">
          <div className="spinner"></div>
          <p>Loading sprint data...</p>
        </div>
      )}
      
      {error && (
        <div className="error">
          <p>Error: {error}</p>
        </div>
      )}
      
      {sprintData && (
        <div className="content">
          <h3>{sprintData.sprint.name}</h3>
          <p>Found {sprintData.issues.length} issues in this sprint</p>
          
          <button 
            className="export-button" 
            onClick={handleExport}
            disabled={sprintData.issues.length === 0}
          >
            Export to CSV
          </button>
          
          {sprintData.issues.length > 0 && (
          <div className="issues-preview">
            <h4>Issues: ({sprintData.issues.length})</h4>
            <div className="issues-scrollable">
              <ul>
                {sprintData.issues.map(issue => (
                  <li key={issue.key} className={issue.isSubtask ? 'subtask' : ''}>
                    <strong>{issue.key}</strong>: {issue.title}
                    {issue.isSubtask && <span className="parent-info"> (Subtask of: {issue.parentKey})</span>}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          )}
        </div>
      )}
    </div>
  );
}

export default App;