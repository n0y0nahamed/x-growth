const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Submit access request (no Twitter OAuth needed)
router.post('/request-access', async (req, res) => {
  try {
    const { telegramId, telegramUsername, name, xProfileUrl } = req.body;

    if (!telegramId || !name || !xProfileUrl) {
      return res.status(400).json({ error: 'Missing fields' });
    }

    // Save/update request
    const request = await prisma.accessRequest.upsert({
      where: { telegramId: String(telegramId) },
      create: { telegramId: String(telegramId), telegramUsername, name, xProfileUrl, status: 'PENDING' },
      update: { xProfileUrl, status: 'PENDING', name }
    });

    // Notify admin via bot
    const { bot } = require('../bot/bot');
    try {
      await bot.api.sendMessage(
        process.env.ADMIN_TELEGRAM_ID,
        `🆕 *New Access Request*\n\n👤 ${name}\n🔗 @${telegramUsername || 'N/A'}\n🐦 ${xProfileUrl}\n\nTelegram ID: \`${telegramId}\``,
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [[
              { text: '✅ Approve', callback_data: `approve_access:${telegramId}` },
              { text: '❌ Reject',  callback_data: `reject_access:${telegramId}` }
            ]]
          }
        }
      );
    } catch (botErr) {
      console.error('Bot notification error:', botErr.message);
    }

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Check approval status
router.get('/status/:telegramId', async (req, res) => {
  try {
    const { telegramId } = req.params;

    // Check if user is fully approved
    const user = await prisma.user.findUnique({ where: { telegramId } });
    if (user?.isApproved) {
      return res.json({ status: 'approved', user });
    }

    // Check access request
    const request = await prisma.accessRequest.findUnique({ where: { telegramId } });
    if (!request) return res.json({ status: 'not_found' });

    res.json({ status: request.status.toLowerCase() });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;