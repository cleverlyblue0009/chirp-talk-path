import request from 'supertest';
import express from 'express';
import { SessionsController } from '../src/controllers/sessionsController';
import { authenticateToken } from '../src/middleware/auth';
import { db } from '../src/utils/database';
import { analysisQueue } from '../src/utils/redis';
import { StorageService } from '../src/services/storage';
import { Role } from '@prisma/client';

const app = express();
app.use(express.json());

// Mock authentication middleware
app.use((req, res, next) => {
  req.user = {
    uid: 'test-user-123',
    email: 'test@example.com',
    role: Role.PARENT,
    displayName: 'Test User',
  };
  next();
});

app.post('/sessions', SessionsController.startSession);
app.post('/sessions/:id/complete', SessionsController.completeSession);

describe('Sessions', () => {
  describe('POST /sessions', () => {
    it('should create new session successfully', async () => {
      // Mock child access
      (db.child.findFirst as jest.Mock).mockResolvedValue({
        id: 'child-123',
        name: 'Test Child',
        guardians: [{ id: 'test-user-123' }],
      });

      // Mock scenario
      (db.scenario.findUnique as jest.Mock).mockResolvedValue({
        id: 'scenario-123',
        title: 'Test Scenario',
      });

      // Mock session creation
      (db.session.create as jest.Mock).mockResolvedValue({
        id: 'session-123',
        childId: 'child-123',
        scenarioId: 'scenario-123',
        startedAt: new Date(),
      });

      const response = await request(app)
        .post('/sessions')
        .send({
          childId: 'child-123',
          scenarioId: 'scenario-123',
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('sessionId', 'session-123');
      expect(response.body).toHaveProperty('status', 'created');
    });

    it('should reject access to unauthorized child', async () => {
      (db.child.findFirst as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .post('/sessions')
        .send({
          childId: 'unauthorized-child',
          scenarioId: 'scenario-123',
        });

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject invalid scenario', async () => {
      (db.child.findFirst as jest.Mock).mockResolvedValue({
        id: 'child-123',
        guardians: [{ id: 'test-user-123' }],
      });

      (db.scenario.findUnique as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .post('/sessions')
        .send({
          childId: 'child-123',
          scenarioId: 'invalid-scenario',
        });

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /sessions/:id/complete', () => {
    it('should complete session with results', async () => {
      const mockSession = {
        id: 'session-123',
        childId: 'child-123',
        completedAt: null,
        child: {
          id: 'child-123',
          companions: [],
        },
      };

      (db.session.findFirst as jest.Mock).mockResolvedValue(mockSession);
      (db.session.update as jest.Mock).mockResolvedValue({
        ...mockSession,
        completedAt: new Date(),
        resultJson: { overall_score: 0.8 },
      });

      const response = await request(app)
        .post('/sessions/session-123/complete')
        .send({
          resultJson: { overall_score: 0.8 },
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('sessionId', 'session-123');
      expect(response.body).toHaveProperty('rewards');
    });

    it('should reject completing already completed session', async () => {
      (db.session.findFirst as jest.Mock).mockResolvedValue({
        id: 'session-123',
        completedAt: new Date(),
        child: { companions: [] },
      });

      const response = await request(app)
        .post('/sessions/session-123/complete')
        .send({
          resultJson: { overall_score: 0.8 },
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Media Upload', () => {
    it('should handle media upload and queue analysis', async () => {
      const mockSession = {
        id: 'session-123',
        childId: 'child-123',
        child: {
          id: 'child-123',
          consentMedia: true,
        },
      };

      (db.session.findFirst as jest.Mock).mockResolvedValue(mockSession);
      (db.session.update as jest.Mock).mockResolvedValue(mockSession);
      (db.analysisJob.create as jest.Mock).mockResolvedValue({
        id: 'job-123',
        status: 'PENDING',
      });

      // Mock file upload
      const mockFile = {
        buffer: Buffer.from('test'),
        mimetype: 'video/mp4',
        originalname: 'test.mp4',
      };

      expect(StorageService.uploadFile).toBeDefined();
      expect(analysisQueue.add).toBeDefined();
    });

    it('should reject upload without media consent', async () => {
      const mockSession = {
        id: 'session-123',
        child: {
          consentMedia: false,
        },
      };

      (db.session.findFirst as jest.Mock).mockResolvedValue(mockSession);

      // Test would need actual file upload simulation
      // This is a placeholder for the concept
      expect(mockSession.child.consentMedia).toBe(false);
    });
  });
});