const crypto = require('crypto');

module.exports = function telegramAuth(req, res, next) {
  const initData = req.headers['x-telegram-init-data'];
  if (!initData) return res.status(401).json({ error: 'No auth' });

  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  params.delete('hash');

  const dataStr = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('\n');

  const secret = crypto.createHmac('sha256', 'WebAppData').update(process.env.BOT_TOKEN).digest();
  const expectedHash = crypto.createHmac('sha256', secret).update(dataStr).digest('hex');

  if (expectedHash !== hash) return res.status(401).json({ error: 'Invalid auth' });

  req.telegramUser = JSON.parse(params.get('user'));
  next();
};