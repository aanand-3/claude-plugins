# Wada colour combinations

`colors.json` holds the colour data from Sanzo Wada's *A Dictionary of Color Combinations* (Vol. 1; Seigensha Art): 159 colours and 348 combinations of 2–4 colours. Each entry has `name`, `hex`, `lab`, `swatch` (the chapter) and `combinations` (the ids of the combinations it belongs to).

- **Source:** https://github.com/mattdesl/dictionary-of-colour-combinations (MIT, © 2020 Matt DesLauriers; see `LICENSE.md`). The data was first compiled by Dain M. Blodorn Kim (dblodorn/sanzo-wada). This copy keeps only the fields the scripts use.
- Only colour values and names are included. No pages, text or images from the book.
- **Vol. 2** has no open dataset. A project can add combinations from its own copy of the book in `docs/design/palettes-extra.json`:
  ```json
  [{"id": "v2-12", "names": ["Colour A", "Colour B", "Colour C"], "colors": ["#aabbcc", "#ddeeff", "#112233"]}]
  ```
  `wada.py` picks these up automatically.
