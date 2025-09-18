// backend/src/server.js

require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const { initRedis } = require("./cache/redisClient");
const chatRouter = require("./routes/chat");
const cors = require("cors");
const app = express();
app.use(bodyParser.json());

const PORT = process.env.PORT || 5000;

app.use(
  cors({
    origin: "http://localhost:3001", // your frontend origin
    credentials: true,
  })
);
initRedis()
  .then(() => {
    console.log("Redis initialized");
    app.use("/api/chat", chatRouter);

    app.listen(PORT, () => {
      console.log(`Backend server listening on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Failed to init redis:", err);
  });
