import express from 'express';
import Joi from 'joi';
import { prisma } from '../prismaClient';
import { authenticateToken, requireRole, AuthRequest } from '../utils/auth';
import { io } from '../index';
import { DeliveryAssignmentService } from '../services/deliveryAssignmentService';

const router = express.Router();

// Validation schemas
const updateDeliveryStatusSchema = Joi.object({
  isActive: Joi.boolean().required()
});

const acceptDeliverySchema = Joi.object({
  orderId: Joi.string().required()
});

const acceptAssignmentSchema = Joi.object({
  assignmentId: Joi.string().required()
});

const rejectAssignmentSchema = Joi.object({
  assignmentId: Joi.string().required(),
  reason: Joi.string().required()
});

// Toggle delivery person active status
router.patch('/toggle-status', authenticateToken, requireRole(['DELIVERY_PERSON']), async (req: AuthRequest, res) => {
  try {
    const { error, value } = updateDeliveryStatusSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { isActive } = value;

    const deliveryPerson = await prisma.deliveryPerson.findUnique({
      where: { userId: req.user!.id }
    });

    if (!deliveryPerson) {
      return res.status(404).json({ error: 'Delivery person profile not found' });
    }

    if (!deliveryPerson.isApproved) {
      return res.status(403).json({ error: 'Your account is pending admin approval. You cannot change your status until approved.' });
    }

    const updatedDeliveryPerson = await prisma.deliveryPerson.update({
      where: { id: deliveryPerson.id },
      data: { isActive },
      include: {
        user: true
      }
    });

    res.json({
      message: `Delivery status ${isActive ? 'activated' : 'deactivated'} successfully`,
      deliveryPerson: updatedDeliveryPerson
    });

  } catch (error) {
    console.error('Toggle delivery status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get available delivery persons
router.get('/available', async (req, res) => {
  try {
    const deliveryPersons = await prisma.deliveryPerson.findMany({
      where: {
        isActive: true
      },
      include: {
        user: true
      },
      orderBy: {
        rating: 'desc'
      }
    });

    res.json({ deliveryPersons });

  } catch (error) {
    console.error('Get available delivery persons error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Accept delivery request
router.post('/accept', authenticateToken, requireRole(['DELIVERY_PERSON']), async (req: AuthRequest, res) => {
  try {
    const { error, value } = acceptDeliverySchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { orderId } = value;

    // Check if delivery person is active
    const deliveryPerson = await prisma.deliveryPerson.findUnique({
      where: { userId: req.user!.id }
    });

    if (!deliveryPerson) {
      return res.status(404).json({ error: 'Delivery person profile not found' });
    }

    if (!deliveryPerson.isApproved) {
      return res.status(403).json({ error: 'Your account is pending admin approval. You cannot accept deliveries until approved.' });
    }

    if (!deliveryPerson.isActive) {
      return res.status(400).json({ error: 'You must be active to accept deliveries' });
    }

    // Check if order exists and is ready for delivery
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        stall: {
          include: {
            stallOwner: true
          }
        }
      }
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (order.status !== 'READY_FOR_DELIVERY') {
      return res.status(400).json({ error: 'Order is not ready for delivery' });
    }

    if (order.deliveryPersonId) {
      return res.status(400).json({ error: 'Order already has a delivery person assigned' });
    }

    // Assign delivery person to order
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        deliveryPersonId: deliveryPerson.id,
        deliveryStatus: 'ASSIGNED',
        deliveryAcceptedAt: new Date()
      },
      include: {
        items: {
          include: {
            menuItem: true
          }
        },
        deliveryPerson: true
      }
    });

    // Create delivery record
    await prisma.delivery.create({
      data: {
        orderId,
        deliveryPersonId: deliveryPerson.id,
        status: 'ASSIGNED',
        acceptedAt: new Date()
      }
    });

    // Notify stall owner
    io.to(`stall-${order.stallId}`).emit('delivery-accepted', {
      orderId,
      deliveryPerson: {
        id: deliveryPerson.id,
        fullName: deliveryPerson.fullName,
        phoneNumber: deliveryPerson.phoneNumber
      }
    });

    res.json({
      message: 'Delivery accepted successfully',
      order: updatedOrder
    });

  } catch (error) {
    console.error('Accept delivery error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update delivery status
router.patch('/:orderId/status', authenticateToken, requireRole(['DELIVERY_PERSON']), async (req: AuthRequest, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;

    if (!['PICKED_UP', 'DELIVERED'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    // Check if delivery person is assigned to this order
    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        deliveryPerson: {
          userId: req.user!.id
        }
      }
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found or access denied' });
    }

    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        deliveryStatus: status,
        ...(status === 'DELIVERED' && { deliveryCompletedAt: new Date() })
      },
      include: {
        items: {
          include: {
            menuItem: true
          }
        },
        deliveryPerson: true
      }
    });

    // Update delivery record
    await prisma.delivery.updateMany({
      where: {
        orderId,
        deliveryPerson: {
          userId: req.user!.id
        }
      },
      data: {
        status: status === 'DELIVERED' ? 'DELIVERED' : 'PICKED_UP',
        ...(status === 'DELIVERED' && { completedAt: new Date() })
      }
    });

    // Update delivery person stats
    if (status === 'DELIVERED') {
      await prisma.deliveryPerson.update({
        where: { userId: req.user!.id },
        data: {
          totalDeliveries: {
            increment: 1
          }
        }
      });
    }

    // Notify stall owner
    io.to(`stall-${order.stallId}`).emit('delivery-status-updated', {
      orderId,
      status,
      deliveryPerson: updatedOrder.deliveryPerson
    });

    res.json({
      message: 'Delivery status updated successfully',
      order: updatedOrder
    });

  } catch (error) {
    console.error('Update delivery status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get delivery person's deliveries
router.get('/my-deliveries', authenticateToken, requireRole(['DELIVERY_PERSON']), async (req: AuthRequest, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    
    const whereClause: any = {
      deliveryPerson: {
        userId: req.user!.id
      }
    };

    if (status) {
      whereClause.deliveryStatus = status;
    }

    const orders = await prisma.order.findMany({
      where: whereClause,
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
    console.error('Get delivery person orders error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get delivery person profile
router.get('/profile', authenticateToken, requireRole(['DELIVERY_PERSON']), async (req: AuthRequest, res) => {
  try {
    const deliveryPerson = await prisma.deliveryPerson.findUnique({
      where: { userId: req.user!.id },
      include: {
        user: true,
        deliveries: {
          include: {
            order: true
          },
          orderBy: { assignedAt: 'desc' },
          take: 10
        }
      }
    });

    if (!deliveryPerson) {
      return res.status(404).json({ error: 'Delivery person profile not found' });
    }

    res.json({ deliveryPerson });

  } catch (error) {
    console.error('Get delivery person profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Accept delivery assignment (new system)
router.post('/accept-assignment', authenticateToken, requireRole(['DELIVERY_PERSON']), async (req: AuthRequest, res) => {
  try {
    const { error, value } = acceptAssignmentSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { assignmentId } = value;

    // Get delivery person
    const deliveryPerson = await prisma.deliveryPerson.findUnique({
      where: { userId: req.user!.id }
    });

    if (!deliveryPerson) {
      return res.status(404).json({ error: 'Delivery person profile not found' });
    }

    if (!deliveryPerson.isApproved || !deliveryPerson.isActive) {
      return res.status(403).json({ error: 'Your account is not approved or active' });
    }

    await DeliveryAssignmentService.acceptAssignment(assignmentId, deliveryPerson.id);

    res.json({
      message: 'Delivery assignment accepted successfully'
    });

  } catch (error: any) {
    console.error('Accept assignment error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Reject delivery assignment
router.post('/reject-assignment', authenticateToken, requireRole(['DELIVERY_PERSON']), async (req: AuthRequest, res) => {
  try {
    const { error, value } = rejectAssignmentSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { assignmentId, reason } = value;

    // Get delivery person
    const deliveryPerson = await prisma.deliveryPerson.findUnique({
      where: { userId: req.user!.id }
    });

    if (!deliveryPerson) {
      return res.status(404).json({ error: 'Delivery person profile not found' });
    }

    await DeliveryAssignmentService.rejectAssignment(assignmentId, deliveryPerson.id, reason);

    res.json({
      message: 'Delivery assignment rejected successfully'
    });

  } catch (error: any) {
    console.error('Reject assignment error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Get pending assignments for delivery person
router.get('/pending-assignments', authenticateToken, requireRole(['DELIVERY_PERSON']), async (req: AuthRequest, res) => {
  try {
    const deliveryPerson = await prisma.deliveryPerson.findUnique({
      where: { userId: req.user!.id }
    });

    if (!deliveryPerson) {
      return res.status(404).json({ error: 'Delivery person profile not found' });
    }

    const assignments = await prisma.deliveryAssignment.findMany({
      where: {
        deliveryPersonId: deliveryPerson.id,
        status: 'PENDING',
        expiresAt: { gt: new Date() }
      },
      include: {
        order: {
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
        }
      },
      orderBy: {
        assignedAt: 'asc'
      }
    });

    res.json({ assignments });

  } catch (error) {
    console.error('Get pending assignments error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
