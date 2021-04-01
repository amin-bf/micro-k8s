const path = require("path")

const {
  processTemplate,
  createConfigPath,
  writeFile,
  pathK8s
} = require("./helper")
const { runCommand } = require("./system")

const createClientConfig = (serviceName, service) => {
  const envs = getEnvs(service)
  const data = {
    service: serviceName,
    path: createConfigPath(serviceName),
    image: `${process.env.COMPOSE_PROJECT_NAME}_${serviceName}:${process.env.VERSION}`,
    security: getSecurityContext(),
    env: envs.env
  }

  const content = processTemplate("deployment-client", data)

  createConfigFile(`deployment-${serviceName}`, content)

  CreateServiceConfig(serviceName, service.port)
  if (process.env.ENV === "development")
    CreateNodeServiceConfig(serviceName, service.port)
}

const createApiWithDbConfig = (serviceName, service) => {
  const envs = getEnvs(service)
  const data = {
    service: serviceName,
    path: createConfigPath(serviceName),
    image: `${process.env.COMPOSE_PROJECT_NAME}_${serviceName}:${process.env.VERSION}`,
    dbHost: `${serviceName}-${service.database.type}-srv`,
    dbPort: service.database.port,
    dbName: `${serviceName}_db`,
    dbUser: `${serviceName}_dbu`,
    dbPassword: process.env.DB_PASSWORD,
    security: getSecurityContext(),
    app: process.env.COMPOSE_PROJECT_NAME,
    env: envs.env
  }

  // Client Start
  const content = processTemplate("deployment-api-with-db", data)

  createConfigFile(`deployment-${serviceName}`, content)

  CreateServiceConfig(serviceName, service.port)
  if (process.env.ENV === "development")
    CreateNodeServiceConfig(serviceName, service.port)

  createDbConfig(serviceName, service, envs.dbEnv)
}

const createApiConfig = (serviceName, service) => {
  const envs = getEnvs(service)
  const data = {
    service: serviceName,
    path: createConfigPath(serviceName),
    image: `${process.env.COMPOSE_PROJECT_NAME}_${serviceName}:${process.env.VERSION}`,
    security: getSecurityContext(),
    app: process.env.COMPOSE_PROJECT_NAME,
    env: envs.env
  }

  // Client Start
  const content = processTemplate("deployment-api", data)

  createConfigFile(`deployment-${serviceName}`, content)

  CreateServiceConfig(serviceName, service.port)
  if (process.env.ENV === "development")
    CreateNodeServiceConfig(serviceName, service.port)
}

const createDbConfig = (serviceName, service, env) => {
  const data = {
    service: `${serviceName}-${service.database.type}`,
    image: service.database.image,
    port: service.database.port,
    path: createConfigPath(`${serviceName}-${service.database.type}`),
    security: getSecurityContext(),
    env,
    mountPath: service.database.mountPath
  }

  // Client Start
  const content = processTemplate("db-deployment", data)

  createConfigFile(
    `deployment-${serviceName}-${service.database.type}`,
    content
  )

  CreateServiceConfig(
    `${serviceName}-${service.database.type}`,
    service.database.port
  )
  if (process.env.ENV === "development")
    CreateNodeServiceConfig(
      `${serviceName}-${service.database.type}`,
      service.database.port
    )
}

const createNatsConfig = () => {
  const data = {
    cluster: process.env.COMPOSE_PROJECT_NAME,
    app: process.env.COMPOSE_PROJECT_NAME,
    path: createConfigPath("nats-db"),
    dbPassword: process.env.DB_PASSWORD
  }

  // Client Start
  const content = processTemplate("nats", data)

  createConfigFile("deployment-nats", content)
}

const CreateServiceConfig = (serviceName, port) => {
  const data = {
    service: serviceName,
    port
  }

  const content = processTemplate("service", data)

  createConfigFile(`service-${serviceName}`, content)
}

const CreateNodeServiceConfig = (serviceName, port) => {
  const data = {
    service: serviceName,
    port
  }

  const content = processTemplate("node-service", data)

  createConfigFile(`node-service-${serviceName}`, content)
}

const CreateSecretsConfig = secrets => {
  secretsString = secrets.reduce((acc, item) => {
    return acc + `  ${item.key}: ${item.value}\r\n`
  }, "")

  const content = processTemplate("secrets", {
    secrets: secretsString,
    app: process.env.COMPOSE_PROJECT_NAME
  })

  createConfigFile(`secrets`, content)
}

const createConfigFile = (serviceName, content) => {
  const filepath = path.join(
    __dirname,
    "..",
    "infra",
    "k8s",
    `${serviceName}.yaml`
  )

  writeFile(filepath, content, () => {
    console.log(`Deployment file created in: ${filepath}`)
  })
}

const getSecurityContext = () => {
  const secCtx =
    process.env.HOST_OS === "win"
      ? ""
      : `
      securityContext:
        runAsUser: ${process.env.USER_ID}
        runAsGroup: ${process.env.GROUP_ID}
        fsGroup: ${process.env.GROUP_ID}
  `

  return secCtx
}

const getEnvs = service => {
  let envs = {}
  if (service.type === "api") {
    envs = {
      env: "",
      dbEnv: ""
    }

    if (service.env)
      envs.env = `
            ${Object.keys(service.env).reduce((acc, key) => {
              return (acc += `
            - name: ${key}
              value: "${service.env[key]}"
              `)
            }, "")}
    `
    if (service.database && service.database.env)
      envs.dbEnv = `
          env:
            ${Object.keys(service.database.env).reduce((acc, key) => {
              return (acc += `
            - name: ${key}
              value: "${service.database.env[key]}"
              `)
            }, "")}
    `
  } else {
    envs = {
      env: ""
    }

    if (service.env)
      envs.env = `
        env:
          ${Object.keys(service.env).reduce((acc, key) => {
            return (acc += `
          - name: ${key}
            value: "${service.env[key]}"
            `)
          }, "")}
  `
  }

  return envs
}

const removeDeploymentFiles = async () => {
  return new Promise((resolve, reject) => {
    let filesPath = pathK8s(["deplo*.yaml"])
    let paths = filesPath

    filesPath = pathK8s(["node*.yaml"])
    paths += " " + filesPath

    filesPath = pathK8s(["secret*.yaml"])
    paths += " " + filesPath

    filesPath = pathK8s(["service*.yaml"])
    paths += " " + filesPath

    runCommand(`rm ${paths}`, () => {
      resolve()
    })
  })
}

module.exports = {
  createClientConfig,
  createApiWithDbConfig,
  createApiConfig,
  createDbConfig,
  createNatsConfig,
  CreateSecretsConfig,
  removeDeploymentFiles
}
