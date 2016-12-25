/**
 * spa_page_transition.
 * Manages page transition and action of Single Page Application
 *
 * Example of how to use
 * spa_page_transition.debugMode(true).initialize(initializationFunc).addAction('action-id', 'next-page-class', [func]).run();
 * spa_page_transition.initialize(initializationFunc).addAction('action-id', 'next-page-class', [func]).run();
 * spa_page_transition.addAction('action-id', 'next-page-class', [f1]).addAction('action-id', 'next-page-class', [f1, f2]).run();
 *
 * @type {{initModule, addAction, addEvent, prepareActivation, getLogger, DATA_BIND_EVENT}}
 */
var spa_page_transition = (function () {
    'use strict';
    var
        addAction, createFunc, createAjaxFunc, initialize, debugMode, run, renderPage,
        spaLogger, getLogger,
        isDebugMode;

    /**
     * Register function to be bound with action
     * @param _main_func
     * @returns {*}
     */
    createFunc = function (_main_func) {
        return spa_page_transition.func.createFunc.apply(this, arguments);
    };

    /**
     * Register ajax function to be bound with action
     * @param path: optional
     * @param params: optional
     * @param call_back_func: compulsory
     * @returns {*}
     */
    createAjaxFunc = function (path, params, call_back_func) {
        return spa_page_transition.func.createAjaxFunc.apply(this, arguments);
    };

    /**
     * Add action
     * @param action_id: compulsory
     * @param next_page_cls: compulsory
     * @param func_list: optional
     */
    addAction = function (action_id, next_page_cls, func_list) {
        spa_page_transition.model.addAction(action_id, next_page_cls, func_list);
        return spa_page_transition;
    };

    /**
     * Initialize spa_page_transition
     * @param initialize_func: optional
     * @returns {*}
     */
    initialize = function (initialize_func) {
        spaLogger = spa_log.createLogger(isDebugMode, 'SPA.LOG ');
        spa_page_transition.model.initialize.apply(this, arguments);
        return spa_page_transition;
    };

    /**
     * Run as debug mode (This allows to print debug log)
     * @param is_debug_mode
     * @returns {{initModule, addAction, addEvent, prepareActivation, getLogger, DATA_BIND_EVENT}}
     */
    debugMode = function (is_debug_mode) {
        isDebugMode = is_debug_mode;
        return spa_page_transition;
    };

    /**
     * Make spa_page_transition starts.
     * @param params: Optional. Pass map if necessary to use it in initilize func.
     */
    run = function (params) {
        spa_page_transition.data_bind.run();
        spa_page_transition.shell.run(params);
    };

    /**
     * Make the spa-page visible
     * @param page_class_name: the class name of showing page, compulsory
     */
    renderPage = function (page_class_name) {
        spa_page_transition.shell.doRenderPage(page_class_name);
    };

    getLogger = function () {
        return spaLogger;
    };

    /**
     * Object.create polyfill
     */
    if (!Object.create) {
        Object.create = function (o) {
            if (arguments.length > 1) {
                throw new Error('Object.create implementation only accepts the first parameter.');
            }
            function F() {
            }

            F.prototype = o;
            return new F();
        };
    }

    return {
        addAction: addAction,
        getLogger: getLogger,
        createFunc: createFunc,
        createAjaxFunc: createAjaxFunc,
        debugMode: debugMode,
        initialize: initialize,
        run: run,
        renderPage: renderPage,
    };
}());


spa_page_transition.model = (function () {
    'use strict';
    var
        START_ACTION = 'START-ACTION',
        actionProto, actionFactory,
        addAction, findAction, execAction,
        initialize,

        actionList = [],
        initializationFunc, getInitializationFunc,
        execFunc;

    /**
     * Action prototype
     */
    actionProto = {
        actionId: '',
        nextPageCls: '',
        funcList: []
    };

    /**
     * Create actionProto
     * @param action_id: compulsory
     * @param next_page_cls: optional
     * @param main_proc: optional
     * @returns {actionProto|*}
     */
    actionFactory = function (action_id, next_page_cls, func_list) {
        var
            action = Object.create(actionProto);

        action.actionId = action_id;
        action.nextPageCls = next_page_cls;
        action.funcList = func_list;
        return action;
    };

    addAction = function (action_id, next_page_cls, func_list) {
        actionList.push(actionFactory(action_id, next_page_cls, func_list));
    };

    /**
     * Initialize necesary properties
     * @param initialize_func optional
     * @returns {initialize}
     */
    initialize = function (initialize_func) {
        initializationFunc = initialize_func;
        actionList = [];
    };

    getInitializationFunc = function () {
        return initializationFunc;
    };

    execAction = function (anchor_map) {
        return execFunc(findAction(anchor_map).funcList, anchor_map);
    };

    execFunc = function (func_list, anchor_map) {
        var
            i, p,
            f_idx = 1;

        if (spa_page_util.isEmpty(func_list)) {
            return $.Deferred().resolve().promise();
        }

        p = func_list[0].execute(anchor_map);


        for (i = 1; i < func_list.length; i++) {
            p = p.then(function (data) {
                return func_list[f_idx++].execute(anchor_map);
            }, function (data) {
                return $.Deferred().reject(data).promise();
            });
        }

        return p;
    };

    findAction = function (anchor_map) {
        var
            action_id = anchor_map['action'] ? anchor_map['action'] : START_ACTION,
            result;

        result = actionList.filter(function (obj, idx) {
            return obj.actionId === action_id
        })[0];

        if (!result) {
            throw new Error('Invalid action... action_id=' + action_id);
        }
        return result;
    };

    return {
        addAction: addAction,
        execAction: execAction,
        findAction: findAction,
        initialize: initialize,
        getInitializationFunc: getInitializationFunc,
        START_ACTION: START_ACTION,
    };
}());


spa_page_transition.func = (function () {
    'use strict';
    var
        protoFunc,
        chooseArgByType,
        createFunc, createAjaxFunc;

    protoFunc = {
        execute: function (anchor_map) {
            return this.exec_main_func(this, anchor_map).promise();
        },

        exec_main_func: function (this_obj, anchor_map, data) {
            try {
                this_obj.main_func(this_obj, anchor_map, data);
            } catch (e) {
                console.error(e.message ? e.message : e, e);
                return $.Deferred().reject(e.message ? {'err_mes': e.message} : e);
            }
            if (this_obj.stays) {
                //Initialize stays here.
                this_obj.stays = false;
                spa_page_transition.getLogger().debug('exec_main_func.stays is on.');
                return $.Deferred().reject({'stays': true});
            } else {
                return $.Deferred().resolve();
            }
        },

        stay: function () {
            this.stays = true;
        },

        error: function (err_mes) {
            throw new Error(err_mes);
        },

        trigger: function (key, val) {
            spa_page_transition.data_bind.evt_data_bind_view.trigger(key, val);
            return this;
        },
    };

    chooseArgByType = function (args, type) {
        for (var i = 0; i < args.length; i++) {
            if (typeof(args[i]) === type) {
                return args[i];
            }
        }
    };

    createFunc = function (_main_func) {
        var
            i, arg_main_func, res;

        arg_main_func = chooseArgByType(arguments, 'function');
        if (!arg_main_func) {
            throw new Error('No main_func is set.');
        }
        res = Object.create(protoFunc);
        res.main_func = arg_main_func;
        return res;
    };

    createAjaxFunc = function (_path, _params, _main_func) {
        var
            decide_path, decide_params,
            res = createFunc.apply(this, arguments);

        res.path = chooseArgByType(arguments, 'string');
        res.params = chooseArgByType(arguments, 'object');

        res.execute = function (anchor_map) {
            var
                d = $.Deferred(),
                this_obj = this;

            spa_page_data.serverAccessor(decide_path(this_obj), decide_params(this_obj)).then(function (data) {
                    this_obj.exec_main_func(this_obj, anchor_map, data).then(function (data_main_func) {
                        d.resolve(data_main_func);
                    }, function (data_main_func) {
                        d.reject(data_main_func);
                    });
                }, function (data) {
                    spa_page_transition.getLogger().error('ajaxFunc.serverAccess failed. data', data);
                    d.reject(data);
                }
            );

            return d.promise();
        };

        res.get_path = function (_get_path_func) {
            this.get_path_func = _get_path_func;
            return this;
        };

        res.get_params = function (_get_params_func) {
            this.get_params_func = _get_params_func;
            return this;
        };

        decide_path = function (this_obj) {
            var
                res = this_obj.get_path_func ? this_obj.get_path_func() : this_obj.path;
            if (!res) {
                throw new Error('path is not set.');
            }
            return res;
        };

        decide_params = function (this_obj) {
            return this_obj.get_params_func ? this_obj.get_params_func() : this_obj.params;
        };

        return res;
    };

    return {
        createFunc: createFunc,
        createAjaxFunc: createAjaxFunc,
    }
})();

var spa_page_data = (function () {
    'use strict';
    var
        serverAccessor = function (filePath, data) {
            var
                dfd = $.Deferred();

            $.ajax({
                url: filePath,
                type: 'get',
                data: data,
                dataType: 'json',
                success: dfd.resolve,
                error: dfd.reject,
                cache: false
            });

            return dfd.promise();
        };

    return {
        serverAccessor: serverAccessor,
    };
}());


spa_page_transition.shell = (function () {
    'use strict';
    var
        anchorGetter, bindView,
        run, startAction, execAction, renderPage, renderErrorPage, doRenderPage;

    anchorGetter = (function () {
        var
            createAnchorMap, createSelfAnchorMap, createSelfKeyAnchorMap, createBindAnchorMap;

        createAnchorMap = function ($el, attr_action_id, attr_action_params) {
            var
                str_params, params, params_bind, params_key,
                anchor_map = {};

            //action_id
            anchor_map['action'] = $el.attr(attr_action_id);

            //params
            str_params = $el.attr(attr_action_params);

            if (str_params) {
                params = createSelfAnchorMap(str_params);
                params_bind = createBindAnchorMap($el, str_params);
                $.extend(params, params_bind);
                params_key = createSelfKeyAnchorMap($el, str_params);
                $.extend(params, params_key);

                $.each(params, function (key, value) {
                    anchor_map[key] = value;
                });
            }

            return anchor_map;
        };

        createSelfKeyAnchorMap = function ($el, str_params) {
            var result = '';

            if (spa_page_util.contains(str_params, '=')) {
                return {};
            }
            var keys = str_params.split(',');
            $.each(keys, function (idx, key) {
                var
                    val;
                if (key === 'val') {
                    val = $el.val();
                } else if (key === 'id') {
                    val = $el.attr('id');
                }
                result += val ? ('"' + key + '":"' + val + '"') : '';
                result += (result && idx < keys.length - 1 ? ',' : '');
            })
            return JSON.parse('{' + result + '}');
        };

        createSelfAnchorMap = function (str_params) {
            var
                pattern, matched_str_list,
                result = '';

            pattern = /[a-zA-Z0-9]+=[a-zA-Z0-9]+/g;
            matched_str_list = str_params.match(pattern) || [];

            $.each(matched_str_list, function (idx, matched_str) {
                result += matched_str.replace(pattern, function (target) {
                    var
                        key_val_list = target.split('=');

                    return '"' + key_val_list[0] + '":"' + key_val_list[1] + '"';
                });
                result += idx < matched_str_list.length - 1 ? ',' : '';
            });

            return JSON.parse('{' + result + '}');
        };

        createBindAnchorMap = function ($el, str_params) {
            var
                pattern, matched_str_list,
                result = {};

            pattern = /\$(name|id)\.[a-zA-Z0-9]+\.data\-action\-[a-zA-Z0-9]+\-params/g;
            matched_str_list = str_params.match(pattern) || [];

            $.each(matched_str_list, function (idx, matched_str) {
                var
                    elements, type, selector, attr_name, bind_str_param, $bind_el;

                elements = matched_str.split('\.');

                if (!elements || elements.length != 3) {
                    throw new Error('bindAnchor.format.illegal. ' + matched_str);
                }

                type = elements[0];
                selector = elements[1];
                attr_name = elements[2];
                $bind_el = $('input[name="' + selector + '"]:checked');

                if (!$bind_el) {
                    throw new Error('bindAnchor.bind.element.null. ' + $bind_el);
                }

                bind_str_param = $bind_el.attr(attr_name);

                if (!bind_str_param) {
                    throw new Error('bindAnchor.bind.param.null. ' + bind_str_param);
                }

                $.extend(result, createSelfAnchorMap(bind_str_param));
            });
            return result;
        };

        return {
            createAnchorMap: createAnchorMap,
            //VisibleForTesting
            createSelfAnchorMap: createSelfAnchorMap,
        }
    })();

    startAction = function () {
        $(window).trigger('hashchange');
    };

    execAction = function (anchor_map) {
        spa_page_transition.model.execAction(anchor_map).then(function (data) {
            renderPage(anchor_map);
        }, function (data) {
            if (data && data.stays) {
                return;
            } else {
                renderErrorPage(data);
            }
        });
    };

    renderPage = function (anchor_map) {
        var
            action = spa_page_transition.model.findAction(anchor_map);

        if (!action) {
            throw new Error('actionProto should not be null');
        }
        doRenderPage(action.nextPageCls);
    };

    renderErrorPage = function (data) {
        if (data && data.err_mes) {
            console.warn(data.err_mes);
        }
        doRenderPage('spa-error');
    };

    doRenderPage = function (pageCls) {
        var
            $show_target_page = $('.' + pageCls),
            $current_page = $(".spa-page:visible"),
            all_matched = spa_page_util.exists($current_page) ? true : false;

        $current_page.each(function (idx, el) {
            all_matched &= $(el).hasClass(pageCls);
        });

        if (all_matched) {
            return;
        }

        if (!$show_target_page.hasClass('modal')) {
            $('.spa-page').removeClass('visible');
        }

        $show_target_page.addClass('visible');

        if ($show_target_page.hasClass('spa-scroll-top')) {
            $('body, html').animate({scrollTop: 0}, 100, 'linear');
        }
    };

    run = function (params) {
        $(window).on('hashchange', function () {
            execAction($.uriAnchor.makeAnchorMap());
        });

        $('*[data-action-click-id]').on('click', function (e) {
            $.uriAnchor.setAnchor(anchorGetter.createAnchorMap($(this), 'data-action-click-id', 'data-action-click-params'));
        });

        $('*[data-action-change-id]').on('change', function (e) {
            $.uriAnchor.setAnchor(anchorGetter.createAnchorMap($(this), 'data-action-change-id', 'data-action-change-params'));
        });

        $('*[data-action-click-dbupdate-id]').on('click', function (e) {
            $(this).addClass('spa-update-btn-disabled');
            execAction(anchorGetter.createAnchorMap($(this), 'data-action-click-dbupdate-id', 'data-action-click-dbupdate-params'));
            history.pushState(null, null, location.pathname);
            window.addEventListener("popstate", function () {
                history.pushState(null, null, location.pathname);
            });
        });

        if (!spa_page_transition.model.getInitializationFunc()) {
            startAction();
        } else {
            $.when(spa_page_transition.model.getInitializationFunc().execute(params)).then(function () {
                startAction();
            }, function () {
                renderErrorPage();
            });
        }
    };

    return {
        run: run,
        doRenderPage: doRenderPage,
        //VisibleForTesting
        anchorGetter: anchorGetter,
        bindView: bindView,
    };
}());

spa_page_transition.data_bind = (function () {
    'use strict';
    var
        ENUM_TOGGLE_ACTION_TYPE = {ADD: 'ADD', REMOVE: 'REMOVE', TOGGLE: 'TOGGLE'},
        BIND_ATTR_REPLACED_KEY = 'data-bind-replaced-key',
        evt_data_bind_view,
        run;

    evt_data_bind_view = (function () {
        var
            _init_bind_prop_map, _create_bind_prop_map, _bind_prop_map,
            _get_all_prop_map,
            _settle_bind_val, _extract_val, _get_bind_val, _format_bind_val,
            _each_attr_type, _each_attr_type_selectors,

            _create_loop_element, _do_find_loop_element, _clone_loop_children, _replace_cloned_element_attr,

            get_toggle_class_list,
            trigger,

            BIND_ATTR_TYPES = ['id', 'text', 'text1', 'text2', 'text3', 'html', 'val', 'loop', 'selected'];

        _init_bind_prop_map = function (key, data) {
            $('[' + BIND_ATTR_REPLACED_KEY + ']').each(function (idx, el) {
                var replaced_key = $(el).attr(BIND_ATTR_REPLACED_KEY);
                if (spa_page_util.startsWith(replaced_key, key)) {
                    $(el).remove();
                }
            });
            _bind_prop_map = {};
            _create_bind_prop_map(key, data);
            return this;
        };

        _create_bind_prop_map = function (whole_key, data) {
            if (!whole_key) {
                throw new Error('key should not be null:' + key);
            }
            if (!(data instanceof Object)) {
                throw new Error('data should be a map');
            }

            $.each(data, function (data_key, data_val) {
                var new_key = whole_key + "." + data_key;

                if (data_val instanceof Array) {
                    $.each(data_val, function (ary_idx, ary_val) {
                        _create_bind_prop_map(new_key + '$' + ary_idx, ary_val);
                    });
                } else if (data_val instanceof Object) {
                    _create_bind_prop_map(new_key, data_val);
                } else {
                    _bind_prop_map[new_key] = data_val;
                }
            });
        };

        _get_all_prop_map = function () {
            return _bind_prop_map;
        };

        _extract_val = function (data, key) {
            var
                val,
                keys = key.split('\$');

            val = keys.length > 1 ? data[keys[0]][keys[1]] : data[key];
            return val;
        };

        /**
         *
         * @param data
         * @param key: This is split and keys[0] is entity, keys[1..n] is property of the entity.
         * @returns {*}
         * @private
         */
        _get_bind_val = function (data, key) {
            var
                i, val, pure_key,
                keys = key.split('\.');

            if (keys.length < 2) {
                throw new Error('key should be like "entity.prop" but actual key = ' + key);
            }
            val = _extract_val(data, keys[1]);
            for (i = 2; i < keys.length; i++) {
                val = _extract_val(val, keys[i]);
            }
            return val;
        };

        _format_bind_val = function (data, prop_key, bind_format) {
            var
                val = _get_bind_val(data, prop_key);

            if (!bind_format) {
                return val;
            }
            if (bind_format === 'number') {
                val = val.replace(/(\d)(?=(\d{3})+$)/g, '$1,');
            } else if (bind_format === 'date') {
            } else {
                console.error('Invalid bind_format:' + bind_format)
            }
            return val;
        };

        _settle_bind_val = function ($el, attr, data, prop_key) {
            var
                prev_val,
                format = $el.attr('data-bind-format'),
                separator = $el.attr('data-bind-text-separator') || '',
                val = _format_bind_val(data, prop_key, format);

            if (attr === 'text') {
                $el.text(val);
            } else if (attr === 'text1' || attr === 'text2' || attr === 'text3') {
                prev_val = $el.text();
                if (prev_val) {
                    $el.text(prev_val + separator + val);
                } else {
                    $el.text(val);
                }
            } else if (attr === 'html') {
                $el.html(val);
            } else if (attr === 'val') {
                $el.val(val);
            } else if (attr === 'selected') {
                $el.attr(attr, 'selected');
            } else {
                $el.attr(attr, val);
            }
            $el.show();
        };

        _each_attr_type = function (func) {
            $.each(BIND_ATTR_TYPES, function (idx, el) {
                func('data-bind-' + el, el);
            });
        };

        _each_attr_type_selectors = function () {
            var result = '';
            $.each(BIND_ATTR_TYPES, function (idx, el) {
                result += (idx > 0 ? ',' : '') + '[data-bind-' + el + ']';
            });
            return result;
        };

        /**
         * @param parent, should not be loop element.
         */
        _create_loop_element = function (parent, data, key) {
            $(parent).children().each(function (idx, el) {
                _do_find_loop_element(el, data, key);
            });
        };

        _do_find_loop_element = function (el, data, key) {
            var
                cloned_children,
                loop_prop_key = $(el).attr('data-bind-loop');

            if (loop_prop_key && loop_prop_key.indexOf(key) === 0) {
                cloned_children = _clone_loop_children(el, loop_prop_key, data);
                $.each(cloned_children, function (idx, el_cloned_child) {
                    _do_find_loop_element(el_cloned_child, data, key);
                });
            } else if ($(el).children()) {
                _create_loop_element(el, data, key);
            }
        };

        _clone_loop_children = function (el, loop_prop_key, data) {
            var
                i, $el_cloned,
                list = _get_bind_val(data, loop_prop_key),
                cloned_elements = [], clone_target_elements = [],
                bind_attr_type_selectors = _each_attr_type_selectors();

            if (spa_page_util.isEmpty(list)) {
                return [];
            }
            for (i = 0; i < list.length; i++) {
                $(el).children().each(function (idx, el_child) {
                    $el_cloned = $(el_child).clone(true);
                    _replace_cloned_element_attr($el_cloned, loop_prop_key, i);
                    $el_cloned.find(bind_attr_type_selectors).each(function (idx, el_cloned_child) {
                        _replace_cloned_element_attr($(el_cloned_child), loop_prop_key, i);
                    });
                    cloned_elements.push($el_cloned);
                    clone_target_elements.push($(el_child));
                });
            }

            $.each(cloned_elements, function (idx, $el_child) {
                $(el).append($el_child);
            });
            $.each(clone_target_elements, function (idx, $el_child) {
                $el_child.hide();
            });

            return cloned_elements;
        };

        _replace_cloned_element_attr = function ($el, loop_prop_key, i) {
            _each_attr_type(function (bind_attr_type, attr_type) {
                var
                    bind_attr = $el.attr(bind_attr_type);

                if (bind_attr) {
                    $el.attr(bind_attr_type, bind_attr.replace(loop_prop_key, loop_prop_key + '$' + i));
                    $el.attr(BIND_ATTR_REPLACED_KEY, loop_prop_key);
                }
            });
        };

        /**
         * get_toggle_class_list
         * @param trigger_key : Ex) 'cancel-confirm'
         * @param has_trigger_status : True if trigger's input type is checkbox or radio
         * @param trigger_status_on : True if the trigger is 'checked' or 'selected'
         * @param data_bind_toggle_class : Ex) 'cancel-confirm, btn_disable:inverse, btn-enable'
         * @returns A list of the pair of toggleActionType and toggleClass. If not matched, returns an empty list.
         */
        get_toggle_class_list = function (trigger_key, has_trigger_status, trigger_status_on, data_bind_toggle_attr) {
            var
                key_cls_list, cls_list,
                result = [];

            if (!trigger_key || !data_bind_toggle_attr) {
                throw new Error('trigger_key:' + trigger_key + ', data_bind_toggle_attr:' + data_bind_toggle_attr);
            }

            key_cls_list = data_bind_toggle_attr.replace(/\s+/g, '').split(',');
            if (key_cls_list.length < 2) {
                throw new Error('key_cls_list:' + key_cls_list);
            }

            if (trigger_key !== key_cls_list[0]) {
                return [];
            }

            cls_list = key_cls_list.slice(1);
            $.each(cls_list, function (idx, obj) {
                var
                    cls_inverse, len, toggle_class, toggle_action_type, status_on, inverse;

                cls_inverse = obj.split(':');
                len = cls_inverse.length;
                if (len != 1 && len != 2) {
                    throw new Error('cls_inverse(obj):' + obj);
                }

                toggle_class = cls_inverse[0];
                status_on = trigger_status_on ? 1 : -1;
                inverse = len > 1 && cls_inverse[1] === 'inverse' ? 1 : -1;
                toggle_action_type = !has_trigger_status ? ENUM_TOGGLE_ACTION_TYPE.TOGGLE
                    : (status_on * inverse > 0 ? ENUM_TOGGLE_ACTION_TYPE.REMOVE : ENUM_TOGGLE_ACTION_TYPE.ADD);
                result.push({'toggle_action_type': toggle_action_type, 'toggle_class': toggle_class});
            });
            return result;
        };

        trigger = function (key, data) {
            var
                all_props, bind_attr_type_selectors;

            if (!data) {
                return true;
            }

            _init_bind_prop_map(key, data);
            all_props = _get_all_prop_map();
            bind_attr_type_selectors = _each_attr_type_selectors();

            _create_loop_element($('body'), data, key);

            $(bind_attr_type_selectors).each(function (idx_bind, obj) {
                var
                    el_prop_key,
                    $this = $(this);

                _each_attr_type(function (bind_attr, attr) {
                    el_prop_key = $this.attr(bind_attr);
                    if (!el_prop_key || !spa_page_util.startsWith(el_prop_key, key)) {
                        return true;
                    }
                    if (all_props[el_prop_key]) {
                        _settle_bind_val($this, attr, data, el_prop_key);
                    }
                });
            });

            $('[data-bind-show-if],[data-bind-show-id]').each(function (idx, el) {
                var
                    pure_attr, obj_key_cond_list, obj_key_list, cond, val;

                if (!data) {
                    $(el).hide();
                    console.warn('data-bind-show-if.data is null');
                    return true;
                }

                pure_attr = $(el).attr('data-bind-show-if') ? $(el).attr('data-bind-show-if') : $(el).attr('data-bind-show-id');
                if (!pure_attr) {
                    return true;
                }

                obj_key_cond_list = pure_attr.split('=');
                obj_key_list = obj_key_cond_list[0].split('\.');
                if (obj_key_cond_list.length > 1) {
                    cond = obj_key_cond_list[1];
                }

                if (obj_key_list && obj_key_list[0] === key) {
                    val = data[obj_key_list[1]];
                    if (!val) {
                        $(el).hide();
                    } else if (cond && cond !== val) {
                        $(el).hide();
                    } else {
                        $(el).show();
                    }
                }
            });
        };

        return {
            get_toggle_class_list: get_toggle_class_list,
            trigger: trigger,

            //VisibleForTesting
            _get_bind_val: _get_bind_val,
        }
    })();

    run = function () {
        $('[data-view-toggle-trigger]').on('click', function (e_toggle) {
            var
                trigger_key = $(this).attr('data-view-toggle-trigger'),
                has_trigger_status = $(this).prop('type') === 'checkbox' || $(this).prop('type') === 'radio',
                trigger_status_on = has_trigger_status && ($(this).prop('checked') || $(this).prop('selected'));

            $('[data-view-toggle-class]').each(function (idx, el) {
                var
                    toggle_class_list,
                    data_bind_toggle_attr = $(this).attr('data-view-toggle-class');

                toggle_class_list = evt_data_bind_view.get_toggle_class_list(
                    trigger_key, has_trigger_status, trigger_status_on, data_bind_toggle_attr);

                $.each(toggle_class_list, function (idx, obj) {
                    if (obj.toggle_action_type === ENUM_TOGGLE_ACTION_TYPE.TOGGLE) {
                        $(el).toggleClass(obj.toggle_class);
                    } else if (obj.toggle_action_type === ENUM_TOGGLE_ACTION_TYPE.ADD) {
                        $(el).addClass(obj.toggle_class);
                    } else if (obj.toggle_action_type === ENUM_TOGGLE_ACTION_TYPE.REMOVE) {
                        $(el).removeClass(obj.toggle_class);
                    }
                });
            });

            if (trigger_key && trigger_key.indexOf('toggle-slide-next') === 0) {
                $(this).next('.toggle-slide-next-target').slideToggle();
            }
        });

        $('[data-view-toggle-trigger="toggle-slide-next:on"]').trigger('click');
    };

    return {
        run: run,
        //VisibleForTesting
        evt_data_bind_view: evt_data_bind_view,
        ENUM_TOGGLE_ACTION_TYPE: ENUM_TOGGLE_ACTION_TYPE,
    }
})();

var spa_log = (function () {
    'use strict';
    var
        loggerProto, createLogger;

    loggerProto = {
        isDebugMode: true,
        logPrefix: '',
        debug: function () {
            var log;

            if (!this.isDebugMode) {
                return;
            }
            log = this.create_log(arguments);
            if (spa_page_util.isNotEmpty(log)) {
                console.log(log);
            }
        },
        error: function () {
            var log = this.create_log(arguments);
            if (spa_page_util.isNotEmpty(log)) {
                console.error(log);
            }
        },
        create_log: function (logs) {
            var
                log, i, is_left, is_right, is_last,
                result = '';

            if (logs.length < 1) {
                console.error('No arguments...')
                return;
            }

            for (i = 0; i < logs.length; i++) {
                is_last = (i === logs.length - 1);
                is_right = (i % 2 === 1);

                log = (is_right ? ' = ' : '');
                log += logs[i] instanceof Object ? JSON.stringify(logs[i], null, '\t') : logs[i];
                log += (is_right && !is_last ? ', ' : '');

                result += log;
            }
            return result;
        }
    };

    createLogger = function (is_debug_mode, log_prefix) {
        var logger = Object.create(loggerProto);
        logger.isDebugMode = is_debug_mode;
        logger.logPrefix = log_prefix || '';
        return logger;
    };

    return {
        createLogger: createLogger,
    }
})();

var spa_page_util = (function () {
    'use strict';
    var
        exists = function ($el) {
            return $el && $el.length > 0;
        },
        isEmpty = function (target) {
            if (!target) {
                return true;
            }
            if ($.isArray(target) || typeof target === 'string') {
                return target.length < 1;
            } else if (typeof target === 'object') {
                return Object.keys(target).length < 1;
            }
        },
        isNotEmpty = function (target) {
            return !isEmpty(target);
        },
        startsWith = function (str, prefix) {
            return str.indexOf(prefix) === 0;
        },
        contains = function (str, target) {
            return str.indexOf(target) != -1;
        };

    return {
        exists: exists,
        isEmpty: isEmpty,
        isNotEmpty: isNotEmpty,
        startsWith: startsWith,
        contains: contains,
    }
})();
