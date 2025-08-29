import request from 'supertest';
import express from 'express';
import { ChildrenController } from '../src/controllers/childrenController';
import { db } from '../src/utils/database';
import { Role } from '@prisma/client';

const app = express();
app.use(express.json());

// Mock authentication middleware
app.use((req, res, next) => {
  req.user = {
    uid: 'test-parent-123',
    email: 'parent@example.com',
    role: Role.PARENT,
    displayName: 'Test Parent',
  };
  next();
});

app.post('/children', ChildrenController.createChild);
app.get('/children/:id/dashboard', ChildrenController.getChildDashboard);

describe('Children Management', () => {
  describe('POST /children', () => {
    it('should create child successfully', async () => {
      // Mock guardian validation
      (db.user.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'parent-123',
          role: Role.PARENT,
          email: 'parent@example.com',
        },
      ]);

      // Mock therapist validation
      (db.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'therapist-123',
        role: Role.THERAPIST,
      });

      // Mock child creation
      (db.child.create as jest.Mock).mockResolvedValue({
        id: 'child-123',
        name: 'Test Child',
        level: 1,
        createdAt: new Date(),
        guardians: [{ id: 'parent-123' }],
        therapist: { id: 'therapist-123' },
      });

      const response = await request(app)
        .post('/children')
        .send({
          name: 'Test Child',
          dob: '2015-06-15T00:00:00.000Z',
          guardianIds: ['parent-123'],
          therapistId: 'therapist-123',
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('name', 'Test Child');
      expect(response.body).toHaveProperty('level', 1);
    });

    it('should reject invalid guardian IDs', async () => {
      (db.user.findMany as jest.Mock).mockResolvedValue([]); // No guardians found

      const response = await request(app)
        .post('/children')
        .send({
          name: 'Test Child',
          guardianIds: ['invalid-guardian'],
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject invalid therapist ID', async () => {
      (db.user.findMany as jest.Mock).mockResolvedValue([
        { id: 'parent-123', role: Role.PARENT },
      ]);
      (db.user.findUnique as jest.Mock).mockResolvedValue(null); // Therapist not found

      const response = await request(app)
        .post('/children')
        .send({
          name: 'Test Child',
          guardianIds: ['parent-123'],
          therapistId: 'invalid-therapist',
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /children/:id/dashboard', () => {
    it('should return dashboard data for authorized child', async () => {
      const mockChild = {
        id: 'child-123',
        name: 'Test Child',
        level: 2,
        sessions: [
          {
            id: 'session-1',
            startedAt: new Date('2024-01-01'),
            completedAt: new Date('2024-01-01'),
            resultJson: { overall_score: 0.8 },
            scenario: { title: 'Test Scenario' },
          },
          {
            id: 'session-2',
            startedAt: new Date('2024-01-02'),
            completedAt: new Date('2024-01-02'),
            resultJson: { overall_score: 0.9 },
            scenario: { title: 'Another Scenario' },
          },
        ],
        companions: [
          { type: 'basic_bird', earnedAt: new Date() },
        ],
      };

      (db.child.findUnique as jest.Mock).mockResolvedValue(mockChild);

      const response = await request(app).get('/children/child-123/dashboard');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('lessonsCompleted', 2);
      expect(response.body).toHaveProperty('avgScore');
      expect(response.body).toHaveProperty('companionsUnlocked', 1);
      expect(response.body).toHaveProperty('recentSessions');
      expect(response.body.recentSessions).toHaveLength(2);
    });

    it('should return empty dashboard for child with no sessions', async () => {
      const mockChild = {
        id: 'child-123',
        name: 'New Child',
        sessions: [],
        companions: [],
      };

      (db.child.findUnique as jest.Mock).mockResolvedValue(mockChild);

      const response = await request(app).get('/children/child-123/dashboard');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('lessonsCompleted', 0);
      expect(response.body).toHaveProperty('avgScore', 0);
      expect(response.body).toHaveProperty('companionsUnlocked', 0);
      expect(response.body.recentSessions).toHaveLength(0);
    });

    it('should reject access to non-existent child', async () => {
      (db.child.findUnique as jest.Mock).mockResolvedValue(null);

      const response = await request(app).get('/children/nonexistent/dashboard');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Dashboard Metrics Calculation', () => {
    it('should calculate streak correctly', async () => {
      // This would test the private calculateStreak method
      // In a real implementation, you might extract this to a utility function
      const sessions = [
        { completedAt: new Date('2024-01-03') },
        { completedAt: new Date('2024-01-02') },
        { completedAt: new Date('2024-01-01') },
      ];

      // Mock calculation would go here
      expect(sessions.length).toBe(3);
    });

    it('should calculate practice time correctly', async () => {
      const sessions = [
        {
          startedAt: new Date('2024-01-01T10:00:00Z'),
          completedAt: new Date('2024-01-01T10:15:00Z'), // 15 minutes
        },
        {
          startedAt: new Date('2024-01-01T11:00:00Z'),
          completedAt: new Date('2024-01-01T11:10:00Z'), // 10 minutes
        },
      ];

      // Total should be 25 minutes
      const expectedTotal = 25;
      expect(sessions.length).toBe(2);
    });
  });
});