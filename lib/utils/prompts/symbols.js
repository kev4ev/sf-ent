/**
 * @module
 */

/**
 * @returns {Object.<string, Symbol> standardized special symbols used accross various prompts}
 */
module.exports = {
    done: Symbol('<done>'),
    allFields: Symbol('* (all fields)'),
    atReference: Symbol('@')
}