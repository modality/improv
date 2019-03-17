"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.useBindingsMiddleware = useBindingsMiddleware;
exports.useSubmodelMiddleware = useSubmodelMiddleware;
exports.cacheSnippetMiddleware = cacheSnippetMiddleware;
exports.validateSnippetMiddleware = validateSnippetMiddleware;

var _model = require("./model");

function _typeof(obj) { if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

// Handle all behavior related to bindings. They should:
// 1. be created on the model if they do not exist
// 2. used instead of generating if a bin
function useBindingsMiddleware(ref, improvGenFn) {
  return function (snippet, model, subModelName) {
    // Make sure the model has a bindings property
    if (typeof model.bindings === "undefined") {
      model.bindings = {};
    }

    if (model.bindings[snippet]) {
      // The snippet already exists in the model's bindings.
      return model.bindings[snippet];
    }

    var result = improvGenFn(snippet, model, subModelName);

    if (ref.snippets[snippet].bind) {
      model.bindings[snippet] = result;
    }

    return result;
  };
}

function useSubmodelMiddleware(ref, improvGenFn) {
  return function (snippet, model, subModelName) {
    if (subModelName) {
      model = (0, _model.submodel)(model, subModelName);
    }

    return improvGenFn(snippet, model, subModelName);
  };
}
/* For the sake of better error handling, we try to keep an accurate record
   of what snippet is being generated at any given time. */


function cacheSnippetMiddleware(ref, improvGenFn) {
  return function (snippet, model, subModelName) {
    // Keep a stack of snippets we are using.
    var previousSnippet = ref.__currentSnippet;
    ref.__currentSnippet = snippet;
    var result = improvGenFn(snippet, model, subModelName);
    ref.__currentSnippet = previousSnippet;
    return result;
  };
}

function validateSnippetMiddleware(ref, improvGenFn) {
  return function (snippet, model, subModelName) {
    if (typeof ref.snippets[snippet] === "undefined") {
      throw new TypeError("Tried generating snippet \"".concat(snippet, "\", but no such snippet exists in spec"));
    }

    var groups = ref.snippets[snippet].groups;

    if (!Array.isArray(groups)) {
      throw new TypeError("Missing or bad groups array for snippet ".concat(snippet, "; was ").concat(_typeof(groups)));
    }

    return improvGenFn(snippet, model, subModelName);
  };
}