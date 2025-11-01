import express, { Request, Response } from "express";
import cors from "cors";
const app = express();
const PORT = 3000;

app.use(
  cors({
    origin: "*",
  }),
);

app.get("/", (req: Request, res: Response) => {
  res.send("Hello, TypeScript with Express!");
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
