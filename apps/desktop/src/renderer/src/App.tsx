import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { CalendarDashboard } from './components/dashboard/CalendarDashboard';
import { MascotOverlay } from './components/mascot/MascotOverlay';

function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/dashboard" element={<CalendarDashboard />} />
        <Route path="/mascot" element={<MascotOverlay />} />
        {/* Default redirect to dashboard just in case */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </HashRouter>
  );
}

export default App;
