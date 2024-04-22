require("dotenv").config();

const dbConfig = {
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
};

const express = require("express");
const cors = require("cors");
const app = express();

// Enable All CORS Requests for development purposes
app.use(cors());
