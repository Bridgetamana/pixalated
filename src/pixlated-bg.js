/**
 * Pixlated Background Web Component
 * Adds film grain and noise textures to backgrounds using Canvas API
 */

import { applyNoise, clampIntensity } from './utils.js';

class PixlatedBg extends HTMLElement {
    static DEBUG = false;

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });

        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });

        if (!this.ctx) {
            console.error('<pixlated-bg>: Canvas 2D context not supported');
            return;
        }

        this._resizeRAF = null;
        this._noiseOffsetX = 0;
        this._noiseOffsetY = 0;
        this._isAnimating = false;
        this._animationFrame = null;
        this._lastFrameTime = 0;

        this.styleEl = document.createElement('style');
        this.styleEl.textContent = `
      :host {
        display: block;
        position: relative;
        overflow: hidden;
      }
      canvas {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      .content {
        position: relative;
        z-index: 1;
      }
    `;

        this.contentSlot = document.createElement('div');
        this.contentSlot.className = 'content';
        this.contentSlot.innerHTML = '<slot></slot>';

        this.shadowRoot.append(this.styleEl, this.canvas, this.contentSlot);
    }

    static get observedAttributes() {
        return ['color', 'intensity', 'width', 'height', 'animated'];
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue === newValue) return;

        switch (name) {
            case 'color':
            case 'intensity':
                if (this.isConnected) this.drawGrainyBackground();
                break;
            case 'width':
            case 'height':
                this.updateCanvasSize();
                if (this.isConnected) this.drawGrainyBackground();
                break;
            case 'animated':
                if (newValue !== null) {
                    this._startAnimation();
                } else {
                    this._stopAnimation();
                    this._noiseOffsetX = 0;
                    this._noiseOffsetY = 0;
                    if (this.isConnected) this.drawGrainyBackground();
                }
                break;
        }
    }

    connectedCallback() {
        this.updateCanvasSize();
        this.drawGrainyBackground();

        this.resizeObserver = new ResizeObserver(() => {
            if (this._resizeRAF) cancelAnimationFrame(this._resizeRAF);
            this._resizeRAF = requestAnimationFrame(() => {
                this.updateCanvasSize();
                this.drawGrainyBackground();
                this._resizeRAF = null;
            });
        });
        this.resizeObserver.observe(this);

        if (this.hasAttribute('animated')) {
            this._startAnimation();
        }
    }

    disconnectedCallback() {
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
        }
        if (this._resizeRAF) {
            cancelAnimationFrame(this._resizeRAF);
            this._resizeRAF = null;
        }
        this._stopAnimation();
    }

    updateCanvasSize() {
        const width = this.getAttribute('width');
        const height = this.getAttribute('height');

        this.ctx.setTransform(1, 0, 0, 1, 0, 0);

        if (width && height) {
            const w = parseInt(width, 10);
            const h = parseInt(height, 10);
            const dpr = window.devicePixelRatio || 1;

            this.canvas.width = w * dpr;
            this.canvas.height = h * dpr;
            this.canvas.style.width = `${w}px`;
            this.canvas.style.height = `${h}px`;
            this.ctx.scale(dpr, dpr);
        } else {
            const rect = this.getBoundingClientRect();
            const dpr = window.devicePixelRatio || 1;

            this.canvas.width = rect.width * dpr;
            this.canvas.height = rect.height * dpr;
            this.ctx.scale(dpr, dpr);
        }
    }

    drawGrainyBackground() {
        if (!this.ctx) return;

        const color = this.getAttribute('color') || '#09090b';
        const rawIntensity = parseFloat(this.getAttribute('intensity'));
        const intensity = clampIntensity(rawIntensity, 0.1);

        const canvasWidth = this.canvas.width;
        const canvasHeight = this.canvas.height;

        this.ctx.fillStyle = color;
        this.ctx.fillRect(0, 0, canvasWidth, canvasHeight);

        if (intensity > 0) {
            const imageData = this.ctx.getImageData(0, 0, canvasWidth, canvasHeight);
            applyNoise(imageData, intensity, this._noiseOffsetX, this._noiseOffsetY);
            this.ctx.putImageData(imageData, 0, 0);
        }
    }

    reload() {
        this.drawGrainyBackground();
    }

    _startAnimation() {
        if (this._isAnimating) return;
        this._isAnimating = true;
        this._lastFrameTime = performance.now();
        
        this._animationLoop = (timestamp) => {
            if (!this._isAnimating) return;
            
            if (timestamp - this._lastFrameTime >= 80) {
                this._noiseOffsetX = Math.floor(Math.random() * 256);
                this._noiseOffsetY = Math.floor(Math.random() * 256);
                this.drawGrainyBackground();
                this._lastFrameTime = timestamp;
            }
            this._animationFrame = requestAnimationFrame(this._animationLoop);
        };
        this._animationFrame = requestAnimationFrame(this._animationLoop);
    }

    _stopAnimation() {
        this._isAnimating = false;
        if (this._animationFrame) {
            cancelAnimationFrame(this._animationFrame);
            this._animationFrame = null;
        }
    }

    getConfig() {
        const rawIntensity = parseFloat(this.getAttribute('intensity'));
        return {
            color: this.getAttribute('color') || '#09090b',
            intensity: clampIntensity(rawIntensity, 0.1),
            width: this.canvas.width,
            height: this.canvas.height
        };
    }
}

customElements.define('pixlated-bg', PixlatedBg);
