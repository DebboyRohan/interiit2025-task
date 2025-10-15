import { prisma } from "../lib/db.js";
import { readFileSync, createReadStream } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import csvParser from "csv-parser";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Function to read CSV file
async function readCSV(filePath) {
  return new Promise((resolve, reject) => {
    const results = [];
    createReadStream(filePath)
      .pipe(csvParser())
      .on("data", (data) => results.push(data))
      .on("end", () => resolve(results))
      .on("error", (error) => reject(error));
  });
}

// Function to read JSON file
function readJSON(filePath) {
  return JSON.parse(readFileSync(filePath, "utf-8"));
}

async function main() {
  await prisma.comment.deleteMany();
  await prisma.user.deleteMany();

  let usersData;
  const userJsonPath = join(__dirname, "../data/users.json");
  const userCsvPath = join(__dirname, "../data/users.csv");

  try {
    usersData = readJSON(userJsonPath);
    console.log("Using users.json");
  } catch (error) {
    usersData = await readCSV(userCsvPath);
    console.log("Using users.csv");
  }

  for (const user of usersData) {
    await prisma.user.create({
      data: {
        id: user.id,
        name: user.name,
        avatar: user.avatar,
        role: user.role || "USER",
        created_at: new Date(user.created_at),
      },
    });
  }

  let commentsData;
  const commentJsonPath = join(__dirname, "../data/comments.json");
  const commentCsvPath = join(__dirname, "../data/comments.csv");

  try {
    commentsData = readJSON(commentJsonPath);
    console.log("Using comments.json");
  } catch (error) {
    commentsData = await readCSV(commentCsvPath);
    console.log("Using comments.csv");
  }

  const sortedComments = commentsData.sort((a, b) => {
    const aParentNull =
      a.parent_id === null || a.parent_id === "null" || a.parent_id === "";
    const bParentNull =
      b.parent_id === null || b.parent_id === "null" || b.parent_id === "";

    if (aParentNull && !bParentNull) return -1;
    if (!aParentNull && bParentNull) return 1;
    return Number(a.id) - Number(b.id);
  });

  for (const comment of sortedComments) {
    let parentId = comment.parent_id;
    if (
      parentId === "null" ||
      parentId === "" ||
      parentId === null ||
      parentId === undefined
    ) {
      parentId = null;
    } else {
      parentId = parseInt(parentId);
    }

    await prisma.comment.create({
      data: {
        id: parseInt(comment.id),
        text: comment.text,
        upvotes: parseInt(comment.upvotes) || 0,
        created_at: new Date(comment.created_at),
        parent_id: parentId,
        user_id: comment.user_id,
      },
    });
  }

  console.log(`Created ${commentsData.length} comments`);
  console.log("Database seeded successfully!");
}

main().catch((e) => {
  console.error("Error seeding database:", e);
  process.exit(1);
});
