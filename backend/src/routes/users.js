const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const telegramAuth = require('../middleware/telegramAuth');
const prisma = new PrismaClient();

router.get('/me', telegramAuth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { telegramId: String(req.telegramUser.id) },
      include: {
        _count: { select: { tasksCreated: true, completions: true } }
      }
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;