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
            PATH_UPDATE = server_host + '/data_update_succeeded_high.json',
            // PATH_UPDATE = server_host + '/data_update_succeeded_low.json',
            // PATH_UPDATE = server_host + '/data_update_failed.json',

            callbackFuncProto = {
                callbackFunc: function (observer, anchor_map, data) {
                    if (data.status !== '0') {
                        observer.error('Ajax proc failed');
                        return;
                    }
                    logger.debug('Ajax proc done! data', data);
                    server_data.prepare(data);
                    observer.trigger('SPEED', server_data.get_speed_status());
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

            createUpdateCallBack = function () {
                var result = Object.create(callbackFuncProto);
                result.callbackFunc = function (observer, anchor_map, data) {
                    callbackFuncProto.callbackFunc.apply(this, arguments);
                    observer.trigger('SPEED_UPDATE', server_data.get_speed_update());
                };
                return result;
            },

            initializationFunc = spa_page_transition.createAjaxFunc(
                PATH_INIT, send_params, createInitCallBack().callbackFunc),

            updateSpeed = spa_page_transition.createAjaxFunc(
                PATH_UPDATE, {'contractPlanId': contract_plan_id}, createUpdateCallBack().callbackFunc),

            logger = spa_log.createLogger(is_debug_mode, '### PLAN_CHANGE.LOG ###');

        if (spa_page_util.isEmpty(server_host)) {
            spa_page_transition.renderPage('plan-detail-main');
        } else {
            spa_page_transition.debugMode(is_debug_mode).initialize(initializationFunc)
                .addAction(spa_page_transition.model.START_ACTION, 'plan-detail-main')
                .addAction('next-to-change-speed', 'plan-speed-change')
                .addAction('back-to-plan-detail-main', 'plan-detail-main')
                .addAction('update-speed', 'plan-speed-complete', [updateSpeed])
                .run();
        }
    };

    server_data = (function () {
        var
            _speed_status, _speed_update,
            _plan_data, get_plan_data,
            prepare, get_speed_status, get_speed_update

        prepare = function (data) {
            _speed_status = data.speed_status;
            _speed_update = data.speed_update;
            _plan_data = data.plan_data;
        };

        get_speed_status = function () {
            return _speed_status;
        };

        get_speed_update = function () {
            return _speed_update;
        };

        get_plan_data = function () {
            return _plan_data;
        };

        return {
            prepare: prepare,
            get_speed_status: get_speed_status,
            get_speed_update: get_speed_update,
            get_plan_data: get_plan_data,
        }
    })();

    return {
        initModule: initModule,
    }
})();
