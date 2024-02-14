const Diviner = require('./Diviner');

/**
 * A SubCommand differs from a Command only in that it must return its parent Command's API 
 * in getSubDiviners(). This is to enable appropriate chaining and to ensure the parent's done() method
 * is exposed to external callers. 
 * 
 * As a result, SubCommands MUST have this.parent as a Command and CANNOT themselves have subcommands.
 */
class SubCommand extends Diviner{
    constructor(args){
        super(args);
    }
    
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