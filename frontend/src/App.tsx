import ClipForm from "./components/ClipForm";
import { Github, Scissors, Sparkles } from "lucide-react";

function App() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(245,158,11,0.15),transparent_50%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(245,158,11,0.05),transparent_50%)] pointer-events-none" />
      
      <header className="border-b border-zinc-800/50 backdrop-blur-sm bg-zinc-950/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3 group">
              <div className="relative">
                <Scissors className="w-6 h-6 text-amber-500 group-hover:rotate-12 transition-transform duration-300" />
                <Sparkles className="w-3 h-3 text-amber-500 absolute -top-1 -right-1 animate-pulse" />
              </div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 bg-clip-text text-transparent group-hover:scale-105 transition-transform duration-300">
                YouTube Clipper
              </h1>
            </div>
            <a
              href="https://github.com/tsahil01/yt-clipper"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 text-zinc-300 hover:text-amber-500 transition-all duration-200 hover:shadow-lg hover:shadow-amber-500/10"
            >
              <Github className="w-5 h-5 group-hover:scale-110 transition-transform" />
              <span className="font-medium">Star on GitHub</span>
            </a>
          </div>
        </div>
      </header>
      <main className="relative">
        <ClipForm />
      </main>
    </div>
  );
}

export default App;
