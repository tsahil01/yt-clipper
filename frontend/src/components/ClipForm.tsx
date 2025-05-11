import { useState, useRef, useEffect } from "react";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Play, Pause, Loader2, Download } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { YTPlayer } from "@/lib/types";

const getYoutubeId = (url: string) => {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
};

// Format seconds to MM:SS
const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

export default function ClipForm() {
  const [url, setUrl] = useState("");
  const [youtubeId, setYoutubeId] = useState<string | null>(null);
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [range, setRange] = useState([0, 10]);
  const [loading, setLoading] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ download?: string; clip?: string }>({});
  const [quality, setQuality] = useState("1080p");

  const playerRef = useRef<YTPlayer | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    const scriptId = 'youtube-iframe-api';
    if (document.getElementById(scriptId)) {
      if (window.YT && window.YT.Player) {
        initPlayer();
      }
      return;
    }

    const tag = document.createElement('script');
    tag.id = scriptId;
    tag.src = "https://www.youtube.com/iframe_api";
    const firstScriptTag = document.getElementsByTagName('script')[0];

    if (firstScriptTag && firstScriptTag.parentNode) {
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    } else {
      document.head.appendChild(tag);
    }

    window.onYouTubeIframeAPIReady = () => initPlayer();

    return () => {
      window.onYouTubeIframeAPIReady = undefined;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!youtubeId) {
      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
        setIsVideoLoaded(false);
        setDuration(0);
        setCurrentTime(null);
        setRange([0, 10]);
      }
      return;
    }

    if (window.YT && window.YT.Player) {
      initPlayer();
    }
  }, [youtubeId]);

  useEffect(() => {
    if (!isVideoLoaded || !playerRef.current) return;

    intervalRef.current = setInterval(() => {
      if (!playerRef.current) return;

      const time = playerRef.current.getCurrentTime();
      setCurrentTime(time);

      const playerState = playerRef.current.getPlayerState();
      if (playerState === window.YT.PlayerState.PLAYING) {
        if (time >= range[1]) {
          playerRef.current.pauseVideo();
          playerRef.current.seekTo(range[1], true);
          setCurrentTime(range[1]);
        } else if (time < range[0]) {
          playerRef.current.seekTo(range[0], true);
          setCurrentTime(range[0]);
        }
      }
    }, 100);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isVideoLoaded, range]);

  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  function initPlayer() {
    if (!youtubeId || !window.YT || !window.YT.Player) return;

    if (playerRef.current) {
      playerRef.current.destroy();
      playerRef.current = null;
    }

    setIsVideoLoaded(false);

    playerRef.current = new window.YT.Player('youtube-player', {
      height: '360',
      width: '640',
      videoId: youtubeId,
      playerVars: {
        'playsinline': 1,
        'controls': 0,
        'rel': 0,
        'modestbranding': 1
      },
      events: {
        'onReady': (event: { target: YTPlayer }) => {
          const player = event.target;
          const videoDuration = player.getDuration();
          setDuration(videoDuration);
          setRange([0, Math.min(30, videoDuration || 0)]);
          setIsVideoLoaded(true);
          setCurrentTime(0);
        },
        'onStateChange': (event: { data: number }) => {
          setIsPlaying(event.data === window.YT.PlayerState.PLAYING);
        }
      }
    });
  }

  const loadVideo = () => {
    const id = getYoutubeId(url);
    if (id) {
      setYoutubeId(id);
      setVideoUrl(null);
      setIsVideoLoaded(false);
      setCurrentTime(0);
    } else {
      alert("Invalid YouTube URL");
    }
  };

  const togglePlay = () => {
    if (!playerRef.current) return;

    if (isPlaying) {
      playerRef.current.pauseVideo();
    } else {
      const currentPlayTime = playerRef.current.getCurrentTime();
      if (currentPlayTime < range[0] || currentPlayTime >= range[1]) {
        playerRef.current.seekTo(range[0], true);
        setCurrentTime(range[0]);
      }
      playerRef.current.playVideo();
    }
  };

  const handleRangeChange = (newRange: number[]) => {
    const validRange = [
      Math.max(0, newRange[0]),
      Math.min(duration, newRange[1])
    ];
    setRange(validRange);

    if (playerRef.current && !isPlaying) {
      const currentPlayTime = playerRef.current.getCurrentTime();
      if (currentPlayTime < validRange[0] || currentPlayTime > validRange[1]) {
        playerRef.current.seekTo(validRange[0], true);
        setCurrentTime(validRange[0]);
      }
    }
  };

  const handleClip = async () => {
    setLoading(true);
    setVideoUrl(null);
    setProgress({});

    try {
      const res = await fetch("http://localhost:3001/clip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: `https://www.youtube.com/watch?v=${youtubeId}`,
          start: range[0],
          end: range[1],
          quality
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to process video");
      }

      const blob = await res.blob();
      const localUrl = URL.createObjectURL(blob);
      setVideoUrl(localUrl);
    } catch (error) {
      console.error("Error:", error);
      alert("Failed to process video. Please try again.");
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg shadow-md p-8">
          <h2 className="text-xl font-bold text-zinc-100 mb-8 text-center">YouTube Video Clipper</h2>

          <div className="space-y-8">
            <div className="flex space-x-2">
              <Input
                id="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                className="bg-zinc-800 border-zinc-700 text-zinc-100 focus:ring-amber-500 focus:border-amber-500 transition-all duration-200"
              />
              <Button
                onClick={loadVideo}
                className="bg-amber-600 hover:bg-amber-700 text-zinc-100 transition-all duration-200"
              >
                Load Video
              </Button>
            </div>

            {youtubeId && (
              <div className="space-y-8">
                <div className="aspect-video bg-black rounded-md overflow-hidden relative border border-zinc-800 shadow-md">
                  <div id="youtube-player" className="w-full h-full"></div>
                  {!isVideoLoaded && (
                    <div className="absolute inset-0 flex items-center justify-center bg-zinc-900/90">
                      <Loader2 className="w-10 h-10 animate-spin text-amber-500" />
                    </div>
                  )}

                  {isVideoLoaded && (
                    <div className="absolute bottom-4 left-4">
                      <Button
                        size="icon"
                        onClick={togglePlay}
                        className="bg-zinc-800 hover:bg-zinc-700 text-zinc-100 rounded-full shadow-md transition-all duration-200"
                      >
                        {isPlaying ? <Pause size={18} /> : <Play size={18} />}
                      </Button>
                    </div>
                  )}
                </div>

                {isVideoLoaded && (
                  <div className="space-y-8">
                    <div className="space-y-4">
                      <div className="flex justify-between text-sm text-zinc-400">
                        <span>
                          Clip Range: {formatTime(range[0])} - {formatTime(range[1])}
                        </span>
                        <span>Duration: {formatTime(range[1] - range[0])}</span>
                      </div>

                      <div className="w-full bg-zinc-800 h-1.5 rounded-full relative">
                        <div
                          className="absolute h-1.5 rounded-full bg-amber-600"
                          style={{
                            left: `${duration > 0 ? (range[0] / duration) * 100 : 0}%`,
                            width: `${duration > 0 ? ((range[1] - range[0]) / duration) * 100 : 0}%`,
                          }}
                        />
                        <div
                          className="absolute w-3 h-3 bg-amber-500 rounded-full -mt-0.75 shadow-md transform -translate-x-1/2"
                          style={{
                            left: `${duration > 0 && currentTime !== null ? (currentTime / duration) * 100 : 0}%`,
                          }}
                        />
                      </div>

                      <Slider
                        value={range}
                        min={0}
                        max={duration}
                        step={0.1}
                        onValueChange={handleRangeChange}
                        className="py-4"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label htmlFor="start" className="block text-sm font-medium text-zinc-300">
                          Start Time (seconds)
                        </label>
                        <Input
                          id="start"
                          type="number"
                          value={range[0].toFixed(1)}
                          onChange={(e) => {
                            const newStart = Number(e.target.value)
                            if (!isNaN(newStart) && newStart >= 0 && newStart < range[1] && newStart <= duration) {
                              handleRangeChange([newStart, range[1]])
                            }
                          }}
                          className="bg-zinc-800 border-zinc-700 text-zinc-100 focus:ring-amber-500 focus:border-amber-500 transition-all duration-200"
                          step="0.1"
                          min="0"
                          max={duration > 0 ? (range[1] - 0.1).toFixed(1) : "0"}
                        />
                      </div>
                      <div className="space-y-2">
                        <label htmlFor="end" className="block text-sm font-medium text-zinc-300">
                          End Time (seconds)
                        </label>
                        <Input
                          id="end"
                          type="number"
                          value={range[1].toFixed(1)}
                          onChange={(e) => {
                            const newEnd = Number(e.target.value)
                            if (!isNaN(newEnd) && newEnd > range[0] && newEnd <= duration) {
                              handleRangeChange([range[0], newEnd])
                            }
                          }}
                          className="bg-zinc-800 border-zinc-700 text-zinc-100 focus:ring-amber-500 focus:border-amber-500 transition-all duration-200"
                          step="0.1"
                          min={duration > 0 ? (range[0] + 0.1).toFixed(1) : "0"}
                          max={duration.toFixed(1)}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="quality" className="block text-sm font-medium text-zinc-300">
                        Output Quality
                      </label>
                      <Select value={quality} onValueChange={setQuality}>
                        <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-100 focus:ring-amber-500 focus:border-amber-500">
                          <SelectValue placeholder="Select quality" />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-800 border-zinc-700">
                          <SelectItem value="1080p">1080p (Full HD)</SelectItem>
                          <SelectItem value="720p">720p (HD)</SelectItem>
                          <SelectItem value="480p">480p (SD)</SelectItem>
                          <SelectItem value="360p">360p</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <Button
                      onClick={handleClip}
                      disabled={loading || !isVideoLoaded}
                      className="w-full bg-amber-600 hover:bg-amber-700 text-zinc-100 disabled:opacity-50 transition-all duration-200 shadow-md"
                    >
                      {loading ? (
                        <span className="flex items-center justify-center">
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          {progress.download ? (
                            <span>Downloading: {progress.download}</span>
                          ) : progress.clip ? (
                            <span>Clipping: {progress.clip}</span>
                          ) : (
                            "Processing..."
                          )}
                        </span>
                      ) : (
                        "Create Clip"
                      )}
                    </Button>

                    {loading && (
                      <div className="mt-4 space-y-2">
                        {progress.download && (
                          <div className="text-sm text-zinc-400">
                            Download Progress: {progress.download}
                          </div>
                        )}
                        {progress.clip && (
                          <div className="text-sm text-zinc-400">
                            Clipping Progress: {progress.clip}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {videoUrl && (
              <div className="mt-8 space-y-6 animate-fade-in">
                <div className="aspect-video bg-black rounded-md overflow-hidden border border-zinc-800 shadow-md">
                  <video src={videoUrl} controls className="w-full h-full" />
                </div>
                <Button
                  asChild
                  className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-100 transition-all duration-200 shadow-md"
                >
                  <a href={videoUrl} download="clip.mp4" className="flex items-center justify-center">
                    <Download className="mr-2 h-5 w-5" />
                    Download Clip
                  </a>
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}