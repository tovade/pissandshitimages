const fs = require("fs");
const path = require("path");

class TemplateEngine {
  constructor(viewsPath = path.join(__dirname, "views")) {
    this.viewsPath = viewsPath;
    this.cache = new Map();
  }

  // Read and cache template files
  readTemplate(templatePath) {
    if (this.cache.has(templatePath)) {
      return this.cache.get(templatePath);
    }

    const fullPath = path.join(this.viewsPath, templatePath);
    const template = fs.readFileSync(fullPath, "utf8");
    this.cache.set(templatePath, template);
    return template;
  }

  // Simple template variable replacement
  render(templatePath, data = {}) {
    let template = this.readTemplate(templatePath);

    // Replace variables like {{variable}} with data values
    for (const [key, value] of Object.entries(data)) {
      const regex = new RegExp(`{{${key}}}`, "g");
      template = template.replace(regex, value);
    }

    return template;
  }

  // Render with dynamic content injection
  renderWithContent(templatePath, contentSelectors = {}) {
    let template = this.readTemplate(templatePath);

    // Inject content into specific selectors or IDs
    for (const [selector, content] of Object.entries(contentSelectors)) {
      if (selector.startsWith("#")) {
        // Replace innerHTML of element with ID
        const id = selector.substring(1);
        const regex = new RegExp(
          `(<[^>]*id="${id}"[^>]*>)([^<]*)(</[^>]*>)`,
          "g"
        );
        template = template.replace(regex, `$1${content}$3`);
      }
    }

    return template;
  }

  // Helper method to render error pages
  renderError(errorType, data = {}) {
    const errorTemplatePath = `errors/${errorType}.html`;
    return this.render(errorTemplatePath, data);
  }
}

module.exports = TemplateEngine;
