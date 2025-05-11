declare global {
    interface Window {
        YT: {
            Player: new (divId: string, options: object) => YTPlayer;
            PlayerState: {
                PLAYING: number;
                PAUSED: number;
                ENDED: number;
                BUFFERING: number;
                CUED: number;
                UNSTARTED: number;
            };
        };
        onYouTubeIframeAPIReady?: () => void;
    }
}

export interface YTPlayer {
    destroy: () => void;
    playVideo: () => void;
    pauseVideo: () => void;
    seekTo: (seconds: number, allowSeekAhead?: boolean) => void;
    getDuration: () => number;
    getCurrentTime: () => number;
    getPlayerState: () => number;
}