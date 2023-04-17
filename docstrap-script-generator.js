const conf = require("./config/doc-conf.json");
const outputBaseDir = "./docs/docstrap"

const path = require("path");
Object.keys(conf).forEach( key =>{
    let basePath = conf[key].path;

    conf[key].files.forEach( file  =>{
       console.log(`jsdoc ${basePath}/${file} -t ./node_modules/ink-docstrap/template  -d ${outputBaseDir}/${file.replace(".js","")}`)
    })
})
