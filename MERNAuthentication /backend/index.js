import express from "express";
import dotenv from "dotenv";
import connectDb from "./config/db.js";
import { createClient } from "redis";
dotenv.config();

await connectDb();
const redisUrl = process.env.REDIS_URL;
if (!redisUrl) {
  console.log("Missing redis url");
  process.exit(1);
}

export const redisclient = createClient({
  url: redisUrl,
});

redisclient
  .connect()
  .then(() => console.log("connected to redis")).catch(console.error);

const app = express();
// middlewares
app.use(express.json());

// importing route
import userRoutes from "./routes/user.js";
// usnig routes

app.use("/api/v1", userRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`SERVER IS RUNNING ON PORT `, PORT);
});
