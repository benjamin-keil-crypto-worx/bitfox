module.exports.getConfig = ()=>{
    return {
        // `url` is the server URL that will be used for the request
        url: "",

        // Base Url
        baseUrl: "",
        // `method` is the request method to be used when making the request
        method: '', // default

        // `headers` are custom headers to be sent
        headers: {},

        // `params` are the URL parameters to be sent with the request
        // Must be a plain object or a URLSearchParams object
        params: {},

        data: {},


        // `timeout` specifies the number of milliseconds before the request times out.
        // If the request takes longer than `timeout`, the request will be aborted.
        timeout: 10000, // default is `0` (no timeout)


        // `responseType` indicates the type of data that the server will respond with
        // options are: 'arraybuffer', 'document', 'json', 'text', 'stream'
        //   browser only: 'blob'
        responseType: 'json', // default

        // `responseEncoding` indicates encoding to use for decoding responses (Node.js only)
        // Note: Ignored for `responseType` of 'stream' or client-side requests
        responseEncoding: 'utf8', // default
    }
}