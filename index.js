import dotenv from "dotenv";
dotenv.config();
import express from "express";

import cors from "cors";

import authRouter from "./routes/auth.js";
import CommentRouter from "./routes/comment.js";

const app = express();
const PORT = process.env.PORT || 3000;

const corsOptions = {
  origin: [process.env.FRONTEND_URI || "https://www.kgpforum.work.gd"],
  credentials: true,
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));
app.use(express.json());
app.use("/api/auth", authRouter);
app.use("/api/comments", CommentRouter);

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    message: "Server is running",
    port: PORT,
  });
});

app.listen(PORT, () => {
  console.log(
    "🔑 JWT_SECRET:",
    process.env.JWT_SECRET ? "✅ Loaded" : "❌ Missing"
  );
  console.log("App listening on port", PORT);
});
