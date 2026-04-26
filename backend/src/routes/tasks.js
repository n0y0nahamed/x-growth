const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const telegramAuth = require('../middleware/telegramAuth');
const prisma = new PrismaClient();

// Get available tasks (not own, not full, approved, not already completed)
router.get('/', telegramAuth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { telegramId: String(req.telegramUser.id) }
    });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const tasks = await prisma.task.findMany({
      where: {
        isActive:   true,
        isApproved: true,
        creatorId:  { not: user.id },
      },
      include: {
        creator: { select: { name: true, xProfileUrl: true } },
        _count:  { select: { completions: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Filter out full tasks
    const notFull = tasks.filter(t => t.usedSlots < t.maxSlots);

    // Filter out tasks already completed by this user
    const completions = await prisma.taskCompletion.findMany({
      where: { userId: user.id },
      select: { taskId: true }
    });
    const doneIds = new Set(completions.map(c => c.taskId));
    const result = notFull.filter(t => !doneIds.has(t.id));

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get my created tasks
router.get('/mine', telegramAuth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { telegramId: String(req.telegramUser.id) }
    });
    const tasks = await prisma.task.findMany({
      where:   { creatorId: user.id },
      orderBy: { createdAt: 'desc' }
    });
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Create task
router.post('/', telegramAuth, async (req, res) => {
  try {
    const { type, targetUrl, description, maxSlots } = req.body;
    const user = await prisma.user.findUnique({
      where: { telegramId: String(req.telegramUser.id) }
    });

    if (!['FOLLOW', 'LIKE', 'COMMENT'].includes(type))
      return res.status(400).json({ error: 'Invalid type' });

    const slots = Math.min(Math.max(1, maxSlots || 5), 50);
    const cost  = slots;

    if (user.points < cost)
      return res.status(400).json({ error: `Need ${cost} points, you have ${user.points}` });

    const [, task] = await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data:  { points: { decrement: cost } }
      }),
      prisma.task.create({
        data: {
          creatorId:   user.id,
          type,
          targetUrl,
          description,
          pointCost:   1,
          maxSlots:    slots,
          isApproved:  false
        }
      })
    ]);

    // Notify admin
    const { bot } = require('../bot/bot');
    try {
      await bot.api.sendMessage(
        process.env.ADMIN_TELEGRAM_ID,
        `📋 *New Task*\n\nBy: ${user.name}\nType: ${type}\nURL: ${targetUrl}\nSlots: ${slots}\nID: #${task.id}`,
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [[
              { text: '✅ Approve', callback_data: `approve_task:${task.id}` },
              { text: '❌ Reject',  callback_data: `reject_task:${task.id}`  }
            ]]
          }
        }
      );
    } catch (e) {}

    res.json({ success: true, task });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Mark task complete (sends to creator for approval)
router.post('/:taskId/complete', telegramAuth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { telegramId: String(req.telegramUser.id) }
    });
    const task = await prisma.task.findUnique({
      where:   { id: parseInt(req.params.taskId) },
      include: { creator: true }
    });

    if (!task || !task.isActive)
      return res.status(404).json({ error: 'Task not found' });
    if (task.creatorId === user.id)
      return res.status(400).json({ error: "Can't complete own task" });
    if (task.usedSlots >= task.maxSlots)
      return res.status(400).json({ error: 'Task is full' });

    const existing = await prisma.taskCompletion.findUnique({
      where: { taskId_userId: { taskId: task.id, userId: user.id } }
    });
    if (existing) return res.status(400).json({ error: 'Already submitted' });

    const completion = await prisma.taskCompletion.create({
      data: { taskId: task.id, userId: user.id, status: 'PENDING' }
    });

    // Notify task creator
    const { bot } = require('../bot/bot');
    try {
      await bot.api.sendMessage(
        task.creator.telegramId,
        `🔔 *Task Completion Request*\n\nFrom: ${user.name}\nTask: ${task.type} → ${task.targetUrl}`,
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [[
              { text: '✅ Approve (+1pt)', callback_data: `approve_completion:${completion.id}` },
              { text: '❌ Reject',         callback_data: `reject_completion:${completion.id}`  }
            ]]
          }
        }
      );
    } catch (e) {}

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
