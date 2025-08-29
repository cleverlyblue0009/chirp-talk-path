import { PrismaClient } from '@prisma/client';
import { mockDeep, mockReset, DeepMockProxy } from 'jest-mock-extended';

// Mock Prisma
jest.mock('../src/utils/database', () => ({
  db: mockDeep<PrismaClient>(),
}));

// Mock Redis
jest.mock('../src/utils/redis', () => ({
  redis: {
    ping: jest.fn().mockResolvedValue('PONG'),
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  },
  analysisQueue: {
    add: jest.fn().mockResolvedValue({ id: 'job-123' }),
    getJobs: jest.fn().mockResolvedValue([]),
  },
  redisHealthCheck: jest.fn().mockResolvedValue(true),
}));

// Mock Firebase Admin
jest.mock('firebase-admin', () => ({
  auth: () => ({
    verifyIdToken: jest.fn().mockResolvedValue({
      uid: 'test-user-123',
      email: 'test@example.com',
    }),
  }),
  initializeApp: jest.fn(),
  credential: {
    cert: jest.fn(),
  },
}));

// Mock Storage Service
jest.mock('../src/services/storage', () => ({
  StorageService: {
    uploadFile: jest.fn().mockResolvedValue('test-file-key'),
    getPresignedUrl: jest.fn().mockResolvedValue('https://example.com/file'),
    deleteFile: jest.fn().mockResolvedValue(undefined),
    generateMediaKey: jest.fn().mockReturnValue('media/test-key'),
  },
}));

// Mock TTS Service
jest.mock('../src/services/tts', () => ({
  TTSService: {
    synthesize: jest.fn().mockResolvedValue({
      audioUrl: 'https://example.com/audio.mp3',
      visemeTimeline: [
        { time: 0.0, viseme: 'REST' },
        { time: 0.1, viseme: 'M' },
      ],
    }),
  },
}));

beforeEach(() => {
  mockReset(require('../src/utils/database').db);
});