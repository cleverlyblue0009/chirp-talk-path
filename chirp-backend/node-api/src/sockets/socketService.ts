import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
import admin from 'firebase-admin';
import { db } from '../utils/database';
import { logger } from '../utils/logger';
import { TTSService } from '../services/tts';
import { SocketEvents } from '../types';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userRole?: string;
  childId?: string;
}

export class SocketService {
  private io: SocketIOServer;
  private static instance: SocketService;

  constructor(server: HTTPServer) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: process.env.CORS_ORIGINS?.split(',') || ["http://localhost:5173"],
        methods: ["GET", "POST"],
        credentials: true,
      },
      transports: ['websocket', 'polling'],
    });

    this.setupMiddleware();
    this.setupEventHandlers();
  }

  static getInstance(server?: HTTPServer): SocketService {
    if (!SocketService.instance && server) {
      SocketService.instance = new SocketService(server);
    }
    return SocketService.instance;
  }

  /**
   * Setup authentication middleware
   */
  private setupMiddleware(): void {
    this.io.use(async (socket: AuthenticatedSocket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
          return next(new Error('Authentication required'));
        }

        // Verify Firebase token
        const decodedToken = await admin.auth().verifyIdToken(token);
        
        // Get user from database
        const user = await db.user.findUnique({
          where: { email: decodedToken.email! },
          select: { id: true, role: true },
        });

        if (!user) {
          return next(new Error('User not found'));
        }

        socket.userId = user.id;
        socket.userRole = user.role;
        
        logger.info(`Socket authenticated: ${socket.id} (user: ${user.id})`);
        next();
      } catch (error) {
        logger.error('Socket authentication error:', error);
        next(new Error('Authentication failed'));
      }
    });
  }

  /**
   * Setup event handlers
   */
  private setupEventHandlers(): void {
    this.io.on('connection', (socket: AuthenticatedSocket) => {
      logger.info(`Client connected: ${socket.id}`);

      // Join user-specific room
      if (socket.userId) {
        socket.join(`user:${socket.userId}`);
      }

      // Handle session start
      socket.on('session:start', async (data: { sessionId: string }) => {
        try {
          await this.handleSessionStart(socket, data);
        } catch (error) {
          logger.error('Session start error:', error);
          socket.emit('error', { message: 'Failed to start session' });
        }
      });

      // Handle media chunk (if using streaming)
      socket.on('session:media_chunk', async (data: { sessionId: string; chunk: Buffer }) => {
        try {
          await this.handleMediaChunk(socket, data);
        } catch (error) {
          logger.error('Media chunk error:', error);
        }
      });

      // Handle disconnect
      socket.on('disconnect', (reason) => {
        logger.info(`Client disconnected: ${socket.id} (reason: ${reason})`);
      });

      // Handle errors
      socket.on('error', (error) => {
        logger.error(`Socket error for ${socket.id}:`, error);
      });
    });
  }

  /**
   * Handle session start event
   */
  private async handleSessionStart(socket: AuthenticatedSocket, data: { sessionId: string }): Promise<void> {
    const { sessionId } = data;

    // Verify session access
    const session = await db.session.findFirst({
      where: {
        id: sessionId,
        child: {
          OR: [
            { guardians: { some: { id: socket.userId } } },
            { therapistId: socket.userId },
          ],
        },
      },
      include: {
        child: true,
        scenario: true,
      },
    });

    if (!session) {
      socket.emit('error', { message: 'Session not found or access denied' });
      return;
    }

    // Join session room
    socket.join(`session:${sessionId}`);
    socket.childId = session.childId;

    logger.info(`User ${socket.userId} joined session ${sessionId}`);

    // Start the conversation flow
    await this.startConversationFlow(sessionId, session);
  }

  /**
   * Handle media chunk for streaming (optional)
   */
  private async handleMediaChunk(socket: AuthenticatedSocket, data: { sessionId: string; chunk: Buffer }): Promise<void> {
    // This could be used for real-time streaming analysis
    // For now, we'll just log it
    logger.debug(`Received media chunk for session ${data.sessionId}: ${data.chunk.length} bytes`);
    
    // TODO: Implement real-time streaming analysis if needed
    // For the current implementation, we expect complete file uploads via REST API
  }

  /**
   * Start conversation flow for a session
   */
  private async startConversationFlow(sessionId: string, session: any): Promise<void> {
    try {
      // Get scenario script if available
      let script = null;
      if (session.scenario?.scriptJson) {
        script = session.scenario.scriptJson;
      }

      // Send initial avatar cue
      const welcomeText = script?.welcome || "Hi! I'm excited to practice conversation with you today!";
      
      await this.sendAvatarCue(sessionId, {
        cue: 'speak',
        text: welcomeText,
        mood: 'cheer',
      });

      // Send progress update
      this.emitToSession(sessionId, 'session:progress', {
        step: 1,
        percent: 10,
        message: 'Session started! Let\'s begin our conversation.',
      });

    } catch (error) {
      logger.error('Error starting conversation flow:', error);
      this.emitToSession(sessionId, 'error', { message: 'Failed to start conversation' });
    }
  }

  /**
   * Send avatar cue with TTS and visemes
   */
  async sendAvatarCue(sessionId: string, data: {
    cue: 'speak' | 'nod' | 'wink' | 'celebrate';
    text?: string;
    mood?: 'idle' | 'cheer' | 'think' | 'demo' | 'celebrate';
  }): Promise<void> {
    try {
      let ttsResponse = null;
      
      if (data.text) {
        // Generate TTS with visemes
        ttsResponse = await TTSService.synthesize({
          text: data.text,
          returnPhonemes: true,
        });
      }

      // Send cue to session
      this.emitToSession(sessionId, 'session:cue:avatar', {
        cue: data.cue,
        text: data.text,
        ttsAudioUrl: ttsResponse?.audioUrl,
        visemeTimeline: ttsResponse?.visemeTimeline,
        mood: data.mood || 'idle',
      });

      logger.info(`Avatar cue sent to session ${sessionId}: ${data.cue}`);
    } catch (error) {
      logger.error('Error sending avatar cue:', error);
    }
  }

  /**
   * Send progress update
   */
  sendProgress(sessionId: string, step: number, percent: number, message?: string): void {
    this.emitToSession(sessionId, 'session:progress', {
      step,
      percent,
      message,
    });
  }

  /**
   * Send feedback to session
   */
  async sendFeedback(sessionId: string, feedback: {
    scoreDelta: number;
    gentleText: string;
    suggestion: string;
    exampleResponse?: string;
  }): Promise<void> {
    try {
      let ttsUrl = undefined;
      
      if (feedback.exampleResponse) {
        const ttsResponse = await TTSService.synthesize({
          text: feedback.exampleResponse,
          returnPhonemes: false,
        });
        ttsUrl = ttsResponse.audioUrl;
      }

      this.emitToSession(sessionId, 'session:feedback', {
        ...feedback,
        ttsUrl,
      });
    } catch (error) {
      logger.error('Error sending feedback:', error);
    }
  }

  /**
   * Send reward notification
   */
  sendReward(sessionId: string, reward: {
    coins: number;
    companionUnlocked?: any;
    message: string;
  }): void {
    this.emitToSession(sessionId, 'session:reward', reward);
  }

  /**
   * Emit event to specific session
   */
  emitToSession(sessionId: string, event: string, data: any): void {
    this.io.to(`session:${sessionId}`).emit(event, data);
  }

  /**
   * Emit event to specific user
   */
  emitToUser(userId: string, event: string, data: any): void {
    this.io.to(`user:${userId}`).emit(event, data);
  }

  /**
   * Emit event to child's guardians and therapist
   */
  async emitToChild(childId: string, event: string, data: any): Promise<void> {
    try {
      const child = await db.child.findUnique({
        where: { id: childId },
        include: {
          guardians: { select: { id: true } },
          therapist: { select: { id: true } },
        },
      });

      if (!child) return;

      // Emit to all guardians
      child.guardians.forEach(guardian => {
        this.emitToUser(guardian.id, event, data);
      });

      // Emit to therapist if assigned
      if (child.therapist) {
        this.emitToUser(child.therapist.id, event, data);
      }
    } catch (error) {
      logger.error('Error emitting to child stakeholders:', error);
    }
  }

  /**
   * Handle session completion flow
   */
  async handleSessionCompletion(sessionId: string, results: any): Promise<void> {
    try {
      // Send completion cue
      await this.sendAvatarCue(sessionId, {
        cue: 'celebrate',
        text: 'Great job! You did wonderful in our conversation today!',
        mood: 'celebrate',
      });

      // Send final progress
      this.sendProgress(sessionId, 100, 100, 'Session completed!');

      // If there are rewards, send them
      if (results.rewards && results.rewards.length > 0) {
        this.sendReward(sessionId, {
          coins: results.rewards.reduce((sum: number, r: any) => sum + (r.amount || 0), 0),
          companionUnlocked: results.unlocks?.[0],
          message: 'You earned some rewards!',
        });
      }

    } catch (error) {
      logger.error('Error handling session completion:', error);
    }
  }

  /**
   * Get connected clients count
   */
  getConnectedCount(): number {
    return this.io.sockets.sockets.size;
  }

  /**
   * Get session participants count
   */
  getSessionParticipants(sessionId: string): number {
    const room = this.io.sockets.adapter.rooms.get(`session:${sessionId}`);
    return room ? room.size : 0;
  }

  /**
   * Disconnect all clients (for shutdown)
   */
  async disconnectAll(): Promise<void> {
    this.io.disconnectSockets();
  }
}