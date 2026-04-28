// src/firebase/storageService.js
import { storage } from "./firebaseConfig";
import {
  ref, uploadBytes, getDownloadURL, deleteObject,
} from "firebase/storage";

// Upload d'un fichier
export const uploadFile = async (file, path) => {
  const fileRef = ref(storage, path);
  await uploadBytes(fileRef, file);
  return getDownloadURL(fileRef); // Retourne l'URL publique
};

// Supprimer un fichier
export const deleteFile = (path) =>
  deleteObject(ref(storage, path));