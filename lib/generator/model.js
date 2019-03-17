const defaults = {
  tags: [],
  bindings: {},
  history: [],
  tagHistory: []
};

export function initModel(model, submodeler, builtins) {
  return {
    ...defaults,
    ...model,
    submodeler,
    builtins
  };
}

export function updateModel(oldModel, newModel) {
  oldModel.tags = newModel.tags;
  oldModel.bindings = newModel.bindings;
  oldModel.history = newModel.history;
  oldModel.tagHistory = newModel.tagHistory;
}

export function mergeTags(model, groupTags) {
  /*
    Add a group's tags to the model, for reincorporation.
  */
  function mergeTag(a, b) {
    if (a.length < b.length) return b;
    return a;
  }

  groupTags.forEach(a => {
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

export function clearHistory(model) {
  model.history = [];
  model.tagHistory = [];
}

export function submodel(model, subModelName) {
  if (!model[subModelName]) {
    model[subModelName] = initModel(
      model.submodeler(model, subModelName),
      model.submodeler
    );
  }
  return model[subModelName];
}
