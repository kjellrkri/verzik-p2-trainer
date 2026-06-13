# Verzik Phase 2 Trainer

A customized, browser-based Verzik Phase 2 practice trainer. It runs entirely
in the browser and can be hosted free with GitHub Pages.

Based on the original trainer by
[lmperium2096](https://github.com/lmperium2096/lmperium2096.github.io/tree/master/verzik_trainer).
The original MIT license is included in `LICENSE.md`.

## Features

- Verzik movement and attack timing practice
- Scythe and whip modes
- Custom floor markers with labels and colors
- Bundled 22-tile default practice layout
- Preset color palette, last-used color, and full color wheel
- Optional true-tile indicator
- Optional game-tick metronome
- Optional unlimited HP
- Basic ranged poison pools
- Blue magic and crab special attacks

## Publish With GitHub Pages

1. Create a new empty GitHub repository.
2. Upload or push every file in this folder, including `.github`.
3. Name the default branch `main`.
4. Open the repository's **Settings > Pages**.
5. Under **Build and deployment**, choose **GitHub Actions**.
6. Open the **Actions** tab and wait for `Deploy GitHub Pages` to finish.

The site URL will be:

```text
https://YOUR-USERNAME.github.io/YOUR-REPOSITORY/
```

## Push From Git

From this folder:

```powershell
git init
git add .
git commit -m "Publish Verzik P2 trainer"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPOSITORY.git
git push -u origin main
```

## Local Preview

Any static HTTP server works. For example:

```powershell
python -m http.server 8080
```

Then open `http://localhost:8080`.
