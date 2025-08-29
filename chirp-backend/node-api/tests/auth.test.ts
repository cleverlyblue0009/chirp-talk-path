import request from 'supertest';
import express from 'express';
import { AuthController } from '../src/controllers/authController';
import { db } from '../src/utils/database';
import { Role } from '@prisma/client';

const app = express();
app.use(express.json());
app.post('/auth/firebase-login', AuthController.firebaseLogin);

describe('Authentication', () => {
  describe('POST /auth/firebase-login', () => {
    it('should create new user and return token', async () => {
      // Mock Firebase token verification
      const mockVerifyIdToken = jest.fn().mockResolvedValue({
        uid: 'firebase-uid-123',
        email: 'newuser@example.com',
        name: 'New User',
      });
      
      require('firebase-admin').auth = () => ({
        verifyIdToken: mockVerifyIdToken,
      });

      // Mock database calls
      (db.user.findUnique as jest.Mock).mockResolvedValue(null); // User doesn't exist
      (db.user.create as jest.Mock).mockResolvedValue({
        id: 'user-123',
        email: 'newuser@example.com',
        role: Role.PARENT,
        displayName: 'New User',
        createdAt: new Date(),
      });

      const response = await request(app)
        .post('/auth/firebase-login')
        .send({
          idToken: 'valid-firebase-token',
          role: 'PARENT',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe('newuser@example.com');
      expect(mockVerifyIdToken).toHaveBeenCalledWith('valid-firebase-token');
    });

    it('should return existing user and token', async () => {
      const mockVerifyIdToken = jest.fn().mockResolvedValue({
        uid: 'firebase-uid-123',
        email: 'existing@example.com',
        name: 'Existing User',
      });
      
      require('firebase-admin').auth = () => ({
        verifyIdToken: mockVerifyIdToken,
      });

      // Mock existing user
      (db.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'existing-user-123',
        email: 'existing@example.com',
        role: Role.PARENT,
        displayName: 'Existing User',
        createdAt: new Date(),
      });

      (db.user.update as jest.Mock).mockResolvedValue({});

      const response = await request(app)
        .post('/auth/firebase-login')
        .send({
          idToken: 'valid-firebase-token',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(response.body.user.email).toBe('existing@example.com');
      expect(db.user.create).not.toHaveBeenCalled();
    });

    it('should reject invalid Firebase token', async () => {
      const mockVerifyIdToken = jest.fn().mockRejectedValue(new Error('Invalid token'));
      
      require('firebase-admin').auth = () => ({
        verifyIdToken: mockVerifyIdToken,
      });

      const response = await request(app)
        .post('/auth/firebase-login')
        .send({
          idToken: 'invalid-token',
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject request without token', async () => {
      const response = await request(app)
        .post('/auth/firebase-login')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });
});