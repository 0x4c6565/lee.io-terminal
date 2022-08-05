

let aboutCommand = new Command(async function(cmd) {
    cmd.stdOut("I'm Lee Spottiswood and I do Dev(Ops) shit\n"+
    "\nGithub: https://github.com/0x4c6565"+
    "\nGitLab: https://gitlab.com/0x4c6565"+
    "\nTwitter: https://twitter.com/leespottiswood\n")
}).withSummary("Prints information about me")
  .withHelp("Prints information about me")

let toolCommand = new Command(async function(cmd, name, ...args) {
    async function doRequest(uri, decorateOutput=false) {
        try {
            let response = await fetch(uri);
            let responseText = await response.text();
            if (response.ok) {
                let padding = '';
                if (decorateOutput == true) {
                    padding = "\n";
                }
                cmd.stdOut(`${padding}${responseText.trim()}${padding}\n`);
                return 0;
            } else {
                cmd.stdErr(`Upstream error: ${responseText}\n`)
                return 1;
            }
        } catch (e) {
            cmd.stdErr(`Error: ${e}\n`)
            return 1;
        }
    }

    async function executeTool(name, args) {
        let uri = (`https://lee.io/${name}/${args.join("/")}`).replace(/\/$/, "")
        return await doRequest(uri, true)
    }

    let tools = {
        "geoip": executeTool,
        "ip": async function() { await doRequest("https://ip.lee.io") },
        "ipv4": async function() { await doRequest("https://ipv4.lee.io") },
        "ipv6": async function() { await doRequest("https://ipv6.lee.io") },
        "port": executeTool,
        "ssl": executeTool,
        "subnet": executeTool,
        "whois": executeTool,
        "mac": executeTool,
        "selfsigned": executeTool,
        "keypair": executeTool,
        "pastebin": function() {window.open("https://p.lee.io")},
        "pw": function(name, args) {
            let argsParsed = parseArg(args ? args.join(' ') : "")
            let uri = "https://pw.lee.io/"
            if (argsParsed.length !== undefined && typeof argsParsed.length === 'number') {
                uri = uri + argsParsed.length;
            }                
            if (argsParsed.nosymbols == true) {
                uri = uri + "?nosymbols"
            }

            window.open(uri)
        },
        "convert": function() {window.open("https://convert.lee.io")},
    }

    if (name === undefined || name == "") {
        cmd.stdErr("No tool name provided. See help for more info\n");
        return 1;
    }

    if (!(name in tools)) {
        cmd.stdErr(`Invalid tool '${name}'. See help for more info\n`);
        return 1;
    }

    return await tools[name](name, args)
}).withSummary("Executes a tool. See help for more info")
  .withHelp(  "# GeoIP information - Retrieves GeoIP information for source or provided ip/host\nUsage: tool geoip <optional: ip/host>\n\n"+
            "# IP information - Retrieves IP address\nUsage: tool ip|ipv4|ipv6\n\n"+
            "# Port checker - Checks TCP connectivity to specified port to source or provided ip/host\nUsage: tool port <port> <optional: ip/host>\n\n"+
            "# SSL validator - Retrieves SSL information for ip/host\nUsage: tool ssl <ip/host>\n\n"+
            "# Subnet calculator  - Subnet calculator for provided ip + cidr/mask\nUsage: tool subnet <ip> <cidr/mask>\n\n"+
            "# WHOIS information - WHOIS information for source or provided ip/host\nUsage: tool whois <optional: ip/host>\n\n"+
            "# MAC address lookup - Lookup vendor for provided MAC address\nUsage: tool mac <mac>\n\n"+
            "# Self-signed certificate generator - Generate self-signed certificate for specified DN\nUsage: tool selfsigned <dn> <optional: days>\n\n"+
            "# RSA Keypair generator - Generates RSA keypair (for dev only)\nUsage: tool keypair <optional: comment>\n\n"+
            "# Pastebin - Opens pastebin in new tab\nUsage: tool pastebin\n\n"+
            "# Password generator - Opens password generator in new tab\nUsage: tool pw [--length <int>] [--nosymbols]\n\n"+
            "# Converter - Opens converter in new tab\nUsage: tool convert")

new Terminal(document.getElementById("terminal"))
    .withCommand("about", aboutCommand)
    .withCommand("tool", toolCommand)
    .run();