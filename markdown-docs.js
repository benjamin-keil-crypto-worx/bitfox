'use strict'
let args = require('minimist')(process.argv.slice(2));
const conf = require("./config/doc-conf.json");

let tmpl = `[![view on npm](https://img.shields.io/npm/v/bitfox.svg?maxAge=2592000)](https://www.npmjs.com/package/bitfox)
[![downloads](https://img.shields.io/npm/dt/bitfox.svg?maxAge=2592000)](https://www.npmjs.com/package/bitfox)


\`\`\`
bitfox
version 0.0.3
\`\`\`

{{>main}}

* * *

&copy; 2023 Benjamin Keil team.cryptoworx@gmail.com All rights reserved,
`
const jsdoc2md = require('jsdoc-to-markdown')
const fs = require('fs')
const path = require('path')

const outputBaseDir = "./docs/md"

Object.keys(conf).forEach( key =>{
    let basePath = conf[key].path;
    let outPath = `${outputBaseDir}/${conf[key].outDir}`
    conf[key].files.forEach( file =>{
        let templateData = jsdoc2md.getTemplateDataSync({ files: `${basePath}/${file}` })
        let classNames = templateData.reduce((classNames, identifier) => {
            if (identifier.kind === 'class') classNames.push(identifier.name)
            return classNames
        }, [])

        /* create a documentation file for each class */
        for (const className of classNames) {
            const template = tmpl
            console.log(`rendering ${className}, template: ${template}`)
            const output = jsdoc2md.renderSync({ data: templateData, template: template })
            fs.writeFileSync(path.resolve(outPath, `${className}.md`), output)
        }
    })
})
/* get template data */
