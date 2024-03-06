const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
// const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const express = require("express");
const app = express();
const cors = require("cors");
const jwt = require("jsonwebtoken");
var cookieParser = require("cookie-parser");

const port = process.env.PORT || 2500;
// middleware
app.use(
  cors({
    origin: ["http://localhost:5173"],
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());
const uri = `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@cluster0.r44bh6t.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// custom middlewares
const logger = async (req, res, next) => {
  console.log("called : ", req.host, req.originalUrl);
  next();
};

const verifyToken = async (req, res, next) => {
  const token = req.cookies?.token;
  console.log("value of token of middlewares : ", token);
  if (!token) {
    return res.status(401).send({ message: "UnAuthorized" });
  }
  jwt.verify(token, process.env._SECRET_ACCESS_TOKEN, (err, decoded) => {
    if (err) {
      return res.status(401).send({ menubar: "UnAuthorized" });
    }
    console.log("value in the token : ", decoded);
    req.user = decoded;
    next();
  });
};
async function run() {
  try {
    await client.connect();

    const serviceCollection = client.db("carDoctor").collection("services");
    const bookingCollection = client
      .db("carDoctor")
      .collection("bookedService");

    app.post("/jwt", logger, async (req, res) => {
      const user = req.body;
      const token = jwt.sign(
        {
          user,
        },
        process.env._SECRET_ACCESS_TOKEN,
        { expiresIn: "10h" }
      );
      res
        .cookie("token", token, {
          httpOnly: true,
          secure: true,
          sameSite: "none",
          maxAge: 10 * 60 * 60 * 1000,
        })
        .send({ success: true });
      // console.log(token);
    });

    // CRUD operation service related api

    app.get("/", (req, res) => {
      res.send("app is running...");
    });

    app.get("/services", logger, async (req, res) => {
      const cursor = serviceCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });
    app.get("/service/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await serviceCollection.findOne(query);
      res.send(result);
    });

    // Booking data

    app.get("/bookings", logger, verifyToken, async (req, res) => {
      let query = {};
      if (req.query.email) {
        query = {
          email: req.query.email,
        };
      }
      if (req.user.user.email !== req.query.email) {
        return req.status(403).send({ message: "UnAuthorized" });
      }
      console.log("user in the valid token : ", req.user);
      console.log("user email : ", req.query.email);
      console.log("cookies : ", req.cookies?.token);
      // if (req.query.email !== req.use.email) {
      //   return res.status(403).send({ message: "forbidden" });
      // }
      const result = await bookingCollection.find(query).toArray();
      res.send(result);
    });
    app.get("/bookings/:id", async (req, res) => {
      const id = req.params.id;
      const cursor = { _id: new ObjectId(id) };
      const result = await bookingCollection.findOne(cursor);
      res.send(result);
    });

    app.post("/bookings", async (req, res) => {
      const bookings = req.body;
      const result = await bookingCollection.insertOne(bookings);
      res.send(result);
    });
    app.patch("/bookings/:id", async (req, res) => {
      const id = req.params.id;
      const modifiedData = req.body;

      const query = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          status: modifiedData.status,
        },
      };
      const result = await bookingCollection.updateOne(query, updateDoc);
      res.send(result);
      // console.log("result" , result);
    });

    app.delete("/bookings", async (req, res) => {
      const result = await bookingCollection.deleteMany();
      res.send(result);
    });

    app.delete("/bookings/:id", async (req, res) => {
      const id = req.params.id;
      const cursor = { _id: new ObjectId(id) };
      const result = await bookingCollection.deleteOne(cursor);
      res.send(result);
    });
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
  }
}
run().catch(console.dir);

app.listen(port, () => {
  console.log(`Example app listen on port : ${port}`);
});
