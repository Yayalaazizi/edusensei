const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name:       { type: String, required: true, trim: true },
  email:      { type: String, required: true, unique: true, lowercase: true },
  password:   { type: String, required: true },
  university: { type: String, default: '' },
  isVerified: { type: Boolean, default: false },
  otpCode:    { type: String, default: null },
  otpExpires: { type: Date,   default: null },
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);