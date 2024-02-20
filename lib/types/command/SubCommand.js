const Diviner = require('./Diviner');

/**
 * A SubCommand differs from a Command in the following:
 *   (1) it must return its parent Command's API in getSubDiviners(), and
 *   (2) it does not have a done() method to be called; it completes as soon as execute() or executeInteractive()
 *   completes.
 * 
 * As a result, SubCommands MUST have this.parent as a Command and CANNOT themselves have subcommands.
 */
class SubCommand extends Diviner{
    
    /**
     * A SubCommand MUST return the subDiviners hash of its parent plus it's parent's done() method, such
     * that the parent's subdiviner api can be chained until done() is called
     */
    getSubDiviners(){
        return Object.assign(
            this.parent.getSubDiviners() || {}, 
            { done: this.parent.done.bind(this.parent) }
        );
    }
}

module.exports = SubCommand;