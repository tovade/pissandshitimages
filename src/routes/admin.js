const express = require("express");
const { getHashedIP, hashIP, getImageStats } = require("../utils/helpers");

const router = express.Router();

// Simple middleware to check if user is authenticated admin
function requireAdmin(req, res, next) {
  if (req.session && req.session.admin) {
    return next();
  } else {
    return res.redirect("/admin/login");
  }
}

function createAdminRoutes(supabase, templates, app) {
  // Admin login page
  router.get("/admin/login", (req, res) => {
    if (req.session.admin) {
      return res.redirect("/admin");
    }
    const html = templates.readTemplate("admin/login.html");
    res.send(html);
  });

  // Admin login handler
  router.post("/admin/login", async (req, res) => {
    const { password } = req.body;

    if (password === process.env.ADMIN_PASSWORD) {
      req.session.admin = true;
      res.redirect("/admin");
    } else {
      const html = templates.readTemplate("admin/login.html", {
        error: "Invalid password",
      });
      res.send(html);
    }
  });

  // Admin panel (protected)
  router.get("/admin", requireAdmin, async (req, res) => {
    const html = templates.readTemplate("admin/panel.html");
    res.send(html);
  });

  // Admin logout
  router.post("/admin/logout", requireAdmin, (req, res) => {
    req.session.destroy();
    res.redirect("/");
  });

  // GET route for logout (for the navbar link)
  router.get("/admin/logout", requireAdmin, (req, res) => {
    req.session.destroy();
    res.redirect("/");
  });

  router.get("/admin/banned-ips", requireAdmin, async (req, res) => {
    const html = templates.readTemplate("admin/banned-ips.html");
    res.send(html);
  });
  router.get("/admin/sessions", requireAdmin, async (req, res) => {
    const html = templates.readTemplate("admin/sessions.html");
    res.send(html);
  });

  // Admin API endpoints

  // Combined admin data endpoint (used by admin.js frontend)
  router.get("/api/admin/data", requireAdmin, async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const perPage = 50;
    const from = (page - 1) * perPage;

    try {
      // Get paginated images with IP info
      const {
        data: images,
        error: imagesError,
        count,
      } = await supabase
        .from("images")
        .select(
          `
          *,
          post_ips (
            ip_hash
          )
        `,
          { count: "exact" }
        )
        .order("id", { ascending: false })
        .range(from, from + perPage - 1);

      if (imagesError) {
        return res.status(500).json({ error: imagesError.message });
      }

      // Get all images for stats calculation
      const { data: allImages, error: statsError } = await supabase
        .from("images")
        .select("*");

      if (statsError) {
        return res.status(500).json({ error: statsError.message });
      }

      const stats = await getImageStats(allImages, supabase);

      // Get banned IPs count
      const { count: bannedCount } = await supabase
        .from("banned_ips")
        .select("*", { count: "exact" });

      const totalPages = Math.ceil(count / perPage);

      res.json({
        images: images || [],
        stats,
        page,
        totalPages,
        count,
        from: from + 1,
        to: Math.min(from + perPage, count),
        bannedIPsCount: bannedCount || 0,
      });
    } catch (error) {
      console.error("Admin data error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  router.get("/api/admin/stats", requireAdmin, async (req, res) => {
    try {
      // Get all images for comprehensive stats
      const { data: allImages, error: statsError } = await supabase
        .from("images")
        .select("*");

      if (statsError)
        return res.status(500).json({ error: statsError.message });

      const stats = await getImageStats(allImages, supabase);

      // Get banned IPs count
      const { count: bannedCount } = await supabase
        .from("banned_ips")
        .select("*", { count: "exact" });

      res.json({
        ...stats,
        bannedIps: bannedCount || 0,
      });
    } catch (error) {
      console.error("Admin stats error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Admin images list
  router.get("/api/admin/images", requireAdmin, async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const perPage = 50;
    const from = (page - 1) * perPage;

    try {
      const {
        data: images,
        error,
        count,
      } = await supabase
        .from("images")
        .select("*", { count: "exact" })
        .order("id", { ascending: false })
        .range(from, from + perPage - 1);

      if (error) return res.status(500).json({ error: error.message });

      const totalPages = Math.ceil(count / perPage);

      res.json({
        images: images || [],
        page,
        totalPages,
        totalImages: count,
      });
    } catch (error) {
      console.error("Admin images error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Form-based admin actions (for the HTML forms in admin panel)

  // Toggle visibility by ID (form action)
  router.post(
    "/admin/toggle-visibility/:id",
    requireAdmin,
    async (req, res) => {
      const { id } = req.params;

      try {
        // Get current image
        const { data: image, error: fetchError } = await supabase
          .from("images")
          .select("mimetype")
          .eq("id", id)
          .single();

        if (fetchError) {
          return res.redirect("/admin?error=Image not found");
        }

        // Parse current metadata
        const [originalMimetype, ...meta] = image.mimetype.split(";");
        const metaObj = Object.fromEntries(meta.map((s) => s.split("=")));

        // Toggle hidden status
        const isCurrentlyHidden = metaObj.hidden === "true";
        if (isCurrentlyHidden) {
          delete metaObj.hidden;
        } else {
          metaObj.hidden = "true";
        }

        // Rebuild mimetype string
        const newMimetype = [
          originalMimetype,
          ...Object.entries(metaObj).map(([k, v]) => `${k}=${v}`),
        ].join(";");

        // Update in database
        const { error: updateError } = await supabase
          .from("images")
          .update({ mimetype: newMimetype })
          .eq("id", id);

        if (updateError) {
          return res.redirect("/admin?error=Failed to update visibility");
        }

        res.redirect("/admin?visibility=success");
      } catch (error) {
        console.error("Toggle visibility error:", error);
        res.redirect("/admin?error=Internal server error");
      }
    }
  );

  // Delete image by ID (form action)
  router.post("/admin/delete/:id", requireAdmin, async (req, res) => {
    const { id } = req.params;

    try {
      const { error } = await supabase.from("images").delete().eq("id", id);

      if (error) {
        return res.redirect("/admin?error=Failed to delete image");
      }

      res.redirect("/admin?deleted=success");
    } catch (error) {
      console.error("Delete image error:", error);
      res.redirect("/admin?error=Internal server error");
    }
  });

  // Ban IP by image ID (form action)
  router.post("/admin/ban-ip/:id", requireAdmin, async (req, res) => {
    const { id } = req.params;

    try {
      // Get the IP hash from post_ips table
      const { data: postIp, error: ipError } = await supabase
        .from("post_ips")
        .select("ip_hash")
        .eq("post_id", id)
        .single();

      if (ipError || !postIp) {
        return res.redirect("/admin?error=No IP found for this image");
      }

      // Ban the IP
      const { error: banError } = await supabase.from("banned_ips").insert({
        ip_hash: postIp.ip_hash,
        banned_by: "admin",
      });

      if (banError) {
        if (banError.code === "23505") {
          return res.redirect("/admin?error=IP is already banned");
        }
        return res.redirect("/admin?error=Failed to ban IP");
      }

      res.redirect("/admin?banned=success");
    } catch (error) {
      console.error("Ban IP error:", error);
      res.redirect("/admin?error=Internal server error");
    }
  });

  // Form actions for the "by ID" management section
  router.post(
    "/admin/toggle-visibility-by-id",
    requireAdmin,
    async (req, res) => {
      const { imageId } = req.body;
      if (!imageId) {
        return res.redirect("/admin?error=No image ID provided");
      }
      res.redirect(`/admin/toggle-visibility/${imageId}`);
    }
  );

  router.post("/admin/delete-by-id", requireAdmin, async (req, res) => {
    const { imageId } = req.body;
    if (!imageId) {
      return res.redirect("/admin?error=No image ID provided");
    }
    res.redirect(`/admin/delete/${imageId}`);
  });

  router.post("/admin/ban-ip-by-id", requireAdmin, async (req, res) => {
    const { imageId } = req.body;
    if (!imageId) {
      return res.redirect("/admin?error=No image ID provided");
    }
    res.redirect(`/admin/ban-ip/${imageId}`);
  });

  // Toggle image visibility
  router.post(
    "/api/admin/images/:id/toggle-visibility",
    requireAdmin,
    async (req, res) => {
      const { id } = req.params;

      try {
        // Get current image
        const { data: image, error: fetchError } = await supabase
          .from("images")
          .select("mimetype")
          .eq("id", id)
          .single();

        if (fetchError)
          return res.status(404).json({ error: "Image not found" });

        // Parse current metadata
        const [originalMimetype, ...meta] = image.mimetype.split(";");
        const metaObj = Object.fromEntries(meta.map((s) => s.split("=")));

        // Toggle hidden status
        const isCurrentlyHidden = metaObj.hidden === "true";
        if (isCurrentlyHidden) {
          delete metaObj.hidden;
        } else {
          metaObj.hidden = "true";
        }

        // Rebuild mimetype string
        const newMimetype = [
          originalMimetype,
          ...Object.entries(metaObj).map(([k, v]) => `${k}=${v}`),
        ].join(";");

        // Update in database
        const { error: updateError } = await supabase
          .from("images")
          .update({ mimetype: newMimetype })
          .eq("id", id);

        if (updateError)
          return res.status(500).json({ error: updateError.message });

        res.json({ success: true, hidden: !isCurrentlyHidden });
      } catch (error) {
        console.error("Toggle visibility error:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    }
  );

  // Delete image
  router.delete("/api/admin/images/:id", requireAdmin, async (req, res) => {
    const { id } = req.params;

    try {
      const { error } = await supabase.from("images").delete().eq("id", id);

      if (error) return res.status(500).json({ error: error.message });

      res.json({ success: true });
    } catch (error) {
      console.error("Delete image error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get banned IPs
  router.get("/api/admin/banned-ips", requireAdmin, async (req, res) => {
    try {
      const { data: bannedIps, error } = await supabase
        .from("banned_ips")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) return res.status(500).json({ error: error.message });

      res.json({ bannedIps: bannedIps || [] });
    } catch (error) {
      console.error("Get banned IPs error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Ban IP
  router.post("/api/admin/ban-ip", requireAdmin, async (req, res) => {
    const { ip, reason } = req.body;

    if (!ip) {
      return res.status(400).json({ error: "IP address is required" });
    }

    try {
      const hashedIp = hashIP(ip);

      const { error } = await supabase.from("banned_ips").insert({
        ip_hash: hashedIp,
        original_ip: ip,
        reason: reason || "No reason provided",
      });

      if (error) {
        if (error.code === "23505") {
          // Unique constraint violation
          return res.status(400).json({ error: "IP is already banned" });
        }
        return res.status(500).json({ error: error.message });
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Ban IP error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Unban IP
  router.delete("/api/admin/banned-ips/:id", requireAdmin, async (req, res) => {
    const { id } = req.params;

    try {
      const { error } = await supabase.from("banned_ips").delete().eq("id", id);

      if (error) return res.status(500).json({ error: error.message });

      res.json({ success: true });
    } catch (error) {
      console.error("Unban IP error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  return router;
}

module.exports = createAdminRoutes;
