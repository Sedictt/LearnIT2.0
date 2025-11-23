import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { DeckView } from './pages/DeckView';
import { LiveSession } from './pages/LiveSession';
import { FeedbackView } from './pages/FeedbackView';
import { Profile } from './pages/Profile';

function App() {
  return (
    <HashRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/deck/:id" element={<DeckView />} />
          <Route path="/play/:sessionId" element={<LiveSession />} />
          <Route path="/feedback" element={<FeedbackView />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </HashRouter>
  );
}

export default App;
