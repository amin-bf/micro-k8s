const path = require("path")
const fs = require("fs")

const processTemplate = (templateName, data) => {
  const templatePath = path.join(
    __dirname,
    "..",
    "infra",
    "templates",
    `${templateName}.yaml`
  )
  let content = fs.readFileSync(templatePath, "utf8")

  Object.keys(data).forEach(key => {
    if (!key) return
    content = content.replace(new RegExp(`{{${key}}}`, "g"), data[key])
  })

  return content
}

const createConfigPath = serviceName => {
  let thePath = pathSrc([serviceName])

  if (process.env.HOST_OS === "win")
    thePath = "/" + thePath.toLowerCase().split("\\").join("/").replace(":", "")

  return thePath
}

const writeFile = (filepath, content, callback) => {
  fs.open(filepath, "w+", (err, fd) => {
    if (!err) {
      fs.write(fd, content, (err, result) => {
        if (!err) callback()
        else {
          throw new Error(
            `Error: can\'t write to file ${filepath}, ${err.message}`
          )
        }
      })
    } else {
      throw new Error(`Error: can\'t open ${filepath}`)
    }
  })
}

const pathRoot = (parts = []) => {
  return path.join(__dirname, "..", ...parts)
}

const pathK8s = (parts = []) => {
  return path.join(__dirname, "..", "infra", "k8s", ...parts)
}

const pathTemplates = (parts = []) => {
  return path.join(__dirname, "..", "infra", "templates", ...parts)
}

const pathSrc = (parts = []) => {
  return path.join(__dirname, "..", "src", ...parts)
}

module.exports = {
  processTemplate,
  createConfigPath,
  writeFile,
  pathRoot,
  pathK8s,
  pathTemplates,
  pathSrc
}
