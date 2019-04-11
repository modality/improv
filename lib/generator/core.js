import template from "../template";
import {
  useBindingsMiddleware,
  useSubmodelMiddleware,
  cacheSnippetMiddleware,
  validateSnippetMiddleware
} from "./middleware";

import { mergeTags, clearHistory } from "./model";

export function applyFiltersToGroup(filters, group, model) {
  /*
    Run the filters through an individual group.
  */
  const output = { score: 0 };

  // Make sure the group has tags.
  if (typeof group.tags === "undefined") group.tags = [];

  // Since we might return a different group than we got, we use a variable.
  let currentGroup = group;

  for (const filter of filters) {
    const filterOutput = filter(currentGroup, model);

    let scoreOffset;

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

  output.group = currentGroup;
  return output;
}

export function createFiltersSelector(filters) {
  return (groups, model) => {
    /*
      Starting with the raw list of groups, return a filtered list with
      scores.
    */
    return groups
      .map(group => applyFiltersToGroup(filters, group, model))
      .filter(o => o.score !== null);
  };
}

export function selectGroupsWithPhrases(groups) {
  return groups.filter(g => g.group.phrases.length > 0);
}

export function createSalienceSelector(salienceFormula) {
  return groups => {
    /*
      Starting with the scored list from applyFilters(), return a list that has
      invalid groups scrubbed out and only includes groups with a score past
      the threshold.
    */
    // Filter out groups emptied out by dryness()
    const maxScore = groups.reduce(
      (currentMax, b) => (b.score > currentMax ? b.score : currentMax),
      Number.NEGATIVE_INFINITY
    );
    const scoreThreshold = salienceFormula(maxScore);
    return groups.filter(o => o.score >= scoreThreshold);
  };
}

export function convertGroupsToPhrases(groups) {
  /*
    Starting with a list of scored groups, flatten them into a simple list
    of phrases.
  */
  return groups
    .map(o => o.group.phrases.map(i => [i, o.group.tags]))
    .reduce((a, b) => a.concat(b), []);
}

export function createPhraseSelector(reincorporate, rng) {
  /*
    Once we have a list of suitable groups, finally select a phrase at random.
  */
  return (phrases, model) => {
    if (phrases.length === 0) {
      console.error('Ran out of phrases', model);
      throw new Error(`Ran out of phrases.`);
      //while generating ${this.__currentSnippet}
    }

    const chosen = phrases[Math.floor(rng() * phrases.length)];
    if (reincorporate) mergeTags(model, chosen[1]);
    if (Array.isArray(chosen[1])) {
      model.tagHistory = chosen[1].concat(model.tagHistory);
    }

    return chosen[0];
  };
}

export function recordHistory(input, model) {
  model.history.unshift(input);
  return input;
}

export default class Core {
  constructor(config) {
    this.snippets = config.snippets;
    this.__phraseAudit = config.audit;
    this.salienceFormula = config.salienceFormula;
    this.persistence = config.persistence;
    this.reincorporate = config.reincorporate;
    this.rng = config.rng;
    this.filters = config.filters;

    const reducer = (acc, curr) => {
      const wrapped = curr(this, acc);
      return wrapped.bind(this);
    };

    // Because these function wrap eachother like layers of an onion, if we want
    // them to run in the same order as the array we must reverse the array so that
    // the outermost "layer" is applied last
    const middlewares = [
      useBindingsMiddleware,
      useSubmodelMiddleware,
      cacheSnippetMiddleware,
      validateSnippetMiddleware
    ].reverse();

    this.__wrappedGen = middlewares.reduce(reducer.bind(this), this.__gen);
  }

  __gen = (snippet, model, subModelName) => {
    /*
      Actually generate text. Separate from #gen() because we don't want to clear
      history or error-handling data while a call to #gen() hasn't finished
      returning
    */
    const phraseMiddlewares = [
      createFiltersSelector(this.filters),
      selectGroupsWithPhrases,
      createSalienceSelector(this.salienceFormula),
      convertGroupsToPhrases,
      createPhraseSelector(this.reincorporate, this.rng),
      recordHistory
    ];

    const { groups } = this.snippets[snippet];
    const chosenPhrase = phraseMiddlewares.reduce(
      (input, selector) => selector(input, model),
      groups
    );

    this.__phraseAudit.incrementPhrase(snippet, chosenPhrase);

    const output = template(chosenPhrase, model, this.__wrappedGen, this);

    return output;
  };

  gen = (snippet, model) => {
    /*
      Generate text (user-facing API). Since this function can recur, most of
      the heavy lifting is done in __gen().
    */
    const output = this.__wrappedGen(snippet, model);

    if (!this.persistence) {
      clearHistory(model);
    }

    return output;
  };
}
