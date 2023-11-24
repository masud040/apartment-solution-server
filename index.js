const express = require("express");
const app = express();
const jwt = require("jsonwebtoken");
const cors = require("cors");
require("dotenv").config();

const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.6hil8lf.mongodb.net/?retryWrites=true&w=majority`;

app.use(cors());
app.use(express.json());

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

const apartmentCollection = client.db("apartmentDB").collection("apartments");
const usersCollection = client.db("apartmentDB").collection("users");
const agreementsCollection = client.db("apartmentDB").collection("agreements");

// const verifyToken = (req, res, next) => {
//   if (!req?.headers?.authorization) {
//     return res.status(401).send("Unauthorized access");
//   }
//   const token = req?.headers?.authorization.split(" ")[1];

//   jwt.verify(token, process.env.ACCESS_TOKEN, (err, decoded) => {
//     if (err) {
//       return res.status(401).send("Unauthorized access");
//     }
//     req.decode = decoded;

//     next();
//   });
// };

async function run() {
  try {
    await client.connect();
    // JWT related api
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN, {
        expiresIn: "1hr",
      });

      res.send({ token });
    });

    // Role related api
    app.get("/users/role/:email", async (req, res) => {
      const email = req.params?.email;
      // if (email !== req.decode.email) {
      //   return res.status(403).send({ message: "Forbidden" });
      // }
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      const role = user?.role;
      res.send({ role });
    });
    // Users related api
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

    // apartments related api
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

    // agreement related api
    app.get("/agreement/:email", async (req, res) => {
      const query = { email: req.params?.email };

      const result = await agreementsCollection.find(query).toArray();
      res.send(result);
    });

    app.post("/agreements", async (req, res) => {
      const agreement = req?.body;
      const result = await agreementsCollection.insertOne(agreement);
      res.send(result);
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
