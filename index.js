const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const express = require("express");
const app = express();
const cors = require("cors");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const port = process.env.PORT || 25000;
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
const verify = async (req, res, next) => {
  try {
    const token = req.cookies?.token;

    if (!token) {
      res.status(401).send({ status: "UnAuthorized Access", code: "401" });
      return;
    }
    jwt.verify(token, process.env.SECRET, (error, decode) => {
      if (error) {
        res.status(401).send({ status: "UnAuthorized Access", code: "401" });
      } else {
        req.decode = decode;
      }
    });
    next();
  } catch (e) {
    console.log(e);
  }
};
async function run() {
  try {
    await client.connect();

    const serviceCollection = client.db("carDoctor").collection("services");
    const bookingCollection = client
      .db("carDoctor")
      .collection("bookedService");
    const productsCollection = client.db("carDoctor").collection("products");
    const usersCollection = client.db("carDoctor").collection("users");

    app.post("/jwt", (req, res) => {
      try {
        const data = req.body;
        // jwt.sign(payload, secretKey , expireInfo)
        const token = jwt.sign(data, process.env.SECRET, {
          expiresIn: "10h",
        });
        const expirationDate = new Date();
        expirationDate.setDate(expirationDate.getDate() + 7);
        res.cookie("token ", token, {
          httpOnly: true,
          secure: false,
          expires: expirationDate,
        });
        console.log(token, data.email);
        res.send({ token });
      } catch (error) {
        console.log(error);
        res.send(error);
      }
    });

    // CRUD operation service related api

    app.get("/", (req, res) => {
      res.send("app is running...");
    });
    //user data
    app.get("/users", async (req, res) => {
      try {
        const result = await usersCollection.find().toArray();
        res.send(result);
      } catch (error) {
        console.log(error);
      }
    });
    app.post("/users", async (req, res) => {
      try {
        const user = req.body;
        console.log(user);
        const result = await usersCollection.insertOne(user);
        res.send(result);
      } catch (error) {
        console.log(error);
      }
    });

    // SERVICE AREA
    app.get("/services", async (req, res) => {
      const cursor = serviceCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });
    app.get("/service/:id", verify, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await serviceCollection.findOne(query);
      res.send(result);
    });

    app.post("/services", async (req, res) => {
      try {
        const service = req.body;
        console.log("Add New Products ", service);
        const result = await serviceCollection.insertOne(service);
        res.send(result);
      } catch (error) {
        console.log(error);
      }
    });
    app.delete("/service/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await serviceCollection.deleteOne(query);
      console.log(id);
      res.send(result);
    });

    //Products data

    app.get("/products", async (req, res) => {
      const result = await productsCollection.find().toArray();
      res.send(result);
    });
    app.get("/product/:id", verify, async (req, res) => {
      try {
        console.log(req.decode);
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await productsCollection.findOne(query);
        res.send(result);
      } catch (error) {}
    });
    app.post("/products", async (req, res) => {
      try {
        const product = req.body;
        const result = await productsCollection.insertOne(product);
        res.send(result);
      } catch (error) {
        console.log(error);
      }
    });

    app.delete("/product/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await productsCollection.deleteOne(query);
        console.log(query);
        res.send(result);
      } catch (error) {
        console.log(error);
      }
    });
    app.delete("/products", async (req, res) => {
      const result = await productsCollection.deleteMany();
      res.send(result);
    });

    // Booking data

    app.get("/bookings", async (req, res) => {
      let query = {};
      if (req.query.email) {
        query = {
          email: req.query.email,
        };
      }

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
