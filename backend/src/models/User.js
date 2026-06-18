import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  hashed_password: {
    type: String,
    required: true,
  },
}, {
  timestamps: true,
});

userSchema.pre('save', async function(next) {
  if (this.isModified('hashed_password')) {
    this.hashed_password = await bcrypt.hash(this.hashed_password, 10);
  }
  next();
});

userSchema.methods.validatePassword = async function(password) {
  return bcrypt.compare(password, this.hashed_password);
};

const User = mongoose.model('User', userSchema);

export default User; 