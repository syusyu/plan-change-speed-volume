var prop_tree = (function () {
    var
        PLAN_SELECTED_EVENT = 'plan',
        INIT_DATA_EVENT = 'head',

        //From spa_manager
        DATA_BIND_EVENT = {}, addEvent,

        logger, getLogger,

        preparePage,
        selectPlan,

        initModule, initLogger, activateModule,
        dfdCompletedInitModule;

    addEvent = function (event_id) {
        DATA_BIND_EVENT[event_id] = null;
    };

    preparePage = function () {
        var
            selected_plan = prop_tree.model.selectPlan();
        prop_tree.shell.selectPlan(selected_plan.id);
    };

    getLogger = function () {
        return logger;
    };

    activateModule = function (dfd_complete_init_module) {
        dfdCompletedInitModule = dfd_complete_init_module || $.Deferred();
    };

    initLogger = function() {
        logger = spa_log.createLogger(true, '### PROP_TREE.LOG ### ');
    };

    initModule = function ($container) {
        initLogger();

        addEvent(PLAN_SELECTED_EVENT);
        addEvent(INIT_DATA_EVENT);

        prop_tree.shell.initModule($container);
        prop_tree.model.initModule();
        $.when(dfdCompletedInitModule).then(preparePage);

    };

    return {
        PLAN_SELECTED_EVENT: PLAN_SELECTED_EVENT,
        INIT_DATA_EVENT: INIT_DATA_EVENT,
        DATA_BIND_EVENT: DATA_BIND_EVENT,

        getLogger: getLogger,
        initModule: initModule,
        activateModule: activateModule,
        //VisibleForTesting
        initLogger: initLogger,
    }
})();

prop_tree.shell = (function () {
    var
        evt_data_bind_view,
        $radio_plans, selectPlan,
        initModule;

    evt_data_bind_view = (function () {
        var
            init_bind_prop_map, _create_bind_prop_map, _bind_prop_map,
            get_non_list_prop_map, get_list_prop_map, _filter_prop_map,
            settle_bind_val, _extract_val, _get_bind_val, _format_bind_val,
            each_attr, data_bind_attr_with_prop_key;

        init_bind_prop_map = function (key, data) {
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

        get_list_prop_map = function () {
            return _filter_prop_map(true);
        };

        get_non_list_prop_map = function () {
            return _filter_prop_map(false);
        };

        _filter_prop_map = function (is_list) {
            var
                inverse_list = is_list ? 1 : -1,
                result = {};

            $.each(_bind_prop_map, function (key, val) {
                var
                    inverse_matched = /(\$[0-9]+\.)/.test(key) ? 1 : -1

                if (inverse_matched * inverse_list > 0) {
                    result[key] = val;
                }
            });
            return result;
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

        settle_bind_val = function ($el, attr, data, prop_key) {
            var
                format = $el.attr('data-bind-format');

            if (attr === 'text') {
                $el.text(_format_bind_val(data, prop_key, format));
            } else if (attr === 'val') {
                $el.val(_format_bind_val(data, prop_key, format));
            } else {
                $el.attr(attr, _format_bind_val(data, prop_key, format));
            }
        };

        each_attr = function (func) {
            $.each(['text', 'id', 'val'], function (idx, el) {
                func('data-bind-' + el, el);
            });
        };

        data_bind_attr_with_prop_key = function (attr, prop_key) {
            return '[data-bind-' + attr + '="' + prop_key + '"]';
        };

        return {
            init_bind_prop_map: init_bind_prop_map,
            get_list_prop_map: get_list_prop_map,
            get_non_list_prop_map: get_non_list_prop_map,
            settle_bind_val: settle_bind_val,
            each_attr: each_attr,
            data_bind_attr_with_prop_key: data_bind_attr_with_prop_key,
            //VisibleForTesting
            _get_bind_val: _get_bind_val,
        }
    })();


    initModule = function ($container) {
        $radio_plans = $container.find('input[name="plans"]');

        $.each(Object.keys(prop_tree.DATA_BIND_EVENT), function (idx_evt, key) {
            $(prop_tree.DATA_BIND_EVENT).on(key, function (e, data) {
                var
                    bind_props = evt_data_bind_view.init_bind_prop_map(key, data),
                    non_list_props = bind_props.get_non_list_prop_map(),
                    list_props = bind_props.get_list_prop_map();
                // prop_tree.getLogger().debug('list_props', list_props);

                // $('[data-bind-text], [data-bind-id], [data-bind-val]').each(function (idx_bind, obj) {
                //     var
                //         prop_key,
                //         $this = $(this);
                //
                //     evt_data_bind_view.each_attr(function (bind_attr, attr) {
                //         prop_key = $this.attr(bind_attr);
                //         if (non_list_props[prop_key]) {
                //             evt_data_bind_view.settle_bind_val($this, attr, data, prop_key);
                //         }
                //     });
                // });

                $.each(list_props, function (prop_key, prop_val) {
                    var
                        org_prop_key, $el_org, $el;

                    evt_data_bind_view.each_attr(function (data_bind_attr, attr) {
                        $el = $(evt_data_bind_view.data_bind_attr_with_prop_key(attr, prop_key));
                        if (!$el.length) {
                            org_prop_key = prop_key.replace(/(\$[0-9])/g, '');
                            $el = $(evt_data_bind_view.data_bind_attr_with_prop_key(attr, org_prop_key) + '[data-bind-cloned="true"]');
                            if (!$el.length) {
                                $el_org = $(evt_data_bind_view.data_bind_attr_with_prop_key(attr, org_prop_key));
                                if ($el_org.length) {
                                    $el_org.hide();
                                    $el = $el_org.clone(true);
                                    $el.attr('data-bind-cloned', 'true');
                                    $el.attr(data_bind_attr, prop_key);
                                    $el.show();
                                    $el.insertAfter($el_org);
                                }
                            } else {
                                $el.attr(data_bind_attr, prop_key);
                            }
                        }
                        if ($el.length) {
                            evt_data_bind_view.settle_bind_val($el, attr, data, prop_key);
                        }
                    });

                });
            });
        });

    };

    selectPlan = function (selected_id) {
        $.each($radio_plans, function (idx, el) {
            if ($(el).attr('id') !== 'p' + selected_id || $(el).is(':checked')) {
                return true;
            }
            $(el).attr('checked', 'checked');
            return false;
        });
        // prop_tree.getLogger().debug('shell.selectPlan. id', selected_id);
    };

    return {
        selectPlan: selectPlan,
        initModule: initModule,
        //VisibleForTesting
        evt_data_bind_view: evt_data_bind_view,
    };
})();

prop_tree.model = (function () {
    var
        serverData,
        initProc, selectPlan,
        initModule;

    serverData = (function () {
        var
            headData, planList,
            prepareServerData, getHeadData, getPlanList, findPlan;

        prepareServerData = function (data) {
            headData = data.head;
            planList = data.head.plans;
        };
        getHeadData = function () {
            return headData;
        };
        getPlanList = function () {
            return planList;
        };
        findPlan = function (id) {
            if (!id) {
                return null;
            }
            return planList.filter(function (obj, idx) {
                    return obj.id === id
                })[0] || null;
        };

        return {
            prepareServerData: prepareServerData,
            getHeadData: getHeadData,
            getPlanList: getPlanList,
            findPlan: findPlan,
        }
    })();

    selectPlan = function (selected_id) {
        var
            selected_plan = serverData.findPlan(selected_id) || serverData.getPlanList()[0];

        $(prop_tree.DATA_BIND_EVENT).trigger(prop_tree.PLAN_SELECTED_EVENT, selected_plan);
        prop_tree.getLogger().debug(' model.selectPlan.selected_id', selected_id);
        return selected_plan;
    };

    initModule = function () {
        spa_page_data.doAccessServer('./data.json', null, function (data) {
            prop_tree.getLogger().debug(' model.initModule.doAccessServer.succeeded');
            serverData.prepareServerData(data);
            $(prop_tree.DATA_BIND_EVENT).trigger(prop_tree.INIT_DATA_EVENT, serverData.getHeadData());
            selectPlan();
        }, function (data) {
            alert('Failed to accecess data.json');
        });
    };

    return {
        serverData: serverData,
        selectPlan: selectPlan,
        initModule: initModule,
    }
})();
