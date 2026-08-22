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
    fn.component.data = {};
    fn.component.layout = {};
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

    fn.component.create = function(opt = {}) {
        var layout = this.layout.get(opt);
        if (!layout) {
            throw new Error('Unknown component layout: ' + opt.name);
        }
        var el = layout(opt);

        if (opt.name === 'popup' && !el._.componentName) {
            el._.componentName = opt.name;

            if (!this.data[opt.name]) {
                this.data[opt.name] = [];
            }
            this.data[opt.name].push(el);
            fn.log('component', 'create', opt.name, this.data[opt.name].length + ' alive', el);
        }

        if (opt.parent) {
            opt.parent.appendChild(el);
        }
        return el;
    };

    fn.component.remove = function(el) {
        var name = el._.componentName;
        if (name && this.data[name]) {
            var idx = this.data[name].indexOf(el);
            if (idx !== -1) {
                this.data[name].splice(idx, 1);
            }
            fn.log('component', 'remove', name, this.data[name].length + ' alive', el);
        }
        el.remove();
    };

    fn.component.layout.set = function(opt = {}) {
        this.data[opt.name] = opt.value;
    };

    fn.component.layout.get = function(opt = {}) {
        return this.data[opt.name];
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

    fn.data._.readTable = function(opt = {}) {
        var raw = fn.localStorage.get({ key : opt.key });
        return raw ? JSON.parse(raw) : [];
    };

    fn.data._.writeTable = function(opt = {}) {
        fn.localStorage.set({ key : opt.key, value : JSON.stringify(opt.rows) });
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
        var options = { method : method };
        if (method !== 'GET' && method !== 'HEAD') {
            options.headers = { 'Content-Type' : opt.contentType || 'application/json; charset=UTF-8' };
            options.body = JSON.stringify(opt.data || {});
        }

        var response = await fetch(opt.url, options);
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

    var popupBtnStyle = {
        width : '26px',
        height : '26px',
        border : 'none',
        borderRadius : '4px',
        background : 'transparent',
        color : '#e8eaed',
        fontSize : '13px',
        cursor : 'pointer',
    };
    var popupBtnHoverStyle = {
        background : '#3a3f4b',
    };

    fn.component.layout.set({
        name : 'popup-create-btn',
        value : function(opt = {}) {
            return fn.element.create({
                tagName : 'button',
                attribute : {
                    type : 'button',
                    title : 'New',
                },
                style : popupBtnStyle,
                hoverStyle : popupBtnHoverStyle,
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
        value : function(opt = {}) {
            return fn.element.create({
                tagName : 'button',
                attribute : {
                    type : 'button',
                    title : 'Save',
                },
                style : popupBtnStyle,
                hoverStyle : popupBtnHoverStyle,
                text : '💾',
                event : {
                    click : function(e) {
                        var popup = e.target.closest('.__popup');
                        var form = popup.querySelector('.__form');
                        var data = form.getData();
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
                        if (popup._.caller) {
                            popup._.caller.refresh();
                        }
                        fn.component.remove(popup);
                    }
                },
            });
        }
    });

    fn.component.layout.set({
        name : 'popup-delete-btn',
        value : function(opt = {}) {
            return fn.element.create({
                tagName : 'button',
                attribute : {
                    type : 'button',
                    title : 'Delete',
                },
                style : popupBtnStyle,
                hoverStyle : popupBtnHoverStyle,
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
                        fn.component.remove(popup);
                    }
                },
            });
        }
    });

    fn.component.layout.set({
        name : 'popup-refresh-btn',
        value : function(opt = {}) {
            return fn.element.create({
                tagName : 'button',
                attribute : {
                    type : 'button',
                    title : 'Refresh',
                },
                style : popupBtnStyle,
                hoverStyle : popupBtnHoverStyle,
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
        value : function(opt = {}) {
            return fn.element.create({
                tagName : 'button',
                attribute : {
                    type : 'button',
                    title : 'Close',
                },
                style : popupBtnStyle,
                hoverStyle : popupBtnHoverStyle,
                text : '✕',
                event : {
                    click : function(e) {
                        fn.component.remove(e.target.closest('.__popup'));
                    }
                },
            });
        }
    });

    fn.component.layout.set({
        name : 'popup-buttons',
        value : function(opt = {}) {
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
        value : function(opt = {}) {
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
                    maxWidth : '80vw',
                    maxHeight : '80vh',
                    background : '#1e2128',
                    color : '#e8eaed',
                    border : '1px solid #3a3f4b',
                    borderRadius : '8px',
                    boxShadow : '0 8px 24px rgba(0, 0, 0, 0.45)',
                    font : "13px/1.5 -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                    zIndex : '2147483000',
                },
            });

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
            popup._.caller = opt.caller;
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

            render();
            return popup;
        }
    });

    fn.component.layout.set({
        name : 'form',
        value : function(opt = {resource : {key : '', columns : []}, data : {}}) {
            var el = fn.element.create({
                tagName : 'table',
                attribute : {
                    class : '__form',
                },
                style : {
                    width : '100%',
                    borderCollapse : 'collapse',
                },
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

                var isTextarea = column.form.inputType === 'textarea';
                var inputStyle = {
                    width : column.form.width || '100%',
                    boxSizing : 'border-box',
                    padding : '5px 8px',
                    background : '#14161b',
                    border : '1px solid #3a3f4b',
                    borderRadius : '4px',
                    color : '#e8eaed',
                    font : 'inherit',
                };
                if (isTextarea) {
                    inputStyle.resize = 'vertical';
                    inputStyle.minHeight = '60px';
                }

                var input = fn.element.create({
                    tagName : isTextarea ? 'textarea' : 'input',
                    attribute : isTextarea ? { name : column.name } : { type : column.form.inputType || 'text', name : column.name },
                    style : inputStyle,
                    parent : valueCell,
                });

                if (opt.data[column.name] !== undefined) {
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
        value : function(opt = {resource : {key : '', columns : []}, datas : []}) {
            var listButtonStyle = {
                padding : '4px 10px',
                border : 'none',
                borderRadius : '4px',
                background : 'transparent',
                color : '#e8eaed',
                fontSize : '13px',
                cursor : 'pointer',
            };
            var listButtonHoverStyle = {
                background : '#3a3f4b',
            };

            var el = fn.element.create({
                tagName : 'table',
                style : {
                    width : '100%',
                    borderCollapse : 'collapse',
                },
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
                var clickable = !!opt.resource;
                var row = fn.element.create({
                    tagName : 'tr',
                    style : clickable ? { cursor : 'pointer' } : {},
                    hoverStyle : clickable ? { background : '#2b2f38' } : undefined,
                    event : {
                        click : function(e) {
                            if (!clickable) {
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
                                    fn.component.create({
                                        name : 'form',
                                        resource : resource,
                                        data : data,
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
                    if (column.list.inputType === 'button') {
                        fn.element.create({
                            tagName : 'button',
                            attribute : { type : 'button' },
                            style : listButtonStyle,
                            hoverStyle : listButtonHoverStyle,
                            text : column.label || column.name,
                            event : {
                                click : function(e) {
                                    e.stopPropagation();
                                    window.open(data[column.list.field], '_blank');
                                },
                            },
                            parent : cell,
                        });
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
        value : function(opt = {}) {
            var el = fn.element.create({
                tagName : 'div',
                style : {
                    display : 'flex',
                    flexDirection : 'column',
                    gap : '2px',
                },
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
                                    fn.component.create({
                                        name : 'popup',
                                        title : opt.data.name,
                                        parent : document.body,
                                        caller : opt.caller,
                                        resource : opt.data.resource,
                                        initialize : function(opt) {
                                            fn.component.create({
                                                name : 'popup-create-btn',
                                                parent : opt.el.buttons,
                                            });
                                        },
                                        render : function(opt) {
                                            var rows = fn.data.select({ key : data.resource.key });
                                            var listDatas = rows.map(function(row) {
                                                return Object.assign({ id : row.id }, row.data);
                                            });
                                            fn.component.create({
                                                name : 'list',
                                                title : data.name,
                                                resource : data.resource,
                                                datas : listDatas,
                                                parent : opt.el.content,
                                            });
                                        },
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
        value : function(opt = {}) {
            return fn.component.create({
                name : 'popup',
                title : 'DevTool',
                render : function(opt) {
                    var datas = fn.data.select({ key : '_resource' }).map(function(row) {
                        return {
                            id : row.id,
                            name : row.data.name,
                            resource : {
                                key : row.data.key,
                                columns : JSON.parse(row.data.columns),
                            },
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
        fn.component.create({
            name : 'devtool',
            parent : document.body,
        });
    };

    fn.devtool.start = function() {
        if (fn.devtool._.started) {
            return;
        }
        fn.devtool._.started = true;

        if (fn.data.select({ key : '_resource' }).length === 0) {
            fn.data.insert({
                key : '_resource',
                data : {
                    name : 'Resource',
                    key : '_resource',
                    columns : JSON.stringify([
                        { name : 'name', label : 'Name', list : { width : '160px' }, form : { inputType : 'text' } },
                        { name : 'key', label : 'Key', list : { width : '120px' }, form : { inputType : 'text' } },
                        { name : 'columns', label : 'Columns (JSON)', list : { width : 'auto' }, form : { inputType : 'textarea' } },
                    ]),
                },
            });
            fn.data.insert({
                key : '_resource',
                data : {
                    name : 'Memo',
                    key : 'memo',
                    columns : JSON.stringify([
                        { name : 'name', label : 'Name', list : { width : '160px' }, form : { inputType : 'text' } },
                        { name : 'content', label : 'Content', list : { width : 'auto' }, form : { inputType : 'textarea' } },
                    ]),
                },
            });
            fn.data.insert({
                key : '_resource',
                data : {
                    name : 'Bookmark',
                    key : 'bookmark',
                    columns : JSON.stringify([
                        { name : 'name', label : 'Name', list : { width : '160px' }, form : { inputType : 'text' } },
                        { name : 'url', label : 'URL', list : { width : 'auto' }, form : { inputType : 'text' } },
                        { name : 'run', label : 'Run', list : { width : '70px', inputType : 'button', field : 'url' } },
                    ]),
                },
            });

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
        }

        fn.element.create({
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
                zIndex : '2147483000',
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
    };
})(window);

fn.devtool.start();
