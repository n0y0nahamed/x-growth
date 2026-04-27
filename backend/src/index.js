require("dotenv").config();

const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors({ origin: "*" }));
app.use(express.json());

// Routes
app.use("/api/auth", require("./routes/auth"));
app.use("/api/users", require("./routes/users"));
app.use("/api/tasks", require("./routes/tasks"));
app.use("/api/requests", require("./routes/requests"));
app.use("/api/leaderboard", require("./routes/leaderboard"));

// Health check
app.get("/", (req, res) => {
  res.json({ status: "OK" });
});

// Bot (optional)
require("./bot/bot");

// Render compatible port
const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
app.get('/ping', (req, res) => res.json({ ok: true }));
