// Common JavaScript interface to API, to be used by the music player and other pages.
// Scripts using this API must implement a getCsrfToken() function that returns a usable CSRF token as a string.

class Music {
    /**
     * @returns {Promise<Array<Playlist>>}
     */
    async playlists() {
        const response = await fetch('/playlists/list');
        checkResponseCode(response);
        const json = await response.json();
        const playlists = [];
        for (const playlistObj of json) {
            playlists.push(new Playlist(playlistObj));
        }
        return playlists;
    }

    /**
     * @param {string} name
     * @returns {Promise<Playlist>}
     */
    async playlist(name) {
        const response = await fetch('/playlists/list');
        checkResponseCode(response);
        const json = await response.json();
        for (const playlistObj of json) {
            if (playlistObj.name == name) {
                return new Playlist(playlistObj);
            }
        }
        return null;
    }

    /**
     * @param {object} json
     * @returns {Promise<Array<Track>>}
     */
    #tracksFromJson(json) {
        const tracks = [];
        for (const trackObj of json) {
            tracks.push(new Track(trackObj));
        }
        return tracks;
    }

    /**
     * @param {object} filters with key = playlist, artist, album_artist, album, etc.
     * @returns {Promise<Array<Track>>}
     */
    async filter(filters) {
        const encodedFilters = [];
        for (const filter in filters) {
            encodedFilters.push(filter + '=' + encodeURIComponent(filters[filter]));
        }
        const response = await fetch('/track/filter?' + encodedFilters.join('&'));
        checkResponseCode(response);
        const json = await response.json();
        return this.#tracksFromJson(json.tracks);
    }

    /**
     * @param {string} query FTS5 search query
     * @returns {Promise<Array<Track>>}
     */
    async search(query) {
        const response = await fetch('/track/search?query=' + encodeURIComponent(query));
        checkResponseCode(response);
        const json = await response.json();
        return this.#tracksFromJson(json.tracks);
    }

    /**
     * @param {string} path
     * @returns {Promise<Track>}
     */
    async track(path) {
        const response = await fetch('/track/info?path=' + encodeURIComponent(path));
        checkResponseCode(response);
        const json = await response.json();
        return new Track(json.playlist, json);
    }

    /**
     * @returns {Promise<Array<string>>}
     */
    async tags() {
        const response = await fetch('/track/tags');
        checkResponseCode(response);
        return await response.json();
    }
}

const music = new Music();

class Playlist {
    /** @type {string} */
    name;
    /** @type {number} */
    trackCount;
    /** @type {boolean} */
    favorite;
    /** @type {boolean} */
    write;

    /**
     * @param {Object.<string, string|boolean|number} objectFromApi
     */
    constructor(objectFromApi) {
        this.name = objectFromApi.name;
        this.trackCount = objectFromApi.track_count;
        this.favorite = objectFromApi.favorite;
        this.write = objectFromApi.write;
    }

    async chooseRandomTrack(requireMetadata, tagFilter) {
        const chooseResponse = await jsonPost('/track/choose', {'playlist': this.name, 'require_metadata': requireMetadata, ...tagFilter});
        const trackData = await chooseResponse.json();
        console.info('api: chosen track', trackData.path);
        return new Track(trackData);
    }
}

class Track {
    /** @type {string} */
    path;
    /** @type {string} */
    playlistName;
    /** @type {number} */
    duration;
    /** @type {Array<string>} */
    tags;
    /** @type {string | null} */
    title;
    /** @type {Array<string> | null} */
    artists;
    /** @type {string | null} */
    album;
    /** @type {string | null} */
    albumArtist;
    /** @type {number | null} */
    year;

    constructor(trackData) {
        this.path = trackData.path;
        this.playlistName = trackData.playlist;
        this.duration = trackData.duration;
        this.tags = trackData.tags;
        this.title = trackData.title;
        this.artists = trackData.artists;
        this.album = trackData.album;
        this.albumArtist = trackData.album_artist;
        this.year = trackData.year;
    };

    /**
     * Get display HTML for this track
     * @param {boolean} showPlaylist
     * @returns {HTMLSpanElement}
     */
    displayHtml(showPlaylist = false) {
        const html = document.createElement('span');
        html.classList.add('track-display-html');

        if (this.artists !== null && this.title !== null) {
            let first = true;
            for (const artist of this.artists) {
                if (first) {
                    first = false;
                } else {
                    html.append(', ');
                }

                const artistHtml = document.createElement('a');
                artistHtml.textContent = artist;
                artistHtml.onclick = () => browse.browseArtist(artist);
                html.append(artistHtml);
            }

            html.append(' - ' + this.title);
        } else {
            const span = document.createElement('span');
            span.style.color = COLOR_MISSING_METADATA;
            span.textContent = this.path.substring(this.path.indexOf('/') + 1);
            html.append(span);
        }

        const secondary = document.createElement('span');
        secondary.classList.add('secondary');
        secondary.append(document.createElement('br'));
        html.append(secondary);

        if (showPlaylist) {
            const playlistHtml = document.createElement('a');
            playlistHtml.onclick = () => browse.browsePlaylist(this.playlistName);
            playlistHtml.textContent = this.playlistName;
            secondary.append(playlistHtml);
        }

        if (this.year || this.album) {
            if (showPlaylist) {
                secondary.append(', ');
            }

            if (this.album) {
                const albumHtml = document.createElement('a');
                albumHtml.onclick = () => browse.browseAlbum(this.album, this.albumArtist);
                if (this.albumArtist) {
                    albumHtml.textContent = this.albumArtist + ' - ' + this.album;
                } else {
                    albumHtml.textContent = this.album;
                }
                secondary.append(albumHtml);
                if (this.year) {
                    secondary.append(', ');
                }
            }

            if (this.year) {
                secondary.append(this.year);
            }

        }

        return html;
    };

    /**
     * Generates display text for this track
     * @param {boolean} showPlaylist
     * @returns {string}
     */
    displayText(showPlaylist = false, showAlbum = false) {
        let text = '';

        if (showPlaylist) {
            text += `${this.playlistName}: `
        }

        if (this.artists !== null && this.title !== null) {
            text += this.artists.join(', ');
            text += ' - ';
            text += this.title;
        } else {
            text += this.path.substring(this.path.indexOf('/') + 1);
        }

        if (this.album && showAlbum) {
            text += ` (${this.album}`;
            if (this.year) {
                text += `, ${this.year})`;
            } else {
                text += ')';
            }
        } else if (this.year) {
            text += ` (${this.year})`;
        }

        return text;
    };

    /**
     * @param {string} audioType
     * @param {boolean} stream
     * @returns {Promise<string>} URL
     */
    async getAudio(audioType, stream) {
        const audioUrl = `/track/audio?path=${encodeURIComponent(this.path)}&type=${audioType}`;
        if (stream) {
            return audioUrl;
        } else {
            const trackResponse = await fetch(audioUrl);
            checkResponseCode(trackResponse);
            const audioBlob = await trackResponse.blob();
            console.debug('track: downloaded audio', audioUrl);
            return URL.createObjectURL(audioBlob);
        }
    }

    /**
     *
     * @param {string} imageQuality 'low' or 'high'
     * @param {boolean} stream
     * @param {boolean} memeCover
     * @returns {Promise<string>} URL
     */
    async getCover(imageQuality, stream, memeCover) {
        const imageUrl = `/track/album_cover?path=${encodeURIComponent(this.path)}&quality=${imageQuality}&meme=${memeCover ? 1 : 0}`;
        if (stream) {
            return imageUrl;
        } else {
            const coverResponse = await fetch(imageUrl);
            checkResponseCode(coverResponse);
            const imageBlob = await coverResponse.blob();
            console.debug('track: downloaded image', imageUrl);
            return URL.createObjectURL(imageBlob);
        }
    }

    /**
     * @returns {Promise<Lyrics|null>}
     */
    async getLyrics() {
        const lyricsUrl = `/track/lyrics?path=${encodeURIComponent(this.path)}`;
        const lyricsResponse = await fetch(lyricsUrl);
        checkResponseCode(lyricsResponse);
        const lyricsJson = await lyricsResponse.json();
        console.debug('track: downloaded lyrics', lyricsUrl);
        return lyricsJson.found ? new Lyrics(lyricsJson.source, lyricsJson.html) : null;
    }

    /**
     * @param {string} audioType
     * @param {boolean} stream
     * @param {boolean} memeCover
     * @returns {Promise<DownloadedTrack>}
     */
    async download(audioType, stream, memeCover) {
        // Download audio, cover, lyrics in parallel
        const promises = [
            this.getAudio(audioType, stream),
            this.getCover(audioType == 'webm_opus_low' ? 'low' : 'high', stream, memeCover),
            this.getLyrics(),
        ];
        return new DownloadedTrack(this, ...(await Promise.all(promises)));
    }

    async delete() {
        const oldName = this.path.split('/').pop();
        const newName = '.trash.' + oldName;
        await jsonPost('/files/rename', {path: this.path, new_name: newName});
    }

    async dislike() {
        jsonPost('/dislikes/add', {track: this.path});
    }

    /**
     * Updates track metadata by sending current metadata of this object to the server.
     */
    async saveMetadata() {
        const payload = {
            path: this.path,
            title: this.title,
            album: this.album,
            artists: this.artists,
            album_artist: this.albumArtist,
            tags: this.tags,
            year: this.year,
        };

        await jsonPost('/track/update_metadata', payload);
    }
}

class DownloadedTrack {
    /**
     * @type {Track|null} Null for virtual tracks, like news
     */
    track;
    /**
     * @type {string}
     */
    audioUrl;
    /**
     * @type {string}
     */
    imageUrl;
    /**
     * @type {lyrics}
     */
    lyrics;

    constructor(track, audioUrl, imageUrl, lyrics) {
        this.track = track;
        this.audioUrl = audioUrl;
        this.imageUrl = imageUrl;
        this.lyrics = lyrics;
    }

    revokeObjects() {
        console.debug('queue: revoke objects:', this.track.path);
        URL.revokeObjectURL(this.audioUrl);
        URL.revokeObjectURL(this.imageUrl);
    }
}

class Lyrics {
    /** @type {string | null} */
    source;
    /** @type {string} */
    html;
    constructor(source, html) {
        this.source = source;
        this.html = html;
    };
};

/**
 * @param {string} url
 * @param {object} postDataObject
 * @returns {Promise<Response>}
 */
async function jsonPost(url, postDataObject, checkError = true) {
    postDataObject.csrf = getCsrfToken();
    const options = {
        method: 'POST',
        body: JSON.stringify(postDataObject),
        headers: new Headers({
            'Content-Type': 'application/json'
        }),
    };
    const response = await fetch(new Request(url, options));
    if (checkError) {
        checkResponseCode(response);
    }
    return response;
}