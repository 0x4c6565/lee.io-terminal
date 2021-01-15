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

    this.execute = function(args) {
        return this.func(args)
    }
}

var commandCollection = {
    "commands": [],
    "exists": function(command) {
        return (command in this.commands);
    },
    "get": function(command) {
        if (this.exists(command)) {
            return this.commands[command];
        }

        return undefined;
    },
    "getAll": function() {
        return this.commands;
    },
    "add": function(name, cmd) {
        if (!this.exists(name)) {
            this.commands[name] = cmd
        }
    }
}

commandCollection.add("about", 
    new Command(function() {
        term.write( "\r\nI r Lee Spottiswood. I do Dev(Ops) shit\r\n"+
                    "\r\nGithub: https://github.com/0x4c6565"+
                    "\r\nGitLab: https://gitlab.com/0x4c6565"+
                    "\r\nTwitter: https://twitter.com/leespottiswood");
    })
    .withSummary("Prints information about me")
    .withHelp("Prints information about me")
);

commandCollection.add("help", 
    new Command(function() {
        function getCommandNameMaxLength() {
            var length = 10;
            for (var commandName in commandCollection.getAll()) {
                if (commandName.length > length) {
                    length = commandName.length
                }
            }
            return length
        }

        term.write("\r\nCommands:\r\n");
        var commandPadLength = getCommandNameMaxLength();
        for (var commandName in commandCollection.getAll()) {
            var command = commandCollection.get(commandName);
            if (!command.getHidden()) {
                term.write(`\r\n${commandName.padEnd(commandPadLength, ' ')} : `+commandCollection.get(commandName).getSummary());
            }
        }

    })
    .withSummary("Prints help page")
    .withHelp("Prints help page")
)

commandCollection.add("man", 
    new Command(function(args) {
        if (!commandCollection.exists(args)) {
            term.write(`\r\nNo manual entry for '${args}'`);
            return;
        }

        term.write('\r\n'+commandCollection.get(args).getHelp());
    })
    .withSummary("Shows man page for command")
    .withHelp("no, u")
)

commandCollection.add("clear", 
    new Command(function() {
        term.clear();
    })
    .withSummary("Clears the terminal")
    .withHelp("Clears the terminal")
    .withHidden()
)


commandCollection.add("tool", 
    new Command(function(args) {
        function executeTool(name, args) {
            var uri = (`https://lee.io/${name}/${args.join("/")}`).replace(/\/$/, "")
        
            $.ajax({
                url: uri,
                dataType: 'text',
                success: function(data) {
                    term.write("\r\n\r\n"+data.replace(/\n/g, "\r\n")+"\r\n");
                },
                error: function(jqXHR) {
                    term.write(`\r\nFailed with status '${jqXHR.status}': ${jqXHR.responseText}`);
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
            term.write("\r\nNo tool name provided. See help for more info");
            return
        }

        var name = args.shift()

        if (!tools.includes(name)) {
            term.write(`\r\nInvalid tool '${name}'. See help for more info`);
            return
        }

        executeTool(name, args)

    })
    .withSummary("Executes a tool. See man for more info")
    .withHelp(  "geoip: Retrieves GeoIP information for source or provided address as first argument\r\n"+
                "ssl: Retrieves SSL informatio for host provided as first argument\r\n"+
                "subnet: Subnet calculator for provided IP with mask/cidr\r\n"+
                "whois: WHOIS information for host provided as first argument\r\n"+
                "mac: Lookup vendor for provided MAC address\r\n"+
                "keypair: Generates RSA keypair with optional comment (for dev only)")
)


function runTerminal() {
    if (term._initialized) {
      return;
    }

    term._initialized = true;

    var promptText = 'lee.io > ';

    function prompt(prefix="\r\n", suffix="") {
        term.write(`${prefix}${promptText}${suffix}`);
    };
    
    function clearAndPrompt(text) {
        prompt("\r\x1B[K", text)
    }

    var history = []
    var historyPos = 0
    var historyLimit = 100;
    var cursorX = 0;
    var inputBuffer = "";

    term.onData(e => {
        switch (e) {
            case '\r': // Enter
                if (inputBuffer.length > 0) {
                    if (history.length > historyLimit) {
                        history.pop()
                    }
                    history.unshift(inputBuffer)
                    
                    let inputBufferSplit = inputBuffer.split(' ')
                    let command = inputBufferSplit.shift();
                    
                    if (command !== "") {
                        if (commandCollection.exists(command)) {
                            commandCollection.get(command).execute(inputBufferSplit);
                        } else {
                            term.write(`\r\n${command}: command not found`);
                        }
                    }
                }
            case '\u0003': // Ctrl+C
                inputBuffer = "";
                cursorX = 0;
                historyPos = 0
                prompt();
                break;
            case '\u007F': // Backspace
                if (cursorX > 0) {
                    term.write('\b \b');
                    inputBuffer = inputBuffer.substring(0, inputBuffer.length-1)
                    cursorX--;
                }
                break;
            case '\x1b[D': // Left arrow
                if (cursorX > 0) {
                    term.write(e);
                    cursorX--;
                }        
                break;
            case '\x1b[C': // Right arrow
                if (cursorX < inputBuffer.length) {
                    term.write(e);
                    cursorX++;
                }        
                break;
            case '\x1b[A': // Up arrow
                if (history.length > 0) {
                    if (historyPos < history.length) {                        
                        historyPos++;
                    }
                    inputBuffer = history[historyPos-1]
                    clearAndPrompt(inputBuffer)
                    cursorX = inputBuffer.length
                }
                break;
            case '\x1b[B': // Down arrow
                if (history.length > 0 && historyPos > 0) {
                    historyPos--;

                    if (historyPos > 0) {
                        inputBuffer = history[historyPos-1]
                        clearAndPrompt(inputBuffer)
                        cursorX = inputBuffer.length
                    } else {
                        cursorX = 0;
                        inputBuffer = "";
                        clearAndPrompt()
                    }
                }
                break;
            default: // Add characters to buffer
                var cursorSuffix = inputBuffer.substr(cursorX);
                inputBuffer = inputBuffer.substr(0, cursorX) + e + cursorSuffix;
                var outputBuffer = inputBuffer
                if (cursorSuffix.length > 0) {
                    outputBuffer += `\x1b[${cursorSuffix.length}D`
                }

                clearAndPrompt(outputBuffer)
                cursorX += e.length;
        }
    });

    term.write('Type \x1B[34mhelp\x1B[0m for help');
    prompt();
    term.focus();
}

runTerminal()