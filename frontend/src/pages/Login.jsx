import { useState } from 'react';

const CREDENTIALS = [
  { user: 'Flipkart', pass: 'Flipkart123', mode: 'full' },
  { user: 'Admin', pass: 'Admin', mode: 'mfg_only' },
];

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    const match = CREDENTIALS.find(
      (c) => c.user === username && c.pass === password,
    );
    if (match) {
      localStorage.setItem('lmi_auth', 'true');
      localStorage.setItem('lmi_capture_mode', match.mode);
      onLogin();
    } else {
      setError('Invalid username or password');
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="bg-[#0065ff] px-4 py-3">
        <span className="text-white font-semibold text-sm tracking-wide">LMI Capture</span>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-sm">
          {/* Logo / Title */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-[#0065ff] rounded-2xl mx-auto mb-4 flex items-center justify-center">
              <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-gray-900">LMI Attribute Capture</h1>
            <p className="text-sm text-gray-500 mt-1">Expiry Management Prototype</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => { setUsername(e.target.value); setError(''); }}
                placeholder="Enter username"
                autoComplete="username"
                autoFocus
                className="w-full px-3 py-2.5 border border-gray-300 rounded-sm text-sm bg-white
                  focus:border-[#0065ff] focus:outline-none placeholder:text-gray-400"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(''); }}
                  placeholder="Enter password"
                  autoComplete="current-password"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-sm text-sm bg-white
                    focus:border-[#0065ff] focus:outline-none placeholder:text-gray-400 pr-10"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 p-1">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    {showPassword
                      ? <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                      : <><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></>
                    }
                  </svg>
                </button>
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-sm">{error}</p>
            )}

            <button type="submit"
              disabled={!username || !password}
              className="w-full py-3 rounded-sm bg-[#0065ff] text-white font-semibold text-sm uppercase tracking-wide
                disabled:opacity-40 disabled:pointer-events-none active:bg-blue-700 transition-colors">
              Login
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
