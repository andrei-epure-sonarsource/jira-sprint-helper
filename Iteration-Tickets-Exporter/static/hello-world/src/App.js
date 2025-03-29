import React, { useEffect, useState } from 'react';
import { invoke } from '@forge/bridge';
import './App.css';

function App() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sprintData, setSprintData] = useState(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const data = await invoke('getSprintData');
        console.log('Data received from resolver:', data);
        
        if (data.error) {
          throw new Error(data.error);
        }
        
        setSprintData(data);
      } catch (error) {
        console.error('Error fetching data:', error);
        setError(error.message || 'Unknown error');
      } finally {
        setLoading(false);
      }
    }
    
    fetchData();
  }, []);

  const exportCSV = () => {
    if (!sprintData || !sprintData.issues) return;
    
    // Create header row
    const headers = ['Key', 'Summary', 'Status', 'Assignee', 'Type', 'Priority', 'Story Points'];
    
    // Create data rows
    const rows = sprintData.issues.map(issue => [
      issue.key,
      issue.summary,
      issue.status,
      issue.assignee,
      issue.type,
      issue.priority,
      issue.storyPoints
    ].map(value => {
      // Escape quotes and wrap in quotes to handle commas in text
      if (value === null || value === undefined) return '""';
      return `"${String(value).replace(/"/g, '""')}"`;
    }).join(','));
    
    // Combine into CSV content
    const csvContent = [headers.join(','), ...rows].join('\n');
    
    // Create and trigger download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const filename = `sprint-${sprintData.sprint.id}-${sprintData.sprint.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.csv`;
    
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="container">
      <h2>Iteration Tickets Exporter</h2>
      
      {loading && (
        <div className="loading">
          <div className="loader"></div>
          <p>Loading sprint data...</p>
        </div>
      )}
      
      {error && (
        <div className="error">
          <p>Error: {error}</p>
        </div>
      )}
      
      {sprintData && (
        <div className="sprint-info">
          <h3>{sprintData.sprint.name}</h3>
          <p>Status: {sprintData.sprint.state}</p>
          <p>Issues: {sprintData.issues.length}</p>
          
          {sprintData.issues.length > 0 && (
            <button className="export-button" onClick={exportCSV}>
              Export as CSV
            </button>
          )}
          
          <div className="issues-list">
            <h4>Issues in this sprint:</h4>
            <ul>
              {sprintData.issues.slice(0, 10).map(issue => (
                <li key={issue.key}>
                  <strong>{issue.key}</strong>: {issue.summary} ({issue.status})
                </li>
              ))}
              {sprintData.issues.length > 10 && (
                <li>... and {sprintData.issues.length - 10} more</li>
              )}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;