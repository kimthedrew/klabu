import express from 'express';
import { prisma } from '../prismaClient';
import { authenticateToken, requireRole, AuthRequest } from '../utils/auth';
import { getCache, setCache, invalidateCache } from '../utils/cache';
import { createNotification } from '../utils/notify';

const router = express.Router();

// Get dashboard stats
router.get('/dashboard', authenticateToken, requireRole(['ADMIN']), async (req: AuthRequest, res) => {
  try {
    const cached = getCache<any>('admin:dashboard');
    if (cached) return res.json(cached);

    const [
      totalStalls,
      totalOrders,
      totalDeliveryPersons,
      activeDeliveryPersons,
      totalRevenue,
      pendingOrders,
      completedOrders,
      recentOrders,
      topStalls
    ] = await Promise.all([
      prisma.stall.count({ where: { isActive: true } }),
      prisma.order.count(),
      prisma.deliveryPerson.count(),
      prisma.deliveryPerson.count({ where: { isActive: true } }),
      prisma.payment.aggregate({
        where: { status: 'CONFIRMED' },
        _sum: { amount: true }
      }),
      prisma.order.count({ where: { status: 'PENDING' } }),
      prisma.order.count({ where: { status: 'DELIVERED' } }),
      prisma.order.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          stall: { include: { stallOwner: true } },
          deliveryPerson: true,
          items: { include: { menuItem: true } }
        }
      }),
      prisma.stall.findMany({
        include: {
          stallOwner: { select: { fullName: true } },
          _count: { select: { orders: true } }
        },
        orderBy: { orders: { _count: 'desc' } },
        take: 5
      })
    ]);

    const response = {
      stats: {
        totalStalls,
        totalOrders,
        totalDeliveryPersons,
        activeDeliveryPersons,
        totalRevenue: totalRevenue._sum.amount || 0,
        pendingOrders,
        completedOrders
      },
      recentOrders,
      topStalls: topStalls.map(stall => ({
        id: stall.id,
        name: stall.name,
        owner: stall.stallOwner.fullName,
        totalOrders: stall._count.orders,
        averageRating: (stall as any).averageRating ?? 0
      }))
    };

    setCache('admin:dashboard', response, 30);
    return res.json(response);

  } catch (error) {
    console.error('Get dashboard error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all orders with filters
router.get('/orders', authenticateToken, requireRole(['ADMIN']), async (req: AuthRequest, res) => {
  try {
    const { status, page = 1, limit = 20, search } = req.query;
    
    const whereClause: any = {};
    
    if (status) {
      whereClause.status = status;
    }
    
    if (search) {
      whereClause.OR = [
        { customerName: { contains: search as string, mode: 'insensitive' } },
        { customerPhone: { contains: search as string } },
        { stall: { name: { contains: search as string, mode: 'insensitive' } } }
      ];
    }

    const orders = await prisma.order.findMany({
      where: whereClause,
      include: {
        stall: {
          include: {
            stallOwner: true
          }
        },
        deliveryPerson: true,
        items: {
          include: {
            menuItem: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit)
    });

    const total = await prisma.order.count({
      where: whereClause
    });

    res.json({
      orders,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });

  } catch (error) {
    console.error('Get admin orders error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all stall owners (including those without stalls)
router.get('/stalls', authenticateToken, requireRole(['ADMIN']), async (req: AuthRequest, res) => {
  try {
    const { page = 1, limit = 100, search } = req.query;
    
    const whereClause: any = {};
    
    if (search) {
      whereClause.OR = [
        { fullName: { contains: search as string, mode: 'insensitive' } },
        { businessName: { contains: search as string, mode: 'insensitive' } },
        { stall: { name: { contains: search as string, mode: 'insensitive' } } }
      ];
    }

    const stallOwners = await prisma.stallOwner.findMany({
      where: whereClause,
      include: {
        user: true,
        stall: {
          include: {
            _count: { select: { menuItems: true, orders: true, reviews: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit)
    });

    const total = await prisma.stallOwner.count({
      where: whereClause
    });

    res.json({
      stalls: stallOwners,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });

  } catch (error) {
    console.error('Get admin stalls error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all delivery persons
router.get('/delivery-persons', authenticateToken, requireRole(['ADMIN']), async (req: AuthRequest, res) => {
  try {
    const { page = 1, limit = 100, search } = req.query;
    
    const whereClause: any = {};
    
    if (search) {
      whereClause.fullName = { contains: search as string, mode: 'insensitive' };
    }

    const deliveryPersons = await prisma.deliveryPerson.findMany({
      where: whereClause,
      include: {
        user: true,
        _count: { select: { deliveries: true } }
      },
      orderBy: { createdAt: 'desc' },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit)
    });

    const total = await prisma.deliveryPerson.count({
      where: whereClause
    });

    res.json({
      deliveryPersons,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });

  } catch (error) {
    console.error('Get admin delivery persons error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Toggle stall active status
router.patch('/stalls/:stallId/toggle', authenticateToken, requireRole(['ADMIN']), async (req: AuthRequest, res) => {
  try {
    const { stallId } = req.params;

    const stall = await prisma.stall.findUnique({
      where: { id: stallId }
    });

    if (!stall) {
      return res.status(404).json({ error: 'Stall not found' });
    }

    const updatedStall = await prisma.stall.update({
      where: { id: stallId },
      data: { isActive: !stall.isActive }
    });

    invalidateCache('stalls:');
    res.json({
      message: `Stall ${updatedStall.isActive ? 'activated' : 'deactivated'} successfully`,
      stall: updatedStall
    });

  } catch (error) {
    console.error('Toggle stall status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get revenue analytics
router.get('/analytics/revenue', authenticateToken, requireRole(['ADMIN']), async (req: AuthRequest, res) => {
  try {
    const { period = '30' } = req.query;
    const days = Number(period);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const revenue = await prisma.payment.aggregate({
      where: {
        status: 'CONFIRMED',
        createdAt: {
          gte: startDate
        }
      },
      _sum: { amount: true },
      _count: true
    });

    // Daily revenue for the period
    const dailyRevenue = await prisma.payment.groupBy({
      by: ['createdAt'],
      where: {
        status: 'CONFIRMED',
        createdAt: {
          gte: startDate
        }
      },
      _sum: { amount: true },
      _count: true,
      orderBy: { createdAt: 'asc' }
    });

    res.json({
      totalRevenue: revenue._sum.amount || 0,
      totalTransactions: revenue._count,
      dailyRevenue
    });

  } catch (error) {
    console.error('Get revenue analytics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Approve/Reject stall owner
router.patch('/stall-owners/:id/approve', authenticateToken, requireRole(['ADMIN']), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { approved } = req.body;

    const stallOwner = await prisma.stallOwner.update({
      where: { id },
      data: { isApproved: approved },
      include: {
        user: true,
        stall: true
      }
    });

    res.json({
      message: `Stall owner ${approved ? 'approved' : 'rejected'} successfully`,
      stallOwner
    });

  } catch (error) {
    console.error('Approve stall owner error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Approve/Reject delivery person
router.patch('/delivery-persons/:id/approve', authenticateToken, requireRole(['ADMIN']), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { approved } = req.body;

    const deliveryPerson = await prisma.deliveryPerson.update({
      where: { id },
      data: { isApproved: approved },
      include: {
        user: true
      }
    });

    res.json({
      message: `Delivery person ${approved ? 'approved' : 'rejected'} successfully`,
      deliveryPerson
    });

  } catch (error) {
    console.error('Approve delivery person error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Toggle stall owner active status
router.patch('/stall-owners/:id/toggle', authenticateToken, requireRole(['ADMIN']), async (req: AuthRequest, res) => {
  const { id } = req.params;

  const stallOwner = await prisma.stallOwner.findUnique({
    where: { id },
    include: { stall: true }
  });

  if (!stallOwner) {
    return res.status(404).json({ error: 'Stall owner not found' });
  }

  const newActive = !stallOwner.isActive;

  // CockroachDB can return P2034 (write conflict) — retry up to 5 times
  let updatedStallOwner: any = null;
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      updatedStallOwner = await prisma.$transaction(async (tx) => {
        const updated = await tx.stallOwner.update({
          where: { id },
          data: { isActive: newActive },
          include: { user: true, stall: true }
        });
        if (stallOwner.stall) {
          await tx.stall.update({
            where: { id: stallOwner.stall.id },
            data: { isActive: newActive }
          });
        }
        return updated;
      });
      break;
    } catch (err: any) {
      if (err?.code === 'P2034' && attempt < 4) continue;
      console.error('Toggle stall owner status error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  return res.json({
    message: `Stall owner ${updatedStallOwner.isActive ? 'activated' : 'deactivated'} successfully`,
    stallOwner: updatedStallOwner
  });
});

// Toggle delivery person active status
router.patch('/delivery-persons/:id/toggle', authenticateToken, requireRole(['ADMIN']), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const deliveryPerson = await prisma.deliveryPerson.findUnique({
      where: { id }
    });

    if (!deliveryPerson) {
      return res.status(404).json({ error: 'Delivery person not found' });
    }

    const updatedDeliveryPerson = await prisma.deliveryPerson.update({
      where: { id },
      data: { isActive: !deliveryPerson.isActive },
      include: {
        user: true
      }
    });

    res.json({
      message: `Delivery person ${updatedDeliveryPerson.isActive ? 'activated' : 'deactivated'} successfully`,
      deliveryPerson: updatedDeliveryPerson
    });

  } catch (error) {
    console.error('Toggle delivery person status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get payment config
router.get('/payment-config', authenticateToken, requireRole(['ADMIN']), async (req: AuthRequest, res) => {
  try {
    const cached = getCache<any>('config:payment');
    if (cached) return res.json(cached);

    const config = await prisma.paymentConfig.findUnique({ where: { id: 'singleton' } })
      ?? await prisma.paymentConfig.create({ data: { id: 'singleton', stkPushEnabled: false, deliveryFee: 50, fastDeliveryFee: 50, slowDeliveryFee: 30, commissionRate: 0.33 } });
    const response = { config };
    setCache('config:payment', response, 300);
    res.json(response);
  } catch (error) {
    console.error('Get payment config error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update delivery fees, commission rate and optional note
router.patch('/payment-config/delivery-fee', authenticateToken, requireRole(['ADMIN']), async (req: AuthRequest, res) => {
  try {
    const { fastDeliveryFee, slowDeliveryFee, commissionRate, deliveryFeeNote } = req.body;

    if (fastDeliveryFee !== undefined && (typeof fastDeliveryFee !== 'number' || fastDeliveryFee < 0)) {
      return res.status(400).json({ error: 'fastDeliveryFee must be a non-negative number' });
    }
    if (slowDeliveryFee !== undefined && (typeof slowDeliveryFee !== 'number' || slowDeliveryFee < 0)) {
      return res.status(400).json({ error: 'slowDeliveryFee must be a non-negative number' });
    }
    if (commissionRate !== undefined && (typeof commissionRate !== 'number' || commissionRate < 0 || commissionRate > 1)) {
      return res.status(400).json({ error: 'commissionRate must be a number between 0 and 1' });
    }

    const updateData: any = {};
    if (fastDeliveryFee !== undefined) {
      updateData.fastDeliveryFee = fastDeliveryFee;
      updateData.deliveryFee = fastDeliveryFee; // keep legacy field in sync
    }
    if (slowDeliveryFee !== undefined) updateData.slowDeliveryFee = slowDeliveryFee;
    if (commissionRate !== undefined) updateData.commissionRate = commissionRate;
    if (deliveryFeeNote !== undefined) updateData.deliveryFeeNote = deliveryFeeNote || null;

    const config = await prisma.paymentConfig.upsert({
      where: { id: 'singleton' },
      update: updateData,
      create: {
        id: 'singleton',
        stkPushEnabled: false,
        fastDeliveryFee: fastDeliveryFee ?? 50,
        slowDeliveryFee: slowDeliveryFee ?? 30,
        deliveryFee: fastDeliveryFee ?? 50,
        commissionRate: commissionRate ?? 0.33,
        deliveryFeeNote: deliveryFeeNote || null
      }
    });

    invalidateCache('config:delivery');
    invalidateCache('config:payment');
    res.json({ message: 'Delivery settings updated successfully', config });
  } catch (error) {
    console.error('Update delivery fee error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Toggle STK Push on/off
router.patch('/payment-config/stk-push', authenticateToken, requireRole(['ADMIN']), async (req: AuthRequest, res) => {
  try {
    const { enabled } = req.body;
    if (typeof enabled !== 'boolean') {
      return res.status(400).json({ error: 'enabled must be a boolean' });
    }

    const config = await prisma.paymentConfig.upsert({
      where: { id: 'singleton' },
      update: { stkPushEnabled: enabled },
      create: { id: 'singleton', stkPushEnabled: enabled }
    });

    invalidateCache('config:payment');
    res.json({
      message: `STK Push ${enabled ? 'enabled' : 'disabled'} successfully`,
      config
    });
  } catch (error) {
    console.error('Toggle STK Push error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Settlements: Stalls balances summary
router.get('/settlements/stalls-summary', authenticateToken, requireRole(['ADMIN']), async (req: AuthRequest, res) => {
  try {
    const entries = await prisma.ledgerEntry.findMany({ where: { entityType: 'STALL_OWNER', status: { in: ['OPEN'] } } });
    const byStallOwner: Record<string, { youOwe: number; theyOwe: number; net: number }> = {};
    for (const e of entries) {
      const acc = byStallOwner[e.entityId] || { youOwe: 0, theyOwe: 0, net: 0 };
      if (e.direction === 'YOU_OWE') acc.youOwe += e.amount; else acc.theyOwe += e.amount;
      acc.net = acc.youOwe - acc.theyOwe;
      byStallOwner[e.entityId] = acc;
    }
    // join owner details
    const ownerIds = Object.keys(byStallOwner);
    const owners = await prisma.stallOwner.findMany({ where: { id: { in: ownerIds } } });
    const result = owners.map(o => ({
      stallOwnerId: o.id,
      fullName: o.fullName,
      businessName: o.businessName,
      youOwe: byStallOwner[o.id]?.youOwe || 0,
      theyOwe: byStallOwner[o.id]?.theyOwe || 0,
      net: byStallOwner[o.id]?.net || 0
    }));
    res.json({ stalls: result });
  } catch (error) {
    console.error('Get stalls settlements summary error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Settlements: Delivery persons trips summary (count completed deliveries + earnings)
router.get('/settlements/delivery-persons-summary', authenticateToken, requireRole(['ADMIN']), async (req: AuthRequest, res) => {
  try {
    const [grouped, earningsAgg, people] = await Promise.all([
      prisma.order.groupBy({
        by: ['deliveryPersonId'],
        where: { status: 'DELIVERED', deliveryPersonId: { not: null } },
        _count: { id: true }
      }),
      prisma.order.groupBy({
        by: ['deliveryPersonId'],
        where: { status: 'DELIVERED', deliveryPersonId: { not: null } },
        _sum: { deliveryPersonEarnings: true }
      }),
      prisma.deliveryPerson.findMany({ select: { id: true, fullName: true, phoneNumber: true } })
    ]);

    const counts: Record<string, number> = {};
    for (const g of grouped) counts[g.deliveryPersonId as string] = g._count.id;

    const earnings: Record<string, number> = {};
    for (const g of earningsAgg) earnings[g.deliveryPersonId as string] = g._sum.deliveryPersonEarnings ?? 0;

    const result = people
      .filter(p => counts[p.id] !== undefined)
      .map(p => ({
        deliveryPersonId: p.id,
        fullName: p.fullName,
        phoneNumber: p.phoneNumber,
        trips: counts[p.id],
        totalEarnings: earnings[p.id] ?? 0
      }));

    res.json({ deliveryPersons: result });
  } catch (error) {
    console.error('Get delivery persons trips summary error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Ledger entries list for an entity
router.get('/settlements/:entityType/:entityId/entries', authenticateToken, requireRole(['ADMIN']), async (req: AuthRequest, res) => {
  try {
    const { entityType, entityId } = req.params;
    const { status = 'OPEN' } = req.query;
    const entries = await prisma.ledgerEntry.findMany({
      where: {
        entityType,
        entityId,
        status: status as string
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ entries });
  } catch (error) {
    console.error('List ledger entries error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Clear entries by ids
router.post('/settlements/entries/clear', authenticateToken, requireRole(['ADMIN']), async (req: AuthRequest, res) => {
  try {
    const { entryIds } = req.body as { entryIds: string[] };
    if (!entryIds || entryIds.length === 0) {
      return res.status(400).json({ error: 'entryIds is required' });
    }
    const result = await prisma.ledgerEntry.updateMany({
      where: { id: { in: entryIds }, status: 'OPEN' },
      data: { status: 'CLEARED', clearedAt: new Date(), clearedBy: req.user!.id }
    });
    res.json({ message: 'Entries cleared', updated: result.count });
  } catch (error) {
    console.error('Clear ledger entries error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// List all password reset requests
router.get('/reset-requests', authenticateToken, requireRole(['ADMIN']), async (req: AuthRequest, res) => {
  try {
    const { status } = req.query;
    const requests = await prisma.passwordResetRequest.findMany({
      where: status ? { status: status as string } : undefined,
      include: { user: { select: { id: true, email: true, role: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ requests });
  } catch (error) {
    console.error('Get reset requests error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Approve or reject a password reset request
router.patch('/reset-requests/:id', authenticateToken, requireRole(['ADMIN']), async (req: AuthRequest, res) => {
  try {
    const { action } = req.body as { action: 'approve' | 'reject' };
    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ error: 'action must be "approve" or "reject"' });
    }

    const request = await prisma.passwordResetRequest.findUnique({
      where: { id: req.params['id'] },
      include: { user: true },
    });
    if (!request) return res.status(404).json({ error: 'Reset request not found' });
    if (request.status !== 'PENDING') return res.status(400).json({ error: 'Request already resolved' });

    const newStatus = action === 'approve' ? 'APPROVED' : 'REJECTED';

    await prisma.passwordResetRequest.update({
      where: { id: request.id },
      data: { status: newStatus, resolvedBy: req.user!.id, resolvedAt: new Date() },
    });

    if (action === 'approve') {
      // Flag user account so they can set a new password on the login page
      await prisma.user.update({
        where: { id: request.userId },
        data: { pendingPasswordReset: true },
      });
    }

    // Notify the user of the decision
    await createNotification({
      userId: request.userId,
      type: action === 'approve' ? 'RESET_APPROVED' : 'RESET_REJECTED',
      title: action === 'approve' ? 'Password Reset Approved' : 'Password Reset Rejected',
      message: action === 'approve'
        ? 'Your password reset request was approved. Go to the login page to set a new password.'
        : 'Your password reset request was rejected. Contact the admin if you think this is a mistake.',
      data: { requestId: request.id },
    });

    res.json({ message: `Request ${newStatus.toLowerCase()}` });
  } catch (error) {
    console.error('Resolve reset request error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
