# Unsupervised text segmentation

A [text segmentation](https://en.wikipedia.org/wiki/Text_segmentation) library
based on [Magistry, Pierre, and Benoît Sagot. "Unsupervized word segmentation:
the case for mandarin chinese."](http://www.aclweb.org/anthology/P12-2075).

Although this module was developed for Chinese, it is generic and can be used
for segmenting any language; all that's needed is a sufficiently large corpus.

Example usage:

```
// CJK characters
function isLetter(c) {
    return /[\u4E00-\uFA29]/.test(c);
}
const options = {isLetter, maxLength: 20};

const {createCorpus, segment} = require('unsupervised-text-segmenter');

const corpus = createCorpus(options, fs.readFileSync('corpus.txt', 'utf-8'));
const segments = segment(options, corpus, fs.readFileSync('file_to_segment.txt', 'utf-8'));

for (let s of segments) {
    if (Array.isArray(s)) {
        // array of segmented words
    } else {
        // non-word characters
    }
}
```
