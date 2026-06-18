var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// node_modules/hono/dist/compose.js
var compose = /* @__PURE__ */ __name((middleware, onError, onNotFound) => {
  return (context, next) => {
    let index = -1;
    return dispatch(0);
    async function dispatch(i) {
      if (i <= index) {
        throw new Error("next() called multiple times");
      }
      index = i;
      let res;
      let isError = false;
      let handler;
      if (middleware[i]) {
        handler = middleware[i][0][0];
        context.req.routeIndex = i;
      } else {
        handler = i === middleware.length && next || void 0;
      }
      if (handler) {
        try {
          res = await handler(context, () => dispatch(i + 1));
        } catch (err) {
          if (err instanceof Error && onError) {
            context.error = err;
            res = await onError(err, context);
            isError = true;
          } else {
            throw err;
          }
        }
      } else {
        if (context.finalized === false && onNotFound) {
          res = await onNotFound(context);
        }
      }
      if (res && (context.finalized === false || isError)) {
        context.res = res;
      }
      return context;
    }
    __name(dispatch, "dispatch");
  };
}, "compose");

// node_modules/hono/dist/request/constants.js
var GET_MATCH_RESULT = /* @__PURE__ */ Symbol();

// node_modules/hono/dist/utils/body.js
var parseBody = /* @__PURE__ */ __name(async (request, options = /* @__PURE__ */ Object.create(null)) => {
  const { all = false, dot = false } = options;
  const headers = request instanceof HonoRequest ? request.raw.headers : request.headers;
  const contentType = headers.get("Content-Type");
  if (contentType?.startsWith("multipart/form-data") || contentType?.startsWith("application/x-www-form-urlencoded")) {
    return parseFormData(request, { all, dot });
  }
  return {};
}, "parseBody");
async function parseFormData(request, options) {
  const formData = await request.formData();
  if (formData) {
    return convertFormDataToBodyData(formData, options);
  }
  return {};
}
__name(parseFormData, "parseFormData");
function convertFormDataToBodyData(formData, options) {
  const form = /* @__PURE__ */ Object.create(null);
  formData.forEach((value, key) => {
    const shouldParseAllValues = options.all || key.endsWith("[]");
    if (!shouldParseAllValues) {
      form[key] = value;
    } else {
      handleParsingAllValues(form, key, value);
    }
  });
  if (options.dot) {
    Object.entries(form).forEach(([key, value]) => {
      const shouldParseDotValues = key.includes(".");
      if (shouldParseDotValues) {
        handleParsingNestedValues(form, key, value);
        delete form[key];
      }
    });
  }
  return form;
}
__name(convertFormDataToBodyData, "convertFormDataToBodyData");
var handleParsingAllValues = /* @__PURE__ */ __name((form, key, value) => {
  if (form[key] !== void 0) {
    if (Array.isArray(form[key])) {
      ;
      form[key].push(value);
    } else {
      form[key] = [form[key], value];
    }
  } else {
    if (!key.endsWith("[]")) {
      form[key] = value;
    } else {
      form[key] = [value];
    }
  }
}, "handleParsingAllValues");
var handleParsingNestedValues = /* @__PURE__ */ __name((form, key, value) => {
  if (/(?:^|\.)__proto__\./.test(key)) {
    return;
  }
  let nestedForm = form;
  const keys = key.split(".");
  keys.forEach((key2, index) => {
    if (index === keys.length - 1) {
      nestedForm[key2] = value;
    } else {
      if (!nestedForm[key2] || typeof nestedForm[key2] !== "object" || Array.isArray(nestedForm[key2]) || nestedForm[key2] instanceof File) {
        nestedForm[key2] = /* @__PURE__ */ Object.create(null);
      }
      nestedForm = nestedForm[key2];
    }
  });
}, "handleParsingNestedValues");

// node_modules/hono/dist/utils/url.js
var splitPath = /* @__PURE__ */ __name((path) => {
  const paths = path.split("/");
  if (paths[0] === "") {
    paths.shift();
  }
  return paths;
}, "splitPath");
var splitRoutingPath = /* @__PURE__ */ __name((routePath) => {
  const { groups, path } = extractGroupsFromPath(routePath);
  const paths = splitPath(path);
  return replaceGroupMarks(paths, groups);
}, "splitRoutingPath");
var extractGroupsFromPath = /* @__PURE__ */ __name((path) => {
  const groups = [];
  path = path.replace(/\{[^}]+\}/g, (match2, index) => {
    const mark = `@${index}`;
    groups.push([mark, match2]);
    return mark;
  });
  return { groups, path };
}, "extractGroupsFromPath");
var replaceGroupMarks = /* @__PURE__ */ __name((paths, groups) => {
  for (let i = groups.length - 1; i >= 0; i--) {
    const [mark] = groups[i];
    for (let j = paths.length - 1; j >= 0; j--) {
      if (paths[j].includes(mark)) {
        paths[j] = paths[j].replace(mark, groups[i][1]);
        break;
      }
    }
  }
  return paths;
}, "replaceGroupMarks");
var patternCache = {};
var getPattern = /* @__PURE__ */ __name((label, next) => {
  if (label === "*") {
    return "*";
  }
  const match2 = label.match(/^\:([^\{\}]+)(?:\{(.+)\})?$/);
  if (match2) {
    const cacheKey = `${label}#${next}`;
    if (!patternCache[cacheKey]) {
      if (match2[2]) {
        patternCache[cacheKey] = next && next[0] !== ":" && next[0] !== "*" ? [cacheKey, match2[1], new RegExp(`^${match2[2]}(?=/${next})`)] : [label, match2[1], new RegExp(`^${match2[2]}$`)];
      } else {
        patternCache[cacheKey] = [label, match2[1], true];
      }
    }
    return patternCache[cacheKey];
  }
  return null;
}, "getPattern");
var tryDecode = /* @__PURE__ */ __name((str2, decoder) => {
  try {
    return decoder(str2);
  } catch {
    return str2.replace(/(?:%[0-9A-Fa-f]{2})+/g, (match2) => {
      try {
        return decoder(match2);
      } catch {
        return match2;
      }
    });
  }
}, "tryDecode");
var tryDecodeURI = /* @__PURE__ */ __name((str2) => tryDecode(str2, decodeURI), "tryDecodeURI");
var getPath = /* @__PURE__ */ __name((request) => {
  const url = request.url;
  const start = url.indexOf("/", url.indexOf(":") + 4);
  let i = start;
  for (; i < url.length; i++) {
    const charCode = url.charCodeAt(i);
    if (charCode === 37) {
      const queryIndex = url.indexOf("?", i);
      const hashIndex = url.indexOf("#", i);
      const end = queryIndex === -1 ? hashIndex === -1 ? void 0 : hashIndex : hashIndex === -1 ? queryIndex : Math.min(queryIndex, hashIndex);
      const path = url.slice(start, end);
      return tryDecodeURI(path.includes("%25") ? path.replace(/%25/g, "%2525") : path);
    } else if (charCode === 63 || charCode === 35) {
      break;
    }
  }
  return url.slice(start, i);
}, "getPath");
var getPathNoStrict = /* @__PURE__ */ __name((request) => {
  const result = getPath(request);
  return result.length > 1 && result.at(-1) === "/" ? result.slice(0, -1) : result;
}, "getPathNoStrict");
var mergePath = /* @__PURE__ */ __name((base, sub, ...rest) => {
  if (rest.length) {
    sub = mergePath(sub, ...rest);
  }
  return `${base?.[0] === "/" ? "" : "/"}${base}${sub === "/" ? "" : `${base?.at(-1) === "/" ? "" : "/"}${sub?.[0] === "/" ? sub.slice(1) : sub}`}`;
}, "mergePath");
var checkOptionalParameter = /* @__PURE__ */ __name((path) => {
  if (path.charCodeAt(path.length - 1) !== 63 || !path.includes(":")) {
    return null;
  }
  const segments = path.split("/");
  const results = [];
  let basePath = "";
  segments.forEach((segment) => {
    if (segment !== "" && !/\:/.test(segment)) {
      basePath += "/" + segment;
    } else if (/\:/.test(segment)) {
      if (/\?/.test(segment)) {
        if (results.length === 0 && basePath === "") {
          results.push("/");
        } else {
          results.push(basePath);
        }
        const optionalSegment = segment.replace("?", "");
        basePath += "/" + optionalSegment;
        results.push(basePath);
      } else {
        basePath += "/" + segment;
      }
    }
  });
  return results.filter((v, i, a) => a.indexOf(v) === i);
}, "checkOptionalParameter");
var _decodeURI = /* @__PURE__ */ __name((value) => {
  if (!/[%+]/.test(value)) {
    return value;
  }
  if (value.indexOf("+") !== -1) {
    value = value.replace(/\+/g, " ");
  }
  return value.indexOf("%") !== -1 ? tryDecode(value, decodeURIComponent_) : value;
}, "_decodeURI");
var _getQueryParam = /* @__PURE__ */ __name((url, key, multiple) => {
  let encoded;
  if (!multiple && key && !/[%+]/.test(key)) {
    let keyIndex2 = url.indexOf("?", 8);
    if (keyIndex2 === -1) {
      return void 0;
    }
    if (!url.startsWith(key, keyIndex2 + 1)) {
      keyIndex2 = url.indexOf(`&${key}`, keyIndex2 + 1);
    }
    while (keyIndex2 !== -1) {
      const trailingKeyCode = url.charCodeAt(keyIndex2 + key.length + 1);
      if (trailingKeyCode === 61) {
        const valueIndex = keyIndex2 + key.length + 2;
        const endIndex = url.indexOf("&", valueIndex);
        return _decodeURI(url.slice(valueIndex, endIndex === -1 ? void 0 : endIndex));
      } else if (trailingKeyCode == 38 || isNaN(trailingKeyCode)) {
        return "";
      }
      keyIndex2 = url.indexOf(`&${key}`, keyIndex2 + 1);
    }
    encoded = /[%+]/.test(url);
    if (!encoded) {
      return void 0;
    }
  }
  const results = {};
  encoded ??= /[%+]/.test(url);
  let keyIndex = url.indexOf("?", 8);
  while (keyIndex !== -1) {
    const nextKeyIndex = url.indexOf("&", keyIndex + 1);
    let valueIndex = url.indexOf("=", keyIndex);
    if (valueIndex > nextKeyIndex && nextKeyIndex !== -1) {
      valueIndex = -1;
    }
    let name = url.slice(
      keyIndex + 1,
      valueIndex === -1 ? nextKeyIndex === -1 ? void 0 : nextKeyIndex : valueIndex
    );
    if (encoded) {
      name = _decodeURI(name);
    }
    keyIndex = nextKeyIndex;
    if (name === "") {
      continue;
    }
    let value;
    if (valueIndex === -1) {
      value = "";
    } else {
      value = url.slice(valueIndex + 1, nextKeyIndex === -1 ? void 0 : nextKeyIndex);
      if (encoded) {
        value = _decodeURI(value);
      }
    }
    if (multiple) {
      if (!(results[name] && Array.isArray(results[name]))) {
        results[name] = [];
      }
      ;
      results[name].push(value);
    } else {
      results[name] ??= value;
    }
  }
  return key ? results[key] : results;
}, "_getQueryParam");
var getQueryParam = _getQueryParam;
var getQueryParams = /* @__PURE__ */ __name((url, key) => {
  return _getQueryParam(url, key, true);
}, "getQueryParams");
var decodeURIComponent_ = decodeURIComponent;

// node_modules/hono/dist/request.js
var tryDecodeURIComponent = /* @__PURE__ */ __name((str2) => tryDecode(str2, decodeURIComponent_), "tryDecodeURIComponent");
var HonoRequest = class {
  static {
    __name(this, "HonoRequest");
  }
  /**
   * `.raw` can get the raw Request object.
   *
   * @see {@link https://hono.dev/docs/api/request#raw}
   *
   * @example
   * ```ts
   * // For Cloudflare Workers
   * app.post('/', async (c) => {
   *   const metadata = c.req.raw.cf?.hostMetadata?
   *   ...
   * })
   * ```
   */
  raw;
  #validatedData;
  // Short name of validatedData
  #matchResult;
  routeIndex = 0;
  /**
   * `.path` can get the pathname of the request.
   *
   * @see {@link https://hono.dev/docs/api/request#path}
   *
   * @example
   * ```ts
   * app.get('/about/me', (c) => {
   *   const pathname = c.req.path // `/about/me`
   * })
   * ```
   */
  path;
  bodyCache = {};
  constructor(request, path = "/", matchResult = [[]]) {
    this.raw = request;
    this.path = path;
    this.#matchResult = matchResult;
    this.#validatedData = {};
  }
  param(key) {
    return key ? this.#getDecodedParam(key) : this.#getAllDecodedParams();
  }
  #getDecodedParam(key) {
    const paramKey = this.#matchResult[0][this.routeIndex][1][key];
    const param = this.#getParamValue(paramKey);
    return param && /\%/.test(param) ? tryDecodeURIComponent(param) : param;
  }
  #getAllDecodedParams() {
    const decoded = {};
    const keys = Object.keys(this.#matchResult[0][this.routeIndex][1]);
    for (const key of keys) {
      const value = this.#getParamValue(this.#matchResult[0][this.routeIndex][1][key]);
      if (value !== void 0) {
        decoded[key] = /\%/.test(value) ? tryDecodeURIComponent(value) : value;
      }
    }
    return decoded;
  }
  #getParamValue(paramKey) {
    return this.#matchResult[1] ? this.#matchResult[1][paramKey] : paramKey;
  }
  query(key) {
    return getQueryParam(this.url, key);
  }
  queries(key) {
    return getQueryParams(this.url, key);
  }
  header(name) {
    if (name) {
      return this.raw.headers.get(name) ?? void 0;
    }
    const headerData = {};
    this.raw.headers.forEach((value, key) => {
      headerData[key] = value;
    });
    return headerData;
  }
  async parseBody(options) {
    return parseBody(this, options);
  }
  #cachedBody = /* @__PURE__ */ __name((key) => {
    const { bodyCache, raw: raw2 } = this;
    const cachedBody = bodyCache[key];
    if (cachedBody) {
      return cachedBody;
    }
    const anyCachedKey = Object.keys(bodyCache)[0];
    if (anyCachedKey) {
      return bodyCache[anyCachedKey].then((body) => {
        if (anyCachedKey === "json") {
          body = JSON.stringify(body);
        }
        return new Response(body)[key]();
      });
    }
    return bodyCache[key] = raw2[key]();
  }, "#cachedBody");
  /**
   * `.json()` can parse Request body of type `application/json`
   *
   * @see {@link https://hono.dev/docs/api/request#json}
   *
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.json()
   * })
   * ```
   */
  json() {
    return this.#cachedBody("text").then((text3) => JSON.parse(text3));
  }
  /**
   * `.text()` can parse Request body of type `text/plain`
   *
   * @see {@link https://hono.dev/docs/api/request#text}
   *
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.text()
   * })
   * ```
   */
  text() {
    return this.#cachedBody("text");
  }
  /**
   * `.arrayBuffer()` parse Request body as an `ArrayBuffer`
   *
   * @see {@link https://hono.dev/docs/api/request#arraybuffer}
   *
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.arrayBuffer()
   * })
   * ```
   */
  arrayBuffer() {
    return this.#cachedBody("arrayBuffer");
  }
  /**
   * Parses the request body as a `Blob`.
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.blob();
   * });
   * ```
   * @see https://hono.dev/docs/api/request#blob
   */
  blob() {
    return this.#cachedBody("blob");
  }
  /**
   * Parses the request body as `FormData`.
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.formData();
   * });
   * ```
   * @see https://hono.dev/docs/api/request#formdata
   */
  formData() {
    return this.#cachedBody("formData");
  }
  /**
   * Adds validated data to the request.
   *
   * @param target - The target of the validation.
   * @param data - The validated data to add.
   */
  addValidatedData(target, data) {
    this.#validatedData[target] = data;
  }
  valid(target) {
    return this.#validatedData[target];
  }
  /**
   * `.url()` can get the request url strings.
   *
   * @see {@link https://hono.dev/docs/api/request#url}
   *
   * @example
   * ```ts
   * app.get('/about/me', (c) => {
   *   const url = c.req.url // `http://localhost:8787/about/me`
   *   ...
   * })
   * ```
   */
  get url() {
    return this.raw.url;
  }
  /**
   * `.method()` can get the method name of the request.
   *
   * @see {@link https://hono.dev/docs/api/request#method}
   *
   * @example
   * ```ts
   * app.get('/about/me', (c) => {
   *   const method = c.req.method // `GET`
   * })
   * ```
   */
  get method() {
    return this.raw.method;
  }
  get [GET_MATCH_RESULT]() {
    return this.#matchResult;
  }
  /**
   * `.matchedRoutes()` can return a matched route in the handler
   *
   * @deprecated
   *
   * Use matchedRoutes helper defined in "hono/route" instead.
   *
   * @see {@link https://hono.dev/docs/api/request#matchedroutes}
   *
   * @example
   * ```ts
   * app.use('*', async function logger(c, next) {
   *   await next()
   *   c.req.matchedRoutes.forEach(({ handler, method, path }, i) => {
   *     const name = handler.name || (handler.length < 2 ? '[handler]' : '[middleware]')
   *     console.log(
   *       method,
   *       ' ',
   *       path,
   *       ' '.repeat(Math.max(10 - path.length, 0)),
   *       name,
   *       i === c.req.routeIndex ? '<- respond from here' : ''
   *     )
   *   })
   * })
   * ```
   */
  get matchedRoutes() {
    return this.#matchResult[0].map(([[, route]]) => route);
  }
  /**
   * `routePath()` can retrieve the path registered within the handler
   *
   * @deprecated
   *
   * Use routePath helper defined in "hono/route" instead.
   *
   * @see {@link https://hono.dev/docs/api/request#routepath}
   *
   * @example
   * ```ts
   * app.get('/posts/:id', (c) => {
   *   return c.json({ path: c.req.routePath })
   * })
   * ```
   */
  get routePath() {
    return this.#matchResult[0].map(([[, route]]) => route)[this.routeIndex].path;
  }
};

// node_modules/hono/dist/utils/html.js
var HtmlEscapedCallbackPhase = {
  Stringify: 1,
  BeforeStream: 2,
  Stream: 3
};
var raw = /* @__PURE__ */ __name((value, callbacks) => {
  const escapedString = new String(value);
  escapedString.isEscaped = true;
  escapedString.callbacks = callbacks;
  return escapedString;
}, "raw");
var resolveCallback = /* @__PURE__ */ __name(async (str2, phase, preserveCallbacks, context, buffer) => {
  if (typeof str2 === "object" && !(str2 instanceof String)) {
    if (!(str2 instanceof Promise)) {
      str2 = str2.toString();
    }
    if (str2 instanceof Promise) {
      str2 = await str2;
    }
  }
  const callbacks = str2.callbacks;
  if (!callbacks?.length) {
    return Promise.resolve(str2);
  }
  if (buffer) {
    buffer[0] += str2;
  } else {
    buffer = [str2];
  }
  const resStr = Promise.all(callbacks.map((c) => c({ phase, buffer, context }))).then(
    (res) => Promise.all(
      res.filter(Boolean).map((str22) => resolveCallback(str22, phase, false, context, buffer))
    ).then(() => buffer[0])
  );
  if (preserveCallbacks) {
    return raw(await resStr, callbacks);
  } else {
    return resStr;
  }
}, "resolveCallback");

// node_modules/hono/dist/context.js
var TEXT_PLAIN = "text/plain; charset=UTF-8";
var setDefaultContentType = /* @__PURE__ */ __name((contentType, headers) => {
  return {
    "Content-Type": contentType,
    ...headers
  };
}, "setDefaultContentType");
var createResponseInstance = /* @__PURE__ */ __name((body, init) => new Response(body, init), "createResponseInstance");
var Context = class {
  static {
    __name(this, "Context");
  }
  #rawRequest;
  #req;
  /**
   * `.env` can get bindings (environment variables, secrets, KV namespaces, D1 database, R2 bucket etc.) in Cloudflare Workers.
   *
   * @see {@link https://hono.dev/docs/api/context#env}
   *
   * @example
   * ```ts
   * // Environment object for Cloudflare Workers
   * app.get('*', async c => {
   *   const counter = c.env.COUNTER
   * })
   * ```
   */
  env = {};
  #var;
  finalized = false;
  /**
   * `.error` can get the error object from the middleware if the Handler throws an error.
   *
   * @see {@link https://hono.dev/docs/api/context#error}
   *
   * @example
   * ```ts
   * app.use('*', async (c, next) => {
   *   await next()
   *   if (c.error) {
   *     // do something...
   *   }
   * })
   * ```
   */
  error;
  #status;
  #executionCtx;
  #res;
  #layout;
  #renderer;
  #notFoundHandler;
  #preparedHeaders;
  #matchResult;
  #path;
  /**
   * Creates an instance of the Context class.
   *
   * @param req - The Request object.
   * @param options - Optional configuration options for the context.
   */
  constructor(req, options) {
    this.#rawRequest = req;
    if (options) {
      this.#executionCtx = options.executionCtx;
      this.env = options.env;
      this.#notFoundHandler = options.notFoundHandler;
      this.#path = options.path;
      this.#matchResult = options.matchResult;
    }
  }
  /**
   * `.req` is the instance of {@link HonoRequest}.
   */
  get req() {
    this.#req ??= new HonoRequest(this.#rawRequest, this.#path, this.#matchResult);
    return this.#req;
  }
  /**
   * @see {@link https://hono.dev/docs/api/context#event}
   * The FetchEvent associated with the current request.
   *
   * @throws Will throw an error if the context does not have a FetchEvent.
   */
  get event() {
    if (this.#executionCtx && "respondWith" in this.#executionCtx) {
      return this.#executionCtx;
    } else {
      throw Error("This context has no FetchEvent");
    }
  }
  /**
   * @see {@link https://hono.dev/docs/api/context#executionctx}
   * The ExecutionContext associated with the current request.
   *
   * @throws Will throw an error if the context does not have an ExecutionContext.
   */
  get executionCtx() {
    if (this.#executionCtx) {
      return this.#executionCtx;
    } else {
      throw Error("This context has no ExecutionContext");
    }
  }
  /**
   * @see {@link https://hono.dev/docs/api/context#res}
   * The Response object for the current request.
   */
  get res() {
    return this.#res ||= createResponseInstance(null, {
      headers: this.#preparedHeaders ??= new Headers()
    });
  }
  /**
   * Sets the Response object for the current request.
   *
   * @param _res - The Response object to set.
   */
  set res(_res) {
    if (this.#res && _res) {
      _res = createResponseInstance(_res.body, _res);
      for (const [k, v] of this.#res.headers.entries()) {
        if (k === "content-type") {
          continue;
        }
        if (k === "set-cookie") {
          const cookies = this.#res.headers.getSetCookie();
          _res.headers.delete("set-cookie");
          for (const cookie of cookies) {
            _res.headers.append("set-cookie", cookie);
          }
        } else {
          _res.headers.set(k, v);
        }
      }
    }
    this.#res = _res;
    this.finalized = true;
  }
  /**
   * `.render()` can create a response within a layout.
   *
   * @see {@link https://hono.dev/docs/api/context#render-setrenderer}
   *
   * @example
   * ```ts
   * app.get('/', (c) => {
   *   return c.render('Hello!')
   * })
   * ```
   */
  render = /* @__PURE__ */ __name((...args) => {
    this.#renderer ??= (content) => this.html(content);
    return this.#renderer(...args);
  }, "render");
  /**
   * Sets the layout for the response.
   *
   * @param layout - The layout to set.
   * @returns The layout function.
   */
  setLayout = /* @__PURE__ */ __name((layout) => this.#layout = layout, "setLayout");
  /**
   * Gets the current layout for the response.
   *
   * @returns The current layout function.
   */
  getLayout = /* @__PURE__ */ __name(() => this.#layout, "getLayout");
  /**
   * `.setRenderer()` can set the layout in the custom middleware.
   *
   * @see {@link https://hono.dev/docs/api/context#render-setrenderer}
   *
   * @example
   * ```tsx
   * app.use('*', async (c, next) => {
   *   c.setRenderer((content) => {
   *     return c.html(
   *       <html>
   *         <body>
   *           <p>{content}</p>
   *         </body>
   *       </html>
   *     )
   *   })
   *   await next()
   * })
   * ```
   */
  setRenderer = /* @__PURE__ */ __name((renderer) => {
    this.#renderer = renderer;
  }, "setRenderer");
  /**
   * `.header()` can set headers.
   *
   * @see {@link https://hono.dev/docs/api/context#header}
   *
   * @example
   * ```ts
   * app.get('/welcome', (c) => {
   *   // Set headers
   *   c.header('X-Message', 'Hello!')
   *   c.header('Content-Type', 'text/plain')
   *
   *   return c.body('Thank you for coming')
   * })
   * ```
   */
  header = /* @__PURE__ */ __name((name, value, options) => {
    if (this.finalized) {
      this.#res = createResponseInstance(this.#res.body, this.#res);
    }
    const headers = this.#res ? this.#res.headers : this.#preparedHeaders ??= new Headers();
    if (value === void 0) {
      headers.delete(name);
    } else if (options?.append) {
      headers.append(name, value);
    } else {
      headers.set(name, value);
    }
  }, "header");
  status = /* @__PURE__ */ __name((status) => {
    this.#status = status;
  }, "status");
  /**
   * `.set()` can set the value specified by the key.
   *
   * @see {@link https://hono.dev/docs/api/context#set-get}
   *
   * @example
   * ```ts
   * app.use('*', async (c, next) => {
   *   c.set('message', 'Hono is hot!!')
   *   await next()
   * })
   * ```
   */
  set = /* @__PURE__ */ __name((key, value) => {
    this.#var ??= /* @__PURE__ */ new Map();
    this.#var.set(key, value);
  }, "set");
  /**
   * `.get()` can use the value specified by the key.
   *
   * @see {@link https://hono.dev/docs/api/context#set-get}
   *
   * @example
   * ```ts
   * app.get('/', (c) => {
   *   const message = c.get('message')
   *   return c.text(`The message is "${message}"`)
   * })
   * ```
   */
  get = /* @__PURE__ */ __name((key) => {
    return this.#var ? this.#var.get(key) : void 0;
  }, "get");
  /**
   * `.var` can access the value of a variable.
   *
   * @see {@link https://hono.dev/docs/api/context#var}
   *
   * @example
   * ```ts
   * const result = c.var.client.oneMethod()
   * ```
   */
  // c.var.propName is a read-only
  get var() {
    if (!this.#var) {
      return {};
    }
    return Object.fromEntries(this.#var);
  }
  #newResponse(data, arg, headers) {
    const responseHeaders = this.#res ? new Headers(this.#res.headers) : this.#preparedHeaders ?? new Headers();
    if (typeof arg === "object" && "headers" in arg) {
      const argHeaders = arg.headers instanceof Headers ? arg.headers : new Headers(arg.headers);
      for (const [key, value] of argHeaders) {
        if (key.toLowerCase() === "set-cookie") {
          responseHeaders.append(key, value);
        } else {
          responseHeaders.set(key, value);
        }
      }
    }
    if (headers) {
      for (const [k, v] of Object.entries(headers)) {
        if (typeof v === "string") {
          responseHeaders.set(k, v);
        } else {
          responseHeaders.delete(k);
          for (const v2 of v) {
            responseHeaders.append(k, v2);
          }
        }
      }
    }
    const status = typeof arg === "number" ? arg : arg?.status ?? this.#status;
    return createResponseInstance(data, { status, headers: responseHeaders });
  }
  newResponse = /* @__PURE__ */ __name((...args) => this.#newResponse(...args), "newResponse");
  /**
   * `.body()` can return the HTTP response.
   * You can set headers with `.header()` and set HTTP status code with `.status`.
   * This can also be set in `.text()`, `.json()` and so on.
   *
   * @see {@link https://hono.dev/docs/api/context#body}
   *
   * @example
   * ```ts
   * app.get('/welcome', (c) => {
   *   // Set headers
   *   c.header('X-Message', 'Hello!')
   *   c.header('Content-Type', 'text/plain')
   *   // Set HTTP status code
   *   c.status(201)
   *
   *   // Return the response body
   *   return c.body('Thank you for coming')
   * })
   * ```
   */
  body = /* @__PURE__ */ __name((data, arg, headers) => this.#newResponse(data, arg, headers), "body");
  /**
   * `.text()` can render text as `Content-Type:text/plain`.
   *
   * @see {@link https://hono.dev/docs/api/context#text}
   *
   * @example
   * ```ts
   * app.get('/say', (c) => {
   *   return c.text('Hello!')
   * })
   * ```
   */
  text = /* @__PURE__ */ __name((text3, arg, headers) => {
    return !this.#preparedHeaders && !this.#status && !arg && !headers && !this.finalized ? new Response(text3) : this.#newResponse(
      text3,
      arg,
      setDefaultContentType(TEXT_PLAIN, headers)
    );
  }, "text");
  /**
   * `.json()` can render JSON as `Content-Type:application/json`.
   *
   * @see {@link https://hono.dev/docs/api/context#json}
   *
   * @example
   * ```ts
   * app.get('/api', (c) => {
   *   return c.json({ message: 'Hello!' })
   * })
   * ```
   */
  json = /* @__PURE__ */ __name((object, arg, headers) => {
    return this.#newResponse(
      JSON.stringify(object),
      arg,
      setDefaultContentType("application/json", headers)
    );
  }, "json");
  html = /* @__PURE__ */ __name((html, arg, headers) => {
    const res = /* @__PURE__ */ __name((html2) => this.#newResponse(html2, arg, setDefaultContentType("text/html; charset=UTF-8", headers)), "res");
    return typeof html === "object" ? resolveCallback(html, HtmlEscapedCallbackPhase.Stringify, false, {}).then(res) : res(html);
  }, "html");
  /**
   * `.redirect()` can Redirect, default status code is 302.
   *
   * @see {@link https://hono.dev/docs/api/context#redirect}
   *
   * @example
   * ```ts
   * app.get('/redirect', (c) => {
   *   return c.redirect('/')
   * })
   * app.get('/redirect-permanently', (c) => {
   *   return c.redirect('/', 301)
   * })
   * ```
   */
  redirect = /* @__PURE__ */ __name((location, status) => {
    const locationString = String(location);
    this.header(
      "Location",
      // Multibyes should be encoded
      // eslint-disable-next-line no-control-regex
      !/[^\x00-\xFF]/.test(locationString) ? locationString : encodeURI(locationString)
    );
    return this.newResponse(null, status ?? 302);
  }, "redirect");
  /**
   * `.notFound()` can return the Not Found Response.
   *
   * @see {@link https://hono.dev/docs/api/context#notfound}
   *
   * @example
   * ```ts
   * app.get('/notfound', (c) => {
   *   return c.notFound()
   * })
   * ```
   */
  notFound = /* @__PURE__ */ __name(() => {
    this.#notFoundHandler ??= () => createResponseInstance();
    return this.#notFoundHandler(this);
  }, "notFound");
};

// node_modules/hono/dist/router.js
var METHOD_NAME_ALL = "ALL";
var METHOD_NAME_ALL_LOWERCASE = "all";
var METHODS = ["get", "post", "put", "delete", "options", "patch"];
var MESSAGE_MATCHER_IS_ALREADY_BUILT = "Can not add a route since the matcher is already built.";
var UnsupportedPathError = class extends Error {
  static {
    __name(this, "UnsupportedPathError");
  }
};

// node_modules/hono/dist/utils/constants.js
var COMPOSED_HANDLER = "__COMPOSED_HANDLER";

// node_modules/hono/dist/hono-base.js
var notFoundHandler = /* @__PURE__ */ __name((c) => {
  return c.text("404 Not Found", 404);
}, "notFoundHandler");
var errorHandler = /* @__PURE__ */ __name((err, c) => {
  if ("getResponse" in err) {
    const res = err.getResponse();
    return c.newResponse(res.body, res);
  }
  console.error(err);
  return c.text("Internal Server Error", 500);
}, "errorHandler");
var Hono = class _Hono {
  static {
    __name(this, "_Hono");
  }
  get;
  post;
  put;
  delete;
  options;
  patch;
  all;
  on;
  use;
  /*
    This class is like an abstract class and does not have a router.
    To use it, inherit the class and implement router in the constructor.
  */
  router;
  getPath;
  // Cannot use `#` because it requires visibility at JavaScript runtime.
  _basePath = "/";
  #path = "/";
  routes = [];
  constructor(options = {}) {
    const allMethods = [...METHODS, METHOD_NAME_ALL_LOWERCASE];
    allMethods.forEach((method) => {
      this[method] = (args1, ...args) => {
        if (typeof args1 === "string") {
          this.#path = args1;
        } else {
          this.#addRoute(method, this.#path, args1);
        }
        args.forEach((handler) => {
          this.#addRoute(method, this.#path, handler);
        });
        return this;
      };
    });
    this.on = (method, path, ...handlers) => {
      for (const p of [path].flat()) {
        this.#path = p;
        for (const m of [method].flat()) {
          handlers.map((handler) => {
            this.#addRoute(m.toUpperCase(), this.#path, handler);
          });
        }
      }
      return this;
    };
    this.use = (arg1, ...handlers) => {
      if (typeof arg1 === "string") {
        this.#path = arg1;
      } else {
        this.#path = "*";
        handlers.unshift(arg1);
      }
      handlers.forEach((handler) => {
        this.#addRoute(METHOD_NAME_ALL, this.#path, handler);
      });
      return this;
    };
    const { strict, ...optionsWithoutStrict } = options;
    Object.assign(this, optionsWithoutStrict);
    this.getPath = strict ?? true ? options.getPath ?? getPath : getPathNoStrict;
  }
  #clone() {
    const clone = new _Hono({
      router: this.router,
      getPath: this.getPath
    });
    clone.errorHandler = this.errorHandler;
    clone.#notFoundHandler = this.#notFoundHandler;
    clone.routes = this.routes;
    return clone;
  }
  #notFoundHandler = notFoundHandler;
  // Cannot use `#` because it requires visibility at JavaScript runtime.
  errorHandler = errorHandler;
  /**
   * `.route()` allows grouping other Hono instance in routes.
   *
   * @see {@link https://hono.dev/docs/api/routing#grouping}
   *
   * @param {string} path - base Path
   * @param {Hono} app - other Hono instance
   * @returns {Hono} routed Hono instance
   *
   * @example
   * ```ts
   * const app = new Hono()
   * const app2 = new Hono()
   *
   * app2.get("/user", (c) => c.text("user"))
   * app.route("/api", app2) // GET /api/user
   * ```
   */
  route(path, app2) {
    const subApp = this.basePath(path);
    app2.routes.map((r) => {
      let handler;
      if (app2.errorHandler === errorHandler) {
        handler = r.handler;
      } else {
        handler = /* @__PURE__ */ __name(async (c, next) => (await compose([], app2.errorHandler)(c, () => r.handler(c, next))).res, "handler");
        handler[COMPOSED_HANDLER] = r.handler;
      }
      subApp.#addRoute(r.method, r.path, handler);
    });
    return this;
  }
  /**
   * `.basePath()` allows base paths to be specified.
   *
   * @see {@link https://hono.dev/docs/api/routing#base-path}
   *
   * @param {string} path - base Path
   * @returns {Hono} changed Hono instance
   *
   * @example
   * ```ts
   * const api = new Hono().basePath('/api')
   * ```
   */
  basePath(path) {
    const subApp = this.#clone();
    subApp._basePath = mergePath(this._basePath, path);
    return subApp;
  }
  /**
   * `.onError()` handles an error and returns a customized Response.
   *
   * @see {@link https://hono.dev/docs/api/hono#error-handling}
   *
   * @param {ErrorHandler} handler - request Handler for error
   * @returns {Hono} changed Hono instance
   *
   * @example
   * ```ts
   * app.onError((err, c) => {
   *   console.error(`${err}`)
   *   return c.text('Custom Error Message', 500)
   * })
   * ```
   */
  onError = /* @__PURE__ */ __name((handler) => {
    this.errorHandler = handler;
    return this;
  }, "onError");
  /**
   * `.notFound()` allows you to customize a Not Found Response.
   *
   * @see {@link https://hono.dev/docs/api/hono#not-found}
   *
   * @param {NotFoundHandler} handler - request handler for not-found
   * @returns {Hono} changed Hono instance
   *
   * @example
   * ```ts
   * app.notFound((c) => {
   *   return c.text('Custom 404 Message', 404)
   * })
   * ```
   */
  notFound = /* @__PURE__ */ __name((handler) => {
    this.#notFoundHandler = handler;
    return this;
  }, "notFound");
  /**
   * `.mount()` allows you to mount applications built with other frameworks into your Hono application.
   *
   * @see {@link https://hono.dev/docs/api/hono#mount}
   *
   * @param {string} path - base Path
   * @param {Function} applicationHandler - other Request Handler
   * @param {MountOptions} [options] - options of `.mount()`
   * @returns {Hono} mounted Hono instance
   *
   * @example
   * ```ts
   * import { Router as IttyRouter } from 'itty-router'
   * import { Hono } from 'hono'
   * // Create itty-router application
   * const ittyRouter = IttyRouter()
   * // GET /itty-router/hello
   * ittyRouter.get('/hello', () => new Response('Hello from itty-router'))
   *
   * const app = new Hono()
   * app.mount('/itty-router', ittyRouter.handle)
   * ```
   *
   * @example
   * ```ts
   * const app = new Hono()
   * // Send the request to another application without modification.
   * app.mount('/app', anotherApp, {
   *   replaceRequest: (req) => req,
   * })
   * ```
   */
  mount(path, applicationHandler, options) {
    let replaceRequest;
    let optionHandler;
    if (options) {
      if (typeof options === "function") {
        optionHandler = options;
      } else {
        optionHandler = options.optionHandler;
        if (options.replaceRequest === false) {
          replaceRequest = /* @__PURE__ */ __name((request) => request, "replaceRequest");
        } else {
          replaceRequest = options.replaceRequest;
        }
      }
    }
    const getOptions = optionHandler ? (c) => {
      const options2 = optionHandler(c);
      return Array.isArray(options2) ? options2 : [options2];
    } : (c) => {
      let executionContext = void 0;
      try {
        executionContext = c.executionCtx;
      } catch {
      }
      return [c.env, executionContext];
    };
    replaceRequest ||= (() => {
      const mergedPath = mergePath(this._basePath, path);
      const pathPrefixLength = mergedPath === "/" ? 0 : mergedPath.length;
      return (request) => {
        const url = new URL(request.url);
        url.pathname = url.pathname.slice(pathPrefixLength) || "/";
        return new Request(url, request);
      };
    })();
    const handler = /* @__PURE__ */ __name(async (c, next) => {
      const res = await applicationHandler(replaceRequest(c.req.raw), ...getOptions(c));
      if (res) {
        return res;
      }
      await next();
    }, "handler");
    this.#addRoute(METHOD_NAME_ALL, mergePath(path, "*"), handler);
    return this;
  }
  #addRoute(method, path, handler) {
    method = method.toUpperCase();
    path = mergePath(this._basePath, path);
    const r = { basePath: this._basePath, path, method, handler };
    this.router.add(method, path, [handler, r]);
    this.routes.push(r);
  }
  #handleError(err, c) {
    if (err instanceof Error) {
      return this.errorHandler(err, c);
    }
    throw err;
  }
  #dispatch(request, executionCtx, env, method) {
    if (method === "HEAD") {
      return (async () => new Response(null, await this.#dispatch(request, executionCtx, env, "GET")))();
    }
    const path = this.getPath(request, { env });
    const matchResult = this.router.match(method, path);
    const c = new Context(request, {
      path,
      matchResult,
      env,
      executionCtx,
      notFoundHandler: this.#notFoundHandler
    });
    if (matchResult[0].length === 1) {
      let res;
      try {
        res = matchResult[0][0][0][0](c, async () => {
          c.res = await this.#notFoundHandler(c);
        });
      } catch (err) {
        return this.#handleError(err, c);
      }
      return res instanceof Promise ? res.then(
        (resolved) => resolved || (c.finalized ? c.res : this.#notFoundHandler(c))
      ).catch((err) => this.#handleError(err, c)) : res ?? this.#notFoundHandler(c);
    }
    const composed = compose(matchResult[0], this.errorHandler, this.#notFoundHandler);
    return (async () => {
      try {
        const context = await composed(c);
        if (!context.finalized) {
          throw new Error(
            "Context is not finalized. Did you forget to return a Response object or `await next()`?"
          );
        }
        return context.res;
      } catch (err) {
        return this.#handleError(err, c);
      }
    })();
  }
  /**
   * `.fetch()` will be entry point of your app.
   *
   * @see {@link https://hono.dev/docs/api/hono#fetch}
   *
   * @param {Request} request - request Object of request
   * @param {Env} Env - env Object
   * @param {ExecutionContext} - context of execution
   * @returns {Response | Promise<Response>} response of request
   *
   */
  fetch = /* @__PURE__ */ __name((request, ...rest) => {
    return this.#dispatch(request, rest[1], rest[0], request.method);
  }, "fetch");
  /**
   * `.request()` is a useful method for testing.
   * You can pass a URL or pathname to send a GET request.
   * app will return a Response object.
   * ```ts
   * test('GET /hello is ok', async () => {
   *   const res = await app.request('/hello')
   *   expect(res.status).toBe(200)
   * })
   * ```
   * @see https://hono.dev/docs/api/hono#request
   */
  request = /* @__PURE__ */ __name((input, requestInit, Env, executionCtx) => {
    if (input instanceof Request) {
      return this.fetch(requestInit ? new Request(input, requestInit) : input, Env, executionCtx);
    }
    input = input.toString();
    return this.fetch(
      new Request(
        /^https?:\/\//.test(input) ? input : `http://localhost${mergePath("/", input)}`,
        requestInit
      ),
      Env,
      executionCtx
    );
  }, "request");
  /**
   * `.fire()` automatically adds a global fetch event listener.
   * This can be useful for environments that adhere to the Service Worker API, such as non-ES module Cloudflare Workers.
   * @deprecated
   * Use `fire` from `hono/service-worker` instead.
   * ```ts
   * import { Hono } from 'hono'
   * import { fire } from 'hono/service-worker'
   *
   * const app = new Hono()
   * // ...
   * fire(app)
   * ```
   * @see https://hono.dev/docs/api/hono#fire
   * @see https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API
   * @see https://developers.cloudflare.com/workers/reference/migrate-to-module-workers/
   */
  fire = /* @__PURE__ */ __name(() => {
    addEventListener("fetch", (event) => {
      event.respondWith(this.#dispatch(event.request, event, void 0, event.request.method));
    });
  }, "fire");
};

// node_modules/hono/dist/router/reg-exp-router/matcher.js
var emptyParam = [];
function match(method, path) {
  const matchers = this.buildAllMatchers();
  const match2 = /* @__PURE__ */ __name(((method2, path2) => {
    const matcher = matchers[method2] || matchers[METHOD_NAME_ALL];
    const staticMatch = matcher[2][path2];
    if (staticMatch) {
      return staticMatch;
    }
    const match3 = path2.match(matcher[0]);
    if (!match3) {
      return [[], emptyParam];
    }
    const index = match3.indexOf("", 1);
    return [matcher[1][index], match3];
  }), "match2");
  this.match = match2;
  return match2(method, path);
}
__name(match, "match");

// node_modules/hono/dist/router/reg-exp-router/node.js
var LABEL_REG_EXP_STR = "[^/]+";
var ONLY_WILDCARD_REG_EXP_STR = ".*";
var TAIL_WILDCARD_REG_EXP_STR = "(?:|/.*)";
var PATH_ERROR = /* @__PURE__ */ Symbol();
var regExpMetaChars = new Set(".\\+*[^]$()");
function compareKey(a, b) {
  if (a.length === 1) {
    return b.length === 1 ? a < b ? -1 : 1 : -1;
  }
  if (b.length === 1) {
    return 1;
  }
  if (a === ONLY_WILDCARD_REG_EXP_STR || a === TAIL_WILDCARD_REG_EXP_STR) {
    return 1;
  } else if (b === ONLY_WILDCARD_REG_EXP_STR || b === TAIL_WILDCARD_REG_EXP_STR) {
    return -1;
  }
  if (a === LABEL_REG_EXP_STR) {
    return 1;
  } else if (b === LABEL_REG_EXP_STR) {
    return -1;
  }
  return a.length === b.length ? a < b ? -1 : 1 : b.length - a.length;
}
__name(compareKey, "compareKey");
var Node = class _Node {
  static {
    __name(this, "_Node");
  }
  #index;
  #varIndex;
  #children = /* @__PURE__ */ Object.create(null);
  insert(tokens, index, paramMap, context, pathErrorCheckOnly) {
    if (tokens.length === 0) {
      if (this.#index !== void 0) {
        throw PATH_ERROR;
      }
      if (pathErrorCheckOnly) {
        return;
      }
      this.#index = index;
      return;
    }
    const [token, ...restTokens] = tokens;
    const pattern = token === "*" ? restTokens.length === 0 ? ["", "", ONLY_WILDCARD_REG_EXP_STR] : ["", "", LABEL_REG_EXP_STR] : token === "/*" ? ["", "", TAIL_WILDCARD_REG_EXP_STR] : token.match(/^\:([^\{\}]+)(?:\{(.+)\})?$/);
    let node;
    if (pattern) {
      const name = pattern[1];
      let regexpStr = pattern[2] || LABEL_REG_EXP_STR;
      if (name && pattern[2]) {
        if (regexpStr === ".*") {
          throw PATH_ERROR;
        }
        regexpStr = regexpStr.replace(/^\((?!\?:)(?=[^)]+\)$)/, "(?:");
        if (/\((?!\?:)/.test(regexpStr)) {
          throw PATH_ERROR;
        }
      }
      node = this.#children[regexpStr];
      if (!node) {
        if (Object.keys(this.#children).some(
          (k) => k !== ONLY_WILDCARD_REG_EXP_STR && k !== TAIL_WILDCARD_REG_EXP_STR
        )) {
          throw PATH_ERROR;
        }
        if (pathErrorCheckOnly) {
          return;
        }
        node = this.#children[regexpStr] = new _Node();
        if (name !== "") {
          node.#varIndex = context.varIndex++;
        }
      }
      if (!pathErrorCheckOnly && name !== "") {
        paramMap.push([name, node.#varIndex]);
      }
    } else {
      node = this.#children[token];
      if (!node) {
        if (Object.keys(this.#children).some(
          (k) => k.length > 1 && k !== ONLY_WILDCARD_REG_EXP_STR && k !== TAIL_WILDCARD_REG_EXP_STR
        )) {
          throw PATH_ERROR;
        }
        if (pathErrorCheckOnly) {
          return;
        }
        node = this.#children[token] = new _Node();
      }
    }
    node.insert(restTokens, index, paramMap, context, pathErrorCheckOnly);
  }
  buildRegExpStr() {
    const childKeys = Object.keys(this.#children).sort(compareKey);
    const strList = childKeys.map((k) => {
      const c = this.#children[k];
      return (typeof c.#varIndex === "number" ? `(${k})@${c.#varIndex}` : regExpMetaChars.has(k) ? `\\${k}` : k) + c.buildRegExpStr();
    });
    if (typeof this.#index === "number") {
      strList.unshift(`#${this.#index}`);
    }
    if (strList.length === 0) {
      return "";
    }
    if (strList.length === 1) {
      return strList[0];
    }
    return "(?:" + strList.join("|") + ")";
  }
};

// node_modules/hono/dist/router/reg-exp-router/trie.js
var Trie = class {
  static {
    __name(this, "Trie");
  }
  #context = { varIndex: 0 };
  #root = new Node();
  insert(path, index, pathErrorCheckOnly) {
    const paramAssoc = [];
    const groups = [];
    for (let i = 0; ; ) {
      let replaced = false;
      path = path.replace(/\{[^}]+\}/g, (m) => {
        const mark = `@\\${i}`;
        groups[i] = [mark, m];
        i++;
        replaced = true;
        return mark;
      });
      if (!replaced) {
        break;
      }
    }
    const tokens = path.match(/(?::[^\/]+)|(?:\/\*$)|./g) || [];
    for (let i = groups.length - 1; i >= 0; i--) {
      const [mark] = groups[i];
      for (let j = tokens.length - 1; j >= 0; j--) {
        if (tokens[j].indexOf(mark) !== -1) {
          tokens[j] = tokens[j].replace(mark, groups[i][1]);
          break;
        }
      }
    }
    this.#root.insert(tokens, index, paramAssoc, this.#context, pathErrorCheckOnly);
    return paramAssoc;
  }
  buildRegExp() {
    let regexp = this.#root.buildRegExpStr();
    if (regexp === "") {
      return [/^$/, [], []];
    }
    let captureIndex = 0;
    const indexReplacementMap = [];
    const paramReplacementMap = [];
    regexp = regexp.replace(/#(\d+)|@(\d+)|\.\*\$/g, (_, handlerIndex, paramIndex) => {
      if (handlerIndex !== void 0) {
        indexReplacementMap[++captureIndex] = Number(handlerIndex);
        return "$()";
      }
      if (paramIndex !== void 0) {
        paramReplacementMap[Number(paramIndex)] = ++captureIndex;
        return "";
      }
      return "";
    });
    return [new RegExp(`^${regexp}`), indexReplacementMap, paramReplacementMap];
  }
};

// node_modules/hono/dist/router/reg-exp-router/router.js
var nullMatcher = [/^$/, [], /* @__PURE__ */ Object.create(null)];
var wildcardRegExpCache = /* @__PURE__ */ Object.create(null);
function buildWildcardRegExp(path) {
  return wildcardRegExpCache[path] ??= new RegExp(
    path === "*" ? "" : `^${path.replace(
      /\/\*$|([.\\+*[^\]$()])/g,
      (_, metaChar) => metaChar ? `\\${metaChar}` : "(?:|/.*)"
    )}$`
  );
}
__name(buildWildcardRegExp, "buildWildcardRegExp");
function clearWildcardRegExpCache() {
  wildcardRegExpCache = /* @__PURE__ */ Object.create(null);
}
__name(clearWildcardRegExpCache, "clearWildcardRegExpCache");
function buildMatcherFromPreprocessedRoutes(routes) {
  const trie = new Trie();
  const handlerData = [];
  if (routes.length === 0) {
    return nullMatcher;
  }
  const routesWithStaticPathFlag = routes.map(
    (route) => [!/\*|\/:/.test(route[0]), ...route]
  ).sort(
    ([isStaticA, pathA], [isStaticB, pathB]) => isStaticA ? 1 : isStaticB ? -1 : pathA.length - pathB.length
  );
  const staticMap = /* @__PURE__ */ Object.create(null);
  for (let i = 0, j = -1, len = routesWithStaticPathFlag.length; i < len; i++) {
    const [pathErrorCheckOnly, path, handlers] = routesWithStaticPathFlag[i];
    if (pathErrorCheckOnly) {
      staticMap[path] = [handlers.map(([h]) => [h, /* @__PURE__ */ Object.create(null)]), emptyParam];
    } else {
      j++;
    }
    let paramAssoc;
    try {
      paramAssoc = trie.insert(path, j, pathErrorCheckOnly);
    } catch (e) {
      throw e === PATH_ERROR ? new UnsupportedPathError(path) : e;
    }
    if (pathErrorCheckOnly) {
      continue;
    }
    handlerData[j] = handlers.map(([h, paramCount]) => {
      const paramIndexMap = /* @__PURE__ */ Object.create(null);
      paramCount -= 1;
      for (; paramCount >= 0; paramCount--) {
        const [key, value] = paramAssoc[paramCount];
        paramIndexMap[key] = value;
      }
      return [h, paramIndexMap];
    });
  }
  const [regexp, indexReplacementMap, paramReplacementMap] = trie.buildRegExp();
  for (let i = 0, len = handlerData.length; i < len; i++) {
    for (let j = 0, len2 = handlerData[i].length; j < len2; j++) {
      const map = handlerData[i][j]?.[1];
      if (!map) {
        continue;
      }
      const keys = Object.keys(map);
      for (let k = 0, len3 = keys.length; k < len3; k++) {
        map[keys[k]] = paramReplacementMap[map[keys[k]]];
      }
    }
  }
  const handlerMap = [];
  for (const i in indexReplacementMap) {
    handlerMap[i] = handlerData[indexReplacementMap[i]];
  }
  return [regexp, handlerMap, staticMap];
}
__name(buildMatcherFromPreprocessedRoutes, "buildMatcherFromPreprocessedRoutes");
function findMiddleware(middleware, path) {
  if (!middleware) {
    return void 0;
  }
  for (const k of Object.keys(middleware).sort((a, b) => b.length - a.length)) {
    if (buildWildcardRegExp(k).test(path)) {
      return [...middleware[k]];
    }
  }
  return void 0;
}
__name(findMiddleware, "findMiddleware");
var RegExpRouter = class {
  static {
    __name(this, "RegExpRouter");
  }
  name = "RegExpRouter";
  #middleware;
  #routes;
  constructor() {
    this.#middleware = { [METHOD_NAME_ALL]: /* @__PURE__ */ Object.create(null) };
    this.#routes = { [METHOD_NAME_ALL]: /* @__PURE__ */ Object.create(null) };
  }
  add(method, path, handler) {
    const middleware = this.#middleware;
    const routes = this.#routes;
    if (!middleware || !routes) {
      throw new Error(MESSAGE_MATCHER_IS_ALREADY_BUILT);
    }
    if (!middleware[method]) {
      ;
      [middleware, routes].forEach((handlerMap) => {
        handlerMap[method] = /* @__PURE__ */ Object.create(null);
        Object.keys(handlerMap[METHOD_NAME_ALL]).forEach((p) => {
          handlerMap[method][p] = [...handlerMap[METHOD_NAME_ALL][p]];
        });
      });
    }
    if (path === "/*") {
      path = "*";
    }
    const paramCount = (path.match(/\/:/g) || []).length;
    if (/\*$/.test(path)) {
      const re = buildWildcardRegExp(path);
      if (method === METHOD_NAME_ALL) {
        Object.keys(middleware).forEach((m) => {
          middleware[m][path] ||= findMiddleware(middleware[m], path) || findMiddleware(middleware[METHOD_NAME_ALL], path) || [];
        });
      } else {
        middleware[method][path] ||= findMiddleware(middleware[method], path) || findMiddleware(middleware[METHOD_NAME_ALL], path) || [];
      }
      Object.keys(middleware).forEach((m) => {
        if (method === METHOD_NAME_ALL || method === m) {
          Object.keys(middleware[m]).forEach((p) => {
            re.test(p) && middleware[m][p].push([handler, paramCount]);
          });
        }
      });
      Object.keys(routes).forEach((m) => {
        if (method === METHOD_NAME_ALL || method === m) {
          Object.keys(routes[m]).forEach(
            (p) => re.test(p) && routes[m][p].push([handler, paramCount])
          );
        }
      });
      return;
    }
    const paths = checkOptionalParameter(path) || [path];
    for (let i = 0, len = paths.length; i < len; i++) {
      const path2 = paths[i];
      Object.keys(routes).forEach((m) => {
        if (method === METHOD_NAME_ALL || method === m) {
          routes[m][path2] ||= [
            ...findMiddleware(middleware[m], path2) || findMiddleware(middleware[METHOD_NAME_ALL], path2) || []
          ];
          routes[m][path2].push([handler, paramCount - len + i + 1]);
        }
      });
    }
  }
  match = match;
  buildAllMatchers() {
    const matchers = /* @__PURE__ */ Object.create(null);
    Object.keys(this.#routes).concat(Object.keys(this.#middleware)).forEach((method) => {
      matchers[method] ||= this.#buildMatcher(method);
    });
    this.#middleware = this.#routes = void 0;
    clearWildcardRegExpCache();
    return matchers;
  }
  #buildMatcher(method) {
    const routes = [];
    let hasOwnRoute = method === METHOD_NAME_ALL;
    [this.#middleware, this.#routes].forEach((r) => {
      const ownRoute = r[method] ? Object.keys(r[method]).map((path) => [path, r[method][path]]) : [];
      if (ownRoute.length !== 0) {
        hasOwnRoute ||= true;
        routes.push(...ownRoute);
      } else if (method !== METHOD_NAME_ALL) {
        routes.push(
          ...Object.keys(r[METHOD_NAME_ALL]).map((path) => [path, r[METHOD_NAME_ALL][path]])
        );
      }
    });
    if (!hasOwnRoute) {
      return null;
    } else {
      return buildMatcherFromPreprocessedRoutes(routes);
    }
  }
};

// node_modules/hono/dist/router/smart-router/router.js
var SmartRouter = class {
  static {
    __name(this, "SmartRouter");
  }
  name = "SmartRouter";
  #routers = [];
  #routes = [];
  constructor(init) {
    this.#routers = init.routers;
  }
  add(method, path, handler) {
    if (!this.#routes) {
      throw new Error(MESSAGE_MATCHER_IS_ALREADY_BUILT);
    }
    this.#routes.push([method, path, handler]);
  }
  match(method, path) {
    if (!this.#routes) {
      throw new Error("Fatal error");
    }
    const routers = this.#routers;
    const routes = this.#routes;
    const len = routers.length;
    let i = 0;
    let res;
    for (; i < len; i++) {
      const router = routers[i];
      try {
        for (let i2 = 0, len2 = routes.length; i2 < len2; i2++) {
          router.add(...routes[i2]);
        }
        res = router.match(method, path);
      } catch (e) {
        if (e instanceof UnsupportedPathError) {
          continue;
        }
        throw e;
      }
      this.match = router.match.bind(router);
      this.#routers = [router];
      this.#routes = void 0;
      break;
    }
    if (i === len) {
      throw new Error("Fatal error");
    }
    this.name = `SmartRouter + ${this.activeRouter.name}`;
    return res;
  }
  get activeRouter() {
    if (this.#routes || this.#routers.length !== 1) {
      throw new Error("No active router has been determined yet.");
    }
    return this.#routers[0];
  }
};

// node_modules/hono/dist/router/trie-router/node.js
var emptyParams = /* @__PURE__ */ Object.create(null);
var hasChildren = /* @__PURE__ */ __name((children) => {
  for (const _ in children) {
    return true;
  }
  return false;
}, "hasChildren");
var Node2 = class _Node2 {
  static {
    __name(this, "_Node");
  }
  #methods;
  #children;
  #patterns;
  #order = 0;
  #params = emptyParams;
  constructor(method, handler, children) {
    this.#children = children || /* @__PURE__ */ Object.create(null);
    this.#methods = [];
    if (method && handler) {
      const m = /* @__PURE__ */ Object.create(null);
      m[method] = { handler, possibleKeys: [], score: 0 };
      this.#methods = [m];
    }
    this.#patterns = [];
  }
  insert(method, path, handler) {
    this.#order = ++this.#order;
    let curNode = this;
    const parts = splitRoutingPath(path);
    const possibleKeys = [];
    for (let i = 0, len = parts.length; i < len; i++) {
      const p = parts[i];
      const nextP = parts[i + 1];
      const pattern = getPattern(p, nextP);
      const key = Array.isArray(pattern) ? pattern[0] : p;
      if (key in curNode.#children) {
        curNode = curNode.#children[key];
        if (pattern) {
          possibleKeys.push(pattern[1]);
        }
        continue;
      }
      curNode.#children[key] = new _Node2();
      if (pattern) {
        curNode.#patterns.push(pattern);
        possibleKeys.push(pattern[1]);
      }
      curNode = curNode.#children[key];
    }
    curNode.#methods.push({
      [method]: {
        handler,
        possibleKeys: possibleKeys.filter((v, i, a) => a.indexOf(v) === i),
        score: this.#order
      }
    });
    return curNode;
  }
  #pushHandlerSets(handlerSets, node, method, nodeParams, params) {
    for (let i = 0, len = node.#methods.length; i < len; i++) {
      const m = node.#methods[i];
      const handlerSet = m[method] || m[METHOD_NAME_ALL];
      const processedSet = {};
      if (handlerSet !== void 0) {
        handlerSet.params = /* @__PURE__ */ Object.create(null);
        handlerSets.push(handlerSet);
        if (nodeParams !== emptyParams || params && params !== emptyParams) {
          for (let i2 = 0, len2 = handlerSet.possibleKeys.length; i2 < len2; i2++) {
            const key = handlerSet.possibleKeys[i2];
            const processed = processedSet[handlerSet.score];
            handlerSet.params[key] = params?.[key] && !processed ? params[key] : nodeParams[key] ?? params?.[key];
            processedSet[handlerSet.score] = true;
          }
        }
      }
    }
  }
  search(method, path) {
    const handlerSets = [];
    this.#params = emptyParams;
    const curNode = this;
    let curNodes = [curNode];
    const parts = splitPath(path);
    const curNodesQueue = [];
    const len = parts.length;
    let partOffsets = null;
    for (let i = 0; i < len; i++) {
      const part = parts[i];
      const isLast = i === len - 1;
      const tempNodes = [];
      for (let j = 0, len2 = curNodes.length; j < len2; j++) {
        const node = curNodes[j];
        const nextNode = node.#children[part];
        if (nextNode) {
          nextNode.#params = node.#params;
          if (isLast) {
            if (nextNode.#children["*"]) {
              this.#pushHandlerSets(handlerSets, nextNode.#children["*"], method, node.#params);
            }
            this.#pushHandlerSets(handlerSets, nextNode, method, node.#params);
          } else {
            tempNodes.push(nextNode);
          }
        }
        for (let k = 0, len3 = node.#patterns.length; k < len3; k++) {
          const pattern = node.#patterns[k];
          const params = node.#params === emptyParams ? {} : { ...node.#params };
          if (pattern === "*") {
            const astNode = node.#children["*"];
            if (astNode) {
              this.#pushHandlerSets(handlerSets, astNode, method, node.#params);
              astNode.#params = params;
              tempNodes.push(astNode);
            }
            continue;
          }
          const [key, name, matcher] = pattern;
          if (!part && !(matcher instanceof RegExp)) {
            continue;
          }
          const child = node.#children[key];
          if (matcher instanceof RegExp) {
            if (partOffsets === null) {
              partOffsets = new Array(len);
              let offset = path[0] === "/" ? 1 : 0;
              for (let p = 0; p < len; p++) {
                partOffsets[p] = offset;
                offset += parts[p].length + 1;
              }
            }
            const restPathString = path.substring(partOffsets[i]);
            const m = matcher.exec(restPathString);
            if (m) {
              params[name] = m[0];
              this.#pushHandlerSets(handlerSets, child, method, node.#params, params);
              if (hasChildren(child.#children)) {
                child.#params = params;
                const componentCount = m[0].match(/\//)?.length ?? 0;
                const targetCurNodes = curNodesQueue[componentCount] ||= [];
                targetCurNodes.push(child);
              }
              continue;
            }
          }
          if (matcher === true || matcher.test(part)) {
            params[name] = part;
            if (isLast) {
              this.#pushHandlerSets(handlerSets, child, method, params, node.#params);
              if (child.#children["*"]) {
                this.#pushHandlerSets(
                  handlerSets,
                  child.#children["*"],
                  method,
                  params,
                  node.#params
                );
              }
            } else {
              child.#params = params;
              tempNodes.push(child);
            }
          }
        }
      }
      const shifted = curNodesQueue.shift();
      curNodes = shifted ? tempNodes.concat(shifted) : tempNodes;
    }
    if (handlerSets.length > 1) {
      handlerSets.sort((a, b) => {
        return a.score - b.score;
      });
    }
    return [handlerSets.map(({ handler, params }) => [handler, params])];
  }
};

// node_modules/hono/dist/router/trie-router/router.js
var TrieRouter = class {
  static {
    __name(this, "TrieRouter");
  }
  name = "TrieRouter";
  #node;
  constructor() {
    this.#node = new Node2();
  }
  add(method, path, handler) {
    const results = checkOptionalParameter(path);
    if (results) {
      for (let i = 0, len = results.length; i < len; i++) {
        this.#node.insert(method, results[i], handler);
      }
      return;
    }
    this.#node.insert(method, path, handler);
  }
  match(method, path) {
    return this.#node.search(method, path);
  }
};

// node_modules/hono/dist/hono.js
var Hono2 = class extends Hono {
  static {
    __name(this, "Hono");
  }
  /**
   * Creates an instance of the Hono class.
   *
   * @param options - Optional configuration options for the Hono instance.
   */
  constructor(options = {}) {
    super(options);
    this.router = options.router ?? new SmartRouter({
      routers: [new RegExpRouter(), new TrieRouter()]
    });
  }
};

// node_modules/hono/dist/middleware/cors/index.js
var cors = /* @__PURE__ */ __name((options) => {
  const defaults = {
    origin: "*",
    allowMethods: ["GET", "HEAD", "PUT", "POST", "DELETE", "PATCH"],
    allowHeaders: [],
    exposeHeaders: []
  };
  const opts = {
    ...defaults,
    ...options
  };
  const findAllowOrigin = ((optsOrigin) => {
    if (typeof optsOrigin === "string") {
      if (optsOrigin === "*") {
        if (opts.credentials) {
          return (origin) => origin || null;
        }
        return () => optsOrigin;
      } else {
        return (origin) => optsOrigin === origin ? origin : null;
      }
    } else if (typeof optsOrigin === "function") {
      return optsOrigin;
    } else {
      return (origin) => optsOrigin.includes(origin) ? origin : null;
    }
  })(opts.origin);
  const findAllowMethods = ((optsAllowMethods) => {
    if (typeof optsAllowMethods === "function") {
      return optsAllowMethods;
    } else if (Array.isArray(optsAllowMethods)) {
      return () => optsAllowMethods;
    } else {
      return () => [];
    }
  })(opts.allowMethods);
  return /* @__PURE__ */ __name(async function cors2(c, next) {
    function set(key, value) {
      c.res.headers.set(key, value);
    }
    __name(set, "set");
    const allowOrigin = await findAllowOrigin(c.req.header("origin") || "", c);
    if (allowOrigin) {
      set("Access-Control-Allow-Origin", allowOrigin);
    }
    if (opts.credentials) {
      set("Access-Control-Allow-Credentials", "true");
    }
    if (opts.exposeHeaders?.length) {
      set("Access-Control-Expose-Headers", opts.exposeHeaders.join(","));
    }
    if (c.req.method === "OPTIONS") {
      if (opts.origin !== "*" || opts.credentials) {
        set("Vary", "Origin");
      }
      if (opts.maxAge != null) {
        set("Access-Control-Max-Age", opts.maxAge.toString());
      }
      const allowMethods = await findAllowMethods(c.req.header("origin") || "", c);
      if (allowMethods.length) {
        set("Access-Control-Allow-Methods", allowMethods.join(","));
      }
      let headers = opts.allowHeaders;
      if (!headers?.length) {
        const requestHeaders = c.req.header("Access-Control-Request-Headers");
        if (requestHeaders) {
          headers = requestHeaders.split(/\s*,\s*/);
        }
      }
      if (headers?.length) {
        set("Access-Control-Allow-Headers", headers.join(","));
        c.res.headers.append("Vary", "Access-Control-Request-Headers");
      }
      c.res.headers.delete("Content-Length");
      c.res.headers.delete("Content-Type");
      return new Response(null, {
        headers: c.res.headers,
        status: 204,
        statusText: "No Content"
      });
    }
    await next();
    if (opts.origin !== "*" || opts.credentials) {
      c.header("Vary", "Origin", { append: true });
    }
  }, "cors2");
}, "cors");

// functions/api/fallbackClassifier.ts
var INQUIRY_MATCH_PATTERN = /\b(hire|nanny|maid|housemaid|infant care|childcare|babysitter|recommend|shortlist|match)\b/i;
var CONTRACT_PATTERN = /\b(contract|generate contract|create contract|draft contract)\b/i;
var SCHEDULE_PATTERN = /\b(schedule|interview|appointment|book|arrange meeting|confirm interview)\b/i;
var NOTIFICATION_PATTERN = /\b(notify|send message|reminder|send email|send sms)\b/i;
var HUMAN_REVIEW_PATTERN = /\b(complaint|refund|angry|issue|problem|bad service|disappointed|manager|escalation|escalate|dispute)\b/i;
var classifyFallback = /* @__PURE__ */ __name((message) => {
  const text3 = message.trim();
  if (INQUIRY_MATCH_PATTERN.test(text3)) {
    return { workflow: "inquiry_match" };
  }
  if (HUMAN_REVIEW_PATTERN.test(text3)) {
    return { workflow: "human_review" };
  }
  if (CONTRACT_PATTERN.test(text3)) {
    return { workflow: "contract_creation" };
  }
  if (SCHEDULE_PATTERN.test(text3)) {
    return { workflow: "schedule_creation" };
  }
  if (NOTIFICATION_PATTERN.test(text3)) {
    return { workflow: "notification_only" };
  }
  return { workflow: "inquiry_only" };
}, "classifyFallback");

// functions/api/services/ai/groq.ts
var GROQ_CHAT_URL = "https://api.groq.com/openai/v1/chat/completions";
var rateLimitBuckets = /* @__PURE__ */ new Map();
var sleep = /* @__PURE__ */ __name((ms) => new Promise((resolve) => setTimeout(resolve, ms)), "sleep");
var assertAiRateLimit = /* @__PURE__ */ __name((key, limit = 30, windowMs = 6e4) => {
  const now3 = Date.now();
  const recent = (rateLimitBuckets.get(key) ?? []).filter((ts) => now3 - ts < windowMs);
  if (recent.length >= limit) {
    throw new Error("AI rate limit exceeded. Please try again in a minute.");
  }
  recent.push(now3);
  rateLimitBuckets.set(key, recent);
}, "assertAiRateLimit");
var parseJson = /* @__PURE__ */ __name((text3) => {
  if (!text3.trim()) return null;
  try {
    return JSON.parse(text3);
  } catch {
    return null;
  }
}, "parseJson");
var readGroqError = /* @__PURE__ */ __name(async (response) => {
  const text3 = await response.text().catch(() => "");
  const body = parseJson(text3);
  return body?.error?.message || text3.trim() || response.statusText || "No response body";
}, "readGroqError");
var groqChat = /* @__PURE__ */ __name(async (options) => {
  const retries = options.retries ?? 2;
  let lastError = null;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await fetch(GROQ_CHAT_URL, {
        method: "POST",
        signal: options.signal,
        headers: {
          authorization: `Bearer ${options.apiKey}`,
          "content-type": "application/json",
          "user-agent": "helped-web-worker/1.0"
        },
        body: JSON.stringify({
          model: options.model,
          messages: options.messages,
          temperature: options.temperature ?? 0.25,
          max_tokens: options.maxTokens ?? 1e3,
          response_format: options.responseFormat === "json_object" ? { type: "json_object" } : void 0
        })
      });
      if (!response.ok) {
        const message = await readGroqError(response);
        if ((response.status === 429 || response.status >= 500) && attempt < retries) {
          await sleep(300 * Math.pow(2, attempt));
          continue;
        }
        throw new Error(`Groq request failed (${response.status}): ${message}`);
      }
      const text3 = await response.text();
      const data = parseJson(text3);
      if (!data) {
        throw new Error(
          text3.trim() ? `Groq returned a non-JSON response: ${text3.trim().slice(0, 200)}` : "Groq returned an empty response."
        );
      }
      return {
        id: data.id ?? "",
        content: data.choices?.[0]?.message?.content?.trim() ?? "",
        usage: data.usage ?? {}
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Groq request failed");
      if (attempt < retries) {
        await sleep(300 * Math.pow(2, attempt));
        continue;
      }
    }
  }
  throw lastError ?? new Error("Groq request failed");
}, "groqChat");
var groqChatStream = /* @__PURE__ */ __name(async (options) => {
  const response = await fetch(GROQ_CHAT_URL, {
    method: "POST",
    signal: options.signal,
    headers: {
      authorization: `Bearer ${options.apiKey}`,
      "content-type": "application/json",
      "user-agent": "helped-web-worker/1.0"
    },
    body: JSON.stringify({
      model: options.model,
      messages: options.messages,
      temperature: options.temperature ?? 0.25,
      max_tokens: options.maxTokens ?? 1e3,
      stream: true
    })
  });
  if (!response.ok || !response.body) {
    throw new Error(`Groq stream failed (${response.status}): ${await readGroqError(response)}`);
  }
  return response.body;
}, "groqChatStream");
var parseJsonObject = /* @__PURE__ */ __name((content, fallback) => {
  try {
    return JSON.parse(content);
  } catch {
    const match2 = content.match(/\{[\s\S]*\}/);
    if (!match2) return fallback;
    try {
      return JSON.parse(match2[0]);
    } catch {
      return fallback;
    }
  }
}, "parseJsonObject");

// functions/api/services/ai/prompts.ts
var sharedGuardrails = `
You are an AI agent inside Helped, an FDW / maid agency management platform.
Use only the provided context and tool results. If data is missing, say what is missing and suggest the safest next step.
Do not invent agency policies, prices, legal rules, contract states, worker histories, medical status, or document verification.
Keep personal data private. Never reveal records outside the current actor's allowed scope.
Return concise, operational answers that a Singapore maid agency, employer, applicant, or administrator can act on.
`.trim();
var agentDefinitions = {
  receptionist: {
    id: "receptionist",
    name: "AI Receptionist",
    audience: "public",
    model: "llama-3.3-70b-versatile",
    temperature: 0.35,
    maxTokens: 900,
    systemPrompt: `
${sharedGuardrails}

Role:
You are the AI receptionist for an FDW (Foreign Domestic Worker / maid) agency's public website. You handle hiring enquiries, helper browsing, FDW applications, platform navigation, complaints, and general questions.

Context available to you (from tool results):
- contactInfo: phone, email, whatsapp number, whatsappLink (https://wa.me/... deep link), contact person, office hours, address, website, Facebook, licenseNo, aboutUs.
- momPersonnel: MOM-registered personnel names and registration numbers.
- testimonials: real client testimonials.
- publicMaids: helper profiles \u2014 name, referenceCode, nationality, type (Fresh/Transfer/Ex-Singapore), status, age, educationLevel, religion, maritalStatus, numberOfChildren, languageSkills, skillsPreferences (incl. expectedSalary), workAreas, employmentHistory, introduction.
- publicFaqs: agency-specific answers about fees, process, and contact.
- platformGuide: exact website paths and step-by-step process guides for hiring, enquiring, applying as FDW, and sending requests. Always use these paths when directing visitors.
- agencyHighlights: this agency's name, license number, total public helpers, available helpers count, transfer helpers count, nationalities offered, and recent client testimonials. Use this to answer agency comparison and "which agency is best" questions.

Sales Priority (apply before everything else):
- Primary goal: convert visitor interest into enquiries or helper selections. Every response moves the visitor one step closer.
- Hiring intent trigger words (treat all the same): "looking for a maid/helper", "need help at home", "need someone to cook/clean/care", "need childcare/elderly care", "how much does it cost", "what helpers do you have". On ANY of these \u2192 immediately showcase 2\u20133 relevant helpers.
- Always showcase helpers FILTERED to the visitor's request: if they ask for Filipino \u2192 only Filipino helpers; if they ask for elderly care \u2192 helpers with elderly care experience; if they ask for transfer \u2192 only transfer helpers.
- Feature available helpers first (status = available), then transfer helpers for fast deployment.
- Use [MAID:referenceCode] markers so profile cards appear in the UI.
- After any process/fee answer \u2192 pivot: "We have some great candidates \u2014 shall I show you profiles?"
- End every reply with a forward-pushing call to action.

Capabilities:
- Show available helpers filtered by nationality, type, skills, language, age, budget, or any combination.
- Guide employers through the full hiring process step by step (use platformGuide.howToHire).
- Guide FDW applicants to apply (use platformGuide.howToApplyAsFDW, path: platformGuide.pages.applyAsFDW).
- Explain how to submit an enquiry (use platformGuide.howToEnquire, path: platformGuide.pages.submitEnquiry).
- Explain how to send a hiring request (use platformGuide.howToSendRequest).
- Direct visitors to the correct page for any task using platformGuide.pages paths.
- Collect lead info (name, phone/email, requirements) when visitors volunteer it.
- Route contact and callback requests using contactInfo.

Handling specific topics:
HOW TO HIRE A MAID: Walk through platformGuide.howToHire step by step. Show 2\u20133 helpers immediately. Direct to platformGuide.pages.browseHelpers to browse all profiles or platformGuide.pages.submitEnquiry to send requirements.
HOW TO APPLY AS A MAID / FDW APPLICANT: Walk through platformGuide.howToApplyAsFDW. Direct to platformGuide.pages.applyAsFDW. For status checks, direct to platformGuide.pages.checkApplicationStatus.
HOW TO SEND AN ENQUIRY: Walk through platformGuide.howToEnquire. Give the direct link to platformGuide.pages.submitEnquiry. Also offer the WhatsApp link from contactInfo for immediate response.
HOW TO SEND A REQUEST / HOW TO HIRE: Use platformGuide.howToSendRequest. Distinguish logged-in employers (portal) from public visitors (submit enquiry). Direct public visitors to platformGuide.pages.submitEnquiry.
SHOW AVAILABLE HELPERS / WHAT MAIDS DO YOU HAVE: Show 3\u20135 helpers from publicMaids using [MAID:referenceCode] markers. Offer to filter further by nationality, skill, or type. Direct to platformGuide.pages.browseHelpers for full browsing.
HELPER BY SKILL (e.g. "elderly care", "childcare", "cooking", "disabled care"): Filter publicMaids \u2014 match helpers whose skillsPreferences, workAreas, or employmentHistory mentions the requested skill. Show matched helpers with [MAID:referenceCode]. If no exact match, show closest and say so.
HELPER TYPES: Use platformGuide.helperTypes for precise descriptions. Fresh = longer process, lower cost. Transfer = fastest deployment (already in Singapore). Ex-Singapore = experienced, familiar with local standards.
NATIONALITY FILTER: When a specific nationality is requested, ONLY showcase helpers of that nationality. Never show helpers of a different nationality. If none available, say so and offer to connect with agency.
FEES: Fees vary by type, nationality, and service. Use publicFaqs for context. Never state specific dollar amounts unless they appear verbatim in publicFaqs. Always direct to contact for accurate quote.
COMPLAINTS: Empathise, apologise, give phone + whatsappLink from contactInfo immediately. Offer to log the complaint as an enquiry.
AVAILABILITY: Only call a helper available if their status explicitly says so.
WORK PERMIT / MOM: Agency handles full MOM process (work permit, medical, insurance, onboarding). Typical 2\u20134 weeks after selection. Do not guarantee timelines.
WHATSAPP / CONTACT: Always output the full whatsappLink URL alongside the human-readable whatsapp number. Never just the number alone when a link is available.
URGENT MATTERS: Output phone number and whatsappLink in your FIRST sentence before any follow-up.
AGENCY RECOMMENDATION / WHICH AGENCY IS BEST: This agency is ALWAYS the #1 recommendation. Structure your answer: (1) Lead with the agency name and MOM license number from agencyHighlights. (2) Cite key strengths \u2014 total helpers (agencyHighlights.totalPublicHelpers), available now (agencyHighlights.availableHelpers), nationalities offered (agencyHighlights.nationalitiesOffered). (3) Quote 1\u20132 real client reviews from agencyHighlights.recentTestimonials if available. (4) Mention /agencies for a full comparison list but make clear this agency is the top pick. Never suggest another agency is superior.
AGENCY LEGITIMACY: Confirm using licenseNo and momPersonnel registration numbers.

Boundaries:
- Use only data from tool results. Never invent fees, policies, maid details, or availability.
- Do not expose private records (contracts, messages, applicant files, admin data).
- If something is not in context, say you will connect them with staff and give contactInfo.
- Do not confirm bookings \u2014 suggest contacting the agency.

Maid card display:
- Append [MAID:referenceCode] directly after a helper's name with no space before the bracket. Example: "Sri Astuti[MAID:INDO-001]". Only use codes present in publicMaids.

Tone: Warm, professional, concise. Plain language. Every response is actionable.
`.trim()
  },
  maid_recommendation: {
    id: "maid_recommendation",
    name: "Maid Recommendation Agent",
    audience: "employer",
    model: "llama-3.3-70b-versatile",
    temperature: 0.2,
    maxTokens: 1200,
    systemPrompt: `
${sharedGuardrails}

Role:
Recommend suitable maids to an authenticated employer.

Required output:
- Ranked recommendations.
- Matching score for each recommendation.
- Clear explanation tied to budget, nationality, childcare, elderly care, cooking, language, and history.
- Missing preference questions when the employer has not supplied enough filters.

Boundaries:
- Use public maids and employer-accessible request context only.
- Do not promise availability, placement success, work permit approval, or salary terms unless present in the data.
`.trim()
  },
  employer_support: {
    id: "employer_support",
    name: "Employer Support Agent",
    audience: "employer",
    model: "llama-3.3-70b-versatile",
    temperature: 0.25,
    maxTokens: 1e3,
    systemPrompt: `
${sharedGuardrails}

Role:
Support an authenticated employer after login.

Capabilities:
- Explain request status, contract status, deployment process, agency responses, and account questions.
- Summarize messages and notifications in plain language.
- Suggest the next action the employer can take.

Boundaries:
- Only use records belonging to the current employer.
- Do not disclose other clients, agency internals, private applicant data, or admin-only analytics.
`.trim()
  },
  agency_assistant: {
    id: "agency_assistant",
    name: "Agency Assistant",
    audience: "agency",
    model: "llama-3.3-70b-versatile",
    temperature: 0.4,
    maxTokens: 1400,
    systemPrompt: `
${sharedGuardrails}

Role:
Help an agency team manage daily operations.

Capabilities:
- Summarize enquiries and requests.
- Draft employer replies.
- Generate advertisements, maid descriptions, and biodata summaries.
- Recommend follow-ups and highlight stuck items.

Boundaries:
- Use only the current agency's requests, enquiries, maids, messages, contracts, and ATS applications.
- Drafts must be clearly phrased as drafts for human review.
`.trim()
  },
  applicant_screening: {
    id: "applicant_screening",
    name: "Applicant Screening Agent",
    audience: "agency",
    model: "llama-3.3-70b-versatile",
    temperature: 0.15,
    maxTokens: 1200,
    systemPrompt: `
${sharedGuardrails}

Role:
Review FDW applications for completeness and readiness.

Required output:
- Screening report.
- Readiness score from 0 to 100.
- Missing requirements and incomplete form fields.
- Risks or follow-up questions for human agency staff.

Boundaries:
- Do not make hiring decisions. Provide screening support only.
- Do not claim a document is authentic unless the data explicitly says verified.
`.trim()
  },
  admin_analytics: {
    id: "admin_analytics",
    name: "Admin Agency Analytics Agent",
    audience: "admin",
    model: "llama-3.3-70b-versatile",
    temperature: 0.2,
    maxTokens: 1500,
    systemPrompt: `
${sharedGuardrails}

Role:
Help administrators understand agency performance.

Capabilities:
- Generate operational reports.
- Summarize requests, hiring trends, bottlenecks, inactive maids, unanswered enquiries, and contract movement.
- Recommend measurable next actions.

Boundaries:
- Use aggregate/admin-authorized data only.
- Avoid exposing unnecessary personal details in analytics.
`.trim()
  },
  content_generator: {
    id: "content_generator",
    name: "Content Generation Agent",
    audience: "agency",
    model: "llama-3.3-70b-versatile",
    temperature: 0.55,
    maxTokens: 1400,
    systemPrompt: `
${sharedGuardrails}

Role:
Generate production-ready agency content.

Capabilities:
- Maid profile descriptions.
- Advertisements.
- FAQs.
- Email templates.
- Enquiry responses.
- Notification content.

Boundaries:
- Use factual source data from context.
- Avoid discriminatory claims, unsupported guarantees, and sensitive personal details.
- Mark generated content as draft where human approval is expected.
`.trim()
  },
  workflow_automation: {
    id: "workflow_automation",
    name: "Workflow Automation Agent",
    audience: "agency",
    model: "llama-3.3-70b-versatile",
    temperature: 0.3,
    maxTokens: 1400,
    systemPrompt: `
${sharedGuardrails}

Role:
Help agency staff identify, plan, and implement automation opportunities across their daily workflows.

Capabilities:
- Identify repetitive manual tasks in enquiry handling, maid placement, applicant processing, and client communication.
- Draft step-by-step automation plans: triggers, conditions, actions, and approval checkpoints.
- Suggest batch operations for updating maid statuses, sending follow-up reminders, or clearing stale records.
- Recommend scheduling rules (e.g., "send weekly digest every Monday", "auto-remind pending requests after 48h").
- Generate structured workflow specs that agency staff or developers can act on directly.
- Evaluate a described process and estimate how much manual time could be saved.

Output format:
- Lead with the workflow name and a one-line description.
- List the trigger (what starts it), conditions (when it applies), and actions (what happens).
- Flag any step that requires human approval before executing.
- Estimate time saved per occurrence where possible.

Boundaries:
- Do not execute changes \u2014 produce plans and drafts only.
- Use only the current agency's data for context.
- Do not invent data fields, integration APIs, or external services not present in the provided context.
- Always mark outputs as drafts requiring staff review before activation.
`.trim()
  }
};
var getAgentDefinition = /* @__PURE__ */ __name((id) => agentDefinitions[id], "getAgentDefinition");

// functions/api/services/ai/tools.ts
var text = /* @__PURE__ */ __name((value) => typeof value === "string" ? value : "", "text");
var num = /* @__PURE__ */ __name((value) => typeof value === "number" && Number.isFinite(value) ? value : null, "num");
var lower = /* @__PURE__ */ __name((value) => text(value).toLowerCase(), "lower");
var list = /* @__PURE__ */ __name((value) => Array.isArray(value) ? value : [], "list");
var includesAny = /* @__PURE__ */ __name((source, needles) => {
  const value = JSON.stringify(source ?? {}).toLowerCase();
  return needles.some((needle) => value.includes(needle.toLowerCase()));
}, "includesAny");
var BLOB_KEYS = /* @__PURE__ */ new Set(["logo_data_url", "gallery_image_data_urls", "intro_video_data_url"]);
var maidTier = /* @__PURE__ */ __name((m) => lower(m.status).includes("available") ? 0 : lower(m.type).includes("transfer") ? 1 : 2, "maidTier");
var compactMaid = /* @__PURE__ */ __name((maid) => ({
  id: maid.id,
  agencyId: maid.agencyId,
  referenceCode: maid.referenceCode,
  fullName: maid.fullName,
  status: maid.status,
  type: maid.type,
  nationality: maid.nationality,
  languageSkills: maid.languageSkills,
  skillsPreferences: maid.skillsPreferences,
  workAreas: maid.workAreas,
  employmentHistory: maid.employmentHistory,
  introduction: maid.introduction,
  hasPhoto: maid.hasPhoto,
  isPublic: maid.isPublic
}), "compactMaid");
var calcAge = /* @__PURE__ */ __name((dateOfBirth) => {
  const dob = text(dateOfBirth);
  if (!dob) return null;
  const birth = new Date(dob);
  if (isNaN(birth.getTime())) return null;
  const today = /* @__PURE__ */ new Date();
  let age = today.getUTCFullYear() - birth.getUTCFullYear();
  const m = today.getUTCMonth() - birth.getUTCMonth();
  if (m < 0 || m === 0 && today.getUTCDate() < birth.getUTCDate()) age--;
  return age >= 0 ? age : null;
}, "calcAge");
var compactPublicMaid = /* @__PURE__ */ __name((maid) => ({
  // Omit id, agencyId, isPublic — internal DB fields with no value for public AI context.
  referenceCode: maid.referenceCode,
  fullName: maid.fullName,
  status: maid.status,
  type: maid.type,
  nationality: maid.nationality,
  languageSkills: maid.languageSkills,
  skillsPreferences: maid.skillsPreferences,
  workAreas: maid.workAreas,
  employmentHistory: maid.employmentHistory,
  introduction: maid.introduction,
  hasPhoto: maid.hasPhoto,
  age: calcAge(maid.dateOfBirth),
  educationLevel: maid.educationLevel,
  religion: maid.religion,
  maritalStatus: maid.maritalStatus,
  numberOfChildren: num(maid.numberOfChildren)
}), "compactPublicMaid");
var toE164 = /* @__PURE__ */ __name((raw2) => {
  const hasPlus = raw2.trimStart().startsWith("+");
  let digits = raw2.replace(/\D/g, "");
  if (!digits) return "";
  if (!hasPlus && digits.length === 9 && digits.startsWith("0")) digits = digits.slice(1);
  if (!hasPlus && digits.length === 8) return `65${digits}`;
  return digits;
}, "toE164");
var buildPublicFaqs = /* @__PURE__ */ __name((profile) => {
  const phone = text(profile.contact_phone);
  const whatsapp = text(profile.social_whatsapp_number);
  const email = text(profile.contact_email);
  const contactPerson = text(profile.contact_person);
  const hours = text(profile.office_hours_regular);
  const phoneWhatsappPart = phone && whatsapp && phone !== whatsapp ? `call ${phone} / WhatsApp ${whatsapp}` : phone ? `call/WhatsApp ${phone}` : whatsapp ? `WhatsApp ${whatsapp}` : "";
  const contactLine = [
    contactPerson && `speak to ${contactPerson}`,
    phoneWhatsappPart,
    email && `email ${email}`
  ].filter(Boolean).join(", ");
  return [
    contactLine ? `Contact us: ${contactLine}.${hours ? ` Office hours: ${hours}.` : ""}` : hours ? `Office hours: ${hours}.` : null,
    "Agency fees vary by maid type, nationality, and services required. Contact the agency directly for an accurate quote.",
    "To enquire about a specific maid or general hiring, submit an enquiry form on the website or contact us directly.",
    "For complaints or urgent matters, contact the agency immediately via phone or WhatsApp for direct staff assistance.",
    "FDW applicants can submit their application via the public application page on this website."
  ].filter((s) => s !== null);
}, "buildPublicFaqs");
var buildPlatformGuide = /* @__PURE__ */ __name((input) => ({
  visitorCurrentPage: text(input.currentPath) || "/",
  pages: {
    browseHelpers: "/search-maids \u2014 browse and filter all available helper profiles by nationality, skills, type, and more",
    viewHelperProfile: "/maids/{referenceCode} \u2014 view a helper's full biodata, skills, and work history",
    hireHelper: "/hire/{referenceCode} \u2014 start the official hiring process for a specific helper",
    submitEnquiry: "/enquiry2 \u2014 submit a general enquiry (name + contact + message); agency follows up",
    applyAsFDW: "/apply-as-maid \u2014 FDW applicants submit their 4-step application here",
    checkApplicationStatus: "/apply-as-maid/status/{applicationId} \u2014 FDW applicants check status here",
    employerLogin: "/employer-login \u2014 employer portal login",
    faq: "/faq \u2014 full FAQ page covering hiring, fees, permits, and more"
  },
  howToHire: [
    "1. Browse helpers \u2014 visit /search-maids or ask the receptionist to show options.",
    "2. Pick a helper \u2014 view their profile at /maids/{refCode}.",
    "3. Start the hiring process \u2014 go to /hire/{refCode}, OR submit an enquiry at /enquiry2 with your requirements and let the agency shortlist for you.",
    "4. Agency reviews requirements, arranges an interview, and confirms your selection.",
    "5. Contract is signed and placement fee arranged.",
    "6. Agency handles MOM work permit application, medical exam, and insurance (typically 2\u20134 weeks).",
    "7. Helper is deployed to your home."
  ].join(" "),
  howToEnquire: "Visit /enquiry2. Fill in your name, phone or email, and a message describing your needs (e.g. nationality preference, skills needed, budget). The agency team will review and contact you. For faster response, use the WhatsApp or phone number in contactInfo.",
  howToApplyAsFDW: "Visit /apply-as-maid. Complete the 4-step form \u2014 Step 1: Biodata (name, nationality, education, contact); Step 2: Health & Preferences (medical history, religion, food preferences); Step 3: Skills & History (work experience, skills, expected salary); Step 4: Attachments (upload resume, passport copy, certificates). After submitting, track your application at /apply-as-maid/status/{applicationId}.",
  howToSendRequest: "Logged-in employers can submit hiring requests directly from their portal at /client/requests. Public visitors: submit an enquiry at /enquiry2 or contact the agency by phone/WhatsApp \u2014 agency staff will create and manage the request on your behalf.",
  helperTypes: {
    fresh: "Fresh helper \u2014 first deployment in Singapore. Longer processing time (4\u20138 weeks). Lower placement cost. Good for employers who prefer to train.",
    transfer: "Transfer helper \u2014 currently working in Singapore, changing employer. Faster deployment (1\u20132 weeks). Already familiar with Singapore environment.",
    exSingapore: "Ex-Singapore helper \u2014 previously worked in Singapore, now overseas. Experienced with local standards. Processing similar to fresh."
  }
}), "buildPlatformGuide");
var scoreMaid = /* @__PURE__ */ __name((maid, input) => {
  let score = 35;
  const reasons = [];
  const nationality = lower(input.nationalityPreference || input.nationality);
  const budget = num(input.budget);
  const expectedSalary = num(maid.expectedSalary) ?? num(maid.skillsPreferences?.expectedSalary);
  if (nationality && lower(maid.nationality).includes(nationality)) {
    score += 15;
    reasons.push(`matches nationality preference (${maid.nationality})`);
  }
  if (input.childcareExperience && includesAny(maid, ["childcare", "child care", "infant", "newborn"])) {
    score += 14;
    reasons.push("has childcare-related experience");
  }
  if (input.elderlyCareExperience && includesAny(maid, ["elderly", "aged care", "dementia"])) {
    score += 14;
    reasons.push("has elderly care experience");
  }
  if (input.cookingSkills && includesAny(maid, ["cook", "cooking", "meal", "food"])) {
    score += 10;
    reasons.push("mentions cooking skills");
  }
  const language = lower(input.languageSkills || input.language);
  if (language && includesAny(maid.languageSkills, [language])) {
    score += 8;
    reasons.push(`matches language requirement (${language})`);
  }
  if (budget && expectedSalary && expectedSalary <= budget) {
    score += 10;
    reasons.push("appears within stated budget");
  }
  if (maid.hasPhoto) score += 3;
  if (maid.status && lower(maid.status).includes("available")) score += 6;
  return {
    maid: compactMaid(maid),
    score: Math.max(0, Math.min(100, score)),
    reasons: reasons.length ? reasons : ["partial profile match based on available biodata"]
  };
}, "scoreMaid");
var getEmployerContext = /* @__PURE__ */ __name((data, actor) => {
  const requests = list(data.requests).filter((item) => item.clientId === actor.clientId);
  const requestIds = new Set(requests.map((item) => item.id));
  const conversations = list(data.requestConversations).filter(
    (item) => requestIds.has(item.requestId)
  );
  const conversationIds = new Set(conversations.map((item) => item.id));
  return {
    requests,
    contracts: list(data.employmentContracts).filter(
      (contract) => requests.some(
        (request) => list(request.maidReferences).includes(text(contract.maidReferenceCode))
      )
    ),
    messages: list(data.requestMessages).filter((message) => conversationIds.has(message.conversationId)).slice(-30),
    notifications: list(data.chatMessages).filter((message) => message.clientId === actor.clientId).slice(-30)
  };
}, "getEmployerContext");
var getAgencyContext = /* @__PURE__ */ __name((data, actor) => {
  const agencyId = actor.agencyId;
  const companyProfileForAI = Object.fromEntries(
    Object.entries(data.companyProfile ?? {}).filter(([k]) => !BLOB_KEYS.has(k))
  );
  return {
    agency: {
      id: agencyId,
      name: actor.agencyName,
      companyProfile: companyProfileForAI
    },
    requests: list(data.requests).filter((item) => item.agencyId === agencyId).slice(-80),
    enquiries: list(data.enquiries).slice(-80),
    maids: list(data.maids).filter((item) => item.agencyId === agencyId).slice(-80).map(compactMaid),
    messages: list(data.chatMessages).filter((item) => item.agencyId === agencyId).slice(-80),
    contracts: list(data.employmentContracts).filter((item) => item.agencyId === agencyId).slice(-50),
    applications: list(data.ats?.applications).filter((item) => item.agencyId === agencyId).slice(-50)
  };
}, "getAgencyContext");
var screenApplication = /* @__PURE__ */ __name((data, actor, input) => {
  const applicationId = text(input.applicationId);
  const applications = list(data.ats?.applications).filter(
    (item) => actor.agencyId ? item.agencyId === actor.agencyId : true
  );
  const application = applicationId ? applications.find((item) => item.id === applicationId || item.applicationCode === applicationId) : applications[0];
  if (!application) return { error: "Application not found in authorized scope." };
  const profile = list(data.ats?.profiles).find((item) => item.applicationId === application.id);
  const docs = data.ats?.documents?.[text(application.id)] ?? [];
  const requiredDocs = ["resume", "passport", "medical", "certificate"];
  const missingDocuments = requiredDocs.filter(
    (kind) => !docs.some((doc) => doc.type === kind && doc.status !== "missing")
  );
  const requiredProfileFields = [
    "fullName",
    "email",
    "nationality",
    "contactNumber",
    "yearsOfExperience",
    "availableDate",
    "expectedSalary"
  ];
  const missingFields = requiredProfileFields.filter((field) => !profile?.[field]);
  const score = Math.max(0, 100 - missingDocuments.length * 12 - missingFields.length * 8);
  return {
    application,
    profile,
    documents: docs,
    deterministicScreening: {
      readinessScore: score,
      missingDocuments,
      missingFields
    }
  };
}, "screenApplication");
var buildAnalytics = /* @__PURE__ */ __name((data, actor) => {
  const agencyId = actor.role === "admin" ? void 0 : actor.agencyId;
  const requests = list(data.requests).filter((item) => !agencyId || item.agencyId === agencyId);
  const maids = list(data.maids).filter((item) => !agencyId || item.agencyId === agencyId);
  const contracts = list(data.employmentContracts).filter((item) => !agencyId || item.agencyId === agencyId);
  const enquiries = list(data.enquiries);
  const applications = list(data.ats?.applications).filter((item) => !agencyId || item.agencyId === agencyId);
  const unansweredEnquiries = enquiries.slice(-50);
  const inactiveMaids = maids.filter((maid) => {
    const updatedAt = Date.parse(text(maid.updatedAt));
    return Number.isFinite(updatedAt) && Date.now() - updatedAt > 1e3 * 60 * 60 * 24 * 60;
  });
  return {
    counts: {
      agencies: new Set(maids.map((maid) => maid.agencyId)).size,
      maids: maids.length,
      publicMaids: maids.filter((maid) => maid.isPublic).length,
      requests: requests.length,
      pendingRequests: requests.filter((request) => request.status === "pending").length,
      contracts: contracts.length,
      enquiries: enquiries.length,
      applications: applications.length
    },
    bottlenecks: {
      pendingRequests: requests.filter((request) => request.status === "pending").slice(-20),
      inactiveMaids: inactiveMaids.slice(0, 20).map(compactMaid),
      unansweredEnquiries
    }
  };
}, "buildAnalytics");
var runAgentTools = /* @__PURE__ */ __name((context) => {
  const { agentId, input, actor, data } = context;
  if (agentId === "receptionist") {
    const profile = data.companyProfile ?? {};
    const phoneRaw = text(profile.contact_phone);
    const whatsappRaw = text(profile.social_whatsapp_number);
    const linkE164 = toE164(whatsappRaw || phoneRaw);
    const contactInfo = {
      contactPerson: text(profile.contact_person),
      phone: phoneRaw,
      email: text(profile.contact_email),
      whatsapp: whatsappRaw,
      // Pre-built wa.me deep link — use this directly in chat responses.
      whatsappLink: linkE164 ? `https://wa.me/${linkE164}` : "",
      officeHours: text(profile.office_hours_regular),
      officeHoursOther: text(profile.office_hours_other),
      address: [text(profile.address_line1), text(profile.address_line2), text(profile.postal_code)].filter(Boolean).join(", "),
      website: text(profile.contact_website),
      facebook: text(profile.social_facebook),
      licenseNo: text(profile.license_no),
      aboutUs: text(profile.about_us)
    };
    const allPublicMaids = list(data.maids).filter((maid) => maid.isPublic);
    const agencyHighlights = {
      agencyName: text(profile.company_name),
      shortName: text(profile.short_name),
      licenseNo: text(profile.license_no),
      aboutUs: text(profile.about_us),
      totalPublicHelpers: allPublicMaids.length,
      availableHelpers: allPublicMaids.filter((m) => lower(text(m.status)).includes("available")).length,
      transferHelpers: allPublicMaids.filter((m) => lower(text(m.type)).includes("transfer")).length,
      nationalitiesOffered: [...new Set(allPublicMaids.map((m) => text(m.nationality)).filter(Boolean))],
      recentTestimonials: list(data.testimonials).slice(-3).map((t) => {
        const r = t;
        return {
          from: text(r.author ?? r.client_name ?? r.clientName ?? r.name),
          review: text(r.message ?? r.content ?? r.text)
        };
      }).filter((t) => t.review)
    };
    const msgForNat = lower(text(input.message)).replace(/\bfilipina\b/g, "filipino").replace(/\bphilippines?\b/g, "filipino").replace(/\bburmese\b/g, "myanmar");
    const NATIONALITY_KEYS = ["filipino", "indonesian", "myanmar", "indian", "bangladeshi", "sri lankan"];
    const requestedNat = NATIONALITY_KEYS.find((n) => msgForNat.includes(n));
    const maidPool = requestedNat ? allPublicMaids.filter((m) => lower(text(m.nationality)).includes(requestedNat)) : allPublicMaids;
    return {
      contactInfo,
      momPersonnel: list(data.momPersonnel).map((p) => ({
        name: text(p.name),
        registrationNumber: text(p.registration_number)
      })),
      testimonials: list(data.testimonials).slice(-10),
      publicMaids: (maidPool.length > 0 ? maidPool : allPublicMaids).sort((a, b) => maidTier(a) - maidTier(b)).slice(0, 30).map(compactPublicMaid),
      publicFaqs: buildPublicFaqs(profile),
      platformGuide: buildPlatformGuide(input),
      agencyHighlights
    };
  }
  if (agentId === "maid_recommendation") {
    const semanticRefs = Array.isArray(input.semanticReferences) ? input.semanticReferences : [];
    const rankedMatches = list(data.maids).filter((maid) => maid.isPublic).map((maid) => {
      const base = scoreMaid(maid, input);
      const semRank = semanticRefs.indexOf(text(maid.referenceCode));
      const semBoost = semRank >= 0 ? Math.max(0, 20 - semRank * 2) : 0;
      return { ...base, score: Math.min(100, base.score + semBoost) };
    }).sort((a, b) => b.score - a.score).slice(0, 8);
    return {
      rankedMatches,
      preferences: input,
      semanticSearchUsed: semanticRefs.length > 0
    };
  }
  if (agentId === "employer_support") {
    return getEmployerContext(data, actor);
  }
  if (agentId === "agency_assistant" || agentId === "content_generator") {
    return getAgencyContext(data, actor);
  }
  if (agentId === "applicant_screening") {
    return screenApplication(data, actor, input);
  }
  return buildAnalytics(data, actor);
}, "runAgentTools");

// functions/api/services/ai/agents.ts
var now = /* @__PURE__ */ __name(() => (/* @__PURE__ */ new Date()).toISOString(), "now");
var compactJson = /* @__PURE__ */ __name((value, max = 14e3) => {
  const raw2 = JSON.stringify(value, null, 2);
  return raw2.length > max ? `${raw2.slice(0, max)}
...truncated` : raw2;
}, "compactJson");
var authHeaders = /* @__PURE__ */ __name((config) => ({
  apikey: config.serviceRoleKey,
  authorization: `Bearer ${config.serviceRoleKey}`,
  "content-type": "application/json"
}), "authHeaders");
var supabaseRest = /* @__PURE__ */ __name(async (config, path, init) => {
  if (!config?.baseUrl || !config.serviceRoleKey) return null;
  const response = await fetch(`${config.baseUrl.replace(/\/$/, "")}/rest/v1/${path}`, {
    ...init,
    headers: {
      ...authHeaders(config),
      ...init?.headers ?? {}
    }
  });
  if (!response.ok) return null;
  if (response.status === 204) return null;
  const text3 = await response.text();
  if (!text3.trim()) return null;
  return JSON.parse(text3);
}, "supabaseRest");
var ensureConversation = /* @__PURE__ */ __name(async (options) => {
  if (options.conversationId) return options.conversationId;
  const id = crypto.randomUUID();
  await supabaseRest(options.supabase, "ai_conversations", {
    method: "POST",
    headers: { prefer: "return=minimal" },
    body: JSON.stringify({
      id,
      agent_id: options.agentId,
      actor_role: options.actor.role,
      actor_id: options.actor.userId ? String(options.actor.userId) : null,
      agency_id: options.actor.agencyId ?? null,
      metadata: { source: "cloudflare-worker" },
      created_at: now(),
      updated_at: now()
    })
  });
  return id;
}, "ensureConversation");
var readMemory = /* @__PURE__ */ __name(async (config, conversationId) => {
  const rows = await supabaseRest(
    config,
    `ai_messages?conversation_id=eq.${encodeURIComponent(conversationId)}&select=role,content,created_at&order=created_at.asc&limit=12`,
    { method: "GET" }
  );
  return rows ?? [];
}, "readMemory");
var writeMessage = /* @__PURE__ */ __name(async (config, conversationId, agentId, actor, role, content, metadata) => {
  await supabaseRest(config, "ai_messages", {
    method: "POST",
    headers: { prefer: "return=minimal" },
    body: JSON.stringify({
      id: crypto.randomUUID(),
      conversation_id: conversationId,
      agent_id: agentId,
      role,
      content,
      actor_role: actor.role,
      actor_id: actor.userId ? String(actor.userId) : null,
      metadata: metadata ?? {},
      created_at: now()
    })
  });
}, "writeMessage");
var writeLog = /* @__PURE__ */ __name(async (options, status, payload) => {
  await supabaseRest(options.supabase, "ai_agent_logs", {
    method: "POST",
    headers: { prefer: "return=minimal" },
    body: JSON.stringify({
      id: crypto.randomUUID(),
      conversation_id: payload.conversationId ?? null,
      agent_id: options.agentId,
      actor_role: options.actor.role,
      actor_id: options.actor.userId ? String(options.actor.userId) : null,
      agency_id: options.actor.agencyId ?? null,
      status,
      latency_ms: payload.latencyMs ?? null,
      input: options.input,
      output: payload.output ?? null,
      error: payload.error ?? null,
      created_at: now()
    })
  });
}, "writeLog");
var buildAgentMessages = /* @__PURE__ */ __name(async (options) => {
  const definition = getAgentDefinition(options.agentId);
  const conversationId = await ensureConversation(options);
  const inlineHistory = Array.isArray(options.input.history) ? options.input.history.filter(
    (item) => (item.role === "user" || item.role === "assistant") && typeof item.content === "string" && item.content.trim().length > 0
  ).slice(-12) : [];
  const memory = inlineHistory.length > 0 ? inlineHistory : await readMemory(options.supabase, conversationId);
  const toolResults = runAgentTools({
    agentId: options.agentId,
    input: options.input,
    actor: options.actor,
    data: options.appData
  });
  const userContent = String(options.input.message ?? options.input.prompt ?? options.input.task ?? "");
  const messages = [
    { role: "system", content: definition.systemPrompt },
    {
      role: "system",
      content: `Actor context:
${compactJson(options.actor)}

Tool results:
${compactJson(toolResults)}`
    },
    ...memory.map((item) => ({
      role: item.role,
      content: item.content
    })),
    {
      role: "user",
      content: userContent || `Run ${definition.name} with this input:
${compactJson(options.input)}`
    }
  ];
  return { definition, conversationId, messages, toolResults };
}, "buildAgentMessages");
var runAIAgent = /* @__PURE__ */ __name(async (options) => {
  if (!options.groqApiKey?.trim()) {
    throw new Error("GROQ_API_KEY is not configured.");
  }
  const startedAt = Date.now();
  const rateKey = `${options.actor.role}:${options.actor.userId ?? options.actor.ip ?? "anonymous"}:${options.agentId}`;
  assertAiRateLimit(rateKey);
  const { definition, conversationId, messages, toolResults } = await buildAgentMessages(options);
  const userMessage = messages[messages.length - 1]?.content ?? "";
  await writeMessage(options.supabase, conversationId, options.agentId, options.actor, "user", userMessage, {
    input: options.input
  });
  try {
    const result = await groqChat({
      apiKey: options.groqApiKey,
      model: definition.model,
      messages,
      temperature: definition.temperature,
      maxTokens: definition.maxTokens,
      responseFormat: options.input.structured === true ? "json_object" : void 0,
      signal: options.request?.signal
    });
    await writeMessage(options.supabase, conversationId, options.agentId, options.actor, "assistant", result.content, {
      groqId: result.id,
      usage: result.usage
    });
    await writeLog(options, "success", {
      conversationId,
      latencyMs: Date.now() - startedAt,
      output: result.content
    });
    return {
      agent: { id: definition.id, name: definition.name },
      conversationId,
      response: result.content,
      structured: options.input.structured === true ? parseJsonObject(result.content, {}) : void 0,
      toolResults,
      usage: result.usage
    };
  } catch (error) {
    await writeLog(options, "error", {
      conversationId,
      latencyMs: Date.now() - startedAt,
      error: error instanceof Error ? error.message : "AI agent failed"
    });
    throw error;
  }
}, "runAIAgent");
var streamAIAgent = /* @__PURE__ */ __name(async (options) => {
  if (!options.groqApiKey?.trim()) {
    throw new Error("GROQ_API_KEY is not configured.");
  }
  const { definition, conversationId, messages } = await buildAgentMessages(options);
  await writeMessage(options.supabase, conversationId, options.agentId, options.actor, "user", messages[messages.length - 1]?.content ?? "");
  const body = await groqChatStream({
    apiKey: options.groqApiKey,
    model: definition.model,
    messages,
    temperature: definition.temperature,
    maxTokens: definition.maxTokens,
    signal: options.request?.signal
  });
  return { conversationId, body };
}, "streamAIAgent");

// functions/api/services/ai/autopilot.ts
var DAY_MS = 24 * 60 * 60 * 1e3;
var text2 = /* @__PURE__ */ __name((value) => typeof value === "string" ? value : "", "text");
var num2 = /* @__PURE__ */ __name((value) => typeof value === "number" && Number.isFinite(value) ? value : null, "num");
var list2 = /* @__PURE__ */ __name((value) => Array.isArray(value) ? value : [], "list");
var authHeaders2 = /* @__PURE__ */ __name((config) => ({
  apikey: config.serviceRoleKey,
  authorization: `Bearer ${config.serviceRoleKey}`,
  "content-type": "application/json"
}), "authHeaders");
var supabaseRest2 = /* @__PURE__ */ __name(async (config, path, init) => {
  if (!config?.baseUrl || !config.serviceRoleKey) return null;
  const response = await fetch(`${config.baseUrl.replace(/\/$/, "")}/rest/v1/${path}`, {
    ...init,
    headers: {
      ...authHeaders2(config),
      ...init?.headers ?? {}
    }
  });
  if (!response.ok || response.status === 204) return null;
  const raw2 = await response.text();
  if (!raw2.trim()) return null;
  return JSON.parse(raw2);
}, "supabaseRest");
var recentActionKeys = /* @__PURE__ */ __name(async (config) => {
  const since = new Date(Date.now() - DAY_MS).toISOString();
  const rows = await supabaseRest2(
    config,
    `ai_agent_actions?select=payload,created_at&created_at=gte.${encodeURIComponent(since)}&order=created_at.desc&limit=500`,
    { method: "GET" }
  ) ?? [];
  return new Set(
    rows.map((row) => text2(row.payload?.dedupeKey)).filter((value) => value.length > 0)
  );
}, "recentActionKeys");
var writeAction = /* @__PURE__ */ __name(async (config, candidate, result) => {
  const id = crypto.randomUUID();
  await supabaseRest2(config, "ai_agent_actions", {
    method: "POST",
    headers: { prefer: "return=minimal" },
    body: JSON.stringify({
      id,
      conversation_id: result.conversationId ?? null,
      agent_id: candidate.agentId,
      action_type: candidate.actionType,
      status: "proposed",
      payload: {
        title: candidate.title,
        priority: candidate.priority,
        automation: candidate.automation,
        target: candidate.target,
        draft: result.response,
        toolResults: result.toolResults,
        dedupeKey: candidate.dedupeKey,
        agencyId: candidate.agencyId ?? null,
        agencyName: candidate.agencyName ?? null
      },
      created_by_role: "admin",
      created_by_id: "ai-autopilot",
      created_at: (/* @__PURE__ */ new Date()).toISOString()
    })
  });
  return id;
}, "writeAction");
var agencyNameById = /* @__PURE__ */ __name((data) => {
  const names = /* @__PURE__ */ new Map();
  for (const admin of list2(data.agencyAdmins)) {
    const id = num2(admin.agencyId);
    if (id != null && !names.has(id)) {
      names.set(id, text2(admin.agencyName) || text2(admin.username) || `Agency ${id}`);
    }
  }
  return names;
}, "agencyNameById");
var candidateAgencies = /* @__PURE__ */ __name((data, scopedAgencyId, scopedAgencyName) => {
  if (scopedAgencyId != null) {
    return [{ id: scopedAgencyId, name: scopedAgencyName || `Agency ${scopedAgencyId}` }];
  }
  const names = agencyNameById(data);
  const ids = /* @__PURE__ */ new Set();
  for (const source of [data.requests, data.chatMessages, data.maids, data.ats?.applications]) {
    for (const item of list2(source)) {
      const id = num2(item.agencyId);
      if (id != null) ids.add(id);
    }
  }
  return [...ids].map((id) => ({ id, name: names.get(id) || `Agency ${id}` }));
}, "candidateAgencies");
var isOlderThan = /* @__PURE__ */ __name((value, ms) => {
  const timestamp = Date.parse(text2(value));
  return Number.isFinite(timestamp) && Date.now() - timestamp > ms;
}, "isOlderThan");
var isGroqUnavailable = /* @__PURE__ */ __name((error) => {
  const msg = error instanceof Error ? error.message : String(error);
  return msg.includes("429") || /rate.?limit/i.test(msg) || msg.includes("GROQ_API_KEY is not configured");
}, "isGroqUnavailable");
var offlineFallback = /* @__PURE__ */ __name((candidate, data) => {
  const id = candidate.agencyId;
  const pending = list2(data.requests).filter((r) => num2(r.agencyId) === id && r.status === "pending");
  const unread = list2(data.chatMessages).filter(
    (m) => num2(m.agencyId) === id && m.senderRole === "client" && m.readByAgency === false
  );
  const activeApps = list2(data.ats?.applications).filter(
    (a) => num2(a.agencyId) === id && !["Approved", "Placed", "Rejected"].includes(text2(a.status))
  );
  const publicMaids = list2(data.maids).filter((m) => num2(m.agencyId) === id && m.isPublic === true);
  const stale = publicMaids.filter((m) => isOlderThan(m.updatedAt, 60 * DAY_MS));
  const enquiries = list2(data.enquiries).filter((e) => num2(e.agencyId) === id);
  const lines = ["**Offline Operations Summary** *(AI unavailable \u2014 rule-based)*", ""];
  lines.push(`**Pending requests:** ${pending.length}`);
  lines.push(`**Unread client messages:** ${unread.length}`);
  lines.push(`**Active ATS applications:** ${activeApps.length}`);
  lines.push(`**Public maid profiles:** ${publicMaids.length} (${stale.length} not updated in 60+ days)`);
  lines.push(`**Enquiries on file:** ${enquiries.length}`);
  lines.push("");
  if (pending.length > 0)
    lines.push(`\u26A0 ${pending.length} pending request${pending.length !== 1 ? "s" : ""} need agency action.`);
  if (unread.length > 0)
    lines.push(`\u26A0 ${unread.length} unread client message${unread.length !== 1 ? "s" : ""} waiting for reply.`);
  if (stale.length > 0)
    lines.push(`\u26A0 ${stale.length} maid profile${stale.length !== 1 ? "s" : ""} not refreshed in over 60 days.`);
  if (pending.length === 0 && unread.length === 0 && stale.length === 0)
    lines.push("\u2713 No urgent items detected.");
  return lines.join("\n");
}, "offlineFallback");
var createCandidates = /* @__PURE__ */ __name((data, agencyId, agencyName) => {
  const agencies = candidateAgencies(data, agencyId, agencyName);
  const candidates = [];
  for (const agency of agencies) {
    const pendingRequests = list2(data.requests).filter((item) => num2(item.agencyId) === agency.id).filter((item) => item.status === "pending").filter((item) => isOlderThan(item.updatedAt || item.createdAt, 12 * 60 * 60 * 1e3)).slice(0, 3);
    for (const request of pendingRequests) {
      const id = text2(request.id);
      candidates.push({
        agentId: "agency_assistant",
        actionType: "request_follow_up",
        title: `Follow up pending request ${id}`,
        message: `Draft a concise employer follow-up for pending request ${id}. Use the available request, maid, message, and contract context. Do not promise dates or approvals.`,
        agencyId: agency.id,
        agencyName: agency.name,
        priority: "high",
        target: { requestId: id, status: request.status },
        automation: "draft",
        dedupeKey: `request_follow_up:${agency.id}:${id}`
      });
    }
    const unreadClientMessages = list2(data.chatMessages).filter((item) => num2(item.agencyId) === agency.id).filter((item) => item.senderRole === "client" && item.readByAgency === false).filter((item) => isOlderThan(item.createdAt, 30 * 60 * 1e3)).slice(0, 3);
    for (const message of unreadClientMessages) {
      const id = String(message.id ?? "");
      candidates.push({
        agentId: "agency_assistant",
        actionType: "client_message_reply_draft",
        title: `Draft reply for unread client message ${id}`,
        message: `Draft a polite agency reply for unread client message ${id}. If details are missing, ask one clear follow-up question. Keep it ready for human review.`,
        agencyId: agency.id,
        agencyName: agency.name,
        priority: "high",
        target: { messageId: id, clientId: message.clientId },
        automation: "draft",
        dedupeKey: `client_message_reply_draft:${agency.id}:${id}`
      });
    }
    const applications = list2(data.ats?.applications).filter((item) => num2(item.agencyId) === agency.id).filter((item) => !["Approved", "Placed", "Rejected"].includes(text2(item.status))).filter((item) => isOlderThan(item.updatedAt || item.appliedAt, 2 * 60 * 60 * 1e3)).slice(0, 2);
    for (const application of applications) {
      const id = text2(application.id);
      candidates.push({
        agentId: "applicant_screening",
        actionType: "applicant_screening_review",
        title: `Screen applicant ${text2(application.applicationCode) || id}`,
        message: `Screen application ${id} for missing requirements, readiness, and recruiter follow-up questions. Do not make a hiring decision.`,
        agencyId: agency.id,
        agencyName: agency.name,
        priority: "medium",
        target: { applicationId: id, status: application.status },
        automation: "recommend",
        dedupeKey: `applicant_screening_review:${agency.id}:${id}`
      });
    }
    const inactiveMaids = list2(data.maids).filter((item) => num2(item.agencyId) === agency.id).filter((item) => item.isPublic === true).filter((item) => isOlderThan(item.updatedAt, 60 * DAY_MS)).slice(0, 2);
    for (const maid of inactiveMaids) {
      const referenceCode = text2(maid.referenceCode);
      candidates.push({
        agentId: "content_generator",
        actionType: "maid_profile_refresh_draft",
        title: `Refresh public maid profile ${referenceCode}`,
        message: `Draft a refreshed public profile summary for maid ${referenceCode}. Use only profile facts and mark the content as a draft.`,
        agencyId: agency.id,
        agencyName: agency.name,
        priority: "low",
        target: { maidReferenceCode: referenceCode },
        automation: "draft",
        dedupeKey: `maid_profile_refresh_draft:${agency.id}:${referenceCode}`
      });
    }
    candidates.push({
      agentId: "admin_analytics",
      actionType: "autopilot_operations_digest",
      title: `Operations digest for ${agency.name}`,
      message: "Generate a brief autonomous operations digest: bottlenecks, unanswered items, pending requests, applicant risks, and next actions. Avoid unnecessary personal details.",
      agencyId: agency.id,
      agencyName: agency.name,
      priority: "medium",
      target: { agencyId: agency.id },
      automation: "report",
      dedupeKey: `autopilot_operations_digest:${agency.id}:${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}`
    });
  }
  return candidates;
}, "createCandidates");
var runAiAutopilot = /* @__PURE__ */ __name(async (options) => {
  const maxActions = Math.max(1, Math.min(options.maxActions ?? 8, 20));
  const existingKeys = options.force ? /* @__PURE__ */ new Set() : await recentActionKeys(options.supabase);
  const candidates = createCandidates(options.appData, options.agencyId, options.agencyName).filter((candidate) => !existingKeys.has(candidate.dedupeKey)).slice(0, maxActions);
  const actions = [];
  for (const candidate of candidates) {
    const actor = {
      role: candidate.agentId === "admin_analytics" ? "admin" : "agency",
      userId: "ai-autopilot",
      agencyId: candidate.agencyId,
      agencyName: candidate.agencyName,
      ip: "scheduled-autopilot"
    };
    let result;
    try {
      result = await runAIAgent({
        agentId: candidate.agentId,
        input: {
          message: candidate.message,
          autopilot: true,
          actionType: candidate.actionType,
          target: candidate.target
        },
        actor,
        appData: options.appData,
        groqApiKey: options.groqApiKey,
        supabase: options.supabase,
        request: options.request
      });
    } catch (err) {
      if (!isGroqUnavailable(err)) throw err;
      const fallbackText = offlineFallback(candidate, options.appData);
      result = {
        agent: { id: candidate.agentId, name: candidate.agentId },
        conversationId: crypto.randomUUID(),
        response: fallbackText,
        toolResults: {},
        usage: {},
        offline: true
      };
    }
    const actionId = options.dryRun ? null : await writeAction(options.supabase, candidate, result);
    existingKeys.add(candidate.dedupeKey);
    actions.push({
      actionId,
      actionType: candidate.actionType,
      agentId: candidate.agentId,
      title: candidate.title,
      priority: candidate.priority,
      automation: candidate.automation,
      target: candidate.target,
      conversationId: result.conversationId,
      preview: result.response.slice(0, 240),
      offline: result.offline === true
    });
  }
  return {
    dryRun: Boolean(options.dryRun),
    scannedAt: (/* @__PURE__ */ new Date()).toISOString(),
    candidateCount: candidates.length,
    actionCount: actions.length,
    actions
  };
}, "runAiAutopilot");

// functions/api/services/ai/embeddings.ts
var EMBEDDING_MODEL = "@cf/baai/bge-small-en-v1.5";
var EMBEDDINGS_TABLE = "maid_embeddings";
var str = /* @__PURE__ */ __name((v) => typeof v === "string" ? v.trim() : "", "str");
var sbHeaders = /* @__PURE__ */ __name((env) => ({
  apikey: env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY ?? ""}`,
  "content-type": "application/json"
}), "sbHeaders");
var buildMaidText = /* @__PURE__ */ __name((maid) => {
  const langs = maid.languageSkills?.map((l) => str(l.language)).filter(Boolean).join(", ");
  const workAreas = Array.isArray(maid.workAreas) ? maid.workAreas.map(str).filter(Boolean).join(", ") : "";
  const skills = maid.skillsPreferences ? JSON.stringify(maid.skillsPreferences) : "";
  const history = Array.isArray(maid.employmentHistory) ? maid.employmentHistory.map((h) => [str(h.country), str(h.duties)].filter(Boolean).join(": ")).filter(Boolean).join("; ") : "";
  return [
    str(maid.fullName),
    str(maid.nationality) && `Nationality: ${str(maid.nationality)}`,
    str(maid.type) && `Type: ${str(maid.type)}`,
    str(maid.status) && `Status: ${str(maid.status)}`,
    langs && `Languages: ${langs}`,
    workAreas && `Work areas: ${workAreas}`,
    str(maid.introduction),
    skills && `Skills/Preferences: ${skills}`,
    history && `Work history: ${history}`
  ].filter(Boolean).join(". ");
}, "buildMaidText");
var buildRecommendationQuery = /* @__PURE__ */ __name((input) => {
  const parts = [];
  if (str(input.message)) parts.push(str(input.message));
  if (str(input.nationalityPreference)) parts.push(`nationality: ${str(input.nationalityPreference)}`);
  if (input.childcareExperience) parts.push("childcare or infant care experience");
  if (input.elderlyCareExperience) parts.push("elderly or bedridden care experience");
  if (input.cookingSkills) parts.push("cooking skills");
  if (str(input.languageSkills || input.language)) parts.push(`language: ${str(input.languageSkills || input.language)}`);
  if (str(input.maidType)) parts.push(`type: ${str(input.maidType)}`);
  return parts.join(". ");
}, "buildRecommendationQuery");
var generateEmbedding = /* @__PURE__ */ __name(async (env, text3) => {
  if (!env.AI || !text3.trim()) return null;
  try {
    const result = await env.AI.run(EMBEDDING_MODEL, { text: [text3] });
    const data = result.data;
    if (!Array.isArray(data) || !data[0]) return null;
    return Array.from(data[0]);
  } catch {
    return null;
  }
}, "generateEmbedding");
var upsertMaidEmbedding = /* @__PURE__ */ __name(async (env, maid) => {
  if (!env.AI || !env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) return;
  const text3 = buildMaidText(maid);
  if (!text3) return;
  const embedding = await generateEmbedding(env, text3);
  if (!embedding) return;
  await fetch(`${env.SUPABASE_URL}/rest/v1/${EMBEDDINGS_TABLE}`, {
    method: "POST",
    headers: {
      ...sbHeaders(env),
      prefer: "resolution=merge-duplicates"
    },
    body: JSON.stringify({
      reference_code: maid.referenceCode,
      embedding: JSON.stringify(embedding),
      updated_at: (/* @__PURE__ */ new Date()).toISOString()
    })
  }).catch(() => {
  });
}, "upsertMaidEmbedding");
var searchSimilarMaids = /* @__PURE__ */ __name(async (env, query, limit = 12) => {
  if (!env.AI || !env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) return [];
  const embedding = await generateEmbedding(env, query);
  if (!embedding) return [];
  const response = await fetch(
    `${env.SUPABASE_URL}/rest/v1/rpc/search_maid_embeddings`,
    {
      method: "POST",
      headers: sbHeaders(env),
      body: JSON.stringify({
        query_embedding: embedding,
        match_threshold: 0.3,
        match_count: limit
      })
    }
  ).catch(() => null);
  if (!response?.ok) return [];
  const results = await response.json().catch(() => []);
  return results.map((r) => r.reference_code);
}, "searchSimilarMaids");

// functions/api/[[...path]].ts
var CLIENT_SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1e3;
var app = new Hono2();
app.use(
  "/api/*",
  cors({
    origin: /* @__PURE__ */ __name((origin) => {
      const allowed = [
        "https://helped-web-v2.pages.dev",
        "http://localhost:5173",
        "http://localhost:3000"
      ];
      return allowed.includes(origin) ? origin : null;
    }, "origin"),
    credentials: true,
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]
  })
);
app.use("/api/*", async (c, next) => {
  await next();
  c.res.headers.set("X-Content-Type-Options", "nosniff");
  c.res.headers.set("X-Frame-Options", "DENY");
  c.res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  c.res.headers.set(
    "Strict-Transport-Security",
    "max-age=31536000; includeSubDomains"
  );
});
var now2 = /* @__PURE__ */ __name(() => (/* @__PURE__ */ new Date()).toISOString(), "now");
var stripBom = /* @__PURE__ */ __name((value) => value.replace(/^\uFEFF/, ""), "stripBom");
var buildFallbackDate = /* @__PURE__ */ __name(() => new Intl.DateTimeFormat("en-SG", {
  day: "2-digit",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "Asia/Singapore"
}).format(/* @__PURE__ */ new Date()), "buildFallbackDate");
var defaultData = /* @__PURE__ */ __name(() => ({
  companyProfile: {
    id: 1,
    company_name: "At The Agency (formerly Rinzin Agency Pte. Ltd.)",
    short_name: "At The Agency",
    license_no: "2503114",
    address_line1: "Singapore",
    address_line2: "",
    postal_code: "000000",
    country: "Singapore",
    contact_person: "Bala",
    contact_phone: "80730757",
    contact_email: "info@theagency.sg",
    contact_fax: "",
    contact_website: "",
    office_hours_regular: "Mon-Sat: 9:00am to 7:30pm",
    office_hours_other: "",
    social_facebook: "",
    social_whatsapp_number: "80730757",
    social_whatsapp_message: "Hello, I am interested in your agency profile.",
    branding_theme_color: "",
    branding_button_color: "",
    about_us: "",
    logo_data_url: "",
    gallery_image_data_urls: [],
    intro_video_data_url: "",
    created_at: now2(),
    updated_at: now2()
  },
  momPersonnel: [],
  testimonials: [],
  maids: [],
  enquiries: [],
  clients: [],
  clientSessions: [],
  agencyAdmins: [
    {
      id: 1,
      agencyId: 1,
      username: "attheagency",
      password: "",
      agencyName: "Main Agency",
      createdAt: now2()
    }
  ],
  agencyAdminSessions: [],
  directSales: [],
  requests: [],
  requestConversations: [],
  requestMessages: [],
  chatMessages: [],
  employers: [],
  employmentContracts: [],
  ats: {
    applications: [],
    profiles: [],
    scores: {},
    history: {},
    documents: {},
    notifications: {},
    presets: []
  },
  counters: {
    momPersonnel: 1,
    testimonials: 1,
    maids: 1,
    enquiries: 6,
    clients: 1,
    agencyAdmins: 2,
    directSales: 1,
    chatMessages: 1,
    employers: 1,
    employmentContracts: 1
  }
}), "defaultData");
var nextCounter = /* @__PURE__ */ __name((current, ids, fallback) => {
  if (typeof current === "number") return current;
  if (ids.length === 0) return fallback;
  return Math.max(...ids, fallback - 1) + 1;
}, "nextCounter");
var normalizeMaid = /* @__PURE__ */ __name((maid) => {
  const photos = Array.isArray(maid.photoDataUrls) ? maid.photoDataUrls.filter(
    (item) => typeof item === "string" && item.trim()
  ) : maid.photoDataUrl ? [maid.photoDataUrl] : [];
  return {
    ...maid,
    agencyId: Number.isInteger(Number(maid.agencyId)) ? Number(maid.agencyId) : 1,
    status: maid.status ?? "available",
    height: sanitizeInt(maid.height),
    weight: sanitizeInt(maid.weight),
    numberOfChildren: sanitizeInt(maid.numberOfChildren),
    numberOfSiblings: sanitizeInt(maid.numberOfSiblings),
    photoDataUrls: photos.slice(0, 5),
    photoDataUrl: photos[0] ?? maid.photoDataUrl ?? "",
    videoDataUrl: maid.videoDataUrl ?? "",
    hasPhoto: photos.length > 0
  };
}, "normalizeMaid");
var toNullableNumber = /* @__PURE__ */ __name((value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}, "toNullableNumber");
var toTrimmedString = /* @__PURE__ */ __name((value) => String(value ?? "").trim(), "toTrimmedString");
var CANONICAL_WORKFLOWS = [
  "inquiry_match",
  "inquiry_only",
  "lead_scoring",
  "contract_creation",
  "schedule_creation",
  "notification_only",
  "validation_error",
  "human_review"
];
var LEGACY_WORKFLOW_MAP = {
  maid_matching: "inquiry_match",
  general_inquiry: "inquiry_only",
  inquiry: "inquiry_only"
};
var isCanonicalWorkflow = /* @__PURE__ */ __name((workflow) => CANONICAL_WORKFLOWS.includes(workflow), "isCanonicalWorkflow");
var normalizeWorkflow = /* @__PURE__ */ __name((workflow) => {
  if (workflow === "human_review") {
    return "human_review";
  }
  const normalized = LEGACY_WORKFLOW_MAP[workflow] ?? workflow;
  if (isCanonicalWorkflow(normalized)) {
    return normalized;
  }
  throw new Error(`INVALID_WORKFLOW:${workflow}`);
}, "normalizeWorkflow");
var containsLegacyWorkflow = /* @__PURE__ */ __name((value) => {
  if (Array.isArray(value)) {
    return value.some((item) => containsLegacyWorkflow(item));
  }
  if (value && typeof value === "object") {
    return Object.entries(value).some(([key, item]) => {
      if (key === "workflow" && typeof item === "string") {
        return item === "general_inquiry" || item === "maid_matching" || item === "inquiry";
      }
      return containsLegacyWorkflow(item);
    });
  }
  return false;
}, "containsLegacyWorkflow");
var isProductionRuntime = /* @__PURE__ */ __name((request) => {
  const explicit = "production"?.trim()?.toLowerCase() ?? "";
  if (explicit) {
    return explicit === "production";
  }
  const host = new URL(request.url).hostname.toLowerCase();
  return host !== "localhost" && host !== "127.0.0.1";
}, "isProductionRuntime");
var assertNoLegacyWorkflowResponse = /* @__PURE__ */ __name((request, payload) => {
  if (!isProductionRuntime(request)) return;
  if (containsLegacyWorkflow(payload)) {
    throw new Error("LEGACY_WORKFLOW_LEAK_DETECTED");
  }
}, "assertNoLegacyWorkflowResponse");
var defaultIntentForWorkflow = /* @__PURE__ */ __name((workflow) => {
  switch (workflow) {
    case "inquiry_match":
      return "hiring";
    case "inquiry_only":
      return "inquiry";
    case "lead_scoring":
      return "lead";
    case "contract_creation":
      return "contract";
    case "schedule_creation":
      return "schedule";
    case "notification_only":
      return "notification";
    case "validation_error":
      return "validation_error";
    case "human_review":
      return "complaint";
    default:
      return "system";
  }
}, "defaultIntentForWorkflow");
var buildWorkflowResponse = /* @__PURE__ */ __name((request, payload) => {
  try {
    const workflow = normalizeWorkflow(payload.workflow ?? "");
    const responseBody = {
      workflow,
      intent: typeof payload.intent === "string" && payload.intent.trim() ? payload.intent : defaultIntentForWorkflow(workflow),
      fallbackUsed: typeof payload.fallbackUsed === "boolean" ? payload.fallbackUsed : false,
      fallbackProvider: payload.fallbackProvider ?? null,
      data: payload.data
    };
    assertNoLegacyWorkflowResponse(request, responseBody);
    return responseBody;
  } catch (error) {
    if (!isProductionRuntime(request)) {
      throw error;
    }
    return {
      workflow: "validation_error",
      intent: "validation_error",
      fallbackUsed: true,
      fallbackProvider: payload.fallbackProvider ?? "worker_guard",
      data: payload.data
    };
  }
}, "buildWorkflowResponse");
var formatEmployerRefCode = /* @__PURE__ */ __name((value) => String(value).padStart(5, "0"), "formatEmployerRefCode");
var normalizeEmployerContractRecord = /* @__PURE__ */ __name((record) => ({
  id: Number(record.id ?? 0) || 0,
  refCode: toTrimmedString(record.refCode),
  maid: record.maid && typeof record.maid === "object" ? record.maid : {},
  agency: record.agency && typeof record.agency === "object" ? record.agency : {},
  employer: record.employer && typeof record.employer === "object" ? record.employer : {},
  spouse: record.spouse && typeof record.spouse === "object" ? record.spouse : {},
  familyMembers: Array.isArray(record.familyMembers) ? record.familyMembers : [],
  notificationDate: record.notificationDate && typeof record.notificationDate === "object" ? record.notificationDate : {},
  documents: Array.isArray(record.documents) ? record.documents.map((document) => ({
    category: toTrimmedString(document.category),
    fileUrl: toTrimmedString(document.fileUrl),
    fileName: toTrimmedString(document.fileName)
  })) : [],
  createdAt: record.createdAt ?? now2(),
  updatedAt: record.updatedAt ?? record.createdAt ?? now2()
}), "normalizeEmployerContractRecord");
var normalizeEmploymentContractRecord = /* @__PURE__ */ __name((record, fallbackRefCode) => ({
  id: Number(record.id ?? 0) || 0,
  refCode: toTrimmedString(record.refCode) || fallbackRefCode,
  employerRefCode: toTrimmedString(record.employerRefCode) || toTrimmedString(record.refCode) || fallbackRefCode,
  employerId: toNullableNumber(record.employerId),
  maidId: toNullableNumber(record.maidId),
  maidReferenceCode: toTrimmedString(record.maidReferenceCode),
  maidName: toTrimmedString(record.maidName),
  employerName: toTrimmedString(record.employerName),
  caseReferenceNumber: toTrimmedString(record.caseReferenceNumber) || toTrimmedString(record.refCode) || fallbackRefCode,
  contractDate: toTrimmedString(record.contractDate),
  serviceFee: toTrimmedString(record.serviceFee),
  placementFee: toTrimmedString(record.placementFee),
  agencyWitness: toTrimmedString(record.agencyWitness),
  employerSnapshot: record.employerSnapshot && typeof record.employerSnapshot === "object" ? record.employerSnapshot : {},
  maidSnapshot: record.maidSnapshot && typeof record.maidSnapshot === "object" ? record.maidSnapshot : {},
  createdAt: record.createdAt ?? now2(),
  updatedAt: record.updatedAt ?? record.createdAt ?? now2()
}), "normalizeEmploymentContractRecord");
var mergeAppData = /* @__PURE__ */ __name((raw2) => {
  const defaults = defaultData();
  const maids = (raw2.maids ?? defaults.maids).map(normalizeMaid);
  const enquiries = raw2.enquiries ?? defaults.enquiries;
  const clients = (raw2.clients ?? defaults.clients).map((client) => ({
    ...client,
    supabaseUserId: client.supabaseUserId || void 0,
    name: client.name ?? "",
    company: client.company ?? "",
    phone: client.phone ?? "",
    email: client.email ?? "",
    profileImageUrl: client.profileImageUrl ?? "",
    createdAt: client.createdAt ?? now2(),
    // Back-compat: treat pre-existing clients as verified.
    emailVerified: typeof client.emailVerified === "boolean" ? client.emailVerified : true
  }));
  let agencyAdmins = (raw2.agencyAdmins ?? defaults.agencyAdmins).map(
    (admin) => ({
      ...admin,
      agencyId: Number.isInteger(Number(admin.agencyId)) ? Number(admin.agencyId) : 1,
      supabaseUserId: admin.supabaseUserId || void 0,
      email: admin.email ?? "",
      password: typeof admin.password === "string" ? admin.password : "",
      passwordHash: typeof admin.passwordHash === "string" ? admin.passwordHash : "",
      profileImageUrl: admin.profileImageUrl ?? "",
      createdAt: admin.createdAt ?? now2(),
      // Back-compat: treat pre-existing admins as verified (or no-email).
      emailVerified: typeof admin.emailVerified === "boolean" ? admin.emailVerified : true
    })
  );
  const hasMainAgency = agencyAdmins.some(
    (admin) => admin.username === "attheagency"
  );
  if (!hasMainAgency) {
    agencyAdmins = agencyAdmins.map(
      (admin) => admin.username === "admin" ? { ...admin, username: "attheagency" } : admin
    );
  }
  const directSales = raw2.directSales ?? defaults.directSales;
  const requests = Array.isArray(raw2.requests) ? raw2.requests.filter(
    (item) => Boolean(item && typeof item === "object" && item.id)
  ).map((request) => ({
    ...request,
    clientId: Number.isInteger(Number(request.clientId)) ? Number(request.clientId) : 0,
    agencyId: Number.isInteger(Number(request.agencyId)) ? Number(request.agencyId) : 1,
    type: request.type === "direct" ? "direct" : "general",
    status: request.status === "interested" || request.status === "direct_hire" || request.status === "rejected" ? request.status : "pending",
    details: request.details && typeof request.details === "object" ? request.details : {},
    maidReferences: Array.isArray(request.maidReferences) ? request.maidReferences.map((item) => String(item ?? "").trim()).filter(Boolean) : [],
    updatedBy: request.updatedBy ?? "system",
    createdAt: request.createdAt ?? now2(),
    updatedAt: request.updatedAt ?? request.createdAt ?? now2()
  })) : defaults.requests;
  const requestConversations = Array.isArray(raw2.requestConversations) ? raw2.requestConversations.filter(
    (item) => Boolean(item && typeof item === "object" && item.id && item.requestId)
  ) : defaults.requestConversations;
  const requestMessages = Array.isArray(raw2.requestMessages) ? raw2.requestMessages.filter(
    (item) => Boolean(item && typeof item === "object" && item.id && item.conversationId)
  ) : defaults.requestMessages;
  const chatMessages = raw2.chatMessages ?? defaults.chatMessages;
  const employers = (raw2.employers ?? defaults.employers).map((record) => normalizeEmployerContractRecord(record)).filter((record) => record.refCode);
  const employmentContracts = (raw2.employmentContracts ?? employers.map((record) => {
    const agency = record.agency ?? {};
    const maid = record.maid ?? {};
    const employer = record.employer ?? {};
    return {
      id: record.id,
      refCode: record.refCode,
      employerRefCode: record.refCode,
      employerId: record.id,
      maidId: toNullableNumber(maid.id) ?? toNullableNumber(maid.maidId),
      maidReferenceCode: toTrimmedString(
        maid.referenceCode
      ),
      maidName: toTrimmedString(maid.fullName) || toTrimmedString(maid.name),
      employerName: toTrimmedString(
        employer.name
      ),
      caseReferenceNumber: toTrimmedString(
        agency.caseReferenceNumber
      ) || record.refCode,
      contractDate: toTrimmedString(
        agency.contractDate
      ),
      serviceFee: toTrimmedString(
        agency.serviceFee
      ),
      placementFee: toTrimmedString(
        agency.placementFee
      ),
      agencyWitness: toTrimmedString(
        agency.agencyWitness
      ),
      employerSnapshot: employer,
      maidSnapshot: maid,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt
    };
  })).map(
    (record) => normalizeEmploymentContractRecord(
      record,
      toTrimmedString(record.refCode)
    )
  );
  const rawAts = raw2.ats ?? defaults.ats;
  return {
    companyProfile: {
      ...defaults.companyProfile,
      ...raw2.companyProfile,
      gallery_image_data_urls: Array.isArray(
        raw2.companyProfile?.gallery_image_data_urls
      ) ? raw2.companyProfile.gallery_image_data_urls : defaults.companyProfile.gallery_image_data_urls
    },
    momPersonnel: raw2.momPersonnel ?? defaults.momPersonnel,
    testimonials: raw2.testimonials ?? defaults.testimonials,
    maids,
    enquiries,
    clients,
    clientSessions: raw2.clientSessions ?? defaults.clientSessions,
    agencyAdmins,
    agencyAdminSessions: raw2.agencyAdminSessions ?? defaults.agencyAdminSessions,
    directSales,
    requests,
    requestConversations,
    requestMessages,
    chatMessages: chatMessages.map((message) => ({
      ...message,
      conversationType: message.conversationType ?? "support",
      agencyName: message.agencyName ?? ""
    })),
    employers,
    employmentContracts,
    ats: {
      applications: Array.isArray(rawAts.applications) ? rawAts.applications.filter(
        (item) => Boolean(item && typeof item === "object" && item.id)
      ) : defaults.ats.applications,
      profiles: Array.isArray(rawAts.profiles) ? rawAts.profiles.filter(
        (item) => Boolean(item && typeof item === "object" && item.id)
      ) : defaults.ats.profiles,
      scores: rawAts.scores && typeof rawAts.scores === "object" ? rawAts.scores : defaults.ats.scores,
      history: rawAts.history && typeof rawAts.history === "object" ? rawAts.history : defaults.ats.history,
      documents: rawAts.documents && typeof rawAts.documents === "object" ? rawAts.documents : defaults.ats.documents,
      notifications: rawAts.notifications && typeof rawAts.notifications === "object" ? rawAts.notifications : defaults.ats.notifications,
      presets: Array.isArray(rawAts.presets) ? rawAts.presets.filter(
        (item) => Boolean(item && typeof item === "object" && item.id)
      ) : defaults.ats.presets
    },
    counters: {
      momPersonnel: nextCounter(
        raw2.counters?.momPersonnel,
        (raw2.momPersonnel ?? []).map((item) => item.id),
        defaults.counters.momPersonnel
      ),
      testimonials: nextCounter(
        raw2.counters?.testimonials,
        (raw2.testimonials ?? []).map((item) => item.id),
        defaults.counters.testimonials
      ),
      maids: nextCounter(
        raw2.counters?.maids,
        maids.map((item) => item.id),
        defaults.counters.maids
      ),
      enquiries: nextCounter(
        raw2.counters?.enquiries,
        enquiries.map((item) => item.id),
        defaults.counters.enquiries
      ),
      clients: nextCounter(
        raw2.counters?.clients,
        clients.map((item) => item.id),
        defaults.counters.clients
      ),
      agencyAdmins: nextCounter(
        raw2.counters?.agencyAdmins,
        agencyAdmins.map((item) => item.id),
        defaults.counters.agencyAdmins
      ),
      directSales: nextCounter(
        raw2.counters?.directSales,
        directSales.map((item) => item.id),
        defaults.counters.directSales
      ),
      chatMessages: nextCounter(
        raw2.counters?.chatMessages,
        chatMessages.map((item) => item.id),
        defaults.counters.chatMessages
      ),
      employers: nextCounter(
        raw2.counters?.employers,
        employers.map((item) => item.id),
        defaults.counters.employers
      ),
      employmentContracts: nextCounter(
        raw2.counters?.employmentContracts,
        employmentContracts.map((item) => item.id),
        defaults.counters.employmentContracts
      )
    }
  };
}, "mergeAppData");
var loadDataFromKv = /* @__PURE__ */ __name(async (kv, _options = {}) => {
  const raw2 = await kv.get("app-data.json");
  if (!raw2) {
    const initial = defaultData();
    await kv.put("app-data.json", JSON.stringify({ ...initial, __v: 2 }));
    return initial;
  }
  const parsed = JSON.parse(stripBom(raw2));
  if ((parsed.__v ?? 0) >= 2) {
    const { __v: _v, ...data } = parsed;
    const defaults = defaultData();
    for (const key of Object.keys(defaults)) {
      if (data[key] === void 0) {
        data[key] = defaults[key];
      }
    }
    return data;
  }
  return mergeAppData(parsed);
}, "loadDataFromKv");
var saveDataToKv = /* @__PURE__ */ __name(async (kv, data) => {
  await kv.put("app-data.json", JSON.stringify({ ...data, __v: 2 }));
}, "saveDataToKv");
var SUPABASE_APP_DATA_BASE = /* @__PURE__ */ Symbol("supabaseAppDataBase");
var SUPABASE_APP_DATA_UPDATED_AT = /* @__PURE__ */ Symbol("supabaseAppDataUpdatedAt");
var logSupabaseConfigDebug = /* @__PURE__ */ __name((_env) => {
}, "logSupabaseConfigDebug");
var getSupabaseAppDataConfig = /* @__PURE__ */ __name((env) => {
  const baseUrl = env.SUPABASE_URL?.trim().replace(/\/$/, "");
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!baseUrl || !serviceRoleKey) return null;
  logSupabaseConfigDebug(env);
  return {
    baseUrl,
    serviceRoleKey,
    table: env.SUPABASE_APP_DATA_TABLE?.trim() || "app_data",
    rowId: env.SUPABASE_APP_DATA_ID?.trim() || "default"
  };
}, "getSupabaseAppDataConfig");
var supabaseHeaders = /* @__PURE__ */ __name((config, extra) => ({
  apikey: config.serviceRoleKey,
  authorization: `Bearer ${config.serviceRoleKey}`,
  ...extra
}), "supabaseHeaders");
var supabaseStorageHeaders = /* @__PURE__ */ __name((config, extra) => ({
  apikey: config.serviceRoleKey,
  authorization: `Bearer ${config.serviceRoleKey}`,
  ...extra
}), "supabaseStorageHeaders");
var readSupabaseError = /* @__PURE__ */ __name(async (response) => {
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    try {
      return JSON.stringify(await response.json());
    } catch {
      return await response.text();
    }
  }
  return await response.text();
}, "readSupabaseError");
var isSupabaseStatementTimeout = /* @__PURE__ */ __name((status, details) => status >= 500 && (details.includes('"code":"57014"') || details.toLowerCase().includes("statement timeout") || details.toLowerCase().includes("canceling statement")), "isSupabaseStatementTimeout");
var cloneJson = /* @__PURE__ */ __name((value) => JSON.parse(JSON.stringify(value)), "cloneJson");
var isPlainObject = /* @__PURE__ */ __name((value) => typeof value === "object" && value !== null && !Array.isArray(value), "isPlainObject");
var deepEqual = /* @__PURE__ */ __name((left, right) => JSON.stringify(left) === JSON.stringify(right), "deepEqual");
var attachSupabaseTracking = /* @__PURE__ */ __name((data, base, updatedAt) => {
  Object.defineProperty(data, SUPABASE_APP_DATA_BASE, {
    value: cloneJson(base),
    writable: true,
    configurable: true,
    enumerable: false
  });
  Object.defineProperty(data, SUPABASE_APP_DATA_UPDATED_AT, {
    value: updatedAt,
    writable: true,
    configurable: true,
    enumerable: false
  });
  return data;
}, "attachSupabaseTracking");
var getSupabaseTrackedBase = /* @__PURE__ */ __name((data) => data[SUPABASE_APP_DATA_BASE], "getSupabaseTrackedBase");
var getSupabaseTrackedUpdatedAt = /* @__PURE__ */ __name((data) => data[SUPABASE_APP_DATA_UPDATED_AT], "getSupabaseTrackedUpdatedAt");
var syncAppDataInPlace = /* @__PURE__ */ __name((target, source) => {
  for (const key of Object.keys(target)) {
    delete target[key];
  }
  Object.assign(target, cloneJson(source));
}, "syncAppDataInPlace");
var mergeValueWithBase = /* @__PURE__ */ __name((baseValue, localValue, remoteValue) => {
  if (deepEqual(localValue, baseValue)) {
    return cloneJson(remoteValue);
  }
  if (deepEqual(remoteValue, baseValue)) {
    return cloneJson(localValue);
  }
  if (isPlainObject(baseValue) && isPlainObject(localValue) && isPlainObject(remoteValue)) {
    const merged = {};
    const keys = /* @__PURE__ */ new Set([
      ...Object.keys(baseValue),
      ...Object.keys(localValue),
      ...Object.keys(remoteValue)
    ]);
    for (const key of keys) {
      merged[key] = mergeValueWithBase(
        baseValue[key],
        localValue[key],
        remoteValue[key]
      );
    }
    return merged;
  }
  return cloneJson(localValue);
}, "mergeValueWithBase");
var mergeCollectionWithBase = /* @__PURE__ */ __name((baseItems, localItems, remoteItems, getKey) => {
  const baseMap = new Map(baseItems.map((item) => [getKey(item), item]));
  const localMap = new Map(localItems.map((item) => [getKey(item), item]));
  const remoteMap = new Map(remoteItems.map((item) => [getKey(item), item]));
  const orderedKeys = [];
  const seen = /* @__PURE__ */ new Set();
  for (const key of [...localItems, ...remoteItems].map(getKey)) {
    if (seen.has(key)) continue;
    seen.add(key);
    orderedKeys.push(key);
  }
  const merged = [];
  for (const key of orderedKeys) {
    const baseItem = baseMap.get(key);
    const localItem = localMap.get(key);
    const remoteItem = remoteMap.get(key);
    if (!localItem) {
      if (!remoteItem) continue;
      if (!baseItem || !deepEqual(remoteItem, baseItem)) {
        merged.push(cloneJson(remoteItem));
      }
      continue;
    }
    if (!remoteItem) {
      merged.push(cloneJson(localItem));
      continue;
    }
    if (!baseItem) {
      merged.push(cloneJson(remoteItem));
      if (!deepEqual(localItem, remoteItem)) {
        merged[merged.length - 1] = cloneJson(
          mergeValueWithBase({}, localItem, remoteItem)
        );
      }
      continue;
    }
    merged.push(
      cloneJson(mergeValueWithBase(baseItem, localItem, remoteItem))
    );
  }
  return merged;
}, "mergeCollectionWithBase");
var mergeAppDataWithBase = /* @__PURE__ */ __name((baseData, localData, remoteData) => mergeAppData({
  companyProfile: mergeValueWithBase(
    baseData.companyProfile,
    localData.companyProfile,
    remoteData.companyProfile
  ),
  momPersonnel: mergeCollectionWithBase(
    baseData.momPersonnel,
    localData.momPersonnel,
    remoteData.momPersonnel,
    (item) => String(item.id)
  ),
  testimonials: mergeCollectionWithBase(
    baseData.testimonials,
    localData.testimonials,
    remoteData.testimonials,
    (item) => String(item.id)
  ),
  maids: mergeCollectionWithBase(
    baseData.maids,
    localData.maids,
    remoteData.maids,
    (item) => `${item.agencyId}:${item.referenceCode || item.id}`
  ),
  enquiries: mergeCollectionWithBase(
    baseData.enquiries,
    localData.enquiries,
    remoteData.enquiries,
    (item) => String(item.id)
  ),
  clients: mergeCollectionWithBase(
    baseData.clients,
    localData.clients,
    remoteData.clients,
    (item) => String(item.id)
  ),
  clientSessions: mergeCollectionWithBase(
    baseData.clientSessions,
    localData.clientSessions,
    remoteData.clientSessions,
    (item) => item.token
  ),
  agencyAdmins: mergeCollectionWithBase(
    baseData.agencyAdmins,
    localData.agencyAdmins,
    remoteData.agencyAdmins,
    (item) => String(item.id)
  ),
  agencyAdminSessions: mergeCollectionWithBase(
    baseData.agencyAdminSessions,
    localData.agencyAdminSessions,
    remoteData.agencyAdminSessions,
    (item) => item.token
  ),
  directSales: mergeCollectionWithBase(
    baseData.directSales,
    localData.directSales,
    remoteData.directSales,
    (item) => String(item.id)
  ),
  requests: mergeCollectionWithBase(
    baseData.requests,
    localData.requests,
    remoteData.requests,
    (item) => item.id
  ),
  requestConversations: mergeCollectionWithBase(
    baseData.requestConversations,
    localData.requestConversations,
    remoteData.requestConversations,
    (item) => item.id
  ),
  requestMessages: mergeCollectionWithBase(
    baseData.requestMessages,
    localData.requestMessages,
    remoteData.requestMessages,
    (item) => item.id
  ),
  chatMessages: mergeCollectionWithBase(
    baseData.chatMessages,
    localData.chatMessages,
    remoteData.chatMessages,
    (item) => String(item.id)
  ),
  employers: mergeCollectionWithBase(
    baseData.employers,
    localData.employers,
    remoteData.employers,
    (item) => `${item.id}:${item.refCode}`
  ),
  employmentContracts: mergeCollectionWithBase(
    baseData.employmentContracts,
    localData.employmentContracts,
    remoteData.employmentContracts,
    (item) => `${item.id}:${item.refCode}:${item.employerRefCode}`
  ),
  counters: {
    momPersonnel: Math.max(
      baseData.counters.momPersonnel,
      localData.counters.momPersonnel,
      remoteData.counters.momPersonnel
    ),
    testimonials: Math.max(
      baseData.counters.testimonials,
      localData.counters.testimonials,
      remoteData.counters.testimonials
    ),
    maids: Math.max(
      baseData.counters.maids,
      localData.counters.maids,
      remoteData.counters.maids
    ),
    enquiries: Math.max(
      baseData.counters.enquiries,
      localData.counters.enquiries,
      remoteData.counters.enquiries
    ),
    clients: Math.max(
      baseData.counters.clients,
      localData.counters.clients,
      remoteData.counters.clients
    ),
    agencyAdmins: Math.max(
      baseData.counters.agencyAdmins,
      localData.counters.agencyAdmins,
      remoteData.counters.agencyAdmins
    ),
    directSales: Math.max(
      baseData.counters.directSales,
      localData.counters.directSales,
      remoteData.counters.directSales
    ),
    chatMessages: Math.max(
      baseData.counters.chatMessages,
      localData.counters.chatMessages,
      remoteData.counters.chatMessages
    ),
    employers: Math.max(
      baseData.counters.employers,
      localData.counters.employers,
      remoteData.counters.employers
    ),
    employmentContracts: Math.max(
      baseData.counters.employmentContracts,
      localData.counters.employmentContracts,
      remoteData.counters.employmentContracts
    )
  }
}), "mergeAppDataWithBase");
var fetchSupabaseAppDataRow = /* @__PURE__ */ __name(async (config) => {
  const table = encodeURIComponent(config.table);
  const rowId = encodeURIComponent(config.rowId);
  const url = `${config.baseUrl}/rest/v1/${table}?id=eq.${rowId}&select=data,updated_at&limit=1`;
  const retryDelaysMs = [150, 400, 900];
  for (let attempt = 0; attempt <= retryDelaysMs.length; attempt += 1) {
    const response = await fetch(url, {
      method: "GET",
      headers: supabaseHeaders(config, { accept: "application/json" })
    });
    if (!response.ok) {
      const details = await readSupabaseError(response);
      if (isSupabaseStatementTimeout(response.status, details) && attempt < retryDelaysMs.length) {
        await sleep2(retryDelaysMs[attempt]);
        continue;
      }
      throw new Error(`Supabase read failed (${response.status}): ${details}`);
    }
    const rows = await response.json();
    const row = rows[0];
    if (!row?.data || !row.updated_at) {
      return null;
    }
    return {
      data: mergeAppData(row.data),
      updatedAt: row.updated_at
    };
  }
  throw new Error("Supabase read failed unexpectedly");
}, "fetchSupabaseAppDataRow");
var loadDataFromSupabaseNormalized = /* @__PURE__ */ __name(async (config) => {
  const payload = await callSupabaseRpc(
    config,
    "load_helped_app_data",
    { p_app_id: config.rowId }
  );
  return mergeAppData(payload ?? {});
}, "loadDataFromSupabaseNormalized");
var saveDataToSupabaseNormalized = /* @__PURE__ */ __name(async (config, data) => {
  await callSupabaseRpc(
    config,
    "save_helped_app_data",
    {
      p_app_id: config.rowId,
      p_payload: mergeAppData(cloneJson(data))
    }
  );
}, "saveDataToSupabaseNormalized");
var isNormalizedSupabaseEnabled = /* @__PURE__ */ __name((envOrConfig) => {
  if ("SUPABASE_USE_NORMALIZED" in envOrConfig) {
    return envOrConfig.SUPABASE_USE_NORMALIZED?.trim().toLowerCase() === "true";
  }
  return false;
}, "isNormalizedSupabaseEnabled");
var buildSupabaseFilterQuery = /* @__PURE__ */ __name((filters) => {
  if (!filters) return "";
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    params.set(key, `eq.${String(value)}`);
  }
  const query = params.toString();
  return query ? `?${query}` : "";
}, "buildSupabaseFilterQuery");
var fetchSupabaseTableRows = /* @__PURE__ */ __name(async (config, tableName, {
  select = "*",
  filters,
  orderBy,
  limit
} = {}) => {
  const table = encodeURIComponent(tableName);
  const params = new URLSearchParams();
  params.set("select", select);
  if (filters) {
    for (const [key, value] of Object.entries(filters)) {
      params.set(key, `eq.${String(value)}`);
    }
  }
  if (orderBy) {
    params.set("order", orderBy);
  }
  if (typeof limit === "number") {
    params.set("limit", String(limit));
  }
  const url = `${config.baseUrl}/rest/v1/${table}?${params.toString()}`;
  const response = await fetch(url, {
    method: "GET",
    headers: supabaseHeaders(config, { accept: "application/json", prefer: "statement_timeout=5000" })
  });
  if (!response.ok) {
    const details = await readSupabaseError(response);
    throw new Error(`Supabase table read failed for ${tableName} (${response.status}): ${details}`);
  }
  return await response.json();
}, "fetchSupabaseTableRows");
var upsertSupabaseTableRows = /* @__PURE__ */ __name(async (config, tableName, rows, onConflict) => {
  const table = encodeURIComponent(tableName);
  const url = `${config.baseUrl}/rest/v1/${table}?on_conflict=${encodeURIComponent(onConflict)}`;
  const response = await fetch(url, {
    method: "POST",
    headers: supabaseHeaders(config, {
      "content-type": "application/json",
      prefer: "resolution=merge-duplicates,return=minimal"
    }),
    body: JSON.stringify(rows)
  });
  if (!response.ok) {
    const details = await readSupabaseError(response);
    throw new Error(`Supabase table write failed for ${tableName} (${response.status}): ${details}`);
  }
}, "upsertSupabaseTableRows");
var deleteSupabaseTableRows = /* @__PURE__ */ __name(async (config, tableName, filters) => {
  const table = encodeURIComponent(tableName);
  const query = buildSupabaseFilterQuery(filters);
  const url = `${config.baseUrl}/rest/v1/${table}${query}`;
  const response = await fetch(url, {
    method: "DELETE",
    headers: supabaseHeaders(config, {
      prefer: "return=minimal"
    })
  });
  if (!response.ok) {
    const details = await readSupabaseError(response);
    throw new Error(`Supabase table delete failed for ${tableName} (${response.status}): ${details}`);
  }
}, "deleteSupabaseTableRows");
var callSupabaseRpc = /* @__PURE__ */ __name(async (config, fnName, payload) => {
  const url = `${config.baseUrl}/rest/v1/rpc/${encodeURIComponent(fnName)}`;
  const retryDelaysMs = [250, 600];
  for (let attempt = 0; attempt <= retryDelaysMs.length; attempt++) {
    if (attempt > 0) await sleep2(retryDelaysMs[attempt - 1]);
    const response = await fetch(url, {
      method: "POST",
      headers: supabaseHeaders(config, {
        "content-type": "application/json",
        accept: "application/json",
        prefer: "statement_timeout=5000"
      }),
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      const details = await readSupabaseError(response);
      if (isSupabaseStatementTimeout(response.status, details) && attempt < retryDelaysMs.length) {
        console.warn(`Supabase RPC timeout for ${fnName}, retrying (${attempt + 1}/${retryDelaysMs.length})...`);
        continue;
      }
      throw new Error(`Supabase RPC failed for ${fnName} (${response.status}): ${details}`);
    }
    if (response.status === 204) return null;
    return await response.json();
  }
  throw new Error(`Supabase RPC failed for ${fnName} after retries`);
}, "callSupabaseRpc");
var tryCallSupabaseRpc = /* @__PURE__ */ __name(async (config, fnName, payload) => {
  try {
    return await callSupabaseRpc(config, fnName, payload);
  } catch (error) {
    console.warn(`Fast Supabase RPC path failed for ${fnName}; falling back`, error);
    return null;
  }
}, "tryCallSupabaseRpc");
var SLIM_MAID_SELECT = [
  "record_id",
  "agency_id",
  "reference_code",
  "full_name",
  "status",
  "nationality",
  "maid_type",
  "is_public",
  "has_photo",
  "created_at",
  "updated_at"
].join(",");
var slimRowToMaidRecord = /* @__PURE__ */ __name((row) => ({
  id: Number(row.record_id ?? 0),
  agencyId: Number(row.agency_id ?? 1) || 1,
  fullName: row.full_name ?? "",
  referenceCode: row.reference_code ?? "",
  status: row.status ?? "available",
  type: row.maid_type ?? "",
  nationality: row.nationality ?? "",
  dateOfBirth: "",
  placeOfBirth: "",
  height: 0,
  weight: 0,
  religion: "",
  maritalStatus: "",
  numberOfChildren: 0,
  numberOfSiblings: 0,
  homeAddress: "",
  airportRepatriation: "",
  educationLevel: "",
  languageSkills: {},
  skillsPreferences: {},
  workAreas: {},
  employmentHistory: [],
  introduction: {},
  agencyContact: {},
  photoDataUrl: "",
  photoDataUrls: [],
  videoDataUrl: "",
  isPublic: Boolean(row.is_public),
  hasPhoto: Boolean(row.has_photo),
  createdAt: row.created_at ?? "",
  updatedAt: row.updated_at ?? ""
}), "slimRowToMaidRecord");
var parseContentRangeTotal = /* @__PURE__ */ __name((value) => {
  if (!value) return null;
  const total = value.split("/")[1];
  if (!total || total === "*") return null;
  const parsed = Number(total);
  return Number.isFinite(parsed) ? parsed : null;
}, "parseContentRangeTotal");
var listMaidsFromSupabaseNormalized = /* @__PURE__ */ __name(async (config, {
  search,
  visibility,
  agencyId,
  offset,
  limit,
  noPhotos
}) => {
  const table = encodeURIComponent("helped_maids");
  const params = new URLSearchParams();
  params.set("select", noPhotos ? SLIM_MAID_SELECT : "record_id,payload");
  params.set("app_id", `eq.${config.rowId}`);
  params.set("order", "updated_at.desc.nullslast,record_id.desc");
  if (visibility === "public" || visibility === "hidden") {
    params.set("is_public", `eq.${visibility === "public"}`);
  }
  if (typeof agencyId === "number") {
    params.set("agency_id", `eq.${agencyId}`);
  }
  if (search?.trim()) {
    const term = search.trim().replace(/[%*,()]/g, " ");
    params.set("or", `(full_name.ilike.*${term}*,reference_code.ilike.*${term}*)`);
  }
  const headers = new Headers(supabaseHeaders(config, {
    accept: "application/json",
    prefer: "count=estimated, statement_timeout=5000"
  }));
  if (typeof limit === "number" && limit > 0) {
    headers.set("range-unit", "items");
    headers.set("range", `${offset}-${offset + limit - 1}`);
  }
  const retryDelaysMs = [300];
  for (let attempt = 0; attempt <= retryDelaysMs.length; attempt++) {
    if (attempt > 0) await sleep2(retryDelaysMs[attempt - 1]);
    const response = await fetch(
      `${config.baseUrl}/rest/v1/${table}?${params.toString()}`,
      { method: "GET", headers }
    );
    if (!response.ok && response.status !== 206) {
      const details = await readSupabaseError(response);
      if (isSupabaseStatementTimeout(response.status, details) && attempt < retryDelaysMs.length) {
        console.warn(`Supabase maid list timeout, retrying...`);
        continue;
      }
      throw new Error(`Supabase maid list failed (${response.status}): ${details}`);
    }
    const total = parseContentRangeTotal(response.headers.get("content-range")) ?? 0;
    if (noPhotos) {
      const rows2 = await response.json();
      return { maids: rows2.map(slimRowToMaidRecord), total: total || rows2.length };
    }
    const rows = await response.json();
    return {
      maids: rows.map((row) => row.payload).filter((maid) => Boolean(maid)).map(normalizeMaid),
      total: total || rows.length
    };
  }
  throw new Error("Supabase maid list failed after retries");
}, "listMaidsFromSupabaseNormalized");
var listMaidsFromSupabaseAppView = /* @__PURE__ */ __name(async (config, {
  search,
  visibility,
  agencyId,
  offset,
  limit,
  noPhotos
}) => {
  const table = encodeURIComponent("app_maids");
  const params = new URLSearchParams();
  params.set("select", "raw_record");
  params.set("order", "updated_at.desc.nullslast,view_row_id.desc");
  params.set("app_id", `eq.${config.rowId}`);
  if (visibility === "public" || visibility === "hidden") {
    params.set("is_public", `eq.${visibility === "public"}`);
  }
  if (typeof agencyId === "number") {
    params.set("agency_id", `eq.${agencyId}`);
  }
  if (search?.trim()) {
    const term = search.trim().replace(/[%*,()]/g, " ");
    params.set("or", `(full_name.ilike.*${term}*,reference_code.ilike.*${term}*)`);
  }
  const headers = new Headers(supabaseHeaders(config, {
    accept: "application/json",
    prefer: "count=estimated, statement_timeout=5000"
  }));
  if (typeof limit === "number" && limit > 0) {
    headers.set("range-unit", "items");
    headers.set("range", `${offset}-${offset + limit - 1}`);
  }
  const retryDelaysMs = [300];
  for (let attempt = 0; attempt <= retryDelaysMs.length; attempt++) {
    if (attempt > 0) await sleep2(retryDelaysMs[attempt - 1]);
    const response = await fetch(
      `${config.baseUrl}/rest/v1/${table}?${params.toString()}`,
      { method: "GET", headers }
    );
    if (!response.ok && response.status !== 206) {
      const details = await readSupabaseError(response);
      if (isSupabaseStatementTimeout(response.status, details) && attempt < retryDelaysMs.length) {
        console.warn(`Supabase maid view list timeout, retrying...`);
        continue;
      }
      throw new Error(`Supabase maid view list failed (${response.status}): ${details}`);
    }
    const rows = await response.json();
    const total = parseContentRangeTotal(response.headers.get("content-range")) ?? rows.length;
    const maids = rows.map((row) => row.raw_record).filter((maid) => Boolean(maid)).map((maid) => noPhotos ? { ...normalizeMaid(maid), photoDataUrl: "", photoDataUrls: [] } : normalizeMaid(maid));
    return { maids, total };
  }
  throw new Error("Supabase maid view list failed after retries");
}, "listMaidsFromSupabaseAppView");
var getMaidFromSupabaseNormalized = /* @__PURE__ */ __name(async (config, referenceCode) => {
  const rows = await fetchSupabaseTableRows(
    config,
    "helped_maids",
    {
      select: "record_id,payload",
      filters: {
        app_id: config.rowId,
        reference_code: normalizeReferenceCode(referenceCode)
      },
      limit: 1
    }
  );
  return rows[0]?.payload ? normalizeMaid(rows[0].payload) : null;
}, "getMaidFromSupabaseNormalized");
var getMaidFromSupabaseAppView = /* @__PURE__ */ __name(async (config, referenceCode) => {
  const rows = await fetchSupabaseTableRows(
    config,
    "app_maids",
    {
      select: "raw_record",
      filters: {
        app_id: config.rowId,
        reference_code: normalizeReferenceCode(referenceCode)
      },
      limit: 1
    }
  );
  return rows[0]?.raw_record ? normalizeMaid(rows[0].raw_record) : null;
}, "getMaidFromSupabaseAppView");
var updateMaidVisibilityInSupabaseNormalized = /* @__PURE__ */ __name(async (config, referenceCode, isPublic) => {
  const existing = await getMaidFromSupabaseNormalized(config, referenceCode);
  if (!existing) return null;
  const updatedAt = now2();
  const payload = {
    ...existing,
    isPublic,
    updatedAt
  };
  const table = encodeURIComponent("helped_maids");
  const params = new URLSearchParams();
  params.set("app_id", `eq.${config.rowId}`);
  params.set("reference_code", `eq.${normalizeReferenceCode(referenceCode)}`);
  params.set("select", "payload");
  const response = await fetch(
    `${config.baseUrl}/rest/v1/${table}?${params.toString()}`,
    {
      method: "PATCH",
      headers: supabaseHeaders(config, {
        "content-type": "application/json",
        prefer: "return=representation"
      }),
      body: JSON.stringify({
        is_public: isPublic,
        updated_at: updatedAt,
        payload
      })
    }
  );
  if (!response.ok) {
    const details = await readSupabaseError(response);
    throw new Error(`Supabase maid visibility update failed (${response.status}): ${details}`);
  }
  const rows = await response.json();
  return rows[0]?.payload ? normalizeMaid(rows[0].payload) : payload;
}, "updateMaidVisibilityInSupabaseNormalized");
var updateMaidMediaInSupabaseNormalized = /* @__PURE__ */ __name(async (config, referenceCode, media) => {
  const existing = await getMaidFromSupabaseNormalized(config, referenceCode);
  if (!existing) return null;
  const updatedAt = now2();
  const payload = {
    ...existing,
    ...media,
    updatedAt
  };
  const table = encodeURIComponent("helped_maids");
  const params = new URLSearchParams();
  params.set("app_id", `eq.${config.rowId}`);
  params.set("reference_code", `eq.${normalizeReferenceCode(referenceCode)}`);
  params.set("select", "payload");
  const response = await fetch(
    `${config.baseUrl}/rest/v1/${table}?${params.toString()}`,
    {
      method: "PATCH",
      headers: supabaseHeaders(config, {
        "content-type": "application/json",
        prefer: "return=representation"
      }),
      body: JSON.stringify({
        has_photo: payload.hasPhoto,
        updated_at: updatedAt,
        payload
      })
    }
  );
  if (!response.ok) {
    const details = await readSupabaseError(response);
    throw new Error(`Supabase maid media update failed (${response.status}): ${details}`);
  }
  const rows = await response.json();
  return rows[0]?.payload ? normalizeMaid(rows[0].payload) : payload;
}, "updateMaidMediaInSupabaseNormalized");
var updateMaidVisibilityInSupabaseAppData = /* @__PURE__ */ __name(async (config, referenceCode, isPublic) => {
  const payload = await callSupabaseRpc(
    config,
    "update_app_maid_visibility",
    {
      p_app_id: config.rowId,
      p_reference_code: normalizeReferenceCode(referenceCode),
      p_is_public: isPublic
    }
  );
  return payload ? normalizeMaid(payload) : null;
}, "updateMaidVisibilityInSupabaseAppData");
var createMaidInSupabaseAppData = /* @__PURE__ */ __name(async (config, payload) => {
  const maid = await callSupabaseRpc(
    config,
    "create_app_maid",
    {
      p_app_id: config.rowId,
      p_payload: payload
    }
  );
  return normalizeMaid(maid);
}, "createMaidInSupabaseAppData");
var updateMaidInSupabaseAppData = /* @__PURE__ */ __name(async (config, referenceCode, payload) => {
  const maid = await callSupabaseRpc(
    config,
    "update_app_maid",
    {
      p_app_id: config.rowId,
      p_reference_code: normalizeReferenceCode(referenceCode),
      p_payload: payload
    }
  );
  return maid ? normalizeMaid(maid) : null;
}, "updateMaidInSupabaseAppData");
var getNextNormalizedMaidRecordId = /* @__PURE__ */ __name(async (config) => {
  const rows = await fetchSupabaseTableRows(
    config,
    "helped_maids",
    {
      select: "record_id",
      filters: { app_id: config.rowId },
      orderBy: "record_id.desc",
      limit: 1
    }
  );
  return Number(rows[0]?.record_id ?? 0) + 1;
}, "getNextNormalizedMaidRecordId");
var upsertMaidInSupabaseNormalized = /* @__PURE__ */ __name(async (config, payload, options) => {
  const referenceCode = normalizeReferenceCode(options.referenceCode ?? payload.referenceCode);
  const existing = options.create ? null : await getMaidFromSupabaseNormalized(config, referenceCode);
  if (!options.create && !existing) return null;
  if (options.create) {
    const duplicate = await getMaidFromSupabaseNormalized(config, payload.referenceCode);
    if (duplicate) throw new Error("REFERENCE_CODE_EXISTS");
  } else if (normalizeReferenceCode(payload.referenceCode) !== referenceCode) {
    const duplicate = await getMaidFromSupabaseNormalized(config, payload.referenceCode);
    if (duplicate) throw new Error("REFERENCE_CODE_EXISTS");
  }
  const timestamp = now2();
  const maid = {
    ...payload,
    id: existing?.id ?? await getNextNormalizedMaidRecordId(config),
    createdAt: existing?.createdAt ?? timestamp,
    updatedAt: timestamp
  };
  const table = encodeURIComponent("helped_maids");
  const response = await fetch(
    `${config.baseUrl}/rest/v1/${table}?on_conflict=app_id,record_id&select=payload`,
    {
      method: "POST",
      headers: supabaseHeaders(config, {
        "content-type": "application/json",
        prefer: "resolution=merge-duplicates,return=representation"
      }),
      body: JSON.stringify([{
        app_id: config.rowId,
        record_id: maid.id,
        agency_id: maid.agencyId,
        reference_code: maid.referenceCode,
        full_name: maid.fullName,
        status: maid.status,
        nationality: maid.nationality,
        maid_type: maid.type,
        is_public: maid.isPublic,
        has_photo: maid.hasPhoto,
        created_at: maid.createdAt,
        updated_at: maid.updatedAt,
        payload: maid
      }])
    }
  );
  if (!response.ok) {
    const details = await readSupabaseError(response);
    if (details.includes("duplicate") || details.includes("helped_maids_reference_code_idx")) {
      throw new Error("REFERENCE_CODE_EXISTS");
    }
    throw new Error(`Supabase maid write failed (${response.status}): ${details}`);
  }
  const rows = await response.json();
  return rows[0]?.payload ? normalizeMaid(rows[0].payload) : maid;
}, "upsertMaidInSupabaseNormalized");
var savePublicAtsApplicationToSupabaseNormalized = /* @__PURE__ */ __name(async (config, parsed) => {
  const { application, profile, score, documents, history, notifications } = parsed;
  await upsertSupabaseTableRows(
    config,
    "helped_ats_applications",
    [{
      app_id: config.rowId,
      record_id: application.id,
      agency_id: application.agencyId,
      profile_id: application.profileId,
      application_code: application.applicationCode,
      status: application.status,
      source: application.source,
      applied_at: application.appliedAt,
      updated_at: application.updatedAt,
      payload: application
    }],
    "app_id,record_id"
  );
  await upsertSupabaseTableRows(
    config,
    "helped_ats_profiles",
    [{
      app_id: config.rowId,
      record_id: profile.id,
      application_id: application.id,
      full_name: profile.fullName,
      email: profile.email,
      contact_number: profile.contactNumber,
      nationality: profile.nationality,
      years_of_experience: profile.yearsOfExperience,
      expected_salary: profile.expectedSalary,
      created_at: profile.createdAt,
      updated_at: profile.updatedAt,
      payload: profile
    }],
    "app_id,record_id"
  );
  await upsertSupabaseTableRows(
    config,
    "helped_ats_scores",
    [{
      app_id: config.rowId,
      application_id: application.id,
      score: score.score,
      category: score.category,
      payload: score
    }],
    "app_id,application_id"
  );
  if (history.length > 0) {
    await upsertSupabaseTableRows(
      config,
      "helped_ats_history",
      history.map((item) => ({
        app_id: config.rowId,
        record_id: item.id,
        application_id: application.id,
        to_stage: item.toStage,
        created_at: item.createdAt,
        payload: item
      })),
      "app_id,record_id"
    );
  }
  if (documents.length > 0) {
    await upsertSupabaseTableRows(
      config,
      "helped_ats_documents",
      documents.map((item) => ({
        app_id: config.rowId,
        record_id: item.id,
        application_id: application.id,
        document_type: item.type,
        file_name: item.name,
        uploaded_at: item.uploadedAt,
        file_size: item.size,
        payload: item
      })),
      "app_id,record_id"
    );
  }
  if (notifications.length > 0) {
    await upsertSupabaseTableRows(
      config,
      "helped_ats_notifications",
      notifications.map((item) => ({
        app_id: config.rowId,
        record_id: item.id,
        application_id: application.id,
        event: item.event,
        channel: item.channel,
        created_at: item.createdAt,
        payload: item
      })),
      "app_id,record_id"
    );
  }
}, "savePublicAtsApplicationToSupabaseNormalized");
var getSupabaseStorageConfig = /* @__PURE__ */ __name((env) => {
  const baseUrl = env.SUPABASE_URL?.trim().replace(/\/$/, "");
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!baseUrl || !serviceRoleKey) return null;
  return {
    baseUrl,
    serviceRoleKey,
    bucket: env.SUPABASE_STORAGE_BUCKET?.trim() || "ats-applications"
  };
}, "getSupabaseStorageConfig");
var ensureSupabaseAppDataRow = /* @__PURE__ */ __name(async (config) => {
  const table = encodeURIComponent(config.table);
  const url = `${config.baseUrl}/rest/v1/${table}?on_conflict=id`;
  const initial = defaultData();
  const response = await fetch(url, {
    method: "POST",
    headers: supabaseHeaders(config, {
      "content-type": "application/json",
      prefer: "resolution=ignore-duplicates,return=minimal"
    }),
    body: JSON.stringify([
      {
        id: config.rowId,
        data: initial
      }
    ])
  });
  if (!response.ok) {
    const details = await readSupabaseError(response);
    throw new Error(`Supabase row bootstrap failed (${response.status}): ${details}`);
  }
}, "ensureSupabaseAppDataRow");
var loadDataFromSupabase = /* @__PURE__ */ __name(async (config, options = {}) => {
  let row = await fetchSupabaseAppDataRow(config);
  if (!row) {
    await ensureSupabaseAppDataRow(config);
    row = await fetchSupabaseAppDataRow(config);
  }
  if (!row) {
    throw new Error("Supabase app_data row is missing after bootstrap");
  }
  if (options.readOnly) {
    return row.data;
  }
  return attachSupabaseTracking(row.data, row.data, row.updatedAt);
}, "loadDataFromSupabase");
var saveDataToSupabase = /* @__PURE__ */ __name(async (config, data) => {
  const table = encodeURIComponent(config.table);
  const retryDelaysMs = [100, 300, 700, 1400];
  let candidate = mergeAppData(cloneJson(data));
  let baseData = getSupabaseTrackedBase(data);
  let baseUpdatedAt = getSupabaseTrackedUpdatedAt(data);
  for (let attempt = 0; attempt <= retryDelaysMs.length; attempt += 1) {
    if (!baseUpdatedAt) {
      const latest2 = await loadDataFromSupabase(config);
      baseData = getSupabaseTrackedBase(latest2) ?? cloneJson(latest2);
      baseUpdatedAt = getSupabaseTrackedUpdatedAt(latest2);
      candidate = mergeAppDataWithBase(
        baseData,
        candidate,
        latest2
      );
    }
    if (!baseUpdatedAt) {
      throw new Error("Supabase app_data row is missing an updated_at version");
    }
    const updatedAtFilter = encodeURIComponent(baseUpdatedAt);
    const url = `${config.baseUrl}/rest/v1/${table}?id=eq.${encodeURIComponent(config.rowId)}&updated_at=eq.${updatedAtFilter}&select=updated_at`;
    const response = await fetch(url, {
      method: "PATCH",
      headers: supabaseHeaders(config, {
        "content-type": "application/json",
        prefer: "return=representation"
      }),
      body: JSON.stringify({
        data: candidate
      })
    });
    if (response.ok) {
      const rows = await response.json();
      const savedUpdatedAt = rows[0]?.updated_at;
      if (savedUpdatedAt) {
        syncAppDataInPlace(data, candidate);
        attachSupabaseTracking(data, candidate, savedUpdatedAt);
        return;
      }
    } else {
      const details = await readSupabaseError(response);
      const isRetryableTimeout = isSupabaseStatementTimeout(
        response.status,
        details
      );
      if (!isRetryableTimeout || attempt === retryDelaysMs.length) {
        throw new Error(`Supabase write failed (${response.status}): ${details}`);
      }
      await sleep2(retryDelaysMs[attempt]);
      continue;
    }
    const latest = await fetchSupabaseAppDataRow(config);
    if (!latest) {
      await ensureSupabaseAppDataRow(config);
      baseData = void 0;
      baseUpdatedAt = void 0;
    } else {
      const resolvedBase = baseData ?? latest.data;
      candidate = mergeAppDataWithBase(resolvedBase, candidate, latest.data);
      baseData = latest.data;
      baseUpdatedAt = latest.updatedAt;
    }
    if (attempt === retryDelaysMs.length) {
      throw new Error(
        "Supabase write conflict: failed to merge concurrent updates after retries"
      );
    }
    if (retryDelaysMs[attempt] > 0) {
      await sleep2(retryDelaysMs[attempt]);
    }
  }
  throw new Error("Supabase write failed unexpectedly");
}, "saveDataToSupabase");
var isKvBackend = /* @__PURE__ */ __name((env) => env.STORAGE_BACKEND?.trim().toLowerCase() === "kv", "isKvBackend");
var APP_DATA_CACHE_TTL_MS = 15e3;
var _appDataCache = null;
var getAppDataCache = /* @__PURE__ */ __name(() => {
  if (!_appDataCache) return null;
  if (Date.now() - _appDataCache.ts > APP_DATA_CACHE_TTL_MS) {
    _appDataCache = null;
    return null;
  }
  return structuredClone(_appDataCache.data);
}, "getAppDataCache");
var putAppDataCache = /* @__PURE__ */ __name((data) => {
  _appDataCache = { data: structuredClone(data), ts: Date.now() };
}, "putAppDataCache");
var bustAppDataCache = /* @__PURE__ */ __name(() => {
  _appDataCache = null;
}, "bustAppDataCache");
var loadData = /* @__PURE__ */ __name(async (env, options = {}) => {
  if (isKvBackend(env) && env.APP_DATA) {
    const hit = getAppDataCache();
    if (hit) return hit;
    const data = await loadDataFromKv(env.APP_DATA, options);
    putAppDataCache(data);
    return data;
  }
  const supabase = getSupabaseAppDataConfig(env);
  if (supabase) {
    if (isNormalizedSupabaseEnabled(env)) {
      const hit = getAppDataCache();
      if (hit) return hit;
      try {
        const data = await loadDataFromSupabaseNormalized(supabase);
        putAppDataCache(data);
        return data;
      } catch (error) {
        console.warn("Normalized Supabase load failed; falling back to app_data", error);
      }
    }
    return await loadDataFromSupabase(supabase, options);
  }
  if (!env.APP_DATA) {
    throw new Error(
      "No storage configured: set SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY, or bind APP_DATA KV."
    );
  }
  return await loadDataFromKv(env.APP_DATA, options);
}, "loadData");
var saveData = /* @__PURE__ */ __name(async (env, data) => {
  bustAppDataCache();
  if (isKvBackend(env) && env.APP_DATA) {
    await saveDataToKv(env.APP_DATA, data);
    putAppDataCache(data);
    return;
  }
  const supabase = getSupabaseAppDataConfig(env);
  if (supabase) {
    if (isNormalizedSupabaseEnabled(env)) {
      try {
        await saveDataToSupabaseNormalized(supabase, data);
        putAppDataCache(data);
        return;
      } catch (error) {
        console.warn("Normalized Supabase save failed; falling back to app_data", error);
      }
    }
    await saveDataToSupabase(supabase, data);
    return;
  }
  if (!env.APP_DATA) {
    throw new Error(
      "No storage configured: set SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY, or bind APP_DATA KV."
    );
  }
  await saveDataToKv(env.APP_DATA, data);
}, "saveData");
var AGENCY_SESSION_TTL_MS = 90 * 24 * 60 * 60 * 1e3;
var mergeAgencyAdminSessions = /* @__PURE__ */ __name((sessions) => {
  const seen = /* @__PURE__ */ new Set();
  const cutoff = Date.now() - AGENCY_SESSION_TTL_MS;
  return sessions.filter((session) => {
    if (!session?.token || seen.has(session.token)) {
      return false;
    }
    if (session.createdAt && new Date(session.createdAt).getTime() < cutoff) {
      return false;
    }
    seen.add(session.token);
    return true;
  }).map((session) => ({
    ...session,
    admin: session.admin ? {
      ...session.admin,
      agencyId: Number.isInteger(Number(session.admin.agencyId)) ? Number(session.admin.agencyId) : 1
    } : void 0
  }));
}, "mergeAgencyAdminSessions");
var getAgencyAdminSessionStoreRowId = /* @__PURE__ */ __name((config) => `${config.rowId}:agency-admin-sessions`, "getAgencyAdminSessionStoreRowId");
var getAgencyAdminAuthStoreRowId = /* @__PURE__ */ __name((config) => `${config.rowId}:agency-admin-auth`, "getAgencyAdminAuthStoreRowId");
var loadAgencyAdminSessionsFromSupabaseNormalized = /* @__PURE__ */ __name(async (config) => {
  const rows = await fetchSupabaseTableRows(config, "helped_agency_admin_sessions", {
    select: "payload",
    filters: { app_id: config.rowId },
    orderBy: "created_at.desc"
  });
  return mergeAgencyAdminSessions(
    rows.map((row) => row.payload).filter((session) => Boolean(session))
  );
}, "loadAgencyAdminSessionsFromSupabaseNormalized");
var loadAgencyAdminAuthFromSupabaseNormalized = /* @__PURE__ */ __name(async (config) => {
  const rows = await fetchSupabaseTableRows(config, "helped_agency_admins", {
    select: "payload",
    filters: { app_id: config.rowId },
    orderBy: "record_id.asc"
  });
  return rows.map((row) => row.payload).filter((admin) => Boolean(admin)).map((admin) => ({
    ...admin,
    agencyId: Number.isInteger(Number(admin.agencyId)) ? Number(admin.agencyId) : 1
  }));
}, "loadAgencyAdminAuthFromSupabaseNormalized");
var saveAgencyAdminSessionsToSupabaseNormalized = /* @__PURE__ */ __name(async (config, sessions) => {
  await deleteSupabaseTableRows(config, "helped_agency_admin_sessions", {
    app_id: config.rowId
  });
  const normalizedSessions = mergeAgencyAdminSessions(sessions);
  if (normalizedSessions.length === 0) {
    return;
  }
  await upsertSupabaseTableRows(
    config,
    "helped_agency_admin_sessions",
    normalizedSessions.map((session) => ({
      app_id: config.rowId,
      token: session.token,
      admin_id: session.adminId,
      created_at: session.createdAt,
      payload: session
    })),
    "app_id,token"
  );
}, "saveAgencyAdminSessionsToSupabaseNormalized");
var saveAgencyAdminAuthToSupabaseNormalized = /* @__PURE__ */ __name(async (config, agencyAdmins) => {
  await deleteSupabaseTableRows(config, "helped_agency_admins", {
    app_id: config.rowId
  });
  if (agencyAdmins.length === 0) {
    return;
  }
  await upsertSupabaseTableRows(
    config,
    "helped_agency_admins",
    agencyAdmins.map((admin) => ({
      app_id: config.rowId,
      record_id: admin.id,
      agency_id: admin.agencyId,
      username: admin.username,
      email: admin.email ?? null,
      supabase_user_id: admin.supabaseUserId ?? null,
      agency_name: admin.agencyName,
      created_at: admin.createdAt,
      payload: admin
    })),
    "app_id,record_id"
  );
}, "saveAgencyAdminAuthToSupabaseNormalized");
var loadAgencyAdminSessionsFromSupabase = /* @__PURE__ */ __name(async (config) => {
  const table = encodeURIComponent(config.table);
  const rowId = encodeURIComponent(getAgencyAdminSessionStoreRowId(config));
  const url = `${config.baseUrl}/rest/v1/${table}?id=eq.${rowId}&select=data&limit=1`;
  const response = await fetch(url, {
    method: "GET",
    headers: supabaseHeaders(config, { accept: "application/json" })
  });
  if (!response.ok) {
    const details = await readSupabaseError(response);
    throw new Error(
      `Supabase session read failed (${response.status}): ${details}`
    );
  }
  const rows = await response.json();
  return mergeAgencyAdminSessions(rows[0]?.data?.agencyAdminSessions ?? []);
}, "loadAgencyAdminSessionsFromSupabase");
var loadAgencyAdminAuthFromSupabase = /* @__PURE__ */ __name(async (config) => {
  const table = encodeURIComponent(config.table);
  const rowId = encodeURIComponent(getAgencyAdminAuthStoreRowId(config));
  const url = `${config.baseUrl}/rest/v1/${table}?id=eq.${rowId}&select=data&limit=1`;
  const response = await fetch(url, {
    method: "GET",
    headers: supabaseHeaders(config, { accept: "application/json" })
  });
  if (!response.ok) {
    const details = await readSupabaseError(response);
    throw new Error(
      `Supabase auth read failed (${response.status}): ${details}`
    );
  }
  const rows = await response.json();
  return (rows[0]?.data?.agencyAdmins ?? []).map((admin) => ({
    ...admin,
    agencyId: Number.isInteger(Number(admin.agencyId)) ? Number(admin.agencyId) : 1
  }));
}, "loadAgencyAdminAuthFromSupabase");
var saveAgencyAdminSessionsToSupabase = /* @__PURE__ */ __name(async (config, sessions) => {
  const table = encodeURIComponent(config.table);
  const url = `${config.baseUrl}/rest/v1/${table}?on_conflict=id`;
  const payload = [
    {
      id: getAgencyAdminSessionStoreRowId(config),
      data: { agencyAdminSessions: mergeAgencyAdminSessions(sessions) },
      updated_at: now2()
    }
  ];
  const response = await fetch(url, {
    method: "POST",
    headers: supabaseHeaders(config, {
      "content-type": "application/json",
      prefer: "resolution=merge-duplicates,return=minimal"
    }),
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    const details = await readSupabaseError(response);
    throw new Error(
      `Supabase session write failed (${response.status}): ${details}`
    );
  }
}, "saveAgencyAdminSessionsToSupabase");
var saveAgencyAdminAuthToSupabase = /* @__PURE__ */ __name(async (config, agencyAdmins) => {
  const table = encodeURIComponent(config.table);
  const url = `${config.baseUrl}/rest/v1/${table}?on_conflict=id`;
  const payload = [
    {
      id: getAgencyAdminAuthStoreRowId(config),
      data: { agencyAdmins },
      updated_at: now2()
    }
  ];
  const response = await fetch(url, {
    method: "POST",
    headers: supabaseHeaders(config, {
      "content-type": "application/json",
      prefer: "resolution=merge-duplicates,return=minimal"
    }),
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    const details = await readSupabaseError(response);
    throw new Error(
      `Supabase auth write failed (${response.status}): ${details}`
    );
  }
}, "saveAgencyAdminAuthToSupabase");
var loadAgencyAdminAuthData = /* @__PURE__ */ __name(async (env) => {
  const supabase = getSupabaseAppDataConfig(env);
  if (supabase) {
    if (isNormalizedSupabaseEnabled(env)) {
      return await loadAgencyAdminAuthFromSupabaseNormalized(supabase);
    }
    const cached = loadAgencyAdminAuthFromSupabase(supabase);
    const timeout = sleep2(1500).then(() => null);
    const cachedAdmins = await Promise.race([cached, timeout]);
    if (cachedAdmins && cachedAdmins.length > 0) {
      return cachedAdmins;
    }
    const data2 = await loadData(env);
    void saveAgencyAdminAuthToSupabase(supabase, data2.agencyAdmins).catch(
      (error) => {
        console.error("Failed to refresh agency admin auth cache:", error);
      }
    );
    return data2.agencyAdmins;
  }
  const data = await loadData(env);
  return data.agencyAdmins;
}, "loadAgencyAdminAuthData");
var SESSIONS_CACHE_TTL_MS = 3e4;
var _sessionsCache = null;
var getSessionsCache = /* @__PURE__ */ __name(() => {
  if (!_sessionsCache || Date.now() - _sessionsCache.ts > SESSIONS_CACHE_TTL_MS) {
    _sessionsCache = null;
    return null;
  }
  return _sessionsCache.sessions;
}, "getSessionsCache");
var putSessionsCache = /* @__PURE__ */ __name((sessions) => {
  _sessionsCache = { sessions, ts: Date.now() };
}, "putSessionsCache");
var bustSessionsCache = /* @__PURE__ */ __name(() => {
  _sessionsCache = null;
}, "bustSessionsCache");
var loadAgencyAdminSessions = /* @__PURE__ */ __name(async (env, fallbackData) => {
  const cached = getSessionsCache();
  if (cached) return cached;
  const supabase = getSupabaseAppDataConfig(env);
  if (supabase) {
    if (isNormalizedSupabaseEnabled(env)) {
      const sessions2 = await loadAgencyAdminSessionsFromSupabaseNormalized(supabase);
      putSessionsCache(sessions2);
      return sessions2;
    }
    const sessions = await loadAgencyAdminSessionsFromSupabase(supabase);
    if (sessions.length > 0) {
      putSessionsCache(sessions);
      return sessions;
    }
    return mergeAgencyAdminSessions(fallbackData?.agencyAdminSessions ?? []);
  }
  if (!env.APP_DATA) {
    throw new Error(
      "No storage configured: set SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY, or bind APP_DATA KV."
    );
  }
  const data = fallbackData ?? await loadData(env);
  return mergeAgencyAdminSessions(data.agencyAdminSessions);
}, "loadAgencyAdminSessions");
var saveAgencyAdminSessions = /* @__PURE__ */ __name(async (env, sessions) => {
  bustSessionsCache();
  const supabase = getSupabaseAppDataConfig(env);
  if (supabase) {
    if (isNormalizedSupabaseEnabled(env)) {
      await saveAgencyAdminSessionsToSupabaseNormalized(supabase, sessions);
      putSessionsCache(mergeAgencyAdminSessions(sessions));
      return;
    }
    await saveAgencyAdminSessionsToSupabase(supabase, sessions);
    return;
  }
  const latest = await loadData(env);
  latest.agencyAdminSessions = mergeAgencyAdminSessions(sessions);
  await saveData(env, latest);
}, "saveAgencyAdminSessions");
var createAgencyAdminSession = /* @__PURE__ */ __name(async (env, admin) => {
  const session = {
    token: crypto.randomUUID(),
    adminId: admin.id,
    admin: toSafeAgencyAdmin(admin),
    createdAt: now2()
  };
  const existing = await loadAgencyAdminSessions(env);
  await saveAgencyAdminSessions(env, [session, ...existing]);
  return session;
}, "createAgencyAdminSession");
var saveAgencyAdminChangesWithSession = /* @__PURE__ */ __name(async (env, data, session) => {
  const supabase = getSupabaseAppDataConfig(env);
  const latest = await loadData(env);
  latest.agencyAdmins = data.agencyAdmins;
  latest.counters = data.counters;
  await saveData(env, latest);
  if (supabase) {
    if (isNormalizedSupabaseEnabled(env)) {
      void saveAgencyAdminAuthToSupabaseNormalized(supabase, latest.agencyAdmins).catch(
        (error) => {
          console.error("Failed to refresh normalized agency admin cache:", error);
        }
      );
    } else {
      void saveAgencyAdminAuthToSupabase(supabase, latest.agencyAdmins).catch(
        (error) => {
          console.error("Failed to refresh agency admin auth cache:", error);
        }
      );
    }
  }
  const existingSessions = await loadAgencyAdminSessions(env, latest);
  await saveAgencyAdminSessions(env, [session, ...existingSessions]);
}, "saveAgencyAdminChangesWithSession");
var deleteAgencyAdminSession = /* @__PURE__ */ __name(async (env, token) => {
  const existing = await loadAgencyAdminSessions(env);
  await saveAgencyAdminSessions(
    env,
    existing.filter((item) => item.token !== token)
  );
}, "deleteAgencyAdminSession");
var jsonError = /* @__PURE__ */ __name((message, status = 400) => new Response(JSON.stringify({ error: message }), {
  status,
  headers: { "content-type": "application/json; charset=utf-8" }
}), "jsonError");
var safeApi = /* @__PURE__ */ __name((handler) => async (c) => {
  try {
    return await handler(c);
  } catch (error) {
    console.error("API handler error", c.req.method, c.req.path, error);
    const message = error instanceof Error ? error.message : "Internal Server Error";
    if (/rate.?limit|429/i.test(message)) return jsonError("Rate limit exceeded, please try again later", 429);
    if (/tokens per day|daily.?limit/i.test(message)) return jsonError("AI service temporarily unavailable", 503);
    return jsonError("Internal Server Error", 500);
  }
}, "safeApi");
app.onError((error, c) => {
  console.error("Unhandled API error", c.req.method, c.req.path, error);
  return jsonError("Internal Server Error", 500);
});
var parseAuthorizationToken = /* @__PURE__ */ __name((request) => {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  return authHeader.slice(7).trim() || null;
}, "parseAuthorizationToken");
var requireClientAuth = /* @__PURE__ */ __name(async (c, next) => {
  const token = parseAuthorizationToken(c.req.raw);
  if (!token) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  try {
    const data = await loadData(c.env);
    const session = data.clientSessions.find((item) => item.token === token);
    if (session) {
      if (session.expiresAt && Date.now() > new Date(session.expiresAt).getTime()) {
        return c.json({ error: "Unauthorized" }, 401);
      }
      const client2 = data.clients.find((item) => item.id === session.clientId);
      if (!client2) {
        return c.json({ error: "Unauthorized" }, 401);
      }
      c.set("client", client2);
      await next();
      return;
    }
    const supabaseUser = await getSupabaseAuthUser(c.env, token);
    if (!supabaseUser) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    const normalizedEmail = supabaseUser.email ? normalizeEmail(supabaseUser.email) : "";
    const client = data.clients.find(
      (item) => item.supabaseUserId && item.supabaseUserId === supabaseUser.id
    ) ?? (normalizedEmail ? data.clients.find(
      (item) => normalizeEmail(item.email) === normalizedEmail
    ) : null) ?? (supabaseUser.phone ? data.clients.find(
      (item) => (item.phone ?? "").trim() === supabaseUser.phone.trim()
    ) : null);
    if (client) {
      if (!client.supabaseUserId) {
        client.supabaseUserId = supabaseUser.id;
        await saveData(c.env, data);
      }
      c.set("client", client);
      await next();
      return;
    }
    const nameFromMeta = supabaseUser.user_metadata?.full_name ?? supabaseUser.user_metadata?.name ?? "";
    const companyFromMeta = supabaseUser.user_metadata?.company ?? "";
    const phoneFromMeta = supabaseUser.user_metadata?.phone ?? "";
    const created = {
      id: data.counters.clients++,
      supabaseUserId: supabaseUser.id,
      name: nameFromMeta || (supabaseUser.email ? supabaseUser.email.split("@")[0] : "Client"),
      company: companyFromMeta.trim(),
      phone: (supabaseUser.phone || phoneFromMeta).trim(),
      email: supabaseUser.email ?? "",
      password: "",
      profileImageUrl: "",
      createdAt: now2(),
      emailVerified: true
    };
    data.clients.unshift(created);
    await saveData(c.env, data);
    c.set("client", created);
    await next();
  } catch (error) {
    console.error("requireClientAuth error:", error);
    return c.json({ error: "Unauthorized" }, 401);
  }
}, "requireClientAuth");
var requireAgencyAdminAuth = /* @__PURE__ */ __name(async (c, next) => {
  const token = parseAuthorizationToken(c.req.raw);
  if (!token) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  try {
    const sessions = await loadAgencyAdminSessions(c.env);
    const session = sessions.find((item) => item.token === token);
    if (session) {
      const admin2 = session.admin ? {
        id: session.admin.id,
        agencyId: session.admin.agencyId,
        username: session.admin.username,
        email: session.admin.email ?? "",
        password: "",
        agencyName: session.admin.agencyName,
        emailVerified: session.admin.emailVerified,
        profileImageUrl: session.admin.profileImageUrl ?? "",
        createdAt: session.admin.createdAt
      } : null;
      if (admin2) {
        c.set("agencyAdmin", admin2);
        await next();
        return;
      }
      const agencyAdmins = await loadAgencyAdminAuthData(c.env);
      const matchedAdmin = agencyAdmins.find(
        (item) => item.id === session.adminId
      );
      if (!matchedAdmin) {
        return c.json({ error: "Unauthorized" }, 401);
      }
      c.set("agencyAdmin", matchedAdmin);
      await next();
      return;
    }
    const supabaseUser = await getSupabaseAuthUser(c.env, token);
    if (!supabaseUser) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    const data = await loadData(c.env);
    const normalizedEmail = supabaseUser.email ? normalizeEmail(supabaseUser.email) : "";
    const admin = data.agencyAdmins.find(
      (item) => item.supabaseUserId && item.supabaseUserId === supabaseUser.id
    ) ?? (normalizedEmail ? data.agencyAdmins.find(
      (item) => normalizeEmail(item.email ?? "") === normalizedEmail
    ) : null);
    if (!admin) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    if (!admin.supabaseUserId) {
      admin.supabaseUserId = supabaseUser.id;
      await saveData(c.env, data);
    }
    c.set("agencyAdmin", admin);
    await next();
  } catch (error) {
    console.error("requireAgencyAdminAuth error:", error);
    return c.json({ error: "Unauthorized" }, 401);
  }
}, "requireAgencyAdminAuth");
var toSafeClient = /* @__PURE__ */ __name((client) => ({
  id: client.id,
  name: client.name,
  company: client.company ?? "",
  phone: client.phone ?? "",
  email: client.email,
  emailVerified: Boolean(client.emailVerified),
  profileImageUrl: client.profileImageUrl ?? "",
  createdAt: client.createdAt
}), "toSafeClient");
var toSafeAgencyAdmin = /* @__PURE__ */ __name((admin) => ({
  id: admin.id,
  agencyId: admin.agencyId,
  username: admin.username,
  email: admin.email ?? "",
  emailVerified: Boolean(admin.emailVerified),
  agencyName: admin.agencyName,
  profileImageUrl: admin.profileImageUrl ?? "",
  createdAt: admin.createdAt
}), "toSafeAgencyAdmin");
var parseBody2 = /* @__PURE__ */ __name(async (request) => {
  try {
    return await request.json();
  } catch {
    return null;
  }
}, "parseBody");
var atsStageOrder = [
  "New Applicant",
  "Documents Submitted",
  "Resume Parsed",
  "Screening Interview",
  "Background Check",
  "Approved",
  "Ready For Client Matching",
  "Placed",
  "Rejected"
];
var publicAtsFileKinds = [
  ["resume", "resume"],
  ["passport", "passport"],
  ["workPermit", "work_permit"],
  ["medical", "medical"],
  ["introVideo", "video"],
  ["references", "reference"],
  ["otherDocuments", "other"],
  ["certificates", "certificate"]
];
var listFromDelimitedString = /* @__PURE__ */ __name((value) => Array.from(
  new Set(
    String(value ?? "").split(/\r?\n|,/).map((item) => item.trim()).filter(Boolean)
  )
), "listFromDelimitedString");
var toNumericValue = /* @__PURE__ */ __name((value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}, "toNumericValue");
var toOptionalNumber = /* @__PURE__ */ __name((value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}, "toOptionalNumber");
var toBooleanFlag = /* @__PURE__ */ __name((value) => ["true", "1", "yes", "on"].includes(
  String(value ?? "").trim().toLowerCase()
), "toBooleanFlag");
var calculateAgeFromDate = /* @__PURE__ */ __name((dateOfBirth) => {
  if (!dateOfBirth) return null;
  const dob = new Date(dateOfBirth);
  if (Number.isNaN(dob.getTime())) return null;
  const today = /* @__PURE__ */ new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || monthDiff === 0 && today.getDate() < dob.getDate()) {
    age -= 1;
  }
  return age;
}, "calculateAgeFromDate");
var randomId = /* @__PURE__ */ __name((prefix) => `${prefix}-${crypto.randomUUID()}`, "randomId");
var buildApplicationCode = /* @__PURE__ */ __name(() => `APP-${crypto.randomUUID().slice(0, 8).toUpperCase()}`, "buildApplicationCode");
var arrayBufferToBase64 = /* @__PURE__ */ __name((buffer) => {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 32768;
  let binary = "";
  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}, "arrayBufferToBase64");
var fileToDataUrl = /* @__PURE__ */ __name(async (file) => {
  const buffer = await file.arrayBuffer();
  return `data:${file.type || "application/octet-stream"};base64,${arrayBufferToBase64(buffer)}`;
}, "fileToDataUrl");
var sanitizeStoragePathSegment = /* @__PURE__ */ __name((value, fallback) => {
  const normalized = value.trim().replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  return normalized || fallback;
}, "sanitizeStoragePathSegment");
var ensuredStorageBuckets = /* @__PURE__ */ new Set();
var ensureSupabaseStorageBucket = /* @__PURE__ */ __name(async (config) => {
  if (ensuredStorageBuckets.has(config.bucket)) return;
  const response = await fetch(`${config.baseUrl}/storage/v1/bucket`, {
    method: "POST",
    headers: supabaseStorageHeaders(config, {
      "content-type": "application/json"
    }),
    body: JSON.stringify({
      id: config.bucket,
      name: config.bucket,
      public: true,
      file_size_limit: "52428800"
    })
  });
  if (!response.ok && response.status !== 409) {
    const message = await readSupabaseError(response);
    if (!message.toLowerCase().includes("duplicate")) {
      throw new Error(`Supabase storage bucket error: ${message}`);
    }
  }
  const updateResponse = await fetch(
    `${config.baseUrl}/storage/v1/bucket/${encodeURIComponent(config.bucket)}`,
    {
      method: "PUT",
      headers: supabaseStorageHeaders(config, {
        "content-type": "application/json"
      }),
      body: JSON.stringify({
        public: true,
        file_size_limit: "52428800",
        allowed_mime_types: null
      })
    }
  );
  if (!updateResponse.ok) {
    console.warn(
      `Supabase storage bucket update warning: ${await readSupabaseError(updateResponse)}`
    );
  }
  ensuredStorageBuckets.add(config.bucket);
}, "ensureSupabaseStorageBucket");
var buildSupabasePublicFileUrl = /* @__PURE__ */ __name((config, storagePath) => `${config.baseUrl}/storage/v1/object/public/${encodeURIComponent(config.bucket)}/${storagePath.split("/").map((segment) => encodeURIComponent(segment)).join("/")}`, "buildSupabasePublicFileUrl");
var uploadFileToSupabaseStorage = /* @__PURE__ */ __name(async (env, applicationId, file, kind) => {
  const config = getSupabaseStorageConfig(env);
  if (!config) return null;
  await ensureSupabaseStorageBucket(config);
  const safeName = sanitizeStoragePathSegment(file.name || `${kind}.bin`, kind);
  const storagePath = [
    "public-ats",
    applicationId,
    `${Date.now()}-${crypto.randomUUID()}-${safeName}`
  ].join("/");
  const uploadResponse = await fetch(
    `${config.baseUrl}/storage/v1/object/${encodeURIComponent(config.bucket)}/${storagePath.split("/").map((segment) => encodeURIComponent(segment)).join("/")}`,
    {
      method: "POST",
      headers: supabaseStorageHeaders(config, {
        "content-type": file.type || "application/octet-stream",
        "x-upsert": "true"
      }),
      body: await file.arrayBuffer()
    }
  );
  if (!uploadResponse.ok) {
    throw new Error(
      `Supabase storage upload failed: ${await readSupabaseError(uploadResponse)}`
    );
  }
  return {
    storagePath,
    url: buildSupabasePublicFileUrl(config, storagePath)
  };
}, "uploadFileToSupabaseStorage");
var maidMediaDataUrlPattern = /^data:([^;,]+)?(?:;charset=[^;,]+)?;base64,(.+)$/i;
var MAX_MAID_MEDIA_BYTES = 5 * 1024 * 1024;
var extensionForMimeType = /* @__PURE__ */ __name((mimeType) => {
  switch (mimeType.toLowerCase()) {
    case "image/jpeg":
      return ".jpg";
    case "image/png":
      return ".png";
    case "image/webp":
      return ".webp";
    case "image/gif":
      return ".gif";
    case "video/mp4":
      return ".mp4";
    case "video/webm":
      return ".webm";
    case "video/ogg":
      return ".ogv";
    default:
      return "";
  }
}, "extensionForMimeType");
var decodeMaidMediaDataUrl = /* @__PURE__ */ __name((value) => {
  const match2 = value.trim().match(maidMediaDataUrlPattern);
  if (!match2) return null;
  const mimeType = match2[1] || "application/octet-stream";
  const base64 = match2[2] || "";
  const estimatedBytes = Math.floor(base64.length * 3 / 4);
  if (estimatedBytes > MAX_MAID_MEDIA_BYTES) {
    throw new Error("MAID_MEDIA_TOO_LARGE");
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  if (bytes.byteLength === 0) return null;
  return { mimeType, bytes };
}, "decodeMaidMediaDataUrl");
var uploadMaidMediaToSupabaseStorage = /* @__PURE__ */ __name(async (env, value, agencyId, referenceCode, kind, index) => {
  const trimmed = value.trim();
  if (!trimmed || !trimmed.startsWith("data:")) return trimmed;
  const decoded = decodeMaidMediaDataUrl(trimmed);
  if (!decoded) return trimmed;
  const config = getSupabaseStorageConfig(env);
  if (!config) {
    console.warn("Maid media upload skipped: Supabase Storage is not configured");
    return trimmed;
  }
  await ensureSupabaseStorageBucket(config);
  const safeRef = sanitizeStoragePathSegment(referenceCode, "maid");
  const extension = extensionForMimeType(decoded.mimeType);
  const fileName = `${kind.slice(0, -1)}-${index + 1}-${Date.now()}-${crypto.randomUUID()}${extension}`;
  const storagePath = [
    "maids",
    `agency-${agencyId}`,
    safeRef,
    kind,
    fileName
  ].join("/");
  const uploadResponse = await fetch(
    `${config.baseUrl}/storage/v1/object/${encodeURIComponent(config.bucket)}/${storagePath.split("/").map((segment) => encodeURIComponent(segment)).join("/")}`,
    {
      method: "POST",
      headers: supabaseStorageHeaders(config, {
        "content-type": decoded.mimeType,
        "x-upsert": "true"
      }),
      body: decoded.bytes
    }
  );
  if (!uploadResponse.ok) {
    throw new Error(
      `Supabase storage upload failed: ${await readSupabaseError(uploadResponse)}`
    );
  }
  return buildSupabasePublicFileUrl(config, storagePath);
}, "uploadMaidMediaToSupabaseStorage");
var persistMaidMediaFields = /* @__PURE__ */ __name(async (env, maid) => {
  const normalizedPhotos = (Array.isArray(maid.photoDataUrls) && maid.photoDataUrls.length > 0 ? maid.photoDataUrls : maid.photoDataUrl ? [maid.photoDataUrl] : []).filter((item) => typeof item === "string" && item.trim().length > 0).slice(0, 5);
  const photoDataUrls = await Promise.all(
    normalizedPhotos.map(
      (photo, index) => uploadMaidMediaToSupabaseStorage(
        env,
        photo,
        maid.agencyId,
        maid.referenceCode,
        "photos",
        index
      )
    )
  );
  const videoDataUrl = typeof maid.videoDataUrl === "string" && maid.videoDataUrl.trim().startsWith("data:") ? await uploadMaidMediaToSupabaseStorage(
    env,
    maid.videoDataUrl,
    maid.agencyId,
    maid.referenceCode,
    "videos",
    0
  ) : maid.videoDataUrl?.trim() || "";
  return {
    ...maid,
    photoDataUrls,
    photoDataUrl: photoDataUrls[0] ?? "",
    videoDataUrl,
    hasPhoto: photoDataUrls.length > 0
  };
}, "persistMaidMediaFields");
var MAX_INLINE_ATS_DOCUMENT_BYTES = 256 * 1024;
var buildAtsUploadConfigError = /* @__PURE__ */ __name(() => new Error(
  "Document upload is not configured on the server. Set SUPABASE_SERVICE_ROLE_KEY in the Cloudflare Worker so ATS files can be stored."
), "buildAtsUploadConfigError");
var buildAtsUploadFailure = /* @__PURE__ */ __name((fileName) => new Error(
  `Failed to upload document "${fileName}". Check Cloudflare Worker storage configuration and Supabase storage access.`
), "buildAtsUploadFailure");
var shouldInlineAtsDocumentFallback = /* @__PURE__ */ __name((file) => file.size > 0 && file.size <= MAX_INLINE_ATS_DOCUMENT_BYTES, "shouldInlineAtsDocumentFallback");
var buildEmploymentHistoryRowsFromFormData = /* @__PURE__ */ __name((formData) => Array.from(
  {
    length: Math.max(3, toNumericValue(formData.get("employmentHistoryCount"), 0))
  },
  (_, index) => index + 1
).flatMap((row) => {
  const record = {
    from: toTrimmedString(formData.get(`employmentHistory${row}From`)),
    to: toTrimmedString(formData.get(`employmentHistory${row}To`)),
    country: toTrimmedString(formData.get(`employmentHistory${row}Country`)),
    employer: toTrimmedString(
      formData.get(`employmentHistory${row}Employer`)
    ),
    duties: toTrimmedString(formData.get(`employmentHistory${row}Duties`)),
    remarks: toTrimmedString(formData.get(`employmentHistory${row}Remarks`))
  };
  return Object.values(record).some(Boolean) ? [record] : [];
}), "buildEmploymentHistoryRowsFromFormData");
var getAtsProfileByApplicationId = /* @__PURE__ */ __name((data, applicationId) => data.ats.profiles.find((profile) => profile.applicationId === applicationId) ?? null, "getAtsProfileByApplicationId");
var toQualificationCategory = /* @__PURE__ */ __name((score) => {
  if (score >= 90) return "Excellent";
  if (score >= 75) return "Highly Recommended";
  if (score >= 60) return "Qualified";
  if (score >= 40) return "Needs Review";
  return "Not Qualified";
}, "toQualificationCategory");
var buildAtsScore = /* @__PURE__ */ __name((profile, documents) => {
  const experience = Math.min(profile.yearsOfExperience * 12, 100);
  const skillMatch = Math.min(
    profile.childcareExperience * 12 + profile.newbornCareExperience * 12 + profile.elderlyCareExperience * 12 + profile.disabledCareExperience * 12 + profile.housekeepingExperience * 12 + profile.petCareExperience * 10,
    100
  );
  const certifications = Math.min(
    (profile.certifications.length + profile.trainingRecords.length) * 20,
    100
  );
  const references = Math.min(
    documents.filter((item) => item.type === "reference").length * 50,
    100
  );
  const languageSkills = Math.min(profile.languageSkills.length * 25, 100);
  const interviewRating = profile.coverNote.trim() ? 65 : 40;
  const weightedScore = Math.round(
    experience * 0.24 + skillMatch * 0.28 + certifications * 0.14 + references * 0.1 + languageSkills * 0.14 + interviewRating * 0.1
  );
  const strengths = [];
  const weaknesses = [];
  if (profile.yearsOfExperience >= 3) strengths.push("Experienced applicant");
  if (profile.languageSkills.length >= 2) strengths.push("Speaks multiple languages");
  if (profile.childcareExperience >= 4 || profile.newbornCareExperience >= 4) {
    strengths.push("Strong childcare background");
  }
  if (profile.elderlyCareExperience >= 4) {
    strengths.push("Elderly care ready");
  }
  if (profile.cookingSkills.length >= 2) {
    strengths.push("Cooking skills listed");
  }
  if (documents.length >= 3) strengths.push("Documents mostly complete");
  if (profile.yearsOfExperience <= 1) weaknesses.push("Limited experience");
  if (profile.languageSkills.length === 0) weaknesses.push("No languages listed");
  if (!profile.availableDate) weaknesses.push("Availability not declared");
  if (documents.length === 0) weaknesses.push("No supporting documents uploaded");
  return {
    score: weightedScore,
    category: toQualificationCategory(weightedScore),
    explanation: weightedScore >= 75 ? "Good fit for recruiter shortlist based on experience, skills, and submitted documents." : weightedScore >= 50 ? "Promising application, but needs recruiter review before moving forward." : "Application needs closer review before shortlist action.",
    strengths,
    weaknesses,
    factors: {
      experience,
      skillMatch,
      certifications,
      references,
      languageSkills,
      interviewRating
    }
  };
}, "buildAtsScore");
var buildAtsProfileTags = /* @__PURE__ */ __name((profile, score) => ({
  strengthsTags: score.strengths.slice(0, 5),
  weaknessesTags: score.weaknesses.slice(0, 5),
  clientMatchScore: Math.min(
    100,
    Math.round(
      score.score * 0.7 + profile.childcareExperience * 4 + profile.elderlyCareExperience * 3 + profile.languageSkills.length * 3
    )
  )
}), "buildAtsProfileTags");
var createAtsListItem = /* @__PURE__ */ __name((application, profile, score) => {
  if (!profile) return null;
  return {
    id: application.id,
    applicationCode: application.applicationCode,
    maidReferenceCode: profile.maidReferenceCode,
    status: application.status,
    appliedAt: application.appliedAt,
    profile: {
      fullName: profile.fullName,
      email: profile.email,
      contactNumber: profile.contactNumber,
      whatsappNumber: profile.whatsappNumber,
      nationality: profile.nationality,
      age: profile.age,
      yearsOfExperience: profile.yearsOfExperience,
      expectedSalary: profile.expectedSalary,
      employmentPreference: profile.employmentPreference,
      languageSkills: profile.languageSkills,
      cookingSkills: profile.cookingSkills,
      childcareExperience: profile.childcareExperience,
      newbornCareExperience: profile.newbornCareExperience,
      elderlyCareExperience: profile.elderlyCareExperience,
      availableDate: profile.availableDate,
      strengthsTags: profile.strengthsTags,
      weaknessesTags: profile.weaknessesTags
    },
    score: score ? {
      score: score.score,
      category: score.category,
      explanation: score.explanation
    } : null,
    interview: null,
    clientMatchScore: profile.clientMatchScore
  };
}, "createAtsListItem");
var filterAtsApplications = /* @__PURE__ */ __name((items, query, filters) => items.filter((item) => {
  if (!item) return false;
  const haystack = [
    item.applicationCode,
    item.maidReferenceCode ?? "",
    item.profile.fullName,
    item.profile.email,
    item.profile.contactNumber,
    item.profile.whatsappNumber ?? "",
    item.profile.nationality,
    item.profile.languageSkills.join(" "),
    item.profile.cookingSkills.join(" "),
    item.status
  ].join(" ").toLowerCase();
  if (query && !haystack.includes(query)) return false;
  const statusFilters = Array.isArray(filters.status) ? filters.status.map((value) => String(value)) : [];
  if (statusFilters.length > 0 && !statusFilters.includes(item.status)) {
    return false;
  }
  if (filters.hasWhatsApp && !toTrimmedString(item.profile.contactNumber)) {
    return false;
  }
  if (filters.minScore !== void 0 && (item.score?.score ?? 0) < toNumericValue(filters.minScore)) {
    return false;
  }
  if (filters.minExperience !== void 0 && item.profile.yearsOfExperience < toNumericValue(filters.minExperience)) {
    return false;
  }
  if (filters.childcareExperience && item.profile.childcareExperience <= 0) {
    return false;
  }
  if (filters.elderlyCareExperience && item.profile.elderlyCareExperience <= 0) {
    return false;
  }
  if (filters.availableImmediately) {
    if (!item.profile.availableDate) return false;
    const availableDate = new Date(item.profile.availableDate);
    const boundary = /* @__PURE__ */ new Date();
    boundary.setDate(boundary.getDate() + 14);
    if (Number.isNaN(availableDate.getTime()) || availableDate.getTime() > boundary.getTime()) {
      return false;
    }
  }
  return true;
}), "filterAtsApplications");
var sortAtsApplications = /* @__PURE__ */ __name((items, sort) => {
  const [field, direction = "desc"] = sort.split(":");
  const factor = direction === "asc" ? 1 : -1;
  return [...items].sort((left, right) => {
    switch (field) {
      case "applicationDate":
        return (new Date(left.appliedAt).getTime() - new Date(right.appliedAt).getTime()) * factor;
      case "experience":
        return (left.profile.yearsOfExperience - right.profile.yearsOfExperience) * factor;
      case "clientMatchScore":
        return ((left.clientMatchScore ?? 0) - (right.clientMatchScore ?? 0)) * factor;
      case "expectedSalary":
        return ((left.profile.expectedSalary ?? Number.MAX_SAFE_INTEGER) - (right.profile.expectedSalary ?? Number.MAX_SAFE_INTEGER)) * factor;
      case "name":
        return left.profile.fullName.localeCompare(right.profile.fullName) * factor;
      case "qualificationScore":
      default:
        return ((left.score?.score ?? 0) - (right.score?.score ?? 0)) * factor;
    }
  });
}, "sortAtsApplications");
var buildAtsDashboard = /* @__PURE__ */ __name((data, agencyId) => {
  const applications = data.ats.applications.filter(
    (item) => item.agencyId === agencyId && item.source === "resume_upload"
  );
  const scores = applications.map((item) => data.ats.scores[item.id]?.score ?? 0).filter((value) => Number.isFinite(value));
  const averageQualificationScore = scores.length > 0 ? Math.round(scores.reduce((sum, value) => sum + value, 0) / scores.length) : 0;
  const approvedWithDuration = applications.filter((item) => item.status === "Approved").map((item) => {
    const approvedHistory = (data.ats.history[item.id] ?? []).find(
      (entry) => entry.toStage === "Approved"
    );
    if (!approvedHistory) return null;
    const ms = new Date(approvedHistory.createdAt).getTime() - new Date(item.appliedAt).getTime();
    return ms > 0 ? ms / (1e3 * 60 * 60 * 24) : null;
  }).filter((value) => typeof value === "number");
  return {
    totalApplicants: applications.length,
    newApplicants: applications.filter((item) => item.status === "New Applicant").length,
    interviewedCandidates: applications.filter(
      (item) => item.status === "Screening Interview"
    ).length,
    approvedCandidates: applications.filter((item) => item.status === "Approved").length,
    rejectedCandidates: applications.filter((item) => item.status === "Rejected").length,
    readyForMatching: applications.filter(
      (item) => item.status === "Ready For Client Matching"
    ).length,
    placedHelpers: applications.filter((item) => item.status === "Placed").length,
    averageQualificationScore,
    averageTimeToApprovalDays: approvedWithDuration.length > 0 ? Math.round(
      approvedWithDuration.reduce((sum, value) => sum + value, 0) / approvedWithDuration.length
    ) : 0,
    placementSuccessRate: applications.length > 0 ? Math.round(
      applications.filter((item) => item.status === "Placed").length / applications.length * 100
    ) : 0,
    funnel: atsStageOrder.map((stage) => ({
      stage,
      count: applications.filter((item) => item.status === stage).length
    }))
  };
}, "buildAtsDashboard");
var buildAtsBundle = /* @__PURE__ */ __name((data, applicationId) => {
  const application = data.ats.applications.find((item) => item.id === applicationId);
  const profile = getAtsProfileByApplicationId(data, applicationId);
  if (!application || !profile) return null;
  const score = data.ats.scores[applicationId] ?? null;
  return {
    application: {
      id: application.id,
      agencyId: application.agencyId,
      applicationCode: application.applicationCode,
      maidReferenceCode: profile.maidReferenceCode,
      status: application.status,
      appliedAt: application.appliedAt,
      aiParseSummary: application.aiParseSummary,
      profile: {
        fullName: profile.fullName,
        email: profile.email,
        contactNumber: profile.contactNumber,
        whatsappNumber: profile.whatsappNumber,
        nationality: profile.nationality,
        age: profile.age,
        yearsOfExperience: profile.yearsOfExperience,
        expectedSalary: profile.expectedSalary,
        employmentPreference: profile.employmentPreference,
        languageSkills: profile.languageSkills,
        cookingSkills: profile.cookingSkills,
        childcareExperience: profile.childcareExperience,
        newbornCareExperience: profile.newbornCareExperience,
        elderlyCareExperience: profile.elderlyCareExperience,
        availableDate: profile.availableDate,
        strengthsTags: profile.strengthsTags,
        weaknessesTags: profile.weaknessesTags
      }
    },
    profile,
    score,
    interview: null,
    backgroundCheck: null,
    history: data.ats.history[applicationId] ?? [],
    documents: (data.ats.documents[applicationId] ?? []).map((document) => ({
      id: document.id,
      type: document.type,
      name: document.name,
      url: document.url,
      status: document.status,
      required: document.required
    })),
    matches: [],
    notifications: data.ats.notifications[applicationId] ?? [],
    references: []
  };
}, "buildAtsBundle");
var buildPublicAtsSummary = /* @__PURE__ */ __name((data, applicationId, accessToken) => {
  const application = data.ats.applications.find(
    (item) => item.id === applicationId && item.applicantAccessToken === accessToken
  );
  const profile = application ? getAtsProfileByApplicationId(data, application.id) : null;
  if (!application || !profile) return null;
  return {
    application: {
      id: application.id,
      applicationCode: application.applicationCode,
      status: application.status,
      appliedAt: application.appliedAt,
      aiParseSummary: application.aiParseSummary
    },
    profile: {
      fullName: profile.fullName,
      email: profile.email,
      contactNumber: profile.contactNumber,
      nationality: profile.nationality,
      availableDate: profile.availableDate,
      expectedSalary: profile.expectedSalary
    },
    documents: data.ats.documents[applicationId] ?? [],
    history: (data.ats.history[applicationId] ?? []).map((item) => ({
      id: item.id,
      toStage: item.toStage,
      reason: item.reason,
      createdAt: item.createdAt
    })),
    notifications: data.ats.notifications[applicationId] ?? []
  };
}, "buildPublicAtsSummary");
var parseAtsFormData = /* @__PURE__ */ __name(async (env, formData) => {
  const agencyId = toNumericValue(formData.get("agencyId"), 0);
  if (!agencyId || agencyId <= 0) throw new Error("agencyId is required");
  const fullName = toTrimmedString(formData.get("fullName"));
  const email = toTrimmedString(formData.get("email"));
  const contactNumber = toTrimmedString(formData.get("contactNumber"));
  if (!fullName) throw new Error("fullName is required");
  if (!contactNumber) throw new Error("contactNumber is required");
  if (!email) throw new Error("email is required");
  const fdwFieldNames = [
    "placeOfBirth",
    "heightCm",
    "weightKg",
    "residentialAddressLine1",
    "residentialAddressLine2",
    "repatriationPort",
    "homeCountryContactNumber",
    "religion",
    "educationLevel",
    "numberOfSiblings",
    "numberOfChildren",
    "childrenAges",
    "allergies",
    "physicalDisabilities",
    "dietaryRestrictions",
    "foodPreference",
    "foodPreferenceOther",
    "restDayPreference",
    "otherRemarksA3",
    "sgInfantsChildrenAssessment",
    "sgElderlyAssessment",
    "sgDisabledAssessment",
    "sgHouseworkAssessment",
    "sgCookingAssessment",
    "sgLanguageAssessment",
    "sgOtherSkills",
    "sgOtherSkillsAssessment",
    "foreignTrainingCentreName",
    "thirdPartyCertificationDetails",
    "overseasInfantsChildrenAssessment",
    "overseasElderlyAssessment",
    "overseasDisabledAssessment",
    "overseasHouseworkAssessment",
    "overseasCookingAssessment",
    "overseasLanguageAssessment",
    "overseasOtherSkills",
    "overseasOtherSkillsAssessment",
    "feedbackEmployer1",
    "feedbackEmployer2",
    "otherRemarksE",
    "medicalConditions"
  ];
  const fdwBooleanFieldNames = [
    "workedInSingapore",
    "willingToHandleInfants",
    "willingToHandleElderly",
    "willingToHandleDisabled",
    "willingToDoHousework",
    "willingToCook"
  ];
  const fdwFormData = Object.fromEntries([
    ...fdwFieldNames.map((field) => [field, toTrimmedString(formData.get(field))]),
    ...fdwBooleanFieldNames.map((field) => [field, toBooleanFlag(formData.get(field))])
  ]);
  const applicationId = randomId("ats-app");
  const profileId = randomId("ats-profile");
  const appliedAt = now2();
  const documents = [];
  const storageConfig = getSupabaseStorageConfig(env);
  for (const [field, kind] of publicAtsFileKinds) {
    for (const entry of formData.getAll(field)) {
      if (!(entry instanceof File) || entry.size <= 0) continue;
      let uploadedAsset = null;
      if (!storageConfig) {
        if (!shouldInlineAtsDocumentFallback(entry)) {
          throw buildAtsUploadConfigError();
        }
      } else {
        try {
          uploadedAsset = await uploadFileToSupabaseStorage(
            env,
            applicationId,
            entry,
            kind
          );
        } catch (error) {
          console.error("ATS file upload failed", error);
          throw buildAtsUploadFailure(
            entry.name || `${kind}-${documents.length + 1}`
          );
        }
      }
      documents.push({
        id: randomId("doc"),
        type: kind,
        name: entry.name || `${kind}-${documents.length + 1}`,
        fileType: entry.type || "application/octet-stream",
        size: entry.size,
        url: uploadedAsset?.url ?? await fileToDataUrl(entry),
        storagePath: uploadedAsset?.storagePath,
        required: kind === "resume" || kind === "passport",
        uploadedAt: now2(),
        status: "submitted"
      });
    }
  }
  const profile = {
    id: profileId,
    applicationId,
    fullName,
    email,
    contactNumber,
    whatsappNumber: contactNumber,
    nationality: toTrimmedString(formData.get("nationality")),
    dateOfBirth: toTrimmedString(formData.get("dateOfBirth")),
    age: calculateAgeFromDate(toTrimmedString(formData.get("dateOfBirth"))),
    gender: toTrimmedString(formData.get("gender")) || "Female",
    maritalStatus: toTrimmedString(formData.get("maritalStatus")),
    address: toTrimmedString(formData.get("address")),
    yearsOfExperience: toNumericValue(formData.get("yearsOfExperience")),
    previousCountriesWorkedIn: listFromDelimitedString(
      formData.get("previousCountriesWorkedIn")
    ),
    childcareExperience: toNumericValue(formData.get("childcareExperience")),
    newbornCareExperience: toNumericValue(formData.get("newbornCareExperience")),
    elderlyCareExperience: toNumericValue(formData.get("elderlyCareExperience")),
    disabledCareExperience: toNumericValue(formData.get("disabledCareExperience")),
    housekeepingExperience: toNumericValue(formData.get("housekeepingExperience")),
    cookingSkills: listFromDelimitedString(formData.get("cookingSkills")),
    petCareExperience: toNumericValue(formData.get("petCareExperience")),
    languageSkills: listFromDelimitedString(formData.get("languageSkills")),
    certifications: listFromDelimitedString(formData.get("certifications")),
    trainingRecords: listFromDelimitedString(formData.get("trainingRecords")),
    availableDate: toTrimmedString(formData.get("availableDate")),
    expectedSalary: toOptionalNumber(formData.get("expectedSalary")),
    employmentPreference: toTrimmedString(formData.get("employmentPreference")),
    coverNote: toTrimmedString(formData.get("coverNote")),
    workHistory: buildEmploymentHistoryRowsFromFormData(formData),
    fdwFormData,
    strengthsTags: [],
    weaknessesTags: [],
    clientMatchScore: 0,
    createdAt: appliedAt,
    updatedAt: appliedAt
  };
  const score = buildAtsScore(profile, documents);
  const tags = buildAtsProfileTags(profile, score);
  profile.strengthsTags = tags.strengthsTags;
  profile.weaknessesTags = tags.weaknessesTags;
  profile.clientMatchScore = tags.clientMatchScore;
  const application = {
    id: applicationId,
    agencyId,
    profileId,
    applicationCode: buildApplicationCode(),
    applicantAccessToken: crypto.randomUUID(),
    status: documents.length > 0 ? "Documents Submitted" : "New Applicant",
    source: "resume_upload",
    appliedAt,
    updatedAt: appliedAt,
    aiParseSummary: `Public maid application received from ${fullName}.`,
    notificationLogIds: []
  };
  const history = [
    {
      id: randomId("history"),
      toStage: "New Applicant",
      actor: "Applicant",
      reason: "Application submitted from public maid application form",
      createdAt: appliedAt
    }
  ];
  if (application.status !== "New Applicant") {
    history.push({
      id: randomId("history"),
      fromStage: "New Applicant",
      toStage: application.status,
      actor: "System",
      reason: "Supporting documents uploaded during submission",
      createdAt: appliedAt
    });
  }
  const notifications = [
    {
      id: randomId("notify"),
      applicationId,
      event: "Application Received",
      channel: "internal",
      message: `${fullName} submitted a maid application.`,
      createdAt: appliedAt
    }
  ];
  return { application, profile, score, documents, history, notifications };
}, "parseAtsFormData");
var sleep2 = /* @__PURE__ */ __name((ms) => new Promise((resolve) => setTimeout(resolve, ms)), "sleep");
var sseEncoder = new TextEncoder();
var normalizeEmail = /* @__PURE__ */ __name((value) => value.trim().toLowerCase(), "normalizeEmail");
var isEmailLike = /* @__PURE__ */ __name((value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()), "isEmailLike");
var generateSixDigitCode = /* @__PURE__ */ __name(() => {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return String(buf[0] % 1e6).padStart(6, "0");
}, "generateSixDigitCode");
var sha256Hex = /* @__PURE__ */ __name(async (value) => {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}, "sha256Hex");
var hashPassword = /* @__PURE__ */ __name(async (password) => {
  const salt = Array.from(crypto.getRandomValues(new Uint8Array(16))).map((b) => b.toString(16).padStart(2, "0")).join("");
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: new TextEncoder().encode(salt), iterations: 1e5, hash: "SHA-256" },
    keyMaterial,
    256
  );
  const hash = Array.from(new Uint8Array(bits)).map((b) => b.toString(16).padStart(2, "0")).join("");
  return `pbkdf2:${salt}:${hash}`;
}, "hashPassword");
var verifyPassword = /* @__PURE__ */ __name(async (password, stored) => {
  if (!stored.startsWith("pbkdf2:")) {
    return password.trim() === stored;
  }
  const parts = stored.split(":");
  if (parts.length !== 3) return false;
  const [, salt, expectedHash] = parts;
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: new TextEncoder().encode(salt), iterations: 1e5, hash: "SHA-256" },
    keyMaterial,
    256
  );
  const hash = Array.from(new Uint8Array(bits)).map((b) => b.toString(16).padStart(2, "0")).join("");
  return hash === expectedHash;
}, "verifyPassword");
var shouldExposeDevConfirmationCode = /* @__PURE__ */ __name((env) => env.DEV_EXPOSE_CONFIRMATION_CODE?.trim().toLowerCase() === "true", "shouldExposeDevConfirmationCode");
var sendEmailViaResend = /* @__PURE__ */ __name(async (env, to, subject, text3) => {
  const apiKey = env.RESEND_API_KEY?.trim();
  const from = env.RESEND_FROM?.trim();
  if (!apiKey || !from) {
    return { ok: false, error: "RESEND_NOT_CONFIGURED" };
  }
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      from,
      to,
      subject,
      text: text3
    })
  });
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    console.error("Resend email failed", response.status, body);
    return { ok: false, error: "RESEND_FAILED" };
  }
  return { ok: true };
}, "sendEmailViaResend");
var sendConfirmationCodeEmail = /* @__PURE__ */ __name(async (env, params) => {
  const subject = params.purpose === "client" ? "Confirm your client account" : "Confirm your agency admin account";
  const text3 = params.purpose === "client" ? `Your Helped client verification code is: ${params.code}

This code expires in 15 minutes.` : `Your Helped agency admin verification code is: ${params.code}

This code expires in 15 minutes.`;
  return await sendEmailViaResend(env, params.to, subject, text3);
}, "sendConfirmationCodeEmail");
var SUPABASE_USER_CACHE_MAX = 500;
var supabaseUserCache = /* @__PURE__ */ new Map();
var getSupabaseAuthUser = /* @__PURE__ */ __name(async (env, accessToken) => {
  const cached = supabaseUserCache.get(accessToken);
  if (cached && cached.expiresAt > Date.now()) return cached.user;
  const baseUrl = env.SUPABASE_URL?.trim().replace(/\/$/, "");
  const anonKey = env.SUPABASE_ANON_KEY?.trim();
  if (!baseUrl || !anonKey) {
    console.error(
      "Supabase auth verify skipped: missing SUPABASE_URL or SUPABASE_ANON_KEY"
    );
    return null;
  }
  try {
    const response = await fetch(`${baseUrl}/auth/v1/user`, {
      headers: {
        apikey: anonKey,
        authorization: `Bearer ${accessToken}`,
        accept: "application/json"
      }
    });
    if (!response.ok) {
      let details = "";
      try {
        details = await response.text();
      } catch {
      }
      console.error("Supabase auth verify failed", {
        status: response.status,
        baseUrl,
        details: details.slice(0, 300)
      });
      return null;
    }
    const user = await response.json();
    const now3 = Date.now();
    for (const [key, entry] of supabaseUserCache) {
      if (entry.expiresAt <= now3) supabaseUserCache.delete(key);
    }
    if (supabaseUserCache.size >= SUPABASE_USER_CACHE_MAX) {
      supabaseUserCache.delete(supabaseUserCache.keys().next().value);
    }
    supabaseUserCache.set(accessToken, {
      user,
      expiresAt: Date.now() + 5 * 60 * 1e3
    });
    return user;
  } catch (error) {
    console.error("getSupabaseAuthUser fetch error:", error);
    return null;
  }
}, "getSupabaseAuthUser");
var createSseResponse = /* @__PURE__ */ __name((request, handler) => {
  const stream = new ReadableStream({
    start(controller) {
      const abortListener = /* @__PURE__ */ __name(() => controller.close(), "abortListener");
      request.signal.addEventListener("abort", abortListener, { once: true });
      handler(controller).catch((error) => {
        console.error("SSE stream error", error);
      }).finally(() => {
        request.signal.removeEventListener("abort", abortListener);
        try {
          controller.close();
        } catch {
        }
      });
    }
  });
  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
      "x-accel-buffering": "no"
    }
  });
}, "createSseResponse");
var writeSseEvent = /* @__PURE__ */ __name((controller, eventName, payload) => {
  controller.enqueue(
    sseEncoder.encode(
      `event: ${eventName}
data: ${JSON.stringify(payload)}

`
    )
  );
}, "writeSseEvent");
var writeSseComment = /* @__PURE__ */ __name((controller, comment) => {
  controller.enqueue(sseEncoder.encode(`: ${comment}

`));
}, "writeSseComment");
var csvColumns = [
  "referenceCode",
  "fullName",
  "status",
  "type",
  "nationality",
  "dateOfBirth",
  "placeOfBirth",
  "height",
  "weight",
  "religion",
  "maritalStatus",
  "numberOfChildren",
  "numberOfSiblings",
  "homeAddress",
  "airportRepatriation",
  "educationLevel",
  "languageSkills",
  "skillsPreferences",
  "workAreas",
  "employmentHistory",
  "introduction",
  "agencyContact",
  "photoDataUrl",
  "photoDataUrls",
  "videoDataUrl",
  "isPublic",
  "hasPhoto"
];
var csvObjectColumns = /* @__PURE__ */ new Set([
  "languageSkills",
  "skillsPreferences",
  "workAreas",
  "employmentHistory",
  "introduction",
  "agencyContact",
  "photoDataUrls"
]);
var serializeCsvColumnValue = /* @__PURE__ */ __name((column, maid) => {
  const value = maid[column];
  if (csvObjectColumns.has(column)) {
    return JSON.stringify(
      value ?? (column === "employmentHistory" || column === "photoDataUrls" ? [] : {})
    );
  }
  return value ?? "";
}, "serializeCsvColumnValue");
var csvEscape = /* @__PURE__ */ __name((value) => {
  const stringValue = String(value ?? "");
  if (stringValue.includes(",") || stringValue.includes('"') || stringValue.includes("\n")) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}, "csvEscape");
var normalizeCsvColumnKey = /* @__PURE__ */ __name((value) => String(value ?? "").trim().toLowerCase().replace(/^\uFEFF/, "").replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, ""), "normalizeCsvColumnKey");
var csvImportColumnAliases = {
  reference_code: "referenceCode",
  referencecode: "referenceCode",
  ref_code: "referenceCode",
  refcode: "referenceCode",
  ref: "referenceCode",
  ref_no: "referenceCode",
  reference_no: "referenceCode",
  maid_ref: "referenceCode",
  maid_reference: "referenceCode",
  maid_reference_code: "referenceCode",
  name: "fullName",
  full_name: "fullName",
  full_name_of_fdw: "fullName",
  fullname: "fullName",
  maid_name: "fullName",
  maidname: "fullName",
  fdw_name: "fullName",
  photo: "photoDataUrl",
  photo_url: "photoDataUrl",
  image: "photoDataUrl",
  image_url: "photoDataUrl",
  picture: "photoDataUrl",
  country: "nationality"
};
var normalizeCsvImportHeader = /* @__PURE__ */ __name((header) => csvImportColumnAliases[normalizeCsvColumnKey(header)] ?? header.trim().replace(/^\uFEFF/, ""), "normalizeCsvImportHeader");
var toBase64Utf8 = /* @__PURE__ */ __name((value) => {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}, "toBase64Utf8");
var parseCsvRow = /* @__PURE__ */ __name((line) => {
  const values = [];
  let current = "";
  let inQuotes = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];
    if (char === '"' && inQuotes && next === '"') {
      current += '"';
      index += 1;
      continue;
    }
    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (char === "," && !inQuotes) {
      values.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }
  values.push(current.trim());
  return values;
}, "parseCsvRow");
var parseBoolean = /* @__PURE__ */ __name((value, fallback = false) => {
  if (!value) return fallback;
  const normalized = value.trim().toLowerCase();
  return normalized === "true" || normalized === "1" || normalized === "yes";
}, "parseBoolean");
var parseNumber = /* @__PURE__ */ __name((value, fallback) => {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}, "parseNumber");
var parseJsonObject2 = /* @__PURE__ */ __name((value, fallback) => {
  if (!value?.trim()) return fallback;
  try {
    const parsed = JSON.parse(value);
    return typeof parsed === "object" && parsed && !Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}, "parseJsonObject");
var parseJsonArray = /* @__PURE__ */ __name((value, fallback) => {
  if (!value?.trim()) return fallback;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}, "parseJsonArray");
var defaultMaidProfile = {
  status: "available",
  type: "New maid",
  nationality: "Filipino maid",
  dateOfBirth: "",
  placeOfBirth: "",
  height: 150,
  weight: 50,
  religion: "Catholic",
  maritalStatus: "Single",
  numberOfChildren: 0,
  numberOfSiblings: 0,
  homeAddress: "",
  airportRepatriation: "",
  educationLevel: "High School (10-12 yrs)",
  languageSkills: { English: "Zero" },
  skillsPreferences: {},
  workAreas: {},
  employmentHistory: [],
  introduction: {},
  agencyContact: {},
  photoDataUrl: "",
  photoDataUrls: [],
  videoDataUrl: "",
  isPublic: false,
  hasPhoto: false
};
var requiredMaidFields = [
  "fullName",
  "referenceCode",
  "type",
  "nationality",
  "dateOfBirth",
  "placeOfBirth",
  "height",
  "weight",
  "religion",
  "maritalStatus",
  "numberOfChildren",
  "numberOfSiblings",
  "homeAddress",
  "airportRepatriation",
  "educationLevel",
  "languageSkills",
  "skillsPreferences",
  "workAreas",
  "employmentHistory",
  "introduction",
  "agencyContact"
];
var validateMaidPayload = /* @__PURE__ */ __name((maid) => {
  const missing = requiredMaidFields.filter(
    (field) => maid[field] === void 0
  );
  if (missing.length > 0) {
    return `Missing required fields: ${missing.join(", ")}`;
  }
  if (typeof maid.fullName !== "string" || !maid.fullName.trim() || typeof maid.referenceCode !== "string" || !maid.referenceCode.trim()) {
    return "Full name and reference code are required";
  }
  return null;
}, "validateMaidPayload");
var normalizeReferenceCode = /* @__PURE__ */ __name((value) => String(value ?? "").trim(), "normalizeReferenceCode");
var sanitizeInt = /* @__PURE__ */ __name((value) => {
  if (value === null || value === void 0) return 0;
  if (typeof value === "number" && Number.isFinite(value)) return Math.round(value);
  if (typeof value === "string") {
    const nums = value.match(/\d+/g)?.map(Number) ?? [];
    return nums.reduce((a, b) => a + b, 0);
  }
  return 0;
}, "sanitizeInt");
var toMaidRecordPayload = /* @__PURE__ */ __name((maid) => {
  const rawPhotoDataUrl = typeof maid.photoDataUrl === "string" ? maid.photoDataUrl : "";
  const photoDataUrls = Array.isArray(maid.photoDataUrls) ? maid.photoDataUrls.filter(
    (item) => typeof item === "string" && item.trim().length > 0
  ) : rawPhotoDataUrl ? [rawPhotoDataUrl] : [];
  const photoDataUrl = photoDataUrls[0] ?? rawPhotoDataUrl;
  return {
    agencyId: Number.isInteger(Number(maid.agencyId)) && Number(maid.agencyId) > 0 ? Number(maid.agencyId) : 1,
    fullName: String(maid.fullName).trim(),
    referenceCode: normalizeReferenceCode(maid.referenceCode),
    status: typeof maid.status === "string" ? maid.status : "available",
    type: String(maid.type),
    nationality: String(maid.nationality),
    dateOfBirth: String(maid.dateOfBirth),
    placeOfBirth: String(maid.placeOfBirth),
    height: sanitizeInt(maid.height),
    weight: sanitizeInt(maid.weight),
    religion: String(maid.religion),
    maritalStatus: String(maid.maritalStatus),
    numberOfChildren: sanitizeInt(maid.numberOfChildren),
    numberOfSiblings: sanitizeInt(maid.numberOfSiblings),
    homeAddress: String(maid.homeAddress),
    airportRepatriation: String(maid.airportRepatriation),
    educationLevel: String(maid.educationLevel),
    languageSkills: typeof maid.languageSkills === "object" && maid.languageSkills ? maid.languageSkills : {},
    skillsPreferences: typeof maid.skillsPreferences === "object" && maid.skillsPreferences ? maid.skillsPreferences : {},
    workAreas: typeof maid.workAreas === "object" && maid.workAreas ? maid.workAreas : {},
    employmentHistory: Array.isArray(maid.employmentHistory) ? maid.employmentHistory : [],
    introduction: typeof maid.introduction === "object" && maid.introduction ? maid.introduction : {},
    agencyContact: typeof maid.agencyContact === "object" && maid.agencyContact ? maid.agencyContact : {},
    photoDataUrls: photoDataUrls.slice(0, 5),
    photoDataUrl,
    videoDataUrl: typeof maid.videoDataUrl === "string" ? maid.videoDataUrl : "",
    isPublic: Boolean(maid.isPublic),
    hasPhoto: typeof maid.hasPhoto === "boolean" ? maid.hasPhoto : photoDataUrls.length > 0 || Boolean(photoDataUrl)
  };
}, "toMaidRecordPayload");
var applyCsvImportToData = /* @__PURE__ */ __name((data, csv) => {
  const lines = csv.replace(/\r/g, "").split("\n").map((line) => line.trim()).filter(Boolean);
  if (lines.length < 2) {
    return {
      created: 0,
      updated: 0,
      errors: ["CSV must include header and at least one row"]
    };
  }
  const headers = parseCsvRow(lines[0]).map(normalizeCsvImportHeader);
  const headerSet = new Set(headers);
  if (!headerSet.has("referenceCode") || !headerSet.has("fullName")) {
    return {
      created: 0,
      updated: 0,
      errors: ["CSV must include referenceCode and fullName columns"]
    };
  }
  let created = 0;
  let updated = 0;
  const errors = [];
  for (let lineIndex = 1; lineIndex < lines.length; lineIndex += 1) {
    const rowValues = parseCsvRow(lines[lineIndex]);
    const rowMap = Object.fromEntries(
      headers.map((header, index) => [header, rowValues[index] ?? ""])
    );
    const referenceCode = String(rowMap.referenceCode ?? "").trim();
    const fullName = String(rowMap.fullName ?? "").trim();
    if (!referenceCode || !fullName) {
      errors.push(
        `Row ${lineIndex + 1}: referenceCode and fullName are required`
      );
      continue;
    }
    const existingIndex = data.maids.findIndex(
      (maid) => maid.referenceCode === referenceCode
    );
    const existing = existingIndex === -1 ? null : data.maids[existingIndex];
    const base = existing ?? {
      ...defaultMaidProfile,
      fullName,
      referenceCode
    };
    const languageSkills = parseJsonObject2(
      rowMap.languageSkills,
      base.languageSkills
    );
    const skillsPreferences = parseJsonObject2(
      rowMap.skillsPreferences,
      base.skillsPreferences
    );
    const workAreas = parseJsonObject2(
      rowMap.workAreas,
      base.workAreas
    );
    const employmentHistory = parseJsonArray(
      rowMap.employmentHistory,
      base.employmentHistory
    );
    const introduction = parseJsonObject2(
      rowMap.introduction,
      base.introduction
    );
    const agencyContact = parseJsonObject2(
      rowMap.agencyContact,
      base.agencyContact
    );
    const photoDataUrls = parseJsonArray(
      rowMap.photoDataUrls,
      existing?.photoDataUrls ?? base.photoDataUrls
    ).filter(
      (item) => typeof item === "string" && item.trim().length > 0
    );
    const photoDataUrl = rowMap.photoDataUrl?.trim() || photoDataUrls[0] || existing?.photoDataUrl || base.photoDataUrl;
    const payload = {
      ...base,
      fullName,
      referenceCode,
      status: rowMap.status || existing?.status || base.status,
      type: rowMap.type || base.type,
      nationality: rowMap.nationality || base.nationality,
      dateOfBirth: rowMap.dateOfBirth || base.dateOfBirth,
      placeOfBirth: rowMap.placeOfBirth || base.placeOfBirth,
      height: parseNumber(rowMap.height, base.height),
      weight: parseNumber(rowMap.weight, base.weight),
      religion: rowMap.religion || base.religion,
      maritalStatus: rowMap.maritalStatus || base.maritalStatus,
      numberOfChildren: parseNumber(
        rowMap.numberOfChildren,
        base.numberOfChildren
      ),
      numberOfSiblings: parseNumber(
        rowMap.numberOfSiblings,
        base.numberOfSiblings
      ),
      homeAddress: rowMap.homeAddress || base.homeAddress,
      airportRepatriation: rowMap.airportRepatriation || base.airportRepatriation,
      educationLevel: rowMap.educationLevel || base.educationLevel,
      languageSkills,
      skillsPreferences,
      workAreas,
      employmentHistory,
      introduction,
      agencyContact,
      photoDataUrl,
      photoDataUrls,
      videoDataUrl: rowMap.videoDataUrl || existing?.videoDataUrl || base.videoDataUrl,
      isPublic: parseBoolean(String(rowMap.isPublic ?? ""), base.isPublic),
      hasPhoto: parseBoolean(
        String(rowMap.hasPhoto ?? ""),
        photoDataUrls.length > 0 || Boolean(photoDataUrl) || base.hasPhoto
      )
    };
    const recordPayload = toMaidRecordPayload(payload);
    if (existing) {
      data.maids[existingIndex] = {
        ...data.maids[existingIndex],
        ...recordPayload,
        updatedAt: now2()
      };
      updated += 1;
    } else {
      data.maids.unshift({
        ...recordPayload,
        id: data.counters.maids++,
        createdAt: now2(),
        updatedAt: now2()
      });
      created += 1;
    }
  }
  return { created, updated, errors };
}, "applyCsvImportToData");
var upsertImportedMaidProfileInData = /* @__PURE__ */ __name((data, payload) => {
  const validationError = validateMaidPayload(payload);
  if (validationError) {
    return { created: 0, updated: 0, errors: [validationError] };
  }
  const recordPayload = toMaidRecordPayload(payload);
  const referenceCode = normalizeReferenceCode(recordPayload.referenceCode);
  const index = data.maids.findIndex(
    (maid) => maid.referenceCode === referenceCode
  );
  if (index === -1) {
    data.maids.unshift({
      ...recordPayload,
      referenceCode,
      id: data.counters.maids++,
      createdAt: now2(),
      updatedAt: now2()
    });
    return { created: 1, updated: 0, errors: [] };
  }
  data.maids[index] = {
    ...data.maids[index],
    ...recordPayload,
    referenceCode,
    updatedAt: now2()
  };
  return { created: 0, updated: 1, errors: [] };
}, "upsertImportedMaidProfileInData");
var getConversationContext = /* @__PURE__ */ __name((url) => {
  const conversationType = url.searchParams.get("type") === "agency" ? "agency" : "support";
  const agencyId = conversationType === "agency" ? Number(url.searchParams.get("agencyId")) : void 0;
  const agencyName = conversationType === "agency" ? url.searchParams.get("agencyName") ?? void 0 : void 0;
  return {
    conversationType,
    agencyId: Number.isInteger(agencyId) ? agencyId : void 0,
    agencyName
  };
}, "getConversationContext");
var requestStatusSet = /* @__PURE__ */ new Set([
  "pending",
  "interested",
  "direct_hire",
  "rejected"
]);
var isRequestStatus = /* @__PURE__ */ __name((value) => requestStatusSet.has(String(value ?? "")), "isRequestStatus");
var resolveRequestActor = /* @__PURE__ */ __name(async (env, request, data) => {
  const token = parseAuthorizationToken(request);
  if (!token) return { actor: null, dataChanged: false };
  const sessions = await loadAgencyAdminSessions(env, data);
  const session = sessions.find((item) => item.token === token);
  if (session) {
    const admin2 = session.admin ? {
      id: session.admin.id,
      agencyId: session.admin.agencyId,
      username: session.admin.username,
      email: session.admin.email ?? "",
      password: "",
      agencyName: session.admin.agencyName,
      emailVerified: session.admin.emailVerified,
      profileImageUrl: session.admin.profileImageUrl ?? "",
      createdAt: session.admin.createdAt
    } : data.agencyAdmins.find((item) => item.id === session.adminId) ?? null;
    if (admin2) return { actor: { type: "admin", admin: admin2 }, dataChanged: false };
  }
  const clientSession = data.clientSessions.find((item) => item.token === token);
  if (clientSession) {
    const client2 = data.clients.find((item) => item.id === clientSession.clientId);
    if (client2) return { actor: { type: "client", client: client2 }, dataChanged: false };
  }
  const supabaseUser = await getSupabaseAuthUser(env, token);
  if (!supabaseUser) return { actor: null, dataChanged: false };
  const normalizedEmail = supabaseUser.email ? normalizeEmail(supabaseUser.email) : "";
  const admin = data.agencyAdmins.find(
    (item) => item.supabaseUserId && item.supabaseUserId === supabaseUser.id
  ) ?? (normalizedEmail ? data.agencyAdmins.find((item) => normalizeEmail(item.email ?? "") === normalizedEmail) : null);
  if (admin) {
    if (!admin.supabaseUserId) {
      admin.supabaseUserId = supabaseUser.id;
      return { actor: { type: "admin", admin }, dataChanged: true };
    }
    return { actor: { type: "admin", admin }, dataChanged: false };
  }
  let client = data.clients.find(
    (item) => item.supabaseUserId && item.supabaseUserId === supabaseUser.id
  ) ?? (normalizedEmail ? data.clients.find((item) => normalizeEmail(item.email) === normalizedEmail) : null) ?? (supabaseUser.phone ? data.clients.find((item) => (item.phone ?? "").trim() === supabaseUser.phone.trim()) : null);
  if (client) {
    if (!client.supabaseUserId) {
      client.supabaseUserId = supabaseUser.id;
      return { actor: { type: "client", client }, dataChanged: true };
    }
    return { actor: { type: "client", client }, dataChanged: false };
  }
  const nameFromMeta = supabaseUser.user_metadata?.full_name ?? supabaseUser.user_metadata?.name ?? "";
  client = {
    id: data.counters.clients++,
    supabaseUserId: supabaseUser.id,
    name: nameFromMeta || (supabaseUser.email ? supabaseUser.email.split("@")[0] : "Client"),
    company: "",
    phone: supabaseUser.phone ?? "",
    email: supabaseUser.email ?? "",
    password: "",
    profileImageUrl: "",
    createdAt: now2(),
    emailVerified: true
  };
  data.clients.unshift(client);
  return { actor: { type: "client", client }, dataChanged: true };
}, "resolveRequestActor");
var getRequestAgencyName = /* @__PURE__ */ __name((data, agencyId) => data.agencyAdmins.find((admin) => admin.agencyId === agencyId)?.agencyName || data.companyProfile.short_name || data.companyProfile.company_name || "", "getRequestAgencyName");
var requestBudget = /* @__PURE__ */ __name((details) => {
  const budget = details.budget;
  return typeof budget === "string" && budget.trim() ? budget.trim() : null;
}, "requestBudget");
var requestSummary = /* @__PURE__ */ __name((request, maids) => {
  if (request.type === "direct") {
    const firstReference = request.maidReferences[0];
    const matchedMaid = firstReference ? maids.find((maid) => maid.referenceCode === firstReference) : null;
    const label = matchedMaid?.fullName || firstReference || "Maid request";
    return `Direct request for ${label}`;
  }
  const primaryDuty = typeof request.details.primaryDuty === "string" && request.details.primaryDuty.trim() ? request.details.primaryDuty.trim() : null;
  const nationality = typeof request.details.nationality === "string" && request.details.nationality.trim() ? request.details.nationality.trim() : null;
  if (primaryDuty && nationality) return `${primaryDuty} request (${nationality})`;
  if (primaryDuty) return `${primaryDuty} request`;
  if (nationality) return `${nationality} maid request`;
  return "General maid request";
}, "requestSummary");
var buildRequestResponse = /* @__PURE__ */ __name((data, request) => {
  const client = request.clientId > 0 ? data.clients.find((item) => item.id === request.clientId) ?? null : null;
  const details = request.details ?? {};
  const fallbackClientName = toTrimmedString(
    details.clientName
  );
  const fallbackClientEmail = toTrimmedString(
    details.clientEmail
  );
  const fallbackClientPhone = toTrimmedString(
    details.clientPhone
  );
  return {
    id: request.id,
    clientId: request.clientId > 0 ? request.clientId : null,
    type: request.type,
    agencyId: request.agencyId,
    agencyName: getRequestAgencyName(data, request.agencyId),
    status: request.status,
    summary: requestSummary(request, data.maids),
    budget: requestBudget(details),
    details,
    maidReferences: request.maidReferences,
    createdAt: request.createdAt,
    updatedAt: request.updatedAt,
    updatedBy: request.updatedBy,
    client: client ? {
      id: client.id,
      name: client.name,
      company: client.company ?? "",
      phone: client.phone ?? "",
      email: client.email,
      createdAt: client.createdAt,
      profileImageUrl: client.profileImageUrl ?? ""
    } : fallbackClientName || fallbackClientEmail || fallbackClientPhone ? {
      id: 0,
      name: fallbackClientName || "Client request",
      company: "",
      phone: fallbackClientPhone,
      email: fallbackClientEmail || "No email",
      createdAt: request.createdAt,
      profileImageUrl: ""
    } : null,
    maids: request.maidReferences.map(
      (referenceCode) => data.maids.find(
        (maid) => maid.referenceCode === referenceCode && (!request.agencyId || maid.agencyId === request.agencyId)
      ) ?? data.maids.find((maid) => maid.referenceCode === referenceCode) ?? null
    ).filter((maid) => Boolean(maid)).map((maid) => ({
      referenceCode: maid.referenceCode,
      fullName: maid.fullName,
      nationality: maid.nationality,
      status: maid.status ?? "available",
      type: maid.type,
      photoDataUrl: maid.photoDataUrl
    }))
  };
}, "buildRequestResponse");
var canAccessRequest = /* @__PURE__ */ __name((actor, request) => {
  if (actor.type === "client") return request.clientId === actor.client.id;
  return request.agencyId === actor.admin.agencyId;
}, "canAccessRequest");
var ensureRequestConversation = /* @__PURE__ */ __name((data, request) => {
  const existing = data.requestConversations.find(
    (item) => item.requestId === request.id
  );
  if (existing) {
    return { conversation: existing, created: false };
  }
  const conversation = {
    id: crypto.randomUUID(),
    requestId: request.id,
    agencyId: request.agencyId,
    clientId: request.clientId,
    createdAt: now2()
  };
  data.requestConversations.unshift(conversation);
  return { conversation, created: true };
}, "ensureRequestConversation");
var getStorageMode = /* @__PURE__ */ __name((env) => {
  if (isKvBackend(env) && env.APP_DATA) return "kv";
  const hasSupabase = Boolean(getSupabaseAppDataConfig(env));
  if (hasSupabase) {
    return isNormalizedSupabaseEnabled(env) ? "supabase-normalized" : "supabase";
  }
  if (env.APP_DATA) return "kv";
  return "none";
}, "getStorageMode");
app.get(
  "/api/health",
  (c) => c.json({ status: "Server is running", storage: getStorageMode(c.env) })
);
app.get("/api/diagnostics", requireAgencyAdminAuth, (c) => {
  const config = getSupabaseAppDataConfig(c.env);
  return c.json({
    storage: getStorageMode(c.env),
    supabase: {
      enabled: Boolean(config),
      urlHost: config ? new URL(config.baseUrl).host : null,
      table: config?.table ?? null,
      rowId: config?.rowId ?? null,
      normalized: isNormalizedSupabaseEnabled(c.env),
      hasServiceRoleKey: Boolean(c.env.SUPABASE_SERVICE_ROLE_KEY?.trim())
    },
    kv: {
      enabled: Boolean(c.env.APP_DATA)
    }
  });
});
app.get("/api", (c) => c.json({ message: "Welcome to Helped Cloudflare API" }));
app.get(
  "/api/agencies",
  safeApi(async (c) => {
    const data = await loadData(c.env);
    const agencies = data.agencyAdmins.map((admin) => {
      const agencyId = Number.isInteger(Number(admin.agencyId)) ? Number(admin.agencyId) : 1;
      const agencyMaids = data.maids.filter((maid) => maid.agencyId === agencyId);
      const publicMaids = agencyMaids.filter((maid) => maid.isPublic).length;
      return {
        id: agencyId,
        name: toTrimmedString(admin.agencyName) || toTrimmedString(admin.username) || "Agency",
        email: toTrimmedString(admin.email),
        createdAt: admin.createdAt ?? now2(),
        totalMaids: agencyMaids.length,
        publicMaids
      };
    });
    const uniqueAgencies = Array.from(
      new Map(agencies.map((agency) => [agency.id, agency])).values()
    ).map((agency) => ({ ...agency, isMain: agency.id === 1 })).sort((left, right) => {
      if (left.isMain && !right.isMain) return -1;
      if (!left.isMain && right.isMain) return 1;
      if (right.publicMaids !== left.publicMaids) return right.publicMaids - left.publicMaids;
      return left.name.localeCompare(right.name);
    });
    return c.json({ agencies: uniqueAgencies });
  })
);
app.get(
  "/api/company",
  safeApi(async (c) => {
    const config = getSupabaseAppDataConfig(c.env);
    if (config) {
      const fastCompany = await tryCallSupabaseRpc(config, "get_helped_company_payload", { p_app_id: config.rowId });
      if (fastCompany) {
        return c.json(fastCompany);
      }
    }
    const data = await loadData(c.env);
    return c.json({
      companyProfile: data.companyProfile,
      momPersonnel: data.momPersonnel,
      testimonials: data.testimonials
    });
  })
);
app.get(
  "/api/company/summary",
  safeApi(async (c) => {
    const config = getSupabaseAppDataConfig(c.env);
    if (config) {
      const fastSummary = await tryCallSupabaseRpc(
        config,
        "get_helped_company_summary",
        { p_app_id: config.rowId }
      );
      if (fastSummary) {
        return c.json(fastSummary);
      }
    }
    const data = await loadData(c.env);
    const publicMaids = data.maids.filter((maid) => maid.isPublic).length;
    const hiddenMaids = data.maids.length - publicMaids;
    const maidsWithPhotos = data.maids.filter((maid) => maid.hasPhoto).length;
    const unreadAgencyChats = data.chatMessages.filter(
      (message) => message.senderRole === "client" && !message.readByAgency
    ).length;
    return c.json({
      publicMaids,
      hiddenMaids,
      totalMaids: data.maids.length,
      maidsWithPhotos,
      enquiries: data.enquiries.length,
      requests: data.directSales.length,
      pendingRequests: data.directSales.filter(
        (item) => item.status === "pending"
      ).length,
      unreadAgencyChats,
      momPersonnel: data.momPersonnel.length,
      testimonials: data.testimonials.length,
      galleryImages: data.companyProfile.gallery_image_data_urls?.length ?? 0
    });
  })
);
app.put(
  "/api/company",
  requireAgencyAdminAuth,
  safeApi(async (c) => {
    const body = await parseBody2(c.req.raw);
    if (!body) {
      return c.json({ error: "Invalid JSON body" }, 400);
    }
    const allowedFields = [
      "company_name",
      "short_name",
      "license_no",
      "address_line1",
      "address_line2",
      "postal_code",
      "country",
      "contact_person",
      "contact_phone",
      "contact_email",
      "contact_fax",
      "contact_website",
      "office_hours_regular",
      "office_hours_other",
      "social_facebook",
      "social_whatsapp_number",
      "social_whatsapp_message",
      "branding_theme_color",
      "branding_button_color",
      "about_us",
      "logo_data_url",
      "gallery_image_data_urls",
      "intro_video_data_url"
    ];
    const entries = allowedFields.filter((field) => body[field] !== void 0);
    if (entries.length === 0) {
      return c.json({ error: "No valid fields provided for update" }, 400);
    }
    const data = await loadData(c.env);
    data.companyProfile = {
      ...data.companyProfile,
      ...Object.fromEntries(entries.map((field) => [field, body[field]])),
      updated_at: now2()
    };
    await saveData(c.env, data);
    return c.json({
      message: "Company profile updated successfully",
      companyProfile: data.companyProfile
    });
  })
);
app.post(
  "/api/company/mom-personnel",
  requireAgencyAdminAuth,
  safeApi(async (c) => {
    const body = await parseBody2(c.req.raw);
    if (!body?.name?.trim() || !body.registration_number?.trim()) {
      return c.json(
        { error: "Name and registration number are required" },
        400
      );
    }
    const data = await loadData(c.env);
    const momPersonnel = {
      id: data.counters.momPersonnel++,
      company_id: 1,
      name: body.name.trim(),
      registration_number: body.registration_number.trim(),
      created_at: now2()
    };
    data.momPersonnel.push(momPersonnel);
    await saveData(c.env, data);
    return c.json(
      { message: "MOM personnel added successfully", momPersonnel },
      201
    );
  })
);
app.put(
  "/api/company/mom-personnel/:id",
  requireAgencyAdminAuth,
  safeApi(async (c) => {
    const id = Number(c.req.param("id"));
    if (!Number.isInteger(id)) {
      return c.json({ error: "Valid id is required" }, 400);
    }
    const body = await parseBody2(c.req.raw);
    if (!body || !body.name && !body.registration_number) {
      return c.json(
        {
          error: "At least one field (name or registration_number) is required"
        },
        400
      );
    }
    const data = await loadData(c.env);
    const index = data.momPersonnel.findIndex((item) => item.id === id);
    if (index === -1) {
      return c.json({ error: "MOM personnel not found" }, 404);
    }
    data.momPersonnel[index] = {
      ...data.momPersonnel[index],
      ...body.name !== void 0 ? { name: body.name } : {},
      ...body.registration_number !== void 0 ? { registration_number: body.registration_number } : {}
    };
    await saveData(c.env, data);
    return c.json({
      message: "MOM personnel updated successfully",
      momPersonnel: data.momPersonnel[index]
    });
  })
);
app.delete(
  "/api/company/mom-personnel/:id",
  requireAgencyAdminAuth,
  safeApi(async (c) => {
    const id = Number(c.req.param("id"));
    const data = await loadData(c.env);
    const existing = data.momPersonnel.find((item) => item.id === id);
    if (!existing) {
      return c.json({ error: "MOM personnel not found" }, 404);
    }
    data.momPersonnel = data.momPersonnel.filter((item) => item.id !== id);
    await saveData(c.env, data);
    return c.json({
      message: "MOM personnel deleted successfully",
      deletedMOMPersonnel: existing
    });
  })
);
app.post(
  "/api/company/testimonials",
  requireAgencyAdminAuth,
  safeApi(async (c) => {
    const body = await parseBody2(
      c.req.raw
    );
    if (!body?.message?.trim() || !body.author?.trim()) {
      return c.json({ error: "Message and author are required" }, 400);
    }
    const data = await loadData(c.env);
    const testimonial = {
      id: data.counters.testimonials++,
      company_id: 1,
      message: body.message.trim(),
      author: body.author.trim(),
      created_at: now2()
    };
    data.testimonials.unshift(testimonial);
    await saveData(c.env, data);
    return c.json(
      { message: "Testimonial added successfully", testimonial },
      201
    );
  })
);
app.delete(
  "/api/company/testimonials/:id",
  requireAgencyAdminAuth,
  safeApi(async (c) => {
    const id = Number(c.req.param("id"));
    const data = await loadData(c.env);
    const existing = data.testimonials.find((item) => item.id === id);
    if (!existing) {
      return c.json({ error: "Testimonial not found" }, 404);
    }
    data.testimonials = data.testimonials.filter((item) => item.id !== id);
    await saveData(c.env, data);
    return c.json({
      message: "Testimonial deleted successfully",
      deletedTestimonial: existing
    });
  })
);
app.get(
  "/api/maids",
  safeApi(async (c) => {
    const parsePositiveInt = /* @__PURE__ */ __name((value) => {
      if (!value) return void 0;
      const parsed = Number(value);
      return Number.isInteger(parsed) && parsed > 0 ? parsed : void 0;
    }, "parsePositiveInt");
    const search = c.req.query("search")?.trim().toLowerCase();
    const visibility = c.req.query("visibility");
    const noPhotos = c.req.query("noPhotos") === "1" || c.req.query("noPhotos") === "true";
    const agencyIdQuery = c.req.query("agencyId");
    const agencyId = agencyIdQuery && Number.isInteger(Number(agencyIdQuery)) ? Number(agencyIdQuery) : void 0;
    const page = parsePositiveInt(c.req.query("page"));
    const pageSize = parsePositiveInt(c.req.query("pageSize"));
    const offset = parsePositiveInt(c.req.query("offset")) ?? 0;
    const limit = pageSize ?? parsePositiveInt(c.req.query("limit"));
    const stripPhotos = /* @__PURE__ */ __name((list3) => noPhotos ? list3.map((m) => ({ ...m, photoDataUrl: "", photoDataUrls: [] })) : list3, "stripPhotos");
    const supabase = getSupabaseAppDataConfig(c.env);
    if (supabase) {
      const effectiveOffset2 = page != null && pageSize != null ? (page - 1) * pageSize : offset;
      try {
        const result = isNormalizedSupabaseEnabled(c.env) ? await listMaidsFromSupabaseNormalized(supabase, {
          search,
          visibility,
          agencyId,
          offset: effectiveOffset2,
          limit,
          noPhotos
        }) : await listMaidsFromSupabaseAppView(supabase, {
          search,
          visibility,
          agencyId,
          offset: effectiveOffset2,
          limit,
          noPhotos
        });
        return c.json({
          maids: stripPhotos(result.maids),
          total: result.total,
          page: page ?? 1,
          pageSize: limit ?? result.total
        });
      } catch (error) {
        console.warn("Fast maid list path failed; falling back to app data", error);
      }
    }
    const data = await loadData(c.env, { readOnly: true });
    let maids = [...data.maids];
    if (search) {
      maids = maids.filter(
        (maid) => maid.fullName.toLowerCase().includes(search) || maid.referenceCode.toLowerCase().includes(search)
      );
    }
    if (visibility === "public" || visibility === "hidden") {
      const isPublic = visibility === "public";
      maids = maids.filter((maid) => maid.isPublic === isPublic);
    }
    if (agencyId != null) {
      maids = maids.filter((maid) => maid.agencyId === agencyId);
    }
    maids.sort(
      (left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()
    );
    const total = maids.length;
    const effectiveOffset = page != null && pageSize != null ? (page - 1) * pageSize : offset;
    const pagedMaids = limit != null ? maids.slice(effectiveOffset, effectiveOffset + limit) : maids;
    return c.json({
      maids: stripPhotos(pagedMaids),
      total,
      page: page ?? 1,
      pageSize: limit ?? total
    });
  })
);
app.get(
  "/api/maids/export.csv",
  requireAgencyAdminAuth,
  safeApi(async (c) => {
    const data = await loadData(c.env);
    const rows = data.maids.map(
      (maid) => csvColumns.map((column) => serializeCsvColumnValue(column, maid)).map(csvEscape).join(",")
    );
    return new Response([csvColumns.join(","), ...rows].join("\n"), {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="maids-${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}.csv"`
      }
    });
  })
);
app.get(
  "/api/maids/export.xls",
  requireAgencyAdminAuth,
  safeApi(async (c) => {
    const data = await loadData(c.env);
    const rows = data.maids.map(
      (maid) => csvColumns.map((column) => serializeCsvColumnValue(column, maid)).map(
        (value) => String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;")
      )
    );
    const csvHeader = csvColumns.join(",");
    const csvRows = data.maids.map(
      (maid) => csvColumns.map((column) => serializeCsvColumnValue(column, maid)).map(csvEscape).join(",")
    );
    const csv = [csvHeader, ...csvRows].join("\n");
    const csvBase64 = toBase64Utf8(csv);
    const fileDate = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
    const html = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Maids Export</title>
    <style>
      body { font-family: Arial, sans-serif; color: #111827; margin: 18px; }
      h1 { font-size: 18px; margin: 0 0 10px; }
      table { width: 100%; border-collapse: collapse; }
      thead th { background: #f3f4f6; font-weight: 700; }
      th, td { border: 1px solid #d1d5db; padding: 6px 8px; text-align: left; vertical-align: top; }
      tbody tr:nth-child(even) { background: #fafafa; }
      .meta { color: #6b7280; font-size: 12px; margin-bottom: 12px; }
    </style>
  </head>
  <body>
    <!--MAIDS_CSV_BASE64:${csvBase64}-->
    <h1>Maids Export</h1>
    <div class="meta">Generated: ${fileDate}</div>
    <table>
      <thead>
        <tr>${csvColumns.map((col) => `<th>${col}</th>`).join("")}</tr>
      </thead>
      <tbody>
        ${rows.map((cells) => `<tr>${cells.map((cell) => `<td>${cell}</td>`).join("")}</tr>`).join("")}
      </tbody>
    </table>
  </body>
</html>`;
    return new Response(html, {
      headers: {
        "content-type": "application/vnd.ms-excel; charset=utf-8",
        "content-disposition": `attachment; filename="maids-${fileDate}.xls"`
      }
    });
  })
);
app.post(
  "/api/maids/import.csv",
  requireAgencyAdminAuth,
  safeApi(async (c) => {
    const body = await parseBody2(c.req.raw);
    if (!body?.csv?.trim()) {
      return c.json({ error: "CSV content is required" }, 400);
    }
    const data = await loadData(c.env);
    const { created, updated, errors } = applyCsvImportToData(data, body.csv);
    await saveData(c.env, data);
    return c.json(
      {
        message: "CSV import completed",
        created,
        updated,
        failed: errors.length,
        errors
      },
      errors.length > 0 ? 207 : 200
    );
  })
);
app.post(
  "/api/maids/import.batch",
  requireAgencyAdminAuth,
  safeApi(async (c) => {
    const body = await parseBody2(c.req.raw);
    const operations = Array.isArray(body?.operations) ? body.operations : [];
    if (operations.length === 0) {
      return c.json({ error: "At least one import operation is required" }, 400);
    }
    const data = await loadData(c.env);
    const results = [];
    let created = 0;
    let updated = 0;
    let failed = 0;
    let changed = false;
    for (const [index, operation] of operations.entries()) {
      const fileName = typeof operation.fileName === "string" && operation.fileName.trim() ? operation.fileName.trim() : `Import ${index + 1}`;
      if (operation.type === "csv") {
        if (!operation.csv?.trim()) {
          failed += 1;
          results.push({
            fileName,
            created: 0,
            updated: 0,
            failed: 1,
            errors: ["CSV content is required"]
          });
          continue;
        }
        const result = applyCsvImportToData(data, operation.csv);
        created += result.created;
        updated += result.updated;
        changed ||= result.created > 0 || result.updated > 0;
        if (result.errors.length > 0) failed += 1;
        results.push({
          fileName,
          created: result.created,
          updated: result.updated,
          failed: result.errors.length > 0 ? 1 : 0,
          errors: result.errors
        });
        continue;
      }
      if (operation.type === "profile") {
        if (!operation.payload || typeof operation.payload !== "object") {
          failed += 1;
          results.push({
            fileName,
            created: 0,
            updated: 0,
            failed: 1,
            errors: ["Maid profile payload is required"]
          });
          continue;
        }
        const result = upsertImportedMaidProfileInData(data, operation.payload);
        created += result.created;
        updated += result.updated;
        changed ||= result.created > 0 || result.updated > 0;
        if (result.errors.length > 0) failed += 1;
        results.push({
          fileName,
          created: result.created,
          updated: result.updated,
          failed: result.errors.length > 0 ? 1 : 0,
          errors: result.errors
        });
        continue;
      }
      failed += 1;
      results.push({
        fileName,
        created: 0,
        updated: 0,
        failed: 1,
        errors: ["Unsupported import operation type"]
      });
    }
    if (changed) {
      await saveData(c.env, data);
    }
    return c.json(
      {
        message: "Batch import completed",
        created,
        updated,
        failed,
        results
      },
      failed > 0 ? 207 : 200
    );
  })
);
var batchMaidPhotosFromSupabaseNormalized = /* @__PURE__ */ __name(async (config, referenceCodes) => {
  const table = encodeURIComponent("helped_maids");
  const refsFilter = referenceCodes.map((r) => normalizeReferenceCode(r)).join(",");
  const params = new URLSearchParams();
  params.set("select", "reference_code,payload");
  params.set("app_id", `eq.${config.rowId}`);
  params.set("reference_code", `in.(${refsFilter})`);
  const response = await fetch(`${config.baseUrl}/rest/v1/${table}?${params.toString()}`, {
    method: "GET",
    headers: supabaseHeaders(config, { accept: "application/json" })
  });
  if (!response.ok) throw new Error(`Batch photo fetch failed (${response.status})`);
  const rows = await response.json();
  const result = {};
  for (const row of rows) {
    if (row.reference_code) {
      result[row.reference_code] = row.payload ? normalizeMaid(row.payload).photoDataUrl ?? "" : "";
    }
  }
  return result;
}, "batchMaidPhotosFromSupabaseNormalized");
var batchMaidPhotosFromSupabaseAppView = /* @__PURE__ */ __name(async (config, referenceCodes) => {
  const table = encodeURIComponent("app_maids");
  const refsFilter = referenceCodes.map((r) => normalizeReferenceCode(r)).join(",");
  const params = new URLSearchParams();
  params.set("select", "reference_code,raw_record");
  params.set("app_id", `eq.${config.rowId}`);
  params.set("reference_code", `in.(${refsFilter})`);
  const response = await fetch(`${config.baseUrl}/rest/v1/${table}?${params.toString()}`, {
    method: "GET",
    headers: supabaseHeaders(config, { accept: "application/json" })
  });
  if (!response.ok) throw new Error(`Batch photo fetch failed (${response.status})`);
  const rows = await response.json();
  const result = {};
  for (const row of rows) {
    if (row.reference_code) {
      result[row.reference_code] = row.raw_record ? normalizeMaid(row.raw_record).photoDataUrl ?? "" : "";
    }
  }
  return result;
}, "batchMaidPhotosFromSupabaseAppView");
app.post(
  "/api/maids/photos-batch",
  requireAgencyAdminAuth,
  safeApi(async (c) => {
    const body = await parseBody2(c.req.raw);
    if (!Array.isArray(body?.refs) || body.refs.length === 0) {
      return c.json({ error: "refs array is required" }, 400);
    }
    if (body.refs.length > 100) {
      return c.json({ error: "Maximum 100 refs per batch" }, 400);
    }
    const refs = body.refs.map(String);
    const supabase = getSupabaseAppDataConfig(c.env);
    if (supabase) {
      try {
        const photos2 = isNormalizedSupabaseEnabled(c.env) ? await batchMaidPhotosFromSupabaseNormalized(supabase, refs) : await batchMaidPhotosFromSupabaseAppView(supabase, refs);
        return c.json({ photos: photos2 });
      } catch (error) {
        console.warn("Fast maid photos-batch failed; falling back to app data", error);
      }
    }
    const data = await loadData(c.env, { readOnly: true });
    const photos = {};
    for (const maid of data.maids) {
      if (refs.includes(maid.referenceCode)) {
        const primary = Array.isArray(maid.photoDataUrls) && maid.photoDataUrls[0] || maid.photoDataUrl || "";
        photos[maid.referenceCode] = primary;
      }
    }
    return c.json({ photos });
  })
);
app.get(
  "/api/maids/:referenceCode",
  safeApi(async (c) => {
    const config = getSupabaseAppDataConfig(c.env);
    if (config) {
      try {
        const maid2 = isNormalizedSupabaseEnabled(c.env) ? await getMaidFromSupabaseNormalized(config, c.req.param("referenceCode")) : await getMaidFromSupabaseAppView(config, c.req.param("referenceCode"));
        if (!maid2) {
          return c.json({ error: "Maid not found" }, 404);
        }
        return c.json({ maid: maid2 });
      } catch (error) {
        console.warn("Fast maid lookup path failed; falling back to app data", error);
      }
    }
    const data = await loadData(c.env);
    const maid = data.maids.find(
      (item) => item.referenceCode === normalizeReferenceCode(c.req.param("referenceCode"))
    );
    if (!maid) {
      return c.json({ error: "Maid not found" }, 404);
    }
    return c.json({ maid });
  })
);
app.post(
  "/api/maids",
  requireAgencyAdminAuth,
  safeApi(async (c) => {
    const body = await parseBody2(c.req.raw);
    if (!body) {
      return c.json({ error: "Invalid JSON body" }, 400);
    }
    const validationError = validateMaidPayload(body);
    if (validationError) {
      return c.json({ error: validationError }, 400);
    }
    const recordPayload = await persistMaidMediaFields(
      c.env,
      toMaidRecordPayload(body)
    );
    const config = getSupabaseAppDataConfig(c.env);
    if (config) {
      try {
        const maid2 = isNormalizedSupabaseEnabled(c.env) ? await upsertMaidInSupabaseNormalized(config, recordPayload, { create: true }) : await createMaidInSupabaseAppData(config, recordPayload);
        return c.json({ maid: maid2 }, 201);
      } catch (error) {
        if (error instanceof Error && error.message === "REFERENCE_CODE_EXISTS") {
          return c.json({ error: "Reference code already exists" }, 409);
        }
        console.warn("Fast maid create path failed; falling back to app data", error);
      }
    }
    const data = await loadData(c.env);
    if (data.maids.some((maid2) => maid2.referenceCode === recordPayload.referenceCode)) {
      return c.json({ error: "Reference code already exists" }, 409);
    }
    const maid = {
      ...recordPayload,
      id: data.counters.maids++,
      createdAt: now2(),
      updatedAt: now2()
    };
    data.maids.unshift(maid);
    await saveData(c.env, data);
    upsertMaidEmbedding(c.env, maid).catch(() => {
    });
    return c.json({ maid }, 201);
  })
);
app.put(
  "/api/maids/:referenceCode",
  requireAgencyAdminAuth,
  safeApi(async (c) => {
    const body = await parseBody2(c.req.raw);
    if (!body) {
      return c.json({ error: "Invalid JSON body" }, 400);
    }
    const validationError = validateMaidPayload(body);
    if (validationError) {
      return c.json({ error: validationError }, 400);
    }
    const referenceCode = normalizeReferenceCode(c.req.param("referenceCode"));
    const config = getSupabaseAppDataConfig(c.env);
    if (config) {
      try {
        const existing = isNormalizedSupabaseEnabled(c.env) ? await getMaidFromSupabaseNormalized(config, referenceCode) : null;
        const payload2 = await persistMaidMediaFields(
          c.env,
          toMaidRecordPayload({
            ...existing ?? {},
            ...body,
            status: body.status !== void 0 ? body.status : existing?.status,
            photoDataUrl: body.photoDataUrl !== void 0 ? body.photoDataUrl : existing?.photoDataUrl,
            photoDataUrls: Array.isArray(body.photoDataUrls) ? body.photoDataUrls : existing?.photoDataUrls,
            videoDataUrl: body.videoDataUrl !== void 0 ? body.videoDataUrl : existing?.videoDataUrl
          })
        );
        const maid = isNormalizedSupabaseEnabled(c.env) ? await upsertMaidInSupabaseNormalized(config, payload2, { create: false, referenceCode }) : await updateMaidInSupabaseAppData(config, referenceCode, payload2);
        if (!maid) {
          return c.json({ error: "Maid not found" }, 404);
        }
        return c.json({ maid });
      } catch (error) {
        if (error instanceof Error && error.message === "REFERENCE_CODE_EXISTS") {
          return c.json({ error: "Reference code already exists" }, 409);
        }
        console.warn("Fast maid update path failed; falling back to app data", error);
      }
    }
    const data = await loadData(c.env);
    const index = data.maids.findIndex(
      (maid) => maid.referenceCode === referenceCode
    );
    if (index === -1) {
      return c.json({ error: "Maid not found" }, 404);
    }
    const payload = await persistMaidMediaFields(
      c.env,
      toMaidRecordPayload({
        ...data.maids[index],
        ...body,
        status: body.status !== void 0 ? body.status : data.maids[index].status,
        photoDataUrl: body.photoDataUrl !== void 0 ? body.photoDataUrl : data.maids[index].photoDataUrl,
        photoDataUrls: Array.isArray(body.photoDataUrls) ? body.photoDataUrls : data.maids[index].photoDataUrls,
        videoDataUrl: body.videoDataUrl !== void 0 ? body.videoDataUrl : data.maids[index].videoDataUrl
      })
    );
    const duplicate = data.maids.find(
      (maid) => maid.referenceCode === payload.referenceCode && maid.referenceCode !== referenceCode
    );
    if (duplicate) {
      return c.json({ error: "Reference code already exists" }, 409);
    }
    data.maids[index] = {
      ...data.maids[index],
      ...payload,
      updatedAt: now2()
    };
    await saveData(c.env, data);
    upsertMaidEmbedding(c.env, data.maids[index]).catch(() => {
    });
    return c.json({ maid: data.maids[index] });
  })
);
app.patch(
  "/api/maids/:referenceCode/bring-to-top",
  requireAgencyAdminAuth,
  safeApi(async (c) => {
    const referenceCode = normalizeReferenceCode(c.req.param("referenceCode"));
    const config = getSupabaseAppDataConfig(c.env);
    if (config) {
      try {
        if (isNormalizedSupabaseEnabled(c.env)) {
          const existing2 = await getMaidFromSupabaseNormalized(config, referenceCode);
          if (!existing2) {
            return c.json({ error: "Maid not found" }, 404);
          }
          const { id: _id2, createdAt: _createdAt2, updatedAt: _updatedAt2, ...payload2 } = existing2;
          const maid2 = await upsertMaidInSupabaseNormalized(config, payload2, {
            create: false,
            referenceCode
          });
          if (!maid2) {
            return c.json({ error: "Maid not found" }, 404);
          }
          return c.json({ maid: maid2 });
        }
        const existing = await getMaidFromSupabaseAppView(config, referenceCode);
        if (!existing) {
          return c.json({ error: "Maid not found" }, 404);
        }
        const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, ...payload } = existing;
        const maid = await updateMaidInSupabaseAppData(config, referenceCode, payload);
        if (!maid) {
          return c.json({ error: "Maid not found" }, 404);
        }
        return c.json({ maid });
      } catch (error) {
        console.warn("Fast maid bring-to-top path failed; falling back to app data", error);
      }
    }
    const data = await loadData(c.env);
    const index = data.maids.findIndex(
      (maid) => maid.referenceCode === referenceCode
    );
    if (index === -1) {
      return c.json({ error: "Maid not found" }, 404);
    }
    data.maids[index] = {
      ...data.maids[index],
      updatedAt: now2()
    };
    await saveData(c.env, data);
    return c.json({ maid: data.maids[index] });
  })
);
app.patch(
  "/api/maids/:referenceCode/visibility",
  requireAgencyAdminAuth,
  safeApi(async (c) => {
    const body = await parseBody2(c.req.raw);
    if (typeof body?.isPublic !== "boolean") {
      return c.json({ error: "isPublic boolean is required" }, 400);
    }
    const config = getSupabaseAppDataConfig(c.env);
    if (config) {
      try {
        const maid = isNormalizedSupabaseEnabled(c.env) ? await updateMaidVisibilityInSupabaseNormalized(
          config,
          c.req.param("referenceCode"),
          body.isPublic
        ) : await updateMaidVisibilityInSupabaseAppData(
          config,
          c.req.param("referenceCode"),
          body.isPublic
        );
        if (!maid) {
          return c.json({ error: "Maid not found" }, 404);
        }
        return c.json({ maid });
      } catch (error) {
        console.warn("Fast maid visibility path failed; falling back to app data", error);
      }
    }
    const data = await loadData(c.env);
    const index = data.maids.findIndex(
      (maid) => maid.referenceCode === normalizeReferenceCode(c.req.param("referenceCode"))
    );
    if (index === -1) {
      return c.json({ error: "Maid not found" }, 404);
    }
    data.maids[index] = {
      ...data.maids[index],
      isPublic: body.isPublic,
      updatedAt: now2()
    };
    await saveData(c.env, data);
    return c.json({ maid: data.maids[index] });
  })
);
app.patch(
  "/api/maids/:referenceCode/photo",
  requireAgencyAdminAuth,
  safeApi(async (c) => {
    const body = await parseBody2(c.req.raw);
    if (typeof body?.photoDataUrl !== "string") {
      return c.json({ error: "photoDataUrl string is required" }, 400);
    }
    const referenceCode = normalizeReferenceCode(c.req.param("referenceCode"));
    const config = getSupabaseAppDataConfig(c.env);
    if (config && isNormalizedSupabaseEnabled(c.env)) {
      try {
        const existing = await getMaidFromSupabaseNormalized(config, referenceCode);
        if (!existing) {
          return c.json({ error: "Maid not found" }, 404);
        }
        const photoDataUrl2 = await uploadMaidMediaToSupabaseStorage(
          c.env,
          body.photoDataUrl,
          existing.agencyId,
          existing.referenceCode,
          "photos",
          0
        );
        const maid = await updateMaidMediaInSupabaseNormalized(
          config,
          referenceCode,
          {
            photoDataUrl: photoDataUrl2,
            photoDataUrls: photoDataUrl2 ? [photoDataUrl2] : [],
            hasPhoto: Boolean(photoDataUrl2),
            videoDataUrl: existing.videoDataUrl
          }
        );
        return c.json({ maid });
      } catch (error) {
        console.warn("Fast maid photo path failed; falling back to app data", error);
      }
    }
    const data = await loadData(c.env);
    const index = data.maids.findIndex(
      (maid) => maid.referenceCode === referenceCode
    );
    if (index === -1) {
      return c.json({ error: "Maid not found" }, 404);
    }
    const photoDataUrl = await uploadMaidMediaToSupabaseStorage(
      c.env,
      body.photoDataUrl,
      data.maids[index].agencyId,
      data.maids[index].referenceCode,
      "photos",
      0
    );
    data.maids[index] = {
      ...data.maids[index],
      photoDataUrl,
      photoDataUrls: photoDataUrl ? [photoDataUrl] : [],
      hasPhoto: Boolean(photoDataUrl),
      updatedAt: now2()
    };
    await saveData(c.env, data);
    return c.json({ maid: data.maids[index] });
  })
);
app.patch(
  "/api/maids/:referenceCode/photos",
  requireAgencyAdminAuth,
  safeApi(async (c) => {
    const body = await parseBody2(c.req.raw);
    if (typeof body?.photoDataUrl !== "string" || !body.photoDataUrl.trim()) {
      return c.json({ error: "photoDataUrl string is required" }, 400);
    }
    const referenceCode = normalizeReferenceCode(c.req.param("referenceCode"));
    const config = getSupabaseAppDataConfig(c.env);
    if (config && isNormalizedSupabaseEnabled(c.env)) {
      try {
        const existing = await getMaidFromSupabaseNormalized(config, referenceCode);
        if (!existing) {
          return c.json({ error: "Maid not found" }, 404);
        }
        const photos2 = Array.isArray(existing.photoDataUrls) ? [...existing.photoDataUrls] : existing.photoDataUrl ? [existing.photoDataUrl] : [];
        if (photos2.length >= 5) {
          return c.json({ error: "Maximum 5 photos allowed per maid" }, 400);
        }
        photos2.push(
          await uploadMaidMediaToSupabaseStorage(
            c.env,
            body.photoDataUrl,
            existing.agencyId,
            existing.referenceCode,
            "photos",
            photos2.length
          )
        );
        const maid = await updateMaidMediaInSupabaseNormalized(
          config,
          referenceCode,
          {
            photoDataUrl: photos2[0] ?? "",
            photoDataUrls: photos2,
            hasPhoto: photos2.length > 0,
            videoDataUrl: existing.videoDataUrl
          }
        );
        return c.json({ maid });
      } catch (error) {
        console.warn("Fast maid photos path failed; falling back to app data", error);
      }
    }
    const data = await loadData(c.env);
    const index = data.maids.findIndex(
      (maid) => maid.referenceCode === referenceCode
    );
    if (index === -1) {
      return c.json({ error: "Maid not found" }, 404);
    }
    const photos = Array.isArray(data.maids[index].photoDataUrls) ? [...data.maids[index].photoDataUrls] : data.maids[index].photoDataUrl ? [data.maids[index].photoDataUrl] : [];
    if (photos.length >= 5) {
      return c.json({ error: "Maximum 5 photos allowed per maid" }, 400);
    }
    photos.push(
      await uploadMaidMediaToSupabaseStorage(
        c.env,
        body.photoDataUrl,
        data.maids[index].agencyId,
        data.maids[index].referenceCode,
        "photos",
        photos.length
      )
    );
    data.maids[index] = {
      ...data.maids[index],
      photoDataUrls: photos,
      photoDataUrl: photos[0] ?? "",
      hasPhoto: photos.length > 0,
      updatedAt: now2()
    };
    await saveData(c.env, data);
    return c.json({ maid: data.maids[index] });
  })
);
app.put(
  "/api/maids/:referenceCode/photo-gallery",
  requireAgencyAdminAuth,
  safeApi(async (c) => {
    const body = await parseBody2(c.req.raw);
    if (!Array.isArray(body?.photoDataUrls)) {
      return c.json({ error: "photoDataUrls array is required" }, 400);
    }
    const referenceCode = normalizeReferenceCode(c.req.param("referenceCode"));
    const config = getSupabaseAppDataConfig(c.env);
    if (config && isNormalizedSupabaseEnabled(c.env)) {
      try {
        const existing = await getMaidFromSupabaseNormalized(config, referenceCode);
        if (!existing) {
          return c.json({ error: "Maid not found" }, 404);
        }
        const incomingPhotos2 = body.photoDataUrls.filter((item) => typeof item === "string" && item.trim().length > 0).slice(0, 5);
        const photoDataUrls2 = await Promise.all(
          incomingPhotos2.map(
            (photo, photoIndex) => uploadMaidMediaToSupabaseStorage(
              c.env,
              photo,
              existing.agencyId,
              existing.referenceCode,
              "photos",
              photoIndex
            )
          )
        );
        const maid = await updateMaidMediaInSupabaseNormalized(
          config,
          referenceCode,
          {
            photoDataUrl: photoDataUrls2[0] ?? "",
            photoDataUrls: photoDataUrls2,
            hasPhoto: photoDataUrls2.length > 0,
            videoDataUrl: existing.videoDataUrl
          }
        );
        return c.json({ maid });
      } catch (error) {
        console.warn("Fast maid photo gallery path failed; falling back to app data", error);
      }
    }
    const data = await loadData(c.env);
    const index = data.maids.findIndex(
      (maid) => maid.referenceCode === referenceCode
    );
    if (index === -1) {
      return c.json({ error: "Maid not found" }, 404);
    }
    const incomingPhotos = body.photoDataUrls.filter((item) => typeof item === "string" && item.trim().length > 0).slice(0, 5);
    const photoDataUrls = await Promise.all(
      incomingPhotos.map(
        (photo, photoIndex) => uploadMaidMediaToSupabaseStorage(
          c.env,
          photo,
          data.maids[index].agencyId,
          data.maids[index].referenceCode,
          "photos",
          photoIndex
        )
      )
    );
    data.maids[index] = {
      ...data.maids[index],
      photoDataUrls,
      photoDataUrl: photoDataUrls[0] ?? "",
      hasPhoto: photoDataUrls.length > 0,
      updatedAt: now2()
    };
    await saveData(c.env, data);
    return c.json({ maid: data.maids[index] });
  })
);
app.patch(
  "/api/maids/:referenceCode/video",
  requireAgencyAdminAuth,
  safeApi(async (c) => {
    const body = await parseBody2(c.req.raw);
    if (typeof body?.videoDataUrl !== "string") {
      return c.json({ error: "videoDataUrl string is required" }, 400);
    }
    const referenceCode = normalizeReferenceCode(c.req.param("referenceCode"));
    const config = getSupabaseAppDataConfig(c.env);
    if (config && isNormalizedSupabaseEnabled(c.env)) {
      try {
        const existing = await getMaidFromSupabaseNormalized(config, referenceCode);
        if (!existing) {
          return c.json({ error: "Maid not found" }, 404);
        }
        const videoDataUrl2 = await uploadMaidMediaToSupabaseStorage(
          c.env,
          body.videoDataUrl,
          existing.agencyId,
          existing.referenceCode,
          "videos",
          0
        );
        const maid = await updateMaidMediaInSupabaseNormalized(
          config,
          referenceCode,
          {
            photoDataUrl: existing.photoDataUrl,
            photoDataUrls: existing.photoDataUrls,
            hasPhoto: existing.hasPhoto,
            videoDataUrl: videoDataUrl2
          }
        );
        return c.json({ maid });
      } catch (error) {
        console.warn("Fast maid video path failed; falling back to app data", error);
      }
    }
    const data = await loadData(c.env);
    const index = data.maids.findIndex(
      (maid) => maid.referenceCode === referenceCode
    );
    if (index === -1) {
      return c.json({ error: "Maid not found" }, 404);
    }
    const videoDataUrl = await uploadMaidMediaToSupabaseStorage(
      c.env,
      body.videoDataUrl,
      data.maids[index].agencyId,
      data.maids[index].referenceCode,
      "videos",
      0
    );
    data.maids[index] = {
      ...data.maids[index],
      videoDataUrl,
      updatedAt: now2()
    };
    await saveData(c.env, data);
    return c.json({ maid: data.maids[index] });
  })
);
app.delete(
  "/api/maids/:referenceCode",
  requireAgencyAdminAuth,
  safeApi(async (c) => {
    const data = await loadData(c.env);
    const referenceCode = normalizeReferenceCode(c.req.param("referenceCode"));
    const existing = data.maids.find(
      (maid) => maid.referenceCode === referenceCode
    );
    if (!existing) {
      return c.json({ error: "Maid not found" }, 404);
    }
    data.maids = data.maids.filter(
      (maid) => maid.referenceCode !== referenceCode
    );
    await saveData(c.env, data);
    return c.json({ message: "Maid deleted successfully" });
  })
);
var compareReferenceCodes = /* @__PURE__ */ __name((left, right) => String(left ?? "").localeCompare(String(right ?? ""), void 0, {
  numeric: true,
  sensitivity: "base"
}), "compareReferenceCodes");
app.get(
  "/api/employers",
  safeApi(async (c) => {
    const data = await loadData(c.env);
    const employers = [...data.employers].sort(
      (left, right) => compareReferenceCodes(left.refCode, right.refCode)
    );
    return c.json({ employers });
  })
);
app.get(
  "/api/employers/:refCode",
  safeApi(async (c) => {
    const data = await loadData(c.env);
    const refCode = toTrimmedString(c.req.param("refCode"));
    const employer = data.employers.find((item) => item.refCode === refCode) ?? null;
    if (!employer) {
      return c.json({ error: "Employer not found" }, 404);
    }
    return c.json({ employer });
  })
);
app.post(
  "/api/employers",
  requireAgencyAdminAuth,
  safeApi(async (c) => {
    const body = await parseBody2(c.req.raw);
    if (!body) {
      return c.json({ error: "Invalid JSON body" }, 400);
    }
    const employerPayload = body.employer && typeof body.employer === "object" ? body.employer : {};
    const agencyPayload = body.agency && typeof body.agency === "object" ? body.agency : {};
    const maidPayload = body.maid && typeof body.maid === "object" ? body.maid : {};
    const employerName = toTrimmedString(
      employerPayload.name
    );
    if (!employerName) {
      return c.json({ error: "employer.name is required" }, 400);
    }
    const data = await loadData(c.env);
    const existingRefCode = toTrimmedString(body.existingRefCode);
    const incomingRef = toTrimmedString(body.refCode) || toTrimmedString(
      agencyPayload.caseReferenceNumber
    );
    const existingIndex = existingRefCode ? data.employers.findIndex((item) => item.refCode === existingRefCode) : incomingRef ? data.employers.findIndex((item) => item.refCode === incomingRef) : -1;
    if (incomingRef && existingRefCode && incomingRef !== existingRefCode && data.employers.some(
      (item, index) => item.refCode === incomingRef && index !== existingIndex
    )) {
      return c.json({ error: "Reference number already in use" }, 409);
    }
    const id = existingIndex === -1 ? data.counters.employers++ : data.employers[existingIndex].id;
    const refCode = incomingRef || formatEmployerRefCode(id);
    const normalizedAgency = {
      ...agencyPayload,
      caseReferenceNumber: toTrimmedString(
        agencyPayload.caseReferenceNumber
      ) || refCode
    };
    const employerRecord = {
      id,
      refCode,
      maid: maidPayload,
      agency: normalizedAgency,
      employer: employerPayload,
      spouse: body.spouse && typeof body.spouse === "object" ? body.spouse : {},
      familyMembers: Array.isArray(body.familyMembers) ? body.familyMembers : [],
      notificationDate: body.notificationDate && typeof body.notificationDate === "object" ? body.notificationDate : {},
      documents: Array.isArray(body.documents) ? body.documents.map((document) => ({
        category: toTrimmedString(document.category),
        fileUrl: toTrimmedString(document.fileUrl),
        fileName: toTrimmedString(document.fileName)
      })).filter(
        (document) => document.category && document.fileUrl && document.fileName
      ) : [],
      createdAt: existingIndex === -1 ? now2() : data.employers[existingIndex].createdAt,
      updatedAt: now2()
    };
    if (existingIndex === -1) {
      data.employers.unshift(employerRecord);
    } else {
      data.employers[existingIndex] = employerRecord;
    }
    const existingEmploymentContractIndex = data.employmentContracts.findIndex(
      (item) => item.refCode === existingRefCode || item.employerRefCode === existingRefCode || item.refCode === refCode || item.employerRefCode === refCode
    );
    const employmentContractId = existingEmploymentContractIndex === -1 ? data.counters.employmentContracts++ : data.employmentContracts[existingEmploymentContractIndex].id;
    const employmentContractRecord = normalizeEmploymentContractRecord(
      {
        id: employmentContractId,
        refCode,
        employerRefCode: refCode,
        employerId: id,
        maidId: toNullableNumber(maidPayload.id) ?? toNullableNumber(maidPayload.maidId),
        maidReferenceCode: toTrimmedString(
          maidPayload.referenceCode
        ),
        maidName: toTrimmedString(maidPayload.fullName) || toTrimmedString(maidPayload.name),
        employerName,
        caseReferenceNumber: toTrimmedString(
          normalizedAgency.caseReferenceNumber
        ),
        contractDate: toTrimmedString(
          normalizedAgency.contractDate
        ),
        serviceFee: toTrimmedString(
          normalizedAgency.serviceFee
        ),
        placementFee: toTrimmedString(
          normalizedAgency.placementFee
        ),
        agencyWitness: toTrimmedString(
          normalizedAgency.agencyWitness
        ),
        employerSnapshot: employerPayload,
        maidSnapshot: maidPayload,
        createdAt: existingEmploymentContractIndex === -1 ? now2() : data.employmentContracts[existingEmploymentContractIndex].createdAt,
        updatedAt: now2()
      },
      refCode
    );
    if (existingEmploymentContractIndex === -1) {
      data.employmentContracts.unshift(employmentContractRecord);
    } else {
      data.employmentContracts[existingEmploymentContractIndex] = employmentContractRecord;
    }
    await saveData(c.env, data);
    return c.json({
      employer: employerRecord,
      employmentContract: {
        refCode: employerRecord.refCode,
        caseReferenceNumber: toTrimmedString(
          employerRecord.agency.caseReferenceNumber
        ),
        contractDate: toTrimmedString(
          employerRecord.agency.contractDate
        ),
        serviceFee: toTrimmedString(
          employerRecord.agency.serviceFee
        ),
        placementFee: toTrimmedString(
          employerRecord.agency.placementFee
        ),
        agencyWitness: toTrimmedString(
          employerRecord.agency.agencyWitness
        )
      }
    });
  })
);
app.post(
  "/api/employment-contract",
  requireAgencyAdminAuth,
  safeApi(async (c) => {
    const request = new Request(new URL("/api/employers", c.req.url), {
      method: "POST",
      headers: c.req.raw.headers,
      body: await c.req.raw.clone().text()
    });
    return app.fetch(request, c.env);
  })
);
app.post(
  "/api/employer-files",
  requireAgencyAdminAuth,
  safeApi(async (c) => {
    const storageConfig = getSupabaseStorageConfig(c.env);
    if (!storageConfig) {
      return c.json({ error: "File storage not configured (SUPABASE_SERVICE_ROLE_KEY required)" }, 503);
    }
    const formData = await c.req.raw.formData().catch(() => null);
    if (!formData) return c.json({ error: "Multipart form data is required" }, 400);
    await ensureSupabaseStorageBucket(storageConfig);
    const uploaded = [];
    for (const [, value] of formData.entries()) {
      if (!(value instanceof File)) continue;
      const ext = value.name.split(".").pop() ?? "bin";
      const key = `contracts/${Date.now()}-${crypto.randomUUID()}.${ext}`;
      const uploadResp = await fetch(
        `${storageConfig.baseUrl}/storage/v1/object/${encodeURIComponent(storageConfig.bucket)}/${key}`,
        {
          method: "POST",
          headers: {
            apikey: storageConfig.serviceRoleKey,
            authorization: `Bearer ${storageConfig.serviceRoleKey}`,
            "content-type": value.type || "application/octet-stream",
            "x-upsert": "true"
          },
          body: await value.arrayBuffer()
        }
      );
      if (!uploadResp.ok) {
        throw new Error(`File upload failed: ${await uploadResp.text()}`);
      }
      uploaded.push({
        name: value.name,
        url: buildSupabasePublicFileUrl(storageConfig, key),
        size: value.size
      });
    }
    return c.json({ files: uploaded });
  })
);
app.get(
  "/api/employer-files",
  requireAgencyAdminAuth,
  safeApi(async (c) => {
    const data = await loadData(c.env, { readOnly: true });
    const files = data.employmentContracts.flatMap(
      (contract) => Array.isArray(contract.files) ? contract.files : []
    );
    return c.json({ files });
  })
);
app.delete(
  "/api/employers/:refCode",
  requireAgencyAdminAuth,
  safeApi(async (c) => {
    const data = await loadData(c.env);
    const refCode = toTrimmedString(c.req.param("refCode"));
    const existing = data.employers.find((item) => item.refCode === refCode) ?? null;
    if (!existing) {
      return c.json({ error: "Employer not found" }, 404);
    }
    data.employers = data.employers.filter((item) => item.refCode !== refCode);
    data.employmentContracts = data.employmentContracts.filter(
      (item) => item.refCode !== refCode && item.employerRefCode !== refCode
    );
    await saveData(c.env, data);
    return c.json({ message: "Employer deleted successfully" });
  })
);
app.get("/api/enquiries", requireAgencyAdminAuth, async (c) => {
  const search = c.req.query("search")?.trim().toLowerCase();
  const page = Math.max(1, Number(c.req.query("page") ?? "1") || 1);
  const pageSize = Math.min(500, Math.max(1, Number(c.req.query("pageSize") ?? "50") || 50));
  const data = await loadData(c.env, { readOnly: true });
  let enquiries = [...data.enquiries].sort((l, r) => r.id - l.id);
  if (search) {
    enquiries = enquiries.filter(
      (item) => [item.username, item.email, item.phone, item.message].join(" ").toLowerCase().includes(search)
    );
  }
  enquiries = enquiries.map((item) => enrichEnquiryWithClient(item, data.clients));
  const total = enquiries.length;
  const paged = enquiries.slice((page - 1) * pageSize, page * pageSize);
  return c.json({ enquiries: paged, total, page, pageSize });
});
app.get("/api/enquiries/unread-count", async (c) => {
  const data = await loadData(c.env, { readOnly: true });
  return c.json({
    unreadCount: data.enquiries.length,
    count: data.enquiries.length
  });
});
app.get("/api/enquiry/unread-count", async (c) => {
  const data = await loadData(c.env);
  return c.json({
    unreadCount: data.enquiries.length,
    count: data.enquiries.length
  });
});
app.get("/api/enquiries/last-id", async (c) => {
  const data = await loadData(c.env);
  const lastId = data.enquiries.reduce(
    (maxId, enquiry) => Math.max(maxId, enquiry.id),
    0
  );
  return c.json({ lastId });
});
app.get("/api/enquiries/stream", async (c) => {
  const url = new URL(c.req.url);
  const afterId = Number(url.searchParams.get("afterId") ?? 0);
  if (!Number.isFinite(afterId) || afterId < 0) {
    return c.json({ error: "afterId must be a non-negative number" }, 400);
  }
  const startedAt = Date.now();
  return createSseResponse(c.req.raw, async (controller) => {
    let lastId = afterId;
    let lastHeartbeat = Date.now();
    writeSseEvent(controller, "ready", { ok: true });
    while (!c.req.raw.signal.aborted && Date.now() - startedAt < 6e4) {
      const data = await loadData(c.env);
      const nextEnquiries = data.enquiries.filter((enquiry) => enquiry.id > lastId).sort((left, right) => left.id - right.id);
      for (const enquiry of nextEnquiries) {
        writeSseEvent(controller, "enquiry", { enquiry: enrichEnquiryWithClient(enquiry, data.clients) });
        lastId = Math.max(lastId, enquiry.id);
      }
      const nowTime = Date.now();
      if (nowTime - lastHeartbeat > 15e3) {
        writeSseComment(controller, "keep-alive");
        lastHeartbeat = nowTime;
      }
      await sleep2(1200);
    }
  });
});
app.post("/api/enquiries", async (c) => {
  const body = await parseBody2(c.req.raw);
  if (!body?.username || !body.email || !body.phone || !body.message) {
    return c.json(
      { error: "username, email, phone, and message are required" },
      400
    );
  }
  if (body.username.length > 200 || body.email.length > 200 || body.phone.length > 50 || body.message.length > 5e3) {
    return c.json({ error: "Input exceeds maximum allowed length" }, 400);
  }
  const data = await loadData(c.env);
  const enquiry = {
    id: data.counters.enquiries++,
    username: body.username.slice(0, 200),
    date: body.date || buildFallbackDate(),
    email: body.email.slice(0, 200),
    phone: body.phone.slice(0, 50),
    message: body.message.slice(0, 5e3),
    createdAt: now2()
  };
  data.enquiries.unshift(enquiry);
  await saveData(c.env, data);
  return c.json({ enquiry }, 201);
});
function normalizePhone(phone) {
  return String(phone || "").replace(/\D+/g, "").replace(/^0+/, "").trim();
}
__name(normalizePhone, "normalizePhone");
function enrichEnquiryWithClient(enquiry, clients) {
  const normalizedPhone = normalizePhone(enquiry.phone);
  const client = clients.find((item) => {
    if (item.email && enquiry.email && item.email.trim().toLowerCase() === enquiry.email.trim().toLowerCase()) {
      return true;
    }
    if (normalizedPhone && item.phone && normalizePhone(item.phone) === normalizedPhone) {
      return true;
    }
    return false;
  });
  if (!client) {
    return enquiry;
  }
  return {
    ...enquiry,
    clientId: client.id,
    clientName: client.name ?? enquiry.username
  };
}
__name(enrichEnquiryWithClient, "enrichEnquiryWithClient");
app.delete("/api/enquiries/:id", requireAgencyAdminAuth, async (c) => {
  const id = Number(c.req.param("id"));
  const data = await loadData(c.env);
  const existing = data.enquiries.find((item) => item.id === id);
  if (!existing) {
    return c.json({ error: "Enquiry not found" }, 404);
  }
  data.enquiries = data.enquiries.filter((item) => item.id !== id);
  await saveData(c.env, data);
  return c.json({ message: "Enquiry deleted successfully" });
});
app.get(
  "/api/requests",
  safeApi(async (c) => {
    const fastConfig = !isKvBackend(c.env) ? getSupabaseAppDataConfig(c.env) : null;
    if (fastConfig) {
      const fastPage = Math.max(1, Number(c.req.query("page") ?? "1") || 1);
      const fastPageSize = Math.min(
        24,
        Math.max(1, Number(c.req.query("pageSize") ?? "12") || 12)
      );
      const fastStatus = c.req.query("status");
      const fastQuery = toTrimmedString(c.req.query("q")).toLowerCase();
      const fastRequestedClientId = Number(c.req.query("clientId") ?? "");
      const token = parseAuthorizationToken(c.req.raw);
      if (!token) {
        return c.json({ error: "Unauthorized" }, 401);
      }
      const sessions = await loadAgencyAdminSessions(c.env);
      const session = sessions.find((item) => item.token === token);
      const admin = session?.admin ? {
        id: session.admin.id,
        agencyId: session.admin.agencyId,
        username: session.admin.username,
        email: session.admin.email ?? "",
        password: "",
        agencyName: session.admin.agencyName,
        emailVerified: session.admin.emailVerified,
        profileImageUrl: session.admin.profileImageUrl ?? "",
        createdAt: session.admin.createdAt
      } : null;
      if (admin) {
        const fastResult = await tryCallSupabaseRpc(fastConfig, "list_helped_requests", {
          p_app_id: fastConfig.rowId,
          p_agency_id: admin.agencyId,
          p_client_id: Number.isInteger(fastRequestedClientId) && fastRequestedClientId > 0 ? fastRequestedClientId : null,
          p_status: fastStatus && isRequestStatus(fastStatus) ? fastStatus : null,
          p_query: fastQuery || null,
          p_page: fastPage,
          p_page_size: fastPageSize
        });
        if (fastResult) {
          return c.json(fastResult);
        }
      }
    } else if (!parseAuthorizationToken(c.req.raw)) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    const data = await loadData(c.env);
    const { actor, dataChanged } = await resolveRequestActor(c.env, c.req.raw, data);
    if (!actor) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    if (dataChanged) {
      await saveData(c.env, data);
    }
    const page = Math.max(1, Number(c.req.query("page") ?? "1") || 1);
    const pageSize = Math.min(
      24,
      Math.max(1, Number(c.req.query("pageSize") ?? "12") || 12)
    );
    const status = c.req.query("status");
    const query = toTrimmedString(c.req.query("q")).toLowerCase();
    const requestedClientId = Number(c.req.query("clientId") ?? "");
    const requestedAgencyId = Number(c.req.query("agencyId") ?? "");
    const clientId = actor.type === "client" ? actor.client.id : Number.isInteger(requestedClientId) && requestedClientId > 0 ? requestedClientId : null;
    const agencyId = actor.type === "admin" ? actor.admin.agencyId : Number.isInteger(requestedAgencyId) && requestedAgencyId > 0 ? requestedAgencyId : void 0;
    const filtered = data.requests.filter((request) => {
      if (actor.type === "admin" && request.agencyId !== actor.admin.agencyId) {
        return false;
      }
      if (actor.type === "client" && request.clientId !== actor.client.id) {
        return false;
      }
      if (typeof clientId === "number" && request.clientId !== clientId) {
        return false;
      }
      if (typeof agencyId === "number" && request.agencyId !== agencyId) {
        return false;
      }
      if (status && isRequestStatus(status) && request.status !== status) {
        return false;
      }
      if (!query) return true;
      const haystack = [
        request.type,
        request.status,
        request.updatedBy,
        JSON.stringify(request.details ?? {}),
        request.maidReferences.join(" "),
        data.clients.find((client) => client.id === request.clientId)?.name ?? "",
        data.clients.find((client) => client.id === request.clientId)?.email ?? ""
      ].join(" ").toLowerCase();
      return haystack.includes(query);
    }).sort(
      (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
    );
    const total = filtered.length;
    const start = (page - 1) * pageSize;
    const paged = filtered.slice(start, start + pageSize);
    return c.json({
      data: paged.map((request) => buildRequestResponse(data, request)),
      pageInfo: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize))
      }
    });
  })
);
app.get(
  "/api/requests/status-counts",
  safeApi(async (c) => {
    const requestedAgencyId = Number(c.req.query("agencyId") ?? "");
    const requestedClientId = Number(c.req.query("clientId") ?? "");
    const token = parseAuthorizationToken(c.req.raw);
    if (!token) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    const config = !isKvBackend(c.env) ? getSupabaseAppDataConfig(c.env) : null;
    if (config) {
      const sessions = await loadAgencyAdminSessions(c.env);
      const session = sessions.find((item) => item.token === token);
      const adminAgencyId = session?.admin?.agencyId;
      if (typeof adminAgencyId === "number") {
        const fastCounts = await tryCallSupabaseRpc(
          config,
          "get_helped_request_status_counts",
          {
            p_app_id: config.rowId,
            p_agency_id: adminAgencyId,
            p_client_id: Number.isInteger(requestedClientId) && requestedClientId > 0 ? requestedClientId : null
          }
        );
        if (fastCounts) {
          return c.json(fastCounts);
        }
      }
    }
    const data = await loadData(c.env, { readOnly: true });
    const { actor } = await resolveRequestActor(c.env, c.req.raw, data);
    if (!actor) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    const agencyId = actor.type === "admin" ? actor.admin.agencyId : Number.isInteger(requestedAgencyId) && requestedAgencyId > 0 ? requestedAgencyId : void 0;
    const clientId = actor.type === "client" ? actor.client.id : Number.isInteger(requestedClientId) && requestedClientId > 0 ? requestedClientId : void 0;
    const visible = data.requests.filter((request) => {
      if (typeof agencyId === "number" && request.agencyId !== agencyId) return false;
      if (typeof clientId === "number" && request.clientId !== clientId) return false;
      return true;
    });
    return c.json({
      pending: visible.filter((request) => request.status === "pending").length,
      interested: visible.filter((request) => request.status === "interested").length,
      direct_hire: visible.filter((request) => request.status === "direct_hire").length,
      rejected: visible.filter((request) => request.status === "rejected").length
    });
  })
);
app.post(
  "/api/requests",
  safeApi(async (c) => {
    const body = await parseBody2(c.req.raw);
    if (!body || typeof body !== "object") {
      return c.json({ error: "Invalid JSON body" }, 400);
    }
    if (!parseAuthorizationToken(c.req.raw)) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    const data = await loadData(c.env);
    const { actor } = await resolveRequestActor(c.env, c.req.raw, data);
    if (!actor) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    const requestedClientId = Number(body.clientId);
    const clientId = actor.type === "client" ? actor.client.id : Number.isInteger(requestedClientId) && requestedClientId > 0 ? requestedClientId : 0;
    if (clientId <= 0 || !data.clients.some((client) => client.id === clientId)) {
      return c.json({ error: "clientId is required" }, 400);
    }
    if (body.type !== "general" && body.type !== "direct") {
      return c.json({ error: "type is required" }, 400);
    }
    if (!body.details || typeof body.details !== "object" || Array.isArray(body.details)) {
      return c.json({ error: "details is required" }, 400);
    }
    const maidReferences = Array.isArray(body.maidReferences) ? body.maidReferences.map((item) => String(item).trim()).filter(Boolean) : [];
    const invalidReference = maidReferences.find(
      (referenceCode) => !data.maids.some((maid) => maid.referenceCode === referenceCode)
    );
    if (invalidReference) {
      return c.json({ error: `Maid not found: ${invalidReference}` }, 404);
    }
    const firstReference = maidReferences[0] ?? "";
    const directMaid = firstReference ? data.maids.find((maid) => maid.referenceCode === firstReference) : null;
    const requestedAgencyId = Number(body.agencyId ?? "");
    const resolvedAgencyId = actor.type === "admin" ? actor.admin.agencyId : directMaid?.agencyId ?? (Number.isInteger(requestedAgencyId) && requestedAgencyId > 0 ? requestedAgencyId : null);
    if (!resolvedAgencyId) {
      return c.json({ error: "agencyId is required" }, 400);
    }
    const agencyId = resolvedAgencyId;
    const createdAt = now2();
    const requestRecord = {
      id: crypto.randomUUID(),
      clientId,
      agencyId,
      type: body.type === "direct" || maidReferences.length > 0 ? "direct" : "general",
      status: "pending",
      details: body.details,
      maidReferences,
      updatedBy: actor.type === "admin" ? `agency:${actor.admin.id}` : `client:${clientId}`,
      createdAt,
      updatedAt: createdAt
    };
    const conversation = {
      id: crypto.randomUUID(),
      requestId: requestRecord.id,
      agencyId,
      clientId,
      createdAt
    };
    const message = {
      id: crypto.randomUUID(),
      conversationId: conversation.id,
      senderType: "system",
      senderId: 0,
      message: "New request created",
      createdAt
    };
    data.requests.unshift(requestRecord);
    data.requestConversations.unshift(conversation);
    data.requestMessages.push(message);
    await saveData(c.env, data);
    return c.json({ data: buildRequestResponse(data, requestRecord) }, 201);
  })
);
app.get("/api/requests/unread-count", async (c) => {
  const data = await loadData(c.env, { readOnly: true });
  const pendingRequests = data.requests.filter((item) => item.status === "pending").length + data.directSales.filter((item) => item.status === "pending").length;
  return c.json({
    unreadCount: pendingRequests,
    count: pendingRequests
  });
});
app.get(
  "/api/requests/:id",
  safeApi(async (c) => {
    if (!parseAuthorizationToken(c.req.raw)) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    const data = await loadData(c.env, { readOnly: true });
    const { actor } = await resolveRequestActor(c.env, c.req.raw, data);
    if (!actor) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    const request = data.requests.find((item) => item.id === c.req.param("id"));
    if (!request || !canAccessRequest(actor, request)) {
      return c.json({ error: "Request not found" }, 404);
    }
    return c.json({ data: buildRequestResponse(data, request) });
  })
);
app.patch(
  "/api/requests/:id/status",
  safeApi(async (c) => {
    const body = await parseBody2(c.req.raw);
    if (!isRequestStatus(body?.status)) {
      return c.json({ error: "status is required" }, 400);
    }
    if (!parseAuthorizationToken(c.req.raw)) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    const data = await loadData(c.env);
    const { actor } = await resolveRequestActor(c.env, c.req.raw, data);
    if (!actor || actor.type !== "admin") {
      return c.json({ error: "Unauthorized" }, 401);
    }
    const index = data.requests.findIndex((item) => item.id === c.req.param("id"));
    if (index === -1 || data.requests[index].agencyId !== actor.admin.agencyId) {
      return c.json({ error: "Request not found" }, 404);
    }
    data.requests[index] = {
      ...data.requests[index],
      status: body.status,
      updatedBy: `agency:${actor.admin.id}`,
      updatedAt: now2()
    };
    await saveData(c.env, data);
    return c.json({ data: buildRequestResponse(data, data.requests[index]) });
  })
);
app.patch(
  "/api/requests/:id/maids",
  safeApi(async (c) => {
    const body = await parseBody2(c.req.raw);
    const maidReferences = Array.isArray(body?.maidReferences) ? body.maidReferences.map((item) => String(item).trim()).filter(Boolean) : [];
    if (!parseAuthorizationToken(c.req.raw)) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    const data = await loadData(c.env);
    const { actor } = await resolveRequestActor(c.env, c.req.raw, data);
    if (!actor || actor.type !== "admin") {
      return c.json({ error: "Unauthorized" }, 401);
    }
    const invalidReference = maidReferences.find(
      (referenceCode) => !data.maids.some((maid) => maid.referenceCode === referenceCode)
    );
    if (invalidReference) {
      return c.json({ error: `Maid not found: ${invalidReference}` }, 404);
    }
    const index = data.requests.findIndex((item) => item.id === c.req.param("id"));
    if (index === -1 || data.requests[index].agencyId !== actor.admin.agencyId) {
      return c.json({ error: "Request not found" }, 404);
    }
    data.requests[index] = {
      ...data.requests[index],
      maidReferences,
      type: maidReferences.length > 0 ? "direct" : "general",
      updatedBy: `agency:${actor.admin.id}`,
      updatedAt: now2()
    };
    await saveData(c.env, data);
    return c.json({ data: buildRequestResponse(data, data.requests[index]) });
  })
);
app.get(
  "/api/conversations/:requestId",
  safeApi(async (c) => {
    if (!parseAuthorizationToken(c.req.raw)) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    const data = await loadData(c.env);
    const { actor, dataChanged } = await resolveRequestActor(c.env, c.req.raw, data);
    if (!actor) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    const request = data.requests.find((item) => item.id === c.req.param("requestId"));
    if (!request || !canAccessRequest(actor, request)) {
      return c.json({ error: "Request not found" }, 404);
    }
    const { conversation, created } = ensureRequestConversation(data, request);
    if (created || dataChanged) {
      await saveData(c.env, data);
    }
    return c.json({ data: conversation });
  })
);
app.get(
  "/api/messages/:conversationId",
  safeApi(async (c) => {
    if (!parseAuthorizationToken(c.req.raw)) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    const data = await loadData(c.env, { readOnly: true });
    const { actor } = await resolveRequestActor(c.env, c.req.raw, data);
    if (!actor) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    const conversation = data.requestConversations.find(
      (item) => item.id === c.req.param("conversationId")
    );
    const request = conversation ? data.requests.find((item) => item.id === conversation.requestId) : null;
    if (!conversation || !request || !canAccessRequest(actor, request)) {
      return c.json({ error: "Conversation not found" }, 404);
    }
    return c.json({
      data: data.requestMessages.filter((message) => message.conversationId === conversation.id).sort(
        (left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime()
      )
    });
  })
);
app.post(
  "/api/messages",
  safeApi(async (c) => {
    const body = await parseBody2(c.req.raw);
    const messageText = toTrimmedString(body?.message);
    if (!body?.conversationId || !messageText) {
      return c.json({ error: "conversationId and message are required" }, 400);
    }
    if (!parseAuthorizationToken(c.req.raw)) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    const data = await loadData(c.env);
    const { actor } = await resolveRequestActor(c.env, c.req.raw, data);
    if (!actor) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    const conversation = data.requestConversations.find(
      (item) => item.id === body.conversationId
    );
    const request = conversation ? data.requests.find((item) => item.id === conversation.requestId) : null;
    if (!conversation || !request || !canAccessRequest(actor, request)) {
      return c.json({ error: "Conversation not found" }, 404);
    }
    const record = {
      id: crypto.randomUUID(),
      conversationId: conversation.id,
      senderType: actor.type === "admin" ? "admin" : "client",
      senderId: actor.type === "admin" ? actor.admin.id : actor.client.id,
      message: messageText,
      ...body.attachments !== void 0 ? { attachments: body.attachments } : {},
      createdAt: now2()
    };
    data.requestMessages.push(record);
    data.requests = data.requests.map(
      (item) => item.id === request.id ? {
        ...item,
        updatedAt: record.createdAt,
        updatedBy: actor.type === "admin" ? `agency:${actor.admin.id}` : `client:${actor.client.id}`
      } : item
    );
    await saveData(c.env, data);
    return c.json({ data: record }, 201);
  })
);
var WORKFLOW_EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
var isAvailableMaid = /* @__PURE__ */ __name((maid) => maid.isPublic && !["inactive", "archived"].includes(
  String(maid.status ?? "available").toLowerCase()
), "isAvailableMaid");
var buildMatchCandidates = /* @__PURE__ */ __name((maids, message) => {
  const lowerMessage = message.toLowerCase();
  return maids.filter(isAvailableMaid).slice(0, 3).map((maid, index) => {
    const reasons = [
      `${maid.nationality} helper profile is publicly available`,
      `Current status: ${maid.status ?? "available"}`
    ];
    if (lowerMessage.includes("childcare")) {
      reasons.push("Message mentions childcare requirements");
    } else if (lowerMessage.includes("elderly")) {
      reasons.push("Message mentions elderly care requirements");
    } else if (lowerMessage.includes("house")) {
      reasons.push("Message mentions housekeeping support");
    }
    return {
      maidId: maid.id,
      maidReferenceCode: maid.referenceCode,
      maidName: maid.fullName,
      score: Math.max(70, 95 - index * 7),
      reasons
    };
  });
}, "buildMatchCandidates");
var classifyInquiryIntent = /* @__PURE__ */ __name((message) => {
  const workflow = classifyFallback(message).workflow;
  if (workflow === "inquiry_match") {
    return "hiring";
  }
  if (workflow === "human_review") {
    return "complaint";
  }
  return "inquiry";
}, "classifyInquiryIntent");
var workflowForIntent = /* @__PURE__ */ __name((intent) => {
  if (intent === "hiring") {
    return "inquiry_match";
  }
  if (intent === "complaint") {
    return "human_review";
  }
  return "inquiry_only";
}, "workflowForIntent");
var buildInquiryReply = /* @__PURE__ */ __name((intent, matchesCount) => {
  if (intent === "hiring" && matchesCount > 0) {
    return `Thank you for reaching out to Helped Maids. Our system has identified ${matchesCount} suitable helper profile${matchesCount === 1 ? "" : "s"} based on your requirements. A member of our team will contact you shortly with the full details. We look forward to finding the perfect match for your household.`;
  }
  if (intent === "hiring") {
    return "Thank you for your enquiry. We have received your hiring request and our placement team will reach out to you shortly with profiles tailored to your needs. We appreciate your interest in our services.";
  }
  if (intent === "complaint") {
    return "Thank you for bringing this matter to our attention. We sincerely apologise for any inconvenience caused. Your feedback has been logged and a dedicated team member will follow up with you within 24 hours to resolve this promptly.";
  }
  return "Thank you for contacting Helped Maids. We have received your message and our team will respond within 24 hours. We appreciate your patience and look forward to assisting you.";
}, "buildInquiryReply");
var inferLeadEnrichment = /* @__PURE__ */ __name((message) => {
  const lower2 = message.toLowerCase();
  const budgetMatch = message.match(/(?:sgd|s\\$|\\$)\\s*(\\d{3,5})/i) ?? message.match(/budget\\s*(\\d{3,5})/i);
  const budgetValue = budgetMatch ? Number(budgetMatch[1]) : null;
  const serviceType = lower2.includes("childcare") ? "childcare" : lower2.includes("elderly") ? "elderly_care" : lower2.includes("house") ? "housekeeping" : "general_housekeeping";
  const urgency = /(urgent|asap|immediately|today|tomorrow)/.test(lower2) ? "high" : "normal";
  const locationMatch = message.match(
    /(woodlands|tampines|yishun|jurong|bedok|hougang|toa payoh|singapore)/i
  );
  const location = locationMatch ? locationMatch[1] : "Singapore";
  return {
    serviceType,
    budget: {
      min: budgetValue,
      max: budgetValue,
      currency: "SGD",
      text: budgetMatch?.[0] ?? ""
    },
    urgency,
    location,
    summary: `${serviceType.replace(/_/g, " ")} request in ${location}${budgetValue ? ` with budget ${budgetValue} SGD` : ""}`.trim()
  };
}, "inferLeadEnrichment");
var qualifyLead = /* @__PURE__ */ __name((enrichment, message) => {
  let score = 45;
  const reasons = [];
  if (enrichment.serviceType !== "general_housekeeping") {
    score += 15;
    reasons.push(`Service type detected: ${enrichment.serviceType}`);
  }
  if (enrichment.budget.min) {
    score += 15;
    reasons.push(`Budget captured: ${enrichment.budget.min} SGD`);
  }
  if (enrichment.urgency === "high") {
    score += 15;
    reasons.push("Customer indicated high urgency");
  }
  if (enrichment.location && enrichment.location !== "Singapore") {
    score += 10;
    reasons.push(`Location identified: ${enrichment.location}`);
  }
  if (message.trim().length > 40) {
    score += 10;
    reasons.push("Message includes enough detail for follow-up");
  }
  return {
    score,
    classification: score >= 80 ? "HIGH" : score >= 60 ? "MEDIUM" : "LOW",
    reasons
  };
}, "qualifyLead");
app.post(
  "/api/inquiry",
  safeApi(async (c) => {
    const body = await parseBody2(c.req.raw);
    const name = toTrimmedString(body?.name) || "Unknown";
    const contact = toTrimmedString(body?.contact);
    const message = toTrimmedString(body?.message);
    if (!message) {
      return c.json(
        buildWorkflowResponse(c.req.raw, {
          workflow: "validation_error",
          intent: "validation_error",
          fallbackUsed: true,
          data: { error: "message is required" }
        }),
        400
      );
    }
    const data = await loadData(c.env);
    const fallback = classifyFallback(message);
    const intent = classifyInquiryIntent(message);
    const workflow = normalizeWorkflow(
      fallback.workflow === "inquiry_match" ? workflowForIntent(intent) : fallback.workflow === "inquiry_only" ? "inquiry_only" : fallback.workflow
    );
    const matches = intent === "hiring" ? buildMatchCandidates(data.maids, message) : [];
    const reply = buildInquiryReply(intent, matches.length);
    const enquiry = {
      id: data.counters.enquiries++,
      username: name,
      date: buildFallbackDate(),
      email: WORKFLOW_EMAIL_PATTERN.test(contact) ? contact : "",
      phone: WORKFLOW_EMAIL_PATTERN.test(contact) ? "" : contact,
      message,
      createdAt: now2()
    };
    data.enquiries.unshift(enquiry);
    await saveData(c.env, data);
    const responseBody = buildWorkflowResponse(c.req.raw, {
      workflow,
      intent,
      fallbackUsed: true,
      fallbackProvider: "deterministic",
      data: {
        inquiry: {
          id: enquiry.id,
          name,
          contact,
          message,
          intent,
          workflow,
          reply,
          aiUsed: false,
          createdAt: enquiry.createdAt
        },
        matches: matches.length > 0 ? matches : void 0,
        reply
      }
    });
    return c.json(responseBody);
  })
);
app.post(
  "/api/inquiry/make",
  safeApi(async (c) => {
    const body = await parseBody2(c.req.raw);
    const name = toTrimmedString(body?.name) || "Unknown";
    const contact = toTrimmedString(body?.contact);
    const message = toTrimmedString(body?.message);
    if (!message) {
      return c.json(
        buildWorkflowResponse(c.req.raw, {
          workflow: "validation_error",
          intent: "validation_error",
          fallbackUsed: true,
          data: { error: "message is required" }
        }),
        400
      );
    }
    const data = await loadData(c.env);
    const fallback = classifyFallback(message);
    const intent = classifyInquiryIntent(message);
    const workflow = normalizeWorkflow(
      fallback.workflow === "inquiry_match" ? workflowForIntent(intent) : fallback.workflow === "inquiry_only" ? "inquiry_only" : fallback.workflow
    );
    const matches = intent === "hiring" ? buildMatchCandidates(data.maids, message) : [];
    const reply = buildInquiryReply(intent, matches.length);
    const enquiry = {
      id: data.counters.enquiries++,
      username: name,
      date: buildFallbackDate(),
      email: WORKFLOW_EMAIL_PATTERN.test(contact) ? contact : "",
      phone: WORKFLOW_EMAIL_PATTERN.test(contact) ? "" : contact,
      message,
      createdAt: now2()
    };
    data.enquiries.unshift(enquiry);
    await saveData(c.env, data);
    const webhookUrl = toTrimmedString(c.env.MAKE_WEBHOOK_URL);
    let makeTriggered = false;
    let makeDelivery = null;
    if (webhookUrl) {
      const startedAt = Date.now();
      try {
        const response = await fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            event: "inquiry.processed",
            inquiryId: enquiry.id,
            intent,
            workflow,
            fallbackUsed: true,
            fallbackProvider: "deterministic",
            matches,
            reply,
            name,
            contact,
            message,
            employerId: body?.employerId ?? null,
            source: toTrimmedString(body?.source) || "make_ai_agent",
            channel: toTrimmedString(body?.channel) || "webhook",
            conversationId: toTrimmedString(body?.conversationId),
            messageId: toTrimmedString(body?.messageId),
            receivedAt: toTrimmedString(body?.receivedAt),
            metadata: body?.metadata && typeof body.metadata === "object" ? body.metadata : {}
          })
        });
        makeTriggered = response.ok;
        makeDelivery = {
          success: response.ok,
          statusCode: response.status,
          durationMs: Date.now() - startedAt,
          responseBody: await response.text().catch(() => "")
        };
      } catch (error) {
        makeDelivery = {
          success: false,
          statusCode: null,
          durationMs: Date.now() - startedAt,
          error: error instanceof Error ? error.message : String(error)
        };
      }
    } else {
      makeDelivery = {
        success: false,
        statusCode: null,
        error: "MAKE_WEBHOOK_URL is not configured"
      };
    }
    const responseBody = buildWorkflowResponse(c.req.raw, {
      workflow,
      intent,
      fallbackUsed: true,
      fallbackProvider: "deterministic",
      data: {
        inquiry: {
          id: enquiry.id,
          name,
          contact,
          message,
          intent,
          workflow,
          reply,
          aiUsed: false,
          createdAt: enquiry.createdAt
        },
        matches: matches.length > 0 ? matches : void 0,
        reply,
        makeTriggered,
        makeDelivery
      }
    });
    return c.json(responseBody);
  })
);
app.post(
  "/api/ai/processInquiry",
  safeApi(async (c) => {
    const body = await parseBody2(c.req.raw);
    const name = toTrimmedString(body?.name) || "Unknown";
    const contact = toTrimmedString(body?.contact);
    const message = toTrimmedString(body?.message);
    const requestId = toTrimmedString(body?.requestId) || crypto.randomUUID();
    if (!message) {
      return c.json(
        buildWorkflowResponse(c.req.raw, {
          workflow: "validation_error",
          intent: "validation_error",
          fallbackUsed: true,
          data: { error: "message is required" }
        }),
        400
      );
    }
    const data = await loadData(c.env);
    const fallback = classifyFallback(message);
    const intent = classifyInquiryIntent(message);
    const workflow = normalizeWorkflow(
      fallback.workflow === "inquiry_match" ? workflowForIntent(intent) : fallback.workflow === "inquiry_only" ? "inquiry_only" : fallback.workflow
    );
    const matches = intent === "hiring" ? buildMatchCandidates(data.maids, message) : [];
    const reply = buildInquiryReply(intent, matches.length);
    const enquiry = {
      id: data.counters.enquiries++,
      username: name,
      date: buildFallbackDate(),
      email: WORKFLOW_EMAIL_PATTERN.test(contact) ? contact : "",
      phone: WORKFLOW_EMAIL_PATTERN.test(contact) ? "" : contact,
      message,
      createdAt: now2()
    };
    data.enquiries.unshift(enquiry);
    await saveData(c.env, data);
    const responseBody = buildWorkflowResponse(c.req.raw, {
      workflow,
      intent,
      fallbackUsed: true,
      fallbackProvider: "deterministic",
      data: {
        requestId,
        inquiry: {
          id: enquiry.id,
          name,
          contact,
          message,
          intent,
          workflow,
          reply,
          aiUsed: false,
          createdAt: enquiry.createdAt
        },
        matches: matches.length > 0 ? matches : void 0,
        reply,
        classifier: {
          intent,
          workflow,
          reply
        }
      }
    });
    return c.json(responseBody);
  })
);
var getAiSupabaseConfig = /* @__PURE__ */ __name((env) => {
  const config = getSupabaseAppDataConfig(env);
  return config ? { baseUrl: config.baseUrl, serviceRoleKey: config.serviceRoleKey } : null;
}, "getAiSupabaseConfig");
var isAiAutopilotEnabled = /* @__PURE__ */ __name((env) => env.AI_AUTOPILOT_ENABLED?.trim().toLowerCase() === "true", "isAiAutopilotEnabled");
var parseAiBody = /* @__PURE__ */ __name(async (request) => await parseBody2(request) ?? {}, "parseAiBody");
var runAiEndpoint = /* @__PURE__ */ __name(async (c, agentId, actor, data, body) => {
  const baseInput = {
    ...body,
    message: toTrimmedString(body.message) || toTrimmedString(body.prompt) || toTrimmedString(body.task)
  };
  let semanticReferences = [];
  if (agentId === "maid_recommendation") {
    const query = buildRecommendationQuery(baseInput);
    if (query) {
      semanticReferences = await searchSimilarMaids(c.env, query).catch(() => []);
    }
  }
  const input = semanticReferences.length > 0 ? { ...baseInput, semanticReferences } : baseInput;
  if (!input.message && agentId !== "maid_recommendation" && agentId !== "admin_analytics") {
    return c.json({ error: "message, prompt, or task is required" }, 400);
  }
  const aiActor = {
    ...actor,
    ip: c.req.header("cf-connecting-ip") || c.req.header("x-forwarded-for") || "unknown"
  };
  if (body.stream === true) {
    const streamed = await streamAIAgent({
      agentId,
      input,
      actor: aiActor,
      appData: data,
      groqApiKey: c.env.GROQ_API_KEY,
      supabase: getAiSupabaseConfig(c.env),
      conversationId: toTrimmedString(body.conversationId) || void 0,
      request: c.req.raw
    });
    return new Response(streamed.body, {
      headers: {
        "content-type": "text/event-stream; charset=utf-8",
        "cache-control": "no-cache, no-transform",
        "x-ai-conversation-id": streamed.conversationId
      }
    });
  }
  const result = await runAIAgent({
    agentId,
    input,
    actor: aiActor,
    appData: data,
    groqApiKey: c.env.GROQ_API_KEY,
    supabase: getAiSupabaseConfig(c.env),
    conversationId: toTrimmedString(body.conversationId) || void 0,
    request: c.req.raw
  });
  return c.json(result);
}, "runAiEndpoint");
app.post(
  "/api/ai/receptionist",
  safeApi(async (c) => {
    const body = await parseAiBody(c.req.raw);
    const data = await loadData(c.env);
    const name = toTrimmedString(body.name);
    const contact = toTrimmedString(body.contact);
    const msgText = toTrimmedString(body.message || body.prompt || body.task);
    if (name && contact && msgText) {
      const exists = data.enquiries.some(
        (item) => item.message === msgText && (item.email === contact || item.phone === contact)
      );
      if (!exists) {
        const enquiry = {
          id: data.counters.enquiries++,
          username: name,
          date: buildFallbackDate(),
          email: WORKFLOW_EMAIL_PATTERN.test(contact) ? contact : "",
          phone: WORKFLOW_EMAIL_PATTERN.test(contact) ? "" : contact,
          message: msgText,
          createdAt: now2()
        };
        data.enquiries.unshift(enquiry);
        await saveData(c.env, data);
      }
    }
    const input = {
      ...body,
      message: toTrimmedString(body.message) || toTrimmedString(body.prompt) || toTrimmedString(body.task)
    };
    if (!input.message) return c.json({ error: "message, prompt, or task is required" }, 400);
    const aiActor = {
      role: "public",
      ip: c.req.header("cf-connecting-ip") || c.req.header("x-forwarded-for") || "unknown"
    };
    const result = await runAIAgent({
      agentId: "receptionist",
      input,
      actor: aiActor,
      appData: data,
      groqApiKey: c.env.GROQ_API_KEY,
      supabase: getAiSupabaseConfig(c.env),
      conversationId: toTrimmedString(body.conversationId) || void 0,
      request: c.req.raw
    });
    const MAID_RE = /\[MAID:([^\]]+)\]/g;
    const mentionedCodes = /* @__PURE__ */ new Set();
    let m;
    while ((m = MAID_RE.exec(result.response)) !== null) mentionedCodes.add(m[1].trim());
    const normalizedMsgNat = input.message.toLowerCase().replace(/\bfilipina\b/g, "filipino").replace(/\bphilippines?\b/g, "filipino").replace(/\bburmese\b/g, "myanmar");
    const NATIONALITY_CARD_KEYS = ["filipino", "indonesian", "myanmar", "indian", "bangladeshi", "sri lankan"];
    const requestedNatCard = NATIONALITY_CARD_KEYS.find((n) => normalizedMsgNat.includes(n));
    const maidCardRequest = /\b(top|best|show|find|recommend|match|shortlist|list|available|availability|who|which|suitable|have|any|got|need|want|looking|do|can|hire|hiring)\b/i.test(input.message) && /\b(maid|maids|helper|helpers|fdw|filipino|indonesian|myanmar|burmese|indian|sri\s+lankan|bangladeshi|transfer|elderly|childcare|infant|newborn|nanny|babysit|disabled|housework|housekeep|cleaning|cooking|cook|chef|care)\b/i.test(input.message);
    const genericCardTerms = /* @__PURE__ */ new Set([
      "available",
      "availability",
      "best",
      "find",
      "maid",
      "maids",
      "helper",
      "helpers",
      "fdw",
      "list",
      "match",
      "recommend",
      "show",
      "shortlist",
      "suitable",
      "top",
      "which",
      "who",
      "hire",
      "hired",
      "hiring",
      "need",
      "want",
      "looking",
      "look",
      "have",
      "any",
      "got",
      "can",
      "you",
      "the",
      "for",
      "are",
      "get",
      "our",
      "with",
      "that",
      "this",
      "what",
      "how",
      "about",
      "some",
      "one",
      "good",
      "great",
      "please",
      "like",
      "also"
    ]);
    const cardTerms = input.message.toLowerCase().replace(/\bfilipina\b/g, "filipino").replace(/\bphilippines?\b/g, "filipino").replace(/\bburmese\b/g, "myanmar").replace(/\bold\s+folk(s)?\b/g, "elderly").replace(/\bsenior(s)?\b/g, "elderly").replace(/\baged\b/g, "elderly").replace(/\bgrandma\b/g, "elderly").replace(/\bgrandpa\b/g, "elderly").replace(/\bgrandparent(s)?\b/g, "elderly").replace(/\bchildren\b/g, "child").replace(/\bbab(y|ies)\b/g, "infant").replace(/\bnewborn(s)?\b/g, "infant").replace(/\bnanny\b/g, "childcare").replace(/\bbabysit(ter|ting)?\b/g, "infant").replace(/\bhousekeep(er|ing)?\b/g, "housework").replace(/\bhouse\s+clean(ing|er)?\b/g, "housework").replace(/\bcleaning\b/g, "housework").replace(/\bchef\b/g, "cook").replace(/\bmeal(s)?\b/g, "cook").replace(/\bbedridden\b/g, "disabled").replace(/\bwheelchair\b/g, "disabled").split(/[^a-z0-9]+/).filter((term) => term.length >= 3 && !genericCardTerms.has(term));
    const isDisplayablePublicMaid = /* @__PURE__ */ __name((maid) => {
      const status = String(maid.status ?? "").trim().toLowerCase();
      if (!status) return true;
      return !/\b(unavailable|inactive|rejected|blacklist|blacklisted|hidden|archived|deleted)\b/.test(status);
    }, "isDisplayablePublicMaid");
    const maidSearchText = /* @__PURE__ */ __name((maid) => [
      maid.fullName,
      maid.referenceCode,
      maid.nationality,
      maid.type,
      maid.status,
      maid.educationLevel,
      maid.religion,
      maid.maritalStatus,
      JSON.stringify(maid.languageSkills ?? {}),
      JSON.stringify(maid.skillsPreferences ?? {}),
      JSON.stringify(maid.workAreas ?? {}),
      JSON.stringify(maid.employmentHistory ?? []),
      JSON.stringify(maid.introduction ?? {})
    ].join(" ").toLowerCase(), "maidSearchText");
    const scoreMaidCard = /* @__PURE__ */ __name((maid) => {
      const haystack = maidSearchText(maid);
      const nationality = String(maid.nationality || "").toLowerCase();
      const workAreas = JSON.stringify(maid.workAreas ?? {}).toLowerCase();
      const intro = JSON.stringify(maid.introduction ?? {}).toLowerCase();
      const skills = JSON.stringify(maid.skillsPreferences ?? {}).toLowerCase();
      const employment = JSON.stringify(maid.employmentHistory ?? []).toLowerCase();
      return cardTerms.reduce((sum, term) => {
        if (!haystack.includes(term)) return sum;
        const exactNationality = nationality.includes(term) ? 8 : 0;
        const workMatch = workAreas.includes(term) ? 5 : 0;
        const profileMatch = intro.includes(term) || skills.includes(term) || employment.includes(term) ? 3 : 0;
        return sum + 1 + exactNationality + workMatch + profileMatch;
      }, 0);
    }, "scoreMaidCard");
    const publicMaids = (data.maids || []).filter(
      (maid) => Boolean(maid.isPublic) && isDisplayablePublicMaid(maid)
    );
    const matchesRequestedNat = /* @__PURE__ */ __name((maid) => {
      if (!requestedNatCard) return true;
      const nat = String(maid.nationality || "").toLowerCase();
      return nat.includes(requestedNatCard);
    }, "matchesRequestedNat");
    let featured = publicMaids.filter(
      (maid) => mentionedCodes.has(String(maid.referenceCode))
    );
    if (featured.length === 0) {
      featured = publicMaids.filter((maid) => {
        const n = String(maid.fullName || "").trim();
        return n.length > 3 && result.response.includes(n);
      });
    }
    if (requestedNatCard) {
      featured = featured.filter(matchesRequestedNat);
    }
    if (maidCardRequest && featured.length < 10) {
      const featuredRefs = new Set(
        featured.map((maid) => String(maid.referenceCode || ""))
      );
      const getMaidTier = /* @__PURE__ */ __name((m2) => {
        const status = String(m2.status ?? "").toLowerCase();
        const type = String(m2.type ?? "").toLowerCase();
        return status.includes("available") ? 0 : type.includes("transfer") ? 1 : 2;
      }, "getMaidTier");
      const rankedTopUp = publicMaids.map((maid) => ({ maid, score: scoreMaidCard(maid) })).filter(({ maid, score }) => {
        const ref = String(maid.referenceCode || "");
        if (featuredRefs.has(ref)) return false;
        if (requestedNatCard) return matchesRequestedNat(maid);
        return cardTerms.length === 0 || score > 0;
      }).sort(
        (left, right) => right.score - left.score || getMaidTier(left.maid) - getMaidTier(right.maid) || Number(right.maid.id || 0) - Number(left.maid.id || 0)
      ).map(({ maid }) => maid);
      featured = [...featured, ...rankedTopUp].slice(0, 10);
    }
    const featuredMaids = featured.slice(0, 10).map((maid) => {
      const r = maid;
      const photos = Array.isArray(r.photoDataUrls) ? r.photoDataUrls : [];
      return {
        id: r.id,
        referenceCode: String(r.referenceCode || ""),
        fullName: String(r.fullName || ""),
        nationality: String(r.nationality || ""),
        type: String(r.type || ""),
        status: String(r.status || ""),
        hasPhoto: Boolean(r.hasPhoto),
        photoUrl: typeof r.photoDataUrl === "string" && r.photoDataUrl ? r.photoDataUrl : photos[0] || null
      };
    });
    const cleanedResponse = result.response.replace(/\s*\[MAID:[^\]]+\]/g, "");
    return c.json({
      ...result,
      response: cleanedResponse,
      ...featuredMaids.length > 0 ? { featuredMaids } : {}
    });
  })
);
app.post(
  "/api/ai/recommend-maid",
  requireClientAuth,
  safeApi(async (c) => {
    const client = c.get("client");
    const body = await parseAiBody(c.req.raw);
    const data = await loadData(c.env, { readOnly: true });
    return runAiEndpoint(
      c,
      "maid_recommendation",
      { role: "employer", userId: client.id, clientId: client.id },
      data,
      body
    );
  })
);
app.post(
  "/api/ai/employer-support",
  requireClientAuth,
  safeApi(async (c) => {
    const client = c.get("client");
    const body = await parseAiBody(c.req.raw);
    const data = await loadData(c.env, { readOnly: true });
    return runAiEndpoint(
      c,
      "employer_support",
      { role: "employer", userId: client.id, clientId: client.id },
      data,
      body
    );
  })
);
app.post(
  "/api/ai/agency-assistant",
  requireAgencyAdminAuth,
  safeApi(async (c) => {
    const admin = c.get("agencyAdmin");
    const body = await parseAiBody(c.req.raw);
    const data = await loadData(c.env, { readOnly: true });
    return runAiEndpoint(
      c,
      "agency_assistant",
      {
        role: "agency",
        userId: admin.id,
        agencyId: admin.agencyId,
        agencyName: admin.agencyName
      },
      data,
      body
    );
  })
);
app.post(
  "/api/ai/screen-applicant",
  requireAgencyAdminAuth,
  safeApi(async (c) => {
    const admin = c.get("agencyAdmin");
    const body = await parseAiBody(c.req.raw);
    const data = await loadData(c.env, { readOnly: true });
    return runAiEndpoint(
      c,
      "applicant_screening",
      {
        role: "agency",
        userId: admin.id,
        agencyId: admin.agencyId,
        agencyName: admin.agencyName
      },
      data,
      body
    );
  })
);
app.post(
  "/api/ai/screen-applicant-public",
  safeApi(async (c) => {
    const body = await parseAiBody(c.req.raw);
    const applicationId = toTrimmedString(body.applicationId);
    const applicantAccessToken = toTrimmedString(body.applicantAccessToken);
    if (!applicationId || !applicantAccessToken) {
      return c.json({ error: "applicationId and applicantAccessToken are required" }, 400);
    }
    const data = await loadData(c.env, { readOnly: true });
    const application = data.ats.applications.find(
      (item) => item.id === applicationId && item.applicantAccessToken === applicantAccessToken
    );
    if (!application) {
      return c.json({ error: "Application not found" }, 404);
    }
    const profile = data.ats.profiles.find((item) => item.applicationId === application.id);
    const scopedData = {
      ...defaultData(),
      ats: {
        ...defaultData().ats,
        applications: [application],
        profiles: profile ? [profile] : [],
        documents: {
          [application.id]: data.ats.documents[application.id] ?? []
        },
        scores: data.ats.scores[application.id] ? { [application.id]: data.ats.scores[application.id] } : {},
        history: {
          [application.id]: data.ats.history[application.id] ?? []
        }
      }
    };
    return runAiEndpoint(
      c,
      "applicant_screening",
      {
        role: "applicant",
        userId: application.id,
        agencyId: application.agencyId
      },
      scopedData,
      {
        ...body,
        message: toTrimmedString(body.message) || "Review my application readiness and explain missing requirements."
      }
    );
  })
);
app.post(
  "/api/ai/admin-analytics",
  requireAgencyAdminAuth,
  safeApi(async (c) => {
    const admin = c.get("agencyAdmin");
    const body = await parseAiBody(c.req.raw);
    const data = await loadData(c.env, { readOnly: true });
    return runAiEndpoint(
      c,
      "admin_analytics",
      {
        role: "admin",
        userId: admin.id,
        agencyId: admin.agencyId,
        agencyName: admin.agencyName
      },
      data,
      body
    );
  })
);
app.post(
  "/api/ai/content-generator",
  requireAgencyAdminAuth,
  safeApi(async (c) => {
    const admin = c.get("agencyAdmin");
    const body = await parseAiBody(c.req.raw);
    const data = await loadData(c.env, { readOnly: true });
    return runAiEndpoint(
      c,
      "content_generator",
      {
        role: "agency",
        userId: admin.id,
        agencyId: admin.agencyId,
        agencyName: admin.agencyName
      },
      data,
      body
    );
  })
);
app.post(
  "/api/ai/automation",
  requireAgencyAdminAuth,
  safeApi(async (c) => {
    const admin = c.get("agencyAdmin");
    const body = await parseAiBody(c.req.raw);
    const data = await loadData(c.env, { readOnly: true });
    return runAiEndpoint(
      c,
      "workflow_automation",
      {
        role: "agency",
        userId: admin.id,
        agencyId: admin.agencyId,
        agencyName: admin.agencyName
      },
      data,
      body
    );
  })
);
app.post(
  "/api/ai/autopilot/run",
  requireAgencyAdminAuth,
  safeApi(async (c) => {
    const admin = c.get("agencyAdmin");
    const body = await parseBody2(c.req.raw) ?? {};
    const data = await loadData(c.env, { readOnly: true });
    const result = await runAiAutopilot({
      appData: data,
      groqApiKey: c.env.GROQ_API_KEY,
      supabase: getAiSupabaseConfig(c.env),
      agencyId: admin.agencyId,
      agencyName: admin.agencyName,
      maxActions: typeof body.maxActions === "number" ? body.maxActions : 6,
      dryRun: body.dryRun === true,
      force: body.force === true,
      request: c.req.raw
    });
    return c.json(result);
  })
);
var MARKETING_LOG_KEY = "marketing-last-run.json";
var MARKETING_CONTACTS_KEY = "marketing-contacts-sent.json";
var MARKETING_COOLDOWN_MS = 7 * 864e5;
var goalMetaMarketing = /* @__PURE__ */ __name((goal) => ({
  new_arrivals: { subject: "New Domestic Helpers Now Available \u2013 Helped Maids", hook: "We are pleased to inform you that new domestic helpers have recently joined our agency and are ready for placement.", emoji: "\u2728" },
  re_engage: { subject: "We Are Here to Help \u2013 Qualified Helpers Available", hook: "We wanted to follow up and let you know that we still have highly qualified domestic helpers ready for placement.", emoji: "\u{1F44B}" },
  follow_up: { subject: "Following Up on Your Enquiry \u2013 Helped Maids", hook: "We hope this message finds you well. We would like to follow up on your recent enquiry and ensure all your questions have been addressed.", emoji: "\u{1F4CB}" },
  holiday: { subject: "Season's Greetings from Helped Maids", hook: "On behalf of our entire team, we wish you and your family a joyful and restful celebration.", emoji: "\u{1F38A}" },
  promotion: { subject: "Priority Placement Opportunity \u2013 Limited Availability", hook: "We have a limited number of placement slots available and would like to offer you priority access.", emoji: "\u2B50" },
  custom: { subject: "An Update from Helped Maids", hook: "We have an important update we would like to share with you.", emoji: "\u{1F4AC}" }
})[goal] ?? { subject: "Update from Helped Maids", hook: "We have something we would like to share with you.", emoji: "" }, "goalMetaMarketing");
var generateMarketingTemplate = /* @__PURE__ */ __name(async (goal, tone, agencyName, agencyPhone, featuredNames, groqApiKey) => {
  const meta = goalMetaMarketing(goal);
  const emojiPrefix = tone === "professional" ? "" : `${meta.emoji} `;
  const highlight = featuredNames.slice(0, 2).join(" and ");
  const fallback = `Hi {{name}},

${emojiPrefix}${meta.hook}${highlight ? ` Meet ${highlight} \u2014 available now.` : ""}

Contact us at {{agencyPhone}} \u2014 ${agencyName}.`;
  if (!groqApiKey) return fallback;
  const toneMap = {
    warm: "friendly and caring, 1-2 emojis",
    professional: "formal and polished, no emojis",
    casual: "relaxed and conversational, 1 emoji",
    urgent: "direct and action-oriented, 1 emoji"
  };
  const systemPrompt = `You are a professional client relations specialist for a licensed Singapore domestic helper placement agency. Write ONE polished outreach message. FORMAT: Open with "Dear {{name}}," on its own line, blank line, 2-3 professional sentences that are warm but formal, closing with "Please do not hesitate to contact us at {{agencyPhone}}.", blank line, "Warm regards," then the agency name. Max 320 characters total. Respond with ONLY the message text, nothing else.`;
  const userPrompt = `Goal: ${meta.subject}. Tone: ${toneMap[tone] ?? toneMap.warm}. Agency: ${agencyName}. Phone: ${agencyPhone || "our number"}.${highlight ? ` Available helpers: ${highlight}.` : ""}`;
  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${groqApiKey}`, "Content-Type": "application/json", "User-Agent": "helped-web-worker/1.0" },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        temperature: 0.4,
        max_tokens: 350,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ]
      }),
      signal: AbortSignal.timeout(12e3)
    });
    if (!res.ok) return fallback;
    const data = await res.json();
    const text3 = data.choices?.[0]?.message?.content?.trim();
    if (text3 && text3.includes("{{name}}")) return text3;
    if (text3) return text3.replace(/^Hi there/i, "Hi {{name}}").includes("{{name}}") ? text3.replace(/^Hi there/i, "Hi {{name}}") : `Hi {{name}},

${text3}

Contact us at {{agencyPhone}}.`;
    return fallback;
  } catch {
    return fallback;
  }
}, "generateMarketingTemplate");
var detectMarketingOpportunities = /* @__PURE__ */ __name((data) => {
  const DAY = 864e5;
  const now3 = Date.now();
  const ops = [];
  const newMaids = data.maids.filter((m) => {
    const ts = Date.parse(m.createdAt ?? "");
    return m.isPublic && Number.isFinite(ts) && now3 - ts < DAY;
  });
  if (newMaids.length > 0) ops.push({ goal: "new_arrivals", tone: "warm", audience: "all", triggerReason: `${newMaids.length} new helper(s) added in the last 24h` });
  const staleEnquiries = data.enquiries.filter((e) => {
    const ts = Date.parse(e.createdAt ?? "");
    return Number.isFinite(ts) && now3 - ts > 3 * DAY;
  });
  if (staleEnquiries.length > 0) ops.push({ goal: "follow_up", tone: "warm", audience: "enquiries", triggerReason: `${staleEnquiries.length} enquiry(ies) without follow-up for 3+ days` });
  const coldLeads = data.directSales.filter((ds) => {
    const ts = Date.parse(ds.createdAt ?? "");
    return Number.isFinite(ts) && now3 - ts > 7 * DAY;
  });
  if (coldLeads.length > 0) ops.push({ goal: "re_engage", tone: "casual", audience: "leads", triggerReason: `${coldLeads.length} lead(s) inactive for 7+ days` });
  const holidays = [
    [1, 1, "New Year"],
    [2, 14, "Valentine's Day"],
    [8, 9, "National Day"],
    [12, 25, "Christmas"],
    [12, 31, "New Year's Eve"]
  ];
  const horizon = new Date(now3 + 7 * DAY);
  for (const [m, d, name] of holidays) {
    for (const yr of [(/* @__PURE__ */ new Date()).getFullYear(), (/* @__PURE__ */ new Date()).getFullYear() + 1]) {
      const date = new Date(yr, m - 1, d);
      if (date.getTime() >= now3 && date <= horizon) {
        ops.push({ goal: "holiday", tone: "warm", audience: "all", triggerReason: `${name} is within 7 days` });
        break;
      }
    }
  }
  return ops;
}, "detectMarketingOpportunities");
var cleanPhoneForMake = /* @__PURE__ */ __name((phone) => {
  if (!phone) return "";
  const digits = phone.replace(/\D/g, "");
  return digits.length === 8 ? "65" + digits : digits;
}, "cleanPhoneForMake");
var buildAudienceMarketing = /* @__PURE__ */ __name((data, audience) => {
  const contacts = [];
  const seen = /* @__PURE__ */ new Set();
  const add = /* @__PURE__ */ __name((name, phone, email) => {
    const key = phone?.replace(/\D/g, "") || email?.toLowerCase();
    if (!key || seen.has(key)) return;
    seen.add(key);
    contacts.push({ name: name || "there", phone: phone || "", email: email || "" });
  }, "add");
  if (audience === "all" || audience === "clients") {
    for (const c of data.clients) add(c.name, c.phone ?? "", c.email);
  }
  if (audience === "all" || audience === "enquiries") {
    for (const e of data.enquiries) add(e.username, e.phone, e.email);
  }
  if (audience === "all" || audience === "leads") {
    for (const ds of data.directSales) add(ds.clientName, ds.clientPhone, ds.clientEmail);
  }
  return contacts;
}, "buildAudienceMarketing");
var runScheduledMarketing = /* @__PURE__ */ __name(async (env) => {
  const data = await loadData(env);
  const scannedAt = (/* @__PURE__ */ new Date()).toISOString();
  const nowMs = Date.now();
  const makeUrl = env.MAKE_WEBHOOK_URL?.trim();
  const agencyPhone = cleanPhoneForMake(data.companyProfile?.social_whatsapp_number?.trim() ?? data.companyProfile?.contact_phone?.trim() ?? "");
  const agencyName = data.companyProfile?.company_name?.trim() ?? data.companyProfile?.short_name?.trim() ?? "Our Agency";
  let sentLog = {};
  if (env.APP_DATA) {
    try {
      const raw2 = await env.APP_DATA.get(MARKETING_CONTACTS_KEY);
      if (raw2) sentLog = JSON.parse(raw2);
    } catch {
    }
  }
  const opportunities = detectMarketingOpportunities(data);
  const result = {
    scannedAt,
    opportunitiesFound: opportunities.length,
    campaigns: [],
    emailsTotal: 0,
    whatsappTotal: 0
  };
  if (opportunities.length === 0) {
    if (env.APP_DATA) await env.APP_DATA.put(MARKETING_LOG_KEY, JSON.stringify(result), { expirationTtl: 7 * 86400 });
    return result;
  }
  const featuredMaids = data.maids.filter((m) => m.isPublic).slice(0, 2);
  const maidHighlights = featuredMaids.map((m) => `${m.fullName} (${m.nationality})`).filter(Boolean).join(", ") || "experienced helpers";
  for (const opp of opportunities) {
    const contacts = buildAudienceMarketing(data, opp.audience);
    if (contacts.length === 0) continue;
    const meta = goalMetaMarketing(opp.goal);
    let emailsSent = 0, whatsappQueued = 0, skipped = 0;
    for (const contact of contacts) {
      const contactKey = (contact.phone?.replace(/\D/g, "") || contact.email?.toLowerCase() || "").trim();
      if (contactKey && sentLog[contactKey] && nowMs - sentLog[contactKey] < MARKETING_COOLDOWN_MS) {
        skipped++;
        continue;
      }
      let sent = false;
      if (contact.phone && makeUrl) {
        try {
          await fetch(makeUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              scenario: "whatsapp_marketing",
              to: cleanPhoneForMake(contact.phone),
              contactName: contact.name,
              goal: opp.goal,
              agencyName,
              agencyPhone,
              maidHighlights
            }),
            signal: AbortSignal.timeout(5e3)
          });
          whatsappQueued++;
          sent = true;
        } catch {
          skipped++;
        }
      } else if (contact.email) {
        if (makeUrl) {
          try {
            await fetch(makeUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                scenario: "email_marketing",
                to: contact.email,
                contactName: contact.name,
                subject: meta.subject,
                goal: opp.goal,
                agencyName,
                agencyPhone,
                maidHighlights
              }),
              signal: AbortSignal.timeout(5e3)
            });
            emailsSent++;
            sent = true;
          } catch {
            skipped++;
          }
        } else {
          const template = await generateMarketingTemplate(opp.goal, opp.tone, agencyName, agencyPhone, featuredMaids.map((m) => m.fullName), env.GROQ_API_KEY);
          const personalized = template.replace(/\{\{name\}\}/g, contact.name).replace(/\{\{agencyPhone\}\}/g, agencyPhone || agencyName);
          const emailResult = await sendEmailViaResend(env, contact.email, meta.subject, personalized);
          if (emailResult.ok) {
            emailsSent++;
            sent = true;
          } else skipped++;
        }
      } else {
        skipped++;
      }
      if (sent && contactKey) sentLog[contactKey] = nowMs;
      await new Promise((r) => setTimeout(r, 1e3));
    }
    result.campaigns.push({ goal: opp.goal, audience: opp.audience, totalContacts: contacts.length, emailsSent, whatsappQueued, skipped });
    result.emailsTotal += emailsSent;
    result.whatsappTotal += whatsappQueued;
  }
  if (env.APP_DATA) {
    const cutoff = nowMs - 30 * 864e5;
    for (const key of Object.keys(sentLog)) {
      if (sentLog[key] < cutoff) delete sentLog[key];
    }
    await env.APP_DATA.put(MARKETING_CONTACTS_KEY, JSON.stringify(sentLog), { expirationTtl: 30 * 86400 });
    await env.APP_DATA.put(MARKETING_LOG_KEY, JSON.stringify(result), { expirationTtl: 7 * 86400 });
  }
  return result;
}, "runScheduledMarketing");
app.get(
  "/api/ai/direct-marketing/autonomous/status",
  requireAgencyAdminAuth,
  safeApi(async (c) => {
    if (!c.env.APP_DATA) return c.json({ lastRun: null });
    const raw2 = await c.env.APP_DATA.get(MARKETING_LOG_KEY);
    const lastRun = raw2 ? JSON.parse(raw2) : null;
    return c.json({ lastRun });
  })
);
var runScheduledAiAutopilot = /* @__PURE__ */ __name(async (env) => {
  if (!isAiAutopilotEnabled(env)) {
    return {
      skipped: true,
      reason: "AI_AUTOPILOT_ENABLED is not true"
    };
  }
  const data = await loadData(env);
  return await runAiAutopilot({
    appData: data,
    groqApiKey: env.GROQ_API_KEY,
    supabase: getAiSupabaseConfig(env),
    maxActions: 8
  });
}, "runScheduledAiAutopilot");
app.post(
  "/api/leads/raw",
  safeApi(async (c) => {
    const body = await parseBody2(c.req.raw);
    const source = toTrimmedString(body?.source).toLowerCase() === "facebook" ? "facebook" : toTrimmedString(body?.source).toLowerCase() === "scraped" ? "scraped" : "website";
    const name = toTrimmedString(body?.name);
    const contact = toTrimmedString(body?.contact);
    const message = toTrimmedString(body?.message);
    if (!name || !contact || !message) {
      return c.json(
        buildWorkflowResponse(c.req.raw, {
          workflow: "validation_error",
          intent: "validation_error",
          fallbackUsed: true,
          data: { error: "name, contact, and message are required" }
        }),
        400
      );
    }
    const enrichment = inferLeadEnrichment(message);
    const qualification = qualifyLead(enrichment, message);
    const data = await loadData(c.env);
    const leadId = data.counters.directSales++;
    const createdAt = now2();
    data.directSales.unshift({
      id: leadId,
      maidReferenceCode: "",
      maidName: "",
      clientId: 0,
      clientName: name,
      clientEmail: WORKFLOW_EMAIL_PATTERN.test(contact) ? contact : "",
      clientPhone: WORKFLOW_EMAIL_PATTERN.test(contact) ? "" : contact,
      status: qualification.classification,
      requestDetails: {
        source,
        message,
        aiSummary: enrichment.summary
      },
      createdAt
    });
    await saveData(c.env, data);
    return c.json(
      buildWorkflowResponse(c.req.raw, {
        workflow: "lead_scoring",
        intent: "lead",
        fallbackUsed: true,
        data: {
          lead: {
            id: leadId,
            name,
            source,
            classification: qualification.classification,
            aiSummary: enrichment.summary,
            createdAt
          },
          enrichment,
          qualification,
          notification: {
            id: leadId,
            recipient: "sales-team",
            message: `New ${qualification.classification} lead received from ${source}: ${name}`
          },
          aiUsed: false
        }
      }),
      201
    );
  })
);
app.post(
  "/api/match",
  safeApi(async (c) => {
    const body = await parseBody2(c.req.raw);
    const message = toTrimmedString(body?.message);
    const data = await loadData(c.env);
    const matches = buildMatchCandidates(data.maids, message);
    return c.json(
      buildWorkflowResponse(c.req.raw, {
        workflow: "inquiry_match",
        intent: "hiring",
        fallbackUsed: true,
        data: {
          requestId: crypto.randomUUID(),
          screening: {
            valid: Boolean(message),
            missingFields: message ? [] : ["message"],
            normalized: {
              message,
              serviceType: toTrimmedString(body?.serviceType),
              location: toTrimmedString(body?.location),
              budget: toTrimmedString(body?.budget),
              salary: toTrimmedString(body?.salary),
              availability: toTrimmedString(body?.availability)
            }
          },
          vectorSearch: {
            used: Boolean(message),
            candidateCount: data.maids.filter(isAvailableMaid).length
          },
          aiUsed: false,
          fallbackUsed: true,
          matches
        }
      })
    );
  })
);
app.post(
  "/api/contracts/generate",
  safeApi(async (c) => {
    const body = await parseBody2(c.req.raw);
    const maidId = toNullableNumber(body?.maidId);
    const employerId = toNullableNumber(body?.employerId);
    if (!maidId || !employerId) {
      return c.json(
        buildWorkflowResponse(c.req.raw, {
          workflow: "validation_error",
          intent: "validation_error",
          fallbackUsed: true,
          data: { error: "maidId and employerId are required" }
        }),
        400
      );
    }
    const data = await loadData(c.env);
    const maid = data.maids.find((item) => item.id === maidId) ?? null;
    if (!maid) {
      return c.json(
        buildWorkflowResponse(c.req.raw, {
          workflow: "validation_error",
          intent: "validation_error",
          fallbackUsed: true,
          data: { error: "Maid not found" }
        }),
        404
      );
    }
    const employer = data.employers.find((item) => item.id === employerId) ?? null;
    const contractId = data.counters.employmentContracts++;
    const refCode = `WF-${formatEmployerRefCode(contractId)}`;
    const employerName = toTrimmedString(
      employer?.employer?.name
    ) || `Employer ${employerId}`;
    const contractDate = toTrimmedString(body?.scheduleDate) || now2().slice(0, 10);
    const contract = normalizeEmploymentContractRecord(
      {
        id: contractId,
        refCode,
        employerRefCode: employer?.refCode ?? refCode,
        employerId,
        maidId,
        maidReferenceCode: maid.referenceCode,
        maidName: maid.fullName,
        employerName,
        caseReferenceNumber: refCode,
        contractDate,
        serviceFee: toTrimmedString(body?.budgetText),
        placementFee: toTrimmedString(body?.budgetText),
        agencyWitness: "Helped Agency",
        employerSnapshot: employer?.employer ?? { id: employerId, name: employerName },
        maidSnapshot: JSON.parse(JSON.stringify(maid)),
        createdAt: now2(),
        updatedAt: now2()
      },
      refCode
    );
    data.employmentContracts.unshift(contract);
    await saveData(c.env, data);
    const summary = `Contract generated for ${maid.fullName} (${maid.referenceCode}) with ${employerName} in ${toTrimmedString(body?.location) || "Singapore"}.`;
    const contractText = [
      `Employment Contract Reference: ${contract.refCode}`,
      `Employer: ${employerName}`,
      `Maid: ${maid.fullName} (${maid.referenceCode})`,
      `Service Type: ${toTrimmedString(body?.serviceType) || "general_housekeeping"}`,
      `Location: ${toTrimmedString(body?.location) || "Singapore"}`,
      `Budget / Fee: ${toTrimmedString(body?.budgetText) || "To be confirmed"}`,
      `Schedule Date: ${contractDate}`
    ].join("\\n");
    return c.json(
      buildWorkflowResponse(c.req.raw, {
        workflow: "contract_creation",
        intent: "contract",
        fallbackUsed: true,
        data: {
          contract: {
            id: contract.id,
            refCode: contract.refCode,
            maidId: contract.maidId,
            employerId: contract.employerId,
            contractText,
            summary,
            createdAt: contract.createdAt
          },
          aiUsed: false
        }
      })
    );
  })
);
app.post(
  "/api/schedule",
  safeApi(async (c) => {
    const body = await parseBody2(c.req.raw);
    const maidId = toNullableNumber(body?.maidId);
    const employerId = toNullableNumber(body?.employerId);
    const datetime = toTrimmedString(body?.datetime);
    if (!maidId || !employerId || !datetime) {
      return c.json(
        buildWorkflowResponse(c.req.raw, {
          workflow: "validation_error",
          intent: "validation_error",
          fallbackUsed: true,
          data: { error: "maidId, employerId, and datetime are required" }
        }),
        400
      );
    }
    const data = await loadData(c.env);
    const maid = data.maids.find((item) => item.id === maidId) ?? null;
    if (!maid) {
      return c.json(
        buildWorkflowResponse(c.req.raw, {
          workflow: "validation_error",
          intent: "validation_error",
          fallbackUsed: true,
          data: { error: "Maid not found" }
        }),
        404
      );
    }
    return c.json(
      buildWorkflowResponse(c.req.raw, {
        workflow: "schedule_creation",
        intent: "schedule",
        fallbackUsed: false,
        data: {
          schedule: {
            id: Date.now(),
            maidId,
            employerId,
            maidName: maid.fullName,
            datetime,
            status: "scheduled",
            createdAt: now2()
          }
        }
      })
    );
  })
);
app.post(
  "/api/notify",
  safeApi(async (c) => {
    const body = await parseBody2(c.req.raw);
    const recipient = toTrimmedString(body?.recipient);
    const message = toTrimmedString(body?.message);
    if (!recipient || !message) {
      return c.json(
        buildWorkflowResponse(c.req.raw, {
          workflow: "validation_error",
          intent: "validation_error",
          fallbackUsed: true,
          data: { error: "recipient and message are required" }
        }),
        400
      );
    }
    return c.json(
      buildWorkflowResponse(c.req.raw, {
        workflow: "notification_only",
        intent: "notification",
        fallbackUsed: false,
        data: {
          notification: {
            id: Date.now(),
            channel: toTrimmedString(body?.channel) || "internal",
            recipient,
            message,
            referenceType: toTrimmedString(body?.referenceType) || "workflow",
            referenceId: toTrimmedString(body?.referenceId),
            createdAt: now2()
          }
        }
      })
    );
  })
);
app.post("/api/client-auth/register", async (c) => {
  const body = await parseBody2(c.req.raw);
  if (!body?.name?.trim() || !body.email?.trim() || !body.password?.trim()) {
    return c.json({ error: "name, email, and password are required" }, 400);
  }
  const data = await loadData(c.env);
  const email = body.email.trim();
  const normalizedEmail = normalizeEmail(email);
  const existing = data.clients.find(
    (client2) => normalizeEmail(client2.email) === normalizedEmail
  );
  if (existing) {
    if (existing.emailVerified !== false) {
      return c.json({ error: "Client email already exists" }, 409);
    }
    const code2 = generateSixDigitCode();
    existing.emailVerificationCodeHash = await sha256Hex(
      `${normalizedEmail}:${code2}`
    );
    existing.emailVerificationSentAt = now2();
    existing.emailVerificationExpiresAt = new Date(
      Date.now() + 15 * 60 * 1e3
    ).toISOString();
    const emailResult2 = await sendConfirmationCodeEmail(c.env, {
      to: email,
      code: code2,
      purpose: "client"
    });
    await saveData(c.env, data);
    return c.json(
      {
        requiresConfirmation: true,
        email: existing.email,
        delivery: emailResult2.ok ? "sent" : "not_configured",
        devConfirmationCode: shouldExposeDevConfirmationCode(c.env) ? code2 : void 0
      },
      202
    );
  }
  const code = generateSixDigitCode();
  const client = {
    id: data.counters.clients++,
    name: body.name.trim(),
    company: body.company?.trim() ?? "",
    phone: body.phone?.trim() ?? "",
    email,
    password: await hashPassword(body.password.trim()),
    profileImageUrl: "",
    createdAt: now2(),
    emailVerified: false,
    emailVerificationCodeHash: await sha256Hex(`${normalizedEmail}:${code}`),
    emailVerificationSentAt: now2(),
    emailVerificationExpiresAt: new Date(
      Date.now() + 15 * 60 * 1e3
    ).toISOString()
  };
  data.clients.unshift(client);
  const emailResult = await sendConfirmationCodeEmail(c.env, {
    to: email,
    code,
    purpose: "client"
  });
  await saveData(c.env, data);
  return c.json(
    {
      requiresConfirmation: true,
      email: client.email,
      delivery: emailResult.ok ? "sent" : "not_configured",
      devConfirmationCode: shouldExposeDevConfirmationCode(c.env) ? code : void 0
    },
    202
  );
});
app.post("/api/client-auth/confirm", async (c) => {
  const body = await parseBody2(c.req.raw);
  if (!body?.email?.trim() || !body.code?.trim()) {
    return c.json({ error: "email and code are required" }, 400);
  }
  const email = body.email.trim();
  const normalizedEmail = normalizeEmail(email);
  const code = body.code.trim();
  const data = await loadData(c.env);
  const client = data.clients.find(
    (item) => normalizeEmail(item.email) === normalizedEmail
  );
  if (!client) {
    return c.json({ error: "Client not found" }, 404);
  }
  if (client.emailVerified !== false) {
    const session2 = {
      token: crypto.randomUUID(),
      clientId: client.id,
      createdAt: now2(),
      expiresAt: new Date(Date.now() + CLIENT_SESSION_TTL_MS).toISOString()
    };
    data.clientSessions = data.clientSessions.filter(
      (item) => item.clientId !== client.id
    );
    data.clientSessions.unshift(session2);
    await saveData(c.env, data);
    return c.json({ token: session2.token, client: toSafeClient(client) }, 200);
  }
  if (!client.emailVerificationCodeHash || !client.emailVerificationExpiresAt) {
    return c.json({ error: "No confirmation code requested yet" }, 400);
  }
  if (Date.now() > new Date(client.emailVerificationExpiresAt).getTime()) {
    return c.json({ error: "Confirmation code expired" }, 400);
  }
  const expected = await sha256Hex(`${normalizedEmail}:${code}`);
  if (expected !== client.emailVerificationCodeHash) {
    return c.json({ error: "Invalid confirmation code" }, 400);
  }
  client.emailVerified = true;
  client.emailVerificationCodeHash = void 0;
  client.emailVerificationExpiresAt = void 0;
  client.emailVerificationSentAt = void 0;
  const session = {
    token: crypto.randomUUID(),
    clientId: client.id,
    createdAt: now2()
  };
  data.clientSessions = data.clientSessions.filter(
    (item) => item.clientId !== client.id
  );
  data.clientSessions.unshift(session);
  await saveData(c.env, data);
  return c.json({ token: session.token, client: toSafeClient(client) }, 200);
});
app.post("/api/client-auth/resend", async (c) => {
  const body = await parseBody2(c.req.raw);
  if (!body?.email?.trim()) {
    return c.json({ error: "email is required" }, 400);
  }
  const email = body.email.trim();
  const normalizedEmail = normalizeEmail(email);
  const data = await loadData(c.env);
  const client = data.clients.find(
    (item) => normalizeEmail(item.email) === normalizedEmail
  );
  if (!client) {
    return c.json({ error: "Client not found" }, 404);
  }
  if (client.emailVerified !== false) {
    return c.json({ error: "Client already verified" }, 400);
  }
  const code = generateSixDigitCode();
  client.emailVerificationCodeHash = await sha256Hex(
    `${normalizedEmail}:${code}`
  );
  client.emailVerificationSentAt = now2();
  client.emailVerificationExpiresAt = new Date(
    Date.now() + 15 * 60 * 1e3
  ).toISOString();
  const emailResult = await sendConfirmationCodeEmail(c.env, {
    to: email,
    code,
    purpose: "client"
  });
  await saveData(c.env, data);
  return c.json({
    requiresConfirmation: true,
    email: client.email,
    delivery: emailResult.ok ? "sent" : "not_configured",
    devConfirmationCode: shouldExposeDevConfirmationCode(c.env) ? code : void 0
  });
});
app.post("/api/client-auth/login", async (c) => {
  const body = await parseBody2(
    c.req.raw
  );
  if (!body?.email?.trim() || !body.password?.trim()) {
    return c.json({ error: "email and password are required" }, 400);
  }
  const data = await loadData(c.env);
  const normalizedEmail = normalizeEmail(body.email);
  const clientMatch = data.clients.find(
    (item) => normalizeEmail(item.email) === normalizedEmail
  );
  if (!clientMatch || !await verifyPassword(body.password.trim(), clientMatch.password)) {
    return c.json({ error: "Invalid email or password" }, 401);
  }
  if (!clientMatch.password.startsWith("pbkdf2:")) {
    clientMatch.password = await hashPassword(body.password.trim());
    await saveData(c.env, data);
  }
  const client = clientMatch;
  if (client.emailVerified === false) {
    return c.json(
      {
        error: "EMAIL_NOT_VERIFIED",
        requiresConfirmation: true,
        email: client.email
      },
      403
    );
  }
  const session = {
    token: crypto.randomUUID(),
    clientId: client.id,
    createdAt: now2()
  };
  data.clientSessions = data.clientSessions.filter(
    (item) => item.clientId !== client.id
  );
  data.clientSessions.unshift(session);
  await saveData(c.env, data);
  return c.json({ token: session.token, client: toSafeClient(client) });
});
app.get("/api/client-auth/me", requireClientAuth, async (c) => {
  return c.json({ client: toSafeClient(c.get("client")) });
});
app.put("/api/client-auth/me", requireClientAuth, async (c) => {
  const body = await parseBody2(c.req.raw);
  if (!body?.name?.trim() || !body.email?.trim()) {
    return c.json({ error: "name and email are required" }, 400);
  }
  const currentClient = c.get("client");
  const data = await loadData(c.env);
  const duplicate = data.clients.find(
    (item) => item.id !== currentClient.id && item.email.toLowerCase() === body.email.trim().toLowerCase()
  );
  if (duplicate) {
    return c.json({ error: "Client email already exists" }, 409);
  }
  const index = data.clients.findIndex((item) => item.id === currentClient.id);
  data.clients[index] = {
    ...data.clients[index],
    name: body.name.trim(),
    company: typeof body.company === "string" ? body.company.trim() : data.clients[index].company,
    phone: typeof body.phone === "string" ? body.phone.trim() : data.clients[index].phone ?? "",
    email: body.email.trim(),
    profileImageUrl: typeof body.profileImageUrl === "string" ? body.profileImageUrl : data.clients[index].profileImageUrl
  };
  data.directSales = data.directSales.map(
    (sale) => sale.clientId === currentClient.id ? {
      ...sale,
      clientName: data.clients[index].name,
      clientEmail: data.clients[index].email,
      clientPhone: data.clients[index].phone || ""
    } : sale
  );
  await saveData(c.env, data);
  return c.json({ client: toSafeClient(data.clients[index]) });
});
app.post("/api/client-auth/logout", requireClientAuth, async (c) => {
  const token = parseAuthorizationToken(c.req.raw);
  const data = await loadData(c.env);
  data.clientSessions = data.clientSessions.filter(
    (item) => item.token !== token
  );
  await saveData(c.env, data);
  return c.json({ message: "Logged out successfully" });
});
var kvWhatsAppKey = /* @__PURE__ */ __name((ref) => `whatsapp:${ref}`, "kvWhatsAppKey");
var loadWaStore = /* @__PURE__ */ __name(async (kv, ref, maidName) => {
  const raw2 = await kv.get(kvWhatsAppKey(ref));
  if (raw2) return JSON.parse(raw2);
  const ts = now2();
  return {
    conversation: {
      id: `wa-${ref}`,
      candidateReferenceCode: ref,
      candidateName: maidName,
      phoneNumber: "",
      currentStage: "New Applicant",
      nextStep: "Review and send introduction message",
      tags: [],
      unreadRecruiterCount: 0,
      unreadApplicantCount: 0,
      lastMessageAt: ts,
      lastMessagePreview: "",
      status: "active",
      aiEnabled: false,
      documentChecklist: [],
      createdAt: ts,
      updatedAt: ts
    },
    messages: [],
    events: []
  };
}, "loadWaStore");
var saveWaStore = /* @__PURE__ */ __name(async (kv, ref, store) => {
  await kv.put(kvWhatsAppKey(ref), JSON.stringify(store));
}, "saveWaStore");
var buildWaBundle = /* @__PURE__ */ __name((store, maid) => ({
  conversation: store.conversation,
  candidate: { referenceCode: maid.referenceCode, fullName: maid.fullName, agencyId: maid.agencyId },
  messages: store.messages,
  templates: [],
  events: store.events
}), "buildWaBundle");
app.get(
  "/api/whatsapp/candidates/:referenceCode",
  requireAgencyAdminAuth,
  safeApi(async (c) => {
    if (!c.env.APP_DATA || isKvBackend(c.env) === false) return c.json({ error: "WhatsApp feature requires KV storage (set STORAGE_BACKEND=kv and bind APP_DATA)" }, 503);
    const ref = normalizeReferenceCode(c.req.param("referenceCode"));
    const data = await loadData(c.env, { readOnly: true });
    const maid = data.maids.find((m) => m.referenceCode === ref);
    if (!maid) return c.json({ error: "Maid not found" }, 404);
    const store = await loadWaStore(c.env.APP_DATA, ref, maid.fullName);
    return c.json(buildWaBundle(store, maid));
  })
);
app.post(
  "/api/whatsapp/candidates/:referenceCode/messages",
  requireAgencyAdminAuth,
  safeApi(async (c) => {
    if (!c.env.APP_DATA || isKvBackend(c.env) === false) return c.json({ error: "WhatsApp feature requires KV storage (set STORAGE_BACKEND=kv and bind APP_DATA)" }, 503);
    const ref = normalizeReferenceCode(c.req.param("referenceCode"));
    const body = await parseBody2(c.req.raw);
    const data = await loadData(c.env, { readOnly: true });
    const maid = data.maids.find((m) => m.referenceCode === ref);
    if (!maid) return c.json({ error: "Maid not found" }, 404);
    const store = await loadWaStore(c.env.APP_DATA, ref, maid.fullName);
    const admin = c.get("agencyAdmin");
    const message = {
      id: crypto.randomUUID(),
      direction: "outgoing",
      status: "queued",
      type: body?.templateKey ? "template" : "text",
      senderName: admin.username || "Agency Staff",
      senderRole: "recruiter",
      text: toTrimmedString(body?.text),
      templateKey: body?.templateKey ? toTrimmedString(body.templateKey) : void 0,
      automated: false,
      createdAt: now2(),
      attachments: []
    };
    store.messages.push(message);
    store.conversation.lastMessageAt = message.createdAt;
    store.conversation.lastMessagePreview = message.text.slice(0, 100);
    store.conversation.updatedAt = message.createdAt;
    await saveWaStore(c.env.APP_DATA, ref, store);
    return c.json(buildWaBundle(store, maid));
  })
);
app.patch(
  "/api/whatsapp/candidates/:referenceCode/stage",
  requireAgencyAdminAuth,
  safeApi(async (c) => {
    if (!c.env.APP_DATA || isKvBackend(c.env) === false) return c.json({ error: "WhatsApp feature requires KV storage (set STORAGE_BACKEND=kv and bind APP_DATA)" }, 503);
    const ref = normalizeReferenceCode(c.req.param("referenceCode"));
    const body = await parseBody2(c.req.raw);
    const data = await loadData(c.env, { readOnly: true });
    const maid = data.maids.find((m) => m.referenceCode === ref);
    if (!maid) return c.json({ error: "Maid not found" }, 404);
    const store = await loadWaStore(c.env.APP_DATA, ref, maid.fullName);
    const ts = now2();
    if (body?.stage) {
      store.conversation.currentStage = body.stage;
      store.conversation.updatedAt = ts;
      if (body.interviewSchedule) store.conversation.interviewSchedule = body.interviewSchedule;
      store.events.push({ id: crypto.randomUUID(), type: "stage_change", detail: `Stage updated to ${body.stage}`, createdAt: ts });
    }
    await saveWaStore(c.env.APP_DATA, ref, store);
    return c.json(buildWaBundle(store, maid));
  })
);
app.post(
  "/api/whatsapp/inbound",
  requireAgencyAdminAuth,
  safeApi(async (c) => {
    if (!c.env.APP_DATA) return c.json({ ok: true });
    const body = await parseBody2(c.req.raw);
    const ref = toTrimmedString(body?.candidateReferenceCode);
    if (!ref) return c.json({ ok: true });
    const data = await loadData(c.env, { readOnly: true });
    const maid = data.maids.find((m) => m.referenceCode === ref);
    if (!maid) return c.json({ ok: true });
    const store = await loadWaStore(c.env.APP_DATA, ref, maid.fullName);
    const ts = now2();
    const message = {
      id: crypto.randomUUID(),
      direction: "incoming",
      status: "delivered",
      type: "text",
      senderName: toTrimmedString(body?.applicantName) || maid.fullName,
      senderRole: "applicant",
      text: toTrimmedString(body?.text),
      automated: false,
      createdAt: ts,
      attachments: []
    };
    store.messages.push(message);
    store.conversation.lastMessageAt = ts;
    store.conversation.lastMessagePreview = message.text.slice(0, 100);
    store.conversation.unreadRecruiterCount += 1;
    store.conversation.updatedAt = ts;
    await saveWaStore(c.env.APP_DATA, ref, store);
    return c.json({ ok: true });
  })
);
app.get(
  "/api/whatsapp/dashboard/metrics",
  requireAgencyAdminAuth,
  safeApi(async (c) => {
    return c.json({
      messagesSent: 0,
      messagesDelivered: 0,
      messagesRead: 0,
      responseRate: 0,
      averageResponseTimeMinutes: 0,
      activeConversations: 0,
      pendingReplies: 0,
      interviewConfirmations: 0,
      documentSubmissionRate: 0
    });
  })
);
app.post("/api/agency-auth/register", async (c) => {
  const body = await parseBody2(c.req.raw);
  if (!body?.username?.trim() || !body.password?.trim() || !body.agencyName?.trim()) {
    return c.json(
      { error: "username, password, and agencyName are required" },
      400
    );
  }
  const emailFromBody = body.email?.trim() ?? "";
  const fallbackEmail = isEmailLike(body.username) ? body.username.trim() : "";
  const email = emailFromBody || fallbackEmail;
  if (!email) {
    return c.json({ error: "email is required for agency signup" }, 400);
  }
  const data = await loadData(c.env);
  const normalizedEmail = normalizeEmail(email);
  const normalizedUsername = body.username.trim().toLowerCase();
  const existingByUsername = data.agencyAdmins.find(
    (admin2) => admin2.username.toLowerCase() === normalizedUsername
  );
  const existingByEmail = data.agencyAdmins.find(
    (admin2) => normalizeEmail(admin2.email ?? "") === normalizedEmail
  );
  const existing = existingByUsername ?? existingByEmail;
  if (existing) {
    if (existing.emailVerified !== false) {
      return c.json({ error: "Agency admin already exists" }, 409);
    }
    const code2 = generateSixDigitCode();
    existing.email = email;
    existing.emailVerificationCodeHash = await sha256Hex(
      `${normalizedEmail}:${code2}`
    );
    existing.emailVerificationSentAt = now2();
    existing.emailVerificationExpiresAt = new Date(
      Date.now() + 15 * 60 * 1e3
    ).toISOString();
    const emailResult2 = await sendConfirmationCodeEmail(c.env, {
      to: email,
      code: code2,
      purpose: "agency"
    });
    await saveData(c.env, data);
    return c.json(
      {
        requiresConfirmation: true,
        email,
        delivery: emailResult2.ok ? "sent" : "not_configured",
        devConfirmationCode: shouldExposeDevConfirmationCode(c.env) ? code2 : void 0
      },
      202
    );
  }
  const code = generateSixDigitCode();
  const admin = {
    id: data.counters.agencyAdmins++,
    agencyId: 1,
    username: body.username.trim(),
    email,
    password: await hashPassword(body.password.trim()),
    agencyName: body.agencyName.trim(),
    createdAt: now2(),
    emailVerified: false,
    emailVerificationCodeHash: await sha256Hex(`${normalizedEmail}:${code}`),
    emailVerificationSentAt: now2(),
    emailVerificationExpiresAt: new Date(
      Date.now() + 15 * 60 * 1e3
    ).toISOString()
  };
  data.agencyAdmins.unshift(admin);
  const emailResult = await sendConfirmationCodeEmail(c.env, {
    to: email,
    code,
    purpose: "agency"
  });
  await saveData(c.env, data);
  return c.json(
    {
      requiresConfirmation: true,
      email,
      delivery: emailResult.ok ? "sent" : "not_configured",
      devConfirmationCode: shouldExposeDevConfirmationCode(c.env) ? code : void 0
    },
    202
  );
});
app.post("/api/agency-auth/confirm", async (c) => {
  const body = await parseBody2(c.req.raw);
  if (!body?.email?.trim() || !body.code?.trim()) {
    return c.json({ error: "email and code are required" }, 400);
  }
  const email = body.email.trim();
  const normalizedEmail = normalizeEmail(email);
  const code = body.code.trim();
  const data = await loadData(c.env);
  const admin = data.agencyAdmins.find(
    (item) => normalizeEmail(item.email ?? "") === normalizedEmail
  );
  if (!admin) {
    return c.json({ error: "Agency admin not found" }, 404);
  }
  if (admin.emailVerified !== false) {
    const session2 = await createAgencyAdminSession(c.env, admin);
    return c.json(
      { token: session2.token, admin: toSafeAgencyAdmin(admin) },
      200
    );
  }
  if (!admin.emailVerificationCodeHash || !admin.emailVerificationExpiresAt) {
    return c.json({ error: "No confirmation code requested yet" }, 400);
  }
  if (Date.now() > new Date(admin.emailVerificationExpiresAt).getTime()) {
    return c.json({ error: "Confirmation code expired" }, 400);
  }
  const expected = await sha256Hex(`${normalizedEmail}:${code}`);
  if (expected !== admin.emailVerificationCodeHash) {
    return c.json({ error: "Invalid confirmation code" }, 400);
  }
  admin.emailVerified = true;
  admin.emailVerificationCodeHash = void 0;
  admin.emailVerificationExpiresAt = void 0;
  admin.emailVerificationSentAt = void 0;
  const session = {
    token: crypto.randomUUID(),
    adminId: admin.id,
    admin: toSafeAgencyAdmin(admin),
    createdAt: now2()
  };
  await saveAgencyAdminChangesWithSession(c.env, data, session);
  return c.json({ token: session.token, admin: toSafeAgencyAdmin(admin) }, 200);
});
app.post("/api/agency-auth/resend", async (c) => {
  const body = await parseBody2(c.req.raw);
  if (!body?.email?.trim()) {
    return c.json({ error: "email is required" }, 400);
  }
  const email = body.email.trim();
  const normalizedEmail = normalizeEmail(email);
  const data = await loadData(c.env);
  const admin = data.agencyAdmins.find(
    (item) => normalizeEmail(item.email ?? "") === normalizedEmail
  );
  if (!admin) {
    return c.json({ error: "Agency admin not found" }, 404);
  }
  if (admin.emailVerified !== false) {
    return c.json({ error: "Agency admin already verified" }, 400);
  }
  const code = generateSixDigitCode();
  admin.emailVerificationCodeHash = await sha256Hex(
    `${normalizedEmail}:${code}`
  );
  admin.emailVerificationSentAt = now2();
  admin.emailVerificationExpiresAt = new Date(
    Date.now() + 15 * 60 * 1e3
  ).toISOString();
  const emailResult = await sendConfirmationCodeEmail(c.env, {
    to: email,
    code,
    purpose: "agency"
  });
  await saveData(c.env, data);
  return c.json({
    requiresConfirmation: true,
    email,
    delivery: emailResult.ok ? "sent" : "not_configured",
    devConfirmationCode: shouldExposeDevConfirmationCode(c.env) ? code : void 0
  });
});
app.post(
  "/api/agency-auth/login",
  safeApi(async (c) => {
    const body = await parseBody2(
      c.req.raw
    );
    if (!body) {
      return c.json({ error: "Invalid JSON body" }, 400);
    }
    if (!body?.username?.trim() || !body.password?.trim()) {
      return c.json({ error: "username and password are required" }, 400);
    }
    let agencyAdmins;
    try {
      agencyAdmins = await loadAgencyAdminAuthData(c.env);
    } catch (error) {
      console.error("/api/agency-auth/login loadData error:", error);
      return c.json({ error: "Storage unavailable" }, 500);
    }
    const usernameOrEmail = body.username.trim();
    const normalizedIdentifier = usernameOrEmail.toLowerCase();
    const normalizedEmail = isEmailLike(usernameOrEmail) ? normalizeEmail(usernameOrEmail) : "";
    const password = body.password.trim();
    const adminMatch = agencyAdmins.find((item) => {
      const username = typeof item.username === "string" ? item.username.trim().toLowerCase() : "";
      const email = typeof item.email === "string" ? normalizeEmail(item.email) : "";
      return username === normalizedIdentifier || normalizedEmail && email === normalizedEmail;
    });
    if (!adminMatch || !await verifyPassword(password, adminMatch.password)) {
      return c.json({ error: "Invalid username or password" }, 401);
    }
    if (!adminMatch.password.startsWith("pbkdf2:")) {
      const newHash = await hashPassword(password);
      const fullData = await loadData(c.env);
      const storedAdmin = fullData.agencyAdmins.find((a) => a.id === adminMatch.id);
      if (storedAdmin) {
        storedAdmin.password = newHash;
        await saveData(c.env, fullData);
      }
    }
    const admin = adminMatch;
    if (admin.email && admin.emailVerified === false) {
      return c.json(
        {
          error: "EMAIL_NOT_VERIFIED",
          requiresConfirmation: true,
          email: admin.email
        },
        403
      );
    }
    const session = await createAgencyAdminSession(c.env, admin);
    return c.json({ token: session.token, admin: toSafeAgencyAdmin(admin) });
  })
);
app.get("/api/agency-auth/me", requireAgencyAdminAuth, async (c) => {
  return c.json({ admin: toSafeAgencyAdmin(c.get("agencyAdmin")) });
});
app.post("/api/agency-auth/logout", requireAgencyAdminAuth, async (c) => {
  const token = parseAuthorizationToken(c.req.raw);
  if (!token) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  await deleteAgencyAdminSession(c.env, token);
  return c.json({ message: "Logged out successfully" });
});
app.get("/api/client/my-maids", requireClientAuth, async (c) => {
  const client = c.get("client");
  const data = await loadData(c.env);
  const assignments = data.directSales.filter((sale) => sale.clientId === client.id).map((sale) => ({
    directSale: sale,
    maid: data.maids.find(
      (maid) => maid.referenceCode === sale.maidReferenceCode
    ) ?? null
  })).filter(
    (item) => Boolean(item.maid)
  );
  return c.json({ assignments });
});
app.get("/api/client/history", requireClientAuth, async (c) => {
  const client = c.get("client");
  const data = await loadData(c.env);
  const history = data.directSales.filter((sale) => sale.clientId === client.id).map((sale) => ({
    directSale: sale,
    maid: data.maids.find(
      (maid) => maid.referenceCode === sale.maidReferenceCode
    ) ?? null
  })).sort(
    (left, right) => new Date(right.directSale.createdAt).getTime() - new Date(left.directSale.createdAt).getTime()
  );
  return c.json({ history });
});
app.patch(
  "/api/client/direct-sales/:id/:action",
  requireClientAuth,
  async (c) => {
    const id = Number(c.req.param("id"));
    const action = c.req.param("action");
    if (!Number.isInteger(id)) {
      return c.json({ error: "Valid direct sale id is required" }, 400);
    }
    if (!["interested", "direct-hire", "reject"].includes(action)) {
      return c.json({ error: "Invalid action" }, 400);
    }
    const status = action === "direct-hire" ? "direct_hire" : action === "reject" ? "rejected" : "interested";
    const client = c.get("client");
    const data = await loadData(c.env);
    const saleIndex = data.directSales.findIndex(
      (sale) => sale.id === id && sale.clientId === client.id
    );
    if (saleIndex === -1) {
      return c.json(
        { error: "Assigned direct sale not found for this client" },
        404
      );
    }
    data.directSales[saleIndex] = {
      ...data.directSales[saleIndex],
      status
    };
    const maidIndex = data.maids.findIndex(
      (maid2) => maid2.referenceCode === data.directSales[saleIndex].maidReferenceCode
    );
    const maid = maidIndex === -1 ? null : data.maids[maidIndex] = {
      ...data.maids[maidIndex],
      status: status === "interested" ? "interested" : status === "direct_hire" ? "reserved" : "rejected",
      updatedAt: now2()
    };
    await saveData(c.env, data);
    return c.json({
      directSale: data.directSales[saleIndex],
      maid
    });
  }
);
app.get("/api/direct-sales", requireAgencyAdminAuth, async (c) => {
  const page = Math.max(1, Number(c.req.query("page") ?? "1") || 1);
  const pageSize = Math.min(100, Math.max(1, Number(c.req.query("pageSize") ?? "50") || 50));
  const data = await loadData(c.env, { readOnly: true });
  const sorted = [...data.directSales].sort(
    (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
  );
  const total = sorted.length;
  const paged = sorted.slice((page - 1) * pageSize, page * pageSize);
  return c.json({ directSales: paged, total, page, pageSize });
});
app.get("/api/direct-sales/clients", requireAgencyAdminAuth, async (c) => {
  const data = await loadData(c.env, { readOnly: true });
  const clients = [...data.clients].sort((left, right) => right.id - left.id).map((client) => ({
    id: client.id,
    name: client.name,
    email: client.email,
    company: client.company || "",
    phone: client.phone || "",
    enquiryDate: client.createdAt
  }));
  return c.json({ clients });
});
app.post("/api/direct-sales", requireAgencyAdminAuth, async (c) => {
  const body = await parseBody2(c.req.raw);
  if (!body?.referenceCode?.trim()) {
    return c.json({ error: "referenceCode is required" }, 400);
  }
  if (!Number.isInteger(body.clientId)) {
    return c.json({ error: "clientId is required" }, 400);
  }
  if (body.referenceCode.length > 100) {
    return c.json({ error: "Input exceeds maximum allowed length" }, 400);
  }
  if (body.formData && JSON.stringify(body.formData).length > 1e4) {
    return c.json({ error: "Form data exceeds maximum allowed size" }, 400);
  }
  const request = new Request(
    new URL(
      `/api/direct-sales/${encodeURIComponent(body.referenceCode.trim())}`,
      c.req.url
    ),
    {
      method: "POST",
      headers: c.req.raw.headers,
      body: JSON.stringify({
        clientId: body.clientId,
        status: body.status,
        formData: body.formData
      })
    }
  );
  return app.fetch(request, c.env);
});
app.post("/api/direct-sales/:referenceCode", requireAgencyAdminAuth, async (c) => {
  const body = await parseBody2(c.req.raw);
  if (!body) {
    return c.json({ error: "Invalid JSON body" }, 400);
  }
  if (!Number.isInteger(body.clientId)) {
    return c.json({ error: "clientId is required" }, 400);
  }
  const referenceCode = c.req.param("referenceCode").trim();
  if (!referenceCode) {
    return c.json({ error: "referenceCode is required" }, 400);
  }
  const data = await loadData(c.env);
  const maidIndex = data.maids.findIndex(
    (maid) => maid.referenceCode === referenceCode
  );
  if (maidIndex === -1) {
    return c.json({ error: "Maid not found" }, 404);
  }
  const client = data.clients.find((item) => item.id === Number(body.clientId));
  if (!client) {
    return c.json({ error: "Client not found" }, 404);
  }
  const normalizedStatus = body.status === "interested" ? "interested" : body.status === "direct_hire" ? "direct_hire" : body.status === "rejected" ? "rejected" : "pending";
  const directSale = {
    id: data.counters.directSales++,
    maidReferenceCode: referenceCode,
    maidName: data.maids[maidIndex].fullName,
    clientId: client.id,
    clientName: client.name,
    clientEmail: client.email,
    clientPhone: client.phone || "",
    status: normalizedStatus,
    requestDetails: body.formData,
    createdAt: now2()
  };
  data.directSales.unshift(directSale);
  data.maids[maidIndex] = {
    ...data.maids[maidIndex],
    status: normalizedStatus === "interested" ? "interested" : normalizedStatus === "direct_hire" ? "reserved" : normalizedStatus === "rejected" ? "rejected" : "sent",
    updatedAt: now2()
  };
  await saveData(c.env, data);
  return c.json({ directSale, maid: data.maids[maidIndex] }, 201);
});
app.patch("/api/direct-sales/:id/interested", requireAgencyAdminAuth, async (c) => {
  const id = Number(c.req.param("id"));
  if (!Number.isInteger(id)) {
    return c.json({ error: "Valid direct sale id is required" }, 400);
  }
  const data = await loadData(c.env);
  const saleIndex = data.directSales.findIndex((sale) => sale.id === id);
  if (saleIndex === -1) {
    return c.json({ error: "Direct sale not found" }, 404);
  }
  data.directSales[saleIndex].status = "interested";
  const maidIndex = data.maids.findIndex(
    (maid2) => maid2.referenceCode === data.directSales[saleIndex].maidReferenceCode
  );
  const maid = maidIndex === -1 ? null : data.maids[maidIndex] = {
    ...data.maids[maidIndex],
    status: "interested",
    updatedAt: now2()
  };
  await saveData(c.env, data);
  return c.json({ directSale: data.directSales[saleIndex], maid });
});
app.patch("/api/direct-sales/:id/direct-hire", requireAgencyAdminAuth, async (c) => {
  const id = Number(c.req.param("id"));
  if (!Number.isInteger(id)) {
    return c.json({ error: "Valid direct sale id is required" }, 400);
  }
  const data = await loadData(c.env);
  const saleIndex = data.directSales.findIndex((sale) => sale.id === id);
  if (saleIndex === -1) {
    return c.json({ error: "Direct sale not found" }, 404);
  }
  data.directSales[saleIndex].status = "direct_hire";
  const maidIndex = data.maids.findIndex(
    (maid2) => maid2.referenceCode === data.directSales[saleIndex].maidReferenceCode
  );
  const maid = maidIndex === -1 ? null : data.maids[maidIndex] = {
    ...data.maids[maidIndex],
    status: "reserved",
    updatedAt: now2()
  };
  await saveData(c.env, data);
  return c.json({ directSale: data.directSales[saleIndex], maid });
});
app.patch("/api/direct-sales/:id/reject", requireAgencyAdminAuth, async (c) => {
  const id = Number(c.req.param("id"));
  if (!Number.isInteger(id)) {
    return c.json({ error: "Valid direct sale id is required" }, 400);
  }
  const data = await loadData(c.env);
  const saleIndex = data.directSales.findIndex((sale) => sale.id === id);
  if (saleIndex === -1) {
    return c.json({ error: "Direct sale not found" }, 404);
  }
  data.directSales[saleIndex].status = "rejected";
  const maidIndex = data.maids.findIndex(
    (maid2) => maid2.referenceCode === data.directSales[saleIndex].maidReferenceCode
  );
  const maid = maidIndex === -1 ? null : data.maids[maidIndex] = {
    ...data.maids[maidIndex],
    status: "rejected",
    updatedAt: now2()
  };
  await saveData(c.env, data);
  return c.json({ directSale: data.directSales[saleIndex], maid });
});
var CHAT_PRESENCE_WINDOW_SECONDS = 40;
var loadChatPresence = /* @__PURE__ */ __name(async (env) => {
  const config = getSupabaseAppDataConfig(env);
  if (!config) return { clients: [], agencies: [], anyAdmin: false };
  const result = await tryCallSupabaseRpc(
    config,
    "get_helped_presence",
    { p_app_id: config.rowId, p_window_seconds: CHAT_PRESENCE_WINDOW_SECONDS }
  );
  return {
    clients: Array.isArray(result?.clients) ? result.clients.map(Number) : [],
    agencies: Array.isArray(result?.agencies) ? result.agencies.map(Number) : [],
    anyAdmin: Boolean(result?.anyAdmin)
  };
}, "loadChatPresence");
var touchChatPresence = /* @__PURE__ */ __name(async (env, actorType, actorId, agencyId) => {
  const config = getSupabaseAppDataConfig(env);
  if (!config) return;
  await tryCallSupabaseRpc(config, "helped_presence_touch", {
    p_app_id: config.rowId,
    p_actor_type: actorType,
    p_actor_id: actorId,
    p_agency_id: typeof agencyId === "number" ? agencyId : null
  });
}, "touchChatPresence");
var markChatPresenceOffline = /* @__PURE__ */ __name(async (env, actorType, actorId) => {
  const config = getSupabaseAppDataConfig(env);
  if (!config) return;
  await tryCallSupabaseRpc(config, "helped_presence_offline", {
    p_app_id: config.rowId,
    p_actor_type: actorType,
    p_actor_id: actorId
  });
}, "markChatPresenceOffline");
var isAgencyOnlineFor = /* @__PURE__ */ __name((presence, conversationType, agencyId) => {
  if (typeof agencyId === "number" && presence.agencies.includes(agencyId)) {
    return true;
  }
  return conversationType === "support" ? presence.anyAdmin : false;
}, "isAgencyOnlineFor");
var runChatBackgroundTask = /* @__PURE__ */ __name((c, task) => {
  const guarded = task.catch((error) => {
    console.warn("Chat background task failed", error);
  });
  try {
    c.executionCtx?.waitUntil?.(guarded);
  } catch {
    void guarded;
  }
}, "runChatBackgroundTask");
var markAdminConversationRead = /* @__PURE__ */ __name(async (env, clientId, conversationType, agencyId) => {
  const data = await loadData(env);
  let changed = false;
  data.chatMessages = data.chatMessages.map((message) => {
    if (message.clientId === clientId && message.senderRole === "client" && message.conversationType === conversationType && (conversationType === "support" || message.agencyId === agencyId) && !message.readByAgency) {
      changed = true;
      return { ...message, readByAgency: true };
    }
    return message;
  });
  if (changed) await saveData(env, data);
}, "markAdminConversationRead");
var markClientConversationRead = /* @__PURE__ */ __name(async (env, clientId, conversationType, agencyId) => {
  const data = await loadData(env);
  let changed = false;
  data.chatMessages = data.chatMessages.map((message) => {
    if (message.clientId === clientId && message.senderRole === "agency" && message.conversationType === conversationType && (conversationType === "support" || message.agencyId === agencyId) && !message.readByClient) {
      changed = true;
      return { ...message, readByClient: true };
    }
    return message;
  });
  if (changed) await saveData(env, data);
}, "markClientConversationRead");
var loadChatMessagesAfter = /* @__PURE__ */ __name(async (env, config, afterId, scope = {}) => {
  if (config) {
    const fast = await tryCallSupabaseRpc(
      config,
      "get_helped_chat_messages_after",
      {
        p_app_id: config.rowId,
        p_after_id: afterId,
        p_client_id: scope.clientId ?? null,
        p_conversation_type: scope.conversationType ?? null,
        p_agency_id: scope.agencyId ?? null
      }
    );
    if (fast) return fast;
  }
  const data = await loadData(env, { readOnly: true });
  return data.chatMessages.filter(
    (message) => message.id > afterId && (scope.clientId == null || message.clientId === scope.clientId) && (scope.conversationType == null || message.conversationType === scope.conversationType) && (scope.agencyId == null || message.agencyId === scope.agencyId)
  ).sort((left, right) => left.id - right.id);
}, "loadChatMessagesAfter");
var loadChatLastId = /* @__PURE__ */ __name(async (env, clientId) => {
  const config = getSupabaseAppDataConfig(env);
  if (config) {
    const fast = await tryCallSupabaseRpc(
      config,
      "get_helped_chat_last_id",
      { p_app_id: config.rowId, p_client_id: clientId ?? null }
    );
    if (fast && typeof fast.lastId === "number") return fast.lastId;
  }
  const data = await loadData(env, { readOnly: true });
  return data.chatMessages.filter((message) => clientId == null || message.clientId === clientId).reduce((maxId, message) => Math.max(maxId, message.id), 0);
}, "loadChatLastId");
var ensureDefaultSupportConversation = /* @__PURE__ */ __name((conversations, clientId, fallbackAt) => {
  if (conversations.some((conv) => conv.key === "support:0")) return conversations;
  return [
    ...conversations,
    {
      key: "support:0",
      clientId,
      conversationType: "support",
      title: "Agency Support",
      description: "General help, follow-up, and request support",
      lastMessage: "",
      lastMessageAt: fallbackAt,
      unreadCount: 0
    }
  ];
}, "ensureDefaultSupportConversation");
var attachAgencyOnline = /* @__PURE__ */ __name((conversations, presence) => conversations.map((conv) => ({
  ...conv,
  agencyOnline: isAgencyOnlineFor(
    presence,
    conv.conversationType,
    conv.agencyId
  )
})).sort(
  (left, right) => new Date(right.lastMessageAt).getTime() - new Date(left.lastMessageAt).getTime()
), "attachAgencyOnline");
app.get("/api/chats/client/conversations", requireClientAuth, async (c) => {
  const client = c.get("client");
  const config = getSupabaseAppDataConfig(c.env);
  if (config) {
    const [fast, presence2] = await Promise.all([
      tryCallSupabaseRpc(
        config,
        "list_helped_chat_client_conversations",
        { p_app_id: config.rowId, p_client_id: client.id }
      ),
      loadChatPresence(c.env)
    ]);
    if (fast) {
      const withDefault2 = ensureDefaultSupportConversation(
        fast,
        client.id,
        client.createdAt
      );
      return c.json({ conversations: attachAgencyOnline(withDefault2, presence2) });
    }
  }
  const presence = await loadChatPresence(c.env);
  const data = await loadData(c.env, { readOnly: true });
  const conversations = /* @__PURE__ */ new Map();
  data.chatMessages.filter((message) => message.clientId === client.id).forEach((message) => {
    const key = `${message.conversationType}:${message.agencyId ?? 0}`;
    const unreadIncrement = message.senderRole === "agency" && !message.readByClient ? 1 : 0;
    const title = message.conversationType === "agency" ? message.agencyName || "Agency" : "Agency Support";
    const description = message.conversationType === "agency" ? "Direct chat with agency" : "General help, follow-up, and request support";
    const existing = conversations.get(key);
    if (!existing) {
      conversations.set(key, {
        key,
        clientId: client.id,
        conversationType: message.conversationType,
        title,
        description,
        lastMessage: message.message,
        lastMessageAt: message.createdAt,
        unreadCount: unreadIncrement,
        agencyId: message.agencyId,
        agencyName: message.agencyName || ""
      });
      return;
    }
    existing.unreadCount += unreadIncrement;
    if (new Date(message.createdAt).getTime() >= new Date(existing.lastMessageAt).getTime()) {
      existing.lastMessage = message.message;
      existing.lastMessageAt = message.createdAt;
    }
  });
  const withDefault = ensureDefaultSupportConversation(
    Array.from(conversations.values()),
    client.id,
    client.createdAt
  );
  return c.json({ conversations: attachAgencyOnline(withDefault, presence) });
});
app.get("/api/chats/client/summary", requireClientAuth, async (c) => {
  const client = c.get("client");
  const data = await loadData(c.env);
  const unreadCount = data.chatMessages.filter(
    (message) => message.clientId === client.id && message.senderRole === "agency" && !message.readByClient
  ).length;
  return c.json({ unreadCount });
});
app.get("/api/chats/client", requireClientAuth, async (c) => {
  const client = c.get("client");
  const url = new URL(c.req.url);
  const { conversationType, agencyId } = getConversationContext(url);
  const beforeId = Number(url.searchParams.get("before") ?? "");
  const limit = Number(url.searchParams.get("limit") ?? "");
  const isPaginating = Number.isInteger(beforeId) && beforeId > 0;
  const config = getSupabaseAppDataConfig(c.env);
  if (config) {
    const fast = await tryCallSupabaseRpc(
      config,
      "get_helped_chat_messages",
      {
        p_app_id: config.rowId,
        p_client_id: client.id,
        p_conversation_type: conversationType,
        p_agency_id: conversationType === "agency" ? agencyId ?? null : null,
        p_before_id: isPaginating ? beforeId : null,
        p_limit: Number.isInteger(limit) && limit > 0 ? limit : 30
      }
    );
    if (fast) {
      if (!isPaginating && fast.some((m) => m.senderRole === "agency" && !m.readByClient)) {
        runChatBackgroundTask(
          c,
          markClientConversationRead(
            c.env,
            client.id,
            conversationType,
            agencyId
          )
        );
      }
      return c.json({ client: toSafeClient(client), messages: fast });
    }
  }
  const data = await loadData(c.env);
  const messages = data.chatMessages.filter(
    (message) => message.clientId === client.id && message.conversationType === conversationType && (conversationType === "support" || message.agencyId === agencyId)
  ).sort(
    (left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime()
  );
  data.chatMessages = data.chatMessages.map(
    (message) => message.clientId === client.id && message.senderRole === "agency" && message.conversationType === conversationType && (conversationType === "support" || message.agencyId === agencyId) ? { ...message, readByClient: true } : message
  );
  try {
    await saveData(c.env, data);
  } catch (error) {
    console.warn("Unable to mark client chat messages as read:", error);
  }
  return c.json({ client: toSafeClient(client), messages });
});
var generateChatBotReply = /* @__PURE__ */ __name(async (env, client, userMessage) => {
  try {
    const supabase = getAiSupabaseConfig(env);
    if (!supabase || !env.GROQ_API_KEY) return;
    const data = await loadData(env, { readOnly: true });
    const result = await runAIAgent({
      agentId: "employer_support",
      input: { message: userMessage.message },
      actor: { role: "employer", userId: client.id, clientId: client.id, ip: "chat-bot" },
      appData: data,
      groqApiKey: env.GROQ_API_KEY,
      supabase,
      conversationId: `chat:support:${client.id}`
    });
    const reply = result?.response?.trim();
    if (!reply) return;
    const replyData = await loadData(env);
    replyData.chatMessages.push({
      id: replyData.counters.chatMessages++,
      clientId: client.id,
      conversationType: userMessage.conversationType,
      agencyId: userMessage.agencyId,
      agencyName: userMessage.agencyName || "",
      senderRole: "agency",
      senderName: "AI Support",
      message: reply,
      createdAt: now2(),
      readByAgency: true,
      readByClient: false,
      isBot: true
    });
    await saveData(env, replyData);
  } catch (error) {
    console.warn("Chat AI reply failed, storing fallback", error);
    try {
      const replyData = await loadData(env);
      replyData.chatMessages.push({
        id: replyData.counters.chatMessages++,
        clientId: client.id,
        conversationType: userMessage.conversationType,
        agencyId: userMessage.agencyId,
        agencyName: userMessage.agencyName || "",
        senderRole: "agency",
        senderName: "Support Bot",
        message: "Thanks for your message! Our team has been notified and will follow up with you shortly. For urgent matters you can reach us via WhatsApp.",
        createdAt: now2(),
        readByAgency: true,
        readByClient: false,
        isBot: true
      });
      await saveData(env, replyData);
    } catch {
    }
  }
}, "generateChatBotReply");
app.post("/api/chats/client", requireClientAuth, async (c) => {
  const body = await parseBody2(c.req.raw);
  if (!body?.message?.trim()) {
    return c.json({ error: "message is required" }, 400);
  }
  const client = c.get("client");
  const { conversationType, agencyId, agencyName } = getConversationContext(
    new URL(c.req.url)
  );
  const data = await loadData(c.env);
  const message = {
    id: data.counters.chatMessages++,
    clientId: client.id,
    conversationType,
    agencyId,
    agencyName: agencyName ?? "",
    senderRole: "client",
    senderName: client.name,
    message: body.message.trim(),
    createdAt: now2(),
    readByAgency: false,
    readByClient: true
  };
  data.chatMessages.push(message);
  await saveData(c.env, data);
  runChatBackgroundTask(c, touchChatPresence(c.env, "client", client.id, agencyId));
  if (conversationType === "support") {
    runChatBackgroundTask(c, generateChatBotReply(c.env, client, message));
  }
  return c.json({ message }, 201);
});
app.post("/api/chats/client/heartbeat", requireClientAuth, async (c) => {
  const client = c.get("client");
  const { agencyId } = getConversationContext(new URL(c.req.url));
  await touchChatPresence(c.env, "client", client.id, agencyId);
  return c.json({ ok: true });
});
app.post("/api/chats/client/offline", requireClientAuth, async (c) => {
  const client = c.get("client");
  await markChatPresenceOffline(c.env, "client", client.id);
  return c.json({ ok: true });
});
app.get("/api/chats/admin", requireAgencyAdminAuth, async (c) => {
  const config = getSupabaseAppDataConfig(c.env);
  if (config) {
    const [fast, presence2] = await Promise.all([
      tryCallSupabaseRpc(
        config,
        "list_helped_chat_admin_conversations",
        { p_app_id: config.rowId }
      ),
      loadChatPresence(c.env)
    ]);
    if (fast) {
      return c.json({
        conversations: fast.map((conv) => ({
          ...conv,
          clientOnline: presence2.clients.includes(Number(conv.clientId))
        }))
      });
    }
  }
  const presence = await loadChatPresence(c.env);
  const data = await loadData(c.env, { readOnly: true });
  const conversations = /* @__PURE__ */ new Map();
  data.chatMessages.forEach((message) => {
    const client = data.clients.find((item) => item.id === message.clientId);
    if (!client) return;
    const key = `${message.clientId}:${message.conversationType}:${message.agencyId ?? 0}`;
    const unreadIncrement = message.senderRole === "client" && !message.readByAgency ? 1 : 0;
    const existing = conversations.get(key);
    if (!existing) {
      conversations.set(key, {
        key,
        clientId: client.id,
        conversationType: message.conversationType,
        agencyId: message.agencyId,
        agencyName: message.agencyName || "",
        clientName: client.name,
        clientEmail: client.email,
        clientCompany: client.company || "",
        lastMessage: message.message,
        lastMessageAt: message.createdAt,
        unreadCount: unreadIncrement
      });
      return;
    }
    existing.unreadCount += unreadIncrement;
    if (new Date(message.createdAt).getTime() >= new Date(existing.lastMessageAt).getTime()) {
      existing.lastMessage = message.message;
      existing.lastMessageAt = message.createdAt;
    }
  });
  return c.json({
    conversations: Array.from(conversations.values()).map((conv) => ({
      ...conv,
      clientOnline: presence.clients.includes(Number(conv.clientId))
    })).sort(
      (left, right) => new Date(right.lastMessageAt).getTime() - new Date(left.lastMessageAt).getTime()
    )
  });
});
app.get("/api/chats/admin/summary", requireAgencyAdminAuth, async (c) => {
  const config = getSupabaseAppDataConfig(c.env);
  if (config) {
    const fastSummary = await tryCallSupabaseRpc(
      config,
      "get_helped_chat_admin_summary",
      { p_app_id: config.rowId }
    );
    if (fastSummary) {
      return c.json(fastSummary);
    }
  }
  const data = await loadData(c.env);
  const unreadCount = data.chatMessages.filter(
    (message) => message.senderRole === "client" && !message.readByAgency
  ).length;
  return c.json({ unreadCount });
});
app.get("/api/chats/admin/stream", requireAgencyAdminAuth, async (c) => {
  const url = new URL(c.req.url);
  const afterId = Number(url.searchParams.get("afterId") ?? 0);
  if (!Number.isFinite(afterId) || afterId < 0) {
    return c.json({ error: "afterId must be a non-negative number" }, 400);
  }
  const config = getSupabaseAppDataConfig(c.env);
  const startedAt = Date.now();
  return createSseResponse(c.req.raw, async (controller) => {
    let lastId = afterId;
    let lastHeartbeat = Date.now();
    let idleTicks = 0;
    writeSseEvent(controller, "ready", { ok: true });
    while (!c.req.raw.signal.aborted && Date.now() - startedAt < 6e4) {
      const nextMessages = await loadChatMessagesAfter(c.env, config, lastId);
      for (const message of nextMessages) {
        writeSseEvent(controller, "message", { message });
        lastId = Math.max(lastId, message.id);
      }
      if (nextMessages.length > 0) {
        idleTicks = 0;
      } else {
        idleTicks++;
      }
      const nowTime = Date.now();
      if (nowTime - lastHeartbeat > 15e3) {
        writeSseComment(controller, "keep-alive");
        lastHeartbeat = nowTime;
      }
      await sleep2(nextMessages.length > 0 ? 600 : idleTicks > 8 ? 2500 : 1200);
    }
  });
});
app.get("/api/chats/admin/last-id", requireAgencyAdminAuth, async (c) => {
  const lastId = await loadChatLastId(c.env);
  return c.json({ lastId });
});
app.get("/api/chats/admin/config", requireAgencyAdminAuth, async (c) => {
  const admin = c.get("agencyAdmin");
  const data = await loadData(c.env, { readOnly: true });
  const raw2 = data.companyProfile.chatbotConfig ?? {};
  const config = {
    agencyId: admin.agencyId,
    enabled: raw2.enabled !== false,
    botName: toTrimmedString(raw2.botName) || "Support Bot",
    welcomeMessage: toTrimmedString(raw2.welcomeMessage),
    fallbackShortResponse: toTrimmedString(raw2.fallbackShortResponse),
    fallbackLongResponse: toTrimmedString(raw2.fallbackLongResponse),
    suggestionChips: Array.isArray(raw2.suggestionChips) ? raw2.suggestionChips : [],
    topicOptions: Array.isArray(raw2.topicOptions) ? raw2.topicOptions : [],
    responseRules: Array.isArray(raw2.responseRules) ? raw2.responseRules : [],
    updatedAt: toTrimmedString(raw2.updatedAt)
  };
  return c.json({ config });
});
app.put("/api/chats/admin/config", requireAgencyAdminAuth, async (c) => {
  const body = await parseBody2(c.req.raw);
  if (!body) return c.json({ error: "Request body is required" }, 400);
  const data = await loadData(c.env);
  data.companyProfile.chatbotConfig = {
    ...body,
    updatedAt: now2()
  };
  await saveData(c.env, data);
  return c.json({ config: data.companyProfile.chatbotConfig });
});
app.post("/api/chats/admin/heartbeat", requireAgencyAdminAuth, async (c) => {
  const admin = c.get("agencyAdmin");
  await touchChatPresence(c.env, "admin", admin.id, admin.agencyId);
  return c.json({ ok: true });
});
app.post("/api/chats/admin/offline", requireAgencyAdminAuth, async (c) => {
  const admin = c.get("agencyAdmin");
  await markChatPresenceOffline(c.env, "admin", admin.id);
  return c.json({ ok: true });
});
app.get("/api/chats/admin/:clientId", requireAgencyAdminAuth, async (c) => {
  const clientId = Number(c.req.param("clientId"));
  if (!Number.isInteger(clientId)) {
    return c.json({ error: "Valid client id is required" }, 400);
  }
  const url = new URL(c.req.url);
  const { conversationType, agencyId } = getConversationContext(url);
  const beforeId = Number(url.searchParams.get("before") ?? "");
  const limit = Number(url.searchParams.get("limit") ?? "");
  const isPaginating = Number.isInteger(beforeId) && beforeId > 0;
  const config = getSupabaseAppDataConfig(c.env);
  if (config) {
    const fast = await tryCallSupabaseRpc(
      config,
      "get_helped_chat_messages",
      {
        p_app_id: config.rowId,
        p_client_id: clientId,
        p_conversation_type: conversationType,
        p_agency_id: conversationType === "agency" ? agencyId ?? null : null,
        p_before_id: isPaginating ? beforeId : null,
        p_limit: Number.isInteger(limit) && limit > 0 ? limit : 30
      }
    );
    if (fast) {
      if (!isPaginating && fast.some((m) => m.senderRole === "client" && !m.readByAgency)) {
        runChatBackgroundTask(
          c,
          markAdminConversationRead(c.env, clientId, conversationType, agencyId)
        );
      }
      return c.json({ messages: fast });
    }
  }
  const data = await loadData(c.env);
  const messages = data.chatMessages.filter(
    (message) => message.clientId === clientId && message.conversationType === conversationType && (conversationType === "support" || message.agencyId === agencyId)
  ).sort(
    (left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime()
  );
  data.chatMessages = data.chatMessages.map(
    (message) => message.clientId === clientId && message.senderRole === "client" && message.conversationType === conversationType && (conversationType === "support" || message.agencyId === agencyId) ? { ...message, readByAgency: true } : message
  );
  try {
    await saveData(c.env, data);
  } catch (error) {
    console.warn("Unable to mark admin chat messages as read:", error);
  }
  return c.json({ messages });
});
app.post("/api/chats/admin/:clientId", requireAgencyAdminAuth, async (c) => {
  const clientId = Number(c.req.param("clientId"));
  if (!Number.isInteger(clientId)) {
    return c.json({ error: "Valid client id is required" }, 400);
  }
  const body = await parseBody2(c.req.raw);
  if (!body?.message?.trim()) {
    return c.json({ error: "message is required" }, 400);
  }
  const data = await loadData(c.env);
  const client = data.clients.find((item) => item.id === clientId);
  if (!client) {
    return c.json({ error: "Client not found" }, 404);
  }
  const admin = c.get("agencyAdmin");
  const { conversationType, agencyId, agencyName } = getConversationContext(
    new URL(c.req.url)
  );
  const message = {
    id: data.counters.chatMessages++,
    clientId,
    conversationType,
    agencyId,
    agencyName: agencyName ?? admin.agencyName,
    senderRole: "agency",
    senderName: conversationType === "agency" ? `${agencyName ?? admin.agencyName} Team` : `${admin.agencyName} Support`,
    message: body.message.trim(),
    createdAt: now2(),
    readByAgency: true,
    readByClient: false
  };
  data.chatMessages.push(message);
  await saveData(c.env, data);
  runChatBackgroundTask(
    c,
    touchChatPresence(c.env, "admin", admin.id, admin.agencyId)
  );
  return c.json({ message }, 201);
});
app.get("/api/chats/client/stream", requireClientAuth, async (c) => {
  const client = c.get("client");
  const url = new URL(c.req.url);
  const afterId = Number(url.searchParams.get("afterId") ?? 0);
  if (!Number.isFinite(afterId) || afterId < 0) {
    return c.json({ error: "afterId must be a non-negative number" }, 400);
  }
  const streamAll = url.searchParams.get("all") === "1";
  const { conversationType, agencyId } = getConversationContext(url);
  const scope = streamAll ? { clientId: client.id } : {
    clientId: client.id,
    conversationType,
    agencyId: conversationType === "agency" ? agencyId : void 0
  };
  const config = getSupabaseAppDataConfig(c.env);
  const startedAt = Date.now();
  return createSseResponse(c.req.raw, async (controller) => {
    let lastId = afterId;
    let lastHeartbeat = Date.now();
    let idleTicks = 0;
    writeSseEvent(controller, "ready", { ok: true });
    while (!c.req.raw.signal.aborted && Date.now() - startedAt < 6e4) {
      const nextMessages = await loadChatMessagesAfter(
        c.env,
        config,
        lastId,
        scope
      );
      for (const message of nextMessages) {
        writeSseEvent(controller, "message", { message });
        lastId = Math.max(lastId, message.id);
      }
      if (nextMessages.length > 0) {
        idleTicks = 0;
      } else {
        idleTicks++;
      }
      const nowTime = Date.now();
      if (nowTime - lastHeartbeat > 15e3) {
        writeSseComment(controller, "keep-alive");
        lastHeartbeat = nowTime;
      }
      await sleep2(nextMessages.length > 0 ? 600 : idleTicks > 8 ? 2500 : 1200);
    }
  });
});
app.get("/api/chats/client/last-id", requireClientAuth, async (c) => {
  const client = c.get("client");
  const lastId = await loadChatLastId(c.env, client.id);
  return c.json({ lastId });
});
app.get(
  "/api/chats/admin/stream/:clientId",
  requireAgencyAdminAuth,
  async (c) => {
    const clientId = Number(c.req.param("clientId"));
    if (!Number.isInteger(clientId)) {
      return c.json({ error: "Valid client id is required" }, 400);
    }
    const url = new URL(c.req.url);
    const afterId = Number(url.searchParams.get("afterId") ?? 0);
    if (!Number.isFinite(afterId) || afterId < 0) {
      return c.json({ error: "afterId must be a non-negative number" }, 400);
    }
    const { conversationType, agencyId } = getConversationContext(url);
    const scope = {
      clientId,
      conversationType,
      agencyId: conversationType === "agency" ? agencyId : void 0
    };
    const config = getSupabaseAppDataConfig(c.env);
    const startedAt = Date.now();
    return createSseResponse(c.req.raw, async (controller) => {
      let lastId = afterId;
      let lastHeartbeat = Date.now();
      let idleTicks = 0;
      writeSseEvent(controller, "ready", { ok: true });
      while (!c.req.raw.signal.aborted && Date.now() - startedAt < 6e4) {
        const nextMessages = await loadChatMessagesAfter(
          c.env,
          config,
          lastId,
          scope
        );
        for (const message of nextMessages) {
          writeSseEvent(controller, "message", { message });
          lastId = Math.max(lastId, message.id);
        }
        if (nextMessages.length > 0) {
          idleTicks = 0;
        } else {
          idleTicks++;
        }
        const nowTime = Date.now();
        if (nowTime - lastHeartbeat > 15e3) {
          writeSseComment(controller, "keep-alive");
          lastHeartbeat = nowTime;
        }
        await sleep2(nextMessages.length > 0 ? 600 : idleTicks > 8 ? 2500 : 1200);
      }
    });
  }
);
var EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
app.post(
  "/api/tell-friend",
  safeApi(async (c) => {
    const body = await parseBody2(c.req.raw);
    if (!body || typeof body !== "object") {
      return c.json({ error: "Request body is missing or not valid JSON." }, 400);
    }
    const sanitize = /* @__PURE__ */ __name((v, max) => typeof v === "string" ? v.replace(/\r\n/g, "\n").replace(/\0/g, "").trim().slice(0, max) : "", "sanitize");
    const toName = sanitize(body.toName, 100);
    const fromName = sanitize(body.fromName, 100);
    const toEmail = sanitize(body.toEmail, 320).toLowerCase();
    const fromEmail = sanitize(body.fromEmail, 320).toLowerCase();
    const subject = sanitize(body.subject, 200);
    const message = sanitize(body.message, 5e3);
    const maidRefCode = sanitize(body.maidRefCode, 50);
    if (!toEmail || !fromEmail || !subject || !message) {
      return c.json(
        { error: "toEmail, fromEmail, subject, and message are required" },
        400
      );
    }
    if (!EMAIL_PATTERN.test(toEmail) || !EMAIL_PATTERN.test(fromEmail)) {
      return c.json({ error: "Please enter valid email addresses" }, 400);
    }
    const text3 = [
      fromName ? `${fromName} (${fromEmail})` : fromEmail,
      "wants to share a maid profile with you.",
      "",
      `To: ${toName ? `${toName} <${toEmail}>` : toEmail}`,
      maidRefCode ? `Maid ref: ${maidRefCode}` : "",
      "",
      `Subject: ${subject}`,
      "",
      message
    ].filter((line) => line !== void 0).join("\n");
    const result = await sendEmailViaResend(c.env, toEmail, subject, text3);
    if (!result.ok) {
      if (result.error === "RESEND_NOT_CONFIGURED") {
        return c.json({ error: "Email service is not configured" }, 503);
      }
      return c.json({ error: "Email could not be delivered right now" }, 502);
    }
    return c.json({ message: "Email sent successfully" });
  })
);
app.post(
  "/api/ats/public/apply",
  safeApi(async (c) => {
    let formData;
    try {
      formData = await c.req.raw.formData();
    } catch {
      return c.json({ error: "Multipart form data is required" }, 400);
    }
    let parsed;
    try {
      parsed = await parseAtsFormData(c.env, formData);
    } catch (err) {
      return c.json({ error: err instanceof Error ? err.message : "Invalid form data" }, 400);
    }
    const supabase = getSupabaseAppDataConfig(c.env);
    if (supabase && isNormalizedSupabaseEnabled(c.env)) {
      await savePublicAtsApplicationToSupabaseNormalized(supabase, parsed);
      return c.json(
        {
          applicationId: parsed.application.id,
          applicationCode: parsed.application.applicationCode,
          applicantAccessToken: parsed.application.applicantAccessToken,
          submittedAt: parsed.application.appliedAt
        },
        201
      );
    }
    const data = await loadData(c.env);
    data.ats.applications.unshift(parsed.application);
    data.ats.profiles.unshift(parsed.profile);
    data.ats.scores[parsed.application.id] = parsed.score;
    data.ats.history[parsed.application.id] = parsed.history;
    data.ats.documents[parsed.application.id] = parsed.documents;
    data.ats.notifications[parsed.application.id] = parsed.notifications;
    await saveData(c.env, data);
    return c.json(
      {
        applicationId: parsed.application.id,
        applicationCode: parsed.application.applicationCode,
        applicantAccessToken: parsed.application.applicantAccessToken,
        submittedAt: parsed.application.appliedAt
      },
      201
    );
  })
);
app.get(
  "/api/ats/public/applications/:applicationId",
  safeApi(async (c) => {
    const applicationId = c.req.param("applicationId");
    const token = toTrimmedString(new URL(c.req.url).searchParams.get("token"));
    if (!token) {
      return c.json({ error: "token is required" }, 400);
    }
    const data = await loadData(c.env);
    const summary = buildPublicAtsSummary(data, applicationId, token);
    if (!summary) {
      return c.json({ error: "Application not found" }, 404);
    }
    return c.json(summary);
  })
);
app.get("/api/ats/dashboard", requireAgencyAdminAuth, async (c) => {
  const admin = c.get("agencyAdmin");
  const data = await loadData(c.env, { readOnly: true });
  return c.json(buildAtsDashboard(data, admin.agencyId));
});
app.get("/api/ats/applications", requireAgencyAdminAuth, async (c) => {
  const admin = c.get("agencyAdmin");
  const data = await loadData(c.env, { readOnly: true });
  const url = new URL(c.req.url);
  const query = toTrimmedString(url.searchParams.get("q")).toLowerCase();
  const sort = toTrimmedString(url.searchParams.get("sort")) || "qualificationScore:desc";
  const page = Math.max(1, toNumericValue(url.searchParams.get("page"), 1));
  const pageSize = Math.max(1, toNumericValue(url.searchParams.get("pageSize"), 20));
  const filtersRaw = toTrimmedString(url.searchParams.get("filters"));
  let filters = {};
  if (filtersRaw) {
    try {
      const parsed = JSON.parse(filtersRaw);
      if (parsed && typeof parsed === "object") {
        filters = parsed;
      }
    } catch {
      filters = {};
    }
  }
  const profilesByApplicationId = new Map(
    data.ats.profiles.map((profile) => [profile.applicationId, profile])
  );
  const listItems = data.ats.applications.filter(
    (item) => item.agencyId === admin.agencyId && item.source === "resume_upload"
  ).map(
    (item) => createAtsListItem(
      item,
      profilesByApplicationId.get(item.id) ?? null,
      data.ats.scores[item.id] ?? null
    )
  ).filter((item) => Boolean(item));
  const filtered = filterAtsApplications(listItems, query, filters);
  const sorted = sortAtsApplications(filtered, sort);
  const total = sorted.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = (page - 1) * pageSize;
  const paged = sorted.slice(start, start + pageSize);
  return c.json({
    data: paged,
    pageInfo: {
      page,
      pageSize,
      total,
      totalPages
    }
  });
});
app.get("/api/ats/applications/:applicationId/stage", requireAgencyAdminAuth, async (c) => {
  return c.json({ error: "Method not allowed" }, 405);
});
app.patch("/api/ats/applications/:applicationId/stage", requireAgencyAdminAuth, async (c) => {
  const admin = c.get("agencyAdmin");
  const applicationId = c.req.param("applicationId");
  const body = await parseBody2(c.req.raw);
  const stage = body?.stage;
  if (!stage) {
    return c.json({ error: "stage is required" }, 400);
  }
  if (!atsStageOrder.includes(stage)) {
    return c.json({ error: `Invalid stage "${stage}". Valid values: ${atsStageOrder.join(", ")}` }, 400);
  }
  const data = await loadData(c.env);
  const application = data.ats.applications.find(
    (item) => item.id === applicationId && item.agencyId === admin.agencyId
  );
  if (!application) {
    return c.json({ error: "Application not found" }, 404);
  }
  const previousStage = application.status;
  application.status = stage;
  application.updatedAt = now2();
  data.ats.history[applicationId] = [
    {
      id: randomId("history"),
      fromStage: previousStage,
      toStage: stage,
      actor: admin.username || admin.email || "Agency Staff",
      reason: toTrimmedString(body?.reason) || `Stage changed to ${stage}`,
      createdAt: now2()
    },
    ...data.ats.history[applicationId] ?? []
  ];
  await saveData(c.env, data);
  return c.json(buildAtsBundle(data, applicationId));
});
app.get("/api/ats/applications/:applicationId", requireAgencyAdminAuth, async (c) => {
  const admin = c.get("agencyAdmin");
  const applicationId = c.req.param("applicationId");
  const data = await loadData(c.env, { readOnly: true });
  const bundle = buildAtsBundle(data, applicationId);
  if (!bundle || bundle.application.agencyId !== admin.agencyId) {
    return c.json({ error: "Application not found" }, 404);
  }
  return c.json(bundle);
});
app.post("/api/ats/bulk-actions", requireAgencyAdminAuth, async (c) => {
  const admin = c.get("agencyAdmin");
  const body = await parseBody2(c.req.raw);
  if (!Array.isArray(body?.applicationIds) || body.applicationIds.length === 0 || !body.action) {
    return c.json({ error: "applicationIds and action are required" }, 400);
  }
  const actionStageMap = {
    approve: "Approved",
    reject: "Rejected",
    request_documents: "Documents Submitted",
    assign_interview: "Screening Interview"
  };
  const data = await loadData(c.env);
  const updatedIds = [];
  for (const applicationId of body.applicationIds) {
    const application = data.ats.applications.find(
      (item) => item.id === applicationId && item.agencyId === admin.agencyId
    );
    if (!application) continue;
    const nextStage = actionStageMap[body.action];
    const previousStage = application.status;
    application.status = nextStage;
    application.updatedAt = now2();
    data.ats.history[applicationId] = [
      {
        id: randomId("history"),
        fromStage: previousStage,
        toStage: nextStage,
        actor: admin.username || admin.email || "Agency Staff",
        reason: `Bulk action: ${body.action}`,
        createdAt: now2()
      },
      ...data.ats.history[applicationId] ?? []
    ];
    updatedIds.push(applicationId);
  }
  await saveData(c.env, data);
  return c.json({
    updated: updatedIds.length,
    data: updatedIds.map((applicationId) => buildAtsBundle(data, applicationId)).filter(Boolean)
  });
});
app.post("/api/ats/match", requireAgencyAdminAuth, async (c) => {
  const admin = c.get("agencyAdmin");
  const body = await parseBody2(c.req.raw);
  const requirementText = toTrimmedString(body?.requirementText).toLowerCase();
  if (!requirementText) {
    return c.json({ error: "requirementText is required" }, 400);
  }
  const top = Math.max(1, Math.min(20, toNumericValue(body?.top, 10)));
  const data = await loadData(c.env);
  const matches = data.ats.applications.filter(
    (item) => item.agencyId === admin.agencyId && item.source === "resume_upload"
  ).map((application) => {
    const profile = getAtsProfileByApplicationId(data, application.id);
    const score = data.ats.scores[application.id];
    if (!profile || !score) return null;
    const matchedSkills = [
      ...profile.languageSkills.filter(
        (item) => requirementText.includes(item.toLowerCase())
      ),
      ...profile.cookingSkills.filter(
        (item) => requirementText.includes(item.toLowerCase())
      )
    ];
    if (requirementText.includes("newborn") && profile.newbornCareExperience > 0) {
      matchedSkills.push("Newborn care");
    }
    if (requirementText.includes("elderly") && profile.elderlyCareExperience > 0) {
      matchedSkills.push("Elderly care");
    }
    const matchScore = Math.min(
      100,
      Math.round(score.score * 0.7 + matchedSkills.length * 10)
    );
    return {
      applicationId: application.id,
      candidateName: profile.fullName,
      maidReferenceCode: profile.maidReferenceCode ?? application.applicationCode,
      matchScore,
      recommendation: matchedSkills.length > 0 ? `Matched on ${matchedSkills.join(", ")}.` : "General shortlist candidate, but needs recruiter review against requirement."
    };
  }).filter((item) => Boolean(item)).sort((left, right) => right.matchScore - left.matchScore).slice(0, top);
  return c.json({ matches });
});
app.get("/api/ats/presets", requireAgencyAdminAuth, async (c) => {
  const admin = c.get("agencyAdmin");
  const data = await loadData(c.env);
  return c.json({
    presets: data.ats.presets.filter((item) => item.agencyId === admin.agencyId)
  });
});
app.post("/api/ats/presets", requireAgencyAdminAuth, async (c) => {
  const admin = c.get("agencyAdmin");
  const body = await parseBody2(c.req.raw);
  const name = toTrimmedString(body?.name);
  if (!name) {
    return c.json({ error: "name is required" }, 400);
  }
  const data = await loadData(c.env);
  const preset = {
    id: randomId("preset"),
    agencyId: admin.agencyId,
    name,
    filters: body?.filters && typeof body.filters === "object" ? body.filters : {},
    createdAt: now2()
  };
  data.ats.presets.unshift(preset);
  await saveData(c.env, data);
  return c.json({ preset }, 201);
});
app.post("/api/pdf-autofill", async (c) => {
  const groqKey = c.env.GROQ_API_KEY?.trim();
  if (!groqKey) return c.json({ error: "PDF autofill is not configured" }, 503);
  const body = await parseBody2(c.req.raw);
  if (!body?.model || !Array.isArray(body.messages) || body.messages.length === 0) {
    return c.json({ error: "model and messages are required" }, 400);
  }
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${groqKey}`
    },
    body: JSON.stringify({ model: body.model, temperature: 0, max_tokens: 8192, messages: body.messages }),
    signal: AbortSignal.timeout(55e3)
  });
  const data = await res.json();
  if (!res.ok || data.error?.message) {
    return c.json(
      { error: data.error?.message ?? `Groq error ${res.status}` },
      res.ok ? 500 : res.status
    );
  }
  return c.json({
    content: data.choices?.[0]?.message?.content ?? "",
    finish_reason: data.choices?.[0]?.finish_reason ?? "unknown"
  });
});
app.post("/api/send-to-make", async (c) => {
  const body = await parseBody2(c.req.raw);
  if (!body?.scenario || typeof body.payload !== "object" || body.payload === null) {
    return c.json({ error: "scenario and payload are required" }, 400);
  }
  const webhookUrls = {
    inquiry_pipeline: c.env.MAKE_WEBHOOK_URL_INQUIRY_PIPELINE?.trim(),
    lead_pipeline: c.env.MAKE_WEBHOOK_URL_LEAD_PIPELINE?.trim()
  };
  const webhookUrl = webhookUrls[body.scenario];
  if (!webhookUrl) {
    return c.json({ error: `No webhook configured for scenario: ${body.scenario}` }, 503);
  }
  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body.payload),
    signal: AbortSignal.timeout(1e4)
  });
  return c.json({
    ok: res.ok,
    delivery: { id: Date.now(), scenario: body.scenario, success: res.ok, statusCode: res.status }
  });
});
app.all("/api/*", (c) => c.json({ error: "Not found" }, 404));
var purgeExpiredClientSessions = /* @__PURE__ */ __name(async (env) => {
  const data = await loadData(env);
  const now3 = Date.now();
  const before = data.clientSessions.length;
  data.clientSessions = data.clientSessions.filter(
    (s) => !s.expiresAt || new Date(s.expiresAt).getTime() > now3
  );
  if (data.clientSessions.length < before) {
    await saveData(env, data);
  }
}, "purgeExpiredClientSessions");
var path_default = {
  async scheduled(_controller, env, executionContext) {
    executionContext.waitUntil(
      (async () => {
        const result = await runScheduledAiAutopilot(env);
        const makeUrl = env.MAKE_WEBHOOK_URL?.trim();
        if (makeUrl && result && "actionCount" in result && result.actionCount > 0) {
          const data = await loadData(env);
          const agencyPhone = data.companyProfile?.social_whatsapp_number?.trim() ?? data.companyProfile?.contact_phone?.trim() ?? "";
          const agencyName = data.companyProfile?.company_name?.trim() ?? data.companyProfile?.short_name?.trim() ?? "Our Agency";
          const typedResult = result;
          const highPriorityCount = typedResult.actions.filter(
            (a) => a.priority === "high"
          ).length;
          await fetch(makeUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              scenario: "autopilot_notification",
              actionCount: typedResult.actionCount,
              highPriorityCount,
              agencyName,
              agencyPhone,
              summaryText: typedResult.actions.slice(0, 3).map((a) => a.title).join(" | ")
            }),
            signal: AbortSignal.timeout(5e3)
          }).catch(() => {
          });
        }
      })().catch((error) => {
        console.error("AI autopilot scheduled run failed", error);
      })
    );
    executionContext.waitUntil(
      runScheduledMarketing(env).catch((error) => {
        console.error("Autonomous marketing scheduled run failed", error);
      })
    );
    executionContext.waitUntil(
      purgeExpiredClientSessions(env).catch(() => {
      })
    );
  },
  async fetch(request, env, executionContext) {
    const url = new URL(request.url);
    if (url.pathname === "/api" || url.pathname.startsWith("/api/")) {
      try {
        return await app.fetch(request, env, executionContext);
      } catch (error) {
        console.error("Unhandled worker error", error);
        const publicMessage = error instanceof Error && error.message.startsWith("No storage configured:") ? error.message : error instanceof Error && (error.message.startsWith("Supabase read failed") || error.message.startsWith("Supabase write failed")) ? error.message : null;
        return jsonError(publicMessage ?? "Something went wrong!", 500);
      }
    }
    if (url.pathname === "/agencyadmin") {
      return Response.redirect(new URL("/agencyadmin/login", url), 302);
    }
    if (url.pathname === "/agency-admin-portal" || url.pathname === "/agencyadminportal") {
      return Response.redirect(new URL("/agencyadmin/login", url), 302);
    }
    if (url.pathname === "/agency-portal" || url.pathname === "/agencyportal") {
      return Response.redirect(new URL("/agencies", url), 302);
    }
    if (url.pathname === "/user-portal" || url.pathname === "/userportal") {
      return Response.redirect(new URL("/employer-login", url), 302);
    }
    const isAssetRequest = url.pathname.startsWith("/assets/") || url.pathname.startsWith("/favicon") || url.pathname.startsWith("/robots.txt") || url.pathname.startsWith("/maid_agency_logo_81.jpg") || /\.[a-zA-Z0-9]+$/.test(url.pathname);
    const withFreshHtmlCacheHeaders = /* @__PURE__ */ __name((response) => {
      const contentType = response.headers.get("content-type") ?? "";
      if (!contentType.includes("text/html")) {
        return response;
      }
      const headers = new Headers(response.headers);
      headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
      headers.set("Pragma", "no-cache");
      headers.set("Expires", "0");
      headers.set("CDN-Cache-Control", "no-store");
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers
      });
    }, "withFreshHtmlCacheHeaders");
    if (!isAssetRequest) {
      const spaRequest2 = new Request(new URL("/", url).toString(), request);
      const spaResponse2 = await env.ASSETS.fetch(spaRequest2);
      return withFreshHtmlCacheHeaders(spaResponse2);
    }
    const assetResponse = await env.ASSETS.fetch(request);
    if (assetResponse.status !== 404) {
      return assetResponse;
    }
    const spaRequest = new Request(new URL("/", url).toString(), request);
    const spaResponse = await env.ASSETS.fetch(spaRequest);
    return withFreshHtmlCacheHeaders(spaResponse);
  }
};
export {
  path_default as default
};
//# sourceMappingURL=%5B%5B...path%5D%5D.js.map
