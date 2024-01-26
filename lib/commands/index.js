/** @module */

// all top-level Commands
const Generate = require('./generate');
const { eagerDiviner } = require('../types/Diviner');

/** @type {TopCommands} */
module.exports = {
    Generate,
    eager: {
        generate: eagerDiviner(Generate)
    }
}

/**
 * @typedef {object} TopCommands
 * @property {Generate} Generate
 * @property {Object.<string, Function>} eager
 */