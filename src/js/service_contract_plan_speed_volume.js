var plan_speed_volume = (function () {
    var
        SPEED_DATA_EVENT = 'speed',
        PLAN_DATA_EVENT = 'PLAN',
        UPDATE_SPEED_EVENT = 'speed_update',
        logger, getLogger,
        preparePage, updateSpeed,
        initModule, initLogger, activateModule,
        initialized = false;

    preparePage = function () {
        if (!initialized) {
            plan_speed_volume.model.preparePage();
            initialized = true;
        }
    };

    updateSpeed = function () {
        return plan_speed_volume.model.updateSpeed();
    }

    getLogger = function () {
        return logger;
    };

    initLogger = function (is_debug_mode) {
        logger = spa_log.createLogger(is_debug_mode, '### plan_speed_volume.LOG ### ');
    };

    initModule = function ($container, $server_host, send_params_for_init, is_debug_mode) {
        if (!$server_host || !$server_host.val()) {
            throw new Error('$server_host should be set.')
        }
        initLogger(is_debug_mode);

        spa_page_transition.addAction('initialize', 'plan-detail-main', preparePage);
        spa_page_transition.addAction('next-to-change-speed', 'plan-speed-change', preparePage);
        spa_page_transition.addAction('back-to-plan-detail-main', 'plan-detail-main', preparePage);
        spa_page_transition.addAction('update-speed', 'plan-speed-complete', updateSpeed);

        spa_page_transition.addEvent(SPEED_DATA_EVENT);
        spa_page_transition.addEvent(PLAN_DATA_EVENT);
        spa_page_transition.addEvent(UPDATE_SPEED_EVENT);

        plan_speed_volume.model.initModule($server_host.val(), send_params_for_init);
        plan_speed_volume.shell.initModule($container);
    };

    return {
        preparePage: preparePage,
        updateSpeed: updateSpeed,
        getLogger: getLogger,
        initModule: initModule,
        SPEED_DATA_EVENT: SPEED_DATA_EVENT,
        PLAN_DATA_EVENT: PLAN_DATA_EVENT,
        UPDATE_SPEED_EVENT: UPDATE_SPEED_EVENT,
        //VisibleForTesting
        initLogger: initLogger,
    }
})();

plan_speed_volume.shell = (function () {
    var
        initModule;

    initModule = function ($container) {
    };

    return {
        initModule: initModule,
    };
})();

plan_speed_volume.model = (function () {
    var
        contract_plan_id, setContractPlanId, getContractPlanId,
        serverHost, server_data,
        preparePage, updateSpeed,
        initModule;

    getContractPlanId = function () {
        return contract_plan_id;
    };

    setContractPlanId = function (_contract_plan_id) {
        contract_plan_id = _contract_plan_id;
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

    preparePage = function () {
        plan_speed_volume.getLogger().debug('model.preparePage is executed.');
        $(spa_page_transition.DATA_BIND_EVENT).trigger(plan_speed_volume.SPEED_DATA_EVENT, server_data.get_speed_status());
        $(spa_page_transition.DATA_BIND_EVENT).trigger(plan_speed_volume.PLAN_DATA_EVENT, server_data.get_plan_data());
    };

    updateSpeed = function () {
        var
            send_params,
            dfd_result = $.Deferred();

        send_params = {'contractPlanId': getContractPlanId()};
        plan_speed_volume.getLogger().debug('model.updateSpeed is executed.');
        plan_speed_volume.data.doAccessServerWrapper(serverHost + plan_speed_volume.data.PATH_UPDATE, send_params, dfd_result, function (data) {
            plan_speed_volume.getLogger().debug('data updated! status', data.status);
            server_data.prepare(data);
            $(spa_page_transition.DATA_BIND_EVENT).trigger(plan_speed_volume.SPEED_DATA_EVENT, server_data.get_speed_status());
            $(spa_page_transition.DATA_BIND_EVENT).trigger(plan_speed_volume.UPDATE_SPEED_EVENT, server_data.get_speed_update());
        });
        plan_speed_volume.getLogger().debug('service.model.updateSpeed executed.');
        spa_page_transition.prepareActivation(dfd_result.promise());
        return dfd_result;
    }

    initModule = function (server_host, send_params) {
        var
            dfd_result = $.Deferred();

        serverHost = server_host;
        setContractPlanId(send_params['contractPlanId']);
        plan_speed_volume.data.doAccessServerWrapper(serverHost + plan_speed_volume.data.PATH_INIT, send_params, dfd_result, function (data) {
            plan_speed_volume.getLogger().debug('initial data loaded! data', data);
            server_data.prepare(data);
        }, function (data) {
            spa_page_transition.shell.renderErrorPage(data.message);
        });
        plan_speed_volume.getLogger().debug('service.model.initModule executed.');
        spa_page_transition.prepareActivation(dfd_result.promise());
    };

    return {
        preparePage: preparePage,
        getContractPlanId: getContractPlanId,
        setContractPlanId: setContractPlanId,
        updateSpeed: updateSpeed,
        initModule: initModule,
    }
})();

plan_speed_volume.data = (function () {
    'use strict';
    var
        doAccessServerWrapper, PATH_INIT, PATH_UPDATE;

    PATH_INIT = '/data_init_low_speed.json';
    // PATH_INIT = '/data_init_high_speed.json';
    // PATH_INIT = '/data_init_disable.json';
    // PATH_UPDATE = '/data_update_succeeded_low.json';
    PATH_UPDATE = '/data_update_succeeded_high.json';
    // PATH_UPDATE = '/data_update_failed.json';
    // PATH_INIT = '/planspeed/init';
    // PATH_UPDATE = '/planspeed/update';

    doAccessServerWrapper = function (filePath, send_params, dfd_result, succeeded_func, failed_func) {
        setTimeout(function () {
            spa_page_data.doAccessServer(filePath, send_params, function (data) {
                if (data.status === '0') {
                    if (succeeded_func) {
                        succeeded_func(data);
                    }
                    dfd_result.resolve(data);
                } else {
                    if (failed_func) {
                        failed_func(data);
                    }
                    dfd_result.reject(data.message);
                }
            });
        }, 500);
    };

    return {
        doAccessServerWrapper: doAccessServerWrapper,
        PATH_INIT: PATH_INIT,
        PATH_UPDATE: PATH_UPDATE,
    }

}());
