import express from 'express';
import Joi from 'joi';
import { prisma } from '../prismaClient';
import { hashPassword, comparePassword, generateToken, authenticateToken } from '../utils/auth';

const router = express.Router();

// Validation schemas
const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  role: Joi.string().valid('STALL_OWNER', 'DELIVERY_PERSON').required(),
  fullName: Joi.string().min(2).required(),
  phoneNumber: Joi.string().pattern(/^[0-9+\-\s()]+$/).required(),
  businessName: Joi.string().optional(),
  idNumber: Joi.string().when('role', {
    is: 'DELIVERY_PERSON',
    then: Joi.required(),
    otherwise: Joi.optional()
  }),
  // Payment fields for stall owners
  paymentMode: Joi.string().valid('MPESA').when('role', {
    is: 'STALL_OWNER',
    then: Joi.required(),
    otherwise: Joi.optional()
  }),
  mpesaNumber: Joi.string().when('paymentMode', {
    is: 'MPESA',
    then: Joi.required(),
    otherwise: Joi.optional()
  }),
  tillNumber: Joi.string().optional()
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

// Register new user (stall owner or delivery person)
router.post('/register', async (req, res) => {
  try {
    const { error, value } = registerSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { email, password, role, fullName, phoneNumber, businessName, idNumber, paymentMode, mpesaNumber, tillNumber } = value;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    // Check if delivery person with this ID already exists
    if (role === 'DELIVERY_PERSON' && idNumber) {
      const existingDeliveryPerson = await prisma.deliveryPerson.findUnique({
        where: { idNumber }
      });

      if (existingDeliveryPerson) {
        return res.status(400).json({ error: 'Delivery person with this ID number already exists' });
      }
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user and related profile
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        role,
        ...(role === 'STALL_OWNER' ? {
          stallOwner: {
            create: {
              fullName,
              businessName,
              phoneNumber,
              paymentMode,
              mpesaNumber,
              tillNumber
            }
          }
        } : {
          deliveryPerson: {
            create: {
              fullName,
              phoneNumber,
              idNumber: idNumber!
            }
          }
        })
      },
      include: {
        stallOwner: role === 'STALL_OWNER',
        deliveryPerson: role === 'DELIVERY_PERSON'
      }
    });

    // Generate token
    const token = generateToken(user.id, user.email, user.role);

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        profile: role === 'STALL_OWNER' ? user.stallOwner : user.deliveryPerson
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Login user
router.post('/login', async (req, res) => {
  try {
    const { error, value } = loginSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { email, password } = value;

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        stallOwner: true,
        deliveryPerson: true
      }
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check password
    const isValidPassword = await comparePassword(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate token
    const token = generateToken(user.id, user.email, user.role);

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        profile: user.role === 'STALL_OWNER' ? user.stallOwner : user.deliveryPerson
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get current user profile
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: {
        stallOwner: {
          include: {
            stall: {
              include: {
                menuItems: true
              }
            }
          }
        },
        deliveryPerson: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        profile: user.role === 'STALL_OWNER' ? user.stallOwner : user.deliveryPerson
      }
    });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
