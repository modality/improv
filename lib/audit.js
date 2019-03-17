export default class Audit {
  constructor(snippets) {
    this.data = new Map();

    for (const key in snippets) {
      this.data.set(key, new Map());
      for (const group of snippets[key].groups) {
        for (const phrase of group.phrases) {
          this.data.get(key).set(phrase, 0);
        }
      }
    }
  }

  incrementPhrase = (snippet, chosenPhrase) => {
    const phraseTotal = this.data.get(snippet).get(chosenPhrase);
    this.data.get(snippet).set(chosenPhrase, phraseTotal + 1);
  };
}
