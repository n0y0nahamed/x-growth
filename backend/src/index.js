const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

app.use(cors({ origin: '*' })); // Tighten in production
app.use(express.json());

app.use('/api/auth',        require('./routes/auth'));
app.use('/api/users',       require('./routes/users'));
app.use('/api/tasks',       require('./routes/tasks'));
app.use('/api/requests',    require('./routes/requests'));
app.use('/api/leaderboard', require('./routes/leaderboard'));

// Health check
app.get('/', (req, res) => res.json({ status: 'X-Growth API running ✅' }));

// Start bot
require('./bot/bot');

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server on port ${PORT}`));