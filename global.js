
console.log("IT'S ALIVE!");

function $$(selector, context = document) {
    return Array.from(context.querySelectorAll(selector));
}


const BASE_PATH =
    location.hostname === "localhost" ||
    location.hostname === "127.0.0.1"
        ? "/"
        : "/portfolio/";

let pages = [
    { url: "", title: "Home" },
    { url: "projects/", title: "Projects" },
    { url: "contact/", title: "Contact" },
    { url: "https://github.com/gawd8", title: "GitHub" },
    { url: "resume/", title: "Resume" }
];

let nav = document.createElement("nav");
document.body.prepend(nav);

for (let p of pages) {
    let url = p.url;
    let title = p.title;

    if (!url.startsWith("http")) {
        url = BASE_PATH + url;
    }

    let a = document.createElement("a");
    a.href = url;
    a.textContent = title;

    function normalizePath(path) {
        return path.replace(/index\.html$/, "").replace(/\/$/, "") || "/";
    }

    if (
        a.host === location.host &&
        normalizePath(a.pathname) === normalizePath(location.pathname)
    ) {
        a.classList.add("current");
    }

    if (a.host !== location.host) {
        a.target = "_blank";
        a.rel = "noopener noreferrer";
    }

    nav.append(a);
}


document.body.insertAdjacentHTML(
    "afterbegin",
    `
    <label class="color-scheme">
        Theme:
        <select>
            <option value="light dark">Automatic</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
        </select>
    </label>
    `
);



const select = document.querySelector(".color-scheme select");

// Function to apply the selected theme
function setColorScheme(colorScheme) {
    document.documentElement.style.setProperty(
        "color-scheme",
        colorScheme
    );
}

// Restore saved theme when the page loads
if ("colorScheme" in localStorage) {
    const savedTheme = localStorage.colorScheme;

    setColorScheme(savedTheme);
    select.value = savedTheme;
}

// Save the user's preference when they change the theme
select.addEventListener("input", function (event) {
    const selectedTheme = event.target.value;

    setColorScheme(selectedTheme);

    localStorage.colorScheme = selectedTheme;

    console.log("Color scheme changed to:", selectedTheme);
});


const form = document.querySelector("form");

form?.addEventListener("submit", function (event) {
    event.preventDefault();

    const data = new FormData(form);

    let url = form.action + "?";

    for (let [name, value] of data) {
        url += `${name}=${encodeURIComponent(value)}&`;
    }

    // Remove the extra & at the end
    url = url.slice(0, -1);

    // Open the email application
    location.href = url;
});

export async function fetchJSON(url) {
  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to fetch projects: ${response.statusText}`);
    }

    const data = await response.json();
    return data;

  } catch (error) {
    console.error('Error fetching or parsing JSON data:', error);
  }
}

export function renderProjects(projects, containerElement, headingLevel = 'h2') {
  if (!containerElement) {
    console.error('Projects container not found.');
    return;
  }

  containerElement.innerHTML = '';

  if (!Array.isArray(projects)) {
    console.error('Projects data must be an array.');
    return;
  }

  if (!/^h[1-6]$/.test(headingLevel)) {
    headingLevel = 'h2';
  }

  for (const project of projects) {
    const article = document.createElement('article');

    article.innerHTML = `
      <${headingLevel}>${project.title}</${headingLevel}>
      <img src="${project.image}" alt="${project.title}">
      <p>${project.description}</p>
    `;

    containerElement.appendChild(article);
  }
}

export async function fetchGitHubData(username) {
  return fetchJSON(`https://api.github.com/users/${username}`);
}