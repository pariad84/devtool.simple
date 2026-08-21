(function(global) {
    const fn = {};

    fn.localStorage = {};
    fn.element = {};
    fn.data = {};
    fn.component = {};
    fn.component.data = {};
    fn.component.layout = {};
    fn.component.layout.data = {};

    fn.ajax = async function (o = {}) {
        var method = (o.method || 'POST').toUpperCase();
        var options = { method: method };
        if (method !== 'GET' && method !== 'HEAD') {
            options.headers = { 'Content-Type': o.contentType || 'application/json; charset=UTF-8' };
            options.body = JSON.stringify(o.data || {});
        }

        var response = await fetch(o.url, options);
        var result = await response.json();
        if (!response.ok) {
            throw new Error(result.error || response.statusText);
        }
        return result;
    };

    // /api/:resourceKey 제네릭 엔트리 CRUD용 클라이언트
    fn.data.select = function (o = {}) {
        return fn.ajax({ url: '/api/' + o.resourceKey, method: 'GET' });
    };

    fn.data.insert = function (o = {}) {
        return fn.ajax({ url: '/api/' + o.resourceKey, method: 'POST', data: o.data });
    };

    fn.data.update = function (o = {}) {
        return fn.ajax({ url: '/api/' + o.resourceKey + '/' + o.id, method: 'PUT', data: o.data });
    };

    fn.localStorage.get = function(o = {}) {
        if (typeof(Storage) !== "undefined") {
            return localStorage.getItem(o.key);
        }
        return null;
    };

    fn.localStorage.set = function(o = {}) {
        if (typeof(Storage) !== "undefined") {
            localStorage.setItem(o.key, o.value);
        }
    };

    fn.element.create = function(o = {}) {
        var el = document.createElement(o.tagName);
        if (o.attribute) {
            for (const [key, value] of Object.entries(o.attribute)) {
                el.setAttribute(key, value);
            }
        }

        if (o.style) {
            for (const [key, value] of Object.entries(o.style)) {
                el.style[key] = value;
            }
        }
        if (o.parent) {
            o.parent.appendChild(el);
        }
        if (o.html) {
            el.innerHTML = o.html;
        }
        if (o.text) {
            el.textContent = o.text;
        }
        if (o.event) {
            for (const [eventType, eventHandler] of Object.entries(o.event)) {
                el.addEventListener(eventType, eventHandler);
            }
        }
        if (o.complete) {
            o.complete({el: el});
        }
        el._o = o;
        if (o.datas) {
            el._datas = o.datas || [];
        }
        if (o.data) {
            el._data = o.data || {};
        }
        if (o.caller) {
            el._caller = o.caller;
        }
        return el;
    };

    fn.element.draggable = function(o = {}) {
        var el = o.el;
        var handle = o.handle || el;
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

    fn.component.create = function(o = {}) {
        var layout = this.layout.get(o);
        var el = layout(o);

        // 레이아웃별로 컴포넌트를 fn.component.data에 저장
        if (!this.data[o.name]) {
            this.data[o.name] = [];
        }
        this.data[o.name].push(el);

        if (o.parent) {
            o.parent.appendChild(el);
        }
        return el;
    };

    fn.component.layout.set = function(o = {}) {
        this.data[o.name] = o.value;
    };

    fn.component.layout.get = function(o = {}) {
        return this.data[o.name];
    }

    global.fn = fn;
})(window);


(function(global) {
    var fn = global.fn;

    fn.component.layout.set({
        name: 'popup-theme-btn',
        value: function(o = {}) {
            return fn.element.create({
                tagName: 'button',
                attribute: {
                    type: 'button',
                    title: '테마 전환',
                    class: '__popup-btn __popup-theme',
                },
                text: isDarkTheme() ? '☀️' : '🌙',
                event: {
                    click: function() {
                        toggleTheme(this);
                    }
                },
            });
        }
    });

    fn.component.layout.set({
        name: 'popup-edit-btn',
        value: function(o = {}) {
            return fn.element.create({
                tagName: 'button',
                attribute: {
                    type: 'button',
                    title: '새로 만들기',
                    class: '__popup-btn __popup-edit',
                },
                text: '✏️',
                event: {
                    click: o.onClick
                },
            });
        }
    });

    fn.component.layout.set({
        name: 'popup-save-btn',
        value: function(o = {}) {
            return fn.element.create({
                tagName: 'button',
                attribute: {
                    type: 'button',
                    title: '저장',
                    class: '__popup-btn __popup-save',
                },
                text: '💾',
                event: {
                    click: o.onClick
                },
            });
        }
    });

    fn.component.layout.set({
        name: 'popup-refresh-btn',
        value: function(o = {}) {
            return fn.element.create({
                tagName: 'button',
                attribute: {
                    type: 'button',
                    title: '새로고침',
                    class: '__popup-btn __popup-refresh',
                },
                text: '↻',
                event: {
                    click: o.onClick
                },
            });
        }
    });

    fn.component.layout.set({
        name: 'popup-close-btn',
        value: function(o = {}) {
            return fn.element.create({
                tagName: 'button',
                attribute: {
                    type: 'button',
                    title: '닫기',
                    class: '__popup-btn __popup-close',
                },
                text: '✕',
                event: {
                    click: o.onClick
                },
            });
        }
    });

    fn.component.layout.set({
        name: 'popup-actions',
        value: function(o = {}) {
            var el = fn.element.create({
                tagName: 'div',
                attribute: {
                    class: '__popup-actions',
                },
            });

            if (o.action && o.action.edit) {
                fn.component.create({
                    name: 'popup-edit-btn',
                    parent: el,
                    onClick: o.action.edit,
                });
            }

            if (o.action && o.action.save) {
                fn.component.create({
                    name: 'popup-save-btn',
                    parent: el,
                    onClick: o.action.save,
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
                    if (o.onClose) {
                        o.onClose();
                    }
                },
            });

            return el;
        }
    });

    fn.component.layout.set({
        name: 'popup',
        value: function(o = {}) {
            // 팝업 위치 계산
            var top = 50;
            var left = 50;
            var offset = 30;

            if (o.caller) {
                var callerTop = parseInt(o.caller.style.top) || 50;
                var callerLeft = parseInt(o.caller.style.left) || 50;
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
                    zIndex: ++popupZIndex,
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
                text: o.title || 'Popup',
            });

            var actions = fn.component.create({
                name: 'popup-actions',
                parent: header,
                action: o.action,
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

            popup.addEventListener('pointerdown', function() {
                bringToFront(popup);
            }, true);

            popup.header = header;
            popup.content = content;
            popup.title = title;
            if (o.complete) {
                o.complete({ el: popup });
            }
            return popup;
        }
    });

    fn.component.layout.set({
        name: 'form',
        value: function(o = {columns: [], data: {}}) {
            var el = fn.element.create({
                tagName: 'table',
                attribute: {
                    class: '__form',
                },
                data: o.data,
            });

            el._inputs = {};

            o.columns.forEach(function(column) {
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

                if (o.data[column.name] !== undefined) {
                    input.value = o.data[column.name];
                }

                el._inputs[column.name] = input;
            });

            el.getData = function() {
                var result = {};
                o.columns.forEach(function(column) {
                    if (!column.form) {
                        return;
                    }
                    var input = el._inputs[column.name];
                    result[column.name] = column.form.dataType === 'number' ? Number(input.value) : input.value;
                });
                return result;
            };

            el.setData = function(newData) {
                o.columns.forEach(function(column) {
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
        value: function(o = {columns: [], datas: []}) {
            var el = fn.element.create({
                tagName: 'table',
                attribute: {
                    class: '__list',
                },
            });

            if (o.columns.some(function(column) { return !!column.list; })) {
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
                o.columns.forEach(function(column) {
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

            o.datas.forEach(function(data) {
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

                if (o.columns.length) {
                    o.columns.forEach(function(column) {
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
        value: function(o = {}) {
            var el = fn.element.create({
                tagName: 'div',
                attribute: {
                    class: '__menu',
                },
            });
            if (o.datas && Array.isArray(o.datas)) {
                o.datas.forEach(function(data) {
                    fn.element.create({
                        parent: el,
                        tagName: 'div',
                        attribute: {
                            class: '__menu-item',
                        },
                        text: data.name,
                        event: {
                            click: data.action
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
                },
            },
            parent: document.body,
        });
    }
});
