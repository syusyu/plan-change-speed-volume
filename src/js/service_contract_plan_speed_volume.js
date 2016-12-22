var plan_speed_volume = (function () {
    'use strict';
    var
        logger,
        contract_plan_id, server_data,
        initModule;

    initModule = function ($server_host, send_params, is_debug_mode) {
        var
            server_host = spa_page_util.exists($server_host) ? $server_host.val() : null,
            contract_plan_id = send_params['contractPlanId'],

            PATH_INIT = server_host + '/data_init_low_speed.json',
            // PATH_INIT = server_host + '/data_init_high_speed.json',
            // PATH_INIT = server_host + '/data_init_disable.json',
            PATH_UPDATE_SPEED = server_host + '/data_update_succeeded_high.json',
            // PATH_UPDATE_SPEED = server_host + '/data_update_succeeded_low.json',
            // PATH_UPDATE_SPEED = server_host + '/data_update_failed.json',
            PATH_UPDATE_VOLUME = server_host + '/data_update_succeeded_high.json',

            callbackFuncProto = {
                callbackFunc: function (observer, anchor_map, data) {
                    if (data.status !== '0') {
                        observer.error('Ajax proc failed');
                        return;
                    }
                    logger.debug('Ajax proc done! data', data);
                    server_data.prepare(data);
                    observer.trigger('SPEED', server_data.get_speed_status());
                    observer.trigger('VOLUME', server_data.get_volume_status());
                }
            },

            createInitCallBack = function () {
                var result = Object.create(callbackFuncProto);
                result.callbackFunc = function (observer, anchor_map, data) {
                    callbackFuncProto.callbackFunc.apply(this, arguments);
                    observer.trigger('PLAN', server_data.get_plan_data());
                };
                return result;
            },

            createUpdateSpeedCallBack = function () {
                var result = Object.create(callbackFuncProto);
                result.callbackFunc = function (observer, anchor_map, data) {
                    callbackFuncProto.callbackFunc.apply(this, arguments);
                    observer.trigger('SPEED_UPDATE', server_data.get_speed_update());
                };
                return result;
            },

            selectVolumePack = spa_page_transition.createFunc(function (observer, anchor_map) {
                if (!anchor_map.val || anchor_map.val < 0) {
                    $('#volume-add-agree').prop('checked', false).change();
                }
                server_data.settle_selected_volume_pack(anchor_map.val);
                observer.trigger('SELECTED_VOLUME_PACK', server_data.get_selected_volume_pack());
            }),

            validateVolumePack = spa_page_transition.createFunc(function (observer, anchor_map) {
                var
                    selected_volume_pack = server_data.get_selected_volume_pack();

                if (selected_volume_pack.id < 0) {
                    console.log('volume pack should be selected');
                    observer.stay();
                }
            }),

            createUpdateVolumeCallBack = function () {
                var result = Object.create(callbackFuncProto);
                result.callbackFunc = function (observer, anchor_map, data) {
                    callbackFuncProto.callbackFunc.apply(this, arguments);
                    observer.trigger('VOLUME_UPDATE', server_data.get_speed_update());
                };
                return result;
            },

            getParamsForUpdateVolume = function () {
                return {'id': server_data.get_selected_volume_pack()};
            },

            initializationFunc = spa_page_transition.createAjaxFunc(PATH_INIT, send_params, createInitCallBack().callbackFunc),

            updateSpeed = spa_page_transition.createAjaxFunc(PATH_UPDATE_SPEED, {'contractPlanId': contract_plan_id}, createUpdateSpeedCallBack().callbackFunc),

            updateVolume = spa_page_transition.createAjaxFunc(PATH_UPDATE_VOLUME, {}, createUpdateVolumeCallBack().callbackFunc)
                .get_params(getParamsForUpdateVolume),

            logger = spa_log.createLogger(is_debug_mode, '### PLAN_CHANGE.LOG ###');

        if (spa_page_util.isEmpty(server_host)) {
            spa_page_transition.renderPage('plan-detail-main');
        } else {
            spa_page_transition.debugMode(is_debug_mode).initialize(initializationFunc)
                .addAction(spa_page_transition.model.START_ACTION, 'plan-detail-main', [selectVolumePack])
                .addAction('next-to-change-speed', 'plan-speed-change')
                .addAction('next-to-add-volume', 'plan-volume-add')
                .addAction('back-to-plan-detail-main', 'plan-detail-main')
                .addAction('select-volume-pack', 'plan-volume-add', [selectVolumePack])
                .addAction('update-speed', 'plan-speed-complete', [updateSpeed])
                .addAction('update-volume', 'plan-volume-complete', [validateVolumePack])
                .run();
        }
    };

    server_data = (function () {
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
        }

        get_volume_update = function () {
            return _volume_update;
        }

        get_volume_pack_list = function () {
            return _volume_status.volume_pack_list;
        }

        get_selected_volume_pack = function () {
            return _selected_volume_pack;
        }

        settle_selected_volume_pack = function (selected_id) {
            if (!get_volume_pack_list()) {
                return;
            }
            if (!selected_id) {
                _selected_volume_pack = get_volume_pack_list()[0];
            }
            _selected_volume_pack = get_volume_pack_list().filter(function (el) {
                return el.id === selected_id
            })[0] || get_volume_pack_list()[0];
        }

        get_plan_data = function () {
            return _plan_data;
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

    return {
        initModule: initModule,
    }
})();
