const express = require("express");
const { gamblingShitifyImage } = require("../utils/imageProcessing");
const { getHashedIP } = require("../utils/helpers");

const router = express.Router();

function createPublicRoutes(supabase, templates, upload, banCheck) {
  // ShareX Config download
  router.get("/sharexconfig", (req, res) => {
    const config = {
      Version: "14.1.0",
      Name: "pissandshitimages",
      DestinationType: "ImageUploader",
      RequestMethod: "POST",
      RequestURL: `https://${req.get("host")}/upload`,
      Body: "MultipartFormData",
      FileFormName: "image",
      Arguments: {
        hide: "on",
      },
      ResponseType: "RedirectionURL",
      URL: "{responseurl}",
    };

    res.setHeader(
      "Content-Disposition",
      'attachment; filename="pissandshitimages.sxcu"'
    );
    res.setHeader("Content-Type", "application/json");
    res.send(JSON.stringify(config, null, 2));
  });

  // Upload page
  router.get("/", (req, res) => {
    const html = templates.readTemplate("index.html");
    res.send(html);
  });

  // Handle upload
  router.post("/upload", banCheck, upload.single("image"), async (req, res) => {
    if (!req.file) return res.status(400).send("No file uploaded.");

    const { buffer, mimetype } = req.file;
    const result = await gamblingShitifyImage(buffer, mimetype);
    const base64 = result.buffer.toString("base64");
    const now = new Date().toISOString();
    const isHidden = req.body.hide === "on";
    const customMimetype = `${result.mimetype};shitlevel=${
      result.gamblingResult
    };roll=${result.rollPercentage};date=${now};hidden=${isHidden}${
      isHidden
        ? ";message=🙈 THIS USER IS A COWARD WHO TRIED TO HIDE THEIR SHAME! 🙈"
        : ""
    }`;

    // Insert the image
    const { data, error } = await supabase
      .from("images")
      .insert([{ data: base64, mimetype: customMimetype }])
      .select("id")
      .single();

    if (error) return res.status(500).send("DB error: " + error.message);

    // Track the IP that uploaded this image
    const ipHash = getHashedIP(req);
    const { error: ipError } = await supabase.from("post_ips").insert([
      {
        post_id: data.id,
        ip_hash: ipHash,
      },
    ]);

    if (ipError) {
      console.error("Failed to track IP:", ipError);
      // Don't fail the upload if IP tracking fails
    }

    res.redirect(`/image/${data.id}`);
  });

  // Serve image with OpenGraph tags
  router.get("/image/:id", async (req, res) => {
    const { data, error } = await supabase
      .from("images")
      .select("*")
      .eq("id", req.params.id)
      .single();
    if (error || !data) return res.status(404).send("Image not found");

    const imageUrl = `${req.protocol}://${req.get("host")}/raw/${data.id}`;
    const [mimetype, ...meta] = data.mimetype.split(";");
    const metaObj = Object.fromEntries(meta.map((s) => s.split("=")));
    const fileSizeMB = (
      Buffer.from(data.data, "base64").length /
      1024 /
      1024
    ).toFixed(2);

    let html = templates.readTemplate("image.html");

    // Update meta tags
    html = html.replace(
      'content=""',
      `content="OOOOHHHH!!111 i just wasted ${fileSizeMB} PENTABYTES TO SHOW YOU THIS GARBAGE"`
    );
    html = html.replace(
      '<meta property="og:image" content="" />',
      `<meta property="og:image" content="${imageUrl}" />`
    );

    // Update image source
    html = html.replace('src=""', `src="${imageUrl}"`);

    // Update shitification info
    const shitificationInfo = `🎲 Shitification: ${
      metaObj.shitlevel?.replace("_", " ") || "unknown"
    } (${metaObj.roll || "??"}%)`;
    html = html.replace(
      "<!-- Shitification info will be inserted here -->",
      shitificationInfo
    );

    // Update date info
    const dateInfo = `📅 Date: ${
      new Date(metaObj.date).toLocaleString() || "unknown"
    }`;
    html = html.replace("<!-- Date info will be inserted here -->", dateInfo);

    // Show shame message if hidden
    if (metaObj.hidden === "true") {
      html = html.replace('style="display: none;"', "");
      html = html.replace(
        "<!-- Shame message will be inserted here -->",
        metaObj.message ||
          "🙈 THIS USER IS A COWARD WHO TRIED TO HIDE THEIR SHAME! 🙈"
      );
    }

    res.send(html);
  });

  // Serve raw image
  router.get("/raw/:id", async (req, res) => {
    const { data, error } = await supabase
      .from("images")
      .select("*")
      .eq("id", req.params.id)
      .single();
    if (error || !data) return res.status(404).send("Image not found");
    const [mimetype] = data.mimetype.split(";");
    res.set("Content-Type", mimetype);
    res.send(Buffer.from(data.data, "base64"));
  });

  return router;
}

module.exports = createPublicRoutes;
