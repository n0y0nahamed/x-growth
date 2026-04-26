const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const telegramAuth = require('../middleware/telegramAuth');
const prisma = new PrismaClient();

router.get('/incoming', telegramAuth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { telegramId: String(req.telegramUser.id) } });
    const items = await prisma.taskCompletion.findMany({
      where: { task: { creatorId: user.id } },
      include: { task: true, user: { select: { name: true, xProfileUrl: true } } },
      orderBy: { createdAt: 'desc' }
    });
    res.json(items);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

router.get('/outgoing', telegramAuth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { telegramId: String(req.telegramUser.id) } });
    const items = await prisma.taskCompletion.findMany({
      where: { userId: user.id },
      include: { task: { include: { creator: { select: { name: true } } } } },
      orderBy: { createdAt: 'desc' }
    });
    res.json(items);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

router.patch('/:id', telegramAuth, async (req, res) => {
  try {
    const { action } = req.body;
    const approver = await prisma.user.findUnique({ where: { telegramId: String(req.telegramUser.id) } });
    const completion = await prisma.taskCompletion.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { task: true, user: true }
    });

    if (!completion) return res.status(404).json({ error: 'Not found' });
    if (completion.task.creatorId !== approver.id) return res.status(403).json({ error: 'Forbidden' });

    if (action === 'approve') {
      await prisma.$transaction([
        prisma.taskCompletion.update({ where: { id: completion.id }, data: { status: 'APPROVED' } }),
        prisma.user.update({ where: { id: completion.userId }, data: { points: { increment: 1 } } }),
        prisma.task.update({ where: { id: completion.taskId }, data: { usedSlots: { increment: 1 } } })
      ]);

      // Auto-deactivate if full
      const updatedTask = await prisma.task.findUnique({ where: { id: completion.taskId } });
      if (updatedTask.usedSlots >= updatedTask.maxSlots) {
        await prisma.task.update({ where: { id: completion.taskId }, data: { isActive: false } });
      }

      // Notify completer
      const { bot } = require('../bot/bot');
      try {
        await bot.api.sendMessage(completion.user.telegramId, `✅ Task approved! +1 point added to your balance.`);
      } catch (e) {}
    } else {
      await prisma.taskCompletion.update({ where: { id: completion.id }, data: { status: 'REJECTED' } });
    }

    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

module.exports = router;