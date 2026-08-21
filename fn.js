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

    fn.data.remove = function (opt = {}) {
        var rows = readTable(opt.resourceKey);
        writeTable(opt.resourceKey, rows.filter(function (row) { return row.id !== opt.id; }));
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
        if (!layout) {
            throw new Error('Unknown component layout: ' + opt.name);
        }
        var el = layout(opt);
        el._componentName = opt.name;

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

    // fn.component.create로 만든 엘리먼트를 DOM과 fn.component.data에서 함께 제거
    fn.component.remove = function(el) {
        var name = el._componentName;
        if (name && this.data[name]) {
            var idx = this.data[name].indexOf(el);
            if (idx !== -1) {
                this.data[name].splice(idx, 1);
            }
        }
        el.remove();
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
    var fn = global.fn;

    // 팝업의 content 영역을 비우고 자기 complete 콜백으로 다시 그림
    function refreshPopup(popup) {
        Array.from(popup.content.children).forEach(function(child) {
            if (child._componentName) {
                fn.component.remove(child);
            } else {
                child.remove();
            }
        });
        if (popup._complete) {
            popup._complete({ el: popup });
        }
    }

    // popup-create/save/refresh/close-btn이 공유하는 기본 버튼 스타일
    var popupBtnStyle = {
        width: '26px',
        height: '26px',
        border: 'none',
        borderRadius: '4px',
        background: 'transparent',
        color: '#e8eaed',
        fontSize: '13px',
        cursor: 'pointer',
    };
    var popupBtnHoverStyle = {
        background: '#3a3f4b',
    };

    fn.component.layout.set({
        name: 'popup-create-btn',
        value: function(opt = {}) {
            return fn.element.create({
                tagName: 'button',
                attribute: {
                    type: 'button',
                    title: '새로 만들기',
                },
                style: popupBtnStyle,
                hoverStyle: popupBtnHoverStyle,
                text: '✏️',
                event: {
                    click: function(e) {
                        var listPopup = e.target.closest('.__popup');
                        fn.component.create({
                            name: 'popup',
                            title: '새로 만들기',
                            parent: document.body,
                            caller: listPopup,
                            action: {
                                save: true,
                            },
                            complete: function(formRes) {
                                fn.component.create({
                                    name: 'form',
                                    columns: listPopup._columns,
                                    data: {},
                                    resourceKey: listPopup._resourceKey,
                                    parent: formRes.el.content,
                                });
                            },
                        });
                    }
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
                },
                style: popupBtnStyle,
                hoverStyle: popupBtnHoverStyle,
                text: '💾',
                event: {
                    click: function(e) {
                        var popup = e.target.closest('.__popup');
                        var form = popup.querySelector('.__form');
                        var data = form.getData();
                        if (form._data.id !== undefined) {
                            fn.data.update({
                                resourceKey: form._resourceKey,
                                id: form._data.id,
                                data: data,
                            });
                        } else {
                            fn.data.insert({
                                resourceKey: form._resourceKey,
                                data: data,
                            });
                        }
                        if (popup._caller) {
                            refreshPopup(popup._caller);
                        }
                    }
                },
            });
        }
    });

    fn.component.layout.set({
        name: 'popup-delete-btn',
        value: function(opt = {}) {
            return fn.element.create({
                tagName: 'button',
                attribute: {
                    type: 'button',
                    title: '삭제',
                },
                style: popupBtnStyle,
                hoverStyle: popupBtnHoverStyle,
                text: '🗑️',
                event: {
                    click: function(e) {
                        var popup = e.target.closest('.__popup');
                        var form = popup.querySelector('.__form');
                        if (form._data.id === undefined) {
                            return;
                        }
                        fn.data.remove({
                            resourceKey: form._resourceKey,
                            id: form._data.id,
                        });
                        if (popup._caller) {
                            refreshPopup(popup._caller);
                        }
                        fn.component.remove(popup);
                    }
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
                },
                style: popupBtnStyle,
                hoverStyle: popupBtnHoverStyle,
                text: '↻',
                event: {
                    click: function(e) {
                        refreshPopup(e.target.closest('.__popup'));
                    }
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
                },
                style: popupBtnStyle,
                hoverStyle: popupBtnHoverStyle,
                text: '✕',
                event: {
                    click: function(e) {
                        fn.component.remove(e.target.closest('.__popup'));
                    }
                },
            });
        }
    });

    fn.component.layout.set({
        name: 'popup-actions',
        value: function(opt = {}) {
            var el = fn.element.create({
                tagName: 'div',
                style: {
                    display: 'flex',
                    gap: '4px',
                    flexShrink: '0',
                },
            });

            if (opt.action && opt.action.create) {
                fn.component.create({
                    name: 'popup-create-btn',
                    parent: el,
                });
            }

            if (opt.action && opt.action.save) {
                fn.component.create({
                    name: 'popup-save-btn',
                    parent: el,
                });
                fn.component.create({
                    name: 'popup-delete-btn',
                    parent: el,
                });
            }

            fn.component.create({
                name: 'popup-refresh-btn',
                parent: el,
            });

            fn.component.create({
                name: 'popup-close-btn',
                parent: el,
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
                    display: 'flex',
                    flexDirection: 'column',
                    minWidth: '320px',
                    maxWidth: '80vw',
                    maxHeight: '80vh',
                    background: '#1e2128',
                    color: '#e8eaed',
                    border: '1px solid #3a3f4b',
                    borderRadius: '8px',
                    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.45)',
                    font: "13px/1.5 -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                    zIndex: '2147483000',
                },
            });

            var header = fn.element.create({
                parent: popup,
                tagName: 'div',
                style: {
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '8px',
                    padding: '8px 12px',
                    borderBottom: '1px solid #3a3f4b',
                    cursor: 'move',
                },
            });

            var title = fn.element.create({
                parent: header,
                tagName: 'div',
                style: {
                    fontWeight: '600',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                },
                text: opt.title || 'Popup',
            });

            var actions = fn.component.create({
                name: 'popup-actions',
                parent: header,
                action: opt.action,
            });

            var content = fn.element.create({
                parent: popup,
                tagName: 'div',
                style: {
                    padding: '12px',
                    overflow: 'auto',
                },
            });

            fn.element.draggable({
                el: popup,
                handle: header,
            });

            popup.header = header;
            popup.content = content;
            popup.title = title;
            popup._complete = opt.complete;
            popup._caller = opt.caller;
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
                style: {
                    width: '100%',
                    borderCollapse: 'collapse',
                },
                data: opt.data,
            });

            el._resourceKey = opt.resourceKey;
            el._inputs = {};

            opt.columns.forEach(function(column) {
                if (!column.form) {
                    return;
                }

                var row = fn.element.create({
                    tagName: 'tr',
                    parent: el,
                });

                fn.element.create({
                    tagName: 'td',
                    style: {
                        padding: '6px 0',
                        verticalAlign: 'middle',
                        width: '30%',
                        color: '#9aa0a6',
                        paddingRight: '8px',
                    },
                    text: column.label || column.name,
                    parent: row,
                });

                var valueCell = fn.element.create({
                    tagName: 'td',
                    style: {
                        padding: '6px 0',
                        verticalAlign: 'middle',
                    },
                    parent: row,
                });

                var input = fn.element.create({
                    tagName: 'input',
                    attribute: {
                        type: column.form.inputType || 'text',
                        name: column.name,
                    },
                    style: {
                        width: column.form.width || '100%',
                        boxSizing: 'border-box',
                        padding: '5px 8px',
                        background: '#14161b',
                        border: '1px solid #3a3f4b',
                        borderRadius: '4px',
                        color: '#e8eaed',
                        font: 'inherit',
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
                style: {
                    width: '100%',
                    borderCollapse: 'collapse',
                },
            });

            if (opt.columns.some(function(column) { return !!column.list; })) {
                var thead = fn.element.create({
                    tagName: 'thead',
                    parent: el,
                });
                var headRow = fn.element.create({
                    tagName: 'tr',
                    parent: thead,
                });
                opt.columns.forEach(function(column) {
                    if (!column.list) {
                        return;
                    }
                    fn.element.create({
                        tagName: 'th',
                        text: column.label || column.name,
                        style: {
                            width: column.list.width || 'auto',
                            textAlign: 'left',
                            padding: '6px 8px',
                            color: '#9aa0a6',
                            borderBottom: '1px solid #3a3f4b',
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
                var clickable = !!opt.resourceKey;
                var row = fn.element.create({
                    tagName: 'tr',
                    style: clickable ? { cursor: 'pointer' } : {},
                    hoverStyle: clickable ? { background: '#2b2f38' } : undefined,
                    event: {
                        click: function(e) {
                            if (!clickable) {
                                return;
                            }
                            fn.component.create({
                                name: 'popup',
                                title: (opt.title || '') + ' 수정',
                                parent: document.body,
                                caller: e.target.closest('.__popup'),
                                action: {
                                    save: true,
                                },
                                complete: function(formRes) {
                                    fn.component.create({
                                        name: 'form',
                                        columns: opt.columns,
                                        data: data,
                                        resourceKey: opt.resourceKey,
                                        parent: formRes.el.content,
                                    });
                                },
                            });
                        },
                    },
                    data: data,
                    parent: tbody,
                });

                var cellStyle = {
                    padding: '6px 8px',
                    borderBottom: '1px solid #2b2f38',
                };

                if (opt.columns.length) {
                    opt.columns.forEach(function(column) {
                        if (!column.list) {
                            return;
                        }
                        fn.element.create({
                            tagName: 'td',
                            style: cellStyle,
                            text: data[column.name] !== undefined ? data[column.name] : '',
                            parent: row,
                        });
                    });
                } else {
                    fn.element.create({
                        tagName: 'td',
                        style: cellStyle,
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
                style: {
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2px',
                },
            });
            if (opt.datas && Array.isArray(opt.datas)) {
                opt.datas.forEach(function(data) {
                    fn.element.create({
                        parent: el,
                        tagName: 'div',
                        style: {
                            padding: '8px 10px',
                            borderRadius: '4px',
                            cursor: 'pointer',
                        },
                        hoverStyle: {
                            background: '#2b2f38',
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
                                        action: {
                                            create: true,
                                        },
                                        complete: function(res) {
                                            res.el._resourceKey = opt.data.resourceKey;
                                            res.el._columns = opt.data.fields;
                                            var rows = fn.data.select({ resourceKey: opt.data.resourceKey });
                                            var listDatas = rows.map(function(row) {
                                                return Object.assign({ id: row.id }, row.data);
                                            });
                                            fn.component.create({
                                                name: 'list',
                                                title: opt.data.name,
                                                columns: opt.data.fields,
                                                datas: listDatas,
                                                resourceKey: opt.data.resourceKey,
                                                parent: res.el.content,
                                            });
                                        },
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
            },
            style: {
                position: 'fixed',
                right: '20px',
                bottom: '20px',
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                border: 'none',
                background: '#2b2f38',
                color: '#e8eaed',
                fontSize: '18px',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.35)',
                zIndex: '2147483000',
            },
            hoverStyle: {
                background: '#3a3f4b',
            },
            text: '⚙',
            event: {
                click: function() {
                    var datas = [
                        {
                            id: 1,
                            name: '메모',
                            resourceKey: 'memo',
                            fields: [
                                { name: 'name', label: '이름', list: { width: '160px' }, form: { inputType: 'text' } },
                                { name: 'status', label: '상태', list: { width: '100px' }, form: { inputType: 'text' } },
                                { name: 'data', label: '데이터', list: { width: 'auto' }, form: { inputType: 'text' } },
                            ],
                        },
                        {
                            id: 2,
                            name: '북마크',
                            resourceKey: 'bookmark',
                            fields: [
                                { name: 'name', label: '이름', list: { width: '160px' }, form: { inputType: 'text' } },
                                { name: 'status', label: '상태', list: { width: '100px' }, form: { inputType: 'text' } },
                                { name: 'data', label: '데이터', list: { width: 'auto' }, form: { inputType: 'text' } },
                            ],
                        },
                    ];

                    fn.component.create({
                        name: 'popup',
                        title: 'DevTool',
                        parent: document.body,
                        complete: function(res) {
                            fn.component.create({
                                name: 'menu',
                                caller: res.el,
                                datas: datas,
                                parent: res.el.content,
                            });
                        },
                    });
                },
            },
            parent: document.body,
        });
    }
});
