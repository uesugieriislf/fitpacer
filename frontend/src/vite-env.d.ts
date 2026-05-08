/// <reference types="vite/client" />

declare module "*.vue" {
  import type { DefineComponent } from "vue";
  const component: DefineComponent<{}, {}, any>;
  export default component;
}

// Vue 3 compile-time flags（在 vite.config.ts 的 define 中设置）
declare const __VUE_OPTIONS_API__: boolean;
