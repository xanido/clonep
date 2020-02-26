/* eslint-disable no-console */
const { spawn } = require("child_process");
const EventEmitter = require("events");
const logUpdate = require("log-update");
const cliSpinners = require("cli-spinners");
const chalk = require("chalk");

const emitter = new EventEmitter();
const getEpoch = () => Math.floor(new Date() / 1000);
const startTime = getEpoch();

const { interval: spinnerInterval, frames: spinnerFrames } = cliSpinners.dots;
const getSpinnerFrame = offset => spinnerFrames[offset % spinnerFrames.length];

const repos = [];

const POOL_CAPACITY = Math.min(6, repos.length);
const pool = [];
let cursor = 0;

const cloneNextRepo = () => {
  cursor += 1;
  const repo = repos[cursor];
  const proc = spawn("git", ["clone", `git@github.com:${repo}`], {
    stdio: "ignore"
  });

  if (cursor >= repos.length) {
    return;
  }

  pool.push([repo, proc]);
  proc.on("exit", () => {
    const workerIndex = pool.findIndex(item => item[1] === proc);
    pool.splice(workerIndex, 1);
    if (cursor === repos.length) {
      if (pool.length === 0) {
        emitter.emit("complete");
      }
    } else {
      cloneNextRepo();
    }
  });
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
          `${chalk.white(
            getSpinnerFrame(workerIndex + currentFrame)
          )} ${repo}...`
      )
    ].join("\n")
  );
}, spinnerInterval);

emitter.on("complete", () => {
  clearInterval(interval);
  logUpdate.clear();
  console.log(
    `✨ ${repos.length} repos cloned in ${getEpoch() - startTime} seconds`
  );
});

Array(POOL_CAPACITY)
  .fill(0)
  .forEach(cloneNextRepo);
