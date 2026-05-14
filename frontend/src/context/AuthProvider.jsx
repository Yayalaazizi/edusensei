import { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase/firebaseConfig';
import { getUser, logoutUser } from '../services/api';
import { AuthContext } from './AuthContext';

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
  if (firebaseUser && firebaseUser.emailVerified) {
    const profile = await getUser(firebaseUser.uid);
    setUser(profile);
  } else {
    setUser(null);
  }
  setLoading(false);
});
    return unsub; // cleanup on unmount
  }, []);

  const login = () => {}; // onAuthStateChanged handles it automatically

  const logout = async () => {
    await logoutUser();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}