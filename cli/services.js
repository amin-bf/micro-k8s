const path = require("path")
const fs = require("fs")

const { writeFile } = require("./helper")

exports.makeServiceDirectories = services => {
  Object.keys(services).forEach(key => {
    fs.mkdirSync(path.join(__dirname, "..", "src", key), {
      recursive: true
    })

    if (services[key].database)
      fs.mkdirSync(
        path.join(
          __dirname,
          "..",
          "src",
          `${key}-${services[key].database.type}`
        ),
        {
          recursive: true
        }
      )
  })
}

exports.makeNatsDirectory = () => {
  fs.mkdirSync(path.join(__dirname, "..", "src", "nats-db"), {
    recursive: true
  })
}

exports.createDockerFile = (serviceName, service) => {
  const content = `
FROM ${service.image}
WORKDIR /usr/src/${serviceName}
CMD ["npm", "run", "${
    service.type === "client" && process.env.ENV === "development"
      ? "dev"
      : "start"
  }"]
                `
  const filepath = path.join(__dirname, "..", "src", serviceName, "Dockerfile")
  writeFile(filepath, content, () => {
    console.log(`Dockerfile created in: ${filepath}`)
  })
}

exports.createDockerComposeFile = services => {
  let content = `
version: "3.7"

# Services
services: 
        `
  Object.keys(services).forEach(key => {
    content += `
    ${key}:
        ${
          process.env.HOST_OS === "win"
            ? ""
            : `user: ${process.env.USER_ID}:${process.env.GROUP_ID}`
        }
        build: ./src/${key}
        image: ${process.env.COMPOSE_PROJECT_NAME}_${key}:${process.env.VERSION}
        `
  })

  const filepath = path.join(__dirname, "..", "docker-compose.yml")
  writeFile(filepath, content, () => {
    console.log(`docker-compose file created in: ${filepath}`)
  })
}
