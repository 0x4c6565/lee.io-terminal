import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import './xterm.css';

var term = new Terminal();
var fitAddon = new FitAddon();
term.open(document.getElementById('terminal')); 
term.setOption('theme', { 
    background: '#1E1E1E',
    foreground: '#ECECEC',
    blue: '#569CD6',
    cursor: '#ECECEC'
});
term.element.style.padding = '10px'
term.loadAddon(fitAddon);
fitAddon.fit();

function Command(func) {
    this.func = func

    this.withFunc = function(func) {
        this.func = func
        return this
    }

    this.withSummary = function(summary) {
        this.summary = summary
        return this
    }

    this.withHelp = function(help) {
        this.help = help
        return this
    }

    this.withHidden = function() {
        this.hidden = true
        return this
    }

    this.getHelp = function() {
        return this.help
    }

    this.getSummary = function() {
        return this.summary
    }

    this.getHidden = function() {
        return this.hidden
    }

    this.execute = function(cmd, ...args) {
        return this.func(cmd, ...args)
    }
}

function CommandCollection() {
    this._commands = [];

    this.addCommand = function(name, cmd) {
        if (!this.commandExists(name)) {
            this._commands[name] = cmd
        }
    }

    this.commandExists = function(name) {
        return (name in this._commands);
    }

    this.getCommand = function(name) {
        if (this.commandExists(name)) {
            return this._commands[name];
        }

        return undefined;
    },

    this.getCommands = function() {
        return this._commands
    }
}

function leeioTerminal() {    
    this.promptText = 'lee.io > ';

    this.commandCollection = null;
    this.internalCommandCollection = new CommandCollection();
    this.inputBuffer = '';
    this.cursorX = 0;
    this.history = [];
    this.historyScrollPos = 0;
    this.historyLimit = 100;
    this.lastExitCode = 0;

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

    this._prompt = function(text="") {
        term.write("\r\x1B[K" + this.promptText + text);
        this.inputBuffer = text
        this.cursorX = text.length
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

    this.withCommandCollection = function(collection) {
        this.commandCollection = collection
        return this
    }

    this.run = function() {
        term.onData(e => {
            switch (e) {                
                case '\r': // Enter/return
                    if (this.inputBuffer.length > 0) {
                        if (this.history.length > this.historyLimit) {
                            this.history.pop()
                        }
                        this.history.unshift(this.inputBuffer)
                        
                        let inputBufferSplit = this.inputBuffer.split(' ')
                        let command = inputBufferSplit.shift();
                        
                        if (command !== "") {
                            
                            if (this.internalCommandCollection.commandExists(command)) {
                                this.internalCommandCollection.getCommand(command).execute(this._commandOutputFunc(), ...inputBufferSplit);
                            } else if (this.commandCollection !== undefined && this.commandCollection.commandExists(command)) {
                                this.commandCollection.getCommand(command).execute(this._commandOutputFunc(), ...inputBufferSplit);
                            } else {
                                term.write(`\r\n${command}: command not found`);
                            }
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
                default: // Add characters to buffer (if e doesn't contain ansi escape codes)
                    if (!e.match(/(\x9B|\x1B\[)[0-?]*[ -\/]*[@-~]/)) {
                        this._writeAtCursor(e);
                    }
            }
        });

        this.internalCommandCollection.addCommand("clear", 
            new Command(function() {
                term.reset();
            })
        );

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
        if (name !== undefined) {
            if (!commandCollection.commandExists(name)) {
                cmd.stdErr(`\r\nNo help entry for '${name != undefined ? name : ""}'`);
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
    .withSummary("Executes a tool. See help for more info")
    .withHelp(  "# GeoIP information - Retrieves GeoIP information for source or provided ip/host\r\nUsage: tool geoip <optional: ip/host>\r\n\r\n"+
                "# IP information - Retrieves IP address\r\nUsage: tool ip|ipv4|ipv6\r\n\r\n"+
                "# Port checker - Checks TCP connectivity to specified port to source or provided ip/host\r\nUsage: tool port <port> <optional: ip/host>\r\n\r\n"+
                "# SSL validator - Retrieves SSL information for ip/host\r\nUsage: tool ssl <ip/host>\r\n\r\n"+
                "# Subnet calculator  - Subnet calculator for provided ip + cidr/mask\r\nUsage: tool subnet <ip> <cidr/mask>\r\n\r\n"+
                "# WHOIS information - WHOIS information for source or provided ip/host\r\nUsage: tool whois <optional: ip/host>\r\n\r\n"+
                "# MAC address lookup - Lookup vendor for provided MAC address\r\nUsage: tool mac <mac>\r\n\r\n"+
                "# Self-signed certificate generator - Generate self-signed certificate for specified DN\r\nUsage: tool selfsigned <dn> <optional: days>\r\n\r\n"+
                "# RSA Keypair generator - Generates RSA keypair (for dev only)\r\nUsage: tool keypair <optional: comment>")
)

var terminal = new leeioTerminal()
terminal.withCommandCollection(commandCollection)
        .run()