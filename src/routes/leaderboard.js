const express = require("express");
const { getImageStats } = require("../utils/helpers");

const router = express.Router();

function createLeaderboardRoutes(supabase, templates) {
  // Leaderboard page
  router.get("/leaderboard", async (req, res) => {
    const html = templates.readTemplate("leaderboard.html");
    res.send(html);
  });

  // Leaderboard API endpoint
  router.get("/api/leaderboard", async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = 50;

      // First, get all images for stats (metadata only)
      const { data: allImages, error: statsError } = await supabase
        .from("images")
        .select("mimetype");

      if (statsError)
        return res.status(500).json({ error: statsError.message });

      const stats = await getImageStats(allImages, supabase);

      // Get all visible images ordered by views (descending) to create proper leaderboard
      const { data: rawImages, error } = await supabase
        .from("images")
        .select("*")
        .order("id", { ascending: false });

      if (error) return res.status(500).json({ error: error.message });

      // Filter out hidden images and calculate proper rankings
      const visibleImages = (rawImages || [])
        .filter((img) => {
          const [_, ...meta] = img.mimetype.split(";");
          const metaObj = Object.fromEntries(meta.map((s) => s.split("=")));
          return metaObj.hidden !== "true";
        })
        .map((img, index) => {
          const [_, ...meta] = img.mimetype.split(";");
          const metaObj = Object.fromEntries(meta.map((s) => s.split("=")));

          return {
            globalRank: index + 1,
            id: img.id,
            views: img.views,
            roll: metaObj.roll || "Unknown",
            shitlevel: metaObj.shitlevel || "Unknown",
            date: metaObj.date || "Unknown",
            mimetype: img.mimetype,
          };
        });

      // Calculate pagination
      const totalImages = visibleImages.length;
      const totalPages = Math.ceil(totalImages / limit);
      const startIndex = (page - 1) * limit;
      const endIndex = Math.min(startIndex + limit, totalImages);
      const pageImages = visibleImages.slice(startIndex, endIndex);

      res.json({
        images: pageImages,
        stats,
        page: page,
        totalPages: totalPages,
        totalImages: totalImages,
        startIndex: startIndex + 1,
        endIndex: endIndex,
      });
    } catch (error) {
      console.error("Leaderboard API error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  return router;
}

module.exports = createLeaderboardRoutes;
