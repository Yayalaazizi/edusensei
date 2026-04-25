import { useContext } from 'react';
import { AuthContext } from './context/AuthContext';
import { AuthProvider } from './context/AuthProvider';
import AuthPage from './pages/AuthPage';
import ChatPage from './pages/ChatPage';

function AppContent() {
  const { user, loading } = useContext(AuthContext);

  if (loading) return (
    <div style={{
      height: '100vh', display: 'grid', placeItems: 'center',
      background: '#0d0f14', color: '#4f8ef7',
      fontFamily: 'Syne, sans-serif', fontSize: 18
    }}>
      Chargement...
    </div>
  );

  return user ? <ChatPage /> : <AuthPage />;
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}