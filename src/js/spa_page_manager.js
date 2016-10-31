/*
 * SPA page management
 *
 * @author Okabe
 */
var spa_page_transition = (function () {
    'use strict';
    var
        initModule, addAction, addEvent, prepareActivation, spaLogger, getLogger,
        DATA_BIND_EVENT = {};

    /**
     * Add action
     * @param action_id: compulsory
     * @param next_page_cls: compulsory
     * @param main_proc: compulsory, Must return jQuery.Deferred().resolve(action).promise() only when using post_proc.
     * @param post_proc: optional
     */
    addAction = function (action_id, next_page_cls, main_proc, post_proc) {
        spa_page_transition.model.addAction(action_id, next_page_cls, main_proc, post_proc);
    };

    addEvent = function (event_id) {
        DATA_BIND_EVENT[event_id] = null;
    };

    prepareActivation = function (dfd_activation) {
        spa_page_transition.shell.prepareActivation(dfd_activation);
    };

    getLogger = function () {
        return spaLogger;
    };

    initModule = function ($container, is_debug_mode) {
        spaLogger = spa_log.createLogger(is_debug_mode, 'SPA.LOG ');
        spa_page_transition.model.initModule();
        spa_page_transition.shell.initModule($container);
    };

    return {
        initModule: initModule,
        addAction: addAction,
        addEvent: addEvent,
        prepareActivation: prepareActivation,
        getLogger: getLogger,
        DATA_BIND_EVENT: DATA_BIND_EVENT,
    };
}());


spa_page_transition.shell = (function () {
    'use strict';
    var
        $errorDetailMessage,
        anchorGetter, bindView,
        dfdActivation, prepareActivation,
        execAction, renderPage, renderErrorPage, doRenderPage,
        initModule,
        ENUM_TOGGLE_ACTION_TYPE = {ADD: 'ADD', REMOVE: 'REMOVE', TOGGLE: 'TOGGLE'};

    anchorGetter = (function () {
        var
            createAnchorMap, createSelfAnchorMap, createBindAnchorMap;

        createAnchorMap = function ($el, attr_action_id, attr_action_params) {
            var
                str_params, params, params_bind,
                anchor_map = {};

            //action_id
            anchor_map['action'] = $el.attr(attr_action_id);

            //params
            str_params = $el.attr(attr_action_params);

            if (str_params) {
                params = createSelfAnchorMap(str_params);
                params_bind = createBindAnchorMap($el, str_params);
                $.extend(params, params_bind);

                $.each(params, function (key, value) {
                    anchor_map[key] = value;
                });
            }

            return anchor_map;
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

    bindView = (function () {
        var
            getToggleClassList, bindValProto, getBindVal;

        /**
         * getToggleClassList
         * @param trigger_key : Ex) 'cancel-confirm'
         * @param has_trigger_status : True if trigger's input type is checkbox or radio
         * @param trigger_status_on : True if the trigger is 'checked' or 'selected'
         * @param data_bind_toggle_class : Ex) 'cancel-confirm, btn_disable:inverse, btn-enable'
         * @returns A list of the pair of toggleActionType and toggleClass. If not matched, returns an empty list.
         */
        getToggleClassList = function (trigger_key, has_trigger_status, trigger_status_on, data_bind_toggle_attr) {
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

        bindValProto = {
            val: '',
            isShow: function () {
                return val && val.length > 0;
            }
        };

        getBindVal = function (data, prop_id, bind_format) {
            var
                result = Object.create(bindValProto);

            if (!data[prop_id]) {
                return result;
            }

            if (!bind_format) {
                result.val = data[prop_id];
                return result;
            }

            if (bind_format === 'number') {
                result.val = data[prop_id].replace(/(\d)(?=(\d{3})+$)/g, '$1,');
            } else if (bind_format === 'date') {

            } else {
                console.error('Invalid bind_format:' + bind_format)
            }
            return result;
        };

        return {
            getToggleClassList: getToggleClassList,
            getBindVal: getBindVal,
        }
    })();

    execAction = function (anchor_map) {
        spa_page_transition.model.execAction(anchor_map).then(function (data) {
            renderPage(data);
        }, function (data) {
            renderErrorPage(data.callback_data);
        });
    };

    renderPage = function (data) {
        if (!data.action) {
            throw new Error('actionProto should not be null');
        }
        doRenderPage(data.action.nextPageCls);
    };

    renderErrorPage = function (message) {
        console.error(message);
        if ($errorDetailMessage) {
            $errorDetailMessage.append(message);
            doRenderPage('spa-error');
        }
    };

    doRenderPage = function (pageCls) {
        var
            $show_target_page = $('.' + pageCls),
            $current_page = $(".spa-page:visible"),
            all_matched = $current_page.length > 0 ? true : false;

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
            $('body, html').animate({ scrollTop: 0 }, 100, 'linear');
        }
    };

    prepareActivation = function (dfd_activation) {
        dfdActivation = dfd_activation;
    };

    initModule = function ($container) {
        $(window).on('hashchange', function () {
            execAction($.uriAnchor.makeAnchorMap());
        });

        $('[data-bind-show-if],[data-bind-show-id]').each(function (idx, el) {
            $(el).hide();
        });

            if ($container) {
            $errorDetailMessage = $container.find('#error-detail-message');
        }

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

        $('*[data-view-toggle-trigger]').on('click', function (e_toggle) {
            var
                trigger_key = $(this).attr('data-view-toggle-trigger'),
                has_trigger_status = $(this).prop('type') === 'checkbox' || $(this).prop('type') === 'radio',
                trigger_status_on = has_trigger_status && ($(this).prop('checked') || $(this).prop('selected'));

            $('*[data-view-toggle-class]').each(function (idx, el) {
                var
                    toggle_class_list,
                    data_bind_toggle_attr = $(this).attr('data-view-toggle-class');

                toggle_class_list = bindView.getToggleClassList(
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

        $.each(Object.keys(spa_page_transition.DATA_BIND_EVENT), function (idx, key) {
            $(spa_page_transition.DATA_BIND_EVENT).on(key, function (e, data) {
                $.each(['text', 'html'], function (attr_idx, attr) {
                    $('[data-bind-' + attr + ']').each(function (idx, obj) {
                        var
                            bind_val,
                            obj_key_list = $(this).attr('data-bind-' + attr).split('\.');

                        if (obj_key_list && obj_key_list[0] === key) {
                            bind_val = bindView.getBindVal(data, obj_key_list[1], $(this).attr('data-bind-format'));
                            if (bind_val.isShow) {
                                if (attr === 'text') {
                                    $(this).text(bind_val.val);
                                } else if (attr ==='html') {
                                    $(this).html(bind_val.val);
                                } else {
                                    console.error("spa_page_transition.shell.DATA_BIND_EVENT Invalid attr! attr should be text or html!");
                                }
                                $(this).show();
                            } else {
                                $(this).hide();
                            }
                        }
                    });
                });
                $('*[data-bind-id]').each(function (idx, obj) {
                    var
                        bind_val,
                        obj_key_list = $(this).attr('data-bind-id').split('\.');

                    if (obj_key_list && obj_key_list[0] === key) {
                        bind_val = bindView.getBindVal(data, obj_key_list[1], $(this).attr('data-bind-format'));
                        spa_page_transition.getLogger().debug('event.key', key, 'obj_key_list', obj_key_list, 'val', bind_val);
                        if (bind_val.isShow) {
                            $(this).text(bind_val.val);
                            $(this).show();
                        } else {
                            $(this).hide();
                        }
                    }
                });
                $('[data-bind-show-if],[data-bind-show-id]').each(function (idx, el) {
                    var
                        pure_attr, obj_key_cond_list, obj_key_list, cond, val;

                    // spa_page_transition.getLogger().debug('data-bind-show-if.key', key);
                    if (!data) {
                        $(el).hide();
                        console.warn('data-bind-show-if.data is null. data-bind-show-if.key=', key);
                        return true;
                    }

                    pure_attr = $(el).attr('data-bind-show-if') ? $(el).attr('data-bind-show-if') : $(el).attr('data-bind-show-id');
                    // spa_page_transition.getLogger().debug('data-bind-show-if.pure_attr', pure_attr);
                    if (!pure_attr) {
                        return true;
                    }

                    obj_key_cond_list = pure_attr.split('=');
                    obj_key_list = obj_key_cond_list[0].split('\.');
                    if (obj_key_cond_list.length > 1) {
                        cond = obj_key_cond_list[1];
                    }

                    // spa_page_transition.getLogger().debug('data-bind-show-if.obj_key_list', obj_key_list);
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
            });
        });

        $('*[data-view-toggle-trigger="toggle-slide-next:on"]').trigger('click');

        $.when(dfdActivation).then(function (data) {
            spa_page_transition.getLogger().debug('SPA starts. model availability is ' + spa_page_transition.model.isModelAvailable());
            if (spa_page_transition.model.isModelAvailable()) {
                $(window).trigger('hashchange');
            }
        })
    };

    return {
        prepareActivation: prepareActivation,
        renderErrorPage: renderErrorPage,
        doRenderPage: doRenderPage,
        initModule: initModule,
        //VisibleForTesting
        anchorGetter: anchorGetter,
        bindView: bindView,
        ENUM_TOGGLE_ACTION_TYPE: ENUM_TOGGLE_ACTION_TYPE,
    };
}());

spa_page_transition.model = (function () {
    'use strict';
    var
        isModelAvailable,
        actionProto, actionFactory,
        addAction, findAction, execAction,
        initModule,
        actionList = [];

    /**
     * Action prototype
     * @type {{execMainProc: actionProto.execMainProc}}
     */
    actionProto = {
        execMainProc: function (params) {
            var
                dfd = $.Deferred(),
                main_proc_res,
                this_action = this;

            if (this.hasOwnProperty('preProc')) {
                this.preProc();
            }
            if (this.hasOwnProperty('mainProc')) {
                main_proc_res = this.mainProc(params);
            }
            $.when(main_proc_res).then(function (data) {
                dfd.resolve({action: this_action, callback_data: data});
            }, function (data) {
                dfd.reject({action: this_action, callback_data: data});
            });

            return dfd.promise();
        }
    };

    /**
     * Create actionProto
     * @param action_id: compulsory
     * @param next_page_cls: compulsory
     * @param main_proc: optional
     * @param post_proc: optional
     * @returns {actionProto|*}
     */
    actionFactory = function (action_id, next_page_cls, main_proc, pre_proc) {
        var
            action = Object.create(actionProto);

        action.actionId = action_id;
        action.nextPageCls = next_page_cls;
        if (pre_proc) {
            action.preProc = pre_proc;
        }
        if (main_proc) {
            action.mainProc = main_proc;
        }
        return action;
    };

    findAction = function (action_id) {
        var result;

        action_id = !action_id ? 'initialize' : action_id;
        result = actionList.filter(function (obj, idx) {
            return obj.actionId === action_id
        })[0];
        if (!result) {
            throw new Error('no action... action_id=' + action_id);
        }
        return result;
    };

    execAction = function (anchor_map) {
        var
            result,
            action = findAction(anchor_map['action']);
        try {
            result = action.execMainProc(anchor_map);
        } catch (e) {
            result = $.Deferred().reject({'callback_data': e}).promise();
        }
        return result;
    };

    addAction = function (action_id, next_page_cls, main_proc, pre_proc) {
        actionList.push(actionFactory(action_id, next_page_cls, main_proc, pre_proc));
    };

    isModelAvailable = function () {
        return actionList && actionList.length > 0;
    };

    initModule = function () {
        if (!isModelAvailable()) {
            console.warn('actionList is set so spa_page_transition.MODEL feature is NOT available.')
        }
    };

    return {
        addAction: addAction,
        execAction: execAction,
        isModelAvailable: isModelAvailable,
        initModule: initModule,
    };
}());


var spa_page_data = (function () {
    'use strict';
    var
        serverAccessor, doAccessServer;

    /**
     * The callback function should return data.spa_status === 'succeeded'
     * @param filePath: Url of server
     * @param send_params: Parameters for send to server
     * @param succeeded_func
     * @param failed_func
     * @returns {*<T>|*}
     */
    doAccessServer = function (filePath, send_params, succeeded_func, failed_func) {
        var
            dfd = $.Deferred();

        serverAccessor(filePath, send_params).done(function (data) {
            succeeded_func(data);
            dfd.resolve();
        }).fail(function (XMLHttpRequest, textStatus, errorThrown) {
            if (errorThrown) {
                console.error(errorThrown.message);
            }
            if (failed_func) {
                failed_func(XMLHttpRequest);
            } else {
                spa_page_transition.shell.renderErrorPage(XMLHttpRequest.message);
            }
            dfd.reject('Connection error occurred.');
        });

        return dfd.promise();
    };

    serverAccessor = function (filePath, data) {
        var
            dfd = $.Deferred();

        $.ajax({
            url: filePath,
            type: 'post',
            data: data,
            dataType: 'json',
            success: dfd.resolve,
            error: dfd.reject
        });

        return dfd.promise();
    };

    return {
        doAccessServer: doAccessServer,
        serverAccessor: serverAccessor,
    };
}());

var spa_log = (function () {
    'use strict';
    var
        loggerProto, createLogger;

    loggerProto = {
        isDebugMode: true,
        logPrefix: '',
        debug: function () {
            var
                log, i, is_left, is_right, is_last,
                result = '';

            if (arguments.length < 1) {
                console.error('No arguments...')
                return;
            }
            if (!this.isDebugMode) {
                return;
            }

            result += this.logPrefix + ' ';

            for (i = 0; i < arguments.length; i++) {
                is_last = (i === arguments.length - 1);
                is_right = (i % 2 === 1);

                log = (is_right ? ' = ' : '');
                log += arguments[i] instanceof Object ? JSON.stringify(arguments[i], null, '\t') : arguments[i];
                log += (is_right && !is_last ? ', ' : '');

                result += log;
            }

            console.log(result);
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

