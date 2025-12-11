
/*
const path = require("path");
require("dotenv").config({
  path: path.resolve(__dirname, "credentials/.env")
});
*/

require("dotenv").config();


const express = require("express");
const mongoose = require("mongoose");
const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));
app.set("views", "templates");
app.set("view engine", "ejs");



/*
process.stdin.setEncoding("utf8");
const prompt = "Type stop to shutdown the server: ";
*/


/*
let PORT;

if (process.env.PORT) {
  PORT = Number(process.env.PORT);
} else {
  if (process.argv.length !== 3) {
    console.log("Usage: node recipeServer.js PORT");
    process.exit(1);
  }
  PORT = Number(process.argv[2]);
}
*/

const PORT = process.env.PORT || 3000;
const uri = process.env.MONGO_CONNECTION_STRING;
if (!uri) {
  console.log("MONGO_CONNECTION_STRING is not defined");
  process.exit(1);
}

mongoose
  .connect(uri)
  .then(() => console.log("Connected to MongoDB"))
  .catch(err => {
    console.log("Error connecting to MongoDB:", err.message);
    process.exit(1);
  });


const recipeSchema = new mongoose.Schema({
  apiId: { type: String, required: true },
  name: { type: String, required: true },
  thumbnail: String,
  note: String,
  createdAt: { type: Date, default: Date.now }
});

const Recipe = mongoose.model("Recipe", recipeSchema);


function simpleMessagePage(message, backPath) {
  return `
    <h2>${message}</h2>
    <a href="${backPath}">Go Back</a><br/>
    <a href="/">HOME</a>
  `;
}

const recipesRouter = express.Router();
const API_BASE_URL = "https://www.themealdb.com/api/json/v1/1/search.php";

app.get("/", (req, res) => {
  res.render("home");
});

recipesRouter.get("/search", (req, res) => {
  res.render("search", { recipes: null, query: "", error: null });
});

recipesRouter.post("/search", async (req, res) => {
  const query = (req.body.query || "").trim();

  if (!query) {
    return res.render("search", {
      recipes: null,
      query: "",
      error: "Please enter a search term."
    });
  }

  try {
    const response = await fetch(`${API_BASE_URL}?s=${encodeURIComponent(query)}`);

    if (!response.ok) throw new Error("API error");

    const data = await response.json();
    const recipes = data?.meals || [];

    res.render("search", {
      recipes,
      query,
      error: recipes.length === 0 ? "No recipes found." : null
    });
  } catch (err) {
    console.log("API error:", err.message);
    res.render("search", {
      recipes: null,
      query,
      error: "There was a problem fetching recipes."
    });
  }
});

recipesRouter.get("/favorites", async (req, res) => {
  try {
    const recipes = await Recipe.find().sort({ createdAt: -1 });
    res.render("favorites", { recipes });
  } catch (err) {
    res.render("favorites", { recipes: [] });
  }
});

recipesRouter.post("/save", async (req, res) => {
  const { apiId, name, thumbnail, note } = req.body;

  if (!apiId || !name) {
    return res.send(simpleMessagePage("Missing recipe data.", "/recipes/search"));
  }

  try {
    let existing = await Recipe.findOne({ apiId });
    if (!existing) {
      existing = await Recipe.create({ apiId, name, thumbnail, note });
    }
    res.render("savedRecipe", { recipe: existing });
  } catch (err) {
    res.send(simpleMessagePage("Error saving recipe.", "/recipes/search"));
  }
});

recipesRouter.post("/delete/:id", async (req, res) => {
  try {
    await Recipe.findByIdAndDelete(req.params.id);
    res.redirect("/recipes/favorites");
  } catch (err) {
    res.send(simpleMessagePage("Error deleting recipe.", "/recipes/favorites"));
  }
});

recipesRouter.post("/removeAll", async (req, res) => {
  try {
    const result = await Recipe.deleteMany({});
    res.render("removeAll", { deletedCount: result.deletedCount });
  } catch (err) {
    res.send(simpleMessagePage("Error removing recipes.", "/recipes/favorites"));
  }
});

app.use("/recipes", recipesRouter);



/*
process.stdin.on("readable", function () {
  let input;
  while ((input = process.stdin.read()) !== null) {
    if (input.trim().toLowerCase() === "stop") {
      console.log("Shutting down the server");
      mongoose.connection.close().then(() => process.exit(0));
    } else {
      process.stdout.write(prompt);
    }
  }
});
*/

app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});
