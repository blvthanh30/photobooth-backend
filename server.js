const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3001;

// CORS rõ ràng hơn để chạy local và deploy
app.use(
  cors({
    origin: true,
    credentials: false,
  })
);

// Tăng limit vì ảnh strip base64 có thể khá lớn
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Serve ảnh đã upload
app.use("/uploads", express.static(uploadDir));

// Root route
app.get("/", (req, res) => {
  res.status(200).send("Photobooth backend đang chạy");
});

// Health check để frontend wake backend trước khi upload
app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Server is running",
    timestamp: new Date().toISOString(),
  });
});

// Upload strip ảnh từ frontend
app.post("/api/upload-strip", (req, res) => {
  try {
    console.log("POST /api/upload-strip called");

    const { imageBase64, sessionId } = req.body;

    console.log("sessionId =", sessionId);
    console.log("has imageBase64 =", !!imageBase64);

    if (!imageBase64 || !sessionId) {
      return res.status(400).json({
        success: false,
        error: "Thiếu imageBase64 hoặc sessionId",
      });
    }

    const match = imageBase64.match(
      /^data:image\/(jpeg|jpg|png|webp);base64,/i
    );

    if (!match) {
      return res.status(400).json({
        success: false,
        error:
          "imageBase64 không đúng định dạng. Chỉ hỗ trợ jpeg, jpg, png, webp",
      });
    }

    const ext =
      match[1].toLowerCase() === "jpeg" ? "jpg" : match[1].toLowerCase();

    const base64Data = imageBase64.replace(
      /^data:image\/(jpeg|jpg|png|webp);base64,/i,
      ""
    );

    const safeSessionId = String(sessionId).replace(/[^a-zA-Z0-9_-]/g, "");
    if (!safeSessionId) {
      return res.status(400).json({
        success: false,
        error: "sessionId không hợp lệ",
      });
    }

    const fileName = `${safeSessionId}.${ext}`;
    const filePath = path.join(uploadDir, fileName);

    fs.writeFileSync(filePath, base64Data, "base64");

    const baseUrl =
      process.env.BASE_URL || `${req.protocol}://${req.get("host")}`;

    const imageUrl = `${baseUrl}/uploads/${fileName}`;

    console.log("Saved file:", filePath);
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

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "Route not found",
    method: req.method,
    path: req.originalUrl,
  });
});

// Error handler
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