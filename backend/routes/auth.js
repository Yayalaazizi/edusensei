const router     = require('express').Router();
const nodemailer = require('nodemailer');
const { auth, db } = require('../config/firebase');
const authMiddleware = require('../middleware/authMiddleware');

const ACADEMIC_DOMAINS = [
  'ac.ma','edu.ma','usmba.ac.ma','um5.ac.ma',
  'uca.ac.ma','uae.ac.ma','univ-fes.ma'
];

const isAcademic = (email) => {
  const domain = (email.split('@')[1] || '').toLowerCase();
  return ACADEMIC_DOMAINS.some(d => domain === d || domain.endsWith('.' + d));
};

const sendOTPEmail = async (email, otp, name) => {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
  });
  await transporter.sendMail({
    from: `"EduChat 🎓" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Ton code de vérification EduChat',
    html: `
      <div style="font-family:sans-serif;max-width:460px;margin:auto;
                  background:#13161e;color:#e8eaf0;border-radius:16px;padding:32px">
        <h2 style="color:#4f8ef7">Bienvenue sur EduChat 🎓</h2>
        <p>Bonjour <strong>${name}</strong>, voici ton code :</p>
        <div style="background:#1a1e28;border-radius:12px;
                    text-align:center;padding:24px;margin:20px 0">
          <span style="font-size:36px;font-weight:700;
                       letter-spacing:12px;color:#4f8ef7">${otp}</span>
        </div>
        <p style="color:#5a6075;font-size:13px">Expire dans 10 minutes.</p>
      </div>`
  });
};

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, university } = req.body;

    if (!name || !email || !password)
      return res.status(400).json({ message: 'Tous les champs sont obligatoires.' });
    if (!isAcademic(email))
      return res.status(400).json({ message: 'Utilise un email académique (.ac.ma, .edu.ma)' });
    if (password.length < 8)
      return res.status(400).json({ message: 'Mot de passe : 8 caractères minimum.' });

    // Vérifier si l'email existe déjà dans Firestore
    const usersRef = db.collection('users');
    const existing = await usersRef.where('email', '==', email.toLowerCase()).get();

    const otp     = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 10 * 60 * 1000);

    if (!existing.empty) {
      const doc = existing.docs[0];
      if (doc.data().isVerified)
        return res.status(400).json({ message: 'Email déjà utilisé.' });
      // Mettre à jour l'OTP
      await doc.ref.update({ name, university: university || '', otpCode: otp, otpExpires: expires.toISOString() });
    } else {
      // Créer l'utilisateur dans Firebase Auth
      const userRecord = await auth.createUser({ email, password, displayName: name });
      // Créer le document Firestore
      await usersRef.doc(userRecord.uid).set({
        name,
        email:      email.toLowerCase(),
        university: university || '',
        isVerified: false,
        otpCode:    otp,
        otpExpires: expires.toISOString(),
        createdAt:  new Date().toISOString(),
      });
    }

    await sendOTPEmail(email, otp, name);
    res.json({ message: 'Code envoyé à ' + email });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// POST /api/auth/verify
router.post('/verify', async (req, res) => {
  try {
    const { email, otp } = req.body;

    const usersRef = db.collection('users');
    const snapshot = await usersRef.where('email', '==', email?.toLowerCase()).get();

    if (snapshot.empty)
      return res.status(404).json({ message: 'Utilisateur introuvable.' });

    const docSnap = snapshot.docs[0];
    const user    = docSnap.data();

    if (user.otpCode !== otp)
      return res.status(400).json({ message: 'Code incorrect.' });
    if (new Date(user.otpExpires) < new Date())
      return res.status(400).json({ message: 'Code expiré, réinscris-toi.' });

    // Marquer comme vérifié
    await docSnap.ref.update({ isVerified: true, otpCode: null, otpExpires: null });

    // Générer un custom token Firebase
    const customToken = await auth.createCustomToken(docSnap.id);

    res.json({
      token: customToken,
      user: {
        _id:        docSnap.id,
        name:       user.name,
        email:      user.email,
        university: user.university,
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// POST /api/auth/login  (vérification côté backend)
router.post('/login', async (req, res) => {
  try {
    const { email } = req.body;

    const snapshot = await db.collection('users')
      .where('email', '==', email?.toLowerCase()).get();

    if (snapshot.empty)
      return res.status(400).json({ message: 'Email ou mot de passe incorrect.' });

    const user = snapshot.docs[0].data();
    const uid  = snapshot.docs[0].id;

    if (!user.isVerified)
      return res.status(403).json({ message: 'Compte non vérifié.' });

    // Le vrai login (mot de passe) est géré par Firebase Auth côté frontend
    // Ici on retourne juste les infos utilisateur
    const customToken = await auth.createCustomToken(uid);
    res.json({
      token: customToken,
      user: { _id: uid, name: user.name, email: user.email, university: user.university }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// GET /api/auth/me
router.get('/me', authMiddleware, (req, res) => res.json({ user: req.user }));

module.exports = router;