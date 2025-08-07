// Leaderboard page JavaScript functionality

document.addEventListener("DOMContentLoaded", function () {
  // Get current page from URL params
  const urlParams = new URLSearchParams(window.location.search);
  const currentPage = parseInt(urlParams.get("page")) || 1;

  // Load leaderboard data
  loadLeaderboardData(currentPage);
});

async function loadLeaderboardData(page = 1) {
  try {
    const response = await fetch(`/api/leaderboard?page=${page}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Failed to load leaderboard data");
    }

    // Update page info
    updatePageInfo(data);

    // Render leaderboard items
    renderLeaderboardItems(data.images);

    // Render pagination
    renderPagination(data.page, data.totalPages);
  } catch (error) {
    console.error("Error loading leaderboard data:", error);
    document.getElementById("leaderboard").innerHTML =
      "<p>Error loading leaderboard. Please try again.</p>";
  }
}

function updatePageInfo(data) {
  document.getElementById(
    "page-info"
  ).innerHTML = `<p>Showing ${data.startIndex}-${data.endIndex} of ${data.totalImages} images</p>`;
}

function renderLeaderboardItems(images) {
  const leaderboard = document.getElementById("leaderboard");

  if (!images || images.length === 0) {
    leaderboard.innerHTML = "<p>No images found in the leaderboard.</p>";
    return;
  }

  const items = images
    .map(
      (img, index) => `
        <div class="image-row">
            <div class="rank ${
              (img.rank || index + 1) <= 3
                ? "medal-" + (img.rank || index + 1)
                : ""
            }">#${img.rank || index + 1}</div>
            <div class="image-wrapper">
                <a href="/image/${img.id}">
                    <img src="/raw/${img.id}" alt="Rank ${
        img.rank || index + 1
      }" loading="lazy" />
                </a>
            </div>
            <div class="info">
                <div class="roll">Roll: ${img.roll}</div>
                <div class="shitlevel">level: ${img.shitlevel}</div>
                <div class="date">Date: ${img.date}</div>
            </div>
        </div>
    `
    )
    .join("");

  leaderboard.innerHTML = items;
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
    html += `<a href="/leaderboard?page=${
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
    html += `<a href="/leaderboard?page=1">1</a>`;
    if (startPage > 2) {
      html += `<span class="ellipsis">...</span>`;
    }
  }

  // Page range around current page
  for (let i = startPage; i <= endPage; i++) {
    if (i === page) {
      html += `<span class="current">${i}</span>`;
    } else {
      html += `<a href="/leaderboard?page=${i}">${i}</a>`;
    }
  }

  // Last page and ellipsis if needed
  if (endPage < totalPages) {
    if (endPage < totalPages - 1) {
      html += `<span class="ellipsis">...</span>`;
    }
    html += `<a href="/leaderboard?page=${totalPages}">${totalPages}</a>`;
  }

  // Next button
  if (page < totalPages) {
    html += `<a href="/leaderboard?page=${
      page + 1
    }" class="prev-next">Next ➡️</a>`;
  } else {
    html += `<span class="prev-next disabled">Next ➡️</span>`;
  }

  return html;
}
