import { submodel } from "./model";

// Handle all behavior related to bindings. They should:
// 1. be created on the model if they do not exist
// 2. used instead of generating if a bin
export function useBindingsMiddleware(ref, improvGenFn) {
  return (snippet, model, subModelName) => {
    // Make sure the model has a bindings property
    if (typeof model.bindings === "undefined") {
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
  };
}

export function useSubmodelMiddleware(ref, improvGenFn) {
  return (snippet, model, subModelName) => {
    if (subModelName) {
      model = submodel(model, subModelName);
    }

    return improvGenFn(snippet, model, subModelName);
  };
}

/* For the sake of better error handling, we try to keep an accurate record
   of what snippet is being generated at any given time. */
export function cacheSnippetMiddleware(ref, improvGenFn) {
  return (snippet, model, subModelName) => {
    // Keep a stack of snippets we are using.
    const previousSnippet = ref.__currentSnippet;
    ref.__currentSnippet = snippet;

    const result = improvGenFn(snippet, model, subModelName);

    ref.__currentSnippet = previousSnippet;
    return result;
  };
}

export function validateSnippetMiddleware(ref, improvGenFn) {
  return (snippet, model, subModelName) => {
    if (typeof ref.snippets[snippet] === "undefined") {
      throw new TypeError(
        `Tried generating snippet "${snippet}", but no such snippet exists in spec`
      );
    }

    const { groups } = ref.snippets[snippet];
    if (!Array.isArray(groups)) {
      throw new TypeError(
        `Missing or bad groups array for snippet ${snippet}; was ${typeof groups}`
      );
    }

    return improvGenFn(snippet, model, subModelName);
  };
}
