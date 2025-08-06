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
      // First, get all images for stats (metadata only)
      const { data: allImages, error: statsError } = await supabase
        .from("images")
        .select("mimetype");

      if (statsError)
        return res.status(500).json({ error: statsError.message });

      const stats = await getImageStats(allImages, supabase);

      // Get the top 100 images ordered by views (get all columns for processing)
      const { data: rawImages, error } = await supabase
        .from("images")
        .select("*")
        .order("views", { ascending: false })
        .limit(200); // Get more than we need to account for hidden ones

      if (error) return res.status(500).json({ error: error.message });

      // Filter out hidden images and take top 100
      const visibleImages = (rawImages || [])
        .filter((img) => {
          const [_, ...meta] = img.mimetype.split(";");
          const metaObj = Object.fromEntries(meta.map((s) => s.split("=")));
          return metaObj.hidden !== "true";
        })
        .slice(0, 100)
        .map((img, index) => ({
          rank: index + 1,
          id: img.id,
          views: img.views,
          mimetype: img.mimetype,
        }));

      res.json({
        images: visibleImages,
        stats,
      });
    } catch (error) {
      console.error("Leaderboard API error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  return router;
}

module.exports = createLeaderboardRoutes;
