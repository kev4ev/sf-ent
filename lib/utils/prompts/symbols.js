/**
 * @module
 */

/**
 * Returns hash of standardized symbols used accross various prompts. Symbols are registered in the global
 * scope and, as such, their string values are available using Symbol.keyFor()
 * @returns {Object.<string, Symbol>} hash of global prompt symbols
 */
module.exports = {
    cancel: Symbol.for('<cancel>'),
    done: Symbol.for('<done>'),
    allFields: Symbol.for('*'),
    atReference: Symbol.for('@'),
    assist: Symbol.for('!')
}