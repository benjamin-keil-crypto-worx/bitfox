let colors = require("colors")
function style(s, style) {
    return style + s + '\x1b[0m'
}

let banner = `
            ${"BitFox".grey}
             🦊           
`
function main () {
        console.log(banner)
        console.log("Thanks for installing bitfox".yellow+ ' 🙏 \n')
        console.log("");
        console.log('Please consider donating '.grey)
        console.log('to help us maintain this package.'.grey)
        console.log("")
        console.log('For Issues and Bugs please visit:'.grey, "https://github.com/benjamin-keil-crypto-worx/bitfox/issues".cyan)
        console.log("")
        console.log('👉 '+ "Donate:" + ' 🦊')
        console.log('    Bitcoin :'.yellow + "bc1qs6rvwnx0wlrqlncm90kk7mu0xs6980t85avfll".grey)
        console.log('    Ethereum:'.blue+ "0x088667d218f5E5c4560cdcf21c4bd2b2377Df0C9".grey)
        console.log("")
        console.log("Warning!".red.bold, "\n");
        console.log("This version of bitfox is in beta and has been published to undergo a UAT and QA cycle\nUse this tool and library at your own risk!\n".magenta);
        console.log("");
}

main()
