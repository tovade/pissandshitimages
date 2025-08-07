const { getHashedIP } = require("../utils/helpers");

// Clean up expired sessions (run periodically)
async function cleanupExpiredSessions(supabase) {
  const { error } = await supabase
    .from("admin_sessions")
    .delete()
    .lt("expires_at", new Date().toISOString());

  if (error) {
    console.error("Failed to cleanup expired sessions:", error);
  }
}

// Secure admin authentication middleware
function authenticateAdmin(req, res, next) {
  try {
    const sessionToken = req.session.token;

    if (!sessionToken) {
      return res.redirect("/admin/login");
    }

    // Optional: Check if IP matches (for extra security)
    // const currentIPHash = getHashedIP(req);
    // if (session.ip_hash && session.ip_hash !== currentIPHash) {
    //   console.warn("Session IP mismatch detected");
    //   // You can choose to invalidate session here or just log it
    //   // For now, we'll allow it but log the warning
    // }

    // // Session is valid, attach session info to request
    // req.adminSession = session;
    next();
  } catch (error) {
    console.error("Admin auth error:", error);
    res.clearCookie("adminSession");
    res.redirect("/admin/login");
  }
}

// Rate limiting for login attempts
const loginAttempts = new Map();

function isRateLimited(ip) {
  const attempts = loginAttempts.get(ip) || { count: 0, lastAttempt: 0 };
  const now = Date.now();
  const timeWindow = 15 * 60 * 1000; // 15 minutes

  // Reset counter if time window has passed
  if (now - attempts.lastAttempt > timeWindow) {
    attempts.count = 0;
  }

  return attempts.count >= 5; // Max 5 attempts per 15 minutes
}

function recordLoginAttempt(ip, success = false) {
  const attempts = loginAttempts.get(ip) || { count: 0, lastAttempt: 0 };

  if (success) {
    // Clear attempts on successful login
    loginAttempts.delete(ip);
  } else {
    attempts.count++;
    attempts.lastAttempt = Date.now();
    loginAttempts.set(ip, attempts);
  }
}

module.exports = {
  cleanupExpiredSessions,
  authenticateAdmin,
  isRateLimited,
  recordLoginAttempt,
};
