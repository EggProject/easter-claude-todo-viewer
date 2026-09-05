import { vi, beforeEach } from 'vitest';

// DOMMatrix mock
class DOMMatrixMock {
  constructor(init) {
    this.a = 1;
    this.b = 0;
    this.c = 0;
    this.d = 1;
    this.e = 0;
    this.f = 0;
    this.m11 = 1;
    this.m12 = 0;
    this.m13 = 0;
    this.m14 = 0;
    this.m21 = 0;
    this.m22 = 1;
    this.m23 = 0;
    this.m24 = 0;
    this.m31 = 0;
    this.m32 = 0;
    this.m33 = 1;
    this.m34 = 0;
    this.m41 = 0;
    this.m42 = 0;
    this.m43 = 0;
    this.m44 = 1;
    this.is2D = true;
    this.isIdentity = true;

    if (Array.isArray(init)) {
      if (init.length === 6) {
        this.a = this.m11 = init[0];
        this.b = this.m12 = init[1];
        this.c = this.m21 = init[2];
        this.d = this.m22 = init[3];
        this.e = this.m41 = init[4];
        this.f = this.m42 = init[5];
      } else if (init.length === 16) {
        this.m11 = this.a = init[0];
        this.m12 = this.b = init[1];
        this.m13 = init[2];
        this.m14 = init[3];
        this.m21 = this.c = init[4];
        this.m22 = this.d = init[5];
        this.m23 = init[6];
        this.m24 = init[7];
        this.m31 = init[8];
        this.m32 = init[9];
        this.m33 = init[10];
        this.m34 = init[11];
        this.m41 = this.e = init[12];
        this.m42 = this.f = init[13];
        this.m43 = init[14];
        this.m44 = init[15];
        this.is2D = false;
      }
    }
  }

  translate(tx = 0, ty = 0) {
    return new DOMMatrixMock([this.a, this.b, this.c, this.d, this.e + tx, this.f + ty]);
  }

  scale(sx = 1, sy = sx) {
    return new DOMMatrixMock([this.a * sx, this.b * sx, this.c * sy, this.d * sy, this.e, this.f]);
  }

  inverse() {
    return new DOMMatrixMock();
  }

  transformPoint(point = {}) {
    return {
      x: (point.x || 0) * this.a + (point.y || 0) * this.c + this.e,
      y: (point.x || 0) * this.b + (point.y || 0) * this.d + this.f,
      z: point.z || 0,
      w: point.w || 1,
    };
  }

  multiply() {
    return new DOMMatrixMock();
  }

  toString() {
    return `matrix(${this.a}, ${this.b}, ${this.c}, ${this.d}, ${this.e}, ${this.f})`;
  }
}

globalThis.DOMMatrix = DOMMatrixMock;
globalThis.DOMMatrixReadOnly = DOMMatrixMock;
if (typeof window !== 'undefined') {
  window.DOMMatrix = DOMMatrixMock;
  window.DOMMatrixReadOnly = DOMMatrixMock;
}

// DOMRect mock
class DOMRectMock {
  constructor(x = 0, y = 0, width = 0, height = 0) {
    this.x = Number(x) || 0;
    this.y = Number(y) || 0;
    this.width = Number(width) || 0;
    this.height = Number(height) || 0;
    this.top = this.y;
    this.left = this.x;
    this.right = this.x + this.width;
    this.bottom = this.y + this.height;
  }

  static fromRect(other = {}) {
    return new DOMRectMock(other.x, other.y, other.width, other.height);
  }

  toJSON() {
    return {
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height,
      top: this.top,
      right: this.right,
      bottom: this.bottom,
      left: this.left,
    };
  }
}

if (typeof globalThis.DOMRect === 'undefined') {
  globalThis.DOMRect = DOMRectMock;
}
if (!globalThis.DOMRect.fromRect) {
  globalThis.DOMRect.fromRect = DOMRectMock.fromRect;
}
if (typeof window !== 'undefined') {
  if (typeof window.DOMRect === 'undefined') {
    window.DOMRect = DOMRectMock;
  }
  if (!window.DOMRect.fromRect) {
    window.DOMRect.fromRect = DOMRectMock.fromRect;
  }
}

// ResizeObserver mock
class ResizeObserverMock {
  constructor(callback) {
    this.callback = callback;
    this.observedElements = new Set();
  }

  observe(element, options) {
    this.observedElements.add(element);
  }

  unobserve(element) {
    this.observedElements.delete(element);
  }

  disconnect() {
    this.observedElements.clear();
  }
}

globalThis.ResizeObserver = ResizeObserverMock;
if (typeof window !== 'undefined') {
  window.ResizeObserver = ResizeObserverMock;
}

// EventSource mock
class EventSourceMock {
  static instances = [];

  constructor(url) {
    this.url = url;
    this.readyState = 0;
    this.listeners = new Map();
    this.onopen = null;
    this.onerror = null;
    this.onmessage = null;
    EventSourceMock.instances.push(this);

    setTimeout(() => {
      if (this.readyState === 0) {
        this.readyState = 1;
        if (typeof this.onopen === 'function') {
          this.onopen(new Event('open'));
        }
      }
    }, 0);
  }

  addEventListener(type, listener) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type).add(listener);
  }

  removeEventListener(type, listener) {
    if (this.listeners.has(type)) {
      this.listeners.get(type).delete(listener);
    }
  }

  dispatchEvent(event) {
    const type = event?.type;
    if (this.listeners.has(type)) {
      for (const listener of this.listeners.get(type)) {
        listener(event);
      }
    }
    if (type === 'message' && typeof this.onmessage === 'function') {
      this.onmessage(event);
    }
    return true;
  }

  emit(type, data) {
    const event = new Event(type);
    event.data = typeof data === 'string' ? data : JSON.stringify(data);
    this.dispatchEvent(event);
  }

  close() {
    this.readyState = 2;
  }
}

EventSourceMock.CONNECTING = 0;
EventSourceMock.OPEN = 1;
EventSourceMock.CLOSED = 2;

globalThis.EventSource = EventSourceMock;
if (typeof window !== 'undefined') {
  window.EventSource = EventSourceMock;
}

// localStorage mock
class LocalStorageMock {
  constructor() {
    this.store = {};
  }

  getItem(key) {
    return Object.prototype.hasOwnProperty.call(this.store, key) ? this.store[key] : null;
  }

  setItem(key, value) {
    this.store[key] = String(value);
  }

  removeItem(key) {
    delete this.store[key];
  }

  clear() {
    this.store = {};
  }

  key(index) {
    const keys = Object.keys(this.store);
    return keys[index] || null;
  }

  get length() {
    return Object.keys(this.store).length;
  }
}

const localStorageInstance = new LocalStorageMock();
Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageInstance,
  writable: true,
  configurable: true,
});
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'localStorage', {
    value: localStorageInstance,
    writable: true,
    configurable: true,
  });
}

// fetch stub
const defaultFetchResponse = {
  ok: true,
  status: 200,
  statusText: 'OK',
  headers: new Headers(),
  json: async () => ({}),
  text: async () => '',
  blob: async () => new Blob(),
  arrayBuffer: async () => new ArrayBuffer(0),
};

const fetchStub = vi.fn(async () => ({ ...defaultFetchResponse }));
globalThis.fetch = fetchStub;
if (typeof window !== 'undefined') {
  window.fetch = fetchStub;
}

// Additional helpers
if (typeof window !== 'undefined') {
  if (!window.CLAUDE_TODOS_API_BASE) {
    window.CLAUDE_TODOS_API_BASE = 'http://127.0.0.1:8765';
  }
  window.scrollTo = window.scrollTo || vi.fn();
}

if (typeof Element !== 'undefined' && !Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = vi.fn();
}

beforeEach(() => {
  localStorageInstance.clear();
  EventSourceMock.instances = [];
  fetchStub.mockClear();
  fetchStub.mockImplementation(async () => ({ ...defaultFetchResponse }));
});

export {
  DOMMatrixMock,
  DOMRectMock,
  ResizeObserverMock,
  EventSourceMock,
  LocalStorageMock,
  fetchStub,
};
