import express from "express";
import dotenv from "dotenv";
import cors from "cors";
dotenv.config();

import authRouter from "./routes/auth.js";
import CommentRouter from "./routes/comment.js";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use("/api/auth", authRouter);
app.use("/api/comments", CommentRouter);

app.listen(PORT, () => {
  console.log("App listening on port ", PORT);
});
