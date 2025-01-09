import express from "express";
import dotenv from "dotenv";
import { clerkMiddleware } from "@clerk/express";
import fileUpload from "express-fileupload";
import path from "path";
import cors from "cors";
import fs from "fs";
import { createServer } from "http";
import cron from "node-cron";

import { initializeSocket } from "./lib/socket.js";
import { connectDB } from "./lib/db.js";
import userRoutes from "./routes/user.route.js";
import adminRoutes from "./routes/admin.route.js";
import authRoutes from "./routes/auth.route.js";
import songRoutes from "./routes/song.route.js";
import albumRoutes from "./routes/album.route.js";
import statRoutes from "./routes/stat.route.js";

dotenv.config();

const __dirname = path.resolve();
const app = express();
const PORT = process.env.PORT || 5001;

const httpServer = createServer(app);
initializeSocket(httpServer);

app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  })
);

app.use(express.json()); // to parse req.body
app.use(clerkMiddleware()); // this will add auth to req obj => req.auth
app.use(
  fileUpload({
    useTempFiles: true,
    tempFileDir: path.join(__dirname, "tmp"),
    createParentPath: true,
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB max file size
    },
  })
);

// cron jobs to clear temporary files
const tempDir = path.join(process.cwd(), "tmp");
cron.schedule("0 * * * *", () => {
  if (fs.existsSync(tempDir)) {
    fs.readdir(tempDir, (err, files) => {
      if (err) {
        console.log("error", err);
        return;
      }
      for (const file of files) {
        fs.unlink(path.join(tempDir, file), (err) => {});
      }
    });
  }
});

app.use("/api/users", userRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/songs", songRoutes);
app.use("/api/albums", albumRoutes);
app.use("/api/stats", statRoutes);

// Serve the frontend dynamically
app.get("/", (req, res) => {
  // Define the dynamic title for the page
  const dynamicTitle = "Spotify-Clone-Edition";  // Modify based on your needs

  // Read the index.html file
  fs.readFile(path.join(__dirname, "../frontend/dist/index.html"), "utf8", (err, data) => {
    if (err) {
      return res.status(500).send("Error reading index.html");
    }

    // Modify the title in the HTML content dynamically
    const modifiedHtml = data.replace(
      /<title>(.*?)<\/title>/,  // Regex to find the <title> tag
      `<title>${dynamicTitle}</title>`  // Replace with the dynamic title
    );

    // Send the modified HTML back to the client
    res.send(modifiedHtml);
  });
});

// Serve other static files (if necessary)
app.use(express.static(path.join(__dirname, "../frontend/dist")));

// error handler
app.use((err, req, res, next) => {
  res.status(500).json({
    message: process.env.NODE_ENV === "production" ? "Internal server error" : err.message,
  });
});

httpServer.listen(PORT, () => {
  console.log("Server is running at http://localhost:" + PORT);
  connectDB();
});
