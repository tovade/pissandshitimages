// Gallery page JavaScript functionality

document.addEventListener("DOMContentLoaded", function () {
  // Get current page from URL params
  const urlParams = new URLSearchParams(window.location.search);
  const currentPage = parseInt(urlParams.get("page")) || 1;

  // Load gallery data
  loadGalleryData(currentPage);
});

async function loadGalleryData(page = 1) {
  try {
    const response = await fetch(`/api/gallery?page=${page}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Failed to load gallery data");
    }

    // Update stats
    updateStats(data.stats);

    // Update page info
    updatePageInfo(data);

    // Render gallery items
    renderGalleryItems(data.images);

    // Render pagination
    renderPagination(data.page, data.totalPages);
  } catch (error) {
    console.error("Error loading gallery data:", error);
    document.getElementById("gallery").innerHTML =
      "<p>Error loading gallery. Please try again.</p>";
  }
}

function updateStats(stats) {
  document.getElementById("total-images").textContent = stats.total;
  document.getElementById("visible-images").textContent = stats.visible;
  document.getElementById("hidden-images").textContent = stats.hidden;
  document.getElementById("lucky-survivors").textContent = stats.luckySurvivor;
  document.getElementById("normal-shit").textContent = stats.normalShit;
  document.getElementById("extreme-nuclear").textContent = stats.extremeNuclear;
  document.getElementById("total-size").textContent = (
    stats.totalSize /
    1024 /
    1024
  ).toFixed(2);
  document.getElementById("avg-size").textContent = (
    stats.totalSize /
    stats.total /
    1024
  ).toFixed(2);
}

function updatePageInfo(data) {
  document.getElementById(
    "page-info"
  ).innerHTML = `📄 Page ${data.page} of ${data.totalPages} - 
         Showing ${data.images.length} images 
         (${data.showingFrom} - ${data.showingTo} of ${data.totalVisibleImages} visible images)`;
}

function renderGalleryItems(images) {
  const gallery = document.getElementById("gallery");

  const items = images
    .map((img) => {
      const [mimetype, ...meta] = img.mimetype.split(";");
      const metaObj = Object.fromEntries(meta.map((s) => s.split("=")));
      const roll = parseFloat(metaObj.roll || "0");
      let shitLevel;
      if (roll >= 50) {
        shitLevel = "LUCKY SURVIVOR";
      } else if (roll < 25) {
        shitLevel = "EXTREME NUCLEAR";
      } else {
        shitLevel = "NORMAL SHIT";
      }

      return `
            <div class="image-card">
                <div class="image-wrapper">
                    <a href="/image/${img.id}">
                        <img src="/raw/${
                          img.id
                        }" alt="Shitified image" loading="lazy" />
                    </a>
                </div>
                <div class="info">
                    <div class="shitification ${
                      roll >= 50 ? "lucky-survivor" : ""
                    }">
                        ${
                          roll >= 50 ? "✨" : "🎲"
                        } ${shitLevel} (${roll.toFixed(2)}%)
                    </div>
                    <div class="date">
                        📅 ${
                          new Date(metaObj.date).toLocaleString() || "unknown"
                        }
                    </div>
                </div>
            </div>
        `;
    })
    .join("");

  gallery.innerHTML = items;
}

function renderPagination(currentPage, totalPages) {
  const paginationTop = document.getElementById("pagination-top");
  const paginationBottom = document.getElementById("pagination-bottom");

  const paginationHTML = generatePaginationHTML(currentPage, totalPages);

  paginationTop.innerHTML = paginationHTML;
  paginationBottom.innerHTML = paginationHTML;
}

function generatePaginationHTML(page, totalPages) {
  let html = "";

  // Previous button
  if (page > 1) {
    html += `<a href="/gallery?page=${
      page - 1
    }" class="prev-next">⬅️ Previous</a>`;
  } else {
    html += `<span class="prev-next disabled">⬅️ Previous</span>`;
  }

  // Page numbers
  const startPage = Math.max(1, page - 2);
  const endPage = Math.min(totalPages, page + 2);

  // First page and ellipsis if needed
  if (startPage > 1) {
    html += `<a href="/gallery?page=1">1</a>`;
    if (startPage > 2) {
      html += `<span class="ellipsis">...</span>`;
    }
  }

  // Page range around current page
  for (let i = startPage; i <= endPage; i++) {
    if (i === page) {
      html += `<span class="current">${i}</span>`;
    } else {
      html += `<a href="/gallery?page=${i}">${i}</a>`;
    }
  }

  // Last page and ellipsis if needed
  if (endPage < totalPages) {
    if (endPage < totalPages - 1) {
      html += `<span class="ellipsis">...</span>`;
    }
    html += `<a href="/gallery?page=${totalPages}">${totalPages}</a>`;
  }

  // Next button
  if (page < totalPages) {
    html += `<a href="/gallery?page=${page + 1}" class="prev-next">Next ➡️</a>`;
  } else {
    html += `<span class="prev-next disabled">Next ➡️</span>`;
  }

  return html;
}
