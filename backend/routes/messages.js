const router = require('express').Router();
const { db } = require('../config/firebase');
const auth   = require('../middleware/authMiddleware');

router.get('/:room', auth, async (req, res) => {
  try {
    const snapshot = await db.collection('messages')
      .where('room', '==', req.params.room)
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get();

    const messages = snapshot.docs.map(doc => ({
      _id:       doc.id,
      ...doc.data(),
    })).reverse();

    res.json(messages);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

module.exports = router;