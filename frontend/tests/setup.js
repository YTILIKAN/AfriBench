// Setup Vitest/jsdom : stubs des APIs navigateur absentes de jsdom.

if (!('IntersectionObserver' in globalThis)) {
  globalThis.IntersectionObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

if (!('matchMedia' in globalThis)) {
  globalThis.matchMedia = (query) => ({
    matches: false,
    media: query,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
  });
}

// Chart.js en a besoin dès l'instanciation ; jsdom ne le fournit pas, ce qui
// rendait tout test de graphique impossible.
if (!('ResizeObserver' in globalThis)) {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

// jsdom expose bien getContext, mais l'implémentation lève « Not implemented ».
// On la remplace donc inconditionnellement par un contexte factice : suffisant
// pour que Chart.js s'initialise et expose sa configuration, sans rendu réel.
HTMLCanvasElement.prototype.getContext = function getContextStub() {
  const canvas = this;
  return {
    canvas,
    save() {}, restore() {}, beginPath() {}, closePath() {},
    moveTo() {}, lineTo() {}, arc() {}, arcTo() {}, ellipse() {},
    fill() {}, stroke() {}, clip() {}, drawImage() {},
    translate() {}, rotate() {}, scale() {}, transform() {}, setTransform() {},
    resetTransform() {}, setLineDash() {}, getLineDash: () => [],
    clearRect() {}, fillRect() {}, strokeRect() {}, rect() {}, roundRect() {},
    fillText() {}, strokeText() {},
    bezierCurveTo() {}, quadraticCurveTo() {}, closePath2() {},
    createLinearGradient: () => ({ addColorStop() {} }),
    createRadialGradient: () => ({ addColorStop() {} }),
    createPattern: () => null,
    measureText: (text) => ({ width: String(text).length * 6, actualBoundingBoxAscent: 8 }),
    getImageData: () => ({ data: new Uint8ClampedArray(4) }),
    putImageData() {},
  };
};

if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}
