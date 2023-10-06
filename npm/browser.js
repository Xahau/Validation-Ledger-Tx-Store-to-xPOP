require=(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.ledgerIndexToFolders = void 0;
const ledgerIndexToFolders = ledgerIndex => {
  return String(ledgerIndex).split('').reverse().join('') // Reverse
  .replace(/([0-9]{3})/g, '$1/').split('').reverse().join('') // Reverse
  .replace(/^\//, ''); // Remove prefix slash on i%3
};
exports.ledgerIndexToFolders = ledgerIndexToFolders;

},{}],"xpop-utils":[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
Object.defineProperty(exports, "ledgerIndexToFolders", {
  enumerable: true,
  get: function () {
    return _ledgerIndexToFolders.ledgerIndexToFolders;
  }
});
var _ledgerIndexToFolders = require("../lib/ledgerIndexToFolders.mjs");

},{"../lib/ledgerIndexToFolders.mjs":1}]},{},[]);
