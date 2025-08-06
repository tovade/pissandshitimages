// Admin panel JavaScript functionality

document.addEventListener("DOMContentLoaded", function () {
  // Get current page from URL params
  const urlParams = new URLSearchParams(window.location.search);
  const currentPage = parseInt(urlParams.get("page")) || 1;

  // Check for success messages in URL params
  checkSuccessMessages();

  // Load admin data
  loadAdminData(currentPage);
});

function checkSuccessMessages() {
  const urlParams = new URLSearchParams(window.location.search);
  const successContainer = document.getElementById("success-messages");

  if (urlParams.get("banned") === "success") {
    successContainer.innerHTML =
      '<div class="success-message">✅ IP has been successfully banned!</div>';
  } else if (urlParams.get("deleted") === "success") {
    successContainer.innerHTML =
      '<div class="success-message">✅ Image has been successfully deleted!</div>';
  } else if (urlParams.get("visibility") === "success") {
    successContainer.innerHTML =
      '<div class="success-message">✅ Image visibility has been successfully updated!</div>';
  }
}

async function loadAdminData(page = 1) {
  try {
    const response = await fetch(`/api/admin/data?page=${page}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Failed to load admin data");
    }

    // Update stats
    updateStats(data.stats, data);

    // Update banned count in navigation
    document.getElementById("banned-count").textContent = data.bannedIPsCount;

    // Render images table
    renderImagesTable(data.images);

    // Render pagination
    renderPagination(data.page, data.totalPages);
  } catch (error) {
    console.error("Error loading admin data:", error);
    document.getElementById("images-table").innerHTML =
      '<tr><td colspan="6">Error loading data. Please try again.</td></tr>';
  }
}

function updateStats(stats, data) {
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
  document.getElementById("banned-ips-count").textContent =
    data.bannedIPsCount || 0;
  document.getElementById(
    "showing-range"
  ).textContent = `${data.from} - ${data.to}`;
  document.getElementById("total-count").textContent = data.count;
}

function renderImagesTable(images) {
  const tbody = document.getElementById("images-table");

  const rows = images
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

      const hasIP = img.post_ips && img.post_ips.length > 0;
      const ipHash = hasIP ? img.post_ips[0].ip_hash : null;

      return `
            <tr>
                <td><img src="/raw/${
                  img.id
                }" class="thumbnail" loading="lazy" /></td>
                <td><a href="/image/${img.id}" target="_blank">${
        img.id
      }</a></td>
                <td>
                    <span class="shitlevel-badge ${
                      roll >= 50 ? "lucky" : roll < 25 ? "extreme" : "normal"
                    }">
                        ${shitLevel} (${roll.toFixed(2)}%)
                    </span>
                </td>
                <td>${new Date(metaObj.date).toLocaleString()}</td>
                <td class="ip-info">
                    ${hasIP ? `${ipHash.substring(0, 8)}...` : "No IP tracked"}
                </td>
                <td>
                    <form action="/admin/toggle-visibility/${
                      img.id
                    }" method="post" style="display:inline;">
                        <input type="hidden" name="currentState" value="${
                          metaObj.hidden === "true"
                        }">
                        <button type="submit" class="visibility-btn ${
                          metaObj.hidden === "true" ? "hidden" : "visible"
                        }">
                            ${metaObj.hidden === "true" ? "👁️ Show" : "🕶️ Hide"}
                        </button>
                    </form>
                    ${
                      hasIP
                        ? `
                        <form action="/admin/ban-ip/${img.id}" method="post" style="display:inline;">
                            <button type="submit" class="ban-btn" onclick="return confirm('Are you sure you want to ban this IP? This will prevent them from uploading any more images.')">
                                🚫 Ban IP
                            </button>
                        </form>
                    `
                        : '<button class="ban-btn" disabled>🚫 No IP</button>'
                    }
                    <form action="/admin/delete/${
                      img.id
                    }" method="post" style="display:inline;">
                        <button type="submit" class="delete-btn" onclick="return confirm('Are you sure you want to delete this image?')">🗑️ Delete</button>
                    </form>
                </td>
            </tr>
        `;
    })
    .join("");

  tbody.innerHTML = rows;
}

function renderPagination(currentPage, totalPages) {
  const pagination = document.getElementById("pagination");

  let html = "";

  if (currentPage > 1) {
    html += `<a href="/admin?page=${currentPage - 1}">⬅️ Previous</a>`;
  } else {
    html += '<a class="disabled">⬅️ Previous</a>';
  }

  // Generate page numbers around current page
  for (
    let i = Math.max(1, currentPage - 2);
    i <= Math.min(totalPages, currentPage + 2);
    i++
  ) {
    if (i === currentPage) {
      html += `<a href="/admin?page=${i}" class="current">${i}</a>`;
    } else {
      html += `<a href="/admin?page=${i}">${i}</a>`;
    }
  }

  if (currentPage < totalPages) {
    html += `<a href="/admin?page=${currentPage + 1}">Next ➡️</a>`;
  } else {
    html += '<a class="disabled">Next ➡️</a>';
  }

  pagination.innerHTML = html;
}
