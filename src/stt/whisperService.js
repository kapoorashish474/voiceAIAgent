import OpenAI from 'openai';
import dotenv from 'dotenv';
import { Readable } from 'stream';

dotenv.config();

/**
 * Speech-to-Text Service using OpenAI Whisper API
 */
class WhisperService {
  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not set in environment variables');
    }
    
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  /**
   * Transcribe audio file to text using Whisper API
   * @param {Buffer|File} audioFile - Audio file buffer or File object
   * @param {string} language - Optional language code (e.g., 'en', 'es')
   * @param {string} filename - Optional filename (default: 'audio.webm')
   * @returns {Promise<string>} Transcribed text
   */
  async transcribe(audioFile, language = 'en', filename = 'audio.webm') {
    try {
      // Convert Buffer to File object if needed
      let file;
      if (Buffer.isBuffer(audioFile)) {
        // Create a File object for OpenAI SDK
        // Node.js 18+ has File API, but we'll create a compatible object
        if (typeof File !== 'undefined' && File.prototype.constructor) {
          file = new File([audioFile], filename, {
            type: 'audio/webm',
          });
        } else {
          // Create a File-like object that OpenAI SDK accepts
          // The SDK accepts objects with stream() method or File objects
          const stream = Readable.from(audioFile);
          file = {
            stream: () => stream,
            name: filename,
            type: 'audio/webm',
            size: audioFile.length,
          };
        }
      } else {
        file = audioFile;
      }

      const transcription = await this.openai.audio.transcriptions.create({
        file: file,
        model: 'whisper-1',
        language: language,
        response_format: 'text',
      });

      return transcription;
    } catch (error) {
      console.error('Error in Whisper transcription:', error);
      throw new Error(`Transcription failed: ${error.message}`);
    }
  }

  /**
   * Transcribe audio with detailed response
   * @param {Buffer|File} audioFile - Audio file buffer or File object
   * @param {string} language - Optional language code
   * @param {string} filename - Optional filename (default: 'audio.webm')
   * @returns {Promise<Object>} Detailed transcription response
   */
  async transcribeDetailed(audioFile, language = 'en', filename = 'audio.webm') {
    try {
      // Convert Buffer to File object if needed
      let file;
      if (Buffer.isBuffer(audioFile)) {
        // Create a File object for OpenAI SDK
        // Node.js 18+ has File API, but we'll create a compatible object
        if (typeof File !== 'undefined' && File.prototype.constructor) {
          file = new File([audioFile], filename, {
            type: 'audio/webm',
          });
        } else {
          // Create a File-like object that OpenAI SDK accepts
          const stream = Readable.from(audioFile);
          file = {
            stream: () => stream,
            name: filename,
            type: 'audio/webm',
            size: audioFile.length,
          };
        }
      } else {
        file = audioFile;
      }

      const transcription = await this.openai.audio.transcriptions.create({
        file: file,
        model: 'whisper-1',
        language: language,
        response_format: 'verbose_json',
      });

      return transcription;
    } catch (error) {
      console.error('Error in Whisper transcription:', error);
      throw new Error(`Transcription failed: ${error.message}`);
    }
  }
}

export default WhisperService;
