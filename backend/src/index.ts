import express from "express";
import cors from "cors";
import { exec } from "child_process";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const clipsDir = path.join(__dirname, "../clips");
try {
  if (!fs.existsSync(clipsDir)) fs.mkdirSync(clipsDir);
} catch (error) {
  console.error("Error creating clips directory:", error);
}

const qualitySettings = {
  "1080p": { height: 1080, crf: 18 },
  "720p": { height: 720, crf: 20 },
  "480p": { height: 480, crf: 22 },
  "360p": { height: 360, crf: 24 }
};

app.get("/", (req: any, res: any) => {
  try {
    res.json({ message: "Hello, world!" });
  } catch (error) {
    console.error("Error in root endpoint:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/clip", async (req: any, res: any) => {
  try {
    const { url, start, end, quality = "1080p" } = req.body;
    
    if (!url || !start || !end) {
      return res.status(400).json({ error: "Missing required parameters" });
    }

    const qualitySetting = qualitySettings[quality as keyof typeof qualitySettings] || qualitySettings["1080p"];
    const id = Date.now();
    const rawVideo = path.join(clipsDir, `video-${id}.mp4`);
    const clippedVideo = path.join(clipsDir, `clip-${id}.mp4`);
    const duration = Number(end) - Number(start);

    res.setTimeout(30 * 60 * 1000);

    const downloadCmd = `yt-dlp -f "bestvideo[height<=${qualitySetting.height}][ext=mp4]+bestaudio[ext=m4a]/best[height<=${qualitySetting.height}][ext=mp4]/best" --progress-template "%(progress._percent_str)s" -o "${rawVideo}" "${url}"`;

    exec(downloadCmd, (err) => {
      if (err) {
        console.error("Download error:", err);
        return res.status(500).json({ error: "Download failed" });
      }

      const clipCmd = `ffmpeg -ss ${start} -i "${rawVideo}" -t ${duration} -vf "scale=1920:${qualitySetting.height}:force_original_aspect_ratio=decrease,pad=1920:${qualitySetting.height}:(ow-iw)/2:(oh-ih)/2" -c:v libx264 -crf ${qualitySetting.crf} -preset slow -c:a aac -b:a 192k "${clippedVideo}"`;

      exec(clipCmd, (clipErr) => {
        try {
          if (fs.existsSync(rawVideo)) {
            fs.unlinkSync(rawVideo);
          }

          if (clipErr) {
            console.error("Clipping error:", clipErr);
            if (fs.existsSync(clippedVideo)) {
              fs.unlinkSync(clippedVideo);
            }
            return res.status(500).json({ error: "Clipping failed" });
          }

          res.sendFile(clippedVideo, (err: any) => {
            try {
              if (err) {
                console.error("Send file error:", err);
              }
              if (fs.existsSync(clippedVideo)) {
                fs.unlinkSync(clippedVideo);
              }
            } catch (fileError) {
              console.error("Error cleaning up clipped video:", fileError);
            }
          });
        } catch (cleanupError) {
          console.error("Error in cleanup:", cleanupError);
          res.status(500).json({ error: "Error in processing" });
        }
      });
    });
  } catch (error) {
    console.error("Error in clip endpoint:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
