const Diviner = require('./Diviner');

/**
 * A SubCommand may be invoked only via a parent Command's getSubDiviners() hash. It also differs as follows:
 *   (1) it MUST return it's parent Command's getSubDiviners() to allow proper chaining
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

    /** by default execution in interactive and non-interactive mode will be the same */
    async executeInteractive(){ return await this.execute(); }
    async execute(){ return await this.finish(); }
    /** 
     * MUST be implemented by subclasses 
     * @returns {Promise<any>}
     */
    async finish(){ this._throwNotImplemented('SubCommand has not properly implemented finish'); }
}

module.exports = SubCommand;