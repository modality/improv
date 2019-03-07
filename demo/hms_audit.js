import _ from 'lodash';
import hms from './hms_core.js';

function runGen() {
  hms.generator.gen('root', hms.newModel());
}

_.times(1000, runGen);

const auditResults = hms.generator.phraseAudit;
const sortedSnippets = [];

auditResults.forEach((_, key) => {
  sortedSnippets.push(key);
});

sortedSnippets.sort();

sortedSnippets.forEach(snippet => {
  console.log(snippet);
  const currentSnippet = auditResults.get(snippet);
  const phraseList = [];
  currentSnippet.forEach((_, phrase) => {
    phraseList.push(phrase);
  });
  phraseList
    .sort((a, b) => {
      const aVal = currentSnippet.get(a);
      const bVal = currentSnippet.get(b);

      if (aVal > bVal) return -1;
      if (bVal > aVal) return 1;
      return 0;
    })
    .forEach(phrase => {
      console.log(`\t${phrase} :: ${currentSnippet.get(phrase)}`);
    });
});
