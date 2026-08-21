(function(global) {
    const fn = {};

    fn.localStorage = {};
    fn.element = {};
    fn.data = {};
    fn.component = {};
    fn.component.data = {};
    fn.component.layout = {};
    fn.component.layout.data = {};

    fn.ajax = async function (opt = {}) {
        var method = (opt.method || 'POST').toUpperCase();
        var options = { method: method };
        if (method !== 'GET' && method !== 'HEAD') {
            options.headers = { 'Content-Type': opt.contentType || 'application/json; charset=UTF-8' };
            options.body = JSON.stringify(opt.data || {});
        }

        var response = await fetch(opt.url, options);
        var result = await response.json();
        if (!response.ok) {
            throw new Error(result.error || response.statusText);
        }
        return result;
    };

    // localStorage를 테이블처럼 사용: key = resourceKey(테이블명), value = 레코드 배열(JSON)
    function readTable(resourceKey) {
        var raw = fn.localStorage.get({ key: resourceKey });
        return raw ? JSON.parse(raw) : [];
    }

    function writeTable(resourceKey, rows) {
        fn.localStorage.set({ key: resourceKey, value: JSON.stringify(rows) });
    }

    fn.data.select = function (opt = {}) {
        var rows = readTable(opt.resourceKey);
        if (opt.id !== undefined) {
            return rows.find(function (row) { return row.id === opt.id; });
        }
        return rows;
    };

    fn.data.insert = function (opt = {}) {
        var rows = readTable(opt.resourceKey);
        var nextId = rows.reduce(function (max, row) { return Math.max(max, row.id); }, 0) + 1;
        var row = { id: nextId, data: opt.data };
        rows.push(row);
        writeTable(opt.resourceKey, rows);
        return row;
    };

    fn.data.update = function (opt = {}) {
        var rows = readTable(opt.resourceKey);
        var row = rows.find(function (r) { return r.id === opt.id; });
        if (row) {
            row.data = opt.data;
            writeTable(opt.resourceKey, rows);
        }
        return row;
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

    fn.element.create = function(opt = {}) {
        var el = document.createElement(opt.tagName);
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
            opt.complete({el: el});
        }
        el._opt = opt;
        if (opt.datas) {
            el._datas = opt.datas || [];
        }
        if (opt.data) {
            el._data = opt.data || {};
        }
        if (opt.caller) {
            el._caller = opt.caller;
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
        var el = layout(opt);

        // 레이아웃별로 컴포넌트를 fn.component.data에 저장
        if (!this.data[opt.name]) {
            this.data[opt.name] = [];
        }
        this.data[opt.name].push(el);

        if (opt.parent) {
            opt.parent.appendChild(el);
        }
        return el;
    };

    fn.component.layout.set = function(opt = {}) {
        this.data[opt.name] = opt.value;
    };

    fn.component.layout.get = function(opt = {}) {
        return this.data[opt.name];
    }

    global.fn = fn;
})(window);


(function(global) {
    var style = document.createElement('style');
    style.textContent = `
        .__devtool-toggle-btn {
            position: fixed;
            right: 20px;
            bottom: 20px;
            width: 40px;
            height: 40px;
            border-radius: 50%;
            border: none;
            background: #2b2f38;
            color: #e8eaed;
            font-size: 18px;
            cursor: pointer;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.35);
            z-index: 2147483000;
        }
        .__devtool-toggle-btn:hover {
            background: #3a3f4b;
        }
        .__popup {
            display: flex;
            flex-direction: column;
            min-width: 320px;
            max-width: 80vw;
            max-height: 80vh;
            background: #1e2128;
            color: #e8eaed;
            border: 1px solid #3a3f4b;
            border-radius: 8px;
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.45);
            font: 13px/1.5 -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            z-index: 2147483000;
        }
        .__popup-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 8px;
            padding: 8px 12px;
            border-bottom: 1px solid #3a3f4b;
            cursor: move;
        }
        .__popup-title {
            font-weight: 600;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
        .__popup-actions {
            display: flex;
            gap: 4px;
            flex-shrink: 0;
        }
        .__popup-btn {
            width: 26px;
            height: 26px;
            border: none;
            border-radius: 4px;
            background: transparent;
            color: #e8eaed;
            font-size: 13px;
            cursor: pointer;
        }
        .__popup-btn:hover {
            background: #3a3f4b;
        }
        .__popup-content {
            padding: 12px;
            overflow: auto;
        }
        .__menu {
            display: flex;
            flex-direction: column;
            gap: 2px;
        }
        .__menu-item {
            padding: 8px 10px;
            border-radius: 4px;
            cursor: pointer;
        }
        .__menu-item:hover {
            background: #2b2f38;
        }
        .__form, .__list {
            width: 100%;
            border-collapse: collapse;
        }
        .__form-row td {
            padding: 6px 0;
            vertical-align: middle;
        }
        .__form-label {
            width: 30%;
            color: #9aa0a6;
            padding-right: 8px;
        }
        .__form-input {
            box-sizing: border-box;
            padding: 5px 8px;
            background: #14161b;
            border: 1px solid #3a3f4b;
            border-radius: 4px;
            color: #e8eaed;
            font: inherit;
        }
        .__list-head-row th {
            text-align: left;
            padding: 6px 8px;
            color: #9aa0a6;
            border-bottom: 1px solid #3a3f4b;
        }
        .__list-cell {
            padding: 6px 8px;
            border-bottom: 1px solid #2b2f38;
        }
        .__list-row--clickable {
            cursor: pointer;
        }
        .__list-row--clickable:hover {
            background: #2b2f38;
        }
    `;
    document.head.appendChild(style);
})(window);


(function(global) {
    var fn = global.fn;

    fn.component.layout.set({
        name: 'popup-edit-btn',
        value: function(opt = {}) {
            return fn.element.create({
                tagName: 'button',
                attribute: {
                    type: 'button',
                    title: '새로 만들기',
                    class: '__popup-btn __popup-edit',
                },
                text: '✏️',
                event: {
                    click: opt.onClick
                },
            });
        }
    });

    fn.component.layout.set({
        name: 'popup-save-btn',
        value: function(opt = {}) {
            return fn.element.create({
                tagName: 'button',
                attribute: {
                    type: 'button',
                    title: '저장',
                    class: '__popup-btn __popup-save',
                },
                text: '💾',
                event: {
                    click: opt.onClick
                },
            });
        }
    });

    fn.component.layout.set({
        name: 'popup-refresh-btn',
        value: function(opt = {}) {
            return fn.element.create({
                tagName: 'button',
                attribute: {
                    type: 'button',
                    title: '새로고침',
                    class: '__popup-btn __popup-refresh',
                },
                text: '↻',
                event: {
                    click: opt.onClick
                },
            });
        }
    });

    fn.component.layout.set({
        name: 'popup-close-btn',
        value: function(opt = {}) {
            return fn.element.create({
                tagName: 'button',
                attribute: {
                    type: 'button',
                    title: '닫기',
                    class: '__popup-btn __popup-close',
                },
                text: '✕',
                event: {
                    click: opt.onClick
                },
            });
        }
    });

    fn.component.layout.set({
        name: 'popup-actions',
        value: function(opt = {}) {
            var el = fn.element.create({
                tagName: 'div',
                attribute: {
                    class: '__popup-actions',
                },
            });

            if (opt.action && opt.action.edit) {
                fn.component.create({
                    name: 'popup-edit-btn',
                    parent: el,
                    onClick: opt.action.edit,
                });
            }

            if (opt.action && opt.action.save) {
                fn.component.create({
                    name: 'popup-save-btn',
                    parent: el,
                    onClick: opt.action.save,
                });
            }

            fn.component.create({
                name: 'popup-refresh-btn',
                parent: el,
            });

            fn.component.create({
                name: 'popup-close-btn',
                parent: el,
                onClick: function() {
                    if (opt.onClose) {
                        opt.onClose();
                    }
                },
            });

            return el;
        }
    });

    fn.component.layout.set({
        name: 'popup',
        value: function(opt = {}) {
            // 팝업 위치 계산
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
                tagName: 'div',
                attribute: {
                    class: '__popup',
                    tabindex: '-1',
                },
                style: {
                    position: 'fixed',
                    top: top + 'px',
                    left: left + 'px',
                },
            });

            var header = fn.element.create({
                parent: popup,
                tagName: 'div',
                attribute: {
                    class: '__popup-header',
                },
            });

            var title = fn.element.create({
                parent: header,
                tagName: 'div',
                attribute: {
                    class: '__popup-title',
                },
                text: opt.title || 'Popup',
            });

            var actions = fn.component.create({
                name: 'popup-actions',
                parent: header,
                action: opt.action,
                onClose: function() {
                    popup.remove();
                },
            });

            var content = fn.element.create({
                parent: popup,
                tagName: 'div',
                attribute: {
                    class: '__popup-content',
                },
            });

            fn.element.draggable({
                el: popup,
                handle: header,
            });

            popup.header = header;
            popup.content = content;
            popup.title = title;
            if (opt.complete) {
                opt.complete({ el: popup });
            }
            return popup;
        }
    });

    fn.component.layout.set({
        name: 'form',
        value: function(opt = {columns: [], data: {}}) {
            var el = fn.element.create({
                tagName: 'table',
                attribute: {
                    class: '__form',
                },
                data: opt.data,
            });

            el._inputs = {};

            opt.columns.forEach(function(column) {
                if (!column.form) {
                    return;
                }

                var row = fn.element.create({
                    tagName: 'tr',
                    attribute: {
                        class: '__form-row',
                    },
                    parent: el,
                });

                fn.element.create({
                    tagName: 'td',
                    attribute: {
                        class: '__form-label',
                    },
                    text: column.label || column.name,
                    parent: row,
                });

                var valueCell = fn.element.create({
                    tagName: 'td',
                    attribute: {
                        class: '__form-value',
                    },
                    parent: row,
                });

                var input = fn.element.create({
                    tagName: 'input',
                    attribute: {
                        type: column.form.inputType || 'text',
                        name: column.name,
                        class: '__form-input',
                    },
                    style: {
                        width: column.form.width || '100%',
                    },
                    parent: valueCell,
                });

                if (opt.data[column.name] !== undefined) {
                    input.value = opt.data[column.name];
                }

                el._inputs[column.name] = input;
            });

            el.getData = function() {
                var result = {};
                opt.columns.forEach(function(column) {
                    if (!column.form) {
                        return;
                    }
                    var input = el._inputs[column.name];
                    result[column.name] = column.form.dataType === 'number' ? Number(input.value) : input.value;
                });
                return result;
            };

            el.setData = function(newData) {
                opt.columns.forEach(function(column) {
                    if (!column.form) {
                        return;
                    }
                    var input = el._inputs[column.name];
                    if (newData[column.name] !== undefined) {
                        input.value = newData[column.name];
                    }
                });
            };

            return el;
        }
    });

    fn.component.layout.set({
        name: 'list',
        value: function(opt = {columns: [], datas: []}) {
            var el = fn.element.create({
                tagName: 'table',
                attribute: {
                    class: '__list',
                },
            });

            if (opt.columns.some(function(column) { return !!column.list; })) {
                var thead = fn.element.create({
                    tagName: 'thead',
                    parent: el,
                });
                var headRow = fn.element.create({
                    tagName: 'tr',
                    attribute: {
                        class: '__list-head-row',
                    },
                    parent: thead,
                });
                opt.columns.forEach(function(column) {
                    if (!column.list) {
                        return;
                    }
                    fn.element.create({
                        tagName: 'th',
                        attribute: {
                            class: '__list-head-cell',
                        },
                        text: column.label || column.name,
                        style: {
                            width: column.list.width || 'auto',
                        },
                        parent: headRow,
                    });
                });
            }

            var tbody = fn.element.create({
                tagName: 'tbody',
                parent: el,
            });

            opt.datas.forEach(function(data) {
                var clickable = typeof data.action === 'function';
                var row = fn.element.create({
                    tagName: 'tr',
                    attribute: {
                        class: clickable ? '__list-row __list-row--clickable' : '__list-row',
                    },
                    event: {
                        click: function() {
                            if (clickable) {
                                data.action(data);
                            }
                        },
                    },
                    data: data,
                    parent: tbody,
                });

                if (opt.columns.length) {
                    opt.columns.forEach(function(column) {
                        if (!column.list) {
                            return;
                        }
                        fn.element.create({
                            tagName: 'td',
                            attribute: {
                                class: '__list-cell',
                            },
                            text: data[column.name] !== undefined ? data[column.name] : '',
                            parent: row,
                        });
                    });
                } else {
                    fn.element.create({
                        tagName: 'td',
                        attribute: {
                            class: '__list-cell',
                        },
                        text: data.name !== undefined ? data.name : '',
                        parent: row,
                    });
                }
            });

            return el;
        }
    });

    fn.component.layout.set({
        name: 'menu',
        value: function(opt = {}) {
            var el = fn.element.create({
                tagName: 'div',
                attribute: {
                    class: '__menu',
                },
            });
            if (opt.datas && Array.isArray(opt.datas)) {
                opt.datas.forEach(function(data) {
                    fn.element.create({
                        parent: el,
                        tagName: 'div',
                        attribute: {
                            class: '__menu-item',
                        },
                        text: data.name,
                        event: {
                            click: function(opt){
                                return function(e){
                                    fn.component.create({
                                        name: 'popup',
                                        title: opt.data.name,
                                        parent: document.body,
                                        caller: opt.caller,
                                    });
                                }
                            }({caller : el, data : data}),
                        },
                        data: data,
                    });
                });
            }
            return el;
        }
    });
})(window);

document.addEventListener('keydown', function(e) {
    if(e.ctrlKey && e.key == "`"){
        fn.element.create({
            tagName: 'button',
            attribute: {
                type: 'button',
                title: 'DevTool 열기 (Ctrl+`)',
                class: '__devtool-toggle-btn',
            },
            text: '⚙',
            event: {
                click: function() {
                    var popup = fn.component.create({
                        name: 'popup',
                        title: 'DevTool',
                        parent: document.body,
                    });

                    var datas = [
                        {
                            id: 1,
                            name: '메모',
                            resource_key: 'memo',
                            fields: [
                                { name: 'name', label: '이름', list: { width: '160px' }, form: { inputType: 'text' } },
                                { name: 'status', label: '상태', list: { width: '100px' }, form: { inputType: 'text' } },
                                { name: 'data', label: '데이터', list: { width: 'auto' }, form: { inputType: 'text' } },
                            ],
                        },
                        {
                            id: 2,
                            name: '북마크',
                            resource_key: 'bookmark',
                            fields: [
                                { name: 'name', label: '이름', list: { width: '160px' }, form: { inputType: 'text' } },
                                { name: 'status', label: '상태', list: { width: '100px' }, form: { inputType: 'text' } },
                                { name: 'data', label: '데이터', list: { width: 'auto' }, form: { inputType: 'text' } },
                            ],
                        },
                    ];

                    fn.component.create({
                        name: 'menu',
                        caller: popup,
                        datas: datas,
                        parent: popup.content,
                    });
                },
            },
            parent: document.body,
        });
    }
});
