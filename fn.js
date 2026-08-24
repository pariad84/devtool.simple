(function(global) {
    const fn = {};

    fn.localStorage = {};
    fn.element = {};
    fn.data = {};
    fn.data._ = {};
    fn.component = {};
    fn.component._ = {};
    fn.devtool = {};
    fn.devtool._ = {};
    fn.devtool.data = {};
    fn.component.data = {};
    fn.component.layout = {};
    fn.component.layout._ = {};
    fn.component.layout.data = {};

    fn.log = function(scope, action, ...args) {
        console.log('[fn.' + scope + ']', action, ...args);
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
        if (opt.html) {
            el.innerHTML = opt.html;
        }
        if (opt.text) {
            el.textContent = opt.text;
        }
        if (opt.event) {
            for (const [eventType, eventHandler] of Object.entries(opt.event)) {
                el.addEventListener(eventType, eventHandler);
            }
        }
        if (opt.complete) {
            opt.complete({el : el});
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

    fn.element.draggable = function(opt = {}) {
        var el = opt.el;
        var handle = opt.handle || el;
        var startX, startY, startLeft, startTop;

        function onPointerMove(e) {
            el.style.left = (startLeft + (e.clientX - startX)) + 'px';
            el.style.top = (startTop + (e.clientY - startY)) + 'px';
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
            var rect = el.getBoundingClientRect();
            startLeft = rect.left;
            startTop = rect.top;
            document.addEventListener('pointermove', onPointerMove);
            document.addEventListener('pointerup', onPointerUp);
        });
    };

    fn.element.maxZIndex = function(opt = {}) {
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

    fn.data._.readTable = function(opt = {}) {
        var raw = fn.localStorage.get({ key : opt.key });
        return raw ? JSON.parse(raw) : [];
    };

    fn.data._.writeTable = function(opt = {}) {
        fn.localStorage.set({ key : opt.key, value : JSON.stringify(opt.rows) });
    };

    fn.data._.toResource = function(opt = {}) {
        return {
            key : opt.row.data.key,
            type : opt.row.data.type,
            columns : JSON.parse(opt.row.data.columns),
        };
    };

    fn.data.select = function(opt = {}) {
        var rows = fn.data._.readTable({ key : opt.key });
        if (opt.id !== undefined) {
            var row = rows.find(function(row) { return row.id === opt.id; });
            fn.log('data', 'select', opt.key, 'id=' + opt.id, row);
            return row;
        }
        fn.log('data', 'select', opt.key, rows.length + ' rows', rows);
        return rows;
    };

    fn.data.insert = function(opt = {}) {
        var rows = fn.data._.readTable({ key : opt.key });
        var nextId = rows.reduce(function(max, row) { return Math.max(max, row.id); }, 0) + 1;
        var row = { id : nextId, data : opt.data };
        rows.push(row);
        fn.data._.writeTable({ key : opt.key, rows : rows });
        fn.log('data', 'insert', opt.key, row);
        return row;
    };

    fn.data.update = function(opt = {}) {
        var rows = fn.data._.readTable({ key : opt.key });
        var row = rows.find(function(r) { return r.id === opt.id; });
        if (row) {
            row.data = opt.data;
            fn.data._.writeTable({ key : opt.key, rows : rows });
        }
        fn.log('data', 'update', opt.key, 'id=' + opt.id, row);
        return row;
    };

    fn.data.delete = function(opt = {}) {
        var rows = fn.data._.readTable({ key : opt.key });
        var row = rows.find(function(row) { return row.id === opt.id; });
        fn.data._.writeTable({ key : opt.key, rows : rows.filter(function(row) { return row.id !== opt.id; }) });
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


(function(global) {
    var fn = global.fn;

    fn.component._.renderColumn = function(opt) {
        var render = new Function('return (' + opt.source + ')')();
        return render(opt.data);
    };

    fn.component._.applyZIndex = function(opt) {
        var exclude = (fn.component.data.popup || []).slice();
        if (fn.devtool.data.button) {
            exclude.push(fn.devtool.data.button);
        }
        opt.el.style.zIndex = fn.element.maxZIndex({ exclude : exclude }) + 1;
    };

    fn.component._.applySetting = function(opt) {
        var settingRows = fn.data.select({ key : '_setting' });
        var setting = settingRows[0] ? settingRows[0].data : {};
        if (setting.width) {
            opt.el.style.width = setting.width;
        }
        if (setting.height) {
            opt.el.style.height = setting.height;
        }
        if (setting.scale) {
            opt.el.style.zoom = setting.scale;
        }
        if (setting.opacity) {
            opt.el.style.opacity = setting.opacity;
        }
        fn.component._.applyZIndex({ el : opt.el });
    };

    fn.component._.applySettingAll = function() {
        fn.component.data.popup.forEach(function(el) {
            fn.component._.applySetting({ el : el });
        });
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
                        if (popup._.onSave) {
                            popup._.onSave(data);
                            if (popup._.caller) {
                                popup._.caller.refresh();
                            }
                            popup.close();
                            return;
                        }
                        if (form._.data.id !== undefined) {
                            fn.data.update({
                                key : form._.resource.key,
                                id : form._.data.id,
                                data : data,
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
                        var resourceRow = fn.data.select({ key : '_resource' }).find(function(row) {
                            return row.data.key === '_setting';
                        });
                        var resource = fn.data._.toResource({ row : resourceRow });
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

            fn.element.draggable({
                el : popup,
                handle : header,
            });

            popup.header = header;
            popup.buttons = buttons;
            popup.content = content;
            popup._.render = opt.render;
            popup._.resource = opt.resource;
            popup._.title = opt.title;
            popup._.onSave = opt.onSave;

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
                    input = fn.component._.renderColumn({ source : column.form.render, data : opt.data });
                    valueCell.appendChild(input);
                } else {
                    var inputStyle = Object.assign({}, fn.component.layout._.style.input);
                    if (column.form.width) {
                        inputStyle.width = column.form.width;
                    }

                    if (column.form.inputType === 'select') {
                        input = fn.element.create({
                            tagName : 'select',
                            attribute : { name : column.name },
                            style : inputStyle,
                            parent : valueCell,
                        });
                        fn.data.select({ key : 'code' }).filter(function(row) {
                            return row.data.group === column.form.codeGroup;
                        }).forEach(function(row) {
                            fn.element.create({
                                tagName : 'option',
                                attribute : { value : row.data.code },
                                text : row.data.name,
                                parent : input,
                            });
                        });
                    } else {
                        var isTextarea = column.form.inputType === 'textarea';
                        if (isTextarea) {
                            inputStyle.resize = 'vertical';
                            inputStyle.minHeight = '60px';
                        }

                        input = fn.element.create({
                            tagName : isTextarea ? 'textarea' : 'input',
                            attribute : isTextarea ? { name : column.name } : { type : column.form.inputType || 'text', name : column.name },
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
                    result[column.name] = column.form.dataType === 'number' ? Number(input.value) : input.value;
                });
                return result;
            };

            el.setData = function(newData) {
                opt.resource.columns.forEach(function(column) {
                    if (!column.form) {
                        return;
                    }
                    var input = el._.inputs[column.name];
                    if (input.tagName === 'BUTTON') {
                        return;
                    }
                    if (newData[column.name] !== undefined) {
                        input.value = newData[column.name];
                    }
                });
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
                var clickable = !!opt.resource && !opt.readonly;
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
                            if (opt.onRowClick) {
                                opt.onRowClick({ data : data, e : e });
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
                                    if (!data.protected) {
                                        fn.component.create({
                                            name : 'popup-delete-btn',
                                            parent : opt.el.buttons,
                                        });
                                    }
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
                        var rendered = fn.component._.renderColumn({ source : column.list.render, data : data });
                        if (rendered instanceof HTMLElement) {
                            cell.appendChild(rendered);
                        } else {
                            cell.textContent = rendered;
                        }
                    } else {
                        cell.textContent = data[column.name] !== undefined ? data[column.name] : '';
                    }
                });
            });

            return el;
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
                    var datas = fn.data.select({ key : '_resource' }).filter(function(row) {
                        return row.data.key !== '_setting';
                    }).map(function(row) {
                        return {
                            id : row.id,
                            name : row.data.name,
                            resource : fn.data._.toResource({ row : row }),
                        };
                    });

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
        var isObject = opt.resource.type === 'object';
        fn.component.create({
            name : 'popup',
            title : isObject ? ('Edit ' + opt.name) : opt.name,
            parent : document.body,
            caller : opt.caller,
            resource : opt.resource,
            initialize : function(initOpt) {
                fn.component.create({
                    name : isObject ? 'popup-save-btn' : 'popup-create-btn',
                    parent : initOpt.el.buttons,
                });
                if (!isObject) {
                    fn.component.create({
                        name : 'popup-search-btn',
                        parent : initOpt.el.buttons,
                    });
                }
            },
            render : function(renderOpt) {
                var rows = fn.data.select({ key : opt.resource.key });
                if (isObject) {
                    var formData = rows[0] ? Object.assign({ id : rows[0].id }, rows[0].data) : {};
                    fn.component.create({
                        name : 'form',
                        resource : opt.resource,
                        data : formData,
                        parent : renderOpt.el.content,
                    });
                    return;
                }
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

    fn.devtool.openJsonValue = function(opt = {}) {
        var flatten = function(column) {
            return {
                name : column.name,
                label : column.label || '',
                listWidth : column.list ? (column.list.width || '') : '',
                formInput : column.form ? (column.form.render ? 'render' : (column.form.inputType || '')) : '',
                render : (column.form && column.form.render) || '',
            };
        };
        var unflatten = function(original, formData) {
            var column = Object.assign({}, original, {
                name : formData.name,
                label : formData.label,
                list : original.list ? Object.assign({}, original.list, { width : formData.listWidth }) : undefined,
                form : Object.assign({}, original.form),
            });
            if (formData.formInput === 'render') {
                column.form.render = formData.render;
                delete column.form.inputType;
            } else {
                column.form.inputType = formData.formInput;
                delete column.form.render;
            }
            return column;
        };
        var resource = {
            key : '',
            columns : [
                { name : 'name', label : 'Field', list : { width : '140px' }, form : { inputType : 'text' } },
                { name : 'label', label : 'Label', list : { width : '160px' }, form : { inputType : 'text' } },
                { name : 'listWidth', label : 'List width', list : { width : '110px' }, form : { inputType : 'text' } },
                { name : 'formInput', label : 'Form input', list : { width : '140px' }, form : { inputType : 'select', codeGroup : 'formInputType' } },
                { name : 'render', label : 'Render (JS)', form : { inputType : 'textarea' } },
            ],
        };
        var isArray = Array.isArray(opt.value);

        fn.component.create({
            name : 'popup',
            title : opt.title,
            parent : document.body,
            caller : opt.caller,
            onSave : (!isArray && opt.onSave) ? function(formData) {
                opt.onSave(unflatten(opt.value, formData));
            } : undefined,
            initialize : function(initOpt) {
                if (!isArray && opt.onSave) {
                    fn.component.create({ name : 'popup-save-btn', parent : initOpt.el.buttons });
                }
            },
            render : function(renderOpt) {
                if (isArray) {
                    var datas = opt.value.map(function(column, index) {
                        return Object.assign({ id : index }, flatten(column));
                    });
                    fn.component.create({
                        name : 'list',
                        resource : resource,
                        datas : datas,
                        onRowClick : function(clickOpt) {
                            var column = opt.value[clickOpt.data.id];
                            fn.devtool.openJsonValue({
                                value : column,
                                title : 'Column: ' + (column.name || clickOpt.data.id),
                                caller : clickOpt.e.target.closest('.__popup'),
                                onSave : opt.onSave ? function(updatedColumn) {
                                    opt.value[clickOpt.data.id] = updatedColumn;
                                    opt.onSave(opt.value);
                                } : undefined,
                            });
                        },
                        parent : renderOpt.el.content,
                    });
                    return;
                }
                var formEl = fn.component.create({ name : 'form', resource : resource, data : flatten(opt.value), parent : renderOpt.el.content });
                var formInputSelect = formEl._.inputs.formInput;
                var renderRow = formEl._.inputs.render.closest('tr');
                var syncRenderVisibility = function() {
                    renderRow.style.display = formInputSelect.value === 'render' ? '' : 'none';
                };
                formInputSelect.addEventListener('change', syncRenderVisibility);
                syncRenderVisibility();
            },
        });
    };

    fn.devtool._.codeGroups = function() {
        return {
            method : [ 'GET', 'POST', 'PUT', 'PATCH', 'DELETE' ].map(function(code) { return { code : code, name : code }; }),
            authType : [ { code : 'none', name : 'None' }, { code : 'bearer', name : 'Bearer Token' }, { code : 'basic', name : 'Basic Auth' } ],
            resourceType : [ { code : 'array', name : 'Array' }, { code : 'object', name : 'Object' } ],
            formInputType : [
                { code : 'text', name : 'Text' },
                { code : 'textarea', name : 'Textarea' },
                { code : 'select', name : 'Select' },
                { code : 'render', name : 'Render (custom JS)' },
            ],
        };
    };

    fn.devtool._.resourceDefinitions = function() {
        return [
            {
                name : 'Memo',
                key : 'memo',
                type : 'array',
                protected : true,
                columns : JSON.stringify([
                    { name : 'name', label : 'Name', list : { width : '160px' }, form : { inputType : 'text' } },
                    { name : 'content', label : 'Content', list : { width : 'auto' }, form : { inputType : 'textarea' } },
                ]),
            },
            {
                name : 'Bookmark',
                key : 'bookmark',
                type : 'array',
                protected : true,
                columns : JSON.stringify([
                    { name : 'name', label : 'Name', list : { width : '160px' }, form : { inputType : 'text' } },
                    { name : 'url', label : 'URL', list : { width : 'auto' }, form : { inputType : 'text' } },
                    { name : 'run', label : 'Run', list : { width : '70px', render : `function(data) {
                        return fn.element.create({
                            tagName : 'button',
                            attribute : { type : 'button' },
                            text : 'Run',
                            style : Object.assign({}, fn.component.layout._.style.actionButton, { padding : '4px 10px', background : 'transparent' }),
                            event : {
                                click : function(e) {
                                    e.stopPropagation();
                                    window.open(data.url, '_blank');
                                }
                            }
                        });
                    }` } },
                ]),
            },
            {
                name : 'Code',
                key : 'code',
                type : 'array',
                protected : true,
                columns : JSON.stringify([
                    { name : 'group', label : 'Group', list : { width : '140px' }, form : { inputType : 'text' } },
                    { name : 'code', label : 'Code', list : { width : '120px' }, form : { inputType : 'text' } },
                    { name : 'name', label : 'Name', list : { width : 'auto' }, form : { inputType : 'text' } },
                ]),
            },
            {
                name : 'Request',
                key : 'request',
                type : 'array',
                protected : true,
                columns : JSON.stringify([
                    { name : 'name', label : 'Name', list : { width : '160px' }, form : { inputType : 'text' } },
                    { name : 'method', label : 'Method', list : { width : '90px' }, form : { inputType : 'select', codeGroup : 'method' } },
                    { name : 'url', label : 'URL', list : { width : 'auto' }, form : { inputType : 'text' } },
                    { name : 'params', label : 'Params (JSON)', form : { inputType : 'textarea' } },
                    { name : 'authType', label : 'Auth Type', list : { width : '110px' }, form : { inputType : 'select', codeGroup : 'authType' } },
                    { name : 'auth', label : 'Auth (JSON)', form : { inputType : 'textarea' } },
                    { name : 'headers', label : 'Headers (JSON)', form : { inputType : 'textarea' } },
                    { name : 'body', label : 'Body (JSON)', form : { inputType : 'textarea' } },
                    { name : 'run', label : 'Run', list : { width : '70px', render : `function(data) {
                        return fn.element.create({
                            tagName : 'button',
                            attribute : { type : 'button' },
                            text : 'Run',
                            style : Object.assign({}, fn.component.layout._.style.actionButton, { padding : '4px 10px', background : 'transparent' }),
                            event : {
                                click : function(e) {
                                    e.stopPropagation();
                                    var caller = e.target.closest('.__popup');
                                    var show = function(title, text, isError) {
                                        fn.component.create({
                                            name: 'popup',
                                            title: title,
                                            parent: document.body,
                                            caller: caller,
                                            render: function(opt) {
                                                fn.element.create({
                                                    tagName: 'pre',
                                                    parent: opt.el.content,
                                                    style: Object.assign({ whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: '0' }, isError ? { color: '#e57373' } : {}),
                                                    text: text,
                                                });
                                            }
                                        });
                                    };
                                    var saveHistory = function(ok, body) {
                                        var row = fn.data.select({ key: 'request', id: data.id });
                                        var history = row.data.history ? JSON.parse(row.data.history) : [];
                                        history.push({ time: new Date().toISOString(), ok: ok, body: body });
                                        if (history.length > 20) {
                                            history = history.slice(history.length - 20);
                                        }
                                        fn.data.update({ key: 'request', id: data.id, data: Object.assign({}, row.data, { history: JSON.stringify(history) }) });
                                    };
                                    var auth = (data.authType && data.authType !== 'none') ? Object.assign({ type: data.authType }, data.auth ? JSON.parse(data.auth) : {}) : undefined;
                                    fn.ajax({
                                        method: data.method,
                                        url: data.url,
                                        params: data.params ? JSON.parse(data.params) : undefined,
                                        auth: auth,
                                        headers: data.headers ? JSON.parse(data.headers) : undefined,
                                        data: data.body ? JSON.parse(data.body) : undefined
                                    }).then(function(result) {
                                        var text = JSON.stringify(result, null, 2);
                                        show('Response: ' + data.name, text, false);
                                        saveHistory(true, text);
                                    }).catch(function(err) {
                                        show('Error: ' + data.name, err.message, true);
                                        saveHistory(false, err.message);
                                    });
                                }
                            }
                        });
                    }` } },
                    { name : 'history', label : 'History', list : { width : '80px', render : `function(data) {
                        return fn.element.create({
                            tagName : 'button',
                            attribute : { type : 'button' },
                            text : 'History',
                            style : Object.assign({}, fn.component.layout._.style.actionButton, { padding : '4px 10px', background : 'transparent' }),
                            event : {
                                click : function(e) {
                                    e.stopPropagation();
                                    var caller = e.target.closest('.__popup');
                                    var row = fn.data.select({ key : 'request', id : data.id });
                                    var history = row.data.history ? JSON.parse(row.data.history) : [];
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
                                }
                            }
                        });
                    }` } },
                ]),
            },
            {
                name : 'Resource',
                key : '_resource',
                type : 'array',
                protected : true,
                columns : JSON.stringify([
                    { name : 'name', label : 'Name', list : { width : '160px' }, form : { inputType : 'text' } },
                    { name : 'key', label : 'Key', list : { width : '120px' }, form : { inputType : 'text' } },
                    { name : 'type', label : 'Type', list : { width : '90px' }, form : { inputType : 'select', codeGroup : 'resourceType' } },
                    { name : 'columns', label : 'Columns (JSON)', list : { width : 'auto' }, form : { inputType : 'textarea' } },
                    { name : 'previewColumns', label : 'Columns View', form : { render : `function(data) {
                        return fn.element.create({
                            tagName : 'button',
                            attribute : { type : 'button' },
                            text : 'View columns',
                            style : Object.assign({}, fn.component.layout._.style.actionButton, { padding : '6px 14px', border : '1px solid #3a3f4b', background : '#2b2f38' }),
                            event : {
                                click : function(e) {
                                    e.stopPropagation();
                                    var popup = e.target.closest('.__popup');
                                    fn.devtool.openJsonValue({
                                        value : JSON.parse(data.columns),
                                        title : 'Columns: ' + data.name,
                                        caller : popup,
                                        onSave : function(updatedColumns) {
                                            fn.data.update({ key : '_resource', id : data.id, data : Object.assign({}, data, { columns : JSON.stringify(updatedColumns) }) });
                                            popup.refresh();
                                        },
                                    });
                                }
                            }
                        });
                    }` } },
                ]),
            },
            {
                name : 'Setting',
                key : '_setting',
                type : 'object',
                protected : true,
                columns : JSON.stringify([
                    { name : 'width', label : 'Default popup width', list : { width : '160px' }, form : { inputType : 'text' } },
                    { name : 'height', label : 'Default popup height', list : { width : '160px' }, form : { inputType : 'text' } },
                    { name : 'scale', label : 'Default popup scale', list : { width : '160px' }, form : { inputType : 'text' } },
                    { name : 'opacity', label : 'Default popup opacity', list : { width : '160px' }, form : { inputType : 'text' } },
                    { name : 'testData', label : 'Test Data', form : { render : `function(data) {
                        return fn.element.create({
                            tagName : 'button',
                            attribute : { type : 'button' },
                            text : 'Generate test data',
                            style : Object.assign({}, fn.component.layout._.style.actionButton, { padding : '6px 14px', border : '1px solid #3a3f4b', background : '#2b2f38' }),
                            event : {
                                click : function(e) {
                                    e.stopPropagation();
                                    fn.devtool._.generateSampleData();
                                    var popup = e.target.closest('.__popup');
                                    if (popup._.caller) {
                                        popup._.caller.refresh();
                                    }
                                    popup.close();
                                }
                            }
                        });
                    }` } },
                    { name : 'export', label : 'Export', form : { render : `function(data) {
                        return fn.element.create({
                            tagName : 'button',
                            attribute : { type : 'button' },
                            text : 'Export data',
                            style : Object.assign({}, fn.component.layout._.style.actionButton, { padding : '6px 14px', border : '1px solid #3a3f4b', background : '#2b2f38' }),
                            event : {
                                click : function(e) {
                                    e.stopPropagation();
                                    var backup = {};
                                    fn.data.select({ key : '_resource' }).map(function(row) { return row.data.key; }).forEach(function(key) {
                                        backup[key] = fn.data.select({ key : key });
                                    });
                                    var blob = new Blob([ JSON.stringify(backup, null, 2) ], { type : 'application/json' });
                                    var url = URL.createObjectURL(blob);
                                    var link = fn.element.create({
                                        tagName : 'a',
                                        attribute : { href : url, download : 'devtool-backup.json' },
                                    });
                                    link.click();
                                    URL.revokeObjectURL(url);
                                }
                            }
                        });
                    }` } },
                    { name : 'import', label : 'Import', form : { render : `function(data) {
                        return fn.element.create({
                            tagName : 'button',
                            attribute : { type : 'button' },
                            text : 'Import data',
                            style : Object.assign({}, fn.component.layout._.style.actionButton, { padding : '6px 14px', border : '1px solid #3a3f4b', background : '#2b2f38' }),
                            event : {
                                click : function(e) {
                                    e.stopPropagation();
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
                                                var reader = new FileReader();
                                                reader.onload = function() {
                                                    var backup = JSON.parse(reader.result);
                                                    Object.keys(backup).forEach(function(key) {
                                                        fn.data._.writeTable({ key : key, rows : backup[key] });
                                                    });
                                                    fn.component._.applySettingAll();
                                                    if (popup._.caller) {
                                                        popup._.caller.refresh();
                                                    }
                                                    popup.close();
                                                };
                                                reader.readAsText(file);
                                            },
                                        },
                                    });
                                    input.click();
                                }
                            }
                        });
                    }` } },
                    { name : 'reset', label : 'Reset', form : { render : `function(data) {
                        return fn.element.create({
                            tagName : 'button',
                            attribute : { type : 'button' },
                            text : 'Reset all data',
                            style : Object.assign({}, fn.component.layout._.style.actionButton, { padding : '6px 14px', border : '1px solid #3a3f4b', background : '#2b2f38' }),
                            event : {
                                click : function(e) {
                                    e.stopPropagation();
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
                                }
                            }
                        });
                    }` } },
                ]),
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
        var existingKeys = fn.data.select({ key : '_resource' }).map(function(row) { return row.data.key; });
        fn.devtool._.resourceDefinitions().forEach(function(definition) {
            if (existingKeys.indexOf(definition.key) === -1) {
                fn.data.insert({ key : '_resource', data : definition });
            }
        });

        if (fn.data.select({ key : '_setting' }).length === 0) {
            fn.data.insert({ key : '_setting', data : { width : 'auto', height : 'auto', scale : '1', opacity : '1' } });
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

    fn.devtool._.seed = function() {
        fn.devtool._.ensureEssential();
        fn.devtool._.generateSampleData();
    };

    fn.devtool._.reset = function() {
        var keys = fn.data.select({ key : '_resource' }).map(function(row) { return row.data.key; });
        keys.forEach(function(key) {
            fn.localStorage.remove({ key : key });
        });
        fn.devtool._.seed();
    };

    fn.devtool._.watchZIndex = function() {
        var reapply = function() {
            if (fn.devtool.data.button) {
                fn.component._.applyZIndex({ el : fn.devtool.data.button });
            }
            (fn.component.data.popup || []).forEach(function(popup) {
                fn.component._.applyZIndex({ el : popup });
            });
        };

        var ownElements = function() {
            return (fn.component.data.popup || []).concat(fn.devtool.data.button ? [ fn.devtool.data.button ] : []);
        };

        var timer = null;
        var observer = new MutationObserver(function(mutations) {
            var own = ownElements();
            var isExternal = mutations.some(function(mutation) {
                return !own.some(function(el) { return el === mutation.target || el.contains(mutation.target); });
            });
            if (!isExternal) {
                return;
            }
            clearTimeout(timer);
            timer = setTimeout(reapply, 200);
        });
        observer.observe(document.body, {
            childList : true,
            subtree : true,
            attributes : true,
            attributeFilter : [ 'style', 'class' ],
        });

        reapply();
    };

    fn.devtool.start = function() {
        if (fn.devtool.data.started) {
            return;
        }
        fn.devtool.data.started = true;

        var isFirstRun = fn.data.select({ key : '_resource' }).length === 0;
        fn.devtool._.ensureEssential();
        if (isFirstRun) {
            fn.devtool._.generateSampleData();
        }

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
        fn.devtool._.watchZIndex();
    };
})(window);

fn.devtool.start();
