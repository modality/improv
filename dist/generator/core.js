"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.applyFiltersToGroup = applyFiltersToGroup;
exports.createFiltersSelector = createFiltersSelector;
exports.selectGroupsWithPhrases = selectGroupsWithPhrases;
exports.createSalienceSelector = createSalienceSelector;
exports.convertGroupsToPhrases = convertGroupsToPhrases;
exports.createPhraseSelector = createPhraseSelector;
exports.recordHistory = recordHistory;
exports.default = void 0;

var _template = _interopRequireDefault(require("../template"));

var _middleware = require("./middleware");

var _model = require("./model");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function applyFiltersToGroup(filters, group, model) {
  /*
    Run the filters through an individual group.
  */
  var output = {
    score: 0
  }; // Make sure the group has tags.

  if (typeof group.tags === "undefined") group.tags = []; // Since we might return a different group than we got, we use a variable.

  var currentGroup = group;
  var _iteratorNormalCompletion = true;
  var _didIteratorError = false;
  var _iteratorError = undefined;

  try {
    for (var _iterator = filters[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
      var filter = _step.value;
      var filterOutput = filter(currentGroup, model);
      var scoreOffset = void 0;

      if (Array.isArray(filterOutput)) {
        // We got a tuple, meaning the filter wants to modify the group before
        // moving on.
        scoreOffset = filterOutput[0];
        currentGroup = filterOutput[1];
      } else {
        scoreOffset = filterOutput;
      }

      if (scoreOffset === null) {
        output.score = null;
        break;
      }

      output.score += scoreOffset;
    }
  } catch (err) {
    _didIteratorError = true;
    _iteratorError = err;
  } finally {
    try {
      if (!_iteratorNormalCompletion && _iterator.return != null) {
        _iterator.return();
      }
    } finally {
      if (_didIteratorError) {
        throw _iteratorError;
      }
    }
  }

  output.group = currentGroup;
  return output;
}

function createFiltersSelector(filters) {
  return function (groups, model) {
    /*
      Starting with the raw list of groups, return a filtered list with
      scores.
    */
    return groups.map(function (group) {
      return applyFiltersToGroup(filters, group, model);
    }).filter(function (o) {
      return o.score !== null;
    });
  };
}

function selectGroupsWithPhrases(groups) {
  return groups.filter(function (g) {
    return g.group.phrases.length > 0;
  });
}

function createSalienceSelector(salienceFormula) {
  return function (groups) {
    /*
      Starting with the scored list from applyFilters(), return a list that has
      invalid groups scrubbed out and only includes groups with a score past
      the threshold.
    */
    // Filter out groups emptied out by dryness()
    var maxScore = groups.reduce(function (currentMax, b) {
      return b.score > currentMax ? b.score : currentMax;
    }, Number.NEGATIVE_INFINITY);
    var scoreThreshold = salienceFormula(maxScore);
    return groups.filter(function (o) {
      return o.score >= scoreThreshold;
    });
  };
}

function convertGroupsToPhrases(groups) {
  /*
    Starting with a list of scored groups, flatten them into a simple list
    of phrases.
  */
  return groups.map(function (o) {
    return o.group.phrases.map(function (i) {
      return [i, o.group.tags];
    });
  }).reduce(function (a, b) {
    return a.concat(b);
  }, []);
}

function createPhraseSelector(reincorporate, rng) {
  /*
    Once we have a list of suitable groups, finally select a phrase at random.
  */
  return function (phrases, model) {
    if (phrases.length === 0) {
      console.error('Ran out of phrases', model);
      throw new Error("Ran out of phrases."); //while generating ${this.__currentSnippet}
    }

    var chosen = phrases[Math.floor(rng() * phrases.length)];
    if (reincorporate) (0, _model.mergeTags)(model, chosen[1]);

    if (Array.isArray(chosen[1])) {
      model.tagHistory = chosen[1].concat(model.tagHistory);
    }

    return chosen[0];
  };
}

function recordHistory(input, model) {
  model.history.unshift(input);
  return input;
}

var Core = function Core(config) {
  var _this = this;

  _classCallCheck(this, Core);

  _defineProperty(this, "__gen", function (snippet, model, subModelName) {
    /*
      Actually generate text. Separate from #gen() because we don't want to clear
      history or error-handling data while a call to #gen() hasn't finished
      returning
    */
    var phraseMiddlewares = [createFiltersSelector(_this.filters), selectGroupsWithPhrases, createSalienceSelector(_this.salienceFormula), convertGroupsToPhrases, createPhraseSelector(_this.reincorporate, _this.rng), recordHistory];
    var groups = _this.snippets[snippet].groups;
    var chosenPhrase = phraseMiddlewares.reduce(function (input, selector) {
      return selector(input, model);
    }, groups);

    _this.__phraseAudit.incrementPhrase(snippet, chosenPhrase);

    var output = (0, _template.default)(chosenPhrase, model, _this.__wrappedGen, _this);
    return output;
  });

  _defineProperty(this, "gen", function (snippet, model) {
    /*
      Generate text (user-facing API). Since this function can recur, most of
      the heavy lifting is done in __gen().
    */
    var output = _this.__wrappedGen(snippet, model);

    if (!_this.persistence) {
      (0, _model.clearHistory)(model);
    }

    return output;
  });

  this.snippets = config.snippets;
  this.__phraseAudit = config.audit;
  this.salienceFormula = config.salienceFormula;
  this.persistence = config.persistence;
  this.reincorporate = config.reincorporate;
  this.rng = config.rng;
  this.filters = config.filters;

  var reducer = function reducer(acc, curr) {
    var wrapped = curr(_this, acc);
    return wrapped.bind(_this);
  }; // Because these function wrap eachother like layers of an onion, if we want
  // them to run in the same order as the array we must reverse the array so that
  // the outermost "layer" is applied last


  var middlewares = [_middleware.useBindingsMiddleware, _middleware.useSubmodelMiddleware, _middleware.cacheSnippetMiddleware, _middleware.validateSnippetMiddleware].reverse();
  this.__wrappedGen = middlewares.reduce(reducer.bind(this), this.__gen);
};

exports.default = Core;