import { useState, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { registerUser, verifyOTP, loginUser } from '../services/api';

const DOMAINS = ['ac.ma','edu.ma','usmba.ac.ma','um5.ac.ma','uca.ac.ma','uae.ac.ma'];
const isAcademic = (email) => {
  const d = (email.split('@')[1] || '').toLowerCase();
  return DOMAINS.some(x => d === x || d.endsWith('.' + x));
};

export default function AuthPage() {
  const { login }             = useAuth();
  const [page, setPage]       = useState('login');
  const [form, setForm]       = useState({ name:'', email:'', password:'', university:'' });
  const [otp,  setOtp]        = useState(['','','','','','']);
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);
  const otpRefs = useRef([]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const go  = (p)   => { setError(''); setPage(p); };

  const handleRegister = async (e) => {
    e?.preventDefault(); setError('');
    if (!form.name || !form.email || !form.password) return setError('Remplis tous les champs.');
    if (!isAcademic(form.email)) return setError('Email académique requis (ex: nom@usmba.ac.ma)');
    if (form.password.length < 8) return setError('Mot de passe : 8 caractères minimum.');
    setLoading(true);
    try {
      await registerUser(form);
      setPage('verify');
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur serveur.');
    } finally { setLoading(false); }
  };

  const handleLogin = async (e) => {
    e.preventDefault(); setError('');
    if (!form.email || !form.password) return setError('Remplis tous les champs.');
    setLoading(true);
    try {
      const res = await loginUser({ email: form.email, password: form.password });
      login(res.data.token, res.data.user);
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur de connexion.');
    } finally { setLoading(false); }
  };

  const handleVerify = async () => {
    setError('');
    if (otp.join('').length < 6) return setError('Entre le code à 6 chiffres.');
    setLoading(true);
    try {
      const res = await verifyOTP(form.email, otp.join(''));
      login(res.data.token, res.data.user);
    } catch (err) {
      setError(err.response?.data?.message || 'Code invalide.');
    } finally { setLoading(false); }
  };

  const handleOtp = (i, val) => {
    if (!/^\d?$/.test(val)) return;
    const n = [...otp]; n[i] = val; setOtp(n);
    if (val && i < 5) otpRefs.current[i+1]?.focus();
  };

  const academic = form.email.includes('@') && isAcademic(form.email);

  return (
    <div style={S.wrap}>
      <div style={S.card}>
        <div style={S.logo}><span style={{fontSize:28}}>🎓</span>
          <span style={S.logoTxt}>EduChat</span></div>

        {error && <div style={S.err}>{error}</div>}

        {page === 'login' && <>
          <h1 style={S.title}>Bon retour 👋</h1>
          <p style={S.sub}>Connecte-toi à ta communauté universitaire.</p>
          <form onSubmit={handleLogin}>
            <F label="Email académique" type="email" placeholder="nom@usmba.ac.ma"
              value={form.email} onChange={v => set('email', v)} />
            <F label="Mot de passe" type="password" placeholder="••••••••"
              value={form.password} onChange={v => set('password', v)} />
            <button style={S.btn} type="submit" disabled={loading}>
              {loading ? 'Connexion...' : 'Se connecter'}
            </button>
          </form>
          <p style={S.sw}>Pas de compte ?{' '}
            <span style={S.lnk} onClick={() => go('register')}>S'inscrire</span></p>
        </>}

        {page === 'register' && <>
          <h1 style={S.title}>Créer un compte</h1>
          <p style={S.sub}>Réservé aux étudiants universitaires.</p>
          <form onSubmit={handleRegister}>
            <F label="Nom complet" placeholder="Ahmed Moussaoui"
              value={form.name} onChange={v => set('name', v)} />
            <F label="Email académique" type="email" placeholder="nom@usmba.ac.ma"
              value={form.email} onChange={v => set('email', v)} />
            {academic && <p style={S.badge}>✓ Email académique détecté</p>}
            <div style={{marginBottom:14}}>
              <label style={S.lbl}>Université</label>
              <select style={S.inp} value={form.university}
                onChange={e => set('university', e.target.value)}>
                <option value="">-- Sélectionne --</option>
                <option>USMBA - Fès</option>
                <option>UM5 - Rabat</option>
                <option>UCA - Marrakech</option>
                <option>UAE - Tétouan</option>
                <option>Autre</option>
              </select>
            </div>
            <F label="Mot de passe" type="password" placeholder="Min. 8 caractères"
              value={form.password} onChange={v => set('password', v)} />
            <button style={S.btn} type="submit" disabled={loading}>
              {loading ? 'Envoi...' : 'Recevoir le code de vérification'}
            </button>
          </form>
          <p style={S.sw}>Déjà inscrit ?{' '}
            <span style={S.lnk} onClick={() => go('login')}>Se connecter</span></p>
        </>}

        {page === 'verify' && <>
          <div style={{textAlign:'center'}}>
            <div style={{fontSize:52,marginBottom:12}}>📬</div>
            <h1 style={S.title}>Vérifie ton email</h1>
            <p style={S.sub}>Code envoyé à{' '}
              <strong style={{color:'#4f8ef7'}}>{form.email}</strong></p>
            <div style={S.otpRow}>
              {otp.map((v, i) => (
                <input key={i} ref={el => otpRefs.current[i] = el}
                  style={S.otpBox} maxLength={1} value={v}
                  onChange={e => handleOtp(i, e.target.value)}
                  onKeyDown={e => e.key==='Backspace' && !v && i>0
                    && otpRefs.current[i-1]?.focus()} />
              ))}
            </div>
            <button style={S.btn} onClick={handleVerify} disabled={loading}>
              {loading ? 'Vérification...' : 'Confirmer mon compte'}
            </button>
            <p style={{...S.sw, marginTop:14}}>Pas reçu ?{' '}
              <span style={S.lnk} onClick={() => handleRegister()}>Renvoyer</span></p>
          </div>
        </>}
      </div>
    </div>
  );
}

function F({ label, type='text', placeholder, value, onChange }) {
  return (
    <div style={{marginBottom:14}}>
      <label style={S.lbl}>{label}</label>
      <input style={S.inp} type={type} placeholder={placeholder}
        value={value} onChange={e => onChange(e.target.value)} />
    </div>
  );
}

const S = {
  wrap:   { minHeight:'100vh', display:'grid', placeItems:'center', background:'#0d0f14' },
  card:   { width:420, background:'#13161e', border:'1px solid #252938', borderRadius:24, padding:'40px 36px' },
  logo:   { display:'flex', alignItems:'center', gap:10, marginBottom:26 },
  logoTxt:{ fontFamily:'Syne,sans-serif', fontWeight:800, fontSize:20, color:'#4f8ef7' },
  title:  { fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:24, marginBottom:6 },
  sub:    { color:'#5a6075', fontSize:14, marginBottom:22, lineHeight:1.5 },
  lbl:    { display:'block', fontSize:13, color:'#5a6075', marginBottom:6 },
  inp:    { width:'100%', background:'#1a1e28', border:'1px solid #252938', borderRadius:10,
            padding:'11px 14px', color:'#e8eaf0', fontFamily:'DM Sans,sans-serif',
            fontSize:14, outline:'none', appearance:'none' },
  btn:    { display:'block', width:'100%', background:'linear-gradient(135deg,#4f8ef7,#7c6af7)',
            color:'white', border:'none', borderRadius:10, padding:13,
            fontFamily:'Syne,sans-serif', fontWeight:600, fontSize:15,
            cursor:'pointer', marginTop:8 },
  sw:     { textAlign:'center', marginTop:16, fontSize:13, color:'#5a6075' },
  lnk:    { color:'#4f8ef7', cursor:'pointer', fontWeight:500 },
  err:    { background:'rgba(249,115,22,.1)', color:'#f97316',
            border:'1px solid rgba(249,115,22,.25)',
            borderRadius:8, padding:'10px 14px', fontSize:13, marginBottom:14 },
  badge:  { color:'#3ecf8e', fontSize:12, fontWeight:500, marginBottom:10 },
  otpRow: { display:'flex', gap:10, justifyContent:'center', margin:'20px 0' },
  otpBox: { width:50, height:56, background:'#1a1e28', border:'1.5px solid #252938',
            borderRadius:12, textAlign:'center', fontSize:22,
            fontFamily:'Syne,sans-serif', fontWeight:700,
            color:'#e8eaf0', outline:'none' },
};