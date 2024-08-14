// https://blog.logrocket.com/audio-visualizer-from-scratch-javascript/
class Visualiser {
    // Settings
    barWidth = 10;
    bassFreq = 50;
    minFreq = 50;
    maxFreq = 14000;
    xToFreqExp = 2;
    bassScaleAmount = 0.1;
    bassScaleEnabled = false;

    /** @type {Uint8Array} */
    #dataArray;
    /** @type {HTMLCanvasElement} */
    #canvas;

    constructor() {
        this.#canvas = document.getElementById('visualiser');
        this.#dataArray = new Uint8Array(audioContextManager.fftSize);
    }

    start() {
        this.#draw();
    }

    #draw() {
        if (!audioContextManager.analyser || document.visibilityState == "hidden") {
            setTimeout(() => this.#draw(), 100);
            return;
        }

        const height = this.#canvas.clientHeight;
        const width = this.#canvas.clientWidth;

        this.#canvas.height = height;
        this.#canvas.width = width;

        const draw = this.#canvas.getContext('2d');

        draw.clearRect(0, 0, height, width);
        draw.fillStyle = "white";

        if (getAudioElement().paused) {
            setTimeout(() => this.#draw(), 100);
            return;
        }

        audioContextManager.analyser.getByteFrequencyData(this.#dataArray);

        const minBin = this.minFreq / 48000 * audioContextManager.fftSize;
        const maxBin = this.maxFreq / 48000 * audioContextManager.fftSize;
        const multiplyX = (maxBin - minBin);

        for (let x = 0; x < width; x += this.barWidth) {
            const i = Math.floor((x / width)**this.xToFreqExp * multiplyX + minBin);
            const barHeight = this.#dataArray[i] * height / 256;
            draw.fillRect(x, height - barHeight, this.barWidth, barHeight);
        }

        if (this.bassScaleEnabled) {
            const bassIndex = Math.floor(this.bassFreq / 48000 * audioContextManager.fftSize);
            const bassAmount = this.#dataArray[bassIndex] / 256;
            document.getElementsByTagName('body')[0].style.scale = 1 + bassAmount * this.bassScaleAmount;
        }

        requestAnimationFrame(() => this.#draw());
    }

}

const visualiser = new Visualiser();

document.addEventListener('DOMContentLoaded', () => {
    // visualiser.start();
});
