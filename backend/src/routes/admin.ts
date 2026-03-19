import express from 'express';
import { prisma } from '../prismaClient';
import { authenticateToken, requireRole, AuthRequest } from '../utils/auth';
import { getCache, setCache, invalidateCache } from '../utils/cache';

const router = express.Router();

// Get dashboard stats
router.get('/dashboard', authenticateToken, requireRole(['ADMIN']), async (req: AuthRequest, res) => {
  try {
    const [
      totalStalls,
      totalOrders,
      totalDeliveryPersons,
      activeDeliveryPersons,
      totalRevenue,
      pendingOrders,
      completedOrders
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
      prisma.order.count({ where: { status: 'DELIVERED' } })
    ]);

    // Get recent orders
    const recentOrders = await prisma.order.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
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
      }
    });

    // Get top performing stalls
    const topStalls = await prisma.stall.findMany({
      include: {
        stallOwner: true,
        orders: {
          where: { status: 'DELIVERED' }
        },
        reviews: true
      },
      orderBy: {
        orders: {
          _count: 'desc'
        }
      },
      take: 5
    });

    res.json({
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
        totalOrders: stall.orders.length,
        averageRating: stall.reviews.length > 0 
          ? stall.reviews.reduce((sum, review) => sum + review.rating, 0) / stall.reviews.length 
          : 0
      }))
    });

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
            menuItems: true,
            orders: true,
            reviews: true
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
        deliveries: {
          include: {
            order: true
          }
        }
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
  try {
    const { id } = req.params;

    const stallOwner = await prisma.stallOwner.findUnique({
      where: { id },
      include: {
        stall: true
      }
    });

    if (!stallOwner) {
      return res.status(404).json({ error: 'Stall owner not found' });
    }

    const updatedStallOwner = await prisma.stallOwner.update({
      where: { id },
      data: { isActive: !stallOwner.isActive },
      include: {
        user: true,
        stall: true
      }
    });

    // Also toggle the stall's active status if it exists
    if (stallOwner.stall) {
      await prisma.stall.update({
        where: { id: stallOwner.stall.id },
        data: { isActive: !stallOwner.isActive }
      });
    }

    res.json({
      message: `Stall owner ${updatedStallOwner.isActive ? 'activated' : 'deactivated'} successfully`,
      stallOwner: updatedStallOwner
    });

  } catch (error) {
    console.error('Toggle stall owner status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
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

    const config = await prisma.paymentConfig.upsert({
      where: { id: 'singleton' },
      update: {},
      create: { id: 'singleton', stkPushEnabled: false }
    });
    const response = { config };
    setCache('config:payment', response, 300);
    res.json(response);
  } catch (error) {
    console.error('Get payment config error:', error);
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

// Settlements: Delivery persons trips summary (count completed deliveries)
router.get('/settlements/delivery-persons-summary', authenticateToken, requireRole(['ADMIN']), async (req: AuthRequest, res) => {
  try {
    // Count delivered orders grouped by deliveryPersonId
    const deliveredOrders = await prisma.order.findMany({
      where: { status: 'DELIVERED', deliveryPersonId: { not: null } },
      select: { deliveryPersonId: true }
    });
    const counts: Record<string, number> = {};
    for (const o of deliveredOrders) {
      const id = o.deliveryPersonId as string;
      counts[id] = (counts[id] || 0) + 1;
    }
    const ids = Object.keys(counts);
    const people = await prisma.deliveryPerson.findMany({ where: { id: { in: ids } }, include: { user: true } });
    const result = people.map(p => ({
      deliveryPersonId: p.id,
      fullName: p.fullName,
      phoneNumber: p.phoneNumber,
      trips: counts[p.id] || 0
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

export default router;
