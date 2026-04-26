const { Bot } = require('grammy');
const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();
const bot = new Bot(process.env.BOT_TOKEN);
module.exports = { bot };

const ADMIN_ID = process.env.ADMIN_TELEGRAM_ID;
const isAdmin = (ctx) => String(ctx.from?.id) === ADMIN_ID;

// ── User Commands ────────────────────────────────────────────────────────────
bot.command('start', async (ctx) => {
  if (isAdmin(ctx)) {
    return ctx.reply(`👑 *Welcome Admin!*\n\nUse /help to see all commands.`, { parse_mode: 'Markdown' });
  }

  const webAppUrl = process.env.WEBAPP_URL;
  await ctx.reply(
    `🌱 *Welcome to X-Growth!*\n\nGrow your X (Twitter) account with the community.\n\nTap the button below to get started.\n\n_Made by @n0y0nahamed_`,
    {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [[
          { text: '🚀 Open X-Growth', web_app: { url: webAppUrl } }
        ]]
      }
    }
  );
});

// ── Admin Commands ───────────────────────────────────────────────────────────
bot.command('help', async (ctx) => {
  if (!isAdmin(ctx)) return ctx.reply('⛔ Admin only.');
  await ctx.reply(
    `📋 *Admin Commands*\n\n` +
    `/approve <telegramId> — Approve user access\n` +
    `/reject <telegramId> — Reject user access\n` +
    `/give @username <amount> — Add points\n` +
    `/take @username <amount> — Remove points\n` +
    `/approvetask <id> — Approve a task\n` +
    `/rejecttask <id> — Reject + refund task\n` +
    `/userinfo @username — View user details\n` +
    `/stats — App statistics\n` +
    `/ban <telegramId> — Ban user`,
    { parse_mode: 'Markdown' }
  );
});

bot.command('approve', async (ctx) => {
  if (!isAdmin(ctx)) return;
  const telegramId = ctx.match?.trim();
  if (!telegramId) return ctx.reply('Usage: /approve 123456789');

  try {
    const request = await prisma.accessRequest.findUnique({ where: { telegramId } });
    if (!request) return ctx.reply('Request not found.');

    await prisma.accessRequest.update({ where: { telegramId }, data: { status: 'APPROVED' } });
    await prisma.user.upsert({
      where: { telegramId },
      create: { telegramId, name: request.name, telegramUsername: request.telegramUsername, xProfileUrl: request.xProfileUrl, isApproved: true, points: 50 },
      update: { isApproved: true }
    });

    await ctx.reply(`✅ ${request.name} approved! +50 welcome points given.`);
    try {
      await bot.api.sendMessage(telegramId,
        `🎉 *Your access is approved!*\n\nYou got *50 welcome points*. Open X-Growth to start growing!\n\n_Made by @n0y0nahamed_`,
        { parse_mode: 'Markdown' }
      );
    } catch (e) {}
  } catch (err) {
    ctx.reply('Error: ' + err.message);
  }
});

bot.command('reject', async (ctx) => {
  if (!isAdmin(ctx)) return;
  const telegramId = ctx.match?.trim();
  try {
    await prisma.accessRequest.update({ where: { telegramId }, data: { status: 'REJECTED' } });
    await ctx.reply(`❌ Request rejected.`);
    try { await bot.api.sendMessage(telegramId, `Sorry, your X-Growth access request was rejected.`); } catch (e) {}
  } catch (err) { ctx.reply('Error: ' + err.message); }
});

bot.command('give', async (ctx) => {
  if (!isAdmin(ctx)) return;
  const parts = ctx.match?.trim().split(' ');
  if (!parts || parts.length < 2) return ctx.reply('Usage: /give @username 100');

  const username = parts[0].replace('@', '');
  const amount = parseInt(parts[1]);
  if (isNaN(amount)) return ctx.reply('Invalid amount');

  try {
    const user = await prisma.user.findFirst({
      where: { OR: [{ telegramUsername: username }, { name: { contains: username } }] }
    });
    if (!user) return ctx.reply('User not found');

    await prisma.user.update({ where: { id: user.id }, data: { points: { increment: amount } } });
    await ctx.reply(`✅ Gave ${amount} pts to ${user.name}. New total: ${user.points + amount}`);
    try { await bot.api.sendMessage(user.telegramId, `🎁 Admin gave you *${amount} points*!`, { parse_mode: 'Markdown' }); } catch (e) {}
  } catch (err) { ctx.reply('Error: ' + err.message); }
});

bot.command('take', async (ctx) => {
  if (!isAdmin(ctx)) return;
  const parts = ctx.match?.trim().split(' ');
  const username = parts?.[0]?.replace('@', '');
  const amount = parseInt(parts?.[1]);
  if (!username || isNaN(amount)) return ctx.reply('Usage: /take @username 50');

  try {
    const user = await prisma.user.findFirst({ where: { telegramUsername: username } });
    if (!user) return ctx.reply('User not found');
    const newPts = Math.max(0, user.points - amount);
    await prisma.user.update({ where: { id: user.id }, data: { points: newPts } });
    await ctx.reply(`✅ Removed ${amount} pts from ${user.name}. New total: ${newPts}`);
  } catch (err) { ctx.reply('Error: ' + err.message); }
});

bot.command('approvetask', async (ctx) => {
  if (!isAdmin(ctx)) return;
  const id = parseInt(ctx.match?.trim());
  if (isNaN(id)) return ctx.reply('Usage: /approvetask 42');
  try {
    await prisma.task.update({ where: { id }, data: { isApproved: true, isActive: true } });
    ctx.reply(`✅ Task #${id} is now live!`);
  } catch (err) { ctx.reply('Task not found'); }
});

bot.command('rejecttask', async (ctx) => {
  if (!isAdmin(ctx)) return;
  const id = parseInt(ctx.match?.trim());
  try {
    const task = await prisma.task.findUnique({ where: { id }, include: { creator: true } });
    if (!task) return ctx.reply('Task not found');
    await prisma.user.update({ where: { id: task.creatorId }, data: { points: { increment: task.maxSlots } } });
    await prisma.task.update({ where: { id }, data: { isActive: false } });
    ctx.reply(`❌ Task #${id} rejected. ${task.maxSlots} pts refunded to creator.`);
  } catch (err) { ctx.reply('Error: ' + err.message); }
});

bot.command('stats', async (ctx) => {
  if (!isAdmin(ctx)) return;
  const [users, tasks, completions, pending] = await Promise.all([
    prisma.user.count({ where: { isApproved: true } }),
    prisma.task.count({ where: { isActive: true, isApproved: true } }),
    prisma.taskCompletion.count({ where: { status: 'APPROVED' } }),
    prisma.accessRequest.count({ where: { status: 'PENDING' } }),
  ]);
  ctx.reply(`📊 *X-Growth Stats*\n\n👥 Users: ${users}\n📋 Active Tasks: ${tasks}\n✅ Completions: ${completions}\n⏳ Pending Requests: ${pending}`, { parse_mode: 'Markdown' });
});

bot.command('userinfo', async (ctx) => {
  if (!isAdmin(ctx)) return;
  const username = ctx.match?.trim().replace('@', '');
  try {
    const user = await prisma.user.findFirst({ where: { telegramUsername: username } });
    if (!user) return ctx.reply('User not found');
    ctx.reply(`👤 *${user.name}*\n@${user.telegramUsername}\nX: ${user.xProfileUrl}\nPoints: ${user.points}\nApproved: ${user.isApproved}\nID: ${user.telegramId}`, { parse_mode: 'Markdown' });
  } catch (err) { ctx.reply('Error'); }
});

bot.command('ban', async (ctx) => {
  if (!isAdmin(ctx)) return;
  const telegramId = ctx.match?.trim();
  try {
    await prisma.user.update({ where: { telegramId }, data: { isApproved: false } });
    ctx.reply(`🚫 User ${telegramId} banned.`);
  } catch (err) { ctx.reply('User not found'); }
});

// ── Inline button callbacks ──────────────────────────────────────────────────
bot.on('callback_query:data', async (ctx) => {
  const data = ctx.callbackQuery.data;
  const colonIdx = data.indexOf(':');
  const action = data.substring(0, colonIdx);
  const id = data.substring(colonIdx + 1);

  try {
    if (action === 'approve_access') {
      const request = await prisma.accessRequest.findUnique({ where: { telegramId: id } });
      if (!request) return ctx.answerCallbackQuery({ text: 'Not found' });

      await prisma.accessRequest.update({ where: { telegramId: id }, data: { status: 'APPROVED' } });
      await prisma.user.upsert({
        where: { telegramId: id },
        create: { telegramId: id, name: request.name, telegramUsername: request.telegramUsername, xProfileUrl: request.xProfileUrl, isApproved: true, points: 50 },
        update: { isApproved: true }
      });

      await bot.api.sendMessage(id, `🎉 *Access approved!* You received 50 welcome points. Open X-Growth to start!`, { parse_mode: 'Markdown' }).catch(() => {});
      await ctx.editMessageText(ctx.callbackQuery.message.text + '\n\n✅ *APPROVED*', { parse_mode: 'Markdown' }).catch(() => {});
      await ctx.answerCallbackQuery({ text: '✅ Approved!' });

    } else if (action === 'reject_access') {
      await prisma.accessRequest.update({ where: { telegramId: id }, data: { status: 'REJECTED' } }).catch(() => {});
      await bot.api.sendMessage(id, 'Sorry, your access request was rejected.').catch(() => {});
      await ctx.editMessageText(ctx.callbackQuery.message.text + '\n\n❌ *REJECTED*', { parse_mode: 'Markdown' }).catch(() => {});
      await ctx.answerCallbackQuery({ text: '❌ Rejected' });

    } else if (action === 'approve_task') {
      await prisma.task.update({ where: { id: parseInt(id) }, data: { isApproved: true, isActive: true } });
      await ctx.editMessageText(ctx.callbackQuery.message.text + '\n\n✅ *TASK APPROVED*', { parse_mode: 'Markdown' }).catch(() => {});
      await ctx.answerCallbackQuery({ text: '✅ Task live!' });

    } else if (action === 'reject_task') {
      const task = await prisma.task.findUnique({ where: { id: parseInt(id) } });
      if (task) {
        await prisma.user.update({ where: { id: task.creatorId }, data: { points: { increment: task.maxSlots } } });
        await prisma.task.update({ where: { id: parseInt(id) }, data: { isActive: false } });
      }
      await ctx.answerCallbackQuery({ text: '❌ Rejected + refunded' });

    } else if (action === 'approve_completion') {
      const completion = await prisma.taskCompletion.findUnique({
        where: { id: parseInt(id) },
        include: { task: true, user: true }
      });
      if (!completion) return ctx.answerCallbackQuery({ text: 'Not found' });

      await prisma.$transaction([
        prisma.taskCompletion.update({ where: { id: parseInt(id) }, data: { status: 'APPROVED' } }),
        prisma.user.update({ where: { id: completion.userId }, data: { points: { increment: 1 } } }),
        prisma.task.update({ where: { id: completion.taskId }, data: { usedSlots: { increment: 1 } } })
      ]);

      const updatedTask = await prisma.task.findUnique({ where: { id: completion.taskId } });
      if (updatedTask.usedSlots >= updatedTask.maxSlots) {
        await prisma.task.update({ where: { id: updatedTask.id }, data: { isActive: false } });
      }

      await bot.api.sendMessage(completion.user.telegramId, `✅ Task approved! +1 point added.`).catch(() => {});
      await ctx.editMessageText(ctx.callbackQuery.message.text + '\n\n✅ *APPROVED — +1pt sent*', { parse_mode: 'Markdown' }).catch(() => {});
      await ctx.answerCallbackQuery({ text: '✅ +1pt sent!' });

    } else if (action === 'reject_completion') {
      await prisma.taskCompletion.update({ where: { id: parseInt(id) }, data: { status: 'REJECTED' } });
      await ctx.editMessageText(ctx.callbackQuery.message.text + '\n\n❌ *REJECTED*', { parse_mode: 'Markdown' }).catch(() => {});
      await ctx.answerCallbackQuery({ text: '❌ Rejected' });
    }
  } catch (err) {
    console.error('Callback error:', err.message);
    await ctx.answerCallbackQuery({ text: 'Error occurred' });
  }
});

bot.start();
console.log('✅ Bot started');