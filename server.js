const express = require("express");
const app = express();
const cors = require("cors");
const ObjectId = require("mongodb").ObjectID;

require("dotenv").config({ path: "./config.env" });
const port = process.env.PORT || 5000;
app.use(cors());
app.use(express.json());

const dbo = require("./db/conn");

app.listen(port, () => {
  dbo.connectToServer(function (err) {
    if (err) console.error(err);
  });
  console.log(`Server is running on port: ${port}`);
});

app.get("/products", async function (req, res) {
  let sortBy = req.query.sortBy;
  sortBy = sortBy === undefined ? "name" : sortBy;

  let lessThan = req.query.lesserThan;
  lessThan = lessThan === undefined ? 1000000 : parseInt(lessThan);

  let greaterThan = req.query.greaterThan;
  greaterThan = greaterThan === undefined ? 0 : parseInt(greaterThan);

  const query = { price: { $gt: greaterThan, $lt: lessThan } };

  dbo
    .getDb()
    .collection("products")
    .find(query)
    .sort({ [sortBy]: 1 })
    .toArray(function (err, result) {
      if (err) {
        res.status(400).send("Error fetching listings!");
      } else {
        res.json(result);
      }
    });
});


app.post("/products", (req, res) => {
  console.log(req.body);
  const name = req.body.name;
  const price = req.body.price;
  const description = req.body.description;
  const quantity = req.body.quantity;
  const unit = req.body.unit;

  const obj = {
    name: name,
    price: price,
    description: description,
    quantity: quantity,
    unit: unit,
  };
  dbo
    .getDb()
    .collection("products")
    .findOne({ name: obj.name })
    .then((result) => {
      console.log(result);
      if (result) {
        res.send("Product already exists");
      } else {
        dbo
          .getDb()
          .collection("products")
          .insertOne(obj)
          .then((result) => {
            res.send(result);
          })
          .catch((err) => {
            res.status(500).send(err);
          });
      }
    });
});


app.put("/products/:id", (req, res) => {
  const id = req.params.id;
  const name = req.body.name;
  const price = req.body.price;
  const quantity = req.body.quantity;

  const updates = {};

  if (name) updates["name"] = name;
  if (price) updates["price"] = price;
  if (quantity) updates["quantity"] = quantity;

  dbo
    .getDb()
    .collection("products")
    .findOne({ _id: ObjectId(id) })
    .then((product) => {
      if (!product) {
        res.send({
          message: "Product not found",
          error: "Product not found",
        });
      } else {
        dbo
          .getDb()
          .collection("products")
          .updateOne({ _id: ObjectId(id) }, { $set: updates })
          .then((result) => {
            res.send({
              message: "Update was successful",
              result: result,
            });
          })
          .catch((err) => {
            res.send({
              message: "Update failed",
              error: err,
            });
          });
      }
    })
    .catch((err) => {
      res.send({
        message: "Failed to retrieve product",
        error: err,
      });
    });
});


app.delete("/products/:id", (req, res) => {
  const id = req.params.id;
  dbo
    .getDb()
    .collection("products")
    .findOne({ _id: ObjectId(id) })
    .then((product) => {
      if (!product) {
        return res.status(404).send({
          message: "Product not found",
        });
      }
      dbo
        .getDb()
        .collection("products")
        .deleteOne({ _id: ObjectId(id) })
        .then((result) => {
          res.send({
            message: "Product successfully deleted",
            result: result,
          });
        })
        .catch((err) => {
          res.status(500).send({
            message: "Delete failed",
            error: err,
          });
        });
    })
    .catch((err) => {
      res.status(500).send({
        message: "Failed to find product",
        error: err,
      });
    });
});


app.get("/products/report", (req, res) => {
  dbo
    .getDb()
    .collection("products")
    .aggregate([
      {
        $group: {
          _id: "$name",
          quantity: { $sum: "$quantity" },
          price: { $sum: "$price" },
        },
      },
    ])
    .toArray(function (err, result) {
      if (err) {
        res.status(400).send({ error: err });
      } else {
        res.json(result);
      }
    });
});
