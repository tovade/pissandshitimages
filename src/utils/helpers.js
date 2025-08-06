const crypto = require("crypto");

// Helper function to get client IP and hash it
function getHashedIP(req) {
  // Get the real IP address (handles proxies and load balancers)
  const ip =
    req.headers["x-forwarded-for"] ||
    req.headers["x-real-ip"] ||
    req.connection.remoteAddress ||
    req.socket.remoteAddress ||
    (req.connection.socket ? req.connection.socket.remoteAddress : null);

  // Hash the IP with SHA256
  return crypto.createHash("sha256").update(ip.toString()).digest("hex");
}

// Helper function to hash a raw IP string
function hashIP(ip) {
  return crypto.createHash("sha256").update(ip.toString()).digest("hex");
}

// Helper function to calculate stats from metadata only
async function getImageStats(images, supabase) {
  const stats = {
    total: images.length,
    hidden: 0,
    visible: 0,
    luckySurvivor: 0,
    extremeNuclear: 0,
    normalShit: 0,
    totalSize: 0,
    avgSize: 0,
  };

  for (const img of images) {
    const [_, ...meta] = img.mimetype.split(";");
    const metaObj = Object.fromEntries(meta.map((s) => s.split("=")));
    const roll = parseFloat(metaObj.roll || "0");

    if (metaObj.hidden === "true") {
      stats.hidden++;
    } else {
      stats.visible++;
    }

    if (roll >= 50) {
      stats.luckySurvivor++;
    } else if (roll < 25) {
      stats.extremeNuclear++;
    } else {
      stats.normalShit++;
    }
  }

  // Get size stats from a sample of recent images
  const { data: sampleImages } = await supabase
    .from("images")
    .select("data")
    .order("id", { ascending: false })
    .limit(10); // Sample size of 10 recent images

  if (sampleImages && sampleImages.length > 0) {
    const sampleSize = sampleImages.reduce(
      (acc, img) =>
        acc + (img.data ? Buffer.from(img.data, "base64").length : 0),
      0
    );
    stats.avgSize = sampleSize / sampleImages.length;
    stats.totalSize = stats.avgSize * stats.total; // Estimate total size
  }

  return stats;
}

// Helper function to generate secure session tokens
function generateSessionToken() {
  return crypto.randomBytes(32).toString("hex");
}

module.exports = {
  getHashedIP,
  hashIP,
  getImageStats,
  generateSessionToken,
};
