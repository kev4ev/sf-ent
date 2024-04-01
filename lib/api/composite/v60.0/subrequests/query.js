const { CompositeSubRequest } = require("../../../../types");

class Query extends CompositeSubRequest{
    constructor(referenceId, query){
        super(referenceId, 'GET', `/?q=${query}`);
    }

    get [CompositeSubRequest.responseAccessorParts](){
        const topKeys = [ 'totalSize', 'done', 'nextRecordsUrl', 'records' ],
            topKeysStr = topKeys.join(' | '),
            recRegex = /^(records)\[\d{1,}\]\.[A-Z]{1}[\w\d]+$/g;
        return [
            { 
                name: 'responseField', 
                message: `Response fields: ${topKeysStr}`, 
                hint: topKeysStr,
                validate: (raw) => {
                    raw = raw?.trim?.();
                    if(raw?.length){
                        if(raw.startsWith(topKeys[3])){
                            return raw.search(recRegex) > -1 ?
                                true :
                                'Issue with records field format. Ensure format records[\d].FieldName where FieldName is proper-cased';
                        } else{
                            return topKeys.includes(raw) ? 
                                true :
                                `Fields ${topKeys.slice(0,2).join(', ')} do not include any sub-fields`;
                        }
                    }
                }
            }
        ];
    }

    static basePath(){
        return '/query/';
    }
}

module.exports = Query;