module.exports = (version, refId, query) => {
    return {
        method: 'GET',
        url: `/services/data/${version}/query/?q=${query}`,
        referenceId: refId
    };
}