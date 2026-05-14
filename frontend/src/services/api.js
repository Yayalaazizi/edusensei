import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import {
  doc, setDoc, getDoc,
  collection, query, orderBy, getDocs, addDoc, serverTimestamp
} from 'firebase/firestore';
import { auth, db } from '../firebase/firebaseConfig';

// ── Auth ──────────────────────────────────────────────────────────────────────

export const registerUser = async ({ name, email, password, university }) => {
  const { user } = await createUserWithEmailAndPassword(auth, email, password);
  await setDoc(doc(db, 'users', user.uid), {
    name,
    email,
    university,
    createdAt: serverTimestamp(),
  });
  return user;
};

export const loginUser = async ({ email, password }) => {
  const { user } = await signInWithEmailAndPassword(auth, email, password);
  return user;
};

export const logoutUser = () => signOut(auth);

export const getUser = async (uid) => {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? { uid, ...snap.data() } : null;
};

// ── Messages ──────────────────────────────────────────────────────────────────

export const getMessages = async (room) => {
  const q = query(collection(db, 'rooms', room, 'messages'), orderBy('createdAt'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const sendMessage = async (room, { text, uid, name }) => {
  await addDoc(collection(db, 'rooms', room, 'messages'), {
    text, uid, name, createdAt: serverTimestamp(),
  });
};