/**
 * Report Generation Utility
 */

class Reporter {
    constructor() {
        this.sections = [];
    }

    addSection(title, content) {
        this.sections.push({
            title,
            content: typeof content === 'string' ? content : null,
            items: Array.isArray(content) ? content : null
        });
        return this;
    }

    addTable(title, headers, rows) {
        this.sections.push({
            title,
            table: { headers, rows }
        });
        return this;
    }

    addCode(title, code, language = 'javascript') {
        this.sections.push({
            title,
            code,
            codeLanguage: language
        });
        return this;
    }

    addList(title, items) {
        this.sections.push({
            title,
            items
        });
        return this;
    }

    generate(reportTitle) {
        let report = `# ${reportTitle}\n\n`;
        report += `**Generated:** ${new Date().toISOString()}\n\n`;
        report += `---\n\n`;

        for (const section of this.sections) {
            report += `## ${section.title}\n\n`;

            if (section.content) {
                report += `${section.content}\n\n`;
            }

            if (section.items) {
                for (const item of section.items) {
                    if (typeof item === 'string') {
                        report += `- ${item}\n`;
                    } else if (item.title) {
                        report += `### ${item.title}\n\n`;
                        if (item.content) {
                            report += `${item.content}\n\n`;
                        }
                        if (item.details) {
                            for (const detail of item.details) {
                                report += `  - ${detail}\n`;
                            }
                            report += `\n`;
                        }
                    }
                }
                report += `\n`;
            }

            if (section.table) {
                report += this.formatTable(section.table);
                report += `\n`;
            }

            if (section.code) {
                report += `\`\`\`${section.codeLanguage}\n`;
                report += `${section.code}\n`;
                report += `\`\`\`\n\n`;
            }
        }

        return report;
    }

    formatTable(table) {
        let output = '| ' + table.headers.join(' | ') + ' |\n';
        output += '| ' + table.headers.map(() => '---').join(' | ') + ' |\n';

        for (const row of table.rows) {
            output += '| ' + row.join(' | ') + ' |\n';
        }

        return output;
    }

    clear() {
        this.sections = [];
        return this;
    }
}

module.exports = Reporter;
