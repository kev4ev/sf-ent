// all top-level Commands
const Generate = require('./generate');
const { eagerDiviner } = require('../types/Diviner');

module.exports = {
    Generate,
    eager: {
        generate: eagerDiviner(Generate)
    }
}