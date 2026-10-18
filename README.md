# All Display and Resolution Options

A Civilization VII mod that restores the display choices the game hides or
clamps, as native options under the **Mods** category.

- **Resolution (all modes)**: every standard mode up to your panel's native size.
- **Global UI scale (50–200%)**: the engine's full range instead of the 50–125% clamp.
- **UI auto-scale toggle**: turn off the "zoomed in" auto-sizing.
- **Device-aware presets**: one-click Recommended / Maximum zoom-out / Game default.

All changes apply through the normal **Confirm** button on the Options screen.

## Compatibility

- Your choices are saved by the game itself, with its own display settings,
  outside the shared `modSettings` store.
- The mod carries the Tower Settings Keeper (`ui/settings-keeper.js`, since
  1.0.2). It runs before any other script and sends every mod's `localStorage`
  reads and writes through the one `modSettings` entry the game reads back
  correctly. At start-up it folds entries that would be read in its place into
  that entry and leaves any entry it can't identify where it is, so every mod's
  data is kept. That keeps the settings of the other mods you play with across
  a restart. If several mods carry it, or the standalone keeper is installed,
  the newest copy runs.
- The mod's own scripts are named `all-display-options*.js`, so they can't
  shadow another mod's options scripts.

## Civilopedia History Corrections

This mod also carries Civilopedia History Corrections, a text patch for
[Civilopedia Expanded: Independents](https://steamcommunity.com/sharedfiles/filedetails/?id=3815309882). With that mod
on, six East Asian history pages (Goguryeo, the Oirat, two Ryukyu pages, Nanzhao and Balhae) give each side where
historians in different countries disagree, and a few factual errors are fixed. With it off, the game's pages stay as
they are. The text is in `history-corrections/`, in English, Simplified Chinese and Traditional Chinese. Every Tower mod
that carries it writes the same text, so running several of them together is fine.

Those paragraphs were replaced because they didn't hold up. Some repeated Chinese state historiography as settled
fact, or recast a question most historians consider answered as still open. Some got basic dates and places wrong. And
the Oirat page called a genocide, the Qing destruction of most of the Dzungar people in 1755-1757, a "pacification."
I'm not leaving that in place. More corrections to Civilopedia Expanded may be added at any time, in any update.
Corrections may also be added for any other mod whose text I judge, in my sole discretion, to be bigoted,
genocide-denying or otherwise historically inaccurate. Running this mod alongside any of them means you accept those
replacements, including any added later. Switch this mod off and their pages read as their authors wrote them.

## Development

```sh
npm install      # one-time: eslint + typescript + c8
npm run verify   # tsc --noEmit + eslint + tests at 100% coverage + language check
./release.sh     # build dist/ + Steam Workshop manifest
```

The first Steam Workshop publish stores its `publishedfileid` in
`steam_workshop_id.txt`, so later uploads stay in update mode.

Author: Tower.

## License

Up to version 1.1.0 this mod was MIT, and copies of those versions stay MIT. Versions after 1.1.0 are under the Tower
Mod License 1.0 in [LICENSE](LICENSE), written in plain English.

You're welcome to play it, read the code to see how it works, and change your own copy for your own games. If you'd
like to reupload it, put parts of it in your own mod, or use it some other way, ask me first: open an issue here or
message Tower on Steam. `ui/settings-keeper.js` stays MIT so other mods can keep embedding it.

I don't want this mod's code, text or art used to train AI models, collected into AI training sets, or handed to AI
tools to copy into other projects, and the license doesn't allow it without my written permission. I also reserve the
rights to text and data mining of this work under Article 4(3) of the EU's Directive 2019/790.

Because the source is on GitHub, GitHub and its affiliates (Microsoft included) have their own license to it under
GitHub's Terms of Service, and since April 2026 that covers training their AI. Valve and Take-Two have the rights
their own terms give them. Sid Meier's Civilization VII and its assets belong to Firaxis Games and 2K. Material from
other people is listed in [LICENSE](LICENSE).
