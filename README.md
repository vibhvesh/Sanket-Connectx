# Sanket PTT Web Client

Independent browser frontend for the existing Sanket relay.

- Hosting target: GitHub Pages
- Relay: https://relay.canberravision.com
- Stack: plain HTML, CSS, and JavaScript
- No relay installation or server-side database is included.
- Session audio is designed to remain in browser memory only.
- Transcription integration is reserved for a future API.

## Important integration status

The UI scaffold is in place, but relay login, channel listing, and audio/PTT transport are deliberately not guessed or enabled. Confirm the relay's existing API routes, authentication response, channel response, and browser audio protocol before implementing the adapter in `js/relay.js` and `js/ptt.js`.

Do not put passwords, API secrets, or long-lived credentials in `config.js` or other public frontend files.

## GitHub Pages

In repository Settings → Pages, select **Deploy from a branch**, choose **main** and **/(root)**, then save.
