"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _filters = _interopRequireDefault(require("./filters"));

var _audit = _interopRequireDefault(require("./audit"));

var _core = _interopRequireDefault(require("./generator/core"));

var _model = require("./generator/model");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; var ownKeys = Object.keys(source); if (typeof Object.getOwnPropertySymbols === 'function') { ownKeys = ownKeys.concat(Object.getOwnPropertySymbols(source).filter(function (sym) { return Object.getOwnPropertyDescriptor(source, sym).enumerable; })); } ownKeys.forEach(function (key) { _defineProperty(target, key, source[key]); }); } return target; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

var defaults = {
  filters: [],
  reincorporate: false,
  persistence: true,
  audit: false,
  salienceFormula: function salienceFormula(a) {
    return a;
  },
  submodeler: function submodeler() {
    return {};
  }
}; // TODO:
// we want to separate all code which has SIDE EFFECTS
// away from all code which are PURE FUNCTIONS

var Improv =
/*#__PURE__*/
function () {
  function Improv(snippets) {
    var _this = this;

    var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

    _classCallCheck(this, Improv);

    _defineProperty(this, "gen", function (snippet) {
      var model = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
      (0, _model.clearHistory)(model);
      model.history = _this.history;
      model.tagHistory = _this.tagHistory;

      var result = _this.fullGen(snippet, model);

      (0, _model.updateModel)(model, result.model);
      _this.history = model.history;
      _this.tagHistory = model.tagHistory;

      if (!_this.persistence) {
        _this.clearHistory();
      }

      return result.result;
    });

    _defineProperty(this, "fullGen", function (snippet) {
      var model = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
      var modelObj = (0, _model.initModel)(model, _this.submodeler, _this.builtins);
      return {
        result: _this.core.gen(snippet, modelObj),
        model: modelObj
      };
    });

    _defineProperty(this, "clearHistory", function () {
      _this.history = [];
      _this.tagHistory = [];
    });

    /* Constructor for Improv generators. */

    /* We don't want to mutate the options object we've been given; we don't know
    where it's been. */
    var spec = _objectSpread({}, defaults, options);

    this.spec = spec;
    this.snippets = snippets;
    this.filters = spec.filters;
    this.reincorporate = Boolean(spec.reincorporate);
    this.audit = Boolean(spec.audit);
    this.persistence = spec.persistence;
    this.submodeler = spec.submodeler;
    this.builtins = spec.builtins;

    if (spec.rng) {
      this._rng = spec.rng.bind(this);
    } else {
      this._rng = Math.random;
    }

    this.history = [];
    this.tagHistory = [];
    this.__phraseAudit = new _audit.default(snippets);
    this.core = new _core.default({
      snippets: this.snippets,
      audit: this.__phraseAudit,
      filters: spec.filters,
      salienceFormula: spec.salienceFormula,
      persistence: spec.persistence,
      reincorporate: spec.reincorporate,
      rng: this._rng
    });
  }

  _createClass(Improv, [{
    key: "phraseAudit",
    get: function get() {
      /* This is a getter so that the internals of how auditing data is stored
         and calculated can change without changing the API. */
      if (!this.audit) {
        return undefined;
      }

      return this.__phraseAudit.data;
    }
  }, {
    key: "rng",
    get: function get() {
      if (this._rng) return this._rng;
      return Math.random;
    }
  }]);

  return Improv;
}();

Improv.filters = _filters.default;
var _default = Improv;
exports.default = _default;