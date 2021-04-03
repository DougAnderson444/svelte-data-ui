(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
    typeof define === 'function' && define.amd ? define(factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, global.DataUi = factory());
}(this, (function () { 'use strict';

    function noop() { }
    const identity = x => x;
    function assign(tar, src) {
        // @ts-ignore
        for (const k in src)
            tar[k] = src[k];
        return tar;
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function create_slot(definition, ctx, $$scope, fn) {
        if (definition) {
            const slot_ctx = get_slot_context(definition, ctx, $$scope, fn);
            return definition[0](slot_ctx);
        }
    }
    function get_slot_context(definition, ctx, $$scope, fn) {
        return definition[1] && fn
            ? assign($$scope.ctx.slice(), definition[1](fn(ctx)))
            : $$scope.ctx;
    }
    function get_slot_changes(definition, $$scope, dirty, fn) {
        if (definition[2] && fn) {
            const lets = definition[2](fn(dirty));
            if ($$scope.dirty === undefined) {
                return lets;
            }
            if (typeof lets === 'object') {
                const merged = [];
                const len = Math.max($$scope.dirty.length, lets.length);
                for (let i = 0; i < len; i += 1) {
                    merged[i] = $$scope.dirty[i] | lets[i];
                }
                return merged;
            }
            return $$scope.dirty | lets;
        }
        return $$scope.dirty;
    }
    function update_slot(slot, slot_definition, ctx, $$scope, dirty, get_slot_changes_fn, get_slot_context_fn) {
        const slot_changes = get_slot_changes(slot_definition, $$scope, dirty, get_slot_changes_fn);
        if (slot_changes) {
            const slot_context = get_slot_context(slot_definition, ctx, $$scope, get_slot_context_fn);
            slot.p(slot_context, slot_changes);
        }
    }
    function exclude_internal_props(props) {
        const result = {};
        for (const k in props)
            if (k[0] !== '$')
                result[k] = props[k];
        return result;
    }
    function compute_rest_props(props, keys) {
        const rest = {};
        keys = new Set(keys);
        for (const k in props)
            if (!keys.has(k) && k[0] !== '$')
                rest[k] = props[k];
        return rest;
    }
    function action_destroyer(action_result) {
        return action_result && is_function(action_result.destroy) ? action_result.destroy : noop;
    }

    const is_client = typeof window !== 'undefined';
    let now = is_client
        ? () => window.performance.now()
        : () => Date.now();
    let raf = is_client ? cb => requestAnimationFrame(cb) : noop;

    const tasks = new Set();
    function run_tasks(now) {
        tasks.forEach(task => {
            if (!task.c(now)) {
                tasks.delete(task);
                task.f();
            }
        });
        if (tasks.size !== 0)
            raf(run_tasks);
    }
    /**
     * Creates a new task that runs on each raf frame
     * until it returns a falsy value or is aborted
     */
    function loop(callback) {
        let task;
        if (tasks.size === 0)
            raf(run_tasks);
        return {
            promise: new Promise(fulfill => {
                tasks.add(task = { c: callback, f: fulfill });
            }),
            abort() {
                tasks.delete(task);
            }
        };
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function svg_element(name) {
        return document.createElementNS('http://www.w3.org/2000/svg', name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function set_attributes(node, attributes) {
        // @ts-ignore
        const descriptors = Object.getOwnPropertyDescriptors(node.__proto__);
        for (const key in attributes) {
            if (attributes[key] == null) {
                node.removeAttribute(key);
            }
            else if (key === 'style') {
                node.style.cssText = attributes[key];
            }
            else if (key === '__value') {
                node.value = node[key] = attributes[key];
            }
            else if (descriptors[key] && descriptors[key].set) {
                node[key] = attributes[key];
            }
            else {
                attr(node, key, attributes[key]);
            }
        }
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_data(text, data) {
        data = '' + data;
        if (text.wholeText !== data)
            text.data = data;
    }
    function set_input_value(input, value) {
        input.value = value == null ? '' : value;
    }
    function set_style(node, key, value, important) {
        node.style.setProperty(key, value, important ? 'important' : '');
    }
    function toggle_class(element, name, toggle) {
        element.classList[toggle ? 'add' : 'remove'](name);
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    const active_docs = new Set();
    let active = 0;
    // https://github.com/darkskyapp/string-hash/blob/master/index.js
    function hash(str) {
        let hash = 5381;
        let i = str.length;
        while (i--)
            hash = ((hash << 5) - hash) ^ str.charCodeAt(i);
        return hash >>> 0;
    }
    function create_rule(node, a, b, duration, delay, ease, fn, uid = 0) {
        const step = 16.666 / duration;
        let keyframes = '{\n';
        for (let p = 0; p <= 1; p += step) {
            const t = a + (b - a) * ease(p);
            keyframes += p * 100 + `%{${fn(t, 1 - t)}}\n`;
        }
        const rule = keyframes + `100% {${fn(b, 1 - b)}}\n}`;
        const name = `__svelte_${hash(rule)}_${uid}`;
        const doc = node.ownerDocument;
        active_docs.add(doc);
        const stylesheet = doc.__svelte_stylesheet || (doc.__svelte_stylesheet = doc.head.appendChild(element('style')).sheet);
        const current_rules = doc.__svelte_rules || (doc.__svelte_rules = {});
        if (!current_rules[name]) {
            current_rules[name] = true;
            stylesheet.insertRule(`@keyframes ${name} ${rule}`, stylesheet.cssRules.length);
        }
        const animation = node.style.animation || '';
        node.style.animation = `${animation ? `${animation}, ` : ''}${name} ${duration}ms linear ${delay}ms 1 both`;
        active += 1;
        return name;
    }
    function delete_rule(node, name) {
        const previous = (node.style.animation || '').split(', ');
        const next = previous.filter(name
            ? anim => anim.indexOf(name) < 0 // remove specific animation
            : anim => anim.indexOf('__svelte') === -1 // remove all Svelte animations
        );
        const deleted = previous.length - next.length;
        if (deleted) {
            node.style.animation = next.join(', ');
            active -= deleted;
            if (!active)
                clear_rules();
        }
    }
    function clear_rules() {
        raf(() => {
            if (active)
                return;
            active_docs.forEach(doc => {
                const stylesheet = doc.__svelte_stylesheet;
                let i = stylesheet.cssRules.length;
                while (i--)
                    stylesheet.deleteRule(i);
                doc.__svelte_rules = {};
            });
            active_docs.clear();
        });
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error('Function called outside component initialization');
        return current_component;
    }
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }
    function onDestroy(fn) {
        get_current_component().$$.on_destroy.push(fn);
    }
    function createEventDispatcher() {
        const component = get_current_component();
        return (type, detail) => {
            const callbacks = component.$$.callbacks[type];
            if (callbacks) {
                // TODO are there situations where events could be dispatched
                // in a server (non-DOM) environment?
                const event = custom_event(type, detail);
                callbacks.slice().forEach(fn => {
                    fn.call(component, event);
                });
            }
        };
    }
    function setContext(key, context) {
        get_current_component().$$.context.set(key, context);
    }
    function getContext(key) {
        return get_current_component().$$.context.get(key);
    }
    // TODO figure out if we still want to support
    // shorthand events, or if we want to implement
    // a real bubbling mechanism
    function bubble(component, event) {
        const callbacks = component.$$.callbacks[event.type];
        if (callbacks) {
            callbacks.slice().forEach(fn => fn(event));
        }
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    function add_flush_callback(fn) {
        flush_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }

    let promise;
    function wait() {
        if (!promise) {
            promise = Promise.resolve();
            promise.then(() => {
                promise = null;
            });
        }
        return promise;
    }
    function dispatch(node, direction, kind) {
        node.dispatchEvent(custom_event(`${direction ? 'intro' : 'outro'}${kind}`));
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }
    const null_transition = { duration: 0 };
    function create_in_transition(node, fn, params) {
        let config = fn(node, params);
        let running = false;
        let animation_name;
        let task;
        let uid = 0;
        function cleanup() {
            if (animation_name)
                delete_rule(node, animation_name);
        }
        function go() {
            const { delay = 0, duration = 300, easing = identity, tick = noop, css } = config || null_transition;
            if (css)
                animation_name = create_rule(node, 0, 1, duration, delay, easing, css, uid++);
            tick(0, 1);
            const start_time = now() + delay;
            const end_time = start_time + duration;
            if (task)
                task.abort();
            running = true;
            add_render_callback(() => dispatch(node, true, 'start'));
            task = loop(now => {
                if (running) {
                    if (now >= end_time) {
                        tick(1, 0);
                        dispatch(node, true, 'end');
                        cleanup();
                        return running = false;
                    }
                    if (now >= start_time) {
                        const t = easing((now - start_time) / duration);
                        tick(t, 1 - t);
                    }
                }
                return running;
            });
        }
        let started = false;
        return {
            start() {
                if (started)
                    return;
                delete_rule(node);
                if (is_function(config)) {
                    config = config();
                    wait().then(go);
                }
                else {
                    go();
                }
            },
            invalidate() {
                started = false;
            },
            end() {
                if (running) {
                    cleanup();
                    running = false;
                }
            }
        };
    }
    function create_out_transition(node, fn, params) {
        let config = fn(node, params);
        let running = true;
        let animation_name;
        const group = outros;
        group.r += 1;
        function go() {
            const { delay = 0, duration = 300, easing = identity, tick = noop, css } = config || null_transition;
            if (css)
                animation_name = create_rule(node, 1, 0, duration, delay, easing, css);
            const start_time = now() + delay;
            const end_time = start_time + duration;
            add_render_callback(() => dispatch(node, false, 'start'));
            loop(now => {
                if (running) {
                    if (now >= end_time) {
                        tick(0, 1);
                        dispatch(node, false, 'end');
                        if (!--group.r) {
                            // this will result in `end()` being called,
                            // so we don't need to clean up here
                            run_all(group.c);
                        }
                        return false;
                    }
                    if (now >= start_time) {
                        const t = easing((now - start_time) / duration);
                        tick(1 - t, t);
                    }
                }
                return running;
            });
        }
        if (is_function(config)) {
            wait().then(() => {
                // @ts-ignore
                config = config();
                go();
            });
        }
        else {
            go();
        }
        return {
            end(reset) {
                if (reset && config.tick) {
                    config.tick(1, 0);
                }
                if (running) {
                    if (animation_name)
                        delete_rule(node, animation_name);
                    running = false;
                }
            }
        };
    }
    function create_bidirectional_transition(node, fn, params, intro) {
        let config = fn(node, params);
        let t = intro ? 0 : 1;
        let running_program = null;
        let pending_program = null;
        let animation_name = null;
        function clear_animation() {
            if (animation_name)
                delete_rule(node, animation_name);
        }
        function init(program, duration) {
            const d = program.b - t;
            duration *= Math.abs(d);
            return {
                a: t,
                b: program.b,
                d,
                duration,
                start: program.start,
                end: program.start + duration,
                group: program.group
            };
        }
        function go(b) {
            const { delay = 0, duration = 300, easing = identity, tick = noop, css } = config || null_transition;
            const program = {
                start: now() + delay,
                b
            };
            if (!b) {
                // @ts-ignore todo: improve typings
                program.group = outros;
                outros.r += 1;
            }
            if (running_program || pending_program) {
                pending_program = program;
            }
            else {
                // if this is an intro, and there's a delay, we need to do
                // an initial tick and/or apply CSS animation immediately
                if (css) {
                    clear_animation();
                    animation_name = create_rule(node, t, b, duration, delay, easing, css);
                }
                if (b)
                    tick(0, 1);
                running_program = init(program, duration);
                add_render_callback(() => dispatch(node, b, 'start'));
                loop(now => {
                    if (pending_program && now > pending_program.start) {
                        running_program = init(pending_program, duration);
                        pending_program = null;
                        dispatch(node, running_program.b, 'start');
                        if (css) {
                            clear_animation();
                            animation_name = create_rule(node, t, running_program.b, running_program.duration, 0, easing, config.css);
                        }
                    }
                    if (running_program) {
                        if (now >= running_program.end) {
                            tick(t = running_program.b, 1 - t);
                            dispatch(node, running_program.b, 'end');
                            if (!pending_program) {
                                // we're done
                                if (running_program.b) {
                                    // intro — we can tidy up immediately
                                    clear_animation();
                                }
                                else {
                                    // outro — needs to be coordinated
                                    if (!--running_program.group.r)
                                        run_all(running_program.group.c);
                                }
                            }
                            running_program = null;
                        }
                        else if (now >= running_program.start) {
                            const p = now - running_program.start;
                            t = running_program.a + running_program.d * easing(p / running_program.duration);
                            tick(t, 1 - t);
                        }
                    }
                    return !!(running_program || pending_program);
                });
            }
        }
        return {
            run(b) {
                if (is_function(config)) {
                    wait().then(() => {
                        // @ts-ignore
                        config = config();
                        go(b);
                    });
                }
                else {
                    go(b);
                }
            },
            end() {
                clear_animation();
                running_program = pending_program = null;
            }
        };
    }

    function get_spread_update(levels, updates) {
        const update = {};
        const to_null_out = {};
        const accounted_for = { $$scope: 1 };
        let i = levels.length;
        while (i--) {
            const o = levels[i];
            const n = updates[i];
            if (n) {
                for (const key in o) {
                    if (!(key in n))
                        to_null_out[key] = 1;
                }
                for (const key in n) {
                    if (!accounted_for[key]) {
                        update[key] = n[key];
                        accounted_for[key] = 1;
                    }
                }
                levels[i] = n;
            }
            else {
                for (const key in o) {
                    accounted_for[key] = 1;
                }
            }
        }
        for (const key in to_null_out) {
            if (!(key in update))
                update[key] = undefined;
        }
        return update;
    }
    function get_spread_object(spread_props) {
        return typeof spread_props === 'object' && spread_props !== null ? spread_props : {};
    }

    function bind(component, name, callback) {
        const index = component.$$.props[name];
        if (index !== undefined) {
            component.$$.bound[index] = callback;
            callback(component.$$.ctx[index]);
        }
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = on_mount.map(run).filter(is_function);
                if (on_destroy) {
                    on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    /* eslint-disable no-param-reassign */

    /**
     * Options for customizing ripples
     */
    const defaults = {
      color: 'currentColor',
      class: '',
      opacity: 0.1,
      centered: false,
      spreadingDuration: '.4s',
      spreadingDelay: '0s',
      spreadingTimingFunction: 'linear',
      clearingDuration: '1s',
      clearingDelay: '0s',
      clearingTimingFunction: 'ease-in-out',
    };

    /**
     * Creates a ripple element but does not destroy it (use RippleStop for that)
     *
     * @param {Event} e
     * @param {*} options
     * @returns Ripple element
     */
    function RippleStart(e, options = {}) {
      e.stopImmediatePropagation();
      const opts = { ...defaults, ...options };

      const isTouchEvent = e.touches ? !!e.touches[0] : false;
      // Parent element
      const target = isTouchEvent ? e.touches[0].currentTarget : e.currentTarget;

      // Create ripple
      const ripple = document.createElement('div');
      const rippleStyle = ripple.style;

      // Adding default stuff
      ripple.className = `material-ripple ${opts.class}`;
      rippleStyle.position = 'absolute';
      rippleStyle.color = 'inherit';
      rippleStyle.borderRadius = '50%';
      rippleStyle.pointerEvents = 'none';
      rippleStyle.width = '100px';
      rippleStyle.height = '100px';
      rippleStyle.marginTop = '-50px';
      rippleStyle.marginLeft = '-50px';
      target.appendChild(ripple);
      rippleStyle.opacity = opts.opacity;
      rippleStyle.transition = `transform ${opts.spreadingDuration} ${opts.spreadingTimingFunction} ${opts.spreadingDelay},opacity ${opts.clearingDuration} ${opts.clearingTimingFunction} ${opts.clearingDelay}`;
      rippleStyle.transform = 'scale(0) translate(0,0)';
      rippleStyle.background = opts.color;

      // Positioning ripple
      const targetRect = target.getBoundingClientRect();
      if (opts.centered) {
        rippleStyle.top = `${targetRect.height / 2}px`;
        rippleStyle.left = `${targetRect.width / 2}px`;
      } else {
        const distY = isTouchEvent ? e.touches[0].clientY : e.clientY;
        const distX = isTouchEvent ? e.touches[0].clientX : e.clientX;
        rippleStyle.top = `${distY - targetRect.top}px`;
        rippleStyle.left = `${distX - targetRect.left}px`;
      }

      // Enlarge ripple
      rippleStyle.transform = `scale(${
    Math.max(targetRect.width, targetRect.height) * 0.02
  }) translate(0,0)`;
      return ripple;
    }

    /**
     * Destroys the ripple, slowly fading it out.
     *
     * @param {Element} ripple
     */
    function RippleStop(ripple) {
      if (ripple) {
        ripple.addEventListener('transitionend', (e) => {
          if (e.propertyName === 'opacity') ripple.remove();
        });
        ripple.style.opacity = 0;
      }
    }

    /**
     * @param node {Element}
     */
    var Ripple = (node, _options = {}) => {
      let options = _options;
      let destroyed = false;
      let ripple;
      let keyboardActive = false;
      const handleStart = (e) => {
        ripple = RippleStart(e, options);
      };
      const handleStop = () => RippleStop(ripple);
      const handleKeyboardStart = (e) => {
        if (!keyboardActive && (e.keyCode === 13 || e.keyCode === 32)) {
          ripple = RippleStart(e, { ...options, centered: true });
          keyboardActive = true;
        }
      };
      const handleKeyboardStop = () => {
        keyboardActive = false;
        handleStop();
      };

      function setup() {
        node.classList.add('s-ripple-container');
        node.addEventListener('pointerdown', handleStart);
        node.addEventListener('pointerup', handleStop);
        node.addEventListener('pointerleave', handleStop);
        node.addEventListener('keydown', handleKeyboardStart);
        node.addEventListener('keyup', handleKeyboardStop);
        destroyed = false;
      }

      function destroy() {
        node.classList.remove('s-ripple-container');
        node.removeEventListener('pointerdown', handleStart);
        node.removeEventListener('pointerup', handleStop);
        node.removeEventListener('pointerleave', handleStop);
        node.removeEventListener('keydown', handleKeyboardStart);
        node.removeEventListener('keyup', handleKeyboardStop);
        destroyed = true;
      }

      if (options) setup();

      return {
        update(newOptions) {
          options = newOptions;
          if (options && destroyed) setup();
          else if (!(options || destroyed)) destroy();
        },
        destroy,
      };
    };

    /**
     * Click Outside
     * @param {Node} node
     */
    var ClickOutside = (node, _options = {}) => {
      const options = { include: [], ..._options };

      function detect({ target }) {
        if (!node.contains(target) || options.include.some((i) => target.isSameNode(i))) {
          node.dispatchEvent(new CustomEvent('clickOutside'));
        }
      }
      document.addEventListener('click', detect, { passive: true, capture: true });
      return {
        destroy() {
          document.removeEventListener('click', detect);
        },
      };
    };

    /* node_modules\svelte-materialify\src\components\MaterialApp\MaterialApp.svelte generated by Svelte v3.35.0 */

    function add_css$l() {
    	var style = element("style");
    	style.id = "svelte-ht1yxd-style";
    	style.textContent = "@charset \"UTF-8\";.theme--light{--theme-surface:#ffffff;--theme-text-primary:rgba(0, 0, 0, 0.87);--theme-text-secondary:rgba(0, 0, 0, 0.6);--theme-text-disabled:rgba(0, 0, 0, 0.38);--theme-text-link:#1976d2;--theme-icons-active:rgba(0, 0, 0, 0.54);--theme-icons-inactive:rgba(0, 0, 0, 0.38);--theme-inputs-box:rgba(0, 0, 0, 0.04);--theme-buttons-disabled:rgba(0, 0, 0, 0.26);--theme-tabs:rgba(0, 0, 0, 0.54);--theme-text-fields-filled:rgba(0, 0, 0, 0.06);--theme-text-fields-filled-hover:rgba(0, 0, 0, 0.12);--theme-text-fields-outlined:rgba(0, 0, 0, 0.38);--theme-text-fields-outlined-disabled:rgba(0, 0, 0, 0.26);--theme-text-fields-border:rgba(0, 0, 0, 0.42);--theme-controls-disabled:rgba(0, 0, 0, 0.26);--theme-controls-thumb-inactive:#ffffff;--theme-controls-thumb-disabled:#fafafa;--theme-controls-track-inactive:rgba(0, 0, 0, 0.38);--theme-controls-track-disabled:rgba(0, 0, 0, 0.12);--theme-tables-active:#f5f5f5;--theme-tables-hover:#eeeeee;--theme-tables-group:#eeeeee;--theme-dividers:rgba(0, 0, 0, 0.12);--theme-chips:#e0e0e0;--theme-cards:#ffffff;--theme-app-bar:#f5f5f5;--theme-navigation-drawer:#ffffff;background-color:var(--theme-surface);color:var(--theme-text-primary)}.theme--light a{color:#1976d2}.theme--light .text--primary{color:var(--theme-text-primary)}.theme--light .text--secondary{color:var(--theme-text-secondary)}.theme--light .text--disabled{color:var(--theme-text-disabled)}.theme--dark{--theme-surface:#212121;--theme-icons-active:#ffffff;--theme-icons-inactive:rgba(255, 255, 255, 0.5);--theme-text-primary:#ffffff;--theme-text-secondary:rgba(255, 255, 255, 0.7);--theme-text-disabled:rgba(255, 255, 255, 0.5);--theme-text-link:#82b1ff;--theme-inputs-box:#ffffff;--theme-buttons-disabled:rgba(255, 255, 255, 0.3);--theme-tabs:rgba(255, 255, 255, 0.6);--theme-text-fields-filled:rgba(255, 255, 255, 0.08);--theme-text-fields-filled-hover:rgba(255, 255, 255, 0.16);--theme-text-fields-outlined:rgba(255, 255, 255, 0.24);--theme-text-fields-outlined-disabled:rgba(255, 255, 255, 0.16);--theme-text-fields-border:rgba(255, 255, 255, 0.7);--theme-controls-disabled:rgba(255, 255, 255, 0.3);--theme-controls-thumb-inactive:#bdbdbd;--theme-controls-thumb-disabled:#424242;--theme-controls-track-inactive:rgba(255, 255, 255, 0.3);--theme-controls-track-disabled:rgba(255, 255, 255, 0.1);--theme-tables-active:#505050;--theme-tables-hover:#616161;--theme-tables-group:#616161;--theme-dividers:rgba(255, 255, 255, 0.12);--theme-chips:#555555;--theme-cards:#1e1e1e;--theme-app-bar:#272727;--theme-navigation-drawer:#363636;background-color:var(--theme-surface);color:var(--theme-text-primary)}.theme--dark a{color:#82b1ff}.theme--dark .text--primary{color:var(--theme-text-primary)}.theme--dark .text--secondary{color:var(--theme-text-secondary)}.theme--dark .text--disabled{color:var(--theme-text-disabled)}:root{--theme-bp-xs:0;--theme-bp-sm:600px;--theme-bp-md:960px;--theme-bp-lg:1264px;--theme-bp-xl:1904px}html{box-sizing:border-box;-webkit-text-size-adjust:100%;word-break:normal;-moz-tab-size:4;tab-size:4}*,::before,::after{background-repeat:no-repeat;box-sizing:inherit}::before,::after{text-decoration:inherit;vertical-align:inherit}*{padding:0;margin:0}hr{overflow:visible;height:0}details,main{display:block}summary{display:list-item}small{font-size:80%}[hidden]{display:none}abbr[title]{border-bottom:none;text-decoration:underline;text-decoration:underline dotted}a{background-color:transparent}a:active,a:hover{outline-width:0}code,kbd,pre,samp{font-family:monospace, monospace}pre{font-size:1em}b,strong{font-weight:bolder}sub,sup{font-size:75%;line-height:0;position:relative;vertical-align:baseline}sub{bottom:-0.25em}sup{top:-0.5em}input{border-radius:0}[disabled]{cursor:default}[type=number]::-webkit-inner-spin-button,[type=number]::-webkit-outer-spin-button{height:auto}[type=search]{-webkit-appearance:textfield;outline-offset:-2px}[type=search]::-webkit-search-decoration{-webkit-appearance:none}textarea{overflow:auto;resize:vertical}button,input,optgroup,select,textarea{font:inherit}optgroup{font-weight:bold}button{overflow:visible}button,select{text-transform:none}button,[type=button],[type=reset],[type=submit],[role=button]{cursor:pointer;color:inherit}button::-moz-focus-inner,[type=button]::-moz-focus-inner,[type=reset]::-moz-focus-inner,[type=submit]::-moz-focus-inner{border-style:none;padding:0}button:-moz-focusring,[type=button]::-moz-focus-inner,[type=reset]::-moz-focus-inner,[type=submit]::-moz-focus-inner{outline:1px dotted ButtonText}button,html [type=button],[type=reset],[type=submit]{-webkit-appearance:button}button,input,select,textarea{background-color:transparent;border-style:none}select{-moz-appearance:none;-webkit-appearance:none}select::-ms-expand{display:none}select::-ms-value{color:currentColor}legend{border:0;color:inherit;display:table;max-width:100%;white-space:normal;max-width:100%}::-webkit-file-upload-button{-webkit-appearance:button;color:inherit;font:inherit}img{border-style:none}progress{vertical-align:baseline}svg:not([fill]){fill:currentColor}@media screen{[hidden~=screen]{display:inherit}[hidden~=screen]:not(:active):not(:focus):not(:target){position:absolute !important;clip:rect(0 0 0 0) !important}}[aria-busy=true]{cursor:progress}[aria-controls]{cursor:pointer}[aria-disabled=true]{cursor:default}.elevation-0{box-shadow:0 0 0 0 rgba(0, 0, 0, 0.2), 0 0 0 0 rgba(0, 0, 0, 0.14), 0 0 0 0 rgba(0, 0, 0, 0.12) !important}.elevation-1{box-shadow:0 2px 1px -1px rgba(0, 0, 0, 0.2), 0 1px 1px 0 rgba(0, 0, 0, 0.14), 0 1px 3px 0 rgba(0, 0, 0, 0.12) !important}.elevation-2{box-shadow:0 3px 1px -2px rgba(0, 0, 0, 0.2), 0 2px 2px 0 rgba(0, 0, 0, 0.14), 0 1px 5px 0 rgba(0, 0, 0, 0.12) !important}.elevation-3{box-shadow:0 3px 3px -2px rgba(0, 0, 0, 0.2), 0 3px 4px 0 rgba(0, 0, 0, 0.14), 0 1px 8px 0 rgba(0, 0, 0, 0.12) !important}.elevation-4{box-shadow:0 2px 4px -1px rgba(0, 0, 0, 0.2), 0 4px 5px 0 rgba(0, 0, 0, 0.14), 0 1px 10px 0 rgba(0, 0, 0, 0.12) !important}.elevation-5{box-shadow:0 3px 5px -1px rgba(0, 0, 0, 0.2), 0 5px 8px 0 rgba(0, 0, 0, 0.14), 0 1px 14px 0 rgba(0, 0, 0, 0.12) !important}.elevation-6{box-shadow:0 3px 5px -1px rgba(0, 0, 0, 0.2), 0 6px 10px 0 rgba(0, 0, 0, 0.14), 0 1px 18px 0 rgba(0, 0, 0, 0.12) !important}.elevation-7{box-shadow:0 4px 5px -2px rgba(0, 0, 0, 0.2), 0 7px 10px 1px rgba(0, 0, 0, 0.14), 0 2px 16px 1px rgba(0, 0, 0, 0.12) !important}.elevation-8{box-shadow:0 5px 5px -3px rgba(0, 0, 0, 0.2), 0 8px 10px 1px rgba(0, 0, 0, 0.14), 0 3px 14px 2px rgba(0, 0, 0, 0.12) !important}.elevation-9{box-shadow:0 5px 6px -3px rgba(0, 0, 0, 0.2), 0 9px 12px 1px rgba(0, 0, 0, 0.14), 0 3px 16px 2px rgba(0, 0, 0, 0.12) !important}.elevation-10{box-shadow:0 6px 6px -3px rgba(0, 0, 0, 0.2), 0 10px 14px 1px rgba(0, 0, 0, 0.14), 0 4px 18px 3px rgba(0, 0, 0, 0.12) !important}.elevation-11{box-shadow:0 6px 7px -4px rgba(0, 0, 0, 0.2), 0 11px 15px 1px rgba(0, 0, 0, 0.14), 0 4px 20px 3px rgba(0, 0, 0, 0.12) !important}.elevation-12{box-shadow:0 7px 8px -4px rgba(0, 0, 0, 0.2), 0 12px 17px 2px rgba(0, 0, 0, 0.14), 0 5px 22px 4px rgba(0, 0, 0, 0.12) !important}.elevation-13{box-shadow:0 7px 8px -4px rgba(0, 0, 0, 0.2), 0 13px 19px 2px rgba(0, 0, 0, 0.14), 0 5px 24px 4px rgba(0, 0, 0, 0.12) !important}.elevation-14{box-shadow:0 7px 9px -4px rgba(0, 0, 0, 0.2), 0 14px 21px 2px rgba(0, 0, 0, 0.14), 0 5px 26px 4px rgba(0, 0, 0, 0.12) !important}.elevation-15{box-shadow:0 8px 9px -5px rgba(0, 0, 0, 0.2), 0 15px 22px 2px rgba(0, 0, 0, 0.14), 0 6px 28px 5px rgba(0, 0, 0, 0.12) !important}.elevation-16{box-shadow:0 8px 10px -5px rgba(0, 0, 0, 0.2), 0 16px 24px 2px rgba(0, 0, 0, 0.14), 0 6px 30px 5px rgba(0, 0, 0, 0.12) !important}.elevation-17{box-shadow:0 8px 11px -5px rgba(0, 0, 0, 0.2), 0 17px 26px 2px rgba(0, 0, 0, 0.14), 0 6px 32px 5px rgba(0, 0, 0, 0.12) !important}.elevation-18{box-shadow:0 9px 11px -5px rgba(0, 0, 0, 0.2), 0 18px 28px 2px rgba(0, 0, 0, 0.14), 0 7px 34px 6px rgba(0, 0, 0, 0.12) !important}.elevation-19{box-shadow:0 9px 12px -6px rgba(0, 0, 0, 0.2), 0 19px 29px 2px rgba(0, 0, 0, 0.14), 0 7px 36px 6px rgba(0, 0, 0, 0.12) !important}.elevation-20{box-shadow:0 10px 13px -6px rgba(0, 0, 0, 0.2), 0 20px 31px 3px rgba(0, 0, 0, 0.14), 0 8px 38px 7px rgba(0, 0, 0, 0.12) !important}.elevation-21{box-shadow:0 10px 13px -6px rgba(0, 0, 0, 0.2), 0 21px 33px 3px rgba(0, 0, 0, 0.14), 0 8px 40px 7px rgba(0, 0, 0, 0.12) !important}.elevation-22{box-shadow:0 10px 14px -6px rgba(0, 0, 0, 0.2), 0 22px 35px 3px rgba(0, 0, 0, 0.14), 0 8px 42px 7px rgba(0, 0, 0, 0.12) !important}.elevation-23{box-shadow:0 11px 14px -7px rgba(0, 0, 0, 0.2), 0 23px 36px 3px rgba(0, 0, 0, 0.14), 0 9px 44px 8px rgba(0, 0, 0, 0.12) !important}.elevation-24{box-shadow:0 11px 15px -7px rgba(0, 0, 0, 0.2), 0 24px 38px 3px rgba(0, 0, 0, 0.14), 0 9px 46px 8px rgba(0, 0, 0, 0.12) !important}.red{background-color:#f44336 !important;border-color:#f44336 !important}.red-text{color:#f44336 !important;caret-color:#f44336 !important}.red.base{background-color:#f44336 !important;border-color:#f44336 !important}.red-text.text-base{color:#f44336 !important;caret-color:#f44336 !important}.red.lighten-5{background-color:#ffebee !important;border-color:#ffebee !important}.red-text.text-lighten-5{color:#ffebee !important;caret-color:#ffebee !important}.red.lighten-4{background-color:#ffcdd2 !important;border-color:#ffcdd2 !important}.red-text.text-lighten-4{color:#ffcdd2 !important;caret-color:#ffcdd2 !important}.red.lighten-3{background-color:#ef9a9a !important;border-color:#ef9a9a !important}.red-text.text-lighten-3{color:#ef9a9a !important;caret-color:#ef9a9a !important}.red.lighten-2{background-color:#e57373 !important;border-color:#e57373 !important}.red-text.text-lighten-2{color:#e57373 !important;caret-color:#e57373 !important}.red.lighten-1{background-color:#ef5350 !important;border-color:#ef5350 !important}.red-text.text-lighten-1{color:#ef5350 !important;caret-color:#ef5350 !important}.red.darken-1{background-color:#e53935 !important;border-color:#e53935 !important}.red-text.text-darken-1{color:#e53935 !important;caret-color:#e53935 !important}.red.darken-2{background-color:#d32f2f !important;border-color:#d32f2f !important}.red-text.text-darken-2{color:#d32f2f !important;caret-color:#d32f2f !important}.red.darken-3{background-color:#c62828 !important;border-color:#c62828 !important}.red-text.text-darken-3{color:#c62828 !important;caret-color:#c62828 !important}.red.darken-4{background-color:#b71c1c !important;border-color:#b71c1c !important}.red-text.text-darken-4{color:#b71c1c !important;caret-color:#b71c1c !important}.red.accent-1{background-color:#ff8a80 !important;border-color:#ff8a80 !important}.red-text.text-accent-1{color:#ff8a80 !important;caret-color:#ff8a80 !important}.red.accent-2{background-color:#ff5252 !important;border-color:#ff5252 !important}.red-text.text-accent-2{color:#ff5252 !important;caret-color:#ff5252 !important}.red.accent-3{background-color:#ff1744 !important;border-color:#ff1744 !important}.red-text.text-accent-3{color:#ff1744 !important;caret-color:#ff1744 !important}.red.accent-4{background-color:#d50000 !important;border-color:#d50000 !important}.red-text.text-accent-4{color:#d50000 !important;caret-color:#d50000 !important}.pink{background-color:#e91e63 !important;border-color:#e91e63 !important}.pink-text{color:#e91e63 !important;caret-color:#e91e63 !important}.pink.base{background-color:#e91e63 !important;border-color:#e91e63 !important}.pink-text.text-base{color:#e91e63 !important;caret-color:#e91e63 !important}.pink.lighten-5{background-color:#fce4ec !important;border-color:#fce4ec !important}.pink-text.text-lighten-5{color:#fce4ec !important;caret-color:#fce4ec !important}.pink.lighten-4{background-color:#f8bbd0 !important;border-color:#f8bbd0 !important}.pink-text.text-lighten-4{color:#f8bbd0 !important;caret-color:#f8bbd0 !important}.pink.lighten-3{background-color:#f48fb1 !important;border-color:#f48fb1 !important}.pink-text.text-lighten-3{color:#f48fb1 !important;caret-color:#f48fb1 !important}.pink.lighten-2{background-color:#f06292 !important;border-color:#f06292 !important}.pink-text.text-lighten-2{color:#f06292 !important;caret-color:#f06292 !important}.pink.lighten-1{background-color:#ec407a !important;border-color:#ec407a !important}.pink-text.text-lighten-1{color:#ec407a !important;caret-color:#ec407a !important}.pink.darken-1{background-color:#d81b60 !important;border-color:#d81b60 !important}.pink-text.text-darken-1{color:#d81b60 !important;caret-color:#d81b60 !important}.pink.darken-2{background-color:#c2185b !important;border-color:#c2185b !important}.pink-text.text-darken-2{color:#c2185b !important;caret-color:#c2185b !important}.pink.darken-3{background-color:#ad1457 !important;border-color:#ad1457 !important}.pink-text.text-darken-3{color:#ad1457 !important;caret-color:#ad1457 !important}.pink.darken-4{background-color:#880e4f !important;border-color:#880e4f !important}.pink-text.text-darken-4{color:#880e4f !important;caret-color:#880e4f !important}.pink.accent-1{background-color:#ff80ab !important;border-color:#ff80ab !important}.pink-text.text-accent-1{color:#ff80ab !important;caret-color:#ff80ab !important}.pink.accent-2{background-color:#ff4081 !important;border-color:#ff4081 !important}.pink-text.text-accent-2{color:#ff4081 !important;caret-color:#ff4081 !important}.pink.accent-3{background-color:#f50057 !important;border-color:#f50057 !important}.pink-text.text-accent-3{color:#f50057 !important;caret-color:#f50057 !important}.pink.accent-4{background-color:#c51162 !important;border-color:#c51162 !important}.pink-text.text-accent-4{color:#c51162 !important;caret-color:#c51162 !important}.purple{background-color:#9c27b0 !important;border-color:#9c27b0 !important}.purple-text{color:#9c27b0 !important;caret-color:#9c27b0 !important}.purple.base{background-color:#9c27b0 !important;border-color:#9c27b0 !important}.purple-text.text-base{color:#9c27b0 !important;caret-color:#9c27b0 !important}.purple.lighten-5{background-color:#f3e5f5 !important;border-color:#f3e5f5 !important}.purple-text.text-lighten-5{color:#f3e5f5 !important;caret-color:#f3e5f5 !important}.purple.lighten-4{background-color:#e1bee7 !important;border-color:#e1bee7 !important}.purple-text.text-lighten-4{color:#e1bee7 !important;caret-color:#e1bee7 !important}.purple.lighten-3{background-color:#ce93d8 !important;border-color:#ce93d8 !important}.purple-text.text-lighten-3{color:#ce93d8 !important;caret-color:#ce93d8 !important}.purple.lighten-2{background-color:#ba68c8 !important;border-color:#ba68c8 !important}.purple-text.text-lighten-2{color:#ba68c8 !important;caret-color:#ba68c8 !important}.purple.lighten-1{background-color:#ab47bc !important;border-color:#ab47bc !important}.purple-text.text-lighten-1{color:#ab47bc !important;caret-color:#ab47bc !important}.purple.darken-1{background-color:#8e24aa !important;border-color:#8e24aa !important}.purple-text.text-darken-1{color:#8e24aa !important;caret-color:#8e24aa !important}.purple.darken-2{background-color:#7b1fa2 !important;border-color:#7b1fa2 !important}.purple-text.text-darken-2{color:#7b1fa2 !important;caret-color:#7b1fa2 !important}.purple.darken-3{background-color:#6a1b9a !important;border-color:#6a1b9a !important}.purple-text.text-darken-3{color:#6a1b9a !important;caret-color:#6a1b9a !important}.purple.darken-4{background-color:#4a148c !important;border-color:#4a148c !important}.purple-text.text-darken-4{color:#4a148c !important;caret-color:#4a148c !important}.purple.accent-1{background-color:#ea80fc !important;border-color:#ea80fc !important}.purple-text.text-accent-1{color:#ea80fc !important;caret-color:#ea80fc !important}.purple.accent-2{background-color:#e040fb !important;border-color:#e040fb !important}.purple-text.text-accent-2{color:#e040fb !important;caret-color:#e040fb !important}.purple.accent-3{background-color:#d500f9 !important;border-color:#d500f9 !important}.purple-text.text-accent-3{color:#d500f9 !important;caret-color:#d500f9 !important}.purple.accent-4{background-color:#aa00ff !important;border-color:#aa00ff !important}.purple-text.text-accent-4{color:#aa00ff !important;caret-color:#aa00ff !important}.deep-purple{background-color:#673ab7 !important;border-color:#673ab7 !important}.deep-purple-text{color:#673ab7 !important;caret-color:#673ab7 !important}.deep-purple.base{background-color:#673ab7 !important;border-color:#673ab7 !important}.deep-purple-text.text-base{color:#673ab7 !important;caret-color:#673ab7 !important}.deep-purple.lighten-5{background-color:#ede7f6 !important;border-color:#ede7f6 !important}.deep-purple-text.text-lighten-5{color:#ede7f6 !important;caret-color:#ede7f6 !important}.deep-purple.lighten-4{background-color:#d1c4e9 !important;border-color:#d1c4e9 !important}.deep-purple-text.text-lighten-4{color:#d1c4e9 !important;caret-color:#d1c4e9 !important}.deep-purple.lighten-3{background-color:#b39ddb !important;border-color:#b39ddb !important}.deep-purple-text.text-lighten-3{color:#b39ddb !important;caret-color:#b39ddb !important}.deep-purple.lighten-2{background-color:#9575cd !important;border-color:#9575cd !important}.deep-purple-text.text-lighten-2{color:#9575cd !important;caret-color:#9575cd !important}.deep-purple.lighten-1{background-color:#7e57c2 !important;border-color:#7e57c2 !important}.deep-purple-text.text-lighten-1{color:#7e57c2 !important;caret-color:#7e57c2 !important}.deep-purple.darken-1{background-color:#5e35b1 !important;border-color:#5e35b1 !important}.deep-purple-text.text-darken-1{color:#5e35b1 !important;caret-color:#5e35b1 !important}.deep-purple.darken-2{background-color:#512da8 !important;border-color:#512da8 !important}.deep-purple-text.text-darken-2{color:#512da8 !important;caret-color:#512da8 !important}.deep-purple.darken-3{background-color:#4527a0 !important;border-color:#4527a0 !important}.deep-purple-text.text-darken-3{color:#4527a0 !important;caret-color:#4527a0 !important}.deep-purple.darken-4{background-color:#311b92 !important;border-color:#311b92 !important}.deep-purple-text.text-darken-4{color:#311b92 !important;caret-color:#311b92 !important}.deep-purple.accent-1{background-color:#b388ff !important;border-color:#b388ff !important}.deep-purple-text.text-accent-1{color:#b388ff !important;caret-color:#b388ff !important}.deep-purple.accent-2{background-color:#7c4dff !important;border-color:#7c4dff !important}.deep-purple-text.text-accent-2{color:#7c4dff !important;caret-color:#7c4dff !important}.deep-purple.accent-3{background-color:#651fff !important;border-color:#651fff !important}.deep-purple-text.text-accent-3{color:#651fff !important;caret-color:#651fff !important}.deep-purple.accent-4{background-color:#6200ea !important;border-color:#6200ea !important}.deep-purple-text.text-accent-4{color:#6200ea !important;caret-color:#6200ea !important}.indigo{background-color:#3f51b5 !important;border-color:#3f51b5 !important}.indigo-text{color:#3f51b5 !important;caret-color:#3f51b5 !important}.indigo.base{background-color:#3f51b5 !important;border-color:#3f51b5 !important}.indigo-text.text-base{color:#3f51b5 !important;caret-color:#3f51b5 !important}.indigo.lighten-5{background-color:#e8eaf6 !important;border-color:#e8eaf6 !important}.indigo-text.text-lighten-5{color:#e8eaf6 !important;caret-color:#e8eaf6 !important}.indigo.lighten-4{background-color:#c5cae9 !important;border-color:#c5cae9 !important}.indigo-text.text-lighten-4{color:#c5cae9 !important;caret-color:#c5cae9 !important}.indigo.lighten-3{background-color:#9fa8da !important;border-color:#9fa8da !important}.indigo-text.text-lighten-3{color:#9fa8da !important;caret-color:#9fa8da !important}.indigo.lighten-2{background-color:#7986cb !important;border-color:#7986cb !important}.indigo-text.text-lighten-2{color:#7986cb !important;caret-color:#7986cb !important}.indigo.lighten-1{background-color:#5c6bc0 !important;border-color:#5c6bc0 !important}.indigo-text.text-lighten-1{color:#5c6bc0 !important;caret-color:#5c6bc0 !important}.indigo.darken-1{background-color:#3949ab !important;border-color:#3949ab !important}.indigo-text.text-darken-1{color:#3949ab !important;caret-color:#3949ab !important}.indigo.darken-2{background-color:#303f9f !important;border-color:#303f9f !important}.indigo-text.text-darken-2{color:#303f9f !important;caret-color:#303f9f !important}.indigo.darken-3{background-color:#283593 !important;border-color:#283593 !important}.indigo-text.text-darken-3{color:#283593 !important;caret-color:#283593 !important}.indigo.darken-4{background-color:#1a237e !important;border-color:#1a237e !important}.indigo-text.text-darken-4{color:#1a237e !important;caret-color:#1a237e !important}.indigo.accent-1{background-color:#8c9eff !important;border-color:#8c9eff !important}.indigo-text.text-accent-1{color:#8c9eff !important;caret-color:#8c9eff !important}.indigo.accent-2{background-color:#536dfe !important;border-color:#536dfe !important}.indigo-text.text-accent-2{color:#536dfe !important;caret-color:#536dfe !important}.indigo.accent-3{background-color:#3d5afe !important;border-color:#3d5afe !important}.indigo-text.text-accent-3{color:#3d5afe !important;caret-color:#3d5afe !important}.indigo.accent-4{background-color:#304ffe !important;border-color:#304ffe !important}.indigo-text.text-accent-4{color:#304ffe !important;caret-color:#304ffe !important}.blue{background-color:#2196f3 !important;border-color:#2196f3 !important}.blue-text{color:#2196f3 !important;caret-color:#2196f3 !important}.blue.base{background-color:#2196f3 !important;border-color:#2196f3 !important}.blue-text.text-base{color:#2196f3 !important;caret-color:#2196f3 !important}.blue.lighten-5{background-color:#e3f2fd !important;border-color:#e3f2fd !important}.blue-text.text-lighten-5{color:#e3f2fd !important;caret-color:#e3f2fd !important}.blue.lighten-4{background-color:#bbdefb !important;border-color:#bbdefb !important}.blue-text.text-lighten-4{color:#bbdefb !important;caret-color:#bbdefb !important}.blue.lighten-3{background-color:#90caf9 !important;border-color:#90caf9 !important}.blue-text.text-lighten-3{color:#90caf9 !important;caret-color:#90caf9 !important}.blue.lighten-2{background-color:#64b5f6 !important;border-color:#64b5f6 !important}.blue-text.text-lighten-2{color:#64b5f6 !important;caret-color:#64b5f6 !important}.blue.lighten-1{background-color:#42a5f5 !important;border-color:#42a5f5 !important}.blue-text.text-lighten-1{color:#42a5f5 !important;caret-color:#42a5f5 !important}.blue.darken-1{background-color:#1e88e5 !important;border-color:#1e88e5 !important}.blue-text.text-darken-1{color:#1e88e5 !important;caret-color:#1e88e5 !important}.blue.darken-2{background-color:#1976d2 !important;border-color:#1976d2 !important}.blue-text.text-darken-2{color:#1976d2 !important;caret-color:#1976d2 !important}.blue.darken-3{background-color:#1565c0 !important;border-color:#1565c0 !important}.blue-text.text-darken-3{color:#1565c0 !important;caret-color:#1565c0 !important}.blue.darken-4{background-color:#0d47a1 !important;border-color:#0d47a1 !important}.blue-text.text-darken-4{color:#0d47a1 !important;caret-color:#0d47a1 !important}.blue.accent-1{background-color:#82b1ff !important;border-color:#82b1ff !important}.blue-text.text-accent-1{color:#82b1ff !important;caret-color:#82b1ff !important}.blue.accent-2{background-color:#448aff !important;border-color:#448aff !important}.blue-text.text-accent-2{color:#448aff !important;caret-color:#448aff !important}.blue.accent-3{background-color:#2979ff !important;border-color:#2979ff !important}.blue-text.text-accent-3{color:#2979ff !important;caret-color:#2979ff !important}.blue.accent-4{background-color:#2962ff !important;border-color:#2962ff !important}.blue-text.text-accent-4{color:#2962ff !important;caret-color:#2962ff !important}.light-blue{background-color:#03a9f4 !important;border-color:#03a9f4 !important}.light-blue-text{color:#03a9f4 !important;caret-color:#03a9f4 !important}.light-blue.base{background-color:#03a9f4 !important;border-color:#03a9f4 !important}.light-blue-text.text-base{color:#03a9f4 !important;caret-color:#03a9f4 !important}.light-blue.lighten-5{background-color:#e1f5fe !important;border-color:#e1f5fe !important}.light-blue-text.text-lighten-5{color:#e1f5fe !important;caret-color:#e1f5fe !important}.light-blue.lighten-4{background-color:#b3e5fc !important;border-color:#b3e5fc !important}.light-blue-text.text-lighten-4{color:#b3e5fc !important;caret-color:#b3e5fc !important}.light-blue.lighten-3{background-color:#81d4fa !important;border-color:#81d4fa !important}.light-blue-text.text-lighten-3{color:#81d4fa !important;caret-color:#81d4fa !important}.light-blue.lighten-2{background-color:#4fc3f7 !important;border-color:#4fc3f7 !important}.light-blue-text.text-lighten-2{color:#4fc3f7 !important;caret-color:#4fc3f7 !important}.light-blue.lighten-1{background-color:#29b6f6 !important;border-color:#29b6f6 !important}.light-blue-text.text-lighten-1{color:#29b6f6 !important;caret-color:#29b6f6 !important}.light-blue.darken-1{background-color:#039be5 !important;border-color:#039be5 !important}.light-blue-text.text-darken-1{color:#039be5 !important;caret-color:#039be5 !important}.light-blue.darken-2{background-color:#0288d1 !important;border-color:#0288d1 !important}.light-blue-text.text-darken-2{color:#0288d1 !important;caret-color:#0288d1 !important}.light-blue.darken-3{background-color:#0277bd !important;border-color:#0277bd !important}.light-blue-text.text-darken-3{color:#0277bd !important;caret-color:#0277bd !important}.light-blue.darken-4{background-color:#01579b !important;border-color:#01579b !important}.light-blue-text.text-darken-4{color:#01579b !important;caret-color:#01579b !important}.light-blue.accent-1{background-color:#80d8ff !important;border-color:#80d8ff !important}.light-blue-text.text-accent-1{color:#80d8ff !important;caret-color:#80d8ff !important}.light-blue.accent-2{background-color:#40c4ff !important;border-color:#40c4ff !important}.light-blue-text.text-accent-2{color:#40c4ff !important;caret-color:#40c4ff !important}.light-blue.accent-3{background-color:#00b0ff !important;border-color:#00b0ff !important}.light-blue-text.text-accent-3{color:#00b0ff !important;caret-color:#00b0ff !important}.light-blue.accent-4{background-color:#0091ea !important;border-color:#0091ea !important}.light-blue-text.text-accent-4{color:#0091ea !important;caret-color:#0091ea !important}.cyan{background-color:#00bcd4 !important;border-color:#00bcd4 !important}.cyan-text{color:#00bcd4 !important;caret-color:#00bcd4 !important}.cyan.base{background-color:#00bcd4 !important;border-color:#00bcd4 !important}.cyan-text.text-base{color:#00bcd4 !important;caret-color:#00bcd4 !important}.cyan.lighten-5{background-color:#e0f7fa !important;border-color:#e0f7fa !important}.cyan-text.text-lighten-5{color:#e0f7fa !important;caret-color:#e0f7fa !important}.cyan.lighten-4{background-color:#b2ebf2 !important;border-color:#b2ebf2 !important}.cyan-text.text-lighten-4{color:#b2ebf2 !important;caret-color:#b2ebf2 !important}.cyan.lighten-3{background-color:#80deea !important;border-color:#80deea !important}.cyan-text.text-lighten-3{color:#80deea !important;caret-color:#80deea !important}.cyan.lighten-2{background-color:#4dd0e1 !important;border-color:#4dd0e1 !important}.cyan-text.text-lighten-2{color:#4dd0e1 !important;caret-color:#4dd0e1 !important}.cyan.lighten-1{background-color:#26c6da !important;border-color:#26c6da !important}.cyan-text.text-lighten-1{color:#26c6da !important;caret-color:#26c6da !important}.cyan.darken-1{background-color:#00acc1 !important;border-color:#00acc1 !important}.cyan-text.text-darken-1{color:#00acc1 !important;caret-color:#00acc1 !important}.cyan.darken-2{background-color:#0097a7 !important;border-color:#0097a7 !important}.cyan-text.text-darken-2{color:#0097a7 !important;caret-color:#0097a7 !important}.cyan.darken-3{background-color:#00838f !important;border-color:#00838f !important}.cyan-text.text-darken-3{color:#00838f !important;caret-color:#00838f !important}.cyan.darken-4{background-color:#006064 !important;border-color:#006064 !important}.cyan-text.text-darken-4{color:#006064 !important;caret-color:#006064 !important}.cyan.accent-1{background-color:#84ffff !important;border-color:#84ffff !important}.cyan-text.text-accent-1{color:#84ffff !important;caret-color:#84ffff !important}.cyan.accent-2{background-color:#18ffff !important;border-color:#18ffff !important}.cyan-text.text-accent-2{color:#18ffff !important;caret-color:#18ffff !important}.cyan.accent-3{background-color:#00e5ff !important;border-color:#00e5ff !important}.cyan-text.text-accent-3{color:#00e5ff !important;caret-color:#00e5ff !important}.cyan.accent-4{background-color:#00b8d4 !important;border-color:#00b8d4 !important}.cyan-text.text-accent-4{color:#00b8d4 !important;caret-color:#00b8d4 !important}.teal{background-color:#009688 !important;border-color:#009688 !important}.teal-text{color:#009688 !important;caret-color:#009688 !important}.teal.base{background-color:#009688 !important;border-color:#009688 !important}.teal-text.text-base{color:#009688 !important;caret-color:#009688 !important}.teal.lighten-5{background-color:#e0f2f1 !important;border-color:#e0f2f1 !important}.teal-text.text-lighten-5{color:#e0f2f1 !important;caret-color:#e0f2f1 !important}.teal.lighten-4{background-color:#b2dfdb !important;border-color:#b2dfdb !important}.teal-text.text-lighten-4{color:#b2dfdb !important;caret-color:#b2dfdb !important}.teal.lighten-3{background-color:#80cbc4 !important;border-color:#80cbc4 !important}.teal-text.text-lighten-3{color:#80cbc4 !important;caret-color:#80cbc4 !important}.teal.lighten-2{background-color:#4db6ac !important;border-color:#4db6ac !important}.teal-text.text-lighten-2{color:#4db6ac !important;caret-color:#4db6ac !important}.teal.lighten-1{background-color:#26a69a !important;border-color:#26a69a !important}.teal-text.text-lighten-1{color:#26a69a !important;caret-color:#26a69a !important}.teal.darken-1{background-color:#00897b !important;border-color:#00897b !important}.teal-text.text-darken-1{color:#00897b !important;caret-color:#00897b !important}.teal.darken-2{background-color:#00796b !important;border-color:#00796b !important}.teal-text.text-darken-2{color:#00796b !important;caret-color:#00796b !important}.teal.darken-3{background-color:#00695c !important;border-color:#00695c !important}.teal-text.text-darken-3{color:#00695c !important;caret-color:#00695c !important}.teal.darken-4{background-color:#004d40 !important;border-color:#004d40 !important}.teal-text.text-darken-4{color:#004d40 !important;caret-color:#004d40 !important}.teal.accent-1{background-color:#a7ffeb !important;border-color:#a7ffeb !important}.teal-text.text-accent-1{color:#a7ffeb !important;caret-color:#a7ffeb !important}.teal.accent-2{background-color:#64ffda !important;border-color:#64ffda !important}.teal-text.text-accent-2{color:#64ffda !important;caret-color:#64ffda !important}.teal.accent-3{background-color:#1de9b6 !important;border-color:#1de9b6 !important}.teal-text.text-accent-3{color:#1de9b6 !important;caret-color:#1de9b6 !important}.teal.accent-4{background-color:#00bfa5 !important;border-color:#00bfa5 !important}.teal-text.text-accent-4{color:#00bfa5 !important;caret-color:#00bfa5 !important}.green{background-color:#4caf50 !important;border-color:#4caf50 !important}.green-text{color:#4caf50 !important;caret-color:#4caf50 !important}.green.base{background-color:#4caf50 !important;border-color:#4caf50 !important}.green-text.text-base{color:#4caf50 !important;caret-color:#4caf50 !important}.green.lighten-5{background-color:#e8f5e9 !important;border-color:#e8f5e9 !important}.green-text.text-lighten-5{color:#e8f5e9 !important;caret-color:#e8f5e9 !important}.green.lighten-4{background-color:#c8e6c9 !important;border-color:#c8e6c9 !important}.green-text.text-lighten-4{color:#c8e6c9 !important;caret-color:#c8e6c9 !important}.green.lighten-3{background-color:#a5d6a7 !important;border-color:#a5d6a7 !important}.green-text.text-lighten-3{color:#a5d6a7 !important;caret-color:#a5d6a7 !important}.green.lighten-2{background-color:#81c784 !important;border-color:#81c784 !important}.green-text.text-lighten-2{color:#81c784 !important;caret-color:#81c784 !important}.green.lighten-1{background-color:#66bb6a !important;border-color:#66bb6a !important}.green-text.text-lighten-1{color:#66bb6a !important;caret-color:#66bb6a !important}.green.darken-1{background-color:#43a047 !important;border-color:#43a047 !important}.green-text.text-darken-1{color:#43a047 !important;caret-color:#43a047 !important}.green.darken-2{background-color:#388e3c !important;border-color:#388e3c !important}.green-text.text-darken-2{color:#388e3c !important;caret-color:#388e3c !important}.green.darken-3{background-color:#2e7d32 !important;border-color:#2e7d32 !important}.green-text.text-darken-3{color:#2e7d32 !important;caret-color:#2e7d32 !important}.green.darken-4{background-color:#1b5e20 !important;border-color:#1b5e20 !important}.green-text.text-darken-4{color:#1b5e20 !important;caret-color:#1b5e20 !important}.green.accent-1{background-color:#b9f6ca !important;border-color:#b9f6ca !important}.green-text.text-accent-1{color:#b9f6ca !important;caret-color:#b9f6ca !important}.green.accent-2{background-color:#69f0ae !important;border-color:#69f0ae !important}.green-text.text-accent-2{color:#69f0ae !important;caret-color:#69f0ae !important}.green.accent-3{background-color:#00e676 !important;border-color:#00e676 !important}.green-text.text-accent-3{color:#00e676 !important;caret-color:#00e676 !important}.green.accent-4{background-color:#00c853 !important;border-color:#00c853 !important}.green-text.text-accent-4{color:#00c853 !important;caret-color:#00c853 !important}.light-green{background-color:#8bc34a !important;border-color:#8bc34a !important}.light-green-text{color:#8bc34a !important;caret-color:#8bc34a !important}.light-green.base{background-color:#8bc34a !important;border-color:#8bc34a !important}.light-green-text.text-base{color:#8bc34a !important;caret-color:#8bc34a !important}.light-green.lighten-5{background-color:#f1f8e9 !important;border-color:#f1f8e9 !important}.light-green-text.text-lighten-5{color:#f1f8e9 !important;caret-color:#f1f8e9 !important}.light-green.lighten-4{background-color:#dcedc8 !important;border-color:#dcedc8 !important}.light-green-text.text-lighten-4{color:#dcedc8 !important;caret-color:#dcedc8 !important}.light-green.lighten-3{background-color:#c5e1a5 !important;border-color:#c5e1a5 !important}.light-green-text.text-lighten-3{color:#c5e1a5 !important;caret-color:#c5e1a5 !important}.light-green.lighten-2{background-color:#aed581 !important;border-color:#aed581 !important}.light-green-text.text-lighten-2{color:#aed581 !important;caret-color:#aed581 !important}.light-green.lighten-1{background-color:#9ccc65 !important;border-color:#9ccc65 !important}.light-green-text.text-lighten-1{color:#9ccc65 !important;caret-color:#9ccc65 !important}.light-green.darken-1{background-color:#7cb342 !important;border-color:#7cb342 !important}.light-green-text.text-darken-1{color:#7cb342 !important;caret-color:#7cb342 !important}.light-green.darken-2{background-color:#689f38 !important;border-color:#689f38 !important}.light-green-text.text-darken-2{color:#689f38 !important;caret-color:#689f38 !important}.light-green.darken-3{background-color:#558b2f !important;border-color:#558b2f !important}.light-green-text.text-darken-3{color:#558b2f !important;caret-color:#558b2f !important}.light-green.darken-4{background-color:#33691e !important;border-color:#33691e !important}.light-green-text.text-darken-4{color:#33691e !important;caret-color:#33691e !important}.light-green.accent-1{background-color:#ccff90 !important;border-color:#ccff90 !important}.light-green-text.text-accent-1{color:#ccff90 !important;caret-color:#ccff90 !important}.light-green.accent-2{background-color:#b2ff59 !important;border-color:#b2ff59 !important}.light-green-text.text-accent-2{color:#b2ff59 !important;caret-color:#b2ff59 !important}.light-green.accent-3{background-color:#76ff03 !important;border-color:#76ff03 !important}.light-green-text.text-accent-3{color:#76ff03 !important;caret-color:#76ff03 !important}.light-green.accent-4{background-color:#64dd17 !important;border-color:#64dd17 !important}.light-green-text.text-accent-4{color:#64dd17 !important;caret-color:#64dd17 !important}.lime{background-color:#cddc39 !important;border-color:#cddc39 !important}.lime-text{color:#cddc39 !important;caret-color:#cddc39 !important}.lime.base{background-color:#cddc39 !important;border-color:#cddc39 !important}.lime-text.text-base{color:#cddc39 !important;caret-color:#cddc39 !important}.lime.lighten-5{background-color:#f9fbe7 !important;border-color:#f9fbe7 !important}.lime-text.text-lighten-5{color:#f9fbe7 !important;caret-color:#f9fbe7 !important}.lime.lighten-4{background-color:#f0f4c3 !important;border-color:#f0f4c3 !important}.lime-text.text-lighten-4{color:#f0f4c3 !important;caret-color:#f0f4c3 !important}.lime.lighten-3{background-color:#e6ee9c !important;border-color:#e6ee9c !important}.lime-text.text-lighten-3{color:#e6ee9c !important;caret-color:#e6ee9c !important}.lime.lighten-2{background-color:#dce775 !important;border-color:#dce775 !important}.lime-text.text-lighten-2{color:#dce775 !important;caret-color:#dce775 !important}.lime.lighten-1{background-color:#d4e157 !important;border-color:#d4e157 !important}.lime-text.text-lighten-1{color:#d4e157 !important;caret-color:#d4e157 !important}.lime.darken-1{background-color:#c0ca33 !important;border-color:#c0ca33 !important}.lime-text.text-darken-1{color:#c0ca33 !important;caret-color:#c0ca33 !important}.lime.darken-2{background-color:#afb42b !important;border-color:#afb42b !important}.lime-text.text-darken-2{color:#afb42b !important;caret-color:#afb42b !important}.lime.darken-3{background-color:#9e9d24 !important;border-color:#9e9d24 !important}.lime-text.text-darken-3{color:#9e9d24 !important;caret-color:#9e9d24 !important}.lime.darken-4{background-color:#827717 !important;border-color:#827717 !important}.lime-text.text-darken-4{color:#827717 !important;caret-color:#827717 !important}.lime.accent-1{background-color:#f4ff81 !important;border-color:#f4ff81 !important}.lime-text.text-accent-1{color:#f4ff81 !important;caret-color:#f4ff81 !important}.lime.accent-2{background-color:#eeff41 !important;border-color:#eeff41 !important}.lime-text.text-accent-2{color:#eeff41 !important;caret-color:#eeff41 !important}.lime.accent-3{background-color:#c6ff00 !important;border-color:#c6ff00 !important}.lime-text.text-accent-3{color:#c6ff00 !important;caret-color:#c6ff00 !important}.lime.accent-4{background-color:#aeea00 !important;border-color:#aeea00 !important}.lime-text.text-accent-4{color:#aeea00 !important;caret-color:#aeea00 !important}.yellow{background-color:#ffeb3b !important;border-color:#ffeb3b !important}.yellow-text{color:#ffeb3b !important;caret-color:#ffeb3b !important}.yellow.base{background-color:#ffeb3b !important;border-color:#ffeb3b !important}.yellow-text.text-base{color:#ffeb3b !important;caret-color:#ffeb3b !important}.yellow.lighten-5{background-color:#fffde7 !important;border-color:#fffde7 !important}.yellow-text.text-lighten-5{color:#fffde7 !important;caret-color:#fffde7 !important}.yellow.lighten-4{background-color:#fff9c4 !important;border-color:#fff9c4 !important}.yellow-text.text-lighten-4{color:#fff9c4 !important;caret-color:#fff9c4 !important}.yellow.lighten-3{background-color:#fff59d !important;border-color:#fff59d !important}.yellow-text.text-lighten-3{color:#fff59d !important;caret-color:#fff59d !important}.yellow.lighten-2{background-color:#fff176 !important;border-color:#fff176 !important}.yellow-text.text-lighten-2{color:#fff176 !important;caret-color:#fff176 !important}.yellow.lighten-1{background-color:#ffee58 !important;border-color:#ffee58 !important}.yellow-text.text-lighten-1{color:#ffee58 !important;caret-color:#ffee58 !important}.yellow.darken-1{background-color:#fdd835 !important;border-color:#fdd835 !important}.yellow-text.text-darken-1{color:#fdd835 !important;caret-color:#fdd835 !important}.yellow.darken-2{background-color:#fbc02d !important;border-color:#fbc02d !important}.yellow-text.text-darken-2{color:#fbc02d !important;caret-color:#fbc02d !important}.yellow.darken-3{background-color:#f9a825 !important;border-color:#f9a825 !important}.yellow-text.text-darken-3{color:#f9a825 !important;caret-color:#f9a825 !important}.yellow.darken-4{background-color:#f57f17 !important;border-color:#f57f17 !important}.yellow-text.text-darken-4{color:#f57f17 !important;caret-color:#f57f17 !important}.yellow.accent-1{background-color:#ffff8d !important;border-color:#ffff8d !important}.yellow-text.text-accent-1{color:#ffff8d !important;caret-color:#ffff8d !important}.yellow.accent-2{background-color:#ffff00 !important;border-color:#ffff00 !important}.yellow-text.text-accent-2{color:#ffff00 !important;caret-color:#ffff00 !important}.yellow.accent-3{background-color:#ffea00 !important;border-color:#ffea00 !important}.yellow-text.text-accent-3{color:#ffea00 !important;caret-color:#ffea00 !important}.yellow.accent-4{background-color:#ffd600 !important;border-color:#ffd600 !important}.yellow-text.text-accent-4{color:#ffd600 !important;caret-color:#ffd600 !important}.amber{background-color:#ffc107 !important;border-color:#ffc107 !important}.amber-text{color:#ffc107 !important;caret-color:#ffc107 !important}.amber.base{background-color:#ffc107 !important;border-color:#ffc107 !important}.amber-text.text-base{color:#ffc107 !important;caret-color:#ffc107 !important}.amber.lighten-5{background-color:#fff8e1 !important;border-color:#fff8e1 !important}.amber-text.text-lighten-5{color:#fff8e1 !important;caret-color:#fff8e1 !important}.amber.lighten-4{background-color:#ffecb3 !important;border-color:#ffecb3 !important}.amber-text.text-lighten-4{color:#ffecb3 !important;caret-color:#ffecb3 !important}.amber.lighten-3{background-color:#ffe082 !important;border-color:#ffe082 !important}.amber-text.text-lighten-3{color:#ffe082 !important;caret-color:#ffe082 !important}.amber.lighten-2{background-color:#ffd54f !important;border-color:#ffd54f !important}.amber-text.text-lighten-2{color:#ffd54f !important;caret-color:#ffd54f !important}.amber.lighten-1{background-color:#ffca28 !important;border-color:#ffca28 !important}.amber-text.text-lighten-1{color:#ffca28 !important;caret-color:#ffca28 !important}.amber.darken-1{background-color:#ffb300 !important;border-color:#ffb300 !important}.amber-text.text-darken-1{color:#ffb300 !important;caret-color:#ffb300 !important}.amber.darken-2{background-color:#ffa000 !important;border-color:#ffa000 !important}.amber-text.text-darken-2{color:#ffa000 !important;caret-color:#ffa000 !important}.amber.darken-3{background-color:#ff8f00 !important;border-color:#ff8f00 !important}.amber-text.text-darken-3{color:#ff8f00 !important;caret-color:#ff8f00 !important}.amber.darken-4{background-color:#ff6f00 !important;border-color:#ff6f00 !important}.amber-text.text-darken-4{color:#ff6f00 !important;caret-color:#ff6f00 !important}.amber.accent-1{background-color:#ffe57f !important;border-color:#ffe57f !important}.amber-text.text-accent-1{color:#ffe57f !important;caret-color:#ffe57f !important}.amber.accent-2{background-color:#ffd740 !important;border-color:#ffd740 !important}.amber-text.text-accent-2{color:#ffd740 !important;caret-color:#ffd740 !important}.amber.accent-3{background-color:#ffc400 !important;border-color:#ffc400 !important}.amber-text.text-accent-3{color:#ffc400 !important;caret-color:#ffc400 !important}.amber.accent-4{background-color:#ffab00 !important;border-color:#ffab00 !important}.amber-text.text-accent-4{color:#ffab00 !important;caret-color:#ffab00 !important}.orange{background-color:#ff9800 !important;border-color:#ff9800 !important}.orange-text{color:#ff9800 !important;caret-color:#ff9800 !important}.orange.base{background-color:#ff9800 !important;border-color:#ff9800 !important}.orange-text.text-base{color:#ff9800 !important;caret-color:#ff9800 !important}.orange.lighten-5{background-color:#fff3e0 !important;border-color:#fff3e0 !important}.orange-text.text-lighten-5{color:#fff3e0 !important;caret-color:#fff3e0 !important}.orange.lighten-4{background-color:#ffe0b2 !important;border-color:#ffe0b2 !important}.orange-text.text-lighten-4{color:#ffe0b2 !important;caret-color:#ffe0b2 !important}.orange.lighten-3{background-color:#ffcc80 !important;border-color:#ffcc80 !important}.orange-text.text-lighten-3{color:#ffcc80 !important;caret-color:#ffcc80 !important}.orange.lighten-2{background-color:#ffb74d !important;border-color:#ffb74d !important}.orange-text.text-lighten-2{color:#ffb74d !important;caret-color:#ffb74d !important}.orange.lighten-1{background-color:#ffa726 !important;border-color:#ffa726 !important}.orange-text.text-lighten-1{color:#ffa726 !important;caret-color:#ffa726 !important}.orange.darken-1{background-color:#fb8c00 !important;border-color:#fb8c00 !important}.orange-text.text-darken-1{color:#fb8c00 !important;caret-color:#fb8c00 !important}.orange.darken-2{background-color:#f57c00 !important;border-color:#f57c00 !important}.orange-text.text-darken-2{color:#f57c00 !important;caret-color:#f57c00 !important}.orange.darken-3{background-color:#ef6c00 !important;border-color:#ef6c00 !important}.orange-text.text-darken-3{color:#ef6c00 !important;caret-color:#ef6c00 !important}.orange.darken-4{background-color:#e65100 !important;border-color:#e65100 !important}.orange-text.text-darken-4{color:#e65100 !important;caret-color:#e65100 !important}.orange.accent-1{background-color:#ffd180 !important;border-color:#ffd180 !important}.orange-text.text-accent-1{color:#ffd180 !important;caret-color:#ffd180 !important}.orange.accent-2{background-color:#ffab40 !important;border-color:#ffab40 !important}.orange-text.text-accent-2{color:#ffab40 !important;caret-color:#ffab40 !important}.orange.accent-3{background-color:#ff9100 !important;border-color:#ff9100 !important}.orange-text.text-accent-3{color:#ff9100 !important;caret-color:#ff9100 !important}.orange.accent-4{background-color:#ff6d00 !important;border-color:#ff6d00 !important}.orange-text.text-accent-4{color:#ff6d00 !important;caret-color:#ff6d00 !important}.deep-orange{background-color:#ff5722 !important;border-color:#ff5722 !important}.deep-orange-text{color:#ff5722 !important;caret-color:#ff5722 !important}.deep-orange.base{background-color:#ff5722 !important;border-color:#ff5722 !important}.deep-orange-text.text-base{color:#ff5722 !important;caret-color:#ff5722 !important}.deep-orange.lighten-5{background-color:#fbe9e7 !important;border-color:#fbe9e7 !important}.deep-orange-text.text-lighten-5{color:#fbe9e7 !important;caret-color:#fbe9e7 !important}.deep-orange.lighten-4{background-color:#ffccbc !important;border-color:#ffccbc !important}.deep-orange-text.text-lighten-4{color:#ffccbc !important;caret-color:#ffccbc !important}.deep-orange.lighten-3{background-color:#ffab91 !important;border-color:#ffab91 !important}.deep-orange-text.text-lighten-3{color:#ffab91 !important;caret-color:#ffab91 !important}.deep-orange.lighten-2{background-color:#ff8a65 !important;border-color:#ff8a65 !important}.deep-orange-text.text-lighten-2{color:#ff8a65 !important;caret-color:#ff8a65 !important}.deep-orange.lighten-1{background-color:#ff7043 !important;border-color:#ff7043 !important}.deep-orange-text.text-lighten-1{color:#ff7043 !important;caret-color:#ff7043 !important}.deep-orange.darken-1{background-color:#f4511e !important;border-color:#f4511e !important}.deep-orange-text.text-darken-1{color:#f4511e !important;caret-color:#f4511e !important}.deep-orange.darken-2{background-color:#e64a19 !important;border-color:#e64a19 !important}.deep-orange-text.text-darken-2{color:#e64a19 !important;caret-color:#e64a19 !important}.deep-orange.darken-3{background-color:#d84315 !important;border-color:#d84315 !important}.deep-orange-text.text-darken-3{color:#d84315 !important;caret-color:#d84315 !important}.deep-orange.darken-4{background-color:#bf360c !important;border-color:#bf360c !important}.deep-orange-text.text-darken-4{color:#bf360c !important;caret-color:#bf360c !important}.deep-orange.accent-1{background-color:#ff9e80 !important;border-color:#ff9e80 !important}.deep-orange-text.text-accent-1{color:#ff9e80 !important;caret-color:#ff9e80 !important}.deep-orange.accent-2{background-color:#ff6e40 !important;border-color:#ff6e40 !important}.deep-orange-text.text-accent-2{color:#ff6e40 !important;caret-color:#ff6e40 !important}.deep-orange.accent-3{background-color:#ff3d00 !important;border-color:#ff3d00 !important}.deep-orange-text.text-accent-3{color:#ff3d00 !important;caret-color:#ff3d00 !important}.deep-orange.accent-4{background-color:#dd2c00 !important;border-color:#dd2c00 !important}.deep-orange-text.text-accent-4{color:#dd2c00 !important;caret-color:#dd2c00 !important}.brown{background-color:#795548 !important;border-color:#795548 !important}.brown-text{color:#795548 !important;caret-color:#795548 !important}.brown.base{background-color:#795548 !important;border-color:#795548 !important}.brown-text.text-base{color:#795548 !important;caret-color:#795548 !important}.brown.lighten-5{background-color:#efebe9 !important;border-color:#efebe9 !important}.brown-text.text-lighten-5{color:#efebe9 !important;caret-color:#efebe9 !important}.brown.lighten-4{background-color:#d7ccc8 !important;border-color:#d7ccc8 !important}.brown-text.text-lighten-4{color:#d7ccc8 !important;caret-color:#d7ccc8 !important}.brown.lighten-3{background-color:#bcaaa4 !important;border-color:#bcaaa4 !important}.brown-text.text-lighten-3{color:#bcaaa4 !important;caret-color:#bcaaa4 !important}.brown.lighten-2{background-color:#a1887f !important;border-color:#a1887f !important}.brown-text.text-lighten-2{color:#a1887f !important;caret-color:#a1887f !important}.brown.lighten-1{background-color:#8d6e63 !important;border-color:#8d6e63 !important}.brown-text.text-lighten-1{color:#8d6e63 !important;caret-color:#8d6e63 !important}.brown.darken-1{background-color:#6d4c41 !important;border-color:#6d4c41 !important}.brown-text.text-darken-1{color:#6d4c41 !important;caret-color:#6d4c41 !important}.brown.darken-2{background-color:#5d4037 !important;border-color:#5d4037 !important}.brown-text.text-darken-2{color:#5d4037 !important;caret-color:#5d4037 !important}.brown.darken-3{background-color:#4e342e !important;border-color:#4e342e !important}.brown-text.text-darken-3{color:#4e342e !important;caret-color:#4e342e !important}.brown.darken-4{background-color:#3e2723 !important;border-color:#3e2723 !important}.brown-text.text-darken-4{color:#3e2723 !important;caret-color:#3e2723 !important}.blue-grey{background-color:#607d8b !important;border-color:#607d8b !important}.blue-grey-text{color:#607d8b !important;caret-color:#607d8b !important}.blue-grey.base{background-color:#607d8b !important;border-color:#607d8b !important}.blue-grey-text.text-base{color:#607d8b !important;caret-color:#607d8b !important}.blue-grey.lighten-5{background-color:#eceff1 !important;border-color:#eceff1 !important}.blue-grey-text.text-lighten-5{color:#eceff1 !important;caret-color:#eceff1 !important}.blue-grey.lighten-4{background-color:#cfd8dc !important;border-color:#cfd8dc !important}.blue-grey-text.text-lighten-4{color:#cfd8dc !important;caret-color:#cfd8dc !important}.blue-grey.lighten-3{background-color:#b0bec5 !important;border-color:#b0bec5 !important}.blue-grey-text.text-lighten-3{color:#b0bec5 !important;caret-color:#b0bec5 !important}.blue-grey.lighten-2{background-color:#90a4ae !important;border-color:#90a4ae !important}.blue-grey-text.text-lighten-2{color:#90a4ae !important;caret-color:#90a4ae !important}.blue-grey.lighten-1{background-color:#78909c !important;border-color:#78909c !important}.blue-grey-text.text-lighten-1{color:#78909c !important;caret-color:#78909c !important}.blue-grey.darken-1{background-color:#546e7a !important;border-color:#546e7a !important}.blue-grey-text.text-darken-1{color:#546e7a !important;caret-color:#546e7a !important}.blue-grey.darken-2{background-color:#455a64 !important;border-color:#455a64 !important}.blue-grey-text.text-darken-2{color:#455a64 !important;caret-color:#455a64 !important}.blue-grey.darken-3{background-color:#37474f !important;border-color:#37474f !important}.blue-grey-text.text-darken-3{color:#37474f !important;caret-color:#37474f !important}.blue-grey.darken-4{background-color:#263238 !important;border-color:#263238 !important}.blue-grey-text.text-darken-4{color:#263238 !important;caret-color:#263238 !important}.grey{background-color:#9e9e9e !important;border-color:#9e9e9e !important}.grey-text{color:#9e9e9e !important;caret-color:#9e9e9e !important}.grey.base{background-color:#9e9e9e !important;border-color:#9e9e9e !important}.grey-text.text-base{color:#9e9e9e !important;caret-color:#9e9e9e !important}.grey.lighten-5{background-color:#fafafa !important;border-color:#fafafa !important}.grey-text.text-lighten-5{color:#fafafa !important;caret-color:#fafafa !important}.grey.lighten-4{background-color:#f5f5f5 !important;border-color:#f5f5f5 !important}.grey-text.text-lighten-4{color:#f5f5f5 !important;caret-color:#f5f5f5 !important}.grey.lighten-3{background-color:#eeeeee !important;border-color:#eeeeee !important}.grey-text.text-lighten-3{color:#eeeeee !important;caret-color:#eeeeee !important}.grey.lighten-2{background-color:#e0e0e0 !important;border-color:#e0e0e0 !important}.grey-text.text-lighten-2{color:#e0e0e0 !important;caret-color:#e0e0e0 !important}.grey.lighten-1{background-color:#bdbdbd !important;border-color:#bdbdbd !important}.grey-text.text-lighten-1{color:#bdbdbd !important;caret-color:#bdbdbd !important}.grey.darken-1{background-color:#757575 !important;border-color:#757575 !important}.grey-text.text-darken-1{color:#757575 !important;caret-color:#757575 !important}.grey.darken-2{background-color:#616161 !important;border-color:#616161 !important}.grey-text.text-darken-2{color:#616161 !important;caret-color:#616161 !important}.grey.darken-3{background-color:#424242 !important;border-color:#424242 !important}.grey-text.text-darken-3{color:#424242 !important;caret-color:#424242 !important}.grey.darken-4{background-color:#212121 !important;border-color:#212121 !important}.grey-text.text-darken-4{color:#212121 !important;caret-color:#212121 !important}.black{background-color:#000000 !important;border-color:#000000 !important}.black-text{color:#000000 !important;caret-color:#000000 !important}.white{background-color:#ffffff !important;border-color:#ffffff !important}.white-text{color:#ffffff !important;caret-color:#ffffff !important}.transparent{background-color:transparent !important;border-color:transparent !important}.transparent-text{color:transparent !important;caret-color:transparent !important}.primary-color{background-color:#2ec73d !important;border-color:#2ec73d !important}.primary-text{color:#2ec73d !important;caret-color:#2ec73d !important}.secondary-color{background-color:#607d8b !important;border-color:#607d8b !important}.secondary-text{color:#607d8b !important;caret-color:#607d8b !important}.success-color{background-color:#009d4b !important;border-color:#009d4b !important}.success-text{color:#009d4b !important;caret-color:#009d4b !important}.info-color{background-color:#acd164 !important;border-color:#acd164 !important}.info-text{color:#acd164 !important;caret-color:#acd164 !important}.warning-color{background-color:#ffa336 !important;border-color:#ffa336 !important}.warning-text{color:#ffa336 !important;caret-color:#ffa336 !important}.error-color{background-color:#e64325 !important;border-color:#e64325 !important}.error-text{color:#e64325 !important;caret-color:#e64325 !important}.text-left{text-align:left}@media only screen and (min-width: 600px){.text-sm-left{text-align:left}}@media only screen and (min-width: 960px){.text-md-left{text-align:left}}@media only screen and (min-width: 1264px){.text-lg-left{text-align:left}}@media only screen and (min-width: 1904px){.text-xl-left{text-align:left}}.text-center{text-align:center}@media only screen and (min-width: 600px){.text-sm-center{text-align:center}}@media only screen and (min-width: 960px){.text-md-center{text-align:center}}@media only screen and (min-width: 1264px){.text-lg-center{text-align:center}}@media only screen and (min-width: 1904px){.text-xl-center{text-align:center}}.text-right{text-align:right}@media only screen and (min-width: 600px){.text-sm-right{text-align:right}}@media only screen and (min-width: 960px){.text-md-right{text-align:right}}@media only screen and (min-width: 1264px){.text-lg-right{text-align:right}}@media only screen and (min-width: 1904px){.text-xl-right{text-align:right}}.text-decoration-none{text-decoration:none}.text-decoration-overline{text-decoration:overline}.text-decoration-underline{text-decoration:underline}.text-decoration-line-through{text-decoration:line-through}.text-lowercase{text-transform:lowercase}.text-uppercase{text-transform:uppercase}.text-capitalize{text-transform:capitalize}.font-weight-thin{font-weight:100}.font-weight-light{font-weight:300}.font-weight-regular{font-weight:400}.font-weight-medium{font-weight:500}.font-weight-bold{font-weight:700}.font-weight-black{font-weight:900}.font-italic{font-style:italic}.rounded-0{border-radius:0}.rounded-tl-0{border-top-left-radius:0}.rounded-tr-0{border-top-right-radius:0}.rounded-bl-0{border-bottom-left-radius:0}.rounded-br-0{border-bottom-right-radius:0}.rounded-t-0{border-top-left-radius:0;border-top-right-radius:0}.rounded-b-0{border-bottom-left-radius:0;border-bottom-right-radius:0}.rounded-l-0{border-top-left-radius:0;border-bottom-left-radius:0}.rounded-r-0{border-top-right-radius:0;border-bottom-right-radius:0}.rounded-sm{border-radius:2px}.rounded-tl-sm{border-top-left-radius:2px}.rounded-tr-sm{border-top-right-radius:2px}.rounded-bl-sm{border-bottom-left-radius:2px}.rounded-br-sm{border-bottom-right-radius:2px}.rounded-t-sm{border-top-left-radius:2px;border-top-right-radius:2px}.rounded-b-sm{border-bottom-left-radius:2px;border-bottom-right-radius:2px}.rounded-l-sm{border-top-left-radius:2px;border-bottom-left-radius:2px}.rounded-r-sm{border-top-right-radius:2px;border-bottom-right-radius:2px}.rounded{border-radius:4px}.rounded-tl{border-top-left-radius:4px}.rounded-tr{border-top-right-radius:4px}.rounded-bl{border-bottom-left-radius:4px}.rounded-br{border-bottom-right-radius:4px}.rounded-t{border-top-left-radius:4px;border-top-right-radius:4px}.rounded-b{border-bottom-left-radius:4px;border-bottom-right-radius:4px}.rounded-l{border-top-left-radius:4px;border-bottom-left-radius:4px}.rounded-r{border-top-right-radius:4px;border-bottom-right-radius:4px}.rounded-lg{border-radius:8px}.rounded-tl-lg{border-top-left-radius:8px}.rounded-tr-lg{border-top-right-radius:8px}.rounded-bl-lg{border-bottom-left-radius:8px}.rounded-br-lg{border-bottom-right-radius:8px}.rounded-t-lg{border-top-left-radius:8px;border-top-right-radius:8px}.rounded-b-lg{border-bottom-left-radius:8px;border-bottom-right-radius:8px}.rounded-l-lg{border-top-left-radius:8px;border-bottom-left-radius:8px}.rounded-r-lg{border-top-right-radius:8px;border-bottom-right-radius:8px}.rounded-xl{border-radius:24px}.rounded-tl-xl{border-top-left-radius:24px}.rounded-tr-xl{border-top-right-radius:24px}.rounded-bl-xl{border-bottom-left-radius:24px}.rounded-br-xl{border-bottom-right-radius:24px}.rounded-t-xl{border-top-left-radius:24px;border-top-right-radius:24px}.rounded-b-xl{border-bottom-left-radius:24px;border-bottom-right-radius:24px}.rounded-l-xl{border-top-left-radius:24px;border-bottom-left-radius:24px}.rounded-r-xl{border-top-right-radius:24px;border-bottom-right-radius:24px}.rounded-pill{border-radius:9999px}.rounded-tl-pill{border-top-left-radius:9999px}.rounded-tr-pill{border-top-right-radius:9999px}.rounded-bl-pill{border-bottom-left-radius:9999px}.rounded-br-pill{border-bottom-right-radius:9999px}.rounded-t-pill{border-top-left-radius:9999px;border-top-right-radius:9999px}.rounded-b-pill{border-bottom-left-radius:9999px;border-bottom-right-radius:9999px}.rounded-l-pill{border-top-left-radius:9999px;border-bottom-left-radius:9999px}.rounded-r-pill{border-top-right-radius:9999px;border-bottom-right-radius:9999px}.rounded-circle{border-radius:50%}.rounded-tl-circle{border-top-left-radius:50%}.rounded-tr-circle{border-top-right-radius:50%}.rounded-bl-circle{border-bottom-left-radius:50%}.rounded-br-circle{border-bottom-right-radius:50%}.rounded-t-circle{border-top-left-radius:50%;border-top-right-radius:50%}.rounded-b-circle{border-bottom-left-radius:50%;border-bottom-right-radius:50%}.rounded-l-circle{border-top-left-radius:50%;border-bottom-left-radius:50%}.rounded-r-circle{border-top-right-radius:50%;border-bottom-right-radius:50%}.ma-0{margin:0px !important}.ma-n0{margin:0px !important}@media only screen and (min-width: 600px){.ma-sm-0{margin:0px !important}.ma-sm-n0{margin:0px !important}}@media only screen and (min-width: 960px){.ma-md-0{margin:0px !important}.ma-md-n0{margin:0px !important}}@media only screen and (min-width: 1264px){.ma-lg-0{margin:0px !important}.ma-lg-n0{margin:0px !important}}@media only screen and (min-width: 1904px){.ma-xl-0{margin:0px !important}.ma-xl-n0{margin:0px !important}}.ml-0{margin-left:0px !important}.ml-n0{margin-left:0px !important}@media only screen and (min-width: 600px){.ml-sm-0{margin-left:0px !important}.ml-sm-n0{margin-left:0px !important}}@media only screen and (min-width: 960px){.ml-md-0{margin-left:0px !important}.ml-md-n0{margin-left:0px !important}}@media only screen and (min-width: 1264px){.ml-lg-0{margin-left:0px !important}.ml-lg-n0{margin-left:0px !important}}@media only screen and (min-width: 1904px){.ml-xl-0{margin-left:0px !important}.ml-xl-n0{margin-left:0px !important}}.mr-0{margin-right:0px !important}.mr-n0{margin-right:0px !important}@media only screen and (min-width: 600px){.mr-sm-0{margin-right:0px !important}.mr-sm-n0{margin-right:0px !important}}@media only screen and (min-width: 960px){.mr-md-0{margin-right:0px !important}.mr-md-n0{margin-right:0px !important}}@media only screen and (min-width: 1264px){.mr-lg-0{margin-right:0px !important}.mr-lg-n0{margin-right:0px !important}}@media only screen and (min-width: 1904px){.mr-xl-0{margin-right:0px !important}.mr-xl-n0{margin-right:0px !important}}.mt-0{margin-top:0px !important}.mt-n0{margin-top:0px !important}@media only screen and (min-width: 600px){.mt-sm-0{margin-top:0px !important}.mt-sm-n0{margin-top:0px !important}}@media only screen and (min-width: 960px){.mt-md-0{margin-top:0px !important}.mt-md-n0{margin-top:0px !important}}@media only screen and (min-width: 1264px){.mt-lg-0{margin-top:0px !important}.mt-lg-n0{margin-top:0px !important}}@media only screen and (min-width: 1904px){.mt-xl-0{margin-top:0px !important}.mt-xl-n0{margin-top:0px !important}}.mb-0{margin-bottom:0px !important}.mb-n0{margin-bottom:0px !important}@media only screen and (min-width: 600px){.mb-sm-0{margin-bottom:0px !important}.mb-sm-n0{margin-bottom:0px !important}}@media only screen and (min-width: 960px){.mb-md-0{margin-bottom:0px !important}.mb-md-n0{margin-bottom:0px !important}}@media only screen and (min-width: 1264px){.mb-lg-0{margin-bottom:0px !important}.mb-lg-n0{margin-bottom:0px !important}}@media only screen and (min-width: 1904px){.mb-xl-0{margin-bottom:0px !important}.mb-xl-n0{margin-bottom:0px !important}}.pa-0{padding:0px !important}.pa-n0{padding:0px !important}@media only screen and (min-width: 600px){.pa-sm-0{padding:0px !important}.pa-sm-n0{padding:0px !important}}@media only screen and (min-width: 960px){.pa-md-0{padding:0px !important}.pa-md-n0{padding:0px !important}}@media only screen and (min-width: 1264px){.pa-lg-0{padding:0px !important}.pa-lg-n0{padding:0px !important}}@media only screen and (min-width: 1904px){.pa-xl-0{padding:0px !important}.pa-xl-n0{padding:0px !important}}.pl-0{padding-left:0px !important}.pl-n0{padding-left:0px !important}@media only screen and (min-width: 600px){.pl-sm-0{padding-left:0px !important}.pl-sm-n0{padding-left:0px !important}}@media only screen and (min-width: 960px){.pl-md-0{padding-left:0px !important}.pl-md-n0{padding-left:0px !important}}@media only screen and (min-width: 1264px){.pl-lg-0{padding-left:0px !important}.pl-lg-n0{padding-left:0px !important}}@media only screen and (min-width: 1904px){.pl-xl-0{padding-left:0px !important}.pl-xl-n0{padding-left:0px !important}}.pr-0{padding-right:0px !important}.pr-n0{padding-right:0px !important}@media only screen and (min-width: 600px){.pr-sm-0{padding-right:0px !important}.pr-sm-n0{padding-right:0px !important}}@media only screen and (min-width: 960px){.pr-md-0{padding-right:0px !important}.pr-md-n0{padding-right:0px !important}}@media only screen and (min-width: 1264px){.pr-lg-0{padding-right:0px !important}.pr-lg-n0{padding-right:0px !important}}@media only screen and (min-width: 1904px){.pr-xl-0{padding-right:0px !important}.pr-xl-n0{padding-right:0px !important}}.pt-0{padding-top:0px !important}.pt-n0{padding-top:0px !important}@media only screen and (min-width: 600px){.pt-sm-0{padding-top:0px !important}.pt-sm-n0{padding-top:0px !important}}@media only screen and (min-width: 960px){.pt-md-0{padding-top:0px !important}.pt-md-n0{padding-top:0px !important}}@media only screen and (min-width: 1264px){.pt-lg-0{padding-top:0px !important}.pt-lg-n0{padding-top:0px !important}}@media only screen and (min-width: 1904px){.pt-xl-0{padding-top:0px !important}.pt-xl-n0{padding-top:0px !important}}.pb-0{padding-bottom:0px !important}.pb-n0{padding-bottom:0px !important}@media only screen and (min-width: 600px){.pb-sm-0{padding-bottom:0px !important}.pb-sm-n0{padding-bottom:0px !important}}@media only screen and (min-width: 960px){.pb-md-0{padding-bottom:0px !important}.pb-md-n0{padding-bottom:0px !important}}@media only screen and (min-width: 1264px){.pb-lg-0{padding-bottom:0px !important}.pb-lg-n0{padding-bottom:0px !important}}@media only screen and (min-width: 1904px){.pb-xl-0{padding-bottom:0px !important}.pb-xl-n0{padding-bottom:0px !important}}.ma-1{margin:4px !important}.ma-n1{margin:-4px !important}@media only screen and (min-width: 600px){.ma-sm-1{margin:4px !important}.ma-sm-n1{margin:-4px !important}}@media only screen and (min-width: 960px){.ma-md-1{margin:4px !important}.ma-md-n1{margin:-4px !important}}@media only screen and (min-width: 1264px){.ma-lg-1{margin:4px !important}.ma-lg-n1{margin:-4px !important}}@media only screen and (min-width: 1904px){.ma-xl-1{margin:4px !important}.ma-xl-n1{margin:-4px !important}}.ml-1{margin-left:4px !important}.ml-n1{margin-left:-4px !important}@media only screen and (min-width: 600px){.ml-sm-1{margin-left:4px !important}.ml-sm-n1{margin-left:-4px !important}}@media only screen and (min-width: 960px){.ml-md-1{margin-left:4px !important}.ml-md-n1{margin-left:-4px !important}}@media only screen and (min-width: 1264px){.ml-lg-1{margin-left:4px !important}.ml-lg-n1{margin-left:-4px !important}}@media only screen and (min-width: 1904px){.ml-xl-1{margin-left:4px !important}.ml-xl-n1{margin-left:-4px !important}}.mr-1{margin-right:4px !important}.mr-n1{margin-right:-4px !important}@media only screen and (min-width: 600px){.mr-sm-1{margin-right:4px !important}.mr-sm-n1{margin-right:-4px !important}}@media only screen and (min-width: 960px){.mr-md-1{margin-right:4px !important}.mr-md-n1{margin-right:-4px !important}}@media only screen and (min-width: 1264px){.mr-lg-1{margin-right:4px !important}.mr-lg-n1{margin-right:-4px !important}}@media only screen and (min-width: 1904px){.mr-xl-1{margin-right:4px !important}.mr-xl-n1{margin-right:-4px !important}}.mt-1{margin-top:4px !important}.mt-n1{margin-top:-4px !important}@media only screen and (min-width: 600px){.mt-sm-1{margin-top:4px !important}.mt-sm-n1{margin-top:-4px !important}}@media only screen and (min-width: 960px){.mt-md-1{margin-top:4px !important}.mt-md-n1{margin-top:-4px !important}}@media only screen and (min-width: 1264px){.mt-lg-1{margin-top:4px !important}.mt-lg-n1{margin-top:-4px !important}}@media only screen and (min-width: 1904px){.mt-xl-1{margin-top:4px !important}.mt-xl-n1{margin-top:-4px !important}}.mb-1{margin-bottom:4px !important}.mb-n1{margin-bottom:-4px !important}@media only screen and (min-width: 600px){.mb-sm-1{margin-bottom:4px !important}.mb-sm-n1{margin-bottom:-4px !important}}@media only screen and (min-width: 960px){.mb-md-1{margin-bottom:4px !important}.mb-md-n1{margin-bottom:-4px !important}}@media only screen and (min-width: 1264px){.mb-lg-1{margin-bottom:4px !important}.mb-lg-n1{margin-bottom:-4px !important}}@media only screen and (min-width: 1904px){.mb-xl-1{margin-bottom:4px !important}.mb-xl-n1{margin-bottom:-4px !important}}.pa-1{padding:4px !important}.pa-n1{padding:-4px !important}@media only screen and (min-width: 600px){.pa-sm-1{padding:4px !important}.pa-sm-n1{padding:-4px !important}}@media only screen and (min-width: 960px){.pa-md-1{padding:4px !important}.pa-md-n1{padding:-4px !important}}@media only screen and (min-width: 1264px){.pa-lg-1{padding:4px !important}.pa-lg-n1{padding:-4px !important}}@media only screen and (min-width: 1904px){.pa-xl-1{padding:4px !important}.pa-xl-n1{padding:-4px !important}}.pl-1{padding-left:4px !important}.pl-n1{padding-left:-4px !important}@media only screen and (min-width: 600px){.pl-sm-1{padding-left:4px !important}.pl-sm-n1{padding-left:-4px !important}}@media only screen and (min-width: 960px){.pl-md-1{padding-left:4px !important}.pl-md-n1{padding-left:-4px !important}}@media only screen and (min-width: 1264px){.pl-lg-1{padding-left:4px !important}.pl-lg-n1{padding-left:-4px !important}}@media only screen and (min-width: 1904px){.pl-xl-1{padding-left:4px !important}.pl-xl-n1{padding-left:-4px !important}}.pr-1{padding-right:4px !important}.pr-n1{padding-right:-4px !important}@media only screen and (min-width: 600px){.pr-sm-1{padding-right:4px !important}.pr-sm-n1{padding-right:-4px !important}}@media only screen and (min-width: 960px){.pr-md-1{padding-right:4px !important}.pr-md-n1{padding-right:-4px !important}}@media only screen and (min-width: 1264px){.pr-lg-1{padding-right:4px !important}.pr-lg-n1{padding-right:-4px !important}}@media only screen and (min-width: 1904px){.pr-xl-1{padding-right:4px !important}.pr-xl-n1{padding-right:-4px !important}}.pt-1{padding-top:4px !important}.pt-n1{padding-top:-4px !important}@media only screen and (min-width: 600px){.pt-sm-1{padding-top:4px !important}.pt-sm-n1{padding-top:-4px !important}}@media only screen and (min-width: 960px){.pt-md-1{padding-top:4px !important}.pt-md-n1{padding-top:-4px !important}}@media only screen and (min-width: 1264px){.pt-lg-1{padding-top:4px !important}.pt-lg-n1{padding-top:-4px !important}}@media only screen and (min-width: 1904px){.pt-xl-1{padding-top:4px !important}.pt-xl-n1{padding-top:-4px !important}}.pb-1{padding-bottom:4px !important}.pb-n1{padding-bottom:-4px !important}@media only screen and (min-width: 600px){.pb-sm-1{padding-bottom:4px !important}.pb-sm-n1{padding-bottom:-4px !important}}@media only screen and (min-width: 960px){.pb-md-1{padding-bottom:4px !important}.pb-md-n1{padding-bottom:-4px !important}}@media only screen and (min-width: 1264px){.pb-lg-1{padding-bottom:4px !important}.pb-lg-n1{padding-bottom:-4px !important}}@media only screen and (min-width: 1904px){.pb-xl-1{padding-bottom:4px !important}.pb-xl-n1{padding-bottom:-4px !important}}.ma-2{margin:8px !important}.ma-n2{margin:-8px !important}@media only screen and (min-width: 600px){.ma-sm-2{margin:8px !important}.ma-sm-n2{margin:-8px !important}}@media only screen and (min-width: 960px){.ma-md-2{margin:8px !important}.ma-md-n2{margin:-8px !important}}@media only screen and (min-width: 1264px){.ma-lg-2{margin:8px !important}.ma-lg-n2{margin:-8px !important}}@media only screen and (min-width: 1904px){.ma-xl-2{margin:8px !important}.ma-xl-n2{margin:-8px !important}}.ml-2{margin-left:8px !important}.ml-n2{margin-left:-8px !important}@media only screen and (min-width: 600px){.ml-sm-2{margin-left:8px !important}.ml-sm-n2{margin-left:-8px !important}}@media only screen and (min-width: 960px){.ml-md-2{margin-left:8px !important}.ml-md-n2{margin-left:-8px !important}}@media only screen and (min-width: 1264px){.ml-lg-2{margin-left:8px !important}.ml-lg-n2{margin-left:-8px !important}}@media only screen and (min-width: 1904px){.ml-xl-2{margin-left:8px !important}.ml-xl-n2{margin-left:-8px !important}}.mr-2{margin-right:8px !important}.mr-n2{margin-right:-8px !important}@media only screen and (min-width: 600px){.mr-sm-2{margin-right:8px !important}.mr-sm-n2{margin-right:-8px !important}}@media only screen and (min-width: 960px){.mr-md-2{margin-right:8px !important}.mr-md-n2{margin-right:-8px !important}}@media only screen and (min-width: 1264px){.mr-lg-2{margin-right:8px !important}.mr-lg-n2{margin-right:-8px !important}}@media only screen and (min-width: 1904px){.mr-xl-2{margin-right:8px !important}.mr-xl-n2{margin-right:-8px !important}}.mt-2{margin-top:8px !important}.mt-n2{margin-top:-8px !important}@media only screen and (min-width: 600px){.mt-sm-2{margin-top:8px !important}.mt-sm-n2{margin-top:-8px !important}}@media only screen and (min-width: 960px){.mt-md-2{margin-top:8px !important}.mt-md-n2{margin-top:-8px !important}}@media only screen and (min-width: 1264px){.mt-lg-2{margin-top:8px !important}.mt-lg-n2{margin-top:-8px !important}}@media only screen and (min-width: 1904px){.mt-xl-2{margin-top:8px !important}.mt-xl-n2{margin-top:-8px !important}}.mb-2{margin-bottom:8px !important}.mb-n2{margin-bottom:-8px !important}@media only screen and (min-width: 600px){.mb-sm-2{margin-bottom:8px !important}.mb-sm-n2{margin-bottom:-8px !important}}@media only screen and (min-width: 960px){.mb-md-2{margin-bottom:8px !important}.mb-md-n2{margin-bottom:-8px !important}}@media only screen and (min-width: 1264px){.mb-lg-2{margin-bottom:8px !important}.mb-lg-n2{margin-bottom:-8px !important}}@media only screen and (min-width: 1904px){.mb-xl-2{margin-bottom:8px !important}.mb-xl-n2{margin-bottom:-8px !important}}.pa-2{padding:8px !important}.pa-n2{padding:-8px !important}@media only screen and (min-width: 600px){.pa-sm-2{padding:8px !important}.pa-sm-n2{padding:-8px !important}}@media only screen and (min-width: 960px){.pa-md-2{padding:8px !important}.pa-md-n2{padding:-8px !important}}@media only screen and (min-width: 1264px){.pa-lg-2{padding:8px !important}.pa-lg-n2{padding:-8px !important}}@media only screen and (min-width: 1904px){.pa-xl-2{padding:8px !important}.pa-xl-n2{padding:-8px !important}}.pl-2{padding-left:8px !important}.pl-n2{padding-left:-8px !important}@media only screen and (min-width: 600px){.pl-sm-2{padding-left:8px !important}.pl-sm-n2{padding-left:-8px !important}}@media only screen and (min-width: 960px){.pl-md-2{padding-left:8px !important}.pl-md-n2{padding-left:-8px !important}}@media only screen and (min-width: 1264px){.pl-lg-2{padding-left:8px !important}.pl-lg-n2{padding-left:-8px !important}}@media only screen and (min-width: 1904px){.pl-xl-2{padding-left:8px !important}.pl-xl-n2{padding-left:-8px !important}}.pr-2{padding-right:8px !important}.pr-n2{padding-right:-8px !important}@media only screen and (min-width: 600px){.pr-sm-2{padding-right:8px !important}.pr-sm-n2{padding-right:-8px !important}}@media only screen and (min-width: 960px){.pr-md-2{padding-right:8px !important}.pr-md-n2{padding-right:-8px !important}}@media only screen and (min-width: 1264px){.pr-lg-2{padding-right:8px !important}.pr-lg-n2{padding-right:-8px !important}}@media only screen and (min-width: 1904px){.pr-xl-2{padding-right:8px !important}.pr-xl-n2{padding-right:-8px !important}}.pt-2{padding-top:8px !important}.pt-n2{padding-top:-8px !important}@media only screen and (min-width: 600px){.pt-sm-2{padding-top:8px !important}.pt-sm-n2{padding-top:-8px !important}}@media only screen and (min-width: 960px){.pt-md-2{padding-top:8px !important}.pt-md-n2{padding-top:-8px !important}}@media only screen and (min-width: 1264px){.pt-lg-2{padding-top:8px !important}.pt-lg-n2{padding-top:-8px !important}}@media only screen and (min-width: 1904px){.pt-xl-2{padding-top:8px !important}.pt-xl-n2{padding-top:-8px !important}}.pb-2{padding-bottom:8px !important}.pb-n2{padding-bottom:-8px !important}@media only screen and (min-width: 600px){.pb-sm-2{padding-bottom:8px !important}.pb-sm-n2{padding-bottom:-8px !important}}@media only screen and (min-width: 960px){.pb-md-2{padding-bottom:8px !important}.pb-md-n2{padding-bottom:-8px !important}}@media only screen and (min-width: 1264px){.pb-lg-2{padding-bottom:8px !important}.pb-lg-n2{padding-bottom:-8px !important}}@media only screen and (min-width: 1904px){.pb-xl-2{padding-bottom:8px !important}.pb-xl-n2{padding-bottom:-8px !important}}.ma-3{margin:12px !important}.ma-n3{margin:-12px !important}@media only screen and (min-width: 600px){.ma-sm-3{margin:12px !important}.ma-sm-n3{margin:-12px !important}}@media only screen and (min-width: 960px){.ma-md-3{margin:12px !important}.ma-md-n3{margin:-12px !important}}@media only screen and (min-width: 1264px){.ma-lg-3{margin:12px !important}.ma-lg-n3{margin:-12px !important}}@media only screen and (min-width: 1904px){.ma-xl-3{margin:12px !important}.ma-xl-n3{margin:-12px !important}}.ml-3{margin-left:12px !important}.ml-n3{margin-left:-12px !important}@media only screen and (min-width: 600px){.ml-sm-3{margin-left:12px !important}.ml-sm-n3{margin-left:-12px !important}}@media only screen and (min-width: 960px){.ml-md-3{margin-left:12px !important}.ml-md-n3{margin-left:-12px !important}}@media only screen and (min-width: 1264px){.ml-lg-3{margin-left:12px !important}.ml-lg-n3{margin-left:-12px !important}}@media only screen and (min-width: 1904px){.ml-xl-3{margin-left:12px !important}.ml-xl-n3{margin-left:-12px !important}}.mr-3{margin-right:12px !important}.mr-n3{margin-right:-12px !important}@media only screen and (min-width: 600px){.mr-sm-3{margin-right:12px !important}.mr-sm-n3{margin-right:-12px !important}}@media only screen and (min-width: 960px){.mr-md-3{margin-right:12px !important}.mr-md-n3{margin-right:-12px !important}}@media only screen and (min-width: 1264px){.mr-lg-3{margin-right:12px !important}.mr-lg-n3{margin-right:-12px !important}}@media only screen and (min-width: 1904px){.mr-xl-3{margin-right:12px !important}.mr-xl-n3{margin-right:-12px !important}}.mt-3{margin-top:12px !important}.mt-n3{margin-top:-12px !important}@media only screen and (min-width: 600px){.mt-sm-3{margin-top:12px !important}.mt-sm-n3{margin-top:-12px !important}}@media only screen and (min-width: 960px){.mt-md-3{margin-top:12px !important}.mt-md-n3{margin-top:-12px !important}}@media only screen and (min-width: 1264px){.mt-lg-3{margin-top:12px !important}.mt-lg-n3{margin-top:-12px !important}}@media only screen and (min-width: 1904px){.mt-xl-3{margin-top:12px !important}.mt-xl-n3{margin-top:-12px !important}}.mb-3{margin-bottom:12px !important}.mb-n3{margin-bottom:-12px !important}@media only screen and (min-width: 600px){.mb-sm-3{margin-bottom:12px !important}.mb-sm-n3{margin-bottom:-12px !important}}@media only screen and (min-width: 960px){.mb-md-3{margin-bottom:12px !important}.mb-md-n3{margin-bottom:-12px !important}}@media only screen and (min-width: 1264px){.mb-lg-3{margin-bottom:12px !important}.mb-lg-n3{margin-bottom:-12px !important}}@media only screen and (min-width: 1904px){.mb-xl-3{margin-bottom:12px !important}.mb-xl-n3{margin-bottom:-12px !important}}.pa-3{padding:12px !important}.pa-n3{padding:-12px !important}@media only screen and (min-width: 600px){.pa-sm-3{padding:12px !important}.pa-sm-n3{padding:-12px !important}}@media only screen and (min-width: 960px){.pa-md-3{padding:12px !important}.pa-md-n3{padding:-12px !important}}@media only screen and (min-width: 1264px){.pa-lg-3{padding:12px !important}.pa-lg-n3{padding:-12px !important}}@media only screen and (min-width: 1904px){.pa-xl-3{padding:12px !important}.pa-xl-n3{padding:-12px !important}}.pl-3{padding-left:12px !important}.pl-n3{padding-left:-12px !important}@media only screen and (min-width: 600px){.pl-sm-3{padding-left:12px !important}.pl-sm-n3{padding-left:-12px !important}}@media only screen and (min-width: 960px){.pl-md-3{padding-left:12px !important}.pl-md-n3{padding-left:-12px !important}}@media only screen and (min-width: 1264px){.pl-lg-3{padding-left:12px !important}.pl-lg-n3{padding-left:-12px !important}}@media only screen and (min-width: 1904px){.pl-xl-3{padding-left:12px !important}.pl-xl-n3{padding-left:-12px !important}}.pr-3{padding-right:12px !important}.pr-n3{padding-right:-12px !important}@media only screen and (min-width: 600px){.pr-sm-3{padding-right:12px !important}.pr-sm-n3{padding-right:-12px !important}}@media only screen and (min-width: 960px){.pr-md-3{padding-right:12px !important}.pr-md-n3{padding-right:-12px !important}}@media only screen and (min-width: 1264px){.pr-lg-3{padding-right:12px !important}.pr-lg-n3{padding-right:-12px !important}}@media only screen and (min-width: 1904px){.pr-xl-3{padding-right:12px !important}.pr-xl-n3{padding-right:-12px !important}}.pt-3{padding-top:12px !important}.pt-n3{padding-top:-12px !important}@media only screen and (min-width: 600px){.pt-sm-3{padding-top:12px !important}.pt-sm-n3{padding-top:-12px !important}}@media only screen and (min-width: 960px){.pt-md-3{padding-top:12px !important}.pt-md-n3{padding-top:-12px !important}}@media only screen and (min-width: 1264px){.pt-lg-3{padding-top:12px !important}.pt-lg-n3{padding-top:-12px !important}}@media only screen and (min-width: 1904px){.pt-xl-3{padding-top:12px !important}.pt-xl-n3{padding-top:-12px !important}}.pb-3{padding-bottom:12px !important}.pb-n3{padding-bottom:-12px !important}@media only screen and (min-width: 600px){.pb-sm-3{padding-bottom:12px !important}.pb-sm-n3{padding-bottom:-12px !important}}@media only screen and (min-width: 960px){.pb-md-3{padding-bottom:12px !important}.pb-md-n3{padding-bottom:-12px !important}}@media only screen and (min-width: 1264px){.pb-lg-3{padding-bottom:12px !important}.pb-lg-n3{padding-bottom:-12px !important}}@media only screen and (min-width: 1904px){.pb-xl-3{padding-bottom:12px !important}.pb-xl-n3{padding-bottom:-12px !important}}.ma-4{margin:16px !important}.ma-n4{margin:-16px !important}@media only screen and (min-width: 600px){.ma-sm-4{margin:16px !important}.ma-sm-n4{margin:-16px !important}}@media only screen and (min-width: 960px){.ma-md-4{margin:16px !important}.ma-md-n4{margin:-16px !important}}@media only screen and (min-width: 1264px){.ma-lg-4{margin:16px !important}.ma-lg-n4{margin:-16px !important}}@media only screen and (min-width: 1904px){.ma-xl-4{margin:16px !important}.ma-xl-n4{margin:-16px !important}}.ml-4{margin-left:16px !important}.ml-n4{margin-left:-16px !important}@media only screen and (min-width: 600px){.ml-sm-4{margin-left:16px !important}.ml-sm-n4{margin-left:-16px !important}}@media only screen and (min-width: 960px){.ml-md-4{margin-left:16px !important}.ml-md-n4{margin-left:-16px !important}}@media only screen and (min-width: 1264px){.ml-lg-4{margin-left:16px !important}.ml-lg-n4{margin-left:-16px !important}}@media only screen and (min-width: 1904px){.ml-xl-4{margin-left:16px !important}.ml-xl-n4{margin-left:-16px !important}}.mr-4{margin-right:16px !important}.mr-n4{margin-right:-16px !important}@media only screen and (min-width: 600px){.mr-sm-4{margin-right:16px !important}.mr-sm-n4{margin-right:-16px !important}}@media only screen and (min-width: 960px){.mr-md-4{margin-right:16px !important}.mr-md-n4{margin-right:-16px !important}}@media only screen and (min-width: 1264px){.mr-lg-4{margin-right:16px !important}.mr-lg-n4{margin-right:-16px !important}}@media only screen and (min-width: 1904px){.mr-xl-4{margin-right:16px !important}.mr-xl-n4{margin-right:-16px !important}}.mt-4{margin-top:16px !important}.mt-n4{margin-top:-16px !important}@media only screen and (min-width: 600px){.mt-sm-4{margin-top:16px !important}.mt-sm-n4{margin-top:-16px !important}}@media only screen and (min-width: 960px){.mt-md-4{margin-top:16px !important}.mt-md-n4{margin-top:-16px !important}}@media only screen and (min-width: 1264px){.mt-lg-4{margin-top:16px !important}.mt-lg-n4{margin-top:-16px !important}}@media only screen and (min-width: 1904px){.mt-xl-4{margin-top:16px !important}.mt-xl-n4{margin-top:-16px !important}}.mb-4{margin-bottom:16px !important}.mb-n4{margin-bottom:-16px !important}@media only screen and (min-width: 600px){.mb-sm-4{margin-bottom:16px !important}.mb-sm-n4{margin-bottom:-16px !important}}@media only screen and (min-width: 960px){.mb-md-4{margin-bottom:16px !important}.mb-md-n4{margin-bottom:-16px !important}}@media only screen and (min-width: 1264px){.mb-lg-4{margin-bottom:16px !important}.mb-lg-n4{margin-bottom:-16px !important}}@media only screen and (min-width: 1904px){.mb-xl-4{margin-bottom:16px !important}.mb-xl-n4{margin-bottom:-16px !important}}.pa-4{padding:16px !important}.pa-n4{padding:-16px !important}@media only screen and (min-width: 600px){.pa-sm-4{padding:16px !important}.pa-sm-n4{padding:-16px !important}}@media only screen and (min-width: 960px){.pa-md-4{padding:16px !important}.pa-md-n4{padding:-16px !important}}@media only screen and (min-width: 1264px){.pa-lg-4{padding:16px !important}.pa-lg-n4{padding:-16px !important}}@media only screen and (min-width: 1904px){.pa-xl-4{padding:16px !important}.pa-xl-n4{padding:-16px !important}}.pl-4{padding-left:16px !important}.pl-n4{padding-left:-16px !important}@media only screen and (min-width: 600px){.pl-sm-4{padding-left:16px !important}.pl-sm-n4{padding-left:-16px !important}}@media only screen and (min-width: 960px){.pl-md-4{padding-left:16px !important}.pl-md-n4{padding-left:-16px !important}}@media only screen and (min-width: 1264px){.pl-lg-4{padding-left:16px !important}.pl-lg-n4{padding-left:-16px !important}}@media only screen and (min-width: 1904px){.pl-xl-4{padding-left:16px !important}.pl-xl-n4{padding-left:-16px !important}}.pr-4{padding-right:16px !important}.pr-n4{padding-right:-16px !important}@media only screen and (min-width: 600px){.pr-sm-4{padding-right:16px !important}.pr-sm-n4{padding-right:-16px !important}}@media only screen and (min-width: 960px){.pr-md-4{padding-right:16px !important}.pr-md-n4{padding-right:-16px !important}}@media only screen and (min-width: 1264px){.pr-lg-4{padding-right:16px !important}.pr-lg-n4{padding-right:-16px !important}}@media only screen and (min-width: 1904px){.pr-xl-4{padding-right:16px !important}.pr-xl-n4{padding-right:-16px !important}}.pt-4{padding-top:16px !important}.pt-n4{padding-top:-16px !important}@media only screen and (min-width: 600px){.pt-sm-4{padding-top:16px !important}.pt-sm-n4{padding-top:-16px !important}}@media only screen and (min-width: 960px){.pt-md-4{padding-top:16px !important}.pt-md-n4{padding-top:-16px !important}}@media only screen and (min-width: 1264px){.pt-lg-4{padding-top:16px !important}.pt-lg-n4{padding-top:-16px !important}}@media only screen and (min-width: 1904px){.pt-xl-4{padding-top:16px !important}.pt-xl-n4{padding-top:-16px !important}}.pb-4{padding-bottom:16px !important}.pb-n4{padding-bottom:-16px !important}@media only screen and (min-width: 600px){.pb-sm-4{padding-bottom:16px !important}.pb-sm-n4{padding-bottom:-16px !important}}@media only screen and (min-width: 960px){.pb-md-4{padding-bottom:16px !important}.pb-md-n4{padding-bottom:-16px !important}}@media only screen and (min-width: 1264px){.pb-lg-4{padding-bottom:16px !important}.pb-lg-n4{padding-bottom:-16px !important}}@media only screen and (min-width: 1904px){.pb-xl-4{padding-bottom:16px !important}.pb-xl-n4{padding-bottom:-16px !important}}.ma-5{margin:20px !important}.ma-n5{margin:-20px !important}@media only screen and (min-width: 600px){.ma-sm-5{margin:20px !important}.ma-sm-n5{margin:-20px !important}}@media only screen and (min-width: 960px){.ma-md-5{margin:20px !important}.ma-md-n5{margin:-20px !important}}@media only screen and (min-width: 1264px){.ma-lg-5{margin:20px !important}.ma-lg-n5{margin:-20px !important}}@media only screen and (min-width: 1904px){.ma-xl-5{margin:20px !important}.ma-xl-n5{margin:-20px !important}}.ml-5{margin-left:20px !important}.ml-n5{margin-left:-20px !important}@media only screen and (min-width: 600px){.ml-sm-5{margin-left:20px !important}.ml-sm-n5{margin-left:-20px !important}}@media only screen and (min-width: 960px){.ml-md-5{margin-left:20px !important}.ml-md-n5{margin-left:-20px !important}}@media only screen and (min-width: 1264px){.ml-lg-5{margin-left:20px !important}.ml-lg-n5{margin-left:-20px !important}}@media only screen and (min-width: 1904px){.ml-xl-5{margin-left:20px !important}.ml-xl-n5{margin-left:-20px !important}}.mr-5{margin-right:20px !important}.mr-n5{margin-right:-20px !important}@media only screen and (min-width: 600px){.mr-sm-5{margin-right:20px !important}.mr-sm-n5{margin-right:-20px !important}}@media only screen and (min-width: 960px){.mr-md-5{margin-right:20px !important}.mr-md-n5{margin-right:-20px !important}}@media only screen and (min-width: 1264px){.mr-lg-5{margin-right:20px !important}.mr-lg-n5{margin-right:-20px !important}}@media only screen and (min-width: 1904px){.mr-xl-5{margin-right:20px !important}.mr-xl-n5{margin-right:-20px !important}}.mt-5{margin-top:20px !important}.mt-n5{margin-top:-20px !important}@media only screen and (min-width: 600px){.mt-sm-5{margin-top:20px !important}.mt-sm-n5{margin-top:-20px !important}}@media only screen and (min-width: 960px){.mt-md-5{margin-top:20px !important}.mt-md-n5{margin-top:-20px !important}}@media only screen and (min-width: 1264px){.mt-lg-5{margin-top:20px !important}.mt-lg-n5{margin-top:-20px !important}}@media only screen and (min-width: 1904px){.mt-xl-5{margin-top:20px !important}.mt-xl-n5{margin-top:-20px !important}}.mb-5{margin-bottom:20px !important}.mb-n5{margin-bottom:-20px !important}@media only screen and (min-width: 600px){.mb-sm-5{margin-bottom:20px !important}.mb-sm-n5{margin-bottom:-20px !important}}@media only screen and (min-width: 960px){.mb-md-5{margin-bottom:20px !important}.mb-md-n5{margin-bottom:-20px !important}}@media only screen and (min-width: 1264px){.mb-lg-5{margin-bottom:20px !important}.mb-lg-n5{margin-bottom:-20px !important}}@media only screen and (min-width: 1904px){.mb-xl-5{margin-bottom:20px !important}.mb-xl-n5{margin-bottom:-20px !important}}.pa-5{padding:20px !important}.pa-n5{padding:-20px !important}@media only screen and (min-width: 600px){.pa-sm-5{padding:20px !important}.pa-sm-n5{padding:-20px !important}}@media only screen and (min-width: 960px){.pa-md-5{padding:20px !important}.pa-md-n5{padding:-20px !important}}@media only screen and (min-width: 1264px){.pa-lg-5{padding:20px !important}.pa-lg-n5{padding:-20px !important}}@media only screen and (min-width: 1904px){.pa-xl-5{padding:20px !important}.pa-xl-n5{padding:-20px !important}}.pl-5{padding-left:20px !important}.pl-n5{padding-left:-20px !important}@media only screen and (min-width: 600px){.pl-sm-5{padding-left:20px !important}.pl-sm-n5{padding-left:-20px !important}}@media only screen and (min-width: 960px){.pl-md-5{padding-left:20px !important}.pl-md-n5{padding-left:-20px !important}}@media only screen and (min-width: 1264px){.pl-lg-5{padding-left:20px !important}.pl-lg-n5{padding-left:-20px !important}}@media only screen and (min-width: 1904px){.pl-xl-5{padding-left:20px !important}.pl-xl-n5{padding-left:-20px !important}}.pr-5{padding-right:20px !important}.pr-n5{padding-right:-20px !important}@media only screen and (min-width: 600px){.pr-sm-5{padding-right:20px !important}.pr-sm-n5{padding-right:-20px !important}}@media only screen and (min-width: 960px){.pr-md-5{padding-right:20px !important}.pr-md-n5{padding-right:-20px !important}}@media only screen and (min-width: 1264px){.pr-lg-5{padding-right:20px !important}.pr-lg-n5{padding-right:-20px !important}}@media only screen and (min-width: 1904px){.pr-xl-5{padding-right:20px !important}.pr-xl-n5{padding-right:-20px !important}}.pt-5{padding-top:20px !important}.pt-n5{padding-top:-20px !important}@media only screen and (min-width: 600px){.pt-sm-5{padding-top:20px !important}.pt-sm-n5{padding-top:-20px !important}}@media only screen and (min-width: 960px){.pt-md-5{padding-top:20px !important}.pt-md-n5{padding-top:-20px !important}}@media only screen and (min-width: 1264px){.pt-lg-5{padding-top:20px !important}.pt-lg-n5{padding-top:-20px !important}}@media only screen and (min-width: 1904px){.pt-xl-5{padding-top:20px !important}.pt-xl-n5{padding-top:-20px !important}}.pb-5{padding-bottom:20px !important}.pb-n5{padding-bottom:-20px !important}@media only screen and (min-width: 600px){.pb-sm-5{padding-bottom:20px !important}.pb-sm-n5{padding-bottom:-20px !important}}@media only screen and (min-width: 960px){.pb-md-5{padding-bottom:20px !important}.pb-md-n5{padding-bottom:-20px !important}}@media only screen and (min-width: 1264px){.pb-lg-5{padding-bottom:20px !important}.pb-lg-n5{padding-bottom:-20px !important}}@media only screen and (min-width: 1904px){.pb-xl-5{padding-bottom:20px !important}.pb-xl-n5{padding-bottom:-20px !important}}.ma-6{margin:24px !important}.ma-n6{margin:-24px !important}@media only screen and (min-width: 600px){.ma-sm-6{margin:24px !important}.ma-sm-n6{margin:-24px !important}}@media only screen and (min-width: 960px){.ma-md-6{margin:24px !important}.ma-md-n6{margin:-24px !important}}@media only screen and (min-width: 1264px){.ma-lg-6{margin:24px !important}.ma-lg-n6{margin:-24px !important}}@media only screen and (min-width: 1904px){.ma-xl-6{margin:24px !important}.ma-xl-n6{margin:-24px !important}}.ml-6{margin-left:24px !important}.ml-n6{margin-left:-24px !important}@media only screen and (min-width: 600px){.ml-sm-6{margin-left:24px !important}.ml-sm-n6{margin-left:-24px !important}}@media only screen and (min-width: 960px){.ml-md-6{margin-left:24px !important}.ml-md-n6{margin-left:-24px !important}}@media only screen and (min-width: 1264px){.ml-lg-6{margin-left:24px !important}.ml-lg-n6{margin-left:-24px !important}}@media only screen and (min-width: 1904px){.ml-xl-6{margin-left:24px !important}.ml-xl-n6{margin-left:-24px !important}}.mr-6{margin-right:24px !important}.mr-n6{margin-right:-24px !important}@media only screen and (min-width: 600px){.mr-sm-6{margin-right:24px !important}.mr-sm-n6{margin-right:-24px !important}}@media only screen and (min-width: 960px){.mr-md-6{margin-right:24px !important}.mr-md-n6{margin-right:-24px !important}}@media only screen and (min-width: 1264px){.mr-lg-6{margin-right:24px !important}.mr-lg-n6{margin-right:-24px !important}}@media only screen and (min-width: 1904px){.mr-xl-6{margin-right:24px !important}.mr-xl-n6{margin-right:-24px !important}}.mt-6{margin-top:24px !important}.mt-n6{margin-top:-24px !important}@media only screen and (min-width: 600px){.mt-sm-6{margin-top:24px !important}.mt-sm-n6{margin-top:-24px !important}}@media only screen and (min-width: 960px){.mt-md-6{margin-top:24px !important}.mt-md-n6{margin-top:-24px !important}}@media only screen and (min-width: 1264px){.mt-lg-6{margin-top:24px !important}.mt-lg-n6{margin-top:-24px !important}}@media only screen and (min-width: 1904px){.mt-xl-6{margin-top:24px !important}.mt-xl-n6{margin-top:-24px !important}}.mb-6{margin-bottom:24px !important}.mb-n6{margin-bottom:-24px !important}@media only screen and (min-width: 600px){.mb-sm-6{margin-bottom:24px !important}.mb-sm-n6{margin-bottom:-24px !important}}@media only screen and (min-width: 960px){.mb-md-6{margin-bottom:24px !important}.mb-md-n6{margin-bottom:-24px !important}}@media only screen and (min-width: 1264px){.mb-lg-6{margin-bottom:24px !important}.mb-lg-n6{margin-bottom:-24px !important}}@media only screen and (min-width: 1904px){.mb-xl-6{margin-bottom:24px !important}.mb-xl-n6{margin-bottom:-24px !important}}.pa-6{padding:24px !important}.pa-n6{padding:-24px !important}@media only screen and (min-width: 600px){.pa-sm-6{padding:24px !important}.pa-sm-n6{padding:-24px !important}}@media only screen and (min-width: 960px){.pa-md-6{padding:24px !important}.pa-md-n6{padding:-24px !important}}@media only screen and (min-width: 1264px){.pa-lg-6{padding:24px !important}.pa-lg-n6{padding:-24px !important}}@media only screen and (min-width: 1904px){.pa-xl-6{padding:24px !important}.pa-xl-n6{padding:-24px !important}}.pl-6{padding-left:24px !important}.pl-n6{padding-left:-24px !important}@media only screen and (min-width: 600px){.pl-sm-6{padding-left:24px !important}.pl-sm-n6{padding-left:-24px !important}}@media only screen and (min-width: 960px){.pl-md-6{padding-left:24px !important}.pl-md-n6{padding-left:-24px !important}}@media only screen and (min-width: 1264px){.pl-lg-6{padding-left:24px !important}.pl-lg-n6{padding-left:-24px !important}}@media only screen and (min-width: 1904px){.pl-xl-6{padding-left:24px !important}.pl-xl-n6{padding-left:-24px !important}}.pr-6{padding-right:24px !important}.pr-n6{padding-right:-24px !important}@media only screen and (min-width: 600px){.pr-sm-6{padding-right:24px !important}.pr-sm-n6{padding-right:-24px !important}}@media only screen and (min-width: 960px){.pr-md-6{padding-right:24px !important}.pr-md-n6{padding-right:-24px !important}}@media only screen and (min-width: 1264px){.pr-lg-6{padding-right:24px !important}.pr-lg-n6{padding-right:-24px !important}}@media only screen and (min-width: 1904px){.pr-xl-6{padding-right:24px !important}.pr-xl-n6{padding-right:-24px !important}}.pt-6{padding-top:24px !important}.pt-n6{padding-top:-24px !important}@media only screen and (min-width: 600px){.pt-sm-6{padding-top:24px !important}.pt-sm-n6{padding-top:-24px !important}}@media only screen and (min-width: 960px){.pt-md-6{padding-top:24px !important}.pt-md-n6{padding-top:-24px !important}}@media only screen and (min-width: 1264px){.pt-lg-6{padding-top:24px !important}.pt-lg-n6{padding-top:-24px !important}}@media only screen and (min-width: 1904px){.pt-xl-6{padding-top:24px !important}.pt-xl-n6{padding-top:-24px !important}}.pb-6{padding-bottom:24px !important}.pb-n6{padding-bottom:-24px !important}@media only screen and (min-width: 600px){.pb-sm-6{padding-bottom:24px !important}.pb-sm-n6{padding-bottom:-24px !important}}@media only screen and (min-width: 960px){.pb-md-6{padding-bottom:24px !important}.pb-md-n6{padding-bottom:-24px !important}}@media only screen and (min-width: 1264px){.pb-lg-6{padding-bottom:24px !important}.pb-lg-n6{padding-bottom:-24px !important}}@media only screen and (min-width: 1904px){.pb-xl-6{padding-bottom:24px !important}.pb-xl-n6{padding-bottom:-24px !important}}.ma-7{margin:28px !important}.ma-n7{margin:-28px !important}@media only screen and (min-width: 600px){.ma-sm-7{margin:28px !important}.ma-sm-n7{margin:-28px !important}}@media only screen and (min-width: 960px){.ma-md-7{margin:28px !important}.ma-md-n7{margin:-28px !important}}@media only screen and (min-width: 1264px){.ma-lg-7{margin:28px !important}.ma-lg-n7{margin:-28px !important}}@media only screen and (min-width: 1904px){.ma-xl-7{margin:28px !important}.ma-xl-n7{margin:-28px !important}}.ml-7{margin-left:28px !important}.ml-n7{margin-left:-28px !important}@media only screen and (min-width: 600px){.ml-sm-7{margin-left:28px !important}.ml-sm-n7{margin-left:-28px !important}}@media only screen and (min-width: 960px){.ml-md-7{margin-left:28px !important}.ml-md-n7{margin-left:-28px !important}}@media only screen and (min-width: 1264px){.ml-lg-7{margin-left:28px !important}.ml-lg-n7{margin-left:-28px !important}}@media only screen and (min-width: 1904px){.ml-xl-7{margin-left:28px !important}.ml-xl-n7{margin-left:-28px !important}}.mr-7{margin-right:28px !important}.mr-n7{margin-right:-28px !important}@media only screen and (min-width: 600px){.mr-sm-7{margin-right:28px !important}.mr-sm-n7{margin-right:-28px !important}}@media only screen and (min-width: 960px){.mr-md-7{margin-right:28px !important}.mr-md-n7{margin-right:-28px !important}}@media only screen and (min-width: 1264px){.mr-lg-7{margin-right:28px !important}.mr-lg-n7{margin-right:-28px !important}}@media only screen and (min-width: 1904px){.mr-xl-7{margin-right:28px !important}.mr-xl-n7{margin-right:-28px !important}}.mt-7{margin-top:28px !important}.mt-n7{margin-top:-28px !important}@media only screen and (min-width: 600px){.mt-sm-7{margin-top:28px !important}.mt-sm-n7{margin-top:-28px !important}}@media only screen and (min-width: 960px){.mt-md-7{margin-top:28px !important}.mt-md-n7{margin-top:-28px !important}}@media only screen and (min-width: 1264px){.mt-lg-7{margin-top:28px !important}.mt-lg-n7{margin-top:-28px !important}}@media only screen and (min-width: 1904px){.mt-xl-7{margin-top:28px !important}.mt-xl-n7{margin-top:-28px !important}}.mb-7{margin-bottom:28px !important}.mb-n7{margin-bottom:-28px !important}@media only screen and (min-width: 600px){.mb-sm-7{margin-bottom:28px !important}.mb-sm-n7{margin-bottom:-28px !important}}@media only screen and (min-width: 960px){.mb-md-7{margin-bottom:28px !important}.mb-md-n7{margin-bottom:-28px !important}}@media only screen and (min-width: 1264px){.mb-lg-7{margin-bottom:28px !important}.mb-lg-n7{margin-bottom:-28px !important}}@media only screen and (min-width: 1904px){.mb-xl-7{margin-bottom:28px !important}.mb-xl-n7{margin-bottom:-28px !important}}.pa-7{padding:28px !important}.pa-n7{padding:-28px !important}@media only screen and (min-width: 600px){.pa-sm-7{padding:28px !important}.pa-sm-n7{padding:-28px !important}}@media only screen and (min-width: 960px){.pa-md-7{padding:28px !important}.pa-md-n7{padding:-28px !important}}@media only screen and (min-width: 1264px){.pa-lg-7{padding:28px !important}.pa-lg-n7{padding:-28px !important}}@media only screen and (min-width: 1904px){.pa-xl-7{padding:28px !important}.pa-xl-n7{padding:-28px !important}}.pl-7{padding-left:28px !important}.pl-n7{padding-left:-28px !important}@media only screen and (min-width: 600px){.pl-sm-7{padding-left:28px !important}.pl-sm-n7{padding-left:-28px !important}}@media only screen and (min-width: 960px){.pl-md-7{padding-left:28px !important}.pl-md-n7{padding-left:-28px !important}}@media only screen and (min-width: 1264px){.pl-lg-7{padding-left:28px !important}.pl-lg-n7{padding-left:-28px !important}}@media only screen and (min-width: 1904px){.pl-xl-7{padding-left:28px !important}.pl-xl-n7{padding-left:-28px !important}}.pr-7{padding-right:28px !important}.pr-n7{padding-right:-28px !important}@media only screen and (min-width: 600px){.pr-sm-7{padding-right:28px !important}.pr-sm-n7{padding-right:-28px !important}}@media only screen and (min-width: 960px){.pr-md-7{padding-right:28px !important}.pr-md-n7{padding-right:-28px !important}}@media only screen and (min-width: 1264px){.pr-lg-7{padding-right:28px !important}.pr-lg-n7{padding-right:-28px !important}}@media only screen and (min-width: 1904px){.pr-xl-7{padding-right:28px !important}.pr-xl-n7{padding-right:-28px !important}}.pt-7{padding-top:28px !important}.pt-n7{padding-top:-28px !important}@media only screen and (min-width: 600px){.pt-sm-7{padding-top:28px !important}.pt-sm-n7{padding-top:-28px !important}}@media only screen and (min-width: 960px){.pt-md-7{padding-top:28px !important}.pt-md-n7{padding-top:-28px !important}}@media only screen and (min-width: 1264px){.pt-lg-7{padding-top:28px !important}.pt-lg-n7{padding-top:-28px !important}}@media only screen and (min-width: 1904px){.pt-xl-7{padding-top:28px !important}.pt-xl-n7{padding-top:-28px !important}}.pb-7{padding-bottom:28px !important}.pb-n7{padding-bottom:-28px !important}@media only screen and (min-width: 600px){.pb-sm-7{padding-bottom:28px !important}.pb-sm-n7{padding-bottom:-28px !important}}@media only screen and (min-width: 960px){.pb-md-7{padding-bottom:28px !important}.pb-md-n7{padding-bottom:-28px !important}}@media only screen and (min-width: 1264px){.pb-lg-7{padding-bottom:28px !important}.pb-lg-n7{padding-bottom:-28px !important}}@media only screen and (min-width: 1904px){.pb-xl-7{padding-bottom:28px !important}.pb-xl-n7{padding-bottom:-28px !important}}.ma-8{margin:32px !important}.ma-n8{margin:-32px !important}@media only screen and (min-width: 600px){.ma-sm-8{margin:32px !important}.ma-sm-n8{margin:-32px !important}}@media only screen and (min-width: 960px){.ma-md-8{margin:32px !important}.ma-md-n8{margin:-32px !important}}@media only screen and (min-width: 1264px){.ma-lg-8{margin:32px !important}.ma-lg-n8{margin:-32px !important}}@media only screen and (min-width: 1904px){.ma-xl-8{margin:32px !important}.ma-xl-n8{margin:-32px !important}}.ml-8{margin-left:32px !important}.ml-n8{margin-left:-32px !important}@media only screen and (min-width: 600px){.ml-sm-8{margin-left:32px !important}.ml-sm-n8{margin-left:-32px !important}}@media only screen and (min-width: 960px){.ml-md-8{margin-left:32px !important}.ml-md-n8{margin-left:-32px !important}}@media only screen and (min-width: 1264px){.ml-lg-8{margin-left:32px !important}.ml-lg-n8{margin-left:-32px !important}}@media only screen and (min-width: 1904px){.ml-xl-8{margin-left:32px !important}.ml-xl-n8{margin-left:-32px !important}}.mr-8{margin-right:32px !important}.mr-n8{margin-right:-32px !important}@media only screen and (min-width: 600px){.mr-sm-8{margin-right:32px !important}.mr-sm-n8{margin-right:-32px !important}}@media only screen and (min-width: 960px){.mr-md-8{margin-right:32px !important}.mr-md-n8{margin-right:-32px !important}}@media only screen and (min-width: 1264px){.mr-lg-8{margin-right:32px !important}.mr-lg-n8{margin-right:-32px !important}}@media only screen and (min-width: 1904px){.mr-xl-8{margin-right:32px !important}.mr-xl-n8{margin-right:-32px !important}}.mt-8{margin-top:32px !important}.mt-n8{margin-top:-32px !important}@media only screen and (min-width: 600px){.mt-sm-8{margin-top:32px !important}.mt-sm-n8{margin-top:-32px !important}}@media only screen and (min-width: 960px){.mt-md-8{margin-top:32px !important}.mt-md-n8{margin-top:-32px !important}}@media only screen and (min-width: 1264px){.mt-lg-8{margin-top:32px !important}.mt-lg-n8{margin-top:-32px !important}}@media only screen and (min-width: 1904px){.mt-xl-8{margin-top:32px !important}.mt-xl-n8{margin-top:-32px !important}}.mb-8{margin-bottom:32px !important}.mb-n8{margin-bottom:-32px !important}@media only screen and (min-width: 600px){.mb-sm-8{margin-bottom:32px !important}.mb-sm-n8{margin-bottom:-32px !important}}@media only screen and (min-width: 960px){.mb-md-8{margin-bottom:32px !important}.mb-md-n8{margin-bottom:-32px !important}}@media only screen and (min-width: 1264px){.mb-lg-8{margin-bottom:32px !important}.mb-lg-n8{margin-bottom:-32px !important}}@media only screen and (min-width: 1904px){.mb-xl-8{margin-bottom:32px !important}.mb-xl-n8{margin-bottom:-32px !important}}.pa-8{padding:32px !important}.pa-n8{padding:-32px !important}@media only screen and (min-width: 600px){.pa-sm-8{padding:32px !important}.pa-sm-n8{padding:-32px !important}}@media only screen and (min-width: 960px){.pa-md-8{padding:32px !important}.pa-md-n8{padding:-32px !important}}@media only screen and (min-width: 1264px){.pa-lg-8{padding:32px !important}.pa-lg-n8{padding:-32px !important}}@media only screen and (min-width: 1904px){.pa-xl-8{padding:32px !important}.pa-xl-n8{padding:-32px !important}}.pl-8{padding-left:32px !important}.pl-n8{padding-left:-32px !important}@media only screen and (min-width: 600px){.pl-sm-8{padding-left:32px !important}.pl-sm-n8{padding-left:-32px !important}}@media only screen and (min-width: 960px){.pl-md-8{padding-left:32px !important}.pl-md-n8{padding-left:-32px !important}}@media only screen and (min-width: 1264px){.pl-lg-8{padding-left:32px !important}.pl-lg-n8{padding-left:-32px !important}}@media only screen and (min-width: 1904px){.pl-xl-8{padding-left:32px !important}.pl-xl-n8{padding-left:-32px !important}}.pr-8{padding-right:32px !important}.pr-n8{padding-right:-32px !important}@media only screen and (min-width: 600px){.pr-sm-8{padding-right:32px !important}.pr-sm-n8{padding-right:-32px !important}}@media only screen and (min-width: 960px){.pr-md-8{padding-right:32px !important}.pr-md-n8{padding-right:-32px !important}}@media only screen and (min-width: 1264px){.pr-lg-8{padding-right:32px !important}.pr-lg-n8{padding-right:-32px !important}}@media only screen and (min-width: 1904px){.pr-xl-8{padding-right:32px !important}.pr-xl-n8{padding-right:-32px !important}}.pt-8{padding-top:32px !important}.pt-n8{padding-top:-32px !important}@media only screen and (min-width: 600px){.pt-sm-8{padding-top:32px !important}.pt-sm-n8{padding-top:-32px !important}}@media only screen and (min-width: 960px){.pt-md-8{padding-top:32px !important}.pt-md-n8{padding-top:-32px !important}}@media only screen and (min-width: 1264px){.pt-lg-8{padding-top:32px !important}.pt-lg-n8{padding-top:-32px !important}}@media only screen and (min-width: 1904px){.pt-xl-8{padding-top:32px !important}.pt-xl-n8{padding-top:-32px !important}}.pb-8{padding-bottom:32px !important}.pb-n8{padding-bottom:-32px !important}@media only screen and (min-width: 600px){.pb-sm-8{padding-bottom:32px !important}.pb-sm-n8{padding-bottom:-32px !important}}@media only screen and (min-width: 960px){.pb-md-8{padding-bottom:32px !important}.pb-md-n8{padding-bottom:-32px !important}}@media only screen and (min-width: 1264px){.pb-lg-8{padding-bottom:32px !important}.pb-lg-n8{padding-bottom:-32px !important}}@media only screen and (min-width: 1904px){.pb-xl-8{padding-bottom:32px !important}.pb-xl-n8{padding-bottom:-32px !important}}.ma-9{margin:36px !important}.ma-n9{margin:-36px !important}@media only screen and (min-width: 600px){.ma-sm-9{margin:36px !important}.ma-sm-n9{margin:-36px !important}}@media only screen and (min-width: 960px){.ma-md-9{margin:36px !important}.ma-md-n9{margin:-36px !important}}@media only screen and (min-width: 1264px){.ma-lg-9{margin:36px !important}.ma-lg-n9{margin:-36px !important}}@media only screen and (min-width: 1904px){.ma-xl-9{margin:36px !important}.ma-xl-n9{margin:-36px !important}}.ml-9{margin-left:36px !important}.ml-n9{margin-left:-36px !important}@media only screen and (min-width: 600px){.ml-sm-9{margin-left:36px !important}.ml-sm-n9{margin-left:-36px !important}}@media only screen and (min-width: 960px){.ml-md-9{margin-left:36px !important}.ml-md-n9{margin-left:-36px !important}}@media only screen and (min-width: 1264px){.ml-lg-9{margin-left:36px !important}.ml-lg-n9{margin-left:-36px !important}}@media only screen and (min-width: 1904px){.ml-xl-9{margin-left:36px !important}.ml-xl-n9{margin-left:-36px !important}}.mr-9{margin-right:36px !important}.mr-n9{margin-right:-36px !important}@media only screen and (min-width: 600px){.mr-sm-9{margin-right:36px !important}.mr-sm-n9{margin-right:-36px !important}}@media only screen and (min-width: 960px){.mr-md-9{margin-right:36px !important}.mr-md-n9{margin-right:-36px !important}}@media only screen and (min-width: 1264px){.mr-lg-9{margin-right:36px !important}.mr-lg-n9{margin-right:-36px !important}}@media only screen and (min-width: 1904px){.mr-xl-9{margin-right:36px !important}.mr-xl-n9{margin-right:-36px !important}}.mt-9{margin-top:36px !important}.mt-n9{margin-top:-36px !important}@media only screen and (min-width: 600px){.mt-sm-9{margin-top:36px !important}.mt-sm-n9{margin-top:-36px !important}}@media only screen and (min-width: 960px){.mt-md-9{margin-top:36px !important}.mt-md-n9{margin-top:-36px !important}}@media only screen and (min-width: 1264px){.mt-lg-9{margin-top:36px !important}.mt-lg-n9{margin-top:-36px !important}}@media only screen and (min-width: 1904px){.mt-xl-9{margin-top:36px !important}.mt-xl-n9{margin-top:-36px !important}}.mb-9{margin-bottom:36px !important}.mb-n9{margin-bottom:-36px !important}@media only screen and (min-width: 600px){.mb-sm-9{margin-bottom:36px !important}.mb-sm-n9{margin-bottom:-36px !important}}@media only screen and (min-width: 960px){.mb-md-9{margin-bottom:36px !important}.mb-md-n9{margin-bottom:-36px !important}}@media only screen and (min-width: 1264px){.mb-lg-9{margin-bottom:36px !important}.mb-lg-n9{margin-bottom:-36px !important}}@media only screen and (min-width: 1904px){.mb-xl-9{margin-bottom:36px !important}.mb-xl-n9{margin-bottom:-36px !important}}.pa-9{padding:36px !important}.pa-n9{padding:-36px !important}@media only screen and (min-width: 600px){.pa-sm-9{padding:36px !important}.pa-sm-n9{padding:-36px !important}}@media only screen and (min-width: 960px){.pa-md-9{padding:36px !important}.pa-md-n9{padding:-36px !important}}@media only screen and (min-width: 1264px){.pa-lg-9{padding:36px !important}.pa-lg-n9{padding:-36px !important}}@media only screen and (min-width: 1904px){.pa-xl-9{padding:36px !important}.pa-xl-n9{padding:-36px !important}}.pl-9{padding-left:36px !important}.pl-n9{padding-left:-36px !important}@media only screen and (min-width: 600px){.pl-sm-9{padding-left:36px !important}.pl-sm-n9{padding-left:-36px !important}}@media only screen and (min-width: 960px){.pl-md-9{padding-left:36px !important}.pl-md-n9{padding-left:-36px !important}}@media only screen and (min-width: 1264px){.pl-lg-9{padding-left:36px !important}.pl-lg-n9{padding-left:-36px !important}}@media only screen and (min-width: 1904px){.pl-xl-9{padding-left:36px !important}.pl-xl-n9{padding-left:-36px !important}}.pr-9{padding-right:36px !important}.pr-n9{padding-right:-36px !important}@media only screen and (min-width: 600px){.pr-sm-9{padding-right:36px !important}.pr-sm-n9{padding-right:-36px !important}}@media only screen and (min-width: 960px){.pr-md-9{padding-right:36px !important}.pr-md-n9{padding-right:-36px !important}}@media only screen and (min-width: 1264px){.pr-lg-9{padding-right:36px !important}.pr-lg-n9{padding-right:-36px !important}}@media only screen and (min-width: 1904px){.pr-xl-9{padding-right:36px !important}.pr-xl-n9{padding-right:-36px !important}}.pt-9{padding-top:36px !important}.pt-n9{padding-top:-36px !important}@media only screen and (min-width: 600px){.pt-sm-9{padding-top:36px !important}.pt-sm-n9{padding-top:-36px !important}}@media only screen and (min-width: 960px){.pt-md-9{padding-top:36px !important}.pt-md-n9{padding-top:-36px !important}}@media only screen and (min-width: 1264px){.pt-lg-9{padding-top:36px !important}.pt-lg-n9{padding-top:-36px !important}}@media only screen and (min-width: 1904px){.pt-xl-9{padding-top:36px !important}.pt-xl-n9{padding-top:-36px !important}}.pb-9{padding-bottom:36px !important}.pb-n9{padding-bottom:-36px !important}@media only screen and (min-width: 600px){.pb-sm-9{padding-bottom:36px !important}.pb-sm-n9{padding-bottom:-36px !important}}@media only screen and (min-width: 960px){.pb-md-9{padding-bottom:36px !important}.pb-md-n9{padding-bottom:-36px !important}}@media only screen and (min-width: 1264px){.pb-lg-9{padding-bottom:36px !important}.pb-lg-n9{padding-bottom:-36px !important}}@media only screen and (min-width: 1904px){.pb-xl-9{padding-bottom:36px !important}.pb-xl-n9{padding-bottom:-36px !important}}.ma-10{margin:40px !important}.ma-n10{margin:-40px !important}@media only screen and (min-width: 600px){.ma-sm-10{margin:40px !important}.ma-sm-n10{margin:-40px !important}}@media only screen and (min-width: 960px){.ma-md-10{margin:40px !important}.ma-md-n10{margin:-40px !important}}@media only screen and (min-width: 1264px){.ma-lg-10{margin:40px !important}.ma-lg-n10{margin:-40px !important}}@media only screen and (min-width: 1904px){.ma-xl-10{margin:40px !important}.ma-xl-n10{margin:-40px !important}}.ml-10{margin-left:40px !important}.ml-n10{margin-left:-40px !important}@media only screen and (min-width: 600px){.ml-sm-10{margin-left:40px !important}.ml-sm-n10{margin-left:-40px !important}}@media only screen and (min-width: 960px){.ml-md-10{margin-left:40px !important}.ml-md-n10{margin-left:-40px !important}}@media only screen and (min-width: 1264px){.ml-lg-10{margin-left:40px !important}.ml-lg-n10{margin-left:-40px !important}}@media only screen and (min-width: 1904px){.ml-xl-10{margin-left:40px !important}.ml-xl-n10{margin-left:-40px !important}}.mr-10{margin-right:40px !important}.mr-n10{margin-right:-40px !important}@media only screen and (min-width: 600px){.mr-sm-10{margin-right:40px !important}.mr-sm-n10{margin-right:-40px !important}}@media only screen and (min-width: 960px){.mr-md-10{margin-right:40px !important}.mr-md-n10{margin-right:-40px !important}}@media only screen and (min-width: 1264px){.mr-lg-10{margin-right:40px !important}.mr-lg-n10{margin-right:-40px !important}}@media only screen and (min-width: 1904px){.mr-xl-10{margin-right:40px !important}.mr-xl-n10{margin-right:-40px !important}}.mt-10{margin-top:40px !important}.mt-n10{margin-top:-40px !important}@media only screen and (min-width: 600px){.mt-sm-10{margin-top:40px !important}.mt-sm-n10{margin-top:-40px !important}}@media only screen and (min-width: 960px){.mt-md-10{margin-top:40px !important}.mt-md-n10{margin-top:-40px !important}}@media only screen and (min-width: 1264px){.mt-lg-10{margin-top:40px !important}.mt-lg-n10{margin-top:-40px !important}}@media only screen and (min-width: 1904px){.mt-xl-10{margin-top:40px !important}.mt-xl-n10{margin-top:-40px !important}}.mb-10{margin-bottom:40px !important}.mb-n10{margin-bottom:-40px !important}@media only screen and (min-width: 600px){.mb-sm-10{margin-bottom:40px !important}.mb-sm-n10{margin-bottom:-40px !important}}@media only screen and (min-width: 960px){.mb-md-10{margin-bottom:40px !important}.mb-md-n10{margin-bottom:-40px !important}}@media only screen and (min-width: 1264px){.mb-lg-10{margin-bottom:40px !important}.mb-lg-n10{margin-bottom:-40px !important}}@media only screen and (min-width: 1904px){.mb-xl-10{margin-bottom:40px !important}.mb-xl-n10{margin-bottom:-40px !important}}.pa-10{padding:40px !important}.pa-n10{padding:-40px !important}@media only screen and (min-width: 600px){.pa-sm-10{padding:40px !important}.pa-sm-n10{padding:-40px !important}}@media only screen and (min-width: 960px){.pa-md-10{padding:40px !important}.pa-md-n10{padding:-40px !important}}@media only screen and (min-width: 1264px){.pa-lg-10{padding:40px !important}.pa-lg-n10{padding:-40px !important}}@media only screen and (min-width: 1904px){.pa-xl-10{padding:40px !important}.pa-xl-n10{padding:-40px !important}}.pl-10{padding-left:40px !important}.pl-n10{padding-left:-40px !important}@media only screen and (min-width: 600px){.pl-sm-10{padding-left:40px !important}.pl-sm-n10{padding-left:-40px !important}}@media only screen and (min-width: 960px){.pl-md-10{padding-left:40px !important}.pl-md-n10{padding-left:-40px !important}}@media only screen and (min-width: 1264px){.pl-lg-10{padding-left:40px !important}.pl-lg-n10{padding-left:-40px !important}}@media only screen and (min-width: 1904px){.pl-xl-10{padding-left:40px !important}.pl-xl-n10{padding-left:-40px !important}}.pr-10{padding-right:40px !important}.pr-n10{padding-right:-40px !important}@media only screen and (min-width: 600px){.pr-sm-10{padding-right:40px !important}.pr-sm-n10{padding-right:-40px !important}}@media only screen and (min-width: 960px){.pr-md-10{padding-right:40px !important}.pr-md-n10{padding-right:-40px !important}}@media only screen and (min-width: 1264px){.pr-lg-10{padding-right:40px !important}.pr-lg-n10{padding-right:-40px !important}}@media only screen and (min-width: 1904px){.pr-xl-10{padding-right:40px !important}.pr-xl-n10{padding-right:-40px !important}}.pt-10{padding-top:40px !important}.pt-n10{padding-top:-40px !important}@media only screen and (min-width: 600px){.pt-sm-10{padding-top:40px !important}.pt-sm-n10{padding-top:-40px !important}}@media only screen and (min-width: 960px){.pt-md-10{padding-top:40px !important}.pt-md-n10{padding-top:-40px !important}}@media only screen and (min-width: 1264px){.pt-lg-10{padding-top:40px !important}.pt-lg-n10{padding-top:-40px !important}}@media only screen and (min-width: 1904px){.pt-xl-10{padding-top:40px !important}.pt-xl-n10{padding-top:-40px !important}}.pb-10{padding-bottom:40px !important}.pb-n10{padding-bottom:-40px !important}@media only screen and (min-width: 600px){.pb-sm-10{padding-bottom:40px !important}.pb-sm-n10{padding-bottom:-40px !important}}@media only screen and (min-width: 960px){.pb-md-10{padding-bottom:40px !important}.pb-md-n10{padding-bottom:-40px !important}}@media only screen and (min-width: 1264px){.pb-lg-10{padding-bottom:40px !important}.pb-lg-n10{padding-bottom:-40px !important}}@media only screen and (min-width: 1904px){.pb-xl-10{padding-bottom:40px !important}.pb-xl-n10{padding-bottom:-40px !important}}.ma-11{margin:44px !important}.ma-n11{margin:-44px !important}@media only screen and (min-width: 600px){.ma-sm-11{margin:44px !important}.ma-sm-n11{margin:-44px !important}}@media only screen and (min-width: 960px){.ma-md-11{margin:44px !important}.ma-md-n11{margin:-44px !important}}@media only screen and (min-width: 1264px){.ma-lg-11{margin:44px !important}.ma-lg-n11{margin:-44px !important}}@media only screen and (min-width: 1904px){.ma-xl-11{margin:44px !important}.ma-xl-n11{margin:-44px !important}}.ml-11{margin-left:44px !important}.ml-n11{margin-left:-44px !important}@media only screen and (min-width: 600px){.ml-sm-11{margin-left:44px !important}.ml-sm-n11{margin-left:-44px !important}}@media only screen and (min-width: 960px){.ml-md-11{margin-left:44px !important}.ml-md-n11{margin-left:-44px !important}}@media only screen and (min-width: 1264px){.ml-lg-11{margin-left:44px !important}.ml-lg-n11{margin-left:-44px !important}}@media only screen and (min-width: 1904px){.ml-xl-11{margin-left:44px !important}.ml-xl-n11{margin-left:-44px !important}}.mr-11{margin-right:44px !important}.mr-n11{margin-right:-44px !important}@media only screen and (min-width: 600px){.mr-sm-11{margin-right:44px !important}.mr-sm-n11{margin-right:-44px !important}}@media only screen and (min-width: 960px){.mr-md-11{margin-right:44px !important}.mr-md-n11{margin-right:-44px !important}}@media only screen and (min-width: 1264px){.mr-lg-11{margin-right:44px !important}.mr-lg-n11{margin-right:-44px !important}}@media only screen and (min-width: 1904px){.mr-xl-11{margin-right:44px !important}.mr-xl-n11{margin-right:-44px !important}}.mt-11{margin-top:44px !important}.mt-n11{margin-top:-44px !important}@media only screen and (min-width: 600px){.mt-sm-11{margin-top:44px !important}.mt-sm-n11{margin-top:-44px !important}}@media only screen and (min-width: 960px){.mt-md-11{margin-top:44px !important}.mt-md-n11{margin-top:-44px !important}}@media only screen and (min-width: 1264px){.mt-lg-11{margin-top:44px !important}.mt-lg-n11{margin-top:-44px !important}}@media only screen and (min-width: 1904px){.mt-xl-11{margin-top:44px !important}.mt-xl-n11{margin-top:-44px !important}}.mb-11{margin-bottom:44px !important}.mb-n11{margin-bottom:-44px !important}@media only screen and (min-width: 600px){.mb-sm-11{margin-bottom:44px !important}.mb-sm-n11{margin-bottom:-44px !important}}@media only screen and (min-width: 960px){.mb-md-11{margin-bottom:44px !important}.mb-md-n11{margin-bottom:-44px !important}}@media only screen and (min-width: 1264px){.mb-lg-11{margin-bottom:44px !important}.mb-lg-n11{margin-bottom:-44px !important}}@media only screen and (min-width: 1904px){.mb-xl-11{margin-bottom:44px !important}.mb-xl-n11{margin-bottom:-44px !important}}.pa-11{padding:44px !important}.pa-n11{padding:-44px !important}@media only screen and (min-width: 600px){.pa-sm-11{padding:44px !important}.pa-sm-n11{padding:-44px !important}}@media only screen and (min-width: 960px){.pa-md-11{padding:44px !important}.pa-md-n11{padding:-44px !important}}@media only screen and (min-width: 1264px){.pa-lg-11{padding:44px !important}.pa-lg-n11{padding:-44px !important}}@media only screen and (min-width: 1904px){.pa-xl-11{padding:44px !important}.pa-xl-n11{padding:-44px !important}}.pl-11{padding-left:44px !important}.pl-n11{padding-left:-44px !important}@media only screen and (min-width: 600px){.pl-sm-11{padding-left:44px !important}.pl-sm-n11{padding-left:-44px !important}}@media only screen and (min-width: 960px){.pl-md-11{padding-left:44px !important}.pl-md-n11{padding-left:-44px !important}}@media only screen and (min-width: 1264px){.pl-lg-11{padding-left:44px !important}.pl-lg-n11{padding-left:-44px !important}}@media only screen and (min-width: 1904px){.pl-xl-11{padding-left:44px !important}.pl-xl-n11{padding-left:-44px !important}}.pr-11{padding-right:44px !important}.pr-n11{padding-right:-44px !important}@media only screen and (min-width: 600px){.pr-sm-11{padding-right:44px !important}.pr-sm-n11{padding-right:-44px !important}}@media only screen and (min-width: 960px){.pr-md-11{padding-right:44px !important}.pr-md-n11{padding-right:-44px !important}}@media only screen and (min-width: 1264px){.pr-lg-11{padding-right:44px !important}.pr-lg-n11{padding-right:-44px !important}}@media only screen and (min-width: 1904px){.pr-xl-11{padding-right:44px !important}.pr-xl-n11{padding-right:-44px !important}}.pt-11{padding-top:44px !important}.pt-n11{padding-top:-44px !important}@media only screen and (min-width: 600px){.pt-sm-11{padding-top:44px !important}.pt-sm-n11{padding-top:-44px !important}}@media only screen and (min-width: 960px){.pt-md-11{padding-top:44px !important}.pt-md-n11{padding-top:-44px !important}}@media only screen and (min-width: 1264px){.pt-lg-11{padding-top:44px !important}.pt-lg-n11{padding-top:-44px !important}}@media only screen and (min-width: 1904px){.pt-xl-11{padding-top:44px !important}.pt-xl-n11{padding-top:-44px !important}}.pb-11{padding-bottom:44px !important}.pb-n11{padding-bottom:-44px !important}@media only screen and (min-width: 600px){.pb-sm-11{padding-bottom:44px !important}.pb-sm-n11{padding-bottom:-44px !important}}@media only screen and (min-width: 960px){.pb-md-11{padding-bottom:44px !important}.pb-md-n11{padding-bottom:-44px !important}}@media only screen and (min-width: 1264px){.pb-lg-11{padding-bottom:44px !important}.pb-lg-n11{padding-bottom:-44px !important}}@media only screen and (min-width: 1904px){.pb-xl-11{padding-bottom:44px !important}.pb-xl-n11{padding-bottom:-44px !important}}.ma-12{margin:48px !important}.ma-n12{margin:-48px !important}@media only screen and (min-width: 600px){.ma-sm-12{margin:48px !important}.ma-sm-n12{margin:-48px !important}}@media only screen and (min-width: 960px){.ma-md-12{margin:48px !important}.ma-md-n12{margin:-48px !important}}@media only screen and (min-width: 1264px){.ma-lg-12{margin:48px !important}.ma-lg-n12{margin:-48px !important}}@media only screen and (min-width: 1904px){.ma-xl-12{margin:48px !important}.ma-xl-n12{margin:-48px !important}}.ml-12{margin-left:48px !important}.ml-n12{margin-left:-48px !important}@media only screen and (min-width: 600px){.ml-sm-12{margin-left:48px !important}.ml-sm-n12{margin-left:-48px !important}}@media only screen and (min-width: 960px){.ml-md-12{margin-left:48px !important}.ml-md-n12{margin-left:-48px !important}}@media only screen and (min-width: 1264px){.ml-lg-12{margin-left:48px !important}.ml-lg-n12{margin-left:-48px !important}}@media only screen and (min-width: 1904px){.ml-xl-12{margin-left:48px !important}.ml-xl-n12{margin-left:-48px !important}}.mr-12{margin-right:48px !important}.mr-n12{margin-right:-48px !important}@media only screen and (min-width: 600px){.mr-sm-12{margin-right:48px !important}.mr-sm-n12{margin-right:-48px !important}}@media only screen and (min-width: 960px){.mr-md-12{margin-right:48px !important}.mr-md-n12{margin-right:-48px !important}}@media only screen and (min-width: 1264px){.mr-lg-12{margin-right:48px !important}.mr-lg-n12{margin-right:-48px !important}}@media only screen and (min-width: 1904px){.mr-xl-12{margin-right:48px !important}.mr-xl-n12{margin-right:-48px !important}}.mt-12{margin-top:48px !important}.mt-n12{margin-top:-48px !important}@media only screen and (min-width: 600px){.mt-sm-12{margin-top:48px !important}.mt-sm-n12{margin-top:-48px !important}}@media only screen and (min-width: 960px){.mt-md-12{margin-top:48px !important}.mt-md-n12{margin-top:-48px !important}}@media only screen and (min-width: 1264px){.mt-lg-12{margin-top:48px !important}.mt-lg-n12{margin-top:-48px !important}}@media only screen and (min-width: 1904px){.mt-xl-12{margin-top:48px !important}.mt-xl-n12{margin-top:-48px !important}}.mb-12{margin-bottom:48px !important}.mb-n12{margin-bottom:-48px !important}@media only screen and (min-width: 600px){.mb-sm-12{margin-bottom:48px !important}.mb-sm-n12{margin-bottom:-48px !important}}@media only screen and (min-width: 960px){.mb-md-12{margin-bottom:48px !important}.mb-md-n12{margin-bottom:-48px !important}}@media only screen and (min-width: 1264px){.mb-lg-12{margin-bottom:48px !important}.mb-lg-n12{margin-bottom:-48px !important}}@media only screen and (min-width: 1904px){.mb-xl-12{margin-bottom:48px !important}.mb-xl-n12{margin-bottom:-48px !important}}.pa-12{padding:48px !important}.pa-n12{padding:-48px !important}@media only screen and (min-width: 600px){.pa-sm-12{padding:48px !important}.pa-sm-n12{padding:-48px !important}}@media only screen and (min-width: 960px){.pa-md-12{padding:48px !important}.pa-md-n12{padding:-48px !important}}@media only screen and (min-width: 1264px){.pa-lg-12{padding:48px !important}.pa-lg-n12{padding:-48px !important}}@media only screen and (min-width: 1904px){.pa-xl-12{padding:48px !important}.pa-xl-n12{padding:-48px !important}}.pl-12{padding-left:48px !important}.pl-n12{padding-left:-48px !important}@media only screen and (min-width: 600px){.pl-sm-12{padding-left:48px !important}.pl-sm-n12{padding-left:-48px !important}}@media only screen and (min-width: 960px){.pl-md-12{padding-left:48px !important}.pl-md-n12{padding-left:-48px !important}}@media only screen and (min-width: 1264px){.pl-lg-12{padding-left:48px !important}.pl-lg-n12{padding-left:-48px !important}}@media only screen and (min-width: 1904px){.pl-xl-12{padding-left:48px !important}.pl-xl-n12{padding-left:-48px !important}}.pr-12{padding-right:48px !important}.pr-n12{padding-right:-48px !important}@media only screen and (min-width: 600px){.pr-sm-12{padding-right:48px !important}.pr-sm-n12{padding-right:-48px !important}}@media only screen and (min-width: 960px){.pr-md-12{padding-right:48px !important}.pr-md-n12{padding-right:-48px !important}}@media only screen and (min-width: 1264px){.pr-lg-12{padding-right:48px !important}.pr-lg-n12{padding-right:-48px !important}}@media only screen and (min-width: 1904px){.pr-xl-12{padding-right:48px !important}.pr-xl-n12{padding-right:-48px !important}}.pt-12{padding-top:48px !important}.pt-n12{padding-top:-48px !important}@media only screen and (min-width: 600px){.pt-sm-12{padding-top:48px !important}.pt-sm-n12{padding-top:-48px !important}}@media only screen and (min-width: 960px){.pt-md-12{padding-top:48px !important}.pt-md-n12{padding-top:-48px !important}}@media only screen and (min-width: 1264px){.pt-lg-12{padding-top:48px !important}.pt-lg-n12{padding-top:-48px !important}}@media only screen and (min-width: 1904px){.pt-xl-12{padding-top:48px !important}.pt-xl-n12{padding-top:-48px !important}}.pb-12{padding-bottom:48px !important}.pb-n12{padding-bottom:-48px !important}@media only screen and (min-width: 600px){.pb-sm-12{padding-bottom:48px !important}.pb-sm-n12{padding-bottom:-48px !important}}@media only screen and (min-width: 960px){.pb-md-12{padding-bottom:48px !important}.pb-md-n12{padding-bottom:-48px !important}}@media only screen and (min-width: 1264px){.pb-lg-12{padding-bottom:48px !important}.pb-lg-n12{padding-bottom:-48px !important}}@media only screen and (min-width: 1904px){.pb-xl-12{padding-bottom:48px !important}.pb-xl-n12{padding-bottom:-48px !important}}.ma-13{margin:52px !important}.ma-n13{margin:-52px !important}@media only screen and (min-width: 600px){.ma-sm-13{margin:52px !important}.ma-sm-n13{margin:-52px !important}}@media only screen and (min-width: 960px){.ma-md-13{margin:52px !important}.ma-md-n13{margin:-52px !important}}@media only screen and (min-width: 1264px){.ma-lg-13{margin:52px !important}.ma-lg-n13{margin:-52px !important}}@media only screen and (min-width: 1904px){.ma-xl-13{margin:52px !important}.ma-xl-n13{margin:-52px !important}}.ml-13{margin-left:52px !important}.ml-n13{margin-left:-52px !important}@media only screen and (min-width: 600px){.ml-sm-13{margin-left:52px !important}.ml-sm-n13{margin-left:-52px !important}}@media only screen and (min-width: 960px){.ml-md-13{margin-left:52px !important}.ml-md-n13{margin-left:-52px !important}}@media only screen and (min-width: 1264px){.ml-lg-13{margin-left:52px !important}.ml-lg-n13{margin-left:-52px !important}}@media only screen and (min-width: 1904px){.ml-xl-13{margin-left:52px !important}.ml-xl-n13{margin-left:-52px !important}}.mr-13{margin-right:52px !important}.mr-n13{margin-right:-52px !important}@media only screen and (min-width: 600px){.mr-sm-13{margin-right:52px !important}.mr-sm-n13{margin-right:-52px !important}}@media only screen and (min-width: 960px){.mr-md-13{margin-right:52px !important}.mr-md-n13{margin-right:-52px !important}}@media only screen and (min-width: 1264px){.mr-lg-13{margin-right:52px !important}.mr-lg-n13{margin-right:-52px !important}}@media only screen and (min-width: 1904px){.mr-xl-13{margin-right:52px !important}.mr-xl-n13{margin-right:-52px !important}}.mt-13{margin-top:52px !important}.mt-n13{margin-top:-52px !important}@media only screen and (min-width: 600px){.mt-sm-13{margin-top:52px !important}.mt-sm-n13{margin-top:-52px !important}}@media only screen and (min-width: 960px){.mt-md-13{margin-top:52px !important}.mt-md-n13{margin-top:-52px !important}}@media only screen and (min-width: 1264px){.mt-lg-13{margin-top:52px !important}.mt-lg-n13{margin-top:-52px !important}}@media only screen and (min-width: 1904px){.mt-xl-13{margin-top:52px !important}.mt-xl-n13{margin-top:-52px !important}}.mb-13{margin-bottom:52px !important}.mb-n13{margin-bottom:-52px !important}@media only screen and (min-width: 600px){.mb-sm-13{margin-bottom:52px !important}.mb-sm-n13{margin-bottom:-52px !important}}@media only screen and (min-width: 960px){.mb-md-13{margin-bottom:52px !important}.mb-md-n13{margin-bottom:-52px !important}}@media only screen and (min-width: 1264px){.mb-lg-13{margin-bottom:52px !important}.mb-lg-n13{margin-bottom:-52px !important}}@media only screen and (min-width: 1904px){.mb-xl-13{margin-bottom:52px !important}.mb-xl-n13{margin-bottom:-52px !important}}.pa-13{padding:52px !important}.pa-n13{padding:-52px !important}@media only screen and (min-width: 600px){.pa-sm-13{padding:52px !important}.pa-sm-n13{padding:-52px !important}}@media only screen and (min-width: 960px){.pa-md-13{padding:52px !important}.pa-md-n13{padding:-52px !important}}@media only screen and (min-width: 1264px){.pa-lg-13{padding:52px !important}.pa-lg-n13{padding:-52px !important}}@media only screen and (min-width: 1904px){.pa-xl-13{padding:52px !important}.pa-xl-n13{padding:-52px !important}}.pl-13{padding-left:52px !important}.pl-n13{padding-left:-52px !important}@media only screen and (min-width: 600px){.pl-sm-13{padding-left:52px !important}.pl-sm-n13{padding-left:-52px !important}}@media only screen and (min-width: 960px){.pl-md-13{padding-left:52px !important}.pl-md-n13{padding-left:-52px !important}}@media only screen and (min-width: 1264px){.pl-lg-13{padding-left:52px !important}.pl-lg-n13{padding-left:-52px !important}}@media only screen and (min-width: 1904px){.pl-xl-13{padding-left:52px !important}.pl-xl-n13{padding-left:-52px !important}}.pr-13{padding-right:52px !important}.pr-n13{padding-right:-52px !important}@media only screen and (min-width: 600px){.pr-sm-13{padding-right:52px !important}.pr-sm-n13{padding-right:-52px !important}}@media only screen and (min-width: 960px){.pr-md-13{padding-right:52px !important}.pr-md-n13{padding-right:-52px !important}}@media only screen and (min-width: 1264px){.pr-lg-13{padding-right:52px !important}.pr-lg-n13{padding-right:-52px !important}}@media only screen and (min-width: 1904px){.pr-xl-13{padding-right:52px !important}.pr-xl-n13{padding-right:-52px !important}}.pt-13{padding-top:52px !important}.pt-n13{padding-top:-52px !important}@media only screen and (min-width: 600px){.pt-sm-13{padding-top:52px !important}.pt-sm-n13{padding-top:-52px !important}}@media only screen and (min-width: 960px){.pt-md-13{padding-top:52px !important}.pt-md-n13{padding-top:-52px !important}}@media only screen and (min-width: 1264px){.pt-lg-13{padding-top:52px !important}.pt-lg-n13{padding-top:-52px !important}}@media only screen and (min-width: 1904px){.pt-xl-13{padding-top:52px !important}.pt-xl-n13{padding-top:-52px !important}}.pb-13{padding-bottom:52px !important}.pb-n13{padding-bottom:-52px !important}@media only screen and (min-width: 600px){.pb-sm-13{padding-bottom:52px !important}.pb-sm-n13{padding-bottom:-52px !important}}@media only screen and (min-width: 960px){.pb-md-13{padding-bottom:52px !important}.pb-md-n13{padding-bottom:-52px !important}}@media only screen and (min-width: 1264px){.pb-lg-13{padding-bottom:52px !important}.pb-lg-n13{padding-bottom:-52px !important}}@media only screen and (min-width: 1904px){.pb-xl-13{padding-bottom:52px !important}.pb-xl-n13{padding-bottom:-52px !important}}.ma-14{margin:56px !important}.ma-n14{margin:-56px !important}@media only screen and (min-width: 600px){.ma-sm-14{margin:56px !important}.ma-sm-n14{margin:-56px !important}}@media only screen and (min-width: 960px){.ma-md-14{margin:56px !important}.ma-md-n14{margin:-56px !important}}@media only screen and (min-width: 1264px){.ma-lg-14{margin:56px !important}.ma-lg-n14{margin:-56px !important}}@media only screen and (min-width: 1904px){.ma-xl-14{margin:56px !important}.ma-xl-n14{margin:-56px !important}}.ml-14{margin-left:56px !important}.ml-n14{margin-left:-56px !important}@media only screen and (min-width: 600px){.ml-sm-14{margin-left:56px !important}.ml-sm-n14{margin-left:-56px !important}}@media only screen and (min-width: 960px){.ml-md-14{margin-left:56px !important}.ml-md-n14{margin-left:-56px !important}}@media only screen and (min-width: 1264px){.ml-lg-14{margin-left:56px !important}.ml-lg-n14{margin-left:-56px !important}}@media only screen and (min-width: 1904px){.ml-xl-14{margin-left:56px !important}.ml-xl-n14{margin-left:-56px !important}}.mr-14{margin-right:56px !important}.mr-n14{margin-right:-56px !important}@media only screen and (min-width: 600px){.mr-sm-14{margin-right:56px !important}.mr-sm-n14{margin-right:-56px !important}}@media only screen and (min-width: 960px){.mr-md-14{margin-right:56px !important}.mr-md-n14{margin-right:-56px !important}}@media only screen and (min-width: 1264px){.mr-lg-14{margin-right:56px !important}.mr-lg-n14{margin-right:-56px !important}}@media only screen and (min-width: 1904px){.mr-xl-14{margin-right:56px !important}.mr-xl-n14{margin-right:-56px !important}}.mt-14{margin-top:56px !important}.mt-n14{margin-top:-56px !important}@media only screen and (min-width: 600px){.mt-sm-14{margin-top:56px !important}.mt-sm-n14{margin-top:-56px !important}}@media only screen and (min-width: 960px){.mt-md-14{margin-top:56px !important}.mt-md-n14{margin-top:-56px !important}}@media only screen and (min-width: 1264px){.mt-lg-14{margin-top:56px !important}.mt-lg-n14{margin-top:-56px !important}}@media only screen and (min-width: 1904px){.mt-xl-14{margin-top:56px !important}.mt-xl-n14{margin-top:-56px !important}}.mb-14{margin-bottom:56px !important}.mb-n14{margin-bottom:-56px !important}@media only screen and (min-width: 600px){.mb-sm-14{margin-bottom:56px !important}.mb-sm-n14{margin-bottom:-56px !important}}@media only screen and (min-width: 960px){.mb-md-14{margin-bottom:56px !important}.mb-md-n14{margin-bottom:-56px !important}}@media only screen and (min-width: 1264px){.mb-lg-14{margin-bottom:56px !important}.mb-lg-n14{margin-bottom:-56px !important}}@media only screen and (min-width: 1904px){.mb-xl-14{margin-bottom:56px !important}.mb-xl-n14{margin-bottom:-56px !important}}.pa-14{padding:56px !important}.pa-n14{padding:-56px !important}@media only screen and (min-width: 600px){.pa-sm-14{padding:56px !important}.pa-sm-n14{padding:-56px !important}}@media only screen and (min-width: 960px){.pa-md-14{padding:56px !important}.pa-md-n14{padding:-56px !important}}@media only screen and (min-width: 1264px){.pa-lg-14{padding:56px !important}.pa-lg-n14{padding:-56px !important}}@media only screen and (min-width: 1904px){.pa-xl-14{padding:56px !important}.pa-xl-n14{padding:-56px !important}}.pl-14{padding-left:56px !important}.pl-n14{padding-left:-56px !important}@media only screen and (min-width: 600px){.pl-sm-14{padding-left:56px !important}.pl-sm-n14{padding-left:-56px !important}}@media only screen and (min-width: 960px){.pl-md-14{padding-left:56px !important}.pl-md-n14{padding-left:-56px !important}}@media only screen and (min-width: 1264px){.pl-lg-14{padding-left:56px !important}.pl-lg-n14{padding-left:-56px !important}}@media only screen and (min-width: 1904px){.pl-xl-14{padding-left:56px !important}.pl-xl-n14{padding-left:-56px !important}}.pr-14{padding-right:56px !important}.pr-n14{padding-right:-56px !important}@media only screen and (min-width: 600px){.pr-sm-14{padding-right:56px !important}.pr-sm-n14{padding-right:-56px !important}}@media only screen and (min-width: 960px){.pr-md-14{padding-right:56px !important}.pr-md-n14{padding-right:-56px !important}}@media only screen and (min-width: 1264px){.pr-lg-14{padding-right:56px !important}.pr-lg-n14{padding-right:-56px !important}}@media only screen and (min-width: 1904px){.pr-xl-14{padding-right:56px !important}.pr-xl-n14{padding-right:-56px !important}}.pt-14{padding-top:56px !important}.pt-n14{padding-top:-56px !important}@media only screen and (min-width: 600px){.pt-sm-14{padding-top:56px !important}.pt-sm-n14{padding-top:-56px !important}}@media only screen and (min-width: 960px){.pt-md-14{padding-top:56px !important}.pt-md-n14{padding-top:-56px !important}}@media only screen and (min-width: 1264px){.pt-lg-14{padding-top:56px !important}.pt-lg-n14{padding-top:-56px !important}}@media only screen and (min-width: 1904px){.pt-xl-14{padding-top:56px !important}.pt-xl-n14{padding-top:-56px !important}}.pb-14{padding-bottom:56px !important}.pb-n14{padding-bottom:-56px !important}@media only screen and (min-width: 600px){.pb-sm-14{padding-bottom:56px !important}.pb-sm-n14{padding-bottom:-56px !important}}@media only screen and (min-width: 960px){.pb-md-14{padding-bottom:56px !important}.pb-md-n14{padding-bottom:-56px !important}}@media only screen and (min-width: 1264px){.pb-lg-14{padding-bottom:56px !important}.pb-lg-n14{padding-bottom:-56px !important}}@media only screen and (min-width: 1904px){.pb-xl-14{padding-bottom:56px !important}.pb-xl-n14{padding-bottom:-56px !important}}.ma-15{margin:60px !important}.ma-n15{margin:-60px !important}@media only screen and (min-width: 600px){.ma-sm-15{margin:60px !important}.ma-sm-n15{margin:-60px !important}}@media only screen and (min-width: 960px){.ma-md-15{margin:60px !important}.ma-md-n15{margin:-60px !important}}@media only screen and (min-width: 1264px){.ma-lg-15{margin:60px !important}.ma-lg-n15{margin:-60px !important}}@media only screen and (min-width: 1904px){.ma-xl-15{margin:60px !important}.ma-xl-n15{margin:-60px !important}}.ml-15{margin-left:60px !important}.ml-n15{margin-left:-60px !important}@media only screen and (min-width: 600px){.ml-sm-15{margin-left:60px !important}.ml-sm-n15{margin-left:-60px !important}}@media only screen and (min-width: 960px){.ml-md-15{margin-left:60px !important}.ml-md-n15{margin-left:-60px !important}}@media only screen and (min-width: 1264px){.ml-lg-15{margin-left:60px !important}.ml-lg-n15{margin-left:-60px !important}}@media only screen and (min-width: 1904px){.ml-xl-15{margin-left:60px !important}.ml-xl-n15{margin-left:-60px !important}}.mr-15{margin-right:60px !important}.mr-n15{margin-right:-60px !important}@media only screen and (min-width: 600px){.mr-sm-15{margin-right:60px !important}.mr-sm-n15{margin-right:-60px !important}}@media only screen and (min-width: 960px){.mr-md-15{margin-right:60px !important}.mr-md-n15{margin-right:-60px !important}}@media only screen and (min-width: 1264px){.mr-lg-15{margin-right:60px !important}.mr-lg-n15{margin-right:-60px !important}}@media only screen and (min-width: 1904px){.mr-xl-15{margin-right:60px !important}.mr-xl-n15{margin-right:-60px !important}}.mt-15{margin-top:60px !important}.mt-n15{margin-top:-60px !important}@media only screen and (min-width: 600px){.mt-sm-15{margin-top:60px !important}.mt-sm-n15{margin-top:-60px !important}}@media only screen and (min-width: 960px){.mt-md-15{margin-top:60px !important}.mt-md-n15{margin-top:-60px !important}}@media only screen and (min-width: 1264px){.mt-lg-15{margin-top:60px !important}.mt-lg-n15{margin-top:-60px !important}}@media only screen and (min-width: 1904px){.mt-xl-15{margin-top:60px !important}.mt-xl-n15{margin-top:-60px !important}}.mb-15{margin-bottom:60px !important}.mb-n15{margin-bottom:-60px !important}@media only screen and (min-width: 600px){.mb-sm-15{margin-bottom:60px !important}.mb-sm-n15{margin-bottom:-60px !important}}@media only screen and (min-width: 960px){.mb-md-15{margin-bottom:60px !important}.mb-md-n15{margin-bottom:-60px !important}}@media only screen and (min-width: 1264px){.mb-lg-15{margin-bottom:60px !important}.mb-lg-n15{margin-bottom:-60px !important}}@media only screen and (min-width: 1904px){.mb-xl-15{margin-bottom:60px !important}.mb-xl-n15{margin-bottom:-60px !important}}.pa-15{padding:60px !important}.pa-n15{padding:-60px !important}@media only screen and (min-width: 600px){.pa-sm-15{padding:60px !important}.pa-sm-n15{padding:-60px !important}}@media only screen and (min-width: 960px){.pa-md-15{padding:60px !important}.pa-md-n15{padding:-60px !important}}@media only screen and (min-width: 1264px){.pa-lg-15{padding:60px !important}.pa-lg-n15{padding:-60px !important}}@media only screen and (min-width: 1904px){.pa-xl-15{padding:60px !important}.pa-xl-n15{padding:-60px !important}}.pl-15{padding-left:60px !important}.pl-n15{padding-left:-60px !important}@media only screen and (min-width: 600px){.pl-sm-15{padding-left:60px !important}.pl-sm-n15{padding-left:-60px !important}}@media only screen and (min-width: 960px){.pl-md-15{padding-left:60px !important}.pl-md-n15{padding-left:-60px !important}}@media only screen and (min-width: 1264px){.pl-lg-15{padding-left:60px !important}.pl-lg-n15{padding-left:-60px !important}}@media only screen and (min-width: 1904px){.pl-xl-15{padding-left:60px !important}.pl-xl-n15{padding-left:-60px !important}}.pr-15{padding-right:60px !important}.pr-n15{padding-right:-60px !important}@media only screen and (min-width: 600px){.pr-sm-15{padding-right:60px !important}.pr-sm-n15{padding-right:-60px !important}}@media only screen and (min-width: 960px){.pr-md-15{padding-right:60px !important}.pr-md-n15{padding-right:-60px !important}}@media only screen and (min-width: 1264px){.pr-lg-15{padding-right:60px !important}.pr-lg-n15{padding-right:-60px !important}}@media only screen and (min-width: 1904px){.pr-xl-15{padding-right:60px !important}.pr-xl-n15{padding-right:-60px !important}}.pt-15{padding-top:60px !important}.pt-n15{padding-top:-60px !important}@media only screen and (min-width: 600px){.pt-sm-15{padding-top:60px !important}.pt-sm-n15{padding-top:-60px !important}}@media only screen and (min-width: 960px){.pt-md-15{padding-top:60px !important}.pt-md-n15{padding-top:-60px !important}}@media only screen and (min-width: 1264px){.pt-lg-15{padding-top:60px !important}.pt-lg-n15{padding-top:-60px !important}}@media only screen and (min-width: 1904px){.pt-xl-15{padding-top:60px !important}.pt-xl-n15{padding-top:-60px !important}}.pb-15{padding-bottom:60px !important}.pb-n15{padding-bottom:-60px !important}@media only screen and (min-width: 600px){.pb-sm-15{padding-bottom:60px !important}.pb-sm-n15{padding-bottom:-60px !important}}@media only screen and (min-width: 960px){.pb-md-15{padding-bottom:60px !important}.pb-md-n15{padding-bottom:-60px !important}}@media only screen and (min-width: 1264px){.pb-lg-15{padding-bottom:60px !important}.pb-lg-n15{padding-bottom:-60px !important}}@media only screen and (min-width: 1904px){.pb-xl-15{padding-bottom:60px !important}.pb-xl-n15{padding-bottom:-60px !important}}.ma-16{margin:64px !important}.ma-n16{margin:-64px !important}@media only screen and (min-width: 600px){.ma-sm-16{margin:64px !important}.ma-sm-n16{margin:-64px !important}}@media only screen and (min-width: 960px){.ma-md-16{margin:64px !important}.ma-md-n16{margin:-64px !important}}@media only screen and (min-width: 1264px){.ma-lg-16{margin:64px !important}.ma-lg-n16{margin:-64px !important}}@media only screen and (min-width: 1904px){.ma-xl-16{margin:64px !important}.ma-xl-n16{margin:-64px !important}}.ml-16{margin-left:64px !important}.ml-n16{margin-left:-64px !important}@media only screen and (min-width: 600px){.ml-sm-16{margin-left:64px !important}.ml-sm-n16{margin-left:-64px !important}}@media only screen and (min-width: 960px){.ml-md-16{margin-left:64px !important}.ml-md-n16{margin-left:-64px !important}}@media only screen and (min-width: 1264px){.ml-lg-16{margin-left:64px !important}.ml-lg-n16{margin-left:-64px !important}}@media only screen and (min-width: 1904px){.ml-xl-16{margin-left:64px !important}.ml-xl-n16{margin-left:-64px !important}}.mr-16{margin-right:64px !important}.mr-n16{margin-right:-64px !important}@media only screen and (min-width: 600px){.mr-sm-16{margin-right:64px !important}.mr-sm-n16{margin-right:-64px !important}}@media only screen and (min-width: 960px){.mr-md-16{margin-right:64px !important}.mr-md-n16{margin-right:-64px !important}}@media only screen and (min-width: 1264px){.mr-lg-16{margin-right:64px !important}.mr-lg-n16{margin-right:-64px !important}}@media only screen and (min-width: 1904px){.mr-xl-16{margin-right:64px !important}.mr-xl-n16{margin-right:-64px !important}}.mt-16{margin-top:64px !important}.mt-n16{margin-top:-64px !important}@media only screen and (min-width: 600px){.mt-sm-16{margin-top:64px !important}.mt-sm-n16{margin-top:-64px !important}}@media only screen and (min-width: 960px){.mt-md-16{margin-top:64px !important}.mt-md-n16{margin-top:-64px !important}}@media only screen and (min-width: 1264px){.mt-lg-16{margin-top:64px !important}.mt-lg-n16{margin-top:-64px !important}}@media only screen and (min-width: 1904px){.mt-xl-16{margin-top:64px !important}.mt-xl-n16{margin-top:-64px !important}}.mb-16{margin-bottom:64px !important}.mb-n16{margin-bottom:-64px !important}@media only screen and (min-width: 600px){.mb-sm-16{margin-bottom:64px !important}.mb-sm-n16{margin-bottom:-64px !important}}@media only screen and (min-width: 960px){.mb-md-16{margin-bottom:64px !important}.mb-md-n16{margin-bottom:-64px !important}}@media only screen and (min-width: 1264px){.mb-lg-16{margin-bottom:64px !important}.mb-lg-n16{margin-bottom:-64px !important}}@media only screen and (min-width: 1904px){.mb-xl-16{margin-bottom:64px !important}.mb-xl-n16{margin-bottom:-64px !important}}.pa-16{padding:64px !important}.pa-n16{padding:-64px !important}@media only screen and (min-width: 600px){.pa-sm-16{padding:64px !important}.pa-sm-n16{padding:-64px !important}}@media only screen and (min-width: 960px){.pa-md-16{padding:64px !important}.pa-md-n16{padding:-64px !important}}@media only screen and (min-width: 1264px){.pa-lg-16{padding:64px !important}.pa-lg-n16{padding:-64px !important}}@media only screen and (min-width: 1904px){.pa-xl-16{padding:64px !important}.pa-xl-n16{padding:-64px !important}}.pl-16{padding-left:64px !important}.pl-n16{padding-left:-64px !important}@media only screen and (min-width: 600px){.pl-sm-16{padding-left:64px !important}.pl-sm-n16{padding-left:-64px !important}}@media only screen and (min-width: 960px){.pl-md-16{padding-left:64px !important}.pl-md-n16{padding-left:-64px !important}}@media only screen and (min-width: 1264px){.pl-lg-16{padding-left:64px !important}.pl-lg-n16{padding-left:-64px !important}}@media only screen and (min-width: 1904px){.pl-xl-16{padding-left:64px !important}.pl-xl-n16{padding-left:-64px !important}}.pr-16{padding-right:64px !important}.pr-n16{padding-right:-64px !important}@media only screen and (min-width: 600px){.pr-sm-16{padding-right:64px !important}.pr-sm-n16{padding-right:-64px !important}}@media only screen and (min-width: 960px){.pr-md-16{padding-right:64px !important}.pr-md-n16{padding-right:-64px !important}}@media only screen and (min-width: 1264px){.pr-lg-16{padding-right:64px !important}.pr-lg-n16{padding-right:-64px !important}}@media only screen and (min-width: 1904px){.pr-xl-16{padding-right:64px !important}.pr-xl-n16{padding-right:-64px !important}}.pt-16{padding-top:64px !important}.pt-n16{padding-top:-64px !important}@media only screen and (min-width: 600px){.pt-sm-16{padding-top:64px !important}.pt-sm-n16{padding-top:-64px !important}}@media only screen and (min-width: 960px){.pt-md-16{padding-top:64px !important}.pt-md-n16{padding-top:-64px !important}}@media only screen and (min-width: 1264px){.pt-lg-16{padding-top:64px !important}.pt-lg-n16{padding-top:-64px !important}}@media only screen and (min-width: 1904px){.pt-xl-16{padding-top:64px !important}.pt-xl-n16{padding-top:-64px !important}}.pb-16{padding-bottom:64px !important}.pb-n16{padding-bottom:-64px !important}@media only screen and (min-width: 600px){.pb-sm-16{padding-bottom:64px !important}.pb-sm-n16{padding-bottom:-64px !important}}@media only screen and (min-width: 960px){.pb-md-16{padding-bottom:64px !important}.pb-md-n16{padding-bottom:-64px !important}}@media only screen and (min-width: 1264px){.pb-lg-16{padding-bottom:64px !important}.pb-lg-n16{padding-bottom:-64px !important}}@media only screen and (min-width: 1904px){.pb-xl-16{padding-bottom:64px !important}.pb-xl-n16{padding-bottom:-64px !important}}.ma-auto{margin:auto !important}@media only screen and (min-width: 600px){.ma-sm-auto{margin:auto !important}}@media only screen and (min-width: 960px){.ma-md-auto{margin:auto !important}}@media only screen and (min-width: 1264px){.ma-lg-auto{margin:auto !important}}@media only screen and (min-width: 1904px){.ma-xl-auto{margin:auto !important}}.ml-auto{margin-left:auto !important}@media only screen and (min-width: 600px){.ml-sm-auto{margin-left:auto !important}}@media only screen and (min-width: 960px){.ml-md-auto{margin-left:auto !important}}@media only screen and (min-width: 1264px){.ml-lg-auto{margin-left:auto !important}}@media only screen and (min-width: 1904px){.ml-xl-auto{margin-left:auto !important}}.mr-auto{margin-right:auto !important}@media only screen and (min-width: 600px){.mr-sm-auto{margin-right:auto !important}}@media only screen and (min-width: 960px){.mr-md-auto{margin-right:auto !important}}@media only screen and (min-width: 1264px){.mr-lg-auto{margin-right:auto !important}}@media only screen and (min-width: 1904px){.mr-xl-auto{margin-right:auto !important}}.mt-auto{margin-top:auto !important}@media only screen and (min-width: 600px){.mt-sm-auto{margin-top:auto !important}}@media only screen and (min-width: 960px){.mt-md-auto{margin-top:auto !important}}@media only screen and (min-width: 1264px){.mt-lg-auto{margin-top:auto !important}}@media only screen and (min-width: 1904px){.mt-xl-auto{margin-top:auto !important}}.mb-auto{margin-bottom:auto !important}@media only screen and (min-width: 600px){.mb-sm-auto{margin-bottom:auto !important}}@media only screen and (min-width: 960px){.mb-md-auto{margin-bottom:auto !important}}@media only screen and (min-width: 1264px){.mb-lg-auto{margin-bottom:auto !important}}@media only screen and (min-width: 1904px){.mb-xl-auto{margin-bottom:auto !important}}.pa-auto{padding:auto !important}@media only screen and (min-width: 600px){.pa-sm-auto{padding:auto !important}}@media only screen and (min-width: 960px){.pa-md-auto{padding:auto !important}}@media only screen and (min-width: 1264px){.pa-lg-auto{padding:auto !important}}@media only screen and (min-width: 1904px){.pa-xl-auto{padding:auto !important}}.pl-auto{padding-left:auto !important}@media only screen and (min-width: 600px){.pl-sm-auto{padding-left:auto !important}}@media only screen and (min-width: 960px){.pl-md-auto{padding-left:auto !important}}@media only screen and (min-width: 1264px){.pl-lg-auto{padding-left:auto !important}}@media only screen and (min-width: 1904px){.pl-xl-auto{padding-left:auto !important}}.pr-auto{padding-right:auto !important}@media only screen and (min-width: 600px){.pr-sm-auto{padding-right:auto !important}}@media only screen and (min-width: 960px){.pr-md-auto{padding-right:auto !important}}@media only screen and (min-width: 1264px){.pr-lg-auto{padding-right:auto !important}}@media only screen and (min-width: 1904px){.pr-xl-auto{padding-right:auto !important}}.pt-auto{padding-top:auto !important}@media only screen and (min-width: 600px){.pt-sm-auto{padding-top:auto !important}}@media only screen and (min-width: 960px){.pt-md-auto{padding-top:auto !important}}@media only screen and (min-width: 1264px){.pt-lg-auto{padding-top:auto !important}}@media only screen and (min-width: 1904px){.pt-xl-auto{padding-top:auto !important}}.pb-auto{padding-bottom:auto !important}@media only screen and (min-width: 600px){.pb-sm-auto{padding-bottom:auto !important}}@media only screen and (min-width: 960px){.pb-md-auto{padding-bottom:auto !important}}@media only screen and (min-width: 1264px){.pb-lg-auto{padding-bottom:auto !important}}@media only screen and (min-width: 1904px){.pb-xl-auto{padding-bottom:auto !important}}.d-none{display:none}@media only screen and (min-width: 600px){.d-sm-none{display:none}}@media only screen and (min-width: 960px){.d-md-none{display:none}}@media only screen and (min-width: 1264px){.d-lg-none{display:none}}@media only screen and (min-width: 1904px){.d-xl-none{display:none}}.d-inline{display:inline}@media only screen and (min-width: 600px){.d-sm-inline{display:inline}}@media only screen and (min-width: 960px){.d-md-inline{display:inline}}@media only screen and (min-width: 1264px){.d-lg-inline{display:inline}}@media only screen and (min-width: 1904px){.d-xl-inline{display:inline}}.d-inline-block{display:inline-block}@media only screen and (min-width: 600px){.d-sm-inline-block{display:inline-block}}@media only screen and (min-width: 960px){.d-md-inline-block{display:inline-block}}@media only screen and (min-width: 1264px){.d-lg-inline-block{display:inline-block}}@media only screen and (min-width: 1904px){.d-xl-inline-block{display:inline-block}}.d-block{display:block}@media only screen and (min-width: 600px){.d-sm-block{display:block}}@media only screen and (min-width: 960px){.d-md-block{display:block}}@media only screen and (min-width: 1264px){.d-lg-block{display:block}}@media only screen and (min-width: 1904px){.d-xl-block{display:block}}.d-flex{display:flex}@media only screen and (min-width: 600px){.d-sm-flex{display:flex}}@media only screen and (min-width: 960px){.d-md-flex{display:flex}}@media only screen and (min-width: 1264px){.d-lg-flex{display:flex}}@media only screen and (min-width: 1904px){.d-xl-flex{display:flex}}.d-inline-flex{display:inline-flex}@media only screen and (min-width: 600px){.d-sm-inline-flex{display:inline-flex}}@media only screen and (min-width: 960px){.d-md-inline-flex{display:inline-flex}}@media only screen and (min-width: 1264px){.d-lg-inline-flex{display:inline-flex}}@media only screen and (min-width: 1904px){.d-xl-inline-flex{display:inline-flex}}.flex-row{flex-direction:row}.flex-row-reverse{flex-direction:row-reverse}.flex-column{flex-direction:column}.flex-column-reverse{flex-direction:column-reverse}@media only screen and (min-width: 600px){.flex-sm-row{flex-direction:row}.flex-sm-row-reverse{flex-direction:row-reverse}.flex-sm-column{flex-direction:column}.flex-sm-column-reverse{flex-direction:column-reverse}}@media only screen and (min-width: 960px){.flex-md-row{flex-direction:row}.flex-md-row-reverse{flex-direction:row-reverse}.flex-md-column{flex-direction:column}.flex-md-column-reverse{flex-direction:column-reverse}}@media only screen and (min-width: 1264px){.flex-lg-row{flex-direction:row}.flex-lg-row-reverse{flex-direction:row-reverse}.flex-lg-column{flex-direction:column}.flex-lg-column-reverse{flex-direction:column-reverse}}@media only screen and (min-width: 1904px){.flex-xl-row{flex-direction:row}.flex-xl-row-reverse{flex-direction:row-reverse}.flex-xl-column{flex-direction:column}.flex-xl-column-reverse{flex-direction:column-reverse}}.justify-start{justify-content:flex-start}.justify-end{justify-content:flex-end}.justify-center{justify-content:center}.justify-space-between{justify-content:space-between}.justify-space-around{justify-content:space-around}@media only screen and (min-width: 600px){.justify-sm-start{justify-content:flex-start}.justify-sm-end{justify-content:flex-end}.justify-sm-center{justify-content:center}.justify-sm-space-between{justify-content:space-between}.justify-sm-space-around{justify-content:space-around}}@media only screen and (min-width: 960px){.justify-md-start{justify-content:flex-start}.justify-md-end{justify-content:flex-end}.justify-md-center{justify-content:center}.justify-md-space-between{justify-content:space-between}.justify-md-space-around{justify-content:space-around}}@media only screen and (min-width: 1264px){.justify-lg-start{justify-content:flex-start}.justify-lg-end{justify-content:flex-end}.justify-lg-center{justify-content:center}.justify-lg-space-between{justify-content:space-between}.justify-lg-space-around{justify-content:space-around}}@media only screen and (min-width: 1904px){.justify-xl-start{justify-content:flex-start}.justify-xl-end{justify-content:flex-end}.justify-xl-center{justify-content:center}.justify-xl-space-between{justify-content:space-between}.justify-xl-space-around{justify-content:space-around}}.align-content-start{align-content:flex-start}.align-content-end{align-content:flex-end}.align-content-center{align-content:center}.align-content-space-between{align-content:space-between}.align-content-space-around{align-content:space-around}.align-content-stretch{align-content:stretch}@media only screen and (min-width: 600px){.align-sm-content-start{align-content:flex-start}.align-sm-content-end{align-content:flex-end}.align-sm-content-center{align-content:center}.align-sm-content-space-between{align-content:space-between}.align-sm-content-space-around{align-content:space-around}.align-sm-content-stretch{align-content:stretch}}@media only screen and (min-width: 960px){.align-md-content-start{align-content:flex-start}.align-md-content-end{align-content:flex-end}.align-md-content-center{align-content:center}.align-md-content-space-between{align-content:space-between}.align-md-content-space-around{align-content:space-around}.align-md-content-stretch{align-content:stretch}}@media only screen and (min-width: 1264px){.align-lg-content-start{align-content:flex-start}.align-lg-content-end{align-content:flex-end}.align-lg-content-center{align-content:center}.align-lg-content-space-between{align-content:space-between}.align-lg-content-space-around{align-content:space-around}.align-lg-content-stretch{align-content:stretch}}@media only screen and (min-width: 1904px){.align-xl-content-start{align-content:flex-start}.align-xl-content-end{align-content:flex-end}.align-xl-content-center{align-content:center}.align-xl-content-space-between{align-content:space-between}.align-xl-content-space-around{align-content:space-around}.align-xl-content-stretch{align-content:stretch}}.align-start{align-items:flex-start}.align-end{align-items:flex-end}.align-center{align-items:center}.align-baseline{align-items:baseline}.align-stretch{align-items:stretch}@media only screen and (min-width: 600px){.align-sm-start{align-items:flex-start}.align-sm-end{align-items:flex-end}.align-sm-center{align-items:center}.align-sm-baseline{align-items:baseline}.align-sm-stretch{align-items:stretch}}@media only screen and (min-width: 960px){.align-md-start{align-items:flex-start}.align-md-end{align-items:flex-end}.align-md-center{align-items:center}.align-md-baseline{align-items:baseline}.align-md-stretch{align-items:stretch}}@media only screen and (min-width: 1264px){.align-lg-start{align-items:flex-start}.align-lg-end{align-items:flex-end}.align-lg-center{align-items:center}.align-lg-baseline{align-items:baseline}.align-lg-stretch{align-items:stretch}}@media only screen and (min-width: 1904px){.align-xl-start{align-items:flex-start}.align-xl-end{align-items:flex-end}.align-xl-center{align-items:center}.align-xl-baseline{align-items:baseline}.align-xl-stretch{align-items:stretch}}.align-self-start{align-self:flex-start}.align-self-end{align-self:flex-end}.align-self-center{align-self:center}.align-self-baseline{align-self:baseline}.align-self-stretch{align-self:stretch}.align-self-auto{align-self:auto}@media only screen and (min-width: 600px){.align-self-sm-start{align-self:flex-start}.align-self-sm-end{align-self:flex-end}.align-self-sm-center{align-self:center}.align-self-sm-baseline{align-self:baseline}.align-self-sm-stretch{align-self:stretch}.align-self-sm-auto{align-self:auto}}@media only screen and (min-width: 960px){.align-self-md-start{align-self:flex-start}.align-self-md-end{align-self:flex-end}.align-self-md-center{align-self:center}.align-self-md-baseline{align-self:baseline}.align-self-md-stretch{align-self:stretch}.align-self-md-auto{align-self:auto}}@media only screen and (min-width: 1264px){.align-self-lg-start{align-self:flex-start}.align-self-lg-end{align-self:flex-end}.align-self-lg-center{align-self:center}.align-self-lg-baseline{align-self:baseline}.align-self-lg-stretch{align-self:stretch}.align-self-lg-auto{align-self:auto}}@media only screen and (min-width: 1904px){.align-self-xl-start{align-self:flex-start}.align-self-xl-end{align-self:flex-end}.align-self-xl-center{align-self:center}.align-self-xl-baseline{align-self:baseline}.align-self-xl-stretch{align-self:stretch}.align-self-xl-auto{align-self:auto}}.flex-nowrap{flex-wrap:nowrap}.flex-wrap{flex-wrap:wrap}.flex-wrap-reverse{flex-wrap:wrap-reverse}@media only screen and (min-width: 600px){.flex-sm-nowrap{flex-wrap:nowrap}.flex-sm-wrap{flex-wrap:wrap}.flex-sm-wrap-reverse{flex-wrap:wrap-reverse}}@media only screen and (min-width: 960px){.flex-md-nowrap{flex-wrap:nowrap}.flex-md-wrap{flex-wrap:wrap}.flex-md-wrap-reverse{flex-wrap:wrap-reverse}}@media only screen and (min-width: 1264px){.flex-lg-nowrap{flex-wrap:nowrap}.flex-lg-wrap{flex-wrap:wrap}.flex-lg-wrap-reverse{flex-wrap:wrap-reverse}}@media only screen and (min-width: 1904px){.flex-xl-nowrap{flex-wrap:nowrap}.flex-xl-wrap{flex-wrap:wrap}.flex-xl-wrap-reverse{flex-wrap:wrap-reverse}}.order-first{order:-1}.order-last{order:13}.order-0{order:0}.order-1{order:1}.order-2{order:2}.order-3{order:3}.order-4{order:4}.order-5{order:5}.order-6{order:6}.order-7{order:7}.order-8{order:8}.order-9{order:9}.order-10{order:10}.order-11{order:11}.order-12{order:12}@media only screen and (min-width: 600px){.order-sm-first{order:-1}.order-sm-last{order:13}.order-sm-0{order:0}.order-sm-1{order:1}.order-sm-2{order:2}.order-sm-3{order:3}.order-sm-4{order:4}.order-sm-5{order:5}.order-sm-6{order:6}.order-sm-7{order:7}.order-sm-8{order:8}.order-sm-9{order:9}.order-sm-10{order:10}.order-sm-11{order:11}.order-sm-12{order:12}}@media only screen and (min-width: 960px){.order-md-first{order:-1}.order-md-last{order:13}.order-md-0{order:0}.order-md-1{order:1}.order-md-2{order:2}.order-md-3{order:3}.order-md-4{order:4}.order-md-5{order:5}.order-md-6{order:6}.order-md-7{order:7}.order-md-8{order:8}.order-md-9{order:9}.order-md-10{order:10}.order-md-11{order:11}.order-md-12{order:12}}@media only screen and (min-width: 1264px){.order-lg-first{order:-1}.order-lg-last{order:13}.order-lg-0{order:0}.order-lg-1{order:1}.order-lg-2{order:2}.order-lg-3{order:3}.order-lg-4{order:4}.order-lg-5{order:5}.order-lg-6{order:6}.order-lg-7{order:7}.order-lg-8{order:8}.order-lg-9{order:9}.order-lg-10{order:10}.order-lg-11{order:11}.order-lg-12{order:12}}@media only screen and (min-width: 1904px){.order-xl-first{order:-1}.order-xl-last{order:13}.order-xl-0{order:0}.order-xl-1{order:1}.order-xl-2{order:2}.order-xl-3{order:3}.order-xl-4{order:4}.order-xl-5{order:5}.order-xl-6{order:6}.order-xl-7{order:7}.order-xl-8{order:8}.order-xl-9{order:9}.order-xl-10{order:10}.order-xl-11{order:11}.order-xl-12{order:12}}.flex-grow-0{flex-grow:0}.flex-grow-1{flex-grow:1}.flex-shrink-0{flex-shrink:0}.flex-shrink-1{flex-shrink:1}@media only screen and (min-width: 600px){.flex-sm-grow-0{flex-grow:0}.flex-sm-grow-1{flex-grow:1}.flex-sm-shrink-0{flex-shrink:0}.flex-sm-shrink-1{flex-shrink:1}}@media only screen and (min-width: 960px){.flex-md-grow-0{flex-grow:0}.flex-md-grow-1{flex-grow:1}.flex-md-shrink-0{flex-shrink:0}.flex-md-shrink-1{flex-shrink:1}}@media only screen and (min-width: 1264px){.flex-lg-grow-0{flex-grow:0}.flex-lg-grow-1{flex-grow:1}.flex-lg-shrink-0{flex-shrink:0}.flex-lg-shrink-1{flex-shrink:1}}@media only screen and (min-width: 1904px){.flex-xl-grow-0{flex-grow:0}.flex-xl-grow-1{flex-grow:1}.flex-xl-shrink-0{flex-shrink:0}.flex-xl-shrink-1{flex-shrink:1}}.float-left{float:left}.float-right{float:right}.float-none{float:none}@media only screen and (min-width: 600px){.float-sm-left{float:left}.float-sm-right{float:right}.float-sm-none{float:none}}@media only screen and (min-width: 960px){.float-md-left{float:left}.float-md-right{float:right}.float-md-none{float:none}}@media only screen and (min-width: 1264px){.float-lg-left{float:left}.float-lg-right{float:right}.float-lg-none{float:none}}@media only screen and (min-width: 1904px){.float-xl-left{float:left}.float-xl-right{float:right}.float-xl-none{float:none}}html,body{height:100%}html{font-size:16px;overflow-x:hidden;text-rendering:optimizeLegibility;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;-webkit-tap-highlight-color:rgba(0, 0, 0, 0)}body{font-family:\"Roboto\", \"Segoe UI\", sans-serif;line-height:1.5}p{margin-bottom:16px}.s-ripple-container{position:relative;overflow:hidden}blockquote{padding:16px 0 16px 24px;font-size:18px;font-weight:300}code,kbd{border-radius:3px;font-size:85%;font-weight:900}code{background-color:#fbe5e1;color:#c0341d;padding:0 0.4rem}kbd{background:#212529;color:#ffffff;padding:0.2rem 0.4rem}h1{font-size:6rem;font-weight:300;line-height:6rem;letter-spacing:-0.015625em;font-family:\"Roboto\", \"Segoe UI\", sans-serif}h2{font-size:3.75rem;font-weight:300;line-height:3.75rem;letter-spacing:-0.0083333333em;font-family:\"Roboto\", \"Segoe UI\", sans-serif}h3{font-size:3rem;font-weight:400;line-height:3.125rem;letter-spacing:normal;font-family:\"Roboto\", \"Segoe UI\", sans-serif}h4{font-size:2.125rem;font-weight:400;line-height:2.5rem;letter-spacing:0.0073529412em;font-family:\"Roboto\", \"Segoe UI\", sans-serif}h5{font-size:1.5rem;font-weight:400;line-height:2rem;letter-spacing:normal;font-family:\"Roboto\", \"Segoe UI\", sans-serif}h6{font-size:1.25rem;font-weight:500;line-height:2rem;letter-spacing:0.0125em;font-family:\"Roboto\", \"Segoe UI\", sans-serif}.text-h1{font-size:6rem;font-weight:300;line-height:6rem;letter-spacing:-0.015625em;font-family:\"Roboto\", \"Segoe UI\", sans-serif}.text-h2{font-size:3.75rem;font-weight:300;line-height:3.75rem;letter-spacing:-0.0083333333em;font-family:\"Roboto\", \"Segoe UI\", sans-serif}.text-h3{font-size:3rem;font-weight:400;line-height:3.125rem;letter-spacing:normal;font-family:\"Roboto\", \"Segoe UI\", sans-serif}.text-h4{font-size:2.125rem;font-weight:400;line-height:2.5rem;letter-spacing:0.0073529412em;font-family:\"Roboto\", \"Segoe UI\", sans-serif}.text-h5{font-size:1.5rem;font-weight:400;line-height:2rem;letter-spacing:normal;font-family:\"Roboto\", \"Segoe UI\", sans-serif}.text-h6{font-size:1.25rem;font-weight:500;line-height:2rem;letter-spacing:0.0125em;font-family:\"Roboto\", \"Segoe UI\", sans-serif}.text-subtitle-1{font-size:1rem;font-weight:normal;line-height:1.75rem;letter-spacing:0.009375em;font-family:\"Roboto\", \"Segoe UI\", sans-serif}.text-subtitle-2{font-size:0.875rem;font-weight:500;line-height:1.375rem;letter-spacing:0.0071428571em;font-family:\"Roboto\", \"Segoe UI\", sans-serif}.text-body-1{font-size:1rem;font-weight:400;line-height:1.5rem;letter-spacing:0.03125em;font-family:\"Roboto\", \"Segoe UI\", sans-serif}.text-body-2{font-size:0.875rem;font-weight:400;line-height:1.25rem;letter-spacing:0.0178571429em;font-family:\"Roboto\", \"Segoe UI\", sans-serif}.text-button{font-size:0.875rem;font-weight:500;line-height:2.25rem;letter-spacing:0.0892857143em;font-family:\"Roboto\", \"Segoe UI\", sans-serif;text-transform:uppercase}.text-caption{font-size:0.75rem;font-weight:400;line-height:1.25rem;letter-spacing:0.0333333333em;font-family:\"Roboto\", \"Segoe UI\", sans-serif}.text-overline{font-size:0.75rem;font-weight:500;line-height:2rem;letter-spacing:0.1666666667em;font-family:\"Roboto\", \"Segoe UI\", sans-serif;text-transform:uppercase}@media only screen and (min-width: 600px){.text-sm-h1{font-size:6rem;font-weight:300;line-height:6rem;letter-spacing:-0.015625em;font-family:\"Roboto\", \"Segoe UI\", sans-serif}}@media only screen and (min-width: 960px){.text-md-h1{font-size:6rem;font-weight:300;line-height:6rem;letter-spacing:-0.015625em;font-family:\"Roboto\", \"Segoe UI\", sans-serif}}@media only screen and (min-width: 1264px){.text-lg-h1{font-size:6rem;font-weight:300;line-height:6rem;letter-spacing:-0.015625em;font-family:\"Roboto\", \"Segoe UI\", sans-serif}}@media only screen and (min-width: 1904px){.text-xl-h1{font-size:6rem;font-weight:300;line-height:6rem;letter-spacing:-0.015625em;font-family:\"Roboto\", \"Segoe UI\", sans-serif}}@media only screen and (min-width: 600px){.text-sm-h2{font-size:3.75rem;font-weight:300;line-height:3.75rem;letter-spacing:-0.0083333333em;font-family:\"Roboto\", \"Segoe UI\", sans-serif}}@media only screen and (min-width: 960px){.text-md-h2{font-size:3.75rem;font-weight:300;line-height:3.75rem;letter-spacing:-0.0083333333em;font-family:\"Roboto\", \"Segoe UI\", sans-serif}}@media only screen and (min-width: 1264px){.text-lg-h2{font-size:3.75rem;font-weight:300;line-height:3.75rem;letter-spacing:-0.0083333333em;font-family:\"Roboto\", \"Segoe UI\", sans-serif}}@media only screen and (min-width: 1904px){.text-xl-h2{font-size:3.75rem;font-weight:300;line-height:3.75rem;letter-spacing:-0.0083333333em;font-family:\"Roboto\", \"Segoe UI\", sans-serif}}@media only screen and (min-width: 600px){.text-sm-h3{font-size:3rem;font-weight:400;line-height:3.125rem;letter-spacing:normal;font-family:\"Roboto\", \"Segoe UI\", sans-serif}}@media only screen and (min-width: 960px){.text-md-h3{font-size:3rem;font-weight:400;line-height:3.125rem;letter-spacing:normal;font-family:\"Roboto\", \"Segoe UI\", sans-serif}}@media only screen and (min-width: 1264px){.text-lg-h3{font-size:3rem;font-weight:400;line-height:3.125rem;letter-spacing:normal;font-family:\"Roboto\", \"Segoe UI\", sans-serif}}@media only screen and (min-width: 1904px){.text-xl-h3{font-size:3rem;font-weight:400;line-height:3.125rem;letter-spacing:normal;font-family:\"Roboto\", \"Segoe UI\", sans-serif}}@media only screen and (min-width: 600px){.text-sm-h4{font-size:2.125rem;font-weight:400;line-height:2.5rem;letter-spacing:0.0073529412em;font-family:\"Roboto\", \"Segoe UI\", sans-serif}}@media only screen and (min-width: 960px){.text-md-h4{font-size:2.125rem;font-weight:400;line-height:2.5rem;letter-spacing:0.0073529412em;font-family:\"Roboto\", \"Segoe UI\", sans-serif}}@media only screen and (min-width: 1264px){.text-lg-h4{font-size:2.125rem;font-weight:400;line-height:2.5rem;letter-spacing:0.0073529412em;font-family:\"Roboto\", \"Segoe UI\", sans-serif}}@media only screen and (min-width: 1904px){.text-xl-h4{font-size:2.125rem;font-weight:400;line-height:2.5rem;letter-spacing:0.0073529412em;font-family:\"Roboto\", \"Segoe UI\", sans-serif}}@media only screen and (min-width: 600px){.text-sm-h5{font-size:1.5rem;font-weight:400;line-height:2rem;letter-spacing:normal;font-family:\"Roboto\", \"Segoe UI\", sans-serif}}@media only screen and (min-width: 960px){.text-md-h5{font-size:1.5rem;font-weight:400;line-height:2rem;letter-spacing:normal;font-family:\"Roboto\", \"Segoe UI\", sans-serif}}@media only screen and (min-width: 1264px){.text-lg-h5{font-size:1.5rem;font-weight:400;line-height:2rem;letter-spacing:normal;font-family:\"Roboto\", \"Segoe UI\", sans-serif}}@media only screen and (min-width: 1904px){.text-xl-h5{font-size:1.5rem;font-weight:400;line-height:2rem;letter-spacing:normal;font-family:\"Roboto\", \"Segoe UI\", sans-serif}}@media only screen and (min-width: 600px){.text-sm-h6{font-size:1.25rem;font-weight:500;line-height:2rem;letter-spacing:0.0125em;font-family:\"Roboto\", \"Segoe UI\", sans-serif}}@media only screen and (min-width: 960px){.text-md-h6{font-size:1.25rem;font-weight:500;line-height:2rem;letter-spacing:0.0125em;font-family:\"Roboto\", \"Segoe UI\", sans-serif}}@media only screen and (min-width: 1264px){.text-lg-h6{font-size:1.25rem;font-weight:500;line-height:2rem;letter-spacing:0.0125em;font-family:\"Roboto\", \"Segoe UI\", sans-serif}}@media only screen and (min-width: 1904px){.text-xl-h6{font-size:1.25rem;font-weight:500;line-height:2rem;letter-spacing:0.0125em;font-family:\"Roboto\", \"Segoe UI\", sans-serif}}@media only screen and (min-width: 600px){.text-sm-subtitle-1{font-size:1rem;font-weight:normal;line-height:1.75rem;letter-spacing:0.009375em;font-family:\"Roboto\", \"Segoe UI\", sans-serif}}@media only screen and (min-width: 960px){.text-md-subtitle-1{font-size:1rem;font-weight:normal;line-height:1.75rem;letter-spacing:0.009375em;font-family:\"Roboto\", \"Segoe UI\", sans-serif}}@media only screen and (min-width: 1264px){.text-lg-subtitle-1{font-size:1rem;font-weight:normal;line-height:1.75rem;letter-spacing:0.009375em;font-family:\"Roboto\", \"Segoe UI\", sans-serif}}@media only screen and (min-width: 1904px){.text-xl-subtitle-1{font-size:1rem;font-weight:normal;line-height:1.75rem;letter-spacing:0.009375em;font-family:\"Roboto\", \"Segoe UI\", sans-serif}}@media only screen and (min-width: 600px){.text-sm-subtitle-2{font-size:0.875rem;font-weight:500;line-height:1.375rem;letter-spacing:0.0071428571em;font-family:\"Roboto\", \"Segoe UI\", sans-serif}}@media only screen and (min-width: 960px){.text-md-subtitle-2{font-size:0.875rem;font-weight:500;line-height:1.375rem;letter-spacing:0.0071428571em;font-family:\"Roboto\", \"Segoe UI\", sans-serif}}@media only screen and (min-width: 1264px){.text-lg-subtitle-2{font-size:0.875rem;font-weight:500;line-height:1.375rem;letter-spacing:0.0071428571em;font-family:\"Roboto\", \"Segoe UI\", sans-serif}}@media only screen and (min-width: 1904px){.text-xl-subtitle-2{font-size:0.875rem;font-weight:500;line-height:1.375rem;letter-spacing:0.0071428571em;font-family:\"Roboto\", \"Segoe UI\", sans-serif}}@media only screen and (min-width: 600px){.text-sm-body-1{font-size:1rem;font-weight:400;line-height:1.5rem;letter-spacing:0.03125em;font-family:\"Roboto\", \"Segoe UI\", sans-serif}}@media only screen and (min-width: 960px){.text-md-body-1{font-size:1rem;font-weight:400;line-height:1.5rem;letter-spacing:0.03125em;font-family:\"Roboto\", \"Segoe UI\", sans-serif}}@media only screen and (min-width: 1264px){.text-lg-body-1{font-size:1rem;font-weight:400;line-height:1.5rem;letter-spacing:0.03125em;font-family:\"Roboto\", \"Segoe UI\", sans-serif}}@media only screen and (min-width: 1904px){.text-xl-body-1{font-size:1rem;font-weight:400;line-height:1.5rem;letter-spacing:0.03125em;font-family:\"Roboto\", \"Segoe UI\", sans-serif}}@media only screen and (min-width: 600px){.text-sm-body-2{font-size:0.875rem;font-weight:400;line-height:1.25rem;letter-spacing:0.0178571429em;font-family:\"Roboto\", \"Segoe UI\", sans-serif}}@media only screen and (min-width: 960px){.text-md-body-2{font-size:0.875rem;font-weight:400;line-height:1.25rem;letter-spacing:0.0178571429em;font-family:\"Roboto\", \"Segoe UI\", sans-serif}}@media only screen and (min-width: 1264px){.text-lg-body-2{font-size:0.875rem;font-weight:400;line-height:1.25rem;letter-spacing:0.0178571429em;font-family:\"Roboto\", \"Segoe UI\", sans-serif}}@media only screen and (min-width: 1904px){.text-xl-body-2{font-size:0.875rem;font-weight:400;line-height:1.25rem;letter-spacing:0.0178571429em;font-family:\"Roboto\", \"Segoe UI\", sans-serif}}@media only screen and (min-width: 600px){.text-sm-button{font-size:0.875rem;font-weight:500;line-height:2.25rem;letter-spacing:0.0892857143em;font-family:\"Roboto\", \"Segoe UI\", sans-serif;text-transform:uppercase}}@media only screen and (min-width: 960px){.text-md-button{font-size:0.875rem;font-weight:500;line-height:2.25rem;letter-spacing:0.0892857143em;font-family:\"Roboto\", \"Segoe UI\", sans-serif;text-transform:uppercase}}@media only screen and (min-width: 1264px){.text-lg-button{font-size:0.875rem;font-weight:500;line-height:2.25rem;letter-spacing:0.0892857143em;font-family:\"Roboto\", \"Segoe UI\", sans-serif;text-transform:uppercase}}@media only screen and (min-width: 1904px){.text-xl-button{font-size:0.875rem;font-weight:500;line-height:2.25rem;letter-spacing:0.0892857143em;font-family:\"Roboto\", \"Segoe UI\", sans-serif;text-transform:uppercase}}@media only screen and (min-width: 600px){.text-sm-caption{font-size:0.75rem;font-weight:400;line-height:1.25rem;letter-spacing:0.0333333333em;font-family:\"Roboto\", \"Segoe UI\", sans-serif}}@media only screen and (min-width: 960px){.text-md-caption{font-size:0.75rem;font-weight:400;line-height:1.25rem;letter-spacing:0.0333333333em;font-family:\"Roboto\", \"Segoe UI\", sans-serif}}@media only screen and (min-width: 1264px){.text-lg-caption{font-size:0.75rem;font-weight:400;line-height:1.25rem;letter-spacing:0.0333333333em;font-family:\"Roboto\", \"Segoe UI\", sans-serif}}@media only screen and (min-width: 1904px){.text-xl-caption{font-size:0.75rem;font-weight:400;line-height:1.25rem;letter-spacing:0.0333333333em;font-family:\"Roboto\", \"Segoe UI\", sans-serif}}@media only screen and (min-width: 600px){.text-sm-overline{font-size:0.75rem;font-weight:500;line-height:2rem;letter-spacing:0.1666666667em;font-family:\"Roboto\", \"Segoe UI\", sans-serif;text-transform:uppercase}}@media only screen and (min-width: 960px){.text-md-overline{font-size:0.75rem;font-weight:500;line-height:2rem;letter-spacing:0.1666666667em;font-family:\"Roboto\", \"Segoe UI\", sans-serif;text-transform:uppercase}}@media only screen and (min-width: 1264px){.text-lg-overline{font-size:0.75rem;font-weight:500;line-height:2rem;letter-spacing:0.1666666667em;font-family:\"Roboto\", \"Segoe UI\", sans-serif;text-transform:uppercase}}@media only screen and (min-width: 1904px){.text-xl-overline{font-size:0.75rem;font-weight:500;line-height:2rem;letter-spacing:0.1666666667em;font-family:\"Roboto\", \"Segoe UI\", sans-serif;text-transform:uppercase}}ul,ol{padding-left:24px}.s-app{min-height:100%}";
    	append(document.head, style);
    }

    function create_fragment$p(ctx) {
    	let div;
    	let div_class_value;
    	let current;
    	const default_slot_template = /*#slots*/ ctx[2].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[1], null);

    	return {
    		c() {
    			div = element("div");
    			if (default_slot) default_slot.c();
    			attr(div, "class", div_class_value = "s-app theme--" + /*theme*/ ctx[0]);
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);

    			if (default_slot) {
    				default_slot.m(div, null);
    			}

    			current = true;
    		},
    		p(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && dirty & /*$$scope*/ 2) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[1], dirty, null, null);
    				}
    			}

    			if (!current || dirty & /*theme*/ 1 && div_class_value !== (div_class_value = "s-app theme--" + /*theme*/ ctx[0])) {
    				attr(div, "class", div_class_value);
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    			if (default_slot) default_slot.d(detaching);
    		}
    	};
    }

    function instance$p($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	let { theme = "light" } = $$props;

    	$$self.$$set = $$props => {
    		if ("theme" in $$props) $$invalidate(0, theme = $$props.theme);
    		if ("$$scope" in $$props) $$invalidate(1, $$scope = $$props.$$scope);
    	};

    	return [theme, $$scope, slots];
    }

    class MaterialApp extends SvelteComponent {
    	constructor(options) {
    		super();
    		if (!document.getElementById("svelte-ht1yxd-style")) add_css$l();
    		init(this, options, instance$p, create_fragment$p, safe_not_equal, { theme: 0 });
    	}
    }

    function format$1(input) {
      if (typeof input === 'number') return `${input}px`;
      return input;
    }

    /**
     * @param node {Element}
     * @param styles {Object}
     */
    var Style = (node, _styles) => {
      let styles = _styles;
      Object.entries(styles).forEach(([key, value]) => {
        if (value) node.style.setProperty(`--s-${key}`, format$1(value));
      });

      return {
        update(newStyles) {
          Object.entries(newStyles).forEach(([key, value]) => {
            if (value) {
              node.style.setProperty(`--s-${key}`, format$1(value));
              delete styles[key];
            }
          });

          Object.keys(styles).forEach((name) => node.style.removeProperty(`--s-${name}`));

          styles = newStyles;
        },
      };
    };

    /* node_modules\svelte-materialify\src\components\Icon\Icon.svelte generated by Svelte v3.35.0 */

    function add_css$k() {
    	var style = element("style");
    	style.id = "svelte-1n7twol-style";
    	style.textContent = ".s-icon{color:var(--theme-icons-active);font-size:var(--s-icon-size);transform:rotate(var(--s-icon-rotate));line-height:1;letter-spacing:normal;text-transform:none;display:inline-flex;font-feature-settings:\"liga\";justify-content:center;position:relative;align-items:center;text-indent:0;vertical-align:middle;cursor:inherit;user-select:none;direction:ltr;transition:0.3s cubic-bezier(0.25, 0.8, 0.5, 1), visibility 0s}.s-icon.disabled{color:var(--theme-icons-inactive)}.s-icon.spin{animation:infinite s-icon-spin linear 1s}.s-icon>svg{fill:currentColor}@keyframes s-icon-spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}";
    	append(document.head, style);
    }

    // (70:2) {#if path}
    function create_if_block$9(ctx) {
    	let svg;
    	let path_1;
    	let svg_viewBox_value;
    	let if_block = /*label*/ ctx[10] && create_if_block_1$3(ctx);

    	return {
    		c() {
    			svg = svg_element("svg");
    			path_1 = svg_element("path");
    			if (if_block) if_block.c();
    			attr(path_1, "d", /*path*/ ctx[9]);
    			attr(svg, "xmlns", "http://www.w3.org/2000/svg");
    			attr(svg, "width", /*width*/ ctx[0]);
    			attr(svg, "height", /*height*/ ctx[1]);
    			attr(svg, "viewBox", svg_viewBox_value = "0 0 " + /*viewWidth*/ ctx[4] + " " + /*viewHeight*/ ctx[5]);
    		},
    		m(target, anchor) {
    			insert(target, svg, anchor);
    			append(svg, path_1);
    			if (if_block) if_block.m(path_1, null);
    		},
    		p(ctx, dirty) {
    			if (/*label*/ ctx[10]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block_1$3(ctx);
    					if_block.c();
    					if_block.m(path_1, null);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}

    			if (dirty & /*path*/ 512) {
    				attr(path_1, "d", /*path*/ ctx[9]);
    			}

    			if (dirty & /*width*/ 1) {
    				attr(svg, "width", /*width*/ ctx[0]);
    			}

    			if (dirty & /*height*/ 2) {
    				attr(svg, "height", /*height*/ ctx[1]);
    			}

    			if (dirty & /*viewWidth, viewHeight*/ 48 && svg_viewBox_value !== (svg_viewBox_value = "0 0 " + /*viewWidth*/ ctx[4] + " " + /*viewHeight*/ ctx[5])) {
    				attr(svg, "viewBox", svg_viewBox_value);
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(svg);
    			if (if_block) if_block.d();
    		}
    	};
    }

    // (77:8) {#if label}
    function create_if_block_1$3(ctx) {
    	let title;
    	let t;

    	return {
    		c() {
    			title = svg_element("title");
    			t = text(/*label*/ ctx[10]);
    		},
    		m(target, anchor) {
    			insert(target, title, anchor);
    			append(title, t);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*label*/ 1024) set_data(t, /*label*/ ctx[10]);
    		},
    		d(detaching) {
    			if (detaching) detach(title);
    		}
    	};
    }

    function create_fragment$o(ctx) {
    	let i;
    	let t;
    	let i_class_value;
    	let Style_action;
    	let current;
    	let mounted;
    	let dispose;
    	let if_block = /*path*/ ctx[9] && create_if_block$9(ctx);
    	const default_slot_template = /*#slots*/ ctx[13].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[12], null);

    	return {
    		c() {
    			i = element("i");
    			if (if_block) if_block.c();
    			t = space();
    			if (default_slot) default_slot.c();
    			attr(i, "aria-hidden", "true");
    			attr(i, "class", i_class_value = "s-icon " + /*klass*/ ctx[2]);
    			attr(i, "aria-label", /*label*/ ctx[10]);
    			attr(i, "aria-disabled", /*disabled*/ ctx[8]);
    			attr(i, "style", /*style*/ ctx[11]);
    			toggle_class(i, "spin", /*spin*/ ctx[7]);
    			toggle_class(i, "disabled", /*disabled*/ ctx[8]);
    		},
    		m(target, anchor) {
    			insert(target, i, anchor);
    			if (if_block) if_block.m(i, null);
    			append(i, t);

    			if (default_slot) {
    				default_slot.m(i, null);
    			}

    			current = true;

    			if (!mounted) {
    				dispose = action_destroyer(Style_action = Style.call(null, i, {
    					"icon-size": /*size*/ ctx[3],
    					"icon-rotate": `${/*rotate*/ ctx[6]}deg`
    				}));

    				mounted = true;
    			}
    		},
    		p(ctx, [dirty]) {
    			if (/*path*/ ctx[9]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block$9(ctx);
    					if_block.c();
    					if_block.m(i, t);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}

    			if (default_slot) {
    				if (default_slot.p && dirty & /*$$scope*/ 4096) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[12], dirty, null, null);
    				}
    			}

    			if (!current || dirty & /*klass*/ 4 && i_class_value !== (i_class_value = "s-icon " + /*klass*/ ctx[2])) {
    				attr(i, "class", i_class_value);
    			}

    			if (!current || dirty & /*label*/ 1024) {
    				attr(i, "aria-label", /*label*/ ctx[10]);
    			}

    			if (!current || dirty & /*disabled*/ 256) {
    				attr(i, "aria-disabled", /*disabled*/ ctx[8]);
    			}

    			if (!current || dirty & /*style*/ 2048) {
    				attr(i, "style", /*style*/ ctx[11]);
    			}

    			if (Style_action && is_function(Style_action.update) && dirty & /*size, rotate*/ 72) Style_action.update.call(null, {
    				"icon-size": /*size*/ ctx[3],
    				"icon-rotate": `${/*rotate*/ ctx[6]}deg`
    			});

    			if (dirty & /*klass, spin*/ 132) {
    				toggle_class(i, "spin", /*spin*/ ctx[7]);
    			}

    			if (dirty & /*klass, disabled*/ 260) {
    				toggle_class(i, "disabled", /*disabled*/ ctx[8]);
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(i);
    			if (if_block) if_block.d();
    			if (default_slot) default_slot.d(detaching);
    			mounted = false;
    			dispose();
    		}
    	};
    }

    function instance$o($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	let { class: klass = "" } = $$props;
    	let { size = "24px" } = $$props;
    	let { width = size } = $$props;
    	let { height = size } = $$props;
    	let { viewWidth = "24" } = $$props;
    	let { viewHeight = "24" } = $$props;
    	let { rotate = 0 } = $$props;
    	let { spin = false } = $$props;
    	let { disabled = false } = $$props;
    	let { path = null } = $$props;
    	let { label = null } = $$props;
    	let { style = null } = $$props;

    	$$self.$$set = $$props => {
    		if ("class" in $$props) $$invalidate(2, klass = $$props.class);
    		if ("size" in $$props) $$invalidate(3, size = $$props.size);
    		if ("width" in $$props) $$invalidate(0, width = $$props.width);
    		if ("height" in $$props) $$invalidate(1, height = $$props.height);
    		if ("viewWidth" in $$props) $$invalidate(4, viewWidth = $$props.viewWidth);
    		if ("viewHeight" in $$props) $$invalidate(5, viewHeight = $$props.viewHeight);
    		if ("rotate" in $$props) $$invalidate(6, rotate = $$props.rotate);
    		if ("spin" in $$props) $$invalidate(7, spin = $$props.spin);
    		if ("disabled" in $$props) $$invalidate(8, disabled = $$props.disabled);
    		if ("path" in $$props) $$invalidate(9, path = $$props.path);
    		if ("label" in $$props) $$invalidate(10, label = $$props.label);
    		if ("style" in $$props) $$invalidate(11, style = $$props.style);
    		if ("$$scope" in $$props) $$invalidate(12, $$scope = $$props.$$scope);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*size*/ 8) {
    			{
    				$$invalidate(0, width = size);
    				$$invalidate(1, height = size);
    			}
    		}
    	};

    	return [
    		width,
    		height,
    		klass,
    		size,
    		viewWidth,
    		viewHeight,
    		rotate,
    		spin,
    		disabled,
    		path,
    		label,
    		style,
    		$$scope,
    		slots
    	];
    }

    class Icon extends SvelteComponent {
    	constructor(options) {
    		super();
    		if (!document.getElementById("svelte-1n7twol-style")) add_css$k();

    		init(this, options, instance$o, create_fragment$o, safe_not_equal, {
    			class: 2,
    			size: 3,
    			width: 0,
    			height: 1,
    			viewWidth: 4,
    			viewHeight: 5,
    			rotate: 6,
    			spin: 7,
    			disabled: 8,
    			path: 9,
    			label: 10,
    			style: 11
    		});
    	}
    }

    const filter = (classes) => classes.filter((x) => !!x);
    const format = (classes) => classes.split(' ').filter((x) => !!x);

    /**
     * @param node {Element}
     * @param classes {Array<string>}
     */
    var Class = (node, _classes) => {
      let classes = _classes;
      node.classList.add(...format(filter(classes).join(' ')));
      return {
        update(_newClasses) {
          const newClasses = _newClasses;
          newClasses.forEach((klass, i) => {
            if (klass) node.classList.add(...format(klass));
            else if (classes[i]) node.classList.remove(...format(classes[i]));
          });
          classes = newClasses;
        },
      };
    };

    /* node_modules\svelte-materialify\src\components\Button\Button.svelte generated by Svelte v3.35.0 */

    function add_css$j() {
    	var style = element("style");
    	style.id = "svelte-qnwijx-style";
    	style.textContent = ".s-btn{align-items:center;border-radius:4px;display:inline-flex;flex:0 0 auto;overflow:hidden;position:relative;outline:0;justify-content:center;user-select:none;vertical-align:middle;white-space:nowrap;text-decoration:none;transition-duration:0.28s;transition-property:box-shadow, transform, opacity;background-color:var(--theme-app-bar);box-shadow:0 3px 1px -2px rgba(0, 0, 0, 0.2), 0 2px 2px 0 rgba(0, 0, 0, 0.14), 0 1px 5px 0 rgba(0, 0, 0, 0.12)}.s-btn a,.s-btn .s-icon{color:inherit}.s-btn .s-btn__content{display:flex;align-items:center;flex:1 0 auto;color:inherit;justify-content:inherit;line-height:normal;position:relative;font-size:inherit;font-weight:500;letter-spacing:0.0892857143em;text-transform:uppercase}.s-btn::before{border-radius:inherit;bottom:0;color:inherit;content:\"\";left:0;opacity:0;pointer-events:none;position:absolute;right:0;top:0;transition:opacity 0.2s cubic-bezier(0.4, 0, 0.6, 1);background-color:currentColor}.s-btn.size-x-small{font-size:0.625rem}.s-btn.size-small{font-size:0.75rem}.s-btn.size-default{font-size:0.875rem}.s-btn.size-large{font-size:0.875rem}.s-btn.size-x-large{font-size:1rem}.s-btn:not(.disabled):hover::before{opacity:0.08}.s-btn:not(.disabled).active::before{opacity:0.18}.s-btn:not(.disabled).focus-visible::before{opacity:0.24}.s-btn:not(.outlined).primary-color,.s-btn:not(.outlined).secondary-color,.s-btn:not(.outlined).success-color,.s-btn:not(.outlined).error-color,.s-btn:not(.outlined).warning-color,.s-btn:not(.outlined).info-color{color:#ffffff}.s-btn:not(.icon):not(.s-btn--fab).size-x-small{height:20px;min-width:36px;padding:0 8.8888888889px}.s-btn:not(.icon):not(.s-btn--fab).size-small{height:28px;min-width:50px;padding:0 12.4444444444px}.s-btn:not(.icon):not(.s-btn--fab).size-default{height:36px;min-width:64px;padding:0 16px}.s-btn:not(.icon):not(.s-btn--fab).size-large{height:44px;min-width:78px;padding:0 19.5555555556px}.s-btn:not(.icon):not(.s-btn--fab).size-x-large{height:52px;min-width:92px;padding:0 23.1111111111px}.s-btn:not(.disabled):not(.depressed){will-change:box-shadow}.s-btn.block{display:flex;flex:1 0 auto;min-width:100% !important;max-width:auto}.s-btn.tile{border-radius:0}.s-btn.text{background-color:transparent}.s-btn.depressed{box-shadow:none}.s-btn.outlined{border:1px solid currentColor;background-color:transparent !important}.s-btn.rounded{border-radius:9999px}.s-btn.disabled{pointer-events:none;color:var(--theme-buttons-disabled)}.s-btn.disabled:not(.flat):not(.text):not(.outlined){background-color:var(--theme-buttons-disabled)}.s-btn.icon.size-x-small{height:20px;width:20px}.s-btn.icon.size-small{height:28px;width:28px}.s-btn.icon.size-default{height:36px;width:36px}.s-btn.icon.size-large{height:44px;width:44px}.s-btn.icon.size-x-large{height:52px;width:52px}.s-btn.icon,.s-btn.s-btn--fab{border-radius:50%;min-width:0;min-height:0;padding:0}.s-btn.icon.size-x-small .s-icon,.s-btn.s-btn--fab.size-x-small .s-icon{font-size:18px}.s-btn.icon.size-small .s-icon,.s-btn.s-btn--fab.size-small .s-icon{font-size:24px}.s-btn.icon.size-default .s-icon,.s-btn.s-btn--fab.size-default .s-icon{font-size:24px}.s-btn.icon.size-large .s-icon,.s-btn.s-btn--fab.size-large .s-icon{font-size:28px}.s-btn.icon.size-x-large .s-icon,.s-btn.s-btn--fab.size-x-large .s-icon{font-size:32px}.s-btn.s-btn--fab.size-x-small{height:32px;width:32px}.s-btn.s-btn--fab.size-small{height:40px;width:40px}.s-btn.s-btn--fab.size-default{height:56px;width:56px}.s-btn.s-btn--fab.size-large{height:64px;width:64px}.s-btn.s-btn--fab.size-x-large{height:72px;width:72px}";
    	append(document.head, style);
    }

    function create_fragment$n(ctx) {
    	let button_1;
    	let span;
    	let button_1_class_value;
    	let Class_action;
    	let Ripple_action;
    	let current;
    	let mounted;
    	let dispose;
    	const default_slot_template = /*#slots*/ ctx[19].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[18], null);

    	let button_1_levels = [
    		{
    			class: button_1_class_value = "s-btn size-" + /*size*/ ctx[5] + " " + /*klass*/ ctx[1]
    		},
    		{ type: /*type*/ ctx[14] },
    		{ style: /*style*/ ctx[16] },
    		{ disabled: /*disabled*/ ctx[11] },
    		{ "aria-disabled": /*disabled*/ ctx[11] },
    		/*$$restProps*/ ctx[17]
    	];

    	let button_1_data = {};

    	for (let i = 0; i < button_1_levels.length; i += 1) {
    		button_1_data = assign(button_1_data, button_1_levels[i]);
    	}

    	return {
    		c() {
    			button_1 = element("button");
    			span = element("span");
    			if (default_slot) default_slot.c();
    			attr(span, "class", "s-btn__content");
    			set_attributes(button_1, button_1_data);
    			toggle_class(button_1, "s-btn--fab", /*fab*/ ctx[2]);
    			toggle_class(button_1, "icon", /*icon*/ ctx[3]);
    			toggle_class(button_1, "block", /*block*/ ctx[4]);
    			toggle_class(button_1, "tile", /*tile*/ ctx[6]);
    			toggle_class(button_1, "text", /*text*/ ctx[7] || /*icon*/ ctx[3]);
    			toggle_class(button_1, "depressed", /*depressed*/ ctx[8] || /*text*/ ctx[7] || /*disabled*/ ctx[11] || /*outlined*/ ctx[9] || /*icon*/ ctx[3]);
    			toggle_class(button_1, "outlined", /*outlined*/ ctx[9]);
    			toggle_class(button_1, "rounded", /*rounded*/ ctx[10]);
    			toggle_class(button_1, "disabled", /*disabled*/ ctx[11]);
    		},
    		m(target, anchor) {
    			insert(target, button_1, anchor);
    			append(button_1, span);

    			if (default_slot) {
    				default_slot.m(span, null);
    			}

    			/*button_1_binding*/ ctx[21](button_1);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					action_destroyer(Class_action = Class.call(null, button_1, [/*active*/ ctx[12] && /*activeClass*/ ctx[13]])),
    					action_destroyer(Ripple_action = Ripple.call(null, button_1, /*ripple*/ ctx[15])),
    					listen(button_1, "click", /*click_handler*/ ctx[20])
    				];

    				mounted = true;
    			}
    		},
    		p(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && dirty & /*$$scope*/ 262144) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[18], dirty, null, null);
    				}
    			}

    			set_attributes(button_1, button_1_data = get_spread_update(button_1_levels, [
    				(!current || dirty & /*size, klass*/ 34 && button_1_class_value !== (button_1_class_value = "s-btn size-" + /*size*/ ctx[5] + " " + /*klass*/ ctx[1])) && { class: button_1_class_value },
    				(!current || dirty & /*type*/ 16384) && { type: /*type*/ ctx[14] },
    				(!current || dirty & /*style*/ 65536) && { style: /*style*/ ctx[16] },
    				(!current || dirty & /*disabled*/ 2048) && { disabled: /*disabled*/ ctx[11] },
    				(!current || dirty & /*disabled*/ 2048) && { "aria-disabled": /*disabled*/ ctx[11] },
    				dirty & /*$$restProps*/ 131072 && /*$$restProps*/ ctx[17]
    			]));

    			if (Class_action && is_function(Class_action.update) && dirty & /*active, activeClass*/ 12288) Class_action.update.call(null, [/*active*/ ctx[12] && /*activeClass*/ ctx[13]]);
    			if (Ripple_action && is_function(Ripple_action.update) && dirty & /*ripple*/ 32768) Ripple_action.update.call(null, /*ripple*/ ctx[15]);
    			toggle_class(button_1, "s-btn--fab", /*fab*/ ctx[2]);
    			toggle_class(button_1, "icon", /*icon*/ ctx[3]);
    			toggle_class(button_1, "block", /*block*/ ctx[4]);
    			toggle_class(button_1, "tile", /*tile*/ ctx[6]);
    			toggle_class(button_1, "text", /*text*/ ctx[7] || /*icon*/ ctx[3]);
    			toggle_class(button_1, "depressed", /*depressed*/ ctx[8] || /*text*/ ctx[7] || /*disabled*/ ctx[11] || /*outlined*/ ctx[9] || /*icon*/ ctx[3]);
    			toggle_class(button_1, "outlined", /*outlined*/ ctx[9]);
    			toggle_class(button_1, "rounded", /*rounded*/ ctx[10]);
    			toggle_class(button_1, "disabled", /*disabled*/ ctx[11]);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(button_1);
    			if (default_slot) default_slot.d(detaching);
    			/*button_1_binding*/ ctx[21](null);
    			mounted = false;
    			run_all(dispose);
    		}
    	};
    }

    function instance$n($$self, $$props, $$invalidate) {
    	const omit_props_names = [
    		"class","fab","icon","block","size","tile","text","depressed","outlined","rounded","disabled","active","activeClass","type","ripple","style","button"
    	];

    	let $$restProps = compute_rest_props($$props, omit_props_names);
    	let { $$slots: slots = {}, $$scope } = $$props;
    	let { class: klass = "" } = $$props;
    	let { fab = false } = $$props;
    	let { icon = false } = $$props;
    	let { block = false } = $$props;
    	let { size = "default" } = $$props;
    	let { tile = false } = $$props;
    	let { text = false } = $$props;
    	let { depressed = false } = $$props;
    	let { outlined = false } = $$props;
    	let { rounded = false } = $$props;
    	let { disabled = null } = $$props;
    	let { active = false } = $$props;
    	let { activeClass = "active" } = $$props;
    	let { type = "button" } = $$props;
    	let { ripple = {} } = $$props;
    	let { style = null } = $$props;
    	let { button = null } = $$props;

    	function click_handler(event) {
    		bubble($$self, event);
    	}

    	function button_1_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			button = $$value;
    			$$invalidate(0, button);
    		});
    	}

    	$$self.$$set = $$new_props => {
    		$$props = assign(assign({}, $$props), exclude_internal_props($$new_props));
    		$$invalidate(17, $$restProps = compute_rest_props($$props, omit_props_names));
    		if ("class" in $$new_props) $$invalidate(1, klass = $$new_props.class);
    		if ("fab" in $$new_props) $$invalidate(2, fab = $$new_props.fab);
    		if ("icon" in $$new_props) $$invalidate(3, icon = $$new_props.icon);
    		if ("block" in $$new_props) $$invalidate(4, block = $$new_props.block);
    		if ("size" in $$new_props) $$invalidate(5, size = $$new_props.size);
    		if ("tile" in $$new_props) $$invalidate(6, tile = $$new_props.tile);
    		if ("text" in $$new_props) $$invalidate(7, text = $$new_props.text);
    		if ("depressed" in $$new_props) $$invalidate(8, depressed = $$new_props.depressed);
    		if ("outlined" in $$new_props) $$invalidate(9, outlined = $$new_props.outlined);
    		if ("rounded" in $$new_props) $$invalidate(10, rounded = $$new_props.rounded);
    		if ("disabled" in $$new_props) $$invalidate(11, disabled = $$new_props.disabled);
    		if ("active" in $$new_props) $$invalidate(12, active = $$new_props.active);
    		if ("activeClass" in $$new_props) $$invalidate(13, activeClass = $$new_props.activeClass);
    		if ("type" in $$new_props) $$invalidate(14, type = $$new_props.type);
    		if ("ripple" in $$new_props) $$invalidate(15, ripple = $$new_props.ripple);
    		if ("style" in $$new_props) $$invalidate(16, style = $$new_props.style);
    		if ("button" in $$new_props) $$invalidate(0, button = $$new_props.button);
    		if ("$$scope" in $$new_props) $$invalidate(18, $$scope = $$new_props.$$scope);
    	};

    	return [
    		button,
    		klass,
    		fab,
    		icon,
    		block,
    		size,
    		tile,
    		text,
    		depressed,
    		outlined,
    		rounded,
    		disabled,
    		active,
    		activeClass,
    		type,
    		ripple,
    		style,
    		$$restProps,
    		$$scope,
    		slots,
    		click_handler,
    		button_1_binding
    	];
    }

    class Button extends SvelteComponent {
    	constructor(options) {
    		super();
    		if (!document.getElementById("svelte-qnwijx-style")) add_css$j();

    		init(this, options, instance$n, create_fragment$n, safe_not_equal, {
    			class: 1,
    			fab: 2,
    			icon: 3,
    			block: 4,
    			size: 5,
    			tile: 6,
    			text: 7,
    			depressed: 8,
    			outlined: 9,
    			rounded: 10,
    			disabled: 11,
    			active: 12,
    			activeClass: 13,
    			type: 14,
    			ripple: 15,
    			style: 16,
    			button: 0
    		});
    	}
    }

    const subscriber_queue = [];
    /**
     * Create a `Writable` store that allows both updating and reading by subscription.
     * @param {*=}value initial value
     * @param {StartStopNotifier=}start start and stop notifications for subscriptions
     */
    function writable(value, start = noop) {
        let stop;
        const subscribers = [];
        function set(new_value) {
            if (safe_not_equal(value, new_value)) {
                value = new_value;
                if (stop) { // store is ready
                    const run_queue = !subscriber_queue.length;
                    for (let i = 0; i < subscribers.length; i += 1) {
                        const s = subscribers[i];
                        s[1]();
                        subscriber_queue.push(s, value);
                    }
                    if (run_queue) {
                        for (let i = 0; i < subscriber_queue.length; i += 2) {
                            subscriber_queue[i][0](subscriber_queue[i + 1]);
                        }
                        subscriber_queue.length = 0;
                    }
                }
            }
        }
        function update(fn) {
            set(fn(value));
        }
        function subscribe(run, invalidate = noop) {
            const subscriber = [run, invalidate];
            subscribers.push(subscriber);
            if (subscribers.length === 1) {
                stop = start(set) || noop;
            }
            run(value);
            return () => {
                const index = subscribers.indexOf(subscriber);
                if (index !== -1) {
                    subscribers.splice(index, 1);
                }
                if (subscribers.length === 0) {
                    stop();
                    stop = null;
                }
            };
        }
        return { set, update, subscribe };
    }

    /* node_modules\svelte-materialify\src\components\ItemGroup\ItemGroup.svelte generated by Svelte v3.35.0 */

    function add_css$i() {
    	var style = element("style");
    	style.id = "svelte-bhgnu-style";
    	style.textContent = ".s-item-group{flex:0 1 auto;position:relative;max-width:100%;transition:0.3s cubic-bezier(0.25, 0.8, 0.5, 1)}";
    	append(document.head, style);
    }

    function create_fragment$m(ctx) {
    	let div;
    	let div_class_value;
    	let current;
    	const default_slot_template = /*#slots*/ ctx[9].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[8], null);

    	return {
    		c() {
    			div = element("div");
    			if (default_slot) default_slot.c();
    			attr(div, "class", div_class_value = "s-item-group " + /*klass*/ ctx[0]);
    			attr(div, "role", /*role*/ ctx[1]);
    			attr(div, "style", /*style*/ ctx[2]);
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);

    			if (default_slot) {
    				default_slot.m(div, null);
    			}

    			current = true;
    		},
    		p(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && dirty & /*$$scope*/ 256) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[8], dirty, null, null);
    				}
    			}

    			if (!current || dirty & /*klass*/ 1 && div_class_value !== (div_class_value = "s-item-group " + /*klass*/ ctx[0])) {
    				attr(div, "class", div_class_value);
    			}

    			if (!current || dirty & /*role*/ 2) {
    				attr(div, "role", /*role*/ ctx[1]);
    			}

    			if (!current || dirty & /*style*/ 4) {
    				attr(div, "style", /*style*/ ctx[2]);
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    			if (default_slot) default_slot.d(detaching);
    		}
    	};
    }

    const ITEM_GROUP = {};

    function instance$m($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	let { class: klass = "" } = $$props;
    	let { activeClass = "" } = $$props;
    	let { value = [] } = $$props;
    	let { multiple = false } = $$props;
    	let { mandatory = false } = $$props;
    	let { max = Infinity } = $$props;
    	let { role = null } = $$props;
    	let { style = null } = $$props;
    	const dispatch = createEventDispatcher();
    	const valueStore = writable(value);
    	let startIndex = -1;

    	setContext(ITEM_GROUP, {
    		select: val => {
    			if (multiple) {
    				if (value.includes(val)) {
    					if (!mandatory || value.length > 1) {
    						value.splice(value.indexOf(val), 1);
    						$$invalidate(3, value);
    					}
    				} else if (value.length < max) $$invalidate(3, value = [...value, val]);
    			} else if (value === val) {
    				if (!mandatory) $$invalidate(3, value = null);
    			} else $$invalidate(3, value = val);
    		},
    		register: setValue => {
    			const u = valueStore.subscribe(val => {
    				setValue(multiple ? val : [val]);
    			});

    			onDestroy(u);
    		},
    		index: () => {
    			startIndex += 1;
    			return startIndex;
    		},
    		activeClass
    	});

    	$$self.$$set = $$props => {
    		if ("class" in $$props) $$invalidate(0, klass = $$props.class);
    		if ("activeClass" in $$props) $$invalidate(4, activeClass = $$props.activeClass);
    		if ("value" in $$props) $$invalidate(3, value = $$props.value);
    		if ("multiple" in $$props) $$invalidate(5, multiple = $$props.multiple);
    		if ("mandatory" in $$props) $$invalidate(6, mandatory = $$props.mandatory);
    		if ("max" in $$props) $$invalidate(7, max = $$props.max);
    		if ("role" in $$props) $$invalidate(1, role = $$props.role);
    		if ("style" in $$props) $$invalidate(2, style = $$props.style);
    		if ("$$scope" in $$props) $$invalidate(8, $$scope = $$props.$$scope);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*value*/ 8) {
    			valueStore.set(value);
    		}

    		if ($$self.$$.dirty & /*value*/ 8) {
    			dispatch("change", value);
    		}
    	};

    	return [
    		klass,
    		role,
    		style,
    		value,
    		activeClass,
    		multiple,
    		mandatory,
    		max,
    		$$scope,
    		slots
    	];
    }

    class ItemGroup extends SvelteComponent {
    	constructor(options) {
    		super();
    		if (!document.getElementById("svelte-bhgnu-style")) add_css$i();

    		init(this, options, instance$m, create_fragment$m, safe_not_equal, {
    			class: 0,
    			activeClass: 4,
    			value: 3,
    			multiple: 5,
    			mandatory: 6,
    			max: 7,
    			role: 1,
    			style: 2
    		});
    	}
    }

    /* eslint-disable no-param-reassign */

    /**
     * @param {string} klass
     */
    function formatClass$1(klass) {
      return klass.split(' ').map((i) => {
        if (/^(lighten|darken|accent)-/.test(i)) {
          return `text-${i}`;
        }
        return `${i}-text`;
      });
    }

    function setTextColor(node, text) {
      if (/^(#|rgb|hsl|currentColor)/.test(text)) {
        // This is a CSS hex.
        node.style.color = text;
        return false;
      }
      if (text.startsWith('--')) {
        // This is a CSS variable.
        node.style.color = `var(${text})`;
        return false;
      }
      const klass = formatClass$1(text);
      node.classList.add(...klass);
      return klass;
    }

    /**
     * @param node {Element}
     * @param text {string|boolean}
     */
    var TextColor = (node, text) => {
      let klass;
      if (typeof text === 'string') {
        klass = setTextColor(node, text);
      }

      return {
        update(newText) {
          if (klass) {
            node.classList.remove(...klass);
          } else {
            node.style.color = null;
          }

          if (typeof newText === 'string') {
            klass = setTextColor(node, newText);
          }
        },
      };
    };

    /* node_modules\svelte-materialify\src\components\Input\Input.svelte generated by Svelte v3.35.0 */

    function add_css$h() {
    	var style = element("style");
    	style.id = "svelte-rjki8-style";
    	style.textContent = ".s-text-field__input{display:flex;flex-grow:1}.s-text-field__input label{position:absolute;max-width:90%;overflow:hidden;text-overflow:ellipsis;top:6px;pointer-events:none;transform-origin:top left}.s-text-field__input label.active{max-width:133%;transform:translateY(-18px) scale(0.75)}.s-text-field__input input{caret-color:inherit;flex:1 1 auto;line-height:20px;padding:8px 0 8px;max-width:100%;min-width:0;width:100%}.s-text-field__wrapper{width:100%;color:inherit;caret-color:currentColor;display:flex;align-items:center}.s-text-field__wrapper::before,.s-text-field__wrapper::after{border-radius:inherit;width:inherit;bottom:-1px;content:\"\";left:0;position:absolute;transition:0.3s cubic-bezier(0.25, 0.8, 0.5, 1);pointer-events:none}.s-text-field__wrapper::before{border-color:var(--theme-text-fields-border);border-style:solid;border-width:thin 0 0 0}.s-text-field__wrapper::after{background-color:currentColor;border-color:currentColor;border-style:solid;border-width:thin 0 thin 0;transform:scaleX(0)}.s-text-field__wrapper:hover::before{border-color:var(--theme-text-primary)}.s-text-field__wrapper:focus-within::after{transform:scale(1)}.s-text-field__wrapper:focus-within label{color:inherit}.s-text-field__wrapper>[slot=prepend]{margin-right:8px}.s-text-field__wrapper>[slot=append]{margin-right:8px}.s-text-field__wrapper.outlined::before{top:0;border-width:thin}.s-text-field__wrapper.outlined:focus-within::before{border-color:currentColor;border-width:2px}.s-text-field__wrapper.outlined label{top:18px}.s-text-field__wrapper.outlined label.active{padding:0 4px;background-color:var(--theme-surface);transform:translateY(-24px) scale(0.75)}.s-text-field__wrapper.outlined,.s-text-field__wrapper.solo,.s-text-field__wrapper.filled{padding:0 1px 0 12px}.s-text-field__wrapper.filled,.s-text-field__wrapper.outlined{min-height:56px}.s-text-field__wrapper.filled{border-radius:4px 4px 0 0;background-color:var(--theme-text-fields-filled)}.s-text-field__wrapper.filled:hover{background-color:var(--theme-text-fields-filled-hover)}.s-text-field__wrapper.filled input,.s-text-field__wrapper.filled textarea{padding-top:22px}.s-text-field__wrapper.filled label{top:20px}.s-text-field__wrapper.filled label.active{transform:translateY(-10px) scale(0.75)}.s-text-field__wrapper.outlined::after,.s-text-field__wrapper.solo::after,.s-text-field__wrapper.rounded::after{display:none}.s-text-field__wrapper.outlined,.s-text-field__wrapper.solo{border-radius:4px}.s-text-field__wrapper.solo{min-height:48px;box-shadow:0 3px 1px -2px rgba(0, 0, 0, 0.2), 0 2px 2px 0 rgba(0, 0, 0, 0.14), 0 1px 5px 0 rgba(0, 0, 0, 0.12)}.s-text-field__wrapper.solo::before{display:none}.s-text-field__wrapper.rounded{border-radius:28px}.s-text-field__wrapper.rounded.filled::before{border:none}.s-text-field__wrapper.rounded.outlined{padding:0 24px}.s-text-field__wrapper.flat{box-shadow:0 0 0 0 rgba(0, 0, 0, 0.2), 0 0 0 0 rgba(0, 0, 0, 0.14), 0 0 0 0 rgba(0, 0, 0, 0.12) !important}.s-text-field.error .s-text-field__wrapper::before,.s-text-field.success .s-text-field__wrapper::before{border-color:currentColor !important}.s-text-field.dense input{padding:4px 0 2px}.s-text-field.dense .s-text-field__wrapper.outlined,.s-text-field.dense .s-text-field__wrapper.filled{min-height:40px}.s-text-field.dense .s-text-field__wrapper.outlined label{top:10px}.s-text-field.dense .s-text-field__wrapper.outlined label.active{transform:translateY(-16px) scale(0.75)}.s-text-field.dense .s-text-field__wrapper.solo{min-height:40px}.s-text-field.dense .s-text-field__wrapper.filled input,.s-text-field.dense .s-text-field__wrapper.filled textarea{margin-top:11px}.s-text-field.dense .s-text-field__wrapper.filled label{top:12px}.s-text-field.dense .s-text-field__wrapper.filled label.active{transform:translateY(-8px) scale(0.75)}.s-textarea textarea{align-self:stretch;flex:1 1 auto;line-height:1.75rem;max-width:100%;min-height:32px;outline:none;padding:0;width:100%;margin-top:4px}.s-textarea .s-text-field__wrapper>[slot=prepend],.s-textarea .s-text-field__wrapper>[slot=append]{align-self:flex-start;margin-top:2px}.s-textarea .s-text-field__wrapper.filled [slot=prepend],.s-textarea .s-text-field__wrapper.filled [slot=append]{margin-top:28px}.s-textarea .s-text-field__wrapper.outlined [slot=prepend],.s-textarea .s-text-field__wrapper.outlined [slot=append]{margin-top:20px}.s-textarea .s-text-field__wrapper.outlined textarea{margin-top:18px}.s-textarea .s-text-field__wrapper.solo [slot=prepend],.s-textarea .s-text-field__wrapper.solo [slot=append]{margin-top:8px}.s-textarea .s-text-field__wrapper.solo textarea{margin-top:8px}.s-textarea .s-text-field__wrapper.autogrow textarea{overflow:hidden}.s-textarea .s-text-field__wrapper.no-resize textarea{resize:none}.s-input__slot{border-radius:inherit;align-items:center;color:inherit;display:flex;margin-bottom:8px;position:relative;transition:0.3s cubic-bezier(0.25, 0.8, 0.5, 1);width:100%;height:inherit}.s-input__control{display:flex;flex-direction:column;width:100%}.s-input__details{color:var(--theme-text-secondary);display:flex;flex:1 0 auto;max-width:100%;font-size:12px;overflow:hidden}.s-input__details>[slot=messages]{display:flex;flex-direction:row;justify-content:space-between;flex-grow:1}.s-input{display:flex;align-items:center;flex-direction:row;flex:1 1 auto;font-size:16px;letter-spacing:normal;max-width:100%;text-align:left}.s-input input{max-height:32px}.s-input input,.s-input textarea{color:var(--theme-text-primary)}.s-input input:invalid,.s-input textarea:invalid{box-shadow:none}.s-input input:focus,.s-input input:active,.s-input textarea:focus,.s-input textarea:active{outline:none}.s-input input::placeholder,.s-input textarea::placeholder{color:var(--theme-text-disabled)}.s-input>[slot=prepend-outer],.s-input>[slot=append-outer]{align-self:flex-start;display:inline-flex;margin-bottom:4px;margin-top:4px;line-height:1}.s-input>[slot=prepend-outer]{margin-right:9px}.s-input>[slot=append-outer]{margin-left:9px}.s-input .s-icon{user-select:none;align-items:center;display:inline-flex;height:24px;flex:1 0 auto;justify-content:center;min-width:24px;width:24px}.s-input label{height:20px;line-height:20px;color:var(--theme-text-secondary);white-space:nowrap;transition:0.3s cubic-bezier(0.25, 0.8, 0.5, 1)}.s-input:focus-within .s-icon{color:inherit}.s-input.disabled{pointer-events:none;color:var(--theme-text-disabled)}.s-input.disabled input,.s-input.disabled textarea{color:var(--theme-text-disabled)}.s-input.disabled .s-icon{color:var(--theme-icons-inactive)}.s-input.disabled label{color:var(--theme-text-disabled)}.s-input.dense .s-input__slot{margin-bottom:4px}";
    	append(document.head, style);
    }

    const get_append_outer_slot_changes$2 = dirty => ({});
    const get_append_outer_slot_context$2 = ctx => ({});
    const get_messages_slot_changes = dirty => ({});
    const get_messages_slot_context = ctx => ({});
    const get_prepend_outer_slot_changes$2 = dirty => ({});
    const get_prepend_outer_slot_context$2 = ctx => ({});

    function create_fragment$l(ctx) {
    	let div3;
    	let t0;
    	let div2;
    	let div0;
    	let t1;
    	let div1;
    	let t2;
    	let div3_class_value;
    	let TextColor_action;
    	let current;
    	let mounted;
    	let dispose;
    	const prepend_outer_slot_template = /*#slots*/ ctx[9]["prepend-outer"];
    	const prepend_outer_slot = create_slot(prepend_outer_slot_template, ctx, /*$$scope*/ ctx[8], get_prepend_outer_slot_context$2);
    	const default_slot_template = /*#slots*/ ctx[9].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[8], null);
    	const messages_slot_template = /*#slots*/ ctx[9].messages;
    	const messages_slot = create_slot(messages_slot_template, ctx, /*$$scope*/ ctx[8], get_messages_slot_context);
    	const append_outer_slot_template = /*#slots*/ ctx[9]["append-outer"];
    	const append_outer_slot = create_slot(append_outer_slot_template, ctx, /*$$scope*/ ctx[8], get_append_outer_slot_context$2);

    	return {
    		c() {
    			div3 = element("div");
    			if (prepend_outer_slot) prepend_outer_slot.c();
    			t0 = space();
    			div2 = element("div");
    			div0 = element("div");
    			if (default_slot) default_slot.c();
    			t1 = space();
    			div1 = element("div");
    			if (messages_slot) messages_slot.c();
    			t2 = space();
    			if (append_outer_slot) append_outer_slot.c();
    			attr(div0, "class", "s-input__slot");
    			attr(div1, "class", "s-input__details");
    			attr(div2, "class", "s-input__control");
    			attr(div3, "class", div3_class_value = "s-input " + /*klass*/ ctx[0]);
    			attr(div3, "style", /*style*/ ctx[7]);
    			toggle_class(div3, "dense", /*dense*/ ctx[2]);
    			toggle_class(div3, "error", /*error*/ ctx[5]);
    			toggle_class(div3, "success", /*success*/ ctx[6]);
    			toggle_class(div3, "readonly", /*readonly*/ ctx[3]);
    			toggle_class(div3, "disabled", /*disabled*/ ctx[4]);
    		},
    		m(target, anchor) {
    			insert(target, div3, anchor);

    			if (prepend_outer_slot) {
    				prepend_outer_slot.m(div3, null);
    			}

    			append(div3, t0);
    			append(div3, div2);
    			append(div2, div0);

    			if (default_slot) {
    				default_slot.m(div0, null);
    			}

    			append(div2, t1);
    			append(div2, div1);

    			if (messages_slot) {
    				messages_slot.m(div1, null);
    			}

    			append(div3, t2);

    			if (append_outer_slot) {
    				append_outer_slot.m(div3, null);
    			}

    			current = true;

    			if (!mounted) {
    				dispose = action_destroyer(TextColor_action = TextColor.call(null, div3, /*success*/ ctx[6]
    				? "success"
    				: /*error*/ ctx[5] ? "error" : /*color*/ ctx[1]));

    				mounted = true;
    			}
    		},
    		p(ctx, [dirty]) {
    			if (prepend_outer_slot) {
    				if (prepend_outer_slot.p && dirty & /*$$scope*/ 256) {
    					update_slot(prepend_outer_slot, prepend_outer_slot_template, ctx, /*$$scope*/ ctx[8], dirty, get_prepend_outer_slot_changes$2, get_prepend_outer_slot_context$2);
    				}
    			}

    			if (default_slot) {
    				if (default_slot.p && dirty & /*$$scope*/ 256) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[8], dirty, null, null);
    				}
    			}

    			if (messages_slot) {
    				if (messages_slot.p && dirty & /*$$scope*/ 256) {
    					update_slot(messages_slot, messages_slot_template, ctx, /*$$scope*/ ctx[8], dirty, get_messages_slot_changes, get_messages_slot_context);
    				}
    			}

    			if (append_outer_slot) {
    				if (append_outer_slot.p && dirty & /*$$scope*/ 256) {
    					update_slot(append_outer_slot, append_outer_slot_template, ctx, /*$$scope*/ ctx[8], dirty, get_append_outer_slot_changes$2, get_append_outer_slot_context$2);
    				}
    			}

    			if (!current || dirty & /*klass*/ 1 && div3_class_value !== (div3_class_value = "s-input " + /*klass*/ ctx[0])) {
    				attr(div3, "class", div3_class_value);
    			}

    			if (!current || dirty & /*style*/ 128) {
    				attr(div3, "style", /*style*/ ctx[7]);
    			}

    			if (TextColor_action && is_function(TextColor_action.update) && dirty & /*success, error, color*/ 98) TextColor_action.update.call(null, /*success*/ ctx[6]
    			? "success"
    			: /*error*/ ctx[5] ? "error" : /*color*/ ctx[1]);

    			if (dirty & /*klass, dense*/ 5) {
    				toggle_class(div3, "dense", /*dense*/ ctx[2]);
    			}

    			if (dirty & /*klass, error*/ 33) {
    				toggle_class(div3, "error", /*error*/ ctx[5]);
    			}

    			if (dirty & /*klass, success*/ 65) {
    				toggle_class(div3, "success", /*success*/ ctx[6]);
    			}

    			if (dirty & /*klass, readonly*/ 9) {
    				toggle_class(div3, "readonly", /*readonly*/ ctx[3]);
    			}

    			if (dirty & /*klass, disabled*/ 17) {
    				toggle_class(div3, "disabled", /*disabled*/ ctx[4]);
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(prepend_outer_slot, local);
    			transition_in(default_slot, local);
    			transition_in(messages_slot, local);
    			transition_in(append_outer_slot, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(prepend_outer_slot, local);
    			transition_out(default_slot, local);
    			transition_out(messages_slot, local);
    			transition_out(append_outer_slot, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(div3);
    			if (prepend_outer_slot) prepend_outer_slot.d(detaching);
    			if (default_slot) default_slot.d(detaching);
    			if (messages_slot) messages_slot.d(detaching);
    			if (append_outer_slot) append_outer_slot.d(detaching);
    			mounted = false;
    			dispose();
    		}
    	};
    }

    function instance$l($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	let { class: klass = "" } = $$props;
    	let { color = null } = $$props;
    	let { dense = false } = $$props;
    	let { readonly = false } = $$props;
    	let { disabled = false } = $$props;
    	let { error = false } = $$props;
    	let { success = false } = $$props;
    	let { style = null } = $$props;

    	$$self.$$set = $$props => {
    		if ("class" in $$props) $$invalidate(0, klass = $$props.class);
    		if ("color" in $$props) $$invalidate(1, color = $$props.color);
    		if ("dense" in $$props) $$invalidate(2, dense = $$props.dense);
    		if ("readonly" in $$props) $$invalidate(3, readonly = $$props.readonly);
    		if ("disabled" in $$props) $$invalidate(4, disabled = $$props.disabled);
    		if ("error" in $$props) $$invalidate(5, error = $$props.error);
    		if ("success" in $$props) $$invalidate(6, success = $$props.success);
    		if ("style" in $$props) $$invalidate(7, style = $$props.style);
    		if ("$$scope" in $$props) $$invalidate(8, $$scope = $$props.$$scope);
    	};

    	return [klass, color, dense, readonly, disabled, error, success, style, $$scope, slots];
    }

    class Input extends SvelteComponent {
    	constructor(options) {
    		super();
    		if (!document.getElementById("svelte-rjki8-style")) add_css$h();

    		init(this, options, instance$l, create_fragment$l, safe_not_equal, {
    			class: 0,
    			color: 1,
    			dense: 2,
    			readonly: 3,
    			disabled: 4,
    			error: 5,
    			success: 6,
    			style: 7
    		});
    	}
    }

    /* eslint-disable */
    // Shamefully ripped from https://github.com/lukeed/uid
    let IDX = 36;
    let HEX = '';
    while (IDX--) HEX += IDX.toString(36);

    var uid = (len) => {
      let str = '';
      let num = len || 11;
      while (num--) str += HEX[(Math.random() * 36) | 0];
      return str;
    };

    var closeIcon = 'M12,2C17.53,2 22,6.47 22,12C22,17.53 17.53,22 12,22C6.47,22 2,17.53 2,12C2,6.47 6.47,2 12,2M15.59,7L12,10.59L8.41,7L7,8.41L10.59,12L7,15.59L8.41,17L12,13.41L15.59,17L17,15.59L13.41,12L17,8.41L15.59,7Z';

    /* node_modules\svelte-materialify\src\components\TextField\TextField.svelte generated by Svelte v3.35.0 */
    const get_append_slot_changes$1 = dirty => ({});
    const get_append_slot_context$1 = ctx => ({});
    const get_clear_icon_slot_changes = dirty => ({});
    const get_clear_icon_slot_context = ctx => ({});
    const get_content_slot_changes = dirty => ({});
    const get_content_slot_context = ctx => ({});
    const get_prepend_slot_changes$1 = dirty => ({});
    const get_prepend_slot_context$1 = ctx => ({});
    const get_prepend_outer_slot_changes$1 = dirty => ({});
    const get_prepend_outer_slot_context$1 = ctx => ({ slot: "prepend-outer" });

    function get_each_context$3(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[44] = list[i];
    	return child_ctx;
    }

    function get_each_context_1$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[44] = list[i];
    	return child_ctx;
    }

    const get_append_outer_slot_changes$1 = dirty => ({});
    const get_append_outer_slot_context$1 = ctx => ({ slot: "append-outer" });

    // (112:4) {#if clearable && value !== ''}
    function create_if_block_1$2(ctx) {
    	let div;
    	let current;
    	let mounted;
    	let dispose;
    	const clear_icon_slot_template = /*#slots*/ ctx[33]["clear-icon"];
    	const clear_icon_slot = create_slot(clear_icon_slot_template, ctx, /*$$scope*/ ctx[43], get_clear_icon_slot_context);
    	const clear_icon_slot_or_fallback = clear_icon_slot || fallback_block$5();

    	return {
    		c() {
    			div = element("div");
    			if (clear_icon_slot_or_fallback) clear_icon_slot_or_fallback.c();
    			set_style(div, "cursor", "pointer");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);

    			if (clear_icon_slot_or_fallback) {
    				clear_icon_slot_or_fallback.m(div, null);
    			}

    			current = true;

    			if (!mounted) {
    				dispose = listen(div, "click", /*clear*/ ctx[26]);
    				mounted = true;
    			}
    		},
    		p(ctx, dirty) {
    			if (clear_icon_slot) {
    				if (clear_icon_slot.p && dirty[1] & /*$$scope*/ 4096) {
    					update_slot(clear_icon_slot, clear_icon_slot_template, ctx, /*$$scope*/ ctx[43], dirty, get_clear_icon_slot_changes, get_clear_icon_slot_context);
    				}
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(clear_icon_slot_or_fallback, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(clear_icon_slot_or_fallback, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    			if (clear_icon_slot_or_fallback) clear_icon_slot_or_fallback.d(detaching);
    			mounted = false;
    			dispose();
    		}
    	};
    }

    // (115:32)             
    function fallback_block$5(ctx) {
    	let icon;
    	let current;
    	icon = new Icon({ props: { path: closeIcon } });

    	return {
    		c() {
    			create_component(icon.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(icon, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i(local) {
    			if (current) return;
    			transition_in(icon.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(icon.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(icon, detaching);
    		}
    	};
    }

    // (64:0) <Input    class="s-text-field {klass}"    {color}    {dense}    {readonly}    {disabled}    {error}    {success}    {style}>
    function create_default_slot$6(ctx) {
    	let div1;
    	let t0;
    	let div0;
    	let label;
    	let t1;
    	let t2;
    	let input;
    	let t3;
    	let t4;
    	let current;
    	let mounted;
    	let dispose;
    	const prepend_slot_template = /*#slots*/ ctx[33].prepend;
    	const prepend_slot = create_slot(prepend_slot_template, ctx, /*$$scope*/ ctx[43], get_prepend_slot_context$1);
    	const default_slot_template = /*#slots*/ ctx[33].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[43], null);
    	const content_slot_template = /*#slots*/ ctx[33].content;
    	const content_slot = create_slot(content_slot_template, ctx, /*$$scope*/ ctx[43], get_content_slot_context);

    	let input_levels = [
    		{ type: "text" },
    		{ placeholder: /*placeholder*/ ctx[14] },
    		{ id: /*id*/ ctx[20] },
    		{ readOnly: /*readonly*/ ctx[12] },
    		{ disabled: /*disabled*/ ctx[13] },
    		/*$$restProps*/ ctx[28]
    	];

    	let input_data = {};

    	for (let i = 0; i < input_levels.length; i += 1) {
    		input_data = assign(input_data, input_levels[i]);
    	}

    	let if_block = /*clearable*/ ctx[11] && /*value*/ ctx[0] !== "" && create_if_block_1$2(ctx);
    	const append_slot_template = /*#slots*/ ctx[33].append;
    	const append_slot = create_slot(append_slot_template, ctx, /*$$scope*/ ctx[43], get_append_slot_context$1);

    	return {
    		c() {
    			div1 = element("div");
    			if (prepend_slot) prepend_slot.c();
    			t0 = space();
    			div0 = element("div");
    			label = element("label");
    			if (default_slot) default_slot.c();
    			t1 = space();
    			if (content_slot) content_slot.c();
    			t2 = space();
    			input = element("input");
    			t3 = space();
    			if (if_block) if_block.c();
    			t4 = space();
    			if (append_slot) append_slot.c();
    			attr(label, "for", /*id*/ ctx[20]);
    			toggle_class(label, "active", /*labelActive*/ ctx[23]);
    			set_attributes(input, input_data);
    			attr(div0, "class", "s-text-field__input");
    			attr(div1, "class", "s-text-field__wrapper");
    			toggle_class(div1, "filled", /*filled*/ ctx[5]);
    			toggle_class(div1, "solo", /*solo*/ ctx[6]);
    			toggle_class(div1, "outlined", /*outlined*/ ctx[7]);
    			toggle_class(div1, "flat", /*flat*/ ctx[8]);
    			toggle_class(div1, "rounded", /*rounded*/ ctx[10]);
    		},
    		m(target, anchor) {
    			insert(target, div1, anchor);

    			if (prepend_slot) {
    				prepend_slot.m(div1, null);
    			}

    			append(div1, t0);
    			append(div1, div0);
    			append(div0, label);

    			if (default_slot) {
    				default_slot.m(label, null);
    			}

    			append(div0, t1);

    			if (content_slot) {
    				content_slot.m(div0, null);
    			}

    			append(div0, t2);
    			append(div0, input);
    			/*input_binding*/ ctx[41](input);
    			set_input_value(input, /*value*/ ctx[0]);
    			append(div1, t3);
    			if (if_block) if_block.m(div1, null);
    			append(div1, t4);

    			if (append_slot) {
    				append_slot.m(div1, null);
    			}

    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen(input, "input", /*input_input_handler*/ ctx[42]),
    					listen(input, "focus", /*onFocus*/ ctx[24]),
    					listen(input, "blur", /*onBlur*/ ctx[25]),
    					listen(input, "input", /*onInput*/ ctx[27]),
    					listen(input, "focus", /*focus_handler*/ ctx[34]),
    					listen(input, "blur", /*blur_handler*/ ctx[35]),
    					listen(input, "input", /*input_handler*/ ctx[36]),
    					listen(input, "change", /*change_handler*/ ctx[37]),
    					listen(input, "keypress", /*keypress_handler*/ ctx[38]),
    					listen(input, "keydown", /*keydown_handler*/ ctx[39]),
    					listen(input, "keyup", /*keyup_handler*/ ctx[40])
    				];

    				mounted = true;
    			}
    		},
    		p(ctx, dirty) {
    			if (prepend_slot) {
    				if (prepend_slot.p && dirty[1] & /*$$scope*/ 4096) {
    					update_slot(prepend_slot, prepend_slot_template, ctx, /*$$scope*/ ctx[43], dirty, get_prepend_slot_changes$1, get_prepend_slot_context$1);
    				}
    			}

    			if (default_slot) {
    				if (default_slot.p && dirty[1] & /*$$scope*/ 4096) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[43], dirty, null, null);
    				}
    			}

    			if (!current || dirty[0] & /*id*/ 1048576) {
    				attr(label, "for", /*id*/ ctx[20]);
    			}

    			if (dirty[0] & /*labelActive*/ 8388608) {
    				toggle_class(label, "active", /*labelActive*/ ctx[23]);
    			}

    			if (content_slot) {
    				if (content_slot.p && dirty[1] & /*$$scope*/ 4096) {
    					update_slot(content_slot, content_slot_template, ctx, /*$$scope*/ ctx[43], dirty, get_content_slot_changes, get_content_slot_context);
    				}
    			}

    			set_attributes(input, input_data = get_spread_update(input_levels, [
    				{ type: "text" },
    				(!current || dirty[0] & /*placeholder*/ 16384) && { placeholder: /*placeholder*/ ctx[14] },
    				(!current || dirty[0] & /*id*/ 1048576) && { id: /*id*/ ctx[20] },
    				(!current || dirty[0] & /*readonly*/ 4096) && { readOnly: /*readonly*/ ctx[12] },
    				(!current || dirty[0] & /*disabled*/ 8192) && { disabled: /*disabled*/ ctx[13] },
    				dirty[0] & /*$$restProps*/ 268435456 && /*$$restProps*/ ctx[28]
    			]));

    			if (dirty[0] & /*value*/ 1 && input.value !== /*value*/ ctx[0]) {
    				set_input_value(input, /*value*/ ctx[0]);
    			}

    			if (/*clearable*/ ctx[11] && /*value*/ ctx[0] !== "") {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty[0] & /*clearable, value*/ 2049) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block_1$2(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(div1, t4);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}

    			if (append_slot) {
    				if (append_slot.p && dirty[1] & /*$$scope*/ 4096) {
    					update_slot(append_slot, append_slot_template, ctx, /*$$scope*/ ctx[43], dirty, get_append_slot_changes$1, get_append_slot_context$1);
    				}
    			}

    			if (dirty[0] & /*filled*/ 32) {
    				toggle_class(div1, "filled", /*filled*/ ctx[5]);
    			}

    			if (dirty[0] & /*solo*/ 64) {
    				toggle_class(div1, "solo", /*solo*/ ctx[6]);
    			}

    			if (dirty[0] & /*outlined*/ 128) {
    				toggle_class(div1, "outlined", /*outlined*/ ctx[7]);
    			}

    			if (dirty[0] & /*flat*/ 256) {
    				toggle_class(div1, "flat", /*flat*/ ctx[8]);
    			}

    			if (dirty[0] & /*rounded*/ 1024) {
    				toggle_class(div1, "rounded", /*rounded*/ ctx[10]);
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(prepend_slot, local);
    			transition_in(default_slot, local);
    			transition_in(content_slot, local);
    			transition_in(if_block);
    			transition_in(append_slot, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(prepend_slot, local);
    			transition_out(default_slot, local);
    			transition_out(content_slot, local);
    			transition_out(if_block);
    			transition_out(append_slot, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(div1);
    			if (prepend_slot) prepend_slot.d(detaching);
    			if (default_slot) default_slot.d(detaching);
    			if (content_slot) content_slot.d(detaching);
    			/*input_binding*/ ctx[41](null);
    			if (if_block) if_block.d();
    			if (append_slot) append_slot.d(detaching);
    			mounted = false;
    			run_all(dispose);
    		}
    	};
    }

    // (74:2) 
    function create_prepend_outer_slot$1(ctx) {
    	let current;
    	const prepend_outer_slot_template = /*#slots*/ ctx[33]["prepend-outer"];
    	const prepend_outer_slot = create_slot(prepend_outer_slot_template, ctx, /*$$scope*/ ctx[43], get_prepend_outer_slot_context$1);

    	return {
    		c() {
    			if (prepend_outer_slot) prepend_outer_slot.c();
    		},
    		m(target, anchor) {
    			if (prepend_outer_slot) {
    				prepend_outer_slot.m(target, anchor);
    			}

    			current = true;
    		},
    		p(ctx, dirty) {
    			if (prepend_outer_slot) {
    				if (prepend_outer_slot.p && dirty[1] & /*$$scope*/ 4096) {
    					update_slot(prepend_outer_slot, prepend_outer_slot_template, ctx, /*$$scope*/ ctx[43], dirty, get_prepend_outer_slot_changes$1, get_prepend_outer_slot_context$1);
    				}
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(prepend_outer_slot, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(prepend_outer_slot, local);
    			current = false;
    		},
    		d(detaching) {
    			if (prepend_outer_slot) prepend_outer_slot.d(detaching);
    		}
    	};
    }

    // (128:6) {#each messages as message}
    function create_each_block_1$1(ctx) {
    	let span;
    	let t_value = /*message*/ ctx[44] + "";
    	let t;

    	return {
    		c() {
    			span = element("span");
    			t = text(t_value);
    		},
    		m(target, anchor) {
    			insert(target, span, anchor);
    			append(span, t);
    		},
    		p(ctx, dirty) {
    			if (dirty[0] & /*messages*/ 131072 && t_value !== (t_value = /*message*/ ctx[44] + "")) set_data(t, t_value);
    		},
    		d(detaching) {
    			if (detaching) detach(span);
    		}
    	};
    }

    // (129:6) {#each errorMessages.slice(0, errorCount) as message}
    function create_each_block$3(ctx) {
    	let span;
    	let t_value = /*message*/ ctx[44] + "";
    	let t;

    	return {
    		c() {
    			span = element("span");
    			t = text(t_value);
    		},
    		m(target, anchor) {
    			insert(target, span, anchor);
    			append(span, t);
    		},
    		p(ctx, dirty) {
    			if (dirty[0] & /*errorMessages, errorCount*/ 4456448 && t_value !== (t_value = /*message*/ ctx[44] + "")) set_data(t, t_value);
    		},
    		d(detaching) {
    			if (detaching) detach(span);
    		}
    	};
    }

    // (131:4) {#if counter}
    function create_if_block$8(ctx) {
    	let span;
    	let t0_value = /*value*/ ctx[0].length + "";
    	let t0;
    	let t1;
    	let t2;

    	return {
    		c() {
    			span = element("span");
    			t0 = text(t0_value);
    			t1 = text(" / ");
    			t2 = text(/*counter*/ ctx[16]);
    		},
    		m(target, anchor) {
    			insert(target, span, anchor);
    			append(span, t0);
    			append(span, t1);
    			append(span, t2);
    		},
    		p(ctx, dirty) {
    			if (dirty[0] & /*value*/ 1 && t0_value !== (t0_value = /*value*/ ctx[0].length + "")) set_data(t0, t0_value);
    			if (dirty[0] & /*counter*/ 65536) set_data(t2, /*counter*/ ctx[16]);
    		},
    		d(detaching) {
    			if (detaching) detach(span);
    		}
    	};
    }

    // (125:2) 
    function create_messages_slot(ctx) {
    	let div1;
    	let div0;
    	let span;
    	let t0;
    	let t1;
    	let t2;
    	let t3;
    	let each_value_1 = /*messages*/ ctx[17];
    	let each_blocks_1 = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks_1[i] = create_each_block_1$1(get_each_context_1$1(ctx, each_value_1, i));
    	}

    	let each_value = /*errorMessages*/ ctx[22].slice(0, /*errorCount*/ ctx[18]);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$3(get_each_context$3(ctx, each_value, i));
    	}

    	let if_block = /*counter*/ ctx[16] && create_if_block$8(ctx);

    	return {
    		c() {
    			div1 = element("div");
    			div0 = element("div");
    			span = element("span");
    			t0 = text(/*hint*/ ctx[15]);
    			t1 = space();

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].c();
    			}

    			t2 = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t3 = space();
    			if (if_block) if_block.c();
    			attr(div1, "slot", "messages");
    		},
    		m(target, anchor) {
    			insert(target, div1, anchor);
    			append(div1, div0);
    			append(div0, span);
    			append(span, t0);
    			append(div0, t1);

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].m(div0, null);
    			}

    			append(div0, t2);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div0, null);
    			}

    			append(div1, t3);
    			if (if_block) if_block.m(div1, null);
    		},
    		p(ctx, dirty) {
    			if (dirty[0] & /*hint*/ 32768) set_data(t0, /*hint*/ ctx[15]);

    			if (dirty[0] & /*messages*/ 131072) {
    				each_value_1 = /*messages*/ ctx[17];
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1$1(ctx, each_value_1, i);

    					if (each_blocks_1[i]) {
    						each_blocks_1[i].p(child_ctx, dirty);
    					} else {
    						each_blocks_1[i] = create_each_block_1$1(child_ctx);
    						each_blocks_1[i].c();
    						each_blocks_1[i].m(div0, t2);
    					}
    				}

    				for (; i < each_blocks_1.length; i += 1) {
    					each_blocks_1[i].d(1);
    				}

    				each_blocks_1.length = each_value_1.length;
    			}

    			if (dirty[0] & /*errorMessages, errorCount*/ 4456448) {
    				each_value = /*errorMessages*/ ctx[22].slice(0, /*errorCount*/ ctx[18]);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$3(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block$3(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div0, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}

    			if (/*counter*/ ctx[16]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block$8(ctx);
    					if_block.c();
    					if_block.m(div1, null);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(div1);
    			destroy_each(each_blocks_1, detaching);
    			destroy_each(each_blocks, detaching);
    			if (if_block) if_block.d();
    		}
    	};
    }

    // (135:2) 
    function create_append_outer_slot$1(ctx) {
    	let current;
    	const append_outer_slot_template = /*#slots*/ ctx[33]["append-outer"];
    	const append_outer_slot = create_slot(append_outer_slot_template, ctx, /*$$scope*/ ctx[43], get_append_outer_slot_context$1);

    	return {
    		c() {
    			if (append_outer_slot) append_outer_slot.c();
    		},
    		m(target, anchor) {
    			if (append_outer_slot) {
    				append_outer_slot.m(target, anchor);
    			}

    			current = true;
    		},
    		p(ctx, dirty) {
    			if (append_outer_slot) {
    				if (append_outer_slot.p && dirty[1] & /*$$scope*/ 4096) {
    					update_slot(append_outer_slot, append_outer_slot_template, ctx, /*$$scope*/ ctx[43], dirty, get_append_outer_slot_changes$1, get_append_outer_slot_context$1);
    				}
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(append_outer_slot, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(append_outer_slot, local);
    			current = false;
    		},
    		d(detaching) {
    			if (append_outer_slot) append_outer_slot.d(detaching);
    		}
    	};
    }

    function create_fragment$k(ctx) {
    	let input;
    	let current;

    	input = new Input({
    			props: {
    				class: "s-text-field " + /*klass*/ ctx[3],
    				color: /*color*/ ctx[4],
    				dense: /*dense*/ ctx[9],
    				readonly: /*readonly*/ ctx[12],
    				disabled: /*disabled*/ ctx[13],
    				error: /*error*/ ctx[1],
    				success: /*success*/ ctx[19],
    				style: /*style*/ ctx[21],
    				$$slots: {
    					"append-outer": [create_append_outer_slot$1],
    					messages: [create_messages_slot],
    					"prepend-outer": [create_prepend_outer_slot$1],
    					default: [create_default_slot$6]
    				},
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			create_component(input.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(input, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const input_changes = {};
    			if (dirty[0] & /*klass*/ 8) input_changes.class = "s-text-field " + /*klass*/ ctx[3];
    			if (dirty[0] & /*color*/ 16) input_changes.color = /*color*/ ctx[4];
    			if (dirty[0] & /*dense*/ 512) input_changes.dense = /*dense*/ ctx[9];
    			if (dirty[0] & /*readonly*/ 4096) input_changes.readonly = /*readonly*/ ctx[12];
    			if (dirty[0] & /*disabled*/ 8192) input_changes.disabled = /*disabled*/ ctx[13];
    			if (dirty[0] & /*error*/ 2) input_changes.error = /*error*/ ctx[1];
    			if (dirty[0] & /*success*/ 524288) input_changes.success = /*success*/ ctx[19];
    			if (dirty[0] & /*style*/ 2097152) input_changes.style = /*style*/ ctx[21];

    			if (dirty[0] & /*counter, value, errorMessages, errorCount, messages, hint, filled, solo, outlined, flat, rounded, clearable, placeholder, id, readonly, disabled, $$restProps, inputElement, labelActive*/ 282590693 | dirty[1] & /*$$scope*/ 4096) {
    				input_changes.$$scope = { dirty, ctx };
    			}

    			input.$set(input_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(input.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(input.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(input, detaching);
    		}
    	};
    }

    function instance$k($$self, $$props, $$invalidate) {
    	let labelActive;

    	const omit_props_names = [
    		"class","value","color","filled","solo","outlined","flat","dense","rounded","clearable","readonly","disabled","placeholder","hint","counter","messages","rules","errorCount","validateOnBlur","error","success","id","style","inputElement","validate"
    	];

    	let $$restProps = compute_rest_props($$props, omit_props_names);
    	let { $$slots: slots = {}, $$scope } = $$props;
    	let { class: klass = "" } = $$props;
    	let { value = "" } = $$props;
    	let { color = "primary" } = $$props;
    	let { filled = false } = $$props;
    	let { solo = false } = $$props;
    	let { outlined = false } = $$props;
    	let { flat = false } = $$props;
    	let { dense = false } = $$props;
    	let { rounded = false } = $$props;
    	let { clearable = false } = $$props;
    	let { readonly = false } = $$props;
    	let { disabled = false } = $$props;
    	let { placeholder = null } = $$props;
    	let { hint = "" } = $$props;
    	let { counter = false } = $$props;
    	let { messages = [] } = $$props;
    	let { rules = [] } = $$props;
    	let { errorCount = 1 } = $$props;
    	let { validateOnBlur = false } = $$props;
    	let { error = false } = $$props;
    	let { success = false } = $$props;
    	let { id = `s-input-${uid(5)}` } = $$props;
    	let { style = null } = $$props;
    	let { inputElement = null } = $$props;
    	let focused = false;
    	let errorMessages = [];

    	function validate() {
    		$$invalidate(22, errorMessages = rules.map(r => r(value)).filter(r => typeof r === "string"));

    		if (errorMessages.length) $$invalidate(1, error = true); else {
    			$$invalidate(1, error = false);
    		}

    		return error;
    	}

    	function onFocus() {
    		$$invalidate(32, focused = true);
    	}

    	function onBlur() {
    		$$invalidate(32, focused = false);
    		if (validateOnBlur) validate();
    	}

    	function clear() {
    		$$invalidate(0, value = "");
    	}

    	function onInput() {
    		if (!validateOnBlur) validate();
    	}

    	function focus_handler(event) {
    		bubble($$self, event);
    	}

    	function blur_handler(event) {
    		bubble($$self, event);
    	}

    	function input_handler(event) {
    		bubble($$self, event);
    	}

    	function change_handler(event) {
    		bubble($$self, event);
    	}

    	function keypress_handler(event) {
    		bubble($$self, event);
    	}

    	function keydown_handler(event) {
    		bubble($$self, event);
    	}

    	function keyup_handler(event) {
    		bubble($$self, event);
    	}

    	function input_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			inputElement = $$value;
    			$$invalidate(2, inputElement);
    		});
    	}

    	function input_input_handler() {
    		value = this.value;
    		$$invalidate(0, value);
    	}

    	$$self.$$set = $$new_props => {
    		$$props = assign(assign({}, $$props), exclude_internal_props($$new_props));
    		$$invalidate(28, $$restProps = compute_rest_props($$props, omit_props_names));
    		if ("class" in $$new_props) $$invalidate(3, klass = $$new_props.class);
    		if ("value" in $$new_props) $$invalidate(0, value = $$new_props.value);
    		if ("color" in $$new_props) $$invalidate(4, color = $$new_props.color);
    		if ("filled" in $$new_props) $$invalidate(5, filled = $$new_props.filled);
    		if ("solo" in $$new_props) $$invalidate(6, solo = $$new_props.solo);
    		if ("outlined" in $$new_props) $$invalidate(7, outlined = $$new_props.outlined);
    		if ("flat" in $$new_props) $$invalidate(8, flat = $$new_props.flat);
    		if ("dense" in $$new_props) $$invalidate(9, dense = $$new_props.dense);
    		if ("rounded" in $$new_props) $$invalidate(10, rounded = $$new_props.rounded);
    		if ("clearable" in $$new_props) $$invalidate(11, clearable = $$new_props.clearable);
    		if ("readonly" in $$new_props) $$invalidate(12, readonly = $$new_props.readonly);
    		if ("disabled" in $$new_props) $$invalidate(13, disabled = $$new_props.disabled);
    		if ("placeholder" in $$new_props) $$invalidate(14, placeholder = $$new_props.placeholder);
    		if ("hint" in $$new_props) $$invalidate(15, hint = $$new_props.hint);
    		if ("counter" in $$new_props) $$invalidate(16, counter = $$new_props.counter);
    		if ("messages" in $$new_props) $$invalidate(17, messages = $$new_props.messages);
    		if ("rules" in $$new_props) $$invalidate(29, rules = $$new_props.rules);
    		if ("errorCount" in $$new_props) $$invalidate(18, errorCount = $$new_props.errorCount);
    		if ("validateOnBlur" in $$new_props) $$invalidate(30, validateOnBlur = $$new_props.validateOnBlur);
    		if ("error" in $$new_props) $$invalidate(1, error = $$new_props.error);
    		if ("success" in $$new_props) $$invalidate(19, success = $$new_props.success);
    		if ("id" in $$new_props) $$invalidate(20, id = $$new_props.id);
    		if ("style" in $$new_props) $$invalidate(21, style = $$new_props.style);
    		if ("inputElement" in $$new_props) $$invalidate(2, inputElement = $$new_props.inputElement);
    		if ("$$scope" in $$new_props) $$invalidate(43, $$scope = $$new_props.$$scope);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty[0] & /*placeholder, value*/ 16385 | $$self.$$.dirty[1] & /*focused*/ 2) {
    			$$invalidate(23, labelActive = !!placeholder || value || focused);
    		}
    	};

    	return [
    		value,
    		error,
    		inputElement,
    		klass,
    		color,
    		filled,
    		solo,
    		outlined,
    		flat,
    		dense,
    		rounded,
    		clearable,
    		readonly,
    		disabled,
    		placeholder,
    		hint,
    		counter,
    		messages,
    		errorCount,
    		success,
    		id,
    		style,
    		errorMessages,
    		labelActive,
    		onFocus,
    		onBlur,
    		clear,
    		onInput,
    		$$restProps,
    		rules,
    		validateOnBlur,
    		validate,
    		focused,
    		slots,
    		focus_handler,
    		blur_handler,
    		input_handler,
    		change_handler,
    		keypress_handler,
    		keydown_handler,
    		keyup_handler,
    		input_binding,
    		input_input_handler,
    		$$scope
    	];
    }

    class TextField extends SvelteComponent {
    	constructor(options) {
    		super();

    		init(
    			this,
    			options,
    			instance$k,
    			create_fragment$k,
    			safe_not_equal,
    			{
    				class: 3,
    				value: 0,
    				color: 4,
    				filled: 5,
    				solo: 6,
    				outlined: 7,
    				flat: 8,
    				dense: 9,
    				rounded: 10,
    				clearable: 11,
    				readonly: 12,
    				disabled: 13,
    				placeholder: 14,
    				hint: 15,
    				counter: 16,
    				messages: 17,
    				rules: 29,
    				errorCount: 18,
    				validateOnBlur: 30,
    				error: 1,
    				success: 19,
    				id: 20,
    				style: 21,
    				inputElement: 2,
    				validate: 31
    			},
    			[-1, -1]
    		);
    	}

    	get validate() {
    		return this.$$.ctx[31];
    	}
    }

    function cubicOut(t) {
        const f = t - 1.0;
        return f * f * f + 1.0;
    }

    function fade(node, { delay = 0, duration = 400, easing = identity } = {}) {
        const o = +getComputedStyle(node).opacity;
        return {
            delay,
            duration,
            easing,
            css: t => `opacity: ${t * o}`
        };
    }
    function scale(node, { delay = 0, duration = 400, easing = cubicOut, start = 0, opacity = 0 } = {}) {
        const style = getComputedStyle(node);
        const target_opacity = +style.opacity;
        const transform = style.transform === 'none' ? '' : style.transform;
        const sd = 1 - start;
        const od = target_opacity * (1 - opacity);
        return {
            delay,
            duration,
            easing,
            css: (_t, u) => `
			transform: ${transform} scale(${1 - (sd * u)});
			opacity: ${target_opacity - (od * u)}
		`
        };
    }

    /* node_modules\svelte-materialify\src\components\Menu\Menu.svelte generated by Svelte v3.35.0 */

    function add_css$g() {
    	var style = element("style");
    	style.id = "svelte-14l9ssy-style";
    	style.textContent = ".s-menu__wrapper{position:relative;display:inline-flex;justify-content:center;align-items:center}.s-menu__wrapper [slot=activator]{width:100%}.s-menu{background-color:var(--theme-surface);backface-visibility:hidden;position:absolute;contain:content;max-height:350px;overflow:auto;box-shadow:0 5px 5px -3px rgba(0, 0, 0, 0.2), 0 8px 10px 1px rgba(0, 0, 0, 0.14), 0 3px 14px 2px rgba(0, 0, 0, 0.12)}.s-menu:not(.tile){border-radius:4px}";
    	append(document.head, style);
    }

    const get_activator_slot_changes = dirty => ({});
    const get_activator_slot_context = ctx => ({});

    // (145:2) {#if active}
    function create_if_block$7(ctx) {
    	let div;
    	let div_class_value;
    	let div_style_value;
    	let div_intro;
    	let div_outro;
    	let current;
    	let mounted;
    	let dispose;
    	const default_slot_template = /*#slots*/ ctx[26].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[25], null);

    	return {
    		c() {
    			div = element("div");
    			if (default_slot) default_slot.c();
    			attr(div, "class", div_class_value = "s-menu " + /*klass*/ ctx[1]);
    			attr(div, "role", "menu");
    			attr(div, "style", div_style_value = "" + (/*position*/ ctx[9] + ";transform-origin:" + /*origin*/ ctx[8] + ";z-index:" + /*index*/ ctx[6] + ";" + /*style*/ ctx[7]));
    			toggle_class(div, "tile", /*tile*/ ctx[5]);
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);

    			if (default_slot) {
    				default_slot.m(div, null);
    			}

    			current = true;

    			if (!mounted) {
    				dispose = listen(div, "click", /*menuClick*/ ctx[11]);
    				mounted = true;
    			}
    		},
    		p(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (default_slot) {
    				if (default_slot.p && dirty[0] & /*$$scope*/ 33554432) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[25], dirty, null, null);
    				}
    			}

    			if (!current || dirty[0] & /*klass*/ 2 && div_class_value !== (div_class_value = "s-menu " + /*klass*/ ctx[1])) {
    				attr(div, "class", div_class_value);
    			}

    			if (!current || dirty[0] & /*position, origin, index, style*/ 960 && div_style_value !== (div_style_value = "" + (/*position*/ ctx[9] + ";transform-origin:" + /*origin*/ ctx[8] + ";z-index:" + /*index*/ ctx[6] + ";" + /*style*/ ctx[7]))) {
    				attr(div, "style", div_style_value);
    			}

    			if (dirty[0] & /*klass, tile*/ 34) {
    				toggle_class(div, "tile", /*tile*/ ctx[5]);
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(default_slot, local);

    			add_render_callback(() => {
    				if (div_outro) div_outro.end(1);
    				if (!div_intro) div_intro = create_in_transition(div, /*transition*/ ctx[2], /*inOpts*/ ctx[3]);
    				div_intro.start();
    			});

    			current = true;
    		},
    		o(local) {
    			transition_out(default_slot, local);
    			if (div_intro) div_intro.invalidate();
    			div_outro = create_out_transition(div, /*transition*/ ctx[2], /*outOpts*/ ctx[4]);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    			if (default_slot) default_slot.d(detaching);
    			if (detaching && div_outro) div_outro.end();
    			mounted = false;
    			dispose();
    		}
    	};
    }

    function create_fragment$j(ctx) {
    	let div;
    	let t;
    	let current;
    	let mounted;
    	let dispose;
    	const activator_slot_template = /*#slots*/ ctx[26].activator;
    	const activator_slot = create_slot(activator_slot_template, ctx, /*$$scope*/ ctx[25], get_activator_slot_context);
    	let if_block = /*active*/ ctx[0] && create_if_block$7(ctx);

    	return {
    		c() {
    			div = element("div");
    			if (activator_slot) activator_slot.c();
    			t = space();
    			if (if_block) if_block.c();
    			attr(div, "class", "s-menu__wrapper");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);

    			if (activator_slot) {
    				activator_slot.m(div, null);
    			}

    			append(div, t);
    			if (if_block) if_block.m(div, null);
    			/*div_binding*/ ctx[27](div);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					action_destroyer(ClickOutside.call(null, div)),
    					listen(div, "clickOutside", /*clickOutsideMenu*/ ctx[12])
    				];

    				mounted = true;
    			}
    		},
    		p(ctx, dirty) {
    			if (activator_slot) {
    				if (activator_slot.p && dirty[0] & /*$$scope*/ 33554432) {
    					update_slot(activator_slot, activator_slot_template, ctx, /*$$scope*/ ctx[25], dirty, get_activator_slot_changes, get_activator_slot_context);
    				}
    			}

    			if (/*active*/ ctx[0]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty[0] & /*active*/ 1) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block$7(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(div, null);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(activator_slot, local);
    			transition_in(if_block);
    			current = true;
    		},
    		o(local) {
    			transition_out(activator_slot, local);
    			transition_out(if_block);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    			if (activator_slot) activator_slot.d(detaching);
    			if (if_block) if_block.d();
    			/*div_binding*/ ctx[27](null);
    			mounted = false;
    			run_all(dispose);
    		}
    	};
    }

    function instance$j($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	let { class: klass = "" } = $$props;
    	let { active = false } = $$props;
    	let { absolute = false } = $$props;
    	let { transition = fade } = $$props;
    	let { inOpts = { duration: 250 } } = $$props;
    	let { outOpts = { duration: 200 } } = $$props;
    	let { offsetX = false } = $$props;
    	let { offsetY = true } = $$props;
    	let { nudgeX = 0 } = $$props;
    	let { nudgeY = 0 } = $$props;
    	let { openOnClick = true } = $$props;
    	let { hover = false } = $$props;
    	let { closeOnClickOutside = true } = $$props;
    	let { closeOnClick = true } = $$props;
    	let { bottom = false } = $$props;
    	let { right = false } = $$props;
    	let { tile = false } = $$props;
    	let { disabled = false } = $$props;
    	let { index = 8 } = $$props;
    	let { style = "" } = $$props;
    	let origin = "top left";
    	let position;
    	let wrapper;
    	const dispatch = createEventDispatcher();

    	const align = {
    		x: right ? "right" : "left",
    		y: bottom ? "bottom" : "top"
    	};

    	setContext("S_ListItemRole", "menuitem");
    	setContext("S_ListItemRipple", true);

    	// For opening the menu
    	function open(posX = 0, posY = 0) {
    		$$invalidate(0, active = true);
    		const rect = wrapper.getBoundingClientRect();
    		let x = nudgeX;
    		let y = nudgeY;

    		if (absolute) {
    			x += posX;
    			y += posY;
    		} else {
    			if (offsetX) x += rect.width;
    			if (offsetY) y += rect.height;
    		}

    		$$invalidate(9, position = `${align.y}:${y}px;${align.x}:${x}px`);
    		$$invalidate(8, origin = `${align.y} ${align.x}`);

    		/**
     * Event when menu is opened.
     * @returns Nothing
     */
    		dispatch("open");
    	}

    	// For closing the menu.
    	function close() {
    		$$invalidate(0, active = false);

    		/**
     * Event when menu is closed.
     * @returns Nothing
     */
    		dispatch("close");
    	}

    	// When the activator slot is clicked.
    	function triggerClick(e) {
    		if (!disabled) {
    			if (active) {
    				close();
    			} else if (openOnClick) {
    				open(e.offsetX, e.offsetY);
    			}
    		}
    	}

    	// When the menu itself is clicked.
    	function menuClick() {
    		if (active && closeOnClick) close();
    	}

    	// When user clicked somewhere outside the menu.
    	function clickOutsideMenu() {
    		if (active && closeOnClickOutside) close();
    	}

    	onMount(() => {
    		const trigger = wrapper.querySelector("[slot='activator']");

    		// Opening the menu if active is set to true.
    		if (active) open();

    		trigger.addEventListener("click", triggerClick, { passive: true });

    		if (hover) {
    			wrapper.addEventListener("mouseenter", open, { passive: true });
    			wrapper.addEventListener("mouseleave", close, { passive: true });
    		}

    		return () => {
    			trigger.removeEventListener("click", triggerClick);

    			if (hover) {
    				wrapper.removeEventListener("mouseenter", open);
    				wrapper.removeEventListener("mouseleave", close);
    			}
    		};
    	});

    	function div_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			wrapper = $$value;
    			$$invalidate(10, wrapper);
    		});
    	}

    	$$self.$$set = $$props => {
    		if ("class" in $$props) $$invalidate(1, klass = $$props.class);
    		if ("active" in $$props) $$invalidate(0, active = $$props.active);
    		if ("absolute" in $$props) $$invalidate(13, absolute = $$props.absolute);
    		if ("transition" in $$props) $$invalidate(2, transition = $$props.transition);
    		if ("inOpts" in $$props) $$invalidate(3, inOpts = $$props.inOpts);
    		if ("outOpts" in $$props) $$invalidate(4, outOpts = $$props.outOpts);
    		if ("offsetX" in $$props) $$invalidate(14, offsetX = $$props.offsetX);
    		if ("offsetY" in $$props) $$invalidate(15, offsetY = $$props.offsetY);
    		if ("nudgeX" in $$props) $$invalidate(16, nudgeX = $$props.nudgeX);
    		if ("nudgeY" in $$props) $$invalidate(17, nudgeY = $$props.nudgeY);
    		if ("openOnClick" in $$props) $$invalidate(18, openOnClick = $$props.openOnClick);
    		if ("hover" in $$props) $$invalidate(19, hover = $$props.hover);
    		if ("closeOnClickOutside" in $$props) $$invalidate(20, closeOnClickOutside = $$props.closeOnClickOutside);
    		if ("closeOnClick" in $$props) $$invalidate(21, closeOnClick = $$props.closeOnClick);
    		if ("bottom" in $$props) $$invalidate(22, bottom = $$props.bottom);
    		if ("right" in $$props) $$invalidate(23, right = $$props.right);
    		if ("tile" in $$props) $$invalidate(5, tile = $$props.tile);
    		if ("disabled" in $$props) $$invalidate(24, disabled = $$props.disabled);
    		if ("index" in $$props) $$invalidate(6, index = $$props.index);
    		if ("style" in $$props) $$invalidate(7, style = $$props.style);
    		if ("$$scope" in $$props) $$invalidate(25, $$scope = $$props.$$scope);
    	};

    	return [
    		active,
    		klass,
    		transition,
    		inOpts,
    		outOpts,
    		tile,
    		index,
    		style,
    		origin,
    		position,
    		wrapper,
    		menuClick,
    		clickOutsideMenu,
    		absolute,
    		offsetX,
    		offsetY,
    		nudgeX,
    		nudgeY,
    		openOnClick,
    		hover,
    		closeOnClickOutside,
    		closeOnClick,
    		bottom,
    		right,
    		disabled,
    		$$scope,
    		slots,
    		div_binding
    	];
    }

    class Menu extends SvelteComponent {
    	constructor(options) {
    		super();
    		if (!document.getElementById("svelte-14l9ssy-style")) add_css$g();

    		init(
    			this,
    			options,
    			instance$j,
    			create_fragment$j,
    			safe_not_equal,
    			{
    				class: 1,
    				active: 0,
    				absolute: 13,
    				transition: 2,
    				inOpts: 3,
    				outOpts: 4,
    				offsetX: 14,
    				offsetY: 15,
    				nudgeX: 16,
    				nudgeY: 17,
    				openOnClick: 18,
    				hover: 19,
    				closeOnClickOutside: 20,
    				closeOnClick: 21,
    				bottom: 22,
    				right: 23,
    				tile: 5,
    				disabled: 24,
    				index: 6,
    				style: 7
    			},
    			[-1, -1]
    		);
    	}
    }

    /* node_modules\svelte-materialify\src\components\List\List.svelte generated by Svelte v3.35.0 */

    function add_css$f() {
    	var style = element("style");
    	style.id = "svelte-1b3idk6-style";
    	style.textContent = ".s-list{color:var(--theme-text-primary);display:block;padding:8px 0;padding-top:8px;position:static}.s-list .s-subheader{padding-top:0}.s-list .s-list-item.active{color:inherit}.s-list.disabled{pointer-events:none}.s-list.dense .s-subheader{font-size:0.75rem;height:40px;padding:0 8px}.s-list.rounded{padding:8px}.s-list.rounded .s-list-item{border-radius:32px !important}.s-list.nav{padding-left:8px;padding-right:8px}.s-list.nav .s-list-item{padding:0 8px;border-radius:4px}.s-list.nav .s-list-item::before{border-radius:4px}.s-list.nav .s-list-item:not(:last-child):not(:only-child),.s-list.rounded .s-list-item:not(:last-child):not(:only-child){margin-bottom:8px}.s-list.nav .s-list-item.dense:not(:last-child):not(:only-child),.s-list.rounded .s-list-item.dense:not(:last-child):not(:only-child){margin-bottom:4px}.s-list.outlined{border:thin solid var(--theme-dividers)}.s-list.flat .s-list-item::before{display:none}";
    	append(document.head, style);
    }

    function create_fragment$i(ctx) {
    	let div;
    	let div_class_value;
    	let current;
    	const default_slot_template = /*#slots*/ ctx[10].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[9], null);

    	return {
    		c() {
    			div = element("div");
    			if (default_slot) default_slot.c();
    			attr(div, "role", /*role*/ ctx[8]);
    			attr(div, "class", div_class_value = "s-list " + /*klass*/ ctx[0]);
    			attr(div, "aria-disabled", /*disabled*/ ctx[2]);
    			attr(div, "style", /*style*/ ctx[7]);
    			toggle_class(div, "dense", /*dense*/ ctx[1]);
    			toggle_class(div, "disabled", /*disabled*/ ctx[2]);
    			toggle_class(div, "flat", /*flat*/ ctx[3]);
    			toggle_class(div, "nav", /*nav*/ ctx[5]);
    			toggle_class(div, "outlined", /*outlined*/ ctx[6]);
    			toggle_class(div, "rounded", /*rounded*/ ctx[4]);
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);

    			if (default_slot) {
    				default_slot.m(div, null);
    			}

    			current = true;
    		},
    		p(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && dirty & /*$$scope*/ 512) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[9], dirty, null, null);
    				}
    			}

    			if (!current || dirty & /*role*/ 256) {
    				attr(div, "role", /*role*/ ctx[8]);
    			}

    			if (!current || dirty & /*klass*/ 1 && div_class_value !== (div_class_value = "s-list " + /*klass*/ ctx[0])) {
    				attr(div, "class", div_class_value);
    			}

    			if (!current || dirty & /*disabled*/ 4) {
    				attr(div, "aria-disabled", /*disabled*/ ctx[2]);
    			}

    			if (!current || dirty & /*style*/ 128) {
    				attr(div, "style", /*style*/ ctx[7]);
    			}

    			if (dirty & /*klass, dense*/ 3) {
    				toggle_class(div, "dense", /*dense*/ ctx[1]);
    			}

    			if (dirty & /*klass, disabled*/ 5) {
    				toggle_class(div, "disabled", /*disabled*/ ctx[2]);
    			}

    			if (dirty & /*klass, flat*/ 9) {
    				toggle_class(div, "flat", /*flat*/ ctx[3]);
    			}

    			if (dirty & /*klass, nav*/ 33) {
    				toggle_class(div, "nav", /*nav*/ ctx[5]);
    			}

    			if (dirty & /*klass, outlined*/ 65) {
    				toggle_class(div, "outlined", /*outlined*/ ctx[6]);
    			}

    			if (dirty & /*klass, rounded*/ 17) {
    				toggle_class(div, "rounded", /*rounded*/ ctx[4]);
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    			if (default_slot) default_slot.d(detaching);
    		}
    	};
    }

    function instance$i($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	let { class: klass = "" } = $$props;
    	let { dense = null } = $$props;
    	let { disabled = null } = $$props;
    	let { flat = false } = $$props;
    	let { rounded = false } = $$props;
    	let { nav = false } = $$props;
    	let { outlined = false } = $$props;
    	let { style = null } = $$props;
    	let role = null;

    	if (!getContext("S_ListItemRole")) {
    		setContext("S_ListItemRole", "listitem");
    		role = "list";
    	}

    	$$self.$$set = $$props => {
    		if ("class" in $$props) $$invalidate(0, klass = $$props.class);
    		if ("dense" in $$props) $$invalidate(1, dense = $$props.dense);
    		if ("disabled" in $$props) $$invalidate(2, disabled = $$props.disabled);
    		if ("flat" in $$props) $$invalidate(3, flat = $$props.flat);
    		if ("rounded" in $$props) $$invalidate(4, rounded = $$props.rounded);
    		if ("nav" in $$props) $$invalidate(5, nav = $$props.nav);
    		if ("outlined" in $$props) $$invalidate(6, outlined = $$props.outlined);
    		if ("style" in $$props) $$invalidate(7, style = $$props.style);
    		if ("$$scope" in $$props) $$invalidate(9, $$scope = $$props.$$scope);
    	};

    	return [
    		klass,
    		dense,
    		disabled,
    		flat,
    		rounded,
    		nav,
    		outlined,
    		style,
    		role,
    		$$scope,
    		slots
    	];
    }

    class List extends SvelteComponent {
    	constructor(options) {
    		super();
    		if (!document.getElementById("svelte-1b3idk6-style")) add_css$f();

    		init(this, options, instance$i, create_fragment$i, safe_not_equal, {
    			class: 0,
    			dense: 1,
    			disabled: 2,
    			flat: 3,
    			rounded: 4,
    			nav: 5,
    			outlined: 6,
    			style: 7
    		});
    	}
    }

    /* node_modules\svelte-materialify\src\components\List\ListItem.svelte generated by Svelte v3.35.0 */

    function add_css$e() {
    	var style = element("style");
    	style.id = "svelte-1cqw5u4-style";
    	style.textContent = ".s-list-item__content{align-items:center;align-self:center;display:flex;flex-wrap:wrap;flex:1 1;overflow:hidden;padding:12px 0}.s-list-item__content>*{line-height:1.1;flex:1 0 100%}.s-list-item__content>*:not(:last-child){margin-bottom:2px}.s-list-item__title,.s-list-item__subtitle{flex:1 1 100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;line-height:1.2}.s-list-item__title{align-self:center;font-size:1rem}.s-list-item__subtitle{font-size:0.875rem;color:var(--theme-text-secondary)}.s-list-item{align-items:center;display:flex;flex:1 1 100%;letter-spacing:normal;min-height:48px;outline:none;padding:0 16px;position:relative;text-decoration:none}.s-list-item .s-avatar{align-self:center;margin-top:8px;margin-bottom:8px}.s-list-item .s-icon{align-self:flex-start;margin-top:16px;margin-bottom:16px}.s-list-item .s-icon,.s-list-item .s-avatar{display:inline-flex;min-width:24px}.s-list-item [slot=prepend] .s-avatar{margin-right:16px}.s-list-item [slot=prepend] .s-icon,.s-list-item [slot=prepend] .s-checkbox,.s-list-item [slot=prepend] .s-radio{margin-right:32px}.s-list-item.link{cursor:pointer;user-select:none}.s-list-item.link::before{background-color:currentColor;bottom:0;top:0;left:0;right:0;content:\"\";pointer-events:none;position:absolute;opacity:0;transition:0.3s cubic-bezier(0.25, 0.8, 0.5, 1)}.s-list-item.link:not(.active):hover::before{opacity:0.04}.s-list-item.selectable{user-select:auto}.s-list-item.multiline .s-list-item__title,.s-list-item.multiline .s-list-item__subtitle{white-space:normal}.s-list-item:not(.disabled).focus-visible::before{opacity:0.12}.s-list-item.disabled{pointer-events:none;color:var(--theme-text-disabled)}.s-list-item.flat::before{display:none}.s-list-item.active::before{opacity:0.12}.s-list-item.active .s-icon{color:inherit}.s-list-item::after{content:\"\";min-height:inherit;font-size:0}.s-list-item:not(.active){color:var(--theme-text-primary)}.s-list-item.dense,.s-list.dense .s-list-item{min-height:32px}.s-list-item.dense .s-icon,.s-list.dense .s-list-item .s-icon{margin-top:8px;margin-bottom:8px}.s-list-item.dense [slot=prepend] .s-icon,.s-list-item.dense [slot=prepend] .s-checkbox,.s-list-item.dense [slot=prepend] .s-radio,.s-list.dense .s-list-item [slot=prepend] .s-icon,.s-list.dense .s-list-item [slot=prepend] .s-checkbox,.s-list.dense .s-list-item [slot=prepend] .s-radio{margin-right:24px}.s-list-item.dense .s-list-item__content,.s-list.dense .s-list-item .s-list-item__content{padding:8px 0}.s-list-item.dense .s-list-item__title,.s-list-item.dense .s-list-item__subtitle,.s-list.dense .s-list-item .s-list-item__title,.s-list.dense .s-list-item .s-list-item__subtitle{font-size:0.8125rem;font-weight:500;line-height:1rem}";
    	append(document.head, style);
    }

    const get_append_slot_changes = dirty => ({});
    const get_append_slot_context = ctx => ({});
    const get_subtitle_slot_changes = dirty => ({});
    const get_subtitle_slot_context = ctx => ({});
    const get_prepend_slot_changes = dirty => ({});
    const get_prepend_slot_context = ctx => ({});

    function create_fragment$h(ctx) {
    	let div3;
    	let t0;
    	let div2;
    	let div0;
    	let t1;
    	let div1;
    	let t2;
    	let div3_class_value;
    	let div3_tabindex_value;
    	let div3_aria_selected_value;
    	let Class_action;
    	let Ripple_action;
    	let current;
    	let mounted;
    	let dispose;
    	const prepend_slot_template = /*#slots*/ ctx[14].prepend;
    	const prepend_slot = create_slot(prepend_slot_template, ctx, /*$$scope*/ ctx[13], get_prepend_slot_context);
    	const default_slot_template = /*#slots*/ ctx[14].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[13], null);
    	const subtitle_slot_template = /*#slots*/ ctx[14].subtitle;
    	const subtitle_slot = create_slot(subtitle_slot_template, ctx, /*$$scope*/ ctx[13], get_subtitle_slot_context);
    	const append_slot_template = /*#slots*/ ctx[14].append;
    	const append_slot = create_slot(append_slot_template, ctx, /*$$scope*/ ctx[13], get_append_slot_context);

    	return {
    		c() {
    			div3 = element("div");
    			if (prepend_slot) prepend_slot.c();
    			t0 = space();
    			div2 = element("div");
    			div0 = element("div");
    			if (default_slot) default_slot.c();
    			t1 = space();
    			div1 = element("div");
    			if (subtitle_slot) subtitle_slot.c();
    			t2 = space();
    			if (append_slot) append_slot.c();
    			attr(div0, "class", "s-list-item__title");
    			attr(div1, "class", "s-list-item__subtitle");
    			attr(div2, "class", "s-list-item__content");
    			attr(div3, "class", div3_class_value = "s-list-item " + /*klass*/ ctx[1]);
    			attr(div3, "role", /*role*/ ctx[10]);
    			attr(div3, "tabindex", div3_tabindex_value = /*link*/ ctx[6] ? 0 : -1);
    			attr(div3, "aria-selected", div3_aria_selected_value = /*role*/ ctx[10] === "option" ? /*active*/ ctx[0] : null);
    			attr(div3, "style", /*style*/ ctx[9]);
    			toggle_class(div3, "dense", /*dense*/ ctx[3]);
    			toggle_class(div3, "disabled", /*disabled*/ ctx[4]);
    			toggle_class(div3, "multiline", /*multiline*/ ctx[5]);
    			toggle_class(div3, "link", /*link*/ ctx[6]);
    			toggle_class(div3, "selectable", /*selectable*/ ctx[7]);
    		},
    		m(target, anchor) {
    			insert(target, div3, anchor);

    			if (prepend_slot) {
    				prepend_slot.m(div3, null);
    			}

    			append(div3, t0);
    			append(div3, div2);
    			append(div2, div0);

    			if (default_slot) {
    				default_slot.m(div0, null);
    			}

    			append(div2, t1);
    			append(div2, div1);

    			if (subtitle_slot) {
    				subtitle_slot.m(div1, null);
    			}

    			append(div3, t2);

    			if (append_slot) {
    				append_slot.m(div3, null);
    			}

    			current = true;

    			if (!mounted) {
    				dispose = [
    					action_destroyer(Class_action = Class.call(null, div3, [/*active*/ ctx[0] && /*activeClass*/ ctx[2]])),
    					action_destroyer(Ripple_action = Ripple.call(null, div3, /*ripple*/ ctx[8])),
    					listen(div3, "click", /*click*/ ctx[11]),
    					listen(div3, "click", /*click_handler*/ ctx[15]),
    					listen(div3, "dblclick", /*dblclick_handler*/ ctx[16])
    				];

    				mounted = true;
    			}
    		},
    		p(ctx, [dirty]) {
    			if (prepend_slot) {
    				if (prepend_slot.p && dirty & /*$$scope*/ 8192) {
    					update_slot(prepend_slot, prepend_slot_template, ctx, /*$$scope*/ ctx[13], dirty, get_prepend_slot_changes, get_prepend_slot_context);
    				}
    			}

    			if (default_slot) {
    				if (default_slot.p && dirty & /*$$scope*/ 8192) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[13], dirty, null, null);
    				}
    			}

    			if (subtitle_slot) {
    				if (subtitle_slot.p && dirty & /*$$scope*/ 8192) {
    					update_slot(subtitle_slot, subtitle_slot_template, ctx, /*$$scope*/ ctx[13], dirty, get_subtitle_slot_changes, get_subtitle_slot_context);
    				}
    			}

    			if (append_slot) {
    				if (append_slot.p && dirty & /*$$scope*/ 8192) {
    					update_slot(append_slot, append_slot_template, ctx, /*$$scope*/ ctx[13], dirty, get_append_slot_changes, get_append_slot_context);
    				}
    			}

    			if (!current || dirty & /*klass*/ 2 && div3_class_value !== (div3_class_value = "s-list-item " + /*klass*/ ctx[1])) {
    				attr(div3, "class", div3_class_value);
    			}

    			if (!current || dirty & /*link*/ 64 && div3_tabindex_value !== (div3_tabindex_value = /*link*/ ctx[6] ? 0 : -1)) {
    				attr(div3, "tabindex", div3_tabindex_value);
    			}

    			if (!current || dirty & /*active*/ 1 && div3_aria_selected_value !== (div3_aria_selected_value = /*role*/ ctx[10] === "option" ? /*active*/ ctx[0] : null)) {
    				attr(div3, "aria-selected", div3_aria_selected_value);
    			}

    			if (!current || dirty & /*style*/ 512) {
    				attr(div3, "style", /*style*/ ctx[9]);
    			}

    			if (Class_action && is_function(Class_action.update) && dirty & /*active, activeClass*/ 5) Class_action.update.call(null, [/*active*/ ctx[0] && /*activeClass*/ ctx[2]]);
    			if (Ripple_action && is_function(Ripple_action.update) && dirty & /*ripple*/ 256) Ripple_action.update.call(null, /*ripple*/ ctx[8]);

    			if (dirty & /*klass, dense*/ 10) {
    				toggle_class(div3, "dense", /*dense*/ ctx[3]);
    			}

    			if (dirty & /*klass, disabled*/ 18) {
    				toggle_class(div3, "disabled", /*disabled*/ ctx[4]);
    			}

    			if (dirty & /*klass, multiline*/ 34) {
    				toggle_class(div3, "multiline", /*multiline*/ ctx[5]);
    			}

    			if (dirty & /*klass, link*/ 66) {
    				toggle_class(div3, "link", /*link*/ ctx[6]);
    			}

    			if (dirty & /*klass, selectable*/ 130) {
    				toggle_class(div3, "selectable", /*selectable*/ ctx[7]);
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(prepend_slot, local);
    			transition_in(default_slot, local);
    			transition_in(subtitle_slot, local);
    			transition_in(append_slot, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(prepend_slot, local);
    			transition_out(default_slot, local);
    			transition_out(subtitle_slot, local);
    			transition_out(append_slot, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(div3);
    			if (prepend_slot) prepend_slot.d(detaching);
    			if (default_slot) default_slot.d(detaching);
    			if (subtitle_slot) subtitle_slot.d(detaching);
    			if (append_slot) append_slot.d(detaching);
    			mounted = false;
    			run_all(dispose);
    		}
    	};
    }

    function instance$h($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	const role = getContext("S_ListItemRole");
    	const ITEM_GROUP = getContext("S_ListItemGroup");

    	const DEFAULTS = {
    		select: () => null,
    		register: () => null,
    		index: () => null,
    		activeClass: "active"
    	};

    	const ITEM = ITEM_GROUP ? getContext(ITEM_GROUP) : DEFAULTS;
    	let { class: klass = "" } = $$props;
    	let { activeClass = ITEM.activeClass } = $$props;
    	let { value = ITEM.index() } = $$props;
    	let { active = false } = $$props;
    	let { dense = false } = $$props;
    	let { disabled = null } = $$props;
    	let { multiline = false } = $$props;
    	let { link = role } = $$props;
    	let { selectable = !link } = $$props;
    	let { ripple = getContext("S_ListItemRipple") || role || false } = $$props;
    	let { style = null } = $$props;

    	ITEM.register(values => {
    		$$invalidate(0, active = values.includes(value));
    	});

    	function click() {
    		if (!disabled) ITEM.select(value);
    	}

    	function click_handler(event) {
    		bubble($$self, event);
    	}

    	function dblclick_handler(event) {
    		bubble($$self, event);
    	}

    	$$self.$$set = $$props => {
    		if ("class" in $$props) $$invalidate(1, klass = $$props.class);
    		if ("activeClass" in $$props) $$invalidate(2, activeClass = $$props.activeClass);
    		if ("value" in $$props) $$invalidate(12, value = $$props.value);
    		if ("active" in $$props) $$invalidate(0, active = $$props.active);
    		if ("dense" in $$props) $$invalidate(3, dense = $$props.dense);
    		if ("disabled" in $$props) $$invalidate(4, disabled = $$props.disabled);
    		if ("multiline" in $$props) $$invalidate(5, multiline = $$props.multiline);
    		if ("link" in $$props) $$invalidate(6, link = $$props.link);
    		if ("selectable" in $$props) $$invalidate(7, selectable = $$props.selectable);
    		if ("ripple" in $$props) $$invalidate(8, ripple = $$props.ripple);
    		if ("style" in $$props) $$invalidate(9, style = $$props.style);
    		if ("$$scope" in $$props) $$invalidate(13, $$scope = $$props.$$scope);
    	};

    	return [
    		active,
    		klass,
    		activeClass,
    		dense,
    		disabled,
    		multiline,
    		link,
    		selectable,
    		ripple,
    		style,
    		role,
    		click,
    		value,
    		$$scope,
    		slots,
    		click_handler,
    		dblclick_handler
    	];
    }

    class ListItem extends SvelteComponent {
    	constructor(options) {
    		super();
    		if (!document.getElementById("svelte-1cqw5u4-style")) add_css$e();

    		init(this, options, instance$h, create_fragment$h, safe_not_equal, {
    			class: 1,
    			activeClass: 2,
    			value: 12,
    			active: 0,
    			dense: 3,
    			disabled: 4,
    			multiline: 5,
    			link: 6,
    			selectable: 7,
    			ripple: 8,
    			style: 9
    		});
    	}
    }

    /* node_modules\svelte-materialify\src\components\List\ListItemGroup.svelte generated by Svelte v3.35.0 */

    function add_css$d() {
    	var style = element("style");
    	style.id = "svelte-16snxfm-style";
    	style.textContent = ".s-list-item-group .s-list-item.active{color:inherit}";
    	append(document.head, style);
    }

    // (22:0) <ItemGroup   class="s-list-item-group {klass}"   role="listbox"   bind:value   {activeClass}   {multiple}   {mandatory}   {max}   {style}>
    function create_default_slot$5(ctx) {
    	let current;
    	const default_slot_template = /*#slots*/ ctx[7].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[9], null);

    	return {
    		c() {
    			if (default_slot) default_slot.c();
    		},
    		m(target, anchor) {
    			if (default_slot) {
    				default_slot.m(target, anchor);
    			}

    			current = true;
    		},
    		p(ctx, dirty) {
    			if (default_slot) {
    				if (default_slot.p && dirty & /*$$scope*/ 512) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[9], dirty, null, null);
    				}
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d(detaching) {
    			if (default_slot) default_slot.d(detaching);
    		}
    	};
    }

    function create_fragment$g(ctx) {
    	let itemgroup;
    	let updating_value;
    	let current;

    	function itemgroup_value_binding(value) {
    		/*itemgroup_value_binding*/ ctx[8](value);
    	}

    	let itemgroup_props = {
    		class: "s-list-item-group " + /*klass*/ ctx[1],
    		role: "listbox",
    		activeClass: /*activeClass*/ ctx[2],
    		multiple: /*multiple*/ ctx[3],
    		mandatory: /*mandatory*/ ctx[4],
    		max: /*max*/ ctx[5],
    		style: /*style*/ ctx[6],
    		$$slots: { default: [create_default_slot$5] },
    		$$scope: { ctx }
    	};

    	if (/*value*/ ctx[0] !== void 0) {
    		itemgroup_props.value = /*value*/ ctx[0];
    	}

    	itemgroup = new ItemGroup({ props: itemgroup_props });
    	binding_callbacks.push(() => bind(itemgroup, "value", itemgroup_value_binding));

    	return {
    		c() {
    			create_component(itemgroup.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(itemgroup, target, anchor);
    			current = true;
    		},
    		p(ctx, [dirty]) {
    			const itemgroup_changes = {};
    			if (dirty & /*klass*/ 2) itemgroup_changes.class = "s-list-item-group " + /*klass*/ ctx[1];
    			if (dirty & /*activeClass*/ 4) itemgroup_changes.activeClass = /*activeClass*/ ctx[2];
    			if (dirty & /*multiple*/ 8) itemgroup_changes.multiple = /*multiple*/ ctx[3];
    			if (dirty & /*mandatory*/ 16) itemgroup_changes.mandatory = /*mandatory*/ ctx[4];
    			if (dirty & /*max*/ 32) itemgroup_changes.max = /*max*/ ctx[5];
    			if (dirty & /*style*/ 64) itemgroup_changes.style = /*style*/ ctx[6];

    			if (dirty & /*$$scope*/ 512) {
    				itemgroup_changes.$$scope = { dirty, ctx };
    			}

    			if (!updating_value && dirty & /*value*/ 1) {
    				updating_value = true;
    				itemgroup_changes.value = /*value*/ ctx[0];
    				add_flush_callback(() => updating_value = false);
    			}

    			itemgroup.$set(itemgroup_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(itemgroup.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(itemgroup.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(itemgroup, detaching);
    		}
    	};
    }

    function instance$g($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	setContext("S_ListItemRole", "option");
    	setContext("S_ListItemGroup", ITEM_GROUP);
    	let { class: klass = "primary-text" } = $$props;
    	let { value = [] } = $$props;
    	let { activeClass = "active" } = $$props;
    	let { multiple = false } = $$props;
    	let { mandatory = false } = $$props;
    	let { max = Infinity } = $$props;
    	let { style = null } = $$props;

    	function itemgroup_value_binding(value$1) {
    		value = value$1;
    		$$invalidate(0, value);
    	}

    	$$self.$$set = $$props => {
    		if ("class" in $$props) $$invalidate(1, klass = $$props.class);
    		if ("value" in $$props) $$invalidate(0, value = $$props.value);
    		if ("activeClass" in $$props) $$invalidate(2, activeClass = $$props.activeClass);
    		if ("multiple" in $$props) $$invalidate(3, multiple = $$props.multiple);
    		if ("mandatory" in $$props) $$invalidate(4, mandatory = $$props.mandatory);
    		if ("max" in $$props) $$invalidate(5, max = $$props.max);
    		if ("style" in $$props) $$invalidate(6, style = $$props.style);
    		if ("$$scope" in $$props) $$invalidate(9, $$scope = $$props.$$scope);
    	};

    	return [
    		value,
    		klass,
    		activeClass,
    		multiple,
    		mandatory,
    		max,
    		style,
    		slots,
    		itemgroup_value_binding,
    		$$scope
    	];
    }

    class ListItemGroup extends SvelteComponent {
    	constructor(options) {
    		super();
    		if (!document.getElementById("svelte-16snxfm-style")) add_css$d();

    		init(this, options, instance$g, create_fragment$g, safe_not_equal, {
    			class: 1,
    			value: 0,
    			activeClass: 2,
    			multiple: 3,
    			mandatory: 4,
    			max: 5,
    			style: 6
    		});
    	}
    }

    /* node_modules\svelte-materialify\src\components\Chip\Chip.svelte generated by Svelte v3.35.0 */

    function add_css$c() {
    	var style = element("style");
    	style.id = "svelte-11spdir-style";
    	style.textContent = ".s-chip__close{cursor:pointer;margin-left:6px;margin-right:-6px}.s-chip__close .s-icon{font-size:18px;max-height:18px;max-width:18px;user-select:none}.s-chip__close:focus,.s-chip__close:hover,.s-chip__close:active{opacity:0.72}.s-chip{border-color:var(--theme-dividers);color:var(--theme-text-primary);align-items:center;cursor:default;display:inline-flex;line-height:20px;max-width:100%;outline:none;overflow:hidden;padding:0 12px;position:relative;text-decoration:none;transition-duration:0.28s;transition-property:box-shadow, opacity;transition-timing-function:cubic-bezier(0.4, 0, 0.2, 1);vertical-align:middle;white-space:nowrap}.s-chip::before{background-color:currentColor;bottom:0;border-radius:inherit;content:\"\";left:0;opacity:0;position:absolute;pointer-events:none;right:0;top:0}.s-chip .s-avatar{height:24px;min-width:24px;width:24px}.s-chip .s-icon{font-size:24px}.s-chip>.s-icon,.s-chip>.s-avatar{color:inherit}.s-chip>.s-icon:first-child,.s-chip>.s-avatar:first-child{margin-left:-6px;margin-right:6px}.s-chip>.s-icon:last-child,.s-chip>.s-avatar:last-child{margin-left:6px;margin-right:-6px}.s-chip.size-x-small{border-radius:8px;font-size:10px;height:16px}.s-chip.size-small{border-radius:12px;font-size:12px;height:24px}.s-chip.size-default{border-radius:16px;font-size:14px;height:32px}.s-chip.size-large{border-radius:27px;font-size:16px;height:54px}.s-chip.size-x-large{border-radius:33px;font-size:18px;height:66px}.s-chip:not(.outlined).primary-color,.s-chip:not(.outlined).secondary-color,.s-chip:not(.outlined).success-color,.s-chip:not(.outlined).error-color,.s-chip:not(.outlined).warning-color,.s-chip:not(.outlined).info-color{color:#ffffff}.s-chip:not(.selected){background-color:var(--theme-chips)}.s-chip.pill>.s-avatar{height:32px;width:32px}.s-chip.pill>.s-avatar:first-child{margin-left:-12px}.s-chip.pill>.s-avatar:last-child{margin-right:-12px}.s-chip.link{cursor:pointer;user-select:none}.s-chip.link:active{box-shadow:0 3px 1px -2px rgba(0, 0, 0, 0.2), 0 2px 2px 0 rgba(0, 0, 0, 0.14), 0 1px 5px 0 rgba(0, 0, 0, 0.12)}.s-chip.outlined{border:currentColor solid thin;background:transparent}.s-chip.outlined:active::before{opacity:0.08}.s-chip.label{border-radius:4px}.s-chip.disabled{opacity:0.4;pointer-events:none;user-select:none}";
    	append(document.head, style);
    }

    const get_close_icon_slot_changes = dirty => ({});
    const get_close_icon_slot_context = ctx => ({});

    // (167:0) {#if active}
    function create_if_block$6(ctx) {
    	let span;
    	let t;
    	let span_class_value;
    	let Ripple_action;
    	let current;
    	let mounted;
    	let dispose;
    	const default_slot_template = /*#slots*/ ctx[11].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[10], null);
    	let if_block = /*close*/ ctx[8] && create_if_block_1$1(ctx);

    	return {
    		c() {
    			span = element("span");
    			if (default_slot) default_slot.c();
    			t = space();
    			if (if_block) if_block.c();
    			attr(span, "class", span_class_value = "s-chip " + /*klass*/ ctx[1] + " size-" + /*size*/ ctx[3]);
    			toggle_class(span, "outlined", /*outlined*/ ctx[4]);
    			toggle_class(span, "pill", /*pill*/ ctx[5]);
    			toggle_class(span, "link", /*link*/ ctx[6]);
    			toggle_class(span, "label", /*label*/ ctx[7]);
    			toggle_class(span, "selected", /*selected*/ ctx[2]);
    		},
    		m(target, anchor) {
    			insert(target, span, anchor);

    			if (default_slot) {
    				default_slot.m(span, null);
    			}

    			append(span, t);
    			if (if_block) if_block.m(span, null);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					action_destroyer(Ripple_action = Ripple.call(null, span, /*link*/ ctx[6])),
    					listen(span, "click", /*click_handler*/ ctx[12])
    				];

    				mounted = true;
    			}
    		},
    		p(ctx, dirty) {
    			if (default_slot) {
    				if (default_slot.p && dirty & /*$$scope*/ 1024) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[10], dirty, null, null);
    				}
    			}

    			if (/*close*/ ctx[8]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty & /*close*/ 256) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block_1$1(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(span, null);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}

    			if (!current || dirty & /*klass, size*/ 10 && span_class_value !== (span_class_value = "s-chip " + /*klass*/ ctx[1] + " size-" + /*size*/ ctx[3])) {
    				attr(span, "class", span_class_value);
    			}

    			if (Ripple_action && is_function(Ripple_action.update) && dirty & /*link*/ 64) Ripple_action.update.call(null, /*link*/ ctx[6]);

    			if (dirty & /*klass, size, outlined*/ 26) {
    				toggle_class(span, "outlined", /*outlined*/ ctx[4]);
    			}

    			if (dirty & /*klass, size, pill*/ 42) {
    				toggle_class(span, "pill", /*pill*/ ctx[5]);
    			}

    			if (dirty & /*klass, size, link*/ 74) {
    				toggle_class(span, "link", /*link*/ ctx[6]);
    			}

    			if (dirty & /*klass, size, label*/ 138) {
    				toggle_class(span, "label", /*label*/ ctx[7]);
    			}

    			if (dirty & /*klass, size, selected*/ 14) {
    				toggle_class(span, "selected", /*selected*/ ctx[2]);
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			transition_in(if_block);
    			current = true;
    		},
    		o(local) {
    			transition_out(default_slot, local);
    			transition_out(if_block);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(span);
    			if (default_slot) default_slot.d(detaching);
    			if (if_block) if_block.d();
    			mounted = false;
    			run_all(dispose);
    		}
    	};
    }

    // (178:4) {#if close}
    function create_if_block_1$1(ctx) {
    	let div;
    	let current;
    	let mounted;
    	let dispose;
    	const close_icon_slot_template = /*#slots*/ ctx[11]["close-icon"];
    	const close_icon_slot = create_slot(close_icon_slot_template, ctx, /*$$scope*/ ctx[10], get_close_icon_slot_context);
    	const close_icon_slot_or_fallback = close_icon_slot || fallback_block$4();

    	return {
    		c() {
    			div = element("div");
    			if (close_icon_slot_or_fallback) close_icon_slot_or_fallback.c();
    			attr(div, "class", "s-chip__close");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);

    			if (close_icon_slot_or_fallback) {
    				close_icon_slot_or_fallback.m(div, null);
    			}

    			current = true;

    			if (!mounted) {
    				dispose = listen(div, "click", /*onClose*/ ctx[9]);
    				mounted = true;
    			}
    		},
    		p(ctx, dirty) {
    			if (close_icon_slot) {
    				if (close_icon_slot.p && dirty & /*$$scope*/ 1024) {
    					update_slot(close_icon_slot, close_icon_slot_template, ctx, /*$$scope*/ ctx[10], dirty, get_close_icon_slot_changes, get_close_icon_slot_context);
    				}
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(close_icon_slot_or_fallback, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(close_icon_slot_or_fallback, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    			if (close_icon_slot_or_fallback) close_icon_slot_or_fallback.d(detaching);
    			mounted = false;
    			dispose();
    		}
    	};
    }

    // (180:32)            
    function fallback_block$4(ctx) {
    	let icon;
    	let current;
    	icon = new Icon({ props: { path: closeIcon } });

    	return {
    		c() {
    			create_component(icon.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(icon, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i(local) {
    			if (current) return;
    			transition_in(icon.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(icon.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(icon, detaching);
    		}
    	};
    }

    function create_fragment$f(ctx) {
    	let if_block_anchor;
    	let current;
    	let if_block = /*active*/ ctx[0] && create_if_block$6(ctx);

    	return {
    		c() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		m(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p(ctx, [dirty]) {
    			if (/*active*/ ctx[0]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty & /*active*/ 1) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block$6(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach(if_block_anchor);
    		}
    	};
    }

    function instance$f($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	let { class: klass = "" } = $$props;
    	let { active = true } = $$props;
    	let { selected = false } = $$props;
    	let { size = "default" } = $$props;
    	let { outlined = false } = $$props;
    	let { pill = false } = $$props;
    	let { link = false } = $$props;
    	let { label = false } = $$props;
    	let { close = false } = $$props;
    	const dispatch = createEventDispatcher();

    	function onClose(e) {
    		$$invalidate(0, active = false);
    		dispatch("close", e);
    	}

    	function click_handler(event) {
    		bubble($$self, event);
    	}

    	$$self.$$set = $$props => {
    		if ("class" in $$props) $$invalidate(1, klass = $$props.class);
    		if ("active" in $$props) $$invalidate(0, active = $$props.active);
    		if ("selected" in $$props) $$invalidate(2, selected = $$props.selected);
    		if ("size" in $$props) $$invalidate(3, size = $$props.size);
    		if ("outlined" in $$props) $$invalidate(4, outlined = $$props.outlined);
    		if ("pill" in $$props) $$invalidate(5, pill = $$props.pill);
    		if ("link" in $$props) $$invalidate(6, link = $$props.link);
    		if ("label" in $$props) $$invalidate(7, label = $$props.label);
    		if ("close" in $$props) $$invalidate(8, close = $$props.close);
    		if ("$$scope" in $$props) $$invalidate(10, $$scope = $$props.$$scope);
    	};

    	return [
    		active,
    		klass,
    		selected,
    		size,
    		outlined,
    		pill,
    		link,
    		label,
    		close,
    		onClose,
    		$$scope,
    		slots,
    		click_handler
    	];
    }

    class Chip extends SvelteComponent {
    	constructor(options) {
    		super();
    		if (!document.getElementById("svelte-11spdir-style")) add_css$c();

    		init(this, options, instance$f, create_fragment$f, safe_not_equal, {
    			class: 1,
    			active: 0,
    			selected: 2,
    			size: 3,
    			outlined: 4,
    			pill: 5,
    			link: 6,
    			label: 7,
    			close: 8
    		});
    	}
    }

    /* node_modules\svelte-materialify\src\components\Checkbox\Checkbox.svelte generated by Svelte v3.35.0 */

    function add_css$b() {
    	var style = element("style");
    	style.id = "svelte-e1wcas-style";
    	style.textContent = ".s-checkbox{display:flex;align-items:center;position:relative}.s-checkbox label{padding-left:12px}.s-checkbox__background{width:100%;height:100%;align-items:center;display:inline-flex;border:2px solid currentColor;border-radius:2px;color:inherit;background-color:transparent;transition:background-color 0.3s cubic-bezier(0.25, 0.8, 0.5, 1);pointer-events:none}.s-checkbox__wrapper{overflow:unset !important;display:inline-flex;justify-content:center;align-items:center;flex:0 0 auto;height:18px;width:18px;position:relative;user-select:none;border-radius:100%}.s-checkbox__wrapper::before{border-radius:inherit;content:\"\";top:0;bottom:0;left:0;right:0;position:absolute;width:100%;height:100%;background-color:currentColor;transform:scale(2);opacity:0}.s-checkbox__wrapper:not(.disabled){color:var(--theme-text-secondary);cursor:pointer}.s-checkbox__wrapper:not(.disabled):hover::before{opacity:0.16}.s-checkbox__wrapper.disabled{opacity:0.6;color:var(--theme-controls-disabled) !important}.s-checkbox__wrapper input{position:absolute;width:36px;height:36px;cursor:inherit;opacity:0;margin:0;padding:0}.s-checkbox__wrapper input:checked~.s-checkbox__background,.s-checkbox__wrapper input:indeterminate~.s-checkbox__background{background-color:currentColor;border:none}.s-checkbox__wrapper svg{position:absolute;top:0;left:0;right:0;bottom:0;width:100%;height:100%;color:#ffffff;padding:1px}.s-checkbox__wrapper svg path{stroke:currentColor}";
    	append(document.head, style);
    }

    // (170:6) {#if checked || indeterminate}
    function create_if_block$5(ctx) {
    	let svg;
    	let path;
    	let path_d_value;

    	return {
    		c() {
    			svg = svg_element("svg");
    			path = svg_element("path");
    			attr(path, "d", path_d_value = /*checked*/ ctx[0] ? check : dash);
    			attr(svg, "xmlns", "http://www.w3.org/2000/svg");
    			attr(svg, "width", "24");
    			attr(svg, "height", "24");
    			attr(svg, "viewBox", "0 0 24 24");
    		},
    		m(target, anchor) {
    			insert(target, svg, anchor);
    			append(svg, path);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*checked*/ 1 && path_d_value !== (path_d_value = /*checked*/ ctx[0] ? check : dash)) {
    				attr(path, "d", path_d_value);
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(svg);
    		}
    	};
    }

    function create_fragment$e(ctx) {
    	let div2;
    	let div1;
    	let input;
    	let t0;
    	let div0;
    	let div1_class_value;
    	let TextColor_action;
    	let t1;
    	let label;
    	let current;
    	let mounted;
    	let dispose;
    	let if_block = (/*checked*/ ctx[0] || /*indeterminate*/ ctx[1]) && create_if_block$5(ctx);
    	const default_slot_template = /*#slots*/ ctx[13].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[12], null);

    	return {
    		c() {
    			div2 = element("div");
    			div1 = element("div");
    			input = element("input");
    			t0 = space();
    			div0 = element("div");
    			if (if_block) if_block.c();
    			t1 = space();
    			label = element("label");
    			if (default_slot) default_slot.c();
    			attr(input, "type", "checkbox");
    			attr(input, "role", "checkbox");
    			attr(input, "aria-checked", /*checked*/ ctx[0]);
    			attr(input, "id", /*id*/ ctx[2]);
    			input.disabled = /*disabled*/ ctx[6];
    			input.__value = /*value*/ ctx[7];
    			input.value = input.__value;
    			if (/*checked*/ ctx[0] === void 0 || /*indeterminate*/ ctx[1] === void 0) add_render_callback(() => /*input_change_handler*/ ctx[16].call(input));
    			attr(div0, "class", "s-checkbox__background");
    			attr(div0, "aria-hidden", "true");
    			attr(div1, "class", div1_class_value = "s-checkbox__wrapper " + /*klass*/ ctx[4]);
    			toggle_class(div1, "disabled", /*disabled*/ ctx[6]);
    			attr(label, "for", /*id*/ ctx[2]);
    			attr(div2, "class", "s-checkbox");
    			attr(div2, "style", /*style*/ ctx[8]);
    		},
    		m(target, anchor) {
    			insert(target, div2, anchor);
    			append(div2, div1);
    			append(div1, input);
    			/*input_binding*/ ctx[15](input);
    			input.checked = /*checked*/ ctx[0];
    			input.indeterminate = /*indeterminate*/ ctx[1];
    			append(div1, t0);
    			append(div1, div0);
    			if (if_block) if_block.m(div0, null);
    			append(div2, t1);
    			append(div2, label);

    			if (default_slot) {
    				default_slot.m(label, null);
    			}

    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen(input, "change", /*input_change_handler*/ ctx[16]),
    					listen(input, "change", /*groupUpdate*/ ctx[9]),
    					listen(input, "change", /*change_handler*/ ctx[14]),
    					action_destroyer(Ripple.call(null, div1, { centered: true })),
    					action_destroyer(TextColor_action = TextColor.call(null, div1, /*checked*/ ctx[0] || /*indeterminate*/ ctx[1]
    					? /*color*/ ctx[5]
    					: false))
    				];

    				mounted = true;
    			}
    		},
    		p(ctx, [dirty]) {
    			if (!current || dirty & /*checked*/ 1) {
    				attr(input, "aria-checked", /*checked*/ ctx[0]);
    			}

    			if (!current || dirty & /*id*/ 4) {
    				attr(input, "id", /*id*/ ctx[2]);
    			}

    			if (!current || dirty & /*disabled*/ 64) {
    				input.disabled = /*disabled*/ ctx[6];
    			}

    			if (!current || dirty & /*value*/ 128) {
    				input.__value = /*value*/ ctx[7];
    				input.value = input.__value;
    			}

    			if (dirty & /*checked*/ 1) {
    				input.checked = /*checked*/ ctx[0];
    			}

    			if (dirty & /*indeterminate*/ 2) {
    				input.indeterminate = /*indeterminate*/ ctx[1];
    			}

    			if (/*checked*/ ctx[0] || /*indeterminate*/ ctx[1]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block$5(ctx);
    					if_block.c();
    					if_block.m(div0, null);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}

    			if (!current || dirty & /*klass*/ 16 && div1_class_value !== (div1_class_value = "s-checkbox__wrapper " + /*klass*/ ctx[4])) {
    				attr(div1, "class", div1_class_value);
    			}

    			if (TextColor_action && is_function(TextColor_action.update) && dirty & /*checked, indeterminate, color*/ 35) TextColor_action.update.call(null, /*checked*/ ctx[0] || /*indeterminate*/ ctx[1]
    			? /*color*/ ctx[5]
    			: false);

    			if (dirty & /*klass, disabled*/ 80) {
    				toggle_class(div1, "disabled", /*disabled*/ ctx[6]);
    			}

    			if (default_slot) {
    				if (default_slot.p && dirty & /*$$scope*/ 4096) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[12], dirty, null, null);
    				}
    			}

    			if (!current || dirty & /*id*/ 4) {
    				attr(label, "for", /*id*/ ctx[2]);
    			}

    			if (!current || dirty & /*style*/ 256) {
    				attr(div2, "style", /*style*/ ctx[8]);
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(div2);
    			/*input_binding*/ ctx[15](null);
    			if (if_block) if_block.d();
    			if (default_slot) default_slot.d(detaching);
    			mounted = false;
    			run_all(dispose);
    		}
    	};
    }

    const check = "M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z";
    const dash = "M4,11L4,13L20,13L20,11L4,11Z";

    function instance$e($$self, $$props, $$invalidate) {
    	let hasValidGroup;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	let { class: klass = "" } = $$props;
    	let { color = "primary" } = $$props;
    	let { checked = false } = $$props;
    	let { indeterminate = false } = $$props;
    	let { disabled = false } = $$props;
    	let { value = null } = $$props;
    	let { group = null } = $$props;
    	let { id = null } = $$props;
    	let { style = null } = $$props;
    	let { inputElement = null } = $$props;
    	id = id || `s-checkbox-${uid(5)}`;

    	function groupUpdate() {
    		if (hasValidGroup && value != null) {
    			const i = group.indexOf(value);

    			if (i < 0) {
    				group.push(value);
    			} else {
    				group.splice(i, 1);
    			}

    			$$invalidate(10, group);
    		}
    	}

    	function change_handler(event) {
    		bubble($$self, event);
    	}

    	function input_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			inputElement = $$value;
    			$$invalidate(3, inputElement);
    		});
    	}

    	function input_change_handler() {
    		checked = this.checked;
    		indeterminate = this.indeterminate;
    		((($$invalidate(0, checked), $$invalidate(11, hasValidGroup)), $$invalidate(7, value)), $$invalidate(10, group));
    		$$invalidate(1, indeterminate);
    	}

    	$$self.$$set = $$props => {
    		if ("class" in $$props) $$invalidate(4, klass = $$props.class);
    		if ("color" in $$props) $$invalidate(5, color = $$props.color);
    		if ("checked" in $$props) $$invalidate(0, checked = $$props.checked);
    		if ("indeterminate" in $$props) $$invalidate(1, indeterminate = $$props.indeterminate);
    		if ("disabled" in $$props) $$invalidate(6, disabled = $$props.disabled);
    		if ("value" in $$props) $$invalidate(7, value = $$props.value);
    		if ("group" in $$props) $$invalidate(10, group = $$props.group);
    		if ("id" in $$props) $$invalidate(2, id = $$props.id);
    		if ("style" in $$props) $$invalidate(8, style = $$props.style);
    		if ("inputElement" in $$props) $$invalidate(3, inputElement = $$props.inputElement);
    		if ("$$scope" in $$props) $$invalidate(12, $$scope = $$props.$$scope);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*group*/ 1024) {
    			$$invalidate(11, hasValidGroup = Array.isArray(group));
    		}

    		if ($$self.$$.dirty & /*hasValidGroup, value, group*/ 3200) {
    			if (hasValidGroup && value != null) {
    				$$invalidate(0, checked = group.indexOf(value) >= 0);
    			}
    		}
    	};

    	return [
    		checked,
    		indeterminate,
    		id,
    		inputElement,
    		klass,
    		color,
    		disabled,
    		value,
    		style,
    		groupUpdate,
    		group,
    		hasValidGroup,
    		$$scope,
    		slots,
    		change_handler,
    		input_binding,
    		input_change_handler
    	];
    }

    class Checkbox extends SvelteComponent {
    	constructor(options) {
    		super();
    		if (!document.getElementById("svelte-e1wcas-style")) add_css$b();

    		init(this, options, instance$e, create_fragment$e, safe_not_equal, {
    			class: 4,
    			color: 5,
    			checked: 0,
    			indeterminate: 1,
    			disabled: 6,
    			value: 7,
    			group: 10,
    			id: 2,
    			style: 8,
    			inputElement: 3
    		});
    	}
    }

    var down = 'M7,10L12,15L17,10H7Z';

    /* node_modules\svelte-materialify\src\components\Select\Select.svelte generated by Svelte v3.35.0 */

    function add_css$a() {
    	var style = element("style");
    	style.id = "svelte-1cnf6l4-style";
    	style.textContent = ".s-select{max-width:100%;position:relative}.s-select .s-menu__wrapper,.s-select .s-menu{width:100%}.s-select:not(.disabled) input,.s-select:not(.disabled) .s-menu__wrapper{cursor:pointer}.s-select.chips .s-text-field__wrapper.filled .s-text-field__input{padding-top:24px}.s-select.chips input{margin:0;display:none}.s-select.chips .s-chip{margin:4px}";
    	append(document.head, style);
    }

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[28] = list[i];
    	return child_ctx;
    }

    const get_item_slot_changes = dirty => ({ item: dirty & /*items*/ 8 });
    const get_item_slot_context = ctx => ({ item: /*item*/ ctx[28] });
    const get_prepend_outer_slot_changes = dirty => ({});
    const get_prepend_outer_slot_context = ctx => ({ slot: "prepend-outer" });

    function get_each_context$2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[25] = list[i];
    	return child_ctx;
    }

    const get_append_outer_slot_changes = dirty => ({});
    const get_append_outer_slot_context = ctx => ({ slot: "append-outer" });

    // (98:10) <ListItem {dense} value={item.value ? item.value : item}>
    function create_default_slot_4$2(ctx) {
    	let t_value = (/*item*/ ctx[28].name
    	? /*item*/ ctx[28].name
    	: /*item*/ ctx[28]) + "";

    	let t;

    	return {
    		c() {
    			t = text(t_value);
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*items*/ 8 && t_value !== (t_value = (/*item*/ ctx[28].name
    			? /*item*/ ctx[28].name
    			: /*item*/ ctx[28]) + "")) set_data(t, t_value);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (100:14) {#if multiple}
    function create_if_block_1(ctx) {
    	let checkbox;
    	let current;

    	checkbox = new Checkbox({
    			props: {
    				checked: /*value*/ ctx[0].includes(/*item*/ ctx[28].value
    				? /*item*/ ctx[28].value
    				: /*item*/ ctx[28])
    			}
    		});

    	return {
    		c() {
    			create_component(checkbox.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(checkbox, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const checkbox_changes = {};

    			if (dirty & /*value, items*/ 9) checkbox_changes.checked = /*value*/ ctx[0].includes(/*item*/ ctx[28].value
    			? /*item*/ ctx[28].value
    			: /*item*/ ctx[28]);

    			checkbox.$set(checkbox_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(checkbox.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(checkbox.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(checkbox, detaching);
    		}
    	};
    }

    // (99:12) 
    function create_prepend_slot$1(ctx) {
    	let span;
    	let current;
    	let if_block = /*multiple*/ ctx[11] && create_if_block_1(ctx);

    	return {
    		c() {
    			span = element("span");
    			if (if_block) if_block.c();
    			attr(span, "slot", "prepend");
    		},
    		m(target, anchor) {
    			insert(target, span, anchor);
    			if (if_block) if_block.m(span, null);
    			current = true;
    		},
    		p(ctx, dirty) {
    			if (/*multiple*/ ctx[11]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty & /*multiple*/ 2048) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block_1(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(span, null);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(span);
    			if (if_block) if_block.d();
    		}
    	};
    }

    // (97:33)             
    function fallback_block$3(ctx) {
    	let listitem;
    	let t;
    	let current;

    	listitem = new ListItem({
    			props: {
    				dense: /*dense*/ ctx[7],
    				value: /*item*/ ctx[28].value
    				? /*item*/ ctx[28].value
    				: /*item*/ ctx[28],
    				$$slots: {
    					prepend: [create_prepend_slot$1],
    					default: [create_default_slot_4$2]
    				},
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			create_component(listitem.$$.fragment);
    			t = space();
    		},
    		m(target, anchor) {
    			mount_component(listitem, target, anchor);
    			insert(target, t, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const listitem_changes = {};
    			if (dirty & /*dense*/ 128) listitem_changes.dense = /*dense*/ ctx[7];

    			if (dirty & /*items*/ 8) listitem_changes.value = /*item*/ ctx[28].value
    			? /*item*/ ctx[28].value
    			: /*item*/ ctx[28];

    			if (dirty & /*$$scope, value, items, multiple*/ 8390665) {
    				listitem_changes.$$scope = { dirty, ctx };
    			}

    			listitem.$set(listitem_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(listitem.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(listitem.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(listitem, detaching);
    			if (detaching) detach(t);
    		}
    	};
    }

    // (96:6) {#each items as item}
    function create_each_block_1(ctx) {
    	let current;
    	const item_slot_template = /*#slots*/ ctx[19].item;
    	const item_slot = create_slot(item_slot_template, ctx, /*$$scope*/ ctx[23], get_item_slot_context);
    	const item_slot_or_fallback = item_slot || fallback_block$3(ctx);

    	return {
    		c() {
    			if (item_slot_or_fallback) item_slot_or_fallback.c();
    		},
    		m(target, anchor) {
    			if (item_slot_or_fallback) {
    				item_slot_or_fallback.m(target, anchor);
    			}

    			current = true;
    		},
    		p(ctx, dirty) {
    			if (item_slot) {
    				if (item_slot.p && dirty & /*$$scope, items*/ 8388616) {
    					update_slot(item_slot, item_slot_template, ctx, /*$$scope*/ ctx[23], dirty, get_item_slot_changes, get_item_slot_context);
    				}
    			} else {
    				if (item_slot_or_fallback && item_slot_or_fallback.p && dirty & /*dense, items, value, multiple*/ 2185) {
    					item_slot_or_fallback.p(ctx, dirty);
    				}
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(item_slot_or_fallback, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(item_slot_or_fallback, local);
    			current = false;
    		},
    		d(detaching) {
    			if (item_slot_or_fallback) item_slot_or_fallback.d(detaching);
    		}
    	};
    }

    // (95:4) <ListItemGroup bind:value {mandatory} {multiple} {max}>
    function create_default_slot_3$2(ctx) {
    	let each_1_anchor;
    	let current;
    	let each_value_1 = /*items*/ ctx[3];
    	let each_blocks = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	return {
    		c() {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    		},
    		m(target, anchor) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert(target, each_1_anchor, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			if (dirty & /*dense, items, value, multiple, $$scope*/ 8390793) {
    				each_value_1 = /*items*/ ctx[3];
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1(ctx, each_value_1, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block_1(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				group_outros();

    				for (i = each_value_1.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}
    		},
    		i(local) {
    			if (current) return;

    			for (let i = 0; i < each_value_1.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o(local) {
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d(detaching) {
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach(each_1_anchor);
    		}
    	};
    }

    // (65:2) <Menu offsetY={false} bind:active {disabled} {closeOnClick}>
    function create_default_slot_2$2(ctx) {
    	let listitemgroup;
    	let updating_value;
    	let current;

    	function listitemgroup_value_binding(value) {
    		/*listitemgroup_value_binding*/ ctx[21](value);
    	}

    	let listitemgroup_props = {
    		mandatory: /*mandatory*/ ctx[10],
    		multiple: /*multiple*/ ctx[11],
    		max: /*max*/ ctx[12],
    		$$slots: { default: [create_default_slot_3$2] },
    		$$scope: { ctx }
    	};

    	if (/*value*/ ctx[0] !== void 0) {
    		listitemgroup_props.value = /*value*/ ctx[0];
    	}

    	listitemgroup = new ListItemGroup({ props: listitemgroup_props });
    	binding_callbacks.push(() => bind(listitemgroup, "value", listitemgroup_value_binding));

    	return {
    		c() {
    			create_component(listitemgroup.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(listitemgroup, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const listitemgroup_changes = {};
    			if (dirty & /*mandatory*/ 1024) listitemgroup_changes.mandatory = /*mandatory*/ ctx[10];
    			if (dirty & /*multiple*/ 2048) listitemgroup_changes.multiple = /*multiple*/ ctx[11];
    			if (dirty & /*max*/ 4096) listitemgroup_changes.max = /*max*/ ctx[12];

    			if (dirty & /*$$scope, items, dense, value, multiple*/ 8390793) {
    				listitemgroup_changes.$$scope = { dirty, ctx };
    			}

    			if (!updating_value && dirty & /*value*/ 1) {
    				updating_value = true;
    				listitemgroup_changes.value = /*value*/ ctx[0];
    				add_flush_callback(() => updating_value = false);
    			}

    			listitemgroup.$set(listitemgroup_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(listitemgroup.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(listitemgroup.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(listitemgroup, detaching);
    		}
    	};
    }

    // (67:6) <TextField          {filled}          {outlined}          {solo}          {dense}          {disabled}          value={format(value)}          {placeholder}          {hint}          readonly>
    function create_default_slot_1$2(ctx) {
    	let current;
    	const default_slot_template = /*#slots*/ ctx[19].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[23], null);

    	return {
    		c() {
    			if (default_slot) default_slot.c();
    		},
    		m(target, anchor) {
    			if (default_slot) {
    				default_slot.m(target, anchor);
    			}

    			current = true;
    		},
    		p(ctx, dirty) {
    			if (default_slot) {
    				if (default_slot.p && dirty & /*$$scope*/ 8388608) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[23], dirty, null, null);
    				}
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d(detaching) {
    			if (default_slot) default_slot.d(detaching);
    		}
    	};
    }

    // (77:8) 
    function create_prepend_outer_slot(ctx) {
    	let current;
    	const prepend_outer_slot_template = /*#slots*/ ctx[19]["prepend-outer"];
    	const prepend_outer_slot = create_slot(prepend_outer_slot_template, ctx, /*$$scope*/ ctx[23], get_prepend_outer_slot_context);

    	return {
    		c() {
    			if (prepend_outer_slot) prepend_outer_slot.c();
    		},
    		m(target, anchor) {
    			if (prepend_outer_slot) {
    				prepend_outer_slot.m(target, anchor);
    			}

    			current = true;
    		},
    		p(ctx, dirty) {
    			if (prepend_outer_slot) {
    				if (prepend_outer_slot.p && dirty & /*$$scope*/ 8388608) {
    					update_slot(prepend_outer_slot, prepend_outer_slot_template, ctx, /*$$scope*/ ctx[23], dirty, get_prepend_outer_slot_changes, get_prepend_outer_slot_context);
    				}
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(prepend_outer_slot, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(prepend_outer_slot, local);
    			current = false;
    		},
    		d(detaching) {
    			if (prepend_outer_slot) prepend_outer_slot.d(detaching);
    		}
    	};
    }

    // (81:10) {#if chips && value}
    function create_if_block$4(ctx) {
    	let span;
    	let current;

    	let each_value = Array.isArray(/*value*/ ctx[0])
    	? /*value*/ ctx[0].map(/*func*/ ctx[20])
    	: [/*getSelectString*/ ctx[17](/*value*/ ctx[0])];

    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$2(get_each_context$2(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	return {
    		c() {
    			span = element("span");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr(span, "class", "s-select__chips");
    		},
    		m(target, anchor) {
    			insert(target, span, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(span, null);
    			}

    			current = true;
    		},
    		p(ctx, dirty) {
    			if (dirty & /*Array, value, getSelectString*/ 131073) {
    				each_value = Array.isArray(/*value*/ ctx[0])
    				? /*value*/ ctx[0].map(/*func*/ ctx[20])
    				: [/*getSelectString*/ ctx[17](/*value*/ ctx[0])];

    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$2(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block$2(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(span, null);
    					}
    				}

    				group_outros();

    				for (i = each_value.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}
    		},
    		i(local) {
    			if (current) return;

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o(local) {
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(span);
    			destroy_each(each_blocks, detaching);
    		}
    	};
    }

    // (84:16) <Chip>
    function create_default_slot$4(ctx) {
    	let t_value = /*val*/ ctx[25] + "";
    	let t;

    	return {
    		c() {
    			t = text(t_value);
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*value*/ 1 && t_value !== (t_value = /*val*/ ctx[25] + "")) set_data(t, t_value);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (83:14) {#each Array.isArray(value) ? value.map((v) => getSelectString(v)) : [getSelectString(value)] as val}
    function create_each_block$2(ctx) {
    	let chip;
    	let current;

    	chip = new Chip({
    			props: {
    				$$slots: { default: [create_default_slot$4] },
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			create_component(chip.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(chip, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const chip_changes = {};

    			if (dirty & /*$$scope, value*/ 8388609) {
    				chip_changes.$$scope = { dirty, ctx };
    			}

    			chip.$set(chip_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(chip.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(chip.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(chip, detaching);
    		}
    	};
    }

    // (80:8) 
    function create_content_slot(ctx) {
    	let div;
    	let current;
    	let if_block = /*chips*/ ctx[13] && /*value*/ ctx[0] && create_if_block$4(ctx);

    	return {
    		c() {
    			div = element("div");
    			if (if_block) if_block.c();
    			attr(div, "slot", "content");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			if (if_block) if_block.m(div, null);
    			current = true;
    		},
    		p(ctx, dirty) {
    			if (/*chips*/ ctx[13] && /*value*/ ctx[0]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty & /*chips, value*/ 8193) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block$4(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(div, null);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    			if (if_block) if_block.d();
    		}
    	};
    }

    // (89:8) 
    function create_append_slot$1(ctx) {
    	let span;
    	let icon;
    	let current;

    	icon = new Icon({
    			props: {
    				path: down,
    				rotate: /*active*/ ctx[1] ? 180 : 0
    			}
    		});

    	return {
    		c() {
    			span = element("span");
    			create_component(icon.$$.fragment);
    			attr(span, "slot", "append");
    		},
    		m(target, anchor) {
    			insert(target, span, anchor);
    			mount_component(icon, span, null);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const icon_changes = {};
    			if (dirty & /*active*/ 2) icon_changes.rotate = /*active*/ ctx[1] ? 180 : 0;
    			icon.$set(icon_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(icon.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(icon.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(span);
    			destroy_component(icon);
    		}
    	};
    }

    // (92:8) 
    function create_append_outer_slot(ctx) {
    	let current;
    	const append_outer_slot_template = /*#slots*/ ctx[19]["append-outer"];
    	const append_outer_slot = create_slot(append_outer_slot_template, ctx, /*$$scope*/ ctx[23], get_append_outer_slot_context);

    	return {
    		c() {
    			if (append_outer_slot) append_outer_slot.c();
    		},
    		m(target, anchor) {
    			if (append_outer_slot) {
    				append_outer_slot.m(target, anchor);
    			}

    			current = true;
    		},
    		p(ctx, dirty) {
    			if (append_outer_slot) {
    				if (append_outer_slot.p && dirty & /*$$scope*/ 8388608) {
    					update_slot(append_outer_slot, append_outer_slot_template, ctx, /*$$scope*/ ctx[23], dirty, get_append_outer_slot_changes, get_append_outer_slot_context);
    				}
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(append_outer_slot, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(append_outer_slot, local);
    			current = false;
    		},
    		d(detaching) {
    			if (append_outer_slot) append_outer_slot.d(detaching);
    		}
    	};
    }

    // (66:4) 
    function create_activator_slot$1(ctx) {
    	let span;
    	let textfield;
    	let current;

    	textfield = new TextField({
    			props: {
    				filled: /*filled*/ ctx[4],
    				outlined: /*outlined*/ ctx[5],
    				solo: /*solo*/ ctx[6],
    				dense: /*dense*/ ctx[7],
    				disabled: /*disabled*/ ctx[14],
    				value: /*format*/ ctx[16](/*value*/ ctx[0]),
    				placeholder: /*placeholder*/ ctx[8],
    				hint: /*hint*/ ctx[9],
    				readonly: true,
    				$$slots: {
    					"append-outer": [create_append_outer_slot],
    					append: [create_append_slot$1],
    					content: [create_content_slot],
    					"prepend-outer": [create_prepend_outer_slot],
    					default: [create_default_slot_1$2]
    				},
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			span = element("span");
    			create_component(textfield.$$.fragment);
    			attr(span, "slot", "activator");
    		},
    		m(target, anchor) {
    			insert(target, span, anchor);
    			mount_component(textfield, span, null);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const textfield_changes = {};
    			if (dirty & /*filled*/ 16) textfield_changes.filled = /*filled*/ ctx[4];
    			if (dirty & /*outlined*/ 32) textfield_changes.outlined = /*outlined*/ ctx[5];
    			if (dirty & /*solo*/ 64) textfield_changes.solo = /*solo*/ ctx[6];
    			if (dirty & /*dense*/ 128) textfield_changes.dense = /*dense*/ ctx[7];
    			if (dirty & /*disabled*/ 16384) textfield_changes.disabled = /*disabled*/ ctx[14];
    			if (dirty & /*format, value*/ 65537) textfield_changes.value = /*format*/ ctx[16](/*value*/ ctx[0]);
    			if (dirty & /*placeholder*/ 256) textfield_changes.placeholder = /*placeholder*/ ctx[8];
    			if (dirty & /*hint*/ 512) textfield_changes.hint = /*hint*/ ctx[9];

    			if (dirty & /*$$scope, active, value, chips*/ 8396803) {
    				textfield_changes.$$scope = { dirty, ctx };
    			}

    			textfield.$set(textfield_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(textfield.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(textfield.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(span);
    			destroy_component(textfield);
    		}
    	};
    }

    function create_fragment$d(ctx) {
    	let div;
    	let menu;
    	let updating_active;
    	let div_class_value;
    	let current;

    	function menu_active_binding(value) {
    		/*menu_active_binding*/ ctx[22](value);
    	}

    	let menu_props = {
    		offsetY: false,
    		disabled: /*disabled*/ ctx[14],
    		closeOnClick: /*closeOnClick*/ ctx[15],
    		$$slots: {
    			activator: [create_activator_slot$1],
    			default: [create_default_slot_2$2]
    		},
    		$$scope: { ctx }
    	};

    	if (/*active*/ ctx[1] !== void 0) {
    		menu_props.active = /*active*/ ctx[1];
    	}

    	menu = new Menu({ props: menu_props });
    	binding_callbacks.push(() => bind(menu, "active", menu_active_binding));

    	return {
    		c() {
    			div = element("div");
    			create_component(menu.$$.fragment);
    			attr(div, "class", div_class_value = "s-select " + /*klass*/ ctx[2]);
    			toggle_class(div, "disabled", /*disabled*/ ctx[14]);
    			toggle_class(div, "chips", /*chips*/ ctx[13]);
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			mount_component(menu, div, null);
    			current = true;
    		},
    		p(ctx, [dirty]) {
    			const menu_changes = {};
    			if (dirty & /*disabled*/ 16384) menu_changes.disabled = /*disabled*/ ctx[14];
    			if (dirty & /*closeOnClick*/ 32768) menu_changes.closeOnClick = /*closeOnClick*/ ctx[15];

    			if (dirty & /*$$scope, filled, outlined, solo, dense, disabled, format, value, placeholder, hint, active, chips, mandatory, multiple, max, items*/ 8486907) {
    				menu_changes.$$scope = { dirty, ctx };
    			}

    			if (!updating_active && dirty & /*active*/ 2) {
    				updating_active = true;
    				menu_changes.active = /*active*/ ctx[1];
    				add_flush_callback(() => updating_active = false);
    			}

    			menu.$set(menu_changes);

    			if (!current || dirty & /*klass*/ 4 && div_class_value !== (div_class_value = "s-select " + /*klass*/ ctx[2])) {
    				attr(div, "class", div_class_value);
    			}

    			if (dirty & /*klass, disabled*/ 16388) {
    				toggle_class(div, "disabled", /*disabled*/ ctx[14]);
    			}

    			if (dirty & /*klass, chips*/ 8196) {
    				toggle_class(div, "chips", /*chips*/ ctx[13]);
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(menu.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(menu.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    			destroy_component(menu);
    		}
    	};
    }

    function instance$d($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	let { class: klass = "" } = $$props;
    	let { active = false } = $$props;
    	let { value = [] } = $$props;
    	let { items = [] } = $$props;
    	let { filled = false } = $$props;
    	let { outlined = false } = $$props;
    	let { solo = false } = $$props;
    	let { dense = false } = $$props;
    	let { placeholder = null } = $$props;
    	let { hint = "" } = $$props;
    	let { mandatory = false } = $$props;
    	let { multiple = false } = $$props;
    	let { max = Infinity } = $$props;
    	let { chips = false } = $$props;
    	let { disabled = null } = $$props;
    	let { closeOnClick = !multiple } = $$props;
    	let { emptyString = "" } = $$props;

    	const getSelectString = v => {
    		// We could also use `return items[0].value ? find.. : v` or provide a `basic` prop
    		const item = items.find(i => i.value === v);

    		return item ? item.name ? item.name : item : v || emptyString;
    	};

    	let { format = val => Array.isArray(val)
    	? val.map(v => getSelectString(v)).join(", ")
    	: getSelectString(val) } = $$props;

    	const dispatch = createEventDispatcher();
    	const func = v => getSelectString(v);

    	function listitemgroup_value_binding(value$1) {
    		value = value$1;
    		$$invalidate(0, value);
    	}

    	function menu_active_binding(value) {
    		active = value;
    		$$invalidate(1, active);
    	}

    	$$self.$$set = $$props => {
    		if ("class" in $$props) $$invalidate(2, klass = $$props.class);
    		if ("active" in $$props) $$invalidate(1, active = $$props.active);
    		if ("value" in $$props) $$invalidate(0, value = $$props.value);
    		if ("items" in $$props) $$invalidate(3, items = $$props.items);
    		if ("filled" in $$props) $$invalidate(4, filled = $$props.filled);
    		if ("outlined" in $$props) $$invalidate(5, outlined = $$props.outlined);
    		if ("solo" in $$props) $$invalidate(6, solo = $$props.solo);
    		if ("dense" in $$props) $$invalidate(7, dense = $$props.dense);
    		if ("placeholder" in $$props) $$invalidate(8, placeholder = $$props.placeholder);
    		if ("hint" in $$props) $$invalidate(9, hint = $$props.hint);
    		if ("mandatory" in $$props) $$invalidate(10, mandatory = $$props.mandatory);
    		if ("multiple" in $$props) $$invalidate(11, multiple = $$props.multiple);
    		if ("max" in $$props) $$invalidate(12, max = $$props.max);
    		if ("chips" in $$props) $$invalidate(13, chips = $$props.chips);
    		if ("disabled" in $$props) $$invalidate(14, disabled = $$props.disabled);
    		if ("closeOnClick" in $$props) $$invalidate(15, closeOnClick = $$props.closeOnClick);
    		if ("emptyString" in $$props) $$invalidate(18, emptyString = $$props.emptyString);
    		if ("format" in $$props) $$invalidate(16, format = $$props.format);
    		if ("$$scope" in $$props) $$invalidate(23, $$scope = $$props.$$scope);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*value*/ 1) {
    			dispatch("change", value);
    		}
    	};

    	return [
    		value,
    		active,
    		klass,
    		items,
    		filled,
    		outlined,
    		solo,
    		dense,
    		placeholder,
    		hint,
    		mandatory,
    		multiple,
    		max,
    		chips,
    		disabled,
    		closeOnClick,
    		format,
    		getSelectString,
    		emptyString,
    		slots,
    		func,
    		listitemgroup_value_binding,
    		menu_active_binding,
    		$$scope
    	];
    }

    class Select extends SvelteComponent {
    	constructor(options) {
    		super();
    		if (!document.getElementById("svelte-1cnf6l4-style")) add_css$a();

    		init(this, options, instance$d, create_fragment$d, safe_not_equal, {
    			class: 2,
    			active: 1,
    			value: 0,
    			items: 3,
    			filled: 4,
    			outlined: 5,
    			solo: 6,
    			dense: 7,
    			placeholder: 8,
    			hint: 9,
    			mandatory: 10,
    			multiple: 11,
    			max: 12,
    			chips: 13,
    			disabled: 14,
    			closeOnClick: 15,
    			emptyString: 18,
    			format: 16
    		});
    	}
    }

    /* eslint-disable no-param-reassign */

    const themeColors = ['primary', 'secondary', 'success', 'info', 'warning', 'error'];

    /**
     * @param {string} klass
     */
    function formatClass(klass) {
      return klass.split(' ').map((i) => {
        if (themeColors.includes(i)) return `${i}-color`;
        return i;
      });
    }

    function setBackgroundColor(node, text) {
      if (/^(#|rgb|hsl|currentColor)/.test(text)) {
        // This is a CSS hex.
        node.style.backgroundColor = text;
        return false;
      }

      if (text.startsWith('--')) {
        // This is a CSS variable.
        node.style.backgroundColor = `var(${text})`;
        return false;
      }

      const klass = formatClass(text);
      node.classList.add(...klass);
      return klass;
    }

    /**
     * @param node {Element}
     * @param text {string|boolean}
     */
    var BackgroundColor = (node, text) => {
      let klass;
      if (typeof text === 'string') {
        klass = setBackgroundColor(node, text);
      }

      return {
        update(newText) {
          if (klass) {
            node.classList.remove(...klass);
          } else {
            node.style.backgroundColor = null;
          }

          if (typeof newText === 'string') {
            klass = setBackgroundColor(node, newText);
          }
        },
      };
    };

    /* node_modules\svelte-materialify\src\components\Overlay\Overlay.svelte generated by Svelte v3.35.0 */

    function add_css$9() {
    	var style = element("style");
    	style.id = "svelte-7bull3-style";
    	style.textContent = ".s-overlay.svelte-7bull3{align-items:center;border-radius:inherit;display:flex;justify-content:center;position:fixed;top:0;left:0;right:0;bottom:0;pointer-events:auto}.s-overlay.absolute.svelte-7bull3{position:absolute}.s-overlay__scrim.svelte-7bull3{border-radius:inherit;bottom:0;height:100%;left:0;position:absolute;right:0;top:0;transition:inherit;width:100%;will-change:opacity}.s-overlay__content.svelte-7bull3{position:relative}";
    	append(document.head, style);
    }

    // (51:0) {#if active}
    function create_if_block$3(ctx) {
    	let div2;
    	let div0;
    	let BackgroundColor_action;
    	let t;
    	let div1;
    	let div2_class_value;
    	let div2_style_value;
    	let div2_intro;
    	let div2_outro;
    	let current;
    	let mounted;
    	let dispose;
    	const default_slot_template = /*#slots*/ ctx[11].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[10], null);

    	return {
    		c() {
    			div2 = element("div");
    			div0 = element("div");
    			t = space();
    			div1 = element("div");
    			if (default_slot) default_slot.c();
    			attr(div0, "class", "s-overlay__scrim svelte-7bull3");
    			set_style(div0, "opacity", /*opacity*/ ctx[5]);
    			attr(div1, "class", "s-overlay__content svelte-7bull3");
    			attr(div2, "class", div2_class_value = "s-overlay " + /*klass*/ ctx[0] + " svelte-7bull3");
    			attr(div2, "style", div2_style_value = "z-index:" + /*index*/ ctx[7] + ";" + /*style*/ ctx[9]);
    			toggle_class(div2, "absolute", /*absolute*/ ctx[8]);
    		},
    		m(target, anchor) {
    			insert(target, div2, anchor);
    			append(div2, div0);
    			append(div2, t);
    			append(div2, div1);

    			if (default_slot) {
    				default_slot.m(div1, null);
    			}

    			current = true;

    			if (!mounted) {
    				dispose = [
    					action_destroyer(BackgroundColor_action = BackgroundColor.call(null, div0, /*color*/ ctx[6])),
    					listen(div2, "click", /*click_handler*/ ctx[12])
    				];

    				mounted = true;
    			}
    		},
    		p(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (!current || dirty & /*opacity*/ 32) {
    				set_style(div0, "opacity", /*opacity*/ ctx[5]);
    			}

    			if (BackgroundColor_action && is_function(BackgroundColor_action.update) && dirty & /*color*/ 64) BackgroundColor_action.update.call(null, /*color*/ ctx[6]);

    			if (default_slot) {
    				if (default_slot.p && dirty & /*$$scope*/ 1024) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[10], dirty, null, null);
    				}
    			}

    			if (!current || dirty & /*klass*/ 1 && div2_class_value !== (div2_class_value = "s-overlay " + /*klass*/ ctx[0] + " svelte-7bull3")) {
    				attr(div2, "class", div2_class_value);
    			}

    			if (!current || dirty & /*index, style*/ 640 && div2_style_value !== (div2_style_value = "z-index:" + /*index*/ ctx[7] + ";" + /*style*/ ctx[9])) {
    				attr(div2, "style", div2_style_value);
    			}

    			if (dirty & /*klass, absolute*/ 257) {
    				toggle_class(div2, "absolute", /*absolute*/ ctx[8]);
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(default_slot, local);

    			add_render_callback(() => {
    				if (div2_outro) div2_outro.end(1);
    				if (!div2_intro) div2_intro = create_in_transition(div2, /*transition*/ ctx[1], /*inOpts*/ ctx[2]);
    				div2_intro.start();
    			});

    			current = true;
    		},
    		o(local) {
    			transition_out(default_slot, local);
    			if (div2_intro) div2_intro.invalidate();
    			div2_outro = create_out_transition(div2, /*transition*/ ctx[1], /*outOpts*/ ctx[3]);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(div2);
    			if (default_slot) default_slot.d(detaching);
    			if (detaching && div2_outro) div2_outro.end();
    			mounted = false;
    			run_all(dispose);
    		}
    	};
    }

    function create_fragment$c(ctx) {
    	let if_block_anchor;
    	let current;
    	let if_block = /*active*/ ctx[4] && create_if_block$3(ctx);

    	return {
    		c() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		m(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p(ctx, [dirty]) {
    			if (/*active*/ ctx[4]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty & /*active*/ 16) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block$3(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach(if_block_anchor);
    		}
    	};
    }

    function instance$c($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	let { class: klass = "" } = $$props;
    	let { transition = fade } = $$props;
    	let { inOpts = { duration: 250 } } = $$props;
    	let { outOpts = { duration: 250 } } = $$props;
    	let { active = true } = $$props;
    	let { opacity = 0.46 } = $$props;
    	let { color = "rgb(33, 33, 33)" } = $$props;
    	let { index = 5 } = $$props;
    	let { absolute = false } = $$props;
    	let { style = "" } = $$props;

    	function click_handler(event) {
    		bubble($$self, event);
    	}

    	$$self.$$set = $$props => {
    		if ("class" in $$props) $$invalidate(0, klass = $$props.class);
    		if ("transition" in $$props) $$invalidate(1, transition = $$props.transition);
    		if ("inOpts" in $$props) $$invalidate(2, inOpts = $$props.inOpts);
    		if ("outOpts" in $$props) $$invalidate(3, outOpts = $$props.outOpts);
    		if ("active" in $$props) $$invalidate(4, active = $$props.active);
    		if ("opacity" in $$props) $$invalidate(5, opacity = $$props.opacity);
    		if ("color" in $$props) $$invalidate(6, color = $$props.color);
    		if ("index" in $$props) $$invalidate(7, index = $$props.index);
    		if ("absolute" in $$props) $$invalidate(8, absolute = $$props.absolute);
    		if ("style" in $$props) $$invalidate(9, style = $$props.style);
    		if ("$$scope" in $$props) $$invalidate(10, $$scope = $$props.$$scope);
    	};

    	return [
    		klass,
    		transition,
    		inOpts,
    		outOpts,
    		active,
    		opacity,
    		color,
    		index,
    		absolute,
    		style,
    		$$scope,
    		slots,
    		click_handler
    	];
    }

    class Overlay extends SvelteComponent {
    	constructor(options) {
    		super();
    		if (!document.getElementById("svelte-7bull3-style")) add_css$9();

    		init(this, options, instance$c, create_fragment$c, safe_not_equal, {
    			class: 0,
    			transition: 1,
    			inOpts: 2,
    			outOpts: 3,
    			active: 4,
    			opacity: 5,
    			color: 6,
    			index: 7,
    			absolute: 8,
    			style: 9
    		});
    	}
    }

    /* node_modules\svelte-materialify\src\components\Dialog\Dialog.svelte generated by Svelte v3.35.0 */

    function add_css$8() {
    	var style = element("style");
    	style.id = "svelte-75lhv6-style";
    	style.textContent = ".s-dialog{align-items:center;display:flex;height:100%;justify-content:center;left:0;pointer-events:none;position:fixed;top:0;transition:0.2s cubic-bezier(0.25, 0.8, 0.25, 1), z-index 1ms;width:100%;z-index:6;outline:none}.s-dialog__content{background-color:var(--theme-surface);border-radius:4px;margin:24px;overflow-y:auto;pointer-events:auto;z-index:inherit;box-shadow:0 11px 15px -7px rgba(0, 0, 0, 0.2), 0 24px 38px 3px rgba(0, 0, 0, 0.14), 0 9px 46px 8px rgba(0, 0, 0, 0.12)}.s-dialog__content:not(.fullscreen){max-height:75%;width:var(--s-dialog-width)}.s-dialog__content.fullscreen{border-radius:0;margin:0;height:100%;width:100%;position:fixed;overflow-y:auto;top:0;left:0}.s-dialog__content>.s-card>.s-card-title{font-size:1.25rem;font-weight:500;letter-spacing:0.0125em;padding:16px 24px 10px}.s-dialog__content>.s-card>.s-card-text{padding:0 24px 20px}.s-dialog__content>.s-card>.s-card-subtitle{padding:0 24px 20px}.fullscreen{border-radius:0;margin:0;height:100%;position:fixed;overflow-y:auto;top:0;left:0}.fullscreen>.s-card{min-height:100%;min-width:100%;margin:0 !important;padding:0 !important}";
    	append(document.head, style);
    }

    // (91:0) {#if visible}
    function create_if_block$2(ctx) {
    	let div1;
    	let div0;
    	let div0_class_value;
    	let div0_transition;
    	let Style_action;
    	let current;
    	let mounted;
    	let dispose;
    	const default_slot_template = /*#slots*/ ctx[11].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[10], null);

    	return {
    		c() {
    			div1 = element("div");
    			div0 = element("div");
    			if (default_slot) default_slot.c();
    			attr(div0, "class", div0_class_value = "s-dialog__content " + /*klass*/ ctx[0]);
    			toggle_class(div0, "fullscreen", /*fullscreen*/ ctx[2]);
    			attr(div1, "role", "document");
    			attr(div1, "class", "s-dialog");
    		},
    		m(target, anchor) {
    			insert(target, div1, anchor);
    			append(div1, div0);

    			if (default_slot) {
    				default_slot.m(div0, null);
    			}

    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen(div0, "introstart", /*introstart_handler*/ ctx[12]),
    					listen(div0, "outrostart", /*outrostart_handler*/ ctx[13]),
    					listen(div0, "introend", /*introend_handler*/ ctx[14]),
    					listen(div0, "outroend", /*outroend_handler*/ ctx[15]),
    					action_destroyer(Style_action = Style.call(null, div1, { "dialog-width": /*width*/ ctx[1] }))
    				];

    				mounted = true;
    			}
    		},
    		p(ctx, dirty) {
    			if (default_slot) {
    				if (default_slot.p && dirty & /*$$scope*/ 1024) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[10], dirty, null, null);
    				}
    			}

    			if (!current || dirty & /*klass*/ 1 && div0_class_value !== (div0_class_value = "s-dialog__content " + /*klass*/ ctx[0])) {
    				attr(div0, "class", div0_class_value);
    			}

    			if (dirty & /*klass, fullscreen*/ 5) {
    				toggle_class(div0, "fullscreen", /*fullscreen*/ ctx[2]);
    			}

    			if (Style_action && is_function(Style_action.update) && dirty & /*width*/ 2) Style_action.update.call(null, { "dialog-width": /*width*/ ctx[1] });
    		},
    		i(local) {
    			if (current) return;
    			transition_in(default_slot, local);

    			add_render_callback(() => {
    				if (!div0_transition) div0_transition = create_bidirectional_transition(div0, /*transition*/ ctx[3], { duration: 300, start: 0.1 }, true);
    				div0_transition.run(1);
    			});

    			current = true;
    		},
    		o(local) {
    			transition_out(default_slot, local);
    			if (!div0_transition) div0_transition = create_bidirectional_transition(div0, /*transition*/ ctx[3], { duration: 300, start: 0.1 }, false);
    			div0_transition.run(0);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(div1);
    			if (default_slot) default_slot.d(detaching);
    			if (detaching && div0_transition) div0_transition.end();
    			mounted = false;
    			run_all(dispose);
    		}
    	};
    }

    function create_fragment$b(ctx) {
    	let t;
    	let overlay_1;
    	let current;
    	let if_block = /*visible*/ ctx[5] && create_if_block$2(ctx);
    	const overlay_1_spread_levels = [/*overlay*/ ctx[4], { active: /*visible*/ ctx[5] }];
    	let overlay_1_props = {};

    	for (let i = 0; i < overlay_1_spread_levels.length; i += 1) {
    		overlay_1_props = assign(overlay_1_props, overlay_1_spread_levels[i]);
    	}

    	overlay_1 = new Overlay({ props: overlay_1_props });
    	overlay_1.$on("click", /*close*/ ctx[6]);

    	return {
    		c() {
    			if (if_block) if_block.c();
    			t = space();
    			create_component(overlay_1.$$.fragment);
    		},
    		m(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert(target, t, anchor);
    			mount_component(overlay_1, target, anchor);
    			current = true;
    		},
    		p(ctx, [dirty]) {
    			if (/*visible*/ ctx[5]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty & /*visible*/ 32) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block$2(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(t.parentNode, t);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}

    			const overlay_1_changes = (dirty & /*overlay, visible*/ 48)
    			? get_spread_update(overlay_1_spread_levels, [
    					dirty & /*overlay*/ 16 && get_spread_object(/*overlay*/ ctx[4]),
    					dirty & /*visible*/ 32 && { active: /*visible*/ ctx[5] }
    				])
    			: {};

    			overlay_1.$set(overlay_1_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(if_block);
    			transition_in(overlay_1.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(if_block);
    			transition_out(overlay_1.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach(t);
    			destroy_component(overlay_1, detaching);
    		}
    	};
    }

    function instance$b($$self, $$props, $$invalidate) {
    	let visible;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	let { class: klass = "" } = $$props;
    	let { active = false } = $$props;
    	let { persistent = false } = $$props;
    	let { disabled = false } = $$props;
    	let { width = 500 } = $$props;
    	let { fullscreen = false } = $$props;
    	let { transition = scale } = $$props;
    	let { overlay = {} } = $$props;

    	function close() {
    		if (!persistent) $$invalidate(7, active = false);
    	}

    	function introstart_handler(event) {
    		bubble($$self, event);
    	}

    	function outrostart_handler(event) {
    		bubble($$self, event);
    	}

    	function introend_handler(event) {
    		bubble($$self, event);
    	}

    	function outroend_handler(event) {
    		bubble($$self, event);
    	}

    	$$self.$$set = $$props => {
    		if ("class" in $$props) $$invalidate(0, klass = $$props.class);
    		if ("active" in $$props) $$invalidate(7, active = $$props.active);
    		if ("persistent" in $$props) $$invalidate(8, persistent = $$props.persistent);
    		if ("disabled" in $$props) $$invalidate(9, disabled = $$props.disabled);
    		if ("width" in $$props) $$invalidate(1, width = $$props.width);
    		if ("fullscreen" in $$props) $$invalidate(2, fullscreen = $$props.fullscreen);
    		if ("transition" in $$props) $$invalidate(3, transition = $$props.transition);
    		if ("overlay" in $$props) $$invalidate(4, overlay = $$props.overlay);
    		if ("$$scope" in $$props) $$invalidate(10, $$scope = $$props.$$scope);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*active, disabled*/ 640) {
    			$$invalidate(5, visible = active && !disabled);
    		}
    	};

    	return [
    		klass,
    		width,
    		fullscreen,
    		transition,
    		overlay,
    		visible,
    		close,
    		active,
    		persistent,
    		disabled,
    		$$scope,
    		slots,
    		introstart_handler,
    		outrostart_handler,
    		introend_handler,
    		outroend_handler
    	];
    }

    class Dialog extends SvelteComponent {
    	constructor(options) {
    		super();
    		if (!document.getElementById("svelte-75lhv6-style")) add_css$8();

    		init(this, options, instance$b, create_fragment$b, safe_not_equal, {
    			class: 0,
    			active: 7,
    			persistent: 8,
    			disabled: 9,
    			width: 1,
    			fullscreen: 2,
    			transition: 3,
    			overlay: 4
    		});
    	}
    }

    /* node_modules\svelte-materialify\src\components\Divider\Divider.svelte generated by Svelte v3.35.0 */

    function add_css$7() {
    	var style = element("style");
    	style.id = "svelte-syn7p7-style";
    	style.textContent = ".s-divider.svelte-syn7p7{display:block;flex:1 1 0;max-width:100%;height:0;max-height:0;border:solid;border-width:thin 0 0 0;border-color:var(--theme-dividers);transition:inherit}.s-divider.inset.svelte-syn7p7:not(.vertical){max-width:calc(100% - 72px);margin-left:72px}.s-divider.vertical.svelte-syn7p7{align-self:stretch;border:solid;border-width:0 thin 0 0;display:inline-flex;height:inherit;min-height:100%;max-height:100%;max-width:0;width:0;vertical-align:text-bottom}.s-divider.vertical.inset.svelte-syn7p7{margin-top:8px;min-height:0;max-height:calc(100% - 16px)}";
    	append(document.head, style);
    }

    function create_fragment$a(ctx) {
    	let hr;
    	let hr_class_value;
    	let hr_aria_orientation_value;

    	return {
    		c() {
    			hr = element("hr");
    			attr(hr, "class", hr_class_value = "s-divider " + /*klass*/ ctx[0] + " svelte-syn7p7");
    			attr(hr, "role", "separator");
    			attr(hr, "aria-orientation", hr_aria_orientation_value = /*vertical*/ ctx[2] ? "vertical" : "horizontal");
    			attr(hr, "style", /*style*/ ctx[3]);
    			toggle_class(hr, "inset", /*inset*/ ctx[1]);
    			toggle_class(hr, "vertical", /*vertical*/ ctx[2]);
    		},
    		m(target, anchor) {
    			insert(target, hr, anchor);
    		},
    		p(ctx, [dirty]) {
    			if (dirty & /*klass*/ 1 && hr_class_value !== (hr_class_value = "s-divider " + /*klass*/ ctx[0] + " svelte-syn7p7")) {
    				attr(hr, "class", hr_class_value);
    			}

    			if (dirty & /*vertical*/ 4 && hr_aria_orientation_value !== (hr_aria_orientation_value = /*vertical*/ ctx[2] ? "vertical" : "horizontal")) {
    				attr(hr, "aria-orientation", hr_aria_orientation_value);
    			}

    			if (dirty & /*style*/ 8) {
    				attr(hr, "style", /*style*/ ctx[3]);
    			}

    			if (dirty & /*klass, inset*/ 3) {
    				toggle_class(hr, "inset", /*inset*/ ctx[1]);
    			}

    			if (dirty & /*klass, vertical*/ 5) {
    				toggle_class(hr, "vertical", /*vertical*/ ctx[2]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(hr);
    		}
    	};
    }

    function instance$a($$self, $$props, $$invalidate) {
    	let { class: klass = "" } = $$props;
    	let { inset = false } = $$props;
    	let { vertical = false } = $$props;
    	let { style = null } = $$props;

    	$$self.$$set = $$props => {
    		if ("class" in $$props) $$invalidate(0, klass = $$props.class);
    		if ("inset" in $$props) $$invalidate(1, inset = $$props.inset);
    		if ("vertical" in $$props) $$invalidate(2, vertical = $$props.vertical);
    		if ("style" in $$props) $$invalidate(3, style = $$props.style);
    	};

    	return [klass, inset, vertical, style];
    }

    class Divider extends SvelteComponent {
    	constructor(options) {
    		super();
    		if (!document.getElementById("svelte-syn7p7-style")) add_css$7();

    		init(this, options, instance$a, create_fragment$a, safe_not_equal, {
    			class: 0,
    			inset: 1,
    			vertical: 2,
    			style: 3
    		});
    	}
    }

    /* node_modules\svelte-materialify\src\components\AppBar\AppBar.svelte generated by Svelte v3.35.0 */

    function add_css$6() {
    	var style = element("style");
    	style.id = "svelte-ytehz3-style";
    	style.textContent = ".s-app-bar{background-color:var(--theme-app-bar);contain:layout;display:block;flex:1 1 auto;max-width:100%;position:relative;z-index:5;transition:0.25s cubic-bezier(0.4, 0, 0.2, 1)}.s-app-bar .s-app-bar__wrapper{height:var(--s-app-bar-height);align-items:center;display:flex;padding:4px}.s-app-bar .s-app-bar__wrapper .s-btn.fab{width:48px;height:48px}.s-app-bar .s-app-bar__title{padding-left:16px;font-size:1.25rem;line-height:1.5;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.s-app-bar:not(.tile){border-top-left-radius:inherit;border-top-right-radius:inherit}.s-app-bar:not(.flat){box-shadow:0 2px 4px -1px rgba(0, 0, 0, 0.2), 0 4px 5px 0 rgba(0, 0, 0, 0.14), 0 1px 10px 0 rgba(0, 0, 0, 0.12)}.s-app-bar.dense .s-app-bar__wrapper{height:48px;padding:0}.s-app-bar.prominent .s-app-bar__wrapper{height:128px;align-items:flex-start}.s-app-bar.prominent .s-app-bar__title{align-self:flex-end;padding-bottom:6px;padding-top:0}.s-app-bar.fixed{position:fixed;top:0}.s-app-bar.absolute{position:absolute;top:0}.s-app-bar.hidden{transform:translate(-100%)}.s-app-bar.collapsed{border-bottom-right-radius:24px;max-width:112px;overflow:hidden}";
    	append(document.head, style);
    }

    const get_extension_slot_changes = dirty => ({});
    const get_extension_slot_context = ctx => ({});
    const get_title_slot_changes = dirty => ({});
    const get_title_slot_context = ctx => ({});
    const get_icon_slot_changes = dirty => ({});
    const get_icon_slot_context = ctx => ({});

    // (97:4) {#if !collapsed}
    function create_if_block$1(ctx) {
    	let div;
    	let current;
    	const title_slot_template = /*#slots*/ ctx[11].title;
    	const title_slot = create_slot(title_slot_template, ctx, /*$$scope*/ ctx[10], get_title_slot_context);

    	return {
    		c() {
    			div = element("div");
    			if (title_slot) title_slot.c();
    			attr(div, "class", "s-app-bar__title");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);

    			if (title_slot) {
    				title_slot.m(div, null);
    			}

    			current = true;
    		},
    		p(ctx, dirty) {
    			if (title_slot) {
    				if (title_slot.p && dirty & /*$$scope*/ 1024) {
    					update_slot(title_slot, title_slot_template, ctx, /*$$scope*/ ctx[10], dirty, get_title_slot_changes, get_title_slot_context);
    				}
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(title_slot, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(title_slot, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    			if (title_slot) title_slot.d(detaching);
    		}
    	};
    }

    function create_fragment$9(ctx) {
    	let header;
    	let div;
    	let t0;
    	let t1;
    	let t2;
    	let header_class_value;
    	let Style_action;
    	let current;
    	let mounted;
    	let dispose;
    	const icon_slot_template = /*#slots*/ ctx[11].icon;
    	const icon_slot = create_slot(icon_slot_template, ctx, /*$$scope*/ ctx[10], get_icon_slot_context);
    	let if_block = !/*collapsed*/ ctx[8] && create_if_block$1(ctx);
    	const default_slot_template = /*#slots*/ ctx[11].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[10], null);
    	const extension_slot_template = /*#slots*/ ctx[11].extension;
    	const extension_slot = create_slot(extension_slot_template, ctx, /*$$scope*/ ctx[10], get_extension_slot_context);

    	return {
    		c() {
    			header = element("header");
    			div = element("div");
    			if (icon_slot) icon_slot.c();
    			t0 = space();
    			if (if_block) if_block.c();
    			t1 = space();
    			if (default_slot) default_slot.c();
    			t2 = space();
    			if (extension_slot) extension_slot.c();
    			attr(div, "class", "s-app-bar__wrapper");
    			attr(header, "class", header_class_value = "s-app-bar " + /*klass*/ ctx[0]);
    			attr(header, "style", /*style*/ ctx[9]);
    			toggle_class(header, "tile", /*tile*/ ctx[2]);
    			toggle_class(header, "flat", /*flat*/ ctx[3]);
    			toggle_class(header, "dense", /*dense*/ ctx[4]);
    			toggle_class(header, "prominent", /*prominent*/ ctx[5]);
    			toggle_class(header, "fixed", /*fixed*/ ctx[6]);
    			toggle_class(header, "absolute", /*absolute*/ ctx[7]);
    			toggle_class(header, "collapsed", /*collapsed*/ ctx[8]);
    		},
    		m(target, anchor) {
    			insert(target, header, anchor);
    			append(header, div);

    			if (icon_slot) {
    				icon_slot.m(div, null);
    			}

    			append(div, t0);
    			if (if_block) if_block.m(div, null);
    			append(div, t1);

    			if (default_slot) {
    				default_slot.m(div, null);
    			}

    			append(header, t2);

    			if (extension_slot) {
    				extension_slot.m(header, null);
    			}

    			current = true;

    			if (!mounted) {
    				dispose = action_destroyer(Style_action = Style.call(null, header, { "app-bar-height": /*height*/ ctx[1] }));
    				mounted = true;
    			}
    		},
    		p(ctx, [dirty]) {
    			if (icon_slot) {
    				if (icon_slot.p && dirty & /*$$scope*/ 1024) {
    					update_slot(icon_slot, icon_slot_template, ctx, /*$$scope*/ ctx[10], dirty, get_icon_slot_changes, get_icon_slot_context);
    				}
    			}

    			if (!/*collapsed*/ ctx[8]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty & /*collapsed*/ 256) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block$1(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(div, t1);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}

    			if (default_slot) {
    				if (default_slot.p && dirty & /*$$scope*/ 1024) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[10], dirty, null, null);
    				}
    			}

    			if (extension_slot) {
    				if (extension_slot.p && dirty & /*$$scope*/ 1024) {
    					update_slot(extension_slot, extension_slot_template, ctx, /*$$scope*/ ctx[10], dirty, get_extension_slot_changes, get_extension_slot_context);
    				}
    			}

    			if (!current || dirty & /*klass*/ 1 && header_class_value !== (header_class_value = "s-app-bar " + /*klass*/ ctx[0])) {
    				attr(header, "class", header_class_value);
    			}

    			if (!current || dirty & /*style*/ 512) {
    				attr(header, "style", /*style*/ ctx[9]);
    			}

    			if (Style_action && is_function(Style_action.update) && dirty & /*height*/ 2) Style_action.update.call(null, { "app-bar-height": /*height*/ ctx[1] });

    			if (dirty & /*klass, tile*/ 5) {
    				toggle_class(header, "tile", /*tile*/ ctx[2]);
    			}

    			if (dirty & /*klass, flat*/ 9) {
    				toggle_class(header, "flat", /*flat*/ ctx[3]);
    			}

    			if (dirty & /*klass, dense*/ 17) {
    				toggle_class(header, "dense", /*dense*/ ctx[4]);
    			}

    			if (dirty & /*klass, prominent*/ 33) {
    				toggle_class(header, "prominent", /*prominent*/ ctx[5]);
    			}

    			if (dirty & /*klass, fixed*/ 65) {
    				toggle_class(header, "fixed", /*fixed*/ ctx[6]);
    			}

    			if (dirty & /*klass, absolute*/ 129) {
    				toggle_class(header, "absolute", /*absolute*/ ctx[7]);
    			}

    			if (dirty & /*klass, collapsed*/ 257) {
    				toggle_class(header, "collapsed", /*collapsed*/ ctx[8]);
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(icon_slot, local);
    			transition_in(if_block);
    			transition_in(default_slot, local);
    			transition_in(extension_slot, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(icon_slot, local);
    			transition_out(if_block);
    			transition_out(default_slot, local);
    			transition_out(extension_slot, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(header);
    			if (icon_slot) icon_slot.d(detaching);
    			if (if_block) if_block.d();
    			if (default_slot) default_slot.d(detaching);
    			if (extension_slot) extension_slot.d(detaching);
    			mounted = false;
    			dispose();
    		}
    	};
    }

    function instance$9($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	let { class: klass = "" } = $$props;
    	let { height = "56px" } = $$props;
    	let { tile = false } = $$props;
    	let { flat = false } = $$props;
    	let { dense = false } = $$props;
    	let { prominent = false } = $$props;
    	let { fixed = false } = $$props;
    	let { absolute = false } = $$props;
    	let { collapsed = false } = $$props;
    	let { style = "" } = $$props;

    	$$self.$$set = $$props => {
    		if ("class" in $$props) $$invalidate(0, klass = $$props.class);
    		if ("height" in $$props) $$invalidate(1, height = $$props.height);
    		if ("tile" in $$props) $$invalidate(2, tile = $$props.tile);
    		if ("flat" in $$props) $$invalidate(3, flat = $$props.flat);
    		if ("dense" in $$props) $$invalidate(4, dense = $$props.dense);
    		if ("prominent" in $$props) $$invalidate(5, prominent = $$props.prominent);
    		if ("fixed" in $$props) $$invalidate(6, fixed = $$props.fixed);
    		if ("absolute" in $$props) $$invalidate(7, absolute = $$props.absolute);
    		if ("collapsed" in $$props) $$invalidate(8, collapsed = $$props.collapsed);
    		if ("style" in $$props) $$invalidate(9, style = $$props.style);
    		if ("$$scope" in $$props) $$invalidate(10, $$scope = $$props.$$scope);
    	};

    	return [
    		klass,
    		height,
    		tile,
    		flat,
    		dense,
    		prominent,
    		fixed,
    		absolute,
    		collapsed,
    		style,
    		$$scope,
    		slots
    	];
    }

    class AppBar extends SvelteComponent {
    	constructor(options) {
    		super();
    		if (!document.getElementById("svelte-ytehz3-style")) add_css$6();

    		init(this, options, instance$9, create_fragment$9, safe_not_equal, {
    			class: 0,
    			height: 1,
    			tile: 2,
    			flat: 3,
    			dense: 4,
    			prominent: 5,
    			fixed: 6,
    			absolute: 7,
    			collapsed: 8,
    			style: 9
    		});
    	}
    }

    /* node_modules\svelte-materialify\src\components\Subheader\Subheader.svelte generated by Svelte v3.35.0 */

    function add_css$5() {
    	var style = element("style");
    	style.id = "svelte-1xheq3f-style";
    	style.textContent = ".s-subheader.svelte-1xheq3f{align-items:center;display:flex;height:48px;font-size:0.875rem;font-weight:400;padding:0 16px 0 16px;color:var(--theme-text-secondary)}.s-subheader.inset.svelte-1xheq3f{margin-left:56px}";
    	append(document.head, style);
    }

    function create_fragment$8(ctx) {
    	let div;
    	let div_class_value;
    	let current;
    	const default_slot_template = /*#slots*/ ctx[4].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[3], null);

    	return {
    		c() {
    			div = element("div");
    			if (default_slot) default_slot.c();
    			attr(div, "class", div_class_value = "s-subheader " + /*klass*/ ctx[0] + " svelte-1xheq3f");
    			attr(div, "style", /*style*/ ctx[2]);
    			toggle_class(div, "inset", /*inset*/ ctx[1]);
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);

    			if (default_slot) {
    				default_slot.m(div, null);
    			}

    			current = true;
    		},
    		p(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && dirty & /*$$scope*/ 8) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[3], dirty, null, null);
    				}
    			}

    			if (!current || dirty & /*klass*/ 1 && div_class_value !== (div_class_value = "s-subheader " + /*klass*/ ctx[0] + " svelte-1xheq3f")) {
    				attr(div, "class", div_class_value);
    			}

    			if (!current || dirty & /*style*/ 4) {
    				attr(div, "style", /*style*/ ctx[2]);
    			}

    			if (dirty & /*klass, inset*/ 3) {
    				toggle_class(div, "inset", /*inset*/ ctx[1]);
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    			if (default_slot) default_slot.d(detaching);
    		}
    	};
    }

    function instance$8($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	let { class: klass = "" } = $$props;
    	let { inset = false } = $$props;
    	let { style = null } = $$props;

    	$$self.$$set = $$props => {
    		if ("class" in $$props) $$invalidate(0, klass = $$props.class);
    		if ("inset" in $$props) $$invalidate(1, inset = $$props.inset);
    		if ("style" in $$props) $$invalidate(2, style = $$props.style);
    		if ("$$scope" in $$props) $$invalidate(3, $$scope = $$props.$$scope);
    	};

    	return [klass, inset, style, $$scope, slots];
    }

    class Subheader extends SvelteComponent {
    	constructor(options) {
    		super();
    		if (!document.getElementById("svelte-1xheq3f-style")) add_css$5();
    		init(this, options, instance$8, create_fragment$8, safe_not_equal, { class: 0, inset: 1, style: 2 });
    	}
    }

    /* node_modules\svelte-materialify\src\components\Grid\Container.svelte generated by Svelte v3.35.0 */

    function add_css$4() {
    	var style = element("style");
    	style.id = "svelte-7r4fuh-style";
    	style.textContent = ".s-container{width:100%;padding:12px;margin-right:auto;margin-left:auto}.s-container.fluid{max-width:100%}@media only screen and (min-width: 960px){.s-container{max-width:900px}}@media only screen and (min-width: 1264px){.s-container{max-width:1185px}}@media only screen and (min-width: 1904px){.s-container{max-width:1785px}}";
    	append(document.head, style);
    }

    function create_fragment$7(ctx) {
    	let div;
    	let div_class_value;
    	let current;
    	const default_slot_template = /*#slots*/ ctx[4].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[3], null);

    	return {
    		c() {
    			div = element("div");
    			if (default_slot) default_slot.c();
    			attr(div, "class", div_class_value = "s-container " + /*klass*/ ctx[0]);
    			attr(div, "style", /*style*/ ctx[2]);
    			toggle_class(div, "fluid", /*fluid*/ ctx[1]);
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);

    			if (default_slot) {
    				default_slot.m(div, null);
    			}

    			current = true;
    		},
    		p(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && dirty & /*$$scope*/ 8) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[3], dirty, null, null);
    				}
    			}

    			if (!current || dirty & /*klass*/ 1 && div_class_value !== (div_class_value = "s-container " + /*klass*/ ctx[0])) {
    				attr(div, "class", div_class_value);
    			}

    			if (!current || dirty & /*style*/ 4) {
    				attr(div, "style", /*style*/ ctx[2]);
    			}

    			if (dirty & /*klass, fluid*/ 3) {
    				toggle_class(div, "fluid", /*fluid*/ ctx[1]);
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    			if (default_slot) default_slot.d(detaching);
    		}
    	};
    }

    function instance$7($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	let { class: klass = "" } = $$props;
    	let { fluid = false } = $$props;
    	let { style = null } = $$props;

    	$$self.$$set = $$props => {
    		if ("class" in $$props) $$invalidate(0, klass = $$props.class);
    		if ("fluid" in $$props) $$invalidate(1, fluid = $$props.fluid);
    		if ("style" in $$props) $$invalidate(2, style = $$props.style);
    		if ("$$scope" in $$props) $$invalidate(3, $$scope = $$props.$$scope);
    	};

    	return [klass, fluid, style, $$scope, slots];
    }

    class Container extends SvelteComponent {
    	constructor(options) {
    		super();
    		if (!document.getElementById("svelte-7r4fuh-style")) add_css$4();
    		init(this, options, instance$7, create_fragment$7, safe_not_equal, { class: 0, fluid: 1, style: 2 });
    	}
    }

    /* node_modules\svelte-materialify\src\components\Grid\Row.svelte generated by Svelte v3.35.0 */

    function add_css$3() {
    	var style = element("style");
    	style.id = "svelte-12vsgxq-style";
    	style.textContent = ".s-row{display:flex;flex-wrap:wrap;flex:1 1 auto;margin-right:-12px;margin-left:-12px}.s-row.dense{margin-right:-4px;margin-left:-4px}.s-row.dense>.s-col{padding:4px}.s-row.no-gutters{margin-right:0;margin-left:0}.s-row.no-gutters>.s-col{padding:0}";
    	append(document.head, style);
    }

    function create_fragment$6(ctx) {
    	let div;
    	let div_class_value;
    	let current;
    	const default_slot_template = /*#slots*/ ctx[5].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[4], null);

    	return {
    		c() {
    			div = element("div");
    			if (default_slot) default_slot.c();
    			attr(div, "class", div_class_value = "s-row " + /*klass*/ ctx[0]);
    			attr(div, "style", /*style*/ ctx[3]);
    			toggle_class(div, "dense", /*dense*/ ctx[1]);
    			toggle_class(div, "no-gutters", /*noGutters*/ ctx[2]);
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);

    			if (default_slot) {
    				default_slot.m(div, null);
    			}

    			current = true;
    		},
    		p(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && dirty & /*$$scope*/ 16) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[4], dirty, null, null);
    				}
    			}

    			if (!current || dirty & /*klass*/ 1 && div_class_value !== (div_class_value = "s-row " + /*klass*/ ctx[0])) {
    				attr(div, "class", div_class_value);
    			}

    			if (!current || dirty & /*style*/ 8) {
    				attr(div, "style", /*style*/ ctx[3]);
    			}

    			if (dirty & /*klass, dense*/ 3) {
    				toggle_class(div, "dense", /*dense*/ ctx[1]);
    			}

    			if (dirty & /*klass, noGutters*/ 5) {
    				toggle_class(div, "no-gutters", /*noGutters*/ ctx[2]);
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    			if (default_slot) default_slot.d(detaching);
    		}
    	};
    }

    function instance$6($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	let { class: klass = "" } = $$props;
    	let { dense = false } = $$props;
    	let { noGutters = false } = $$props;
    	let { style = null } = $$props;

    	$$self.$$set = $$props => {
    		if ("class" in $$props) $$invalidate(0, klass = $$props.class);
    		if ("dense" in $$props) $$invalidate(1, dense = $$props.dense);
    		if ("noGutters" in $$props) $$invalidate(2, noGutters = $$props.noGutters);
    		if ("style" in $$props) $$invalidate(3, style = $$props.style);
    		if ("$$scope" in $$props) $$invalidate(4, $$scope = $$props.$$scope);
    	};

    	return [klass, dense, noGutters, style, $$scope, slots];
    }

    class Row extends SvelteComponent {
    	constructor(options) {
    		super();
    		if (!document.getElementById("svelte-12vsgxq-style")) add_css$3();

    		init(this, options, instance$6, create_fragment$6, safe_not_equal, {
    			class: 0,
    			dense: 1,
    			noGutters: 2,
    			style: 3
    		});
    	}
    }

    /* node_modules\svelte-materialify\src\components\Grid\Col.svelte generated by Svelte v3.35.0 */

    function add_css$2() {
    	var style = element("style");
    	style.id = "svelte-12xcddy-style";
    	style.textContent = ".s-col{width:100%;padding:12px;flex-basis:0;flex-grow:1;max-width:100%}.s-col.col-auto{flex:0 0 auto;width:auto;max-width:100%}.s-col.col-1{flex:0 0 8.3333333333%;max-width:8.3333333333%}.s-col.col-2{flex:0 0 16.6666666667%;max-width:16.6666666667%}.s-col.col-3{flex:0 0 25%;max-width:25%}.s-col.col-4{flex:0 0 33.3333333333%;max-width:33.3333333333%}.s-col.col-5{flex:0 0 41.6666666667%;max-width:41.6666666667%}.s-col.col-6{flex:0 0 50%;max-width:50%}.s-col.col-7{flex:0 0 58.3333333333%;max-width:58.3333333333%}.s-col.col-8{flex:0 0 66.6666666667%;max-width:66.6666666667%}.s-col.col-9{flex:0 0 75%;max-width:75%}.s-col.col-10{flex:0 0 83.3333333333%;max-width:83.3333333333%}.s-col.col-11{flex:0 0 91.6666666667%;max-width:91.6666666667%}.s-col.col-12{flex:0 0 100%;max-width:100%}.s-col.offset-1{margin-left:8.3333333333%}.s-col.offset-2{margin-left:16.6666666667%}.s-col.offset-3{margin-left:25%}.s-col.offset-4{margin-left:33.3333333333%}.s-col.offset-5{margin-left:41.6666666667%}.s-col.offset-6{margin-left:50%}.s-col.offset-7{margin-left:58.3333333333%}.s-col.offset-8{margin-left:66.6666666667%}.s-col.offset-9{margin-left:75%}.s-col.offset-10{margin-left:83.3333333333%}.s-col.offset-11{margin-left:91.6666666667%}@media only screen and (min-width: 600px){.s-col.sm-auto{flex:0 0 auto;width:auto;max-width:100%}.s-col.sm-1{flex:0 0 8.3333333333%;max-width:8.3333333333%}.s-col.sm-2{flex:0 0 16.6666666667%;max-width:16.6666666667%}.s-col.sm-3{flex:0 0 25%;max-width:25%}.s-col.sm-4{flex:0 0 33.3333333333%;max-width:33.3333333333%}.s-col.sm-5{flex:0 0 41.6666666667%;max-width:41.6666666667%}.s-col.sm-6{flex:0 0 50%;max-width:50%}.s-col.sm-7{flex:0 0 58.3333333333%;max-width:58.3333333333%}.s-col.sm-8{flex:0 0 66.6666666667%;max-width:66.6666666667%}.s-col.sm-9{flex:0 0 75%;max-width:75%}.s-col.sm-10{flex:0 0 83.3333333333%;max-width:83.3333333333%}.s-col.sm-11{flex:0 0 91.6666666667%;max-width:91.6666666667%}.s-col.sm-12{flex:0 0 100%;max-width:100%}.s-col.offset-sm-0{margin-left:0}.s-col.offset-sm-1{margin-left:8.3333333333%}.s-col.offset-sm-2{margin-left:16.6666666667%}.s-col.offset-sm-3{margin-left:25%}.s-col.offset-sm-4{margin-left:33.3333333333%}.s-col.offset-sm-5{margin-left:41.6666666667%}.s-col.offset-sm-6{margin-left:50%}.s-col.offset-sm-7{margin-left:58.3333333333%}.s-col.offset-sm-8{margin-left:66.6666666667%}.s-col.offset-sm-9{margin-left:75%}.s-col.offset-sm-10{margin-left:83.3333333333%}.s-col.offset-sm-11{margin-left:91.6666666667%}}@media only screen and (min-width: 960px){.s-col.md-auto{flex:0 0 auto;width:auto;max-width:100%}.s-col.md-1{flex:0 0 8.3333333333%;max-width:8.3333333333%}.s-col.md-2{flex:0 0 16.6666666667%;max-width:16.6666666667%}.s-col.md-3{flex:0 0 25%;max-width:25%}.s-col.md-4{flex:0 0 33.3333333333%;max-width:33.3333333333%}.s-col.md-5{flex:0 0 41.6666666667%;max-width:41.6666666667%}.s-col.md-6{flex:0 0 50%;max-width:50%}.s-col.md-7{flex:0 0 58.3333333333%;max-width:58.3333333333%}.s-col.md-8{flex:0 0 66.6666666667%;max-width:66.6666666667%}.s-col.md-9{flex:0 0 75%;max-width:75%}.s-col.md-10{flex:0 0 83.3333333333%;max-width:83.3333333333%}.s-col.md-11{flex:0 0 91.6666666667%;max-width:91.6666666667%}.s-col.md-12{flex:0 0 100%;max-width:100%}.s-col.offset-md-0{margin-left:0}.s-col.offset-md-1{margin-left:8.3333333333%}.s-col.offset-md-2{margin-left:16.6666666667%}.s-col.offset-md-3{margin-left:25%}.s-col.offset-md-4{margin-left:33.3333333333%}.s-col.offset-md-5{margin-left:41.6666666667%}.s-col.offset-md-6{margin-left:50%}.s-col.offset-md-7{margin-left:58.3333333333%}.s-col.offset-md-8{margin-left:66.6666666667%}.s-col.offset-md-9{margin-left:75%}.s-col.offset-md-10{margin-left:83.3333333333%}.s-col.offset-md-11{margin-left:91.6666666667%}}@media only screen and (min-width: 1264px){.s-col.lg-auto{flex:0 0 auto;width:auto;max-width:100%}.s-col.lg-1{flex:0 0 8.3333333333%;max-width:8.3333333333%}.s-col.lg-2{flex:0 0 16.6666666667%;max-width:16.6666666667%}.s-col.lg-3{flex:0 0 25%;max-width:25%}.s-col.lg-4{flex:0 0 33.3333333333%;max-width:33.3333333333%}.s-col.lg-5{flex:0 0 41.6666666667%;max-width:41.6666666667%}.s-col.lg-6{flex:0 0 50%;max-width:50%}.s-col.lg-7{flex:0 0 58.3333333333%;max-width:58.3333333333%}.s-col.lg-8{flex:0 0 66.6666666667%;max-width:66.6666666667%}.s-col.lg-9{flex:0 0 75%;max-width:75%}.s-col.lg-10{flex:0 0 83.3333333333%;max-width:83.3333333333%}.s-col.lg-11{flex:0 0 91.6666666667%;max-width:91.6666666667%}.s-col.lg-12{flex:0 0 100%;max-width:100%}.s-col.offset-lg-0{margin-left:0}.s-col.offset-lg-1{margin-left:8.3333333333%}.s-col.offset-lg-2{margin-left:16.6666666667%}.s-col.offset-lg-3{margin-left:25%}.s-col.offset-lg-4{margin-left:33.3333333333%}.s-col.offset-lg-5{margin-left:41.6666666667%}.s-col.offset-lg-6{margin-left:50%}.s-col.offset-lg-7{margin-left:58.3333333333%}.s-col.offset-lg-8{margin-left:66.6666666667%}.s-col.offset-lg-9{margin-left:75%}.s-col.offset-lg-10{margin-left:83.3333333333%}.s-col.offset-lg-11{margin-left:91.6666666667%}}@media only screen and (min-width: 1904px){.s-col.xl-auto{flex:0 0 auto;width:auto;max-width:100%}.s-col.xl-1{flex:0 0 8.3333333333%;max-width:8.3333333333%}.s-col.xl-2{flex:0 0 16.6666666667%;max-width:16.6666666667%}.s-col.xl-3{flex:0 0 25%;max-width:25%}.s-col.xl-4{flex:0 0 33.3333333333%;max-width:33.3333333333%}.s-col.xl-5{flex:0 0 41.6666666667%;max-width:41.6666666667%}.s-col.xl-6{flex:0 0 50%;max-width:50%}.s-col.xl-7{flex:0 0 58.3333333333%;max-width:58.3333333333%}.s-col.xl-8{flex:0 0 66.6666666667%;max-width:66.6666666667%}.s-col.xl-9{flex:0 0 75%;max-width:75%}.s-col.xl-10{flex:0 0 83.3333333333%;max-width:83.3333333333%}.s-col.xl-11{flex:0 0 91.6666666667%;max-width:91.6666666667%}.s-col.xl-12{flex:0 0 100%;max-width:100%}.s-col.offset-xl-0{margin-left:0}.s-col.offset-xl-1{margin-left:8.3333333333%}.s-col.offset-xl-2{margin-left:16.6666666667%}.s-col.offset-xl-3{margin-left:25%}.s-col.offset-xl-4{margin-left:33.3333333333%}.s-col.offset-xl-5{margin-left:41.6666666667%}.s-col.offset-xl-6{margin-left:50%}.s-col.offset-xl-7{margin-left:58.3333333333%}.s-col.offset-xl-8{margin-left:66.6666666667%}.s-col.offset-xl-9{margin-left:75%}.s-col.offset-xl-10{margin-left:83.3333333333%}.s-col.offset-xl-11{margin-left:91.6666666667%}}";
    	append(document.head, style);
    }

    function create_fragment$5(ctx) {
    	let div;
    	let div_class_value;
    	let Class_action;
    	let current;
    	let mounted;
    	let dispose;
    	const default_slot_template = /*#slots*/ ctx[13].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[12], null);

    	return {
    		c() {
    			div = element("div");
    			if (default_slot) default_slot.c();
    			attr(div, "class", div_class_value = "s-col " + /*klass*/ ctx[0]);
    			attr(div, "style", /*style*/ ctx[11]);
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);

    			if (default_slot) {
    				default_slot.m(div, null);
    			}

    			current = true;

    			if (!mounted) {
    				dispose = action_destroyer(Class_action = Class.call(null, div, [
    					/*cols*/ ctx[1] && `col-${/*cols*/ ctx[1]}`,
    					/*sm*/ ctx[2] && `sm-${/*sm*/ ctx[2]}`,
    					/*md*/ ctx[3] && `md-${/*md*/ ctx[3]}`,
    					/*lg*/ ctx[4] && `lg-${/*lg*/ ctx[4]}`,
    					/*xl*/ ctx[5] && `xl-${/*xl*/ ctx[5]}`,
    					/*offset*/ ctx[6] && `offset-${/*offset*/ ctx[6]}`,
    					/*offset_sm*/ ctx[7] && `offset-sm-${/*offset_sm*/ ctx[7]}`,
    					/*offset_md*/ ctx[8] && `offset-md-${/*offset_md*/ ctx[8]}`,
    					/*offset_lg*/ ctx[9] && `offset-lg-${/*offset_lg*/ ctx[9]}`,
    					/*offset_xl*/ ctx[10] && `offset-xl-${/*offset_xl*/ ctx[10]}`
    				]));

    				mounted = true;
    			}
    		},
    		p(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && dirty & /*$$scope*/ 4096) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[12], dirty, null, null);
    				}
    			}

    			if (!current || dirty & /*klass*/ 1 && div_class_value !== (div_class_value = "s-col " + /*klass*/ ctx[0])) {
    				attr(div, "class", div_class_value);
    			}

    			if (!current || dirty & /*style*/ 2048) {
    				attr(div, "style", /*style*/ ctx[11]);
    			}

    			if (Class_action && is_function(Class_action.update) && dirty & /*cols, sm, md, lg, xl, offset, offset_sm, offset_md, offset_lg, offset_xl*/ 2046) Class_action.update.call(null, [
    				/*cols*/ ctx[1] && `col-${/*cols*/ ctx[1]}`,
    				/*sm*/ ctx[2] && `sm-${/*sm*/ ctx[2]}`,
    				/*md*/ ctx[3] && `md-${/*md*/ ctx[3]}`,
    				/*lg*/ ctx[4] && `lg-${/*lg*/ ctx[4]}`,
    				/*xl*/ ctx[5] && `xl-${/*xl*/ ctx[5]}`,
    				/*offset*/ ctx[6] && `offset-${/*offset*/ ctx[6]}`,
    				/*offset_sm*/ ctx[7] && `offset-sm-${/*offset_sm*/ ctx[7]}`,
    				/*offset_md*/ ctx[8] && `offset-md-${/*offset_md*/ ctx[8]}`,
    				/*offset_lg*/ ctx[9] && `offset-lg-${/*offset_lg*/ ctx[9]}`,
    				/*offset_xl*/ ctx[10] && `offset-xl-${/*offset_xl*/ ctx[10]}`
    			]);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    			if (default_slot) default_slot.d(detaching);
    			mounted = false;
    			dispose();
    		}
    	};
    }

    function instance$5($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	let { class: klass = "" } = $$props;
    	let { cols = false } = $$props;
    	let { sm = false } = $$props;
    	let { md = false } = $$props;
    	let { lg = false } = $$props;
    	let { xl = false } = $$props;
    	let { offset = false } = $$props;
    	let { offset_sm = false } = $$props;
    	let { offset_md = false } = $$props;
    	let { offset_lg = false } = $$props;
    	let { offset_xl = false } = $$props;
    	let { style = null } = $$props;

    	$$self.$$set = $$props => {
    		if ("class" in $$props) $$invalidate(0, klass = $$props.class);
    		if ("cols" in $$props) $$invalidate(1, cols = $$props.cols);
    		if ("sm" in $$props) $$invalidate(2, sm = $$props.sm);
    		if ("md" in $$props) $$invalidate(3, md = $$props.md);
    		if ("lg" in $$props) $$invalidate(4, lg = $$props.lg);
    		if ("xl" in $$props) $$invalidate(5, xl = $$props.xl);
    		if ("offset" in $$props) $$invalidate(6, offset = $$props.offset);
    		if ("offset_sm" in $$props) $$invalidate(7, offset_sm = $$props.offset_sm);
    		if ("offset_md" in $$props) $$invalidate(8, offset_md = $$props.offset_md);
    		if ("offset_lg" in $$props) $$invalidate(9, offset_lg = $$props.offset_lg);
    		if ("offset_xl" in $$props) $$invalidate(10, offset_xl = $$props.offset_xl);
    		if ("style" in $$props) $$invalidate(11, style = $$props.style);
    		if ("$$scope" in $$props) $$invalidate(12, $$scope = $$props.$$scope);
    	};

    	return [
    		klass,
    		cols,
    		sm,
    		md,
    		lg,
    		xl,
    		offset,
    		offset_sm,
    		offset_md,
    		offset_lg,
    		offset_xl,
    		style,
    		$$scope,
    		slots
    	];
    }

    class Col extends SvelteComponent {
    	constructor(options) {
    		super();
    		if (!document.getElementById("svelte-12xcddy-style")) add_css$2();

    		init(this, options, instance$5, create_fragment$5, safe_not_equal, {
    			class: 0,
    			cols: 1,
    			sm: 2,
    			md: 3,
    			lg: 4,
    			xl: 5,
    			offset: 6,
    			offset_sm: 7,
    			offset_md: 8,
    			offset_lg: 9,
    			offset_xl: 10,
    			style: 11
    		});
    	}
    }

    /* node_modules\svelte-materialify\src\components\Footer\Footer.svelte generated by Svelte v3.35.0 */

    function add_css$1() {
    	var style = element("style");
    	style.id = "svelte-1frdwoo-style";
    	style.textContent = ".s-footer{background-color:var(--theme-app-bar);align-items:center;display:flex;flex:0 1 auto !important;flex-wrap:wrap;padding:6px 16px;position:relative;transition-duration:0.2s;transition-property:background-color, left, right;transition-timing-function:cubic-bezier(0.4, 0, 0.2, 1);border-radius:0;box-shadow:0 0 0 0 rgba(0, 0, 0, 0.2), 0 0 0 0 rgba(0, 0, 0, 0.14), 0 0 0 0 rgba(0, 0, 0, 0.12)}.s-footer.absolute,.s-footer.fixed{z-index:3;bottom:0;left:0;right:0}.s-footer.absolute{position:absolute}.s-footer.absolute:not(.inset){width:100%}.s-footer.fixed{position:fixed}.s-footer.padless{padding:0}";
    	append(document.head, style);
    }

    function create_fragment$4(ctx) {
    	let footer;
    	let footer_class_value;
    	let current;
    	const default_slot_template = /*#slots*/ ctx[7].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[6], null);

    	return {
    		c() {
    			footer = element("footer");
    			if (default_slot) default_slot.c();
    			attr(footer, "class", footer_class_value = "s-footer " + /*klass*/ ctx[0]);
    			attr(footer, "style", /*style*/ ctx[5]);
    			toggle_class(footer, "absolute", /*absolute*/ ctx[1]);
    			toggle_class(footer, "fixed", /*fixed*/ ctx[2]);
    			toggle_class(footer, "inset", /*inset*/ ctx[3]);
    			toggle_class(footer, "padless", /*padless*/ ctx[4]);
    		},
    		m(target, anchor) {
    			insert(target, footer, anchor);

    			if (default_slot) {
    				default_slot.m(footer, null);
    			}

    			current = true;
    		},
    		p(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && dirty & /*$$scope*/ 64) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[6], dirty, null, null);
    				}
    			}

    			if (!current || dirty & /*klass*/ 1 && footer_class_value !== (footer_class_value = "s-footer " + /*klass*/ ctx[0])) {
    				attr(footer, "class", footer_class_value);
    			}

    			if (!current || dirty & /*style*/ 32) {
    				attr(footer, "style", /*style*/ ctx[5]);
    			}

    			if (dirty & /*klass, absolute*/ 3) {
    				toggle_class(footer, "absolute", /*absolute*/ ctx[1]);
    			}

    			if (dirty & /*klass, fixed*/ 5) {
    				toggle_class(footer, "fixed", /*fixed*/ ctx[2]);
    			}

    			if (dirty & /*klass, inset*/ 9) {
    				toggle_class(footer, "inset", /*inset*/ ctx[3]);
    			}

    			if (dirty & /*klass, padless*/ 17) {
    				toggle_class(footer, "padless", /*padless*/ ctx[4]);
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(footer);
    			if (default_slot) default_slot.d(detaching);
    		}
    	};
    }

    function instance$4($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	let { class: klass = "" } = $$props;
    	let { absolute = false } = $$props;
    	let { fixed = false } = $$props;
    	let { inset = false } = $$props;
    	let { padless = false } = $$props;
    	let { style = null } = $$props;

    	$$self.$$set = $$props => {
    		if ("class" in $$props) $$invalidate(0, klass = $$props.class);
    		if ("absolute" in $$props) $$invalidate(1, absolute = $$props.absolute);
    		if ("fixed" in $$props) $$invalidate(2, fixed = $$props.fixed);
    		if ("inset" in $$props) $$invalidate(3, inset = $$props.inset);
    		if ("padless" in $$props) $$invalidate(4, padless = $$props.padless);
    		if ("style" in $$props) $$invalidate(5, style = $$props.style);
    		if ("$$scope" in $$props) $$invalidate(6, $$scope = $$props.$$scope);
    	};

    	return [klass, absolute, fixed, inset, padless, style, $$scope, slots];
    }

    class Footer extends SvelteComponent {
    	constructor(options) {
    		super();
    		if (!document.getElementById("svelte-1frdwoo-style")) add_css$1();

    		init(this, options, instance$4, create_fragment$4, safe_not_equal, {
    			class: 0,
    			absolute: 1,
    			fixed: 2,
    			inset: 3,
    			padless: 4,
    			style: 5
    		});
    	}
    }

    /* src\Dialog.svelte generated by Svelte v3.35.0 */

    function fallback_block$2(ctx) {
    	let t;

    	return {
    		c() {
    			t = text("Lorem ipsum dolor sit amet consectetur adipisicing elit. Autem aperiam quia\r\n    esse impedit libero mollitia tempore nisi dolore ut, quasi incidunt sunt\r\n    sapiente vero iusto necessitatibus eius nulla dignissimos laboriosam.");
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (7:0) <Dialog    class="pa-4 ma-16"    max-width="552"    style="overflow-x: hidden"    bind:active  >
    function create_default_slot$3(ctx) {
    	let current;
    	const default_slot_template = /*#slots*/ ctx[1].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[3], null);
    	const default_slot_or_fallback = default_slot || fallback_block$2();

    	return {
    		c() {
    			if (default_slot_or_fallback) default_slot_or_fallback.c();
    		},
    		m(target, anchor) {
    			if (default_slot_or_fallback) {
    				default_slot_or_fallback.m(target, anchor);
    			}

    			current = true;
    		},
    		p(ctx, dirty) {
    			if (default_slot) {
    				if (default_slot.p && dirty & /*$$scope*/ 8) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[3], dirty, null, null);
    				}
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(default_slot_or_fallback, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(default_slot_or_fallback, local);
    			current = false;
    		},
    		d(detaching) {
    			if (default_slot_or_fallback) default_slot_or_fallback.d(detaching);
    		}
    	};
    }

    function create_fragment$3(ctx) {
    	let dialog;
    	let updating_active;
    	let current;

    	function dialog_active_binding(value) {
    		/*dialog_active_binding*/ ctx[2](value);
    	}

    	let dialog_props = {
    		class: "pa-4 ma-16",
    		"max-width": "552",
    		style: "overflow-x: hidden",
    		$$slots: { default: [create_default_slot$3] },
    		$$scope: { ctx }
    	};

    	if (/*active*/ ctx[0] !== void 0) {
    		dialog_props.active = /*active*/ ctx[0];
    	}

    	dialog = new Dialog({ props: dialog_props });
    	binding_callbacks.push(() => bind(dialog, "active", dialog_active_binding));

    	return {
    		c() {
    			create_component(dialog.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(dialog, target, anchor);
    			current = true;
    		},
    		p(ctx, [dirty]) {
    			const dialog_changes = {};

    			if (dirty & /*$$scope*/ 8) {
    				dialog_changes.$$scope = { dirty, ctx };
    			}

    			if (!updating_active && dirty & /*active*/ 1) {
    				updating_active = true;
    				dialog_changes.active = /*active*/ ctx[0];
    				add_flush_callback(() => updating_active = false);
    			}

    			dialog.$set(dialog_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(dialog.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(dialog.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(dialog, detaching);
    		}
    	};
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	let { active = false } = $$props;

    	function dialog_active_binding(value) {
    		active = value;
    		$$invalidate(0, active);
    	}

    	$$self.$$set = $$props => {
    		if ("active" in $$props) $$invalidate(0, active = $$props.active);
    		if ("$$scope" in $$props) $$invalidate(3, $$scope = $$props.$$scope);
    	};

    	return [active, slots, dialog_active_binding, $$scope];
    }

    class Dialog_1 extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, { active: 0 });
    	}
    }

    /* src\CreateData.svelte generated by Svelte v3.35.0 */

    function get_each_context$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[16] = list[i];
    	child_ctx[18] = i;
    	return child_ctx;
    }

    // (73:3) <Select      bind:value={key}      outlined      items={keys}      on:change={() => {       console.log({ key });       key = key;      }}>
    function create_default_slot_11$1(ctx) {
    	let t;

    	return {
    		c() {
    			t = text("Select...");
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (82:3) <TextField bind:value placeholder="Value" outlined>
    function create_default_slot_10$1(ctx) {
    	let t;

    	return {
    		c() {
    			t = text("Value");
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (72:2) <Col>
    function create_default_slot_9$1(ctx) {
    	let select;
    	let updating_value;
    	let t;
    	let textfield;
    	let updating_value_1;
    	let current;

    	function select_value_binding(value) {
    		/*select_value_binding*/ ctx[10](value);
    	}

    	let select_props = {
    		outlined: true,
    		items: /*keys*/ ctx[5],
    		$$slots: { default: [create_default_slot_11$1] },
    		$$scope: { ctx }
    	};

    	if (/*key*/ ctx[1] !== void 0) {
    		select_props.value = /*key*/ ctx[1];
    	}

    	select = new Select({ props: select_props });
    	binding_callbacks.push(() => bind(select, "value", select_value_binding));
    	select.$on("change", /*change_handler*/ ctx[11]);

    	function textfield_value_binding(value) {
    		/*textfield_value_binding*/ ctx[12](value);
    	}

    	let textfield_props = {
    		placeholder: "Value",
    		outlined: true,
    		$$slots: { default: [create_default_slot_10$1] },
    		$$scope: { ctx }
    	};

    	if (/*value*/ ctx[3] !== void 0) {
    		textfield_props.value = /*value*/ ctx[3];
    	}

    	textfield = new TextField({ props: textfield_props });
    	binding_callbacks.push(() => bind(textfield, "value", textfield_value_binding));

    	return {
    		c() {
    			create_component(select.$$.fragment);
    			t = space();
    			create_component(textfield.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(select, target, anchor);
    			insert(target, t, anchor);
    			mount_component(textfield, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const select_changes = {};

    			if (dirty & /*$$scope*/ 524288) {
    				select_changes.$$scope = { dirty, ctx };
    			}

    			if (!updating_value && dirty & /*key*/ 2) {
    				updating_value = true;
    				select_changes.value = /*key*/ ctx[1];
    				add_flush_callback(() => updating_value = false);
    			}

    			select.$set(select_changes);
    			const textfield_changes = {};

    			if (dirty & /*$$scope*/ 524288) {
    				textfield_changes.$$scope = { dirty, ctx };
    			}

    			if (!updating_value_1 && dirty & /*value*/ 8) {
    				updating_value_1 = true;
    				textfield_changes.value = /*value*/ ctx[3];
    				add_flush_callback(() => updating_value_1 = false);
    			}

    			textfield.$set(textfield_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(select.$$.fragment, local);
    			transition_in(textfield.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(select.$$.fragment, local);
    			transition_out(textfield.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(select, detaching);
    			if (detaching) detach(t);
    			destroy_component(textfield, detaching);
    		}
    	};
    }

    // (85:3) <Button on:click={create} disabled={!key || !value}>
    function create_default_slot_8$1(ctx) {
    	let t;

    	return {
    		c() {
    			t = text("create");
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (86:3) <Button on:click={update} disabled={!key || !value || !selected}      >
    function create_default_slot_7$1(ctx) {
    	let t;

    	return {
    		c() {
    			t = text("update");
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (89:3) <Button on:click={remove} disabled={!selected}>
    function create_default_slot_6$1(ctx) {
    	let t;

    	return {
    		c() {
    			t = text("delete");
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (84:2) <Col class="flex-sm-column">
    function create_default_slot_5$1(ctx) {
    	let button0;
    	let t0;
    	let button1;
    	let t1;
    	let button2;
    	let current;

    	button0 = new Button({
    			props: {
    				disabled: !/*key*/ ctx[1] || !/*value*/ ctx[3],
    				$$slots: { default: [create_default_slot_8$1] },
    				$$scope: { ctx }
    			}
    		});

    	button0.$on("click", /*create*/ ctx[6]);

    	button1 = new Button({
    			props: {
    				disabled: !/*key*/ ctx[1] || !/*value*/ ctx[3] || !/*selected*/ ctx[2],
    				$$slots: { default: [create_default_slot_7$1] },
    				$$scope: { ctx }
    			}
    		});

    	button1.$on("click", /*update*/ ctx[7]);

    	button2 = new Button({
    			props: {
    				disabled: !/*selected*/ ctx[2],
    				$$slots: { default: [create_default_slot_6$1] },
    				$$scope: { ctx }
    			}
    		});

    	button2.$on("click", /*remove*/ ctx[8]);

    	return {
    		c() {
    			create_component(button0.$$.fragment);
    			t0 = space();
    			create_component(button1.$$.fragment);
    			t1 = space();
    			create_component(button2.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(button0, target, anchor);
    			insert(target, t0, anchor);
    			mount_component(button1, target, anchor);
    			insert(target, t1, anchor);
    			mount_component(button2, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const button0_changes = {};
    			if (dirty & /*key, value*/ 10) button0_changes.disabled = !/*key*/ ctx[1] || !/*value*/ ctx[3];

    			if (dirty & /*$$scope*/ 524288) {
    				button0_changes.$$scope = { dirty, ctx };
    			}

    			button0.$set(button0_changes);
    			const button1_changes = {};
    			if (dirty & /*key, value, selected*/ 14) button1_changes.disabled = !/*key*/ ctx[1] || !/*value*/ ctx[3] || !/*selected*/ ctx[2];

    			if (dirty & /*$$scope*/ 524288) {
    				button1_changes.$$scope = { dirty, ctx };
    			}

    			button1.$set(button1_changes);
    			const button2_changes = {};
    			if (dirty & /*selected*/ 4) button2_changes.disabled = !/*selected*/ ctx[2];

    			if (dirty & /*$$scope*/ 524288) {
    				button2_changes.$$scope = { dirty, ctx };
    			}

    			button2.$set(button2_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(button0.$$.fragment, local);
    			transition_in(button1.$$.fragment, local);
    			transition_in(button2.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(button0.$$.fragment, local);
    			transition_out(button1.$$.fragment, local);
    			transition_out(button2.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(button0, detaching);
    			if (detaching) detach(t0);
    			destroy_component(button1, detaching);
    			if (detaching) detach(t1);
    			destroy_component(button2, detaching);
    		}
    	};
    }

    // (71:1) <Row>
    function create_default_slot_4$1(ctx) {
    	let col0;
    	let t;
    	let col1;
    	let current;

    	col0 = new Col({
    			props: {
    				$$slots: { default: [create_default_slot_9$1] },
    				$$scope: { ctx }
    			}
    		});

    	col1 = new Col({
    			props: {
    				class: "flex-sm-column",
    				$$slots: { default: [create_default_slot_5$1] },
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			create_component(col0.$$.fragment);
    			t = space();
    			create_component(col1.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(col0, target, anchor);
    			insert(target, t, anchor);
    			mount_component(col1, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const col0_changes = {};

    			if (dirty & /*$$scope, value, key*/ 524298) {
    				col0_changes.$$scope = { dirty, ctx };
    			}

    			col0.$set(col0_changes);
    			const col1_changes = {};

    			if (dirty & /*$$scope, selected, key, value*/ 524302) {
    				col1_changes.$$scope = { dirty, ctx };
    			}

    			col1.$set(col1_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(col0.$$.fragment, local);
    			transition_in(col1.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(col0.$$.fragment, local);
    			transition_out(col1.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(col0, detaching);
    			if (detaching) detach(t);
    			destroy_component(col1, detaching);
    		}
    	};
    }

    // (70:0) <Container>
    function create_default_slot_3$1(ctx) {
    	let row;
    	let current;

    	row = new Row({
    			props: {
    				$$slots: { default: [create_default_slot_4$1] },
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			create_component(row.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(row, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const row_changes = {};

    			if (dirty & /*$$scope, selected, key, value*/ 524302) {
    				row_changes.$$scope = { dirty, ctx };
    			}

    			row.$set(row_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(row.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(row.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(row, detaching);
    		}
    	};
    }

    // (93:0) <TextField placeholder="Starts with" outlined bind:value={prefix}   >
    function create_default_slot_2$1(ctx) {
    	let t;

    	return {
    		c() {
    			t = text("Search");
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (100:2) <ListItem     >
    function create_default_slot_1$1(ctx) {
    	let t_value = /*entry*/ ctx[16].key + "";
    	let t;

    	return {
    		c() {
    			t = text(t_value);
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*filteredPeople*/ 16 && t_value !== (t_value = /*entry*/ ctx[16].key + "")) set_data(t, t_value);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (101:15) 
    function create_subtitle_slot$1(ctx) {
    	let span;
    	let t_value = /*entry*/ ctx[16].value + "";
    	let t;

    	return {
    		c() {
    			span = element("span");
    			t = text(t_value);
    			attr(span, "slot", "subtitle");
    		},
    		m(target, anchor) {
    			insert(target, span, anchor);
    			append(span, t);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*filteredPeople*/ 16 && t_value !== (t_value = /*entry*/ ctx[16].value + "")) set_data(t, t_value);
    		},
    		d(detaching) {
    			if (detaching) detach(span);
    		}
    	};
    }

    // (99:1) {#each filteredPeople as entry, i}
    function create_each_block$1(ctx) {
    	let listitem;
    	let current;

    	listitem = new ListItem({
    			props: {
    				$$slots: {
    					subtitle: [create_subtitle_slot$1],
    					default: [create_default_slot_1$1]
    				},
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			create_component(listitem.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(listitem, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const listitem_changes = {};

    			if (dirty & /*$$scope, filteredPeople*/ 524304) {
    				listitem_changes.$$scope = { dirty, ctx };
    			}

    			listitem.$set(listitem_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(listitem.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(listitem.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(listitem, detaching);
    		}
    	};
    }

    // (98:0) <List>
    function create_default_slot$2(ctx) {
    	let each_1_anchor;
    	let current;
    	let each_value = /*filteredPeople*/ ctx[4];
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$1(get_each_context$1(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	return {
    		c() {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    		},
    		m(target, anchor) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert(target, each_1_anchor, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			if (dirty & /*filteredPeople*/ 16) {
    				each_value = /*filteredPeople*/ ctx[4];
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$1(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block$1(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				group_outros();

    				for (i = each_value.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}
    		},
    		i(local) {
    			if (current) return;

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o(local) {
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d(detaching) {
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach(each_1_anchor);
    		}
    	};
    }

    function create_fragment$2(ctx) {
    	let container;
    	let t0;
    	let textfield;
    	let updating_value;
    	let t1;
    	let list;
    	let current;

    	container = new Container({
    			props: {
    				$$slots: { default: [create_default_slot_3$1] },
    				$$scope: { ctx }
    			}
    		});

    	function textfield_value_binding_1(value) {
    		/*textfield_value_binding_1*/ ctx[13](value);
    	}

    	let textfield_props = {
    		placeholder: "Starts with",
    		outlined: true,
    		$$slots: { default: [create_default_slot_2$1] },
    		$$scope: { ctx }
    	};

    	if (/*prefix*/ ctx[0] !== void 0) {
    		textfield_props.value = /*prefix*/ ctx[0];
    	}

    	textfield = new TextField({ props: textfield_props });
    	binding_callbacks.push(() => bind(textfield, "value", textfield_value_binding_1));

    	list = new List({
    			props: {
    				$$slots: { default: [create_default_slot$2] },
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			create_component(container.$$.fragment);
    			t0 = space();
    			create_component(textfield.$$.fragment);
    			t1 = space();
    			create_component(list.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(container, target, anchor);
    			insert(target, t0, anchor);
    			mount_component(textfield, target, anchor);
    			insert(target, t1, anchor);
    			mount_component(list, target, anchor);
    			current = true;
    		},
    		p(ctx, [dirty]) {
    			const container_changes = {};

    			if (dirty & /*$$scope, selected, key, value*/ 524302) {
    				container_changes.$$scope = { dirty, ctx };
    			}

    			container.$set(container_changes);
    			const textfield_changes = {};

    			if (dirty & /*$$scope*/ 524288) {
    				textfield_changes.$$scope = { dirty, ctx };
    			}

    			if (!updating_value && dirty & /*prefix*/ 1) {
    				updating_value = true;
    				textfield_changes.value = /*prefix*/ ctx[0];
    				add_flush_callback(() => updating_value = false);
    			}

    			textfield.$set(textfield_changes);
    			const list_changes = {};

    			if (dirty & /*$$scope, filteredPeople*/ 524304) {
    				list_changes.$$scope = { dirty, ctx };
    			}

    			list.$set(list_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(container.$$.fragment, local);
    			transition_in(textfield.$$.fragment, local);
    			transition_in(list.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(container.$$.fragment, local);
    			transition_out(textfield.$$.fragment, local);
    			transition_out(list.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(container, detaching);
    			if (detaching) detach(t0);
    			destroy_component(textfield, detaching);
    			if (detaching) detach(t1);
    			destroy_component(list, detaching);
    		}
    	};
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let filteredPeople;

    	const keys = [
    		{ name: "Phone", value: "Phone" },
    		{ name: "Address", value: "Address" },
    		{ name: "email", value: "email" }
    	];

    	let entries = [
    		{ key: "Phone", value: "555-123-4567" },
    		{ key: "email", value: "email@email.com" }
    	];

    	let prefix = "";
    	let key = "";
    	let value = "";
    	let selected = "";

    	function getValue(key) {
    		$$invalidate(2, selected = entries.find(entry => entry.key === key));
    		return selected;
    	}

    	function create() {
    		$$invalidate(9, entries = entries.concat({ key, value }));
    		$$invalidate(1, key = $$invalidate(3, value = ""));
    	}

    	function update() {
    		$$invalidate(2, selected.key = key, selected);
    		$$invalidate(2, selected.value = value, selected);
    		$$invalidate(9, entries);
    	}

    	function remove() {
    		// Remove selected entry from the source array (entries), not the filtered array
    		const index = entries.indexOf(selected);

    		$$invalidate(9, entries = [...entries.slice(0, index), ...entries.slice(index + 1)]);
    		$$invalidate(1, key = $$invalidate(3, value = ""));
    	}

    	function reset_inputs(entry) {
    		$$invalidate(1, key = entry ? entry.key : "");
    		$$invalidate(3, value = entry ? entry.value : "");
    		console.log("setting value to ", value);
    	}

    	function select_value_binding(value) {
    		key = value;
    		$$invalidate(1, key);
    	}

    	const change_handler = () => {
    		console.log({ key });
    		$$invalidate(1, key);
    	};

    	function textfield_value_binding(value$1) {
    		value = value$1;
    		($$invalidate(3, value), $$invalidate(1, key));
    	}

    	function textfield_value_binding_1(value) {
    		prefix = value;
    		$$invalidate(0, prefix);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*prefix, entries*/ 513) {
    			$$invalidate(4, filteredPeople = prefix
    			? entries.filter(entry => {
    					const name = `${entry.key}: ${entry.value}`;
    					return name.toLowerCase().startsWith(prefix.toLowerCase());
    				})
    			: entries);
    		}

    		if ($$self.$$.dirty & /*key*/ 2) {
    			$$invalidate(3, value = key && getValue(key) ? getValue(key).value : "");
    		}

    		if ($$self.$$.dirty & /*selected*/ 4) {
    			reset_inputs(selected);
    		}
    	};

    	return [
    		prefix,
    		key,
    		selected,
    		value,
    		filteredPeople,
    		keys,
    		create,
    		update,
    		remove,
    		entries,
    		select_value_binding,
    		change_handler,
    		textfield_value_binding,
    		textfield_value_binding_1
    	];
    }

    class CreateData extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {});
    	}
    }

    // Material Design Icons v5.9.55
    var mdiAccountMultiplePlus = "M19 17V19H7V17S7 13 13 13 19 17 19 17M16 8A3 3 0 1 0 13 11A3 3 0 0 0 16 8M19.2 13.06A5.6 5.6 0 0 1 21 17V19H24V17S24 13.55 19.2 13.06M18 5A2.91 2.91 0 0 0 17.11 5.14A5 5 0 0 1 17.11 10.86A2.91 2.91 0 0 0 18 11A3 3 0 0 0 18 5M8 10H5V7H3V10H0V12H3V15H5V12H8Z";
    var mdiCardAccountDetailsOutline = "M22,3H2C0.91,3.04 0.04,3.91 0,5V19C0.04,20.09 0.91,20.96 2,21H22C23.09,20.96 23.96,20.09 24,19V5C23.96,3.91 23.09,3.04 22,3M22,19H2V5H22V19M14,17V15.75C14,14.09 10.66,13.25 9,13.25C7.34,13.25 4,14.09 4,15.75V17H14M9,7A2.5,2.5 0 0,0 6.5,9.5A2.5,2.5 0 0,0 9,12A2.5,2.5 0 0,0 11.5,9.5A2.5,2.5 0 0,0 9,7M14,7V8H20V7H14M14,9V10H20V9H14M14,11V12H18V11H14";
    var mdiDotsVertical = "M12,16A2,2 0 0,1 14,18A2,2 0 0,1 12,20A2,2 0 0,1 10,18A2,2 0 0,1 12,16M12,10A2,2 0 0,1 14,12A2,2 0 0,1 12,14A2,2 0 0,1 10,12A2,2 0 0,1 12,10M12,4A2,2 0 0,1 14,6A2,2 0 0,1 12,8A2,2 0 0,1 10,6A2,2 0 0,1 12,4Z";
    var mdiHome = "M10,20V14H14V20H19V12H22L12,3L2,12H5V20H10Z";
    var mdiLayersTripleOutline = "M12 16.54L19.37 10.8L21 12.07L12 19.07L3 12.07L4.62 10.81L12 16.54M12 14L3 7L12 0L21 7L12 14M12 2.53L6.26 7L12 11.47L17.74 7L12 2.53M12 21.47L19.37 15.73L21 17L12 24L3 17L4.62 15.74L12 21.47";
    var mdiMagnify = "M9.5,3A6.5,6.5 0 0,1 16,9.5C16,11.11 15.41,12.59 14.44,13.73L14.71,14H15.5L20.5,19L19,20.5L14,15.5V14.71L13.73,14.44C12.59,15.41 11.11,16 9.5,16A6.5,6.5 0 0,1 3,9.5A6.5,6.5 0 0,1 9.5,3M9.5,5C7,5 5,7 5,9.5C5,12 7,14 9.5,14C12,14 14,12 14,9.5C14,7 12,5 9.5,5Z";
    var mdiMenu = "M3,6H21V8H3V6M3,11H21V13H3V11M3,16H21V18H3V16Z";
    var mdiTextBoxPlusOutline = "M17,14H19V17H22V19H19V22H17V19H14V17H17V14M5,3H19C20.11,3 21,3.89 21,5V12.8C20.39,12.45 19.72,12.2 19,12.08V5H5V19H12.08C12.2,19.72 12.45,20.39 12.8,21H5C3.89,21 3,20.11 3,19V5C3,3.89 3.89,3 5,3M7,7H17V9H7V7M7,11H17V12.08C16.15,12.22 15.37,12.54 14.68,13H7V11M7,15H12V17H7V15Z";

    /* src\Main.svelte generated by Svelte v3.35.0 */

    function add_css() {
    	var style = element("style");
    	style.id = "svelte-cuvd8d-style";
    	style.textContent = ".container.svelte-cuvd8d{padding:80px 16px 12px 16px;overflow-y:hidden;height:100vh}";
    	append(document.head, style);
    }

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[10] = list[i];
    	return child_ctx;
    }

    // (68:8) <ListItem>
    function create_default_slot_34(ctx) {
    	let t;

    	return {
    		c() {
    			t = text("Home");
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (70:10) 
    function create_prepend_slot_4(ctx) {
    	let span;
    	let icon;
    	let current;
    	icon = new Icon({ props: { path: mdiHome } });

    	return {
    		c() {
    			span = element("span");
    			create_component(icon.$$.fragment);
    			attr(span, "slot", "prepend");
    		},
    		m(target, anchor) {
    			insert(target, span, anchor);
    			mount_component(icon, span, null);
    			current = true;
    		},
    		p: noop,
    		i(local) {
    			if (current) return;
    			transition_in(icon.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(icon.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(span);
    			destroy_component(icon);
    		}
    	};
    }

    // (67:6) <List>
    function create_default_slot_33(ctx) {
    	let listitem;
    	let current;

    	listitem = new ListItem({
    			props: {
    				$$slots: {
    					prepend: [create_prepend_slot_4],
    					default: [create_default_slot_34]
    				},
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			create_component(listitem.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(listitem, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const listitem_changes = {};

    			if (dirty & /*$$scope*/ 256) {
    				listitem_changes.$$scope = { dirty, ctx };
    			}

    			listitem.$set(listitem_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(listitem.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(listitem.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(listitem, detaching);
    		}
    	};
    }

    // (61:4) <Menu hover>
    function create_default_slot_32(ctx) {
    	let list;
    	let current;

    	list = new List({
    			props: {
    				$$slots: { default: [create_default_slot_33] },
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			create_component(list.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(list, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const list_changes = {};

    			if (dirty & /*$$scope*/ 256) {
    				list_changes.$$scope = { dirty, ctx };
    			}

    			list.$set(list_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(list.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(list.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(list, detaching);
    		}
    	};
    }

    // (63:8) <Button depressed>
    function create_default_slot_31(ctx) {
    	let icon;
    	let current;
    	icon = new Icon({ props: { path: mdiMenu } });

    	return {
    		c() {
    			create_component(icon.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(icon, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i(local) {
    			if (current) return;
    			transition_in(icon.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(icon.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(icon, detaching);
    		}
    	};
    }

    // (62:6) 
    function create_activator_slot_4(ctx) {
    	let div;
    	let button;
    	let current;

    	button = new Button({
    			props: {
    				depressed: true,
    				$$slots: { default: [create_default_slot_31] },
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			div = element("div");
    			create_component(button.$$.fragment);
    			attr(div, "slot", "activator");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			mount_component(button, div, null);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const button_changes = {};

    			if (dirty & /*$$scope*/ 256) {
    				button_changes.$$scope = { dirty, ctx };
    			}

    			button.$set(button_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(button.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(button.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    			destroy_component(button);
    		}
    	};
    }

    // (77:6) <TextField dense rounded outlined>
    function create_default_slot_30(ctx) {
    	let t;

    	return {
    		c() {
    			t = text("Search");
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (79:8) 
    function create_append_slot(ctx) {
    	let div;
    	let icon;
    	let current;
    	icon = new Icon({ props: { path: mdiMagnify } });

    	return {
    		c() {
    			div = element("div");
    			create_component(icon.$$.fragment);
    			attr(div, "slot", "append");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			mount_component(icon, div, null);
    			current = true;
    		},
    		p: noop,
    		i(local) {
    			if (current) return;
    			transition_in(icon.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(icon.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    			destroy_component(icon);
    		}
    	};
    }

    // (91:6) <ListItem>
    function create_default_slot_29(ctx) {
    	let t;

    	return {
    		c() {
    			t = text("Profile");
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (92:6) <ListItem>
    function create_default_slot_28(ctx) {
    	let t;

    	return {
    		c() {
    			t = text("Keys");
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (93:6) <ListItem>
    function create_default_slot_27(ctx) {
    	let t;

    	return {
    		c() {
    			t = text("Logout");
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (85:4) <Menu hover>
    function create_default_slot_26(ctx) {
    	let listitem0;
    	let t0;
    	let listitem1;
    	let t1;
    	let listitem2;
    	let current;

    	listitem0 = new ListItem({
    			props: {
    				$$slots: { default: [create_default_slot_29] },
    				$$scope: { ctx }
    			}
    		});

    	listitem1 = new ListItem({
    			props: {
    				$$slots: { default: [create_default_slot_28] },
    				$$scope: { ctx }
    			}
    		});

    	listitem2 = new ListItem({
    			props: {
    				$$slots: { default: [create_default_slot_27] },
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			create_component(listitem0.$$.fragment);
    			t0 = space();
    			create_component(listitem1.$$.fragment);
    			t1 = space();
    			create_component(listitem2.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(listitem0, target, anchor);
    			insert(target, t0, anchor);
    			mount_component(listitem1, target, anchor);
    			insert(target, t1, anchor);
    			mount_component(listitem2, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const listitem0_changes = {};

    			if (dirty & /*$$scope*/ 256) {
    				listitem0_changes.$$scope = { dirty, ctx };
    			}

    			listitem0.$set(listitem0_changes);
    			const listitem1_changes = {};

    			if (dirty & /*$$scope*/ 256) {
    				listitem1_changes.$$scope = { dirty, ctx };
    			}

    			listitem1.$set(listitem1_changes);
    			const listitem2_changes = {};

    			if (dirty & /*$$scope*/ 256) {
    				listitem2_changes.$$scope = { dirty, ctx };
    			}

    			listitem2.$set(listitem2_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(listitem0.$$.fragment, local);
    			transition_in(listitem1.$$.fragment, local);
    			transition_in(listitem2.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(listitem0.$$.fragment, local);
    			transition_out(listitem1.$$.fragment, local);
    			transition_out(listitem2.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(listitem0, detaching);
    			if (detaching) detach(t0);
    			destroy_component(listitem1, detaching);
    			if (detaching) detach(t1);
    			destroy_component(listitem2, detaching);
    		}
    	};
    }

    // (87:8) <Button depressed>
    function create_default_slot_25(ctx) {
    	let icon;
    	let current;

    	icon = new Icon({
    			props: { path: mdiCardAccountDetailsOutline }
    		});

    	return {
    		c() {
    			create_component(icon.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(icon, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i(local) {
    			if (current) return;
    			transition_in(icon.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(icon.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(icon, detaching);
    		}
    	};
    }

    // (86:6) 
    function create_activator_slot_3(ctx) {
    	let div;
    	let button;
    	let current;

    	button = new Button({
    			props: {
    				depressed: true,
    				$$slots: { default: [create_default_slot_25] },
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			div = element("div");
    			create_component(button.$$.fragment);
    			attr(div, "slot", "activator");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			mount_component(button, div, null);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const button_changes = {};

    			if (dirty & /*$$scope*/ 256) {
    				button_changes.$$scope = { dirty, ctx };
    			}

    			button.$set(button_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(button.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(button.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    			destroy_component(button);
    		}
    	};
    }

    // (102:8) <ListItem>
    function create_default_slot_24(ctx) {
    	let t;

    	return {
    		c() {
    			t = text("Settings");
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (103:8) <ListItem>
    function create_default_slot_23(ctx) {
    	let t;

    	return {
    		c() {
    			t = text("Privacy");
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (101:6) <List>
    function create_default_slot_22(ctx) {
    	let listitem0;
    	let t;
    	let listitem1;
    	let current;

    	listitem0 = new ListItem({
    			props: {
    				$$slots: { default: [create_default_slot_24] },
    				$$scope: { ctx }
    			}
    		});

    	listitem1 = new ListItem({
    			props: {
    				$$slots: { default: [create_default_slot_23] },
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			create_component(listitem0.$$.fragment);
    			t = space();
    			create_component(listitem1.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(listitem0, target, anchor);
    			insert(target, t, anchor);
    			mount_component(listitem1, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const listitem0_changes = {};

    			if (dirty & /*$$scope*/ 256) {
    				listitem0_changes.$$scope = { dirty, ctx };
    			}

    			listitem0.$set(listitem0_changes);
    			const listitem1_changes = {};

    			if (dirty & /*$$scope*/ 256) {
    				listitem1_changes.$$scope = { dirty, ctx };
    			}

    			listitem1.$set(listitem1_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(listitem0.$$.fragment, local);
    			transition_in(listitem1.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(listitem0.$$.fragment, local);
    			transition_out(listitem1.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(listitem0, detaching);
    			if (detaching) detach(t);
    			destroy_component(listitem1, detaching);
    		}
    	};
    }

    // (95:4) <Menu right hover>
    function create_default_slot_21(ctx) {
    	let list;
    	let current;

    	list = new List({
    			props: {
    				$$slots: { default: [create_default_slot_22] },
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			create_component(list.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(list, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const list_changes = {};

    			if (dirty & /*$$scope*/ 256) {
    				list_changes.$$scope = { dirty, ctx };
    			}

    			list.$set(list_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(list.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(list.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(list, detaching);
    		}
    	};
    }

    // (97:8) <Button depressed>
    function create_default_slot_20(ctx) {
    	let icon;
    	let current;
    	icon = new Icon({ props: { path: mdiDotsVertical } });

    	return {
    		c() {
    			create_component(icon.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(icon, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i(local) {
    			if (current) return;
    			transition_in(icon.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(icon.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(icon, detaching);
    		}
    	};
    }

    // (96:6) 
    function create_activator_slot_2(ctx) {
    	let div;
    	let button;
    	let current;

    	button = new Button({
    			props: {
    				depressed: true,
    				$$slots: { default: [create_default_slot_20] },
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			div = element("div");
    			create_component(button.$$.fragment);
    			attr(div, "slot", "activator");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			mount_component(button, div, null);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const button_changes = {};

    			if (dirty & /*$$scope*/ 256) {
    				button_changes.$$scope = { dirty, ctx };
    			}

    			button.$set(button_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(button.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(button.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    			destroy_component(button);
    		}
    	};
    }

    // (57:2) <AppBar      fixed      style="margin-right:0px; width: 100%; width: -webkit-fill-available;width: -webkit-fill-available; width: fill-available;"    >
    function create_default_slot_19(ctx) {
    	let menu0;
    	let t0;
    	let div0;
    	let textfield;
    	let t1;
    	let div1;
    	let t2;
    	let menu1;
    	let t3;
    	let menu2;
    	let current;

    	menu0 = new Menu({
    			props: {
    				hover: true,
    				$$slots: {
    					activator: [create_activator_slot_4],
    					default: [create_default_slot_32]
    				},
    				$$scope: { ctx }
    			}
    		});

    	textfield = new TextField({
    			props: {
    				dense: true,
    				rounded: true,
    				outlined: true,
    				$$slots: {
    					append: [create_append_slot],
    					default: [create_default_slot_30]
    				},
    				$$scope: { ctx }
    			}
    		});

    	menu1 = new Menu({
    			props: {
    				hover: true,
    				$$slots: {
    					activator: [create_activator_slot_3],
    					default: [create_default_slot_26]
    				},
    				$$scope: { ctx }
    			}
    		});

    	menu2 = new Menu({
    			props: {
    				right: true,
    				hover: true,
    				$$slots: {
    					activator: [create_activator_slot_2],
    					default: [create_default_slot_21]
    				},
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			create_component(menu0.$$.fragment);
    			t0 = space();
    			div0 = element("div");
    			create_component(textfield.$$.fragment);
    			t1 = space();
    			div1 = element("div");
    			t2 = space();
    			create_component(menu1.$$.fragment);
    			t3 = space();
    			create_component(menu2.$$.fragment);
    			set_style(div0, "flex-grow", "1");
    			set_style(div1, "flex-grow", "0");
    		},
    		m(target, anchor) {
    			mount_component(menu0, target, anchor);
    			insert(target, t0, anchor);
    			insert(target, div0, anchor);
    			mount_component(textfield, div0, null);
    			insert(target, t1, anchor);
    			insert(target, div1, anchor);
    			insert(target, t2, anchor);
    			mount_component(menu1, target, anchor);
    			insert(target, t3, anchor);
    			mount_component(menu2, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const menu0_changes = {};

    			if (dirty & /*$$scope*/ 256) {
    				menu0_changes.$$scope = { dirty, ctx };
    			}

    			menu0.$set(menu0_changes);
    			const textfield_changes = {};

    			if (dirty & /*$$scope*/ 256) {
    				textfield_changes.$$scope = { dirty, ctx };
    			}

    			textfield.$set(textfield_changes);
    			const menu1_changes = {};

    			if (dirty & /*$$scope*/ 256) {
    				menu1_changes.$$scope = { dirty, ctx };
    			}

    			menu1.$set(menu1_changes);
    			const menu2_changes = {};

    			if (dirty & /*$$scope*/ 256) {
    				menu2_changes.$$scope = { dirty, ctx };
    			}

    			menu2.$set(menu2_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(menu0.$$.fragment, local);
    			transition_in(textfield.$$.fragment, local);
    			transition_in(menu1.$$.fragment, local);
    			transition_in(menu2.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(menu0.$$.fragment, local);
    			transition_out(textfield.$$.fragment, local);
    			transition_out(menu1.$$.fragment, local);
    			transition_out(menu2.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(menu0, detaching);
    			if (detaching) detach(t0);
    			if (detaching) detach(div0);
    			destroy_component(textfield);
    			if (detaching) detach(t1);
    			if (detaching) detach(div1);
    			if (detaching) detach(t2);
    			destroy_component(menu1, detaching);
    			if (detaching) detach(t3);
    			destroy_component(menu2, detaching);
    		}
    	};
    }

    // (108:10)         
    function fallback_block$1(ctx) {
    	let h1;
    	let t1;
    	let p0;
    	let t3;
    	let p1;
    	let t5;
    	let p2;
    	let t7;
    	let p3;
    	let t9;
    	let p4;
    	let t11;
    	let p5;

    	return {
    		c() {
    			h1 = element("h1");
    			h1.textContent = "Content goes here";
    			t1 = space();
    			p0 = element("p");
    			p0.textContent = "Content goes here";
    			t3 = space();
    			p1 = element("p");
    			p1.textContent = "Content goes here";
    			t5 = space();
    			p2 = element("p");
    			p2.textContent = "Content goes here";
    			t7 = space();
    			p3 = element("p");
    			p3.textContent = "Content goes here";
    			t9 = space();
    			p4 = element("p");
    			p4.textContent = "Content goes here";
    			t11 = space();
    			p5 = element("p");
    			p5.textContent = "Content goes here";
    		},
    		m(target, anchor) {
    			insert(target, h1, anchor);
    			insert(target, t1, anchor);
    			insert(target, p0, anchor);
    			insert(target, t3, anchor);
    			insert(target, p1, anchor);
    			insert(target, t5, anchor);
    			insert(target, p2, anchor);
    			insert(target, t7, anchor);
    			insert(target, p3, anchor);
    			insert(target, t9, anchor);
    			insert(target, p4, anchor);
    			insert(target, t11, anchor);
    			insert(target, p5, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(h1);
    			if (detaching) detach(t1);
    			if (detaching) detach(p0);
    			if (detaching) detach(t3);
    			if (detaching) detach(p1);
    			if (detaching) detach(t5);
    			if (detaching) detach(p2);
    			if (detaching) detach(t7);
    			if (detaching) detach(p3);
    			if (detaching) detach(t9);
    			if (detaching) detach(p4);
    			if (detaching) detach(t11);
    			if (detaching) detach(p5);
    		}
    	};
    }

    // (126:8) <Subheader>
    function create_default_slot_18(ctx) {
    	let t;

    	return {
    		c() {
    			t = text("Alerts");
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (127:8) <ListItem selectable>
    function create_default_slot_17(ctx) {
    	let t;

    	return {
    		c() {
    			t = text("Notifications");
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (129:8) <Subheader>
    function create_default_slot_16(ctx) {
    	let t;

    	return {
    		c() {
    			t = text("Filters");
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (131:10) <ListItem value="Notifications">
    function create_default_slot_15(ctx) {
    	let t;

    	return {
    		c() {
    			t = text("Notifications");
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (132:12) 
    function create_prepend_slot_3(ctx) {
    	let span;
    	let checkbox;
    	let current;

    	checkbox = new Checkbox({
    			props: {
    				group: /*filters*/ ctx[3],
    				checked: /*filters*/ ctx[3].includes("Notifications")
    			}
    		});

    	return {
    		c() {
    			span = element("span");
    			create_component(checkbox.$$.fragment);
    			attr(span, "slot", "prepend");
    		},
    		m(target, anchor) {
    			insert(target, span, anchor);
    			mount_component(checkbox, span, null);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const checkbox_changes = {};
    			if (dirty & /*filters*/ 8) checkbox_changes.group = /*filters*/ ctx[3];
    			if (dirty & /*filters*/ 8) checkbox_changes.checked = /*filters*/ ctx[3].includes("Notifications");
    			checkbox.$set(checkbox_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(checkbox.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(checkbox.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(span);
    			destroy_component(checkbox);
    		}
    	};
    }

    // (139:12) 
    function create_subtitle_slot_2(ctx) {
    	let span;

    	return {
    		c() {
    			span = element("span");
    			span.textContent = "Allow Notifications";
    			attr(span, "slot", "subtitle");
    		},
    		m(target, anchor) {
    			insert(target, span, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(span);
    		}
    	};
    }

    // (141:10) <ListItem value="Sound">
    function create_default_slot_14(ctx) {
    	let t;

    	return {
    		c() {
    			t = text("Sound");
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (142:12) 
    function create_prepend_slot_2(ctx) {
    	let span;
    	let checkbox;
    	let current;

    	checkbox = new Checkbox({
    			props: {
    				group: /*filters*/ ctx[3],
    				checked: /*filters*/ ctx[3].includes("Sound")
    			}
    		});

    	return {
    		c() {
    			span = element("span");
    			create_component(checkbox.$$.fragment);
    			attr(span, "slot", "prepend");
    		},
    		m(target, anchor) {
    			insert(target, span, anchor);
    			mount_component(checkbox, span, null);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const checkbox_changes = {};
    			if (dirty & /*filters*/ 8) checkbox_changes.group = /*filters*/ ctx[3];
    			if (dirty & /*filters*/ 8) checkbox_changes.checked = /*filters*/ ctx[3].includes("Sound");
    			checkbox.$set(checkbox_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(checkbox.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(checkbox.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(span);
    			destroy_component(checkbox);
    		}
    	};
    }

    // (146:12) 
    function create_subtitle_slot_1(ctx) {
    	let span;

    	return {
    		c() {
    			span = element("span");
    			span.textContent = "Hangouts sound.";
    			attr(span, "slot", "subtitle");
    		},
    		m(target, anchor) {
    			insert(target, span, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(span);
    		}
    	};
    }

    // (148:10) <ListItem value="Invites">
    function create_default_slot_13(ctx) {
    	let t;

    	return {
    		c() {
    			t = text("Invites");
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (149:12) 
    function create_prepend_slot_1(ctx) {
    	let span;
    	let checkbox;
    	let current;

    	checkbox = new Checkbox({
    			props: {
    				group: /*filters*/ ctx[3],
    				checked: /*filters*/ ctx[3].includes("Invites")
    			}
    		});

    	return {
    		c() {
    			span = element("span");
    			create_component(checkbox.$$.fragment);
    			attr(span, "slot", "prepend");
    		},
    		m(target, anchor) {
    			insert(target, span, anchor);
    			mount_component(checkbox, span, null);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const checkbox_changes = {};
    			if (dirty & /*filters*/ 8) checkbox_changes.group = /*filters*/ ctx[3];
    			if (dirty & /*filters*/ 8) checkbox_changes.checked = /*filters*/ ctx[3].includes("Invites");
    			checkbox.$set(checkbox_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(checkbox.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(checkbox.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(span);
    			destroy_component(checkbox);
    		}
    	};
    }

    // (153:12) 
    function create_subtitle_slot(ctx) {
    	let span;

    	return {
    		c() {
    			span = element("span");
    			span.textContent = "Notify when invited.";
    			attr(span, "slot", "subtitle");
    		},
    		m(target, anchor) {
    			insert(target, span, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(span);
    		}
    	};
    }

    // (130:8) <ListItemGroup multiple bind:value={filters}>
    function create_default_slot_12(ctx) {
    	let listitem0;
    	let t0;
    	let listitem1;
    	let t1;
    	let listitem2;
    	let current;

    	listitem0 = new ListItem({
    			props: {
    				value: "Notifications",
    				$$slots: {
    					subtitle: [create_subtitle_slot_2],
    					prepend: [create_prepend_slot_3],
    					default: [create_default_slot_15]
    				},
    				$$scope: { ctx }
    			}
    		});

    	listitem1 = new ListItem({
    			props: {
    				value: "Sound",
    				$$slots: {
    					subtitle: [create_subtitle_slot_1],
    					prepend: [create_prepend_slot_2],
    					default: [create_default_slot_14]
    				},
    				$$scope: { ctx }
    			}
    		});

    	listitem2 = new ListItem({
    			props: {
    				value: "Invites",
    				$$slots: {
    					subtitle: [create_subtitle_slot],
    					prepend: [create_prepend_slot_1],
    					default: [create_default_slot_13]
    				},
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			create_component(listitem0.$$.fragment);
    			t0 = space();
    			create_component(listitem1.$$.fragment);
    			t1 = space();
    			create_component(listitem2.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(listitem0, target, anchor);
    			insert(target, t0, anchor);
    			mount_component(listitem1, target, anchor);
    			insert(target, t1, anchor);
    			mount_component(listitem2, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const listitem0_changes = {};

    			if (dirty & /*$$scope, filters*/ 264) {
    				listitem0_changes.$$scope = { dirty, ctx };
    			}

    			listitem0.$set(listitem0_changes);
    			const listitem1_changes = {};

    			if (dirty & /*$$scope, filters*/ 264) {
    				listitem1_changes.$$scope = { dirty, ctx };
    			}

    			listitem1.$set(listitem1_changes);
    			const listitem2_changes = {};

    			if (dirty & /*$$scope, filters*/ 264) {
    				listitem2_changes.$$scope = { dirty, ctx };
    			}

    			listitem2.$set(listitem2_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(listitem0.$$.fragment, local);
    			transition_in(listitem1.$$.fragment, local);
    			transition_in(listitem2.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(listitem0.$$.fragment, local);
    			transition_out(listitem1.$$.fragment, local);
    			transition_out(listitem2.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(listitem0, detaching);
    			if (detaching) detach(t0);
    			destroy_component(listitem1, detaching);
    			if (detaching) detach(t1);
    			destroy_component(listitem2, detaching);
    		}
    	};
    }

    // (125:6) <List class="elevation-2" style="width:300px;">
    function create_default_slot_11(ctx) {
    	let subheader0;
    	let t0;
    	let listitem;
    	let t1;
    	let divider;
    	let t2;
    	let subheader1;
    	let t3;
    	let listitemgroup;
    	let updating_value;
    	let current;

    	subheader0 = new Subheader({
    			props: {
    				$$slots: { default: [create_default_slot_18] },
    				$$scope: { ctx }
    			}
    		});

    	listitem = new ListItem({
    			props: {
    				selectable: true,
    				$$slots: { default: [create_default_slot_17] },
    				$$scope: { ctx }
    			}
    		});

    	divider = new Divider({});

    	subheader1 = new Subheader({
    			props: {
    				$$slots: { default: [create_default_slot_16] },
    				$$scope: { ctx }
    			}
    		});

    	function listitemgroup_value_binding(value) {
    		/*listitemgroup_value_binding*/ ctx[5](value);
    	}

    	let listitemgroup_props = {
    		multiple: true,
    		$$slots: { default: [create_default_slot_12] },
    		$$scope: { ctx }
    	};

    	if (/*filters*/ ctx[3] !== void 0) {
    		listitemgroup_props.value = /*filters*/ ctx[3];
    	}

    	listitemgroup = new ListItemGroup({ props: listitemgroup_props });
    	binding_callbacks.push(() => bind(listitemgroup, "value", listitemgroup_value_binding));

    	return {
    		c() {
    			create_component(subheader0.$$.fragment);
    			t0 = space();
    			create_component(listitem.$$.fragment);
    			t1 = space();
    			create_component(divider.$$.fragment);
    			t2 = space();
    			create_component(subheader1.$$.fragment);
    			t3 = space();
    			create_component(listitemgroup.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(subheader0, target, anchor);
    			insert(target, t0, anchor);
    			mount_component(listitem, target, anchor);
    			insert(target, t1, anchor);
    			mount_component(divider, target, anchor);
    			insert(target, t2, anchor);
    			mount_component(subheader1, target, anchor);
    			insert(target, t3, anchor);
    			mount_component(listitemgroup, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const subheader0_changes = {};

    			if (dirty & /*$$scope*/ 256) {
    				subheader0_changes.$$scope = { dirty, ctx };
    			}

    			subheader0.$set(subheader0_changes);
    			const listitem_changes = {};

    			if (dirty & /*$$scope*/ 256) {
    				listitem_changes.$$scope = { dirty, ctx };
    			}

    			listitem.$set(listitem_changes);
    			const subheader1_changes = {};

    			if (dirty & /*$$scope*/ 256) {
    				subheader1_changes.$$scope = { dirty, ctx };
    			}

    			subheader1.$set(subheader1_changes);
    			const listitemgroup_changes = {};

    			if (dirty & /*$$scope, filters*/ 264) {
    				listitemgroup_changes.$$scope = { dirty, ctx };
    			}

    			if (!updating_value && dirty & /*filters*/ 8) {
    				updating_value = true;
    				listitemgroup_changes.value = /*filters*/ ctx[3];
    				add_flush_callback(() => updating_value = false);
    			}

    			listitemgroup.$set(listitemgroup_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(subheader0.$$.fragment, local);
    			transition_in(listitem.$$.fragment, local);
    			transition_in(divider.$$.fragment, local);
    			transition_in(subheader1.$$.fragment, local);
    			transition_in(listitemgroup.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(subheader0.$$.fragment, local);
    			transition_out(listitem.$$.fragment, local);
    			transition_out(divider.$$.fragment, local);
    			transition_out(subheader1.$$.fragment, local);
    			transition_out(listitemgroup.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(subheader0, detaching);
    			if (detaching) detach(t0);
    			destroy_component(listitem, detaching);
    			if (detaching) detach(t1);
    			destroy_component(divider, detaching);
    			if (detaching) detach(t2);
    			destroy_component(subheader1, detaching);
    			if (detaching) detach(t3);
    			destroy_component(listitemgroup, detaching);
    		}
    	};
    }

    // (119:4) <Menu right closeOnClick={false} hover>
    function create_default_slot_10(ctx) {
    	let list;
    	let current;

    	list = new List({
    			props: {
    				class: "elevation-2",
    				style: "width:300px;",
    				$$slots: { default: [create_default_slot_11] },
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			create_component(list.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(list, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const list_changes = {};

    			if (dirty & /*$$scope, filters*/ 264) {
    				list_changes.$$scope = { dirty, ctx };
    			}

    			list.$set(list_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(list.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(list.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(list, detaching);
    		}
    	};
    }

    // (121:8) <Button fab class="green white-text">
    function create_default_slot_9(ctx) {
    	let icon;
    	let current;
    	icon = new Icon({ props: { path: mdiLayersTripleOutline } });

    	return {
    		c() {
    			create_component(icon.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(icon, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i(local) {
    			if (current) return;
    			transition_in(icon.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(icon.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(icon, detaching);
    		}
    	};
    }

    // (120:6) 
    function create_activator_slot_1(ctx) {
    	let div;
    	let button;
    	let current;

    	button = new Button({
    			props: {
    				fab: true,
    				class: "green white-text",
    				$$slots: { default: [create_default_slot_9] },
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			div = element("div");
    			create_component(button.$$.fragment);
    			attr(div, "slot", "activator");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			mount_component(button, div, null);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const button_changes = {};

    			if (dirty & /*$$scope*/ 256) {
    				button_changes.$$scope = { dirty, ctx };
    			}

    			button.$set(button_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(button.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(button.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    			destroy_component(button);
    		}
    	};
    }

    // (164:4) <Button fab class="blue white-text">
    function create_default_slot_8(ctx) {
    	let icon;
    	let current;

    	icon = new Icon({
    			props: {
    				path: mdiAccountMultiplePlus,
    				size: "36px"
    			}
    		});

    	return {
    		c() {
    			create_component(icon.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(icon, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i(local) {
    			if (current) return;
    			transition_in(icon.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(icon.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(icon, detaching);
    		}
    	};
    }

    // (177:12) <ListItem                on:click={item.onClick}                on:click={() => (createActive = false)}              >
    function create_default_slot_7(ctx) {
    	let t0_value = /*item*/ ctx[10].name + "";
    	let t0;
    	let t1;

    	return {
    		c() {
    			t0 = text(t0_value);
    			t1 = space();
    		},
    		m(target, anchor) {
    			insert(target, t0, anchor);
    			insert(target, t1, anchor);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*createItems*/ 1 && t0_value !== (t0_value = /*item*/ ctx[10].name + "")) set_data(t0, t0_value);
    		},
    		d(detaching) {
    			if (detaching) detach(t0);
    			if (detaching) detach(t1);
    		}
    	};
    }

    // (182:16) {#if item.icon}
    function create_if_block(ctx) {
    	let icon;
    	let current;
    	icon = new Icon({ props: { path: /*item*/ ctx[10].icon } });

    	return {
    		c() {
    			create_component(icon.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(icon, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const icon_changes = {};
    			if (dirty & /*createItems*/ 1) icon_changes.path = /*item*/ ctx[10].icon;
    			icon.$set(icon_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(icon.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(icon.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(icon, detaching);
    		}
    	};
    }

    // (181:14) 
    function create_prepend_slot(ctx) {
    	let span;
    	let t;
    	let current;
    	let if_block = /*item*/ ctx[10].icon && create_if_block(ctx);

    	return {
    		c() {
    			span = element("span");
    			if (if_block) if_block.c();
    			t = space();
    			attr(span, "slot", "prepend");
    		},
    		m(target, anchor) {
    			insert(target, span, anchor);
    			if (if_block) if_block.m(span, null);
    			append(span, t);
    			current = true;
    		},
    		p(ctx, dirty) {
    			if (/*item*/ ctx[10].icon) {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty & /*createItems*/ 1) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(span, t);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(span);
    			if (if_block) if_block.d();
    		}
    	};
    }

    // (176:10) {#each createItems as item}
    function create_each_block(ctx) {
    	let listitem;
    	let current;

    	listitem = new ListItem({
    			props: {
    				$$slots: {
    					prepend: [create_prepend_slot],
    					default: [create_default_slot_7]
    				},
    				$$scope: { ctx }
    			}
    		});

    	listitem.$on("click", function () {
    		if (is_function(/*item*/ ctx[10].onClick)) /*item*/ ctx[10].onClick.apply(this, arguments);
    	});

    	listitem.$on("click", /*click_handler*/ ctx[6]);

    	return {
    		c() {
    			create_component(listitem.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(listitem, target, anchor);
    			current = true;
    		},
    		p(new_ctx, dirty) {
    			ctx = new_ctx;
    			const listitem_changes = {};

    			if (dirty & /*$$scope, createItems*/ 257) {
    				listitem_changes.$$scope = { dirty, ctx };
    			}

    			listitem.$set(listitem_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(listitem.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(listitem.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(listitem, detaching);
    		}
    	};
    }

    // (175:8) <ListItemGroup>
    function create_default_slot_6(ctx) {
    	let each_1_anchor;
    	let current;
    	let each_value = /*createItems*/ ctx[0];
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	return {
    		c() {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    		},
    		m(target, anchor) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert(target, each_1_anchor, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			if (dirty & /*createItems, createActive*/ 3) {
    				each_value = /*createItems*/ ctx[0];
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				group_outros();

    				for (i = each_value.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}
    		},
    		i(local) {
    			if (current) return;

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o(local) {
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d(detaching) {
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach(each_1_anchor);
    		}
    	};
    }

    // (174:6) <List>
    function create_default_slot_5(ctx) {
    	let listitemgroup;
    	let current;

    	listitemgroup = new ListItemGroup({
    			props: {
    				$$slots: { default: [create_default_slot_6] },
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			create_component(listitemgroup.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(listitemgroup, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const listitemgroup_changes = {};

    			if (dirty & /*$$scope, createItems, createActive*/ 259) {
    				listitemgroup_changes.$$scope = { dirty, ctx };
    			}

    			listitemgroup.$set(listitemgroup_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(listitemgroup.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(listitemgroup.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(listitemgroup, detaching);
    		}
    	};
    }

    // (168:4) <Menu bottom right hover>
    function create_default_slot_4(ctx) {
    	let list;
    	let current;

    	list = new List({
    			props: {
    				$$slots: { default: [create_default_slot_5] },
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			create_component(list.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(list, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const list_changes = {};

    			if (dirty & /*$$scope, createItems, createActive*/ 259) {
    				list_changes.$$scope = { dirty, ctx };
    			}

    			list.$set(list_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(list.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(list.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(list, detaching);
    		}
    	};
    }

    // (170:8) <Button fab class="green white-text">
    function create_default_slot_3(ctx) {
    	let icon;
    	let current;
    	icon = new Icon({ props: { path: mdiTextBoxPlusOutline } });

    	return {
    		c() {
    			create_component(icon.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(icon, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i(local) {
    			if (current) return;
    			transition_in(icon.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(icon.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(icon, detaching);
    		}
    	};
    }

    // (169:6) 
    function create_activator_slot(ctx) {
    	let div;
    	let button;
    	let current;

    	button = new Button({
    			props: {
    				fab: true,
    				class: "green white-text",
    				$$slots: { default: [create_default_slot_3] },
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			div = element("div");
    			create_component(button.$$.fragment);
    			attr(div, "slot", "activator");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			mount_component(button, div, null);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const button_changes = {};

    			if (dirty & /*$$scope*/ 256) {
    				button_changes.$$scope = { dirty, ctx };
    			}

    			button.$set(button_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(button.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(button.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    			destroy_component(button);
    		}
    	};
    }

    // (192:4) <Dialog bind:active={createData}>
    function create_default_slot_2(ctx) {
    	let createdata;
    	let current;
    	createdata = new CreateData({});

    	return {
    		c() {
    			create_component(createdata.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(createdata, target, anchor);
    			current = true;
    		},
    		i(local) {
    			if (current) return;
    			transition_in(createdata.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(createdata.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(createdata, detaching);
    		}
    	};
    }

    // (159:2) <Footer      fixed      class="justify-space-between float-right"      style="background-color: #0000"    >
    function create_default_slot_1(ctx) {
    	let button;
    	let t0;
    	let menu;
    	let t1;
    	let dialog;
    	let updating_active;
    	let current;

    	button = new Button({
    			props: {
    				fab: true,
    				class: "blue white-text",
    				$$slots: { default: [create_default_slot_8] },
    				$$scope: { ctx }
    			}
    		});

    	menu = new Menu({
    			props: {
    				bottom: true,
    				right: true,
    				hover: true,
    				$$slots: {
    					activator: [create_activator_slot],
    					default: [create_default_slot_4]
    				},
    				$$scope: { ctx }
    			}
    		});

    	function dialog_active_binding(value) {
    		/*dialog_active_binding*/ ctx[7](value);
    	}

    	let dialog_props = {
    		$$slots: { default: [create_default_slot_2] },
    		$$scope: { ctx }
    	};

    	if (/*createData*/ ctx[2] !== void 0) {
    		dialog_props.active = /*createData*/ ctx[2];
    	}

    	dialog = new Dialog_1({ props: dialog_props });
    	binding_callbacks.push(() => bind(dialog, "active", dialog_active_binding));

    	return {
    		c() {
    			create_component(button.$$.fragment);
    			t0 = space();
    			create_component(menu.$$.fragment);
    			t1 = space();
    			create_component(dialog.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(button, target, anchor);
    			insert(target, t0, anchor);
    			mount_component(menu, target, anchor);
    			insert(target, t1, anchor);
    			mount_component(dialog, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const button_changes = {};

    			if (dirty & /*$$scope*/ 256) {
    				button_changes.$$scope = { dirty, ctx };
    			}

    			button.$set(button_changes);
    			const menu_changes = {};

    			if (dirty & /*$$scope, createItems, createActive*/ 259) {
    				menu_changes.$$scope = { dirty, ctx };
    			}

    			menu.$set(menu_changes);
    			const dialog_changes = {};

    			if (dirty & /*$$scope*/ 256) {
    				dialog_changes.$$scope = { dirty, ctx };
    			}

    			if (!updating_active && dirty & /*createData*/ 4) {
    				updating_active = true;
    				dialog_changes.active = /*createData*/ ctx[2];
    				add_flush_callback(() => updating_active = false);
    			}

    			dialog.$set(dialog_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(button.$$.fragment, local);
    			transition_in(menu.$$.fragment, local);
    			transition_in(dialog.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(button.$$.fragment, local);
    			transition_out(menu.$$.fragment, local);
    			transition_out(dialog.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(button, detaching);
    			if (detaching) detach(t0);
    			destroy_component(menu, detaching);
    			if (detaching) detach(t1);
    			destroy_component(dialog, detaching);
    		}
    	};
    }

    // (56:0) <MaterialApp>
    function create_default_slot$1(ctx) {
    	let appbar;
    	let t0;
    	let div0;
    	let t1;
    	let div1;
    	let menu;
    	let t2;
    	let footer;
    	let current;

    	appbar = new AppBar({
    			props: {
    				fixed: true,
    				style: "margin-right:0px; width: 100%; width: -webkit-fill-available;width: -webkit-fill-available; width: fill-available;",
    				$$slots: { default: [create_default_slot_19] },
    				$$scope: { ctx }
    			}
    		});

    	const default_slot_template = /*#slots*/ ctx[4].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[8], null);
    	const default_slot_or_fallback = default_slot || fallback_block$1();

    	menu = new Menu({
    			props: {
    				right: true,
    				closeOnClick: false,
    				hover: true,
    				$$slots: {
    					activator: [create_activator_slot_1],
    					default: [create_default_slot_10]
    				},
    				$$scope: { ctx }
    			}
    		});

    	footer = new Footer({
    			props: {
    				fixed: true,
    				class: "justify-space-between float-right",
    				style: "background-color: #0000",
    				$$slots: { default: [create_default_slot_1] },
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			create_component(appbar.$$.fragment);
    			t0 = space();
    			div0 = element("div");
    			if (default_slot_or_fallback) default_slot_or_fallback.c();
    			t1 = space();
    			div1 = element("div");
    			create_component(menu.$$.fragment);
    			t2 = space();
    			create_component(footer.$$.fragment);
    			attr(div0, "class", "container svelte-cuvd8d");
    			set_style(div1, "position", "fixed");
    			set_style(div1, "top", "70px");
    			set_style(div1, "right", "16px");
    		},
    		m(target, anchor) {
    			mount_component(appbar, target, anchor);
    			insert(target, t0, anchor);
    			insert(target, div0, anchor);

    			if (default_slot_or_fallback) {
    				default_slot_or_fallback.m(div0, null);
    			}

    			insert(target, t1, anchor);
    			insert(target, div1, anchor);
    			mount_component(menu, div1, null);
    			insert(target, t2, anchor);
    			mount_component(footer, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const appbar_changes = {};

    			if (dirty & /*$$scope*/ 256) {
    				appbar_changes.$$scope = { dirty, ctx };
    			}

    			appbar.$set(appbar_changes);

    			if (default_slot) {
    				if (default_slot.p && dirty & /*$$scope*/ 256) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[8], dirty, null, null);
    				}
    			}

    			const menu_changes = {};

    			if (dirty & /*$$scope, filters*/ 264) {
    				menu_changes.$$scope = { dirty, ctx };
    			}

    			menu.$set(menu_changes);
    			const footer_changes = {};

    			if (dirty & /*$$scope, createData, createItems, createActive*/ 263) {
    				footer_changes.$$scope = { dirty, ctx };
    			}

    			footer.$set(footer_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(appbar.$$.fragment, local);
    			transition_in(default_slot_or_fallback, local);
    			transition_in(menu.$$.fragment, local);
    			transition_in(footer.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(appbar.$$.fragment, local);
    			transition_out(default_slot_or_fallback, local);
    			transition_out(menu.$$.fragment, local);
    			transition_out(footer.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(appbar, detaching);
    			if (detaching) detach(t0);
    			if (detaching) detach(div0);
    			if (default_slot_or_fallback) default_slot_or_fallback.d(detaching);
    			if (detaching) detach(t1);
    			if (detaching) detach(div1);
    			destroy_component(menu);
    			if (detaching) detach(t2);
    			destroy_component(footer, detaching);
    		}
    	};
    }

    function create_fragment$1(ctx) {
    	let t;
    	let materialapp;
    	let current;

    	materialapp = new MaterialApp({
    			props: {
    				$$slots: { default: [create_default_slot$1] },
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			t = space();
    			create_component(materialapp.$$.fragment);
    			document.title = "Material UI App";
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    			mount_component(materialapp, target, anchor);
    			current = true;
    		},
    		p(ctx, [dirty]) {
    			const materialapp_changes = {};

    			if (dirty & /*$$scope, createData, createItems, createActive, filters*/ 271) {
    				materialapp_changes.$$scope = { dirty, ctx };
    			}

    			materialapp.$set(materialapp_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(materialapp.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(materialapp.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    			destroy_component(materialapp, detaching);
    		}
    	};
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;

    	let { createItems = [
    		{
    			name: "Contact Card",
    			value: "Contact Card",
    			onClick: () => {
    				$$invalidate(2, createData = true);
    			}
    		},
    		{ name: "Resume", value: "Resume" },
    		{ name: "+ Create Custom", value: "Custom" }
    	] } = $$props;

    	let createActive, createData;
    	let filters = [];

    	function listitemgroup_value_binding(value) {
    		filters = value;
    		$$invalidate(3, filters);
    	}

    	const click_handler = () => $$invalidate(1, createActive = false);

    	function dialog_active_binding(value) {
    		createData = value;
    		$$invalidate(2, createData);
    	}

    	$$self.$$set = $$props => {
    		if ("createItems" in $$props) $$invalidate(0, createItems = $$props.createItems);
    		if ("$$scope" in $$props) $$invalidate(8, $$scope = $$props.$$scope);
    	};

    	return [
    		createItems,
    		createActive,
    		createData,
    		filters,
    		slots,
    		listitemgroup_value_binding,
    		click_handler,
    		dialog_active_binding,
    		$$scope
    	];
    }

    class Main extends SvelteComponent {
    	constructor(options) {
    		super();
    		if (!document.getElementById("svelte-cuvd8d-style")) add_css();
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, { createItems: 0 });
    	}
    }

    /* src\App.svelte generated by Svelte v3.35.0 */

    function fallback_block(ctx) {
    	let h1;
    	let t1;

    	return {
    		c() {
    			h1 = element("h1");
    			h1.textContent = "Content here";
    			t1 = text("\r\n    Content here");
    		},
    		m(target, anchor) {
    			insert(target, h1, anchor);
    			insert(target, t1, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(h1);
    			if (detaching) detach(t1);
    		}
    	};
    }

    // (9:0) <Main>
    function create_default_slot(ctx) {
    	let current;
    	const default_slot_template = /*#slots*/ ctx[0].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[1], null);
    	const default_slot_or_fallback = default_slot || fallback_block();

    	return {
    		c() {
    			if (default_slot_or_fallback) default_slot_or_fallback.c();
    		},
    		m(target, anchor) {
    			if (default_slot_or_fallback) {
    				default_slot_or_fallback.m(target, anchor);
    			}

    			current = true;
    		},
    		p(ctx, dirty) {
    			if (default_slot) {
    				if (default_slot.p && dirty & /*$$scope*/ 2) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[1], dirty, null, null);
    				}
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(default_slot_or_fallback, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(default_slot_or_fallback, local);
    			current = false;
    		},
    		d(detaching) {
    			if (default_slot_or_fallback) default_slot_or_fallback.d(detaching);
    		}
    	};
    }

    function create_fragment(ctx) {
    	let main;
    	let current;

    	main = new Main({
    			props: {
    				$$slots: { default: [create_default_slot] },
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			create_component(main.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(main, target, anchor);
    			current = true;
    		},
    		p(ctx, [dirty]) {
    			const main_changes = {};

    			if (dirty & /*$$scope*/ 2) {
    				main_changes.$$scope = { dirty, ctx };
    			}

    			main.$set(main_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(main.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(main.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(main, detaching);
    		}
    	};
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;

    	onMount(async () => {
    		
    	});

    	$$self.$$set = $$props => {
    		if ("$$scope" in $$props) $$invalidate(1, $$scope = $$props.$$scope);
    	};

    	return [slots, $$scope];
    }

    class App extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance, create_fragment, safe_not_equal, {});
    	}
    }

    return App;

})));
