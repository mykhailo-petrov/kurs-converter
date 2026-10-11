import '@scss/main.scss';
import * as myFunctions from '@js/modules/functions.js';
import * as myScroll from '@js/modules/scroll/scroll.js';
import '@js/site.js';
import '@js/forms/converter.js';
import '@js/web-components/custom-select';
import '@js/sections/popular-pairs.js';
import '@js/sections/rate-chart.js';

myFunctions.initBurgerMenu();
myFunctions.initNavMenuActivate();
myFunctions.initHeaderScroll();

import '@js/modules/dynamic-adapt/dynamic-adapt.js';

myScroll.pageNavigation();
