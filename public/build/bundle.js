
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    const identity = x => x;
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
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
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        input.value = value == null ? '' : value;
    }
    function set_style(node, key, value, important) {
        node.style.setProperty(key, value, important ? 'important' : '');
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

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);
    function outro_and_destroy_block(block, lookup) {
        transition_out(block, 1, 1, () => {
            lookup.delete(block.key);
        });
    }
    function update_keyed_each(old_blocks, dirty, get_key, dynamic, ctx, list, lookup, node, destroy, create_each_block, next, get_context) {
        let o = old_blocks.length;
        let n = list.length;
        let i = o;
        const old_indexes = {};
        while (i--)
            old_indexes[old_blocks[i].key] = i;
        const new_blocks = [];
        const new_lookup = new Map();
        const deltas = new Map();
        i = n;
        while (i--) {
            const child_ctx = get_context(ctx, list, i);
            const key = get_key(child_ctx);
            let block = lookup.get(key);
            if (!block) {
                block = create_each_block(key, child_ctx);
                block.c();
            }
            else if (dynamic) {
                block.p(child_ctx, dirty);
            }
            new_lookup.set(key, new_blocks[i] = block);
            if (key in old_indexes)
                deltas.set(key, Math.abs(i - old_indexes[key]));
        }
        const will_move = new Set();
        const did_move = new Set();
        function insert(block) {
            transition_in(block, 1);
            block.m(node, next);
            lookup.set(block.key, block);
            next = block.first;
            n--;
        }
        while (o && n) {
            const new_block = new_blocks[n - 1];
            const old_block = old_blocks[o - 1];
            const new_key = new_block.key;
            const old_key = old_block.key;
            if (new_block === old_block) {
                // do nothing
                next = new_block.first;
                o--;
                n--;
            }
            else if (!new_lookup.has(old_key)) {
                // remove old block
                destroy(old_block, lookup);
                o--;
            }
            else if (!lookup.has(new_key) || will_move.has(new_key)) {
                insert(new_block);
            }
            else if (did_move.has(old_key)) {
                o--;
            }
            else if (deltas.get(new_key) > deltas.get(old_key)) {
                did_move.add(new_key);
                insert(new_block);
            }
            else {
                will_move.add(old_key);
                o--;
            }
        }
        while (o--) {
            const old_block = old_blocks[o];
            if (!new_lookup.has(old_block.key))
                destroy(old_block, lookup);
        }
        while (n)
            insert(new_blocks[n - 1]);
        return new_blocks;
    }
    function validate_each_keys(ctx, list, get_context, get_key) {
        const keys = new Set();
        for (let i = 0; i < list.length; i++) {
            const key = get_key(get_context(ctx, list, i));
            if (keys.has(key)) {
                throw new Error('Cannot have duplicate keys in a keyed each');
            }
            keys.add(key);
        }
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
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
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
        const prop_values = options.props || {};
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
            ? instance(component, prop_values, (i, ret, ...rest) => {
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
            mount_component(component, options.target, options.anchor);
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

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.31.0' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    function cubicOut(t) {
        const f = t - 1.0;
        return f * f * f + 1.0;
    }

    function fade(node, { delay = 0, duration = 400, easing = identity }) {
        const o = +getComputedStyle(node).opacity;
        return {
            delay,
            duration,
            easing,
            css: t => `opacity: ${t * o}`
        };
    }
    function fly(node, { delay = 0, duration = 400, easing = cubicOut, x = 0, y = 0, opacity = 0 }) {
        const style = getComputedStyle(node);
        const target_opacity = +style.opacity;
        const transform = style.transform === 'none' ? '' : style.transform;
        const od = target_opacity * (1 - opacity);
        return {
            delay,
            duration,
            easing,
            css: (t, u) => `
			transform: ${transform} translate(${(1 - t) * x}px, ${(1 - t) * y}px);
			opacity: ${target_opacity - (od * u)}`
        };
    }

    /* src/editor/fieldtypes/TinyText.svelte generated by Svelte v3.31.0 */
    const file = "src/editor/fieldtypes/TinyText.svelte";

    // (25:2) {#if buttons.includes('bold')}
    function create_if_block_6(ctx) {
    	let button;
    	let svg;
    	let path;

    	const block = {
    		c: function create() {
    			button = element("button");
    			svg = svg_element("svg");
    			path = svg_element("path");
    			attr_dev(path, "d", "M8.21 13c2.106 0 3.412-1.087 3.412-2.823 0-1.306-.984-2.283-2.324-2.386v-.055a2.176 2.176 0 0 0 1.852-2.14c0-1.51-1.162-2.46-3.014-2.46H3.843V13H8.21zM5.908 4.674h1.696c.963 0 1.517.451 1.517 1.244 0 .834-.629 1.32-1.73 1.32H5.908V4.673zm0 6.788V8.598h1.73c1.217 0 1.88.492 1.88 1.415 0 .943-.643 1.449-1.832 1.449H5.907z");
    			add_location(path, file, 27, 4, 686);
    			attr_dev(svg, "width", "1em");
    			attr_dev(svg, "height", "1em");
    			attr_dev(svg, "viewBox", "0 0 16 16");
    			attr_dev(svg, "class", "bi bi-type-bold");
    			attr_dev(svg, "fill", "currentColor");
    			attr_dev(svg, "xmlns", "http://www.w3.org/2000/svg");
    			add_location(svg, file, 26, 2, 552);
    			attr_dev(button, "class", "btn btn-outline-secondary svelte-3efpyh");
    			attr_dev(button, "onclick", "document.execCommand('bold',false,null);");
    			add_location(button, file, 25, 2, 455);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);
    			append_dev(button, svg);
    			append_dev(svg, path);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_6.name,
    		type: "if",
    		source: "(25:2) {#if buttons.includes('bold')}",
    		ctx
    	});

    	return block;
    }

    // (33:2) {#if buttons.includes('italic')}
    function create_if_block_5(ctx) {
    	let button;
    	let svg;
    	let path;

    	const block = {
    		c: function create() {
    			button = element("button");
    			svg = svg_element("svg");
    			path = svg_element("path");
    			attr_dev(path, "d", "M7.991 11.674L9.53 4.455c.123-.595.246-.71 1.347-.807l.11-.52H7.211l-.11.52c1.06.096 1.128.212 1.005.807L6.57 11.674c-.123.595-.246.71-1.346.806l-.11.52h3.774l.11-.52c-1.06-.095-1.129-.211-1.006-.806z");
    			add_location(path, file, 35, 4, 1322);
    			attr_dev(svg, "width", "1em");
    			attr_dev(svg, "height", "1em");
    			attr_dev(svg, "viewBox", "0 0 16 16");
    			attr_dev(svg, "class", "bi bi-type-italic");
    			attr_dev(svg, "fill", "currentColor");
    			attr_dev(svg, "xmlns", "http://www.w3.org/2000/svg");
    			add_location(svg, file, 34, 2, 1186);
    			attr_dev(button, "class", "btn btn-outline-secondary svelte-3efpyh");
    			attr_dev(button, "onclick", "document.execCommand('italic',false,null);");
    			add_location(button, file, 33, 2, 1087);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);
    			append_dev(button, svg);
    			append_dev(svg, path);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_5.name,
    		type: "if",
    		source: "(33:2) {#if buttons.includes('italic')}",
    		ctx
    	});

    	return block;
    }

    // (41:2) {#if buttons.includes('underline')}
    function create_if_block_4(ctx) {
    	let button;
    	let svg;
    	let path0;
    	let path1;

    	const block = {
    		c: function create() {
    			button = element("button");
    			svg = svg_element("svg");
    			path0 = svg_element("path");
    			path1 = svg_element("path");
    			attr_dev(path0, "d", "M5.313 3.136h-1.23V9.54c0 2.105 1.47 3.623 3.917 3.623s3.917-1.518 3.917-3.623V3.136h-1.23v6.323c0 1.49-.978 2.57-2.687 2.57-1.709 0-2.687-1.08-2.687-2.57V3.136z");
    			add_location(path0, file, 43, 4, 1845);
    			attr_dev(path1, "fill-rule", "evenodd");
    			attr_dev(path1, "d", "M12.5 15h-9v-1h9v1z");
    			add_location(path1, file, 44, 4, 2023);
    			attr_dev(svg, "width", "1em");
    			attr_dev(svg, "height", "1em");
    			attr_dev(svg, "viewBox", "0 0 16 16");
    			attr_dev(svg, "class", "bi bi-type-underline");
    			attr_dev(svg, "fill", "currentColor");
    			attr_dev(svg, "xmlns", "http://www.w3.org/2000/svg");
    			add_location(svg, file, 42, 2, 1706);
    			attr_dev(button, "class", "btn btn-outline-secondary svelte-3efpyh");
    			attr_dev(button, "onclick", "document.execCommand('underline',false,null);");
    			add_location(button, file, 41, 2, 1605);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);
    			append_dev(button, svg);
    			append_dev(svg, path0);
    			append_dev(svg, path1);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_4.name,
    		type: "if",
    		source: "(41:2) {#if buttons.includes('underline')}",
    		ctx
    	});

    	return block;
    }

    // (50:2) {#if buttons.includes('strikethrough')}
    function create_if_block_3(ctx) {
    	let button;
    	let svg;
    	let path0;
    	let path1;

    	const block = {
    		c: function create() {
    			button = element("button");
    			svg = svg_element("svg");
    			path0 = svg_element("path");
    			path1 = svg_element("path");
    			attr_dev(path0, "d", "M8.527 13.164c-2.153 0-3.589-1.107-3.705-2.81h1.23c.144 1.06 1.129 1.703 2.544 1.703 1.34 0 2.31-.705 2.31-1.675 0-.827-.547-1.374-1.914-1.675L8.046 8.5h3.45c.468.437.675.994.675 1.697 0 1.826-1.436 2.967-3.644 2.967zM6.602 6.5H5.167a2.776 2.776 0 0 1-.099-.76c0-1.627 1.436-2.768 3.48-2.768 1.969 0 3.39 1.175 3.445 2.85h-1.23c-.11-1.08-.964-1.743-2.25-1.743-1.23 0-2.18.602-2.18 1.607 0 .31.083.581.27.814z");
    			add_location(path0, file, 52, 2, 2395);
    			attr_dev(path1, "fill-rule", "evenodd");
    			attr_dev(path1, "d", "M15 8.5H1v-1h14v1z");
    			add_location(path1, file, 53, 2, 2818);
    			attr_dev(svg, "width", "1em");
    			attr_dev(svg, "height", "1em");
    			attr_dev(svg, "viewBox", "0 0 16 16");
    			attr_dev(svg, "class", "bi bi-type-strikethrough");
    			attr_dev(svg, "fill", "currentColor");
    			attr_dev(svg, "xmlns", "http://www.w3.org/2000/svg");
    			add_location(svg, file, 51, 2, 2254);
    			attr_dev(button, "class", "btn btn-outline-secondary svelte-3efpyh");
    			attr_dev(button, "onclick", "document.execCommand('strikethrough',false,null);");
    			add_location(button, file, 50, 2, 2149);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);
    			append_dev(button, svg);
    			append_dev(svg, path0);
    			append_dev(svg, path1);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_3.name,
    		type: "if",
    		source: "(50:2) {#if buttons.includes('strikethrough')}",
    		ctx
    	});

    	return block;
    }

    // (59:2) {#if buttons.includes('ul')}
    function create_if_block_2(ctx) {
    	let button;
    	let svg;
    	let path;

    	const block = {
    		c: function create() {
    			button = element("button");
    			svg = svg_element("svg");
    			path = svg_element("path");
    			attr_dev(path, "fill-rule", "evenodd");
    			attr_dev(path, "d", "M5 11.5a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9a.5.5 0 0 1-.5-.5zm-3 1a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm0 4a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm0 4a1 1 0 1 0 0-2 1 1 0 0 0 0 2z");
    			add_location(path, file, 61, 4, 3175);
    			attr_dev(svg, "width", "1em");
    			attr_dev(svg, "height", "1em");
    			attr_dev(svg, "viewBox", "0 0 16 16");
    			attr_dev(svg, "class", "bi bi-list-ul");
    			attr_dev(svg, "fill", "currentColor");
    			attr_dev(svg, "xmlns", "http://www.w3.org/2000/svg");
    			add_location(svg, file, 60, 2, 3043);
    			attr_dev(button, "class", "btn btn-outline-secondary svelte-3efpyh");
    			attr_dev(button, "onclick", "document.execCommand('InsertUnorderedList',false,null);");
    			add_location(button, file, 59, 2, 2932);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);
    			append_dev(button, svg);
    			append_dev(svg, path);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2.name,
    		type: "if",
    		source: "(59:2) {#if buttons.includes('ul')}",
    		ctx
    	});

    	return block;
    }

    // (67:2) {#if buttons.includes('ol')}
    function create_if_block_1(ctx) {
    	let button;
    	let svg;
    	let path0;
    	let path1;

    	const block = {
    		c: function create() {
    			button = element("button");
    			svg = svg_element("svg");
    			path0 = svg_element("path");
    			path1 = svg_element("path");
    			attr_dev(path0, "fill-rule", "evenodd");
    			attr_dev(path0, "d", "M5 11.5a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9a.5.5 0 0 1-.5-.5z");
    			add_location(path0, file, 69, 2, 3790);
    			attr_dev(path1, "d", "M1.713 11.865v-.474H2c.217 0 .363-.137.363-.317 0-.185-.158-.31-.361-.31-.223 0-.367.152-.373.31h-.59c.016-.467.373-.787.986-.787.588-.002.954.291.957.703a.595.595 0 0 1-.492.594v.033a.615.615 0 0 1 .569.631c.003.533-.502.8-1.051.8-.656 0-1-.37-1.008-.794h.582c.008.178.186.306.422.309.254 0 .424-.145.422-.35-.002-.195-.155-.348-.414-.348h-.3zm-.004-4.699h-.604v-.035c0-.408.295-.844.958-.844.583 0 .96.326.96.756 0 .389-.257.617-.476.848l-.537.572v.03h1.054V9H1.143v-.395l.957-.99c.138-.142.293-.304.293-.508 0-.18-.147-.32-.342-.32a.33.33 0 0 0-.342.338v.041zM2.564 5h-.635V2.924h-.031l-.598.42v-.567l.629-.443h.635V5z");
    			add_location(path1, file, 70, 2, 4005);
    			attr_dev(svg, "width", "1em");
    			attr_dev(svg, "height", "1em");
    			attr_dev(svg, "viewBox", "0 0 16 16");
    			attr_dev(svg, "class", "bi bi-list-ol");
    			attr_dev(svg, "fill", "currentColor");
    			attr_dev(svg, "xmlns", "http://www.w3.org/2000/svg");
    			add_location(svg, file, 68, 2, 3660);
    			attr_dev(button, "class", "btn btn-outline-secondary svelte-3efpyh");
    			attr_dev(button, "onclick", "document.execCommand('InsertOrderedList',false,null);");
    			add_location(button, file, 67, 2, 3551);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);
    			append_dev(button, svg);
    			append_dev(svg, path0);
    			append_dev(svg, path1);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(67:2) {#if buttons.includes('ol')}",
    		ctx
    	});

    	return block;
    }

    // (76:2) {#if buttons.includes('link')}
    function create_if_block(ctx) {
    	let button;
    	let svg;
    	let path0;
    	let path1;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			button = element("button");
    			svg = svg_element("svg");
    			path0 = svg_element("path");
    			path1 = svg_element("path");
    			attr_dev(path0, "d", "M4.715 6.542L3.343 7.914a3 3 0 1 0 4.243 4.243l1.828-1.829A3 3 0 0 0 8.586 5.5L8 6.086a1.001 1.001 0 0 0-.154.199 2 2 0 0 1 .861 3.337L6.88 11.45a2 2 0 1 1-2.83-2.83l.793-.792a4.018 4.018 0 0 1-.128-1.287z");
    			add_location(path0, file, 78, 4, 4908);
    			attr_dev(path1, "d", "M6.586 4.672A3 3 0 0 0 7.414 9.5l.775-.776a2 2 0 0 1-.896-3.346L9.12 3.55a2 2 0 0 1 2.83 2.83l-.793.792c.112.42.155.855.128 1.287l1.372-1.372a3 3 0 0 0-4.243-4.243L6.586 4.672z");
    			add_location(path1, file, 79, 4, 5130);
    			attr_dev(svg, "width", "1em");
    			attr_dev(svg, "height", "1em");
    			attr_dev(svg, "viewBox", "0 0 16 16");
    			attr_dev(svg, "class", "bi bi-link-45deg");
    			attr_dev(svg, "fill", "currentColor");
    			attr_dev(svg, "xmlns", "http://www.w3.org/2000/svg");
    			add_location(svg, file, 77, 2, 4773);
    			attr_dev(button, "class", "btn btn-outline-secondary svelte-3efpyh");
    			add_location(button, file, 76, 2, 4704);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);
    			append_dev(button, svg);
    			append_dev(svg, path0);
    			append_dev(svg, path1);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", insertLink, false, false, false);
    				mounted = true;
    			}
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(76:2) {#if buttons.includes('link')}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let div0;
    	let show_if_6 = /*buttons*/ ctx[1].includes("bold");
    	let t0;
    	let show_if_5 = /*buttons*/ ctx[1].includes("italic");
    	let t1;
    	let show_if_4 = /*buttons*/ ctx[1].includes("underline");
    	let t2;
    	let show_if_3 = /*buttons*/ ctx[1].includes("strikethrough");
    	let t3;
    	let show_if_2 = /*buttons*/ ctx[1].includes("ul");
    	let t4;
    	let show_if_1 = /*buttons*/ ctx[1].includes("ol");
    	let t5;
    	let show_if = /*buttons*/ ctx[1].includes("link");
    	let t6;
    	let span;
    	let t7;
    	let div1;
    	let mounted;
    	let dispose;
    	let if_block0 = show_if_6 && create_if_block_6(ctx);
    	let if_block1 = show_if_5 && create_if_block_5(ctx);
    	let if_block2 = show_if_4 && create_if_block_4(ctx);
    	let if_block3 = show_if_3 && create_if_block_3(ctx);
    	let if_block4 = show_if_2 && create_if_block_2(ctx);
    	let if_block5 = show_if_1 && create_if_block_1(ctx);
    	let if_block6 = show_if && create_if_block(ctx);

    	const block = {
    		c: function create() {
    			div0 = element("div");
    			if (if_block0) if_block0.c();
    			t0 = space();
    			if (if_block1) if_block1.c();
    			t1 = space();
    			if (if_block2) if_block2.c();
    			t2 = space();
    			if (if_block3) if_block3.c();
    			t3 = space();
    			if (if_block4) if_block4.c();
    			t4 = space();
    			if (if_block5) if_block5.c();
    			t5 = space();
    			if (if_block6) if_block6.c();
    			t6 = space();
    			span = element("span");
    			t7 = space();
    			div1 = element("div");
    			attr_dev(span, "class", "filler svelte-3efpyh");
    			add_location(span, file, 84, 2, 5351);
    			attr_dev(div0, "class", "btn-group w-100");
    			add_location(div0, file, 22, 0, 389);
    			attr_dev(div1, "class", "tiny-editor mb-3 svelte-3efpyh");
    			attr_dev(div1, "contenteditable", "true");
    			if (/*value*/ ctx[0] === void 0) add_render_callback(() => /*div1_input_handler*/ ctx[4].call(div1));
    			add_location(div1, file, 88, 0, 5389);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div0, anchor);
    			if (if_block0) if_block0.m(div0, null);
    			append_dev(div0, t0);
    			if (if_block1) if_block1.m(div0, null);
    			append_dev(div0, t1);
    			if (if_block2) if_block2.m(div0, null);
    			append_dev(div0, t2);
    			if (if_block3) if_block3.m(div0, null);
    			append_dev(div0, t3);
    			if (if_block4) if_block4.m(div0, null);
    			append_dev(div0, t4);
    			if (if_block5) if_block5.m(div0, null);
    			append_dev(div0, t5);
    			if (if_block6) if_block6.m(div0, null);
    			append_dev(div0, t6);
    			append_dev(div0, span);
    			insert_dev(target, t7, anchor);
    			insert_dev(target, div1, anchor);

    			if (/*value*/ ctx[0] !== void 0) {
    				div1.innerHTML = /*value*/ ctx[0];
    			}

    			if (!mounted) {
    				dispose = listen_dev(div1, "input", /*div1_input_handler*/ ctx[4]);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*buttons*/ 2) show_if_6 = /*buttons*/ ctx[1].includes("bold");

    			if (show_if_6) {
    				if (if_block0) ; else {
    					if_block0 = create_if_block_6(ctx);
    					if_block0.c();
    					if_block0.m(div0, t0);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (dirty & /*buttons*/ 2) show_if_5 = /*buttons*/ ctx[1].includes("italic");

    			if (show_if_5) {
    				if (if_block1) ; else {
    					if_block1 = create_if_block_5(ctx);
    					if_block1.c();
    					if_block1.m(div0, t1);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}

    			if (dirty & /*buttons*/ 2) show_if_4 = /*buttons*/ ctx[1].includes("underline");

    			if (show_if_4) {
    				if (if_block2) ; else {
    					if_block2 = create_if_block_4(ctx);
    					if_block2.c();
    					if_block2.m(div0, t2);
    				}
    			} else if (if_block2) {
    				if_block2.d(1);
    				if_block2 = null;
    			}

    			if (dirty & /*buttons*/ 2) show_if_3 = /*buttons*/ ctx[1].includes("strikethrough");

    			if (show_if_3) {
    				if (if_block3) ; else {
    					if_block3 = create_if_block_3(ctx);
    					if_block3.c();
    					if_block3.m(div0, t3);
    				}
    			} else if (if_block3) {
    				if_block3.d(1);
    				if_block3 = null;
    			}

    			if (dirty & /*buttons*/ 2) show_if_2 = /*buttons*/ ctx[1].includes("ul");

    			if (show_if_2) {
    				if (if_block4) ; else {
    					if_block4 = create_if_block_2(ctx);
    					if_block4.c();
    					if_block4.m(div0, t4);
    				}
    			} else if (if_block4) {
    				if_block4.d(1);
    				if_block4 = null;
    			}

    			if (dirty & /*buttons*/ 2) show_if_1 = /*buttons*/ ctx[1].includes("ol");

    			if (show_if_1) {
    				if (if_block5) ; else {
    					if_block5 = create_if_block_1(ctx);
    					if_block5.c();
    					if_block5.m(div0, t5);
    				}
    			} else if (if_block5) {
    				if_block5.d(1);
    				if_block5 = null;
    			}

    			if (dirty & /*buttons*/ 2) show_if = /*buttons*/ ctx[1].includes("link");

    			if (show_if) {
    				if (if_block6) {
    					if_block6.p(ctx, dirty);
    				} else {
    					if_block6 = create_if_block(ctx);
    					if_block6.c();
    					if_block6.m(div0, t6);
    				}
    			} else if (if_block6) {
    				if_block6.d(1);
    				if_block6 = null;
    			}

    			if (dirty & /*value*/ 1 && /*value*/ ctx[0] !== div1.innerHTML) {
    				div1.innerHTML = /*value*/ ctx[0];
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div0);
    			if (if_block0) if_block0.d();
    			if (if_block1) if_block1.d();
    			if (if_block2) if_block2.d();
    			if (if_block3) if_block3.d();
    			if (if_block4) if_block4.d();
    			if (if_block5) if_block5.d();
    			if (if_block6) if_block6.d();
    			if (detaching) detach_dev(t7);
    			if (detaching) detach_dev(div1);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function insertLink() {
    	var link = prompt("URL", "");

    	if (link != null) {
    		document.execCommand("CreateLink", false, link);
    	}
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("TinyText", slots, []);
    	let { key } = $$props;
    	let { value } = $$props;
    	let { buttons } = $$props;
    	let { data } = $$props;

    	onMount(async () => {
    		// set default to p instead of div
    		document.execCommand("defaultParagraphSeparator", false, "p");
    	});

    	const writable_props = ["key", "value", "buttons", "data"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<TinyText> was created with unknown prop '${key}'`);
    	});

    	function div1_input_handler() {
    		value = this.innerHTML;
    		$$invalidate(0, value);
    	}

    	$$self.$$set = $$props => {
    		if ("key" in $$props) $$invalidate(2, key = $$props.key);
    		if ("value" in $$props) $$invalidate(0, value = $$props.value);
    		if ("buttons" in $$props) $$invalidate(1, buttons = $$props.buttons);
    		if ("data" in $$props) $$invalidate(3, data = $$props.data);
    	};

    	$$self.$capture_state = () => ({
    		onMount,
    		key,
    		value,
    		buttons,
    		data,
    		insertLink
    	});

    	$$self.$inject_state = $$props => {
    		if ("key" in $$props) $$invalidate(2, key = $$props.key);
    		if ("value" in $$props) $$invalidate(0, value = $$props.value);
    		if ("buttons" in $$props) $$invalidate(1, buttons = $$props.buttons);
    		if ("data" in $$props) $$invalidate(3, data = $$props.data);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [value, buttons, key, data, div1_input_handler];
    }

    class TinyText extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, { key: 2, value: 0, buttons: 1, data: 3 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "TinyText",
    			options,
    			id: create_fragment.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*key*/ ctx[2] === undefined && !("key" in props)) {
    			console.warn("<TinyText> was created without expected prop 'key'");
    		}

    		if (/*value*/ ctx[0] === undefined && !("value" in props)) {
    			console.warn("<TinyText> was created without expected prop 'value'");
    		}

    		if (/*buttons*/ ctx[1] === undefined && !("buttons" in props)) {
    			console.warn("<TinyText> was created without expected prop 'buttons'");
    		}

    		if (/*data*/ ctx[3] === undefined && !("data" in props)) {
    			console.warn("<TinyText> was created without expected prop 'data'");
    		}
    	}

    	get key() {
    		throw new Error("<TinyText>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set key(value) {
    		throw new Error("<TinyText>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get value() {
    		throw new Error("<TinyText>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set value(value) {
    		throw new Error("<TinyText>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get buttons() {
    		throw new Error("<TinyText>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set buttons(value) {
    		throw new Error("<TinyText>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get data() {
    		throw new Error("<TinyText>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set data(value) {
    		throw new Error("<TinyText>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/editor/fieldtypes/Pexels.svelte generated by Svelte v3.31.0 */

    const { console: console_1 } = globals;
    const file$1 = "src/editor/fieldtypes/Pexels.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[9] = list[i];
    	return child_ctx;
    }

    // (40:8) {#each photos as photo}
    function create_each_block(ctx) {
    	let img;
    	let img_src_value;
    	let mounted;
    	let dispose;

    	function click_handler() {
    		return /*click_handler*/ ctx[8](/*photo*/ ctx[9]);
    	}

    	const block = {
    		c: function create() {
    			img = element("img");
    			if (img.src !== (img_src_value = /*photo*/ ctx[9].url)) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "class", "img-fluid mt-2");
    			add_location(img, file$1, 40, 8, 1247);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, img, anchor);

    			if (!mounted) {
    				dispose = listen_dev(img, "click", click_handler, false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (dirty & /*photos*/ 16 && img.src !== (img_src_value = /*photo*/ ctx[9].url)) {
    				attr_dev(img, "src", img_src_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(img);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(40:8) {#each photos as photo}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
    	let div1;
    	let input;
    	let t0;
    	let div0;
    	let button;
    	let span;
    	let t1;
    	let t2;
    	let div2;
    	let mounted;
    	let dispose;
    	let each_value = /*photos*/ ctx[4];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			input = element("input");
    			t0 = space();
    			div0 = element("div");
    			button = element("button");
    			span = element("span");
    			t1 = text("\n            Search Image");
    			t2 = space();
    			div2 = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(input, "type", "text");
    			attr_dev(input, "class", "form-control");
    			attr_dev(input, "placeholder", "e.g. mountains, stars");
    			add_location(input, file$1, 30, 8, 716);
    			attr_dev(span, "class", "spinner-border spinner-border-sm");
    			attr_dev(span, "role", "status");
    			attr_dev(span, "aria-hidden", "true");
    			attr_dev(span, "id", "loading");
    			set_style(span, "display", "none");
    			add_location(span, file$1, 33, 12, 978);
    			attr_dev(button, "class", "btn btn-outline-secondary");
    			attr_dev(button, "type", "button");
    			attr_dev(button, "id", "button-addon2");
    			add_location(button, file$1, 32, 10, 864);
    			attr_dev(div0, "class", "input-group-append");
    			add_location(div0, file$1, 31, 8, 821);
    			attr_dev(div1, "class", "input-group");
    			add_location(div1, file$1, 29, 6, 682);
    			attr_dev(div2, "id", "photos");
    			attr_dev(div2, "class", "mb-3 mt-2");
    			add_location(div2, file$1, 38, 6, 1171);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, input);
    			set_input_value(input, /*search*/ ctx[3]);
    			append_dev(div1, t0);
    			append_dev(div1, div0);
    			append_dev(div0, button);
    			append_dev(button, span);
    			append_dev(button, t1);
    			insert_dev(target, t2, anchor);
    			insert_dev(target, div2, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div2, null);
    			}

    			if (!mounted) {
    				dispose = [
    					listen_dev(input, "input", /*input_input_handler*/ ctx[7]),
    					listen_dev(button, "click", /*searchPexels*/ ctx[5], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*search*/ 8 && input.value !== /*search*/ ctx[3]) {
    				set_input_value(input, /*search*/ ctx[3]);
    			}

    			if (dirty & /*photos, data, curIndex, key*/ 23) {
    				each_value = /*photos*/ ctx[4];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div2, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    			if (detaching) detach_dev(t2);
    			if (detaching) detach_dev(div2);
    			destroy_each(each_blocks, detaching);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Pexels", slots, []);
    	let { data } = $$props;
    	let { key } = $$props;
    	let { value } = $$props;
    	let { curIndex } = $$props;
    	let search = "";
    	let photos = [];

    	function searchPexels() {
    		console.log("searching" + search);

    		fetch("https://api.pexels.com/v1/search?query=" + search, {
    			headers: {
    				Authorization: "563492ad6f9170000100000193a694091f5340f3963db995f31bb5e6"
    			}
    		}).then(response => response.json()).then(function (result) {
    			console.log(key);

    			result.photos.forEach(function (item) {
    				photos.push({ url: item.src.portrait });
    			});

    			$$invalidate(4, photos);
    		}).catch(err => console.log(err));
    	}

    	const writable_props = ["data", "key", "value", "curIndex"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1.warn(`<Pexels> was created with unknown prop '${key}'`);
    	});

    	function input_input_handler() {
    		search = this.value;
    		$$invalidate(3, search);
    	}

    	const click_handler = photo => $$invalidate(0, data.entries[curIndex][key] = photo.url, data);

    	$$self.$$set = $$props => {
    		if ("data" in $$props) $$invalidate(0, data = $$props.data);
    		if ("key" in $$props) $$invalidate(1, key = $$props.key);
    		if ("value" in $$props) $$invalidate(6, value = $$props.value);
    		if ("curIndex" in $$props) $$invalidate(2, curIndex = $$props.curIndex);
    	};

    	$$self.$capture_state = () => ({
    		data,
    		key,
    		value,
    		curIndex,
    		search,
    		photos,
    		searchPexels
    	});

    	$$self.$inject_state = $$props => {
    		if ("data" in $$props) $$invalidate(0, data = $$props.data);
    		if ("key" in $$props) $$invalidate(1, key = $$props.key);
    		if ("value" in $$props) $$invalidate(6, value = $$props.value);
    		if ("curIndex" in $$props) $$invalidate(2, curIndex = $$props.curIndex);
    		if ("search" in $$props) $$invalidate(3, search = $$props.search);
    		if ("photos" in $$props) $$invalidate(4, photos = $$props.photos);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		data,
    		key,
    		curIndex,
    		search,
    		photos,
    		searchPexels,
    		value,
    		input_input_handler,
    		click_handler
    	];
    }

    class Pexels extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, { data: 0, key: 1, value: 6, curIndex: 2 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Pexels",
    			options,
    			id: create_fragment$1.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*data*/ ctx[0] === undefined && !("data" in props)) {
    			console_1.warn("<Pexels> was created without expected prop 'data'");
    		}

    		if (/*key*/ ctx[1] === undefined && !("key" in props)) {
    			console_1.warn("<Pexels> was created without expected prop 'key'");
    		}

    		if (/*value*/ ctx[6] === undefined && !("value" in props)) {
    			console_1.warn("<Pexels> was created without expected prop 'value'");
    		}

    		if (/*curIndex*/ ctx[2] === undefined && !("curIndex" in props)) {
    			console_1.warn("<Pexels> was created without expected prop 'curIndex'");
    		}
    	}

    	get data() {
    		throw new Error("<Pexels>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set data(value) {
    		throw new Error("<Pexels>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get key() {
    		throw new Error("<Pexels>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set key(value) {
    		throw new Error("<Pexels>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get value() {
    		throw new Error("<Pexels>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set value(value) {
    		throw new Error("<Pexels>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get curIndex() {
    		throw new Error("<Pexels>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set curIndex(value) {
    		throw new Error("<Pexels>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/editor/Editor.svelte generated by Svelte v3.31.0 */

    const { Object: Object_1, console: console_1$1, document: document_1 } = globals;
    const file$2 = "src/editor/Editor.svelte";

    function get_each_context$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[15] = list[i][0];
    	child_ctx[16] = list[i][1];
    	child_ctx[17] = list;
    	child_ctx[18] = i;
    	return child_ctx;
    }

    // (61:0) {#if curId}
    function create_if_block$1(ctx) {
    	let div2;
    	let div0;
    	let t0;
    	let span;
    	let t2;
    	let div1;
    	let each_blocks = [];
    	let each_1_lookup = new Map();
    	let t3;
    	let a;
    	let div2_transition;
    	let current;
    	let mounted;
    	let dispose;
    	let each_value = Object.entries(/*fields*/ ctx[2]);
    	validate_each_argument(each_value);
    	const get_key = ctx => /*key*/ ctx[15];
    	validate_each_keys(ctx, each_value, get_each_context$1, get_key);

    	for (let i = 0; i < each_value.length; i += 1) {
    		let child_ctx = get_each_context$1(ctx, each_value, i);
    		let key = get_key(child_ctx);
    		each_1_lookup.set(key, each_blocks[i] = create_each_block$1(key, child_ctx));
    	}

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			div0 = element("div");
    			t0 = text("Edit ");
    			span = element("span");
    			span.textContent = "×";
    			t2 = space();
    			div1 = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t3 = space();
    			a = element("a");
    			a.textContent = "Save";
    			attr_dev(span, "class", "close svelte-p3hf2q");
    			add_location(span, file$2, 63, 9, 1280);
    			attr_dev(div0, "class", "card-header");
    			add_location(div0, file$2, 62, 2, 1245);
    			attr_dev(a, "href", "#");
    			attr_dev(a, "class", "btn btn-primary");
    			add_location(a, file$2, 88, 4, 2002);
    			attr_dev(div1, "class", "card-body");
    			add_location(div1, file$2, 65, 2, 1359);
    			attr_dev(div2, "class", "card svelte-p3hf2q");
    			add_location(div2, file$2, 61, 0, 1196);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, div0);
    			append_dev(div0, t0);
    			append_dev(div0, span);
    			append_dev(div2, t2);
    			append_dev(div2, div1);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div1, null);
    			}

    			append_dev(div1, t3);
    			append_dev(div1, a);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(span, "click", /*click_handler*/ ctx[6], false, false, false),
    					listen_dev(a, "click", /*localSave*/ ctx[5], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*Object, fields, data, curIndex, item*/ 29) {
    				const each_value = Object.entries(/*fields*/ ctx[2]);
    				validate_each_argument(each_value);
    				group_outros();
    				validate_each_keys(ctx, each_value, get_each_context$1, get_key);
    				each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value, each_1_lookup, div1, outro_and_destroy_block, create_each_block$1, t3, get_each_context$1);
    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			add_render_callback(() => {
    				if (!div2_transition) div2_transition = create_bidirectional_transition(div2, fly, { x: 400 }, true);
    				div2_transition.run(1);
    			});

    			current = true;
    		},
    		o: function outro(local) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			if (!div2_transition) div2_transition = create_bidirectional_transition(div2, fly, { x: 400 }, false);
    			div2_transition.run(0);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].d();
    			}

    			if (detaching && div2_transition) div2_transition.end();
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$1.name,
    		type: "if",
    		source: "(61:0) {#if curId}",
    		ctx
    	});

    	return block;
    }

    // (70:2) {#if val === 'txt'}
    function create_if_block_3$1(ctx) {
    	let div;
    	let t0_value = /*key*/ ctx[15].replace("_", " ") + "";
    	let t0;
    	let t1;
    	let input;
    	let mounted;
    	let dispose;

    	function input_input_handler() {
    		/*input_input_handler*/ ctx[7].call(input, /*key*/ ctx[15]);
    	}

    	const block = {
    		c: function create() {
    			div = element("div");
    			t0 = text(t0_value);
    			t1 = space();
    			input = element("input");
    			attr_dev(div, "class", "label svelte-p3hf2q");
    			add_location(div, file$2, 70, 3, 1464);
    			attr_dev(input, "type", "text");
    			attr_dev(input, "class", "form-control svelte-p3hf2q");
    			add_location(input, file$2, 71, 6, 1519);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, t0);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, input, anchor);
    			set_input_value(input, /*data*/ ctx[0].entries[/*curIndex*/ ctx[3]][/*key*/ ctx[15]]);

    			if (!mounted) {
    				dispose = listen_dev(input, "input", input_input_handler);
    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			if (dirty & /*Object, fields*/ 4 && t0_value !== (t0_value = /*key*/ ctx[15].replace("_", " ") + "")) set_data_dev(t0, t0_value);

    			if (dirty & /*data, curIndex, Object, fields*/ 13 && input.value !== /*data*/ ctx[0].entries[/*curIndex*/ ctx[3]][/*key*/ ctx[15]]) {
    				set_input_value(input, /*data*/ ctx[0].entries[/*curIndex*/ ctx[3]][/*key*/ ctx[15]]);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(input);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_3$1.name,
    		type: "if",
    		source: "(70:2) {#if val === 'txt'}",
    		ctx
    	});

    	return block;
    }

    // (76:2) {#if val=='rte'}
    function create_if_block_2$1(ctx) {
    	let div;
    	let t0_value = /*key*/ ctx[15].replace("_", " ") + "";
    	let t0;
    	let t1;
    	let tinytext;
    	let updating_key;
    	let updating_value;
    	let updating_data;
    	let current;

    	function tinytext_key_binding(value) {
    		/*tinytext_key_binding*/ ctx[8].call(null, value, /*key*/ ctx[15]);
    	}

    	function tinytext_value_binding(value) {
    		/*tinytext_value_binding*/ ctx[9].call(null, value, /*key*/ ctx[15]);
    	}

    	function tinytext_data_binding(value) {
    		/*tinytext_data_binding*/ ctx[10].call(null, value);
    	}

    	let tinytext_props = { buttons: ["bold", "italic", "link"] };

    	if (/*item*/ ctx[4][/*key*/ ctx[15]] !== void 0) {
    		tinytext_props.key = /*item*/ ctx[4][/*key*/ ctx[15]];
    	}

    	if (/*data*/ ctx[0].entries[/*curIndex*/ ctx[3]][/*key*/ ctx[15]] !== void 0) {
    		tinytext_props.value = /*data*/ ctx[0].entries[/*curIndex*/ ctx[3]][/*key*/ ctx[15]];
    	}

    	if (/*data*/ ctx[0] !== void 0) {
    		tinytext_props.data = /*data*/ ctx[0];
    	}

    	tinytext = new TinyText({ props: tinytext_props, $$inline: true });
    	binding_callbacks.push(() => bind(tinytext, "key", tinytext_key_binding));
    	binding_callbacks.push(() => bind(tinytext, "value", tinytext_value_binding));
    	binding_callbacks.push(() => bind(tinytext, "data", tinytext_data_binding));

    	const block = {
    		c: function create() {
    			div = element("div");
    			t0 = text(t0_value);
    			t1 = space();
    			create_component(tinytext.$$.fragment);
    			attr_dev(div, "class", "label svelte-p3hf2q");
    			add_location(div, file$2, 76, 1, 1637);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, t0);
    			insert_dev(target, t1, anchor);
    			mount_component(tinytext, target, anchor);
    			current = true;
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			if ((!current || dirty & /*Object, fields*/ 4) && t0_value !== (t0_value = /*key*/ ctx[15].replace("_", " ") + "")) set_data_dev(t0, t0_value);
    			const tinytext_changes = {};

    			if (!updating_key && dirty & /*item, Object, fields*/ 20) {
    				updating_key = true;
    				tinytext_changes.key = /*item*/ ctx[4][/*key*/ ctx[15]];
    				add_flush_callback(() => updating_key = false);
    			}

    			if (!updating_value && dirty & /*data, curIndex, Object, fields*/ 13) {
    				updating_value = true;
    				tinytext_changes.value = /*data*/ ctx[0].entries[/*curIndex*/ ctx[3]][/*key*/ ctx[15]];
    				add_flush_callback(() => updating_value = false);
    			}

    			if (!updating_data && dirty & /*data*/ 1) {
    				updating_data = true;
    				tinytext_changes.data = /*data*/ ctx[0];
    				add_flush_callback(() => updating_data = false);
    			}

    			tinytext.$set(tinytext_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(tinytext.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(tinytext.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if (detaching) detach_dev(t1);
    			destroy_component(tinytext, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2$1.name,
    		type: "if",
    		source: "(76:2) {#if val=='rte'}",
    		ctx
    	});

    	return block;
    }

    // (82:1) {#if val=='pxl'}
    function create_if_block_1$1(ctx) {
    	let div;
    	let t0_value = /*key*/ ctx[15].replace("_", " ") + "";
    	let t0;
    	let t1;
    	let pexels;
    	let updating_key;
    	let updating_value;
    	let updating_data;
    	let updating_curIndex;
    	let current;

    	function pexels_key_binding(value) {
    		/*pexels_key_binding*/ ctx[11].call(null, value, /*key*/ ctx[15], /*each_value*/ ctx[17], /*each_index*/ ctx[18]);
    	}

    	function pexels_value_binding(value) {
    		/*pexels_value_binding*/ ctx[12].call(null, value, /*key*/ ctx[15]);
    	}

    	function pexels_data_binding(value) {
    		/*pexels_data_binding*/ ctx[13].call(null, value);
    	}

    	function pexels_curIndex_binding(value) {
    		/*pexels_curIndex_binding*/ ctx[14].call(null, value);
    	}

    	let pexels_props = {};

    	if (/*key*/ ctx[15] !== void 0) {
    		pexels_props.key = /*key*/ ctx[15];
    	}

    	if (/*data*/ ctx[0].entries[/*curIndex*/ ctx[3]][/*key*/ ctx[15]] !== void 0) {
    		pexels_props.value = /*data*/ ctx[0].entries[/*curIndex*/ ctx[3]][/*key*/ ctx[15]];
    	}

    	if (/*data*/ ctx[0] !== void 0) {
    		pexels_props.data = /*data*/ ctx[0];
    	}

    	if (/*curIndex*/ ctx[3] !== void 0) {
    		pexels_props.curIndex = /*curIndex*/ ctx[3];
    	}

    	pexels = new Pexels({ props: pexels_props, $$inline: true });
    	binding_callbacks.push(() => bind(pexels, "key", pexels_key_binding));
    	binding_callbacks.push(() => bind(pexels, "value", pexels_value_binding));
    	binding_callbacks.push(() => bind(pexels, "data", pexels_data_binding));
    	binding_callbacks.push(() => bind(pexels, "curIndex", pexels_curIndex_binding));

    	const block = {
    		c: function create() {
    			div = element("div");
    			t0 = text(t0_value);
    			t1 = space();
    			create_component(pexels.$$.fragment);
    			attr_dev(div, "class", "label svelte-p3hf2q");
    			add_location(div, file$2, 82, 1, 1838);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, t0);
    			insert_dev(target, t1, anchor);
    			mount_component(pexels, target, anchor);
    			current = true;
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			if ((!current || dirty & /*Object, fields*/ 4) && t0_value !== (t0_value = /*key*/ ctx[15].replace("_", " ") + "")) set_data_dev(t0, t0_value);
    			const pexels_changes = {};

    			if (!updating_key && dirty & /*Object, fields*/ 4) {
    				updating_key = true;
    				pexels_changes.key = /*key*/ ctx[15];
    				add_flush_callback(() => updating_key = false);
    			}

    			if (!updating_value && dirty & /*data, curIndex, Object, fields*/ 13) {
    				updating_value = true;
    				pexels_changes.value = /*data*/ ctx[0].entries[/*curIndex*/ ctx[3]][/*key*/ ctx[15]];
    				add_flush_callback(() => updating_value = false);
    			}

    			if (!updating_data && dirty & /*data*/ 1) {
    				updating_data = true;
    				pexels_changes.data = /*data*/ ctx[0];
    				add_flush_callback(() => updating_data = false);
    			}

    			if (!updating_curIndex && dirty & /*curIndex*/ 8) {
    				updating_curIndex = true;
    				pexels_changes.curIndex = /*curIndex*/ ctx[3];
    				add_flush_callback(() => updating_curIndex = false);
    			}

    			pexels.$set(pexels_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(pexels.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(pexels.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if (detaching) detach_dev(t1);
    			destroy_component(pexels, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1$1.name,
    		type: "if",
    		source: "(82:1) {#if val=='pxl'}",
    		ctx
    	});

    	return block;
    }

    // (68:2) {#each Object.entries(fields) as [key, val] (key) }
    function create_each_block$1(key_1, ctx) {
    	let first;
    	let t0;
    	let t1;
    	let if_block2_anchor;
    	let current;
    	let if_block0 = /*val*/ ctx[16] === "txt" && create_if_block_3$1(ctx);
    	let if_block1 = /*val*/ ctx[16] == "rte" && create_if_block_2$1(ctx);
    	let if_block2 = /*val*/ ctx[16] == "pxl" && create_if_block_1$1(ctx);

    	const block = {
    		key: key_1,
    		first: null,
    		c: function create() {
    			first = empty();
    			if (if_block0) if_block0.c();
    			t0 = space();
    			if (if_block1) if_block1.c();
    			t1 = space();
    			if (if_block2) if_block2.c();
    			if_block2_anchor = empty();
    			this.first = first;
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, first, anchor);
    			if (if_block0) if_block0.m(target, anchor);
    			insert_dev(target, t0, anchor);
    			if (if_block1) if_block1.m(target, anchor);
    			insert_dev(target, t1, anchor);
    			if (if_block2) if_block2.m(target, anchor);
    			insert_dev(target, if_block2_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (/*val*/ ctx[16] === "txt") {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);
    				} else {
    					if_block0 = create_if_block_3$1(ctx);
    					if_block0.c();
    					if_block0.m(t0.parentNode, t0);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (/*val*/ ctx[16] == "rte") {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);

    					if (dirty & /*Object, fields*/ 4) {
    						transition_in(if_block1, 1);
    					}
    				} else {
    					if_block1 = create_if_block_2$1(ctx);
    					if_block1.c();
    					transition_in(if_block1, 1);
    					if_block1.m(t1.parentNode, t1);
    				}
    			} else if (if_block1) {
    				group_outros();

    				transition_out(if_block1, 1, 1, () => {
    					if_block1 = null;
    				});

    				check_outros();
    			}

    			if (/*val*/ ctx[16] == "pxl") {
    				if (if_block2) {
    					if_block2.p(ctx, dirty);

    					if (dirty & /*Object, fields*/ 4) {
    						transition_in(if_block2, 1);
    					}
    				} else {
    					if_block2 = create_if_block_1$1(ctx);
    					if_block2.c();
    					transition_in(if_block2, 1);
    					if_block2.m(if_block2_anchor.parentNode, if_block2_anchor);
    				}
    			} else if (if_block2) {
    				group_outros();

    				transition_out(if_block2, 1, 1, () => {
    					if_block2 = null;
    				});

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block1);
    			transition_in(if_block2);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block1);
    			transition_out(if_block2);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(first);
    			if (if_block0) if_block0.d(detaching);
    			if (detaching) detach_dev(t0);
    			if (if_block1) if_block1.d(detaching);
    			if (detaching) detach_dev(t1);
    			if (if_block2) if_block2.d(detaching);
    			if (detaching) detach_dev(if_block2_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$1.name,
    		type: "each",
    		source: "(68:2) {#each Object.entries(fields) as [key, val] (key) }",
    		ctx
    	});

    	return block;
    }

    function create_fragment$2(ctx) {
    	let style;
    	let t1;
    	let if_block_anchor;
    	let current;
    	let if_block = /*curId*/ ctx[1] && create_if_block$1(ctx);

    	const block = {
    		c: function create() {
    			style = element("style");
    			style.textContent = ".editable{\n\tborder: 1px solid transparent;\n}\n.editable:hover{\n\tborder: 1px dashed #999;\n\tcursor: pointer;\n}";
    			t1 = space();
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    			add_location(style, file$2, 1, 0, 14);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			append_dev(document_1.head, style);
    			insert_dev(target, t1, anchor);
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (/*curId*/ ctx[1]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty & /*curId*/ 2) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block$1(ctx);
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
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			detach_dev(style);
    			if (detaching) detach_dev(t1);
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Editor", slots, []);

    	onMount(async () => {
    		if (typeof localStorage.getItem("data") !== "undefined") {
    			$$invalidate(0, data = JSON.parse(localStorage.getItem("data")));
    		}
    	});

    	let { data } = $$props;
    	let curId = false;
    	let fields = false;
    	let curIndex = false;
    	let item;

    	document.body.addEventListener("click", function (e) {
    		if (e.target.closest(".editable")) {
    			let target = e.target.closest(".editable");
    			let id = target.id;
    			let myfields = target.getAttribute("data-fields");
    			var params = new URLSearchParams(myfields);
    			$$invalidate(2, fields = Object.fromEntries(params.entries()));
    			console.log(fields);
    			$$invalidate(4, item = data.entries.filter(x => x.id == id)[0]);
    			$$invalidate(3, curIndex = data.entries.findIndex(x => x.id == id));
    			$$invalidate(1, curId = id);
    		}
    	});

    	function localSave() {
    		console.log("save to localstorage");
    		localStorage.setItem("data", JSON.stringify(data));
    		$$invalidate(1, curId = false);
    	}

    	const writable_props = ["data"];

    	Object_1.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1$1.warn(`<Editor> was created with unknown prop '${key}'`);
    	});

    	const click_handler = () => $$invalidate(1, curId = false);

    	function input_input_handler(key) {
    		data.entries[curIndex][key] = this.value;
    		$$invalidate(0, data);
    		$$invalidate(3, curIndex);
    		$$invalidate(2, fields);
    	}

    	function tinytext_key_binding(value, key) {
    		item[key] = value;
    		$$invalidate(4, item);
    	}

    	function tinytext_value_binding(value, key) {
    		data.entries[curIndex][key] = value;
    		$$invalidate(0, data);
    	}

    	function tinytext_data_binding(value) {
    		data = value;
    		$$invalidate(0, data);
    	}

    	function pexels_key_binding(value, key, each_value, each_index) {
    		each_value[each_index][0] = value;
    	}

    	function pexels_value_binding(value, key) {
    		data.entries[curIndex][key] = value;
    		$$invalidate(0, data);
    	}

    	function pexels_data_binding(value) {
    		data = value;
    		$$invalidate(0, data);
    	}

    	function pexels_curIndex_binding(value) {
    		curIndex = value;
    		$$invalidate(3, curIndex);
    	}

    	$$self.$$set = $$props => {
    		if ("data" in $$props) $$invalidate(0, data = $$props.data);
    	};

    	$$self.$capture_state = () => ({
    		fade,
    		fly,
    		TinyText,
    		Pexels,
    		onMount,
    		data,
    		curId,
    		fields,
    		curIndex,
    		item,
    		localSave
    	});

    	$$self.$inject_state = $$props => {
    		if ("data" in $$props) $$invalidate(0, data = $$props.data);
    		if ("curId" in $$props) $$invalidate(1, curId = $$props.curId);
    		if ("fields" in $$props) $$invalidate(2, fields = $$props.fields);
    		if ("curIndex" in $$props) $$invalidate(3, curIndex = $$props.curIndex);
    		if ("item" in $$props) $$invalidate(4, item = $$props.item);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		data,
    		curId,
    		fields,
    		curIndex,
    		item,
    		localSave,
    		click_handler,
    		input_input_handler,
    		tinytext_key_binding,
    		tinytext_value_binding,
    		tinytext_data_binding,
    		pexels_key_binding,
    		pexels_value_binding,
    		pexels_data_binding,
    		pexels_curIndex_binding
    	];
    }

    class Editor extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, { data: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Editor",
    			options,
    			id: create_fragment$2.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*data*/ ctx[0] === undefined && !("data" in props)) {
    			console_1$1.warn("<Editor> was created without expected prop 'data'");
    		}
    	}

    	get data() {
    		throw new Error("<Editor>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set data(value) {
    		throw new Error("<Editor>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/App.svelte generated by Svelte v3.31.0 */

    const { console: console_1$2 } = globals;
    const file$3 = "src/App.svelte";

    function get_each_context$2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[5] = list[i];
    	return child_ctx;
    }

    // (80:19) {#if item.title}
    function create_if_block$2(ctx) {
    	let h1;
    	let t_value = /*item*/ ctx[5].title + "";
    	let t;

    	const block = {
    		c: function create() {
    			h1 = element("h1");
    			t = text(t_value);
    			attr_dev(h1, "class", "svelte-1ra76j8");
    			add_location(h1, file$3, 79, 35, 2475);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h1, anchor);
    			append_dev(h1, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*data*/ 1 && t_value !== (t_value = /*item*/ ctx[5].title + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$2.name,
    		type: "if",
    		source: "(80:19) {#if item.title}",
    		ctx
    	});

    	return block;
    }

    // (70:4) {#each data.entries as item}
    function create_each_block$2(ctx) {
    	let li;
    	let div5;
    	let div0;
    	let t0;
    	let div4;
    	let div3;
    	let div2;
    	let t1;
    	let div1;
    	let raw_value = /*item*/ ctx[5].body + "";
    	let div2_id_value;
    	let t2;
    	let if_block = /*item*/ ctx[5].title && create_if_block$2(ctx);

    	const block = {
    		c: function create() {
    			li = element("li");
    			div5 = element("div");
    			div0 = element("div");
    			t0 = space();
    			div4 = element("div");
    			div3 = element("div");
    			div2 = element("div");
    			if (if_block) if_block.c();
    			t1 = space();
    			div1 = element("div");
    			t2 = space();
    			attr_dev(div0, "class", "col-3 side svelte-1ra76j8");
    			attr_dev(div0, "data-name", "bgimg");
    			attr_dev(div0, "data-type", "bgimg");
    			set_style(div0, "background-image", "url(" + /*item*/ ctx[5].image + ")");
    			add_location(div0, file$3, 74, 14, 2112);
    			attr_dev(div1, "class", "text svelte-1ra76j8");
    			add_location(div1, file$3, 80, 19, 2521);
    			attr_dev(div2, "class", "editable");
    			attr_dev(div2, "id", div2_id_value = /*item*/ ctx[5].id);
    			attr_dev(div2, "data-fields", "title=txt&body=rte&image=pxl");
    			add_location(div2, file$3, 78, 9, 2351);
    			attr_dev(div3, "class", "justify-content-center align-self-center");
    			add_location(div3, file$3, 76, 16, 2286);
    			attr_dev(div4, "class", "col-9 main d-flex svelte-1ra76j8");
    			add_location(div4, file$3, 75, 14, 2238);
    			attr_dev(div5, "class", "row no-gutters");
    			add_location(div5, file$3, 73, 12, 2069);
    			attr_dev(li, "class", "splide__slide");
    			add_location(li, file$3, 70, 10, 2028);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, li, anchor);
    			append_dev(li, div5);
    			append_dev(div5, div0);
    			append_dev(div5, t0);
    			append_dev(div5, div4);
    			append_dev(div4, div3);
    			append_dev(div3, div2);
    			if (if_block) if_block.m(div2, null);
    			append_dev(div2, t1);
    			append_dev(div2, div1);
    			div1.innerHTML = raw_value;
    			append_dev(li, t2);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*data*/ 1) {
    				set_style(div0, "background-image", "url(" + /*item*/ ctx[5].image + ")");
    			}

    			if (/*item*/ ctx[5].title) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block$2(ctx);
    					if_block.c();
    					if_block.m(div2, t1);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}

    			if (dirty & /*data*/ 1 && raw_value !== (raw_value = /*item*/ ctx[5].body + "")) div1.innerHTML = raw_value;
    			if (dirty & /*data*/ 1 && div2_id_value !== (div2_id_value = /*item*/ ctx[5].id)) {
    				attr_dev(div2, "id", div2_id_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(li);
    			if (if_block) if_block.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$2.name,
    		type: "each",
    		source: "(70:4) {#each data.entries as item}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$3(ctx) {
    	let div4;
    	let div3;
    	let div0;
    	let button0;
    	let i0;
    	let t0;
    	let div1;
    	let t2;
    	let div2;
    	let button1;
    	let i1;
    	let t3;
    	let div7;
    	let div6;
    	let div5;
    	let ul;
    	let t4;
    	let editor;
    	let updating_data;
    	let current;
    	let mounted;
    	let dispose;
    	let each_value = /*data*/ ctx[0].entries;
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$2(get_each_context$2(ctx, each_value, i));
    	}

    	function editor_data_binding(value) {
    		/*editor_data_binding*/ ctx[3].call(null, value);
    	}

    	let editor_props = {};

    	if (/*data*/ ctx[0] !== void 0) {
    		editor_props.data = /*data*/ ctx[0];
    	}

    	editor = new Editor({ props: editor_props, $$inline: true });
    	binding_callbacks.push(() => bind(editor, "data", editor_data_binding));

    	const block = {
    		c: function create() {
    			div4 = element("div");
    			div3 = element("div");
    			div0 = element("div");
    			button0 = element("button");
    			i0 = element("i");
    			t0 = space();
    			div1 = element("div");
    			div1.textContent = "Elevator Pitch";
    			t2 = space();
    			div2 = element("div");
    			button1 = element("button");
    			i1 = element("i");
    			t3 = space();
    			div7 = element("div");
    			div6 = element("div");
    			div5 = element("div");
    			ul = element("ul");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t4 = space();
    			create_component(editor.$$.fragment);
    			attr_dev(i0, "class", "fa fa-plus");
    			add_location(i0, file$3, 58, 80, 1603);
    			attr_dev(button0, "class", "btn btn-outline-dark");
    			add_location(button0, file$3, 58, 21, 1544);
    			attr_dev(div0, "class", "col-3");
    			add_location(div0, file$3, 58, 2, 1525);
    			attr_dev(div1, "class", "col-6 text-center pt-1");
    			add_location(div1, file$3, 59, 2, 1647);
    			attr_dev(i1, "class", "fa fa-save");
    			add_location(i1, file$3, 60, 69, 1773);
    			attr_dev(button1, "class", "btn btn-outline-dark");
    			add_location(button1, file$3, 60, 32, 1736);
    			attr_dev(div2, "class", "col-3 text-right");
    			add_location(div2, file$3, 60, 2, 1706);
    			attr_dev(div3, "class", "row no-gutters");
    			add_location(div3, file$3, 57, 1, 1494);
    			attr_dev(div4, "class", "topbar");
    			add_location(div4, file$3, 56, 0, 1472);
    			attr_dev(ul, "class", "splide__list");
    			add_location(ul, file$3, 67, 8, 1958);
    			attr_dev(div5, "class", "splide__track");
    			add_location(div5, file$3, 66, 6, 1922);
    			attr_dev(div6, "class", "splide");
    			attr_dev(div6, "id", "splide");
    			add_location(div6, file$3, 65, 4, 1883);
    			attr_dev(div7, "class", "card svelte-1ra76j8");
    			attr_dev(div7, "id", "card1");
    			add_location(div7, file$3, 64, 0, 1849);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div4, anchor);
    			append_dev(div4, div3);
    			append_dev(div3, div0);
    			append_dev(div0, button0);
    			append_dev(button0, i0);
    			append_dev(div3, t0);
    			append_dev(div3, div1);
    			append_dev(div3, t2);
    			append_dev(div3, div2);
    			append_dev(div2, button1);
    			append_dev(button1, i1);
    			insert_dev(target, t3, anchor);
    			insert_dev(target, div7, anchor);
    			append_dev(div7, div6);
    			append_dev(div6, div5);
    			append_dev(div5, ul);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(ul, null);
    			}

    			insert_dev(target, t4, anchor);
    			mount_component(editor, target, anchor);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(button0, "click", /*addSlide*/ ctx[1], false, false, false),
    					listen_dev(i1, "click", /*save*/ ctx[2], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*data*/ 1) {
    				each_value = /*data*/ ctx[0].entries;
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$2(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block$2(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(ul, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}

    			const editor_changes = {};

    			if (!updating_data && dirty & /*data*/ 1) {
    				updating_data = true;
    				editor_changes.data = /*data*/ ctx[0];
    				add_flush_callback(() => updating_data = false);
    			}

    			editor.$set(editor_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(editor.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(editor.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div4);
    			if (detaching) detach_dev(t3);
    			if (detaching) detach_dev(div7);
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(t4);
    			destroy_component(editor, detaching);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("App", slots, []);

    	onMount(async () => {
    		window.splide = new Splide("#splide",
    		{
    				direction: "ttb",
    				height: "500px",
    				speed: "1000",
    				pagination: false
    			}).mount();
    	});

    	let data = {};

    	data.entries = [
    		{
    			id: "item-1",
    			title: "Veel mooier nog",
    			body: "Veel mooier nog<br>Dan stadions<br />Volgepakt met mensen",
    			image: "https://images.pexels.com/photos/399187/pexels-photo-399187.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=800"
    		},
    		{
    			id: "item-2",
    			title: "",
    			body: "Mensen met petten<br>en van die hysterische sjaaltjes",
    			image: "https://images.pexels.com/photos/399187/pexels-photo-399187.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=800"
    		},
    		{
    			id: "item-3",
    			title: "",
    			body: "Nee, veel mooier nog dan dat<br><br>is een streekvoetbalveld<br />leeg, maar fel verlicht<br />op een winteravond.",
    			image: "https://images.pexels.com/photos/399187/pexels-photo-399187.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=800"
    		}
    	];

    	function addSlide() {
    		data.entries.push({
    			id: "item-" + Date.now(),
    			title: "Lorem ipsum",
    			body: "Lorem ipsum dolor site amet"
    		});

    		$$invalidate(0, data);
    		localSave();

    		window.setTimeout(
    			function () {
    				window.splide.refresh();
    				window.splide.go(window.splide.length, true);
    			},
    			100
    		);
    	}

    	function localSave() {
    		console.log("save to localstorage");
    		localStorage.setItem("data", JSON.stringify(data));
    	}

    	function save() {
    		alert(JSON.stringify(data));
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1$2.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	function editor_data_binding(value) {
    		data = value;
    		$$invalidate(0, data);
    	}

    	$$self.$capture_state = () => ({
    		onMount,
    		Editor,
    		data,
    		addSlide,
    		localSave,
    		save
    	});

    	$$self.$inject_state = $$props => {
    		if ("data" in $$props) $$invalidate(0, data = $$props.data);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [data, addSlide, save, editor_data_binding];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment$3.name
    		});
    	}
    }

    const app = new App({
    	target: document.body,
    	props: {
    		name: 'world'
    	}
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
