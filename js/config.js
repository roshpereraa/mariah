/**
 * Site-wide configuration.
 *
 * MUSIC SOURCES — tried in order, first one that actually produces sound wins:
 *
 *  1. `localTrack`  A file you own/licensed, dropped into /audio.
 *                   Nothing is committed there by default: the 1994 recording of
 *                   "All I Want for Christmas Is You" is copyrighted, so it is not
 *                   redistributed in this repo. Drop your own copy in and it plays.
 *  2. `youtubeId`   The official upload, played through YouTube's embed player —
 *                   the licensed way to stream the real record on a site.
 *                   Swap the ID if you want a different official upload.
 *  3. Procedural    An original Web Audio sleigh-bell arrangement generated in the
 *                   browser. No file, no network, no rights issues — this is the
 *                   guaranteed floor, so there is always music on open.
 */
export const CONFIG = {
  localTrack: 'audio/all-i-want-for-christmas-is-you.mp3',

  // Official "All I Want for Christmas Is You" upload (Make My Wish Come True Edition).
  youtubeId: 'qLyQdJQNhSQ',
  useYouTube: true,

  // How long to give YouTube before falling back to the procedural track (ms).
  youtubeTimeout: 6500,

  defaultVolume: 0.55,

  trackTitle: 'All I Want for Christmas Is You',
  trackArtist: 'Mariah Carey',

  storagePrefix: 'aiwfciy:',
};
