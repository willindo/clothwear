#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { execSync } from "child_process";

// 🚀 Skip everything when deployed on Render
if (process.env.RENDER || process.env.NODE_ENV === "production") {
  console.log("🛑 Render/production environment detected — skipping frontend Zod sync.");
  process.exit(0);
}
// Paths
const backendZodDir = path.resolve("src/generated/zod");
const frontendDir = path.resolve("../front-commerce");
if (!fs.existsSync(frontendDir)) {
  console.warn("⚠️ Frontend repo not found. Skipping frontend sync.");
  process.exit(0); // do not fail build
}
const frontendZodDir = path.join(frontendDir, "src/generated/zod");

// Helper: copy recursively
fs.rmSync(frontendZodDir, { recursive: true, force: true });

function copyDir(srcDir, destDir) {
  fs.mkdirSync(destDir, { recursive: true });
  for (const item of fs.readdirSync(srcDir, { withFileTypes: true })) {
    const src = path.join(srcDir, item.name);
    const dest = path.join(destDir, item.name);
    if (item.isDirectory()) {
      copyDir(src, dest);
    } else {
      fs.copyFileSync(src, dest);
    }
  }
}

// Helper: strip Prisma types
function stripPrismaTypes(dir) {
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    const filePath = path.join(dir, item.name);
    if (item.isDirectory()) {
      stripPrismaTypes(filePath);
    } else if (filePath.endsWith(".ts")) {
      let content = fs.readFileSync(filePath, "utf-8");
      // Remove imports from @prisma/client
      content = content.replace(/import\s+.*?@prisma\/client.*;\n/g, "");
      // Replace all Prisma.* types with any
      content = content.replace(/\bPrisma\.[a-zA-Z0-9_]+\b/g, "any");
      fs.writeFileSync(filePath, content);
    }
  }
}

// Helper: sync frontend @prisma/client version
function syncPrismaVersion() {
  const backendPkg = JSON.parse(fs.readFileSync(path.resolve("package.json"), "utf-8"));
  const backendPrismaVersion =
    backendPkg.dependencies?.["@prisma/client"] || backendPkg.devDependencies?.["@prisma/client"];

  if (!backendPrismaVersion) return;

  const frontendPkgPath = path.join(frontendDir, "package.json");
  const frontendPkg = JSON.parse(fs.readFileSync(frontendPkgPath, "utf-8"));

  frontendPkg.devDependencies = frontendPkg.devDependencies || {};
  frontendPkg.devDependencies["@prisma/client"] = backendPrismaVersion;

  fs.writeFileSync(frontendPkgPath, JSON.stringify(frontendPkg, null, 2));
  console.log(`🔄 Synced @prisma/client@${backendPrismaVersion} to frontend`);

  // Install frontend dev dependency
  try {
    execSync("npm install --omit=optional", { cwd: frontendDir, stdio: "inherit" });
  } catch (err) {
    console.warn("⚠️ Failed to install frontend @prisma/client", err);
  }
}

// Main
if (fs.existsSync(backendZodDir)) {
  console.log("📦 Copying backend Zod schemas...");
  copyDir(backendZodDir, frontendZodDir);

  console.log("🧹 Stripping Prisma types for frontend...");
  stripPrismaTypes(frontendZodDir);

  console.log("🔗 Syncing @prisma/client version...");
  syncPrismaVersion();

  console.log("✅ Zod types synced and frontend ready!");
} else {
  console.error("❌ No backend Zod directory found. Run `npm run prisma:generate` first.");
  process.exit(1);
}
