import assert from "assert";
import should from "should";
import filters from "../lib/filters.js";

describe("filters", () => {
  describe("mismatchFilter", () => {
    const mismatchFilter = filters.mismatchFilter();
    const model = {
      tags: [
        ["government", "autocracy", "monarchy", "absolute"],
        ["economy", "tourism"],
        ["decline"]
      ]
    };

    it("returns null when there is a mismatch", () => {
      const mismatchingGroup = {
        tags: [["government", "democracy"], ["economy"]]
      };
      assert.equal(mismatchFilter(mismatchingGroup, model), null);
    });

    it("returns 0 when there is a complete match", () => {
      mismatchFilter(model, model).should.equal(0);
    });

    it("returns 0 when there is a partial match", () => {
      const partialMatchingGroup = {
        tags: [["government", "autocracy", "monarchy"], ["decline"]]
      };
      mismatchFilter(partialMatchingGroup, model).should.equal(0);
    });
  });

  describe("partialBonus and fullBonus", () => {
    const model = {
      tags: [["government", "monarchy", "constitutional"], ["war", "civil"]]
    };

    const partialMatchingGroup = {
      tags: [["government", "monarchy"]]
    };

    const mismatchingGroup = {
      tags: [["government", "republic"]]
    };

    const unrelatedGroup = {
      tags: [["economy", "export"]]
    };

    const fullMatchingGroup = {
      tags: [["government", "monarchy", "constitutional"]]
    };

    const multiMatchingGroup = {
      tags: [["government", "monarchy"], ["war"]]
    };

    const partialBonus = filters.partialBonus(1, false);

    it("returns 0 on no partial match", () => {
      partialBonus(model, mismatchingGroup).should.equal(0);
      partialBonus(model, unrelatedGroup).should.equal(0);
      partialBonus(model, fullMatchingGroup).should.equal(0);
    });

    it("returns 1 on a partial match", () => {
      partialBonus(model, partialMatchingGroup).should.equal(1);
    });

    it("allows the bonus value to be configured", () => {
      const bigPartialBonus = filters.partialBonus(2);
      bigPartialBonus(model, partialMatchingGroup).should.equal(2);
    });

    it("only counts one match by default", () => {
      partialBonus(model, multiMatchingGroup).should.equal(1);
    });

    it("can be created in cumulative mode", () => {
      const cumulativeBonus = filters.partialBonus(1, true);
      const bigCumulativeBonus = filters.partialBonus(2, true);
      cumulativeBonus(model, multiMatchingGroup).should.equal(2);
      bigCumulativeBonus(model, multiMatchingGroup).should.equal(4);
    });

    it("returns 1 on a full match", () => {
      const fullBonus = filters.fullBonus(1);
      fullBonus(model, fullMatchingGroup).should.equal(1);
    });
  });
});
