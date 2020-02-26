#!/usr/bin/env node
/* eslint-disable no-console */
const { spawn } = require("child_process");
const EventEmitter = require("events");
const logUpdate = require("log-update");
const cliSpinners = require("cli-spinners");
const chalk = require("chalk");
const args = require("args");

const emitter = new EventEmitter();
const getEpoch = () => Math.floor(new Date() / 1000);
const startTime = getEpoch();

const { interval: spinnerInterval, frames: spinnerFrames } = cliSpinners.dots;
const getSpinnerFrame = offset => spinnerFrames[offset % spinnerFrames.length];

let repos = [];
let failures = [];
const pool = [];
let cursor = 0;

const { parallelism, repos: reposAsOpts } = args
  .option("parallelism", "Number of parallel clones", 3)
  .option("repos", "Comma-separated list of repos to clone")
  .parse(process.argv);

const getPoolCapacity = () => Math.min(parallelism, repos.length);
const splitInput = str =>
  str
    .split(str.indexOf(",") >= 0 ? "," : "\n")
    .filter(Boolean)
    .map(itm => itm.trim());

const cloneNextRepo = () => {
  if (cursor >= repos.length) {
    return;
  }
  const repo = repos[cursor];
  const proc = spawn("git", ["clone", `git@github.com:${repo}`], {
    stdio: "ignore"
  });
  cursor += 1;

  pool.push([repo, proc]);
  proc.on("exit", code => {
    const workerIndex = pool.findIndex(item => item[1] === proc);
    pool.splice(workerIndex, 1);
    if (code > 0) {
      failures.push(repo);
    }
    if (cursor === repos.length) {
      if (pool.length === 0) {
        emitter.emit("complete");
      }
    } else {
      cloneNextRepo();
    }
  });
};

const awaitRepoList = repoArg => {
  const { stdin } = process;
  stdin.setEncoding("utf8");
  let data = "";

  return new Promise((resolve, reject) =>
    repoArg
      ? resolve(repoArg)
      : stdin
          .on("data", function(chunk) {
            data += chunk;
          })
          .on("end", function() {
            resolve(data);
          })
          .on("error", reject)
  );
};

let currentFrame = 0;
const interval = setInterval(() => {
  currentFrame += 1;
  logUpdate(
    [
      `${chalk.blue(getSpinnerFrame(currentFrame - 1))} cloned ${cursor -
        pool.length} / ${repos.length}`,
      ...pool.map(
        ([repo], workerIndex) =>
          `${chalk.white(getSpinnerFrame(workerIndex + currentFrame))} ${repo}`
      )
    ].join("\n")
  );
}, spinnerInterval);

emitter.on("complete", () => {
  clearInterval(interval);
  logUpdate.clear();
  if (failures.length) {
    console.log(
      [
        chalk.red(`failed to clone ${failures.length} repos:`),
        ...failures,
        ""
      ].join("\n")
    );
  }
  const runtime = getEpoch() - startTime;
  console.log(
    `✨ ${repos.length - failures.length} repos cloned in ${runtime} seconds`
  );
});

const startPool = () => {
  Array(getPoolCapacity())
    .fill(0)
    .forEach(cloneNextRepo);
};

awaitRepoList(reposAsOpts)
  .then(
    data =>
      repos.splice(0, 0, ...splitInput(data).map(val => val.trim())) && repos
  )
  .then(startPool);
