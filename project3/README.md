# Global Life Expectancy Explorer — DSC 209R Project 3

An interactive D3.js visualization of Gapminder life expectancy in **142 countries, 1952–2007**. This final project develops the research question and world choropleth concept from the Project 3 checkpoint presentation.

## Open and deploy

**GitHub Pages:** Put the contents of this folder in your GitHub repository's `portfolio/project3/` directory (not the enclosing zip), commit, and push. If GitHub Pages serves the repository root, visit `https://YOUR-USERNAME.github.io/portfolio/project3/`. If it serves a separate `docs/` directory, place the folder beneath that published root instead.

**Local preview:** From this folder, run `python3 -m http.server 8000`, then open `http://localhost:8000`. The site cannot load CSV/GeoJSON through a direct `file://` URL due to browser restrictions.

The two data files are hosted locally with the project. The D3 library and web fonts load from third-party CDNs; internet access is needed for D3.

## Interactions

1. Move the **year slider** through the 12 observed years; the map, summary statistics, vertical line-chart marker, and regional bars update.
2. Press **Play** to animate through the timeline.
3. **Hover** over a country for its name, year, continent, and exact life expectancy.
4. **Click** countries on the map to add/remove their trend lines. Up to three may be selected; adding a fourth replaces the oldest selected country.
5. Use the **continent dropdown** to focus and dim countries outside a region; clicking a regional bar also changes the filter.
6. Use **Find a country** to select any Gapminder country; remove selections via chips, or use Clear / Reset.

## Data definitions

- **Life expectancy:** Gapminder's `lifeExp`, measured in years at birth.
- **Median:** Median of individual country observations for the active year and continent filter.
- **Gap:** Maximum minus minimum country life expectancy for the active year and continent filter.
- **Regional mean:** Unweighted arithmetic mean across countries in each continent for that year.
- **Missing:** Countries outside the 142-country dataset are gray. Missing is not coded as zero.
- **Time:** 12 observed five-year time points, 1952 through 2007. No interpolation of underlying observations.
- **Color:** Continuous sequential scale fixed at 30 to 85 years for meaningful cross-year comparison.

## Data provenance and limitations

Gapminder dataset as distributed with Plotly Express (`plotly.express.data.gapminder()`), containing 1,704 country-year observations. These are **historical data**, and do not describe today's life expectancy. Country coverage is incomplete, country-level means are unweighted by population, and country area is not representative of population.

World geometry from the Natural Earth low-resolution dataset (via the `pyogrio` test fixture, simplified for web delivery). Map country codes and country names are reconciled where possible; a geographic boundary without a matching Gapminder record appears gray.

## Development / design rationale

Checkpoint explorations included multi-country line graphs, continent means, a country distribution histogram, highest/lowest countries, and a static world choropleth. The final concentrates on the map + connected trends + a compact regional comparison. Position along a shared scale is used for line values and bar lengths, sequential luminance for geographically ordered quantitative data, and consistent vertical axes across time. Map interactions do analytical work: country selection exposes temporal trajectories; the year scrubber changes cross-sectional patterns, and continent filtering scopes comparative summaries.

## Files

- `index.html` — page structure and data/writeup details
- `styles.css` — responsive visual design
- `app.js` — D3 joins, drawing, interaction, state management
- `data/gapminder.csv` — complete 142-country data
- `data/world.geojson` — simplified geographic boundaries

## Pre-submission checklist

- [ ] Test GitHub Pages URL in a private/incognito browser window.
- [ ] Confirm map fills, tooltips, year slider, play/pause, continent selection, country selection, chart updates and reset work.
- [ ] Confirm page renders correctly on laptop and phone widths.
- [ ] Confirm course/project title, data explanation, sources, rationale, and development process are displayed.
- [ ] Submit publicly accessible **Project 3 URL** to Canvas before the deadline.
