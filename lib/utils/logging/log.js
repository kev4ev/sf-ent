const log = require('debug')('sf-entish');

module.exports = log;

/**
 * formatters: {@see https://www.npmjs.com/package/debug}
 *  %O	Pretty-print an Object on multiple lines.
 *  %o	Pretty-print an Object all on a single line.
 *  %s	String.
 *  %d	Number (both integer and float).
 *  %j	JSON. Replaced with the string '[Circular]' if the argument contains circular references.
 *  %%	Single percent sign ('%'). This does not consume an argument.
 */
