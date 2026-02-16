import express from 'express';
import cors from 'cors';
import multer from 'multer';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import WhisperService from './src/stt/whisperService.js';
import OpenAIService from './src/llm/openaiService.js';
import OpenAITTSService from './src/tts/openaiTTSService.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB limit (Whisper API limit)
  },
  fileFilter: (req, file, cb) => {
    // Accept audio files
    const allowedMimes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/webm', 'audio/ogg', 'audio/m4a'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only audio files are allowed.'));
    }
  },
});

// Initialize services
let whisperService, openAIService, ttsService;
try {
  whisperService = new WhisperService();
  openAIService = new OpenAIService();
  ttsService = new OpenAITTSService();
} catch (error) {
  console.error('Failed to initialize services:', error.message);
  process.exit(1);
}

// Store conversation history per session (in production, use Redis or database)
const conversationHistory = {};

/**
 * POST /api/transcribe
 * Transcribe audio to text
 */
app.post('/api/transcribe', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file provided' });
    }

    const language = req.body.language || 'en';
    const filename = req.file.originalname || 'audio.webm';
    const transcription = await whisperService.transcribe(req.file.buffer, language, filename);

    res.json({
      success: true,
      transcription: transcription,
    });
  } catch (error) {
    console.error('Transcription error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/chat
 * Process text through LLM and optionally generate TTS
 */
app.post('/api/chat', async (req, res) => {
  try {
    const { message, sessionId, generateAudio = false, voice } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const session = sessionId || 'default';
    const history = conversationHistory[session] || [];

    // Get LLM response
    const response = await openAIService.generateResponse(message, history);

    // Update conversation history
    conversationHistory[session] = [
      ...history,
      { role: 'user', content: message },
      { role: 'assistant', content: response },
    ];

    const result = {
      success: true,
      response: response,
    };

    // Generate audio if requested
    if (generateAudio) {
      const audioBuffer = await ttsService.textToSpeech(response, voice);
      const audioBase64 = audioBuffer.toString('base64');
      result.audio = audioBase64;
    }

    res.json(result);
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/voice-chat
 * Complete voice-to-voice pipeline: STT -> LLM -> TTS
 */
app.post('/api/voice-chat', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file provided' });
    }

    const { sessionId, language = 'en', voice } = req.body;
    const session = sessionId || 'default';

    // Step 1: Speech-to-Text
    console.log('Transcribing audio...');
    const filename = req.file.originalname || 'audio.webm';
    const transcription = await whisperService.transcribe(req.file.buffer, language, filename);

    // Step 2: LLM Processing
    console.log('Processing with LLM...');
    const history = conversationHistory[session] || [];
    const response = await openAIService.generateResponse(transcription, history);

    // Update conversation history
    conversationHistory[session] = [
      ...history,
      { role: 'user', content: transcription },
      { role: 'assistant', content: response },
    ];

    // Step 3: Text-to-Speech
    console.log('Generating speech...');
    const audioBuffer = await ttsService.textToSpeech(response, voice);
    const audioBase64 = audioBuffer.toString('base64');

    res.json({
      success: true,
      transcription: transcription,
      response: response,
      audio: audioBase64,
    });
  } catch (error) {
    console.error('Voice chat error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/voices
 * Get available TTS voices
 */
app.get('/api/voices', (req, res) => {
  res.json({
    success: true,
    voices: ttsService.getAvailableVoices(),
  });
});

/**
 * DELETE /api/conversation/:sessionId
 * Clear conversation history for a session
 */
app.delete('/api/conversation/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  delete conversationHistory[sessionId];
  res.json({ success: true, message: 'Conversation history cleared' });
});

// Serve frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(port, () => {
  console.log(`Voice AI Agent server running on http://localhost:${port}`);
  console.log('Make sure OPENAI_API_KEY is set in your .env file');
});
