/** @typedef {import('jsforce').Connection} Connection */

/**
 * @typedef {object} EntOptions 
 * @property {boolean} interactive when true, Ent will await user input for each node
 * @property {string} out path of the file to write payload request to
 * @property {string} in path of file to read/modify existing request from
 * @property {Connection} [Connection] an authorized jsforce Connection instance; when undefined, env vars 
 * will be used to initialize a new instance
 */



