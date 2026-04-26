const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

router.get('/', async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      where: { isApproved: true },
      select: {
        id: true, name: true, xProfileUrl: true, points: true,
        _count: { select: { completions: true } }
      },
      orderBy: { points: 'desc' },
      take: 100 // Top 100
    });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;