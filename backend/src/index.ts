import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';

// Import routes
import authRoutes from './routes/auth';
import stallRoutes from './routes/stalls';
import orderRoutes from './routes/orders';
import deliveryRoutes from './routes/deliveries';
import adminRoutes from './routes/admin';
import reviewRoutes from './routes/reviews';
import paymentRoutes from './routes/payments';
import { startBackupScheduler } from './utils/backup';
import { setSocketIO } from './utils/notify';
import notificationRoutes from './routes/notifications';
import { verifyToken } from './utils/auth';
import { prisma } from './prismaClient';

// Load environment variables
dotenv.config();

const app = express();
const server = createServer(app);
const allowedOrigins = [
  process.env.FRONTEND_URL || "http://localhost:3000",
  "http://localhost:3000",
  "https://klabu.site",
  "https://www.klabu.site",
];

const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Allow requests with no origin (mobile apps, curl, server-to-server)
    if (!origin) return callback(null, true);
    // Allow any Vercel preview deployment for this project
    if (origin.endsWith('.vercel.app') || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    callback(new Error(`CORS blocked: ${origin}`));
  },
  credentials: true,
};

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"]
  }
});

setSocketIO(io);

// Authenticate every socket connection via JWT
io.use((socket, next) => {
  const token = socket.handshake.auth?.token as string | undefined;
  if (!token) return next(new Error('Authentication required'));
  try {
    const decoded = verifyToken(token);
    socket.data.userId = decoded.userId;
    socket.data.role = decoded.role;
    next();
  } catch {
    next(new Error('Invalid or expired token'));
  }
});

// Middleware
app.use(helmet());
app.use(cors(corsOptions));
app.use(express.json({ limit: '500kb' }));
app.use(express.urlencoded({ extended: true, limit: '500kb' }));

// Make io accessible to routes
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/stalls', stallRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/deliveries', deliveryRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/notifications', notificationRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Socket.io for real-time notifications
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  // Join user to their personal notification room
  socket.on('join-user', (userId: string) => {
    if (userId === socket.data.userId) {
      socket.join(`user:${userId}`);
    }
  });

  // Join delivery person to their room — verify ownership
  socket.on('join-delivery', async (deliveryPersonId: string) => {
    if (socket.data.role !== 'DELIVERY_PERSON') return;
    const dp = await prisma.deliveryPerson.findFirst({
      where: { id: deliveryPersonId, userId: socket.data.userId },
      select: { id: true }
    });
    if (dp) socket.join(`delivery-${deliveryPersonId}`);
  });

  // Join stall owner to their room — verify ownership
  socket.on('join-stall', async (stallId: string) => {
    if (socket.data.role !== 'STALL_OWNER') return;
    const stall = await prisma.stall.findFirst({
      where: { id: stallId, stallOwner: { userId: socket.data.userId } },
      select: { id: true }
    });
    if (stall) socket.join(`stall-${stallId}`);
  });
  
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

const PORT = process.env.PORT || 5000;

server.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📱 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
  startBackupScheduler();
});

export { io };
