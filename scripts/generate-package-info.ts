#!/usr/bin/env ts-node

/**
 * scripts/generate-package-md.ts
 * Generates or updates `package.md` file with installed package versions.
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

interface DependenciesMap {
    [key: string]: string;
}

interface NpmListOutput {
    dependencies?: {
        [name: string]: { version?: string };
    };
}

const ROOT = process.cwd();
const PACKAGE_JSON_PATH = path.join(ROOT, 'package.json');
const OUTPUT_PATH = path.join(ROOT, 'info/package.md');
const MARKER_START = '<!--PACKAGE-TABLE-START-->';
const MARKER_END = '<!--PACKAGE-TABLE-END-->';

if (!fs.existsSync(PACKAGE_JSON_PATH)) {
    console.error('❌ No package.json found in', ROOT);
    process.exit(1);
}

/** Run a command and parse JSON output */
function runJSON<T>(cmd: string): T {
    try {
        const result = execSync(cmd, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] });
        return JSON.parse(result);
    } catch (err) {
        console.error(`❌ Failed running: ${cmd}`);
        if (err instanceof Error) console.error(err.message);
        process.exit(1);
    }
}

/** Get declared + installed dependencies */
function getPackageData(): { declared: DependenciesMap; installed: Record<string, { version?: string }> } {
    const pkgRaw = fs.readFileSync(PACKAGE_JSON_PATH, 'utf8');
    const pkg = JSON.parse(pkgRaw);
    const declared: DependenciesMap = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
    const installedOutput = runJSON<NpmListOutput>('npm ls --depth=0 --json');
    const installed = installedOutput.dependencies || {};
    return { declared, installed };
}

/** Build markdown table */
function generateMarkdown(declared: DependenciesMap, installed: Record<string, { version?: string }>): string {
    const allNames = Array.from(new Set([...Object.keys(declared), ...Object.keys(installed)])).sort();
    const rows = allNames.map((name) => {
        const installedVersion = installed[name]?.version || '—';
        const declaredVersion = declared[name] || '—';
        return `| \`${name}\` | \`${installedVersion}\` | \`${declaredVersion}\` |`;
    });

    const header = '| Package | Installed | Declared |\n|---|---:|---|\n';
    return `${header}${rows.join('\n')}`;
}

/** Build full markdown section */
function buildSection(): string {
    const { declared, installed } = getPackageData();
    const now = new Date().toISOString();
    const nodeVer = process.version;

    let npmVer = 'unknown';
    try {
        npmVer = execSync('npm -v', { encoding: 'utf8' }).trim();
    } catch {
        npmVer = 'unknown';
    }

    const mdTable = generateMarkdown(declared, installed);
    const summary = `\n**Summary**: Declared: ${Object.keys(declared).length} · Installed: ${Object.keys(installed).length}`;
    return `\n\nGenerated on: ${now}\n\nNode: ${nodeVer}  •  npm: ${npmVer}\n\n${MARKER_START}\n${mdTable}\n${MARKER_END}${summary}\n`;
}

/** Create or update package.md */
function updatePackageMd(): void {
    const { declared, installed } = getPackageData();
    const newTable = generateMarkdown(declared, installed);

    let finalContent: string;

    if (!fs.existsSync(OUTPUT_PATH)) {
        console.log('🆕 Creating new package.md');
        finalContent = `# Installed Packages\n${buildSection()}`;
    } else {
        const oldContent = fs.readFileSync(OUTPUT_PATH, 'utf8');
        if (oldContent.includes(MARKER_START) && oldContent.includes(MARKER_END)) {
            const newSection = `${MARKER_START}\n${newTable}\n${MARKER_END}`;
            finalContent = oldContent.replace(
                new RegExp(`${MARKER_START}[\\s\\S]*?${MARKER_END}`, 'm'),
                newSection
            );
            console.log('♻️  Updated existing package.md');
        } else {
            finalContent = oldContent + buildSection();
            console.log('♻️  Appended package info to existing package.md');
        }
    }

    fs.writeFileSync(OUTPUT_PATH, finalContent, 'utf8');
    console.log('✅ package.md generated/updated successfully.');
}

// Execute
updatePackageMd();
