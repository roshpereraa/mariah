/**
 * Site-wide configuration.
 *
 * MUSIC SOURCES — tried in order, first one that actually produces sound wins:
 *
 *  1. `localTrack`  A file you own/licensed, dropped into /audio.
 *                   Nothing is committed there by default: the 1994 recording of
 *                   "All I Want for Christmas Is You" is copyrighted, so it is not
 *                   redistributed in this repo. Drop your own copy in and it plays.
 *  2. `youtubeIds`  The official uploads, played through YouTube's embed player —
 *                   the licensed way to stream the real record on a site. Tried in
 *                   order, so if one is pulled or blocked the next is used.
 *  3. Procedural    An original Web Audio sleigh-bell arrangement generated in the
 *                   browser. No file, no network, no rights issues — this is the
 *                   guaranteed floor, so there is always music on open.
 *
 * Whichever wins, it loops forever and a watchdog restarts it if it ever stalls.
 */
export const CONFIG = {
  localTrack: 'audio/all-i-want-for-christmas-is-you.mp3',

  /**
   * Official MariahCareyVEVO uploads, verified via YouTube's oEmbed endpoint.
   *   yXQViqx6GMY — "All I Want For Christmas Is You (Official Video)"
   *   aAkMkVFwAoo — "All I Want for Christmas Is You (Make My Wish Come True Edition)"
   * Each is tried in turn until one actually reaches the PLAYING state.
   */
  youtubeIds: ['yXQViqx6GMY', 'aAkMkVFwAoo'],
  useYouTube: true,

  // How long to give one video to start before trying the next (ms).
  youtubeTimeout: 5000,

  // If it has not started unmuted by now, retry muted — browsers always allow
  // muted autoplay, and unmuting an already-playing video is permitted.
  youtubeMutedRescueAfter: 2200,

  // How often the watchdog checks that music is still actually playing (ms).
  watchdogInterval: 4000,

  defaultVolume: 0.55,

  trackTitle: 'All I Want for Christmas Is You',
  trackArtist: 'Mariah Carey',

  storagePrefix: 'aiwfciy:',
};
