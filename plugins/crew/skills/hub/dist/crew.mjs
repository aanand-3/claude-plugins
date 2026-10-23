#!/usr/bin/env node
// Generated from packages/hub by `npm run build`. Do not edit.
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
    var identity = require_identity();
    var BREAK = /* @__PURE__ */ Symbol("break visit");
    var SKIP = /* @__PURE__ */ Symbol("skip children");
    var REMOVE = /* @__PURE__ */ Symbol("remove node");
    function visit(node, visitor) {
      const visitor_ = initVisitor(visitor);
      if (identity.isDocument(node)) {
        const cd = visit_(null, node.contents, visitor_, Object.freeze([node]));
        if (cd === REMOVE)
          node.contents = null;
      } else
        visit_(null, node, visitor_, Object.freeze([]));
    }
    visit.BREAK = BREAK;
    visit.SKIP = SKIP;
    visit.REMOVE = REMOVE;
    function visit_(key, node, visitor, path) {
      const ctrl = callVisitor(key, node, visitor, path);
      if (identity.isNode(ctrl) || identity.isPair(ctrl)) {
        replaceNode(key, path, ctrl);
        return visit_(key, ctrl, visitor, path);
      }
      if (typeof ctrl !== "symbol") {
        if (identity.isCollection(node)) {
          path = Object.freeze(path.concat(node));
          for (let i = 0; i < node.items.length; ++i) {
            const ci = visit_(i, node.items[i], visitor, path);
            if (typeof ci === "number")
              i = ci - 1;
            else if (ci === BREAK)
              return BREAK;
            else if (ci === REMOVE) {
              node.items.splice(i, 1);
              i -= 1;
            }
          }
        } else if (identity.isPair(node)) {
          path = Object.freeze(path.concat(node));
          const ck = visit_("key", node.key, visitor, path);
          if (ck === BREAK)
            return BREAK;
          else if (ck === REMOVE)
            node.key = null;
          const cv = visit_("value", node.value, visitor, path);
          if (cv === BREAK)
            return BREAK;
          else if (cv === REMOVE)
            node.value = null;
        }
      }
      return ctrl;
    }
    async function visitAsync(node, visitor) {
      const visitor_ = initVisitor(visitor);
      if (identity.isDocument(node)) {
        const cd = await visitAsync_(null, node.contents, visitor_, Object.freeze([node]));
        if (cd === REMOVE)
          node.contents = null;
      } else
        await visitAsync_(null, node, visitor_, Object.freeze([]));
    }
    visitAsync.BREAK = BREAK;
    visitAsync.SKIP = SKIP;
    visitAsync.REMOVE = REMOVE;
    async function visitAsync_(key, node, visitor, path) {
      const ctrl = await callVisitor(key, node, visitor, path);
      if (identity.isNode(ctrl) || identity.isPair(ctrl)) {
        replaceNode(key, path, ctrl);
        return visitAsync_(key, ctrl, visitor, path);
      }
      if (typeof ctrl !== "symbol") {
        if (identity.isCollection(node)) {
          path = Object.freeze(path.concat(node));
          for (let i = 0; i < node.items.length; ++i) {
            const ci = await visitAsync_(i, node.items[i], visitor, path);
            if (typeof ci === "number")
              i = ci - 1;
            else if (ci === BREAK)
              return BREAK;
            else if (ci === REMOVE) {
              node.items.splice(i, 1);
              i -= 1;
            }
          }
        } else if (identity.isPair(node)) {
          path = Object.freeze(path.concat(node));
          const ck = await visitAsync_("key", node.key, visitor, path);
          if (ck === BREAK)
            return BREAK;
          else if (ck === REMOVE)
            node.key = null;
          const cv = await visitAsync_("value", node.value, visitor, path);
          if (cv === BREAK)
            return BREAK;
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
      if (identity.isMap(node))
        return visitor.Map?.(key, node, path);
      if (identity.isSeq(node))
        return visitor.Seq?.(key, node, path);
      if (identity.isPair(node))
        return visitor.Pair?.(key, node, path);
      if (identity.isScalar(node))
        return visitor.Scalar?.(key, node, path);
      if (identity.isAlias(node))
        return visitor.Alias?.(key, node, path);
      return void 0;
    }
    function replaceNode(key, path, node) {
      const parent = path[path.length - 1];
      if (identity.isCollection(parent)) {
        parent.items[key] = node;
      } else if (identity.isPair(parent)) {
        if (key === "key")
          parent.key = node;
        else
          parent.value = node;
      } else if (identity.isDocument(parent)) {
        parent.contents = node;
      } else {
        const pt = identity.isAlias(parent) ? "alias" : "scalar";
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
    var identity = require_identity();
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
      add(line, onError) {
        if (this.atNextDocument) {
          this.yaml = { explicit: _Directives.defaultYaml.explicit, version: "1.1" };
          this.tags = Object.assign({}, _Directives.defaultTags);
          this.atNextDocument = false;
        }
        const parts = line.trim().split(/[ \t]+/);
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
        if (doc && tagEntries.length > 0 && identity.isNode(doc.contents)) {
          const tags = {};
          visit.visit(doc.contents, (_key, node) => {
            if (identity.isNode(node) && node.tag)
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
    var identity = require_identity();
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
            if (typeof ref === "object" && ref.anchor && (identity.isScalar(ref.node) || identity.isCollection(ref.node))) {
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
    function applyReviver(reviver, obj, key, val) {
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
      return reviver.call(obj, key, val);
    }
    exports.applyReviver = applyReviver;
  }
});

// node_modules/yaml/dist/nodes/toJS.js
var require_toJS = __commonJS({
  "node_modules/yaml/dist/nodes/toJS.js"(exports) {
    "use strict";
    var identity = require_identity();
    function toJS(value, arg, ctx) {
      if (Array.isArray(value))
        return value.map((v, i) => toJS(v, String(i), ctx));
      if (value && typeof value.toJSON === "function") {
        if (!ctx || !identity.hasAnchor(value))
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
    var identity = require_identity();
    var toJS = require_toJS();
    var NodeBase = class {
      constructor(type) {
        Object.defineProperty(this, identity.NODE_TYPE, { value: type });
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
        if (!identity.isDocument(doc))
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
    var identity = require_identity();
    var Node = require_Node();
    var toJS = require_toJS();
    var Alias = class extends Node.NodeBase {
      constructor(source) {
        super(identity.ALIAS);
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
              if (identity.isAlias(node) || identity.hasAnchor(node))
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
      if (identity.isAlias(node)) {
        const source = node.resolve(doc);
        const anchor = anchors2 && source && anchors2.get(source);
        return anchor ? anchor.count * anchor.aliasCount : 0;
      } else if (identity.isCollection(node)) {
        let count = 0;
        for (const item of node.items) {
          const c = getAliasCount(doc, item, anchors2);
          if (c > count)
            count = c;
        }
        return count;
      } else if (identity.isPair(node)) {
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
    var identity = require_identity();
    var Node = require_Node();
    var toJS = require_toJS();
    var isScalarValue = (value) => !value || typeof value !== "function" && typeof value !== "object";
    var Scalar = class extends Node.NodeBase {
      constructor(value) {
        super(identity.SCALAR);
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
    var identity = require_identity();
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
      if (identity.isDocument(value))
        value = value.contents;
      if (identity.isNode(value))
        return value;
      if (identity.isPair(value)) {
        const map = ctx.schema[identity.MAP].createNode?.(ctx.schema, null, ctx);
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
        tagObj = value instanceof Map ? schema[identity.MAP] : Symbol.iterator in Object(value) ? schema[identity.SEQ] : schema[identity.MAP];
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
    var identity = require_identity();
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
        copy.items = copy.items.map((it) => identity.isNode(it) || identity.isPair(it) ? it.clone(schema) : it);
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
          if (identity.isCollection(node))
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
        if (identity.isCollection(node))
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
          return !keepScalar && identity.isScalar(node) ? node.value : node;
        else
          return identity.isCollection(node) ? node.getIn(rest, keepScalar) : void 0;
      }
      hasAllNullValues(allowScalar) {
        return this.items.every((node) => {
          if (!identity.isPair(node))
            return false;
          const n = node.value;
          return n == null || allowScalar && identity.isScalar(n) && n.value == null && !n.commentBefore && !n.comment && !n.tag;
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
        return identity.isCollection(node) ? node.hasIn(rest) : false;
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
          if (identity.isCollection(node))
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
    function foldFlowLines(text, indent, mode = "flow", { indentAtStart, lineWidth = 80, minContentWidth = 20, onFold, onOverflow } = {}) {
      if (!lineWidth || lineWidth < 0)
        return text;
      if (lineWidth < minContentWidth)
        minContentWidth = 0;
      const endStep = Math.max(1 + minContentWidth, 1 + lineWidth - indent.length);
      if (text.length <= endStep)
        return text;
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
        i = consumeMoreIndentedLines(text, i, indent.length);
        if (i !== -1)
          end = i + endStep;
      }
      for (let ch; ch = text[i += 1]; ) {
        if (mode === FOLD_QUOTED && ch === "\\") {
          escStart = i;
          switch (text[i + 1]) {
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
            i = consumeMoreIndentedLines(text, i, indent.length);
          end = i + indent.length + endStep;
          split = void 0;
        } else {
          if (ch === " " && prev && prev !== " " && prev !== "\n" && prev !== "	") {
            const next = text[i + 1];
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
                ch = text[i += 1];
                overflow = true;
              }
              const j = i > escEnd + 1 ? i - 2 : escStart - 1;
              if (escapedFolds[j])
                return text;
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
        return text;
      if (onFold)
        onFold();
      let res = text.slice(0, folds[0]);
      for (let i2 = 0; i2 < folds.length; ++i2) {
        const fold = folds[i2];
        const end2 = folds[i2 + 1] || text.length;
        if (fold === 0)
          res = `
${indent}${text.slice(0, end2)}`;
        else {
          if (mode === FOLD_QUOTED && escapedFolds[fold])
            res += `${text[fold]}\\`;
          res += `
${indent}${text.slice(fold + 1, end2)}`;
        }
      }
      return res;
    }
    function consumeMoreIndentedLines(text, i, indent) {
      let end = i;
      let start2 = i + 1;
      let ch = text[start2];
      while (ch === " " || ch === "	") {
        if (i < start2 + indent) {
          ch = text[++i];
        } else {
          do {
            ch = text[++i];
          } while (ch && ch !== "\n");
          end = i;
          start2 = i + 1;
          ch = text[start2];
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
    var identity = require_identity();
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
      let obj;
      if (identity.isScalar(item)) {
        obj = item.value;
        let match = tags.filter((t) => t.identify?.(obj));
        if (match.length > 1) {
          const testMatch = match.filter((t) => t.test);
          if (testMatch.length > 0)
            match = testMatch;
        }
        tagObj = match.find((t) => t.format === item.format) ?? match.find((t) => !t.format);
      } else {
        obj = item;
        tagObj = tags.find((t) => t.nodeClass && obj instanceof t.nodeClass);
      }
      if (!tagObj) {
        const name = obj?.constructor?.name ?? (obj === null ? "null" : typeof obj);
        throw new Error(`Tag not resolved for ${name} value`);
      }
      return tagObj;
    }
    function stringifyProps(node, tagObj, { anchors: anchors$1, doc }) {
      if (!doc.directives)
        return "";
      const props = [];
      const anchor = (identity.isScalar(node) || identity.isCollection(node)) && node.anchor;
      if (anchor && anchors.anchorIsValid(anchor)) {
        anchors$1.add(anchor);
        props.push(`&${anchor}`);
      }
      const tag = node.tag ?? (tagObj.default ? null : tagObj.tag);
      if (tag)
        props.push(doc.directives.tagString(tag));
      return props.join(" ");
    }
    function stringify(item, ctx, onComment, onChompKeep) {
      if (identity.isPair(item))
        return item.toString(ctx, onComment, onChompKeep);
      if (identity.isAlias(item)) {
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
      const node = identity.isNode(item) ? item : ctx.doc.createNode(item, { onTagObj: (o) => tagObj = o });
      tagObj ?? (tagObj = getTagObject(ctx.doc.schema.tags, node));
      const props = stringifyProps(node, tagObj, ctx);
      if (props.length > 0)
        ctx.indentAtStart = (ctx.indentAtStart ?? 0) + props.length + 1;
      const str3 = typeof tagObj.stringify === "function" ? tagObj.stringify(node, ctx, onComment, onChompKeep) : identity.isScalar(node) ? stringifyString.stringifyString(node, ctx, onComment, onChompKeep) : node.toString(ctx, onComment, onChompKeep);
      if (!props)
        return str3;
      return identity.isScalar(node) || str3[0] === "{" || str3[0] === "[" ? `${props} ${str3}` : `${props}
${ctx.indent}${str3}`;
    }
    exports.createStringifyContext = createStringifyContext;
    exports.stringify = stringify;
  }
});

// node_modules/yaml/dist/stringify/stringifyPair.js
var require_stringifyPair = __commonJS({
  "node_modules/yaml/dist/stringify/stringifyPair.js"(exports) {
    "use strict";
    var identity = require_identity();
    var Scalar = require_Scalar();
    var stringify = require_stringify();
    var stringifyComment = require_stringifyComment();
    function stringifyPair({ key, value }, ctx, onComment, onChompKeep) {
      const { allNullValues, doc, indent, indentStep, options: { commentString, indentSeq, simpleKeys } } = ctx;
      let keyComment = identity.isNode(key) && key.comment || null;
      if (simpleKeys) {
        if (keyComment) {
          throw new Error("With simple keys, key nodes cannot have comments");
        }
        if (identity.isCollection(key) || !identity.isNode(key) && typeof key === "object") {
          const msg = "With simple keys, collection cannot be used as a key value";
          throw new Error(msg);
        }
      }
      let explicitKey = !simpleKeys && (!key || keyComment && value == null && !ctx.inFlow || identity.isCollection(key) || (identity.isScalar(key) ? key.type === Scalar.Scalar.BLOCK_FOLDED || key.type === Scalar.Scalar.BLOCK_LITERAL : typeof key === "object"));
      ctx = Object.assign({}, ctx, {
        allNullValues: false,
        implicitKey: !explicitKey && (simpleKeys || !allNullValues),
        indent: indent + indentStep
      });
      let keyCommentDone = false;
      let chompKeep = false;
      let str3 = stringify.stringify(key, ctx, () => keyCommentDone = true, () => chompKeep = true);
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
      if (identity.isNode(value)) {
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
      if (!explicitKey && !keyComment && identity.isScalar(value))
        ctx.indentAtStart = str3.length + 1;
      chompKeep = false;
      if (!indentSeq && indentStep.length >= 2 && !ctx.inFlow && !explicitKey && identity.isSeq(value) && !value.flow && !value.tag && !value.anchor) {
        ctx.indent = ctx.indent.substring(2);
      }
      let valueCommentDone = false;
      const valueStr = stringify.stringify(value, ctx, () => valueCommentDone = true, () => chompKeep = true);
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
      } else if (!explicitKey && identity.isCollection(value)) {
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
    function warn(logLevel, warning) {
      if (logLevel === "debug" || logLevel === "warn") {
        if (typeof node_process.emitWarning === "function")
          node_process.emitWarning(warning);
        else
          console.warn(warning);
      }
    }
    exports.debug = debug;
    exports.warn = warn;
  }
});

// node_modules/yaml/dist/schema/yaml-1.1/merge.js
var require_merge = __commonJS({
  "node_modules/yaml/dist/schema/yaml-1.1/merge.js"(exports) {
    "use strict";
    var identity = require_identity();
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
    var isMergeKey = (ctx, key) => (merge.identify(key) || identity.isScalar(key) && (!key.type || key.type === Scalar.Scalar.PLAIN) && merge.identify(key.value)) && ctx?.doc.schema.tags.some((tag) => tag.tag === merge.tag && tag.default);
    function addMergeToJSMap(ctx, map, value) {
      const source = resolveAliasValue(ctx, value);
      if (identity.isSeq(source))
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
      if (!identity.isMap(source))
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
      return ctx && identity.isAlias(value) ? value.resolve(ctx.doc, ctx) : value;
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
    var stringify = require_stringify();
    var identity = require_identity();
    var toJS = require_toJS();
    function addPairToJSMap(ctx, map, { key, value }) {
      if (identity.isNode(key) && key.addToJSMap)
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
      if (identity.isNode(key) && ctx?.doc) {
        const strCtx = stringify.createStringifyContext(ctx.doc, {});
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
    var identity = require_identity();
    function createPair(key, value, ctx) {
      const k = createNode.createNode(key, void 0, ctx);
      const v = createNode.createNode(value, void 0, ctx);
      return new Pair(k, v);
    }
    var Pair = class _Pair {
      constructor(key, value = null) {
        Object.defineProperty(this, identity.NODE_TYPE, { value: identity.PAIR });
        this.key = key;
        this.value = value;
      }
      clone(schema) {
        let { key, value } = this;
        if (identity.isNode(key))
          key = key.clone(schema);
        if (identity.isNode(value))
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
    var identity = require_identity();
    var stringify = require_stringify();
    var stringifyComment = require_stringifyComment();
    function stringifyCollection(collection, ctx, options) {
      const flow = ctx.inFlow ?? collection.flow;
      const stringify2 = flow ? stringifyFlowCollection : stringifyBlockCollection;
      return stringify2(collection, ctx, options);
    }
    function stringifyBlockCollection({ comment, items: items2 }, ctx, { blockItemPrefix, flowChars, itemIndent, onChompKeep, onComment }) {
      const { indent, options: { commentString } } = ctx;
      const itemCtx = Object.assign({}, ctx, { indent: itemIndent, type: null });
      let chompKeep = false;
      const lines = [];
      for (let i = 0; i < items2.length; ++i) {
        const item = items2[i];
        let comment2 = null;
        if (identity.isNode(item)) {
          if (!chompKeep && item.spaceBefore)
            lines.push("");
          addCommentBefore(ctx, lines, item.commentBefore, chompKeep);
          if (item.comment)
            comment2 = item.comment;
        } else if (identity.isPair(item)) {
          const ik = identity.isNode(item.key) ? item.key : null;
          if (ik) {
            if (!chompKeep && ik.spaceBefore)
              lines.push("");
            addCommentBefore(ctx, lines, ik.commentBefore, chompKeep);
          }
        }
        chompKeep = false;
        let str4 = stringify.stringify(item, itemCtx, () => comment2 = null, () => chompKeep = true);
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
          const line = lines[i];
          str3 += line ? `
${indent}${line}` : "\n";
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
        if (identity.isNode(item)) {
          if (item.spaceBefore)
            lines.push("");
          addCommentBefore(ctx, lines, item.commentBefore, false);
          if (item.comment)
            comment = item.comment;
        } else if (identity.isPair(item)) {
          const ik = identity.isNode(item.key) ? item.key : null;
          if (ik) {
            if (ik.spaceBefore)
              lines.push("");
            addCommentBefore(ctx, lines, ik.commentBefore, false);
            if (ik.comment)
              reqNewline = true;
          }
          const iv = identity.isNode(item.value) ? item.value : null;
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
        let str3 = stringify.stringify(item, itemCtx, () => comment = null);
        reqNewline || (reqNewline = lines.length > linesAtValue || str3.includes("\n"));
        if (i < items2.length - 1) {
          str3 += ",";
        } else if (ctx.options.trailingComma) {
          if (ctx.options.lineWidth > 0) {
            reqNewline || (reqNewline = lines.reduce((sum, line) => sum + line.length + 2, 2) + (str3.length + 2) > ctx.options.lineWidth);
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
          const len = lines.reduce((sum, line) => sum + line.length + 2, 2);
          reqNewline = ctx.options.lineWidth > 0 && len > ctx.options.lineWidth;
        }
        if (reqNewline) {
          let str3 = start2;
          for (const line of lines)
            str3 += line ? `
${indentStep}${indent}${line}` : "\n";
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
    var identity = require_identity();
    var Pair = require_Pair();
    var Scalar = require_Scalar();
    function findPair(items2, key) {
      const k = identity.isScalar(key) ? key.value : key;
      for (const it of items2) {
        if (identity.isPair(it)) {
          if (it.key === key || it.key === k)
            return it;
          if (identity.isScalar(it.key) && it.key.value === k)
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
        super(identity.MAP, schema);
        this.items = [];
      }
      /**
       * A generic collection parsing method that can be extended
       * to other node classes that inherit from YAMLMap
       */
      static from(schema, obj, ctx) {
        const { keepUndefined, replacer } = ctx;
        const map = new this(schema);
        const add = (key, value) => {
          if (typeof replacer === "function")
            value = replacer.call(obj, key, value);
          else if (Array.isArray(replacer) && !replacer.includes(key))
            return;
          if (value !== void 0 || keepUndefined)
            map.items.push(Pair.createPair(key, value, ctx));
        };
        if (obj instanceof Map) {
          for (const [key, value] of obj)
            add(key, value);
        } else if (obj && typeof obj === "object") {
          for (const key of Object.keys(obj))
            add(key, obj[key]);
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
        if (identity.isPair(pair))
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
          if (identity.isScalar(prev.value) && Scalar.isScalarValue(_pair.value))
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
        return (!keepScalar && identity.isScalar(node) ? node.value : node) ?? void 0;
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
          if (!identity.isPair(item))
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
    var identity = require_identity();
    var YAMLMap = require_YAMLMap();
    var map = {
      collection: "map",
      default: true,
      nodeClass: YAMLMap.YAMLMap,
      tag: "tag:yaml.org,2002:map",
      resolve(map2, onError) {
        if (!identity.isMap(map2))
          onError("Expected a mapping for this tag");
        return map2;
      },
      createNode: (schema, obj, ctx) => YAMLMap.YAMLMap.from(schema, obj, ctx)
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
    var identity = require_identity();
    var Scalar = require_Scalar();
    var toJS = require_toJS();
    var YAMLSeq = class extends Collection.Collection {
      static get tagName() {
        return "tag:yaml.org,2002:seq";
      }
      constructor(schema) {
        super(identity.SEQ, schema);
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
        return !keepScalar && identity.isScalar(it) ? it.value : it;
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
        if (identity.isScalar(prev) && Scalar.isScalarValue(value))
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
      static from(schema, obj, ctx) {
        const { replacer } = ctx;
        const seq = new this(schema);
        if (obj && Symbol.iterator in Object(obj)) {
          let i = 0;
          for (let it of obj) {
            if (typeof replacer === "function") {
              const key = obj instanceof Set ? it : String(i++);
              it = replacer.call(obj, key, it);
            }
            seq.items.push(createNode.createNode(it, void 0, ctx));
          }
        }
        return seq;
      }
    };
    function asItemIndex(key) {
      let idx = identity.isScalar(key) ? key.value : key;
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
    var identity = require_identity();
    var YAMLSeq = require_YAMLSeq();
    var seq = {
      collection: "seq",
      default: true,
      nodeClass: YAMLSeq.YAMLSeq,
      tag: "tag:yaml.org,2002:seq",
      resolve(seq2, onError) {
        if (!identity.isSeq(seq2))
          onError("Expected a sequence for this tag");
        return seq2;
      },
      createNode: (schema, obj, ctx) => YAMLSeq.YAMLSeq.from(schema, obj, ctx)
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
      const num = typeof value === "number" ? value : Number(value);
      if (!isFinite(num))
        return isNaN(num) ? ".nan" : num < 0 ? "-.inf" : ".inf";
      let n = Object.is(value, -0) ? "-0" : JSON.stringify(value);
      if (!format && minFractionDigits && (!tag || tag === "tag:yaml.org,2002:float") && /^-?\d/.test(n) && !n.includes("e")) {
        let i = n.indexOf(".");
        if (i < 0) {
          i = n.length;
          n += ".";
        }
        let d = minFractionDigits - (n.length - i - 1);
        while (d-- > 0)
          n += "0";
      }
      return n;
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
        const num = Number(node.value);
        return isFinite(num) ? num.toExponential() : stringifyNumber.stringifyNumber(node);
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
          let s = "";
          for (let i = 0; i < buf.length; ++i)
            s += String.fromCharCode(buf[i]);
          str3 = btoa(s);
        } else {
          throw new Error("This environment does not support writing binary tags; either Buffer or btoa is required");
        }
        type ?? (type = Scalar.Scalar.BLOCK_LITERAL);
        if (type !== Scalar.Scalar.QUOTE_DOUBLE) {
          const lineWidth = Math.max(ctx.options.lineWidth - ctx.indent.length, ctx.options.minContentWidth);
          const n = Math.ceil(str3.length / lineWidth);
          const lines = new Array(n);
          for (let i = 0, o = 0; i < n; ++i, o += lineWidth) {
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
    var identity = require_identity();
    var Pair = require_Pair();
    var Scalar = require_Scalar();
    var YAMLSeq = require_YAMLSeq();
    function resolvePairs(seq, onError) {
      if (identity.isSeq(seq)) {
        for (let i = 0; i < seq.items.length; ++i) {
          let item = seq.items[i];
          if (identity.isPair(item))
            continue;
          else if (identity.isMap(item)) {
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
          seq.items[i] = identity.isPair(item) ? item : new Pair.Pair(item);
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
    var identity = require_identity();
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
          if (identity.isPair(pair)) {
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
          if (identity.isScalar(key)) {
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
        const num = Number(node.value);
        return isFinite(num) ? num.toExponential() : stringifyNumber.stringifyNumber(node);
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
        const n2 = BigInt(str3);
        return sign === "-" ? BigInt(-1) * n2 : n2;
      }
      const n = parseInt(str3, radix);
      return sign === "-" ? -1 * n : n;
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
    var identity = require_identity();
    var Pair = require_Pair();
    var YAMLMap = require_YAMLMap();
    var YAMLSet = class _YAMLSet extends YAMLMap.YAMLMap {
      constructor(schema) {
        super(schema);
        this.tag = _YAMLSet.tag;
      }
      add(key) {
        let pair;
        if (identity.isPair(key))
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
        return !keepPair && identity.isPair(pair) ? identity.isScalar(pair.key) ? pair.key.value : pair.key : pair;
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
        if (identity.isMap(map)) {
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
      const num = (n) => asBigInt ? BigInt(n) : Number(n);
      const res = parts.replace(/_/g, "").split(":").reduce((res2, p) => res2 * num(60) + num(p), num(0));
      return sign === "-" ? num(-1) * res : res;
    }
    function stringifySexagesimal(node) {
      let { value } = node;
      let num = (n) => n;
      if (typeof value === "bigint")
        num = (n) => BigInt(n);
      else if (isNaN(value) || !isFinite(value))
        return stringifyNumber.stringifyNumber(node);
      let sign = "";
      if (value < 0) {
        sign = "-";
        value *= num(-1);
      }
      const _60 = num(60);
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
      return sign + parts.map((n) => String(n).padStart(2, "0")).join(":").replace(/000000\d*$/, "");
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
    var identity = require_identity();
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
        Object.defineProperty(this, identity.MAP, { value: map.map });
        Object.defineProperty(this, identity.SCALAR, { value: string.string });
        Object.defineProperty(this, identity.SEQ, { value: seq.seq });
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
    var identity = require_identity();
    var stringify = require_stringify();
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
      const ctx = stringify.createStringifyContext(doc, options);
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
        if (identity.isNode(doc.contents)) {
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
        let body2 = stringify.stringify(doc.contents, ctx, () => contentComment = null, onChompKeep);
        if (contentComment)
          body2 += stringifyComment.lineComment(body2, "", commentString(contentComment));
        if ((body2[0] === "|" || body2[0] === ">") && lines[lines.length - 1] === "---") {
          lines[lines.length - 1] = `--- ${body2}`;
        } else
          lines.push(body2);
      } else {
        lines.push(stringify.stringify(doc.contents, ctx));
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
    var identity = require_identity();
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
        Object.defineProperty(this, identity.NODE_TYPE, { value: identity.DOC });
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
          [identity.NODE_TYPE]: { value: identity.DOC }
        });
        copy.commentBefore = this.commentBefore;
        copy.comment = this.comment;
        copy.errors = this.errors.slice();
        copy.warnings = this.warnings.slice();
        copy.options = Object.assign({}, this.options);
        if (this.directives)
          copy.directives = this.directives.clone();
        copy.schema = this.schema.clone();
        copy.contents = identity.isNode(this.contents) ? this.contents.clone(copy.schema) : this.contents;
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
        if (flow && identity.isCollection(node))
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
        return identity.isCollection(this.contents) ? this.contents.get(key, keepScalar) : void 0;
      }
      /**
       * Returns item at `path`, or `undefined` if not found. By default unwraps
       * scalar values from their surrounding node; to disable set `keepScalar` to
       * `true` (collections are always returned intact).
       */
      getIn(path, keepScalar) {
        if (Collection.isEmptyPath(path))
          return !keepScalar && identity.isScalar(this.contents) ? this.contents.value : this.contents;
        return identity.isCollection(this.contents) ? this.contents.getIn(path, keepScalar) : void 0;
      }
      /**
       * Checks if the document includes a value with the key `key`.
       */
      has(key) {
        return identity.isCollection(this.contents) ? this.contents.has(key) : false;
      }
      /**
       * Checks if the document includes a value at `path`.
       */
      hasIn(path) {
        if (Collection.isEmptyPath(path))
          return this.contents !== void 0;
        return identity.isCollection(this.contents) ? this.contents.hasIn(path) : false;
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
          const s = JSON.stringify(options.indent);
          throw new Error(`"indent" option must be a positive integer, not ${s}`);
        }
        return stringifyDocument.stringifyDocument(this, options);
      }
    };
    function assertCollection(contents) {
      if (identity.isCollection(contents))
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
      const { line, col } = error.linePos[0];
      error.message += ` at line ${line}, column ${col}`;
      let ci = col - 1;
      let lineStr = src.substring(lc.lineStarts[line - 1], lc.lineStarts[line]).replace(/[\n\r]+$/, "");
      if (ci >= 60 && lineStr.length > 80) {
        const trimStart = Math.min(ci - 39, lineStr.length - 79);
        lineStr = "\u2026" + lineStr.substring(trimStart);
        ci -= trimStart - 1;
      }
      if (lineStr.length > 80)
        lineStr = lineStr.substring(0, 79) + "\u2026";
      if (line > 1 && /^ *$/.test(lineStr.substring(0, ci))) {
        let prev = src.substring(lc.lineStarts[line - 2], lc.lineStarts[line - 1]);
        if (prev.length > 80)
          prev = prev.substring(0, 79) + "\u2026\n";
        lineStr = prev + lineStr;
      }
      if (/[^ ]/.test(lineStr)) {
        let count = 1;
        const end = error.linePos[1];
        if (end?.line === line && end.col > col) {
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
    var identity = require_identity();
    function mapIncludes(ctx, items2, search) {
      const { uniqueKeys } = ctx.options;
      if (uniqueKeys === false)
        return false;
      const isEqual = typeof uniqueKeys === "function" ? uniqueKeys : (a, b) => a === b || identity.isScalar(a) && identity.isScalar(b) && a.value === b.value;
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
    var identity = require_identity();
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
              if (identity.isPair(prev))
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
    var identity = require_identity();
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
      const node = identity.isNode(res) ? res : new Scalar.Scalar(res);
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
    function resolveBlockScalar(ctx, scalar, onError) {
      const start2 = scalar.offset;
      const header = parseBlockScalarHeader(scalar, ctx.options.strict, onError);
      if (!header)
        return { value: "", type: null, comment: "", range: [start2, start2, start2] };
      const type = header.mode === ">" ? Scalar.Scalar.BLOCK_FOLDED : Scalar.Scalar.BLOCK_LITERAL;
      const lines = scalar.source ? splitLines(scalar.source) : [];
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
        if (scalar.source)
          end2 += scalar.source.length;
        return { value: value2, type, comment: header.comment, range: [start2, end2, end2] };
      }
      let trimIndent = scalar.indent + header.indent;
      let offset = scalar.offset + header.length;
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
      const end = start2 + header.length + scalar.source.length;
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
          const n = Number(ch);
          if (!indent && n)
            indent = n;
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
    function resolveFlowScalar(scalar, strict, onError) {
      const { offset, type, source, end } = scalar;
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
          onError(scalar, "UNEXPECTED_TOKEN", `Expected a flow scalar value, but found: ${type}`);
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
      let first, line;
      try {
        first = new RegExp("(.*?)(?<![ 	])[ 	]*\r?\n", "sy");
        line = new RegExp("[ 	]*(.*?)(?:(?<![ 	])[ 	]*)?\r?\n", "sy");
      } catch {
        first = /(.*?)[ \t]*\r?\n/sy;
        line = /[ \t]*(.*?)[ \t]*\r?\n/sy;
      }
      let match = first.exec(source);
      if (!match)
        return source;
      let res = match[1];
      let sep2 = " ";
      let pos = first.lastIndex;
      line.lastIndex = pos;
      while (match = line.exec(source)) {
        if (match[1] === "") {
          if (sep2 === "\n")
            res += sep2;
          else
            sep2 = "\n";
        } else {
          res += sep2 + match[1];
          sep2 = " ";
        }
        pos = line.lastIndex;
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
      const ok = cc.length === length && /^[0-9a-fA-F]+$/.test(cc);
      const code = ok ? parseInt(cc, 16) : NaN;
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
    var identity = require_identity();
    var Scalar = require_Scalar();
    var resolveBlockScalar = require_resolve_block_scalar();
    var resolveFlowScalar = require_resolve_flow_scalar();
    function composeScalar(ctx, token, tagToken, onError) {
      const { value, type, comment, range } = token.type === "block-scalar" ? resolveBlockScalar.resolveBlockScalar(ctx, token, onError) : resolveFlowScalar.resolveFlowScalar(token, ctx.options.strict, onError);
      const tagName = tagToken ? ctx.directives.tagName(tagToken.source, (msg) => onError(tagToken, "TAG_RESOLVE_FAILED", msg)) : null;
      let tag;
      if (ctx.options.stringKeys && ctx.atKey) {
        tag = ctx.schema[identity.SCALAR];
      } else if (tagName)
        tag = findScalarTagByName(ctx.schema, value, tagName, tagToken, onError);
      else if (token.type === "scalar")
        tag = findScalarTagByTest(ctx, value, token, onError);
      else
        tag = ctx.schema[identity.SCALAR];
      let scalar;
      try {
        const res = tag.resolve(value, (msg) => onError(tagToken ?? token, "TAG_RESOLVE_FAILED", msg), ctx.options);
        scalar = identity.isScalar(res) ? res : new Scalar.Scalar(res);
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        onError(tagToken ?? token, "TAG_RESOLVE_FAILED", msg);
        scalar = new Scalar.Scalar(value);
      }
      scalar.range = range;
      scalar.source = value;
      if (type)
        scalar.type = type;
      if (tagName)
        scalar.tag = tagName;
      if (tag.format)
        scalar.format = tag.format;
      if (comment)
        scalar.comment = comment;
      return scalar;
    }
    function findScalarTagByName(schema, value, tagName, tagToken, onError) {
      if (tagName === "!")
        return schema[identity.SCALAR];
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
      return schema[identity.SCALAR];
    }
    function findScalarTagByTest({ atKey, directives, schema }, value, token, onError) {
      const tag = schema.tags.find((tag2) => (tag2.default === true || atKey && tag2.default === "key") && tag2.test?.test(value)) || schema[identity.SCALAR];
      if (schema.compat) {
        const compat = schema.compat.find((tag2) => tag2.default && tag2.test?.test(value)) ?? schema[identity.SCALAR];
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
    var identity = require_identity();
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
      if (atKey && ctx.options.stringKeys && (!identity.isScalar(node) || typeof node.value !== "string" || node.tag && node.tag !== "tag:yaml.org,2002:str")) {
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
    var identity = require_identity();
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
          } else if (identity.isCollection(dc) && !dc.flow && dc.items.length > 0) {
            let it = dc.items[0];
            if (identity.isPair(it))
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
    function createScalarToken(value, context) {
      const { implicitKey = false, indent, inFlow = false, offset = -1, type = "PLAIN" } = context;
      const source = stringifyString.stringifyString({ type, value }, {
        implicitKey,
        indent: indent > 0 ? " ".repeat(indent) : "",
        inFlow,
        options: { blockQuote: true, lineWidth: -1 }
      });
      const end = context.end ?? [
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
    function setScalarValue(token, value, context = {}) {
      let { afterKey = false, implicitKey = false, inFlow = false, type } = context;
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
    var stringify = (cst) => "type" in cst ? stringifyToken(cst) : stringifyItem(cst);
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
    exports.stringify = stringify;
  }
});

// node_modules/yaml/dist/parse/cst-visit.js
var require_cst_visit = __commonJS({
  "node_modules/yaml/dist/parse/cst-visit.js"(exports) {
    "use strict";
    var BREAK = /* @__PURE__ */ Symbol("break visit");
    var SKIP = /* @__PURE__ */ Symbol("skip children");
    var REMOVE = /* @__PURE__ */ Symbol("remove item");
    function visit(cst, visitor) {
      if ("type" in cst && cst.type === "document")
        cst = { start: cst.start, value: cst.value };
      _visit(Object.freeze([]), cst, visitor);
    }
    visit.BREAK = BREAK;
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
            else if (ci === BREAK)
              return BREAK;
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
      charAt(n) {
        return this.buffer[this.pos + n];
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
      hasChars(n) {
        return this.pos + n <= this.buffer.length;
      }
      setNext(state) {
        this.buffer = this.buffer.substring(this.pos);
        this.pos = 0;
        this.lineEndPos = null;
        this.next = state;
        return null;
      }
      peek(n) {
        return this.buffer.substr(this.pos, n);
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
        let line = this.getLine();
        if (line === null)
          return this.setNext("stream");
        if (line[0] === cst.BOM) {
          yield* this.pushCount(1);
          line = line.substring(1);
        }
        if (line[0] === "%") {
          let dirEnd = line.length;
          let cs = line.indexOf("#");
          while (cs !== -1) {
            const ch = line[cs - 1];
            if (ch === " " || ch === "	") {
              dirEnd = cs - 1;
              break;
            } else {
              cs = line.indexOf("#", cs + 1);
            }
          }
          while (true) {
            const ch = line[dirEnd - 1];
            if (ch === " " || ch === "	")
              dirEnd -= 1;
            else
              break;
          }
          const n = (yield* this.pushCount(dirEnd)) + (yield* this.pushSpaces(true));
          yield* this.pushCount(line.length - n);
          this.pushNewline();
          return "stream";
        }
        if (this.atLineEnd()) {
          const sp = yield* this.pushSpaces(true);
          yield* this.pushCount(line.length - sp);
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
          const s = this.peek(3);
          if ((s === "---" || s === "...") && isEmpty(this.charAt(3))) {
            yield* this.pushCount(3);
            this.indentValue = 0;
            this.indentNext = 0;
            return s === "---" ? "doc" : "stream";
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
          const n = (yield* this.pushCount(1)) + (yield* this.pushSpaces(true));
          this.indentNext = this.indentValue + 1;
          this.indentValue += n;
          return "block-start";
        }
        return "doc";
      }
      *parseDocument() {
        yield* this.pushSpaces(true);
        const line = this.getLine();
        if (line === null)
          return this.setNext("doc");
        let n = yield* this.pushIndicators();
        switch (line[n]) {
          case "#":
            yield* this.pushCount(line.length - n);
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
            n += yield* this.parseBlockScalarHeader();
            n += yield* this.pushSpaces(true);
            yield* this.pushCount(line.length - n);
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
        const line = this.getLine();
        if (line === null)
          return this.setNext("flow");
        if (indent !== -1 && indent < this.indentNext && line[0] !== "#" || indent === 0 && (line.startsWith("---") || line.startsWith("...")) && isEmpty(line[3])) {
          const atFlowEndMarker = indent === this.indentNext - 1 && this.flowLevel === 1 && (line[0] === "]" || line[0] === "}");
          if (!atFlowEndMarker) {
            this.flowLevel = 0;
            yield cst.FLOW_END;
            return yield* this.parseLineStart();
          }
        }
        let n = 0;
        while (line[n] === ",") {
          n += yield* this.pushCount(1);
          n += yield* this.pushSpaces(true);
          this.flowKey = false;
        }
        n += yield* this.pushIndicators();
        switch (line[n]) {
          case void 0:
            return "flow";
          case "#":
            yield* this.pushCount(line.length - n);
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
            let n = 0;
            while (this.buffer[end - 1 - n] === "\\")
              n += 1;
            if (n % 2 === 0)
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
      *pushCount(n) {
        if (n > 0) {
          yield this.buffer.substr(this.pos, n);
          this.pos += n;
          return n;
        }
        return 0;
      }
      *pushToIndex(i, allowEmpty) {
        const s = this.buffer.slice(this.pos, i);
        if (s) {
          yield s;
          this.pos += s.length;
          return s.length;
        } else if (allowEmpty)
          yield "";
        return 0;
      }
      *pushIndicators() {
        let n = 0;
        loop: while (true) {
          switch (this.charAt(0)) {
            case "!":
              n += yield* this.pushTag();
              n += yield* this.pushSpaces(true);
              continue loop;
            case "&":
              n += yield* this.pushUntil(isNotAnchorChar);
              n += yield* this.pushSpaces(true);
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
                n += yield* this.pushCount(1);
                n += yield* this.pushSpaces(true);
                continue loop;
              }
            }
          }
          break loop;
        }
        return n;
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
        const n = i - this.pos;
        if (n > 0) {
          yield this.buffer.substr(this.pos, n);
          this.pos = i;
        }
        return n;
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
      peek(n) {
        return this.stack[this.stack.length - n];
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
      *scalar(scalar) {
        if (this.type === "map-value-ind") {
          const prev = getPrevProps(this.peek(2));
          const start2 = getFirstKeyStartProps(prev);
          let sep2;
          if (scalar.end) {
            sep2 = scalar.end;
            sep2.push(this.sourceToken);
            delete scalar.end;
          } else
            sep2 = [this.sourceToken];
          const map = {
            type: "block-map",
            offset: scalar.offset,
            indent: scalar.indent,
            items: [{ start: start2, key: scalar, sep: sep2 }]
          };
          this.onKeyLine = true;
          this.stack[this.stack.length - 1] = map;
        } else
          yield* this.lineEnd(scalar);
      }
      *blockScalar(scalar) {
        switch (this.type) {
          case "space":
          case "comment":
          case "newline":
            scalar.props.push(this.sourceToken);
            return;
          case "scalar":
            scalar.source = this.source;
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
    var identity = require_identity();
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
    function parse4(src, reviver, options) {
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
    function stringify(value, replacer, options) {
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
      if (identity.isDocument(value) && !_replacer)
        return value.toString(options);
      return new Document.Document(value, _replacer, options).toString(options);
    }
    exports.parse = parse4;
    exports.parseAllDocuments = parseAllDocuments;
    exports.parseDocument = parseDocument;
    exports.stringify = stringify;
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
    var identity = require_identity();
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
    exports.isAlias = identity.isAlias;
    exports.isCollection = identity.isCollection;
    exports.isDocument = identity.isDocument;
    exports.isMap = identity.isMap;
    exports.isNode = identity.isNode;
    exports.isPair = identity.isPair;
    exports.isScalar = identity.isScalar;
    exports.isSeq = identity.isSeq;
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

// src/cli.ts
import { parseArgs } from "node:util";

// src/core/store.ts
import { existsSync as existsSync4, realpathSync } from "node:fs";
import { dirname as dirname3, join as join4, resolve as resolve3 } from "node:path";
import { fileURLToPath } from "node:url";

// src/core/git.ts
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

// src/core/model.ts
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
var DEFAULT_SETTINGS = { wip_limit: "1", max_tasks: "10" };
var MAX_WRITTEN_AHEAD = 3;
var SLUG_STOPWORDS = /* @__PURE__ */ new Set(["a", "an", "and", "the", "of", "for", "to", "with", "in", "on", "or", "via", "by"]);
var TASK_RE = /^\s*- \[( |x|X)\]\s*(.*)$/;

// src/core/text.ts
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
function pad(n) {
  return String(n).padStart(2, "0");
}
function idList(s) {
  return (s ?? "").split(/[,\s]+/).map((x) => x.trim().toUpperCase()).filter(Boolean);
}
function kindOf(docId) {
  if (docId.toUpperCase() === IDEA_ID) return "idea";
  const m = /^([A-Z]+)-\d+$/.exec(docId.toUpperCase());
  return m && KINDS[m[1]] || null;
}
function norm(name) {
  const n = name.toLowerCase().replace(/[^a-z]/g, "");
  return SECTION_ALIASES[n] ?? n;
}
function slugify(title) {
  const words2 = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").split("-").filter(Boolean);
  const out = [];
  for (const w of words2) {
    if ([...out, w].join("-").length > 40) break;
    out.push(w);
  }
  while (out.length < words2.length && out.length && SLUG_STOPWORDS.has(out[out.length - 1])) out.pop();
  return out.join("-") || "untitled";
}
function stripComments(text) {
  return text.replace(/<!--[\s\S]*?-->/g, "");
}
function mdTable(text) {
  const rows = stripComments(text).split("\n").map((l) => l.trim()).filter((l) => l.startsWith("|"));
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
function rstrip(s) {
  return s.replace(/\s+$/, "");
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

// src/core/git.ts
function git(args, check2 = false) {
  const r = spawnSync("git", args, { encoding: "utf8" });
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
function treeIsClean() {
  return !(git(["status", "--porcelain"]) ?? "").trim();
}
function words(out) {
  return (out ?? "").split(/\s+/).filter(Boolean);
}

// src/core/doc.ts
var EMPTY_LINES = /* @__PURE__ */ new Set(["-", "- [ ]", "1."]);
var END = "(?![\\s\\S])";
function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function sectionRe(name) {
  return new RegExp(`^## ${escapeRe(name)}\\s*\\n([\\s\\S]*?)(?=^## |${END})`, "md");
}
var Doc = class _Doc {
  constructor(path, text, meta = {}, source = "worktree", sink = null) {
    this.path = path;
    this.text = text;
    this.meta = meta;
    this.source = source;
    this.sink = sink;
  }
  path;
  text;
  meta;
  source;
  sink;
  static parse(text, path = null, source = "worktree") {
    const meta = {};
    const m = /^---\n([\s\S]*?)\n---\n/.exec(text);
    if (m) {
      for (const line of m[1].split("\n")) {
        if (line.includes(":") && !line.startsWith(" ")) {
          const i = line.indexOf(":");
          meta[line.slice(0, i).trim()] = line.slice(i + 1).trim() || null;
        }
      }
    }
    return new _Doc(path, text, meta, source);
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
    const line = rstrip(`${key}: ${value ?? ""}`);
    const re = new RegExp(`^${escapeRe(key)}:.*$`, "m");
    head = re.test(head) ? head.replace(re, () => line) : `${head}
${line}`;
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
    return body2.split("\n").map((l) => l.trim()).some((line) => line && !EMPTY_LINES.has(line) && !line.startsWith("|") && !/^\*\*[^*]+:\*\*$/.test(line));
  }
  missing(names) {
    return names.filter((n) => !this.hasContent(n));
  }
  bullets(name) {
    return stripComments(this.section(name)).split("\n").map((l) => l.trim()).filter((l) => l.startsWith("- ") && l !== "-").map((l) => l.slice(2).trim());
  }
  checklist(name) {
    const out = [];
    for (const line of stripComments(this.section(name)).split("\n")) {
      const m = TASK_RE.exec(line);
      const label = m?.[2].trim();
      if (m && label && label !== "T1: \u2026 \u2192 verify: \u2026") out.push([m[1] !== " ", label]);
    }
    return out;
  }
  tasks() {
    return this.checklist("Tasks");
  }
  appendTo(name, entry) {
    const m = sectionRe(name).exec(this.text);
    if (!m) {
      this.text = `${rstrip(this.text)}

## ${name}
${entry}
`;
      return;
    }
    const [start2, end] = m.indices[1];
    const block = rstrip(m[1]);
    this.text = this.text.slice(0, start2) + (block ? `${block}
` : "") + `${entry}

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
function fill(template, fields) {
  return template.replace(/\{(\w+)\}/g, (_, k) => fields[k] ?? "");
}
function splitSections(text) {
  const parts = text.split(/^## (.+?)\s*$/m);
  const sections2 = [];
  for (let i = 1; i < parts.length; i += 2) sections2.push([parts[i].trim(), parts[i + 1] ?? ""]);
  return [parts[0], sections2];
}
function assemble(template, draft) {
  const [pre, tmplSections] = splitSections(template);
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

// src/core/ledger.ts
import { createHash } from "node:crypto";
import { appendFileSync, closeSync, existsSync, mkdirSync, openSync, readFileSync, statSync, unlinkSync } from "node:fs";
import { basename, dirname, join } from "node:path";
var LOCK_WAIT_MS = 5e3;
var LOCK_STALE_MS = 3e4;
function whoAmI(root) {
  const hash = createHash("sha1").update(root).digest("hex").slice(0, 8);
  return {
    run: process.env.CREW_RUN || `wt:${basename(root)}-${hash}`,
    actor: process.env.CREW_ACTOR || userName() || "unknown",
    role: process.env.CREW_ROLE || null,
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
  /** ref → the status its last `move` event set. */
  lastStatus(events = this.events()) {
    const out = /* @__PURE__ */ new Map();
    for (const ev of events) if (ev.type === "move" && ev.ref) out.set(ev.ref, String(ev.to));
    return out;
  }
  spend(events = this.events()) {
    const s = { cost: 0, tokensIn: 0, tokensOut: 0, byActor: {} };
    for (const ev of events) {
      if (ev.type !== "usage") continue;
      const cost = Number(ev.cost) || 0;
      s.cost += cost;
      s.tokensIn += Number(ev.tokens_in) || 0;
      s.tokensOut += Number(ev.tokens_out) || 0;
      s.byActor[ev.actor] = (s.byActor[ev.actor] ?? 0) + cost;
    }
    return s;
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
    acquire(lock);
    try {
      const live = this.claims(this.onDisk());
      for (const ev of this.staged.filter((e) => e.type === "claim" && e.ref && !e.force)) {
        const held = live.get(ev.ref);
        if (held && held.run !== ev.run) fail(`${ev.ref} was just claimed by ${held.actor} (${held.run}). Nothing was changed.`);
      }
      appendFileSync(this.path, this.staged.map((e) => `${JSON.stringify(e)}
`).join(""));
      this.staged = [];
    } finally {
      unlinkSync(lock);
    }
  }
};
function acquire(lock) {
  const deadline = Date.now() + LOCK_WAIT_MS;
  for (; ; ) {
    try {
      closeSync(openSync(lock, "wx"));
      return;
    } catch (e) {
      if (e.code !== "EEXIST") throw e;
      try {
        if (Date.now() - statSync(lock).mtimeMs > LOCK_STALE_MS) unlinkSync(lock);
      } catch {
      }
      if (Date.now() > deadline) fail(`The ledger is locked (${lock}). Another crew command is writing; retry.`);
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 20);
    }
  }
}

// src/core/knowledge.ts
var KNOWLEDGE_TYPES = ["decision", "learning", "gotcha", "convention", "risk"];
var TIERS = ["project", "playbook-candidate"];
var K_ID_RE = /\bK-\d{4}-\d{2}-\d{2}-[a-z0-9-]+\b/g;
var RISK_LEVELS = ["H", "M", "L"];
var SECRET_PATTERNS = {
  "AWS access key": /\b(AKIA|ASIA)[0-9A-Z]{16}\b/,
  "private key": /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
  "GitHub token": /\b(gh[pousr]_[A-Za-z0-9]{36,}|github_pat_[A-Za-z0-9_]{60,})\b/,
  "Slack token": /\bxox[abprs]-[A-Za-z0-9-]{10,}\b/,
  "Anthropic API key": /\bsk-ant-[A-Za-z0-9_-]{20,}/,
  "OpenAI API key": /\bsk-(proj-)?[A-Za-z0-9_-]{32,}/,
  "Google API key": /\bAIza[0-9A-Za-z_-]{35}\b/,
  "Stripe live key": /\b(sk|rk)_live_[0-9A-Za-z]{20,}\b/,
  "credentials in URL": /\b[a-z][a-z0-9+.-]*:\/\/[^/\s:@]+:[^/\s:@]{8,}@(?!localhost|127\.0\.0\.1|postgres|redis|db\b)/
};
function secretsIn(text, extra = []) {
  const lines = text.split("\n").filter((l) => !l.includes("pk:allow-secret")).join("\n");
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
    scope: (doc.get("scope") ?? "").split(",").map((s) => s.trim()).filter(Boolean),
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
  const words2 = (q.topic ?? "").toLowerCase().split(/\s+/).filter(Boolean);
  return entries.filter((e) => {
    if (!q.all && e.supersededBy) return false;
    if (q.type && e.type !== q.type) return false;
    if (words2.length) {
      const text = `${e.title}
${stripComments(e.doc.text)}`.toLowerCase();
      if (!words2.every((w) => text.includes(w))) return false;
    }
    if (!q.paths?.length && !q.globs?.length) return true;
    if (!e.scope.length) return true;
    return e.scope.some((s) => (q.paths ?? []).some((p) => globRe(s).test(p)) || (q.globs ?? []).some((g) => globsOverlap(s, g)));
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
  const base = `K-${today()}-${slugify(title).slice(0, 40).replace(/-+$/, "")}`;
  let id = base, n = 2;
  while (taken(id)) id = `${base}-${n++}`;
  return id;
}

// src/core/policy.ts
var import_yaml = __toESM(require_dist(), 1);
import { existsSync as existsSync2, readdirSync, readFileSync as readFileSync2, statSync as statSync2 } from "node:fs";
import { join as join2, resolve as resolve2 } from "node:path";
var MODES = ["ai-native", "ai-assisted", "human-led"];
var MODE_GATES = {
  "ai-native": [],
  "ai-assisted": ["plan.ready", "plan.done", "goal.done"],
  "human-led": ["plan.ready", "plan.done", "goal.done", "item.triaged"]
};
var BUILT_IN = {
  mode: "ai-assisted",
  reserved: ["idea.decided", "idea.killed", "policy.change", "deploy.production", "publish", "spend", "delete-data"],
  paths: { protected: [".crew/policy.yaml"] },
  budgets: { max_agents: 4 },
  git: { protected_branches: ["main"], force_push: false, no_verify: false },
  secrets: { files: [".env", "**/.env", "**/*.pem", "**/*.key"] },
  escalation: { to: "executive" }
};
var SCOPED = {
  models: { default: "str", fallback: "str" },
  tools: { allow: "list", deny: "list" },
  paths: { protected: "list", write: "list" },
  budgets: { run: { max_cost: "num", max_tokens: "num" } }
};
var GLOBAL = {
  mode: "str",
  human_gates: "list",
  role_gates: "map",
  reserved: "list",
  ...SCOPED,
  budgets: { max_agents: "num", run: { max_cost: "num", max_tokens: "num" }, project: { max_cost: "num", max_tokens: "num" } },
  git: { protected_branches: "list", force_push: "bool", no_verify: "bool" },
  secrets: { files: "list", patterns: "list" },
  escalation: { to: "str" }
};
var UNION = /* @__PURE__ */ new Set(["reserved", "secrets.files", "secrets.patterns", "git.protected_branches", "paths.protected", "tools.deny"]);
var TIGHTEN = /* @__PURE__ */ new Set(["git.force_push", "git.no_verify"]);
var CEILING = /^budgets\./;
function loadLayers(root, crewDir, role, team) {
  const errors = [], hints = [];
  const read = (label, text) => {
    if (text === null) return null;
    try {
      const v = (0, import_yaml.parse)(text) ?? {};
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
  const projectPath = join2(crewDir, "policy.yaml");
  const project = read(".crew/policy.yaml", existsSync2(projectPath) ? readFileSync2(projectPath, "utf8") : null);
  if (project) {
    const { roles, teams, ...global } = project;
    layers.push({ name: "project", org: false, raw: global });
    const pick = (m, key) => key && m && typeof m === "object" ? m[key] : void 0;
    const r = pick(roles, role), t = pick(teams, team);
    if (r) layers.push({ name: `project role ${role}`, org: false, raw: r });
    if (t) layers.push({ name: `project team ${team}`, org: false, raw: t });
    for (const [name, section] of Object.entries({ ...roles ?? {} })) validate(section, SCOPED, `roles.${name}`, errors);
    for (const [name, section] of Object.entries({ ...teams ?? {} })) {
      const { scope, ...rest } = section ?? {};
      if (scope !== void 0 && !isList(scope)) errors.push(`teams.${name}.scope: expected a list of path globs`);
      validate(rest, SCOPED, `teams.${name}`, errors);
    }
  }
  for (const l of layers.slice(1)) {
    if (l.name === "org" || l.name === "project") validate(l.raw, GLOBAL, l.name === "org" ? "org" : "", errors);
    else if (l.name.startsWith("org role")) validate(l.raw, SCOPED, l.name, errors);
  }
  return { layers, errors, hints };
}
function playbook(root, crewDir) {
  const cfgPath = join2(crewDir, "config.yaml");
  let cfg = {};
  try {
    cfg = existsSync2(cfgPath) ? (0, import_yaml.parse)(readFileSync2(cfgPath, "utf8")) ?? {} : {};
  } catch {
  }
  const pb = cfg.playbook ?? {};
  const path = process.env.CREW_PLAYBOOK || (typeof pb.path === "string" ? pb.path : "");
  if (!path) return { read: null };
  const dir = resolve2(root, path);
  if (!existsSync2(dir)) return { read: null, hint: `playbook ${path} not found \u2014 the org policy layer is skipped` };
  const ref = typeof pb.ref === "string" && pb.ref ? pb.ref : null;
  if (ref) {
    return {
      read: (rel) => git(["-C", dir, "show", `${ref}:${rel}`]),
      list: (sub) => (git(["-C", dir, "ls-tree", "-r", "--name-only", ref, sub]) ?? "").split("\n").filter(Boolean)
    };
  }
  return {
    read: (rel) => existsSync2(join2(dir, rel)) ? readFileSync2(join2(dir, rel), "utf8") : null,
    list: (sub) => existsSync2(join2(dir, sub)) ? readdirSync(join2(dir, sub), { recursive: true, encoding: "utf8" }).map((f) => `${sub}/${f}`.replace(/\\/g, "/")).filter((f) => existsSync2(join2(dir, f)) && !statSync2(join2(dir, f)).isDirectory()) : []
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
    const s = shape[k];
    if (!s) {
      errors.push(`${at}: ${GLOBAL[k] ? "can only be set globally, not per role or team" : "unknown key"}`);
      continue;
    }
    if (typeof s === "object") validate(v, s, at, errors);
    else if (s === "list" ? !isList(v) : s === "map" ? typeof v !== "object" || Array.isArray(v) || v === null : typeof v !== { str: "string", num: "number", bool: "boolean" }[s]) {
      errors.push(`${at}: expected ${s === "list" ? "a list of strings" : s === "map" ? "a mapping" : `a ${s === "str" ? "string" : s === "num" ? "number" : "boolean"}`}`);
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
function resolveLayers(layers) {
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
        values.set(path, v);
        sources.set(path, layer.name);
        if (layer.org) values.set("human_gates.org", [.../* @__PURE__ */ new Set([...values.get("human_gates.org") ?? [], ...v])]);
      } else {
        values.set(path, v);
        sources.set(path, layer.name);
      }
    }
  }
  const get = (p, d) => values.has(p) ? values.get(p) : d;
  const mode = get("mode", "ai-assisted");
  if (!MODES.includes(mode)) errors.push(`mode: '${mode}' is not one of ${MODES.join(", ")}`);
  if (!values.has("human_gates")) sources.set("human_gates", `built-in: mode ${mode}`);
  const gates = [.../* @__PURE__ */ new Set([...get("human_gates", MODE_GATES[mode] ?? []), ...get("human_gates.org", [])])];
  const role_gates = Object.fromEntries([...values].filter(([p]) => p.startsWith("role_gates[")).map(([p, v]) => [p.slice(11, -1), String(v)]));
  for (const t of [...gates, ...Object.keys(role_gates), ...get("reserved", [])]) errors.push(...transitionProblem(t));
  const deny = get("tools.deny", []);
  const allow = get("tools.allow", []);
  for (const t of allow.filter((a) => deny.includes(a))) errors.push(`tools.allow: '${t}' is denied by ${sources.get("tools.deny")} (deny wins)`);
  const num = (p) => get(p, null);
  const policy = {
    mode,
    human_gates: gates,
    role_gates,
    reserved: get("reserved", []),
    models: { default: get("models.default", null), fallback: get("models.fallback", null) },
    tools: { allow: allow.filter((a) => !deny.includes(a)), deny },
    paths: { protected: get("paths.protected", []), write: get("paths.write", []) },
    budgets: {
      max_agents: num("budgets.max_agents"),
      run: { max_cost: num("budgets.run.max_cost"), max_tokens: num("budgets.run.max_tokens") },
      project: { max_cost: num("budgets.project.max_cost"), max_tokens: num("budgets.project.max_tokens") }
    },
    git: { protected_branches: get("git.protected_branches", []), force_push: get("git.force_push", false), no_verify: get("git.no_verify", false) },
    secrets: { files: get("secrets.files", []), patterns: get("secrets.patterns", []) },
    escalation: { to: get("escalation.to", "executive") }
  };
  return { policy, sources, errors };
}
function transitionProblem(t) {
  const [kind, status2] = t.split(".");
  if (!Object.hasOwn(FLOWS, kind)) return [];
  return Object.hasOwn(FLOWS[kind], status2 ?? "") ? [] : [`'${t}': ${kind} has no status '${status2}'`];
}
function resolvePolicy(root, crewDir, role = null, team = null) {
  const { layers, errors, hints } = loadLayers(root, crewDir, role, team);
  const r = resolveLayers(layers);
  return { policy: r.policy, sources: r.sources, errors: [...errors, ...r.errors], hints, role, team };
}
function approvalReason(p, transition) {
  if (p.reserved.includes(transition)) return "a reserved decision";
  if (p.human_gates.includes(transition)) return `a human gate (mode ${p.mode})`;
  return null;
}

// src/core/workspace.ts
import { chmodSync, existsSync as existsSync3, mkdirSync as mkdirSync2, readdirSync as readdirSync2, readFileSync as readFileSync3, rmSync, statSync as statSync3, writeFileSync } from "node:fs";
import { dirname as dirname2, join as join3, relative, sep } from "node:path";
var Workspace = class {
  constructor(root) {
    this.root = root;
  }
  root;
  pending = /* @__PURE__ */ new Map();
  hooks = [];
  output = [];
  /** A line for stdout (shown even when the command later refuses). */
  say(line) {
    this.output.push(line);
  }
  read(path) {
    if (this.pending.has(path)) return this.pending.get(path)?.text ?? null;
    return this.isFileOnDisk(path) ? readFileSync3(path, "utf8") : null;
  }
  write(path, text, mode) {
    this.pending.set(path, { text, mode });
  }
  remove(path) {
    this.pending.set(path, null);
  }
  isFile(path) {
    return this.pending.has(path) ? this.pending.get(path) !== null : this.isFileOnDisk(path);
  }
  isDir(path) {
    if (existsSync3(path) && statSync3(path).isDirectory()) return true;
    return [...this.pending].some(([p, v]) => v !== null && p.startsWith(path + sep));
  }
  /** File names directly inside dir (staged files included, staged removals excluded), sorted. */
  list(dir) {
    const names = new Set(existsSync3(dir) && statSync3(dir).isDirectory() ? readdirSync2(dir, { withFileTypes: true }).filter((e) => e.isFile()).map((e) => e.name) : []);
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
    return join3(...parts);
  }
  /** Run fn at the start of flush(), before any file is written; a HubError there aborts the whole flush. */
  beforeFlush(fn) {
    this.hooks.push(fn);
  }
  flush() {
    for (const hook of this.hooks.splice(0)) hook();
    for (const [path, v] of this.pending) {
      if (v === null) {
        rmSync(path, { force: true, recursive: true });
        continue;
      }
      mkdirSync2(dirname2(path), { recursive: true });
      writeFileSync(path, v.text);
      if (v.mode !== void 0) chmodSync(path, v.mode);
    }
    this.pending.clear();
  }
  isFileOnDisk(path) {
    return existsSync3(path) && statSync3(path).isFile();
  }
};

// src/core/store.ts
var SCRIPT_FILE = fileURLToPath(import.meta.url);
var SCRIPT_DIR = dirname3(SCRIPT_FILE);
var SKILL_DIR = dirname3(SCRIPT_DIR);
function yamlBlock(text, block) {
  const out = {};
  let inside = false;
  for (const line of text.split("\n")) {
    if (/^\S/.test(line)) inside = line.replace(/#.*/, "").trim() === `${block}:`;
    else if (inside) {
      const m = /^\s+([\w-]+):\s*([^#]*)/.exec(line);
      if (m && m[2].trim()) out[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
    }
  }
  return out;
}
var Store = class _Store {
  constructor(ws) {
    this.ws = ws;
    this.dir = join4(ws.root, ".crew");
    this.dirs = Object.fromEntries(Object.entries(DIRS).map(([k, v]) => [k, join4(this.dir, v)]));
    this.ideaPath = join4(this.dir, "idea.md");
    this.knowledgeDir = join4(this.dir, "knowledge");
  }
  ws;
  dir;
  dirs;
  ideaPath;
  knowledgeDir;
  ledgerCache = null;
  policyCache = null;
  static open(root = repoRoot()) {
    return new _Store(new Workspace(root));
  }
  /** The shared event log (claims, moves, logs, usage); see ledger.ts. */
  get ledger() {
    return this.ledgerCache ??= Ledger.at(this.ws, this.dir);
  }
  /** The effective policy for this run's role (see policy.ts). */
  get policy() {
    return this.policyCache ??= resolvePolicy(this.ws.root, this.dir, this.ledger.who.role);
  }
  rel(p) {
    return this.ws.rel(p);
  }
  say(line) {
    this.ws.say(line);
  }
  require() {
    if (!this.ws.isDir(this.dir)) fail("No .crew/ directory. Run `crew.mjs init` first.");
  }
  /** Project copy wins (so a cloned repo works without the plugin); fall back to the skill's. */
  template(name) {
    for (const d of [join4(this.dir, "templates"), join4(SKILL_DIR, "templates")]) {
      const text = this.ws.read(join4(d, name));
      if (text !== null) return text;
    }
    return fail(`Template ${name} not found.`);
  }
  /** Hub settings from the `hub:` block of .crew/config.yaml, with defaults. */
  settings() {
    const text = this.ws.read(join4(this.dir, "config.yaml"));
    const s = { ...DEFAULT_SETTINGS, ...text === null ? {} : yamlBlock(text, "hub") };
    const int = (k) => /^\d+$/.test(s[k]) ? parseInt(s[k], 10) : parseInt(DEFAULT_SETTINGS[k], 10);
    return { wip_limit: int("wip_limit"), max_tasks: int("max_tasks") };
  }
  // -- loading
  attach(doc) {
    doc.sink = (path, text) => this.ws.write(path, text);
    return doc;
  }
  loadDir(d) {
    const docs = /* @__PURE__ */ new Map();
    for (const name of this.ws.list(d).filter((n) => n.endsWith(".md"))) {
      const path = join4(d, name);
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
  /** Project knowledge, plus the org playbook's lessons (`lessons/**.md`, read-only) when a playbook is configured. */
  knowledge(withPlaybook = true) {
    const project = [...this.loadDir(this.knowledgeDir).values()].map((d) => toEntry(d, "project"));
    const pb = withPlaybook ? playbook(this.ws.root, this.dir) : { read: null };
    const lessons = pb.read && pb.list ? pb.list("lessons").filter((f) => f.endsWith(".md")).flatMap((f) => {
      const text = pb.read(f);
      const d = text === null ? null : Doc.parse(text, null, "playbook");
      return d?.id ? [toEntry(d, "playbook")] : [];
    }) : [];
    return linkSupersession([...project, ...lessons]);
  }
  /** The project's idea (.crew/idea.md), if it has been written. */
  idea() {
    const text = this.ws.read(this.ideaPath);
    return text === null ? null : this.attach(Doc.parse(text, this.ideaPath));
  }
  /** The focus goal's ID, as set on the idea (`focus G-###`). */
  focus() {
    return (this.idea()?.get("focus") ?? "").toUpperCase();
  }
  /** Plans on the worktree; with includeBranches, live copies from every plan/* branch win
   * unless main already closed the plan (merged or dropped). */
  plans(includeBranches = false) {
    const plans2 = this.loadDir(this.dirs.plan);
    if (includeBranches) {
      for (const [pid, doc] of this.branchPlans()) {
        const base = plans2.get(pid);
        if (!base || !CLOSED.has(base.get("status") ?? "")) plans2.set(pid, doc);
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
          const text = show(ref, name);
          if (text !== null) out.set(m[1], Doc.parse(text, null, ref));
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
    const doc = this.loadDir(this.dirs[kind]).get(docId);
    return doc ?? fail(`${docId} not found in ${this.rel(this.dirs[kind])}`);
  }
  /** Next free ID, scanning the worktree and every branch so parallel work never reuses one. */
  nextId(prefix, kind) {
    const d = this.dirs[kind];
    const width = 3;
    const names = this.ws.list(d);
    const rel = `${this.rel(d)}/`;
    for (const ref of allRefs()) names.push(...lsTree(ref, rel).map((n) => n.split("/").pop()));
    const nums = names.map((n) => new RegExp(`^${prefix}-(\\d+)`).exec(n)).filter((m) => m).map((m) => parseInt(m[1], 10));
    return `${prefix}-${String(Math.max(0, ...nums) + 1).padStart(width, "0")}`;
  }
  // -- creating documents from drafts
  readDraft(draftPath, what) {
    const file = resolve3(draftPath);
    const text = this.ws.read(file);
    if (text === null) {
      fail(`Draft ${draftPath} not found. Write the ${what}'s sections there first (see .crew/templates/ and the writing guide).`);
    }
    return [file, text];
  }
  consume(draftFile, keep = false) {
    const real = (p) => existsSync4(p) ? realpathSync(p) : p;
    if (!keep && real(draftFile).startsWith(real(resolve3(this.dir, "drafts")) + "/")) this.ws.remove(draftFile);
  }
  build(template, draft, fields) {
    const tmpl = fill(stripComments(this.template(template)), { date: today(), ...fields }).replace(/^(\w+): $/gm, "$1:");
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
    if (kindOf(docId) !== kind || !this.loadDir(this.dirs[kind]).has(docId)) {
      fail(`${kind[0].toUpperCase()}${kind.slice(1)} ${docId} does not exist.`);
    }
    return docId;
  }
  static checkPriority(p) {
    if (p && !PRIORITIES.includes(p.toUpperCase())) fail(`Priority must be one of ${PRIORITIES.join(", ")}.`);
    return (p ?? "").toUpperCase();
  }
};

// src/core/queries.ts
var up = (s) => (s ?? "").toUpperCase();
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

// src/commands/advisor.ts
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
function nextStep(store) {
  store.require();
  for (const line of nextLines(store)) store.say(line);
}
function nextLines(store) {
  const ctx = new Context(store);
  for (const p of ctx.active) ctx.lines.push(`IN PROGRESS  ${p.id}: ${p.get("title")} [${p.get("status")}]`);
  for (const rule of [ctx.expedite, ctx.wipFull, ctx.startReady, ctx.refineDraft, ctx.triage, ctx.planItem, ctx.idea, ctx.goal]) {
    const line = rule.call(ctx);
    if (line) return [...ctx.lines, `NEXT         ${line}`];
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

// src/core/gates.ts
function triageProblems(item) {
  const prefix = item.id.split("-")[0];
  const problems = item.missing(TRIAGE_SECTIONS[prefix]).map((n) => `empty section: ${n}`);
  if (!PRIORITIES.includes(item.get("priority") ?? "")) problems.push("no priority (P0\u2013P3)");
  if (prefix === "BUG" && !Object.hasOwn(SEVERITY_PRIORITY, item.get("severity") ?? "")) problems.push("no severity (S1\u2013S4)");
  return problems;
}
function readinessProblems(store, plan) {
  return [
    ...plan.missing(READY_SECTIONS).map((n) => `empty section: ${n}`),
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
  const problems = idea2.missing(DECIDED_SECTIONS).map((n) => `empty section: ${n}`);
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
    const text = (plan.section("Acceptance criteria") + plan.section("Tasks") + plan.section("Test plan")).toLowerCase();
    if (!text.includes("regression")) {
      problems.push("fixes a bug but names no regression test (acceptance criteria, tasks or test plan)");
    }
  }
  return problems;
}

// src/commands/execution.ts
import { spawnSync as spawnSync2 } from "node:child_process";
import { createHash as createHash2 } from "node:crypto";
var OUTPUT_LINES = 15;
var OUTPUT_CHARS = 2e3;
var RUN_TIMEOUT_MS = 10 * 6e4;
function criteria(plan) {
  const list = plan.checklist("Acceptance criteria").map(([, c]) => c);
  return list.length ? list : plan.bullets("Acceptance criteria");
}
function implementer(events, planId) {
  return [...events].reverse().find((e) => e.type === "claim" && e.ref === planId)?.run ?? null;
}
var checkpoints = (events, planId) => events.filter((e) => e.type === "checkpoint" && e.ref === planId);
function evidence(store, plan) {
  const events = store.ledger.events(), impl = implementer(events, plan.id);
  return criteria(plan).map((ac, i) => {
    let found = null;
    for (const e of checkpoints(events, plan.id)) {
      for (const v of e.verify ?? []) if (v.ac.includes(i + 1)) found = { verify: v, by: e.run };
    }
    return { ac, verify: found?.verify ?? null, by: found?.by ?? null, independent: !!found && (!impl || found.by !== impl) };
  });
}
function evidenceProblems(store, plan, approvedBy) {
  const problems = [];
  const impl = implementer(store.ledger.events(), plan.id);
  if (impl && impl === store.ledger.who.run && !approvedBy) {
    problems.push(`this run (${impl}) implemented ${plan.id}; another run \u2014 QA \u2014 verifies it and moves it to done`);
  }
  evidence(store, plan).forEach((e, i) => {
    if (approvedBy && /\bevidence:/i.test(e.ac)) return;
    if (!e.verify) problems.push(`AC${i + 1} has no evidence: \`checkpoint ${plan.id} --run "<check>" --ac ${i + 1}\` \u2014 ${e.ac}`);
    else if (!e.verify.ok) problems.push(`AC${i + 1}: its latest check failed (${e.verify.cmd})`);
    else if (!e.independent) problems.push(`AC${i + 1}: only verified by the implementer (${e.by}); verify it from another run`);
  });
  return problems;
}
function snapshot() {
  const sha = git(["rev-parse", "HEAD"])?.trim() || null;
  const status2 = git(["status", "--porcelain"]) ?? "";
  const dirty = status2.split("\n").filter(Boolean).map((l) => l.slice(3)).filter((p) => !p.startsWith(".crew/drafts/"));
  const diff = git(["diff", "HEAD"]) ?? "";
  return { sha, dirty, fingerprint: createHash2("sha1").update(`${sha}
${status2}
${diff}`).digest("hex").slice(0, 12) };
}
function planFromBranch(store, id) {
  const pid = id?.toUpperCase() ?? /^plan\/(P-\d+)/.exec(currentBranch() ?? "")?.[1];
  return pid ? store.plans(true).get(pid) ?? fail(`No plan ${pid}.`) : null;
}
function tail(text, extra) {
  const lines = text.trimEnd().split("\n").slice(-OUTPUT_LINES).join("\n").slice(-OUTPUT_CHARS);
  return secretsIn(lines, extra).length ? "(output withheld: it looked like it contained a secret)" : lines;
}
function checkpoint(store, id, o = {}) {
  store.require();
  const plan = planFromBranch(store, id);
  if (!plan) {
    if (o.auto) return 0;
    fail("Not on a plan branch: name the plan (`checkpoint P-###`).");
  }
  const snap = snapshot();
  const last = checkpoints(store.ledger.events(), plan.id).at(-1);
  if (o.auto && last?.fingerprint === snap.fingerprint) return 0;
  const acs = parseAc(o.ac, criteria(plan).length);
  const verify = [];
  if (o.run) {
    const r = spawnSync2(o.run, { shell: true, cwd: store.ws.root, encoding: "utf8", timeout: RUN_TIMEOUT_MS, maxBuffer: 32 << 20 });
    verify.push({ cmd: o.run, ok: r.status === 0, ac: acs, output: tail(`${r.stdout ?? ""}${r.stderr ?? ""}`, store.policy.policy.secrets.patterns), observed: true });
  }
  if (o.verify) {
    if (o.result !== "pass" && o.result !== "fail") fail("--verify needs --result pass|fail.");
    verify.push({ cmd: o.verify, ok: o.result === "pass", ac: acs, ...o.output ? { output: tail(o.output, store.policy.policy.secrets.patterns) } : {}, observed: false });
  }
  if (o.attempt && !o.why) fail("--attempt needs --why: what made it fail, so the next run doesn't retry it.");
  const step = o.step ?? plan.tasks().find(([done]) => !done)?.[1].split(":")[0] ?? "done";
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
  if (!o.auto) {
    store.say(`${plan.id}: checkpoint at ${step}${snap.sha ? ` (${snap.sha.slice(0, 7)})` : ""}` + verify.map((v) => ` \u2014 ${v.ok ? "\u2713" : "\u2717"} ${v.cmd}`).join(""));
  }
  return verify.some((v) => !v.ok) ? 1 : 0;
}
function parseAc(spec, n) {
  if (!spec) return [];
  if (spec === "all") return Array.from({ length: n }, (_, i) => i + 1);
  const nums = spec.split(",").map((x) => Number(x.trim().replace(/^AC/i, "")));
  const bad = nums.filter((x) => !Number.isInteger(x) || x < 1 || x > n);
  if (bad.length) fail(`--ac: the plan has acceptance criteria 1\u2013${n} (or "all").`);
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
    const here = currentBranch() === plan.get("branch");
    const now = here ? snapshot() : null;
    const ahead = here && last.sha && now?.sha ? Number(git(["rev-list", "--count", `${last.sha}..HEAD`])?.trim() || 0) : 0;
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
  else for (const line of recovery(store, plan)) store.say(line);
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

// src/commands/workflow.ts
var LOG_SECTION = { item: "Notes" };
function move(store, docId, status2, note, force = false, approvedBy) {
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
  if (!force) guard(store, kind, doc, status2, approvedBy);
  authorize(store, doc.id, `${kind}.${status2}`, approvedBy);
  stamp(kind, doc, status2);
  doc.set("status", status2);
  if (kind === "plan" && status2 === "in-review" && doc.source === "worktree") writeHandoff(store, doc);
  const approval = approvedBy ? ` (approved by ${approvedBy})` : "";
  doc.appendLog(`status ${old} \u2192 ${status2}` + (note ? ` \u2014 ${note}` : "") + approval, LOG_SECTION[kind] ?? "Progress log");
  doc.save();
  store.ledger.record("move", doc.id, { from: old, to: status2, ...note ? { note } : {}, ...approvedBy ? { approved_by: approvedBy } : {} });
  if (CLOSED.has(status2) && store.ledger.claims().has(doc.id)) store.ledger.record("release", doc.id, { reason: status2 });
  store.say(`${doc.id}: ${old} \u2192 ${status2}`);
  return doc;
}
function authorize(store, id, transition, approvedBy) {
  const { policy, errors } = store.policy;
  if (errors.length) fail(`The policy is invalid, so nothing moves until it is fixed (\`crew.mjs policy check\`):
  - ${errors.join("\n  - ")}`);
  if (approvedBy !== void 0 && !approvedBy.trim()) fail("--approved-by needs the approving person's name.");
  if (approvedBy) return;
  const reason = approvalReason(policy, transition);
  const [, status2] = transition.split(".");
  if (reason) {
    fail(`${id} \u2192 ${status2} is ${reason}: a human approves it with \`crew.mjs move ${id} ${status2} --approved-by <name>\` (agents over MCP can't). Ask the ${policy.escalation.to} first.`);
  }
  const role = policy.role_gates[transition];
  const mine = store.ledger.who.role;
  if (role && mine !== role) fail(`${id} \u2192 ${status2} is for the ${role} role; this run is ${mine ? `the ${mine} role` : "in no role"} (CREW_ROLE).`);
}
function budgetProblems(store) {
  const { budgets } = store.policy.policy;
  const events = store.ledger.events(), me = store.ledger.who.run;
  const mine = store.ledger.spend(events.filter((e) => e.run === me)), all = store.ledger.spend(events);
  const over = (what, used, cap, unit = "") => cap !== null && used >= cap ? [`${what}: ${unit}${+used.toFixed(2)} used of ${unit}${cap}`] : [];
  const holders = new Set([...store.ledger.claims(events).values()].map((c) => c.run));
  const agents = budgets.max_agents !== null && !holders.has(me) && holders.size >= budgets.max_agents ? [`max_agents: ${holders.size} runs already hold work (limit ${budgets.max_agents})`] : [];
  return [
    ...over("run cost", mine.cost, budgets.run.max_cost, "$"),
    ...over("run tokens", mine.tokensIn + mine.tokensOut, budgets.run.max_tokens),
    ...over("project cost", all.cost, budgets.project.max_cost, "$"),
    ...over("project tokens", all.tokensIn + all.tokensOut, budgets.project.max_tokens),
    ...agents
  ];
}
function guard(store, kind, doc, status2, approvedBy) {
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
      ...evidenceProblems(store, doc, approvedBy)
    ];
    label = "can't be done";
  } else if (kind === "goal" && status2 === "active") {
    problems = doc.missing(["Outcome", "Acceptance criteria"]).map((n) => `empty section: ${n}`);
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
  let doc = store.find(planId);
  if (!force) checkStartable(store, doc);
  const over = budgetProblems(store);
  if (over.length && !approvedBy) {
    fail(`Over budget \u2014 no new work without a human's approval (\`start ${doc.id} --approved-by <name>\`):
  - ${over.join("\n  - ")}`);
  }
  const held = store.ledger.claims().get(doc.id);
  if (held && held.run !== store.ledger.who.run && !force) {
    fail(`${doc.id} is claimed by ${held.actor} (${held.run}, ${held.worktree}) since ${held.ts.slice(0, 10)}. Coordinate with them, or \`release ${doc.id} --force\` if that run is gone.`);
  }
  if (!treeIsClean()) fail("Working tree not clean. Commit or stash first.");
  const focus = store.focus();
  if (!onFocus(doc, store.items(), focus)) store.say(`note: ${planId} does not serve the focus goal ${focus}`);
  const branch = doc.get("branch") || `plan/${doc.id}-${slugify(doc.get("title") ?? "")}`;
  git(["switch", "-c", branch], true);
  doc = store.find(planId);
  if (doc.get("status") === "draft" && force) {
    doc.set("status", "ready");
    doc.save();
  }
  store.ledger.record("claim", doc.id, { branch, ...force ? { force: true } : {} });
  move(store, planId, "in-progress", `branch ${branch}`, force, approvedBy);
  store.say(`Switched to ${branch} \u2014 claimed by ${store.ledger.who.actor} (${store.ledger.who.run})`);
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
  if (u.cost !== void 0 && !(u.cost >= 0)) fail("--cost must be a number \u2265 0.");
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
function log(store, docId, text) {
  const doc = store.find(docId);
  doc.appendLog(text, LOG_SECTION[kindOf(docId) ?? "plan"] ?? "Progress log");
  doc.save();
  store.ledger.record("log", doc.id, { text });
}

// src/commands/backlog.ts
function createItem(store, prefix, title, body2, fields) {
  const iid = store.nextId(prefix, "item");
  const doc = store.build(`item-${ITEM_TYPES[prefix]}.md`, body2, { id: iid, title, type: ITEM_TYPES[prefix], ...fields });
  return store.writeNew(doc, `${store.dirs.item}/${iid}-${slugify(title)}.md`);
}
function checkSeverity(severity) {
  const s = (severity ?? "").toUpperCase();
  if (s && !Object.hasOwn(SEVERITY_PRIORITY, s)) fail(`Severity must be one of ${Object.keys(SEVERITY_PRIORITY).join(", ")}.`);
  return s;
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

// src/commands/checks.ts
import { join as join5 } from "node:path";

// src/commands/policy.ts
var import_yaml2 = __toESM(require_dist(), 1);
var show2 = (v) => Array.isArray(v) ? v.length ? v.join(", ") : "\u2014" : v === null || v === void 0 ? "\u2014" : String(v);
function policyShow(store, role, team, json = false) {
  const r = resolvePolicy(store.ws.root, store.dir, role ?? store.ledger.who.role, team ?? null);
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
    ["escalation.to", p.escalation.to, "escalation.to"]
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
  const base = resolvePolicy(store.ws.root, store.dir);
  const errors = new Set(base.errors), hints = new Set(base.hints);
  let raw = {};
  try {
    raw = (0, import_yaml2.parse)(store.ws.read(`${store.dir}/policy.yaml`) ?? "") ?? {};
  } catch {
  }
  const named = (section) => Object.keys(raw[section] ?? {});
  for (const role of named("roles")) for (const e of resolvePolicy(store.ws.root, store.dir, role).errors) errors.add(e);
  for (const team of named("teams")) for (const e of resolvePolicy(store.ws.root, store.dir, null, team).errors) errors.add(e);
  return { errors: [...errors].map((e) => `policy: ${e}`), hints: [...hints].map((h) => `policy: ${h}`) };
}
function report(store, errors, hints) {
  for (const e of errors) store.say(`ERROR  ${e.startsWith("policy: ") ? e : `policy: ${e}`}`);
  for (const h of hints) store.say(`HINT   ${h.startsWith("policy: ") ? h : `policy: ${h}`}`);
}

// src/commands/checks.ts
var Snapshot = class {
  constructor(store) {
    this.store = store;
    this.goals = store.goals();
    this.items = store.items();
    this.plans = store.plans();
    this.allPlans = store.plans(true);
    this.idea = store.idea();
    this.focus = store.focus();
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
};
var valid = (flow, st) => st !== null && Object.hasOwn(flow, st);
var up2 = (s) => (s ?? "").toUpperCase();
function findings(store) {
  const s = new Snapshot(store), f = { errors: [], hints: [] };
  for (const rule of [idea, plans, items, goals, ledger, knowledge, hygiene]) rule(s, f);
  const p = policyFindings(store);
  return { errors: [...f.errors, ...p.errors], hints: [...f.hints, ...p.hints] };
}
function check(store) {
  store.require();
  const f = findings(store);
  for (const e of f.errors) store.say(`ERROR  ${e}`);
  for (const h of f.hints) store.say(`HINT   ${h}`);
  if (!f.errors.length && !f.hints.length) store.say("Hub OK.");
  return f.errors.length ? 1 : 0;
}
function idea(s, f) {
  const i = s.idea;
  if (!i) {
    f.hints.push("no idea.md \u2014 write the problem, outcome and success criteria with `new-idea TITLE --from <draft>`");
    return;
  }
  const st = i.get("status");
  if (!valid(IDEA_FLOW, st)) f.errors.push(`IDEA: invalid status '${st}'`);
  if (st === "decided") f.errors.push(...decisionProblems(i).map((p) => `IDEA: decided but ${p}`));
  if (s.focus) {
    const g = s.goals.get(s.focus);
    if (!g) f.errors.push(`IDEA: focus ${s.focus} is not a goal`);
    else if (CLOSED.has(g.get("status") ?? "")) f.hints.push(`focus ${s.focus} is ${g.get("status")} \u2014 set the next focus with \`focus G-###\``);
  } else if ([...s.goals.values()].some((g) => !CLOSED.has(g.get("status") ?? ""))) {
    f.hints.push("no focus goal \u2014 `focus G-###` so the team works toward one goal at a time");
  }
}
function plans(s, f) {
  const branches = new Set(planBranches());
  const here = currentBranch();
  for (const [pid, p] of s.plans) {
    const st = p.get("status");
    if (!valid(PLAN_FLOW, st)) f.errors.push(`${pid}: invalid status '${st}'`);
    const missing = p.missing(REQUIRED_ON_CREATE.plan);
    if (!CLOSED.has(st ?? "") && missing.length) {
      f.errors.push(`${pid}: skeleton plan \u2014 empty ${missing.join(", ")} (write it or delete it; unscheduled ideas belong in backlog items)`);
    }
    const unknownDeps = p.dependsOn().filter((d) => !s.allPlans.has(d));
    if (unknownDeps.length) f.errors.push(`${pid}: depends on unknown ${unknownDeps.join(", ")}`);
    const unknownItems = idList(p.get("items")).filter((i) => !s.items.has(i));
    if (unknownItems.length) f.errors.push(`${pid}: links unknown items ${unknownItems.join(", ")}`);
    if (p.get("goal") && !s.goals.has(up2(p.get("goal")))) f.errors.push(`${pid}: references missing goal ${p.get("goal")}`);
    if (st === "ready") f.errors.push(...readinessProblems(s.store, p).map((problem) => `${pid}: ready but ${problem}`));
    if (st === "done") donePlan(pid, p, f);
    if (ACTIVE.has(st ?? "")) activePlan(pid, p, s, f, branches, here);
    if ((ACTIVE.has(st ?? "") || st === "ready") && !onFocus(p, s.items, s.focus)) {
      f.hints.push(`${pid}: ${st} but does not serve the focus goal ${s.focus} (only bugs and chores may run off focus)`);
    }
  }
}
function donePlan(pid, p, f) {
  if (p.tasks().some(([d]) => !d)) f.errors.push(`${pid}: done but has unchecked tasks`);
  if (!stripComments(p.section("Outcome")).trim()) f.errors.push(`${pid}: done but Outcome section is empty`);
}
function activePlan(pid, p, s, f, branches, here) {
  const st = p.get("status");
  const waits = unmetDeps(p, s.allPlans);
  if (waits.length) f.hints.push(`${pid}: ${st} while dependencies are unfinished: ${waits.join(", ")}`);
  if (!p.tasks().length || !p.hasContent("Acceptance criteria")) f.errors.push(`${pid}: ${st} but has no tasks or acceptance criteria`);
  const branch = p.get("branch");
  if ((st === "in-progress" || st === "in-review") && !branches.has(branch ?? "") && here !== branch) {
    f.hints.push(`${pid}: ${st} but branch ${branch} not found locally`);
  }
}
function items(s, f) {
  for (const [iid, it] of s.items) {
    const st = it.get("status");
    if (!valid(ITEM_FLOW, st)) f.errors.push(`${iid}: invalid status '${st}'`);
    if (st === "triaged") {
      const problems = triageProblems(it);
      if (problems.length) f.errors.push(`${iid}: triaged but ${problems.join("; ")}`);
    }
    const owner2 = up2(it.get("plan"));
    if (owner2 && !s.allPlans.has(owner2)) f.errors.push(`${iid}: linked to missing plan ${owner2}`);
    if (s.allPlans.get(owner2)?.get("status") === "dropped") {
      f.hints.push(`${iid}: its plan ${owner2} was dropped \u2014 clear \`plan:\` to return it to the backlog`);
    }
    if (it.get("goal") && !s.goals.has(up2(it.get("goal")))) f.errors.push(`${iid}: references missing goal ${it.get("goal")}`);
    if (iid.startsWith("BUG-") && it.get("priority") === "P0" && ["new", "triaged"].includes(itemStatus(it, s.allPlans))) {
      f.hints.push(`${iid}: P0 bug with no plan \u2014 expedite it`);
    }
  }
  const untriaged = [...s.items.values()].filter((it) => it.get("status") === "new");
  if (untriaged.length > 10) f.hints.push(`${untriaged.length} untriaged items \u2014 run a triage session`);
}
function goals(s, f) {
  for (const [eid, e] of s.goals) {
    const st = e.get("status");
    if (!valid(GOAL_FLOW, st)) f.errors.push(`${eid}: invalid status '${st}'`);
    const missing = e.missing(["Outcome", "Scope", "Acceptance criteria"]);
    if (!CLOSED.has(st ?? "") && missing.length) f.errors.push(`${eid}: skeleton goal \u2014 empty ${missing.join(", ")}`);
    const eps = goalPlans(eid, s.allPlans, s.items), eitems = goalItems(eid, s.items);
    const openItems = eitems.filter((i) => itemStatus(i, s.allPlans) !== "done");
    if (eps.length && eps.every((p) => CLOSED.has(p.get("status") ?? "")) && !openItems.length && st === "active") {
      f.hints.push(`${eid}: all plans and items closed \u2014 verify acceptance criteria, then \`move ${eid} done\``);
    }
    if (st === "proposed" && eps.some((p) => ["in-progress", "in-review", "blocked", "done"].includes(p.get("status") ?? ""))) {
      f.hints.push(`${eid}: has started plans but is still 'proposed' \u2014 \`move ${eid} active\` (on main)`);
    }
    if (!CLOSED.has(st ?? "") && !eps.length && !eitems.length) f.hints.push(`${eid}: no plans and no items \u2014 break the goal down`);
  }
}
function knowledge(s, f) {
  const entries = s.store.knowledge(false);
  if (!entries.length) return;
  const files2 = files(s.store.ws.root);
  const ids = new Set(entries.map((e) => e.id));
  const open = [s.idea, ...s.goals.values(), ...s.allPlans.values()].filter((d) => !!d && !CLOSED.has(d.get("status") ?? ""));
  const cited = /* @__PURE__ */ new Map();
  for (const d of open) for (const k of d.text.match(K_ID_RE) ?? []) cited.set(k, [...cited.get(k) ?? [], d.id]);
  for (const e of entries) {
    if (!KNOWLEDGE_TYPES.includes(e.type)) f.errors.push(`${e.id}: unknown type '${e.type}'`);
    if (e.supersedes && !ids.has(e.supersedes)) f.errors.push(`${e.id}: supersedes missing ${e.supersedes}`);
    const secrets = secretsIn(e.doc.text, s.store.policy.policy.secrets.patterns);
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
function ledger(s, f) {
  const events = s.store.ledger.events();
  for (const [ref, claim] of s.store.ledger.claims(events)) {
    const st = s.allPlans.get(ref)?.get("status");
    if (st && CLOSED.has(st)) f.hints.push(`${ref}: ${st} but still claimed by ${claim.actor} \u2014 \`release ${ref}\``);
  }
  for (const [ref, last] of s.store.ledger.lastStatus(events)) {
    const st = s.allPlans.get(ref)?.get("status");
    if (st && st !== last) f.hints.push(`${ref}: the ledger last moved it to ${last}, but the plan says ${st} (edited by hand?)`);
  }
}
function hygiene(s, f) {
  const ahead = [...s.allPlans.values()].filter((p) => ["draft", "ready"].includes(p.get("status") ?? ""));
  if (ahead.length > MAX_WRITTEN_AHEAD) {
    f.hints.push(`${ahead.length} plans written ahead of the work (> ${MAX_WRITTEN_AHEAD}) \u2014 keep later work as backlog items so plans don't go stale`);
  }
  const leftovers = s.store.ws.list(join5(s.store.dir, "drafts")).filter((n) => n.endsWith(".md"));
  if (leftovers.length) {
    f.hints.push(`unconverted drafts in .crew/drafts/: ${leftovers.join(", ")} \u2014 create the document from them or delete`);
  }
  if (s.store.ws.isDir(join5(s.store.ws.root, ".project"))) {
    f.hints.push("a .project/ directory from project-kit is still here \u2014 `crew.mjs migrate` moves it into .crew/");
  }
}

// src/commands/migrate.ts
import { existsSync as existsSync5, readdirSync as readdirSync3, statSync as statSync4 } from "node:fs";
import { join as join8 } from "node:path";

// src/commands/planning.ts
import { readFileSync as readFileSync4 } from "node:fs";
import { join as join7, resolve as resolve5 } from "node:path";

// src/commands/export.ts
import { join as join6, resolve as resolve4 } from "node:path";

// src/commands/graph.ts
import { basename as basename2 } from "node:path";

// src/graph-types.ts
var SCHEMA_VERSION = 4;

// src/commands/graph.ts
var ID_RE = /\b(?:IDEA|(?:G|P|FEAT|BUG|CHORE|SPIKE)-\d+|K-\d{4}-\d{2}-\d{2}-[a-z0-9-]+)\b/g;
var DATE_KEYS = ["created", "started", "completed", "decided", "closed"];
var up3 = (s) => s ? s.toUpperCase() : null;
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
    project: { name: basename2(store.ws.root), branch: currentBranch(), today: today() },
    settings: store.settings(),
    focus: all.focus || null,
    docs,
    edges: edges(docs),
    spend: store.ledger.spend(),
    next: nextLines(store),
    check: findings(store)
  };
}
function toDoc(store, d, kind, all) {
  const status2 = kind === "item" ? itemStatus(d, all.plans) : d.get("status") ?? "";
  const tasks = kind === "plan" ? d.tasks() : kind === "idea" ? d.checklist("Success criteria") : [];
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
    tasks: tasks.length || kind === "plan" ? { done: tasks.filter(([x]) => x).length, total: tasks.length } : null,
    gate: gate(store, d, kind, status2),
    source: d.source,
    path: d.path ? store.rel(d.path) : null,
    sections: sections(d.text)
  };
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
var knowledgeBody = (text) => stripComments(body(text)).replace(/^# .*\n/m, "").trim();
function owner(c) {
  return c ? { actor: c.actor, run: c.run, since: c.ts } : null;
}
function gate(store, d, kind, status2) {
  if (kind === "plan" && (status2 === "draft" || status2 === "ready")) return readinessProblems(store, d);
  if (kind === "item" && status2 === "new") return triageProblems(d);
  if (kind === "idea" && status2 !== "decided" && status2 !== "killed") return decisionProblems(d);
  return null;
}
function body(text) {
  return text.replace(/^---\n[\s\S]*?\n---\n/, "");
}
var PLACEHOLDER = /^\s*(?:-|- \[ \]|1\.)\s*$/;
function sections(text) {
  return splitSections(body(text))[1].map(([heading, md]) => ({
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
    const text = d.sections.map((s) => s.markdown).join("\n");
    for (const id of new Set(text.match(ID_RE) ?? [])) {
      if (!linked.has(`${d.id}>${id}`)) add(d.id, id, "mentions");
    }
  }
  return out;
}

// src/commands/export.ts
var DATA_SLOT = '<script id="graph" type="application/json">null</script>';
var UI_FILE = "ui.html";
function embed(graph) {
  return JSON.stringify(graph).replace(/</g, "\\u003c");
}
function renderHtmlShell(store) {
  const shell = store.ws.read(join6(SCRIPT_DIR, UI_FILE));
  if (shell === null || !shell.includes(DATA_SLOT)) {
    fail(`The UI bundle (${UI_FILE}) is missing next to crew.mjs. Re-run \`crew.mjs init\` from the plugin.`);
  }
  return shell;
}
function renderHtml(store, graph) {
  return renderHtmlShell(store).replace(DATA_SLOT, () => `<script id="graph" type="application/json">${embed(graph)}</script>`);
}
function exportGraph(store, format, out) {
  const graph = buildGraph(store);
  if (format === "json") {
    const text = `${JSON.stringify(graph, null, 2)}
`;
    if (!out) return store.say(text.trimEnd());
    store.ws.write(resolve4(out), text);
    return store.say(`Wrote ${store.rel(resolve4(out))}`);
  }
  const path = out ? resolve4(out) : join6(store.dir, "view", "index.html");
  if (!out) store.ws.write(join6(store.dir, "view", ".gitignore"), "# generated by `crew.mjs export`\n*\n");
  store.ws.write(path, renderHtml(store, graph));
  store.say(`Wrote ${store.rel(path)} \u2014 open it in a browser (it works offline; re-run export to refresh)`);
}

// src/commands/planning.ts
function init(store) {
  for (const d of [...Object.values(store.dirs), store.knowledgeDir, join7(store.dir, "drafts")]) {
    const keep = join7(d, ".gitkeep");
    if (!store.ws.isFile(keep)) store.ws.write(keep, "");
  }
  vendor(store);
  const readme = join7(store.dir, "README.md");
  const model = store.ws.read(join7(SKILL_DIR, "references", "model.md"));
  if (!store.ws.isFile(readme) && model !== null) store.ws.write(readme, model);
  store.say(`Initialized ${store.rel(store.dir)}/`);
}
function vendor(store) {
  const bin = join7(store.dir, "bin");
  if (resolve5(SCRIPT_DIR) === resolve5(bin)) return;
  store.ws.write(join7(bin, "crew.mjs"), readFileSync4(SCRIPT_FILE, "utf8"), 493);
  const ui = store.ws.read(join7(SCRIPT_DIR, UI_FILE));
  if (ui !== null) store.ws.write(join7(bin, UI_FILE), ui);
  const templates = join7(store.dir, "templates");
  for (const name of [...TEMPLATE_NAMES]) store.ws.write(join7(templates, name), store.ws.read(join7(SKILL_DIR, "templates", name)));
  const guide = store.ws.read(join7(SKILL_DIR, "references", "writing-guide.md"));
  if (guide !== null) store.ws.write(join7(templates, "writing-guide.md"), guide);
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
  store.writeNew(doc, join7(store.dirs.goal, `${eid}-${slugify(title)}.md`));
  breakdownToItems(store, doc);
  store.consume(draftFile, keep);
}
function newPlan(store, title, draftPath, o = {}) {
  store.require();
  const [draftFile, draft] = store.readDraft(draftPath, "plan");
  const goal = store.checkRef(o.goal, "goal");
  const deps = checkDeps(store, idList(o.depends));
  const linked = idList(o.items);
  const items2 = checkLinkable(store, linked);
  const touches = (o.touches ?? "").split(",").map((t) => t.trim()).filter(Boolean);
  const pid = store.nextId("P", "plan");
  const slug = slugify(title);
  const doc = store.build("plan.md", draft, {
    id: pid,
    title,
    goal,
    branch: `plan/${pid}-${slug}`,
    depends_on: deps.join(", "),
    items: linked.join(", "),
    touches: touches.join(", ")
  });
  requireSections(doc, "plan");
  store.writeNew(doc, join7(store.dirs.plan, `${pid}-${slug}.md`));
  for (const i of linked) {
    items2.get(i).set("plan", pid);
    items2.get(i).save();
    store.say(`${i} \u2192 ${pid}`);
  }
  if (goal && !linked.length) hintUnplanned(store, goal, items2);
  store.consume(draftFile, o.keep);
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

// src/commands/migrate.ts
var DROPPED = /^(bin|templates|view)\/|^(ROADMAP|BACKLOG|STATUS|README)\.md$/;
var ARCHIVED = /^(milestones|sprints|releases)\/|^(project-plan|raid)\.md$/;
var DOCS = { epics: "goals", items: "items", plans: "plans" };
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
  return readdirSync3(dir, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(join8(dir, e.name), `${prefix}${e.name}/`) : [`${prefix}${e.name}`]);
}
function renamed(text) {
  return text.replace(/\bEP-(\d+)/g, "G-$1").replace(/\.project\//g, ".crew/").replace(/\btracker\.mjs\b/g, "crew.mjs").replace(/project-kit:tracker/g, "crew:hub");
}
function leanDoc(text, kind) {
  let t = renamed(text).replace(/^epic:/m, "goal:").replace(/^(points|milestone):.*\n/gm, "");
  if (kind === "plans" && !/^touches:/m.test(t)) t = t.replace(/^(depends_on:.*)$/m, "$1\ntouches:");
  return t;
}
function migrate(store) {
  const root = store.ws.root, old = join8(root, ".project");
  if (!existsSync5(old) || !statSync4(old).isDirectory()) fail("No .project/ directory to migrate.");
  if (existsSync5(store.dir)) fail(`${store.rel(store.dir)}/ already exists \u2014 move it aside first; nothing was changed.`);
  const files2 = walk(old);
  const read = (rel) => store.ws.read(join8(old, rel)) ?? "";
  const exitCriteria = milestoneCriteria(files2.filter((f) => f.startsWith("milestones/")).map(read));
  let counts = { docs: 0, archived: 0, knowledge: 0, issues: 0, drafted: 0 };
  for (const rel of files2) {
    if (DROPPED.test(rel) || rel.endsWith(".gitkeep")) continue;
    const [dir, name] = [rel.split("/")[0], rel.split("/").pop()];
    if (ARCHIVED.test(rel)) {
      store.ws.write(join8(store.dir, "archive", rel), renamed(read(rel)));
      counts.archived++;
    } else if (DOCS[dir] && name.endsWith(".md")) {
      const doc = Doc.parse(leanDoc(read(rel), dir));
      if (dir === "epics") addExitCriteria(doc, Doc.parse(read(rel)).get("milestone"), exitCriteria);
      if (dir === "plans" && doc.get("status") === "ready" && !doc.touches().length) {
        doc.set("status", "draft");
        doc.appendLog("status ready \u2192 draft \u2014 migrated to crew: declare `touches:` before moving it back to ready");
        counts.drafted++;
      }
      store.ws.write(join8(store.dir, DOCS[dir], name.replace(/^EP-/, "G-")), `${doc.text.trimEnd()}
`);
      counts.docs++;
    } else if (rel === "config.yaml") {
      store.ws.write(join8(store.dir, rel), renamed(read(rel)).replace(/^(\s+)tracker:/m, "$1hub:"));
    } else {
      store.ws.write(join8(store.dir, rel), renamed(read(rel)));
    }
  }
  if (files2.includes("project-plan.md")) {
    const config = join8(store.dir, "config.yaml");
    store.ws.write(config, hubSettings(store.ws.read(config) ?? "", read("project-plan.md")));
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
  const stale = OLD_REFS.filter((f) => /\.project\/|tracker\.mjs/.test(store.ws.read(join8(root, f)) ?? ""));
  if (stale.length) {
    store.say(`next: these still mention .project/ or tracker.mjs \u2014 re-render them (/crew:guidelines --refresh, /crew:git-setup): ${stale.join(", ")}`);
  }
}
function milestoneCriteria(texts) {
  const out = /* @__PURE__ */ new Map();
  for (const text of texts) {
    const m = Doc.parse(text);
    if (m.id) out.set(m.id.toUpperCase(), m.checklist("Exit criteria").filter(([done]) => !done).map(([, c]) => c));
  }
  return out;
}
function addExitCriteria(goal, milestone, criteria2) {
  const mid = (milestone ?? "").toUpperCase();
  for (const c of criteria2.get(mid) ?? []) goal.appendTo("Acceptance criteria", `- [ ] ${c} (from ${mid} exit criteria)`);
  criteria2.delete(mid);
}
function hubSettings(config, projectPlan) {
  const wip = projectPlan ? Doc.parse(projectPlan).get("wip_limit") : null;
  if (!wip || /^hub:/m.test(config)) return config;
  return `${config.trimEnd()}${config.trim() ? "\n\n" : ""}hub:                    # crew hub settings
  wip_limit: ${wip}
`;
}
function raid(store, text) {
  const doc = Doc.parse(renamed(text));
  let knowledge2 = 0, issues = 0;
  for (const [section, type] of RAID_TYPES) {
    for (const row of mdTable(doc.section(section))) {
      const title = row.decision || row.assumption || row.risk || Object.values(row).find((v) => v && !/^[A-Z]+-?\d+$/.test(v)) || "";
      if (!title) continue;
      const fields = Object.entries(row).filter(([, v]) => v).map(([k, v]) => `- **${k}:** ${v}`).join("\n");
      const id = knowledgeId(title, (k) => store.ws.isFile(join8(store.knowledgeDir, `${k}.md`)));
      const level = (v) => (v ?? "").trim().slice(0, 1).toUpperCase();
      store.ws.write(join8(store.knowledgeDir, `${id}.md`), entryText({
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

// src/server.ts
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync as existsSync6, watch } from "node:fs";
import { createServer } from "node:http";
import { join as join9 } from "node:path";
var str = (b, k) => typeof b[k] === "string" && b[k] ? b[k] : void 0;
var ACTIONS = {
  move: (s, b) => {
    move(s, str(b, "id") ?? fail("id is required"), str(b, "status") ?? fail("status is required"), str(b, "note"));
  },
  log: (s, b) => log(s, (str(b, "id") ?? fail("id is required")).toUpperCase(), str(b, "text") ?? fail("text is required")),
  triage: (s, b) => triage(s, (str(b, "id") ?? fail("id is required")).toUpperCase(), {
    priority: str(b, "priority"),
    severity: str(b, "severity"),
    goal: str(b, "goal")
  }),
  focus: (s, b) => setFocus(s, str(b, "goal") ?? fail("goal is required"))
};
function runAction(open, name, body2) {
  const action = ACTIONS[name];
  if (!action) return { status: 404, output: [], error: `Unknown action '${name}'.` };
  const store = open();
  try {
    action(store, body2);
    store.ws.flush();
    return { status: 200, output: store.ws.output };
  } catch (e) {
    if (!(e instanceof HubError)) throw e;
    return { status: 400, output: store.ws.output, error: e.message };
  }
}
function serve(store, o) {
  store.require();
  const token = randomBytes(18).toString("base64url");
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
    if (req.method === "GET" && path === "/api/graph") return send(res, 200, buildGraph(open()));
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
        if (r.status === 200) notify();
      }, (e) => send(res, 400, { error: e.message }));
    }
    send(res, 404, { error: "Not found." });
  }
  let timer = null;
  function notify() {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      for (const c of clients) c.write("event: change\ndata: {}\n\n");
    }, 150);
  }
  const watchers = [store.dir, join9(store.ws.root, ".git", "refs"), join9(store.ws.root, ".git", "HEAD")].filter((p) => existsSync6(p)).map((p) => watch(p, { recursive: !p.endsWith("HEAD") }, (_, file) => {
    if (!String(file ?? "").startsWith("view")) notify();
  }));
  return new Promise((resolve6, reject) => {
    const listen = (port, tries) => {
      server.once("error", (e) => {
        if (e.code === "EADDRINUSE" && tries > 0) listen(port + 1, tries - 1);
        else reject(e);
      });
      server.listen(port, "127.0.0.1", () => {
        const actual = server.address().port;
        hosts = /* @__PURE__ */ new Set([`127.0.0.1:${actual}`, `localhost:${actual}`]);
        const url = `http://127.0.0.1:${actual}/`;
        if (o.open) openBrowser(url);
        resolve6({ url, close: () => {
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
  return new Promise((resolve6, reject) => {
    let raw = "";
    req.on("data", (c) => {
      raw += c;
      if (raw.length > 64e3) reject(new Error("Request too large."));
    });
    req.on("end", () => {
      try {
        const v = JSON.parse(raw || "{}");
        resolve6(v && typeof v === "object" && !Array.isArray(v) ? v : {});
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

// src/commands/reports.ts
var TOP = 5;
var PLAN_HEADER = ["| Plan | Title | Goal | Status | Tasks | Owner |", "|---|---|---|---|---|---|"];
function status(store, write) {
  store.require();
  const goals2 = store.goals(), items2 = store.items(), plans2 = store.plans(true), focus = store.focus();
  const lines = [`# Status \u2014 ${today()}`, "", "_Generated by `crew.mjs status`. Do not edit by hand._", ""];
  lines.push("## Idea and focus", "", ...ideaLines(store, goals2, plans2, items2, focus), "");
  const claims = store.ledger.claims();
  lines.push("## Now", "", ...planTable(byStatus(plans2, ["in-progress", "in-review"]), plans2, items2, claims), "");
  lines.push("## Blocked", "", ...blocked(plans2), "");
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
  const text = `${lines.join("\n").trimEnd()}
`;
  if (!write) return store.say(text.trimEnd());
  store.ws.write(`${store.dir}/STATUS.md`, text);
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
  const outcome = stripComments(g.section("Outcome")).trim().split("\n")[0];
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
    ...top.map((i, n) => `| ${n + 1} | ${i.id} | ${i.get("title")} | ${i.get("priority") || "\u2014"} | ${i.get("goal") || "\u2014"} |`)
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

// src/commands/knowledge.ts
import { join as join10 } from "node:path";
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
  const id = knowledgeId(title, (k) => store.ws.isFile(join10(store.knowledgeDir, `${k}.md`)));
  const branch = /^plan\/(P-\d+)/.exec(currentBranch() ?? "")?.[1];
  const text = entryText({
    id,
    type,
    title,
    why,
    risk,
    supersedes,
    tier: o.candidate ? TIERS[1] : TIERS[0],
    scope: (o.scope ?? "").split(",").map((s) => s.trim()).filter(Boolean),
    source: o.source?.toUpperCase() ?? branch ?? ""
  });
  store.ws.write(join10(store.knowledgeDir, `${id}.md`), text);
  if (draftFile) store.consume(draftFile, o.keep);
  store.ledger.record("learn", id, { kind: type, title, ...supersedes ? { supersedes } : {} });
  store.say(store.rel(join10(store.knowledgeDir, `${id}.md`)));
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

// src/commands/ledger.ts
var DETAIL = {
  claim: (e) => `branch ${e.branch ?? "?"}${e.force ? " (forced)" : ""}`,
  release: (e) => String(e.reason ?? ""),
  move: (e) => `${e.from} \u2192 ${e.to}${e.note ? ` \u2014 ${e.note}` : ""}`,
  log: (e) => String(e.text ?? ""),
  learn: (e) => `${e.kind}: ${e.title}${e.supersedes ? ` (supersedes ${e.supersedes})` : ""}`,
  checkpoint: (e) => `at ${e.step}${e.sha ? ` (${String(e.sha).slice(0, 7)})` : ""}` + (e.verify ?? []).map((v) => ` ${v.ok ? "\u2713" : "\u2717"} ${v.cmd}`).join("") + (e.attempt ? ` \u2014 tried: ${e.attempt.what}` : ""),
  usage: (e) => `${e.tokens_in} in / ${e.tokens_out} out tokens, $${Number(e.cost ?? 0).toFixed(2)}${e.model ? ` (${e.model})` : ""}`
};
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
    store.say(`${e.ts.slice(0, 16).replace("T", " ")}  ${e.type.padEnd(7)}  ${(e.ref ?? "\u2014").padEnd(9)}  ${e.actor} (${e.run})  ${DETAIL[e.type](e)}`);
  }
  const claims = [...store.ledger.claims(all).values()];
  if (!ref && !o.type && claims.length) {
    store.say(`claims: ${claims.map((c) => `${c.ref} ${c.actor}`).join(", ")}`);
  }
}

// src/cli.ts
var USAGE = `crew hub: the team's shared context \u2014 the idea, goals, backlog items, plans and tasks.

Nothing is created as an empty skeleton: write the content first (sections as in the templates)
to a draft file, then create the tracked document from it with --from.

Commands:
  init                                          create the .crew/ structure
  migrate                                       convert a project-kit .project/ directory into .crew/
  new-idea TITLE --from DRAFT                   the project's idea (problem, outcome, success criteria)
  new-goal TITLE --from DRAFT [--priority P1]   an outcome; each Breakdown line becomes a FEAT item
  focus G-###                                   the goal the team works toward now
  new-item feat|bug|chore|spike TITLE (--from DRAFT | --why TEXT) [--goal] [--priority] [--severity]
  triage ID [--priority P1] [--severity S2] [--goal G-001] [--approved-by NAME]
  triage ID --reject wontfix|duplicate --note TXT
  new-plan TITLE --from DRAFT [--goal] [--items FEAT-001,BUG-002] [--touches "src/a/**, docs/b.md"] [--depends P-002]
  start PLAN_ID \xB7 move ID STATUS [--note] \xB7 log ID TEXT      (ID: IDEA, G-###, P-###, FEAT/BUG/CHORE/SPIKE-###)
           start/move/triage take --approved-by NAME: a human approving a gated or reserved step (never an agent)
  policy show [--role R] [--team T] [--json] \xB7 policy check      the effective policy and where each value comes from
  release PLAN_ID [--note TXT] [--force]        give up a claim (another run's claim needs --force)
  usage [--tokens-in N] [--tokens-out N] [--cost USD] [--model M] [--ref ID]   record what a run used
  ledger [--ref ID] [--type T] [--limit 20] [--json]   the shared event log (who/what/when) and live claims
  learn decision|learning|gotcha|convention|risk FACT (--why TEXT | --from DRAFT) [--scope "src/a/**, b.md"]
        [--source P-###] [--supersedes K-\u2026] [--candidate] [--likelihood H|M|L --impact H|M|L --owner WHO]
  recall [--paths a,b] [--plan P-###] [--topic WORDS] [--type T] [--all] [--json]   the knowledge that applies
  checkpoint [P-###] [--step T3] [--run CMD | --verify CMD --result pass|fail] [--ac 1,2|all] [--output TXT]
             [--attempt WHAT --why WHY] [--note TXT] [--auto]   record where the work is (the plan of this branch by default)
  resume [P-###] [--json] \xB7 handoff [P-###]     where the work stopped vs git now \xB7 write it into the plan's Handoff
  next \xB7 current \xB7 check \xB7 status [--write]
  export [--json] [--out FILE]                  interactive HTML view (.crew/view/index.html) or the graph as JSON
  ui [--port 8765] [--no-open]                  serve the view live on 127.0.0.1 (updates as files change)
`;
var DRAFTED = { str: ["from"], flag: ["keep-draft"], required: ["from"] };
var COMMANDS = {
  init: { pos: [], run: (s) => init(s) },
  migrate: { pos: [], run: (s) => migrate(s) },
  "new-idea": {
    pos: ["title"],
    ...DRAFTED,
    run: (s, a) => newIdea(s, a.pos[0], str2(a, "from"), !!a.opt["keep-draft"])
  },
  "new-goal": {
    pos: ["title"],
    ...DRAFTED,
    str: ["from", "priority"],
    run: (s, a) => newGoal(s, a.pos[0], str2(a, "from"), str2(a, "priority"), !!a.opt["keep-draft"])
  },
  focus: { pos: ["goal"], run: (s, a) => setFocus(s, a.pos[0]) },
  "new-item": {
    pos: ["type", "title"],
    str: ["from", "why", "goal", "priority", "severity"],
    flag: ["keep-draft"],
    run: (s, a) => newItem(s, a.pos[0], a.pos[1], str2(a, "from"), str2(a, "why"), {
      goal: str2(a, "goal"),
      priority: str2(a, "priority"),
      severity: str2(a, "severity"),
      keep: !!a.opt["keep-draft"]
    })
  },
  triage: {
    pos: ["id"],
    str: ["priority", "severity", "goal", "note", "reject", "approved-by"],
    choices: { reject: ["duplicate", "wontfix"] },
    run: (s, a) => triage(s, a.pos[0].toUpperCase(), {
      priority: str2(a, "priority"),
      severity: str2(a, "severity"),
      goal: str2(a, "goal"),
      reject: str2(a, "reject"),
      note: str2(a, "note"),
      approvedBy: str2(a, "approved-by")
    })
  },
  "new-plan": {
    pos: ["title"],
    ...DRAFTED,
    str: ["from", "goal", "depends", "items", "touches"],
    run: (s, a) => newPlan(s, a.pos[0], str2(a, "from"), {
      goal: str2(a, "goal"),
      depends: str2(a, "depends"),
      items: str2(a, "items"),
      touches: str2(a, "touches"),
      keep: !!a.opt["keep-draft"]
    })
  },
  start: {
    pos: ["id"],
    str: ["approved-by"],
    flag: ["force"],
    run: (s, a) => start(s, a.pos[0].toUpperCase(), !!a.opt.force, str2(a, "approved-by"))
  },
  move: {
    pos: ["id", "status"],
    str: ["note", "approved-by"],
    flag: ["force"],
    run: (s, a) => {
      move(s, a.pos[0], a.pos[1], str2(a, "note"), !!a.opt.force, str2(a, "approved-by"));
    }
  },
  learn: {
    pos: ["type", "title"],
    str: ["why", "from", "scope", "source", "supersedes", "likelihood", "impact", "owner"],
    flag: ["candidate", "keep-draft"],
    run: (s, a) => {
      learn(s, a.pos[0], a.pos[1], {
        why: str2(a, "why"),
        from: str2(a, "from"),
        scope: str2(a, "scope"),
        source: str2(a, "source"),
        supersedes: str2(a, "supersedes"),
        candidate: !!a.opt.candidate,
        likelihood: str2(a, "likelihood"),
        impact: str2(a, "impact"),
        owner: str2(a, "owner"),
        keep: !!a.opt["keep-draft"]
      });
    }
  },
  recall: {
    pos: [],
    str: ["paths", "plan", "topic", "type"],
    flag: ["all", "json"],
    run: (s, a) => recallCmd(s, {
      paths: str2(a, "paths"),
      plan: str2(a, "plan"),
      topic: str2(a, "topic"),
      type: str2(a, "type"),
      all: !!a.opt.all,
      json: !!a.opt.json
    })
  },
  checkpoint: {
    pos: [],
    rest: true,
    str: ["step", "run", "verify", "result", "ac", "output", "attempt", "why", "note"],
    flag: ["auto"],
    choices: { result: ["pass", "fail"] },
    run: (s, a) => checkpoint(s, a.pos[0], {
      step: str2(a, "step"),
      run: str2(a, "run"),
      verify: str2(a, "verify"),
      result: str2(a, "result"),
      ac: str2(a, "ac"),
      output: str2(a, "output"),
      attempt: str2(a, "attempt"),
      why: str2(a, "why"),
      note: str2(a, "note"),
      auto: !!a.opt.auto
    })
  },
  resume: { pos: [], rest: true, flag: ["json"], run: (s, a) => resume(s, a.pos[0], !!a.opt.json) },
  handoff: { pos: [], rest: true, run: (s, a) => handoff(s, a.pos[0]) },
  policy: {
    pos: ["action"],
    str: ["role", "team"],
    flag: ["json"],
    choices: { action: ["show", "check"] },
    run: (s, a) => a.pos[0] === "show" ? policyShow(s, str2(a, "role"), str2(a, "team"), !!a.opt.json) : policyCheck(s)
  },
  log: { pos: ["id", "text"], run: (s, a) => log(s, a.pos[0].toUpperCase(), a.pos[1]) },
  release: { pos: ["id"], str: ["note"], flag: ["force"], run: (s, a) => release(s, a.pos[0], str2(a, "note"), !!a.opt.force) },
  usage: {
    pos: [],
    str: ["cost", "model", "ref"],
    int: ["tokens-in", "tokens-out"],
    run: (s, a) => usage(s, {
      tokensIn: a.num["tokens-in"],
      tokensOut: a.num["tokens-out"],
      cost: str2(a, "cost") === void 0 ? void 0 : Number(str2(a, "cost")),
      model: str2(a, "model"),
      ref: str2(a, "ref")
    })
  },
  ledger: {
    pos: [],
    str: ["ref", "type"],
    int: ["limit"],
    flag: ["json"],
    run: (s, a) => showLedger(s, { ref: str2(a, "ref"), type: str2(a, "type"), limit: a.num.limit, json: !!a.opt.json })
  },
  current: { pos: [], run: (s) => current(s) },
  next: { pos: [], run: (s) => nextStep(s) },
  check: { pos: [], run: (s) => check(s) },
  status: { pos: [], flag: ["write"], run: (s, a) => status(s, !!a.opt.write) },
  export: {
    pos: [],
    str: ["out"],
    flag: ["json"],
    run: (s, a) => exportGraph(s, a.opt.json ? "json" : "html", str2(a, "out"))
  },
  ui: { pos: [], int: ["port"], flag: ["no-open"], run: (s, a) => {
    serve(s, { port: a.num.port ?? 8765, open: !a.opt["no-open"] }).then(
      ({ url }) => process.stdout.write(`Hub UI at ${url} \u2014 live while this runs (Ctrl-C to stop)
`),
      (e) => {
        process.stderr.write(`${e.message}
`);
        process.exit(1);
      }
    );
  } }
};
function str2(a, key) {
  const v = a.opt[key];
  return typeof v === "string" ? v : void 0;
}
var UsageError = class extends Error {
};
function parse3(argv) {
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
  const num = {};
  for (const o of spec.int ?? []) {
    const v = opt[o];
    if (typeof v !== "string") continue;
    if (!/^[+-]?\d+$/.test(v.trim())) throw new UsageError(`--${o}: invalid int value '${v}'`);
    num[o] = parseInt(v, 10);
  }
  for (const [name, allowed] of Object.entries(spec.choices ?? {})) {
    const i = spec.pos.indexOf(name);
    const v = i >= 0 ? pos[i] : opt[name];
    if (typeof v === "string" && !allowed.includes(v)) {
      throw new UsageError(`${i >= 0 ? name : `--${name}`}: invalid choice '${v}' (choose from ${allowed.join(", ")})`);
    }
  }
  return { cmd, spec, args: { pos, opt, num } };
}
function main(argv, open = () => Store.open()) {
  if (!argv.length || argv[0] === "--help" || argv[0] === "-h" || argv[0] === "help") {
    process.stdout.write(USAGE);
    return argv.length ? 0 : 2;
  }
  let parsed;
  try {
    parsed = parse3(argv);
  } catch (e) {
    process.stderr.write(`usage: crew.mjs <command> \u2026  (crew.mjs --help)
crew.mjs: error: ${e.message}
`);
    return 2;
  }
  const store = open();
  let code = 0;
  try {
    code = parsed.spec.run(store, parsed.args) ?? 0;
    store.ws.flush();
  } catch (e) {
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

// src/main.ts
var major = parseInt(process.versions.node.split(".")[0], 10);
if (major < 20) {
  process.stderr.write(`crew hub needs Node.js \u2265 20 (found ${process.versions.node}).
`);
  process.exit(1);
}
process.exitCode = main(process.argv.slice(2));
