var plan_speed_volume = (function () {
    var
        INIT_DATA_EVENT = 'head',

        logger, getLogger,

        preparePage, updateSpeed,

        initModule, initLogger, activateModule;

    preparePage = function () {
        plan_speed_volume.preparePage();
    };

    updateSpeed = function () {
        plan_speed_volume.model.updatePlan();
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

        spa_page_transition.addAction('next-to-change-speed', 'plan-speed-change', preparePage);
        spa_page_transition.addAction('back-to-plan-detail-main', 'plan-detail-main');
        spa_page_transition.addAction('update-speed', 'plan-speed-complete', updateSpeed);

        spa_page_transition.addEvent(INIT_DATA_EVENT);

        plan_speed_volume.model.initModule($server_host.val(), send_params_for_init);
        plan_speed_volume.shell.initModule($container);
    };

    return {
        getLogger: getLogger,
        initModule: initModule,
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
        serverData,
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

    return {
        serverData: serverData,
        initModule: initModule,
    }
})();
