export interface SpotifyPlayerState {
    songTitle: string | undefined
    artist: string | undefined
    isPlaying: boolean
    position_ms: number
    duration_ms: number
}

