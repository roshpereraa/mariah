/** Every mini-game, in the order they appear in the arcade. */

import presentCatch from './present-catch.js';
import memoryMatch from './memory-match.js';
import whackAnElf from './whack-an-elf.js';
import whistleNote from './whistle-note.js';
import lyricQuiz from './lyric-quiz.js';

export const GAMES = [presentCatch, whackAnElf, memoryMatch, whistleNote, lyricQuiz];

export const byId = (id) => GAMES.find((g) => g.id === id);
