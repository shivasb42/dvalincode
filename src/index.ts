#!/usr/bin/env node
import { runCli } from './cli.js';

runCli(process.argv).catch(error => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`dvalincode: ${message}`);
  process.exitCode = 1;
});

