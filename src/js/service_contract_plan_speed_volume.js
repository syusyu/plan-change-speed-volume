var plan_speed_volume = (function () {
    'use strict';
    var
        logger,
        contract_plan_id, model, shell,
        initModule;

    initModule = function ($server_host, send_params, is_debug_mode) {
        var
            server_host = spa_page_util.exists($server_host) ? $server_host.val() : null,
            contract_plan_id = send_params['contractPlanId'],

            PATH_INIT = server_host + '/data_init_low_speed.json',
            PATH_UPDATE_SPEED = server_host + '/data_update_succeeded_high.json',
            PATH_UPDATE_VOLUME = server_host + '/data_update_succeeded_high.json',
            // PATH_INIT = server_host + '/data_init_high_speed.json',
            // PATH_INIT = server_host + '/data_init_disable.json',
            // PATH_UPDATE_SPEED = server_host + '/data_update_succeeded_low.json',
            // PATH_UPDATE_SPEED = server_host + '/data_update_failed.json',
            // PATH_UPDATE_VOLUME = server_host + '/data_update_failed.json',

            callbackFuncProto = {
                callbackFunc: function (observer, anchor_map, data) {
                    logger.debug('Ajax proc done!');
                    model.prepare(data);
                    observer.trigger('SPEED', model.get_speed_status());
                    observer.trigger('VOLUME', model.get_volume_status());
                }
            },

            createInitCallBack = function () {
                var result = Object.create(callbackFuncProto);
                result.callbackFunc = function (observer, anchor_map, data) {
                    logger.debug('createInitCallBack is called. data', data);
                    callbackFuncProto.callbackFunc.apply(this, arguments);
                    observer.trigger('PLAN', model.get_plan_data());
                };
                return result;
            },

            createUpdateSpeedCallBack = function () {
                var result = Object.create(callbackFuncProto);
                result.callbackFunc = function (observer, anchor_map, data) {
                    logger.debug('createUpdateSpeedCallBack is called. data', data);
                    callbackFuncProto.callbackFunc.apply(this, arguments);
                    observer.trigger('SPEED_UPDATE', model.get_speed_update());
                };
                return result;
            },

            createUpdateVolumeCallBack = function () {
                var result = Object.create(callbackFuncProto);
                result.callbackFunc = function (observer, anchor_map, data) {
                    logger.debug('createUpdateVolumeCallBack is called. data', data);
                    callbackFuncProto.callbackFunc.apply(this, arguments);
                    observer.trigger('VOLUME_UPDATE', model.get_volume_update());
                };
                return result;
            },

            selectVolumePack = spa_page_transition.createFunc(function (observer, anchor_map) {
                logger.debug('selectVolumePack is called. selected_val', anchor_map.val);
                model.settle_selected_volume_pack(anchor_map.val);
                shell.hide_error_message();
                observer.trigger('SELECTED_VOLUME_PACK', model.get_selected_volume_pack());
            }),

            validateVolumePack = spa_page_transition.createFunc(function (observer, anchor_map) {
                var
                    selected_volume_val = $('#volume-pack-list').val();

                logger.debug('validateVolumePack is called. val=' + selected_volume_val);
                if (!selected_volume_val || selected_volume_val < 0) {
                    shell.show_error_message();
                    observer.forward('next-to-add-volume');
                }
            }),

            tearDown = spa_page_transition.createFunc(function (observer, anchor_map) {
                logger.debug('tearDown is called.')
                shell.tear_down();
            }),

            initializationFunc = spa_page_transition.createAjaxFunc(PATH_INIT, send_params, createInitCallBack().callbackFunc),

            updateSpeed = spa_page_transition.createAjaxFunc(PATH_UPDATE_SPEED, {},
                createUpdateSpeedCallBack().callbackFunc).get_params(shell.get_params_for_update),

            updateVolume = spa_page_transition.createAjaxFunc(PATH_UPDATE_VOLUME, {},
                createUpdateVolumeCallBack().callbackFunc).get_params(shell.get_params_for_update_volume),

            logger = spa_log.createLogger(is_debug_mode, '### SPEED_VOLUME.LOG ###');

        if (spa_page_util.isEmpty(server_host)) {
            spa_page_transition.renderPage('plan-detail-main');
        } else {
            spa_page_transition.debugMode(is_debug_mode).initialize(initializationFunc)
                .addAction(spa_page_transition.model.START_ACTION, 'plan-detail-main')
                .addAction('next-to-change-speed', 'plan-speed-change')
                .addAction('next-to-add-volume', 'plan-volume-add')
                .addAction('back-to-plan-detail-main', 'plan-detail-main', [tearDown])
                .addAction('select-volume-pack', 'plan-volume-add', [selectVolumePack])
                .addAction('update-speed', 'plan-speed-complete', [updateSpeed])
                .addAction('update-volume', 'plan-volume-complete', [validateVolumePack, updateVolume, tearDown])
                .run();
        }
    };

    model = (function () {
        var
            _plan_data, get_plan_data,
            _speed_status, get_speed_status,
            _speed_update, get_speed_update,
            _volume_status, get_volume_status,
            get_volume_pack_list,
            _selected_volume_pack, get_selected_volume_pack, settle_selected_volume_pack,
            _volume_update, get_volume_update,
            prepare;

        prepare = function (data) {
            _speed_status = data.speed_status;
            _speed_update = data.speed_update;
            _volume_status = data.volume_status;
            _volume_update = data.volume_update;
            _plan_data = data.plan_data;
        };

        get_plan_data = function () {
            return _plan_data;
        };

        get_speed_status = function () {
            return _speed_status;
        };

        get_speed_update = function () {
            return _speed_update;
        };

        get_volume_status = function () {
            return _volume_status;
        };

        get_volume_update = function () {
            return _volume_update;
        };

        get_volume_pack_list = function () {
            return _volume_status.volume_pack_list;
        };

        get_selected_volume_pack = function () {
            return _selected_volume_pack;
        };

        settle_selected_volume_pack = function (selected_val) {
            if (!_volume_status || spa_page_util.isEmpty(get_volume_pack_list())) {
                return;
            }
            if (!selected_val) {
                _selected_volume_pack = get_volume_pack_list()[0];
            } else {
                _selected_volume_pack = get_volume_pack_list().filter(function (el) {
                        return el.volume_pack_seq === selected_val
                    })[0] || null;
            }
        };

        return {
            prepare: prepare,
            get_plan_data: get_plan_data,
            get_speed_status: get_speed_status,
            get_speed_update: get_speed_update,
            get_volume_status: get_volume_status,
            get_volume_update: get_volume_update,
            get_volume_pack_list: get_volume_pack_list,
            settle_selected_volume_pack: settle_selected_volume_pack,
            get_selected_volume_pack: get_selected_volume_pack,
        }
    })();

    shell = (function () {
        var
            hide_error_message = function () {
                $('#volume-pack-error').removeClass('volume-pack-error-show');
                $('#volume-pack-error').addClass('volume-pack-error-hide');
            },
            show_error_message = function () {
                $('#volume-pack-error').removeClass('volume-pack-error-hide');
                $('#volume-pack-error').addClass('volume-pack-error-show');
            },
            check_off_volume_agreement = function () {
                $('#volume-add-agree').prop('checked', false);
            },
            init_volume_pack_selection = function () {
                $('#volume-pack-list').val(-1);
            },
            tear_down = function () {
                hide_error_message();
                check_off_volume_agreement();
                init_volume_pack_selection();
            },
            get_params_for_update = function () {
                var
                    params = {'contractPlanId': contract_plan_id};

                $('input[name^=CHECK_KEY_]').each(function (idx, el) {
                    params[$(el).attr('name')] = $(el).val();
                });
                return params;
            },
            get_params_for_update_volume = function () {
                var
                    params = get_params_for_update();

                params.volumePackSeq = $('#volume-pack-list').val();
                return params;
            };
        return {
            show_error_message: show_error_message,
            hide_error_message: hide_error_message,
            check_off_volume_agreement: check_off_volume_agreement,
            init_volume_pack_selection: init_volume_pack_selection,
            tear_down: tear_down,
            get_params_for_update: get_params_for_update,
            get_params_for_update_volume: get_params_for_update_volume,
        }
    })();

    return {
        initModule: initModule,
    }
})();
