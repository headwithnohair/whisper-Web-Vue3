const workerModules = new Map();
self.registerModule = async (moduleName) => {
  if (workerModules.has(moduleName)) return;
  
  // 动态导入模块（Vite/ESM支持）
    // import.meta.url 在某些 worker 环境中可能不存在或不是有效 URL，先做兼容处理。
    const baseUrl = (typeof import !== 'undefined' && import.meta && import.meta.url)
      ? import.meta.url
      : (typeof self !== 'undefined' && self.location && self.location.href)
        ? self.location.href
        : '/';
    // 将相对模块路径解析为绝对 URL（传入 base 以避免 Invalid URL 错误）
    const moduleUrl = new URL(`./module/${moduleName}.js`, baseUrl);
    // @vite-ignore The above dynamic import cannot be analyzed by Vite.
    const module = await import(/* @vite-ignore */ moduleUrl.href);
  workerModules.set(moduleName, module.default);
};

self.onmessage = async (e) => {
  const { action, module, payload } = e.data;
  
  if (action === 'loadModule') {
    await self.registerModule(module);
    self.postMessage({ status: 'module_loaded', module });
    return;
  }
  
  if (!workerModules.has(module)) {
    await self.registerModule(module);
  }
  
  const handler = workerModules.get(module);
  const result = await handler(action, payload);
  self.postMessage({ result, module, action });
};