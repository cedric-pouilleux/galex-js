import DefaultTheme from 'vitepress/theme';
import type { Theme } from 'vitepress';
import GalaxyDemo from './components/GalaxyDemo.vue';
import GalaxyGrid from './components/GalaxyGrid.vue';
import ViewModeDemo from './components/ViewModeDemo.vue';
import FogDemo from './components/FogDemo.vue';
import CubeMarkerDemo from './components/CubeMarkerDemo.vue';
import HoverRingDemo from './components/HoverRingDemo.vue';
import './style.css';

// Register demo components globally so any markdown page can drop them in
// without per-file imports.
const theme: Theme = {
  ...DefaultTheme,
  enhanceApp({ app }) {
    app.component('GalaxyDemo', GalaxyDemo);
    app.component('GalaxyGrid', GalaxyGrid);
    app.component('ViewModeDemo', ViewModeDemo);
    app.component('FogDemo', FogDemo);
    app.component('CubeMarkerDemo', CubeMarkerDemo);
    app.component('HoverRingDemo', HoverRingDemo);
  },
};

export default theme;
