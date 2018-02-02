var reverse = require('reverse-string');

function newTrie() {
    return {count: 1, nonce: 0, children: new Map()};
}

function add(options, trie, s, start) {
    for (let start = 0; start < s.length; start++) {
        if (options.isLetter && !options.isLetter(s[start])) {
            continue;
        }
        let current = trie;
        for (var end = start + 1; options.maxLength ? end - start <= options.maxLength : true; end++) {
            current.count++;
            const c = s[end - 1];
            if (!current.children.get(c)) {
                current.children.set(c, newTrie());
            }
            current = current.children.get(c);
            if (end === s.length || (options.isletter && !isLetter(s[end]))) {
                current.count++;
                current.nonce++;
                break;
            }
        }
    }
}

// Here length should be >= 1
function forwardVbe(trie, s) {
    for (let i = 0; i < s.length - 1; i++) {
        trie = trie.children.get(s[i]);
    }
    return trie.children.get(s[s.length - 1]).entropy - trie.entropy;
}

function vbe(corpus, s) {
    return forwardVbe(corpus.forwardTrie, s) + forwardVbe(corpus.reverseTrie, reverse(s));
}

function wordScore(corpus, word) {
    try {
        return (vbe(corpus, word) - corpus.meanVbe.get(word.length)) * word.length;
    } catch (e) {
        console.error('failed', '"' + word + '"');
        throw e;
    }
}


function segment(options, corpus, text) {
    const segments = [];
    let index = 0;
    while (index < text.length) {
        const segmentStart = index;
        while (index < text.length && (!options.isLetter || options.isLetter(text[index]))) {
            index++;
        }
        const segmentEnd = index;

        const dpScore = [0];
        const dpPrev = [-1];
        for (let end = 1; end <= segmentEnd - segmentStart; end++) {
            let best = null, bestScore = null;
            for (let start = options.maxLength ? Math.max(0, end - options.maxLength) : 0; start < end; start++) {
                const word = text.substring(segmentStart + start, segmentStart + end);
                if (options.isWord && !options.isWord(word)) {
                    continue;
                }
                const score = wordScore(corpus, word);
                const prevScore = dpScore[start];
                if (best == null || score + prevScore > bestScore) {
                    best = start;
                    bestScore = score + prevScore;
                }
            }
            if (best == null) {
                throw new Error('Could not split: "' + text.substring(segmentStart, segmentEnd) + '"');
            }
            dpScore.push(bestScore);
            dpPrev.push(best);
        }
        const words = [];
        let end = segmentEnd - segmentStart;
        while (end > 0) {
            words.push(text.substring(segmentStart + dpPrev[end], segmentStart + end));
            end = dpPrev[end];
        }
        words.reverse();
        segments.push(words);

        while (index < text.length && options.isLetter && !options.isLetter(text[index])) {
            index++;
        }
        if (index < text.length || index > segmentEnd) {
            segments.push(text.substring(segmentEnd, index));
        }
    }
    return segments;
}

function createCorpus(options, corpusText) {
    const totalVbe = new Map();
    const stringCount = new Map();

    function calculateEntropies(trie, length, parentEntropy) {
        const nonceP = 1 / trie.count;
        trie.entropy = trie.nonce * (-nonceP * Math.log(nonceP));
        for (let child of trie.children.values()) {
            const p = child.count / trie.count;
            trie.entropy += -p * Math.log(p);
        }
        for (let child of trie.children.values()) {
            calculateEntropies(child, length + 1, trie.entropy);
        }
        if (!stringCount.get(length)) {
            stringCount.set(length, 0);
            totalVbe.set(length, 0);
        }
        stringCount.set(length, stringCount.get(length) + trie.count);
        totalVbe.set(length, totalVbe.get(length) + (trie.entropy - parentEntropy) * trie.count);
    }

    const forwardTrie = newTrie();
    const reverseTrie = newTrie();

    add(options, forwardTrie, corpusText, 0);
    add(options, reverseTrie, reverse(corpusText), 0);

    calculateEntropies(forwardTrie, 0, 0);
    calculateEntropies(reverseTrie, 0, 0);

    const meanVbe = new Map();
    for (let [length, vbe] of totalVbe.entries()) {
        meanVbe.set(length, vbe / stringCount.get(length));
    }

    return {forwardTrie, reverseTrie, meanVbe};
}

module.exports = {createCorpus, segment};
