const path = require("path")
const fs = require("fs")

require("dotenv").config()

exports.command = process.argv.slice(2)[0]
exports.args = process.argv.slice(3)
exports.services = JSON.parse(
  fs.readFileSync(path.join(__dirname, "..", "config.json"), "utf8")
).services
exports.secrets = JSON.parse(
  fs.readFileSync(path.join(__dirname, "..", "config.json"), "utf8")
).secrets
exports.version = process.env.VERSION.split(".")
