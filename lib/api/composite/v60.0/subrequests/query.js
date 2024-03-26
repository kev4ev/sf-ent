const { CompositeSubRequest } = require("../../../../types");

class Query extends CompositeSubRequest{
    constructor(referenceId, query){
        super(referenceId, 'GET', `/?q=${query}`);
    }

    get [CompositeSubRequest.responseAccessorParts](){
        const topKeys = [ 'totalSize', 'done', 'nextRecordsUrl', 'records', 'records[' /** for post result() validation */ ],
            topKeysStr = topKeys.join(' | ');
        let topInput, topIsRecords = false;
        return [
            { 
                name: 'level0', 
                message: `Top accessor: ${topKeysStr}`, 
                hint: topKeysStr,
                validate: (raw, state, item) => {
                    if(item.input){
                        topInput = item.input;
                        topIsRecords = item.input === topKeys[3] || item.input === topKeys[4];
                        
                        return topKeys.includes(item.input) || `Must be one of ${topKeysStr}`;
                    }
                    
                    return true;
                }, 
                result: (raw, state, item) => {
                    if(topIsRecords && item?.input === 'records'){
                        item.input += '[';
                    }

                    return item.input;
                }
            },
            {
                name: 'level1',
                message: 'Sub-accessor',
                validate: (raw, state, item) => {
                    if(!topIsRecords && item?.input?.length){
                        console.warn(`${topInput} has no second-level selectors; clearing input`);
                        item.input = ''; // no 2nd level accessors
                    }
                    
                    if(item?.input?.length){
                        return item.input.search(/^\d{1,}$/) > -1 ? true : 'records item selector must be an integer';
                    }
                    
                    return true;
                },
                result: (raw, state, item) => {
                    if(item.input){
                        item.input += '].';
                    }

                    return topIsRecords ? item.input : '}';
                }
            }
        ];
    }

    static basePath(){
        return '/query/';
    }
}

module.exports = Query;