module.exports = {
    create: require('./SObjectPOST'),
    read: require('./SObjectGET'),
    readByExternalId: require('./SObjectGET').byExternalId, 
    update: require('./SObjectPATCH'),
    delete: require('./SObjectDELETE'),
    deleteByExternalId: require('./SObjectDELETE').byExternalId
}