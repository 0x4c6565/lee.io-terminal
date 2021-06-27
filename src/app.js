import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import './xterm.css';

const arg = require('arg');
const Command = require('./command');
const CommandCollection = require('./command-collection');
const ReadLinePlugin = require('./plugins/readline');

var term = new Terminal();
var fitAddon = new FitAddon();
term.open(document.getElementById('terminal')); 
term.setOption('theme', { 
    background: '#1E1E1E',
    foreground: '#ECECEC',
    blue: '#569CD6',
    cursor: '#ECECEC'
});
term.loadAddon(fitAddon);
term.element.style.padding = '10px'
term.element.children[0].style.overflowY = 'auto'

window.onload = function() {
    fitAddon.fit();
}

function leeioTerminal() {    
    this.promptText = 'lee.io > ';

    this.commandCollections = [];
    this.inputBuffer = '';
    this.cursorX = 0;
    this.history = [];
    this.historyScrollPos = 0;
    this.historyLimit = 100;
    this.lastExitCode = 0;
    this.plugins = [];
    this.currentPlugin = null;

    this._setCursor = function(pos) {
        if (pos > this.cursorX && pos <= this.inputBuffer.length) {
            term.write(`\x1b[${pos - this.cursorX}C`)
            this.cursorX = pos
            return
        }

        if (pos < this.cursorX && pos >= 0) {
            term.write(`\x1b[${this.cursorX - pos}D`)
            this.cursorX = pos
            return
        }
    }

    this._setCursorCurrent = function() {
        this._setCursor(this.cursorX)
    }

    this._setCursorStart = function() {
        this._setCursor(0)
    }

    this._setCursorEnd = function() {
        this._setCursor(this.inputBuffer.length)
    }

    this._setCursorLeft = function(repeat=1) {
        this._setCursor(this.cursorX - repeat)
    } 

    this._setCursorRight = function(repeat=1) {
        this._setCursor(this.cursorX + repeat)
    }

    this._clearLine = function() {
        term.write("\r\x1B[K");
        this.inputBuffer = '';
    }

    this._write = function(text) {
        term.write(text)
        this.inputBuffer = this.inputBuffer + text
        this.cursorX = this.inputBuffer.length
    }

    this._clearLineWrite = function(prefix="", text="") {
        this._clearLine();
        term.write(prefix);
        this._write(text)
    }

    this._prompt = function(text="") {
        this._clearLineWrite(this.promptText, text)
    }

    this._newLinePrompt = function(text) {
        term.write("\r\n");
        this._prompt(text)
    }

    this._writeAtCursor = function(text) {
        var cursorSuffix = this.inputBuffer.substr(this.cursorX);
        var output = this.inputBuffer.substr(0, this.cursorX) + text + cursorSuffix;
        
        this._prompt(output)
        if (cursorSuffix.length > 0) {
            this._setCursorLeft(cursorSuffix.length)
        }
    }

    this._deleteBeforeCursor = function() {
        var cursorSuffix = this.inputBuffer.substr(this.cursorX);
        var output = this.inputBuffer.substr(0, this.cursorX-1) + cursorSuffix;

        this._prompt(output)
        if (cursorSuffix.length > 0) {
            this._setCursorLeft(cursorSuffix.length)
        }
    }

    this._deleteAtCursor = function() {
        var cursorSuffix = this.inputBuffer.substr(this.cursorX + 1);
        var output = this.inputBuffer.substr(0, this.cursorX) + cursorSuffix;

        this._prompt(output)
        if (cursorSuffix.length > 0) {
            this._setCursorLeft(cursorSuffix.length)
        }
    }

    this._scrollHistoryPrevious = function() {
        if (this.history.length > 0) {
            if (this.historyScrollPos < this.history.length) {                        
                this.historyScrollPos++;
            }
            
            this._prompt(this.history[this.historyScrollPos-1])
        }
    }

    this._scrollHistoryNext = function() {
        if (this.history.length > 0 && this.historyScrollPos > 0) {
            this.historyScrollPos--;

            var output = ""
            if (this.historyScrollPos > 0) {                        
                output = this.history[this.historyScrollPos-1]
            }
            
            this._prompt(output)
        }
    }

    this._resolveCommand = function(command) {
        if (command !== "") {
            for (let i = 0; i < this.commandCollections.length; i++) {
                if (this.commandCollections[i].commandExists(command)) {
                    return this.commandCollections[i].getCommand(command);
                }
            }
        }

        return null
    }

    this._commandOutputFunc = function() {
        return {
            stdOut: function(text) {
                term.write(text)
            },
            stdErr: function(text) {
                term.write("\u001b[31;1m"+text+"\u001b[0m")
            },
            exit: function(code) {
                this.lastExitCode = code
            }
        }
    }

    this._processTabCompletion = function(commands, input) {
        var resolved = commands.filter(function (command) {
            if (command.startsWith("-") && !input.startsWith("-")) {
                return false;
            }
            return command.startsWith(input)
        });

        if (resolved.length == 0) {
            return;
        }

        if (resolved.length == 1) {
            var prefix = this.inputBuffer.substr(0, this.inputBuffer.lastIndexOf(" "));
            if (prefix.length > 0) {
                prefix = prefix + ' ';
            }
            this._prompt(prefix + resolved[0] + ' ')
            return;
        }

        term.write("\r\n"+resolved.join(' '))
        this._newLinePrompt(this.inputBuffer);
    }

    this._tabCompletion = function() {
        let inputBufferSplit = this.inputBuffer.split(' ')
        let command = inputBufferSplit.shift();

        if (inputBufferSplit.length == 0) {
            // Dealing with command (no args)

            var commands = [];
            this.commandCollections.forEach(commandCollection => {
                commands = commands.concat(Object.keys(commandCollection.getCommands()));
            });

            return this._processTabCompletion(commands, command)
        }

        // Dealing with resolved command
        var resolvedCommand = this._resolveCommand(command)
        if (resolvedCommand != null) {
            let completion = resolvedCommand.getCompletion();
            if (completion === undefined) {
                return;
            }

            var resolvedCompletion = completion;
            for (let i = 0; i < inputBufferSplit.length-1; i++) {
                resolvedCompletion = completion[inputBufferSplit[i]]
            }

            var commands = resolvedCompletion != undefined ? Object.keys(resolvedCompletion) : [];
            var input = inputBufferSplit.length > 0 ? inputBufferSplit[inputBufferSplit.length-1] : "";

            return this._processTabCompletion(commands, input)
        }
    }

    this.withCommandCollection = function(collection) {
        this.commandCollections.push(collection);
        return this
    }

    this.withPlugin = function(name, register, pluginClass) {
        this.plugins[name] = {
            "register": register,
            "pluginClass": pluginClass
        }
        return this
    }

    this.run = function() {
        term.onData(e => {            
            if (this.currentPlugin != null) {
                if (!this.currentPlugin.input(this, e)) {
                    return;
                }
            }            
            this.currentPlugin = null;

            switch (e) {                
                case '\r': // Enter/return
                    if (this.inputBuffer.length > 0) {
                        if (this.history.length > this.historyLimit) {
                            this.history.pop()
                        }
                        this.history.unshift(this.inputBuffer)
                        
                        let inputBufferSplit = this.inputBuffer.split(' ')
                        let command = inputBufferSplit.shift();
                        let resolvedCommand = this._resolveCommand(command);

                        if (resolvedCommand != null) {
                            resolvedCommand.execute(this._commandOutputFunc(), ...inputBufferSplit)
                        } else {
                            term.write(`\r\n${command}: command not found`);
                        }
                    }
                case '\u0003': // Ctrl+C
                    this._newLinePrompt();
                    this.historyScrollPos = 0;
                    break;
                case '\u007F': // Backspace
                    this._deleteBeforeCursor();
                    break;
                case '\x1b[3~': // Delete
                    this._deleteAtCursor();
                    break;
                case '\x1b[D': // Left arrow
                    this._setCursorLeft();
                    break;
                case '\x1b[C': // Right arrow
                    this._setCursorRight();  
                    break;
                case '\x1b[A': // Up arrow
                    this._scrollHistoryPrevious();
                    break;
                case '\x1b[B': // Down arrow
                    this._scrollHistoryNext();
                    break;
                case '\x1b[H': // Home
                    this._setCursorStart();
                    break;
                case '\x1b[F': // End
                    this._setCursorEnd();
                    break;
                case '\t': // Tab
                    this._tabCompletion();
                    break;
                default:
                    for (var plugin in this.plugins) {
                        if (this.plugins[plugin].register == e) {
                            this.currentPlugin = new this.plugins[plugin].pluginClass()
                            return this.currentPlugin.input(this, e)
                        }
                    }
                    
                    // Add characters to buffer (if e doesn't contain ansi escape codes)
                    if (!e.match(/(\x9B|\x1B\[)[0-?]*[ -\/]*[@-~]/)) {
                        return this._writeAtCursor(e);
                    }
            }
        });

        var internalCommandCollection = new CommandCollection();
        internalCommandCollection.addCommand("clear", 
            new Command(function() {
                term.reset();
            })
        );
        this.commandCollections.unshift(internalCommandCollection)

        term.write('Type \x1B[34mhelp\x1B[0m for help');
        this._newLinePrompt();
        term.focus();
    }
}

var commandCollection = new CommandCollection()

commandCollection.addCommand("about", 
    new Command(function(cmd) {
        cmd.stdOut("\r\nI'm Lee Spottiswood and I do Dev(Ops) shit\r\n"+
        "\r\nGithub: https://github.com/0x4c6565"+
        "\r\nGitLab: https://gitlab.com/0x4c6565"+
        "\r\nTwitter: https://twitter.com/leespottiswood")
    })
    .withSummary("Prints information about me")
    .withHelp("Prints information about me")
);

commandCollection.addCommand("help", 
    new Command(function(cmd, name) {
        if (name !== undefined && name !== "") {
            if (!commandCollection.commandExists(name)) {
                cmd.stdErr(`\r\nNo help entry for '${name}'`);
                cmd.exit(1)
                return;
            }
            cmd.stdOut('\r\n'+commandCollection.getCommand(name).getHelp());
            return
        }

        function getCommandNameMaxLength() {
            var length = 10;
            for (var commandName in commandCollection.getCommands()) {
                if (commandName.length > length) {
                    length = commandName.length
                }
            }
            return length
        }

        cmd.stdOut("\r\nCommands:\r\n");
        var commandPadLength = getCommandNameMaxLength();
        for (var commandName in commandCollection.getCommands()) {
            var command = commandCollection.getCommand(commandName);
            if (!command.getHidden()) {
                cmd.stdOut(`\r\n${commandName.padEnd(commandPadLength, ' ')} : ` + command.getSummary());
            }
        }

    })
    .withSummary("Prints help page. Use 'help <command>' to display help for a command")
    .withHelp("No u")
)

commandCollection.addCommand("tool", 
    new Command(function(cmd, name, ...args) {
        function doRequest(uri, decorateOutput=false) {        
            $.ajax({
                url: uri,
                dataType: 'text',
                success: function(data) {
                    var padding = '';
                    if (decorateOutput == true) {
                        padding = "\r\n";
                    }
                    cmd.stdOut(`${padding}\r\n${data.trim().replace(/\n/g, "\r\n")}${padding}`);
                },
                error: function(jqXHR) {
                    cmd.stdErr(`\r\nFailed with status '${jqXHR.status}': ${jqXHR.responseText}`);
                },
                async: false
            });
        }

        function executeTool(name, args) {
            var uri = (`https://lee.io/${name}/${args.join("/")}`).replace(/\/$/, "")
            doRequest(uri, true)
        }

        var tools = {
            "geoip": executeTool,
            "ip": function() { doRequest("https://ip.lee.io") },
            "ipv4": function() { doRequest("https://ipv4.lee.io") },
            "ipv6": function() { doRequest("https://ipv6.lee.io") },
            "port": executeTool,
            "ssl": executeTool,
            "subnet": executeTool,
            "whois": executeTool,
            "mac": executeTool,
            "selfsigned": executeTool,
            "keypair": executeTool,
            "pastebin": function() {window.open("https://p.lee.io")},
            "pw": function(name, args) {
                try{
                    var argsParsed = arg(
                        {
                            '--length': Number,
                            '--nosymbols': Boolean
                        }, {
                            argv: args
                        }
                    );
                } catch(e) {
                    cmd.stdErr(`\r\nInvalid args: ${e}`);
                    return
                }
                
                var uri = "https://pw.lee.io/"
                if (argsParsed["--length"] !== undefined) {
                    uri = uri + argsParsed["--length"];
                }                
                if (argsParsed["--nosymbols"] == true) {
                    uri = uri + "?nosymbols"
                }

                window.open(uri)
            },
            "convert": function() {window.open("https://convert.lee.io")},
        }

        if (name === undefined || name == "") {
            cmd.stdErr("\r\nNo tool name provided. See help for more info");
            return
        }

        if (!(name in tools)) {
            cmd.stdErr(`\r\nInvalid tool '${name}'. See help for more info`);
            return
        }

        tools[name](name, args)
    })
    .withCompletion({
        "geoip":{},
        "ip":{},
        "ipv4":{},
        "ipv6":{},
        "port":{},
        "ssl":{},
        "subnet":{},
        "whois":{},
        "mac":{},
        "selfsigned":{},
        "keypair":{},
        "pastebin":{},
        "pw":{
            "--length":{},
            "--nosymbols":{}
        },
        "convert":{}
    })
    .withSummary("Executes a tool. See help for more info")
    .withHelp(  "# GeoIP information - Retrieves GeoIP information for source or provided ip/host\r\nUsage: tool geoip <optional: ip/host>\r\n\r\n"+
                "# IP information - Retrieves IP address\r\nUsage: tool ip|ipv4|ipv6\r\n\r\n"+
                "# Port checker - Checks TCP connectivity to specified port to source or provided ip/host\r\nUsage: tool port <port> <optional: ip/host>\r\n\r\n"+
                "# SSL validator - Retrieves SSL information for ip/host\r\nUsage: tool ssl <ip/host>\r\n\r\n"+
                "# Subnet calculator  - Subnet calculator for provided ip + cidr/mask\r\nUsage: tool subnet <ip> <cidr/mask>\r\n\r\n"+
                "# WHOIS information - WHOIS information for source or provided ip/host\r\nUsage: tool whois <optional: ip/host>\r\n\r\n"+
                "# MAC address lookup - Lookup vendor for provided MAC address\r\nUsage: tool mac <mac>\r\n\r\n"+
                "# Self-signed certificate generator - Generate self-signed certificate for specified DN\r\nUsage: tool selfsigned <dn> <optional: days>\r\n\r\n"+
                "# RSA Keypair generator - Generates RSA keypair (for dev only)\r\nUsage: tool keypair <optional: comment>\r\n\r\n"+
                "# Pastebin - Opens pastebin in new tab\r\nUsage: tool pastebin\r\n\r\n"+
                "# Password generator - Opens password generator in new tab\r\nUsage: tool pw [--length <int>] [--nosymbols]\r\n\r\n"+
                "# Converter - Opens converter in new tab\r\nUsage: tool convert")
)

var terminal = new leeioTerminal()
    .withCommandCollection(commandCollection)
    .withPlugin('readline', '\u0012', ReadLinePlugin)
        .run()