// Ensures combined height of album cover and lyrics box never exceed 100vh

document.addEventListener('DOMContentLoaded', () => {
    const lyricsBox = document.getElementById('lyrics-box');
    const coverBox = document.getElementById('album-cover-box');
    const body = document.getElementsByTagName("body")[0];

    function setMaxHeight(value) {
        coverBox.style.maxHeight = value;
        coverBox.style.maxWidth = value;
        lyricsBox.style.maxWidth = value;
        console.debug('coversize: max height changed:', value);
    }

    let lastHeightLyrics = 0;
    let lastHeightBody = 0;
    function resizeCover() {
        if (lyricsBox.clientHeight == lastHeightLyrics && body.clientHeight == lastHeightBody) {
            return;
        }
        lastHeightLyrics = lyricsBox.clientHeight;
        lastHeightBody = body.clientHeight;

        // Do not set max height in single column interface
        if (body.clientHeight <= 950) {
            setMaxHeight('none');
            return;
        }

        if (lyricsBox.classList.contains('hidden')) {
            // No lyrics
            setMaxHeight(`calc(100vh - 2*var(--gap))`);
            return;
        }

        setMaxHeight(`calc(100vh - 3*var(--gap) - ${lyricsBox.clientHeight}px)`);
    }

    const resizeObserver = new ResizeObserver(resizeCover);
    resizeObserver.observe(lyricsBox);
    resizeObserver.observe(body);
});
