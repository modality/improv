"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

function _slicedToArray(arr, i) { return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _nonIterableRest(); }

function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance"); }

function _iterableToArrayLimit(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"] != null) _i["return"](); } finally { if (_d) throw _e; } } return _arr; }

function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }

var TAG_COMPARISON = {
  TOTAL: Symbol(),
  PARTIAL: Symbol(),
  MISMATCH: Symbol()
};

function equalTags(a, b) {
  return a.length === b.length && a.every(function (el, i) {
    return el === b[i];
  });
}

function compareTags(a, b) {
  /* Returns a TAG_COMPARISON value */
  if (equalTags(a, b)) return TAG_COMPARISON.TOTAL; // If the tags are unequal but have the same length, it stands to reason
  // there is a mismatch.

  if (a.length === b.length) return TAG_COMPARISON.MISMATCH;

  var _ref = a < b ? [a, b] : [b, a],
      _ref2 = _slicedToArray(_ref, 2),
      shorter = _ref2[0],
      longer = _ref2[1];

  if (shorter.find(function (x, i) {
    return x !== longer[i];
  })) return TAG_COMPARISON.MISMATCH;
  return TAG_COMPARISON.PARTIAL;
}

function mismatchFilterSub(group, model) {
  /* Ensures that the group and model don't have any mismatched tags */
  var result = group.tags.find(function (groupTag) {
    // Look for a mismatch.
    var matched = model.tags.find(function (modelTag) {
      return modelTag[0] === groupTag[0];
    });
    if (matched === undefined) return false;
    if (compareTags(groupTag, matched) === TAG_COMPARISON.MISMATCH) return true;
    return false;
  });
  if (result === undefined) return 0;
  return null;
}

function bonusCompare(mode) {
  var bonus = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 1;
  var cumulative = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;
  return function (group, model) {
    var results = group.tags.filter(function (groupTag) {
      var matched = model.tags.find(function (modelTag) {
        return modelTag[0] === groupTag[0];
      });
      if (matched === undefined) return false;
      if (compareTags(groupTag, matched) === mode) return true;
      return false;
    });
    if (results.length) return cumulative ? bonus * results.length : bonus;
    return 0;
  };
}

var _default = {
  mismatchFilter: function mismatchFilter() {
    return mismatchFilterSub;
  },
  partialBonus: function partialBonus() {
    for (var _len = arguments.length, rest = new Array(_len), _key = 0; _key < _len; _key++) {
      rest[_key] = arguments[_key];
    }

    return bonusCompare.apply(void 0, [TAG_COMPARISON.PARTIAL].concat(rest));
  },
  fullBonus: function fullBonus() {
    for (var _len2 = arguments.length, rest = new Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
      rest[_key2] = arguments[_key2];
    }

    return bonusCompare.apply(void 0, [TAG_COMPARISON.TOTAL].concat(rest));
  },
  dryness: function dryness() {
    return function (group, model) {
      var newPhrases = group.phrases.map(function (phrase) {
        if (model.history.indexOf(phrase) !== -1) {
          return null;
        }

        return phrase;
      }).filter(function (i) {
        return i !== null;
      });
      var newGroup = Object.create(group);
      newGroup.phrases = newPhrases;
      return [0, newGroup];
    };
  },
  unmentioned: function unmentioned() {
    var bonus = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 1;
    return function (group, model) {
      if (!Array.isArray(group.tags)) return 0;
      if (group.tags.length === 0) return 0;
      var result = group.tags.find(function (t) {
        // Return true if the tag is "novel".
        var found = model.tagHistory.find(function (u) {
          return u[0] === t[0];
        });
        return typeof found === "undefined";
      });
      if (typeof result === "undefined") return 0;
      return bonus;
    };
  }
};
exports.default = _default;