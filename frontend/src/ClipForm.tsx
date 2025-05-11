import React, { useState } from "react";

export default function ClipForm() {
  const [url, setUrl] = useState("");
  const [start, setStart] = useState(0);
  const [end, setEnd] = useState(10);
  const [loading, setLoading] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  const handleClip = async () => {
    setLoading(true);
    setVideoUrl(null);

    const res = await fetch("http://localhost:3001/clip", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, start, end }),
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
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-lg shadow-xl p-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
            YouTube Video Clipper
          </h2>
          
          <div className="space-y-6">
            <div>
              <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-2">
                YouTube URL
              </label>
              <input
                id="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="start" className="block text-sm font-medium text-gray-700 mb-2">
                  Start Time (seconds)
                </label>
                <input
                  id="start"
                  type="number"
                  value={start}
                  onChange={(e) => setStart(Number(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label htmlFor="end" className="block text-sm font-medium text-gray-700 mb-2">
                  End Time (seconds)
                </label>
                <input
                  id="end"
                  type="number"
                  value={end}
                  onChange={(e) => setEnd(Number(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <button
              onClick={handleClip}
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
            >
              {loading ? "Processing..." : "Create Clip"}
            </button>

            {loading && (
              <div className="mt-6">
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div className="bg-blue-600 h-2.5 rounded-full animate-progress"></div>
                </div>
                <style>
                  {`
                    @keyframes progress {
                      0% { width: 0% }
                      100% { width: 100% }
                    }
                    .animate-progress {
                      animation: progress 2s linear infinite;
                    }
                  `}
                </style>
              </div>
            )}

            {videoUrl && (
              <div className="mt-8 space-y-4">
                <div className="aspect-video bg-black rounded-lg overflow-hidden">
                  <video src={videoUrl} controls className="w-full h-full" />
                </div>
                <a
                  href={videoUrl}
                  download="clip.mp4"
                  className="block w-full text-center bg-green-600 text-white py-3 px-4 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors duration-200"
                >
                  Download Clip
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
