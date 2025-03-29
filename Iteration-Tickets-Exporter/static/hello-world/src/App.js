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
        
        // Get issues directly
        const issuesResponse = await requestJira(`/rest/agile/1.0/sprint/${sprintId}/issue?maxResults=100&fields=summary`);
        const issuesData = await issuesResponse.json();
        console.log('Issue data:', issuesData);
        
        // Determine base URL for links
        const baseUrl = context.cloudId 
          ? `https://${context.cloudId}.atlassian.net` 
          : 'https://atlassian.net';
        
        // Format the data for CSV
        const issues = issuesData.issues ? issuesData.issues.map(issue => {
          return {
            key: issue.key,
            title: issue.fields.summary,
            url: `${baseUrl}/browse/${issue.key}`
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
    
    // Generate CSV
    const headers = ['Key', 'Title', 'URL'];
    const rows = sprintData.issues.map(issue => [
      issue.key,
      issue.title,
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
              <h4>Issues:</h4>
              <ul>
                {sprintData.issues.slice(0, 5).map(issue => (
                  <li key={issue.key}>
                    <strong>{issue.key}</strong>: {issue.title}
                  </li>
                ))}
                {sprintData.issues.length > 5 && (
                  <li className="more-issues">...and {sprintData.issues.length - 5} more</li>
                )}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default App;