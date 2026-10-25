#!/usr/bin/env node
// Generated from packages/crew by `npm run build`. Do not edit.
import { createRequire as __crewRequire } from "node:module"; const require = __crewRequire(import.meta.url);
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});
var __commonJS = (cb, mod) => function __require2() {
  try {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  } catch (e) {
    throw mod = 0, e;
  }
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// node_modules/yaml/dist/nodes/identity.js
var require_identity = __commonJS({
  "node_modules/yaml/dist/nodes/identity.js"(exports) {
    "use strict";
    var ALIAS = /* @__PURE__ */ Symbol.for("yaml.alias");
    var DOC = /* @__PURE__ */ Symbol.for("yaml.document");
    var MAP = /* @__PURE__ */ Symbol.for("yaml.map");
    var PAIR = /* @__PURE__ */ Symbol.for("yaml.pair");
    var SCALAR = /* @__PURE__ */ Symbol.for("yaml.scalar");
    var SEQ = /* @__PURE__ */ Symbol.for("yaml.seq");
    var NODE_TYPE = /* @__PURE__ */ Symbol.for("yaml.node.type");
    var isAlias = (node) => !!node && typeof node === "object" && node[NODE_TYPE] === ALIAS;
    var isDocument = (node) => !!node && typeof node === "object" && node[NODE_TYPE] === DOC;
    var isMap = (node) => !!node && typeof node === "object" && node[NODE_TYPE] === MAP;
    var isPair = (node) => !!node && typeof node === "object" && node[NODE_TYPE] === PAIR;
    var isScalar = (node) => !!node && typeof node === "object" && node[NODE_TYPE] === SCALAR;
    var isSeq = (node) => !!node && typeof node === "object" && node[NODE_TYPE] === SEQ;
    function isCollection(node) {
      if (node && typeof node === "object")
        switch (node[NODE_TYPE]) {
          case MAP:
          case SEQ:
            return true;
        }
      return false;
    }
    function isNode(node) {
      if (node && typeof node === "object")
        switch (node[NODE_TYPE]) {
          case ALIAS:
          case MAP:
          case SCALAR:
          case SEQ:
            return true;
        }
      return false;
    }
    var hasAnchor = (node) => (isScalar(node) || isCollection(node)) && !!node.anchor;
    exports.ALIAS = ALIAS;
    exports.DOC = DOC;
    exports.MAP = MAP;
    exports.NODE_TYPE = NODE_TYPE;
    exports.PAIR = PAIR;
    exports.SCALAR = SCALAR;
    exports.SEQ = SEQ;
    exports.hasAnchor = hasAnchor;
    exports.isAlias = isAlias;
    exports.isCollection = isCollection;
    exports.isDocument = isDocument;
    exports.isMap = isMap;
    exports.isNode = isNode;
    exports.isPair = isPair;
    exports.isScalar = isScalar;
    exports.isSeq = isSeq;
  }
});

// node_modules/yaml/dist/visit.js
var require_visit = __commonJS({
  "node_modules/yaml/dist/visit.js"(exports) {
    "use strict";
    var identity2 = require_identity();
    var BREAK2 = /* @__PURE__ */ Symbol("break visit");
    var SKIP = /* @__PURE__ */ Symbol("skip children");
    var REMOVE = /* @__PURE__ */ Symbol("remove node");
    function visit(node, visitor) {
      const visitor_ = initVisitor(visitor);
      if (identity2.isDocument(node)) {
        const cd = visit_(null, node.contents, visitor_, Object.freeze([node]));
        if (cd === REMOVE)
          node.contents = null;
      } else
        visit_(null, node, visitor_, Object.freeze([]));
    }
    visit.BREAK = BREAK2;
    visit.SKIP = SKIP;
    visit.REMOVE = REMOVE;
    function visit_(key, node, visitor, path) {
      const ctrl = callVisitor(key, node, visitor, path);
      if (identity2.isNode(ctrl) || identity2.isPair(ctrl)) {
        replaceNode(key, path, ctrl);
        return visit_(key, ctrl, visitor, path);
      }
      if (typeof ctrl !== "symbol") {
        if (identity2.isCollection(node)) {
          path = Object.freeze(path.concat(node));
          for (let i = 0; i < node.items.length; ++i) {
            const ci = visit_(i, node.items[i], visitor, path);
            if (typeof ci === "number")
              i = ci - 1;
            else if (ci === BREAK2)
              return BREAK2;
            else if (ci === REMOVE) {
              node.items.splice(i, 1);
              i -= 1;
            }
          }
        } else if (identity2.isPair(node)) {
          path = Object.freeze(path.concat(node));
          const ck = visit_("key", node.key, visitor, path);
          if (ck === BREAK2)
            return BREAK2;
          else if (ck === REMOVE)
            node.key = null;
          const cv = visit_("value", node.value, visitor, path);
          if (cv === BREAK2)
            return BREAK2;
          else if (cv === REMOVE)
            node.value = null;
        }
      }
      return ctrl;
    }
    async function visitAsync(node, visitor) {
      const visitor_ = initVisitor(visitor);
      if (identity2.isDocument(node)) {
        const cd = await visitAsync_(null, node.contents, visitor_, Object.freeze([node]));
        if (cd === REMOVE)
          node.contents = null;
      } else
        await visitAsync_(null, node, visitor_, Object.freeze([]));
    }
    visitAsync.BREAK = BREAK2;
    visitAsync.SKIP = SKIP;
    visitAsync.REMOVE = REMOVE;
    async function visitAsync_(key, node, visitor, path) {
      const ctrl = await callVisitor(key, node, visitor, path);
      if (identity2.isNode(ctrl) || identity2.isPair(ctrl)) {
        replaceNode(key, path, ctrl);
        return visitAsync_(key, ctrl, visitor, path);
      }
      if (typeof ctrl !== "symbol") {
        if (identity2.isCollection(node)) {
          path = Object.freeze(path.concat(node));
          for (let i = 0; i < node.items.length; ++i) {
            const ci = await visitAsync_(i, node.items[i], visitor, path);
            if (typeof ci === "number")
              i = ci - 1;
            else if (ci === BREAK2)
              return BREAK2;
            else if (ci === REMOVE) {
              node.items.splice(i, 1);
              i -= 1;
            }
          }
        } else if (identity2.isPair(node)) {
          path = Object.freeze(path.concat(node));
          const ck = await visitAsync_("key", node.key, visitor, path);
          if (ck === BREAK2)
            return BREAK2;
          else if (ck === REMOVE)
            node.key = null;
          const cv = await visitAsync_("value", node.value, visitor, path);
          if (cv === BREAK2)
            return BREAK2;
          else if (cv === REMOVE)
            node.value = null;
        }
      }
      return ctrl;
    }
    function initVisitor(visitor) {
      if (typeof visitor === "object" && (visitor.Collection || visitor.Node || visitor.Value)) {
        return Object.assign({
          Alias: visitor.Node,
          Map: visitor.Node,
          Scalar: visitor.Node,
          Seq: visitor.Node
        }, visitor.Value && {
          Map: visitor.Value,
          Scalar: visitor.Value,
          Seq: visitor.Value
        }, visitor.Collection && {
          Map: visitor.Collection,
          Seq: visitor.Collection
        }, visitor);
      }
      return visitor;
    }
    function callVisitor(key, node, visitor, path) {
      if (typeof visitor === "function")
        return visitor(key, node, path);
      if (identity2.isMap(node))
        return visitor.Map?.(key, node, path);
      if (identity2.isSeq(node))
        return visitor.Seq?.(key, node, path);
      if (identity2.isPair(node))
        return visitor.Pair?.(key, node, path);
      if (identity2.isScalar(node))
        return visitor.Scalar?.(key, node, path);
      if (identity2.isAlias(node))
        return visitor.Alias?.(key, node, path);
      return void 0;
    }
    function replaceNode(key, path, node) {
      const parent = path[path.length - 1];
      if (identity2.isCollection(parent)) {
        parent.items[key] = node;
      } else if (identity2.isPair(parent)) {
        if (key === "key")
          parent.key = node;
        else
          parent.value = node;
      } else if (identity2.isDocument(parent)) {
        parent.contents = node;
      } else {
        const pt = identity2.isAlias(parent) ? "alias" : "scalar";
        throw new Error(`Cannot replace node with ${pt} parent`);
      }
    }
    exports.visit = visit;
    exports.visitAsync = visitAsync;
  }
});

// node_modules/yaml/dist/doc/directives.js
var require_directives = __commonJS({
  "node_modules/yaml/dist/doc/directives.js"(exports) {
    "use strict";
    var identity2 = require_identity();
    var visit = require_visit();
    var escapeChars = {
      "!": "%21",
      ",": "%2C",
      "[": "%5B",
      "]": "%5D",
      "{": "%7B",
      "}": "%7D"
    };
    var escapeTagName = (tn) => tn.replace(/[!,[\]{}]/g, (ch) => escapeChars[ch]);
    var Directives = class _Directives {
      constructor(yaml, tags) {
        this.docStart = null;
        this.docEnd = false;
        this.yaml = Object.assign({}, _Directives.defaultYaml, yaml);
        this.tags = Object.assign({}, _Directives.defaultTags, tags);
      }
      clone() {
        const copy = new _Directives(this.yaml, this.tags);
        copy.docStart = this.docStart;
        return copy;
      }
      /**
       * During parsing, get a Directives instance for the current document and
       * update the stream state according to the current version's spec.
       */
      atDocument() {
        const res = new _Directives(this.yaml, this.tags);
        switch (this.yaml.version) {
          case "1.1":
            this.atNextDocument = true;
            break;
          case "1.2":
            this.atNextDocument = false;
            this.yaml = {
              explicit: _Directives.defaultYaml.explicit,
              version: "1.2"
            };
            this.tags = Object.assign({}, _Directives.defaultTags);
            break;
        }
        return res;
      }
      /**
       * @param onError - May be called even if the action was successful
       * @returns `true` on success
       */
      add(line3, onError) {
        if (this.atNextDocument) {
          this.yaml = { explicit: _Directives.defaultYaml.explicit, version: "1.1" };
          this.tags = Object.assign({}, _Directives.defaultTags);
          this.atNextDocument = false;
        }
        const parts = line3.trim().split(/[ \t]+/);
        const name = parts.shift();
        switch (name) {
          case "%TAG": {
            if (parts.length !== 2) {
              onError(0, "%TAG directive should contain exactly two parts");
              if (parts.length < 2)
                return false;
            }
            const [handle, prefix] = parts;
            this.tags[handle] = prefix;
            return true;
          }
          case "%YAML": {
            this.yaml.explicit = true;
            if (parts.length !== 1) {
              onError(0, "%YAML directive should contain exactly one part");
              return false;
            }
            const [version] = parts;
            if (version === "1.1" || version === "1.2") {
              this.yaml.version = version;
              return true;
            } else {
              const isValid = /^\d+\.\d+$/.test(version);
              onError(6, `Unsupported YAML version ${version}`, isValid);
              return false;
            }
          }
          default:
            onError(0, `Unknown directive ${name}`, true);
            return false;
        }
      }
      /**
       * Resolves a tag, matching handles to those defined in %TAG directives.
       *
       * @returns Resolved tag, which may also be the non-specific tag `'!'` or a
       *   `'!local'` tag, or `null` if unresolvable.
       */
      tagName(source, onError) {
        if (source === "!")
          return "!";
        if (source[0] !== "!") {
          onError(`Not a valid tag: ${source}`);
          return null;
        }
        if (source[1] === "<") {
          const verbatim = source.slice(2, -1);
          if (verbatim === "!" || verbatim === "!!") {
            onError(`Verbatim tags aren't resolved, so ${source} is invalid.`);
            return null;
          }
          if (source[source.length - 1] !== ">")
            onError("Verbatim tags must end with a >");
          return verbatim;
        }
        const [, handle, suffix] = source.match(/^(.*!)([^!]*)$/s);
        if (!suffix)
          onError(`The ${source} tag has no suffix`);
        const prefix = this.tags[handle];
        if (prefix) {
          try {
            return prefix + decodeURIComponent(suffix);
          } catch (error) {
            onError(String(error));
            return null;
          }
        }
        if (handle === "!")
          return source;
        onError(`Could not resolve tag: ${source}`);
        return null;
      }
      /**
       * Given a fully resolved tag, returns its printable string form,
       * taking into account current tag prefixes and defaults.
       */
      tagString(tag) {
        for (const [handle, prefix] of Object.entries(this.tags)) {
          if (tag.startsWith(prefix))
            return handle + escapeTagName(tag.substring(prefix.length));
        }
        return tag[0] === "!" ? tag : `!<${tag}>`;
      }
      toString(doc) {
        const lines = this.yaml.explicit ? [`%YAML ${this.yaml.version || "1.2"}`] : [];
        const tagEntries = Object.entries(this.tags);
        let tagNames;
        if (doc && tagEntries.length > 0 && identity2.isNode(doc.contents)) {
          const tags = {};
          visit.visit(doc.contents, (_key, node) => {
            if (identity2.isNode(node) && node.tag)
              tags[node.tag] = true;
          });
          tagNames = Object.keys(tags);
        } else
          tagNames = [];
        for (const [handle, prefix] of tagEntries) {
          if (handle === "!!" && prefix === "tag:yaml.org,2002:")
            continue;
          if (!doc || tagNames.some((tn) => tn.startsWith(prefix)))
            lines.push(`%TAG ${handle} ${prefix}`);
        }
        return lines.join("\n");
      }
    };
    Directives.defaultYaml = { explicit: false, version: "1.2" };
    Directives.defaultTags = { "!!": "tag:yaml.org,2002:" };
    exports.Directives = Directives;
  }
});

// node_modules/yaml/dist/doc/anchors.js
var require_anchors = __commonJS({
  "node_modules/yaml/dist/doc/anchors.js"(exports) {
    "use strict";
    var identity2 = require_identity();
    var visit = require_visit();
    function anchorIsValid(anchor) {
      if (/[\x00-\x19\s,[\]{}]/.test(anchor)) {
        const sa = JSON.stringify(anchor);
        const msg = `Anchor must not contain whitespace or control characters: ${sa}`;
        throw new Error(msg);
      }
      return true;
    }
    function anchorNames(root) {
      const anchors = /* @__PURE__ */ new Set();
      visit.visit(root, {
        Value(_key, node) {
          if (node.anchor)
            anchors.add(node.anchor);
        }
      });
      return anchors;
    }
    function findNewAnchor(prefix, exclude) {
      for (let i = 1; true; ++i) {
        const name = `${prefix}${i}`;
        if (!exclude.has(name))
          return name;
      }
    }
    function createNodeAnchors(doc, prefix) {
      const aliasObjects = [];
      const sourceObjects = /* @__PURE__ */ new Map();
      let prevAnchors = null;
      return {
        onAnchor: (source) => {
          aliasObjects.push(source);
          prevAnchors ?? (prevAnchors = anchorNames(doc));
          const anchor = findNewAnchor(prefix, prevAnchors);
          prevAnchors.add(anchor);
          return anchor;
        },
        /**
         * With circular references, the source node is only resolved after all
         * of its child nodes are. This is why anchors are set only after all of
         * the nodes have been created.
         */
        setAnchors: () => {
          for (const source of aliasObjects) {
            const ref = sourceObjects.get(source);
            if (typeof ref === "object" && ref.anchor && (identity2.isScalar(ref.node) || identity2.isCollection(ref.node))) {
              ref.node.anchor = ref.anchor;
            } else {
              const error = new Error("Failed to resolve repeated object (this should not happen)");
              error.source = source;
              throw error;
            }
          }
        },
        sourceObjects
      };
    }
    exports.anchorIsValid = anchorIsValid;
    exports.anchorNames = anchorNames;
    exports.createNodeAnchors = createNodeAnchors;
    exports.findNewAnchor = findNewAnchor;
  }
});

// node_modules/yaml/dist/doc/applyReviver.js
var require_applyReviver = __commonJS({
  "node_modules/yaml/dist/doc/applyReviver.js"(exports) {
    "use strict";
    function applyReviver(reviver, obj2, key, val) {
      if (val && typeof val === "object") {
        if (Array.isArray(val)) {
          for (let i = 0, len = val.length; i < len; ++i) {
            const v0 = val[i];
            const v1 = applyReviver(reviver, val, String(i), v0);
            if (v1 === void 0)
              delete val[i];
            else if (v1 !== v0)
              val[i] = v1;
          }
        } else if (val instanceof Map) {
          for (const k of Array.from(val.keys())) {
            const v0 = val.get(k);
            const v1 = applyReviver(reviver, val, k, v0);
            if (v1 === void 0)
              val.delete(k);
            else if (v1 !== v0)
              val.set(k, v1);
          }
        } else if (val instanceof Set) {
          for (const v0 of Array.from(val)) {
            const v1 = applyReviver(reviver, val, v0, v0);
            if (v1 === void 0)
              val.delete(v0);
            else if (v1 !== v0) {
              val.delete(v0);
              val.add(v1);
            }
          }
        } else {
          for (const [k, v0] of Object.entries(val)) {
            const v1 = applyReviver(reviver, val, k, v0);
            if (v1 === void 0)
              delete val[k];
            else if (v1 !== v0)
              val[k] = v1;
          }
        }
      }
      return reviver.call(obj2, key, val);
    }
    exports.applyReviver = applyReviver;
  }
});

// node_modules/yaml/dist/nodes/toJS.js
var require_toJS = __commonJS({
  "node_modules/yaml/dist/nodes/toJS.js"(exports) {
    "use strict";
    var identity2 = require_identity();
    function toJS(value, arg, ctx) {
      if (Array.isArray(value))
        return value.map((v, i) => toJS(v, String(i), ctx));
      if (value && typeof value.toJSON === "function") {
        if (!ctx || !identity2.hasAnchor(value))
          return value.toJSON(arg, ctx);
        const data = { aliasCount: 0, count: 1, res: void 0 };
        ctx.anchors.set(value, data);
        ctx.onCreate = (res2) => {
          data.res = res2;
          delete ctx.onCreate;
        };
        const res = value.toJSON(arg, ctx);
        if (ctx.onCreate)
          ctx.onCreate(res);
        return res;
      }
      if (typeof value === "bigint" && !ctx?.keep)
        return Number(value);
      return value;
    }
    exports.toJS = toJS;
  }
});

// node_modules/yaml/dist/nodes/Node.js
var require_Node = __commonJS({
  "node_modules/yaml/dist/nodes/Node.js"(exports) {
    "use strict";
    var applyReviver = require_applyReviver();
    var identity2 = require_identity();
    var toJS = require_toJS();
    var NodeBase = class {
      constructor(type) {
        Object.defineProperty(this, identity2.NODE_TYPE, { value: type });
      }
      /** Create a copy of this node.  */
      clone() {
        const copy = Object.create(Object.getPrototypeOf(this), Object.getOwnPropertyDescriptors(this));
        if (this.range)
          copy.range = this.range.slice();
        return copy;
      }
      /** A plain JavaScript representation of this node. */
      toJS(doc, { mapAsMap, maxAliasCount, onAnchor, reviver } = {}) {
        if (!identity2.isDocument(doc))
          throw new TypeError("A document argument is required");
        const ctx = {
          anchors: /* @__PURE__ */ new Map(),
          doc,
          keep: true,
          mapAsMap: mapAsMap === true,
          mapKeyWarned: false,
          maxAliasCount: typeof maxAliasCount === "number" ? maxAliasCount : 100
        };
        const res = toJS.toJS(this, "", ctx);
        if (typeof onAnchor === "function")
          for (const { count, res: res2 } of ctx.anchors.values())
            onAnchor(res2, count);
        return typeof reviver === "function" ? applyReviver.applyReviver(reviver, { "": res }, "", res) : res;
      }
    };
    exports.NodeBase = NodeBase;
  }
});

// node_modules/yaml/dist/nodes/Alias.js
var require_Alias = __commonJS({
  "node_modules/yaml/dist/nodes/Alias.js"(exports) {
    "use strict";
    var anchors = require_anchors();
    var visit = require_visit();
    var identity2 = require_identity();
    var Node = require_Node();
    var toJS = require_toJS();
    var Alias = class extends Node.NodeBase {
      constructor(source) {
        super(identity2.ALIAS);
        this.source = source;
        Object.defineProperty(this, "tag", {
          set() {
            throw new Error("Alias nodes cannot have tags");
          }
        });
      }
      /**
       * Resolve the value of this alias within `doc`, finding the last
       * instance of the `source` anchor before this node.
       */
      resolve(doc, ctx) {
        if (ctx?.maxAliasCount === 0)
          throw new ReferenceError("Alias resolution is disabled");
        let nodes;
        if (ctx?.aliasResolveCache) {
          nodes = ctx.aliasResolveCache;
        } else {
          nodes = [];
          visit.visit(doc, {
            Node: (_key, node) => {
              if (identity2.isAlias(node) || identity2.hasAnchor(node))
                nodes.push(node);
            }
          });
          if (ctx)
            ctx.aliasResolveCache = nodes;
        }
        let found = void 0;
        for (const node of nodes) {
          if (node === this)
            break;
          if (node.anchor === this.source)
            found = node;
        }
        return found;
      }
      toJSON(_arg, ctx) {
        if (!ctx)
          return { source: this.source };
        const { anchors: anchors2, doc, maxAliasCount } = ctx;
        const source = this.resolve(doc, ctx);
        if (!source) {
          const msg = `Unresolved alias (the anchor must be set before the alias): ${this.source}`;
          throw new ReferenceError(msg);
        }
        let data = anchors2.get(source);
        if (!data) {
          toJS.toJS(source, null, ctx);
          data = anchors2.get(source);
        }
        if (data?.res === void 0) {
          const msg = "This should not happen: Alias anchor was not resolved?";
          throw new ReferenceError(msg);
        }
        if (maxAliasCount >= 0) {
          data.count += 1;
          if (data.aliasCount === 0)
            data.aliasCount = getAliasCount(doc, source, anchors2);
          if (data.count * data.aliasCount > maxAliasCount) {
            const msg = "Excessive alias count indicates a resource exhaustion attack";
            throw new ReferenceError(msg);
          }
        }
        return data.res;
      }
      toString(ctx, _onComment, _onChompKeep) {
        const src = `*${this.source}`;
        if (ctx) {
          anchors.anchorIsValid(this.source);
          if (ctx.options.verifyAliasOrder && !ctx.anchors.has(this.source)) {
            const msg = `Unresolved alias (the anchor must be set before the alias): ${this.source}`;
            throw new Error(msg);
          }
          if (ctx.implicitKey)
            return `${src} `;
        }
        return src;
      }
    };
    function getAliasCount(doc, node, anchors2) {
      if (identity2.isAlias(node)) {
        const source = node.resolve(doc);
        const anchor = anchors2 && source && anchors2.get(source);
        return anchor ? anchor.count * anchor.aliasCount : 0;
      } else if (identity2.isCollection(node)) {
        let count = 0;
        for (const item of node.items) {
          const c = getAliasCount(doc, item, anchors2);
          if (c > count)
            count = c;
        }
        return count;
      } else if (identity2.isPair(node)) {
        const kc = getAliasCount(doc, node.key, anchors2);
        const vc = getAliasCount(doc, node.value, anchors2);
        return Math.max(kc, vc);
      }
      return 1;
    }
    exports.Alias = Alias;
  }
});

// node_modules/yaml/dist/nodes/Scalar.js
var require_Scalar = __commonJS({
  "node_modules/yaml/dist/nodes/Scalar.js"(exports) {
    "use strict";
    var identity2 = require_identity();
    var Node = require_Node();
    var toJS = require_toJS();
    var isScalarValue = (value) => !value || typeof value !== "function" && typeof value !== "object";
    var Scalar = class extends Node.NodeBase {
      constructor(value) {
        super(identity2.SCALAR);
        this.value = value;
      }
      toJSON(arg, ctx) {
        return ctx?.keep ? this.value : toJS.toJS(this.value, arg, ctx);
      }
      toString() {
        return String(this.value);
      }
    };
    Scalar.BLOCK_FOLDED = "BLOCK_FOLDED";
    Scalar.BLOCK_LITERAL = "BLOCK_LITERAL";
    Scalar.PLAIN = "PLAIN";
    Scalar.QUOTE_DOUBLE = "QUOTE_DOUBLE";
    Scalar.QUOTE_SINGLE = "QUOTE_SINGLE";
    exports.Scalar = Scalar;
    exports.isScalarValue = isScalarValue;
  }
});

// node_modules/yaml/dist/doc/createNode.js
var require_createNode = __commonJS({
  "node_modules/yaml/dist/doc/createNode.js"(exports) {
    "use strict";
    var Alias = require_Alias();
    var identity2 = require_identity();
    var Scalar = require_Scalar();
    var defaultTagPrefix = "tag:yaml.org,2002:";
    function findTagObject(value, tagName, tags) {
      if (tagName) {
        const match = tags.filter((t) => t.tag === tagName);
        const tagObj = match.find((t) => !t.format) ?? match[0];
        if (!tagObj)
          throw new Error(`Tag ${tagName} not found`);
        return tagObj;
      }
      return tags.find((t) => t.identify?.(value) && !t.format);
    }
    function createNode(value, tagName, ctx) {
      if (identity2.isDocument(value))
        value = value.contents;
      if (identity2.isNode(value))
        return value;
      if (identity2.isPair(value)) {
        const map = ctx.schema[identity2.MAP].createNode?.(ctx.schema, null, ctx);
        map.items.push(value);
        return map;
      }
      if (value instanceof String || value instanceof Number || value instanceof Boolean || typeof BigInt !== "undefined" && value instanceof BigInt) {
        value = value.valueOf();
      }
      const { aliasDuplicateObjects, onAnchor, onTagObj, schema, sourceObjects } = ctx;
      let ref = void 0;
      if (aliasDuplicateObjects && value && typeof value === "object") {
        ref = sourceObjects.get(value);
        if (ref) {
          ref.anchor ?? (ref.anchor = onAnchor(value));
          return new Alias.Alias(ref.anchor);
        } else {
          ref = { anchor: null, node: null };
          sourceObjects.set(value, ref);
        }
      }
      if (tagName?.startsWith("!!"))
        tagName = defaultTagPrefix + tagName.slice(2);
      let tagObj = findTagObject(value, tagName, schema.tags);
      if (!tagObj) {
        if (value && typeof value.toJSON === "function") {
          value = value.toJSON();
        }
        if (!value || typeof value !== "object") {
          const node2 = new Scalar.Scalar(value);
          if (ref)
            ref.node = node2;
          return node2;
        }
        tagObj = value instanceof Map ? schema[identity2.MAP] : Symbol.iterator in Object(value) ? schema[identity2.SEQ] : schema[identity2.MAP];
      }
      if (onTagObj) {
        onTagObj(tagObj);
        delete ctx.onTagObj;
      }
      const node = tagObj?.createNode ? tagObj.createNode(ctx.schema, value, ctx) : typeof tagObj?.nodeClass?.from === "function" ? tagObj.nodeClass.from(ctx.schema, value, ctx) : new Scalar.Scalar(value);
      if (tagName)
        node.tag = tagName;
      else if (!tagObj.default)
        node.tag = tagObj.tag;
      if (ref)
        ref.node = node;
      return node;
    }
    exports.createNode = createNode;
  }
});

// node_modules/yaml/dist/nodes/Collection.js
var require_Collection = __commonJS({
  "node_modules/yaml/dist/nodes/Collection.js"(exports) {
    "use strict";
    var createNode = require_createNode();
    var identity2 = require_identity();
    var Node = require_Node();
    function collectionFromPath(schema, path, value) {
      let v = value;
      for (let i = path.length - 1; i >= 0; --i) {
        const k = path[i];
        if (typeof k === "number" && Number.isInteger(k) && k >= 0) {
          const a = [];
          a[k] = v;
          v = a;
        } else {
          v = /* @__PURE__ */ new Map([[k, v]]);
        }
      }
      return createNode.createNode(v, void 0, {
        aliasDuplicateObjects: false,
        keepUndefined: false,
        onAnchor: () => {
          throw new Error("This should not happen, please report a bug.");
        },
        schema,
        sourceObjects: /* @__PURE__ */ new Map()
      });
    }
    var isEmptyPath = (path) => path == null || typeof path === "object" && !!path[Symbol.iterator]().next().done;
    var Collection = class extends Node.NodeBase {
      constructor(type, schema) {
        super(type);
        Object.defineProperty(this, "schema", {
          value: schema,
          configurable: true,
          enumerable: false,
          writable: true
        });
      }
      /**
       * Create a copy of this collection.
       *
       * @param schema - If defined, overwrites the original's schema
       */
      clone(schema) {
        const copy = Object.create(Object.getPrototypeOf(this), Object.getOwnPropertyDescriptors(this));
        if (schema)
          copy.schema = schema;
        copy.items = copy.items.map((it) => identity2.isNode(it) || identity2.isPair(it) ? it.clone(schema) : it);
        if (this.range)
          copy.range = this.range.slice();
        return copy;
      }
      /**
       * Adds a value to the collection. For `!!map` and `!!omap` the value must
       * be a Pair instance or a `{ key, value }` object, which may not have a key
       * that already exists in the map.
       */
      addIn(path, value) {
        if (isEmptyPath(path))
          this.add(value);
        else {
          const [key, ...rest] = path;
          const node = this.get(key, true);
          if (identity2.isCollection(node))
            node.addIn(rest, value);
          else if (node === void 0 && this.schema)
            this.set(key, collectionFromPath(this.schema, rest, value));
          else
            throw new Error(`Expected YAML collection at ${key}. Remaining path: ${rest}`);
        }
      }
      /**
       * Removes a value from the collection.
       * @returns `true` if the item was found and removed.
       */
      deleteIn(path) {
        const [key, ...rest] = path;
        if (rest.length === 0)
          return this.delete(key);
        const node = this.get(key, true);
        if (identity2.isCollection(node))
          return node.deleteIn(rest);
        else
          throw new Error(`Expected YAML collection at ${key}. Remaining path: ${rest}`);
      }
      /**
       * Returns item at `key`, or `undefined` if not found. By default unwraps
       * scalar values from their surrounding node; to disable set `keepScalar` to
       * `true` (collections are always returned intact).
       */
      getIn(path, keepScalar) {
        const [key, ...rest] = path;
        const node = this.get(key, true);
        if (rest.length === 0)
          return !keepScalar && identity2.isScalar(node) ? node.value : node;
        else
          return identity2.isCollection(node) ? node.getIn(rest, keepScalar) : void 0;
      }
      hasAllNullValues(allowScalar) {
        return this.items.every((node) => {
          if (!identity2.isPair(node))
            return false;
          const n2 = node.value;
          return n2 == null || allowScalar && identity2.isScalar(n2) && n2.value == null && !n2.commentBefore && !n2.comment && !n2.tag;
        });
      }
      /**
       * Checks if the collection includes a value with the key `key`.
       */
      hasIn(path) {
        const [key, ...rest] = path;
        if (rest.length === 0)
          return this.has(key);
        const node = this.get(key, true);
        return identity2.isCollection(node) ? node.hasIn(rest) : false;
      }
      /**
       * Sets a value in this collection. For `!!set`, `value` needs to be a
       * boolean to add/remove the item from the set.
       */
      setIn(path, value) {
        const [key, ...rest] = path;
        if (rest.length === 0) {
          this.set(key, value);
        } else {
          const node = this.get(key, true);
          if (identity2.isCollection(node))
            node.setIn(rest, value);
          else if (node === void 0 && this.schema)
            this.set(key, collectionFromPath(this.schema, rest, value));
          else
            throw new Error(`Expected YAML collection at ${key}. Remaining path: ${rest}`);
        }
      }
    };
    exports.Collection = Collection;
    exports.collectionFromPath = collectionFromPath;
    exports.isEmptyPath = isEmptyPath;
  }
});

// node_modules/yaml/dist/stringify/stringifyComment.js
var require_stringifyComment = __commonJS({
  "node_modules/yaml/dist/stringify/stringifyComment.js"(exports) {
    "use strict";
    var stringifyComment = (str3) => str3.replace(/^(?!$)(?: $)?/gm, "#");
    function indentComment(comment, indent) {
      if (/^\n+$/.test(comment))
        return comment.substring(1);
      return indent ? comment.replace(/^(?! *$)/gm, indent) : comment;
    }
    var lineComment = (str3, indent, comment) => str3.endsWith("\n") ? indentComment(comment, indent) : comment.includes("\n") ? "\n" + indentComment(comment, indent) : (str3.endsWith(" ") ? "" : " ") + comment;
    exports.indentComment = indentComment;
    exports.lineComment = lineComment;
    exports.stringifyComment = stringifyComment;
  }
});

// node_modules/yaml/dist/stringify/foldFlowLines.js
var require_foldFlowLines = __commonJS({
  "node_modules/yaml/dist/stringify/foldFlowLines.js"(exports) {
    "use strict";
    var FOLD_FLOW = "flow";
    var FOLD_BLOCK = "block";
    var FOLD_QUOTED = "quoted";
    function foldFlowLines(text2, indent, mode = "flow", { indentAtStart, lineWidth = 80, minContentWidth = 20, onFold, onOverflow } = {}) {
      if (!lineWidth || lineWidth < 0)
        return text2;
      if (lineWidth < minContentWidth)
        minContentWidth = 0;
      const endStep = Math.max(1 + minContentWidth, 1 + lineWidth - indent.length);
      if (text2.length <= endStep)
        return text2;
      const folds = [];
      const escapedFolds = {};
      let end = lineWidth - indent.length;
      if (typeof indentAtStart === "number") {
        if (indentAtStart > lineWidth - Math.max(2, minContentWidth))
          folds.push(0);
        else
          end = lineWidth - indentAtStart;
      }
      let split = void 0;
      let prev = void 0;
      let overflow = false;
      let i = -1;
      let escStart = -1;
      let escEnd = -1;
      if (mode === FOLD_BLOCK) {
        i = consumeMoreIndentedLines(text2, i, indent.length);
        if (i !== -1)
          end = i + endStep;
      }
      for (let ch; ch = text2[i += 1]; ) {
        if (mode === FOLD_QUOTED && ch === "\\") {
          escStart = i;
          switch (text2[i + 1]) {
            case "x":
              i += 3;
              break;
            case "u":
              i += 5;
              break;
            case "U":
              i += 9;
              break;
            default:
              i += 1;
          }
          escEnd = i;
        }
        if (ch === "\n") {
          if (mode === FOLD_BLOCK)
            i = consumeMoreIndentedLines(text2, i, indent.length);
          end = i + indent.length + endStep;
          split = void 0;
        } else {
          if (ch === " " && prev && prev !== " " && prev !== "\n" && prev !== "	") {
            const next = text2[i + 1];
            if (next && next !== " " && next !== "\n" && next !== "	")
              split = i;
          }
          if (i >= end) {
            if (split) {
              folds.push(split);
              end = split + endStep;
              split = void 0;
            } else if (mode === FOLD_QUOTED) {
              while (prev === " " || prev === "	") {
                prev = ch;
                ch = text2[i += 1];
                overflow = true;
              }
              const j = i > escEnd + 1 ? i - 2 : escStart - 1;
              if (escapedFolds[j])
                return text2;
              folds.push(j);
              escapedFolds[j] = true;
              end = j + endStep;
              split = void 0;
            } else {
              overflow = true;
            }
          }
        }
        prev = ch;
      }
      if (overflow && onOverflow)
        onOverflow();
      if (folds.length === 0)
        return text2;
      if (onFold)
        onFold();
      let res = text2.slice(0, folds[0]);
      for (let i2 = 0; i2 < folds.length; ++i2) {
        const fold = folds[i2];
        const end2 = folds[i2 + 1] || text2.length;
        if (fold === 0)
          res = `
${indent}${text2.slice(0, end2)}`;
        else {
          if (mode === FOLD_QUOTED && escapedFolds[fold])
            res += `${text2[fold]}\\`;
          res += `
${indent}${text2.slice(fold + 1, end2)}`;
        }
      }
      return res;
    }
    function consumeMoreIndentedLines(text2, i, indent) {
      let end = i;
      let start2 = i + 1;
      let ch = text2[start2];
      while (ch === " " || ch === "	") {
        if (i < start2 + indent) {
          ch = text2[++i];
        } else {
          do {
            ch = text2[++i];
          } while (ch && ch !== "\n");
          end = i;
          start2 = i + 1;
          ch = text2[start2];
        }
      }
      return end;
    }
    exports.FOLD_BLOCK = FOLD_BLOCK;
    exports.FOLD_FLOW = FOLD_FLOW;
    exports.FOLD_QUOTED = FOLD_QUOTED;
    exports.foldFlowLines = foldFlowLines;
  }
});

// node_modules/yaml/dist/stringify/stringifyString.js
var require_stringifyString = __commonJS({
  "node_modules/yaml/dist/stringify/stringifyString.js"(exports) {
    "use strict";
    var Scalar = require_Scalar();
    var foldFlowLines = require_foldFlowLines();
    var getFoldOptions = (ctx, isBlock) => ({
      indentAtStart: isBlock ? ctx.indent.length : ctx.indentAtStart,
      lineWidth: ctx.options.lineWidth,
      minContentWidth: ctx.options.minContentWidth
    });
    var containsDocumentMarker = (str3) => /^(%|---|\.\.\.)/m.test(str3);
    function lineLengthOverLimit(str3, lineWidth, indentLength) {
      if (!lineWidth || lineWidth < 0)
        return false;
      const limit = lineWidth - indentLength;
      const strLen = str3.length;
      if (strLen <= limit)
        return false;
      for (let i = 0, start2 = 0; i < strLen; ++i) {
        if (str3[i] === "\n") {
          if (i - start2 > limit)
            return true;
          start2 = i + 1;
          if (strLen - start2 <= limit)
            return false;
        }
      }
      return true;
    }
    function doubleQuotedString(value, ctx) {
      const json = JSON.stringify(value);
      if (ctx.options.doubleQuotedAsJSON)
        return json;
      const { implicitKey } = ctx;
      const minMultiLineLength = ctx.options.doubleQuotedMinMultiLineLength;
      const indent = ctx.indent || (containsDocumentMarker(value) ? "  " : "");
      let str3 = "";
      let start2 = 0;
      for (let i = 0, ch = json[i]; ch; ch = json[++i]) {
        if (ch === " " && json[i + 1] === "\\" && json[i + 2] === "n") {
          str3 += json.slice(start2, i) + "\\ ";
          i += 1;
          start2 = i;
          ch = "\\";
        }
        if (ch === "\\")
          switch (json[i + 1]) {
            case "u":
              {
                str3 += json.slice(start2, i);
                const code = json.substr(i + 2, 4);
                switch (code) {
                  case "0000":
                    str3 += "\\0";
                    break;
                  case "0007":
                    str3 += "\\a";
                    break;
                  case "000b":
                    str3 += "\\v";
                    break;
                  case "001b":
                    str3 += "\\e";
                    break;
                  case "0085":
                    str3 += "\\N";
                    break;
                  case "00a0":
                    str3 += "\\_";
                    break;
                  case "2028":
                    str3 += "\\L";
                    break;
                  case "2029":
                    str3 += "\\P";
                    break;
                  default:
                    if (code.substr(0, 2) === "00")
                      str3 += "\\x" + code.substr(2);
                    else
                      str3 += json.substr(i, 6);
                }
                i += 5;
                start2 = i + 1;
              }
              break;
            case "n":
              if (implicitKey || json[i + 2] === '"' || json.length < minMultiLineLength) {
                i += 1;
              } else {
                str3 += json.slice(start2, i) + "\n\n";
                while (json[i + 2] === "\\" && json[i + 3] === "n" && json[i + 4] !== '"') {
                  str3 += "\n";
                  i += 2;
                }
                str3 += indent;
                if (json[i + 2] === " ")
                  str3 += "\\";
                i += 1;
                start2 = i + 1;
              }
              break;
            default:
              i += 1;
          }
      }
      str3 = start2 ? str3 + json.slice(start2) : json;
      return implicitKey ? str3 : foldFlowLines.foldFlowLines(str3, indent, foldFlowLines.FOLD_QUOTED, getFoldOptions(ctx, false));
    }
    function singleQuotedString(value, ctx) {
      if (ctx.options.singleQuote === false || ctx.implicitKey && value.includes("\n") || /[ \t]\n|\n[ \t]/.test(value))
        return doubleQuotedString(value, ctx);
      const indent = ctx.indent || (containsDocumentMarker(value) ? "  " : "");
      const res = "'" + value.replace(/'/g, "''").replace(/\n+/g, `$&
${indent}`) + "'";
      return ctx.implicitKey ? res : foldFlowLines.foldFlowLines(res, indent, foldFlowLines.FOLD_FLOW, getFoldOptions(ctx, false));
    }
    function quotedString(value, ctx) {
      const { singleQuote } = ctx.options;
      let qs;
      if (singleQuote === false)
        qs = doubleQuotedString;
      else {
        const hasDouble = value.includes('"');
        const hasSingle = value.includes("'");
        if (hasDouble && !hasSingle)
          qs = singleQuotedString;
        else if (hasSingle && !hasDouble)
          qs = doubleQuotedString;
        else
          qs = singleQuote ? singleQuotedString : doubleQuotedString;
      }
      return qs(value, ctx);
    }
    var blockEndNewlines;
    try {
      blockEndNewlines = new RegExp("(^|(?<!\n))\n+(?!\n|$)", "g");
    } catch {
      blockEndNewlines = /\n+(?!\n|$)/g;
    }
    function blockString({ comment, type, value }, ctx, onComment, onChompKeep) {
      const { blockQuote, commentString, lineWidth } = ctx.options;
      if (!blockQuote || /\n[\t ]+$/.test(value)) {
        return quotedString(value, ctx);
      }
      const indent = ctx.indent || (ctx.forceBlockIndent || containsDocumentMarker(value) ? "  " : "");
      const literal = blockQuote === "literal" ? true : blockQuote === "folded" || type === Scalar.Scalar.BLOCK_FOLDED ? false : type === Scalar.Scalar.BLOCK_LITERAL ? true : !lineLengthOverLimit(value, lineWidth, indent.length);
      if (!value)
        return literal ? "|\n" : ">\n";
      let chomp;
      let endStart;
      for (endStart = value.length; endStart > 0; --endStart) {
        const ch = value[endStart - 1];
        if (ch !== "\n" && ch !== "	" && ch !== " ")
          break;
      }
      let end = value.substring(endStart);
      const endNlPos = end.indexOf("\n");
      if (endNlPos === -1) {
        chomp = "-";
      } else if (value === end || endNlPos !== end.length - 1) {
        chomp = "+";
        if (onChompKeep)
          onChompKeep();
      } else {
        chomp = "";
      }
      if (end) {
        value = value.slice(0, -end.length);
        if (end[end.length - 1] === "\n")
          end = end.slice(0, -1);
        end = end.replace(blockEndNewlines, `$&${indent}`);
      }
      let startWithSpace = false;
      let startEnd;
      let startNlPos = -1;
      for (startEnd = 0; startEnd < value.length; ++startEnd) {
        const ch = value[startEnd];
        if (ch === " ")
          startWithSpace = true;
        else if (ch === "\n")
          startNlPos = startEnd;
        else
          break;
      }
      let start2 = value.substring(0, startNlPos < startEnd ? startNlPos + 1 : startEnd);
      if (start2) {
        value = value.substring(start2.length);
        start2 = start2.replace(/\n+/g, `$&${indent}`);
      }
      const indentSize = indent ? "2" : "1";
      let header = (startWithSpace ? indentSize : "") + chomp;
      if (comment) {
        header += " " + commentString(comment.replace(/ ?[\r\n]+/g, " "));
        if (onComment)
          onComment();
      }
      if (!literal) {
        const foldedValue = value.replace(/\n+/g, "\n$&").replace(/(?:^|\n)([\t ].*)(?:([\n\t ]*)\n(?![\n\t ]))?/g, "$1$2").replace(/\n+/g, `$&${indent}`);
        let literalFallback = false;
        const foldOptions = getFoldOptions(ctx, true);
        if (blockQuote !== "folded" && type !== Scalar.Scalar.BLOCK_FOLDED) {
          foldOptions.onOverflow = () => {
            literalFallback = true;
          };
        }
        const body2 = foldFlowLines.foldFlowLines(`${start2}${foldedValue}${end}`, indent, foldFlowLines.FOLD_BLOCK, foldOptions);
        if (!literalFallback)
          return `>${header}
${indent}${body2}`;
      }
      value = value.replace(/\n+/g, `$&${indent}`);
      return `|${header}
${indent}${start2}${value}${end}`;
    }
    function plainString(item, ctx, onComment, onChompKeep) {
      const { type, value } = item;
      const { actualString, implicitKey, indent, indentStep, inFlow } = ctx;
      if (implicitKey && value.includes("\n") || inFlow && /[[\]{},]/.test(value)) {
        return quotedString(value, ctx);
      }
      if (/^[\n\t ,[\]{}#&*!|>'"%@`]|^[?-]$|^[?-][ \t]|[\n:][ \t]|[ \t]\n|[\n\t ]#|[\n\t :]$/.test(value)) {
        return implicitKey || inFlow || !value.includes("\n") ? quotedString(value, ctx) : blockString(item, ctx, onComment, onChompKeep);
      }
      if (!implicitKey && !inFlow && type !== Scalar.Scalar.PLAIN && value.includes("\n")) {
        return blockString(item, ctx, onComment, onChompKeep);
      }
      if (containsDocumentMarker(value)) {
        if (indent === "") {
          ctx.forceBlockIndent = true;
          return blockString(item, ctx, onComment, onChompKeep);
        } else if (implicitKey && indent === indentStep) {
          return quotedString(value, ctx);
        }
      }
      const str3 = value.replace(/\n+/g, `$&
${indent}`);
      if (actualString) {
        const test = (tag) => tag.default && tag.tag !== "tag:yaml.org,2002:str" && tag.test?.test(str3);
        const { compat, tags } = ctx.doc.schema;
        if (tags.some(test) || compat?.some(test))
          return quotedString(value, ctx);
      }
      return implicitKey ? str3 : foldFlowLines.foldFlowLines(str3, indent, foldFlowLines.FOLD_FLOW, getFoldOptions(ctx, false));
    }
    function stringifyString(item, ctx, onComment, onChompKeep) {
      const { implicitKey, inFlow } = ctx;
      const ss = typeof item.value === "string" ? item : Object.assign({}, item, { value: String(item.value) });
      let { type } = item;
      if (type !== Scalar.Scalar.QUOTE_DOUBLE) {
        if (/[\x00-\x08\x0b-\x1f\x7f-\x9f\u{D800}-\u{DFFF}]/u.test(ss.value))
          type = Scalar.Scalar.QUOTE_DOUBLE;
      }
      const _stringify = (_type) => {
        switch (_type) {
          case Scalar.Scalar.BLOCK_FOLDED:
          case Scalar.Scalar.BLOCK_LITERAL:
            return implicitKey || inFlow ? quotedString(ss.value, ctx) : blockString(ss, ctx, onComment, onChompKeep);
          case Scalar.Scalar.QUOTE_DOUBLE:
            return doubleQuotedString(ss.value, ctx);
          case Scalar.Scalar.QUOTE_SINGLE:
            return singleQuotedString(ss.value, ctx);
          case Scalar.Scalar.PLAIN:
            return plainString(ss, ctx, onComment, onChompKeep);
          default:
            return null;
        }
      };
      let res = _stringify(type);
      if (res === null) {
        const { defaultKeyType, defaultStringType } = ctx.options;
        const t = implicitKey && defaultKeyType || defaultStringType;
        res = _stringify(t);
        if (res === null)
          throw new Error(`Unsupported default string type ${t}`);
      }
      return res;
    }
    exports.stringifyString = stringifyString;
  }
});

// node_modules/yaml/dist/stringify/stringify.js
var require_stringify = __commonJS({
  "node_modules/yaml/dist/stringify/stringify.js"(exports) {
    "use strict";
    var anchors = require_anchors();
    var identity2 = require_identity();
    var stringifyComment = require_stringifyComment();
    var stringifyString = require_stringifyString();
    function createStringifyContext(doc, options) {
      const opt = Object.assign({
        blockQuote: true,
        commentString: stringifyComment.stringifyComment,
        defaultKeyType: null,
        defaultStringType: "PLAIN",
        directives: null,
        doubleQuotedAsJSON: false,
        doubleQuotedMinMultiLineLength: 40,
        falseStr: "false",
        flowCollectionPadding: true,
        indentSeq: true,
        lineWidth: 80,
        minContentWidth: 20,
        nullStr: "null",
        simpleKeys: false,
        singleQuote: null,
        trailingComma: false,
        trueStr: "true",
        verifyAliasOrder: true
      }, doc.schema.toStringOptions, options);
      let inFlow;
      switch (opt.collectionStyle) {
        case "block":
          inFlow = false;
          break;
        case "flow":
          inFlow = true;
          break;
        default:
          inFlow = null;
      }
      return {
        anchors: /* @__PURE__ */ new Set(),
        doc,
        flowCollectionPadding: opt.flowCollectionPadding ? " " : "",
        indent: "",
        indentStep: typeof opt.indent === "number" ? " ".repeat(opt.indent) : "  ",
        inFlow,
        options: opt
      };
    }
    function getTagObject(tags, item) {
      if (item.tag) {
        const match = tags.filter((t) => t.tag === item.tag);
        if (match.length > 0)
          return match.find((t) => t.format === item.format) ?? match[0];
      }
      let tagObj = void 0;
      let obj2;
      if (identity2.isScalar(item)) {
        obj2 = item.value;
        let match = tags.filter((t) => t.identify?.(obj2));
        if (match.length > 1) {
          const testMatch = match.filter((t) => t.test);
          if (testMatch.length > 0)
            match = testMatch;
        }
        tagObj = match.find((t) => t.format === item.format) ?? match.find((t) => !t.format);
      } else {
        obj2 = item;
        tagObj = tags.find((t) => t.nodeClass && obj2 instanceof t.nodeClass);
      }
      if (!tagObj) {
        const name = obj2?.constructor?.name ?? (obj2 === null ? "null" : typeof obj2);
        throw new Error(`Tag not resolved for ${name} value`);
      }
      return tagObj;
    }
    function stringifyProps(node, tagObj, { anchors: anchors$1, doc }) {
      if (!doc.directives)
        return "";
      const props = [];
      const anchor = (identity2.isScalar(node) || identity2.isCollection(node)) && node.anchor;
      if (anchor && anchors.anchorIsValid(anchor)) {
        anchors$1.add(anchor);
        props.push(`&${anchor}`);
      }
      const tag = node.tag ?? (tagObj.default ? null : tagObj.tag);
      if (tag)
        props.push(doc.directives.tagString(tag));
      return props.join(" ");
    }
    function stringify2(item, ctx, onComment, onChompKeep) {
      if (identity2.isPair(item))
        return item.toString(ctx, onComment, onChompKeep);
      if (identity2.isAlias(item)) {
        if (ctx.doc.directives)
          return item.toString(ctx);
        if (ctx.resolvedAliases?.has(item)) {
          throw new TypeError(`Cannot stringify circular structure without alias nodes`);
        } else {
          if (ctx.resolvedAliases)
            ctx.resolvedAliases.add(item);
          else
            ctx.resolvedAliases = /* @__PURE__ */ new Set([item]);
          item = item.resolve(ctx.doc);
        }
      }
      let tagObj = void 0;
      const node = identity2.isNode(item) ? item : ctx.doc.createNode(item, { onTagObj: (o) => tagObj = o });
      tagObj ?? (tagObj = getTagObject(ctx.doc.schema.tags, node));
      const props = stringifyProps(node, tagObj, ctx);
      if (props.length > 0)
        ctx.indentAtStart = (ctx.indentAtStart ?? 0) + props.length + 1;
      const str3 = typeof tagObj.stringify === "function" ? tagObj.stringify(node, ctx, onComment, onChompKeep) : identity2.isScalar(node) ? stringifyString.stringifyString(node, ctx, onComment, onChompKeep) : node.toString(ctx, onComment, onChompKeep);
      if (!props)
        return str3;
      return identity2.isScalar(node) || str3[0] === "{" || str3[0] === "[" ? `${props} ${str3}` : `${props}
${ctx.indent}${str3}`;
    }
    exports.createStringifyContext = createStringifyContext;
    exports.stringify = stringify2;
  }
});

// node_modules/yaml/dist/stringify/stringifyPair.js
var require_stringifyPair = __commonJS({
  "node_modules/yaml/dist/stringify/stringifyPair.js"(exports) {
    "use strict";
    var identity2 = require_identity();
    var Scalar = require_Scalar();
    var stringify2 = require_stringify();
    var stringifyComment = require_stringifyComment();
    function stringifyPair({ key, value }, ctx, onComment, onChompKeep) {
      const { allNullValues, doc, indent, indentStep, options: { commentString, indentSeq, simpleKeys } } = ctx;
      let keyComment = identity2.isNode(key) && key.comment || null;
      if (simpleKeys) {
        if (keyComment) {
          throw new Error("With simple keys, key nodes cannot have comments");
        }
        if (identity2.isCollection(key) || !identity2.isNode(key) && typeof key === "object") {
          const msg = "With simple keys, collection cannot be used as a key value";
          throw new Error(msg);
        }
      }
      let explicitKey = !simpleKeys && (!key || keyComment && value == null && !ctx.inFlow || identity2.isCollection(key) || (identity2.isScalar(key) ? key.type === Scalar.Scalar.BLOCK_FOLDED || key.type === Scalar.Scalar.BLOCK_LITERAL : typeof key === "object"));
      ctx = Object.assign({}, ctx, {
        allNullValues: false,
        implicitKey: !explicitKey && (simpleKeys || !allNullValues),
        indent: indent + indentStep
      });
      let keyCommentDone = false;
      let chompKeep = false;
      let str3 = stringify2.stringify(key, ctx, () => keyCommentDone = true, () => chompKeep = true);
      if (!explicitKey && !ctx.inFlow && str3.length > 1024) {
        if (simpleKeys)
          throw new Error("With simple keys, single line scalar must not span more than 1024 characters");
        explicitKey = true;
      }
      if (ctx.inFlow) {
        if (allNullValues || value == null) {
          if (keyCommentDone && onComment)
            onComment();
          return str3 === "" ? "?" : explicitKey ? `? ${str3}` : str3;
        }
      } else if (allNullValues && !simpleKeys || value == null && explicitKey) {
        str3 = `? ${str3}`;
        if (keyComment && !keyCommentDone) {
          str3 += stringifyComment.lineComment(str3, ctx.indent, commentString(keyComment));
        } else if (chompKeep && onChompKeep)
          onChompKeep();
        return str3;
      }
      if (keyCommentDone)
        keyComment = null;
      if (explicitKey) {
        if (keyComment)
          str3 += stringifyComment.lineComment(str3, ctx.indent, commentString(keyComment));
        str3 = `? ${str3}
${indent}:`;
      } else {
        str3 = `${str3}:`;
        if (keyComment)
          str3 += stringifyComment.lineComment(str3, ctx.indent, commentString(keyComment));
      }
      let vsb, vcb, valueComment;
      if (identity2.isNode(value)) {
        vsb = !!value.spaceBefore;
        vcb = value.commentBefore;
        valueComment = value.comment;
      } else {
        vsb = false;
        vcb = null;
        valueComment = null;
        if (value && typeof value === "object")
          value = doc.createNode(value);
      }
      ctx.implicitKey = false;
      if (!explicitKey && !keyComment && identity2.isScalar(value))
        ctx.indentAtStart = str3.length + 1;
      chompKeep = false;
      if (!indentSeq && indentStep.length >= 2 && !ctx.inFlow && !explicitKey && identity2.isSeq(value) && !value.flow && !value.tag && !value.anchor) {
        ctx.indent = ctx.indent.substring(2);
      }
      let valueCommentDone = false;
      const valueStr = stringify2.stringify(value, ctx, () => valueCommentDone = true, () => chompKeep = true);
      let ws = " ";
      if (keyComment || vsb || vcb) {
        ws = vsb ? "\n" : "";
        if (vcb) {
          const cs = commentString(vcb);
          ws += `
${stringifyComment.indentComment(cs, ctx.indent)}`;
        }
        if (valueStr === "" && !ctx.inFlow) {
          if (ws === "\n" && valueComment)
            ws = "\n\n";
        } else {
          ws += `
${ctx.indent}`;
        }
      } else if (!explicitKey && identity2.isCollection(value)) {
        const vs0 = valueStr[0];
        const nl0 = valueStr.indexOf("\n");
        const hasNewline = nl0 !== -1;
        const flow = ctx.inFlow ?? value.flow ?? value.items.length === 0;
        if (hasNewline || !flow) {
          let hasPropsLine = false;
          if (hasNewline && (vs0 === "&" || vs0 === "!")) {
            let sp0 = valueStr.indexOf(" ");
            if (vs0 === "&" && sp0 !== -1 && sp0 < nl0 && valueStr[sp0 + 1] === "!") {
              sp0 = valueStr.indexOf(" ", sp0 + 1);
            }
            if (sp0 === -1 || nl0 < sp0)
              hasPropsLine = true;
          }
          if (!hasPropsLine)
            ws = `
${ctx.indent}`;
        }
      } else if (valueStr === "" || valueStr[0] === "\n") {
        ws = "";
      }
      str3 += ws + valueStr;
      if (ctx.inFlow) {
        if (valueCommentDone && onComment)
          onComment();
      } else if (valueComment && !valueCommentDone) {
        str3 += stringifyComment.lineComment(str3, ctx.indent, commentString(valueComment));
      } else if (chompKeep && onChompKeep) {
        onChompKeep();
      }
      return str3;
    }
    exports.stringifyPair = stringifyPair;
  }
});

// node_modules/yaml/dist/log.js
var require_log = __commonJS({
  "node_modules/yaml/dist/log.js"(exports) {
    "use strict";
    var node_process = __require("process");
    function debug(logLevel, ...messages) {
      if (logLevel === "debug")
        console.log(...messages);
    }
    function warn2(logLevel, warning) {
      if (logLevel === "debug" || logLevel === "warn") {
        if (typeof node_process.emitWarning === "function")
          node_process.emitWarning(warning);
        else
          console.warn(warning);
      }
    }
    exports.debug = debug;
    exports.warn = warn2;
  }
});

// node_modules/yaml/dist/schema/yaml-1.1/merge.js
var require_merge = __commonJS({
  "node_modules/yaml/dist/schema/yaml-1.1/merge.js"(exports) {
    "use strict";
    var identity2 = require_identity();
    var Scalar = require_Scalar();
    var MERGE_KEY = "<<";
    var merge = {
      identify: (value) => value === MERGE_KEY || typeof value === "symbol" && value.description === MERGE_KEY,
      default: "key",
      tag: "tag:yaml.org,2002:merge",
      test: /^<<$/,
      resolve: () => Object.assign(new Scalar.Scalar(Symbol(MERGE_KEY)), {
        addToJSMap: addMergeToJSMap
      }),
      stringify: () => MERGE_KEY
    };
    var isMergeKey = (ctx, key) => (merge.identify(key) || identity2.isScalar(key) && (!key.type || key.type === Scalar.Scalar.PLAIN) && merge.identify(key.value)) && ctx?.doc.schema.tags.some((tag) => tag.tag === merge.tag && tag.default);
    function addMergeToJSMap(ctx, map, value) {
      const source = resolveAliasValue(ctx, value);
      if (identity2.isSeq(source))
        for (const it of source.items)
          mergeValue(ctx, map, it);
      else if (Array.isArray(source))
        for (const it of source)
          mergeValue(ctx, map, it);
      else
        mergeValue(ctx, map, source);
    }
    function mergeValue(ctx, map, value) {
      const source = resolveAliasValue(ctx, value);
      if (!identity2.isMap(source))
        throw new Error("Merge sources must be maps or map aliases");
      const srcMap = source.toJSON(null, ctx, Map);
      for (const [key, value2] of srcMap) {
        if (map instanceof Map) {
          if (!map.has(key))
            map.set(key, value2);
        } else if (map instanceof Set) {
          map.add(key);
        } else if (!Object.prototype.hasOwnProperty.call(map, key)) {
          Object.defineProperty(map, key, {
            value: value2,
            writable: true,
            enumerable: true,
            configurable: true
          });
        }
      }
      return map;
    }
    function resolveAliasValue(ctx, value) {
      return ctx && identity2.isAlias(value) ? value.resolve(ctx.doc, ctx) : value;
    }
    exports.addMergeToJSMap = addMergeToJSMap;
    exports.isMergeKey = isMergeKey;
    exports.merge = merge;
  }
});

// node_modules/yaml/dist/nodes/addPairToJSMap.js
var require_addPairToJSMap = __commonJS({
  "node_modules/yaml/dist/nodes/addPairToJSMap.js"(exports) {
    "use strict";
    var log2 = require_log();
    var merge = require_merge();
    var stringify2 = require_stringify();
    var identity2 = require_identity();
    var toJS = require_toJS();
    function addPairToJSMap(ctx, map, { key, value }) {
      if (identity2.isNode(key) && key.addToJSMap)
        key.addToJSMap(ctx, map, value);
      else if (merge.isMergeKey(ctx, key))
        merge.addMergeToJSMap(ctx, map, value);
      else {
        const jsKey = toJS.toJS(key, "", ctx);
        if (map instanceof Map) {
          map.set(jsKey, toJS.toJS(value, jsKey, ctx));
        } else if (map instanceof Set) {
          map.add(jsKey);
        } else {
          const stringKey = stringifyKey(key, jsKey, ctx);
          const jsValue = toJS.toJS(value, stringKey, ctx);
          if (stringKey in map)
            Object.defineProperty(map, stringKey, {
              value: jsValue,
              writable: true,
              enumerable: true,
              configurable: true
            });
          else
            map[stringKey] = jsValue;
        }
      }
      return map;
    }
    function stringifyKey(key, jsKey, ctx) {
      if (jsKey === null)
        return "";
      if (typeof jsKey !== "object")
        return String(jsKey);
      if (identity2.isNode(key) && ctx?.doc) {
        const strCtx = stringify2.createStringifyContext(ctx.doc, {});
        strCtx.anchors = /* @__PURE__ */ new Set();
        for (const node of ctx.anchors.keys())
          strCtx.anchors.add(node.anchor);
        strCtx.inFlow = true;
        strCtx.inStringifyKey = true;
        const strKey = key.toString(strCtx);
        if (!ctx.mapKeyWarned) {
          let jsonStr = JSON.stringify(strKey);
          if (jsonStr.length > 40)
            jsonStr = jsonStr.substring(0, 36) + '..."';
          log2.warn(ctx.doc.options.logLevel, `Keys with collection values will be stringified due to JS Object restrictions: ${jsonStr}. Set mapAsMap: true to use object keys.`);
          ctx.mapKeyWarned = true;
        }
        return strKey;
      }
      return JSON.stringify(jsKey);
    }
    exports.addPairToJSMap = addPairToJSMap;
  }
});

// node_modules/yaml/dist/nodes/Pair.js
var require_Pair = __commonJS({
  "node_modules/yaml/dist/nodes/Pair.js"(exports) {
    "use strict";
    var createNode = require_createNode();
    var stringifyPair = require_stringifyPair();
    var addPairToJSMap = require_addPairToJSMap();
    var identity2 = require_identity();
    function createPair(key, value, ctx) {
      const k = createNode.createNode(key, void 0, ctx);
      const v = createNode.createNode(value, void 0, ctx);
      return new Pair(k, v);
    }
    var Pair = class _Pair {
      constructor(key, value = null) {
        Object.defineProperty(this, identity2.NODE_TYPE, { value: identity2.PAIR });
        this.key = key;
        this.value = value;
      }
      clone(schema) {
        let { key, value } = this;
        if (identity2.isNode(key))
          key = key.clone(schema);
        if (identity2.isNode(value))
          value = value.clone(schema);
        return new _Pair(key, value);
      }
      toJSON(_, ctx) {
        const pair = ctx?.mapAsMap ? /* @__PURE__ */ new Map() : {};
        return addPairToJSMap.addPairToJSMap(ctx, pair, this);
      }
      toString(ctx, onComment, onChompKeep) {
        return ctx?.doc ? stringifyPair.stringifyPair(this, ctx, onComment, onChompKeep) : JSON.stringify(this);
      }
    };
    exports.Pair = Pair;
    exports.createPair = createPair;
  }
});

// node_modules/yaml/dist/stringify/stringifyCollection.js
var require_stringifyCollection = __commonJS({
  "node_modules/yaml/dist/stringify/stringifyCollection.js"(exports) {
    "use strict";
    var identity2 = require_identity();
    var stringify2 = require_stringify();
    var stringifyComment = require_stringifyComment();
    function stringifyCollection(collection, ctx, options) {
      const flow = ctx.inFlow ?? collection.flow;
      const stringify3 = flow ? stringifyFlowCollection : stringifyBlockCollection;
      return stringify3(collection, ctx, options);
    }
    function stringifyBlockCollection({ comment, items: items2 }, ctx, { blockItemPrefix, flowChars, itemIndent, onChompKeep, onComment }) {
      const { indent, options: { commentString } } = ctx;
      const itemCtx = Object.assign({}, ctx, { indent: itemIndent, type: null });
      let chompKeep = false;
      const lines = [];
      for (let i = 0; i < items2.length; ++i) {
        const item = items2[i];
        let comment2 = null;
        if (identity2.isNode(item)) {
          if (!chompKeep && item.spaceBefore)
            lines.push("");
          addCommentBefore(ctx, lines, item.commentBefore, chompKeep);
          if (item.comment)
            comment2 = item.comment;
        } else if (identity2.isPair(item)) {
          const ik = identity2.isNode(item.key) ? item.key : null;
          if (ik) {
            if (!chompKeep && ik.spaceBefore)
              lines.push("");
            addCommentBefore(ctx, lines, ik.commentBefore, chompKeep);
          }
        }
        chompKeep = false;
        let str4 = stringify2.stringify(item, itemCtx, () => comment2 = null, () => chompKeep = true);
        if (comment2)
          str4 += stringifyComment.lineComment(str4, itemIndent, commentString(comment2));
        if (chompKeep && comment2)
          chompKeep = false;
        lines.push(blockItemPrefix + str4);
      }
      let str3;
      if (lines.length === 0) {
        str3 = flowChars.start + flowChars.end;
      } else {
        str3 = lines[0];
        for (let i = 1; i < lines.length; ++i) {
          const line3 = lines[i];
          str3 += line3 ? `
${indent}${line3}` : "\n";
        }
      }
      if (comment) {
        str3 += "\n" + stringifyComment.indentComment(commentString(comment), indent);
        if (onComment)
          onComment();
      } else if (chompKeep && onChompKeep)
        onChompKeep();
      return str3;
    }
    function stringifyFlowCollection({ items: items2 }, ctx, { flowChars, itemIndent }) {
      const { indent, indentStep, flowCollectionPadding: fcPadding, options: { commentString } } = ctx;
      itemIndent += indentStep;
      const itemCtx = Object.assign({}, ctx, {
        indent: itemIndent,
        inFlow: true,
        type: null
      });
      let reqNewline = false;
      let linesAtValue = 0;
      const lines = [];
      for (let i = 0; i < items2.length; ++i) {
        const item = items2[i];
        let comment = null;
        if (identity2.isNode(item)) {
          if (item.spaceBefore)
            lines.push("");
          addCommentBefore(ctx, lines, item.commentBefore, false);
          if (item.comment)
            comment = item.comment;
        } else if (identity2.isPair(item)) {
          const ik = identity2.isNode(item.key) ? item.key : null;
          if (ik) {
            if (ik.spaceBefore)
              lines.push("");
            addCommentBefore(ctx, lines, ik.commentBefore, false);
            if (ik.comment)
              reqNewline = true;
          }
          const iv = identity2.isNode(item.value) ? item.value : null;
          if (iv) {
            if (iv.comment)
              comment = iv.comment;
            if (iv.commentBefore)
              reqNewline = true;
          } else if (item.value == null && ik?.comment) {
            comment = ik.comment;
          }
        }
        if (comment)
          reqNewline = true;
        let str3 = stringify2.stringify(item, itemCtx, () => comment = null);
        reqNewline || (reqNewline = lines.length > linesAtValue || str3.includes("\n"));
        if (i < items2.length - 1) {
          str3 += ",";
        } else if (ctx.options.trailingComma) {
          if (ctx.options.lineWidth > 0) {
            reqNewline || (reqNewline = lines.reduce((sum, line3) => sum + line3.length + 2, 2) + (str3.length + 2) > ctx.options.lineWidth);
          }
          if (reqNewline) {
            str3 += ",";
          }
        }
        if (comment)
          str3 += stringifyComment.lineComment(str3, itemIndent, commentString(comment));
        lines.push(str3);
        linesAtValue = lines.length;
      }
      const { start: start2, end } = flowChars;
      if (lines.length === 0) {
        return start2 + end;
      } else {
        if (!reqNewline) {
          const len = lines.reduce((sum, line3) => sum + line3.length + 2, 2);
          reqNewline = ctx.options.lineWidth > 0 && len > ctx.options.lineWidth;
        }
        if (reqNewline) {
          let str3 = start2;
          for (const line3 of lines)
            str3 += line3 ? `
${indentStep}${indent}${line3}` : "\n";
          return `${str3}
${indent}${end}`;
        } else {
          return `${start2}${fcPadding}${lines.join(" ")}${fcPadding}${end}`;
        }
      }
    }
    function addCommentBefore({ indent, options: { commentString } }, lines, comment, chompKeep) {
      if (comment && chompKeep)
        comment = comment.replace(/^\n+/, "");
      if (comment) {
        const ic = stringifyComment.indentComment(commentString(comment), indent);
        lines.push(ic.trimStart());
      }
    }
    exports.stringifyCollection = stringifyCollection;
  }
});

// node_modules/yaml/dist/nodes/YAMLMap.js
var require_YAMLMap = __commonJS({
  "node_modules/yaml/dist/nodes/YAMLMap.js"(exports) {
    "use strict";
    var stringifyCollection = require_stringifyCollection();
    var addPairToJSMap = require_addPairToJSMap();
    var Collection = require_Collection();
    var identity2 = require_identity();
    var Pair = require_Pair();
    var Scalar = require_Scalar();
    function findPair(items2, key) {
      const k = identity2.isScalar(key) ? key.value : key;
      for (const it of items2) {
        if (identity2.isPair(it)) {
          if (it.key === key || it.key === k)
            return it;
          if (identity2.isScalar(it.key) && it.key.value === k)
            return it;
        }
      }
      return void 0;
    }
    var YAMLMap = class extends Collection.Collection {
      static get tagName() {
        return "tag:yaml.org,2002:map";
      }
      constructor(schema) {
        super(identity2.MAP, schema);
        this.items = [];
      }
      /**
       * A generic collection parsing method that can be extended
       * to other node classes that inherit from YAMLMap
       */
      static from(schema, obj2, ctx) {
        const { keepUndefined, replacer } = ctx;
        const map = new this(schema);
        const add = (key, value) => {
          if (typeof replacer === "function")
            value = replacer.call(obj2, key, value);
          else if (Array.isArray(replacer) && !replacer.includes(key))
            return;
          if (value !== void 0 || keepUndefined)
            map.items.push(Pair.createPair(key, value, ctx));
        };
        if (obj2 instanceof Map) {
          for (const [key, value] of obj2)
            add(key, value);
        } else if (obj2 && typeof obj2 === "object") {
          for (const key of Object.keys(obj2))
            add(key, obj2[key]);
        }
        if (typeof schema.sortMapEntries === "function") {
          map.items.sort(schema.sortMapEntries);
        }
        return map;
      }
      /**
       * Adds a value to the collection.
       *
       * @param overwrite - If not set `true`, using a key that is already in the
       *   collection will throw. Otherwise, overwrites the previous value.
       */
      add(pair, overwrite) {
        let _pair;
        if (identity2.isPair(pair))
          _pair = pair;
        else if (!pair || typeof pair !== "object" || !("key" in pair)) {
          _pair = new Pair.Pair(pair, pair?.value);
        } else
          _pair = new Pair.Pair(pair.key, pair.value);
        const prev = findPair(this.items, _pair.key);
        const sortEntries = this.schema?.sortMapEntries;
        if (prev) {
          if (!overwrite)
            throw new Error(`Key ${_pair.key} already set`);
          if (identity2.isScalar(prev.value) && Scalar.isScalarValue(_pair.value))
            prev.value.value = _pair.value;
          else
            prev.value = _pair.value;
        } else if (sortEntries) {
          const i = this.items.findIndex((item) => sortEntries(_pair, item) < 0);
          if (i === -1)
            this.items.push(_pair);
          else
            this.items.splice(i, 0, _pair);
        } else {
          this.items.push(_pair);
        }
      }
      delete(key) {
        const it = findPair(this.items, key);
        if (!it)
          return false;
        const del = this.items.splice(this.items.indexOf(it), 1);
        return del.length > 0;
      }
      get(key, keepScalar) {
        const it = findPair(this.items, key);
        const node = it?.value;
        return (!keepScalar && identity2.isScalar(node) ? node.value : node) ?? void 0;
      }
      has(key) {
        return !!findPair(this.items, key);
      }
      set(key, value) {
        this.add(new Pair.Pair(key, value), true);
      }
      /**
       * @param ctx - Conversion context, originally set in Document#toJS()
       * @param {Class} Type - If set, forces the returned collection type
       * @returns Instance of Type, Map, or Object
       */
      toJSON(_, ctx, Type) {
        const map = Type ? new Type() : ctx?.mapAsMap ? /* @__PURE__ */ new Map() : {};
        if (ctx?.onCreate)
          ctx.onCreate(map);
        for (const item of this.items)
          addPairToJSMap.addPairToJSMap(ctx, map, item);
        return map;
      }
      toString(ctx, onComment, onChompKeep) {
        if (!ctx)
          return JSON.stringify(this);
        for (const item of this.items) {
          if (!identity2.isPair(item))
            throw new Error(`Map items must all be pairs; found ${JSON.stringify(item)} instead`);
        }
        if (!ctx.allNullValues && this.hasAllNullValues(false))
          ctx = Object.assign({}, ctx, { allNullValues: true });
        return stringifyCollection.stringifyCollection(this, ctx, {
          blockItemPrefix: "",
          flowChars: { start: "{", end: "}" },
          itemIndent: ctx.indent || "",
          onChompKeep,
          onComment
        });
      }
    };
    exports.YAMLMap = YAMLMap;
    exports.findPair = findPair;
  }
});

// node_modules/yaml/dist/schema/common/map.js
var require_map = __commonJS({
  "node_modules/yaml/dist/schema/common/map.js"(exports) {
    "use strict";
    var identity2 = require_identity();
    var YAMLMap = require_YAMLMap();
    var map = {
      collection: "map",
      default: true,
      nodeClass: YAMLMap.YAMLMap,
      tag: "tag:yaml.org,2002:map",
      resolve(map2, onError) {
        if (!identity2.isMap(map2))
          onError("Expected a mapping for this tag");
        return map2;
      },
      createNode: (schema, obj2, ctx) => YAMLMap.YAMLMap.from(schema, obj2, ctx)
    };
    exports.map = map;
  }
});

// node_modules/yaml/dist/nodes/YAMLSeq.js
var require_YAMLSeq = __commonJS({
  "node_modules/yaml/dist/nodes/YAMLSeq.js"(exports) {
    "use strict";
    var createNode = require_createNode();
    var stringifyCollection = require_stringifyCollection();
    var Collection = require_Collection();
    var identity2 = require_identity();
    var Scalar = require_Scalar();
    var toJS = require_toJS();
    var YAMLSeq = class extends Collection.Collection {
      static get tagName() {
        return "tag:yaml.org,2002:seq";
      }
      constructor(schema) {
        super(identity2.SEQ, schema);
        this.items = [];
      }
      add(value) {
        this.items.push(value);
      }
      /**
       * Removes a value from the collection.
       *
       * `key` must contain a representation of an integer for this to succeed.
       * It may be wrapped in a `Scalar`.
       *
       * @returns `true` if the item was found and removed.
       */
      delete(key) {
        const idx = asItemIndex(key);
        if (typeof idx !== "number")
          return false;
        const del = this.items.splice(idx, 1);
        return del.length > 0;
      }
      get(key, keepScalar) {
        const idx = asItemIndex(key);
        if (typeof idx !== "number")
          return void 0;
        const it = this.items[idx];
        return !keepScalar && identity2.isScalar(it) ? it.value : it;
      }
      /**
       * Checks if the collection includes a value with the key `key`.
       *
       * `key` must contain a representation of an integer for this to succeed.
       * It may be wrapped in a `Scalar`.
       */
      has(key) {
        const idx = asItemIndex(key);
        return typeof idx === "number" && idx < this.items.length;
      }
      /**
       * Sets a value in this collection. For `!!set`, `value` needs to be a
       * boolean to add/remove the item from the set.
       *
       * If `key` does not contain a representation of an integer, this will throw.
       * It may be wrapped in a `Scalar`.
       */
      set(key, value) {
        const idx = asItemIndex(key);
        if (typeof idx !== "number")
          throw new Error(`Expected a valid index, not ${key}.`);
        const prev = this.items[idx];
        if (identity2.isScalar(prev) && Scalar.isScalarValue(value))
          prev.value = value;
        else
          this.items[idx] = value;
      }
      toJSON(_, ctx) {
        const seq = [];
        if (ctx?.onCreate)
          ctx.onCreate(seq);
        let i = 0;
        for (const item of this.items)
          seq.push(toJS.toJS(item, String(i++), ctx));
        return seq;
      }
      toString(ctx, onComment, onChompKeep) {
        if (!ctx)
          return JSON.stringify(this);
        return stringifyCollection.stringifyCollection(this, ctx, {
          blockItemPrefix: "- ",
          flowChars: { start: "[", end: "]" },
          itemIndent: (ctx.indent || "") + "  ",
          onChompKeep,
          onComment
        });
      }
      static from(schema, obj2, ctx) {
        const { replacer } = ctx;
        const seq = new this(schema);
        if (obj2 && Symbol.iterator in Object(obj2)) {
          let i = 0;
          for (let it of obj2) {
            if (typeof replacer === "function") {
              const key = obj2 instanceof Set ? it : String(i++);
              it = replacer.call(obj2, key, it);
            }
            seq.items.push(createNode.createNode(it, void 0, ctx));
          }
        }
        return seq;
      }
    };
    function asItemIndex(key) {
      let idx = identity2.isScalar(key) ? key.value : key;
      if (idx && typeof idx === "string")
        idx = Number(idx);
      return typeof idx === "number" && Number.isInteger(idx) && idx >= 0 ? idx : null;
    }
    exports.YAMLSeq = YAMLSeq;
  }
});

// node_modules/yaml/dist/schema/common/seq.js
var require_seq = __commonJS({
  "node_modules/yaml/dist/schema/common/seq.js"(exports) {
    "use strict";
    var identity2 = require_identity();
    var YAMLSeq = require_YAMLSeq();
    var seq = {
      collection: "seq",
      default: true,
      nodeClass: YAMLSeq.YAMLSeq,
      tag: "tag:yaml.org,2002:seq",
      resolve(seq2, onError) {
        if (!identity2.isSeq(seq2))
          onError("Expected a sequence for this tag");
        return seq2;
      },
      createNode: (schema, obj2, ctx) => YAMLSeq.YAMLSeq.from(schema, obj2, ctx)
    };
    exports.seq = seq;
  }
});

// node_modules/yaml/dist/schema/common/string.js
var require_string = __commonJS({
  "node_modules/yaml/dist/schema/common/string.js"(exports) {
    "use strict";
    var stringifyString = require_stringifyString();
    var string = {
      identify: (value) => typeof value === "string",
      default: true,
      tag: "tag:yaml.org,2002:str",
      resolve: (str3) => str3,
      stringify(item, ctx, onComment, onChompKeep) {
        ctx = Object.assign({ actualString: true }, ctx);
        return stringifyString.stringifyString(item, ctx, onComment, onChompKeep);
      }
    };
    exports.string = string;
  }
});

// node_modules/yaml/dist/schema/common/null.js
var require_null = __commonJS({
  "node_modules/yaml/dist/schema/common/null.js"(exports) {
    "use strict";
    var Scalar = require_Scalar();
    var nullTag = {
      identify: (value) => value == null,
      createNode: () => new Scalar.Scalar(null),
      default: true,
      tag: "tag:yaml.org,2002:null",
      test: /^(?:~|[Nn]ull|NULL)?$/,
      resolve: () => new Scalar.Scalar(null),
      stringify: ({ source }, ctx) => typeof source === "string" && nullTag.test.test(source) ? source : ctx.options.nullStr
    };
    exports.nullTag = nullTag;
  }
});

// node_modules/yaml/dist/schema/core/bool.js
var require_bool = __commonJS({
  "node_modules/yaml/dist/schema/core/bool.js"(exports) {
    "use strict";
    var Scalar = require_Scalar();
    var boolTag = {
      identify: (value) => typeof value === "boolean",
      default: true,
      tag: "tag:yaml.org,2002:bool",
      test: /^(?:[Tt]rue|TRUE|[Ff]alse|FALSE)$/,
      resolve: (str3) => new Scalar.Scalar(str3[0] === "t" || str3[0] === "T"),
      stringify({ source, value }, ctx) {
        if (source && boolTag.test.test(source)) {
          const sv = source[0] === "t" || source[0] === "T";
          if (value === sv)
            return source;
        }
        return value ? ctx.options.trueStr : ctx.options.falseStr;
      }
    };
    exports.boolTag = boolTag;
  }
});

// node_modules/yaml/dist/stringify/stringifyNumber.js
var require_stringifyNumber = __commonJS({
  "node_modules/yaml/dist/stringify/stringifyNumber.js"(exports) {
    "use strict";
    function stringifyNumber({ format, minFractionDigits, tag, value }) {
      if (typeof value === "bigint")
        return String(value);
      const num2 = typeof value === "number" ? value : Number(value);
      if (!isFinite(num2))
        return isNaN(num2) ? ".nan" : num2 < 0 ? "-.inf" : ".inf";
      let n2 = Object.is(value, -0) ? "-0" : JSON.stringify(value);
      if (!format && minFractionDigits && (!tag || tag === "tag:yaml.org,2002:float") && /^-?\d/.test(n2) && !n2.includes("e")) {
        let i = n2.indexOf(".");
        if (i < 0) {
          i = n2.length;
          n2 += ".";
        }
        let d = minFractionDigits - (n2.length - i - 1);
        while (d-- > 0)
          n2 += "0";
      }
      return n2;
    }
    exports.stringifyNumber = stringifyNumber;
  }
});

// node_modules/yaml/dist/schema/core/float.js
var require_float = __commonJS({
  "node_modules/yaml/dist/schema/core/float.js"(exports) {
    "use strict";
    var Scalar = require_Scalar();
    var stringifyNumber = require_stringifyNumber();
    var floatNaN = {
      identify: (value) => typeof value === "number",
      default: true,
      tag: "tag:yaml.org,2002:float",
      test: /^(?:[-+]?\.(?:inf|Inf|INF)|\.nan|\.NaN|\.NAN)$/,
      resolve: (str3) => str3.slice(-3).toLowerCase() === "nan" ? NaN : str3[0] === "-" ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY,
      stringify: stringifyNumber.stringifyNumber
    };
    var floatExp = {
      identify: (value) => typeof value === "number",
      default: true,
      tag: "tag:yaml.org,2002:float",
      format: "EXP",
      test: /^[-+]?(?:\.[0-9]+|[0-9]+(?:\.[0-9]*)?)[eE][-+]?[0-9]+$/,
      resolve: (str3) => parseFloat(str3),
      stringify(node) {
        const num2 = Number(node.value);
        return isFinite(num2) ? num2.toExponential() : stringifyNumber.stringifyNumber(node);
      }
    };
    var float = {
      identify: (value) => typeof value === "number",
      default: true,
      tag: "tag:yaml.org,2002:float",
      test: /^[-+]?(?:\.[0-9]+|[0-9]+\.[0-9]*)$/,
      resolve(str3) {
        const node = new Scalar.Scalar(parseFloat(str3));
        const dot = str3.indexOf(".");
        if (dot !== -1 && str3[str3.length - 1] === "0")
          node.minFractionDigits = str3.length - dot - 1;
        return node;
      },
      stringify: stringifyNumber.stringifyNumber
    };
    exports.float = float;
    exports.floatExp = floatExp;
    exports.floatNaN = floatNaN;
  }
});

// node_modules/yaml/dist/schema/core/int.js
var require_int = __commonJS({
  "node_modules/yaml/dist/schema/core/int.js"(exports) {
    "use strict";
    var stringifyNumber = require_stringifyNumber();
    var intIdentify = (value) => typeof value === "bigint" || Number.isInteger(value);
    var intResolve = (str3, offset, radix, { intAsBigInt }) => intAsBigInt ? BigInt(str3) : parseInt(str3.substring(offset), radix);
    function intStringify(node, radix, prefix) {
      const { value } = node;
      if (intIdentify(value) && value >= 0)
        return prefix + value.toString(radix);
      return stringifyNumber.stringifyNumber(node);
    }
    var intOct = {
      identify: (value) => intIdentify(value) && value >= 0,
      default: true,
      tag: "tag:yaml.org,2002:int",
      format: "OCT",
      test: /^0o[0-7]+$/,
      resolve: (str3, _onError, opt) => intResolve(str3, 2, 8, opt),
      stringify: (node) => intStringify(node, 8, "0o")
    };
    var int = {
      identify: intIdentify,
      default: true,
      tag: "tag:yaml.org,2002:int",
      test: /^[-+]?[0-9]+$/,
      resolve: (str3, _onError, opt) => intResolve(str3, 0, 10, opt),
      stringify: stringifyNumber.stringifyNumber
    };
    var intHex = {
      identify: (value) => intIdentify(value) && value >= 0,
      default: true,
      tag: "tag:yaml.org,2002:int",
      format: "HEX",
      test: /^0x[0-9a-fA-F]+$/,
      resolve: (str3, _onError, opt) => intResolve(str3, 2, 16, opt),
      stringify: (node) => intStringify(node, 16, "0x")
    };
    exports.int = int;
    exports.intHex = intHex;
    exports.intOct = intOct;
  }
});

// node_modules/yaml/dist/schema/core/schema.js
var require_schema = __commonJS({
  "node_modules/yaml/dist/schema/core/schema.js"(exports) {
    "use strict";
    var map = require_map();
    var _null = require_null();
    var seq = require_seq();
    var string = require_string();
    var bool = require_bool();
    var float = require_float();
    var int = require_int();
    var schema = [
      map.map,
      seq.seq,
      string.string,
      _null.nullTag,
      bool.boolTag,
      int.intOct,
      int.int,
      int.intHex,
      float.floatNaN,
      float.floatExp,
      float.float
    ];
    exports.schema = schema;
  }
});

// node_modules/yaml/dist/schema/json/schema.js
var require_schema2 = __commonJS({
  "node_modules/yaml/dist/schema/json/schema.js"(exports) {
    "use strict";
    var Scalar = require_Scalar();
    var map = require_map();
    var seq = require_seq();
    function intIdentify(value) {
      return typeof value === "bigint" || Number.isInteger(value);
    }
    var stringifyJSON = ({ value }) => JSON.stringify(value);
    var jsonScalars = [
      {
        identify: (value) => typeof value === "string",
        default: true,
        tag: "tag:yaml.org,2002:str",
        resolve: (str3) => str3,
        stringify: stringifyJSON
      },
      {
        identify: (value) => value == null,
        createNode: () => new Scalar.Scalar(null),
        default: true,
        tag: "tag:yaml.org,2002:null",
        test: /^null$/,
        resolve: () => null,
        stringify: stringifyJSON
      },
      {
        identify: (value) => typeof value === "boolean",
        default: true,
        tag: "tag:yaml.org,2002:bool",
        test: /^true$|^false$/,
        resolve: (str3) => str3 === "true",
        stringify: stringifyJSON
      },
      {
        identify: intIdentify,
        default: true,
        tag: "tag:yaml.org,2002:int",
        test: /^-?(?:0|[1-9][0-9]*)$/,
        resolve: (str3, _onError, { intAsBigInt }) => intAsBigInt ? BigInt(str3) : parseInt(str3, 10),
        stringify: ({ value }) => intIdentify(value) ? value.toString() : JSON.stringify(value)
      },
      {
        identify: (value) => typeof value === "number",
        default: true,
        tag: "tag:yaml.org,2002:float",
        test: /^-?(?:0|[1-9][0-9]*)(?:\.[0-9]*)?(?:[eE][-+]?[0-9]+)?$/,
        resolve: (str3) => parseFloat(str3),
        stringify: stringifyJSON
      }
    ];
    var jsonError = {
      default: true,
      tag: "",
      test: /^/,
      resolve(str3, onError) {
        onError(`Unresolved plain scalar ${JSON.stringify(str3)}`);
        return str3;
      }
    };
    var schema = [map.map, seq.seq].concat(jsonScalars, jsonError);
    exports.schema = schema;
  }
});

// node_modules/yaml/dist/schema/yaml-1.1/binary.js
var require_binary = __commonJS({
  "node_modules/yaml/dist/schema/yaml-1.1/binary.js"(exports) {
    "use strict";
    var node_buffer = __require("buffer");
    var Scalar = require_Scalar();
    var stringifyString = require_stringifyString();
    var binary = {
      identify: (value) => value instanceof Uint8Array,
      // Buffer inherits from Uint8Array
      default: false,
      tag: "tag:yaml.org,2002:binary",
      /**
       * Returns a Buffer in node and an Uint8Array in browsers
       *
       * To use the resulting buffer as an image, you'll want to do something like:
       *
       *   const blob = new Blob([buffer], { type: 'image/jpeg' })
       *   document.querySelector('#photo').src = URL.createObjectURL(blob)
       */
      resolve(src, onError) {
        if (typeof node_buffer.Buffer === "function") {
          return node_buffer.Buffer.from(src, "base64");
        } else if (typeof atob === "function") {
          const str3 = atob(src.replace(/[\n\r]/g, ""));
          const buffer = new Uint8Array(str3.length);
          for (let i = 0; i < str3.length; ++i)
            buffer[i] = str3.charCodeAt(i);
          return buffer;
        } else {
          onError("This environment does not support reading binary tags; either Buffer or atob is required");
          return src;
        }
      },
      stringify({ comment, type, value }, ctx, onComment, onChompKeep) {
        if (!value)
          return "";
        const buf = value;
        let str3;
        if (typeof node_buffer.Buffer === "function") {
          str3 = buf instanceof node_buffer.Buffer ? buf.toString("base64") : node_buffer.Buffer.from(buf.buffer).toString("base64");
        } else if (typeof btoa === "function") {
          let s2 = "";
          for (let i = 0; i < buf.length; ++i)
            s2 += String.fromCharCode(buf[i]);
          str3 = btoa(s2);
        } else {
          throw new Error("This environment does not support writing binary tags; either Buffer or btoa is required");
        }
        type ?? (type = Scalar.Scalar.BLOCK_LITERAL);
        if (type !== Scalar.Scalar.QUOTE_DOUBLE) {
          const lineWidth = Math.max(ctx.options.lineWidth - ctx.indent.length, ctx.options.minContentWidth);
          const n2 = Math.ceil(str3.length / lineWidth);
          const lines = new Array(n2);
          for (let i = 0, o = 0; i < n2; ++i, o += lineWidth) {
            lines[i] = str3.substr(o, lineWidth);
          }
          str3 = lines.join(type === Scalar.Scalar.BLOCK_LITERAL ? "\n" : " ");
        }
        return stringifyString.stringifyString({ comment, type, value: str3 }, ctx, onComment, onChompKeep);
      }
    };
    exports.binary = binary;
  }
});

// node_modules/yaml/dist/schema/yaml-1.1/pairs.js
var require_pairs = __commonJS({
  "node_modules/yaml/dist/schema/yaml-1.1/pairs.js"(exports) {
    "use strict";
    var identity2 = require_identity();
    var Pair = require_Pair();
    var Scalar = require_Scalar();
    var YAMLSeq = require_YAMLSeq();
    function resolvePairs(seq, onError) {
      if (identity2.isSeq(seq)) {
        for (let i = 0; i < seq.items.length; ++i) {
          let item = seq.items[i];
          if (identity2.isPair(item))
            continue;
          else if (identity2.isMap(item)) {
            if (item.items.length > 1)
              onError("Each pair must have its own sequence indicator");
            const pair = item.items[0] || new Pair.Pair(new Scalar.Scalar(null));
            if (item.commentBefore)
              pair.key.commentBefore = pair.key.commentBefore ? `${item.commentBefore}
${pair.key.commentBefore}` : item.commentBefore;
            if (item.comment) {
              const cn = pair.value ?? pair.key;
              cn.comment = cn.comment ? `${item.comment}
${cn.comment}` : item.comment;
            }
            item = pair;
          }
          seq.items[i] = identity2.isPair(item) ? item : new Pair.Pair(item);
        }
      } else
        onError("Expected a sequence for this tag");
      return seq;
    }
    function createPairs(schema, iterable, ctx) {
      const { replacer } = ctx;
      const pairs2 = new YAMLSeq.YAMLSeq(schema);
      pairs2.tag = "tag:yaml.org,2002:pairs";
      let i = 0;
      if (iterable && Symbol.iterator in Object(iterable))
        for (let it of iterable) {
          if (typeof replacer === "function")
            it = replacer.call(iterable, String(i++), it);
          let key, value;
          if (Array.isArray(it)) {
            if (it.length === 2) {
              key = it[0];
              value = it[1];
            } else
              throw new TypeError(`Expected [key, value] tuple: ${it}`);
          } else if (it && it instanceof Object) {
            const keys = Object.keys(it);
            if (keys.length === 1) {
              key = keys[0];
              value = it[key];
            } else {
              throw new TypeError(`Expected tuple with one key, not ${keys.length} keys`);
            }
          } else {
            key = it;
          }
          pairs2.items.push(Pair.createPair(key, value, ctx));
        }
      return pairs2;
    }
    var pairs = {
      collection: "seq",
      default: false,
      tag: "tag:yaml.org,2002:pairs",
      resolve: resolvePairs,
      createNode: createPairs
    };
    exports.createPairs = createPairs;
    exports.pairs = pairs;
    exports.resolvePairs = resolvePairs;
  }
});

// node_modules/yaml/dist/schema/yaml-1.1/omap.js
var require_omap = __commonJS({
  "node_modules/yaml/dist/schema/yaml-1.1/omap.js"(exports) {
    "use strict";
    var identity2 = require_identity();
    var toJS = require_toJS();
    var YAMLMap = require_YAMLMap();
    var YAMLSeq = require_YAMLSeq();
    var pairs = require_pairs();
    var YAMLOMap = class _YAMLOMap extends YAMLSeq.YAMLSeq {
      constructor() {
        super();
        this.add = YAMLMap.YAMLMap.prototype.add.bind(this);
        this.delete = YAMLMap.YAMLMap.prototype.delete.bind(this);
        this.get = YAMLMap.YAMLMap.prototype.get.bind(this);
        this.has = YAMLMap.YAMLMap.prototype.has.bind(this);
        this.set = YAMLMap.YAMLMap.prototype.set.bind(this);
        this.tag = _YAMLOMap.tag;
      }
      /**
       * If `ctx` is given, the return type is actually `Map<unknown, unknown>`,
       * but TypeScript won't allow widening the signature of a child method.
       */
      toJSON(_, ctx) {
        if (!ctx)
          return super.toJSON(_);
        const map = /* @__PURE__ */ new Map();
        if (ctx?.onCreate)
          ctx.onCreate(map);
        for (const pair of this.items) {
          let key, value;
          if (identity2.isPair(pair)) {
            key = toJS.toJS(pair.key, "", ctx);
            value = toJS.toJS(pair.value, key, ctx);
          } else {
            key = toJS.toJS(pair, "", ctx);
          }
          if (map.has(key))
            throw new Error("Ordered maps must not include duplicate keys");
          map.set(key, value);
        }
        return map;
      }
      static from(schema, iterable, ctx) {
        const pairs$1 = pairs.createPairs(schema, iterable, ctx);
        const omap2 = new this();
        omap2.items = pairs$1.items;
        return omap2;
      }
    };
    YAMLOMap.tag = "tag:yaml.org,2002:omap";
    var omap = {
      collection: "seq",
      identify: (value) => value instanceof Map,
      nodeClass: YAMLOMap,
      default: false,
      tag: "tag:yaml.org,2002:omap",
      resolve(seq, onError) {
        const pairs$1 = pairs.resolvePairs(seq, onError);
        const seenKeys = [];
        for (const { key } of pairs$1.items) {
          if (identity2.isScalar(key)) {
            if (seenKeys.includes(key.value)) {
              onError(`Ordered maps must not include duplicate keys: ${key.value}`);
            } else {
              seenKeys.push(key.value);
            }
          }
        }
        return Object.assign(new YAMLOMap(), pairs$1);
      },
      createNode: (schema, iterable, ctx) => YAMLOMap.from(schema, iterable, ctx)
    };
    exports.YAMLOMap = YAMLOMap;
    exports.omap = omap;
  }
});

// node_modules/yaml/dist/schema/yaml-1.1/bool.js
var require_bool2 = __commonJS({
  "node_modules/yaml/dist/schema/yaml-1.1/bool.js"(exports) {
    "use strict";
    var Scalar = require_Scalar();
    function boolStringify({ value, source }, ctx) {
      const boolObj = value ? trueTag : falseTag;
      if (source && boolObj.test.test(source))
        return source;
      return value ? ctx.options.trueStr : ctx.options.falseStr;
    }
    var trueTag = {
      identify: (value) => value === true,
      default: true,
      tag: "tag:yaml.org,2002:bool",
      test: /^(?:Y|y|[Yy]es|YES|[Tt]rue|TRUE|[Oo]n|ON)$/,
      resolve: () => new Scalar.Scalar(true),
      stringify: boolStringify
    };
    var falseTag = {
      identify: (value) => value === false,
      default: true,
      tag: "tag:yaml.org,2002:bool",
      test: /^(?:N|n|[Nn]o|NO|[Ff]alse|FALSE|[Oo]ff|OFF)$/,
      resolve: () => new Scalar.Scalar(false),
      stringify: boolStringify
    };
    exports.falseTag = falseTag;
    exports.trueTag = trueTag;
  }
});

// node_modules/yaml/dist/schema/yaml-1.1/float.js
var require_float2 = __commonJS({
  "node_modules/yaml/dist/schema/yaml-1.1/float.js"(exports) {
    "use strict";
    var Scalar = require_Scalar();
    var stringifyNumber = require_stringifyNumber();
    var floatNaN = {
      identify: (value) => typeof value === "number",
      default: true,
      tag: "tag:yaml.org,2002:float",
      test: /^(?:[-+]?\.(?:inf|Inf|INF)|\.nan|\.NaN|\.NAN)$/,
      resolve: (str3) => str3.slice(-3).toLowerCase() === "nan" ? NaN : str3[0] === "-" ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY,
      stringify: stringifyNumber.stringifyNumber
    };
    var floatExp = {
      identify: (value) => typeof value === "number",
      default: true,
      tag: "tag:yaml.org,2002:float",
      format: "EXP",
      test: /^[-+]?(?:[0-9][0-9_]*)?(?:\.[0-9_]*)?[eE][-+]?[0-9]+$/,
      resolve: (str3) => parseFloat(str3.replace(/_/g, "")),
      stringify(node) {
        const num2 = Number(node.value);
        return isFinite(num2) ? num2.toExponential() : stringifyNumber.stringifyNumber(node);
      }
    };
    var float = {
      identify: (value) => typeof value === "number",
      default: true,
      tag: "tag:yaml.org,2002:float",
      test: /^[-+]?(?:[0-9][0-9_]*)?\.[0-9_]*$/,
      resolve(str3) {
        const node = new Scalar.Scalar(parseFloat(str3.replace(/_/g, "")));
        const dot = str3.indexOf(".");
        if (dot !== -1) {
          const f = str3.substring(dot + 1).replace(/_/g, "");
          if (f[f.length - 1] === "0")
            node.minFractionDigits = f.length;
        }
        return node;
      },
      stringify: stringifyNumber.stringifyNumber
    };
    exports.float = float;
    exports.floatExp = floatExp;
    exports.floatNaN = floatNaN;
  }
});

// node_modules/yaml/dist/schema/yaml-1.1/int.js
var require_int2 = __commonJS({
  "node_modules/yaml/dist/schema/yaml-1.1/int.js"(exports) {
    "use strict";
    var stringifyNumber = require_stringifyNumber();
    var intIdentify = (value) => typeof value === "bigint" || Number.isInteger(value);
    function intResolve(str3, offset, radix, { intAsBigInt }) {
      const sign = str3[0];
      if (sign === "-" || sign === "+")
        offset += 1;
      str3 = str3.substring(offset).replace(/_/g, "");
      if (intAsBigInt) {
        switch (radix) {
          case 2:
            str3 = `0b${str3}`;
            break;
          case 8:
            str3 = `0o${str3}`;
            break;
          case 16:
            str3 = `0x${str3}`;
            break;
        }
        const n3 = BigInt(str3);
        return sign === "-" ? BigInt(-1) * n3 : n3;
      }
      const n2 = parseInt(str3, radix);
      return sign === "-" ? -1 * n2 : n2;
    }
    function intStringify(node, radix, prefix) {
      const { value } = node;
      if (intIdentify(value)) {
        const str3 = value.toString(radix);
        return value < 0 ? "-" + prefix + str3.substr(1) : prefix + str3;
      }
      return stringifyNumber.stringifyNumber(node);
    }
    var intBin = {
      identify: intIdentify,
      default: true,
      tag: "tag:yaml.org,2002:int",
      format: "BIN",
      test: /^[-+]?0b[0-1_]+$/,
      resolve: (str3, _onError, opt) => intResolve(str3, 2, 2, opt),
      stringify: (node) => intStringify(node, 2, "0b")
    };
    var intOct = {
      identify: intIdentify,
      default: true,
      tag: "tag:yaml.org,2002:int",
      format: "OCT",
      test: /^[-+]?0[0-7_]+$/,
      resolve: (str3, _onError, opt) => intResolve(str3, 1, 8, opt),
      stringify: (node) => intStringify(node, 8, "0")
    };
    var int = {
      identify: intIdentify,
      default: true,
      tag: "tag:yaml.org,2002:int",
      test: /^[-+]?[0-9][0-9_]*$/,
      resolve: (str3, _onError, opt) => intResolve(str3, 0, 10, opt),
      stringify: stringifyNumber.stringifyNumber
    };
    var intHex = {
      identify: intIdentify,
      default: true,
      tag: "tag:yaml.org,2002:int",
      format: "HEX",
      test: /^[-+]?0x[0-9a-fA-F_]+$/,
      resolve: (str3, _onError, opt) => intResolve(str3, 2, 16, opt),
      stringify: (node) => intStringify(node, 16, "0x")
    };
    exports.int = int;
    exports.intBin = intBin;
    exports.intHex = intHex;
    exports.intOct = intOct;
  }
});

// node_modules/yaml/dist/schema/yaml-1.1/set.js
var require_set = __commonJS({
  "node_modules/yaml/dist/schema/yaml-1.1/set.js"(exports) {
    "use strict";
    var identity2 = require_identity();
    var Pair = require_Pair();
    var YAMLMap = require_YAMLMap();
    var YAMLSet = class _YAMLSet extends YAMLMap.YAMLMap {
      constructor(schema) {
        super(schema);
        this.tag = _YAMLSet.tag;
      }
      add(key) {
        let pair;
        if (identity2.isPair(key))
          pair = key;
        else if (key && typeof key === "object" && "key" in key && "value" in key && key.value === null)
          pair = new Pair.Pair(key.key, null);
        else
          pair = new Pair.Pair(key, null);
        const prev = YAMLMap.findPair(this.items, pair.key);
        if (!prev)
          this.items.push(pair);
      }
      /**
       * If `keepPair` is `true`, returns the Pair matching `key`.
       * Otherwise, returns the value of that Pair's key.
       */
      get(key, keepPair) {
        const pair = YAMLMap.findPair(this.items, key);
        return !keepPair && identity2.isPair(pair) ? identity2.isScalar(pair.key) ? pair.key.value : pair.key : pair;
      }
      set(key, value) {
        if (typeof value !== "boolean")
          throw new Error(`Expected boolean value for set(key, value) in a YAML set, not ${typeof value}`);
        const prev = YAMLMap.findPair(this.items, key);
        if (prev && !value) {
          this.items.splice(this.items.indexOf(prev), 1);
        } else if (!prev && value) {
          this.items.push(new Pair.Pair(key));
        }
      }
      toJSON(_, ctx) {
        return super.toJSON(_, ctx, Set);
      }
      toString(ctx, onComment, onChompKeep) {
        if (!ctx)
          return JSON.stringify(this);
        if (this.hasAllNullValues(true))
          return super.toString(Object.assign({}, ctx, { allNullValues: true }), onComment, onChompKeep);
        else
          throw new Error("Set items must all have null values");
      }
      static from(schema, iterable, ctx) {
        const { replacer } = ctx;
        const set2 = new this(schema);
        if (iterable && Symbol.iterator in Object(iterable))
          for (let value of iterable) {
            if (typeof replacer === "function")
              value = replacer.call(iterable, value, value);
            set2.items.push(Pair.createPair(value, null, ctx));
          }
        return set2;
      }
    };
    YAMLSet.tag = "tag:yaml.org,2002:set";
    var set = {
      collection: "map",
      identify: (value) => value instanceof Set,
      nodeClass: YAMLSet,
      default: false,
      tag: "tag:yaml.org,2002:set",
      createNode: (schema, iterable, ctx) => YAMLSet.from(schema, iterable, ctx),
      resolve(map, onError) {
        if (identity2.isMap(map)) {
          if (map.hasAllNullValues(true))
            return Object.assign(new YAMLSet(), map);
          else
            onError("Set items must all have null values");
        } else
          onError("Expected a mapping for this tag");
        return map;
      }
    };
    exports.YAMLSet = YAMLSet;
    exports.set = set;
  }
});

// node_modules/yaml/dist/schema/yaml-1.1/timestamp.js
var require_timestamp = __commonJS({
  "node_modules/yaml/dist/schema/yaml-1.1/timestamp.js"(exports) {
    "use strict";
    var stringifyNumber = require_stringifyNumber();
    function parseSexagesimal(str3, asBigInt) {
      const sign = str3[0];
      const parts = sign === "-" || sign === "+" ? str3.substring(1) : str3;
      const num2 = (n2) => asBigInt ? BigInt(n2) : Number(n2);
      const res = parts.replace(/_/g, "").split(":").reduce((res2, p) => res2 * num2(60) + num2(p), num2(0));
      return sign === "-" ? num2(-1) * res : res;
    }
    function stringifySexagesimal(node) {
      let { value } = node;
      let num2 = (n2) => n2;
      if (typeof value === "bigint")
        num2 = (n2) => BigInt(n2);
      else if (isNaN(value) || !isFinite(value))
        return stringifyNumber.stringifyNumber(node);
      let sign = "";
      if (value < 0) {
        sign = "-";
        value *= num2(-1);
      }
      const _60 = num2(60);
      const parts = [value % _60];
      if (value < 60) {
        parts.unshift(0);
      } else {
        value = (value - parts[0]) / _60;
        parts.unshift(value % _60);
        if (value >= 60) {
          value = (value - parts[0]) / _60;
          parts.unshift(value);
        }
      }
      return sign + parts.map((n2) => String(n2).padStart(2, "0")).join(":").replace(/000000\d*$/, "");
    }
    var intTime = {
      identify: (value) => typeof value === "bigint" || Number.isInteger(value),
      default: true,
      tag: "tag:yaml.org,2002:int",
      format: "TIME",
      test: /^[-+]?[0-9][0-9_]*(?::[0-5]?[0-9])+$/,
      resolve: (str3, _onError, { intAsBigInt }) => parseSexagesimal(str3, intAsBigInt),
      stringify: stringifySexagesimal
    };
    var floatTime = {
      identify: (value) => typeof value === "number",
      default: true,
      tag: "tag:yaml.org,2002:float",
      format: "TIME",
      test: /^[-+]?[0-9][0-9_]*(?::[0-5]?[0-9])+\.[0-9_]*$/,
      resolve: (str3) => parseSexagesimal(str3, false),
      stringify: stringifySexagesimal
    };
    var timestamp = {
      identify: (value) => value instanceof Date,
      default: true,
      tag: "tag:yaml.org,2002:timestamp",
      // If the time zone is omitted, the timestamp is assumed to be specified in UTC. The time part
      // may be omitted altogether, resulting in a date format. In such a case, the time part is
      // assumed to be 00:00:00Z (start of day, UTC).
      test: RegExp("^([0-9]{4})-([0-9]{1,2})-([0-9]{1,2})(?:(?:t|T|[ \\t]+)([0-9]{1,2}):([0-9]{1,2}):([0-9]{1,2}(\\.[0-9]+)?)(?:[ \\t]*(Z|[-+][012]?[0-9](?::[0-9]{2})?))?)?$"),
      resolve(str3) {
        const match = str3.match(timestamp.test);
        if (!match)
          throw new Error("!!timestamp expects a date, starting with yyyy-mm-dd");
        const [, year, month, day, hour, minute, second] = match.map(Number);
        const millisec = match[7] ? Number((match[7] + "00").substr(1, 3)) : 0;
        let date = Date.UTC(year, month - 1, day, hour || 0, minute || 0, second || 0, millisec);
        const tz = match[8];
        if (tz && tz !== "Z") {
          let d = parseSexagesimal(tz, false);
          if (Math.abs(d) < 30)
            d *= 60;
          date -= 6e4 * d;
        }
        return new Date(date);
      },
      stringify: ({ value }) => value?.toISOString().replace(/(T00:00:00)?\.000Z$/, "") ?? ""
    };
    exports.floatTime = floatTime;
    exports.intTime = intTime;
    exports.timestamp = timestamp;
  }
});

// node_modules/yaml/dist/schema/yaml-1.1/schema.js
var require_schema3 = __commonJS({
  "node_modules/yaml/dist/schema/yaml-1.1/schema.js"(exports) {
    "use strict";
    var map = require_map();
    var _null = require_null();
    var seq = require_seq();
    var string = require_string();
    var binary = require_binary();
    var bool = require_bool2();
    var float = require_float2();
    var int = require_int2();
    var merge = require_merge();
    var omap = require_omap();
    var pairs = require_pairs();
    var set = require_set();
    var timestamp = require_timestamp();
    var schema = [
      map.map,
      seq.seq,
      string.string,
      _null.nullTag,
      bool.trueTag,
      bool.falseTag,
      int.intBin,
      int.intOct,
      int.int,
      int.intHex,
      float.floatNaN,
      float.floatExp,
      float.float,
      binary.binary,
      merge.merge,
      omap.omap,
      pairs.pairs,
      set.set,
      timestamp.intTime,
      timestamp.floatTime,
      timestamp.timestamp
    ];
    exports.schema = schema;
  }
});

// node_modules/yaml/dist/schema/tags.js
var require_tags = __commonJS({
  "node_modules/yaml/dist/schema/tags.js"(exports) {
    "use strict";
    var map = require_map();
    var _null = require_null();
    var seq = require_seq();
    var string = require_string();
    var bool = require_bool();
    var float = require_float();
    var int = require_int();
    var schema = require_schema();
    var schema$1 = require_schema2();
    var binary = require_binary();
    var merge = require_merge();
    var omap = require_omap();
    var pairs = require_pairs();
    var schema$2 = require_schema3();
    var set = require_set();
    var timestamp = require_timestamp();
    var schemas = /* @__PURE__ */ new Map([
      ["core", schema.schema],
      ["failsafe", [map.map, seq.seq, string.string]],
      ["json", schema$1.schema],
      ["yaml11", schema$2.schema],
      ["yaml-1.1", schema$2.schema]
    ]);
    var tagsByName = {
      binary: binary.binary,
      bool: bool.boolTag,
      float: float.float,
      floatExp: float.floatExp,
      floatNaN: float.floatNaN,
      floatTime: timestamp.floatTime,
      int: int.int,
      intHex: int.intHex,
      intOct: int.intOct,
      intTime: timestamp.intTime,
      map: map.map,
      merge: merge.merge,
      null: _null.nullTag,
      omap: omap.omap,
      pairs: pairs.pairs,
      seq: seq.seq,
      set: set.set,
      timestamp: timestamp.timestamp
    };
    var coreKnownTags = {
      "tag:yaml.org,2002:binary": binary.binary,
      "tag:yaml.org,2002:merge": merge.merge,
      "tag:yaml.org,2002:omap": omap.omap,
      "tag:yaml.org,2002:pairs": pairs.pairs,
      "tag:yaml.org,2002:set": set.set,
      "tag:yaml.org,2002:timestamp": timestamp.timestamp
    };
    function getTags(customTags, schemaName, addMergeTag) {
      const schemaTags = schemas.get(schemaName);
      if (schemaTags && !customTags) {
        return addMergeTag && !schemaTags.includes(merge.merge) ? schemaTags.concat(merge.merge) : schemaTags.slice();
      }
      let tags = schemaTags;
      if (!tags) {
        if (Array.isArray(customTags))
          tags = [];
        else {
          const keys = Array.from(schemas.keys()).filter((key) => key !== "yaml11").map((key) => JSON.stringify(key)).join(", ");
          throw new Error(`Unknown schema "${schemaName}"; use one of ${keys} or define customTags array`);
        }
      }
      if (Array.isArray(customTags)) {
        for (const tag of customTags)
          tags = tags.concat(tag);
      } else if (typeof customTags === "function") {
        tags = customTags(tags.slice());
      }
      if (addMergeTag)
        tags = tags.concat(merge.merge);
      return tags.reduce((tags2, tag) => {
        const tagObj = typeof tag === "string" ? tagsByName[tag] : tag;
        if (!tagObj) {
          const tagName = JSON.stringify(tag);
          const keys = Object.keys(tagsByName).map((key) => JSON.stringify(key)).join(", ");
          throw new Error(`Unknown custom tag ${tagName}; use one of ${keys}`);
        }
        if (!tags2.includes(tagObj))
          tags2.push(tagObj);
        return tags2;
      }, []);
    }
    exports.coreKnownTags = coreKnownTags;
    exports.getTags = getTags;
  }
});

// node_modules/yaml/dist/schema/Schema.js
var require_Schema = __commonJS({
  "node_modules/yaml/dist/schema/Schema.js"(exports) {
    "use strict";
    var identity2 = require_identity();
    var map = require_map();
    var seq = require_seq();
    var string = require_string();
    var tags = require_tags();
    var sortMapEntriesByKey = (a, b) => a.key < b.key ? -1 : a.key > b.key ? 1 : 0;
    var Schema = class _Schema {
      constructor({ compat, customTags, merge, resolveKnownTags, schema, sortMapEntries, toStringDefaults }) {
        this.compat = Array.isArray(compat) ? tags.getTags(compat, "compat") : compat ? tags.getTags(null, compat) : null;
        this.name = typeof schema === "string" && schema || "core";
        this.knownTags = resolveKnownTags ? tags.coreKnownTags : {};
        this.tags = tags.getTags(customTags, this.name, merge);
        this.toStringOptions = toStringDefaults ?? null;
        Object.defineProperty(this, identity2.MAP, { value: map.map });
        Object.defineProperty(this, identity2.SCALAR, { value: string.string });
        Object.defineProperty(this, identity2.SEQ, { value: seq.seq });
        this.sortMapEntries = typeof sortMapEntries === "function" ? sortMapEntries : sortMapEntries === true ? sortMapEntriesByKey : null;
      }
      clone() {
        const copy = Object.create(_Schema.prototype, Object.getOwnPropertyDescriptors(this));
        copy.tags = this.tags.slice();
        return copy;
      }
    };
    exports.Schema = Schema;
  }
});

// node_modules/yaml/dist/stringify/stringifyDocument.js
var require_stringifyDocument = __commonJS({
  "node_modules/yaml/dist/stringify/stringifyDocument.js"(exports) {
    "use strict";
    var identity2 = require_identity();
    var stringify2 = require_stringify();
    var stringifyComment = require_stringifyComment();
    function stringifyDocument(doc, options) {
      const lines = [];
      let hasDirectives = options.directives === true;
      if (options.directives !== false && doc.directives) {
        const dir = doc.directives.toString(doc);
        if (dir) {
          lines.push(dir);
          hasDirectives = true;
        } else if (doc.directives.docStart)
          hasDirectives = true;
      }
      if (hasDirectives)
        lines.push("---");
      const ctx = stringify2.createStringifyContext(doc, options);
      const { commentString } = ctx.options;
      if (doc.commentBefore) {
        if (lines.length !== 1)
          lines.unshift("");
        const cs = commentString(doc.commentBefore);
        lines.unshift(stringifyComment.indentComment(cs, ""));
      }
      let chompKeep = false;
      let contentComment = null;
      if (doc.contents) {
        if (identity2.isNode(doc.contents)) {
          if (doc.contents.spaceBefore && hasDirectives)
            lines.push("");
          if (doc.contents.commentBefore) {
            const cs = commentString(doc.contents.commentBefore);
            lines.push(stringifyComment.indentComment(cs, ""));
          }
          ctx.forceBlockIndent = !!doc.comment;
          contentComment = doc.contents.comment;
        }
        const onChompKeep = contentComment ? void 0 : () => chompKeep = true;
        let body2 = stringify2.stringify(doc.contents, ctx, () => contentComment = null, onChompKeep);
        if (contentComment)
          body2 += stringifyComment.lineComment(body2, "", commentString(contentComment));
        if ((body2[0] === "|" || body2[0] === ">") && lines[lines.length - 1] === "---") {
          lines[lines.length - 1] = `--- ${body2}`;
        } else
          lines.push(body2);
      } else {
        lines.push(stringify2.stringify(doc.contents, ctx));
      }
      if (doc.directives?.docEnd) {
        if (doc.comment) {
          const cs = commentString(doc.comment);
          if (cs.includes("\n")) {
            lines.push("...");
            lines.push(stringifyComment.indentComment(cs, ""));
          } else {
            lines.push(`... ${cs}`);
          }
        } else {
          lines.push("...");
        }
      } else {
        let dc = doc.comment;
        if (dc && chompKeep)
          dc = dc.replace(/^\n+/, "");
        if (dc) {
          if ((!chompKeep || contentComment) && lines[lines.length - 1] !== "")
            lines.push("");
          lines.push(stringifyComment.indentComment(commentString(dc), ""));
        }
      }
      return lines.join("\n") + "\n";
    }
    exports.stringifyDocument = stringifyDocument;
  }
});

// node_modules/yaml/dist/doc/Document.js
var require_Document = __commonJS({
  "node_modules/yaml/dist/doc/Document.js"(exports) {
    "use strict";
    var Alias = require_Alias();
    var Collection = require_Collection();
    var identity2 = require_identity();
    var Pair = require_Pair();
    var toJS = require_toJS();
    var Schema = require_Schema();
    var stringifyDocument = require_stringifyDocument();
    var anchors = require_anchors();
    var applyReviver = require_applyReviver();
    var createNode = require_createNode();
    var directives = require_directives();
    var Document = class _Document {
      constructor(value, replacer, options) {
        this.commentBefore = null;
        this.comment = null;
        this.errors = [];
        this.warnings = [];
        Object.defineProperty(this, identity2.NODE_TYPE, { value: identity2.DOC });
        let _replacer = null;
        if (typeof replacer === "function" || Array.isArray(replacer)) {
          _replacer = replacer;
        } else if (options === void 0 && replacer) {
          options = replacer;
          replacer = void 0;
        }
        const opt = Object.assign({
          intAsBigInt: false,
          keepSourceTokens: false,
          logLevel: "warn",
          prettyErrors: true,
          strict: true,
          stringKeys: false,
          uniqueKeys: true,
          version: "1.2"
        }, options);
        this.options = opt;
        let { version } = opt;
        if (options?._directives) {
          this.directives = options._directives.atDocument();
          if (this.directives.yaml.explicit)
            version = this.directives.yaml.version;
        } else
          this.directives = new directives.Directives({ version });
        this.setSchema(version, options);
        this.contents = value === void 0 ? null : this.createNode(value, _replacer, options);
      }
      /**
       * Create a deep copy of this Document and its contents.
       *
       * Custom Node values that inherit from `Object` still refer to their original instances.
       */
      clone() {
        const copy = Object.create(_Document.prototype, {
          [identity2.NODE_TYPE]: { value: identity2.DOC }
        });
        copy.commentBefore = this.commentBefore;
        copy.comment = this.comment;
        copy.errors = this.errors.slice();
        copy.warnings = this.warnings.slice();
        copy.options = Object.assign({}, this.options);
        if (this.directives)
          copy.directives = this.directives.clone();
        copy.schema = this.schema.clone();
        copy.contents = identity2.isNode(this.contents) ? this.contents.clone(copy.schema) : this.contents;
        if (this.range)
          copy.range = this.range.slice();
        return copy;
      }
      /** Adds a value to the document. */
      add(value) {
        if (assertCollection(this.contents))
          this.contents.add(value);
      }
      /** Adds a value to the document. */
      addIn(path, value) {
        if (assertCollection(this.contents))
          this.contents.addIn(path, value);
      }
      /**
       * Create a new `Alias` node, ensuring that the target `node` has the required anchor.
       *
       * If `node` already has an anchor, `name` is ignored.
       * Otherwise, the `node.anchor` value will be set to `name`,
       * or if an anchor with that name is already present in the document,
       * `name` will be used as a prefix for a new unique anchor.
       * If `name` is undefined, the generated anchor will use 'a' as a prefix.
       */
      createAlias(node, name) {
        if (!node.anchor) {
          const prev = anchors.anchorNames(this);
          node.anchor = // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
          !name || prev.has(name) ? anchors.findNewAnchor(name || "a", prev) : name;
        }
        return new Alias.Alias(node.anchor);
      }
      createNode(value, replacer, options) {
        let _replacer = void 0;
        if (typeof replacer === "function") {
          value = replacer.call({ "": value }, "", value);
          _replacer = replacer;
        } else if (Array.isArray(replacer)) {
          const keyToStr = (v) => typeof v === "number" || v instanceof String || v instanceof Number;
          const asStr = replacer.filter(keyToStr).map(String);
          if (asStr.length > 0)
            replacer = replacer.concat(asStr);
          _replacer = replacer;
        } else if (options === void 0 && replacer) {
          options = replacer;
          replacer = void 0;
        }
        const { aliasDuplicateObjects, anchorPrefix, flow, keepUndefined, onTagObj, tag } = options ?? {};
        const { onAnchor, setAnchors, sourceObjects } = anchors.createNodeAnchors(
          this,
          // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
          anchorPrefix || "a"
        );
        const ctx = {
          aliasDuplicateObjects: aliasDuplicateObjects ?? true,
          keepUndefined: keepUndefined ?? false,
          onAnchor,
          onTagObj,
          replacer: _replacer,
          schema: this.schema,
          sourceObjects
        };
        const node = createNode.createNode(value, tag, ctx);
        if (flow && identity2.isCollection(node))
          node.flow = true;
        setAnchors();
        return node;
      }
      /**
       * Convert a key and a value into a `Pair` using the current schema,
       * recursively wrapping all values as `Scalar` or `Collection` nodes.
       */
      createPair(key, value, options = {}) {
        const k = this.createNode(key, null, options);
        const v = this.createNode(value, null, options);
        return new Pair.Pair(k, v);
      }
      /**
       * Removes a value from the document.
       * @returns `true` if the item was found and removed.
       */
      delete(key) {
        return assertCollection(this.contents) ? this.contents.delete(key) : false;
      }
      /**
       * Removes a value from the document.
       * @returns `true` if the item was found and removed.
       */
      deleteIn(path) {
        if (Collection.isEmptyPath(path)) {
          if (this.contents == null)
            return false;
          this.contents = null;
          return true;
        }
        return assertCollection(this.contents) ? this.contents.deleteIn(path) : false;
      }
      /**
       * Returns item at `key`, or `undefined` if not found. By default unwraps
       * scalar values from their surrounding node; to disable set `keepScalar` to
       * `true` (collections are always returned intact).
       */
      get(key, keepScalar) {
        return identity2.isCollection(this.contents) ? this.contents.get(key, keepScalar) : void 0;
      }
      /**
       * Returns item at `path`, or `undefined` if not found. By default unwraps
       * scalar values from their surrounding node; to disable set `keepScalar` to
       * `true` (collections are always returned intact).
       */
      getIn(path, keepScalar) {
        if (Collection.isEmptyPath(path))
          return !keepScalar && identity2.isScalar(this.contents) ? this.contents.value : this.contents;
        return identity2.isCollection(this.contents) ? this.contents.getIn(path, keepScalar) : void 0;
      }
      /**
       * Checks if the document includes a value with the key `key`.
       */
      has(key) {
        return identity2.isCollection(this.contents) ? this.contents.has(key) : false;
      }
      /**
       * Checks if the document includes a value at `path`.
       */
      hasIn(path) {
        if (Collection.isEmptyPath(path))
          return this.contents !== void 0;
        return identity2.isCollection(this.contents) ? this.contents.hasIn(path) : false;
      }
      /**
       * Sets a value in this document. For `!!set`, `value` needs to be a
       * boolean to add/remove the item from the set.
       */
      set(key, value) {
        if (this.contents == null) {
          this.contents = Collection.collectionFromPath(this.schema, [key], value);
        } else if (assertCollection(this.contents)) {
          this.contents.set(key, value);
        }
      }
      /**
       * Sets a value in this document. For `!!set`, `value` needs to be a
       * boolean to add/remove the item from the set.
       */
      setIn(path, value) {
        if (Collection.isEmptyPath(path)) {
          this.contents = value;
        } else if (this.contents == null) {
          this.contents = Collection.collectionFromPath(this.schema, Array.from(path), value);
        } else if (assertCollection(this.contents)) {
          this.contents.setIn(path, value);
        }
      }
      /**
       * Change the YAML version and schema used by the document.
       * A `null` version disables support for directives, explicit tags, anchors, and aliases.
       * It also requires the `schema` option to be given as a `Schema` instance value.
       *
       * Overrides all previously set schema options.
       */
      setSchema(version, options = {}) {
        if (typeof version === "number")
          version = String(version);
        let opt;
        switch (version) {
          case "1.1":
            if (this.directives)
              this.directives.yaml.version = "1.1";
            else
              this.directives = new directives.Directives({ version: "1.1" });
            opt = { resolveKnownTags: false, schema: "yaml-1.1" };
            break;
          case "1.2":
          case "next":
            if (this.directives)
              this.directives.yaml.version = version;
            else
              this.directives = new directives.Directives({ version });
            opt = { resolveKnownTags: true, schema: "core" };
            break;
          case null:
            if (this.directives)
              delete this.directives;
            opt = null;
            break;
          default: {
            const sv = JSON.stringify(version);
            throw new Error(`Expected '1.1', '1.2' or null as first argument, but found: ${sv}`);
          }
        }
        if (options.schema instanceof Object)
          this.schema = options.schema;
        else if (opt)
          this.schema = new Schema.Schema(Object.assign(opt, options));
        else
          throw new Error(`With a null YAML version, the { schema: Schema } option is required`);
      }
      // json & jsonArg are only used from toJSON()
      toJS({ json, jsonArg, mapAsMap, maxAliasCount, onAnchor, reviver } = {}) {
        const ctx = {
          anchors: /* @__PURE__ */ new Map(),
          doc: this,
          keep: !json,
          mapAsMap: mapAsMap === true,
          mapKeyWarned: false,
          maxAliasCount: typeof maxAliasCount === "number" ? maxAliasCount : 100
        };
        const res = toJS.toJS(this.contents, jsonArg ?? "", ctx);
        if (typeof onAnchor === "function")
          for (const { count, res: res2 } of ctx.anchors.values())
            onAnchor(res2, count);
        return typeof reviver === "function" ? applyReviver.applyReviver(reviver, { "": res }, "", res) : res;
      }
      /**
       * A JSON representation of the document `contents`.
       *
       * @param jsonArg Used by `JSON.stringify` to indicate the array index or
       *   property name.
       */
      toJSON(jsonArg, onAnchor) {
        return this.toJS({ json: true, jsonArg, mapAsMap: false, onAnchor });
      }
      /** A YAML representation of the document. */
      toString(options = {}) {
        if (this.errors.length > 0)
          throw new Error("Document with errors cannot be stringified");
        if ("indent" in options && (!Number.isInteger(options.indent) || Number(options.indent) <= 0)) {
          const s2 = JSON.stringify(options.indent);
          throw new Error(`"indent" option must be a positive integer, not ${s2}`);
        }
        return stringifyDocument.stringifyDocument(this, options);
      }
    };
    function assertCollection(contents) {
      if (identity2.isCollection(contents))
        return true;
      throw new Error("Expected a YAML collection as document contents");
    }
    exports.Document = Document;
  }
});

// node_modules/yaml/dist/errors.js
var require_errors = __commonJS({
  "node_modules/yaml/dist/errors.js"(exports) {
    "use strict";
    var YAMLError = class extends Error {
      constructor(name, pos, code, message) {
        super();
        this.name = name;
        this.code = code;
        this.message = message;
        this.pos = pos;
      }
    };
    var YAMLParseError = class extends YAMLError {
      constructor(pos, code, message) {
        super("YAMLParseError", pos, code, message);
      }
    };
    var YAMLWarning = class extends YAMLError {
      constructor(pos, code, message) {
        super("YAMLWarning", pos, code, message);
      }
    };
    var prettifyError = (src, lc) => (error) => {
      if (error.pos[0] === -1)
        return;
      error.linePos = error.pos.map((pos) => lc.linePos(pos));
      const { line: line3, col } = error.linePos[0];
      error.message += ` at line ${line3}, column ${col}`;
      let ci = col - 1;
      let lineStr = src.substring(lc.lineStarts[line3 - 1], lc.lineStarts[line3]).replace(/[\n\r]+$/, "");
      if (ci >= 60 && lineStr.length > 80) {
        const trimStart = Math.min(ci - 39, lineStr.length - 79);
        lineStr = "\u2026" + lineStr.substring(trimStart);
        ci -= trimStart - 1;
      }
      if (lineStr.length > 80)
        lineStr = lineStr.substring(0, 79) + "\u2026";
      if (line3 > 1 && /^ *$/.test(lineStr.substring(0, ci))) {
        let prev = src.substring(lc.lineStarts[line3 - 2], lc.lineStarts[line3 - 1]);
        if (prev.length > 80)
          prev = prev.substring(0, 79) + "\u2026\n";
        lineStr = prev + lineStr;
      }
      if (/[^ ]/.test(lineStr)) {
        let count = 1;
        const end = error.linePos[1];
        if (end?.line === line3 && end.col > col) {
          count = Math.max(1, Math.min(end.col - col, 80 - ci));
        }
        const pointer = " ".repeat(ci) + "^".repeat(count);
        error.message += `:

${lineStr}
${pointer}
`;
      }
    };
    exports.YAMLError = YAMLError;
    exports.YAMLParseError = YAMLParseError;
    exports.YAMLWarning = YAMLWarning;
    exports.prettifyError = prettifyError;
  }
});

// node_modules/yaml/dist/compose/resolve-props.js
var require_resolve_props = __commonJS({
  "node_modules/yaml/dist/compose/resolve-props.js"(exports) {
    "use strict";
    function resolveProps(tokens, { flow, indicator, next, offset, onError, parentIndent, startOnNewline }) {
      let spaceBefore = false;
      let atNewline = startOnNewline;
      let hasSpace = startOnNewline;
      let comment = "";
      let commentSep = "";
      let hasNewline = false;
      let reqSpace = false;
      let tab = null;
      let anchor = null;
      let tag = null;
      let newlineAfterProp = null;
      let comma = null;
      let found = null;
      let start2 = null;
      for (const token of tokens) {
        if (reqSpace) {
          if (token.type !== "space" && token.type !== "newline" && token.type !== "comma")
            onError(token.offset, "MISSING_CHAR", "Tags and anchors must be separated from the next token by white space");
          reqSpace = false;
        }
        if (tab) {
          if (atNewline && token.type !== "comment" && token.type !== "newline") {
            onError(tab, "TAB_AS_INDENT", "Tabs are not allowed as indentation");
          }
          tab = null;
        }
        switch (token.type) {
          case "space":
            if (!flow && (indicator !== "doc-start" || next?.type !== "flow-collection") && token.source.includes("	")) {
              tab = token;
            }
            hasSpace = true;
            break;
          case "comment": {
            if (!hasSpace)
              onError(token, "MISSING_CHAR", "Comments must be separated from other tokens by white space characters");
            const cb = token.source.substring(1) || " ";
            if (!comment)
              comment = cb;
            else
              comment += commentSep + cb;
            commentSep = "";
            atNewline = false;
            break;
          }
          case "newline":
            if (atNewline) {
              if (comment)
                comment += token.source;
              else if (!found || indicator !== "seq-item-ind")
                spaceBefore = true;
            } else
              commentSep += token.source;
            atNewline = true;
            hasNewline = true;
            if (anchor || tag)
              newlineAfterProp = token;
            hasSpace = true;
            break;
          case "anchor":
            if (anchor)
              onError(token, "MULTIPLE_ANCHORS", "A node can have at most one anchor");
            if (token.source.endsWith(":"))
              onError(token.offset + token.source.length - 1, "BAD_ALIAS", "Anchor ending in : is ambiguous", true);
            anchor = token;
            start2 ?? (start2 = token.offset);
            atNewline = false;
            hasSpace = false;
            reqSpace = true;
            break;
          case "tag": {
            if (tag)
              onError(token, "MULTIPLE_TAGS", "A node can have at most one tag");
            tag = token;
            start2 ?? (start2 = token.offset);
            atNewline = false;
            hasSpace = false;
            reqSpace = true;
            break;
          }
          case indicator:
            if (anchor || tag)
              onError(token, "BAD_PROP_ORDER", `Anchors and tags must be after the ${token.source} indicator`);
            if (found)
              onError(token, "UNEXPECTED_TOKEN", `Unexpected ${token.source} in ${flow ?? "collection"}`);
            found = token;
            atNewline = indicator === "seq-item-ind" || indicator === "explicit-key-ind";
            hasSpace = false;
            break;
          case "comma":
            if (flow) {
              if (comma)
                onError(token, "UNEXPECTED_TOKEN", `Unexpected , in ${flow}`);
              comma = token;
              atNewline = false;
              hasSpace = false;
              break;
            }
          // else fallthrough
          default:
            onError(token, "UNEXPECTED_TOKEN", `Unexpected ${token.type} token`);
            atNewline = false;
            hasSpace = false;
        }
      }
      const last = tokens[tokens.length - 1];
      const end = last ? last.offset + last.source.length : offset;
      if (reqSpace && next && next.type !== "space" && next.type !== "newline" && next.type !== "comma" && (next.type !== "scalar" || next.source !== "")) {
        onError(next.offset, "MISSING_CHAR", "Tags and anchors must be separated from the next token by white space");
      }
      if (tab && (atNewline && tab.indent <= parentIndent || next?.type === "block-map" || next?.type === "block-seq"))
        onError(tab, "TAB_AS_INDENT", "Tabs are not allowed as indentation");
      return {
        comma,
        found,
        spaceBefore,
        comment,
        hasNewline,
        anchor,
        tag,
        newlineAfterProp,
        end,
        start: start2 ?? end
      };
    }
    exports.resolveProps = resolveProps;
  }
});

// node_modules/yaml/dist/compose/util-contains-newline.js
var require_util_contains_newline = __commonJS({
  "node_modules/yaml/dist/compose/util-contains-newline.js"(exports) {
    "use strict";
    function containsNewline(key) {
      if (!key)
        return null;
      switch (key.type) {
        case "alias":
        case "scalar":
        case "double-quoted-scalar":
        case "single-quoted-scalar":
          if (key.source.includes("\n"))
            return true;
          if (key.end) {
            for (const st of key.end)
              if (st.type === "newline")
                return true;
          }
          return false;
        case "flow-collection":
          for (const it of key.items) {
            for (const st of it.start)
              if (st.type === "newline")
                return true;
            if (it.sep) {
              for (const st of it.sep)
                if (st.type === "newline")
                  return true;
            }
            if (containsNewline(it.key) || containsNewline(it.value))
              return true;
          }
          return false;
        default:
          return true;
      }
    }
    exports.containsNewline = containsNewline;
  }
});

// node_modules/yaml/dist/compose/util-flow-indent-check.js
var require_util_flow_indent_check = __commonJS({
  "node_modules/yaml/dist/compose/util-flow-indent-check.js"(exports) {
    "use strict";
    var utilContainsNewline = require_util_contains_newline();
    function flowIndentCheck(indent, fc, onError) {
      if (fc?.type === "flow-collection") {
        const end = fc.end[0];
        if (end.indent === indent && (end.source === "]" || end.source === "}") && utilContainsNewline.containsNewline(fc)) {
          const msg = "Flow end indicator should be more indented than parent";
          onError(end, "BAD_INDENT", msg, true);
        }
      }
    }
    exports.flowIndentCheck = flowIndentCheck;
  }
});

// node_modules/yaml/dist/compose/util-map-includes.js
var require_util_map_includes = __commonJS({
  "node_modules/yaml/dist/compose/util-map-includes.js"(exports) {
    "use strict";
    var identity2 = require_identity();
    function mapIncludes(ctx, items2, search) {
      const { uniqueKeys } = ctx.options;
      if (uniqueKeys === false)
        return false;
      const isEqual = typeof uniqueKeys === "function" ? uniqueKeys : (a, b) => a === b || identity2.isScalar(a) && identity2.isScalar(b) && a.value === b.value;
      return items2.some((pair) => isEqual(pair.key, search));
    }
    exports.mapIncludes = mapIncludes;
  }
});

// node_modules/yaml/dist/compose/resolve-block-map.js
var require_resolve_block_map = __commonJS({
  "node_modules/yaml/dist/compose/resolve-block-map.js"(exports) {
    "use strict";
    var Pair = require_Pair();
    var YAMLMap = require_YAMLMap();
    var resolveProps = require_resolve_props();
    var utilContainsNewline = require_util_contains_newline();
    var utilFlowIndentCheck = require_util_flow_indent_check();
    var utilMapIncludes = require_util_map_includes();
    var startColMsg = "All mapping items must start at the same column";
    function resolveBlockMap({ composeNode, composeEmptyNode }, ctx, bm, onError, tag) {
      const NodeClass = tag?.nodeClass ?? YAMLMap.YAMLMap;
      const map = new NodeClass(ctx.schema);
      if (ctx.atRoot)
        ctx.atRoot = false;
      let offset = bm.offset;
      let commentEnd = null;
      for (const collItem of bm.items) {
        const { start: start2, key, sep: sep2, value } = collItem;
        const keyProps = resolveProps.resolveProps(start2, {
          indicator: "explicit-key-ind",
          next: key ?? sep2?.[0],
          offset,
          onError,
          parentIndent: bm.indent,
          startOnNewline: true
        });
        const implicitKey = !keyProps.found;
        if (implicitKey) {
          if (key) {
            if (key.type === "block-seq")
              onError(offset, "BLOCK_AS_IMPLICIT_KEY", "A block sequence may not be used as an implicit map key");
            else if ("indent" in key && key.indent !== bm.indent)
              onError(offset, "BAD_INDENT", startColMsg);
          }
          if (!keyProps.anchor && !keyProps.tag && !sep2) {
            commentEnd = keyProps.end;
            if (keyProps.comment) {
              if (map.comment)
                map.comment += "\n" + keyProps.comment;
              else
                map.comment = keyProps.comment;
            }
            continue;
          }
          if (keyProps.newlineAfterProp || utilContainsNewline.containsNewline(key)) {
            onError(key ?? start2[start2.length - 1], "MULTILINE_IMPLICIT_KEY", "Implicit keys need to be on a single line");
          }
        } else if (keyProps.found?.indent !== bm.indent) {
          onError(offset, "BAD_INDENT", startColMsg);
        }
        ctx.atKey = true;
        const keyStart = keyProps.end;
        const keyNode = key ? composeNode(ctx, key, keyProps, onError) : composeEmptyNode(ctx, keyStart, start2, null, keyProps, onError);
        if (ctx.schema.compat)
          utilFlowIndentCheck.flowIndentCheck(bm.indent, key, onError);
        ctx.atKey = false;
        if (utilMapIncludes.mapIncludes(ctx, map.items, keyNode))
          onError(keyStart, "DUPLICATE_KEY", "Map keys must be unique");
        const valueProps = resolveProps.resolveProps(sep2 ?? [], {
          indicator: "map-value-ind",
          next: value,
          offset: keyNode.range[2],
          onError,
          parentIndent: bm.indent,
          startOnNewline: !key || key.type === "block-scalar"
        });
        offset = valueProps.end;
        if (valueProps.found) {
          if (implicitKey) {
            if (value?.type === "block-map" && !valueProps.hasNewline)
              onError(offset, "BLOCK_AS_IMPLICIT_KEY", "Nested mappings are not allowed in compact mappings");
            if (ctx.options.strict && keyProps.start < valueProps.found.offset - 1024)
              onError(keyNode.range, "KEY_OVER_1024_CHARS", "The : indicator must be at most 1024 chars after the start of an implicit block mapping key");
          }
          const valueNode = value ? composeNode(ctx, value, valueProps, onError) : composeEmptyNode(ctx, offset, sep2, null, valueProps, onError);
          if (ctx.schema.compat)
            utilFlowIndentCheck.flowIndentCheck(bm.indent, value, onError);
          offset = valueNode.range[2];
          const pair = new Pair.Pair(keyNode, valueNode);
          if (ctx.options.keepSourceTokens)
            pair.srcToken = collItem;
          map.items.push(pair);
        } else {
          if (implicitKey)
            onError(keyNode.range, "MISSING_CHAR", "Implicit map keys need to be followed by map values");
          if (valueProps.comment) {
            if (keyNode.comment)
              keyNode.comment += "\n" + valueProps.comment;
            else
              keyNode.comment = valueProps.comment;
          }
          const pair = new Pair.Pair(keyNode);
          if (ctx.options.keepSourceTokens)
            pair.srcToken = collItem;
          map.items.push(pair);
        }
      }
      if (commentEnd && commentEnd < offset)
        onError(commentEnd, "IMPOSSIBLE", "Map comment with trailing content");
      map.range = [bm.offset, offset, commentEnd ?? offset];
      return map;
    }
    exports.resolveBlockMap = resolveBlockMap;
  }
});

// node_modules/yaml/dist/compose/resolve-block-seq.js
var require_resolve_block_seq = __commonJS({
  "node_modules/yaml/dist/compose/resolve-block-seq.js"(exports) {
    "use strict";
    var YAMLSeq = require_YAMLSeq();
    var resolveProps = require_resolve_props();
    var utilFlowIndentCheck = require_util_flow_indent_check();
    function resolveBlockSeq({ composeNode, composeEmptyNode }, ctx, bs, onError, tag) {
      const NodeClass = tag?.nodeClass ?? YAMLSeq.YAMLSeq;
      const seq = new NodeClass(ctx.schema);
      if (ctx.atRoot)
        ctx.atRoot = false;
      if (ctx.atKey)
        ctx.atKey = false;
      let offset = bs.offset;
      let commentEnd = null;
      for (const { start: start2, value } of bs.items) {
        const props = resolveProps.resolveProps(start2, {
          indicator: "seq-item-ind",
          next: value,
          offset,
          onError,
          parentIndent: bs.indent,
          startOnNewline: true
        });
        if (!props.found) {
          if (props.anchor || props.tag || value) {
            if (value?.type === "block-seq")
              onError(props.end, "BAD_INDENT", "All sequence items must start at the same column");
            else
              onError(offset, "MISSING_CHAR", "Sequence item without - indicator");
          } else {
            commentEnd = props.end;
            if (props.comment)
              seq.comment = props.comment;
            continue;
          }
        }
        const node = value ? composeNode(ctx, value, props, onError) : composeEmptyNode(ctx, props.end, start2, null, props, onError);
        if (ctx.schema.compat)
          utilFlowIndentCheck.flowIndentCheck(bs.indent, value, onError);
        offset = node.range[2];
        seq.items.push(node);
      }
      seq.range = [bs.offset, offset, commentEnd ?? offset];
      return seq;
    }
    exports.resolveBlockSeq = resolveBlockSeq;
  }
});

// node_modules/yaml/dist/compose/resolve-end.js
var require_resolve_end = __commonJS({
  "node_modules/yaml/dist/compose/resolve-end.js"(exports) {
    "use strict";
    function resolveEnd(end, offset, reqSpace, onError) {
      let comment = "";
      if (end) {
        let hasSpace = false;
        let sep2 = "";
        for (const token of end) {
          const { source, type } = token;
          switch (type) {
            case "space":
              hasSpace = true;
              break;
            case "comment": {
              if (reqSpace && !hasSpace)
                onError(token, "MISSING_CHAR", "Comments must be separated from other tokens by white space characters");
              const cb = source.substring(1) || " ";
              if (!comment)
                comment = cb;
              else
                comment += sep2 + cb;
              sep2 = "";
              break;
            }
            case "newline":
              if (comment)
                sep2 += source;
              hasSpace = true;
              break;
            default:
              onError(token, "UNEXPECTED_TOKEN", `Unexpected ${type} at node end`);
          }
          offset += source.length;
        }
      }
      return { comment, offset };
    }
    exports.resolveEnd = resolveEnd;
  }
});

// node_modules/yaml/dist/compose/resolve-flow-collection.js
var require_resolve_flow_collection = __commonJS({
  "node_modules/yaml/dist/compose/resolve-flow-collection.js"(exports) {
    "use strict";
    var identity2 = require_identity();
    var Pair = require_Pair();
    var YAMLMap = require_YAMLMap();
    var YAMLSeq = require_YAMLSeq();
    var resolveEnd = require_resolve_end();
    var resolveProps = require_resolve_props();
    var utilContainsNewline = require_util_contains_newline();
    var utilMapIncludes = require_util_map_includes();
    var blockMsg = "Block collections are not allowed within flow collections";
    var isBlock = (token) => token && (token.type === "block-map" || token.type === "block-seq");
    function resolveFlowCollection({ composeNode, composeEmptyNode }, ctx, fc, onError, tag) {
      const isMap = fc.start.source === "{";
      const fcName = isMap ? "flow map" : "flow sequence";
      const NodeClass = tag?.nodeClass ?? (isMap ? YAMLMap.YAMLMap : YAMLSeq.YAMLSeq);
      const coll = new NodeClass(ctx.schema);
      coll.flow = true;
      const atRoot = ctx.atRoot;
      if (atRoot)
        ctx.atRoot = false;
      if (ctx.atKey)
        ctx.atKey = false;
      let offset = fc.offset + fc.start.source.length;
      for (let i = 0; i < fc.items.length; ++i) {
        const collItem = fc.items[i];
        const { start: start2, key, sep: sep2, value } = collItem;
        const props = resolveProps.resolveProps(start2, {
          flow: fcName,
          indicator: "explicit-key-ind",
          next: key ?? sep2?.[0],
          offset,
          onError,
          parentIndent: fc.indent,
          startOnNewline: false
        });
        if (!props.found) {
          if (!props.anchor && !props.tag && !sep2 && !value) {
            if (i === 0 && props.comma)
              onError(props.comma, "UNEXPECTED_TOKEN", `Unexpected , in ${fcName}`);
            else if (i < fc.items.length - 1)
              onError(props.start, "UNEXPECTED_TOKEN", `Unexpected empty item in ${fcName}`);
            if (props.comment) {
              if (coll.comment)
                coll.comment += "\n" + props.comment;
              else
                coll.comment = props.comment;
            }
            offset = props.end;
            continue;
          }
          if (!isMap && ctx.options.strict && utilContainsNewline.containsNewline(key))
            onError(
              key,
              // checked by containsNewline()
              "MULTILINE_IMPLICIT_KEY",
              "Implicit keys of flow sequence pairs need to be on a single line"
            );
        }
        if (i === 0) {
          if (props.comma)
            onError(props.comma, "UNEXPECTED_TOKEN", `Unexpected , in ${fcName}`);
        } else {
          if (!props.comma)
            onError(props.start, "MISSING_CHAR", `Missing , between ${fcName} items`);
          if (props.comment) {
            let prevItemComment = "";
            loop: for (const st of start2) {
              switch (st.type) {
                case "comma":
                case "space":
                  break;
                case "comment":
                  prevItemComment = st.source.substring(1);
                  break loop;
                default:
                  break loop;
              }
            }
            if (prevItemComment) {
              let prev = coll.items[coll.items.length - 1];
              if (identity2.isPair(prev))
                prev = prev.value ?? prev.key;
              if (prev.comment)
                prev.comment += "\n" + prevItemComment;
              else
                prev.comment = prevItemComment;
              props.comment = props.comment.substring(prevItemComment.length + 1);
            }
          }
        }
        if (!isMap && !sep2 && !props.found) {
          const valueNode = value ? composeNode(ctx, value, props, onError) : composeEmptyNode(ctx, props.end, sep2, null, props, onError);
          coll.items.push(valueNode);
          offset = valueNode.range[2];
          if (isBlock(value))
            onError(valueNode.range, "BLOCK_IN_FLOW", blockMsg);
        } else {
          ctx.atKey = true;
          const keyStart = props.end;
          const keyNode = key ? composeNode(ctx, key, props, onError) : composeEmptyNode(ctx, keyStart, start2, null, props, onError);
          if (isBlock(key))
            onError(keyNode.range, "BLOCK_IN_FLOW", blockMsg);
          ctx.atKey = false;
          const valueProps = resolveProps.resolveProps(sep2 ?? [], {
            flow: fcName,
            indicator: "map-value-ind",
            next: value,
            offset: keyNode.range[2],
            onError,
            parentIndent: fc.indent,
            startOnNewline: false
          });
          if (valueProps.found) {
            if (!isMap && !props.found && ctx.options.strict) {
              if (sep2)
                for (const st of sep2) {
                  if (st === valueProps.found)
                    break;
                  if (st.type === "newline") {
                    onError(st, "MULTILINE_IMPLICIT_KEY", "Implicit keys of flow sequence pairs need to be on a single line");
                    break;
                  }
                }
              if (props.start < valueProps.found.offset - 1024)
                onError(valueProps.found, "KEY_OVER_1024_CHARS", "The : indicator must be at most 1024 chars after the start of an implicit flow sequence key");
            }
          } else if (value) {
            if ("source" in value && value.source?.[0] === ":")
              onError(value, "MISSING_CHAR", `Missing space after : in ${fcName}`);
            else
              onError(valueProps.start, "MISSING_CHAR", `Missing , or : between ${fcName} items`);
          }
          const valueNode = value ? composeNode(ctx, value, valueProps, onError) : valueProps.found ? composeEmptyNode(ctx, valueProps.end, sep2, null, valueProps, onError) : null;
          if (valueNode) {
            if (isBlock(value))
              onError(valueNode.range, "BLOCK_IN_FLOW", blockMsg);
          } else if (valueProps.comment) {
            if (keyNode.comment)
              keyNode.comment += "\n" + valueProps.comment;
            else
              keyNode.comment = valueProps.comment;
          }
          const pair = new Pair.Pair(keyNode, valueNode);
          if (ctx.options.keepSourceTokens)
            pair.srcToken = collItem;
          if (isMap) {
            const map = coll;
            if (utilMapIncludes.mapIncludes(ctx, map.items, keyNode))
              onError(keyStart, "DUPLICATE_KEY", "Map keys must be unique");
            map.items.push(pair);
          } else {
            const map = new YAMLMap.YAMLMap(ctx.schema);
            map.flow = true;
            map.items.push(pair);
            const endRange = (valueNode ?? keyNode).range;
            map.range = [keyNode.range[0], endRange[1], endRange[2]];
            coll.items.push(map);
          }
          offset = valueNode ? valueNode.range[2] : valueProps.end;
        }
      }
      const expectedEnd = isMap ? "}" : "]";
      const [ce, ...ee] = fc.end;
      let cePos = offset;
      if (ce?.source === expectedEnd)
        cePos = ce.offset + ce.source.length;
      else {
        const name = fcName[0].toUpperCase() + fcName.substring(1);
        const msg = atRoot ? `${name} must end with a ${expectedEnd}` : `${name} in block collection must be sufficiently indented and end with a ${expectedEnd}`;
        onError(offset, atRoot ? "MISSING_CHAR" : "BAD_INDENT", msg);
        if (ce && ce.source.length !== 1)
          ee.unshift(ce);
      }
      if (ee.length > 0) {
        const end = resolveEnd.resolveEnd(ee, cePos, ctx.options.strict, onError);
        if (end.comment) {
          if (coll.comment)
            coll.comment += "\n" + end.comment;
          else
            coll.comment = end.comment;
        }
        coll.range = [fc.offset, cePos, end.offset];
      } else {
        coll.range = [fc.offset, cePos, cePos];
      }
      return coll;
    }
    exports.resolveFlowCollection = resolveFlowCollection;
  }
});

// node_modules/yaml/dist/compose/compose-collection.js
var require_compose_collection = __commonJS({
  "node_modules/yaml/dist/compose/compose-collection.js"(exports) {
    "use strict";
    var identity2 = require_identity();
    var Scalar = require_Scalar();
    var YAMLMap = require_YAMLMap();
    var YAMLSeq = require_YAMLSeq();
    var resolveBlockMap = require_resolve_block_map();
    var resolveBlockSeq = require_resolve_block_seq();
    var resolveFlowCollection = require_resolve_flow_collection();
    function resolveCollection(CN, ctx, token, onError, tagName, tag) {
      const coll = token.type === "block-map" ? resolveBlockMap.resolveBlockMap(CN, ctx, token, onError, tag) : token.type === "block-seq" ? resolveBlockSeq.resolveBlockSeq(CN, ctx, token, onError, tag) : resolveFlowCollection.resolveFlowCollection(CN, ctx, token, onError, tag);
      const Coll = coll.constructor;
      if (tagName === "!" || tagName === Coll.tagName) {
        coll.tag = Coll.tagName;
        return coll;
      }
      if (tagName)
        coll.tag = tagName;
      return coll;
    }
    function composeCollection(CN, ctx, token, props, onError) {
      const tagToken = props.tag;
      const tagName = !tagToken ? null : ctx.directives.tagName(tagToken.source, (msg) => onError(tagToken, "TAG_RESOLVE_FAILED", msg));
      if (token.type === "block-seq") {
        const { anchor, newlineAfterProp: nl } = props;
        const lastProp = anchor && tagToken ? anchor.offset > tagToken.offset ? anchor : tagToken : anchor ?? tagToken;
        if (lastProp && (!nl || nl.offset < lastProp.offset)) {
          const message = "Missing newline after block sequence props";
          onError(lastProp, "MISSING_CHAR", message);
        }
      }
      const expType = token.type === "block-map" ? "map" : token.type === "block-seq" ? "seq" : token.start.source === "{" ? "map" : "seq";
      if (!tagToken || !tagName || tagName === "!" || tagName === YAMLMap.YAMLMap.tagName && expType === "map" || tagName === YAMLSeq.YAMLSeq.tagName && expType === "seq") {
        return resolveCollection(CN, ctx, token, onError, tagName);
      }
      let tag = ctx.schema.tags.find((t) => t.tag === tagName && t.collection === expType);
      if (!tag) {
        const kt = ctx.schema.knownTags[tagName];
        if (kt?.collection === expType) {
          ctx.schema.tags.push(Object.assign({}, kt, { default: false }));
          tag = kt;
        } else {
          if (kt) {
            onError(tagToken, "BAD_COLLECTION_TYPE", `${kt.tag} used for ${expType} collection, but expects ${kt.collection ?? "scalar"}`, true);
          } else {
            onError(tagToken, "TAG_RESOLVE_FAILED", `Unresolved tag: ${tagName}`, true);
          }
          return resolveCollection(CN, ctx, token, onError, tagName);
        }
      }
      const coll = resolveCollection(CN, ctx, token, onError, tagName, tag);
      const res = tag.resolve?.(coll, (msg) => onError(tagToken, "TAG_RESOLVE_FAILED", msg), ctx.options) ?? coll;
      const node = identity2.isNode(res) ? res : new Scalar.Scalar(res);
      node.range = coll.range;
      node.tag = tagName;
      if (tag?.format)
        node.format = tag.format;
      return node;
    }
    exports.composeCollection = composeCollection;
  }
});

// node_modules/yaml/dist/compose/resolve-block-scalar.js
var require_resolve_block_scalar = __commonJS({
  "node_modules/yaml/dist/compose/resolve-block-scalar.js"(exports) {
    "use strict";
    var Scalar = require_Scalar();
    function resolveBlockScalar(ctx, scalar2, onError) {
      const start2 = scalar2.offset;
      const header = parseBlockScalarHeader(scalar2, ctx.options.strict, onError);
      if (!header)
        return { value: "", type: null, comment: "", range: [start2, start2, start2] };
      const type = header.mode === ">" ? Scalar.Scalar.BLOCK_FOLDED : Scalar.Scalar.BLOCK_LITERAL;
      const lines = scalar2.source ? splitLines(scalar2.source) : [];
      let chompStart = lines.length;
      for (let i = lines.length - 1; i >= 0; --i) {
        const content = lines[i][1];
        if (content === "" || content === "\r")
          chompStart = i;
        else
          break;
      }
      if (chompStart === 0) {
        const value2 = header.chomp === "+" && lines.length > 0 ? "\n".repeat(Math.max(1, lines.length - 1)) : "";
        let end2 = start2 + header.length;
        if (scalar2.source)
          end2 += scalar2.source.length;
        return { value: value2, type, comment: header.comment, range: [start2, end2, end2] };
      }
      let trimIndent = scalar2.indent + header.indent;
      let offset = scalar2.offset + header.length;
      let contentStart = 0;
      for (let i = 0; i < chompStart; ++i) {
        const [indent, content] = lines[i];
        if (content === "" || content === "\r") {
          if (header.indent === 0 && indent.length > trimIndent)
            trimIndent = indent.length;
        } else {
          if (indent.length < trimIndent) {
            const message = "Block scalars with more-indented leading empty lines must use an explicit indentation indicator";
            onError(offset + indent.length, "MISSING_CHAR", message);
          }
          if (header.indent === 0)
            trimIndent = indent.length;
          contentStart = i;
          if (trimIndent === 0 && !ctx.atRoot) {
            const message = "Block scalar values in collections must be indented";
            onError(offset, "BAD_INDENT", message);
          }
          break;
        }
        offset += indent.length + content.length + 1;
      }
      for (let i = lines.length - 1; i >= chompStart; --i) {
        if (lines[i][0].length > trimIndent)
          chompStart = i + 1;
      }
      let value = "";
      let sep2 = "";
      let prevMoreIndented = false;
      for (let i = 0; i < contentStart; ++i)
        value += lines[i][0].slice(trimIndent) + "\n";
      for (let i = contentStart; i < chompStart; ++i) {
        let [indent, content] = lines[i];
        offset += indent.length + content.length + 1;
        const crlf = content[content.length - 1] === "\r";
        if (crlf)
          content = content.slice(0, -1);
        if (content && indent.length < trimIndent) {
          const src = header.indent ? "explicit indentation indicator" : "first line";
          const message = `Block scalar lines must not be less indented than their ${src}`;
          onError(offset - content.length - (crlf ? 2 : 1), "BAD_INDENT", message);
          indent = "";
        }
        if (type === Scalar.Scalar.BLOCK_LITERAL) {
          value += sep2 + indent.slice(trimIndent) + content;
          sep2 = "\n";
        } else if (indent.length > trimIndent || content[0] === "	") {
          if (sep2 === " ")
            sep2 = "\n";
          else if (!prevMoreIndented && sep2 === "\n")
            sep2 = "\n\n";
          value += sep2 + indent.slice(trimIndent) + content;
          sep2 = "\n";
          prevMoreIndented = true;
        } else if (content === "") {
          if (sep2 === "\n")
            value += "\n";
          else
            sep2 = "\n";
        } else {
          value += sep2 + content;
          sep2 = " ";
          prevMoreIndented = false;
        }
      }
      switch (header.chomp) {
        case "-":
          break;
        case "+":
          for (let i = chompStart; i < lines.length; ++i)
            value += "\n" + lines[i][0].slice(trimIndent);
          if (value[value.length - 1] !== "\n")
            value += "\n";
          break;
        default:
          value += "\n";
      }
      const end = start2 + header.length + scalar2.source.length;
      return { value, type, comment: header.comment, range: [start2, end, end] };
    }
    function parseBlockScalarHeader({ offset, props }, strict, onError) {
      if (props[0].type !== "block-scalar-header") {
        onError(props[0], "IMPOSSIBLE", "Block scalar header not found");
        return null;
      }
      const { source } = props[0];
      const mode = source[0];
      let indent = 0;
      let chomp = "";
      let error = -1;
      for (let i = 1; i < source.length; ++i) {
        const ch = source[i];
        if (!chomp && (ch === "-" || ch === "+"))
          chomp = ch;
        else {
          const n2 = Number(ch);
          if (!indent && n2)
            indent = n2;
          else if (error === -1)
            error = offset + i;
        }
      }
      if (error !== -1)
        onError(error, "UNEXPECTED_TOKEN", `Block scalar header includes extra characters: ${source}`);
      let hasSpace = false;
      let comment = "";
      let length = source.length;
      for (let i = 1; i < props.length; ++i) {
        const token = props[i];
        switch (token.type) {
          case "space":
            hasSpace = true;
          // fallthrough
          case "newline":
            length += token.source.length;
            break;
          case "comment":
            if (strict && !hasSpace) {
              const message = "Comments must be separated from other tokens by white space characters";
              onError(token, "MISSING_CHAR", message);
            }
            length += token.source.length;
            comment = token.source.substring(1);
            break;
          case "error":
            onError(token, "UNEXPECTED_TOKEN", token.message);
            length += token.source.length;
            break;
          /* istanbul ignore next should not happen */
          default: {
            const message = `Unexpected token in block scalar header: ${token.type}`;
            onError(token, "UNEXPECTED_TOKEN", message);
            const ts = token.source;
            if (ts && typeof ts === "string")
              length += ts.length;
          }
        }
      }
      return { mode, indent, chomp, comment, length };
    }
    function splitLines(source) {
      const split = source.split(/\n( *)/);
      const first = split[0];
      const m = first.match(/^( *)/);
      const line0 = m?.[1] ? [m[1], first.slice(m[1].length)] : ["", first];
      const lines = [line0];
      for (let i = 1; i < split.length; i += 2)
        lines.push([split[i], split[i + 1]]);
      return lines;
    }
    exports.resolveBlockScalar = resolveBlockScalar;
  }
});

// node_modules/yaml/dist/compose/resolve-flow-scalar.js
var require_resolve_flow_scalar = __commonJS({
  "node_modules/yaml/dist/compose/resolve-flow-scalar.js"(exports) {
    "use strict";
    var Scalar = require_Scalar();
    var resolveEnd = require_resolve_end();
    function resolveFlowScalar(scalar2, strict, onError) {
      const { offset, type, source, end } = scalar2;
      let _type;
      let value;
      const _onError = (rel, code, msg) => onError(offset + rel, code, msg);
      switch (type) {
        case "scalar":
          _type = Scalar.Scalar.PLAIN;
          value = plainValue(source, _onError);
          break;
        case "single-quoted-scalar":
          _type = Scalar.Scalar.QUOTE_SINGLE;
          value = singleQuotedValue(source, _onError);
          break;
        case "double-quoted-scalar":
          _type = Scalar.Scalar.QUOTE_DOUBLE;
          value = doubleQuotedValue(source, _onError);
          break;
        /* istanbul ignore next should not happen */
        default:
          onError(scalar2, "UNEXPECTED_TOKEN", `Expected a flow scalar value, but found: ${type}`);
          return {
            value: "",
            type: null,
            comment: "",
            range: [offset, offset + source.length, offset + source.length]
          };
      }
      const valueEnd = offset + source.length;
      const re = resolveEnd.resolveEnd(end, valueEnd, strict, onError);
      return {
        value,
        type: _type,
        comment: re.comment,
        range: [offset, valueEnd, re.offset]
      };
    }
    function plainValue(source, onError) {
      let badChar = "";
      switch (source[0]) {
        /* istanbul ignore next should not happen */
        case "	":
          badChar = "a tab character";
          break;
        case ",":
          badChar = "flow indicator character ,";
          break;
        case "%":
          badChar = "directive indicator character %";
          break;
        case "|":
        case ">": {
          badChar = `block scalar indicator ${source[0]}`;
          break;
        }
        case "@":
        case "`": {
          badChar = `reserved character ${source[0]}`;
          break;
        }
      }
      if (badChar)
        onError(0, "BAD_SCALAR_START", `Plain value cannot start with ${badChar}`);
      return foldLines(source);
    }
    function singleQuotedValue(source, onError) {
      if (source[source.length - 1] !== "'" || source.length === 1)
        onError(source.length, "MISSING_CHAR", "Missing closing 'quote");
      return foldLines(source.slice(1, -1)).replace(/''/g, "'");
    }
    function foldLines(source) {
      let first, line3;
      try {
        first = new RegExp("(.*?)(?<![ 	])[ 	]*\r?\n", "sy");
        line3 = new RegExp("[ 	]*(.*?)(?:(?<![ 	])[ 	]*)?\r?\n", "sy");
      } catch {
        first = /(.*?)[ \t]*\r?\n/sy;
        line3 = /[ \t]*(.*?)[ \t]*\r?\n/sy;
      }
      let match = first.exec(source);
      if (!match)
        return source;
      let res = match[1];
      let sep2 = " ";
      let pos = first.lastIndex;
      line3.lastIndex = pos;
      while (match = line3.exec(source)) {
        if (match[1] === "") {
          if (sep2 === "\n")
            res += sep2;
          else
            sep2 = "\n";
        } else {
          res += sep2 + match[1];
          sep2 = " ";
        }
        pos = line3.lastIndex;
      }
      const last = /[ \t]*(.*)/sy;
      last.lastIndex = pos;
      match = last.exec(source);
      return res + sep2 + (match?.[1] ?? "");
    }
    function doubleQuotedValue(source, onError) {
      let res = "";
      for (let i = 1; i < source.length - 1; ++i) {
        const ch = source[i];
        if (ch === "\r" && source[i + 1] === "\n")
          continue;
        if (ch === "\n") {
          const { fold, offset } = foldNewline(source, i);
          res += fold;
          i = offset;
        } else if (ch === "\\") {
          let next = source[++i];
          const cc = escapeCodes[next];
          if (cc)
            res += cc;
          else if (next === "\n") {
            next = source[i + 1];
            while (next === " " || next === "	")
              next = source[++i + 1];
          } else if (next === "\r" && source[i + 1] === "\n") {
            next = source[++i + 1];
            while (next === " " || next === "	")
              next = source[++i + 1];
          } else if (next === "x" || next === "u" || next === "U") {
            const length = next === "x" ? 2 : next === "u" ? 4 : 8;
            res += parseCharCode(source, i + 1, length, onError);
            i += length;
          } else {
            const raw = source.substr(i - 1, 2);
            onError(i - 1, "BAD_DQ_ESCAPE", `Invalid escape sequence ${raw}`);
            res += raw;
          }
        } else if (ch === " " || ch === "	") {
          const wsStart = i;
          let next = source[i + 1];
          while (next === " " || next === "	")
            next = source[++i + 1];
          if (next !== "\n" && !(next === "\r" && source[i + 2] === "\n"))
            res += i > wsStart ? source.slice(wsStart, i + 1) : ch;
        } else {
          res += ch;
        }
      }
      if (source[source.length - 1] !== '"' || source.length === 1)
        onError(source.length, "MISSING_CHAR", 'Missing closing "quote');
      return res;
    }
    function foldNewline(source, offset) {
      let fold = "";
      let ch = source[offset + 1];
      while (ch === " " || ch === "	" || ch === "\n" || ch === "\r") {
        if (ch === "\r" && source[offset + 2] !== "\n")
          break;
        if (ch === "\n")
          fold += "\n";
        offset += 1;
        ch = source[offset + 1];
      }
      if (!fold)
        fold = " ";
      return { fold, offset };
    }
    var escapeCodes = {
      "0": "\0",
      // null character
      a: "\x07",
      // bell character
      b: "\b",
      // backspace
      e: "\x1B",
      // escape character
      f: "\f",
      // form feed
      n: "\n",
      // line feed
      r: "\r",
      // carriage return
      t: "	",
      // horizontal tab
      v: "\v",
      // vertical tab
      N: "\x85",
      // Unicode next line
      _: "\xA0",
      // Unicode non-breaking space
      L: "\u2028",
      // Unicode line separator
      P: "\u2029",
      // Unicode paragraph separator
      " ": " ",
      '"': '"',
      "/": "/",
      "\\": "\\",
      "	": "	"
    };
    function parseCharCode(source, offset, length, onError) {
      const cc = source.substr(offset, length);
      const ok2 = cc.length === length && /^[0-9a-fA-F]+$/.test(cc);
      const code = ok2 ? parseInt(cc, 16) : NaN;
      try {
        return String.fromCodePoint(code);
      } catch {
        const raw = source.substr(offset - 2, length + 2);
        onError(offset - 2, "BAD_DQ_ESCAPE", `Invalid escape sequence ${raw}`);
        return raw;
      }
    }
    exports.resolveFlowScalar = resolveFlowScalar;
  }
});

// node_modules/yaml/dist/compose/compose-scalar.js
var require_compose_scalar = __commonJS({
  "node_modules/yaml/dist/compose/compose-scalar.js"(exports) {
    "use strict";
    var identity2 = require_identity();
    var Scalar = require_Scalar();
    var resolveBlockScalar = require_resolve_block_scalar();
    var resolveFlowScalar = require_resolve_flow_scalar();
    function composeScalar(ctx, token, tagToken, onError) {
      const { value, type, comment, range } = token.type === "block-scalar" ? resolveBlockScalar.resolveBlockScalar(ctx, token, onError) : resolveFlowScalar.resolveFlowScalar(token, ctx.options.strict, onError);
      const tagName = tagToken ? ctx.directives.tagName(tagToken.source, (msg) => onError(tagToken, "TAG_RESOLVE_FAILED", msg)) : null;
      let tag;
      if (ctx.options.stringKeys && ctx.atKey) {
        tag = ctx.schema[identity2.SCALAR];
      } else if (tagName)
        tag = findScalarTagByName(ctx.schema, value, tagName, tagToken, onError);
      else if (token.type === "scalar")
        tag = findScalarTagByTest(ctx, value, token, onError);
      else
        tag = ctx.schema[identity2.SCALAR];
      let scalar2;
      try {
        const res = tag.resolve(value, (msg) => onError(tagToken ?? token, "TAG_RESOLVE_FAILED", msg), ctx.options);
        scalar2 = identity2.isScalar(res) ? res : new Scalar.Scalar(res);
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        onError(tagToken ?? token, "TAG_RESOLVE_FAILED", msg);
        scalar2 = new Scalar.Scalar(value);
      }
      scalar2.range = range;
      scalar2.source = value;
      if (type)
        scalar2.type = type;
      if (tagName)
        scalar2.tag = tagName;
      if (tag.format)
        scalar2.format = tag.format;
      if (comment)
        scalar2.comment = comment;
      return scalar2;
    }
    function findScalarTagByName(schema, value, tagName, tagToken, onError) {
      if (tagName === "!")
        return schema[identity2.SCALAR];
      const matchWithTest = [];
      for (const tag of schema.tags) {
        if (!tag.collection && tag.tag === tagName) {
          if (tag.default && tag.test)
            matchWithTest.push(tag);
          else
            return tag;
        }
      }
      for (const tag of matchWithTest)
        if (tag.test?.test(value))
          return tag;
      const kt = schema.knownTags[tagName];
      if (kt && !kt.collection) {
        schema.tags.push(Object.assign({}, kt, { default: false, test: void 0 }));
        return kt;
      }
      onError(tagToken, "TAG_RESOLVE_FAILED", `Unresolved tag: ${tagName}`, tagName !== "tag:yaml.org,2002:str");
      return schema[identity2.SCALAR];
    }
    function findScalarTagByTest({ atKey, directives, schema }, value, token, onError) {
      const tag = schema.tags.find((tag2) => (tag2.default === true || atKey && tag2.default === "key") && tag2.test?.test(value)) || schema[identity2.SCALAR];
      if (schema.compat) {
        const compat = schema.compat.find((tag2) => tag2.default && tag2.test?.test(value)) ?? schema[identity2.SCALAR];
        if (tag.tag !== compat.tag) {
          const ts = directives.tagString(tag.tag);
          const cs = directives.tagString(compat.tag);
          const msg = `Value may be parsed as either ${ts} or ${cs}`;
          onError(token, "TAG_RESOLVE_FAILED", msg, true);
        }
      }
      return tag;
    }
    exports.composeScalar = composeScalar;
  }
});

// node_modules/yaml/dist/compose/util-empty-scalar-position.js
var require_util_empty_scalar_position = __commonJS({
  "node_modules/yaml/dist/compose/util-empty-scalar-position.js"(exports) {
    "use strict";
    function emptyScalarPosition(offset, before, pos) {
      if (before) {
        pos ?? (pos = before.length);
        for (let i = pos - 1; i >= 0; --i) {
          let st = before[i];
          switch (st.type) {
            case "space":
            case "comment":
            case "newline":
              offset -= st.source.length;
              continue;
          }
          st = before[++i];
          while (st?.type === "space") {
            offset += st.source.length;
            st = before[++i];
          }
          break;
        }
      }
      return offset;
    }
    exports.emptyScalarPosition = emptyScalarPosition;
  }
});

// node_modules/yaml/dist/compose/compose-node.js
var require_compose_node = __commonJS({
  "node_modules/yaml/dist/compose/compose-node.js"(exports) {
    "use strict";
    var Alias = require_Alias();
    var identity2 = require_identity();
    var composeCollection = require_compose_collection();
    var composeScalar = require_compose_scalar();
    var resolveEnd = require_resolve_end();
    var utilEmptyScalarPosition = require_util_empty_scalar_position();
    var CN = { composeNode, composeEmptyNode };
    function composeNode(ctx, token, props, onError) {
      const atKey = ctx.atKey;
      const { spaceBefore, comment, anchor, tag } = props;
      let node;
      let isSrcToken = true;
      switch (token.type) {
        case "alias":
          node = composeAlias(ctx, token, onError);
          if (anchor || tag)
            onError(token, "ALIAS_PROPS", "An alias node must not specify any properties");
          break;
        case "scalar":
        case "single-quoted-scalar":
        case "double-quoted-scalar":
        case "block-scalar":
          node = composeScalar.composeScalar(ctx, token, tag, onError);
          if (anchor)
            node.anchor = anchor.source.substring(1);
          break;
        case "block-map":
        case "block-seq":
        case "flow-collection":
          try {
            node = composeCollection.composeCollection(CN, ctx, token, props, onError);
            if (anchor)
              node.anchor = anchor.source.substring(1);
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            onError(token, "RESOURCE_EXHAUSTION", message);
          }
          break;
        default: {
          const message = token.type === "error" ? token.message : `Unsupported token (type: ${token.type})`;
          onError(token, "UNEXPECTED_TOKEN", message);
          isSrcToken = false;
        }
      }
      node ?? (node = composeEmptyNode(ctx, token.offset, void 0, null, props, onError));
      if (anchor && node.anchor === "")
        onError(anchor, "BAD_ALIAS", "Anchor cannot be an empty string");
      if (atKey && ctx.options.stringKeys && (!identity2.isScalar(node) || typeof node.value !== "string" || node.tag && node.tag !== "tag:yaml.org,2002:str")) {
        const msg = "With stringKeys, all keys must be strings";
        onError(tag ?? token, "NON_STRING_KEY", msg);
      }
      if (spaceBefore)
        node.spaceBefore = true;
      if (comment) {
        if (token.type === "scalar" && token.source === "")
          node.comment = comment;
        else
          node.commentBefore = comment;
      }
      if (ctx.options.keepSourceTokens && isSrcToken)
        node.srcToken = token;
      return node;
    }
    function composeEmptyNode(ctx, offset, before, pos, { spaceBefore, comment, anchor, tag, end }, onError) {
      const token = {
        type: "scalar",
        offset: utilEmptyScalarPosition.emptyScalarPosition(offset, before, pos),
        indent: -1,
        source: ""
      };
      const node = composeScalar.composeScalar(ctx, token, tag, onError);
      if (anchor) {
        node.anchor = anchor.source.substring(1);
        if (node.anchor === "")
          onError(anchor, "BAD_ALIAS", "Anchor cannot be an empty string");
      }
      if (spaceBefore)
        node.spaceBefore = true;
      if (comment) {
        node.comment = comment;
        node.range[2] = end;
      }
      return node;
    }
    function composeAlias({ options }, { offset, source, end }, onError) {
      const alias = new Alias.Alias(source.substring(1));
      if (alias.source === "")
        onError(offset, "BAD_ALIAS", "Alias cannot be an empty string");
      if (alias.source.endsWith(":"))
        onError(offset + source.length - 1, "BAD_ALIAS", "Alias ending in : is ambiguous", true);
      const valueEnd = offset + source.length;
      const re = resolveEnd.resolveEnd(end, valueEnd, options.strict, onError);
      alias.range = [offset, valueEnd, re.offset];
      if (re.comment)
        alias.comment = re.comment;
      return alias;
    }
    exports.composeEmptyNode = composeEmptyNode;
    exports.composeNode = composeNode;
  }
});

// node_modules/yaml/dist/compose/compose-doc.js
var require_compose_doc = __commonJS({
  "node_modules/yaml/dist/compose/compose-doc.js"(exports) {
    "use strict";
    var Document = require_Document();
    var composeNode = require_compose_node();
    var resolveEnd = require_resolve_end();
    var resolveProps = require_resolve_props();
    function composeDoc(options, directives, { offset, start: start2, value, end }, onError) {
      const opts = Object.assign({ _directives: directives }, options);
      const doc = new Document.Document(void 0, opts);
      const ctx = {
        atKey: false,
        atRoot: true,
        directives: doc.directives,
        options: doc.options,
        schema: doc.schema
      };
      const props = resolveProps.resolveProps(start2, {
        indicator: "doc-start",
        next: value ?? end?.[0],
        offset,
        onError,
        parentIndent: 0,
        startOnNewline: true
      });
      if (props.found) {
        doc.directives.docStart = true;
        if (value && (value.type === "block-map" || value.type === "block-seq") && !props.hasNewline)
          onError(props.end, "MISSING_CHAR", "Block collection cannot start on same line with directives-end marker");
      }
      doc.contents = value ? composeNode.composeNode(ctx, value, props, onError) : composeNode.composeEmptyNode(ctx, props.end, start2, null, props, onError);
      const contentEnd = doc.contents.range[2];
      const re = resolveEnd.resolveEnd(end, contentEnd, false, onError);
      if (re.comment)
        doc.comment = re.comment;
      doc.range = [offset, contentEnd, re.offset];
      return doc;
    }
    exports.composeDoc = composeDoc;
  }
});

// node_modules/yaml/dist/compose/composer.js
var require_composer = __commonJS({
  "node_modules/yaml/dist/compose/composer.js"(exports) {
    "use strict";
    var node_process = __require("process");
    var directives = require_directives();
    var Document = require_Document();
    var errors = require_errors();
    var identity2 = require_identity();
    var composeDoc = require_compose_doc();
    var resolveEnd = require_resolve_end();
    function getErrorPos(src) {
      if (typeof src === "number")
        return [src, src + 1];
      if (Array.isArray(src))
        return src.length === 2 ? src : [src[0], src[1]];
      const { offset, source } = src;
      return [offset, offset + (typeof source === "string" ? source.length : 1)];
    }
    function parsePrelude(prelude) {
      let comment = "";
      let atComment = false;
      let afterEmptyLine = false;
      for (let i = 0; i < prelude.length; ++i) {
        const source = prelude[i];
        switch (source[0]) {
          case "#":
            comment += (comment === "" ? "" : afterEmptyLine ? "\n\n" : "\n") + (source.substring(1) || " ");
            atComment = true;
            afterEmptyLine = false;
            break;
          case "%":
            if (prelude[i + 1]?.[0] !== "#")
              i += 1;
            atComment = false;
            break;
          default:
            if (!atComment)
              afterEmptyLine = true;
            atComment = false;
        }
      }
      return { comment, afterEmptyLine };
    }
    var Composer = class {
      constructor(options = {}) {
        this.doc = null;
        this.atDirectives = false;
        this.prelude = [];
        this.errors = [];
        this.warnings = [];
        this.onError = (source, code, message, warning) => {
          const pos = getErrorPos(source);
          if (warning)
            this.warnings.push(new errors.YAMLWarning(pos, code, message));
          else
            this.errors.push(new errors.YAMLParseError(pos, code, message));
        };
        this.directives = new directives.Directives({ version: options.version || "1.2" });
        this.options = options;
      }
      decorate(doc, afterDoc) {
        const { comment, afterEmptyLine } = parsePrelude(this.prelude);
        if (comment) {
          const dc = doc.contents;
          if (afterDoc) {
            doc.comment = doc.comment ? `${doc.comment}
${comment}` : comment;
          } else if (afterEmptyLine || doc.directives.docStart || !dc) {
            doc.commentBefore = comment;
          } else if (identity2.isCollection(dc) && !dc.flow && dc.items.length > 0) {
            let it = dc.items[0];
            if (identity2.isPair(it))
              it = it.key;
            const cb = it.commentBefore;
            it.commentBefore = cb ? `${comment}
${cb}` : comment;
          } else {
            const cb = dc.commentBefore;
            dc.commentBefore = cb ? `${comment}
${cb}` : comment;
          }
        }
        if (afterDoc) {
          for (let i = 0; i < this.errors.length; ++i)
            doc.errors.push(this.errors[i]);
          for (let i = 0; i < this.warnings.length; ++i)
            doc.warnings.push(this.warnings[i]);
        } else {
          doc.errors = this.errors;
          doc.warnings = this.warnings;
        }
        this.prelude = [];
        this.errors = [];
        this.warnings = [];
      }
      /**
       * Current stream status information.
       *
       * Mostly useful at the end of input for an empty stream.
       */
      streamInfo() {
        return {
          comment: parsePrelude(this.prelude).comment,
          directives: this.directives,
          errors: this.errors,
          warnings: this.warnings
        };
      }
      /**
       * Compose tokens into documents.
       *
       * @param forceDoc - If the stream contains no document, still emit a final document including any comments and directives that would be applied to a subsequent document.
       * @param endOffset - Should be set if `forceDoc` is also set, to set the document range end and to indicate errors correctly.
       */
      *compose(tokens, forceDoc = false, endOffset = -1) {
        for (const token of tokens)
          yield* this.next(token);
        yield* this.end(forceDoc, endOffset);
      }
      /** Advance the composer by one CST token. */
      *next(token) {
        if (node_process.env.LOG_STREAM)
          console.dir(token, { depth: null });
        switch (token.type) {
          case "directive":
            this.directives.add(token.source, (offset, message, warning) => {
              const pos = getErrorPos(token);
              pos[0] += offset;
              this.onError(pos, "BAD_DIRECTIVE", message, warning);
            });
            this.prelude.push(token.source);
            this.atDirectives = true;
            break;
          case "document": {
            const doc = composeDoc.composeDoc(this.options, this.directives, token, this.onError);
            if (this.atDirectives && !doc.directives.docStart)
              this.onError(token, "MISSING_CHAR", "Missing directives-end/doc-start indicator line");
            this.decorate(doc, false);
            if (this.doc)
              yield this.doc;
            this.doc = doc;
            this.atDirectives = false;
            break;
          }
          case "byte-order-mark":
          case "space":
            break;
          case "comment":
          case "newline":
            this.prelude.push(token.source);
            break;
          case "error": {
            const msg = token.source ? `${token.message}: ${JSON.stringify(token.source)}` : token.message;
            const error = new errors.YAMLParseError(getErrorPos(token), "UNEXPECTED_TOKEN", msg);
            if (this.atDirectives || !this.doc)
              this.errors.push(error);
            else
              this.doc.errors.push(error);
            break;
          }
          case "doc-end": {
            if (!this.doc) {
              const msg = "Unexpected doc-end without preceding document";
              this.errors.push(new errors.YAMLParseError(getErrorPos(token), "UNEXPECTED_TOKEN", msg));
              break;
            }
            this.doc.directives.docEnd = true;
            const end = resolveEnd.resolveEnd(token.end, token.offset + token.source.length, this.doc.options.strict, this.onError);
            this.decorate(this.doc, true);
            if (end.comment) {
              const dc = this.doc.comment;
              this.doc.comment = dc ? `${dc}
${end.comment}` : end.comment;
            }
            this.doc.range[2] = end.offset;
            break;
          }
          default:
            this.errors.push(new errors.YAMLParseError(getErrorPos(token), "UNEXPECTED_TOKEN", `Unsupported token ${token.type}`));
        }
      }
      /**
       * Call at end of input to yield any remaining document.
       *
       * @param forceDoc - If the stream contains no document, still emit a final document including any comments and directives that would be applied to a subsequent document.
       * @param endOffset - Should be set if `forceDoc` is also set, to set the document range end and to indicate errors correctly.
       */
      *end(forceDoc = false, endOffset = -1) {
        if (this.doc) {
          this.decorate(this.doc, true);
          yield this.doc;
          this.doc = null;
        } else if (forceDoc) {
          const opts = Object.assign({ _directives: this.directives }, this.options);
          const doc = new Document.Document(void 0, opts);
          if (this.atDirectives)
            this.onError(endOffset, "MISSING_CHAR", "Missing directives-end indicator line");
          doc.range = [0, endOffset, endOffset];
          this.decorate(doc, false);
          yield doc;
        }
      }
    };
    exports.Composer = Composer;
  }
});

// node_modules/yaml/dist/parse/cst-scalar.js
var require_cst_scalar = __commonJS({
  "node_modules/yaml/dist/parse/cst-scalar.js"(exports) {
    "use strict";
    var resolveBlockScalar = require_resolve_block_scalar();
    var resolveFlowScalar = require_resolve_flow_scalar();
    var errors = require_errors();
    var stringifyString = require_stringifyString();
    function resolveAsScalar(token, strict = true, onError) {
      if (token) {
        const _onError = (pos, code, message) => {
          const offset = typeof pos === "number" ? pos : Array.isArray(pos) ? pos[0] : pos.offset;
          if (onError)
            onError(offset, code, message);
          else
            throw new errors.YAMLParseError([offset, offset + 1], code, message);
        };
        switch (token.type) {
          case "scalar":
          case "single-quoted-scalar":
          case "double-quoted-scalar":
            return resolveFlowScalar.resolveFlowScalar(token, strict, _onError);
          case "block-scalar":
            return resolveBlockScalar.resolveBlockScalar({ options: { strict } }, token, _onError);
        }
      }
      return null;
    }
    function createScalarToken(value, context2) {
      const { implicitKey = false, indent, inFlow = false, offset = -1, type = "PLAIN" } = context2;
      const source = stringifyString.stringifyString({ type, value }, {
        implicitKey,
        indent: indent > 0 ? " ".repeat(indent) : "",
        inFlow,
        options: { blockQuote: true, lineWidth: -1 }
      });
      const end = context2.end ?? [
        { type: "newline", offset: -1, indent, source: "\n" }
      ];
      switch (source[0]) {
        case "|":
        case ">": {
          const he = source.indexOf("\n");
          const head = source.substring(0, he);
          const body2 = source.substring(he + 1) + "\n";
          const props = [
            { type: "block-scalar-header", offset, indent, source: head }
          ];
          if (!addEndtoBlockProps(props, end))
            props.push({ type: "newline", offset: -1, indent, source: "\n" });
          return { type: "block-scalar", offset, indent, props, source: body2 };
        }
        case '"':
          return { type: "double-quoted-scalar", offset, indent, source, end };
        case "'":
          return { type: "single-quoted-scalar", offset, indent, source, end };
        default:
          return { type: "scalar", offset, indent, source, end };
      }
    }
    function setScalarValue(token, value, context2 = {}) {
      let { afterKey = false, implicitKey = false, inFlow = false, type } = context2;
      let indent = "indent" in token ? token.indent : null;
      if (afterKey && typeof indent === "number")
        indent += 2;
      if (!type)
        switch (token.type) {
          case "single-quoted-scalar":
            type = "QUOTE_SINGLE";
            break;
          case "double-quoted-scalar":
            type = "QUOTE_DOUBLE";
            break;
          case "block-scalar": {
            const header = token.props[0];
            if (header.type !== "block-scalar-header")
              throw new Error("Invalid block scalar header");
            type = header.source[0] === ">" ? "BLOCK_FOLDED" : "BLOCK_LITERAL";
            break;
          }
          default:
            type = "PLAIN";
        }
      const source = stringifyString.stringifyString({ type, value }, {
        implicitKey: implicitKey || indent === null,
        indent: indent !== null && indent > 0 ? " ".repeat(indent) : "",
        inFlow,
        options: { blockQuote: true, lineWidth: -1 }
      });
      switch (source[0]) {
        case "|":
        case ">":
          setBlockScalarValue(token, source);
          break;
        case '"':
          setFlowScalarValue(token, source, "double-quoted-scalar");
          break;
        case "'":
          setFlowScalarValue(token, source, "single-quoted-scalar");
          break;
        default:
          setFlowScalarValue(token, source, "scalar");
      }
    }
    function setBlockScalarValue(token, source) {
      const he = source.indexOf("\n");
      const head = source.substring(0, he);
      const body2 = source.substring(he + 1) + "\n";
      if (token.type === "block-scalar") {
        const header = token.props[0];
        if (header.type !== "block-scalar-header")
          throw new Error("Invalid block scalar header");
        header.source = head;
        token.source = body2;
      } else {
        const { offset } = token;
        const indent = "indent" in token ? token.indent : -1;
        const props = [
          { type: "block-scalar-header", offset, indent, source: head }
        ];
        if (!addEndtoBlockProps(props, "end" in token ? token.end : void 0))
          props.push({ type: "newline", offset: -1, indent, source: "\n" });
        for (const key of Object.keys(token))
          if (key !== "type" && key !== "offset")
            delete token[key];
        Object.assign(token, { type: "block-scalar", indent, props, source: body2 });
      }
    }
    function addEndtoBlockProps(props, end) {
      if (end)
        for (const st of end)
          switch (st.type) {
            case "space":
            case "comment":
              props.push(st);
              break;
            case "newline":
              props.push(st);
              return true;
          }
      return false;
    }
    function setFlowScalarValue(token, source, type) {
      switch (token.type) {
        case "scalar":
        case "double-quoted-scalar":
        case "single-quoted-scalar":
          token.type = type;
          token.source = source;
          break;
        case "block-scalar": {
          const end = token.props.slice(1);
          let oa = source.length;
          if (token.props[0].type === "block-scalar-header")
            oa -= token.props[0].source.length;
          for (const tok of end)
            tok.offset += oa;
          delete token.props;
          Object.assign(token, { type, source, end });
          break;
        }
        case "block-map":
        case "block-seq": {
          const offset = token.offset + source.length;
          const nl = { type: "newline", offset, indent: token.indent, source: "\n" };
          delete token.items;
          Object.assign(token, { type, source, end: [nl] });
          break;
        }
        default: {
          const indent = "indent" in token ? token.indent : -1;
          const end = "end" in token && Array.isArray(token.end) ? token.end.filter((st) => st.type === "space" || st.type === "comment" || st.type === "newline") : [];
          for (const key of Object.keys(token))
            if (key !== "type" && key !== "offset")
              delete token[key];
          Object.assign(token, { type, indent, source, end });
        }
      }
    }
    exports.createScalarToken = createScalarToken;
    exports.resolveAsScalar = resolveAsScalar;
    exports.setScalarValue = setScalarValue;
  }
});

// node_modules/yaml/dist/parse/cst-stringify.js
var require_cst_stringify = __commonJS({
  "node_modules/yaml/dist/parse/cst-stringify.js"(exports) {
    "use strict";
    var stringify2 = (cst) => "type" in cst ? stringifyToken(cst) : stringifyItem(cst);
    function stringifyToken(token) {
      switch (token.type) {
        case "block-scalar": {
          let res = "";
          for (const tok of token.props)
            res += stringifyToken(tok);
          return res + token.source;
        }
        case "block-map":
        case "block-seq": {
          let res = "";
          for (const item of token.items)
            res += stringifyItem(item);
          return res;
        }
        case "flow-collection": {
          let res = token.start.source;
          for (const item of token.items)
            res += stringifyItem(item);
          for (const st of token.end)
            res += st.source;
          return res;
        }
        case "document": {
          let res = stringifyItem(token);
          if (token.end)
            for (const st of token.end)
              res += st.source;
          return res;
        }
        default: {
          let res = token.source;
          if ("end" in token && token.end)
            for (const st of token.end)
              res += st.source;
          return res;
        }
      }
    }
    function stringifyItem({ start: start2, key, sep: sep2, value }) {
      let res = "";
      for (const st of start2)
        res += st.source;
      if (key)
        res += stringifyToken(key);
      if (sep2)
        for (const st of sep2)
          res += st.source;
      if (value)
        res += stringifyToken(value);
      return res;
    }
    exports.stringify = stringify2;
  }
});

// node_modules/yaml/dist/parse/cst-visit.js
var require_cst_visit = __commonJS({
  "node_modules/yaml/dist/parse/cst-visit.js"(exports) {
    "use strict";
    var BREAK2 = /* @__PURE__ */ Symbol("break visit");
    var SKIP = /* @__PURE__ */ Symbol("skip children");
    var REMOVE = /* @__PURE__ */ Symbol("remove item");
    function visit(cst, visitor) {
      if ("type" in cst && cst.type === "document")
        cst = { start: cst.start, value: cst.value };
      _visit(Object.freeze([]), cst, visitor);
    }
    visit.BREAK = BREAK2;
    visit.SKIP = SKIP;
    visit.REMOVE = REMOVE;
    visit.itemAtPath = (cst, path) => {
      let item = cst;
      for (const [field, index] of path) {
        const tok = item?.[field];
        if (tok && "items" in tok) {
          item = tok.items[index];
        } else
          return void 0;
      }
      return item;
    };
    visit.parentCollection = (cst, path) => {
      const parent = visit.itemAtPath(cst, path.slice(0, -1));
      const field = path[path.length - 1][0];
      const coll = parent?.[field];
      if (coll && "items" in coll)
        return coll;
      throw new Error("Parent collection not found");
    };
    function _visit(path, item, visitor) {
      let ctrl = visitor(item, path);
      if (typeof ctrl === "symbol")
        return ctrl;
      for (const field of ["key", "value"]) {
        const token = item[field];
        if (token && "items" in token) {
          for (let i = 0; i < token.items.length; ++i) {
            const ci = _visit(Object.freeze(path.concat([[field, i]])), token.items[i], visitor);
            if (typeof ci === "number")
              i = ci - 1;
            else if (ci === BREAK2)
              return BREAK2;
            else if (ci === REMOVE) {
              token.items.splice(i, 1);
              i -= 1;
            }
          }
          if (typeof ctrl === "function" && field === "key")
            ctrl = ctrl(item, path);
        }
      }
      return typeof ctrl === "function" ? ctrl(item, path) : ctrl;
    }
    exports.visit = visit;
  }
});

// node_modules/yaml/dist/parse/cst.js
var require_cst = __commonJS({
  "node_modules/yaml/dist/parse/cst.js"(exports) {
    "use strict";
    var cstScalar = require_cst_scalar();
    var cstStringify = require_cst_stringify();
    var cstVisit = require_cst_visit();
    var BOM = "\uFEFF";
    var DOCUMENT = "";
    var FLOW_END = "";
    var SCALAR = "";
    var isCollection = (token) => !!token && "items" in token;
    var isScalar = (token) => !!token && (token.type === "scalar" || token.type === "single-quoted-scalar" || token.type === "double-quoted-scalar" || token.type === "block-scalar");
    function prettyToken(token) {
      switch (token) {
        case BOM:
          return "<BOM>";
        case DOCUMENT:
          return "<DOC>";
        case FLOW_END:
          return "<FLOW_END>";
        case SCALAR:
          return "<SCALAR>";
        default:
          return JSON.stringify(token);
      }
    }
    function tokenType(source) {
      switch (source) {
        case BOM:
          return "byte-order-mark";
        case DOCUMENT:
          return "doc-mode";
        case FLOW_END:
          return "flow-error-end";
        case SCALAR:
          return "scalar";
        case "---":
          return "doc-start";
        case "...":
          return "doc-end";
        case "":
        case "\n":
        case "\r\n":
          return "newline";
        case "-":
          return "seq-item-ind";
        case "?":
          return "explicit-key-ind";
        case ":":
          return "map-value-ind";
        case "{":
          return "flow-map-start";
        case "}":
          return "flow-map-end";
        case "[":
          return "flow-seq-start";
        case "]":
          return "flow-seq-end";
        case ",":
          return "comma";
      }
      switch (source[0]) {
        case " ":
        case "	":
          return "space";
        case "#":
          return "comment";
        case "%":
          return "directive-line";
        case "*":
          return "alias";
        case "&":
          return "anchor";
        case "!":
          return "tag";
        case "'":
          return "single-quoted-scalar";
        case '"':
          return "double-quoted-scalar";
        case "|":
        case ">":
          return "block-scalar-header";
      }
      return null;
    }
    exports.createScalarToken = cstScalar.createScalarToken;
    exports.resolveAsScalar = cstScalar.resolveAsScalar;
    exports.setScalarValue = cstScalar.setScalarValue;
    exports.stringify = cstStringify.stringify;
    exports.visit = cstVisit.visit;
    exports.BOM = BOM;
    exports.DOCUMENT = DOCUMENT;
    exports.FLOW_END = FLOW_END;
    exports.SCALAR = SCALAR;
    exports.isCollection = isCollection;
    exports.isScalar = isScalar;
    exports.prettyToken = prettyToken;
    exports.tokenType = tokenType;
  }
});

// node_modules/yaml/dist/parse/lexer.js
var require_lexer = __commonJS({
  "node_modules/yaml/dist/parse/lexer.js"(exports) {
    "use strict";
    var cst = require_cst();
    function isEmpty(ch) {
      switch (ch) {
        case void 0:
        case " ":
        case "\n":
        case "\r":
        case "	":
          return true;
        default:
          return false;
      }
    }
    var hexDigits = new Set("0123456789ABCDEFabcdef");
    var tagChars = new Set("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-#;/?:@&=+$_.!~*'()");
    var flowIndicatorChars = new Set(",[]{}");
    var invalidAnchorChars = new Set(" ,[]{}\n\r	");
    var isNotAnchorChar = (ch) => !ch || invalidAnchorChars.has(ch);
    var Lexer = class {
      constructor() {
        this.atEnd = false;
        this.blockScalarIndent = -1;
        this.blockScalarKeep = false;
        this.buffer = "";
        this.flowKey = false;
        this.flowLevel = 0;
        this.indentNext = 0;
        this.indentValue = 0;
        this.lineEndPos = null;
        this.next = null;
        this.pos = 0;
      }
      /**
       * Generate YAML tokens from the `source` string. If `incomplete`,
       * a part of the last line may be left as a buffer for the next call.
       *
       * @returns A generator of lexical tokens
       */
      *lex(source, incomplete = false) {
        if (source) {
          if (typeof source !== "string")
            throw TypeError("source is not a string");
          this.buffer = this.buffer ? this.buffer + source : source;
          this.lineEndPos = null;
        }
        this.atEnd = !incomplete;
        let next = this.next ?? "stream";
        while (next && (incomplete || this.hasChars(1)))
          next = yield* this.parseNext(next);
      }
      atLineEnd() {
        let i = this.pos;
        let ch = this.buffer[i];
        while (ch === " " || ch === "	")
          ch = this.buffer[++i];
        if (!ch || ch === "#" || ch === "\n")
          return true;
        if (ch === "\r")
          return this.buffer[i + 1] === "\n";
        return false;
      }
      charAt(n2) {
        return this.buffer[this.pos + n2];
      }
      continueScalar(offset) {
        let ch = this.buffer[offset];
        if (this.indentNext > 0) {
          let indent = 0;
          while (ch === " ")
            ch = this.buffer[++indent + offset];
          if (ch === "\r") {
            const next = this.buffer[indent + offset + 1];
            if (next === "\n" || !next && !this.atEnd)
              return offset + indent + 1;
          }
          return ch === "\n" || indent >= this.indentNext || !ch && !this.atEnd ? offset + indent : -1;
        }
        if (ch === "-" || ch === ".") {
          const dt = this.buffer.substr(offset, 3);
          if ((dt === "---" || dt === "...") && isEmpty(this.buffer[offset + 3]))
            return -1;
        }
        return offset;
      }
      getLine() {
        let end = this.lineEndPos;
        if (typeof end !== "number" || end !== -1 && end < this.pos) {
          end = this.buffer.indexOf("\n", this.pos);
          this.lineEndPos = end;
        }
        if (end === -1)
          return this.atEnd ? this.buffer.substring(this.pos) : null;
        if (this.buffer[end - 1] === "\r")
          end -= 1;
        return this.buffer.substring(this.pos, end);
      }
      hasChars(n2) {
        return this.pos + n2 <= this.buffer.length;
      }
      setNext(state) {
        this.buffer = this.buffer.substring(this.pos);
        this.pos = 0;
        this.lineEndPos = null;
        this.next = state;
        return null;
      }
      peek(n2) {
        return this.buffer.substr(this.pos, n2);
      }
      *parseNext(next) {
        switch (next) {
          case "stream":
            return yield* this.parseStream();
          case "line-start":
            return yield* this.parseLineStart();
          case "block-start":
            return yield* this.parseBlockStart();
          case "doc":
            return yield* this.parseDocument();
          case "flow":
            return yield* this.parseFlowCollection();
          case "quoted-scalar":
            return yield* this.parseQuotedScalar();
          case "block-scalar":
            return yield* this.parseBlockScalar();
          case "plain-scalar":
            return yield* this.parsePlainScalar();
        }
      }
      *parseStream() {
        let line3 = this.getLine();
        if (line3 === null)
          return this.setNext("stream");
        if (line3[0] === cst.BOM) {
          yield* this.pushCount(1);
          line3 = line3.substring(1);
        }
        if (line3[0] === "%") {
          let dirEnd = line3.length;
          let cs = line3.indexOf("#");
          while (cs !== -1) {
            const ch = line3[cs - 1];
            if (ch === " " || ch === "	") {
              dirEnd = cs - 1;
              break;
            } else {
              cs = line3.indexOf("#", cs + 1);
            }
          }
          while (true) {
            const ch = line3[dirEnd - 1];
            if (ch === " " || ch === "	")
              dirEnd -= 1;
            else
              break;
          }
          const n2 = (yield* this.pushCount(dirEnd)) + (yield* this.pushSpaces(true));
          yield* this.pushCount(line3.length - n2);
          this.pushNewline();
          return "stream";
        }
        if (this.atLineEnd()) {
          const sp = yield* this.pushSpaces(true);
          yield* this.pushCount(line3.length - sp);
          yield* this.pushNewline();
          return "stream";
        }
        yield cst.DOCUMENT;
        return yield* this.parseLineStart();
      }
      *parseLineStart() {
        const ch = this.charAt(0);
        if (!ch && !this.atEnd)
          return this.setNext("line-start");
        if (ch === "-" || ch === ".") {
          if (!this.atEnd && !this.hasChars(4))
            return this.setNext("line-start");
          const s2 = this.peek(3);
          if ((s2 === "---" || s2 === "...") && isEmpty(this.charAt(3))) {
            yield* this.pushCount(3);
            this.indentValue = 0;
            this.indentNext = 0;
            return s2 === "---" ? "doc" : "stream";
          }
        }
        this.indentValue = yield* this.pushSpaces(false);
        if (this.indentNext > this.indentValue && !isEmpty(this.charAt(1)))
          this.indentNext = this.indentValue;
        return yield* this.parseBlockStart();
      }
      *parseBlockStart() {
        const [ch0, ch1] = this.peek(2);
        if (!ch1 && !this.atEnd)
          return this.setNext("block-start");
        if ((ch0 === "-" || ch0 === "?" || ch0 === ":") && isEmpty(ch1)) {
          const n2 = (yield* this.pushCount(1)) + (yield* this.pushSpaces(true));
          this.indentNext = this.indentValue + 1;
          this.indentValue += n2;
          return "block-start";
        }
        return "doc";
      }
      *parseDocument() {
        yield* this.pushSpaces(true);
        const line3 = this.getLine();
        if (line3 === null)
          return this.setNext("doc");
        let n2 = yield* this.pushIndicators();
        switch (line3[n2]) {
          case "#":
            yield* this.pushCount(line3.length - n2);
          // fallthrough
          case void 0:
            yield* this.pushNewline();
            return yield* this.parseLineStart();
          case "{":
          case "[":
            yield* this.pushCount(1);
            this.flowKey = false;
            this.flowLevel = 1;
            return "flow";
          case "}":
          case "]":
            yield* this.pushCount(1);
            return "doc";
          case "*":
            yield* this.pushUntil(isNotAnchorChar);
            return "doc";
          case '"':
          case "'":
            return yield* this.parseQuotedScalar();
          case "|":
          case ">":
            n2 += yield* this.parseBlockScalarHeader();
            n2 += yield* this.pushSpaces(true);
            yield* this.pushCount(line3.length - n2);
            yield* this.pushNewline();
            return yield* this.parseBlockScalar();
          default:
            return yield* this.parsePlainScalar();
        }
      }
      *parseFlowCollection() {
        let nl, sp;
        let indent = -1;
        do {
          nl = yield* this.pushNewline();
          if (nl > 0) {
            sp = yield* this.pushSpaces(false);
            this.indentValue = indent = sp;
          } else {
            sp = 0;
          }
          sp += yield* this.pushSpaces(true);
        } while (nl + sp > 0);
        const line3 = this.getLine();
        if (line3 === null)
          return this.setNext("flow");
        if (indent !== -1 && indent < this.indentNext && line3[0] !== "#" || indent === 0 && (line3.startsWith("---") || line3.startsWith("...")) && isEmpty(line3[3])) {
          const atFlowEndMarker = indent === this.indentNext - 1 && this.flowLevel === 1 && (line3[0] === "]" || line3[0] === "}");
          if (!atFlowEndMarker) {
            this.flowLevel = 0;
            yield cst.FLOW_END;
            return yield* this.parseLineStart();
          }
        }
        let n2 = 0;
        while (line3[n2] === ",") {
          n2 += yield* this.pushCount(1);
          n2 += yield* this.pushSpaces(true);
          this.flowKey = false;
        }
        n2 += yield* this.pushIndicators();
        switch (line3[n2]) {
          case void 0:
            return "flow";
          case "#":
            yield* this.pushCount(line3.length - n2);
            return "flow";
          case "{":
          case "[":
            yield* this.pushCount(1);
            this.flowKey = false;
            this.flowLevel += 1;
            return "flow";
          case "}":
          case "]":
            yield* this.pushCount(1);
            this.flowKey = true;
            this.flowLevel -= 1;
            return this.flowLevel ? "flow" : "doc";
          case "*":
            yield* this.pushUntil(isNotAnchorChar);
            return "flow";
          case '"':
          case "'":
            this.flowKey = true;
            return yield* this.parseQuotedScalar();
          case ":": {
            const next = this.charAt(1);
            if (this.flowKey || isEmpty(next) || next === ",") {
              this.flowKey = false;
              yield* this.pushCount(1);
              yield* this.pushSpaces(true);
              return "flow";
            }
          }
          // fallthrough
          default:
            this.flowKey = false;
            return yield* this.parsePlainScalar();
        }
      }
      *parseQuotedScalar() {
        const quote = this.charAt(0);
        let end = this.buffer.indexOf(quote, this.pos + 1);
        if (quote === "'") {
          while (end !== -1 && this.buffer[end + 1] === "'")
            end = this.buffer.indexOf("'", end + 2);
        } else {
          while (end !== -1) {
            let n2 = 0;
            while (this.buffer[end - 1 - n2] === "\\")
              n2 += 1;
            if (n2 % 2 === 0)
              break;
            end = this.buffer.indexOf('"', end + 1);
          }
        }
        const qb = this.buffer.substring(0, end);
        let nl = qb.indexOf("\n", this.pos);
        if (nl !== -1) {
          while (nl !== -1) {
            const cs = this.continueScalar(nl + 1);
            if (cs === -1)
              break;
            nl = qb.indexOf("\n", cs);
          }
          if (nl !== -1) {
            end = nl - (qb[nl - 1] === "\r" ? 2 : 1);
          }
        }
        if (end === -1) {
          if (!this.atEnd)
            return this.setNext("quoted-scalar");
          end = this.buffer.length;
        }
        yield* this.pushToIndex(end + 1, false);
        return this.flowLevel ? "flow" : "doc";
      }
      *parseBlockScalarHeader() {
        this.blockScalarIndent = -1;
        this.blockScalarKeep = false;
        let i = this.pos;
        while (true) {
          const ch = this.buffer[++i];
          if (ch === "+")
            this.blockScalarKeep = true;
          else if (ch > "0" && ch <= "9")
            this.blockScalarIndent = Number(ch) - 1;
          else if (ch !== "-")
            break;
        }
        return yield* this.pushUntil((ch) => isEmpty(ch) || ch === "#");
      }
      *parseBlockScalar() {
        let nl = this.pos - 1;
        let indent = 0;
        let ch;
        loop: for (let i2 = this.pos; ch = this.buffer[i2]; ++i2) {
          switch (ch) {
            case " ":
              indent += 1;
              break;
            case "\n":
              nl = i2;
              indent = 0;
              break;
            case "\r": {
              const next = this.buffer[i2 + 1];
              if (!next && !this.atEnd)
                return this.setNext("block-scalar");
              if (next === "\n")
                break;
            }
            // fallthrough
            default:
              break loop;
          }
        }
        if (!ch && !this.atEnd)
          return this.setNext("block-scalar");
        if (indent >= this.indentNext) {
          if (this.blockScalarIndent === -1)
            this.indentNext = indent;
          else {
            this.indentNext = this.blockScalarIndent + (this.indentNext === 0 ? 1 : this.indentNext);
          }
          do {
            const cs = this.continueScalar(nl + 1);
            if (cs === -1)
              break;
            nl = this.buffer.indexOf("\n", cs);
          } while (nl !== -1);
          if (nl === -1) {
            if (!this.atEnd)
              return this.setNext("block-scalar");
            nl = this.buffer.length;
          }
        }
        let i = nl + 1;
        ch = this.buffer[i];
        while (ch === " ")
          ch = this.buffer[++i];
        if (ch === "	") {
          while (ch === "	" || ch === " " || ch === "\r" || ch === "\n")
            ch = this.buffer[++i];
          nl = i - 1;
        } else if (!this.blockScalarKeep) {
          do {
            let i2 = nl - 1;
            let ch2 = this.buffer[i2];
            if (ch2 === "\r")
              ch2 = this.buffer[--i2];
            const lastChar = i2;
            while (ch2 === " ")
              ch2 = this.buffer[--i2];
            if (ch2 === "\n" && i2 >= this.pos && i2 + 1 + indent > lastChar)
              nl = i2;
            else
              break;
          } while (true);
        }
        yield cst.SCALAR;
        yield* this.pushToIndex(nl + 1, true);
        return yield* this.parseLineStart();
      }
      *parsePlainScalar() {
        const inFlow = this.flowLevel > 0;
        let end = this.pos - 1;
        let i = this.pos - 1;
        let ch;
        while (ch = this.buffer[++i]) {
          if (ch === ":") {
            const next = this.buffer[i + 1];
            if (isEmpty(next) || inFlow && flowIndicatorChars.has(next))
              break;
            end = i;
          } else if (isEmpty(ch)) {
            let next = this.buffer[i + 1];
            if (ch === "\r") {
              if (next === "\n") {
                i += 1;
                ch = "\n";
                next = this.buffer[i + 1];
              } else
                end = i;
            }
            if (next === "#" || inFlow && flowIndicatorChars.has(next))
              break;
            if (ch === "\n") {
              const cs = this.continueScalar(i + 1);
              if (cs === -1)
                break;
              i = Math.max(i, cs - 2);
            }
          } else {
            if (inFlow && flowIndicatorChars.has(ch))
              break;
            end = i;
          }
        }
        if (!ch && !this.atEnd)
          return this.setNext("plain-scalar");
        yield cst.SCALAR;
        yield* this.pushToIndex(end + 1, true);
        return inFlow ? "flow" : "doc";
      }
      *pushCount(n2) {
        if (n2 > 0) {
          yield this.buffer.substr(this.pos, n2);
          this.pos += n2;
          return n2;
        }
        return 0;
      }
      *pushToIndex(i, allowEmpty) {
        const s2 = this.buffer.slice(this.pos, i);
        if (s2) {
          yield s2;
          this.pos += s2.length;
          return s2.length;
        } else if (allowEmpty)
          yield "";
        return 0;
      }
      *pushIndicators() {
        let n2 = 0;
        loop: while (true) {
          switch (this.charAt(0)) {
            case "!":
              n2 += yield* this.pushTag();
              n2 += yield* this.pushSpaces(true);
              continue loop;
            case "&":
              n2 += yield* this.pushUntil(isNotAnchorChar);
              n2 += yield* this.pushSpaces(true);
              continue loop;
            case "-":
            // this is an error
            case "?":
            // this is an error outside flow collections
            case ":": {
              const inFlow = this.flowLevel > 0;
              const ch1 = this.charAt(1);
              if (isEmpty(ch1) || inFlow && flowIndicatorChars.has(ch1)) {
                if (!inFlow)
                  this.indentNext = this.indentValue + 1;
                else if (this.flowKey)
                  this.flowKey = false;
                n2 += yield* this.pushCount(1);
                n2 += yield* this.pushSpaces(true);
                continue loop;
              }
            }
          }
          break loop;
        }
        return n2;
      }
      *pushTag() {
        if (this.charAt(1) === "<") {
          let i = this.pos + 2;
          let ch = this.buffer[i];
          while (!isEmpty(ch) && ch !== ">")
            ch = this.buffer[++i];
          return yield* this.pushToIndex(ch === ">" ? i + 1 : i, false);
        } else {
          let i = this.pos + 1;
          let ch = this.buffer[i];
          while (ch) {
            if (tagChars.has(ch))
              ch = this.buffer[++i];
            else if (ch === "%" && hexDigits.has(this.buffer[i + 1]) && hexDigits.has(this.buffer[i + 2])) {
              ch = this.buffer[i += 3];
            } else
              break;
          }
          return yield* this.pushToIndex(i, false);
        }
      }
      *pushNewline() {
        const ch = this.buffer[this.pos];
        if (ch === "\n")
          return yield* this.pushCount(1);
        else if (ch === "\r" && this.charAt(1) === "\n")
          return yield* this.pushCount(2);
        else
          return 0;
      }
      *pushSpaces(allowTabs) {
        let i = this.pos - 1;
        let ch;
        do {
          ch = this.buffer[++i];
        } while (ch === " " || allowTabs && ch === "	");
        const n2 = i - this.pos;
        if (n2 > 0) {
          yield this.buffer.substr(this.pos, n2);
          this.pos = i;
        }
        return n2;
      }
      *pushUntil(test) {
        let i = this.pos;
        let ch = this.buffer[i];
        while (!test(ch))
          ch = this.buffer[++i];
        return yield* this.pushToIndex(i, false);
      }
    };
    exports.Lexer = Lexer;
  }
});

// node_modules/yaml/dist/parse/line-counter.js
var require_line_counter = __commonJS({
  "node_modules/yaml/dist/parse/line-counter.js"(exports) {
    "use strict";
    var LineCounter = class {
      constructor() {
        this.lineStarts = [];
        this.addNewLine = (offset) => this.lineStarts.push(offset);
        this.linePos = (offset) => {
          let low = 0;
          let high = this.lineStarts.length;
          while (low < high) {
            const mid = low + high >> 1;
            if (this.lineStarts[mid] < offset)
              low = mid + 1;
            else
              high = mid;
          }
          if (this.lineStarts[low] === offset)
            return { line: low + 1, col: 1 };
          if (low === 0)
            return { line: 0, col: offset };
          const start2 = this.lineStarts[low - 1];
          return { line: low, col: offset - start2 + 1 };
        };
      }
    };
    exports.LineCounter = LineCounter;
  }
});

// node_modules/yaml/dist/parse/parser.js
var require_parser = __commonJS({
  "node_modules/yaml/dist/parse/parser.js"(exports) {
    "use strict";
    var node_process = __require("process");
    var cst = require_cst();
    var lexer = require_lexer();
    function includesToken(list, type) {
      for (let i = 0; i < list.length; ++i)
        if (list[i].type === type)
          return true;
      return false;
    }
    function findNonEmptyIndex(list) {
      for (let i = 0; i < list.length; ++i) {
        switch (list[i].type) {
          case "space":
          case "comment":
          case "newline":
            break;
          default:
            return i;
        }
      }
      return -1;
    }
    function isFlowToken(token) {
      switch (token?.type) {
        case "alias":
        case "scalar":
        case "single-quoted-scalar":
        case "double-quoted-scalar":
        case "flow-collection":
          return true;
        default:
          return false;
      }
    }
    function getPrevProps(parent) {
      switch (parent.type) {
        case "document":
          return parent.start;
        case "block-map": {
          const it = parent.items[parent.items.length - 1];
          return it.sep ?? it.start;
        }
        case "block-seq":
          return parent.items[parent.items.length - 1].start;
        /* istanbul ignore next should not happen */
        default:
          return [];
      }
    }
    function getFirstKeyStartProps(prev) {
      if (prev.length === 0)
        return [];
      let i = prev.length;
      loop: while (--i >= 0) {
        switch (prev[i].type) {
          case "doc-start":
          case "explicit-key-ind":
          case "map-value-ind":
          case "seq-item-ind":
          case "newline":
            break loop;
        }
      }
      while (prev[++i]?.type === "space") {
      }
      return prev.splice(i, prev.length);
    }
    function arrayPushArray(target, source) {
      if (source.length < 1e5)
        Array.prototype.push.apply(target, source);
      else
        for (let i = 0; i < source.length; ++i)
          target.push(source[i]);
    }
    function fixFlowSeqItems(fc) {
      if (fc.start.type === "flow-seq-start") {
        for (const it of fc.items) {
          if (it.sep && !it.value && !includesToken(it.start, "explicit-key-ind") && !includesToken(it.sep, "map-value-ind")) {
            if (it.key)
              it.value = it.key;
            delete it.key;
            if (isFlowToken(it.value)) {
              if (it.value.end)
                arrayPushArray(it.value.end, it.sep);
              else
                it.value.end = it.sep;
            } else
              arrayPushArray(it.start, it.sep);
            delete it.sep;
          }
        }
      }
    }
    var Parser = class {
      /**
       * @param onNewLine - If defined, called separately with the start position of
       *   each new line (in `parse()`, including the start of input).
       */
      constructor(onNewLine) {
        this.atNewLine = true;
        this.atScalar = false;
        this.indent = 0;
        this.offset = 0;
        this.onKeyLine = false;
        this.stack = [];
        this.source = "";
        this.type = "";
        this.lexer = new lexer.Lexer();
        this.onNewLine = onNewLine;
      }
      /**
       * Parse `source` as a YAML stream.
       * If `incomplete`, a part of the last line may be left as a buffer for the next call.
       *
       * Errors are not thrown, but yielded as `{ type: 'error', message }` tokens.
       *
       * @returns A generator of tokens representing each directive, document, and other structure.
       */
      *parse(source, incomplete = false) {
        if (this.onNewLine && this.offset === 0)
          this.onNewLine(0);
        for (const lexeme of this.lexer.lex(source, incomplete))
          yield* this.next(lexeme);
        if (!incomplete)
          yield* this.end();
      }
      /**
       * Advance the parser by the `source` of one lexical token.
       */
      *next(source) {
        this.source = source;
        if (node_process.env.LOG_TOKENS)
          console.log("|", cst.prettyToken(source));
        if (this.atScalar) {
          this.atScalar = false;
          yield* this.step();
          this.offset += source.length;
          return;
        }
        const type = cst.tokenType(source);
        if (!type) {
          const message = `Not a YAML token: ${source}`;
          yield* this.pop({ type: "error", offset: this.offset, message, source });
          this.offset += source.length;
        } else if (type === "scalar") {
          this.atNewLine = false;
          this.atScalar = true;
          this.type = "scalar";
        } else {
          this.type = type;
          yield* this.step();
          switch (type) {
            case "newline":
              this.atNewLine = true;
              this.indent = 0;
              if (this.onNewLine)
                this.onNewLine(this.offset + source.length);
              break;
            case "space":
              if (this.atNewLine && source[0] === " ")
                this.indent += source.length;
              break;
            case "explicit-key-ind":
            case "map-value-ind":
            case "seq-item-ind":
              if (this.atNewLine)
                this.indent += source.length;
              break;
            case "doc-mode":
            case "flow-error-end":
              return;
            default:
              this.atNewLine = false;
          }
          this.offset += source.length;
        }
      }
      /** Call at end of input to push out any remaining constructions */
      *end() {
        while (this.stack.length > 0)
          yield* this.pop();
      }
      get sourceToken() {
        const st = {
          type: this.type,
          offset: this.offset,
          indent: this.indent,
          source: this.source
        };
        return st;
      }
      *step() {
        const top = this.peek(1);
        if (this.type === "doc-end" && top?.type !== "doc-end") {
          while (this.stack.length > 0)
            yield* this.pop();
          this.stack.push({
            type: "doc-end",
            offset: this.offset,
            source: this.source
          });
          return;
        }
        if (!top)
          return yield* this.stream();
        switch (top.type) {
          case "document":
            return yield* this.document(top);
          case "alias":
          case "scalar":
          case "single-quoted-scalar":
          case "double-quoted-scalar":
            return yield* this.scalar(top);
          case "block-scalar":
            return yield* this.blockScalar(top);
          case "block-map":
            return yield* this.blockMap(top);
          case "block-seq":
            return yield* this.blockSequence(top);
          case "flow-collection":
            return yield* this.flowCollection(top);
          case "doc-end":
            return yield* this.documentEnd(top);
        }
        yield* this.pop();
      }
      peek(n2) {
        return this.stack[this.stack.length - n2];
      }
      *pop(error) {
        const token = error ?? this.stack.pop();
        if (!token) {
          const message = "Tried to pop an empty stack";
          yield { type: "error", offset: this.offset, source: "", message };
        } else if (this.stack.length === 0) {
          yield token;
        } else {
          const top = this.peek(1);
          if (token.type === "block-scalar") {
            token.indent = "indent" in top ? top.indent : 0;
          } else if (token.type === "flow-collection" && top.type === "document") {
            token.indent = 0;
          }
          if (token.type === "flow-collection")
            fixFlowSeqItems(token);
          switch (top.type) {
            case "document":
              top.value = token;
              break;
            case "block-scalar":
              top.props.push(token);
              break;
            case "block-map": {
              const it = top.items[top.items.length - 1];
              if (it.value) {
                top.items.push({ start: [], key: token, sep: [] });
                this.onKeyLine = true;
                return;
              } else if (it.sep) {
                it.value = token;
              } else {
                Object.assign(it, { key: token, sep: [] });
                this.onKeyLine = !it.explicitKey;
                return;
              }
              break;
            }
            case "block-seq": {
              const it = top.items[top.items.length - 1];
              if (it.value)
                top.items.push({ start: [], value: token });
              else
                it.value = token;
              break;
            }
            case "flow-collection": {
              const it = top.items[top.items.length - 1];
              if (!it || it.value)
                top.items.push({ start: [], key: token, sep: [] });
              else if (it.sep)
                it.value = token;
              else
                Object.assign(it, { key: token, sep: [] });
              return;
            }
            /* istanbul ignore next should not happen */
            default:
              yield* this.pop();
              yield* this.pop(token);
          }
          if ((top.type === "document" || top.type === "block-map" || top.type === "block-seq") && (token.type === "block-map" || token.type === "block-seq")) {
            const last = token.items[token.items.length - 1];
            if (last && !last.sep && !last.value && last.start.length > 0 && findNonEmptyIndex(last.start) === -1 && (token.indent === 0 || last.start.every((st) => st.type !== "comment" || st.indent < token.indent))) {
              if (top.type === "document")
                top.end = last.start;
              else
                top.items.push({ start: last.start });
              token.items.splice(-1, 1);
            }
          }
        }
      }
      *stream() {
        switch (this.type) {
          case "directive-line":
            yield { type: "directive", offset: this.offset, source: this.source };
            return;
          case "byte-order-mark":
          case "space":
          case "comment":
          case "newline":
            yield this.sourceToken;
            return;
          case "doc-mode":
          case "doc-start": {
            const doc = {
              type: "document",
              offset: this.offset,
              start: []
            };
            if (this.type === "doc-start")
              doc.start.push(this.sourceToken);
            this.stack.push(doc);
            return;
          }
        }
        yield {
          type: "error",
          offset: this.offset,
          message: `Unexpected ${this.type} token in YAML stream`,
          source: this.source
        };
      }
      *document(doc) {
        if (doc.value)
          return yield* this.lineEnd(doc);
        switch (this.type) {
          case "doc-start": {
            if (findNonEmptyIndex(doc.start) !== -1) {
              yield* this.pop();
              yield* this.step();
            } else
              doc.start.push(this.sourceToken);
            return;
          }
          case "anchor":
          case "tag":
          case "space":
          case "comment":
          case "newline":
            doc.start.push(this.sourceToken);
            return;
        }
        const bv = this.startBlockValue(doc);
        if (bv)
          this.stack.push(bv);
        else {
          yield {
            type: "error",
            offset: this.offset,
            message: `Unexpected ${this.type} token in YAML document`,
            source: this.source
          };
        }
      }
      *scalar(scalar2) {
        if (this.type === "map-value-ind") {
          const prev = getPrevProps(this.peek(2));
          const start2 = getFirstKeyStartProps(prev);
          let sep2;
          if (scalar2.end) {
            sep2 = scalar2.end;
            sep2.push(this.sourceToken);
            delete scalar2.end;
          } else
            sep2 = [this.sourceToken];
          const map = {
            type: "block-map",
            offset: scalar2.offset,
            indent: scalar2.indent,
            items: [{ start: start2, key: scalar2, sep: sep2 }]
          };
          this.onKeyLine = true;
          this.stack[this.stack.length - 1] = map;
        } else
          yield* this.lineEnd(scalar2);
      }
      *blockScalar(scalar2) {
        switch (this.type) {
          case "space":
          case "comment":
          case "newline":
            scalar2.props.push(this.sourceToken);
            return;
          case "scalar":
            scalar2.source = this.source;
            this.atNewLine = true;
            this.indent = 0;
            if (this.onNewLine) {
              let nl = this.source.indexOf("\n") + 1;
              while (nl !== 0) {
                this.onNewLine(this.offset + nl);
                nl = this.source.indexOf("\n", nl) + 1;
              }
            }
            yield* this.pop();
            break;
          /* istanbul ignore next should not happen */
          default:
            yield* this.pop();
            yield* this.step();
        }
      }
      *blockMap(map) {
        const it = map.items[map.items.length - 1];
        switch (this.type) {
          case "newline":
            this.onKeyLine = false;
            if (it.value) {
              const end = "end" in it.value ? it.value.end : void 0;
              const last = Array.isArray(end) ? end[end.length - 1] : void 0;
              if (last?.type === "comment")
                end?.push(this.sourceToken);
              else
                map.items.push({ start: [this.sourceToken] });
            } else if (it.sep) {
              it.sep.push(this.sourceToken);
            } else {
              it.start.push(this.sourceToken);
            }
            return;
          case "space":
          case "comment":
            if (it.value) {
              map.items.push({ start: [this.sourceToken] });
            } else if (it.sep) {
              it.sep.push(this.sourceToken);
            } else {
              if (this.atIndentedComment(it.start, map.indent)) {
                const prev = map.items[map.items.length - 2];
                const end = prev?.value?.end;
                if (Array.isArray(end)) {
                  arrayPushArray(end, it.start);
                  end.push(this.sourceToken);
                  map.items.pop();
                  return;
                }
              }
              it.start.push(this.sourceToken);
            }
            return;
        }
        if (this.indent >= map.indent) {
          const atMapIndent = !this.onKeyLine && this.indent === map.indent;
          const atNextItem = atMapIndent && (it.sep || it.explicitKey) && this.type !== "seq-item-ind";
          let start2 = [];
          if (atNextItem && it.sep && !it.value) {
            const nl = [];
            for (let i = 0; i < it.sep.length; ++i) {
              const st = it.sep[i];
              switch (st.type) {
                case "newline":
                  nl.push(i);
                  break;
                case "space":
                  break;
                case "comment":
                  if (st.indent > map.indent)
                    nl.length = 0;
                  break;
                default:
                  nl.length = 0;
              }
            }
            if (nl.length >= 2)
              start2 = it.sep.splice(nl[1]);
          }
          switch (this.type) {
            case "anchor":
            case "tag":
              if (atNextItem || it.value) {
                start2.push(this.sourceToken);
                map.items.push({ start: start2 });
                this.onKeyLine = true;
              } else if (it.sep) {
                it.sep.push(this.sourceToken);
              } else {
                it.start.push(this.sourceToken);
              }
              return;
            case "explicit-key-ind":
              if (!it.sep && !it.explicitKey) {
                it.start.push(this.sourceToken);
                it.explicitKey = true;
              } else if (atNextItem || it.value) {
                start2.push(this.sourceToken);
                map.items.push({ start: start2, explicitKey: true });
              } else {
                this.stack.push({
                  type: "block-map",
                  offset: this.offset,
                  indent: this.indent,
                  items: [{ start: [this.sourceToken], explicitKey: true }]
                });
              }
              this.onKeyLine = true;
              return;
            case "map-value-ind":
              if (it.explicitKey) {
                if (!it.sep) {
                  if (includesToken(it.start, "newline")) {
                    Object.assign(it, { key: null, sep: [this.sourceToken] });
                  } else {
                    const start3 = getFirstKeyStartProps(it.start);
                    this.stack.push({
                      type: "block-map",
                      offset: this.offset,
                      indent: this.indent,
                      items: [{ start: start3, key: null, sep: [this.sourceToken] }]
                    });
                  }
                } else if (it.value) {
                  map.items.push({ start: [], key: null, sep: [this.sourceToken] });
                } else if (includesToken(it.sep, "map-value-ind")) {
                  this.stack.push({
                    type: "block-map",
                    offset: this.offset,
                    indent: this.indent,
                    items: [{ start: start2, key: null, sep: [this.sourceToken] }]
                  });
                } else if (isFlowToken(it.key) && !includesToken(it.sep, "newline")) {
                  const start3 = getFirstKeyStartProps(it.start);
                  const key = it.key;
                  const sep2 = it.sep;
                  sep2.push(this.sourceToken);
                  delete it.key;
                  delete it.sep;
                  this.stack.push({
                    type: "block-map",
                    offset: this.offset,
                    indent: this.indent,
                    items: [{ start: start3, key, sep: sep2 }]
                  });
                } else if (start2.length > 0) {
                  it.sep = it.sep.concat(start2, this.sourceToken);
                } else {
                  it.sep.push(this.sourceToken);
                }
              } else {
                if (!it.sep) {
                  Object.assign(it, { key: null, sep: [this.sourceToken] });
                } else if (it.value || atNextItem) {
                  map.items.push({ start: start2, key: null, sep: [this.sourceToken] });
                } else if (includesToken(it.sep, "map-value-ind")) {
                  this.stack.push({
                    type: "block-map",
                    offset: this.offset,
                    indent: this.indent,
                    items: [{ start: [], key: null, sep: [this.sourceToken] }]
                  });
                } else {
                  it.sep.push(this.sourceToken);
                }
              }
              this.onKeyLine = true;
              return;
            case "alias":
            case "scalar":
            case "single-quoted-scalar":
            case "double-quoted-scalar": {
              const fs = this.flowScalar(this.type);
              if (atNextItem || it.value) {
                map.items.push({ start: start2, key: fs, sep: [] });
                this.onKeyLine = true;
              } else if (it.sep) {
                this.stack.push(fs);
              } else {
                Object.assign(it, { key: fs, sep: [] });
                this.onKeyLine = true;
              }
              return;
            }
            default: {
              const bv = this.startBlockValue(map);
              if (bv) {
                if (bv.type === "block-seq") {
                  if (!it.explicitKey && it.sep && !includesToken(it.sep, "newline")) {
                    yield* this.pop({
                      type: "error",
                      offset: this.offset,
                      message: "Unexpected block-seq-ind on same line with key",
                      source: this.source
                    });
                    return;
                  }
                } else if (atMapIndent) {
                  map.items.push({ start: start2 });
                }
                this.stack.push(bv);
                return;
              }
            }
          }
        }
        yield* this.pop();
        yield* this.step();
      }
      *blockSequence(seq) {
        const it = seq.items[seq.items.length - 1];
        switch (this.type) {
          case "newline":
            if (it.value) {
              const end = "end" in it.value ? it.value.end : void 0;
              const last = Array.isArray(end) ? end[end.length - 1] : void 0;
              if (last?.type === "comment")
                end?.push(this.sourceToken);
              else
                seq.items.push({ start: [this.sourceToken] });
            } else
              it.start.push(this.sourceToken);
            return;
          case "space":
          case "comment":
            if (it.value)
              seq.items.push({ start: [this.sourceToken] });
            else {
              if (this.atIndentedComment(it.start, seq.indent)) {
                const prev = seq.items[seq.items.length - 2];
                const end = prev?.value?.end;
                if (Array.isArray(end)) {
                  arrayPushArray(end, it.start);
                  end.push(this.sourceToken);
                  seq.items.pop();
                  return;
                }
              }
              it.start.push(this.sourceToken);
            }
            return;
          case "anchor":
          case "tag":
            if (it.value || this.indent <= seq.indent)
              break;
            it.start.push(this.sourceToken);
            return;
          case "seq-item-ind":
            if (this.indent !== seq.indent)
              break;
            if (it.value || includesToken(it.start, "seq-item-ind"))
              seq.items.push({ start: [this.sourceToken] });
            else
              it.start.push(this.sourceToken);
            return;
        }
        if (this.indent > seq.indent) {
          const bv = this.startBlockValue(seq);
          if (bv) {
            this.stack.push(bv);
            return;
          }
        }
        yield* this.pop();
        yield* this.step();
      }
      *flowCollection(fc) {
        const it = fc.items[fc.items.length - 1];
        if (this.type === "flow-error-end") {
          let top;
          do {
            yield* this.pop();
            top = this.peek(1);
          } while (top?.type === "flow-collection");
        } else if (fc.end.length === 0) {
          switch (this.type) {
            case "comma":
            case "explicit-key-ind":
              if (!it || it.sep)
                fc.items.push({ start: [this.sourceToken] });
              else
                it.start.push(this.sourceToken);
              return;
            case "map-value-ind":
              if (!it || it.value)
                fc.items.push({ start: [], key: null, sep: [this.sourceToken] });
              else if (it.sep)
                it.sep.push(this.sourceToken);
              else
                Object.assign(it, { key: null, sep: [this.sourceToken] });
              return;
            case "space":
            case "comment":
            case "newline":
            case "anchor":
            case "tag":
              if (!it || it.value)
                fc.items.push({ start: [this.sourceToken] });
              else if (it.sep)
                it.sep.push(this.sourceToken);
              else
                it.start.push(this.sourceToken);
              return;
            case "alias":
            case "scalar":
            case "single-quoted-scalar":
            case "double-quoted-scalar": {
              const fs = this.flowScalar(this.type);
              if (!it || it.value)
                fc.items.push({ start: [], key: fs, sep: [] });
              else if (it.sep)
                this.stack.push(fs);
              else
                Object.assign(it, { key: fs, sep: [] });
              return;
            }
            case "flow-map-end":
            case "flow-seq-end":
              fc.end.push(this.sourceToken);
              return;
          }
          const bv = this.startBlockValue(fc);
          if (bv)
            this.stack.push(bv);
          else {
            yield* this.pop();
            yield* this.step();
          }
        } else {
          const parent = this.peek(2);
          if (parent.type === "block-map" && (this.type === "map-value-ind" && parent.indent === fc.indent || this.type === "newline" && !parent.items[parent.items.length - 1].sep)) {
            yield* this.pop();
            yield* this.step();
          } else if (this.type === "map-value-ind" && parent.type !== "flow-collection") {
            const prev = getPrevProps(parent);
            const start2 = getFirstKeyStartProps(prev);
            fixFlowSeqItems(fc);
            const sep2 = fc.end.splice(1, fc.end.length);
            sep2.push(this.sourceToken);
            const map = {
              type: "block-map",
              offset: fc.offset,
              indent: fc.indent,
              items: [{ start: start2, key: fc, sep: sep2 }]
            };
            this.onKeyLine = true;
            this.stack[this.stack.length - 1] = map;
          } else {
            yield* this.lineEnd(fc);
          }
        }
      }
      flowScalar(type) {
        if (this.onNewLine) {
          let nl = this.source.indexOf("\n") + 1;
          while (nl !== 0) {
            this.onNewLine(this.offset + nl);
            nl = this.source.indexOf("\n", nl) + 1;
          }
        }
        return {
          type,
          offset: this.offset,
          indent: this.indent,
          source: this.source
        };
      }
      startBlockValue(parent) {
        switch (this.type) {
          case "alias":
          case "scalar":
          case "single-quoted-scalar":
          case "double-quoted-scalar":
            return this.flowScalar(this.type);
          case "block-scalar-header":
            return {
              type: "block-scalar",
              offset: this.offset,
              indent: this.indent,
              props: [this.sourceToken],
              source: ""
            };
          case "flow-map-start":
          case "flow-seq-start":
            return {
              type: "flow-collection",
              offset: this.offset,
              indent: this.indent,
              start: this.sourceToken,
              items: [],
              end: []
            };
          case "seq-item-ind":
            return {
              type: "block-seq",
              offset: this.offset,
              indent: this.indent,
              items: [{ start: [this.sourceToken] }]
            };
          case "explicit-key-ind": {
            this.onKeyLine = true;
            const prev = getPrevProps(parent);
            const start2 = getFirstKeyStartProps(prev);
            start2.push(this.sourceToken);
            return {
              type: "block-map",
              offset: this.offset,
              indent: this.indent,
              items: [{ start: start2, explicitKey: true }]
            };
          }
          case "map-value-ind": {
            this.onKeyLine = true;
            const prev = getPrevProps(parent);
            const start2 = getFirstKeyStartProps(prev);
            return {
              type: "block-map",
              offset: this.offset,
              indent: this.indent,
              items: [{ start: start2, key: null, sep: [this.sourceToken] }]
            };
          }
        }
        return null;
      }
      atIndentedComment(start2, indent) {
        if (this.type !== "comment")
          return false;
        if (this.indent <= indent)
          return false;
        return start2.every((st) => st.type === "newline" || st.type === "space");
      }
      *documentEnd(docEnd) {
        if (this.type !== "doc-mode") {
          if (docEnd.end)
            docEnd.end.push(this.sourceToken);
          else
            docEnd.end = [this.sourceToken];
          if (this.type === "newline")
            yield* this.pop();
        }
      }
      *lineEnd(token) {
        switch (this.type) {
          case "comma":
          case "doc-start":
          case "doc-end":
          case "flow-seq-end":
          case "flow-map-end":
          case "map-value-ind":
            yield* this.pop();
            yield* this.step();
            break;
          case "newline":
            this.onKeyLine = false;
          // fallthrough
          case "space":
          case "comment":
          default:
            if (token.end)
              token.end.push(this.sourceToken);
            else
              token.end = [this.sourceToken];
            if (this.type === "newline")
              yield* this.pop();
        }
      }
    };
    exports.Parser = Parser;
  }
});

// node_modules/yaml/dist/public-api.js
var require_public_api = __commonJS({
  "node_modules/yaml/dist/public-api.js"(exports) {
    "use strict";
    var composer = require_composer();
    var Document = require_Document();
    var errors = require_errors();
    var log2 = require_log();
    var identity2 = require_identity();
    var lineCounter = require_line_counter();
    var parser = require_parser();
    function parseOptions(options) {
      const prettyErrors = options.prettyErrors !== false;
      const lineCounter$1 = options.lineCounter || prettyErrors && new lineCounter.LineCounter() || null;
      return { lineCounter: lineCounter$1, prettyErrors };
    }
    function parseAllDocuments(source, options = {}) {
      const { lineCounter: lineCounter2, prettyErrors } = parseOptions(options);
      const parser$1 = new parser.Parser(lineCounter2?.addNewLine);
      const composer$1 = new composer.Composer(options);
      const docs = Array.from(composer$1.compose(parser$1.parse(source)));
      if (prettyErrors && lineCounter2)
        for (const doc of docs) {
          doc.errors.forEach(errors.prettifyError(source, lineCounter2));
          doc.warnings.forEach(errors.prettifyError(source, lineCounter2));
        }
      if (docs.length > 0)
        return docs;
      return Object.assign([], { empty: true }, composer$1.streamInfo());
    }
    function parseDocument(source, options = {}) {
      const { lineCounter: lineCounter2, prettyErrors } = parseOptions(options);
      const parser$1 = new parser.Parser(lineCounter2?.addNewLine);
      const composer$1 = new composer.Composer(options);
      let doc = null;
      for (const _doc of composer$1.compose(parser$1.parse(source), true, source.length)) {
        if (!doc)
          doc = _doc;
        else if (doc.options.logLevel !== "silent") {
          doc.errors.push(new errors.YAMLParseError(_doc.range.slice(0, 2), "MULTIPLE_DOCS", "Source contains multiple documents; please use YAML.parseAllDocuments()"));
          break;
        }
      }
      if (prettyErrors && lineCounter2) {
        doc.errors.forEach(errors.prettifyError(source, lineCounter2));
        doc.warnings.forEach(errors.prettifyError(source, lineCounter2));
      }
      return doc;
    }
    function parse9(src, reviver, options) {
      let _reviver = void 0;
      if (typeof reviver === "function") {
        _reviver = reviver;
      } else if (options === void 0 && reviver && typeof reviver === "object") {
        options = reviver;
      }
      const doc = parseDocument(src, options);
      if (!doc)
        return null;
      doc.warnings.forEach((warning) => log2.warn(doc.options.logLevel, warning));
      if (doc.errors.length > 0) {
        if (doc.options.logLevel !== "silent")
          throw doc.errors[0];
        else
          doc.errors = [];
      }
      return doc.toJS(Object.assign({ reviver: _reviver }, options));
    }
    function stringify2(value, replacer, options) {
      let _replacer = null;
      if (typeof replacer === "function" || Array.isArray(replacer)) {
        _replacer = replacer;
      } else if (options === void 0 && replacer) {
        options = replacer;
      }
      if (typeof options === "string")
        options = options.length;
      if (typeof options === "number") {
        const indent = Math.round(options);
        options = indent < 1 ? void 0 : indent > 8 ? { indent: 8 } : { indent };
      }
      if (value === void 0) {
        const { keepUndefined } = options ?? replacer ?? {};
        if (!keepUndefined)
          return void 0;
      }
      if (identity2.isDocument(value) && !_replacer)
        return value.toString(options);
      return new Document.Document(value, _replacer, options).toString(options);
    }
    exports.parse = parse9;
    exports.parseAllDocuments = parseAllDocuments;
    exports.parseDocument = parseDocument;
    exports.stringify = stringify2;
  }
});

// node_modules/yaml/dist/index.js
var require_dist = __commonJS({
  "node_modules/yaml/dist/index.js"(exports) {
    "use strict";
    var composer = require_composer();
    var Document = require_Document();
    var Schema = require_Schema();
    var errors = require_errors();
    var Alias = require_Alias();
    var identity2 = require_identity();
    var Pair = require_Pair();
    var Scalar = require_Scalar();
    var YAMLMap = require_YAMLMap();
    var YAMLSeq = require_YAMLSeq();
    var cst = require_cst();
    var lexer = require_lexer();
    var lineCounter = require_line_counter();
    var parser = require_parser();
    var publicApi = require_public_api();
    var visit = require_visit();
    exports.Composer = composer.Composer;
    exports.Document = Document.Document;
    exports.Schema = Schema.Schema;
    exports.YAMLError = errors.YAMLError;
    exports.YAMLParseError = errors.YAMLParseError;
    exports.YAMLWarning = errors.YAMLWarning;
    exports.Alias = Alias.Alias;
    exports.isAlias = identity2.isAlias;
    exports.isCollection = identity2.isCollection;
    exports.isDocument = identity2.isDocument;
    exports.isMap = identity2.isMap;
    exports.isNode = identity2.isNode;
    exports.isPair = identity2.isPair;
    exports.isScalar = identity2.isScalar;
    exports.isSeq = identity2.isSeq;
    exports.Pair = Pair.Pair;
    exports.Scalar = Scalar.Scalar;
    exports.YAMLMap = YAMLMap.YAMLMap;
    exports.YAMLSeq = YAMLSeq.YAMLSeq;
    exports.CST = cst;
    exports.Lexer = lexer.Lexer;
    exports.LineCounter = lineCounter.LineCounter;
    exports.Parser = parser.Parser;
    exports.parse = publicApi.parse;
    exports.parseAllDocuments = publicApi.parseAllDocuments;
    exports.parseDocument = publicApi.parseDocument;
    exports.stringify = publicApi.stringify;
    exports.visit = visit.visit;
    exports.visitAsync = visit.visitAsync;
  }
});

// src/hub/cli.ts
import { parseArgs } from "node:util";

// src/hub/commands/work/planning.ts
import { readFileSync as readFileSync9 } from "node:fs";
import { join as join16, resolve as resolve7 } from "node:path";

// src/hub/core/git.ts
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

// src/shared/secrets.ts
var SECRET_PATTERNS = {
  "AWS access key": /\b(AKIA|ASIA)[0-9A-Z]{16}\b/,
  "private key": /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
  "GitHub token": /\b(gh[pousr]_[A-Za-z0-9]{36,}|github_pat_[A-Za-z0-9_]{60,})\b/,
  "Slack token": /\bxox[abprs]-[A-Za-z0-9-]{10,}\b/,
  "Anthropic API key": /\bsk-ant-[A-Za-z0-9_-]{20,}/,
  "OpenAI API key": /\bsk-(proj-)?[A-Za-z0-9_-]{32,}/,
  "Google API key": /\bAIza[0-9A-Za-z_-]{35}\b/,
  "Stripe live key": /\b(sk|rk)_live_[0-9A-Za-z]{20,}\b/,
  "HubSpot private app token": /\bpat-(na|eu)\d-[0-9a-f]{8}-[0-9a-f-]{27}\b/,
  "credentials in URL": /\b[a-z][a-z0-9+.-]*:\/\/[^/\s:@]+:[^/\s:@]{8,}@(?!localhost|127\.0\.0\.1|postgres|redis|db\b)/
};
var ALLOW_SECRET = "pk:allow-secret";

// src/hub/core/work/model.ts
var TEMPLATE_NAMES = [
  "idea.md",
  "goal.md",
  "plan.md",
  "item-feat.md",
  "item-bug.md",
  "item-chore.md",
  "item-spike.md"
];
var IDEA_ID = "IDEA";
var IDEA_FLOW = {
  exploring: ["researching", "killed"],
  researching: ["proposed", "exploring", "killed"],
  proposed: ["decided", "researching", "killed"],
  decided: ["proposed"],
  // a pivot reopens the decision
  killed: ["exploring"]
};
var PLAN_FLOW = {
  draft: ["ready", "dropped"],
  ready: ["in-progress", "draft", "dropped"],
  "in-progress": ["blocked", "in-review", "ready", "dropped"],
  blocked: ["in-progress", "dropped"],
  "in-review": ["in-progress", "done", "dropped"],
  done: [],
  dropped: ["draft"]
};
var GOAL_FLOW = {
  proposed: ["active", "dropped"],
  active: ["done", "proposed", "dropped"],
  done: ["active"],
  dropped: ["proposed"]
};
var ITEM_FLOW = {
  new: ["triaged", "wontfix", "duplicate"],
  triaged: ["new", "wontfix", "duplicate"],
  wontfix: ["new"],
  duplicate: ["new"]
};
var CLOSED = /* @__PURE__ */ new Set(["done", "dropped"]);
var ACTIVE = /* @__PURE__ */ new Set(["in-progress", "blocked", "in-review"]);
var ITEM_CLOSED = /* @__PURE__ */ new Set(["wontfix", "duplicate"]);
var PLAN_TO_ITEM = {
  draft: "planned",
  ready: "planned",
  "in-progress": "in-progress",
  blocked: "in-progress",
  "in-review": "in-progress",
  done: "done"
};
var KINDS = {
  G: "goal",
  P: "plan",
  FEAT: "item",
  BUG: "item",
  CHORE: "item",
  SPIKE: "item"
};
var DIRS = { goal: "goals", plan: "plans", item: "items" };
var FLOWS = { idea: IDEA_FLOW, goal: GOAL_FLOW, plan: PLAN_FLOW, item: ITEM_FLOW };
var ITEM_TYPES = { FEAT: "feat", BUG: "bug", CHORE: "chore", SPIKE: "spike" };
var ROLES = ["executive", "director", "pm", "architect", "developer", "qa", "release"];
var OFF_FOCUS_OK = /* @__PURE__ */ new Set(["BUG", "CHORE"]);
var TRIAGE_SECTIONS = {
  FEAT: ["Summary"],
  BUG: ["Steps to reproduce", "Expected", "Actual"],
  CHORE: ["Summary"],
  SPIKE: ["Question", "Timebox"]
};
var PRIORITIES = ["P0", "P1", "P2", "P3"];
var SEVERITY_PRIORITY = { S1: "P0", S2: "P1", S3: "P2", S4: "P3" };
var REQUIRED_ON_CREATE = {
  idea: ["Problem", "Outcome"],
  goal: ["Outcome", "Scope", "Acceptance criteria", "Breakdown"],
  plan: ["Context", "Scope", "Acceptance criteria"],
  item: []
};
var DECIDED_SECTIONS = ["Problem", "Outcome", "Success criteria"];
var READY_SECTIONS = ["Context", "Scope", "Acceptance criteria", "Test plan"];
var SECTION_ALIASES = { candidateplans: "breakdown" };
var DEFAULT_SETTINGS = { wip_limit: "1", max_tasks: "10", plan_worktrees: "false" };
var MAX_WRITTEN_AHEAD = 3;
var SLUG_STOPWORDS = /* @__PURE__ */ new Set(["a", "an", "and", "the", "of", "for", "to", "with", "in", "on", "or", "via", "by"]);
var TASK_RE = /^\s*- \[( |x|X)\]\s*(.*)$/;
var HUB_STATE_MARKER = "<!-- crew:hub-state -->";
var HUB_STATE_RULE = `${HUB_STATE_MARKER}
## Project state lives in the hub
Everything the next person or agent needs goes through \`.crew/bin/crew.mjs\`:
- where work stands \u2192 \`handoff\` and \`log\`;
- findings and follow-ups \u2192 \`new-item\`;
- what to know \u2192 \`learn\`;
- questions \u2192 \`ask\`.

Places outside the repo (side-session notes folders, the scratchpad, Claude's memory, \`/tmp\`) hold only pointers to hub IDs, never the facts. When other instructions say to leave notes elsewhere, write to the hub and leave a pointer there.
`;

// src/hub/core/text.ts
var HubError = class extends Error {
};
function fail(message) {
  throw new HubError(message);
}
function today() {
  if (process.env.HUB_TODAY) return process.env.HUB_TODAY;
  const d = /* @__PURE__ */ new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function pad(n2) {
  return String(n2).padStart(2, "0");
}
function idList(s2) {
  return (s2 ?? "").split(/[,\s]+/).map((x) => x.trim().toUpperCase()).filter(Boolean);
}
function kindOf(docId) {
  if (docId.toUpperCase() === IDEA_ID) return "idea";
  const m = /^([A-Z]+)-\d+$/.exec(docId.toUpperCase());
  return m && KINDS[m[1]] || null;
}
function norm(name) {
  const n2 = name.toLowerCase().replace(/[^a-z]/g, "");
  return SECTION_ALIASES[n2] ?? n2;
}
function slugify(title) {
  const words3 = title.toLowerCase().replace(/['’]/g, "").replace(/[^a-z0-9]+/g, "-").split("-").filter(Boolean);
  const out = [];
  for (const w of words3) {
    if ([...out, w].join("-").length > 40) break;
    out.push(w);
  }
  while (out.length < words3.length && out.length && SLUG_STOPWORDS.has(out[out.length - 1])) out.pop();
  return out.join("-") || "untitled";
}
function stripComments(text2) {
  return text2.replace(/<!--[\s\S]*?-->/g, "");
}
function firstParagraph(text2) {
  return stripComments(text2).trim().split(/\n\s*\n/)[0].split("\n").map((l) => l.trim()).join(" ");
}
function mdTable(text2) {
  const rows = stripComments(text2).split("\n").map((l) => l.trim()).filter((l) => l.startsWith("|"));
  if (rows.length < 2) return [];
  const cells = (row) => row.replace(/^\|+|\|+$/g, "").split("|").map((c) => c.trim());
  const head = cells(rows[0]).map((h) => h.toLowerCase());
  return rows.slice(2).filter((r) => cells(r).some(Boolean)).map((r) => {
    const c = cells(r);
    const row = {};
    head.forEach((h, i) => {
      if (i < c.length) row[h] = c[i];
    });
    return row;
  });
}
function rstrip(s2) {
  return s2.replace(/\s+$/, "");
}
function byKey(key) {
  return (a, b) => {
    const ka = key(a), kb = key(b);
    for (let i = 0; i < Math.min(ka.length, kb.length); i++) {
      const x = ka[i], y = kb[i];
      if (x === y) continue;
      return x < y ? -1 : 1;
    }
    return ka.length - kb.length;
  };
}

// src/hub/core/memory/knowledge.ts
var KNOWLEDGE_TYPES = ["decision", "learning", "gotcha", "convention", "risk"];
var TIERS = ["project", "playbook-candidate"];
var K_ID_RE = /\bK-\d{4}-\d{2}-\d{2}-[a-z0-9-]+\b/g;
var RISK_LEVELS = ["H", "M", "L"];
function secretsIn(text2, extra = []) {
  const lines = text2.split("\n").filter((l) => !l.includes(ALLOW_SECRET)).join("\n");
  const custom = Object.fromEntries(extra.flatMap((p, i) => {
    try {
      return [[`policy secrets.patterns[${i}]`, new RegExp(p)]];
    } catch {
      return [];
    }
  }));
  return Object.entries({ ...SECRET_PATTERNS, ...custom }).filter(([, re]) => re.test(lines)).map(([name]) => name);
}
function globRe(glob) {
  const g = glob.replace(/^\.\//, "").replace(/\/$/, "/**");
  let re = "";
  for (let i = 0; i < g.length; i++) {
    const c = g[i];
    if (c === "*" && g[i + 1] === "*") {
      re += g[i + 2] === "/" ? "(?:.*/)?" : ".*";
      i += g[i + 2] === "/" ? 2 : 1;
    } else if (c === "*") re += "[^/]*";
    else if (c === "?") re += "[^/]";
    else re += c.replace(/[.+^${}()|[\]\\]/g, "\\$&");
  }
  return new RegExp(`^${re}(?:/.*)?$`);
}
var stem = (glob) => glob.replace(/^\.\//, "").split(/[*?[]/)[0];
function globsOverlap(a, b) {
  const [x, y] = [stem(a), stem(b)];
  return x.startsWith(y) || y.startsWith(x) || globRe(a).test(stem(b)) || globRe(b).test(stem(a));
}
function toEntry(doc, origin) {
  return {
    doc,
    id: doc.id,
    type: doc.get("type") ?? "",
    title: doc.get("title") ?? "",
    origin,
    scope: (doc.get("scope") ?? "").split(",").map((s2) => s2.trim()).filter(Boolean),
    tier: doc.get("tier") || "project",
    source: doc.get("source") ?? "",
    supersedes: (doc.get("supersedes") || "").trim() || null,
    supersededBy: null
  };
}
function linkSupersession(entries) {
  const by = new Map(entries.map((e) => [e.id, e]));
  for (const e of entries) if (e.supersedes && by.has(e.supersedes)) by.get(e.supersedes).supersededBy = e.id;
  return entries;
}
function recall(entries, q) {
  const words3 = (q.topic ?? "").toLowerCase().split(/\s+/).filter(Boolean);
  return entries.filter((e) => {
    if (!q.all && e.supersededBy) return false;
    if (q.type && e.type !== q.type) return false;
    if (words3.length) {
      const text2 = `${e.title}
${stripComments(e.doc.text)}`.toLowerCase();
      if (!words3.every((w) => text2.includes(w))) return false;
    }
    if (!q.paths?.length && !q.globs?.length) return true;
    if (!e.scope.length) return true;
    return e.scope.some((s2) => (q.paths ?? []).some((p) => globRe(s2).test(p)) || (q.globs ?? []).some((g) => globsOverlap(s2, g)));
  });
}
function entryText(f) {
  const risk = f.type === "risk" ? `likelihood: ${f.risk?.likelihood ?? ""}
impact: ${f.risk?.impact ?? ""}
owner: ${f.risk?.owner ?? ""}
` : "";
  return `---
id: ${f.id}
type: ${f.type}
title: ${f.title}
scope: ${f.scope.join(", ")}
source: ${f.source}
` + `supersedes: ${f.supersedes}
tier: ${f.tier}
${risk}created: ${today()}
---

# ${f.title}

${f.why.trim()}
`.replace(/: \n/g, ":\n");
}
function knowledgeId(title, taken) {
  const base2 = `K-${today()}-${slugify(title).slice(0, 40).replace(/-+$/, "")}`;
  let id = base2, n2 = 2;
  while (taken(id)) id = `${base2}-${n2++}`;
  return id;
}

// src/hub/core/git.ts
var ROOT = null;
function useRoot(root) {
  ROOT = root;
}
function git(args, check2 = false) {
  const r = spawnSync("git", ROOT && args[0] !== "-C" ? ["-C", ROOT, ...args] : args, { encoding: "utf8" });
  if (r.status !== 0) {
    if (check2) fail(`git ${args.join(" ")} failed: ${(r.stderr ?? "").trim()}`);
    return null;
  }
  return r.stdout;
}
function repoRoot() {
  return git(["rev-parse", "--show-toplevel"])?.trim() || process.cwd();
}
function commonDir(root) {
  const out = git(["-C", root, "rev-parse", "--git-common-dir"])?.trim();
  return out ? resolve(root, out) : null;
}
function userName() {
  return /^(.*?) </.exec(git(["var", "GIT_AUTHOR_IDENT"]) ?? "")?.[1].trim() || null;
}
function files(root) {
  return words(git(["-C", root, "ls-files", "--cached", "--others", "--exclude-standard"]));
}
function currentBranch() {
  return git(["branch", "--show-current"])?.trim() || null;
}
function worktrees() {
  const out = [];
  for (const line3 of (git(["worktree", "list", "--porcelain"]) ?? "").split("\n")) {
    if (line3.startsWith("worktree ")) out.push({ path: line3.slice(9), branch: null });
    else if (line3.startsWith("branch ") && out.length) out.at(-1).branch = line3.slice(7).replace(/^refs\/heads\//, "");
  }
  return out;
}
function changed(dir, paths) {
  return (git(["-C", dir, "status", "--porcelain", "-z", "--untracked-files=all", "--no-renames", "--", ...paths]) ?? "").split("\0").filter((l) => l.length > 3).map((l) => l.slice(3));
}
function dirty(dir, path) {
  return (git(["-C", dir, "status", "--porcelain", "--untracked-files=all", "--no-renames", "--", path]) ?? "").split("\n").filter((l) => l.length > 3 && !l.slice(0, 2).includes("D")).map((l) => l.slice(3));
}
function squashMerge(branch, base2, pid) {
  const fork = git(["merge-base", branch, base2])?.trim();
  const changed2 = fork ? (git(["diff", "--name-only", "-z", fork, branch]) ?? "").split("\0").filter(Boolean) : [];
  if (!changed2.length) return null;
  const names = new RegExp(`^(\\w+\\(${pid}\\)|${pid}):`);
  for (const line3 of (git(["log", "--format=%H %s", `${fork}..${base2}`]) ?? "").split("\n")) {
    const [sha, subject] = [line3.slice(0, line3.indexOf(" ")), line3.slice(line3.indexOf(" ") + 1)];
    if (sha && names.test(subject) && mergesToItself(sha, branch, changed2)) return sha;
  }
  return null;
}
function mergesToItself(sha, branch, changed2) {
  const r = spawnSync("git", [...ROOT ? ["-C", ROOT] : [], "merge-tree", "--write-tree", sha, branch], { encoding: "utf8" });
  if (r.status === 0) return r.stdout.split("\n")[0].trim() === git(["rev-parse", `${sha}^{tree}`])?.trim();
  if (r.status === 1) return false;
  return git(["--literal-pathspecs", "diff", "--quiet", branch, sha, "--", ...changed2]) !== null;
}
function generated(dir, files2) {
  const out = /* @__PURE__ */ new Set();
  if (!files2.length) return out;
  const attrs = (git(["-C", dir, "check-attr", "-z", "linguist-generated", "--", ...files2]) ?? "").split("\0");
  for (let i = 0; i + 2 < attrs.length; i += 3) if (attrs[i + 2] === "true" || attrs[i + 2] === "set") out.add(attrs[i]);
  return out;
}
var NOT_CODE = /^\.crew\/((plans|items|goals|knowledge|drafts|view)\/|idea\.md$)/;
function codeChanges(dir, secretGlobs) {
  const secret = secretGlobs.map(globRe);
  const files2 = changed(dir, ["."]).filter((f) => !NOT_CODE.test(f) && !secret.some((re) => re.test(f)));
  const gen = generated(dir, files2);
  return files2.filter((f) => !gen.has(f));
}
function planBranches() {
  return words(git(["for-each-ref", "--format=%(refname:short)", "refs/heads/plan/", "refs/remotes/origin/plan/"]));
}
function allRefs() {
  return words(git(["for-each-ref", "--format=%(refname:short)", "refs/heads/", "refs/remotes/"]));
}
function lsTree(ref, path) {
  return words(git(["ls-tree", "--name-only", ref, path]));
}
function show(ref, path) {
  return git(["show", `${ref}:${path}`]);
}
function treeIsClean(except) {
  return !(git(["status", "--porcelain", ...except ? ["--", ".", `:(exclude)${except}`] : []]) ?? "").trim();
}
function words(out) {
  return (out ?? "").split(/\s+/).filter(Boolean);
}

// src/hub/core/work/hubstate.ts
import { spawnSync as spawnSync2 } from "node:child_process";
import { existsSync as existsSync2, mkdirSync as mkdirSync2, realpathSync } from "node:fs";
import { join as join2 } from "node:path";

// src/hub/core/memory/ledger.ts
import { createHash, randomBytes } from "node:crypto";
import { appendFileSync, existsSync, linkSync, mkdirSync, readFileSync, renameSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
var UNATTRIBUTED = "unattributed";
var COUNTED = ["tokens_in", "tokens_out", "cost", "cache_read"];
function countedUsage(events) {
  const last = /* @__PURE__ */ new Map();
  const out = [];
  for (const ev of events) {
    if (ev.type !== "usage") continue;
    const n2 = (e, k) => Number(e[k]) || 0;
    const prev = ev.source === "transcript" ? last.get(ev.run) : void 0;
    const fresh = !prev || ["tokens_in", "tokens_out", "cache_read"].some((k) => n2(ev, k) < n2(prev, k));
    const counted = { ...ev };
    for (const k of COUNTED) counted[k] = n2(ev, k) - (fresh ? 0 : n2(prev, k));
    if (ev.source === "transcript") last.set(ev.run, ev);
    out.push(counted);
  }
  return out;
}
var LOCK_WAIT_MS = 5e3;
var LOCK_STALE_MS = 3e4;
function whoAmI(root) {
  const hash = createHash("sha1").update(root).digest("hex").slice(0, 8);
  return {
    run: process.env.CREW_RUN || `wt:${basename(root)}-${hash}`,
    actor: process.env.CREW_ACTOR || userName() || "unknown",
    role: process.env.CREW_ROLE || null,
    team: process.env.CREW_TEAM || null,
    worktree: root
  };
}
var Ledger = class _Ledger {
  constructor(ws, path, who) {
    this.ws = ws;
    this.path = path;
    this.who = who;
  }
  ws;
  path;
  who;
  staged = [];
  hooked = false;
  /** `<git common dir>/crew/ledger.jsonl`; `.crew/ledger.jsonl` outside git. */
  static at(ws, crewDir) {
    const common = commonDir(ws.root);
    return new _Ledger(ws, common ? join(common, "crew", "ledger.jsonl") : join(crewDir, "ledger.jsonl"), whoAmI(ws.root));
  }
  /** Every event on disk, then the ones this command has staged. */
  events() {
    return [...this.onDisk(), ...this.staged];
  }
  record(type, ref, fields = {}) {
    const ev = { ts: (/* @__PURE__ */ new Date()).toISOString(), type, ref, ...this.who, ...fields };
    this.staged.push(ev);
    if (!this.hooked) {
      this.hooked = true;
      this.ws.beforeFlush(() => this.commit());
    }
    return ev;
  }
  /** ref → its live claim (a claim not followed by a release of the same ref). */
  claims(events = this.events()) {
    const live = /* @__PURE__ */ new Map();
    for (const ev of events) {
      if (!ev.ref) continue;
      if (ev.type === "claim") live.set(ev.ref, ev);
      else if (ev.type === "release") live.delete(ev.ref);
    }
    return live;
  }
  /** plan → its current assignment (the last `assign` event: `to` a role, optionally a `team`). */
  assignments(events = this.events()) {
    const out = /* @__PURE__ */ new Map();
    for (const ev of events) if (ev.type === "assign" && ev.ref) out.set(ev.ref, ev);
    return out;
  }
  /** ref → the status its last `move` event set. */
  lastStatus(events = this.events()) {
    const out = /* @__PURE__ */ new Map();
    for (const ev of events) if (ev.type === "move" && ev.ref) out.set(ev.ref, String(ev.to));
    return out;
  }
  spend(events = this.events()) {
    const s2 = { cost: 0, tokensIn: 0, tokensOut: 0, byActor: {}, byRole: {}, byRef: {} };
    const touched = /* @__PURE__ */ new Map();
    for (const ev of events) {
      if (ev.type !== "usage" && ev.ref) touched.set(ev.run, (touched.get(ev.run) ?? /* @__PURE__ */ new Set()).add(ev.ref));
    }
    const runs = /* @__PURE__ */ new Map();
    const add = (group, key, tokens, cost, run2) => {
      const u = s2[group][key] ??= group === "byRef" ? { tokens: 0, cost: 0, runs: 0, roles: {} } : { tokens: 0, cost: 0, runs: 0 };
      u.tokens += tokens;
      u.cost += cost;
      const seen = runs.get(`${group}|${key}`) ?? /* @__PURE__ */ new Set();
      if (!seen.has(run2)) u.runs++;
      runs.set(`${group}|${key}`, seen.add(run2));
    };
    for (const ev of countedUsage(events)) {
      const cost = Number(ev.cost) || 0, tin = Number(ev.tokens_in) || 0, tout = Number(ev.tokens_out) || 0;
      s2.cost += cost;
      s2.tokensIn += tin;
      s2.tokensOut += tout;
      s2.byActor[ev.actor] = (s2.byActor[ev.actor] ?? 0) + cost;
      add("byRole", ev.role ?? ev.actor, tin + tout, cost, ev.run);
      const refs = ev.ref ? [ev.ref] : [...touched.get(ev.run) ?? []];
      if (!refs.length) refs.push(UNATTRIBUTED);
      const role = ev.role ?? ev.actor;
      for (const ref of refs) {
        add("byRef", ref, (tin + tout) / refs.length, cost / refs.length, ev.run);
        s2.byRef[ref].roles[role] = (s2.byRef[ref].roles[role] ?? 0) + (tin + tout) / refs.length;
      }
    }
    return s2;
  }
  onDisk() {
    if (!existsSync(this.path)) return [];
    return readFileSync(this.path, "utf8").split("\n").filter((l) => l.trim()).flatMap((l) => {
      try {
        return [JSON.parse(l)];
      } catch {
        return [];
      }
    });
  }
  /** Under the lock: re-check staged claims against what other runs wrote meanwhile, then append. */
  commit() {
    if (!this.staged.length) return;
    mkdirSync(dirname(this.path), { recursive: true });
    const lock = `${this.path}.lock`;
    const token = acquireLock(lock);
    try {
      const live = this.claims(this.onDisk());
      for (const ev of this.staged.filter((e) => e.type === "claim" && e.ref && !e.force)) {
        const held = live.get(ev.ref);
        if (held && held.run !== ev.run) fail(`${ev.ref} was just claimed by ${held.actor} (${held.run}). Nothing was changed.`);
      }
      const torn = existsSync(this.path) && statSync(this.path).size > 0 && !readFileSync(this.path, "utf8").endsWith("\n");
      appendFileSync(this.path, (torn ? "\n" : "") + this.staged.map((e) => `${JSON.stringify(e)}
`).join(""));
      this.staged = [];
    } finally {
      releaseLock(lock, token);
    }
  }
};
function acquireLock(lock, waitMs = LOCK_WAIT_MS, staleMs = LOCK_STALE_MS) {
  const token = `${process.pid}-${randomBytes(6).toString("hex")}`;
  const deadline = Date.now() + waitMs;
  for (; ; ) {
    try {
      writeFileSync(lock, token, { flag: "wx" });
      return token;
    } catch (e) {
      if (e.code !== "EEXIST") throw e;
      takeOverIfStale(lock, staleMs, token);
      if (Date.now() > deadline) fail(`The ledger is locked (${lock}). Another crew command is writing; retry.`);
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 20);
    }
  }
}
function takeOverIfStale(lock, staleMs, token) {
  let seen;
  try {
    if (Date.now() - statSync(lock).mtimeMs <= staleMs) return;
    seen = readFileSync(lock, "utf8");
  } catch {
    return;
  }
  const aside = `${lock}.stale-${token}`;
  try {
    renameSync(lock, aside);
  } catch {
    return;
  }
  if (readFileSync(aside, "utf8") !== seen) {
    try {
      linkSync(aside, lock);
    } catch {
    }
  }
  unlinkSync(aside);
}
function releaseLock(lock, token) {
  try {
    if (readFileSync(lock, "utf8") === token) unlinkSync(lock);
  } catch {
  }
}

// src/hub/core/work/hubstate.ts
var STATE_PATHS = [".crew/plans", ".crew/items", ".crew/goals", ".crew/knowledge", ".crew/idea.md"];
var STATE_RE = /^\.crew\/((plans|items|goals|knowledge)\/|idea\.md$)/;
var real = (p) => existsSync2(p) ? realpathSync(p) : p;
function hubHome(root) {
  const main2 = worktrees()[0]?.path;
  return !main2 || real(main2) === real(root) ? root : main2;
}
function requireBase(home2, base2) {
  const at = git(["-C", home2, "branch", "--show-current"])?.trim();
  if (at !== base2) {
    fail(`Hub state lives on ${base2} in the main checkout (${home2}), which is on ${at || "a detached HEAD"}: switch it back to ${base2}, or turn hub.plan_worktrees off.`);
  }
}
function commitState(home2, message) {
  const common = commonDir(home2);
  if (!common) return null;
  mkdirSync2(join2(common, "crew"), { recursive: true });
  const lock = join2(common, "crew", "hub-commit.lock"), token = acquireLock(lock);
  try {
    const changed2 = changed(home2, STATE_PATHS);
    if (!changed2.length) return null;
    git(["-C", home2, "add", "-A", "--", ...changed2], true);
    const r = spawnSync2("git", ["commit", "-q", "--only", "-m", message, "--", ...changed2], { cwd: home2, encoding: "utf8" });
    if (r.status !== 0) {
      const why = `${r.stderr ?? ""}
${r.stdout ?? ""}`.split("\n").map((l) => l.trim()).find(Boolean) ?? "git commit failed";
      fail(`The hub's files are written but not committed (git commit failed in ${home2}: ${why}); the next hub command commits them. \`crew.mjs doctor\` checks the hooks.`);
    }
    return git(["-C", home2, "rev-parse", "--short", "HEAD"])?.trim() ?? null;
  } finally {
    releaseLock(lock, token);
  }
}

// src/hub/core/store.ts
import { existsSync as existsSync5, realpathSync as realpathSync2 } from "node:fs";
import { dirname as dirname3, join as join5, relative as relative2, resolve as resolve3 } from "node:path";
import { fileURLToPath } from "node:url";

// src/hub/core/work/doc.ts
var EMPTY_LINES = /* @__PURE__ */ new Set(["-", "- [ ]", "1."]);
var END = "(?![\\s\\S])";
function escapeRe(s2) {
  return s2.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function sectionRe(name) {
  return new RegExp(`^## ${escapeRe(name)}\\s*\\n([\\s\\S]*?)(?=^## |${END})`, "md");
}
var Doc = class _Doc {
  constructor(path, text2, meta = {}, source = "worktree", sink = null) {
    this.path = path;
    this.text = text2;
    this.meta = meta;
    this.source = source;
    this.sink = sink;
  }
  path;
  text;
  meta;
  source;
  sink;
  static parse(text2, path = null, source = "worktree") {
    const meta = {};
    const m = /^---\n([\s\S]*?)\n---\n/.exec(text2);
    if (m) {
      for (const line3 of m[1].split("\n")) {
        if (line3.includes(":") && !line3.startsWith(" ")) {
          const i = line3.indexOf(":");
          meta[line3.slice(0, i).trim()] = line3.slice(i + 1).trim() || null;
        }
      }
    }
    return new _Doc(path, text2, meta, source);
  }
  // -- frontmatter
  get id() {
    return this.get("id") ?? "";
  }
  get(key) {
    return this.meta[key] ?? null;
  }
  set(key, value) {
    this.meta[key] = value;
    const at = this.text.indexOf("\n---\n");
    let head = at < 0 ? this.text : this.text.slice(0, at);
    const rest = at < 0 ? "" : this.text.slice(at);
    const line3 = rstrip(`${key}: ${value ?? ""}`);
    const re = new RegExp(`^${escapeRe(key)}:.*$`, "m");
    head = re.test(head) ? head.replace(re, () => line3) : `${head}
${line3}`;
    this.text = head + rest;
  }
  /** Paths (globs) a plan expects to change, as written: not upper-cased like IDs. */
  touches() {
    return (this.get("touches") ?? "").split(",").map((t) => t.trim()).filter(Boolean);
  }
  dependsOn() {
    return idList(this.get("depends_on"));
  }
  // -- sections
  section(name) {
    return sectionRe(name).exec(this.text)?.[1] ?? "";
  }
  /** True if a section has real content beyond template comments, labels and empty bullets. */
  hasContent(name) {
    const body2 = stripComments(this.section(name));
    if (mdTable(body2).length) return true;
    return body2.split("\n").map((l) => l.trim()).some((line3) => line3 && !EMPTY_LINES.has(line3) && !line3.startsWith("|") && !/^\*\*[^*]+:\*\*$/.test(line3));
  }
  missing(names) {
    return names.filter((n2) => !this.hasContent(n2));
  }
  bullets(name) {
    return stripComments(this.section(name)).split("\n").map((l) => l.trim()).filter((l) => l.startsWith("- ") && l !== "-").map((l) => l.slice(2).trim());
  }
  checklist(name) {
    const out = [];
    for (const line3 of stripComments(this.section(name)).split("\n")) {
      const m = TASK_RE.exec(line3);
      const label = m?.[2].trim();
      if (m && label && label !== "T1: \u2026 \u2192 verify: \u2026") out.push([m[1] !== " ", label]);
    }
    return out;
  }
  tasks() {
    return this.checklist("Tasks");
  }
  /** The checklist like `checklist()`, each line with the `###` subheading it sits under (null before any). */
  taskGroups(name = "Tasks") {
    const out = [];
    let phase = null;
    for (const line3 of stripComments(this.section(name)).split("\n")) {
      const h = /^###\s+(.+?)\s*$/.exec(line3);
      if (h) phase = h[1];
      const m = TASK_RE.exec(line3);
      const label = m?.[2].trim();
      if (m && label && label !== "T1: \u2026 \u2192 verify: \u2026") out.push([m[1] !== " ", label, phase]);
    }
    return out;
  }
  appendTo(name, entry2) {
    const m = sectionRe(name).exec(this.text);
    if (!m) {
      this.text = `${rstrip(this.text)}

## ${name}
${entry2}
`;
      return;
    }
    const [start2, end] = m.indices[1];
    const block = rstrip(m[1]);
    this.text = this.text.slice(0, start2) + (block ? `${block}
` : "") + `${entry2}

` + this.text.slice(end);
  }
  /** Replace a section's body (a generated section such as Handoff); add the section before `before` when it's missing. */
  replaceSection(name, body2, before = "Progress log") {
    const m = sectionRe(name).exec(this.text);
    const block = `${rstrip(body2)}

`;
    if (m) {
      const [start2, end] = m.indices[1];
      this.text = this.text.slice(0, start2) + block + this.text.slice(end);
      return;
    }
    const at = new RegExp(`^## ${escapeRe(before)}\\s*$`, "m").exec(this.text);
    if (at) this.text = `${this.text.slice(0, at.index)}## ${name}
${block}${this.text.slice(at.index)}`;
    else this.text = `${rstrip(this.text)}

## ${name}
${block}`;
  }
  appendLog(note, section = "Progress log") {
    this.appendTo(section, `- ${today()}: ${note}`);
  }
  save() {
    if (!this.path || !this.sink) throw new Error(`${this.id || "document"} has no place to be saved`);
    this.sink(this.path, `${rstrip(this.text)}
`);
  }
};
function fill(template2, fields) {
  return template2.replace(/\{(\w+)\}/g, (_, k) => fields[k] ?? "");
}
function splitSections(text2) {
  const parts = text2.split(/^## (.+?)\s*$/m);
  const sections2 = [];
  for (let i = 1; i < parts.length; i += 2) sections2.push([parts[i].trim(), parts[i + 1] ?? ""]);
  return [parts[0], sections2];
}
function assemble(template2, draft) {
  const [pre, tmplSections] = splitSections(template2);
  let remaining = splitSections(draft)[1];
  const take = (name) => {
    const i = remaining.findIndex(([h]) => norm(name).startsWith(norm(h)) || norm(h).startsWith(norm(name)));
    if (i < 0) return null;
    const [[, body2]] = remaining.splice(i, 1);
    return body2.trim() ? body2 : null;
  };
  const out = [`${rstrip(pre)}
`];
  const filled = tmplSections.map(([h, b]) => [h, take(h) ?? b]);
  const extra = () => remaining.map(([eh, eb]) => `
## ${eh}
${eb.trim()}
`);
  for (const [h, body2] of filled) {
    if (["Progress log", "Notes & decisions", "Notes", "Daily log"].includes(h) && remaining.length) {
      out.push(...extra());
      remaining = [];
    }
    out.push(body2.trim() ? `
## ${h}
${body2.trim()}
` : `
## ${h}
`);
  }
  out.push(...extra());
  return `${rstrip(out.join(""))}
`;
}

// src/hub/core/team/policy.ts
var import_yaml = __toESM(require_dist(), 1);
import { existsSync as existsSync3, readdirSync, readFileSync as readFileSync2, statSync as statSync2 } from "node:fs";
import { join as join3, resolve as resolve2 } from "node:path";

// src/hub/core/team/presets.ts
var DRAFTS = { paths: { write: [".crew/drafts/**"] } };
var PRESETS = {
  lifecycle: {
    global: {
      mode: "ai-native",
      human_gates: ["goal.active"],
      role_gates: {
        "item.triaged": "pm",
        // only the PM triages and ranks
        "plan.ready": "architect",
        // only the Architect makes a spec ready
        "plan.assigned": "pm",
        // the PM opens a plan for a developer; `start` then needs that assignment
        "plan.in-progress": "developer",
        // only the assigned developer implements (and fixes what comes back)
        "plan.in-review": "developer",
        // … and hands over to test
        "plan.done": "pm",
        // the PM completes, against QA's evidence
        "plan.dropped": "pm",
        "goal.done": "pm",
        // the PM verifies a goal's criteria and closes it
        "plan.reassigned": "director",
        // the Director moves stuck work to someone else
        "plan.reviewed": "architect"
        // code review against the spec; done needs an approval of the current code
      },
      // liveness: a claim quiet for a day is stale; a third bounce or a sixth failed attempt goes to the Director
      limits: { stale_claim_hours: 24, max_bounces: 2, max_attempts: 5 },
      evidence: { role: "qa" }
      // only QA's checks count toward done
    },
    roles: { director: DRAFTS, pm: DRAFTS, qa: DRAFTS, release: DRAFTS }
  }
};

// src/hub/core/team/policy.ts
var MODES = ["ai-native", "ai-assisted", "human-led"];
var NOTIFY_ON = ["escalation", "budget", "stale", "goal-done", "paused"];
var ACTIONS = /* @__PURE__ */ new Set(["plan.assigned", "plan.reassigned", "plan.reviewed"]);
var MODE_GATES = {
  "ai-native": [],
  "ai-assisted": ["plan.ready", "plan.done", "goal.done"],
  "human-led": ["plan.ready", "plan.done", "goal.done", "item.triaged"]
};
var BUILT_IN = {
  mode: "ai-assisted",
  reserved: ["idea.decided", "idea.killed", "policy.change", "deploy.production", "publish", "spend", "delete-data"],
  // the guard's own files: no agent may remove the hook, rewrite its definition, loosen the policy or swap the CLI
  paths: { protected: [
    ".crew/policy.yaml",
    ".crew/bin/**",
    ".claude/settings.json",
    ".claude/settings.local.json",
    ".claude/agents/**",
    ".crew/templates/agents/**"
  ] },
  budgets: { max_agents: 4 },
  git: { protected_branches: ["main"], force_push: false, no_verify: false },
  secrets: { files: [".env", "**/.env", "**/*.pem", "**/*.key"] },
  escalation: { to: "executive" }
};
var SCOPED = {
  models: { default: "str", fallback: "str" },
  tools: { allow: "list", deny: "list" },
  paths: { protected: "list", write: "list" },
  budgets: { run: { max_cost: "num", max_tokens: "num" } },
  limits: { max_turns: "num" }
};
var GLOBAL = {
  mode: "str",
  preset: "str",
  human_gates: "list",
  role_gates: "map",
  reserved: "list",
  ...SCOPED,
  budgets: { max_agents: "num", run: { max_cost: "num", max_tokens: "num" }, project: { max_cost: "num", max_tokens: "num" } },
  git: { protected_branches: "list", force_push: "bool", no_verify: "bool" },
  secrets: { files: "list", patterns: "list" },
  escalation: { to: "str" },
  evidence: { role: "str" },
  notify: { command: "str", on: "list" },
  fast_lane: { types: "list", max_tasks: "num" },
  release: { refresh_bin: { from: "str", files: "list" } },
  limits: { max_turns: "num", stale_claim_hours: "num", max_bounces: "num", max_attempts: "num", idle_minutes: "num" }
};
var UNION = /* @__PURE__ */ new Set(["reserved", "secrets.files", "secrets.patterns", "git.protected_branches", "paths.protected", "tools.deny"]);
var TIGHTEN = /* @__PURE__ */ new Set(["git.force_push", "git.no_verify"]);
var CEILING = /^budgets\./;
function loadLayers(root, crewDir, role, team) {
  const errors = [], hints = [], custom = [], charters = {};
  const teamScopes = {};
  const read = (label, text2) => {
    if (text2 === null) return null;
    try {
      const v = (0, import_yaml.parse)(text2) ?? {};
      if (typeof v !== "object" || Array.isArray(v)) throw new Error("not a mapping");
      return v;
    } catch (e) {
      errors.push(`${label}: invalid YAML \u2014 ${e.message.split("\n")[0]}`);
      return null;
    }
  };
  const layers = [{ name: "built-in", org: false, raw: BUILT_IN }];
  const org = playbook(root, crewDir);
  if (org.hint) hints.push(org.hint);
  if (org.read) {
    const g = read("org policy/global.yaml", org.read("policy/global.yaml"));
    if (g) layers.push({ name: "org", org: true, raw: g });
    const r = role ? read(`org policy/roles/${role}.yaml`, org.read(`policy/roles/${role}.yaml`)) : null;
    if (r) layers.push({ name: `org role ${role}`, org: true, raw: r });
  }
  const projectPath = join3(crewDir, "policy.yaml");
  if (team && !existsSync3(projectPath)) errors.push(`team '${team}' (CREW_TEAM) is set, but there is no .crew/policy.yaml defining teams`);
  const project = read(".crew/policy.yaml", existsSync3(projectPath) ? readFileSync2(projectPath, "utf8") : null);
  if (project) {
    const { roles, teams, preset, ...global } = project;
    const p = typeof preset === "string" ? PRESETS[preset] : void 0;
    if (preset !== void 0 && !p) errors.push(`preset: '${String(preset)}' is not a preset (${Object.keys(PRESETS).join(", ")})`);
    if (p) layers.push({ name: `preset ${preset}`, org: false, raw: p.global });
    if (p && role && p.roles[role]) layers.push({ name: `preset ${preset} role ${role}`, org: false, raw: p.roles[role] });
    layers.push({ name: "project", org: false, raw: global });
    const pick = (m, key) => key && m && typeof m === "object" ? m[key] : void 0;
    const r = pick(roles, role), t = pick(teams, team);
    if (team && !t) errors.push(`team '${team}' (CREW_TEAM) is not defined under teams: in .crew/policy.yaml`);
    if (r) layers.push({ name: `project role ${role}`, org: false, raw: r });
    if (t) layers.push({ name: `project team ${team}`, org: false, raw: t });
    for (const [name, section] of Object.entries({ ...roles ?? {} })) {
      validate(section, { ...SCOPED, charter: "str" }, `roles.${name}`, errors);
      if (typeof section?.charter === "string") charters[name] = section.charter;
      if (!ROLES.includes(name)) {
        custom.push(name);
        if (!/^[a-z][a-z0-9-]*$/.test(name)) errors.push(`roles.${name}: a role name is lower-case letters, digits and dashes`);
        if (typeof section?.charter !== "string") errors.push(`roles.${name}: a new role needs a charter (what it owns and never does)`);
      }
    }
    for (const [name, section] of Object.entries({ ...teams ?? {} })) {
      const { scope, ...rest } = section ?? {};
      if (scope !== void 0 && !isList(scope)) errors.push(`teams.${name}.scope: expected a list of path globs`);
      else teamScopes[name] = scope ?? [];
      validate(rest, SCOPED, `teams.${name}`, errors);
    }
  }
  for (const l of layers.slice(1)) {
    if (l.name === "org" || l.name === "project") validate(l.raw, GLOBAL, l.name === "org" ? "org" : "", errors);
    else if (l.name.startsWith("org role")) validate(l.raw, SCOPED, l.name, errors);
  }
  return { layers, errors, hints, custom, charters, teams: teamScopes };
}
function playbook(root, crewDir) {
  const cfgPath = join3(crewDir, "config.yaml");
  let cfg = {};
  try {
    cfg = existsSync3(cfgPath) ? (0, import_yaml.parse)(readFileSync2(cfgPath, "utf8")) ?? {} : {};
  } catch {
  }
  const pb = cfg.playbook ?? {};
  const path = process.env.CREW_PLAYBOOK || (typeof pb.path === "string" ? pb.path : "");
  if (!path) return { read: null };
  const dir = resolve2(root, path);
  if (!existsSync3(dir)) return { read: null, hint: `playbook ${path} not found \u2014 the org policy layer is skipped` };
  const ref = typeof pb.ref === "string" && pb.ref ? pb.ref : null;
  if (ref) {
    return {
      read: (rel) => git(["-C", dir, "show", `${ref}:${rel}`]),
      list: (sub) => (git(["-C", dir, "ls-tree", "-r", "--name-only", ref, sub]) ?? "").split("\n").filter(Boolean)
    };
  }
  return {
    read: (rel) => existsSync3(join3(dir, rel)) ? readFileSync2(join3(dir, rel), "utf8") : null,
    list: (sub) => existsSync3(join3(dir, sub)) ? readdirSync(join3(dir, sub), { recursive: true, encoding: "utf8" }).map((f) => `${sub}/${f}`.replace(/\\/g, "/")).filter((f) => existsSync3(join3(dir, f)) && !statSync2(join3(dir, f)).isDirectory()) : []
  };
}
var isList = (v) => Array.isArray(v) && v.every((x) => typeof x === "string");
function validate(raw, shape, where, errors) {
  if (raw === null || raw === void 0) return;
  if (typeof raw !== "object" || Array.isArray(raw)) {
    errors.push(`${where || "policy"}: expected a mapping`);
    return;
  }
  for (const [k, v] of Object.entries(raw)) {
    const at = where ? `${where}.${k}` : k;
    const s2 = shape[k];
    if (!s2) {
      errors.push(`${at}: ${GLOBAL[k] ? "can only be set globally, not per role or team" : "unknown key"}`);
      continue;
    }
    if (typeof s2 === "object") validate(v, s2, at, errors);
    else if (s2 === "list" ? !isList(v) : s2 === "map" ? typeof v !== "object" || Array.isArray(v) || v === null : typeof v !== { str: "string", num: "number", bool: "boolean" }[s2]) {
      errors.push(`${at}: expected ${s2 === "list" ? "a list of strings" : s2 === "map" ? "a mapping" : `a ${s2 === "str" ? "string" : s2 === "num" ? "number" : "boolean"}`}`);
    }
  }
}
function flatten(raw, prefix = "") {
  return Object.entries(raw).flatMap(([k, v]) => {
    const path = prefix ? `${prefix}.${k}` : k;
    if (k === "role_gates" && !prefix && v && typeof v === "object") {
      return Object.entries(v).map(([t, r]) => [`role_gates[${t}]`, r]);
    }
    return v && typeof v === "object" && !Array.isArray(v) ? flatten(v, path) : [[path, v]];
  });
}
function resolveLayers(layers, roles = ROLES) {
  const values = /* @__PURE__ */ new Map(), sources = /* @__PURE__ */ new Map(), ceilings = /* @__PURE__ */ new Map();
  const errors = [];
  for (const layer of layers) {
    for (const [path, v] of flatten(layer.raw)) {
      if (UNION.has(path) && isList(v)) {
        const prev = values.get(path) ?? [];
        values.set(path, [.../* @__PURE__ */ new Set([...prev, ...v])]);
        sources.set(path, sources.has(path) ? `${sources.get(path)} + ${layer.name}` : layer.name);
      } else if (TIGHTEN.has(path)) {
        if (v === true && values.get(path) === false) errors.push(`${layer.name}: ${path}: true loosens a guardrail set by ${sources.get(path)}`);
        else {
          values.set(path, v);
          sources.set(path, layer.name);
        }
      } else if (CEILING.test(path) && typeof v === "number") {
        const cap = ceilings.get(path);
        if (cap && v > cap[0]) {
          errors.push(`${layer.name}: ${path}: ${v} exceeds the ceiling ${cap[0]} set by ${cap[1]}`);
          continue;
        }
        if (layer.org) ceilings.set(path, [Math.min(v, cap?.[0] ?? v), layer.name]);
        values.set(path, v);
        sources.set(path, layer.name);
      } else if (path === "human_gates") {
        const key = layer.org ? "human_gates.org" : path;
        values.set(key, layer.org ? [.../* @__PURE__ */ new Set([...values.get(key) ?? [], ...v])] : v);
        sources.set(key, layer.name);
      } else {
        values.set(path, v);
        sources.set(path, layer.name);
      }
    }
  }
  const get = (p, d) => values.has(p) ? values.get(p) : d;
  const mode = get("mode", "ai-assisted");
  if (!MODES.includes(mode)) errors.push(`mode: '${mode}' is not one of ${MODES.join(", ")}`);
  const floor = sources.get("human_gates.org");
  sources.set("human_gates", `${values.has("human_gates") ? sources.get("human_gates") : `built-in: mode ${mode}`}${floor ? ` + ${floor} floor` : ""}`);
  const gates = [.../* @__PURE__ */ new Set([...get("human_gates", MODE_GATES[mode] ?? []), ...get("human_gates.org", [])])];
  const role_gates = Object.fromEntries([...values].filter(([p]) => p.startsWith("role_gates[")).map(([p, v]) => [p.slice(11, -1), String(v)]));
  for (const t of [...gates, ...Object.keys(role_gates), ...get("reserved", [])]) errors.push(...transitionProblem(t));
  for (const [t, r] of Object.entries(role_gates)) if (!roles.includes(r)) errors.push(`role_gates ${t}: '${r}' is not a role (${roles.join(", ")})`);
  for (const p of get("secrets.patterns", [])) {
    try {
      new RegExp(p);
    } catch {
      errors.push(`secrets.patterns: '${p}' is not a valid JavaScript regular expression (no inline flags like (?i))`);
    }
  }
  const to = get("escalation.to", "executive");
  if (!roles.includes(to)) errors.push(`escalation.to: '${to}' is not a role (${roles.join(", ")})`);
  const ev = get("evidence.role", null);
  if (ev !== null && !roles.includes(ev)) errors.push(`evidence.role: '${ev}' is not a role (${roles.join(", ")})`);
  for (const o of get("notify.on", []).filter((x) => !NOTIFY_ON.includes(x))) errors.push(`notify.on: '${o}' is not one of ${NOTIFY_ON.join(", ")}`);
  const deny = get("tools.deny", []);
  const allow = get("tools.allow", []);
  for (const t of allow.filter((a) => deny.includes(a))) errors.push(`tools.allow: '${t}' is denied by ${sources.get("tools.deny")} (deny wins)`);
  const num2 = (p) => get(p, null);
  const policy2 = {
    mode,
    human_gates: gates,
    role_gates,
    reserved: get("reserved", []),
    models: { default: get("models.default", null), fallback: get("models.fallback", null) },
    tools: { allow: allow.filter((a) => !deny.includes(a)), deny },
    paths: { protected: get("paths.protected", []), write: get("paths.write", []) },
    budgets: {
      max_agents: num2("budgets.max_agents"),
      run: { max_cost: num2("budgets.run.max_cost"), max_tokens: num2("budgets.run.max_tokens") },
      project: { max_cost: num2("budgets.project.max_cost"), max_tokens: num2("budgets.project.max_tokens") }
    },
    git: { protected_branches: get("git.protected_branches", []), force_push: get("git.force_push", false), no_verify: get("git.no_verify", false) },
    secrets: { files: get("secrets.files", []), patterns: get("secrets.patterns", []) },
    escalation: { to: get("escalation.to", "executive") },
    evidence: { role: ev },
    notify: { command: get("notify.command", null), on: get("notify.on", []) },
    fast_lane: { types: get("fast_lane.types", []).map((t) => t.toUpperCase()), max_tasks: num2("fast_lane.max_tasks") },
    release: { refresh_bin: { from: get("release.refresh_bin.from", null), files: get("release.refresh_bin.files", []) } },
    limits: {
      max_turns: num2("limits.max_turns"),
      stale_claim_hours: num2("limits.stale_claim_hours"),
      max_bounces: num2("limits.max_bounces"),
      max_attempts: num2("limits.max_attempts"),
      idle_minutes: num2("limits.idle_minutes")
    }
  };
  return { policy: policy2, sources, errors };
}
function transitionProblem(t) {
  const [kind, step] = t.split(".");
  if (!Object.hasOwn(FLOWS, kind) || ACTIONS.has(t)) return [];
  const flow = FLOWS[kind], [from, to] = (step ?? "").split(">");
  if (to === void 0) return Object.hasOwn(flow, from) ? [] : [`'${t}': ${kind} has no status '${from}'`];
  return (flow[from] ?? []).includes(to) ? [] : [`'${t}': ${kind} can't go from '${from}' to '${to}'`];
}
function resolvePolicy(root, crewDir, role = null, team = null) {
  const { layers, errors, hints, custom, charters, teams } = loadLayers(root, crewDir, role, team);
  const roles = [...ROLES, ...custom];
  const r = resolveLayers(layers, roles);
  if (role && !roles.includes(role)) errors.push(`role '${role}' is not a role (${roles.join(", ")})`);
  return { policy: r.policy, sources: r.sources, errors: [...errors, ...r.errors], hints, role, team, roles, charters, teams };
}
function approvalReason(p, transition) {
  if (p.reserved.includes(transition)) return "a reserved decision";
  if (p.human_gates.includes(transition)) return `a human gate (mode ${p.mode})`;
  return null;
}

// src/hub/core/workspace.ts
import { chmodSync, copyFileSync, existsSync as existsSync4, mkdirSync as mkdirSync3, readdirSync as readdirSync2, readFileSync as readFileSync3, rmSync, statSync as statSync3, writeFileSync as writeFileSync2 } from "node:fs";
import { dirname as dirname2, join as join4, relative, sep } from "node:path";
var Workspace = class {
  constructor(root) {
    this.root = root;
  }
  root;
  pending = /* @__PURE__ */ new Map();
  hooks = [];
  aborts = [];
  watchers = [];
  output = [];
  /** A line for stdout (shown even when the command later refuses). */
  say(line3) {
    this.output.push(line3);
  }
  read(path) {
    if (this.pending.has(path)) {
      const p = this.pending.get(path);
      return p === null || p === void 0 ? null : "from" in p ? readFileSync3(p.from, "utf8") : p.text;
    }
    return this.isFileOnDisk(path) ? readFileSync3(path, "utf8") : null;
  }
  write(path, text2, mode) {
    this.pending.set(path, { text: text2, mode });
  }
  /** Stage a byte-for-byte copy (binary files must not go through a string). */
  copy(from, to) {
    this.pending.set(to, { from });
  }
  remove(path) {
    this.pending.set(path, null);
  }
  isFile(path) {
    return this.pending.has(path) ? this.pending.get(path) !== null : this.isFileOnDisk(path);
  }
  isDir(path) {
    if (existsSync4(path) && statSync3(path).isDirectory()) return true;
    return [...this.pending].some(([p, v]) => v !== null && p.startsWith(path + sep));
  }
  /** File names directly inside dir (staged files included, staged removals excluded), sorted. */
  list(dir) {
    const names = new Set(existsSync4(dir) && statSync3(dir).isDirectory() ? readdirSync2(dir, { withFileTypes: true }).filter((e) => e.isFile()).map((e) => e.name) : []);
    for (const [p, v] of this.pending) {
      if (dirname2(p) !== dir) continue;
      const name = p.slice(dir.length + 1);
      if (v === null) names.delete(name);
      else names.add(name);
    }
    return [...names].sort();
  }
  rel(path) {
    return relative(this.root, path).split(sep).join("/");
  }
  join(...parts) {
    return join4(...parts);
  }
  /** Run fn at the start of flush(), before any file is written; a HubError there aborts the whole flush. */
  beforeFlush(fn) {
    this.hooks.push(fn);
  }
  /** Undo a side effect that isn't staged (a git branch) if the command is refused after making it. */
  onAbort(fn) {
    this.aborts.push(fn);
  }
  /** The command was refused: drop the staged writes and undo unstaged side effects, newest first. */
  abort() {
    this.pending.clear();
    this.hooks = [];
    for (const fn of this.aborts.splice(0).reverse()) fn();
  }
  flush() {
    const paths = () => [...this.pending.keys()];
    try {
      for (const w of this.watchers) w.before(paths());
      for (const hook of this.hooks.splice(0)) hook();
    } catch (e) {
      this.abort();
      throw e;
    }
    const written = paths();
    this.aborts = [];
    for (const [path, v] of this.pending) {
      if (v === null) {
        rmSync(path, { force: true, recursive: true });
        continue;
      }
      mkdirSync3(dirname2(path), { recursive: true });
      if ("from" in v) {
        copyFileSync(v.from, path);
        continue;
      }
      writeFileSync2(path, v.text);
      if (v.mode !== void 0) chmodSync(path, v.mode);
    }
    this.pending.clear();
    for (const w of this.watchers) w.after(written);
  }
  /** Watch every flush: `before` sees the paths about to be written ahead of the beforeFlush hooks (a HubError there
   * aborts, so nothing is written or appended); `after` sees them once they are (a HubError there leaves them written). */
  watchWrites(before, after) {
    this.watchers.push({ before, after });
  }
  isFileOnDisk(path) {
    return existsSync4(path) && statSync3(path).isFile();
  }
};

// src/hub/core/store.ts
var SCRIPT_FILE = fileURLToPath(import.meta.url);
var SCRIPT_DIR = dirname3(SCRIPT_FILE);
var SKILL_DIR = dirname3(SCRIPT_DIR);
function yamlBlock(text2, block) {
  const out = {};
  let inside = false;
  for (const line3 of text2.split("\n")) {
    if (/^\S/.test(line3)) inside = line3.replace(/#.*/, "").trim() === `${block}:`;
    else if (inside) {
      const m = /^\s+([\w-]+):\s*([^#]*)/.exec(line3);
      if (m && m[2].trim()) out[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
    }
  }
  return out;
}
var Store = class _Store {
  constructor(ws) {
    this.ws = ws;
    useRoot(ws.root);
    this.home = hubHome(ws.root);
    this.dir = join5(this.home, ".crew");
    this.dirs = Object.fromEntries(Object.entries(DIRS).map(([k, v]) => [k, join5(this.dir, v)]));
    this.ideaPath = join5(this.dir, "idea.md");
    this.knowledgeDir = join5(this.dir, "knowledge");
    ws.watchWrites((paths) => {
      if (this.commitsState(paths)) requireBase(this.home, this.baseBranch());
    }, (paths) => {
      if (!this.commitsState(paths)) return;
      const sha = commitState(this.home, `chore(hub): ${this.label}`.slice(0, 100));
      if (sha) this.say(`hub: committed on ${this.baseBranch()} (${sha})`);
    });
  }
  ws;
  /** The main checkout: where the hub's documents live, whichever checkout the command runs in (`ws.root`). */
  home;
  dir;
  dirs;
  ideaPath;
  knowledgeDir;
  ledgerCache = null;
  policyCache = null;
  worktreeCache = null;
  /** What the hub commit says the command was (`chore(hub): <label>`). */
  label = "update";
  /** With plan worktrees, a command that writes hub documents commits them on the base branch in the home. */
  commitsState(paths) {
    return paths.some((p) => STATE_RE.test(relative2(this.home, p))) && this.settings().plan_worktrees;
  }
  static open(root = repoRoot()) {
    return new _Store(new Workspace(root));
  }
  /** The shared event log (claims, moves, logs, usage); see ledger.ts. */
  get ledger() {
    return this.ledgerCache ??= Ledger.at(this.ws, this.dir);
  }
  /** The effective policy for this run's role and team (CREW_ROLE, CREW_TEAM; see policy.ts). */
  get policy() {
    return this.policyCache ??= resolvePolicy(this.home, this.dir, this.ledger.who.role, this.ledger.who.team);
  }
  /** A path for messages: hub files relative to the home, so they read `.crew/…` from any checkout. */
  rel(p) {
    return p === this.dir || p.startsWith(`${this.dir}/`) ? relative2(this.home, p) : this.ws.rel(p);
  }
  say(line3) {
    this.ws.say(line3);
  }
  require() {
    if (!this.ws.isDir(this.dir)) fail("No .crew/ directory. Run `crew.mjs init` first.");
  }
  /** Project copy wins (so a cloned repo works without the plugin); fall back to the skill's. */
  template(name) {
    for (const d of [join5(this.dir, "templates"), join5(SKILL_DIR, "templates")]) {
      const text2 = this.ws.read(join5(d, name));
      if (text2 !== null) return text2;
    }
    return fail(`Template ${name} not found.`);
  }
  /** Hub settings from the `hub:` block of .crew/config.yaml, with defaults. */
  settings() {
    const text2 = this.ws.read(join5(this.dir, "config.yaml"));
    const s2 = { ...DEFAULT_SETTINGS, ...text2 === null ? {} : yamlBlock(text2, "hub") };
    const int = (k) => /^\d+$/.test(s2[k]) ? parseInt(s2[k], 10) : parseInt(DEFAULT_SETTINGS[k], 10);
    return { wip_limit: int("wip_limit"), max_tasks: int("max_tasks"), plan_worktrees: s2.plan_worktrees === "true" };
  }
  // -- loading
  attach(doc) {
    doc.sink = (path, text2) => this.ws.write(path, text2);
    return doc;
  }
  loadDir(d) {
    const docs = /* @__PURE__ */ new Map();
    for (const name of this.ws.list(d).filter((n2) => n2.endsWith(".md"))) {
      const path = join5(d, name);
      const doc = this.attach(Doc.parse(this.ws.read(path), path));
      if (doc.id) docs.set(doc.id, doc);
    }
    return docs;
  }
  goals() {
    return this.loadDir(this.dirs.goal);
  }
  items() {
    return this.loadDir(this.dirs.item);
  }
  /** Worktrees of plan branches other than this checkout, by plan ID: where each plan's team works. */
  planWorktrees() {
    if (this.worktreeCache) return this.worktreeCache;
    const real5 = (p) => existsSync5(p) ? realpathSync2(p) : p;
    const here = real5(this.ws.root), out = /* @__PURE__ */ new Map();
    for (const w of worktrees()) {
      const m = /^plan\/(P-\d+)/.exec(w.branch ?? "");
      if (m && existsSync5(w.path) && real5(w.path) !== here) out.set(m[1], w.path);
    }
    return this.worktreeCache = out;
  }
  /** A worktree was added or removed: look again. */
  forgetWorktrees() {
    this.worktreeCache = null;
  }
  /** Where a plan's work is: this checkout when it is on the plan's branch, else the plan's worktree, else null. */
  planHome(pid) {
    if (new RegExp(`^plan/${pid}-`).test(currentBranch() ?? "")) return this.ws.root;
    return this.planWorktrees().get(pid) ?? null;
  }
  /** Project knowledge, plus the org playbook's lessons (`lessons/**.md`, read-only) when a playbook is configured. */
  knowledge(withPlaybook = true) {
    const project = [...this.loadDir(this.knowledgeDir).values()].map((d) => toEntry(d, "project"));
    const pb = withPlaybook ? playbook(this.home, this.dir) : { read: null };
    const lessons = pb.read && pb.list ? pb.list("lessons").filter((f) => f.endsWith(".md")).flatMap((f) => {
      const text2 = pb.read(f);
      const d = text2 === null ? null : Doc.parse(text2, null, "playbook");
      return d?.id ? [toEntry(d, "playbook")] : [];
    }) : [];
    return linkSupersession([...project, ...lessons]);
  }
  /** The branch plans start from: `git.default_branch` in .crew/config.yaml, else the policy's first protected branch. */
  baseBranch() {
    const text2 = this.ws.read(join5(this.dir, "config.yaml"));
    const configured = text2 === null ? void 0 : yamlBlock(text2, "git").default_branch;
    return configured || this.policy.policy.git.protected_branches[0] || "main";
  }
  /** The project's idea (.crew/idea.md), if it has been written. */
  idea() {
    const text2 = this.ws.read(this.ideaPath);
    return text2 === null ? null : this.attach(Doc.parse(text2, this.ideaPath));
  }
  /** The focus goal's ID, as set on the idea (`focus G-###`). */
  focus() {
    return (this.idea()?.get("focus") ?? "").toUpperCase();
  }
  /** The plans in the home; with includeBranches, in branch-per-plan mode (no hub.plan_worktrees) also the copies
   * committed on plan/* branches, where that mode keeps a started plan's state, unless the home already closed the plan
   * (merged or dropped). With plan worktrees the main checkout is the only home: a branch's copy is never read. */
  plans(includeBranches = false) {
    const plans2 = this.loadDir(this.dirs.plan);
    if (includeBranches && !this.settings().plan_worktrees) {
      for (const [pid, doc] of this.branchPlans()) {
        const base2 = plans2.get(pid);
        if (!base2 || !CLOSED.has(base2.get("status") ?? "")) plans2.set(pid, doc);
      }
    }
    return plans2;
  }
  branchPlans() {
    const here = currentBranch();
    const refs = planBranches();
    const out = /* @__PURE__ */ new Map();
    for (const ref of refs) {
      const local = ref.replace(/^origin\//, "");
      if (local === here || ref !== local && refs.includes(local)) continue;
      const m = /^plan\/(P-\d+)/.exec(local);
      if (!m) continue;
      for (const name of lsTree(ref, ".crew/plans/")) {
        if (name.split("/").pop().startsWith(`${m[1]}-`)) {
          const text2 = show(ref, name);
          if (text2 !== null) out.set(m[1], Doc.parse(text2, null, ref));
        }
      }
    }
    return out;
  }
  find(docId) {
    docId = docId.toUpperCase();
    const kind = kindOf(docId);
    if (!kind) fail(`Unrecognised ID '${docId}'. Expected IDEA, G-###, P-### or FEAT/BUG/CHORE/SPIKE-###.`);
    if (kind === "idea") return this.idea() ?? fail(`No idea yet: write ${this.rel(this.ideaPath)} with \`new-idea\`.`);
    const doc = this.docs(kind).get(docId);
    return doc ?? fail(`${docId} not found in ${this.rel(this.dirs[kind])}`);
  }
  /** A kind's documents, from the home. */
  docs(kind) {
    return kind === "plan" ? this.plans() : kind === "item" ? this.items() : this.goals();
  }
  /** Next free ID, scanning every worktree and every branch so parallel work never reuses one. */
  nextId(prefix, kind) {
    const d = this.dirs[kind];
    const width = 3;
    const names = this.ws.list(d);
    const rel = `${this.rel(d)}/`;
    for (const ref of allRefs()) names.push(...lsTree(ref, rel).map((n2) => n2.split("/").pop()));
    for (const w of worktrees()) names.push(...this.ws.list(join5(w.path, this.rel(d))));
    const nums = names.map((n2) => new RegExp(`^${prefix}-(\\d+)`).exec(n2)).filter((m) => m).map((m) => parseInt(m[1], 10));
    return `${prefix}-${String(Math.max(0, ...nums) + 1).padStart(width, "0")}`;
  }
  // -- creating documents from drafts
  readDraft(draftPath, what) {
    const file = resolve3(draftPath);
    const text2 = this.ws.read(file);
    if (text2 === null) {
      fail(`Draft ${draftPath} not found. Write the ${what}'s sections there first (see .crew/templates/ and the writing guide).`);
    }
    return [file, text2];
  }
  consume(draftFile, keep = false) {
    const real5 = (p) => existsSync5(p) ? realpathSync2(p) : p;
    if (!keep && real5(draftFile).startsWith(real5(resolve3(this.dir, "drafts")) + "/")) this.ws.remove(draftFile);
  }
  build(template2, draft, fields) {
    const tmpl = fill(stripComments(this.template(template2)), { date: today(), ...fields }).replace(/^(\w+): $/gm, "$1:");
    return Doc.parse(assemble(tmpl, draft));
  }
  writeNew(doc, path) {
    doc.path = path;
    this.attach(doc).save();
    this.say(this.rel(path));
    return doc;
  }
  // -- argument validation
  checkRef(docId, kind) {
    if (!docId) return "";
    docId = docId.toUpperCase();
    if (kindOf(docId) !== kind || !this.docs(kind).has(docId)) {
      fail(`${kind[0].toUpperCase()}${kind.slice(1)} ${docId} does not exist.`);
    }
    return docId;
  }
  static checkPriority(p) {
    if (p && !PRIORITIES.includes(p.toUpperCase())) fail(`Priority must be one of ${PRIORITIES.join(", ")}.`);
    return (p ?? "").toUpperCase();
  }
};

// src/hub/core/work/queries.ts
var up = (s2) => (s2 ?? "").toUpperCase();
function itemStatus(item, plans2) {
  const st = item.get("status") || "new";
  if (ITEM_CLOSED.has(st)) return st;
  const p = plans2.get(up(item.get("plan")));
  return p ? PLAN_TO_ITEM[p.get("status") ?? ""] ?? st : st;
}
function planItems(plan, items2) {
  const linked = new Set([...items2].filter(([, it]) => up(it.get("plan")) === plan.id).map(([i]) => i));
  for (const i of idList(plan.get("items"))) linked.add(i);
  return [...linked].sort().filter((i) => items2.has(i)).map((i) => items2.get(i));
}
function planGoal(plan, items2) {
  return up(plan.get("goal")) || planItems(plan, items2).map((i) => up(i.get("goal"))).find(Boolean) || "";
}
function onFocus(plan, items2, focus) {
  if (!focus || planGoal(plan, items2) === focus) return true;
  const linked = planItems(plan, items2);
  return linked.length > 0 && linked.every((i) => OFF_FOCUS_OK.has(i.id.split("-")[0]));
}
function goalOrder(goals2) {
  return new Map([...goals2.keys()].sort().map((e, i) => [e, i]));
}
function goalQueue(goals2, focus) {
  const rank = (g) => {
    const p = PRIORITIES.indexOf(g.get("priority") ?? "");
    return [g.id !== focus, p < 0 ? PRIORITIES.length : p, g.id];
  };
  return [...goals2.values()].filter((g) => g.get("status") === "active").sort(byKey(rank)).map((g) => g.id);
}
function itemRank(it, goals2, focus) {
  const eorder = goalOrder(goals2);
  const prio = PRIORITIES.includes(it.get("priority") ?? "") ? it.get("priority") : "P9";
  return [prio !== "P0", !focus || up(it.get("goal")) !== focus, prio, eorder.get(up(it.get("goal"))) ?? eorder.size, it.id];
}
function ranked(items2, goals2, focus) {
  return [...items2.values()].sort(byKey((i) => itemRank(i, goals2, focus)));
}
function unmetDeps(doc, plans2) {
  return doc.dependsOn().filter((d) => plans2.get(d)?.get("status") !== "done");
}
function goalItems(goalId, items2) {
  return [...items2.values()].filter((i) => up(i.get("goal")) === goalId && !ITEM_CLOSED.has(i.get("status") ?? ""));
}
function goalPlans(goalId, plans2, items2) {
  return [...plans2.values()].filter((p) => planGoal(p, items2) === goalId);
}

// src/hub/core/work/gates.ts
function triageProblems(item) {
  const prefix = item.id.split("-")[0];
  const problems = item.missing(TRIAGE_SECTIONS[prefix]).map((n2) => `empty section: ${n2}`);
  if (!PRIORITIES.includes(item.get("priority") ?? "")) problems.push("no priority (P0\u2013P3)");
  if (prefix === "BUG" && !Object.hasOwn(SEVERITY_PRIORITY, item.get("severity") ?? "")) problems.push("no severity (S1\u2013S4)");
  return problems;
}
function fastLane(store, plan) {
  const { types, max_tasks } = store.policy.policy.fast_lane;
  const items2 = planItems(plan, store.items());
  return types.length > 0 && items2.length > 0 && items2.every((i) => types.includes(i.id.split("-")[0])) && (max_tasks === null || plan.tasks().length <= max_tasks);
}
function readinessProblems(store, plan) {
  return [
    ...plan.missing(READY_SECTIONS).map((n2) => `empty section: ${n2}`),
    ...plan.touches().length ? [] : ["no touches: (the paths this plan will change)"],
    ...taskProblems(store, plan),
    ...itemProblems(store, plan)
  ];
}
function learningsProblems(plan, known) {
  const m = /^\s*[-*]?\s*\**learnings?\**\s*:\**\s*(.*)$/im.exec(stripComments(plan.section("Outcome")));
  if (!m) return ["Outcome has no `Learnings:` line \u2014 list the K-\u2026 entries captured with `learn`, or write `Learnings: none`"];
  const ids = m[1].match(K_ID_RE) ?? [];
  if (!ids.length && !/^none\b/i.test(m[1].trim())) return ["`Learnings:` must list K-\u2026 entries or say none"];
  return ids.filter((i) => !known.has(i)).map((i) => `Learnings: ${i} does not exist`);
}
function decisionProblems(idea2) {
  const problems = idea2.missing(DECIDED_SECTIONS).map((n2) => `empty section: ${n2}`);
  if (idea2.hasContent("Success criteria") && !idea2.checklist("Success criteria").length) {
    problems.push("Success criteria must be a checklist (`- [ ] \u2026`) so each one can be verified");
  }
  return problems;
}
function taskProblems(store, plan) {
  const tasks = plan.tasks();
  const max = store.settings().max_tasks;
  const problems = tasks.length ? [] : ["no tasks"];
  const noVerify = tasks.filter(([, t]) => !t.toLowerCase().includes("verify")).map(([, t]) => t.split("\u2192")[0].trim());
  if (noVerify.length) problems.push(`tasks without '\u2192 verify:': ${noVerify.join("; ")}`);
  if (tasks.length > max) problems.push(`${tasks.length} tasks (> max_tasks ${max}) \u2014 split the plan`);
  return problems;
}
function itemProblems(store, plan) {
  const items2 = store.items();
  const linked = idList(plan.get("items"));
  const problems = [];
  for (const i of linked) {
    if (!items2.has(i)) problems.push(`unknown item ${i}`);
    else if (items2.get(i).get("status") === "new") problems.push(`item ${i} is not triaged`);
  }
  if (linked.some((i) => i.startsWith("BUG-"))) {
    const text2 = (plan.section("Acceptance criteria") + plan.section("Tasks") + plan.section("Test plan")).toLowerCase();
    if (!text2.includes("regression")) {
      problems.push("fixes a bug but names no regression test (acceptance criteria, tasks or test plan)");
    }
  }
  return problems;
}

// src/hub/core/work/footprint.ts
var import_yaml2 = __toESM(require_dist(), 1);
import { join as join6 } from "node:path";
var LIVE = /* @__PURE__ */ new Set(["ready", "in-progress", "blocked", "in-review"]);
var BROAD = 10;
function sharedSetting(store) {
  try {
    return (0, import_yaml2.parse)(store.ws.read(join6(store.dir, "config.yaml")) ?? "")?.hub?.shared;
  } catch {
    return void 0;
  }
}
function sharedGlobs(store) {
  const v = sharedSetting(store);
  return globList(v) ? v : [];
}
var globList = (v) => Array.isArray(v) && v.every((g) => typeof g === "string");
function sharedProblem(store) {
  const v = sharedSetting(store);
  return v === void 0 || v === null || globList(v) ? null : "hub.shared: expected a list of path globs";
}
function isShared(touch, shared2) {
  return shared2.includes(touch) || !/[*?]/.test(touch) && shared2.some((s2) => globRe(s2).test(touch));
}
function blockingGlobs(a, b, shared2 = []) {
  const mine = a.touches();
  return b.touches().filter((g) => mine.some((m) => globsOverlap(m, g) && !(isShared(m, shared2) && isShared(g, shared2))));
}
function overlapping(plan, plans2, shared2 = []) {
  return [...plans2.values()].filter((p) => p.id !== plan.id && LIVE.has(p.get("status") ?? "") && !p.dependsOn().includes(plan.id) && !plan.dependsOn().includes(p.id)).flatMap((p) => {
    const globs = blockingGlobs(plan, p, shared2);
    return globs.length ? [{ id: p.id, globs }] : [];
  });
}
function trackedFiles(home2) {
  const ls = (...spec) => (git(["-C", home2, "ls-files", "--", ...spec]) ?? "").split("\n").filter(Boolean);
  return { files: ls(), generated: new Set(ls(":(attr:linguist-generated)", ":(attr:linguist-generated=true)")) };
}
function touchHints(plan, tracked, shared2) {
  const out = [];
  for (const t of plan.touches()) {
    const re = globRe(t), hits = tracked.files.filter((f) => re.test(f));
    if (/[*?]/.test(t) && (hits.length > BROAD || hits.some((f) => shared2.some((s2) => globRe(s2).test(f))))) {
      out.push(`${plan.id}: touches glob ${t} is broad (${hits.length} tracked files) \u2014 list the exact files it changes`);
    }
    const gen = hits.find((f) => tracked.generated.has(f));
    if (gen) out.push(`${plan.id}: touches ${t} lists a generated path (${gen}) \u2014 Release rebuilds those (hub.build); no plan lists them`);
  }
  return out;
}
function drift(plan, base2, home2) {
  if (!home2 || !plan.touches().length) return null;
  const at = (args) => git(["-C", home2, ...args]);
  const fork = at(["merge-base", base2, "HEAD"])?.trim();
  if (!fork) return null;
  const changed2 = new Set([
    ...at(["diff", "--name-only", fork])?.split("\n") ?? [],
    ...at(["ls-files", "--others", "--exclude-standard"])?.split("\n") ?? []
  ].filter(Boolean));
  const globs = plan.touches().map(globRe);
  const outside = [...changed2].filter((f) => !f.startsWith(".crew/") && !globs.some((g) => g.test(f)));
  const generated3 = /* @__PURE__ */ new Set();
  if (outside.length) {
    const out = (at(["check-attr", "-z", "linguist-generated", "--", ...outside]) ?? "").split("\0");
    for (let i = 0; i + 2 < out.length; i += 3) if (out[i + 2] === "true" || out[i + 2] === "set") generated3.add(out[i]);
  }
  return outside.filter((f) => !generated3.has(f)).sort();
}

// src/hub/commands/work/execution.ts
import { spawnSync as spawnSync4 } from "node:child_process";
import { createHash as createHash2 } from "node:crypto";
import { existsSync as existsSync8 } from "node:fs";
import { join as join10 } from "node:path";

// src/hub/commands/team/questions.ts
import { randomBytes as randomBytes2 } from "node:crypto";

// src/hub/commands/memory/knowledge.ts
import { join as join7 } from "node:path";
function learn(store, type, title, o = {}) {
  store.require();
  if (!KNOWLEDGE_TYPES.includes(type)) fail(`Unknown type '${type}'. Use ${KNOWLEDGE_TYPES.join(", ")}.`);
  if (Boolean(o.why) === Boolean(o.from)) fail("Give exactly one of --why TEXT or --from DRAFT: the reason or evidence behind the fact.");
  const [draftFile, why] = o.from ? store.readDraft(o.from, "knowledge entry") : [null, o.why];
  if (!stripComments(why).trim()) fail("The entry has no content. Nothing was written.");
  const found = secretsIn(`${title}
${why}`, store.policy.policy.secrets.patterns);
  if (found.length) fail(`Refused: the entry looks like it contains a secret (${found.join(", ")}). Knowledge is committed; describe it instead.`);
  const entries = store.knowledge(false);
  const supersedes = (o.supersedes ?? "").trim();
  if (supersedes && !entries.some((e) => e.id === supersedes)) fail(`--supersedes ${supersedes}: no such entry.`);
  const risk = type === "risk" ? { likelihood: o.likelihood?.toUpperCase(), impact: o.impact?.toUpperCase(), owner: o.owner } : void 0;
  if (risk && (!RISK_LEVELS.includes(risk.likelihood ?? "") || !RISK_LEVELS.includes(risk.impact ?? ""))) {
    fail("A risk needs --likelihood and --impact (H, M or L).");
  }
  const id = knowledgeId(title, (k) => store.ws.isFile(join7(store.knowledgeDir, `${k}.md`)));
  const branch = /^plan\/(P-\d+)/.exec(currentBranch() ?? "")?.[1];
  const text2 = entryText({
    id,
    type,
    title,
    why,
    risk,
    supersedes,
    tier: o.candidate ? TIERS[1] : TIERS[0],
    scope: (o.scope ?? "").split(",").map((s2) => s2.trim()).filter(Boolean),
    source: o.source?.toUpperCase() ?? branch ?? ""
  });
  store.ws.write(join7(store.knowledgeDir, `${id}.md`), text2);
  if (draftFile) store.consume(draftFile, o.keep);
  store.ledger.record("learn", id, { kind: type, title, ...supersedes ? { supersedes } : {} });
  store.say(store.rel(join7(store.knowledgeDir, `${id}.md`)));
  return id;
}
function recallCmd(store, o = {}) {
  store.require();
  let globs = [];
  if (o.plan) {
    const plan = store.plans(true).get(o.plan.toUpperCase()) ?? fail(`No plan ${o.plan.toUpperCase()}.`);
    globs = plan.touches();
    if (!globs.length) store.say(`note: ${plan.id} declares no touches: \u2014 showing everything`);
  }
  const paths = (o.paths ?? "").split(",").map((p) => p.trim()).filter(Boolean);
  const hits = recall(store.knowledge(), { paths, globs, topic: o.topic, type: o.type, all: o.all });
  if (o.json) {
    for (const e of hits) store.say(JSON.stringify(view(e, store)));
    return;
  }
  if (!hits.length) store.say("Nothing recalled.");
  for (const e of hits) {
    const where = e.scope.length ? e.scope.join(", ") : "everywhere";
    store.say(`${e.id}  [${e.type}${e.origin === "playbook" ? ", playbook" : ""}${e.supersededBy ? `, superseded by ${e.supersededBy}` : ""}]  ${e.title}  (${where})`);
  }
}
function view(e, store) {
  return {
    id: e.id,
    type: e.type,
    title: e.title,
    scope: e.scope,
    source: e.source,
    tier: e.tier,
    origin: e.origin,
    supersededBy: e.supersededBy,
    path: e.doc.path ? store.rel(e.doc.path) : null,
    body: stripComments(e.doc.text.replace(/^---\n[\s\S]*?\n---\n/, "")).replace(/^# .*\n/m, "").trim()
  };
}

// src/hub/commands/team/autonomy.ts
import { spawnSync as spawnSync3 } from "node:child_process";
import { readFileSync as readFileSync7 } from "node:fs";

// src/hub/core/memory/activity.ts
import { appendFileSync as appendFileSync2, closeSync, existsSync as existsSync6, mkdirSync as mkdirSync4, openSync, readFileSync as readFileSync4, readSync, realpathSync as realpathSync3, renameSync as renameSync2, statSync as statSync4 } from "node:fs";
import { basename as basename2, dirname as dirname4, isAbsolute, join as join8, relative as relative3, resolve as resolve4 } from "node:path";
var ROTATE_BYTES = 2 * 1024 * 1024;
var LOCK_WAIT_MS2 = 300;
var TAIL_BYTES = 64 * 1024;
var DAY_MS = 24 * 36e5;
var IDLE_MINUTES = 20;
var activityPath = (ledgerPath) => join8(dirname4(ledgerPath), "activity.jsonl");
var rotated = (path) => path.replace(/\.jsonl$/, ".1.jsonl");
function appendActivity(path, ev, maxBytes = ROTATE_BYTES) {
  mkdirSync4(dirname4(path), { recursive: true });
  const lock = `${path}.lock`;
  let token;
  try {
    token = acquireLock(lock, LOCK_WAIT_MS2);
  } catch {
    return false;
  }
  try {
    const size = existsSync6(path) ? statSync4(path).size : 0;
    if (size >= maxBytes) renameSync2(path, rotated(path));
    const torn = size > 0 && size < maxBytes && tail(path, 1) !== "\n";
    appendFileSync2(path, `${torn ? "\n" : ""}${JSON.stringify(ev)}
`);
    return true;
  } finally {
    releaseLock(lock, token);
  }
}
function tail(path, bytes) {
  if (!existsSync6(path)) return "";
  const fd = openSync(path, "r");
  try {
    const size = statSync4(path).size, n2 = Math.min(bytes, size);
    const buf = Buffer.alloc(n2);
    readSync(fd, buf, 0, n2, size - n2);
    return buf.toString("utf8");
  } finally {
    closeSync(fd);
  }
}
var parse3 = (text2) => text2.split("\n").filter((l) => l.trim()).flatMap((l) => {
  try {
    const e = JSON.parse(l);
    return e && typeof e.ts === "string" && typeof e.run === "string" ? [e] : [];
  } catch {
    return [];
  }
});
function readActivity(path) {
  return [rotated(path), path].flatMap((p) => existsSync6(p) ? parse3(readFileSync4(p, "utf8")) : []);
}
function previousRef(path, run2) {
  for (const p of [path, rotated(path)]) {
    const text2 = tail(p, TAIL_BYTES);
    const cut = existsSync6(p) && statSync4(p).size > TAIL_BYTES;
    const lines = parse3(cut ? text2.slice(text2.indexOf("\n") + 1) : text2);
    const prev = lines.filter((e) => e.run === run2).at(-1);
    if (prev) return prev.ref;
  }
  return null;
}
var FILE_TOOLS = { Read: "file_path", Edit: "file_path", Write: "file_path", MultiEdit: "file_path", NotebookEdit: "notebook_path" };
var CREW_CLI = /\bcrew\.mjs\b/;
var HUB_ID = /^(P|G|FEAT|BUG|CHORE|SPIKE)-\d+$/i;
var WORKTREE = /(?:^|\/)\.claude\/worktrees\/(P-\d+)(?:-[^/]*)?(?:\/|$)/;
var PREFIX = /^(\{|\(|!|if|then|else|elif|do|while|until|builtin|command|time|exec|env|sudo|nohup)$/;
var segments = (cmd) => cmd.split(/&&|\|\||;|(?<!>)\||\n/).map((c) => c.trim()).filter(Boolean);
var unquote = (w) => w.replace(/^["'(]+|["')]+$/g, "");
function real2(p) {
  try {
    return realpathSync3(p);
  } catch {
    const up5 = dirname4(p);
    return up5 === p ? p : join8(real2(up5), basename2(p));
  }
}
function command(seg) {
  const w = seg.split(/\s+/).map(unquote).filter(Boolean);
  let i = 0;
  while (i < w.length && (/^\w+=/.test(w[i]) || PREFIX.test(w[i]))) i++;
  return w.slice(i);
}
function hubCall(seg) {
  const w = command(seg);
  const head = basename2(w[0] ?? "");
  if (!/^(node|bun)$/.test(head) && !/crew\.mjs$/.test(head)) return null;
  let i = w.findIndex((x) => CREW_CLI.test(x));
  if (i < 0) return null;
  const args = w.slice(i + 1);
  for (i = 0; i < args.length && args[i].startsWith("-"); i++) if (!args[i].includes("=")) i++;
  const sub = /^[a-z][\w-]*$/.test(args[i] ?? "") ? args[i] : null;
  const ref = args.slice(i + 1).find((a) => HUB_ID.test(a));
  return { sub, ref: ref ? ref.toUpperCase() : null };
}
var worktreePlan = (p) => p ? WORKTREE.exec(p.replace(/\\/g, "/"))?.[1] ?? null : null;
function describe(h, root) {
  const tool = String(h.tool_name ?? "unknown"), input = h.tool_input ?? {};
  const cwd = h.cwd || root;
  let target = null, ref = null, path;
  if (FILE_TOOLS[tool] && typeof input[FILE_TOOLS[tool]] === "string") {
    path = resolve4(cwd, String(input[FILE_TOOLS[tool]]));
    const r = relative3(real2(root), real2(path));
    const inside = r && r !== ".." && !r.startsWith("../") && !isAbsolute(r);
    target = inside ? r.replace(/^\.claude\/worktrees\/[^/]+\//, "") : basename2(path);
  } else if (tool === "Bash" && typeof input.command === "string") {
    const segs = segments(input.command);
    const hub = segs.map(hubCall).find((x) => x);
    if (hub) {
      target = hub.sub ? `crew.mjs ${hub.sub}` : "crew.mjs";
      ref = hub.ref;
    } else {
      const first = segs.map(command).find((w) => w.length && !/^(cd|pushd)$/.test(w[0]));
      target = first ? basename2(first[0]) || null : null;
    }
  }
  return { tool, target, ref: ref ?? worktreePlan(path) ?? worktreePlan(h.cwd) };
}
var STOPS = /* @__PURE__ */ new Set(["usage", "report"]);
function liveRuns(activity, ledger2, now = Date.now(), idleMinutes = IDLE_MINUTES) {
  const last = /* @__PURE__ */ new Map();
  for (const e of activity) {
    const prev = last.get(e.run);
    if (!prev || Date.parse(e.ts) >= Date.parse(prev.ts)) last.set(e.run, e);
  }
  const out = [];
  for (const [run2, a] of last) {
    const at = Date.parse(a.ts);
    if (!(now - at <= DAY_MS)) continue;
    const mine = ledger2.filter((e) => e.run === run2);
    if (mine.some((e) => STOPS.has(e.type) && Date.parse(e.ts) > at)) continue;
    const step = mine.filter((e) => e.type === "checkpoint" && e.ref === a.ref && e.step && !e.workflow).at(-1)?.step;
    const usage2 = mine.filter((e) => e.type === "usage");
    const minutes = Math.max(0, (now - at) / 6e4);
    out.push({
      run: run2,
      role: a.role,
      ref: a.ref,
      task: step ? String(step) : null,
      tool: a.tool,
      target: a.target,
      ts: a.ts,
      minutes,
      idle: minutes > idleMinutes,
      tokens: usage2.length ? countedUsage(usage2).reduce((n2, e) => n2 + (Number(e.tokens_in) || 0) + (Number(e.tokens_out) || 0), 0) : null
    });
  }
  return out.sort((x, y) => Date.parse(y.ts) - Date.parse(x.ts));
}

// src/hub/commands/team/activity.ts
import { closeSync as closeSync2, existsSync as existsSync7, openSync as openSync2, readFileSync as readFileSync6, readSync as readSync2, statSync as statSync5 } from "node:fs";

// src/hub/commands/memory/ledger.ts
var DETAIL = {
  claim: (e) => `branch ${e.branch ?? "?"}${e.force ? " (forced)" : ""}`,
  release: (e) => String(e.reason ?? ""),
  move: (e) => `${e.from} \u2192 ${e.to}${e.note ? ` \u2014 ${e.note}` : ""}`,
  log: (e) => String(e.text ?? ""),
  learn: (e) => `${e.kind}: ${e.title}${e.supersedes ? ` (supersedes ${e.supersedes})` : ""}`,
  checkpoint: (e) => e.workflow ? `${e.workflow}: ${e.step} ${e.state}` : `at ${e.step}${e.sha ? ` (${String(e.sha).slice(0, 7)})` : ""}` + (e.verify ?? []).map((v) => ` ${v.ok ? "\u2713" : "\u2717"} ${v.cmd}`).join("") + (e.attempt ? ` \u2014 tried: ${e.attempt.what}` : ""),
  ask: (e) => `${e.qid} \u2192 ${e.to}${e.escalation ? " (escalation)" : ""}: ${e.text}`,
  answer: (e) => `${e.qid}: ${e.text}${e.approved_by ? ` (by ${e.approved_by})` : ""}`,
  assign: (e) => `to the ${e.to} role${e.team ? `, team ${e.team}` : ""}${e.note ? ` \u2014 ${e.note}` : ""}`,
  review: (e) => `${e.verdict === "approve" ? "approved" : `changes: ${e.text}`}${e.sha ? ` (${String(e.sha).slice(0, 7)})` : ""}`,
  notify: (e) => `${e.kind}: ${e.text}`,
  pause: (e) => String(e.reason ?? "paused"),
  resume: (e) => String(e.note ?? "resumed"),
  report: (e) => String(e.text ?? ""),
  usage: (e) => `${e.tokens_in} in / ${e.tokens_out} out tokens, $${Number(e.cost ?? 0).toFixed(2)}${e.model ? ` (${e.model})` : ""}`
};
var EVENT_TYPES = Object.keys(DETAIL);
var detail = (e) => Object.hasOwn(DETAIL, e.type) ? DETAIL[e.type](e) : "";
function showLedger(store, o = {}) {
  store.require();
  if (o.type && !DETAIL[o.type]) fail(`Unknown event type '${o.type}'. Valid: ${Object.keys(DETAIL).join(", ")}`);
  const ref = o.ref?.toUpperCase();
  const all = store.ledger.events();
  const events = all.filter((e) => (!ref || e.ref === ref) && (!o.type || e.type === o.type)).slice(-(o.limit ?? 20));
  if (o.json) {
    for (const e of events) store.say(JSON.stringify(e));
    return;
  }
  if (!events.length) store.say(`No events${ref ? ` for ${ref}` : ""} in ${store.ledger.path}.`);
  for (const e of events) {
    store.say(`${e.ts.slice(0, 16).replace("T", " ")}  ${e.type.padEnd(7)}  ${(e.ref ?? "\u2014").padEnd(9)}  ${e.actor} (${e.run})  ${detail(e)}`);
  }
  const claims = [...store.ledger.claims(all).values()];
  if (!ref && !o.type && claims.length) {
    store.say(`claims: ${claims.map((c) => `${c.ref} ${c.actor}`).join(", ")}`);
  }
}

// src/hub/commands/team/guard.ts
import { readFileSync as readFileSync5, realpathSync as realpathSync4 } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { basename as basename4, dirname as dirname5, isAbsolute as isAbsolute2, join as join9, relative as relative4, resolve as resolve5 } from "node:path";

// src/hub/commands/team/hubcall.ts
import { basename as basename3 } from "node:path";
var HUB = /\bcrew\.mjs\b/;
var ASSIGN = /^[A-Za-z_]\w*=/;
var PREFIX2 = /* @__PURE__ */ new Set(["{", "!", "if", "then", "else", "elif", "do", "while", "until", "time", "builtin", "command", "exec", "env", "nohup"]);
var SHELLS = /* @__PURE__ */ new Set(["sh", "bash", "zsh", "dash", "ksh"]);
var RUNTIMES = /* @__PURE__ */ new Set(["node", "bun", "deno"]);
var WRAPPERS = /* @__PURE__ */ new Set(["eval", "xargs", "parallel", "watch", "timeout", "nice", "sudo", "ssh"]);
var BREAK = " 	\n;&|()<>";
var VARIABLE = "a hub path held in a shell variable can't be given your identity; call the hub literally (node .crew/bin/crew.mjs \u2026)";
var NESTED = "the guard can't give your identity to a hub call inside nested shell code; call the hub directly as its own command";
function parse4(s2) {
  const all = [];
  const pending = [];
  const n2 = s2.length;
  let i = 0;
  const heredocs = () => {
    for (const h of pending.splice(0)) {
      const from = i;
      let body2 = s2.slice(from);
      while (i < n2) {
        const e = s2.indexOf("\n", i) < 0 ? n2 : s2.indexOf("\n", i);
        const line3 = s2.slice(i, e);
        if ((h.strip ? line3.replace(/^\t+/, "") : line3) === h.delim) {
          body2 = s2.slice(from, i);
          i = Math.min(e + 1, n2);
          break;
        }
        i = e + 1;
      }
      if (i > n2) i = n2;
      h.cmd.bodies.push(body2);
    }
  };
  const nested = (stop) => list(stop);
  const word = (stop) => {
    const start2 = i;
    let value = "";
    while (i < n2) {
      const c = s2[i];
      if (BREAK.includes(c) || c === stop) break;
      if (c === "\\") {
        if (s2[i + 1] !== "\n") value += s2[i + 1] ?? "";
        i += 2;
      } else if (c === "'") {
        const j = s2.indexOf("'", i + 1) < 0 ? n2 : s2.indexOf("'", i + 1);
        value += s2.slice(i + 1, j);
        i = j + 1;
      } else if (c === '"') {
        for (i++; i < n2 && s2[i] !== '"'; ) {
          if (s2[i] === "\\" && '$`"\\\n'.includes(s2[i + 1] ?? "")) {
            value += s2[i + 1];
            i += 2;
          } else if (s2.startsWith("$(", i) || s2[i] === "`") {
            const from = i;
            i += s2[i] === "`" ? 1 : 2;
            nested(s2[from] === "`" ? "`" : ")");
            value += s2.slice(from, i);
          } else value += s2[i++];
        }
        i++;
      } else if (s2.startsWith("$(", i) || c === "`") {
        const from = i;
        i += c === "`" ? 1 : 2;
        nested(c === "`" ? "`" : ")");
        value += s2.slice(from, i);
      } else if (s2.startsWith("${", i)) {
        const j = s2.indexOf("}", i) < 0 ? n2 : s2.indexOf("}", i) + 1;
        value += s2.slice(i, j);
        i = j;
      } else value += s2[i++];
    }
    i = Math.min(i, n2);
    return { start: start2, end: i, value, raw: s2.slice(start2, i) };
  };
  const redirect = (cmd, stop) => {
    if (s2[i] === "&") i++;
    const op = s2[i++];
    let heredoc = false, herestring = false, strip = false;
    if (op === "<" && s2[i] === "<") {
      i++;
      if (s2[i] === "<") {
        herestring = true;
        i++;
      } else heredoc = true;
      if (heredoc && s2[i] === "-") {
        strip = true;
        i++;
      }
    } else if (s2[i] === "(") {
      i++;
      nested(")");
      return;
    } else if (s2[i] === ">" || s2[i] === "|" || s2[i] === "&") {
      if (s2[i++] === "&" && /[\d-]/.test(s2[i] ?? "")) {
        while (i < n2 && /[\d-]/.test(s2[i])) i++;
        return;
      }
    }
    while (s2[i] === " " || s2[i] === "	") i++;
    if (i >= n2 || BREAK.includes(s2[i])) return;
    const target = word(stop);
    if (heredoc) pending.push({ delim: target.value, strip, cmd });
    else if (herestring) cmd.bodies.push(target.value);
  };
  function list(stop) {
    let cur = { words: [], bodies: [] };
    all.push(cur);
    const end = () => {
      cur = { words: [], bodies: [] };
      all.push(cur);
    };
    while (i < n2) {
      const c = s2[i];
      if (stop && c === stop) {
        i++;
        return;
      }
      if (c === " " || c === "	") i++;
      else if (c === "\\" && s2[i + 1] === "\n") i += 2;
      else if (c === "\n") {
        i++;
        end();
        heredocs();
      } else if (c === "#") {
        while (i < n2 && s2[i] !== "\n") i++;
      } else if (c === "<" || c === ">" || c === "&" && s2[i + 1] === ">") redirect(cur, stop);
      else if (c === "(") {
        i++;
        end();
        nested(")");
        end();
      } else if (";&|)".includes(c)) {
        i++;
        end();
      } else {
        const w = word(stop);
        if (/^\d+$/.test(w.raw) && (s2[i] === "<" || s2[i] === ">")) continue;
        cur.words.push(w);
      }
    }
  }
  list("");
  return all.filter((c) => c.words.length || c.bodies.length);
}
var base = (w) => w ? basename3(w.value) : "";
function headAt(c) {
  let h = 0;
  while (h < c.words.length && (ASSIGN.test(c.words[h].raw) || PREFIX2.has(c.words[h].raw))) h++;
  return h;
}
function hubWord(c) {
  const h = headAt(c), head = c.words[h];
  if (base(head) === "crew.mjs") return head;
  if (!RUNTIMES.has(base(head))) return null;
  const script = c.words.slice(h + 1).find((w) => !w.value.startsWith("-"));
  return base(script) === "crew.mjs" ? script : null;
}
function refusal(c) {
  const h = headAt(c), head = c.words[h];
  if (!head) return null;
  if (/^"?\$[A-Za-z_{]/.test(head.raw)) return VARIABLE;
  const name = base(head), rest = c.words.slice(h + 1);
  const later = (k) => rest.slice(k).some((w) => HUB.test(w.value));
  const opt = (re) => rest.findIndex((w) => re.test(w.value));
  if (SHELLS.has(name)) {
    const k = opt(/^-[A-Za-z]*c[A-Za-z]*$/);
    if (k >= 0 && later(k + 1)) return NESTED;
    if (c.bodies.some((b) => HUB.test(b))) return NESTED;
  }
  if (WRAPPERS.has(name) && later(0)) return NESTED;
  if (name === "find" || name === "fd") {
    const k = opt(/^(-exec|-execdir|-ok|-okdir|-x|--exec|-X|--exec-batch)$/);
    if (k >= 0 && later(k + 1)) return NESTED;
  }
  if (RUNTIMES.has(name)) {
    const k = opt(/^(-[ep]|-pe|--eval|--print)(=|$)/);
    if (k >= 0 && later(k)) return NESTED;
  }
  if (name === "git" && rest.some((w) => /^!|=!/.test(w.value) && HUB.test(w.value))) return NESTED;
  return null;
}
function withIdentity(cmd, flags) {
  if (!HUB.test(cmd)) return { command: cmd };
  const cmds = parse4(cmd);
  for (const c of cmds) {
    const why = refusal(c);
    if (why) return { deny: why };
  }
  const at = [...new Set(cmds.map(hubWord).filter((w) => !!w).map((w) => w.end))].sort((a, b) => b - a);
  let command2 = cmd;
  for (const e of at) command2 = `${command2.slice(0, e)} ${flags}${command2.slice(e)}`;
  return { command: command2 };
}

// src/hub/commands/team/guard.ts
var HUB_MCP = /^mcp__(?:plugin_crew_)?hub__/;
function real3(p) {
  try {
    return realpathSync4(p);
  } catch {
    const up5 = dirname5(p);
    return up5 === p ? p : join9(real3(up5), basename4(p));
  }
}
var shellPath = (p) => p.replace(/^["']|["']$/g, "").replace(/^(~|\$HOME|\$\{HOME\})(?=\/|$)/, homedir());
var within = (dir, p) => {
  const r = relative4(dir, p);
  return r !== ".." && !r.startsWith("../") && !isAbsolute2(r);
};
var CREW_CLI2 = /\bcrew\.mjs\b/;
var EDITS = { Edit: "file_path", Write: "file_path", MultiEdit: "file_path", NotebookEdit: "notebook_path" };
var WRITERS = /^(rm|mv|cp|ln|chmod|chown|truncate|tee|install|touch|mkdir)$/;
function agentRole(root, agentType) {
  if (!/^[\w-]+$/.test(agentType)) return null;
  try {
    return Doc.parse(readFileSync5(join9(root, ".claude", "agents", `${agentType}.md`), "utf8")).get("crew-role");
  } catch {
    return null;
  }
}
var patternRe = (p) => new RegExp(`^${p.trim().replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\?/g, ".")}$`);
var segments2 = (cmd) => cmd.split(/&&|\|\||;|(?<!>)\||\n/).map((c) => c.trim()).filter(Boolean);
var words2 = (cmd) => cmd.split(/[\s"'=]+/).map((w) => w.replace(/^>+/, "").replace(/^\.\//, "")).filter(Boolean);
function hubCommand(seg) {
  const w = seg.split(/\s+/);
  let i = w.findIndex((x) => CREW_CLI2.test(x));
  if (i < 0) return null;
  for (i++; i < w.length && w[i].startsWith("-"); i++) if (!w[i].includes("=")) i++;
  return w[i] ?? null;
}
var REDIRECT = /\d*&?>{1,2}\|?(&?)\s*([^\s;&|<>]+)/g;
var PREFIX3 = /^(\{|!|if|then|else|elif|do|while|until|builtin|command|time)$/;
function writeTargets(cmd) {
  const out = [];
  const vars = {};
  const expand = (t) => t.replace(/^["']|["']$/g, "").replace(/^\$(?:\{(\w+)\}|(\w+))/, (m, a, b) => vars[a ?? b] ?? process.env[a ?? b] ?? m);
  const rooted = (t) => /^(\/|~|\$)/.test(t);
  let dir = "";
  const at = (raw) => {
    const t = expand(raw);
    return !dir || rooted(t) ? t : join9(dir, t);
  };
  for (const seg of segments2(cmd)) {
    const set = /^(?:export\s+)?(\w+)=(\S*)$/.exec(seg);
    if (set) {
      vars[set[1]] = expand(set[2]);
      continue;
    }
    for (const m of seg.matchAll(REDIRECT)) if (!(m[1] && /^(\d+|-)$/.test(m[2]))) out.push(at(m[2]));
    let [head, ...args] = words2(seg.replace(REDIRECT, ""));
    while (head !== void 0 && PREFIX3.test(head.replace(/^\(+/, ""))) [head, ...args] = args;
    head = head?.replace(/^\(+/, "");
    if (head === "cd" || head === "pushd") {
      const to = expand(args.find((a) => !a.startsWith("-")) ?? "~");
      dir = rooted(to) ? to : join9(dir, to);
      continue;
    }
    const operands = (head === "git" ? args.slice(1) : args).filter((a) => !a.startsWith("-"));
    if (head && /^(cp|ln|install)$/.test(head)) {
      const t = args.findIndex((a) => a === "-t" || a === "--target-directory");
      const dest = t >= 0 ? args[t + 1] : head === "ln" && operands.length === 1 ? basename4(operands[0]) : operands.at(-1);
      if (dest) out.push(at(dest));
    } else if (head && WRITERS.test(head) || head === "sed" && args.some((a) => a.startsWith("-i")) || head === "git" && /^(checkout|restore|rm|mv)$/.test(args[0] ?? "")) {
      out.push(...operands.map(at));
    }
  }
  return out.map((t) => t.replace(/^\.\//, ""));
}
function decide(store, h) {
  if (!h.agent_type) return null;
  const root = store.ws.root;
  const role = agentRole(root, h.agent_type);
  const run2 = role ? `${role}:${h.agent_id ?? "unknown"}` : null;
  const { policy: policy2 } = resolvePolicy(store.home, store.dir, role);
  const top = real3(h.cwd && git(["-C", h.cwd, "rev-parse", "--show-toplevel"])?.trim() || root);
  const abs = (p) => real3(resolve5(h.cwd || top, shellPath(p)));
  let trees = null;
  const checkouts = () => trees ??= [...new Set([top, root, ...worktrees().map((w) => w.path)].map(real3))].sort((a, b) => b.length - a.length);
  const rel = (p) => {
    const a = abs(p);
    return relative4(checkouts().find((d) => within(d, a)) ?? top, a).replace(/^\.claude\/worktrees\/[^/]+\//, "");
  };
  const hits = (globs, p) => globs.some((g) => globRe(g).test(rel(p)));
  const outside = (p) => {
    const a = abs(p);
    return !a.startsWith("/dev/") && ![...checkouts(), real3(tmpdir()), real3("/tmp")].some((d) => within(d, a));
  };
  const HUB_STATE = "project state stays in the hub (CLAUDE.md, crew:hub-state): use crew.mjs handoff, log, new-item, learn or ask, and keep only a pointer to the hub ID elsewhere";
  const input = h.tool_input ?? {};
  const home2 = real3(store.home), shared2 = store.settings().plan_worktrees;
  const forked = (p) => {
    if (!shared2) return null;
    const a = abs(p), d = checkouts().find((c) => within(c, a)) ?? top;
    const r = relative4(d, a), m = /^\.claude\/worktrees\/[^/]+\/(.*)$/.exec(r);
    return (d !== home2 || m) && STATE_RE.test(m ? m[1] : r) ? join9(home2, m ? m[1] : r) : null;
  };
  const ONE_HOME = "hub documents live in the main checkout only: change them with crew.mjs from any checkout, or edit";
  const path = EDITS[h.tool_name] ? String(input[EDITS[h.tool_name]] ?? "") : "";
  if (path && hits(policy2.paths.protected, path)) return { deny: `${rel(path)} is protected by the crew policy (paths.protected)` };
  const elsewhere = path ? forked(path) : null;
  if (elsewhere) return { deny: `${abs(path)} is a copy of hub state; ${ONE_HOME} ${elsewhere}` };
  if (path && outside(path)) return { deny: `${abs(path)} is outside the repository; ${HUB_STATE}` };
  if (h.tool_name === "Read" && hits(policy2.secrets.files, String(input.file_path ?? ""))) {
    return { deny: `${rel(String(input.file_path))} is a secret file (secrets.files); agents never read it` };
  }
  const cmd = h.tool_name === "Bash" ? String(input.command ?? "") : "";
  if (cmd) {
    const targets = writeTargets(cmd);
    const target = targets.find((t) => hits(policy2.paths.protected, t));
    if (target) return { deny: `the command writes to ${rel(target)}, which the crew policy protects (paths.protected)` };
    const unknown = targets.find((t) => t.startsWith("$"));
    if (unknown) return { deny: `the command writes to ${unknown}, which the guard can't resolve (an unknown variable); use a literal path` };
    const copy = targets.find((t) => forked(t));
    if (copy) return { deny: `the command writes to ${abs(copy)}, a copy of hub state; ${ONE_HOME} ${forked(copy)}` };
    const away = targets.find(outside);
    if (away) return { deny: `the command writes to ${abs(away)}, outside the repository; ${HUB_STATE}` };
    if (words2(cmd).some((w) => hits(policy2.secrets.files, w))) return { deny: "the command touches a secret file (secrets.files)" };
    if (CREW_CLI2.test(cmd) && /--approved-by\b/.test(cmd)) return { deny: "only the human approves: agents never pass --approved-by" };
    if (segments2(cmd).some((c) => hubCommand(c) === "agents" && !/--check\b/.test(c))) {
      return { deny: "`crew.mjs agents` rewrites the agent definitions, which only the human renders (paths.protected)" };
    }
  }
  if (!role) return null;
  for (const d of policy2.tools.deny) {
    const m = /^(\w+)\((.*)\)$/.exec(d);
    if (m ? m[1] === h.tool_name && segments2(cmd).some((c) => patternRe(m[2]).test(c)) : d === h.tool_name || d.endsWith("*") && h.tool_name.startsWith(d.slice(0, -1))) {
      return { deny: `${d} is denied for the ${role} role (tools.deny)` };
    }
  }
  if (path && policy2.paths.write.length && !hits(policy2.paths.write, path)) {
    return { deny: `the ${role} role may only write ${policy2.paths.write.join(", ")} (paths.write)` };
  }
  if (cmd && CREW_CLI2.test(cmd)) {
    const claimed = [...cmd.matchAll(/--as[=\s]+(\S+)/g)].map((m) => m[1]);
    if (claimed.some((c) => c !== role)) return { deny: `you are the ${role} agent; don't pass --as for another role` };
    if (/--run-id\b|\bCREW_(ROLE|RUN|ACTOR|TEAM)=/.test(cmd)) return { deny: "the guard sets your identity; don't pass --run-id or CREW_* variables" };
    const r = withIdentity(cmd, `--as ${role} --run-id ${run2}`);
    if ("deny" in r) return r;
    return r.command === cmd ? null : { input: { ...input, command: r.command } };
  }
  if (HUB_MCP.test(h.tool_name)) {
    if (input.as !== void 0 && input.as !== role) return { deny: `you are the ${role} agent; don't set as for another role` };
    if (input.run_id !== void 0) return { deny: "the guard sets your run; don't pass run_id" };
    return { input: { ...input, as: role, run_id: run2 } };
  }
  return null;
}
function guard(store) {
  let h;
  try {
    h = JSON.parse(readFileSync5(0, "utf8"));
  } catch {
    return 0;
  }
  const d = decide(store, h);
  if (!d) return 0;
  const out = "deny" in d ? { hookEventName: "PreToolUse", permissionDecision: "deny", permissionDecisionReason: `crew guard: ${d.deny}` } : { hookEventName: "PreToolUse", updatedInput: d.input };
  process.stdout.write(`${JSON.stringify({ hookSpecificOutput: out })}
`);
  return 0;
}

// src/hub/commands/team/activity.ts
var feedPath = (store) => activityPath(store.ledger.path);
function activityHook(store) {
  let h;
  try {
    h = JSON.parse(readFileSync6(0, "utf8"));
  } catch {
    return 0;
  }
  const role = h && typeof h.agent_type === "string" ? agentRole(store.ws.root, h.agent_type) : null;
  if (!role) return 0;
  const run2 = `${role}:${h.agent_id ?? "unknown"}`, path = feedPath(store);
  const d = describe(h, store.ws.root);
  appendActivity(path, { ts: (/* @__PURE__ */ new Date()).toISOString(), run: run2, role, ref: d.ref ?? previousRef(path, run2), tool: d.tool, target: d.target });
  return 0;
}
function running(store, now = Date.now()) {
  return liveRuns(readActivity(feedPath(store)), store.ledger.events(), now, store.policy.policy.limits.idle_minutes ?? IDLE_MINUTES);
}
var ago = (minutes) => minutes < 1 ? "just now" : minutes < 60 ? `${Math.floor(minutes)}m ago` : `${Math.floor(minutes / 60)}h ${Math.floor(minutes % 60)}m ago`;
var action = (tool, target) => target ? `${tool} ${target}` : tool;
function runningLines(store) {
  return running(store).map((r) => `- ${r.idle ? "**idle** " : ""}${r.role} (${r.run}) \u2014 ${r.ref ?? "\u2014"} \xB7 task ${r.task ?? "\u2014"} \xB7 ${action(r.tool, r.target)} ${ago(r.minutes)} \xB7 tokens ${r.tokens === null ? "\u2014" : r.tokens}`);
}
var fromActivity = (e) => ({ ts: e.ts, type: "tool", run: e.run, ref: e.ref, text: action(e.tool, e.target) });
var fromLedger = (e) => ({ ts: e.ts, type: e.type, run: e.run, ref: e.ref, text: detail(e) });
var byTime = (a, b) => Date.parse(a.ts) - Date.parse(b.ts);
var forRef = (ref) => (e) => !ref || e.ref?.toUpperCase() === ref.toUpperCase();
function feedEntries(store, ref, limit = 20) {
  return [...readActivity(feedPath(store)).map(fromActivity), ...store.ledger.events().map(fromLedger)].filter(forRef(ref)).sort(byTime).slice(-limit);
}
var clock = (ts) => ts.slice(0, 19).replace("T", " ");
var oneLine = (s2) => {
  const first = s2.split("\n")[0];
  return first.length > 140 ? `${first.slice(0, 140)}\u2026` : first === s2 ? s2 : `${first} \u2026`;
};
var line = (e) => `${clock(e.ts)}  ${e.type.padEnd(10)}  ${(e.ref ?? "\u2014").padEnd(9)}  ${e.run}  ${e.type === "tool" ? e.text : oneLine(e.text)}`;
function follow(path, at) {
  if (!existsSync7(path)) return [];
  const size = statSync5(path).size;
  if (size < at.offset) Object.assign(at, { offset: 0, rest: "" });
  if (size === at.offset) return [];
  const fd = openSync2(path, "r"), buf = Buffer.alloc(size - at.offset);
  try {
    readSync2(fd, buf, 0, buf.length, at.offset);
  } finally {
    closeSync2(fd);
  }
  at.offset = size;
  const lines = (at.rest + buf.toString("utf8")).split("\n");
  at.rest = lines.pop() ?? "";
  return lines.filter((l) => l.trim()).flatMap((l) => {
    try {
      return [JSON.parse(l)];
    } catch {
      return [];
    }
  });
}
function watch(store, o = {}) {
  store.require();
  const ref = o.ref?.toUpperCase(), out = (e) => process.stdout.write(`${line(e)}
`);
  const feed = feedPath(store), ledger2 = store.ledger.path;
  const size = (p) => existsSync7(p) ? statSync5(p).size : 0;
  const pos = { feed: { offset: size(feed), rest: "" }, ledger: { offset: size(ledger2), rest: "" } };
  feedEntries(store, ref, o.limit ?? 20).forEach(out);
  process.stdout.write(`\u2014 following ${store.rel(feed)} and the ledger${ref ? ` for ${ref}` : ""} (Ctrl-C to stop) \u2014
`);
  setInterval(() => {
    const fresh = [
      ...follow(feed, pos.feed).map(fromActivity),
      ...follow(ledger2, pos.ledger).map(fromLedger)
    ];
    fresh.filter(forRef(ref)).sort(byTime).forEach(out);
  }, o.intervalMs ?? 500);
  return 0;
}

// src/hub/commands/team/autonomy.ts
function notify(store, kind, ref, text2, key = "") {
  const { command: command2, on } = store.policy.policy.notify;
  if (!command2 || !on.includes(kind)) return;
  const sent = store.ledger.events().some((e) => e.type === "notify" && e.kind === kind && e.ref === ref && (e.key ?? "") === key);
  if (sent) return;
  store.ledger.record("notify", ref, { kind, text: text2, ...key ? { key } : {} });
  const event = { kind, ref, text: text2, project: store.ws.root, by: store.ledger.who.actor, role: store.ledger.who.role, ts: (/* @__PURE__ */ new Date()).toISOString() };
  store.ws.beforeFlush(() => {
    const r = spawnSync3(command2, { shell: true, input: JSON.stringify(event), encoding: "utf8", timeout: 3e4, cwd: store.ws.root });
    if (r.status !== 0) store.say(`warning: notify.command failed (${r.status ?? r.signal}): ${(r.stderr ?? "").trim().split("\n")[0]}`);
  });
}
function advanceFocus(store) {
  const goals2 = store.goals(), from = store.focus(), status2 = goals2.get(from)?.get("status");
  if (status2 && !CLOSED.has(status2) || !store.idea()) return null;
  const to = goalQueue(goals2, "")[0];
  if (!to) return null;
  const mark = store.ws.output.length;
  setFocus(store, to);
  store.ws.output.splice(mark);
  return { from, to };
}
function runState(store) {
  const moved = advanceFocus(store);
  const events = store.ledger.events(), reasons = [];
  const { held, stops } = escalationHolds(events);
  if (stops.length) reasons.push(`waiting for the executive: ${stops.map((x) => `${x.id} ${x.text}`).join("; ")}`);
  const holds = [...held].map(([ref, qids]) => `${ref} (${qids.join(", ")})`);
  if (holds.length) {
    const open = (docs) => [...docs.values()].filter((d) => !CLOSED.has(d.get("status") ?? "") && !ITEM_CLOSED.has(d.get("status") ?? "") && !held.has(d.id));
    if (!open(store.plans()).length && !open(store.items()).length) {
      reasons.push(`waiting for the executive: escalations hold every open plan and item: ${holds.join("; ")}`);
    }
  }
  const halt = paused(events);
  if (halt) reasons.push(`paused by ${halt.actor}: ${halt.reason ?? "no reason given"}`);
  const over = budgetProblems(store).filter((b) => b.startsWith("project"));
  if (over.length) reasons.push(`budget: ${over.join("; ")}`);
  const goals2 = store.goals(), focus = store.focus(), goal = goals2.get(focus), queue = goalQueue(goals2, focus);
  if (!goal && queue.length) reasons.push("no focus goal: the executive or the director sets one (`focus G-###`)");
  else if (!goal || CLOSED.has(goal.get("status") ?? "")) reasons.push(noGoalLeft([...goals2.values()]));
  for (const s2 of staleClaims(store, events)) notify(store, "stale", s2.ref, `${s2.ref}: no activity for ${s2.hours}h from ${s2.actor}`, s2.run);
  for (const b of over) notify(store, "budget", null, b, b.split(":")[0]);
  return { stop: reasons.length > 0, reasons, held: holds, queue, moved };
}
function noGoalLeft(goals2) {
  const done = goals2.filter((g) => g.get("status") === "done").sort(byKey((g) => [g.get("completed") ?? "", g.id])).map((g) => g.id);
  const waiting = goals2.filter((g) => g.get("status") === "proposed").map((g) => g.id).sort();
  const tail3 = waiting.length ? `; waiting for approval: ${waiting.join(", ")}` : "";
  return done.length ? `all approved goals done: ${done.join(", ")}${tail3}` : `no approved goal: the executive approves one (\`move G-### active --approved-by <name>\`)${tail3}`;
}
var LOOP = `while node .crew/bin/crew.mjs run --check; do claude -p "/crew:team continue" || break; done`;
function run(store, check2 = false, json = false) {
  store.require();
  const s2 = runState(store);
  if (json) store.say(JSON.stringify(s2));
  else if (check2) {
    if (s2.moved) store.say(`FOCUS  ${s2.moved.from || "\u2014"} \u2192 ${s2.moved.to} (${movedWhy(store, s2.moved.from)})`);
    store.say(s2.stop ? `STOP  ${s2.reasons.join("\nSTOP  ")}` : "GO    the team can continue");
    if (!s2.stop && s2.queue.length) store.say(`QUEUE  ${s2.queue.join(", ")}`);
    for (const h of s2.held) store.say(`HELD  ${h}: waiting for the executive`);
  } else {
    store.say('Run the team unattended (from the project root): each pass hands "continue" to the Director; the loop stops');
    store.say("on an escalation that holds everything, a pause, an exhausted budget or no approved goal left (`run --check` exits 1).");
    store.say(`  ${LOOP}`);
    store.say('Scheduled instead (cron, a CI schedule): `node .crew/bin/crew.mjs run --check && claude -p "/crew:team continue"`.');
    store.say(s2.stop ? `Now: stopped \u2014 ${s2.reasons.join("; ")}` : "Now: the team can continue.");
  }
  return check2 && s2.stop ? 1 : 0;
}
function movedWhy(store, from) {
  const status2 = from ? store.goals().get(from)?.get("status") : void 0;
  return !from ? "no focus goal" : status2 ? `${from} is ${status2}` : `${from} is not a goal`;
}
function transcriptUsage(text2) {
  const byMessage = /* @__PURE__ */ new Map();
  text2.split("\n").forEach((line3, i) => {
    try {
      const m = JSON.parse(line3).message;
      if (m?.usage) byMessage.set(m.id ?? `line-${i}`, m);
    } catch {
    }
  });
  const sum = { tokensIn: 0, tokensOut: 0, cacheRead: 0, model: null };
  for (const m of byMessage.values()) {
    const u = m.usage;
    sum.tokensIn += (u.input_tokens ?? 0) + (u.cache_creation_input_tokens ?? 0);
    sum.tokensOut += u.output_tokens ?? 0;
    sum.cacheRead += u.cache_read_input_tokens ?? 0;
    sum.model = m.model ?? sum.model;
  }
  return sum;
}
var REPORT_CAP = 2e4;
var MASKS = Object.values(SECRET_PATTERNS).map((re) => new RegExp(re.source, `${re.flags.replace("g", "")}g`));
function transcriptReport(text2) {
  let handback = null, said = null;
  for (const line3 of text2.split("\n")) {
    let m;
    try {
      const rec = JSON.parse(line3);
      m = rec.type === "assistant" || rec.message?.role === "assistant" ? rec.message : void 0;
    } catch {
      continue;
    }
    if (!m) continue;
    const blocks = typeof m.content === "string" ? [{ type: "text", text: m.content }] : Array.isArray(m.content) ? m.content : [];
    for (const b of blocks) {
      if (b?.type === "tool_use" && b.name === "SubagentHandback" && typeof b.input?.message === "string") handback = b.input.message;
    }
    const prose = blocks.filter((b) => b?.type === "text" && typeof b.text === "string" && b.text.trim()).map((b) => b.text).join("\n");
    if (prose) said = prose;
  }
  const report2 = (handback ?? said)?.trim();
  return report2 ? MASKS.reduce((t, re) => t.replace(re, "[secret withheld]"), report2).slice(0, REPORT_CAP) : null;
}
function usageHook(store) {
  let h;
  try {
    h = JSON.parse(readFileSync7(0, "utf8"));
  } catch {
    return 0;
  }
  const role = h.agent_type ? agentRole(store.ws.root, h.agent_type) : null;
  if (!role || !h.agent_transcript_path) return 0;
  let text2;
  try {
    text2 = readFileSync7(h.agent_transcript_path, "utf8");
  } catch {
    return 0;
  }
  const u = transcriptUsage(text2);
  Object.assign(store.ledger.who, { role, run: `${role}:${h.agent_id ?? "unknown"}` });
  const refs = new Set(store.ledger.events().filter((e) => e.run === store.ledger.who.run && e.type !== "usage" && e.ref).map((e) => e.ref));
  const ref = refs.size === 1 ? [...refs][0] : null;
  const report2 = transcriptReport(text2);
  if (report2) store.ledger.record("report", ref ?? previousRef(feedPath(store), store.ledger.who.run), { text: report2 });
  if (!u.tokensIn && !u.tokensOut) return 0;
  store.ledger.record("usage", ref, {
    tokens_in: u.tokensIn,
    tokens_out: u.tokensOut,
    cost: 0,
    cache_read: u.cacheRead,
    ...u.model ? { model: u.model } : {},
    source: "transcript"
  });
  if (budgetProblems(store).some((b) => b.startsWith("project"))) notify(store, "budget", null, budgetProblems(store).join("; "), "project");
  return 0;
}

// src/hub/commands/team/questions.ts
function questions(events) {
  const byId = /* @__PURE__ */ new Map();
  for (const e of events) {
    if (e.type === "ask") {
      byId.set(String(e.qid), {
        id: String(e.qid),
        ref: e.ref,
        to: String(e.to),
        text: String(e.text),
        by: e.actor,
        run: e.run,
        ts: e.ts,
        blocking: e.blocking !== false,
        escalation: e.escalation === true,
        answer: null
      });
    } else if (e.type === "answer" && byId.has(String(e.qid))) {
      byId.get(String(e.qid)).answer = { text: String(e.text), by: String(e.approved_by ?? e.actor), ts: e.ts };
    }
  }
  return [...byId.values()];
}
var openQuestions = (events, ref) => questions(events).filter((q) => !q.answer && (!ref || q.ref === ref));
function escalationHolds(events) {
  const held = /* @__PURE__ */ new Map(), stops = [];
  for (const q of openQuestions(events).filter((x) => x.escalation || x.to === "executive")) {
    const kind = q.ref ? kindOf(q.ref) : null;
    if (q.ref && (kind === "plan" || kind === "item")) held.set(q.ref, [...held.get(q.ref) ?? [], q.id]);
    else stops.push(q);
  }
  return { held, stops };
}
var FORWARD = /* @__PURE__ */ new Set(["ready", "in-progress", "in-review", "done", "active", "decided", "triaged"]);
function ask(store, ref, to, text2, o = {}) {
  store.require();
  const id = ref?.toUpperCase();
  if (id) {
    if (!kindOf(id)) fail(`Unrecognised ID '${id}'.`);
    store.find(id);
  }
  const roles = store.policy.roles;
  if (!roles.includes(to)) fail(`--to must be one of ${roles.join(", ")}.`);
  if (!text2.trim()) fail("Ask a question.");
  const qid = `Q-${randomBytes2(3).toString("hex")}`;
  store.ledger.record("ask", id ?? null, { qid, to, text: text2, ...o.fyi ? { blocking: false } : {}, ...o.escalation ? { escalation: true } : {} });
  store.say(`${qid} \u2192 ${to}${id ? ` about ${id}` : ""}${o.fyi ? "" : id ? ` (blocks ${id} until answered)` : ""}`);
  if (o.escalation || to === "executive") notify(store, "escalation", id ?? null, `${qid}: ${text2}`, qid);
  return qid;
}
function escalate(store, ref, text2) {
  return ask(store, ref, store.policy.policy.escalation.to, text2, { escalation: true });
}
function answer(store, qid, text2, o = {}) {
  store.require();
  const q = questions(store.ledger.events()).find((x) => x.id === qid.toLowerCase().replace(/^q-/, "Q-")) ?? fail(`No question ${qid}.`);
  if (q.answer) fail(`${q.id} was already answered by ${q.answer.by}: ${q.answer.text}`);
  if (!text2.trim()) fail("Give the answer.");
  if ((q.escalation || q.to === "executive") && !o.approvedBy) {
    fail(`${q.id} is an escalation to the ${q.to}: a human answers it with \`crew.mjs answer ${q.id} "\u2026" --approved-by <name>\` (agents can't).`);
  }
  const who = store.ledger.who;
  if (!o.approvedBy && who.run === q.run) fail(`${q.id} was asked by this run; the ${q.to} answers it, not the asker.`);
  if (!o.approvedBy && who.role !== q.to) {
    fail(`${q.id} is for the ${q.to} role; this run is ${who.role ? `the ${who.role} role` : "in no role"} (CREW_ROLE). A human can answer for the role with --approved-by <name>.`);
  }
  store.ledger.record("answer", q.ref, { qid: q.id, text: text2, ...o.approvedBy ? { approved_by: o.approvedBy } : {} });
  store.say(`${q.id} answered${q.ref ? ` \u2014 ${q.ref} is unblocked` : ""}`);
  if (o.decision) {
    learn(store, "decision", text2, { why: `Answer to ${q.id} (${q.to}): ${q.text}`, scope: o.scope, source: q.ref ?? void 0 });
  }
}
function listQuestions(store, o = {}) {
  store.require();
  const qs = questions(store.ledger.events()).filter((q) => (o.all || !q.answer) && (!o.to || q.to === o.to) && (!o.ref || q.ref === o.ref.toUpperCase()));
  if (o.json) {
    for (const q of qs) store.say(JSON.stringify(q));
    return;
  }
  if (!qs.length) store.say(o.all ? "No questions." : "No open questions.");
  for (const q of qs) {
    store.say(`${q.id}  ${q.escalation ? "ESCALATION " : ""}${q.by} \u2192 ${q.to}${q.ref ? ` about ${q.ref}` : ""}: ${q.text}` + (q.answer ? `  \u2014 answered by ${q.answer.by}: ${q.answer.text}` : q.blocking && q.ref ? "  (blocking)" : ""));
  }
}

// src/hub/commands/team/liveness.ts
var HOUR = 36e5;
var ACTIVITY = /* @__PURE__ */ new Set(["claim", "checkpoint", "move", "log"]);
function staleClaims(store, events = store.ledger.events(), now = Date.now()) {
  const limit = store.policy.policy.limits.stale_claim_hours;
  if (limit === null) return [];
  return [...store.ledger.claims(events).values()].flatMap((c) => {
    const last = events.filter((e) => e.ref === c.ref && e.run === c.run && ACTIVITY.has(e.type)).at(-1)?.ts ?? c.ts;
    const hours = (now - Date.parse(last)) / HOUR;
    return hours >= limit ? [{ ref: c.ref, actor: c.actor, run: c.run, hours: Math.floor(hours) }] : [];
  });
}
function paused(events) {
  const last = events.filter((e) => e.type === "pause" || e.type === "resume").at(-1);
  return last?.type === "pause" ? last : null;
}
function refuseWhilePaused(store, what) {
  const p = paused(store.ledger.events());
  if (p) fail(`The team is paused (${p.reason ?? "no reason given"}, by ${p.actor} ${p.ts.slice(0, 16).replace("T", " ")}): no ${what}. \`resume\` first.`);
}
function mayPause(store) {
  const role = store.ledger.who.role;
  if (role && role !== "executive" && role !== "director") fail(`Only the executive or the director pauses or resumes the team; this run is the ${role} role.`);
}
function pauseTeam(store, reason) {
  store.require();
  mayPause(store);
  if (paused(store.ledger.events())) fail("The team is already paused.");
  store.ledger.record("pause", null, reason ? { reason } : {});
  notify(store, "paused", null, `team paused by ${store.ledger.who.actor}${reason ? `: ${reason}` : ""}`, (/* @__PURE__ */ new Date()).toISOString());
  store.say(`Team paused${reason ? `: ${reason}` : ""}. Runs in flight finish their current step and hand off; \`staff\` and \`start\` refuse until \`resume\`.`);
}
function resumeTeam(store, note) {
  store.require();
  mayPause(store);
  if (!paused(store.ledger.events())) fail("The team isn't paused.");
  store.ledger.record("resume", null, note ? { note } : {});
  store.say("Team resumed.");
}
function escalateLimit(store, ref, count, limit, what) {
  if (limit === null || count !== limit + 1) return;
  if (openQuestions(store.ledger.events(), ref).some((x) => x.to === "director")) return;
  ask(store, ref, "director", `${ref} ${what} ${count} times (limit ${limit}): decide \u2014 re-spec it, reassign it, split it or drop it.`);
}
var bounces = (events, ref) => events.filter((e) => e.type === "move" && e.ref === ref && e.from === "in-review" && e.to === "in-progress").length;
var attempts = (events, ref) => events.filter((e) => e.type === "checkpoint" && e.ref === ref && e.attempt).length;
function livenessHints(store) {
  const events = store.ledger.events(), p = paused(events);
  return [
    ...p ? [`team paused by ${p.actor} (${p.reason ?? "no reason given"}) \u2014 \`resume\` to staff and start again`] : [],
    ...staleClaims(store, events).map((s2) => `${s2.ref}: claim by ${s2.actor} (${s2.run}) is stale \u2014 no activity for ${s2.hours}h (limits.stale_claim_hours); the director may \`reassign ${s2.ref}\``)
  ];
}

// src/hub/commands/work/execution.ts
var OUTPUT_LINES = 15;
var OUTPUT_CHARS = 2e3;
var RUN_TIMEOUT_MS = 10 * 6e4;
var acPrint = (text2) => createHash2("sha1").update(text2.replace(/\s*(?:[—–-]\s*)?\bevidence:.*$/i, "").replace(/\s+/g, " ").trim().toLowerCase()).digest("hex").slice(0, 10);
function criteria(plan) {
  const list = plan.checklist("Acceptance criteria").map(([, c]) => c);
  return list.length ? list : plan.bullets("Acceptance criteria");
}
function implementers(events, planId) {
  return new Set(events.filter((e) => e.ref === planId && (e.type === "claim" || e.type === "move" && e.to === "in-progress" && !e.via)).map((e) => e.run));
}
var checkpoints = (events, planId) => events.filter((e) => e.type === "checkpoint" && e.ref === planId);
function evidence(store, plan) {
  const events = store.ledger.events(), impl = implementers(events, plan.id), only = store.policy.policy.evidence.role;
  return criteria(plan).map((ac, i) => {
    let found = null;
    const print2 = acPrint(ac);
    for (const e of checkpoints(events, plan.id)) {
      for (const v of e.verify ?? []) {
        if (v.ac_text ? v.ac_text.includes(print2) : v.ac.includes(i + 1)) found = { verify: v, by: e.run, role: e.role };
      }
    }
    return {
      ac,
      verify: found?.verify ?? null,
      by: found?.by ?? null,
      role: found?.role ?? null,
      independent: !!found && !impl.has(found.by) && (!only || found.role === only)
    };
  });
}
function evidenceProblems(store, plan, approvedBy) {
  const problems = [];
  const me = store.ledger.who.run;
  if (implementers(store.ledger.events(), plan.id).has(me) && !approvedBy) {
    problems.push(`this run (${me}) implemented ${plan.id}; another run \u2014 QA \u2014 verifies it and moves it to done`);
  }
  evidence(store, plan).forEach((e, i) => {
    if (approvedBy && /\bevidence:/i.test(e.ac)) return;
    if (!e.verify) problems.push(`AC${i + 1} has no evidence: \`checkpoint ${plan.id} --run "<check>" --ac ${i + 1}\` \u2014 ${e.ac}`);
    else if (!e.verify.ok) problems.push(`AC${i + 1}: its latest check failed (${e.verify.cmd})`);
    else if (!e.independent) {
      const only = store.policy.policy.evidence.role;
      problems.push(only && e.role !== only ? `AC${i + 1}: checked by the ${e.role ?? "no"} role; only the ${only} role's checks count (evidence.role)` : `AC${i + 1}: only verified by the implementer (${e.by}); verify it from another run`);
    }
  });
  return problems;
}
function snapshot(dir) {
  const at = (args) => git(["-C", dir, ...args]);
  const sha = at(["rev-parse", "HEAD"])?.trim() || null;
  const status2 = at(["status", "--porcelain"]) ?? "";
  const dirty2 = status2.split("\n").filter(Boolean).map((l) => l.slice(3)).filter((p) => !p.startsWith(".crew/drafts/"));
  const diff = at(["diff", "HEAD"]) ?? "";
  return { sha, dirty: dirty2, fingerprint: createHash2("sha1").update(`${sha}
${status2}
${diff}`).digest("hex").slice(0, 12) };
}
function planFromBranch(store, id) {
  const pid = id?.toUpperCase() ?? /^plan\/(P-\d+)/.exec(currentBranch() ?? "")?.[1];
  if (pid?.startsWith("G-")) return store.find(store.checkRef(pid, "goal"));
  return pid ? store.plans(true).get(pid) ?? fail(`No plan ${pid}.`) : null;
}
function tail2(text2, extra) {
  const lines = text2.trimEnd().split("\n").slice(-OUTPUT_LINES).join("\n").slice(-OUTPUT_CHARS);
  return secretsIn(lines, extra).length ? "(output withheld: it looked like it contained a secret)" : lines;
}
function checkpoint(store, id, o = {}) {
  store.require();
  const plan = planFromBranch(store, id);
  if (!plan) {
    if (o.auto) return autoWorktrees(store, o);
    fail("Not on a plan branch: name the plan (`checkpoint P-###`).");
  }
  const home2 = plan.id.startsWith("P-") && store.planHome(plan.id) || store.ws.root;
  const acs = parseAc(o.ac, criteria(plan).length);
  const prints = acs.map((n2) => acPrint(criteria(plan)[n2 - 1]));
  if (o.verify && o.result !== "pass" && o.result !== "fail") fail("--verify needs --result pass|fail.");
  if (o.attempt && !o.why) fail("--attempt needs --why: what made it fail, so the next run doesn't retry it.");
  const goal = plan.id.startsWith("G-");
  if (goal && !o.run && !o.verify) fail(`A goal's checkpoint records evidence: \`checkpoint ${plan.id} --verify "<how>" --result pass|fail --ac n\`.`);
  const step = goal ? "goal" : o.step ?? plan.tasks().find(([done]) => !done)?.[1].split(":")[0] ?? "done";
  if (!o.auto && !goal) commitWork(store, plan, `chore(${plan.id}): checkpoint ${step}`);
  const snap = snapshot(home2);
  const last = checkpoints(store.ledger.events(), plan.id).at(-1);
  if (o.auto && last?.fingerprint === snap.fingerprint) return 0;
  const verify = [];
  if (o.run) {
    const r = spawnSync4(o.run, { shell: true, cwd: home2, encoding: "utf8", timeout: RUN_TIMEOUT_MS, maxBuffer: 32 << 20 });
    verify.push({ cmd: o.run, ok: r.status === 0, ac: acs, ac_text: prints, output: tail2(`${r.stdout ?? ""}${r.stderr ?? ""}`, store.policy.policy.secrets.patterns), observed: true });
  }
  if (o.verify) {
    verify.push({ cmd: o.verify, ok: o.result === "pass", ac: acs, ac_text: prints, ...o.output ? { output: tail2(o.output, store.policy.policy.secrets.patterns) } : {}, observed: false });
  }
  store.ledger.record("checkpoint", plan.id, {
    step,
    sha: snap.sha,
    dirty: snap.dirty.slice(0, 50),
    fingerprint: snap.fingerprint,
    ...verify.length ? { verify } : {},
    ...o.attempt ? { attempt: { what: o.attempt, why: o.why } } : {},
    ...o.note ? { note: o.note } : {},
    ...o.auto ? { auto: true } : {}
  });
  if (o.attempt) escalateLimit(store, plan.id, attempts(store.ledger.events(), plan.id), store.policy.policy.limits.max_attempts, "has failed attempts recorded");
  if (!o.auto) {
    store.say(`${plan.id}: checkpoint at ${step}${snap.sha ? ` (${snap.sha.slice(0, 7)})` : ""}` + verify.map((v) => ` \u2014 ${v.ok ? "\u2713" : "\u2717"} ${v.cmd}`).join(""));
  }
  return verify.some((v) => !v.ok) ? 1 : 0;
}
function autoWorktrees(store, o) {
  const plans2 = store.plans();
  for (const pid of store.planWorktrees().keys()) {
    if (plans2.get(pid)?.get("status") !== "in-progress") continue;
    try {
      checkpoint(store, pid, o);
    } catch (e) {
      if (!(e instanceof HubError)) throw e;
      store.say(`${pid}: auto checkpoint failed \u2014 ${e.message}`);
    }
  }
  return 0;
}
function commitWork(store, plan, subject) {
  const home2 = store.settings().plan_worktrees ? store.planHome(plan.id) : null;
  if (!home2 || git(["-C", home2, "branch", "--show-current"])?.trim() !== plan.get("branch")) return null;
  const files2 = codeChanges(home2, store.policy.policy.secrets.files);
  if (!files2.length) return null;
  const at = (args, check2 = false) => git(["-C", home2, "--literal-pathspecs", ...args], check2);
  const prev = at(["rev-parse", "HEAD"])?.trim();
  const gone = files2.filter((f) => !existsSync8(join10(home2, f)));
  if (files2.length > gone.length) at(["add", "-A", "--", ...files2.filter((f) => !gone.includes(f))], true);
  if (gone.length) at(["rm", "-q", "--cached", "--ignore-unmatch", "--", ...gone], true);
  try {
    at(["commit", "-q", "--only", "-m", subject, "--", ...files2], true);
  } catch (e) {
    if (!(e instanceof HubError)) throw e;
    at(["reset", "-q", "--", ...files2]);
    fail(`${plan.id}: git refused the commit (${subject}): ${e.message.slice(e.message.indexOf(" failed: ") + 9) || "no message"}`);
  }
  store.ws.onAbort(() => at(["reset", "-q", "--soft", prev]));
  return at(["rev-parse", "HEAD"])?.trim() ?? null;
}
function parseAc(spec, n2) {
  if (!spec) return [];
  if (spec === "all") return Array.from({ length: n2 }, (_, i) => i + 1);
  const nums = spec.split(",").map((x) => Number(x.trim().replace(/^AC/i, "")));
  const bad2 = nums.filter((x) => !Number.isInteger(x) || x < 1 || x > n2);
  if (bad2.length) fail(`--ac: the plan has acceptance criteria 1\u2013${n2} (or "all").`);
  return nums;
}
function recovery(store, plan) {
  const events = store.ledger.events();
  const cps = checkpoints(events, plan.id);
  const last = cps.at(-1);
  const owner2 = store.ledger.claims(events).get(plan.id);
  const tasks = plan.tasks();
  const out = [`${plan.id}: ${plan.get("title")} [${plan.get("status")}] tasks ${tasks.filter(([d]) => d).length}/${tasks.length}` + (owner2 ? ` \u2014 claimed by ${owner2.actor} (${owner2.run})` : "")];
  if (last) {
    const home2 = store.planHome(plan.id);
    const now = home2 ? snapshot(home2) : null;
    const ahead = home2 && last.sha && now?.sha ? Number(git(["-C", home2, "rev-list", "--count", `${last.sha}..HEAD`])?.trim() || 0) : 0;
    out.push(`last checkpoint ${String(last.ts).slice(0, 16).replace("T", " ")} at ${last.step} (${String(last.sha ?? "?").slice(0, 7)}) by ${last.actor}` + (now ? `; since then ${ahead} commit(s), ${now.dirty.length} uncommitted file(s)${now.dirty.length ? `: ${now.dirty.slice(0, 8).join(", ")}` : ""}` : ""));
  } else out.push("no checkpoint yet");
  const latest = /* @__PURE__ */ new Map();
  for (const e of cps) for (const v of e.verify ?? []) latest.set(v.cmd, { ...v, ts: e.ts });
  for (const v of latest.values()) {
    out.push(`${v.ok ? "\u2713" : "\u2717"} ${v.cmd}${v.ac.length ? ` (AC ${v.ac.join(",")})` : ""}${v.observed ? "" : " (reported)"}` + (!v.ok && v.output ? ` \u2014 ${v.output.split("\n").filter(Boolean).at(-1)}` : ""));
  }
  for (const e of cps.filter((c) => c.attempt)) {
    const a = e.attempt;
    out.push(`don't retry: ${a.what} \u2014 ${a.why}`);
  }
  const nxt = tasks.find(([d]) => !d)?.[1];
  if (nxt) out.push(`next: ${nxt}`);
  const ev = evidence(store, plan);
  if (ev.length) {
    out.push(`evidence: ${ev.map((e, i) => `AC${i + 1} ${!e.verify ? "\u2014" : !e.verify.ok ? "\u2717" : e.independent ? "\u2713" : "\u2713 (self)"}`).join(", ")}`);
  }
  return out;
}
function resume(store, id, json = false) {
  store.require();
  const plan = planFromBranch(store, id) ?? fail("Not on a plan branch: name the plan (`resume P-###`).");
  if (json) store.say(JSON.stringify({ plan: plan.id, lines: recovery(store, plan) }));
  else for (const line3 of recovery(store, plan)) store.say(line3);
}
function writeHandoff(store, plan) {
  const logs = stripComments(plan.section("Progress log")).split("\n").filter((l) => l.trim().startsWith("- ")).slice(-3);
  plan.replaceSection("Handoff", [
    `_Generated ${today()} by \`crew.mjs handoff\` from the ledger._`,
    "",
    ...recovery(store, plan).map((l) => `- ${l}`),
    ...logs.length ? ["", "Latest log:", ...logs] : []
  ].join("\n"));
}
function handoff(store, id) {
  store.require();
  const plan = planFromBranch(store, id) ?? fail("Not on a plan branch: name the plan (`handoff P-###`).");
  if (plan.source !== "worktree") fail(`${plan.id} lives on ${plan.source}; write its handoff there.`);
  writeHandoff(store, plan);
  plan.save();
  store.say(`${plan.id}: handoff written`);
}

// src/hub/commands/views/checks.ts
import { join as join13 } from "node:path";

// src/hub/commands/views/legacy.ts
import { isAbsolute as isAbsolute3, join as join11, relative as relative5 } from "node:path";
var LEGACY = ["check_secrets", "check_structure", "check_design", "format_on_edit", "track_plan_draft"];
var REFRESH = "`/crew:guidelines --refresh` moves crew's hooks and settings to the .mjs scripts and removes the .py once nothing calls it";
function legacyHints(store) {
  const { ws } = store;
  const at = (...p) => join11(ws.root, ...p);
  const hints = [];
  const leftovers = LEGACY.filter((n2) => ws.isFile(at(".crew", "bin", `${n2}.py`)));
  if (leftovers.length) hints.push(`.crew/bin/ still has the Python scripts ${leftovers.map((n2) => `${n2}.py`).join(", ")} \u2014 ${REFRESH}`);
  const hookDirs = [git(["rev-parse", "--git-path", "hooks"])?.trim(), git(["config", "core.hooksPath"])?.trim()].filter((d) => !!d).map((d) => isAbsolute3(d) ? d : at(d));
  const inDir = (dir) => ws.list(dir).filter((f) => !f.endsWith(".sample")).map((f) => relative5(ws.root, join11(dir, f)));
  const files2 = [.../* @__PURE__ */ new Set([
    ...inDir(at(".githooks")),
    ...hookDirs.flatMap(inDir),
    ".claude/settings.json",
    ".claude/settings.local.json",
    ...inDir(at(".github", "workflows")),
    ".gitlab-ci.yml",
    "Makefile",
    ".pre-commit-config.yaml",
    "package.json",
    ...inDir(at(".husky"))
  ])];
  for (const file of files2) {
    const text2 = ws.read(join11(ws.root, file));
    const calls = text2 ? LEGACY.filter((n2) => text2.includes(`.crew/bin/${n2}.py`)) : [];
    if (calls.length) hints.push(`${file} still runs ${calls.map((n2) => `.crew/bin/${n2}.py`).join(", ")} \u2014 use node .crew/bin/<name>.mjs (${REFRESH})`);
  }
  if (/^modules:/m.test(ws.read(at(".crew", "config.yaml")) ?? "")) {
    hints.push("`.crew/config.yaml` still has a `modules:` block \u2014 nothing in crew is optional any more, so delete it");
  }
  return hints;
}

// src/hub/commands/team/agents.ts
import { join as join12 } from "node:path";
var HUMAN = "executive";
var PLAIN = /^[\w-]+$/;
var agentsDir = (store) => join12(store.ws.root, ".claude", "agents");
var agentFile = (store, role) => join12(agentsDir(store), `crew-${role}.md`);
function template(store, name) {
  for (const d of [join12(store.dir, "templates", "agents"), join12(SKILL_DIR, "agents")]) {
    const text2 = store.ws.read(join12(d, `${name}.md`));
    if (text2 !== null) return text2;
  }
  return fail(`Agent template ${name}.md not found. Re-run \`crew.mjs init\` from the plugin.`);
}
var scalar = (v) => /^["']/.test(v) || !/(: | #|^[\s\W])|\s$/.test(v) ? v : JSON.stringify(v);
function renderAgent(store, role) {
  const r = resolvePolicy(store.home, store.dir, role);
  const custom = !ROLES.includes(role);
  let text2 = template(store, custom ? "generic" : role);
  if (custom) text2 = text2.replaceAll("{{role}}", role).replaceAll("{{charter}}", (r.charters[role] ?? "").replace(/\s+/g, " ").trim());
  const m = /^---\n([\s\S]*?)\n---\n/.exec(text2);
  const meta = (m?.[1] ?? "").split("\n").filter((l) => /^[\w-]+:/.test(l)).map((l) => [l.slice(0, l.indexOf(":")), l.slice(l.indexOf(":") + 1).trim()]);
  const p = r.policy, deny = p.tools.deny.filter((t) => PLAIN.test(t));
  const derived = [
    ["crew-role", role],
    ["model", p.models.default],
    ["tools", p.tools.allow.filter((t) => PLAIN.test(t)).join(", ") || null],
    ["disallowedTools", deny.join(", ") || null],
    // parallel developers never share a checkout: each plan has its own worktree (plan_worktrees), else each developer
    ["isolation", role === "developer" && !store.settings().plan_worktrees ? "worktree" : null],
    ["maxTurns", p.limits.max_turns === null ? null : String(p.limits.max_turns)]
  ];
  const own = /* @__PURE__ */ new Set(["name", ...derived.map(([k]) => k)]);
  const lines = [
    ["name", `crew-${role}`],
    ...meta.filter(([k]) => k === "description"),
    ...derived.filter((d) => d[1] !== null),
    ...meta.filter(([k]) => !own.has(k) && k !== "description")
  ];
  const body2 = m ? text2.slice(m[0].length) : text2;
  return { text: `---
${lines.map(([k, v]) => `${k}: ${scalar(v)}`).join("\n")}
---
${body2}`, errors: r.errors };
}
var agentRoles = (store) => resolvePolicy(store.home, store.dir).roles.filter((r) => r !== HUMAN);
function rendered(store) {
  const out = /* @__PURE__ */ new Map();
  for (const name of store.ws.list(agentsDir(store)).filter((n2) => /^crew-.*\.md$/.test(n2))) {
    const role = Doc.parse(store.ws.read(join12(agentsDir(store), name)) ?? "").get("crew-role");
    if (role) out.set(join12(agentsDir(store), name), role);
  }
  return out;
}
function agentProblems(store) {
  const roles = agentRoles(store), problems = [];
  for (const role of roles) {
    const path = agentFile(store, role), now = store.ws.read(path);
    if (now === null) problems.push({ path, problem: "missing" });
    else if (now !== renderAgent(store, role).text) problems.push({ path, problem: "stale against the policy or its template" });
  }
  for (const [path, role] of rendered(store)) {
    if (!roles.includes(role)) problems.push({ path, problem: `its role '${role}' is no longer defined` });
  }
  return problems;
}
function agentHints(store) {
  if (!rendered(store).size) return [];
  return agentProblems(store).map((p) => `agents: ${store.rel(p.path)} is ${p.problem} \u2014 run \`crew.mjs agents\``);
}
function agents(store, check2 = false) {
  store.require();
  if (check2) {
    const problems = agentProblems(store);
    for (const p of problems) store.say(`STALE  ${store.rel(p.path)}: ${p.problem}`);
    if (!problems.length) store.say("Agents up to date.");
    return problems.length ? 1 : 0;
  }
  const roles = agentRoles(store);
  const out = roles.map((role) => ({ role, ...renderAgent(store, role) }));
  const errors = [...new Set(out.flatMap((o) => o.errors))];
  if (errors.length) fail(`Fix the policy first (\`crew.mjs policy check\`); no agent was written:
  ${errors.join("\n  ")}`);
  let changed2 = 0;
  for (const { role, text: text2 } of out) {
    const path = agentFile(store, role);
    if (store.ws.read(path) === text2) continue;
    store.ws.write(path, text2);
    store.say(`wrote ${store.rel(path)}`);
    changed2++;
  }
  for (const [path, role] of rendered(store)) {
    if (roles.includes(role)) continue;
    store.ws.remove(path);
    store.say(`removed ${store.rel(path)} (role '${role}' is no longer defined)`);
    changed2++;
  }
  if (!changed2) store.say("Agents up to date.");
  return 0;
}

// src/hub/commands/team/policy.ts
var import_yaml3 = __toESM(require_dist(), 1);
var show2 = (v) => Array.isArray(v) ? v.length ? v.join(", ") : "\u2014" : v === null || v === void 0 ? "\u2014" : String(v);
function policyShow(store, role, team, json = false) {
  const r = resolvePolicy(store.home, store.dir, role ?? store.ledger.who.role, team ?? store.ledger.who.team);
  if (json) {
    store.say(JSON.stringify({ role: r.role, team: r.team, policy: r.policy, sources: Object.fromEntries(r.sources), errors: r.errors }, null, 2));
    return r.errors.length ? 1 : 0;
  }
  const p = r.policy;
  const rows = [
    ["mode", p.mode, "mode"],
    ["human_gates", p.human_gates, "human_gates"],
    ...Object.entries(p.role_gates).map(([t, role2]) => [`role_gates ${t}`, role2, `role_gates[${t}]`]),
    ["reserved", p.reserved, "reserved"],
    ["models.default", p.models.default, "models.default"],
    ["models.fallback", p.models.fallback, "models.fallback"],
    ["tools.allow", p.tools.allow, "tools.allow"],
    ["tools.deny", p.tools.deny, "tools.deny"],
    ["paths.write", p.paths.write, "paths.write"],
    ["paths.protected", p.paths.protected, "paths.protected"],
    ["budgets.max_agents", p.budgets.max_agents, "budgets.max_agents"],
    ["budgets.run.max_cost", p.budgets.run.max_cost, "budgets.run.max_cost"],
    ["budgets.run.max_tokens", p.budgets.run.max_tokens, "budgets.run.max_tokens"],
    ["budgets.project.max_cost", p.budgets.project.max_cost, "budgets.project.max_cost"],
    ["budgets.project.max_tokens", p.budgets.project.max_tokens, "budgets.project.max_tokens"],
    ["git.protected_branches", p.git.protected_branches, "git.protected_branches"],
    ["git.force_push", p.git.force_push, "git.force_push"],
    ["git.no_verify", p.git.no_verify, "git.no_verify"],
    ["secrets.files", p.secrets.files, "secrets.files"],
    ["secrets.patterns", p.secrets.patterns, "secrets.patterns"],
    ["escalation.to", p.escalation.to, "escalation.to"],
    ["evidence.role", p.evidence.role, "evidence.role"],
    ["notify.command", p.notify.command, "notify.command"],
    ["notify.on", p.notify.on, "notify.on"],
    ["fast_lane.types", p.fast_lane.types, "fast_lane.types"],
    ["fast_lane.max_tasks", p.fast_lane.max_tasks, "fast_lane.max_tasks"],
    ["release.refresh_bin.from", p.release.refresh_bin.from ?? "none", "release.refresh_bin.from"],
    ["release.refresh_bin.files", p.release.refresh_bin.files.length ? p.release.refresh_bin.files : "none", "release.refresh_bin.files"],
    ["limits.max_turns", p.limits.max_turns, "limits.max_turns"],
    ...["stale_claim_hours", "max_bounces", "max_attempts", "idle_minutes"].map((k) => [`limits.${k}`, p.limits[k], `limits.${k}`])
  ];
  store.say(`Effective policy${r.role ? ` for role ${r.role}` : ""}${r.team ? `, team ${r.team}` : ""}:`);
  const width = Math.max(...rows.map(([k]) => k.length));
  for (const [key, value, source] of rows) store.say(`  ${key.padEnd(width)}  ${show2(value)}  (${r.sources.get(source) ?? "default"})`);
  report(store, r.errors, r.hints);
  return r.errors.length ? 1 : 0;
}
function policyCheck(store) {
  const { errors, hints } = policyFindings(store);
  report(store, errors, hints);
  if (!errors.length && !hints.length) store.say("Policy OK.");
  return errors.length ? 1 : 0;
}
function policyFindings(store) {
  const base2 = resolvePolicy(store.home, store.dir);
  const errors = new Set(base2.errors), hints = new Set(base2.hints);
  let raw = {};
  try {
    raw = (0, import_yaml3.parse)(store.ws.read(`${store.dir}/policy.yaml`) ?? "") ?? {};
  } catch {
  }
  const named = (section) => Object.keys(raw[section] ?? {});
  for (const role of named("roles")) for (const e of resolvePolicy(store.home, store.dir, role).errors) errors.add(e);
  for (const team of named("teams")) for (const e of resolvePolicy(store.home, store.dir, null, team).errors) errors.add(e);
  return { errors: [...errors].map((e) => `policy: ${e}`), hints: [...hints].map((h) => `policy: ${h}`) };
}
function report(store, errors, hints) {
  for (const e of errors) store.say(`ERROR  ${e.startsWith("policy: ") ? e : `policy: ${e}`}`);
  for (const h of hints) store.say(`HINT   ${h.startsWith("policy: ") ? h : `policy: ${h}`}`);
}

// src/hub/commands/views/checks.ts
var Snapshot = class {
  // hub.shared
  constructor(store) {
    this.store = store;
    this.goals = store.goals();
    this.items = store.items();
    this.plans = store.plans();
    this.allPlans = store.plans(true);
    this.idea = store.idea();
    this.focus = store.focus();
    this.shared = sharedGlobs(store);
  }
  store;
  goals;
  items;
  plans;
  // this worktree
  allPlans;
  // plus live plan branches
  idea;
  focus;
  shared;
};
var valid = (flow, st) => st !== null && Object.hasOwn(flow, st);
var up2 = (s2) => (s2 ?? "").toUpperCase();
function findings(store) {
  const s2 = new Snapshot(store), f = { errors: [], hints: [] };
  for (const rule of [idea, plans, lostPlans, overlaps, touches, items, goals, ledger, knowledge, hygiene]) rule(s2, f);
  const p = policyFindings(store);
  return { errors: [...f.errors, ...p.errors], hints: [...f.hints, ...p.hints, ...agentHints(store), ...livenessHints(store)] };
}
function check(store) {
  store.require();
  const f = findings(store);
  for (const e of f.errors) store.say(`ERROR  ${e}`);
  for (const h of f.hints) store.say(`HINT   ${h}`);
  if (!f.errors.length && !f.hints.length) store.say("Hub OK.");
  return f.errors.length ? 1 : 0;
}
function idea(s2, f) {
  const i = s2.idea;
  if (!i) {
    f.hints.push("no idea.md \u2014 write the problem, outcome and success criteria with `new-idea TITLE --from <draft>`");
    return;
  }
  const st = i.get("status");
  if (!valid(IDEA_FLOW, st)) f.errors.push(`IDEA: invalid status '${st}'`);
  if (st === "decided") f.errors.push(...decisionProblems(i).map((p) => `IDEA: decided but ${p}`));
  if (s2.focus) {
    const g = s2.goals.get(s2.focus);
    if (!g) f.errors.push(`IDEA: focus ${s2.focus} is not a goal`);
    else if (CLOSED.has(g.get("status") ?? "")) f.hints.push(`focus ${s2.focus} is ${g.get("status")} \u2014 set the next focus with \`focus G-###\``);
  } else if ([...s2.goals.values()].some((g) => !CLOSED.has(g.get("status") ?? ""))) {
    f.hints.push("no focus goal \u2014 `focus G-###` so the team works toward one goal at a time");
  }
}
function plans(s2, f) {
  const branches = new Set(planBranches());
  const here = currentBranch();
  for (const [pid, p] of s2.plans) {
    const st = p.get("status");
    if (!valid(PLAN_FLOW, st)) f.errors.push(`${pid}: invalid status '${st}'`);
    const missing = p.missing(REQUIRED_ON_CREATE.plan);
    if (!CLOSED.has(st ?? "") && missing.length) {
      f.errors.push(`${pid}: skeleton plan \u2014 empty ${missing.join(", ")} (write it or delete it; unscheduled ideas belong in backlog items)`);
    }
    const unknownDeps = p.dependsOn().filter((d) => !s2.allPlans.has(d));
    if (unknownDeps.length) f.errors.push(`${pid}: depends on unknown ${unknownDeps.join(", ")}`);
    const unknownItems = idList(p.get("items")).filter((i) => !s2.items.has(i));
    if (unknownItems.length) f.errors.push(`${pid}: links unknown items ${unknownItems.join(", ")}`);
    if (p.get("goal") && !s2.goals.has(up2(p.get("goal")))) f.errors.push(`${pid}: references missing goal ${p.get("goal")}`);
    if (st === "ready") f.errors.push(...readinessProblems(s2.store, p).map((problem) => `${pid}: ready but ${problem}`));
    if (st === "done") donePlan(pid, p, f);
    if (ACTIVE.has(st ?? "")) activePlan(pid, p, s2, f, branches, here);
    const outside = drift(s2.allPlans.get(pid) ?? p, s2.store.baseBranch(), s2.store.planHome(pid));
    if (outside?.length) f.hints.push(`${pid}: changes outside its touches: ${outside.slice(0, 8).join(", ")} \u2014 widen touches (and log why) or move the work`);
    if ((ACTIVE.has(st ?? "") || st === "ready") && !onFocus(p, s2.items, s2.focus)) {
      f.hints.push(`${pid}: ${st} but does not serve the focus goal ${s2.focus} (only bugs and chores may run off focus)`);
    }
  }
}
function lostPlans(s2, f) {
  const seen = /* @__PURE__ */ new Set(), branches = planBranches();
  const local = new Set(branches.filter((b) => !b.startsWith("origin/")).map((b) => /^plan\/(P-\d+)/.exec(b)?.[1]));
  for (const b of branches) {
    const pid = /^(?:origin\/)?plan\/(P-\d+)/.exec(b)?.[1];
    if (!pid || seen.has(pid) || s2.allPlans.has(pid) || s2.store.planWorktrees().has(pid)) continue;
    seen.add(pid);
    if (b.startsWith("origin/") && !local.has(pid)) {
      f.hints.push(`${pid}: only ${b} has it and the main checkout has no plan file: fetch it and bring the plan home (\`migrate --gather\` from a checkout of it)`);
    } else {
      f.hints.push(`${pid}: branch ${b} has no plan file and no worktree \u2014 its worktree was removed before Release committed it, so the uncommitted work is gone; recover what you can, then delete the branch`);
    }
  }
}
function overlaps(s2, f) {
  for (const [pid, p] of s2.allPlans) {
    if (!ACTIVE.has(p.get("status") ?? "")) continue;
    for (const o of overlapping(p, s2.allPlans, s2.shared).filter((x) => ACTIVE.has(s2.allPlans.get(x.id)?.get("status") ?? "") && x.id > pid)) {
      f.hints.push(`${pid} and ${o.id} are both active and overlap on ${o.globs.join(", ")} \u2014 narrow touches, or list the file in hub.shared; depends_on is only for a plan that needs the other's code`);
    }
  }
}
function touches(s2, f) {
  const problem = sharedProblem(s2.store);
  if (problem) f.errors.push(problem);
  const open = [...s2.allPlans.values()].filter((p) => !CLOSED.has(p.get("status") ?? "") && p.touches().length);
  if (!open.length) return;
  const tracked = trackedFiles(s2.store.home);
  for (const p of open) {
    f.hints.push(...touchHints(p, tracked, s2.shared));
    const said = ["Context", "Approach", "Risks & open questions"].map((n2) => p.section(n2)).join("\n");
    for (const d of p.dependsOn()) {
      const dep = s2.allPlans.get(d), globs = dep ? blockingGlobs(p, dep, s2.shared) : [];
      if (globs.length && !said.includes(d)) {
        f.hints.push(`${p.id} depends on ${d} only through an overlap (${globs.join(", ")}) \u2014 name the code it needs from ${d} in Context, Approach or Risks, or drop the dependency`);
      }
    }
  }
}
function donePlan(pid, p, f) {
  if (p.tasks().some(([d]) => !d)) f.errors.push(`${pid}: done but has unchecked tasks`);
  if (!stripComments(p.section("Outcome")).trim()) f.errors.push(`${pid}: done but Outcome section is empty`);
}
function activePlan(pid, p, s2, f, branches, here) {
  const st = p.get("status");
  const waits = unmetDeps(p, s2.allPlans);
  if (waits.length) f.hints.push(`${pid}: ${st} while dependencies are unfinished: ${waits.join(", ")}`);
  if (!p.tasks().length || !p.hasContent("Acceptance criteria")) f.errors.push(`${pid}: ${st} but has no tasks or acceptance criteria`);
  const branch = p.get("branch");
  if ((st === "in-progress" || st === "in-review") && !branches.has(branch ?? "") && here !== branch) {
    f.hints.push(`${pid}: ${st} but branch ${branch} not found locally`);
  }
}
function items(s2, f) {
  for (const [iid, it] of s2.items) {
    const st = it.get("status");
    if (!valid(ITEM_FLOW, st)) f.errors.push(`${iid}: invalid status '${st}'`);
    if (st === "triaged") {
      const problems = triageProblems(it);
      if (problems.length) f.errors.push(`${iid}: triaged but ${problems.join("; ")}`);
    }
    const owner2 = up2(it.get("plan"));
    if (owner2 && !s2.allPlans.has(owner2)) f.errors.push(`${iid}: linked to missing plan ${owner2}`);
    if (s2.allPlans.get(owner2)?.get("status") === "dropped") {
      f.hints.push(`${iid}: its plan ${owner2} was dropped \u2014 clear \`plan:\` to return it to the backlog`);
    }
    if (it.get("goal") && !s2.goals.has(up2(it.get("goal")))) f.errors.push(`${iid}: references missing goal ${it.get("goal")}`);
    if (iid.startsWith("BUG-") && it.get("priority") === "P0" && ["new", "triaged"].includes(itemStatus(it, s2.allPlans))) {
      f.hints.push(`${iid}: P0 bug with no plan \u2014 expedite it`);
    }
  }
  const untriaged = [...s2.items.values()].filter((it) => it.get("status") === "new");
  if (untriaged.length > 10) f.hints.push(`${untriaged.length} untriaged items \u2014 run a triage session`);
}
function goals(s2, f) {
  for (const [eid, e] of s2.goals) {
    const st = e.get("status");
    if (!valid(GOAL_FLOW, st)) f.errors.push(`${eid}: invalid status '${st}'`);
    const missing = e.missing(["Outcome", "Scope", "Acceptance criteria"]);
    if (!CLOSED.has(st ?? "") && missing.length) f.errors.push(`${eid}: skeleton goal \u2014 empty ${missing.join(", ")}`);
    const eps = goalPlans(eid, s2.allPlans, s2.items), eitems = goalItems(eid, s2.items);
    const openItems = eitems.filter((i) => itemStatus(i, s2.allPlans) !== "done");
    if (eps.length && eps.every((p) => CLOSED.has(p.get("status") ?? "")) && !openItems.length && st === "active") {
      f.hints.push(`${eid}: all plans and items closed \u2014 verify acceptance criteria, then \`move ${eid} done\``);
    }
    if (st === "proposed" && eps.some((p) => ["in-progress", "in-review", "blocked", "done"].includes(p.get("status") ?? ""))) {
      f.hints.push(`${eid}: has started plans but is still 'proposed' \u2014 \`move ${eid} active\` (on main)`);
    }
    if (!CLOSED.has(st ?? "") && !eps.length && !eitems.length) f.hints.push(`${eid}: no plans and no items \u2014 break the goal down`);
  }
}
function knowledge(s2, f) {
  const entries = s2.store.knowledge(false);
  if (!entries.length) return;
  const files2 = files(s2.store.ws.root);
  const ids = new Set(entries.map((e) => e.id));
  const open = [s2.idea, ...s2.goals.values(), ...s2.allPlans.values()].filter((d) => !!d && !CLOSED.has(d.get("status") ?? ""));
  const cited = /* @__PURE__ */ new Map();
  for (const d of open) for (const k of d.text.match(K_ID_RE) ?? []) cited.set(k, [...cited.get(k) ?? [], d.id]);
  for (const e of entries) {
    if (!KNOWLEDGE_TYPES.includes(e.type)) f.errors.push(`${e.id}: unknown type '${e.type}'`);
    if (e.supersedes && !ids.has(e.supersedes)) f.errors.push(`${e.id}: supersedes missing ${e.supersedes}`);
    const secrets = secretsIn(e.doc.text, s2.store.policy.policy.secrets.patterns);
    if (secrets.length) f.errors.push(`${e.id}: looks like it contains a secret (${secrets.join(", ")}) \u2014 remove it and rotate the secret`);
    for (const glob of e.scope) {
      if (!files2.some((p) => globRe(glob).test(p))) f.hints.push(`${e.id}: scope '${glob}' matches no file \u2014 update the scope or supersede the entry`);
    }
    if (e.supersededBy && cited.has(e.id)) {
      f.hints.push(`${e.id}: superseded by ${e.supersededBy} but still cited in ${cited.get(e.id).join(", ")}`);
    }
    if (e.type === "risk" && !e.doc.get("owner") && !e.supersededBy) f.hints.push(`${e.id}: risk with no owner`);
  }
}
function ledger(s2, f) {
  const events = s2.store.ledger.events();
  for (const [ref, claim] of s2.store.ledger.claims(events)) {
    const st = s2.allPlans.get(ref)?.get("status");
    if (st && CLOSED.has(st)) f.hints.push(`${ref}: ${st} but still claimed by ${claim.actor} \u2014 \`release ${ref}\``);
  }
  for (const [ref, last] of s2.store.ledger.lastStatus(events)) {
    const st = s2.allPlans.get(ref)?.get("status");
    if (st && st !== last) f.hints.push(`${ref}: the ledger last moved it to ${last}, but the plan says ${st} (edited by hand?)`);
  }
}
function hygiene(s2, f) {
  const ahead = [...s2.allPlans.values()].filter((p) => ["draft", "ready"].includes(p.get("status") ?? ""));
  if (ahead.length > MAX_WRITTEN_AHEAD) {
    f.hints.push(`${ahead.length} plans written ahead of the work (> ${MAX_WRITTEN_AHEAD}) \u2014 keep later work as backlog items so plans don't go stale`);
  }
  const leftovers = s2.store.ws.list(join13(s2.store.dir, "drafts")).filter((n2) => n2.endsWith(".md"));
  if (leftovers.length) {
    f.hints.push(`unconverted drafts in .crew/drafts/: ${leftovers.join(", ")} \u2014 create the document from them or delete`);
  }
  if (s2.store.ws.isDir(join13(s2.store.ws.root, ".project"))) {
    f.hints.push("a .project/ directory from project-kit is still here \u2014 `crew.mjs migrate` moves it into .crew/");
  }
  if (!s2.store.ws.read(join13(s2.store.ws.root, "CLAUDE.md"))?.includes(HUB_STATE_MARKER)) {
    f.hints.push("CLAUDE.md has no hub-state section (project state stays in the hub) \u2014 `crew.mjs init` adds it");
  }
  if (!s2.store.ws.read(join13(s2.store.ws.root, ".githooks", "post-commit"))?.includes("graphify")) {
    f.hints.push("code graph not set up (no graphify hook in .githooks/post-commit) \u2014 `/crew:codemap` installs and wires it");
  }
  f.hints.push(...legacyHints(s2.store));
}

// src/hub/commands/work/goals.ts
function goalEvidence(store, goal) {
  const cps = store.ledger.events().filter((e) => e.type === "checkpoint" && e.ref === goal.id);
  return criteria(goal).map((ac) => {
    let found = null;
    for (const e of cps) for (const v of e.verify ?? []) if (v.ac_text?.includes(acPrint(ac))) found = { verify: v, role: e.role };
    return { ac, verify: found?.verify ?? null, role: found?.role ?? null };
  });
}
function goalProblems(store, goal) {
  const plans2 = store.plans(true), items2 = store.items();
  const verifier = store.policy.policy.role_gates["goal.done"] ? "pm" : null;
  const problems = goalEvidence(store, goal).flatMap((e, i) => {
    const how = `\`checkpoint ${goal.id} --verify "<how you checked>" --result pass --ac ${i + 1}\``;
    if (!e.verify) return [`AC${i + 1} is not verified: ${how}${verifier ? ` (the ${verifier})` : ""} \u2014 ${e.ac}`];
    if (!e.verify.ok) return [`AC${i + 1}: its latest check failed (${e.verify.cmd})`];
    if (verifier && e.role !== verifier) return [`AC${i + 1}: verified by the ${e.role ?? "no"} role; the ${verifier} verifies goals: ${how}`];
    return [];
  });
  const gp = goalPlans(goal.id, plans2, items2);
  for (const p of gp.filter((x) => !CLOSED.has(x.get("status") ?? ""))) problems.push(`${p.id} is ${p.get("status")}: complete or drop it`);
  for (const i of goalItems(goal.id, items2).filter((x) => itemStatus(x, plans2) !== "done")) {
    problems.push(`${i.id} is still open (${itemStatus(i, plans2)}): deliver it, or move it to another goal`);
  }
  const ids = new Set(gp.map((p) => p.id));
  const { errors, hints } = findings(store);
  for (const f of [...errors, ...hints].filter((x) => /outside its touches/.test(x) && ids.has(x.split(":")[0]))) problems.push(`drift: ${f}`);
  return problems;
}

// src/hub/commands/work/review.ts
var lastCode = (branch) => git(["log", "-1", "--format=%H", branch, "--", ".", ":(exclude).crew"])?.trim() || null;
function uncommitted(store, plan) {
  if (!store.settings().plan_worktrees) return null;
  const home2 = store.planHome(plan.id);
  return home2 ? codeChanges(home2, store.policy.policy.secrets.files) : [];
}
function review(store, planId, o) {
  store.require();
  const plan = store.find(store.checkRef(planId, "plan"));
  if (!!o.approve === !!o.changes) fail('Give one verdict: --approve, or --changes "<what to change>".');
  if (plan.get("status") !== "in-review") fail(`${plan.id} is '${plan.get("status")}': only a plan in review is reviewed.`);
  authorize(store, plan.id, "plan.reviewed", void 0, void 0, `review ${plan.id}`);
  const me = store.ledger.who.run;
  if (implementers(store.ledger.events(), plan.id).has(me)) fail(`This run (${me}) implemented ${plan.id}; another role reviews it.`);
  const open = o.approve ? uncommitted(store, plan) ?? [] : [];
  if (open.length) {
    fail(`${plan.id}'s worktree has uncommitted code: ${open.slice(0, 10).join(", ")}${open.length > 10 ? ", \u2026" : ""}. \`checkpoint ${plan.id}\` commits it on the plan's branch; then review again.`);
  }
  const branch = plan.get("branch") ?? "";
  const sha = branch && git(["rev-parse", "--verify", "-q", branch])?.trim() || null;
  store.ledger.record("review", plan.id, { verdict: o.approve ? "approve" : "changes", sha, ...o.changes ? { text: o.changes } : {} });
  if (o.changes) {
    plan.appendLog(`review: changes requested \u2014 ${o.changes}`, "Progress log");
    plan.save();
    move(store, plan.id, "in-progress", `changes requested: ${o.changes}`, false, void 0, "plan.reviewed");
  } else store.say(`${plan.id}: approved${sha ? ` at ${sha.slice(0, 7)}` : ""}`);
}
function reviewProblems(store, plan) {
  if (!store.policy.policy.role_gates["plan.reviewed"]) return [];
  const last = store.ledger.events().filter((e) => e.type === "review" && e.ref === plan.id).at(-1);
  const how = `\`review ${plan.id} --approve\` by the ${store.policy.policy.role_gates["plan.reviewed"]}`;
  if (!last) return [`no code review yet: ${how}`];
  if (last.verdict !== "approve") return [`the last review asked for changes: ${last.text}`];
  const code = lastCode(plan.get("branch") ?? "");
  const dirty2 = uncommitted(store, plan) ?? (currentBranch() !== plan.get("branch") ? [] : (git(["status", "--porcelain"]) ?? "").split("\n").filter((l) => l.trim() && !l.slice(3).startsWith(".crew/")));
  const covered = !code || !!last.sha && git(["merge-base", "--is-ancestor", code, String(last.sha)]) !== null;
  return covered && !dirty2.length ? [] : [`the code changed since the approving review (${String(last.sha ?? "?").slice(0, 7)}): ${how} again`];
}

// src/hub/commands/work/workflow.ts
var LOG_SECTION = { item: "Notes" };
function move(store, docId, status2, note, force = false, approvedBy, via) {
  store.require();
  docId = docId.toUpperCase();
  const kind = kindOf(docId);
  const doc = store.find(docId);
  const flow = FLOWS[kind];
  const old = doc.get("status") ?? "";
  if (!Object.hasOwn(flow, status2)) fail(`Unknown status '${status2}'. Valid: ${Object.keys(flow).join(", ")}`);
  if (!(flow[old] ?? []).includes(status2) && !force) {
    const allowed = [...flow[old] ?? []].sort().join(", ") || "none";
    fail(`${docId}: ${old} \u2192 ${status2} not allowed (from ${old}: ${allowed}). Use --force to override.`);
  }
  if (!force) guard2(store, kind, doc, status2, approvedBy);
  const waiting = FORWARD.has(status2) ? openQuestions(store.ledger.events(), doc.id).filter((x) => x.blocking) : [];
  if (waiting.length && !force) {
    fail(`${doc.id} waits for an answer before it moves on:
  - ${waiting.map((x) => `${x.id} \u2192 ${x.to}: ${x.text}`).join("\n  - ")}
(\`crew.mjs questions\`; --force to move anyway)`);
  }
  if (kind === "plan" && status2 === "in-progress" && !via) assignedHere(store, doc.id);
  const lane = kind === "plan" && status2 === "ready" && fastLane(store, doc);
  authorize(store, doc.id, via ?? `${kind}.${status2}`, approvedBy, via ? void 0 : old, void 0, lane ? ["pm"] : []);
  if (kind === "plan" && status2 === "in-progress" && !via) claimFor(store, doc, force);
  if (kind === "plan" && status2 === "in-review") commitWork(store, doc, `chore(${doc.id}): hand over to review`);
  stamp(kind, doc, status2);
  doc.set("status", status2);
  if (kind === "plan" && status2 === "in-review" && doc.source === "worktree") writeHandoff(store, doc);
  if (kind === "plan" && old === "in-review" && status2 === "in-progress") {
    escalateLimit(store, doc.id, bounces(store.ledger.events(), doc.id) + 1, store.policy.policy.limits.max_bounces, "came back from review");
  }
  const approval = approvedBy ? ` (approved by ${approvedBy})` : "";
  doc.appendLog(`status ${old} \u2192 ${status2}` + (note ? ` \u2014 ${note}` : "") + approval, LOG_SECTION[kind] ?? "Progress log");
  doc.save();
  store.ledger.record("move", doc.id, {
    from: old,
    to: status2,
    ...note ? { note } : {},
    ...approvedBy ? { approved_by: approvedBy } : {},
    ...via ? { via } : {}
  });
  if (CLOSED.has(status2) && store.ledger.claims().has(doc.id)) store.ledger.record("release", doc.id, { reason: status2 });
  if (kind === "goal" && status2 === "done") notify(store, "goal-done", doc.id, `${doc.id} is done: ${doc.get("title")}`);
  store.say(`${doc.id}: ${old} \u2192 ${status2}`);
  return doc;
}
function authorize(store, id, transition, approvedBy, from, cmd = `move ${id} ${transition.split(".")[1]}`, also = []) {
  const { policy: policy2, errors } = store.policy;
  if (errors.length) fail(`The policy is invalid, so nothing moves until it is fixed (\`crew.mjs policy check\`):
  - ${errors.join("\n  - ")}`);
  if (approvedBy !== void 0 && !approvedBy.trim()) fail("--approved-by needs the approving person's name.");
  if (approvedBy) return;
  const reason = approvalReason(policy2, transition);
  const [, status2] = transition.split(".");
  if (reason) {
    fail(`${id} \u2192 ${status2} is ${reason}: a human approves it with \`crew.mjs ${cmd} --approved-by <name>\` (agents over MCP can't). Ask the ${policy2.escalation.to} first.`);
  }
  const [kind] = transition.split(".");
  const role = (from ? policy2.role_gates[`${kind}.${from}>${status2}`] : void 0) ?? policy2.role_gates[transition];
  const mine = store.ledger.who.role;
  if (role && mine !== role && !also.includes(mine ?? "")) fail(`${id} \u2192 ${status2} is for the ${role} role; this run is ${mine ? `the ${mine} role` : "in no role"} (CREW_ROLE).`);
}
function claimFor(store, doc, force) {
  const held = store.ledger.claims().get(doc.id);
  if (held?.run === store.ledger.who.run) return;
  if (held && !force) {
    fail(`${doc.id} is claimed by ${held.actor} (${held.run}, ${held.worktree}) since ${held.ts.slice(0, 10)}. Coordinate with them, or \`release ${doc.id} --force\` if that run is gone.`);
  }
  store.ledger.record("claim", doc.id, { branch: doc.get("branch") ?? "", ...force ? { force: true } : {} });
}
function budgetProblems(store) {
  const { budgets } = store.policy.policy;
  const events = store.ledger.events(), me = store.ledger.who.run;
  const mine = store.ledger.spend(events.filter((e) => e.run === me)), all = store.ledger.spend(events);
  const over = (what, used, cap, unit = "") => cap !== null && used >= cap ? [`${what}: ${unit}${+used.toFixed(2)} used of ${unit}${cap}`] : [];
  const holders = new Set([...store.ledger.claims(events).values()].map((c) => c.run));
  const agents3 = budgets.max_agents !== null && !holders.has(me) && holders.size >= budgets.max_agents ? [`max_agents: ${holders.size} runs already hold work (limit ${budgets.max_agents})`] : [];
  return [
    ...over("run cost", mine.cost, budgets.run.max_cost, "$"),
    ...over("run tokens", mine.tokensIn + mine.tokensOut, budgets.run.max_tokens),
    ...over("project cost", all.cost, budgets.project.max_cost, "$"),
    ...over("project tokens", all.tokensIn + all.tokensOut, budgets.project.max_tokens),
    ...agents3
  ];
}
function guard2(store, kind, doc, status2, approvedBy) {
  let problems = [];
  let label = "";
  if (kind === "plan" && status2 === "ready") {
    problems = readinessProblems(store, doc);
    label = "is not ready (Definition of Ready)";
  } else if (kind === "plan" && status2 === "in-review") {
    problems = learningsProblems(doc, new Set(store.knowledge().map((e) => e.id)));
    label = "can't go to review";
  } else if (kind === "plan" && status2 === "done") {
    problems = [
      ...doc.tasks().filter(([done]) => !done).map(([, t]) => `unchecked task: ${t}`),
      ...evidenceProblems(store, doc, approvedBy),
      ...reviewProblems(store, doc)
    ];
    label = "can't be done";
  } else if (kind === "goal" && status2 === "done") {
    problems = goalProblems(store, doc);
    label = "isn't reached";
  } else if (kind === "goal" && status2 === "active") {
    problems = doc.missing(["Outcome", "Acceptance criteria"]).map((n2) => `empty section: ${n2}`);
    label = "can't be active";
  } else if (kind === "item" && status2 === "triaged") {
    problems = triageProblems(doc);
    label = "can't be triaged";
  } else if (kind === "idea" && status2 === "decided") {
    problems = decisionProblems(doc);
    label = "can't be decided";
  }
  if (problems.length) fail(`${doc.id} ${label}:
  - ${problems.join("\n  - ")}
(--force to override)`);
}
function stamp(kind, doc, status2) {
  if (kind === "plan" && status2 === "in-progress" && !doc.get("started")) doc.set("started", today());
  if (kind === "idea" && status2 === "decided") doc.set("decided", today());
  if (kind === "item" && ITEM_CLOSED.has(status2)) doc.set("closed", today());
  if (status2 === "done") doc.set("completed", today());
}
function start(store, planId, force = false, approvedBy) {
  store.require();
  refuseWhilePaused(store, "new starts");
  let doc = store.find(planId);
  const branch = doc.get("branch") || `plan/${doc.id}-${slugify(doc.get("title") ?? "")}`;
  const takeover = planBranches().includes(branch) && !store.ledger.claims().has(doc.id) && ["in-progress", "blocked"].includes(store.ledger.lastStatus().get(doc.id) ?? doc.get("status") ?? "");
  const held = store.ledger.claims().get(doc.id);
  if (held && held.run !== store.ledger.who.run && !force) {
    fail(`${doc.id} is claimed by ${held.actor} (${held.run}, ${held.worktree}) since ${held.ts.slice(0, 10)}. Coordinate with them, or \`release ${doc.id} --force\` if that run is gone.`);
  }
  if (!force && !takeover) checkStartable(store, doc);
  const over = budgetProblems(store);
  if (over.length && !approvedBy) {
    fail(`Over budget \u2014 no new work without a human's approval (\`start ${doc.id} --approved-by <name>\`):
  - ${over.join("\n  - ")}`);
  }
  const asked = openQuestions(store.ledger.events(), doc.id).filter((x) => x.blocking);
  if (asked.length && !force) {
    fail(`${doc.id} waits for an answer before it starts:
  - ${asked.map((x) => `${x.id} \u2192 ${x.to}: ${x.text}`).join("\n  - ")}
(\`crew.mjs questions\`; --force to start anyway)`);
  }
  assignedHere(store, doc.id);
  authorize(store, doc.id, "plan.in-progress", approvedBy, "ready");
  const shared2 = store.settings().plan_worktrees;
  if (!shared2 && !treeIsClean(store.rel(store.dir))) fail("Working tree not clean. Commit or stash first (changes under the hub's directory may stay).");
  const focus = store.focus();
  if (!onFocus(doc, store.items(), focus)) store.say(`note: ${planId} does not serve the focus goal ${focus}`);
  const plans2 = store.plans(true);
  for (const o of overlapping(doc, plans2, sharedGlobs(store)).filter((x) => plans2.get(x.id)?.get("status") !== "ready")) {
    store.say(`warning: ${planId} overlaps ${o.id} (in progress) on ${o.globs.join(", ")} \u2014 expect conflicts at release; narrow touches or list the file in hub.shared`);
  }
  if (shared2) {
    const home2 = store.planHome(doc.id) ?? openPlanWorktree(store, doc.id, branch);
    claimPlan(store, planId, branch, force, takeover, approvedBy);
    store.say(`${doc.id}: work in ${store.ws.rel(home2) || "this checkout"} (${branch}) \u2014 claimed by ${store.ledger.who.actor} (${store.ledger.who.run}); checkpoints commit its code on the branch`);
    return;
  }
  const from = currentBranch(), sha = git(["rev-parse", "HEAD"])?.trim();
  git(takeover ? ["switch", "--ignore-other-worktrees", branch] : ["switch", "-c", branch], true);
  store.ws.onAbort(() => {
    git(from ? ["switch", "-q", from] : ["switch", "-q", "--detach", sha ?? "HEAD"]);
    if (!takeover) git(["branch", "-D", branch]);
  });
  claimPlan(store, planId, branch, force, takeover, approvedBy);
  store.say(`Switched to ${branch} \u2014 claimed by ${store.ledger.who.actor} (${store.ledger.who.run})`);
}
function claimPlan(store, planId, branch, force, takeover, approvedBy) {
  const doc = store.find(planId);
  if (doc.get("status") === "draft" && force) {
    doc.set("status", "ready");
    doc.save();
  }
  store.ledger.record("claim", doc.id, { branch, ...force ? { force: true } : {}, ...takeover ? { takeover: true } : {} });
  if (doc.get("status") !== "in-progress") move(store, planId, "in-progress", `branch ${branch}`, force, approvedBy);
  else store.say(`${doc.id}: taken over where it stopped \u2014 \`resume ${doc.id}\``);
}
function assignedHere(store, id) {
  const a = store.ledger.assignments().get(id), me = store.ledger.who.role, by = store.policy.policy.role_gates["plan.assigned"];
  if (!a && by) fail(`${id} isn't assigned yet: the ${by} opens it with \`assign ${id} --to developer\`.`);
  if (a && a.to !== me) fail(`${id} is assigned to the ${a.to} role; this run is ${me ? `the ${me} role` : "in no role"}.`);
}
function checkStartable(store, doc) {
  if (doc.get("status") !== "ready") {
    fail(`${doc.id} is '${doc.get("status")}', not 'ready'. Refine it first or use --force.`);
  }
  const plans2 = store.plans(true);
  const waiting = unmetDeps(doc, plans2);
  if (waiting.length) fail(`${doc.id} depends on unfinished plans: ${waiting.join(", ")}. (--force to start anyway)`);
  const limit = store.settings().wip_limit;
  const wip = myWip(store, plans2);
  if (wip.length >= limit) {
    fail(`WIP limit (${limit}) reached: ${wip.join(", ")} in progress. Finish or block it first (--force to override).`);
  }
}
function myWip(store, plans2) {
  const claims = store.ledger.claims();
  return [...plans2.values()].filter((p) => p.get("status") === "in-progress" && (claims.get(p.id)?.run ?? store.ledger.who.run) === store.ledger.who.run).map((p) => p.id);
}
function release(store, planId, note, force = false) {
  store.require();
  const id = planId.toUpperCase();
  const held = store.ledger.claims().get(id) ?? fail(`${id} is not claimed.`);
  if (held.run !== store.ledger.who.run && !force) {
    fail(`${id} is claimed by ${held.actor} (${held.run}), not this run. Use --force to release it anyway.`);
  }
  store.ledger.record("release", id, { reason: note ?? "released", from_run: held.run });
  store.say(`${id}: released (was ${held.actor}, ${held.run})`);
}
function usage(store, u) {
  store.require();
  if (u.tokensIn === void 0 && u.tokensOut === void 0 && u.cost === void 0) fail("Give --tokens-in, --tokens-out or --cost.");
  if (u.cost !== void 0 && !(Number.isFinite(u.cost) && u.cost >= 0)) fail("--cost must be a number \u2265 0.");
  for (const [flag, n2] of [["--tokens-in", u.tokensIn], ["--tokens-out", u.tokensOut]]) {
    if (n2 !== void 0 && !(Number.isInteger(n2) && n2 >= 0)) fail(`${flag} must be a whole number \u2265 0.`);
  }
  store.ledger.record("usage", u.ref ? u.ref.toUpperCase() : null, {
    tokens_in: u.tokensIn ?? 0,
    tokens_out: u.tokensOut ?? 0,
    cost: u.cost ?? 0,
    ...u.model ? { model: u.model } : {}
  });
  store.say(`usage recorded for ${store.ledger.who.actor} (${store.ledger.who.run})`);
  const over = budgetProblems(store);
  if (over.length) store.say(`warning: over budget \u2014 new work needs a human's approval: ${over.join("; ")}`);
}
function log(store, docId, text2) {
  const doc = store.find(docId);
  doc.appendLog(text2, LOG_SECTION[kindOf(docId) ?? "plan"] ?? "Progress log");
  doc.save();
  store.ledger.record("log", doc.id, { text: text2 });
}

// src/hub/commands/work/backlog.ts
function createItem(store, prefix, title, body2, fields) {
  const iid = store.nextId(prefix, "item");
  const doc = store.build(`item-${ITEM_TYPES[prefix]}.md`, body2, { id: iid, title, type: ITEM_TYPES[prefix], ...fields });
  return store.writeNew(doc, `${store.dirs.item}/${iid}-${slugify(title)}.md`);
}
function checkSeverity(severity) {
  const s2 = (severity ?? "").toUpperCase();
  if (s2 && !Object.hasOwn(SEVERITY_PRIORITY, s2)) fail(`Severity must be one of ${Object.keys(SEVERITY_PRIORITY).join(", ")}.`);
  return s2;
}
function newItem(store, typ, title, draftPath, why, o = {}) {
  store.require();
  const prefix = typ.toUpperCase();
  if (!Object.hasOwn(ITEM_TYPES, prefix)) fail(`Unknown item type '${typ}'. Use feat, bug, chore or spike.`);
  if (Boolean(draftPath) === Boolean(why)) fail("Give exactly one of --from DRAFT or --why TEXT.");
  const [draftFile, body2] = draftPath ? store.readDraft(draftPath, "item") : [null, `## Summary
${why}
`];
  const severity = checkSeverity(o.severity);
  if (severity && prefix !== "BUG") fail("--severity applies to bugs only.");
  const fields = {
    goal: store.checkRef(o.goal, "goal"),
    priority: Store.checkPriority(o.priority) || (SEVERITY_PRIORITY[severity] ?? ""),
    severity
  };
  const probe = store.build(`item-${ITEM_TYPES[prefix]}.md`, body2, { id: "X", title, ...fields });
  if (!splitSections(probe.text)[1].some(([h]) => probe.hasContent(h))) fail("The item has no content. Nothing was created.");
  const it = createItem(store, prefix, title, body2, fields);
  if (draftFile) store.consume(draftFile, o.keep);
  if (o.priority || severity) {
    const problems = triageProblems(it);
    const human = approvalReason(store.policy.policy, "item.triaged");
    if (problems.length) store.say(`note: ${it.id} stays new until triaged \u2014 ${problems.join("; ")}`);
    else if (human) store.say(`note: ${it.id} stays new \u2014 triage is ${human}: \`triage ${it.id} --approved-by <name>\``);
    else move(store, it.id, "triaged", summary(it));
  }
}
var summary = (it) => ["priority", "severity"].filter((k) => it.get(k)).map((k) => `${k} ${it.get(k)}`).join(", ");
function triage(store, itemId, o = {}) {
  store.require();
  const item = store.find(itemId);
  if (!item.get("type")) fail("triage works on FEAT/BUG/CHORE/SPIKE items.");
  if (o.reject) {
    if (!o.note) fail("--reject needs --note (why, or which item it duplicates).");
    move(store, itemId, o.reject, o.note, false, o.approvedBy);
    return;
  }
  let priority = o.priority;
  const severity = checkSeverity(o.severity);
  if (severity) {
    item.set("severity", severity);
    if (!priority && !item.get("priority")) priority = SEVERITY_PRIORITY[severity];
  }
  const updates = [["priority", Store.checkPriority(priority)], ["goal", store.checkRef(o.goal, "goal")]];
  for (const [key, value] of updates) if (value) item.set(key, value);
  const problems = triageProblems(item);
  if (problems.length) fail(`${item.id} can't be triaged:
  - ${problems.join("\n  - ")}
Nothing was changed.`);
  if (item.get("status") === "triaged") {
    item.appendLog(`re-triaged: ${summary(item)}`, "Notes");
    item.save();
    store.say(`${item.id}: updated`);
    return;
  }
  item.save();
  move(store, item.id, "triaged", summary(item), false, o.approvedBy);
}
function breakdownToItems(store, goal) {
  const items2 = store.items();
  for (const cand of goal.bullets("Breakdown")) {
    if (cand.startsWith("~~")) continue;
    const m = /^(FEAT|BUG|CHORE|SPIKE)-\d+/.exec(cand);
    if (m) {
      linkExisting(goal, items2.get(m[0]) ?? null, m[0]);
      continue;
    }
    const it = itemFromCandidate(store, goal, cand);
    goal.text = goal.text.replace(`- ${cand}`, () => `- ${it.id}: ${cand}`);
  }
  goal.save();
}
function linkExisting(goal, item, itemId) {
  if (!item) fail(`${goal.id}: Breakdown references unknown item ${itemId}.`);
  if (!item.get("goal")) {
    item.set("goal", goal.id);
    item.save();
  }
}
function itemFromCandidate(store, goal, cand) {
  const sep2 = /\s+[—–-]\s+|:\s/.exec(cand);
  const [name, desc] = sep2 ? [cand.slice(0, sep2.index).trim(), cand.slice(sep2.index + sep2[0].length).trim()] : [cand, ""];
  const body2 = `## Summary
${desc || name}

Slice of ${goal.id} (${goal.get("title")}): ${cand}
`;
  const it = createItem(store, "FEAT", name, body2, { goal: goal.id, priority: goal.get("priority") || "P2" });
  if (!triageProblems(it).length && !approvalReason(store.policy.policy, "item.triaged")) {
    it.set("status", "triaged");
    it.appendLog(`triaged from ${goal.id} breakdown`, "Notes");
    it.save();
  }
  return it;
}

// src/hub/commands/views/export.ts
import { join as join15, resolve as resolve6 } from "node:path";

// src/hub/commands/views/graph.ts
import { basename as basename5 } from "node:path";

// src/hub/graph-types.ts
var SCHEMA_VERSION = 6;

// src/hub/commands/team/team.ts
var ACTIVE2 = /* @__PURE__ */ new Set(["in-progress", "blocked", "in-review"]);
function assign(store, planId, to, team, note, approvedBy) {
  store.require();
  const doc = store.find(store.checkRef(planId, "plan"));
  const { roles, teams } = store.policy;
  if (!roles.includes(to)) fail(`'${to}' is not a role (${roles.join(", ")}).`);
  if (team && !Object.hasOwn(teams, team)) fail(`team '${team}' is not defined under teams: in .crew/policy.yaml.`);
  if (doc.get("status") !== "ready") fail(`${doc.id} is '${doc.get("status")}': only a ready plan is assigned (\`move ${doc.id} ready\` first).`);
  authorize(store, doc.id, "plan.assigned", approvedBy, void 0, `assign ${doc.id} --to ${to}`);
  doc.set("assignee", team ? `${to} (team ${team})` : to);
  doc.appendLog(`assigned to the ${to} role${team ? `, team ${team}` : ""}${note ? ` \u2014 ${note}` : ""}`, "Progress log");
  doc.save();
  store.ledger.record("assign", doc.id, {
    to,
    ...team ? { team } : {},
    ...note ? { note } : {},
    ...approvedBy ? { approved_by: approvedBy } : {}
  });
  store.say(`${doc.id}: assigned to the ${to} role${team ? `, team ${team}` : ""}`);
}
function reassign(store, planId, to, note, force = false, approvedBy) {
  store.require();
  const id = store.checkRef(planId, "plan");
  store.find(id);
  const events = store.ledger.events(), claim = store.ledger.claims(events).get(id), was = store.ledger.assignments(events).get(id);
  const target = to ?? was?.to ?? "developer";
  if (!store.policy.roles.includes(target)) fail(`'${target}' is not a role (${store.policy.roles.join(", ")}).`);
  if (!claim && !was) fail(`${id} is neither claimed nor assigned: \`assign\` it instead.`);
  authorize(store, id, "plan.reassigned", approvedBy, void 0, `reassign ${id}`);
  if (claim && !force && !staleClaims(store, events).some((s2) => s2.ref === id)) {
    fail(`${id} is held by ${claim.actor} (${claim.run}) and not stale (limits.stale_claim_hours). Reassign stale work, or --force.`);
  }
  if (claim) store.ledger.record("release", id, { reason: "reassigned", from_run: claim.run });
  store.ledger.record("assign", id, { to: target, reassigned: true, ...note ? { note } : {}, ...approvedBy ? { approved_by: approvedBy } : {} });
  store.say(`${id}: reassigned to the ${target} role${claim ? ` (released ${claim.actor}, ${claim.run})` : ""} \u2014 the next ${target} takes it over with \`start ${id}\`, which resumes its branch`);
}
function teamFor(plan, teams) {
  const touches2 = plan.touches();
  const score = (scope) => touches2.filter((t) => scope.some((s2) => globsOverlap(t, s2))).length;
  const best = Object.entries(teams).filter(([, s2]) => s2.length && score(s2) > 0).sort(byKey(([n2, s2]) => [-score(s2), n2]))[0];
  return best?.[0] ?? null;
}
function staffing(store) {
  const plans2 = store.plans(true), items2 = store.items(), goals2 = store.goals(), focus = store.focus();
  const events = store.ledger.events(), assigned = store.ledger.assignments(events);
  const holders = new Set([...store.ledger.claims(events).values()].map((c) => c.run));
  const max = store.policy.policy.budgets.max_agents;
  const free = max === null ? null : Math.max(0, max - holders.size);
  const order = new Map(ranked(items2, goals2, focus).map((it, i) => [it.id, i]));
  const rank = (p) => Math.min(...planItems(p, items2).map((it) => order.get(it.id) ?? Infinity), Infinity);
  const moved = store.ledger.lastStatus(events), claims = store.ledger.claims(events);
  const st = (p) => claims.has(p.id) ? "in-progress" : moved.get(p.id) ?? p.get("status") ?? "";
  const ready = [...plans2.values()].filter((p) => st(p) === "ready").sort(byKey((p) => [!onFocus(p, items2, focus), rank(p), p.id]));
  const busy = [...plans2.values()].filter((p) => ACTIVE2.has(st(p)));
  const out = { free, start: [], waiting: [] };
  const shared2 = sharedGlobs(store);
  const clash = (p, others) => others.find((o) => blockingGlobs(p, o, shared2).length);
  for (const p of ready) {
    const deps = unmetDeps(p, plans2), blocked2 = openQuestions(events, p.id).filter((x) => x.blocking);
    const hit = clash(p, [...busy, ...out.start.map((s2) => plans2.get(s2.id))]);
    const why = deps.length ? `depends on ${deps.join(", ")}` : blocked2.length ? `waits for an answer (${blocked2.map((x) => x.id).join(", ")})` : hit ? `overlaps ${hit.id} on its touches` : free !== null && out.start.length >= free ? "no free agent (budgets.max_agents)" : "";
    if (why) out.waiting.push({ id: p.id, why });
    else out.start.push({ id: p.id, title: p.get("title") ?? "", team: teamFor(p, store.policy.teams), assigned: assigned.get(p.id)?.to ?? null });
  }
  return out;
}
function staff(store, json = false) {
  store.require();
  refuseWhilePaused(store, "new staffing");
  const s2 = staffing(store);
  if (json) {
    store.say(JSON.stringify(s2, null, 2));
    return;
  }
  store.say(s2.free === null ? "Staffing (no max_agents):" : `Staffing: ${s2.free} agent${s2.free === 1 ? "" : "s"} free (budgets.max_agents).`);
  for (const p of s2.start) {
    const team = p.team ? ` --team ${p.team}` : "";
    store.say(`  START  ${p.id}: ${p.title}${p.team ? ` [team ${p.team}]` : ""} \u2192 ` + (p.assigned ? `assigned to ${p.assigned}: hand it to a ${p.assigned} agent` : `PM: assign ${p.id} --to developer${team}`));
  }
  for (const w of s2.waiting) store.say(`  WAIT   ${w.id}: ${w.why}`);
  if (!s2.start.length && !s2.waiting.length) store.say("  nothing ready to start \u2014 the PM ranks, the Architect specs the next plans");
}

// src/hub/commands/work/release.ts
import { chmodSync as chmodSync2, copyFileSync as copyFileSync2, existsSync as existsSync9, readFileSync as readFileSync8, statSync as statSync6 } from "node:fs";
import { isAbsolute as isAbsolute4, join as join14, normalize } from "node:path";
function mergeOrder(store) {
  const base2 = store.baseBranch(), plans2 = store.plans(true), events = store.ledger.events(), moved = store.ledger.lastStatus(events);
  const doneAt = new Map(events.filter((e) => e.type === "move" && e.to === "done").map((e) => [e.ref, e.ts]));
  const branches = new Set(planBranches());
  const status2 = (p) => moved.get(p.id) ?? p.get("status") ?? "";
  const worktrees2 = new Map([...store.settings().plan_worktrees ? store.planWorktrees() : []].filter(([, wt]) => dirty(wt, ".").length));
  const merged = /* @__PURE__ */ new Map();
  const isMerged = (p) => {
    const b = p.get("branch");
    if (!merged.has(p.id)) merged.set(p.id, !worktrees2.has(p.id) && (git(["merge-base", "--is-ancestor", b, base2]) !== null || squashMerge(b, base2, p.id) !== null));
    return merged.get(p.id);
  };
  const out = { base: base2, merge: [], waiting: [], merged: [] };
  const done = [...plans2.values()].filter((p) => status2(p) === "done" && branches.has(p.get("branch") ?? "")).sort(byKey((p) => [doneAt.get(p.id) ?? p.get("completed") ?? "", p.id]));
  const pending = /* @__PURE__ */ new Set();
  for (const p of done) {
    if (isMerged(p)) out.merged.push({ id: p.id, branch: p.get("branch") });
    else pending.add(p.id);
  }
  const unmergedDep = (p) => p.dependsOn().filter((d) => {
    const dep = plans2.get(d), b = dep?.get("branch") ?? "";
    return dep && status2(dep) !== "dropped" && (pending.has(d) || branches.has(b) && !isMerged(dep) || status2(dep) !== "done");
  });
  const placed = /* @__PURE__ */ new Set();
  for (let progress = true; progress; ) {
    progress = false;
    for (const p of done.filter((x) => pending.has(x.id) && !placed.has(x.id))) {
      if (unmergedDep(p).every((d) => placed.has(d))) {
        const wt = worktrees2.get(p.id);
        out.merge.push({ id: p.id, title: p.get("title") ?? "", branch: p.get("branch"), ...wt ? { worktree: store.rel(wt) } : {} });
        placed.add(p.id);
        progress = true;
      }
    }
  }
  for (const p of done.filter((x) => pending.has(x.id) && !placed.has(x.id))) {
    out.waiting.push({ id: p.id, why: `depends on ${unmergedDep(p).filter((d) => !placed.has(d)).join(", ")}, not merged yet` });
  }
  return out;
}
function mergeOrderCmd(store, json = false) {
  store.require();
  const m = mergeOrder(store);
  if (json) return store.say(JSON.stringify(m, null, 2));
  if (!m.merge.length && !m.waiting.length) store.say(`Nothing to merge into ${m.base}.`);
  m.merge.forEach((p, i) => store.say(`${String(i + 1).padStart(2)}. ${p.id}: ${p.title} \u2014 ` + (p.worktree ? `commit everything in ${p.worktree} once (\`<type>(${p.id}): ${p.title}\`), squash-merge ${p.branch} into ${m.base}, then \`git worktree remove ${p.worktree}\` and delete the branch` : `merge ${p.branch} into ${m.base}`)));
  for (const w of m.waiting) store.say(`WAIT ${w.id}: ${w.why}`);
  for (const p of m.merged) store.say(`merged: ${p.id} (${p.branch}) \u2014 delete the branch`);
}
function refreshBin(store, root, check2) {
  const { from, files: files2 } = store.policy.policy.release.refresh_bin;
  if (!from || !files2.length) {
    if (check2) return store.say("refresh-bin: nothing to check (no release.refresh_bin in the policy)"), 0;
    fail("refresh-bin: the policy has no release.refresh_bin (from, files); the executive sets it in .crew/policy.yaml");
  }
  const src = normalize(from).replace(/\\/g, "/").replace(/\/+$/, "");
  if (isAbsolute4(from) || src === ".." || src.startsWith("../") || src === ".crew" || src.startsWith(".crew/")) {
    fail(`refresh-bin: release.refresh_bin.from '${from}' must be a relative path inside the checkout, not under .crew/`);
  }
  const bad2 = files2.filter((f) => !/^\w[\w.-]*$/.test(f));
  if (bad2.length) fail(`refresh-bin: release.refresh_bin.files must be bare file names in .crew/bin: ${bad2.join(", ")}`);
  const stale = [];
  for (const f of files2) {
    const s2 = join14(root, src, f), t = join14(root, ".crew", "bin", f);
    if (!existsSync9(s2) || !existsSync9(t)) {
      store.say(`skipped .crew/bin/${f}: ${existsSync9(t) ? `${src}/${f} does not exist` : "not vendored here (refresh-bin never adds a file)"}`);
    } else if (!readFileSync8(s2).equals(readFileSync8(t))) stale.push(f);
  }
  if (check2) {
    for (const f of stale) store.say(`stale: .crew/bin/${f} differs from ${src}/${f} (Release runs \`crew.mjs refresh-bin\`)`);
    if (!stale.length) store.say(`refresh-bin: .crew/bin is up to date with ${src}`);
    return stale.length ? 1 : 0;
  }
  const role = store.ledger.who.role;
  if (role !== "release") fail(`refresh-bin: only the release role refreshes .crew/bin; this run is ${role ? `the ${role} role` : "no role"}`);
  const branch = git(["-C", root, "branch", "--show-current"])?.trim() ?? "";
  const plan = [...store.plans().values()].find((p) => branch && p.get("branch") === branch && p.get("status") !== "dropped");
  if (!plan) fail(`refresh-bin: this checkout (branch '${branch || "none"}') is not a plan's worktree; run it in the plan's worktree`);
  for (const f of stale) {
    const t = join14(root, ".crew", "bin", f), mode = statSync6(t).mode;
    copyFileSync2(join14(root, src, f), t);
    chmodSync2(t, mode & 4095);
    store.say(`refreshed .crew/bin/${f} from ${src}/${f}`);
  }
  if (!stale.length) store.say(`refresh-bin: .crew/bin is up to date with ${src}`);
  return 0;
}

// src/hub/commands/team/roles.ts
var View = class {
  constructor(store) {
    this.store = store;
    this.plans = store.plans(true);
    this.items = store.items();
    this.goals = store.goals();
    this.focus = store.focus();
    this.shared = sharedGlobs(store);
    this.events = store.ledger.events();
  }
  store;
  plans;
  items;
  goals;
  focus;
  shared;
  // hub.shared
  events;
  status(st) {
    return [...this.plans.values()].filter((p) => p.get("status") === st).sort(byKey((p) => [!onFocus(p, this.items, this.focus), p.id]));
  }
  get assigned() {
    return this.store.ledger.assignments(this.events);
  }
  gate(step) {
    return this.store.policy.policy.role_gates[step];
  }
  ranked(st) {
    return ranked(this.items, this.goals, this.focus).filter((i) => itemStatus(i, this.plans) === st);
  }
};
var RULES = {
  executive: [
    (v) => openQuestions(v.events).filter((x) => x.escalation).map((x) => `answer ${x.id} (${x.by}${x.ref ? ` about ${x.ref}` : ""}): ${x.text}`),
    (v) => v.status("in-review").filter((p) => approvalReason(v.store.policy.policy, "plan.done") && evidence(v.store, p).every((e) => e.verify?.ok && e.independent)).map((p) => `approve ${p.id}: ${p.get("title")} \u2014 evidence complete \u2192 move ${p.id} done --approved-by <you>`),
    (v) => ["exploring", "researching", "proposed"].includes(v.store.idea()?.get("status") ?? "") ? ["decide the idea (go / pivot / kill)"] : []
  ],
  director: [
    (v) => openQuestions(v.events).filter((x) => x.escalation).map((x) => `waiting on the executive: ${x.id} \u2014 ${x.text}`),
    (v) => budgetProblems(v.store).map((b) => `over budget: ${b}`),
    (v) => paused(v.events) ? ["the team is paused: no staffing or starts until the executive or you `resume`"] : [],
    (v) => staleClaims(v.store, v.events).map((s2) => `stale: ${s2.ref} held by ${s2.actor} with no activity for ${s2.hours}h \u2192 reassign ${s2.ref}`),
    (v) => v.status("blocked").map((p) => `unblock ${p.id}: ${p.get("title")}`),
    (v) => {
      if (paused(v.events)) return [];
      const n2 = staffing(v.store).start.length;
      return n2 ? [`staff ${n2} ready plan${n2 > 1 ? "s" : ""}: \`staff\` \u2192 the PM assigns, developers start`] : [];
    },
    (v) => [...v.plans.values()].filter((p) => p.get("status") === "in-progress").flatMap((p) => overlapping(p, v.plans, v.shared).map((o) => `${p.id} and ${o.id} overlap on ${o.globs.join(", ")} \u2014 sequence them, narrow touches or list the file in hub.shared`)),
    (v) => {
      const g = v.goals.get(v.focus);
      if (!v.focus) return v.goals.size ? ["set the focus goal: focus G-###"] : [];
      const open = goalPlans(v.focus, v.plans, v.items).filter((p) => !["done", "dropped"].includes(p.get("status") ?? ""));
      return g && !open.length && !goalItems(v.focus, v.items).some((i) => itemStatus(i, v.plans) !== "done") ? [`${v.focus} has nothing open: confirm its acceptance criteria, move it done, and focus the next goal`] : [];
    }
  ],
  pm: [
    (v) => v.ranked("new").filter((i) => i.id.startsWith("BUG-")).slice(0, 3).map((i) => `triage bug ${i.id}: ${i.get("title")}`),
    (v) => v.ranked("new").filter((i) => !i.id.startsWith("BUG-")).slice(0, 3).map((i) => `triage ${i.id}: ${i.get("title")}`),
    (v) => [...v.goals.values()].filter((g) => ["proposed", "active"].includes(g.get("status") ?? "") && !goalItems(g.id, v.items).some((i) => itemStatus(i, v.plans) !== "done")).map((g) => `break ${g.id} down: it has no open items`),
    (v) => (v.gate("plan.assigned") === "pm" ? v.status("ready").filter((p) => !v.assigned.has(p.id)) : []).map((p) => `open ${p.id}: ${p.get("title")} \u2192 assign ${p.id} --to developer (\`staff\` shows what can run now)`),
    (v) => (v.gate("plan.done") === "pm" ? v.status("in-review") : []).filter((p) => complete(v, p) && !reviewProblems(v.store, p).length).map((p) => `complete ${p.id}: ${p.get("title")} \u2014 QA's evidence and the review are in \u2192 move ${p.id} done`)
  ],
  architect: [
    (v) => (v.gate("plan.reviewed") === "architect" ? v.status("in-review") : []).filter((p) => reviewProblems(v.store, p).length && !implementers(v.events, p.id).has(v.store.ledger.who.run)).map((p) => `review ${p.id}: ${p.get("title")} \u2014 its diff against the spec \u2192 review ${p.id} --approve | --changes "\u2026"`),
    (v) => v.status("draft").map((p) => `refine ${p.id}: ${p.get("title")} to the Definition of Ready`),
    (v) => v.ranked("triaged").slice(0, 2).map((i) => `write a plan for ${i.id}: ${i.get("title")} (${i.get("priority")})`),
    (v) => v.status("ready").flatMap((p) => overlapping(p, v.plans, v.shared).map((o) => `${p.id} overlaps ${o.id} (${o.globs.join(", ")}): narrow touches or list the file in hub.shared`))
  ],
  developer: [
    (v) => [...v.plans.values()].filter((p) => ["in-progress", "blocked"].includes(p.get("status") ?? "") && v.store.ledger.claims(v.events).get(p.id)?.run === v.store.ledger.who.run).map((p) => `continue ${p.id}: ${p.get("title")} \u2192 resume ${p.id}`),
    (v) => v.status("ready").filter((p) => (v.assigned.has(p.id) ? v.assigned.get(p.id).to === v.store.ledger.who.role : !v.gate("plan.assigned")) && !unmetDeps(p, v.plans).length && !v.store.ledger.claims(v.events).has(p.id) && !openQuestions(v.events, p.id).some((x) => x.blocking)).slice(0, 1).map((p) => `start ${p.id}: ${p.get("title")} \u2192 start ${p.id}`)
  ],
  qa: [
    (v) => v.status("in-review").filter((p) => !implementers(v.events, p.id).has(v.store.ledger.who.run)).map((p) => {
      const missing = evidence(v.store, p).flatMap((e, i) => e.verify?.ok && e.independent ? [] : [`AC${i + 1}`]);
      const closer = v.gate("plan.done");
      return missing.length ? `verify ${p.id}: ${missing.join(", ")} \u2192 checkpoint ${p.id} --run "<check>" --ac \u2026` : closer && closer !== "qa" ? `${p.id}: evidence complete \u2192 report to the ${closer}, who completes it` : `${p.id}: evidence complete \u2192 move ${p.id} done`;
    }),
    (v) => v.ranked("new").filter((i) => i.id.startsWith("BUG-")).slice(0, 2).map((i) => `reproduce ${i.id}: ${i.get("title")}`)
  ],
  release: [
    (v) => mergeOrder(v.store).merge.slice(0, 1).map((p) => `ship ${p.id}: merge ${p.branch} (first in \`merge-order\`), follow its Rollout & rollback, then delete the branch`),
    (v) => v.status("in-review").filter((p) => !fastLane(v.store, p) && p.hasContent("Rollout & rollback") && !/^\s*n\/a\b/i.test(stripComments(p.section("Rollout & rollback")))).map((p) => `prepare the rollout of ${p.id}: ${p.get("title")} (see its Rollout & rollback)`)
  ]
};
var complete = (v, p) => evidence(v.store, p).every((e) => e.verify?.ok && e.independent);
function roleLines(store, role) {
  const roles = store.policy.roles;
  if (!roles.includes(role)) fail(`Unknown role '${role}'. Roles: ${roles.join(", ")}.`);
  const v = new View(store);
  const asked = openQuestions(v.events).filter((x) => x.to === role && !(role === "executive" && x.escalation)).map((x) => `QUESTION     ${x.id} from ${x.by}${x.ref ? ` about ${x.ref}` : ""}: ${x.text} \u2192 answer ${x.id} "\u2026"`);
  const work = (RULES[role] ?? []).flatMap((r) => r(v));
  return [
    ...asked,
    ...work.map((w, i) => `${i ? "THEN" : "NEXT"}         ${w}`).slice(0, 8),
    ...asked.length || work.length ? [] : [`NEXT         nothing for the ${role} role right now`]
  ];
}

// src/hub/commands/views/advisor.ts
function current(store) {
  if (!store.ws.isDir(store.dir)) return;
  const focus = store.focus();
  if (focus) store.say(`crew hub \u2014 focus ${focus}: ${store.goals().get(focus)?.get("title") ?? "(missing goal)"}`);
  const branch = currentBranch() ?? "";
  const m = /^plan\/(P-\d+)/.exec(branch);
  if (!m) {
    const active = [...store.plans(true).values()].filter((p) => ACTIVE.has(p.get("status") ?? ""));
    if (active.length) {
      store.say("crew hub \u2014 active plans: " + active.map((p) => `${p.id} (${p.get("status")})`).join(", "));
    }
    return;
  }
  const doc = store.plans().get(m[1]);
  if (!doc) {
    store.say(`crew hub: branch ${branch} has no matching plan file.`);
    return;
  }
  const tasks = doc.tasks();
  const nxt = tasks.find(([d]) => !d)?.[1];
  store.say(`crew hub \u2014 current plan ${doc.id}: ${doc.get("title")} [${doc.get("status")}] tasks ${tasks.filter(([d]) => d).length}/${tasks.length}` + (nxt ? ` \u2014 next: ${nxt}` : "") + ` \u2014 file: ${doc.path ? store.rel(doc.path) : ""}`);
}
function nextStep(store, role) {
  store.require();
  for (const line3 of role ? roleLines(store, role) : nextLines(store)) store.say(line3);
}
function nextLines(store) {
  const ctx = new Context(store);
  for (const p of ctx.active) ctx.lines.push(`IN PROGRESS  ${p.id}: ${p.get("title")} [${p.get("status")}]`);
  for (const rule of [ctx.expedite, ctx.wipFull, ctx.startReady, ctx.refineDraft, ctx.triage, ctx.planItem, ctx.idea, ctx.goal]) {
    const line3 = rule.call(ctx);
    if (line3) return [...ctx.lines, `NEXT         ${line3}`];
  }
  return [...ctx.lines, "NEXT         nothing planned \u2014 write a goal for the next outcome, or capture items"];
}
var Context = class {
  constructor(store) {
    this.store = store;
    this.goals = store.goals();
    this.items = store.items();
    this.plans = store.plans(true);
    this.focus = store.focus();
    this.active = [...this.plans.values()].filter((p) => ACTIVE.has(p.get("status") ?? "")).sort(byKey((p) => this.key(p)));
  }
  store;
  goals;
  items;
  plans;
  focus;
  active;
  lines = [];
  /** Focus work first, then goal order, then ID. */
  key(p) {
    const eorder = goalOrder(this.goals);
    return [!onFocus(p, this.items, this.focus), eorder.get(planGoal(p, this.items)) ?? eorder.size, p.id];
  }
  withStatus(status2) {
    return [...this.plans.values()].filter((p) => p.get("status") === status2).sort(byKey((p) => this.key(p)));
  }
  ranked(status2) {
    return ranked(this.items, this.goals, this.focus).filter((i) => itemStatus(i, this.plans) === status2);
  }
  expedite() {
    const bugs = [...this.items.values()].filter((i) => i.id.startsWith("BUG-") && i.get("priority") === "P0" && ["new", "triaged"].includes(itemStatus(i, this.plans))).map((i) => i.id).sort();
    if (!bugs.length) return null;
    const b = this.items.get(bugs[0]);
    return `expedite ${b.id}: ${b.get("title")} (P0) \u2192 write a fix plan: new-plan \u2026 --items ${b.id}`;
  }
  wipFull() {
    const limit = this.store.settings().wip_limit;
    const wip = this.active.filter((p) => p.get("status") === "in-progress");
    return wip.length >= limit ? `finish ${wip[0].id} (WIP limit ${limit})` : null;
  }
  startReady() {
    const ready = this.withStatus("ready");
    const startable = ready.filter((p2) => !unmetDeps(p2, this.plans).length);
    for (const p2 of ready) {
      if (!startable.includes(p2)) {
        this.lines.push(`WAITING      ${p2.id}: ${p2.get("title")} \u2014 needs ${unmetDeps(p2, this.plans).join(", ")}`);
      }
    }
    if (!startable.length) return null;
    const p = startable[0];
    const off = onFocus(p, this.items, this.focus) ? "" : ` (off focus ${this.focus})`;
    return `${p.id}: ${p.get("title")} \u2192 crew.mjs start ${p.id}${off}`;
  }
  refineDraft() {
    const [d] = this.withStatus("draft");
    return d ? `refine draft ${d.id}: ${d.get("title")} to meet the Definition of Ready, then move it to ready` : null;
  }
  triage() {
    const fresh = this.ranked("new");
    return fresh.length ? `triage ${fresh.length} item(s), starting with ${fresh[0].id}: ${fresh[0].get("title")}` : null;
  }
  planItem() {
    const [i] = this.ranked("triaged");
    if (!i) return null;
    return `write a plan for ${i.id}: ${i.get("title")} (${i.get("priority")})` + (i.get("goal") ? ` \u2014 goal ${i.get("goal")}` : "");
  }
  idea() {
    const idea2 = this.store.idea();
    if (!idea2) return "write the idea (problem, outcome, success criteria) \u2192 new-idea TITLE --from DRAFT";
    const st = idea2.get("status");
    return st === "decided" || st === "killed" ? null : `take the idea from ${st} to a decision (go / pivot / kill)`;
  }
  goal() {
    const ids = [...this.goals.keys()].sort(byKey((e) => [e !== this.focus, this.goals.get(e).get("status") !== "active", e]));
    const gid = ids.find((e) => ["active", "proposed"].includes(this.goals.get(e).get("status") ?? ""));
    return gid ? `break ${gid} down further, or close it once its acceptance criteria are verified` : null;
  }
};

// src/hub/commands/views/graph.ts
var ID_RE = /\b(?:IDEA|(?:G|P|FEAT|BUG|CHORE|SPIKE)-\d+|K-\d{4}-\d{2}-\d{2}-[a-z0-9-]+)\b/g;
var DATE_KEYS = ["created", "started", "completed", "decided", "closed"];
var up3 = (s2) => s2 ? s2.toUpperCase() : null;
function buildGraph(store) {
  store.require();
  const all = {
    goals: store.goals(),
    items: store.items(),
    plans: store.plans(true),
    focus: store.focus(),
    claims: store.ledger.claims()
  };
  const docs = [];
  const idea2 = store.idea();
  if (idea2) docs.push(toDoc(store, idea2, "idea", all));
  const kinds = [["goal", all.goals], ["item", all.items], ["plan", all.plans]];
  for (const [kind, set] of kinds) for (const d of set.values()) docs.push(toDoc(store, d, kind, all));
  for (const e of store.knowledge(false)) docs.push(knowledgeDoc(store, e));
  return {
    schemaVersion: SCHEMA_VERSION,
    generatedAt: (/* @__PURE__ */ new Date()).toISOString(),
    project: { name: basename5(store.ws.root), branch: currentBranch(), today: today() },
    settings: store.settings(),
    focus: all.focus || null,
    docs,
    edges: edges(docs),
    spend: store.ledger.spend(),
    questions: openQuestions(store.ledger.events()).map(({ answer: _, run: __, ...rest }) => rest),
    next: nextLines(store),
    check: findings(store)
  };
}
function toDoc(store, d, kind, all) {
  const status2 = kind === "item" ? itemStatus(d, all.plans) : d.get("status") ?? "";
  const tasks = kind === "plan" ? d.taskGroups() : kind === "idea" ? d.taskGroups("Success criteria") : [];
  return {
    id: kind === "idea" ? IDEA_ID : d.id,
    kind,
    type: kind === "item" ? d.id.split("-")[0] : null,
    title: d.get("title") ?? "",
    status: status2,
    priority: d.get("priority"),
    severity: d.get("severity"),
    goal: kind === "plan" ? planGoal(d, all.items) || null : up3(d.get("goal")),
    plan: kind === "item" ? up3(d.get("plan")) : null,
    items: kind === "plan" ? planItems(d, all.items).map((i) => i.id) : [],
    dependsOn: d.dependsOn(),
    waitsFor: kind === "plan" && !CLOSED.has(status2) ? unmetDeps(d, all.plans) : [],
    touches: kind === "plan" ? d.touches() : [],
    onFocus: kind === "plan" ? onFocus(d, all.items, all.focus) : kind === "goal" ? d.id === all.focus : false,
    owner: owner(all.claims.get(d.id)),
    branch: d.get("branch"),
    pr: d.get("pr"),
    dates: Object.fromEntries(DATE_KEYS.filter((k) => d.get(k)).map((k) => [k, d.get(k)])),
    tasks: tasks.length || kind === "plan" ? { done: tasks.filter(([x]) => x).length, total: tasks.length, list: tasks.map(task) } : null,
    gate: gate(store, d, kind, status2),
    source: d.source,
    path: d.path ? store.rel(d.path) : null,
    sections: sections(d.text)
  };
}
var TASK_LINE = /^(?:(T\d+):\s*)?(.*?)(?:\s*→\s*verify:\s*(.*))?$/;
function task([done, line3, phase]) {
  const [, id = null, text2 = line3, verify = null] = TASK_LINE.exec(line3) ?? [];
  return { id, text: text2.trim(), verify: verify?.trim() || null, done, phase };
}
function knowledgeDoc(store, e) {
  const d = e.doc;
  return {
    id: e.id,
    kind: "knowledge",
    type: e.type,
    title: e.title,
    status: e.supersededBy ? "superseded" : "active",
    priority: null,
    severity: null,
    goal: null,
    plan: null,
    items: [],
    dependsOn: e.supersedes ? [e.supersedes] : [],
    waitsFor: [],
    touches: e.scope,
    onFocus: false,
    owner: null,
    branch: null,
    pr: null,
    dates: Object.fromEntries(DATE_KEYS.filter((k) => d.get(k)).map((k) => [k, d.get(k)])),
    tasks: null,
    gate: null,
    source: e.source,
    path: d.path ? store.rel(d.path) : null,
    sections: [{ heading: "Why", markdown: knowledgeBody(d.text) }]
  };
}
var knowledgeBody = (text2) => stripComments(body(text2)).replace(/^# .*\n/m, "").trim();
function owner(c) {
  return c ? { actor: c.actor, run: c.run, since: c.ts } : null;
}
function gate(store, d, kind, status2) {
  if (kind === "plan" && (status2 === "draft" || status2 === "ready")) return readinessProblems(store, d);
  if (kind === "item" && status2 === "new") return triageProblems(d);
  if (kind === "idea" && status2 !== "decided" && status2 !== "killed") return decisionProblems(d);
  return null;
}
function body(text2) {
  return text2.replace(/^---\n[\s\S]*?\n---\n/, "");
}
var PLACEHOLDER = /^\s*(?:-|- \[ \]|1\.)\s*$/;
function sections(text2) {
  return splitSections(body(text2))[1].map(([heading, md]) => ({
    heading,
    markdown: stripComments(md).split("\n").filter((l) => !PLACEHOLDER.test(l)).join("\n").trim()
  }));
}
function edges(docs) {
  const known = new Set(docs.map((d) => d.id));
  const out = [];
  const add = (from, to, type) => {
    if (to && known.has(to) && from !== to) out.push({ from, to, type });
  };
  for (const d of docs) {
    if (d.kind === "goal") add(d.id, IDEA_ID, "serves");
    if (d.kind === "item") add(d.id, d.goal, "in-goal");
    if (d.kind === "knowledge") {
      add(d.id, /^(?:IDEA|[A-Z]+-\d+)$/.test(d.source) ? d.source : null, "learned-in");
      for (const k of d.dependsOn) add(d.id, k, "supersedes");
    }
    if (d.kind === "plan") {
      add(d.id, d.goal, "in-goal");
      for (const i of d.items) add(d.id, i, "delivers");
      for (const p of d.dependsOn) add(d.id, p, "depends-on");
    }
  }
  const linked = new Set(out.flatMap((e) => [`${e.from}>${e.to}`, `${e.to}>${e.from}`]));
  for (const d of docs) {
    const text2 = d.sections.map((s2) => s2.markdown).join("\n");
    for (const id of new Set(text2.match(ID_RE) ?? [])) {
      if (!linked.has(`${d.id}>${id}`)) add(d.id, id, "mentions");
    }
  }
  return out;
}

// src/hub/commands/views/export.ts
var DATA_SLOT = '<script id="graph" type="application/json">null</script>';
var UI_FILE = "ui.html";
var STUDIO_FILE = "studio.html";
var STUDIO_SLOT = '<script id="design" type="application/json">null</script>';
function embed(graph) {
  return JSON.stringify(graph).replace(/</g, "\\u003c");
}
function renderHtmlShell(store) {
  const shell = store.ws.read(join15(SCRIPT_DIR, UI_FILE));
  if (shell === null || !shell.includes(DATA_SLOT)) {
    fail(`The UI bundle (${UI_FILE}) is missing next to crew.mjs. Re-run \`crew.mjs init\` from the plugin.`);
  }
  return shell;
}
function renderStudioShell(store) {
  const shell = store.ws.read(join15(SCRIPT_DIR, STUDIO_FILE));
  if (shell === null || !shell.includes(STUDIO_SLOT)) {
    fail(`The design studio (${STUDIO_FILE}) is missing next to crew.mjs. Re-run \`crew.mjs init\` from the plugin.`);
  }
  return shell;
}
function renderHtml(store, graph) {
  return renderHtmlShell(store).replace(DATA_SLOT, () => `<script id="graph" type="application/json">${embed(graph)}</script>`);
}
function exportGraph(store, format, out) {
  const graph = buildGraph(store);
  if (format === "json") {
    const text2 = `${JSON.stringify(graph, null, 2)}
`;
    if (!out) return store.say(text2.trimEnd());
    store.ws.write(resolve6(out), text2);
    return store.say(`Wrote ${store.rel(resolve6(out))}`);
  }
  const path = out ? resolve6(out) : join15(store.dir, "view", "index.html");
  if (!out) store.ws.write(join15(store.dir, "view", ".gitignore"), "# generated by `crew.mjs export`\n*\n");
  store.ws.write(path, renderHtml(store, graph));
  store.say(`Wrote ${store.rel(path)} \u2014 open it in a browser (it works offline; re-run export to refresh)`);
}

// src/hub/commands/work/planning.ts
function init(store) {
  for (const d of [...Object.values(store.dirs), store.knowledgeDir, join16(store.dir, "drafts")]) {
    const keep = join16(d, ".gitkeep");
    if (!store.ws.isFile(keep)) store.ws.write(keep, "");
  }
  vendor(store);
  const readme = join16(store.dir, "README.md");
  const model = store.ws.read(join16(SKILL_DIR, "references", "model.md"));
  if (!store.ws.isFile(readme) && model !== null) store.ws.write(readme, model);
  store.say(`Initialized ${store.rel(store.dir)}/`);
  hubStateRule(store);
}
function hubStateRule(store) {
  const path = join16(store.ws.root, "CLAUDE.md");
  const text2 = store.ws.read(path);
  if (text2?.includes(HUB_STATE_MARKER)) return;
  store.ws.write(path, text2 === null ? HUB_STATE_RULE : `${text2.trimEnd()}

${HUB_STATE_RULE}`);
  store.say(`${text2 === null ? "Created" : "Added the hub-state section to"} CLAUDE.md`);
}
function vendor(store) {
  const bin = join16(store.dir, "bin");
  if (resolve7(SCRIPT_DIR) === resolve7(bin)) return;
  store.ws.write(join16(bin, "crew.mjs"), readFileSync9(SCRIPT_FILE, "utf8"), 493);
  const ui = store.ws.read(join16(SCRIPT_DIR, UI_FILE));
  if (ui !== null) store.ws.write(join16(bin, UI_FILE), ui);
  const studio = store.ws.read(join16(SCRIPT_DIR, STUDIO_FILE));
  if (studio !== null) store.ws.write(join16(bin, STUDIO_FILE), studio);
  const templates = join16(store.dir, "templates");
  for (const name of [...TEMPLATE_NAMES]) store.ws.write(join16(templates, name), store.ws.read(join16(SKILL_DIR, "templates", name)));
  for (const name of store.ws.list(join16(SKILL_DIR, "agents"))) {
    store.ws.write(join16(templates, "agents", name), store.ws.read(join16(SKILL_DIR, "agents", name)));
  }
  const guide = store.ws.read(join16(SKILL_DIR, "references", "writing-guide.md"));
  if (guide !== null) store.ws.write(join16(templates, "writing-guide.md"), guide);
}
function requireSections(doc, kind) {
  const missing = doc.missing(REQUIRED_ON_CREATE[kind]);
  if (missing.length) {
    fail(`Draft is incomplete \u2014 write these sections before creating the ${kind}: ${missing.join(", ")}. Nothing was created.`);
  }
}
function newIdea(store, title, draftPath, keep = false) {
  store.require();
  if (store.ws.isFile(store.ideaPath)) fail(`${store.rel(store.ideaPath)} already exists \u2014 edit it directly.`);
  const [draftFile, draft] = store.readDraft(draftPath, "idea");
  const doc = store.build("idea.md", draft, { title });
  requireSections(doc, "idea");
  store.writeNew(doc, store.ideaPath);
  store.consume(draftFile, keep);
}
function setFocus(store, goalId) {
  store.require();
  const idea2 = store.idea() ?? fail(`Write the idea first (\`new-idea\`): the focus goal is recorded on it.`);
  const gid = store.checkRef(goalId, "goal");
  const goal = store.find(gid);
  if (CLOSED.has(goal.get("status") ?? "")) fail(`${gid} is ${goal.get("status")} \u2014 focus on an open goal.`);
  const old = idea2.get("focus");
  idea2.set("focus", gid);
  idea2.appendLog(`focus ${old || "\u2014"} \u2192 ${gid}`);
  idea2.save();
  store.say(`focus: ${gid} (${goal.get("title")})`);
  if (goal.get("status") === "proposed") store.say(`note: ${gid} is still proposed \u2014 \`move ${gid} active\` when its first plan starts`);
}
function newGoal(store, title, draftPath, priority, keep = false) {
  store.require();
  const [draftFile, draft] = store.readDraft(draftPath, "goal");
  const eid = store.nextId("G", "goal");
  const doc = store.build("goal.md", draft, { id: eid, title, priority: Store.checkPriority(priority) || "P2" });
  requireSections(doc, "goal");
  store.writeNew(doc, join16(store.dirs.goal, `${eid}-${slugify(title)}.md`));
  breakdownToItems(store, doc);
  store.consume(draftFile, keep);
}
function newPlan(store, title, draftPath, o = {}) {
  store.require();
  const [draftFile, draft] = store.readDraft(draftPath, "plan");
  const shared2 = store.settings().plan_worktrees;
  if (shared2) requireBase(store.home, store.baseBranch());
  const goal = store.checkRef(o.goal, "goal");
  const deps = checkDeps(store, idList(o.depends));
  const linked = idList(o.items);
  const items2 = checkLinkable(store, linked);
  const touches2 = (o.touches ?? "").split(",").map((t) => t.trim()).filter(Boolean);
  const pid = store.nextId("P", "plan");
  store.label = `new-plan ${[pid, ...linked].join(" ")}`;
  const slug = slugify(title), branch = `plan/${pid}-${slug}`;
  const doc = store.build("plan.md", draft, {
    id: pid,
    title,
    goal,
    branch,
    depends_on: deps.join(", "),
    items: linked.join(", "),
    touches: touches2.join(", ")
  });
  requireSections(doc, "plan");
  if (shared2) openPlanWorktree(store, pid, branch);
  store.writeNew(doc, join16(store.dirs.plan, `${pid}-${slug}.md`));
  for (const i of linked) {
    const item = items2.get(i);
    item.set("plan", pid);
    item.save();
    store.say(`${i} \u2192 ${pid}`);
  }
  if (goal && !linked.length) hintUnplanned(store, goal, items2);
  store.consume(draftFile, o.keep);
}
function openPlanWorktree(store, pid, branch) {
  const main2 = worktrees()[0]?.path ?? store.ws.root;
  const path = join16(main2, ".claude", "worktrees", branch.replace(/^plan\//, ""));
  const exists = planBranches().includes(branch);
  git(["worktree", "add", "-q", "--no-checkout", ...exists ? [path, branch] : ["-b", branch, path, store.baseBranch()]], true);
  store.ws.onAbort(() => {
    git(["worktree", "remove", "--force", path]);
    if (!exists) git(["branch", "-D", branch]);
  });
  sparseCheckout(store, path);
  const common = commonDir(store.ws.root), exclude = common ? join16(common, "info", "exclude") : null;
  const ignored = exclude ? store.ws.read(exclude) ?? "" : null;
  if (exclude && ignored !== null && !/^\.claude\/worktrees\/?$/m.test(ignored)) {
    store.ws.write(exclude, `${ignored}${ignored && !ignored.endsWith("\n") ? "\n" : ""}.claude/worktrees/
`);
  }
  store.forgetWorktrees();
  store.say(`${pid}: worktree ${store.rel(path)} on ${branch} \u2014 the plan's team works on its code there; its hub documents stay in the main checkout`);
  return path;
}
function sparseCheckout(store, path) {
  const patterns = ["/*", ...STATE_PATHS.map((p) => `!/${p}`)];
  if (git(["-C", path, "sparse-checkout", "set", "--no-cone", ...patterns]) === null) {
    store.say(`note: git sparse-checkout failed \u2014 ${store.rel(path)} is a full checkout, with read-only copies of the hub's documents`);
  }
  git(["-C", path, "checkout", "-q"], true);
}
function restore(store, f, root = store.ws.root) {
  const head = git(["-C", root, "show", `HEAD:${f}`]), path = join16(root, f);
  if (head === null) store.ws.remove(path);
  else store.ws.write(path, head);
}
function checkDeps(store, deps) {
  const known = store.plans(true);
  const unknown = deps.filter((d) => !known.has(d));
  if (unknown.length) fail(`Unknown dependencies: ${unknown.join(", ")}`);
  return deps;
}
function checkLinkable(store, linked) {
  const items2 = store.items();
  const unknown = linked.filter((i) => !items2.has(i));
  if (unknown.length) fail(`Unknown items: ${unknown.join(", ")}`);
  const plans2 = store.plans(true);
  for (const i of linked) {
    const owner2 = (items2.get(i).get("plan") ?? "").toUpperCase();
    if (owner2 && plans2.has(owner2) && plans2.get(owner2).get("status") !== "dropped") fail(`${i} is already planned in ${owner2}.`);
    if (ITEM_CLOSED.has(items2.get(i).get("status") ?? "")) fail(`${i} is ${items2.get(i).get("status")}.`);
  }
  return items2;
}
function hintUnplanned(store, goal, items2) {
  const open = [...items2.values()].filter((i) => (i.get("goal") ?? "").toUpperCase() === goal && !i.get("plan") && !ITEM_CLOSED.has(i.get("status") ?? "")).map((i) => i.id);
  if (open.length) store.say(`note: ${goal} has unplanned items (${open.join(", ")}) \u2014 link the one this plan delivers with --items`);
}

// src/hub/commands/work/setup.ts
import { join as join17 } from "node:path";
var config = (branch, worktrees2) => `# The hub's settings. \`crew.mjs doctor\` checks that they fit the autonomous loop.
git:
  # The branch plans start from and merge into; the main checkout stays on it.
  default_branch: ${branch}
hub:
  # One shared worktree per plan, so several plans run side by side (the agent team's way of working). Needs git.
  plan_worktrees: ${worktrees2}
  # How many plans one run (agent or session) may have in progress.
  wip_limit: 1
  # The build that writes the generated files (mark them linguist-generated in .gitattributes): Release runs it.
  # build: npm run build
  # The full suite Release runs before each merge; never per task.
  # full_suite: npm test
  # Files many plans touch (registries, indexes, shared docs): overlaps on them never block staffing, the merge queue
  # resolves them. Exact files, not directories.
  # shared: [src/registry.ts, README.md]
`;
var POLICY = `# The team's policy: who may do what, and where a human decides.
# A preset is a ready-made policy that the settings below adjust. \`lifecycle\` turns the team's roles into gates: the
# human approves the goal set, and each step belongs to one role. Choosing a preset is your decision, so it is left
# commented out here; \`crew.mjs policy show\` prints the effective policy and \`crew.mjs policy check\` validates this file.
# preset: lifecycle
`;
function initDefaults(store) {
  const files2 = [
    [join17(store.dir, "config.yaml"), config(currentBranch() || "main", commonDir(store.home) !== null)],
    [join17(store.dir, "policy.yaml"), POLICY]
  ];
  for (const [path, text2] of files2) {
    if (store.ws.isFile(path)) continue;
    store.ws.write(path, text2);
    store.say(`Wrote ${store.rel(path)} (defaults; edit it)`);
  }
}

// src/hub/registry.ts
function load(entries, into = { cli: {}, tools: {}, usage: [], from: { cli: {}, tools: {} } }) {
  for (const [file, reg] of entries) {
    for (const kind of ["cli", "tools"]) {
      for (const name of Object.keys(reg[kind] ?? {})) {
        const other = into.from[kind][name];
        if (other) throw new Error(`${kind === "cli" ? "command" : "tool"} '${name}' is registered twice: in ${other} and in ${file}`);
      }
    }
    Object.assign(into.cli, reg.cli);
    Object.assign(into.tools, reg.tools);
    for (const kind of ["cli", "tools"]) for (const name of Object.keys(reg[kind] ?? {})) into.from[kind][name] = file;
    into.usage.push(...reg.usage ?? []);
  }
  return into;
}
var DRAFTED = { str: ["from"], flag: ["keep-draft"], required: ["from"] };
function str(a, key) {
  const v = a.opt[key];
  return typeof v === "string" ? v : void 0;
}
var text = (description) => ({ type: "string", description });
var obj = (properties = {}, required = []) => ({
  type: "object",
  properties: {
    ...properties,
    as: { type: "string", description: "your role (set by the guard for agents)" },
    run_id: { type: "string", description: "your run id (set by the guard for agents)" }
  },
  ...required.length ? { required } : {},
  additionalProperties: false
});
var s = (a, k) => typeof a[k] === "string" && a[k] ? a[k] : void 0;
var up4 = (a, k) => s(a, k).toUpperCase();
var num = (description) => ({ type: "number", description });
var n = (a, k) => typeof a[k] === "number" ? a[k] : void 0;
var ITEM_FIELDS = { priority: text("P0\u2013P3"), severity: text("bugs only: S1\u2013S4"), goal: text("e.g. G-002") };

// src/hub/commands/work/planning.reg.ts
var registration = {
  usage: [
    "  init                                          create the .crew/ structure",
    "  new-idea TITLE --from DRAFT                   the project's idea (problem, outcome, success criteria)",
    "  new-goal TITLE --from DRAFT [--priority P1]   an outcome; each Breakdown line becomes a FEAT item",
    "  focus G-###                                   the goal the team works toward now",
    '  new-plan TITLE --from DRAFT [--goal] [--items FEAT-001,BUG-002] [--touches "src/a/**, docs/b.md"] [--depends P-002]'
  ],
  cli: {
    init: { pos: [], run: (s2) => {
      init(s2);
      initDefaults(s2);
    } },
    "new-idea": {
      pos: ["title"],
      ...DRAFTED,
      run: (s2, a) => newIdea(s2, a.pos[0], str(a, "from"), !!a.opt["keep-draft"])
    },
    "new-goal": {
      pos: ["title"],
      ...DRAFTED,
      str: ["from", "priority"],
      run: (s2, a) => newGoal(s2, a.pos[0], str(a, "from"), str(a, "priority"), !!a.opt["keep-draft"])
    },
    focus: { pos: ["goal"], run: (s2, a) => setFocus(s2, a.pos[0]) },
    "new-plan": {
      pos: ["title"],
      ...DRAFTED,
      str: ["from", "goal", "depends", "items", "touches"],
      run: (s2, a) => newPlan(s2, a.pos[0], str(a, "from"), {
        goal: str(a, "goal"),
        depends: str(a, "depends"),
        items: str(a, "items"),
        touches: str(a, "touches"),
        keep: !!a.opt["keep-draft"]
      })
    }
  },
  tools: {
    focus: {
      description: "Set the focus goal the team works toward now (`crew.mjs focus`).",
      input: obj({ goal: text("e.g. G-002") }, ["goal"]),
      run: (st, a) => setFocus(st, s(a, "goal"))
    }
  }
};

// src/hub/commands/work/gather.ts
import { existsSync as existsSync10, realpathSync as realpathSync5, statSync as statSync7 } from "node:fs";
import { basename as basename6, dirname as dirname6, join as join18 } from "node:path";
var real4 = (p) => existsSync10(p) ? realpathSync5(p) : p;
var mtimeOf = (p) => statSync7(p, { throwIfNoEntry: false })?.mtimeMs ?? 0;
function copies(store) {
  const out = [], base2 = store.baseBranch();
  for (const { path: wt } of worktrees()) {
    if (!existsSync10(wt) || real4(wt) === real4(store.home)) continue;
    const dirty2 = new Set(dirty(wt, ".crew").filter((f) => STATE_RE.test(f)));
    const ahead = (git(["-C", wt, "diff", "--name-only", "--diff-filter=AM", `${base2}...HEAD`, "--", ".crew"]) ?? "").split("\n").filter((f) => STATE_RE.test(f) && !dirty2.has(f));
    for (const f of [...dirty2, ...ahead]) {
      const text2 = store.ws.read(join18(wt, f));
      if (text2 !== null && text2 !== store.ws.read(join18(store.home, f))) {
        out.push({ wt, f, text: text2, mtime: mtimeOf(join18(wt, f)), committed: !dirty2.has(f) });
      }
    }
  }
  return out.sort((a, b) => b.mtime - a.mtime);
}
function homeDoc(store, id) {
  const kind = kindOf(id);
  return kind && kind !== "idea" ? store.docs(kind).get(id) ?? null : null;
}
function gather(store) {
  store.require();
  const seen = /* @__PURE__ */ new Map();
  let n2 = 0;
  for (const c of copies(store)) {
    const from = `${store.ws.rel(c.wt) || c.wt}`, target = join18(store.home, c.f);
    const doc = Doc.parse(c.text, target), key = `${doc.id} ${doc.get("title")}`;
    const prior = seen.get(c.f) ?? (doc.id ? seen.get(key) : void 0);
    if (prior) {
      store.say(`kept ${c.f} from ${prior}; an older, different copy in ${from} was dropped`);
    } else {
      const same = doc.id ? homeDoc(store, doc.id) : null;
      const onDisk = store.ws.read(target);
      if (onDisk !== null && mtimeOf(target) > c.mtime) {
        store.say(`kept ${c.f} in the main checkout (newer); the copy in ${from} differs and was dropped`);
      } else if (same && same.path !== target && same.get("title") !== doc.get("title")) {
        const id = store.nextId(doc.id.replace(/-\d+$/, ""), kindOf(doc.id));
        const text2 = c.text.replace(new RegExp(`^id: ${doc.id}$`, "m"), `id: ${id}`).replace(new RegExp(`^# ${doc.id}:`, "m"), `# ${id}:`);
        const path = join18(dirname6(target), basename6(target).replace(doc.id, id));
        store.ws.write(path, text2);
        store.say(`${doc.id} in ${from} clashes with ${same.id} "${same.get("title")}": gathered as ${id} (${store.rel(path)}); check what refers to ${doc.id}`);
      } else {
        if (same && same.path && same.path !== target) store.ws.remove(same.path);
        store.ws.write(target, c.text);
        store.say(`${onDisk === null ? "gathered" : "updated"} ${c.f} from ${from}`);
      }
      seen.set(c.f, from);
      if (doc.id) seen.set(key, from);
      n2++;
    }
    if (c.committed) store.say(`  ${c.f} is committed on ${from}'s branch: drop it there before that branch merges`);
    else restore(store, c.f, c.wt);
  }
  store.say(n2 ? `Gathered ${n2} hub document(s) into ${store.rel(store.dir)}/.` : "Nothing to gather: every hub document is in the main checkout.");
}

// src/hub/commands/work/migrate.ts
import { existsSync as existsSync11, readdirSync as readdirSync3, statSync as statSync8 } from "node:fs";
import { join as join19 } from "node:path";
var DROPPED = /^(bin|templates|view)\/|^(ROADMAP|BACKLOG|STATUS|README)\.md$/;
var ARCHIVED = /^(milestones|sprints|releases)\/|^(project-plan|raid)\.md$/;
var DOCS = { epics: "goals", items: "items", plans: "plans" };
var TEXT = /\.(md|ya?ml|txt|json|csv|html?|py|mjs|js|ts|sh|toml)$|(^|\/)[^./]+$/i;
var RAID_TYPES = [["Decisions", "decision"], ["Assumptions", "decision"], ["Risks", "risk"]];
var OLD_REFS = [
  "CLAUDE.md",
  ".claude/settings.json",
  ".gitignore",
  ".gitattributes",
  ".githooks/pre-commit",
  ".githooks/commit-msg",
  ".github/pull_request_template.md",
  ".github/workflows/ci.yml"
];
function walk(dir, prefix = "") {
  return readdirSync3(dir, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(join19(dir, e.name), `${prefix}${e.name}/`) : [`${prefix}${e.name}`]);
}
function renamed(text2) {
  return text2.replace(/\bEP-(\d+)/g, "G-$1").replace(/\.project\//g, ".crew/").replace(/\btracker\.mjs\b/g, "crew.mjs").replace(/project-kit:tracker/g, "crew:hub");
}
function leanDoc(text2, kind) {
  let t = renamed(text2).replace(/^epic:/m, "goal:").replace(/^(points|milestone):.*\n/gm, "");
  if (kind === "plans" && !/^touches:/m.test(t)) t = t.replace(/^(depends_on:.*)$/m, "$1\ntouches:");
  return t;
}
function migrate(store) {
  const root = store.ws.root, old = join19(root, ".project");
  if (!existsSync11(old) || !statSync8(old).isDirectory()) fail("No .project/ directory to migrate.");
  if (existsSync11(store.dir)) fail(`${store.rel(store.dir)}/ already exists \u2014 move it aside first; nothing was changed.`);
  const files2 = walk(old);
  const read = (rel) => store.ws.read(join19(old, rel)) ?? "";
  const exitCriteria = milestoneCriteria(files2.filter((f) => f.startsWith("milestones/")).map(read));
  let counts = { docs: 0, archived: 0, knowledge: 0, issues: 0, drafted: 0 };
  const targets = /* @__PURE__ */ new Map();
  const put = (rel, target) => {
    const other = targets.get(target);
    if (other) fail(`.project/${other} and .project/${rel} would both become ${store.rel(target)} \u2014 rename one; nothing was changed.`);
    targets.set(target, rel);
  };
  for (const rel of files2) {
    if (DROPPED.test(rel) || rel.endsWith(".gitkeep")) continue;
    const [dir, name] = [rel.split("/")[0], rel.split("/").pop()];
    const topLevelDoc = DOCS[dir] && name.endsWith(".md") && rel.split("/").length === 2;
    if (!TEXT.test(rel)) {
      const to = join19(store.dir, ARCHIVED.test(rel) ? "archive" : "", rel);
      put(rel, to);
      store.ws.copy(join19(old, rel), to);
    } else if (ARCHIVED.test(rel)) {
      put(rel, join19(store.dir, "archive", rel));
      store.ws.write(join19(store.dir, "archive", rel), renamed(read(rel)));
      counts.archived++;
    } else if (topLevelDoc) {
      const doc = Doc.parse(leanDoc(read(rel), dir));
      if (dir === "epics") addExitCriteria(doc, Doc.parse(read(rel)).get("milestone"), exitCriteria);
      if (dir === "plans" && doc.get("status") === "ready" && !doc.touches().length) {
        doc.set("status", "draft");
        doc.appendLog("status ready \u2192 draft \u2014 migrated to crew: declare `touches:` before moving it back to ready");
        counts.drafted++;
      }
      put(rel, join19(store.dir, DOCS[dir], name.replace(/^EP-/, "G-")));
      store.ws.write(join19(store.dir, DOCS[dir], name.replace(/^EP-/, "G-")), `${doc.text.trimEnd()}
`);
      counts.docs++;
    } else if (rel === "config.yaml") {
      put(rel, join19(store.dir, rel));
      store.ws.write(join19(store.dir, rel), renamed(read(rel)).replace(/^[ \t]+tracker:.*\n/m, "").replace(/^modules:[ \t]*\n(?![ \t])/m, ""));
    } else {
      const to = join19(store.dir, rel.replace(/^epics\//, "goals/"));
      put(rel, to);
      store.ws.write(to, renamed(read(rel)));
    }
  }
  if (files2.includes("project-plan.md")) {
    const config2 = join19(store.dir, "config.yaml");
    store.ws.write(config2, hubSettings(store.ws.read(config2) ?? "", read("project-plan.md")));
  }
  store.ws.remove(old);
  if (files2.includes("raid.md")) counts = { ...counts, ...raid(store, read("raid.md")) };
  init(store);
  store.say(`Migrated .project/ \u2192 .crew/: ${counts.docs} goals/items/plans, ${counts.knowledge} knowledge entries from RAID, ${counts.issues} open issues \u2192 CHORE items, ${counts.archived} files archived in .crew/archive/.`);
  if (counts.drafted) store.say(`note: ${counts.drafted} ready plan(s) went back to draft until they declare touches:`);
  if (files2.includes("project-plan.md")) {
    store.say("next: write the idea (`new-idea TITLE --from DRAFT`) from .crew/archive/project-plan.md (objectives, success measures)");
  }
  const branches = planBranches().filter((b) => !b.startsWith("origin/"));
  if (branches.length) {
    store.say(`note: plan branches still hold .project/ (${branches.join(", ")}) \u2014 finish them on the old layout, or merge this commit into each and run \`crew.mjs migrate\` there too; until then their live status is not visible from main`);
  }
  const stale = OLD_REFS.filter((f) => /\.project\/|tracker\.mjs/.test(store.ws.read(join19(root, f)) ?? ""));
  if (stale.length) {
    store.say(`next: these still mention .project/ or tracker.mjs \u2014 re-render them (/crew:guidelines --refresh, /crew:git-setup): ${stale.join(", ")}`);
  }
}
function milestoneCriteria(texts) {
  const out = /* @__PURE__ */ new Map();
  for (const text2 of texts) {
    const m = Doc.parse(text2);
    if (m.id) out.set(m.id.toUpperCase(), m.checklist("Exit criteria").filter(([done]) => !done).map(([, c]) => c));
  }
  return out;
}
function addExitCriteria(goal, milestone, criteria2) {
  const mid = (milestone ?? "").toUpperCase();
  for (const c of criteria2.get(mid) ?? []) goal.appendTo("Acceptance criteria", `- [ ] ${c} (from ${mid} exit criteria)`);
  criteria2.delete(mid);
}
function hubSettings(config2, projectPlan) {
  const wip = projectPlan ? Doc.parse(projectPlan).get("wip_limit") : null;
  if (!wip || /^hub:/m.test(config2)) return config2;
  return `${config2.trimEnd()}${config2.trim() ? "\n\n" : ""}hub:                    # crew hub settings
  wip_limit: ${wip}
`;
}
function raid(store, text2) {
  const doc = Doc.parse(renamed(text2));
  let knowledge2 = 0, issues = 0;
  for (const [section, type] of RAID_TYPES) {
    for (const row of mdTable(doc.section(section))) {
      const title = row.decision || row.assumption || row.risk || Object.values(row).find((v) => v && !/^[A-Z]+-?\d+$/.test(v)) || "";
      if (!title) continue;
      const fields = Object.entries(row).filter(([, v]) => v).map(([k, v]) => `- **${k}:** ${v}`).join("\n");
      const id = knowledgeId(title, (k) => store.ws.isFile(join19(store.knowledgeDir, `${k}.md`)));
      const level = (v) => (v ?? "").trim().slice(0, 1).toUpperCase();
      store.ws.write(join19(store.knowledgeDir, `${id}.md`), entryText({
        id,
        type,
        title,
        scope: [],
        supersedes: "",
        tier: "project",
        source: `raid.md (${section.toLowerCase()}, migrated)`,
        why: `${section === "Assumptions" ? "Assumption, not yet confirmed.\n\n" : ""}${fields}`,
        risk: { likelihood: level(row.probability), impact: level(row.impact), owner: row.owner }
      }));
      knowledge2++;
    }
  }
  for (const row of mdTable(doc.section("Issues"))) {
    if (["closed", "resolved", "done"].includes((row.status ?? "").toLowerCase())) continue;
    const title = row.issue || Object.values(row).find(Boolean) || "";
    if (!title) continue;
    const details = Object.entries(row).filter(([, v]) => v).map(([k, v]) => `- **${k}:** ${v}`).join("\n");
    createItem(store, "CHORE", title.slice(0, 80), `## Summary
${title}

From the RAID log (migrated):
${details}
`, {});
    issues++;
  }
  return { knowledge: knowledge2, issues };
}

// src/hub/commands/work/migrate.reg.ts
var registration2 = {
  usage: [
    "  migrate                                       convert a project-kit .project/ directory into .crew/",
    "  migrate --gather                              bring hub documents other checkouts hold into the main checkout"
  ],
  cli: {
    migrate: { pos: [], flag: ["gather"], run: (s2, a) => a.opt.gather ? gather(s2) : migrate(s2) }
  }
};

// src/hub/commands/work/backlog.reg.ts
var registration3 = {
  usage: [
    "  new-item feat|bug|chore|spike TITLE (--from DRAFT | --why TEXT) [--goal] [--priority] [--severity]",
    "  triage ID [--priority P1] [--severity S2] [--goal G-001] [--approved-by NAME]",
    "  triage ID --reject wontfix|duplicate --note TXT"
  ],
  cli: {
    "new-item": {
      pos: ["type", "title"],
      str: ["from", "why", "goal", "priority", "severity"],
      flag: ["keep-draft"],
      run: (s2, a) => newItem(s2, a.pos[0], a.pos[1], str(a, "from"), str(a, "why"), {
        goal: str(a, "goal"),
        priority: str(a, "priority"),
        severity: str(a, "severity"),
        keep: !!a.opt["keep-draft"]
      })
    },
    triage: {
      pos: ["id"],
      str: ["priority", "severity", "goal", "note", "reject", "approved-by"],
      choices: { reject: ["duplicate", "wontfix"] },
      run: (s2, a) => triage(s2, a.pos[0].toUpperCase(), {
        priority: str(a, "priority"),
        severity: str(a, "severity"),
        goal: str(a, "goal"),
        reject: str(a, "reject"),
        note: str(a, "note"),
        approvedBy: str(a, "approved-by")
      })
    }
  },
  tools: {
    new_item: {
      description: "Capture a backlog item (`crew.mjs new-item`). Give exactly one of `from` (a draft file with the item template's sections) or `why` (one-paragraph summary). Priority or severity at intake triage it if the triage gate passes.",
      input: obj({
        type: { type: "string", enum: ["feat", "bug", "chore", "spike"] },
        title: text("short title"),
        from: text("path to a draft file"),
        why: text("summary, instead of a draft"),
        ...ITEM_FIELDS
      }, ["type", "title"]),
      run: (st, a) => newItem(st, s(a, "type"), s(a, "title"), s(a, "from"), s(a, "why"), {
        goal: s(a, "goal"),
        priority: s(a, "priority"),
        severity: s(a, "severity")
      })
    },
    triage: {
      description: "Triage a new item (`crew.mjs triage`): set priority/severity/goal, or reject it with a note.",
      input: obj({
        id: text("e.g. FEAT-003"),
        ...ITEM_FIELDS,
        reject: { type: "string", enum: ["duplicate", "wontfix"] },
        note: text("required with reject")
      }, ["id"]),
      run: (st, a) => triage(st, up4(a, "id"), {
        priority: s(a, "priority"),
        severity: s(a, "severity"),
        goal: s(a, "goal"),
        reject: s(a, "reject"),
        note: s(a, "note")
      })
    }
  }
};

// src/hub/commands/work/workflow.reg.ts
var registration4 = {
  usage: [
    "  start PLAN_ID \xB7 move ID STATUS [--note] \xB7 log ID TEXT      (ID: IDEA, G-###, P-###, FEAT/BUG/CHORE/SPIKE-###)",
    "           start/move/triage take --approved-by NAME: a human approving a gated or reserved step (never an agent)",
    "  release PLAN_ID [--note TXT] [--force]        give up a claim (another run's claim needs --force)",
    "  usage [--tokens-in N] [--tokens-out N] [--cost USD] [--model M] [--ref ID]   record what a run used",
    "  usage --hook                                  SubagentStop hook: a crew agent's tokens and final report from its transcript"
  ],
  cli: {
    start: {
      pos: ["id"],
      str: ["approved-by"],
      flag: ["force"],
      run: (s2, a) => start(s2, a.pos[0].toUpperCase(), !!a.opt.force, str(a, "approved-by"))
    },
    move: {
      pos: ["id", "status"],
      str: ["note", "approved-by"],
      flag: ["force"],
      run: (s2, a) => {
        move(s2, a.pos[0], a.pos[1], str(a, "note"), !!a.opt.force, str(a, "approved-by"));
      }
    },
    log: { pos: ["id", "text"], run: (s2, a) => log(s2, a.pos[0].toUpperCase(), a.pos[1]) },
    release: { pos: ["id"], str: ["note"], flag: ["force"], run: (s2, a) => release(s2, a.pos[0], str(a, "note"), !!a.opt.force) },
    usage: {
      pos: [],
      str: ["cost", "model", "ref"],
      int: ["tokens-in", "tokens-out"],
      flag: ["hook"],
      run: (s2, a) => a.opt.hook ? usageHook(s2) : usage(s2, {
        tokensIn: a.num["tokens-in"],
        tokensOut: a.num["tokens-out"],
        cost: str(a, "cost") === void 0 ? void 0 : Number(str(a, "cost")),
        model: str(a, "model"),
        ref: str(a, "ref")
      })
    }
  },
  tools: {
    move: {
      description: "Move a document to a new status (`crew.mjs move`). Gates (Definition of Ready, WIP limit, policy role gates) apply; there is no force. Steps the policy reserves for a human (human gates, reserved decisions) are refused here: escalate to the human, who approves on the CLI with --approved-by.",
      input: obj({ id: text("e.g. P-004"), status: text("target status, e.g. ready, in-review, done"), note: text("optional note") }, ["id", "status"]),
      run: (st, a) => {
        move(st, s(a, "id"), s(a, "status"), s(a, "note"));
      }
    },
    log: {
      description: "Append a dated line to a document's log (`crew.mjs log`).",
      input: obj({ id: text("e.g. P-004"), text: text("the log entry") }, ["id", "text"]),
      run: (st, a) => log(st, up4(a, "id"), s(a, "text"))
    },
    usage: {
      description: "Record tokens and cost this run used (`crew.mjs usage`); feeds budgets and the executive view.",
      input: obj({
        tokens_in: num("input tokens"),
        tokens_out: num("output tokens"),
        cost: num("USD"),
        model: text("model id"),
        ref: text("the document the work was for, e.g. P-004")
      }),
      run: (st, a) => usage(st, {
        tokensIn: n(a, "tokens_in"),
        tokensOut: n(a, "tokens_out"),
        cost: n(a, "cost"),
        model: s(a, "model"),
        ref: s(a, "ref")
      })
    }
  }
};

// src/hub/commands/team/policy.reg.ts
var registration5 = {
  usage: [
    "  policy show [--role R] [--team T] [--json] \xB7 policy check      the effective policy and where each value comes from"
  ],
  cli: {
    policy: {
      pos: ["action"],
      str: ["role", "team"],
      flag: ["json"],
      choices: { action: ["show", "check"] },
      run: (s2, a) => a.pos[0] === "show" ? policyShow(s2, str(a, "role"), str(a, "team"), !!a.opt.json) : policyCheck(s2)
    }
  }
};

// src/hub/commands/team/activity.reg.ts
var registration6 = {
  usage: [
    "  activity --hook                               PostToolUse hook: one activity event per tool call of a crew agent",
    "  watch [--ref ID] [--limit 20]                 the live feed (tool calls and ledger events), followed until Ctrl-C"
  ],
  cli: {
    activity: { pos: [], flag: ["hook"], required: ["hook"], run: (s2) => activityHook(s2) },
    watch: { pos: [], str: ["ref"], int: ["limit"], run: (s2, a) => watch(s2, { ref: str(a, "ref"), limit: a.num.limit }) }
  }
};

// src/hub/commands/team/autonomy.reg.ts
var registration7 = {
  usage: [
    "  run [--check] [--json]                        run the team unattended: the loop, and whether it may go on (exit 1: stop)"
  ],
  cli: {
    run: { pos: [], flag: ["check", "json"], run: (s2, a) => run(s2, !!a.opt.check, !!a.opt.json) }
  }
};

// src/hub/commands/memory/ledger.reg.ts
var registration8 = {
  usage: [
    "  ledger [--ref ID] [--type T] [--limit 20] [--json]   the shared event log (who/what/when) and live claims"
  ],
  cli: {
    ledger: {
      pos: [],
      str: ["ref", "type"],
      int: ["limit"],
      flag: ["json"],
      run: (s2, a) => showLedger(s2, { ref: str(a, "ref"), type: str(a, "type"), limit: a.num.limit, json: !!a.opt.json })
    }
  },
  tools: {
    ledger: {
      description: "Recent events from the shared ledger and the live claims (`crew.mjs ledger --json`).",
      input: obj({
        ref: text("only events about this ID"),
        type: { type: "string", enum: EVENT_TYPES },
        limit: num("how many, newest last (default 20)")
      }),
      run: (st, a) => showLedger(st, { ref: s(a, "ref"), type: s(a, "type"), limit: n(a, "limit"), json: true })
    }
  }
};

// src/hub/commands/memory/knowledge.reg.ts
var registration9 = {
  usage: [
    '  learn decision|learning|gotcha|convention|risk FACT (--why TEXT | --from DRAFT) [--scope "src/a/**, b.md"]',
    "        [--source P-###] [--supersedes K-\u2026] [--candidate] [--likelihood H|M|L --impact H|M|L --owner WHO]",
    "  recall [--paths a,b] [--plan P-###] [--topic WORDS] [--type T] [--all] [--json]   the knowledge that applies"
  ],
  cli: {
    learn: {
      pos: ["type", "title"],
      str: ["why", "from", "scope", "source", "supersedes", "likelihood", "impact", "owner"],
      flag: ["candidate", "keep-draft"],
      run: (s2, a) => {
        learn(s2, a.pos[0], a.pos[1], {
          why: str(a, "why"),
          from: str(a, "from"),
          scope: str(a, "scope"),
          source: str(a, "source"),
          supersedes: str(a, "supersedes"),
          candidate: !!a.opt.candidate,
          likelihood: str(a, "likelihood"),
          impact: str(a, "impact"),
          owner: str(a, "owner"),
          keep: !!a.opt["keep-draft"]
        });
      }
    },
    recall: {
      pos: [],
      str: ["paths", "plan", "topic", "type"],
      flag: ["all", "json"],
      run: (s2, a) => recallCmd(s2, {
        paths: str(a, "paths"),
        plan: str(a, "plan"),
        topic: str(a, "topic"),
        type: str(a, "type"),
        all: !!a.opt.all,
        json: !!a.opt.json
      })
    }
  },
  tools: {
    learn: {
      description: "Record one fact the team should remember (`crew.mjs learn`): a decision, learning, gotcha, convention or risk, with why, scoped to the paths it applies to. Refused if it looks like a secret.",
      input: obj({
        type: { type: "string", enum: ["decision", "learning", "gotcha", "convention", "risk"] },
        title: text("the fact, one line"),
        why: text("the reason or evidence"),
        scope: text("comma-separated path globs; omit for everywhere"),
        source: text("the plan or item it came from"),
        supersedes: text("a K-\u2026 entry this replaces"),
        likelihood: text("risks: H/M/L"),
        impact: text("risks: H/M/L"),
        owner: text("risks: who watches it")
      }, ["type", "title", "why"]),
      run: (st, a) => {
        learn(st, s(a, "type"), s(a, "title"), {
          why: s(a, "why"),
          scope: s(a, "scope"),
          source: s(a, "source"),
          supersedes: s(a, "supersedes"),
          likelihood: s(a, "likelihood"),
          impact: s(a, "impact"),
          owner: s(a, "owner")
        });
      }
    },
    recall: {
      description: "The knowledge that applies (`crew.mjs recall --json`): to a plan's touches, to paths, or to a topic. Call it before working in an area.",
      input: obj({
        plan: text("e.g. P-004: match its touches"),
        paths: text("comma-separated paths"),
        topic: text("words to match"),
        type: { type: "string", enum: ["decision", "learning", "gotcha", "convention", "risk"] },
        all: { type: "boolean" }
      }),
      run: (st, a) => recallCmd(st, {
        plan: s(a, "plan"),
        paths: s(a, "paths"),
        topic: s(a, "topic"),
        type: s(a, "type"),
        all: a.all === true,
        json: true
      })
    }
  }
};

// src/hub/commands/team/runs.ts
var WORKFLOWS = {
  kickoff: ["preflight", "discover", "design", "guidelines", "hub", "git", "graph", "idea-and-plan"],
  onboard: ["preflight", "map", "discover", "design", "guidelines", "hub", "git", "graph"]
};
var steps = (name) => WORKFLOWS[name] ?? fail(`Unknown workflow '${name}'. Workflows: ${Object.keys(WORKFLOWS).join(", ")}.`);
function recordStep(store, workflow, step, o = {}) {
  store.require();
  const all = steps(workflow);
  if (!step) fail(`Name the step: --step ${all.join("|")}.`);
  if (!all.includes(step)) fail(`${workflow} has no step '${step}'. Steps: ${all.join(", ")}.`);
  const state = o.skip ? "skipped" : "done";
  store.ledger.record("checkpoint", null, { workflow, step, state, ...o.note ? { note: o.note } : {} });
  store.say(`${workflow}: ${step} ${state}`);
}
function workflowState(events, workflow) {
  const last = /* @__PURE__ */ new Map();
  for (const e of events) if (e.type === "checkpoint" && e.workflow === workflow) last.set(String(e.step), e);
  return steps(workflow).map((step) => ({ step, event: last.get(step) ?? null }));
}
function resumeWorkflow(store, workflow, json = false) {
  store.require();
  const state = workflowState(store.ledger.events(), workflow);
  const next = state.find((s2) => !s2.event)?.step ?? null;
  if (json) {
    store.say(JSON.stringify({ workflow, next, steps: state.map(({ step, event }) => ({ step, state: event ? event.state : "pending", by: event?.actor ?? null, role: event?.role ?? null, ts: event?.ts ?? null })) }));
    return;
  }
  if (!state.some((s2) => s2.event)) store.say(`${workflow}: not started \u2014 begin with ${state[0].step}`);
  for (const { step, event } of state) {
    store.say(`  ${(event ? String(event.state) : "pending").padEnd(8)} ${step}` + (event ? `  (${event.actor}${event.role ? `, ${event.role}` : ""}, ${event.ts.slice(0, 16).replace("T", " ")})${event.note ? ` \u2014 ${event.note}` : ""}` : ""));
  }
  store.say(next ? `next: ${next}` : `${workflow}: every step is done or skipped`);
}

// src/hub/commands/work/execution.reg.ts
var registration10 = {
  usage: [
    "  checkpoint [P-###] [--step T3] [--run CMD | --verify CMD --result pass|fail] [--ac 1,2|all] [--output TXT]",
    "             [--attempt WHAT --why WHY] [--note TXT] [--auto]   record where the work is (the plan of this branch by default)",
    "  resume [P-###] [--json] \xB7 handoff [P-###]     where the work stopped vs git now \xB7 write it into the plan's Handoff",
    "  checkpoint --workflow kickoff|onboard --step S [--skip] [--note] \xB7 resume --workflow W   a multi-step job's progress"
  ],
  cli: {
    checkpoint: {
      pos: [],
      rest: true,
      str: ["step", "run", "verify", "result", "ac", "output", "attempt", "why", "note", "workflow"],
      flag: ["auto", "skip"],
      choices: { result: ["pass", "fail"] },
      run: (s2, a) => a.opt.workflow ? recordStep(s2, str(a, "workflow"), str(a, "step"), { skip: !!a.opt.skip, note: str(a, "note") }) : checkpoint(s2, a.pos[0], {
        step: str(a, "step"),
        run: str(a, "run"),
        verify: str(a, "verify"),
        result: str(a, "result"),
        ac: str(a, "ac"),
        output: str(a, "output"),
        attempt: str(a, "attempt"),
        why: str(a, "why"),
        note: str(a, "note"),
        auto: !!a.opt.auto
      })
    },
    resume: {
      pos: [],
      rest: true,
      str: ["note", "workflow"],
      flag: ["json", "team"],
      run: (s2, a) => a.opt.team ? resumeTeam(s2, str(a, "note")) : a.opt.workflow ? resumeWorkflow(s2, str(a, "workflow"), !!a.opt.json) : resume(s2, a.pos[0], !!a.opt.json)
    },
    handoff: { pos: [], rest: true, run: (s2, a) => handoff(s2, a.pos[0]) }
  },
  tools: {
    checkpoint: {
      description: "Record where the work on a plan stands (`crew.mjs checkpoint`): the step, the commit and dirty files, a check you ran with its result and the acceptance criteria it covers, or an approach that failed and why. Call it after each task or check, and whenever an approach fails. A failed check returns an error result but is still recorded.",
      input: obj({
        plan: text("e.g. P-004; default: the plan of this branch"),
        step: text("e.g. T3"),
        verify: text("the check you ran"),
        result: { type: "string", enum: ["pass", "fail"] },
        ac: text("criteria it covers: 1,2 or all"),
        output: text("the end of its output"),
        attempt: text("an approach that failed"),
        why: text("why it failed"),
        note: text("anything else"),
        workflow: text("instead of a plan: a workflow run (kickoff, onboard) whose step just finished"),
        skip: { type: "boolean" }
      }),
      run: (st, a) => s(a, "workflow") ? recordStep(st, s(a, "workflow"), s(a, "step"), { skip: a.skip === true, note: s(a, "note") }) : checkpoint(st, s(a, "plan"), {
        step: s(a, "step"),
        verify: s(a, "verify"),
        result: s(a, "result"),
        ac: s(a, "ac"),
        output: s(a, "output"),
        attempt: s(a, "attempt"),
        why: s(a, "why"),
        note: s(a, "note")
      })
    },
    resume: {
      description: "Where a plan's work stopped (`crew.mjs resume`): last checkpoint vs git now, check results, approaches not to retry, the next task and each criterion's evidence. Call it first when picking work up.",
      input: obj({ plan: text("e.g. P-004; default: the plan of this branch"), workflow: text("instead: a workflow run (kickoff, onboard)") }),
      run: (st, a) => s(a, "workflow") ? resumeWorkflow(st, s(a, "workflow")) : resume(st, s(a, "plan"))
    },
    handoff: {
      description: "Write the resume view into the plan's Handoff section (`crew.mjs handoff`), before ending a session.",
      input: obj({ plan: text("e.g. P-004; default: the plan of this branch") }),
      run: (st, a) => handoff(st, s(a, "plan"))
    }
  }
};

// src/hub/commands/work/review.reg.ts
var registration11 = {
  usage: [
    "  review P-### --approve | --changes TXT        code review of a plan in review (never by its implementer)"
  ],
  cli: {
    review: {
      pos: ["id"],
      str: ["changes"],
      flag: ["approve"],
      run: (s2, a) => review(s2, a.pos[0], { approve: !!a.opt.approve, changes: str(a, "changes") })
    }
  },
  tools: {
    review: {
      description: "Code review of a plan in review (`crew.mjs review`): approve, or request changes, which sends it back to the developer. Never by the plan's implementer; under the lifecycle preset the Architect's, and done needs an approval of the current code.",
      input: obj({ id: text("e.g. P-004"), approve: { type: "boolean" }, changes: text("what must change") }, ["id"]),
      run: (st, a) => {
        review(st, s(a, "id"), { approve: a.approve === true, changes: s(a, "changes") });
      }
    }
  }
};

// src/hub/commands/work/release.reg.ts
var registration12 = {
  usage: [
    "  merge-order [--json]                          done plans to merge, dependencies first (Release)",
    "  refresh-bin [--check]                         copy the policy's release.refresh_bin files into .crew/bin (Release, in a plan worktree)"
  ],
  cli: {
    "merge-order": { pos: [], flag: ["json"], run: (s2, a) => mergeOrderCmd(s2, !!a.opt.json) },
    "refresh-bin": { pos: [], flag: ["check"], run: (s2, a) => refreshBin(s2, s2.ws.root, !!a.opt.check) }
  },
  tools: {
    merge_order: {
      description: "What Release merges next (`crew.mjs merge-order`): done plans with unmerged branches, dependencies first; plans waiting on an unmerged dependency; merged branches to delete.",
      input: obj({ json: { type: "boolean" } }),
      run: (st, a) => mergeOrderCmd(st, a.json === true)
    }
  }
};

// src/hub/commands/work/suite.ts
import { spawnSync as spawnSync5 } from "node:child_process";
import { randomBytes as randomBytes3 } from "node:crypto";
import { appendFileSync as appendFileSync3, existsSync as existsSync12, linkSync as linkSync2, mkdirSync as mkdirSync5, readFileSync as readFileSync10, renameSync as renameSync3, statSync as statSync9, unlinkSync as unlinkSync2, writeFileSync as writeFileSync3 } from "node:fs";
import { hostname } from "node:os";
import { join as join20 } from "node:path";
var POLL_MS = 1e3;
var UNWRITTEN_STALE_MS = 6e4;
function home(store) {
  const common = commonDir(store.ws.root);
  return common ? join20(common, "crew") : store.dir;
}
function suiteSettings(store) {
  const hub = yamlBlock(store.ws.read(join20(store.dir, "config.yaml")) ?? "", "hub");
  const command2 = hub.full_suite;
  if (!command2) fail("No hub.full_suite in .crew/config.yaml.");
  const slots = hub.suite_slots ?? "1";
  if (!/^\d+$/.test(slots) || parseInt(slots, 10) < 1) fail("hub.suite_slots: expected a whole number of at least 1");
  return { command: command2, slots: parseInt(slots, 10) };
}
function holder(text2) {
  try {
    const h = JSON.parse(text2);
    return h && typeof h === "object" && typeof h.token === "string" && typeof h.pid === "number" ? h : null;
  } catch {
    return null;
  }
}
function isStale(text2, file) {
  const h = holder(text2);
  if (!h) {
    try {
      return Date.now() - statSync9(file).mtimeMs > UNWRITTEN_STALE_MS;
    } catch {
      return false;
    }
  }
  if (h.host !== hostname()) return false;
  try {
    process.kill(h.pid, 0);
    return false;
  } catch (e) {
    return e.code === "ESRCH";
  }
}
function takeOverIfStale2(file, token) {
  let seen;
  try {
    seen = readFileSync10(file, "utf8");
  } catch {
    return true;
  }
  if (!isStale(seen, file)) return false;
  const aside = `${file}.stale-${token}`;
  try {
    renameSync3(file, aside);
  } catch {
    return true;
  }
  let freed = true;
  if (readFileSync10(aside, "utf8") !== seen) {
    try {
      linkSync2(aside, file);
      freed = false;
    } catch {
    }
  }
  unlinkSync2(aside);
  return freed;
}
var sleep = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
function takeSlot(dir, slots, me) {
  mkdirSync5(dir, { recursive: true });
  const body2 = JSON.stringify(me);
  for (let said = false; ; ) {
    for (let i = 0; i < slots; i++) {
      try {
        writeFileSync3(join20(dir, `slot-${i}.lock`), body2, { flag: "wx" });
        return i;
      } catch (e) {
        if (e.code !== "EEXIST") throw e;
      }
    }
    let freed = false;
    for (let i = 0; i < slots; i++) freed = takeOverIfStale2(join20(dir, `slot-${i}.lock`), me.token) || freed;
    if (freed) continue;
    if (!said) {
      const held = [...Array(slots).keys()].map((i) => {
        try {
          return holder(readFileSync10(join20(dir, `slot-${i}.lock`), "utf8"));
        } catch {
          return null;
        }
      }).filter((h) => h !== null).map((h) => `${h.run} (${h.ref ?? "no ref"}, since ${h.started})`);
      process.stderr.write(`suite: waiting for a slot \u2014 held by ${held.join("; ") || "another run"}
`);
      said = true;
    }
    sleep(POLL_MS);
  }
}
function releaseSlot(file, token) {
  try {
    if (holder(readFileSync10(file, "utf8"))?.token === token) unlinkSync2(file);
  } catch {
  }
}
function runSuite(store, { cwd, ref }) {
  const { command: command2, slots } = suiteSettings(store);
  const dir = home(store), run2 = store.ledger.who.run, t0 = Date.now();
  const me = {
    token: `${process.pid}-${randomBytes3(6).toString("hex")}`,
    pid: process.pid,
    host: hostname(),
    run: run2,
    ref: ref ?? null,
    worktree: cwd,
    started: (/* @__PURE__ */ new Date()).toISOString()
  };
  const slot = takeSlot(join20(dir, "suite"), slots, me);
  const t1 = Date.now();
  let exit = 1;
  try {
    const r = spawnSync5(command2, { shell: true, cwd, stdio: "inherit" });
    exit = r.status ?? 1;
  } finally {
    releaseSlot(join20(dir, "suite", `slot-${slot}.lock`), me.token);
  }
  const t2 = Date.now();
  const rec = {
    ts: new Date(t2).toISOString(),
    ref: ref ?? null,
    run: run2,
    worktree: cwd,
    slot,
    wait_ms: t1 - t0,
    run_ms: t2 - t1,
    exit
  };
  const file = join20(dir, "suites.jsonl");
  const torn = existsSync12(file) && statSync9(file).size > 0 && !readFileSync10(file, "utf8").endsWith("\n");
  appendFileSync3(file, `${torn ? "\n" : ""}${JSON.stringify(rec)}
`);
  return { exit, waitMs: rec.wait_ms, runMs: rec.run_ms };
}
var secs = (ms) => (ms / 1e3).toFixed(1);
function suiteCmd(store, ref) {
  store.require();
  const r = runSuite(store, { cwd: store.ws.root, ref: ref?.toUpperCase() });
  store.say(`suite: exit ${r.exit} (waited ${secs(r.waitMs)}s, ran ${secs(r.runMs)}s)`);
  return r.exit;
}
function suites(store, limit = 20) {
  const file = join20(home(store), "suites.jsonl");
  if (!existsSync12(file)) return [];
  const recs = readFileSync10(file, "utf8").split("\n").flatMap((l) => {
    try {
      return l.trim() ? [JSON.parse(l)] : [];
    } catch {
      return [];
    }
  });
  return recs.reverse().slice(0, Math.max(0, limit));
}
function suitesCmd(store, limit = 20, json = false) {
  const recs = suites(store, limit);
  if (json) return store.say(JSON.stringify(recs, null, 2));
  if (!recs.length) return store.say("No suite runs recorded.");
  for (const r of recs) {
    store.say(`${r.ts}  ${r.ref ?? "-"}  ${r.run}  slot ${r.slot}  waited ${secs(r.wait_ms)}s  ran ${secs(r.run_ms)}s  exit ${r.exit}`);
  }
}

// src/hub/commands/work/suite.reg.ts
var registration13 = {
  usage: [
    "  suite [--ref P-###]                           run hub.full_suite under a slot shared by every worktree (Release)",
    "  suites [--limit 20] [--json]                  recorded full-suite runs, newest first: queue wait and duration"
  ],
  cli: {
    suite: { pos: [], str: ["ref"], run: (s2, a) => suiteCmd(s2, str(a, "ref")) },
    suites: { pos: [], int: ["limit"], flag: ["json"], run: (s2, a) => suitesCmd(s2, a.num.limit, !!a.opt.json) }
  },
  tools: {
    suites: {
      description: "Recorded full-suite runs (`crew.mjs suites`), newest first: ts, ref, run, worktree, slot, wait_ms, run_ms, exit.",
      input: obj({ limit: num("how many, newest first (default 20)") }),
      run: (st, a) => suitesCmd(st, n(a, "limit"), true)
    }
  }
};

// src/hub/commands/memory/context.ts
var DEFAULT_BUDGET = 6e3;
var para = (text2, n2 = 3) => stripComments(text2).split("\n").map((l) => l.trim()).filter(Boolean).slice(0, n2);
var TYPES = {
  developer: ["gotcha", "convention", "decision", "learning", "risk"],
  qa: ["gotcha", "risk", "learning", "decision", "convention"],
  architect: ["decision", "convention", "risk", "gotcha", "learning"],
  release: ["risk", "decision", "gotcha", "convention", "learning"]
};
function planSections(store, plan, role) {
  const items2 = store.items(), plans2 = store.plans(true), goals2 = store.goals();
  const goal = goals2.get(planGoal(plan, items2));
  const idea2 = store.idea();
  const why = { title: "Goal", more: plan.path ? store.rel(plan.path) : plan.id, lines: [
    ...idea2 ? [`Idea: ${idea2.get("title")} \u2014 ${firstParagraph(idea2.section("Outcome"))}`] : [],
    ...goal ? [`${goal.id}${goal.id === store.focus() ? " (focus)" : ""}: ${goal.get("title")} \u2014 ${firstParagraph(goal.section("Outcome"))}`] : [],
    ...para(plan.section("Context"), 4)
  ] };
  const ev = evidence(store, plan);
  const ac = { title: "Acceptance criteria", more: `crew.mjs resume ${plan.id}`, lines: criteria(plan).map((c, i) => `AC${i + 1} ${!ev[i]?.verify ? "\xB7" : !ev[i].verify.ok ? "\u2717" : ev[i].independent ? "\u2713" : "\u2713 self"} ${c}`) };
  const tasks = {
    title: "Remaining tasks",
    more: plan.path ? store.rel(plan.path) : plan.id,
    lines: plan.tasks().filter(([d]) => !d).map(([, t]) => t)
  };
  const waits = unmetDeps(plan, plans2), asks = openQuestions(store.ledger.events(), plan.id);
  const over = overlapping(plan, plans2, sharedGlobs(store)), outside = drift(plan, store.baseBranch(), store.planHome(plan.id)) ?? [];
  const questions2 = { title: "Open questions", more: "crew.mjs questions", lines: [
    ...asks.map((x) => `${x.blocking ? "blocking: " : ""}${x.id} ${x.by} \u2192 ${x.to}: ${x.text}`),
    ...openQuestions(store.ledger.events()).filter((x) => x.to === role && x.ref !== plan.id).map((x) => `for you: ${x.id} from ${x.by}${x.ref ? ` about ${x.ref}` : ""}: ${x.text}`)
  ] };
  const blockers = { title: "Blockers & coordination", more: "crew.mjs questions", lines: [
    ...waits.map((d) => `waits for ${d} (${plans2.get(d)?.get("status")})`),
    ...over.map((o) => `overlaps ${o.id} (${plans2.get(o.id)?.get("status")}) on ${o.globs.join(", ")}`),
    ...outside.length ? [`changes outside touches: ${outside.slice(0, 6).join(", ")}${outside.length > 6 ? " \u2026" : ""}`] : []
  ] };
  const order = TYPES[role] ?? TYPES.developer;
  const known = recall(store.knowledge(), { globs: plan.touches() }).sort((a, b) => order.indexOf(a.type) - order.indexOf(b.type));
  const memory = { title: "Knowledge in scope", more: `crew.mjs recall --plan ${plan.id}`, lines: known.map(line2) };
  const recover = { title: "Where the work stands", more: `crew.mjs resume ${plan.id}`, lines: recovery(store, plan) };
  const handoff3 = { title: "Handoff & log", more: `crew.mjs ledger --ref ${plan.id}`, lines: [
    ...para(plan.section("Handoff"), 6),
    ...para(plan.section("Progress log"), 99).slice(-3)
  ] };
  const sect = (title, name) => ({ title, more: plan.path ? store.rel(plan.path) : plan.id, lines: para(plan.section(name), 8) });
  const bugs = { title: "Open bugs in this goal", more: "crew.mjs status", lines: [...items2.values()].filter((i) => i.id.startsWith("BUG-") && goal && i.get("goal")?.toUpperCase() === goal.id && !["done", "wontfix", "duplicate"].includes(itemStatus(i, plans2))).map((i) => `${i.id} ${i.get("severity") ?? ""} ${i.get("title")} [${itemStatus(i, plans2)}]`) };
  switch (role) {
    case "qa":
      return [questions2, why, ac, sect("Test plan", "Test plan"), recover, bugs, memory, blockers];
    case "architect":
      return [questions2, why, sect("Approach", "Approach"), sect("Risks & open questions", "Risks & open questions"), blockers, memory, ac];
    case "release":
      return [questions2, why, sect("Rollout & rollback", "Rollout & rollback"), blockers, ac, memory];
    default:
      return [recover, questions2, why, ac, tasks, blockers, memory, handoff3];
  }
}
var line2 = (e) => `${e.id} [${e.type}${e.origin === "playbook" ? ", playbook" : ""}] ${e.title}`;
function projectSections(store, role) {
  const idea2 = store.idea(), focus = store.goals().get(store.focus());
  const crit = idea2?.checklist("Success criteria") ?? [];
  const head = { title: "Idea & focus", more: "crew.mjs status", lines: [
    idea2 ? `Idea: ${idea2.get("title")} [${idea2.get("status")}]${crit.length ? ` \u2014 success criteria ${crit.filter(([d]) => d).length}/${crit.length}` : ""}` : "No idea written yet.",
    focus ? `Focus ${focus.id}: ${focus.get("title")} \u2014 ${firstParagraph(focus.section("Outcome"))}` : "No focus goal."
  ] };
  const next = {
    title: role === "any" ? "Next" : `Next for ${role}`,
    more: `crew.mjs next${role === "any" ? "" : ` --role ${role}`}`,
    lines: role === "any" ? nextLines(store) : roleLines(store, role)
  };
  const events = store.ledger.events();
  const team = { title: "Team", more: "crew.mjs ledger", lines: [
    ...[...store.ledger.claims(events).values()].map((c) => `${c.ref} held by ${c.actor} (${c.run})`),
    ...openQuestions(events).filter((x) => x.escalation).map((x) => `escalation ${x.id} waits for the ${x.to}: ${x.text}`)
  ] };
  const spend = store.ledger.spend(events);
  if (spend.cost) team.lines.push(`spend so far $${spend.cost.toFixed(2)}`);
  const memory = { title: "Recent knowledge", more: "crew.mjs recall", lines: store.knowledge(false).filter((e) => !e.supersededBy).sort((a, b) => (b.doc.get("created") ?? "").localeCompare(a.doc.get("created") ?? "")).slice(0, 5).map(line2) };
  return [head, next, team, memory];
}
function assemble2(header, sections2, budget) {
  const out = [header];
  let used = header.length + 1;
  const push = (l) => {
    if (used + l.length + 1 > budget) return false;
    out.push(l);
    used += l.length + 1;
    return true;
  };
  for (const [n2, s2] of sections2.filter((x) => x.lines.length).entries()) {
    const pointer = `(more: ${s2.more})`;
    if (!push(`## ${s2.title}`)) {
      const rest = `\u2026 also: ${sections2.filter((x) => x.lines.length).slice(n2).map((x) => `${x.title} (${x.more})`).join(" \xB7 ")}`;
      const room = budget - used - 1;
      if (room >= 40) push(rest.length <= room ? rest : `${rest.slice(0, room - 1)}\u2026`);
      break;
    }
    for (const [i, l] of s2.lines.entries()) {
      const room = budget - used - 1 - (i < s2.lines.length - 1 ? pointer.length + 1 : 0);
      if (l.length + 1 > room) {
        push(pointer);
        break;
      }
      push(`- ${l}`.slice(0, room));
    }
  }
  return out;
}
function context(store, o = {}) {
  store.require();
  const role = o.role ?? store.ledger.who.role ?? "any";
  const roles = store.policy.roles;
  if (role !== "any" && !roles.includes(role)) fail(`Unknown role '${role}'. Roles: ${roles.join(", ")}.`);
  const budget = o.budget ?? DEFAULT_BUDGET;
  if (budget < 200) fail("--budget must be at least 200 characters.");
  const pid = o.id?.toUpperCase() ?? /^plan\/(P-\d+)/.exec(currentBranch() ?? "")?.[1];
  const plan = pid ? store.plans(true).get(pid) ?? fail(`No plan ${pid}.`) : null;
  const home2 = plan ? store.planHome(plan.id) : null;
  const header = `crew context${role === "any" ? "" : ` \u2014 ${role}`}${plan ? ` \u2014 ${plan.id}: ${plan.get("title")} [${plan.get("status")}]` : ""}` + (home2 && home2 !== store.ws.root ? ` \u2014 work in ${store.rel(home2)}` : "");
  const lines = assemble2(header, plan ? planSections(store, plan, role) : projectSections(store, role), budget);
  if (o.json) store.say(JSON.stringify({ plan: plan?.id ?? null, role, budget, text: lines.join("\n") }));
  else for (const l of lines) store.say(l);
}

// src/hub/commands/memory/context.reg.ts
var registration14 = {
  usage: [
    "  context [P-###] [--role R] [--budget CHARS] [--json]   what you need right now, within a budget (default 6000 chars)"
  ],
  cli: {
    context: {
      pos: [],
      rest: true,
      str: ["role"],
      int: ["budget"],
      flag: ["json"],
      run: (s2, a) => context(s2, { id: a.pos[0], role: str(a, "role"), budget: a.num.budget, json: !!a.opt.json })
    }
  },
  tools: {
    context: {
      description: "What you need right now (`crew.mjs context`): for a plan, where the work stands, its goal, criteria with evidence, tasks, blockers and questions, knowledge in scope; without one, the idea, focus, your next steps and the team. Sliced for your role and kept within a budget. Call it at the start of every session.",
      input: obj({
        plan: text("e.g. P-004; default: the plan of this branch"),
        role: text("a role: executive, director, pm, architect, developer, qa, release, or one the policy defines"),
        budget: num("characters, default 6000")
      }),
      run: (st, a) => context(st, { id: s(a, "plan"), role: s(a, "role"), budget: n(a, "budget") })
    }
  }
};

// src/hub/commands/views/advisor.reg.ts
var registration15 = {
  usage: [
    "  next [--role R] \xB7 current \xB7 check \xB7 status [--write]    (roles: executive, director, pm, architect, developer, qa, release + the policy's)"
  ],
  cli: {
    current: { pos: [], run: (s2) => current(s2) },
    next: { pos: [], str: ["role"], run: (s2, a) => nextStep(s2, str(a, "role") ?? s2.ledger.who.role ?? void 0) }
  },
  tools: {
    next: {
      description: "The single best next step (`crew.mjs next`); with a role, that role's own queue, questions to it first.",
      input: obj({ role: text("a role: executive, director, pm, architect, developer, qa, release, or one the policy defines") }),
      run: (st, a) => nextStep(st, s(a, "role") ?? st.ledger.who.role ?? void 0)
    },
    current: {
      description: "Where work stands: the focus goal and the plan on the current branch (`crew.mjs current`).",
      input: obj(),
      run: (st) => current(st)
    }
  }
};

// src/hub/commands/team/guard.reg.ts
var registration16 = {
  usage: [
    "  guard                                         PreToolUse hook: reads the hook JSON on stdin, prints the decision"
  ],
  cli: {
    guard: { pos: [], run: (s2) => guard(s2) }
  }
};

// src/hub/commands/team/team.reg.ts
var registration17 = {
  usage: [
    "  assign PLAN_ID --to ROLE [--team T] [--note TXT]   open a ready plan for a role (start then needs it)",
    "  staff [--json]                                what can run in parallel now, within budgets.max_agents",
    "  reassign PLAN_ID [--to ROLE] [--note TXT] [--force]   release a stale claim and assign the plan again"
  ],
  cli: {
    reassign: {
      pos: ["id"],
      str: ["to", "note", "approved-by"],
      flag: ["force"],
      run: (s2, a) => reassign(s2, a.pos[0], str(a, "to"), str(a, "note"), !!a.opt.force, str(a, "approved-by"))
    },
    assign: {
      pos: ["id"],
      str: ["to", "team", "note", "approved-by"],
      required: ["to"],
      run: (s2, a) => assign(s2, a.pos[0], str(a, "to"), str(a, "team"), str(a, "note"), str(a, "approved-by"))
    },
    staff: { pos: [], flag: ["json"], run: (s2, a) => staff(s2, !!a.opt.json) }
  },
  tools: {
    assign: {
      description: "Open a ready plan for a role (`crew.mjs assign`): records who implements it; `start` then needs the assignment. Under the lifecycle preset only the PM assigns.",
      input: obj({
        id: text("e.g. P-004"),
        to: text("the role that implements it, usually developer"),
        team: text("optional team from the policy"),
        note: text("optional note")
      }, ["id", "to"]),
      run: (st, a) => {
        assign(st, s(a, "id"), s(a, "to"), s(a, "team"), s(a, "note"));
      }
    },
    staff: {
      description: "What can run in parallel now (`crew.mjs staff`): ready plans whose dependencies are done, that overlap nothing in progress or each other, within budgets.max_agents, each routed to a team; and why the others wait.",
      input: obj({ json: { type: "boolean" } }),
      run: (st, a) => staff(st, a.json === true)
    },
    reassign: {
      description: "Move stuck work to another run (`crew.mjs reassign`): releases a stale claim (limits.stale_claim_hours) and assigns the plan again; the next agent takes it over with start, which resumes its branch. Under the lifecycle preset, the Director's.",
      input: obj({ id: text("e.g. P-004"), to: text("role, default: the current assignment"), note: text("why") }, ["id"]),
      run: (st, a) => {
        reassign(st, s(a, "id"), s(a, "to"), s(a, "note"));
      }
    }
  }
};

// src/hub/commands/team/dispatch.ts
var View2 = class {
  constructor(store) {
    this.store = store;
    this.plans = store.plans();
    this.items = store.items();
    this.goals = store.goals();
    this.focus = store.focus();
    this.events = store.ledger.events();
    this.max = store.policy.policy.budgets.max_agents;
    this.moved = store.ledger.lastStatus(this.events);
  }
  store;
  plans;
  items;
  goals;
  focus;
  events;
  max;
  moved;
  /** A plan's status: the ledger knows it moved on even where its file doesn't yet. */
  status(p) {
    return this.moved.get(p.id) ?? p.get("status") ?? "";
  }
  withStatus(st) {
    return [...this.plans.values()].filter((p) => this.status(p) === st).sort(byKey((p) => [!onFocus(p, this.items, this.focus), p.id]));
  }
  ranked(st) {
    return ranked(this.items, this.goals, this.focus).filter((i) => itemStatus(i, this.plans) === st);
  }
  get claims() {
    return this.store.ledger.claims(this.events);
  }
  /** The run of the last event of `type` on a plan (by `role`, when given), or null. */
  lastRun(ref, type, role) {
    return this.events.filter((e) => e.ref === ref && e.type === type && (!role || e.role === role)).at(-1)?.run ?? null;
  }
};
var entry = (role, ref, task2, resume2 = null) => ({ role, ref, task: task2, resume: resume2 });
var urgent = (i) => i.id.startsWith("BUG-") && (i.get("severity") === "S1" || i.get("priority") === "P0");
var ROWS = [
  // 1. questions to a role (escalations to the executive are the human's)
  (v) => openQuestions(v.events).filter((x) => !x.escalation && x.to !== v.store.policy.policy.escalation.to).map((x) => entry(x.to, x.id, `answer ${x.id}${x.ref ? ` about ${x.ref}` : ""}: ${x.text}`)),
  // 2. Director exceptions: stale claims, blocked plans, a focus goal that is gone while another goal is active
  (v) => staleClaims(v.store, v.events).map((s2) => entry(
    "director",
    s2.ref,
    `reassign ${s2.ref}: its claim by ${s2.actor} (${s2.run}) has had no activity for ${s2.hours}h`
  )),
  (v) => v.withStatus("blocked").map((p) => entry("director", p.id, `unblock ${p.id}: ${p.get("title")}`)),
  (v) => {
    const g = v.goals.get(v.focus), next = goalQueue(v.goals, v.focus)[0];
    return (!g || CLOSED.has(g.get("status") ?? "")) && next && next !== v.focus ? [entry("director", next, `focus ${next}: the focus goal ${v.focus || "(none)"} is ${g ? g.get("status") : "not set"}`)] : [];
  },
  // 3. urgent bugs
  (v) => v.ranked("new").filter(urgent).map((i) => entry("pm", i.id, `triage ${i.id}: ${i.get("title")} (urgent)`)),
  // 4. release: merging is serial
  (v) => mergeOrder(v.store).merge.slice(0, 1).map((p) => entry("release", p.id, `merge ${p.id}: ${p.branch} (first in merge-order)`)),
  // 5. in review: a failing check, then the review, then QA's evidence, then completion
  (v) => v.withStatus("in-review").map((p) => {
    const ev = evidence(v.store, p);
    if (ev.some((e) => e.verify && !e.verify.ok)) return entry("developer", p.id, `fix ${p.id}: a check failed`, v.lastRun(p.id, "claim"));
    if (reviewProblems(v.store, p).length) return entry("architect", p.id, `review ${p.id}: ${p.get("title")}`);
    if (ev.some((e) => !(e.verify?.ok && e.independent))) return entry("qa", p.id, `test ${p.id}: ${p.get("title")}`, v.lastRun(p.id, "checkpoint", "qa"));
    return entry("pm", p.id, `complete ${p.id}: move ${p.id} done`);
  }),
  // 6. goal closure
  (v) => {
    const g = v.goals.get(v.focus);
    if (g?.get("status") !== "active") return [];
    const open = goalPlans(g.id, v.plans, v.items).some((p) => !CLOSED.has(v.status(p))) || goalItems(g.id, v.items).some((i) => itemStatus(i, v.plans) !== "done");
    return open ? [] : [entry("pm", g.id, `close ${g.id}: verify each criterion, then move ${g.id} done`)];
  },
  // 7. in progress
  (v) => v.withStatus("in-progress").map((p) => {
    const claim = v.claims.get(p.id);
    return claim ? entry("developer", p.id, `continue ${p.id}: resume ${p.id}`, claim.run) : entry("developer", p.id, `start ${p.id}: take over its branch`, v.lastRun(p.id, "claim"));
  }),
  // 8. ready to start
  (v) => staffing(v.store).start.filter((p) => v.plans.has(p.id)).map((p) => p.assigned ? entry(p.assigned, p.id, `start ${p.id}: ${p.title}`) : entry("pm", p.id, `assign ${p.id} --to developer${p.team ? ` --team ${p.team}` : ""}: ${p.title}`)),
  // 9. triage
  (v) => v.ranked("new").filter((i) => !urgent(i)).map((i) => entry("pm", i.id, `triage ${i.id}: ${i.get("title")}`)),
  // 10. spec, while fewer plans are ready and unclaimed than max_agents
  (v, added) => {
    const claims = v.claims, ready = v.withStatus("ready").filter((p) => !claims.has(p.id)).length;
    const out = [], room = () => v.max === null || ready + out.length < v.max;
    const drafts = v.withStatus("draft").map((p) => entry("architect", p.id, `spec ${p.id} to ready: ${p.get("title")}`));
    const items2 = v.ranked("triaged").filter((i) => !i.get("plan") && (!v.focus || (i.get("goal") ?? "").toUpperCase() === v.focus || OFF_FOCUS_OK.has(i.id.split("-")[0]))).map((i) => entry("architect", i.id, `write a plan for ${i.id}: ${i.get("title")}`));
    const taken = new Set(added.map((e) => e.ref));
    for (const e of [...drafts, ...items2]) if (!taken.has(e.ref) && room()) out.push(e);
    return out;
  }
];
function dispatch(store) {
  const v = new View2(store), p = paused(v.events);
  if (p) return { max_agents: v.max, paused: String(p.reason ?? "no reason given"), entries: [], more: 0 };
  const { held } = escalationHolds(v.events);
  const asked = new Set(openQuestions(v.events).filter((x) => x.blocking && x.ref).map((x) => x.ref));
  const all = [], seen = /* @__PURE__ */ new Set();
  for (const row of ROWS) {
    for (const e of row(v, all)) {
      if (e.ref && (held.has(e.ref) || seen.has(e.ref) || asked.has(e.ref) && !e.task.startsWith("answer "))) continue;
      if (e.ref) seen.add(e.ref);
      all.push(e);
    }
  }
  if (!all.length) all.push(...stall(v, held));
  const cut = v.max === null ? all.length : Math.min(v.max, all.length);
  return { max_agents: v.max, paused: null, entries: all.slice(0, cut), more: all.length - cut };
}
function stall(v, held) {
  const open = [...v.plans.values()].some((p) => !CLOSED.has(v.status(p))) || [...v.items.values()].some((i) => itemStatus(i, v.plans) !== "done" && !ITEM_CLOSED.has(itemStatus(i, v.plans)));
  if (!open) return [];
  const why = [
    ...staffing(v.store).waiting.map((w) => `${w.id}: ${w.why}`),
    ...[...held].map(([ref, qs]) => `${ref}: held by ${qs.join(", ")}`)
  ];
  return [entry("director", null, `stall: nothing can move${why.length ? ` \u2014 ${why.join("; ")}` : ""}`)];
}
function dispatchCmd(store, json = false) {
  store.require();
  const d = dispatch(store);
  if (json) {
    store.say(JSON.stringify(d, null, 2));
    return;
  }
  if (d.paused !== null) {
    store.say(`nothing to dispatch: the team is paused (${d.paused}) \u2014 \`resume\` first`);
    return;
  }
  if (!d.entries.length) store.say("nothing to dispatch: no open work");
  for (const e of d.entries) store.say(`DISPATCH  ${e.role}  ${e.ref ?? "-"}  ${e.task}${e.resume ? `  (resume ${e.resume})` : ""}`);
  if (d.more) store.say(`\u2026 and ${d.more} more (budgets.max_agents)`);
}

// src/hub/commands/team/dispatch.reg.ts
var registration18 = {
  usage: [
    "  dispatch [--json]                             who works on what next: one {role, ref, task, resume} per entry, within budgets.max_agents"
  ],
  cli: {
    dispatch: { pos: [], flag: ["json"], run: (s2, a) => dispatchCmd(s2, !!a.opt.json) }
  },
  tools: {
    dispatch: {
      description: "Who works on what next (`crew.mjs dispatch`): one entry {role, ref, task, resume} per actionable document \u2014 questions, Director exceptions, urgent bugs, release, review, goal closure, in progress, ready, triage, specs, a stall \u2014 cut to budgets.max_agents (`more` counts the rest). `/crew:team` launches one agent per entry.",
      input: obj({ json: { type: "boolean" } }),
      run: (st) => dispatchCmd(st, true)
    }
  }
};

// src/hub/commands/team/liveness.reg.ts
var registration19 = {
  usage: [
    "  pause [--reason TXT] \xB7 resume --team [--note TXT]     stop / restart staffing and starts (executive or director)"
  ],
  cli: {
    pause: { pos: [], str: ["reason"], run: (s2, a) => pauseTeam(s2, str(a, "reason")) }
  },
  tools: {
    pause: {
      description: "Pause the team (`crew.mjs pause`), or resume it with resume: true: while paused, staff and start refuse. The executive's or the Director's call.",
      input: obj({ reason: text("why (pause) or a note (resume)"), resume: { type: "boolean" } }),
      run: (st, a) => a.resume === true ? resumeTeam(st, s(a, "reason")) : pauseTeam(st, s(a, "reason"))
    }
  }
};

// src/hub/commands/team/agents.reg.ts
var registration20 = {
  usage: [
    "  agents [--check]                              render the role agents (.claude/agents/crew-<role>.md) from the policy"
  ],
  cli: {
    agents: { pos: [], flag: ["check"], run: (s2, a) => agents(s2, !!a.opt.check) }
  }
};

// src/hub/commands/team/questions.reg.ts
var registration21 = {
  usage: [
    "  ask [ID] --to ROLE TEXT [--fyi] \xB7 escalate [ID] TEXT \xB7 answer Q-\u2026 TEXT [--decision [--scope GLOBS]] [--approved-by NAME]",
    "  questions [--to ROLE] [--ref ID] [--all] [--json]       questions between roles; an open one blocks only its document"
  ],
  cli: {
    ask: {
      pos: ["text"],
      rest: true,
      str: ["to"],
      flag: ["fyi"],
      required: ["to"],
      run: (s2, a) => {
        const [ref, text2] = a.pos.length > 1 ? [a.pos[0], a.pos[1]] : [void 0, a.pos[0]];
        ask(s2, ref, str(a, "to"), text2, { fyi: !!a.opt.fyi });
      }
    },
    escalate: {
      pos: ["text"],
      rest: true,
      run: (s2, a) => {
        const [ref, text2] = a.pos.length > 1 ? [a.pos[0], a.pos[1]] : [void 0, a.pos[0]];
        escalate(s2, ref, text2);
      }
    },
    answer: {
      pos: ["id", "text"],
      str: ["scope", "approved-by"],
      flag: ["decision"],
      run: (s2, a) => answer(s2, a.pos[0], a.pos[1], { decision: !!a.opt.decision, scope: str(a, "scope"), approvedBy: str(a, "approved-by") })
    },
    questions: {
      pos: [],
      str: ["to", "ref"],
      flag: ["all", "json"],
      run: (s2, a) => listQuestions(s2, { to: str(a, "to"), ref: str(a, "ref"), all: !!a.opt.all, json: !!a.opt.json })
    }
  },
  tools: {
    ask: {
      description: "Ask another role a question (`crew.mjs ask`), recorded so it isn't lost. It blocks the document it is about from moving forward until answered (fyi: true doesn't block).",
      input: obj({
        ref: text("the document it is about, e.g. P-004"),
        to: text("a role: executive, director, pm, architect, developer, qa, release, or one the policy defines"),
        text: text("the question"),
        fyi: { type: "boolean" }
      }, ["to", "text"]),
      run: (st, a) => {
        ask(st, s(a, "ref"), s(a, "to"), s(a, "text"), { fyi: a.fyi === true });
      }
    },
    escalate: {
      description: "Escalate to the executive (`crew.mjs escalate`): reserved decisions, a goal at risk, anything only a human can settle. Blocks the document until a human answers.",
      input: obj({ ref: text("the document it is about"), text: text("what needs deciding, with the options") }, ["text"]),
      run: (st, a) => {
        escalate(st, s(a, "ref"), s(a, "text"));
      }
    },
    answer: {
      description: "Answer a question addressed to your role (`crew.mjs answer`); decision: true also records it as a decision entry. Escalations can't be answered here \u2014 only a human, on the CLI.",
      input: obj(
        { id: text("Q-\u2026"), text: text("the answer"), decision: { type: "boolean" }, scope: text("globs for the decision entry") },
        ["id", "text"]
      ),
      run: (st, a) => answer(st, s(a, "id"), s(a, "text"), { decision: a.decision === true, scope: s(a, "scope") })
    },
    questions: {
      description: "Open questions between roles (`crew.mjs questions --json`).",
      input: obj({ to: text("a role: executive, director, pm, architect, developer, qa, release, or one the policy defines"), ref: text("only about this document"), all: { type: "boolean" } }),
      run: (st, a) => listQuestions(st, { to: s(a, "to"), ref: s(a, "ref"), all: a.all === true, json: true })
    }
  }
};

// src/hub/commands/views/export.reg.ts
var registration22 = {
  usage: [
    "  export [--json] [--out FILE]                  interactive HTML view (.crew/view/index.html) or the graph as JSON"
  ],
  cli: {
    export: {
      pos: [],
      str: ["out"],
      flag: ["json"],
      run: (s2, a) => exportGraph(s2, a.opt.json ? "json" : "html", str(a, "out"))
    }
  }
};

// src/hub/server.ts
import { spawn } from "node:child_process";
import { randomBytes as randomBytes4 } from "node:crypto";
import { existsSync as existsSync14, mkdirSync as mkdirSync6, watch as watch2 } from "node:fs";
import { createServer } from "node:http";
import { basename as basename7, dirname as dirname8, join as join22 } from "node:path";

// src/hub/commands/views/design.ts
var import_yaml4 = __toESM(require_dist(), 1);
import { existsSync as existsSync13, readFileSync as readFileSync11 } from "node:fs";
import { dirname as dirname7, join as join21 } from "node:path";
var HANDOFF_KINDS = ["finalise", "locked", "revision", "screen-change", "screens-done", "screens-skipped"];
var STAGES = ["palette", "directions", "tune", "finalise", "screens", "done"];
var STATE_KEYS = ["stage", "shortlist", "variants", "current", "reviews"];
var REQUIRED_COLORS = ["background", "foreground", "primary", "primary-foreground"];
var FRONT = /^---\n([\s\S]*?)\n---\n/;
function designPath(store) {
  const cfg = store.ws.read(join21(store.dir, "config.yaml")) ?? "";
  return join21(store.ws.root, yamlBlock(cfg, "design").file ?? "docs/design/DESIGN.md");
}
var studioPath = (store) => join21(dirname7(designPath(store)), "studio.json");
function readDesign(store) {
  const path = designPath(store);
  const text2 = store.ws.read(path);
  if (text2 === null) return null;
  const m = FRONT.exec(text2);
  const tokens = m ? (0, import_yaml4.parse)(m[1]) ?? {} : {};
  return { path: store.rel(path), tokens, body: m ? text2.slice(m[0].length) : text2 };
}
function readStudio(store) {
  const text2 = store.ws.read(studioPath(store));
  if (text2 === null) return null;
  try {
    return JSON.parse(text2);
  } catch {
    fail(`${store.rel(studioPath(store))} is not valid JSON.`);
  }
}
var designPayload = (store) => ({ design: readDesign(store), studio: readStudio(store), served: true });
var revisionOf = (t) => Number.isInteger(Number(t.revision)) ? Number(t.revision) : 0;
function writeDesign(store, tokens, body2) {
  store.ws.write(designPath(store), `---
${(0, import_yaml4.stringify)(tokens, { lineWidth: 0 })}---
${body2}`);
}
function writeStudio(store, studio) {
  store.ws.write(studioPath(store), `${JSON.stringify(studio, null, 2)}
`);
}
function checkTokens(tokens) {
  if (!tokens || typeof tokens !== "object" || Array.isArray(tokens)) fail("tokens must be an object.");
  const t = tokens;
  if (typeof t.name !== "string" || !t.name) fail("tokens need a `name`.");
  const colors = t.colors ?? {};
  const missing = REQUIRED_COLORS.filter((c) => typeof colors[c] !== "string");
  if (missing.length) fail(`colors are missing ${missing.join(", ")}.`);
  return t;
}
function ordered(t, status2, revision) {
  const { version, name, description, status: _s, revision: _r, source, ...rest } = t;
  return {
    version: version ?? "alpha",
    name,
    ...description ? { description } : {},
    status: status2,
    revision,
    ...source ? { source } : {},
    ...rest
  };
}
var DEFAULT_BODY = (name) => `
# ${name}

Draft from the design studio. Claude writes the rationale (Overview, Colors, Typography, Layout, Elevation & Depth, Shapes, Components, Screens, Do's and Don'ts, Motion, Voice) at the Finalise step.
`;
function saveDesign(store, req) {
  const current2 = readDesign(store);
  const status2 = String(current2?.tokens.status ?? "draft");
  const reason = typeof req.reason === "string" ? req.reason.trim() : "";
  if (req.kind === "draft") {
    if (status2 === "final") fail(`${current2.path} is final (revision ${revisionOf(current2.tokens)}). Start a revision to change it.`);
    const t = checkTokens(req.tokens);
    writeDesign(store, ordered(t, "draft", 0), current2?.body ?? DEFAULT_BODY(String(t.name)));
    store.say(`Saved a draft of ${store.rel(designPath(store))}`);
  } else if (req.kind === "lock") {
    if (!current2) fail("There is no draft to lock yet. Save a draft first.");
    if (status2 === "final") fail(`${current2.path} is already final.`);
    checkTokens(current2.tokens);
    writeDesign(store, ordered(current2.tokens, "final", 1), current2.body);
    handoff2(store, { kind: "locked", note: "Design locked at revision 1: write the ADR (mention `DESIGN.md revision 1`) and the design block in config.yaml." });
    store.say(`Locked ${current2.path} at revision 1`);
  } else if (req.kind === "revision") {
    if (!current2 || status2 !== "final") fail("Only a final design is revised. Save a draft instead.");
    if (!reason) fail("A revision needs a reason (it goes into the ADR and the CHORE).");
    const n2 = revisionOf(current2.tokens) + 1;
    writeDesign(store, ordered(checkTokens(req.tokens), "final", n2), current2.body);
    if (store.ws.isDir(store.dirs.item)) {
      newItem(
        store,
        "chore",
        `Bring the UI onto design revision ${n2}`,
        void 0,
        `DESIGN.md revision ${n2}: ${reason}. Run \`check_design.mjs --all\` for the code that now drifts and move it onto the new tokens.`
      );
    }
    handoff2(store, { kind: "revision", note: `Revision ${n2}: ${reason}. Write the ADR (mention \`DESIGN.md revision ${n2}\`).` });
    store.say(`Saved ${current2.path} as revision ${n2}`);
  } else {
    fail("kind must be draft, lock or revision.");
  }
}
function updateStudio(store, patch) {
  const studio = readStudio(store) ?? {};
  for (const key of STATE_KEYS) if (key in patch) studio[key] = patch[key];
  if (studio.stage !== void 0 && !STAGES.includes(String(studio.stage))) fail(`stage must be one of ${STAGES.join(", ")}.`);
  writeStudio(store, studio);
  const h = patch.handoff;
  if (h) handoff2(store, h);
}
function handoff2(store, h) {
  if (!HANDOFF_KINDS.includes(h.kind)) fail(`handoff kind must be one of ${HANDOFF_KINDS.join(", ")}.`);
  const studio = readStudio(store) ?? {};
  const list = studio.handoffs ?? [];
  const next = Math.max(studio.handoff_seq ?? 0, ...list.map((x) => Number(x.id.slice(1)) || 0)) + 1;
  list.push({
    id: `h${next}`,
    kind: h.kind,
    ...h.note ? { note: String(h.note) } : {},
    ...h.screen ? { screen: String(h.screen) } : {},
    at: (/* @__PURE__ */ new Date()).toISOString()
  });
  writeStudio(store, { ...studio, handoffs: list, handoff_seq: next });
}
var HANDOFF_HELP = {
  finalise: "write the prose sections of DESIGN.md for the saved draft",
  locked: "write the ADR and set the design block in .crew/config.yaml",
  revision: "write the ADR for the revision",
  "screen-change": "revise this screen in studio.json \u2192 screens",
  "screens-done": "write DESIGN.md \u2192 Screens for the approved screens and create one FEAT item per screen",
  "screens-skipped": "tell the user `/crew:design page <name>` builds screens later"
};
function describe2(h) {
  return `${h.id}  ${h.kind}${h.screen ? ` (${h.screen})` : ""} \u2014 ${HANDOFF_HELP[h.kind]}${h.note ? `
     note: ${h.note}` : ""}`;
}
function designShow(store, json) {
  const design = readDesign(store);
  const studio = readStudio(store);
  if (json) return store.say(JSON.stringify({ design, studio }, null, 2));
  if (!design && !studio) return store.say("No design yet. Start with /crew:design init.");
  if (design) {
    const t = design.tokens;
    const typo = t.typography ?? {};
    store.say(`${design.path}: ${t.name ?? "(no name)"} \u2014 ${t.status ?? "draft"}, revision ${revisionOf(t)}, source ${t.source ?? "?"}`);
    store.say(`  type ${[typo.display?.fontFamily, typo.body?.fontFamily].filter(Boolean).join(" / ") || "?"} \xB7 shape ${t.rounded?.preset ?? "?"} \xB7 density ${t.density?.preset ?? "?"}`);
  }
  if (studio) {
    const reviews = Object.entries(studio.reviews ?? {});
    store.say(`studio: stage ${studio.stage ?? "palette"} \xB7 shortlist ${studio.shortlist?.join(", ") || "\u2014"} \xB7 ${studio.variants?.length ?? 0} pinned variant(s) \xB7 screens ${reviews.map(([id, r]) => `${id}=${r.status}`).join(", ") || "not reviewed"}`);
    for (const h of studio.handoffs ?? []) store.say(`  waiting on Claude: ${describe2(h)}`);
  }
}
function designDone(store, id) {
  const studio = readStudio(store) ?? fail("No studio.json yet.");
  const list = studio.handoffs ?? [];
  const left = id === "all" ? [] : list.filter((h) => h.id !== id);
  if (left.length === list.length && list.length) fail(`No hand-off '${id}' (open: ${list.map((h) => h.id).join(", ")}).`);
  writeStudio(store, { ...studio, handoffs: left });
  store.say(`Done: ${id === "all" ? `${list.length} hand-off(s)` : id}. The studio updates by itself.`);
}
function designWait(store, timeoutSec) {
  const path = studioPath(store);
  const pending = () => {
    try {
      return existsSync13(path) ? JSON.parse(readFileSync11(path, "utf8")).handoffs ?? [] : [];
    } catch {
      return [];
    }
  };
  const started = Date.now();
  const tick = () => {
    const list = pending();
    if (list.length) {
      process.stdout.write(`The studio handed ${list.length} step(s) to Claude:
${list.map((h) => `  ${describe2(h)}`).join("\n")}
Do each, then \`crew.mjs design done <id>\` (the page updates live) and run \`design wait\` again.
`);
      process.exit(0);
    }
    if (Date.now() - started > timeoutSec * 1e3) {
      process.stdout.write(`No hand-off from the studio in ${timeoutSec}s. Run \`design wait\` again to keep listening.
`);
      process.exit(3);
    }
    setTimeout(tick, 500);
  };
  tick();
}

// src/hub/server.ts
var str2 = (b, k) => typeof b[k] === "string" && b[k] ? b[k] : void 0;
var ACTIONS2 = {
  move: (s2, b) => {
    move(s2, str2(b, "id") ?? fail("id is required"), str2(b, "status") ?? fail("status is required"), str2(b, "note"));
  },
  log: (s2, b) => log(s2, (str2(b, "id") ?? fail("id is required")).toUpperCase(), str2(b, "text") ?? fail("text is required")),
  triage: (s2, b) => triage(s2, (str2(b, "id") ?? fail("id is required")).toUpperCase(), {
    priority: str2(b, "priority"),
    severity: str2(b, "severity"),
    goal: str2(b, "goal")
  }),
  focus: (s2, b) => setFocus(s2, str2(b, "goal") ?? fail("goal is required")),
  "design-save": (s2, b) => saveDesign(s2, b),
  "design-studio": (s2, b) => updateStudio(s2, b)
};
function runAction(open, name, body2) {
  const action2 = ACTIONS2[name];
  if (!action2) return { status: 404, output: [], error: `Unknown action '${name}'.` };
  const store = open();
  store.label = name;
  try {
    action2(store, body2);
    store.ws.flush();
    return { status: 200, output: store.ws.output };
  } catch (e) {
    store.ws.abort();
    if (!(e instanceof HubError)) throw e;
    return { status: 400, output: store.ws.output, error: e.message };
  }
}
function serve(store, o) {
  store.require();
  const token = randomBytes4(18).toString("base64url");
  const open = () => Store.open(store.ws.root);
  const clients = /* @__PURE__ */ new Set();
  let hosts = /* @__PURE__ */ new Set();
  const server = createServer((req, res) => {
    try {
      handle(req, res);
    } catch (e) {
      send(res, 500, { error: e.message });
    }
  });
  function handle(req, res) {
    if (!hosts.has(req.headers.host ?? "")) return send(res, 403, { error: "Unexpected Host header." });
    const path = (req.url ?? "/").split("?")[0];
    if (req.method === "GET" && (path === "/" || path === "/index.html")) {
      const page = renderHtmlShell(store).replace(
        DATA_SLOT,
        () => `${DATA_SLOT}<meta name="hub-token" content="${token}">`
      );
      res.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" });
      return res.end(page);
    }
    if (req.method === "GET" && path === "/design/") {
      res.writeHead(301, { location: "/design" });
      return res.end();
    }
    if (req.method === "GET" && path === "/design") {
      const page = renderStudioShell(store).replace(
        STUDIO_SLOT,
        () => `${STUDIO_SLOT}<meta name="hub-token" content="${token}">`
      );
      res.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" });
      return res.end(page);
    }
    if (req.method === "GET" && path === "/api/graph") return send(res, 200, buildGraph(open()));
    if (req.method === "GET" && path === "/api/design") return send(res, 200, designPayload(open()));
    if (req.method === "GET" && path === "/api/activity") {
      const s2 = open(), ref = new URLSearchParams((req.url ?? "").split("?")[1] ?? "").get("ref");
      if (ref === null) return send(res, 200, { running: running(s2), recent: readActivity(feedPath(s2)).slice(-50) });
      if (!/^[A-Z]+-\d+$/i.test(ref)) return send(res, 400, { error: `Not a hub ID: ${ref}` });
      const id = ref.toUpperCase(), mine = (e) => e.ref?.toUpperCase() === id;
      return send(res, 200, {
        running: running(s2).filter(mine),
        recent: readActivity(feedPath(s2)).filter(mine).slice(-50),
        feed: feedEntries(s2, id, 30)
      });
    }
    if (req.method === "GET" && path === "/api/events") {
      res.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-store", connection: "keep-alive" });
      res.write("retry: 1000\n\n");
      clients.add(res);
      req.on("close", () => clients.delete(res));
      return;
    }
    const m = /^\/api\/commands\/([\w-]+)$/.exec(path);
    if (req.method === "POST" && m) {
      const origin = req.headers.origin;
      if (req.headers["x-hub-token"] !== token || origin && !hosts.has(origin.replace(/^http:\/\//, ""))) {
        return send(res, 403, { error: "This page is not allowed to change the hub (token or origin mismatch)." });
      }
      return readJson(req).then((body2) => {
        const r = runAction(open, m[1], body2);
        send(res, r.status, r);
        if (r.status === 200) notify2();
      }, (e) => send(res, 400, { error: e.message }));
    }
    send(res, 404, { error: "Not found." });
  }
  let timer = null;
  function notify2() {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      for (const c of clients) c.write("event: change\ndata: {}\n\n");
    }, 150);
  }
  const ledgerDir = dirname8(store.ledger.path), common = commonDir(store.ws.root);
  mkdirSync6(ledgerDir, { recursive: true });
  const watched = [
    store.dir,
    dirname8(designPath(store)),
    ...ledgerDir !== store.dir ? [ledgerDir] : [],
    ...common ? [join22(common, "refs"), join22(common, "HEAD")] : []
  ];
  const watchers = [...new Set(watched)].filter((p) => existsSync14(p)).map((p) => watch2(p, { recursive: !p.endsWith("HEAD") && (p !== ledgerDir || p === store.dir) }, (_, file) => {
    const f = String(file ?? "");
    if (/\.lock$|\.stale-/.test(basename7(f))) return;
    if (!(p === store.dir && f.startsWith("view"))) notify2();
  }));
  return new Promise((resolve9, reject) => {
    const listen = (port, tries) => {
      server.once("error", (e) => {
        if (e.code === "EADDRINUSE" && tries > 0) listen(port + 1, tries - 1);
        else reject(e);
      });
      server.listen(port, "127.0.0.1", () => {
        const actual = server.address().port;
        hosts = /* @__PURE__ */ new Set([`127.0.0.1:${actual}`, `localhost:${actual}`]);
        const url = `http://127.0.0.1:${actual}/${o.page ?? ""}`;
        if (o.open) openBrowser(url);
        resolve9({ url, close: () => {
          watchers.forEach((w) => w.close());
          for (const c of clients) c.end();
          server.close();
        } });
      });
    };
    listen(o.port, o.port === 0 ? 0 : 10);
  });
}
function send(res, status2, body2) {
  res.writeHead(status2, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
  res.end(JSON.stringify(body2));
}
function readJson(req) {
  return new Promise((resolve9, reject) => {
    let raw = "";
    req.on("data", (c) => {
      raw += c;
      if (raw.length > 64e3) reject(new Error("Request too large."));
    });
    req.on("end", () => {
      try {
        const v = JSON.parse(raw || "{}");
        resolve9(v && typeof v === "object" && !Array.isArray(v) ? v : {});
      } catch {
        reject(new Error("Body must be JSON."));
      }
    });
  });
}
function openBrowser(url) {
  const cmd = process.platform === "darwin" ? "open" : process.platform === "win32" ? "explorer" : "xdg-open";
  spawn(cmd, [url], { stdio: "ignore", detached: true }).on("error", () => {
  }).unref();
}

// src/hub/commands/views/ui.reg.ts
var registration23 = {
  usage: [
    "  ui [--port 8765] [--no-open] [--design]       serve the view live on 127.0.0.1 (updates as files change);",
    "                                                --design opens the design studio (/design)"
  ],
  cli: {
    ui: { pos: [], int: ["port"], flag: ["no-open", "design"], run: (s2, a) => {
      serve(s2, { port: a.num.port ?? 8765, open: !a.opt["no-open"], page: a.opt.design ? "design" : void 0 }).then(
        ({ url }) => process.stdout.write(`Hub UI at ${url} \u2014 live while this runs (Ctrl-C to stop)
`),
        (e) => {
          process.stderr.write(`${e.message}
`);
          process.exit(1);
        }
      );
    } }
  }
};

// src/hub/commands/views/design.reg.ts
var registration24 = {
  usage: [
    "  design show [--json] \xB7 design wait [--timeout 1800] \xB7 design done ID|all",
    "                                                the design studio's state; wait blocks until the page hands a",
    "                                                step to Claude (run it in the background); done clears one"
  ],
  cli: {
    design: {
      pos: ["action"],
      rest: true,
      int: ["timeout"],
      flag: ["json"],
      choices: { action: ["show", "wait", "done"] },
      run: (s2, a) => {
        if (a.pos[0] === "show") return designShow(s2, !!a.opt.json);
        if (a.pos[0] === "wait") return designWait(s2, a.num.timeout ?? 1800);
        designDone(s2, a.pos[1] ?? "all");
      }
    }
  },
  tools: {
    design: {
      description: "The design studio's live state (`crew.mjs design show`): DESIGN.md's direction, status and revision, the page's stage, shortlist, pinned variants, screen reviews, and the steps it handed to Claude. With done: clear a hand-off you dealt with.",
      input: obj({ json: { type: "boolean", description: "the full DESIGN.md tokens and studio.json" }, done: text("a hand-off id (h3) or all") }),
      run: (st, a) => s(a, "done") ? designDone(st, s(a, "done")) : designShow(st, a.json === true)
    }
  }
};

// src/hub/commands/views/checks.reg.ts
var registration25 = {
  cli: {
    check: { pos: [], run: (s2) => check(s2) }
  },
  tools: {
    check: {
      description: "Validate .crew/ (`crew.mjs check`): ERROR and HINT lines; an error result means problems were found.",
      input: obj(),
      run: (st) => check(st)
    }
  }
};

// src/hub/commands/views/doctor.ts
var import_yaml5 = __toESM(require_dist(), 1);
import { spawnSync as spawnSync6 } from "node:child_process";
import { accessSync, constants, mkdirSync as mkdirSync7, rmSync as rmSync2, statSync as statSync10, writeFileSync as writeFileSync4 } from "node:fs";
import { join as join23, resolve as resolve8 } from "node:path";
var ok = (id, detail2) => ({ id, level: "ok", detail: detail2, fix: null });
var warn = (id, detail2, fix) => ({ id, level: "warn", detail: detail2, fix });
var bad = (id, detail2, fix) => ({ id, level: "fail", detail: detail2, fix });
function yamlFile(store, name) {
  const text2 = store.ws.read(join23(store.dir, name));
  try {
    const v = (0, import_yaml5.parse)(text2 ?? "");
    return v && typeof v === "object" ? v : {};
  } catch {
    return null;
  }
}
var branchOf = (home2) => git(["-C", home2, "branch", "--show-current"])?.trim() || null;
function baseBranch(store) {
  const base2 = store.baseBranch();
  return git(["-C", store.home, "rev-parse", "--verify", "-q", `refs/heads/${base2}`]) !== null ? ok("base-branch", base2) : bad("base-branch", `the base branch '${base2}' doesn't exist`, "set git.default_branch in .crew/config.yaml");
}
function mainCheckout(store) {
  if (!store.settings().plan_worktrees) return ok("main-checkout", "not needed without hub.plan_worktrees");
  const base2 = store.baseBranch(), at = branchOf(store.home);
  return at === base2 ? ok("main-checkout", `${store.home} is on ${base2}`) : bad(
    "main-checkout",
    `the main checkout (${store.home}) is on ${at ?? "a detached HEAD"}, not ${base2}`,
    `switch it back: git -C ${store.home} switch ${base2}`
  );
}
function planWorktrees(store) {
  return store.settings().plan_worktrees ? ok("plan-worktrees", "on") : warn("plan-worktrees", "hub.plan_worktrees is off: plans can't run side by side", "set hub.plan_worktrees: true in .crew/config.yaml");
}
function vendoredHub(store) {
  return store.ws.isFile(join23(store.dir, "bin", "crew.mjs")) ? ok("vendored-hub", ".crew/bin/crew.mjs") : bad("vendored-hub", ".crew/bin/crew.mjs is missing", "run `crew.mjs init`");
}
function agents2(store) {
  const problems = agentProblems(store);
  if (!problems.length) return [ok("agents", "rendered and up to date")];
  return problems.map((p) => warn(
    "agents",
    `${store.rel(p.path)} is ${p.problem}`,
    "the human runs `crew.mjs agents` and starts a new session"
  ));
}
function hookCommands(store) {
  const text2 = store.ws.read(join23(store.home, ".claude", "settings.json"));
  if (text2 === null) return null;
  try {
    const hooks2 = JSON.parse(text2).hooks ?? {};
    return Object.fromEntries(Object.entries(hooks2).map(([event, groups]) => [event, (Array.isArray(groups) ? groups : []).flatMap((g) => (g.hooks ?? []).map((h) => h.command ?? ""))]));
  } catch {
    return null;
  }
}
var HOOKS = [
  { event: "PreToolUse", re: /crew\.mjs guard\b/, name: "the PreToolUse guard (`crew.mjs guard`)", required: true },
  { event: "SubagentStop", re: /crew\.mjs usage --hook\b/, name: "the SubagentStop `crew.mjs usage --hook`", required: false },
  { event: "PostToolUse", re: /crew\.mjs activity --hook\b/, name: "the PostToolUse `crew.mjs activity --hook`", required: false }
];
function hooks(store) {
  const commands = hookCommands(store) ?? {}, fix = "the human runs `/crew:guidelines --refresh` (.claude/settings.json is protected)";
  const out = HOOKS.filter((h) => !(commands[h.event] ?? []).some((c) => h.re.test(c))).map((h) => (h.required ? bad : warn)("hooks", `.claude/settings.json has no ${h.name}`, fix));
  return out.length ? out : [ok("hooks", "guard, usage and activity hooks are set")];
}
function generated2(store) {
  const build = yamlBlock(store.ws.read(join23(store.dir, "config.yaml")) ?? "", "hub").build;
  if (!build) return ok("generated", "no hub.build");
  const n2 = trackedFiles(store.home).generated.size;
  return n2 ? ok("generated", `${n2} tracked file(s) marked linguist-generated`) : warn(
    "generated",
    "hub.build is set but .gitattributes marks no tracked file linguist-generated: Release can't tell generated files from source",
    "mark the build's outputs linguist-generated in .gitattributes"
  );
}
function shared(store) {
  const config2 = yamlFile(store, "config.yaml");
  const v = config2?.hub?.shared;
  if (v === void 0 || v === null) {
    return warn(
      "shared",
      "no hub.shared: every overlap on a registry or doc blocks staffing",
      "list the shared files (exact files, not directories) under hub.shared in .crew/config.yaml"
    );
  }
  return Array.isArray(v) && v.every((g) => typeof g === "string") ? ok("shared", `${v.length} shared glob(s)`) : bad("shared", "hub.shared: expected a list of path globs", "write hub.shared as a YAML list of exact files");
}
function policy(store) {
  const r = resolvePolicy(store.home, store.dir);
  if (r.errors.length) return bad("policy", r.errors[0], "fix .crew/policy.yaml (`crew.mjs policy check`)");
  const preset = yamlFile(store, "policy.yaml")?.preset;
  return typeof preset === "string" ? ok("policy", `preset: ${preset}`) : warn(
    "policy",
    "no preset: the team runs best under `preset: lifecycle` \u2014 a policy change, yours",
    "the human sets `preset: lifecycle` in .crew/policy.yaml, or decides against it"
  );
}
function hubCommits(store) {
  if (!store.settings().plan_worktrees) return ok("hub-commits", "not needed without hub.plan_worktrees");
  const base2 = store.baseBranch(), refused = probeHubCommit(store.home);
  return refused === null ? ok("hub-commits", `the git hooks accept a hub commit on ${base2}`) : bad(
    "hub-commits",
    `${refused.hook} refuses a hub commit on ${base2}: ${refused.message}`,
    `allow commits on ${base2} whose staged paths are all under .crew/ in your pre-commit (crew's git-setup hook does), or turn hub.plan_worktrees off`
  );
}
function doctorChecks(store, progress = () => {
}) {
  const checks = [
    baseBranch(store),
    mainCheckout(store),
    planWorktrees(store),
    vendoredHub(store),
    ...agents2(store),
    ...hooks(store),
    generated2(store),
    shared(store),
    policy(store)
  ];
  if (store.settings().plan_worktrees) progress("doctor: running the git hooks against a probe hub commit (hub-commits)\u2026");
  return [...checks, hubCommits(store)];
}
function doctor(store, json = false) {
  store.require();
  const checks = doctorChecks(store, json ? void 0 : (line3) => process.stderr.write(`${line3}
`));
  if (json) store.say(JSON.stringify({ checks }, null, 2));
  else {
    for (const c of checks) store.say(`${c.level.toUpperCase().padEnd(4)}  ${c.id}: ${c.detail}${c.fix ? ` \u2192 ${c.fix}` : ""}`);
  }
  return checks.some((c) => c.level === "fail") ? 1 : 0;
}
function runHook(home2, hook, args, env) {
  const opts = { cwd: home2, env, encoding: "utf8" };
  let r = spawnSync6("git", ["hook", "run", "--ignore-missing", hook, ...args.length ? ["--", ...args] : []], opts);
  if (r.status === 129 || /not a git command|usage: git hook/.test(r.stderr ?? "")) {
    const dir = git(["-C", home2, "rev-parse", "--git-path", "hooks"])?.trim();
    const file = dir ? resolve8(home2, dir, hook) : null;
    if (!file || !isExecutable(file)) return null;
    r = spawnSync6(file, args, opts);
  }
  if (r.status === 0) return null;
  const lines = `${r.stderr ?? ""}
${r.stdout ?? ""}`.split("\n").map((l) => l.trim()).filter(Boolean);
  return lines[0] ?? `exited with ${r.status ?? r.signal}`;
}
function isExecutable(file) {
  try {
    accessSync(file, constants.X_OK);
    return statSync10(file).isFile();
  } catch {
    return false;
  }
}
function probeHubCommit(home2) {
  const common = commonDir(home2);
  if (!common) return null;
  const dir = join23(common, "crew");
  mkdirSync7(dir, { recursive: true });
  const index = join23(dir, `doctor-index-${process.pid}`), msg = join23(dir, `doctor-msg-${process.pid}`);
  const env = { ...process.env, GIT_INDEX_FILE: index };
  const g = (args, input) => spawnSync6("git", ["-C", home2, ...args], { env, input, encoding: "utf8" });
  try {
    if (g(["rev-parse", "--verify", "-q", "HEAD"]).status === 0) g(["read-tree", "HEAD"]);
    else g(["read-tree", "--empty"]);
    const existing = g(["ls-tree", "-r", "HEAD", "--", ".crew"]).stdout?.split("\n").find((l) => / blob /.test(l));
    const blob = existing?.split(/\s+/)[2] ?? g(["hash-object", "-w", "--stdin"], "").stdout.trim();
    g(["update-index", "--add", "--cacheinfo", `100644,${blob},.crew/.doctor-probe`]);
    const pre = runHook(home2, "pre-commit", [], env);
    if (pre !== null) return { hook: "pre-commit", message: pre };
    writeFileSync4(msg, "chore(hub): doctor probe\n");
    const cm = runHook(home2, "commit-msg", [msg], env);
    return cm === null ? null : { hook: "commit-msg", message: cm };
  } finally {
    for (const f of [index, `${index}.lock`, msg]) rmSync2(f, { force: true });
  }
}

// src/hub/commands/views/doctor.reg.ts
var registration26 = {
  usage: [
    `  ${"doctor [--json]".padEnd(46)}is this project ready for the loop: OK/WARN/FAIL per check, with the fix`
  ],
  cli: {
    doctor: { pos: [], flag: ["json"], run: (s2, a) => doctor(s2, !!a.opt.json) }
  },
  tools: {
    doctor: {
      description: "Whether this project is ready for the autonomous loop (`doctor --json`): each check's id, level (ok, warn, fail), detail and fix; an error result means a check failed.",
      input: obj(),
      run: (st) => doctor(st, true)
    }
  }
};

// src/hub/commands/views/reports.ts
var TOP = 5;
var PLAN_HEADER = ["| Plan | Title | Goal | Status | Tasks | Owner |", "|---|---|---|---|---|---|"];
function status(store, write) {
  store.require();
  const goals2 = store.goals(), items2 = store.items(), plans2 = store.plans(true), focus = store.focus();
  const lines = [`# Status \u2014 ${today()}`, "", "_Generated by `crew.mjs status`. Do not edit by hand._", ""];
  const halt = paused(store.ledger.events());
  if (halt) lines.push(`**Team paused** by ${halt.actor} since ${halt.ts.slice(0, 16).replace("T", " ")}: ${halt.reason ?? "no reason given"}`, "");
  lines.push("## Idea and focus", "", ...ideaLines(store, goals2, plans2, items2, focus), "");
  const stale = staleClaims(store);
  if (stale.length) lines.push("## Stale claims", "", ...stale.map((s2) => `- ${s2.ref} \u2014 ${s2.actor} (${s2.run}), no activity for ${s2.hours}h`), "");
  const live = runningLines(store);
  if (live.length) lines.push("## Running now", "", ...live, "");
  const claims = store.ledger.claims();
  lines.push("## Now", "", ...planTable(byStatus(plans2, ["in-progress", "in-review"]), plans2, items2, claims), "");
  lines.push("## Blocked", "", ...blocked(plans2), "");
  const asks = openQuestions(store.ledger.events());
  if (asks.length) {
    lines.push("## Open questions", "", ...asks.sort((a, b) => Number(b.escalation) - Number(a.escalation)).map((x) => `- ${x.escalation ? "**escalation** " : ""}${x.id} ${x.by} \u2192 ${x.to}${x.ref ? ` about ${x.ref}` : ""}: ${x.text}`), "");
  }
  lines.push("## Ready to start", "", ...planTable(byStatus(plans2, ["ready"]), plans2, items2, claims), "");
  lines.push("## Top of the backlog", "", ...backlogTop(ranked(items2, goals2, focus), plans2), "");
  lines.push("## Open bugs", "", ...openBugs(items2, plans2), "");
  lines.push("## Recently done", "", ...recentlyDone(plans2));
  const learned = store.knowledge(false).filter((e) => !e.supersededBy).sort(byKey((e) => [e.doc.get("created") ?? "", e.id])).reverse().slice(0, TOP);
  if (learned.length) {
    lines.push("", "## Recent knowledge", "", ...learned.map((e) => `- ${e.id} [${e.type}] ${e.title}` + (e.scope.length ? ` (${e.scope.join(", ")})` : "")));
  }
  const spend = store.ledger.spend();
  if (spend.cost || spend.tokensIn || spend.tokensOut) {
    lines.push("", "## Spend", "", `$${spend.cost.toFixed(2)} \xB7 ${spend.tokensIn + spend.tokensOut} tokens \u2014 ` + Object.entries(spend.byActor).sort(([, a], [, b]) => b - a).map(([who, c]) => `${who} $${c.toFixed(2)}`).join(", "));
  }
  const untriaged = [...items2.values()].filter((i) => i.get("status") === "new").map((i) => i.id);
  if (untriaged.length) lines.push("", `**Untriaged items:** ${untriaged.join(", ")}`);
  const text2 = `${lines.join("\n").trimEnd()}
`;
  if (!write) return store.say(text2.trimEnd());
  store.ws.write(`${store.dir}/STATUS.md`, text2);
  store.say(`Wrote ${store.rel(`${store.dir}/STATUS.md`)}`);
}
function ideaLines(store, goals2, plans2, items2, focus) {
  const idea2 = store.idea();
  if (!idea2) return ["_No idea written yet._"];
  const criteria2 = idea2.checklist("Success criteria");
  const out = [`**${idea2.get("title")}** \u2014 ${idea2.get("status")}` + (criteria2.length ? ` \xB7 success criteria ${criteria2.filter(([d]) => d).length}/${criteria2.length} met` : "")];
  const g = goals2.get(focus);
  if (!g) return [...out, "", "_No focus goal._"];
  const gp = goalPlans(focus, plans2, items2);
  const closed = gp.filter((p) => ["done", "dropped"].includes(p.get("status") ?? "")).length;
  const outcome = firstParagraph(g.section("Outcome"));
  return [
    ...out,
    "",
    `Focus **${focus}: ${g.get("title")}** \u2014 ${g.get("status")}, ${closed}/${gp.length} plans closed`,
    ...outcome ? [`> ${outcome}`] : []
  ];
}
function byStatus(plans2, statuses) {
  return [...plans2.values()].filter((p) => statuses.includes(p.get("status") ?? "")).sort(byKey((p) => [p.id]));
}
function planTable(sel, plans2, items2, claims) {
  if (!sel.length) return ["_None._"];
  return [...PLAN_HEADER, ...sel.map((p) => {
    const t = p.tasks();
    const waits = unmetDeps(p, plans2);
    const src = p.source === "worktree" ? "" : ` (live on \`${p.source}\`)`;
    return `| ${p.id} | ${p.get("title")} | ${planGoal(p, items2) || "\u2014"} | ${p.get("status")}${src}` + (waits.length ? ` (waits for ${waits.join(", ")})` : "") + ` | ${t.length ? `${t.filter(([d]) => d).length}/${t.length}` : "\u2013"} | ${claims.get(p.id)?.actor ?? "\u2014"} |`;
  })];
}
function blocked(plans2) {
  const out = byStatus(plans2, ["blocked"]).map((p) => {
    const logs = p.section("Progress log").split("\n").filter((l) => l.trim().startsWith("- "));
    return `- ${p.id}: ${p.get("title")} \u2014 ${logs.length ? logs[logs.length - 1].trim().slice(2) : "see plan"}`;
  });
  return out.length ? out : ["_None._"];
}
function backlogTop(ranked2, plans2) {
  const top = ranked2.filter((i) => itemStatus(i, plans2) === "triaged").slice(0, TOP);
  if (!top.length) return ["_Nothing triaged and unplanned._"];
  return [
    "| # | Item | Title | Pri | Goal |",
    "|---|---|---|---|---|",
    ...top.map((i, n2) => `| ${n2 + 1} | ${i.id} | ${i.get("title")} | ${i.get("priority") || "\u2014"} | ${i.get("goal") || "\u2014"} |`)
  ];
}
function openBugs(items2, plans2) {
  const bugs = [...items2.values()].filter((i) => i.id.startsWith("BUG-") && !["done", ...ITEM_CLOSED].includes(itemStatus(i, plans2))).sort(byKey((i) => [i.get("severity") || "S9", i.get("priority") || "P9", i.id]));
  if (!bugs.length) return ["_None._"];
  return [
    "| Bug | Sev | Pri | Title | Status |",
    "|---|---|---|---|---|",
    ...bugs.map((b) => `| ${b.id} | ${b.get("severity") || "\u2014"} | ${b.get("priority") || "\u2014"} | ${b.get("title")} | ` + itemStatus(b, plans2) + (b.get("plan") ? ` (${b.get("plan")})` : "") + " |")
  ];
}
function recentlyDone(plans2) {
  const done = byStatus(plans2, ["done"]).sort((a, b) => byKey((p) => [p.get("completed") ?? "", p.id])(b, a)).slice(0, TOP);
  return done.length ? done.map((p) => `- ${p.get("completed") || "?"} \u2014 ${p.id}: ${p.get("title")}` + (p.get("pr") ? ` \u2014 ${p.get("pr")}` : "")) : ["_None._"];
}

// src/hub/commands/views/reports.reg.ts
var registration27 = {
  cli: {
    status: { pos: [], flag: ["write"], run: (s2, a) => status(s2, !!a.opt.write) }
  },
  tools: {
    status: {
      description: "Status report for the project (`crew.mjs status`); write=true also saves it to .crew/status.md.",
      input: obj({ write: { type: "boolean" } }),
      run: (st, a) => status(st, a.write === true)
    }
  }
};

// src/hub/commands/views/graph.reg.ts
var registration28 = {
  tools: {
    graph: {
      description: "Every tracked document (idea, goals, items, plans) with status, gates, relations and the focus, as JSON (`crew.mjs export --json`).",
      input: obj(),
      run: (st) => {
        st.require();
        st.say(JSON.stringify(buildGraph(st)));
      }
    }
  }
};

// src/hub/commands/index.ts
var REGISTRATIONS = [
  ["work/planning.reg.ts", registration],
  ["work/migrate.reg.ts", registration2],
  ["work/backlog.reg.ts", registration3],
  ["work/workflow.reg.ts", registration4],
  ["team/policy.reg.ts", registration5],
  ["team/activity.reg.ts", registration6],
  ["team/autonomy.reg.ts", registration7],
  ["memory/ledger.reg.ts", registration8],
  ["memory/knowledge.reg.ts", registration9],
  ["work/execution.reg.ts", registration10],
  ["work/review.reg.ts", registration11],
  ["work/release.reg.ts", registration12],
  ["work/suite.reg.ts", registration13],
  ["memory/context.reg.ts", registration14],
  ["views/advisor.reg.ts", registration15],
  ["team/guard.reg.ts", registration16],
  ["team/team.reg.ts", registration17],
  ["team/dispatch.reg.ts", registration18],
  ["team/liveness.reg.ts", registration19],
  ["team/agents.reg.ts", registration20],
  ["team/questions.reg.ts", registration21],
  ["views/export.reg.ts", registration22],
  ["views/ui.reg.ts", registration23],
  ["views/design.reg.ts", registration24],
  ["views/checks.reg.ts", registration25],
  ["views/doctor.reg.ts", registration26],
  ["views/reports.reg.ts", registration27],
  ["views/graph.reg.ts", registration28]
];
var REGISTRY = load(REGISTRATIONS);

// src/hub/cli.ts
var HEADER = `crew hub: the team's shared context \u2014 the idea, goals, backlog items, plans and tasks.

Nothing is created as an empty skeleton: write the content first (sections as in the templates)
to a draft file, then create the tracked document from it with --from.

Commands:
`;
var AS_LINE = "  --as ROLE \xB7 --run-id ID                       who is acting, on any command (wins over CREW_ROLE / CREW_RUN)\n";
var COMMANDS = REGISTRY.cli;
var help = () => `${HEADER}${REGISTRY.usage.map((l) => `${l}
`).join("")}${AS_LINE}`;
var USAGE = help();
var UsageError = class extends Error {
};
function parse8(argv) {
  const [cmd, ...rest] = argv;
  const spec = COMMANDS[cmd];
  if (!spec) throw new UsageError(cmd ? `unknown command '${cmd}'` : "a command is required");
  const options = {};
  for (const o of [...spec.str ?? [], ...spec.int ?? []]) options[o] = { type: "string" };
  for (const o of spec.flag ?? []) options[o] = { type: "boolean" };
  let parsed;
  try {
    parsed = parseArgs({ args: rest, options, allowPositionals: true, strict: true });
  } catch (e) {
    throw new UsageError(e.message);
  }
  const pos = parsed.positionals;
  if (pos.length < spec.pos.length) throw new UsageError(`missing ${spec.pos.slice(pos.length).join(", ")}`);
  if (pos.length > spec.pos.length && !spec.rest) throw new UsageError(`unexpected argument '${pos[spec.pos.length]}'`);
  const opt = parsed.values;
  for (const r of spec.required ?? []) if (opt[r] === void 0) throw new UsageError(`--${r} is required`);
  const num2 = {};
  for (const o of spec.int ?? []) {
    const v = opt[o];
    if (typeof v !== "string") continue;
    if (!/^[+-]?\d+$/.test(v.trim())) throw new UsageError(`--${o}: invalid int value '${v}'`);
    num2[o] = parseInt(v, 10);
  }
  for (const [name, allowed] of Object.entries(spec.choices ?? {})) {
    const i = spec.pos.indexOf(name);
    const v = i >= 0 ? pos[i] : opt[name];
    if (typeof v === "string" && !allowed.includes(v)) {
      throw new UsageError(`${i >= 0 ? name : `--${name}`}: invalid choice '${v}' (choose from ${allowed.join(", ")})`);
    }
  }
  return { cmd, spec, args: { pos, opt, num: num2 } };
}
function identity(argv) {
  const rest = [];
  for (let i = 0; i < argv.length; i++) {
    const m = /^--(as|run-id)(?:=(.*))?$/.exec(argv[i]);
    if (!m) {
      rest.push(argv[i]);
      continue;
    }
    const value = m[2] ?? argv[++i];
    if (value) process.env[m[1] === "as" ? "CREW_ROLE" : "CREW_RUN"] = value;
  }
  return rest;
}
function main(argv, open = () => Store.open()) {
  argv = identity(argv);
  if (!argv.length || argv[0] === "--help" || argv[0] === "-h" || argv[0] === "help") {
    process.stdout.write(help());
    return argv.length ? 0 : 2;
  }
  let parsed;
  try {
    parsed = parse8(argv);
  } catch (e) {
    process.stderr.write(`usage: crew.mjs <command> \u2026  (crew.mjs --help)
crew.mjs: error: ${e.message}
`);
    return 2;
  }
  const store = open();
  store.label = [parsed.cmd, ...argv.filter((a) => /^(IDEA|G|P|FEAT|BUG|CHORE|SPIKE|Q|K)-[\w-]+$/i.test(a))].join(" ");
  let code = 0;
  try {
    code = parsed.spec.run(store, parsed.args) ?? 0;
    store.ws.flush();
  } catch (e) {
    store.ws.abort();
    if (!(e instanceof HubError)) throw e;
    print(store.ws.output);
    process.stderr.write(`${e.message}
`);
    return 1;
  }
  print(store.ws.output);
  return code;
}
function print(lines) {
  if (lines.length) process.stdout.write(`${lines.join("\n")}
`);
}

// src/hub/main.ts
var major = parseInt(process.versions.node.split(".")[0], 10);
if (major < 20) {
  process.stderr.write(`crew hub needs Node.js \u2265 20 (found ${process.versions.node}).
`);
  process.exit(1);
}
process.exitCode = main(process.argv.slice(2));
