const express = require("express");
const { getImageStats } = require("../utils/helpers");

const router = express.Router();

function createGalleryRoutes(supabase, templates) {
  // Gallery page
  router.get("/gallery", async (req, res) => {
    const html = templates.readTemplate("gallery.html");
    res.send(html);
  });

  // Gallery API endpoint
  router.get("/api/gallery", async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const perPage = 20;
    const from = (page - 1) * perPage;

    try {
      // First, get all images for stats (metadata only)
      const { data: allImages, error: statsError } = await supabase
        .from("images")
        .select("mimetype");

      if (statsError)
        return res.status(500).json({ error: statsError.message });

      const stats = await getImageStats(allImages, supabase);

      // Filter out hidden images from allImages for visible count
      const visibleImagesForCount = allImages.filter((img) => {
        const [_, ...meta] = img.mimetype.split(";");
        const metaObj = Object.fromEntries(meta.map((s) => s.split("=")));
        return metaObj.hidden !== "true";
      });

      const totalVisibleImages = visibleImagesForCount.length;
      const totalPages = Math.ceil(totalVisibleImages / perPage);

      // Get more images than needed to account for hidden ones
      const bufferSize = Math.ceil(perPage * 1.5);
      const expandedTo = from + bufferSize - 1;

      const { data: rawImages, error } = await supabase
        .from("images")
        .select("id,mimetype")
        .order("id", { ascending: false })
        .range(from, expandedTo);

      if (error) return res.status(500).json({ error: error.message });

      // Filter out hidden images and take only what we need for this page
      const visibleImages = (rawImages || [])
        .filter((img) => {
          const [_, ...meta] = img.mimetype.split(";");
          const metaObj = Object.fromEntries(meta.map((s) => s.split("=")));
          return metaObj.hidden !== "true";
        })
        .slice(0, perPage);

      res.json({
        images: visibleImages,
        stats,
        page,
        totalPages,
        totalVisibleImages,
        showingFrom: from + 1,
        showingTo: from + visibleImages.length,
      });
    } catch (error) {
      console.error("Gallery API error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  return router;
}

module.exports = createGalleryRoutes;
