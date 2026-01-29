import React from 'react';
import JobApplications from './JobApplications'; // ✅ Import the "Smart" container

function App() {
  return (
    <div className="App">
      {/* JobApplications already contains the Navbar, Dashboard, and Logic */}
      <JobApplications /> 
    </div>
  );
}

export default App;