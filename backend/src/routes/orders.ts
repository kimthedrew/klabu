import express from 'express';
import Joi from 'joi';
import { prisma } from '../prismaClient';
import { authenticateToken, requireRole, AuthRequest } from '../utils/auth';
import { io } from '../index';
import { DeliveryAssignmentService } from '../services/deliveryAssignmentService';
import { getCache, setCache, invalidateCache } from '../utils/cache';
import { createNotification, notifyAdmins } from '../utils/notify';

const router = express.Router();

// Validation schemas
const createOrderSchema = Joi.object({
  stallId: Joi.string().required(),
  customerName: Joi.string().min(2).required(),
  customerPhone: Joi.string().pattern(/^[0-9+\-\s()]+$/).required(),
  deliveryLocation: Joi.string().min(3).required(),
  roomNumber: Joi.string().optional(),
  deliveryTier: Joi.string().valid('FAST', 'SLOW').default('FAST'),
  paymentMethod: Joi.string().valid('MANUAL', 'STK_PUSH').default('MANUAL'),
  mpesaPayerName: Joi.string()
    .allow('')
    .when('paymentMethod', {
      is: 'MANUAL',
      then: Joi.string().min(2).required(),
      otherwise: Joi.string().allow('').optional()
    }),
  items: Joi.array().items(
    Joi.object({
      menuItemId: Joi.string().required(),
      quantity: Joi.number().integer().min(1).required()
    })
  ).min(1).required()
});

const confirmPaymentSchema = Joi.object({
  mpesaPayerName: Joi.string().min(2).required()
});

// Get current delivery fee config (public - shown on checkout before order is placed)
router.get('/delivery-config', async (req, res) => {
  try {
    const cached = getCache<{ fastDeliveryFee: number; slowDeliveryFee: number; deliveryFee: number; deliveryFeeNote: string | null }>('config:delivery');
    if (cached) return res.json(cached);

    const config = await prisma.paymentConfig.findUnique({ where: { id: 'singleton' } })
      ?? await prisma.paymentConfig.create({ data: { id: 'singleton', stkPushEnabled: false, deliveryFee: 50, fastDeliveryFee: 50, slowDeliveryFee: 30, commissionRate: 0.33 } });

    const response = {
      fastDeliveryFee: config.fastDeliveryFee,
      slowDeliveryFee: config.slowDeliveryFee,
      deliveryFeeNote: config.deliveryFeeNote ?? null,
      deliveryFee: config.fastDeliveryFee // legacy alias
    };
    setCache('config:delivery', response, 60); // 1-minute cache so fee changes propagate quickly
    return res.json(response);
  } catch (error) {
    console.error('Get delivery config error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create order (public - no authentication required)
router.post('/', async (req, res) => {
  try {
    const { error, value } = createOrderSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { stallId, customerName, customerPhone, deliveryLocation, roomNumber, mpesaPayerName, paymentMethod, items, deliveryTier } = value;

    // If STK Push was requested, check that admin has enabled it
    if (paymentMethod === 'STK_PUSH') {
      const cached = getCache<{ config: { stkPushEnabled: boolean } }>('config:payment');
      const stkEnabled = cached
        ? cached.config.stkPushEnabled
        : (await prisma.paymentConfig.findUnique({ where: { id: 'singleton' } }))?.stkPushEnabled;
      if (!stkEnabled) {
        return res.status(400).json({ error: 'STK Push payments are currently unavailable. Please pay manually.' });
      }
    }

    // Verify stall exists and is active
    const stall = await prisma.stall.findUnique({
      where: { id: stallId },
      include: {
        menuItems: true,
        stallOwner: true
      }
    });

    if (!stall || !stall.isActive) {
      return res.status(404).json({ error: 'Stall not found or inactive' });
    }

    // Validate menu items and calculate total
    let totalAmount = 0;
    const orderItems = [];

    for (const item of items) {
      const menuItem = stall.menuItems.find(mi => mi.id === item.menuItemId);
      
      if (!menuItem) {
        return res.status(400).json({ error: `Menu item ${item.menuItemId} not found` });
      }

      if (!menuItem.isAvailable) {
        return res.status(400).json({ error: `Menu item ${menuItem.name} is not available` });
      }

      const itemTotal = menuItem.price * item.quantity;
      totalAmount += itemTotal;

      orderItems.push({
        menuItemId: item.menuItemId,
        quantity: item.quantity,
        price: menuItem.price
      });
    }

    // Fetch delivery fees and commission from config (admin-controlled)
    const deliveryConfigCached = getCache<{ fastDeliveryFee: number; slowDeliveryFee: number }>('config:delivery');
    const paymentConfig = deliveryConfigCached
      ? null
      : await prisma.paymentConfig.findUnique({ where: { id: 'singleton' } });
    const fastDeliveryFee = deliveryConfigCached?.fastDeliveryFee ?? paymentConfig?.fastDeliveryFee ?? 50;
    const slowDeliveryFee = deliveryConfigCached?.slowDeliveryFee ?? paymentConfig?.slowDeliveryFee ?? 30;
    const commissionRate = paymentConfig?.commissionRate ?? 0.33;
    const deliveryFee = deliveryTier === 'SLOW' ? slowDeliveryFee : fastDeliveryFee;
    const platformCut = Math.round(deliveryFee * commissionRate * 100) / 100;
    const deliveryPersonEarnings = Math.round((deliveryFee - platformCut) * 100) / 100;
    const finalTotal = totalAmount + deliveryFee;

    // Create order
    const order = await prisma.order.create({
      data: {
        stallId,
        customerName,
        customerPhone,
        deliveryLocation,
        roomNumber,
        totalAmount,
        deliveryFee,
        deliveryTier,
        platformCut,
        deliveryPersonEarnings,
        mpesaPayerName,
        paymentStatus: 'PENDING',
        status: 'PENDING',
        items: {
          create: orderItems
        }
      },
      include: {
        stall: {
          include: {
            stallOwner: true
          }
        },
        items: {
          include: {
            menuItem: true
          }
        }
      }
    });

    // Payment will be confirmed by stall owner after verification

    // Notify stall owner via socket + persistent notification
    io.to(`stall-${stallId}`).emit('new-order', {
      orderId: order.id,
      customerName,
      totalAmount: finalTotal,
      items: order.items,
      paymentStatus: order.paymentStatus
    });

    const stallOwnerUserId = order.stall.stallOwner.userId;
    createNotification({
      userId: stallOwnerUserId,
      type: 'ORDER_PLACED',
      title: 'New Order Received',
      message: `${customerName} placed an order worth KES ${finalTotal}`,
      data: { orderId: order.id, totalAmount: finalTotal }
    }).catch(() => {});

    notifyAdmins({
      type: 'ORDER_PLACED',
      title: 'New Order',
      message: `New order from ${customerName} at ${order.stall.name} — KES ${finalTotal}`,
      data: { orderId: order.id, stallId }
    }).catch(() => {});

    res.status(201).json({
      message: 'Order created successfully',
      order: {
        id: order.id,
        totalAmount: finalTotal,
        deliveryFee,
        status: order.status,
        paymentMethod,
        createdAt: order.createdAt
      }
    });

  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get order details (public)
router.get('/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        stall: {
          include: {
            stallOwner: true
          }
        },
        items: {
          include: {
            menuItem: true
          }
        },
        deliveryPerson: true
      }
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json({ order });

  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Confirm payment (stall owner only)
router.post('/:orderId/confirm-payment', authenticateToken, requireRole(['STALL_OWNER']), async (req: AuthRequest, res) => {
  try {
    const { orderId } = req.params;
    const { error, value } = confirmPaymentSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { mpesaPayerName } = value;

    // First find the stall owner record for this user
    const stallOwner = await prisma.stallOwner.findUnique({
      where: { userId: req.user!.id }
    });

    if (!stallOwner) {
      return res.status(404).json({ error: 'Stall owner profile not found' });
    }

    // Check if order belongs to the user's stall
    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        stall: {
          stallOwnerId: stallOwner.id
        }
      },
      include: {
        stall: true
      }
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found or access denied' });
    }

    if (order.paymentStatus !== 'PENDING') {
      return res.status(400).json({ error: 'Payment already confirmed or failed' });
    }

    // Update order status and payment
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        mpesaPayerName,
        paymentStatus: 'CONFIRMED',
        status: 'CONFIRMED'
      },
      include: {
        items: {
          include: {
            menuItem: true
          }
        }
      }
    });

    // Create payment record
    await prisma.payment.create({
      data: {
        orderId,
        amount: order.totalAmount + order.deliveryFee,
        mpesaCode: mpesaPayerName,
        status: 'CONFIRMED',
        confirmedAt: new Date()
      }
    });

    // Create ledger entry: manual payment to stall's till => THEY_OWE delivery fee to platform
    try {
      await prisma.ledgerEntry.create({
        data: {
          entityType: 'STALL_OWNER',
          entityId: order.stall.stallOwnerId,
          sourceType: 'ORDER',
          sourceId: orderId,
          direction: 'THEY_OWE',
          amount: order.deliveryFee,
          notes: 'Manual payment to stall; delivery fee owed to platform'
        }
      });
    } catch (e) {
      console.error('Failed to create ledger entry for manual payment:', e);
    }

    // Notify that order is ready for delivery assignment
    io.emit('payment-confirmed', {
      orderId,
      stallId: order.stallId,
      customerName: order.customerName,
      totalAmount: order.totalAmount + order.deliveryFee
    });

    res.json({
      message: 'Payment confirmed successfully',
      order: updatedOrder
    });

  } catch (error) {
    console.error('Confirm payment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get stall orders (stall owner only)
router.get('/stall/my-orders', authenticateToken, requireRole(['STALL_OWNER']), async (req: AuthRequest, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    
    // First find the stall owner record for this user
    const stallOwner = await prisma.stallOwner.findUnique({
      where: { userId: req.user!.id }
    });

    if (!stallOwner) {
      return res.status(404).json({ error: 'Stall owner profile not found' });
    }
    
    const whereClause: any = {
      stall: {
        stallOwnerId: stallOwner.id
      }
    };

    if (status) {
      whereClause.status = status;
    }

    const orders = await prisma.order.findMany({
      where: whereClause,
      include: {
        items: {
          include: {
            menuItem: true
          }
        },
        deliveryPerson: true
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
    console.error('Get stall orders error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update order status (stall owner only)
router.patch('/:orderId/status', authenticateToken, requireRole(['STALL_OWNER']), async (req: AuthRequest, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;

    if (!['CONFIRMED', 'PREPARING', 'READY_FOR_DELIVERY'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    // First find the stall owner record for this user
    const stallOwner = await prisma.stallOwner.findUnique({
      where: { userId: req.user!.id }
    });

    if (!stallOwner) {
      return res.status(404).json({ error: 'Stall owner profile not found' });
    }

    // Check if order belongs to the user's stall
    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        stall: {
          stallOwnerId: stallOwner.id
        }
      }
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found or access denied' });
    }

    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: { status },
      include: {
        items: {
          include: {
            menuItem: true
          }
        },
        deliveryPerson: true
      }
    });

    // Start delivery assignment process if status is READY_FOR_DELIVERY
    if (status === 'READY_FOR_DELIVERY') {
      try {
        await DeliveryAssignmentService.startAssignmentProcess(orderId);
      } catch (error) {
        console.error('Error starting delivery assignment:', error);
        // Don't fail the request, just log the error
      }
    }

    // Notify assigned delivery person of status change
    if (updatedOrder.deliveryPersonId) {
      const dpUser = await prisma.deliveryPerson.findUnique({
        where: { id: updatedOrder.deliveryPersonId },
        select: { userId: true }
      });
      if (dpUser) {
        createNotification({
          userId: dpUser.userId,
          type: 'ORDER_STATUS_UPDATED',
          title: 'Order Status Updated',
          message: `Order status changed to ${status}`,
          data: { orderId, status }
        }).catch(() => {});
      }
    }

    res.json({
      message: 'Order status updated successfully',
      order: updatedOrder
    });

  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Stall owner rejects assigned delivery person
router.post('/:orderId/reject-delivery', authenticateToken, requireRole(['STALL_OWNER']), async (req: AuthRequest, res) => {
  try {
    const { orderId } = req.params;
    const { reason } = req.body;

    if (!reason || !reason.trim()) {
      return res.status(400).json({ error: 'Reason is required' });
    }

    // First find the stall owner record for this user
    const stallOwner = await prisma.stallOwner.findUnique({
      where: { userId: req.user!.id }
    });

    if (!stallOwner) {
      return res.status(404).json({ error: 'Stall owner profile not found' });
    }

    await DeliveryAssignmentService.stallOwnerRejectDelivery(orderId, stallOwner.id, reason);

    res.json({
      message: 'Delivery person rejected successfully. Finding another delivery person...'
    });

  } catch (error: any) {
    console.error('Reject delivery error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Stall owner confirms delivery pickup
router.post('/:orderId/confirm-pickup', authenticateToken, requireRole(['STALL_OWNER']), async (req: AuthRequest, res) => {
  try {
    const { orderId } = req.params;

    // First find the stall owner record for this user
    const stallOwner = await prisma.stallOwner.findUnique({
      where: { userId: req.user!.id }
    });

    if (!stallOwner) {
      return res.status(404).json({ error: 'Stall owner profile not found' });
    }

    await DeliveryAssignmentService.confirmDeliveryPickup(orderId, stallOwner.id);

    res.json({
      message: 'Delivery pickup confirmed successfully'
    });

  } catch (error: any) {
    console.error('Confirm pickup error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

export default router;
