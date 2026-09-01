(function frameworkCore(global) {
    const fn = {};

    fn.localStorage = {};
    fn.element = {};
    fn.util = {};
    fn.data = {};
    fn.data._ = {};
    fn.component = {};
    fn.component._ = {};
    fn.component.data = {};
    fn.component.layout = {};
    fn.component.layout._ = {};
    fn.component.layout.data = {};

    fn.log = function(scope, action, ...args) {
        console.log('[fn.' + scope + ']', action, ...args);
    };

    fn.render = function(opt = {}) {
        var render = new Function('return (' + opt.source + ')')();
        return render.apply(null, opt.args || [ opt.data ]);
    };

    fn.element.create = function(opt = {}) {
        var el = document.createElement(opt.tagName);
        el._ = {};
        if (opt.attribute) {
            for (const [key, value] of Object.entries(opt.attribute)) {
                el.setAttribute(key, value);
            }
        }

        if (opt.style) {
            for (const [key, value] of Object.entries(opt.style)) {
                el.style[key] = value;
            }
        }
        if (opt.hoverStyle) {
            el.addEventListener('mouseenter', function() {
                for (const [key, value] of Object.entries(opt.hoverStyle)) {
                    el.style[key] = value;
                }
            });
            el.addEventListener('mouseleave', function() {
                for (const key of Object.keys(opt.hoverStyle)) {
                    el.style[key] = (opt.style && opt.style[key]) || '';
                }
            });
        }
        if (opt.parent) {
            opt.parent.appendChild(el);
        }
        if (opt.text) {
            el.textContent = opt.text;
        }
        if (opt.event) {
            for (const [eventType, eventHandler] of Object.entries(opt.event)) {
                el.addEventListener(eventType, eventHandler);
            }
        }
        el._.opt = opt;
        if (opt.datas) {
            el._.datas = opt.datas || [];
        }
        if (opt.data) {
            el._.data = opt.data || {};
        }
        if (opt.caller) {
            el._.caller = opt.caller;
        }
        return el;
    };

    fn.util.draggable = function(opt = {}) {
        var el = opt.el;
        var handle = opt.handle || el;
        var startX, startY, startLeft, startTop;

        function onPointerMove(e) {
            var scale = parseFloat(el.style.zoom) || 1;
            el.style.left = (startLeft + (e.clientX - startX) / scale) + 'px';
            el.style.top = (startTop + (e.clientY - startY) / scale) + 'px';
        }

        function onPointerUp() {
            document.removeEventListener('pointermove', onPointerMove);
            document.removeEventListener('pointerup', onPointerUp);
        }

        handle.style.touchAction = 'none';
        handle.addEventListener('pointerdown', function(e) {
            if (e.target.closest('button, input, select, textarea')) {
                return;
            }
            e.preventDefault();
            startX = e.clientX;
            startY = e.clientY;
            startLeft = parseFloat(el.style.left) || 0;
            startTop = parseFloat(el.style.top) || 0;
            document.addEventListener('pointermove', onPointerMove);
            document.addEventListener('pointerup', onPointerUp);
        });
    };

    fn.util.download = function(opt = {}) {
        var blob = new Blob([ opt.content ], { type : opt.type || 'text/plain' });
        var url = URL.createObjectURL(blob);
        var link = fn.element.create({
            tagName : 'a',
            attribute : { href : url, download : opt.filename },
        });
        link.click();
        URL.revokeObjectURL(url);
    };

    fn.util.readFileAsText = function(opt = {}) {
        return new Promise(function(resolve) {
            var reader = new FileReader();
            reader.onload = function() {
                resolve(reader.result);
            };
            reader.readAsText(opt.file);
        });
    };

    fn.component.layout.set = function(opt = {}) {
        this.data[opt.name] = opt.layout;
    };

    fn.component.layout.get = function(opt = {}) {
        return this.data[opt.name];
    };

    fn.component.create = function(opt = {}) {
        var layout = this.layout.get(opt);
        if (!layout) {
            throw new Error('Unknown component layout: ' + opt.name);
        }
        var el = layout(opt);

        if (opt.parent) {
            opt.parent.appendChild(el);
        }
        return el;
    };

    fn.localStorage.get = function(opt = {}) {
        if (typeof(Storage) !== "undefined") {
            return localStorage.getItem(opt.key);
        }
        return null;
    };

    fn.localStorage.set = function(opt = {}) {
        if (typeof(Storage) !== "undefined") {
            localStorage.setItem(opt.key, opt.value);
        }
    };

    fn.localStorage.remove = function(opt = {}) {
        if (typeof(Storage) !== "undefined") {
            localStorage.removeItem(opt.key);
        }
    };

    fn.data._.read = function(opt = {}) {
        var raw = fn.localStorage.get({ key : opt.key });
        return raw ? JSON.parse(raw) : [];
    };

    fn.data._.write = function(opt = {}) {
        fn.localStorage.set({ key : opt.key, value : JSON.stringify(opt.rows) });
    };

    fn.data._.toResource = function(opt = {}) {
        return {
            key : opt.row.data.key,
            columns : JSON.parse(opt.row.data.columns),
        };
    };

    fn.data.select = function(opt = {}) {
        var rows = fn.data._.read({ key : opt.key });
        if (opt.id !== undefined) {
            var row = rows.find(function(row) { return row.id === opt.id; });
            fn.log('data', 'select', opt.key, 'id=' + opt.id, row);
            return row;
        }
        fn.log('data', 'select', opt.key, rows.length + ' rows', rows);
        return rows;
    };

    fn.data.insert = function(opt = {}) {
        var rows = fn.data._.read({ key : opt.key });
        var nextId = rows.reduce(function(max, row) { return Math.max(max, row.id); }, 0) + 1;
        var row = { id : nextId, data : opt.data };
        rows.push(row);
        fn.data._.write({ key : opt.key, rows : rows });
        fn.log('data', 'insert', opt.key, row);
        return row;
    };

    fn.data.update = function(opt = {}) {
        var rows = fn.data._.read({ key : opt.key });
        var row = rows.find(function(r) { return r.id === opt.id; });
        if (row) {
            row.data = opt.data;
            fn.data._.write({ key : opt.key, rows : rows });
        }
        fn.log('data', 'update', opt.key, 'id=' + opt.id, row);
        return row;
    };

    fn.data.delete = function(opt = {}) {
        var rows = fn.data._.read({ key : opt.key });
        var row = rows.find(function(row) { return row.id === opt.id; });
        fn.data._.write({ key : opt.key, rows : rows.filter(function(row) { return row.id !== opt.id; }) });
        fn.log('data', 'delete', opt.key, 'id=' + opt.id);
        return row;
    };

    fn.ajax = async function(opt = {}) {
        var method = (opt.method || 'POST').toUpperCase();
        var url = opt.url;
        if (opt.params) {
            var query = Object.keys(opt.params).map(function(key) {
                return encodeURIComponent(key) + '=' + encodeURIComponent(opt.params[key]);
            }).join('&');
            if (query) {
                url += (url.indexOf('?') === -1 ? '?' : '&') + query;
            }
        }

        var authHeaders = {};
        if (opt.auth && opt.auth.type === 'bearer') {
            authHeaders['Authorization'] = 'Bearer ' + opt.auth.token;
        } else if (opt.auth && opt.auth.type === 'basic') {
            authHeaders['Authorization'] = 'Basic ' + btoa(opt.auth.username + ':' + opt.auth.password);
        }

        var options = { method : method, headers : Object.assign(authHeaders, opt.headers) };
        if (method !== 'GET' && method !== 'HEAD') {
            options.headers['Content-Type'] = options.headers['Content-Type'] || opt.contentType || 'application/json; charset=UTF-8';
            options.body = JSON.stringify(opt.data || {});
        }

        var response = await fetch(url, options);
        var result = await response.json();
        if (!response.ok) {
            throw new Error(result.error || response.statusText);
        }
        return result;
    };

    global.fn = fn;
})(window);


(function frameworkLayouts(global) {
    var fn = global.fn;

    fn.component._.maxZIndex = function(opt = {}) {
        var exclude = opt.exclude || [];
        var max = 0;
        document.querySelectorAll('*').forEach(function(el) {
            if (exclude.some(function(ex) { return ex === el || ex.contains(el); })) {
                return;
            }
            var z = parseInt(getComputedStyle(el).zIndex, 10);
            if (!isNaN(z) && z > max) {
                max = z;
            }
        });
        return max;
    };

    fn.component._.zIndexAbove = function() {
        if (fn.component._.zIndex === undefined) {
            var exclude = (fn.component.data.popup || []).slice();
            if (fn.devtool.data.button) {
                exclude.push(fn.devtool.data.button);
            }
            fn.component._.zIndex = fn.component._.maxZIndex({ exclude : exclude }) + 1;
        }
        return fn.component._.zIndex;
    };

    fn.component._.applyZIndex = function(opt) {
        opt.el.style.zIndex = opt.zIndex !== undefined ? opt.zIndex : fn.component._.zIndexAbove();
    };

    fn.component._.applySetting = function(opt) {
        var settingRows = fn.data.select({ key : '_setting' });
        var setting = settingRows[0] ? settingRows[0].data : {};
        if (setting.scale) {
            opt.el.style.zoom = setting.scale;
        }
        if (setting.opacity) {
            opt.el.style.opacity = setting.opacity;
        }
        fn.component._.applyZIndex({ el : opt.el, zIndex : opt.zIndex });
    };

    fn.component._.applySettingAll = function() {
        var zIndex = fn.component._.zIndexAbove();
        fn.component.data.popup.forEach(function(el) {
            fn.component._.applySetting({ el : el, zIndex : zIndex });
        });
    };

    fn.component._.refreshRoot = function(opt = {}) {
        var root = opt.popup;
        while (root._.caller) {
            root = root._.caller;
        }
        root.refresh();
    };

    fn.component.layout._.style = {
        popupBtn : {
            width : '26px',
            height : '26px',
            border : 'none',
            borderRadius : '4px',
            background : 'transparent',
            color : '#e8eaed',
            fontSize : '13px',
            cursor : 'pointer',
        },
        popupBtnHover : {
            background : '#3a3f4b',
        },
        actionButton : {
            border : 'none',
            borderRadius : '4px',
            color : '#e8eaed',
            fontSize : '13px',
            cursor : 'pointer',
        },
        input : {
            width : '100%',
            boxSizing : 'border-box',
            padding : '5px 8px',
            background : '#14161b',
            border : '1px solid #3a3f4b',
            borderRadius : '4px',
            color : '#e8eaed',
            font : 'inherit',
        },
        table : {
            width : '100%',
            borderCollapse : 'collapse',
        },
    };

    fn.component.layout.set({
        name : 'action-btn',
        layout : function(opt = {}) {
            return fn.element.create({
                tagName : 'button',
                attribute : { type : 'button' },
                text : opt.text,
                style : Object.assign({}, fn.component.layout._.style.actionButton, { padding : opt.padding || '6px 14px', border : '1px solid #3a3f4b', background : '#2b2f38' }),
                event : opt.event,
            });
        }
    });

    fn.component.layout.set({
        name : 'popup-create-btn',
        layout : function(opt = {}) {
            return fn.element.create({
                tagName : 'button',
                attribute : {
                    type : 'button',
                    title : 'New',
                },
                style : fn.component.layout._.style.popupBtn,
                hoverStyle : fn.component.layout._.style.popupBtnHover,
                text : '✏️',
                event : {
                    click : function(e) {
                        var listPopup = e.target.closest('.__popup');
                        fn.component.create({
                            name : 'popup',
                            title : 'New ' + (listPopup._.title || ''),
                            parent : document.body,
                            caller : listPopup,
                            resource : listPopup._.resource,
                            initialize : function(opt) {
                                fn.component.create({
                                    name : 'popup-save-btn',
                                    parent : opt.el.buttons,
                                });
                            },
                            render : function(opt) {
                                fn.component.create({
                                    name : 'form',
                                    resource : listPopup._.resource,
                                    data : {},
                                    parent : opt.el.content,
                                });
                            },
                        });
                    }
                },
            });
        }
    });

    fn.component.layout.set({
        name : 'popup-save-btn',
        layout : function(opt = {}) {
            return fn.element.create({
                tagName : 'button',
                attribute : {
                    type : 'button',
                    title : 'Save',
                },
                style : fn.component.layout._.style.popupBtn,
                hoverStyle : fn.component.layout._.style.popupBtnHover,
                text : '💾',
                event : {
                    click : function(e) {
                        var popup = e.target.closest('.__popup');
                        var form = popup.querySelector('.__form');
                        var data = form.getData();
                        if (form._.data.id !== undefined) {
                            var merged = Object.assign({}, form._.data, data);
                            delete merged.id;
                            fn.data.update({
                                key : form._.resource.key,
                                id : form._.data.id,
                                data : merged,
                            });
                        } else {
                            fn.data.insert({
                                key : form._.resource.key,
                                data : data,
                            });
                        }
                        if (form._.resource.key === '_setting') {
                            fn.component._.applySettingAll();
                        }
                        if (form._.resource.key === '_resource') {
                            fn.component._.refreshRoot({ popup : popup });
                        }
                        if (form._.resource.key === 'reminder' && typeof Notification !== 'undefined' && Notification.permission === 'default') {
                            Notification.requestPermission();
                        }
                        if (popup._.caller) {
                            popup._.caller.refresh();
                        }
                        popup.close();
                    }
                },
            });
        }
    });

    fn.component.layout.set({
        name : 'popup-delete-btn',
        layout : function(opt = {}) {
            return fn.element.create({
                tagName : 'button',
                attribute : {
                    type : 'button',
                    title : 'Delete',
                },
                style : fn.component.layout._.style.popupBtn,
                hoverStyle : fn.component.layout._.style.popupBtnHover,
                text : '🗑️',
                event : {
                    click : function(e) {
                        var popup = e.target.closest('.__popup');
                        var form = popup.querySelector('.__form');
                        if (form._.data.id === undefined) {
                            return;
                        }
                        fn.data.delete({
                            key : form._.resource.key,
                            id : form._.data.id,
                        });
                        if (popup._.caller) {
                            popup._.caller.refresh();
                        }
                        popup.close();
                    }
                },
            });
        }
    });

    fn.component.layout.set({
        name : 'popup-refresh-btn',
        layout : function(opt = {}) {
            return fn.element.create({
                tagName : 'button',
                attribute : {
                    type : 'button',
                    title : 'Refresh',
                },
                style : fn.component.layout._.style.popupBtn,
                hoverStyle : fn.component.layout._.style.popupBtnHover,
                text : '↻',
                event : {
                    click : function(e) {
                        e.target.closest('.__popup').refresh();
                    }
                },
            });
        }
    });

    fn.component.layout.set({
        name : 'popup-close-btn',
        layout : function(opt = {}) {
            return fn.element.create({
                tagName : 'button',
                attribute : {
                    type : 'button',
                    title : 'Close',
                },
                style : fn.component.layout._.style.popupBtn,
                hoverStyle : fn.component.layout._.style.popupBtnHover,
                text : '✕',
                event : {
                    click : function(e) {
                        e.target.closest('.__popup').close();
                    }
                },
            });
        }
    });

    fn.component.layout.set({
        name : 'popup-search-btn',
        layout : function(opt = {}) {
            var popup = opt.parent.closest('.__popup');

            var labels = popup._.resource.columns.filter(function(column) {
                return !!column.list;
            }).map(function(column) {
                return column.label || column.name;
            });

            var searchBar = fn.element.create({
                tagName : 'div',
                style : {
                    display : 'none',
                    padding : '0 12px 12px',
                },
            });
            fn.element.create({
                parent : searchBar,
                tagName : 'input',
                attribute : {
                    type : 'text',
                    placeholder : 'Search ' + labels.join(', '),
                },
                style : fn.component.layout._.style.input,
                event : {
                    input : function(e) {
                        var p = e.target.closest('.__popup');
                        p._.search = e.target.value;
                        p.refresh();
                    },
                },
            });
            popup.content.parentNode.insertBefore(searchBar, popup.content);
            popup.search = searchBar;

            return fn.element.create({
                tagName : 'button',
                attribute : {
                    type : 'button',
                    title : 'Search',
                },
                style : fn.component.layout._.style.popupBtn,
                hoverStyle : fn.component.layout._.style.popupBtnHover,
                text : '🔍',
                event : {
                    click : function(e) {
                        var p = e.target.closest('.__popup');
                        var visible = p.search.style.display !== 'none';
                        p.search.style.display = visible ? 'none' : 'block';
                        if (!visible) {
                            p.search.querySelector('input').focus();
                        }
                    }
                },
            });
        }
    });

    fn.component.layout.set({
        name : 'popup-buttons',
        layout : function(opt = {}) {
            return fn.element.create({
                tagName : 'div',
                style : {
                    display : 'flex',
                    gap : '4px',
                    flexShrink : '0',
                },
            });
        }
    });

    fn.component.layout.set({
        name : 'popup',
        layout : function(opt = {}) {
            var top = 50;
            var left = 50;
            var offset = 30;

            if (opt.caller) {
                var callerTop = parseInt(opt.caller.style.top) || 50;
                var callerLeft = parseInt(opt.caller.style.left) || 50;
                top = callerTop + offset;
                left = callerLeft + offset;
            }

            var popup = fn.element.create({
                tagName : 'div',
                attribute : {
                    class : '__popup',
                    tabindex : '-1',
                },
                style : {
                    position : 'fixed',
                    top : top + 'px',
                    left : left + 'px',
                    display : 'flex',
                    flexDirection : 'column',
                    minWidth : '320px',
                    minHeight : '120px',
                    maxWidth : '80vw',
                    maxHeight : '80vh',
                    background : '#1e2128',
                    color : '#e8eaed',
                    border : '1px solid #3a3f4b',
                    borderRadius : '8px',
                    boxShadow : '0 8px 24px rgba(0, 0, 0, 0.45)',
                    font : "13px/1.5 -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                    resize : 'both',
                    overflow : 'hidden',
                },
                caller : opt.caller,
            });
            fn.component._.applySetting({ el : popup });

            var header = fn.element.create({
                parent : popup,
                tagName : 'div',
                style : {
                    display : 'flex',
                    alignItems : 'center',
                    justifyContent : 'space-between',
                    gap : '8px',
                    padding : '8px 12px',
                    borderBottom : '1px solid #3a3f4b',
                    cursor : 'move',
                },
                event : {
                    pointerdown : function(e) {
                        if (e.target.closest('button, input, select, textarea')) {
                            return;
                        }
                        if (e.ctrlKey) {
                            fn.log('popup', 'inspect', popup._.opt);
                            return;
                        }
                        setTimeout(function() {
                            document.body.appendChild(popup);
                        }, 0);
                    },
                },
            });

            fn.element.create({
                parent : header,
                tagName : 'div',
                style : {
                    fontWeight : '600',
                    overflow : 'hidden',
                    textOverflow : 'ellipsis',
                    whiteSpace : 'nowrap',
                },
                text : opt.title || 'Popup',
            });

            var buttons = fn.component.create({
                name : 'popup-buttons',
                parent : header,
            });

            var content = fn.element.create({
                parent : popup,
                tagName : 'div',
                style : {
                    padding : '12px',
                    overflow : 'auto',
                },
            });

            fn.util.draggable({
                el : popup,
                handle : header,
            });

            popup.header = header;
            popup.buttons = buttons;
            popup.content = content;
            popup._.render = opt.render;
            popup._.resource = opt.resource;
            popup._.title = opt.title;

            if (opt.initialize) {
                opt.initialize({ el : popup });
            }

            fn.component.create({
                name : 'popup-refresh-btn',
                parent : buttons,
            });

            fn.component.create({
                name : 'popup-close-btn',
                parent : buttons,
            });

            var render = function() {
                if (popup._.render) {
                    popup._.render({ el : popup });
                }
            };

            popup.refresh = function() {
                Array.from(popup.content.children).forEach(function(child) {
                    child.remove();
                });
                render();
            };

            popup.close = function() {
                var idx = fn.component.data.popup.indexOf(popup);
                if (idx !== -1) {
                    fn.component.data.popup.splice(idx, 1);
                }
                fn.log('component', 'close', 'popup', fn.component.data.popup.length + ' alive', popup);
                popup.remove();
            };

            render();

            if (!fn.component.data.popup) {
                fn.component.data.popup = [];
            }
            fn.component.data.popup.push(popup);
            fn.log('component', 'create', 'popup', fn.component.data.popup.length + ' alive', popup);

            return popup;
        }
    });

    fn.component._.jsonPreview = function(value) {
        if (Array.isArray(value)) {
            var keys = [];
            value.forEach(function(item) {
                if (item && typeof item === 'object' && !Array.isArray(item)) {
                    Object.keys(item).forEach(function(key) {
                        if (keys.indexOf(key) === -1) {
                            keys.push(key);
                        }
                    });
                }
            });
            var columns = keys.length
                ? keys.map(function(key) { return { name : key, label : key, list : {} }; })
                : [ { name : 'value', label : 'Value', list : {} } ];
            var datas = value.map(function(item, index) {
                if (item && typeof item === 'object' && !Array.isArray(item)) {
                    var row = { id : index };
                    keys.forEach(function(key) {
                        var v = item[key];
                        row[key] = (v && typeof v === 'object') ? JSON.stringify(v) : v;
                    });
                    return row;
                }
                return { id : index, value : item };
            });
            return { columns : columns, datas : datas };
        }
        return {
            columns : [ { name : 'key', label : 'Key', list : {} }, { name : 'value', label : 'Value', list : {} } ],
            datas : Object.keys(value).map(function(key) {
                var v = value[key];
                return { id : key, key : key, value : (v && typeof v === 'object') ? JSON.stringify(v) : v };
            }),
        };
    };

    fn.component._.jsonToggle = function(opt = {}) {
        var wrapper = fn.element.create({ tagName : 'div', parent : opt.parent });

        var textarea = fn.element.create({
            tagName : 'textarea',
            attribute : opt.name ? { name : opt.name } : {},
            style : Object.assign({}, fn.component.layout._.style.input, { resize : 'vertical', minHeight : opt.height || '60px' }),
            parent : wrapper,
        });
        textarea.value = opt.value !== undefined ? opt.value : '';

        var toggleText = opt.type === 'jsonarray' ? 'View as List' : 'View as Form';
        var structured = fn.element.create({ tagName : 'div', style : { display : 'none', marginTop : '6px' }, parent : wrapper });

        fn.component.create({
            name : 'action-btn',
            text : toggleText,
            padding : '4px 10px',
            parent : wrapper,
            event : {
                click : function(e) {
                    e.stopPropagation();
                    if (structured.style.display !== 'none') {
                        structured.style.display = 'none';
                        textarea.style.display = '';
                        e.target.textContent = toggleText;
                        return;
                    }
                    var parsed;
                    try {
                        parsed = JSON.parse(textarea.value);
                    } catch (err) {
                        window.alert('Invalid JSON: ' + err.message);
                        return;
                    }
                    Array.from(structured.children).forEach(function(child) { child.remove(); });
                    if (Array.isArray(parsed)) {
                        var preview = fn.component._.jsonPreview(parsed);
                        fn.component.create({
                            name : 'list',
                            resource : { key : '', columns : preview.columns },
                            datas : preview.datas,
                            readonly : true,
                            parent : structured,
                        });
                    } else {
                        var isObjectKey = {};
                        Object.keys(parsed).forEach(function(key) {
                            isObjectKey[key] = !!(parsed[key] && typeof parsed[key] === 'object');
                        });
                        var objColumns = Object.keys(parsed).map(function(key) {
                            return { name : key, label : key, form : { type : 'text' } };
                        });
                        var objData = {};
                        Object.keys(parsed).forEach(function(key) {
                            objData[key] = isObjectKey[key] ? JSON.stringify(parsed[key]) : parsed[key];
                        });
                        var nestedForm = fn.component.create({
                            name : 'form',
                            resource : { key : '', columns : objColumns },
                            data : objData,
                            parent : structured,
                        });
                        if (opt.readonly) {
                            Object.keys(nestedForm._.inputs).forEach(function(key) {
                                nestedForm._.inputs[key].setAttribute('readonly', 'readonly');
                            });
                        } else {
                            var sync = function() {
                                var next = {};
                                Object.keys(nestedForm._.inputs).forEach(function(key) {
                                    var raw = nestedForm._.inputs[key].value;
                                    var original = parsed[key];
                                    if (isObjectKey[key]) {
                                        try {
                                            next[key] = JSON.parse(raw);
                                        } catch (err) {
                                            next[key] = original;
                                        }
                                    } else if (typeof original === 'number') {
                                        var num = Number(raw);
                                        next[key] = isNaN(num) ? raw : num;
                                    } else if (typeof original === 'boolean') {
                                        next[key] = raw === 'true' ? true : (raw === 'false' ? false : raw);
                                    } else {
                                        next[key] = raw;
                                    }
                                });
                                textarea.value = JSON.stringify(next, null, 2);
                            };
                            Object.keys(nestedForm._.inputs).forEach(function(key) {
                                nestedForm._.inputs[key].addEventListener('input', sync);
                            });
                        }
                    }
                    structured.style.display = '';
                    textarea.style.display = 'none';
                    e.target.textContent = 'View as JSON';
                }
            },
        });

        return textarea;
    };

    fn.component.layout.set({
        name : 'form',
        layout : function(opt = {resource : {key : '', columns : []}, data : {}}) {
            var el = fn.element.create({
                tagName : 'table',
                attribute : {
                    class : '__form',
                },
                style : fn.component.layout._.style.table,
                data : opt.data,
            });

            el._.resource = opt.resource;
            el._.inputs = {};

            opt.resource.columns.forEach(function(column) {
                if (!column.form) {
                    return;
                }

                var row = fn.element.create({
                    tagName : 'tr',
                    parent : el,
                });

                var cellStyle = {
                    padding : '6px 0',
                    verticalAlign : 'middle',
                };

                fn.element.create({
                    tagName : 'td',
                    style : Object.assign({}, cellStyle, {
                        width : '30%',
                        color : '#9aa0a6',
                        paddingRight : '8px',
                    }),
                    text : column.label || column.name,
                    parent : row,
                });

                var valueCell = fn.element.create({
                    tagName : 'td',
                    style : cellStyle,
                    parent : row,
                });

                var input;
                if (column.form.render) {
                    input = fn.render({ source : column.form.render, data : opt.data });
                    valueCell.appendChild(input);
                } else {
                    var inputStyle = Object.assign({}, fn.component.layout._.style.input);
                    if (column.form.width) {
                        inputStyle.width = column.form.width;
                    }

                    if (column.form.type === 'select') {
                        input = fn.element.create({
                            tagName : 'select',
                            attribute : { name : column.name },
                            style : inputStyle,
                            parent : valueCell,
                        });
                        var options = column.form.resource
                            ? fn.data.select({ key : column.form.resource.key }).map(function(row) {
                                return { value : row.id, text : row.data[column.form.resource.label] };
                            })
                            : fn.data.select({ key : 'code' }).filter(function(row) {
                                return row.data.group === column.form.codeGroup;
                            }).map(function(row) {
                                return { value : row.data.code, text : row.data.name };
                            });
                        options.forEach(function(option) {
                            fn.element.create({
                                tagName : 'option',
                                attribute : { value : option.value },
                                text : option.text,
                                parent : input,
                            });
                        });
                    } else if (column.form.type === 'jsonobject' || column.form.type === 'jsonarray') {
                        input = fn.component._.jsonToggle({
                            name : column.name,
                            type : column.form.type,
                            height : column.form.height,
                            parent : valueCell,
                        });
                    } else if (column.form.type === 'button') {
                        input = fn.component.create({
                            name : 'action-btn',
                            text : column.form.text,
                            padding : column.form.padding,
                            parent : valueCell,
                            event : {
                                click : function(e) {
                                    e.stopPropagation();
                                    fn.render({ source : column.form.click, args : [ opt.data, e ] });
                                }
                            },
                        });
                    } else {
                        var isTextarea = column.form.type === 'textarea';
                        if (isTextarea) {
                            inputStyle.resize = 'vertical';
                            inputStyle.minHeight = column.form.height || '60px';
                        }

                        input = fn.element.create({
                            tagName : isTextarea ? 'textarea' : 'input',
                            attribute : isTextarea ? { name : column.name } : { type : column.form.type || 'text', name : column.name },
                            style : inputStyle,
                            parent : valueCell,
                        });
                    }
                }

                if (input.tagName !== 'BUTTON' && opt.data[column.name] !== undefined) {
                    input.value = opt.data[column.name];
                }

                el._.inputs[column.name] = input;
            });

            el.getData = function() {
                var result = {};
                opt.resource.columns.forEach(function(column) {
                    if (!column.form) {
                        return;
                    }
                    var input = el._.inputs[column.name];
                    if (input.tagName === 'BUTTON') {
                        return;
                    }
                    result[column.name] = column.form.resource ? Number(input.value) : input.value;
                });
                return result;
            };

            return el;
        }
    });

    fn.component.layout.set({
        name : 'list',
        layout : function(opt = {resource : {key : '', columns : []}, datas : []}) {
            var el = fn.element.create({
                tagName : 'table',
                style : fn.component.layout._.style.table,
                datas : opt.datas,
            });

            if (opt.resource.columns.some(function(column) { return !!column.list; })) {
                var thead = fn.element.create({
                    tagName : 'thead',
                    parent : el,
                });
                var headRow = fn.element.create({
                    tagName : 'tr',
                    parent : thead,
                });
                opt.resource.columns.forEach(function(column) {
                    if (!column.list) {
                        return;
                    }
                    fn.element.create({
                        tagName : 'th',
                        text : column.label || column.name,
                        style : {
                            width : column.list.width || 'auto',
                            textAlign : 'left',
                            padding : '6px 8px',
                            color : '#9aa0a6',
                            borderBottom : '1px solid #3a3f4b',
                        },
                        parent : headRow,
                    });
                });
            }

            var tbody = fn.element.create({
                tagName : 'tbody',
                parent : el,
            });

            opt.datas.forEach(function(data) {
                var clickable = !!opt.resource.key && !opt.readonly;
                var row = fn.element.create({
                    tagName : 'tr',
                    style : clickable ? { cursor : 'pointer' } : {},
                    hoverStyle : clickable ? { background : '#2b2f38' } : undefined,
                    event : {
                        click : function(e) {
                            if (!clickable) {
                                return;
                            }
                            if (e.ctrlKey) {
                                fn.log('list', 'inspect', e.target.closest('tr')._.data);
                                return;
                            }
                            var resource = opt.resource;
                            fn.component.create({
                                name : 'popup',
                                title : 'Edit ' + (opt.title || ''),
                                parent : document.body,
                                caller : e.target.closest('.__popup'),
                                resource : resource,
                                initialize : function(opt) {
                                    fn.component.create({
                                        name : 'popup-save-btn',
                                        parent : opt.el.buttons,
                                    });
                                    fn.component.create({
                                        name : 'popup-delete-btn',
                                        parent : opt.el.buttons,
                                    });
                                },
                                render : function(opt) {
                                    var row = fn.data.select({ key : resource.key, id : data.id });
                                    var formData = row ? Object.assign({ id : row.id }, row.data) : data;
                                    fn.component.create({
                                        name : 'form',
                                        resource : resource,
                                        data : formData,
                                        parent : opt.el.content,
                                    });
                                },
                            });
                        },
                    },
                    data : data,
                    parent : tbody,
                });

                var cellStyle = {
                    padding : '6px 8px',
                    borderBottom : '1px solid #2b2f38',
                };

                opt.resource.columns.forEach(function(column) {
                    if (!column.list) {
                        return;
                    }
                    var cell = fn.element.create({
                        tagName : 'td',
                        style : cellStyle,
                        parent : row,
                    });
                    if (column.list.render) {
                        var rendered = fn.render({ source : column.list.render, data : data });
                        if (rendered instanceof HTMLElement) {
                            cell.appendChild(rendered);
                        } else {
                            cell.textContent = rendered;
                        }
                    } else if (column.list.type === 'jsonobject' || column.list.type === 'jsonarray') {
                        fn.component.create({
                            name : 'action-btn',
                            text : 'View',
                            padding : '2px 8px',
                            parent : cell,
                            event : {
                                click : function(e) {
                                    e.stopPropagation();
                                    fn.component.create({
                                        name : 'popup',
                                        title : column.label || column.name,
                                        parent : document.body,
                                        caller : e.target.closest('.__popup'),
                                        render : function(popupOpt) {
                                            fn.component._.jsonToggle({
                                                name : column.name,
                                                type : column.list.type,
                                                value : data[column.name],
                                                height : '160px',
                                                readonly : true,
                                                parent : popupOpt.el.content,
                                            });
                                        },
                                    });
                                }
                            }
                        });
                    } else if (column.list.type === 'button') {
                        fn.component.create({
                            name : 'action-btn',
                            text : column.list.text,
                            padding : column.list.padding || '4px 10px',
                            parent : cell,
                            event : {
                                click : function(e) {
                                    e.stopPropagation();
                                    fn.render({ source : column.list.click, args : [ data, e ] });
                                }
                            },
                        });
                    } else if (column.form && column.form.resource && data[column.name] !== undefined) {
                        var referencedRow = fn.data.select({ key : column.form.resource.key, id : data[column.name] });
                        cell.textContent = referencedRow ? referencedRow.data[column.form.resource.label] : data[column.name];
                    } else {
                        cell.textContent = data[column.name] !== undefined ? data[column.name] : '';
                    }
                });
            });

            return el;
        }
    });

})(window);

(function devtoolExampleApp(global) {
    var fn = global.fn;

    fn.devtool = {};
    fn.devtool._ = {};
    fn.devtool.data = {};

    fn.component.layout.set({
        name : 'popup-setting-btn',
        layout : function(opt = {}) {
            return fn.element.create({
                tagName : 'button',
                attribute : {
                    type : 'button',
                    title : 'Setting',
                },
                style : fn.component.layout._.style.popupBtn,
                hoverStyle : fn.component.layout._.style.popupBtnHover,
                text : '⚙',
                event : {
                    click : function(e) {
                        var caller = e.target.closest('.__popup');
                        fn.devtool._.ensureEssential();
                        var resource = fn.devtool._.resourceFor('_setting').resource;
                        fn.component.create({
                            name : 'popup',
                            title : 'Edit Setting',
                            parent : document.body,
                            caller : caller,
                            resource : resource,
                            initialize : function(opt) {
                                fn.component.create({
                                    name : 'popup-save-btn',
                                    parent : opt.el.buttons,
                                });
                            },
                            render : function(opt) {
                                var rows = fn.data.select({ key : resource.key });
                                var formData = rows[0] ? Object.assign({ id : rows[0].id }, rows[0].data) : {};
                                fn.component.create({
                                    name : 'form',
                                    resource : resource,
                                    data : formData,
                                    parent : opt.el.content,
                                });
                            },
                        });
                    }
                },
            });
        }
    });

    fn.component.layout.set({
        name : 'menu',
        layout : function(opt = {}) {
            var el = fn.element.create({
                tagName : 'div',
                style : {
                    display : 'flex',
                    flexDirection : 'column',
                    gap : '2px',
                },
                datas : opt.datas,
            });
            if (opt.datas && Array.isArray(opt.datas)) {
                opt.datas.forEach(function(data) {
                    fn.element.create({
                        parent : el,
                        tagName : 'div',
                        style : {
                            padding : '8px 10px',
                            borderRadius : '4px',
                            cursor : 'pointer',
                        },
                        hoverStyle : {
                            background : '#2b2f38',
                        },
                        text : data.name,
                        event : {
                            click : function(opt){
                                return function(e){
                                    fn.devtool.openResource({
                                        resource : opt.data.resource,
                                        name : opt.data.name,
                                        caller : opt.caller,
                                    });
                                }
                            }({caller : opt.caller, data : data}),
                        },
                        data : data,
                    });
                });
            }
            return el;
        }
    });

    fn.component.layout.set({
        name : 'devtool',
        layout : function(opt = {}) {
            return fn.component.create({
                name : 'popup',
                title : 'DevTool',
                initialize : function(opt) {
                    fn.component.create({
                        name : 'popup-setting-btn',
                        parent : opt.el.buttons,
                    });
                },
                render : function(opt) {
                    var hiddenKeys = [ 'code', 'history' ];
                    var builtinDatas = fn.devtool._.builtinResources().filter(function(def) {
                        return hiddenKeys.indexOf(def.key) === -1;
                    }).map(function(def) {
                        return {
                            id : def.key,
                            name : def.name,
                            resource : { key : def.key, columns : def.columns },
                        };
                    });
                    var customDatas = fn.data.select({ key : '_resource' }).map(function(row) {
                        return {
                            id : row.id,
                            name : row.data.name,
                            resource : fn.data._.toResource({ row : row }),
                        };
                    });
                    var datas = builtinDatas.concat(customDatas);

                    fn.component.create({
                        name : 'menu',
                        caller : opt.el,
                        datas : datas,
                        parent : opt.el.content,
                    });
                },
            });
        }
    });

    fn.devtool.open = function() {
        fn.devtool._.ensureEssential();
        fn.component.create({
            name : 'devtool',
            parent : document.body,
        });
    };

    fn.devtool.openResource = function(opt = {}) {
        fn.component.create({
            name : 'popup',
            title : opt.name,
            parent : document.body,
            caller : opt.caller,
            resource : opt.resource,
            initialize : function(initOpt) {
                fn.component.create({
                    name : 'popup-create-btn',
                    parent : initOpt.el.buttons,
                });
                fn.component.create({
                    name : 'popup-search-btn',
                    parent : initOpt.el.buttons,
                });
            },
            render : function(renderOpt) {
                var rows = fn.data.select({ key : opt.resource.key });
                var search = (renderOpt.el._.search || '').toLowerCase();
                if (search) {
                    rows = rows.filter(function(row) {
                        return JSON.stringify(row.data).toLowerCase().indexOf(search) !== -1;
                    });
                }
                var listDatas = rows.map(function(row) {
                    return Object.assign({ id : row.id }, row.data);
                });
                fn.component.create({
                    name : 'list',
                    title : opt.name,
                    resource : opt.resource,
                    datas : listDatas,
                    parent : renderOpt.el.content,
                });
            },
        });
    };

    fn.devtool._.codeGroups = function() {
        return {
            method : [ 'GET', 'POST', 'PUT', 'PATCH', 'DELETE' ].map(function(code) { return { code : code, name : code }; }),
            authType : [ { code : 'none', name : 'None' }, { code : 'bearer', name : 'Bearer Token' }, { code : 'basic', name : 'Basic Auth' } ],
        };
    };

    fn.devtool._.resourceFor = function(key) {
        if (key === '_resource') {
            var resource = {
                key : '_resource',
                columns : [
                    { name : 'name', label : 'Name', list : { width : '160px' }, form : { type : 'text' } },
                    { name : 'key', label : 'Key', list : { width : '120px' }, form : { type : 'text' } },
                    { name : 'columns', label : 'Columns (JSON)', list : { width : 'auto' }, form : { type : 'textarea', height : '260px' } },
                ],
            };
            return { resource : resource, name : 'Resource' };
        }
        if (key === '_setting') {
            var resource = {
                key : '_setting',
                columns : [
                    { name : 'scale', label : 'Default popup scale', list : { width : '160px' }, form : { type : 'text' } },
                    { name : 'opacity', label : 'Default popup opacity', list : { width : '160px' }, form : { type : 'text' } },
                    { name : 'manageResources', label : 'Resources', form : { type : 'render', render : 'function(data) { return fn.devtool._.manageResourceButton({ key: "_resource", text: "Manage resources" }); }' } },
                    { name : 'manageCodes', label : 'Codes', form : { type : 'render', render : 'function(data) { return fn.devtool._.manageResourceButton({ key: "code", text: "Manage codes" }); }' } },
                    { name : 'sampleData', label : 'Sample Data', form : { type : 'button', text : 'Generate sample data', click : `function(data, e) {
                        fn.devtool._.generateSampleData();
                        var popup = e.target.closest('.__popup');
                        if (popup._.caller) {
                            popup._.caller.refresh();
                        }
                        popup.close();
                    }` } },
                    { name : 'export', label : 'Export', form : { type : 'button', text : 'Export data', click : `function(data, e) {
                        var backup = {};
                        fn.devtool._.allDataKeys().forEach(function(key) {
                            backup[key] = fn.data.select({ key : key });
                        });
                        fn.util.download({
                            content : JSON.stringify(backup, null, 2),
                            type : 'application/json',
                            filename : 'devtool-backup.json',
                        });
                    }` } },
                    { name : 'import', label : 'Import', form : { type : 'button', text : 'Import data', click : `function(data, e) {
                        var popup = e.target.closest('.__popup');
                        var input = fn.element.create({
                            tagName : 'input',
                            attribute : { type : 'file', accept : 'application/json' },
                            style : { display : 'none' },
                            event : {
                                change : function(changeEvent) {
                                    var file = changeEvent.target.files[0];
                                    if (!file) {
                                        return;
                                    }
                                    if (!window.confirm('Import data? This overwrites every resource with the file\\'s contents.')) {
                                        return;
                                    }
                                    fn.util.readFileAsText({ file : file }).then(function(text) {
                                        var backup = JSON.parse(text);
                                        Object.keys(backup).forEach(function(key) {
                                            fn.data._.write({ key : key, rows : backup[key] });
                                        });
                                        fn.component._.applySettingAll();
                                        if (popup._.caller) {
                                            popup._.caller.refresh();
                                        }
                                        popup.close();
                                    });
                                },
                            },
                        });
                        input.click();
                    }` } },
                    { name : 'reset', label : 'Reset', form : { type : 'button', text : 'Reset all data', click : `function(data, e) {
                        if (!window.confirm('Reset all DevTool data? This clears every resource and reloads the sample data.')) {
                            return;
                        }
                        fn.devtool._.reset();
                        fn.component._.applySettingAll();
                        var popup = e.target.closest('.__popup');
                        if (popup._.caller) {
                            popup._.caller.refresh();
                        }
                        popup.close();
                    }` } },
                ],
            };
            return { resource : resource, name : 'Setting' };
        }
        var builtin = fn.devtool._.builtinResources().find(function(def) { return def.key === key; });
        if (builtin) {
            return { resource : { key : builtin.key, columns : builtin.columns }, name : builtin.name };
        }
        var row = fn.data.select({ key : '_resource' }).find(function(r) { return r.data.key === key; });
        return { resource : fn.data._.toResource({ row : row }), name : row.data.name };
    };

    fn.devtool._.manageResourceButton = function(opt) {
        return fn.component.create({
            name : 'action-btn',
            text : opt.text,
            event : {
                click : function(e) {
                    e.stopPropagation();
                    var resourceInfo = fn.devtool._.resourceFor(opt.key);
                    fn.devtool.openResource({
                        resource : resourceInfo.resource,
                        name : resourceInfo.name,
                        caller : e.target.closest('.__popup'),
                    });
                }
            }
        });
    };

    fn.devtool._.sheetEditor = function(rowData) {
        var initial;
        try {
            initial = JSON.parse(rowData.data);
        } catch (e) {
            initial = undefined;
        }
        var sheet = (Array.isArray(initial) && initial.length) ? initial : [ [ '', '', '' ], [ '', '', '' ], [ '', '', '' ] ];
        var selection = null;
        var dragging = false;

        var container = fn.element.create({ tagName : 'div', style : { overflow : 'auto', maxWidth : '100%' } });
        var table = fn.element.create({ tagName : 'table', parent : container, style : { borderCollapse : 'collapse' } });

        function normalize(sel) {
            return {
                r1 : Math.min(sel.r1, sel.r2),
                r2 : Math.max(sel.r1, sel.r2),
                c1 : Math.min(sel.c1, sel.c2),
                c2 : Math.max(sel.c1, sel.c2),
            };
        }

        function inSelection(r, c) {
            if (!selection) {
                return false;
            }
            var n = normalize(selection);
            return r >= n.r1 && r <= n.r2 && c >= n.c1 && c <= n.c2;
        }

        function sync() {
            container.value = JSON.stringify(sheet);
        }

        function paintSelection() {
            Array.from(table.rows).forEach(function(tr, r) {
                Array.from(tr.cells).forEach(function(td, c) {
                    td.style.background = inSelection(r, c) ? '#2b3f5c' : 'transparent';
                });
            });
        }

        function insertRow(at) {
            sheet.splice(at, 0, new Array(sheet[0].length).fill(''));
            selection = null;
            render();
        }

        function deleteRow(at) {
            if (sheet.length <= 1) {
                return;
            }
            sheet.splice(at, 1);
            selection = null;
            render();
        }

        function insertColumn(at) {
            sheet.forEach(function(row) { row.splice(at, 0, ''); });
            selection = null;
            render();
        }

        function deleteColumn(at) {
            if (sheet[0].length <= 1) {
                return;
            }
            sheet.forEach(function(row) { row.splice(at, 1); });
            selection = null;
            render();
        }

        var gridMenu = null;

        function closeGridMenu() {
            if (gridMenu) {
                gridMenu.remove();
                gridMenu = null;
            }
        }

        document.addEventListener('mousedown', function(e) {
            if (gridMenu && !gridMenu.contains(e.target)) {
                closeGridMenu();
            }
        });

        function openGridMenu(opt) {
            closeGridMenu();
            gridMenu = fn.element.create({
                tagName : 'div',
                parent : document.body,
                style : {
                    position : 'fixed',
                    top : opt.y + 'px',
                    left : opt.x + 'px',
                    minWidth : '140px',
                    background : '#1e2128',
                    color : '#e8eaed',
                    border : '1px solid #3a3f4b',
                    borderRadius : '4px',
                    boxShadow : '0 4px 12px rgba(0, 0, 0, 0.45)',
                    font : "13px/1.5 -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                    zIndex : fn.component._.zIndexAbove() + 1,
                },
            });
            [
                { text : 'Add row', action : function() { insertRow(opt.r + 1); } },
                { text : 'Delete row', action : function() { deleteRow(opt.r); } },
                { text : 'Add column', action : function() { insertColumn(opt.c + 1); } },
                { text : 'Delete column', action : function() { deleteColumn(opt.c); } },
            ].forEach(function(item) {
                fn.element.create({
                    tagName : 'div',
                    parent : gridMenu,
                    text : item.text,
                    style : { padding : '6px 12px', cursor : 'pointer' },
                    hoverStyle : { background : '#3a3f4b' },
                    event : { click : function() { item.action(); closeGridMenu(); } },
                });
            });
        }

        function render() {
            Array.from(table.children).forEach(function(child) { child.remove(); });
            sheet.forEach(function(row, r) {
                var tr = fn.element.create({ tagName : 'tr', parent : table });
                row.forEach(function(value, c) {
                    var td = fn.element.create({
                        tagName : 'td',
                        parent : tr,
                        style : { border : '1px solid #3a3f4b', padding : '0', background : inSelection(r, c) ? '#2b3f5c' : 'transparent' },
                    });
                    var cellInput = fn.element.create({
                        tagName : 'input',
                        attribute : { type : 'text' },
                        style : { border : 'none', background : 'transparent', color : '#e8eaed', width : '80px', padding : '4px 6px', outline : 'none' },
                        parent : td,
                    });
                    cellInput.value = value;
                    cellInput.addEventListener('input', function() {
                        sheet[r][c] = cellInput.value;
                        sync();
                    });
                    cellInput.addEventListener('mousedown', function() {
                        dragging = true;
                        selection = { r1 : r, c1 : c, r2 : r, c2 : c };
                        paintSelection();
                    });
                    cellInput.addEventListener('mouseenter', function() {
                        if (dragging && selection) {
                            selection.r2 = r;
                            selection.c2 = c;
                            paintSelection();
                            cellInput.focus();
                        }
                    });
                    cellInput.addEventListener('contextmenu', function(e) {
                        e.preventDefault();
                        openGridMenu({ x : e.clientX, y : e.clientY, r : r, c : c });
                    });
                });
            });
            sync();
        }

        document.addEventListener('mouseup', function() {
            dragging = false;
        });

        container.addEventListener('copy', function(e) {
            if (!selection) {
                return;
            }
            var n = normalize(selection);
            var lines = [];
            for (var r = n.r1; r <= n.r2; r++) {
                var cells = [];
                for (var c = n.c1; c <= n.c2; c++) {
                    cells.push(sheet[r][c] || '');
                }
                lines.push(cells.join('\t'));
            }
            e.clipboardData.setData('text/plain', lines.join('\n'));
            e.preventDefault();
        });

        container.addEventListener('paste', function(e) {
            if (!selection) {
                return;
            }
            var n = normalize(selection);
            var text = e.clipboardData.getData('text/plain');
            var rows = text.replace(/\r/g, '').split('\n');
            if (rows[rows.length - 1] === '') {
                rows.pop();
            }
            var pasted = rows.map(function(row) { return row.split('\t'); });

            var neededRows = n.r1 + pasted.length;
            var neededCols = n.c1 + Math.max.apply(null, pasted.map(function(row) { return row.length; }));
            while (sheet.length < neededRows) {
                sheet.push(new Array(sheet[0] ? sheet[0].length : neededCols).fill(''));
            }
            sheet.forEach(function(row) {
                while (row.length < neededCols) {
                    row.push('');
                }
            });

            pasted.forEach(function(row, ri) {
                row.forEach(function(value, ci) {
                    sheet[n.r1 + ri][n.c1 + ci] = value;
                });
            });

            selection = { r1 : n.r1, c1 : n.c1, r2 : n.r1 + pasted.length - 1, c2 : n.c1 + pasted[0].length - 1 };
            render();
            e.preventDefault();
        });

        render();
        return container;
    };

    fn.devtool._.builtinResources = function() {
        return [
            {
                name : 'Memo',
                key : 'memo',
                columns : [
                    { name : 'name', label : 'Name', list : { width : '160px' }, form : { type : 'text' } },
                    { name : 'content', label : 'Content', list : { width : 'auto' }, form : { type : 'textarea' } },
                ],
            },
            {
                name : 'Sheet',
                key : 'sheet',
                columns : [
                    { name : 'name', label : 'Name', list : { width : '160px' }, form : { type : 'text' } },
                    { name : 'data', label : 'Sheet', form : { type : 'render', render : 'function(data) { return fn.devtool._.sheetEditor(data); }' } },
                ],
            },
            {
                name : 'Bookmark',
                key : 'bookmark',
                columns : [
                    { name : 'name', label : 'Name', list : { width : '160px' }, form : { type : 'text' } },
                    { name : 'url', label : 'URL', list : { width : 'auto' }, form : { type : 'text' } },
                    { name : 'run', label : 'Run', list : { width : '70px', type : 'button', text : 'Run', click : `function(data) {
                        window.open(data.url, '_blank');
                    }` } },
                ],
            },
            {
                name : 'Reminder',
                key : 'reminder',
                columns : [
                    { name : 'title', label : 'Title', list : { width : '200px' }, form : { type : 'text' } },
                    { name : 'datetime', label : 'When', list : { width : '180px' }, form : { type : 'datetime-local' } },
                    { name : 'notified', label : 'Status', list : { width : '90px', type : 'render', render : 'function(data) { return data.notified ? "Sent" : "Pending"; }' } },
                ],
            },
            {
                name : 'Capture',
                key : 'capture',
                columns : [
                    { name : 'label', label : 'Label', list : { width : '260px' }, form : { type : 'text' } },
                    { name : 'data', label : 'Data (JSON)', list : { type : 'jsonarray' }, form : { type : 'jsonarray' } },
                ],
            },
            {
                name : 'Code',
                key : 'code',
                columns : [
                    { name : 'group', label : 'Group', list : { width : '140px' }, form : { type : 'text' } },
                    { name : 'code', label : 'Code', list : { width : '120px' }, form : { type : 'text' } },
                    { name : 'name', label : 'Name', list : { width : 'auto' }, form : { type : 'text' } },
                ],
            },
            {
                name : 'Request',
                key : 'request',
                columns : [
                    { name : 'name', label : 'Name', list : { width : '160px' }, form : { type : 'text' } },
                    { name : 'method', label : 'Method', list : { width : '90px' }, form : { type : 'select', codeGroup : 'method' } },
                    { name : 'url', label : 'URL', list : { width : 'auto' }, form : { type : 'text' } },
                    { name : 'params', label : 'Params (JSON)', form : { type : 'jsonobject' } },
                    { name : 'authType', label : 'Auth Type', list : { width : '110px' }, form : { type : 'select', codeGroup : 'authType' } },
                    { name : 'auth', label : 'Auth (JSON)', form : { type : 'jsonobject' } },
                    { name : 'headers', label : 'Headers (JSON)', form : { type : 'jsonobject' } },
                    { name : 'body', label : 'Body (JSON)', form : { type : 'jsonobject' } },
                    { name : 'run', label : 'Run', list : { width : '70px', type : 'button', text : 'Run', click : `function(data, e) {
                        var caller = e.target.closest('.__popup');
                        var show = function(title, text, isError) {
                            fn.component.create({
                                name : 'popup',
                                title : title,
                                parent : document.body,
                                caller : caller,
                                render : function(opt) {
                                    fn.element.create({
                                        tagName : 'pre',
                                        parent : opt.el.content,
                                        style : Object.assign({ whiteSpace : 'pre-wrap', wordBreak : 'break-word', margin : '0' }, isError ? { color : '#e57373' } : {}),
                                        text : text,
                                    });
                                }
                            });
                        };
                        var saveHistory = function(ok, body) {
                            fn.data.insert({ key : 'history', data : { requestId : data.id, time : new Date().toISOString(), ok : ok, body : body } });
                            var historyRows = fn.data.select({ key : 'history' }).filter(function(row) { return row.data.requestId === data.id; });
                            if (historyRows.length > 20) {
                                fn.data.delete({ key : 'history', id : historyRows[0].id });
                            }
                        };
                        (async function() {
                            try {
                                var auth = (data.authType && data.authType !== 'none') ? Object.assign({ type : data.authType }, data.auth ? JSON.parse(data.auth) : {}) : undefined;
                                var result = await fn.ajax({
                                    method : data.method,
                                    url : data.url,
                                    params : data.params ? JSON.parse(data.params) : undefined,
                                    auth : auth,
                                    headers : data.headers ? JSON.parse(data.headers) : undefined,
                                    data : data.body ? JSON.parse(data.body) : undefined
                                });
                                var text = JSON.stringify(result, null, 2);
                                show('Response: ' + data.name, text, false);
                                saveHistory(true, text);
                            } catch (err) {
                                show('Error: ' + data.name, err.message, true);
                                saveHistory(false, err.message);
                            }
                        })();
                    }` } },
                    { name : 'history', label : 'History', list : { width : '80px', type : 'button', text : 'History', click : `function(data, e) {
                        var caller = e.target.closest('.__popup');
                        var history = fn.data.select({ key : 'history' }).filter(function(row) { return row.data.requestId === data.id; }).map(function(row) { return row.data; });
                        fn.component.create({
                            name : 'popup',
                            title : 'History: ' + data.name,
                            parent : document.body,
                            caller : caller,
                            render : function(opt) {
                                if (history.length === 0) {
                                    fn.element.create({ tagName : 'div', text : 'No runs yet.', parent : opt.el.content });
                                    return;
                                }
                                history.slice().reverse().forEach(function(entry) {
                                    fn.element.create({
                                        tagName : 'pre',
                                        parent : opt.el.content,
                                        style : Object.assign({ whiteSpace : 'pre-wrap', wordBreak : 'break-word', borderBottom : '1px solid #3a3f4b', paddingBottom : '8px', marginBottom : '8px' }, entry.ok ? {} : { color : '#e57373' }),
                                        text : entry.time + ' - ' + (entry.ok ? 'OK' : 'Error') + '\\n' + entry.body,
                                    });
                                });
                            },
                        });
                    }` } },
                ],
            },
            {
                name : 'History',
                key : 'history',
                columns : [
                    { name : 'requestId', label : 'Request', list : { width : '160px' }, form : { type : 'select', resource : { key : 'request', label : 'name' } } },
                    { name : 'time', label : 'Time', list : { width : '180px' }, form : { type : 'text' } },
                    { name : 'ok', label : 'OK', list : { width : '60px' }, form : { type : 'text' } },
                    { name : 'body', label : 'Body', list : { width : 'auto' }, form : { type : 'textarea' } },
                ],
            },
        ];
    };

    fn.devtool._.generateSampleData = function() {
        for (var i = 1; i <= 20; i++) {
            fn.data.insert({
                key : 'memo',
                data : { name : 'Memo ' + i, content : 'Sample memo content #' + i },
            });
            fn.data.insert({
                key : 'bookmark',
                data : { name : 'Bookmark ' + i, url : 'https://example.com/' + i },
            });
        }

        fn.data.insert({
            key : 'request',
            data : { name : 'Get todo', method : 'GET', url : 'https://jsonplaceholder.typicode.com/todos/1', params : '', authType : 'none', auth : '', headers : '', body : '' },
        });
        fn.data.insert({
            key : 'request',
            data : { name : 'List posts', method : 'GET', url : 'https://jsonplaceholder.typicode.com/posts', params : '{"userId": "1"}', authType : 'none', auth : '', headers : '', body : '' },
        });
        fn.data.insert({
            key : 'request',
            data : { name : 'Create post', method : 'POST', url : 'https://jsonplaceholder.typicode.com/posts', params : '', authType : 'none', auth : '', headers : '', body : '{"title": "foo", "body": "bar", "userId": 1}' },
        });
    };

    fn.devtool._.ensureEssential = function() {
        if (fn.data.select({ key : '_setting' }).length === 0) {
            fn.data.insert({ key : '_setting', data : { scale : '1', opacity : '1' } });
        }

        var codeRows = fn.data.select({ key : 'code' });
        var codeGroups = fn.devtool._.codeGroups();
        Object.keys(codeGroups).forEach(function(group) {
            var hasGroup = codeRows.some(function(row) { return row.data.group === group; });
            if (!hasGroup) {
                codeGroups[group].forEach(function(entry) {
                    fn.data.insert({ key : 'code', data : { group : group, code : entry.code, name : entry.name } });
                });
            }
        });
    };

    fn.devtool._.checkReminders = function() {
        if (typeof Notification === 'undefined' || Notification.permission !== 'granted') {
            return;
        }
        var now = new Date();
        fn.data.select({ key : 'reminder' }).forEach(function(row) {
            if (row.data.notified || !row.data.datetime || new Date(row.data.datetime) > now) {
                return;
            }
            new Notification(row.data.title || 'Reminder');
            fn.data.update({ key : 'reminder', id : row.id, data : Object.assign({}, row.data, { notified : true }) });
            fn.log('devtool', 'reminder notified', row.data.title);
        });
    };

    fn.devtool._.isField = function(el) {
        return /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName);
    };

    fn.devtool._.getFieldValue = function(input) {
        return (input.type === 'checkbox' || input.type === 'radio') ? input.checked : input.value;
    };

    fn.devtool._.setFieldValue = function(input, value) {
        if (input.type === 'checkbox' || input.type === 'radio') {
            input.checked = !!value;
        } else {
            input.value = value;
        }
    };

    fn.devtool._.startInspectMode = function(onSelect) {
        var highlighted = null;
        var previousOutline = '';

        function setHighlight(el) {
            if (highlighted === el) {
                return;
            }
            if (highlighted) {
                highlighted.style.outline = previousOutline;
            }
            highlighted = el;
            previousOutline = el ? el.style.outline : '';
            if (el) {
                el.style.outline = '2px solid #4f8cff';
            }
        }

        function stop() {
            setHighlight(null);
            document.removeEventListener('mousemove', onMouseMove, true);
            document.removeEventListener('click', onClick, true);
            document.removeEventListener('keydown', onKeydown, true);
        }

        function onMouseMove(e) {
            setHighlight(e.target.closest('.__popup') ? null : e.target);
        }

        function onClick(e) {
            if (e.target.closest('.__popup')) {
                return;
            }
            e.preventDefault();
            e.stopPropagation();
            var el = e.target;
            stop();

            var container = el;
            if (fn.devtool._.isField(el)) {
                container = el.closest('form') || el.parentElement || el;
            }
            var fields = Array.from(container.querySelectorAll('input, textarea, select'));
            if (fn.devtool._.isField(container)) {
                fields.unshift(container);
            }

            onSelect(fields);
        }

        function onKeydown(e) {
            if (e.key === 'Escape') {
                e.stopImmediatePropagation();
                stop();
            }
        }

        document.addEventListener('mousemove', onMouseMove, true);
        document.addEventListener('click', onClick, true);
        document.addEventListener('keydown', onKeydown, true);
    };

    fn.devtool._.startCapture = function() {
        fn.devtool._.startInspectMode(function(fields) {
            var values = fields.map(fn.devtool._.getFieldValue);

            var row = fn.data.insert({
                key : 'capture',
                data : {
                    label : location.hostname + ' - ' + new Date().toLocaleString(),
                    data : JSON.stringify(values, null, 2),
                },
            });
            fn.log('devtool', 'capture', row.data.label, values);
        });
    };

    fn.devtool._.startPaste = function() {
        var rows = fn.data.select({ key : 'capture' });
        if (rows.length === 0) {
            fn.log('devtool', 'paste', 'no captures saved yet');
            return;
        }
        var latest = rows[rows.length - 1];
        var values = JSON.parse(latest.data.data);

        fn.devtool._.startInspectMode(function(fields) {
            fields.forEach(function(input, index) {
                if (index >= values.length) {
                    return;
                }
                fn.devtool._.setFieldValue(input, values[index]);
            });
            fn.log('devtool', 'paste', latest.data.label, values);
        });
    };

    fn.devtool._.allDataKeys = function() {
        var keys = fn.devtool._.builtinResources().map(function(def) { return def.key; });
        fn.data.select({ key : '_resource' }).forEach(function(row) { keys.push(row.data.key); });
        keys.push('_resource', '_setting');
        return keys;
    };

    fn.devtool._.seed = function() {
        fn.devtool._.ensureEssential();
        fn.devtool._.generateSampleData();
    };

    fn.devtool._.reset = function() {
        fn.devtool._.allDataKeys().forEach(function(key) {
            fn.localStorage.remove({ key : key });
        });
        fn.devtool._.seed();
    };

    fn.devtool.start = function() {
        if (fn.devtool.data.started) {
            return;
        }
        fn.devtool.data.started = true;

        var isFirstRun = fn.data.select({ key : '_setting' }).length === 0;
        fn.devtool._.ensureEssential();
        if (isFirstRun) {
            fn.devtool._.generateSampleData();
        }

        fn.devtool._.checkReminders();
        setInterval(fn.devtool._.checkReminders, 15000);

        document.addEventListener('keydown', function(e) {
            if (e.altKey && e.code === 'Backquote') {
                e.preventDefault();
                fn.devtool.open();
            }
            if (e.altKey && e.code === 'Digit1') {
                e.preventDefault();
                fn.devtool._.startCapture();
            }
            if (e.altKey && e.code === 'Digit2') {
                e.preventDefault();
                fn.devtool._.startPaste();
            }
            if (e.key === 'Escape') {
                var popups = document.querySelectorAll('.__popup');
                if (popups.length) {
                    popups[popups.length - 1].close();
                }
            }
        });

        var button = fn.element.create({
            tagName : 'button',
            attribute : {
                type : 'button',
                title : 'Open DevTool',
            },
            style : {
                position : 'fixed',
                right : '20px',
                bottom : '20px',
                width : '40px',
                height : '40px',
                borderRadius : '50%',
                border : 'none',
                background : '#2b2f38',
                color : '#e8eaed',
                fontSize : '18px',
                cursor : 'pointer',
                boxShadow : '0 2px 8px rgba(0, 0, 0, 0.35)',
            },
            hoverStyle : {
                background : '#3a3f4b',
            },
            text : '⚙',
            event : {
                click : fn.devtool.open,
            },
            parent : document.body,
        });
        fn.devtool.data.button = button;
        fn.component._.applyZIndex({ el : button });
    };
})(window);

fn.devtool.start();
