import express from "express";
import cors from "cors";
import { exec } from "child_process";
import path from "path";
import fs from "fs";

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const clipsDir = path.join(__dirname, "../clips");
if (!fs.existsSync(clipsDir)) fs.mkdirSync(clipsDir);

app.post("/clip", async (req, res) => {
  const { url, start, end } = req.body;
  const id = Date.now();
  const rawVideo = path.join(clipsDir, `video-${id}.mp4`);
  const clippedVideo = path.join(clipsDir, `clip-${id}.mp4`);
  const duration = end - start;

  const downloadCmd = `yt-dlp -f best -o "${rawVideo}" "${url}"`;

  exec(downloadCmd, (err) => {
    if (err) return res.status(500).json({ error: "Download failed" });

    const clipCmd = `ffmpeg -ss ${start} -i "${rawVideo}" -t ${duration} -c copy "${clippedVideo}"`;

    exec(clipCmd, (clipErr) => {
      fs.unlinkSync(rawVideo); // Cleanup

      if (clipErr) return res.status(500).json({ error: "Clipping failed" });

      res.sendFile(clippedVideo, () => {
        fs.unlinkSync(clippedVideo); // Cleanup
      });
    });
  });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
