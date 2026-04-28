const { auth } = require('../config/firebase');

module.exports = async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer '))
    return res.status(401).json({ message: 'Non authentifié.' });

  try {
    const token   = header.split(' ')[1];
    const decoded = await auth.verifyIdToken(token);
    req.user = {
      _id:        decoded.uid,
      name:       decoded.name  || '',
      email:      decoded.email || '',
      university: decoded.university || '',
    };
    next();
  } catch {
    res.status(401).json({ message: 'Token invalide.' });
  }
};