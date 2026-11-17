const express = require("express");
const dotenv = require("dotenv");

dotenv.config();

const app = express();
const POST = 3000;

app.use(express.json());
