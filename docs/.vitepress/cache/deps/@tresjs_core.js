import {
  setupDevToolsPlugin
} from "./chunk-CTB6M2YV.js";
import {
  Fragment,
  computed,
  createBlock,
  createCommentVNode,
  createElementBlock,
  createRenderer,
  defineComponent,
  getCurrentInstance,
  getCurrentScope,
  h,
  hasInjectionContext,
  inject,
  isRef,
  mergeProps,
  nextTick,
  normalizeClass,
  normalizeStyle,
  onMounted,
  onScopeDispose,
  onUnmounted,
  openBlock,
  provide,
  reactive,
  readonly,
  ref,
  renderSlot,
  shallowReadonly,
  shallowRef,
  toValue,
  unref,
  useSlots,
  watch,
  watchEffect,
  withCtx
} from "./chunk-O6EOGSKJ.js";
import {
  ACESFilmicToneMapping,
  ArrowHelper,
  BackSide,
  BufferAttribute,
  BufferGeometry,
  Clock,
  Color,
  DirectionalLightHelper,
  DoubleSide,
  Float32BufferAttribute,
  HemisphereLightHelper,
  Layers,
  Line,
  Line3,
  LineBasicMaterial,
  Material,
  MathUtils,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  Object3D,
  PCFSoftShadowMap,
  PerspectiveCamera,
  Plane,
  PointLightHelper,
  Quaternion,
  REVISION,
  Ray,
  Raycaster,
  Scene,
  Sphere,
  SphereGeometry,
  SpotLightHelper,
  Triangle,
  Vector2,
  Vector3,
  WebGLRenderer,
  three_module_exports
} from "./chunk-P7ZQBBOL.js";
import {
  __publicField
} from "./chunk-UVKRO5ER.js";

// node_modules/@tresjs/core/node_modules/@vueuse/shared/index.mjs
function tryOnScopeDispose(fn) {
  if (getCurrentScope()) {
    onScopeDispose(fn);
    return true;
  }
  return false;
}
function createEventHook() {
  const fns = /* @__PURE__ */ new Set();
  const off = (fn) => {
    fns.delete(fn);
  };
  const clear = () => {
    fns.clear();
  };
  const on = (fn) => {
    fns.add(fn);
    const offFn = () => off(fn);
    tryOnScopeDispose(offFn);
    return {
      off: offFn
    };
  };
  const trigger = (...args) => {
    return Promise.all(Array.from(fns).map((fn) => fn(...args)));
  };
  return {
    on,
    off,
    trigger,
    clear
  };
}
var localProvidedStateMap = /* @__PURE__ */ new WeakMap();
var injectLocal = (...args) => {
  var _a;
  const key = args[0];
  const instance = (_a = getCurrentInstance()) == null ? void 0 : _a.proxy;
  if (instance == null && !hasInjectionContext())
    throw new Error("injectLocal must be called in setup");
  if (instance && localProvidedStateMap.has(instance) && key in localProvidedStateMap.get(instance))
    return localProvidedStateMap.get(instance)[key];
  return inject(...args);
};
function provideLocal(key, value) {
  var _a;
  const instance = (_a = getCurrentInstance()) == null ? void 0 : _a.proxy;
  if (instance == null)
    throw new Error("provideLocal must be called in setup");
  if (!localProvidedStateMap.has(instance))
    localProvidedStateMap.set(instance, /* @__PURE__ */ Object.create(null));
  const localProvidedState = localProvidedStateMap.get(instance);
  localProvidedState[key] = value;
  return provide(key, value);
}
function createInjectionState(composable, options) {
  const key = (options == null ? void 0 : options.injectionKey) || Symbol(composable.name || "InjectionState");
  const defaultValue = options == null ? void 0 : options.defaultValue;
  const useProvidingState = (...args) => {
    const state = composable(...args);
    provideLocal(key, state);
    return state;
  };
  const useInjectedState = () => injectLocal(key, defaultValue);
  return [useProvidingState, useInjectedState];
}
var isClient = typeof window !== "undefined" && typeof document !== "undefined";
var isWorker = typeof WorkerGlobalScope !== "undefined" && globalThis instanceof WorkerGlobalScope;
var toString = Object.prototype.toString;
var isObject = (val) => toString.call(val) === "[object Object]";
var noop = () => {
};
var isIOS = getIsIOS();
function getIsIOS() {
  var _a, _b;
  return isClient && ((_a = window == null ? void 0 : window.navigator) == null ? void 0 : _a.userAgent) && (/iP(?:ad|hone|od)/.test(window.navigator.userAgent) || ((_b = window == null ? void 0 : window.navigator) == null ? void 0 : _b.maxTouchPoints) > 2 && /iPad|Macintosh/.test(window == null ? void 0 : window.navigator.userAgent));
}
function createFilterWrapper(filter, fn) {
  function wrapper(...args) {
    return new Promise((resolve2, reject) => {
      Promise.resolve(filter(() => fn.apply(this, args), { fn, thisArg: this, args })).then(resolve2).catch(reject);
    });
  }
  return wrapper;
}
function debounceFilter(ms, options = {}) {
  let timer;
  let maxTimer;
  let lastRejector = noop;
  const _clearTimeout = (timer2) => {
    clearTimeout(timer2);
    lastRejector();
    lastRejector = noop;
  };
  let lastInvoker;
  const filter = (invoke) => {
    const duration = toValue(ms);
    const maxDuration = toValue(options.maxWait);
    if (timer)
      _clearTimeout(timer);
    if (duration <= 0 || maxDuration !== void 0 && maxDuration <= 0) {
      if (maxTimer) {
        _clearTimeout(maxTimer);
        maxTimer = void 0;
      }
      return Promise.resolve(invoke());
    }
    return new Promise((resolve2, reject) => {
      lastRejector = options.rejectOnCancel ? reject : resolve2;
      lastInvoker = invoke;
      if (maxDuration && !maxTimer) {
        maxTimer = setTimeout(() => {
          if (timer)
            _clearTimeout(timer);
          maxTimer = void 0;
          resolve2(lastInvoker());
        }, maxDuration);
      }
      timer = setTimeout(() => {
        if (maxTimer)
          _clearTimeout(maxTimer);
        maxTimer = void 0;
        resolve2(invoke());
      }, duration);
    });
  };
  return filter;
}
function promiseTimeout(ms, throwOnTimeout = false, reason = "Timeout") {
  return new Promise((resolve2, reject) => {
    if (throwOnTimeout)
      setTimeout(() => reject(reason), ms);
    else
      setTimeout(resolve2, ms);
  });
}
function identity(arg) {
  return arg;
}
function pxValue(px) {
  return px.endsWith("rem") ? Number.parseFloat(px) * 16 : Number.parseFloat(px);
}
function toArray(value) {
  return Array.isArray(value) ? value : [value];
}
function cacheStringFunction(fn) {
  const cache = /* @__PURE__ */ Object.create(null);
  return (str) => {
    const hit = cache[str];
    return hit || (cache[str] = fn(str));
  };
}
var hyphenateRE = /\B([A-Z])/g;
var hyphenate = cacheStringFunction((str) => str.replace(hyphenateRE, "-$1").toLowerCase());
var camelizeRE = /-(\w)/g;
var camelize = cacheStringFunction((str) => {
  return str.replace(camelizeRE, (_, c) => c ? c.toUpperCase() : "");
});
function getLifeCycleTarget(target) {
  return target || getCurrentInstance();
}
function useDebounceFn(fn, ms = 200, options = {}) {
  return createFilterWrapper(
    debounceFilter(ms, options),
    fn
  );
}
function refDebounced(value, ms = 200, options = {}) {
  const debounced = ref(toValue(value));
  const updater = useDebounceFn(() => {
    debounced.value = value.value;
  }, ms, options);
  watch(value, () => updater());
  return shallowReadonly(debounced);
}
function tryOnMounted(fn, sync = true, target) {
  const instance = getLifeCycleTarget(target);
  if (instance)
    onMounted(fn, target);
  else if (sync)
    fn();
  else
    nextTick(fn);
}
function createUntil(r, isNot = false) {
  function toMatch(condition, { flush = "sync", deep = false, timeout, throwOnTimeout } = {}) {
    let stop = null;
    const watcher = new Promise((resolve2) => {
      stop = watch(
        r,
        (v) => {
          if (condition(v) !== isNot) {
            if (stop)
              stop();
            else
              nextTick(() => stop == null ? void 0 : stop());
            resolve2(v);
          }
        },
        {
          flush,
          deep,
          immediate: true
        }
      );
    });
    const promises = [watcher];
    if (timeout != null) {
      promises.push(
        promiseTimeout(timeout, throwOnTimeout).then(() => toValue(r)).finally(() => stop == null ? void 0 : stop())
      );
    }
    return Promise.race(promises);
  }
  function toBe(value, options) {
    if (!isRef(value))
      return toMatch((v) => v === value, options);
    const { flush = "sync", deep = false, timeout, throwOnTimeout } = options != null ? options : {};
    let stop = null;
    const watcher = new Promise((resolve2) => {
      stop = watch(
        [r, value],
        ([v1, v2]) => {
          if (isNot !== (v1 === v2)) {
            if (stop)
              stop();
            else
              nextTick(() => stop == null ? void 0 : stop());
            resolve2(v1);
          }
        },
        {
          flush,
          deep,
          immediate: true
        }
      );
    });
    const promises = [watcher];
    if (timeout != null) {
      promises.push(
        promiseTimeout(timeout, throwOnTimeout).then(() => toValue(r)).finally(() => {
          stop == null ? void 0 : stop();
          return toValue(r);
        })
      );
    }
    return Promise.race(promises);
  }
  function toBeTruthy(options) {
    return toMatch((v) => Boolean(v), options);
  }
  function toBeNull(options) {
    return toBe(null, options);
  }
  function toBeUndefined(options) {
    return toBe(void 0, options);
  }
  function toBeNaN(options) {
    return toMatch(Number.isNaN, options);
  }
  function toContains(value, options) {
    return toMatch((v) => {
      const array = Array.from(v);
      return array.includes(value) || array.includes(toValue(value));
    }, options);
  }
  function changed(options) {
    return changedTimes(1, options);
  }
  function changedTimes(n = 1, options) {
    let count = -1;
    return toMatch(() => {
      count += 1;
      return count >= n;
    }, options);
  }
  if (Array.isArray(toValue(r))) {
    const instance = {
      toMatch,
      toContains,
      changed,
      changedTimes,
      get not() {
        return createUntil(r, !isNot);
      }
    };
    return instance;
  } else {
    const instance = {
      toMatch,
      toBe,
      toBeTruthy,
      toBeNull,
      toBeNaN,
      toBeUndefined,
      changed,
      changedTimes,
      get not() {
        return createUntil(r, !isNot);
      }
    };
    return instance;
  }
}
function until(r) {
  return createUntil(r);
}
function useIntervalFn(cb, interval = 1e3, options = {}) {
  const {
    immediate = true,
    immediateCallback = false
  } = options;
  let timer = null;
  const isActive = shallowRef(false);
  function clean() {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  }
  function pause() {
    isActive.value = false;
    clean();
  }
  function resume() {
    const intervalValue = toValue(interval);
    if (intervalValue <= 0)
      return;
    isActive.value = true;
    if (immediateCallback)
      cb();
    clean();
    if (isActive.value)
      timer = setInterval(cb, intervalValue);
  }
  if (immediate && isClient)
    resume();
  if (isRef(interval) || typeof interval === "function") {
    const stopWatch = watch(interval, () => {
      if (isActive.value && isClient)
        resume();
    });
    tryOnScopeDispose(stopWatch);
  }
  tryOnScopeDispose(pause);
  return {
    isActive: shallowReadonly(isActive),
    pause,
    resume
  };
}
function useTimeoutFn(cb, interval, options = {}) {
  const {
    immediate = true,
    immediateCallback = false
  } = options;
  const isPending = shallowRef(false);
  let timer;
  function clear() {
    if (timer) {
      clearTimeout(timer);
      timer = void 0;
    }
  }
  function stop() {
    isPending.value = false;
    clear();
  }
  function start(...args) {
    if (immediateCallback)
      cb();
    clear();
    isPending.value = true;
    timer = setTimeout(() => {
      isPending.value = false;
      timer = void 0;
      cb(...args);
    }, toValue(interval));
  }
  if (immediate) {
    isPending.value = true;
    if (isClient)
      start();
  }
  tryOnScopeDispose(stop);
  return {
    isPending: shallowReadonly(isPending),
    start,
    stop
  };
}
function useTimeout(interval = 1e3, options = {}) {
  const {
    controls: exposeControls = false,
    callback
  } = options;
  const controls = useTimeoutFn(
    callback != null ? callback : noop,
    interval,
    options
  );
  const ready = computed(() => !controls.isPending.value);
  if (exposeControls) {
    return {
      ready,
      ...controls
    };
  } else {
    return ready;
  }
}
function watchImmediate(source, cb, options) {
  return watch(
    source,
    cb,
    {
      ...options,
      immediate: true
    }
  );
}
function whenever(source, cb, options) {
  const stop = watch(
    source,
    (v, ov, onInvalidate) => {
      if (v) {
        if (options == null ? void 0 : options.once)
          nextTick(() => stop());
        cb(v, ov, onInvalidate);
      }
    },
    {
      ...options,
      once: false
    }
  );
  return stop;
}

// node_modules/@tresjs/core/node_modules/@vueuse/core/index.mjs
var defaultWindow = isClient ? window : void 0;
var defaultDocument = isClient ? window.document : void 0;
var defaultNavigator = isClient ? window.navigator : void 0;
var defaultLocation = isClient ? window.location : void 0;
function unrefElement(elRef) {
  var _a;
  const plain = toValue(elRef);
  return (_a = plain == null ? void 0 : plain.$el) != null ? _a : plain;
}
function useEventListener(...args) {
  const cleanups = [];
  const cleanup = () => {
    cleanups.forEach((fn) => fn());
    cleanups.length = 0;
  };
  const register = (el, event, listener, options) => {
    el.addEventListener(event, listener, options);
    return () => el.removeEventListener(event, listener, options);
  };
  const firstParamTargets = computed(() => {
    const test = toArray(toValue(args[0])).filter((e) => e != null);
    return test.every((e) => typeof e !== "string") ? test : void 0;
  });
  const stopWatch = watchImmediate(
    () => {
      var _a, _b;
      return [
        (_b = (_a = firstParamTargets.value) == null ? void 0 : _a.map((e) => unrefElement(e))) != null ? _b : [defaultWindow].filter((e) => e != null),
        toArray(toValue(firstParamTargets.value ? args[1] : args[0])),
        toArray(unref(firstParamTargets.value ? args[2] : args[1])),
        // @ts-expect-error - TypeScript gets the correct types, but somehow still complains
        toValue(firstParamTargets.value ? args[3] : args[2])
      ];
    },
    ([raw_targets, raw_events, raw_listeners, raw_options]) => {
      cleanup();
      if (!(raw_targets == null ? void 0 : raw_targets.length) || !(raw_events == null ? void 0 : raw_events.length) || !(raw_listeners == null ? void 0 : raw_listeners.length))
        return;
      const optionsClone = isObject(raw_options) ? { ...raw_options } : raw_options;
      cleanups.push(
        ...raw_targets.flatMap(
          (el) => raw_events.flatMap(
            (event) => raw_listeners.map((listener) => register(el, event, listener, optionsClone))
          )
        )
      );
    },
    { flush: "post" }
  );
  const stop = () => {
    stopWatch();
    cleanup();
  };
  tryOnScopeDispose(cleanup);
  return stop;
}
function useMounted() {
  const isMounted = shallowRef(false);
  const instance = getCurrentInstance();
  if (instance) {
    onMounted(() => {
      isMounted.value = true;
    }, instance);
  }
  return isMounted;
}
function useSupported(callback) {
  const isMounted = useMounted();
  return computed(() => {
    isMounted.value;
    return Boolean(callback());
  });
}
function useRafFn(fn, options = {}) {
  const {
    immediate = true,
    fpsLimit = void 0,
    window: window2 = defaultWindow,
    once: once2 = false
  } = options;
  const isActive = shallowRef(false);
  const intervalLimit = computed(() => {
    return fpsLimit ? 1e3 / toValue(fpsLimit) : null;
  });
  let previousFrameTimestamp = 0;
  let rafId = null;
  function loop(timestamp2) {
    if (!isActive.value || !window2)
      return;
    if (!previousFrameTimestamp)
      previousFrameTimestamp = timestamp2;
    const delta = timestamp2 - previousFrameTimestamp;
    if (intervalLimit.value && delta < intervalLimit.value) {
      rafId = window2.requestAnimationFrame(loop);
      return;
    }
    previousFrameTimestamp = timestamp2;
    fn({ delta, timestamp: timestamp2 });
    if (once2) {
      isActive.value = false;
      rafId = null;
      return;
    }
    rafId = window2.requestAnimationFrame(loop);
  }
  function resume() {
    if (!isActive.value && window2) {
      isActive.value = true;
      previousFrameTimestamp = 0;
      rafId = window2.requestAnimationFrame(loop);
    }
  }
  function pause() {
    isActive.value = false;
    if (rafId != null && window2) {
      window2.cancelAnimationFrame(rafId);
      rafId = null;
    }
  }
  if (immediate)
    resume();
  tryOnScopeDispose(pause);
  return {
    isActive: readonly(isActive),
    pause,
    resume
  };
}
function useAsyncState(promise, initialState, options) {
  var _a;
  const {
    immediate = true,
    delay = 0,
    onError = (_a = globalThis.reportError) != null ? _a : noop,
    onSuccess = noop,
    resetOnExecute = true,
    shallow = true,
    throwError
  } = options != null ? options : {};
  const state = shallow ? shallowRef(initialState) : ref(initialState);
  const isReady = shallowRef(false);
  const isLoading = shallowRef(false);
  const error = shallowRef(void 0);
  async function execute(delay2 = 0, ...args) {
    if (resetOnExecute)
      state.value = toValue(initialState);
    error.value = void 0;
    isReady.value = false;
    isLoading.value = true;
    if (delay2 > 0)
      await promiseTimeout(delay2);
    const _promise = typeof promise === "function" ? promise(...args) : promise;
    try {
      const data = await _promise;
      state.value = data;
      isReady.value = true;
      onSuccess(data);
    } catch (e) {
      error.value = e;
      onError(e);
      if (throwError)
        throw e;
    } finally {
      isLoading.value = false;
    }
    return state.value;
  }
  if (immediate) {
    execute(delay);
  }
  const shell = {
    state,
    isReady,
    isLoading,
    error,
    execute,
    executeImmediate: (...args) => execute(0, ...args)
  };
  function waitUntilIsLoaded() {
    return new Promise((resolve2, reject) => {
      until(isLoading).toBe(false).then(() => resolve2(shell)).catch(reject);
    });
  }
  return {
    ...shell,
    then(onFulfilled, onRejected) {
      return waitUntilIsLoaded().then(onFulfilled, onRejected);
    }
  };
}
var ssrWidthSymbol = Symbol("vueuse-ssr-width");
function useSSRWidth() {
  const ssrWidth = hasInjectionContext() ? injectLocal(ssrWidthSymbol, null) : null;
  return typeof ssrWidth === "number" ? ssrWidth : void 0;
}
function useMediaQuery(query, options = {}) {
  const { window: window2 = defaultWindow, ssrWidth = useSSRWidth() } = options;
  const isSupported = useSupported(() => window2 && "matchMedia" in window2 && typeof window2.matchMedia === "function");
  const ssrSupport = shallowRef(typeof ssrWidth === "number");
  const mediaQuery = shallowRef();
  const matches = shallowRef(false);
  const handler = (event) => {
    matches.value = event.matches;
  };
  watchEffect(() => {
    if (ssrSupport.value) {
      ssrSupport.value = !isSupported.value;
      const queryStrings = toValue(query).split(",");
      matches.value = queryStrings.some((queryString) => {
        const not = queryString.includes("not all");
        const minWidth = queryString.match(/\(\s*min-width:\s*(-?\d+(?:\.\d*)?[a-z]+\s*)\)/);
        const maxWidth = queryString.match(/\(\s*max-width:\s*(-?\d+(?:\.\d*)?[a-z]+\s*)\)/);
        let res = Boolean(minWidth || maxWidth);
        if (minWidth && res) {
          res = ssrWidth >= pxValue(minWidth[1]);
        }
        if (maxWidth && res) {
          res = ssrWidth <= pxValue(maxWidth[1]);
        }
        return not ? !res : res;
      });
      return;
    }
    if (!isSupported.value)
      return;
    mediaQuery.value = window2.matchMedia(toValue(query));
    matches.value = mediaQuery.value.matches;
  });
  useEventListener(mediaQuery, "change", handler, { passive: true });
  return computed(() => matches.value);
}
var _global = typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : {};
var globalKey = "__vueuse_ssr_handlers__";
var handlers = getHandlers();
function getHandlers() {
  if (!(globalKey in _global))
    _global[globalKey] = _global[globalKey] || {};
  return _global[globalKey];
}
function useDevicePixelRatio(options = {}) {
  const {
    window: window2 = defaultWindow
  } = options;
  const pixelRatio = shallowRef(1);
  const query = useMediaQuery(() => `(resolution: ${pixelRatio.value}dppx)`, options);
  let stop = noop;
  if (window2) {
    stop = watchImmediate(query, () => pixelRatio.value = window2.devicePixelRatio);
  }
  return {
    pixelRatio: readonly(pixelRatio),
    stop
  };
}
function useResizeObserver(target, callback, options = {}) {
  const { window: window2 = defaultWindow, ...observerOptions } = options;
  let observer;
  const isSupported = useSupported(() => window2 && "ResizeObserver" in window2);
  const cleanup = () => {
    if (observer) {
      observer.disconnect();
      observer = void 0;
    }
  };
  const targets = computed(() => {
    const _targets = toValue(target);
    return Array.isArray(_targets) ? _targets.map((el) => unrefElement(el)) : [unrefElement(_targets)];
  });
  const stopWatch = watch(
    targets,
    (els) => {
      cleanup();
      if (isSupported.value && window2) {
        observer = new ResizeObserver(callback);
        for (const _el of els) {
          if (_el)
            observer.observe(_el, observerOptions);
        }
      }
    },
    { immediate: true, flush: "post" }
  );
  const stop = () => {
    cleanup();
    stopWatch();
  };
  tryOnScopeDispose(stop);
  return {
    isSupported,
    stop
  };
}
function useElementSize(target, initialSize = { width: 0, height: 0 }, options = {}) {
  const { window: window2 = defaultWindow, box = "content-box" } = options;
  const isSVG = computed(() => {
    var _a, _b;
    return (_b = (_a = unrefElement(target)) == null ? void 0 : _a.namespaceURI) == null ? void 0 : _b.includes("svg");
  });
  const width = shallowRef(initialSize.width);
  const height = shallowRef(initialSize.height);
  const { stop: stop1 } = useResizeObserver(
    target,
    ([entry]) => {
      const boxSize = box === "border-box" ? entry.borderBoxSize : box === "content-box" ? entry.contentBoxSize : entry.devicePixelContentBoxSize;
      if (window2 && isSVG.value) {
        const $elem = unrefElement(target);
        if ($elem) {
          const rect = $elem.getBoundingClientRect();
          width.value = rect.width;
          height.value = rect.height;
        }
      } else {
        if (boxSize) {
          const formatBoxSize = toArray(boxSize);
          width.value = formatBoxSize.reduce((acc, { inlineSize }) => acc + inlineSize, 0);
          height.value = formatBoxSize.reduce((acc, { blockSize }) => acc + blockSize, 0);
        } else {
          width.value = entry.contentRect.width;
          height.value = entry.contentRect.height;
        }
      }
    },
    options
  );
  tryOnMounted(() => {
    const ele = unrefElement(target);
    if (ele) {
      width.value = "offsetWidth" in ele ? ele.offsetWidth : initialSize.width;
      height.value = "offsetHeight" in ele ? ele.offsetHeight : initialSize.height;
    }
  });
  const stop2 = watch(
    () => unrefElement(target),
    (ele) => {
      width.value = ele ? initialSize.width : 0;
      height.value = ele ? initialSize.height : 0;
    }
  );
  function stop() {
    stop1();
    stop2();
  }
  return {
    width,
    height,
    stop
  };
}
function useFps(options) {
  var _a;
  const fps = shallowRef(0);
  if (typeof performance === "undefined")
    return fps;
  const every = (_a = options == null ? void 0 : options.every) != null ? _a : 10;
  let last = performance.now();
  let ticks = 0;
  useRafFn(() => {
    ticks += 1;
    if (ticks >= every) {
      const now = performance.now();
      const diff = now - last;
      fps.value = Math.round(1e3 / (diff / ticks));
      last = now;
      ticks = 0;
    }
  });
  return fps;
}
function useMemory(options = {}) {
  const memory = ref();
  const isSupported = useSupported(() => typeof performance !== "undefined" && "memory" in performance);
  if (isSupported.value) {
    const { interval = 1e3 } = options;
    useIntervalFn(() => {
      memory.value = performance.memory;
    }, interval, { immediate: options.immediate, immediateCallback: options.immediateCallback });
  }
  return { isSupported, memory };
}
var defaultState = {
  x: 0,
  y: 0,
  pointerId: 0,
  pressure: 0,
  tiltX: 0,
  tiltY: 0,
  width: 0,
  height: 0,
  twist: 0,
  pointerType: null
};
var keys = Object.keys(defaultState);
var DEFAULT_UNITS = [
  { max: 6e4, value: 1e3, name: "second" },
  { max: 276e4, value: 6e4, name: "minute" },
  { max: 72e6, value: 36e5, name: "hour" },
  { max: 5184e5, value: 864e5, name: "day" },
  { max: 24192e5, value: 6048e5, name: "week" },
  { max: 28512e6, value: 2592e6, name: "month" },
  { max: Number.POSITIVE_INFINITY, value: 31536e6, name: "year" }
];
var _TransitionPresets = {
  easeInSine: [0.12, 0, 0.39, 0],
  easeOutSine: [0.61, 1, 0.88, 1],
  easeInOutSine: [0.37, 0, 0.63, 1],
  easeInQuad: [0.11, 0, 0.5, 0],
  easeOutQuad: [0.5, 1, 0.89, 1],
  easeInOutQuad: [0.45, 0, 0.55, 1],
  easeInCubic: [0.32, 0, 0.67, 0],
  easeOutCubic: [0.33, 1, 0.68, 1],
  easeInOutCubic: [0.65, 0, 0.35, 1],
  easeInQuart: [0.5, 0, 0.75, 0],
  easeOutQuart: [0.25, 1, 0.5, 1],
  easeInOutQuart: [0.76, 0, 0.24, 1],
  easeInQuint: [0.64, 0, 0.78, 0],
  easeOutQuint: [0.22, 1, 0.36, 1],
  easeInOutQuint: [0.83, 0, 0.17, 1],
  easeInExpo: [0.7, 0, 0.84, 0],
  easeOutExpo: [0.16, 1, 0.3, 1],
  easeInOutExpo: [0.87, 0, 0.13, 1],
  easeInCirc: [0.55, 0, 1, 0.45],
  easeOutCirc: [0, 0.55, 0.45, 1],
  easeInOutCirc: [0.85, 0, 0.15, 1],
  easeInBack: [0.36, 0, 0.66, -0.56],
  easeOutBack: [0.34, 1.56, 0.64, 1],
  easeInOutBack: [0.68, -0.6, 0.32, 1.6]
};
var TransitionPresets = Object.assign({}, { linear: identity }, _TransitionPresets);
function useWindowSize(options = {}) {
  const {
    window: window2 = defaultWindow,
    initialWidth = Number.POSITIVE_INFINITY,
    initialHeight = Number.POSITIVE_INFINITY,
    listenOrientation = true,
    includeScrollbar = true,
    type = "inner"
  } = options;
  const width = shallowRef(initialWidth);
  const height = shallowRef(initialHeight);
  const update = () => {
    if (window2) {
      if (type === "outer") {
        width.value = window2.outerWidth;
        height.value = window2.outerHeight;
      } else if (type === "visual" && window2.visualViewport) {
        const { width: visualViewportWidth, height: visualViewportHeight, scale } = window2.visualViewport;
        width.value = Math.round(visualViewportWidth * scale);
        height.value = Math.round(visualViewportHeight * scale);
      } else if (includeScrollbar) {
        width.value = window2.innerWidth;
        height.value = window2.innerHeight;
      } else {
        width.value = window2.document.documentElement.clientWidth;
        height.value = window2.document.documentElement.clientHeight;
      }
    }
  };
  update();
  tryOnMounted(update);
  const listenerOptions = { passive: true };
  useEventListener("resize", update, listenerOptions);
  if (window2 && type === "visual" && window2.visualViewport) {
    useEventListener(window2.visualViewport, "resize", update, listenerOptions);
  }
  if (listenOrientation) {
    const matches = useMediaQuery("(orientation: portrait)");
    watch(matches, () => update());
  }
  return { width, height };
}

// node_modules/radashi/dist/radashi.js
var once = (() => {
  const onceSymbol = Symbol();
  const once2 = (fn) => {
    const onceFn = function(...args) {
      if (onceFn[onceSymbol] === onceSymbol) {
        onceFn[onceSymbol] = fn.apply(this, args);
      }
      return onceFn[onceSymbol];
    };
    onceFn[onceSymbol] = onceSymbol;
    return onceFn;
  };
  once2.reset = (fn) => {
    fn[onceSymbol] = onceSymbol;
  };
  return once2;
})();
var AggregateErrorOrPolyfill = (() => globalThis.AggregateError ?? class AggregateError extends Error {
  constructor(errors = []) {
    var _a, _b;
    super();
    const name = ((_a = errors.find((e) => e.name)) == null ? void 0 : _a.name) ?? "";
    this.name = `AggregateError(${name}...)`;
    this.message = `AggregateError with ${errors.length} errors`;
    this.stack = ((_b = errors.find((e) => e.stack)) == null ? void 0 : _b.stack) ?? this.stack;
    this.errors = errors;
  }
})();
function camel(str) {
  var _a;
  const parts = ((_a = str == null ? void 0 : str.replace(/([A-Z])+/g, capitalize)) == null ? void 0 : _a.split(/(?=[A-Z])|[\.\-\s_]/).map((x) => x.toLowerCase())) ?? [];
  if (parts.length === 0) {
    return "";
  }
  if (parts.length === 1) {
    return parts[0];
  }
  return parts.reduce((acc, part) => {
    return `${acc}${part.charAt(0).toUpperCase()}${part.slice(1)}`;
  });
}
function capitalize(str) {
  if (!str || str.length === 0) {
    return "";
  }
  const lower = str.toLowerCase();
  return lower.substring(0, 1).toUpperCase() + lower.substring(1, lower.length);
}
var DEBURR_MAP = new Map(
  Object.entries({
    Æ: "Ae",
    Ð: "D",
    Ø: "O",
    Þ: "Th",
    ß: "ss",
    æ: "ae",
    ð: "d",
    ø: "o",
    þ: "th",
    Đ: "D",
    đ: "d",
    Ħ: "H",
    ħ: "h",
    ı: "i",
    Ĳ: "IJ",
    ĳ: "ij",
    ĸ: "k",
    Ŀ: "L",
    ŀ: "l",
    Ł: "L",
    ł: "l",
    ŉ: "'n",
    Ŋ: "N",
    ŋ: "n",
    Œ: "Oe",
    œ: "oe",
    Ŧ: "T",
    ŧ: "t",
    ſ: "s"
  })
);
var isArray = (() => Array.isArray)();
var asyncIteratorSymbol = (
  /* c8 ignore next */
  Symbol.asyncIterator || Symbol.for("Symbol.asyncIterator")
);
function isEqual(x, y) {
  if (Object.is(x, y)) {
    return true;
  }
  if (x instanceof Date && y instanceof Date) {
    return x.getTime() === y.getTime();
  }
  if (x instanceof RegExp && y instanceof RegExp) {
    return x.toString() === y.toString();
  }
  if (typeof x !== "object" || x === null || typeof y !== "object" || y === null) {
    return false;
  }
  const keysX = Reflect.ownKeys(x);
  const keysY = Reflect.ownKeys(y);
  if (keysX.length !== keysY.length) {
    return false;
  }
  for (let i = 0; i < keysX.length; i++) {
    if (!Reflect.has(y, keysX[i])) {
      return false;
    }
    if (!isEqual(x[keysX[i]], y[keysX[i]])) {
      return false;
    }
  }
  return true;
}
function isFunction(value) {
  return typeof value === "function";
}
var isInt = (() => Number.isInteger)();
function isNumber(value) {
  return typeof value === "number" && !Number.isNaN(value);
}
function isObject2(value) {
  return isTagged(value, "[object Object]");
}
function isString(value) {
  return typeof value === "string";
}
function isTagged(value, tag) {
  return Object.prototype.toString.call(value) === tag;
}
function isUndefined(value) {
  return typeof value === "undefined";
}

// node_modules/@pmndrs/pointer-events/dist/html-event.js
var HtmlEvent = class {
  constructor(nativeEvent) {
    __publicField(this, "nativeEvent");
    __publicField(this, "NONE", 0);
    __publicField(this, "CAPTURING_PHASE", 1);
    __publicField(this, "AT_TARGET", 2);
    __publicField(this, "BUBBLING_PHASE", 3);
    __publicField(this, "relatedTarget", null);
    this.nativeEvent = nativeEvent;
  }
  get altKey() {
    return this.getFromNative("altKey", false);
  }
  get button() {
    return this.getFromNative("button", 0);
  }
  get buttons() {
    return this.getFromNative("buttons", 0);
  }
  get clientX() {
    return this.getFromNative("clientX", 0);
  }
  get clientY() {
    return this.getFromNative("clientY", 0);
  }
  get ctrlKey() {
    return this.getFromNative("ctrlKey", false);
  }
  get layerX() {
    return this.getFromNative("layerX", 0);
  }
  get layerY() {
    return this.getFromNative("layerY", 0);
  }
  get metaKey() {
    return this.getFromNative("metaKey", false);
  }
  get movementX() {
    return this.getFromNative("movementX", 0);
  }
  get movementY() {
    return this.getFromNative("movementY", 0);
  }
  get offsetX() {
    return this.getFromNative("offsetX", 0);
  }
  get offsetY() {
    return this.getFromNative("offsetY", 0);
  }
  get pageX() {
    return this.getFromNative("pageX", 0);
  }
  get pageY() {
    return this.getFromNative("pageY", 0);
  }
  get screenX() {
    return this.getFromNative("screenX", 0);
  }
  get screenY() {
    return this.getFromNative("screenY", 0);
  }
  get shiftKey() {
    return this.getFromNative("shiftKey", false);
  }
  get x() {
    return this.getFromNative("x", 0);
  }
  get y() {
    return this.getFromNative("y", 0);
  }
  get detail() {
    return this.getFromNative("detail", 0);
  }
  get view() {
    return this.getFromNative("view", null);
  }
  get which() {
    return this.getFromNative("which", 0);
  }
  get cancelBubble() {
    return this.getFromNative("cancelBubble", false);
  }
  get composed() {
    return this.getFromNative("composed", false);
  }
  get eventPhase() {
    return this.getFromNative("eventPhase", 0);
  }
  get isTrusted() {
    return this.getFromNative("isTrusted", false);
  }
  get returnValue() {
    return this.getFromNative("returnValue", false);
  }
  get timeStamp() {
    return this.getFromNative("timeStamp", 0);
  }
  get cancelable() {
    return this.getFromNative("cancelable", false);
  }
  get defaultPrevented() {
    return this.getFromNative("defaultPrevented", false);
  }
  getFromNative(key, defaultValue) {
    if (key in this.nativeEvent) {
      return this.nativeEvent[key];
    }
    return defaultValue;
  }
};

// node_modules/@pmndrs/pointer-events/dist/event.js
var helperVector = new Vector3();
var PointerEvent = class _PointerEvent extends HtmlEvent {
  constructor(type, bubbles, nativeEvent, internalPointer, intersection, camera, currentObject = intersection.object, object = currentObject, propagationState = {
    stopped: !bubbles,
    stoppedImmediate: false
  }) {
    super(nativeEvent);
    __publicField(this, "type");
    __publicField(this, "bubbles");
    __publicField(this, "internalPointer");
    __publicField(this, "intersection");
    __publicField(this, "camera");
    __publicField(this, "currentObject");
    __publicField(this, "object");
    __publicField(this, "propagationState");
    __publicField(this, "_pointer");
    __publicField(this, "_ray");
    __publicField(this, "_intersections", []);
    __publicField(this, "_unprojectedPoint");
    this.type = type;
    this.bubbles = bubbles;
    this.internalPointer = internalPointer;
    this.intersection = intersection;
    this.camera = camera;
    this.currentObject = currentObject;
    this.object = object;
    this.propagationState = propagationState;
  }
  //--- pointer events data
  get pointerId() {
    return this.internalPointer.id;
  }
  get pointerType() {
    return this.internalPointer.type;
  }
  get pointerState() {
    return this.internalPointer.state;
  }
  //--- intersection data
  get distance() {
    return this.intersection.distance;
  }
  get distanceToRay() {
    return this.intersection.distanceToRay;
  }
  get point() {
    return this.intersection.point;
  }
  get index() {
    return this.intersection.index;
  }
  get face() {
    return this.intersection.face;
  }
  get faceIndex() {
    return this.intersection.faceIndex;
  }
  get uv() {
    return this.intersection.uv;
  }
  get uv1() {
    return this.intersection.uv1;
  }
  get normal() {
    return this.intersection.normal;
  }
  get instanceId() {
    return this.intersection.instanceId;
  }
  get pointOnLine() {
    return this.intersection.pointOnLine;
  }
  get batchId() {
    return this.intersection.batchId;
  }
  get pointerPosition() {
    return this.intersection.pointerPosition;
  }
  get pointerQuaternion() {
    return this.intersection.pointerQuaternion;
  }
  get pointOnFace() {
    return this.intersection.pointOnFace;
  }
  get localPoint() {
    return this.intersection.localPoint;
  }
  get details() {
    return this.intersection.details;
  }
  /** same as object */
  get target() {
    return this.object;
  }
  /** same as currentObject */
  get currentTarget() {
    return this.currentObject;
  }
  /** same as currentObject */
  get eventObject() {
    return this.currentObject;
  }
  /** same as object */
  get srcElement() {
    return this.currentObject;
  }
  get pointer() {
    if (this._pointer == null) {
      helperVector.copy(this.intersection.point).project(this.camera);
      this._pointer = new Vector2(helperVector.x, helperVector.y);
    }
    return this._pointer;
  }
  get ray() {
    if (this._ray != null) {
      return this._ray;
    }
    switch (this.intersection.details.type) {
      case "screen-ray":
      case "ray":
      case "sphere":
        return this._ray = new Ray(this.intersection.pointerPosition, new Vector3(0, 0, -1).applyQuaternion(this.intersection.pointerQuaternion));
      case "lines":
        return this._ray = new Ray(this.intersection.details.line.start, this.intersection.details.line.end.clone().sub(this.intersection.details.line.start).normalize());
    }
  }
  get intersections() {
    if (this._intersections == null) {
      this._intersections = [{ ...this.intersection, eventObject: this.currentObject }];
    }
    return this._intersections;
  }
  get unprojectedPoint() {
    if (this._unprojectedPoint == null) {
      const p = this.pointer;
      this._unprojectedPoint = new Vector3(p.x, p.y, 0).unproject(this.camera);
    }
    return this._unprojectedPoint;
  }
  get stopped() {
    return this.propagationState.stoppedImmediate || this.propagationState.stopped;
  }
  get stoppedImmediate() {
    return this.propagationState.stoppedImmediate;
  }
  get delta() {
    throw new Error(`not supported`);
  }
  stopPropagation() {
    this.propagationState.stopped = true;
  }
  stopImmediatePropagation() {
    this.propagationState.stoppedImmediate = true;
  }
  /**
   * for internal use
   */
  retarget(currentObject) {
    return new _PointerEvent(this.type, this.bubbles, this.nativeEvent, this.internalPointer, this.intersection, this.camera, currentObject, this.target, this.propagationState);
  }
};
var WheelEvent = class _WheelEvent extends PointerEvent {
  get deltaX() {
    return this.nativeEvent.deltaX;
  }
  get deltaY() {
    return this.nativeEvent.deltaY;
  }
  get deltaZ() {
    return this.nativeEvent.deltaZ;
  }
  constructor(nativeEvent, pointer, intersection, camera, currentObject, object) {
    super("wheel", true, nativeEvent, pointer, intersection, camera, currentObject, object);
  }
  /**
   * for internal use
   */
  retarget(currentObject) {
    return new _WheelEvent(this.nativeEvent, this.internalPointer, this.intersection, this.camera, currentObject, this.target);
  }
};
function emitPointerEvent(event) {
  emitPointerEventRec(event, event.currentObject);
}
function emitPointerEventRec(baseEvent, currentObject) {
  if (currentObject == null) {
    return;
  }
  const listeners = getObjectListeners(currentObject, baseEvent.type);
  if (listeners != null && listeners.length > 0) {
    const event = baseEvent.retarget(currentObject);
    const length = listeners.length;
    for (let i = 0; i < length && !event.stoppedImmediate; i++) {
      listeners[i](event);
    }
  }
  if (baseEvent.stopped) {
    return;
  }
  emitPointerEventRec(baseEvent, currentObject.parent);
}
var r3fEventToHandlerMap = {
  click: "onClick",
  contextmenu: "onContextMenu",
  dblclick: "onDoubleClick",
  pointercancel: "onPointerCancel",
  pointerdown: "onPointerDown",
  pointerenter: "onPointerEnter",
  pointerleave: "onPointerLeave",
  pointermove: "onPointerMove",
  pointerout: "onPointerOut",
  pointerover: "onPointerOver",
  pointerup: "onPointerUp",
  wheel: "onWheel"
};
var listenerNames = Object.keys(r3fEventToHandlerMap);
function getObjectListeners(object, forEvent) {
  var _a;
  if (object._listeners != null && forEvent in object._listeners) {
    return object._listeners[forEvent];
  }
  let handler;
  if (object.isVoidObject && forEvent === "click" && ((_a = object.parent) == null ? void 0 : _a.__r3f) != null) {
    handler = object.parent.__r3f.root.getState().onPointerMissed;
  }
  if (object.__r3f != null) {
    handler = object.__r3f.handlers[r3fEventToHandlerMap[forEvent]];
  }
  if (handler == null) {
    return void 0;
  }
  return [handler];
}

// node_modules/@pmndrs/pointer-events/dist/intersections/intersector.js
var VoidObjectRadius = 1e10;
var VoidObjectGeometry = new SphereGeometry(VoidObjectRadius);
var sceneVoidObjectMap = /* @__PURE__ */ new Map();
function getVoidObject(scene) {
  let entry = sceneVoidObjectMap.get(scene);
  if (entry == null) {
    entry = new Mesh(VoidObjectGeometry);
    entry.isVoidObject = true;
    entry.parent = scene;
    entry.pointerEventsOrder = -Infinity;
    sceneVoidObjectMap.set(scene, entry);
  }
  return entry;
}

// node_modules/@pmndrs/pointer-events/dist/intersections/utils.js
function computeIntersectionWorldPlane(target, intersection, objectMatrixWorld) {
  var _a;
  const normal = intersection.normal ?? ((_a = intersection.face) == null ? void 0 : _a.normal);
  if (normal == null) {
    return false;
  }
  target.setFromNormalAndCoplanarPoint(normal, intersection.localPoint);
  target.applyMatrix4(objectMatrixWorld);
  return true;
}
function isPointerEventsAllowed(hasListener, pointerEvents, pointerEventsType) {
  if (pointerEvents === "none") {
    return false;
  }
  if (pointerEvents === "listener" && !hasListener) {
    return false;
  }
  if (pointerEventsType === "all") {
    return true;
  }
  if (typeof pointerEventsType === "function") {
    return ({ id, type, state }) => pointerEventsType(id, type, state);
  }
  let value;
  let invert;
  if ("deny" in pointerEventsType) {
    invert = true;
    value = pointerEventsType.deny;
  } else {
    invert = false;
    value = pointerEventsType.allow;
  }
  if (Array.isArray(value)) {
    return (pointer) => invertIf(value.includes(pointer.type), invert);
  }
  return (pointer) => invertIf(value === pointer.type, invert);
}
function invertIf(toInvert, ifIsTrue) {
  return ifIsTrue ? !toInvert : toInvert;
}
function intersectPointerEventTargets(type, object, pointers, parentHasListener = false, parentPointerEvents, parentPointerEventsType, parentPointerEventsOrder) {
  const hasListener = parentHasListener || hasObjectListeners(type, object);
  const pointerEvents = object.pointerEvents ?? parentPointerEvents;
  const pointerEventsOrDefault = pointerEvents ?? object.defaultPointerEvents ?? "listener";
  const pointerEventsType = object.pointerEventsType ?? parentPointerEventsType ?? "all";
  const pointerEventsOrder = object.pointerEventsOrder ?? parentPointerEventsOrder ?? 0;
  const isAllowed = isPointerEventsAllowed(hasListener, pointerEventsOrDefault, pointerEventsType);
  const length = pointers.length;
  if (length === 1) {
    if (isAllowed === true || typeof isAllowed === "function" && isAllowed(pointers[0])) {
      filterAndInteresct(pointers[0], object, pointerEventsOrDefault, pointerEventsType, pointerEventsOrder);
    }
  } else if (isAllowed === true) {
    for (let i = 0; i < length; i++) {
      filterAndInteresct(pointers[i], object, pointerEventsOrDefault, pointerEventsType, pointerEventsOrder);
    }
  } else if (typeof isAllowed === "function") {
    for (let i = 0; i < length; i++) {
      const pointer = pointers[i];
      if (!isAllowed(pointer)) {
        continue;
      }
      filterAndInteresct(pointer, object, pointerEventsOrDefault, pointerEventsType, pointerEventsOrder);
    }
  }
  if (object.children.length === 0 || object.intersectChildren === false) {
    return;
  }
  const descendants = object.interactableDescendants ?? object.children;
  const descendantsLength = descendants.length;
  for (let i = 0; i < descendantsLength; i++) {
    intersectPointerEventTargets(type, descendants[i], pointers, hasListener, pointerEvents, pointerEventsType, pointerEventsOrder);
  }
}
function hasObjectListeners(type, object) {
  var _a;
  if (object.ancestorsHaveListeners) {
    return true;
  }
  if (type === "pointer" && object.ancestorsHavePointerListeners) {
    return true;
  }
  if (type === "wheel" && object.ancestorsHaveWheelListeners) {
    return true;
  }
  if (object.__r3f != null && ((_a = object.__r3f) == null ? void 0 : _a.eventCount) > 0) {
    if (type === "wheel" && object.__r3f["handlers"]["onWheel"] != null) {
      return true;
    }
    if (type === "pointer" && Object.keys(object.__r3f["handlers"]).some((key) => key != "onWheel")) {
      return true;
    }
  }
  if (object._listeners == null) {
    return false;
  }
  if (type === "wheel") {
    const wheelListeners = object._listeners.wheel;
    return wheelListeners != null && wheelListeners.length > 0;
  }
  const entries = Object.entries(object._listeners);
  const length = entries.length;
  for (let i = 0; i < length; i++) {
    const entry = entries[i];
    if (entry[0] === "wheel") {
      continue;
    }
    if (!listenerNames.includes(entry[0])) {
      continue;
    }
    if (entry[1] != null && entry[1].length > 0) {
      return true;
    }
  }
  return false;
}
function filterAndInteresct({ intersector, options }, object, pointerEvents, pointerEventsType, pointerEventsOrder) {
  var _a;
  if (((_a = options.filter) == null ? void 0 : _a.call(options, object, pointerEvents, pointerEventsType, pointerEventsOrder)) === false) {
    return;
  }
  intersector.executeIntersection(object, pointerEventsOrder);
}
function getDominantIntersectionIndex(intersections, pointerEventsOrders, { customSort: compare = defaultSort } = {}, filter) {
  let intersection = void 0;
  let pointerEventsOrder = void 0;
  let index = void 0;
  const length = intersections.length;
  for (let i = 0; i < length; i++) {
    const newIntersection = intersections[i];
    if ((filter == null ? void 0 : filter(newIntersection)) === false) {
      continue;
    }
    const newPointerEventsOrder = pointerEventsOrders == null ? void 0 : pointerEventsOrders[i];
    if (intersection == null || compare(newIntersection, newPointerEventsOrder, intersection, pointerEventsOrder) < 0) {
      index = i;
      intersection = newIntersection;
      pointerEventsOrder = newPointerEventsOrder;
    }
  }
  return index;
}
function defaultSort(i1, pointerEventsOrder1 = 0, i2, pointerEventsOrder2 = 0) {
  if (pointerEventsOrder1 != pointerEventsOrder2) {
    return pointerEventsOrder2 - pointerEventsOrder1;
  }
  return i1.distance - i2.distance;
}
var VoidObjectDistance = 1e7;
function voidObjectIntersectionFromRay(scene, ray, getDetails, pointerPosition, pointerQuaternion, addToDistance = 0) {
  const point = ray.direction.clone().multiplyScalar(VoidObjectDistance);
  const distanceOnRay = VoidObjectDistance;
  return {
    distance: distanceOnRay + addToDistance,
    object: getVoidObject(scene),
    point,
    normal: ray.origin.clone().sub(point).normalize(),
    details: getDetails(point, distanceOnRay),
    pointerPosition,
    pointerQuaternion,
    pointOnFace: point,
    localPoint: point
  };
}
function pushTimes(target, value, times) {
  while (times > 0) {
    target.push(value);
    --times;
  }
}

// node_modules/@pmndrs/pointer-events/dist/pointer.js
var buttonsDownTimeKey = Symbol("buttonsDownTime");
var buttonsClickTimeKey = Symbol("buttonsClickTime");
globalThis.pointerEventspointerMap ?? (globalThis.pointerEventspointerMap = /* @__PURE__ */ new Map());
Object3D.prototype.setPointerCapture = function(pointerId) {
  var _a;
  (_a = getPointerById(pointerId)) == null ? void 0 : _a.setCapture(this);
};
Object3D.prototype.releasePointerCapture = function(pointerId) {
  const pointer = getPointerById(pointerId);
  if (pointer == null || !pointer.hasCaptured(this)) {
    return;
  }
  pointer.setCapture(void 0);
};
Object3D.prototype.hasPointerCapture = function(pointerId) {
  var _a;
  return ((_a = getPointerById(pointerId)) == null ? void 0 : _a.hasCaptured(this)) ?? false;
};
function getPointerById(pointerId) {
  var _a;
  return (_a = globalThis.pointerEventspointerMap) == null ? void 0 : _a.get(pointerId);
}
var Pointer = class {
  constructor(id, type, state, intersector, getCamera, onMoveCommited, parentSetPointerCapture, parentReleasePointerCapture, options = {}) {
    __publicField(this, "id");
    __publicField(this, "type");
    __publicField(this, "state");
    __publicField(this, "intersector");
    __publicField(this, "getCamera");
    __publicField(this, "onMoveCommited");
    __publicField(this, "parentSetPointerCapture");
    __publicField(this, "parentReleasePointerCapture");
    __publicField(this, "options");
    //state
    __publicField(this, "prevIntersection");
    __publicField(this, "intersection");
    __publicField(this, "prevEnabled", true);
    __publicField(this, "enabled", true);
    __publicField(this, "wheelIntersection");
    //derived state
    /**
     * ordered leaf -> root (bottom -> top)
     */
    __publicField(this, "pointerEntered", []);
    __publicField(this, "pointerEnteredHelper", []);
    __publicField(this, "pointerCapture");
    __publicField(this, "buttonsDownTime", /* @__PURE__ */ new Map());
    __publicField(this, "buttonsDown", /* @__PURE__ */ new Set());
    //to handle interaction before first move (after exit)
    __publicField(this, "wasMoved", false);
    __publicField(this, "onFirstMove", []);
    var _a;
    this.id = id;
    this.type = type;
    this.state = state;
    this.intersector = intersector;
    this.getCamera = getCamera;
    this.onMoveCommited = onMoveCommited;
    this.parentSetPointerCapture = parentSetPointerCapture;
    this.parentReleasePointerCapture = parentReleasePointerCapture;
    this.options = options;
    (_a = globalThis.pointerEventspointerMap) == null ? void 0 : _a.set(id, this);
  }
  getPointerCapture() {
    return this.pointerCapture;
  }
  hasCaptured(object) {
    var _a;
    return ((_a = this.pointerCapture) == null ? void 0 : _a.object) === object;
  }
  setCapture(object) {
    var _a, _b, _c;
    if (((_a = this.pointerCapture) == null ? void 0 : _a.object) === object) {
      return;
    }
    if (this.pointerCapture != null) {
      (_b = this.parentReleasePointerCapture) == null ? void 0 : _b.call(this);
      this.pointerCapture = void 0;
    }
    if (object != null && this.intersection != null) {
      this.pointerCapture = { object, intersection: this.intersection };
      (_c = this.parentSetPointerCapture) == null ? void 0 : _c.call(this);
    }
  }
  getButtonsDown() {
    return this.buttonsDown;
  }
  /**
   * @returns undefined if no intersection was executed yet
   */
  getIntersection() {
    return this.intersection;
  }
  getEnabled() {
    return this.enabled;
  }
  setEnabled(enabled, nativeEvent, commit = true) {
    var _a;
    if (this.enabled === enabled) {
      return;
    }
    if (!enabled && this.pointerCapture != null) {
      (_a = this.parentReleasePointerCapture) == null ? void 0 : _a.call(this);
      this.pointerCapture = void 0;
    }
    this.enabled = enabled;
    if (commit) {
      this.commit(nativeEvent, false);
    }
  }
  computeIntersection(type, scene, nativeEvent) {
    if (this.pointerCapture != null) {
      return this.intersector.intersectPointerCapture(this.pointerCapture, nativeEvent);
    }
    this.intersector.startIntersection(nativeEvent);
    intersectPointerEventTargets(type, scene, [this]);
    return this.intersector.finalizeIntersection(scene);
  }
  setIntersection(intersection) {
    this.intersection = intersection;
  }
  commit(nativeEvent, emitMove) {
    var _a;
    const camera = this.getCamera();
    const prevIntersection = this.prevEnabled ? this.prevIntersection : void 0;
    const intersection = this.enabled ? this.intersection : void 0;
    if (prevIntersection != null && prevIntersection.object != (intersection == null ? void 0 : intersection.object)) {
      emitPointerEvent(new PointerEvent("pointerout", true, nativeEvent, this, prevIntersection, camera));
    }
    const pointerLeft = this.pointerEntered;
    this.pointerEntered = [];
    this.pointerEnteredHelper.length = 0;
    computeEnterLeave(intersection == null ? void 0 : intersection.object, this.pointerEntered, pointerLeft, this.pointerEnteredHelper);
    const length = pointerLeft.length;
    for (let i = 0; i < length; i++) {
      const object = pointerLeft[i];
      emitPointerEvent(new PointerEvent("pointerleave", false, nativeEvent, this, prevIntersection, camera, object));
    }
    if (intersection != null && (prevIntersection == null ? void 0 : prevIntersection.object) != intersection.object) {
      emitPointerEvent(new PointerEvent("pointerover", true, nativeEvent, this, intersection, camera));
    }
    for (let i = this.pointerEnteredHelper.length - 1; i >= 0; i--) {
      const object = this.pointerEnteredHelper[i];
      emitPointerEvent(new PointerEvent("pointerenter", false, nativeEvent, this, intersection, camera, object));
    }
    if (emitMove && intersection != null) {
      emitPointerEvent(new PointerEvent("pointermove", true, nativeEvent, this, intersection, camera));
    }
    this.prevIntersection = this.intersection;
    this.prevEnabled = this.enabled;
    if (!this.wasMoved && this.intersector.isReady()) {
      this.wasMoved = true;
      const length2 = this.onFirstMove.length;
      for (let i = 0; i < length2; i++) {
        this.onFirstMove[i](camera);
      }
      this.onFirstMove.length = 0;
    }
    (_a = this.onMoveCommited) == null ? void 0 : _a.call(this, this);
  }
  /**
   * computes and commits a move
   */
  move(scene, nativeEvent) {
    this.intersection = this.computeIntersection("pointer", scene, nativeEvent);
    this.commit(nativeEvent, true);
  }
  /**
   * computes and commits the pointer if a move has not yet occured
   */
  over(scene, nativeEvent) {
    if (!this.wasMoved) {
      this.intersection = this.computeIntersection("pointer", scene, nativeEvent);
      this.commit(nativeEvent, false);
    }
  }
  /**
   * emits a move without (re-)computing the intersection
   * just emitting a move event to the current intersection
   */
  emitMove(nativeEvent) {
    if (this.intersection == null) {
      return;
    }
    emitPointerEvent(new PointerEvent("pointermove", true, nativeEvent, this, this.intersection, this.getCamera()));
  }
  down(nativeEvent) {
    this.buttonsDown.add(nativeEvent.button);
    if (!this.enabled) {
      return;
    }
    if (!this.wasMoved) {
      this.onFirstMove.push(this.down.bind(this, nativeEvent));
      return;
    }
    if (this.intersection == null) {
      return;
    }
    emitPointerEvent(new PointerEvent("pointerdown", true, nativeEvent, this, this.intersection, this.getCamera()));
    const { object } = this.intersection;
    object[buttonsDownTimeKey] ?? (object[buttonsDownTimeKey] = /* @__PURE__ */ new Map());
    object[buttonsDownTimeKey].set(nativeEvent.button, nativeEvent.timeStamp);
    this.buttonsDownTime.set(nativeEvent.button, nativeEvent.timeStamp);
  }
  up(nativeEvent) {
    this.buttonsDown.delete(nativeEvent.button);
    if (!this.enabled) {
      return;
    }
    if (!this.wasMoved) {
      this.onFirstMove.push(this.up.bind(this, nativeEvent));
      return;
    }
    if (this.intersection == null) {
      return;
    }
    const { clickThesholdMs, contextMenuButton = 2, dblClickThresholdMs = 500, clickThresholdMs = clickThesholdMs ?? 300 } = this.options;
    this.pointerCapture = void 0;
    const isClicked = getIsClicked(this.buttonsDownTime, this.intersection.object[buttonsDownTimeKey], nativeEvent.button, nativeEvent.timeStamp, clickThresholdMs);
    const camera = this.getCamera();
    if (isClicked && nativeEvent.button === contextMenuButton) {
      emitPointerEvent(new PointerEvent("contextmenu", true, nativeEvent, this, this.intersection, camera));
    }
    emitPointerEvent(new PointerEvent("pointerup", true, nativeEvent, this, this.intersection, camera));
    if (!isClicked || nativeEvent.button === contextMenuButton) {
      return;
    }
    emitPointerEvent(new PointerEvent("click", true, nativeEvent, this, this.intersection, camera));
    const { object } = this.intersection;
    const buttonsClickTime = object[buttonsClickTimeKey] ?? (object[buttonsClickTimeKey] = /* @__PURE__ */ new Map());
    const buttonClickTime = buttonsClickTime.get(nativeEvent.button);
    if (buttonClickTime == null || nativeEvent.timeStamp - buttonClickTime > dblClickThresholdMs) {
      buttonsClickTime.set(nativeEvent.button, nativeEvent.timeStamp);
      return;
    }
    emitPointerEvent(new PointerEvent("dblclick", true, nativeEvent, this, this.intersection, camera));
    buttonsClickTime.delete(nativeEvent.button);
  }
  cancel(nativeEvent) {
    if (!this.enabled) {
      return;
    }
    if (!this.wasMoved) {
      this.onFirstMove.push(this.cancel.bind(this, nativeEvent));
      return;
    }
    if (this.intersection == null) {
      return;
    }
    emitPointerEvent(new PointerEvent("pointercancel", true, nativeEvent, this, this.intersection, this.getCamera()));
  }
  wheel(scene, nativeEvent, useMoveIntersection = false) {
    if (!this.enabled) {
      return;
    }
    if (!this.wasMoved && useMoveIntersection) {
      this.onFirstMove.push(this.wheel.bind(this, scene, nativeEvent, useMoveIntersection));
      return;
    }
    if (!useMoveIntersection) {
      this.wheelIntersection = this.computeIntersection("wheel", scene, nativeEvent);
    }
    const intersection = useMoveIntersection ? this.intersection : this.wheelIntersection;
    if (intersection == null) {
      return;
    }
    emitPointerEvent(new WheelEvent(nativeEvent, this, intersection, this.getCamera()));
  }
  emitWheel(nativeEvent, useMoveIntersection = false) {
    if (!this.enabled) {
      return;
    }
    if (!this.wasMoved && useMoveIntersection) {
      this.onFirstMove.push(this.emitWheel.bind(this, nativeEvent, useMoveIntersection));
      return;
    }
    const intersection = useMoveIntersection ? this.intersection : this.wheelIntersection;
    if (intersection == null) {
      return;
    }
    emitPointerEvent(new WheelEvent(nativeEvent, this, intersection, this.getCamera()));
  }
  exit(nativeEvent) {
    var _a;
    if (this.wasMoved) {
      if (this.pointerCapture != null) {
        (_a = this.parentReleasePointerCapture) == null ? void 0 : _a.call(this);
        this.pointerCapture = void 0;
      }
      this.intersection = void 0;
      this.commit(nativeEvent, false);
    }
    this.onFirstMove.length = 0;
    this.wasMoved = false;
  }
};
function computeEnterLeave(currentObject, targetAllAncestors, targeDiffRemovedAncestors, targetDiffAddedAncestors) {
  if (currentObject == null) {
    return;
  }
  const index = targeDiffRemovedAncestors.indexOf(currentObject);
  if (index != -1) {
    targeDiffRemovedAncestors.splice(index, 1);
  } else {
    targetDiffAddedAncestors.push(currentObject);
  }
  targetAllAncestors.push(currentObject);
  computeEnterLeave(currentObject.parent, targetAllAncestors, targeDiffRemovedAncestors, targetDiffAddedAncestors);
}
function getIsClicked(pointerButtonsPressTime, objectButtonsDownTime, button, buttonUpTime, clickThresholdMs) {
  if (objectButtonsDownTime == null) {
    return false;
  }
  const objectButtonPressTime = objectButtonsDownTime.get(button);
  if (objectButtonPressTime == null) {
    return false;
  }
  if (buttonUpTime - objectButtonPressTime > clickThresholdMs) {
    return false;
  }
  if (objectButtonPressTime != pointerButtonsPressTime.get(button)) {
    return false;
  }
  return true;
}

// node_modules/@pmndrs/pointer-events/dist/utils.js
var triangleHelper1 = new Triangle();
var triangleHelper2 = new Triangle();
var aVec2Helper = new Vector2();
var bVec2Helper = new Vector2();
var cVec2Helper = new Vector2();
var pointHelper = new Vector3();
var inverseMatrix = new Matrix4();
var localPointHelper = new Vector3();
function getClosestUV(target, point, mesh) {
  localPointHelper.copy(point).applyMatrix4(inverseMatrix.copy(mesh.matrixWorld).invert());
  const uv = mesh.geometry.attributes.uv;
  if (uv == null || !(uv instanceof BufferAttribute)) {
    return false;
  }
  let clostestDistance;
  loopThroughTriangles(mesh, (i1, i2, i3) => {
    mesh.getVertexPosition(i1, triangleHelper1.a);
    mesh.getVertexPosition(i2, triangleHelper1.b);
    mesh.getVertexPosition(i3, triangleHelper1.c);
    const distance = triangleHelper1.closestPointToPoint(localPointHelper, pointHelper).distanceTo(localPointHelper);
    if (clostestDistance != null && distance >= clostestDistance) {
      return;
    }
    clostestDistance = distance;
    triangleHelper2.copy(triangleHelper1);
    aVec2Helper.fromBufferAttribute(uv, i1);
    bVec2Helper.fromBufferAttribute(uv, i2);
    cVec2Helper.fromBufferAttribute(uv, i3);
  });
  if (clostestDistance == null) {
    return false;
  }
  triangleHelper2.closestPointToPoint(localPointHelper, pointHelper);
  triangleHelper2.getInterpolation(pointHelper, aVec2Helper, bVec2Helper, cVec2Helper, target);
  return true;
}
function loopThroughTriangles(mesh, fn) {
  const drawRange = mesh.geometry.drawRange;
  if (mesh.geometry.index != null) {
    const index = mesh.geometry.index;
    const start2 = Math.max(0, drawRange.start);
    const end2 = Math.min(index.count, drawRange.start + drawRange.count);
    for (let i = start2; i < end2; i += 3) {
      fn(index.getX(i), index.getX(i + 1), index.getX(i + 2));
    }
    return;
  }
  const position = mesh.geometry.attributes.position;
  if (position == null) {
    return;
  }
  const start = Math.max(0, drawRange.start);
  const end = Math.min(position.count, drawRange.start + drawRange.count);
  for (let i = start; i < end; i += 3) {
    fn(i, i + 1, i + 2);
  }
}

// node_modules/@pmndrs/pointer-events/dist/intersections/lines.js
var invertedMatrixHelper = new Matrix4();
var lineHelper = new Line3();
var scaleHelper = new Vector3();
var planeHelper = new Plane();
var rayHelper = new Ray();
var point2Helper = new Vector2();
var defaultLinePoints = [new Vector3(0, 0, 0), new Vector3(0, 0, 1)];

// node_modules/@pmndrs/pointer-events/dist/intersections/ray.js
var invertedMatrixHelper2 = new Matrix4();
var scaleHelper2 = new Vector3();
var NegZAxis = new Vector3(0, 0, -1);
var planeHelper2 = new Plane();
var point2Helper2 = new Vector2();
var directionHelper = new Vector3();
var ScreenRayIntersector = class {
  constructor(prepareTransformation, options) {
    __publicField(this, "prepareTransformation");
    __publicField(this, "options");
    __publicField(this, "raycaster", new Raycaster());
    __publicField(this, "cameraQuaternion", new Quaternion());
    __publicField(this, "fromPosition", new Vector3());
    __publicField(this, "fromQuaternion", new Quaternion());
    __publicField(this, "coords", new Vector2());
    __publicField(this, "viewPlane", new Plane());
    __publicField(this, "intersects", []);
    __publicField(this, "pointerEventsOrders", []);
    this.prepareTransformation = prepareTransformation;
    this.options = options;
  }
  isReady() {
    return true;
  }
  intersectPointerCapture({ intersection, object }, nativeEvent) {
    const details = intersection.details;
    if (details.type != "screen-ray") {
      throw new Error(`unable to process a pointer capture of type "${intersection.details.type}" with a camera ray intersector`);
    }
    if (!this.startIntersection(nativeEvent)) {
      return intersection;
    }
    this.viewPlane.constant -= details.distanceViewPlane;
    const point = this.raycaster.ray.intersectPlane(this.viewPlane, new Vector3());
    if (point == null) {
      return intersection;
    }
    intersection.object.updateWorldMatrix(true, false);
    computeIntersectionWorldPlane(this.viewPlane, intersection, intersection.object.matrixWorld);
    let uv = intersection.uv;
    if (intersection.object instanceof Mesh && getClosestUV(point2Helper2, point, intersection.object)) {
      uv = point2Helper2.clone();
    }
    return {
      ...intersection,
      details: {
        ...details,
        direction: this.raycaster.ray.direction.clone(),
        screenPoint: this.coords.clone()
      },
      uv,
      object,
      point,
      pointOnFace: point,
      pointerPosition: this.raycaster.ray.origin.clone(),
      pointerQuaternion: this.cameraQuaternion.clone()
    };
  }
  startIntersection(nativeEvent) {
    const from = this.prepareTransformation(nativeEvent, this.coords);
    if (from == null) {
      return false;
    }
    from.updateWorldMatrix(true, false);
    from.matrixWorld.decompose(this.fromPosition, this.fromQuaternion, scaleHelper2);
    this.raycaster.setFromCamera(this.coords, from);
    this.viewPlane.setFromNormalAndCoplanarPoint(from.getWorldDirection(directionHelper), this.raycaster.ray.origin);
    return true;
  }
  executeIntersection(object, objectPointerEventsOrder) {
    const start = this.intersects.length;
    object.raycast(this.raycaster, this.intersects);
    pushTimes(this.pointerEventsOrders, objectPointerEventsOrder, this.intersects.length - start);
  }
  finalizeIntersection(scene) {
    const pointerPosition = this.fromPosition.clone();
    const pointerQuaternion = this.cameraQuaternion.clone();
    const pointerDirection = this.raycaster.ray.direction.clone();
    const index = getDominantIntersectionIndex(this.intersects, this.pointerEventsOrders, this.options);
    const intersection = index == null ? void 0 : this.intersects[index];
    this.intersects.length = 0;
    this.pointerEventsOrders.length = 0;
    if (intersection == null) {
      return voidObjectIntersectionFromRay(scene, this.raycaster.ray, (_point, distance) => ({
        type: "screen-ray",
        distanceViewPlane: distance,
        screenPoint: this.coords.clone(),
        direction: pointerDirection
      }), pointerPosition, pointerQuaternion);
    }
    intersection.object.updateWorldMatrix(true, false);
    invertedMatrixHelper2.copy(intersection.object.matrixWorld).invert();
    return Object.assign(intersection, {
      details: {
        type: "screen-ray",
        distanceViewPlane: this.viewPlane.distanceToPoint(intersection.point),
        screenPoint: this.coords.clone(),
        direction: pointerDirection
      },
      pointOnFace: intersection.point,
      pointerPosition,
      pointerQuaternion,
      localPoint: intersection.point.clone().applyMatrix4(invertedMatrixHelper2)
    });
  }
};

// node_modules/@pmndrs/pointer-events/dist/intersections/sphere.js
var scaleHelper3 = new Vector3();
var point2Helper3 = new Vector2();
var matrixHelper = new Matrix4();
var oldInputDevicePointOffset = new Vector3();
var inputDeviceQuaternionOffset = new Quaternion();
var planeHelper3 = new Plane();
var helperSphere = new Sphere();
var vectorHelper = new Vector3();
var boxSizeHelper = new Vector3();
var boxCenterHelper = new Vector3();
var vec0_0001 = new Vector3(1e-4, 1e-4, 1e-4);
var invertedMatrixHelper3 = new Matrix4();

// node_modules/@pmndrs/pointer-events/dist/pointer/index.js
var pointerIdCounter = 23412;
function generateUniquePointerId() {
  return pointerIdCounter++;
}

// node_modules/@pmndrs/pointer-events/dist/forward.js
function htmlEventToCoords(element, e, target) {
  if (!(e instanceof globalThis.MouseEvent)) {
    return target.set(0, 0);
  }
  const { width, height, top, left } = element.getBoundingClientRect();
  const x = e.clientX - left;
  const y = e.clientY - top;
  return target.set(x / width * 2 - 1, -(y / height) * 2 + 1);
}
function forwardHtmlEvents(fromElement, getCamera, scene, options) {
  return forwardEvents(
    fromElement,
    //backwards compatibility
    typeof getCamera === "function" ? getCamera : () => getCamera,
    scene,
    htmlEventToCoords.bind(null, fromElement),
    fromElement.setPointerCapture.bind(fromElement),
    (pointerId) => {
      if (fromElement.hasPointerCapture(pointerId)) {
        fromElement.releasePointerCapture(pointerId);
      }
    },
    {
      pointerTypePrefix: "screen-",
      ...options
    }
  );
}
function forwardEvents(from, getCamera, scene, toCoords, setPointerCapture, releasePointerCapture, options = {}) {
  const forwardPointerCapture = (options == null ? void 0 : options.forwardPointerCapture) ?? true;
  const pointerMap = /* @__PURE__ */ new Map();
  const pointerTypePrefix = options.pointerTypePrefix ?? "forward-";
  const getInnerPointer = (event, eventType) => {
    let innerPointer = pointerMap.get(event.pointerId);
    if (innerPointer != null) {
      return innerPointer;
    }
    innerPointer = new Pointer(generateUniquePointerId(), `${pointerTypePrefix}${event.pointerType}`, event.pointerState, new ScreenRayIntersector((nativeEvent, coords) => {
      toCoords(nativeEvent, coords);
      return getCamera();
    }, options), getCamera, void 0, forwardPointerCapture ? setPointerCapture.bind(null, event.pointerId) : void 0, forwardPointerCapture ? releasePointerCapture.bind(null, event.pointerId) : void 0, options);
    if (eventType != "move" && eventType != "wheel") {
      innerPointer.setIntersection(innerPointer.computeIntersection("pointer", scene, event));
      innerPointer.commit(event, false);
    }
    pointerMap.set(event.pointerId, innerPointer);
    return innerPointer;
  };
  const latestWheelEventMap = /* @__PURE__ */ new Map();
  const latestMoveEventMap = /* @__PURE__ */ new Map();
  const movedPointerList = [];
  const eventList = [];
  const emitEvent = (type, event, pointer) => {
    switch (type) {
      case "move":
        pointer.move(scene, event);
        return;
      case "over":
        pointer.move(scene, event);
        return;
      case "wheel":
        pointer.wheel(scene, event);
        return;
      case "cancel":
        pointer.cancel(event);
        return;
      case "down":
        if (!hasButton(event)) {
          return;
        }
        pointer.down(event);
        return;
      case "up":
        if (!hasButton(event)) {
          return;
        }
        pointer.up(event);
        return;
      case "exit":
        latestMoveEventMap.delete(pointer);
        latestWheelEventMap.delete(pointer);
        pointer.exit(event);
        return;
    }
  };
  const onEvent = (type, event) => {
    const pointer = getInnerPointer(event, type);
    if (type === "move") {
      latestMoveEventMap.set(pointer, event);
    }
    if (type === "wheel") {
      latestWheelEventMap.set(pointer, event);
    }
    if (options.batchEvents ?? true) {
      eventList.push({ type, event });
    } else {
      emitEvent(type, event, pointer);
    }
  };
  const pointerMoveListener = onEvent.bind(null, "move");
  const pointerOverListener = onEvent.bind(null, "over");
  const pointerCancelListener = onEvent.bind(null, "cancel");
  const pointerDownListener = onEvent.bind(null, "down");
  const pointerUpListener = onEvent.bind(null, "up");
  const wheelListener = onEvent.bind(null, "wheel");
  const pointerLeaveListener = onEvent.bind(null, "exit");
  from.addEventListener("pointermove", pointerMoveListener);
  from.addEventListener("pointerover", pointerOverListener);
  from.addEventListener("pointercancel", pointerCancelListener);
  from.addEventListener("pointerdown", pointerDownListener);
  from.addEventListener("pointerup", pointerUpListener);
  from.addEventListener("wheel", wheelListener);
  from.addEventListener("pointerleave", pointerLeaveListener);
  return {
    destroy() {
      from.removeEventListener("pointermove", pointerMoveListener);
      from.removeEventListener("pointerover", pointerOverListener);
      from.removeEventListener("pointercancel", pointerCancelListener);
      from.removeEventListener("pointerdown", pointerDownListener);
      from.removeEventListener("pointerup", pointerUpListener);
      from.removeEventListener("wheel", wheelListener);
      from.removeEventListener("pointerleave", pointerLeaveListener);
      latestMoveEventMap.clear();
      latestWheelEventMap.clear();
    },
    update() {
      const length = eventList.length;
      for (let i = 0; i < length; i++) {
        const { type, event } = eventList[i];
        const pointer = getInnerPointer(event, type);
        if (type === "move") {
          movedPointerList.push(pointer);
          if (latestMoveEventMap.get(pointer) != event) {
            pointer.emitMove(event);
            continue;
          }
        }
        if (type === "wheel" && latestWheelEventMap.get(pointer) != event) {
          pointer.emitWheel(event);
          continue;
        }
        emitEvent(type, event, pointer);
      }
      eventList.length = 0;
      if (options.intersectEveryFrame ?? false) {
        for (const [pointer, event] of latestMoveEventMap.entries()) {
          if (movedPointerList.includes(pointer)) {
            continue;
          }
          pointer.move(scene, event);
        }
      }
      movedPointerList.length = 0;
    }
  };
}
function hasButton(val) {
  return val.button != null;
}

// node_modules/@tresjs/core/dist/tres.js
var version = "5.8.0";
function makeMap(str) {
  const map = /* @__PURE__ */ Object.create(null);
  for (const key of str.split(",")) map[key] = 1;
  return (val) => val in map;
}
var HTML_TAGS = "html,body,base,head,link,meta,style,title,address,article,aside,footer,header,hgroup,h1,h2,h3,h4,h5,h6,nav,section,div,dd,dl,dt,figcaption,figure,picture,hr,img,li,main,ol,p,pre,ul,a,b,abbr,bdi,bdo,br,cite,code,data,dfn,em,i,kbd,mark,q,rp,rt,ruby,s,samp,small,span,strong,sub,sup,time,u,var,wbr,area,audio,map,track,video,embed,object,param,source,canvas,script,noscript,del,ins,caption,col,colgroup,table,thead,tbody,td,th,tr,button,datalist,fieldset,form,input,label,legend,meter,optgroup,option,output,progress,select,textarea,details,dialog,menu,summary,template,blockquote,iframe,tfoot";
var isHTMLTag = makeMap(HTML_TAGS);
var createTypeGuard = (property) => (value) => isObject2(value) && property in value && !!value[property];
var isObject3D = createTypeGuard("isObject3D");
var isMesh = createTypeGuard("isMesh");
var isCamera = createTypeGuard("isCamera");
var isOrthographicCamera = createTypeGuard("isOrthographicCamera");
var isPerspectiveCamera = createTypeGuard("isPerspectiveCamera");
var isColor = createTypeGuard("isColor");
var isColorRepresentation = (value) => isString(value) || isNumber(value) || isColor(value);
var isLayers = (value) => value instanceof Layers;
var isBufferGeometry = createTypeGuard("isBufferGeometry");
var isMaterial = createTypeGuard("isMaterial");
var isLight = createTypeGuard("isLight");
var isFog = createTypeGuard("isFog");
var isScene = createTypeGuard("isScene");
var isGroup = createTypeGuard("isGroup");
var isVectorLike = (value) => value !== null && typeof value === "object" && "set" in value && typeof value.set === "function";
var isCopyable = (value) => isVectorLike(value) && "copy" in value && typeof value.copy === "function";
var isClassInstance = (object) => !!(object == null ? void 0 : object.constructor);
var isTresCamera = (value) => isCamera(value) || isOrthographicCamera(value) || isPerspectiveCamera(value);
var isTresObject = (value) => isObject3D(value) || isBufferGeometry(value) || isMaterial(value) || isFog(value);
var isTresPrimitive = createTypeGuard("isPrimitive");
var isTresInstance = (value) => isTresObject(value) && "__tres" in value;
var filterInPlace = (array, callbackFn) => {
  let i = 0;
  for (let ii = 0; ii < array.length; ii++) if (callbackFn(array[ii], ii)) {
    array[i] = array[ii];
    i++;
  }
  array.length = i;
  return array;
};
function resolveRuntimeMode() {
  var _a, _b;
  try {
    const modeFromImportMeta = (_b = (_a = import.meta) == null ? void 0 : _a.env) == null ? void 0 : _b.MODE;
    if (modeFromImportMeta) return modeFromImportMeta;
  } catch {
  }
  return typeof process !== "undefined" && process.env && "development" ? "development" : "production";
}
var isProd = resolveRuntimeMode() === "production";
var logPrefix = "[TresJS ▲ ■ ●] ";
function logError(...args) {
  if (typeof args[0] === "string") args[0] = logPrefix + args[0];
  else args.unshift(logPrefix);
  console.error(...args);
}
function logWarning(...args) {
  if (typeof args[0] === "string") args[0] = logPrefix + args[0];
  else args.unshift(logPrefix);
  console.warn(...args);
}
function logMessage(name, value) {
  if (!isProd) console.log(`${logPrefix} - ${name}:`, value);
}
function disposeMaterial(material) {
  const hasMap = (material$1) => "map" in material$1 && !!material$1.map;
  if (hasMap(material)) material.map.dispose();
  material.dispose();
}
function disposeObject3D(object) {
  var _a, _b;
  if (object.parent) (_a = object.removeFromParent) == null ? void 0 : _a.call(object);
  delete object.__tres;
  [...object.children].forEach((child) => disposeObject3D(child));
  if (object instanceof Scene) {
  } else {
    const mesh = object;
    if (object) (_b = object.dispose) == null ? void 0 : _b.call(object);
    if (mesh.geometry) mesh.geometry.dispose();
    if (Array.isArray(mesh.material)) mesh.material.forEach((material) => disposeMaterial(material));
    else if (mesh.material) disposeMaterial(mesh.material);
  }
}
function resolve(obj, key) {
  let target = obj;
  if (key.includes("-")) {
    const entries = key.split("-");
    let currKey = entries.shift();
    while (target && entries.length) if (!(currKey in target)) currKey = joinAsCamelCase(currKey, entries.shift());
    else {
      target = target[currKey];
      currKey = entries.shift();
    }
    return {
      target,
      key: joinAsCamelCase(currKey, ...entries)
    };
  } else return {
    target,
    key
  };
}
function joinAsCamelCase(...strings) {
  return strings.map((s, i) => i === 0 ? s : s.charAt(0).toUpperCase() + s.slice(1)).join("");
}
function attach(parent, child, type) {
  const INDEX_REGEX = /-\d+$/;
  if (isString(type)) {
    if (INDEX_REGEX.test(type)) {
      const { target: target$1, key: key$1 } = resolve(parent, type.replace(INDEX_REGEX, ""));
      if (!Array.isArray(target$1[key$1])) {
        const previousAttach = target$1[key$1];
        const augmentedArray = [];
        augmentedArray.__tresDetach = () => {
          if (augmentedArray.every((v) => isUndefined(v))) target$1[key$1] = previousAttach;
        };
        target$1[key$1] = augmentedArray;
      }
    }
    const { target, key } = resolve(parent, type);
    child.__tres.previousAttach = target[key];
    target[key] = unboxTresPrimitive(child);
  } else child.__tres.previousAttach = type(parent, child);
}
function detach(parent, child, type) {
  var _a, _b, _c;
  if (isString(type)) {
    const { target, key } = resolve(parent, type);
    const previous = child.__tres.previousAttach;
    if (previous === void 0) delete target[key];
    else target[key] = previous;
    if ("__tresDetach" in target) target.__tresDetach();
  } else (_b = (_a = child.__tres) == null ? void 0 : _a.previousAttach) == null ? void 0 : _b.call(_a, parent, child);
  (_c = child.__tres) == null ? true : delete _c.previousAttach;
}
function prepareTresInstance(obj, state, context) {
  const instance = obj;
  instance.__tres = {
    type: "unknown",
    root: context,
    memoizedProps: {},
    objects: [],
    parent: null,
    previousAttach: null,
    ...state
  };
  if (!instance.__tres.attach) {
    if (isMaterial(instance)) instance.__tres.attach = "material";
    else if (isBufferGeometry(instance)) instance.__tres.attach = "geometry";
    else if (isFog(instance)) instance.__tres.attach = "fog";
  }
  return instance;
}
function invalidateInstance(instance) {
  var _a;
  const ctx = (_a = instance == null ? void 0 : instance.__tres) == null ? void 0 : _a.root;
  if (!(ctx == null ? void 0 : ctx.renderer)) return;
  if (ctx.renderer.canBeInvalidated.value) ctx.renderer.invalidate();
}
function setPrimitiveObject(newObject, primitive, setTarget, nodeOpsFns, context) {
  const objectsToAttach = [...primitive.__tres.objects];
  const oldObject = unboxTresPrimitive(primitive);
  newObject = unboxTresPrimitive(newObject);
  if (oldObject === newObject) return true;
  const newInstance = prepareTresInstance(newObject, primitive.__tres ?? {}, context);
  const parent = primitive.parent ?? primitive.__tres.parent ?? null;
  const propsToPatch = { ...primitive.__tres.memoizedProps };
  delete propsToPatch.object;
  for (const obj of objectsToAttach) {
    doRemoveDetach(obj, context);
    doRemoveDeregister(obj, context);
  }
  oldObject.__tres.objects = [];
  nodeOpsFns.remove(primitive);
  for (const [key, value] of Object.entries(propsToPatch)) nodeOpsFns.patchProp(newInstance, key, newInstance[key], value);
  setTarget(newObject);
  nodeOpsFns.insert(primitive, parent);
  for (const obj of objectsToAttach) nodeOpsFns.insert(obj, primitive);
  return true;
}
function unboxTresPrimitive(maybePrimitive) {
  if (isTresPrimitive(maybePrimitive)) {
    const primitive = maybePrimitive;
    primitive.object.__tres = primitive.__tres;
    return primitive.object;
  } else return maybePrimitive;
}
function doRemoveDetach(node, context) {
  var _a, _b, _c, _d;
  const parent = ((_a = node.__tres) == null ? void 0 : _a.parent) || context.scene.value;
  if (node.__tres) node.__tres.parent = null;
  if (parent && parent.__tres && "objects" in parent.__tres) filterInPlace(parent.__tres.objects, (obj) => obj !== node);
  if ((_b = node.__tres) == null ? void 0 : _b.attach) detach(parent, node, node.__tres.attach);
  else {
    (_d = (_c = node.parent) == null ? void 0 : _c.remove) == null ? void 0 : _d.call(_c, unboxTresPrimitive(node));
    node.parent = null;
  }
}
function doRemoveDeregister(node, context) {
  var _a;
  (_a = node.traverse) == null ? void 0 : _a.call(node, (child) => {
    if (isTresCamera(child)) context.camera.deregisterCamera(child);
  });
  if (isTresCamera(node)) context.camera.deregisterCamera(node);
  invalidateInstance(node);
}
function useLoader(Loader$1, path, options) {
  var _a;
  const proto = new Loader$1(options == null ? void 0 : options.manager);
  const progress = reactive({
    loaded: 0,
    total: 0,
    percentage: 0
  });
  if (options == null ? void 0 : options.extensions) options.extensions(proto);
  const initialPath = toValue(path);
  const result = useAsyncState((path$1) => new Promise((resolve$1, reject) => {
    const assetPath = path$1 || initialPath || "";
    proto.load(assetPath, (result$1) => {
      resolve$1(result$1);
    }, (event) => {
      progress.loaded = event.loaded;
      progress.total = event.total;
      progress.percentage = progress.loaded / progress.total * 100;
    }, (err) => {
      reject(err);
    });
  }), (options == null ? void 0 : options.initialValue) ?? null, {
    ...options == null ? void 0 : options.asyncOptions,
    immediate: ((_a = options == null ? void 0 : options.asyncOptions) == null ? void 0 : _a.immediate) ?? true
  });
  const unsub = watch(() => toValue(path), (newPath) => {
    if (newPath) {
      const value = result.state.value;
      if (value && typeof value === "object" && "scene" in value && value.scene) disposeObject3D(value.scene);
      result.execute(0, newPath);
    }
  });
  onUnmounted(() => {
    unsub();
    const value = result.state.value;
    if (value && typeof value === "object" && "scene" in value && value.scene) disposeObject3D(value.scene);
  });
  return {
    ...result,
    load: (path$1) => {
      result.execute(0, path$1);
    },
    progress
  };
}
var component_vue_vue_type_script_setup_true_lang_default = defineComponent({
  __name: "component",
  props: {
    loader: {
      type: null,
      required: true
    },
    path: {
      type: String,
      required: true
    },
    manager: {
      type: Object,
      required: false
    }
  },
  emits: ["loaded", "error"],
  setup(__props, { emit: __emit }) {
    const props = __props;
    const emit = __emit;
    const { state, isLoading, error } = useLoader(props.loader, props.path, { manager: props.manager });
    whenever(error, (err) => {
      if (err) emit("error", err);
    });
    whenever(state, (value) => {
      if (value) emit("loaded", value);
    });
    return (_ctx, _cache) => {
      return renderSlot(_ctx.$slots, "default", {
        state: unref(state),
        isLoading: unref(isLoading),
        error: unref(error)
      });
    };
  }
});
var component_default = component_vue_vue_type_script_setup_true_lang_default;
var useCameraManager = ({ sizes }) => {
  const cameras = ref([]);
  const activeCamera = computed(() => cameras.value[0]);
  const setActiveCamera = (cameraOrUuid) => {
    const camera = isCamera(cameraOrUuid) ? cameraOrUuid : cameras.value.find((camera$1) => camera$1.uuid === cameraOrUuid);
    if (!camera) return;
    cameras.value = [camera, ...cameras.value.filter(({ uuid }) => uuid !== camera.uuid)];
  };
  const registerCamera = (camera, active = false) => {
    if (cameras.value.some(({ uuid }) => uuid === camera.uuid)) return;
    cameras.value.push(camera);
    if (active) setActiveCamera(camera.uuid);
  };
  const deregisterCamera = (camera) => {
    cameras.value = cameras.value.filter(({ uuid }) => uuid !== camera.uuid);
  };
  watchEffect(() => {
    if (sizes.aspectRatio.value) cameras.value.forEach((camera) => {
      if (isPerspectiveCamera(camera)) {
        camera.aspect = sizes.aspectRatio.value;
        camera.updateProjectionMatrix();
      }
    });
  });
  return {
    activeCamera,
    cameras,
    registerCamera,
    deregisterCamera,
    setActiveCamera
  };
};
function buildGraph(object) {
  const data = {
    nodes: {},
    materials: {},
    meshes: {}
  };
  if (object) object.traverse((obj) => {
    if (obj.name) data.nodes[obj.name] = obj;
    if (isMesh(obj)) {
      if (!data.meshes[obj.name]) data.meshes[obj.name] = obj;
      (Array.isArray(obj.material) ? obj.material : [obj.material]).forEach((material) => {
        if (material.name && !data.materials[material.name]) data.materials[material.name] = material;
      });
    }
  });
  return data;
}
var useGraph = (object) => {
  return computed(() => {
    const obj = toValue(object);
    if (!obj) return;
    return buildGraph(obj);
  });
};
function createPriorityEventHook() {
  const eventToPriority = /* @__PURE__ */ new Map();
  const ascending = /* @__PURE__ */ new Set();
  let ADD_COUNT = 0;
  let dirty = false;
  const sort = () => {
    const sorted = Array.from(eventToPriority.entries()).sort((a, b) => {
      const priorityDiff = a[1].priority - b[1].priority;
      return priorityDiff === 0 ? a[1].addI - b[1].addI : priorityDiff;
    });
    ascending.clear();
    sorted.forEach((entry) => ascending.add(entry[0]));
  };
  const off = (fn) => {
    eventToPriority.delete(fn);
    ascending.delete(fn);
  };
  const on = (fn, priority = 0) => {
    eventToPriority.set(fn, {
      priority,
      addI: ADD_COUNT++
    });
    const offFn = () => off(fn);
    tryOnScopeDispose(offFn);
    dirty = true;
    return { off: offFn };
  };
  const trigger = (...args) => {
    if (dirty) {
      sort();
      dirty = false;
    }
    return Promise.all(Array.from(ascending).map((fn) => fn(...args)));
  };
  const dispose = () => {
    eventToPriority.clear();
    ascending.clear();
  };
  return {
    on,
    off,
    trigger,
    dispose,
    get count() {
      return eventToPriority.size;
    }
  };
}
var catalogue = ref({});
var extend = (objects) => Object.assign(catalogue.value, objects);
var setPixelRatio = (renderer, systemDpr, userDpr) => {
  var _a;
  if (!isFunction(renderer.setPixelRatio)) return;
  let newDpr = 0;
  if (userDpr && Array.isArray(userDpr) && userDpr.length >= 2) {
    const [min, max] = userDpr;
    newDpr = MathUtils.clamp(systemDpr, min, max);
  } else if (isNumber(userDpr)) newDpr = userDpr;
  else newDpr = systemDpr;
  if (newDpr !== ((_a = renderer.getPixelRatio) == null ? void 0 : _a.call(renderer))) renderer.setPixelRatio(newDpr);
};
var revision = Number.parseInt(REVISION.replace("dev", ""));
var TIMER_MIN_REVISION = 179;
function createTimer() {
  if (revision >= TIMER_MIN_REVISION) {
    const timer = new (void 0)();
    return {
      getDelta: () => timer.getDelta(),
      getElapsed: () => timer.getElapsed(),
      update: () => timer.update(),
      start: () => {
        if (typeof document !== "undefined") timer.connect(document);
      },
      stop: () => timer.disconnect()
    };
  } else {
    const clock = new Clock();
    return {
      getDelta: () => clock.getDelta(),
      getElapsed: () => clock.elapsedTime,
      update: () => {
      },
      start: () => clock.start(),
      stop: () => clock.stop()
    };
  }
}
var useCreateRafLoop = (cycleFn, { fpsLimit } = {}) => {
  const timer = createTimer();
  const eventHooks = {
    before: createEventHook(),
    after: createEventHook()
  };
  const { pause, resume, isActive } = useRafFn(() => {
    timer.update();
    const context = {
      delta: timer.getDelta(),
      elapsed: timer.getElapsed()
    };
    eventHooks.before.trigger(context);
    cycleFn();
    eventHooks.after.trigger(context);
  }, {
    immediate: false,
    fpsLimit
  });
  const start = () => {
    timer.start();
    resume();
  };
  const stop = () => {
    timer.stop();
    pause();
  };
  return {
    start,
    stop,
    isActive,
    onBeforeLoop: eventHooks.before.on,
    onLoop: eventHooks.after.on
  };
};
var TresRendererError = class extends Error {
  constructor(message, code, options) {
    super(message, options);
    __publicField(this, "name", "TresRendererError");
    this.code = code;
  }
};
function useRendererManager({ scene, canvas, options, fpsLimit, contextParts: { sizes, camera } }) {
  const getRenderer = () => {
    if (isFunction(options.renderer)) return options.renderer({
      sizes,
      scene,
      camera,
      canvas
    });
    return new WebGLRenderer({
      ...options,
      canvas: unrefElement(canvas)
    });
  };
  const renderer = getRenderer();
  const frames = ref(toValue(options.renderMode) === "manual" ? 0 : 1);
  const maxFrames = 60;
  const canBeInvalidated = computed(() => toValue(options.renderMode) === "on-demand" && frames.value === 0);
  const forceMaterialUpdate = () => scene.value.traverse((child) => {
    if (child instanceof Mesh && child.material instanceof Material) child.material.needsUpdate = true;
  });
  const invalidate = (amountOfFramesToInvalidate = 1) => {
    if (!canBeInvalidated.value) return;
    frames.value = Math.min(maxFrames, frames.value + amountOfFramesToInvalidate);
  };
  const advance = () => {
    if (toValue(options.renderMode) !== "manual") throw new Error("advance can only be called in manual render mode.");
    frames.value = 1;
  };
  const invalidateOnDemand = () => {
    if (toValue(options.renderMode) === "on-demand") invalidate();
  };
  const isModeAlways = computed(() => toValue(options.renderMode) === "always");
  const isRenderer = (value) => isObject2(value) && "isRenderer" in value && Boolean(value.isRenderer);
  const readyEventHook = createEventHook();
  const errorEventHook = createEventHook();
  let hasTriggeredReady = false;
  const isInitialized = ref(false);
  const error = ref(null);
  const initializeRenderer = async () => {
    try {
      if (isRenderer(renderer)) await renderer.init();
      isInitialized.value = true;
    } catch (e) {
      const rendererError = new TresRendererError(e instanceof Error ? e.message : "Unknown error", "INITIALIZATION_FAILED", { cause: e instanceof Error ? e : void 0 });
      error.value = rendererError;
      console.error(`[TresJS] Renderer initialization failed. This may occur if:
  - WebGPU is not supported by your browser
  - GPU is not available or lacks required features
  - GPU drivers are outdated
Error details: ${rendererError.message}`, rendererError);
      errorEventHook.trigger(rendererError);
    }
  };
  const renderEventHook = createEventHook();
  const notifyFrameRendered = () => {
    frames.value = isModeAlways.value ? 1 : Math.max(0, frames.value - 1);
    renderEventHook.trigger(renderer);
  };
  let renderFunction = (_notifyFrameRendered) => {
    if (camera.activeCamera.value) {
      renderer.render(scene.value, camera.activeCamera.value);
      _notifyFrameRendered();
    }
  };
  const replaceRenderFunction = (fn) => {
    renderFunction = fn;
  };
  const loop = useCreateRafLoop(() => {
    if (frames.value) renderFunction(notifyFrameRendered);
  }, { fpsLimit });
  readyEventHook.on(() => {
    if (isInitialized.value) loop.start();
  });
  watch([
    sizes.width,
    sizes.height,
    isInitialized
  ], () => {
    if (!isInitialized.value) return;
    renderer.setSize(sizes.width.value, sizes.height.value);
    if (!hasTriggeredReady && renderer.domElement.width && renderer.domElement.height) {
      hasTriggeredReady = true;
      nextTick(() => {
        readyEventHook.trigger(renderer);
      });
    }
    invalidateOnDemand();
  }, { immediate: true });
  watchEffect(() => {
    if (!isInitialized.value) return;
    setPixelRatio(renderer, sizes.pixelRatio.value, toValue(options.dpr));
  });
  initializeRenderer();
  if (toValue(options.renderMode) === "on-demand") invalidate();
  if (toValue(options.renderMode) === "manual") useTimeout(100, { callback: advance });
  const clearColorAndAlpha = computed(() => {
    const clearColor = toValue(options.clearColor);
    const clearAlpha = toValue(options.clearAlpha);
    const isClearColorWithAlpha = typeof clearColor === "string" && clearColor.length === 9 && clearColor.startsWith("#");
    if (isClearColorWithAlpha && clearAlpha !== void 0) logWarning(`clearColor with alpha (e.g. ${clearColor}) and clearAlpha cannot both be set, using clearColor as source of truth`);
    if (isClearColorWithAlpha) return {
      alpha: Number.parseInt(clearColor.slice(7, 9), 16) / 255,
      color: clearColor.slice(0, 7)
    };
    return {
      alpha: clearAlpha,
      color: clearColor
    };
  });
  watchEffect(() => {
    if (!isInitialized.value) return;
    const value = clearColorAndAlpha.value;
    if (value.color === void 0 || value.alpha === void 0) return;
    renderer.setClearColor(value.color, value.alpha);
  });
  watchEffect(() => {
    if (!isInitialized.value) return;
    const value = options.toneMapping;
    if (value) renderer.toneMapping = value;
  });
  watchEffect(() => {
    if (!isInitialized.value) return;
    const value = options.toneMappingExposure;
    if (value) renderer.toneMappingExposure = value;
  });
  watchEffect(() => {
    if (!isInitialized.value) return;
    const value = options.outputColorSpace;
    if (value) renderer.outputColorSpace = value;
  });
  watchEffect(() => {
    if (!isInitialized.value) return;
    const value = options.shadows;
    if (value === void 0) return;
    renderer.shadowMap.enabled = value;
    forceMaterialUpdate();
  });
  watchEffect(() => {
    if (!isInitialized.value) return;
    const value = options.shadowMapType;
    if (value === void 0) return;
    renderer.shadowMap.type = value;
    forceMaterialUpdate();
  });
  onUnmounted(() => {
    renderer.dispose();
    if ("forceContextLoss" in renderer) renderer.forceContextLoss();
  });
  return {
    loop,
    instance: renderer,
    advance,
    onReady: readyEventHook.on,
    onRender: renderEventHook.on,
    onError: errorEventHook.on,
    invalidate,
    canBeInvalidated,
    mode: toValue(options.renderMode),
    replaceRenderFunction,
    isInitialized,
    error
  };
}
function useSizes(windowSize, canvas, debounceMs = 10) {
  const { pixelRatio } = useDevicePixelRatio();
  const reactiveSize = toValue(windowSize) ? useWindowSize() : useElementSize(computed(() => toValue(canvas).parentElement));
  const debouncedReactiveWidth = readonly(refDebounced(reactiveSize.width, debounceMs));
  const debouncedReactiveHeight = readonly(refDebounced(reactiveSize.height, debounceMs));
  return {
    width: debouncedReactiveWidth,
    height: debouncedReactiveHeight,
    pixelRatio,
    aspectRatio: computed(() => debouncedReactiveWidth.value / debouncedReactiveHeight.value)
  };
}
function useEventManager({ canvas, contextParts: { scene, camera, renderer } }) {
  const { update, destroy } = forwardHtmlEvents(toValue(canvas), () => toValue(camera.activeCamera), scene.value);
  const { off } = renderer.loop.onLoop(update);
  onUnmounted(destroy);
  onUnmounted(off);
  const voidObject = getVoidObject(scene.value);
  const pointerMissedEventHook = createEventHook();
  voidObject.addEventListener("click", pointerMissedEventHook.trigger);
  return { onPointerMissed: pointerMissedEventHook.on };
}
var INJECTION_KEY = "useTres";
var [useTresContextProvider, _useTresContext] = createInjectionState(({ scene, canvas, fpsLimit, windowSize, rendererOptions }) => {
  const localScene = shallowRef(scene);
  const sizes = useSizes(windowSize, canvas);
  const camera = useCameraManager({ sizes });
  const renderer = useRendererManager({
    scene: localScene,
    canvas,
    options: rendererOptions,
    fpsLimit,
    contextParts: {
      sizes,
      camera
    }
  });
  const events = useEventManager({
    canvas,
    contextParts: {
      scene: localScene,
      camera,
      renderer
    }
  });
  const ctx = {
    sizes,
    scene: localScene,
    camera,
    renderer,
    controls: ref(null),
    extend,
    events
  };
  ctx.scene.value.__tres = {
    root: ctx,
    objects: [],
    isUnmounting: false
  };
  return ctx;
}, { injectionKey: "useTres" });
var useTresContext = () => {
  const ctx = _useTresContext();
  if (!ctx) throw new Error("useTresContext must be used together with useTresContextProvider.\n You probably tried to use it above or on the same level as a TresCanvas component.\n It should be used in child components of a TresCanvas instance.");
  return ctx;
};
function useTres() {
  const { scene, renderer, camera, sizes, controls, extend: extend$1, events } = useTresContext();
  return {
    scene,
    renderer: renderer.instance,
    camera: camera.activeCamera,
    sizes,
    controls,
    extend: extend$1,
    events,
    invalidate: renderer.invalidate,
    advance: renderer.advance
  };
}
var useLoop = () => {
  const tresContext = useTres();
  const { renderer: rendererManager } = useTresContext();
  const eventHookBeforeRender = createPriorityEventHook();
  const eventHookAfterRender = createPriorityEventHook();
  rendererManager.loop.onBeforeLoop((loopContext) => {
    eventHookBeforeRender.trigger({
      ...tresContext,
      ...loopContext
    });
  });
  rendererManager.loop.onLoop((loopContext) => {
    eventHookAfterRender.trigger({
      ...tresContext,
      ...loopContext
    });
  });
  const render = rendererManager.replaceRenderFunction;
  return {
    stop: rendererManager.loop.stop,
    start: rendererManager.loop.start,
    isActive: rendererManager.loop.isActive,
    onBeforeRender: eventHookBeforeRender.on,
    onRender: eventHookAfterRender.on,
    render
  };
};
function createRetargetingProxy(target, getters = {}, setters = {}) {
  let _target = target;
  const setTarget = (newTarget) => {
    _target = newTarget;
  };
  let proxy = new Proxy({}, {});
  proxy = new Proxy({}, {
    has(_, key) {
      return key in getters || key in _target;
    },
    get(_, prop, __) {
      if (prop in getters) return getters[prop](_target);
      return _target[prop];
    },
    set(_, prop, val) {
      if (setters[prop]) setters[prop](val, _target, proxy, setTarget);
      else _target[prop] = val;
      return true;
    }
  });
  return proxy;
}
var supportedPointerEvents = [
  "onClick",
  "onContextmenu",
  "onPointermove",
  "onPointerenter",
  "onPointerleave",
  "onPointerover",
  "onPointerout",
  "onDblclick",
  "onPointerdown",
  "onPointerup",
  "onPointercancel",
  "onLostpointercapture",
  "onWheel"
];
var pointerEventsMapVueToThree = {
  onClick: "click",
  onContextmenu: "contextmenu",
  onPointermove: "pointermove",
  onPointerenter: "pointerenter",
  onPointerleave: "pointerleave",
  onPointerover: "pointerover",
  onPointerout: "pointerout",
  onDblclick: "dblclick",
  onPointerdown: "pointerdown",
  onPointerup: "pointerup",
  onPointercancel: "pointercancel",
  onLostpointercapture: "lostpointercapture",
  onWheel: "wheel"
};
var isSupportedPointerEvent = (event) => supportedPointerEvents.includes(event);
var textNodeSymbol = Symbol("tresTextNode");
var commentNodeSymbol = Symbol("tresComment");
var nodeOps = ({ context, options = { primitivePrefix: "" } }) => {
  const scene = context.scene.value;
  const createTextNode = () => {
    var _a;
    if ((_a = scene == null ? void 0 : scene.__tres) == null ? void 0 : _a.isUnmounting) return;
    return {
      [textNodeSymbol]: true,
      __tres: { parent: null }
    };
  };
  const createCommentNode = () => ({
    [commentNodeSymbol]: true,
    __tres: { parent: null }
  });
  const isTextNode = (node) => !!node && typeof node === "object" && textNodeSymbol in node;
  const isCommentNode = (node) => !!node && typeof node === "object" && commentNodeSymbol in node;
  function createElement(tag, _namespace, _isCustomizedBuiltIn, props) {
    if (!props) props = {};
    if (!props.args) props.args = [];
    if (isHTMLTag(tag)) return null;
    if (tag.includes("-")) tag = tag.replace(/-([a-z])/g, (_, c) => c.toUpperCase()).replace(/^[a-z]/, (c) => c.toUpperCase());
    let name = tag.replace("Tres", "");
    let obj;
    if (tag === `${(options == null ? void 0 : options.primitivePrefix) ?? ""}primitive`) {
      if (!isObject2(props.object) || isRef(props.object)) logError("Tres primitives need an 'object' prop, whose value is an object or shallowRef<object>");
      name = props.object.type;
      const __tres = {};
      obj = createRetargetingProxy(props.object, {
        object: (t) => t,
        isPrimitive: () => true,
        __tres: () => __tres
      }, {
        object: (object, _, primitive, setTarget) => {
          setPrimitiveObject(object, primitive, setTarget, {
            patchProp,
            remove,
            insert
          }, context);
        },
        __tres: (t) => {
          Object.assign(__tres, t);
        }
      });
    } else {
      const target = catalogue.value[name];
      if (!target) logError(`${name} is not defined on the THREE namespace. Use extend to add it to the catalog.`);
      obj = new target(...props.args);
    }
    if (!obj) return null;
    if (isTresCamera(obj)) {
      if (!(props == null ? void 0 : props.position)) obj.position.set(3, 3, 3);
      if (!(props == null ? void 0 : props.lookAt)) obj.lookAt(0, 0, 0);
    }
    obj = prepareTresInstance(obj, {
      ...isTresInstance(obj) ? obj.__tres : {},
      type: name,
      memoizedProps: props,
      primitive: tag === "primitive",
      attach: props.attach
    }, context);
    return obj;
  }
  function insert(child, parent, anchor) {
    var _a;
    if (!child) return;
    parent = parent || scene;
    if (isTextNode(child) || isCommentNode(child)) {
      const parentInstance$1 = parent.__tres ? parent : prepareTresInstance(parent, {}, context);
      child.__tres.parent = parentInstance$1;
      if (parentInstance$1.__tres.objects) {
        const insertIndex = anchor ? parentInstance$1.__tres.objects.findIndex((obj) => obj === anchor) : -1;
        if (insertIndex >= 0) parentInstance$1.__tres.objects.splice(insertIndex, 0, child);
        else parentInstance$1.__tres.objects.push(child);
      }
      return;
    }
    const childInstance = child.__tres ? child : prepareTresInstance(child, {}, context);
    const parentInstance = parent.__tres ? parent : prepareTresInstance(parent, {}, context);
    child = unboxTresPrimitive(childInstance);
    parent = unboxTresPrimitive(parentInstance);
    if (isTresCamera(child)) (_a = context.camera) == null ? void 0 : _a.registerCamera(child);
    if (childInstance.__tres.attach) attach(parentInstance, childInstance, childInstance.__tres.attach);
    else if (isObject3D(child) && isObject3D(parentInstance)) {
      parentInstance.add(child);
      child.dispatchEvent({ type: "added" });
    }
    childInstance.__tres.parent = parentInstance;
    if (parentInstance.__tres.objects && !parentInstance.__tres.objects.includes(childInstance)) {
      const insertIndex = anchor ? parentInstance.__tres.objects.findIndex((obj) => obj === anchor) : -1;
      if (~insertIndex) parentInstance.__tres.objects.splice(insertIndex, 0, childInstance);
      else parentInstance.__tres.objects.push(childInstance);
    }
  }
  function remove(node, dispose) {
    var _a, _b, _c;
    if (!node) return;
    if (isTextNode(node) || isCommentNode(node)) {
      const parent = node.__tres.parent;
      if ((_a = parent == null ? void 0 : parent.__tres) == null ? void 0 : _a.objects) filterInPlace(parent.__tres.objects, (obj) => obj !== node);
      node.__tres.parent = null;
      return;
    }
    dispose = isUndefined(dispose) ? "default" : dispose;
    const userDispose = (_b = node.__tres) == null ? void 0 : _b.dispose;
    if (!isUndefined(userDispose)) if (userDispose === null) dispose = false;
    else dispose = userDispose;
    const isPrimitive = (_c = node.__tres) == null ? void 0 : _c.primitive;
    const shouldDispose = dispose === "default" ? !isPrimitive : !!dispose;
    if (node.__tres && "objects" in node.__tres) [...node.__tres.objects].forEach((obj) => remove(obj, dispose));
    if (shouldDispose) {
      if (node.children) [...node.children].forEach((child) => remove(child, dispose));
    }
    doRemoveDetach(node, context);
    doRemoveDeregister(node, context);
    if (shouldDispose && !isScene(node)) {
      if (isFunction(dispose)) dispose(node);
      else if (isFunction(node.dispose)) try {
        node.dispose();
      } catch (e) {
      }
    }
    if ("__tres" in node) delete node.__tres;
  }
  function patchProp(node, prop, prevValue, nextValue) {
    var _a, _b;
    if (!node) return;
    let root = node;
    const key = prop;
    if (node.__tres) node.__tres.memoizedProps[prop] = nextValue;
    if (prop === "attach") {
      const maybeParent = ((_a = node.__tres) == null ? void 0 : _a.parent) || node.parent;
      remove(node);
      prepareTresInstance(node, { attach: nextValue }, context);
      if (maybeParent) insert(node, maybeParent);
      return;
    }
    if (prop === "dispose") {
      if (!node.__tres) node = prepareTresInstance(node, {}, context);
      node.__tres.dispose = nextValue;
      return;
    }
    if (isSupportedPointerEvent(prop) && isFunction(nextValue)) node.addEventListener(pointerEventsMapVueToThree[prop], nextValue);
    let finalKey = camel(key);
    let target = root == null ? void 0 : root[finalKey];
    if (key === "args") {
      const prevNode = node;
      const prevArgs = prevValue ?? [];
      const args = nextValue ?? [];
      const instanceName = ((_b = node.__tres) == null ? void 0 : _b.type) || node.type;
      if (instanceName && prevArgs.length && !isEqual(prevArgs, args)) {
        const newInstance = new catalogue.value[instanceName](...nextValue);
        const descriptors = Object.getOwnPropertyDescriptors(newInstance);
        Object.entries(descriptors).forEach(([key$1, descriptor]) => {
          if (!descriptor.writable && !descriptor.set) return;
          if (key$1 in prevNode) try {
            prevNode[key$1] = newInstance[key$1];
          } catch (e) {
            console.warn(`Could not set property ${key$1} on ${instanceName}:`, e);
          }
        });
        root = prevNode;
      }
      return;
    }
    if (root.type === "BufferGeometry") {
      if (key === "args") return;
      root.setAttribute(camel(key), new BufferAttribute(...nextValue));
      return;
    }
    if (key.includes("-") && target === void 0) {
      const resolved = resolve(root, key);
      target = resolved.target;
      root = resolved.target;
      finalKey = resolved.key;
      if (target && finalKey) {
        target[finalKey] = nextValue;
        if (isTresCamera(node)) node.updateProjectionMatrix();
        invalidateInstance(node);
        return;
      }
    }
    let value = nextValue;
    if (value === "") value = true;
    if (isFunction(target)) {
      if (!isSupportedPointerEvent(prop)) if (Array.isArray(value)) node[finalKey](...value);
      else node[finalKey](value);
      if (finalKey.startsWith("on") && isFunction(value)) root[finalKey] = value;
      return;
    }
    if (isLayers(target) && isLayers(value)) target.mask = value.mask;
    else if (isColor(target) && isColorRepresentation(value)) target.set(value);
    else if (isCopyable(target) && isClassInstance(value) && target.constructor === value.constructor) target.copy(value);
    else if (isVectorLike(target) && Array.isArray(value)) if ("fromArray" in target && typeof target.fromArray === "function") target.fromArray(value);
    else target.set(...value);
    else if (isVectorLike(target) && typeof value === "number") if ("setScalar" in target && typeof target.setScalar === "function") target.setScalar(value);
    else target.set(value);
    else root[finalKey] = value;
    if (isTresCamera(node)) node.updateProjectionMatrix();
    invalidateInstance(node);
  }
  function parentNode(node) {
    var _a;
    return ((_a = node == null ? void 0 : node.__tres) == null ? void 0 : _a.parent) || null;
  }
  function nextSibling(node) {
    var _a, _b;
    if (!node || !("__tres" in node)) return null;
    const siblings = ((_b = (_a = parentNode(node)) == null ? void 0 : _a.__tres) == null ? void 0 : _b.objects) || [];
    const index = siblings.findIndex((sibling) => sibling === node);
    if (index < 0 || index >= siblings.length - 1) return null;
    return siblings[index + 1];
  }
  const noop2 = () => {
  };
  return {
    insert,
    remove,
    createElement,
    patchProp,
    parentNode,
    createText: createTextNode,
    createComment: createCommentNode,
    setText: noop2,
    setElementText: noop2,
    nextSibling,
    querySelector: noop2,
    setScopeId: noop2,
    cloneNode: noop2,
    insertStaticContent: noop2
  };
};
var QUEUEABLE_MESSAGE_TYPES = ["asset-load"];
var DevtoolsMessenger = class {
  constructor() {
    __publicField(this, "subscribers", /* @__PURE__ */ new Set());
    __publicField(this, "messageQueue", []);
    __publicField(this, "maxQueueSize", 100);
  }
  /**
  * Send a message to devtools subscribers
  * If no subscribers are available, only queueable message types are queued
  */
  send(type, data) {
    const message = {
      type,
      data,
      timestamp: Date.now()
    };
    if (this.subscribers.size > 0) this.subscribers.forEach((subscriber) => subscriber(message));
    else if (QUEUEABLE_MESSAGE_TYPES.includes(type)) this.queueMessage(message);
  }
  /**
  * Queue a message for later delivery
  */
  queueMessage(message) {
    this.messageQueue.push(message);
    if (this.messageQueue.length > this.maxQueueSize) this.messageQueue.shift();
  }
  /**
  * Flush all queued messages to current subscribers
  */
  flushQueue() {
    if (this.messageQueue.length === 0 || this.subscribers.size === 0) return;
    this.messageQueue.forEach((message) => {
      this.subscribers.forEach((subscriber) => subscriber(message));
    });
    this.messageQueue = [];
  }
  /**
  * Subscribe to devtools messages
  * When a new subscriber is added, all queued messages (asset-load events) are immediately delivered
  */
  subscribe(subscriber) {
    this.subscribers.add(subscriber);
    this.flushQueue();
    return () => {
      this.subscribers.delete(subscriber);
    };
  }
  /**
  * Check if there are any subscribers
  */
  get hasSubscribers() {
    return this.subscribers.size > 0;
  }
  /**
  * Get the current queue size
  */
  get queueSize() {
    return this.messageQueue.length;
  }
  /**
  * Clear all queued messages
  */
  clearQueue() {
    this.messageQueue = [];
  }
};
function toastMessage(message, type) {
  const tresMessage = `▲ ■ ●${message}`;
  if (typeof __VUE_DEVTOOLS_TOAST__ === "function") __VUE_DEVTOOLS_TOAST__(tresMessage, type);
  else if (type === "error") console.error(tresMessage);
  else if (type === "warn") console.warn(tresMessage);
  else console.log(tresMessage);
}
function __VUE_DEVTOOLS_TOAST__(tresMessage, type) {
  throw new Error(tresMessage + type);
}
function calculateMemoryUsage(object) {
  let totalMemory = 0;
  object.traverse((node) => {
    if (isMesh(node) && node.type !== "HightlightMesh") {
      const geometry = node.geometry;
      const verticesMemory = geometry.attributes.position.count * 3 * Float32Array.BYTES_PER_ELEMENT;
      const facesMemory = geometry.index ? geometry.index.count * Uint32Array.BYTES_PER_ELEMENT : 0;
      const normalsMemory = geometry.attributes.normal ? geometry.attributes.normal.count * 3 * Float32Array.BYTES_PER_ELEMENT : 0;
      const uvsMemory = geometry.attributes.uv ? geometry.attributes.uv.count * 2 * Float32Array.BYTES_PER_ELEMENT : 0;
      const geometryMemory = verticesMemory + facesMemory + normalsMemory + uvsMemory;
      totalMemory += geometryMemory;
    }
  });
  return totalMemory;
}
function boundedPush(arr, value, max) {
  arr.push(value);
  if (arr.length > max) arr.shift();
}
function bytesToKB(bytes) {
  return (bytes / 1024).toFixed(2);
}
function setupTresDevtools(ctx) {
  if (!ctx) return;
  if (typeof window !== "undefined" && !window.__TRES__DEVTOOLS__) window.__TRES__DEVTOOLS__ = new DevtoolsMessenger();
  const performanceState = {
    maxFrames: 160,
    fps: {
      value: 0,
      accumulator: []
    },
    memory: {
      currentMem: 0,
      allocatedMem: 0,
      accumulator: []
    }
  };
  const updateInterval = 100;
  const fps = useFps({ every: updateInterval });
  const { isSupported, memory } = useMemory({ interval: updateInterval });
  const maxFrames = 160;
  let lastUpdateTime = performance.now();
  let accumulatedTime = 0;
  const interval = 1;
  const updatePerformanceData = ({ timestamp: timestamp2 }) => {
    var _a;
    if (ctx.scene.value) performanceState.memory.allocatedMem = calculateMemoryUsage(ctx.scene.value);
    if (timestamp2 - lastUpdateTime >= updateInterval) {
      lastUpdateTime = timestamp2;
      boundedPush(performanceState.fps.accumulator, fps.value, maxFrames);
      performanceState.fps.value = fps.value;
      if (isSupported.value && ((_a = memory.value) == null ? void 0 : _a.usedJSHeapSize)) {
        boundedPush(performanceState.memory.accumulator, memory.value.usedJSHeapSize / 1024 / 1024, maxFrames);
        if (performanceState.memory.accumulator.length > 0) performanceState.memory.currentMem = performanceState.memory.accumulator.reduce((a, b) => a + b, 0) / performanceState.memory.accumulator.length;
      }
    }
  };
  const { pause } = useRafFn(({ delta }) => {
    if (!window.__TRES__DEVTOOLS__) return;
    updatePerformanceData({ timestamp: performance.now() });
    accumulatedTime += delta;
    if (accumulatedTime >= interval) {
      window.__TRES__DEVTOOLS__.send("context", ctx);
      window.__TRES__DEVTOOLS__.send("performance", performanceState);
      accumulatedTime = 0;
    }
  }, { immediate: true });
  onUnmounted(() => {
    pause();
  });
}
var getObjectByUuid = (node, uuid) => {
  if (node.uuid === uuid) return node;
  for (const child of node.children) {
    const found = getObjectByUuid(child, uuid);
    if (found) return found;
  }
};
var HightlightMesh = class extends Mesh {
  constructor(...args) {
    super(...args);
    __publicField(this, "type", "HightlightMesh");
    __publicField(this, "createTime");
    this.createTime = Date.now();
  }
  onBeforeRender() {
    const time = (Date.now() - this.createTime) / 1e3;
    const scaleFactor = 1 + 0.07 * Math.sin(2.5 * time);
    this.scale.set(scaleFactor, scaleFactor, scaleFactor);
  }
};
var createNode = (object) => {
  const node = {
    id: `scene-${object.uuid}`,
    label: object.type,
    children: [],
    tags: []
  };
  if (object.name !== "") node.tags.push({
    label: object.name,
    textColor: 5750629,
    backgroundColor: 15793395
  });
  const memory = calculateMemoryUsage(object);
  if (memory > 0) node.tags.push({
    label: `${bytesToKB(memory)} KB`,
    textColor: 15707189,
    backgroundColor: 16775644,
    tooltip: "Memory usage"
  });
  if (object.type.includes("Light")) {
    if (isLight(object)) node.tags.push({
      label: `${object.intensity}`,
      textColor: 9738662,
      backgroundColor: 16316922,
      tooltip: "Intensity"
    });
    node.tags.push({
      label: `#${new Color(object.color).getHexString()}`,
      textColor: 9738662,
      backgroundColor: 16316922,
      tooltip: "Color"
    });
  }
  if (object.type.includes("Camera")) {
    node.tags.push({
      label: `${object.fov}°`,
      textColor: 9738662,
      backgroundColor: 16316922,
      tooltip: "Field of view"
    });
    node.tags.push({
      label: `x: ${Math.round(object.position.x)} y: ${Math.round(object.position.y)} z: ${Math.round(object.position.z)}`,
      textColor: 9738662,
      backgroundColor: 16316922,
      tooltip: "Position"
    });
  }
  return node;
};
function createContextNode(key, uuid, parentKey = "") {
  return {
    id: `context-${uuid}-${parentKey ? `${parentKey}.${key}` : key}`,
    label: key,
    children: [],
    tags: []
  };
}
function buildGraph$1(object, node, filter = "") {
  object.children.forEach((child) => {
    if (child.type === "HightlightMesh") return;
    if (filter && !child.type.includes(filter) && !child.name.includes(filter)) return;
    const childNode = createNode(child);
    node.children.push(childNode);
    buildGraph$1(child, childNode, filter);
  });
}
function buildContextGraph(object, node, visited = /* @__PURE__ */ new WeakSet(), depth = 0, maxDepth = 4, contextUuid, parentKey = "") {
  var _a, _b;
  if (depth >= maxDepth || !object || visited.has(object)) return;
  const uuid = depth === 0 ? ((_b = (_a = object == null ? void 0 : object.scene) == null ? void 0 : _a.value) == null ? void 0 : _b.uuid) || Math.random().toString(36).slice(2, 11) : contextUuid;
  visited.add(object);
  Object.entries(object).forEach(([key, value]) => {
    if (key.startsWith("_") || typeof value === "function") return;
    const chainedKey = parentKey ? `${parentKey}.${key}` : key;
    const childNode = createContextNode(key, uuid, parentKey);
    if (key === "scene") return;
    if (isRef(value)) {
      childNode.tags.push({
        label: `Ref<${typeof value.value}>`,
        textColor: 4372611,
        backgroundColor: 15793395
      });
      if (value.value && typeof value.value === "object") buildContextGraph(value.value, childNode, visited, depth + 1, maxDepth, uuid, chainedKey);
      else childNode.label = `${key}: ${JSON.stringify(value.value)}`;
    } else if (value && typeof value === "object" && !Array.isArray(value)) if (Object.keys(value).length > 0) if (visited.has(value)) childNode.tags.push({
      label: "Circular",
      textColor: 16711680,
      backgroundColor: 16773360
    });
    else buildContextGraph(value, childNode, visited, depth + 1, maxDepth, uuid, chainedKey);
    else childNode.label = `${key}: {}`;
    else if (Array.isArray(value)) {
      childNode.label = `${key}: Array(${value.length})`;
      childNode.tags.push({
        label: `length: ${value.length}`,
        textColor: 9738662,
        backgroundColor: 16316922
      });
    } else childNode.label = `${key}: ${JSON.stringify(value)}`;
    node.children.push(childNode);
  });
}
var inspectorTreeHandler = (tres) => (payload) => {
  if (payload.inspectorId === INSPECTOR_ID) {
    const root = createNode(tres.scene.value);
    buildGraph$1(tres.scene.value, root, payload.filter);
    const rootContext = {
      id: "context-root",
      label: "Context",
      children: [],
      tags: []
    };
    buildContextGraph(tres, rootContext);
    payload.rootNodes = [root, rootContext];
  }
};
var inspectorStateHandler = (tres, { highlightMesh, prevInstance }) => (payload) => {
  var _a;
  if (payload.inspectorId !== INSPECTOR_ID) return;
  const highlightMaterial = new MeshBasicMaterial({
    color: 11003607,
    transparent: true,
    opacity: 0.2,
    depthTest: false,
    side: DoubleSide
  });
  if (payload.nodeId.includes("scene")) {
    const match = payload.nodeId.match(/^scene-(.+)$/);
    const uuid = match ? match[1] : null;
    if (!uuid) return;
    const [instance] = tres.scene.value.getObjectsByProperty("uuid", uuid);
    if (!instance) return;
    if (prevInstance && highlightMesh && highlightMesh.parent) prevInstance.remove(highlightMesh);
    if (isMesh(instance)) {
      const newHighlightMesh = new HightlightMesh(instance.geometry.clone(), highlightMaterial);
      instance.add(newHighlightMesh);
      highlightMesh = newHighlightMesh;
      prevInstance = instance;
    }
    payload.state = { object: Object.entries(instance).map(([key, value]) => {
      if (key === "children") return {
        key,
        value: value.filter((child) => child.type !== "HightlightMesh")
      };
      return {
        key,
        value,
        editable: true
      };
    }).filter(({ key }) => {
      return key !== "parent";
    }) };
    if (isScene(instance)) {
      const sceneState = {
        ...payload.state,
        state: [{
          key: "Scene Info",
          value: {
            objects: instance.children.length,
            memory: calculateMemoryUsage(instance),
            calls: tres.renderer.instance.info.render.calls,
            triangles: tres.renderer.instance.info.render.triangles,
            points: tres.renderer.instance.info.render.points,
            lines: tres.renderer.instance.info.render.lines
          }
        }]
      };
      if ("programs" in tres.renderer.instance.info) sceneState.state.push({
        key: "Programs",
        value: (_a = tres.renderer.instance.info.programs) == null ? void 0 : _a.map((program) => ({
          ...program,
          programName: program.name
        }))
      });
      payload.state = sceneState;
    }
  } else if (payload.nodeId.includes("context")) {
    const match = payload.nodeId.match(/^context-([^-]+(?:-[^-]+)*)-(.+)$/);
    const chainedKey = match ? match[2] : "context";
    if (!chainedKey || chainedKey === "context") {
      payload.state = { object: Object.entries(tres).filter(([key]) => !key.startsWith("_") && key !== "parent").map(([key, value$1]) => ({
        key,
        value: isRef(value$1) ? value$1.value : value$1,
        editable: false
      })) };
      return;
    }
    const parts = chainedKey.split(".");
    let value = tres;
    for (const part of parts) {
      if (!value || typeof value !== "object") break;
      value = isRef(value[part]) ? value[part].value : value[part];
    }
    if (value !== void 0) payload.state = { object: Object.entries(value).filter(([key]) => !key.startsWith("_") && key !== "parent").map(([key, val]) => {
      if (isRef(val)) return {
        key,
        value: val.value,
        editable: false
      };
      if (typeof val === "function") return {
        key,
        value: "ƒ()",
        editable: false
      };
      if (val && typeof val === "object") return {
        key,
        value: Array.isArray(val) ? `Array(${val.length})` : "Object",
        editable: false
      };
      return {
        key,
        value: val,
        editable: false
      };
    }) };
  }
};
var editSceneObject = (scene, objectUuid, propertyPath, value) => {
  const targetObject = getObjectByUuid(scene, objectUuid);
  if (!targetObject) {
    console.warn("Object with UUID not found in the scene.");
    return;
  }
  let currentProperty = targetObject;
  for (let i = 0; i < propertyPath.length - 1; i++) if (currentProperty[propertyPath[i]] !== void 0) currentProperty = currentProperty[propertyPath[i]];
  else {
    console.warn(`Property path is not valid: ${propertyPath.join(".")}`);
    return;
  }
  const lastProperty = propertyPath[propertyPath.length - 1];
  if (currentProperty[lastProperty] !== void 0) currentProperty[lastProperty] = value;
  else console.warn(`Property path is not valid: ${propertyPath.join(".")}`);
};
var inspectorEditStateHandler = (tres) => (payload) => {
  if (payload.inspectorId === INSPECTOR_ID) {
    if (payload.nodeId.includes("scene")) {
      const match = payload.nodeId.match(/^scene-(.+)$/);
      const uuid = match ? match[1] : null;
      if (!uuid) return;
      editSceneObject(tres.scene.value, uuid, payload.path, payload.state.value);
    }
  }
};
var INSPECTOR_ID = "tres:inspector";
function registerTresDevtools(app, tres) {
  const pluginDescriptor = {
    id: "dev.esm.tres",
    label: "TresJS 🪐",
    logo: "https://raw.githubusercontent.com/Tresjs/tres/main/public/favicon.svg",
    packageName: "tresjs",
    homepage: "https://docs.tresjs.org",
    app
  };
  const highlightMesh = null;
  const prevInstance = null;
  setupTresDevtools(tres);
  setupDevToolsPlugin(pluginDescriptor, (api) => {
    if (typeof api.now !== "function") toastMessage("You seem to be using an outdated version of Vue Devtools. Are you still using the Beta release instead of the stable one? You can find the links at https://devtools.vuejs.org/guide/installation.html.");
    api.addInspector({
      id: INSPECTOR_ID,
      label: "TresJS 🪐",
      icon: "account_tree",
      treeFilterPlaceholder: "Search instances"
    });
    setInterval(() => {
      api.sendInspectorTree(INSPECTOR_ID);
    }, 1e3);
    setInterval(() => {
      api.notifyComponentUpdate();
    }, 5e3);
    api.on.getInspectorTree(inspectorTreeHandler(tres));
    api.on.getInspectorState(inspectorStateHandler(tres, {
      highlightMesh,
      prevInstance
    }));
    api.on.editInspectorState(inspectorEditStateHandler(tres));
  });
}
var Context_vue_vue_type_script_setup_true_lang_default = defineComponent({
  __name: "Context",
  props: {
    camera: {
      type: null,
      required: false
    },
    windowSize: {
      type: Boolean,
      required: false
    },
    fpsLimit: {
      type: Number,
      required: false
    },
    enableProvideBridge: {
      type: Boolean,
      required: false
    },
    customRendererOptions: {
      type: Object,
      required: false
    },
    antialias: {
      type: Boolean,
      required: false
    },
    stencil: {
      type: Boolean,
      required: false
    },
    depth: {
      type: Boolean,
      required: false
    },
    precision: {
      type: String,
      required: false
    },
    logarithmicDepthBuffer: {
      type: Boolean,
      required: false
    },
    preserveDrawingBuffer: {
      type: Boolean,
      required: false
    },
    powerPreference: {
      type: null,
      required: false
    },
    alpha: {
      type: Boolean,
      required: false
    },
    premultipliedAlpha: {
      type: Boolean,
      required: false
    },
    failIfMajorPerformanceCaveat: {
      type: Boolean,
      required: false
    },
    clearColor: {
      type: [
        Object,
        String,
        Number
      ],
      required: false
    },
    clearAlpha: {
      type: Number,
      required: false
    },
    shadows: {
      type: Boolean,
      required: false
    },
    toneMapping: {
      type: null,
      required: false
    },
    shadowMapType: {
      type: null,
      required: false
    },
    useLegacyLights: {
      type: Boolean,
      required: false
    },
    outputColorSpace: {
      type: null,
      required: false
    },
    toneMappingExposure: {
      type: Number,
      required: false
    },
    renderMode: {
      type: String,
      required: false
    },
    dpr: {
      type: [Number, Array],
      required: false
    },
    renderer: {
      type: Function,
      required: false
    },
    canvas: {
      type: null,
      required: true
    }
  },
  emits: [
    "ready",
    "error",
    "pointermissed",
    "render",
    "beforeLoop",
    "loop",
    "click",
    "contextmenu",
    "pointermove",
    "pointerenter",
    "pointerleave",
    "pointerover",
    "pointerout",
    "dblclick",
    "pointerdown",
    "pointerup",
    "pointercancel",
    "lostpointercapture",
    "wheel"
  ],
  setup(__props, { expose: __expose, emit: __emit }) {
    const props = __props;
    const emit = __emit;
    const slots = useSlots();
    const scene = shallowRef(new Scene());
    const instance = getCurrentInstance();
    extend(three_module_exports);
    const createInternalComponent = (context$1, empty = false) => defineComponent({ setup() {
      var _a;
      const ctx = (_a = getCurrentInstance()) == null ? void 0 : _a.appContext;
      if (ctx) ctx.app = instance == null ? void 0 : instance.appContext.app;
      const provides = {};
      function mergeProvides(currentInstance$1) {
        if (!currentInstance$1) return;
        if (currentInstance$1.parent) mergeProvides(currentInstance$1.parent);
        if (currentInstance$1.provides) Object.assign(provides, currentInstance$1.provides);
      }
      if ((instance == null ? void 0 : instance.parent) && props.enableProvideBridge) {
        mergeProvides(instance.parent);
        Reflect.ownKeys(provides).forEach((key) => {
          provide(key, provides[key]);
        });
      }
      provide(INJECTION_KEY, context$1);
      provide("extend", extend);
      if (typeof window !== "undefined" && (ctx == null ? void 0 : ctx.app)) registerTresDevtools(ctx == null ? void 0 : ctx.app, context$1);
      return () => h(Fragment, null, !empty ? slots.default() : []);
    } });
    const mountCustomRenderer = (context$1, empty = false) => {
      const InternalComponent = createInternalComponent(context$1, empty);
      const { render } = createRenderer(nodeOps({
        context: context$1,
        options: props.customRendererOptions
      }));
      render(h(InternalComponent), scene.value);
    };
    const dispose = (context$1, force = false) => {
      disposeObject3D(context$1.scene.value);
      if (force) {
        context$1.renderer.instance.dispose();
        if (context$1.renderer.instance instanceof WebGLRenderer) {
          context$1.renderer.instance.renderLists.dispose();
          context$1.renderer.instance.forceContextLoss();
        }
      }
      scene.value.__tres = {
        root: context$1,
        objects: [],
        isUnmounting: true
      };
    };
    const context = shallowRef(useTresContextProvider({
      scene: scene.value,
      canvas: props.canvas,
      fpsLimit: () => props.fpsLimit ?? Infinity,
      windowSize: props.windowSize ?? false,
      rendererOptions: props
    }));
    __expose({
      context,
      dispose: () => dispose(context.value, true)
    });
    const handleHMR = (context$1) => {
      mountCustomRenderer(context$1);
    };
    const unmountCanvas = () => {
      const isTresScene = (value) => isScene(value) && "__tres" in value;
      if (isTresScene(scene.value)) scene.value.__tres.isUnmounting = true;
      mountCustomRenderer(context.value, true);
      dispose(context.value);
    };
    const { camera, renderer } = context.value;
    const { registerCamera, cameras, activeCamera, deregisterCamera } = camera;
    const addDefaultCamera = () => {
      const camera$1 = new PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1e3);
      camera$1.position.set(3, 3, 3);
      camera$1.lookAt(0, 0, 0);
      registerCamera(camera$1);
      const unwatch = watchEffect(() => {
        if (cameras.value.length >= 2) {
          camera$1.removeFromParent();
          deregisterCamera(camera$1);
          unwatch == null ? void 0 : unwatch();
        }
      });
    };
    context.value.events.onPointerMissed((event) => {
      emit("pointermissed", event);
    });
    watch(() => props.camera, (newCamera, oldCamera) => {
      if (newCamera) registerCamera(toValue(newCamera), true);
      if (oldCamera) {
        toValue(oldCamera).removeFromParent();
        deregisterCamera(toValue(oldCamera));
      }
    }, { immediate: true });
    renderer.onRender(() => {
      if (context.value) emit("render", context.value);
    });
    renderer.loop.onLoop((loopContext) => {
      if (context.value) emit("loop", {
        ...context.value,
        ...loopContext
      });
    });
    renderer.loop.onBeforeLoop((loopContext) => {
      if (context.value) emit("beforeLoop", {
        ...context.value,
        ...loopContext
      });
    });
    renderer.onReady(() => {
      mountCustomRenderer(context.value, false);
      emit("ready", context.value);
      if (!activeCamera.value) addDefaultCamera();
    });
    renderer.onError((error) => {
      emit("error", error);
    });
    if (import.meta.hot) import.meta.hot.on("vite:afterUpdate", () => handleHMR(context.value));
    onMounted(async () => {
      await promiseTimeout(3e3);
      if (!context.value.sizes.width || !context.value.sizes.height.value) console.warn(`TresCanvas: The canvas has no area, so nothing can be rendered. Set it manually on the parent element or use the prop windowSize.`);
    });
    onUnmounted(unmountCanvas);
    return () => {
    };
  }
});
var Context_default = Context_vue_vue_type_script_setup_true_lang_default;
var _hoisted_1 = ["data-scene", "data-tres"];
var TresCanvas_vue_vue_type_script_setup_true_lang_default = defineComponent({
  __name: "TresCanvas",
  props: {
    camera: {
      type: null,
      required: false
    },
    windowSize: {
      type: Boolean,
      required: false,
      default: void 0
    },
    fpsLimit: {
      type: Number,
      required: false
    },
    enableProvideBridge: {
      type: Boolean,
      required: false,
      default: true
    },
    customRendererOptions: {
      type: Object,
      required: false
    },
    antialias: {
      type: Boolean,
      required: false,
      default: true
    },
    stencil: {
      type: Boolean,
      required: false,
      default: void 0
    },
    depth: {
      type: Boolean,
      required: false,
      default: void 0
    },
    precision: {
      type: String,
      required: false
    },
    logarithmicDepthBuffer: {
      type: Boolean,
      required: false,
      default: void 0
    },
    preserveDrawingBuffer: {
      type: Boolean,
      required: false,
      default: void 0
    },
    powerPreference: {
      type: null,
      required: false
    },
    alpha: {
      type: Boolean,
      required: false,
      default: void 0
    },
    premultipliedAlpha: {
      type: Boolean,
      required: false
    },
    failIfMajorPerformanceCaveat: {
      type: Boolean,
      required: false,
      default: void 0
    },
    clearColor: {
      type: [
        Object,
        String,
        Number
      ],
      required: false,
      default: "#000000"
    },
    clearAlpha: {
      type: Number,
      required: false,
      default: 1
    },
    shadows: {
      type: Boolean,
      required: false,
      default: void 0
    },
    toneMapping: {
      type: null,
      required: false,
      default: ACESFilmicToneMapping
    },
    shadowMapType: {
      type: null,
      required: false,
      default: PCFSoftShadowMap
    },
    useLegacyLights: {
      type: Boolean,
      required: false,
      default: void 0
    },
    outputColorSpace: {
      type: null,
      required: false
    },
    toneMappingExposure: {
      type: Number,
      required: false
    },
    renderMode: {
      type: String,
      required: false,
      default: "always"
    },
    dpr: {
      type: [Number, Array],
      required: false
    },
    renderer: {
      type: Function,
      required: false
    }
  },
  emits: [
    "ready",
    "error",
    "pointermissed",
    "render",
    "beforeLoop",
    "loop",
    "click",
    "contextmenu",
    "pointermove",
    "pointerenter",
    "pointerleave",
    "pointerover",
    "pointerout",
    "dblclick",
    "pointerdown",
    "pointerup",
    "pointercancel",
    "lostpointercapture",
    "wheel"
  ],
  setup(__props, { expose: __expose, emit: __emit }) {
    const props = __props;
    const emit = __emit;
    const canvasRef = ref();
    const contextRef = shallowRef();
    __expose({
      get context() {
        var _a;
        return (_a = contextRef.value) == null ? void 0 : _a.context;
      },
      dispose: () => {
        var _a;
        return (_a = contextRef.value) == null ? void 0 : _a.dispose();
      }
    });
    return (_ctx, _cache) => {
      var _a, _b;
      return openBlock(), createElementBlock("canvas", {
        ref_key: "canvasRef",
        ref: canvasRef,
        "data-scene": (_b = (_a = contextRef.value) == null ? void 0 : _a.context) == null ? void 0 : _b.scene.value.uuid,
        class: normalizeClass(_ctx.$attrs.class),
        "data-tres": `tresjs ${unref(version)}`,
        style: normalizeStyle({
          display: "block",
          width: "100%",
          height: "100%",
          position: __props.windowSize ? "fixed" : "relative",
          top: 0,
          left: 0,
          pointerEvents: "auto",
          touchAction: "none",
          ..._ctx.$attrs.style
        })
      }, [canvasRef.value ? (openBlock(), createBlock(Context_default, mergeProps({
        key: 0,
        ref_key: "contextRef",
        ref: contextRef,
        canvas: canvasRef.value
      }, props, {
        onReady: _cache[0] || (_cache[0] = ($event) => emit("ready", $event)),
        onError: _cache[1] || (_cache[1] = ($event) => emit("error", $event)),
        onPointermissed: _cache[2] || (_cache[2] = ($event) => emit("pointermissed", $event)),
        onRender: _cache[3] || (_cache[3] = ($event) => emit("render", $event)),
        onBeforeLoop: _cache[4] || (_cache[4] = ($event) => emit("beforeLoop", $event)),
        onLoop: _cache[5] || (_cache[5] = ($event) => emit("loop", $event)),
        onClick: _cache[6] || (_cache[6] = ($event) => emit("click", $event)),
        onContextmenu: _cache[7] || (_cache[7] = ($event) => emit("contextmenu", $event)),
        onPointermove: _cache[8] || (_cache[8] = ($event) => emit("pointermove", $event)),
        onPointerenter: _cache[9] || (_cache[9] = ($event) => emit("pointerenter", $event)),
        onPointerleave: _cache[10] || (_cache[10] = ($event) => emit("pointerleave", $event)),
        onPointerover: _cache[11] || (_cache[11] = ($event) => emit("pointerover", $event)),
        onPointerout: _cache[12] || (_cache[12] = ($event) => emit("pointerout", $event)),
        onDblclick: _cache[13] || (_cache[13] = ($event) => emit("dblclick", $event)),
        onPointerdown: _cache[14] || (_cache[14] = ($event) => emit("pointerdown", $event)),
        onPointerup: _cache[15] || (_cache[15] = ($event) => emit("pointerup", $event)),
        onPointercancel: _cache[16] || (_cache[16] = ($event) => emit("pointercancel", $event)),
        onLostpointercapture: _cache[17] || (_cache[17] = ($event) => emit("lostpointercapture", $event)),
        onWheel: _cache[18] || (_cache[18] = ($event) => emit("wheel", $event))
      }), {
        default: withCtx(() => [renderSlot(_ctx.$slots, "default")]),
        _: 3
      }, 16, ["canvas"])) : createCommentVNode("v-if", true)], 14, _hoisted_1);
    };
  }
});
var TresCanvas_default = TresCanvas_vue_vue_type_script_setup_true_lang_default;
function normalizeVectorFlexibleParam(value) {
  if (typeof value === "number") return [
    value,
    value,
    value
  ];
  if (value instanceof Vector3) return [
    value.x,
    value.y,
    value.z
  ];
  return value;
}
function normalizeColor(value) {
  if (value instanceof Color) return value;
  if (Array.isArray(value)) return new Color(...value);
  return new Color(value);
}
var whitelist = [
  "TresCanvas",
  "TresCanvasContext",
  "TresLeches",
  "TresScene"
];
var templateCompilerOptions = { template: { compilerOptions: { isCustomElement: (tag) => (/^Tres[A-Z]/.test(tag) || tag.startsWith("tres-")) && !whitelist.includes(tag) || tag === "primitive" } } };
var template_compiler_options_default = templateCompilerOptions;
var arrowHelper = null;
var vDistanceTo = {
  updated: (el, binding) => {
    var _a;
    const extractBindingPosition = (binding$1) => {
      let observer$1 = binding$1.value;
      if (binding$1.value && isMesh(binding$1.value)) observer$1 = binding$1.value.position;
      if (Array.isArray(binding$1.value)) observer$1 = new Vector3(...observer$1);
      return observer$1;
    };
    const observer = extractBindingPosition(binding);
    if (!observer) {
      logWarning(`v-distance-to: problem with binding value: ${binding.value}`);
      return;
    }
    if (arrowHelper) {
      arrowHelper.dispose();
      el.parent.remove(arrowHelper);
    }
    const dir = observer.clone().sub(el.position);
    dir.normalize();
    arrowHelper = new ArrowHelper(dir, el.position, el.position.distanceTo(observer), 16776960);
    el.parent.add(arrowHelper);
    console.table([
      ["Distance:", el.position.distanceTo(observer)],
      [`origin: ${el.name || el.type}`, `x:${el.position.x}, y:${el.position.y}, z:${(_a = el.position) == null ? void 0 : _a.z}`],
      [`Destiny: ${el.name || el.type}`, `x:${observer.x}, y:${observer.y}, z:${observer == null ? void 0 : observer.z}`]
    ]);
  },
  unmounted: (el) => {
    arrowHelper == null ? void 0 : arrowHelper.dispose();
    if (el.parent) el.parent.remove(arrowHelper);
  }
};
var RectAreaLightHelper = class extends Line {
  constructor(light, color) {
    const positions = [
      1,
      1,
      0,
      -1,
      1,
      0,
      -1,
      -1,
      0,
      1,
      -1,
      0,
      1,
      1,
      0
    ];
    const geometry = new BufferGeometry();
    geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
    geometry.computeBoundingSphere();
    const material = new LineBasicMaterial({ fog: false });
    super(geometry, material);
    this.light = light;
    this.color = color;
    this.type = "RectAreaLightHelper";
    const positions2 = [
      1,
      1,
      0,
      -1,
      1,
      0,
      -1,
      -1,
      0,
      1,
      1,
      0,
      -1,
      -1,
      0,
      1,
      -1,
      0
    ];
    const geometry2 = new BufferGeometry();
    geometry2.setAttribute("position", new Float32BufferAttribute(positions2, 3));
    geometry2.computeBoundingSphere();
    this.add(new Mesh(geometry2, new MeshBasicMaterial({
      side: BackSide,
      fog: false
    })));
  }
  updateMatrixWorld() {
    this.scale.set(0.5 * this.light.width, 0.5 * this.light.height, 1);
    if (this.color !== void 0) {
      this.material.color.set(this.color);
      this.children[0].material.color.set(this.color);
    } else {
      this.material.color.copy(this.light.color).multiplyScalar(this.light.intensity);
      const c = this.material.color;
      const max = Math.max(c.r, c.g, c.b);
      if (max > 1) c.multiplyScalar(1 / max);
      this.children[0].material.color.copy(this.material.color);
    }
    this.matrixWorld.extractRotation(this.light.matrixWorld).scale(this.scale).copyPosition(this.light.matrixWorld);
    this.children[0].matrixWorld.copy(this.matrixWorld);
  }
  dispose() {
    this.geometry.dispose();
    this.material.dispose();
    this.children[0].geometry.dispose();
    this.children[0].material.dispose();
  }
};
var CurrentHelper;
var currentInstance;
var helpers = {
  DirectionalLight: DirectionalLightHelper,
  PointLight: PointLightHelper,
  SpotLight: SpotLightHelper,
  HemisphereLight: HemisphereLightHelper,
  RectAreaLight: RectAreaLightHelper
};
var vLightHelper = {
  mounted: (el) => {
    var _a;
    if (!isLight(el)) {
      logWarning(`${el.type} is not a light`);
      return;
    }
    CurrentHelper = helpers[el.type];
    (_a = el.parent) == null ? void 0 : _a.add(new CurrentHelper(el, 1, el.color.getHex()));
  },
  updated: (el) => {
    var _a;
    currentInstance = (_a = el.parent) == null ? void 0 : _a.children.find((child) => child instanceof CurrentHelper);
    if (currentInstance instanceof RectAreaLightHelper) return;
    currentInstance.update();
  },
  unmounted: (el) => {
    var _a;
    if (!el.isLight) {
      logWarning(`${el.type} is not a light`);
      return;
    }
    currentInstance = (_a = el.parent) == null ? void 0 : _a.children.find((child) => child instanceof CurrentHelper);
    if (currentInstance && currentInstance.dispose) currentInstance.dispose();
    if (el.parent) el.parent.remove(currentInstance);
  }
};
var vLog = { mounted: (el, binding) => {
  if (binding.arg) {
    console.log(`v-log:${binding.arg}`, el[binding.arg]);
    return;
  }
  console.log("v-log", el);
} };
var plugin = { install(app) {
  app.component("TresCanvas", TresCanvas_default);
} };
var src_default = plugin;
export {
  DevtoolsMessenger,
  TresCanvas_default as TresCanvas,
  Context_default as TresCanvasContext,
  TresRendererError,
  component_default as UseLoader,
  buildGraph,
  catalogue,
  createTimer,
  src_default as default,
  disposeObject3D as dispose,
  extend,
  isBufferGeometry,
  isCamera,
  isClassInstance,
  isColor,
  isColorRepresentation,
  isCopyable,
  isFog,
  isGroup,
  isLayers,
  isLight,
  isMaterial,
  isMesh,
  isObject3D,
  isOrthographicCamera,
  isPerspectiveCamera,
  isProd,
  isScene,
  isTresCamera,
  isTresInstance,
  isTresObject,
  isTresPrimitive,
  isVectorLike,
  logError,
  logMessage,
  logWarning,
  normalizeColor,
  normalizeVectorFlexibleParam,
  registerTresDevtools,
  template_compiler_options_default as templateCompilerOptions,
  useCameraManager,
  useGraph,
  useLoader,
  useLoop,
  useRendererManager,
  useTres,
  useTresContext,
  useTresContextProvider,
  vDistanceTo,
  vLightHelper,
  vLog
};
/*! Bundled license information:

@tresjs/core/dist/tres.js:
  (*! #__NO_SIDE_EFFECTS__ *)
*/
//# sourceMappingURL=@tresjs_core.js.map
