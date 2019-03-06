import template from './template.js';
import { merge } from 'lodash';

const defaults = {
  filters: [],
  reincorporate: false,
  persistence: true,
  audit: false,
  salienceFormula  (a) { return a; },
  submodeler () { return {}; }
};

// Handle all behavior related to bindings. They should:
// 1. be created on the model if they do not exist
// 2. used instead of generating if a bin
const useBindingsMiddleware = (ref, improvGenFn) => {
  return (snippet, model, subModelName) => {
    // Make sure the model has a bindings property
    if (typeof model.bindings === 'undefined') {
      model.bindings = {};
    }

    if (model.bindings[snippet]) {
      // The snippet already exists in the model's bindings.
      return model.bindings[snippet];
    }

    const result = improvGenFn(snippet, model, subModelName);

    if (ref.snippets[snippet].bind) {
      model.bindings[snippet] = result;
    }

    return result;
  }
}

const useSubmodelMiddleware = (ref, improvGenFn) => {
  return (snippet, model, subModelName) => {
    if (subModelName) {
      model = ref.getSubModel(model, subModelName);
    }
    return improvGenFn(snippet, model, subModelName);
  }
}

/* For the sake of better error handling, we try to keep an accurate record
   of what snippet is being generated at any given time. */
const cacheSnippetMiddleware = (ref, improvGenFn) => {
    return (snippet, model, subModelName) => {
      // Keep a stack of snippets we are using.
      const previousSnippet = ref.__currentSnippet;
      ref.__currentSnippet = snippet;

      const result = improvGenFn(snippet, model, subModelName)

      ref.__currentSnippet = previousSnippet;
      return result;
    }
}

const validateSnippetMiddleware = (ref, improvGenFn) => {
  return (snippet, model, subModelName) => {
    ref.validateSnippetDefinition(snippet);
    return improvGenFn(snippet, model, subModelName);
  }
}

class Improv {
  constructor (snippets, options = {}) {
    /* Constructor for Improv generators. */
    /* We don't want to mutate the options object we've been given; we don't know
    where it's been. */
    const spec = {}; merge(spec, defaults, options);
    this.snippets = snippets;
    this.filters = spec.filters;
    this.reincorporate = Boolean(spec.reincorporate);
    this.persistence = Boolean(spec.persistence);
    this.audit = Boolean(spec.audit);
    this.salienceFormula = spec.salienceFormula;
    this.submodeler = spec.submodeler;
    this.builtins = spec.builtins;
    this.history = [];
    this.tagHistory = [];
    if (spec.rng) {
      this._rng = spec.rng.bind(this);
    }

    if (this.audit) this.instantiateAuditData();
  }

  wrappedGen (...rest) {
    if (typeof this.__wrappedGen === 'undefined') {
      const reducer = (acc, curr) => {
        const wrapped = curr(this,  acc);
        return wrapped.bind(this)
      };

      const middlewares = [
        useBindingsMiddleware,
        useSubmodelMiddleware,
        cacheSnippetMiddleware,
        validateSnippetMiddleware,
      ].reverse();

      this.__wrappedGen = middlewares.reduce(reducer.bind(this), this.__gen.bind(this));
    }
    return this.__wrappedGen(...rest);
  }

  __gen (snippet, model, subModelName) {
    /*
      Actually generate text. Separate from #gen() because we don't want to clear
      history or error-handling data while a call to #gen() hasn't finished
      returning
    */
    const filteredGroups = this.applyFilters(snippet, model);
    const chosenPhrase = this.selectPhrase(this.scoreFilter(filteredGroups), model);

    this.history.unshift(chosenPhrase);
    if (this.audit) {
      const phraseTotal = this.__phraseAudit.get(snippet).get(chosenPhrase);
      this.__phraseAudit.get(snippet).set(chosenPhrase, phraseTotal + 1);
    }

    const output = template(chosenPhrase, model, this.wrappedGen.bind(this), this);

    return output;
  }

  validateSnippetDefinition(snippetName) {
    if (typeof this.snippets[snippetName] === 'undefined') {
      throw new Error(`Tried generating snippet "${snippet}", but no such snippet exists in spec`);
    }
    const groups = this.snippets[snippetName].groups;
    if (!Array.isArray(groups)) {
      throw new Error(`Missing or bad groups array for snippet ${snippetName}; was ${typeof groups}`);
    }
  }

  get phraseAudit () {
    /* This is a getter so that the internals of how auditing data is stored
       and calculated can change without changing the API. */
    if (!this.audit) throw new Error('Tried retriving audit from generator not in auditing mode.');
    return this.__phraseAudit;
  }

  gen (snippet, model = {}) {
    /*
      Generate text (user-facing API). Since this function can recur, most of
      the heavy lifting is done in __gen().
    */
    // Make sure the model has a tag property.
    if (typeof model.tags === 'undefined') model.tags = [];

    const output = this.wrappedGen(snippet, model);

    if (!this.persistence) {
      this.clearHistory(); this.clearTagHistory();
    }

    return output;
  }

  mergeTags (model, groupTags) {
    /*
      Add a group's tags to the model, for reincorporation.
    */
    function mergeTag (a, b) {
      if (a.length < b.length) return b;
      return a;
    }

    groupTags.forEach(function (a) {
      // Find the corresponding tag in the model.
      const site = model.tags.findIndex(b => a[0] === b[0]);
      if (site === -1) {
        // No such tag; simply add the group's tags to the model.
        model.tags = model.tags.concat([a]);
      } else {
        model.tags[site] = mergeTag(model.tags[site], a);
      }
    });
  }

  get rng () {
    if (this._rng) return this._rng;
    return Math.random;
  }

  selectPhrase (groups, model) {
    /*
      Once we have a list of suitable groups, finally select a phrase at random.
    */
    const phrases = this.flattenGroups(groups);
    if (phrases.length === 0) {
      if (this.audit) {
        console.log(groups);
        console.log(model);
      }
      throw new Error(`Ran out of phrases in ${groups} while generating ${this.__currentSnippet}`);
    }
    if (!this) console.log('not this either!');
    const chosen = phrases[Math.floor(this.rng() * phrases.length)];
    if (this.reincorporate) this.mergeTags(model, chosen[1]);
    if (Array.isArray(chosen[1])) {
      this.tagHistory = chosen[1].concat(this.tagHistory);
    }
    return chosen[0];
  }

  applyFiltersToGroup (group, model) {
    /*
      Run the filters through an individual group.
    */
    const output = { score: 0 };

    // Make sure the group has tags.
    if (typeof group.tags === 'undefined') group.tags = [];

    // Since we might return a different group than we got, we use a variable.
    let currentGroup = group;

    function applyFilterToGroup (cb) {
      if (output.score === null) return;

      const cbOutput = cb.call(this, currentGroup, model);

      let scoreOffset;

      if (Array.isArray(cbOutput)) {
        // We got a tuple, meaning the filter wants to modify the group before
        // moving on.
        scoreOffset = cbOutput[0];
        currentGroup = cbOutput[1];
      } else {
        scoreOffset = cbOutput;
      }
      if (scoreOffset === null) {
        output.score = null;
        return;
      }
      output.score += scoreOffset;
    }

    this.filters.forEach(applyFilterToGroup.bind(this));

    output.group = currentGroup;
    return output;
  }

  applyFilters (snippetName, model) {
    /*
      Starting with the raw list of groups, return a filtered list with
      scores.
    */
    const groups = this.snippets[snippetName].groups;
    return groups.map(group => this.applyFiltersToGroup(group, model))
      .filter(o => o.score !== null);
  }

  scoreFilter (groups) {
    /*
      Starting with the scored list from applyFilters(), return a list that has
      invalid groups scrubbed out and only includes groups with a score past
      the threshold.
    */
    // Filter out groups emptied out by dryness()
    const validGroups = groups.filter(g => g.group.phrases.length > 0);
    const maxScore = validGroups
      .reduce((currentMax, b) => b.score > currentMax ? b.score : currentMax,
      Number.NEGATIVE_INFINITY);
    const scoreThreshold = this.salienceFormula(maxScore);
    return validGroups.filter(o => o.score >= scoreThreshold);
  }

  flattenGroups (groups) {
    /*
      Starting with a list of scored groups, flatten them into a simple list
      of phrases.
    */
    return groups
      .map(o => o.group.phrases.map(i => [i, o.group.tags]))
      .reduce((a, b) => a.concat(b), []);
  }

  clearHistory () { this.history = []; this.historyTree = {}; }

  clearTagHistory () { this.tagHistory = []; }

  instantiateAuditData () {
    /*
      Create and fill audit maps with starter data, ie zeroes.
    */
    this.__phraseAudit = new Map();
    const self = this;

    Object.keys(this.snippets).forEach(function (key) {
      self.phraseAudit.set(key, new Map());
      self.snippets[key].groups.forEach(function (group) {
        group.phrases.forEach(function (phrase) {
          self.__phraseAudit.get(key).set(phrase, 0);
        });
      });
    });
  }

  getSubModel (model, subModelName) {
    if (model[subModelName]) return model[subModelName];
    model[subModelName] = this.submodeler(model, subModelName);
    return model[subModelName];
  }
}

import filters from './filters.js';

Improv.filters = filters;

export default Improv;
