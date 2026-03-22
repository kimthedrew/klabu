import express from 'express';
import Joi from 'joi';
import { prisma } from '../prismaClient';

const router = express.Router();

// Validation schemas
const createReviewSchema = Joi.object({
  rating: Joi.number().min(1).max(5).required(),
  comment: Joi.string().min(10).max(500).required(),
  reviewerName: Joi.string().max(100).optional().allow(''),
  type: Joi.string().valid('stall', 'delivery-person').required(),
  targetId: Joi.string().required()
});

// Get all reviews
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    
    const reviews = await prisma.review.findMany({
      include: {
        stall: {
          select: {
            id: true,
            name: true
          }
        },
        delivery: {
          include: {
            deliveryPerson: {
              select: {
                id: true,
                fullName: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit)
    });

    // Transform the data to match frontend expectations
    const transformedReviews = reviews.map(review => ({
      id: review.id,
      rating: review.rating,
      comment: review.comment,
      reviewerName: review.reviewerName || 'Anonymous',
      createdAt: review.createdAt,
      stall: review.stall,
      deliveryPerson: review.delivery?.deliveryPerson
    }));

    const total = await prisma.review.count();

    res.json({
      reviews: transformedReviews,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });

  } catch (error) {
    console.error('Get reviews error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get stalls with review stats
router.get('/stalls', async (req, res) => {
  try {
    const stalls = await prisma.stall.findMany({
      where: { isActive: true },
      select: { id: true, name: true, averageRating: true, reviewCount: true }
    });

    const stallsWithStats = stalls.map(stall => ({
      id: stall.id,
      name: stall.name,
      averageRating: stall.averageRating,
      totalReviews: stall.reviewCount
    }));

    res.json({ stalls: stallsWithStats });

  } catch (error) {
    console.error('Get stalls with reviews error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get delivery persons with review stats
router.get('/delivery-persons', async (req, res) => {
  try {
    const deliveryPersons = await prisma.deliveryPerson.findMany({
      where: {
        isApproved: true
      },
      include: {
        deliveries: {
          include: {
            reviews: true
          }
        }
      }
    });

    const deliveryPersonsWithStats = deliveryPersons.map(person => {
      // Get all reviews for this delivery person
      const allReviews = person.deliveries.flatMap(delivery => delivery.reviews);
      const averageRating = allReviews.length > 0 
        ? allReviews.reduce((sum, review) => sum + review.rating, 0) / allReviews.length 
        : 0;

      return {
        id: person.id,
        fullName: person.fullName,
        averageRating: Math.round(averageRating * 10) / 10,
        totalReviews: allReviews.length
      };
    });

    res.json({ deliveryPersons: deliveryPersonsWithStats });

  } catch (error) {
    console.error('Get delivery persons with reviews error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create a new review
router.post('/', async (req, res) => {
  try {
    const { error, value } = createReviewSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { rating, comment, reviewerName, type, targetId } = value;

    let reviewData: any = {
      rating,
      comment,
      reviewerName: reviewerName || 'Anonymous',
      createdAt: new Date()
    };

    if (type === 'stall') {
      // Verify stall exists
      const stall = await prisma.stall.findUnique({
        where: { id: targetId }
      });

      if (!stall) {
        return res.status(404).json({ error: 'Stall not found' });
      }

      reviewData.stallId = targetId;
    } else if (type === 'delivery-person') {
      // Verify delivery person exists
      const deliveryPerson = await prisma.deliveryPerson.findUnique({
        where: { id: targetId }
      });

      if (!deliveryPerson) {
        return res.status(404).json({ error: 'Delivery person not found' });
      }

      // For delivery person reviews, we need to find a delivery record
      // Since we don't have a specific order context, we'll create a general review
      // In a real scenario, you might want to require an orderId
      const delivery = await prisma.delivery.findFirst({
        where: {
          deliveryPersonId: targetId,
          status: 'DELIVERED'
        },
        orderBy: { completedAt: 'desc' }
      });

      if (!delivery) {
        return res.status(400).json({ error: 'No completed deliveries found for this delivery person' });
      }

      reviewData.deliveryId = delivery.id;
    }

    const review = await prisma.review.create({
      data: reviewData,
      include: {
        stall: {
          select: {
            id: true,
            name: true
          }
        },
        delivery: {
          include: {
            deliveryPerson: {
              select: {
                id: true,
                fullName: true
              }
            }
          }
        }
      }
    });

    // Update cached rating stats on the stall
    if (type === 'stall') {
      const agg = await prisma.review.aggregate({
        where: { stallId: targetId },
        _avg: { rating: true },
        _count: { id: true }
      });
      await prisma.stall.update({
        where: { id: targetId },
        data: {
          averageRating: Math.round((agg._avg.rating ?? 0) * 10) / 10,
          reviewCount: agg._count.id
        }
      });
    }

    res.status(201).json({
      message: 'Review created successfully',
      review: {
        id: review.id,
        rating: review.rating,
        comment: review.comment,
        reviewerName: review.reviewerName,
        createdAt: review.createdAt,
        stall: review.stall,
        deliveryPerson: review.delivery?.deliveryPerson
      }
    });

  } catch (error) {
    console.error('Create review error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get reviews for a specific stall
router.get('/stall/:stallId', async (req, res) => {
  try {
    const { stallId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const reviews = await prisma.review.findMany({
      where: { stallId },
      orderBy: { createdAt: 'desc' },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit)
    });

    const total = await prisma.review.count({
      where: { stallId }
    });

    res.json({
      reviews,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });

  } catch (error) {
    console.error('Get stall reviews error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get reviews for a specific delivery person
router.get('/delivery-person/:deliveryPersonId', async (req, res) => {
  try {
    const { deliveryPersonId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const reviews = await prisma.review.findMany({
      where: {
        delivery: {
          deliveryPersonId
        }
      },
      include: {
        delivery: {
          include: {
            deliveryPerson: {
              select: {
                id: true,
                fullName: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit)
    });

    const total = await prisma.review.count({
      where: {
        delivery: {
          deliveryPersonId
        }
      }
    });

    const transformedReviews = reviews.map(review => ({
      id: review.id,
      rating: review.rating,
      comment: review.comment,
      reviewerName: review.reviewerName,
      createdAt: review.createdAt,
      deliveryPerson: review.delivery?.deliveryPerson
    }));

    res.json({
      reviews: transformedReviews,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });

  } catch (error) {
    console.error('Get delivery person reviews error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;






















