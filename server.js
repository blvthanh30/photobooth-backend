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
  res.send("Photobooth backend đang chạy");
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

    const base64Data = imageBase64.replace(/^data:image\/jpeg;base64,/, "");
    const fileName = `${sessionId}.jpg`;
    const filePath = path.join(uploadDir, fileName);

    fs.writeFileSync(filePath, base64Data, "base64");

    const baseUrl =
      process.env.BASE_URL || `http://localhost:${PORT}`;

    const imageUrl = `${baseUrl}/uploads/${fileName}`;
    console.log("Generated imageUrl:", imageUrl);

    res.json({
      success: true,
      imageUrl,
    });
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({
      success: false,
      error: "Upload failed",
    });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Backend running on http://0.0.0.0:${PORT}`);
});