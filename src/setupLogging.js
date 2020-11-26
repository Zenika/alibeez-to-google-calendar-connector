import * as util from "util";

const IS_PRODUCTION = process.env.NODE_ENV === "production";

const PRODUCTION_LOGGING_CONFIG = {
  depth: Infinity,
  breakLength: Infinity,
};

const DEVELOPMENT_LOGGING_CONFIG = {};

const LOGGING_CONFIG = IS_PRODUCTION
  ? PRODUCTION_LOGGING_CONFIG
  : DEVELOPMENT_LOGGING_CONFIG;

export function setupLogging() {
  Object.assign(util.inspect.defaultOptions, LOGGING_CONFIG);
}
