/**
 * @file This content script acts as a bridge to inject the main application logic into the host page.
 * It dynamically imports the `main.js` file as a module, which is a modern and clean approach
 * to loading our extension's functionality. By using a module, we ensure that our code runs
 * in its own scope, preventing conflicts with the scripts of the visited webpage.
 */
(async () => {
  const src = chrome.runtime.getURL('main.js');
  await import(src);
})();