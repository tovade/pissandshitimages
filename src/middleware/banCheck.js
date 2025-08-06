const { getHashedIP } = require("../utils/helpers");

// Middleware to check if IP is banned
function checkBannedIP(supabase, templates) {
  return async (req, res, next) => {
    try {
      const ipHash = getHashedIP(req);

      const { data: bannedIP, error } = await supabase
        .from("banned_ips")
        .select("banned_at")
        .eq("ip_hash", ipHash)
        .single();

      if (bannedIP) {
        let html = templates.readTemplate("banned.html");
        html = html.replace(
          '<span id="banned-date"></span>',
          new Date(bannedIP.banned_at).toLocaleString()
        );
        return res.status(403).send(html);
      }

      next();
    } catch (error) {
      console.error("Error checking banned IP:", error);
      next(); // Allow request to continue if there's an error
    }
  };
}

module.exports = {
  checkBannedIP,
};
