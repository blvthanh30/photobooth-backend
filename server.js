const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: "25mb" }));

const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

app.use("/uploads", express.static(uploadDir));

app.get("/", (req, res) => {
  res.status(200).send("Photobooth backend đang chạy");
});

app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Server is running",
    timestamp: new Date().toISOString(),
  });
});

app.post("/api/upload-strip", (req, res) => {
  try {
    const { imageBase64, sessionId } = req.body;

    if (!imageBase64 || !sessionId) {
      return res.status(400).json({
        success: false,
        error: "Thiếu imageBase64 hoặc sessionId",
      });
    }

    const match = imageBase64.match(/^data:image\/(jpeg|jpg|png|webp);base64,/i);
    if (!match) {
      return res.status(400).json({
        success: false,
        error: "imageBase64 không đúng định dạng. Chỉ hỗ trợ jpeg, jpg, png, webp",
      });
    }

    const ext = match[1].toLowerCase() === "jpeg" ? "jpg" : match[1].toLowerCase();
    const base64Data = imageBase64.replace(/^data:image\/(jpeg|jpg|png|webp);base64,/i, "");
    const safeSessionId = String(sessionId).replace(/[^a-zA-Z0-9_-]/g, "");
    const fileName = `${safeSessionId}.${ext}`;
    const filePath = path.join(uploadDir, fileName);

    fs.writeFileSync(filePath, base64Data, "base64");

    const baseUrl =
      process.env.BASE_URL ||
      `${req.protocol}://${req.get("host")}`;

    const imageUrl = `${baseUrl}/uploads/${fileName}`;
    console.log("Generated imageUrl:", imageUrl);

    return res.status(200).json({
      success: true,
      imageUrl,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return res.status(500).json({
      success: false,
      error: "Upload failed",
    });
  }
});

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "Route not found",
    method: req.method,
    path: req.originalUrl,
  });
});

app.use((err, req, res, next) => {
  console.error("Server error:", err);
  res.status(500).json({
    success: false,
    error: "Internal server error",
  });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Backend running on http://0.0.0.0:${PORT}`);
});