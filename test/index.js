/* Main Improv file */
import assert from "assert";
import should from "should";
import simple from "simple-mock";
import Improv from "../lib";
import {
  createFiltersSelector,
  convertGroupsToPhrases,
  createPhraseSelector,
  createSalienceSelector
} from "../lib/generator/core";

import { clearHistory } from "../lib/generator/model";

describe("improv", () => {
  const testSnippet = {
    "test-snippet": {
      groups: [
        {
          phrases: ["dog", "cat", "pig"]
        }
      ]
    },
    "binding-snippet": {
      bind: true,
      groups: [
        {
          phrases: ["glue", "cement", "binder"]
        }
      ]
    },
    "recur-binding": {
      bind: true,
      groups: [{ phrases: ["[:binding-snippet]"] }]
    }
  };

  let testImprov;

  beforeEach(() => {
    testImprov = new Improv(testSnippet, {
      rng: () => 0.5
    });
  });

  it("creates an Improv object", () => {
    assert(testImprov instanceof Improv);
  });

  it("ensures model has tags", () => {
    const model = {};
    const full = testImprov.fullGen("test-snippet", model);
    assert.deepStrictEqual(full.model.tags, []);
  });

  it("throws an error if an unknown snippet is to be generated", () => {
    const badFunc = function() {
      testImprov.gen("foo", {});
    };

    assert.throws(badFunc, Error);
  });

  describe("createFiltersSelector", () => {
    it("produces a scored list of groups", () => {
      const filtersSelector = createFiltersSelector([]);
      const groups = testImprov.snippets["test-snippet"].groups;

      assert.deepStrictEqual(filtersSelector(groups, {}), [
        {
          group: {
            phrases: ["dog", "cat", "pig"],
            tags: []
          },
          score: 0
        }
      ]);
    });
  });

  describe("rng", () => {
    it("allows supplying a custom RNG", () => {
      const snippets = {
        example: {
          groups: [
            {
              tags: [],
              phrases: ["foo", "bar", "baz", "quux"]
            }
          ]
        },
        num: {
          groups: [
            {
              tags: [],
              phrases: ["[#1-20]"]
            }
          ]
        }
      };

      const rng0 = function() {
        return 0;
      };

      const rng1 = function() {
        return 0.9999999;
      };

      const improv0 = new Improv(snippets, { rng: rng0 });
      const improv1 = new Improv(snippets, { rng: rng1 });

      assert.equal(improv0.gen("example"), "foo");
      assert.equal(improv0.gen("num"), "1");
      assert.equal(improv1.gen("example"), "quux");
      assert.equal(improv1.gen("num"), "20");
    });
  });

  describe("convertGroupsToPhrases", () => {
    it("flattens a scored list of groups into a tuple with tags", () => {
      const testList = [
        {
          group: {
            tags: [["canine"]],
            phrases: ["dog", "wolf"]
          },
          score: 0
        },
        {
          group: {
            tags: [["porcine"]],
            phrases: ["boar", "pig"]
          },
          score: 0
        }
      ];

      assert.deepStrictEqual(convertGroupsToPhrases(testList), [
        ["dog", [["canine"]]],
        ["wolf", [["canine"]]],
        ["boar", [["porcine"]]],
        ["pig", [["porcine"]]]
      ]);
    });
  });

  describe("createPhraseSelector", () => {
    const testList = [
      {
        group: {
          phrases: ["dog", "cat", "pig"]
        },
        score: 0
      },
      {
        group: {
          phrases: ["boar", "deer", "puma"]
        },
        score: 0
      }
    ];

    it("selects a phrase at random from a scored list", () => {
      const phraseSelector = createPhraseSelector(false, () => 0.5);
      const phrases = convertGroupsToPhrases(testList);
      const result = phraseSelector(phrases, {});
      assert.equal(typeof result, "string");
      assert.equal(result, "boar");
    });
  });

  describe("createSalienceSelector", () => {
    it("filters a scored list of groups", () => {
      const testList = [
        {
          group: {
            phrases: ["dog", "cat", "bat"]
          },
          score: 1
        },
        {
          group: {
            phrases: ["mantis", "shrimp", "spider"]
          },
          score: 1
        },
        {
          group: {
            phrases: ["pig", "boar"]
          },
          score: 0
        }
      ];

      const salienceSelector = createSalienceSelector(a => a);

      salienceSelector(testList).should.deepEqual([
        {
          group: {
            phrases: ["dog", "cat", "bat"]
          },
          score: 1
        },
        {
          group: {
            phrases: ["mantis", "shrimp", "spider"]
          },
          score: 1
        }
      ]);
    });
  });

  describe("gen", () => {
    it("generates a random phrase after applying all filters", () => {
      testImprov.gen("test-snippet", {}).should.equal("cat");
    });

    it("binds values to models", () => {
      const model = {};
      const result = testImprov.gen("binding-snippet", model);

      result.should.equal(model.bindings["binding-snippet"]);
    });

    it("reuses the bound value", () => {
      const model = { bindings: { "binding-snippet": "paste" } };
      testImprov
        .gen("binding-snippet", model)
        .should.equal(testImprov.gen("binding-snippet", model))
        .and.equal("paste");
    });

    it("works recursively", () => {
      const model = {};
      testImprov.gen("recur-binding", model);
      model.bindings["recur-binding"].should.equal(
        model.bindings["binding-snippet"]
      );
    });

    it("throws an error if a snippet does not exist", () => {
      const model = {};
      const f = function() {
        testImprov.gen("missing-snippet", model);
      };

      assert.throws(f, Error);
    });
  });

  describe("auditing", () => {
    it("returns a map of used phrases", () => {
      const auditImprov = new Improv(testSnippet, {
        audit: true,
        rng: () => 0.5
      });
      auditImprov.gen("test-snippet");
      auditImprov.gen("test-snippet");
      auditImprov.gen("test-snippet");
      const result = auditImprov.phraseAudit;

      assert.notEqual(result, undefined);
      assert(result instanceof Map);

      result
        .get("test-snippet")
        .get("cat")
        .should.equal(3);
      result
        .get("test-snippet")
        .get("pig")
        .should.equal(0);
    });
  });
});

describe("with filters", () => {
  const snippets = {
    line: {
      groups: [
        {
          tags: [],
          phrases: "I love my [:pet]."
        }
      ]
    },
    pet: {
      groups: [
        {
          tags: [["animal", "dog"]],
          phrases: ["dog"]
        },
        {
          tags: [["animal", "cat"]],
          phrases: ["cat"]
        },
        {
          tags: [],
          phrases: ["pet rock"]
        }
      ]
    },
    badSnippet: {
      groups: [
        {
          phrases: ["foo"]
        }
      ]
    }
  };
  describe("with mismatch filter", () => {
    const expectedValue = 0;
    const wMismatch = new Improv(snippets, {
      filters: [Improv.filters.mismatchFilter()],
      rng: () => expectedValue
    });

    it("allows only values that do not mismatch the model", () => {
      const model1 = { tags: [["animal", "dog"]] };
      const model2 = { tags: [["animal", "cat"]] };
      assert.equal(wMismatch.gen("pet", model1), "dog");
      assert.equal(wMismatch.gen("pet", model2), "cat");
    });

    it("treats no tag property as empty tags", () => {
      let result;
      const cb = function() {
        result = wMismatch.gen("badSnippet");
      };

      cb.should.not.throwError();
      assert.equal(result, "foo");
    });
  });

  describe("with templates", () => {
    const snippets = {
      root: {
        groups: [
          {
            phrases: ["Hi, my name is [name], and I own [#1-20] [:pet]s."]
          }
        ]
      },
      pet: {
        groups: [
          {
            phrases: ["cat", "dog", "parakeet"]
          }
        ]
      },
      loud: {
        groups: [
          {
            phrases: ["[upcap :pet]"]
          }
        ]
      },
      fails: {
        groups: [
          {
            phrases: ["[fails :pet]"]
          }
        ]
      }
    };

    const generator = new Improv(snippets, {
      builtins: {
        upcap(str) {
          return str.toUpperCase();
        }
      }
    });

    const model = { name: "Bob" };

    it("uses the templating engine", () => {
      generator
        .gen("root", model)
        .should.match(/Hi, my name is Bob, and I own \d+ (cat|dog|parakeet)s./);
    });

    it("uses templating builtins", () => {
      generator.gen("loud", model).should.match(/(CAT|DOG|PARAKEET)/);
    });

    it("gives useful errors", () => {
      function failer() {
        generator.gen("fails");
      }

      failer.should.throwError(
        'Builtin or model property "fails" is not a function.'
      );
    });
  });

  describe("structured search", () => {
    const snippets = {
      root: {
        groups: [
          {
            phrases: ["[:phrase], [|mood|bright:phrase], [:phrase]"]
          }
        ]
      },
      phrase: {
        groups: [
          {
            tags: [["mood", "dark"]],
            phrases: ["dark phrase"]
          },
          {
            tags: [["mood", "bright"]],
            phrases: ["bright phrase"]
          }
        ]
      }
    };

    const generator = new Improv(snippets, {
      filters: [Improv.filters.mismatchFilter()],
      reincorporate: true
    });

    const modelOne = {
      tags: [["mood", "dark"]]
    };

    const modelTwo = {};

    it("uses the provided tags", () => {
      assert.equal(
        generator.gen("root", modelOne),
        "dark phrase, bright phrase, dark phrase"
      );
    });

    it("does not mutate the model", () => {
      generator
        .gen("root", modelTwo)
        .should.match(/(bright|dark) phrase, bright phrase, \1 phrase/);
    });
  });
});

describe("reincorporation", () => {
  const snippets = {
    root: {
      groups: [
        {
          tags: [["test"]],
          phrases: ["test"]
        }
      ]
    },
    tagged: {
      groups: [
        {
          tags: [["foo", "bar"], ["baz"]],
          phrases: ["test"]
        }
      ]
    }
  };

  const reincorporater = new Improv(snippets, { reincorporate: true });

  it("adds used tags back into the model", () => {
    const model = {
      tags: []
    };

    const result = reincorporater.fullGen("root", model);
    assert.deepStrictEqual(result.model.tags, [["test"]]);
  });

  it("merges tags with existing ones", () => {
    const model = {
      tags: [["foo"]]
    };

    const result = reincorporater.fullGen("tagged", model);
    assert.deepStrictEqual(result.model.tags, [["foo", "bar"], ["baz"]]);
  });
});

describe("salience filtering", () => {
  it("selects the best fitted phrase", () => {
    const snippets = {
      root: {
        groups: [
          {
            tags: [["test"]],
            phrases: ["foo"]
          },
          {
            tags: [["yo"]],
            phrases: ["bar"]
          }
        ]
      }
    };

    const model = {
      tags: [["test"]]
    };

    const fitted = new Improv(snippets, {
      filters: [Improv.filters.fullBonus()],
      rng: () => 0.9
    });

    assert.equal(fitted.gen("root", model), "foo");
  });
});

describe("filtering API", () => {
  it("gives filters access to model, a group, and the generator", () => {
    let results;
    const myFilter = function(group, model) {
      results = {
        group,
        model
      };
      return 0;
    };

    const group = {
      tags: [],
      phrases: ["test"]
    };

    const snippets = {
      root: {
        groups: [group]
      }
    };

    const model = { tags: ["test"] };

    const customFilter = new Improv(snippets, {
      filters: [myFilter],
      rng: () => 0
    });

    customFilter.gen("root", model);

    const resultModel = {
      tags: results.model.tags
    };

    assert.deepStrictEqual(results.group, group);
    assert.deepStrictEqual(results.model.tags, model.tags);
  });

  it("allows setting the salience formula", () => {
    const snippets = {
      root: {
        groups: [
          {
            tags: [["used"]],
            phrases: ["foo"]
          },
          {
            tags: [["unused"]],
            phrases: ["bar"]
          }
        ]
      }
    };

    const customFilter = new Improv(snippets, {
      filters: [Improv.filters.unmentioned()],
      salienceFormula: () => 0,
      rng: () => 0
    });

    const model = {};

    assert.equal(customFilter.gen("root", model), "foo");
    assert.equal(customFilter.gen("root", model), "foo");
  });
});

describe("history and DRYness", () => {
  const snippets = {
    first: {
      groups: [
        {
          tags: [["one"]],
          phrases: ["one"]
        }
      ]
    },
    second: {
      groups: [
        {
          tags: [["two"], ["three"]],
          phrases: ["two"]
        }
      ]
    },
    third: {
      groups: [
        {
          tags: [],
          phrases: ["one", "two", "three"]
        }
      ]
    },
    fourth: {
      groups: [
        {
          tags: ["one"],
          phrases: ["one"]
        },
        {
          tags: ["two"],
          phrases: ["two"]
        }
      ]
    },
    fifth: {
      groups: [
        {
          tags: [],
          phrases: ["[:fourth][:fourth][:fourth]"]
        }
      ]
    }
  };

  let g;

  beforeEach(() => {
    g = new Improv(snippets, {
      rng: () => 0.5
    });
  });

  it("records a history of generated phrases", () => {
    g.gen("first");
    g.gen("second");
    g.gen("first");
    g.gen("first");

    assert.deepStrictEqual(g.history, ["one", "one", "two", "one"]);
  });

  it("records a history of used tags", () => {
    g.gen("first");
    g.gen("first");
    g.gen("second");

    assert.deepStrictEqual(g.tagHistory, [
      ["two"],
      ["three"],
      ["one"],
      ["one"]
    ]);
  });

  it("allows history to be cleared", () => {
    const i = new Improv(snippets, {
      rng: () => 0.5
    });
    i.gen("second");
    i.gen("first");

    assert.deepStrictEqual(i.history, ["one", "two"]);
    assert.deepStrictEqual(i.tagHistory, [["one"], ["two"], ["three"]]);
    i.clearHistory();
    assert.deepStrictEqual(i.history, []);
    assert.deepStrictEqual(i.tagHistory, []);
  });

  it("allows persistence to be disabled", () => {
    const i = new Improv(snippets, { persistence: false });
    i.gen("first");
    assert.deepStrictEqual(i.history, []);
    assert.deepStrictEqual(i.tagHistory, []);
  });

  describe("dryness filter", () => {
    const i = new Improv(snippets, {
      filters: [Improv.filters.dryness()],
      rng: () => 0
    });

    it("doesn't repeat itself", () => {
      assert.equal(i.gen("third"), "one");
      assert.equal(i.gen("third"), "two");
      assert.equal(i.gen("third"), "three");
    });
  });

  describe("unmentioned filter", () => {
    const i = new Improv(snippets, {
      filters: [Improv.filters.unmentioned()],
      rng: () => 0
    });

    it("increases the rank of unused tags", () => {
      assert.equal(i.gen("fourth"), "one");
      assert.equal(i.gen("fourth"), "two");
      assert.equal(i.gen("fourth"), "one");
    });
  });

  describe("momentary persistence", () => {
    const i = new Improv(snippets, {
      filters: [Improv.filters.unmentioned()],
      persistence: false,
      rng: () => 0
    });

    it("retains history for the duration of one gen", () => {
      const gen1 = i.gen("fifth");
      const gen2 = i.gen("fifth");

      assert.equal(gen1, "onetwoone");
      assert.equal(gen1, gen2);
      assert.deepStrictEqual(i.tagHistory, []);
    });
  });
});

describe("submodels", () => {
  const snippets = {
    eyecolor: {
      bind: true,
      groups: [
        {
          tags: [],
          phrases: ["blue", "black", "brown"]
        }
      ]
    },
    occupation: {
      bind: true,
      groups: [
        {
          tags: [],
          phrases: ["lawyer", "thief", "hunter"]
        }
      ]
    },
    person_desc: {
      groups: [
        {
          tags: [],
          phrases: ["[:occupation] with [:eyecolor] eyes"]
        }
      ]
    },
    main_phrase: {
      groups: [
        {
          tags: [],
          phrases: ["[a >person1:person_desc];[a >person2:person_desc]"]
        }
      ]
    },
    person1: {
      groups: [
        {
          tags: [],
          phrases: ["[a >person1:person_desc]"]
        }
      ]
    },
    person2: {
      groups: [
        {
          tags: [],
          phrases: ["[a >person2:person_desc]"]
        }
      ]
    },
    person_proptest: {
      groups: [
        {
          tags: [],
          phrases: ["[>person2:proptest]"]
        }
      ]
    },
    proptest: {
      groups: [
        {
          tags: [],
          phrases: ["[prop]"]
        }
      ]
    }
  };

  let g;

  beforeEach(() => {
    g = new Improv(snippets, {
      submodeler() {
        return {
          prop: "foo"
        };
      }
    });
  });

  it("uses submodels", () => {
    const model = {};
    const [a, b] = g.gen("main_phrase", model).split(";");
    a.should.match(/(lawyer|thief|hunter) with (blue|black|brown) eyes/);
    a.should.equal(g.gen("person1", model));
    b.should.equal(g.gen("person2", model));
  });

  it("uses the submodeler function", () => {
    const model = {};
    g.gen("person_proptest", model).should.equal("foo");
  });
});

// TODO: Test and document the "forced tag" functionality.
