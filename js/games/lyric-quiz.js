/**
 * Mistletoe Trivia — six questions pulled from a pool, on the song and
 * the lyrics everyone already knows by heart.
 */

import { el, shuffle } from '../ui.js';
import { sfx } from '../sfx.js';
import { makeHud, resultScreen } from './common.js';

const PER_ROUND = 6;
const POINTS = 100;

/** `a` is always the correct answer; options get shuffled at render time. */
const POOL = [
  {
    q: 'Which Mariah Carey album did "All I Want for Christmas Is You" first appear on?',
    a: 'Merry Christmas',
    wrong: ['Music Box', 'Daydream', 'Butterfly'],
    note: 'Her fourth studio album, released in October 1994.',
  },
  {
    q: 'Who co-wrote and co-produced the song with Mariah?',
    a: 'Walter Afanasieff',
    wrong: ['Babyface', 'David Foster', 'Jermaine Dupri'],
    note: 'A long-running Carey collaborator through the 1990s.',
  },
  {
    q: 'In which year did the song finally hit No. 1 on the Billboard Hot 100?',
    a: '2019',
    wrong: ['1994', '2005', '2021'],
    note: 'Twenty-five years after it was released. Patience pays.',
  },
  {
    q: 'Complete the line: "I won’t even wish for …"',
    a: 'snow',
    wrong: ['a sleigh ride', 'presents', 'mistletoe'],
    note: '"I won’t ask for much this Christmas / I won’t even wish for snow."',
  },
  {
    q: 'Where is she "just gonna keep on waiting"?',
    a: 'Underneath the mistletoe',
    wrong: ['By the fireplace', 'Beside the Christmas tree', 'Out in the snow'],
    note: 'The most famous waiting spot in pop music.',
  },
  {
    q: 'According to the lyrics, what will Santa Claus NOT make her happy with?',
    a: 'A toy on Christmas Day',
    wrong: ['A card in the post', 'A ride in his sleigh', 'A stocking of sweets'],
    note: '"Santa Claus won’t make me happy / With a toy on Christmas Day."',
  },
  {
    q: 'In the second verse, what does she say fills the air?',
    a: 'The sound of children’s laughter',
    wrong: ['The smell of cinnamon', 'The ringing of sleigh bells', 'A choir of angels'],
    note: '"…and the sound of children’s laughter fills the air."',
  },
  {
    q: 'Which 2003 Christmas film closes with a schoolgirl belting the song?',
    a: 'Love Actually',
    wrong: ['Elf', 'The Holiday', 'Bad Santa'],
    note: 'Olivia Olson’s nativity-play showstopper.',
  },
  {
    q: 'What is Mariah’s widely used festive nickname?',
    a: 'Queen of Christmas',
    wrong: ['Duchess of December', 'Mrs Claus', 'Lady Tinsel'],
    note: 'Defended annually, from 1 November onwards.',
  },
  {
    q: 'What was the 2019 re-release of the music video called?',
    a: 'Make My Wish Come True Edition',
    wrong: ['Snow Globe Edition', 'Silver Bells Edition', 'Diamond Sleigh Edition'],
    note: 'Named after a line from the chorus.',
  },
];

export default {
  id: 'lyric-quiz',
  name: 'Mistletoe Trivia',
  emoji: '\u{1F3B5}',
  blurb: 'Six questions on the song that owns December — the writing, the chart run, and the lines you have been singing wrong since 1994.',
  scoreLabel: 'points',

  mount(root, host) {
    const questions = shuffle(POOL).slice(0, PER_ROUND);
    let index = 0, correct = 0, score = 0, answered = false;

    const hud = makeHud([
      { key: 'score', label: 'score', value: 0 },
      { key: 'q', label: `of ${PER_ROUND}`, value: 1 },
      { key: 'best', label: 'best', value: host.best },
    ]);

    const qText = el('h3', { class: 'quiz__q' });
    const opts = el('div', { class: 'quiz__opts' });
    const feedback = el('p', { class: 'quiz__feedback' });
    const wrap = el('div', { class: 'quiz' }, hud.node, qText, opts, feedback);
    root.replaceChildren(wrap);

    function render() {
      answered = false;
      const item = questions[index];
      hud.set('q', index + 1);
      qText.textContent = item.q;
      feedback.textContent = '';

      const choices = shuffle([item.a, ...item.wrong]);
      opts.replaceChildren(...choices.map((choice) =>
        el('button', {
          class: 'quiz__opt', type: 'button',
          onclick: (e) => answer(e.currentTarget, choice, item),
        }, choice),
      ));
    }

    function answer(button, choice, item) {
      if (answered) return;
      answered = true;

      const right = choice === item.a;
      if (right) { correct += 1; score += POINTS; sfx.good(); }
      else sfx.bad();
      hud.set('score', score);

      [...opts.children].forEach((b) => {
        b.disabled = true;
        if (b.textContent === item.a) b.classList.add('is-right');
      });
      if (!right) button.classList.add('is-wrong');

      feedback.textContent = (right ? '✓ ' : '✗ ') + item.note;

      setTimeout(() => {
        index += 1;
        if (index < questions.length) render();
        else finish();
      }, 1700);
    }

    function finish() {
      const record = host.submit(score);
      if (correct === PER_ROUND) sfx.win(); else sfx.lose();
      qText.remove();
      opts.remove();
      feedback.remove();
      wrap.append(resultScreen({
        score: `${correct}/${PER_ROUND}`,
        line: correct === PER_ROUND
          ? `Flawless — ${score} points. You are the Queen of Christmas now.`
          : `${score} points. The mistletoe awaits another attempt.`,
        record,
        onReplay: () => host.restart(),
      }));
    }

    render();
    return () => {};
  },
};
