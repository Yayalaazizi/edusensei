const router  = require('express').Router();
const Message = require('../models/Message');
const auth    = require('../middleware/authMiddleware');

router.get('/:room', auth, async (req, res) => {
  try {
    const messages = await Message.find({ room: req.params.room })
      .sort({ createdAt: -1 }).limit(50)
      .populate('user', 'name email')
      .lean();
    res.json(messages.reverse());
  } catch {
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

module.exports = router;