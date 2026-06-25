/**
 * Pixlated Shared Utilities
 */

const NOISE_TILE_SIZE = 256;

let sharedNoiseTile = null;

/**
 * Clamp intensity value to valid range [0, 1].
 * Returns defaultValue for null, undefined, or NaN inputs.
 * @param {number} value 
 * @param {number} [defaultValue=0.1] 
 * @returns {number} 
 */
export function clampIntensity(value, defaultValue = 0.1) {
    if (value === null || value === undefined || isNaN(value)) {
        return defaultValue;
    }
    if (value < 0) return 0;
    if (value > 1) return 1;
    return value;
}

/**
 * Generate a square noise tile of pre-computed random values.
 * @param {number} [size=256]
 * @returns {{ data: Float32Array, size: number }}
 */
export function generateNoiseTile(size = NOISE_TILE_SIZE) {
    const length = size * size;
    const noise = new Float32Array(length);
    for (let i = 0; i < length; i++) {
        noise[i] = (Math.random() - 0.5) * 255;
    }
    return { data: noise, size };
}

/**
 * @returns {{ data: Float32Array, size: number }} 
 */
export function getNoiseTile() {
    if (!sharedNoiseTile) {
        sharedNoiseTile = generateNoiseTile(NOISE_TILE_SIZE);
    }
    return sharedNoiseTile;
}

/**
 * @returns {{ data: Float32Array, size: number }}
 */
export function refreshNoiseTile() {
    sharedNoiseTile = generateNoiseTile(NOISE_TILE_SIZE);
    return sharedNoiseTile;
}

/**
 * @param {ImageData} imageData 
 * @param {number} intensity 
 * @returns {ImageData}
 */
export function applyNoise(imageData, intensity) {
    const data = imageData.data;
    const clampedIntensity = Math.max(0, Math.min(1, intensity));

    if (clampedIntensity === 0) return imageData;

    const noiseTile = getNoiseTile();
    const tileData = noiseTile.data;
    const tileSize = noiseTile.size;
    const width = imageData.width;

    for (let i = 0; i < data.length; i += 4) {
        const pixelIndex = i >> 2;
        const x = pixelIndex % width;
        const y = (pixelIndex / width) | 0;
        const tileIndex = (y % tileSize) * tileSize + (x % tileSize);

        const noise = tileData[tileIndex] * clampedIntensity;
        data[i] += noise;
        data[i + 1] += noise;
        data[i + 2] += noise;
    }

    return imageData;
}
