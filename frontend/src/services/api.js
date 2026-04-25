import axios from 'axios';

const API = axios.create({ baseURL: 'http://localhost:5000/api' });

API.interceptors.request.use((config) => {
  const token = localStorage.getItem('educhat_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const registerUser = (data)       => API.post('/auth/register', data);
export const verifyOTP    = (email, otp) => API.post('/auth/verify', { email, otp });
export const loginUser    = (data)       => API.post('/auth/login', data);
export const getMessages  = (room)       => API.get(`/messages/${room}`);

export default API;