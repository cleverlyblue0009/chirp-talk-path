import axios from 'axios';
import { logger } from '../utils/logger';
import { StorageService } from './storage';
import { TTSRequest, TTSResponse, VisemeFrame } from '../types';

// Azure Speech SDK (optional - requires native dependencies)
let AzureSpeech: any;
try {
  AzureSpeech = require('microsoft-cognitiveservices-speech-sdk');
} catch (error) {
  logger.warn('Azure Speech SDK not available, using HTTP API fallback');
}

// ElevenLabs SDK
let ElevenLabs: any;
try {
  ElevenLabs = require('elevenlabs-node');
} catch (error) {
  logger.warn('ElevenLabs SDK not available, using HTTP API fallback');
}

// Phoneme to Viseme mapping
const PHONEME_TO_VISEME: Record<string, string> = {
  // Vowels
  'aa': 'AA', 'ae': 'AA', 'ah': 'AA', 'ao': 'AA', 'aw': 'AA',
  'ay': 'AA', 'eh': 'AA', 'er': 'AA', 'ey': 'AA', 'ih': 'EE',
  'iy': 'EE', 'ow': 'OH', 'oy': 'OH', 'uh': 'OH', 'uw': 'OH',
  
  // Consonants
  'b': 'M', 'p': 'M', 'm': 'M',
  'f': 'FV', 'v': 'FV',
  'th': 'TH', 'dh': 'TH',
  'd': 'DD', 't': 'DD', 'n': 'DD', 'l': 'DD', 's': 'DD', 'z': 'DD',
  'ch': 'CH', 'jh': 'CH', 'sh': 'CH', 'zh': 'CH',
  'k': 'KG', 'g': 'KG', 'ng': 'KG',
  'r': 'RR', 'w': 'RR', 'y': 'RR', 'hh': 'RR',
  
  // Silence
  'sil': 'REST', 'sp': 'REST', 'spn': 'REST',
};

export class TTSService {
  private static provider = process.env.TTS_PROVIDER || 'mock';

  /**
   * Synthesize speech from text
   */
  static async synthesize(request: TTSRequest): Promise<TTSResponse> {
    const { text, voice = 'default', speed = 1.0, returnPhonemes = true } = request;

    try {
      switch (this.provider) {
        case 'azure':
          return await this.synthesizeAzure(text, voice, speed, returnPhonemes);
        case 'elevenlabs':
          return await this.synthesizeElevenLabs(text, voice, speed, returnPhonemes);
        case 'mock':
        default:
          return await this.synthesizeMock(text, voice, speed, returnPhonemes);
      }
    } catch (error) {
      logger.error('TTS synthesis error:', error);
      // Fallback to mock TTS
      return await this.synthesizeMock(text, voice, speed, returnPhonemes);
    }
  }

  /**
   * Azure Speech Service synthesis
   */
  private static async synthesizeAzure(
    text: string,
    voice: string,
    speed: number,
    returnPhonemes: boolean
  ): Promise<TTSResponse> {
    const subscriptionKey = process.env.AZURE_TTS_KEY;
    const region = process.env.AZURE_TTS_REGION || 'eastus';

    if (!subscriptionKey) {
      throw new Error('Azure TTS key not configured');
    }

    // Use HTTP API for broader compatibility
    const ssml = this.buildAzureSSML(text, voice, speed, returnPhonemes);
    
    try {
      const response = await axios.post(
        `https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`,
        ssml,
        {
          headers: {
            'Ocp-Apim-Subscription-Key': subscriptionKey,
            'Content-Type': 'application/ssml+xml',
            'X-Microsoft-OutputFormat': 'audio-16khz-32kbitrate-mono-mp3',
            'User-Agent': 'ChirpApp/1.0',
          },
          responseType: 'arraybuffer',
        }
      );

      // Upload audio to storage
      const audioBuffer = Buffer.from(response.data);
      const audioKey = StorageService.generateTTSKey(text, voice);
      await StorageService.uploadFile(audioBuffer, 'audio/mpeg', 'tts', audioKey);
      const audioUrl = await StorageService.getPresignedUrl(audioKey, 3600);

      // For Azure, phoneme timing would require WebSocket API or SDK
      // For now, use estimated timing
      const phonemes = returnPhonemes ? this.estimatePhonemes(text) : undefined;
      const visemeTimeline = phonemes ? this.phonenemesToVisemes(phonemes) : undefined;

      return {
        audioUrl,
        phonemes,
        visemeTimeline,
      };
    } catch (error) {
      logger.error('Azure TTS error:', error);
      throw error;
    }
  }

  /**
   * ElevenLabs synthesis
   */
  private static async synthesizeElevenLabs(
    text: string,
    voice: string,
    speed: number,
    returnPhonemes: boolean
  ): Promise<TTSResponse> {
    const apiKey = process.env.ELEVENLABS_KEY;

    if (!apiKey) {
      throw new Error('ElevenLabs API key not configured');
    }

    try {
      const response = await axios.post(
        `https://api.elevenlabs.io/v1/text-to-speech/${voice || 'pNInz6obpgDQGcFmaJgB'}`,
        {
          text,
          model_id: 'eleven_monolingual_v1',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.5,
            speed: speed,
          },
        },
        {
          headers: {
            'xi-api-key': apiKey,
            'Content-Type': 'application/json',
          },
          responseType: 'arraybuffer',
        }
      );

      // Upload audio to storage
      const audioBuffer = Buffer.from(response.data);
      const audioKey = StorageService.generateTTSKey(text, voice);
      await StorageService.uploadFile(audioBuffer, 'audio/mpeg', 'tts', audioKey);
      const audioUrl = await StorageService.getPresignedUrl(audioKey, 3600);

      // ElevenLabs doesn't provide phoneme timing, use estimation
      const phonemes = returnPhonemes ? this.estimatePhonemes(text) : undefined;
      const visemeTimeline = phonemes ? this.phonenemesToVisemes(phonemes) : undefined;

      return {
        audioUrl,
        phonemes,
        visemeTimeline,
      };
    } catch (error) {
      logger.error('ElevenLabs TTS error:', error);
      throw error;
    }
  }

  /**
   * Mock TTS for development/testing
   */
  private static async synthesizeMock(
    text: string,
    voice: string,
    speed: number,
    returnPhonemes: boolean
  ): Promise<TTSResponse> {
    logger.info(`Mock TTS: "${text}" (voice: ${voice}, speed: ${speed})`);

    // Generate a simple beep audio file (silence for now)
    const duration = Math.max(text.length * 0.1, 1); // Estimate duration
    const sampleRate = 16000;
    const samples = Math.floor(duration * sampleRate);
    
    // Create a simple sine wave beep
    const audioBuffer = Buffer.alloc(samples * 2); // 16-bit audio
    for (let i = 0; i < samples; i++) {
      const sample = Math.sin(2 * Math.PI * 440 * i / sampleRate) * 0.3; // 440Hz tone
      const intSample = Math.floor(sample * 32767);
      audioBuffer.writeInt16LE(intSample, i * 2);
    }

    // Upload mock audio
    const audioKey = StorageService.generateTTSKey(text, voice);
    await StorageService.uploadFile(audioBuffer, 'audio/wav', 'tts', audioKey);
    const audioUrl = await StorageService.getPresignedUrl(audioKey, 3600);

    // Generate mock phonemes and visemes
    const phonemes = returnPhonemes ? this.estimatePhonemes(text) : undefined;
    const visemeTimeline = phonemes ? this.phonenemesToVisemes(phonemes) : undefined;

    return {
      audioUrl,
      phonemes,
      visemeTimeline,
    };
  }

  /**
   * Build Azure SSML markup
   */
  private static buildAzureSSML(text: string, voice: string, speed: number, returnPhonemes: boolean): string {
    const voiceName = voice === 'default' ? 'en-US-JennyNeural' : voice;
    const rate = speed !== 1.0 ? `${Math.round((speed - 1) * 100)}%` : '0%';

    return `<?xml version="1.0"?>
<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="en-US">
  <voice name="${voiceName}">
    <prosody rate="${rate}">
      ${text}
    </prosody>
  </voice>
</speak>`;
  }

  /**
   * Estimate phonemes from text (simple heuristic)
   * TODO: Replace with proper phoneme alignment service
   */
  private static estimatePhonemes(text: string): Array<{ phoneme: string; start: number; end: number }> {
    const words = text.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/);
    const phonemes: Array<{ phoneme: string; start: number; end: number }> = [];
    let currentTime = 0;

    for (const word of words) {
      // Simple phoneme estimation based on letters
      // TODO: Use a proper phoneme dictionary or alignment service
      const wordPhonemes = this.wordToPhonemes(word);
      const phonemeDuration = 0.1; // 100ms per phoneme (rough estimate)

      for (const phoneme of wordPhonemes) {
        phonemes.push({
          phoneme,
          start: currentTime,
          end: currentTime + phonemeDuration,
        });
        currentTime += phonemeDuration;
      }

      // Add pause between words
      phonemes.push({
        phoneme: 'sil',
        start: currentTime,
        end: currentTime + 0.05,
      });
      currentTime += 0.05;
    }

    return phonemes;
  }

  /**
   * Simple word to phonemes conversion (very basic)
   * TODO: Replace with proper phoneme dictionary
   */
  private static wordToPhonemes(word: string): string[] {
    // This is a very simplified mapping
    // In production, use a proper phoneme dictionary or service
    const phonemeMap: Record<string, string[]> = {
      'hello': ['hh', 'eh', 'l', 'ow'],
      'hi': ['hh', 'ay'],
      'what': ['w', 'ah', 't'],
      'your': ['y', 'uh', 'r'],
      'name': ['n', 'ey', 'm'],
      'good': ['g', 'uh', 'd'],
      'great': ['g', 'r', 'ey', 't'],
      'yes': ['y', 'eh', 's'],
      'no': ['n', 'ow'],
    };

    if (phonemeMap[word]) {
      return phonemeMap[word];
    }

    // Fallback: simple letter-to-phoneme mapping
    return word.split('').map(letter => {
      const vowels = 'aeiou';
      return vowels.includes(letter) ? 'aa' : letter;
    });
  }

  /**
   * Convert phonemes to visemes
   */
  private static phonenemesToVisemes(phonemes: Array<{ phoneme: string; start: number; end: number }>): VisemeFrame[] {
    return phonemes.map(({ phoneme, start }) => ({
      time: start,
      viseme: PHONEME_TO_VISEME[phoneme] || 'REST',
    }));
  }

  /**
   * Get phoneme alignment from Python service
   */
  static async getPhonemeAlignment(text: string, audioUrl: string): Promise<Array<{ phoneme: string; start: number; end: number }>> {
    try {
      const pyApiUrl = process.env.PY_API_URL || 'http://localhost:8000';
      
      const response = await axios.post(`${pyApiUrl}/align`, {
        text,
        audio_url: audioUrl,
      });

      return response.data.phonemes || [];
    } catch (error) {
      logger.error('Phoneme alignment error:', error);
      // Fallback to estimation
      return this.estimatePhonemes(text);
    }
  }
}