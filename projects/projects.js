import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';
import { fetchJSON, renderProjects } from '../global.js';

const projects = await fetchJSON('../lib/projects.json');

const projectsContainer = document.querySelector('.projects');

renderProjects(projects, projectsContainer, 'h2');

const projectsTitle = document.querySelector('.projects-title');

if (projectsTitle) {
  projectsTitle.textContent = `${projects.length} Projects`;
}

let arcGenerator = d3.arc().innerRadius(0).outerRadius(50);
let selectedIndex = -1;

function renderPieChart(projectsGiven) {

  let rolledData = d3.rollups(
    projectsGiven,
    (v) => v.length,
    (d) => d.year,
  );

  let data = rolledData.map(([year, count]) => {
    return { value: count, label: year };
  });

  let sliceGenerator = d3.pie().value((d) => d.value);
  let arcData = sliceGenerator(data);
  let arcs = arcData.map((d) => arcGenerator(d));
    d3.select('#projects-pie-plot').selectAll('path').remove();
    d3.select('.legend').selectAll('li').remove();

  let colors = d3.scaleOrdinal(d3.schemeTableau10);
    arcs.forEach((arc, idx) => {
      d3.select('#projects-pie-plot')
        .append('path')
        .attr('d', arc)
        .attr('fill', colors(idx))
        .on('click', () => {
          selectedIndex = selectedIndex === idx ? -1 : idx;
          if (selectedIndex === -1) {
            renderProjects(searchedProjects, projectsContainer, 'h2');
          } else {
            let selectedYear = data[selectedIndex].label;

            let filteredProjects = searchedProjects.filter(
              (project) => String(project.year) === String(selectedYear)
            );

            renderProjects(filteredProjects, projectsContainer, 'h2');
          }

          d3.select('#projects-pie-plot')
            .selectAll('path')
            .classed('selected', (_, i) => i === selectedIndex);

          d3.select('.legend')
            .selectAll('li')
            .classed('selected', (_, i) => i === selectedIndex);

        });
    });

  let legend = d3.select('.legend');
  data.forEach((d, idx) => {
    legend
      .append('li')
      .attr('style', `--color:${colors(idx)}`)
      .html(`<span class="swatch"></span> ${d.label} <em>(${d.value})</em>`);
  });

}

renderPieChart(projects);

let query = '';
let searchedProjects = projects;

let searchInput = document.querySelector('.searchBar');

searchInput.addEventListener('input', (event) => {
  query = event.target.value;

  searchedProjects = projects.filter((project) => {
    let values = Object.values(project).join('\n').toLowerCase();
    return values.includes(query.toLowerCase());
  });

  renderProjects(searchedProjects, projectsContainer, 'h2');
  renderPieChart(searchedProjects);
});