const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.6hil8lf.mongodb.net/?retryWrites=true&w=majority`;

app.use(express.json());
app.use(cors());
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

const apartmentCollection = client.db("apartmentDB").collection("apartments");

async function run() {
  try {
    await client.connect();

    app.get("/apartments", async (req, res) => {
      const cursor = await apartmentCollection.find().toArray();

      res.send(cursor);
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
