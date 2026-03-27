/**
 * About command - Displays information about Lee Spottiswood
 * @type {Command}
 */
const aboutCommand = new Command(async function(cmd) {
    cmd.stdOut("I'm Lee Spottiswood and I do Dev(Ops) shit\n"+
    "\nGithub: https://github.com/0x4c6565"+
    "\nGitLab: https://gitlab.com/0x4c6565\n");
    return 0;
}).withSummary("Prints information about me")
  .withHelp("Prints information about me");

/**
 * Tool command - Executes various utility commands via lee.io services
 * @type {Command}
 */
const toolCommand = new Command(async function(cmd, name, ...args) {
    /**
     * Make HTTP request to a URI
     * @async
     * @param {string} uri - The URI to request
     * @param {boolean} decorateOutput - Whether to add padding around output
     * @returns {Promise<number>} Exit code (0 for success, 1 for error)
     */
    async function doRequest(uri, decorateOutput = false) {
        try {
            const response = await fetch(uri);
            const responseText = await response.text();
            if (response.ok) {
                const padding = decorateOutput ? "\n" : "";
                cmd.stdOut(`${padding}${responseText.trim()}${padding}\n`);
                return 0;
            } else {
                cmd.stdErr(`Upstream error: ${responseText}\n`);
                return 1;
            }
        } catch (error) {
            cmd.stdErr(`Error: ${error.message}\n`);
            return 1;
        }
    }

    /**
     * Execute a tool by building its URI from arguments
     * @async
     * @param {string} toolName - The tool name
     * @param {string[]} toolArgs - Tool arguments
     * @returns {Promise<number>} Exit code
     */
    async function executeTool(toolName, toolArgs) {
        const uri = (`https://lee.io/${toolName}/${toolArgs.join("/")}`).replace(/\/$/, "");
        return await doRequest(uri, true);
    }

    // Define available tools
    const tools = {
        "geoip": executeTool,
        "ip": async () => await doRequest("https://ip.lee.io"),
        "ipv4": async () => await doRequest("https://ipv4.lee.io"),
        "ipv6": async () => await doRequest("https://ipv6.lee.io"),
        "port": executeTool,
        "ssl": executeTool,
        "subnet": executeTool,
        "whois": executeTool,
        "mac": executeTool,
        "selfsigned": executeTool,
        "keypair": executeTool,
        "pastebin": () => { window.open("https://p.lee.io"); return 0; },
        "pw": (toolName, toolArgs) => {
            const argsParsed = parseArg(toolArgs ? toolArgs.join(' ') : "");
            let uri = "https://pw.lee.io/";
            if (argsParsed.length !== undefined && typeof argsParsed.length === 'number') {
                uri += argsParsed.length;
            }
            if (argsParsed.nosymbols === true) {
                uri += "?nosymbols";
            }
            window.open(uri);
            return 0;
        },
        "convert": () => { window.open("https://convert.lee.io"); return 0; }
    };

    // Validate tool name
    if (name === undefined || name === "") {
        cmd.stdErr("No tool name provided. See help for more info\n");
        return 1;
    }

    if (!(name in tools)) {
        cmd.stdErr(`Invalid tool '${name}'. See help for more info\n`);
        return 1;
    }

    return await tools[name](name, args);
}).withSummary("Executes a tool. See help for more info")
  .withHelp(
    "# GeoIP information - Retrieves GeoIP information for source or provided ip/host\n"+
    "Usage: tool geoip <optional: ip/host>\n\n"+
    "# IP information - Retrieves IP address\n"+
    "Usage: tool ip|ipv4|ipv6\n\n"+
    "# Port checker - Checks TCP connectivity to specified port to source or provided ip/host\n"+
    "Usage: tool port <port> <optional: ip/host>\n\n"+
    "# SSL validator - Retrieves SSL information for ip/host\n"+
    "Usage: tool ssl <ip/host>\n\n"+
    "# Subnet calculator - Subnet calculator for provided ip + cidr/mask\n"+
    "Usage: tool subnet <ip> <cidr/mask>\n\n"+
    "# WHOIS information - WHOIS information for source or provided ip/host\n"+
    "Usage: tool whois <optional: ip/host>\n\n"+
    "# MAC address lookup - Lookup vendor for provided MAC address\n"+
    "Usage: tool mac <mac>\n\n"+
    "# Self-signed certificate generator - Generate self-signed certificate for specified DN\n"+
    "Usage: tool selfsigned <dn> <optional: days>\n\n"+
    "# RSA Keypair generator - Generates RSA keypair (for dev only)\n"+
    "Usage: tool keypair <optional: comment>\n\n"+
    "# Pastebin - Opens pastebin in new tab\n"+
    "Usage: tool pastebin\n\n"+
    "# Password generator - Opens password generator in new tab\n"+
    "Usage: tool pw [--length <int>] [--nosymbols]\n\n"+
    "# Converter - Opens converter in new tab\n"+
    "Usage: tool convert"
  );

/**
 * Initialize the terminal and register commands
 */
document.addEventListener('DOMContentLoaded', () => {
    new Terminal(document.getElementById("terminal"))
        .withCommand("about", aboutCommand)
        .withCommand("tool", toolCommand)
        .run();
});