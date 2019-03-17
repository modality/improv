"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = template;

function _toConsumableArray(arr) { return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _nonIterableSpread(); }

function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance"); }

function _iterableToArray(iter) { if (Symbol.iterator in Object(iter) || Object.prototype.toString.call(iter) === "[object Arguments]") return Array.from(iter); }

function _arrayWithoutHoles(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = new Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } }

function _slicedToArray(arr, i) { return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _nonIterableRest(); }

function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance"); }

function _iterableToArrayLimit(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"] != null) _i["return"](); } finally { if (_d) throw _e; } } return _arr; }

function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }

var TEMPLATE_BUILTINS = {
  a: function a(text) {
    if (text.match(/^[aeioAEIO]/)) return "an ".concat(text);
    return "a ".concat(text);
  },
  an: function an(text) {
    return this.a(text);
  },
  cap: function cap(text) {
    return "".concat(text[0].toUpperCase()).concat(text.slice(1));
  },
  A: function A(text) {
    return this.cap(this.a(text));
  },
  // eslint-disable-next-line babel/new-cap
  An: function An(text) {
    return this.A(text);
  }
};

function dieRoll(min, max, generator) {
  var rng;

  if (typeof generator === "undefined") {
    rng = Math.random;
  } else {
    rng = generator.rng;
  }

  return Math.floor(rng() * (max - min + 1)) + min;
}

function mergeInTag(tags, tag) {
  // Find the matching tag...
  var i = tags.findIndex(function (t) {
    return t[0] === tag[0];
  });
  if (i === -1) return tags.concat([tag]); // Otherwise:
  // This is supposed to be a non-destructive operation

  var newTags = tags.concat();
  newTags[i] = tag;
  return newTags;
}

function processDirective(rawDirective, model, cb, generator) {
  var directive = rawDirective.trim();

  if (directive[0] === directive.slice(-1) && directive[0] === "'") {
    // This is a literal directive.
    return directive.slice(1, -1);
  }

  if (directive.indexOf(" ") !== -1) {
    // The directive contains a space, which means it's a chained directive.
    var funcName = directive.split(" ")[0];
    var rest = directive.slice(directive.indexOf(" ") + 1); // eslint-disable-next-line no-prototype-builtins

    if (TEMPLATE_BUILTINS.hasOwnProperty(funcName)) {
      return "".concat(TEMPLATE_BUILTINS[funcName](processDirective(rest, model, cb, generator)));
    }

    if (model && model.builtins && model.builtins[funcName]) {
      return "".concat(model.builtins[funcName](processDirective(rest, model, cb, generator)));
    }

    if (typeof model[funcName] !== "function") {
      throw new TypeError("Builtin or model property \"".concat(funcName, "\" is not a function."));
    }

    return "".concat(model[funcName](processDirective(rest, model, cb, generator)));
  }

  if (directive[0] === "|") {
    var _directive$split = directive.split(":"),
        _directive$split2 = _slicedToArray(_directive$split, 2),
        tagStr = _directive$split2[0],
        snippet = _directive$split2[1]; // Disregard the first |


    var newTag = tagStr.slice(1).split("|");
    var newModel = Object.create(model);
    newModel.tags = mergeInTag(model.tags, newTag);
    return cb(snippet, newModel);
  }

  if (directive[0] === ">") {
    var _directive$split3 = directive.split(":"),
        _directive$split4 = _slicedToArray(_directive$split3, 2),
        subModelName = _directive$split4[0],
        subSnippet = _directive$split4[1];

    if (!subSnippet) throw new Error("Bad or malformed snippet name in directive ".concat(directive, "."));
    return cb(subSnippet, model, subModelName);
  }

  if (directive[0] === ":") {
    return cb(directive.slice(1), model);
  }

  if (directive[0] === "#") {
    return dieRoll.apply(void 0, _toConsumableArray(directive.slice(1).split("-").map(function (n) {
      return parseInt(n, 10);
    })).concat([generator]));
  }

  if (directive.indexOf(".") !== -1) {
    var propChain = directive.split(".");
    return propChain.reduce(function (obj, prop) {
      return obj[prop];
    }, model);
  }

  return "".concat(model[directive]);
}

function template(phrase, model, cb, generator) {
  var _ref = [phrase.indexOf("["), phrase.indexOf("]")],
      openBracket = _ref[0],
      closeBracket = _ref[1];
  if (openBracket === -1) return phrase;

  if (closeBracket === -1) {
    throw new Error("Missing close bracket in phrase: ".concat(phrase));
  }

  var before = phrase.slice(0, openBracket);
  var after = phrase.slice(closeBracket + 1);
  var directive = phrase.substring(openBracket + 1, closeBracket);
  return template("".concat(before).concat(processDirective(directive, model, cb, generator)).concat(after), model, cb, generator);
}