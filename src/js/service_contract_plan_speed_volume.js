var plan_speed_volume = (function () {
    var
        INIT_DATA_EVENT = 'init_data',

        logger, getLogger,

        preparePage, updateSpeed,

        initModule, initLogger, activateModule;

    preparePage = function () {
        plan_speed_volume.model.preparePage();
    };

    updateSpeed = function () {
        plan_speed_volume.model.updateSpeed();
    }

    getLogger = function () {
        return logger;
    };

    initLogger = function(is_debug_mode) {
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

        spa_page_transition.addEvent(INIT_DATA_EVENT);

        plan_speed_volume.model.initModule($server_host.val(), send_params_for_init);
        plan_speed_volume.shell.initModule($container);
    };

    return {
        preparePage: preparePage,
        updateSpeed: updateSpeed,
        getLogger: getLogger,
        initModule: initModule,
        INIT_DATA_EVENT: INIT_DATA_EVENT,
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
        serverHost, server_data,
        preparePage, updateSpeed,
        initModule;

    server_data = (function () {
        var
            init_data,
            prepare, get_init_data;

        prepare = function (data) {
            init_data = data.init_data;
        };
        get_init_data = function () {
            return init_data;
        };
        return {
            prepare: prepare,
            get_init_data: get_init_data,
        }
    })();

    preparePage = function () {
        plan_speed_volume.getLogger().debug('model.preparePage is executed.');
        $(spa_page_transition.DATA_BIND_EVENT).trigger(plan_speed_volume.INIT_DATA_EVENT, server_data.get_init_data());
    };

    updateSpeed = function () {
        plan_speed_volume.getLogger().debug('model.updateSpeed is executed.');
    }

    initModule = function (server_host, send_params) {
        var
            dfd_result = $.Deferred();

        serverHost = server_host;
        plan_speed_volume.data.doAccessServerWrapper(serverHost + plan_speed_volume.data.PATH_INIT, send_params, dfd_result, function (data) {
            plan_speed_volume.getLogger().debug('initial data loaded! status', data.status, 'init_data', data.init_data);
            server_data.prepare(data);
        });
        plan_speed_volume.getLogger().debug('service.model.initModule executed.');
        spa_page_transition.prepareActivation(dfd_result.promise());
    };

    return {
        preparePage: preparePage,
        updateSpeed: updateSpeed,
        initModule: initModule,
    }
})();

plan_speed_volume.data = (function () {
    'use strict';
    var
        doAccessServerWrapper, PATH_INIT, PATH_UPDATE;

    // PATH_INIT = '/data_init_low_speed.json';
    PATH_INIT = '/data_init_disable.json';
    PATH_UPDATE = '/data_update.json';
    // PATH_INIT = '/changeplan/init';
    // PATH_UPDATE = '/changeplan/update';

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
        }, 300);
    };

    return {
        doAccessServerWrapper: doAccessServerWrapper,
        PATH_INIT: PATH_INIT,
        PATH_UPDATE: PATH_UPDATE,
    }

}());
