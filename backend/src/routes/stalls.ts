import express from 'express';
import Joi from 'joi';
import { prisma } from '../prismaClient';
import { authenticateToken, requireRole, AuthRequest } from '../utils/auth';

const router = express.Router();

// Validation schemas
const createStallSchema = Joi.object({
  name: Joi.string().min(2).required(),
  description: Joi.string().optional()
});

const updateStallSchema = Joi.object({
  name: Joi.string().min(2).optional(),
  description: Joi.string().optional(),
  isActive: Joi.boolean().optional()
});

const menuItemSchema = Joi.object({
  name: Joi.string().min(2).required(),
  description: Joi.string().optional().allow(''),
  price: Joi.number().positive().required(),
  image: Joi.string().uri().optional(),
  isAvailable: Joi.boolean().optional()
});

// Get all active stalls (public)
router.get('/', async (req, res) => {
  try {
    const { search, food } = req.query;
    
    let whereClause: any = {
      isActive: true,
      isApproved: true,
      stall: {
        isActive: true
      }
    };

    // Search by stall name or food item
    if (search || food) {
      whereClause.OR = [];
      
      if (search) {
        whereClause.OR.push({
          stall: {
            name: {
              contains: search as string,
              mode: 'insensitive'
            }
          }
        });
      }
      
      if (food) {
        whereClause.OR.push({
          menuItems: {
            some: {
              name: {
                contains: food as string,
                mode: 'insensitive'
              },
              isAvailable: true
            }
          }
        });
      }
    }

    const stalls = await prisma.stallOwner.findMany({
      where: whereClause,
      include: {
        stall: {
          include: {
            menuItems: {
              where: { isAvailable: true },
              orderBy: { name: 'asc' }
            },
            reviews: {
              include: {
                order: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Calculate average ratings
    const stallsWithRatings = stalls.map(stall => {
      const reviews = stall.stall?.reviews || [];
      const averageRating = reviews.length > 0 
        ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length 
        : 0;

      return {
        ...stall,
        stall: stall.stall ? {
          ...stall.stall,
          averageRating: Math.round(averageRating * 10) / 10,
          totalReviews: reviews.length
        } : null
      };
    });

    res.json({ stalls: stallsWithRatings });

  } catch (error) {
    console.error('Get stalls error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single stall details (public)
router.get('/:stallId', async (req, res) => {
  try {
    const { stallId } = req.params;

    const stall = await prisma.stall.findUnique({
      where: { id: stallId },
      include: {
        stallOwner: true,
        menuItems: {
          where: { isAvailable: true },
          orderBy: { name: 'asc' }
        },
        reviews: {
          include: {
            order: true
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!stall || !stall.isActive) {
      return res.status(404).json({ error: 'Stall not found' });
    }

    // Calculate average rating
    const reviews = stall.reviews;
    const averageRating = reviews.length > 0 
      ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length 
      : 0;

    res.json({
      ...stall,
      averageRating: Math.round(averageRating * 10) / 10,
      totalReviews: reviews.length
    });

  } catch (error) {
    console.error('Get stall error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create stall (stall owner only)
router.post('/', authenticateToken, requireRole(['STALL_OWNER']), async (req: AuthRequest, res) => {
  try {
    const { error, value } = createStallSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    // Find the stall owner record for this user
    const stallOwner = await prisma.stallOwner.findUnique({
      where: { userId: req.user!.id }
    });

    if (!stallOwner) {
      return res.status(404).json({ error: 'Stall owner profile not found' });
    }

    // Check if stall owner is approved
    if (!stallOwner.isApproved) {
      return res.status(403).json({ error: 'Your account is pending admin approval. You cannot create a stall until approved.' });
    }

    // Check if stall owner already has a stall
    const existingStall = await prisma.stall.findUnique({
      where: { stallOwnerId: stallOwner.id }
    });

    if (existingStall) {
      return res.status(400).json({ error: 'You already have a stall' });
    }

    const stall = await prisma.stall.create({
      data: {
        stallOwnerId: stallOwner.id,
        ...value
      },
      include: {
        stallOwner: true,
        menuItems: true
      }
    });

    res.status(201).json({ message: 'Stall created successfully', stall });

  } catch (error) {
    console.error('Create stall error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update stall (stall owner only)
router.put('/:stallId', authenticateToken, requireRole(['STALL_OWNER']), async (req: AuthRequest, res) => {
  try {
    const { stallId } = req.params;
    const { error, value } = updateStallSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    // Find the stall owner record for this user
    const stallOwner = await prisma.stallOwner.findUnique({
      where: { userId: req.user!.id }
    });

    if (!stallOwner) {
      return res.status(404).json({ error: 'Stall owner profile not found' });
    }

    // Check if stall belongs to the user
    const stall = await prisma.stall.findFirst({
      where: {
        id: stallId,
        stallOwnerId: stallOwner.id
      }
    });

    if (!stall) {
      return res.status(404).json({ error: 'Stall not found or access denied' });
    }

    const updatedStall = await prisma.stall.update({
      where: { id: stallId },
      data: value,
      include: {
        stallOwner: true,
        menuItems: true
      }
    });

    res.json({ message: 'Stall updated successfully', stall: updatedStall });

  } catch (error) {
    console.error('Update stall error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add menu item (stall owner only)
router.post('/:stallId/menu', authenticateToken, requireRole(['STALL_OWNER']), async (req: AuthRequest, res) => {
  try {
    const { stallId } = req.params;
    const { error, value } = menuItemSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    // Find the stall owner record for this user
    const stallOwner = await prisma.stallOwner.findUnique({
      where: { userId: req.user!.id }
    });

    if (!stallOwner) {
      return res.status(404).json({ error: 'Stall owner profile not found' });
    }

    // Check if stall belongs to the user
    const stall = await prisma.stall.findFirst({
      where: {
        id: stallId,
        stallOwnerId: stallOwner.id
      }
    });

    if (!stall) {
      return res.status(404).json({ error: 'Stall not found or access denied' });
    }

    const menuItem = await prisma.menuItem.create({
      data: {
        stallId,
        ...value
      }
    });

    res.status(201).json({ message: 'Menu item added successfully', menuItem });

  } catch (error) {
    console.error('Add menu item error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update menu item (stall owner only)
router.put('/:stallId/menu/:itemId', authenticateToken, requireRole(['STALL_OWNER']), async (req: AuthRequest, res) => {
  try {
    const { stallId, itemId } = req.params;
    const { error, value } = menuItemSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    // Find the stall owner record for this user
    const stallOwner = await prisma.stallOwner.findUnique({
      where: { userId: req.user!.id }
    });

    if (!stallOwner) {
      return res.status(404).json({ error: 'Stall owner profile not found' });
    }

    // Check if menu item belongs to the user's stall
    const menuItem = await prisma.menuItem.findFirst({
      where: {
        id: itemId,
        stall: {
          id: stallId,
          stallOwnerId: stallOwner.id
        }
      }
    });

    if (!menuItem) {
      return res.status(404).json({ error: 'Menu item not found or access denied' });
    }

    const updatedMenuItem = await prisma.menuItem.update({
      where: { id: itemId },
      data: value
    });

    res.json({ message: 'Menu item updated successfully', menuItem: updatedMenuItem });

  } catch (error) {
    console.error('Update menu item error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete menu item (stall owner only)
router.delete('/:stallId/menu/:itemId', authenticateToken, requireRole(['STALL_OWNER']), async (req: AuthRequest, res) => {
  try {
    const { stallId, itemId } = req.params;

    // Find the stall owner record for this user
    const stallOwner = await prisma.stallOwner.findUnique({
      where: { userId: req.user!.id }
    });

    if (!stallOwner) {
      return res.status(404).json({ error: 'Stall owner profile not found' });
    }

    // Check if menu item belongs to the user's stall
    const menuItem = await prisma.menuItem.findFirst({
      where: {
        id: itemId,
        stall: {
          id: stallId,
          stallOwnerId: stallOwner.id
        }
      }
    });

    if (!menuItem) {
      return res.status(404).json({ error: 'Menu item not found or access denied' });
    }

    await prisma.menuItem.delete({
      where: { id: itemId }
    });

    res.json({ message: 'Menu item deleted successfully' });

  } catch (error) {
    console.error('Delete menu item error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
