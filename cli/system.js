const { spawn, exec } = require("child_process")

const runLiveCommand = (command, callback = null) => {
  if (process.env.HOST_OS !== "win") {
    command = command.split(" ")
    command.unshift("unbuffer")
    command = command.join(" ")
  }

  const main = command.split(" ")[0]
  const params = command.split(" ").slice(1)
  console.log(command)
  const sp = spawn(main, params)

  if (callback) {
    callback(sp)
    return
  }

  sp.stdout.on("data", function (data) {
    data
      .toString()
      .split("\n")
      .forEach(line => {
        console.log(line)
      })
  })

  sp.stderr.on("error", function (data) {
    data
      .toString()
      .split("\n")
      .forEach(line => {
        console.log(line)
      })
  })

  sp.on("error", err => {
    console.error("Failed to start subprocess.", command)
  })
}

const runCommand = (command, callback = null) => {
  if (process.env.HOST_OS !== "win") {
    command = command.split(" ")
    command.unshift("unbuffer")
    command = command.join(" ")
  }

  exec(command, (error, stdout, stderr) => {
    if (error) {
      if (callback) {
        callback(stdout)
        return
      }

      console.log("Error: ", error.message)
      return
    }

    if (stderr) {
      if (callback) {
        callback(stdout)
        return
      }

      console.log("Error: ", stderr)
      return
    }

    if (callback) {
      callback(stdout)
      return
    }
    console.log(stdout)
  })
}

module.exports = {
  runLiveCommand,
  runCommand
}
