"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.initModel = initModel;
exports.updateModel = updateModel;
exports.mergeTags = mergeTags;
exports.clearHistory = clearHistory;
exports.submodel = submodel;

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; var ownKeys = Object.keys(source); if (typeof Object.getOwnPropertySymbols === 'function') { ownKeys = ownKeys.concat(Object.getOwnPropertySymbols(source).filter(function (sym) { return Object.getOwnPropertyDescriptor(source, sym).enumerable; })); } ownKeys.forEach(function (key) { _defineProperty(target, key, source[key]); }); } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

var defaults = {
  tags: [],
  bindings: {},
  history: [],
  tagHistory: []
};

function initModel(model, submodeler, builtins) {
  return _objectSpread({}, defaults, model, {
    submodeler: submodeler,
    builtins: builtins
  });
}

function updateModel(oldModel, newModel) {
  oldModel.tags = newModel.tags;
  oldModel.bindings = newModel.bindings;
  oldModel.history = newModel.history;
  oldModel.tagHistory = newModel.tagHistory;
}

function mergeTags(model, groupTags) {
  /*
    Add a group's tags to the model, for reincorporation.
  */
  function mergeTag(a, b) {
    if (a.length < b.length) return b;
    return a;
  }

  groupTags.forEach(function (a) {
    // Find the corresponding tag in the model.
    var site = model.tags.findIndex(function (b) {
      return a[0] === b[0];
    });

    if (site === -1) {
      // No such tag; simply add the group's tags to the model.
      model.tags = model.tags.concat([a]);
    } else {
      model.tags[site] = mergeTag(model.tags[site], a);
    }
  });
}

function clearHistory(model) {
  model.history = [];
  model.tagHistory = [];
}

function submodel(model, subModelName) {
  if (!model[subModelName]) {
    model[subModelName] = initModel(model.submodeler(model, subModelName), model.submodeler);
  }

  return model[subModelName];
}