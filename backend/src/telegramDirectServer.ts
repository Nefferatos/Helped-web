import "dotenv/config";
import express from "express";
import telegramDirectRoutes from "./routes/telegramDirectRoutes";

const app = express();
const port = Number(process.env.PORT || 3000);

app.disable("x-powered-by");
app.use(express.json({ limit: "64kb" }));
app.get("/api/health", (_req, res) => res.json({ status: "Telegram direct API is running" }));
app.use("/api/telegram-direct", telegramDirectRoutes);

app.listen(port, "0.0.0.0", () => {
  console.log(`Telegram direct API is listening on port ${port}`);
});
