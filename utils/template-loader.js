const fs = require('fs-extra');
const path = require('path');
const handlebars = require('handlebars');

class TemplateLoader {
  constructor() {
    this.templates = new Map();
    this.templateDir = path.join(__dirname, '..', 'templates');
  }

  async loadTemplate(templateName, context = {}) {
    const cacheKey = `${templateName}-${JSON.stringify(context)}`;
    
    if (this.templates.has(cacheKey)) {
      return this.templates.get(cacheKey);
    }

    try {
      const templatePath = path.join(this.templateDir, `${templateName}.hbs`);
      const templateContent = await fs.readFile(templatePath, 'utf8');
      const template = handlebars.compile(templateContent);
      const result = template(context);
      
      this.templates.set(cacheKey, result);
      return result;
    } catch (error) {
      throw new Error(`Failed to load template: ${templateName} - ${error.message}`);
    }
  }

  async renderTemplate(templateName, context = {}) {
    return this.loadTemplate(templateName, context);
  }

  clearCache() {
    this.templates.clear();
  }
}

module.exports = new TemplateLoader();