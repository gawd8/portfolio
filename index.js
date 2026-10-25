import { fetchJSON, renderProjects, fetchGitHubData } from './global.js';

// Fetch all projects from the JSON file
const projects = await fetchJSON('./lib/projects.json');

// Select the first three projects
const latestProjects = projects.slice(0, 3);

// Find the container on the homepage
const projectsContainer = document.querySelector('.projects');

// Display the three projects
renderProjects(latestProjects, projectsContainer, 'h2');

// Fetch GitHub profile data
const githubData = await fetchGitHubData('gawd8');

const profileStats = document.querySelector('#profile-stats');

if (profileStats && githubData) {
  profileStats.innerHTML = `
    <dl>
      <dt>Public Repos:</dt>
      <dd>${githubData.public_repos}</dd>

      <dt>Public Gists:</dt>
      <dd>${githubData.public_gists}</dd>

      <dt>Followers:</dt>
      <dd>${githubData.followers}</dd>

      <dt>Following:</dt>
      <dd>${githubData.following}</dd>
    </dl>
  `;
}