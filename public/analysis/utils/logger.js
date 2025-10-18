/**
 * Logging Utility for Analysis
 */

const fs = require('fs').promises;
const path = require('path');

class Logger {
    constructor(logFile) {
        this.logFile = logFile;
        this.levels = {
            DEBUG: 0,
            INFO: 1,
            WARN: 2,
            ERROR: 3,
            CRITICAL: 4
        };
        this.currentLevel = this.levels.INFO;
    }

    setLevel(level) {
        if (this.levels[level] !== undefined) {
            this.currentLevel = this.levels[level];
        }
    }

    async log(message, level = 'INFO', context = {}) {
        if (this.levels[level] < this.currentLevel) {
            return;
        }

        const timestamp = new Date().toISOString();
        const contextStr = Object.keys(context).length > 0 ? ` ${JSON.stringify(context)}` : '';
        const logEntry = `[${timestamp}] [${level}] ${message}${contextStr}\n`;

        // Console output with colors
        this.consoleLog(logEntry, level);

        // File output
        if (this.logFile) {
            try {
                await fs.appendFile(this.logFile, logEntry);
            } catch (error) {
                console.error('Failed to write to log file:', error.message);
            }
        }
    }

    consoleLog(message, level) {
        const colors = {
            DEBUG: '\x1b[36m',    // Cyan
            INFO: '\x1b[32m',     // Green
            WARN: '\x1b[33m',     // Yellow
            ERROR: '\x1b[31m',    // Red
            CRITICAL: '\x1b[35m'  // Magenta
        };
        const reset = '\x1b[0m';
        
        console.log(`${colors[level] || ''}${message.trim()}${reset}`);
    }

    async debug(message, context) {
        await this.log(message, 'DEBUG', context);
    }

    async info(message, context) {
        await this.log(message, 'INFO', context);
    }

    async warn(message, context) {
        await this.log(message, 'WARN', context);
    }

    async error(message, context) {
        await this.log(message, 'ERROR', context);
    }

    async critical(message, context) {
        await this.log(message, 'CRITICAL', context);
    }
}

module.exports = Logger;
