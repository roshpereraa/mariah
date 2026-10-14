# All I Want for Christmas Is You — a sleeve note

A fan tribute to Carey and Afanasieff's 1994 single, built as a record sleeve.
Side A is the song and the liner notes. Side B is five Christmas games. The
music plays throughout, a reindeer follows the pointer, and it snows.

The song is a deliberate pastiche of a 1963 Phil Spector Christmas record, so
the design follows it there: printed paper stock, flat spot colours, hard rules
instead of soft shadows, and the games set as an LP track listing rather than
as cards.

No build step, no framework, no dependencies. Plain ES modules, canvas and the
Web Audio API.

## What's in it

| | |
|---|---|
| **Music on open** | A three-tier source chain that always produces sound (see below) |
| **Reindeer cursor** | Hand-drawn SVG cursor with a glowing nose, a happier face while you hold a click, and a trail of magic dust |
| **Snowfall** | A few hundred canvas flakes with parallax depth and a wind that wanders |
| **Countdown** | Live counter to 25 December in the viewer's local time; on the day it becomes "It's tiiiime." |
| **Five games on side B** | Present Catch, Elf Patrol, Ornament Memory, The Whistle Note, Mistletoe Trivia |
| **High scores** | Kept per game in `localStorage`, printed beside each track like a duration |

### The games

- **Present Catch** — steer the sleigh with the pointer or arrow keys, gather
  the gifts, dodge the coal. Streaks pay a bonus; it speeds up as you go.
- **Elf Patrol** — whack-an-elf in the snowdrifts. Bop the elves, spare the
  imps, leave the wrapped gifts alone.
- **Ornament Memory** — sixteen baubles, eight pairs. Fewer moves, higher score.
- **The Whistle Note** — hold to climb, release to fall, keep the needle inside
  the moving golden band.
- **Mistletoe Trivia** — six questions drawn from a pool of ten, on the song,
  its chart run and its lyrics.

## The music, and the licensing of it

The 1994 recording is copyrighted, so **no audio file is committed here**. The
player walks three sources in order and uses the first that actually produces
sound:

1. **A local file you own.** Drop a licensed copy at
   `audio/all-i-want-for-christmas-is-you.mp3` and it plays. That path is
   gitignored, so your copy stays on your machine.
2. **YouTube's embed player.** The official MariahCareyVEVO uploads, streamed
   through the iframe API — the licensed route for playing the real record on
   a site. `js/config.js` holds an ordered list of video IDs and each is tried
   in turn, so one being pulled or region-blocked is not fatal. If the browser
   refuses unmuted autoplay it retries muted and unmutes once playing.
3. **An original Web Audio mix.** Sleigh bells, celesta chords, a walking bass
   and a glockenspiel melody, generated live in the browser over a doo-wop
   progression. Original music written for this site, so there is always
   something playing even with no file and no network.

Browsers block autoplay with sound, which is why the splash screen exists: one
click is the gesture that unlocks audio, and it starts everything at once.

Whichever source wins, it loops forever. A watchdog re-checks every few seconds
(and whenever you return to the tab) and restarts anything that ended, stalled
or got suspended in the background — but it never overrides a pause you asked
for. The generated mix runs its scheduler clock in a Web Worker, because
main-thread timers get throttled to roughly once a second in a background tab,
which would starve the audio graph.

## Running it locally

Any static server will do — ES modules need HTTP, not `file://`:

```bash
npm start              # serves on http://localhost:4173
# or
python3 -m http.server 4173
```

## Deploying

It is a static site; `vercel.json` sets clean URLs and cache headers. Vercel
needs no build command and no output directory — point it at the repo root.

## Layout

```
index.html            markup and the page shell
styles/
  base.css            spot colours, paper grain, type, buttons, the cursor
  layout.css          splash, masthead, sleeve front, liner notes, track
                      listing, colophon, dock
  games.css           modal stage, scoreboard, each game's chrome
js/
  config.js           music sources and tunables
  main.js             entry point — boots scenery, splash, dock, arcade
  audio.js            the three-tier music player
  procedural.js       the generated Christmas arrangement
  sfx.js              game sound effects, sharing the player's AudioContext
  snow.js  cursor.js  scenery
  ui.js  storage.js   element builder, toast, reveals, high scores
  arcade.js           the side-B track listing and the modal stage
  countdown.js        the counter, and the moment it flips over
  games/              one module per game, plus shared HUD helpers
assets/               reindeer cursor art and the favicon
audio/                where you drop your own licensed copy (gitignored)
```

## Accessibility and manners

Everything that moves honours `prefers-reduced-motion`. The music can be paused
from the dock or with the space bar. The game stage is a labelled modal that
closes on <kbd>Esc</kbd> and restores focus. Games work with pointer, touch and
keyboard.

## Credits

An unofficial fan tribute. *All I Want for Christmas Is You* was written by
Mariah Carey and Walter Afanasieff; all rights in the song and the recording
belong to their respective owners. This site is not affiliated with, endorsed by
or connected to Mariah Carey or her labels.
