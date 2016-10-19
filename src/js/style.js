var style = (function () {
    'use strict';

    var
        $grid_main, $grid_sub, $grid_slider, $submenu_cls, $nav_li_cls,
        initModule;

    initModule = function ($container) {
        //JQuery
        $grid_slider = $container.find('#grid-slider');
        $grid_main = $container.find('#grid-main');
        $grid_sub = $container.find('#grid-sub');
        $submenu_cls = $container.find('.submenu');
        $nav_li_cls = $container.find('ul.nav li');

        //Event
        $($grid_slider).on('click', function () {
            $(this).toggleClass('grid-slider-to-hide grid-slider-to-show');
            $grid_main.toggleClass('col-sm-9 col-sm-11');
            $grid_sub.toggleClass('col-sm-3 col-sm-1');
            $submenu_cls.toggleClass('fade');
        });

        $($nav_li_cls).on('click', function (e) {
            e.preventDefault();
            var target = this;
            $($nav_li_cls).each(function (idx, obj) {
                if (target === obj) {
                    $(obj).addClass('li-selected');
                } else {
                    $(obj).removeClass('li-selected');
                }
            });
        });
    };

    return {
        initModule: initModule,
    };
}());


