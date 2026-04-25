const router     = require('express').Router();
const bcrypt     = require('bcryptjs');
const jwt        = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const User       = require('../models/User');
const auth       = require('../middleware/authMiddleware');

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

    const exists  = await User.findOne({ email: email.toLowerCase() });
    if (exists?.isVerified)
      return res.status(400).json({ message: 'Email déjà utilisé.' });

    const hashed  = await bcrypt.hash(password, 12);
    const otp     = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 10 * 60 * 1000);

    if (exists) {
      exists.name = name; exists.password = hashed;
      exists.university = university || '';
      exists.otpCode = otp; exists.otpExpires = expires;
      await exists.save();
    } else {
      await User.create({
        name, email: email.toLowerCase(), password: hashed,
        university: university || '', otpCode: otp, otpExpires: expires
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
    const user = await User.findOne({ email: email?.toLowerCase() });
    if (!user)
      return res.status(404).json({ message: 'Utilisateur introuvable.' });
    if (user.otpCode !== otp)
      return res.status(400).json({ message: 'Code incorrect.' });
    if (user.otpExpires < new Date())
      return res.status(400).json({ message: 'Code expiré, réinscris-toi.' });

    user.isVerified = true;
    user.otpCode    = null;
    user.otpExpires = null;
    await user.save();

    const token = jwt.sign(
      { id: user._id, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.json({ token, user: { _id:user._id, name:user.name, email:user.email, university:user.university } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: email?.toLowerCase() });
    if (!user || !(await bcrypt.compare(password, user.password)))
      return res.status(400).json({ message: 'Email ou mot de passe incorrect.' });
    if (!user.isVerified)
      return res.status(403).json({ message: 'Compte non vérifié.' });

    const token = jwt.sign(
      { id: user._id, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.json({ token, user: { _id:user._id, name:user.name, email:user.email, university:user.university } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// GET /api/auth/me
router.get('/me', auth, (req, res) => res.json({ user: req.user }));

module.exports = router;