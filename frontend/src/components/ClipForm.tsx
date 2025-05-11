import { useState, useRef, useEffect } from "react";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Play, Pause, Loader2 } from "lucide-react";
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
  
  const playerRef = useRef<YTPlayer | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | undefined>(undefined);

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

    const res = await fetch("http://localhost:3001/clip", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        url: `https://www.youtube.com/watch?v=${youtubeId}`, 
        start: range[0], 
        end: range[1] 
      }),
    });

    if (res.ok) {
      const blob = await res.blob();
      const localUrl = URL.createObjectURL(blob);
      setVideoUrl(localUrl);
    } else {
      alert("Failed to clip video.");
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-slate-900 rounded-lg shadow-xl p-8">
          <h2 className="text-3xl font-bold text-slate-50 mb-8 text-center">
            YouTube Video Clipper
          </h2>
          
          <div className="space-y-6">
            <div className="flex space-x-2">
              <Input
                id="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                className="bg-slate-800 border-slate-700 text-slate-50"
              />
              <Button 
                onClick={loadVideo}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Load Video
              </Button>
            </div>

            {youtubeId && (
              <div className="space-y-6">
                <div className="aspect-video bg-black rounded-lg overflow-hidden relative">
                  <div id="youtube-player" className="w-full h-full"></div>
                  {!isVideoLoaded && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Loader2 className="w-12 h-12 animate-spin text-blue-500" />
                    </div>
                  )}
                  
                  {isVideoLoaded && (
                    <div className="absolute bottom-4 left-4">
                      <Button 
                        size="icon" 
                        onClick={togglePlay} 
                        className="bg-blue-600 hover:bg-blue-700 rounded-full"
                      >
                        {isPlaying ? <Pause size={20} /> : <Play size={20} />}
                      </Button>
                    </div>
                  )}
                </div>
                
                {isVideoLoaded && (
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm text-slate-400">
                        <span>Clip Range: {formatTime(range[0])} - {formatTime(range[1])}</span>
                        <span>Duration: {formatTime(range[1] - range[0])}</span>
                      </div>
                      
                      
                      <div className="w-full bg-slate-800 h-1 relative">
                        <div 
                          className="absolute h-1 bg-blue-600" 
                          style={{
                            left: `${duration > 0 ? (range[0] / duration) * 100 : 0}%`,
                            width: `${duration > 0 ? ((range[1] - range[0]) / duration) * 100 : 0}%`
                          }}
                        />
                        <div 
                          className="absolute w-2 h-4 bg-blue-500 rounded-sm -mt-1.5" 
                          style={{ left: `${duration > 0 && currentTime !== null ? (currentTime / duration) * 100 : 0}%` }}
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
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="start" className="block text-sm font-medium text-slate-400 mb-2">
                          Start Time (seconds)
                        </label>
                        <Input
                          id="start"
                          type="number"
                          value={range[0].toFixed(1)}
                          onChange={(e) => {
                            const newStart = Number(e.target.value);
                            if (!isNaN(newStart) && newStart >= 0 && newStart < range[1] && newStart <= duration) {
                              handleRangeChange([newStart, range[1]]);
                            }
                          }}
                          className="bg-slate-800 border-slate-700 text-slate-50"
                          step="0.1"
                          min="0"
                          max={duration > 0 ? (range[1] - 0.1).toFixed(1) : "0"} // Prevent negative max
                        />
                      </div>
                      <div>
                        <label htmlFor="end" className="block text-sm font-medium text-slate-400 mb-2">
                          End Time (seconds)
                        </label>
                        <Input
                          id="end"
                          type="number"
                          value={range[1].toFixed(1)}
                          onChange={(e) => {
                            const newEnd = Number(e.target.value);
                            if (!isNaN(newEnd) && newEnd > range[0] && newEnd <= duration) {
                              handleRangeChange([range[0], newEnd]);
                            }
                          }}
                          className="bg-slate-800 border-slate-700 text-slate-50"
                          step="0.1"
                          min={duration > 0 ? (range[0] + 0.1).toFixed(1) : "0"} // Prevent impossible min
                          max={duration.toFixed(1)}
                        />
                      </div>
                    </div>

                    <Button
                      onClick={handleClip}
                      disabled={loading || !isVideoLoaded}
                      className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                    >
                      {loading ? (
                        <span className="flex items-center">
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Processing...
                        </span>
                      ) : (
                        "Create Clip"
                      )}
                    </Button>
                  </div>
                )}
              </div>
            )}

            {videoUrl && (
              <div className="mt-8 space-y-4">
                <div className="aspect-video bg-black rounded-lg overflow-hidden">
                  <video src={videoUrl} controls className="w-full h-full" />
                </div>
                <Button
                  asChild
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  <a href={videoUrl} download="clip.mp4">Download Clip</a>
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}