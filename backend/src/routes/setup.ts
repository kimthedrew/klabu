import express from 'express';
import { prisma } from '../prismaClient';
import { hashPassword } from '../utils/auth';

const router = express.Router();

// ONE-TIME admin setup route — DELETE THIS FILE AFTER USE
router.post('/admin', async (req, res) => {
  const { secret, email, password } = req.body;

  if (secret !== process.env.SETUP_SECRET) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }

  if (!email || !password || password.length < 6) {
    res.status(400).json({ error: 'email and password (min 6 chars) required' });
    return;
  }

  const hashed = await hashPassword(password);
  const admin = await prisma.user.upsert({
    where: { email },
    update: { password: hashed, role: 'ADMIN' },
    create: { email, password: hashed, role: 'ADMIN' },
  });

  res.json({ message: 'Admin ready', email: admin.email });
});

export default router;
