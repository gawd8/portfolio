import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';
import scrollama from 'https://cdn.jsdelivr.net/npm/scrollama@3.2.0/+esm';

let commits = [];
let filteredCommits = [];
let xScale;
let yScale;
let timeScale;
let commitProgress = 100;
let commitMaxTime;
let svg;
let dots;
let brush;
let brushGroup;
const colors = d3.scaleOrdinal(d3.schemeTableau10);
const width = 1000;
const height = 600;
const margin = { top: 10, right: 20, bottom: 40, left: 55 };
const usableArea = {
  left: margin.left,
  right: width - margin.right,
  top: margin.top,
  bottom: height - margin.bottom,
  width: width - margin.left - margin.right,
  height: height - margin.top - margin.bottom,
};

async function loadData() {
  return d3.csv('loc.csv', (row) => ({
    ...row,
    line: Number(row.line),
    depth: Number(row.depth),
    length: Number(row.length),
    date: new Date(row.date + 'T00:00' + row.timezone),
    datetime: new Date(row.datetime),
  }));
}

function processCommits(data) {
  return d3.groups(data, (d) => d.commit)
    .map(([id, lines]) => {
      const first = lines[0];
      return {
        id,
        url: `https://github.com/gawd8/portfolio/commit/${id}`,
        author: first.author,
        date: first.date,
        time: first.time,
        timezone: first.timezone,
        datetime: first.datetime,
        hourFrac: first.datetime.getHours() + first.datetime.getMinutes() / 60,
        totalLines: lines.length,
        lines,
      };
    })
    .sort((a, b) => a.datetime - b.datetime);
}

function renderCommitInfo(visibleCommits) {
  const lines = visibleCommits.flatMap((d) => d.lines);
  const values = [
    ['Total LOC', lines.length],
    ['Total commits', visibleCommits.length],
    ['Total files', new Set(lines.map((d) => d.file)).size],
    ['Maximum depth', d3.max(lines, (d) => d.depth) ?? 0],
    ['Average line length', d3.mean(lines, (d) => d.length)?.toFixed(1) ?? '0'],
  ];
  const dl = d3.select('#stats').selectAll('dl.stats').data([null]).join('dl')
    .attr('class', 'stats');
  const entries = dl.selectAll('div.stat').data(values, (d) => d[0])
    .join((enter) => {
      const div = enter.append('div').attr('class', 'stat');
      div.append('dt');
      div.append('dd');
      return div;
    });
  entries.select('dt').text((d) => d[0]);
  entries.select('dd').text((d) => d[1]);
}

function renderTooltipContent(commit) {
  document.getElementById('commit-link').href = commit.url;
  document.getElementById('commit-link').textContent = commit.id.slice(0, 8);
  document.getElementById('commit-date').textContent = commit.datetime.toLocaleString('en-US', {
    dateStyle: 'full', timeStyle: 'short',
  });
}

function updateTooltipVisibility(visible) {
  document.getElementById('commit-tooltip').hidden = !visible;
}

function updateTooltipPosition(event) {
  const tooltip = document.getElementById('commit-tooltip');
  tooltip.style.left = `${event.clientX + 12}px`;
  tooltip.style.top = `${event.clientY + 12}px`;
}

function renderScatterPlot() {
  svg = d3.select('#chart').append('svg')
    .attr('viewBox', `0 0 ${width} ${height}`)
    .style('overflow', 'visible');

  xScale = d3.scaleTime().range([usableArea.left, usableArea.right]);
  yScale = d3.scaleLinear().domain([0, 24])
    .range([usableArea.bottom, usableArea.top]);

  svg.append('g').attr('class', 'gridlines')
    .attr('transform', `translate(${usableArea.left}, 0)`)
    .call(d3.axisLeft(yScale).tickFormat('').tickSize(-usableArea.width));
  svg.append('g').attr('class', 'x-axis')
    .attr('transform', `translate(0, ${usableArea.bottom})`);
  svg.append('g').attr('class', 'y-axis')
    .attr('transform', `translate(${usableArea.left}, 0)`)
    .call(d3.axisLeft(yScale)
      .tickFormat((d) => String(d % 24).padStart(2, '0') + ':00'));
  dots = svg.append('g').attr('class', 'dots');

  brush = d3.brush().extent([
    [usableArea.left, usableArea.top],
    [usableArea.right, usableArea.bottom],
  ]).on('start brush end', brushed);
  brushGroup = svg.append('g').attr('class', 'brush').call(brush);
  dots.raise();
}

function updateScatterPlot(visibleCommits) {
  if (!visibleCommits.length) {
    dots.selectAll('circle').remove();
    return;
  }
  const extent = d3.extent(visibleCommits, (d) => d.datetime);
  if (+extent[0] === +extent[1]) {
    extent[0] = new Date(+extent[0] - 86400000);
  }
  xScale.domain(extent).nice();
  const maxLines = d3.max(visibleCommits, (d) => d.totalLines) ?? 1;
  const rScale = d3.scaleSqrt().domain([0, maxLines]).range([2, 30]);

  svg.select('.x-axis').call(d3.axisBottom(xScale));
  const sorted = d3.sort(visibleCommits, (d) => -d.totalLines);
  dots.selectAll('circle')
    .data(sorted, (d) => d.id)
    .join('circle')
    .attr('cx', (d) => xScale(d.datetime))
    .attr('cy', (d) => yScale(d.hourFrac))
    .attr('r', (d) => rScale(d.totalLines))
    .attr('fill', 'steelblue')
    .style('fill-opacity', 0.7)
    .on('mouseenter', (event, commit) => {
      d3.select(event.currentTarget).style('fill-opacity', 1);
      renderTooltipContent(commit);
      updateTooltipVisibility(true);
      updateTooltipPosition(event);
    })
    .on('mousemove', updateTooltipPosition)
    .on('mouseleave', (event) => {
      d3.select(event.currentTarget).style('fill-opacity', 0.7);
      updateTooltipVisibility(false);
    });
  // Reapply brush highlighting using the current scales.
  brushed({ selection: d3.brushSelection(brushGroup.node()) });
}

function isCommitSelected(selection, commit) {
  if (!selection) return false;
  const [[x0, y0], [x1, y1]] = selection;
  const x = xScale(commit.datetime);
  const y = yScale(commit.hourFrac);
  return x >= x0 && x <= x1 && y >= y0 && y <= y1;
}

function brushed(event) {
  const selection = event.selection;
  dots.selectAll('circle')
    .classed('selected', (commit) => isCommitSelected(selection, commit));
  const selectedCommits = selection
    ? filteredCommits.filter((d) => isCommitSelected(selection, d)) : [];
  document.getElementById('selection-count').textContent =
    `${selectedCommits.length || 'No'} commits selected`;
  renderLanguageBreakdown(selectedCommits);
}

function renderLanguageBreakdown(selectedCommits) {
  const container = d3.select('#language-breakdown');
  const lines = selectedCommits.flatMap((d) => d.lines);
  const breakdown = Array.from(d3.rollup(lines, (v) => v.length, (d) => d.type));
  const groups = container.selectAll('div.language').data(breakdown, (d) => d[0])
    .join((enter) => {
      const div = enter.append('div').attr('class', 'language');
      div.append('dt');
      div.append('dd');
      return div;
    });
  groups.select('dt').text((d) => d[0]);
  groups.select('dd').text((d) =>
    `${d[1]} lines (${d3.format('.1~%')(d[1] / lines.length)})`);
}

function updateFileDisplay(visibleCommits) {
  const lines = visibleCommits.flatMap((d) => d.lines);
  const files = d3.groups(lines, (d) => d.file)
    .map(([name, fileLines]) => ({ name, lines: fileLines }))
    .sort((a, b) => b.lines.length - a.lines.length);

  const fileRows = d3.select('#files').selectAll('div.file')
    .data(files, (d) => d.name)
    .join((enter) => {
      const div = enter.append('div').attr('class', 'file');
      const dt = div.append('dt');
      dt.append('code');
      dt.append('small');
      div.append('dd');
      return div;
    });
  fileRows.order();
  fileRows.select('dt code').text((d) => d.name);
  fileRows.select('dt small').text((d) => `${d.lines.length} lines`);
  fileRows.select('dd').selectAll('div.loc')
    .data((d) => d.lines, (line, i) => `${line.commit}-${line.line}-${i}`)
    .join('div')
    .attr('class', 'loc')
    .style('--color', (d) => colors(d.type))
    .attr('title', (d) => `${d.type} — ${d.file}:${d.line}`);
}

function setCommitMaxTime(date, { syncSlider = true } = {}) {
  commitMaxTime = date;
  if (syncSlider) {
    commitProgress = timeScale(date);
    document.getElementById('commit-progress').value = commitProgress;
  }
  document.getElementById('commit-time').textContent = date.toLocaleString('en-US', {
    dateStyle: 'long', timeStyle: 'short',
  });
  filteredCommits = commits.filter((d) => d.datetime <= commitMaxTime);
  renderCommitInfo(filteredCommits);
  updateScatterPlot(filteredCommits);
  updateFileDisplay(filteredCommits);
}

function onTimeSliderChange() {
  commitProgress = Number(document.getElementById('commit-progress').value);
  setCommitMaxTime(timeScale.invert(commitProgress), { syncSlider: false });
}

function renderStory() {
  const steps = d3.select('#scatter-story').selectAll('.step')
    .data(commits, (d) => d.id)
    .join('div')
    .attr('class', 'step');
  steps.each(function(commit, i) {
    const article = d3.select(this);
    article.selectAll('*').remove();
    article.append('p').text(`On ${commit.datetime.toLocaleString('en-US', {
      dateStyle: 'full', timeStyle: 'short',
    })},`);
    article.append('p')
      .append('a')
      .attr('href', commit.url)
      .attr('target', '_blank')
      .attr('rel', 'noopener noreferrer')
      .text(i === 0 ? 'I made my first commit!' : 'I made another commit!');
    article.append('p').text(
      `I edited ${commit.totalLines} lines across ${new Set(commit.lines.map((d) => d.file)).size} files.`
    );
  });
}

const data = await loadData();
commits = processCommits(data);
if (commits.length === 0) {
  throw new Error('No commits found in meta/loc.csv');
}
filteredCommits = commits;
timeScale = d3.scaleTime()
  .domain(d3.extent(commits, (d) => d.datetime))
  .range([0, 100]);
renderScatterPlot();
renderStory();
document.getElementById('commit-progress')
  .addEventListener('input', onTimeSliderChange);
setCommitMaxTime(timeScale.invert(commitProgress));

const scroller = scrollama();
scroller.setup({ container: '#scrolly-1', step: '#scrolly-1 .step', offset: 0.5 })
  .onStepEnter(({ element }) => {
    d3.selectAll('#scatter-story .step').classed('active', false);
    d3.select(element).classed('active', true);
    setCommitMaxTime(element.__data__.datetime);
  });
window.addEventListener('resize', () => scroller.resize());
