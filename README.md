# Voice AI Agent - System Design

## Overview

Voice AI Agent is a modular, three-layer architecture system that enables seamless voice-based conversations with AI. The system processes voice input through Speech-to-Text, processes it with a Large Language Model, and generates voice responses using Text-to-Speech.

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Client Layer                          │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         Single-Page Web Application                  │  │
│  │  - Voice Recording (MediaRecorder API)                │  │
│  │  - Voice Activity Detection                          │  │
│  │  - Audio Visualization                                │  │
│  │  - Conversation UI                                    │  │
│  └──────────────────────────────────────────────────────┘  │
└───────────────────────┬─────────────────────────────────────┘
                        │ HTTP/WebSocket
                        │
┌───────────────────────▼─────────────────────────────────────┐
│                    Server Layer                            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Express.js Server                        │  │
│  │  - Request Routing                                    │  │
│  │  - File Upload Handling (Multer)                     │  │
│  │  - Session Management                                 │  │
│  │  - Conversation State                                 │  │
│  └──────────────────────────────────────────────────────┘  │
└───────────────────────┬─────────────────────────────────────┘
                        │
        ┌───────────────┼───────────────┐
        │               │               │
┌───────▼──────┐ ┌──────▼──────┐ ┌──────▼──────┐
│   STT Layer  │ │  LLM Layer │ │  TTS Layer  │
│              │ │            │ │             │
│ Whisper API  │ │ OpenAI GPT │ │ OpenAI TTS  │
│              │ │            │ │             │
└──────────────┘ └────────────┘ └─────────────┘
```

## Component Design

### 1. Speech-to-Text (STT) Layer
**Location:** `src/stt/whisperService.js`

**Responsibilities:**
- Convert audio input to text using OpenAI Whisper API
- Handle audio format conversion (Buffer → File)
- Support multiple languages
- Provide detailed transcription metadata

**Key Methods:**
- `transcribe(audioFile, language, filename)` - Convert speech to text
- `transcribeDetailed(audioFile, language, filename)` - Get detailed transcription

**Dependencies:**
- OpenAI SDK
- Node.js File API / Stream API

### 2. LLM Layer
**Location:** `src/llm/openaiService.js`

**Responsibilities:**
- Process text queries through OpenAI's language model
- Maintain conversation context
- Generate natural language responses
- Support streaming responses

**Key Methods:**
- `generateResponse(userMessage, conversationHistory, model)` - Generate AI response
- `generateResponseStreaming(userMessage, conversationHistory, onChunk, model)` - Stream response
- `setSystemPrompt(prompt)` - Configure system behavior

**Dependencies:**
- OpenAI SDK
- Conversation history management

### 3. Text-to-Speech (TTS) Layer
**Location:** `src/tts/openaiTTSService.js`

**Responsibilities:**
- Convert text responses to natural speech audio
- Support multiple voice options
- Generate audio in MP3 format
- Handle audio buffer management

**Key Methods:**
- `textToSpeech(text, voice, model, outputPath)` - Generate speech audio
- `getAvailableVoices()` - List available voices
- `setDefaultVoice(voice)` - Configure default voice

**Dependencies:**
- OpenAI SDK
- File system (optional)

### 4. Server Orchestration
**Location:** `server.js`

**Responsibilities:**
- HTTP request handling
- Route management
- File upload processing
- Session and conversation state management
- Coordinate between STT, LLM, and TTS layers

**Key Endpoints:**
- `POST /api/voice-chat` - Complete voice-to-voice pipeline
- `POST /api/transcribe` - Standalone transcription
- `POST /api/chat` - Text-based chat with optional TTS
- `GET /api/voices` - List available TTS voices
- `DELETE /api/conversation/:sessionId` - Clear conversation history

### 5. Frontend Client
**Location:** `public/index.html`

**Responsibilities:**
- Voice recording via MediaRecorder API
- Voice Activity Detection (VAD)
- Audio visualization
- Real-time UI updates
- Conversation display
- Audio playback

**Key Features:**
- Continuous listening mode
- Automatic silence detection
- Visual feedback for system states
- Responsive design

## Data Flow

### Voice-to-Voice Pipeline Flow

```
1. User speaks → Browser captures audio
   ↓
2. Voice Activity Detection detects end of speech
   ↓
3. Audio blob sent to server via POST /api/voice-chat
   ↓
4. Server receives audio file (multipart/form-data)
   ↓
5. STT Layer: Audio Buffer → Whisper API → Text
   ↓
6. LLM Layer: Text + History → OpenAI GPT → Response Text
   ↓
7. Conversation history updated
   ↓
8. TTS Layer: Response Text → OpenAI TTS → Audio Buffer
   ↓
9. Server returns: { transcription, response, audio }
   ↓
10. Client displays transcript and plays audio
   ↓
11. (If continuous mode) Auto-resume listening
```

## Technology Stack

### Backend
- **Runtime:** Node.js (ES Modules)
- **Framework:** Express.js
- **File Upload:** Multer
- **API Client:** OpenAI SDK
- **Environment:** dotenv

### Frontend
- **Language:** Vanilla JavaScript (ES6+)
- **Audio APIs:** MediaRecorder, Web Audio API
- **UI:** HTML5, CSS3
- **Communication:** Fetch API

### External Services
- **STT:** OpenAI Whisper API
- **LLM:** OpenAI GPT (gpt-3.5-turbo)
- **TTS:** OpenAI Text-to-Speech API

## Design Patterns

### 1. Layered Architecture
Each layer (STT, LLM, TTS) is isolated and independently testable.

### 2. Service Pattern
Each layer implements a service class with clear interfaces.

### 3. Dependency Injection
Services are instantiated at server startup and injected into route handlers.

### 4. Session Management
Conversation state is maintained per session using in-memory storage.

## Scalability Considerations

### Current Limitations
- In-memory conversation storage (single server instance)
- No load balancing support
- No persistent storage

### Production Enhancements
- **State Management:** Redis or database for conversation history
- **Caching:** Cache common responses
- **Queue System:** Process requests asynchronously
- **WebSocket:** Real-time bidirectional communication
- **CDN:** Serve static assets
- **Monitoring:** Logging and metrics collection

## Security Considerations

- API keys stored in environment variables
- File size limits (25MB max)
- CORS configuration
- Input validation
- Rate limiting (recommended for production)

## Error Handling

- Service-level error handling with try-catch
- Graceful degradation
- User-friendly error messages
- Server-side logging

## Performance Optimizations

- Audio chunking for large recordings
- Streaming responses (LLM layer supports streaming)
- Efficient buffer management
- Client-side audio compression
