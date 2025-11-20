/* exported browser */
/* global chrome, importScripts */
//backgroundLoader.js

const browser = chrome;

/** load scripts list into background (service worker) */
[
  "/background/helperBG.js",
  "/background/msgListenerBG.js",
  "/background/navigate.js",
  "/background/styles.js",
  "/background/userStorage.js",
  "/background/webResources.js",
  "/background/annotations.js",
].forEach((aScript) => {
  importScripts(aScript); // chrome/webworker specific command
});
