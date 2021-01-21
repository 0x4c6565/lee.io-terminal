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

    this.withMan = function(help) {
        this.help = help
        return this
    }

    this.withHidden = function() {
        this.hidden = true
        return this
    }

    this.getMan = function() {
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

function leeioTerminal() {
    this._commands = [];
    
    this.promptText = 'lee.io > ';

    this.inputBuffer = '';
    this.cursorX = 0;
    this.history = [];
    this.historyScrollPos = 0;
    this.historyLimit = 100;
    this.lastExitCode = 0;

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

    this._setCursorStart = function(repeat=1) {
        this._setCursor(0)
    }

    this._setCursorEnd = function(repeat=1) {
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
                term.write(text)
            },
            exit: function(code) {
                this.lastExitCode = code
            }
        }
    }

    this.run = function() {
        term.onData(e => {
            switch (e) {                
                case '\r': // Enter
                    if (this.inputBuffer.length > 0) {
                        if (this.history.length > this.historyLimit) {
                            this.history.pop()
                        }
                        this.history.unshift(this.inputBuffer)
                        
                        let inputBufferSplit = this.inputBuffer.split(' ')
                        let command = inputBufferSplit.shift();
                        
                        if (command !== "") {
                            if (this.commandExists(command)) {
                                this.getCommand(command).execute(this._commandOutputFunc(), ...inputBufferSplit);
                            } else {
                                term.write(`\r\n${command}: command not found`);
                            }
                        }
                    }
                case '\u0003': // Ctrl+C
                    this._newLinePrompt();
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
                default: // Add characters to buffer
                    this._writeAtCursor(e);
            }
        });

        this.addCommand("clear", 
            new Command(function() {
                term.clear();
            })
            .withSummary("Clears the terminal")
            .withMan("Clears the terminal")
            .withHidden()
        );

        term.write('Type \x1B[34mhelp\x1B[0m for help');
        this._newLinePrompt();
        term.focus();
    }
}

var terminal = new leeioTerminal()


terminal.addCommand("about", 
    new Command(function(cmd) {
        cmd.stdOut("\r\nI r Lee Spottiswood. I do Dev(Ops) shit\r\n"+
        "\r\nGithub: https://github.com/0x4c6565"+
        "\r\nGitLab: https://gitlab.com/0x4c6565"+
        "\r\nTwitter: https://twitter.com/leespottiswood")
    })
    .withSummary("Prints information about me")
    .withMan("Prints information about me")
);

terminal.addCommand("help", 
    new Command(function(cmd) {
        function getCommandNameMaxLength() {
            var length = 10;
            for (var commandName in terminal.getCommands()) {
                if (commandName.length > length) {
                    length = commandName.length
                }
            }
            return length
        }

        cmd.stdOut("\r\nCommands:\r\n");
        var commandPadLength = getCommandNameMaxLength();
        for (var commandName in terminal.getCommands()) {
            var command = terminal.getCommand(commandName);
            if (!command.getHidden()) {
                cmd.stdOut(`\r\n${commandName.padEnd(commandPadLength, ' ')} : ` + command.getSummary());
            }
        }

    })
    .withSummary("Prints help page")
    .withMan("Prints help page")
)

terminal.addCommand("man", 
    new Command(function(cmd, name) {
        if (!terminal.commandExists(name)) {
            cmd.stdErr(`\r\nNo manual entry for '${name != undefined ? name : ""}'`);
            cmd.exit(1)
            return;
        }

        cmd.stdOut('\r\n'+terminal.getCommand(name).getMan());
    })
    .withSummary("Shows man page for command")
    .withMan("no, u")
)

terminal.addCommand("tool", 
    new Command(function(cmd, name, ...args) {
        function executeTool(name, args) {
            var uri = (`https://lee.io/${name}/${args.join("/")}`).replace(/\/$/, "")
        
            $.ajax({
                url: uri,
                dataType: 'text',
                success: function(data) {
                    cmd.stdOut("\r\n\r\n"+data.replace(/\n/g, "\r\n")+"\r\n");
                },
                error: function(jqXHR) {
                    cmd.stdErr(`\r\nFailed with status '${jqXHR.status}': ${jqXHR.responseText}`);
                },
                async: false
            });
        }

        var tools = [
            "geoip",
            "ssl",
            "subnet",
            "whois",
            "mac",
            "keypair"
        ]

        if (args.length < 1) {
            cmd.stdErr("\r\nNo tool name provided. See help for more info");
            return
        }

        var name = args.shift()

        if (!tools.includes(name)) {
            cmd.stdErr(`\r\nInvalid tool '${name}'. See help for more info`);
            return
        }

        executeTool(name, args)

    })
    .withSummary("Executes a tool. See man for more info")
    .withMan(  "geoip: Retrieves GeoIP information for source or provided address as first argument\r\n"+
                "ssl: Retrieves SSL informatio for host provided as first argument\r\n"+
                "subnet: Subnet calculator for provided IP with mask/cidr\r\n"+
                "whois: WHOIS information for host provided as first argument\r\n"+
                "mac: Lookup vendor for provided MAC address\r\n"+
                "keypair: Generates RSA keypair with optional comment (for dev only)")
)

terminal.run()