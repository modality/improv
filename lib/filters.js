const TAG_COMPARISON = {
  TOTAL: Symbol(),
  PARTIAL: Symbol(),
  MISMATCH: Symbol()
};

function equalTags(a, b) {
  return a.length === b.length && a.every((el, i) => el === b[i]);
}

function compareTags(a, b) {
  /* Returns a TAG_COMPARISON value */
  if (equalTags(a, b)) return TAG_COMPARISON.TOTAL;
  // If the tags are unequal but have the same length, it stands to reason
  // there is a mismatch.
  if (a.length === b.length) return TAG_COMPARISON.MISMATCH;
  const [shorter, longer] = a < b ? [a, b] : [b, a];
  if (shorter.find((x, i) => x !== longer[i])) return TAG_COMPARISON.MISMATCH;
  return TAG_COMPARISON.PARTIAL;
}

function mismatchFilterSub(group, model) {
  /* Ensures that the group and model don't have any mismatched tags */
  const result = group.tags.find(groupTag => {
    // Look for a mismatch.
    const matched = model.tags.find(modelTag => modelTag[0] === groupTag[0]);
    if (matched === undefined) return false;
    if (compareTags(groupTag, matched) === TAG_COMPARISON.MISMATCH) return true;
    return false;
  });
  if (result === undefined) return 0;
  return null;
}

function bonusCompare(mode, bonus = 1, cumulative = false) {
  return function(group, model) {
    const results = group.tags.filter(groupTag => {
      const matched = model.tags.find(modelTag => modelTag[0] === groupTag[0]);
      if (matched === undefined) return false;
      if (compareTags(groupTag, matched) === mode) return true;
      return false;
    });
    if (results.length) return cumulative ? bonus * results.length : bonus;
    return 0;
  };
}

export default {
  mismatchFilter() {
    return mismatchFilterSub;
  },

  partialBonus: (...rest) => bonusCompare(TAG_COMPARISON.PARTIAL, ...rest),

  fullBonus: (...rest) => bonusCompare(TAG_COMPARISON.TOTAL, ...rest),

  dryness() {
    return function(group, model) {
      const newPhrases = group.phrases
        .map(phrase => {
          if (model.history.indexOf(phrase) !== -1) {
            return null;
          }

          return phrase;
        })
        .filter(i => i !== null);
      const newGroup = Object.create(group);
      newGroup.phrases = newPhrases;
      return [0, newGroup];
    };
  },

  unmentioned(bonus = 1) {
    return function(group, model) {
      if (!Array.isArray(group.tags)) return 0;
      if (group.tags.length === 0) return 0;
      const result = group.tags.find(t => {
        // Return true if the tag is "novel".
        const found = model.tagHistory.find(u => u[0] === t[0]);
        return typeof found === "undefined";
      });
      if (typeof result === "undefined") return 0;
      return bonus;
    };
  }
};
