! function(window, exports) {
    function is_function(obj) {
        return "[object Function]" === _toString.call(obj)
    }

    function is_array(obj) {
        return "[object Array]" === _toString.call(obj)
    }

    function is_global(obj) {
        return "setInterval" in obj
    }

    function clone(obj) {
        function NewObj() {}
        return NewObj.prototype = obj, new NewObj
    }(!exports || window.window) && (exports = {});
    var _latest_mod, _scope, _toString = Object.prototype.toString,
        _RE_PLUGIN = /(.*)!(.+)/,
        _RE_DEPS = /\Wrequire\((['"]).+?\1\)/g,
        _RE_SUFFIX = /\.(js|json)$/,
        _RE_RELPATH = /^\.+?\/.+/,
        _RE_DOT = /(^|\/)\.\//g,
        _RE_DOTS = /[^\/\.]+\/\.\.\//,
        _RE_ALIAS_IN_MID = /^([\w\-]+)\//,
        _builtin_mods = {
            require: 1,
            exports: 1,
            module: 1,
            host: 1,
            finish: 1
        },
        _config = {
            mods: {}
        },
        _scripts = {},
        _delays = {},
        _refers = {},
        _waitings = {},
        _resets = {},
        forEach = Array.prototype.forEach || function(fn, sc) {
            for (var i = 0, l = this.length; l > i; i++) i in this && fn.call(sc, this[i], i, this)
        };
    exports.define = function(name, deps, block) {
        var is_remote = "string" == typeof block;
        block || (deps ? is_array(deps) ? block = exports.filesuffix(exports.realname(exports.basename(name))) : (block = deps, deps = null) : (block = name, name = ""), "string" != typeof name ? (deps = name, name = "") : (is_remote = "string" == typeof block, is_remote || deps || (deps = exports.seek(block)))), name = name && exports.realname(name);
        var mod = name && _config.mods[name];
        if (_config.debug || !mod || !mod.name || !(is_remote && 2 == mod.loaded || mod.exports)) {
            is_remote && _config.enable_ozma && (deps = null);
            var host = is_global(this) ? this : window;
            if (mod = _config.mods[name] = {
                    name: name,
                    url: mod && mod.url,
                    host: host,
                    deps: deps || []
                }, "" === name && (_latest_mod = mod), "string" != typeof block) mod.block = block, mod.loaded = 2;
            else {
                var alias = _config.aliases;
                alias && (block = block.replace(/\{(\w+)\}/g, function(e1, e2) {
                    return alias[e2] || ""
                })), mod.url = block
            }
            mod.block && !is_function(mod.block) && (mod.exports = block)
        }
    }, exports.define.amd = {}, exports.require = function(deps, block, _self_mod) {
        if ("string" == typeof deps) {
            if (!block) return deps = exports.realname(exports.basename(deps, _scope)), (_config.mods[deps] || {}).exports;
            deps = [deps]
        } else block || (block = deps, deps = exports.seek(block));
        var host = is_global(this) ? this : window;
        _self_mod || (_self_mod = {
            url: _scope && _scope.url
        });
        for (var m, remotes = 0, list = exports.scan.call(host, deps, _self_mod), i = 0, l = list.length; l > i; i++) m = list[i], m.is_reset && (m = _config.mods[m.name]), m.url && 2 !== m.loaded && (remotes++, m.loaded = 1, exports.fetch(m, function() {
            this.loaded = 2;
            var lm = _latest_mod;
            lm && (lm.name = this.name, lm.url = this.url, _config.mods[this.name] = lm, _latest_mod = null), --remotes <= 0 && exports.require.call(host, deps, block, _self_mod)
        }));
        remotes || (_self_mod.deps = deps, _self_mod.host = host, _self_mod.block = block, setTimeout(function() {
            exports.tidy(deps, _self_mod), list.push(_self_mod), exports.exec(list.reverse())
        }, 0))
    }, exports.require.config = function(opt) {
        for (var i in opt)
            if ("aliases" === i) {
                _config[i] || (_config[i] = {});
                for (var j in opt[i]) _config[i][j] = opt[i][j];
                var mods = _config.mods;
                for (var k in mods) mods[k].name = exports.realname(k), mods[mods[k].name] = mods[k]
            } else _config[i] = opt[i]
    }, exports.exec = function(list) {
        for (var mod, mid, tid, result, isAsync, deps, depObjs, exportObj, moduleObj, rmod, wt = _waitings; mod = list.pop();)
            if (mod.is_reset ? (rmod = clone(_config.mods[mod.name]), rmod.host = mod.host, rmod.newname = mod.newname, mod = rmod, _resets[mod.newname] || (_resets[mod.newname] = []), _resets[mod.newname].push(mod), mod.exports = void 0) : mod.name && (mod = _config.mods[mod.name] || mod), mod.block && (mod.running || void 0 === mod.exports)) {
                depObjs = [], exportObj = {}, moduleObj = {
                    id: mod.name,
                    filename: mod.url,
                    exports: exportObj
                }, deps = mod.deps.slice(), deps[mod.block.hiddenDeps ? "unshift" : "push"]("require", "exports", "module");
                for (var i = 0, l = deps.length; l > i; i++) switch (mid = deps[i]) {
                    case "require":
                        depObjs.push(exports.require);
                        break;
                    case "exports":
                        depObjs.push(exportObj);
                        break;
                    case "module":
                        depObjs.push(moduleObj);
                        break;
                    case "host":
                        depObjs.push(mod.host);
                        break;
                    case "finish":
                        tid = mod.name, wt[tid] ? wt[tid].push(list) : wt[tid] = [list], depObjs.push(function(result) {
                            setTimeout(function() {
                                void 0 !== result && (mod.exports = result), wt[tid] && (forEach.call(wt[tid], function(list) {
                                    this(list)
                                }, exports.exec), delete wt[tid], mod.running = 0)
                            }, 0)
                        }), isAsync = 1;
                        break;
                    default:
                        depObjs.push(((_resets[mid] || []).pop() || _config.mods[exports.realname(mid)] || {}).exports)
                }
                if (!mod.running) {
                    _scope = mod, result = mod.block.apply(mod.host, depObjs) || null, _scope = !1, exportObj = moduleObj.exports, mod.exports = void 0 !== result ? result : exportObj;
                    for (var v in exportObj) {
                        v && (mod.exports = exportObj);
                        break
                    }
                }
                if (isAsync) return mod.running = 1, !1
            }
        return !0
    }, exports.fetch = function(m, cb) {
        var url = m.url,
            observers = _scripts[url];
        if (observers) 1 === observers ? cb.call(m) : observers.push([cb, m]);
        else {
            var mname = m.name,
                delays = _delays;
            if (m.deps && m.deps.length && 1 !== delays[mname]) {
                if (delays[mname] = [m.deps.length, cb], forEach.call(m.deps, function(dep) {
                        var d = _config.mods[exports.realname(dep)];
                        1 !== this[dep] && d.url && 2 !== d.loaded ? (this[dep] || (this[dep] = []), this[dep].push(m)) : delays[mname][0] --
                    }, _refers), delays[mname][0] > 0) return;
                delays[mname] = 1
            }
            observers = _scripts[url] = [
                [cb, m]
            ];
            var true_url = /^\w+:\/\//.test(url) ? url : (_config.enable_ozma && _config.distUrl || _config.baseUrl || "") + (_config.enableAutoSuffix ? exports.namesuffix(url) : url);
            exports.load.call(m.host || window, true_url, function() {
                forEach.call(observers, function(args) {
                    args[0].call(args[1])
                }), _scripts[url] = 1, _refers[mname] && 1 !== _refers[mname] && (forEach.call(_refers[mname], function(dm) {
                    var b = this[dm.name];
                    --b[0] <= 0 && (this[dm.name] = 1, exports.fetch(dm, b[1]))
                }, delays), _refers[mname] = 1)
            })
        }
    }, exports.load = function(url, op) {
        var doc = is_global(this) ? this.document : window.document,
            s = doc.createElement("script");
        s.type = "text/javascript", s.async = "async", op ? is_function(op) && (op = {
            callback: op
        }) : op = {}, op.charset && (s.charset = op.charset), s.src = url;
        var h = doc.getElementsByTagName("head")[0];
        s.onload = s.onreadystatechange = function(__, isAbort) {
            (isAbort || !s.readyState || /loaded|complete/.test(s.readyState)) && (s.onload = s.onreadystatechange = null, h && s.parentNode && h.removeChild(s), s = void 0, !isAbort && op.callback && op.callback())
        }, h.insertBefore(s, h.firstChild)
    }, exports.scan = function(m, file_mod, list) {
        if (list = list || [], !m[0]) return list;
        var deps, history = list.history;
        if (history || (history = list.history = {}), m[1]) deps = m, m = !1;
        else {
            var truename, _mid = m[0],
                plugin = _RE_PLUGIN.exec(_mid);
            plugin && (_mid = plugin[2], plugin = plugin[1]);
            var mid = exports.realname(_mid);
            if (!_config.mods[mid] && !_builtin_mods[mid]) {
                var true_mid = exports.realname(exports.basename(_mid, file_mod));
                mid !== true_mid && (_config.mods[file_mod.url + ":" + mid] = true_mid, mid = true_mid), _config.mods[true_mid] || exports.define(true_mid, exports.filesuffix(true_mid))
            }
            if (m = file_mod = _config.mods[mid], !m) return list;
            if ("new" === plugin ? m = {
                    is_reset: !0,
                    deps: m.deps,
                    name: mid,
                    newname: plugin + "!" + mid,
                    host: this
                } : truename = m.name, history[truename]) return list;
            history[truename] ? deps = [] : (deps = m.deps || [], truename && (history[truename] = !0))
        }
        for (var i = deps.length - 1; i >= 0; i--) history[deps[i]] || exports.scan.call(this, [deps[i]], file_mod, list);
        return m && (exports.tidy(deps, m), list.push(m)), list
    }, exports.seek = function(block) {
        var hdeps = block.hiddenDeps || [];
        if (!block.hiddenDeps) {
            var code = block.toString(),
                h = null;
            for (hdeps = block.hiddenDeps = []; h = _RE_DEPS.exec(code);) hdeps.push(h[0].slice(10, -2))
        }
        return hdeps.slice()
    }, exports.tidy = function(deps, m) {
        forEach.call(deps.slice(), function(dep, i) {
            var true_mid = this[m.url + ":" + exports.realname(dep)];
            "string" == typeof true_mid && (deps[i] = true_mid)
        }, _config.mods)
    }, exports.namesuffix = function(file) {
        return file.replace(/(.+?)(_src.*)?(\.\w+)$/, function($0, $1, $2, $3) {
            return $1 + ($2 && "_combo" || "_pack") + $3
        })
    }, exports.filesuffix = function(mid) {
        return _RE_SUFFIX.test(mid) ? mid : mid + ".js"
    }, exports.realname = function(mid) {
        var alias = _config.aliases;
        return alias && (mid = mid.replace(_RE_ALIAS_IN_MID, function(e1, e2) {
            var path = alias[e2];
            return path && 0 !== mid.indexOf(path) ? path : e2 + "/"
        })), mid
    }, exports.basename = function(mid, file_mod) {
        var rel_path = _RE_RELPATH.exec(mid);
        return rel_path && file_mod && (mid = (file_mod.url || "").replace(/[^\/]+$/, "") + rel_path[0]), exports.resolvename(mid)
    }, exports.resolvename = function(url) {
        for (url = url.replace(_RE_DOT, "$1"); _RE_DOTS.test(url);) url = url.replace(_RE_DOTS, "/").replace(/(^|[^:])\/\/+/g, "$1/");
        return url.replace(/^\//, "")
    };
    var origin = {};
    for (var i in exports) origin[i] = exports[i];
    exports.origin = origin, exports.cfg = _config, window.oz = exports, window.define = exports.define, window.require = exports.require
}(this, "undefined" != typeof exports && exports), require.config({
        enable_ozma: !0
    }), define("mod/cookie", function() {
        function get(name) {
            var value = document.cookie.match(new RegExp("(?:\\s|^)" + name + "\\=([^;]*)"));
            return value ? decodeURIComponent(value[1]) : null
        }

        function set(name, value, options) {
            options = options || {};
            var date, expires, expiresGMTString, pair = name + "=" + encodeURIComponent(value),
                path = options.path ? "; path=" + options.path : "",
                domain = options.domain ? "; domain=" + options.domain : "",
                maxage = options["max-age"],
                secure = options.secure ? "; secure" : "";
            options.expires ? expiresGMTString = options.expires : maxage && (date = new Date, date.setTime(date.getTime() + 1e3 * maxage), expiresGMTString = date.toGMTString()), expiresGMTString && (expires = "; expires=" + expiresGMTString), document.cookie = [pair, expires, path, domain, secure].join("")
        }

        function remove(name) {
            set(name, "", {
                "max-age": 0
            })
        }
        var cookie = function(name, value, options) {
            return 1 === arguments.length ? get(name) : set(name, value, options)
        };
        return cookie.get = get, cookie.set = set, cookie.remove = remove, cookie
    }),
    /*!
     * jQuery JavaScript Library v1.11.1
     * http://jquery.com/
     *
     * Includes Sizzle.js
     * http://sizzlejs.com/
     *
     * Copyright 2005, 2014 jQuery Foundation, Inc. and other contributors
     * Released under the MIT license
     * http://jquery.org/license
     *
     * Date: 2014-05-01T17:42Z
     */
    function(global, factory) {
        "object" == typeof module && "object" == typeof module.exports ? module.exports = global.document ? factory(global, !0) : function(w) {
            if (!w.document) throw new Error("jQuery requires a window with a document");
            return factory(w)
        } : factory(global)
    }("undefined" != typeof window ? window : this, function(window, noGlobal) {
        function isArraylike(obj) {
            var length = obj.length,
                type = jQuery.type(obj);
            return "function" === type || jQuery.isWindow(obj) ? !1 : 1 === obj.nodeType && length ? !0 : "array" === type || 0 === length || "number" == typeof length && length > 0 && length - 1 in obj
        }

        function winnow(elements, qualifier, not) {
            if (jQuery.isFunction(qualifier)) return jQuery.grep(elements, function(elem, i) {
                return !!qualifier.call(elem, i, elem) !== not
            });
            if (qualifier.nodeType) return jQuery.grep(elements, function(elem) {
                return elem === qualifier !== not
            });
            if ("string" == typeof qualifier) {
                if (risSimple.test(qualifier)) return jQuery.filter(qualifier, elements, not);
                qualifier = jQuery.filter(qualifier, elements)
            }
            return jQuery.grep(elements, function(elem) {
                return jQuery.inArray(elem, qualifier) >= 0 !== not
            })
        }

        function sibling(cur, dir) {
            do cur = cur[dir]; while (cur && 1 !== cur.nodeType);
            return cur
        }

        function createOptions(options) {
            var object = optionsCache[options] = {};
            return jQuery.each(options.match(rnotwhite) || [], function(_, flag) {
                object[flag] = !0
            }), object
        }

        function detach() {
            document.addEventListener ? (document.removeEventListener("DOMContentLoaded", completed, !1), window.removeEventListener("load", completed, !1)) : (document.detachEvent("onreadystatechange", completed), window.detachEvent("onload", completed))
        }

        function completed() {
            (document.addEventListener || "load" === event.type || "complete" === document.readyState) && (detach(), jQuery.ready())
        }

        function dataAttr(elem, key, data) {
            if (void 0 === data && 1 === elem.nodeType) {
                var name = "data-" + key.replace(rmultiDash, "-$1").toLowerCase();
                if (data = elem.getAttribute(name), "string" == typeof data) {
                    try {
                        data = "true" === data ? !0 : "false" === data ? !1 : "null" === data ? null : +data + "" === data ? +data : rbrace.test(data) ? jQuery.parseJSON(data) : data
                    } catch (e) {}
                    jQuery.data(elem, key, data)
                } else data = void 0
            }
            return data
        }

        function isEmptyDataObject(obj) {
            var name;
            for (name in obj)
                if (("data" !== name || !jQuery.isEmptyObject(obj[name])) && "toJSON" !== name) return !1;
            return !0
        }

        function internalData(elem, name, data, pvt) {
            if (jQuery.acceptData(elem)) {
                var ret, thisCache, internalKey = jQuery.expando,
                    isNode = elem.nodeType,
                    cache = isNode ? jQuery.cache : elem,
                    id = isNode ? elem[internalKey] : elem[internalKey] && internalKey;
                if (id && cache[id] && (pvt || cache[id].data) || void 0 !== data || "string" != typeof name) return id || (id = isNode ? elem[internalKey] = deletedIds.pop() || jQuery.guid++ : internalKey), cache[id] || (cache[id] = isNode ? {} : {
                    toJSON: jQuery.noop
                }), ("object" == typeof name || "function" == typeof name) && (pvt ? cache[id] = jQuery.extend(cache[id], name) : cache[id].data = jQuery.extend(cache[id].data, name)), thisCache = cache[id], pvt || (thisCache.data || (thisCache.data = {}), thisCache = thisCache.data), void 0 !== data && (thisCache[jQuery.camelCase(name)] = data), "string" == typeof name ? (ret = thisCache[name], null == ret && (ret = thisCache[jQuery.camelCase(name)])) : ret = thisCache, ret
            }
        }

        function internalRemoveData(elem, name, pvt) {
            if (jQuery.acceptData(elem)) {
                var thisCache, i, isNode = elem.nodeType,
                    cache = isNode ? jQuery.cache : elem,
                    id = isNode ? elem[jQuery.expando] : jQuery.expando;
                if (cache[id]) {
                    if (name && (thisCache = pvt ? cache[id] : cache[id].data)) {
                        jQuery.isArray(name) ? name = name.concat(jQuery.map(name, jQuery.camelCase)) : name in thisCache ? name = [name] : (name = jQuery.camelCase(name), name = name in thisCache ? [name] : name.split(" ")), i = name.length;
                        for (; i--;) delete thisCache[name[i]];
                        if (pvt ? !isEmptyDataObject(thisCache) : !jQuery.isEmptyObject(thisCache)) return
                    }(pvt || (delete cache[id].data, isEmptyDataObject(cache[id]))) && (isNode ? jQuery.cleanData([elem], !0) : support.deleteExpando || cache != cache.window ? delete cache[id] : cache[id] = null)
                }
            }
        }

        function returnTrue() {
            return !0
        }

        function returnFalse() {
            return !1
        }

        function safeActiveElement() {
            try {
                return document.activeElement
            } catch (err) {}
        }

        function createSafeFragment(document) {
            var list = nodeNames.split("|"),
                safeFrag = document.createDocumentFragment();
            if (safeFrag.createElement)
                for (; list.length;) safeFrag.createElement(list.pop());
            return safeFrag
        }

        function getAll(context, tag) {
            var elems, elem, i = 0,
                found = typeof context.getElementsByTagName !== strundefined ? context.getElementsByTagName(tag || "*") : typeof context.querySelectorAll !== strundefined ? context.querySelectorAll(tag || "*") : void 0;
            if (!found)
                for (found = [], elems = context.childNodes || context; null != (elem = elems[i]); i++) !tag || jQuery.nodeName(elem, tag) ? found.push(elem) : jQuery.merge(found, getAll(elem, tag));
            return void 0 === tag || tag && jQuery.nodeName(context, tag) ? jQuery.merge([context], found) : found
        }

        function fixDefaultChecked(elem) {
            rcheckableType.test(elem.type) && (elem.defaultChecked = elem.checked)
        }

        function manipulationTarget(elem, content) {
            return jQuery.nodeName(elem, "table") && jQuery.nodeName(11 !== content.nodeType ? content : content.firstChild, "tr") ? elem.getElementsByTagName("tbody")[0] || elem.appendChild(elem.ownerDocument.createElement("tbody")) : elem
        }

        function disableScript(elem) {
            return elem.type = (null !== jQuery.find.attr(elem, "type")) + "/" + elem.type, elem
        }

        function restoreScript(elem) {
            var match = rscriptTypeMasked.exec(elem.type);
            return match ? elem.type = match[1] : elem.removeAttribute("type"), elem
        }

        function setGlobalEval(elems, refElements) {
            for (var elem, i = 0; null != (elem = elems[i]); i++) jQuery._data(elem, "globalEval", !refElements || jQuery._data(refElements[i], "globalEval"))
        }

        function cloneCopyEvent(src, dest) {
            if (1 === dest.nodeType && jQuery.hasData(src)) {
                var type, i, l, oldData = jQuery._data(src),
                    curData = jQuery._data(dest, oldData),
                    events = oldData.events;
                if (events) {
                    delete curData.handle, curData.events = {};
                    for (type in events)
                        for (i = 0, l = events[type].length; l > i; i++) jQuery.event.add(dest, type, events[type][i])
                }
                curData.data && (curData.data = jQuery.extend({}, curData.data))
            }
        }

        function fixCloneNodeIssues(src, dest) {
            var nodeName, e, data;
            if (1 === dest.nodeType) {
                if (nodeName = dest.nodeName.toLowerCase(), !support.noCloneEvent && dest[jQuery.expando]) {
                    data = jQuery._data(dest);
                    for (e in data.events) jQuery.removeEvent(dest, e, data.handle);
                    dest.removeAttribute(jQuery.expando)
                }
                "script" === nodeName && dest.text !== src.text ? (disableScript(dest).text = src.text, restoreScript(dest)) : "object" === nodeName ? (dest.parentNode && (dest.outerHTML = src.outerHTML), support.html5Clone && src.innerHTML && !jQuery.trim(dest.innerHTML) && (dest.innerHTML = src.innerHTML)) : "input" === nodeName && rcheckableType.test(src.type) ? (dest.defaultChecked = dest.checked = src.checked, dest.value !== src.value && (dest.value = src.value)) : "option" === nodeName ? dest.defaultSelected = dest.selected = src.defaultSelected : ("input" === nodeName || "textarea" === nodeName) && (dest.defaultValue = src.defaultValue)
            }
        }

        function actualDisplay(name, doc) {
            var style, elem = jQuery(doc.createElement(name)).appendTo(doc.body),
                display = window.getDefaultComputedStyle && (style = window.getDefaultComputedStyle(elem[0])) ? style.display : jQuery.css(elem[0], "display");
            return elem.detach(), display
        }

        function defaultDisplay(nodeName) {
            var doc = document,
                display = elemdisplay[nodeName];
            return display || (display = actualDisplay(nodeName, doc), "none" !== display && display || (iframe = (iframe || jQuery("<iframe frameborder='0' width='0' height='0'/>")).appendTo(doc.documentElement), doc = (iframe[0].contentWindow || iframe[0].contentDocument).document, doc.write(), doc.close(), display = actualDisplay(nodeName, doc), iframe.detach()), elemdisplay[nodeName] = display), display
        }

        function addGetHookIf(conditionFn, hookFn) {
            return {
                get: function() {
                    var condition = conditionFn();
                    if (null != condition) return condition ? (delete this.get, void 0) : (this.get = hookFn).apply(this, arguments)
                }
            }
        }

        function vendorPropName(style, name) {
            if (name in style) return name;
            for (var capName = name.charAt(0).toUpperCase() + name.slice(1), origName = name, i = cssPrefixes.length; i--;)
                if (name = cssPrefixes[i] + capName, name in style) return name;
            return origName
        }

        function showHide(elements, show) {
            for (var display, elem, hidden, values = [], index = 0, length = elements.length; length > index; index++) elem = elements[index], elem.style && (values[index] = jQuery._data(elem, "olddisplay"), display = elem.style.display, show ? (values[index] || "none" !== display || (elem.style.display = ""), "" === elem.style.display && isHidden(elem) && (values[index] = jQuery._data(elem, "olddisplay", defaultDisplay(elem.nodeName)))) : (hidden = isHidden(elem), (display && "none" !== display || !hidden) && jQuery._data(elem, "olddisplay", hidden ? display : jQuery.css(elem, "display"))));
            for (index = 0; length > index; index++) elem = elements[index], elem.style && (show && "none" !== elem.style.display && "" !== elem.style.display || (elem.style.display = show ? values[index] || "" : "none"));
            return elements
        }

        function setPositiveNumber(elem, value, subtract) {
            var matches = rnumsplit.exec(value);
            return matches ? Math.max(0, matches[1] - (subtract || 0)) + (matches[2] || "px") : value
        }

        function augmentWidthOrHeight(elem, name, extra, isBorderBox, styles) {
            for (var i = extra === (isBorderBox ? "border" : "content") ? 4 : "width" === name ? 1 : 0, val = 0; 4 > i; i += 2) "margin" === extra && (val += jQuery.css(elem, extra + cssExpand[i], !0, styles)), isBorderBox ? ("content" === extra && (val -= jQuery.css(elem, "padding" + cssExpand[i], !0, styles)), "margin" !== extra && (val -= jQuery.css(elem, "border" + cssExpand[i] + "Width", !0, styles))) : (val += jQuery.css(elem, "padding" + cssExpand[i], !0, styles), "padding" !== extra && (val += jQuery.css(elem, "border" + cssExpand[i] + "Width", !0, styles)));
            return val
        }

        function getWidthOrHeight(elem, name, extra) {
            var valueIsBorderBox = !0,
                val = "width" === name ? elem.offsetWidth : elem.offsetHeight,
                styles = getStyles(elem),
                isBorderBox = support.boxSizing && "border-box" === jQuery.css(elem, "boxSizing", !1, styles);
            if (0 >= val || null == val) {
                if (val = curCSS(elem, name, styles), (0 > val || null == val) && (val = elem.style[name]), rnumnonpx.test(val)) return val;
                valueIsBorderBox = isBorderBox && (support.boxSizingReliable() || val === elem.style[name]), val = parseFloat(val) || 0
            }
            return val + augmentWidthOrHeight(elem, name, extra || (isBorderBox ? "border" : "content"), valueIsBorderBox, styles) + "px"
        }

        function Tween(elem, options, prop, end, easing) {
            return new Tween.prototype.init(elem, options, prop, end, easing)
        }

        function createFxNow() {
            return setTimeout(function() {
                fxNow = void 0
            }), fxNow = jQuery.now()
        }

        function genFx(type, includeWidth) {
            var which, attrs = {
                    height: type
                },
                i = 0;
            for (includeWidth = includeWidth ? 1 : 0; 4 > i; i += 2 - includeWidth) which = cssExpand[i], attrs["margin" + which] = attrs["padding" + which] = type;
            return includeWidth && (attrs.opacity = attrs.width = type), attrs
        }

        function createTween(value, prop, animation) {
            for (var tween, collection = (tweeners[prop] || []).concat(tweeners["*"]), index = 0, length = collection.length; length > index; index++)
                if (tween = collection[index].call(animation, prop, value)) return tween
        }

        function defaultPrefilter(elem, props, opts) {
            var prop, value, toggle, tween, hooks, oldfire, display, checkDisplay, anim = this,
                orig = {},
                style = elem.style,
                hidden = elem.nodeType && isHidden(elem),
                dataShow = jQuery._data(elem, "fxshow");
            opts.queue || (hooks = jQuery._queueHooks(elem, "fx"), null == hooks.unqueued && (hooks.unqueued = 0, oldfire = hooks.empty.fire, hooks.empty.fire = function() {
                hooks.unqueued || oldfire()
            }), hooks.unqueued++, anim.always(function() {
                anim.always(function() {
                    hooks.unqueued--, jQuery.queue(elem, "fx").length || hooks.empty.fire()
                })
            })), 1 === elem.nodeType && ("height" in props || "width" in props) && (opts.overflow = [style.overflow, style.overflowX, style.overflowY], display = jQuery.css(elem, "display"), checkDisplay = "none" === display ? jQuery._data(elem, "olddisplay") || defaultDisplay(elem.nodeName) : display, "inline" === checkDisplay && "none" === jQuery.css(elem, "float") && (support.inlineBlockNeedsLayout && "inline" !== defaultDisplay(elem.nodeName) ? style.zoom = 1 : style.display = "inline-block")), opts.overflow && (style.overflow = "hidden", support.shrinkWrapBlocks() || anim.always(function() {
                style.overflow = opts.overflow[0], style.overflowX = opts.overflow[1], style.overflowY = opts.overflow[2]
            }));
            for (prop in props)
                if (value = props[prop], rfxtypes.exec(value)) {
                    if (delete props[prop], toggle = toggle || "toggle" === value, value === (hidden ? "hide" : "show")) {
                        if ("show" !== value || !dataShow || void 0 === dataShow[prop]) continue;
                        hidden = !0
                    }
                    orig[prop] = dataShow && dataShow[prop] || jQuery.style(elem, prop)
                } else display = void 0;
            if (jQuery.isEmptyObject(orig)) "inline" === ("none" === display ? defaultDisplay(elem.nodeName) : display) && (style.display = display);
            else {
                dataShow ? "hidden" in dataShow && (hidden = dataShow.hidden) : dataShow = jQuery._data(elem, "fxshow", {}), toggle && (dataShow.hidden = !hidden), hidden ? jQuery(elem).show() : anim.done(function() {
                    jQuery(elem).hide()
                }), anim.done(function() {
                    var prop;
                    jQuery._removeData(elem, "fxshow");
                    for (prop in orig) jQuery.style(elem, prop, orig[prop])
                });
                for (prop in orig) tween = createTween(hidden ? dataShow[prop] : 0, prop, anim), prop in dataShow || (dataShow[prop] = tween.start, hidden && (tween.end = tween.start, tween.start = "width" === prop || "height" === prop ? 1 : 0))
            }
        }

        function propFilter(props, specialEasing) {
            var index, name, easing, value, hooks;
            for (index in props)
                if (name = jQuery.camelCase(index), easing = specialEasing[name], value = props[index], jQuery.isArray(value) && (easing = value[1], value = props[index] = value[0]), index !== name && (props[name] = value, delete props[index]), hooks = jQuery.cssHooks[name], hooks && "expand" in hooks) {
                    value = hooks.expand(value), delete props[name];
                    for (index in value) index in props || (props[index] = value[index], specialEasing[index] = easing)
                } else specialEasing[name] = easing
        }

        function Animation(elem, properties, options) {
            var result, stopped, index = 0,
                length = animationPrefilters.length,
                deferred = jQuery.Deferred().always(function() {
                    delete tick.elem
                }),
                tick = function() {
                    if (stopped) return !1;
                    for (var currentTime = fxNow || createFxNow(), remaining = Math.max(0, animation.startTime + animation.duration - currentTime), temp = remaining / animation.duration || 0, percent = 1 - temp, index = 0, length = animation.tweens.length; length > index; index++) animation.tweens[index].run(percent);
                    return deferred.notifyWith(elem, [animation, percent, remaining]), 1 > percent && length ? remaining : (deferred.resolveWith(elem, [animation]), !1)
                },
                animation = deferred.promise({
                    elem: elem,
                    props: jQuery.extend({}, properties),
                    opts: jQuery.extend(!0, {
                        specialEasing: {}
                    }, options),
                    originalProperties: properties,
                    originalOptions: options,
                    startTime: fxNow || createFxNow(),
                    duration: options.duration,
                    tweens: [],
                    createTween: function(prop, end) {
                        var tween = jQuery.Tween(elem, animation.opts, prop, end, animation.opts.specialEasing[prop] || animation.opts.easing);
                        return animation.tweens.push(tween), tween
                    },
                    stop: function(gotoEnd) {
                        var index = 0,
                            length = gotoEnd ? animation.tweens.length : 0;
                        if (stopped) return this;
                        for (stopped = !0; length > index; index++) animation.tweens[index].run(1);
                        return gotoEnd ? deferred.resolveWith(elem, [animation, gotoEnd]) : deferred.rejectWith(elem, [animation, gotoEnd]), this
                    }
                }),
                props = animation.props;
            for (propFilter(props, animation.opts.specialEasing); length > index; index++)
                if (result = animationPrefilters[index].call(animation, elem, props, animation.opts)) return result;
            return jQuery.map(props, createTween, animation), jQuery.isFunction(animation.opts.start) && animation.opts.start.call(elem, animation), jQuery.fx.timer(jQuery.extend(tick, {
                elem: elem,
                anim: animation,
                queue: animation.opts.queue
            })), animation.progress(animation.opts.progress).done(animation.opts.done, animation.opts.complete).fail(animation.opts.fail).always(animation.opts.always)
        }

        function addToPrefiltersOrTransports(structure) {
            return function(dataTypeExpression, func) {
                "string" != typeof dataTypeExpression && (func = dataTypeExpression, dataTypeExpression = "*");
                var dataType, i = 0,
                    dataTypes = dataTypeExpression.toLowerCase().match(rnotwhite) || [];
                if (jQuery.isFunction(func))
                    for (; dataType = dataTypes[i++];) "+" === dataType.charAt(0) ? (dataType = dataType.slice(1) || "*", (structure[dataType] = structure[dataType] || []).unshift(func)) : (structure[dataType] = structure[dataType] || []).push(func)
            }
        }

        function inspectPrefiltersOrTransports(structure, options, originalOptions, jqXHR) {
            function inspect(dataType) {
                var selected;
                return inspected[dataType] = !0, jQuery.each(structure[dataType] || [], function(_, prefilterOrFactory) {
                    var dataTypeOrTransport = prefilterOrFactory(options, originalOptions, jqXHR);
                    return "string" != typeof dataTypeOrTransport || seekingTransport || inspected[dataTypeOrTransport] ? seekingTransport ? !(selected = dataTypeOrTransport) : void 0 : (options.dataTypes.unshift(dataTypeOrTransport), inspect(dataTypeOrTransport), !1)
                }), selected
            }
            var inspected = {},
                seekingTransport = structure === transports;
            return inspect(options.dataTypes[0]) || !inspected["*"] && inspect("*")
        }

        function ajaxExtend(target, src) {
            var deep, key, flatOptions = jQuery.ajaxSettings.flatOptions || {};
            for (key in src) void 0 !== src[key] && ((flatOptions[key] ? target : deep || (deep = {}))[key] = src[key]);
            return deep && jQuery.extend(!0, target, deep), target
        }

        function ajaxHandleResponses(s, jqXHR, responses) {
            for (var firstDataType, ct, finalDataType, type, contents = s.contents, dataTypes = s.dataTypes;
                "*" === dataTypes[0];) dataTypes.shift(), void 0 === ct && (ct = s.mimeType || jqXHR.getResponseHeader("Content-Type"));
            if (ct)
                for (type in contents)
                    if (contents[type] && contents[type].test(ct)) {
                        dataTypes.unshift(type);
                        break
                    }
            if (dataTypes[0] in responses) finalDataType = dataTypes[0];
            else {
                for (type in responses) {
                    if (!dataTypes[0] || s.converters[type + " " + dataTypes[0]]) {
                        finalDataType = type;
                        break
                    }
                    firstDataType || (firstDataType = type)
                }
                finalDataType = finalDataType || firstDataType
            }
            return finalDataType ? (finalDataType !== dataTypes[0] && dataTypes.unshift(finalDataType), responses[finalDataType]) : void 0
        }

        function ajaxConvert(s, response, jqXHR, isSuccess) {
            var conv2, current, conv, tmp, prev, converters = {},
                dataTypes = s.dataTypes.slice();
            if (dataTypes[1])
                for (conv in s.converters) converters[conv.toLowerCase()] = s.converters[conv];
            for (current = dataTypes.shift(); current;)
                if (s.responseFields[current] && (jqXHR[s.responseFields[current]] = response), !prev && isSuccess && s.dataFilter && (response = s.dataFilter(response, s.dataType)), prev = current, current = dataTypes.shift())
                    if ("*" === current) current = prev;
                    else if ("*" !== prev && prev !== current) {
                if (conv = converters[prev + " " + current] || converters["* " + current], !conv)
                    for (conv2 in converters)
                        if (tmp = conv2.split(" "), tmp[1] === current && (conv = converters[prev + " " + tmp[0]] || converters["* " + tmp[0]])) {
                            conv === !0 ? conv = converters[conv2] : converters[conv2] !== !0 && (current = tmp[0], dataTypes.unshift(tmp[1]));
                            break
                        }
                if (conv !== !0)
                    if (conv && s["throws"]) response = conv(response);
                    else try {
                        response = conv(response)
                    } catch (e) {
                        return {
                            state: "parsererror",
                            error: conv ? e : "No conversion from " + prev + " to " + current
                        }
                    }
            }
            return {
                state: "success",
                data: response
            }
        }

        function buildParams(prefix, obj, traditional, add) {
            var name;
            if (jQuery.isArray(obj)) jQuery.each(obj, function(i, v) {
                traditional || rbracket.test(prefix) ? add(prefix, v) : buildParams(prefix + "[" + ("object" == typeof v ? i : "") + "]", v, traditional, add)
            });
            else if (traditional || "object" !== jQuery.type(obj)) add(prefix, obj);
            else
                for (name in obj) buildParams(prefix + "[" + name + "]", obj[name], traditional, add)
        }

        function createStandardXHR() {
            try {
                return new window.XMLHttpRequest
            } catch (e) {}
        }

        function createActiveXHR() {
            try {
                return new window.ActiveXObject("Microsoft.XMLHTTP")
            } catch (e) {}
        }

        function getWindow(elem) {
            return jQuery.isWindow(elem) ? elem : 9 === elem.nodeType ? elem.defaultView || elem.parentWindow : !1
        }
        var deletedIds = [],
            slice = deletedIds.slice,
            concat = deletedIds.concat,
            push = deletedIds.push,
            indexOf = deletedIds.indexOf,
            class2type = {},
            toString = class2type.toString,
            hasOwn = class2type.hasOwnProperty,
            support = {},
            version = "1.11.1",
            jQuery = function(selector, context) {
                return new jQuery.fn.init(selector, context)
            },
            rtrim = /^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g,
            rmsPrefix = /^-ms-/,
            rdashAlpha = /-([\da-z])/gi,
            fcamelCase = function(all, letter) {
                return letter.toUpperCase()
            };
        jQuery.fn = jQuery.prototype = {
            jquery: version,
            constructor: jQuery,
            selector: "",
            length: 0,
            toArray: function() {
                return slice.call(this)
            },
            get: function(num) {
                return null != num ? 0 > num ? this[num + this.length] : this[num] : slice.call(this)
            },
            pushStack: function(elems) {
                var ret = jQuery.merge(this.constructor(), elems);
                return ret.prevObject = this, ret.context = this.context, ret
            },
            each: function(callback, args) {
                return jQuery.each(this, callback, args)
            },
            map: function(callback) {
                return this.pushStack(jQuery.map(this, function(elem, i) {
                    return callback.call(elem, i, elem)
                }))
            },
            slice: function() {
                return this.pushStack(slice.apply(this, arguments))
            },
            first: function() {
                return this.eq(0)
            },
            last: function() {
                return this.eq(-1)
            },
            eq: function(i) {
                var len = this.length,
                    j = +i + (0 > i ? len : 0);
                return this.pushStack(j >= 0 && len > j ? [this[j]] : [])
            },
            end: function() {
                return this.prevObject || this.constructor(null)
            },
            push: push,
            sort: deletedIds.sort,
            splice: deletedIds.splice
        }, jQuery.extend = jQuery.fn.extend = function() {
            var src, copyIsArray, copy, name, options, clone, target = arguments[0] || {},
                i = 1,
                length = arguments.length,
                deep = !1;
            for ("boolean" == typeof target && (deep = target, target = arguments[i] || {}, i++), "object" == typeof target || jQuery.isFunction(target) || (target = {}), i === length && (target = this, i--); length > i; i++)
                if (null != (options = arguments[i]))
                    for (name in options) src = target[name], copy = options[name], target !== copy && (deep && copy && (jQuery.isPlainObject(copy) || (copyIsArray = jQuery.isArray(copy))) ? (copyIsArray ? (copyIsArray = !1, clone = src && jQuery.isArray(src) ? src : []) : clone = src && jQuery.isPlainObject(src) ? src : {}, target[name] = jQuery.extend(deep, clone, copy)) : void 0 !== copy && (target[name] = copy));
            return target
        }, jQuery.extend({
            expando: "jQuery" + (version + Math.random()).replace(/\D/g, ""),
            isReady: !0,
            error: function(msg) {
                throw new Error(msg)
            },
            noop: function() {},
            isFunction: function(obj) {
                return "function" === jQuery.type(obj)
            },
            isArray: Array.isArray || function(obj) {
                return "array" === jQuery.type(obj)
            },
            isWindow: function(obj) {
                return null != obj && obj == obj.window
            },
            isNumeric: function(obj) {
                return !jQuery.isArray(obj) && obj - parseFloat(obj) >= 0
            },
            isEmptyObject: function(obj) {
                var name;
                for (name in obj) return !1;
                return !0
            },
            isPlainObject: function(obj) {
                var key;
                if (!obj || "object" !== jQuery.type(obj) || obj.nodeType || jQuery.isWindow(obj)) return !1;
                try {
                    if (obj.constructor && !hasOwn.call(obj, "constructor") && !hasOwn.call(obj.constructor.prototype, "isPrototypeOf")) return !1
                } catch (e) {
                    return !1
                }
                if (support.ownLast)
                    for (key in obj) return hasOwn.call(obj, key);
                for (key in obj);
                return void 0 === key || hasOwn.call(obj, key)
            },
            type: function(obj) {
                return null == obj ? obj + "" : "object" == typeof obj || "function" == typeof obj ? class2type[toString.call(obj)] || "object" : typeof obj
            },
            globalEval: function(data) {
                data && jQuery.trim(data) && (window.execScript || function(data) {
                    window.eval.call(window, data)
                })(data)
            },
            camelCase: function(string) {
                return string.replace(rmsPrefix, "ms-").replace(rdashAlpha, fcamelCase)
            },
            nodeName: function(elem, name) {
                return elem.nodeName && elem.nodeName.toLowerCase() === name.toLowerCase()
            },
            each: function(obj, callback, args) {
                var value, i = 0,
                    length = obj.length,
                    isArray = isArraylike(obj);
                if (args) {
                    if (isArray)
                        for (; length > i && (value = callback.apply(obj[i], args), value !== !1); i++);
                    else
                        for (i in obj)
                            if (value = callback.apply(obj[i], args), value === !1) break
                } else if (isArray)
                    for (; length > i && (value = callback.call(obj[i], i, obj[i]), value !== !1); i++);
                else
                    for (i in obj)
                        if (value = callback.call(obj[i], i, obj[i]), value === !1) break; return obj
            },
            trim: function(text) {
                return null == text ? "" : (text + "").replace(rtrim, "")
            },
            makeArray: function(arr, results) {
                var ret = results || [];
                return null != arr && (isArraylike(Object(arr)) ? jQuery.merge(ret, "string" == typeof arr ? [arr] : arr) : push.call(ret, arr)), ret
            },
            inArray: function(elem, arr, i) {
                var len;
                if (arr) {
                    if (indexOf) return indexOf.call(arr, elem, i);
                    for (len = arr.length, i = i ? 0 > i ? Math.max(0, len + i) : i : 0; len > i; i++)
                        if (i in arr && arr[i] === elem) return i
                }
                return -1
            },
            merge: function(first, second) {
                for (var len = +second.length, j = 0, i = first.length; len > j;) first[i++] = second[j++];
                if (len !== len)
                    for (; void 0 !== second[j];) first[i++] = second[j++];
                return first.length = i, first
            },
            grep: function(elems, callback, invert) {
                for (var callbackInverse, matches = [], i = 0, length = elems.length, callbackExpect = !invert; length > i; i++) callbackInverse = !callback(elems[i], i), callbackInverse !== callbackExpect && matches.push(elems[i]);
                return matches
            },
            map: function(elems, callback, arg) {
                var value, i = 0,
                    length = elems.length,
                    isArray = isArraylike(elems),
                    ret = [];
                if (isArray)
                    for (; length > i; i++) value = callback(elems[i], i, arg), null != value && ret.push(value);
                else
                    for (i in elems) value = callback(elems[i], i, arg), null != value && ret.push(value);
                return concat.apply([], ret)
            },
            guid: 1,
            proxy: function(fn, context) {
                var args, proxy, tmp;
                return "string" == typeof context && (tmp = fn[context], context = fn, fn = tmp), jQuery.isFunction(fn) ? (args = slice.call(arguments, 2), proxy = function() {
                    return fn.apply(context || this, args.concat(slice.call(arguments)))
                }, proxy.guid = fn.guid = fn.guid || jQuery.guid++, proxy) : void 0
            },
            now: function() {
                return +new Date
            },
            support: support
        }), jQuery.each("Boolean Number String Function Array Date RegExp Object Error".split(" "), function(i, name) {
            class2type["[object " + name + "]"] = name.toLowerCase()
        });
        var Sizzle =
            /*!
             * Sizzle CSS Selector Engine v1.10.19
             * http://sizzlejs.com/
             *
             * Copyright 2013 jQuery Foundation, Inc. and other contributors
             * Released under the MIT license
             * http://jquery.org/license
             *
             * Date: 2014-04-18
             */
            function(window) {
                function Sizzle(selector, context, results, seed) {
                    var match, elem, m, nodeType, i, groups, old, nid, newContext, newSelector;
                    if ((context ? context.ownerDocument || context : preferredDoc) !== document && setDocument(context), context = context || document, results = results || [], !selector || "string" != typeof selector) return results;
                    if (1 !== (nodeType = context.nodeType) && 9 !== nodeType) return [];
                    if (documentIsHTML && !seed) {
                        if (match = rquickExpr.exec(selector))
                            if (m = match[1]) {
                                if (9 === nodeType) {
                                    if (elem = context.getElementById(m), !elem || !elem.parentNode) return results;
                                    if (elem.id === m) return results.push(elem), results
                                } else if (context.ownerDocument && (elem = context.ownerDocument.getElementById(m)) && contains(context, elem) && elem.id === m) return results.push(elem), results
                            } else {
                                if (match[2]) return push.apply(results, context.getElementsByTagName(selector)), results;
                                if ((m = match[3]) && support.getElementsByClassName && context.getElementsByClassName) return push.apply(results, context.getElementsByClassName(m)), results
                            }
                        if (support.qsa && (!rbuggyQSA || !rbuggyQSA.test(selector))) {
                            if (nid = old = expando, newContext = context, newSelector = 9 === nodeType && selector, 1 === nodeType && "object" !== context.nodeName.toLowerCase()) {
                                for (groups = tokenize(selector), (old = context.getAttribute("id")) ? nid = old.replace(rescape, "\\$&") : context.setAttribute("id", nid), nid = "[id='" + nid + "'] ", i = groups.length; i--;) groups[i] = nid + toSelector(groups[i]);
                                newContext = rsibling.test(selector) && testContext(context.parentNode) || context, newSelector = groups.join(",")
                            }
                            if (newSelector) try {
                                return push.apply(results, newContext.querySelectorAll(newSelector)), results
                            } catch (qsaError) {} finally {
                                old || context.removeAttribute("id")
                            }
                        }
                    }
                    return select(selector.replace(rtrim, "$1"), context, results, seed)
                }

                function createCache() {
                    function cache(key, value) {
                        return keys.push(key + " ") > Expr.cacheLength && delete cache[keys.shift()], cache[key + " "] = value
                    }
                    var keys = [];
                    return cache
                }

                function markFunction(fn) {
                    return fn[expando] = !0, fn
                }

                function assert(fn) {
                    var div = document.createElement("div");
                    try {
                        return !!fn(div)
                    } catch (e) {
                        return !1
                    } finally {
                        div.parentNode && div.parentNode.removeChild(div), div = null
                    }
                }

                function addHandle(attrs, handler) {
                    for (var arr = attrs.split("|"), i = attrs.length; i--;) Expr.attrHandle[arr[i]] = handler
                }

                function siblingCheck(a, b) {
                    var cur = b && a,
                        diff = cur && 1 === a.nodeType && 1 === b.nodeType && (~b.sourceIndex || MAX_NEGATIVE) - (~a.sourceIndex || MAX_NEGATIVE);
                    if (diff) return diff;
                    if (cur)
                        for (; cur = cur.nextSibling;)
                            if (cur === b) return -1;
                    return a ? 1 : -1
                }

                function createInputPseudo(type) {
                    return function(elem) {
                        var name = elem.nodeName.toLowerCase();
                        return "input" === name && elem.type === type
                    }
                }

                function createButtonPseudo(type) {
                    return function(elem) {
                        var name = elem.nodeName.toLowerCase();
                        return ("input" === name || "button" === name) && elem.type === type
                    }
                }

                function createPositionalPseudo(fn) {
                    return markFunction(function(argument) {
                        return argument = +argument, markFunction(function(seed, matches) {
                            for (var j, matchIndexes = fn([], seed.length, argument), i = matchIndexes.length; i--;) seed[j = matchIndexes[i]] && (seed[j] = !(matches[j] = seed[j]))
                        })
                    })
                }

                function testContext(context) {
                    return context && typeof context.getElementsByTagName !== strundefined && context
                }

                function setFilters() {}

                function toSelector(tokens) {
                    for (var i = 0, len = tokens.length, selector = ""; len > i; i++) selector += tokens[i].value;
                    return selector
                }

                function addCombinator(matcher, combinator, base) {
                    var dir = combinator.dir,
                        checkNonElements = base && "parentNode" === dir,
                        doneName = done++;
                    return combinator.first ? function(elem, context, xml) {
                        for (; elem = elem[dir];)
                            if (1 === elem.nodeType || checkNonElements) return matcher(elem, context, xml)
                    } : function(elem, context, xml) {
                        var oldCache, outerCache, newCache = [dirruns, doneName];
                        if (xml) {
                            for (; elem = elem[dir];)
                                if ((1 === elem.nodeType || checkNonElements) && matcher(elem, context, xml)) return !0
                        } else
                            for (; elem = elem[dir];)
                                if (1 === elem.nodeType || checkNonElements) {
                                    if (outerCache = elem[expando] || (elem[expando] = {}), (oldCache = outerCache[dir]) && oldCache[0] === dirruns && oldCache[1] === doneName) return newCache[2] = oldCache[2];
                                    if (outerCache[dir] = newCache, newCache[2] = matcher(elem, context, xml)) return !0
                                }
                    }
                }

                function elementMatcher(matchers) {
                    return matchers.length > 1 ? function(elem, context, xml) {
                        for (var i = matchers.length; i--;)
                            if (!matchers[i](elem, context, xml)) return !1;
                        return !0
                    } : matchers[0]
                }

                function multipleContexts(selector, contexts, results) {
                    for (var i = 0, len = contexts.length; len > i; i++) Sizzle(selector, contexts[i], results);
                    return results
                }

                function condense(unmatched, map, filter, context, xml) {
                    for (var elem, newUnmatched = [], i = 0, len = unmatched.length, mapped = null != map; len > i; i++)(elem = unmatched[i]) && (!filter || filter(elem, context, xml)) && (newUnmatched.push(elem), mapped && map.push(i));
                    return newUnmatched
                }

                function setMatcher(preFilter, selector, matcher, postFilter, postFinder, postSelector) {
                    return postFilter && !postFilter[expando] && (postFilter = setMatcher(postFilter)), postFinder && !postFinder[expando] && (postFinder = setMatcher(postFinder, postSelector)), markFunction(function(seed, results, context, xml) {
                        var temp, i, elem, preMap = [],
                            postMap = [],
                            preexisting = results.length,
                            elems = seed || multipleContexts(selector || "*", context.nodeType ? [context] : context, []),
                            matcherIn = !preFilter || !seed && selector ? elems : condense(elems, preMap, preFilter, context, xml),
                            matcherOut = matcher ? postFinder || (seed ? preFilter : preexisting || postFilter) ? [] : results : matcherIn;
                        if (matcher && matcher(matcherIn, matcherOut, context, xml), postFilter)
                            for (temp = condense(matcherOut, postMap), postFilter(temp, [], context, xml), i = temp.length; i--;)(elem = temp[i]) && (matcherOut[postMap[i]] = !(matcherIn[postMap[i]] = elem));
                        if (seed) {
                            if (postFinder || preFilter) {
                                if (postFinder) {
                                    for (temp = [], i = matcherOut.length; i--;)(elem = matcherOut[i]) && temp.push(matcherIn[i] = elem);
                                    postFinder(null, matcherOut = [], temp, xml)
                                }
                                for (i = matcherOut.length; i--;)(elem = matcherOut[i]) && (temp = postFinder ? indexOf.call(seed, elem) : preMap[i]) > -1 && (seed[temp] = !(results[temp] = elem))
                            }
                        } else matcherOut = condense(matcherOut === results ? matcherOut.splice(preexisting, matcherOut.length) : matcherOut), postFinder ? postFinder(null, results, matcherOut, xml) : push.apply(results, matcherOut)
                    })
                }

                function matcherFromTokens(tokens) {
                    for (var checkContext, matcher, j, len = tokens.length, leadingRelative = Expr.relative[tokens[0].type], implicitRelative = leadingRelative || Expr.relative[" "], i = leadingRelative ? 1 : 0, matchContext = addCombinator(function(elem) {
                            return elem === checkContext
                        }, implicitRelative, !0), matchAnyContext = addCombinator(function(elem) {
                            return indexOf.call(checkContext, elem) > -1
                        }, implicitRelative, !0), matchers = [function(elem, context, xml) {
                            return !leadingRelative && (xml || context !== outermostContext) || ((checkContext = context).nodeType ? matchContext(elem, context, xml) : matchAnyContext(elem, context, xml))
                        }]; len > i; i++)
                        if (matcher = Expr.relative[tokens[i].type]) matchers = [addCombinator(elementMatcher(matchers), matcher)];
                        else {
                            if (matcher = Expr.filter[tokens[i].type].apply(null, tokens[i].matches), matcher[expando]) {
                                for (j = ++i; len > j && !Expr.relative[tokens[j].type]; j++);
                                return setMatcher(i > 1 && elementMatcher(matchers), i > 1 && toSelector(tokens.slice(0, i - 1).concat({
                                    value: " " === tokens[i - 2].type ? "*" : ""
                                })).replace(rtrim, "$1"), matcher, j > i && matcherFromTokens(tokens.slice(i, j)), len > j && matcherFromTokens(tokens = tokens.slice(j)), len > j && toSelector(tokens))
                            }
                            matchers.push(matcher)
                        }
                    return elementMatcher(matchers)
                }

                function matcherFromGroupMatchers(elementMatchers, setMatchers) {
                    var bySet = setMatchers.length > 0,
                        byElement = elementMatchers.length > 0,
                        superMatcher = function(seed, context, xml, results, outermost) {
                            var elem, j, matcher, matchedCount = 0,
                                i = "0",
                                unmatched = seed && [],
                                setMatched = [],
                                contextBackup = outermostContext,
                                elems = seed || byElement && Expr.find.TAG("*", outermost),
                                dirrunsUnique = dirruns += null == contextBackup ? 1 : Math.random() || .1,
                                len = elems.length;
                            for (outermost && (outermostContext = context !== document && context); i !== len && null != (elem = elems[i]); i++) {
                                if (byElement && elem) {
                                    for (j = 0; matcher = elementMatchers[j++];)
                                        if (matcher(elem, context, xml)) {
                                            results.push(elem);
                                            break
                                        }
                                    outermost && (dirruns = dirrunsUnique)
                                }
                                bySet && ((elem = !matcher && elem) && matchedCount--, seed && unmatched.push(elem))
                            }
                            if (matchedCount += i, bySet && i !== matchedCount) {
                                for (j = 0; matcher = setMatchers[j++];) matcher(unmatched, setMatched, context, xml);
                                if (seed) {
                                    if (matchedCount > 0)
                                        for (; i--;) unmatched[i] || setMatched[i] || (setMatched[i] = pop.call(results));
                                    setMatched = condense(setMatched)
                                }
                                push.apply(results, setMatched), outermost && !seed && setMatched.length > 0 && matchedCount + setMatchers.length > 1 && Sizzle.uniqueSort(results)
                            }
                            return outermost && (dirruns = dirrunsUnique, outermostContext = contextBackup), unmatched
                        };
                    return bySet ? markFunction(superMatcher) : superMatcher
                }
                var i, support, Expr, getText, isXML, tokenize, compile, select, outermostContext, sortInput, hasDuplicate, setDocument, document, docElem, documentIsHTML, rbuggyQSA, rbuggyMatches, matches, contains, expando = "sizzle" + -new Date,
                    preferredDoc = window.document,
                    dirruns = 0,
                    done = 0,
                    classCache = createCache(),
                    tokenCache = createCache(),
                    compilerCache = createCache(),
                    sortOrder = function(a, b) {
                        return a === b && (hasDuplicate = !0), 0
                    },
                    strundefined = "undefined",
                    MAX_NEGATIVE = 1 << 31,
                    hasOwn = {}.hasOwnProperty,
                    arr = [],
                    pop = arr.pop,
                    push_native = arr.push,
                    push = arr.push,
                    slice = arr.slice,
                    indexOf = arr.indexOf || function(elem) {
                        for (var i = 0, len = this.length; len > i; i++)
                            if (this[i] === elem) return i;
                        return -1
                    },
                    booleans = "checked|selected|async|autofocus|autoplay|controls|defer|disabled|hidden|ismap|loop|multiple|open|readonly|required|scoped",
                    whitespace = "[\\x20\\t\\r\\n\\f]",
                    characterEncoding = "(?:\\\\.|[\\w-]|[^\\x00-\\xa0])+",
                    identifier = characterEncoding.replace("w", "w#"),
                    attributes = "\\[" + whitespace + "*(" + characterEncoding + ")(?:" + whitespace + "*([*^$|!~]?=)" + whitespace + "*(?:'((?:\\\\.|[^\\\\'])*)'|\"((?:\\\\.|[^\\\\\"])*)\"|(" + identifier + "))|)" + whitespace + "*\\]",
                    pseudos = ":(" + characterEncoding + ")(?:\\((" + "('((?:\\\\.|[^\\\\'])*)'|\"((?:\\\\.|[^\\\\\"])*)\")|" + "((?:\\\\.|[^\\\\()[\\]]|" + attributes + ")*)|" + ".*" + ")\\)|)",
                    rtrim = new RegExp("^" + whitespace + "+|((?:^|[^\\\\])(?:\\\\.)*)" + whitespace + "+$", "g"),
                    rcomma = new RegExp("^" + whitespace + "*," + whitespace + "*"),
                    rcombinators = new RegExp("^" + whitespace + "*([>+~]|" + whitespace + ")" + whitespace + "*"),
                    rattributeQuotes = new RegExp("=" + whitespace + "*([^\\]'\"]*?)" + whitespace + "*\\]", "g"),
                    rpseudo = new RegExp(pseudos),
                    ridentifier = new RegExp("^" + identifier + "$"),
                    matchExpr = {
                        ID: new RegExp("^#(" + characterEncoding + ")"),
                        CLASS: new RegExp("^\\.(" + characterEncoding + ")"),
                        TAG: new RegExp("^(" + characterEncoding.replace("w", "w*") + ")"),
                        ATTR: new RegExp("^" + attributes),
                        PSEUDO: new RegExp("^" + pseudos),
                        CHILD: new RegExp("^:(only|first|last|nth|nth-last)-(child|of-type)(?:\\(" + whitespace + "*(even|odd|(([+-]|)(\\d*)n|)" + whitespace + "*(?:([+-]|)" + whitespace + "*(\\d+)|))" + whitespace + "*\\)|)", "i"),
                        bool: new RegExp("^(?:" + booleans + ")$", "i"),
                        needsContext: new RegExp("^" + whitespace + "*[>+~]|:(even|odd|eq|gt|lt|nth|first|last)(?:\\(" + whitespace + "*((?:-\\d)?\\d*)" + whitespace + "*\\)|)(?=[^-]|$)", "i")
                    },
                    rinputs = /^(?:input|select|textarea|button)$/i,
                    rheader = /^h\d$/i,
                    rnative = /^[^{]+\{\s*\[native \w/,
                    rquickExpr = /^(?:#([\w-]+)|(\w+)|\.([\w-]+))$/,
                    rsibling = /[+~]/,
                    rescape = /'|\\/g,
                    runescape = new RegExp("\\\\([\\da-f]{1,6}" + whitespace + "?|(" + whitespace + ")|.)", "ig"),
                    funescape = function(_, escaped, escapedWhitespace) {
                        var high = "0x" + escaped - 65536;
                        return high !== high || escapedWhitespace ? escaped : 0 > high ? String.fromCharCode(high + 65536) : String.fromCharCode(55296 | high >> 10, 56320 | 1023 & high)
                    };
                try {
                    push.apply(arr = slice.call(preferredDoc.childNodes), preferredDoc.childNodes), arr[preferredDoc.childNodes.length].nodeType
                } catch (e) {
                    push = {
                        apply: arr.length ? function(target, els) {
                            push_native.apply(target, slice.call(els))
                        } : function(target, els) {
                            for (var j = target.length, i = 0; target[j++] = els[i++];);
                            target.length = j - 1
                        }
                    }
                }
                support = Sizzle.support = {}, isXML = Sizzle.isXML = function(elem) {
                    var documentElement = elem && (elem.ownerDocument || elem).documentElement;
                    return documentElement ? "HTML" !== documentElement.nodeName : !1
                }, setDocument = Sizzle.setDocument = function(node) {
                    var hasCompare, doc = node ? node.ownerDocument || node : preferredDoc,
                        parent = doc.defaultView;
                    return doc !== document && 9 === doc.nodeType && doc.documentElement ? (document = doc, docElem = doc.documentElement, documentIsHTML = !isXML(doc), parent && parent !== parent.top && (parent.addEventListener ? parent.addEventListener("unload", function() {
                        setDocument()
                    }, !1) : parent.attachEvent && parent.attachEvent("onunload", function() {
                        setDocument()
                    })), support.attributes = assert(function(div) {
                        return div.className = "i", !div.getAttribute("className")
                    }), support.getElementsByTagName = assert(function(div) {
                        return div.appendChild(doc.createComment("")), !div.getElementsByTagName("*").length
                    }), support.getElementsByClassName = rnative.test(doc.getElementsByClassName) && assert(function(div) {
                        return div.innerHTML = "<div class='a'></div><div class='a i'></div>", div.firstChild.className = "i", 2 === div.getElementsByClassName("i").length
                    }), support.getById = assert(function(div) {
                        return docElem.appendChild(div).id = expando, !doc.getElementsByName || !doc.getElementsByName(expando).length
                    }), support.getById ? (Expr.find.ID = function(id, context) {
                        if (typeof context.getElementById !== strundefined && documentIsHTML) {
                            var m = context.getElementById(id);
                            return m && m.parentNode ? [m] : []
                        }
                    }, Expr.filter.ID = function(id) {
                        var attrId = id.replace(runescape, funescape);
                        return function(elem) {
                            return elem.getAttribute("id") === attrId
                        }
                    }) : (delete Expr.find.ID, Expr.filter.ID = function(id) {
                        var attrId = id.replace(runescape, funescape);
                        return function(elem) {
                            var node = typeof elem.getAttributeNode !== strundefined && elem.getAttributeNode("id");
                            return node && node.value === attrId
                        }
                    }), Expr.find.TAG = support.getElementsByTagName ? function(tag, context) {
                        return typeof context.getElementsByTagName !== strundefined ? context.getElementsByTagName(tag) : void 0
                    } : function(tag, context) {
                        var elem, tmp = [],
                            i = 0,
                            results = context.getElementsByTagName(tag);
                        if ("*" === tag) {
                            for (; elem = results[i++];) 1 === elem.nodeType && tmp.push(elem);
                            return tmp
                        }
                        return results
                    }, Expr.find.CLASS = support.getElementsByClassName && function(className, context) {
                        return typeof context.getElementsByClassName !== strundefined && documentIsHTML ? context.getElementsByClassName(className) : void 0
                    }, rbuggyMatches = [], rbuggyQSA = [], (support.qsa = rnative.test(doc.querySelectorAll)) && (assert(function(div) {
                        div.innerHTML = "<select msallowclip=''><option selected=''></option></select>", div.querySelectorAll("[msallowclip^='']").length && rbuggyQSA.push("[*^$]=" + whitespace + "*(?:''|\"\")"), div.querySelectorAll("[selected]").length || rbuggyQSA.push("\\[" + whitespace + "*(?:value|" + booleans + ")"), div.querySelectorAll(":checked").length || rbuggyQSA.push(":checked")
                    }), assert(function(div) {
                        var input = doc.createElement("input");
                        input.setAttribute("type", "hidden"), div.appendChild(input).setAttribute("name", "D"), div.querySelectorAll("[name=d]").length && rbuggyQSA.push("name" + whitespace + "*[*^$|!~]?="), div.querySelectorAll(":enabled").length || rbuggyQSA.push(":enabled", ":disabled"), div.querySelectorAll("*,:x"), rbuggyQSA.push(",.*:")
                    })), (support.matchesSelector = rnative.test(matches = docElem.matches || docElem.webkitMatchesSelector || docElem.mozMatchesSelector || docElem.oMatchesSelector || docElem.msMatchesSelector)) && assert(function(div) {
                        support.disconnectedMatch = matches.call(div, "div"), matches.call(div, "[s!='']:x"), rbuggyMatches.push("!=", pseudos)
                    }), rbuggyQSA = rbuggyQSA.length && new RegExp(rbuggyQSA.join("|")), rbuggyMatches = rbuggyMatches.length && new RegExp(rbuggyMatches.join("|")), hasCompare = rnative.test(docElem.compareDocumentPosition), contains = hasCompare || rnative.test(docElem.contains) ? function(a, b) {
                        var adown = 9 === a.nodeType ? a.documentElement : a,
                            bup = b && b.parentNode;
                        return a === bup || !(!bup || 1 !== bup.nodeType || !(adown.contains ? adown.contains(bup) : a.compareDocumentPosition && 16 & a.compareDocumentPosition(bup)))
                    } : function(a, b) {
                        if (b)
                            for (; b = b.parentNode;)
                                if (b === a) return !0;
                        return !1
                    }, sortOrder = hasCompare ? function(a, b) {
                        if (a === b) return hasDuplicate = !0, 0;
                        var compare = !a.compareDocumentPosition - !b.compareDocumentPosition;
                        return compare ? compare : (compare = (a.ownerDocument || a) === (b.ownerDocument || b) ? a.compareDocumentPosition(b) : 1, 1 & compare || !support.sortDetached && b.compareDocumentPosition(a) === compare ? a === doc || a.ownerDocument === preferredDoc && contains(preferredDoc, a) ? -1 : b === doc || b.ownerDocument === preferredDoc && contains(preferredDoc, b) ? 1 : sortInput ? indexOf.call(sortInput, a) - indexOf.call(sortInput, b) : 0 : 4 & compare ? -1 : 1)
                    } : function(a, b) {
                        if (a === b) return hasDuplicate = !0, 0;
                        var cur, i = 0,
                            aup = a.parentNode,
                            bup = b.parentNode,
                            ap = [a],
                            bp = [b];
                        if (!aup || !bup) return a === doc ? -1 : b === doc ? 1 : aup ? -1 : bup ? 1 : sortInput ? indexOf.call(sortInput, a) - indexOf.call(sortInput, b) : 0;
                        if (aup === bup) return siblingCheck(a, b);
                        for (cur = a; cur = cur.parentNode;) ap.unshift(cur);
                        for (cur = b; cur = cur.parentNode;) bp.unshift(cur);
                        for (; ap[i] === bp[i];) i++;
                        return i ? siblingCheck(ap[i], bp[i]) : ap[i] === preferredDoc ? -1 : bp[i] === preferredDoc ? 1 : 0
                    }, doc) : document
                }, Sizzle.matches = function(expr, elements) {
                    return Sizzle(expr, null, null, elements)
                }, Sizzle.matchesSelector = function(elem, expr) {
                    if ((elem.ownerDocument || elem) !== document && setDocument(elem), expr = expr.replace(rattributeQuotes, "='$1']"), !(!support.matchesSelector || !documentIsHTML || rbuggyMatches && rbuggyMatches.test(expr) || rbuggyQSA && rbuggyQSA.test(expr))) try {
                        var ret = matches.call(elem, expr);
                        if (ret || support.disconnectedMatch || elem.document && 11 !== elem.document.nodeType) return ret
                    } catch (e) {}
                    return Sizzle(expr, document, null, [elem]).length > 0
                }, Sizzle.contains = function(context, elem) {
                    return (context.ownerDocument || context) !== document && setDocument(context), contains(context, elem)
                }, Sizzle.attr = function(elem, name) {
                    (elem.ownerDocument || elem) !== document && setDocument(elem);
                    var fn = Expr.attrHandle[name.toLowerCase()],
                        val = fn && hasOwn.call(Expr.attrHandle, name.toLowerCase()) ? fn(elem, name, !documentIsHTML) : void 0;
                    return void 0 !== val ? val : support.attributes || !documentIsHTML ? elem.getAttribute(name) : (val = elem.getAttributeNode(name)) && val.specified ? val.value : null
                }, Sizzle.error = function(msg) {
                    throw new Error("Syntax error, unrecognized expression: " + msg)
                }, Sizzle.uniqueSort = function(results) {
                    var elem, duplicates = [],
                        j = 0,
                        i = 0;
                    if (hasDuplicate = !support.detectDuplicates, sortInput = !support.sortStable && results.slice(0), results.sort(sortOrder), hasDuplicate) {
                        for (; elem = results[i++];) elem === results[i] && (j = duplicates.push(i));
                        for (; j--;) results.splice(duplicates[j], 1)
                    }
                    return sortInput = null, results
                }, getText = Sizzle.getText = function(elem) {
                    var node, ret = "",
                        i = 0,
                        nodeType = elem.nodeType;
                    if (nodeType) {
                        if (1 === nodeType || 9 === nodeType || 11 === nodeType) {
                            if ("string" == typeof elem.textContent) return elem.textContent;
                            for (elem = elem.firstChild; elem; elem = elem.nextSibling) ret += getText(elem)
                        } else if (3 === nodeType || 4 === nodeType) return elem.nodeValue
                    } else
                        for (; node = elem[i++];) ret += getText(node);
                    return ret
                }, Expr = Sizzle.selectors = {
                    cacheLength: 50,
                    createPseudo: markFunction,
                    match: matchExpr,
                    attrHandle: {},
                    find: {},
                    relative: {
                        ">": {
                            dir: "parentNode",
                            first: !0
                        },
                        " ": {
                            dir: "parentNode"
                        },
                        "+": {
                            dir: "previousSibling",
                            first: !0
                        },
                        "~": {
                            dir: "previousSibling"
                        }
                    },
                    preFilter: {
                        ATTR: function(match) {
                            return match[1] = match[1].replace(runescape, funescape), match[3] = (match[3] || match[4] || match[5] || "").replace(runescape, funescape), "~=" === match[2] && (match[3] = " " + match[3] + " "), match.slice(0, 4)
                        },
                        CHILD: function(match) {
                            return match[1] = match[1].toLowerCase(), "nth" === match[1].slice(0, 3) ? (match[3] || Sizzle.error(match[0]), match[4] = +(match[4] ? match[5] + (match[6] || 1) : 2 * ("even" === match[3] || "odd" === match[3])), match[5] = +(match[7] + match[8] || "odd" === match[3])) : match[3] && Sizzle.error(match[0]), match
                        },
                        PSEUDO: function(match) {
                            var excess, unquoted = !match[6] && match[2];
                            return matchExpr.CHILD.test(match[0]) ? null : (match[3] ? match[2] = match[4] || match[5] || "" : unquoted && rpseudo.test(unquoted) && (excess = tokenize(unquoted, !0)) && (excess = unquoted.indexOf(")", unquoted.length - excess) - unquoted.length) && (match[0] = match[0].slice(0, excess), match[2] = unquoted.slice(0, excess)), match.slice(0, 3))
                        }
                    },
                    filter: {
                        TAG: function(nodeNameSelector) {
                            var nodeName = nodeNameSelector.replace(runescape, funescape).toLowerCase();
                            return "*" === nodeNameSelector ? function() {
                                return !0
                            } : function(elem) {
                                return elem.nodeName && elem.nodeName.toLowerCase() === nodeName
                            }
                        },
                        CLASS: function(className) {
                            var pattern = classCache[className + " "];
                            return pattern || (pattern = new RegExp("(^|" + whitespace + ")" + className + "(" + whitespace + "|$)")) && classCache(className, function(elem) {
                                return pattern.test("string" == typeof elem.className && elem.className || typeof elem.getAttribute !== strundefined && elem.getAttribute("class") || "")
                            })
                        },
                        ATTR: function(name, operator, check) {
                            return function(elem) {
                                var result = Sizzle.attr(elem, name);
                                return null == result ? "!=" === operator : operator ? (result += "", "=" === operator ? result === check : "!=" === operator ? result !== check : "^=" === operator ? check && 0 === result.indexOf(check) : "*=" === operator ? check && result.indexOf(check) > -1 : "$=" === operator ? check && result.slice(-check.length) === check : "~=" === operator ? (" " + result + " ").indexOf(check) > -1 : "|=" === operator ? result === check || result.slice(0, check.length + 1) === check + "-" : !1) : !0
                            }
                        },
                        CHILD: function(type, what, argument, first, last) {
                            var simple = "nth" !== type.slice(0, 3),
                                forward = "last" !== type.slice(-4),
                                ofType = "of-type" === what;
                            return 1 === first && 0 === last ? function(elem) {
                                return !!elem.parentNode
                            } : function(elem, context, xml) {
                                var cache, outerCache, node, diff, nodeIndex, start, dir = simple !== forward ? "nextSibling" : "previousSibling",
                                    parent = elem.parentNode,
                                    name = ofType && elem.nodeName.toLowerCase(),
                                    useCache = !xml && !ofType;
                                if (parent) {
                                    if (simple) {
                                        for (; dir;) {
                                            for (node = elem; node = node[dir];)
                                                if (ofType ? node.nodeName.toLowerCase() === name : 1 === node.nodeType) return !1;
                                            start = dir = "only" === type && !start && "nextSibling"
                                        }
                                        return !0
                                    }
                                    if (start = [forward ? parent.firstChild : parent.lastChild], forward && useCache) {
                                        for (outerCache = parent[expando] || (parent[expando] = {}), cache = outerCache[type] || [], nodeIndex = cache[0] === dirruns && cache[1], diff = cache[0] === dirruns && cache[2], node = nodeIndex && parent.childNodes[nodeIndex]; node = ++nodeIndex && node && node[dir] || (diff = nodeIndex = 0) || start.pop();)
                                            if (1 === node.nodeType && ++diff && node === elem) {
                                                outerCache[type] = [dirruns, nodeIndex, diff];
                                                break
                                            }
                                    } else if (useCache && (cache = (elem[expando] || (elem[expando] = {}))[type]) && cache[0] === dirruns) diff = cache[1];
                                    else
                                        for (;
                                            (node = ++nodeIndex && node && node[dir] || (diff = nodeIndex = 0) || start.pop()) && ((ofType ? node.nodeName.toLowerCase() !== name : 1 !== node.nodeType) || !++diff || (useCache && ((node[expando] || (node[expando] = {}))[type] = [dirruns, diff]), node !== elem)););
                                    return diff -= last, diff === first || 0 === diff % first && diff / first >= 0
                                }
                            }
                        },
                        PSEUDO: function(pseudo, argument) {
                            var args, fn = Expr.pseudos[pseudo] || Expr.setFilters[pseudo.toLowerCase()] || Sizzle.error("unsupported pseudo: " + pseudo);
                            return fn[expando] ? fn(argument) : fn.length > 1 ? (args = [pseudo, pseudo, "", argument], Expr.setFilters.hasOwnProperty(pseudo.toLowerCase()) ? markFunction(function(seed, matches) {
                                for (var idx, matched = fn(seed, argument), i = matched.length; i--;) idx = indexOf.call(seed, matched[i]), seed[idx] = !(matches[idx] = matched[i])
                            }) : function(elem) {
                                return fn(elem, 0, args)
                            }) : fn
                        }
                    },
                    pseudos: {
                        not: markFunction(function(selector) {
                            var input = [],
                                results = [],
                                matcher = compile(selector.replace(rtrim, "$1"));
                            return matcher[expando] ? markFunction(function(seed, matches, context, xml) {
                                for (var elem, unmatched = matcher(seed, null, xml, []), i = seed.length; i--;)(elem = unmatched[i]) && (seed[i] = !(matches[i] = elem))
                            }) : function(elem, context, xml) {
                                return input[0] = elem, matcher(input, null, xml, results), !results.pop()
                            }
                        }),
                        has: markFunction(function(selector) {
                            return function(elem) {
                                return Sizzle(selector, elem).length > 0
                            }
                        }),
                        contains: markFunction(function(text) {
                            return function(elem) {
                                return (elem.textContent || elem.innerText || getText(elem)).indexOf(text) > -1
                            }
                        }),
                        lang: markFunction(function(lang) {
                            return ridentifier.test(lang || "") || Sizzle.error("unsupported lang: " + lang), lang = lang.replace(runescape, funescape).toLowerCase(),
                                function(elem) {
                                    var elemLang;
                                    do
                                        if (elemLang = documentIsHTML ? elem.lang : elem.getAttribute("xml:lang") || elem.getAttribute("lang")) return elemLang = elemLang.toLowerCase(), elemLang === lang || 0 === elemLang.indexOf(lang + "-");
                                    while ((elem = elem.parentNode) && 1 === elem.nodeType);
                                    return !1
                                }
                        }),
                        target: function(elem) {
                            var hash = window.location && window.location.hash;
                            return hash && hash.slice(1) === elem.id
                        },
                        root: function(elem) {
                            return elem === docElem
                        },
                        focus: function(elem) {
                            return elem === document.activeElement && (!document.hasFocus || document.hasFocus()) && !!(elem.type || elem.href || ~elem.tabIndex)
                        },
                        enabled: function(elem) {
                            return elem.disabled === !1
                        },
                        disabled: function(elem) {
                            return elem.disabled === !0
                        },
                        checked: function(elem) {
                            var nodeName = elem.nodeName.toLowerCase();
                            return "input" === nodeName && !!elem.checked || "option" === nodeName && !!elem.selected
                        },
                        selected: function(elem) {
                            return elem.parentNode && elem.parentNode.selectedIndex, elem.selected === !0
                        },
                        empty: function(elem) {
                            for (elem = elem.firstChild; elem; elem = elem.nextSibling)
                                if (elem.nodeType < 6) return !1;
                            return !0
                        },
                        parent: function(elem) {
                            return !Expr.pseudos.empty(elem)
                        },
                        header: function(elem) {
                            return rheader.test(elem.nodeName)
                        },
                        input: function(elem) {
                            return rinputs.test(elem.nodeName)
                        },
                        button: function(elem) {
                            var name = elem.nodeName.toLowerCase();
                            return "input" === name && "button" === elem.type || "button" === name
                        },
                        text: function(elem) {
                            var attr;
                            return "input" === elem.nodeName.toLowerCase() && "text" === elem.type && (null == (attr = elem.getAttribute("type")) || "text" === attr.toLowerCase())
                        },
                        first: createPositionalPseudo(function() {
                            return [0]
                        }),
                        last: createPositionalPseudo(function(matchIndexes, length) {
                            return [length - 1]
                        }),
                        eq: createPositionalPseudo(function(matchIndexes, length, argument) {
                            return [0 > argument ? argument + length : argument]
                        }),
                        even: createPositionalPseudo(function(matchIndexes, length) {
                            for (var i = 0; length > i; i += 2) matchIndexes.push(i);
                            return matchIndexes
                        }),
                        odd: createPositionalPseudo(function(matchIndexes, length) {
                            for (var i = 1; length > i; i += 2) matchIndexes.push(i);
                            return matchIndexes
                        }),
                        lt: createPositionalPseudo(function(matchIndexes, length, argument) {
                            for (var i = 0 > argument ? argument + length : argument; --i >= 0;) matchIndexes.push(i);
                            return matchIndexes
                        }),
                        gt: createPositionalPseudo(function(matchIndexes, length, argument) {
                            for (var i = 0 > argument ? argument + length : argument; ++i < length;) matchIndexes.push(i);
                            return matchIndexes
                        })
                    }
                }, Expr.pseudos.nth = Expr.pseudos.eq;
                for (i in {
                        radio: !0,
                        checkbox: !0,
                        file: !0,
                        password: !0,
                        image: !0
                    }) Expr.pseudos[i] = createInputPseudo(i);
                for (i in {
                        submit: !0,
                        reset: !0
                    }) Expr.pseudos[i] = createButtonPseudo(i);
                return setFilters.prototype = Expr.filters = Expr.pseudos, Expr.setFilters = new setFilters, tokenize = Sizzle.tokenize = function(selector, parseOnly) {
                    var matched, match, tokens, type, soFar, groups, preFilters, cached = tokenCache[selector + " "];
                    if (cached) return parseOnly ? 0 : cached.slice(0);
                    for (soFar = selector, groups = [], preFilters = Expr.preFilter; soFar;) {
                        (!matched || (match = rcomma.exec(soFar))) && (match && (soFar = soFar.slice(match[0].length) || soFar), groups.push(tokens = [])), matched = !1, (match = rcombinators.exec(soFar)) && (matched = match.shift(), tokens.push({
                            value: matched,
                            type: match[0].replace(rtrim, " ")
                        }), soFar = soFar.slice(matched.length));
                        for (type in Expr.filter) !(match = matchExpr[type].exec(soFar)) || preFilters[type] && !(match = preFilters[type](match)) || (matched = match.shift(), tokens.push({
                            value: matched,
                            type: type,
                            matches: match
                        }), soFar = soFar.slice(matched.length));
                        if (!matched) break
                    }
                    return parseOnly ? soFar.length : soFar ? Sizzle.error(selector) : tokenCache(selector, groups).slice(0)
                }, compile = Sizzle.compile = function(selector, match) {
                    var i, setMatchers = [],
                        elementMatchers = [],
                        cached = compilerCache[selector + " "];
                    if (!cached) {
                        for (match || (match = tokenize(selector)), i = match.length; i--;) cached = matcherFromTokens(match[i]), cached[expando] ? setMatchers.push(cached) : elementMatchers.push(cached);
                        cached = compilerCache(selector, matcherFromGroupMatchers(elementMatchers, setMatchers)), cached.selector = selector
                    }
                    return cached
                }, select = Sizzle.select = function(selector, context, results, seed) {
                    var i, tokens, token, type, find, compiled = "function" == typeof selector && selector,
                        match = !seed && tokenize(selector = compiled.selector || selector);
                    if (results = results || [], 1 === match.length) {
                        if (tokens = match[0] = match[0].slice(0), tokens.length > 2 && "ID" === (token = tokens[0]).type && support.getById && 9 === context.nodeType && documentIsHTML && Expr.relative[tokens[1].type]) {
                            if (context = (Expr.find.ID(token.matches[0].replace(runescape, funescape), context) || [])[0], !context) return results;
                            compiled && (context = context.parentNode), selector = selector.slice(tokens.shift().value.length)
                        }
                        for (i = matchExpr.needsContext.test(selector) ? 0 : tokens.length; i-- && (token = tokens[i], !Expr.relative[type = token.type]);)
                            if ((find = Expr.find[type]) && (seed = find(token.matches[0].replace(runescape, funescape), rsibling.test(tokens[0].type) && testContext(context.parentNode) || context))) {
                                if (tokens.splice(i, 1), selector = seed.length && toSelector(tokens), !selector) return push.apply(results, seed), results;
                                break
                            }
                    }
                    return (compiled || compile(selector, match))(seed, context, !documentIsHTML, results, rsibling.test(selector) && testContext(context.parentNode) || context), results
                }, support.sortStable = expando.split("").sort(sortOrder).join("") === expando, support.detectDuplicates = !!hasDuplicate, setDocument(), support.sortDetached = assert(function(div1) {
                    return 1 & div1.compareDocumentPosition(document.createElement("div"))
                }), assert(function(div) {
                    return div.innerHTML = "<a href='#'></a>", "#" === div.firstChild.getAttribute("href")
                }) || addHandle("type|href|height|width", function(elem, name, isXML) {
                    return isXML ? void 0 : elem.getAttribute(name, "type" === name.toLowerCase() ? 1 : 2)
                }), support.attributes && assert(function(div) {
                    return div.innerHTML = "<input/>", div.firstChild.setAttribute("value", ""), "" === div.firstChild.getAttribute("value")
                }) || addHandle("value", function(elem, name, isXML) {
                    return isXML || "input" !== elem.nodeName.toLowerCase() ? void 0 : elem.defaultValue
                }), assert(function(div) {
                    return null == div.getAttribute("disabled")
                }) || addHandle(booleans, function(elem, name, isXML) {
                    var val;
                    return isXML ? void 0 : elem[name] === !0 ? name.toLowerCase() : (val = elem.getAttributeNode(name)) && val.specified ? val.value : null
                }), Sizzle
            }(window);
        jQuery.find = Sizzle, jQuery.expr = Sizzle.selectors, jQuery.expr[":"] = jQuery.expr.pseudos, jQuery.unique = Sizzle.uniqueSort, jQuery.text = Sizzle.getText, jQuery.isXMLDoc = Sizzle.isXML, jQuery.contains = Sizzle.contains;
        var rneedsContext = jQuery.expr.match.needsContext,
            rsingleTag = /^<(\w+)\s*\/?>(?:<\/\1>|)$/,
            risSimple = /^.[^:#\[\.,]*$/;
        jQuery.filter = function(expr, elems, not) {
            var elem = elems[0];
            return not && (expr = ":not(" + expr + ")"), 1 === elems.length && 1 === elem.nodeType ? jQuery.find.matchesSelector(elem, expr) ? [elem] : [] : jQuery.find.matches(expr, jQuery.grep(elems, function(elem) {
                return 1 === elem.nodeType
            }))
        }, jQuery.fn.extend({
            find: function(selector) {
                var i, ret = [],
                    self = this,
                    len = self.length;
                if ("string" != typeof selector) return this.pushStack(jQuery(selector).filter(function() {
                    for (i = 0; len > i; i++)
                        if (jQuery.contains(self[i], this)) return !0
                }));
                for (i = 0; len > i; i++) jQuery.find(selector, self[i], ret);
                return ret = this.pushStack(len > 1 ? jQuery.unique(ret) : ret), ret.selector = this.selector ? this.selector + " " + selector : selector, ret
            },
            filter: function(selector) {
                return this.pushStack(winnow(this, selector || [], !1))
            },
            not: function(selector) {
                return this.pushStack(winnow(this, selector || [], !0))
            },
            is: function(selector) {
                return !!winnow(this, "string" == typeof selector && rneedsContext.test(selector) ? jQuery(selector) : selector || [], !1).length
            }
        });
        var rootjQuery, document = window.document,
            rquickExpr = /^(?:\s*(<[\w\W]+>)[^>]*|#([\w-]*))$/,
            init = jQuery.fn.init = function(selector, context) {
                var match, elem;
                if (!selector) return this;
                if ("string" == typeof selector) {
                    if (match = "<" === selector.charAt(0) && ">" === selector.charAt(selector.length - 1) && selector.length >= 3 ? [null, selector, null] : rquickExpr.exec(selector), !match || !match[1] && context) return !context || context.jquery ? (context || rootjQuery).find(selector) : this.constructor(context).find(selector);
                    if (match[1]) {
                        if (context = context instanceof jQuery ? context[0] : context, jQuery.merge(this, jQuery.parseHTML(match[1], context && context.nodeType ? context.ownerDocument || context : document, !0)), rsingleTag.test(match[1]) && jQuery.isPlainObject(context))
                            for (match in context) jQuery.isFunction(this[match]) ? this[match](context[match]) : this.attr(match, context[match]);
                        return this
                    }
                    if (elem = document.getElementById(match[2]), elem && elem.parentNode) {
                        if (elem.id !== match[2]) return rootjQuery.find(selector);
                        this.length = 1, this[0] = elem
                    }
                    return this.context = document, this.selector = selector, this
                }
                return selector.nodeType ? (this.context = this[0] = selector, this.length = 1, this) : jQuery.isFunction(selector) ? "undefined" != typeof rootjQuery.ready ? rootjQuery.ready(selector) : selector(jQuery) : (void 0 !== selector.selector && (this.selector = selector.selector, this.context = selector.context), jQuery.makeArray(selector, this))
            };
        init.prototype = jQuery.fn, rootjQuery = jQuery(document);
        var rparentsprev = /^(?:parents|prev(?:Until|All))/,
            guaranteedUnique = {
                children: !0,
                contents: !0,
                next: !0,
                prev: !0
            };
        jQuery.extend({
            dir: function(elem, dir, until) {
                for (var matched = [], cur = elem[dir]; cur && 9 !== cur.nodeType && (void 0 === until || 1 !== cur.nodeType || !jQuery(cur).is(until));) 1 === cur.nodeType && matched.push(cur), cur = cur[dir];
                return matched
            },
            sibling: function(n, elem) {
                for (var r = []; n; n = n.nextSibling) 1 === n.nodeType && n !== elem && r.push(n);
                return r
            }
        }), jQuery.fn.extend({
            has: function(target) {
                var i, targets = jQuery(target, this),
                    len = targets.length;
                return this.filter(function() {
                    for (i = 0; len > i; i++)
                        if (jQuery.contains(this, targets[i])) return !0
                })
            },
            closest: function(selectors, context) {
                for (var cur, i = 0, l = this.length, matched = [], pos = rneedsContext.test(selectors) || "string" != typeof selectors ? jQuery(selectors, context || this.context) : 0; l > i; i++)
                    for (cur = this[i]; cur && cur !== context; cur = cur.parentNode)
                        if (cur.nodeType < 11 && (pos ? pos.index(cur) > -1 : 1 === cur.nodeType && jQuery.find.matchesSelector(cur, selectors))) {
                            matched.push(cur);
                            break
                        }
                return this.pushStack(matched.length > 1 ? jQuery.unique(matched) : matched)
            },
            index: function(elem) {
                return elem ? "string" == typeof elem ? jQuery.inArray(this[0], jQuery(elem)) : jQuery.inArray(elem.jquery ? elem[0] : elem, this) : this[0] && this[0].parentNode ? this.first().prevAll().length : -1
            },
            add: function(selector, context) {
                return this.pushStack(jQuery.unique(jQuery.merge(this.get(), jQuery(selector, context))))
            },
            addBack: function(selector) {
                return this.add(null == selector ? this.prevObject : this.prevObject.filter(selector))
            }
        }), jQuery.each({
            parent: function(elem) {
                var parent = elem.parentNode;
                return parent && 11 !== parent.nodeType ? parent : null
            },
            parents: function(elem) {
                return jQuery.dir(elem, "parentNode")
            },
            parentsUntil: function(elem, i, until) {
                return jQuery.dir(elem, "parentNode", until)
            },
            next: function(elem) {
                return sibling(elem, "nextSibling")
            },
            prev: function(elem) {
                return sibling(elem, "previousSibling")
            },
            nextAll: function(elem) {
                return jQuery.dir(elem, "nextSibling")
            },
            prevAll: function(elem) {
                return jQuery.dir(elem, "previousSibling")
            },
            nextUntil: function(elem, i, until) {
                return jQuery.dir(elem, "nextSibling", until)
            },
            prevUntil: function(elem, i, until) {
                return jQuery.dir(elem, "previousSibling", until)
            },
            siblings: function(elem) {
                return jQuery.sibling((elem.parentNode || {}).firstChild, elem)
            },
            children: function(elem) {
                return jQuery.sibling(elem.firstChild)
            },
            contents: function(elem) {
                return jQuery.nodeName(elem, "iframe") ? elem.contentDocument || elem.contentWindow.document : jQuery.merge([], elem.childNodes)
            }
        }, function(name, fn) {
            jQuery.fn[name] = function(until, selector) {
                var ret = jQuery.map(this, fn, until);
                return "Until" !== name.slice(-5) && (selector = until), selector && "string" == typeof selector && (ret = jQuery.filter(selector, ret)), this.length > 1 && (guaranteedUnique[name] || (ret = jQuery.unique(ret)), rparentsprev.test(name) && (ret = ret.reverse())), this.pushStack(ret)
            }
        });
        var rnotwhite = /\S+/g,
            optionsCache = {};
        jQuery.Callbacks = function(options) {
            options = "string" == typeof options ? optionsCache[options] || createOptions(options) : jQuery.extend({}, options);
            var firing, memory, fired, firingLength, firingIndex, firingStart, list = [],
                stack = !options.once && [],
                fire = function(data) {
                    for (memory = options.memory && data, fired = !0, firingIndex = firingStart || 0, firingStart = 0, firingLength = list.length, firing = !0; list && firingLength > firingIndex; firingIndex++)
                        if (list[firingIndex].apply(data[0], data[1]) === !1 && options.stopOnFalse) {
                            memory = !1;
                            break
                        }
                    firing = !1, list && (stack ? stack.length && fire(stack.shift()) : memory ? list = [] : self.disable())
                },
                self = {
                    add: function() {
                        if (list) {
                            var start = list.length;
                            ! function add(args) {
                                jQuery.each(args, function(_, arg) {
                                    var type = jQuery.type(arg);
                                    "function" === type ? options.unique && self.has(arg) || list.push(arg) : arg && arg.length && "string" !== type && add(arg)
                                })
                            }(arguments), firing ? firingLength = list.length : memory && (firingStart = start, fire(memory))
                        }
                        return this
                    },
                    remove: function() {
                        return list && jQuery.each(arguments, function(_, arg) {
                            for (var index;
                                (index = jQuery.inArray(arg, list, index)) > -1;) list.splice(index, 1), firing && (firingLength >= index && firingLength--, firingIndex >= index && firingIndex--)
                        }), this
                    },
                    has: function(fn) {
                        return fn ? jQuery.inArray(fn, list) > -1 : !(!list || !list.length)
                    },
                    empty: function() {
                        return list = [], firingLength = 0, this
                    },
                    disable: function() {
                        return list = stack = memory = void 0, this
                    },
                    disabled: function() {
                        return !list
                    },
                    lock: function() {
                        return stack = void 0, memory || self.disable(), this
                    },
                    locked: function() {
                        return !stack
                    },
                    fireWith: function(context, args) {
                        return !list || fired && !stack || (args = args || [], args = [context, args.slice ? args.slice() : args], firing ? stack.push(args) : fire(args)), this
                    },
                    fire: function() {
                        return self.fireWith(this, arguments), this
                    },
                    fired: function() {
                        return !!fired
                    }
                };
            return self
        }, jQuery.extend({
            Deferred: function(func) {
                var tuples = [
                        ["resolve", "done", jQuery.Callbacks("once memory"), "resolved"],
                        ["reject", "fail", jQuery.Callbacks("once memory"), "rejected"],
                        ["notify", "progress", jQuery.Callbacks("memory")]
                    ],
                    state = "pending",
                    promise = {
                        state: function() {
                            return state
                        },
                        always: function() {
                            return deferred.done(arguments).fail(arguments), this
                        },
                        then: function() {
                            var fns = arguments;
                            return jQuery.Deferred(function(newDefer) {
                                jQuery.each(tuples, function(i, tuple) {
                                    var fn = jQuery.isFunction(fns[i]) && fns[i];
                                    deferred[tuple[1]](function() {
                                        var returned = fn && fn.apply(this, arguments);
                                        returned && jQuery.isFunction(returned.promise) ? returned.promise().done(newDefer.resolve).fail(newDefer.reject).progress(newDefer.notify) : newDefer[tuple[0] + "With"](this === promise ? newDefer.promise() : this, fn ? [returned] : arguments)
                                    })
                                }), fns = null
                            }).promise()
                        },
                        promise: function(obj) {
                            return null != obj ? jQuery.extend(obj, promise) : promise
                        }
                    },
                    deferred = {};
                return promise.pipe = promise.then, jQuery.each(tuples, function(i, tuple) {
                    var list = tuple[2],
                        stateString = tuple[3];
                    promise[tuple[1]] = list.add, stateString && list.add(function() {
                        state = stateString
                    }, tuples[1 ^ i][2].disable, tuples[2][2].lock), deferred[tuple[0]] = function() {
                        return deferred[tuple[0] + "With"](this === deferred ? promise : this, arguments), this
                    }, deferred[tuple[0] + "With"] = list.fireWith
                }), promise.promise(deferred), func && func.call(deferred, deferred), deferred
            },
            when: function(subordinate) {
                var progressValues, progressContexts, resolveContexts, i = 0,
                    resolveValues = slice.call(arguments),
                    length = resolveValues.length,
                    remaining = 1 !== length || subordinate && jQuery.isFunction(subordinate.promise) ? length : 0,
                    deferred = 1 === remaining ? subordinate : jQuery.Deferred(),
                    updateFunc = function(i, contexts, values) {
                        return function(value) {
                            contexts[i] = this, values[i] = arguments.length > 1 ? slice.call(arguments) : value, values === progressValues ? deferred.notifyWith(contexts, values) : --remaining || deferred.resolveWith(contexts, values)
                        }
                    };
                if (length > 1)
                    for (progressValues = new Array(length), progressContexts = new Array(length), resolveContexts = new Array(length); length > i; i++) resolveValues[i] && jQuery.isFunction(resolveValues[i].promise) ? resolveValues[i].promise().done(updateFunc(i, resolveContexts, resolveValues)).fail(deferred.reject).progress(updateFunc(i, progressContexts, progressValues)) : --remaining;
                return remaining || deferred.resolveWith(resolveContexts, resolveValues), deferred.promise()
            }
        });
        var readyList;
        jQuery.fn.ready = function(fn) {
            return jQuery.ready.promise().done(fn), this
        }, jQuery.extend({
            isReady: !1,
            readyWait: 1,
            holdReady: function(hold) {
                hold ? jQuery.readyWait++ : jQuery.ready(!0)
            },
            ready: function(wait) {
                if (wait === !0 ? !--jQuery.readyWait : !jQuery.isReady) {
                    if (!document.body) return setTimeout(jQuery.ready);
                    jQuery.isReady = !0, wait !== !0 && --jQuery.readyWait > 0 || (readyList.resolveWith(document, [jQuery]), jQuery.fn.triggerHandler && (jQuery(document).triggerHandler("ready"), jQuery(document).off("ready")))
                }
            }
        }), jQuery.ready.promise = function(obj) {
            if (!readyList)
                if (readyList = jQuery.Deferred(), "complete" === document.readyState) setTimeout(jQuery.ready);
                else if (document.addEventListener) document.addEventListener("DOMContentLoaded", completed, !1), window.addEventListener("load", completed, !1);
            else {
                document.attachEvent("onreadystatechange", completed), window.attachEvent("onload", completed);
                var top = !1;
                try {
                    top = null == window.frameElement && document.documentElement
                } catch (e) {}
                top && top.doScroll && function doScrollCheck() {
                    if (!jQuery.isReady) {
                        try {
                            top.doScroll("left")
                        } catch (e) {
                            return setTimeout(doScrollCheck, 50)
                        }
                        detach(), jQuery.ready()
                    }
                }()
            }
            return readyList.promise(obj)
        };
        var i, strundefined = "undefined";
        for (i in jQuery(support)) break;
        support.ownLast = "0" !== i, support.inlineBlockNeedsLayout = !1, jQuery(function() {
                var val, div, body, container;
                body = document.getElementsByTagName("body")[0], body && body.style && (div = document.createElement("div"), container = document.createElement("div"), container.style.cssText = "position:absolute;border:0;width:0;height:0;top:0;left:-9999px", body.appendChild(container).appendChild(div), typeof div.style.zoom !== strundefined && (div.style.cssText = "display:inline;margin:0;border:0;padding:1px;width:1px;zoom:1", support.inlineBlockNeedsLayout = val = 3 === div.offsetWidth, val && (body.style.zoom = 1)), body.removeChild(container))
            }),
            function() {
                var div = document.createElement("div");
                if (null == support.deleteExpando) {
                    support.deleteExpando = !0;
                    try {
                        delete div.test
                    } catch (e) {
                        support.deleteExpando = !1
                    }
                }
                div = null
            }(), jQuery.acceptData = function(elem) {
                var noData = jQuery.noData[(elem.nodeName + " ").toLowerCase()],
                    nodeType = +elem.nodeType || 1;
                return 1 !== nodeType && 9 !== nodeType ? !1 : !noData || noData !== !0 && elem.getAttribute("classid") === noData
            };
        var rbrace = /^(?:\{[\w\W]*\}|\[[\w\W]*\])$/,
            rmultiDash = /([A-Z])/g;
        jQuery.extend({
            cache: {},
            noData: {
                "applet ": !0,
                "embed ": !0,
                "object ": "clsid:D27CDB6E-AE6D-11cf-96B8-444553540000"
            },
            hasData: function(elem) {
                return elem = elem.nodeType ? jQuery.cache[elem[jQuery.expando]] : elem[jQuery.expando], !!elem && !isEmptyDataObject(elem)
            },
            data: function(elem, name, data) {
                return internalData(elem, name, data)
            },
            removeData: function(elem, name) {
                return internalRemoveData(elem, name)
            },
            _data: function(elem, name, data) {
                return internalData(elem, name, data, !0)
            },
            _removeData: function(elem, name) {
                return internalRemoveData(elem, name, !0)
            }
        }), jQuery.fn.extend({
            data: function(key, value) {
                var i, name, data, elem = this[0],
                    attrs = elem && elem.attributes;
                if (void 0 === key) {
                    if (this.length && (data = jQuery.data(elem), 1 === elem.nodeType && !jQuery._data(elem, "parsedAttrs"))) {
                        for (i = attrs.length; i--;) attrs[i] && (name = attrs[i].name, 0 === name.indexOf("data-") && (name = jQuery.camelCase(name.slice(5)), dataAttr(elem, name, data[name])));
                        jQuery._data(elem, "parsedAttrs", !0)
                    }
                    return data
                }
                return "object" == typeof key ? this.each(function() {
                    jQuery.data(this, key)
                }) : arguments.length > 1 ? this.each(function() {
                    jQuery.data(this, key, value)
                }) : elem ? dataAttr(elem, key, jQuery.data(elem, key)) : void 0
            },
            removeData: function(key) {
                return this.each(function() {
                    jQuery.removeData(this, key)
                })
            }
        }), jQuery.extend({
            queue: function(elem, type, data) {
                var queue;
                return elem ? (type = (type || "fx") + "queue", queue = jQuery._data(elem, type), data && (!queue || jQuery.isArray(data) ? queue = jQuery._data(elem, type, jQuery.makeArray(data)) : queue.push(data)), queue || []) : void 0
            },
            dequeue: function(elem, type) {
                type = type || "fx";
                var queue = jQuery.queue(elem, type),
                    startLength = queue.length,
                    fn = queue.shift(),
                    hooks = jQuery._queueHooks(elem, type),
                    next = function() {
                        jQuery.dequeue(elem, type)
                    };
                "inprogress" === fn && (fn = queue.shift(), startLength--), fn && ("fx" === type && queue.unshift("inprogress"), delete hooks.stop, fn.call(elem, next, hooks)), !startLength && hooks && hooks.empty.fire()
            },
            _queueHooks: function(elem, type) {
                var key = type + "queueHooks";
                return jQuery._data(elem, key) || jQuery._data(elem, key, {
                    empty: jQuery.Callbacks("once memory").add(function() {
                        jQuery._removeData(elem, type + "queue"), jQuery._removeData(elem, key)
                    })
                })
            }
        }), jQuery.fn.extend({
            queue: function(type, data) {
                var setter = 2;
                return "string" != typeof type && (data = type, type = "fx", setter--), arguments.length < setter ? jQuery.queue(this[0], type) : void 0 === data ? this : this.each(function() {
                    var queue = jQuery.queue(this, type, data);
                    jQuery._queueHooks(this, type), "fx" === type && "inprogress" !== queue[0] && jQuery.dequeue(this, type)
                })
            },
            dequeue: function(type) {
                return this.each(function() {
                    jQuery.dequeue(this, type)
                })
            },
            clearQueue: function(type) {
                return this.queue(type || "fx", [])
            },
            promise: function(type, obj) {
                var tmp, count = 1,
                    defer = jQuery.Deferred(),
                    elements = this,
                    i = this.length,
                    resolve = function() {
                        --count || defer.resolveWith(elements, [elements])
                    };
                for ("string" != typeof type && (obj = type, type = void 0), type = type || "fx"; i--;) tmp = jQuery._data(elements[i], type + "queueHooks"), tmp && tmp.empty && (count++, tmp.empty.add(resolve));
                return resolve(), defer.promise(obj)
            }
        });
        var pnum = /[+-]?(?:\d*\.|)\d+(?:[eE][+-]?\d+|)/.source,
            cssExpand = ["Top", "Right", "Bottom", "Left"],
            isHidden = function(elem, el) {
                return elem = el || elem, "none" === jQuery.css(elem, "display") || !jQuery.contains(elem.ownerDocument, elem)
            },
            access = jQuery.access = function(elems, fn, key, value, chainable, emptyGet, raw) {
                var i = 0,
                    length = elems.length,
                    bulk = null == key;
                if ("object" === jQuery.type(key)) {
                    chainable = !0;
                    for (i in key) jQuery.access(elems, fn, i, key[i], !0, emptyGet, raw)
                } else if (void 0 !== value && (chainable = !0, jQuery.isFunction(value) || (raw = !0), bulk && (raw ? (fn.call(elems, value), fn = null) : (bulk = fn, fn = function(elem, key, value) {
                        return bulk.call(jQuery(elem), value)
                    })), fn))
                    for (; length > i; i++) fn(elems[i], key, raw ? value : value.call(elems[i], i, fn(elems[i], key)));
                return chainable ? elems : bulk ? fn.call(elems) : length ? fn(elems[0], key) : emptyGet
            },
            rcheckableType = /^(?:checkbox|radio)$/i;
        ! function() {
            var input = document.createElement("input"),
                div = document.createElement("div"),
                fragment = document.createDocumentFragment();
            if (div.innerHTML = "  <link/><table></table><a href='/a'>a</a><input type='checkbox'/>", support.leadingWhitespace = 3 === div.firstChild.nodeType, support.tbody = !div.getElementsByTagName("tbody").length, support.htmlSerialize = !!div.getElementsByTagName("link").length, support.html5Clone = "<:nav></:nav>" !== document.createElement("nav").cloneNode(!0).outerHTML, input.type = "checkbox", input.checked = !0, fragment.appendChild(input), support.appendChecked = input.checked, div.innerHTML = "<textarea>x</textarea>", support.noCloneChecked = !!div.cloneNode(!0).lastChild.defaultValue, fragment.appendChild(div), div.innerHTML = "<input type='radio' checked='checked' name='t'/>", support.checkClone = div.cloneNode(!0).cloneNode(!0).lastChild.checked, support.noCloneEvent = !0, div.attachEvent && (div.attachEvent("onclick", function() {
                    support.noCloneEvent = !1
                }), div.cloneNode(!0).click()), null == support.deleteExpando) {
                support.deleteExpando = !0;
                try {
                    delete div.test
                } catch (e) {
                    support.deleteExpando = !1
                }
            }
        }(),
        function() {
            var i, eventName, div = document.createElement("div");
            for (i in {
                    submit: !0,
                    change: !0,
                    focusin: !0
                }) eventName = "on" + i, (support[i + "Bubbles"] = eventName in window) || (div.setAttribute(eventName, "t"), support[i + "Bubbles"] = div.attributes[eventName].expando === !1);
            div = null
        }();
        var rformElems = /^(?:input|select|textarea)$/i,
            rkeyEvent = /^key/,
            rmouseEvent = /^(?:mouse|pointer|contextmenu)|click/,
            rfocusMorph = /^(?:focusinfocus|focusoutblur)$/,
            rtypenamespace = /^([^.]*)(?:\.(.+)|)$/;
        jQuery.event = {
            global: {},
            add: function(elem, types, handler, data, selector) {
                var tmp, events, t, handleObjIn, special, eventHandle, handleObj, handlers, type, namespaces, origType, elemData = jQuery._data(elem);
                if (elemData) {
                    for (handler.handler && (handleObjIn = handler, handler = handleObjIn.handler, selector = handleObjIn.selector), handler.guid || (handler.guid = jQuery.guid++), (events = elemData.events) || (events = elemData.events = {}), (eventHandle = elemData.handle) || (eventHandle = elemData.handle = function(e) {
                            return typeof jQuery === strundefined || e && jQuery.event.triggered === e.type ? void 0 : jQuery.event.dispatch.apply(eventHandle.elem, arguments)
                        }, eventHandle.elem = elem), types = (types || "").match(rnotwhite) || [""], t = types.length; t--;) tmp = rtypenamespace.exec(types[t]) || [], type = origType = tmp[1], namespaces = (tmp[2] || "").split(".").sort(), type && (special = jQuery.event.special[type] || {}, type = (selector ? special.delegateType : special.bindType) || type, special = jQuery.event.special[type] || {}, handleObj = jQuery.extend({
                        type: type,
                        origType: origType,
                        data: data,
                        handler: handler,
                        guid: handler.guid,
                        selector: selector,
                        needsContext: selector && jQuery.expr.match.needsContext.test(selector),
                        namespace: namespaces.join(".")
                    }, handleObjIn), (handlers = events[type]) || (handlers = events[type] = [], handlers.delegateCount = 0, special.setup && special.setup.call(elem, data, namespaces, eventHandle) !== !1 || (elem.addEventListener ? elem.addEventListener(type, eventHandle, !1) : elem.attachEvent && elem.attachEvent("on" + type, eventHandle))), special.add && (special.add.call(elem, handleObj), handleObj.handler.guid || (handleObj.handler.guid = handler.guid)), selector ? handlers.splice(handlers.delegateCount++, 0, handleObj) : handlers.push(handleObj), jQuery.event.global[type] = !0);
                    elem = null
                }
            },
            remove: function(elem, types, handler, selector, mappedTypes) {
                var j, handleObj, tmp, origCount, t, events, special, handlers, type, namespaces, origType, elemData = jQuery.hasData(elem) && jQuery._data(elem);
                if (elemData && (events = elemData.events)) {
                    for (types = (types || "").match(rnotwhite) || [""], t = types.length; t--;)
                        if (tmp = rtypenamespace.exec(types[t]) || [], type = origType = tmp[1], namespaces = (tmp[2] || "").split(".").sort(), type) {
                            for (special = jQuery.event.special[type] || {}, type = (selector ? special.delegateType : special.bindType) || type, handlers = events[type] || [], tmp = tmp[2] && new RegExp("(^|\\.)" + namespaces.join("\\.(?:.*\\.|)") + "(\\.|$)"), origCount = j = handlers.length; j--;) handleObj = handlers[j], !mappedTypes && origType !== handleObj.origType || handler && handler.guid !== handleObj.guid || tmp && !tmp.test(handleObj.namespace) || selector && selector !== handleObj.selector && ("**" !== selector || !handleObj.selector) || (handlers.splice(j, 1), handleObj.selector && handlers.delegateCount--, special.remove && special.remove.call(elem, handleObj));
                            origCount && !handlers.length && (special.teardown && special.teardown.call(elem, namespaces, elemData.handle) !== !1 || jQuery.removeEvent(elem, type, elemData.handle), delete events[type])
                        } else
                            for (type in events) jQuery.event.remove(elem, type + types[t], handler, selector, !0);
                    jQuery.isEmptyObject(events) && (delete elemData.handle, jQuery._removeData(elem, "events"))
                }
            },
            trigger: function(event, data, elem, onlyHandlers) {
                var handle, ontype, cur, bubbleType, special, tmp, i, eventPath = [elem || document],
                    type = hasOwn.call(event, "type") ? event.type : event,
                    namespaces = hasOwn.call(event, "namespace") ? event.namespace.split(".") : [];
                if (cur = tmp = elem = elem || document, 3 !== elem.nodeType && 8 !== elem.nodeType && !rfocusMorph.test(type + jQuery.event.triggered) && (type.indexOf(".") >= 0 && (namespaces = type.split("."), type = namespaces.shift(), namespaces.sort()), ontype = type.indexOf(":") < 0 && "on" + type, event = event[jQuery.expando] ? event : new jQuery.Event(type, "object" == typeof event && event), event.isTrigger = onlyHandlers ? 2 : 3, event.namespace = namespaces.join("."), event.namespace_re = event.namespace ? new RegExp("(^|\\.)" + namespaces.join("\\.(?:.*\\.|)") + "(\\.|$)") : null, event.result = void 0, event.target || (event.target = elem), data = null == data ? [event] : jQuery.makeArray(data, [event]), special = jQuery.event.special[type] || {}, onlyHandlers || !special.trigger || special.trigger.apply(elem, data) !== !1)) {
                    if (!onlyHandlers && !special.noBubble && !jQuery.isWindow(elem)) {
                        for (bubbleType = special.delegateType || type, rfocusMorph.test(bubbleType + type) || (cur = cur.parentNode); cur; cur = cur.parentNode) eventPath.push(cur), tmp = cur;
                        tmp === (elem.ownerDocument || document) && eventPath.push(tmp.defaultView || tmp.parentWindow || window)
                    }
                    for (i = 0;
                        (cur = eventPath[i++]) && !event.isPropagationStopped();) event.type = i > 1 ? bubbleType : special.bindType || type, handle = (jQuery._data(cur, "events") || {})[event.type] && jQuery._data(cur, "handle"), handle && handle.apply(cur, data), handle = ontype && cur[ontype], handle && handle.apply && jQuery.acceptData(cur) && (event.result = handle.apply(cur, data), event.result === !1 && event.preventDefault());
                    if (event.type = type, !onlyHandlers && !event.isDefaultPrevented() && (!special._default || special._default.apply(eventPath.pop(), data) === !1) && jQuery.acceptData(elem) && ontype && elem[type] && !jQuery.isWindow(elem)) {
                        tmp = elem[ontype], tmp && (elem[ontype] = null), jQuery.event.triggered = type;
                        try {
                            elem[type]()
                        } catch (e) {}
                        jQuery.event.triggered = void 0, tmp && (elem[ontype] = tmp)
                    }
                    return event.result
                }
            },
            dispatch: function(event) {
                event = jQuery.event.fix(event);
                var i, ret, handleObj, matched, j, handlerQueue = [],
                    args = slice.call(arguments),
                    handlers = (jQuery._data(this, "events") || {})[event.type] || [],
                    special = jQuery.event.special[event.type] || {};
                if (args[0] = event, event.delegateTarget = this, !special.preDispatch || special.preDispatch.call(this, event) !== !1) {
                    for (handlerQueue = jQuery.event.handlers.call(this, event, handlers), i = 0;
                        (matched = handlerQueue[i++]) && !event.isPropagationStopped();)
                        for (event.currentTarget = matched.elem, j = 0;
                            (handleObj = matched.handlers[j++]) && !event.isImmediatePropagationStopped();)(!event.namespace_re || event.namespace_re.test(handleObj.namespace)) && (event.handleObj = handleObj, event.data = handleObj.data, ret = ((jQuery.event.special[handleObj.origType] || {}).handle || handleObj.handler).apply(matched.elem, args), void 0 !== ret && (event.result = ret) === !1 && (event.preventDefault(), event.stopPropagation()));
                    return special.postDispatch && special.postDispatch.call(this, event), event.result
                }
            },
            handlers: function(event, handlers) {
                var sel, handleObj, matches, i, handlerQueue = [],
                    delegateCount = handlers.delegateCount,
                    cur = event.target;
                if (delegateCount && cur.nodeType && (!event.button || "click" !== event.type))
                    for (; cur != this; cur = cur.parentNode || this)
                        if (1 === cur.nodeType && (cur.disabled !== !0 || "click" !== event.type)) {
                            for (matches = [], i = 0; delegateCount > i; i++) handleObj = handlers[i], sel = handleObj.selector + " ", void 0 === matches[sel] && (matches[sel] = handleObj.needsContext ? jQuery(sel, this).index(cur) >= 0 : jQuery.find(sel, this, null, [cur]).length), matches[sel] && matches.push(handleObj);
                            matches.length && handlerQueue.push({
                                elem: cur,
                                handlers: matches
                            })
                        }
                return delegateCount < handlers.length && handlerQueue.push({
                    elem: this,
                    handlers: handlers.slice(delegateCount)
                }), handlerQueue
            },
            fix: function(event) {
                if (event[jQuery.expando]) return event;
                var i, prop, copy, type = event.type,
                    originalEvent = event,
                    fixHook = this.fixHooks[type];
                for (fixHook || (this.fixHooks[type] = fixHook = rmouseEvent.test(type) ? this.mouseHooks : rkeyEvent.test(type) ? this.keyHooks : {}), copy = fixHook.props ? this.props.concat(fixHook.props) : this.props, event = new jQuery.Event(originalEvent), i = copy.length; i--;) prop = copy[i], event[prop] = originalEvent[prop];
                return event.target || (event.target = originalEvent.srcElement || document), 3 === event.target.nodeType && (event.target = event.target.parentNode), event.metaKey = !!event.metaKey, fixHook.filter ? fixHook.filter(event, originalEvent) : event
            },
            props: "altKey bubbles cancelable ctrlKey currentTarget eventPhase metaKey relatedTarget shiftKey target timeStamp view which".split(" "),
            fixHooks: {},
            keyHooks: {
                props: "char charCode key keyCode".split(" "),
                filter: function(event, original) {
                    return null == event.which && (event.which = null != original.charCode ? original.charCode : original.keyCode), event
                }
            },
            mouseHooks: {
                props: "button buttons clientX clientY fromElement offsetX offsetY pageX pageY screenX screenY toElement".split(" "),
                filter: function(event, original) {
                    var body, eventDoc, doc, button = original.button,
                        fromElement = original.fromElement;
                    return null == event.pageX && null != original.clientX && (eventDoc = event.target.ownerDocument || document, doc = eventDoc.documentElement, body = eventDoc.body, event.pageX = original.clientX + (doc && doc.scrollLeft || body && body.scrollLeft || 0) - (doc && doc.clientLeft || body && body.clientLeft || 0), event.pageY = original.clientY + (doc && doc.scrollTop || body && body.scrollTop || 0) - (doc && doc.clientTop || body && body.clientTop || 0)), !event.relatedTarget && fromElement && (event.relatedTarget = fromElement === event.target ? original.toElement : fromElement), event.which || void 0 === button || (event.which = 1 & button ? 1 : 2 & button ? 3 : 4 & button ? 2 : 0), event
                }
            },
            special: {
                load: {
                    noBubble: !0
                },
                focus: {
                    trigger: function() {
                        if (this !== safeActiveElement() && this.focus) try {
                            return this.focus(), !1
                        } catch (e) {}
                    },
                    delegateType: "focusin"
                },
                blur: {
                    trigger: function() {
                        return this === safeActiveElement() && this.blur ? (this.blur(), !1) : void 0
                    },
                    delegateType: "focusout"
                },
                click: {
                    trigger: function() {
                        return jQuery.nodeName(this, "input") && "checkbox" === this.type && this.click ? (this.click(), !1) : void 0
                    },
                    _default: function(event) {
                        return jQuery.nodeName(event.target, "a")
                    }
                },
                beforeunload: {
                    postDispatch: function(event) {
                        void 0 !== event.result && event.originalEvent && (event.originalEvent.returnValue = event.result)
                    }
                }
            },
            simulate: function(type, elem, event, bubble) {
                var e = jQuery.extend(new jQuery.Event, event, {
                    type: type,
                    isSimulated: !0,
                    originalEvent: {}
                });
                bubble ? jQuery.event.trigger(e, null, elem) : jQuery.event.dispatch.call(elem, e), e.isDefaultPrevented() && event.preventDefault()
            }
        }, jQuery.removeEvent = document.removeEventListener ? function(elem, type, handle) {
            elem.removeEventListener && elem.removeEventListener(type, handle, !1)
        } : function(elem, type, handle) {
            var name = "on" + type;
            elem.detachEvent && (typeof elem[name] === strundefined && (elem[name] = null), elem.detachEvent(name, handle))
        }, jQuery.Event = function(src, props) {
            return this instanceof jQuery.Event ? (src && src.type ? (this.originalEvent = src, this.type = src.type, this.isDefaultPrevented = src.defaultPrevented || void 0 === src.defaultPrevented && src.returnValue === !1 ? returnTrue : returnFalse) : this.type = src, props && jQuery.extend(this, props), this.timeStamp = src && src.timeStamp || jQuery.now(), this[jQuery.expando] = !0, void 0) : new jQuery.Event(src, props)
        }, jQuery.Event.prototype = {
            isDefaultPrevented: returnFalse,
            isPropagationStopped: returnFalse,
            isImmediatePropagationStopped: returnFalse,
            preventDefault: function() {
                var e = this.originalEvent;
                this.isDefaultPrevented = returnTrue, e && (e.preventDefault ? e.preventDefault() : e.returnValue = !1)
            },
            stopPropagation: function() {
                var e = this.originalEvent;
                this.isPropagationStopped = returnTrue, e && (e.stopPropagation && e.stopPropagation(), e.cancelBubble = !0)
            },
            stopImmediatePropagation: function() {
                var e = this.originalEvent;
                this.isImmediatePropagationStopped = returnTrue, e && e.stopImmediatePropagation && e.stopImmediatePropagation(), this.stopPropagation()
            }
        }, jQuery.each({
            mouseenter: "mouseover",
            mouseleave: "mouseout",
            pointerenter: "pointerover",
            pointerleave: "pointerout"
        }, function(orig, fix) {
            jQuery.event.special[orig] = {
                delegateType: fix,
                bindType: fix,
                handle: function(event) {
                    var ret, target = this,
                        related = event.relatedTarget,
                        handleObj = event.handleObj;
                    return (!related || related !== target && !jQuery.contains(target, related)) && (event.type = handleObj.origType, ret = handleObj.handler.apply(this, arguments), event.type = fix), ret
                }
            }
        }), support.submitBubbles || (jQuery.event.special.submit = {
            setup: function() {
                return jQuery.nodeName(this, "form") ? !1 : (jQuery.event.add(this, "click._submit keypress._submit", function(e) {
                    var elem = e.target,
                        form = jQuery.nodeName(elem, "input") || jQuery.nodeName(elem, "button") ? elem.form : void 0;
                    form && !jQuery._data(form, "submitBubbles") && (jQuery.event.add(form, "submit._submit", function(event) {
                        event._submit_bubble = !0
                    }), jQuery._data(form, "submitBubbles", !0))
                }), void 0)
            },
            postDispatch: function(event) {
                event._submit_bubble && (delete event._submit_bubble, this.parentNode && !event.isTrigger && jQuery.event.simulate("submit", this.parentNode, event, !0))
            },
            teardown: function() {
                return jQuery.nodeName(this, "form") ? !1 : (jQuery.event.remove(this, "._submit"), void 0)
            }
        }), support.changeBubbles || (jQuery.event.special.change = {
            setup: function() {
                return rformElems.test(this.nodeName) ? (("checkbox" === this.type || "radio" === this.type) && (jQuery.event.add(this, "propertychange._change", function(event) {
                    "checked" === event.originalEvent.propertyName && (this._just_changed = !0)
                }), jQuery.event.add(this, "click._change", function(event) {
                    this._just_changed && !event.isTrigger && (this._just_changed = !1), jQuery.event.simulate("change", this, event, !0)
                })), !1) : (jQuery.event.add(this, "beforeactivate._change", function(e) {
                    var elem = e.target;
                    rformElems.test(elem.nodeName) && !jQuery._data(elem, "changeBubbles") && (jQuery.event.add(elem, "change._change", function(event) {
                        !this.parentNode || event.isSimulated || event.isTrigger || jQuery.event.simulate("change", this.parentNode, event, !0)
                    }), jQuery._data(elem, "changeBubbles", !0))
                }), void 0)
            },
            handle: function(event) {
                var elem = event.target;
                return this !== elem || event.isSimulated || event.isTrigger || "radio" !== elem.type && "checkbox" !== elem.type ? event.handleObj.handler.apply(this, arguments) : void 0
            },
            teardown: function() {
                return jQuery.event.remove(this, "._change"), !rformElems.test(this.nodeName)
            }
        }), support.focusinBubbles || jQuery.each({
            focus: "focusin",
            blur: "focusout"
        }, function(orig, fix) {
            var handler = function(event) {
                jQuery.event.simulate(fix, event.target, jQuery.event.fix(event), !0)
            };
            jQuery.event.special[fix] = {
                setup: function() {
                    var doc = this.ownerDocument || this,
                        attaches = jQuery._data(doc, fix);
                    attaches || doc.addEventListener(orig, handler, !0), jQuery._data(doc, fix, (attaches || 0) + 1)
                },
                teardown: function() {
                    var doc = this.ownerDocument || this,
                        attaches = jQuery._data(doc, fix) - 1;
                    attaches ? jQuery._data(doc, fix, attaches) : (doc.removeEventListener(orig, handler, !0), jQuery._removeData(doc, fix))
                }
            }
        }), jQuery.fn.extend({
            on: function(types, selector, data, fn, one) {
                var type, origFn;
                if ("object" == typeof types) {
                    "string" != typeof selector && (data = data || selector, selector = void 0);
                    for (type in types) this.on(type, selector, data, types[type], one);
                    return this
                }
                if (null == data && null == fn ? (fn = selector, data = selector = void 0) : null == fn && ("string" == typeof selector ? (fn = data, data = void 0) : (fn = data, data = selector, selector = void 0)), fn === !1) fn = returnFalse;
                else if (!fn) return this;
                return 1 === one && (origFn = fn, fn = function(event) {
                    return jQuery().off(event), origFn.apply(this, arguments)
                }, fn.guid = origFn.guid || (origFn.guid = jQuery.guid++)), this.each(function() {
                    jQuery.event.add(this, types, fn, data, selector)
                })
            },
            one: function(types, selector, data, fn) {
                return this.on(types, selector, data, fn, 1)
            },
            off: function(types, selector, fn) {
                var handleObj, type;
                if (types && types.preventDefault && types.handleObj) return handleObj = types.handleObj, jQuery(types.delegateTarget).off(handleObj.namespace ? handleObj.origType + "." + handleObj.namespace : handleObj.origType, handleObj.selector, handleObj.handler), this;
                if ("object" == typeof types) {
                    for (type in types) this.off(type, selector, types[type]);
                    return this
                }
                return (selector === !1 || "function" == typeof selector) && (fn = selector, selector = void 0), fn === !1 && (fn = returnFalse), this.each(function() {
                    jQuery.event.remove(this, types, fn, selector)
                })
            },
            trigger: function(type, data) {
                return this.each(function() {
                    jQuery.event.trigger(type, data, this)
                })
            },
            triggerHandler: function(type, data) {
                var elem = this[0];
                return elem ? jQuery.event.trigger(type, data, elem, !0) : void 0
            }
        });
        var nodeNames = "abbr|article|aside|audio|bdi|canvas|data|datalist|details|figcaption|figure|footer|header|hgroup|mark|meter|nav|output|progress|section|summary|time|video",
            rinlinejQuery = / jQuery\d+="(?:null|\d+)"/g,
            rnoshimcache = new RegExp("<(?:" + nodeNames + ")[\\s/>]", "i"),
            rleadingWhitespace = /^\s+/,
            rxhtmlTag = /<(?!area|br|col|embed|hr|img|input|link|meta|param)(([\w:]+)[^>]*)\/>/gi,
            rtagName = /<([\w:]+)/,
            rtbody = /<tbody/i,
            rhtml = /<|&#?\w+;/,
            rnoInnerhtml = /<(?:script|style|link)/i,
            rchecked = /checked\s*(?:[^=]|=\s*.checked.)/i,
            rscriptType = /^$|\/(?:java|ecma)script/i,
            rscriptTypeMasked = /^true\/(.*)/,
            rcleanScript = /^\s*<!(?:\[CDATA\[|--)|(?:\]\]|--)>\s*$/g,
            wrapMap = {
                option: [1, "<select multiple='multiple'>", "</select>"],
                legend: [1, "<fieldset>", "</fieldset>"],
                area: [1, "<map>", "</map>"],
                param: [1, "<object>", "</object>"],
                thead: [1, "<table>", "</table>"],
                tr: [2, "<table><tbody>", "</tbody></table>"],
                col: [2, "<table><tbody></tbody><colgroup>", "</colgroup></table>"],
                td: [3, "<table><tbody><tr>", "</tr></tbody></table>"],
                _default: support.htmlSerialize ? [0, "", ""] : [1, "X<div>", "</div>"]
            },
            safeFragment = createSafeFragment(document),
            fragmentDiv = safeFragment.appendChild(document.createElement("div"));
        wrapMap.optgroup = wrapMap.option, wrapMap.tbody = wrapMap.tfoot = wrapMap.colgroup = wrapMap.caption = wrapMap.thead, wrapMap.th = wrapMap.td, jQuery.extend({
            clone: function(elem, dataAndEvents, deepDataAndEvents) {
                var destElements, node, clone, i, srcElements, inPage = jQuery.contains(elem.ownerDocument, elem);
                if (support.html5Clone || jQuery.isXMLDoc(elem) || !rnoshimcache.test("<" + elem.nodeName + ">") ? clone = elem.cloneNode(!0) : (fragmentDiv.innerHTML = elem.outerHTML, fragmentDiv.removeChild(clone = fragmentDiv.firstChild)), !(support.noCloneEvent && support.noCloneChecked || 1 !== elem.nodeType && 11 !== elem.nodeType || jQuery.isXMLDoc(elem)))
                    for (destElements = getAll(clone), srcElements = getAll(elem), i = 0; null != (node = srcElements[i]); ++i) destElements[i] && fixCloneNodeIssues(node, destElements[i]);
                if (dataAndEvents)
                    if (deepDataAndEvents)
                        for (srcElements = srcElements || getAll(elem), destElements = destElements || getAll(clone), i = 0; null != (node = srcElements[i]); i++) cloneCopyEvent(node, destElements[i]);
                    else cloneCopyEvent(elem, clone);
                return destElements = getAll(clone, "script"), destElements.length > 0 && setGlobalEval(destElements, !inPage && getAll(elem, "script")), destElements = srcElements = node = null, clone
            },
            buildFragment: function(elems, context, scripts, selection) {
                for (var j, elem, contains, tmp, tag, tbody, wrap, l = elems.length, safe = createSafeFragment(context), nodes = [], i = 0; l > i; i++)
                    if (elem = elems[i], elem || 0 === elem)
                        if ("object" === jQuery.type(elem)) jQuery.merge(nodes, elem.nodeType ? [elem] : elem);
                        else if (rhtml.test(elem)) {
                    for (tmp = tmp || safe.appendChild(context.createElement("div")), tag = (rtagName.exec(elem) || ["", ""])[1].toLowerCase(), wrap = wrapMap[tag] || wrapMap._default, tmp.innerHTML = wrap[1] + elem.replace(rxhtmlTag, "<$1></$2>") + wrap[2], j = wrap[0]; j--;) tmp = tmp.lastChild;
                    if (!support.leadingWhitespace && rleadingWhitespace.test(elem) && nodes.push(context.createTextNode(rleadingWhitespace.exec(elem)[0])), !support.tbody)
                        for (elem = "table" !== tag || rtbody.test(elem) ? "<table>" !== wrap[1] || rtbody.test(elem) ? 0 : tmp : tmp.firstChild, j = elem && elem.childNodes.length; j--;) jQuery.nodeName(tbody = elem.childNodes[j], "tbody") && !tbody.childNodes.length && elem.removeChild(tbody);
                    for (jQuery.merge(nodes, tmp.childNodes), tmp.textContent = ""; tmp.firstChild;) tmp.removeChild(tmp.firstChild);
                    tmp = safe.lastChild
                } else nodes.push(context.createTextNode(elem));
                for (tmp && safe.removeChild(tmp), support.appendChecked || jQuery.grep(getAll(nodes, "input"), fixDefaultChecked), i = 0; elem = nodes[i++];)
                    if ((!selection || -1 === jQuery.inArray(elem, selection)) && (contains = jQuery.contains(elem.ownerDocument, elem), tmp = getAll(safe.appendChild(elem), "script"), contains && setGlobalEval(tmp), scripts))
                        for (j = 0; elem = tmp[j++];) rscriptType.test(elem.type || "") && scripts.push(elem);
                return tmp = null, safe
            },
            cleanData: function(elems, acceptData) {
                for (var elem, type, id, data, i = 0, internalKey = jQuery.expando, cache = jQuery.cache, deleteExpando = support.deleteExpando, special = jQuery.event.special; null != (elem = elems[i]); i++)
                    if ((acceptData || jQuery.acceptData(elem)) && (id = elem[internalKey], data = id && cache[id])) {
                        if (data.events)
                            for (type in data.events) special[type] ? jQuery.event.remove(elem, type) : jQuery.removeEvent(elem, type, data.handle);
                        cache[id] && (delete cache[id], deleteExpando ? delete elem[internalKey] : typeof elem.removeAttribute !== strundefined ? elem.removeAttribute(internalKey) : elem[internalKey] = null, deletedIds.push(id))
                    }
            }
        }), jQuery.fn.extend({
            text: function(value) {
                return access(this, function(value) {
                    return void 0 === value ? jQuery.text(this) : this.empty().append((this[0] && this[0].ownerDocument || document).createTextNode(value))
                }, null, value, arguments.length)
            },
            append: function() {
                return this.domManip(arguments, function(elem) {
                    if (1 === this.nodeType || 11 === this.nodeType || 9 === this.nodeType) {
                        var target = manipulationTarget(this, elem);
                        target.appendChild(elem)
                    }
                })
            },
            prepend: function() {
                return this.domManip(arguments, function(elem) {
                    if (1 === this.nodeType || 11 === this.nodeType || 9 === this.nodeType) {
                        var target = manipulationTarget(this, elem);
                        target.insertBefore(elem, target.firstChild)
                    }
                })
            },
            before: function() {
                return this.domManip(arguments, function(elem) {
                    this.parentNode && this.parentNode.insertBefore(elem, this)
                })
            },
            after: function() {
                return this.domManip(arguments, function(elem) {
                    this.parentNode && this.parentNode.insertBefore(elem, this.nextSibling)
                })
            },
            remove: function(selector, keepData) {
                for (var elem, elems = selector ? jQuery.filter(selector, this) : this, i = 0; null != (elem = elems[i]); i++) keepData || 1 !== elem.nodeType || jQuery.cleanData(getAll(elem)), elem.parentNode && (keepData && jQuery.contains(elem.ownerDocument, elem) && setGlobalEval(getAll(elem, "script")), elem.parentNode.removeChild(elem));
                return this
            },
            empty: function() {
                for (var elem, i = 0; null != (elem = this[i]); i++) {
                    for (1 === elem.nodeType && jQuery.cleanData(getAll(elem, !1)); elem.firstChild;) elem.removeChild(elem.firstChild);
                    elem.options && jQuery.nodeName(elem, "select") && (elem.options.length = 0)
                }
                return this
            },
            clone: function(dataAndEvents, deepDataAndEvents) {
                return dataAndEvents = null == dataAndEvents ? !1 : dataAndEvents, deepDataAndEvents = null == deepDataAndEvents ? dataAndEvents : deepDataAndEvents, this.map(function() {
                    return jQuery.clone(this, dataAndEvents, deepDataAndEvents)
                })
            },
            html: function(value) {
                return access(this, function(value) {
                    var elem = this[0] || {},
                        i = 0,
                        l = this.length;
                    if (void 0 === value) return 1 === elem.nodeType ? elem.innerHTML.replace(rinlinejQuery, "") : void 0;
                    if (!("string" != typeof value || rnoInnerhtml.test(value) || !support.htmlSerialize && rnoshimcache.test(value) || !support.leadingWhitespace && rleadingWhitespace.test(value) || wrapMap[(rtagName.exec(value) || ["", ""])[1].toLowerCase()])) {
                        value = value.replace(rxhtmlTag, "<$1></$2>");
                        try {
                            for (; l > i; i++) elem = this[i] || {}, 1 === elem.nodeType && (jQuery.cleanData(getAll(elem, !1)), elem.innerHTML = value);
                            elem = 0
                        } catch (e) {}
                    }
                    elem && this.empty().append(value)
                }, null, value, arguments.length)
            },
            replaceWith: function() {
                var arg = arguments[0];
                return this.domManip(arguments, function(elem) {
                    arg = this.parentNode, jQuery.cleanData(getAll(this)), arg && arg.replaceChild(elem, this)
                }), arg && (arg.length || arg.nodeType) ? this : this.remove()
            },
            detach: function(selector) {
                return this.remove(selector, !0)
            },
            domManip: function(args, callback) {
                args = concat.apply([], args);
                var first, node, hasScripts, scripts, doc, fragment, i = 0,
                    l = this.length,
                    set = this,
                    iNoClone = l - 1,
                    value = args[0],
                    isFunction = jQuery.isFunction(value);
                if (isFunction || l > 1 && "string" == typeof value && !support.checkClone && rchecked.test(value)) return this.each(function(index) {
                    var self = set.eq(index);
                    isFunction && (args[0] = value.call(this, index, self.html())), self.domManip(args, callback)
                });
                if (l && (fragment = jQuery.buildFragment(args, this[0].ownerDocument, !1, this), first = fragment.firstChild, 1 === fragment.childNodes.length && (fragment = first), first)) {
                    for (scripts = jQuery.map(getAll(fragment, "script"), disableScript), hasScripts = scripts.length; l > i; i++) node = fragment, i !== iNoClone && (node = jQuery.clone(node, !0, !0), hasScripts && jQuery.merge(scripts, getAll(node, "script"))), callback.call(this[i], node, i);
                    if (hasScripts)
                        for (doc = scripts[scripts.length - 1].ownerDocument, jQuery.map(scripts, restoreScript), i = 0; hasScripts > i; i++) node = scripts[i], rscriptType.test(node.type || "") && !jQuery._data(node, "globalEval") && jQuery.contains(doc, node) && (node.src ? jQuery._evalUrl && jQuery._evalUrl(node.src) : jQuery.globalEval((node.text || node.textContent || node.innerHTML || "").replace(rcleanScript, "")));
                    fragment = first = null
                }
                return this
            }
        }), jQuery.each({
            appendTo: "append",
            prependTo: "prepend",
            insertBefore: "before",
            insertAfter: "after",
            replaceAll: "replaceWith"
        }, function(name, original) {
            jQuery.fn[name] = function(selector) {
                for (var elems, i = 0, ret = [], insert = jQuery(selector), last = insert.length - 1; last >= i; i++) elems = i === last ? this : this.clone(!0), jQuery(insert[i])[original](elems), push.apply(ret, elems.get());
                return this.pushStack(ret)
            }
        });
        var iframe, elemdisplay = {};
        ! function() {
            var shrinkWrapBlocksVal;
            support.shrinkWrapBlocks = function() {
                if (null != shrinkWrapBlocksVal) return shrinkWrapBlocksVal;
                shrinkWrapBlocksVal = !1;
                var div, body, container;
                return body = document.getElementsByTagName("body")[0], body && body.style ? (div = document.createElement("div"), container = document.createElement("div"), container.style.cssText = "position:absolute;border:0;width:0;height:0;top:0;left:-9999px", body.appendChild(container).appendChild(div), typeof div.style.zoom !== strundefined && (div.style.cssText = "-webkit-box-sizing:content-box;-moz-box-sizing:content-box;box-sizing:content-box;display:block;margin:0;border:0;padding:1px;width:1px;zoom:1", div.appendChild(document.createElement("div")).style.width = "5px", shrinkWrapBlocksVal = 3 !== div.offsetWidth), body.removeChild(container), shrinkWrapBlocksVal) : void 0
            }
        }();
        var getStyles, curCSS, rmargin = /^margin/,
            rnumnonpx = new RegExp("^(" + pnum + ")(?!px)[a-z%]+$", "i"),
            rposition = /^(top|right|bottom|left)$/;
        window.getComputedStyle ? (getStyles = function(elem) {
                return elem.ownerDocument.defaultView.getComputedStyle(elem, null)
            }, curCSS = function(elem, name, computed) {
                var width, minWidth, maxWidth, ret, style = elem.style;
                return computed = computed || getStyles(elem), ret = computed ? computed.getPropertyValue(name) || computed[name] : void 0, computed && ("" !== ret || jQuery.contains(elem.ownerDocument, elem) || (ret = jQuery.style(elem, name)), rnumnonpx.test(ret) && rmargin.test(name) && (width = style.width, minWidth = style.minWidth, maxWidth = style.maxWidth, style.minWidth = style.maxWidth = style.width = ret, ret = computed.width, style.width = width, style.minWidth = minWidth, style.maxWidth = maxWidth)), void 0 === ret ? ret : ret + ""
            }) : document.documentElement.currentStyle && (getStyles = function(elem) {
                return elem.currentStyle
            }, curCSS = function(elem, name, computed) {
                var left, rs, rsLeft, ret, style = elem.style;
                return computed = computed || getStyles(elem), ret = computed ? computed[name] : void 0, null == ret && style && style[name] && (ret = style[name]), rnumnonpx.test(ret) && !rposition.test(name) && (left = style.left, rs = elem.runtimeStyle, rsLeft = rs && rs.left, rsLeft && (rs.left = elem.currentStyle.left), style.left = "fontSize" === name ? "1em" : ret, ret = style.pixelLeft + "px", style.left = left, rsLeft && (rs.left = rsLeft)), void 0 === ret ? ret : ret + "" || "auto"
            }),
            function() {
                function computeStyleTests() {
                    var div, body, container, contents;
                    body = document.getElementsByTagName("body")[0], body && body.style && (div = document.createElement("div"), container = document.createElement("div"), container.style.cssText = "position:absolute;border:0;width:0;height:0;top:0;left:-9999px", body.appendChild(container).appendChild(div), div.style.cssText = "-webkit-box-sizing:border-box;-moz-box-sizing:border-box;box-sizing:border-box;display:block;margin-top:1%;top:1%;border:1px;padding:1px;width:4px;position:absolute", pixelPositionVal = boxSizingReliableVal = !1, reliableMarginRightVal = !0, window.getComputedStyle && (pixelPositionVal = "1%" !== (window.getComputedStyle(div, null) || {}).top, boxSizingReliableVal = "4px" === (window.getComputedStyle(div, null) || {
                        width: "4px"
                    }).width, contents = div.appendChild(document.createElement("div")), contents.style.cssText = div.style.cssText = "-webkit-box-sizing:content-box;-moz-box-sizing:content-box;box-sizing:content-box;display:block;margin:0;border:0;padding:0", contents.style.marginRight = contents.style.width = "0", div.style.width = "1px", reliableMarginRightVal = !parseFloat((window.getComputedStyle(contents, null) || {}).marginRight)), div.innerHTML = "<table><tr><td></td><td>t</td></tr></table>", contents = div.getElementsByTagName("td"), contents[0].style.cssText = "margin:0;border:0;padding:0;display:none", reliableHiddenOffsetsVal = 0 === contents[0].offsetHeight, reliableHiddenOffsetsVal && (contents[0].style.display = "", contents[1].style.display = "none", reliableHiddenOffsetsVal = 0 === contents[0].offsetHeight), body.removeChild(container))
                }
                var div, style, a, pixelPositionVal, boxSizingReliableVal, reliableHiddenOffsetsVal, reliableMarginRightVal;
                div = document.createElement("div"), div.innerHTML = "  <link/><table></table><a href='/a'>a</a><input type='checkbox'/>", a = div.getElementsByTagName("a")[0], style = a && a.style, style && (style.cssText = "float:left;opacity:.5", support.opacity = "0.5" === style.opacity, support.cssFloat = !!style.cssFloat, div.style.backgroundClip = "content-box", div.cloneNode(!0).style.backgroundClip = "", support.clearCloneStyle = "content-box" === div.style.backgroundClip, support.boxSizing = "" === style.boxSizing || "" === style.MozBoxSizing || "" === style.WebkitBoxSizing, jQuery.extend(support, {
                    reliableHiddenOffsets: function() {
                        return null == reliableHiddenOffsetsVal && computeStyleTests(), reliableHiddenOffsetsVal
                    },
                    boxSizingReliable: function() {
                        return null == boxSizingReliableVal && computeStyleTests(), boxSizingReliableVal
                    },
                    pixelPosition: function() {
                        return null == pixelPositionVal && computeStyleTests(), pixelPositionVal
                    },
                    reliableMarginRight: function() {
                        return null == reliableMarginRightVal && computeStyleTests(), reliableMarginRightVal
                    }
                }))
            }(), jQuery.swap = function(elem, options, callback, args) {
                var ret, name, old = {};
                for (name in options) old[name] = elem.style[name], elem.style[name] = options[name];
                ret = callback.apply(elem, args || []);
                for (name in options) elem.style[name] = old[name];
                return ret
            };
        var ralpha = /alpha\([^)]*\)/i,
            ropacity = /opacity\s*=\s*([^)]*)/,
            rdisplayswap = /^(none|table(?!-c[ea]).+)/,
            rnumsplit = new RegExp("^(" + pnum + ")(.*)$", "i"),
            rrelNum = new RegExp("^([+-])=(" + pnum + ")", "i"),
            cssShow = {
                position: "absolute",
                visibility: "hidden",
                display: "block"
            },
            cssNormalTransform = {
                letterSpacing: "0",
                fontWeight: "400"
            },
            cssPrefixes = ["Webkit", "O", "Moz", "ms"];
        jQuery.extend({
            cssHooks: {
                opacity: {
                    get: function(elem, computed) {
                        if (computed) {
                            var ret = curCSS(elem, "opacity");
                            return "" === ret ? "1" : ret
                        }
                    }
                }
            },
            cssNumber: {
                columnCount: !0,
                fillOpacity: !0,
                flexGrow: !0,
                flexShrink: !0,
                fontWeight: !0,
                lineHeight: !0,
                opacity: !0,
                order: !0,
                orphans: !0,
                widows: !0,
                zIndex: !0,
                zoom: !0
            },
            cssProps: {
                "float": support.cssFloat ? "cssFloat" : "styleFloat"
            },
            style: function(elem, name, value, extra) {
                if (elem && 3 !== elem.nodeType && 8 !== elem.nodeType && elem.style) {
                    var ret, type, hooks, origName = jQuery.camelCase(name),
                        style = elem.style;
                    if (name = jQuery.cssProps[origName] || (jQuery.cssProps[origName] = vendorPropName(style, origName)), hooks = jQuery.cssHooks[name] || jQuery.cssHooks[origName], void 0 === value) return hooks && "get" in hooks && void 0 !== (ret = hooks.get(elem, !1, extra)) ? ret : style[name];
                    if (type = typeof value, "string" === type && (ret = rrelNum.exec(value)) && (value = (ret[1] + 1) * ret[2] + parseFloat(jQuery.css(elem, name)), type = "number"), null != value && value === value && ("number" !== type || jQuery.cssNumber[origName] || (value += "px"), support.clearCloneStyle || "" !== value || 0 !== name.indexOf("background") || (style[name] = "inherit"), !(hooks && "set" in hooks && void 0 === (value = hooks.set(elem, value, extra))))) try {
                        style[name] = value
                    } catch (e) {}
                }
            },
            css: function(elem, name, extra, styles) {
                var num, val, hooks, origName = jQuery.camelCase(name);
                return name = jQuery.cssProps[origName] || (jQuery.cssProps[origName] = vendorPropName(elem.style, origName)), hooks = jQuery.cssHooks[name] || jQuery.cssHooks[origName], hooks && "get" in hooks && (val = hooks.get(elem, !0, extra)), void 0 === val && (val = curCSS(elem, name, styles)), "normal" === val && name in cssNormalTransform && (val = cssNormalTransform[name]), "" === extra || extra ? (num = parseFloat(val), extra === !0 || jQuery.isNumeric(num) ? num || 0 : val) : val
            }
        }), jQuery.each(["height", "width"], function(i, name) {
            jQuery.cssHooks[name] = {
                get: function(elem, computed, extra) {
                    return computed ? rdisplayswap.test(jQuery.css(elem, "display")) && 0 === elem.offsetWidth ? jQuery.swap(elem, cssShow, function() {
                        return getWidthOrHeight(elem, name, extra)
                    }) : getWidthOrHeight(elem, name, extra) : void 0
                },
                set: function(elem, value, extra) {
                    var styles = extra && getStyles(elem);
                    return setPositiveNumber(elem, value, extra ? augmentWidthOrHeight(elem, name, extra, support.boxSizing && "border-box" === jQuery.css(elem, "boxSizing", !1, styles), styles) : 0)
                }
            }
        }), support.opacity || (jQuery.cssHooks.opacity = {
            get: function(elem, computed) {
                return ropacity.test((computed && elem.currentStyle ? elem.currentStyle.filter : elem.style.filter) || "") ? .01 * parseFloat(RegExp.$1) + "" : computed ? "1" : ""
            },
            set: function(elem, value) {
                var style = elem.style,
                    currentStyle = elem.currentStyle,
                    opacity = jQuery.isNumeric(value) ? "alpha(opacity=" + 100 * value + ")" : "",
                    filter = currentStyle && currentStyle.filter || style.filter || "";
                style.zoom = 1, (value >= 1 || "" === value) && "" === jQuery.trim(filter.replace(ralpha, "")) && style.removeAttribute && (style.removeAttribute("filter"), "" === value || currentStyle && !currentStyle.filter) || (style.filter = ralpha.test(filter) ? filter.replace(ralpha, opacity) : filter + " " + opacity)
            }
        }), jQuery.cssHooks.marginRight = addGetHookIf(support.reliableMarginRight, function(elem, computed) {
            return computed ? jQuery.swap(elem, {
                display: "inline-block"
            }, curCSS, [elem, "marginRight"]) : void 0
        }), jQuery.each({
            margin: "",
            padding: "",
            border: "Width"
        }, function(prefix, suffix) {
            jQuery.cssHooks[prefix + suffix] = {
                expand: function(value) {
                    for (var i = 0, expanded = {}, parts = "string" == typeof value ? value.split(" ") : [value]; 4 > i; i++) expanded[prefix + cssExpand[i] + suffix] = parts[i] || parts[i - 2] || parts[0];
                    return expanded
                }
            }, rmargin.test(prefix) || (jQuery.cssHooks[prefix + suffix].set = setPositiveNumber)
        }), jQuery.fn.extend({
            css: function(name, value) {
                return access(this, function(elem, name, value) {
                    var styles, len, map = {},
                        i = 0;
                    if (jQuery.isArray(name)) {
                        for (styles = getStyles(elem), len = name.length; len > i; i++) map[name[i]] = jQuery.css(elem, name[i], !1, styles);
                        return map
                    }
                    return void 0 !== value ? jQuery.style(elem, name, value) : jQuery.css(elem, name)
                }, name, value, arguments.length > 1)
            },
            show: function() {
                return showHide(this, !0)
            },
            hide: function() {
                return showHide(this)
            },
            toggle: function(state) {
                return "boolean" == typeof state ? state ? this.show() : this.hide() : this.each(function() {
                    isHidden(this) ? jQuery(this).show() : jQuery(this).hide()
                })
            }
        }), jQuery.Tween = Tween, Tween.prototype = {
            constructor: Tween,
            init: function(elem, options, prop, end, easing, unit) {
                this.elem = elem, this.prop = prop, this.easing = easing || "swing", this.options = options, this.start = this.now = this.cur(), this.end = end, this.unit = unit || (jQuery.cssNumber[prop] ? "" : "px")
            },
            cur: function() {
                var hooks = Tween.propHooks[this.prop];
                return hooks && hooks.get ? hooks.get(this) : Tween.propHooks._default.get(this)
            },
            run: function(percent) {
                var eased, hooks = Tween.propHooks[this.prop];
                return this.pos = eased = this.options.duration ? jQuery.easing[this.easing](percent, this.options.duration * percent, 0, 1, this.options.duration) : percent, this.now = (this.end - this.start) * eased + this.start, this.options.step && this.options.step.call(this.elem, this.now, this), hooks && hooks.set ? hooks.set(this) : Tween.propHooks._default.set(this), this
            }
        }, Tween.prototype.init.prototype = Tween.prototype, Tween.propHooks = {
            _default: {
                get: function(tween) {
                    var result;
                    return null == tween.elem[tween.prop] || tween.elem.style && null != tween.elem.style[tween.prop] ? (result = jQuery.css(tween.elem, tween.prop, ""), result && "auto" !== result ? result : 0) : tween.elem[tween.prop]
                },
                set: function(tween) {
                    jQuery.fx.step[tween.prop] ? jQuery.fx.step[tween.prop](tween) : tween.elem.style && (null != tween.elem.style[jQuery.cssProps[tween.prop]] || jQuery.cssHooks[tween.prop]) ? jQuery.style(tween.elem, tween.prop, tween.now + tween.unit) : tween.elem[tween.prop] = tween.now
                }
            }
        }, Tween.propHooks.scrollTop = Tween.propHooks.scrollLeft = {
            set: function(tween) {
                tween.elem.nodeType && tween.elem.parentNode && (tween.elem[tween.prop] = tween.now)
            }
        }, jQuery.easing = {
            linear: function(p) {
                return p
            },
            swing: function(p) {
                return .5 - Math.cos(p * Math.PI) / 2
            }
        }, jQuery.fx = Tween.prototype.init, jQuery.fx.step = {};
        var fxNow, timerId, rfxtypes = /^(?:toggle|show|hide)$/,
            rfxnum = new RegExp("^(?:([+-])=|)(" + pnum + ")([a-z%]*)$", "i"),
            rrun = /queueHooks$/,
            animationPrefilters = [defaultPrefilter],
            tweeners = {
                "*": [function(prop, value) {
                    var tween = this.createTween(prop, value),
                        target = tween.cur(),
                        parts = rfxnum.exec(value),
                        unit = parts && parts[3] || (jQuery.cssNumber[prop] ? "" : "px"),
                        start = (jQuery.cssNumber[prop] || "px" !== unit && +target) && rfxnum.exec(jQuery.css(tween.elem, prop)),
                        scale = 1,
                        maxIterations = 20;
                    if (start && start[3] !== unit) {
                        unit = unit || start[3], parts = parts || [], start = +target || 1;
                        do scale = scale || ".5", start /= scale, jQuery.style(tween.elem, prop, start + unit); while (scale !== (scale = tween.cur() / target) && 1 !== scale && --maxIterations)
                    }
                    return parts && (start = tween.start = +start || +target || 0, tween.unit = unit, tween.end = parts[1] ? start + (parts[1] + 1) * parts[2] : +parts[2]), tween
                }]
            };
        jQuery.Animation = jQuery.extend(Animation, {
                tweener: function(props, callback) {
                    jQuery.isFunction(props) ? (callback = props, props = ["*"]) : props = props.split(" ");
                    for (var prop, index = 0, length = props.length; length > index; index++) prop = props[index], tweeners[prop] = tweeners[prop] || [], tweeners[prop].unshift(callback)
                },
                prefilter: function(callback, prepend) {
                    prepend ? animationPrefilters.unshift(callback) : animationPrefilters.push(callback)
                }
            }), jQuery.speed = function(speed, easing, fn) {
                var opt = speed && "object" == typeof speed ? jQuery.extend({}, speed) : {
                    complete: fn || !fn && easing || jQuery.isFunction(speed) && speed,
                    duration: speed,
                    easing: fn && easing || easing && !jQuery.isFunction(easing) && easing
                };
                return opt.duration = jQuery.fx.off ? 0 : "number" == typeof opt.duration ? opt.duration : opt.duration in jQuery.fx.speeds ? jQuery.fx.speeds[opt.duration] : jQuery.fx.speeds._default, (null == opt.queue || opt.queue === !0) && (opt.queue = "fx"), opt.old = opt.complete, opt.complete = function() {
                    jQuery.isFunction(opt.old) && opt.old.call(this), opt.queue && jQuery.dequeue(this, opt.queue)
                }, opt
            }, jQuery.fn.extend({
                fadeTo: function(speed, to, easing, callback) {
                    return this.filter(isHidden).css("opacity", 0).show().end().animate({
                        opacity: to
                    }, speed, easing, callback)
                },
                animate: function(prop, speed, easing, callback) {
                    var empty = jQuery.isEmptyObject(prop),
                        optall = jQuery.speed(speed, easing, callback),
                        doAnimation = function() {
                            var anim = Animation(this, jQuery.extend({}, prop), optall);
                            (empty || jQuery._data(this, "finish")) && anim.stop(!0)
                        };
                    return doAnimation.finish = doAnimation, empty || optall.queue === !1 ? this.each(doAnimation) : this.queue(optall.queue, doAnimation)
                },
                stop: function(type, clearQueue, gotoEnd) {
                    var stopQueue = function(hooks) {
                        var stop = hooks.stop;
                        delete hooks.stop, stop(gotoEnd)
                    };
                    return "string" != typeof type && (gotoEnd = clearQueue, clearQueue = type, type = void 0), clearQueue && type !== !1 && this.queue(type || "fx", []), this.each(function() {
                        var dequeue = !0,
                            index = null != type && type + "queueHooks",
                            timers = jQuery.timers,
                            data = jQuery._data(this);
                        if (index) data[index] && data[index].stop && stopQueue(data[index]);
                        else
                            for (index in data) data[index] && data[index].stop && rrun.test(index) && stopQueue(data[index]);
                        for (index = timers.length; index--;) timers[index].elem !== this || null != type && timers[index].queue !== type || (timers[index].anim.stop(gotoEnd), dequeue = !1, timers.splice(index, 1));
                        (dequeue || !gotoEnd) && jQuery.dequeue(this, type)
                    })
                },
                finish: function(type) {
                    return type !== !1 && (type = type || "fx"), this.each(function() {
                        var index, data = jQuery._data(this),
                            queue = data[type + "queue"],
                            hooks = data[type + "queueHooks"],
                            timers = jQuery.timers,
                            length = queue ? queue.length : 0;
                        for (data.finish = !0, jQuery.queue(this, type, []), hooks && hooks.stop && hooks.stop.call(this, !0), index = timers.length; index--;) timers[index].elem === this && timers[index].queue === type && (timers[index].anim.stop(!0), timers.splice(index, 1));
                        for (index = 0; length > index; index++) queue[index] && queue[index].finish && queue[index].finish.call(this);
                        delete data.finish
                    })
                }
            }), jQuery.each(["toggle", "show", "hide"], function(i, name) {
                var cssFn = jQuery.fn[name];
                jQuery.fn[name] = function(speed, easing, callback) {
                    return null == speed || "boolean" == typeof speed ? cssFn.apply(this, arguments) : this.animate(genFx(name, !0), speed, easing, callback)
                }
            }), jQuery.each({
                slideDown: genFx("show"),
                slideUp: genFx("hide"),
                slideToggle: genFx("toggle"),
                fadeIn: {
                    opacity: "show"
                },
                fadeOut: {
                    opacity: "hide"
                },
                fadeToggle: {
                    opacity: "toggle"
                }
            }, function(name, props) {
                jQuery.fn[name] = function(speed, easing, callback) {
                    return this.animate(props, speed, easing, callback)
                }
            }), jQuery.timers = [], jQuery.fx.tick = function() {
                var timer, timers = jQuery.timers,
                    i = 0;
                for (fxNow = jQuery.now(); i < timers.length; i++) timer = timers[i], timer() || timers[i] !== timer || timers.splice(i--, 1);
                timers.length || jQuery.fx.stop(), fxNow = void 0
            }, jQuery.fx.timer = function(timer) {
                jQuery.timers.push(timer), timer() ? jQuery.fx.start() : jQuery.timers.pop()
            }, jQuery.fx.interval = 13, jQuery.fx.start = function() {
                timerId || (timerId = setInterval(jQuery.fx.tick, jQuery.fx.interval))
            }, jQuery.fx.stop = function() {
                clearInterval(timerId), timerId = null
            }, jQuery.fx.speeds = {
                slow: 600,
                fast: 200,
                _default: 400
            }, jQuery.fn.delay = function(time, type) {
                return time = jQuery.fx ? jQuery.fx.speeds[time] || time : time, type = type || "fx", this.queue(type, function(next, hooks) {
                    var timeout = setTimeout(next, time);
                    hooks.stop = function() {
                        clearTimeout(timeout)
                    }
                })
            },
            function() {
                var input, div, select, a, opt;
                div = document.createElement("div"), div.setAttribute("className", "t"), div.innerHTML = "  <link/><table></table><a href='/a'>a</a><input type='checkbox'/>", a = div.getElementsByTagName("a")[0], select = document.createElement("select"), opt = select.appendChild(document.createElement("option")), input = div.getElementsByTagName("input")[0], a.style.cssText = "top:1px", support.getSetAttribute = "t" !== div.className, support.style = /top/.test(a.getAttribute("style")), support.hrefNormalized = "/a" === a.getAttribute("href"), support.checkOn = !!input.value, support.optSelected = opt.selected, support.enctype = !!document.createElement("form").enctype, select.disabled = !0, support.optDisabled = !opt.disabled, input = document.createElement("input"), input.setAttribute("value", ""), support.input = "" === input.getAttribute("value"), input.value = "t", input.setAttribute("type", "radio"), support.radioValue = "t" === input.value
            }();
        var rreturn = /\r/g;
        jQuery.fn.extend({
            val: function(value) {
                var hooks, ret, isFunction, elem = this[0]; {
                    if (arguments.length) return isFunction = jQuery.isFunction(value), this.each(function(i) {
                        var val;
                        1 === this.nodeType && (val = isFunction ? value.call(this, i, jQuery(this).val()) : value, null == val ? val = "" : "number" == typeof val ? val += "" : jQuery.isArray(val) && (val = jQuery.map(val, function(value) {
                            return null == value ? "" : value + ""
                        })), hooks = jQuery.valHooks[this.type] || jQuery.valHooks[this.nodeName.toLowerCase()], hooks && "set" in hooks && void 0 !== hooks.set(this, val, "value") || (this.value = val))
                    });
                    if (elem) return hooks = jQuery.valHooks[elem.type] || jQuery.valHooks[elem.nodeName.toLowerCase()], hooks && "get" in hooks && void 0 !== (ret = hooks.get(elem, "value")) ? ret : (ret = elem.value, "string" == typeof ret ? ret.replace(rreturn, "") : null == ret ? "" : ret)
                }
            }
        }), jQuery.extend({
            valHooks: {
                option: {
                    get: function(elem) {
                        var val = jQuery.find.attr(elem, "value");
                        return null != val ? val : jQuery.trim(jQuery.text(elem))
                    }
                },
                select: {
                    get: function(elem) {
                        for (var value, option, options = elem.options, index = elem.selectedIndex, one = "select-one" === elem.type || 0 > index, values = one ? null : [], max = one ? index + 1 : options.length, i = 0 > index ? max : one ? index : 0; max > i; i++)
                            if (option = options[i], !(!option.selected && i !== index || (support.optDisabled ? option.disabled : null !== option.getAttribute("disabled")) || option.parentNode.disabled && jQuery.nodeName(option.parentNode, "optgroup"))) {
                                if (value = jQuery(option).val(), one) return value;
                                values.push(value)
                            }
                        return values
                    },
                    set: function(elem, value) {
                        for (var optionSet, option, options = elem.options, values = jQuery.makeArray(value), i = options.length; i--;)
                            if (option = options[i], jQuery.inArray(jQuery.valHooks.option.get(option), values) >= 0) try {
                                option.selected = optionSet = !0
                            } catch (_) {
                                option.scrollHeight
                            } else option.selected = !1;
                        return optionSet || (elem.selectedIndex = -1), options
                    }
                }
            }
        }), jQuery.each(["radio", "checkbox"], function() {
            jQuery.valHooks[this] = {
                set: function(elem, value) {
                    return jQuery.isArray(value) ? elem.checked = jQuery.inArray(jQuery(elem).val(), value) >= 0 : void 0
                }
            }, support.checkOn || (jQuery.valHooks[this].get = function(elem) {
                return null === elem.getAttribute("value") ? "on" : elem.value
            })
        });
        var nodeHook, boolHook, attrHandle = jQuery.expr.attrHandle,
            ruseDefault = /^(?:checked|selected)$/i,
            getSetAttribute = support.getSetAttribute,
            getSetInput = support.input;
        jQuery.fn.extend({
            attr: function(name, value) {
                return access(this, jQuery.attr, name, value, arguments.length > 1)
            },
            removeAttr: function(name) {
                return this.each(function() {
                    jQuery.removeAttr(this, name)
                })
            }
        }), jQuery.extend({
            attr: function(elem, name, value) {
                var hooks, ret, nType = elem.nodeType;
                if (elem && 3 !== nType && 8 !== nType && 2 !== nType) return typeof elem.getAttribute === strundefined ? jQuery.prop(elem, name, value) : (1 === nType && jQuery.isXMLDoc(elem) || (name = name.toLowerCase(), hooks = jQuery.attrHooks[name] || (jQuery.expr.match.bool.test(name) ? boolHook : nodeHook)), void 0 === value ? hooks && "get" in hooks && null !== (ret = hooks.get(elem, name)) ? ret : (ret = jQuery.find.attr(elem, name), null == ret ? void 0 : ret) : null !== value ? hooks && "set" in hooks && void 0 !== (ret = hooks.set(elem, value, name)) ? ret : (elem.setAttribute(name, value + ""), value) : (jQuery.removeAttr(elem, name), void 0))
            },
            removeAttr: function(elem, value) {
                var name, propName, i = 0,
                    attrNames = value && value.match(rnotwhite);
                if (attrNames && 1 === elem.nodeType)
                    for (; name = attrNames[i++];) propName = jQuery.propFix[name] || name, jQuery.expr.match.bool.test(name) ? getSetInput && getSetAttribute || !ruseDefault.test(name) ? elem[propName] = !1 : elem[jQuery.camelCase("default-" + name)] = elem[propName] = !1 : jQuery.attr(elem, name, ""), elem.removeAttribute(getSetAttribute ? name : propName)
            },
            attrHooks: {
                type: {
                    set: function(elem, value) {
                        if (!support.radioValue && "radio" === value && jQuery.nodeName(elem, "input")) {
                            var val = elem.value;
                            return elem.setAttribute("type", value), val && (elem.value = val), value
                        }
                    }
                }
            }
        }), boolHook = {
            set: function(elem, value, name) {
                return value === !1 ? jQuery.removeAttr(elem, name) : getSetInput && getSetAttribute || !ruseDefault.test(name) ? elem.setAttribute(!getSetAttribute && jQuery.propFix[name] || name, name) : elem[jQuery.camelCase("default-" + name)] = elem[name] = !0, name
            }
        }, jQuery.each(jQuery.expr.match.bool.source.match(/\w+/g), function(i, name) {
            var getter = attrHandle[name] || jQuery.find.attr;
            attrHandle[name] = getSetInput && getSetAttribute || !ruseDefault.test(name) ? function(elem, name, isXML) {
                var ret, handle;
                return isXML || (handle = attrHandle[name], attrHandle[name] = ret, ret = null != getter(elem, name, isXML) ? name.toLowerCase() : null, attrHandle[name] = handle), ret
            } : function(elem, name, isXML) {
                return isXML ? void 0 : elem[jQuery.camelCase("default-" + name)] ? name.toLowerCase() : null
            }
        }), getSetInput && getSetAttribute || (jQuery.attrHooks.value = {
            set: function(elem, value, name) {
                return jQuery.nodeName(elem, "input") ? (elem.defaultValue = value, void 0) : nodeHook && nodeHook.set(elem, value, name)
            }
        }), getSetAttribute || (nodeHook = {
            set: function(elem, value, name) {
                var ret = elem.getAttributeNode(name);
                return ret || elem.setAttributeNode(ret = elem.ownerDocument.createAttribute(name)), ret.value = value += "", "value" === name || value === elem.getAttribute(name) ? value : void 0
            }
        }, attrHandle.id = attrHandle.name = attrHandle.coords = function(elem, name, isXML) {
            var ret;
            return isXML ? void 0 : (ret = elem.getAttributeNode(name)) && "" !== ret.value ? ret.value : null
        }, jQuery.valHooks.button = {
            get: function(elem, name) {
                var ret = elem.getAttributeNode(name);
                return ret && ret.specified ? ret.value : void 0
            },
            set: nodeHook.set
        }, jQuery.attrHooks.contenteditable = {
            set: function(elem, value, name) {
                nodeHook.set(elem, "" === value ? !1 : value, name)
            }
        }, jQuery.each(["width", "height"], function(i, name) {
            jQuery.attrHooks[name] = {
                set: function(elem, value) {
                    return "" === value ? (elem.setAttribute(name, "auto"), value) : void 0
                }
            }
        })), support.style || (jQuery.attrHooks.style = {
            get: function(elem) {
                return elem.style.cssText || void 0
            },
            set: function(elem, value) {
                return elem.style.cssText = value + ""
            }
        });
        var rfocusable = /^(?:input|select|textarea|button|object)$/i,
            rclickable = /^(?:a|area)$/i;
        jQuery.fn.extend({
            prop: function(name, value) {
                return access(this, jQuery.prop, name, value, arguments.length > 1)
            },
            removeProp: function(name) {
                return name = jQuery.propFix[name] || name, this.each(function() {
                    try {
                        this[name] = void 0, delete this[name]
                    } catch (e) {}
                })
            }
        }), jQuery.extend({
            propFix: {
                "for": "htmlFor",
                "class": "className"
            },
            prop: function(elem, name, value) {
                var ret, hooks, notxml, nType = elem.nodeType;
                if (elem && 3 !== nType && 8 !== nType && 2 !== nType) return notxml = 1 !== nType || !jQuery.isXMLDoc(elem), notxml && (name = jQuery.propFix[name] || name, hooks = jQuery.propHooks[name]), void 0 !== value ? hooks && "set" in hooks && void 0 !== (ret = hooks.set(elem, value, name)) ? ret : elem[name] = value : hooks && "get" in hooks && null !== (ret = hooks.get(elem, name)) ? ret : elem[name]
            },
            propHooks: {
                tabIndex: {
                    get: function(elem) {
                        var tabindex = jQuery.find.attr(elem, "tabindex");
                        return tabindex ? parseInt(tabindex, 10) : rfocusable.test(elem.nodeName) || rclickable.test(elem.nodeName) && elem.href ? 0 : -1
                    }
                }
            }
        }), support.hrefNormalized || jQuery.each(["href", "src"], function(i, name) {
            jQuery.propHooks[name] = {
                get: function(elem) {
                    return elem.getAttribute(name, 4)
                }
            }
        }), support.optSelected || (jQuery.propHooks.selected = {
            get: function(elem) {
                var parent = elem.parentNode;
                return parent && (parent.selectedIndex, parent.parentNode && parent.parentNode.selectedIndex), null
            }
        }), jQuery.each(["tabIndex", "readOnly", "maxLength", "cellSpacing", "cellPadding", "rowSpan", "colSpan", "useMap", "frameBorder", "contentEditable"], function() {
            jQuery.propFix[this.toLowerCase()] = this
        }), support.enctype || (jQuery.propFix.enctype = "encoding");
        var rclass = /[\t\r\n\f]/g;
        jQuery.fn.extend({
            addClass: function(value) {
                var classes, elem, cur, clazz, j, finalValue, i = 0,
                    len = this.length,
                    proceed = "string" == typeof value && value;
                if (jQuery.isFunction(value)) return this.each(function(j) {
                    jQuery(this).addClass(value.call(this, j, this.className))
                });
                if (proceed)
                    for (classes = (value || "").match(rnotwhite) || []; len > i; i++)
                        if (elem = this[i], cur = 1 === elem.nodeType && (elem.className ? (" " + elem.className + " ").replace(rclass, " ") : " ")) {
                            for (j = 0; clazz = classes[j++];) cur.indexOf(" " + clazz + " ") < 0 && (cur += clazz + " ");
                            finalValue = jQuery.trim(cur), elem.className !== finalValue && (elem.className = finalValue)
                        }
                return this
            },
            removeClass: function(value) {
                var classes, elem, cur, clazz, j, finalValue, i = 0,
                    len = this.length,
                    proceed = 0 === arguments.length || "string" == typeof value && value;
                if (jQuery.isFunction(value)) return this.each(function(j) {
                    jQuery(this).removeClass(value.call(this, j, this.className))
                });
                if (proceed)
                    for (classes = (value || "").match(rnotwhite) || []; len > i; i++)
                        if (elem = this[i], cur = 1 === elem.nodeType && (elem.className ? (" " + elem.className + " ").replace(rclass, " ") : "")) {
                            for (j = 0; clazz = classes[j++];)
                                for (; cur.indexOf(" " + clazz + " ") >= 0;) cur = cur.replace(" " + clazz + " ", " ");
                            finalValue = value ? jQuery.trim(cur) : "", elem.className !== finalValue && (elem.className = finalValue)
                        }
                return this
            },
            toggleClass: function(value, stateVal) {
                var type = typeof value;
                return "boolean" == typeof stateVal && "string" === type ? stateVal ? this.addClass(value) : this.removeClass(value) : jQuery.isFunction(value) ? this.each(function(i) {
                    jQuery(this).toggleClass(value.call(this, i, this.className, stateVal), stateVal)
                }) : this.each(function() {
                    if ("string" === type)
                        for (var className, i = 0, self = jQuery(this), classNames = value.match(rnotwhite) || []; className = classNames[i++];) self.hasClass(className) ? self.removeClass(className) : self.addClass(className);
                    else(type === strundefined || "boolean" === type) && (this.className && jQuery._data(this, "__className__", this.className), this.className = this.className || value === !1 ? "" : jQuery._data(this, "__className__") || "")
                })
            },
            hasClass: function(selector) {
                for (var className = " " + selector + " ", i = 0, l = this.length; l > i; i++)
                    if (1 === this[i].nodeType && (" " + this[i].className + " ").replace(rclass, " ").indexOf(className) >= 0) return !0;
                return !1
            }
        }), jQuery.each("blur focus focusin focusout load resize scroll unload click dblclick mousedown mouseup mousemove mouseover mouseout mouseenter mouseleave change select submit keydown keypress keyup error contextmenu".split(" "), function(i, name) {
            jQuery.fn[name] = function(data, fn) {
                return arguments.length > 0 ? this.on(name, null, data, fn) : this.trigger(name)
            }
        }), jQuery.fn.extend({
            hover: function(fnOver, fnOut) {
                return this.mouseenter(fnOver).mouseleave(fnOut || fnOver)
            },
            bind: function(types, data, fn) {
                return this.on(types, null, data, fn)
            },
            unbind: function(types, fn) {
                return this.off(types, null, fn)
            },
            delegate: function(selector, types, data, fn) {
                return this.on(types, selector, data, fn)
            },
            undelegate: function(selector, types, fn) {
                return 1 === arguments.length ? this.off(selector, "**") : this.off(types, selector || "**", fn)
            }
        });
        var nonce = jQuery.now(),
            rquery = /\?/,
            rvalidtokens = /(,)|(\[|{)|(}|])|"(?:[^"\\\r\n]|\\["\\\/bfnrt]|\\u[\da-fA-F]{4})*"\s*:?|true|false|null|-?(?!0\d)\d+(?:\.\d+|)(?:[eE][+-]?\d+|)/g;
        jQuery.parseJSON = function(data) {
            if (window.JSON && window.JSON.parse) return window.JSON.parse(data + "");
            var requireNonComma, depth = null,
                str = jQuery.trim(data + "");
            return str && !jQuery.trim(str.replace(rvalidtokens, function(token, comma, open, close) {
                return requireNonComma && comma && (depth = 0), 0 === depth ? token : (requireNonComma = open || comma, depth += !close - !open, "")
            })) ? Function("return " + str)() : jQuery.error("Invalid JSON: " + data)
        }, jQuery.parseXML = function(data) {
            var xml, tmp;
            if (!data || "string" != typeof data) return null;
            try {
                window.DOMParser ? (tmp = new DOMParser, xml = tmp.parseFromString(data, "text/xml")) : (xml = new ActiveXObject("Microsoft.XMLDOM"), xml.async = "false", xml.loadXML(data))
            } catch (e) {
                xml = void 0
            }
            return xml && xml.documentElement && !xml.getElementsByTagName("parsererror").length || jQuery.error("Invalid XML: " + data), xml
        };
        var ajaxLocParts, ajaxLocation, rhash = /#.*$/,
            rts = /([?&])_=[^&]*/,
            rheaders = /^(.*?):[ \t]*([^\r\n]*)\r?$/gm,
            rlocalProtocol = /^(?:about|app|app-storage|.+-extension|file|res|widget):$/,
            rnoContent = /^(?:GET|HEAD)$/,
            rprotocol = /^\/\//,
            rurl = /^([\w.+-]+:)(?:\/\/(?:[^\/?#]*@|)([^\/?#:]*)(?::(\d+)|)|)/,
            prefilters = {},
            transports = {},
            allTypes = "*/".concat("*");
        try {
            ajaxLocation = location.href
        } catch (e) {
            ajaxLocation = document.createElement("a"), ajaxLocation.href = "", ajaxLocation = ajaxLocation.href
        }
        ajaxLocParts = rurl.exec(ajaxLocation.toLowerCase()) || [], jQuery.extend({
            active: 0,
            lastModified: {},
            etag: {},
            ajaxSettings: {
                url: ajaxLocation,
                type: "GET",
                isLocal: rlocalProtocol.test(ajaxLocParts[1]),
                global: !0,
                processData: !0,
                async: !0,
                contentType: "application/x-www-form-urlencoded; charset=UTF-8",
                accepts: {
                    "*": allTypes,
                    text: "text/plain",
                    html: "text/html",
                    xml: "application/xml, text/xml",
                    json: "application/json, text/javascript"
                },
                contents: {
                    xml: /xml/,
                    html: /html/,
                    json: /json/
                },
                responseFields: {
                    xml: "responseXML",
                    text: "responseText",
                    json: "responseJSON"
                },
                converters: {
                    "* text": String,
                    "text html": !0,
                    "text json": jQuery.parseJSON,
                    "text xml": jQuery.parseXML
                },
                flatOptions: {
                    url: !0,
                    context: !0
                }
            },
            ajaxSetup: function(target, settings) {
                return settings ? ajaxExtend(ajaxExtend(target, jQuery.ajaxSettings), settings) : ajaxExtend(jQuery.ajaxSettings, target)
            },
            ajaxPrefilter: addToPrefiltersOrTransports(prefilters),
            ajaxTransport: addToPrefiltersOrTransports(transports),
            ajax: function(url, options) {
                function done(status, nativeStatusText, responses, headers) {
                    var isSuccess, success, error, response, modified, statusText = nativeStatusText;
                    2 !== state && (state = 2, timeoutTimer && clearTimeout(timeoutTimer), transport = void 0, responseHeadersString = headers || "", jqXHR.readyState = status > 0 ? 4 : 0, isSuccess = status >= 200 && 300 > status || 304 === status, responses && (response = ajaxHandleResponses(s, jqXHR, responses)), response = ajaxConvert(s, response, jqXHR, isSuccess), isSuccess ? (s.ifModified && (modified = jqXHR.getResponseHeader("Last-Modified"), modified && (jQuery.lastModified[cacheURL] = modified), modified = jqXHR.getResponseHeader("etag"), modified && (jQuery.etag[cacheURL] = modified)), 204 === status || "HEAD" === s.type ? statusText = "nocontent" : 304 === status ? statusText = "notmodified" : (statusText = response.state, success = response.data, error = response.error, isSuccess = !error)) : (error = statusText, (status || !statusText) && (statusText = "error", 0 > status && (status = 0))), jqXHR.status = status, jqXHR.statusText = (nativeStatusText || statusText) + "", isSuccess ? deferred.resolveWith(callbackContext, [success, statusText, jqXHR]) : deferred.rejectWith(callbackContext, [jqXHR, statusText, error]), jqXHR.statusCode(statusCode), statusCode = void 0, fireGlobals && globalEventContext.trigger(isSuccess ? "ajaxSuccess" : "ajaxError", [jqXHR, s, isSuccess ? success : error]), completeDeferred.fireWith(callbackContext, [jqXHR, statusText]), fireGlobals && (globalEventContext.trigger("ajaxComplete", [jqXHR, s]), --jQuery.active || jQuery.event.trigger("ajaxStop")))
                }
                "object" == typeof url && (options = url, url = void 0), options = options || {};
                var parts, i, cacheURL, responseHeadersString, timeoutTimer, fireGlobals, transport, responseHeaders, s = jQuery.ajaxSetup({}, options),
                    callbackContext = s.context || s,
                    globalEventContext = s.context && (callbackContext.nodeType || callbackContext.jquery) ? jQuery(callbackContext) : jQuery.event,
                    deferred = jQuery.Deferred(),
                    completeDeferred = jQuery.Callbacks("once memory"),
                    statusCode = s.statusCode || {},
                    requestHeaders = {},
                    requestHeadersNames = {},
                    state = 0,
                    strAbort = "canceled",
                    jqXHR = {
                        readyState: 0,
                        getResponseHeader: function(key) {
                            var match;
                            if (2 === state) {
                                if (!responseHeaders)
                                    for (responseHeaders = {}; match = rheaders.exec(responseHeadersString);) responseHeaders[match[1].toLowerCase()] = match[2];
                                match = responseHeaders[key.toLowerCase()]
                            }
                            return null == match ? null : match
                        },
                        getAllResponseHeaders: function() {
                            return 2 === state ? responseHeadersString : null
                        },
                        setRequestHeader: function(name, value) {
                            var lname = name.toLowerCase();
                            return state || (name = requestHeadersNames[lname] = requestHeadersNames[lname] || name, requestHeaders[name] = value), this
                        },
                        overrideMimeType: function(type) {
                            return state || (s.mimeType = type), this
                        },
                        statusCode: function(map) {
                            var code;
                            if (map)
                                if (2 > state)
                                    for (code in map) statusCode[code] = [statusCode[code], map[code]];
                                else jqXHR.always(map[jqXHR.status]);
                            return this
                        },
                        abort: function(statusText) {
                            var finalText = statusText || strAbort;
                            return transport && transport.abort(finalText), done(0, finalText), this
                        }
                    };
                if (deferred.promise(jqXHR).complete = completeDeferred.add, jqXHR.success = jqXHR.done, jqXHR.error = jqXHR.fail, s.url = ((url || s.url || ajaxLocation) + "").replace(rhash, "").replace(rprotocol, ajaxLocParts[1] + "//"), s.type = options.method || options.type || s.method || s.type, s.dataTypes = jQuery.trim(s.dataType || "*").toLowerCase().match(rnotwhite) || [""], null == s.crossDomain && (parts = rurl.exec(s.url.toLowerCase()), s.crossDomain = !(!parts || parts[1] === ajaxLocParts[1] && parts[2] === ajaxLocParts[2] && (parts[3] || ("http:" === parts[1] ? "80" : "443")) === (ajaxLocParts[3] || ("http:" === ajaxLocParts[1] ? "80" : "443")))), s.data && s.processData && "string" != typeof s.data && (s.data = jQuery.param(s.data, s.traditional)), inspectPrefiltersOrTransports(prefilters, s, options, jqXHR), 2 === state) return jqXHR;
                fireGlobals = s.global, fireGlobals && 0 === jQuery.active++ && jQuery.event.trigger("ajaxStart"), s.type = s.type.toUpperCase(), s.hasContent = !rnoContent.test(s.type), cacheURL = s.url, s.hasContent || (s.data && (cacheURL = s.url += (rquery.test(cacheURL) ? "&" : "?") + s.data, delete s.data), s.cache === !1 && (s.url = rts.test(cacheURL) ? cacheURL.replace(rts, "$1_=" + nonce++) : cacheURL + (rquery.test(cacheURL) ? "&" : "?") + "_=" + nonce++)), s.ifModified && (jQuery.lastModified[cacheURL] && jqXHR.setRequestHeader("If-Modified-Since", jQuery.lastModified[cacheURL]), jQuery.etag[cacheURL] && jqXHR.setRequestHeader("If-None-Match", jQuery.etag[cacheURL])), (s.data && s.hasContent && s.contentType !== !1 || options.contentType) && jqXHR.setRequestHeader("Content-Type", s.contentType), jqXHR.setRequestHeader("Accept", s.dataTypes[0] && s.accepts[s.dataTypes[0]] ? s.accepts[s.dataTypes[0]] + ("*" !== s.dataTypes[0] ? ", " + allTypes + "; q=0.01" : "") : s.accepts["*"]);
                for (i in s.headers) jqXHR.setRequestHeader(i, s.headers[i]);
                if (s.beforeSend && (s.beforeSend.call(callbackContext, jqXHR, s) === !1 || 2 === state)) return jqXHR.abort();
                strAbort = "abort";
                for (i in {
                        success: 1,
                        error: 1,
                        complete: 1
                    }) jqXHR[i](s[i]);
                if (transport = inspectPrefiltersOrTransports(transports, s, options, jqXHR)) {
                    jqXHR.readyState = 1, fireGlobals && globalEventContext.trigger("ajaxSend", [jqXHR, s]), s.async && s.timeout > 0 && (timeoutTimer = setTimeout(function() {
                        jqXHR.abort("timeout")
                    }, s.timeout));
                    try {
                        state = 1, transport.send(requestHeaders, done)
                    } catch (e) {
                        if (!(2 > state)) throw e;
                        done(-1, e)
                    }
                } else done(-1, "No Transport");
                return jqXHR
            },
            getJSON: function(url, data, callback) {
                return jQuery.get(url, data, callback, "json")
            },
            getScript: function(url, callback) {
                return jQuery.get(url, void 0, callback, "script")
            }
        }), jQuery.each(["get", "post"], function(i, method) {
            jQuery[method] = function(url, data, callback, type) {
                return jQuery.isFunction(data) && (type = type || callback, callback = data, data = void 0), jQuery.ajax({
                    url: url,
                    type: method,
                    dataType: type,
                    data: data,
                    success: callback
                })
            }
        }), jQuery.each(["ajaxStart", "ajaxStop", "ajaxComplete", "ajaxError", "ajaxSuccess", "ajaxSend"], function(i, type) {
            jQuery.fn[type] = function(fn) {
                return this.on(type, fn)
            }
        }), jQuery._evalUrl = function(url) {
            return jQuery.ajax({
                url: url,
                type: "GET",
                dataType: "script",
                async: !1,
                global: !1,
                "throws": !0
            })
        }, jQuery.fn.extend({
            wrapAll: function(html) {
                if (jQuery.isFunction(html)) return this.each(function(i) {
                    jQuery(this).wrapAll(html.call(this, i))
                });
                if (this[0]) {
                    var wrap = jQuery(html, this[0].ownerDocument).eq(0).clone(!0);
                    this[0].parentNode && wrap.insertBefore(this[0]), wrap.map(function() {
                        for (var elem = this; elem.firstChild && 1 === elem.firstChild.nodeType;) elem = elem.firstChild;
                        return elem
                    }).append(this)
                }
                return this
            },
            wrapInner: function(html) {
                return jQuery.isFunction(html) ? this.each(function(i) {
                    jQuery(this).wrapInner(html.call(this, i))
                }) : this.each(function() {
                    var self = jQuery(this),
                        contents = self.contents();
                    contents.length ? contents.wrapAll(html) : self.append(html)
                })
            },
            wrap: function(html) {
                var isFunction = jQuery.isFunction(html);
                return this.each(function(i) {
                    jQuery(this).wrapAll(isFunction ? html.call(this, i) : html)
                })
            },
            unwrap: function() {
                return this.parent().each(function() {
                    jQuery.nodeName(this, "body") || jQuery(this).replaceWith(this.childNodes)
                }).end()
            }
        }), jQuery.expr.filters.hidden = function(elem) {
            return elem.offsetWidth <= 0 && elem.offsetHeight <= 0 || !support.reliableHiddenOffsets() && "none" === (elem.style && elem.style.display || jQuery.css(elem, "display"))
        }, jQuery.expr.filters.visible = function(elem) {
            return !jQuery.expr.filters.hidden(elem)
        };
        var r20 = /%20/g,
            rbracket = /\[\]$/,
            rCRLF = /\r?\n/g,
            rsubmitterTypes = /^(?:submit|button|image|reset|file)$/i,
            rsubmittable = /^(?:input|select|textarea|keygen)/i;
        jQuery.param = function(a, traditional) {
            var prefix, s = [],
                add = function(key, value) {
                    value = jQuery.isFunction(value) ? value() : null == value ? "" : value, s[s.length] = encodeURIComponent(key) + "=" + encodeURIComponent(value)
                };
            if (void 0 === traditional && (traditional = jQuery.ajaxSettings && jQuery.ajaxSettings.traditional), jQuery.isArray(a) || a.jquery && !jQuery.isPlainObject(a)) jQuery.each(a, function() {
                add(this.name, this.value)
            });
            else
                for (prefix in a) buildParams(prefix, a[prefix], traditional, add);
            return s.join("&").replace(r20, "+")
        }, jQuery.fn.extend({
            serialize: function() {
                return jQuery.param(this.serializeArray())
            },
            serializeArray: function() {
                return this.map(function() {
                    var elements = jQuery.prop(this, "elements");
                    return elements ? jQuery.makeArray(elements) : this
                }).filter(function() {
                    var type = this.type;
                    return this.name && !jQuery(this).is(":disabled") && rsubmittable.test(this.nodeName) && !rsubmitterTypes.test(type) && (this.checked || !rcheckableType.test(type))
                }).map(function(i, elem) {
                    var val = jQuery(this).val();
                    return null == val ? null : jQuery.isArray(val) ? jQuery.map(val, function(val) {
                        return {
                            name: elem.name,
                            value: val.replace(rCRLF, "\r\n")
                        }
                    }) : {
                        name: elem.name,
                        value: val.replace(rCRLF, "\r\n")
                    }
                }).get()
            }
        }), jQuery.ajaxSettings.xhr = void 0 !== window.ActiveXObject ? function() {
            return !this.isLocal && /^(get|post|head|put|delete|options)$/i.test(this.type) && createStandardXHR() || createActiveXHR()
        } : createStandardXHR;
        var xhrId = 0,
            xhrCallbacks = {},
            xhrSupported = jQuery.ajaxSettings.xhr();
        window.ActiveXObject && jQuery(window).on("unload", function() {
            for (var key in xhrCallbacks) xhrCallbacks[key](void 0, !0)
        }), support.cors = !!xhrSupported && "withCredentials" in xhrSupported, xhrSupported = support.ajax = !!xhrSupported, xhrSupported && jQuery.ajaxTransport(function(options) {
            if (!options.crossDomain || support.cors) {
                var callback;
                return {
                    send: function(headers, complete) {
                        var i, xhr = options.xhr(),
                            id = ++xhrId;
                        if (xhr.open(options.type, options.url, options.async, options.username, options.password), options.xhrFields)
                            for (i in options.xhrFields) xhr[i] = options.xhrFields[i];
                        options.mimeType && xhr.overrideMimeType && xhr.overrideMimeType(options.mimeType), options.crossDomain || headers["X-Requested-With"] || (headers["X-Requested-With"] = "XMLHttpRequest");
                        for (i in headers) void 0 !== headers[i] && xhr.setRequestHeader(i, headers[i] + "");
                        xhr.send(options.hasContent && options.data || null), callback = function(_, isAbort) {
                            var status, statusText, responses;
                            if (callback && (isAbort || 4 === xhr.readyState))
                                if (delete xhrCallbacks[id], callback = void 0, xhr.onreadystatechange = jQuery.noop, isAbort) 4 !== xhr.readyState && xhr.abort();
                                else {
                                    responses = {}, status = xhr.status, "string" == typeof xhr.responseText && (responses.text = xhr.responseText);
                                    try {
                                        statusText = xhr.statusText
                                    } catch (e) {
                                        statusText = ""
                                    }
                                    status || !options.isLocal || options.crossDomain ? 1223 === status && (status = 204) : status = responses.text ? 200 : 404
                                }
                            responses && complete(status, statusText, responses, xhr.getAllResponseHeaders())
                        }, options.async ? 4 === xhr.readyState ? setTimeout(callback) : xhr.onreadystatechange = xhrCallbacks[id] = callback : callback()
                    },
                    abort: function() {
                        callback && callback(void 0, !0)
                    }
                }
            }
        }), jQuery.ajaxSetup({
            accepts: {
                script: "text/javascript, application/javascript, application/ecmascript, application/x-ecmascript"
            },
            contents: {
                script: /(?:java|ecma)script/
            },
            converters: {
                "text script": function(text) {
                    return jQuery.globalEval(text), text
                }
            }
        }), jQuery.ajaxPrefilter("script", function(s) {
            void 0 === s.cache && (s.cache = !1), s.crossDomain && (s.type = "GET", s.global = !1)
        }), jQuery.ajaxTransport("script", function(s) {
            if (s.crossDomain) {
                var script, head = document.head || jQuery("head")[0] || document.documentElement;
                return {
                    send: function(_, callback) {
                        script = document.createElement("script"), script.async = !0, s.scriptCharset && (script.charset = s.scriptCharset), script.src = s.url, script.onload = script.onreadystatechange = function(_, isAbort) {
                            (isAbort || !script.readyState || /loaded|complete/.test(script.readyState)) && (script.onload = script.onreadystatechange = null, script.parentNode && script.parentNode.removeChild(script), script = null, isAbort || callback(200, "success"))
                        }, head.insertBefore(script, head.firstChild)
                    },
                    abort: function() {
                        script && script.onload(void 0, !0)
                    }
                }
            }
        });
        var oldCallbacks = [],
            rjsonp = /(=)\?(?=&|$)|\?\?/;
        jQuery.ajaxSetup({
            jsonp: "callback",
            jsonpCallback: function() {
                var callback = oldCallbacks.pop() || jQuery.expando + "_" + nonce++;
                return this[callback] = !0, callback
            }
        }), jQuery.ajaxPrefilter("json jsonp", function(s, originalSettings, jqXHR) {
            var callbackName, overwritten, responseContainer, jsonProp = s.jsonp !== !1 && (rjsonp.test(s.url) ? "url" : "string" == typeof s.data && !(s.contentType || "").indexOf("application/x-www-form-urlencoded") && rjsonp.test(s.data) && "data");
            return jsonProp || "jsonp" === s.dataTypes[0] ? (callbackName = s.jsonpCallback = jQuery.isFunction(s.jsonpCallback) ? s.jsonpCallback() : s.jsonpCallback, jsonProp ? s[jsonProp] = s[jsonProp].replace(rjsonp, "$1" + callbackName) : s.jsonp !== !1 && (s.url += (rquery.test(s.url) ? "&" : "?") + s.jsonp + "=" + callbackName), s.converters["script json"] = function() {
                return responseContainer || jQuery.error(callbackName + " was not called"), responseContainer[0]
            }, s.dataTypes[0] = "json", overwritten = window[callbackName], window[callbackName] = function() {
                responseContainer = arguments
            }, jqXHR.always(function() {
                window[callbackName] = overwritten, s[callbackName] && (s.jsonpCallback = originalSettings.jsonpCallback, oldCallbacks.push(callbackName)), responseContainer && jQuery.isFunction(overwritten) && overwritten(responseContainer[0]), responseContainer = overwritten = void 0
            }), "script") : void 0
        }), jQuery.parseHTML = function(data, context, keepScripts) {
            if (!data || "string" != typeof data) return null;
            "boolean" == typeof context && (keepScripts = context, context = !1), context = context || document;
            var parsed = rsingleTag.exec(data),
                scripts = !keepScripts && [];
            return parsed ? [context.createElement(parsed[1])] : (parsed = jQuery.buildFragment([data], context, scripts), scripts && scripts.length && jQuery(scripts).remove(), jQuery.merge([], parsed.childNodes))
        };
        var _load = jQuery.fn.load;
        jQuery.fn.load = function(url, params, callback) {
            if ("string" != typeof url && _load) return _load.apply(this, arguments);
            var selector, response, type, self = this,
                off = url.indexOf(" ");
            return off >= 0 && (selector = jQuery.trim(url.slice(off, url.length)), url = url.slice(0, off)), jQuery.isFunction(params) ? (callback = params, params = void 0) : params && "object" == typeof params && (type = "POST"), self.length > 0 && jQuery.ajax({
                url: url,
                type: type,
                dataType: "html",
                data: params
            }).done(function(responseText) {
                response = arguments, self.html(selector ? jQuery("<div>").append(jQuery.parseHTML(responseText)).find(selector) : responseText)
            }).complete(callback && function(jqXHR, status) {
                self.each(callback, response || [jqXHR.responseText, status, jqXHR])
            }), this
        }, jQuery.expr.filters.animated = function(elem) {
            return jQuery.grep(jQuery.timers, function(fn) {
                return elem === fn.elem
            }).length
        };
        var docElem = window.document.documentElement;
        jQuery.offset = {
            setOffset: function(elem, options, i) {
                var curPosition, curLeft, curCSSTop, curTop, curOffset, curCSSLeft, calculatePosition, position = jQuery.css(elem, "position"),
                    curElem = jQuery(elem),
                    props = {};
                "static" === position && (elem.style.position = "relative"), curOffset = curElem.offset(), curCSSTop = jQuery.css(elem, "top"), curCSSLeft = jQuery.css(elem, "left"), calculatePosition = ("absolute" === position || "fixed" === position) && jQuery.inArray("auto", [curCSSTop, curCSSLeft]) > -1, calculatePosition ? (curPosition = curElem.position(), curTop = curPosition.top, curLeft = curPosition.left) : (curTop = parseFloat(curCSSTop) || 0, curLeft = parseFloat(curCSSLeft) || 0), jQuery.isFunction(options) && (options = options.call(elem, i, curOffset)), null != options.top && (props.top = options.top - curOffset.top + curTop), null != options.left && (props.left = options.left - curOffset.left + curLeft), "using" in options ? options.using.call(elem, props) : curElem.css(props)
            }
        }, jQuery.fn.extend({
            offset: function(options) {
                if (arguments.length) return void 0 === options ? this : this.each(function(i) {
                    jQuery.offset.setOffset(this, options, i)
                });
                var docElem, win, box = {
                        top: 0,
                        left: 0
                    },
                    elem = this[0],
                    doc = elem && elem.ownerDocument;
                if (doc) return docElem = doc.documentElement, jQuery.contains(docElem, elem) ? (typeof elem.getBoundingClientRect !== strundefined && (box = elem.getBoundingClientRect()), win = getWindow(doc), {
                    top: box.top + (win.pageYOffset || docElem.scrollTop) - (docElem.clientTop || 0),
                    left: box.left + (win.pageXOffset || docElem.scrollLeft) - (docElem.clientLeft || 0)
                }) : box
            },
            position: function() {
                if (this[0]) {
                    var offsetParent, offset, parentOffset = {
                            top: 0,
                            left: 0
                        },
                        elem = this[0];
                    return "fixed" === jQuery.css(elem, "position") ? offset = elem.getBoundingClientRect() : (offsetParent = this.offsetParent(), offset = this.offset(), jQuery.nodeName(offsetParent[0], "html") || (parentOffset = offsetParent.offset()), parentOffset.top += jQuery.css(offsetParent[0], "borderTopWidth", !0), parentOffset.left += jQuery.css(offsetParent[0], "borderLeftWidth", !0)), {
                        top: offset.top - parentOffset.top - jQuery.css(elem, "marginTop", !0),
                        left: offset.left - parentOffset.left - jQuery.css(elem, "marginLeft", !0)
                    }
                }
            },
            offsetParent: function() {
                return this.map(function() {
                    for (var offsetParent = this.offsetParent || docElem; offsetParent && !jQuery.nodeName(offsetParent, "html") && "static" === jQuery.css(offsetParent, "position");) offsetParent = offsetParent.offsetParent;
                    return offsetParent || docElem
                })
            }
        }), jQuery.each({
            scrollLeft: "pageXOffset",
            scrollTop: "pageYOffset"
        }, function(method, prop) {
            var top = /Y/.test(prop);
            jQuery.fn[method] = function(val) {
                return access(this, function(elem, method, val) {
                    var win = getWindow(elem);
                    return void 0 === val ? win ? prop in win ? win[prop] : win.document.documentElement[method] : elem[method] : (win ? win.scrollTo(top ? jQuery(win).scrollLeft() : val, top ? val : jQuery(win).scrollTop()) : elem[method] = val, void 0)
                }, method, val, arguments.length, null)
            }
        }), jQuery.each(["top", "left"], function(i, prop) {
            jQuery.cssHooks[prop] = addGetHookIf(support.pixelPosition, function(elem, computed) {
                return computed ? (computed = curCSS(elem, prop), rnumnonpx.test(computed) ? jQuery(elem).position()[prop] + "px" : computed) : void 0
            })
        }), jQuery.each({
            Height: "height",
            Width: "width"
        }, function(name, type) {
            jQuery.each({
                padding: "inner" + name,
                content: type,
                "": "outer" + name
            }, function(defaultExtra, funcName) {
                jQuery.fn[funcName] = function(margin, value) {
                    var chainable = arguments.length && (defaultExtra || "boolean" != typeof margin),
                        extra = defaultExtra || (margin === !0 || value === !0 ? "margin" : "border");
                    return access(this, function(elem, type, value) {
                        var doc;
                        return jQuery.isWindow(elem) ? elem.document.documentElement["client" + name] : 9 === elem.nodeType ? (doc = elem.documentElement, Math.max(elem.body["scroll" + name], doc["scroll" + name], elem.body["offset" + name], doc["offset" + name], doc["client" + name])) : void 0 === value ? jQuery.css(elem, type, extra) : jQuery.style(elem, type, value, extra)
                    }, type, chainable ? margin : void 0, chainable, null)
                }
            })
        }), jQuery.fn.size = function() {
            return this.length
        }, jQuery.fn.andSelf = jQuery.fn.addBack, "function" == typeof define && define.amd && define("jquery", [], function() {
            return jQuery
        });
        var _jQuery = window.jQuery,
            _$ = window.$;
        return jQuery.noConflict = function(deep) {
            return window.$ === jQuery && (window.$ = _$), deep && window.jQuery === jQuery && (window.jQuery = _jQuery), jQuery
        }, typeof noGlobal === strundefined && (window.jQuery = window.$ = jQuery), jQuery
    }), define("jquery-src", [], function() {}), define("jquery", ["jquery-src"], function() {
        function needFastClick() {
            var ua = navigator.userAgent;
            return /Chrome\/[0-9]+/i.test(ua) && /Windows NT/i.test(ua) ? !1 : !0
        }

        function returnFalse() {
            return !1
        }
        var _cleanData = $.cleanData;
        jQuery.cleanData = function(elems) {
            for (var elem, i = 0; null != (elem = elems[i]); i++) try {
                $(elem).triggerHandler("removing")
            } catch (e) {}
            _cleanData(elems)
        };
        var win = window,
            doc = document,
            hasMouseEvent = !("ontouchstart" in win || (win.PointerEvent || win.MSPointerEvent) && /IEMobile/.test(navigator.userAgent) || win.DocumentTouch && doc instanceof DocumentTouch);
        return hasMouseEvent ? jQuery : (require("hammer", function(Hammer) {
            Hammer(document, {
                tapAlways: !1,
                preventMouse: !0
            })
        }), needFastClick() ? (jQuery.fn.extend({
            on: function(types, selector, data, fn, one) {
                var origFn, type;
                if ("object" == typeof types) {
                    "string" != typeof selector && (data = data || selector, selector = void 0);
                    for (type in types) this.on(type, selector, data, types[type], one);
                    return this
                }
                if (null == data && null == fn ? (fn = selector, data = selector = void 0) : null == fn && ("string" == typeof selector ? (fn = data, data = void 0) : (fn = data, data = selector, selector = void 0)), fn === !1) fn = returnFalse;
                else if (!fn) return this;
                return 1 === one && (origFn = fn, fn = function(event) {
                    return jQuery().off(event), origFn.apply(this, arguments)
                }, fn.guid = origFn.guid || (origFn.guid = jQuery.guid++)), this.each(function() {
                    types = /click/g.test(types) && !/preventDefault/g.test(fn) && selector ? types.replace("click", "tap") : types, jQuery.event.add(this, types, fn, data, selector)
                })
            }
        }), jQuery) : jQuery)
    }), define("mod/ajax", ["jquery", "mod/cookie"], function($, cookie) {
        function ajax() {
            var args = arguments,
                options = args[args.length - 1] || {};
            if (options.arkWithDocReferer && cookie("prev_referer", document.referrer, {
                    path: "/",
                    "max-age": 2
                }), options.type && "GET" !== options.type.toUpperCase() && (options.headers = $.extend({}, options.headers, {
                    "X-CSRF-Token": cookie("ck")
                })), cookie("profile")) {
                var userFilter = null;
                $.each(options, function(key, val) {
                    "dataFilter" === key && (userFilter = val, delete args[key])
                }), options = $.extend(options, {
                    dataFilter: function(data) {
                        try {
                            data = $.parseJSON(data)
                        } catch (e) {
                            data = data
                        }
                        return require("widget/profile", function(profile) {
                            profile = profile || Ark.profile, profile.add({
                                time: data.pt,
                                uri: data.uri,
                                type: options.type,
                                stdout: data.profile
                            })
                        }), null === userFilter ? data.rawData : userFilter(data.rawData)
                    }
                })
            }
            return $.ajax.apply($, args)
        }
        return ajax.post = function(url, data, callback, dataType) {
            return $.isFunction(data) && (dataType = dataType || callback, callback = data, data = void 0), ajax(url, {
                type: "POST",
                data: data,
                success: callback,
                dataType: dataType || "json"
            })
        }, ajax.get = function(url, callback, dataType) {
            return ajax(url, {
                type: "GET",
                success: callback,
                dataType: dataType || "json"
            })
        }, ajax.methodMap = {
            read: "GET",
            create: "POST",
            update: "PUT",
            patch: "PATCH",
            "delete": "DELETE"
        }, ajax.request = function(method, url, data, options, dataType) {
            return $.isFunction(data) && (dataType = options, options = data, data = {}), ajax(url, $.extend({
                type: method,
                data: data,
                dataType: dataType || "text"
            }, options))
        }, ajax
    }),
    function() {
        var root = this,
            previousUnderscore = root._,
            breaker = {},
            ArrayProto = Array.prototype,
            ObjProto = Object.prototype,
            FuncProto = Function.prototype,
            push = ArrayProto.push,
            slice = ArrayProto.slice,
            concat = ArrayProto.concat,
            toString = ObjProto.toString,
            hasOwnProperty = ObjProto.hasOwnProperty,
            nativeForEach = ArrayProto.forEach,
            nativeMap = ArrayProto.map,
            nativeReduce = ArrayProto.reduce,
            nativeReduceRight = ArrayProto.reduceRight,
            nativeFilter = ArrayProto.filter,
            nativeEvery = ArrayProto.every,
            nativeSome = ArrayProto.some,
            nativeIndexOf = ArrayProto.indexOf,
            nativeLastIndexOf = ArrayProto.lastIndexOf,
            nativeIsArray = Array.isArray,
            nativeKeys = Object.keys,
            nativeBind = FuncProto.bind,
            _ = function(obj) {
                return obj instanceof _ ? obj : this instanceof _ ? (this._wrapped = obj, void 0) : new _(obj)
            };
        "undefined" != typeof exports ? ("undefined" != typeof module && module.exports && (exports = module.exports = _), exports._ = _) : root._ = _, _.VERSION = "1.6.0";
        var each = _.each = _.forEach = function(obj, iterator, context) {
            if (null == obj) return obj;
            if (nativeForEach && obj.forEach === nativeForEach) obj.forEach(iterator, context);
            else if (obj.length === +obj.length) {
                for (var i = 0, length = obj.length; length > i; i++)
                    if (iterator.call(context, obj[i], i, obj) === breaker) return
            } else
                for (var keys = _.keys(obj), i = 0, length = keys.length; length > i; i++)
                    if (iterator.call(context, obj[keys[i]], keys[i], obj) === breaker) return; return obj
        };
        _.map = _.collect = function(obj, iterator, context) {
            var results = [];
            return null == obj ? results : nativeMap && obj.map === nativeMap ? obj.map(iterator, context) : (each(obj, function(value, index, list) {
                results.push(iterator.call(context, value, index, list))
            }), results)
        };
        var reduceError = "Reduce of empty array with no initial value";
        _.reduce = _.foldl = _.inject = function(obj, iterator, memo, context) {
            var initial = arguments.length > 2;
            if (null == obj && (obj = []), nativeReduce && obj.reduce === nativeReduce) return context && (iterator = _.bind(iterator, context)), initial ? obj.reduce(iterator, memo) : obj.reduce(iterator);
            if (each(obj, function(value, index, list) {
                    initial ? memo = iterator.call(context, memo, value, index, list) : (memo = value, initial = !0)
                }), !initial) throw new TypeError(reduceError);
            return memo
        }, _.reduceRight = _.foldr = function(obj, iterator, memo, context) {
            var initial = arguments.length > 2;
            if (null == obj && (obj = []), nativeReduceRight && obj.reduceRight === nativeReduceRight) return context && (iterator = _.bind(iterator, context)), initial ? obj.reduceRight(iterator, memo) : obj.reduceRight(iterator);
            var length = obj.length;
            if (length !== +length) {
                var keys = _.keys(obj);
                length = keys.length
            }
            if (each(obj, function(value, index, list) {
                    index = keys ? keys[--length] : --length, initial ? memo = iterator.call(context, memo, obj[index], index, list) : (memo = obj[index], initial = !0)
                }), !initial) throw new TypeError(reduceError);
            return memo
        }, _.find = _.detect = function(obj, predicate, context) {
            var result;
            return any(obj, function(value, index, list) {
                return predicate.call(context, value, index, list) ? (result = value, !0) : void 0
            }), result
        }, _.filter = _.select = function(obj, predicate, context) {
            var results = [];
            return null == obj ? results : nativeFilter && obj.filter === nativeFilter ? obj.filter(predicate, context) : (each(obj, function(value, index, list) {
                predicate.call(context, value, index, list) && results.push(value)
            }), results)
        }, _.reject = function(obj, predicate, context) {
            return _.filter(obj, function(value, index, list) {
                return !predicate.call(context, value, index, list)
            }, context)
        }, _.every = _.all = function(obj, predicate, context) {
            predicate || (predicate = _.identity);
            var result = !0;
            return null == obj ? result : nativeEvery && obj.every === nativeEvery ? obj.every(predicate, context) : (each(obj, function(value, index, list) {
                return (result = result && predicate.call(context, value, index, list)) ? void 0 : breaker
            }), !!result)
        };
        var any = _.some = _.any = function(obj, predicate, context) {
            predicate || (predicate = _.identity);
            var result = !1;
            return null == obj ? result : nativeSome && obj.some === nativeSome ? obj.some(predicate, context) : (each(obj, function(value, index, list) {
                return result || (result = predicate.call(context, value, index, list)) ? breaker : void 0
            }), !!result)
        };
        _.contains = _.include = function(obj, target) {
            return null == obj ? !1 : nativeIndexOf && obj.indexOf === nativeIndexOf ? -1 != obj.indexOf(target) : any(obj, function(value) {
                return value === target
            })
        }, _.invoke = function(obj, method) {
            var args = slice.call(arguments, 2),
                isFunc = _.isFunction(method);
            return _.map(obj, function(value) {
                return (isFunc ? method : value[method]).apply(value, args)
            })
        }, _.pluck = function(obj, key) {
            return _.map(obj, _.property(key))
        }, _.where = function(obj, attrs) {
            return _.filter(obj, _.matches(attrs))
        }, _.findWhere = function(obj, attrs) {
            return _.find(obj, _.matches(attrs))
        }, _.max = function(obj, iterator, context) {
            if (!iterator && _.isArray(obj) && obj[0] === +obj[0] && obj.length < 65535) return Math.max.apply(Math, obj);
            var result = -1 / 0,
                lastComputed = -1 / 0;
            return each(obj, function(value, index, list) {
                var computed = iterator ? iterator.call(context, value, index, list) : value;
                computed > lastComputed && (result = value, lastComputed = computed)
            }), result
        }, _.min = function(obj, iterator, context) {
            if (!iterator && _.isArray(obj) && obj[0] === +obj[0] && obj.length < 65535) return Math.min.apply(Math, obj);
            var result = 1 / 0,
                lastComputed = 1 / 0;
            return each(obj, function(value, index, list) {
                var computed = iterator ? iterator.call(context, value, index, list) : value;
                lastComputed > computed && (result = value, lastComputed = computed)
            }), result
        }, _.shuffle = function(obj) {
            var rand, index = 0,
                shuffled = [];
            return each(obj, function(value) {
                rand = _.random(index++), shuffled[index - 1] = shuffled[rand], shuffled[rand] = value
            }), shuffled
        }, _.sample = function(obj, n, guard) {
            return null == n || guard ? (obj.length !== +obj.length && (obj = _.values(obj)), obj[_.random(obj.length - 1)]) : _.shuffle(obj).slice(0, Math.max(0, n))
        };
        var lookupIterator = function(value) {
            return null == value ? _.identity : _.isFunction(value) ? value : _.property(value)
        };
        _.sortBy = function(obj, iterator, context) {
            return iterator = lookupIterator(iterator), _.pluck(_.map(obj, function(value, index, list) {
                return {
                    value: value,
                    index: index,
                    criteria: iterator.call(context, value, index, list)
                }
            }).sort(function(left, right) {
                var a = left.criteria,
                    b = right.criteria;
                if (a !== b) {
                    if (a > b || void 0 === a) return 1;
                    if (b > a || void 0 === b) return -1
                }
                return left.index - right.index
            }), "value")
        };
        var group = function(behavior) {
            return function(obj, iterator, context) {
                var result = {};
                return iterator = lookupIterator(iterator), each(obj, function(value, index) {
                    var key = iterator.call(context, value, index, obj);
                    behavior(result, key, value)
                }), result
            }
        };
        _.groupBy = group(function(result, key, value) {
            _.has(result, key) ? result[key].push(value) : result[key] = [value]
        }), _.indexBy = group(function(result, key, value) {
            result[key] = value
        }), _.countBy = group(function(result, key) {
            _.has(result, key) ? result[key] ++ : result[key] = 1
        }), _.sortedIndex = function(array, obj, iterator, context) {
            iterator = lookupIterator(iterator);
            for (var value = iterator.call(context, obj), low = 0, high = array.length; high > low;) {
                var mid = low + high >>> 1;
                iterator.call(context, array[mid]) < value ? low = mid + 1 : high = mid
            }
            return low
        }, _.toArray = function(obj) {
            return obj ? _.isArray(obj) ? slice.call(obj) : obj.length === +obj.length ? _.map(obj, _.identity) : _.values(obj) : []
        }, _.size = function(obj) {
            return null == obj ? 0 : obj.length === +obj.length ? obj.length : _.keys(obj).length
        }, _.first = _.head = _.take = function(array, n, guard) {
            return null == array ? void 0 : null == n || guard ? array[0] : 0 > n ? [] : slice.call(array, 0, n)
        }, _.initial = function(array, n, guard) {
            return slice.call(array, 0, array.length - (null == n || guard ? 1 : n))
        }, _.last = function(array, n, guard) {
            return null == array ? void 0 : null == n || guard ? array[array.length - 1] : slice.call(array, Math.max(array.length - n, 0))
        }, _.rest = _.tail = _.drop = function(array, n, guard) {
            return slice.call(array, null == n || guard ? 1 : n)
        }, _.compact = function(array) {
            return _.filter(array, _.identity)
        };
        var flatten = function(input, shallow, output) {
            return shallow && _.every(input, _.isArray) ? concat.apply(output, input) : (each(input, function(value) {
                _.isArray(value) || _.isArguments(value) ? shallow ? push.apply(output, value) : flatten(value, shallow, output) : output.push(value)
            }), output)
        };
        _.flatten = function(array, shallow) {
            return flatten(array, shallow, [])
        }, _.without = function(array) {
            return _.difference(array, slice.call(arguments, 1))
        }, _.partition = function(array, predicate) {
            var pass = [],
                fail = [];
            return each(array, function(elem) {
                (predicate(elem) ? pass : fail).push(elem)
            }), [pass, fail]
        }, _.uniq = _.unique = function(array, isSorted, iterator, context) {
            _.isFunction(isSorted) && (context = iterator, iterator = isSorted, isSorted = !1);
            var initial = iterator ? _.map(array, iterator, context) : array,
                results = [],
                seen = [];
            return each(initial, function(value, index) {
                (isSorted ? index && seen[seen.length - 1] === value : _.contains(seen, value)) || (seen.push(value), results.push(array[index]))
            }), results
        }, _.union = function() {
            return _.uniq(_.flatten(arguments, !0))
        }, _.intersection = function(array) {
            var rest = slice.call(arguments, 1);
            return _.filter(_.uniq(array), function(item) {
                return _.every(rest, function(other) {
                    return _.contains(other, item)
                })
            })
        }, _.difference = function(array) {
            var rest = concat.apply(ArrayProto, slice.call(arguments, 1));
            return _.filter(array, function(value) {
                return !_.contains(rest, value)
            })
        }, _.zip = function() {
            for (var length = _.max(_.pluck(arguments, "length").concat(0)), results = new Array(length), i = 0; length > i; i++) results[i] = _.pluck(arguments, "" + i);
            return results
        }, _.object = function(list, values) {
            if (null == list) return {};
            for (var result = {}, i = 0, length = list.length; length > i; i++) values ? result[list[i]] = values[i] : result[list[i][0]] = list[i][1];
            return result
        }, _.indexOf = function(array, item, isSorted) {
            if (null == array) return -1;
            var i = 0,
                length = array.length;
            if (isSorted) {
                if ("number" != typeof isSorted) return i = _.sortedIndex(array, item), array[i] === item ? i : -1;
                i = 0 > isSorted ? Math.max(0, length + isSorted) : isSorted
            }
            if (nativeIndexOf && array.indexOf === nativeIndexOf) return array.indexOf(item, isSorted);
            for (; length > i; i++)
                if (array[i] === item) return i;
            return -1
        }, _.lastIndexOf = function(array, item, from) {
            if (null == array) return -1;
            var hasIndex = null != from;
            if (nativeLastIndexOf && array.lastIndexOf === nativeLastIndexOf) return hasIndex ? array.lastIndexOf(item, from) : array.lastIndexOf(item);
            for (var i = hasIndex ? from : array.length; i--;)
                if (array[i] === item) return i;
            return -1
        }, _.range = function(start, stop, step) {
            arguments.length <= 1 && (stop = start || 0, start = 0), step = arguments[2] || 1;
            for (var length = Math.max(Math.ceil((stop - start) / step), 0), idx = 0, range = new Array(length); length > idx;) range[idx++] = start, start += step;
            return range
        };
        var ctor = function() {};
        _.bind = function(func, context) {
            var args, bound;
            if (nativeBind && func.bind === nativeBind) return nativeBind.apply(func, slice.call(arguments, 1));
            if (!_.isFunction(func)) throw new TypeError;
            return args = slice.call(arguments, 2), bound = function() {
                if (!(this instanceof bound)) return func.apply(context, args.concat(slice.call(arguments)));
                ctor.prototype = func.prototype;
                var self = new ctor;
                ctor.prototype = null;
                var result = func.apply(self, args.concat(slice.call(arguments)));
                return Object(result) === result ? result : self
            }
        }, _.partial = function(func) {
            var boundArgs = slice.call(arguments, 1);
            return function() {
                for (var position = 0, args = boundArgs.slice(), i = 0, length = args.length; length > i; i++) args[i] === _ && (args[i] = arguments[position++]);
                for (; position < arguments.length;) args.push(arguments[position++]);
                return func.apply(this, args)
            }
        }, _.bindAll = function(obj) {
            var funcs = slice.call(arguments, 1);
            if (0 === funcs.length) throw new Error("bindAll must be passed function names");
            return each(funcs, function(f) {
                obj[f] = _.bind(obj[f], obj)
            }), obj
        }, _.memoize = function(func, hasher) {
            var memo = {};
            return hasher || (hasher = _.identity),
                function() {
                    var key = hasher.apply(this, arguments);
                    return _.has(memo, key) ? memo[key] : memo[key] = func.apply(this, arguments)
                }
        }, _.delay = function(func, wait) {
            var args = slice.call(arguments, 2);
            return setTimeout(function() {
                return func.apply(null, args)
            }, wait)
        }, _.defer = function(func) {
            return _.delay.apply(_, [func, 1].concat(slice.call(arguments, 1)))
        }, _.throttle = function(func, wait, options) {
            var context, args, result, timeout = null,
                previous = 0;
            options || (options = {});
            var later = function() {
                previous = options.leading === !1 ? 0 : _.now(), timeout = null, result = func.apply(context, args), context = args = null
            };
            return function() {
                var now = _.now();
                previous || options.leading !== !1 || (previous = now);
                var remaining = wait - (now - previous);
                return context = this, args = arguments, 0 >= remaining ? (clearTimeout(timeout), timeout = null, previous = now, result = func.apply(context, args), context = args = null) : timeout || options.trailing === !1 || (timeout = setTimeout(later, remaining)), result
            }
        }, _.debounce = function(func, wait, immediate) {
            var timeout, args, context, timestamp, result, later = function() {
                var last = _.now() - timestamp;
                wait > last ? timeout = setTimeout(later, wait - last) : (timeout = null, immediate || (result = func.apply(context, args), context = args = null))
            };
            return function() {
                context = this, args = arguments, timestamp = _.now();
                var callNow = immediate && !timeout;
                return timeout || (timeout = setTimeout(later, wait)), callNow && (result = func.apply(context, args), context = args = null), result
            }
        }, _.once = function(func) {
            var memo, ran = !1;
            return function() {
                return ran ? memo : (ran = !0, memo = func.apply(this, arguments), func = null, memo)
            }
        }, _.wrap = function(func, wrapper) {
            return _.partial(wrapper, func)
        }, _.compose = function() {
            var funcs = arguments;
            return function() {
                for (var args = arguments, i = funcs.length - 1; i >= 0; i--) args = [funcs[i].apply(this, args)];
                return args[0]
            }
        }, _.after = function(times, func) {
            return function() {
                return --times < 1 ? func.apply(this, arguments) : void 0
            }
        }, _.keys = function(obj) {
            if (!_.isObject(obj)) return [];
            if (nativeKeys) return nativeKeys(obj);
            var keys = [];
            for (var key in obj) _.has(obj, key) && keys.push(key);
            return keys
        }, _.values = function(obj) {
            for (var keys = _.keys(obj), length = keys.length, values = new Array(length), i = 0; length > i; i++) values[i] = obj[keys[i]];
            return values
        }, _.pairs = function(obj) {
            for (var keys = _.keys(obj), length = keys.length, pairs = new Array(length), i = 0; length > i; i++) pairs[i] = [keys[i], obj[keys[i]]];
            return pairs
        }, _.invert = function(obj) {
            for (var result = {}, keys = _.keys(obj), i = 0, length = keys.length; length > i; i++) result[obj[keys[i]]] = keys[i];
            return result
        }, _.functions = _.methods = function(obj) {
            var names = [];
            for (var key in obj) _.isFunction(obj[key]) && names.push(key);
            return names.sort()
        }, _.extend = function(obj) {
            return each(slice.call(arguments, 1), function(source) {
                if (source)
                    for (var prop in source) obj[prop] = source[prop]
            }), obj
        }, _.pick = function(obj) {
            var copy = {},
                keys = concat.apply(ArrayProto, slice.call(arguments, 1));
            return each(keys, function(key) {
                key in obj && (copy[key] = obj[key])
            }), copy
        }, _.omit = function(obj) {
            var copy = {},
                keys = concat.apply(ArrayProto, slice.call(arguments, 1));
            for (var key in obj) _.contains(keys, key) || (copy[key] = obj[key]);
            return copy
        }, _.defaults = function(obj) {
            return each(slice.call(arguments, 1), function(source) {
                if (source)
                    for (var prop in source) void 0 === obj[prop] && (obj[prop] = source[prop])
            }), obj
        }, _.clone = function(obj) {
            return _.isObject(obj) ? _.isArray(obj) ? obj.slice() : _.extend({}, obj) : obj
        }, _.tap = function(obj, interceptor) {
            return interceptor(obj), obj
        };
        var eq = function(a, b, aStack, bStack) {
            if (a === b) return 0 !== a || 1 / a == 1 / b;
            if (null == a || null == b) return a === b;
            a instanceof _ && (a = a._wrapped), b instanceof _ && (b = b._wrapped);
            var className = toString.call(a);
            if (className != toString.call(b)) return !1;
            switch (className) {
                case "[object String]":
                    return a == String(b);
                case "[object Number]":
                    return a != +a ? b != +b : 0 == a ? 1 / a == 1 / b : a == +b;
                case "[object Date]":
                case "[object Boolean]":
                    return +a == +b;
                case "[object RegExp]":
                    return a.source == b.source && a.global == b.global && a.multiline == b.multiline && a.ignoreCase == b.ignoreCase
            }
            if ("object" != typeof a || "object" != typeof b) return !1;
            for (var length = aStack.length; length--;)
                if (aStack[length] == a) return bStack[length] == b;
            var aCtor = a.constructor,
                bCtor = b.constructor;
            if (aCtor !== bCtor && !(_.isFunction(aCtor) && aCtor instanceof aCtor && _.isFunction(bCtor) && bCtor instanceof bCtor) && "constructor" in a && "constructor" in b) return !1;
            aStack.push(a), bStack.push(b);
            var size = 0,
                result = !0;
            if ("[object Array]" == className) {
                if (size = a.length, result = size == b.length)
                    for (; size-- && (result = eq(a[size], b[size], aStack, bStack)););
            } else {
                for (var key in a)
                    if (_.has(a, key) && (size++, !(result = _.has(b, key) && eq(a[key], b[key], aStack, bStack)))) break;
                if (result) {
                    for (key in b)
                        if (_.has(b, key) && !size--) break;
                    result = !size
                }
            }
            return aStack.pop(), bStack.pop(), result
        };
        _.isEqual = function(a, b) {
            return eq(a, b, [], [])
        }, _.isEmpty = function(obj) {
            if (null == obj) return !0;
            if (_.isArray(obj) || _.isString(obj)) return 0 === obj.length;
            for (var key in obj)
                if (_.has(obj, key)) return !1;
            return !0
        }, _.isElement = function(obj) {
            return !(!obj || 1 !== obj.nodeType)
        }, _.isArray = nativeIsArray || function(obj) {
            return "[object Array]" == toString.call(obj)
        }, _.isObject = function(obj) {
            return obj === Object(obj)
        }, each(["Arguments", "Function", "String", "Number", "Date", "RegExp"], function(name) {
            _["is" + name] = function(obj) {
                return toString.call(obj) == "[object " + name + "]"
            }
        }), _.isArguments(arguments) || (_.isArguments = function(obj) {
            return !(!obj || !_.has(obj, "callee"))
        }), "function" != typeof /./ && (_.isFunction = function(obj) {
            return "function" == typeof obj
        }), _.isFinite = function(obj) {
            return isFinite(obj) && !isNaN(parseFloat(obj))
        }, _.isNaN = function(obj) {
            return _.isNumber(obj) && obj != +obj
        }, _.isBoolean = function(obj) {
            return obj === !0 || obj === !1 || "[object Boolean]" == toString.call(obj)
        }, _.isNull = function(obj) {
            return null === obj
        }, _.isUndefined = function(obj) {
            return void 0 === obj
        }, _.has = function(obj, key) {
            return hasOwnProperty.call(obj, key)
        }, _.noConflict = function() {
            return root._ = previousUnderscore, this
        }, _.identity = function(value) {
            return value
        }, _.constant = function(value) {
            return function() {
                return value
            }
        }, _.property = function(key) {
            return function(obj) {
                return obj[key]
            }
        }, _.matches = function(attrs) {
            return function(obj) {
                if (obj === attrs) return !0;
                for (var key in attrs)
                    if (attrs[key] !== obj[key]) return !1;
                return !0
            }
        }, _.times = function(n, iterator, context) {
            for (var accum = Array(Math.max(0, n)), i = 0; n > i; i++) accum[i] = iterator.call(context, i);
            return accum
        }, _.random = function(min, max) {
            return null == max && (max = min, min = 0), min + Math.floor(Math.random() * (max - min + 1))
        }, _.now = Date.now || function() {
            return (new Date).getTime()
        };
        var entityMap = {
            escape: {
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#x27;"
            }
        };
        entityMap.unescape = _.invert(entityMap.escape);
        var entityRegexes = {
            escape: new RegExp("[" + _.keys(entityMap.escape).join("") + "]", "g"),
            unescape: new RegExp("(" + _.keys(entityMap.unescape).join("|") + ")", "g")
        };
        _.each(["escape", "unescape"], function(method) {
            _[method] = function(string) {
                return null == string ? "" : ("" + string).replace(entityRegexes[method], function(match) {
                    return entityMap[method][match]
                })
            }
        }), _.result = function(object, property) {
            if (null == object) return void 0;
            var value = object[property];
            return _.isFunction(value) ? value.call(object) : value
        }, _.mixin = function(obj) {
            each(_.functions(obj), function(name) {
                var func = _[name] = obj[name];
                _.prototype[name] = function() {
                    var args = [this._wrapped];
                    return push.apply(args, arguments), result.call(this, func.apply(_, args))
                }
            })
        };
        var idCounter = 0;
        _.uniqueId = function(prefix) {
            var id = ++idCounter + "";
            return prefix ? prefix + id : id
        }, _.templateSettings = {
            evaluate: /<%([\s\S]+?)%>/g,
            interpolate: /<%=([\s\S]+?)%>/g,
            escape: /<%-([\s\S]+?)%>/g
        };
        var noMatch = /(.)^/,
            escapes = {
                "'": "'",
                "\\": "\\",
                "\r": "r",
                "\n": "n",
                " ": "t",
                "\u2028": "u2028",
                "\u2029": "u2029"
            },
            escaper = /\\|'|\r|\n|\t|\u2028|\u2029/g;
        _.template = function(text, data, settings) {
            var render;
            settings = _.defaults({}, settings, _.templateSettings);
            var matcher = new RegExp([(settings.escape || noMatch).source, (settings.interpolate || noMatch).source, (settings.evaluate || noMatch).source].join("|") + "|$", "g"),
                index = 0,
                source = "__p+='";
            text.replace(matcher, function(match, escape, interpolate, evaluate, offset) {
                return source += text.slice(index, offset).replace(escaper, function(match) {
                    return "\\" + escapes[match]
                }), escape && (source += "'+\n((__t=(" + escape + "))==null?'':_.escape(__t))+\n'"), interpolate && (source += "'+\n((__t=(" + interpolate + "))==null?'':__t)+\n'"), evaluate && (source += "';\n" + evaluate + "\n__p+='"), index = offset + match.length, match
            }), source += "';\n", settings.variable || (source = "with(obj||{}){\n" + source + "}\n"), source = "var __t,__p='',__j=Array.prototype.join,print=function(){__p+=__j.call(arguments,'');};\n" + source + "return __p;\n";
            try {
                render = new Function(settings.variable || "obj", "_", source)
            } catch (e) {
                throw e.source = source, e
            }
            if (data) return render(data, _);
            var template = function(data) {
                return render.call(this, data, _)
            };
            return template.source = "function(" + (settings.variable || "obj") + "){\n" + source + "}", template
        }, _.chain = function(obj) {
            return _(obj).chain()
        };
        var result = function(obj) {
            return this._chain ? _(obj).chain() : obj
        };
        _.mixin(_), each(["pop", "push", "reverse", "shift", "sort", "splice", "unshift"], function(name) {
            var method = ArrayProto[name];
            _.prototype[name] = function() {
                var obj = this._wrapped;
                return method.apply(obj, arguments), "shift" != name && "splice" != name || 0 !== obj.length || delete obj[0], result.call(this, obj)
            }
        }), each(["concat", "join", "slice"], function(name) {
            var method = ArrayProto[name];
            _.prototype[name] = function() {
                return result.call(this, method.apply(this._wrapped, arguments))
            }
        }), _.extend(_.prototype, {
            chain: function() {
                return this._chain = !0, this
            },
            value: function() {
                return this._wrapped
            }
        }), "function" == typeof define && define.amd && define("underscore", [], function() {
            return _
        })
    }.call(this), _.templateSettings = {
        evaluate: /\{\{([\s\S]+?)\}\}/g,
        interpolate: /\{\{=([\s\S]+?)\}\}/g,
        escape: /\{\{-([\s\S]+?)\}\}/g
    },
    function(root, factory) {
        if ("function" == typeof define && define.amd) define("backbone-src", ["underscore", "jquery", "exports"], function(_, $, exports) {
            root.Backbone = factory(root, exports, _, $)
        });
        else if ("undefined" != typeof exports) {
            var _ = require("underscore");
            factory(root, exports, _)
        } else root.Backbone = factory(root, {}, root._, root.jQuery || root.Zepto || root.ender || root.$)
    }(this, function(root, Backbone, _, $) {
        var previousBackbone = root.Backbone,
            array = [];
        array.push;
        var slice = array.slice;
        array.splice, Backbone.VERSION = "1.1.2", Backbone.$ = $, Backbone.noConflict = function() {
            return root.Backbone = previousBackbone, this
        }, Backbone.emulateHTTP = !1, Backbone.emulateJSON = !1;
        var Events = Backbone.Events = {
                on: function(name, callback, context) {
                    if (!eventsApi(this, "on", name, [callback, context]) || !callback) return this;
                    this._events || (this._events = {});
                    var events = this._events[name] || (this._events[name] = []);
                    return events.push({
                        callback: callback,
                        context: context,
                        ctx: context || this
                    }), this
                },
                once: function(name, callback, context) {
                    if (!eventsApi(this, "once", name, [callback, context]) || !callback) return this;
                    var self = this,
                        once = _.once(function() {
                            self.off(name, once), callback.apply(this, arguments)
                        });
                    return once._callback = callback, this.on(name, once, context)
                },
                off: function(name, callback, context) {
                    var retain, ev, events, names, i, l, j, k;
                    if (!this._events || !eventsApi(this, "off", name, [callback, context])) return this;
                    if (!name && !callback && !context) return this._events = void 0, this;
                    for (names = name ? [name] : _.keys(this._events), i = 0, l = names.length; l > i; i++)
                        if (name = names[i], events = this._events[name]) {
                            if (this._events[name] = retain = [], callback || context)
                                for (j = 0, k = events.length; k > j; j++) ev = events[j], (callback && callback !== ev.callback && callback !== ev.callback._callback || context && context !== ev.context) && retain.push(ev);
                            retain.length || delete this._events[name]
                        }
                    return this
                },
                trigger: function(name) {
                    if (!this._events) return this;
                    var args = slice.call(arguments, 1);
                    if (!eventsApi(this, "trigger", name, args)) return this;
                    var events = this._events[name],
                        allEvents = this._events.all;
                    return events && triggerEvents(events, args), allEvents && triggerEvents(allEvents, arguments), this
                },
                stopListening: function(obj, name, callback) {
                    var listeningTo = this._listeningTo;
                    if (!listeningTo) return this;
                    var remove = !name && !callback;
                    callback || "object" != typeof name || (callback = this), obj && ((listeningTo = {})[obj._listenId] = obj);
                    for (var id in listeningTo) obj = listeningTo[id], obj.off(name, callback, this), (remove || _.isEmpty(obj._events)) && delete this._listeningTo[id];
                    return this
                }
            },
            eventSplitter = /\s+/,
            eventsApi = function(obj, action, name, rest) {
                if (!name) return !0;
                if ("object" == typeof name) {
                    for (var key in name) obj[action].apply(obj, [key, name[key]].concat(rest));
                    return !1
                }
                if (eventSplitter.test(name)) {
                    for (var names = name.split(eventSplitter), i = 0, l = names.length; l > i; i++) obj[action].apply(obj, [names[i]].concat(rest));
                    return !1
                }
                return !0
            },
            triggerEvents = function(events, args) {
                var ev, i = -1,
                    l = events.length,
                    a1 = args[0],
                    a2 = args[1],
                    a3 = args[2];
                switch (args.length) {
                    case 0:
                        for (; ++i < l;)(ev = events[i]).callback.call(ev.ctx);
                        return;
                    case 1:
                        for (; ++i < l;)(ev = events[i]).callback.call(ev.ctx, a1);
                        return;
                    case 2:
                        for (; ++i < l;)(ev = events[i]).callback.call(ev.ctx, a1, a2);
                        return;
                    case 3:
                        for (; ++i < l;)(ev = events[i]).callback.call(ev.ctx, a1, a2, a3);
                        return;
                    default:
                        for (; ++i < l;)(ev = events[i]).callback.apply(ev.ctx, args);
                        return
                }
            },
            listenMethods = {
                listenTo: "on",
                listenToOnce: "once"
            };
        _.each(listenMethods, function(implementation, method) {
            Events[method] = function(obj, name, callback) {
                var listeningTo = this._listeningTo || (this._listeningTo = {}),
                    id = obj._listenId || (obj._listenId = _.uniqueId("l"));
                return listeningTo[id] = obj, callback || "object" != typeof name || (callback = this), obj[implementation](name, callback, this), this
            }
        }), Events.bind = Events.on, Events.unbind = Events.off, _.extend(Backbone, Events);
        var Model = Backbone.Model = function(attributes, options) {
            var attrs = attributes || {};
            options || (options = {}), this.cid = _.uniqueId("c"), this.attributes = {}, options.collection && (this.collection = options.collection), options.parse && (attrs = this.parse(attrs, options) || {}), attrs = _.defaults({}, attrs, _.result(this, "defaults")), this.set(attrs, options), this.changed = {}, this.initialize.apply(this, arguments)
        };
        _.extend(Model.prototype, Events, {
            changed: null,
            validationError: null,
            idAttribute: "id",
            initialize: function() {},
            toJSON: function() {
                return _.clone(this.attributes)
            },
            sync: function() {
                return Backbone.sync.apply(this, arguments)
            },
            get: function(attr) {
                return this.attributes[attr]
            },
            escape: function(attr) {
                return _.escape(this.get(attr))
            },
            has: function(attr) {
                return null != this.get(attr)
            },
            set: function(key, val, options) {
                var attr, attrs, unset, changes, silent, changing, prev, current;
                if (null == key) return this;
                if ("object" == typeof key ? (attrs = key, options = val) : (attrs = {})[key] = val, options || (options = {}), !this._validate(attrs, options)) return !1;
                unset = options.unset, silent = options.silent, changes = [], changing = this._changing, this._changing = !0, changing || (this._previousAttributes = _.clone(this.attributes), this.changed = {}), current = this.attributes, prev = this._previousAttributes, this.idAttribute in attrs && (this.id = attrs[this.idAttribute]);
                for (attr in attrs) val = attrs[attr], _.isEqual(current[attr], val) || changes.push(attr), _.isEqual(prev[attr], val) ? delete this.changed[attr] : this.changed[attr] = val, unset ? delete current[attr] : current[attr] = val;
                if (!silent) {
                    changes.length && (this._pending = options);
                    for (var i = 0, l = changes.length; l > i; i++) this.trigger("change:" + changes[i], this, current[changes[i]], options)
                }
                if (changing) return this;
                if (!silent)
                    for (; this._pending;) options = this._pending, this._pending = !1, this.trigger("change", this, options);
                return this._pending = !1, this._changing = !1, this
            },
            unset: function(attr, options) {
                return this.set(attr, void 0, _.extend({}, options, {
                    unset: !0
                }))
            },
            clear: function(options) {
                var attrs = {};
                for (var key in this.attributes) attrs[key] = void 0;
                return this.set(attrs, _.extend({}, options, {
                    unset: !0
                }))
            },
            hasChanged: function(attr) {
                return null == attr ? !_.isEmpty(this.changed) : _.has(this.changed, attr)
            },
            changedAttributes: function(diff) {
                if (!diff) return this.hasChanged() ? _.clone(this.changed) : !1;
                var val, changed = !1,
                    old = this._changing ? this._previousAttributes : this.attributes;
                for (var attr in diff) _.isEqual(old[attr], val = diff[attr]) || ((changed || (changed = {}))[attr] = val);
                return changed
            },
            previous: function(attr) {
                return null != attr && this._previousAttributes ? this._previousAttributes[attr] : null
            },
            previousAttributes: function() {
                return _.clone(this._previousAttributes)
            },
            fetch: function(options) {
                options = options ? _.clone(options) : {}, void 0 === options.parse && (options.parse = !0);
                var model = this,
                    success = options.success;
                return options.success = function(resp) {
                    return model.set(model.parse(resp, options), options) ? (success && success(model, resp, options), model.trigger("sync", model, resp, options), void 0) : !1
                }, wrapError(this, options), this.sync("read", this, options)
            },
            save: function(key, val, options) {
                var attrs, method, xhr, attributes = this.attributes;
                if (null == key || "object" == typeof key ? (attrs = key, options = val) : (attrs = {})[key] = val, options = _.extend({
                        validate: !0
                    }, options), attrs && !options.wait) {
                    if (!this.set(attrs, options)) return !1
                } else if (!this._validate(attrs, options)) return !1;
                attrs && options.wait && (this.attributes = _.extend({}, attributes, attrs)), void 0 === options.parse && (options.parse = !0);
                var model = this,
                    success = options.success;
                return options.success = function(resp) {
                    model.attributes = attributes;
                    var serverAttrs = model.parse(resp, options);
                    return options.wait && (serverAttrs = _.extend(attrs || {}, serverAttrs)), _.isObject(serverAttrs) && !model.set(serverAttrs, options) ? !1 : (success && success(model, resp, options), model.trigger("sync", model, resp, options), void 0)
                }, wrapError(this, options), method = this.isNew() ? "create" : options.patch ? "patch" : "update", "patch" === method && (options.attrs = attrs), xhr = this.sync(method, this, options), attrs && options.wait && (this.attributes = attributes), xhr
            },
            destroy: function(options) {
                options = options ? _.clone(options) : {};
                var model = this,
                    success = options.success,
                    destroy = function() {
                        model.trigger("destroy", model, model.collection, options)
                    };
                if (options.success = function(resp) {
                        (options.wait || model.isNew()) && destroy(), success && success(model, resp, options), model.isNew() || model.trigger("sync", model, resp, options)
                    }, this.isNew()) return options.success(), !1;
                wrapError(this, options);
                var xhr = this.sync("delete", this, options);
                return options.wait || destroy(), xhr
            },
            url: function() {
                var base = _.result(this, "urlRoot") || _.result(this.collection, "url") || urlError();
                return this.isNew() ? base : base.replace(/([^\/])$/, "$1/") + encodeURIComponent(this.id)
            },
            parse: function(resp) {
                return resp
            },
            clone: function() {
                return new this.constructor(this.attributes)
            },
            isNew: function() {
                return !this.has(this.idAttribute)
            },
            isValid: function(options) {
                return this._validate({}, _.extend(options || {}, {
                    validate: !0
                }))
            },
            _validate: function(attrs, options) {
                if (!options.validate || !this.validate) return !0;
                attrs = _.extend({}, this.attributes, attrs);
                var error = this.validationError = this.validate(attrs, options) || null;
                return error ? (this.trigger("invalid", this, error, _.extend(options, {
                    validationError: error
                })), !1) : !0
            }
        });
        var modelMethods = ["keys", "values", "pairs", "invert", "pick", "omit"];
        _.each(modelMethods, function(method) {
            Model.prototype[method] = function() {
                var args = slice.call(arguments);
                return args.unshift(this.attributes), _[method].apply(_, args)
            }
        });
        var Collection = Backbone.Collection = function(models, options) {
                options || (options = {}), options.model && (this.model = options.model), void 0 !== options.comparator && (this.comparator = options.comparator), this._reset(), this.initialize.apply(this, arguments), models && this.reset(models, _.extend({
                    silent: !0
                }, options))
            },
            setOptions = {
                add: !0,
                remove: !0,
                merge: !0
            },
            addOptions = {
                add: !0,
                remove: !1
            };
        _.extend(Collection.prototype, Events, {
            model: Model,
            initialize: function() {},
            toJSON: function(options) {
                return this.map(function(model) {
                    return model.toJSON(options)
                })
            },
            sync: function() {
                return Backbone.sync.apply(this, arguments)
            },
            add: function(models, options) {
                return this.set(models, _.extend({
                    merge: !1
                }, options, addOptions))
            },
            remove: function(models, options) {
                var singular = !_.isArray(models);
                models = singular ? [models] : _.clone(models), options || (options = {});
                var i, l, index, model;
                for (i = 0, l = models.length; l > i; i++) model = models[i] = this.get(models[i]), model && (delete this._byId[model.id], delete this._byId[model.cid], index = this.indexOf(model), this.models.splice(index, 1), this.length--, options.silent || (options.index = index, model.trigger("remove", model, this, options)), this._removeReference(model, options));
                return singular ? models[0] : models
            },
            set: function(models, options) {
                options = _.defaults({}, options, setOptions), options.parse && (models = this.parse(models, options));
                var singular = !_.isArray(models);
                models = singular ? models ? [models] : [] : _.clone(models);
                var i, l, id, model, attrs, existing, sort, at = options.at,
                    targetModel = this.model,
                    sortable = this.comparator && null == at && options.sort !== !1,
                    sortAttr = _.isString(this.comparator) ? this.comparator : null,
                    toAdd = [],
                    toRemove = [],
                    modelMap = {},
                    add = options.add,
                    merge = options.merge,
                    remove = options.remove,
                    order = !sortable && add && remove ? [] : !1;
                for (i = 0, l = models.length; l > i; i++) {
                    if (attrs = models[i] || {}, id = attrs instanceof Model ? model = attrs : attrs[targetModel.prototype.idAttribute || "id"], existing = this.get(id)) remove && (modelMap[existing.cid] = !0), merge && (attrs = attrs === model ? model.attributes : attrs, options.parse && (attrs = existing.parse(attrs, options)), existing.set(attrs, options), sortable && !sort && existing.hasChanged(sortAttr) && (sort = !0)), models[i] = existing;
                    else if (add) {
                        if (model = models[i] = this._prepareModel(attrs, options), !model) continue;
                        toAdd.push(model), this._addReference(model, options)
                    }
                    model = existing || model, !order || !model.isNew() && modelMap[model.id] || order.push(model), modelMap[model.id] = !0
                }
                if (remove) {
                    for (i = 0, l = this.length; l > i; ++i) modelMap[(model = this.models[i]).cid] || toRemove.push(model);
                    toRemove.length && this.remove(toRemove, options)
                }
                if (toAdd.length || order && order.length)
                    if (sortable && (sort = !0), this.length += toAdd.length, null != at)
                        for (i = 0, l = toAdd.length; l > i; i++) this.models.splice(at + i, 0, toAdd[i]);
                    else {
                        order && (this.models.length = 0);
                        var orderedModels = order || toAdd;
                        for (i = 0, l = orderedModels.length; l > i; i++) this.models.push(orderedModels[i])
                    }
                if (sort && this.sort({
                        silent: !0
                    }), !options.silent) {
                    for (i = 0, l = toAdd.length; l > i; i++)(model = toAdd[i]).trigger("add", model, this, options);
                    (sort || order && order.length) && this.trigger("sort", this, options)
                }
                return singular ? models[0] : models
            },
            reset: function(models, options) {
                options || (options = {});
                for (var i = 0, l = this.models.length; l > i; i++) this._removeReference(this.models[i], options);
                return options.previousModels = this.models, this._reset(), models = this.add(models, _.extend({
                    silent: !0
                }, options)), options.silent || this.trigger("reset", this, options), models
            },
            push: function(model, options) {
                return this.add(model, _.extend({
                    at: this.length
                }, options))
            },
            pop: function(options) {
                var model = this.at(this.length - 1);
                return this.remove(model, options), model
            },
            unshift: function(model, options) {
                return this.add(model, _.extend({
                    at: 0
                }, options))
            },
            shift: function(options) {
                var model = this.at(0);
                return this.remove(model, options), model
            },
            slice: function() {
                return slice.apply(this.models, arguments)
            },
            get: function(obj) {
                return null == obj ? void 0 : this._byId[obj] || this._byId[obj.id] || this._byId[obj.cid]
            },
            at: function(index) {
                return this.models[index]
            },
            where: function(attrs, first) {
                return _.isEmpty(attrs) ? first ? void 0 : [] : this[first ? "find" : "filter"](function(model) {
                    for (var key in attrs)
                        if (attrs[key] !== model.get(key)) return !1;
                    return !0
                })
            },
            findWhere: function(attrs) {
                return this.where(attrs, !0)
            },
            sort: function(options) {
                if (!this.comparator) throw new Error("Cannot sort a set without a comparator");
                return options || (options = {}), _.isString(this.comparator) || 1 === this.comparator.length ? this.models = this.sortBy(this.comparator, this) : this.models.sort(_.bind(this.comparator, this)), options.silent || this.trigger("sort", this, options), this
            },
            pluck: function(attr) {
                return _.invoke(this.models, "get", attr)
            },
            fetch: function(options) {
                options = options ? _.clone(options) : {}, void 0 === options.parse && (options.parse = !0);
                var success = options.success,
                    collection = this;
                return options.success = function(resp) {
                    var method = options.reset ? "reset" : "set";
                    collection[method](resp, options), success && success(collection, resp, options), collection.trigger("sync", collection, resp, options)
                }, wrapError(this, options), this.sync("read", this, options)
            },
            create: function(model, options) {
                if (options = options ? _.clone(options) : {}, !(model = this._prepareModel(model, options))) return !1;
                options.wait || this.add(model, options);
                var collection = this,
                    success = options.success;
                return options.success = function(model, resp) {
                    options.wait && collection.add(model, options), success && success(model, resp, options)
                }, model.save(null, options), model
            },
            parse: function(resp) {
                return resp
            },
            clone: function() {
                return new this.constructor(this.models)
            },
            _reset: function() {
                this.length = 0, this.models = [], this._byId = {}
            },
            _prepareModel: function(attrs, options) {
                if (attrs instanceof Model) return attrs;
                options = options ? _.clone(options) : {}, options.collection = this;
                var model = new this.model(attrs, options);
                return model.validationError ? (this.trigger("invalid", this, model.validationError, options), !1) : model
            },
            _addReference: function(model) {
                this._byId[model.cid] = model, null != model.id && (this._byId[model.id] = model), model.collection || (model.collection = this), model.on("all", this._onModelEvent, this)
            },
            _removeReference: function(model) {
                this === model.collection && delete model.collection, model.off("all", this._onModelEvent, this)
            },
            _onModelEvent: function(event, model, collection, options) {
                ("add" !== event && "remove" !== event || collection === this) && ("destroy" === event && this.remove(model, options), model && event === "change:" + model.idAttribute && (delete this._byId[model.previous(model.idAttribute)], null != model.id && (this._byId[model.id] = model)), this.trigger.apply(this, arguments))
            }
        });
        var methods = ["forEach", "each", "map", "collect", "reduce", "foldl", "inject", "reduceRight", "foldr", "find", "detect", "filter", "select", "reject", "every", "all", "some", "any", "include", "contains", "invoke", "max", "min", "toArray", "size", "first", "head", "take", "initial", "rest", "tail", "drop", "last", "without", "difference", "indexOf", "shuffle", "lastIndexOf", "isEmpty", "chain", "sample"];
        _.each(methods, function(method) {
            Collection.prototype[method] = function() {
                var args = slice.call(arguments);
                return args.unshift(this.models), _[method].apply(_, args)
            }
        });
        var attributeMethods = ["groupBy", "countBy", "sortBy", "indexBy"];
        _.each(attributeMethods, function(method) {
            Collection.prototype[method] = function(value, context) {
                var iterator = _.isFunction(value) ? value : function(model) {
                    return model.get(value)
                };
                return _[method](this.models, iterator, context)
            }
        });
        var View = Backbone.View = function(options) {
                this.cid = _.uniqueId("view"), options || (options = {}), _.extend(this, _.pick(options, viewOptions)), this._ensureElement(), this.initialize.apply(this, arguments), this.delegateEvents()
            },
            delegateEventSplitter = /^(\S+)\s*(.*)$/,
            viewOptions = ["model", "collection", "el", "id", "attributes", "className", "tagName", "events"];
        _.extend(View.prototype, Events, {
            tagName: "div",
            $: function(selector) {
                return this.$el.find(selector)
            },
            initialize: function() {},
            render: function() {
                return this
            },
            remove: function() {
                return this.$el.remove(), this.stopListening(), this
            },
            setElement: function(element, delegate) {
                return this.$el && this.undelegateEvents(), this.$el = element instanceof Backbone.$ ? element : Backbone.$(element), this.el = this.$el[0], delegate !== !1 && this.delegateEvents(), this
            },
            delegateEvents: function(events) {
                if (!events && !(events = _.result(this, "events"))) return this;
                this.undelegateEvents();
                for (var key in events) {
                    var method = events[key];
                    if (_.isFunction(method) || (method = this[events[key]]), method) {
                        var match = key.match(delegateEventSplitter),
                            eventName = match[1],
                            selector = match[2];
                        method = _.bind(method, this), eventName += ".delegateEvents" + this.cid, "" === selector ? this.$el.on(eventName, method) : this.$el.on(eventName, selector, method)
                    }
                }
                return this
            },
            undelegateEvents: function() {
                return this.$el.off(".delegateEvents" + this.cid), this
            },
            _ensureElement: function() {
                if (this.el) this.setElement(_.result(this, "el"), !1);
                else {
                    var attrs = _.extend({}, _.result(this, "attributes"));
                    this.id && (attrs.id = _.result(this, "id")), this.className && (attrs["class"] = _.result(this, "className"));
                    var $el = Backbone.$("<" + _.result(this, "tagName") + ">").attr(attrs);
                    this.setElement($el, !1)
                }
            }
        }), Backbone.sync = function(method, model, options) {
            var type = methodMap[method];
            _.defaults(options || (options = {}), {
                emulateHTTP: Backbone.emulateHTTP,
                emulateJSON: Backbone.emulateJSON
            });
            var params = {
                type: type,
                dataType: "json"
            };
            if (options.url || (params.url = _.result(model, "url") || urlError()), null != options.data || !model || "create" !== method && "update" !== method && "patch" !== method || (params.contentType = "application/json", params.data = JSON.stringify(options.attrs || model.toJSON(options))), options.emulateJSON && (params.contentType = "application/x-www-form-urlencoded", params.data = params.data ? {
                    model: params.data
                } : {}), options.emulateHTTP && ("PUT" === type || "DELETE" === type || "PATCH" === type)) {
                params.type = "POST", options.emulateJSON && (params.data._method = type);
                var beforeSend = options.beforeSend;
                options.beforeSend = function(xhr) {
                    return xhr.setRequestHeader("X-HTTP-Method-Override", type), beforeSend ? beforeSend.apply(this, arguments) : void 0
                }
            }
            "GET" === params.type || options.emulateJSON || (params.processData = !1), "PATCH" === params.type && noXhrPatch && (params.xhr = function() {
                return new ActiveXObject("Microsoft.XMLHTTP")
            });
            var xhr = options.xhr = Backbone.ajax(_.extend(params, options));
            return model.trigger("request", model, xhr, options), xhr
        };
        var noXhrPatch = !("undefined" == typeof window || !window.ActiveXObject || window.XMLHttpRequest && (new XMLHttpRequest).dispatchEvent),
            methodMap = {
                create: "POST",
                update: "PUT",
                patch: "PATCH",
                "delete": "DELETE",
                read: "GET"
            };
        Backbone.ajax = function() {
            return Backbone.$.ajax.apply(Backbone.$, arguments)
        };
        var Router = Backbone.Router = function(options) {
                options || (options = {}), options.routes && (this.routes = options.routes), this._bindRoutes(), this.initialize.apply(this, arguments)
            },
            optionalParam = /\((.*?)\)/g,
            namedParam = /(\(\?)?:\w+/g,
            splatParam = /\*\w+/g,
            escapeRegExp = /[\-{}\[\]+?.,\\\^$|#\s]/g;
        _.extend(Router.prototype, Events, {
            initialize: function() {},
            route: function(route, name, callback) {
                _.isRegExp(route) || (route = this._routeToRegExp(route)), _.isFunction(name) && (callback = name, name = ""), callback || (callback = this[name]);
                var router = this;
                return Backbone.history.route(route, function(fragment) {
                    var args = router._extractParameters(route, fragment);
                    router.execute(callback, args), router.trigger.apply(router, ["route:" + name].concat(args)), router.trigger("route", name, args), Backbone.history.trigger("route", router, name, args)
                }), this
            },
            execute: function(callback, args) {
                callback && callback.apply(this, args)
            },
            navigate: function(fragment, options) {
                return Backbone.history.navigate(fragment, options), this
            },
            _bindRoutes: function() {
                if (this.routes) {
                    this.routes = _.result(this, "routes");
                    for (var route, routes = _.keys(this.routes); null != (route = routes.pop());) this.route(route, this.routes[route])
                }
            },
            _routeToRegExp: function(route) {
                return route = route.replace(escapeRegExp, "\\$&").replace(optionalParam, "(?:$1)?").replace(namedParam, function(match, optional) {
                    return optional ? match : "([^/?]+)"
                }).replace(splatParam, "([^?]*?)"), new RegExp("^" + route + "(?:\\?([\\s\\S]*))?$")
            },
            _extractParameters: function(route, fragment) {
                var params = route.exec(fragment).slice(1);
                return _.map(params, function(param, i) {
                    return i === params.length - 1 ? param || null : param ? decodeURIComponent(param) : null
                })
            }
        });
        var History = Backbone.History = function() {
                this.handlers = [], _.bindAll(this, "checkUrl"), "undefined" != typeof window && (this.location = window.location, this.history = window.history)
            },
            routeStripper = /^[#\/]|\s+$/g,
            rootStripper = /^\/+|\/+$/g,
            isExplorer = /msie [\w.]+/,
            trailingSlash = /\/$/,
            pathStripper = /#.*$/;
        History.started = !1, _.extend(History.prototype, Events, {
            interval: 50,
            atRoot: function() {
                return this.location.pathname.replace(/[^\/]$/, "$&/") === this.root
            },
            getHash: function(window) {
                var match = (window || this).location.href.match(/#(.*)$/);
                return match ? match[1] : ""
            },
            getFragment: function(fragment, forcePushState) {
                if (null == fragment)
                    if (this._hasPushState || !this._wantsHashChange || forcePushState) {
                        fragment = decodeURI(this.location.pathname + this.location.search);
                        var root = this.root.replace(trailingSlash, "");
                        fragment.indexOf(root) || (fragment = fragment.slice(root.length))
                    } else fragment = this.getHash();
                return fragment.replace(routeStripper, "")
            },
            start: function(options) {
                if (History.started) throw new Error("Backbone.history has already been started");
                History.started = !0, this.options = _.extend({
                    root: "/"
                }, this.options, options), this.root = this.options.root, this._wantsHashChange = this.options.hashChange !== !1, this._wantsPushState = !!this.options.pushState, this._hasPushState = !!(this.options.pushState && this.history && this.history.pushState);
                var fragment = this.getFragment(),
                    docMode = document.documentMode,
                    oldIE = isExplorer.exec(navigator.userAgent.toLowerCase()) && (!docMode || 7 >= docMode);
                if (this.root = ("/" + this.root + "/").replace(rootStripper, "/"), oldIE && this._wantsHashChange) {
                    var frame = Backbone.$('<iframe src="javascript:0" tabindex="-1">');
                    this.iframe = frame.hide().appendTo("body")[0].contentWindow, this.navigate(fragment)
                }
                this._hasPushState ? Backbone.$(window).on("popstate", this.checkUrl) : this._wantsHashChange && "onhashchange" in window && !oldIE ? Backbone.$(window).on("hashchange", this.checkUrl) : this._wantsHashChange && (this._checkUrlInterval = setInterval(this.checkUrl, this.interval)), this.fragment = fragment;
                var loc = this.location;
                if (this._wantsHashChange && this._wantsPushState) {
                    if (!this._hasPushState && !this.atRoot()) return this.fragment = this.getFragment(null, !0), this.location.replace(this.root + "#" + this.fragment), !0;
                    this._hasPushState && this.atRoot() && loc.hash && (this.fragment = this.getHash().replace(routeStripper, ""), this.history.replaceState({}, document.title, this.root + this.fragment))
                }
                return this.options.silent ? void 0 : this.loadUrl()
            },
            stop: function() {
                Backbone.$(window).off("popstate", this.checkUrl).off("hashchange", this.checkUrl), this._checkUrlInterval && clearInterval(this._checkUrlInterval), History.started = !1
            },
            route: function(route, callback) {
                this.handlers.unshift({
                    route: route,
                    callback: callback
                })
            },
            checkUrl: function() {
                var current = this.getFragment();
                return current === this.fragment && this.iframe && (current = this.getFragment(this.getHash(this.iframe))), current === this.fragment ? !1 : (this.iframe && this.navigate(current), this.loadUrl(), void 0)
            },
            loadUrl: function(fragment) {
                return fragment = this.fragment = this.getFragment(fragment), _.any(this.handlers, function(handler) {
                    return handler.route.test(fragment) ? (handler.callback(fragment), !0) : void 0
                })
            },
            navigate: function(fragment, options) {
                if (!History.started) return !1;
                options && options !== !0 || (options = {
                    trigger: !!options
                });
                var url = this.root + (fragment = this.getFragment(fragment || ""));
                if (fragment = fragment.replace(pathStripper, ""), this.fragment !== fragment) {
                    if (this.fragment = fragment, "" === fragment && "/" !== url && (url = url.slice(0, -1)), this._hasPushState) this.history[options.replace ? "replaceState" : "pushState"]({}, document.title, url);
                    else {
                        if (!this._wantsHashChange) return this.location.assign(url);
                        this._updateHash(this.location, fragment, options.replace), this.iframe && fragment !== this.getFragment(this.getHash(this.iframe)) && (options.replace || this.iframe.document.open().close(), this._updateHash(this.iframe.location, fragment, options.replace))
                    }
                    return options.trigger ? this.loadUrl(fragment) : void 0
                }
            },
            _updateHash: function(location, fragment, replace) {
                if (replace) {
                    var href = location.href.replace(/(javascript:|#).*$/, "");
                    location.replace(href + "#" + fragment)
                } else location.hash = "#" + fragment
            }
        }), Backbone.history = new History;
        var extend = function(protoProps, staticProps) {
            var child, parent = this;
            child = protoProps && _.has(protoProps, "constructor") ? protoProps.constructor : function() {
                return parent.apply(this, arguments)
            }, _.extend(child, parent, staticProps);
            var Surrogate = function() {
                this.constructor = child
            };
            return Surrogate.prototype = parent.prototype, child.prototype = new Surrogate, protoProps && _.extend(child.prototype, protoProps), child.__super__ = parent.prototype, child
        };
        Model.extend = Collection.extend = Router.extend = View.extend = History.extend = extend;
        var urlError = function() {
                throw new Error('A "url" property or function must be specified')
            },
            wrapError = function(model, options) {
                var error = options.error;
                options.error = function(resp) {
                    error && error(model, resp, options), model.trigger("error", model, resp, options)
                }
            };
        return Backbone
    }), define("../reader/models/user", ["backbone", "mod/ajax"], function(Backbone) {
        return Backbone.Model.extend({
            defaults: {
                name: "匿名用户"
            },
            url: function() {
                return "/j/user/" + this.get("id") + "/"
            },
            initialize: function() {
                this.on("sync", function() {
                    this._loaded = !0
                }, this), this.on("request", function(model) {
                    return model.get("id") ? void 0 : $.Deferred().reject()
                })
            },
            isLoaded: function() {
                return !!this._loaded && this.has("avatar")
            },
            isAdmin: function() {
                return !!this.get("isAdmin")
            },
            isAnonymous: function() {
                return !!this.get("isAnonymous")
            },
            isAuthorOf: function(post) {
                var authorId = post.get("authorId"),
                    userId = this.get("id");
                return authorId && authorId.toString() === userId.toString()
            },
            canRate: function(article) {
                return !(this.isAnonymous() || article.get("isSample"))
            }
        })
    }), define("../reader/modules/open_login_and_signup", ["jquery", "underscore"], function($, _) {
        var defaultOptions = {
                context: "reader",
                closable: !0,
                referUrl: location.href
            },
            createOpenDialogFunc = function(options) {
                return options = _.defaults(options || {}, defaultOptions),
                    function(InlineDialog) {
                        document.cookie = "refer_url=" + options.referUrl + ";domain=" + "douban.com" + ";path=" + "/", new InlineDialog(options)
                    }
            },
            openLoginAndSignup = function(options) {
                require("widget/login-and-signup", createOpenDialogFunc(options))
            };
        return openLoginAndSignup
    }), define("../mod/simplestorage", function() {
        function SimpleStorage(useWebStorageIfAvailable, type) {
            "session" !== type && (type = "local"), this._cache = {}, this._wantsWebStorage = "undefined" == typeof useWebStorageIfAvailable ? !0 : useWebStorageIfAvailable, this._useWebStorage = this._wantsWebStorage && hasWebStorage, hasWebStorage && (this._storage = window[type + "Storage"])
        }
        var utils = {
                has: function(obj, key) {
                    return Object.prototype.hasOwnProperty.call(obj, key)
                },
                keys: Object.keys || function(obj) {
                    if (obj !== Object(obj)) throw new TypeError("Invalid object");
                    var keys = [];
                    for (var key in obj) {
                        if (!utils.has(obj, key)) return;
                        keys.push(key)
                    }
                    return keys
                },
                isObject: function(obj) {
                    return obj === Object(obj)
                }
            },
            hasWebStorage = function() {
                try {
                    var supported = "Storage" in window && null !== window.Storage;
                    return supported && (localStorage.setItem("storage", ""), localStorage.removeItem("storage")), supported
                } catch (err) {
                    return !1
                }
            }();
        return $.extend(SimpleStorage.prototype, {
            setStorageObject: function(key, value) {
                this._storage.setItem(key, JSON.stringify(value))
            },
            getStorageObject: function(key) {
                var stored = this._storage.getItem(key);
                try {
                    stored = JSON.parse(stored)
                } catch (ex) {
                    stored = null
                }
                return stored
            },
            getStorageKeys: function() {
                for (var keys = [], i = 0, l = this._storage.length; l > i; i++) keys.push(this._storage.key(i));
                return keys
            },
            get: function(k) {
                if (this._useWebStorage) {
                    var isObject = this._storage.getItem(k + "___isObject");
                    return isObject ? this.getStorageObject(k) || void 0 : this._storage.getItem(k) || void 0
                }
                return this._cache[k] || void 0
            },
            set: function(k, v) {
                if (this._useWebStorage)
                    if (v && utils.isObject(v)) this.setStorageObject(k, v), this._storage.setItem(k + "___isObject", !0);
                    else try {
                        this._storage.setItem(k, v)
                    } catch (ex) {} else this._cache[k] = v;
                return v
            },
            remove: function(k) {
                this._useWebStorage && (this._storage.removeItem(k), this._storage.removeItem(k + "___isObject")), delete this._cache[k]
            },
            length: function() {
                return this._useWebStorage ? this._storage.length : this._cache.length
            },
            keys: function() {
                return this._useWebStorage ? this.getStorageKeys() : utils.keys(this._cache)
            },
            clear: function() {
                this._useWebStorage && this._storage.clear(), this._cache = {}
            }
        }), SimpleStorage
    }), define("../reader/modules/storage", ["mod/simplestorage"], function(SimpleStorage) {
        return new SimpleStorage(!0, "local")
    }), define("../reader/modules/storage_manager", ["jquery", "underscore", "arkenv", "reader/modules/storage"], function($, _, arkenv, storage) {
        var rArticleItem = /^e\d+/,
            MAX_NUM = 5,
            DEFAULT_READER_DATA_VERSION = "v1.1.0",
            storageManager = {
                freeUpStorageSpace: function() {
                    for (var articles = this.getArticleKeys(), articleLength = articles.length; articleLength >= MAX_NUM;) articleLength -= 1, storage.remove(articles.pop())
                },
                checkStorageVersion: function() {
                    var hasStorageData = this.hasStorageData();
                    if (!hasStorageData) return this.saveReaderDataVersion(), !0;
                    var version = this.getReaderDataVersion();
                    return version !== arkenv.READER_DATA_VERSION ? (this.resetReaderData(), !1) : !0
                },
                resetReaderData: function() {
                    this.emptyArticles(), this.saveReaderDataVersion()
                },
                saveReaderDataVersion: function() {
                    storage.set("readerDataVersion", arkenv.READER_DATA_VERSION)
                },
                hasStorageData: function() {
                    var hasStorageData = storage.get("hasStorageData");
                    return hasStorageData = !!hasStorageData || !!storage.get("layout"), storage.set("hasStorageData", !0), hasStorageData
                },
                getReaderDataVersion: function() {
                    return storage.get("readerDataVersion") || DEFAULT_READER_DATA_VERSION
                },
                getArticle: function(articleId) {
                    var articleData = storage.get("e" + articleId);
                    if (articleData) return articleData = articleData.split(":"), {
                        title: articleData[0],
                        data: articleData[1],
                        purchase_time: 0 | articleData[2],
                        is_sample: !!(0 | articleData[3]),
                        is_gift: !!(0 | articleData[4]),
                        has_formula: !!(0 | articleData[5]),
                        has_added: !!(0 | articleData[6]),
                        price: +articleData[7],
                        cover_url: articleData[8]
                    }
                },
                saveArticle: function(articleId, resp) {
                    var encodedCoverUrl = encodeURIComponent(resp.cover_url.split("?")[0]),
                        tailingData = [resp.purchase_time, resp.is_sample, resp.is_gift, resp.has_formula, resp.has_added, resp.price, encodedCoverUrl].join(":");
                    storage.set("e" + articleId, [resp.title, resp.data, tailingData].join(":"))
                },
                emptyArticles: function() {
                    var articles = this.getArticleKeys();
                    _.each(articles, function(article) {
                        storage.remove(article)
                    })
                },
                getArticleKeys: function() {
                    var keys = storage.keys(),
                        articles = _.filter(keys, function(key) {
                            return rArticleItem.test(key)
                        });
                    return articles
                },
                setArticleAttr: function(articleId, key, value) {
                    var article = this.getArticle(articleId);
                    article && (article[key] = value, this.saveArticle(articleId, article))
                }
            };
        return storageManager
    }), define("../reader/modules/matchMedia", function() {
        var bool, doc = document,
            docElem = doc.documentElement,
            refNode = docElem.firstElementChild || docElem.firstChild,
            fakeBody = doc.createElement("body"),
            div = doc.createElement("div");
        div.id = "mq-test-1", div.style.cssText = "position:absolute;top:-100em", fakeBody.style.background = "none", fakeBody.appendChild(div);
        var matchMedia = window.matchMedia || function(q) {
            return div.innerHTML = '&shy;<style media="' + q + '">#mq-test-1{width:42px;}</style>', docElem.insertBefore(fakeBody, refNode), bool = 42 === div.offsetWidth, docElem.removeChild(fakeBody), {
                matches: bool,
                media: q
            }
        };
        return matchMedia
    }), define("mod/detector", [], function() {
        var detector = {},
            win = window,
            doc = document,
            venders = ["webkit", "moz"],
            ua = navigator.userAgent;
        detector.hasTouch = function() {
            return !!("ontouchstart" in win || (win.PointerEvent || win.MSPointerEvent) && /IEMobile/.test(ua) || win.DocumentTouch && doc instanceof DocumentTouch)
        }, detector.hasPushState = function() {
            return !(!win.history || !win.history.pushState)
        }, detector.canFullscreen = function() {
            for (var i = 0; i < venders.length; i++)
                if (doc[venders[i] + "CancelFullScreen"]) return !0;
            return !!document.cancelFullScreen || !1
        }, detector.standalone = function() {
            return win.navigator.standalone
        }, detector.hasOrientationEvent = function() {
            return !!("DeviceOrientationEvent" in win)
        };
        var rChrome = /chrome\/([\w.]+)/i,
            rMaxthon = /maxthon/i,
            chromeMatch = rChrome.exec(ua),
            isWebkit = /webkit/i.test(ua),
            isChrome = !!chromeMatch;
        detector.hasBadChineseLineBreak = function() {
            var hasBadChineseLineBreak;
            if (isChrome) {
                if (rMaxthon.test(ua)) return !0;
                var version = parseInt(chromeMatch[1], 10),
                    oldChrome = 28 >= version;
                hasBadChineseLineBreak = oldChrome
            } else hasBadChineseLineBreak = isWebkit;
            return hasBadChineseLineBreak
        }, detector.checkWebkitScrollNative = function() {
            if ("WebkitOverflowScrolling" in document.documentElement.style) return !0;
            if (ua.indexOf("Android") >= 0) {
                var androidversion = parseFloat(ua.slice(ua.indexOf("Android") + 8));
                if (3 > androidversion) return !1
            }
            return !0
        }, detector.isWeixin = function() {
            var rWeixin = /MicroMessenger/i;
            return rWeixin.test(ua)
        }, detector.isRetina = function() {
            var mediaQuery = "(-webkit-min-device-pixel-ratio: 1.5),        (min--moz-device-pixel-ratio: 1.5),        (-o-min-device-pixel-ratio: 3/2),        (min-resolution: 1.5dppx)";
            return win.devicePixelRatio > 1 ? !0 : win.matchMedia && win.matchMedia(mediaQuery).matches ? !0 : !1
        };
        for (var deviceList = ["iPhone", "Android", "iPad"], i = 0, len = deviceList.length; len > i; i++) {
            var name = deviceList[i];
            detector["is" + name] = new RegExp(name, "i").test(ua)
        }
        return detector.hasPinchZoom = function() {
            if (detector.isiPhone) return !0;
            if (ua.indexOf("Android") >= 0) {
                var androidversion = parseFloat(ua.slice(ua.indexOf("Android") + 8));
                if (androidversion >= 4) return !0
            }
        }, detector.hasWebStorage = function() {
            try {
                var supported = "Storage" in window && null !== window.Storage;
                return supported && (localStorage.setItem("storage", ""), localStorage.removeItem("storage")), supported
            } catch (err) {
                return !1
            }
        }, detector.isApplePhone = detector.isiPhone, detector
    }), define("../reader/modules/detector", ["jquery", "underscore", "mod/detector", "reader/modules/matchMedia"], function($, _, detector, matchMedia) {
        return _.extend({
            fitForMobile: _.memoize(function() {
                return matchMedia("screen and (-webkit-min-device-pixel-ratio: 1.1) and (max-width: 720px), screen and (max-device-width: 480px)").matches
            })
        }, detector)
    }), define("../reader/modules/browser", ["jquery", "underscore", "backbone", "reader/modules/detector", "reader/modules/matchMedia"], function($, _, Backbone, detector) {
        var ua = navigator.userAgent,
            isChromeApp = /CriOS/gi.test(ua),
            isDesktopWindows = /Window NT/gi.test(ua) && !/ARM/gi.test(ua),
            deviceOffset = detector.isApplePhone && !isChromeApp ? 60 : 0;
        return {
            deviceOffset: deviceOffset,
            fitForMobile: detector.fitForMobile(),
            fitForDesktop: !detector.hasTouch() || isDesktopWindows
        }
    }), define("mod/bbsync", ["underscore", "backbone"], function(_, Backbone) {
        var urlError = function() {
                throw new Error('A "url" property or function must be specified')
            },
            methodMap = {
                create: "POST",
                update: "PUT",
                patch: "PATCH",
                "delete": "DELETE",
                read: "GET"
            },
            sync = function(method, model, options) {
                var type = methodMap[method],
                    params = {
                        type: type,
                        dataType: "json"
                    };
                options = options || {}, options.url || (params.url = _.result(model, "url") || urlError()), options.data || !model || "create" !== method && "update" !== method && "patch" !== method || (params.data = options.attrs || model.toJSON(options)), "PATCH" !== params.type || !window.ActiveXObject || window.external && window.external.msActiveXFilteringEnabled || (params.xhr = function() {
                    return new ActiveXObject("Microsoft.XMLHTTP")
                });
                var xhr = options.xhr = Backbone.ajax(_.extend(params, options));
                return model.trigger("request", model, xhr, options), xhr
            };
        return sync
    }), define("../reader/modules/toast", ["jquery", "underscore"], function($, _) {
        var win = $(window),
            body = $("body"),
            Toast = function(options) {
                this.options = _.defaults(options || {}, this.defaults);
                var toast = _.result(this, "el");
                toast.html(options.text);
                var width = toast.outerWidth(),
                    left = (win.width() - width) / 2;
                if (toast.css({
                        left: left
                    }), "middle" === options["vertical-align"]) {
                    var top = (win.height() - toast.outerHeight()) / 2;
                    toast.css({
                        top: top
                    })
                }
                toast.delay(options.delay).fadeOut(function() {
                    $(this).remove()
                })
            };
        _.extend(Toast.prototype, {
            defaults: {
                delay: 1e3,
                id: "toast-container",
                text: "加载中"
            },
            el: function() {
                var options = this.options,
                    id = options.id,
                    toast = $("#" + id);
                return toast.length ? toast.stop(!0).css({
                    opacity: toast.data("orig-opacity") || 1
                }) : (toast = $("<div>", {
                    id: id
                }).appendTo(body), toast.data("orig-opacity", toast.css("opacity"))), toast
            }
        });
        var options = {
            toast: {
                "vertical-align": "middle",
                delay: 900
            }
        };
        return _.each(["alert", "toast"], function(name) {
            Toast[name] = function(text) {
                return new Toast(_.extend({
                    id: "reminder-" + name,
                    text: text
                }, options[name]))
            }
        }), Toast
    }), define("../reader/models/chapter", ["backbone", "underscore"], function(Backbone) {
        return Backbone.Model.extend({
            needBuy: function() {
                return !this.get("is_free") && !this.get("is_allowed_to_read")
            }
        })
    }), define("../reader/collections/chapters", ["backbone", "underscore", "reader/models/chapter"], function(Backbone, _, Chapter) {
        var CurrChapter = Backbone.Model.extend({
                defaults: {
                    chapterId: 0,
                    isFirstChapter: !1,
                    isLastChapter: !1
                },
                setPositionFlag: function(currIndex, length) {
                    return this.set("isFirstChapter", 0 >= currIndex), this.set("isLastChapter", currIndex === length - 1), this
                }
            }),
            Chapters = Backbone.Collection.extend({
                model: Chapter,
                initialize: function(models, options) {
                    _.bindAll(this, "turnPrevChapter", "turnNextChapter"), this.columnId = options.columnId, this.currChapter = new CurrChapter({
                        chapterId: options.currChapterId
                    }), this.on("reset", function() {
                        var currIndex = this.getCurrIndex();
                        this.currChapter.setPositionFlag(currIndex, this.length)
                    })
                },
                getCurrChapter: function() {
                    return this.get(this.currChapter.get("chapterId"))
                },
                getCurrIndex: function() {
                    return this.indexOf(this.getCurrChapter())
                },
                turnNextChapter: function() {
                    var currIndex = this.getCurrIndex();
                    return this.turnByIndex(currIndex + 1)
                },
                turnPrevChapter: function() {
                    var currIndex = this.getCurrIndex();
                    return this.turnByIndex(currIndex - 1)
                },
                turnByIndex: function(chapterIndex) {
                    return chapterIndex >= 0 && chapterIndex < this.length && (this.turnById(this.at(chapterIndex).id), this.currChapter.setPositionFlag(chapterIndex, this.length)), this
                },
                turnById: function(chapterId) {
                    return this.get(chapterId) && this.currChapter.set("chapterId", chapterId), this
                },
                destroy: function() {
                    this.currChapter.off(), this.off()
                },
                currChapterNeedBuy: function() {
                    var currChapter = this.getCurrChapter();
                    return currChapter && currChapter.needBuy()
                }
            });
        return Chapters
    }), define("../reader/models/column", ["backbone", "underscore", "mod/ajax"], function(Backbone, _, ajax) {
        var Column = Backbone.Model.extend({
            defaults: {
                id: 0,
                is_subscribed: !0
            },
            url: function() {
                return "/j/column/" + this.get("id") + "/"
            },
            subscribeUrl: function() {
                return "/j/column/" + this.get("id") + "/subscription"
            },
            urlInMobileStore: function() {
                return "/column/" + this.get("id")
            },
            subscribe: function() {
                return ajax({
                    method: "put",
                    url: _.result(this, "subscribeUrl")
                }).done(_.bind(function() {
                    this.set("is_subscribed", !0)
                }, this))
            }
        });
        return Column
    }), define("../reader/modules/create_app", ["jquery", "underscore", "backbone"], function($, _, Backbone) {
        var App = function() {
            this._cached = {}
        };
        return _.extend(App.prototype, Backbone.Events), _.extend(App.prototype, {
                init: function(namespace) {
                    this.namespace = namespace, _.extend(this, this.getAttrsFromNamespace())
                },
                getAttrsFromNamespace: function() {
                    var namespace = this.namespace;
                    return this._cached[namespace] ? this._cached[namespace] : (this._cached[namespace] = {
                        vent: _.extend({}, Backbone.Events),
                        _models: {}
                    }, this._cached[namespace])
                },
                setModel: function(name, key) {
                    this._models[name] = key, this.vent.trigger("model:" + name + ":set", key)
                },
                getModel: function(name) {
                    if (!this._models[name]) throw Error("model/" + name + " does not exist.");
                    return this._models[name]
                },
                unsetModel: function(name) {
                    delete this._models[name]
                },
                hasModel: function(name) {
                    return this._models && !!this._models[name]
                }
            }),
            function() {
                return new App
            }
    }), define("../reader/app", ["reader/modules/create_app"], function(createApp) {
        return createApp()
    }), define("../reader/views/common/chapter_adapter", ["jquery", "backbone", "underscore", "arkenv", "reader/app", "reader/models/column", "reader/collections/chapters", "reader/modules/toast", "mod/ajax"], function($, Backbone, _, arkenv, app, ColumnModel, ChaptersCollection, Toast) {
        function cacheColumnModel(model) {
            columnModelCache[model.get("id")] = model
        }
        var columnModelCache = {},
            ChapterAdapter = Backbone.View.extend({
                initialize: function(options) {
                    this.modelDfd = $.Deferred(), this.modelPromise = this.modelDfd.promise(), this.initChapters(options.columnId, options.chapterId)
                },
                render: function(options) {
                    return this.canvas = options.canvas, this.resetAdapter(), this.adaptCanvas(), this
                },
                initChapters: function(columnId, chapterId) {
                    this.chaptersCollection = new ChaptersCollection([], {
                        columnId: columnId,
                        currChapterId: chapterId
                    }), app.setModel("chapters", this.chaptersCollection), this.columnModel = new ColumnModel({
                        id: columnId
                    }), app.setModel("column", this.columnModel), this.columnModel.on("change:chapters", function(model, chapters) {
                        this.chaptersCollection.reset(chapters), this._markCurrChapterAsRead(), this.modelDfd.resolve()
                    }, this), columnId in columnModelCache ? this.columnModel.set(columnModelCache[columnId].toJSON()) : this.columnModel.fetch(), cacheColumnModel(this.columnModel), app.vent.on("turningPrev:firstPage", this.turnPrevChapter, this).on("turningNext:lastPage", this.turnNextChapter, this).on("chapterTurn:adjacent", this.adjacentTurnPrompt, this);
                    var currChapter = this.chaptersCollection.currChapter;
                    this.listenTo(currChapter, "change:chapterId", function(model, chapterId) {
                        var routeUrl = ["column", columnId, "chapter", chapterId, ""].join("/");
                        app.router.navigate(routeUrl, {
                            trigger: !0
                        })
                    }), this.pipeEvents(currChapter, ["change:isFirstChapter", "change:isLastChapter"])
                },
                pipeEvents: function(from, eventNames) {
                    var pipe = this;
                    return _.each(eventNames, function(eventName) {
                        pipe.listenTo(from, eventName, _.bind(pipe.trigger, pipe, eventName))
                    }), this
                },
                _markCurrChapterAsRead: function() {
                    var chapters = this.chaptersCollection,
                        currChapter = chapters.getCurrChapter();
                    currChapter && currChapter.set("is_read", !0), this.columnModel.set("chapters", chapters.models)
                },
                cleanChapters: function() {
                    this.chaptersCollection.destroy(), app.unsetModel("chapters"), app.unsetModel("column")
                },
                adaptCanvas: function() {
                    this.initChapterOverlay(), this.bindChapterPosClass(this.canvas.$el)
                },
                resetAdapter: function() {
                    var chapterOverlay = this.canvas.$el.find(".chapter-overlay");
                    chapterOverlay.off(".chapter-adapter")
                },
                initChapterOverlay: function() {
                    var chapterOverlay = this.canvas.$el.find(".chapter-overlay");
                    chapterOverlay.on("click.chapter-adapter", ".chapter-switcher", _.bind(function(e) {
                        var target = $(e.currentTarget),
                            direction = target.data("direction");
                        this["prev" === direction ? "turnPrevChapter" : "turnNextChapter"]()
                    }, this))
                },
                bindChapterPosClass: function(elem) {
                    this.on("change:isFirstChapter", function(model, isFirstChapter) {
                        elem.toggleClass("first-chapter", isFirstChapter)
                    }).on("change:isLastChapter", function(model, isLastChapter) {
                        elem.toggleClass("last-chapter", isLastChapter)
                    });
                    var currChapter = this.chaptersCollection.currChapter;
                    elem.toggleClass("first-chapter", currChapter.get("isFirstChapter")).toggleClass("last-chapter", currChapter.get("isLastChapter"))
                },
                turnPrevChapter: function() {
                    return this.chaptersCollection.currChapter.get("isFirstChapter") ? (Toast.toast("没有上一篇了"), void 0) : (app.getModel("config").set("jumpLastPage", !0), this.chaptersCollection.turnPrevChapter(), void 0)
                },
                turnNextChapter: function() {
                    return this.chaptersCollection.currChapter.get("isLastChapter") ? (Toast.toast("没有下一篇了"), void 0) : (app.getModel("config").set("jumpFirstPage", !0), this.chaptersCollection.turnNextChapter(), void 0)
                },
                remove: function() {
                    this.resetAdapter(), this.cleanChapters(), app.vent.off("turningPrev:firstPage"), app.vent.off("turningNext:lastPage"), app.vent.off("chapterTurn:adjacent"), Backbone.View.prototype.remove.apply(this, arguments)
                },
                labelsMap: {
                    prev: "上一篇",
                    next: "下一篇"
                },
                jumpingTmpl: "<span>{{- label}}</span><div>{{= title}}</div>",
                adjacentTurnPrompt: function(jumpProps) {
                    if (app.hasModel("article")) {
                        var article = app.getModel("article"),
                            tmplData = {
                                title: article.get("title"),
                                label: this.labelsMap[jumpProps.direction]
                            };
                        Toast.toast(_.template(this.jumpingTmpl, tmplData))
                    }
                }
            });
        return ChapterAdapter
    }), define("../reader/views/common/column_layout", ["backbone", "underscore", "jquery", "reader/app"], function(Backbone, _, $, app) {
        var ColumnFrame = Backbone.View.extend({
            el: "#ark-reader",
            tmplHeader: $("#tmpl-column-header").html(),
            tmplFooter: $("#tmpl-column-footer").html(),
            initialize: function() {
                this.vent = app.vent, this.vent.on("paging:finish", this.renderFrame, this), this.vent.on("pages:layout:finish", this.adjustCanvasHeight, this), this.$el.addClass("lite-theme")
            },
            getChapterTitle: function(index) {
                return this.chaptersIdList = this.chaptersIdList || [], this.chaptersIdList.length || (this.chaptersIdList = _.keys(this.chaptersMap)), this.chaptersMap[this.chaptersIdList[_.indexOf(this.chaptersIdList, this.currentChapterId) + index]]
            },
            adjustCanvasHeight: function() {
                var articleHeight = app.articleInner.height(),
                    lastPage = this.$el.find(".page:last");
                lastPage.height("auto").find(".bd").height("auto");
                var lastPageHeight = lastPage.height(),
                    redundancyHeight = 768 - lastPageHeight,
                    finalHeight = articleHeight - redundancyHeight,
                    PAGE_VERTICAL_PADDING = 7.5;
                lastPage.height("48em").find(".bd").height("48em"), app.articleInner.height(finalHeight / 16 + PAGE_VERTICAL_PADDING + "em")
            },
            renderFrame: function() {
                this.chapterOverlayClone = this.$el.find(".article .chapter-overlay").clone(!0), this.chaptersMap = this.chaptersMap || {}, this.currentChapterId = app.getModel("article").id, _.each(this.chaptersList, _.bind(function(chapter) {
                    this.chaptersMap[chapter.get("id")] = chapter.get("title")
                }, this)), _.extend(this.modelData, {
                    chapter_id: this.currentChapterId
                });
                var headerData = _.pick(this.modelData, "agent", "title", "id"),
                    liteHeader = this.$el.find(".lite-header");
                liteHeader.length || this.$el.prepend(_.template(this.tmplHeader, headerData)).append(_.template(this.tmplFooter)), this.chapterOverlayClone.find(".chapter-prev").text(this.getChapterTitle(-1)).end().find(".chapter-next").text(this.getChapterTitle(1)), this.$el.find(".lite-footer .inner").html(this.chapterOverlayClone), delete this.chapterOverlayClone
            },
            render: function(options) {
                this.model = options.model, this.$el.find(".aside-controls").show(), this.modelData = this.model.toJSON(), this.chaptersList = this.chaptersList || this.modelData.chapters
            }
        });
        return ColumnFrame
    }), define("../reader/modules/iso_time/parse", function() {
        return /msie 8/i.test(navigator.userAgent) ? function(dateString) {
            var resultDate, timebits = /^([0-9]{4})-([0-9]{2})-([0-9]{2})T([0-9]{2}):([0-9]{2}):([0-9]{2})(([+-])([0-9]{2}):([0-9]{2}))?/,
                m = timebits.exec(dateString),
                makeInt = function(string) {
                    return parseInt(string, 10)
                };
            if (m) {
                var timestamp = Date.UTC(makeInt(m[1]), makeInt(m[2]) - 1, makeInt(m[3]), makeInt(m[4]), makeInt(m[5]), m[6] && makeInt(m[6]) || 0);
                if (new Date, m[9] && m[10]) {
                    var offsetMinutes = 60 * makeInt(m[9]) + makeInt(m[10]),
                        sign = "+" === m[8] ? -1 : 1;
                    timestamp += 6e4 * sign * offsetMinutes
                }
                resultDate = new Date(timestamp)
            }
            return resultDate
        } : function(dateString) {
            return new Date(dateString)
        }
    }), define("../reader/views/bookshelf/modules/time_classifier", ["underscore", "jquery", "reader/modules/iso_time/parse"], function(_, $, dateParse) {
        function TimeClassifier(opts) {
            opts = _.defaults(opts || {}, defaults), _.extend(this, opts), this.todayTime = this.getTodayTime(), this.timeStamps = this.getTimeStamps()
        }
        var DAY = 864e5,
            timeIntervalMap = {
                today: 0,
                yesterday: DAY,
                week: 7 * DAY,
                month: 31 * DAY,
                older: Number.POSITIVE_INFINITY
            },
            defaults = {
                timeNames: ["today", "yesterday", "week", "month", "older"]
            };
        return _.extend(TimeClassifier.prototype, {
            getTimeName: function(timeString) {
                var time = dateParse(timeString).valueOf(),
                    interval = this.todayTime - time,
                    index = _.sortedIndex(this.timeStamps, interval);
                return this.timeNames[index]
            },
            getTodayTime: function() {
                var today = new Date;
                return today.setHours(0), today.setMinutes(0), today.setSeconds(0), today.valueOf()
            },
            getTimeStamps: function() {
                return _.map(this.timeNames, function(timeName) {
                    return timeIntervalMap[timeName]
                })
            }
        }), TimeClassifier
    }), define("../reader/views/bookshelf/modules/time_hierarchy_list", ["underscore", "jquery", "../reader/views/bookshelf/modules/time_classifier"], function(_, $, TimeClassifier) {
        function TimeHierarchyList(opts) {
            opts = _.defaults(opts || {}, defaults), _.extend(this, opts), this.renderedTopics = {}, this.timeClassifier = new TimeClassifier({
                timeNames: this.topics
            }), this.renderTopicsList()
        }
        var defaults = {
            el: $(),
            topicsTmpl: $("#tmpl-notification-topics").html(),
            topics: ["today", "week", "month", "older"]
        };
        return _.extend(TimeHierarchyList.prototype, {
            appendToTopic: function(elem, timeString) {
                var topic = this.timeClassifier.getTimeName(timeString);
                return this.getTopicElem(topic).find("ol").append(elem), this
            },
            getTopicElem: function(topic) {
                if (topic in this.renderedTopics) return this.renderedTopics[topic];
                var topicElem = this.el.children("." + topic).show();
                return this.renderedTopics[topic] = topicElem, topicElem
            },
            renderTopicsList: function() {
                this.el.html(_.template(this.topicsTmpl, {
                    topics: this.topics
                }))
            },
            reset: function() {
                return this.el.children().hide(), this.renderedTopics = {}, this
            }
        }), TimeHierarchyList
    }), define("../reader/views/reading/modules/login_with_actions", ["jquery", "underscore", "mod/detector", "reader/modules/open_login_and_signup"], function($, _, detector, openLoginAndSignup) {
        var KEY_MAP = {
                stamp: "loginStamp"
            },
            hasStorage = detector.hasWebStorage();
        return {
            openLoginAndSignup: function(options) {
                options = options || {}, _.isObject(options.actions) && hasStorage && _.each(options.actions, function(action, actionType) {
                    sessionStorage[KEY_MAP[actionType]] = JSON.stringify(action)
                }), openLoginAndSignup(options)
            },
            getActionOnce: function(actionType) {
                if (hasStorage) {
                    var action = this.getAction(actionType);
                    return sessionStorage.removeItem(KEY_MAP[actionType]), action
                }
            },
            getAction: function(actionType) {
                if (hasStorage) {
                    var stringifyData = sessionStorage[KEY_MAP[actionType]];
                    return stringifyData ? JSON.parse(stringifyData) : void 0
                }
            }
        }
    }), define("mod/auto_link", ["underscore"], function(_) {
        var rLink = new RegExp("(^|[\\s\\n])((?:https?|ftp)://[\\-A-Z0-9+\\u0026\\u2019@#/%?=()~_|!:,.;]*[\\-A-Z0-9+\\u0026@#/%=~()_|])", "ig");
        return function(text) {
            var linksMatched = text.match(rLink);
            if (!linksMatched) return _.escape(text);
            for (var components = [], MAX_VISIBLE_LENGTH = 30, generateLink = function(match, p1, p2) {
                    return p2.length < MAX_VISIBLE_LENGTH ? p1 + '<span class="auto-linked"><a target="_blank" href="' + _.escape(p2) + '">' + _.escape(p2) + "</a></span>" : p1 + '<span class="auto-linked">' + '<a class="link-has-invisible" target="_blank" href="' + _.escape(p2) + '">' + _.escape(p2.substr(0, MAX_VISIBLE_LENGTH)) + '</a><span class="invisible-link">' + _.escape(p2.substr(MAX_VISIBLE_LENGTH)) + "</span></span>"
                }, i = 0, l = linksMatched.length; l > i; i++) {
                var linkMatched = linksMatched[i],
                    indexOfLinkMatched = text.indexOf(linkMatched);
                components.push(_.escape(text.substring(0, indexOfLinkMatched))), components.push(linkMatched.replace(rLink, generateLink)), text = text.substr(indexOfLinkMatched + linkMatched.length)
            }
            return components.join("") + _.escape(text)
        }
    }), define("../reader/views/reading/annotation_comments/comment_item", ["jquery", "backbone", "underscore", "arkenv", "reader/app", "mod/auto_link"], function($, Backbone, _, arkenv, app, autoLink) {
        var AnnotationComment = Backbone.View.extend({
            tagName: "li",
            className: "comment-item",
            tmpl: $("#tmpl-annotation-comment-item").html(),
            initialize: function(options) {
                this.listenTo(this.model, "destroy", this.remove), options.tmpl && (this.tmpl = options.tmpl), this.targetInfo = options.targetInfo
            },
            events: {
                "click .delete-comment": "deleteComment"
            },
            render: function() {
                var data = this.model.toJSON(),
                    ownerId = data.author.user_id;
                return data.isMine = ownerId === arkenv.me.id, data.isArticleAuthor = this.isArticleAuthor(ownerId), data.isAdmin = arkenv.me.isAdmin, this.$el.html(_.template(this.tmpl, _.extend({
                    autoLink: autoLink
                }, data))), this
            },
            isArticleAuthor: function(userId) {
                return this.targetInfo && this.targetInfo.article ? userId === this.targetInfo.article.authorId : !1
            },
            deleteComment: function(e) {
                e.preventDefault(), this.model.destroy()
            }
        });
        return AnnotationComment
    }), define("../reader/models/annotation_comment", ["backbone", "underscore"], function(Backbone) {
        var AnnotationComment = Backbone.Model.extend({
            urlRoot: function() {
                return "/j/annotation/" + this.annotationId + "/comment/"
            },
            initialize: function(attrs, options) {
                this.annotationId = options.annotationId || this.collection.annotationId
            }
        });
        return AnnotationComment
    }), define("../reader/collections/annotation_comments", ["backbone", "underscore", "reader/models/annotation_comment"], function(Backbone, _, AnnotationComment) {
        var AnnotationComments = Backbone.Collection.extend({
            url: function() {
                return " /j/annotation/" + this.annotationId + "/comment/"
            },
            model: AnnotationComment,
            initialize: function(models, options) {
                this.annotationId = options.annotationId
            }
        });
        return AnnotationComments
    }), define("../reader/views/reading/annotation_comments/view", ["jquery", "backbone", "underscore", "arkenv", "reader/collections/annotation_comments", "reader/models/annotation_comment", "../reader/views/reading/annotation_comments/comment_item", "reader/views/reading/modules/login_with_actions"], function($, Backbone, _, arkenv, AnnotationComments, AnnotationComment, AnnotationCommentItem, LoginWithActions) {
        var AnnotationCommentsView = Backbone.View.extend({
                className: "annotation-comments-panel",
                tmplForm: $("#tmpl-annotation-comments-form").html(),
                initialize: function(options) {
                    this.markingModel = options.markingModel, this.commentFormIsTop = options.commentFormIsTop, this.commentTmpl = options.commentTmpl, this.comments = new AnnotationComments([], {
                        annotationId: this.markingModel.id
                    }), options.commentsUrl && (this.comments.url = options.commentsUrl), this.commentTargetInfo = options.commentTargetInfo, this.listenTo(this.comments, "add", this.appendCommentModel), this.listenTo(this.comments, "remove", function(model, collection) {
                        this.markingModel.setCommentsNum(collection.length)
                    }), this.comments.fetch()
                },
                events: {
                    "submit .comment-form": "submitComment"
                },
                render: function() {
                    var commentsList = $("<ul>", {
                            "class": "comments-list"
                        }),
                        commentForm = $("<form>", {
                            "class": "comment-form"
                        }).html(this.tmplForm),
                        sections = [commentsList, commentForm];
                    return this.commentFormIsTop && _(sections).reverse(), _(sections).each(function(section) {
                        this.$el.append(section)
                    }, this), this.form = commentForm, this.commentsList = commentsList, this
                },
                appendCommentModel: function(commentModel, collection) {
                    var commentView = new AnnotationCommentItem({
                        model: commentModel,
                        tmpl: this.commentTmpl,
                        targetInfo: this.commentTargetInfo
                    });
                    this.markingModel.setCommentsNum(collection.length), this.commentsList[this.commentFormIsTop ? "prepend" : "append"](commentView.render().el)
                },
                submitComment: function(e) {
                    e.preventDefault();
                    var form = $(e.target),
                        input = (form.find("input[type=submit]"), form.find("input[name=text]")),
                        text = $.trim(input.val()),
                        self = this;
                    if (text.length && !this.formDisabled) {
                        this.formDisabled = !0;
                        var model = new this.comments.model({
                            text: text
                        }, {
                            annotationId: this.comments.annotationId
                        });
                        model.save().done(function() {
                            input.val(""), input.blur(), self.comments.add(model)
                        }).always(function() {
                            self.formDisabled = !1
                        })
                    }
                }
            }),
            promptRequireLogin = function() {
                return LoginWithActions.openLoginAndSignup(), !1
            },
            AnonymousMixin = {};
        return arkenv.me.isAnonymous && (AnnotationCommentsView.prototype.events["focus input:text"] = "focusInput", _.each(["submitComment", "focusInput"], function(methodName) {
            AnonymousMixin[methodName] = promptRequireLogin
        })), _.extend(AnnotationCommentsView.prototype, AnonymousMixin), AnnotationCommentsView
    }), define("../reader/modules/stamp", ["backbone", "underscore"], function(Backbone, _) {
        function Stamp(attrs) {
            attrs = _.defaults(attrs || {}, defaults), this.setAttrs(attrs)
        }
        var defaults = {
            pid: "",
            offset: null,
            type: "",
            isFromUrl: !1,
            isRecommendation: !1,
            annotation: null
        };
        return _.extend(Stamp.prototype, {
            setAttrs: function(attrs) {
                return _.extend(this, attrs), this.setAnnotation(attrs.annotation), this
            },
            setAnnotation: function(annotation) {
                return (annotation = annotation || this.annotation) ? (this.pid = annotation.endContainerId, this.offset = annotation.endOffset, annotation.type = annotation.type || "rec_underline", annotation.is_recommendation = this.isRecommendation, annotation.is_from_url = this.isFromUrl, this.isRecommendation && "note" === annotation.type && (annotation.open_on_render = !0), this.annotation = _.clone(annotation), this) : void 0
            },
            ignoreSaveProgress: function() {
                return this.isRecommendation || this.isFromUrl
            },
            getAnnotationJson: function() {
                return _.clone(this.annotation)
            },
            hasAnnotation: function() {
                return !!this.annotation
            },
            annotationIsNote: function() {
                return "note" === this.annotation.type
            },
            annotationReadable: function() {
                if (!this.hasAnnotation()) return !1;
                var annotation = this.annotation;
                return !this._annotationInvisible(annotation) && !this._annotationDeleted(annotation)
            },
            _annotationInvisible: function(annotation) {
                return annotation.visible_private && !_.contains(annotation.tags, "mine")
            },
            _annotationDeleted: function(annotation) {
                return annotation.is_deleted
            }
        }), Stamp
    }), define("../reader/modules/iso_time/create", function() {
        function pad(number) {
            var r = String(number);
            return 1 === r.length && (r = "0" + r), r
        }
        return Date.prototype.toISOString ? function() {
            return (new Date).toISOString()
        } : function() {
            var date = new Date;
            return date.getUTCFullYear() + "-" + pad(date.getUTCMonth() + 1) + "-" + pad(date.getUTCDate()) + "T" + pad(date.getUTCHours()) + ":" + pad(date.getUTCMinutes()) + ":" + pad(date.getUTCSeconds()) + "." + String((date.getUTCMilliseconds() / 1e3).toFixed(3)).slice(2, 5) + "Z"
        }
    }), define("../reader/modules/nested_model", ["backbone", "jquery"], function(Backbone, $) {
        return Backbone.Model.extend({
            toJSON: function() {
                return $.extend(!0, {}, this.attributes)
            }
        })
    }), define("../reader/models/marking", ["jquery", "backbone", "underscore", "arkenv", "mod/ajax", "reader/modules/nested_model", "reader/modules/iso_time/create", "reader/modules/stamp"], function($, Backbone, _, arkenv, Ajax, NestedModel, createIsoTime, Stamp) {
        var ignoreSyncAttrs = ["owner", "tags", "n_favorites", "n_comments", "open_on_render", "is_recommendation", "is_from_url"],
            tagsPriority = ["mine", "favorite", "following", "hot", "others"],
            actionsGroup = {
                mine: _.object(["share", "comment", "edit", "delete"], "1111"),
                others: _.object(["favorite", "share", "comment"], "111"),
                underline: _.object(["share", "delete"], "11")
            },
            actionsMap = {
                mine: actionsGroup.mine,
                favorite: actionsGroup.others,
                following: actionsGroup.others,
                hot: actionsGroup.others,
                others: actionsGroup.others,
                underline: actionsGroup.underline
            };
        arkenv.me.isAdmin && (actionsGroup.others["delete"] = 1);
        var ownerDefaults = {
                avatar: arkenv.me.avatar,
                name: arkenv.me.name,
                user_id: arkenv.me.id
            },
            markingDefaults = {
                note: "",
                middleContainers: [],
                startOffset: 0,
                endOffset: 1 / 0,
                n_favorites: 0,
                n_comments: 0,
                tags: [],
                visible_private: "",
                open_on_render: !1,
                is_recommendation: !1,
                is_from_url: !1
            },
            rLink = new RegExp(["^((?:https?|ftp)://[-A-Z0-9+&@#/%?=()~_|!:,.;]*[-A-Z0-9+&@#/%=~()_|])$"].join(""), "i"),
            Marking = NestedModel.extend({
                defaults: function() {
                    return _.extend(_.clone(markingDefaults), {
                        owner: _.clone(ownerDefaults),
                        create_time: createIsoTime()
                    })
                },
                initialize: function(attributes, options) {
                    options.fakeSync && (this.fakeSync = options.fakeSync), this.articleId = options.articleId || this.collection && this.collection.articleId, this.paragraphsIndex = options.paragraphsIndex || this.collection && this.collection.paragraphsIndex, this.on("change", function(model, options) {
                        this.updateRange();
                        var changedAttrNames = _.keys(this.changedAttributes()),
                            serverChangeAttrNames = ["id", "r"],
                            changedSyncAttrNames = _.difference(changedAttrNames, ignoreSyncAttrs.concat(serverChangeAttrNames));
                        changedSyncAttrNames.length && this.trigger("effectiveChange", model, options)
                    }, this), this.on("add change:tags", this.sortTags, this), _.bindAll(this, "merge", "comparePoints")
                },
                url: function() {
                    return "/j/article_v2/" + this.articleId + "/annotation"
                },
                favoriteUrl: function() {
                    return "/j/annotation/" + this.id + "/favorite"
                },
                isRecommendation: function() {
                    return this.get("is_recommendation")
                },
                isFromUrl: function() {
                    return this.get("is_from_url")
                },
                isUnderline: function() {
                    return "underline" === this.get("type")
                },
                isNote: function() {
                    return "note" === this.get("type")
                },
                isSelection: function() {
                    return "selection" === this.get("type")
                },
                isFavorited: function() {
                    return this.hasTag("favorite")
                },
                isFollowing: function() {
                    return this.hasTag("following")
                },
                isMine: function() {
                    return this.hasTag("mine")
                },
                isOthers: function() {
                    return !this.get("tags").length
                },
                isPrivate: function() {
                    return !!this.get("visible_private")
                },
                hasTag: function(tag) {
                    return _.contains(this.get("tags"), tag)
                },
                validate: function(attrs) {
                    return attrs.startContainerId === attrs.endContainerId && attrs.startOffset > attrs.endOffset ? "Invalid: End before it starts" : void 0
                },
                getStamp: function() {
                    var stamp = new Stamp({
                        pid: this.get("endContainerId"),
                        offset: this.get("endOffset")
                    });
                    return stamp
                },
                getRanges: function() {
                    return this._ranges || this.updateRange(), _.clone(this._ranges)
                },
                updateRange: function() {
                    var data = this.toJSON();
                    this._ranges = {}, this._setUpParaData(this._ranges, data.startContainerId, {
                        start: data.startOffset
                    }), this._setUpParaData(this._ranges, data.endContainerId, {
                        end: data.endOffset
                    }), _.each(this.getContainerIds(), function(id) {
                        this._setUpParaData(this._ranges, id, {
                            start: markingDefaults.startOffset,
                            end: markingDefaults.endOffset
                        })
                    }, this)
                },
                _setUpParaData: function(context, id, data) {
                    id = "" + id, context[id] = _.defaults({}, context[id], data)
                },
                setViaPoints: function(start, end) {
                    var attrs = {
                        startContainerId: start.containerId,
                        endContainerId: end.containerId,
                        startOffset: start.offset,
                        endOffset: end.offset
                    };
                    return attrs.middleContainers = this.getMiddleContainers(attrs), this.set(attrs)
                },
                getPoints: function() {
                    var attrs = this.toJSON();
                    return {
                        start: {
                            containerId: attrs.startContainerId,
                            offset: attrs.startOffset
                        },
                        end: {
                            containerId: attrs.endContainerId,
                            offset: attrs.endOffset
                        }
                    }
                },
                getMiddleContainers: function(data) {
                    var startIndex = this.getCidIndex(data.startContainerId),
                        endIndex = this.getCidIndex(data.endContainerId);
                    return 0 > startIndex || 0 > endIndex ? [] : this.paragraphsIndex.slice(startIndex + 1, endIndex)
                },
                getContainerIds: function() {
                    var data = this.toJSON();
                    return _.uniq([data.startContainerId].concat(data.middleContainers).concat([data.endContainerId]))
                },
                checkConflict: function(otherModel) {
                    var thisPoints = this.getPoints(),
                        otherPoints = otherModel.getPoints();
                    return this.comparePoints(thisPoints.start, otherPoints.end) * this.comparePoints(thisPoints.end, otherPoints.start) > 0 ? !1 : !0
                },
                comparePoints: function(p1, p2) {
                    return p1.containerId === p2.containerId ? p1.offset - p2.offset : this.getCidIndex(p1.containerId) - this.getCidIndex(p2.containerId)
                },
                getCidIndex: function(cid) {
                    return _.indexOf(this.paragraphsIndex, cid)
                },
                destroy: function(options) {
                    return options = this._mixInData(options, {
                        id: this.id
                    }), Backbone.Model.prototype.destroy.call(this, options)
                },
                save: function(attributes, options) {
                    var sharing, data = _.extend(this.omit(ignoreSyncAttrs), attributes);
                    return options && options.sharing && (sharing = JSON.stringify(options.sharing)), this.isNew() || (data.action = "update"), options = this._mixInData(options, {
                        annotation: JSON.stringify(data)
                    }, sharing ? {
                        sharing: sharing
                    } : ""), Backbone.Model.prototype.save.call(this, attributes, options)
                },
                editFavorite: function(isSet) {
                    var method = isSet ? "PUT" : "DELETE",
                        url = _.result(this, "favoriteUrl"),
                        self = this,
                        wasOthers = this.isOthers();
                    return this.isFavoriting = !0, Ajax.request(method, url, {}, {}, "json").done(function(res) {
                        res.r || (self.addFavorite(isSet), isSet && wasOthers && self.collection.broadcastWithPid("othersNote:{{pid}}:favorited", self))
                    }).always(function() {
                        self.isFavoriting = !1
                    })
                },
                _mixInData: function(options) {
                    return options = options ? _.clone(options) : {}, _.each(_.rest(arguments), function(data) {
                        options.data = _.extend({}, options.data, data)
                    }), options
                },
                merge: function(otherModels) {
                    var startPoints = [],
                        endPoints = [];
                    _.each(otherModels.concat(this), function(model) {
                        var points = model.getPoints();
                        startPoints.push(points.start), endPoints.push(points.end)
                    }), _.each(otherModels, function(model) {
                        model.destroy()
                    });
                    var start = _.first(startPoints.sort(this.comparePoints)),
                        end = _.last(endPoints.sort(this.comparePoints));
                    this.setViaPoints(start, end)
                },
                sortTags: function() {
                    if (!this.isSelection()) {
                        var tags = this.get("tags");
                        tags = _.intersection(tagsPriority, tags), this.set("tags", tags, {
                            silent: !0
                        })
                    }
                },
                getShowTag: function() {
                    return this.get("tags")[0] || "others"
                },
                getActionsList: function() {
                    return this.isUnderline() ? actionsMap.underline : actionsMap[this.getShowTag()]
                },
                addFavorite: function(isSet) {
                    var addCount = isSet ? 1 : -1,
                        tags = _.clone(this.get("tags")),
                        favorites = this.get("n_favorites");
                    isSet ? tags.push("favorite") : tags = _.without(tags, "favorite"), this.set("tags", tags), this.set("n_favorites", favorites + addCount)
                },
                addCommentNum: function(addCount) {
                    var commentsCount = this.get("n_comments");
                    this.set("n_comments", commentsCount + addCount)
                },
                setCommentsNum: function(commentsLength) {
                    this.set("n_comments", commentsLength)
                },
                plainTextIsUrl: function() {
                    if (this.get("middleContainers").length) return !1;
                    var text = $.trim(this.getTextFromRanges());
                    return rLink.test(text)
                }
            }),
            mixinedMethods = {};
        mixinedMethods.getPlainText = {
            getTextFromRanges: function() {
                var text = "",
                    self = this;
                return _.each(this.getContainerIds(), function(pid) {
                    var p = $("p[data-pid=" + pid + "]").first(),
                        range = self._ranges[pid];
                    if (!range.start && range.end === Number.MAX_VALUE) return text += "\n" + self.getTextFromPara(p), void 0;
                    var span, offset = 0;
                    text && (text += "\n"), _.each(p.find(".word"), function(word) {
                        span = $(word), offset = span.data("offset"), offset >= range.start && offset <= range.end && (text += self.getTextFromPara(span))
                    })
                }), text.length > 300 && (text = text.substr(0, 300) + "..."), text
            },
            getTextFromPara: function(elem) {
                var tmpElem, el = $(elem),
                    mathJax = el.find(".MathJax, .MathJax_MathML");
                return mathJax.length ? (tmpElem = el.clone(), tmpElem.find(".MathJax, .MathJax_MathML").remove(), tmpElem.find("script").each(function() {
                    var el = $(this);
                    el.replaceWith(el.html())
                }), tmpElem.text()) : el.text()
            }
        };
        var AnonymousMixin = arkenv.me.isAnonymous ? {
            save: $.noop
        } : {};
        return _.extend(Marking.prototype, mixinedMethods.getPlainText, AnonymousMixin), Marking
    }), define("../reader/views/bookshelf/notification_item", ["underscore", "backbone", "jquery", "reader/app", "mod/ajax", "reader/models/marking", "reader/views/reading/annotation_comments/view"], function(_, Backbone, $, app, Ajax, MarkingModel, AnnotationCommentsView) {
        var NotificationView = Backbone.View.extend({
            tagName: "li",
            className: "notification-item collapsed",
            tmpl: $("#tmpl-notification-item").html(),
            events: {
                "click .stop-notify": "stopNotify",
                "click .reply-count, .annotation-link": "openTab",
                click: "expandComments"
            },
            initialize: function() {
                this.listenTo(this.model, "remove", this.onModelRemove)
            },
            render: function() {
                var data = this.model.toJSON();
                return data.isAuthor = this.model.isAuthor(), data.annotation_url = this.getSingleAnnotationUrl(data.works_id, data.annotation_id), this.$el.html(_.template(this.tmpl, data)), this.$el.toggleClass("new", !data.is_read), this.detailElem = this.$(".detail"), this
            },
            stopNotify: function(e) {
                e.stopPropagation(), this.model.destroy({
                    wait: !0
                })
            },
            expandComments: function() {
                if (!this.commentsView) {
                    var nid = this.model.get("nid");
                    this.commentsView = new AnnotationCommentsView({
                        markingModel: this.createMarkingModel(this.model),
                        className: "notification-comments-view",
                        commentTargetInfo: this.getTargetInfo(this.model),
                        commentTmpl: $("#tmpl-notification-comment-item").html(),
                        commentsUrl: function() {
                            return "/j/notification/get_notification_comments?nid=" + nid
                        }
                    }), this.$(".notification-comments").append(this.commentsView.render().el)
                }
                this.$el.removeClass("new").removeClass("collapsed"), this.detailElem.show()
            },
            getTargetInfo: function(model) {
                return {
                    article: {
                        authorId: model.get("works_author_id")
                    }
                }
            },
            createMarkingModel: function(model) {
                var modelData = model.toJSON();
                return new MarkingModel({
                    id: modelData.annotation_id
                }, {
                    articleId: modelData.works_id,
                    paragraphsIndex: []
                })
            },
            onModelRemove: function(model, collection, options) {
                return options.hardRemove ? (this.remove(), void 0) : (this.$el.fadeOut(400, function() {
                    this.remove()
                }), void 0)
            },
            openTab: function(e) {
                e.stopPropagation(), this.$el.removeClass("new")
            },
            getSingleAnnotationUrl: function() {
                var query = "?ici=annotation-reply&icn=noti",
                    data = this.model.toJSON(),
                    isChapter = data.works_is_chapter,
                    annotationId = data.annotation_id,
                    bookId = data.works_id,
                    readerUrl = isChapter ? "/reader/column/" + data.works_column_id + "/chapter/" + bookId : "/reader/ebook/" + bookId,
                    annotationUrl = "/annotation/" + annotationId + "/";
                return readerUrl + annotationUrl + query
            }
        });
        return NotificationView
    }), define("../reader/models/notification", ["backbone", "underscore", "mod/ajax"], function(Backbone, _, Ajax) {
        return Backbone.Model.extend({
            stopNotifyUrl: "/j/notification/not_noti_again",
            initialize: function() {
                this.on("destroy", this.stopNotify)
            },
            stopNotify: function() {
                return Ajax.post(this.stopNotifyUrl, {
                    nid: this.get("nid")
                })
            },
            typeIs: function(type) {
                return this.get("subscribe_reason") === type
            },
            isAuthor: function() {
                return this.typeIs("author")
            }
        })
    }), define("../reader/collections/notifications", ["backbone", "underscore", "jquery", "reader/models/notification", "mod/ajax"], function(Backbone, _, $, Notification) {
        return Backbone.Collection.extend({
            model: Notification,
            url: "/j/notification/get_notifications",
            limit: 20,
            initialize: function() {
                this.start = 0, this.on("remove", function() {
                    this.start--
                })
            },
            fetchMore: function(start, limit) {
                start = start || this.start, limit = limit || this.limit;
                var self = this;
                return this.fetch({
                    data: {
                        start: start,
                        limit: limit
                    }
                }).done(function(data) {
                    self.start += data.length
                })
            }
        })
    }), define("../reader/views/bookshelf/notifications", ["underscore", "backbone", "jquery", "reader/app", "reader/collections/notifications", "reader/views/bookshelf/notification_item", "reader/views/bookshelf/modules/time_hierarchy_list"], function(_, Backbone, $, app, Notifications, NotificationView, TimeHirarchyList) {
        var TEXT = {
                loading: "载入中…",
                empty: "你还没有任何阅读提醒",
                nonEmpty: ""
            },
            NotificationsView = Backbone.View.extend({
                el: "#notifications",
                initialize: function() {
                    this.docElement = $(document.documentElement), this.notificationList = new TimeHirarchyList({
                        el: this.$(".notifications-list")
                    }), this.msgText = this.$(".notifications-msg"), this.bindCollection()
                },
                bindCollection: function() {
                    return this.collection = new Notifications, this.listenTo(this.collection, "add", this.appendItem).listenTo(this.collection, "request", function() {
                        this.changeListState("loading")
                    }).listenTo(this.collection, "sync", function(model, resp) {
                        resp.length ? this.changeListState("nonEmpty") : this.changeListState("empty")
                    }), this
                },
                appendItem: function(model) {
                    this.notificationList.appendToTopic(new NotificationView({
                        model: model
                    }).render().el, model.get("time"))
                },
                refreshList: function() {
                    this.collection.set([], {
                        hardRemove: !0
                    }), this.notificationList.reset(), this.collection.fetchMore()
                },
                changeListState: function(state) {
                    this.listState !== state && (this.listState = state, this.msgText.text(TEXT[state]), this.$el.toggleClass("has-notification", "nonEmpty" === state))
                },
                show: function() {
                    return document.title = "阅读提醒", this.refreshList(), this.docElement.addClass("notifications-view"), this.$el.show(), $("body").scrollTop(0), this
                },
                hide: function() {
                    return this.docElement.removeClass("notifications-view"), this.$el.hide(), this
                }
            });
        return NotificationsView
    }), define("../reader/models/annotations_config", ["backbone", "underscore", "arkenv", "reader/modules/storage"], function(Backbone, _, arkenv, storage) {
        var AnnotationsConfig = Backbone.Model.extend({
            storageKey: "annotationsConfig",
            defaults: function() {
                return _.defaults(this.getStorageData(), {
                    showOthers: !0,
                    othersFilter: "all"
                })
            },
            initialize: function() {
                this.on("change", this.setStorageData)
            },
            isFilterOut: function(model) {
                var canShow, config = this.toJSON();
                return canShow = config.showOthers ? "followOnly" === config.othersFilter ? this.filterByTags(model, ["mine", "favorite", "following"]) : !0 : this.filterByTags(model, ["mine", "favorite"]), !canShow
            },
            filterByTags: function(model, filterTags) {
                return !!_.intersection(filterTags, model.get("tags")).length
            },
            getStorageData: function() {
                if (arkenv.me.isAnonymous) return {};
                var stringifyData = storage.get(this.storageKey);
                return stringifyData ? JSON.parse(stringifyData) : {}
            },
            setStorageData: function(model) {
                storage.set(this.storageKey, JSON.stringify(model.toJSON()))
            }
        });
        return AnnotationsConfig
    }), define("../reader/models/config", ["underscore", "backbone", "mod/cookie", "reader/modules/storage", "reader/modules/browser", "reader/models/annotations_config"], function(_, Backbone, cookie, storage, browser, AnnotationsConfig) {
        var HAS_SHOWN_ANNOTATION_GUIDE = "hsag",
            IS_OLD_USER = "hst",
            readerConfig = {
                pageWidth: 43.375,
                pageGutter: 0,
                pageOffset: 0,
                lineHeight: 2,
                pageHeight: 768,
                isRecommendation: !1
            },
            ConfigModel = Backbone.Model.extend({
                defaults: function() {
                    return _.defaults({
                        layout: storage.get("layout") || "horizontal",
                        annotationsConfig: new AnnotationsConfig,
                        hasShownAnnotationGuide: this.hasShownAnnotationGuide(),
                        isNewUser: this.isNewUser()
                    }, readerConfig)
                },
                storageKeys: ["layout"],
                ignoreSavingKeys: {},
                initialize: function() {
                    browser.fitForMobile && (this.ignoreSavingKeys.layout = !0, this.set("layout", "horizontal")), this.bindLocalStorageData(), this.bindCookieData()
                },
                bindLocalStorageData: function() {
                    _.each(this.storageKeys, function(key) {
                        this.on("change:" + key, function(model, value) {
                            this.ignoreSavingKeys[key] || storage.set(key, value)
                        })
                    }, this)
                },
                bindCookieData: function() {
                    this.on("change:hasShownAnnotationGuide", function(model, value) {
                        this.ignoreSavingKeys.hasShownAnnotationGuide || value && this.setCookieOn(HAS_SHOWN_ANNOTATION_GUIDE)
                    }, this).on("change:isNewUser", function(model, value) {
                        this.ignoreSavingKeys.isNewUser || value || this.setCookieOn(IS_OLD_USER)
                    }, this)
                },
                getPageHeightEm: function() {
                    return this.get("pageHeight") / 16
                },
                isNewUser: function() {
                    return !this.hasCookieSet(IS_OLD_USER)
                },
                hasShownAnnotationGuide: function() {
                    return this.hasCookieSet(HAS_SHOWN_ANNOTATION_GUIDE)
                },
                hasCookieSet: function(cookieName) {
                    var hasSet = cookie(cookieName);
                    return hasSet
                },
                setCookieOn: function(cookieName) {
                    return cookie(cookieName, 1, {
                        "max-age": 31536e3,
                        path: "/reader"
                    }), this
                },
                resetModel: function() {
                    return this.unset("ignoreSaveProgress", {
                        silent: !0
                    }).unset("ignoreGuide", {
                        silent: !0
                    }), this
                },
                setIgnoreSavingKey: function(key, isIngoring) {
                    return this.ignoreSavingKeys[key] = isIngoring, this
                }
            });
        return ConfigModel
    }), define("../reader/modules/ga", function() {
        var exports = {};
        return exports._trackPageview = function(url) {
            url = url.replace(/page.*/, ""), ga("send", "pageview", "/" + url)
        }, exports._trackEvent = function(action, label) {
            ("undefined" == typeof label || null === label) && (label = document.title), "number" == typeof label && (label = label.toString()), ga("send", "event", "reader", action, label)
        }, exports._trackTiming = function(variable, time, label) {
            "number" != typeof time && (label = parseInt(label, 10)), ("undefined" == typeof label || null === label) && (label = document.title), "number" == typeof label && (label = label.toString()), ga("send", "timing", "reader", variable, time, label)
        }, exports
    }), define("../reader/modules/session", ["mod/simplestorage"], function(SimpleStorage) {
        return new SimpleStorage(!0, "session")
    }), define("mod/url", function() {
        function normalize(str) {
            return str.replace(/[\/]+/g, "/").replace(/\/\?/g, "?").replace(/\/\#/g, "#").replace(/\:\//g, "://")
        }
        var exports = {};
        exports.getURLParameter = function(name, search) {
            search = search || location.search;
            var param = search.match(RegExp(name + "=" + "(.+?)(&|$)"));
            return param ? decodeURIComponent(param[1]) : null
        };
        var rNonQuerystring = /\+/g;
        exports.deparam = function(string) {
            for (var params = {}, paramsArray = string.replace(rNonQuerystring, " ").split("&"), i = 0, l = paramsArray.length; l > i; i++) {
                var paramString = paramsArray[i],
                    pair = paramString.split("="),
                    paramName = decodeURIComponent([pair[0]]),
                    paramValue = decodeURIComponent([pair[1]]);
                params[paramName] = paramValue
            }
            return params
        };
        var join = exports.join = function() {
            var joined = [].slice.call(arguments, 0).join("/");
            return normalize(joined)
        };
        exports.addParam = function(url, params) {
            var paramString = "";
            for (var key in params)
                if (params.hasOwnProperty(key)) {
                    var value = params[key];
                    "" !== value && "undefined" != typeof value && (paramString && (paramString += "&"), paramString += encodeURIComponent(key) + "=" + encodeURIComponent(value))
                }
            if (!paramString) return url;
            var hash = "",
                search = "",
                rest = url,
                hashIndex = rest.indexOf("#"),
                markIndex = rest.indexOf("?");
            return -1 !== hashIndex && (hash = rest.substr(hashIndex), rest = rest.slice(0, hashIndex)), -1 !== markIndex && (search = rest.substr(markIndex), rest = rest.slice(0, markIndex)), rest + (search ? search + "&" + paramString : "?" + paramString) + (hash ? hash : "")
        };
        var hasSameOrigin = exports.hasSameOrigin = function(url, originUrl) {
            if ("/" === url[0]) return !0;
            var rOrigin = new RegExp("^" + originUrl);
            return rOrigin.test(url)
        };
        return exports.getRelativeUrl = function(url, originUrl) {
            return "/" !== url[0] && hasSameOrigin(url, originUrl) ? join("/", url.substr(originUrl.length)) : url
        }, exports
    }), define("../mod/style_sheet_switch", ["underscore"], function(_) {
        var StyleSheetSwitch = function(styleSheetsIds, currentStyleSheet) {
            this.styleSheets = this.getStyleSheets(styleSheetsIds), currentStyleSheet ? this.use(currentStyleSheet) : this.disableAll()
        };
        return _.extend(StyleSheetSwitch.prototype, {
            getStyleSheets: function(ids) {
                var sheets = document.styleSheets,
                    result = {};
                return _.each(sheets, function(sheet) {
                    var sheetNode = sheet.ownerNode || sheet.owningElement;
                    if (sheetNode.id) {
                        var sheetId = sheetNode.id;
                        _.contains(ids, sheetId) && (result[sheetId] = sheet)
                    }
                }), result
            },
            use: function(styleSheetId) {
                _.isString(styleSheetId) && (styleSheetId = [styleSheetId]), (!this.currentStyleSheet || _.difference(this.currentStyleSheet, styleSheetId).length) && (this.currentStyleSheet = styleSheetId, this.disableAll(), _.each(this.styleSheets, function(sheet, sheetId) {
                    _.each(styleSheetId, function(id) {
                        id === sheetId && (sheet.disabled = !1)
                    })
                }))
            },
            disableAll: function() {
                _.each(this.styleSheets, function(sheet) {
                    sheet.disabled = !0
                })
            }
        }), StyleSheetSwitch
    }), define("../reader/router", ["backbone", "jquery", "underscore", "arkenv", "reader/app", "mod/style_sheet_switch", "mod/url", "reader/modules/detector", "reader/modules/session", "reader/modules/browser", "reader/modules/ga", "reader/models/config", "reader/views/bookshelf/notifications", "reader/views/common/column_layout", "reader/views/common/chapter_adapter", "reader/modules/open_login_and_signup"], function(Backbone, $, _, arkenv, app, StyleSheetSwitch, urlUtil, detector, session, browser, ga, ConfigModel, NotificationsView, ColumnLayout, ChapterAdapter, openLoginAndSignup) {
        function setArkenvWorksFromSession() {
            var root = READER_ROOT,
                atRoot = window.location.pathname.replace(/[^\/]$/, "$&/") === root;
            !atRoot && arkenv.works && session.set("works", arkenv.works), atRoot && !arkenv.works && (arkenv.works = session.get("works") || {})
        }

        function initialize(app) {
            app.router = new AppRouter(app), detector.hasPushState() || setArkenvWorksFromSession(), Backbone.history.start({
                pushState: !0,
                root: READER_ROOT
            })
        }
        var READER_ROOT = "/reader/",
            ROOT_PREFIX = /^\/reader\//,
            EBOOK_STYLE_SHEET = arkenv.EBOOK_STYLE_SHEET,
            GALLERY_STYLE_SHEET = arkenv.GALLERY_STYLE_SHEET,
            COLUMN_STYLE_SHEET = arkenv.COLUMN_STYLE_SHEET,
            ebookUrlArgsParser = function(args) {
                return {
                    ebookId: args[0]
                }
            },
            chapterUrlArgsParser = function(args) {
                return {
                    columnId: args[0],
                    ebookId: args[1]
                }
            },
            decorateRequireReadView = function(func, opts) {
                opts = opts || {
                    urlArgsParser: ebookUrlArgsParser
                };
                var result = function() {
                    var app = this.app,
                        args = _.toArray(arguments),
                        self = this,
                        argsDict = opts.urlArgsParser(args),
                        ebookId = argsDict.ebookId;
                    this._ebookId = ebookId;
                    var worksType = this.getWorksType(ebookId),
                        isColumnForDesktop = "c" === arkenv.works.type && !detector.fitForMobile(),
                        stylesheetMap = {
                            reading: EBOOK_STYLE_SHEET,
                            gallery: GALLERY_STYLE_SHEET
                        };
                    isColumnForDesktop ? styleSheetSwitch.use([EBOOK_STYLE_SHEET, COLUMN_STYLE_SHEET]) : styleSheetSwitch.use(stylesheetMap[worksType]), app.init(worksType), this.readingCleanup(), this.initConfigModel({
                        worksType: worksType,
                        isChapter: opts.isChapter,
                        isLiteStyle: isColumnForDesktop
                    }), $("html").toggleClass("has-bad-chinese-line-break", detector.hasBadChineseLineBreak()), this.requireReadView(worksType, ebookId, function(readView) {
                        func.apply(self, [readView].concat(args)), self.switchPageView(readView.name)
                    })
                };
                return result
            },
            decorateChapterRoute = function(func) {
                var decorateOpts = {
                    urlArgsParser: chapterUrlArgsParser,
                    isChapter: !0
                };
                return decorateRequireReadView(function(readView, columnId, chapterId) {
                    var args = _.toArray(arguments);
                    this._columnId = columnId, this.setChapterConfig(readView), this.chapterAdapter = new ChapterAdapter({
                        columnId: columnId,
                        chapterId: chapterId
                    }).render({
                        canvas: readView
                    }), this.chapterAdapter.modelPromise.done(_.bind(function() {
                        this._initColumnLayout(), func.apply(this, args)
                    }, this))
                }, decorateOpts)
            },
            styleSheetSwitch = new StyleSheetSwitch([EBOOK_STYLE_SHEET, GALLERY_STYLE_SHEET, COLUMN_STYLE_SHEET]),
            AppRouter = Backbone.Router.extend({
                routes: {
                    "": "home",
                    "ebook/:ebookId/": "ebook",
                    "column/:columnId/chapter/:chapterId/": "chapter",
                    "notifications/": "notifications",
                    "ebook/:ebookId/recommendation/:rId/": "showRecommendation",
                    "ebook/:ebookId/show-underline/*query": "showUnderline",
                    "ebook/:ebookId/annotation/:annotationId/*query": "openSingleAnnotation",
                    "ebook/:ebookId/para-annotations/:paraId/": "openParaAnnotations",
                    "ebook/:ebookId/toc/:index/": "gotoToc",
                    "column/:columnId/chapter/:chapterId/list/": "chapterWithList",
                    "column/:columnId/chapter/:chapterId/recommendation/:rId/": "showChapterRecommendation",
                    "column/:columnId/chapter/:chapterId/annotation/:annotationId/*query": "openChapterSingleAnnotation",
                    "column/:columnId/chapter/:chapterId/para-annotations/:paraId/": "openChapterParaAnnotations",
                    "ebook/:ebookId/page/:pageNumber/": "redirectToEbook",
                    "*actions": "redirectToHome"
                },
                initialize: function(app) {
                    this.app = app, this.body = $("body"), this.viewNames = ["readView", "galleryView", "notificationsView"];
                    var thisRouter = this;
                    $("body").on("click", "a[data-permalink]", function(e) {
                        if (!(e.altkey || e.ctrlKey || e.metaKey || e.shiftKey)) {
                            e.preventDefault();
                            var url = this.getAttribute("href").replace(ROOT_PREFIX, "");
                            thisRouter.navigate(url, {
                                trigger: !0
                            })
                        }
                    }).on("click", "a[data-in-app-go-back]", function(e) {
                        if (e.preventDefault(), app.atLandingView) {
                            var fallbackUrl = this.getAttribute("href");
                            thisRouter.navigate(fallbackUrl, !0)
                        } else history.go(-1)
                    }), this.bindLandingHandler()
                },
                bindLandingHandler: function() {
                    function unsetLandingView(e) {
                        /^route:/.test(e) && (app.atLandingView = !1, this.off("all", unsetLandingView))
                    }

                    function setLandingView(e) {
                        /^route:/.test(e) && (this.off("all", setLandingView), this.on("all", unsetLandingView), app.atLandingView = !0)
                    }
                    var app = this.app;
                    this.on("all", setLandingView), this.on("all", this._trackPageview)
                },
                switchPageView: function(currView) {
                    var app = this.app;
                    app.trigger("pageView:switched"), this.removeGalleryThemeClass(), _.each(this.viewNames, function(viewName) {
                        viewName !== currView && app[viewName] && app[viewName].hide()
                    }), app[currView].show()
                },
                readingCleanup: function() {
                    try {
                        app.getModel("config").resetModel()
                    } catch (e) {
                        app.setModel("config", new ConfigModel)
                    }
                    this.cleanChapterAdapter()
                },
                initConfigModel: function(options) {
                    var configModel = app.getModel("config"),
                        isGallery = "gallery" === options.worksType;
                    configModel.set("isGallery", isGallery).set("isChapter", !!options.isChapter), (options.isLiteStyle || detector.fitForMobile()) && configModel.setIgnoreSavingKey("layout", !0), options.isLiteStyle && configModel.set("layout", "vertical"), detector.fitForMobile() && configModel.set("layout", isGallery ? "vertical" : "horizontal")
                },
                removeGalleryThemeClass: function() {
                    this.body.removeClass("day-theme night-theme")
                },
                home: function() {
                    this.redirectToHome()
                },
                ebook: decorateRequireReadView(function(readView, ebookId) {
                    readView.render(ebookId)
                }),
                _initColumnLayout: function() {
                    "c" !== arkenv.works.type || detector.fitForMobile() || (this.columnLayout = this.columnLayout || new ColumnLayout, this.columnLayout.render({
                        model: this.chapterAdapter.columnModel
                    }))
                },
                chapter: decorateChapterRoute(function(readView, columnId, chapterId) {
                    readView.render(chapterId)
                }),
                chapterWithList: decorateChapterRoute(function(readView, columnId, chapterId) {
                    readView.renderThenOpenChapterList(chapterId)
                }),
                setChapterConfig: function(readView) {
                    var configModel = app.getModel("config");
                    readView.$el.addClass("is-chapter"), configModel.once("change:isChapter", function() {
                        readView.$el.removeClass("is-chapter")
                    })
                },
                cleanChapterAdapter: function() {
                    this.chapterAdapter && (this.chapterAdapter.remove(), delete this.chapterAdapter, app.getModel("config").unset("isChapter"))
                },
                notifications: function() {
                    var app = this.app;
                    app.notificationsView = app.notificationsView || new NotificationsView, this.switchPageView("notificationsView")
                },
                showUnderline: decorateRequireReadView(function(readView, worksId, noop, query) {
                    var queryData = urlUtil.deparam(query || ""),
                        underlineData = {};
                    _.each(["startContainerId", "endContainerId", "startOffset", "endOffset"], function(prop) {
                        underlineData[prop] = +queryData[prop]
                    });
                    var middleContainers = queryData.middleContainers;
                    underlineData.middleContainers = middleContainers ? _.map(middleContainers.split(","), function(prop) {
                        return +prop
                    }) : [], readView.renderThenShowUnderline(worksId, underlineData)
                }),
                showRecommendation: decorateRequireReadView(function(readView, ebookId, rId) {
                    readView.renderThenOpenRecommendation(ebookId, rId)
                }),
                openSingleAnnotation: decorateRequireReadView(function(readView, ebookId, annotationId) {
                    browser.fitForDesktop || this.redirectToEbook(ebookId), readView.renderThenOpenAnnotation(ebookId, annotationId)
                }),
                openParaAnnotations: decorateRequireReadView(function(readView, ebookId, paraId) {
                    browser.fitForDesktop || this.redirectToEbook(ebookId), readView.renderThenOpenParaAnnotations(ebookId, paraId)
                }),
                gotoToc: decorateRequireReadView(function(readView, ebookId, index) {
                    readView.renderThenGotoChapter(ebookId, index)
                }),
                showChapterRecommendation: decorateChapterRoute(function(readView, columnId, chapterId, rId) {
                    readView.renderThenOpenRecommendation(chapterId, rId)
                }),
                openChapterSingleAnnotation: decorateChapterRoute(function(readView, columnId, chapterId, rId) {
                    browser.fitForDesktop || this.redirectToChapter(), readView.renderThenOpenAnnotation(chapterId, rId)
                }),
                openChapterParaAnnotations: decorateChapterRoute(function(readView, columnId, chapterId, paraId) {
                    browser.fitForDesktop || this.redirectToChapter(), readView.renderThenOpenParaAnnotations(chapterId, paraId)
                }),
                redirectToEbook: function(ebookId) {
                    var url = ["ebook", ebookId, ""].join("/");
                    return this.navigate(url, {
                        trigger: !0,
                        replace: !0
                    })
                },
                redirectToChapter: function() {
                    var url = this.getBookUrl();
                    return this.navigate(url, {
                        trigger: !0,
                        replace: !0
                    })
                },
                getWorksType: function(ebookId) {
                    var typeMap = {
                            g: "gallery",
                            t: "reading",
                            c: "reading"
                        },
                        defaultType = typeMap.t;
                    if (!detector.hasPushState() && arkenv.works.id !== ebookId) return this.redirectTryGetWorksType(), defaultType;
                    app.cachedWorksTypeSymobol || (app.cachedWorksTypeSymobol = {});
                    var worksTypeSymbol = app.cachedWorksTypeSymobol[ebookId] || arkenv.works.type;
                    return app.cachedWorksTypeSymobol[ebookId] = worksTypeSymbol, arkenv.works = _.extend(arkenv.works || {}, {
                        type: worksTypeSymbol
                    }), typeMap[worksTypeSymbol || "t"]
                },
                requireReadView: function(worksType, ebookId, cb) {
                    function viewFn(ReadView) {
                        app[viewName] = app[viewName] || new ReadView, app[viewName].name = viewName, cb(app[viewName])
                    }
                    var viewsMap = {
                            gallery: "galleryView",
                            reading: "readView"
                        },
                        viewName = viewsMap[worksType];
                    switch (viewName) {
                        case "readView":
                            require("reader/views/reading/canvas", viewFn);
                            break;
                        case "galleryView":
                            require("reader/views/gallery/canvas", viewFn);
                            break;
                        default:
                            this.redirectToHome()
                    }
                },
                _trackPageview: function() {
                    var url = Backbone.history.getFragment();
                    ga._trackPageview(READER_ROOT + url)
                },
                redirectToHome: function() {
                    arkenv.me.isAnonymous ? openLoginAndSignup({
                        closable: !1
                    }) : location.href = "/reader/ebooks"
                },
                redirectTryGetWorksType: function() {
                    var fragment = Backbone.history.getFragment(),
                        root = Backbone.history.root;
                    window.location.replace(root + fragment + window.location.search)
                },
                redirectToNotifications: function() {
                    this.navigate("notifications/", {
                        trigger: !0
                    })
                },
                cleanUrl: function(options) {
                    options = _.extend({
                        trigger: !1,
                        replace: !0
                    }, options), this.navigate(this.getBookUrl({
                        ignoreSearch: !0
                    }), options)
                },
                getBookUrl: function(opts) {
                    opts = opts || {};
                    var url, s = window.location.search || "",
                        config = app.getModel("config");
                    return s = opts.ignoreSearch ? "" : s, url = config.get("isChapter") ? ["column", this._columnId, "chapter", this._ebookId, ""].join("/") : ["ebook", this._ebookId, ""].join("/"), url + s
                },
                getReviewsUrl: function() {
                    var url = "/" + this.getBookUrl({
                        ignoreSearch: !0
                    });
                    return url += app.getModel("config").get("isChapter") ? "comments" : "reviews?sort=score"
                },
                getQuestionsUrl: function() {
                    return "/" + this.getBookUrl({
                        ignoreSearch: !0
                    }) + "questions"
                }
            });
        return {
            initialize: initialize
        }
    }), define("../reader/main", ["jquery", "backbone", "underscore", "arkenv", "reader/app", "reader/router", "mod/ajax", "mod/bbsync", "reader/modules/browser", "reader/modules/storage_manager", "reader/modules/open_login_and_signup", "reader/models/user"], function($, Backbone, _, arkenv, app, Router, ajax, BBSync, browser, storageManager, openLoginAndSignup, User) {
        function initialize() {
            Backbone.ajax = function(options) {
                _.extend(options, {
                    processData: !0
                });
                var xhr = ajax.call(this, options),
                    dfd = new $.Deferred,
                    newXhr = dfd.promise();
                return xhr.done(function(resp, textStatus, jqXhr) {
                    if (!resp) return dfd.resolve(arguments);
                    var hasError = !!resp.r || !!resp.error;
                    return _.isUndefined(resp.r) || delete resp.r, hasError ? dfd.reject(jqXhr, "error", resp.msg || resp.error || "出现了奇怪的错误, 请稍后再试") : dfd.resolve(resp)
                }).fail(function() {
                    dfd.reject.apply(this, arguments)
                }), newXhr
            };
            var getSyncMethod = function(model) {
                return model.fakeSync || model.collection && model.collection.fakeSync ? Backbone.fakeSync : BBSync
            };
            Backbone.fakeSync = function(method, model, options) {
                var dfd = new $.Deferred,
                    promise = dfd.resolve().promise();
                return options.success && promise.done(options.success), options.error && promise.fail(options.error), promise
            }, Backbone.sync = function(method, model, options) {
                return getSyncMethod(model).apply(this, [method, model, options])
            }, storageManager.checkStorageVersion(), browser.fitForDesktop && $("html").addClass("fit-for-desktop"), _.extend(app, {
                me: new User(arkenv.me),
                navigate: function() {
                    var router = app.router;
                    router && router.navigate.apply(router, arguments)
                }
            });
            var body = $("body");
            body.on("click", 'a[href="#"]', function(e) {
                e.preventDefault()
            }).on("click", "[data-target-dialog=login]", function() {
                app.trigger("open:login-dialog")
            }).on("contextmenu dragstart", "img, .pic", function(e) {
                e.preventDefault()
            }), app.on("open:login-dialog", function() {
                var closable = $(this).data("closable");
                openLoginAndSignup({
                    closable: closable
                })
            }), /msie 8/i.test(navigator.userAgent) && body.on("selectstart", function(e) {
                var isTextarea = "TEXTAREA" === e.target.nodeName;
                return isTextarea ? void 0 : !1
            }), Router.initialize(app)
        }
        return {
            initialize: initialize
        }
    }), require.config({
        baseUrl: "/js/lib/",
        distUrl: "/js/dist/lib/",
        aliases: {
            mod: "../mod/",
            ui: "../ui/",
            util: "../util/",
            widget: "../widget/",
            reader: "../reader/",
            galeditor: "../component/galeditor/",
            galreader: "../component/galreader/"
        }
    }), define("dollar", ["dollar/jquery"], function($) {
        return $
    }), define("jquery-src", "jquery/jquery.js"), define("jquery", ["jquery-src"], "{reader}lib/jquery.js"), define("iscroll-lite", "iscroll-lite.js"), define("backbone-src", "backbone/backbone.js"), define("backbone", ["backbone-src"], function() {
        return Backbone.inhert = Backbone.View.extend, Backbone
    }), define("backbone/events", ["backbone-src"], function() {
        return Backbone.Events
    }), define("lib/fsm", "{lib}state-machine.js"), "undefined" != typeof process && (define("mathjax", [], function() {}), define("arkenv", [], function() {}), require(["reader/main"], function() {}));
