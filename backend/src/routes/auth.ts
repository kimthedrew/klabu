import express from 'express';
import Joi from 'joi';
import crypto from 'crypto';
import rateLimit from 'express-rate-limit';
import { prisma } from '../prismaClient';
import { hashPassword, comparePassword, generateToken, authenticateToken, AuthRequest } from '../utils/auth';
import { sendPasswordResetEmail } from '../utils/email';
import { createNotification, notifyAdmins } from '../utils/notify';
import { TERMS_VERSIONS, TermsRole } from '../utils/terms';

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: { error: 'Too many login attempts. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: { error: 'Too many registration attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  message: { error: 'Too many password reset requests. Please try again in an hour.' },
  standardHeaders: true,
  legacyHeaders: false,
});

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
  tillNumber: Joi.string().optional(),
  // Terms acceptance
  termsAccepted: Joi.boolean().valid(true).required(),
  termsVersion: Joi.string().required()
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

// Register new user (stall owner or delivery person)
router.post('/register', registerLimiter, async (req, res) => {
  try {
    const { error, value } = registerSchema.validate(req.body);
    if (error) {
      res.status(400).json({ error: error.details[0]?.message ?? 'Validation error' });
      return;
    }

    const { email, password, role, fullName, phoneNumber, businessName, idNumber, paymentMode, mpesaNumber, tillNumber, termsAccepted, termsVersion } = value;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      res.status(400).json({ error: 'User with this email already exists' });
      return;
    }

    // Check if delivery person with this ID already exists
    if (role === 'DELIVERY_PERSON' && idNumber) {
      const existingDeliveryPerson = await prisma.deliveryPerson.findUnique({
        where: { idNumber }
      });

      if (existingDeliveryPerson) {
        res.status(400).json({ error: 'Delivery person with this ID number already exists' });
        return;
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

    // Notify admins of new registration
    notifyAdmins({
      type: 'NEW_STALL_REGISTERED',
      title: 'New Registration',
      message: `${email} registered as ${role === 'STALL_OWNER' ? 'a stall owner' : 'a delivery person'}`,
      data: { userId: user.id, email, role }
    }).catch(() => {}); // fire-and-forget

    // Record T&C acceptance
    const currentVersion = TERMS_VERSIONS[role as TermsRole];
    if (currentVersion) {
      await prisma.termsAcceptance.create({
        data: {
          userId: user.id,
          role,
          version: termsVersion,
          ipAddress: req.ip ?? null
        }
      }).catch(() => {}); // non-blocking; registration still succeeds
    }

    // Generate token
    const token = generateToken(user.id, user.email, user.role);

    res.status(201).json({
      message: 'User registered successfully',
      token,
      termsAccepted: true,
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
router.post('/login', loginLimiter, async (req, res) => {
  try {
    const { error, value } = loginSchema.validate(req.body);
    if (error) {
      res.status(400).json({ error: error.details[0]?.message ?? 'Validation error' });
      return;
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
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    // Check password
    const isValidPassword = await comparePassword(password, user.password);
    if (!isValidPassword) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    // Generate token
    const token = generateToken(user.id, user.email, user.role);

    // Check terms acceptance status for this role
    const currentTermsVersion = TERMS_VERSIONS[user.role as TermsRole];
    let termsAccepted = true; // admins don't need T&C
    if (currentTermsVersion) {
      const acceptance = await prisma.termsAcceptance.findUnique({
        where: { userId_role_version: { userId: user.id, role: user.role, version: currentTermsVersion } }
      });
      termsAccepted = !!acceptance;
    }

    res.json({
      message: 'Login successful',
      token,
      termsAccepted,
      termsVersion: currentTermsVersion ?? null,
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
router.get('/me', authenticateToken, async (req: AuthRequest, res) => {
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
      res.status(404).json({ error: 'User not found' });
      return;
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

// Change password (authenticated)
router.post('/change-password', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword || newPassword.length < 6) {
      res.status(400).json({ error: 'currentPassword and newPassword (min 6 chars) are required' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) { res.status(404).json({ error: 'User not found' }); return; }

    const valid = await comparePassword(currentPassword, user.password);
    if (!valid) { res.status(400).json({ error: 'Current password is incorrect' }); return; }

    const hashed = await hashPassword(newPassword);
    await prisma.user.update({ where: { id: user.id }, data: { password: hashed } });

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Forgot password — send reset email
router.post('/forgot-password', forgotPasswordLimiter, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) { res.status(400).json({ error: 'Email is required' }); return; }

    const user = await prisma.user.findUnique({ where: { email } });
    // Always respond success to avoid email enumeration
    if (!user) { res.json({ message: 'If that email exists, a reset link has been sent' }); return; }

    const token = crypto.randomBytes(32).toString('hex');
    const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.user.update({
      where: { id: user.id },
      data: { resetToken: token, resetTokenExpiry: expiry }
    });

    // Admin account has no real inbox — send reset link to the configured recovery email
    const sendTo = user.role === 'ADMIN'
      ? process.env.ADMIN_RECOVERY_EMAIL!
      : email;

    await sendPasswordResetEmail(sendTo, token);
    res.json({ message: 'If that email exists, a reset link has been sent' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Reset password via email token
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword || newPassword.length < 6) {
      res.status(400).json({ error: 'token and newPassword (min 6 chars) are required' });
      return;
    }

    const user = await prisma.user.findFirst({
      where: { resetToken: token, resetTokenExpiry: { gt: new Date() } }
    });
    if (!user) { res.status(400).json({ error: 'Invalid or expired reset token' }); return; }

    const hashed = await hashPassword(newPassword);
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashed, resetToken: null, resetTokenExpiry: null }
    });

    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Request admin-initiated password reset
router.post('/request-reset', authenticateToken, async (req: AuthRequest, res) => {
  try {
    // Check for existing pending request
    const existing = await prisma.passwordResetRequest.findFirst({
      where: { userId: req.user!.id, status: 'PENDING' }
    });
    if (existing) { res.status(400).json({ error: 'You already have a pending reset request' }); return; }

    const resetRequest = await prisma.passwordResetRequest.create({
      data: { userId: req.user!.id }
    });

    // Notify all admins
    await notifyAdmins({
      type: 'RESET_REQUESTED',
      title: 'Password Reset Request',
      message: `${req.user!.email} has requested a password reset`,
      data: { requestId: resetRequest.id, userEmail: req.user!.email }
    });

    res.json({ message: 'Reset request submitted. An admin will review it shortly.' });
  } catch (error) {
    console.error('Request reset error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Check if user has approved pending password reset (called on login page)
router.post('/check-reset-status', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) { res.status(400).json({ error: 'Email is required' }); return; }

    const user = await prisma.user.findUnique({ where: { email }, select: { pendingPasswordReset: true } });
    if (!user) { res.json({ pendingPasswordReset: false }); return; }

    res.json({ pendingPasswordReset: user.pendingPasswordReset });
  } catch (error) {
    console.error('Check reset status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Set new password after admin approval (no auth needed — user may not know old password)
router.post('/set-new-password', async (req, res) => {
  try {
    const { email, newPassword } = req.body;
    if (!email || !newPassword || newPassword.length < 6) {
      res.status(400).json({ error: 'email and newPassword (min 6 chars) are required' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.pendingPasswordReset) {
      res.status(400).json({ error: 'No approved password reset found for this account' });
      return;
    }

    const hashed = await hashPassword(newPassword);
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashed, pendingPasswordReset: false }
    });

    res.json({ message: 'Password updated successfully. You can now log in.' });
  } catch (error) {
    console.error('Set new password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Accept terms & conditions (authenticated)
router.post('/accept-terms', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { role, version } = req.body;
    if (!role || !version) {
      return res.status(400).json({ error: 'role and version are required' });
    }
    const validRoles = Object.keys(TERMS_VERSIONS);
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    await prisma.termsAcceptance.upsert({
      where: { userId_role_version: { userId: req.user!.id, role, version } },
      update: { acceptedAt: new Date() },
      create: { userId: req.user!.id, role, version, ipAddress: req.ip ?? null }
    });

    res.json({ accepted: true });
  } catch (error) {
    console.error('Accept terms error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get current terms acceptance status (authenticated)
router.get('/terms-status', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const role = (req.query.role as string) ?? req.user!.role;
    const currentVersion = TERMS_VERSIONS[role as TermsRole];
    if (!currentVersion) {
      return res.json({ accepted: true, currentVersion: null });
    }
    const acceptance = await prisma.termsAcceptance.findUnique({
      where: { userId_role_version: { userId: req.user!.id, role, version: currentVersion } }
    });
    res.json({ accepted: !!acceptance, currentVersion });
  } catch (error) {
    console.error('Terms status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
