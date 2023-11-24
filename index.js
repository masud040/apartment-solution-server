const express = require("express");
const app = express();
const jwt = require("jsonwebtoken");
const cors = require("cors");
require("dotenv").config();
const cookieParser = require("cookie-parser");
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.6hil8lf.mongodb.net/?retryWrites=true&w=majority`;

const corsOptions = {
  origin: ["http://localhost:5173", "http://localhost:5174"],
  credentials: true,
  optionSuccessStatus: 200,
};
app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

const apartmentCollection = client.db("apartmentDB").collection("apartments");
const usersCollection = client.db("apartmentDB").collection("users");

async function run() {
  try {
    await client.connect();

    app.post("/jwt", async (req, res) => {
      const user = req.body;

      const token = jwt.sign(user, process.env.ACCESS_TOKEN, {
        expiresIn: "365d",
      });
      res
        .cookie("token", token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
        })
        .send({ success: true });
    });

    // Logout
    app.get("/logout", async (req, res) => {
      try {
        res
          .clearCookie("token", {
            maxAge: 0,
            secure: process.env.NODE_ENV === "production",
            sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
          })
          .send({ success: true });
        console.log("Logout successful");
      } catch (err) {
        res.status(500).send(err);
      }
    });

    app.put("/users/:email", async (req, res) => {
      const email = req.params.email;
      const user = req.body;
      const query = { email: email };
      const options = { upsert: true };
      const isExist = await usersCollection.findOne(query);

      if (isExist) return res.send(isExist);
      const result = await usersCollection.updateOne(
        query,
        {
          $set: { ...user, timestamp: Date.now() },
        },
        options
      );
      res.send(result);
    });

    app.get("/apartments", async (req, res) => {
      const page = Number(req.query.page);
      const size = Number(req.query.size);

      const cursor = apartmentCollection
        .find()
        .skip(page * size)
        .limit(size);
      const result = await cursor.toArray();

      const total = await apartmentCollection.estimatedDocumentCount();

      res.send({ apartments: result, total });
    });

    app.all("*", (req, res, next) => {
      const error = new Error(`the requested url is invalid: ${req.url}`);
      error.status = 404;
      next(error);
    });

    app.use((err, req, res, next) => {
      res.status(err.status || 500).json({
        message: err.message,
      });
    });
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    //   await client.close();
  }
}
run().catch(console.dir);

app.get("/health", (req, res) => {
  res.send("Bistro Boss Restaurant Server is running");
});

app.listen(port, () => {
  console.log(`Building server listening on port ${port}`);
});
