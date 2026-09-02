"use strict";

import clear from 'rollup-plugin-clear';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from 'rollup-plugin-typescript2';
import screeps from 'rollup-plugin-screeps';
import copy from 'rollup-plugin-copy';
import fetch from "node-fetch";
import fs from "fs";
import os from "os";
import path from "path";

const grafanaTokenFile = path.join(os.homedir(), ".screeps-grafana-token");

function readGrafanaToken() {
  if (process.env.GRAFANA_TOKEN) return process.env.GRAFANA_TOKEN.trim();
  try {
    return fs.readFileSync(grafanaTokenFile, "utf8").trim();
  } catch (err) {
    return null;
  }
}

function grafanaAnnotationPlugin() {
  const grafanaUrl = process.env.GRAFANA_URL || "http://170.168.61.89:1337";
  const grafanaToken = readGrafanaToken();
  return {
    name: "grafana-annotation",
    async writeBundle() {
      if (!grafanaUrl || !grafanaToken) {
        console.log("Grafana annotation skipped: no url or token");
        return;
      }

      const dest = process.env.DEST || "unknown";
      const body = {
        time: Date.now(),
        tags: ["deploy", dest],
        text: `Deploy to ${dest}`,
      };

      try {
        const res = await fetch(`${grafanaUrl}/api/annotations`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${grafanaToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          console.error("Failed to create Grafana annotation:", await res.text());
        } else {
          console.log("Grafana annotation created");
        }
      } catch (err) {
        console.error("Grafana annotation error:", err);
      }
    },
  };
}

let cfg;
const dest = process.env.DEST;
if (!dest) {
  console.log("No destination specified - code will be compiled but not uploaded");
} else if ((cfg = require("./screeps.json")[dest]) == null) {
  throw new Error("Invalid upload destination");
}

const plugins = [
  clear({ targets: ["dist"] }),
  resolve({ rootDir: "src" }),
  commonjs(),
  typescript({ tsconfig: "./tsconfig.json" }),
];

if (cfg && cfg.localPath) {
  plugins.push(
    copy({
      targets: [{ src: "dist/main.js", dest: cfg.localPath }],
      hook: "writeBundle",
    })
  );
} else {
  plugins.push(screeps({ config: cfg, dryRun: cfg == null }));
  plugins.push(grafanaAnnotationPlugin())
}

export default {
  input: "src/main.ts",
  output: {
    file: "dist/main.js",
    format: "cjs",
    sourcemap: true,
  },
  plugins,
};
