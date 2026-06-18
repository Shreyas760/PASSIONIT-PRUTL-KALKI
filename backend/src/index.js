import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';
import connectDB from './config/database.js';
import User from './models/User.js';
import Choice from './models/Choice.js';
import { createToken, authMiddleware } from './middleware/auth.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Connect to MongoDB
await connectDB();

// Routes
app.get('/', (req, res) => {
  res.json({ message: 'Ethics in AI Backend is running!' });
});

// Signup route
app.post('/signup', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    const existingUser = await User.findOne({
      $or: [{ username }, { email }],
    });

    if (existingUser) {
      return res.status(400).json({ message: 'Username or Email already exists' });
    }

    const user = await User.create({
      username,
      email,
      hashed_password: password,
    });

    res.status(201).json({ message: 'User created successfully!' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Login route
app.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await User.findOne({
      $or: [{ username }, { email: username }],
    });

    if (!user || !(await user.validatePassword(password))) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = createToken(user);
    res.json({ access_token: token, token_type: 'bearer' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Protected route
app.get('/me', authMiddleware, (req, res) => {
  res.json({ username: req.user.sub });
});

// Get dilemma route
app.get('/get-dilemma', async (req, res) => {
  try {
    const { period } = req.query;
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `
      You are an AI assistant for an ethical dilemma game.
      Generate an ethical dilemma set in the ${period} period of history.
      Provide ONLY a JSON response in this format:
      {
        "question": "Your dilemma text here",
        "choices": [
          {"text": "Choice 1", "score": 100, "explanation": "Why this is ethical or not."},
          {"text": "Choice 2", "score": 75, "explanation": "..."},
          {"text": "Choice 3", "score": 50, "explanation": "..."},
          {"text": "Choice 4", "score": 10, "explanation": "..."}
        ]
      }
      Ensure your response ONLY contains JSON (no explanations, no extra text).
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    const jsonStr = text.trim().replace(/```json\n?|\n?```/g, '');
    const dilemmaData = JSON.parse(jsonStr);

    if (!dilemmaData.question || !dilemmaData.choices) {
      throw new Error('Invalid AI response format');
    }

    res.json(dilemmaData);
  } catch (error) {
    console.error('AI Error:', error);
    res.status(500).json({ message: `AI Failed: ${error.message}` });
  }
});

// Submit choice route
app.post('/api/submit-choice', authMiddleware, async (req, res) => {
  try {
    const { period, question, selected_answer, score } = req.body;
    const user = await User.findOne({ username: req.user.sub });

    const choice = await Choice.create({
      user: user._id,
      period,
      question,
      selected_answer,
      score,
    });

    res.status(201).json(choice);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get history route
app.get('/history', authMiddleware, async (req, res) => {
  try {
    const user = await User.findOne({ username: req.user.sub });
    const choices = await Choice.find({ user: user._id }).sort({ createdAt: -1 });
    
    // Group choices by period and calculate scores
    const gamesMap = new Map();
    
    choices.forEach(choice => {
      if (!gamesMap.has(choice.period)) {
        gamesMap.set(choice.period, {
          period: choice.period,
          total_score: 0,
          timestamp: choice.createdAt,
          choices: []
        });
      }
      
      const game = gamesMap.get(choice.period);
      game.total_score += choice.score;
      game.choices.push(choice);
      
      // Update timestamp to the latest choice in this period
      if (choice.createdAt > game.timestamp) {
        game.timestamp = choice.createdAt;
      }
    });
    
    const games = Array.from(gamesMap.values());
    
    res.json({
      username: user.username,
      games: games
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
}); 