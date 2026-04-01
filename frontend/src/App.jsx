import { useState } from 'react';
import Login from './pages/Login';
import LMICapture from './pages/LMICapture';

export default function App() {
  const [authed, setAuthed] = useState(() => localStorage.getItem('lmi_auth') === 'true');

  if (!authed) {
    return (
      <div className="min-h-screen bg-gray-50 max-w-lg mx-auto">
        <Login onLogin={() => setAuthed(true)} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 max-w-lg mx-auto">
      <LMICapture />
    </div>
  );
}
