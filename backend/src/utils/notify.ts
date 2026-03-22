import { prisma } from '../prismaClient';
import { Server } from 'socket.io';

let io: Server | null = null;

// Cache admin IDs — they never change at runtime
let adminIdCache: string[] | null = null;
async function getAdminIds(): Promise<string[]> {
  if (adminIdCache) return adminIdCache;
  const admins = await prisma.user.findMany({ where: { role: 'ADMIN' }, select: { id: true } });
  adminIdCache = admins.map(a => a.id);
  return adminIdCache;
}

export function setSocketIO(socketIO: Server) {
  io = socketIO;
}

export type NotificationType =
  | 'ORDER_PLACED'
  | 'ORDER_STATUS_UPDATED'
  | 'DELIVERY_ASSIGNED'
  | 'DELIVERY_COMPLETED'
  | 'RESET_REQUESTED'
  | 'RESET_APPROVED'
  | 'RESET_REJECTED'
  | 'NEW_STALL_REGISTERED'
  | 'NEW_REVIEW'
  | 'STALL_APPROVED';

interface CreateNotificationOptions {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
}

export async function createNotification(opts: CreateNotificationOptions) {
  const notification = await prisma.notification.create({
    data: {
      userId: opts.userId,
      type: opts.type,
      title: opts.title,
      message: opts.message,
      data: opts.data ? JSON.stringify(opts.data) : null,
    },
  });

  // Push to connected client in real-time if they're online
  if (io) {
    io.to(`user:${opts.userId}`).emit('notification', {
      id: notification.id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      data: opts.data ?? null,
      isRead: false,
      createdAt: notification.createdAt,
    });
  }

  return notification;
}

/** Notify all admins */
export async function notifyAdmins(opts: Omit<CreateNotificationOptions, 'userId'>) {
  const adminIds = await getAdminIds();
  await Promise.all(adminIds.map(id => createNotification({ ...opts, userId: id })));
}
