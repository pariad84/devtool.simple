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

    // /api/:resourceKey 제네릭 엔트리 CRUD용 클라이언트
    fn.data.select = function (opt = {}) {
        return fn.ajax({ url: '/api/' + opt.resourceKey, method: 'GET' });
    };

    fn.data.insert = function (opt = {}) {
        return fn.ajax({ url: '/api/' + opt.resourceKey, method: 'POST', data: opt.data });
    };

    fn.data.update = function (opt = {}) {
        return fn.ajax({ url: '/api/' + opt.resourceKey + '/' + opt.id, method: 'PUT', data: opt.data });
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
                    closePopup(popup);
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
                                        complete: function(opt) {
                                            fn.component.create({
                                                name: 'popup-theme-btn',
                                                parent: opt.el.content,
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
                                { name: 'content', label: '내용', list: { width: 'auto' }, form: { inputType: 'text' } },
                            ],
                        },
                        {
                            id: 2,
                            name: '북마크',
                            resource_key: 'bookmark',
                            fields: [
                                { name: 'name', label: '이름', list: { width: '160px' }, form: { inputType: 'text' } },
                                { name: 'url', label: 'URL', list: { width: 'auto' }, form: { inputType: 'text' } },
                                { name: 'status', label: '상태', list: { width: '100px' }, form: { inputType: 'text' } },
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
