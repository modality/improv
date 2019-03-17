import filters from "./filters";
import Audit from "./audit";
import Core from "./generator/core";
import { initModel, updateModel, clearHistory } from "./generator/model";

const defaults = {
  filters: [],
  reincorporate: false,
  persistence: true,
  audit: false,
  salienceFormula(a) {
    return a;
  },
  submodeler() {
    return {};
  }
};

// TODO:
// we want to separate all code which has SIDE EFFECTS
// away from all code which are PURE FUNCTIONS

class Improv {
  constructor(snippets, options = {}) {
    /* Constructor for Improv generators. */
    /* We don't want to mutate the options object we've been given; we don't know
    where it's been. */
    const spec = {
      ...defaults,
      ...options
    };
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

    this.__phraseAudit = new Audit(snippets);
    this.core = new Core({
      snippets: this.snippets,
      audit: this.__phraseAudit,
      filters: spec.filters,
      salienceFormula: spec.salienceFormula,
      persistence: spec.persistence,
      reincorporate: spec.reincorporate,
      rng: this._rng
    });
  }

  gen = (snippet, model = {}) => {
    clearHistory(model);
    model.history = this.history;
    model.tagHistory = this.tagHistory;

    const result = this.fullGen(snippet, model);
    updateModel(model, result.model);

    this.history = model.history;
    this.tagHistory = model.tagHistory;
    if (!this.persistence) {
      this.clearHistory();
    }
    return result.result;
  };

  fullGen = (snippet, model = {}) => {
    const modelObj = initModel(model, this.submodeler, this.builtins);
    return {
      result: this.core.gen(snippet, modelObj),
      model: modelObj
    };
  };

  get phraseAudit() {
    /* This is a getter so that the internals of how auditing data is stored
       and calculated can change without changing the API. */
    if (!this.audit) {
      return undefined;
    }

    return this.__phraseAudit.data;
  }

  get rng() {
    if (this._rng) return this._rng;
    return Math.random;
  }

  clearHistory = () => {
    this.history = [];
    this.tagHistory = [];
  };
}

Improv.filters = filters;

export default Improv;
