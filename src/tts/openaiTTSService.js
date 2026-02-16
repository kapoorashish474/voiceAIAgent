import OpenAI from 'openai';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

/**
 * Text-to-Speech Service using OpenAI TTS API
 */
class OpenAITTSService {
  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not set in environment variables');
    }
    
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    
    // Default voice settings
    this.defaultVoice = process.env.TTS_VOICE || 'alloy';
    this.defaultModel = 'tts-1';
  }

  /**
   * Convert text to speech audio
   * @param {string} text - Text to convert to speech
   * @param {string} voice - Voice to use (alloy, echo, fable, onyx, nova, shimmer)
   * @param {string} model - Model to use (tts-1 or tts-1-hd)
   * @param {string} outputPath - Optional path to save audio file
   * @returns {Promise<Buffer>} Audio buffer
   */
  async textToSpeech(text, voice = null, model = null, outputPath = null) {
    try {
      const mp3 = await this.openai.audio.speech.create({
        model: model || this.defaultModel,
        voice: voice || this.defaultVoice,
        input: text,
      });

      const buffer = Buffer.from(await mp3.arrayBuffer());

      // Save to file if outputPath is provided
      if (outputPath) {
        const dir = path.dirname(outputPath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(outputPath, buffer);
      }

      return buffer;
    } catch (error) {
      console.error('Error in OpenAI TTS:', error);
      throw new Error(`TTS generation failed: ${error.message}`);
    }
  }

  /**
   * Get available voices
   * @returns {Array<string>} List of available voice names
   */
  getAvailableVoices() {
    return ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'];
  }

  /**
   * Set default voice
   * @param {string} voice - Voice name
   */
  setDefaultVoice(voice) {
    if (this.getAvailableVoices().includes(voice)) {
      this.defaultVoice = voice;
    } else {
      throw new Error(`Invalid voice. Available voices: ${this.getAvailableVoices().join(', ')}`);
    }
  }
}

export default OpenAITTSService;
