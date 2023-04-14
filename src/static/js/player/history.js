class History {
    /** @type {Track} */
    currentlyPlayingTrack;
    /** @type {boolean} */
    hasScrobbled;
    /** @type {number} */
    playCounter;
    /** @type {number} */
    requiredPlayingCounter;
    /** @type {number} */
    startTimestamp;

    constructor() {
        this.currentlyPlayingTrack = null;

        eventBus.subscribe(MusicEvent.TRACK_CHANGE, () => this.signalNewTrack());
    }

    signalNewTrack() {
        const track = queue.currentTrack.track();
        if (track === null) {
            console.warn('history | missing track info');
            this.currentlyPlayingTrack = false;
            return;
        }
        console.debug('history | track changed');
        this.currentlyPlayingTrack = track;
        this.hasScrobbled = false;
        this.playingCounter = 0;
        // last.fm requires track to be played for half its duration or for 4 minutes (whichever is less)
        this.requiredPlayingCounter = Math.min(4*60, Math.round(track.duration / 2));
        this.startTimestamp = Math.floor((new Date()).getTime() / 1000);
    }

    async update() {
        if (this.currentlyPlayingTrack === null) {
            console.debug('history | no current track');
            return;
        }

        const audioElem = getAudioElement();

        if (audioElem.paused) {
            console.debug('history | audio element paused');
            return;
        }

        this.playingCounter++;

        console.debug('history | playing, counter:', this.playingCounter, '/', this.requiredPlayingCounter);

        if (!this.hasScrobbled && this.playingCounter > this.requiredPlayingCounter) {
            console.info('history | played');
            this.hasScrobbled = true;
            await this.scrobble();
        }
    }

    async updateNowPlaying() {
        const audio = getAudioElement();
        const data = {
            track: this.currentlyPlayingTrack.path,
            paused: audio.paused,
            progress: Math.floor(audio.currentTime),
        };
        await jsonPost('/now_playing', data);
    }

    async scrobble() {
        const data = {
            track: this.currentlyPlayingTrack.path,
            playlist: this.currentlyPlayingTrack.playlistName,
            startTimestamp: this.startTimestamp,
            lastfmEligible: this.currentlyPlayingTrack.duration > 30, // last.fm requires track to be at least 30 seconds
        }
        await jsonPost('/history_played', data);
    }
}

const history = new History();

document.addEventListener('DOMContentLoaded', () => {
    setInterval(() => history.update(), 1_000);

    // If you modify the interval, also modify route_history() in app.py
    setInterval(() => history.updateNowPlaying(), 10_000);
});
