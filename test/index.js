/* Main Improv file */

import 'should';
import simple from 'simple-mock';
import Improv from '../lib';

describe('improv', () => {
  const testSnippet = {
    'test-snippet': {
      groups: [
        {
          phrases: ['dog', 'cat', 'pig']
        }
      ]
    },
    'binding-snippet': {
      bind: true,
      groups: [
        {
          phrases: ['glue', 'cement', 'binder']
        }
      ]
    },
    'recur-binding': {
      bind: true,
      groups: [{phrases: ['[:binding-snippet]']}]
    }
  };

  let testImprov;

  beforeEach(() => {
    testImprov = new Improv(testSnippet);
  });

  before(() => {
    /*
      Math.random() is, er, random. So we mock that issue away by replacing it
      with a function that always returns 0.5.
    */
    simple.mock(Math, 'random', () => 0.5);
  });

  after(() => {
    simple.restore();
  });

  it('creates an Improv object', () => {
    testImprov.should.be.instanceOf(Improv);
  });

  it('ensures model has tags', () => {
    const model = {};
    testImprov.gen('test-snippet', model);
    model.tags.should.eql([]);
  });

  it('throws an error if an unknown snippet is to be generated', () => {
    const badFunc = function() {
      testImprov.gen('foo', {});
    };

    badFunc.should.throw(Error);
  });

  describe('applyFilters', () => {
    it('produces a scored list of groups', () => {
      testImprov.applyFilters('test-snippet', {}).should.deepEqual([
        {
          group: {
            phrases: ['dog', 'cat', 'pig'],
            tags: []
          },
          score: 0
        }
      ]);
    });
  });

  describe('rng', () => {
    it('allows supplying a custom RNG', () => {
      const snippets = {
        example: {
          groups: [
            {
              tags: [],
              phrases: ['foo', 'bar', 'baz', 'quux']
            }
          ]
        },
        num: {
          groups: [
            {
              tags: [],
              phrases: ['[#1-20]']
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

      const improv0 = new Improv(snippets, {rng: rng0});
      const improv1 = new Improv(snippets, {rng: rng1});

      improv0.gen('example').should.equal('foo');
      improv0.gen('num').should.equal('1');
      improv1.gen('example').should.equal('quux');
      improv1.gen('num').should.equal('20');
    });
  });

  describe('flattenGroups', () => {
    it('flattens a scored list of groups into a tuple with tags', () => {
      const testList = [
        {
          group: {
            tags: [['canine']],
            phrases: ['dog', 'wolf']
          },
          score: 0
        },
        {
          group: {
            tags: [['porcine']],
            phrases: ['boar', 'pig']
          },
          score: 0
        }
      ];

      testImprov
        .flattenGroups(testList)
        .should.eql([
          ['dog', [['canine']]],
          ['wolf', [['canine']]],
          ['boar', [['porcine']]],
          ['pig', [['porcine']]]
        ]);
    });
  });

  describe('selectPhrase', () => {
    const testList = [
      {
        group: {
          phrases: ['dog', 'cat', 'pig']
        },
        score: 0
      },
      {
        group: {
          phrases: ['boar', 'deer', 'puma']
        },
        score: 0
      }
    ];

    it('selects a phrase at random from a scored list', () => {
      testImprov
        .selectPhrase(testList)
        .should.be.a.String()
        .and.equal('boar');
    });
  });

  describe('scoreFilter', () => {
    it('filters a scored list of groups', () => {
      const testList = [
        {
          group: {
            phrases: ['dog', 'cat', 'bat']
          },
          score: 1
        },
        {
          group: {
            phrases: ['mantis', 'shrimp', 'spider']
          },
          score: 1
        },
        {
          group: {
            phrases: ['pig', 'boar']
          },
          score: 0
        }
      ];

      testImprov.scoreFilter(testList).should.deepEqual([
        {
          group: {
            phrases: ['dog', 'cat', 'bat']
          },
          score: 1
        },
        {
          group: {
            phrases: ['mantis', 'shrimp', 'spider']
          },
          score: 1
        }
      ]);
    });
  });

  describe('gen', () => {
    it('generates a random phrase after applying all filters', () => {
      testImprov.gen('test-snippet', {}).should.equal('cat');
    });

    it('binds values to models', () => {
      const model = {};
      const result = testImprov.gen('binding-snippet', model);

      result.should.equal(model.bindings['binding-snippet']);
    });

    it('reuses the bound value', () => {
      const model = {bindings: {'binding-snippet': 'paste'}};
      testImprov
        .gen('binding-snippet', model)
        .should.equal(testImprov.gen('binding-snippet', model))
        .and.equal('paste');
    });

    it('works recursively', () => {
      const model = {};
      testImprov.gen('recur-binding', model);
      model.bindings['recur-binding'].should.equal(
        model.bindings['binding-snippet']
      );
    });

    it('throws an error if a snippet does not exist', () => {
      const model = {};
      const f = function() {
        testImprov.gen('missing-snippet', model);
      };

      f.should.throw();
    });
  });

  describe('auditing', () => {
    it('returns a map of used phrases', () => {
      const auditImprov = new Improv(testSnippet, {audit: true});
      auditImprov.gen('test-snippet');
      auditImprov.gen('test-snippet');
      auditImprov.gen('test-snippet');
      const result = auditImprov.phraseAudit;

      result.should.not.be.undefined();
      result.should.be.instanceOf(Map);
      result
        .get('test-snippet')
        .get('cat')
        .should.equal(3);
      result
        .get('test-snippet')
        .get('pig')
        .should.equal(0);
    });
  });
});

describe('with filters', () => {
  const testSet = {
    line: {
      groups: [
        {
          tags: [],
          phrases: 'I love my [:pet].'
        }
      ]
    },
    pet: {
      groups: [
        {
          tags: [['animal', 'dog']],
          phrases: ['dog']
        },
        {
          tags: [['animal', 'cat']],
          phrases: ['cat']
        },
        {
          tags: [],
          phrases: ['pet rock']
        }
      ]
    },
    badSnippet: {
      groups: [
        {
          phrases: ['foo']
        }
      ]
    }
  };
  describe('with mismatch filter', () => {
    const expectedValue = 0;
    const wMismatch = new Improv(testSet, {
      filters: [Improv.filters.mismatchFilter()]
    });

    before(() => {
      simple.mock(Math, 'random', () => expectedValue);
    });

    after(() => {
      simple.restore();
    });

    it('allows only values that do not mismatch the model', () => {
      const model1 = {tags: [['animal', 'dog']]};
      const model2 = {tags: [['animal', 'cat']]};

      wMismatch.gen('pet', model1).should.equal('dog');
      wMismatch.gen('pet', model2).should.equal('cat');
    });

    it('treats no tag property as empty tags', () => {
      let result;
      const cb = function() {
        result = wMismatch.gen('badSnippet');
      };

      cb.should.not.throwError();
      result.should.equal('foo');
    });
  });

  describe('with templates', () => {
    const spec = {
      root: {
        groups: [
          {
            phrases: ['Hi, my name is [name], and I own [#1-20] [:pet]s.']
          }
        ]
      },
      pet: {
        groups: [
          {
            phrases: ['cat', 'dog', 'parakeet']
          }
        ]
      },
      loud: {
        groups: [
          {
            phrases: ['[upcap :pet]']
          }
        ]
      },
      fails: {
        groups: [
          {
            phrases: ['[fails :pet]']
          }
        ]
      }
    };

    const generator = new Improv(spec, {
      builtins: {
        upcap(str) {
          return str.toUpperCase();
        }
      }
    });

    const model = {name: 'Bob'};

    it('uses the templating engine', () => {
      generator
        .gen('root', model)
        .should.match(/Hi, my name is Bob, and I own \d+ (cat|dog|parakeet)s./);
    });

    it('uses templating builtins', () => {
      generator.gen('loud', model).should.match(/(CAT|DOG|PARAKEET)/);
    });

    it('gives useful errors', () => {
      function failer() {
        generator.gen('fails');
      }

      failer.should.throwError(
        'Builtin or model property "fails" is not a function.'
      );
    });
  });

  describe('structured search', () => {
    const spec = {
      root: {
        groups: [
          {
            phrases: ['[:phrase], [|mood|bright:phrase], [:phrase]']
          }
        ]
      },
      phrase: {
        groups: [
          {
            tags: [['mood', 'dark']],
            phrases: ['dark phrase']
          },
          {
            tags: [['mood', 'bright']],
            phrases: ['bright phrase']
          }
        ]
      }
    };

    const generator = new Improv(spec, {
      filters: [Improv.filters.mismatchFilter()],
      reincorporate: true
    });

    const modelOne = {
      tags: [['mood', 'dark']]
    };

    const modelTwo = {};

    it('uses the provided tags', () => {
      generator
        .gen('root', modelOne)
        .should.equal('dark phrase, bright phrase, dark phrase');
    });

    it('does not mutate the model', () => {
      generator
        .gen('root', modelTwo)
        .should.match(/(bright|dark) phrase, bright phrase, \1 phrase/);
    });
  });
});

describe('reincorporation', () => {
  const spec = {
    root: {
      groups: [
        {
          tags: [['test']],
          phrases: ['test']
        }
      ]
    },
    tagged: {
      groups: [
        {
          tags: [['foo', 'bar'], ['baz']],
          phrases: ['test']
        }
      ]
    }
  };

  const reincorporater = new Improv(spec, {reincorporate: true});

  it('adds used tags back into the model', () => {
    const model = {
      tags: []
    };

    reincorporater.gen('root', model);
    model.tags.should.eql([['test']]);
  });

  it('merges tags with existing ones', () => {
    const model = {
      tags: [['foo']]
    };

    reincorporater.gen('tagged', model);
    model.tags.should.eql([['foo', 'bar'], ['baz']]);
  });
});

describe('salience filtering', () => {
  before(() => {
    simple.mock(Math, 'random', () => 0.9);
  });

  after(() => {
    simple.restore();
  });

  it('selects the best fitted phrase', () => {
    const spec = {
      root: {
        groups: [
          {
            tags: [['test']],
            phrases: ['foo']
          },
          {
            tags: [['yo']],
            phrases: ['bar']
          }
        ]
      }
    };

    const model = {
      tags: [['test']]
    };

    const fitted = new Improv(spec, {
      filters: [Improv.filters.fullBonus()]
    });

    fitted.gen('root', model).should.equal('foo');
  });
});

describe('filtering API', () => {
  before(() => {
    simple.mock(Math, 'random', () => 0);
  });

  after(() => {
    simple.restore();
  });

  it('gives filters access to model, a group, and the generator', () => {
    let results;
    const myFilter = function(group, model) {
      results = {group, model, thisObj: this};
      return 0;
    };

    const group = {
      tags: [],
      phrases: ['test']
    };

    const spec = {
      root: {
        groups: [group]
      }
    };

    const model = {tags: ['test']};

    const customFilter = new Improv(spec, {
      filters: [myFilter]
    });

    customFilter.gen('root', model);

    results.group.should.equal(group);
    results.model.should.equal(model);
    results.thisObj.should.equal(customFilter);
  });

  it('allows setting the salience formula', () => {
    const spec = {
      root: {
        groups: [
          {
            tags: [['used']],
            phrases: ['foo']
          },
          {
            tags: [['unused']],
            phrases: ['bar']
          }
        ]
      }
    };

    const customFilter = new Improv(spec, {
      filters: [Improv.filters.unmentioned()],
      salienceFormula: () => 0
    });

    const model = {};

    customFilter.gen('root', model).should.equal('foo');
    customFilter.gen('root', model).should.equal('foo');
  });
});

describe('history and DRYness', () => {
  const spec = {
    first: {
      groups: [
        {
          tags: [['one']],
          phrases: ['one']
        }
      ]
    },
    second: {
      groups: [
        {
          tags: [['two'], ['three']],
          phrases: ['two']
        }
      ]
    },
    third: {
      groups: [
        {
          tags: [],
          phrases: ['one', 'two', 'three']
        }
      ]
    },
    fourth: {
      groups: [
        {
          tags: ['one'],
          phrases: ['one']
        },
        {
          tags: ['two'],
          phrases: ['two']
        }
      ]
    },
    fifth: {
      groups: [
        {
          tags: [],
          phrases: ['[:fourth][:fourth][:fourth]']
        }
      ]
    }
  };

  let g;

  beforeEach(() => {
    g = new Improv(spec);
  });

  it('records a history of generated phrases', () => {
    g.gen('first');
    g.gen('second');
    g.gen('first');
    g.gen('first');
    g.history.should.eql(['one', 'one', 'two', 'one']);
  });

  it('records a history of used tags', () => {
    g.gen('first');
    g.gen('first');
    g.gen('second');
    g.tagHistory.should.eql([['two'], ['three'], ['one'], ['one']]);
  });

  it('allows history to be cleared', () => {
    g.gen('second');
    g.gen('first');
    g.history.should.eql(['one', 'two']);
    g.tagHistory.should.eql([['one'], ['two'], ['three']]);
    g.clearHistory();
    g.clearTagHistory();
    g.history.should.eql([]);
    g.tagHistory.should.eql([]);
  });

  it('allows persistence to be disabled', () => {
    const h = new Improv(spec, {persistence: false});
    h.gen('first');
    h.history.should.eql([]);
    h.tagHistory.should.eql([]);
  });

  describe('dryness filter', () => {
    before(() => {
      simple.mock(Math, 'random', () => 0);
    });
    after(() => {
      simple.restore();
    });

    const i = new Improv(spec, {
      filters: [Improv.filters.dryness()]
    });

    it("doesn't repeat itself", () => {
      i.gen('third').should.equal('one');
      i.gen('third').should.equal('two');
      i.gen('third').should.equal('three');
    });
  });

  describe('unmentioned filter', () => {
    before(() => {
      simple.mock(Math, 'random', () => 0);
    });
    after(() => {
      simple.restore();
    });

    const j = new Improv(spec, {
      filters: [Improv.filters.unmentioned()]
    });

    it('increases the rank of unused tags', () => {
      j.gen('fourth').should.equal('one');
      j.gen('fourth').should.equal('two');
      j.gen('fourth').should.equal('one');
    });
  });

  describe('momentary persistence', () => {
    before(() => {
      simple.mock(Math, 'random', () => 0);
    });
    after(() => {
      simple.restore();
    });

    const i = new Improv(spec, {
      filters: [Improv.filters.unmentioned()],
      persistence: false
    });

    it('retains history for the duration of one gen', () => {
      i.gen('fifth')
        .should.equal('onetwoone')
        .and.equal(i.gen('fifth'));
      i.tagHistory.should.eql([]);
    });
  });
});

describe('submodels', () => {
  const spec = {
    eyecolor: {
      bind: true,
      groups: [
        {
          tags: [],
          phrases: ['blue', 'black', 'brown']
        }
      ]
    },
    occupation: {
      bind: true,
      groups: [
        {
          tags: [],
          phrases: ['lawyer', 'thief', 'hunter']
        }
      ]
    },
    person_desc: {
      groups: [
        {
          tags: [],
          phrases: ['[:occupation] with [:eyecolor] eyes']
        }
      ]
    },
    main_phrase: {
      groups: [
        {
          tags: [],
          phrases: ['[a >person1:person_desc];[a >person2:person_desc]']
        }
      ]
    },
    person1: {
      groups: [
        {
          tags: [],
          phrases: ['[a >person1:person_desc]']
        }
      ]
    },
    person2: {
      groups: [
        {
          tags: [],
          phrases: ['[a >person2:person_desc]']
        }
      ]
    },
    person_proptest: {
      groups: [
        {
          tags: [],
          phrases: ['[>person2:proptest]']
        }
      ]
    },
    proptest: {
      groups: [
        {
          tags: [],
          phrases: ['[prop]']
        }
      ]
    }
  };

  let g;

  beforeEach(() => {
    g = new Improv(spec, {
      submodeler() {
        return {
          prop: 'foo'
        };
      }
    });
  });

  it('uses submodels', () => {
    const model = {};
    const [a, b] = g.gen('main_phrase', model).split(';');
    a.should.match(/(lawyer|thief|hunter) with (blue|black|brown) eyes/);
    a.should.equal(g.gen('person1', model));
    b.should.equal(g.gen('person2', model));
  });

  it('uses the submodeler function', () => {
    const model = {};
    g.gen('person_proptest', model).should.equal('foo');
  });
});

// TODO: Test and document the "forced tag" functionality.
