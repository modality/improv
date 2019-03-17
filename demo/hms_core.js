import jetpack from "fs-jetpack";
import Improv from "./lib";

function loadSpec() {
  const spec = {};
  const snippetFiles = jetpack.find(`${__dirname}/hms_data`, {
    matching: "*.json"
  });
  snippetFiles.forEach(filename => {
    const snippet = jetpack.read(filename, "json");
    if (typeof snippet.groups === "undefined") {
      snippet.groups = [];
    }

    if (snippet.phrases) {
      snippet.groups.push({
        tags: [],
        phrases: snippet.phrases
      });
    }

    spec[snippet.name] = snippet;
  });
  return spec;
}

const shipMate = new Improv(loadSpec(), {
  filters: [
    Improv.filters.mismatchFilter(),
    Improv.filters.unmentioned(1),
    Improv.filters.partialBonus(),
    Improv.filters.fullBonus(),
    Improv.filters.dryness()
  ],
  persistence: false,
  reincorporate: true,
  audit: true
});

function newModel() {
  const model = {};
  // We generate the paragraph first so biases in the name corpus don't overly
  // affect ship characteristics.
  shipMate.gen("class", model);
  shipMate.gen("graph", model);
  return model;
}

export default function shipDesc() {
  return shipMate.gen("root", newModel());
}

shipDesc.generator = shipMate;
shipDesc.newModel = newModel;
