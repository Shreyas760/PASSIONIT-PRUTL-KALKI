import mongoose from 'mongoose';

const choiceSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  period: {
    type: String,
    required: true,
  },
  question: {
    type: String,
    required: true,
  },
  selected_answer: {
    type: String,
    required: true,
  },
  score: {
    type: Number,
    default: 0.0,
  },
}, {
  timestamps: true,
});

const Choice = mongoose.model('Choice', choiceSchema);

export default Choice; 