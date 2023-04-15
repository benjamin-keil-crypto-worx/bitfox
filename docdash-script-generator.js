const conf = require("./config/doc-conf.json");
const outputBaseDir = "./docs/docdash"

const path = require("path");
Object.keys(conf).forEach( key =>{
    let basePath = conf[key].path;

    conf[key].files.forEach( file  =>{
       console.log(`jsdoc ${basePath}/${file} -t ./node_modules/docdash  -d ${outputBaseDir}/${file.replace(".js","")}`)
    })
})
