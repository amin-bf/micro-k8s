const fs = require("fs")
const path = require("path")

const {
  createClientConfig,
  createApiWithDbConfig,
  createDbConfig,
  createApiConfig,
  createNatsConfig,
  CreateSecretsConfig,
  removeDeploymentFiles
} = require("./cli/k8s-config")

const {
  args,
  command,
  secrets,
  services,
  version
} = require("./cli/environment")

const {
  makeServiceDirectories,
  createDockerComposeFile,
  createDockerFile,
  makeNatsDirectory
} = require("./cli/services")

const { runLiveCommand, runCommand } = require("./cli/system")

const { pathK8s, createConfigPath } = require("./cli/helper")

const main = async () => {
  switch (command) {
    case "init":
      init()
      break
    case "cmd":
    case "command":
      runContainerCommand()
      break
    case "kf":
    case "kubefile":
      deploymentFiles()
      break
    case "d":
    case "deploy":
      deploy()
      break
    case "pods":
      getPods()
      break
    case "down":
      down()
      break
    case "build":
      build()
      break
    case "logs":
      logs()
      break
    case "npm":
      npm()
      break
    case "npx":
      npx()
      break
    case "ingress":
      ingress()
      break
    case "delete":
      deletePod()
      break
    case "restart":
      restart()
      break
    case "df":
    case "dockerfile":
      dockerFiles()
      break
    case "docker":
      docker()
      break
    case "deps":
    case "deployments":
      getDeployments()
      break
    case "desc":
    case "describe":
      describe()
      break
    case "srvs":
    case "services":
      getServices()
      break
    case "help":
    case "h":
    default:
      help()
  }
}

const init = () => {
  deploymentFiles()
  dockerFiles()
}

const deploymentFiles = () => {
  removeDeploymentFiles().then(() => {
    Object.keys(services).forEach(key => {
      if (services[key].type === "client")
        createClientConfig(key, services[key])
      if (services[key].type === "api") {
        if (services[key].database) {
          createApiWithDbConfig(key, services[key])
        } else {
          createApiConfig(key, services[key])
        }
      }
    })

    createNatsConfig()
    if (secrets && secrets.length) CreateSecretsConfig(secrets)
  })
}

const dockerFiles = () => {
  makeServiceDirectories(services)
  makeNatsDirectory()
  Object.keys(services).forEach(key => {
    createDockerFile(key, services[key])
  })

  createDockerComposeFile(services)
}

const deploy = () => {
  const deploymentFilesPath = pathK8s()
  runLiveCommand(`kubectl apply -f ${deploymentFilesPath}`)
}

const down = () => {
  Object.keys(services).forEach(key => {
    runLiveCommand(`kubectl delete deployment ${key}-depl`)
    runLiveCommand(`kubectl delete service ${key}-srv`)
    if (services[key].database) {
      runLiveCommand(
        `kubectl delete deployment ${key}-${services[key].database.type}-depl`
      )
      runLiveCommand(
        `kubectl delete service ${key}-${services[key].database.type}-srv`
      )
      if (process.env.ENV === "development")
        runLiveCommand(
          `kubectl delete service ${key}-${services[key].database.type}-node-srv`
        )
    }
    if (process.env.ENV === "development")
      runLiveCommand(`kubectl delete service ${key}-node-srv`)
  })
  runLiveCommand(
    `kubectl delete deployment ${process.env.COMPOSE_PROJECT_NAME}-nats-depl`
  )
  runLiveCommand(
    `kubectl delete service ${process.env.COMPOSE_PROJECT_NAME}-nats-srv`
  )
  runLiveCommand(
    `kubectl delete secret ${process.env.COMPOSE_PROJECT_NAME}-secrets`
  )
  runLiveCommand(
    `kubectl delete ingress ${process.env.COMPOSE_PROJECT_NAME}-ingress-srv`
  )
}

const docker = () => {
  dockerFiles()
  build()
}

const getServices = () => {
  runCommand(`kubectl get services`)
}

const getDeployments = () => {
  runCommand(`kubectl get deployments`)
}

const getPods = () => {
  runCommand(`kubectl get pods`)
}

const describe = () => {
  runCommand(`kubectl describe ${args.join(" ")}`)
}

const deletePod = () => {
  runCommand(
    `kubectl get pods --no-headers -o custom-columns=":metadata.name"`,
    stdout => {
      stdout.split("\n").forEach((pod, index) => {
        const prefix = pod.slice(0, pod.indexOf("-depl"))
        if (!prefix.trim()) return
        if (!args.includes(prefix) && args.length !== 0) return
        runCommand(`kubectl delete pod ${pod}`)
      })
    }
  )
}

const logs = () => {
  const noDB = args.some(arg => arg === "nodb")
  runCommand(
    `kubectl get pods --no-headers -o custom-columns=":metadata.name"`,
    stdout => {
      const colors = [
        "\x1b[31m\x1b[40m",
        "\x1b[32m\x1b[40m",
        "\x1b[33m\x1b[40m",
        "\x1b[34m\x1b[40m",
        "\x1b[35m\x1b[40m",
        "\x1b[36m\x1b[40m",
        "\x1b[37m\x1b[40m",
        "\x1b[30m\x1b[41m",
        "\x1b[32m\x1b[41m",
        "\x1b[33m\x1b[41m",
        "\x1b[34m\x1b[41m",
        "\x1b[35m\x1b[41m",
        "\x1b[36m\x1b[41m",
        "\x1b[37m\x1b[41m",
        "\x1b[30m\x1b[42m",
        "\x1b[31m\x1b[42m",
        "\x1b[33m\x1b[42m",
        "\x1b[34m\x1b[42m",
        "\x1b[35m\x1b[42m",
        "\x1b[36m\x1b[42m",
        "\x1b[37m\x1b[42m",
        "\x1b[30m\x1b[43m",
        "\x1b[31m\x1b[43m",
        "\x1b[32m\x1b[43m",
        "\x1b[34m\x1b[43m",
        "\x1b[35m\x1b[43m",
        "\x1b[36m\x1b[43m",
        "\x1b[37m\x1b[43m",
        "\x1b[30m\x1b[44m",
        "\x1b[31m\x1b[44m",
        "\x1b[32m\x1b[44m",
        "\x1b[33m\x1b[44m",
        "\x1b[35m\x1b[44m",
        "\x1b[36m\x1b[44m",
        "\x1b[37m\x1b[44m",
        "\x1b[30m\x1b[45m",
        "\x1b[31m\x1b[45m",
        "\x1b[32m\x1b[45m",
        "\x1b[33m\x1b[45m",
        "\x1b[34m\x1b[45m",
        "\x1b[36m\x1b[45m",
        "\x1b[37m\x1b[45m"
      ]

      const servicesArray = Object.keys(services)
      const dbsArray = Object.keys(services)
        .map(key =>
          services[key].database
            ? `${key}-${services[key].database.type}`
            : null
        )
        .filter(db => db)

      const pods = stdout
        .split("\n")
        .map(pod => {
          const prefix = pod.slice(0, pod.indexOf("-depl"))
          if (!prefix.trim()) return
          if (!servicesArray.includes(prefix) && !dbsArray.includes(prefix))
            return
          if (noDB && !servicesArray.includes(prefix)) return
          return pod
        })
        .filter(pod => pod)

      pods.forEach((pod, index) => {
        const prefix = pod.slice(0, pod.indexOf("-depl"))

        if (!prefix.trim()) return
        if (!servicesArray.includes(prefix) && !dbsArray.includes(prefix))
          return
        if (noDB && !servicesArray.includes(prefix)) return

        runLiveCommand(`kubectl logs -f ${pod}`, sp => {
          sp.stdout.on("data", function (data) {
            data
              .toString()
              .split("\n")
              .forEach(line => {
                console.log(
                  `${colors[index]}%s\x1b[0m`,
                  `[${prefix}]`,
                  `${line}`
                )
              })
          })

          sp.stderr.on("data", function (data) {
            data
              .toString()
              .split("\n")
              .forEach(line => {
                console.log(
                  `${colors[index]}%s\x1b[0m`,
                  `[${prefix}]`,
                  `${line}`
                )
              })
          })
        })
      })
    }
  )
}

const npm = () => {
  const service = args[0]
  const arguments = args.slice(1)
  runCommand(
    `docker-compose run -v ${createConfigPath(
      service
    )}:/usr/src/${service} --rm ${service} npm ${arguments.join(" ")}`
  )
}

const runContainerCommand = () => {
  const service = args[0]
  const arguments = args.slice(1)
  runLiveCommand(
    `docker-compose run -v ${createConfigPath(
      service
    )}:/usr/src/${service} --rm ${service} ${arguments.join(" ")}`
  )
}

const npx = () => {
  const service = args[0]
  const arguments = args.slice(1)
  runCommand(
    `docker-compose run -v ${createConfigPath(
      service
    )}:/usr/src/${service} --rm ${service} npx ${arguments.join(" ")}`
  )
}

const restart = () => {
  Object.keys(services).forEach(key => {
    runLiveCommand(`kubectl rollout restart deployment ${key}-depl`)
    if (services[key].database)
      runLiveCommand(
        `kubectl rollout restart deployment ${key}-${services[key].database.type}-depl`
      )
  })
}

const build = () => {
  Object.keys(services).forEach(key => {
    try {
      runCommand(
        `docker rmi ${process.env.COMPOSE_PROJECT_NAME}_${key}:${version[0]}.${
          version[1]
        }.${parseInt(version[2]) - 1}`
      )
    } catch (err) {
      console.log(err.message)
    }
  })
  runCommand(`docker-compose build ${args.join(" ")}`)
}

const help = () => {
  line()
  header("help")
  line()
  helpItem("h, help", "show this help")
  helpItem("kf, kubefile", "create the k8s deployment objects file")
  helpItem("d, deploy", "Deploy k8s objects")
  helpItem("pods", "get k8s pods")
  helpItem("deps, deployments", "get k8s deployments")
  helpItem("srvs, services", "get k8s services")
  helpItem("desc, describe [object id]", "describe provided object")
  helpItem("down", "delete deps and services")
  helpItem("build [service_name]", "Build docker images")
  helpItem("dockerfile, df", "Build docker files")
  helpItem("docker", "Build docker files and then images")
  helpItem("logs [podID]", "get log of pod")
  helpItem("npm [service [npm command]]", "Run npm command on container")
  helpItem("npx [service [npm command]]", "Run npx command on container")
  helpItem("restart", "Restart k8s deployments")
  helpItem("ingress", "Apply ingress-srv.yml")
  helpItem("init", "after creating .env run to scaffold docker and k8s")
  helpItem("command [service [command]]", "Run command on specific container")
  line()
  line("=")
  line()
}

const header = text => {
  const width = process.stdout.columns
  const textLength = text.length + 4
  const overallSpaces = width - textLength
  let space = ""
  for (let i = 1; i <= overallSpaces / 2; i++) space += " "
  line("=")
  console.log(`${space}  ${text}  ${space}`)
  line("=")
}

const helpItem = (title, desc) => {
  const width = process.stdout.columns
  const textLength = title.length + desc.length
  const overallDashes = width - textLength - 4
  let dash = ""
  for (let i = 1; i <= overallDashes; i++) dash += "-"
  console.log(`${title}  ${dash}  ${desc}`)
  line()
}

const line = (char = " ") => {
  const width = process.stdout.columns
  let dash = ""
  for (let i = 1; i <= width; i++) dash += char
  console.log(`${dash}`)
}

main()
