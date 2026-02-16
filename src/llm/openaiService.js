import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

/**
 * LLM Service using OpenAI API
 */
class OpenAIService {
  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not set in environment variables');
    }
    
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    
    // Default system prompt
    this.systemPrompt = process.env.SYSTEM_PROMPT || 
      'You are a helpful AI assistant. Respond concisely and naturally.';
  }

  /**
   * Generate a response using OpenAI Chat API
   * @param {string} userMessage - The user's message/query
   * @param {Array} conversationHistory - Optional conversation history
   * @param {string} model - Model to use (default: gpt-3.5-turbo)
   * @returns {Promise<string>} AI response text
   */
  async generateResponse(userMessage, conversationHistory = [], model = 'gpt-3.5-turbo') {
    try {
      const messages = [
        { role: 'system', content: this.systemPrompt },
        ...conversationHistory,
        { role: 'user', content: userMessage }
      ];

      const completion = await this.openai.chat.completions.create({
        model: model,
        messages: messages,
        temperature: 0.7,
        max_tokens: 500,
      });

      const response = completion.choices[0].message.content;
      return response;
    } catch (error) {
      console.error('Error in OpenAI LLM:', error);
      throw new Error(`LLM generation failed: ${error.message}`);
    }
  }

  /**
   * Set custom system prompt
   * @param {string} prompt - Custom system prompt
   */
  setSystemPrompt(prompt) {
    this.systemPrompt = prompt;
  }

  /**
   * Generate response with streaming (for real-time updates)
   * @param {string} userMessage - The user's message/query
   * @param {Array} conversationHistory - Optional conversation history
   * @param {Function} onChunk - Callback function for each chunk
   * @param {string} model - Model to use
   * @returns {Promise<string>} Complete response text
   */
  async generateResponseStreaming(userMessage, conversationHistory = [], onChunk, model = 'gpt-3.5-turbo') {
    try {
      const messages = [
        { role: 'system', content: this.systemPrompt },
        ...conversationHistory,
        { role: 'user', content: userMessage }
      ];

      const stream = await this.openai.chat.completions.create({
        model: model,
        messages: messages,
        temperature: 0.7,
        max_tokens: 500,
        stream: true,
      });

      let fullResponse = '';
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          fullResponse += content;
          if (onChunk) {
            onChunk(content);
          }
        }
      }

      return fullResponse;
    } catch (error) {
      console.error('Error in OpenAI LLM streaming:', error);
      throw new Error(`LLM streaming failed: ${error.message}`);
    }
  }
}

export default OpenAIService;
