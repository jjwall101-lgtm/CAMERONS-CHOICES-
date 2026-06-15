# Camerons Behaviour - Child Friendly Local Version

This version saves only on the phone or browser that is using it.

It has:
- A more child-friendly design
- Softer wording
- Red / amber / green traffic light
- Local save history

## Files to upload to GitHub

Upload these files to the root of your GitHub repo:

- index.html
- style.css
- script.js
- manifest.json
- icon.svg

## GitHub Pages

Use:

Settings > Pages > Deploy from branch > main > /root

## Tweaking the words

Open `script.js` and edit this section:

const messages = {
  red: {
    main: "Red: Tricky choices",
    sub: "Today was hard. No treat today, but we can repair it and try again tomorrow."
  }
}
