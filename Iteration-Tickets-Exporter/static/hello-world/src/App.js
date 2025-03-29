import React, { useEffect, useState } from 'react';
import { invoke, view } from '@forge/bridge';
import './App.css';

function App() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sprintData, setSprintData] = useState(null);
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Get context first to ensure it's correctly retrieved by the bridge
        const context = await view.getContext();
        console.log('Context received:', context);
        
        // Call resolver (no parameters needed - it will use context)
        const result = await invoke('getSprintData');
        console.log('Data received:', result);
        
        if (result.error) {
          throw new Error(result.error);
        }
        
        setSprintData(result);
      } catch (error) {
        console.error('Error:', error);
        setError(error.message || 'Unknown error occurred');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
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